const Store = require('../models/Store');
const Order = require('../models/Order');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.createStore = catchAsync(async (req, res, next) => {
  req.body.owner = req.user.id;
  const newStore = await Store.create(req.body);

  // Update user role to store-owner
  req.user.role = 'store-owner';
  req.user.store = newStore._id;
  await req.user.save({ validateBeforeSave: false });

  res.status(201).json({
    success: true,
    data: newStore,
  });
});

exports.getMyStore = catchAsync(async (req, res, next) => {
  const store = await Store.findOne({ owner: req.user.id });

  if (!store) {
    return next(new AppError('No store found for the current user.', 404));
  }

  res.status(200).json({
    success: true,
    data: store,
  });
});

exports.updateMyStore = catchAsync(async (req, res, next) => {
  const store = await Store.findOneAndUpdate({ owner: req.user.id }, req.body, {
    new: true,
    runValidators: true,
  });

  if (!store) {
    return next(new AppError('No store found for the current user to update.', 404));
  }

  res.status(200).json({
    success: true,
    data: store,
  });
});

exports.getMyStoreOrders = catchAsync(async (req, res, next) => {
    const store = await Store.findOne({ owner: req.user.id });
    if (!store) {
        return next(new AppError('You do not own a store.', 404));
    }

    const orders = await Order.find({ store: store._id });

    res.status(200).json({
        success: true,
        count: orders.length,
        data: orders,
    });
});

exports.updateMyStoreOrderStatus = catchAsync(async (req, res, next) => {
    const { orderId } = req.params;
    const { status } = req.body;

    const store = await Store.findOne({ owner: req.user.id });
    if (!store) {
        return next(new AppError('You do not own a store.', 403));
    }

    const order = await Order.findById(orderId);

    if (!order) {
        return next(new AppError('No order found with that ID.', 404));
    }

    if (order.store.toString() !== store._id.toString()) {
        return next(new AppError('This order does not belong to your store.', 403));
    }

    order.status = status;
    await order.save();

    res.status(200).json({
        success: true,
        data: order,
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
        await Store.findByIdAndUpdate(req.params.id, { $pull: { followers: req.user.id } });
        res.status(200).json({ success: true, message: 'Successfully unfollowed the store.' });
    } else {
        // Follow
        await Store.findByIdAndUpdate(req.params.id, { $addToSet: { followers: req.user.id } });
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
exports.getStore = factory.getOne(Store, { path: 'products' });
exports.deleteStore = factory.deleteOne(Store);