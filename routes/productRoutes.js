const express = require('express');
const productController = require('../controllers/productController');
const reviewController = require('../controllers/reviewController');
const commentController = require('../controllers/commentController');
const { protect, restrictTo, isStoreOwnerForProduct } = require('../middleware/auth');

const router = express.Router();

// --- Public Routes ---
router.get('/', productController.getAllProducts);
router.post('/search', productController.advancedProductSearch);
router.get('/categories', productController.getProductCategories);

// Alias routes for featured, trending etc.
router.get('/featured', productController.aliasTopProducts('-ratingsAverage'), productController.getAllProducts);
router.get('/trending', productController.aliasTopProducts('-ratingsQuantity'), productController.getAllProducts); // Example: trending by number of reviews
router.get('/latest', productController.aliasTopProducts('-createdAt'), productController.getAllProducts);

// Nested routes for reviews, comments, and questions on a specific product
router.route('/:id/reviews')
    .get(reviewController.getAllReviews)
    .post(protect, reviewController.setProductUserIds, reviewController.createReview);

router.route('/:id/comments')
    .get(commentController.getAllComments)
    .post(protect, commentController.setProductAndUserIds, commentController.createComment);

router.route('/:id/questions')
    .get(productController.getProductQuestions)
    .post(protect, productController.askQuestion);

// This must be last of the GET routes to avoid matching specific routes like '/featured'
router.get('/:id', productController.getProduct);


// --- Protected Routes ---
router.use(protect);

router.post('/', restrictTo('store-owner', 'admin'), productController.setStoreId, productController.createProduct);

router.get('/my-products', restrictTo('store-owner', 'admin'), productController.getMyProducts);

router.route('/:id')
    .put(restrictTo('store-owner', 'admin'), isStoreOwnerForProduct, productController.updateProduct)
    .delete(restrictTo('store-owner', 'admin'), isStoreOwnerForProduct, productController.deleteProduct);

// Answering a question
router.post('/:id/questions/:questionId/answer', restrictTo('store-owner', 'admin'), productController.answerQuestion);

// Liking/deleting a comment
router.post('/:id/comments/:commentId/like', commentController.likeComment);
router.delete('/:id/comments/:commentId', commentController.deleteComment); // Assumes factory handles ownership check

module.exports = router;