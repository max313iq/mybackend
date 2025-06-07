const express = require('express');
const reportController = require('../controllers/reportController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.use(protect, restrictTo('admin'));

router.get('/sales', reportController.getSalesReport);
router.get('/products', reportController.getProductsReport);
router.get('/customers', reportController.getCustomersReport);
router.get('/reviews', reportController.getReviewsReport);
router.get('/export/sales', reportController.exportSalesReport);

module.exports = router;