const express = require('express');
const discoveryController = require('../controllers/discoveryController');

const router = express.Router();

router.get('/products', discoveryController.searchProducts);
router.get('/stores', discoveryController.searchStores);
router.get('/categories', discoveryController.getCategories);

module.exports = router;
