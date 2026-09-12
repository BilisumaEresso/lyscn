const express = require('express');
const cors    = require('cors');

// ── Route imports ─────────────────────────────────────────────────────────────
const authRoutes       = require('./routes/authRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const branchRoutes     = require('./routes/branchRoutes');
const tableRoutes      = require('./routes/tableRoutes');
const categoryRoutes   = require('./routes/categoryRoutes');
const productRoutes    = require('./routes/productRoutes');
const orderRoutes      = require('./routes/orderRoutes');
const assistanceRoutes = require('./routes/assistanceRoutes');
const publicRoutes     = require('./routes/publicRoutes');

// ── Error handling middleware ─────────────────────────────────────────────────
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// ── Global middleware ─────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Health check (unauthenticated) ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'LayoScan API' });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/branches',    branchRoutes);
app.use('/api/tables',      tableRoutes);
app.use('/api/categories',  categoryRoutes);
app.use('/api/products',    productRoutes);
app.use('/api/orders',      orderRoutes);
app.use('/api/assistance',  assistanceRoutes);
app.use('/api/public',      publicRoutes);

// ── Catch-all & error handler (must be last) ──────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
