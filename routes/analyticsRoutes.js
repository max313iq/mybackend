const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.get('/public-stats', analyticsController.getPublicStats);
router.get('/categories', analyticsController.getCategoriesStats);
router.get('/popular-products', analyticsController.getPopularProducts);
router.get('/top-rated', analyticsController.getTopRated);
router.get('/delivery-performance/:storeId', protect, restrictTo('store_owner', 'admin'), analyticsController.getDeliveryPerformance);

module.exports = router;