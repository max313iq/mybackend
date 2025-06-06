const Order = require('../models/Order');
const Product = require('../models/Product');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// ... (باقي الدوال مثل getMyOrders تبقى كما هي)

exports.createOrder = catchAsync(async (req, res, next) => {
    const { orderItems, shippingAddress, paymentMethod } = req.body;

    if (!orderItems || orderItems.length === 0) {
        return next(new AppError('No order items found', 400));
    }

    // 👇 تم تحديث هذا الجزء
    let finalOrderItems = [];
    let totalPrice = 0;

    for (const item of orderItems) {
        const product = await Product.findById(item.product);
        if (!product) {
            return next(new AppError(`Product with ID ${item.product} not found`, 404));
        }
        if (product.stock < item.quantity) {
            return next(new AppError(`Not enough stock for ${product.name}`, 400));
        }
        
        totalPrice += product.price * item.quantity;
        
        finalOrderItems.push({
            ...item,
            name: product.name,
            image: product.images[0], // Use the first image of the product
            price: product.price,
            store: product.store // حفظ معرّف المتجر مع المنتج
        });
    }

    const order = await Order.create({
        user: req.user._id,
        orderItems: finalOrderItems,
        shippingAddress,
        paymentMethod,
        totalPrice
    });
    
    // Decrement stock after successful order
    for (const item of order.orderItems) {
        await Product.findByIdAndUpdate(item.product, {
            $inc: { stock: -item.quantity }
        });
    }

    res.status(201).json({
        status: 'success',
        data: {
            order
        }
    });
});

// ... (باقي الدوال getAllOrders, getOrder, etc. تبقى كما هي للمدير)
exports.getAllOrders = factory.getAll(Order);
exports.getOrder = factory.getOne(Order, { path: 'user' });
exports.updateOrder = factory.updateOne(Order);
exports.deleteOrder = factory.deleteOne(Order);
exports.getMyOrders = catchAsync(async (req, res, next) => {
    const orders = await Order.find({ user: req.user.id });

    res.status(200).json({
        status: 'success',
        results: orders.length,
        data: {
            orders
        }
    });
});