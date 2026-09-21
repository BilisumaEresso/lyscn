const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const restaurantRoutes = require("./routes/restaurantRoutes");
const branchRoutes = require("./routes/branchRoutes");
const tableRoutes = require("./routes/tableRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const assistanceRoutes = require("./routes/assistanceRoutes");
const publicRoutes = require("./routes/publicRoutes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

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

const app = express();
app.set("trust proxy", 1);

app.use(
  cors({
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
    credentials: true,
  }),
);
app.use(express.json());

// ── Health check (unauthenticated) ────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "LayoScan API" });
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

// ── Catch-all & error handler (must be last) ──────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
