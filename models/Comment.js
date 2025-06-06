const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Comment text is required.'],
    trim: true,
    maxlength: [500, 'Comment cannot be more than 500 characters.']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// To ensure a user can comment on a product only once
commentSchema.index({ user: 1, product: 1 }, { unique: true });

const Comment = mongoose.model('Comment', commentSchema);
module.exports = Comment;