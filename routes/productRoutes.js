const express = require('express');
const productController = require('../controllers/productController');
const reviewController = require('../controllers/reviewController');
const commentController = require('../controllers/commentController');
const { protect, restrictTo, isStoreOwnerForProduct } = require('../middleware/auth');

// Add { mergeParams: true } to handle params from parent routers (like storeId)
const router = express.Router({ mergeParams: true });

// --- Public Routes ---
router.get('/', productController.getAllProducts);
router.post('/search', productController.advancedProductSearch);
router.get('/categories', productController.getProductCategories);

router.get('/featured', productController.aliasTopProducts('-ratingsAverage'), productController.getAllProducts);
router.get('/trending', productController.aliasTopProducts('-ratingsQuantity'), productController.getAllProducts);
router.get('/latest', productController.aliasTopProducts('-createdAt'), productController.getAllProducts);

// Nested routes for reviews, comments, ratings, and questions on a specific product
router.route('/:id/reviews')
    .get(reviewController.getAllReviews)
    .post(protect, reviewController.setProductUserIds, reviewController.createReview);

router.route('/:id/ratings')
    .post(protect, reviewController.setProductUserIds, reviewController.createRating);

router.route('/:id/comments')
    .get(commentController.getAllComments)
    .post(protect, commentController.setProductAndUserIds, commentController.createComment);

router.route('/:id/questions')
    .get(productController.getProductQuestions)
    .post(protect, productController.askQuestion);

// This must be the last public GET route to avoid matching specific routes like '/featured'
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
router.delete('/:id/comments/:commentId', commentController.deleteComment);

module.exports = router;
