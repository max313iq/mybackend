const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401)
    );
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging to this token does no longer exist.',
        401
      )
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  next();
});

// 👇 تم تعديل هذه الدالة لإضافة أوامر الطباعة
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    
    // --- قسم التشخيص ---
    console.log('--- DEBUG: Inside restrictTo Middleware ---');
    console.log(`Required Roles: [${roles}]`);
    console.log(`User's Role: "${req.user.role}"`);
    console.log(`Does required roles include user's role? --> ${roles.includes(req.user.role)}`);
    console.log('-------------------------------------------');
    // --- نهاية قسم التشخيص ---

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };
};