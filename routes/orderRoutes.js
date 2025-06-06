// mybackend/routes/orderRoutes.js

const express = require('express');
const router = express.Router();
const Order = require('../models/Order');     // استيراد نموذج الطلب
const Product = require('../models/Product'); // استيراد نموذج المنتج (لجلب تفاصيله والتحقق)
const Store = require('../models/Store');     // استيراد نموذج المتجر (لتحقق الملكية)
const auth = require('../middleware/auth');   // استيراد برمجية المصادقة الوسيطة

// 1. إنشاء طلب جديد (POST /api/orders) - يتطلب مصادقة (المشتري)
router.post('/', auth, async (req, res) => {
    const { storeId, items, customerInfo } = req.body;
    const userId = req.user.id; // معرف المشتري يأتي من برمجية المصادقة

    if (!storeId || !items || items.length === 0 || !customerInfo || !customerInfo.name || !customerInfo.phone || !customerInfo.address || !customerInfo.address.street || !customerInfo.address.city || !customerInfo.address.country) {
        return res.status(400).json({ msg: 'Please provide all required order details (storeId, items, customer name, phone, and full address).' });
    }

    try {
        // التحقق من وجود المتجر
        const store = await Store.findById(storeId);
        if (!store) {
            return res.status(404).json({ msg: 'Store not found.' });
        }

        let totalAmount = 0;
        const orderItems = [];

        // التحقق من كل منتج في الطلب، جلب سعره الفعلي، والتحقق من الكمية المتوفرة
        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(404).json({ msg: `Product with ID ${item.productId} not found.` });
            }
            // التأكد من أن المنتج ينتمي إلى المتجر المحدد (مهم جداً)
            if (product.storeId.toString() !== storeId) {
                return res.status(400).json({ msg: `Product ${product.name} does not belong to store ${store.name}.` });
            }
            if (product.stock < item.quantity) {
                return res.status(400).json({ msg: `Insufficient stock for product: ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}` });
            }

            // إضافة تفاصيل المنتج إلى عناصر الطلب، مع السعر الفعلي وقت الطلب
            orderItems.push({
                productId: product._id,
                name: product.name,
                quantity: item.quantity,
                priceAtOrder: product.price // استخدام السعر الفعلي من قاعدة البيانات
            });
            totalAmount += product.price * item.quantity;

            // **اختياري:** تحديث المخزون (ينصح به بشدة)
            product.stock -= item.quantity;
            await product.save();
        }

        // إنشاء الطلب الجديد
        const newOrder = new Order({
            userId,
            storeId,
            items: orderItems,
            customerInfo,
            totalAmount,
            paymentMethod: 'Cash on Delivery', // ثابت للدفع عند الاستلام
            status: 'Pending' // الطلب في حالة انتظار مبدئياً
        });

        await newOrder.save(); // حفظ الطلب في قاعدة البيانات

        res.status(201).json({ msg: 'Order placed successfully (Cash on Delivery)', order: newOrder });

    } catch (err) {
        console.error('Error creating order:', err.message);
        res.status(500).send('Server error');
    }
});

// 2. جلب جميع الطلبات التي قدمها مستخدم معين (المشتري) (GET /api/orders/my-orders) - يتطلب مصادقة
router.get('/my-orders', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const orders = await Order.find({ userId })
            .populate('storeId', 'name domainSlug') // جلب اسم المتجر والـ slug
            .populate('items.productId', 'name imageUrl'); // جلب اسم المنتج ورابط صورته
        res.json(orders);
    } catch (err) {
        console.error('Error fetching user orders:', err.message);
        res.status(500).send('Server error');
    }
});

// 3. جلب جميع الطلبات لمتجر معين (لصاحب المتجر) (GET /api/orders/store-orders/:storeId) - يتطلب مصادقة وتحقق من الملكية
router.get('/store-orders/:storeId', auth, async (req, res) => {
    const storeId = req.params.storeId;
    const ownerId = req.user.id; // معرف المالك من برمجية المصادقة

    try {
        // التحقق من أن المستخدم هو مالك المتجر
        const store = await Store.findById(storeId);
        if (!store) {
            return res.status(404).json({ msg: 'Store not found.' });
        }
        if (store.ownerId.toString() !== ownerId) {
            return res.status(401).json({ msg: 'User not authorized to view orders for this store.' });
        }

        const orders = await Order.find({ storeId })
            .populate('userId', 'username email') // جلب اسم المستخدم والبريد الإلكتروني للمشتري
            .populate('items.productId', 'name imageUrl'); // جلب اسم المنتج ورابط صورته

        res.json(orders);
    } catch (err) {
        console.error('Error fetching store orders:', err.message);
        res.status(500).send('Server error');
    }
});

// **ملاحظة:** يمكن إضافة مسارات لتحديث حالة الطلب (مثلاً: تغيير من 'Pending' إلى 'Processing')
// أو جلب طلب واحد بواسطة ID، وما إلى ذلك، بنفس المنطق.

module.exports = router;