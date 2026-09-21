require("dotenv").config();
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const app = require("./src/app");
const { initSockets } = require("./src/sockets");
const Table = require("./src/models/Table");
const Order = require("./src/models/Order");

const PORT = process.env.PORT || 5000;

function getAllowedOrigins() {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    const envOrigins = [
      process.env.CLIENT_URL_CUSTOMER,
      process.env.CLIENT_URL_DASHBOARD,
      ...(process.env.ALLOWED_ORIGINS || "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ];

    return envOrigins.filter(
      (origin, index, array) => origin && array.indexOf(origin) === index,
    );
  }

  return [
    "http://localhost:5173",
    "http://localhost:5174",
    /^http:\/\/localhost:\d+$/,
  ];
}

// ── Fail-fast: crash loudly if required secrets are missing ───────────────────
const REQUIRED_ENV = ["JWT_SECRET", "JWT_REFRESH_SECRET"];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(
    `[LayoScan] ❌  Missing required environment variables: ${missing.join(", ")}\n` +
      "           Copy server/.env.example → server/.env and set all values.",
  );
  process.exit(1);
}

// ── HTTP server ───────────────────────────────────────────────────────────────
const server = http.createServer(app);

// ── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      const allowedOrigins = getAllowedOrigins();

      if (process.env.NODE_ENV === "production") {
        if (!origin) return callback(null, false);
        const matches = allowedOrigins.includes(origin);
        return matches
          ? callback(null, true)
          : callback(new Error("Origin not allowed by CORS"));
      }

      if (!origin) return callback(null, true);
      const isLocalhostOrigin = /^http:\/\/localhost:\d+$/.test(origin);
      return isLocalhostOrigin ? callback(null, true) : callback(null, true);
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Expose io so controllers can reach it via req.app.get('io')
app.set("io", io);

// Initialise socket event handlers
initSockets(io);

const sweepExpiredTableSessions = async () => {
  try {
    const expiredTables = await Table.find({
      status: "occupied",
      sessionExpiresAt: { $ne: null, $lte: new Date() },
    });
    for (const table of expiredTables) {
      const hasOrders = await Order.exists({
        tableId: table._id,
        restaurantId: table.restaurantId,
        status: { $nin: ["served", "cancelled"] },
      });
      if (hasOrders) continue;
      table.status = "available";
      table.occupiedSince = null;
      table.activeSessionToken = null;
      table.sessionExpiresAt = null;
      table.sessionLocationVerified = null;
      await table.save();
      io.to(`restaurant:${table.restaurantId}`).emit("table:updated", table);
    }
  } catch (err) {
    console.error("[LayoScan] Table session sweep failed:", err.message);
  }
};

// ── MongoDB connection (placeholder) ─────────────────────────────────────────
(async () => {
  if (!process.env.MONGO_URI) {
    console.warn(
      "[LayoScan] ⚠  MONGO_URI is not set — skipping database connection. " +
        "Copy .env.example → .env and fill in your connection string.",
    );
  } else {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log("[LayoScan] ✅  MongoDB connected successfully.");
    } catch (err) {
      console.error("[LayoScan] ❌  MongoDB connection failed:", err.message);
      // Do not crash the process — server still starts for health-check purposes
    }
  }

  // ── Start listening ─────────────────────────────────────────────────────────
  server.listen(PORT, () => {
    console.log(`[LayoScan] 🚀  Server running on http://localhost:${PORT}`);
    console.log(
      `[LayoScan]     Health check → GET http://localhost:${PORT}/api/health`,
    );
  });
  setInterval(sweepExpiredTableSessions, 60_000);
})();
