// utils/imagekit.js

const ImageKit = require('imagekit'); // استيراد مكتبة ImageKit
require('dotenv').config(); // تحميل المتغيرات البيئة

// تهيئة ImageKit باستخدام بيانات الاعتماد من .env
const imagekit = new ImageKit({
    publicKey : "public_bgnCE8dGzJKAQMMFgeDLWKzCvC0=", // ضع مفتاحك العام هنا مباشرة بين علامتي تنصيص
    privateKey : "private_5KotXHqIWRlUOtSQuZYPTjGDCOg=", // ضع مفتاحك الخاص هنا مباشرة
    urlEndpoint : "https://ik.imagekit.io/i4zfqn4gl/" // ضع رابط نقطة النهاية هنا مباشرة
});

module.exports = imagekit; // تصدير كائن ImageKit المهيأ