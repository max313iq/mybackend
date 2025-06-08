const Store = require('../models/Store');
const Order = require('../models/Order');
const { createNotification } = require('../services/notificationService');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.createStore = catchAsync(async (req, res, next) => {
  req.body.owner = req.user.id;
  const newStore = await Store.create(req.body);

  // Update user role to store_owner
  req.user.role = 'store_owner';
  req.user.stores = req.user.stores || [];
  req.user.stores.push(newStore._id);
  await req.user.save({ validateBeforeSave: false });

  res.status(201).json({
    success: true,
    data: newStore,
    message: 'Store created successfully and pending approval'
  });
});

exports.getMyStores = catchAsync(async (req, res, next) => {
  const stores = await Store.find({ owner: req.user.id });
  const storeIds = stores.map(s => s._id);
  const stats = await Order.aggregate([
    { $match: { store: { $in: storeIds } } },
    { $group: { _id: '$store', totalSales: { $sum: '$finalTotal' },
                monthlyRevenue: { $sum: { $cond: [{ $gte: ['$createdAt', new Date(new Date().setDate(1))] }, '$finalTotal', 0] } },
                pendingOrders: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                completedOrders: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } } } }
  ]);
  const statMap = {};
  stats.forEach(s => { statMap[s._id.toString()] = s; });
  const data = stores.map(store => {
    const s = statMap[store._id.toString()] || {};
    return {
      ...store.toObject(),
      rating: store.ratingsAverage,
      totalSales: s.totalSales || 0,
      monthlyRevenue: s.monthlyRevenue || 0,
      pendingOrders: s.pendingOrders || 0,
      completedOrders: s.completedOrders || 0
    };
  });

  res.status(200).json({
    success: true,
    data
  });
});

exports.updateStore = catchAsync(async (req, res, next) => {
  const store = await Store.findById(req.params.storeId);
  if (!store) {
    return next(new AppError('No store found with that ID.', 404));
  }
  if (store.owner.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You do not own this store.', 403));
  }
  Object.assign(store, req.body);
  await store.save();

  res.status(200).json({
    success: true,
    data: store,
  });
});

exports.getStoreOrders = catchAsync(async (req, res, next) => {
    const store = await Store.findById(req.params.storeId);
    if (!store) {
        return next(new AppError('No store found with that ID.', 404));
    }
    if (store.owner.toString() !== req.user.id && req.user.role !== 'admin') {
        return next(new AppError('You do not own this store.', 403));
    }

    const query = { store: store._id };
    if (req.query.status) query.status = req.query.status;
    if (req.query.startDate || req.query.endDate) {
        query.createdAt = {};
        if (req.query.startDate) query.createdAt.$gte = new Date(req.query.startDate);
        if (req.query.endDate) query.createdAt.$lte = new Date(req.query.endDate);
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const orders = await Order.find(query)
        .populate('user', 'name email phone')
        .populate('orderItems.product', 'name images')
        .skip(skip)
        .limit(limit);
    const total = await Order.countDocuments(query);

    const formatted = orders.map(o => ({
        _id: o._id,
        orderNumber: o.orderNumber,
        customer: o.user,
        items: o.orderItems.map(i => ({
            product: i.product,
            quantity: i.quantity,
            price: i.price,
            total: i.price * i.quantity
        })),
        totalAmount: o.totalPrice,
        shippingCost: o.shippingCost,
        taxAmount: o.taxAmount,
        finalTotal: o.finalTotal,
        status: o.status,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        shippingAddress: o.shippingAddress,
        estimatedDelivery: o.estimatedDelivery,
        trackingNumber: o.trackingNumber,
        notes: o.notes,
        deliveryArea: o.deliveryArea,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt
    }));

    res.status(200).json({
        success: true,
        data: formatted,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    });
});

exports.updateStoreOrderStatus = catchAsync(async (req, res, next) => {
    const { orderId, storeId } = req.params;
    const { status, trackingNumber, estimatedDelivery, notes, deliveryCompany, actualDeliveryPrice } = req.body;

    const store = await Store.findById(storeId);
    if (!store) {
        return next(new AppError('No store found with that ID.', 404));
    }
    if (store.owner.toString() !== req.user.id && req.user.role !== 'admin') {
        return next(new AppError('You do not own this store.', 403));
    }

    const order = await Order.findById(orderId);
    if (!order) {
        return next(new AppError('No order found with that ID.', 404));
    }
    if (order.store.toString() !== store._id.toString()) {
        return next(new AppError('This order does not belong to your store.', 403));
    }

    if (status === 'shipped' && !trackingNumber) {
        return next(new AppError('Tracking number required when shipping.', 400));
    }

    order.status = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (estimatedDelivery) order.estimatedDelivery = estimatedDelivery;
    if (notes) order.notes = notes;
    if (deliveryCompany) order.deliveryCompany = deliveryCompany;
    if (actualDeliveryPrice) order.actualDeliveryPrice = actualDeliveryPrice;
    order.statusHistory.push({ status, timestamp: new Date(), note: notes });
    await order.save();

    await createNotification({
        recipient: order.user,
        type: 'order_status_update',
        title: 'تم تحديث حالة طلبك',
        message: `تم تحديث حالة طلبك رقم ${order.orderNumber}`,
        data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            newStatus: status,
            trackingNumber: order.trackingNumber,
            estimatedDelivery: order.estimatedDelivery
        },
        priority: 'high',
        actionUrl: `/orders/${order._id}`
    });

    res.status(200).json({
        success: true,
        data: {
            _id: order._id,
            status: order.status,
            trackingNumber: order.trackingNumber,
            estimatedDelivery: order.estimatedDelivery,
            updatedAt: order.updatedAt
        },
        message: 'Order status updated successfully. Customer notification sent.'
    });
});

