const Product = require('../models/Product');
const Question = require('../models/Question');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

// Middleware to set user's store on the request body before creating a product
exports.setStoreId = (req, res, next) => {
    if (!req.user.store) {
        return next(new AppError('User does not have a store. Please create a store first.', 400));
    }
    req.body.store = req.user.store;
    next();
};

// Functions to be used in routes
exports.getAllProducts = factory.getAll(Product);

// Updated getProduct to populate related data
exports.getProduct = factory.getOne(Product, [
    { path: 'reviews' },
    { path: 'store', select: 'name description category phone email' }
]);

exports.createProduct = factory.createOne(Product);
exports.updateProduct = factory.updateOne(Product);
exports.deleteProduct = factory.deleteOne(Product);

exports.getMyProducts = catchAsync(async (req, res, next) => {
    if (!req.user.store) {
        return next(new AppError('You do not have a store to list products from.', 404));
    }
    const products = await Product.find({ store: req.user.store });
    res.status(200).json({
        success: true,
        count: products.length,
        data: products
    });
});

exports.getProductCategories = catchAsync(async (req, res, next) => {
    const categories = await Product.distinct('category');
    res.status(200).json({
        success: true,
        data: categories,
    });
});

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

// For featured, trending, latest products
exports.aliasTopProducts = (sort, limit = 5) => {
    return (req, res, next) => {
        req.query.limit = req.query.limit || String(limit);
        req.query.sort = req.query.sort || sort;
        next();
    };
};


// --- Product Questions ---

exports.askQuestion = catchAsync(async (req, res, next) => {
    const { question } = req.body;
    const productId = req.params.id;

    const newQuestion = await Question.create({
        product: productId,
        user: req.user.id,
        question: question
    });

    res.status(201).json({
        success: true,
        data: newQuestion
    });
});

exports.answerQuestion = catchAsync(async (req, res, next) => {
    const { questionId } = req.params;
    const { answer } = req.body;

    const question = await Question.findById(questionId).populate({
        path: 'product',
        select: 'store'
    });

    if (!question) {
        return next(new AppError('No question found with that ID.', 404));
    }
    
    const product = await Product.findById(question.product);
    if (product.store.toString() !== req.user.store.toString() && req.user.role !== 'admin') {
        return next(new AppError('You are not authorized to answer this question.', 403));
    }

    question.answer = answer;
    question.answeredBy = req.user.id;
    question.answeredAt = Date.now();
    await question.save();

    res.status(200).json({
        success: true,
        data: question
    });
});

exports.getProductQuestions = catchAsync(async (req, res, next) => {
    const questions = await Question.find({ product: req.params.id });

    res.status(200).json({
        success: true,
        count: questions.length,
        data: questions
    });
});
