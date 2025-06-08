const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.ObjectId,
          ref: 'Product',
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: Number,
        selectedVariant: Object,
        deliveryOption: {
          type: String,
          enum: ['standard', 'express'],
          default: 'standard',
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    appliedCoupon: {
      code: String,
      discount: Number,
      minAmount: Number,
    },
  },
  {
    timestamps: true,
  }
);

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;