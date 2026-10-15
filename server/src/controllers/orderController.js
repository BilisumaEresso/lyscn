const crypto    = require('crypto');
const Order     = require('../models/Order');
const Product   = require('../models/Product');
const Table     = require('../models/Table');
const Branch    = require('../models/Branch');
const User      = require('../models/User');
const orderStateMachine = require('../services/orderStateMachine');

const VALID_STATUSES = orderStateMachine.VALID_STATUSES;

// A table can be released manually, but once every non-cancelled order has
// been served and paid it is useful to surface a clear-table suggestion.
const suggestTableReadyToClear = async (req, tableId, restaurantId) => {
  const [activeOrder, currentOrder] = await Promise.all([
    Order.exists({
      tableId,
      restaurantId,
      status: { $nin: ['served', 'cancelled'] },
    }),
    Order.exists({
      tableId,
      restaurantId,
      status: 'served',
      paymentStatus: 'paid',
    }),
  ]);

  if (activeOrder || !currentOrder) return;

  const io = req.app.get('io');
  if (io) io.to(`restaurant:${restaurantId}`).emit('table:readyToClear', { tableId });
};

/**
 * Automatically assign an on-duty waiter when an order reaches 'ready' state.
 * Priority 1: On-duty waiter covering order.tableId
 * Priority 2: On-duty waiter with fewest active 'ready' unserved orders
 * Fallback: null (open claim)
 */
const autoAssignWaiter = async (order) => {
  try {
    const targetTableId = order.tableId?._id || order.tableId;

    const tableAssignedWaiter = await User.findOne({
      restaurantId: order.restaurantId,
      role: 'waiter',
      isActive: true,
      isOnDuty: true,
      assignedTables: targetTableId,
    });

    if (tableAssignedWaiter) {
      return tableAssignedWaiter;
    }

    const activeWaiters = await User.find({
      restaurantId: order.restaurantId,
      role: 'waiter',
      isActive: true,
      isOnDuty: true,
    });

    if (!activeWaiters || activeWaiters.length === 0) {
      return null;
    }

    const readyCounts = await Order.aggregate([
      {
        $match: {
          restaurantId: order.restaurantId,
          status: 'ready',
          assignedWaiterId: { $in: activeWaiters.map((w) => w._id) },
        },
      },
      {
        $group: {
          _id: '$assignedWaiterId',
          count: { $sum: 1 },
        },
      },
    ]);

    const countMap = new Map();
    for (const item of readyCounts) {
      countMap.set(String(item._id), item.count);
    }

    activeWaiters.sort((a, b) => {
      const ca = countMap.get(String(a._id)) || 0;
      const cb = countMap.get(String(b._id)) || 0;
      return ca - cb;
    });

    return activeWaiters[0];
  } catch (_err) {
    return null;
  }
};

