const express = require('express');
const router  = express.Router();
const {
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
} = require('../controllers/orderController');
const { protect, restrictTo }   = require('../middleware/auth');
const { resolveTenantFromAuth } = require('../middleware/tenantResolver');
const { publicWriteLimiter, tableResolveLimiter } = require('../middleware/rateLimit');
const { requirePlan } = require('../middleware/requirePlan');

// ── Public routes (customer-facing, no auth) ──────────────────────────────────
// Registered BEFORE router.use(protect) to skip the auth guard
router.post('/public', publicWriteLimiter, placeOrder);
router.get('/public/table/orders', tableResolveLimiter, getTableOrders);
router.get('/public/:id/status', tableResolveLimiter, getOrderStatus);
router.patch('/public/:id/feedback', publicWriteLimiter, submitOrderFeedback);

// ── Protected routes (staff only) ────────────────────────────────────────────
router.use(protect, resolveTenantFromAuth);

router.get('/',                            listOrders);
router.get('/export',                      restrictTo('owner', 'manager'), requirePlan('pro', 'exports'), exportOrders);
router.get('/waiter/shift-summary',        restrictTo('owner', 'manager', 'coordinator', 'waiter'), getWaiterShiftSummary);
router.post('/staff',                      restrictTo('owner', 'manager', 'coordinator', 'waiter', 'cashier'), createStaffOrder);
router.patch('/:id/status',                updateOrderStatus);
router.patch('/:id/assign',                assignOrder);
router.patch('/:id/payment',               restrictTo('owner', 'manager', 'coordinator', 'waiter'), updateOrderPayment);
router.post('/:id/payments',               restrictTo('owner', 'manager', 'coordinator', 'waiter'), recordOrderPayment);
router.patch('/table/:tableId/payment',    restrictTo('owner', 'manager', 'coordinator', 'waiter'), updateTablePayment);
router.post('/table/:tableId/payments',    restrictTo('owner', 'manager', 'coordinator', 'waiter'), recordTablePayment);

module.exports = router;
