const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const imagekit = require('../utils/imagekit');
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


// Helper to process and upload a single image buffer to ImageKit
const processAndUpload = async (file, options) => {
  const { type = 'general', maxWidth, quality } = options;
  const id = uuidv4();

  let pipeline = sharp(file.buffer);
  if (maxWidth) {
    pipeline = pipeline.resize({ width: parseInt(maxWidth, 10), withoutEnlargement: true });
  }
  const q = quality ? parseInt(quality, 10) : 80;
  const processedBuffer = await pipeline.jpeg({ quality: q }).toBuffer();
  const metadata = await sharp(processedBuffer).metadata();

  const folder = `digital-market-assets/${type}`;
  const mainUpload = await imagekit.upload({
    file: processedBuffer,
    fileName: `${id}.jpg`,
    folder
  });

  const thumbBuffer = await sharp(processedBuffer).resize({ width: 200 }).toBuffer();
  const thumbUpload = await imagekit.upload({
    file: thumbBuffer,
    fileName: `${id}_thumb.jpg`,
    folder: `${folder}/thumbnails`
  });

  return {
    url: mainUpload.url,
    thumbnailUrl: thumbUpload.url,
    filename: mainUpload.name,
    originalName: file.originalname,
    size: processedBuffer.length,
    mimetype: 'image/jpeg',
    dimensions: {
      width: metadata.width,
      height: metadata.height
    }
  };
};

// دالة لمعالجة رفع الصور بعد استقبالها من Multer
exports.handleImageUpload = catchAsync(async (req, res, next) => {
  if (req.file) {
    const data = await processAndUpload(req.file, req.body);
    return res.status(200).json({ success: true, data });
  }

  if (req.files) {
    const results = await Promise.all(req.files.map(file => processAndUpload(file, req.body)));
    const simplified = results.map(r => ({
      url: r.url,
      thumbnailUrl: r.thumbnailUrl,
      filename: r.filename,
      size: r.size
    }));
    return res.status(200).json({ success: true, data: simplified, uploaded: simplified.length, failed: 0 });
  }

  return next(new AppError('No image file uploaded.', 400));
});


// دالة لحذف صورة
exports.deleteImage = catchAsync(async (req, res, next) => {
  const { imageUrl } = req.body;
  if (!imageUrl) {
    return next(new AppError('Please provide an image URL to delete.', 400));
  }

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