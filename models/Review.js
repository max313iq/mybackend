const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.ObjectId,
    ref: 'Product'
  },
  store: {
    type: mongoose.Schema.ObjectId,
    ref: 'Store'
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  title: {
    type: String,
    trim: true
  },
  comment: {
    type: String,
    required: true
  },
  pros: [String],
  cons: [String],
  verified: {
    type: Boolean,
    default: false
  },
  helpful: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['approved', 'rejected', 'pending'],
    default: 'pending'
  },
  rejectionReason: String,
  flagged: {
    isFlagged: { type: Boolean, default: false },
    reason: String
  }
}, {
  timestamps: true
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;