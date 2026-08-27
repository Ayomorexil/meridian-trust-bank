const express = require('express');
const { protect } = require('../middleware/auth');
const requireVerifiedKyc = require('../middleware/requireKyc');
const ctrl = require('../controllers/billController');

const router = express.Router();
router.use(protect);

router.get('/', ctrl.getMyBills);
router.post('/pay', requireVerifiedKyc, ctrl.payAdHocBill);
router.post('/:id/pay', requireVerifiedKyc, ctrl.payBillNow);

module.exports = router;
