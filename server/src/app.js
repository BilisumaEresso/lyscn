const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoose = require("mongoose");

const authRoutes = require("./routes/authRoutes");
const restaurantRoutes = require("./routes/restaurantRoutes");
const branchRoutes = require("./routes/branchRoutes");
const tableRoutes = require("./routes/tableRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const assistanceRoutes = require("./routes/assistanceRoutes");
const publicRoutes = require("./routes/publicRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const { isProduction } = require("./config/env");
const { getAllowedOrigins } = require("./config/cors");

const app = express();
app.set("trust proxy", 1);

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

app.use(
  cors({
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
    credentials: true,
  }),
);
app.use(express.json());

// ── Health check (unauthenticated) — used by Render; returns 503 if DB is down ─
app.get("/api/health", async (req, res) => {
  const readyState = mongoose.connection.readyState;
  const stateLabels = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  if (readyState !== 1) {
    return res.status(503).json({
      status: "unhealthy",
      service: "LayoScan API",
      checks: {
        database: stateLabels[readyState] || "unknown",
      },
    });
  }

  try {
    await mongoose.connection.db.admin().ping();
    return res.json({
      status: "ok",
      service: "LayoScan API",
      checks: { database: "connected" },
    });
  } catch (_err) {
    return res.status(503).json({
      status: "unhealthy",
      service: "LayoScan API",
      checks: { database: "ping_failed" },
    });
  }
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/assistance", assistanceRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/upload", uploadRoutes);

// ── Catch-all & error handler (must be last) ──────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
