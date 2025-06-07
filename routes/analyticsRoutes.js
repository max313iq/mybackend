const express = require('express');
const analyticsController = require('../controllers/analyticsController');

const router = express.Router();

router.get('/public-stats', analyticsController.getPublicStats);
router.get('/categories', analyticsController.getCategoriesStats);
router.get('/popular-products', analyticsController.getPopularProducts);
router.get('/top-rated', analyticsController.getTopRated);

module.exports = router;