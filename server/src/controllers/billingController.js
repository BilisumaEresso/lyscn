const Subscription = require('../models/Subscription');
const Invoice = require('../models/Invoice');
const Plan = require('../models/Plan');
const Restaurant = require('../models/Restaurant');
const { trackMetric, getFeatureUsageStats } = require('../services/metering');
const logger = require('../config/logger');

// ── GET /api/billing/subscription ─────────────────────────────────────────────
const getSubscription = async (req, res, next) => {
  try {
    const restaurantId = req.tenantId || req.user.restaurantId;

    let sub = await Subscription.findOne({ restaurantId });
    if (!sub) {
      sub = await Subscription.create({
        restaurantId,
        plan: 'pro',
        status: 'trialing',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        gracePeriodEndsAt: new Date(Date.now() + 19 * 24 * 60 * 60 * 1000),
        branchLimit: 5,
        priceETB: 1500,
      });
    }

    // Evaluate live dynamic status
    const prevStatus = sub.status;
    sub.evaluateStatus();
    if (sub.status !== prevStatus) {
      await sub.save();
    }

    const now = Date.now();
    let daysRemaining = 0;
    if (sub.status === 'trialing' && sub.trialEndsAt) {
      daysRemaining = Math.max(0, Math.ceil((new Date(sub.trialEndsAt) - now) / (1000 * 60 * 60 * 24)));
    } else if (sub.status === 'active' && sub.currentPeriodEnd) {
      daysRemaining = Math.max(0, Math.ceil((new Date(sub.currentPeriodEnd) - now) / (1000 * 60 * 60 * 24)));
    }

    let graceDaysRemaining = 0;
    if (sub.status === 'past_due' && sub.gracePeriodEndsAt) {
      graceDaysRemaining = Math.max(0, Math.ceil((new Date(sub.gracePeriodEndsAt) - now) / (1000 * 60 * 60 * 24)));
    }

    // Fetch feature usage telemetry for this restaurant
    const usageMetrics = await getFeatureUsageStats(restaurantId);

    // Track invoice viewed / billing viewed
    trackMetric(restaurantId, 'invoice_viewed', {}, req.user?._id);

    return res.json({
      success: true,
      subscription: sub,
      plans: Plan.DEFAULT_PLANS,
      daysRemaining,
      graceDaysRemaining,
      isTrialActive: sub.isTrialActive(),
      isGracePeriodActive: sub.isGracePeriodActive(),
      isReadOnly: sub.isReadOnly(),
      usageMetrics,
    });
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to fetch subscription');
    return next(err);
  }
};

// ── GET /api/billing/invoices ──────────────────────────────────────────────────
const listInvoices = async (req, res, next) => {
  try {
    const restaurantId = req.tenantId || req.user.restaurantId;

    let invoices = await Invoice.find({ restaurantId }).sort({ createdAt: -1 });

    // If no invoice exists, generate an initial pending invoice for Pro plan
    if (invoices.length === 0) {
      const sub = await Subscription.findOne({ restaurantId });
      const now = new Date();
      const dueDate = sub?.trialEndsAt || new Date(now.getTime() + 14 * 86400000);

      const newInvoice = await Invoice.create({
        restaurantId,
        subscriptionId: sub?._id,
        amountETB: sub?.priceETB || 1500,
        currency: 'ETB',
        plan: sub?.plan || 'pro',
        status: 'pending',
        billingPeriodStart: now,
        billingPeriodEnd: new Date(now.getTime() + 30 * 86400000),
        dueDate,
      });
      invoices = [newInvoice];
    }

    return res.json({
      success: true,
      count: invoices.length,
      invoices,
    });
  } catch (err) {
    return next(err);
  }
};

