const express = require('express');
const router  = express.Router();
const { getAnalytics } = require('../controllers/analyticsController');
const { protect, restrictTo }   = require('../middleware/auth');
const { resolveTenantFromAuth } = require('../middleware/tenantResolver');
const { requirePlan } = require('../middleware/requirePlan');

// All analytics routes require authentication
router.use(protect, resolveTenantFromAuth);

// GET /api/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/', restrictTo('owner', 'manager'), requirePlan('pro', 'analytics'), getAnalytics);

module.exports = router;
