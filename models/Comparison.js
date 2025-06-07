const mongoose = require('mongoose');

const comparisonSchema = new mongoose.Schema({
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

const Comparison = mongoose.model('Comparison', comparisonSchema);

module.exports = Comparison;