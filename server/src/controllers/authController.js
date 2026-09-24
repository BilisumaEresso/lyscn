const jwt = require('jsonwebtoken');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const Branch = require('../models/Branch');
const Table = require('../models/Table');
const RefreshToken = require('../models/RefreshToken');

// ── Token helpers ─────────────────────────────────────────────────────────────
const signAccessToken = (user) =>
  jwt.sign(
    { userId: user._id, restaurantId: user.restaurantId, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

const signRefreshToken = (user) =>
  jwt.sign({ userId: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

const persistRefreshToken = async (userId, tokenString) => {
  const tokenHash = RefreshToken.hashToken(tokenString);
  const decoded = jwt.decode(tokenString);
  const expiresAt = new Date((decoded?.exp || Date.now() / 1000 + 7 * 86400) * 1000);
  await RefreshToken.create({ userId, tokenHash, expiresAt });
};

// ── POST /api/auth/register ────────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { restaurantName, ownerName, email, password, timezone } = req.body;

    if (!restaurantName || !ownerName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'restaurantName, ownerName, email, and password are all required.',
      });
    }

    // Guard: check for existing account
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // 1. Create restaurant
    const restaurant = await Restaurant.create({ name: restaurantName });

    // 2. Create owner user — pre-save hook will hash passwordHash
    const user = await User.create({
      restaurantId: restaurant._id,
      name:         ownerName,
      email:        email.toLowerCase(),
      passwordHash: password,
      role:         'owner',
    });

    // 3. Atomically create default "Main Branch" and initial "Table 1"
    const branch = await Branch.create({
      restaurantId: restaurant._id,
      name:         'Main Branch',
      currency:     'ETB',
      timezone:     timezone || 'UTC',
    });

    const table = await Table.create({
      restaurantId: restaurant._id,
      branchId:     branch._id,
      label:        'Table 1',
    });

    const accessToken  = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    await persistRefreshToken(user._id, refreshToken);

    // Strip passwordHash before sending
    const userObj = user.toObject();
    delete userObj.passwordHash;

    return res.status(201).json({
      success: true,
      user:         userObj,
      restaurant,
      branch,
      table,
      accessToken,
      refreshToken,
    });
  } catch (err) {
    return next(err);
  }
};

// ── POST /api/auth/login ───────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    // Explicitly select passwordHash (it has select: false by default)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const restaurant = await Restaurant.findById(user.restaurantId);

    const accessToken  = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    await persistRefreshToken(user._id, refreshToken);

    const userObj = user.toObject();
    delete userObj.passwordHash;

    return res.json({
      success: true,
      user:         userObj,
      restaurant,
      accessToken,
      refreshToken,
    });
  } catch (err) {
    return next(err);
  }
};

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'refreshToken is required.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (_err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token.',
      });
    }

    // Check token persistence & rotation status
    const tokenHash = RefreshToken.hashToken(refreshToken);
    const storedToken = await RefreshToken.findOne({ tokenHash });

    if (!storedToken) {
      return res.status(401).json({ success: false, message: 'Invalid or unrecognized refresh token.' });
    }

    // Reuse detection: if this token was already replaced or revoked, revoke all tokens for this user
    if (storedToken.revokedAt || storedToken.replacedByTokenHash) {
      await RefreshToken.updateMany(
        { userId: storedToken.userId, revokedAt: null },
        { revokedAt: new Date() }
      );
      return res.status(401).json({
        success: false,
        message: 'Refresh token reuse detected. All sessions revoked for security.',
      });
    }

    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or inactive.' });
    }

    // Rotate: Issue new access & refresh tokens
    const newAccessToken = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user);
    const newTokenHash = RefreshToken.hashToken(newRefreshToken);
    const newDecoded = jwt.decode(newRefreshToken);

    // Mark previous token as replaced
    storedToken.revokedAt = new Date();
    storedToken.replacedByTokenHash = newTokenHash;
    await storedToken.save();

    // Persist new token
    await RefreshToken.create({
      userId: user._id,
      tokenHash: newTokenHash,
      expiresAt: new Date(newDecoded.exp * 1000),
    });

    return res.json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    return next(err);
  }
};

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const tokenHash = RefreshToken.hashToken(refreshToken);
      await RefreshToken.updateOne({ tokenHash }, { revokedAt: new Date() });
    }
    return res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    return next(err);
  }
};

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
const me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const restaurant = await Restaurant.findById(user.restaurantId);

    return res.json({ success: true, user, restaurant });
  } catch (err) {
    return next(err);
  }
};

module.exports = { register, login, refresh, logout, me };
