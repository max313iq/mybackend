// routes/userRoutes.js
const express = require('express');
const router = express.Router(); // لإنشاء مسارات قابلة للتصدير
const User = require('../models/User'); // استيراد نموذج المستخدم

// المسار لعملية تسجيل المستخدم
// نوع الطلب سيكون POST، وعنوان المسار سيكون '/api/users/register'
router.post('/register', async (req, res) => {
    // 1. استقبال البيانات من طلب الواجهة الأمامية
    const { username, email, password } = req.body;

    // 2. التحقق البسيط من وجود البيانات
    if (!username || !email || !password) {
        return res.status(400).json({ msg: 'Please enter all fields' });
    }

    try {
        // 3. التحقق مما إذا كان المستخدم موجوداً بالفعل (بالبريد الإلكتروني أو اسم المستخدم)
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User with that email already exists' });
        }

        user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ msg: 'Username already taken' });
        }

        // 4. إنشاء مستخدم جديد بناءً على النموذج
        // في مشروع حقيقي: هنا يتم تشفير كلمة المرور قبل الحفظ
        user = new User({
            username,
            email,
            password // تذكر: يجب تشفيرها في تطبيق حقيقي
        });

        // 5. حفظ المستخدم في قاعدة البيانات
        await user.save();

        // 6. إرسال رد إيجابي للواجهة الأمامية
        res.status(201).json({ msg: 'User registered successfully', user: { id: user._id, username: user.username, email: user.email } });

    } catch (err) {
        // 7. التعامل مع الأخطاء
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router; // تصدير المسارات