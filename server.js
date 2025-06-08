// server.js (النسخة النهائية والموحدة)
const dotenv = require('dotenv');

// تحميل متغيرات البيئة - يجب أن يكون هذا أول شيء في التطبيق
dotenv.config();

// --- للتحقق فقط (يمكن حذف هذه السطور لاحقاً بعد التأكد من أن كل شيء يعمل) ---
console.log('--- Environment Variables Check ---');
console.log('MONGO_URI loaded:', !!process.env.MONGO_URI);
console.log('IMAGEKIT_PUBLIC_KEY loaded:', !!process.env.IMAGEKIT_PUBLIC_KEY);
console.log('---------------------------------');
// -------------------------------------------------------------------

const app = require('./app');
const connectDB = require('./db');

// الاتصال بقاعدة البيانات
connectDB();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () =>
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
);

// التعامل مع أي خطأ غير متوقع في التطبيق (مثل خطأ في promise لم يتم التعامل معه)
process.on('unhandledRejection', (err, promise) => {
    console.error(`❌ UNHANDLED REJECTION! 💥 Shutting down...`);
    console.error(err.name, err.message);
    // أغلق الخادم بأمان ثم أوقف العملية
    server.close(() => {
        process.exit(1);
    });
});
