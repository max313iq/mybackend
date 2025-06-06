const Rating = require('../models/Rating');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Middleware to set user and product/store IDs before creating a rating
exports.setTargetIds = (req, res, next) => {
  // Allow nested routes
  if (req.params.productId) {
    req.body.product = req.params.productId;
  } else if (req.params.storeId) {
    req.body.store = req.params.storeId;
  } else {
    return next(new AppError('Rating must belong to a product or a store.', 400));
  }
  req.body.user = req.user.id;
  next();
};

// Use the factory to create the functions
exports.createRating = factory.createOne(Rating);
exports.getRating = factory.getOne(Rating);
exports.getAllRatings = factory.getAll(Rating);
exports.updateRating = factory.updateOne(Rating);
exports.deleteRating = factory.deleteOne(Rating);