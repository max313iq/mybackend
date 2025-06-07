const Comparison = require('../models/Comparison');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getComparisonList = catchAsync(async (req, res, next) => {
  const comparisonList = await Comparison.findOne({ user: req.user.id }).populate('products');

  if (!comparisonList) {
    // Return an empty list if no comparison list exists for the user
    return res.status(200).json({
        success: true,
        data: { user: req.user.id, products: [] }
    });
  }
  
  res.status(200).json({
    success: true,
    data: comparisonList,
  });
});

exports.addToComparison = catchAsync(async (req, res, next) => {
  const { productId } = req.body;
  // Use upsert to create a new list if one doesn't exist
  const comparisonList = await Comparison.findOneAndUpdate(
    { user: req.user.id },
    { $addToSet: { products: productId } },
    { new: true, upsert: true }
  );
  
  res.status(200).json({
    success: true,
    message: 'Product added to comparison list.',
    data: comparisonList,
  });
});

exports.removeFromComparison = catchAsync(async (req, res, next) => {
  const { productId } = req.params;
  const comparisonList = await Comparison.findOneAndUpdate(
    { user: req.user.id },
    { $pull: { products: productId } },
    { new: true }
  );

  if (!comparisonList) {
      return next(new AppError('Comparison list not found.', 404));
  }
  
  res.status(200).json({
    success: true,
    message: 'Product removed from comparison list.',
    data: comparisonList,
  });
});

exports.clearComparisonList = catchAsync(async (req, res, next) => {
  await Comparison.findOneAndUpdate({ user: req.user.id }, { $set: { products: [] } });
  
  res.status(200).json({
    success: true,
    message: 'Comparison list cleared.',
  });
});