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
      enum: ['owner', 'manager', 'kitchen', 'waiter'],
      default: 'owner',
    },
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

// ── Pre-save hook: hash passwordHash if it was modified ───────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

// ── Instance method: compare plain-text password against stored hash ───────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
