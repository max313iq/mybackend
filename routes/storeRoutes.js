const express = require('express');
const storeController = require('../controllers/storeController');
const { protect, restrictTo } = require('../middleware/auth');
const ratingRouter = require('./ratingRoutes');
const productRouter = require('./productRoutes');

const router = express.Router();

// --- Nested Routes ---
// Forward requests like /api/stores/:storeId/ratings to the ratingRouter
router.use('/:storeId/ratings', ratingRouter);
router.use('/:storeId/products', productRouter);


// --- Public, Store Owner, and Admin Routes ---

// GET /api/stores (Public)
// POST /api/stores (Protected for Store Owners)
router
    .route('/')
    .get(storeController.getAllStores)
    .post(protect, restrictTo('store-owner'), storeController.createStore);

// IMPORTANT: Define specific static routes BEFORE generic parameterized routes like /:id

// GET /api/stores/my-store (Protected for Store Owners)
router
    .route('/my-store')
    .get(protect, restrictTo('store-owner'), storeController.getMyStore)
    .patch(protect, restrictTo('store-owner'), storeController.updateMyStore);

// GET /api/stores/my-store/orders (Protected for Store Owners)
router.get('/my-store/orders', protect, restrictTo('store-owner'), storeController.getMyStoreOrders);

// PATCH /api/stores/my-store/orders/:id/status (Protected for Store Owners)
router.patch('/my-store/orders/:id/status', protect, restrictTo('store-owner'), storeController.updateStoreOrderStatus);


// --- Routes with parameters (should be last) ---

// GET /api/stores/some-store-id (Public)
// PATCH /api/stores/some-store-id (Protected for Admin)
// DELETE /api/stores/some-store-id (Protected for Admin)
router
    .route('/:id')
    .get(storeController.getStore)
    .patch(protect, restrictTo('admin'), storeController.updateStore)
    .delete(protect, restrictTo('admin'), storeController.deleteStore);


module.exports = router;