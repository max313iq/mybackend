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
  images: [String],
  specifications: Object,
  tags: [String],
  store: {
    type: mongoose.Schema.ObjectId,
    ref: 'Store',
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
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true }, // تفعيل ظهور الحقول الافتراضية عند تحويل البيانات إلى JSON
  toObject: { virtuals: true } // تفعيل ظهور الحقول الافتراضية عند تحويل البيانات إلى كائن
});

productSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// --- بداية التعديل ---
// إنشاء علاقة افتراضية مع مودل التقييمات (Review)
// هذا يسمح لنا بجلب التقييمات مع المنتج دون حفظها في قاعدة بيانات المنتج
productSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'product',
  localField: '_id'
});
// --- نهاية التعديل ---


const Product = mongoose.model('Product', productSchema);

module.exports = Product;