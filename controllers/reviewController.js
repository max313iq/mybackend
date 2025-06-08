const Review = require('../models/Review');
const Rating = require('../models/Rating'); // -> أضف هذا السطر لاستيراد مودل التقييم
const Order = require('../models/Order');
const Product = require('../models/Product');
const Notification = require('../models/Notification');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

// Middleware to set IDs for nested routes on PRODUCTS
exports.setProductUserIds = (req, res, next) => {
  if (!req.body.product) req.body.product = req.params.id;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

// Middleware to set IDs for nested routes on STORES
exports.setStoreUserIds = (req, res, next) => {
    if (!req.body.store) req.body.store = req.params.id;
    if (!req.body.user) req.body.user = req.user.id;
    next();
};

// --- بداية الإضافة ---
// دالة جديدة لإنشاء تقييم (rating) فقط
exports.createRating = factory.createOne(Rating);
// --- نهاية الإضافة ---


exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);
exports.createReview = catchAsync(async (req, res, next) => {
    const { product } = req.body;
    const hasPurchased = await Order.exists({
        user: req.user.id,
        'orderItems.product': product,
        status: { $ne: 'cancelled' }
    });
    if (!hasPurchased) {
        return next(new AppError('You can only review products you purchased', 403));
    }
    const review = await Review.create(req.body);
    const prod = await Product.findById(product).populate('store');
    if (prod && prod.store && prod.store.owner) {
        await Notification.create({
            user: prod.store.owner,
            recipient: prod.store.owner,
            type: 'new_review',
            title: 'تقييم جديد',
            message: `حصل منتجك ${prod.name} على تقييم ${review.rating} نجوم`,
            data: { productId: prod._id, productName: prod.name }
        });
    }
    res.status(201).json({ success: true, data: review, message: 'Review added successfully' });
});
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);

// Middleware to set IDs for nested routes on PRODUCTS
exports.setProductUserIds = (req, res, next) => {
  if (!req.body.product) req.body.product = req.params.id;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

// Middleware to set IDs for nested routes on STORES
exports.setStoreUserIds = (req, res, next) => {
    if (!req.body.store) req.body.store = req.params.id;
    if (!req.body.user) req.body.user = req.user.id;
    next();
};


// For a user to get ONLY their own reviews
exports.getMyReviews = catchAsync(async (req, res, next) => {
    const filter = { user: req.user.id };
    if(req.query.type) {
        filter[req.query.type] = { $exists: true };
    }

    const features = new APIFeatures(Review.find(filter), req.query)
        .filter()
        .sort()
        .limitFields()
        .paginate();
    
    const reviews = await features.query;

    res.status(200).json({
        success: true,
        count: reviews.length,
        data: reviews
    });
});


// --- Admin & Moderation Functions ---

exports.markReviewAsHelpful = catchAsync(async (req, res, next) => {
    // Note: The logic for who can mark as helpful (e.g., preventing multiple clicks)
    // would need to be more sophisticated in a real app.
    const review = await Review.findByIdAndUpdate(req.params.id, { $inc: { helpful: 1 } }, { new: true });
    if (!review) {
        return next(new AppError('No review found with that ID.', 404));
    }
    res.status(200).json({ success: true, data: review });
});

exports.getPendingReviews = factory.getAll(Review, { status: 'pending' });

exports.moderateReview = catchAsync(async (req, res, next) => {
    const { status, reason } = req.body;
    const review = await Review.findByIdAndUpdate(
        req.params.id,
        { status, rejectionReason: reason },
        { new: true, runValidators: true }
    );

    if (!review) {
        return next(new AppError('No review found with that ID', 404));
    }

    res.status(200).json({
        success: true,
        message: `Review has been ${status}.`,
        data: review
    });
});

exports.flagReview = catchAsync(async (req, res, next) => {
    const { reason } = req.body;
    const review = await Review.findByIdAndUpdate(
        req.params.id,
        { 'flagged.isFlagged': true, 'flagged.reason': reason },
        { new: true }
    );

    if (!review) {
        return next(new AppError('No review found with that ID', 404));
    }

    res.status(200).json({ success: true, message: 'Review has been flagged.' });
});