require("dotenv").config();
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const { validateEnv, isProduction } = require("./src/config/env");
const app = require("./src/app");
const { initSockets } = require("./src/sockets");
const Table = require("./src/models/Table");
const Order = require("./src/models/Order");

const PORT = process.env.PORT || 5000;

function getAllowedOrigins() {
  if (isProduction()) {
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

validateEnv();

// ── HTTP server ───────────────────────────────────────────────────────────────
const server = http.createServer(app);

// ── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      const allowedOrigins = getAllowedOrigins();

      if (isProduction()) {
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

app.set("io", io);
initSockets(io);

const sweepExpiredTableSessions = async () => {
  if (mongoose.connection.readyState !== 1) return;

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

async function connectDatabase() {
  if (!process.env.MONGO_URI) {
    console.warn(
      "[LayoScan] MONGO_URI is not set — skipping database connection. " +
        "Copy .env.example → .env and fill in your connection string.",
    );
    return false;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("[LayoScan] MongoDB connected successfully.");
    return true;
  } catch (err) {
    console.error("[LayoScan] MongoDB connection failed:", err.message);
    return false;
  }
}

(async () => {
  const dbConnected = await connectDatabase();

  if (isProduction() && !dbConnected) {
    console.error("[LayoScan] Cannot start in production without a working MongoDB connection.");
    process.exit(1);
  }

  server.listen(PORT, () => {
    console.log(`[LayoScan] Server running on http://localhost:${PORT}`);
    console.log(`[LayoScan] Health check → GET http://localhost:${PORT}/api/health`);
  });

  if (dbConnected) {
    setInterval(sweepExpiredTableSessions, 60_000);
  }
})();
