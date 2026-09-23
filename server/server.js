require("dotenv").config();
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const logger = require("./src/config/logger");
const { validateEnv, isProduction } = require("./src/config/env");
const { getAllowedOrigins } = require("./src/config/cors");
const app = require("./src/app");
const { initSockets } = require("./src/sockets");
const Table = require("./src/models/Table");
const Order = require("./src/models/Order");

const PORT = process.env.PORT || 5000;

validateEnv();

// ── Process-level crash handlers ──────────────────────────────────────────────
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception — shutting down");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "Unhandled promise rejection — shutting down");
  process.exit(1);
});

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
    logger.error({ err }, "Table session sweep failed");
  }
};

async function connectDatabase() {
  if (!process.env.MONGO_URI) {
    logger.warn(
      "MONGO_URI is not set — skipping database connection. " +
        "Copy .env.example → .env and fill in your connection string.",
    );
    return false;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info("MongoDB connected successfully");
    return true;
  } catch (err) {
    logger.error({ err }, "MongoDB connection failed");
    return false;
  }
}

(async () => {
  const dbConnected = await connectDatabase();

  if (isProduction() && !dbConnected) {
    logger.fatal("Cannot start in production without a working MongoDB connection");
    process.exit(1);
  }

  server.listen(PORT, () => {
    logger.info({ port: PORT }, "Server running");
    logger.info({ url: `http://localhost:${PORT}/api/health` }, "Health check endpoint");
  });

  if (dbConnected) {
    setInterval(sweepExpiredTableSessions, 60_000);
  }
})();

