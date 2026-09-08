const express = require('express');
const router  = express.Router();
const { resolveQRCode }         = require('../controllers/publicController');
const { resolveTenantFromTable } = require('../middleware/tenantResolver');

// GET /api/public/table/:qrToken
// Middleware resolves qrToken → tenantId / branchId / tableId before the controller runs
router.get('/table/:qrToken', resolveTenantFromTable, resolveQRCode);

module.exports = router;