// ── POST /api/billing/invoices/:id/pay ─────────────────────────────────────────
// Submits confirmation of payment in ETB (via Telebirr, CBE Birr, or Bank Transfer)
const payInvoice = async (req, res, next) => {
  try {
    const restaurantId = req.tenantId || req.user.restaurantId;
    const { id } = req.params;
    const { paymentMethod = 'telebirr', paymentReference, paymentNotes } = req.body;

    if (!paymentReference) {
      return res.status(400).json({
        success: false,
        message: 'A payment transaction reference number (e.g. Telebirr ID or CBE Ref) is required.',
      });
    }

    const invoice = await Invoice.findOne({ _id: id, restaurantId });
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found.',
      });
    }

    invoice.status = 'paid';
    invoice.paidAt = new Date();
    invoice.paymentMethod = paymentMethod;
    invoice.paymentReference = paymentReference.trim();
    if (paymentNotes) invoice.paymentNotes = paymentNotes.trim();
    await invoice.save();

    // Extend or activate subscription for 30 days + 5 days grace
    let sub = await Subscription.findOne({ restaurantId });
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 86400000);
    const graceEnd = new Date(periodEnd.getTime() + 5 * 86400000);

    if (sub) {
      sub.status = 'active';
      sub.currentPeriodStart = now;
      sub.currentPeriodEnd = periodEnd;
      sub.gracePeriodEndsAt = graceEnd;
      sub.lastInvoiceId = invoice._id;
      await sub.save();
    }

    // Telemetry event for conversion
    trackMetric(
      restaurantId,
      'payment_submitted',
      {
        amountETB: invoice.amountETB,
        paymentMethod,
        invoiceNumber: invoice.invoiceNumber,
      },
      req.user?._id
    );

    return res.json({
      success: true,
      message: 'Payment recorded and subscription activated successfully!',
      invoice,
      subscription: sub,
    });
  } catch (err) {
    return next(err);
  }
};

// ── POST /api/billing/plan ────────────────────────────────────────────────────
// Switch or upgrade plan (e.g. Starter -> Pro or Pro -> Starter)
const updatePlan = async (req, res, next) => {
  try {
    const restaurantId = req.tenantId || req.user.restaurantId;
    const { plan } = req.body;

    if (!['starter', 'pro', 'enterprise'].includes(plan)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan. Must be starter, pro, or enterprise.',
      });
    }

    let sub = await Subscription.findOne({ restaurantId });
    if (!sub) {
      sub = await Subscription.create({ restaurantId, plan });
    } else {
      sub.plan = plan;
      if (plan === 'starter') {
        sub.priceETB = 0;
        sub.branchLimit = 1;
      } else if (plan === 'pro') {
        sub.priceETB = 1500;
        sub.branchLimit = 5;
      } else {
        sub.priceETB = 4500;
        sub.branchLimit = 999;
      }
      await sub.save();
    }

    trackMetric(restaurantId, 'plan_upgraded', { targetPlan: plan }, req.user?._id);

    return res.json({
      success: true,
      message: `Plan updated to ${plan.toUpperCase()} successfully.`,
      subscription: sub,
    });
  } catch (err) {
    return next(err);
  }
};

// ── POST /api/billing/reminder ────────────────────────────────────────────────
// Triggers / dispatches out-of-band WhatsApp/Email reminders for pending invoices
const sendReminder = async (req, res, next) => {
  try {
    const restaurantId = req.tenantId || req.user.restaurantId;
    const { invoiceId, channel = 'whatsapp' } = req.body;

    const invoice = await Invoice.findOne({ _id: invoiceId, restaurantId });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    const sub = await Subscription.findOne({ restaurantId });

    const ownerPhone = sub?.contactPhone || restaurant?.contactInfo?.phone || '';
    const cleanPhone = ownerPhone.replace(/[^\d+]/g, '');

    const reminderText = `Hello from LayoScan! Your invoice ${invoice.invoiceNumber} for ${invoice.amountETB} ETB is pending. Settle via Telebirr or CBE Birr to keep live analytics and multi-branch features active. Thank you!`;

    // WhatsApp Click-to-Chat deep link
    const whatsappLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(reminderText)}`;

    invoice.remindersSent.push({
      channel,
      sentAt: new Date(),
      recipient: cleanPhone || restaurant?.contactInfo?.email || 'owner',
    });
    await invoice.save();

    return res.json({
      success: true,
      channel,
      recipient: cleanPhone || 'owner',
      message: reminderText,
      whatsappLink,
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getSubscription,
  listInvoices,
  payInvoice,
  updatePlan,
  sendReminder,
};
