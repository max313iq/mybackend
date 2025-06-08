const express = require('express');
const productController = require('../controllers/productController');
const discoveryController = require('../controllers/discoveryController');
const commentController = require('../controllers/commentController');
const reviewController = require('../controllers/reviewController');
const { protect, restrictTo, isStoreOwnerForProduct } = require('../middleware/auth');

const router = express.Router();

// --- Public Routes ---
router.get('/', discoveryController.searchProducts);
router.post('/search', productController.advancedProductSearch);
router.get('/categories', productController.getProductCategories);

router.get('/featured', productController.aliasTopProducts('-ratingsAverage'), productController.getAllProducts);
router.get('/trending', productController.aliasTopProducts('-ratingsQuantity'), productController.getAllProducts);
router.get('/latest', productController.aliasTopProducts('-createdAt'), productController.getAllProducts);

// This must be the last public GET route, now using /:id for consistency
router.get('/:id', productController.getProduct);


// --- Nested Comments/Reviews/Ratings Routes ---
// Standardized all product-related routes to use /:id
router.get('/:id/comments', commentController.getAllComments);
router
    .route('/:id/reviews')
    .get(reviewController.getProductReviews)
    .post(
        protect,
        restrictTo('customer'),
        reviewController.setProductUserIds,
        reviewController.createReview
    );
router.post(
    '/:id/ratings',
    protect,
    restrictTo('customer'),
    reviewController.setProductUserIds,
    reviewController.createRating
);

// POST a new comment
router.post('/:id/comments', protect, restrictTo('customer'), commentController.createComment);

// POST a like to a specific comment
router.post('/:id/comments/:commentId/like', protect, commentController.likeComment);


// --- Nested Questions Routes ---
router.route('/:id/questions')
    .get(productController.getProductQuestions)
    .post(protect, productController.askQuestion);

router.post('/:id/questions/:questionId/answer', protect, restrictTo('store_owner', 'admin'), productController.answerQuestion);


// --- Protected Product Management Routes ---
router.use(protect);

router.post('/', restrictTo('store_owner', 'admin'), productController.setStoreId, productController.createProduct);

router.get('/my-products', restrictTo('store_owner', 'admin'), productController.getMyProducts);

// Using /:id for consistency
router.route('/:id')
    .put(restrictTo('store_owner', 'admin'), isStoreOwnerForProduct, productController.updateProduct)
    .delete(restrictTo('store_owner', 'admin'), isStoreOwnerForProduct, productController.deleteProduct);

module.exports = router;
