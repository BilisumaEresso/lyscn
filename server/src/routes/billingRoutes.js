const express = require('express');
const router = express.Router();
const {
  getSubscription,
  listInvoices,
  payInvoice,
  updatePlan,
  sendReminder,
} = require('../controllers/billingController');
const { protect, restrictTo } = require('../middleware/auth');
const { resolveTenantFromAuth } = require('../middleware/tenantResolver');

// Billing is restricted to restaurant owners and managers
router.use(protect, resolveTenantFromAuth);

router.get('/subscription', restrictTo('owner', 'manager'), getSubscription);
router.get('/invoices',     restrictTo('owner', 'manager'), listInvoices);
router.post('/invoices/:id/pay', restrictTo('owner', 'manager'), payInvoice);
router.post('/plan',        restrictTo('owner'), updatePlan);
router.post('/reminder',    restrictTo('owner', 'manager'), sendReminder);

module.exports = router;
