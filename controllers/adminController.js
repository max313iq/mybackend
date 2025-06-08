const User = require('../models/User');
const Store = require('../models/Store');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Review = require('../models/Review');
const { createNotification } = require('../services/notificationService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Helper to parse duration strings like '7d', '12h'
const parseDuration = (str) => {
  if (!str) return 0;
  const match = str.match(/(\d+)([dhm])/);
  if (!match) return 0;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  if (unit === 'd') return value * 24 * 60 * 60 * 1000;
  if (unit === 'h') return value * 60 * 60 * 1000;
  if (unit === 'm') return value * 60 * 1000;
  return 0;
};

// ----- DASHBOARD -----
exports.getDashboard = catchAsync(async (req, res, next) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

  const [
    totalUsers,
    totalCustomers,
    totalStoreOwners,
    totalStores,
    activeStores,
    pendingStores,
    totalProducts,
    activeProducts,
    totalOrders,
    todayOrders,
    totalRevenueAgg,
    monthlyRevenueAgg,
    flaggedReviews
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'customer' }),
    User.countDocuments({ role: 'store_owner' }),
    Store.countDocuments(),
    Store.countDocuments({ status: 'approved', isActive: true }),
    Store.countDocuments({ status: 'pending' }),
    Product.countDocuments(),
    Product.countDocuments({ isActive: true }),
    Order.countDocuments(),
    Order.countDocuments({ createdAt: { $gte: todayStart } }),
    Order.aggregate([{ $match: { status: 'delivered' } }, { $group: { _id: null, total: { $sum: '$finalTotal' } } }]),
    Order.aggregate([{ $match: { status: 'delivered', createdAt: { $gte: monthStart } } }, { $group: { _id: null, revenue: { $sum: '$finalTotal' } } }]),
    Review.countDocuments({ 'flagged.isFlagged': true })
  ]);

  const totalRevenue = totalRevenueAgg[0] ? totalRevenueAgg[0].total : 0;
  const monthlyRevenue = monthlyRevenueAgg[0] ? monthlyRevenueAgg[0].revenue : 0;

  const topPerformingStores = await Order.aggregate([
    { $match: { status: 'delivered' } },
    { $group: { _id: '$store', revenue: { $sum: '$finalTotal' }, orders: { $sum: 1 } } },
    { $sort: { revenue: -1 } },
    { $limit: 5 },
    { $lookup: { from: 'stores', localField: '_id', foreignField: '_id', as: 'store' } },
    { $unwind: '$store' },
    { $project: { storeId: '$store._id', name: '$store.name', revenue: 1, orders: 1 } }
  ]);

  const recentStores = await Store.find().sort('-createdAt').limit(5).populate('owner', 'name');
  const recentActivity = recentStores.map(s => ({
    type: 'new_store_registration',
    message: `New store '${s.name}' registered`,
    timestamp: s.createdAt.toISOString(),
    data: { storeId: s._id, ownerName: s.owner.name }
  }));

  res.status(200).json({
    success: true,
    data: {
      stats: {
        totalUsers,
        totalCustomers,
        totalStoreOwners,
        totalStores,
        activeStores,
        pendingStores,
        totalProducts,
        activeProducts,
        totalOrders,
        todayOrders,
        totalRevenue,
        monthlyRevenue,
        platformCommission: 0,
        flaggedReviews,
        supportTickets: 0
      },
      recentActivity,
      topPerformingStores
    }
  });
});

// ----- USER MANAGEMENT -----
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) {
    filter.$or = [
      { name: new RegExp(req.query.search, 'i') },
      { email: new RegExp(req.query.search, 'i') }
    ];
  }

  const users = await User.find(filter)
    .populate('stores', 'name status')
    .skip(skip)
    .limit(limit);
  const total = await User.countDocuments(filter);

  const orderStats = await Order.aggregate([
    { $match: { user: { $in: users.map(u => u._id) } } },
    { $group: { _id: '$user', totalOrders: { $sum: 1 }, totalSpent: { $sum: '$finalTotal' } } }
  ]);
  const orderMap = {};
  orderStats.forEach(o => { orderMap[o._id.toString()] = o; });

  const data = users.map(u => ({
    _id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    status: u.status,
    stores: u.stores.map(s => ({ _id: s._id, name: s.name, status: s.status })),
    totalOrders: orderMap[u._id.toString()]?.totalOrders || 0,
    totalSpent: orderMap[u._id.toString()]?.totalSpent || 0,
    lastLogin: u.lastLogin,
    joinedAt: u.createdAt
  }));

  res.status(200).json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

