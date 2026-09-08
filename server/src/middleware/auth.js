const jwt = require('jsonwebtoken');

/**
 * protect
 * Verifies the JWT access token from the Authorization header (Bearer scheme).
 * On success, attaches { userId, restaurantId, role } to req.user.
 */
const protect = (req, res, next) => {
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

    req.user = {
      userId:       decoded.userId,
      restaurantId: decoded.restaurantId,
      role:         decoded.role,
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