exports.followStore = catchAsync(async (req, res, next) => {
    const store = await Store.findById(req.params.id);
    if (!store) {
        return next(new AppError('No store found with that ID', 404));
    }

    const isFollowing = store.followers.includes(req.user.id);

    if (isFollowing) {
        // Unfollow
        await Store.findByIdAndUpdate(
            req.params.id,
            { $pull: { followers: req.user.id }, $inc: { followersCount: -1 } }
        );
        res.status(200).json({ success: true, message: 'Successfully unfollowed the store.' });
    } else {
        // Follow
        await Store.findByIdAndUpdate(
            req.params.id,
            { $addToSet: { followers: req.user.id }, $inc: { followersCount: 1 } }
        );
        res.status(200).json({ success: true, message: 'Successfully followed the store.' });
    }
});

exports.getFeaturedStores = catchAsync(async (req, res, next) => {
    req.query.limit = req.query.limit || '5';
    req.query.sort = '-ratingsAverage'; // Example criteria for featured
    next();
});

exports.getTrendingStores = catchAsync(async (req, res, next) => {
    req.query.limit = req.query.limit || '5';
    req.query.sort = '-followers'; // Example criteria for trending
    next();
});


exports.getAllStores = factory.getAll(Store);
exports.getStore = catchAsync(async (req, res, next) => {
  const store = await Store.findById(req.params.storeId).populate('owner', 'name email');
  if (!store) {
    return next(new AppError('No store found with that ID.', 404));
  }
  const data = store.toObject();
  data.rating = store.ratingsAverage;
  if (!req.user || store.owner._id.toString() !== req.user.id) {
    delete data.owner;
    delete data.totalSales;
    delete data.monthlyRevenue;
    delete data.pendingOrders;
    delete data.completedOrders;
  } else {
    const totals = await Order.aggregate([
      { $match: { store: store._id } },
      { $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$finalTotal' } } }
    ]);
    data.totalSales = totals.reduce((sum, t) => sum + t.revenue, 0);
    data.pendingOrders = totals.find(t => t._id === 'pending')?.count || 0;
    data.completedOrders = totals.find(t => t._id === 'delivered')?.count || 0;
  }
  res.status(200).json({ success: true, data });
});

exports.deactivateStore = catchAsync(async (req, res, next) => {
  const store = await Store.findById(req.params.storeId);
  if (!store) {
    return next(new AppError('No store found with that ID.', 404));
  }
  if (store.owner.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You do not own this store.', 403));
  }
  store.isActive = false;
  await store.save();
  res.status(200).json({ success: true, message: 'Store deactivated successfully' });
});

// ----- Convenience helpers for "my-store" routes -----
exports.getCurrentUserStore = catchAsync(async (req, res, next) => {
  const store = await Store.findOne({ owner: req.user.id });
  if (!store) return next(new AppError('No store found for this user.', 404));
  req.params.storeId = store._id; // for consistency with existing handlers
  req.store = store;
  next();
});

exports.sendCurrentStore = (req, res) => {
  res.status(200).json({ success: true, data: req.store });
};

exports.updateCurrentUserStore = [
  exports.getCurrentUserStore,
  catchAsync(async (req, res, next) => {
    Object.assign(req.store, req.body);
    await req.store.save();
    res.status(200).json({ success: true, data: req.store });
  })
];

exports.getMyStoreOrders = [
  exports.getCurrentUserStore,
  exports.getStoreOrders
];

exports.updateMyStoreOrderStatus = [
  exports.getCurrentUserStore,
  (req, res, next) => exports.updateStoreOrderStatus(req, res, next)
];
