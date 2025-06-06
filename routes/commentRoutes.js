const express = require('express');
const commentController = require('../controllers/commentController');
// Use destructuring here as well
const { protect, restrictTo } = require('../middleware/auth');

// mergeParams: true allows it to get params from other routers (e.g., productRouter).
const router = express.Router({ mergeParams: true });

// All routes below require the user to be logged in.
router.use(protect);

router
  .route('/')
  .get(commentController.getAllComments)
  .post(
    restrictTo('user'), // Only normal users can comment
    commentController.setProductUserIds,
    commentController.createComment
  );

router
  .route('/:id')
  .get(commentController.getComment)
  .patch(
    commentController.checkOwner, // Check if user owns the comment before updating
    commentController.updateComment
  )
  .delete(
    commentController.checkOwner, // Check if user owns the comment before deleting
    commentController.deleteComment
  );

module.exports = router;