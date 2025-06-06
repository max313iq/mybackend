const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    default: 1
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// To ensure a user can rate a product or a store only once
ratingSchema.index({ user: 1, product: 1 }, { unique: true, partialFilterExpression: { product: { $exists: true } } });
ratingSchema.index({ user: 1, store: 1 }, { unique: true, partialFilterExpression: { store: { $exists: true } } });


const Rating = mongoose.model('Rating', ratingSchema);
module.exports = Rating;