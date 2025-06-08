const Cart = require('../models/Cart');
const Product = require('../models/Product');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Simple in-memory coupon list for demonstration
const COUPONS = [
  { code: 'SAVE10', discount: 10, minAmount: 500 },
];

const buildCartResponse = (cart) => {
  if (!cart) return null;

  const items = cart.items.map((it) => {
    const product = it.product;
    const store = product.store || {};

    const standardPrice =
      store.deliverySettings?.defaultDeliveryPrice ?? 0;
    const expressPrice = standardPrice + 20;

    const deliveryOptions = [
      {
        type: 'standard',
        price: standardPrice,
        estimatedDays: 3,
      },
      {
        type: 'express',
        price: expressPrice,
        estimatedDays: 1,
      },
    ];

    return {
      _id: it._id,
      product: {
        _id: product._id,
        name: product.name,
        price: product.price,
        images: product.images,
        stock: product.stock,
        store: {
          _id: store._id,
          name: store.name,
          deliverySettings: store.deliverySettings,
        },
      },
      quantity: it.quantity,
      price: it.price,
      total: it.price * it.quantity,
      deliveryOptions,
      selectedDeliveryOption: it.deliveryOption,
      addedAt: it.addedAt,
      selectedVariant: it.selectedVariant,
    };
  });

  const itemsCount = items.reduce((acc, i) => acc + i.quantity, 0);
  const subtotal = items.reduce((acc, i) => acc + i.total, 0);

  const standardDelivery = items.reduce((acc, i) => {
    const opt = i.deliveryOptions.find((o) => o.type === 'standard');
    return acc + (opt ? opt.price : 0);
  }, 0);
  const expressDelivery = items.reduce((acc, i) => {
    const opt = i.deliveryOptions.find((o) => o.type === 'express');
    return acc + (opt ? opt.price : 0);
  }, 0);

  const store = items[0]?.product.store;
  const freeThreshold = store?.deliverySettings?.freeDeliveryThreshold || 0;
  const freeDeliveryEligible = subtotal >= freeThreshold;

  const estimatedTax = Number((subtotal * 0.15).toFixed(2));

  const estimatedTotal = {
    withStandardDelivery: Number(
      (subtotal + standardDelivery + estimatedTax).toFixed(2)
    ),
    withExpressDelivery: Number(
      (subtotal + expressDelivery + estimatedTax).toFixed(2)
    ),
    withFreeDelivery: Number((subtotal + estimatedTax).toFixed(2)),
  };

  return {
    _id: cart._id,
    user: cart.user,
    items,
    itemsCount,
    subtotal,
    deliverySummary: {
      standardDelivery,
      expressDelivery,
      freeDeliveryEligible,
      estimatedTax,
    },
    estimatedTotal,
    availableCoupons: COUPONS,
    updatedAt: cart.updatedAt,
  };
};

exports.getCart = catchAsync(async (req, res, next) => {
  let cart = await Cart.findOne({ user: req.user.id })
    .populate({
      path: 'items.product',
      populate: { path: 'store', select: 'name deliverySettings' },
    });

  if (!cart) {
    cart = await Cart.create({ user: req.user.id, items: [] });
  }

  const data = buildCartResponse(cart);

  res.status(200).json({
    success: true,
    data,
  });
});

exports.addItemToCart = catchAsync(async (req, res, next) => {
  const { productId, quantity = 1, deliveryOption = 'standard', selectedVariant } = req.body;

  const product = await Product.findById(productId);
  if (!product) {
    return next(new AppError('No product found with that ID', 404));
  }

  let cart = await Cart.findOne({ user: req.user.id });

  if (!cart) {
    cart = await Cart.create({ user: req.user.id, items: [] });
  }

  const itemIndex = cart.items.findIndex((item) => item.product.toString() === productId);

  if (itemIndex > -1) {
    cart.items[itemIndex].quantity += quantity;
    cart.items[itemIndex].deliveryOption = deliveryOption;
    if (selectedVariant) cart.items[itemIndex].selectedVariant = selectedVariant;
  } else {
    cart.items.push({
      product: productId,
      quantity,
      price: product.price,
      deliveryOption,
      selectedVariant,
    });
  }

  await cart.save();

  const cartItemsCount = cart.items.reduce((a, i) => a + i.quantity, 0);
  const cartTotal = cart.items.reduce((a, i) => a + i.price * i.quantity, 0);
  const itemId = cart.items[itemIndex > -1 ? itemIndex : cart.items.length - 1]._id;

  res.status(200).json({
    success: true,
    data: {
      itemId,
      cartItemsCount,
      cartTotal,
    },
    message: 'Item added to cart successfully',
  });
});

