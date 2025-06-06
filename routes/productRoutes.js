const express = require('express');
const productController = require('../controllers/productController');
const { protect, restrictTo } = require('../middleware/auth');
const commentRouter = require('./commentRoutes');
const ratingRouter = require('./ratingRoutes');

// mergeParams allows access to params from parent routers (like storeId)
const router = express.Router({ mergeParams: true });

// Nested routes: Redirect to other routers
router.use('/:productId/comments', commentRouter);
router.use('/:productId/ratings', ratingRouter);

// --- Public Routes ---
// This will handle both /api/products and /api/stores/:storeId/products
router
  .route('/')
  .get(productController.getAllProducts); 
  
router.get('/stats', productController.getHomePageStats); // For home page stats

router
  .route('/:id')
  .get(productController.getProduct); 

// --- Authenticated Routes for Store Owners ---
router.use(protect, restrictTo('store-owner'));

router
  .route('/')
  .post(
    productController.checkStoreOwner,
    productController.createProduct
  );

router.get('/my-products', productController.getMyProducts);

router
  .route('/:id')
  .patch(
    productController.checkStoreOwner,
    productController.updateProduct
  )
  .delete(
    productController.checkStoreOwner,
    productController.deleteProduct
  );

module.exports = router;