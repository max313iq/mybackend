// mybackend/routes/storeRoutes.js

const express = require('express');
const router = express.Router();
const Store = require('../models/Store'); // استيراد نموذج المتجر
const auth = require('../middleware/auth'); // استيراد برمجية المصادقة الوسيطة
const slugify = require('slugify'); // استيراد مكتبة slugify لتحويل النصوص لروابط (npm install slugify)
// **ملاحظة:** لا حاجة لاستيراد 'multer' هنا بعد الآن، لأنه يستخدم في 'uploadRoutes.js' فقط.

// 1. إنشاء متجر جديد (POST /api/stores)
// هذا المسار يتوقع بيانات JSON بما في ذلك 'logoUrl' الذي تم الحصول عليه مسبقاً من ImageKit
router.post('/', auth, async (req, res) => {
    // استقبال البيانات من جسم الطلب: name, description, logoUrl, و domainSlug المقترح (إذا وُجد)
    const { name, description, logoUrl, domainSlug: suggestedDomainSlug } = req.body;
    const ownerId = req.user.id; // معرف المالك يأتي من برمجية المصادقة (auth middleware)

    try {
        // التحقق من أن اسم المتجر غير مستخدم بالفعل
        let existingStoreByName = await Store.findOne({ name });
        if (existingStoreByName) {
            return res.status(400).json({ msg: 'Store name already exists. Please choose a different name.' });
        }

        let finalDomainSlug; // المتغير الذي سيحمل الـ domainSlug النهائي
        if (suggestedDomainSlug) {
            // إذا أرسل العميل domainSlug مقترح، استخدمه بعد تنظيفه بـ slugify
            finalDomainSlug = slugify(suggestedDomainSlug, { lower: true, strict: true });
        } else if (name) {
            // إذا لم يرسل العميل domainSlug، قم بتوليده من اسم المتجر
            finalDomainSlug = slugify(name, { lower: true, strict: true });
        } else {
            // لا يوجد اسم ولا domainSlug مقترح، هذا خطأ
            return res.status(400).json({ msg: 'Store name or domain slug is required to create a store.' });
        }

        // **التحقق من فرادة الـ domainSlug (مهم جداً)**
        let slugExists = await Store.findOne({ domainSlug: finalDomainSlug });
        let counter = 1;
        while (slugExists) { // حلقة لضمان أن الـ slug فريد، بإضافة عداد إذا تكرر
            let newSlugBase = suggestedDomainSlug || name; // القاعدة التي سنبني عليها الـ slug المتكرر
            finalDomainSlug = slugify(`${newSlugBase}-${counter}`, { lower: true, strict: true });
            slugExists = await Store.findOne({ domainSlug: finalDomainSlug });
            counter++;
        }

        // إنشاء كائن متجر جديد
        const newStore = new Store({
            ownerId,
            name,
            description,
            logoUrl,          // حفظ رابط الصورة (URL) هنا
            domainSlug: finalDomainSlug // حفظ الـ slug النهائي الذي تم التأكد من فرادته
        });

        // حفظ المتجر في قاعدة البيانات
        await newStore.save();

        // إرسال رد نجاح (Status 201 Created) للواجهة الأمامية
        res.status(201).json({
            msg: 'Store created successfully',
            store: {
                _id: newStore._id,
                name: newStore.name,
                description: newStore.description,
                logoUrl: newStore.logoUrl, // إرجاع رابط الصورة في الرد
                domainSlug: newStore.domainSlug, // إرجاع الـ slug النهائي
                ownerId: newStore.ownerId,
                createdAt: newStore.createdAt
            }
        });

    } catch (err) {
        console.error('Error creating store:', err.message); // تسجيل الخطأ لمساعدتك في التصحيح
        res.status(500).send('Server error'); // إرسال رد خطأ عام
    }
});

// 2. جلب جميع المتاجر (GET /api/stores) - للعرض العام، لا يتطلب مصادقة
router.get('/', async (req, res) => {
    try {
        const stores = await Store.find(); // جلب جميع المتاجر
        res.json(stores); // إرجاع المتاجر (ستتضمن حقل logoUrl كـ رابط)
    } catch (err) {
        console.error('Error fetching all stores:', err.message);
        res.status(500).send('Server error');
    }
});

