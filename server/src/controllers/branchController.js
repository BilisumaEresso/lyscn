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
    const { name, address, currency, timezone } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Branch name is required.' });
    }

    const branch = await Branch.create({
      restaurantId: req.tenantId,
      name,
      ...(address  && { address }),
      ...(currency && { currency }),
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
    const branch = await Branch.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.tenantId },
      req.body,
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

module.exports = { listBranches, createBranch, updateBranch, deleteBranch };
