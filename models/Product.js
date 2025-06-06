// mybackend/models/Product.js

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: false,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    // **التعديل هنا: لتخزين رابط الصورة**
    imageUrl: {
        type: String,     // نوع البيانات: نص (لتخزين الرابط)
        required: false   // ليس إجباري
    },
    category: {
        type: String,
        required: false,
        trim: true
    },
    stock: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;