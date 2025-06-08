const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../models/User');
const Store = require('../models/Store');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const signRefreshToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const createSendToken = (user, statusCode, res, message, extra = {}) => {

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  user.refreshToken = refreshToken;
  user.save({ validateBeforeSave: false });

  let userObj = user.toObject ? user.toObject() : user;
  delete userObj.password;
  userObj = { ...userObj, ...extra };

  const response = {
    success: true,
    data: { user: userObj },
    token,
    refreshToken
  };

  if (message) response.message = message;

  res.status(statusCode).json(response);

    data: { user },
    token,
    refreshToken
  });
};

// Helper function to filter object properties
const filterObj = (obj, ...allowedFields) => {
    const newObj = {};
    Object.keys(obj).forEach(el => {
        if (allowedFields.includes(el)) newObj[el] = obj[el];
    });
    return newObj;
};

exports.registerUser = catchAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);

  createSendToken(newUser, 201, res, 'User registered successfully');
});

exports.loginUser = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }
  
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  user.lastLogin = Date.now();
  await user.save({ validateBeforeSave: false });

  createSendToken(user, 200, res);
  const stores = await Store.find({ owner: user._id }).select('_id');
  const storeIds = stores.map(s => s._id);

  createSendToken(user, 200, res, 'Login successful', { stores: storeIds });
});

exports.getCurrentUser = catchAsync(async (req, res, next) => {
  const stores = await Store.find({ owner: req.user.id }).select('_id');
  const userObj = req.user.toObject();
  userObj.stores = stores.map(s => s._id);
  res.status(200).json({ success: true, data: userObj });
});

exports.updateProfile = catchAsync(async (req, res, next) => {
  if (req.body.password) {
    return next(
      new AppError(
        'This route is not for password updates.',
        400
      )
    );
  }

  const filteredBody = filterObj(req.body, 'name', 'email', 'phone', 'address', 'avatar');

  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: {
      user: updatedUser
    },
    message: 'Profile updated successfully'
  });
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with that email address.', 404));
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // In a real app, you'd send an email with the resetToken here.
  // For now, we just log it.
  console.log(`Password reset token: ${resetToken}`);

  res.status(200).json({
    success: true,
    message: 'Token sent to email!'
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.body.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  createSendToken(user, 200, res);
});

exports.refreshToken = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return next(new AppError('No refresh token provided', 400));
  const decoded = await promisify(jwt.verify)(refreshToken, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id);
  if (!user || user.refreshToken !== refreshToken) {
    return next(new AppError('Invalid refresh token', 401));
  }
  createSendToken(user, 200, res);
});

exports.logoutUser = catchAsync(async (req, res, next) => {
  req.user.refreshToken = undefined;
  await req.user.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

// Backward compatibility exports
exports.register = exports.registerUser;
exports.login = exports.loginUser;
exports.getMe = exports.getCurrentUser;
=======
});
