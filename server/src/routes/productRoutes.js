const express = require('express');
const router  = express.Router();
const {
  getPublicProducts,
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const { protect, restrictTo }   = require('../middleware/auth');
const { resolveTenantFromAuth } = require('../middleware/tenantResolver');

// ── Public (no auth required) ─────────────────────────────────────────────────
// Must be registered BEFORE router.use(protect, ...) to avoid the auth guard
router.get('/public', getPublicProducts);

// ── Protected (staff only) ────────────────────────────────────────────────────
router.use(protect, resolveTenantFromAuth);

router.get('/',      listProducts);
router.post('/',     restrictTo('owner', 'manager'), createProduct);
router.patch('/:id', restrictTo('owner', 'manager'), updateProduct);
router.delete('/:id', restrictTo('owner', 'manager'), deleteProduct);

module.exports = router;
