const Product = require('../models/Product');
const Store = require('../models/Store');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

// Middleware to check if user is the owner of the store for the product
exports.checkStoreOwner = catchAsync(async (req, res, next) => {
    const store = await Store.findById(req.user.store);
    if (!store) {
        return next(new AppError('You must create a store first!', 400));
    }
    
    // For creating a new product
    if (!req.params.id) {
        req.body.store = store._id;
        return next();
    }
    
    // For updating/deleting an existing product
    const product = await Product.findById(req.params.id);
    if (!product) {
        return next(new AppError('No product found with that ID', 404));
    }
    if (product.store.toString() !== store._id.toString()) {
        return next(new AppError('You can only manage products in your own store.', 403));
    }
    
    next();
});

// For public view - Explore products
exports.getAllProducts = catchAsync(async (req, res, next) => {
    let filter = {};
    if(req.params.storeId) filter = { store: req.params.storeId };

    // BUILD QUERY
    const features = new APIFeatures(Product.find(filter), req.query)
      .search() // Added search capability
      .filter()
      .sort()
      .limitFields()
      .paginate();

    // EXECUTE QUERY
    const products = await features.query;

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      results: products.length,
      data: {
        products
      }
    });
});


// For public view
exports.getProduct = factory.getOne(Product, { path: 'ratings comments' });

// For Store Owners
exports.createProduct = factory.createOne(Product);
exports.updateProduct = factory.updateOne(Product);
exports.deleteProduct = factory.deleteOne(Product);

// For store owners to get their products
exports.getMyProducts = catchAsync(async (req, res, next) => {
    const products = await Product.find({ store: req.user.store });
    res.status(200).json({
        status: 'success',
        results: products.length,
        data: {
            products
        }
    });
});

exports.getHomePageStats = catchAsync(async (req, res, next) => {
    const numUsers = await User.countDocuments();
    const numStores = await Store.countDocuments();
    const numProducts = await Product.countDocuments();

    res.status(200).json({
        status: 'success',
        data: {
            users: numUsers,
            stores: numStores,
            products: numProducts
        }
    });
});