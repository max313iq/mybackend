const Comment = require('../models/Comment');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Middleware to set product and user IDs
exports.setProductUserIds = (req, res, next) => {
  if (!req.body.product) req.body.product = req.params.productId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

// Check if the user is the owner of the comment
exports.checkOwner = catchAsync(async (req, res, next) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) {
    return next(new AppError('No comment found with that ID', 404));
  }
  // Grant access if admin or comment owner
  if (comment.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new AppError('You do not have permission to perform this action', 403)
    );
  }
  next();
});

exports.getAllComments = factory.getAll(Comment);
exports.getComment = factory.getOne(Comment);
exports.createComment = factory.createOne(Comment);
exports.updateComment = factory.updateOne(Comment);
exports.deleteComment = factory.deleteOne(Comment);