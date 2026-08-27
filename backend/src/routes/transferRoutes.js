const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const requireVerifiedKyc = require('../middleware/requireKyc');
const ctrl = require('../controllers/transferController');

const router = express.Router();
router.use(protect);

router.get('/', ctrl.getMyTransfers);
router.post(
  '/',
  requireVerifiedKyc,
  [
    body('fromAccountId').isUUID().withMessage('Choose a source account.'),
    body('amount').isFloat({ gt: 0 }).withMessage('Enter a valid amount.'),
    body('kind')
      .optional()
      .isIn(['internal', 'external_ach', 'zelle', 'wire'])
      .withMessage('Invalid transfer type.'),
    body('recipientName')
      .if(body('kind').isIn(['external_ach', 'wire']))
      .notEmpty()
      .withMessage('Recipient name is required for external transfers.'),
    body('externalBankName')
      .if(body('kind').isIn(['external_ach', 'wire']))
      .notEmpty()
      .withMessage('Recipient bank name is required.'),
    body('externalAccountNumber')
      .if(body('kind').isIn(['external_ach', 'wire']))
      .isLength({ min: 4, max: 17 })
      .withMessage('Enter a valid account number (4-17 digits).'),
    body('externalRoutingNumber')
      .if(body('kind').isIn(['external_ach', 'wire']))
      .matches(/^\d{9}$/)
      .withMessage('Routing number must be exactly 9 digits.'),
  ],
  validate,
  ctrl.createTransfer
);
router.patch('/:id/cancel', ctrl.cancelMyTransfer);
router.get('/:id/receipt', ctrl.getReceipt);

module.exports = router;
