const express = require('express');
const reviewController = require('../controllers/reviewController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

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