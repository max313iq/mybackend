const express = require('express');
const orderController = require('../controllers/orderController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// All routes after this middleware are protected
router.use(protect);

router.post('/', orderController.createOrder);
router.get('/my-orders', orderController.getMyOrders);

// --- Admin Only Routes ---
router.use(restrictTo('admin'));

router.get('/', orderController.getAllOrders);

router.route('/:id')
  .get(orderController.getOrder)
  .delete(orderController.deleteOrder);

router.patch('/:id/status', orderController.updateOrderStatus);
router.patch('/:id/payment', orderController.updatePaymentStatus);
router.patch('/:id/delivery', orderController.updateDeliveryStatus);

module.exports = router;