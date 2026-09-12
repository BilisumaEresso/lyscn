const mongoose = require('mongoose');

const assistanceSchema = new mongoose.Schema(
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
    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Table',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['call_staff', 'request_bill'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'acknowledged', 'resolved'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Assistance', assistanceSchema);