// ── POST /api/orders/public ───────────────────────────────────────────────────
// Customer-facing: places a new order.
// Prices are ALWAYS computed server-side — client totals are ignored.
const placeOrder = async (req, res, next) => {
  try {
    const { tableId, restaurantId, branchId, sessionId, sessionToken, guestName, clientOrderId, items } = req.body;

    if (!tableId || !restaurantId || !branchId || !sessionId || !sessionToken || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'tableId, restaurantId, branchId, sessionId, sessionToken, and at least one item are required.',
      });
    }

    // ── Idempotency: Check if this clientOrderId was already processed ──────────
    if (clientOrderId) {
      const existing = await Order.findOne({ restaurantId, clientOrderId });
      if (existing) {
        return res.status(200).json({ success: true, order: existing, reused: true });
      }
    }

    // ── Rapid-duplicate debounce: Prevent identical double-tap within 6 seconds ─
    const recentDuplicate = await Order.findOne({
      restaurantId,
      tableId,
      sessionId,
      createdAt: { $gte: new Date(Date.now() - 6000) },
    }).sort({ createdAt: -1 });

    if (recentDuplicate && recentDuplicate.items.length === items.length) {
      const itemsMatch = items.every((it, idx) => {
        const dupItem = recentDuplicate.items[idx];
        if (!dupItem || String(dupItem.productId) !== String(it.productId) || dupItem.qty !== it.qty) return false;
        const itNote = (it.itemNotes || '').trim();
        const dupNote = (dupItem.itemNotes || '').trim();
        if (itNote !== dupNote) return false;
        const itSpecs = (it.selectedSpecs || []).map((s) => `${s.specName}:${s.optionName}`).sort().join('|');
        const dupSpecs = (dupItem.selectedSpecs || []).map((s) => `${s.specName}:${s.optionName}`).sort().join('|');
        if (itSpecs !== dupSpecs) return false;
        const itTags = (it.quickTags || []).slice().sort().join('|');
        const dupTags = (dupItem.quickTags || []).slice().sort().join('|');
        return itTags === dupTags;
      });
      if (itemsMatch) {
        return res.status(200).json({ success: true, order: recentDuplicate, reused: true });
      }
    }

    // Validate that the triple (tableId, restaurantId, branchId) refers to a real active table
    const table = await Table.findOne({ _id: tableId, restaurantId, branchId, isActive: true });
    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Table not found or inactive. Please re-scan the QR code.',
      });
    }
    if (
      table.activeSessionToken !== sessionToken
      || (table.sessionExpiresAt && table.sessionExpiresAt <= new Date())
    ) {
      return res.status(401).json({
        success: false,
        message: 'Your session has expired — please scan the QR code again.',
      });
    }

    // Strict Location Enforcement: If branch has GPS coordinates, verify diner location
    const branch = await Branch.findById(branchId).select('location locationStrictMode');
    if (branch && Number.isFinite(branch.location?.lat) && Number.isFinite(branch.location?.lng)) {
      if (table.sessionLocationVerified !== true) {
        return res.status(403).json({
          success: false,
          code: 'LOCATION_REQUIRED',
          message: 'Location verification is required before placing an order. Please verify your position at the table.',
        });
      }
    }

    // Build order items with server-side price computation
    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const {
        productId,
        qty,
        selectedModifiers = [],
        selectedSpecs = [],
        quickTags = [],
        itemNotes = '',
      } = item;

      if (!productId || !qty || qty < 1) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have a productId and a qty ≥ 1.',
        });
      }

      // Verify the product exists, is available, and belongs to the same restaurant
      const product = await Product.findOne({ _id: productId, restaurantId, isAvailable: true });
      if (!product) {
        const anyProduct = await Product.findOne({ _id: productId, restaurantId });
        if (anyProduct && anyProduct.isAvailable === false) {
          return res.status(409).json({
            success: false,
            code: 'ITEM_UNAVAILABLE',
            unavailableProductId: productId,
            unavailableProductName: anyProduct.name,
            message: `"${anyProduct.name}" is currently unavailable.`,
          });
        }
        return res.status(404).json({
          success: false,
          code: 'ITEM_NOT_FOUND',
          unavailableProductId: productId,
          message: `Product ${productId} not found or unavailable.`,
        });
      }

      // Resolve modifiers entirely from the product definition — never trust client priceDelta
      const resolvedModifiers = [];
      let extraCost = 0;

      for (const sel of selectedModifiers) {
        const group = (product.modifierGroups || []).find((g) => g.name === sel.groupName);
        if (!group) continue;

        const option = group.options.find((o) => o.name === sel.optionName);
        if (!option) continue;

        resolvedModifiers.push({
          groupName:  group.name,
          optionName: option.name,
          priceDelta: option.priceDelta,
        });
        extraCost += option.priceDelta;
      }

      // Resolve Ethiopian dining specs entirely from product definition (with fallback preservation)
      const resolvedSpecs = [];
      for (const sel of selectedSpecs) {
        if (!sel || !sel.specName || !sel.optionName) continue;
        const specGroup = (product.specs || []).find((s) => s.name === sel.specName);
        if (specGroup) {
          const opt = (specGroup.options || []).find((o) => o.name === sel.optionName);
          const delta = opt ? (Number(opt.priceDelta) || 0) : 0;
          resolvedSpecs.push({
            specName:   specGroup.name,
            optionName: opt ? opt.name : sel.optionName,
            priceDelta: delta,
          });
          extraCost += delta;
        } else {
          resolvedSpecs.push({
            specName:   String(sel.specName).trim(),
            optionName: String(sel.optionName).trim(),
            priceDelta: 0,
          });
        }
      }

      const safeQuickTags = Array.isArray(quickTags)
        ? quickTags.filter((t) => typeof t === 'string' && t.trim().length > 0).map((t) => t.trim())
        : [];
      const safeItemNotes = typeof itemNotes === 'string' ? itemNotes.trim().slice(0, 300) : '';

      let basePrice = product.price;
      let portionName = 'Standard';
      let portionAmharic = '';
      let serves = 1;

      if (item.portionName && product.portions && product.portions.length > 0) {
        const foundPortion = product.portions.find((p) => p.name.toLowerCase() === String(item.portionName).toLowerCase());
        if (foundPortion) {
          basePrice = foundPortion.price;
          portionName = foundPortion.name;
          portionAmharic = foundPortion.nameAmharic || '';
          serves = foundPortion.serves || 1;
        }
      } else if (product.portions && product.portions.length > 0) {
        const defaultPortion = product.portions.find((p) => p.isDefault) || product.portions[0];
        if (defaultPortion) {
          basePrice = defaultPortion.price;
          portionName = defaultPortion.name;
          portionAmharic = defaultPortion.nameAmharic || '';
          serves = defaultPortion.serves || 1;
        }
      }

      const unitPrice = basePrice + extraCost;
      const subtotal  = Math.round(unitPrice * qty * 100) / 100;
      totalAmount    += subtotal;

      orderItems.push({
        productId: product._id,
        name:      product.name,
        portionName,
        portionAmharic,
        serves,
        qty,
        unitPrice,
        selectedModifiers: resolvedModifiers,
        selectedSpecs:     resolvedSpecs,
        quickTags:         safeQuickTags,
        itemNotes:         safeItemNotes,
        subtotal,
      });
    }

    totalAmount = Math.round(totalAmount * 100) / 100;

    const order = await Order.create({
      restaurantId,
      branchId,
      tableId,
      sessionId,
      sessionToken,
      clientOrderId: clientOrderId || null,
      guestName: guestName ? guestName.trim() : null,
      items:     orderItems,
      totalAmount,
    });

    if (table.sessionExpiresAt) {
      table.sessionExpiresAt = null;
      await table.save();
    }

    // ── Realtime: broadcast to restaurant staff room ──────────────────────────
    const io = req.app.get('io');
    if (io) {
      // Populate tableId for the event payload so the kanban card can show the label
      const populated = await Order.findById(order._id)
        .populate('tableId', 'label sessionLocationVerified')
        .populate('branchId', 'name');
      io.to(`restaurant:${order.restaurantId}`).emit('order:created', populated);
    }

    return res.status(201).json({ success: true, order });
  } catch (err) {
    return next(err);
  }
};

