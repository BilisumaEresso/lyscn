const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * protect
 * Verifies the JWT access token from the Authorization header (Bearer scheme),
 * and confirms the user exists and is active in the database.
 * On success, attaches { userId, restaurantId, role } to req.user.
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Authorization denied.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fast check: Ensure user still exists and has not been deactivated by manager/owner
    const user = await User.findById(decoded.userId).select('isActive role restaurantId');
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated or no longer exists.',
      });
    }

    req.user = {
      userId:       user._id,
      restaurantId: user.restaurantId,
      role:         user.role,
    };

    return next();
  } catch (_err) {
    return res.status(401).json({
      success: false,
      message: 'Token is invalid or has expired.',
    });
  }
};

/**
 * restrictTo(...roles)
 * Returns middleware that 403s if req.user.role is not in the allowed list.
 * Must be called AFTER protect.
 */
const restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Required role(s): ${roles.join(', ')}.`,
    });
  }
  return next();
};

module.exports = { protect, restrictTo };
