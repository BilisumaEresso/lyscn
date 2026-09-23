const jwt = require('jsonwebtoken');
const Order = require('../models/Order');
const Table = require('../models/Table');

/**
 * Initialises all Socket.io event handlers.
 * Called once from server.js after the io instance is created.
 *
 * Room architecture:
 *   restaurant:<restaurantId>  — joined automatically for authenticated staff
 *   order:<orderId>            — joined on-demand via `join:order` event (customer + staff)
 *   restaurant:<restaurantId>  — assistance and order events for staff
 */
function initSockets(io) {
  // ── Auth middleware ───────────────────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      // Customer connections arrive without a token — always allow through
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.data.restaurantId = decoded.restaurantId;
      socket.data.role         = decoded.role;
      socket.data.userId       = decoded.userId;
    } catch {
      // Invalid / expired token: treat as unauthenticated rather than
      // rejecting — customer sockets never send one anyway
    }

    next();
  });

  // ── Connection handler ────────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const isDev = process.env.NODE_ENV !== 'production';

    // Staff: auto-join their restaurant's room (derived from verified token)
    if (socket.data.restaurantId) {
      const room = `restaurant:${socket.data.restaurantId}`;
      socket.join(room);
      if (isDev) console.log(`[socket] staff connected  id=${socket.id}  room=${room}`);
    } else {
      if (isDev) console.log(`[socket] customer connected  id=${socket.id}`);
    }

    // Any client (customer or staff) can join an order room to receive updates.
    // Staff are trusted via JWT; customers must present a valid sessionToken.
    socket.on('join:order', async ({ orderId, sessionToken } = {}) => {
      if (!orderId || !/^[a-f\d]{24}$/i.test(orderId)) return;

      // Authenticated staff can always join order rooms for their restaurant
      if (socket.data.restaurantId) {
        socket.join(`order:${orderId}`);
        if (isDev) console.log(`[socket] staff ${socket.id} joined order:${orderId}`);
        return;
      }

      // Customers must prove session ownership
      if (!sessionToken) {
        if (isDev) console.log(`[socket] ${socket.id} denied order:${orderId} — no sessionToken`);
        return;
      }

      try {
        const order = await Order.findById(orderId).select('tableId').lean();
        if (!order) return;

        const table = await Table.findById(order.tableId).select('activeSessionToken').lean();
        if (!table || table.activeSessionToken !== sessionToken) {
          if (isDev) console.log(`[socket] ${socket.id} denied order:${orderId} — bad session`);
          return;
        }

        socket.join(`order:${orderId}`);
        if (isDev) console.log(`[socket] ${socket.id} joined order:${orderId}`);
      } catch (err) {
        console.error(`[socket] join:order error for ${orderId}:`, err.message);
      }
    });

    socket.on('disconnect', () => {
      if (isDev) console.log(`[socket] disconnected  id=${socket.id}`);
    });
  });
}

module.exports = { initSockets };

