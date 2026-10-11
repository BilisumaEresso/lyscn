const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');

/**
 * GET /api/analytics
 *
 * Query params:
 *   from  — ISO date string (default: 30 days ago)
 *   to    — ISO date string (default: today end-of-day)
 *
 * Returns:
 *   summary        — totals for the period
 *   yesterday      — totals for the day before 'from' (for delta comparison)
 *   dailyRevenue   — array of { date, revenue, orders } for each day in range
 *   topProducts    — top 10 items by qty and revenue
 *   paymentMethods — breakdown by payment method
 *   ratings        — distribution + average
 *   staffPerf      — orders served / revenue per waiter
 */
const getAnalytics = async (req, res, next) => {
  try {
    const restaurantId = req.tenantId;
    const restaurant = await Restaurant.findById(restaurantId).select('paymentAccounts').lean();

    // ── Date range ────────────────────────────────────────────────────────────
    const toDate = req.query.to
      ? new Date(req.query.to)
      : new Date();
    toDate.setHours(23, 59, 59, 999);

    const fromDate = req.query.from
      ? new Date(req.query.from)
      : new Date(toDate.getTime() - 29 * 24 * 60 * 60 * 1000);
    fromDate.setHours(0, 0, 0, 0);

    // Yesterday window (for delta badge on dashboard)
    const yesterdayEnd = new Date(fromDate.getTime() - 1);
    yesterdayEnd.setHours(23, 59, 59, 999);
    const yesterdayStart = new Date(yesterdayEnd);
    yesterdayStart.setHours(0, 0, 0, 0);

    const baseMatch = {
      restaurantId,
      status: { $ne: 'cancelled' },
      createdAt: { $gte: fromDate, $lte: toDate },
    };

    // ── 1. Period summary ─────────────────────────────────────────────────────
    const [summaryAgg] = await Order.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: null,
          totalOrders:   { $sum: 1 },
          totalRevenue:  { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0] } },
          unpaidRevenue: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'unpaid'] }, '$totalAmount', 0] } },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
          },
          avgOrderValue: { $avg: '$totalAmount' },
          ratingCount:   { $sum: { $cond: [{ $gt: ['$rating', null] }, 1, 0] } },
          ratingSum:     { $sum: { $ifNull: ['$rating', 0] } },
        },
      },
    ]);

    const summary = summaryAgg || {
      totalOrders: 0, totalRevenue: 0, unpaidRevenue: 0,
      cancelledOrders: 0, avgOrderValue: 0, ratingCount: 0, ratingSum: 0,
    };

    // ── 2. Yesterday summary (for delta) ──────────────────────────────────────
    const [yestAgg] = await Order.aggregate([
      {
        $match: {
          restaurantId,
          status: { $ne: 'cancelled' },
          createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd },
        },
      },
      {
        $group: {
          _id: null,
          totalOrders:  { $sum: 1 },
          totalRevenue: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0] } },
        },
      },
    ]);

    const yesterday = yestAgg || { totalOrders: 0, totalRevenue: 0 };

    // ── 3. Daily revenue breakdown ────────────────────────────────────────────
    const dailyRevenue = await Order.aggregate([
      { $match: { ...baseMatch, paymentStatus: 'paid' } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          revenue: { $sum: '$totalAmount' },
          orders:  { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', revenue: 1, orders: 1 } },
    ]);

    // ── 4. Daily order count (all, not just paid) ─────────────────────────────
    const dailyOrders = await Order.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', orders: 1 } },
    ]);

    // Merge daily revenue + daily orders into a single array
    const revenueMap = Object.fromEntries(dailyRevenue.map((d) => [d.date, d.revenue]));
    const ordersMap  = Object.fromEntries(dailyOrders.map((d) => [d.date, d.orders]));
    const allDates   = [...new Set([...Object.keys(revenueMap), ...Object.keys(ordersMap)])].sort();
    const daily = allDates.map((date) => ({
      date,
      revenue: revenueMap[date] || 0,
      orders:  ordersMap[date]  || 0,
    }));

    // ── 5. Top products ───────────────────────────────────────────────────────
    const topProducts = await Order.aggregate([
      { $match: baseMatch },
      { $unwind: '$items' },
      {
        $group: {
          _id:     '$items.name',
          qty:     { $sum: '$items.qty' },
          revenue: { $sum: '$items.subtotal' },
          orders:  { $sum: 1 },
        },
      },
      { $sort: { qty: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, name: '$_id', qty: 1, revenue: 1, orders: 1 } },
    ]);

    // ── 6. Payment method breakdown ───────────────────────────────────────────
    const paymentMethods = await Order.aggregate([
      { $match: { ...baseMatch, paymentStatus: 'paid' } },
      {
        $group: {
          _id:     { $ifNull: ['$paymentMethod', 'unknown'] },
          count:   { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
        },
      },
      { $sort: { revenue: -1 } },
      { $project: { _id: 0, method: '$_id', count: 1, revenue: 1 } },
    ]);

    // ── 7. Ratings distribution ───────────────────────────────────────────────
    const ratingsAgg = await Order.aggregate([
      { $match: { ...baseMatch, rating: { $ne: null } } },
      {
        $group: {
          _id:   '$rating',
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, stars: '$_id', count: 1 } },
    ]);

    const avgRating = summary.ratingCount > 0
      ? Math.round((summary.ratingSum / summary.ratingCount) * 10) / 10
      : null;

    // ── 8. Staff performance (per waiter) ─────────────────────────────────────
    const staffPerf = await Order.aggregate([
      {
        $match: {
          ...baseMatch,
          assignedWaiterName: { $ne: null },
        },
      },
      {
        $group: {
          _id:        '$assignedWaiterName',
          ordersServed: { $sum: 1 },
          revenue:    { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0] } },
          avgRating:  { $avg: { $ifNull: ['$rating', null] } },
        },
      },
      { $sort: { ordersServed: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          name: '$_id',
          ordersServed: 1,
          revenue: 1,
          avgRating: { $round: ['$avgRating', 1] },
        },
      },
    ]);

    // ── 9. Hourly order distribution (peak hours) ─────────────────────────────
    const hourlyDist = await Order.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id:    { $hour: '$createdAt' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, hour: '$_id', orders: 1 } },
    ]);

    return res.json({
      success: true,
      period: {
        from: fromDate.toISOString().split('T')[0],
        to:   toDate.toISOString().split('T')[0],
      },
      summary: {
        totalOrders:    summary.totalOrders,
        totalRevenue:   Math.round(summary.totalRevenue   * 100) / 100,
        unpaidRevenue:  Math.round(summary.unpaidRevenue  * 100) / 100,
        cancelledOrders: summary.cancelledOrders,
        avgOrderValue:  Math.round((summary.avgOrderValue || 0) * 100) / 100,
        avgRating,
        ratingCount:    summary.ratingCount,
      },
      yesterday: {
        totalOrders:  yesterday.totalOrders,
        totalRevenue: Math.round(yesterday.totalRevenue * 100) / 100,
      },
      daily,
      topProducts,
      paymentMethods,
      paymentAccounts: restaurant?.paymentAccounts || null,
      ratings: ratingsAgg,
      staffPerf,
      hourlyDist,
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = { getAnalytics };
