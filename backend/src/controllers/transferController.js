const { db } = require('../config/db');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const bankingErrors = require('../utils/bankingErrors');
const { notify } = require('../utils/audit');
const { sendEmail } = require('../services/emailService');
const templates = require('../services/emailTemplates');

const DAILY_TRANSFER_LIMIT = 10000;
const mask = (num) => (num ? `••••${String(num).slice(-4)}` : '');

exports.createTransfer = catchAsync(async (req, res, next) => {
  const {
    fromAccountId,
    toAccountId,
    externalLabel,
    kind,
    amount,
    memo,
    scheduledDate,
    recipientName,
    externalBankName,
    externalAccountNumber,
    externalRoutingNumber,
  } = req.body;
  const amt = Number(amount);

  if (!amt || amt <= 0) {
    return next(new AppError('Enter a valid transfer amount.', 400, 'VALIDATION_ERROR'));
  }
  if (amt > DAILY_TRANSFER_LIMIT) {
    return next(new AppError(bankingErrors.TRANSFER_LIMIT_EXCEEDED, 400, 'TRANSFER_LIMIT_EXCEEDED'));
  }
  if (toAccountId && toAccountId === fromAccountId) {
    return next(new AppError(bankingErrors.SAME_ACCOUNT_TRANSFER, 400, 'SAME_ACCOUNT_TRANSFER'));
  }

  const fromAccount = await db.oneOrNone(
    'SELECT * FROM accounts WHERE id = $1 AND user_id = $2',
    [fromAccountId, req.user.id]
  );
  if (!fromAccount) return next(new AppError('Source account not found.', 404));
  if (fromAccount.status === 'frozen') return next(new AppError(bankingErrors.ACCOUNT_FROZEN, 403, 'ACCOUNT_FROZEN'));
  if (fromAccount.status === 'closed') return next(new AppError('This account is closed.', 400));

  if (Number(fromAccount.available_balance) < amt) {
    return next(new AppError(bankingErrors.INSUFFICIENT_FUNDS, 400, 'INSUFFICIENT_FUNDS'));
  }

  let toAccount = null;
  const transferKind = kind || (toAccountId ? 'internal' : 'external_ach');
  const isExternal = transferKind !== 'internal';

  if (!isExternal) {
    if (!toAccountId) return next(new AppError('Choose a destination account.', 400));
    toAccount = await db.oneOrNone('SELECT * FROM accounts WHERE id = $1', [toAccountId]);
    if (!toAccount) return next(new AppError(bankingErrors.RECIPIENT_NOT_FOUND, 404, 'RECIPIENT_NOT_FOUND'));
    if (toAccount.status !== 'active') {
      return next(new AppError(bankingErrors.ACCOUNT_FROZEN, 403, 'ACCOUNT_FROZEN'));
    }
  } else {
    // External transfers (ACH/wire/Zelle) require full recipient banking
    // details. This is a simulated environment — nothing here touches a real
    // payment network — but the fields are captured and validated the way a
    // real bank's transfer form would, for a realistic demo.
    if (!recipientName || !externalBankName || !externalAccountNumber) {
      return next(new AppError('Recipient name, bank name, and account number are required.', 400, 'VALIDATION_ERROR'));
    }
    if (transferKind !== 'zelle' && !/^\d{9}$/.test(externalRoutingNumber || '')) {
      return next(new AppError('Routing number must be exactly 9 digits.', 400, 'VALIDATION_ERROR'));
    }
  }

  const isInstant = !isExternal;

  const transfer = await db.tx(async (t) => {
    // Place a hold on the sender's available balance immediately.
    await t.none(
      'UPDATE accounts SET available_balance = available_balance - $1, updated_at = now() WHERE id = $2',
      [amt, fromAccount.id]
    );

    const newTransfer = await t.one(
      `INSERT INTO transfers
         (user_id, from_account_id, to_account_id, external_label, kind, amount, memo, status, scheduled_date,
          recipient_name, external_bank_name, external_account_number, external_routing_number)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        req.user.id,
        fromAccount.id,
        toAccount ? toAccount.id : null,
        externalLabel || (isExternal ? `${externalBankName} (${transferKind})` : null),
        transferKind,
        amt,
        memo || null,
        scheduledDate ? 'scheduled' : 'pending',
        scheduledDate || null,
        isExternal ? recipientName : null,
        isExternal ? externalBankName : null,
        isExternal ? externalAccountNumber : null,
        isExternal && transferKind !== 'zelle' ? externalRoutingNumber : null,
      ]
    );

    // Internal transfers between the member's own accounts settle instantly, matching the
    // original UI copy ("Internal transfers ... are instant and free"). Everything else
    // (external ACH, wire, Zelle) lands in the admin approval queue as pending.
    if (isInstant && !scheduledDate) {
      await t.none(
        'UPDATE accounts SET balance = balance - $1, updated_at = now() WHERE id = $2',
        [amt, fromAccount.id]
      );
      await t.none(
        'UPDATE accounts SET balance = balance + $1, available_balance = available_balance + $1, updated_at = now() WHERE id = $2',
        [amt, toAccount.id]
      );
      await t.none(
        `INSERT INTO transactions (account_id, direction, category, description, amount, status, related_transfer_id)
         VALUES ($1,'debit','transfer',$2,$3,'completed',$4)`,
        [fromAccount.id, `Transfer to ${toAccount.nickname}`, amt, newTransfer.id]
      );
      await t.none(
        `INSERT INTO transactions (account_id, direction, category, description, amount, status, related_transfer_id)
         VALUES ($1,'credit','transfer',$2,$3,'completed',$4)`,
        [toAccount.id, `Transfer from ${fromAccount.nickname}`, amt, newTransfer.id]
      );
      return t.one(
        `UPDATE transfers SET status = 'completed', processed_at = now() WHERE id = $1 RETURNING *`,
        [newTransfer.id]
      );
    }

    return newTransfer;
  });

  sendEmail({
    to: req.user.email,
    ...(transfer.status === 'completed'
      ? templates.transferCompleted(req.user, transfer)
      : templates.transferInitiated(req.user, transfer)),
  }).catch((err) => console.error('[email] transfer notification failed:', err.message));

  res.status(201).json({ status: 'success', data: { transfer } });
});

exports.getMyTransfers = catchAsync(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);
  const transfers = await db.any(
    `SELECT tr.*, fa.nickname AS from_nickname, ta.nickname AS to_nickname
     FROM transfers tr
     JOIN accounts fa ON fa.id = tr.from_account_id
     LEFT JOIN accounts ta ON ta.id = tr.to_account_id
     WHERE tr.user_id = $1
     ORDER BY tr.created_at DESC
     LIMIT $2`,
    [req.user.id, limit]
  );
  const masked = transfers.map((t) => ({
    ...t,
    external_account_number: t.external_account_number ? mask(t.external_account_number) : null,
    external_routing_number: t.external_routing_number ? mask(t.external_routing_number) : null,
  }));
  res.status(200).json({ status: 'success', results: masked.length, data: { transfers: masked } });
});

exports.cancelMyTransfer = catchAsync(async (req, res, next) => {
  const transfer = await db.oneOrNone(
    'SELECT * FROM transfers WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!transfer) return next(new AppError('Transfer not found.', 404));
  if (!['pending', 'scheduled'].includes(transfer.status)) {
    return next(new AppError('This transfer can no longer be cancelled.', 400));
  }

  await db.tx(async (t) => {
    await t.none(
      'UPDATE accounts SET available_balance = available_balance + $1, updated_at = now() WHERE id = $2',
      [transfer.amount, transfer.from_account_id]
    );
    await t.none(`UPDATE transfers SET status = 'cancelled', processed_at = now() WHERE id = $1`, [transfer.id]);
    await notify(t, {
      userId: req.user.id,
      title: 'Transfer cancelled',
      body: `You cancelled your $${Number(transfer.amount).toFixed(2)} transfer.`,
    });
  });

  res.status(200).json({ status: 'success', message: 'Transfer cancelled.' });
});

// Full receipt for a completed (or any) transfer — reference number, both
// parties, timestamps, and the resulting account balance. Only the owning
// member can pull their own receipt. External account/routing numbers are
// always masked, even to the owning member, matching how real bank receipts
// display recipient details.
exports.getReceipt = catchAsync(async (req, res, next) => {
  const transfer = await db.oneOrNone(
    `SELECT tr.*, fa.nickname AS from_nickname, fa.account_number AS from_account_number,
            fa.balance AS from_balance_now, ta.nickname AS to_nickname, ta.account_number AS to_account_number,
            u.full_name AS member_name, u.member_number
     FROM transfers tr
     JOIN accounts fa ON fa.id = tr.from_account_id
     JOIN users u ON u.id = tr.user_id
     LEFT JOIN accounts ta ON ta.id = tr.to_account_id
     WHERE tr.id = $1 AND tr.user_id = $2`,
    [req.params.id, req.user.id]
  );
  if (!transfer) return next(new AppError('Transfer not found.', 404));

  const toAccountLabel = transfer.to_nickname
    ? `${transfer.to_nickname} (••${transfer.to_account_number.slice(-4)})`
    : transfer.recipient_name
    ? `${transfer.recipient_name} — ${transfer.external_bank_name} (${mask(transfer.external_account_number)})`
    : transfer.external_label || 'External Account';

  res.status(200).json({
    status: 'success',
    data: {
      receipt: {
        referenceNumber: transfer.reference_number || transfer.id.split('-')[0].toUpperCase(),
        status: transfer.status,
        amount: transfer.amount,
        memo: transfer.memo,
        fromAccount: `${transfer.from_nickname} (••${transfer.from_account_number.slice(-4)})`,
        toAccount: toAccountLabel,
        isExternal: transfer.kind !== 'internal',
        memberName: transfer.member_name,
        memberNumber: transfer.member_number,
        createdAt: transfer.created_at,
        processedAt: transfer.processed_at,
        balanceAfter: transfer.from_balance_now,
      },
    },
  });
});
