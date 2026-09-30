const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const crypto = require('crypto');
const { normalizePhone, isValidPhone } = require('../utils/phone');

// ── GET /api/users ─────────────────────────────────────────────────────────────
const listUsers = async (req, res, next) => {
  try {
    const users = await User.find({ restaurantId: req.tenantId })
      .select('-passwordHash')
      .populate('assignedTables', 'label')
      .sort({ createdAt: -1 });

    const sanitizedUsers = users.map((u) => {
      const obj = u.toObject();
      obj.hasPin = Boolean(obj.pinHash);
      delete obj.pinHash;
      return obj;
    });

    return res.json({ success: true, users: sanitizedUsers });
  } catch (err) {
    return next(err);
  }
};

// ── POST /api/users ────────────────────────────────────────────────────────────
const createUser = async (req, res, next) => {
  try {
    const { name, phone, email, role, password, pin, station, assignedTables, isOnDuty } = req.body;

    const ALLOWED_ROLES = ['manager', 'coordinator', 'kitchen', 'waiter'];
    if (!role || !ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${ALLOWED_ROLES.join(', ')}`,
      });
    }

    if (!phone && !email) {
      return res.status(400).json({
        success: false,
        message: 'Phone number or email is required for staff members.',
      });
    }

    let normalizedPhone;
    if (phone) {
      if (!isValidPhone(phone)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid phone number (e.g. 0911223344 or 0711223344).',
        });
      }
      normalizedPhone = normalizePhone(phone);
      const existingPhoneUser = await User.findOne({ phone: normalizedPhone });
      if (existingPhoneUser) {
        return res.status(409).json({
          success: false,
          message: 'A user with this phone number already exists.',
        });
      }
    }

    let cleanEmail;
    if (email) {
      cleanEmail = email.toLowerCase().trim();
      const existingEmailUser = await User.findOne({ email: cleanEmail });
      if (existingEmailUser) {
        return res.status(409).json({
          success: false,
          message: 'A user with this email address already exists.',
        });
      }
    }

    // Default to provided password or generate an 8-byte hex temp password
    const userPassword = password || crypto.randomBytes(8).toString('hex');

    const userData = {
      restaurantId: req.tenantId,
      name,
      phone: normalizedPhone,
      email: cleanEmail,
      role,
      passwordHash: userPassword,
    };

    if (pin && /^\d{4}$/.test(String(pin))) {
      userData.pinHash = String(pin);
    }
    if (station && ['all', 'kitchen', 'bar'].includes(station)) {
      userData.station = station;
    }
    if (Array.isArray(assignedTables)) {
      userData.assignedTables = assignedTables;
    }
    if (typeof isOnDuty === 'boolean') {
      userData.isOnDuty = isOnDuty;
    }

    const user = await User.create(userData);

    const userObj = user.toObject();
    userObj.hasPin = Boolean(userObj.pinHash);
    delete userObj.passwordHash;
    delete userObj.pinHash;

    return res.status(201).json({
      success: true,
      user: userObj,
      ...(!password && { tempPassword: userPassword }),
    });
  } catch (err) {
    return next(err);
  }
};

// ── PATCH /api/users/:id ───────────────────────────────────────────────────────
const updateUser = async (req, res, next) => {
  try {
    const { role, isActive, name, phone, pin, station, assignedTables, isOnDuty, password } = req.body;

    const targetUser = await User.findOne({
      _id: req.params.id,
      restaurantId: req.tenantId,
    });

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Cannot modify the owner role or self-deactivate
    if (targetUser.role === 'owner' && role && role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Cannot demote the restaurant owner.' });
    }

    if (String(targetUser._id) === String(req.user.userId) && isActive === false) {
      return res.status(400).json({ success: false, message: 'Cannot deactivate your own account.' });
    }

    if (name) targetUser.name = name;
    if (phone) {
      if (!isValidPhone(phone)) {
        return res.status(400).json({ success: false, message: 'Invalid phone format.' });
      }
      targetUser.phone = normalizePhone(phone);
    }
    if (role && ['manager', 'coordinator', 'kitchen', 'waiter'].includes(role)) {
      targetUser.role = role;
    }
    if (pin !== undefined) {
      if (!pin) {
        targetUser.pinHash = null;
      } else if (/^\d{4}$/.test(String(pin))) {
        targetUser.pinHash = String(pin);
      } else {
        return res.status(400).json({ success: false, message: 'PIN must be a 4-digit number.' });
      }
    }
    if (station && ['all', 'kitchen', 'bar'].includes(station)) {
      targetUser.station = station;
    }
    if (Array.isArray(assignedTables)) {
      targetUser.assignedTables = assignedTables;
    }
    if (typeof isOnDuty === 'boolean') {
      targetUser.isOnDuty = isOnDuty;
    }
    if (password && String(password).length >= 6) {
      targetUser.passwordHash = password;
    }
    if (typeof isActive === 'boolean') {
      targetUser.isActive = isActive;
      // If deactivating, revoke active refresh tokens and emit real-time event
      if (!isActive) {
        await RefreshToken.updateMany(
          { userId: targetUser._id, revokedAt: null },
          { revokedAt: new Date() }
        );

        const io = req.app.get('io');
        if (io) {
          io.to(`user:${targetUser._id}`).emit('auth:revoked', {
            reason: 'Your account has been deactivated by management.',
          });
        }
      }
    }

    await targetUser.save();

    const userObj = targetUser.toObject();
    userObj.hasPin = Boolean(userObj.pinHash);
    delete userObj.passwordHash;
    delete userObj.pinHash;

    return res.json({ success: true, user: userObj });
  } catch (err) {
    return next(err);
  }
};

// ── DELETE /api/users/:id (deactivate) ─────────────────────────────────────────
const deleteUser = async (req, res, next) => {
  try {
    const targetUser = await User.findOne({
      _id: req.params.id,
      restaurantId: req.tenantId,
    });

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (targetUser.role === 'owner') {
      return res.status(403).json({ success: false, message: 'Cannot deactivate the restaurant owner.' });
    }

    if (req.user.role === 'manager' && (targetUser.role === 'owner' || targetUser.role === 'manager')) {
      return res.status(403).json({ success: false, message: 'Managers cannot deactivate owners or other managers.' });
    }

    if (String(targetUser._id) === String(req.user.userId)) {
      return res.status(400).json({ success: false, message: 'Cannot deactivate your own account.' });
    }

    targetUser.isActive = false;
    await targetUser.save();

    // Revoke refresh tokens
    await RefreshToken.updateMany(
      { userId: targetUser._id, revokedAt: null },
      { revokedAt: new Date() }
    );

    // Notify client via Socket.IO immediately
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${targetUser._id}`).emit('auth:revoked', {
        reason: 'Your staff account has been removed or deactivated by management.',
      });
    }

    return res.json({ success: true, message: 'Staff member deactivated.' });
  } catch (err) {
    return next(err);
  }
};

module.exports = { listUsers, createUser, updateUser, deleteUser };