exports.updateCartItem = catchAsync(async (req, res, next) => {
  const { itemId } = req.params;
  const { quantity, deliveryOption } = req.body;

  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) return next(new AppError('Cart not found.', 404));

  const item = cart.items.id(itemId);
  if (!item) return next(new AppError('Item not found in cart.', 404));

  if (quantity !== undefined) {
    if (quantity <= 0) {
      item.remove();
    } else {
      item.quantity = quantity;
    }
  }
  if (deliveryOption) item.deliveryOption = deliveryOption;

  await cart.save();

  res.status(200).json({ success: true, data: buildCartResponse(cart) });
});

exports.updateCartItemByProduct = catchAsync(async (req, res, next) => {
  const { productId, quantity, deliveryOption } = req.body;

  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) return next(new AppError('Cart not found.', 404));

  const item = cart.items.find((it) => it.product.toString() === productId);
  if (!item) return next(new AppError('Item not found in cart.', 404));

  if (quantity !== undefined) {
    if (quantity <= 0) {
      cart.items.id(item._id).remove();
    } else {
      item.quantity = quantity;
    }
  }
  if (deliveryOption) item.deliveryOption = deliveryOption;

  await cart.save();

  res.status(200).json({ success: true, data: buildCartResponse(cart) });
});

exports.removeItemFromCart = catchAsync(async (req, res, next) => {
  const { itemId } = req.params;

  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) return next(new AppError('Cart not found.', 404));

  const item = cart.items.id(itemId);
  if (!item) return next(new AppError('Item not found in cart.', 404));

  item.remove();
  await cart.save();

  const cartItemsCount = cart.items.reduce((a, i) => a + i.quantity, 0);
  const cartTotal = cart.items.reduce((a, i) => a + i.price * i.quantity, 0);

  res.status(200).json({
    success: true,
    data: { cartItemsCount, cartTotal },
    message: 'Item removed from cart',
  });
});

exports.removeItemByProduct = catchAsync(async (req, res, next) => {
  const { productId } = req.params;
  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) return next(new AppError('Cart not found.', 404));

  const index = cart.items.findIndex((it) => it.product.toString() === productId);
  if (index === -1) return next(new AppError('Item not found in cart.', 404));

  cart.items.splice(index, 1);
  await cart.save();

  res.status(200).json({ success: true, data: buildCartResponse(cart) });
});

exports.clearCart = catchAsync(async (req, res, next) => {
  await Cart.findOneAndUpdate({ user: req.user.id }, { items: [] });

  res.status(200).json({
    success: true,
    message: 'Cart cleared',
    data: { user: req.user.id, items: [] }
  });
});

exports.applyCoupon = catchAsync(async (req, res, next) => {
  const { couponCode } = req.body;

  const coupon = COUPONS.find((c) => c.code === couponCode);
  if (!coupon) {
    return next(new AppError('Invalid coupon code', 400));
  }

  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) return next(new AppError('Cart not found.', 404));

  const subtotal = cart.items.reduce((a, i) => a + i.price * i.quantity, 0);
  if (subtotal < coupon.minAmount) {
    return next(
      new AppError('Cart total does not meet coupon minimum amount', 400)
    );
  }

  cart.appliedCoupon = coupon;
  await cart.save();

  res.status(200).json({
    success: true,
    data: coupon,
    message: 'Coupon applied',
  });
});
