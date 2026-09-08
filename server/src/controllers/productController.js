const Product = require('../models/Product');

// ── GET /api/products/public?restaurantId= ────────────────────────────────────
// Public route — returns only available products for the customer menu view
const getPublicProducts = async (req, res, next) => {
  try {
    const { restaurantId } = req.query;

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: 'restaurantId query param is required.',
      });
    }

    const products = await Product.find({ restaurantId, isAvailable: true })
      .populate({
        path: 'categoryId',
        select: 'name sortOrder isActive',
        match: { isActive: { $ne: false } },
      })
      .sort({ name: 1 });

    const activeProducts = products.filter(
      (p) => p.categoryId && p.categoryId.isActive !== false
    );

    return res.json({ success: true, products: activeProducts });
  } catch (err) {
    return next(err);
  }
};

// ── GET /api/products ─────────────────────────────────────────────────────────
// Protected — staff can list all products (including unavailable)
const listProducts = async (req, res, next) => {
  try {
    const filter = { restaurantId: req.tenantId };
    if (req.query.categoryId) filter.categoryId = req.query.categoryId;

    const products = await Product.find(filter)
      .populate('categoryId', 'name sortOrder')
      .sort({ name: 1 });

    return res.json({ success: true, products });
  } catch (err) {
    return next(err);
  }
};

// ── POST /api/products ────────────────────────────────────────────────────────
const createProduct = async (req, res, next) => {
  try {
    const { categoryId, name, description, price, imageUrl, isAvailable, modifierGroups } = req.body;

    if (!categoryId || !name || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'categoryId, name, and price are required.',
      });
    }

    if (typeof price !== 'number' || price < 0) {
      return res.status(400).json({
        success: false,
        message: 'price must be a non-negative number.',
      });
    }

    const product = await Product.create({
      restaurantId: req.tenantId,
      categoryId,
      name,
      ...(description    !== undefined && { description }),
      price,
      ...(imageUrl       !== undefined && { imageUrl }),
      ...(isAvailable    !== undefined && { isAvailable }),
      ...(modifierGroups !== undefined && { modifierGroups }),
    });

    return res.status(201).json({ success: true, product });
  } catch (err) {
    return next(err);
  }
};

// ── PATCH /api/products/:id ───────────────────────────────────────────────────
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.tenantId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    return res.json({ success: true, product });
  } catch (err) {
    return next(err);
  }
};

// ── DELETE /api/products/:id (soft-delete → unavailable) ─────────────────────
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.tenantId },
      { isAvailable: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    return res.json({ success: true, message: 'Product marked unavailable.', product });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getPublicProducts,
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
};