// ── GET /api/orders — protected, staff only ────────────────────────────────────
const listOrders = async (req, res, next) => {
  try {
    const filter = { restaurantId: req.tenantId };

    if (req.query.status)   filter.status   = req.query.status;
    if (req.query.branchId) filter.branchId = req.query.branchId;

    if (req.query.date) {
      const startOfDay = new Date(req.query.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(req.query.date);
      endOfDay.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate('tableId', 'label')
      .populate('branchId', 'name');

    return res.json({ success: true, orders });
  } catch (err) {
    return next(err);
  }
};

// ── GET /api/orders/public/:id/status — PUBLIC (customer polling) ─────────────
// Requires ?sessionToken= matching the order's table session for security.
const getOrderStatus = async (req, res, next) => {
  try {
    const { sessionToken } = req.query;
    if (!sessionToken) {
      return res.status(400).json({
        success: false,
        message: 'sessionToken query parameter is required.',
      });
    }

    const order = await Order.findById(req.params.id).select(
      'status paymentStatus rating feedback tableId',
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Verify the caller owns the session that placed this order
    const table = await Table.findById(order.tableId).select('activeSessionToken');
    if (!table || table.activeSessionToken !== sessionToken) {
      return res.status(403).json({
        success: false,
        message: 'Session does not match this order. Please scan the QR code again.',
      });
    }

    return res.json({
      success: true,
      status:        order.status,
      paymentStatus: order.paymentStatus,
      rating:        order.rating,
      feedback:      order.feedback,
    });
  } catch (err) {
    return next(err);
  }
};

// ── GET /api/orders/public/table/orders — PUBLIC (multi-round session orders) ──
const getTableOrders = async (req, res, next) => {
  try {
    const { sessionToken, sessionId, orderIds } = req.query;
    if (!sessionToken) {
      return res.status(400).json({
        success: false,
        message: 'sessionToken query parameter is required.',
      });
    }

    const table = await Table.findOne({
      activeSessionToken: sessionToken,
      isActive: true,
    }).select('_id label status restaurantId occupiedSince activeSessionToken');

    if (!table) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired table session.',
      });
    }

    const clientOrderIds = typeof orderIds === 'string' && orderIds.trim()
      ? orderIds.split(',').filter((id) => id.match(/^[0-9a-fA-F]{24}$/))
      : [];

    const query = {
      tableId: table._id,
      restaurantId: table.restaurantId,
      status: { $ne: 'cancelled' },
    };

    if (sessionId && clientOrderIds.length > 0) {
      query.$or = [{ sessionId }, { _id: { $in: clientOrderIds } }];
    } else if (sessionId) {
      query.sessionId = sessionId;
    } else if (clientOrderIds.length > 0) {
      query._id = { $in: clientOrderIds };
    } else if (table.occupiedSince) {
      // Fallback only when client provides neither sessionId nor specific orderIds
      query.createdAt = { $gte: new Date(table.occupiedSince.getTime() - 10 * 60 * 1000) };
    }

    const orders = await Order.find(query)
      .select('_id status paymentStatus guestName items totalAmount serviceChargeRate serviceChargeAmount grossTotal totalPaid balanceDue totalTips createdAt sessionId rating feedback')
      .sort({ createdAt: 1 });

    const totalAmount = Math.round(orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0) * 100) / 100;
    const serviceChargeTotal = Math.round(orders.reduce((sum, o) => sum + (o.serviceChargeAmount || 0), 0) * 100) / 100;
    const grossTotal = Math.round(orders.reduce((sum, o) => sum + (o.grossTotal || (o.totalAmount + (o.serviceChargeAmount || 0)) || 0), 0) * 100) / 100;
    const totalTips = Math.round(orders.reduce((sum, o) => sum + (o.totalTips || 0), 0) * 100) / 100;
    const paidAmount = Math.round(
      orders.reduce((sum, o) => sum + (o.totalPaid || (o.paymentStatus === 'paid' ? (o.grossTotal || o.totalAmount) : 0) || 0), 0) * 100
    ) / 100;
    const unpaidAmount = Math.max(0, Math.round((grossTotal - paidAmount) * 100) / 100);
    const activeCount = orders.filter((o) => o.status !== 'served').length;

    const rounds = orders.map((o, idx) => ({
      roundNumber: idx + 1,
      id: o._id,
      status: o.status,
      paymentStatus: o.paymentStatus,
      guestName: o.guestName,
      items: o.items || [],
      totalAmount: o.totalAmount,
      serviceChargeRate: o.serviceChargeRate || 0,
      serviceChargeAmount: o.serviceChargeAmount || 0,
      grossTotal: o.grossTotal || o.totalAmount,
      totalPaid: o.totalPaid || (o.paymentStatus === 'paid' ? (o.grossTotal || o.totalAmount) : 0),
      balanceDue: o.balanceDue != null ? o.balanceDue : (o.paymentStatus === 'paid' ? 0 : (o.grossTotal || o.totalAmount)),
      totalTips: o.totalTips || 0,
      createdAt: o.createdAt,
      rating: o.rating,
      feedback: o.feedback,
    }));

    return res.json({
      success: true,
      table: {
        id: table._id,
        label: table.label,
        status: table.status,
      },
      summary: {
        roundCount: rounds.length,
        activeCount,
        totalAmount,
        serviceChargeTotal,
        grossTotal,
        totalTips,
        paidAmount,
        unpaidAmount,
        allServed: rounds.length > 0 && activeCount === 0,
        allPaid: rounds.length > 0 && unpaidAmount === 0,
      },
      rounds,
    });
  } catch (err) {
    return next(err);
  }
};

