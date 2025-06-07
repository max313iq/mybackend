const express = require('express');
const storeController = require('../controllers/storeController');
const reviewController = require('../controllers/reviewController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// --- Public Routes ---
router.get('/', storeController.getAllStores);
router.get('/featured', storeController.getFeaturedStores, storeController.getAllStores);
router.get('/trending', storeController.getTrendingStores, storeController.getAllStores);
router.get('/:id', storeController.getStore);

// Reviews on a specific store
router.route('/:id/reviews')
    .get(reviewController.getAllReviews)
    .post(
        protect,
        reviewController.setStoreUserIds, // Correct middleware
        reviewController.createReview
    );


// --- Protected Routes ---
router.use(protect);
router.post('/', restrictTo('customer', 'admin', 'store-owner'), storeController.createStore);
router.delete('/:id', restrictTo('admin'), storeController.deleteStore);

router.get('/my-store', restrictTo('store-owner', 'admin'), storeController.getMyStore);
router.put('/my-store', restrictTo('store-owner', 'admin'), storeController.updateMyStore);
router.get('/my-store/orders', restrictTo('store-owner', 'admin'), storeController.getMyStoreOrders);
router.patch('/my-store/orders/:orderId/status', restrictTo('store-owner', 'admin'), storeController.updateMyStoreOrderStatus);

router.post('/:id/follow', storeController.followStore);

module.exports = router;