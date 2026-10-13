const mongoose = require('mongoose');

const meterEventSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    eventName: {
      type: String,
      required: true,
      index: true,
      enum: [
        'qr_scanned',
        'order_placed',
        'analytics_viewed',
        'analytics_accessed',
        'export_generated',
        'exports_accessed',
        'staff_added',
        'staff_accessed',
        'branch_added',
        'multi_branch_accessed',
        'kds_bumped',
        'table_created',
        'trial_started',
        'invoice_viewed',
        'payment_submitted',
        'plan_upgraded',
      ],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MeterEvent', meterEventSchema);
