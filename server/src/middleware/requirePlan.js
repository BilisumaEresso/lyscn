const Subscription = require('../models/Subscription');
const { trackMetric } = require('../services/metering');
const logger = require('../config/logger');

/**
 * Feature-flag and plan-gating middleware.
 *
 * Rules:
 * 1. Grace Period: If status is 'past_due' within grace period, NEVER hard-lock mid-shift!
 *    Attaches warning headers and proceeds.
 * 2. Read-Only Lockout: If past grace period (status is 'read_only'), mutations to
 *    configuration/staff/branches are rejected with 402 Payment Required.
 * 3. Plan Gating: If requiredPlan is 'pro' and account is 'starter' (and not in active trial),
 *    returns 403 with UPGRADE_REQUIRED.
 * 4. Multi-Branch Limit: Enforces branchLimit on new branch creation.
 *
 * @param {string} requiredPlan - 'starter' | 'pro' | 'enterprise'
 * @param {string|null} featureKey - 'analytics' | 'multi_branch' | 'staff' | 'exports'
 */
const requirePlan = (requiredPlan = 'pro', featureKey = null) => {
  return async (req, res, next) => {
    try {
      const restaurantId = req.user?.restaurantId || req.restaurant?._id;

      if (!restaurantId) {
        return res.status(401).json({
          success: false,
          message: 'Restaurant context required for plan verification.',
        });
      }

      // 1. Fetch or auto-provision subscription (backward compatibility)
      let sub = await Subscription.findOne({ restaurantId });
      if (!sub) {
        sub = await Subscription.create({
          restaurantId,
          plan: 'pro',
          status: 'trialing',
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          gracePeriodEndsAt: new Date(Date.now() + 19 * 24 * 60 * 60 * 1000),
          branchLimit: 5,
        });
      }

      // 2. Evaluate dynamic status transition based on dates
      const previousStatus = sub.status;
      sub.evaluateStatus();
      if (sub.status !== previousStatus) {
        await sub.save();
      }

      req.subscription = sub;

      // 3. Grace Period Check — NEVER hard-lock service mid-shift
      if (sub.isGracePeriodActive()) {
        res.setHeader('X-Subscription-Warning', 'grace_period');
        res.setHeader(
          'X-Grace-Period-Ends-At',
          sub.gracePeriodEndsAt ? sub.gracePeriodEndsAt.toISOString() : ''
        );
        req.subscriptionGracePeriod = true;
        // Proceed with service during grace period!
        return next();
      }

      // 4. Read-Only Enforcement — only after grace period expires
      if (sub.isReadOnly()) {
        // Block mutating calls (POST, PATCH, PUT, DELETE) on configuration
        const isMutation = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method);
        if (isMutation) {
          return res.status(402).json({
            success: false,
            code: 'SUBSCRIPTION_READ_ONLY',
            message:
              'Account is currently in read-only mode due to an unpaid invoice. Settle your ETB invoice to resume modifications.',
            subscription: {
              plan: sub.plan,
              status: sub.status,
              priceETB: sub.priceETB,
            },
          });
        }
      }

      // 5. Multi-Branch Count Enforcement (when creating a branch)
      if (featureKey === 'multi_branch' && req.method === 'POST') {
        const Branch = require('../models/Branch');
        const count = await Branch.countDocuments({ restaurantId });
        if (count >= sub.branchLimit) {
          return res.status(403).json({
            success: false,
            code: 'BRANCH_LIMIT_REACHED',
            currentCount: count,
            branchLimit: sub.branchLimit,
            requiredPlan: 'enterprise',
            message: `You have reached the maximum of ${sub.branchLimit} branches allowed on your ${sub.plan.toUpperCase()} plan. Upgrade to add more locations.`,
          });
        }
      }

      // 6. Tier Access Check
      if (!sub.hasFeatureAccess(requiredPlan)) {
        return res.status(403).json({
          success: false,
          code: 'UPGRADE_REQUIRED',
          requiredPlan,
          currentPlan: sub.plan,
          message: `The "${featureKey || requiredPlan}" feature requires the ${requiredPlan.toUpperCase()} plan.`,
        });
      }

      // 7. Track telemetry metric
      if (featureKey) {
        trackMetric(
          restaurantId,
          `${featureKey}_accessed`,
          { method: req.method, path: req.originalUrl },
          req.user?._id
        );
      }

      next();
    } catch (err) {
      logger.error({ err: err.message }, 'Error in requirePlan middleware');
      next(err);
    }
  };
};

module.exports = { requirePlan };
