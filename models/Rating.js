const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  text: { // A text field for the review content itself
    type: String,
    trim: true
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
  timestamps: true
});

// Ensure a user can rate a product only once
ratingSchema.index({ product: 1, user: 1 }, { unique: true });

// Add a static method to calculate average rating on the Product model
// This is a more advanced topic but is the correct way to handle this.

const Rating = mongoose.model('Rating', ratingSchema);
module.exports = Rating;
