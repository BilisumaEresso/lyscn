const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const crypto = require('crypto');

// ── GET /api/users ─────────────────────────────────────────────────────────────
const listUsers = async (req, res, next) => {
  try {
    const users = await User.find({ restaurantId: req.tenantId })
      .select('-passwordHash')
      .sort({ createdAt: -1 });

    return res.json({ success: true, users });
  } catch (err) {
    return next(err);
  }
};

// ── POST /api/users ────────────────────────────────────────────────────────────
const createUser = async (req, res, next) => {
  try {
    const { name, email, role, password } = req.body;

    const ALLOWED_ROLES = ['manager', 'kitchen', 'waiter'];
    if (!role || !ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${ALLOWED_ROLES.join(', ')}`,
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email address already exists.',
      });
    }

    // Default to provided password or generate an 8-byte hex temp password
    const userPassword = password || crypto.randomBytes(8).toString('hex');

    const user = await User.create({
      restaurantId: req.tenantId,
      name,
      email: email.toLowerCase(),
      role,
      passwordHash: userPassword,
    });

    const userObj = user.toObject();
    delete userObj.passwordHash;

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
    const { role, isActive, name } = req.body;

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
    if (role && ['manager', 'kitchen', 'waiter'].includes(role)) {
      targetUser.role = role;
    }
    if (typeof isActive === 'boolean') {
      targetUser.isActive = isActive;
      // If deactivating, revoke active refresh tokens
      if (!isActive) {
        await RefreshToken.updateMany(
          { userId: targetUser._id, revokedAt: null },
          { revokedAt: new Date() }
        );
      }
    }

    await targetUser.save();

    const userObj = targetUser.toObject();
    delete userObj.passwordHash;

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

    return res.json({ success: true, message: 'Staff member deactivated.' });
  } catch (err) {
    return next(err);
  }
};

module.exports = { listUsers, createUser, updateUser, deleteUser };
