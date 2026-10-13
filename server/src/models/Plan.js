const mongoose = require('mongoose');

const planSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      enum: ['starter', 'pro', 'enterprise'],
    },
    name: { type: String, required: true },
    description: { type: String },
    priceETB: { type: Number, required: true, default: 0 },
    billingCycle: {
      type: String,
      enum: ['monthly', 'annual'],
      default: 'monthly',
    },
    branchLimit: { type: Number, default: 1 },
    tableLimit: { type: Number, default: 15 },
    features: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Predefined default tiers
planSchema.statics.DEFAULT_PLANS = [
  {
    key: 'starter',
    name: 'Starter (Free Core)',
    description: 'Keep selling offline & online with 1 branch and essential QR ordering.',
    priceETB: 0,
    branchLimit: 1,
    tableLimit: 15,
    features: ['core_ordering', 'single_branch', 'offline_queue', 'kds', 'basic_menu'],
  },
  {
    key: 'pro',
    name: 'Pro',
    description: 'Full analytics, multi-branch management, staff RBAC, and data exports.',
    priceETB: 500,
    branchLimit: 5,
    tableLimit: 100,
    features: [
      'core_ordering',
      'offline_queue',
      'kds',
      'basic_menu',
      'analytics',
      'multi_branch',
      'staff_management',
      'csv_exports',
      'unlimited_tables',
      'priority_support',
    ],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    description: 'Custom chains, dedicated SLAs, and unlimited branches.',
    priceETB: 2000,
    branchLimit: 999,
    tableLimit: 999,
    features: [
      'core_ordering',
      'offline_queue',
      'kds',
      'basic_menu',
      'analytics',
      'multi_branch',
      'staff_management',
      'csv_exports',
      'unlimited_tables',
      'custom_integrations',
      'dedicated_account_manager',
    ],
  },
];

module.exports = mongoose.model('Plan', planSchema);
