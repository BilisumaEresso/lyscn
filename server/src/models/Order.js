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

const selectedSpecSchema = new mongoose.Schema(
  {
    specName:    { type: String },
    optionName:  { type: String },
    priceDelta:  { type: Number, default: 0 },
  },
  { _id: false }
);

const paymentRecordSchema = new mongoose.Schema(
  {
    paymentId:        { type: String, required: true },
    amount:           { type: Number, required: true, min: 0 },
    tipAmount:        { type: Number, default: 0, min: 0 },
    paymentMethod:    {
      type: String,
      enum: ['cash', 'pos', 'telebirr', 'cbebirr', 'awash', 'other'],
      required: true,
    },
    paymentReference: { type: String, default: null },
    collectedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    waiterId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    notes:            { type: String, default: '' },
    createdAt:        { type: Date, default: Date.now },
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
    name:           { type: String, required: true }, // snapshot at time of order
    portionName:    { type: String, default: 'Standard' },
    portionAmharic: { type: String, default: '' },
    serves:         { type: Number, default: 1 },
    qty:            { type: Number, required: true, min: 1 },
    unitPrice:      { type: Number, required: true },
    selectedModifiers: [selectedModifierSchema],
    selectedSpecs:     [selectedSpecSchema],
    quickTags:         [{ type: String, trim: true }],
    itemNotes:         { type: String, trim: true, default: '' },
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

    createdSource: {
      type: String,
      enum: ['customer_qr', 'waiter_pad', 'cashier_pos'],
      default: 'customer_qr',
    },

    // Client-generated UUID that groups items from the same ordering session
    sessionId: { type: String, required: true },
    // Session token associated with the table session when the order was placed
    sessionToken: { type: String, default: null, index: true },
    // Idempotency key per submission to guarantee safe retries / eliminate double-submit
    clientOrderId: { type: String, sparse: true, index: true },
    guestName: { type: String, default: null },

    items: [orderItemSchema],

    status: {
      type: String,
      enum: ['placed', 'accepted', 'preparing', 'ready', 'served', 'cancelled'],
      default: 'placed',
    },

    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partially_paid', 'paid'],
      default: 'unpaid',
    },

    // null until staff marks order as paid
    paymentMethod: {
      type: String,
      enum: ['cash', 'pos', 'telebirr', 'cbebirr', 'awash', 'other'],
      default: null,
    },

    // Multi-payment financial breakdown
    serviceChargeRate:   { type: Number, default: 0 },
    serviceChargeAmount: { type: Number, default: 0 },
    grossTotal:          { type: Number, default: 0 },
    totalPaid:           { type: Number, default: 0 },
    balanceDue:          { type: Number, default: 0 },
    totalTips:           { type: Number, default: 0 },
    payments:            [paymentRecordSchema],

    // Distributed workflow audit tracking
    acceptedBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    preparedBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    servedBy:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedWaiterId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    assignedWaiterName: { type: String, default: null },
    cancelReason:       { type: String, trim: true, default: null },

    totalAmount: { type: Number, required: true },

    // Optional customer feedback, submitted after the order is served.
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    feedback: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
  },
  { timestamps: true }
);

orderSchema.pre('save', function (next) {
  if (this.grossTotal == null || this.grossTotal === 0) {
    this.grossTotal = Math.round(((this.totalAmount || 0) + (this.serviceChargeAmount || 0)) * 100) / 100;
  }
  if (this.balanceDue == null || (this.balanceDue === 0 && this.paymentStatus !== 'paid' && (this.totalPaid || 0) === 0)) {
    this.balanceDue = Math.max(0, Math.round((this.grossTotal - (this.totalPaid || 0)) * 100) / 100);
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
