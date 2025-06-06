const mongoose = require('mongoose');
const slugify = require('slugify');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A product must have a name.'],
    trim: true,
    maxlength: [100, 'Product name cannot be more than 100 characters.'],
  },
  slug: String,
  description: {
    type: String,
    required: [true, 'A product must have a description.'],
    trim: true,
  },
  price: {
    type: Number,
    required: [true, 'A product must have a price.'],
  },
  // 👇 تم تعديل هذا الحقل
  images: {
    type: [String],
    required: [true, 'Please upload at least one image for the product.'],
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'A product must have at least one image.'
    }
  },
  category: {
      type: String,
      required: [true, 'A product must have a category.']
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
  },
  stock: {
      type: Number,
      required: [true, 'Please provide product stock quantity.'],
      default: 1
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
    set: val => Math.round(val * 10) / 10
  },
  ratingsQuantity: {
      type: Number,
      default: 0
  },
  isAvailable: {
      type: Boolean,
      default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

productSchema.index({ slug: 1 });
productSchema.index({ store: 1 });
productSchema.index({ name: 'text', description: 'text' });

productSchema.virtual('ratings', {
    ref: 'Rating',
    localField: '_id',
    foreignField: 'product'
});

productSchema.virtual('comments', {
    ref: 'Comment',
    localField: '_id',
    foreignField: 'product'
});

productSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true, replacement: '-' });
  this.isAvailable = this.stock > 0;
  next();
});

productSchema.pre('findOneAndUpdate', function(next) {
    const update = this.getUpdate();
    if (update.stock != null) {
        update.isAvailable = update.stock > 0;
    }
    next();
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;