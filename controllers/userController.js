const User = require('../models/User');
const factory = require('./handlerFactory');

exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
// Do NOT update passwords with this! This is for admin use to change user data like name, email, role.
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);