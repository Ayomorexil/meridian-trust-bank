const express = require('express');
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/creditController');

const router = express.Router();
router.use(protect);

router.get('/score', ctrl.getMyCreditScore);
router.post('/simulate', ctrl.simulate);

module.exports = router;
