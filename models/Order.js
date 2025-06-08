const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true
  },
  orderItems: [
    {
      product: {
        type: mongoose.Schema.ObjectId,
        ref: 'Product',
        required: true
      },
      quantity: {
        type: Number,
        required: true
      },
      price: {
        type: Number,
        required: true
      },
      deliveryOption: String
    }
  ],
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  store: {
    type: mongoose.Schema.ObjectId,
    ref: 'Store',
    required: true
  },
  shippingAddress: {
    fullName: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    phone: { type: String, required: true }
  },
  paymentMethod: {
    type: String,
    required: true
  },
  totalPrice: {
    type: Number,
    required: true
  },
  shippingCost: {
    type: Number,
    default: 0
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  finalTotal: Number,
  trackingNumber: String,
  estimatedDelivery: Date,
  actualDelivery: Date,
  notes: String,
  statusHistory: [
    {
      status: String,
      timestamp: Date,
      note: String
    }
  ],
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  paidAt: Date,
  isDelivered: {
    type: Boolean,
    default: false
  },
  deliveredAt: Date
}, {
  timestamps: true
});

orderSchema.pre('save', function(next) {
  if (!this.orderNumber) {
    this.orderNumber = `ORD-${Date.now()}-${Math.round(Math.random() * 1000)}`;
  }
  if (!this.finalTotal) {
    this.finalTotal = (this.totalPrice || 0) + (this.shippingCost || 0) + (this.taxAmount || 0);
  }
  next();
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;