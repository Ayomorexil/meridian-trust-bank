const express = require('express');
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/accountController');

const router = express.Router();
router.use(protect);

router.get('/', ctrl.getMyAccounts);
router.get('/activity/recent', ctrl.getMyRecentActivity);
router.get('/:id', ctrl.getAccountById);
router.get('/:id/transactions', ctrl.getAccountTransactions);
router.post('/:id/deposit', ctrl.mobileDeposit);

module.exports = router;
