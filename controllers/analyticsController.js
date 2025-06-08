const Product = require('../models/Product');
const Store = require('../models/Store');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');

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