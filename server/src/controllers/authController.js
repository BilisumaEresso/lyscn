const jwt = require('jsonwebtoken');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');

// ── Token helpers ─────────────────────────────────────────────────────────────
const signAccessToken = (user) =>
  jwt.sign(
    { userId: user._id, restaurantId: user.restaurantId, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

const signRefreshToken = (user) =>
  jwt.sign({ userId: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

// ── POST /api/auth/register ────────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { restaurantName, ownerName, email, password } = req.body;

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
      email,
      passwordHash: password,
      role:         'owner',
    });

    const accessToken  = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    // Strip passwordHash before sending
    const userObj = user.toObject();
    delete userObj.passwordHash;

    return res.status(201).json({
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

    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or inactive.' });
    }

    const accessToken = signAccessToken(user);

    return res.json({ success: true, accessToken });
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

module.exports = { register, login, refresh, me };
