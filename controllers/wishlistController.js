const Wishlist = require('../models/Wishlist');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getWishlist = catchAsync(async (req, res, next) => {
  const wishlist = await Wishlist.findOne({ user: req.user.id }).populate('products');

  if (!wishlist) {
    return res.status(200).json({
        success: true,
        data: { products: [] }
    });
  }
  
  res.status(200).json({
    success: true,
    data: wishlist,
  });
});

exports.addToWishlist = catchAsync(async (req, res, next) => {
  const { productId } = req.body;
  const wishlist = await Wishlist.findOneAndUpdate(
    { user: req.user.id },
    { $addToSet: { products: productId } },
    { upsert: true, new: true }
  );
  
  res.status(200).json({
    success: true,
    message: 'Product added to wishlist.',
    data: wishlist,
  });
});

exports.removeFromWishlist = catchAsync(async (req, res, next) => {
  const { productId } = req.params;
  const wishlist = await Wishlist.findOneAndUpdate(
    { user: req.user.id },
    { $pull: { products: productId } },
    { new: true }
  );

  if (!wishlist) {
      return next(new AppError('Wishlist not found.', 404));
  }
  
  res.status(200).json({
    success: true,
    message: 'Product removed from wishlist.',
    data: wishlist,
  });
});

exports.clearWishlist = catchAsync(async (req, res, next) => {
  await Wishlist.findOneAndUpdate({ user: req.user.id }, { products: [] });
  
  res.status(200).json({
    success: true,
    message: 'Wishlist cleared.',
  });
});