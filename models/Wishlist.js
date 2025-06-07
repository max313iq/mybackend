const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  products: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Product'
  }]
}, {
  timestamps: true
});

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

module.exports = Wishlist;