const express = require('express');
const storeController = require('../controllers/storeController');
const reviewController = require('../controllers/reviewController');
const productController = require('../controllers/productController'); // Import the controller directly
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Nested route: Redirect requests for products within a store to the product controller
// This handles GET /api/stores/:storeId/products
// This approach avoids circular dependencies between routers.
router.get('/:storeId/products', productController.getAllProducts);

// --- Public Routes ---
router.get('/', storeController.getAllStores);
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
router.put('/:storeId', restrictTo('store_owner', 'admin'), storeController.updateStore);
router.delete('/:storeId', restrictTo('store_owner', 'admin'), storeController.deactivateStore);
router.get('/:storeId/orders', restrictTo('store_owner', 'admin'), storeController.getStoreOrders);
router.patch('/:storeId/orders/:orderId/status', restrictTo('store_owner', 'admin'), storeController.updateStoreOrderStatus);

// Route for following/unfollowing a store
router.post('/:id/follow', storeController.followStore);

module.exports = router;
