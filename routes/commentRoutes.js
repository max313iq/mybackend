const express = require('express');
const commentController = require('../controllers/commentController');
const { protect, restrictTo } = require('../middleware/auth');

// mergeParams: true allows it to get params from parent routers (e.g., productId from productRouter)
const router = express.Router({ mergeParams: true });

// All routes below require the user to be logged in.
router.use(protect);

router
  .route('/')
  .get(commentController.getAllComments) // Handles GET /api/products/:productId/comments
  .post(
    restrictTo('customer'), // Only customers can comment
    // The setProductAndUserIds middleware was removed as it's no longer needed
    commentController.createComment // Handles POST /api/products/:productId/comments
  );

router
    .route('/:commentId/like')
    .post(commentController.likeComment); // Handles POST /api/products/:productId/comments/:commentId/like

// Note: GET/PATCH/DELETE for a single comment is not implemented in the controller yet
// router
//   .route('/:id')
//   .get(commentController.getComment)
//   .patch(commentController.updateComment)
//   .delete(commentController.deleteComment);

module.exports = router;
