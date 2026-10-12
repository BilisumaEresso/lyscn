const { isProduction } = require('./env');

const DEFAULT_PRODUCTION_ORIGINS = [
  'https://layoscancustomer.vercel.app',
  'https://layoscandashboard.vercel.app',
];

function normalizeOrigin(url) {
  if (typeof url !== 'string') return '';
  return url.trim().replace(/\/+$/, '');
}

/**
 * Returns the list of allowed CORS origins.
 * Production: merges defaults + env vars (CLIENT_URL_CUSTOMER, CLIENT_URL_DASHBOARD, ALLOWED_ORIGINS).
 * Development: permits any localhost port.
 *
 * Shared by both the Express CORS middleware (app.js) and the Socket.io
 * CORS config (server.js) so the logic is never duplicated.
 */
function getAllowedOrigins() {
  if (isProduction()) {
    const envOrigins = [
      ...DEFAULT_PRODUCTION_ORIGINS,
      process.env.CLIENT_URL_CUSTOMER,
      process.env.CLIENT_URL_DASHBOARD,
      ...(process.env.ALLOWED_ORIGINS || '').split(','),
    ]
      .map(normalizeOrigin)
      .filter(Boolean);

    return [...new Set(envOrigins)];
  }

  return [
    'http://localhost:5173',
    'http://localhost:5174',
    /^http:\/\/localhost:\d+$/,
  ];
}

/**
 * Checks whether an incoming Origin header is permitted.
 * Strips trailing slashes, handles Vercel preview URLs, and localhost in dev.
 */
function isOriginAllowed(origin) {
  if (!origin) {
    // Non-browser or same-origin requests (e.g. server-to-server, curl, health checks)
    return true;
  }

  const cleanOrigin = normalizeOrigin(origin);

  if (isProduction()) {
    const allowed = getAllowedOrigins();
    if (allowed.includes(cleanOrigin)) {
      return true;
    }
    // Allow Vercel preview or branch deployments for this project
    if (/^https:\/\/layoscan[a-z0-9-]*\.vercel\.app$/i.test(cleanOrigin)) {
      return true;
    }
    return false;
  }

  return /^http:\/\/localhost:\d+$/.test(cleanOrigin);
}

module.exports = { getAllowedOrigins, isOriginAllowed, normalizeOrigin };

