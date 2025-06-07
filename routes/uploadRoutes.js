const express = require('express');
const uploadController = require('../controllers/uploadController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// جميع المسارات هنا محمية وتتطلب تسجيل الدخول
router.use(protect);

/*
 * @route   POST /api/upload/image
 * @desc    Upload single image
 * @access  Private
 */
router.post(
    '/image',
    uploadController.uploadSingleImage, // 1. استقبال صورة واحدة
    uploadController.handleImageUpload  // 2. معالجة الطلب وإرسال الرد
);

/*
 * @route   POST /api/upload/images
 * @desc    Upload multiple images
 * @access  Private
 */
router.post(
    '/images',
    uploadController.uploadMultipleImages, // 1. استقبال عدة صور
    uploadController.handleImageUpload    // 2. معالجة الطلب وإرسال الرد
);

/*
 * @route   DELETE /api/upload/image
 * @desc    Delete image
 * @access  Private
 */
router.delete('/image', uploadController.deleteImage);

module.exports = router;