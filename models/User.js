const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A user must have a name'],
    },
    email: {
      type: String,
      required: [true, 'A user must have an email'],
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'A user must have a password'],
      minlength: 8,
      select: false,
    },
    phone: String,
    address: String,
    avatar: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    lastLogin: Date,
    // ✅ قمنا بتعريف كل الصلاحيات الممكنة هنا
    role: {
      type: String,
      enum: ['customer', 'store-owner', 'admin'],
      default: 'customer', // المستخدم الجديد يبدأ كـ 'customer'
    },
    store: {
        type: mongoose.Schema.ObjectId,
        ref: 'Store'
    },
    refreshToken: String
  },
  {
    timestamps: true,
  }
);

// Hashing password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Check if password is correct
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

const User = mongoose.model('User', userSchema);

module.exports = User;