const { db } = require('../config/db');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

exports.getMyAccounts = catchAsync(async (req, res) => {
  const accounts = await db.any(
    `SELECT * FROM accounts WHERE user_id = $1 ORDER BY
       CASE account_type WHEN 'checking' THEN 1 WHEN 'savings' THEN 2 ELSE 3 END`,
    [req.user.id]
  );
  res.status(200).json({ status: 'success', results: accounts.length, data: { accounts } });
});

exports.getAccountById = catchAsync(async (req, res, next) => {
  const account = await db.oneOrNone(
    'SELECT * FROM accounts WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!account) return next(new AppError('Account not found.', 404));
  res.status(200).json({ status: 'success', data: { account } });
});

exports.getAccountTransactions = catchAsync(async (req, res, next) => {
  const account = await db.oneOrNone(
    'SELECT id FROM accounts WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!account) return next(new AppError('Account not found.', 404));

  const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);
  const transactions = await db.any(
    'SELECT * FROM transactions WHERE account_id = $1 ORDER BY created_at DESC LIMIT $2',
    [req.params.id, limit]
  );
  res.status(200).json({ status: 'success', results: transactions.length, data: { transactions } });
});

// Aggregate feed across all of the member's own accounts, for the Home screen.
exports.getMyRecentActivity = catchAsync(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
  const transactions = await db.any(
    `SELECT t.*, a.nickname AS account_nickname, a.account_type
     FROM transactions t
     JOIN accounts a ON a.id = t.account_id
     WHERE a.user_id = $1
     ORDER BY t.created_at DESC
     LIMIT $2`,
    [req.user.id, limit]
  );
  res.status(200).json({ status: 'success', results: transactions.length, data: { transactions } });
});

// Simulated mobile check deposit. The frontend captures front/back photos via
// the device camera (see DepositModal.jsx) as a real UX flow; since there's no
// real check-clearing network here, the member enters the check amount and we
// credit it once both sides have been "captured". In a real bank this would
// sit as "pending" for 1-2 business days pending OCR + fraud review — noted
// here, simplified to instant settlement for the demo.
exports.mobileDeposit = catchAsync(async (req, res, next) => {
  const { amount, frontCaptured, backCaptured } = req.body;
  const amt = Number(amount);

  if (!amt || amt <= 0) return next(new AppError('Enter a valid check amount.', 400));
  if (!frontCaptured || !backCaptured) {
    return next(new AppError('Capture both the front and back of the check before submitting.', 400));
  }
  if (amt > 25000) {
    return next(new AppError('Mobile deposits over $25,000 require a branch visit.', 400, 'DAILY_LIMIT_REACHED'));
  }

  const account = await db.oneOrNone('SELECT * FROM accounts WHERE id = $1 AND user_id = $2', [
    req.params.id,
    req.user.id,
  ]);
  if (!account) return next(new AppError('Account not found.', 404));
  if (account.status !== 'active') return next(new AppError('This account cannot accept deposits right now.', 403));

  const transaction = await db.tx(async (t) => {
    await t.none(
      'UPDATE accounts SET balance = balance + $1, available_balance = available_balance + $1, updated_at = now() WHERE id = $2',
      [amt, account.id]
    );
    return t.one(
      `INSERT INTO transactions (account_id, direction, category, description, amount, status)
       VALUES ($1,'credit','deposit','Mobile Check Deposit',$2,'completed') RETURNING *`,
      [account.id, amt]
    );
  });

  res.status(201).json({ status: 'success', data: { transaction } });
});
