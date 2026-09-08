const mongoose = require('mongoose');

// ── Sub-schemas ───────────────────────────────────────────────────────────────
const selectedModifierSchema = new mongoose.Schema(
  {
    groupName:  { type: String },
    optionName: { type: String },
    priceDelta: { type: Number, default: 0 },
  },
  { _id: false }
);

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name:      { type: String, required: true }, // snapshot at time of order
    qty:       { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true },
    selectedModifiers: [selectedModifierSchema],
    subtotal:  { type: Number, required: true },
  },
  { _id: false }
);

// ── Main schema ───────────────────────────────────────────────────────────────
const orderSchema = new mongoose.Schema(
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

    // Client-generated UUID that groups items from the same ordering session
    sessionId: { type: String, required: true },
    guestName: { type: String, default: null },

    items: [orderItemSchema],

    status: {
      type: String,
      enum: ['placed', 'accepted', 'preparing', 'ready', 'served', 'cancelled'],
      default: 'placed',
    },

    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid'],
      default: 'unpaid',
    },

    // null until staff marks order as paid
    paymentMethod: {
      type: String,
      enum: ['cash', 'pos'],
      default: null,
    },

    totalAmount: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
