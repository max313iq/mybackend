const mongoose = require('mongoose');
const Review = require('../models/Review');
const Rating = require('../models/Rating');
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
    const { product, store } = req.body;

    let hasPurchased = false;
    if (product) {
        hasPurchased = await Order.exists({
            user: req.user.id,
            'orderItems.product': product,
            status: { $ne: 'cancelled' }
        });
    } else if (store) {
        hasPurchased = await Order.exists({
            user: req.user.id,
            store,
            status: { $ne: 'cancelled' }
        });
    }

    if (!hasPurchased) {
        return next(new AppError('You can only review products you purchased', 403));
    }

    const review = await Review.create({
        ...req.body,
        user: req.user.id,
        verified: true
    });

    if (product) {
        const prod = await Product.findById(product).populate('store');
        if (prod && prod.store && prod.store.owner) {
            await Notification.create({
                user: prod.store.owner,
                recipient: prod.store.owner,
                type: 'new_review',
                title: 'تقييم جديد',
                message: `حصل منتجك ${prod.name} على تقييم ${review.rating} نجوم`,
                data: { productId: prod._id, productName: prod.name, rating: review.rating, reviewId: review._id },
                priority: 'medium'
            });
        }
    }

    res.status(201).json({
        success: true,
        data: {
            _id: review._id,
            user: { name: req.user.name, avatar: req.user.avatar },
            rating: review.rating,
            title: review.title,
            isVerifiedPurchase: review.verified,
            createdAt: review.createdAt
        },
        message: 'Review added successfully'
    });
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

exports.getProductReviews = catchAsync(async (req, res, next) => {
    const productId = req.params.id || req.params.productId;

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const filter = { product: productId };
    if (req.query.rating) filter.rating = Number(req.query.rating);
    if (req.query.verified) filter.verified = req.query.verified === 'true';

    const sortMap = {
        newest: '-createdAt',
        oldest: 'createdAt',
        helpful: '-helpful',
        'rating-high': '-rating',
        'rating-low': 'rating'
    };
    const sort = sortMap[req.query.sort] || '-createdAt';

    const reviewsPromise = Review.find(filter)
        .populate({ path: 'user', select: 'name avatar' })
        .sort(sort)
        .skip(skip)
        .limit(limit);

    const totalPromise = Review.countDocuments(filter);

    const [reviews, total] = await Promise.all([reviewsPromise, totalPromise]);

    const summaryAgg = await Review.aggregate([
        { $match: { product: mongoose.Types.ObjectId(productId) } },
        {
            $group: {
                _id: null,
                averageRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 },
                verifiedPurchases: { $sum: { $cond: ['$verified', 1, 0] } }
            }
        }
    ]);

    const distAgg = await Review.aggregate([
        { $match: { product: mongoose.Types.ObjectId(productId) } },
        { $group: { _id: '$rating', count: { $sum: 1 } } }
    ]);

    const distribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    distAgg.forEach(d => { distribution[d._id] = d.count; });

    const summaryData = summaryAgg[0] || { averageRating: 0, totalReviews: 0, verifiedPurchases: 0 };
    summaryData.ratingDistribution = distribution;

    res.status(200).json({
        success: true,
        data: reviews,
        summary: summaryData,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
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