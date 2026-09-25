const jwt = require('jsonwebtoken');
const Order = require('../models/Order');
const Table = require('../models/Table');

const logger = require('../config/logger');

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
    // Staff: auto-join their restaurant's room and personal user room
    if (socket.data.restaurantId) {
      const room = `restaurant:${socket.data.restaurantId}`;
      socket.join(room);
      if (socket.data.userId) {
        socket.join(`user:${socket.data.userId}`);
      }
      logger.debug({ socketId: socket.id, room, userId: socket.data.userId }, 'Staff socket connected');
    } else {
      logger.debug({ socketId: socket.id }, 'Customer socket connected');
    }

    // Any client (customer or staff) can join an order room to receive updates.
    // Staff are trusted via JWT; customers must present a valid sessionToken.
    socket.on('join:order', async ({ orderId, sessionToken } = {}) => {
      if (!orderId || !/^[a-f\d]{24}$/i.test(orderId)) return;

      // Authenticated staff can always join order rooms for their restaurant
      if (socket.data.restaurantId) {
        socket.join(`order:${orderId}`);
        logger.debug({ socketId: socket.id, orderId }, 'Staff socket joined order room');
        return;
      }

      // Customers must prove session ownership
      if (!sessionToken) {
        logger.debug({ socketId: socket.id, orderId }, 'Socket denied order room — no sessionToken');
        return;
      }

      try {
        const order = await Order.findById(orderId).select('tableId').lean();
        if (!order) return;

        const table = await Table.findById(order.tableId).select('activeSessionToken').lean();
        if (!table || table.activeSessionToken !== sessionToken) {
          logger.debug({ socketId: socket.id, orderId }, 'Socket denied order room — bad session');
          return;
        }

        socket.join(`order:${orderId}`);
        logger.debug({ socketId: socket.id, orderId }, 'Customer socket joined order room');
      } catch (err) {
        logger.error({ err, orderId }, 'Socket join:order error');
      }
    });

    // Customer or staff can join a table room to receive table updates and assistance feedback
    socket.on('join:table', async ({ tableId, sessionToken } = {}) => {
      if (!tableId || !/^[a-f\d]{24}$/i.test(tableId)) return;

      if (socket.data.restaurantId) {
        socket.join(`table:${tableId}`);
        logger.debug({ socketId: socket.id, tableId }, 'Staff socket joined table room');
        return;
      }

      if (!sessionToken) {
        logger.debug({ socketId: socket.id, tableId }, 'Socket denied table room — no sessionToken');
        return;
      }

      try {
        const table = await Table.findById(tableId).select('activeSessionToken').lean();
        if (!table || table.activeSessionToken !== sessionToken) {
          logger.debug({ socketId: socket.id, tableId }, 'Socket denied table room — bad session');
          return;
        }

        socket.join(`table:${tableId}`);
        logger.debug({ socketId: socket.id, tableId }, 'Customer socket joined table room');
      } catch (err) {
        logger.error({ err, tableId }, 'Socket join:table error');
      }
    });

    socket.on('disconnect', () => {
      logger.debug({ socketId: socket.id }, 'Socket disconnected');
    });
  });
}

module.exports = { initSockets };

