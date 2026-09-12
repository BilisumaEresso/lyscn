const Branch = require('../models/Branch');

// ── GET /api/branches ─────────────────────────────────────────────────────────
const listBranches = async (req, res, next) => {
  try {
    const branches = await Branch.find({ restaurantId: req.tenantId }).sort({ createdAt: 1 });
    return res.json({ success: true, branches });
  } catch (err) {
    return next(err);
  }
};

// ── POST /api/branches ────────────────────────────────────────────────────────
const createBranch = async (req, res, next) => {
  try {
    const { name, address, timezone } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Branch name is required.' });
    }

    const branch = await Branch.create({
      restaurantId: req.tenantId,
      name,
      ...(address  && { address }),
      currency: 'ETB',
      ...(timezone && { timezone }),
    });

    return res.status(201).json({ success: true, branch });
  } catch (err) {
    return next(err);
  }
};

// ── PATCH /api/branches/:id ───────────────────────────────────────────────────
const updateBranch = async (req, res, next) => {
  try {
    // Always scope update to the current tenant — prevents cross-tenant writes
    const updates = { ...req.body, currency: 'ETB' };
    const branch = await Branch.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.tenantId },
      updates,
      { new: true, runValidators: true }
    );

    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found.' });
    }

    return res.json({ success: true, branch });
  } catch (err) {
    return next(err);
  }
};

// ── DELETE /api/branches/:id (soft-delete) ────────────────────────────────────
const deleteBranch = async (req, res, next) => {
  try {
    const branch = await Branch.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.tenantId },
      { isActive: false },
      { new: true }
    );

    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found.' });
    }

    return res.json({ success: true, message: 'Branch deactivated successfully.', branch });
  } catch (err) {
    return next(err);
  }
};

const updateBranchLocation = async (req, res, next) => {
  try {
    const { lat, lng, radiusMeters = 150, locationStrictMode = false } = req.body;
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
      return res.status(400).json({ success: false, message: 'Valid latitude and longitude are required.' });
    }
    const branch = await Branch.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.tenantId },
      {
        location: { lat: Number(lat), lng: Number(lng), radiusMeters: Number(radiusMeters) || 150 },
        locationStrictMode: Boolean(locationStrictMode),
      },
      { new: true, runValidators: true }
    );
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found.' });
    return res.json({ success: true, branch });
  } catch (err) {
    return next(err);
  }
};

module.exports = { listBranches, createBranch, updateBranch, deleteBranch, updateBranchLocation };
