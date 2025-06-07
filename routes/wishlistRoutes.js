const express = require('express');
const wishlistController = require('../controllers/wishlistController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(wishlistController.getWishlist)
  .delete(wishlistController.clearWishlist);

router.post('/add', wishlistController.addToWishlist);
router.delete('/remove/:productId', wishlistController.removeFromWishlist);

module.exports = router;