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
    currency: { type: String, default: 'ETB' },
    timezone: { type: String, default: 'UTC' },
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      radiusMeters: { type: Number, default: 150 },
    },
    locationStrictMode: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Branch', branchSchema);
