const express = require('express');
const comparisonController = require('../controllers/comparisonController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(comparisonController.getComparisonList)
  .delete(comparisonController.clearComparisonList);

router.post('/add', comparisonController.addToComparison);
router.delete('/remove/:productId', comparisonController.removeFromComparison);

module.exports = router;