const express = require('express');
const ratingController = require('../controllers/ratingController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// Apply protection to all rating routes
router.use(protect);

router
    .route('/')
    .get(ratingController.getAllRatings)
    .post(
        restrictTo('user'), // Only users can create a rating
        ratingController.setTargetIds,
        ratingController.createRating
    );

router
    .route('/:id')
    .get(ratingController.getRating)
    .patch(
        restrictTo('user', 'admin'), // User who created it or an admin can update
        ratingController.updateRating
    )
    .delete(
        restrictTo('user', 'admin'), // User who created it or an admin can delete
        ratingController.deleteRating
    );

module.exports = router;