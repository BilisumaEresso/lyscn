const Restaurant = require('../models/Restaurant');

// ── GET /api/restaurants/me ───────────────────────────────────────────────────
const getMyRestaurant = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.tenantId);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found.' });
    }
    return res.json({ success: true, restaurant });
  } catch (err) {
    return next(err);
  }
};

// ── PATCH /api/restaurants/me ─────────────────────────────────────────────────
const updateMyRestaurant = async (req, res, next) => {
  try {
    // Whitelist updatable fields — slug and subscriptionPlan not changeable here
    const ALLOWED = [
      'name', 'logoUrl', 'coverUrl', 'brandColor',
      'description', 'socialLinks', 'contactInfo',
    ];

    const updates = {};
    for (const field of ALLOWED) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.tenantId,
      updates,
      { new: true, runValidators: true }
    );

    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found.' });
    }

    return res.json({ success: true, restaurant });
  } catch (err) {
    return next(err);
  }
};

module.exports = { getMyRestaurant, updateMyRestaurant };
