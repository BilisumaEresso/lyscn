const pinoHttp = require('pino-http');
const crypto = require('crypto');
const logger = require('../config/logger');

/**
 * Express middleware that logs every HTTP request/response.
 *
 * - Generates a short unique request ID (X-Request-Id header)
 * - Logs method, url, status code, and response time
 * - Attaches a child logger to `req.log` for use in controllers
 * - Quiets health check noise in production
 */
const requestLogger = pinoHttp({
  logger,

  // Generate a short request ID for correlation
  genReqId: (req) => {
    const existing = req.headers['x-request-id'];
    if (existing) return existing;
    return crypto.randomBytes(8).toString('hex');
  },

  // Skip logging for health checks to reduce noise
  autoLogging: {
    ignore: (req) => req.url === '/api/health',
  },

  // Customize the log level based on response status code
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },

  // Slim down what gets logged per request
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});

module.exports = requestLogger;
