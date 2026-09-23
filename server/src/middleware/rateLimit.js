const rateLimit = require('express-rate-limit');

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;

const standardHeaders = true;
const legacyHeaders = false;

const limitHandler = (req, res) => {
  res.status(429).json({
    success: false,
    message: 'Too many requests. Please wait a moment and try again.',
  });
};

const createLimiter = ({ max }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders,
    legacyHeaders,
    handler: limitHandler,
    skip: () => process.env.RATE_LIMIT_DISABLED === 'true',
  });

/** Login, register, refresh — per IP */
const authLimiter = createLimiter({
  max: Number(process.env.RATE_LIMIT_AUTH_MAX) || 30,
});

/** QR table resolve (GET) — mitigates token guessing */
const tableResolveLimiter = createLimiter({
  max: Number(process.env.RATE_LIMIT_PUBLIC_TABLE_MAX) || 120,
});

/** Public writes: orders, assistance, location verify, feedback */
const publicWriteLimiter = createLimiter({
  max: Number(process.env.RATE_LIMIT_PUBLIC_WRITE_MAX) || 60,
});

module.exports = {
  authLimiter,
  tableResolveLimiter,
  publicWriteLimiter,
};
