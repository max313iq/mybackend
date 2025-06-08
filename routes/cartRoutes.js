const express = require('express');
const cartController = require('../controllers/cartController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(cartController.getCart);

router.post('/add', cartController.addItemToCart);
router.put('/update', cartController.updateCartItemByProduct);
router.put('/update/:itemId', cartController.updateCartItem);
router.delete('/remove/:productId', cartController.removeItemByProduct);
router.delete('/remove-item/:itemId', cartController.removeItemFromCart);
router.post('/apply-coupon', cartController.applyCoupon);
router.delete('/clear', cartController.clearCart);

module.exports = router;