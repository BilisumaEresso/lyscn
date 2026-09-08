const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    name:     { type: String, required: true, trim: true },
    address:  { type: String },
    currency: { type: String, default: 'USD' },
    timezone: { type: String, default: 'UTC' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Branch', branchSchema);
