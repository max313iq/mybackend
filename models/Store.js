// mybackend/models/Store.js

const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        required: false,
        trim: true
    },
    domainSlug: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    // **التعديل هنا: لتخزين رابط الصورة**
    logoUrl: {
        type: String,     // نوع البيانات: نص (لتخزين الرابط)
        required: false   // ليس إجباري
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Store = mongoose.model('Store', storeSchema);

module.exports = Store;