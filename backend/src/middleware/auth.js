const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { db } = require('../config/db');

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('You are not logged in. Please sign in to continue.', 401, 'SESSION_EXPIRED'));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(new AppError('Your session has expired. Please sign in again.', 401, 'SESSION_EXPIRED'));
  }

  const user = await db.oneOrNone(
    `SELECT id, member_number, full_name, email, role, status, kyc_status, avatar_initials
     FROM users WHERE id = $1`,
    [decoded.id]
  );

  if (!user) {
    return next(new AppError('The user belonging to this session no longer exists.', 401));
  }

  if (user.status !== 'active') {
    return next(new AppError('This account is not active. Contact support.', 403, 'ACCOUNT_LOCKED'));
  }

  req.user = user;
  next();
});

exports.restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to perform this action.', 403));
  }
  next();
};
