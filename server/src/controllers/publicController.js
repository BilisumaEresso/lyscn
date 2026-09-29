const Restaurant = require('../models/Restaurant');
const Branch     = require('../models/Branch');
const Table      = require('../models/Table');
const Order      = require('../models/Order');
const crypto     = require('crypto');

const hasConfiguredLocation = (branch) =>
  Number.isFinite(branch?.location?.lat) && Number.isFinite(branch?.location?.lng);

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes fast auto-free for inactive tables

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

    // ── Table switching & single table occupancy ────────────────────────────
    const { previousTableId, previousSessionToken, migrateTable } = req.query;
    if (previousTableId && String(previousTableId) !== String(table._id)) {
      const prevTable = await Table.findOne({
        _id: previousTableId,
        restaurantId: req.tenantId,
      });

      if (prevTable) {
        const prevUnpaidOrders = await Order.find({
          tableId: prevTable._id,
          restaurantId: req.tenantId,
          paymentStatus: 'unpaid',
          status: { $ne: 'cancelled' },
        });

        if (prevUnpaidOrders.length === 0) {
          // Diner was just reading / browsing at previous table (or previous orders are settled).
          // Automatically release Table 1 to 'available' so one user cannot occupy multiple tables!
          await releaseTable(prevTable, io);
        } else if (migrateTable === 'true') {
          // Diner explicitly confirmed moving their active orders to this new table
          await Order.updateMany(
            { tableId: prevTable._id, paymentStatus: 'unpaid', status: { $ne: 'cancelled' } },
            { $set: { tableId: table._id, branchId: branch._id } }
          );
          await releaseTable(prevTable, io);
          for (const ord of prevUnpaidOrders) {
            if (io) {
              io.to(`restaurant:${table.restaurantId}`).emit('order:updated', { ...ord.toObject(), tableId: table });
              io.to(`order:${ord._id}`).emit('order:updated', { ...ord.toObject(), tableId: table });
            }
          }
        } else {
          // Diner has active orders at previous table and needs to confirm migration
          return res.json({
            success: true,
            tableSwitchPrompt: true,
            previousTable: {
              id: prevTable._id,
              label: prevTable.label,
            },
            newTable: {
              id: table._id,
              label: table.label,
            },
            activeOrdersCount: prevUnpaidOrders.length,
            message: `You have ${prevUnpaidOrders.length} active order${prevUnpaidOrders.length === 1 ? '' : 's'} at ${prevTable.label}. Would you like to move your order to ${table.label}?`,
          });
        }
      }
    }

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
      table.sessionExpiresAt = new Date(now.getTime() + INACTIVITY_TIMEOUT_MS);
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
        table.sessionExpiresAt = new Date(now.getTime() + 15 * 60 * 1000);
        await table.save();
      }
    }

    if (table.status === 'available') {
      table.status = 'occupied';
      table.occupiedSince = now;
      table.activeSessionToken = crypto.randomBytes(24).toString('hex');
      table.sessionExpiresAt = new Date(now.getTime() + INACTIVITY_TIMEOUT_MS);
      table.sessionLocationVerified = null;
      await table.save();
      if (io) io.to(`restaurant:${table.restaurantId}`).emit('table:updated', table);
    } else if (!table.activeSessionToken) {
      // Backfill sessions for tables occupied before session security was enabled.
      table.activeSessionToken = crypto.randomBytes(24).toString('hex');
      if (!table.sessionExpiresAt && !hasOrders) {
        table.sessionExpiresAt = new Date(now.getTime() + INACTIVITY_TIMEOUT_MS);
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
      return res.status(401).json({ success: false, code: 'RESCAN_REQUIRED', message: 'Your session has expired — please scan the QR code again.' });
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
        distanceMeters: Math.round(distance),
        message: 'This cafe requires customers to be within its radius. Location verification is strictly required.',
      });
    }
    return res.json({ success: true, verified, distanceMeters: Math.round(distance) });
  } catch (err) {
    return next(err);
  }
};

