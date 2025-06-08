const Product = require('../models/Product');
const Store = require('../models/Store');
const User = require('../models/User');
const Order = require('../models/Order');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const mongoose = require('mongoose');

exports.getPublicStats = catchAsync(async (req, res, next) => {
    const productCount = await Product.countDocuments();
    const storeCount = await Store.countDocuments({ status: 'approved' });
    const userCount = await User.countDocuments();

    res.status(200).json({
        success: true,
        data: {
            products: productCount,
            stores: storeCount,
            users: userCount,
        }
    });
});

exports.getCategoriesStats = catchAsync(async (req, res, next) => {
    const productStats = await Product.aggregate([
        { $group: { _id: '$category', productsCount: { $sum: 1 } } },
        { $sort: { productsCount: -1 } }
    ]);

    const storeStats = await Store.aggregate([
        { $group: { _id: '$category', storesCount: { $sum: 1 } } },
        { $sort: { storesCount: -1 } }
    ]);

    res.status(200).json({
        success: true,
        data: {
            products: productStats,
            stores: storeStats
        }
    });
});

exports.getPopularProducts = catchAsync(async (req, res, next) => {
    const limit = req.query.limit * 1 || 10;
    const products = await Product.find().sort({ ratingsAverage: -1, ratingsQuantity: -1 }).limit(limit);
    res.status(200).json({
        success: true,
        data: products
    });
});

exports.getTopRated = catchAsync(async (req, res, next) => {
    const { type } = req.query;
    const limit = req.query.limit * 1 || 5;
    let results;

    if (type === 'stores') {
        results = await Store.find({ status: 'approved' }).sort({ ratingsAverage: -1 }).limit(limit);
    } else { // default to products
        results = await Product.find().sort({ ratingsAverage: -1 }).limit(limit);
    }

    res.status(200).json({
        success: true,
        data: results
    });
});

// Helper to calculate date range based on period
const getDateRange = (period, startDate, endDate) => {
    const now = new Date();
    let start = new Date(0);
    let end = now;
    if (period === 'today') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'week') {
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'year') {
        start = new Date(now.getFullYear(), 0, 1);
    } else if (period === 'custom') {
        if (!startDate || !endDate) {
            throw new Error('startDate and endDate are required for custom period');
        }
        start = new Date(startDate);
        end = new Date(endDate);
    }
    return { start, end };
};

