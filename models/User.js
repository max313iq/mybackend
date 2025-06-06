// models/User.js
const mongoose = require('mongoose');

// تعريف مخطط (Schema) المستخدم
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true, // يجب أن يكون موجوداً
        unique: true,   // يجب أن يكون فريداً (لا يمكن لمستخدمين أن يكون لديهم نفس اسم المستخدم)
        trim: true      // إزالة المسافات البيضاء من البداية والنهاية
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true // تحويل البريد الإلكتروني إلى حروف صغيرة
    },
    password: { // في مشروع حقيقي، يجب تشفير كلمة المرور هنا!
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now // التاريخ الافتراضي هو وقت الإنشاء الحالي
    }
});

// إنشاء نموذج (Model) من المخطط
const User = mongoose.model('User', userSchema);

module.exports = User; // تصدير النموذج لاستخدامه في الـ API