const mongoose = require('mongoose');
const slugify = require('slugify');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A product must have a name'],
    trim: true
  },
  slug: String,
  description: {
    type: String,
    required: [true, 'A product must have a description']
  },
  price: {
    type: Number,
    required: [true, 'A product must have a price']
  },
  category: {
    type: String,
    required: [true, 'A product must have a category']
  },
  stock: {
    type: Number,
    required: [true, 'A product must have a stock quantity'],
    default: 0
  },
  lowStockThreshold: {
    type: Number,
    default: 10
  },
  originalPrice: Number,
  views: {
    type: Number,
    default: 0
  },
  soldCount: {
    type: Number,
    default: 0
  },
  images: [String],
  specifications: Object,
  tags: [String],
  store: {
    type: mongoose.Schema.ObjectId,
    ref: 'Store',
    required: true
  },
  // References to separate Comment and Rating documents
  comments: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Comment'
  }],
  ratings: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Rating'
  }],
  ratingsAverage: {
    type: Number,
    default: 0,
    min: [0, 'Rating must be above 0'],
    max: [5, 'Rating must be below 5'],
    set: val => Math.round(val * 10) / 10
  },
  ratingsQuantity: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

productSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// Virtual 'reviews' field that populates from the Rating model
productSchema.virtual('reviews', {
  ref: 'Rating',
  foreignField: 'product',
  localField: '_id'
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
