const Order  = require('../models/Order');
const Product = require('../models/Product');
const Table   = require('../models/Table');

const VALID_STATUSES = ['placed', 'accepted', 'preparing', 'ready', 'served', 'cancelled'];

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
        return dupItem && String(dupItem.productId) === String(it.productId) && dupItem.qty === it.qty;
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

    // Build order items with server-side price computation
    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const { productId, qty, selectedModifiers = [] } = item;

      if (!productId || !qty || qty < 1) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have a productId and a qty ≥ 1.',
        });
      }

      // Verify the product exists, is available, and belongs to the same restaurant
      const product = await Product.findOne({ _id: productId, restaurantId, isAvailable: true });
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product ${productId} not found or unavailable.`,
        });
      }

      // Resolve modifiers entirely from the product definition — never trust client priceDelta
      const resolvedModifiers = [];
      let extraCost = 0;

      for (const sel of selectedModifiers) {
        const group = product.modifierGroups.find((g) => g.name === sel.groupName);
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

      const unitPrice = product.price + extraCost;
      const subtotal  = Math.round(unitPrice * qty * 100) / 100;
      totalAmount    += subtotal;

      orderItems.push({
        productId: product._id,
        name:      product.name,
        qty,
        unitPrice,
        selectedModifiers: resolvedModifiers,
        subtotal,
      });
    }

    totalAmount = Math.round(totalAmount * 100) / 100;

    const order = await Order.create({
      restaurantId,
      branchId,
      tableId,
      sessionId,
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
      .select('_id status paymentStatus guestName items totalAmount createdAt sessionId rating feedback')
      .sort({ createdAt: 1 });

    const totalAmount = Math.round(orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0) * 100) / 100;
    const paidAmount = Math.round(
      orders
        .filter((o) => o.paymentStatus === 'paid')
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0) * 100
    ) / 100;
    const unpaidAmount = Math.round((totalAmount - paidAmount) * 100) / 100;
    const activeCount = orders.filter((o) => o.status !== 'served').length;

    const rounds = orders.map((o, idx) => ({
      roundNumber: idx + 1,
      id: o._id,
      status: o.status,
      paymentStatus: o.paymentStatus,
      guestName: o.guestName,
      items: o.items || [],
      totalAmount: o.totalAmount,
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
    const { rating, feedback } = req.body;
    const numericRating = Number(rating);

    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ success: false, message: 'rating must be an integer from 1 to 5.' });
    }

    const existingOrder = await Order.findOne({ _id: req.params.id }).select('status rating feedback');
    if (!existingOrder) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
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

// ── PATCH /api/orders/:id/status — protected, staff ───────────────────────────
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${VALID_STATUSES.join(', ')}.`,
      });
    }

    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.tenantId },
      { status },
      { new: true }
    )
      .populate('tableId', 'label')
      .populate('branchId', 'name');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // ── Realtime: broadcast to restaurant room and the specific order room ────
    const io = req.app.get('io');
    if (io) {
      io.to(`restaurant:${order.restaurantId}`).emit('order:updated', order);
      io.to(`order:${order._id}`).emit('order:updated', order);
    }

    if (order.status === 'served' && order.paymentStatus === 'paid') {
      suggestTableReadyToClear(req, order.tableId?._id || order.tableId, order.restaurantId)
        .catch((err) => (req.log || console).error({ err }, 'Unable to evaluate table clear suggestion'));
    }

    return res.json({ success: true, order });
  } catch (err) {
    return next(err);
  }
};

// ── PATCH /api/orders/:id/payment — protected, staff ─────────────────────────
const updateOrderPayment = async (req, res, next) => {
  try {
    const { paymentMethod } = req.body;
    const VALID_METHODS = ['cash', 'pos'];

    if (!paymentMethod || !VALID_METHODS.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'paymentMethod must be "cash" or "pos".',
      });
    }

    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.tenantId },
      { paymentStatus: 'paid', paymentMethod },
      { new: true }
    )
      .populate('tableId', 'label')
      .populate('branchId', 'name');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // ── Realtime: broadcast to restaurant room and the specific order room ────
    const io = req.app.get('io');
    if (io) {
      io.to(`restaurant:${order.restaurantId}`).emit('order:updated', order);
      io.to(`order:${order._id}`).emit('order:updated', order);
    }

    if (order.status === 'served' && order.paymentStatus === 'paid') {
      suggestTableReadyToClear(req, order.tableId?._id || order.tableId, order.restaurantId)
        .catch((err) => (req.log || console).error({ err }, 'Unable to evaluate table clear suggestion'));
    }

    return res.json({ success: true, order });
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
  updateOrderPayment,
  submitOrderFeedback,
};
