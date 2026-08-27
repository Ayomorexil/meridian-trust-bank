// Central catalogue of realistic banking-style error messages + codes.
// Controllers throw AppError(message, statusCode, code) using these.
module.exports = {
  INSUFFICIENT_FUNDS: 'Insufficient funds to complete this transfer.',
  TRANSFER_LIMIT_EXCEEDED: 'This transfer exceeds your daily transfer limit.',
  RECIPIENT_NOT_FOUND: 'Recipient account not found.',
  ACCOUNT_LOCKED: 'This account is temporarily locked. Contact support.',
  ACCOUNT_FROZEN: 'This account is frozen and cannot send or receive funds.',
  TRANSFER_CANCELLED_BY_ADMIN: 'This transfer was cancelled by an administrator.',
  UNDER_REVIEW: 'This transaction is under review.',
  KYC_REQUIRED: 'Identity verification (KYC) is required before you can transfer funds.',
  DAILY_LIMIT_REACHED: 'You have reached your daily transaction limit.',
  BENEFICIARY_DISABLED: 'This beneficiary has been disabled.',
  DUPLICATE_TRANSACTION: 'A duplicate transaction was detected and blocked.',
  SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
  INVALID_CREDENTIALS: 'The email or password you entered is incorrect.',
  SAME_ACCOUNT_TRANSFER: 'You cannot transfer to the same account.',
};
