const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      unique: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ['starter', 'pro', 'enterprise'],
      default: 'pro',
    },
    status: {
      type: String,
      enum: ['trialing', 'active', 'past_due', 'read_only', 'canceled'],
      default: 'trialing',
      index: true,
    },
    trialEndsAt: {
      type: Date,
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day free trial
    },
    currentPeriodStart: {
      type: Date,
      default: Date.now,
    },
    currentPeriodEnd: {
      type: Date,
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
    gracePeriodEndsAt: {
      type: Date,
      default: () => new Date(Date.now() + (14 + 5) * 24 * 60 * 60 * 1000), // 5 days grace
    },
    branchCount: {
      type: Number,
      default: 1,
    },
    branchLimit: {
      type: Number,
      default: 5, // Pro trial allows up to 5 branches
    },
    priceETB: {
      type: Number,
      default: 1500,
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'annual'],
      default: 'monthly',
    },
    lastInvoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
    },
    contactPhone: {
      type: String,
      trim: true,
    },
    contactEmail: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// ── Status helper methods ─────────────────────────────────────────────────────

/**
 * Evaluates live subscription state against time windows.
 * Transitions dynamically:
 * - If trialing and trial expired: becomes past_due (grace period active) or read_only
 * - If active and period expired: becomes past_due or read_only
 */
subscriptionSchema.methods.evaluateStatus = function () {
  const now = new Date();

  if (this.status === 'canceled') {
    return 'canceled';
  }

  if (this.status === 'trialing') {
    if (this.trialEndsAt && now > this.trialEndsAt) {
      if (this.gracePeriodEndsAt && now <= this.gracePeriodEndsAt) {
        this.status = 'past_due';
      } else {
        this.status = 'read_only';
      }
    }
  } else if (this.status === 'active') {
    if (this.currentPeriodEnd && now > this.currentPeriodEnd) {
      if (this.gracePeriodEndsAt && now <= this.gracePeriodEndsAt) {
        this.status = 'past_due';
      } else {
        this.status = 'read_only';
      }
    }
  } else if (this.status === 'past_due') {
    if (this.gracePeriodEndsAt && now > this.gracePeriodEndsAt) {
      this.status = 'read_only';
    }
  }

  return this.status;
};

subscriptionSchema.methods.isTrialActive = function () {
  return this.status === 'trialing' && (!this.trialEndsAt || new Date() <= this.trialEndsAt);
};

subscriptionSchema.methods.isGracePeriodActive = function () {
  const now = new Date();
  return (
    this.status === 'past_due' &&
    this.gracePeriodEndsAt &&
    now <= this.gracePeriodEndsAt
  );
};

subscriptionSchema.methods.isReadOnly = function () {
  this.evaluateStatus();
  return this.status === 'read_only';
};

/**
 * Checks if the subscription permits access to a required plan tier and feature.
 */
subscriptionSchema.methods.hasFeatureAccess = function (requiredPlan = 'starter') {
  this.evaluateStatus();

  // If read_only, all Pro/mutating features are restricted
  if (this.status === 'read_only') {
    return false;
  }

  // Trialing accounts have full Pro access
  if (this.status === 'trialing' || this.isGracePeriodActive()) {
    return true;
  }

  const tierWeight = {
    starter: 1,
    pro: 2,
    enterprise: 3,
  };

  const currentWeight = tierWeight[this.plan] || 1;
  const requiredWeight = tierWeight[requiredPlan] || 1;

  return currentWeight >= requiredWeight;
};

module.exports = mongoose.model('Subscription', subscriptionSchema);
