const express = require('express');
const orderController = require('../controllers/orderController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// All routes below are protected
router.use(protect);

// Route for a user to get their own orders
router.get('/my-orders', orderController.getMyOrders);

// Route for a user to create an order
router.post('/', restrictTo('user'), orderController.createOrder);


// --- Admin Only Routes --- //
router.use(restrictTo('admin'));

router
    .route('/')
    .get(orderController.getAllOrders);

router
    .route('/:id')
    .get(orderController.getOrder)
    .patch(orderController.updateOrder)
    .delete(orderController.deleteOrder);

module.exports = router;