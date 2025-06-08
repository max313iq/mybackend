const express = require('express');
const storeController = require('../controllers/storeController');
const reviewController = require('../controllers/reviewController');
const productController = require('../controllers/productController'); // Import the controller directly
const analyticsController = require('../controllers/analyticsController');
const discoveryController = require('../controllers/discoveryController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Nested route for products within a store
router
  .route('/:storeId/products')
  .get(productController.getAllProducts)
  .post(
    protect,
    restrictTo('store_owner', 'admin'),
    productController.setStoreIdFromParam,
    productController.createProduct
  );

// --- Public Routes ---
router.get('/', discoveryController.searchStores);
router.get('/featured', storeController.getFeaturedStores, storeController.getAllStores);
router.get('/trending', storeController.getTrendingStores, storeController.getAllStores);
router.get('/:storeId', storeController.getStore);

// Nested route for reviews on a specific store
router.route('/:id/reviews')
    .get(reviewController.getAllReviews)
    .post(
        protect,
        reviewController.setStoreUserIds,
        reviewController.createReview
    );

// --- Protected Routes ---
router.use(protect);

router.post('/', restrictTo('customer', 'admin', 'store_owner'), storeController.createStore);
router.get('/my-stores', restrictTo('store_owner', 'admin'), storeController.getMyStores);
router.get('/my-store', restrictTo('store_owner', 'admin'), storeController.getCurrentUserStore, storeController.sendCurrentStore);
router.put('/my-store', restrictTo('store_owner', 'admin'), storeController.updateCurrentUserStore);
router.get('/my-store/orders', restrictTo('store_owner', 'admin'), storeController.getMyStoreOrders);
router.patch('/my-store/orders/:orderId/status', restrictTo('store_owner', 'admin'), storeController.updateMyStoreOrderStatus);
router.put('/:storeId', restrictTo('store_owner', 'admin'), storeController.updateStore);
router.delete('/:storeId', restrictTo('store_owner', 'admin'), storeController.deactivateStore);
router.get('/:storeId/orders', restrictTo('store_owner', 'admin'), storeController.getStoreOrders);
router.patch('/:storeId/orders/:orderId/status', restrictTo('store_owner', 'admin'), storeController.updateStoreOrderStatus);
router.get('/:storeId/analytics', restrictTo('store_owner', 'admin'), analyticsController.getStoreAnalytics);

// Route for following/unfollowing a store
router.post('/:id/follow', storeController.followStore);

module.exports = router;
