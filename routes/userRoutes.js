const express = require('express');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController'); // استيراد وحدة التحكم الجديدة
const { protect } = require('../middleware/auth'); // استيراد دالة الحماية

const router = express.Router();

// Public routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);

// Protected route to get current user's profile
router.get('/me', protect, userController.getMe);

module.exports = router;