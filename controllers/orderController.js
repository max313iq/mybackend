const Order = require('../models/Order');
const Product = require('../models/Product');
const Store = require('../models/Store');
const { createNotification } = require('../services/notificationService');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.createOrder = catchAsync(async (req, res, next) => {
  const {
    items,
    orderItems,
    shippingAddress,
    paymentMethod,
    paymentDetails,
    totalAmount,
    shippingCost,
    taxAmount,
    finalTotal,
    trackingNumber,
    notes,
    couponCode,
    deliveryArea
  } = req.body;

  const itemsToUse = items || orderItems;

  if (!itemsToUse || itemsToUse.length === 0) {
    return next(new AppError('No order items provided', 400));
  }

  // In a real-world app, you might need to handle orders with items from multiple stores.
  // For simplicity, we assume all items in one order belong to a single store.
  const firstProduct = await Product.findById(itemsToUse[0].product);
  if (!firstProduct) {
      return next(new AppError('One of the products in the order was not found.', 404));
  }
  const storeId = firstProduct.store;

  const estimatedDelivery = deliveryArea?.estimatedDays
    ? new Date(Date.now() + deliveryArea.estimatedDays * 24 * 60 * 60 * 1000)
    : undefined;

  const order = await Order.create({
    orderItems: itemsToUse,
    user: req.user._id,
    store: storeId,
    shippingAddress,
    deliveryArea,
    paymentMethod,
    paymentDetails,
    totalPrice: totalAmount,
    shippingCost: shippingCost || (deliveryArea ? deliveryArea.price : 0),
    taxAmount,
    finalTotal,
    trackingNumber,
    notes,
    couponCode,
    estimatedDelivery,
    statusHistory: [{ status: 'pending', timestamp: new Date(), note: 'Order placed' }]
  });

  const store = await Store.findById(storeId);
  if (store && store.owner) {
    await createNotification({
      recipient: store.owner,
      type: 'new_order',
      title: 'طلب جديد',
      message: `لديك طلب جديد من ${shippingAddress.fullName} بقيمة ${order.finalTotal} ر.س`,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        customerName: shippingAddress.fullName,
        amount: order.finalTotal,
        storeId: store._id,
        urgency: 'high'
      },
      priority: 'high',
      actionUrl: `/store-management?tab=orders&orderId=${order._id}`
    });
  }

  // Decrease stock and check low stock
  for (const item of itemsToUse) {
    const prod = await Product.findById(item.product);
    if (prod) {
      prod.stock = Math.max(0, prod.stock - item.quantity);
      await prod.save();
      if (prod.stock <= prod.lowStockThreshold) {
        await createNotification({
          recipient: store.owner,
          type: 'low_stock_alert',
          title: 'تحذير: مخزون منخفض',
          message: `المنتج ${prod.name} أوشك على النفاد (${prod.stock} قطع متبقية)`,
          data: {
            productId: prod._id,
            productName: prod.name,
            currentStock: prod.stock,
            threshold: prod.lowStockThreshold
          },
          priority: 'medium'
        });
      }
    }
  }

  res.status(201).json({
    success: true,
    data: {
      _id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      estimatedDelivery: order.estimatedDelivery,
      trackingNumber: order.trackingNumber,
      finalTotal: order.finalTotal
    },
    message: 'Order created successfully. Store owner has been notified.'
  });
});

exports.getMyOrders = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const filter = { user: req.user._id };
  if (req.query.status && req.query.status !== 'all') {
    filter.status = req.query.status;
  }

  const total = await Order.countDocuments(filter);

  const orders = await Order.find(filter)
    .skip(skip)
    .limit(limit)
    .sort('-createdAt')
    .populate('store', 'name logo')
    .populate('orderItems.product', 'name images');

  const pages = Math.ceil(total / limit);

  const data = orders.map(o => {
    const obj = o.toObject();
    obj.canCancel = !['shipped', 'delivered', 'cancelled'].includes(o.status);
    obj.canReturn = o.status === 'delivered';
    obj.items = obj.orderItems.map(it => ({
      product: it.product,
      quantity: it.quantity,
      price: it.price,
      total: it.quantity * it.price
    }));
    return obj;
  });

  res.status(200).json({
    success: true,
    data,
    pagination: { page, limit, total, pages }
  });
});

// Use factory functions for generic operations
exports.getAllOrders = factory.getAll(Order);

exports.getOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate('store', 'name owner')
    .populate('orderItems.product', 'name images');

  if (!order) {
    return next(new AppError('No order found with that ID', 404));
  }

  const isOwner = order.user.toString() === req.user.id;
  const isStoreOwner = order.store.owner && order.store.owner.toString() === req.user.id;
  if (!isOwner && !isStoreOwner && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to view this order.', 403));
  }

  res.status(200).json({ success: true, data: order });
});

exports.deleteOrder = factory.deleteOne(Order);

// These will also use the generic updateOne factory function.
// The factory will take the request body and update the order document.
exports.updateOrderStatus = factory.updateOne(Order);
exports.updatePaymentStatus = factory.updateOne(Order);
exports.updateDeliveryStatus = factory.updateOne(Order);

exports.cancelOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id).populate('store');
  if (!order) {
    return next(new AppError('No order found with that ID', 404));
  }

  if (order.user.toString() !== req.user.id) {
    return next(new AppError('You do not have permission to cancel this order.', 403));
  }

  if (['shipped', 'delivered', 'cancelled'].includes(order.status)) {
    return next(new AppError('Order cannot be cancelled at this stage.', 400));
  }

  const { reason, refundMethod } = req.body;

  order.status = 'cancelled';
  order.cancelReason = reason;
  order.refundMethod = refundMethod;
  order.refundStatus = 'processing';
  order.refundAmount = order.finalTotal;
  order.statusHistory.push({ status: 'cancelled', timestamp: new Date(), note: reason });

  await order.save();

  if (order.store && order.store.owner) {
    await createNotification({
      recipient: order.store.owner,
      type: 'order_cancelled',
      title: 'تم إلغاء طلب',
      message: `تم إلغاء الطلب رقم ${order.orderNumber}`,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        reason
      },
      priority: 'medium'
    });
  }

  res.status(200).json({
    success: true,
    data: {
      status: order.status,
      refundStatus: order.refundStatus,
      refundAmount: order.refundAmount
    },
    message: 'Order cancelled successfully. Refund is being processed.'
  });
});
