// config/db.js
const mongoose = require('mongoose');
require('dotenv').config(); // لتحميل المتغيرات من ملف .env

const connectDB = async () => {
    try {
        // الاتصال بقاعدة البيانات باستخدام رابط الاتصال من .env
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected successfully!');
    } catch (err) {
        console.error('MongoDB connection failed:', err.message);
        // الخروج من العملية إذا فشل الاتصال
        process.exit(1);
    }
};

module.exports = connectDB; // تصدير الدالة لاستخدامها في ملف الخادم الرئيسي