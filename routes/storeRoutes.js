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
router.get('/:id', storeController.getStore);

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

router.post('/', restrictTo('customer', 'admin', 'store-owner'), storeController.createStore);
router.delete('/:id', restrictTo('admin'), storeController.deleteStore);

// Routes for the logged-in store owner to manage their own store
router.get('/my-store', restrictTo('store-owner', 'admin'), storeController.getMyStore);
router.put('/my-store', restrictTo('store-owner', 'admin'), storeController.updateMyStore);
router.get('/my-store/orders', restrictTo('store-owner', 'admin'), storeController.getMyStoreOrders);
router.patch('/my-store/orders/:orderId/status', restrictTo('store-owner', 'admin'), storeController.updateMyStoreOrderStatus);

// Route for following/unfollowing a store
router.post('/:id/follow', storeController.followStore);

module.exports = router;
