const express = require('express');
const adminController = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.use(protect, restrictTo('admin'));

// Stats Routes
router.get('/dashboard', adminController.getDashboard);

// User Management
router.get('/users', adminController.getAllUsers);
router.patch('/users/:id/status', adminController.updateUserStatus);
router.delete('/users/:id', adminController.deleteUser);

// Store Management
router.get('/stores/pending', adminController.getPendingStores);
router.patch('/stores/:id/approve', adminController.approveStore);
router.patch('/stores/:id/reject', adminController.rejectStore);

// Review Management
router.get('/reviews/flagged', adminController.getFlaggedReviews);
router.post('/reviews/:id/flag', adminController.flagReview); // Note: this was missing from the spec but is logical

module.exports = router;