const express = require('express');
const reviewController = require('../controllers/reviewController');
const { protect, restrictTo } = require('../middleware/auth');

// mergeParams: true allows access to params from parent routers (e.g., productId)
const router = express.Router({ mergeParams: true });

router.use(protect);

router
    .route('/')
    .get(reviewController.getAllReviews) // Handles GET /api/products/:productId/reviews
    .post(
        restrictTo('customer'), // Only customers can leave reviews
        reviewController.setProductUserIds, 
        reviewController.createReview // Handles POST /api/products/:productId/reviews
    );

router.get('/my-reviews', reviewController.getMyReviews);

router.route('/:id')
  .put(reviewController.updateReview)
  .delete(reviewController.deleteReview);

router.post('/:id/helpful', reviewController.markReviewAsHelpful);

// Admin routes
router.use(restrictTo('admin'));

router.get('/pending', reviewController.getPendingReviews);
router.patch('/:id/moderate', reviewController.moderateReview);
router.post('/:id/flag', reviewController.flagReview);

module.exports = router;
