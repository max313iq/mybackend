const Notification = require('../models/Notification');
const factory = require('./handlerFactory');
const catchAsync =require('../utils/catchAsync');

exports.getNotifications = factory.getAll(Notification, { user: (req) => req.user.id });

exports.markAsRead = factory.updateOne(Notification);

exports.deleteNotification = factory.deleteOne(Notification);

exports.markAllAsRead = catchAsync(async (req, res, next) => {
    await Notification.updateMany({ user: req.user.id, isRead: false }, { isRead: true });
    
    res.status(200).json({
        success: true,
        message: 'All notifications marked as read.'
    });
});