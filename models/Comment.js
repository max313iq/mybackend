const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'A comment must have text.'],
    trim: true,
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
  },
  likes: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Automatically populate the user who made the comment
commentSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: 'name'
  });
  next();
});

const Comment = mongoose.model('Comment', commentSchema);
module.exports = Comment;
