const Cart = require('../models/Cart');
const Product = require('../models/Product');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getCart = catchAsync(async (req, res, next) => {
  let cart = await Cart.findOne({ user: req.user.id }).populate('items.product');

  if (!cart) {
    cart = await Cart.create({ user: req.user.id, items: [] });
  }

  res.status(200).json({
    success: true,
    data: cart,
  });
});

exports.addItemToCart = catchAsync(async (req, res, next) => {
  const { productId, quantity } = req.body;

  const product = await Product.findById(productId);
  if (!product) {
    return next(new AppError('No product found with that ID', 404));
  }

  let cart = await Cart.findOne({ user: req.user.id });

  if (!cart) {
    cart = await Cart.create({ user: req.user.id, items: [] });
  }

  const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);

  if (itemIndex > -1) {
    // Product exists in cart, update quantity
    cart.items[itemIndex].quantity += quantity;
  } else {
    // Product does not exist in cart, add new item
    cart.items.push({ product: productId, quantity });
  }

  await cart.save();

  res.status(200).json({
    success: true,
    message: 'Item added to cart',
    data: cart,
  });
});

exports.updateCartItem = catchAsync(async (req, res, next) => {
    const { productId, quantity } = req.body;

    if (quantity <= 0) {
        return exports.removeItemFromCart(req, res, next);
    }

    const cart = await Cart.findOneAndUpdate(
        { user: req.user.id, 'items.product': productId },
        { $set: { 'items.$.quantity': quantity } },
        { new: true }
    ).populate('items.product');

    if (!cart) {
        return next(new AppError('Item not found in cart.', 404));
    }

    res.status(200).json({
        success: true,
        data: cart,
    });
});

exports.removeItemFromCart = catchAsync(async (req, res, next) => {
  const { productId } = req.params;

  const cart = await Cart.findOneAndUpdate(
    { user: req.user.id },
    { $pull: { items: { product: productId } } },
    { new: true }
  ).populate('items.product');

  if (!cart) {
      return next(new AppError('Cart not found.', 404));
  }

  res.status(200).json({
    success: true,
    data: cart,
  });
});

exports.clearCart = catchAsync(async (req, res, next) => {
  await Cart.findOneAndUpdate({ user: req.user.id }, { items: [] });

  res.status(200).json({
    success: true,
    message: 'Cart cleared',
    data: { user: req.user.id, items: [] }
  });
});