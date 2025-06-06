const mongoose = require('mongoose');
const slugify = require('slugify');

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A store must have a name.'],
    unique: true,
    trim: true,
    maxlength: [50, 'Store name cannot be more than 50 characters.'],
  },
  slug: String,
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters.'],
  },
  // 👇 تم تعديل هذا الحقل
  logo: {
    type: String, // URL to the logo image
    required: [true, 'Store logo is required.'],
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  }],
  category: {
    type: String,
    required: [true, 'Please specify a category for your store.'],
    enum: [
        'Electronics',
        'Clothing',
        'Books',
        'Home & Kitchen',
        'Sports & Outdoors',
        'Health & Beauty',
        'Toys & Games',
        'Other'
    ]
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
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

storeSchema.virtual('ratings', {
    ref: 'Rating',
    localField: '_id',
    foreignField: 'store'
});

storeSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true, replacement: '-' });
  next();
});

const Store = mongoose.model('Store', storeSchema);

module.exports = Store;