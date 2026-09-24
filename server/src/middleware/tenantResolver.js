const Table = require('../models/Table');

/**
 * resolveTenantFromAuth
 * For staff-authenticated routes — sets req.tenantId from the JWT payload.
 * Must run AFTER the `protect` middleware.
 */
const resolveTenantFromAuth = (req, res, next) => {
  req.tenantId = req.user.restaurantId;
  return next();
};

/**
 * resolveTenantFromTable
 * For public customer routes — reads qrToken from req.params or req.query,
 * looks up the Table, and sets req.tenantId, req.branchId, req.tableId.
 * Returns 404 if the token is invalid or the table is inactive.
 */
const resolveTenantFromTable = async (req, res, next) => {
  try {
    const rawToken = req.params.qrToken || req.query.qrToken;

    if (!rawToken || typeof rawToken !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'QR token is required.',
      });
    }

    const qrToken = rawToken.trim();
    const table = await Table.findOne({
      qrToken: { $regex: new RegExp(`^${qrToken}$`, 'i') },
      isActive: true,
    });

    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or inactive QR code.',
      });
    }

    req.tenantId = table.restaurantId;
    req.branchId = table.branchId;
    req.tableId  = table._id;

    return next();
  } catch (err) {
    return next(err);
  }
};

module.exports = { resolveTenantFromAuth, resolveTenantFromTable };
