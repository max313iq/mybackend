const Store = require('../models/Store');
const Order = require('../models/Order');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

// --- الدوال الخاصة بصاحب المتجر ---

exports.createStore = catchAsync(async (req, res, next) => {
    // 1) Check if user already has a store
    const existingStore = await Store.findOne({ owner: req.user.id });
    if (existingStore) {
        return next(new AppError('You already own a store. You cannot create another one.', 400));
    }

    // 2) Create new store
    const newStore = await Store.create({ ...req.body, owner: req.user.id });

    // 3) Update user's store field
    req.user.store = newStore._id;
    await req.user.save({ validateBeforeSave: false });

    res.status(201).json({
        status: 'success',
        data: {
            store: newStore,
        },
    });
});

exports.getMyStore = catchAsync(async (req, res, next) => {
    const store = await Store.findOne({ owner: req.user.id }).populate('products');
    if (!store) {
        return next(new AppError('You do not have a store yet.', 404));
    }
    res.status(200).json({ status: 'success', data: { store } });
});

exports.updateMyStore = factory.updateOne(Store); // Owners can update their own store


// --- دوال إدارة الطلبات الخاصة بالمتجر ---

exports.getMyStoreOrders = catchAsync(async (req, res, next) => {
    const storeId = req.user.store;
    if (!storeId) {
        return next(new AppError('You do not own a store.', 400));
    }
    const orders = await Order.find({ 'orderItems.store': storeId }).populate('user', 'name email');
    res.status(200).json({
        status: 'success',
        results: orders.length,
        data: {
            orders
        }
    });
});

exports.updateStoreOrderStatus = catchAsync(async (req, res, next) => {
    const { status } = req.body;
    const orderId = req.params.id;
    const storeId = req.user.store;

    const order = await Order.findById(orderId);
    if (!order) {
        return next(new AppError('No order found with that ID', 404));
    }

    const isStoreOrder = order.orderItems.some(item => item.store.toString() === storeId.toString());
    if (!isStoreOrder) {
        return next(new AppError('You are not authorized to update this order.', 403));
    }

    order.status = status;
    await order.save();

    res.status(200).json({
        status: 'success',
        data: {
            order
        }
    });
});


// --- الدوال العامة والخاصة بالمدير ---

exports.getAllStores = factory.getAll(Store);
exports.getStore = factory.getOne(Store, { path: 'products ratings' });
exports.updateStore = factory.updateOne(Store); // Admin only
exports.deleteStore = factory.deleteOne(Store); // Admin only