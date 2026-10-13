const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    amountETB: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'ETB',
    },
    plan: {
      type: String,
      enum: ['starter', 'pro', 'enterprise'],
      default: 'pro',
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'past_due', 'void'],
      default: 'pending',
      index: true,
    },
    billingPeriodStart: {
      type: Date,
      required: true,
    },
    billingPeriodEnd: {
      type: Date,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    paidAt: {
      type: Date,
    },
    paymentMethod: {
      type: String,
      enum: ['telebirr', 'cbe_birr', 'awash_bank', 'manual', 'other'],
    },
    paymentReference: {
      type: String,
      trim: true,
    },
    paymentNotes: {
      type: String,
      trim: true,
    },
    remindersSent: [
      {
        channel: { type: String, enum: ['whatsapp', 'email', 'sms'] },
        sentAt: { type: Date, default: Date.now },
        recipient: { type: String },
      },
    ],
  },
  { timestamps: true }
);

// Auto-generate invoice number if not set
invoiceSchema.pre('validate', async function (next) {
  if (this.invoiceNumber) return next();

  const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  this.invoiceNumber = `INV-${yearMonth}-${randomSuffix}`;
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);
