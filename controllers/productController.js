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

// Set store ID from route parameter if provided and ensure ownership
exports.setStoreIdFromParam = (req, res, next) => {
    if (req.params.storeId) {
        const storeId = req.params.storeId;
        if (req.user.role !== 'admin' && (!req.user.stores || !req.user.stores.map(id => String(id)).includes(String(storeId)))) {
            return next(new AppError('You do not own this store.', 403));
        }
        req.body.store = storeId;
    }
    next();
};

// Get all products with optional store filter and ownership statistics
exports.getAllProducts = catchAsync(async (req, res, next) => {
    const filter = {};
    if (req.params.storeId) {
        filter.store = req.params.storeId;
    }
    if (!(req.query.includeInactive === 'true')) {
        filter.isActive = { $ne: false };
    }

    const features = new APIFeatures(Product.find(filter), req.query)
        .filter()
        .sort()
        .limitFields()
        .paginate();

    const products = await features.query.populate({
        path: 'store',
        select: 'name slug logo'
    });

    res.status(200).json({
        success: true,
        data: products
    });
});

// Use the factory for GET ONE, populating all related data
exports.getProduct = factory.getOne(Product, [
    { path: 'store', select: 'name description' },
    { path: 'comments' } // This will populate comments and their users
]);

// Standard factory functions
exports.createProduct = factory.createOne(Product);
exports.updateProduct = factory.updateOne(Product);
exports.deleteProduct = factory.deleteOne(Product);

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
