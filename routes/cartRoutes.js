const express = require('express');
const cartController = require('../controllers/cartController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(cartController.getCart);

router.post('/add', cartController.addItemToCart);
router.put('/update/:itemId', cartController.updateCartItem);
router.delete('/remove/:itemId', cartController.removeItemFromCart);
router.post('/apply-coupon', cartController.applyCoupon);
router.delete('/clear', cartController.clearCart);

module.exports = router;