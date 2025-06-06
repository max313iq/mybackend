// routes/uploadRoutes.js

const express = require('express');
const router = express.Router();
const multer = require('multer'); // استيراد Multer
const imagekit = require('../utils/imagekit'); // استيراد ImageKit المهيأ
const auth = require('../middleware/auth'); // middleware المصادقة

// إعداد Multer لتخزين الملف في الذاكرة مؤقتًا
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// مسار لرفع صورة واحدة (مثلاً: صورة متجر أو منتج)
// POST /api/upload/single
router.post('/single', auth, upload.single('image'), async (req, res) => {
    // 'image' هنا هو اسم الحقل الذي يجب أن يكون في FormData من الواجهة الأمامية
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'No image file uploaded' });
        }

        // رفع الصورة إلى ImageKit
        const result = await imagekit.upload({
            file: req.file.buffer, // بيانات الصورة الثنائية
            fileName: req.file.originalname, // اسم الملف الأصلي
            folder: '/ecommerce_platform', // اسم المجلد في ImageKit لتنظيم الصور
        });

        // إرجاع رابط الصورة المرفوعة
        res.json({ imageUrl: result.url });

    } catch (err) {
        console.error('ImageKit upload error:', err.message);
        res.status(500).send('Server error during image upload');
    }
});

module.exports = router;