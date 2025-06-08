const Product = require('../models/Product');
const Question = require('../models/Question');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

// Middleware to set user's store on the request body before creating a product
exports.setStoreId = (req, res, next) => {
    const storeId = req.user.stores && req.user.stores[0];
    if (!storeId) {
        return next(new AppError('User does not have a store. Please create a store first.', 400));
    }
    req.body.store = storeId;
    next();
};

// Middleware to set store ID from route param after verifying ownership
exports.setStoreIdFromParam = catchAsync(async (req, res, next) => {
    const storeId = req.params.storeId;
    if (!storeId) {
        return next(new AppError('Store ID is required.', 400));
    }
    if (req.user.role !== 'admin' && !(req.user.stores || []).map(id => String(id)).includes(storeId)) {
        return next(new AppError('You do not own this store.', 403));
    }
    req.body.store = storeId;
    next();
});

// Get products with optional store filter and pagination
exports.getAllProducts = catchAsync(async (req, res, next) => {
    const filter = {};
    if (req.params.storeId) filter.store = req.params.storeId;
    if (req.query.includeInactive !== 'true') filter.isActive = true;

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 12;
    const skip = (page - 1) * limit;

    const features = new APIFeatures(Product.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .search();

    const docsPromise = features.query
      .skip(skip)
      .limit(limit)
      .populate({ path: 'store', select: 'name slug' });

    const [products, total] = await Promise.all([
      docsPromise,
      Product.countDocuments(filter)
    ]);

    res.status(200).json({
        success: true,
        data: products,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    });
});

// Use the factory for GET ONE, populating all related data
exports.getProduct = factory.getOne(Product, [
    { path: 'store', select: 'name slug logo ratingsAverage isVerified deliverySettings' },
    { path: 'comments' }
]);

// Custom create function to return a tailored response
exports.createProduct = catchAsync(async (req, res, next) => {
    const doc = await Product.create(req.body);
    res.status(201).json({
        success: true,
        data: doc,
        message: 'Product created successfully'
    });
});

// Standard factory functions for update/delete with custom response for update
exports.updateProduct = catchAsync(async (req, res, next) => {
    const doc = await Product.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });
    if (!doc) {
        return next(new AppError('No document found with that ID', 404));
    }
    res.status(200).json({
        success: true,
        data: doc,
        message: 'Product updated successfully'
    });
});

exports.deleteProduct = catchAsync(async (req, res, next) => {
    const doc = await Product.findByIdAndDelete(req.params.id);
    if (!doc) {
        return next(new AppError('No document found with that ID', 404));
    }
    res.status(200).json({ success: true, message: 'Product deleted successfully' });
});

// Controller for getting products belonging to the logged-in store owner
exports.getMyProducts = catchAsync(async (req, res, next) => {
    const storeId = req.user.stores && req.user.stores[0];
    if (!storeId) {
        return next(new AppError('You do not have a store to list products from.', 404));
    }
    const products = await Product.find({ store: storeId });
    res.status(200).json({
        success: true,
        count: products.length,
        data: products
    });
});

// Controller for getting all unique product categories
exports.getProductCategories = catchAsync(async (req, res, next) => {
    const categories = await Product.distinct('category');
    res.status(200).json({
        success: true,
        data: categories,
    });
});

// Controller for advanced product search
exports.advancedProductSearch = catchAsync(async (req, res, next) => {
    const features = new APIFeatures(Product.find(), req.body)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    const products = await features.query;

    res.status(200).json({
        success: true,
        count: products.length,
        data: products,
    });
});

// Alias for getting top products based on different criteria
exports.aliasTopProducts = (sort, limit = 5) => {
    return (req, res, next) => {
        req.query.limit = req.query.limit || String(limit);
        req.query.sort = req.query.sort || sort;
        next();
    };
};

// --- Product Questions Controllers ---

exports.askQuestion = catchAsync(async (req, res, next) => {
    const { question } = req.body;
    const productId = req.params.id;
    const newQuestion = await Question.create({
        product: productId,
        user: req.user.id,
        question: question
    });
    res.status(201).json({ success: true, data: newQuestion });
});

exports.answerQuestion = catchAsync(async (req, res, next) => {
    const { questionId } = req.params;
    const { answer } = req.body;

    const question = await Question.findById(questionId);
    if (!question) {
        return next(new AppError('No question found with that ID.', 404));
    }
    
    const product = await Product.findById(question.product);
    const storeId = req.user.stores && req.user.stores[0];
    if (product.store.toString() !== String(storeId) && req.user.role !== 'admin') {
        return next(new AppError('You are not authorized to answer this question.', 403));
    }

    question.answer = answer;
    question.answeredBy = req.user.id;
    question.answeredAt = Date.now();
    await question.save();
    res.status(200).json({ success: true, data: question });
});

exports.getProductQuestions = catchAsync(async (req, res, next) => {
    const questions = await Question.find({ product: req.params.id });
    res.status(200).json({
        success: true,
        count: questions.length,
        data: questions
    });
});
