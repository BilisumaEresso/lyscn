# LayoScan — Multi-Tenant Restaurant QR Ordering Platform

LayoScan lets restaurant diners scan a QR code at their table, browse the menu, customise dishes, place orders, and track live status — all without a waiter interaction. Staff manage the menu, tables, and orders from a purpose-built dashboard with real-time kanban updates.

---

## Project Structure

```
LayoScan/
├── server/          — Node.js + Express + MongoDB + Socket.io API
├── dashboard-app/   — React + Vite + Tailwind (restaurant staff)
└── customer-app/    — React + Vite + Tailwind (diner, mobile-first)
```

---

## Prerequisites

- **Node.js** ≥ 18
- **MongoDB** — local install or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) free tier
- **npm** ≥ 9

---

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd LayoScan

# Install all three apps
cd server       && npm install && cd ..
cd dashboard-app && npm install && cd ..
cd customer-app  && npm install && cd ..
```

### 2. Configure the server

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/layoscan   # or your Atlas URI
JWT_SECRET=<generate a strong random secret>
JWT_REFRESH_SECRET=<generate another strong random secret>
```

Generate secrets with:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Configure the front-ends (optional)

Both apps default to `http://localhost:5000/api`. Override via:
```bash
cp customer-app/.env.example  customer-app/.env
cp dashboard-app/.env.example dashboard-app/.env
```

### 4. Seed the database

The seed script creates a demo restaurant, branch, three tables with QR tokens, demo staff credentials, two categories, and four products:

```bash
cd server
node src/utils/seed.js
```

Sample output:
```
[Seed] ✅  Connected to MongoDB
[Seed] 🍽   Restaurant → Demo Bistro
[Seed] 🏪   Branch → Main Branch
[Seed] 🪑   Tables created:
            Table 1    qrToken: 3730290da2c66a0c
            Table 2    qrToken: d627fdab587c2630
            Table 3    qrToken: 1133cc6047953ea8
[Seed] 👤   Owner user → demo@layoscan.test / Demo1234
[Seed] 📂   Categories → Starters, Mains
[Seed] 🍔   Products → Garlic Bread, Tomato Soup, Grilled Chicken Burger, Margherita Pizza
```

---

## Running Locally

Start all three in separate terminals:

```bash
# Terminal 1 — API server (port 5000)
cd server && npm run dev

# Terminal 2 — Dashboard (port 5174 or next available)
cd dashboard-app && npm run dev

# Terminal 3 — Customer app (port 5173 or next available)
cd customer-app && npm run dev
```

### Test the full flow

1. **Dashboard**: open the Vite URL, register or log in with `demo@layoscan.test / Demo1234`
2. **Customer**: open `http://localhost:5173/t/3730290da2c66a0c` — this simulates scanning Table 1's QR code
3. Place an order in the customer app → watch it appear in the dashboard's **Placed** column within ≈1 second (Socket.io)
4. Advance the order status on the dashboard → customer tracking screen updates immediately

---

## API Reference (quick)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/register` | — | Register restaurant + owner |
| `POST` | `/api/auth/login` | — | Login, returns JWT pair |
| `GET`  | `/api/public/table/:qrToken` | — | Resolve table (customer) |
| `GET`  | `/api/products/public?restaurantId=` | — | Public product catalog |
| `POST` | `/api/orders/public` | — | Place order (customer) |
| `GET`  | `/api/orders/public/:id/status` | — | Poll order status (customer) |
| `GET`  | `/api/orders` | Staff JWT | List orders (kanban) |
| `PATCH`| `/api/orders/:id/status` | Staff JWT | Advance order status |
| `PATCH`| `/api/orders/:id/payment` | Staff JWT | Mark order as paid |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express, Mongoose (MongoDB), Socket.io |
| Dashboard | React 18, Vite, Tailwind CSS, React Query, Zustand, socket.io-client |
| Customer app | React 18, Vite, Tailwind CSS, React Query, Zustand, socket.io-client |
| Auth | JWT (access + refresh tokens), bcryptjs |
| Realtime | Socket.io — staff rooms per restaurant, per-order rooms for customers |

---

## Phase 1 vs Phase 2

### Phase 1 (this codebase) — Complete ✅

The full product loop is functionally complete:

**Scan → Browse → Customise → Order → Track → Manage**

Payment collection in Phase 1 is **manual**: staff mark orders as paid (cash or POS terminal) using the "Mark as paid" buttons on the kanban board. The `paymentStatus` and `paymentMethod` fields are stored on every order and surfaced to the customer's tracking screen.

This is an explicit Phase 1 design decision — it lets restaurants start using the platform immediately without payment gateway integration.

### Phase 2 — Payment Gateway Integration

Phase 2 will add online payment collection (e.g. Stripe) on top of the existing `paymentStatus`/`paymentMethod` schema without requiring changes to Step 1–5 logic. The planned approach:

- Add a `paymentIntentId` / `paymentProvider` field to the Order model
- Add a `POST /api/orders/:id/checkout-session` endpoint that creates a Stripe Checkout Session
- Redirect the customer to Stripe-hosted checkout after order placement
- Handle `checkout.session.completed` webhook to auto-mark `paymentStatus: 'paid'`
- The kanban board's "Mark as paid" button remains for cash/POS fallback

No Phase 2 work is included in this codebase. The `paymentMethod: 'cash' | 'pos'` enum will expand to include `'stripe'` in Phase 2.

---

## Environment Variables Reference

### `server/.env`

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `5000` | Server listen port |
| `NODE_ENV` | Prod | `development` | Set to `production` on Render |
| `MONGO_URI` | Yes (prod) | — | MongoDB connection string |
| `JWT_SECRET` | Yes | — | Access token signing secret (min 32 chars in prod; 64+ recommended) |
| `JWT_REFRESH_SECRET` | Yes | — | Refresh token signing secret (same as above) |
| `CLIENT_URL_CUSTOMER` | Yes (prod) | `http://localhost:5173` | CORS origin for customer app |
| `CLIENT_URL_DASHBOARD` | Yes (prod) | `http://localhost:5174` | CORS origin for dashboard |
| `ALLOWED_ORIGINS` | No | — | Comma-separated extra CORS origins |
| `CLOUDINARY_*` | If uploads | — | Cloud name, API key, and secret for menu/branding images |
| `RATE_LIMIT_*` | No | see `.env.example` | Optional abuse-protection tuning |

`GET /api/health` returns **503** when MongoDB is unavailable (used by Render). See `DEPLOYMENT.md` for the full production checklist.

### `customer-app/.env` / `dashboard-app/.env`

| Variable | Default |
|----------|---------|
| `VITE_API_URL` | `http://localhost:5000/api` |

---

## Per-Restaurant Theming

Each restaurant can set a `brandColor` hex in the dashboard's Settings page. The customer app's customer-facing screens (category chips, cart bar, CTA buttons, order tracker highlights) automatically adapt to that color on the next QR scan. Text contrast is computed via WCAG relative luminance so button labels remain readable regardless of whether the chosen color is light or dark.

---

## License

MIT
