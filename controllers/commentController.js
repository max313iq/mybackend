// This controller now works with a standalone 'Comment' model again.
const Comment = require('../models/Comment');
const Product = require('../models/Product'); // Required to link the comment back to the product
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

/**
 * @desc    Get all comments for a specific product
 * @route   GET /api/products/:id/comments
 * @access  Public
 */
exports.getAllComments = catchAsync(async (req, res, next) => {
    // Find all comments that reference the product ID from the URL
    const comments = await Comment.find({ product: req.params.id });

    // Send response with consistent structure
    res.status(200).json({
        status: 'success',
        results: comments.length,
        data: {
            data: comments
        }
    });
});

/**
 * @desc    Create a new comment for a specific product
 * @route   POST /api/products/:id/comments
 * @access  Private (user must be logged in)
 */
exports.createComment = catchAsync(async (req, res, next) => {
    // 1. Create the new comment document
    const newComment = await Comment.create({
        text: req.body.text,
        product: req.params.id, // Get product ID from the URL
        user: req.user.id       // Get user ID from the protect middleware
    });

    // 2. (Optional but good practice) Add the comment reference to the Product document
    await Product.findByIdAndUpdate(req.params.id, {
        $push: { comments: newComment._id }
    });

    // Send response with consistent structure
    res.status(201).json({
        status: 'success',
        data: {
            data: newComment
        }
    });
});

/**
 * @desc    Like a specific comment
 * @route   POST /api/products/:id/comments/:commentId/like
 * @access  Private (user must be logged in)
 */
exports.likeComment = catchAsync(async (req, res, next) => {
    // Find the comment by its own ID from the URL
    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
        return next(new AppError('No comment found with that ID', 404));
    }

    // A simple increment. A real-world app might prevent multiple likes from the same user.
    // This assumes the 'Comment' schema has a 'likes' field of type Number.
    comment.likes = (comment.likes || 0) + 1;
    await comment.save();

    // Send response with consistent structure
    res.status(200).json({
        status: 'success',
        data: {
            data: comment
        }
    });
});
