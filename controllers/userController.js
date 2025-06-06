const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');

// This function gets the current user's data based on their token
exports.getMe = catchAsync(async (req, res, next) => {
  // The user object is already attached to the request by the 'protect' middleware
  const user = await User.findById(req.user.id);

  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

// You can add other user management functions here in the future
// exports.getAllUsers = factory.getAll(User);
// exports.updateUser = factory.updateOne(User);