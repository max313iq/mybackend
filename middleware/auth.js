// middleware/auth.js

// هذه دالة middleware بسيطة جداً للتحقق من المصادقة
// في تطبيق حقيقي، ستتحقق هنا من وجود JWT (JSON Web Token) وصلاحيته
const authMiddleware = (req, res, next) => {
    // مؤقتاً لغرض الاختبار: افترض أن معرف المستخدم موجود في req.header('user-id')
    // أو يمكنك افتراض وجود مستخدم افتراضي إذا كنت تختبر بدون تسجيل دخول فعلي
    const userId = req.header('user-id'); // أو req.user.id بعد مصادقة كاملة

    if (!userId) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    // في تطبيق حقيقي، هنا ستتحقق من صحة الـ token وتستخرج user.id منه
    // For now, we'll just set a dummy user ID if one is provided
    req.user = { id: userId }; // قم بتعيين userId في كائن الطلب

    next(); // استدعاء next() للانتقال إلى المسار التالي
};

module.exports = authMiddleware;