const Category = require('../models/Category');
const Product  = require('../models/Product');

// ── GET /api/categories ───────────────────────────────────────────────────────
const listCategories = async (req, res, next) => {
  try {
    const filter = { restaurantId: req.tenantId, isActive: { $ne: false } };
    if (req.query.includeInactive === 'true') {
      delete filter.isActive;
    }
    const categories = await Category.find(filter)
      .sort({ sortOrder: 1, name: 1 });
    return res.json({ success: true, categories });
  } catch (err) {
    return next(err);
  }
};

// ── POST /api/categories ──────────────────────────────────────────────────────
const createCategory = async (req, res, next) => {
  try {
    const { name, sortOrder } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const category = await Category.create({
      restaurantId: req.tenantId,
      name,
      ...(sortOrder !== undefined && { sortOrder }),
    });

    return res.status(201).json({ success: true, category });
  } catch (err) {
    return next(err);
  }
};

// ── PATCH /api/categories/:id ─────────────────────────────────────────────────
const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.tenantId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    return res.json({ success: true, category });
  } catch (err) {
    return next(err);
  }
};

// ── DELETE /api/categories/:id (soft-delete) ──────────────────────────────────
const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.tenantId },
      { isActive: false },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    // Also deactivate products in this category
    await Product.updateMany(
      { categoryId: req.params.id, restaurantId: req.tenantId },
      { isAvailable: false }
    );

    return res.json({ success: true, message: 'Category removed successfully.', category });
  } catch (err) {
    return next(err);
  }
};

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };

