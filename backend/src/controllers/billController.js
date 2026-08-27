const { db } = require('../config/db');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const bankingErrors = require('../utils/bankingErrors');
const { sendEmail } = require('../services/emailService');
const templates = require('../services/emailTemplates');

function advanceDate(date, frequency) {
  const d = new Date(date);
  if (frequency === 'weekly') d.setDate(d.getDate() + 7);
  else if (frequency === 'quarterly') d.setMonth(d.getMonth() + 3);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().split('T')[0];
}

exports.getMyBills = catchAsync(async (req, res) => {
  const bills = await db.any(
    `SELECT rc.*, a.nickname AS account_nickname
     FROM recurring_charges rc JOIN accounts a ON a.id = rc.account_id
     WHERE rc.user_id = $1 AND rc.active = true
     ORDER BY rc.next_run_date ASC`,
    [req.user.id]
  );
  res.status(200).json({ status: 'success', results: bills.length, data: { bills } });
});

// Member pays one of their own scheduled bills early/on demand, instead of
// waiting for the automatic daily cycle to pick it up.
exports.payBillNow = catchAsync(async (req, res, next) => {
  const bill = await db.oneOrNone('SELECT * FROM recurring_charges WHERE id = $1 AND user_id = $2', [
    req.params.id,
    req.user.id,
  ]);
  if (!bill) return next(new AppError('Bill not found.', 404));

  const account = await db.oneOrNone('SELECT * FROM accounts WHERE id = $1', [bill.account_id]);
  if (!account) return next(new AppError('Linked account not found.', 404));
  if (Number(account.available_balance) < Number(bill.amount)) {
    return next(new AppError(bankingErrors.INSUFFICIENT_FUNDS, 400, 'INSUFFICIENT_FUNDS'));
  }

  const transaction = await db.tx(async (t) => {
    await t.none(
      'UPDATE accounts SET balance = balance - $1, available_balance = available_balance - $1, updated_at = now() WHERE id = $2',
      [bill.amount, account.id]
    );
    const txn = await t.one(
      `INSERT INTO transactions (account_id, direction, category, description, amount, status)
       VALUES ($1,'debit',$2,$3,$4,'completed') RETURNING *`,
      [account.id, bill.category, bill.payee, bill.amount]
    );
    await t.none('UPDATE recurring_charges SET next_run_date = $1 WHERE id = $2', [
      advanceDate(bill.next_run_date, bill.frequency),
      bill.id,
    ]);
    return txn;
  });

  sendEmail({ to: req.user.email, ...templates.billPaid(req.user, bill.payee, bill.amount) }).catch((err) =>
    console.error('[email] bill payment notification failed:', err.message)
  );

  res.status(200).json({ status: 'success', data: { transaction } });
});

// Ad-hoc bill payment — a payee/amount that isn't on the member's recurring
// schedule (e.g. a one-off bill they're paying manually).
exports.payAdHocBill = catchAsync(async (req, res, next) => {
  const { accountId, payee, amount, category } = req.body;
  const amt = Number(amount);
  if (!payee) return next(new AppError('Enter who you\u2019re paying.', 400));
  if (!amt || amt <= 0) return next(new AppError('Enter a valid amount.', 400));

  const account = await db.oneOrNone('SELECT * FROM accounts WHERE id = $1 AND user_id = $2', [
    accountId,
    req.user.id,
  ]);
  if (!account) return next(new AppError('Account not found.', 404));
  if (account.status === 'frozen') return next(new AppError(bankingErrors.ACCOUNT_FROZEN, 403, 'ACCOUNT_FROZEN'));
  if (Number(account.available_balance) < amt) {
    return next(new AppError(bankingErrors.INSUFFICIENT_FUNDS, 400, 'INSUFFICIENT_FUNDS'));
  }

  const transaction = await db.tx(async (t) => {
    await t.none(
      'UPDATE accounts SET balance = balance - $1, available_balance = available_balance - $1, updated_at = now() WHERE id = $2',
      [amt, account.id]
    );
    return t.one(
      `INSERT INTO transactions (account_id, direction, category, description, amount, status)
       VALUES ($1,'debit',$2,$3,$4,'completed') RETURNING *`,
      [account.id, category || 'bills', payee, amt]
    );
  });

  sendEmail({ to: req.user.email, ...templates.billPaid(req.user, payee, amt) }).catch((err) =>
    console.error('[email] bill payment notification failed:', err.message)
  );

  res.status(201).json({ status: 'success', data: { transaction } });
});
