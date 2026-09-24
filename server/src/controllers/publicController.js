const Restaurant = require('../models/Restaurant');
const Branch     = require('../models/Branch');
const Table      = require('../models/Table');
const Order      = require('../models/Order');
const crypto     = require('crypto');

const hasConfiguredLocation = (branch) =>
  Number.isFinite(branch?.location?.lat) && Number.isFinite(branch?.location?.lng);

const releaseTable = async (table, io) => {
  table.status = 'available';
  table.occupiedSince = null;
  table.activeSessionToken = null;
  table.sessionExpiresAt = null;
  table.sessionLocationVerified = null;
  await table.save();
  if (io) io.to(`restaurant:${table.restaurantId}`).emit('table:updated', table);
};

// ── GET /api/public/table/:qrToken ────────────────────────────────────────────
// Returns public-safe restaurant + branch + table info after QR scan.
// req.tenantId / req.branchId / req.tableId are set by resolveTenantFromTable middleware.
const resolveQRCode = async (req, res, next) => {
  try {
    const [restaurant, branch, table] = await Promise.all([
      Restaurant.findById(req.tenantId).select(
        'name slug logoUrl coverUrl brandColor description contactInfo socialLinks'
      ),
      Branch.findById(req.branchId).select('name address currency timezone location locationStrictMode'),
      Table.findById(req.tableId).select('label qrToken status occupiedSince activeSessionToken sessionExpiresAt sessionLocationVerified restaurantId'),
    ]);

    if (!restaurant || !branch || !table) {
      return res.status(404).json({ success: false, message: 'Resource not found.' });
    }

    const now = new Date();
    const io = req.app.get('io');
    const activeOrders = await Order.find({
      tableId: table._id,
      restaurantId: table.restaurantId,
      status: { $nin: ['served', 'cancelled'] },
    })
      .select('_id status guestName totalAmount createdAt items sessionId')
      .sort({ createdAt: -1 });

    const hasOrders = activeOrders.length > 0;

    if (
      table.status === 'occupied' &&
      !hasOrders &&
      (req.query.freshSession === 'true' || req.query.newSession === 'true')
    ) {
      // Client explicitly requested a fresh session and no active orders remain on table.
      table.activeSessionToken = crypto.randomBytes(24).toString('hex');
      table.occupiedSince = now;
      table.sessionExpiresAt = new Date(now.getTime() + 30 * 60 * 1000);
      table.sessionLocationVerified = null;
      await table.save();
      if (io) io.to(`restaurant:${table.restaurantId}`).emit('table:updated', table);
    } else if (
      table.status === 'occupied' &&
      table.sessionExpiresAt &&
      table.sessionExpiresAt <= now
    ) {
      if (!hasOrders) {
        await releaseTable(table, io);
      } else {
        // Active orders remain: extend session
        table.sessionExpiresAt = new Date(now.getTime() + 30 * 60 * 1000);
        await table.save();
      }
    }

    if (table.status === 'available') {
      table.status = 'occupied';
      table.occupiedSince = now;
      table.activeSessionToken = crypto.randomBytes(24).toString('hex');
      table.sessionExpiresAt = new Date(now.getTime() + 30 * 60 * 1000);
      table.sessionLocationVerified = null;
      await table.save();
      if (io) io.to(`restaurant:${table.restaurantId}`).emit('table:updated', table);
    } else if (!table.activeSessionToken) {
      // Backfill sessions for tables occupied before session security was enabled.
      table.activeSessionToken = crypto.randomBytes(24).toString('hex');
      if (!table.sessionExpiresAt && !hasOrders) {
        table.sessionExpiresAt = new Date(now.getTime() + 30 * 60 * 1000);
      }
      await table.save();
    }

    return res.json({
      success: true,
      restaurant,
      branch,
      table,
      sessionToken: table.activeSessionToken,
      locationCheckRequired: hasConfiguredLocation(branch) && table.sessionLocationVerified === null,
      activeOrderCount: activeOrders.length,
      activeOrders: activeOrders.map((o) => ({
        id: o._id,
        status: o.status,
        guestName: o.guestName,
        itemCount: (o.items || []).reduce((acc, it) => acc + (it.qty || 1), 0),
        totalAmount: o.totalAmount,
        createdAt: o.createdAt,
        sessionId: o.sessionId,
      })),
    });
  } catch (err) {
    return next(err);
  }
};

const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const radius = 6371000;
  const toRadians = (value) => (value * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const verifyLocation = async (req, res, next) => {
  try {
    const { sessionToken, lat, lng } = req.body;
    const [table, branch] = await Promise.all([
      Table.findOne({ qrToken: req.params.qrToken, isActive: true }),
      Branch.findOne({ _id: req.branchId }),
    ]);
    if (!table || !branch || table.activeSessionToken !== sessionToken) {
      return res.status(401).json({ success: false, message: 'Your session has expired — please scan the QR code again.' });
    }
    if (!hasConfiguredLocation(branch) || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
      return res.json({ success: true, verified: null });
    }
    const distance = haversineDistance(branch.location.lat, branch.location.lng, Number(lat), Number(lng));
    const verified = distance <= (branch.location.radiusMeters || 150);
    table.sessionLocationVerified = verified;
    await table.save();
    if (branch.locationStrictMode && !verified) {
      return res.status(403).json({
        success: false,
        verified: false,
        message: 'This ordering link only works while you’re at the restaurant. Please make sure location access is enabled and try again.',
      });
    }
    return res.json({ success: true, verified, distanceMeters: Math.round(distance) });
  } catch (err) {
    return next(err);
  }
};

module.exports = { resolveQRCode, verifyLocation };
