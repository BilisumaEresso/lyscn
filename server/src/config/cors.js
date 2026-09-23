const { isProduction } = require('./env');

/**
 * Returns the list of allowed CORS origins.
 * Production: reads from env vars (CLIENT_URL_CUSTOMER, CLIENT_URL_DASHBOARD, ALLOWED_ORIGINS).
 * Development: permits any localhost port.
 *
 * Shared by both the Express CORS middleware (app.js) and the Socket.io
 * CORS config (server.js) so the logic is never duplicated.
 */
function getAllowedOrigins() {
  if (isProduction()) {
    const envOrigins = [
      process.env.CLIENT_URL_CUSTOMER,
      process.env.CLIENT_URL_DASHBOARD,
      ...(process.env.ALLOWED_ORIGINS || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ];

    return envOrigins.filter(
      (origin, index, array) => origin && array.indexOf(origin) === index,
    );
  }

  return [
    'http://localhost:5173',
    'http://localhost:5174',
    /^http:\/\/localhost:\d+$/,
  ];
}

module.exports = { getAllowedOrigins };
