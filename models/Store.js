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
  deliveryInfo: {
    areas: [String],
    freeDeliveryThreshold: Number,
    averageDeliveryTime: Number
  },
  joinedDate: {
    type: Date,
    default: Date.now
  },
  followersCount: {
    type: Number,
    default: 0
  },
  domainSlug: {
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
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

storeSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.domainSlug) {
    this.domainSlug = slugify(this.name, { lower: true });
  }
  next();
});

const Store = mongoose.model('Store', storeSchema);

module.exports = Store;