// 3. جلب متجر معين بواسطة domainSlug (GET /api/stores/by-slug/:domainSlug) - لا يتطلب مصادقة
// هذا المسار يستخدم لزيارة صفحة متجر معين (مثال: منصتك.com/by-slug/my-store-name)
router.get('/by-slug/:domainSlug', async (req, res) => { // تم تغيير المسار ليكون أوضح
    try {
        const store = await Store.findOne({ domainSlug: req.params.domainSlug });
        if (!store) {
            return res.status(404).json({ msg: 'Store not found.' });
        }
        res.json(store); // إرجاع تفاصيل المتجر (ستتضمن logoUrl)
    } catch (err) {
        console.error('Error fetching store by slug:', err.message);
        res.status(500).send('Server error');
    }
});

// 4. جلب متاجر المستخدم (GET /api/stores/my) - يتطلب مصادقة
// هذا المسار يجلب فقط المتاجر التي يملكها المستخدم الحالي
router.get('/my', auth, async (req, res) => {
    try {
        const ownerId = req.user.id; // معرف المالك يأتي من برمجية المصادقة
        const myStores = await Store.find({ ownerId }); // البحث عن المتاجر التي يملكها هذا الـ ownerId
        res.json(myStores);
    } catch (err) {
        console.error('Error fetching user stores:', err.message);
        res.status(500).send('Server error');
    }
});


// 5. تحديث متجر (PUT /api/stores/:id) - يتطلب مصادقة والتحقق من الملكية
router.put('/:id', auth, async (req, res) => {
    // استقبال البيانات المراد تحديثها، بما فيها logoUrl الجديد إن وجد
    const { name, description, logoUrl } = req.body;
    const ownerId = req.user.id; // معرف المالك من برمجية المصادقة
    const storeId = req.params.id; // معرف المتجر من الـ URL

    try {
        let store = await Store.findById(storeId);
        if (!store) {
            return res.status(404).json({ msg: 'Store not found.' });
        }

        // التحقق من أن المستخدم المالك هو من يحاول التحديث
        if (store.ownerId.toString() !== ownerId) {
            return res.status(401).json({ msg: 'User not authorized to update this store.' });
        }

        // تحديث الحقول المتاحة (يتم تحديث الحقل فقط إذا تم إرسال قيمة جديدة له)
        store.name = name !== undefined ? name : store.name;
        store.description = description !== undefined ? description : store.description;
        store.logoUrl = logoUrl !== undefined ? logoUrl : store.logoUrl; // تحديث رابط الشعار

        // **ملاحظة:** إذا أردت تحديث domainSlug، ستحتاج إلى منطق مشابه للإنشاء مع التحقق من الفرادة.

        await store.save(); // حفظ التغييرات في قاعدة البيانات
        res.json({ msg: 'Store updated successfully', store });

    } catch (err) {
        console.error('Error updating store:', err.message);
        res.status(500).send('Server error');
    }
});

// 6. حذف متجر (DELETE /api/stores/:id) - يتطلب مصادقة والتحقق من الملكية
router.delete('/:id', auth, async (req, res) => {
    const ownerId = req.user.id;
    const storeId = req.params.id;

    try {
        const store = await Store.findById(storeId);
        if (!store) {
            return res.status(404).json({ msg: 'Store not found.' });
        }

        // التحقق من أن المستخدم المالك هو من يحاول الحذف
        if (store.ownerId.toString() !== ownerId) {
            return res.status(401).json({ msg: 'User not authorized to delete this store.' });
        }

        // **ملاحظة هامة:** في تطبيق حقيقي، عند حذف المتجر، يجب عليك أيضاً:
        // 1. حذف جميع المنتجات المرتبطة بهذا المتجر من قاعدة البيانات.
        //    مثال: await Product.deleteMany({ storeId: storeId });
        // 2. حذف الصور المرتبطة بهذا المتجر (والمنتجات) من ImageKit لمنع تراكم الملفات غير المستخدمة.
        //    مثال: imagekit.deleteFile(fileId).then(...).catch(...)

        await Store.findByIdAndDelete(storeId); // حذف المتجر من قاعدة البيانات

        res.json({ msg: 'Store removed successfully.' });

    } catch (err) {
        console.error('Error deleting store:', err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router; // تصدير الراوتر لكي يمكن لـ app.js استخدامه