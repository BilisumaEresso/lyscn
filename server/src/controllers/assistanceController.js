const Assistance = require('../models/Assistance');
const Table = require('../models/Table');

const ACTIVE_STATUSES = ['pending', 'acknowledged'];

const populateAssistance = (query) =>
  query.populate('tableId', 'label').populate('branchId', 'name');

// POST /api/assistance/public
const requestAssistance = async (req, res, next) => {
  try {
    const { tableId, restaurantId, branchId, type } = req.body;

    if (!tableId || !restaurantId || !branchId || !type) {
      return res.status(400).json({
        success: false,
        message: 'tableId, restaurantId, branchId, and type are required.',
      });
    }

    if (!['call_staff', 'request_bill'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid assistance type.' });
    }

    const table = await Table.findOne({ _id: tableId, restaurantId, branchId, isActive: true });
    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found or inactive.' });
    }

    const existing = await Assistance.findOne({
      tableId,
      status: { $in: ACTIVE_STATUSES },
      type,
    });
    if (existing) {
      const populated = await populateAssistance(Assistance.findById(existing._id));
      return res.status(200).json({ success: true, assistance: populated, alreadyRequested: true });
    }

    const assistance = await Assistance.create({
      restaurantId,
      branchId,
      tableId,
      type,
    });
    const populated = await populateAssistance(Assistance.findById(assistance._id));
    const io = req.app.get('io');
    if (io) io.to(`restaurant:${restaurantId}`).emit('assistance:created', populated);

    return res.status(201).json({ success: true, assistance: populated });
  } catch (err) {
    return next(err);
  }
};

// GET /api/assistance — protected staff route
const listAssistance = async (req, res, next) => {
  try {
    const filter = { restaurantId: req.tenantId, status: { $in: ACTIVE_STATUSES } };
    if (req.query.status) filter.status = req.query.status;
    const assistance = await populateAssistance(
      Assistance.find(filter).sort({ createdAt: -1 })
    );
    return res.json({ success: true, assistance });
  } catch (err) {
    return next(err);
  }
};

const setAssistanceStatus = (status) => async (req, res, next) => {
  try {
    const assistance = await populateAssistance(
      Assistance.findOneAndUpdate(
        { _id: req.params.id, restaurantId: req.tenantId },
        { status },
        { new: true, runValidators: true }
      )
    );
    if (!assistance) {
      return res.status(404).json({ success: false, message: 'Assistance request not found.' });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`restaurant:${assistance.restaurantId}`).emit('assistance:updated', assistance);
    }
    return res.json({ success: true, assistance });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  requestAssistance,
  createAssistance: requestAssistance,
  listAssistance,
  acknowledgeAssistance: setAssistanceStatus('acknowledged'),
  resolveAssistance: setAssistanceStatus('resolved'),
};
