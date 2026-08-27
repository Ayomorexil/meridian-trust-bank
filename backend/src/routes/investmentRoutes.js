const express = require('express');
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/investmentController');

const router = express.Router();
router.use(protect);

router.get('/', ctrl.getMyInvestments);

module.exports = router;