exports.getStoreAnalytics = catchAsync(async (req, res, next) => {
    const { storeId } = req.params;
    const { period = 'today', startDate, endDate } = req.query;

    const store = await Store.findById(storeId);
    if (!store) return next(new AppError('No store found with that ID.', 404));
    if (store.owner.toString() !== req.user.id && req.user.role !== 'admin') {
        return next(new AppError('You do not own this store.', 403));
    }

    let range;
    try {
        range = getDateRange(period, startDate, endDate);
    } catch (err) {
        return next(new AppError(err.message, 400));
    }

    const orderFilter = { store: store._id, createdAt: { $gte: range.start, $lte: range.end } };
    const orders = await Order.find(orderFilter);
    const totalRevenue = orders.reduce((sum, o) => sum + (o.finalTotal || 0), 0);
    const totalOrders = orders.length;
    const totalProducts = await Product.countDocuments({ store: store._id });
    const averageOrderValue = totalOrders ? totalRevenue / totalOrders : 0;
    const returns = orders.filter(o => ['returned', 'cancelled'].includes(o.status)).length;
    const returnRate = totalOrders ? (returns / totalOrders) * 100 : 0;

    const customers = {};
    orders.forEach(o => { customers[o.user] = (customers[o.user] || 0) + 1; });
    const uniqueCustomers = Object.keys(customers).length;
    const repeatCustomers = Object.values(customers).filter(c => c > 1).length;
    const repeatCustomerRate = uniqueCustomers ? (repeatCustomers / uniqueCustomers) * 100 : 0;

    const overview = {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalOrders,
        totalProducts,
        averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
        conversionRate: 0,
        returnRate: parseFloat(returnRate.toFixed(1)),
        customerSatisfaction: store.ratingsAverage || 0,
        repeatCustomerRate: parseFloat(repeatCustomerRate.toFixed(1))
    };

    const chartAgg = await Order.aggregate([
        { $match: { store: mongoose.Types.ObjectId(storeId), createdAt: { $gte: range.start, $lte: range.end } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$finalTotal' }, orders: { $sum: 1 } } },
        { $sort: { _id: 1 } }
    ]);
    const revenueChart = chartAgg.map(c => ({
        date: c._id,
        revenue: c.revenue,
        orders: c.orders,
        newCustomers: c.orders,
        returningCustomers: 0
    }));

    const topAgg = await Order.aggregate([
        { $match: { store: mongoose.Types.ObjectId(storeId), createdAt: { $gte: range.start, $lte: range.end } } },
        { $unwind: '$orderItems' },
        { $group: { _id: '$orderItems.product', revenue: { $sum: { $multiply: ['$orderItems.price', '$orderItems.quantity'] } }, orders: { $sum: '$orderItems.quantity' } } },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
        { $unwind: '$product' },
        { $project: { _id: '$product._id', name: '$product.name', revenue: 1, orders: 1, views: '$product.views', conversionRate: { $literal: 0 }, profit: { $subtract: ['$revenue', { $multiply: ['$revenue', 0.67] }] } } }
    ]);

    const statusAgg = await Order.aggregate([
        { $match: { store: mongoose.Types.ObjectId(storeId), createdAt: { $gte: range.start, $lte: range.end } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const orderStatusDistribution = { pending: 0, confirmed: 0, preparing: 0, shipped: 0, delivered: 0, cancelled: 0, returned: 0 };
    statusAgg.forEach(s => { orderStatusDistribution[s._id] = s.count; });

    const deliveredOrders = orders.filter(o => o.status === 'delivered');
    const onTime = deliveredOrders.filter(o => o.actualDelivery && o.estimatedDelivery && o.actualDelivery <= o.estimatedDelivery).length;
    const onTimeDeliveries = deliveredOrders.length ? (onTime / deliveredOrders.length) * 100 : 0;
    const averageDeliveryTime = deliveredOrders.length ? deliveredOrders.reduce((sum, o) => sum + ((o.actualDelivery || o.deliveredAt || o.createdAt) - o.createdAt) / (1000*60*60*24), 0) / deliveredOrders.length : 0;
    const deliveryIssues = orders.filter(o => ['cancelled','returned'].includes(o.status)).length;
    const deliveryPerformance = {
        onTimeDeliveries: parseFloat(onTimeDeliveries.toFixed(1)),
        averageDeliveryTime: parseFloat(averageDeliveryTime.toFixed(1)),
        deliveryIssues,
        customerFeedback: { excellent: 0, good: 0, average: 0, poor: 0 }
    };

    const geoAgg = await Order.aggregate([
        { $match: { store: mongoose.Types.ObjectId(storeId), createdAt: { $gte: range.start, $lte: range.end } } },
        { $group: { _id: '$shippingAddress.city', orders: { $sum: 1 }, revenue: { $sum: '$finalTotal' } } },
        { $sort: { orders: -1 } }
    ]);
    const customerGeographics = geoAgg.filter(g => g._id).map(g => ({ city: g._id, orders: g.orders, revenue: g.revenue }));

    res.status(200).json({
        success: true,
        data: {
            overview,
            revenueChart,
            topProducts: topAgg,
            orderStatusDistribution,
            deliveryPerformance,
            customerGeographics
        }
    });
});

exports.getDeliveryPerformance = catchAsync(async (req, res, next) => {
    const { storeId } = req.params;
    const store = await Store.findById(storeId);
    if (!store) return next(new AppError('No store found with that ID.', 404));
    if (store.owner.toString() !== req.user.id && req.user.role !== 'admin') {
        return next(new AppError('You do not own this store.', 403));
    }

    const orders = await Order.find({ store: store._id });
    const total = orders.length;
    const successful = orders.filter(o => o.status === 'delivered').length;
    const failed = orders.filter(o => ['cancelled','returned'].includes(o.status)).length;
    const pending = orders.filter(o => !['delivered','cancelled','returned'].includes(o.status)).length;
    const avgTime = successful ? orders.filter(o => o.status === 'delivered').reduce((sum,o)=> sum + ((o.actualDelivery || o.deliveredAt || o.createdAt) - o.createdAt)/(1000*60*60*24),0)/successful : 0;
    const onTimePerc = successful ? orders.filter(o => o.status==='delivered' && o.actualDelivery && o.estimatedDelivery && o.actualDelivery <= o.estimatedDelivery).length / successful * 100 : 0;

    const companiesAgg = await Order.aggregate([
        { $match: { store: mongoose.Types.ObjectId(storeId) } },
        { $group: { _id: '$deliveryCompany', orders: { $sum: 1 }, success: { $sum: { $cond: [{ $eq: ['$status','delivered'] },1,0] } }, avgTime: { $avg: { $divide: [{ $subtract: ['$actualDelivery', '$createdAt'] }, 1000*60*60*24] } }, cost: { $sum: '$actualDeliveryPrice' } } }
    ]);
    const deliveryCompanies = companiesAgg.filter(c => c._id).map(c => ({ name: c._id, orders: c.orders, successRate: c.orders ? parseFloat((c.success/c.orders*100).toFixed(1)) : 0, averageTime: c.avgTime ? parseFloat(c.avgTime.toFixed(1)) : 0, cost: c.cost || 0 }));

    const areaAgg = await Order.aggregate([
        { $match: { store: mongoose.Types.ObjectId(storeId) } },
        { $group: { _id: '$shippingAddress.city', orders: { $sum: 1 }, avgTime: { $avg: { $divide: [{ $subtract: ['$actualDelivery', '$createdAt'] }, 1000*60*60*24] } }, successRate: { $avg: { $cond: [{ $eq: ['$status','delivered'] },1,0] } }, cost: { $sum: '$actualDeliveryPrice' } } }
    ]);
    const deliveryAreas = areaAgg.filter(a => a._id).map(a => ({ area: a._id, orders: a.orders, averageTime: a.avgTime ? parseFloat(a.avgTime.toFixed(1)) : 0, successRate: a.successRate ? parseFloat((a.successRate*100).toFixed(1)) : 0, cost: a.cost || 0 }));

    const issuesAndReturns = {
        deliveryIssues: failed,
        returns: orders.filter(o => o.status === 'returned').length,
        complaints: 0,
        commonIssues: []
    };

    res.status(200).json({
        success: true,
        data: {
            deliveryMetrics: {
                totalDeliveries: total,
                successfulDeliveries: successful,
                failedDeliveries: failed,
                pendingDeliveries: pending,
                averageDeliveryTime: parseFloat(avgTime.toFixed(1)),
                onTimePercentage: parseFloat(onTimePerc.toFixed(1))
            },
            deliveryCompanies,
            deliveryAreas,
            issuesAndReturns
        }
    });
});
