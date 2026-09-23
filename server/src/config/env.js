/**
 * Startup environment validation.
 * Production requires a full set of secrets and frontend URLs for CORS.
 */

const isProduction = () => process.env.NODE_ENV === 'production';

const REQUIRED_ALWAYS = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];

const REQUIRED_PRODUCTION = [
  'MONGO_URI',
  'CLIENT_URL_CUSTOMER',
  'CLIENT_URL_DASHBOARD',
];

const MIN_JWT_SECRET_LENGTH = 32;

function validateEnv() {
  const missing = REQUIRED_ALWAYS.filter((key) => !process.env[key]?.trim());

  if (isProduction()) {
    missing.push(...REQUIRED_PRODUCTION.filter((key) => !process.env[key]?.trim()));
  }

  if (missing.length > 0) {
    console.error(
      `[LayoScan] Missing required environment variables: ${missing.join(', ')}\n` +
        '           Copy server/.env.example → server/.env and set all values.',
    );
    process.exit(1);
  }

  if (isProduction()) {
    for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET']) {
      const value = process.env[key];
      if (value.length < MIN_JWT_SECRET_LENGTH) {
        console.error(
          `[LayoScan] ${key} must be at least ${MIN_JWT_SECRET_LENGTH} characters in production.`,
        );
        process.exit(1);
      }
    }
  }
}

module.exports = { validateEnv, isProduction };
