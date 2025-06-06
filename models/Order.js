// mybackend/models/Order.js

const mongoose = require('mongoose');

// تعريف مخطط (Schema) الطلب
const orderSchema = new mongoose.Schema({
    userId: { // معرف المستخدم الذي قام بالطلب (المشتري)
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    storeId: { // معرف المتجر الذي تم الطلب منه
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store',
        required: true
    },
    items: [ // مصفوفة تحتوي على تفاصيل المنتجات في الطلب
        {
            productId: { // معرف المنتج
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },
            name: { // اسم المنتج (ليتم حفظه مع الطلب تحسبا لتغير اسم المنتج لاحقاً)
                type: String,
                required: true
            },
            quantity: { // الكمية المطلوبة من هذا المنتج
                type: Number,
                required: true,
                min: 1
            },
            priceAtOrder: { // سعر المنتج وقت الطلب (مهم جداً لتجنب تغيير السعر لاحقاً)
                type: Number,
                required: true,
                min: 0
            }
        }
    ],
    customerInfo: { // معلومات الاتصال بالمشتري
        name: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        },
        address: { // العنوان الكامل
            street: { type: String, required: true },
            city: { type: String, required: true },
            state: { type: String, required: false }, // الولاية/المحافظة (اختياري)
            zipCode: { type: String, required: false }, // الرمز البريدي (اختياري)
            country: { type: String, required: true }
        }
    },
    totalAmount: { // الإجمالي الكلي للطلب
        type: Number,
        required: true,
        min: 0
    },
    paymentMethod: { // طريقة الدفع (ثابتة هنا 'Cash on Delivery')
        type: String,
        default: 'Cash on Delivery',
        enum: ['Cash on Delivery'] // التأكد من أن هذه هي القيمة الوحيدة المسموح بها
    },
    status: { // حالة الطلب
        type: String,
        default: 'Pending', // حالات محتملة: 'Pending', 'Processing', 'Delivered', 'Cancelled'
        enum: ['Pending', 'Processing', 'Delivered', 'Cancelled']
    },
    orderDate: { // تاريخ ووقت تقديم الطلب
        type: Date,
        default: Date.now
    }
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;