const Order  = require('../models/Order');
const Product = require('../models/Product');
const Table   = require('../models/Table');

const VALID_STATUSES = ['placed', 'accepted', 'preparing', 'ready', 'served', 'cancelled'];

// ── POST /api/orders/public ───────────────────────────────────────────────────
// Customer-facing: places a new order.
// Prices are ALWAYS computed server-side — client totals are ignored.
const placeOrder = async (req, res, next) => {
  try {
    const { tableId, restaurantId, branchId, sessionId, guestName, items } = req.body;

    if (!tableId || !restaurantId || !branchId || !sessionId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'tableId, restaurantId, branchId, sessionId, and at least one item are required.',
      });
    }

    // Validate that the triple (tableId, restaurantId, branchId) refers to a real active table
    const table = await Table.findOne({ _id: tableId, restaurantId, branchId, isActive: true });
    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Table not found or inactive. Please re-scan the QR code.',
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
      guestName: guestName || null,
      items:     orderItems,
      totalAmount,
    });

    // ── Realtime: broadcast to restaurant staff room ──────────────────────────
    const io = req.app.get('io');
    if (io) {
      // Populate tableId for the event payload so the kanban card can show the label
      const populated = await Order.findById(order._id)
        .populate('tableId', 'label')
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
const getOrderStatus = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).select('status paymentStatus');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    return res.json({
      success: true,
      status:        order.status,
      paymentStatus: order.paymentStatus,
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

    return res.json({ success: true, order });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  placeOrder,
  listOrders,
  getOrderStatus,
  updateOrderStatus,
  updateOrderPayment,
};
