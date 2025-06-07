const User = require('../models/User');
const Store = require('../models/Store');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Review = require('../models/Review');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// --- STATS ---

exports.getOverviewStats = catchAsync(async (req, res, next) => {
    const userCount = await User.countDocuments();
    const storeCount = await Store.countDocuments();
    const orderCount = await Order.countDocuments();
    const productCount = await Product.countDocuments();

    res.status(200).json({
        success: true,
        data: {
            users: userCount,
            stores: storeCount,
            orders: orderCount,
            products: productCount
        }
    });
});

const getModelStats = (Model) => catchAsync(async (req, res, next) => {
    const total = await Model.countDocuments();
    // Example: Daily stats for the last 7 days
    const dailyStats = await Model.aggregate([
        {
            $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
        },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
        success: true,
        data: {
            total,
            dailyStats
        }
    });
});

exports.getUsersStats = getModelStats(User);
exports.getOrdersStats = getModelStats(Order);
exports.getProductsStats = getModelStats(Product);
exports.getStoresStats = getModelStats(Store);
exports.getReviewsStats = getModelStats(Review);

exports.getRevenueStats = catchAsync(async (req, res, next) => {
    const totalRevenue = await Order.aggregate([
        { $match: { status: 'delivered' } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);

    const monthlyRevenue = await Order.aggregate([
        { $match: { status: 'delivered' } },
        {
            $group: {
                _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                revenue: { $sum: '$totalPrice' }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.status(200).json({
        success: true,
        data: {
            totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
            monthlyRevenue
        }
    });
});


// --- USER MANAGEMENT ---
exports.getAllUsers = factory.getAll(User);
exports.updateUserStatus = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);


// --- STORE MANAGEMENT ---
exports.getPendingStores = factory.getAll(Store, { status: 'pending' });

exports.approveStore = catchAsync(async (req, res, next) => {
    const store = await Store.findByIdAndUpdate(req.params.id, { status: 'approved', isVerified: true }, { new: true });
    if (!store) {
        return next(new AppError('No store found with that ID', 404));
    }
    // Update the user's role to 'store-owner'
    await User.findByIdAndUpdate(store.owner, { role: 'store-owner' });
    res.status(200).json({ success: true, data: store });
});

exports.rejectStore = catchAsync(async (req, res, next) => {
    const { reason } = req.body;
    const store = await Store.findByIdAndUpdate(req.params.id, { status: 'rejected', rejectionReason: reason }, { new: true });
    if (!store) {
        return next(new AppError('No store found with that ID', 404));
    }
    res.status(200).json({ success: true, data: store });
});


// --- REVIEW MANAGEMENT ---
exports.getFlaggedReviews = factory.getAll(Review, { 'flagged.isFlagged': true });

exports.flagReview = catchAsync(async (req, res, next) => {
    const { reason } = req.body;
    const review = await Review.findByIdAndUpdate(
        req.params.id, // The review ID
        { 'flagged.isFlagged': true, 'flagged.reason': reason },
        { new: true }
    );

    if (!review) {
        return next(new AppError('No review found with that ID', 404));
    }

    res.status(200).json({ success: true, message: 'Review has been flagged for moderation.' });
});