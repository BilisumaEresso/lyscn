const express = require('express');
const router  = express.Router();
const { getAnalytics } = require('../controllers/analyticsController');
const { protect }               = require('../middleware/auth');
const { resolveTenantFromAuth } = require('../middleware/tenantResolver');

// All analytics routes require authentication
router.use(protect, resolveTenantFromAuth);

// GET /api/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/', getAnalytics);

module.exports = router;
