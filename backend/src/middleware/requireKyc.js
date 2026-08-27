const AppError = require('../utils/AppError');
const bankingErrors = require('../utils/bankingErrors');

// Backend-enforced KYC gate — not just a frontend restriction. Any route that
// moves money (transfers, bill pay) sits behind this. Admins/staff are exempt
// since they aren't moving their own funds through these customer endpoints.
module.exports = function requireVerifiedKyc(req, res, next) {
  if (req.user.kyc_status !== 'verified') {
    return next(new AppError(bankingErrors.KYC_REQUIRED, 403, 'KYC_REQUIRED'));
  }
  next();
};
