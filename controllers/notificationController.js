const Notification = require('../models/Notification');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getNotifications = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const baseFilter = { $or: [{ recipient: req.user.id }, { user: req.user.id }] };
  const filter = { ...baseFilter };

  if (req.query.type && req.query.type !== 'all') {
    filter.type = req.query.type;
  }
  if (typeof req.query.isRead !== 'undefined') {
    filter.isRead = req.query.isRead === 'true';
  }

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort('-createdAt').skip(skip).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...baseFilter, isRead: false })
  ]);

  res.status(200).json({
    success: true,
    data: notifications,
    unreadCount,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

exports.markAsRead = catchAsync(async (req, res, next) => {
  const notif = await Notification.findOneAndUpdate(
    { _id: req.params.notificationId, $or: [{ recipient: req.user.id }, { user: req.user.id }] },
    { isRead: true, readAt: new Date() },
    { new: true }
  );

  if (!notif) {
    return next(new AppError('No notification found with that ID', 404));
  }

  res.status(200).json({
    success: true,
    data: {
      _id: notif._id,
      isRead: notif.isRead,
      readAt: notif.readAt
    }
  });
});

exports.markAllAsRead = catchAsync(async (req, res, next) => {
  const result = await Notification.updateMany(
    { $or: [{ recipient: req.user.id }, { user: req.user.id }], isRead: false },
    { isRead: true, readAt: new Date() }
  );

  res.status(200).json({
    success: true,
    data: { markedCount: result.modifiedCount },
    message: 'All notifications marked as read'
  });
});

exports.deleteNotification = catchAsync(async (req, res, next) => {
  const notif = await Notification.findOneAndDelete({
    _id: req.params.notificationId,
    $or: [{ recipient: req.user.id }, { user: req.user.id }]
  });

  if (!notif) {
    return next(new AppError('No notification found with that ID', 404));
  }

  res.status(200).json({ success: true, message: 'Notification deleted successfully' });
});
