const MeterEvent = require('../models/MeterEvent');
const logger = require('../config/logger');

/**
 * Fire-and-forget telemetry event tracking for conversion catalysts.
 * Won't throw or block request processing if tracking fails.
 */
const trackMetric = async (restaurantId, eventName, metadata = {}, userId = null) => {
  if (!restaurantId || !eventName) return;

  try {
    await MeterEvent.create({
      restaurantId,
      eventName,
      userId: userId || undefined,
      metadata,
      timestamp: new Date(),
    });
  } catch (err) {
    logger.warn({ err: err.message, eventName, restaurantId }, 'Failed to record meter event');
  }
};

/**
 * Aggregates feature usage counts to show which features drive value/conversion.
 */
const getFeatureUsageStats = async (restaurantId) => {
  try {
    const stats = await MeterEvent.aggregate([
      { $match: { restaurantId } },
      {
        $group: {
          _id: '$eventName',
          count: { $sum: 1 },
          lastUsedAt: { $max: '$timestamp' },
        },
      },
    ]);

    return stats.reduce((acc, curr) => {
      acc[curr._id] = { count: curr.count, lastUsedAt: curr.lastUsedAt };
      return acc;
    }, {});
  } catch (err) {
    logger.warn({ err: err.message, restaurantId }, 'Failed to query feature usage stats');
    return {};
  }
};

module.exports = {
  trackMetric,
  getFeatureUsageStats,
};
