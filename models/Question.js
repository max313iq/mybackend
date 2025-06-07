const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.ObjectId,
    ref: 'Product',
    required: true
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  question: {
    type: String,
    required: true
  },
  answer: String,
  answeredBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  answeredAt: Date
}, {
  timestamps: true
});

const Question = mongoose.model('Question', questionSchema);

module.exports = Question;