exports.updateUserStatus = catchAsync(async (req, res, next) => {
  const { status, reason, duration, notifyUser } = req.body;
  const update = { status };
  if (status === 'suspended') {
    update.suspendedUntil = new Date(Date.now() + parseDuration(duration));
    update.suspensionReason = reason;
    update.isActive = false;
  } else {
    update.suspendedUntil = undefined;
    update.suspensionReason = undefined;
    update.isActive = status === 'active';
  }

  const user = await User.findByIdAndUpdate(req.params.userId || req.params.id, update, { new: true });
  if (!user) return next(new AppError('No user found with that ID', 404));

  if (notifyUser) {
    await createNotification({
      recipient: user._id,
      type: 'account_status_update',
      title: 'تم تحديث حالة حسابك',
      message: reason || `Status changed to ${status}`,
      data: { status, duration },
      priority: 'medium'
    });
  }

  res.status(200).json({ success: true, data: { userId: user._id, status: user.status } });
});

exports.deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return next(new AppError('No user found with that ID', 404));
  res.status(204).json({ status: 'success', data: null });
});

// ----- STORE MANAGEMENT -----
exports.getPendingStores = catchAsync(async (req, res, next) => {
  const stores = await Store.find({ status: 'pending' }).populate('owner', 'name email phone');
  res.status(200).json({ success: true, data: stores });
});

exports.approveStore = catchAsync(async (req, res, next) => {
  const { welcomeMessage, setupInstructions } = req.body;
  const store = await Store.findByIdAndUpdate(
    req.params.storeId || req.params.id,
    { status: 'approved', isVerified: true, approvedAt: new Date() },
    { new: true }
  );
  if (!store) return next(new AppError('No store found with that ID', 404));

  await User.findByIdAndUpdate(store.owner, { role: 'store_owner', status: 'active', isActive: true });

  await createNotification({
    recipient: store.owner,
    type: 'store_approved',
    title: 'تم قبول متجرك',
    message: 'تهانينا! تم قبول متجرك ويمكنك الآن البدء بالبيع',
    data: {
      storeId: store._id,
      storeName: store.name,
      setupInstructions
    },
    priority: 'high'
  });

  res.status(200).json({
    success: true,
    data: { storeId: store._id, status: 'approved', approvedAt: store.approvedAt },
    message: 'Store approved successfully. Owner has been notified.'
  });
});

exports.rejectStore = catchAsync(async (req, res, next) => {
  const { reason, details, requiredDocuments, canReapply } = req.body;
  const store = await Store.findByIdAndUpdate(
    req.params.storeId || req.params.id,
    { status: 'rejected', rejectionReason: reason, reviewNotes: details },
    { new: true }
  );
  if (!store) return next(new AppError('No store found with that ID', 404));

  await createNotification({
    recipient: store.owner,
    type: 'store_rejected',
    title: 'تم رفض المتجر',
    message: reason,
    data: { storeId: store._id, details, requiredDocuments, canReapply },
    priority: 'medium'
  });

  res.status(200).json({ success: true, data: { storeId: store._id, status: 'rejected' } });
});

// ----- REVIEW MANAGEMENT -----
exports.getFlaggedReviews = catchAsync(async (req, res, next) => {
  const reviews = await Review.find({ 'flagged.isFlagged': true });
  res.status(200).json({ success: true, data: reviews });
});

exports.flagReview = catchAsync(async (req, res, next) => {
  const { reason } = req.body;
  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { 'flagged.isFlagged': true, 'flagged.reason': reason },
    { new: true }
  );

  if (!review) return next(new AppError('No review found with that ID', 404));

  res.status(200).json({ success: true, message: 'Review has been flagged for moderation.' });
});
