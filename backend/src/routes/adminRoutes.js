```js
const express = require('express');

const { protect, restrictTo } = require('../middleware/auth');
const ctrl = require('../controllers/adminController');

const router = express.Router();


// ============================================================
// ADMIN / SUPPORT AUTHENTICATION
// ============================================================

router.use(
  protect,
  restrictTo(
    'support',
    'manager',
    'admin',
    'superadmin'
  )
);


// ============================================================
// DASHBOARD
// ============================================================

router.get(
  '/dashboard/summary',
  ctrl.dashboardSummary
);

router.post(
  '/simulate/run-daily-cycle',
  restrictTo(
    'admin',
    'superadmin'
  ),
  ctrl.runDailyCycle
);


// ============================================================
// CUSTOMERS
// ============================================================

router.get(
  '/customers',
  ctrl.listCustomers
);

router.post(
  '/customers',
  restrictTo(
    'manager',
    'admin',
    'superadmin'
  ),
  ctrl.createCustomer
);

router.get(
  '/customers/:id',
  ctrl.getCustomer
);

router.patch(
  '/customers/:id/suspend',
  restrictTo(
    'manager',
    'admin',
    'superadmin'
  ),
  ctrl.suspendCustomer
);

router.patch(
  '/customers/:id/reactivate',
  restrictTo(
    'manager',
    'admin',
    'superadmin'
  ),
  ctrl.reactivateCustomer
);

router.patch(
  '/customers/:id/lock',
  ctrl.lockCustomer
);

router.patch(
  '/customers/:id/unlock',
  ctrl.unlockCustomer
);

router.patch(
  '/customers/:id/kyc',
  restrictTo(
    'manager',
    'admin',
    'superadmin'
  ),
  ctrl.setKycStatus
);


// ============================================================
// CREDIT SCORE
// ============================================================

router.get(
  '/customers/:id/credit-score',
  ctrl.getCustomerCreditScore
);

router.post(
  '/customers/:id/credit-score',
  restrictTo(
    'manager',
    'admin',
    'superadmin'
  ),
  ctrl.setCustomerCreditScore
);


// ============================================================
// ACCOUNTS
// ============================================================

router.patch(
  '/accounts/:id/freeze',
  restrictTo(
    'manager',
    'admin',
    'superadmin'
  ),
  ctrl.freezeAccount
);

router.patch(
  '/accounts/:id/unfreeze',
  restrictTo(
    'manager',
    'admin',
    'superadmin'
  ),
  ctrl.unfreezeAccount
);

router.post(
  '/accounts/:id/adjust',
  restrictTo(
    'admin',
    'superadmin'
  ),
  ctrl.adjustBalance
);


// ============================================================
// TRANSFERS
// ============================================================

router.get(
  '/transfers',
  ctrl.listTransfers
);

router.patch(
  '/transfers/:id/approve',
  restrictTo(
    'manager',
    'admin',
    'superadmin'
  ),
  ctrl.approveTransfer
);

router.patch(
  '/transfers/:id/reject',
  ctrl.rejectTransfer
);

router.patch(
  '/transfers/:id/cancel',
  ctrl.cancelTransfer
);

router.patch(
  '/transfers/:id/hold',
  ctrl.holdTransfer
);

router.patch(
  '/transfers/:id/release',
  ctrl.releaseTransfer
);

router.patch(
  '/transfers/:id/fail',
  ctrl.markTransferFailed
);

router.patch(
  '/transfers/:id/reverse',
  restrictTo(
    'admin',
    'superadmin'
  ),
  ctrl.reverseTransfer
);


// ============================================================
// LIVE CHAT — SUPPORT / ADMIN
// ============================================================

// Get all customer conversations
router.get(
  '/chat/conversations',
  ctrl.listChatConversations
);

// Get messages inside a customer conversation
router.get(
  '/chat/conversations/:conversationId/messages',
  ctrl.adminGetChatMessages
);

// Send support/admin reply
router.post(
  '/chat/conversations/:conversationId/messages',
  ctrl.adminSendChatMessage
);

// Close customer conversation
router.patch(
  '/chat/conversations/:conversationId/close',
  ctrl.adminCloseChatConversation
);


// ============================================================
// AUDIT LOGS
// ============================================================

router.get(
  '/audit-logs',
  restrictTo(
    'manager',
    'admin',
    'superadmin'
  ),
  ctrl.listAuditLogs
);


module.exports = router;
```;
