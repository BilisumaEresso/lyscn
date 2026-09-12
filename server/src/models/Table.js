const mongoose = require('mongoose');
const crypto = require('crypto');

const tableSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    label:    { type: String, required: true, trim: true },
    qrToken:  { type: String, unique: true, index: true },
    isActive: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['available', 'occupied'],
      default: 'available',
      index: true,
    },
    occupiedSince: { type: Date, default: null },
    activeSessionToken: { type: String, default: null, index: true },
    sessionExpiresAt: { type: Date, default: null },
    sessionLocationVerified: { type: Boolean, default: null },
  },
  { timestamps: true }
);

// ── Pre-save: auto-generate qrToken if not supplied ───────────────────────────
tableSchema.pre('save', function (next) {
  if (!this.qrToken) {
    this.qrToken = crypto.randomBytes(8).toString('hex');
  }
  next();
});

module.exports = mongoose.model('Table', tableSchema);
