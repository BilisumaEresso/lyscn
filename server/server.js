require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const app = require('./src/app');
const { initSockets } = require('./src/sockets');

const PORT = process.env.PORT || 5000;

// ── Fail-fast: crash loudly if required secrets are missing ───────────────────
const REQUIRED_ENV = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(
    `[LayoScan] ❌  Missing required environment variables: ${missing.join(', ')}\n` +
    '           Copy server/.env.example → server/.env and set all values.'
  );
  process.exit(1);
}

// ── HTTP server ───────────────────────────────────────────────────────────────
const server = http.createServer(app);

// ── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: [
      process.env.CLIENT_URL_CUSTOMER  || 'http://localhost:5173',
      process.env.CLIENT_URL_DASHBOARD || 'http://localhost:5174',
      // Dev: accept any localhost port (Vite uses dynamic ports)
      /^http:\/\/localhost:\d+$/,
    ],
    methods: ['GET', 'POST'],
  },
});

// Expose io so controllers can reach it via req.app.get('io')
app.set('io', io);

// Initialise socket event handlers
initSockets(io);

// ── MongoDB connection (placeholder) ─────────────────────────────────────────
(async () => {
  if (!process.env.MONGO_URI) {
    console.warn(
      '[LayoScan] ⚠  MONGO_URI is not set — skipping database connection. ' +
      'Copy .env.example → .env and fill in your connection string.'
    );
  } else {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('[LayoScan] ✅  MongoDB connected successfully.');
    } catch (err) {
      console.error('[LayoScan] ❌  MongoDB connection failed:', err.message);
      // Do not crash the process — server still starts for health-check purposes
    }
  }

  // ── Start listening ─────────────────────────────────────────────────────────
  server.listen(PORT, () => {
    console.log(`[LayoScan] 🚀  Server running on http://localhost:${PORT}`);
    console.log(`[LayoScan]     Health check → GET http://localhost:${PORT}/api/health`);
  });
})();
