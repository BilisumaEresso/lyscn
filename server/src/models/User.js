const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    // null is allowed temporarily before a restaurant is linked
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      index: true,
      default: null,
    },
    name:  { type: String, required: true, trim: true },
    email: {
      type: String,
      sparse: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      sparse: true,
      unique: true,
      trim: true,
    },

    // select: false — never returned in queries unless explicitly requested
    passwordHash: { type: String, required: true, select: false },

    role: {
      type: String,
      enum: ['owner', 'manager', 'coordinator', 'kitchen', 'waiter'],
      default: 'owner',
    },
    // Optional 4-digit quick shift PIN for floor and kitchen staff
    pinHash: { type: String, select: false, default: null },
    // Workstation specialization (useful for Kitchen vs Barista display)
    station: {
      type: String,
      enum: ['all', 'kitchen', 'bar'],
      default: 'all',
    },
    // Floor zone assignment for waiters
    assignedTables: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Table',
    }],
    isOnDuty: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Require at least one contact identifier (email or phone)
userSchema.pre('validate', function (next) {
  if (!this.email && !this.phone) {
    return next(new Error('User must have either an email or a phone number.'));
  }
  next();
});

// ── Pre-save hook: hash passwordHash and pinHash if modified ──────────────────
userSchema.pre('save', async function (next) {
  if (this.isModified('passwordHash') && this.passwordHash) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  }
  if (this.isModified('pinHash') && this.pinHash) {
    this.pinHash = await bcrypt.hash(this.pinHash, 10);
  }
  next();
});

// ── Instance method: compare plain-text password against stored hash ───────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// ── Instance method: compare plain-text 4-digit PIN against stored hash ────────
userSchema.methods.comparePin = async function (candidatePin) {
  if (!this.pinHash) return false;
  return bcrypt.compare(String(candidatePin), this.pinHash);
};

module.exports = mongoose.model('User', userSchema);
