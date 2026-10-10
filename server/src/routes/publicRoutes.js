const express = require('express');
const router  = express.Router();
const {
  resolveQRCode,
  verifyLocation,
  getPublicRestaurant,
  exploreRestaurants,
  heartbeatTable,
  releaseTableSession,
} = require('../controllers/publicController');
const { resolveTenantFromTable } = require('../middleware/tenantResolver');
const { tableResolveLimiter, publicWriteLimiter } = require('../middleware/rateLimit');

// GET /api/public/restaurants/explore
// Returns list of restaurants ranked by ratings/reviews, supports search & sorting
router.get('/restaurants/explore', tableResolveLimiter, exploreRestaurants);

// GET /api/public/restaurant/:identifier
// Returns restaurant info, branch details, reviews summary & live table availability
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
