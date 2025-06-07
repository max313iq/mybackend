const multer = require('multer');
const imagekit = require('../utils/imagekit'); // تأكد من أن هذا الملف آمن ويستخدم process.env
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// إعداد Multer لتخزين الملفات في الذاكرة كـ buffer
const multerStorage = multer.memoryStorage();

// فلتر للتحقق من أن الملفات المرفوعة هي صور فقط
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

// دالة وسيطة (middleware) لاستقبال صورة واحدة
exports.uploadSingleImage = upload.single('image');

// دالة وسيطة (middleware) لاستقبال عدة صور (حتى 10)
exports.uploadMultipleImages = upload.array('images', 10);


// دالة لمعالجة رفع الصور بعد استقبالها من Multer
exports.handleImageUpload = catchAsync(async (req, res, next) => {
    // في حالة رفع صورة واحدة
    if (req.file) {
        const result = await imagekit.upload({
            file: req.file.buffer,
            fileName: `img-${req.user.id}-${Date.now()}`,
            folder: 'digital-market-assets',
        });
        
        return res.status(200).json({
            success: true,
            data: { imageUrl: result.url }
        });
    }

    // في حالة رفع عدة صور
    if (req.files) {
        const uploadPromises = req.files.map(file => 
            imagekit.upload({
                file: file.buffer,
                fileName: `img-${req.user.id}-${Date.now()}-${file.originalname}`,
                folder: 'digital-market-assets',
            })
        );
        
        const results = await Promise.all(uploadPromises);
        const imageUrls = results.map(r => r.url);
        
        return res.status(200).json({
            success: true,
            data: { imageUrls }
        });
    }

    return next(new AppError('No image file uploaded.', 400));
});


// دالة لحذف صورة
exports.deleteImage = catchAsync(async (req, res, next) => {
    const { imageUrl } = req.body;
    if (!imageUrl) {
        return next(new AppError('Please provide an image URL to delete.', 400));
    }

    // استخراج fileId من رابط الصورة
    // مثال: https://ik.imagekit.io/your_id/folder/file_id.jpg -> file_id
    const fileId = imagekit.getFileId(imageUrl);

    if (!fileId) {
        return next(new AppError('Invalid ImageKit URL provided.', 400));
    }

    await imagekit.deleteFile(fileId);

    res.status(204).json({
        success: true,
        data: null
    });
});