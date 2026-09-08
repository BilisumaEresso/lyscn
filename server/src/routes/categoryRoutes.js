const express = require('express');
const router  = express.Router();
const {
  listCategories, createCategory, updateCategory, deleteCategory,
} = require('../controllers/categoryController');
const { protect, restrictTo }   = require('../middleware/auth');
const { resolveTenantFromAuth } = require('../middleware/tenantResolver');

router.use(protect, resolveTenantFromAuth);

router.get('/',      listCategories);
router.post('/',     restrictTo('owner', 'manager'), createCategory);
router.patch('/:id', restrictTo('owner', 'manager'), updateCategory);
router.delete('/:id', restrictTo('owner', 'manager'), deleteCategory);

module.exports = router;