// PATCH /api/orders/public/:id/feedback — customer feedback after service
const submitOrderFeedback = async (req, res, next) => {
  try {
    const sessionToken = req.body?.sessionToken || req.query?.sessionToken || req.headers['x-session-token'];
    const { rating, feedback, sessionId } = req.body || {};

    // Verify the caller owns the session that placed this order (mirrors getOrderStatus)
    if (!sessionToken) {
      return res.status(400).json({ success: false, message: 'sessionToken is required.' });
    }

    const numericRating = Number(rating);

    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ success: false, message: 'rating must be an integer from 1 to 5.' });
    }

    const existingOrder = await Order.findOne({ _id: req.params.id }).select('status rating feedback tableId sessionId sessionToken');
    if (!existingOrder) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Confirm the caller owns the session:
    // 1) Current table's activeSessionToken matches sessionToken
    // 2) OR the order's stored sessionToken matches sessionToken
    // 3) OR the order's sessionId matches sessionId (e.g. staff released table before diner submits review)
    const table = await Table.findById(existingOrder.tableId).select('activeSessionToken');
    const tableMatches = table && table.activeSessionToken && table.activeSessionToken === sessionToken;
    const orderTokenMatches = existingOrder.sessionToken && existingOrder.sessionToken === sessionToken;
    const orderSessionMatches = sessionId && existingOrder.sessionId === sessionId;

    if (!tableMatches && !orderTokenMatches && !orderSessionMatches) {
      return res.status(403).json({
        success: false,
        message: 'Session does not match this order. Please scan the QR code again.',
      });
    }

    if (existingOrder.rating != null) {
      return res.json({
        success: true,
        rating: existingOrder.rating,
        feedback: existingOrder.feedback,
        alreadySubmitted: true,
      });
    }
    if (existingOrder.status !== 'served') {
      return res.status(400).json({ success: false, message: 'Feedback is available after the order is served.' });
    }

    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, status: 'served', rating: null },
      { rating: numericRating, feedback: feedback ? String(feedback).trim() : null },
      { new: true, runValidators: true }
    );
    if (!order) {
      return res.status(404).json({ success: false, message: 'Served order not found.' });
    }

    const populatedOrder = await Order.findById(order._id)
      .populate('tableId', 'label')
      .populate('branchId', 'name');
    const io = req.app.get('io');
    if (io) {
      io.to(`restaurant:${order.restaurantId}`).emit('order:updated', populatedOrder);
      io.to(`order:${order._id}`).emit('order:updated', populatedOrder);
      const targetTableId = order.tableId?._id || order.tableId;
      if (targetTableId) {
        io.to(`table:${targetTableId}`).emit('order:updated', populatedOrder);
      }
    }
    return res.json({
      success: true,
      rating: order.rating,
      feedback: order.feedback,
    });
  } catch (err) {
    return next(err);
  }

};

