const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const { db } = require('../config/db');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const bankingErrors = require('../utils/bankingErrors');
const { generateAccountNumber, generateMemberNumber } = require('../utils/generators');
const { sendEmail } = require('../services/emailService');
const templates = require('../services/emailTemplates');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const initials = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

const sanitizeUser = (u) => ({
  id: u.id,
  memberNumber: u.member_number,
  fullName: u.full_name,
  email: u.email,
  role: u.role,
  status: u.status,
  kycStatus: u.kyc_status,
  avatarInitials: u.avatar_initials,
});

exports.register = catchAsync(async (req, res, next) => {
  const { fullName, email, password, phone } = req.body;

  const existing = await db.oneOrNone('SELECT id FROM users WHERE email = $1', [email]);
  if (existing) {
    return next(new AppError('An account with this email already exists.', 409));
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  const user = await db.tx(async (t) => {
    // New members start with KYC "pending" — they are not fully verified
    // just by signing up. An admin/staff member must review and approve
    // before certain actions (transfers, bill pay) are permitted; enforced
    // server-side by the requireVerifiedKyc middleware, not just the UI.
    const newUser = await t.one(
      `INSERT INTO users (member_number, full_name, email, phone, password_hash, avatar_initials, kyc_status)
       VALUES ($1,$2,$3,$4,$5,$6,'pending')
       RETURNING *`,
      [generateMemberNumber(), fullName, email, phone || null, passwordHash, initials(fullName)]
    );

    // Every new member starts with a checking + savings account, seeded like the demo UI.
    await t.none(
      `INSERT INTO accounts (user_id, account_type, account_number, nickname, balance, available_balance)
       VALUES ($1,'checking',$2,'Everyday Checking', 0, 0)`,
      [newUser.id, generateAccountNumber()]
    );
    await t.none(
      `INSERT INTO accounts (user_id, account_type, account_number, nickname, balance, available_balance, apy, savings_goal)
       VALUES ($1,'savings',$2,'High-Yield Savings', 0, 0, 4.50, 15000)`,
      [newUser.id, generateAccountNumber()]
    );
    await t.none(
      `INSERT INTO credit_scores (user_id, score, payment_history_pct, usage_pct, credit_age_years, hard_inquiries)
       VALUES ($1, 680, 100, 0, 0, 0)`,
      [newUser.id]
    );

    return newUser;
  });

  sendEmail({ to: user.email, ...templates.welcomeVerifyEmail(user) }).catch((err) =>
    console.error('[email] welcome email failed:', err.message)
  );

  const token = signToken(user.id);
  res.status(201).json({ status: 'success', token, data: { user: sanitizeUser(user) } });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await db.oneOrNone('SELECT * FROM users WHERE email = $1', [email]);
  if (!user) {
    return next(new AppError(bankingErrors.INVALID_CREDENTIALS, 401, 'INVALID_CREDENTIALS'));
  }

  const valid = await argon2.verify(user.password_hash, password);
  if (!valid) {
    return next(new AppError(bankingErrors.INVALID_CREDENTIALS, 401, 'INVALID_CREDENTIALS'));
  }

  if (user.status !== 'active') {
    return next(new AppError(bankingErrors.ACCOUNT_LOCKED, 403, 'ACCOUNT_LOCKED'));
  }

  const token = signToken(user.id);
  res.status(200).json({ status: 'success', token, data: { user: sanitizeUser(user) } });
});

exports.me = catchAsync(async (req, res) => {
  res.status(200).json({ status: 'success', data: { user: sanitizeUser(req.user) } });
});

exports.updateProfile = catchAsync(async (req, res, next) => {
  const { fullName, phone } = req.body;
  if (!fullName) return next(new AppError('Full name is required.', 400));

  const updated = await db.one(
    'UPDATE users SET full_name = $1, phone = $2, avatar_initials = $3, updated_at = now() WHERE id = $4 RETURNING *',
    [fullName, phone || null, initials(fullName), req.user.id]
  );
  res.status(200).json({ status: 'success', data: { user: sanitizeUser(updated) } });
});

exports.changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return next(new AppError('Current and new password are both required.', 400));
  }
  if (newPassword.length < 8) {
    return next(new AppError('New password must be at least 8 characters.', 400));
  }

  const user = await db.one('SELECT * FROM users WHERE id = $1', [req.user.id]);
  const valid = await argon2.verify(user.password_hash, currentPassword);
  if (!valid) return next(new AppError('Current password is incorrect.', 401, 'INVALID_CREDENTIALS'));

  const newHash = await argon2.hash(newPassword, { type: argon2.argon2id });
  await db.none('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [newHash, user.id]);

  sendEmail({
    to: user.email,
    subject: 'Your password was changed',
    text: `Hi ${user.full_name},\n\nYour Meridian Trust account password was just changed. If this wasn't you, contact support immediately.\n\n— Meridian Trust Federal Credit Union (demo)`,
  }).catch((err) => console.error('[email] password change notification failed:', err.message));

  res.status(200).json({ status: 'success', message: 'Password updated.' });
});
