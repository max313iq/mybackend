const mongoose = require('mongoose');
const slugify = require('slugify');

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A store must have a name'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'A store must have a description']
  },
  category: {
    type: String,
    required: [true, 'A store must have a category']
  },
  logo: String,
  phone: String,
  email: String,
  address: String,
  businessLicense: String,
  taxNumber: String,
  deliverySettings: {
    freeDeliveryThreshold: Number,
    defaultDeliveryPrice: Number,
    deliveryAreas: [{
      name: String,
      price: Number,
      estimatedDays: Number
    }]
  },
  joinedDate: {
    type: Date,
    default: Date.now
  },
  productsCount: {
    type: Number,
    default: 0
  },
  reviewsCount: {
    type: Number,
    default: 0
  },
  followersCount: {
    type: Number,
    default: 0
  },
  slug: {
    type: String,
    unique: true
  },
  owner: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
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
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  rejectionReason: String,
  followers: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

storeSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = slugify(this.name, { lower: true });
  }
  next();
});

const Store = mongoose.model('Store', storeSchema);

module.exports = Store;