// ── GET /api/public/restaurant/:identifier ────────────────────────────────────
// Public info for a cafe/restaurant without requiring a table or occupying any table.
// Returns restaurant branding, branch location/strict mode info, and live table/seat availability.
const getPublicRestaurant = async (req, res, next) => {
  try {
    const { identifier } = req.params;
    let restaurant = null;

    if (/^[a-f\d]{24}$/i.test(identifier)) {
      restaurant = await Restaurant.findById(identifier).select(
        'name slug logoUrl coverUrl brandColor description contactInfo socialLinks'
      );
    }
    if (!restaurant) {
      restaurant = await Restaurant.findOne({ slug: identifier }).select(
        'name slug logoUrl coverUrl brandColor description contactInfo socialLinks'
      );
    }
    if (!restaurant && /^[a-f\d]{24}$/i.test(identifier)) {
      const branchMatch = await Branch.findById(identifier);
      if (branchMatch) {
        restaurant = await Restaurant.findById(branchMatch.restaurantId).select(
          'name slug logoUrl coverUrl brandColor description contactInfo socialLinks'
        );
      }
    }

    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found.' });
    }

    // Resolve primary branch
    const branch = await Branch.findOne({ restaurantId: restaurant._id }).select(
      'name address currency timezone location locationStrictMode phone'
    );

    let tableAvailability = {
      totalTables: 0,
      availableTables: 0,
      occupiedTables: 0,
      totalSeats: 0,
      availableSeats: 0,
    };

    if (branch) {
      const tables = await Table.find({
        restaurantId: restaurant._id,
        branchId: branch._id,
        isActive: true,
      }).select('status capacity');

      const totalTables = tables.length;
      const occupiedTables = tables.filter((t) => t.status === 'occupied').length;
      const availableTables = Math.max(0, totalTables - occupiedTables);
      const totalSeats = tables.reduce((sum, t) => sum + (t.capacity || 2), 0);
      const availableSeats = tables
        .filter((t) => t.status !== 'occupied')
        .reduce((sum, t) => sum + (t.capacity || 2), 0);

      tableAvailability = {
        totalTables,
        availableTables,
        occupiedTables,
        totalSeats,
        availableSeats,
      };
    }

    return res.json({
      success: true,
      restaurant,
      branch,
      tableAvailability,
    });
  } catch (err) {
    return next(err);
  }
};

// ── POST /api/public/table/heartbeat ──────────────────────────────────────────
// Sent periodically while diner tab is active to keep table session alive (5 min sliding window)
const heartbeatTable = async (req, res, next) => {
  try {
    const { tableId, sessionToken } = req.body;
    if (!tableId || !sessionToken) {
      return res.status(400).json({ success: false, message: 'tableId and sessionToken are required.' });
    }

    const table = await Table.findOne({ _id: tableId, isActive: true });
    if (!table || table.activeSessionToken !== sessionToken) {
      return res.status(401).json({
        success: false,
        code: 'RESCAN_REQUIRED',
        message: 'Your table session has expired or is invalid. Please rescan the table QR code.',
      });
    }

    // Extend session by 5 minutes sliding window
    table.sessionExpiresAt = new Date(Date.now() + INACTIVITY_TIMEOUT_MS);
    await table.save();

    return res.json({ success: true, expiresAt: table.sessionExpiresAt });
  } catch (err) {
    return next(err);
  }
};

// ── POST /api/public/table/release-session ────────────────────────────────────
// Explicitly frees table if diner closes tab, leaves cafe, or is inactive for 5 minutes
const releaseTableSession = async (req, res, next) => {
  try {
    const { tableId, sessionToken, reason } = req.body;
    if (!tableId || !sessionToken) {
      return res.status(400).json({ success: false, message: 'tableId and sessionToken are required.' });
    }

    const table = await Table.findOne({ _id: tableId, isActive: true });
    if (!table || table.activeSessionToken !== sessionToken) {
      return res.status(200).json({ success: true, released: true, note: 'Already released or invalid.' });
    }

    // Do NOT release if there are active unserved or unpaid orders
    const hasActiveOrders = await Order.exists({
      tableId: table._id,
      restaurantId: table.restaurantId,
      status: { $nin: ['served', 'cancelled'] },
    });

    if (hasActiveOrders) {
      return res.json({
        success: false,
        retained: true,
        message: 'Table has active orders being prepared or served. Not releasing.',
      });
    }

    await releaseTable(table, req.app.get('io'));
    return res.json({ success: true, released: true, reason });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  resolveQRCode,
  verifyLocation,
  getPublicRestaurant,
  heartbeatTable,
  releaseTableSession,
};
