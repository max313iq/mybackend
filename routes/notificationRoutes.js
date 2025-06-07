const express = require('express');
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', notificationController.getNotifications);
router.patch('/mark-all-read', notificationController.markAllAsRead);
router.route('/:id')
  .patch(notificationController.markAsRead)
  .delete(notificationController.deleteNotification);

module.exports = router;