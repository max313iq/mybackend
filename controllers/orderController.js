const Order = require('../models/Order');
const Product = require('../models/Product');
const Store = require('../models/Store');
const Notification = require('../models/Notification');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.createOrder = catchAsync(async (req, res, next) => {
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    totalPrice,
    shippingCost,
    taxAmount,
    finalTotal,
    trackingNumber,
    notes,
    deliveryArea
  } = req.body;

  if (!orderItems || orderItems.length === 0) {
    return next(new AppError('No order items provided', 400));
  }

  // In a real-world app, you might need to handle orders with items from multiple stores.
  // For simplicity, we assume all items in one order belong to a single store.
  const firstProduct = await Product.findById(orderItems[0].product);
  if (!firstProduct) {
      return next(new AppError('One of the products in the order was not found.', 404));
  }
  const storeId = firstProduct.store;

  const order = await Order.create({
    orderItems,
    user: req.user._id,
    store: storeId,
    shippingAddress,
    deliveryArea,
    paymentMethod,
    totalPrice,
    shippingCost: shippingCost || (deliveryArea ? deliveryArea.price : 0),
    taxAmount,
    finalTotal,
    trackingNumber,
    notes,
  });

  const store = await Store.findById(storeId);
  if (store && store.owner) {
    await Notification.create({
      user: store.owner,
      recipient: store.owner,
      type: 'new_order',
      title: 'طلب جديد',
      message: `لديك طلب جديد رقم ${order.orderNumber}`,
      data: { orderId: order._id }
    });
  }

  res.status(201).json({
      success: true,
      data: order
  });
});

exports.getMyOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.find({ user: req.user._id });
  res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
  });
});

// Use factory functions for generic operations
exports.getAllOrders = factory.getAll(Order);
exports.getOrder = factory.getOne(Order, { path: 'user store' });
exports.deleteOrder = factory.deleteOne(Order);

// These will also use the generic updateOne factory function.
// The factory will take the request body and update the order document.
exports.updateOrderStatus = factory.updateOne(Order);
exports.updatePaymentStatus = factory.updateOne(Order);
exports.updateDeliveryStatus = factory.updateOne(Order);