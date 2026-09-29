const express = require('express');
const router  = express.Router();
const {
  resolveQRCode,
  verifyLocation,
  getPublicRestaurant,
  heartbeatTable,
  releaseTableSession,
} = require('../controllers/publicController');
const { resolveTenantFromTable } = require('../middleware/tenantResolver');
const { tableResolveLimiter, publicWriteLimiter } = require('../middleware/rateLimit');

// GET /api/public/restaurant/:identifier
// Returns restaurant info, branch details & live table availability (without table occupation)
router.get('/restaurant/:identifier', tableResolveLimiter, getPublicRestaurant);

// GET /api/public/table/:qrToken
// Middleware resolves qrToken → tenantId / branchId / tableId before the controller runs
router.get('/table/:qrToken', tableResolveLimiter, resolveTenantFromTable, resolveQRCode);
router.post(
  '/table/:qrToken/verify-location',
  publicWriteLimiter,
  resolveTenantFromTable,
  verifyLocation,
);

// Heartbeat & rapid session release
router.post('/table/heartbeat', publicWriteLimiter, heartbeatTable);
router.post('/table/release-session', publicWriteLimiter, releaseTableSession);

module.exports = router;
