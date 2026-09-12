const express = require('express');
const router = express.Router();
const {
  requestAssistance,
  listAssistance,
  acknowledgeAssistance,
  resolveAssistance,
} = require('../controllers/assistanceController');
const { protect } = require('../middleware/auth');
const { resolveTenantFromAuth } = require('../middleware/tenantResolver');

router.post('/public', requestAssistance);

router.use(protect, resolveTenantFromAuth);
router.get('/', listAssistance);
router.patch('/:id/acknowledge', acknowledgeAssistance);
router.patch('/:id/resolve', resolveAssistance);

module.exports = router;