// ── PATCH /api/orders/:id/assign ──────────────────────────────────────────────
// Floor staff claims order or manager/coordinator delegates order to waiter
const assignOrder = async (req, res, next) => {
  try {
    const { waiterId } = req.body;
    const userRole = req.user?.role || 'owner';
    const userId = req.user?.userId;

    if (!['owner', 'manager', 'coordinator', 'waiter'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to assign or claim orders.',
      });
    }

    const order = await Order.findOne({
      _id: req.params.id,
      restaurantId: req.tenantId,
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    let assignedUser = null;
    if (userRole === 'waiter') {
      assignedUser = await User.findOne({
        _id: userId,
        restaurantId: req.tenantId,
        isActive: true,
      });
    } else {
      if (!waiterId) {
        return res.status(400).json({ success: false, message: 'waiterId is required for delegation.' });
      }
      assignedUser = await User.findOne({
        _id: waiterId,
        restaurantId: req.tenantId,
        role: 'waiter',
        isActive: true,
      });
      if (!assignedUser) {
        return res.status(404).json({ success: false, message: 'Waiter not found in this venue.' });
      }
    }

    if (!assignedUser) {
      return res.status(400).json({ success: false, message: 'Unable to assign waiter.' });
    }

    order.assignedWaiterId = assignedUser._id;
    order.assignedWaiterName = assignedUser.name;
    await order.save();

    const populated = await Order.findById(order._id)
      .populate('tableId', 'label')
      .populate('branchId', 'name')
      .populate('assignedWaiterId', 'name phone');

    const io = req.app.get('io');
    if (io) {
      io.to(`restaurant:${order.restaurantId}`).emit('order:updated', populated);
      io.to(`order:${order._id}`).emit('order:updated', populated);
      const targetTableId = order.tableId?._id || order.tableId;
      if (targetTableId) {
        io.to(`table:${targetTableId}`).emit('order:updated', populated);
      }
      io.to(`user:${assignedUser._id}`).emit('order:assigned', populated);
    }

    return res.json({ success: true, order: populated });
  } catch (err) {
    return next(err);
  }
};

// ── PATCH /api/orders/:id/status — protected, staff ───────────────────────────
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, cancelReason } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${VALID_STATUSES.join(', ')}.`,
      });
    }

    const order = await Order.findOne({
      _id: req.params.id,
      restaurantId: req.tenantId,
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const userRole = req.user?.role || 'owner';
    const userId = req.user?.userId;

    const transitionCheck = orderStateMachine.validateTransition(order.status, status, userRole, { cancelReason });
    if (!transitionCheck.isValid) {
      return res.status(transitionCheck.code === 'ROLE_FORBIDDEN' ? 403 : 400).json({
        success: false,
        code: transitionCheck.code,
        message: transitionCheck.message,
      });
    }

    order.status = status;

    if (status === 'accepted') {
      order.acceptedBy = userId;
    } else if (status === 'preparing') {
      order.preparedBy = userId;
    } else if (status === 'ready') {
      if (!order.preparedBy) order.preparedBy = userId;

      // Auto-assign an on-duty waiter if none is assigned yet
      if (!order.assignedWaiterId) {
        const assignedWaiter = await autoAssignWaiter(order);
        if (assignedWaiter) {
          order.assignedWaiterId = assignedWaiter._id;
          order.assignedWaiterName = assignedWaiter.name;
        }
      }
    } else if (status === 'served') {
      order.servedBy = userId;
      if (userRole === 'waiter' && !order.assignedWaiterId) {
        order.assignedWaiterId = userId;
        const currentStaff = await User.findById(userId).select('name');
        if (currentStaff) order.assignedWaiterName = currentStaff.name;
      }
    } else if (status === 'cancelled') {
      if (cancelReason) {
        order.cancelReason = String(cancelReason).trim();
      }
    }

    await order.save();

    const populated = await Order.findById(order._id)
      .populate('tableId', 'label')
      .populate('branchId', 'name')
      .populate('assignedWaiterId', 'name phone');

    // ── Realtime: broadcast to restaurant room, order room, table room, and waiter
    const io = req.app.get('io');
    if (io) {
      io.to(`restaurant:${order.restaurantId}`).emit('order:updated', populated);
      io.to(`order:${order._id}`).emit('order:updated', populated);
      const targetTableId = order.tableId?._id || order.tableId;
      if (targetTableId) {
        io.to(`table:${targetTableId}`).emit('order:updated', populated);
      }
      if (status === 'ready') {
        if (order.assignedWaiterId) {
          io.to(`user:${order.assignedWaiterId}`).emit('order:readyForPickup', populated);
        }
        io.to(`restaurant:${order.restaurantId}:role:waiter`).emit('order:readyForPickup', populated);
      }
    }

    if (order.status === 'served' && order.paymentStatus === 'paid') {
      suggestTableReadyToClear(req, order.tableId?._id || order.tableId, order.restaurantId)
        .catch((err) => (req.log || console).error({ err }, 'Unable to evaluate table clear suggestion'));
    }

    return res.json({ success: true, order: populated });
  } catch (err) {
    return next(err);
  }
};

// ── PATCH /api/orders/:id/payment — protected, staff ─────────────────────────
const updateOrderPayment = async (req, res, next) => {
  try {
    const userRole = req.user?.role || 'owner';
    const userId = req.user?.userId;
    if (userRole === 'kitchen') {
      return res.status(403).json({
        success: false,
        message: 'Kitchen staff cannot process payments.',
      });
    }

    const { paymentMethod, tipAmount = 0 } = req.body;
    const VALID_METHODS = ['cash', 'pos', 'telebirr', 'cbebirr', 'awash', 'other'];

    if (!paymentMethod || !VALID_METHODS.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: `paymentMethod must be one of: ${VALID_METHODS.join(', ')}.`,
      });
    }

    const order = await Order.findOne({
      _id: req.params.id,
      restaurantId: req.tenantId,
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const gross = order.grossTotal || order.totalAmount;
    const tip = Number(tipAmount) > 0 ? Number(tipAmount) : 0;

    order.paymentStatus = 'paid';
    order.paymentMethod = paymentMethod;
    order.grossTotal = gross;
    order.totalPaid = gross;
    order.balanceDue = 0;
    order.totalTips = (order.totalTips || 0) + tip;

    order.payments.push({
      paymentId: crypto.randomUUID(),
      amount: gross,
      tipAmount: tip,
      paymentMethod,
      paymentReference: req.body.paymentReference || null,
      collectedBy: userId,
      waiterId: order.assignedWaiterId || userId,
      createdAt: new Date(),
    });

    await order.save();

    const populated = await Order.findById(order._id)
      .populate('tableId', 'label')
      .populate('branchId', 'name')
      .populate('assignedWaiterId', 'name phone');

    const io = req.app.get('io');

    // ── Table-wide payment synchronization ─────────────────────────────────
    const targetTableId = order.tableId?._id || order.tableId;
    if (targetTableId) {
      const siblingUnpaid = await Order.find({
        tableId: targetTableId,
        restaurantId: req.tenantId,
        paymentStatus: 'unpaid',
        status: { $ne: 'cancelled' },
        _id: { $ne: order._id },
      });

      if (siblingUnpaid.length > 0) {
        for (const sib of siblingUnpaid) {
          const sibGross = sib.grossTotal || sib.totalAmount;
          sib.paymentStatus = 'paid';
          sib.paymentMethod = paymentMethod;
          sib.grossTotal = sibGross;
          sib.totalPaid = sibGross;
          sib.balanceDue = 0;
          sib.payments.push({
            paymentId: crypto.randomUUID(),
            amount: sibGross,
            tipAmount: 0,
            paymentMethod,
            paymentReference: req.body.paymentReference || null,
            collectedBy: userId,
            waiterId: sib.assignedWaiterId || userId,
            createdAt: new Date(),
          });
          await sib.save();

          const popSib = await Order.findById(sib._id)
            .populate('tableId', 'label')
            .populate('branchId', 'name')
            .populate('assignedWaiterId', 'name phone');

          if (io) {
            io.to(`restaurant:${sib.restaurantId}`).emit('order:updated', popSib);
            io.to(`order:${sib._id}`).emit('order:updated', popSib);
            io.to(`table:${targetTableId}`).emit('order:updated', popSib);
          }
        }
      }
    }

    if (io) {
      io.to(`restaurant:${order.restaurantId}`).emit('order:updated', populated);
      io.to(`order:${order._id}`).emit('order:updated', populated);
      if (targetTableId) {
        io.to(`table:${targetTableId}`).emit('order:updated', populated);
      }
    }

    if (order.status === 'served' && order.paymentStatus === 'paid') {
      suggestTableReadyToClear(req, targetTableId, order.restaurantId)
        .catch((err) => (req.log || console).error({ err }, 'Unable to evaluate table clear suggestion'));
    }

    return res.json({ success: true, order: populated });
  } catch (err) {
    return next(err);
  }
};

// ── PATCH /api/orders/table/:tableId/payment — protected, staff ───────────────
const updateTablePayment = async (req, res, next) => {
  try {
    const userRole = req.user?.role || 'owner';
    const userId = req.user?.userId;
    if (userRole === 'kitchen') {
      return res.status(403).json({
        success: false,
        message: 'Kitchen staff cannot process payments.',
      });
    }

    const { paymentMethod, tipAmount = 0 } = req.body;
    const VALID_METHODS = ['cash', 'pos', 'telebirr', 'cbebirr', 'awash', 'other'];

    if (!paymentMethod || !VALID_METHODS.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: `paymentMethod must be one of: ${VALID_METHODS.join(', ')}.`,
      });
    }

    const tableId = req.params.tableId;
    const unpaidOrders = await Order.find({
      tableId,
      restaurantId: req.tenantId,
      paymentStatus: 'unpaid',
      status: { $ne: 'cancelled' },
    });

    if (unpaidOrders.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No unpaid orders found for this table.',
      });
    }

    const tip = Number(tipAmount) > 0 ? Number(tipAmount) : 0;
    let tipAssigned = false;

    const updatedOrders = [];
    for (const order of unpaidOrders) {
      const gross = order.grossTotal || order.totalAmount;
      const orderTip = !tipAssigned ? tip : 0;
      tipAssigned = true;

      order.paymentStatus = 'paid';
      order.paymentMethod = paymentMethod;
      order.grossTotal = gross;
      order.totalPaid = gross;
      order.balanceDue = 0;
      order.totalTips = (order.totalTips || 0) + orderTip;

      order.payments.push({
        paymentId: crypto.randomUUID(),
        amount: gross,
        tipAmount: orderTip,
        paymentMethod,
        paymentReference: req.body.paymentReference || null,
        collectedBy: userId,
        waiterId: order.assignedWaiterId || userId,
        createdAt: new Date(),
      });

      await order.save();

      const pop = await Order.findById(order._id)
        .populate('tableId', 'label')
        .populate('branchId', 'name')
        .populate('assignedWaiterId', 'name phone');
      updatedOrders.push(pop);
    }

    const io = req.app.get('io');
    if (io) {
      for (const order of updatedOrders) {
        io.to(`restaurant:${order.restaurantId}`).emit('order:updated', order);
        io.to(`order:${order._id}`).emit('order:updated', order);
        io.to(`table:${tableId}`).emit('order:updated', order);
      }
      io.to(`table:${tableId}`).emit('table:updated', { tableId });
    }

    suggestTableReadyToClear(req, tableId, req.tenantId)
      .catch((err) => (req.log || console).error({ err }, 'Unable to evaluate table clear suggestion'));

    return res.json({
      success: true,
      count: updatedOrders.length,
      orders: updatedOrders,
    });
  } catch (err) {
    return next(err);
  }
};

// ── GET /api/orders/export ────────────────────────────────────────────────────
// Exports order history with items, payment, and status details (Pro plan feature).
const exportOrders = async (req, res, next) => {
  try {
    const { from, to, branchId, status } = req.query;
    const query = { restaurantId: req.tenantId };

    if (branchId) query.branchId = branchId;
    if (status) query.status = status;

    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = toDate;
      }
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .populate('tableId', 'label')
      .populate('branchId', 'name')
      .populate('assignedWaiterId', 'name')
      .lean();

    return res.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (err) {
    return next(err);
  }
};

// ── POST /api/orders/staff — protected, floor staff order creation ──────────
const createStaffOrder = async (req, res, next) => {
  try {
    const { tableId, items, guestName, serviceChargeRate = 0 } = req.body;
    const userId = req.user?.userId;
    const userRole = req.user?.role || 'waiter';

    if (!tableId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'tableId and a non-empty items array are required.',
      });
    }

    const table = await Table.findOne({
      _id: tableId,
      restaurantId: req.tenantId,
      isActive: true,
    });

    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Table not found or inactive in this venue.',
      });
    }

    const staffUser = await User.findById(userId).select('name role');

    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const {
        productId,
        qty,
        portionName: reqPortionName,
        selectedModifiers = [],
        selectedSpecs = [],
        quickTags = [],
        itemNotes = '',
      } = item;

      if (!productId || !qty || qty < 1) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have a valid productId and qty >= 1.',
        });
      }

      const product = await Product.findOne({
        _id: productId,
        restaurantId: req.tenantId,
        isAvailable: true,
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          code: 'ITEM_NOT_FOUND',
          message: `Product ${productId} not found or unavailable.`,
        });
      }

      let basePrice = product.price;
      let portionName = 'Standard';
      let portionAmharic = '';
      let serves = 1;

      if (reqPortionName && product.portions && product.portions.length > 0) {
        const found = product.portions.find((p) => p.name.toLowerCase() === String(reqPortionName).toLowerCase());
        if (found) {
          basePrice = found.price;
          portionName = found.name;
          portionAmharic = found.nameAmharic || '';
          serves = found.serves || 1;
        }
      } else if (product.portions && product.portions.length > 0) {
        const defaultPortion = product.portions.find((p) => p.isDefault) || product.portions[0];
        if (defaultPortion) {
          basePrice = defaultPortion.price;
          portionName = defaultPortion.name;
          portionAmharic = defaultPortion.nameAmharic || '';
          serves = defaultPortion.serves || 1;
        }
      }

      let extraCost = 0;
      const resolvedModifiers = [];
      for (const sel of selectedModifiers) {
        const group = (product.modifierGroups || []).find((g) => g.name === sel.groupName);
        if (!group) continue;
        const opt = group.options.find((o) => o.name === sel.optionName);
        if (!opt) continue;
        resolvedModifiers.push({
          groupName: group.name,
          optionName: opt.name,
          priceDelta: opt.priceDelta,
        });
        extraCost += opt.priceDelta;
      }

      const resolvedSpecs = [];
      for (const sel of selectedSpecs) {
        if (!sel || !sel.specName || !sel.optionName) continue;
        const specGroup = (product.specs || []).find((s) => s.name === sel.specName);
        if (specGroup) {
          const opt = (specGroup.options || []).find((o) => o.name === sel.optionName);
          const delta = opt ? (Number(opt.priceDelta) || 0) : 0;
          resolvedSpecs.push({
            specName: specGroup.name,
            optionName: opt ? opt.name : sel.optionName,
            priceDelta: delta,
          });
          extraCost += delta;
        } else {
          resolvedSpecs.push({
            specName: String(sel.specName).trim(),
            optionName: String(sel.optionName).trim(),
            priceDelta: 0,
          });
        }
      }

      const safeQuickTags = Array.isArray(quickTags)
        ? quickTags.filter((t) => typeof t === 'string' && t.trim().length > 0).map((t) => t.trim())
        : [];
      const safeItemNotes = typeof itemNotes === 'string' ? itemNotes.trim().slice(0, 300) : '';

      const unitPrice = basePrice + extraCost;
      const subtotal = Math.round(unitPrice * qty * 100) / 100;
      totalAmount += subtotal;

      orderItems.push({
        productId: product._id,
        name: product.name,
        portionName,
        portionAmharic,
        serves,
        qty,
        unitPrice,
        selectedModifiers: resolvedModifiers,
        selectedSpecs: resolvedSpecs,
        quickTags: safeQuickTags,
        itemNotes: safeItemNotes,
        subtotal,
      });
    }

    totalAmount = Math.round(totalAmount * 100) / 100;
    const rate = Number(serviceChargeRate) > 0 ? Number(serviceChargeRate) : 0;
    const serviceChargeAmount = Math.round(totalAmount * rate * 100) / 100;
    const grossTotal = Math.round((totalAmount + serviceChargeAmount) * 100) / 100;

    const sessionId = `staff_${crypto.randomUUID()}`;

    const order = await Order.create({
      restaurantId: req.tenantId,
      branchId: table.branchId,
      tableId: table._id,
      sessionId,
      sessionToken: table.activeSessionToken || null,
      createdSource: userRole === 'waiter' ? 'waiter_pad' : 'cashier_pos',
      assignedWaiterId: userId,
      assignedWaiterName: staffUser?.name || null,
      guestName: guestName ? String(guestName).trim() : null,
      items: orderItems,
      totalAmount,
      serviceChargeRate: rate,
      serviceChargeAmount,
      grossTotal,
      balanceDue: grossTotal,
      status: 'placed',
      paymentStatus: 'unpaid',
    });

    if (table.status === 'available') {
      table.status = 'occupied';
      table.occupiedSince = new Date();
      await table.save();
    }

    const populated = await Order.findById(order._id)
      .populate('tableId', 'label')
      .populate('branchId', 'name')
      .populate('assignedWaiterId', 'name phone');

    const io = req.app.get('io');
    if (io) {
      io.to(`restaurant:${order.restaurantId}`).emit('order:new', populated);
      io.to(`restaurant:${order.restaurantId}:role:kitchen`).emit('order:new', populated);
      io.to(`table:${table._id}`).emit('order:new', populated);
    }

    return res.status(201).json({ success: true, order: populated });
  } catch (err) {
    return next(err);
  }
};

// ── POST /api/orders/:id/payments — partial & split payments with tips ───────
const recordOrderPayment = async (req, res, next) => {
  try {
    const userRole = req.user?.role || 'owner';
    const userId = req.user?.userId;
    if (userRole === 'kitchen') {
      return res.status(403).json({
        success: false,
        message: 'Kitchen staff cannot process payments.',
      });
    }

    const {
      amount,
      tipAmount = 0,
      paymentMethod = 'telebirr',
      paymentReference,
      serviceChargeRate,
      notes,
    } = req.body;

    const VALID_METHODS = ['cash', 'pos', 'telebirr', 'cbebirr', 'awash', 'other'];
    if (!VALID_METHODS.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: `paymentMethod must be one of: ${VALID_METHODS.join(', ')}.`,
      });
    }

    const order = await Order.findOne({
      _id: req.params.id,
      restaurantId: req.tenantId,
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (serviceChargeRate !== undefined && serviceChargeRate !== null) {
      const rate = Number(serviceChargeRate) || 0;
      order.serviceChargeRate = rate;
      order.serviceChargeAmount = Math.round(order.totalAmount * rate * 100) / 100;
      order.grossTotal = Math.round((order.totalAmount + order.serviceChargeAmount) * 100) / 100;
    } else if (!order.grossTotal) {
      order.grossTotal = Math.round(((order.totalAmount || 0) + (order.serviceChargeAmount || 0)) * 100) / 100;
    }

    const remainingBefore = Math.max(0, Math.round((order.grossTotal - (order.totalPaid || 0)) * 100) / 100);

    const paymentAmount = amount !== undefined && amount !== null && Number(amount) > 0
      ? Math.round(Math.min(Number(amount), remainingBefore) * 100) / 100
      : remainingBefore;

    const tip = Number(tipAmount) > 0 ? Math.round(Number(tipAmount) * 100) / 100 : 0;

    order.payments.push({
      paymentId: crypto.randomUUID(),
      amount: paymentAmount,
      tipAmount: tip,
      paymentMethod,
      paymentReference: paymentReference ? String(paymentReference).trim() : null,
      collectedBy: userId,
      waiterId: order.assignedWaiterId || userId,
      notes: notes ? String(notes).trim() : '',
      createdAt: new Date(),
    });

    order.totalPaid = Math.round(((order.totalPaid || 0) + paymentAmount) * 100) / 100;
    order.totalTips = Math.round(((order.totalTips || 0) + tip) * 100) / 100;
    order.balanceDue = Math.max(0, Math.round((order.grossTotal - order.totalPaid) * 100) / 100);

    if (order.balanceDue <= 0.01) {
      order.balanceDue = 0;
      order.paymentStatus = 'paid';
      order.paymentMethod = paymentMethod;
    } else {
      order.paymentStatus = 'partially_paid';
    }

    await order.save();

    const populated = await Order.findById(order._id)
      .populate('tableId', 'label')
      .populate('branchId', 'name')
      .populate('assignedWaiterId', 'name phone');

    const io = req.app.get('io');
    if (io) {
      io.to(`restaurant:${order.restaurantId}`).emit('order:updated', populated);
      io.to(`order:${order._id}`).emit('order:updated', populated);
      const targetTableId = order.tableId?._id || order.tableId;
      if (targetTableId) {
        io.to(`table:${targetTableId}`).emit('order:updated', populated);
      }
    }

    if (order.status === 'served' && order.paymentStatus === 'paid') {
      suggestTableReadyToClear(req, order.tableId?._id || order.tableId, order.restaurantId)
        .catch((err) => (req.log || console).error({ err }, 'Unable to evaluate table clear suggestion'));
    }

    return res.json({ success: true, order: populated });
  } catch (err) {
    return next(err);
  }
};

// ── POST /api/orders/table/:tableId/payments — table-wide partial/full payment
const recordTablePayment = async (req, res, next) => {
  try {
    const userRole = req.user?.role || 'owner';
    const userId = req.user?.userId;
    if (userRole === 'kitchen') {
      return res.status(403).json({
        success: false,
        message: 'Kitchen staff cannot process payments.',
      });
    }

    const { tableId } = req.params;
    const {
      amount,
      tipAmount = 0,
      paymentMethod = 'telebirr',
      paymentReference,
      serviceChargeRate,
    } = req.body;

    const VALID_METHODS = ['cash', 'pos', 'telebirr', 'cbebirr', 'awash', 'other'];
    if (!VALID_METHODS.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: `paymentMethod must be one of: ${VALID_METHODS.join(', ')}.`,
      });
    }

    const unpaidOrders = await Order.find({
      tableId,
      restaurantId: req.tenantId,
      paymentStatus: { $ne: 'paid' },
      status: { $ne: 'cancelled' },
    });

    if (unpaidOrders.length === 0) {
      return res.json({ success: true, message: 'No unpaid orders for this table.', orders: [] });
    }

    const tip = Number(tipAmount) > 0 ? Math.round(Number(tipAmount) * 100) / 100 : 0;
    let tipAssigned = false;

    let availableFunds = amount !== undefined && amount !== null && Number(amount) > 0
      ? Number(amount)
      : Infinity;

    const updatedOrders = [];

    for (const order of unpaidOrders) {
      if (serviceChargeRate !== undefined && serviceChargeRate !== null) {
        const rate = Number(serviceChargeRate) || 0;
        order.serviceChargeRate = rate;
        order.serviceChargeAmount = Math.round(order.totalAmount * rate * 100) / 100;
        order.grossTotal = Math.round((order.totalAmount + order.serviceChargeAmount) * 100) / 100;
      } else if (!order.grossTotal) {
        order.grossTotal = Math.round(((order.totalAmount || 0) + (order.serviceChargeAmount || 0)) * 100) / 100;
      }

      const orderBalance = Math.max(0, Math.round((order.grossTotal - (order.totalPaid || 0)) * 100) / 100);
      if (orderBalance <= 0) continue;

      const toApply = Math.min(orderBalance, availableFunds);
      if (toApply <= 0) break;

      const orderTip = !tipAssigned ? tip : 0;
      tipAssigned = true;

      order.payments.push({
        paymentId: crypto.randomUUID(),
        amount: toApply,
        tipAmount: orderTip,
        paymentMethod,
        paymentReference: paymentReference ? String(paymentReference).trim() : null,
        collectedBy: userId,
        waiterId: order.assignedWaiterId || userId,
        createdAt: new Date(),
      });

      order.totalPaid = Math.round(((order.totalPaid || 0) + toApply) * 100) / 100;
      order.totalTips = Math.round(((order.totalTips || 0) + orderTip) * 100) / 100;
      order.balanceDue = Math.max(0, Math.round((order.grossTotal - order.totalPaid) * 100) / 100);

      if (order.balanceDue <= 0.01) {
        order.balanceDue = 0;
        order.paymentStatus = 'paid';
        order.paymentMethod = paymentMethod;
      } else {
        order.paymentStatus = 'partially_paid';
      }

      availableFunds -= toApply;
      await order.save();

      const pop = await Order.findById(order._id)
        .populate('tableId', 'label')
        .populate('branchId', 'name')
        .populate('assignedWaiterId', 'name phone');
      updatedOrders.push(pop);
    }

    const io = req.app.get('io');
    if (io) {
      for (const ord of updatedOrders) {
        io.to(`restaurant:${ord.restaurantId}`).emit('order:updated', ord);
        io.to(`order:${ord._id}`).emit('order:updated', ord);
      }
      io.to(`table:${tableId}`).emit('table:updated', { tableId });
    }

    suggestTableReadyToClear(req, tableId, req.tenantId)
      .catch((err) => (req.log || console).error({ err }, 'Unable to evaluate table clear suggestion'));

    return res.json({ success: true, count: updatedOrders.length, orders: updatedOrders });
  } catch (err) {
    return next(err);
  }
};

// ── GET /api/orders/waiter/shift-summary ──────────────────────────────────────
const getWaiterShiftSummary = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const orders = await Order.find({
      restaurantId: req.tenantId,
      createdAt: { $gte: startOfToday },
      $or: [
        { assignedWaiterId: userId },
        { 'payments.waiterId': userId },
        { 'payments.collectedBy': userId },
      ],
    });

    const servedOrders = orders.filter((o) => o.status === 'served');
    const tableIdSet = new Set(orders.map((o) => String(o.tableId)));

    let totalSales = 0;
    let totalTips = 0;
    let cashTips = 0;
    let digitalTips = 0;

    const uIdStr = String(userId);

    for (const o of orders) {
      // Calculate sales for orders assigned to or served by this waiter
      if (String(o.assignedWaiterId) === uIdStr || (o.payments || []).some((p) => String(p.waiterId) === uIdStr || String(p.collectedBy) === uIdStr)) {
        totalSales += (o.grossTotal || o.totalAmount || 0);
      }

      for (const p of (o.payments || [])) {
        if (String(p.waiterId) === uIdStr || String(p.collectedBy) === uIdStr) {
          const tip = Number(p.tipAmount) || 0;
          totalTips += tip;
          if (p.paymentMethod === 'cash') {
            cashTips += tip;
          } else {
            digitalTips += tip;
          }
        }
      }
    }

    const roundedSales = Math.round(totalSales * 100) / 100;
    const roundedTips = Math.round(totalTips * 100) / 100;
    const roundedCash = Math.round(cashTips * 100) / 100;
    const roundedDigital = Math.round(digitalTips * 100) / 100;

    return res.json({
      success: true,
      summary: {
        tablesServed: tableIdSet.size,
        ordersServed: servedOrders.length,
        totalOrders: orders.length,
        totalSales: roundedSales,
        totalTips: roundedTips,
        cashTips: roundedCash,
        digitalTips: roundedDigital,
        // UI aliases for WaiterView
        tablesServedToday: tableIdSet.size,
        ordersDeliveredToday: servedOrders.length,
        totalSalesHandled: roundedSales,
        totalTipsToday: roundedTips,
        cashTipsToday: roundedCash,
        digitalTipsToday: roundedDigital,
      },
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  placeOrder,
  listOrders,
  getOrderStatus,
  getTableOrders,
  updateOrderStatus,
  assignOrder,
  updateOrderPayment,
  updateTablePayment,
  submitOrderFeedback,
  exportOrders,
  createStaffOrder,
  recordOrderPayment,
  recordTablePayment,
  getWaiterShiftSummary,
};
