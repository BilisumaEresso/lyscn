const express = require('express');
const router  = express.Router();
const {
  listTables,
  createTable,
  createBulkTables,
  bulkRegenerateQR,
  bulkDeactivate,
  updateTable,
  deleteTable,
  regenerateQR,
} = require('../controllers/tableController');
const { protect, restrictTo }   = require('../middleware/auth');
const { resolveTenantFromAuth } = require('../middleware/tenantResolver');

router.use(protect, resolveTenantFromAuth);

router.get('/',      listTables);
router.post('/',     restrictTo('owner', 'manager'), createTable);
router.post('/bulk', restrictTo('owner', 'manager'), createBulkTables);
router.patch('/bulk/regenerate-qr', restrictTo('owner', 'manager'), bulkRegenerateQR);
router.patch('/bulk/deactivate',    restrictTo('owner', 'manager'), bulkDeactivate);
router.patch('/:id', restrictTo('owner', 'manager'), updateTable);
router.delete('/:id', restrictTo('owner', 'manager'), deleteTable);
router.post('/:id/regenerate-qr', restrictTo('owner', 'manager'), regenerateQR);

module.exports = router;
