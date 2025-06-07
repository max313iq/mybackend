const Comment = require('../models/Comment');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Middleware to set Product and User IDs before creating a comment
exports.setProductAndUserIds = (req, res, next) => {
  if (!req.body.product) req.body.product = req.params.id;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

exports.getAllComments = factory.getAll(Comment);
exports.getComment = factory.getOne(Comment);
exports.createComment = factory.createOne(Comment);
exports.updateComment = factory.updateOne(Comment);
exports.deleteComment = factory.deleteOne(Comment);

exports.likeComment = catchAsync(async (req, res, next) => {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
        return next(new AppError('No comment found with that ID', 404));
    }

    // This is a simple like toggle. A more robust system might prevent multiple likes.
    const isLiked = comment.likes.includes(req.user.id);

    if (isLiked) {
        // Unlike
        comment.likes.pull(req.user.id);
    } else {
        // Like
        comment.likes.push(req.user.id);
    }

    await comment.save();

    res.status(200).json({
        success: true,
        data: comment
    });
});