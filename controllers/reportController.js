const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Review = require('../models/Review');
const catchAsync = require('../utils/catchAsync');

// @desc    Get sales report
// @route   GET /api/reports/sales
// @access  Private/Admin
exports.getSalesReport = catchAsync(async (req, res, next) => {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const filter = {
        status: 'delivered',
        ...( (startDate || endDate) && { createdAt: dateFilter })
    };

    const sales = await Order.find(filter).populate('user', 'name email').populate('orderItems.product', 'name');

    const totalSales = sales.reduce((acc, order) => acc + order.totalPrice, 0);

    res.status(200).json({
        success: true,
        count: sales.length,
        totalSales,
        data: sales,
    });
});

// @desc    Get products report
// @route   GET /api/reports/products
// @access  Private/Admin
exports.getProductsReport = catchAsync(async (req, res, next) => {
    const products = await Product.find({})
        .select('name price stock ratingsAverage ratingsQuantity')
        .sort({ stock: 1 });

    res.status(200).json({
        success: true,
        count: products.length,
        data: products,
    });
});

// @desc    Get customers report
// @route   GET /api/reports/customers
// @access  Private/Admin
exports.getCustomersReport = catchAsync(async (req, res, next) => {
    const customers = await User.find({ role: 'customer' })
        .select('name email createdAt');

    res.status(200).json({
        success: true,
        count: customers.length,
        data: customers,
    });
});

// @desc    Get reviews report
// @route   GET /api/reports/reviews
// @access  Private/Admin
exports.getReviewsReport = catchAsync(async (req, res, next) => {
    const reviews = await Review.find({})
        .populate('user', 'name')
        .populate('product', 'name')
        .populate('store', 'name')
        .select('title rating comment status createdAt');
        
    res.status(200).json({
        success: true,
        count: reviews.length,
        data: reviews
    });
});


// @desc    Export sales report
// @route   GET /api/reports/export/sales
// @access  Private/Admin
exports.exportSalesReport = catchAsync(async (req, res, next) => {
    // This is a placeholder for a real CSV or PDF export.
    // A library like 'csv-writer' or 'pdfkit' would be used here.
    const sales = await Order.find({ status: 'delivered' });
    const totalSales = sales.reduce((acc, order) => acc + order.totalPrice, 0);

    res.status(200).json({
        message: 'Export functionality would be implemented here.',
        totalSales,
        count: sales.length
    });
});