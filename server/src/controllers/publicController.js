const Restaurant = require('../models/Restaurant');
const Branch     = require('../models/Branch');
const Table      = require('../models/Table');

// ── GET /api/public/table/:qrToken ────────────────────────────────────────────
// Returns public-safe restaurant + branch + table info after QR scan.
// req.tenantId / req.branchId / req.tableId are set by resolveTenantFromTable middleware.
const resolveQRCode = async (req, res, next) => {
  try {
    const [restaurant, branch, table] = await Promise.all([
      Restaurant.findById(req.tenantId).select(
        'name slug logoUrl coverUrl brandColor description contactInfo socialLinks'
      ),
      Branch.findById(req.branchId).select('name address currency timezone'),
      Table.findById(req.tableId).select('label qrToken'),
    ]);

    if (!restaurant || !branch || !table) {
      return res.status(404).json({ success: false, message: 'Resource not found.' });
    }

    return res.json({ success: true, restaurant, branch, table });
  } catch (err) {
    return next(err);
  }
};

module.exports = { resolveQRCode };
