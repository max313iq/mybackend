// mybackend/routes/productRoutes.js

const express = require('express');
const router = express.Router();
const Product = require('../models/Product'); // استيراد نموذج المنتج
const Store = require('../models/Store');     // استيراد نموذج المتجر (لتحقق الملكية)
const auth = require('../middleware/auth');   // استيراد برمجية المصادقة الوسيطة

// لا نحتاج لـ `multer` هنا لأننا لم نعد نستقبل الملف مباشرة في هذا المسار.
// سيتم استقبال رابط الصورة فقط.

// 1. إضافة منتج جديد إلى متجر معين (POST /api/products/:storeId) - يتطلب مصادقة وملكيه للمتجر
// هذا المسار سيتوقع الآن 'imageUrl' في جسم الطلب (JSON) بعد أن تكون الواجهة الأمامية قد قامت برفع الصورة مسبقاً.
router.post('/:storeId', auth, async (req, res) => {
    // استقبال البيانات النصية ورابط الصورة من جسم الطلب
    const { name, description, price, imageUrl, category, stock } = req.body;
    const storeId = req.params.storeId; // معرف المتجر من الـ URL
    const ownerId = req.user.id;       // معرف المالك من برمجية المصادقة (auth middleware)

    try {
        // التحقق من وجود المتجر وأن المستخدم هو مالكه
        const store = await Store.findById(storeId);
        if (!store) {
            return res.status(404).json({ msg: 'Store not found' });
        }
        if (store.ownerId.toString() !== ownerId) {
            return res.status(401).json({ msg: 'User not authorized to add products to this store' });
        }

        // إنشاء منتج جديد
        const newProduct = new Product({
            storeId,
            name,
            description,
            price,
            imageUrl, // **التعديل هنا: حفظ رابط الصورة المستلم**
            category,
            stock
        });

        await newProduct.save(); // حفظ المنتج في قاعدة البيانات
        res.status(201).json({ msg: 'Product added successfully', product: {
            _id: newProduct._id,
            name: newProduct.name,
            price: newProduct.price,
            imageUrl: newProduct.imageUrl, // يمكن إرجاع الرابط في الرد
            storeId: newProduct.storeId,
            // ... يمكنك إضافة حقول أخرى تريد إرجاعها
        }});

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// 2. جلب جميع المنتجات لمتجر معين (GET /api/products/store/:storeId) - لا يتطلب مصادقة
router.get('/store/:storeId', async (req, res) => {
    try {
        const products = await Product.find({ storeId: req.params.storeId });
        res.json(products); // هذا سيرجع المنتجات بما في ذلك حقل imageUrl (الذي هو الآن رابط)
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// 3. جلب منتج واحد بواسطة معرفه (GET /api/products/:id) - لا يتطلب مصادقة
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ msg: 'Product not found' });
        }
        res.json(product); // هذا سيرجع المنتج بما في ذلك حقل imageUrl
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});


// 4. تحديث منتج (PUT /api/products/:id) - يتطلب مصادقة وملكيه للمتجر
// هذا المسار سيتوقع أيضاً 'imageUrl' في جسم الطلب إذا تم تحديث الصورة.
router.put('/:id', auth, async (req, res) => {
    const { name, description, price, imageUrl, category, stock } = req.body; // استلام رابط الصورة هنا
    const productId = req.params.id;
    const ownerId = req.user.id;

    try {
        let product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ msg: 'Product not found' });
        }

        // التحقق من أن المستخدم المالك للمتجر هو من يحاول التحديث
        const store = await Store.findById(product.storeId);
        if (!store || store.ownerId.toString() !== ownerId) {
            return res.status(401).json({ msg: 'User not authorized to update this product' });
        }

        // تحديث الحقول
        product.name = name || product.name;
        product.description = description || product.description;
        product.price = price || product.price;
        product.imageUrl = imageUrl || product.imageUrl; // **التعديل هنا: تحديث رابط الصورة**
        product.category = category || product.category;
        product.stock = stock || product.stock;

        await product.save();
        res.json({ msg: 'Product updated successfully', product });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// 5. حذف منتج (DELETE /api/products/:id) - يتطلب مصادقة وملكيه للمتجر
router.delete('/:id', auth, async (req, res) => {
    const productId = req.params.id;
    const ownerId = req.user.id;

    try {
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ msg: 'Product not found' });
        }

        // التحقق من أن المستخدم المالك للمتجر هو من يحاول الحذف
        const store = await Store.findById(product.storeId);
        if (!store || store.ownerId.toString() !== ownerId) {
            return res.status(401).json({ msg: 'User not authorized to delete this product' });
        }

        // **ملاحظة: في تطبيق حقيقي، إذا كنت تريد حذف الصورة من ImageKit عند حذف المنتج،
        // ستحتاج إلى استدعاء دالة ImageKit API للحذف هنا باستخدام `product.imageUrl`**

        await Product.findByIdAndDelete(productId);
        res.json({ msg: 'Product removed successfully' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;