// 👇 تم تصحيح طريقة الاستيراد في هذا السطر
const imagekit = require('../utils/imagekit');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.uploadImage = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Please upload an image file.', 400));
  }

  // Uploading the file to ImageKit
  const result = await imagekit.upload({
    file: req.file.buffer, // The image buffer from multer
    fileName: `img-${req.user.id}-${Date.now()}`, // A unique file name
    folder: 'digital-market-assets', // Optional: A folder in your ImageKit account
  });

  res.status(200).json({
    status: 'success',
    message: 'Image uploaded successfully.',
    data: {
      url: result.url,
      fileId: result.fileId
    }
  });
});