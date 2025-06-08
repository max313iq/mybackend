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
  brand: String,
  weight: Number,
  dimensions: {
    length: Number,
    width: Number,
    height: Number
  },
  sku: String,
  returnPolicy: String,
  warranty: String,
  views: {
    type: Number,
    default: 0
  },
  soldCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  images: [String],
  specifications: Object,
  tags: [String],
  deliverySettings: {
    customDeliveryPrice: Number,
    expressDelivery: {
      available: Boolean,
      price: Number,
      estimatedDays: Number
    }
  },
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

// Calculate discount percentage virtual
productSchema.virtual('discount').get(function () {
  if (this.originalPrice && this.price) {
    const discount = ((this.originalPrice - this.price) / this.originalPrice) * 100;
    return Math.round(discount * 10) / 10;
  }
  return 0;
});

// Virtual 'reviews' field that populates from the Rating model
productSchema.virtual('reviews', {
  ref: 'Rating',
  foreignField: 'product',
  localField: '_id'
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
