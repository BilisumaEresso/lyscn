# LayoScan Deployment Guide

This repo contains two separate frontend apps and one backend server. Deploy them as three independent services, not as a monorepo app.

## Project layout

- Backend: `server/` -> Render Web Service
- Customer app: `customer-app/` -> Vercel project
- Dashboard app: `dashboard-app/` -> Vercel project

## Important note on Vercel

Vercel does not require special monorepo configuration here. Create two separate Vercel projects from the same GitHub repo, and set each project's Root Directory to the correct app directory:

- Customer project root: `customer-app/`
- Dashboard project root: `dashboard-app/`

This keeps each app isolated and ensures the correct environment variables are used for that app.

## Deployment order

1. Deploy the backend to Render first.
   - Copy the live Render URL once the service is running.
2. Deploy the customer app to Vercel.
   - Set `VITE_API_URL` to the live Render URL.
   - Note the resulting customer app URL.
3. Deploy the dashboard app to Vercel.
   - Set `VITE_API_URL` to the same Render URL.
   - Set `VITE_CUSTOMER_APP_URL` to the customer app's Vercel URL from step 2.
   - This value is embedded into every printed table QR code.
4. Return to the Render backend env vars and set `CLIENT_URL_CUSTOMER` and `CLIENT_URL_DASHBOARD` to the live Vercel URLs.
   - Also add any custom domain through `ALLOWED_ORIGINS` if needed.
   - Redeploy Render so the backend CORS policy matches the live frontend origins.
5. Confirm MongoDB Atlas Network Access allows Render to connect.
   - The easiest option is to allow all IPs (`0.0.0.0/0`) for simplicity, or use Render's outbound static IPs on a paid plan.
   - This is configured in Atlas, not in app code.
6. Later, once a custom domain is configured, add it to `ALLOWED_ORIGINS` and redeploy the backend to allow the custom domain without any code change.

## Required environment variables

### Render (backend)

Required keys:

- `MONGO_URI`
- `JWT_SECRET` (minimum 32 characters; 64+ random bytes recommended)
- `JWT_REFRESH_SECRET` (same length guidance as `JWT_SECRET`)
- `CLIENT_URL_CUSTOMER` (exact Vercel URL, no trailing slash)
- `CLIENT_URL_DASHBOARD` (exact Vercel URL, no trailing slash)
- `NODE_ENV=production`

Recommended keys:

- `ALLOWED_ORIGINS` — comma-separated extra origins (custom domains, staging)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — required if the dashboard uploads menu or branding images

Optional rate-limit overrides (defaults are per IP per 15 minutes):

- `RATE_LIMIT_AUTH_MAX=30` — login, register, refresh
- `RATE_LIMIT_PUBLIC_TABLE_MAX=120` — QR table resolve (`GET /api/public/table/:qrToken`)
- `RATE_LIMIT_PUBLIC_WRITE_MAX=60` — place order, assistance, location verify, feedback
- `RATE_LIMIT_WINDOW_MS=900000`
- `RATE_LIMIT_DISABLED=true` — local debugging only; never use in production

Example values:

- `MONGO_URI=mongodb+srv://...`
- `JWT_SECRET=...`
- `JWT_REFRESH_SECRET=...`
- `CLIENT_URL_CUSTOMER=https://customer-app.vercel.app`
- `CLIENT_URL_DASHBOARD=https://dashboard-app.vercel.app`
- `ALLOWED_ORIGINS=https://custom-domain.com,https://staging.example.com`
- `CLOUDINARY_CLOUD_NAME=...`
- `CLOUDINARY_API_KEY=...`
- `CLOUDINARY_API_SECRET=...`
- `NODE_ENV=production`

### Vercel (customer app)

Required keys:

- `VITE_API_URL`

### Vercel (dashboard app)

Required keys:

- `VITE_API_URL`
- `VITE_CUSTOMER_APP_URL`

## Backend health check

The Render service should point at `/api/health` for an HTTP health check.

- **200** — API process is up and MongoDB responds to a ping.
- **503** — MongoDB is disconnected or ping failed. Render should treat this as unhealthy and restart or alert.

The server **will not start** in production if required env vars are missing, JWT secrets are too short, or the initial MongoDB connection fails.

## Notes

- The backend listens on `process.env.PORT` automatically in production.
- The CORS allowlist in production is restricted to the configured origin values and any optional `ALLOWED_ORIGINS` extras.
- Local development stays permissive for `localhost` ports so the Vite dev servers continue working without extra configuration.
- Public write endpoints and auth routes are rate-limited per IP to reduce abuse (see optional `RATE_LIMIT_*` variables above).
