const express = require('express');
const multer = require('multer');
const { protect } = require('../middleware/auth');

console.log('---');
console.log('ℹ️ (3) File [routes/uploadRoutes.js] is requiring the upload controller...');
const uploadController = require('../controllers/uploadController');
console.log('✅ (4) Imported `uploadController` object is:', uploadController);
console.log('➡️ (5) The type of `uploadController.uploadImage` is:', typeof uploadController.uploadImage);
console.log('---');


const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image')) {
      cb(null, true);
    } else {
      cb(new AppError('Not an image! Please upload only images.', 400), false);
    }
  }
});

router.post(
  '/',
  protect,
  upload.single('image'),
  uploadController.uploadImage
);

module.exports = router;