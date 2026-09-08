const express = require('express');
const router  = express.Router();
const {
  placeOrder,
  listOrders,
  getOrderStatus,
  updateOrderStatus,
  updateOrderPayment,
} = require('../controllers/orderController');
const { protect }               = require('../middleware/auth');
const { resolveTenantFromAuth } = require('../middleware/tenantResolver');

// ── Public routes (customer-facing, no auth) ──────────────────────────────────
// Registered BEFORE router.use(protect) to skip the auth guard
router.post('/public',           placeOrder);
router.get('/public/:id/status', getOrderStatus);

// ── Protected routes (staff only) ────────────────────────────────────────────
router.use(protect, resolveTenantFromAuth);

router.get('/',               listOrders);
router.patch('/:id/status',   updateOrderStatus);
router.patch('/:id/payment',  updateOrderPayment);

module.exports = router;
