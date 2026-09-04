const { db } = require("../config/db");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const { writeAuditLog, notify } = require("../utils/audit");
const { runDailyCycle } = require("../services/dailyCycle");
const { sendEmail } = require("../services/emailService");
const templates = require("../services/emailTemplates");
const argon2 = require("argon2");

const {
  generateAccountNumber,
  generateMemberNumber,
} = require("../utils/generators");

/* ============================================================
   CUSTOMERS
   ============================================================ */

exports.listCustomers = catchAsync(async (req, res) => {
  const { search, status } = req.query;

  const conditions = ["role = 'customer'"];
  const params = [];

  if (search) {
    params.push("%" + search + "%");

    const searchParam = params.length;

    conditions.push(
      "(full_name ILIKE $" +
        searchParam +
        " OR email ILIKE $" +
        searchParam +
        " OR member_number ILIKE $" +
        searchParam +
        ")",
    );
  }

  if (status) {
    params.push(status);
    conditions.push("status = $" + params.length);
  }

  const customers = await db.any(
    "SELECT " +
      "id, " +
      "member_number, " +
      "full_name, " +
      "email, " +
      "phone, " +
      "status, " +
      "kyc_status, " +
      "created_at " +
      "FROM users " +
      "WHERE " +
      conditions.join(" AND ") +
      " " +
      "ORDER BY created_at DESC " +
      "LIMIT 200",
    params,
  );

  res.status(200).json({
    status: "success",
    results: customers.length,
    data: {
      customers,
    },
  });
});

exports.getCustomer = catchAsync(async (req, res, next) => {
  const customer = await db.oneOrNone(
    `SELECT
       id,
       member_number,
       full_name,
       email,
       phone,
       status,
       kyc_status,
       created_at
     FROM users
     WHERE id = $1
       AND role = 'customer'`,
    [req.params.id],
  );

  if (!customer) {
    return next(new AppError("Customer not found.", 404));
  }

  const accounts = await db.any(
    `SELECT *
     FROM accounts
     WHERE user_id = $1`,
    [req.params.id],
  );

  res.status(200).json({
    status: "success",
    data: {
      customer,
      accounts,
    },
  });
});

const setCustomerStatus = (newStatus, action) =>
  catchAsync(async (req, res, next) => {
    const customer = await db.oneOrNone(
      `SELECT *
       FROM users
       WHERE id = $1
         AND role = 'customer'`,
      [req.params.id],
    );

    if (!customer) {
      return next(new AppError("Customer not found.", 404));
    }

    const updated = await db.tx(async (t) => {
      const u = await t.one(
        `UPDATE users
         SET
           status = $1,
           updated_at = now()
         WHERE id = $2
         RETURNING *`,
        [newStatus, customer.id],
      );

      await writeAuditLog(t, {
        adminId: req.user.id,
        action,
        entityType: "user",
        entityId: customer.id,
        oldValue: {
          status: customer.status,
        },
        newValue: {
          status: newStatus,
        },
        reason: req.body.reason,
      });

      await notify(t, {
        userId: customer.id,
        title: "Account status updated",
        body:
          'Your account status was changed to "' +
          newStatus +
          '" by a Meridian Trust representative.',
      });

      return u;
    });

    sendEmail({
      to: updated.email,
      ...templates.accountStatusChanged(updated, newStatus, req.body.reason),
    }).catch((err) =>
      console.error("[email] status change notification failed:", err.message),
    );

    res.status(200).json({
      status: "success",
      data: {
        customer: updated,
      },
    });
  });

exports.suspendCustomer = setCustomerStatus("suspended", "user.suspend");

exports.reactivateCustomer = setCustomerStatus("active", "user.reactivate");

exports.lockCustomer = setCustomerStatus("locked", "user.lock");

exports.unlockCustomer = setCustomerStatus("active", "user.unlock");

exports.setKycStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;

  const customer = await db.oneOrNone(
    `SELECT *
     FROM users
     WHERE id = $1
       AND role = 'customer'`,
    [req.params.id],
  );

  if (!customer) {
    return next(new AppError("Customer not found.", 404));
  }

  const updated = await db.tx(async (t) => {
    const u = await t.one(
      `UPDATE users
       SET
         kyc_status = $1,
         updated_at = now()
       WHERE id = $2
       RETURNING *`,
      [status, customer.id],
    );

    await writeAuditLog(t, {
      adminId: req.user.id,
      action: "kyc." + status,
      entityType: "user",
      entityId: customer.id,
      oldValue: {
        kyc_status: customer.kyc_status,
      },
      newValue: {
        kyc_status: status,
      },
      reason: req.body.reason,
    });

    await notify(t, {
      userId: customer.id,
      title: "Identity verification " + status,
      body:
        req.body.reason || 'Your KYC status was updated to "' + status + '".',
    });

    return u;
  });

  sendEmail({
    to: updated.email,
    ...templates.kycStatusChanged(updated, status, req.body.reason),
  }).catch((err) =>
    console.error("[email] KYC notification failed:", err.message),
  );

  res.status(200).json({
    status: "success",
    data: {
      customer: updated,
    },
  });
});

/* ============================================================
   CREATE CUSTOMER
   ============================================================ */

exports.createCustomer = catchAsync(async (req, res, next) => {
  const { fullName, email, phone, password, kycStatus } = req.body;

  if (!fullName || !email || !password) {
    return next(
      new AppError(
        "Full name, email, and an initial password are required.",
        400,
      ),
    );
  }

  if (password.length < 8) {
    return next(new AppError("Password must be at least 8 characters.", 400));
  }

  const existing = await db.oneOrNone(
    `SELECT id
     FROM users
     WHERE email = $1`,
    [email],
  );

  if (existing) {
    return next(
      new AppError("An account with this email already exists.", 409),
    );
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
  });

  const initialKyc = ["unverified", "pending", "verified", "rejected"].includes(
    kycStatus,
  )
    ? kycStatus
    : "pending";

  const result = await db.tx(async (t) => {
    const newUser = await t.one(
      `INSERT INTO users
       (
         member_number,
         full_name,
         email,
         phone,
         password_hash,
         avatar_initials,
         kyc_status,
         role
       )
       VALUES
       (
         $1,
         $2,
         $3,
         $4,
         $5,
         $6,
         $7,
         'customer'
       )
       RETURNING *`,
      [
        generateMemberNumber(),
        fullName,
        email,
        phone || null,
        passwordHash,
        fullName
          .split(" ")
          .filter(Boolean)
          .slice(0, 2)
          .map((p) => p[0].toUpperCase())
          .join(""),
        initialKyc,
      ],
    );

    const checking = await t.one(
      `INSERT INTO accounts
       (
         user_id,
         account_type,
         account_number,
         nickname,
         balance,
         available_balance
       )
       VALUES
       (
         $1,
         'checking',
         $2,
         'Everyday Checking',
         0,
         0
       )
       RETURNING *`,
      [newUser.id, generateAccountNumber()],
    );

    const savings = await t.one(
      `INSERT INTO accounts
       (
         user_id,
         account_type,
         account_number,
         nickname,
         balance,
         available_balance,
         apy,
         savings_goal
       )
       VALUES
       (
         $1,
         'savings',
         $2,
         'High-Yield Savings',
         0,
         0,
         4.50,
         15000
       )
       RETURNING *`,
      [newUser.id, generateAccountNumber()],
    );

    await t.none(
      `INSERT INTO credit_scores
       (
         user_id,
         score,
         payment_history_pct,
         usage_pct,
         credit_age_years,
         hard_inquiries,
         set_by_admin_id,
         reason
       )
       VALUES
       (
         $1,
         680,
         100,
         0,
         0,
         0,
         $2,
         'Starting score at account opening'
       )`,
      [newUser.id, req.user.id],
    );

    await writeAuditLog(t, {
      adminId: req.user.id,
      action: "customer.create",
      entityType: "user",
      entityId: newUser.id,
      newValue: {
        email,
        fullName,
        kycStatus: initialKyc,
      },
      reason: req.body.reason || "Staff-initiated onboarding",
    });

    return {
      user: newUser,
      accounts: [checking, savings],
    };
  });

  sendEmail({
    to: result.user.email,
    ...templates.welcomeVerifyEmail(result.user),
  }).catch((err) =>
    console.error("[email] welcome email failed:", err.message),
  );

  res.status(201).json({
    status: "success",
    data: result,
  });
});

/* ============================================================
   ACCOUNTS
   ============================================================ */

exports.freezeAccount = catchAsync(async (req, res, next) => {
  const account = await db.oneOrNone(
    `SELECT *
     FROM accounts
     WHERE id = $1`,
    [req.params.id],
  );

  if (!account) {
    return next(new AppError("Account not found.", 404));
  }

  const updated = await db.tx(async (t) => {
    const a = await t.one(
      `UPDATE accounts
       SET
         status = 'frozen',
         updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [account.id],
    );

    await writeAuditLog(t, {
      adminId: req.user.id,
      action: "account.freeze",
      entityType: "account",
      entityId: account.id,
      oldValue: {
        status: account.status,
      },
      newValue: {
        status: "frozen",
      },
      reason: req.body.reason,
    });

    await notify(t, {
      userId: account.user_id,
      title: "Account frozen",
      body: "Your " + account.nickname + " account has been frozen.",
    });

    return a;
  });

  res.status(200).json({
    status: "success",
    data: {
      account: updated,
    },
  });
});

exports.unfreezeAccount = catchAsync(async (req, res, next) => {
  const account = await db.oneOrNone(
    `SELECT *
     FROM accounts
     WHERE id = $1`,
    [req.params.id],
  );

  if (!account) {
    return next(new AppError("Account not found.", 404));
  }

  const updated = await db.tx(async (t) => {
    const a = await t.one(
      `UPDATE accounts
       SET
         status = 'active',
         updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [account.id],
    );

    await writeAuditLog(t, {
      adminId: req.user.id,
      action: "account.unfreeze",
      entityType: "account",
      entityId: account.id,
      oldValue: {
        status: account.status,
      },
      newValue: {
        status: "active",
      },
      reason: req.body.reason,
    });

    await notify(t, {
      userId: account.user_id,
      title: "Account unfrozen",
      body: "Your " + account.nickname + " account is active again.",
    });

    return a;
  });

  res.status(200).json({
    status: "success",
    data: {
      account: updated,
    },
  });
});

exports.adjustBalance = catchAsync(async (req, res, next) => {
  const { amount, direction, reason, category } = req.body;

  const amt = Number(amount);

  if (!amt || amt <= 0) {
    return next(new AppError("Enter a valid adjustment amount.", 400));
  }

  if (!reason) {
    return next(
      new AppError("A reason is required for manual balance adjustments.", 400),
    );
  }

  if (!["credit", "debit"].includes(direction)) {
    return next(new AppError("Direction must be credit or debit.", 400));
  }

  const account = await db.oneOrNone(
    `SELECT *
     FROM accounts
     WHERE id = $1`,
    [req.params.id],
  );

  if (!account) {
    return next(new AppError("Account not found.", 404));
  }

  if (direction === "debit" && Number(account.available_balance) < amt) {
    return next(
      new AppError(
        "Cannot debit more than the available balance.",
        400,
        "INSUFFICIENT_FUNDS",
      ),
    );
  }

  const updated = await db.tx(async (t) => {
    const sign = direction === "credit" ? 1 : -1;

    const a = await t.one(
      `UPDATE accounts
       SET
         balance = balance + $1,
         available_balance = available_balance + $1,
         updated_at = now()
       WHERE id = $2
       RETURNING *`,
      [sign * amt, account.id],
    );

    await t.none(
      `INSERT INTO transactions
       (
         account_id,
         direction,
         category,
         description,
         amount,
         status
       )
       VALUES
       (
         $1,
         $2,
         $3,
         $4,
         $5,
         'completed'
       )`,
      [
        account.id,
        direction,
        category || "admin_adjustment",
        "Manual " + direction + " by administrator",
        amt,
      ],
    );

    await writeAuditLog(t, {
      adminId: req.user.id,
      action: "account.adjust_balance",
      entityType: "account",
      entityId: account.id,
      oldValue: {
        balance: account.balance,
      },
      newValue: {
        balance: a.balance,
      },
      reason,
    });

    await notify(t, {
      userId: account.user_id,
      title: "Account " + direction + "ed",
      body:
        "Your " +
        account.nickname +
        " account was " +
        direction +
        "ed $" +
        amt.toFixed(2) +
        " by a representative. Reason: " +
        reason,
    });

    return a;
  });

  res.status(200).json({
    status: "success",
    data: {
      account: updated,
    },
  });
});

/* ============================================================
   TRANSFERS
   ============================================================ */

exports.listTransfers = catchAsync(async (req, res) => {
  const { status } = req.query;

  const params = [];
  let where = "1=1";

  if (status) {
    params.push(status);
    where = "tr.status = $" + params.length;
  }

  const transfers = await db.any(
    `SELECT
       tr.*,
       u.full_name AS customer_name,
       u.member_number,
       fa.nickname AS from_nickname,
       ta.nickname AS to_nickname
     FROM transfers tr
     JOIN users u
       ON u.id = tr.user_id
     JOIN accounts fa
       ON fa.id = tr.from_account_id
     LEFT JOIN accounts ta
       ON ta.id = tr.to_account_id
     WHERE ${where}
     ORDER BY tr.created_at DESC
     LIMIT 300`,
    params,
  );

  res.status(200).json({
    status: "success",
    results: transfers.length,
    data: {
      transfers,
    },
  });
});

const loadTransfer = async (id) =>
  db.oneOrNone(
    `SELECT
       tr.*,
       fa.balance AS from_balance,
       fa.available_balance AS from_available,
       u.email AS user_email,
       u.full_name AS user_full_name
     FROM transfers tr
     JOIN accounts fa
       ON fa.id = tr.from_account_id
     JOIN users u
       ON u.id = tr.user_id
     WHERE tr.id = $1`,
    [id],
  );

exports.approveTransfer = catchAsync(async (req, res, next) => {
  const transfer = await loadTransfer(req.params.id);

  if (!transfer) {
    return next(new AppError("Transfer not found.", 404));
  }

  if (
    !["pending", "processing", "held", "scheduled"].includes(transfer.status)
  ) {
    return next(
      new AppError(
        'Cannot approve a transfer with status "' + transfer.status + '".',
        400,
      ),
    );
  }

  const updated = await db.tx(async (t) => {
    await t.none(
      `UPDATE accounts
       SET
         balance = balance - $1,
         updated_at = now()
       WHERE id = $2`,
      [transfer.amount, transfer.from_account_id],
    );

    if (transfer.to_account_id) {
      await t.none(
        `UPDATE accounts
         SET
           balance = balance + $1,
           available_balance = available_balance + $1,
           updated_at = now()
         WHERE id = $2`,
        [transfer.amount, transfer.to_account_id],
      );

      await t.none(
        `INSERT INTO transactions
         (
           account_id,
           direction,
           category,
           description,
           amount,
           status,
           related_transfer_id
         )
         VALUES
         (
           $1,
           'credit',
           'transfer',
           $2,
           $3,
           'completed',
           $4
         )`,
        [
          transfer.to_account_id,
          "Transfer received",
          transfer.amount,
          transfer.id,
        ],
      );
    }

    await t.none(
      `INSERT INTO transactions
       (
         account_id,
         direction,
         category,
         description,
         amount,
         status,
         related_transfer_id
       )
       VALUES
       (
         $1,
         'debit',
         'transfer',
         $2,
         $3,
         'completed',
         $4
       )`,
      [
        transfer.from_account_id,
        transfer.external_label || "Transfer sent",
        transfer.amount,
        transfer.id,
      ],
    );

    const tr = await t.one(
      `UPDATE transfers
       SET
         status = 'completed',
         processed_by = $1,
         processed_at = now()
       WHERE id = $2
       RETURNING *`,
      [req.user.id, transfer.id],
    );

    await writeAuditLog(t, {
      adminId: req.user.id,
      action: "transfer.approve",
      entityType: "transfer",
      entityId: transfer.id,
      oldValue: {
        status: transfer.status,
      },
      newValue: {
        status: "completed",
      },
      reason: req.body.reason,
    });

    await notify(t, {
      userId: transfer.user_id,
      title: "Transfer approved",
      body:
        "Your $" +
        Number(transfer.amount).toFixed(2) +
        " transfer was approved and has completed.",
    });

    return tr;
  });

  sendEmail({
    to: transfer.user_email,
    ...templates.transferApproved(
      {
        full_name: transfer.user_full_name,
      },
      updated,
    ),
  }).catch((err) =>
    console.error(
      "[email] transfer approval notification failed:",
      err.message,
    ),
  );

  res.status(200).json({
    status: "success",
    data: {
      transfer: updated,
    },
  });
});

const releaseHoldAndSetStatus = (newStatus, action) =>
  catchAsync(async (req, res, next) => {
    const transfer = await loadTransfer(req.params.id);

    if (!transfer) {
      return next(new AppError("Transfer not found.", 404));
    }

    if (
      !["pending", "processing", "held", "scheduled"].includes(transfer.status)
    ) {
      return next(
        new AppError(
          'Cannot update a transfer with status "' + transfer.status + '".',
          400,
        ),
      );
    }

    if (!req.body.reason) {
      return next(new AppError("A reason is required.", 400));
    }

    const updated = await db.tx(async (t) => {
      await t.none(
        `UPDATE accounts
         SET
           available_balance =
             available_balance + $1,
           updated_at = now()
         WHERE id = $2`,
        [transfer.amount, transfer.from_account_id],
      );

      const tr = await t.one(
        `UPDATE transfers
         SET
           status = $1,
           decline_reason = $2,
           processed_by = $3,
           processed_at = now()
         WHERE id = $4
         RETURNING *`,
        [newStatus, req.body.reason, req.user.id, transfer.id],
      );

      await writeAuditLog(t, {
        adminId: req.user.id,
        action,
        entityType: "transfer",
        entityId: transfer.id,
        oldValue: {
          status: transfer.status,
        },
        newValue: {
          status: newStatus,
        },
        reason: req.body.reason,
      });

      await notify(t, {
        userId: transfer.user_id,
        title: "Transfer " + newStatus,
        body:
          "Your $" +
          Number(transfer.amount).toFixed(2) +
          " transfer was " +
          newStatus +
          ". Reason: " +
          req.body.reason,
      });

      return tr;
    });

    if (newStatus === "declined") {
      sendEmail({
        to: transfer.user_email,
        ...templates.transferRejected(
          {
            full_name: transfer.user_full_name,
          },
          updated,
          req.body.reason,
        ),
      }).catch((err) =>
        console.error(
          "[email] transfer decline notification failed:",
          err.message,
        ),
      );
    }

    res.status(200).json({
      status: "success",
      data: {
        transfer: updated,
      },
    });
  });

exports.rejectTransfer = releaseHoldAndSetStatus("declined", "transfer.reject");

exports.cancelTransfer = releaseHoldAndSetStatus(
  "cancelled",
  "transfer.cancel",
);

exports.markTransferFailed = releaseHoldAndSetStatus(
  "failed",
  "transfer.mark_failed",
);

exports.holdTransfer = catchAsync(async (req, res, next) => {
  const transfer = await loadTransfer(req.params.id);

  if (!transfer) {
    return next(new AppError("Transfer not found.", 404));
  }

  if (!["pending", "processing", "scheduled"].includes(transfer.status)) {
    return next(
      new AppError(
        'Cannot hold a transfer with status "' + transfer.status + '".',
        400,
      ),
    );
  }

  const updated = await db.tx(async (t) => {
    const tr = await t.one(
      `UPDATE transfers
       SET
         status = 'held',
         processed_by = $1
       WHERE id = $2
       RETURNING *`,
      [req.user.id, transfer.id],
    );

    await writeAuditLog(t, {
      adminId: req.user.id,
      action: "transfer.hold",
      entityType: "transfer",
      entityId: transfer.id,
      oldValue: {
        status: transfer.status,
      },
      newValue: {
        status: "held",
      },
      reason: req.body.reason,
    });

    await notify(t, {
      userId: transfer.user_id,
      title: "Transfer under review",
      body:
        "Your $" +
        Number(transfer.amount).toFixed(2) +
        " transfer has been placed on hold for review.",
    });

    return tr;
  });

  res.status(200).json({
    status: "success",
    data: {
      transfer: updated,
    },
  });
});

exports.releaseTransfer = catchAsync(async (req, res, next) => {
  const transfer = await loadTransfer(req.params.id);

  if (!transfer) {
    return next(new AppError("Transfer not found.", 404));
  }

  if (transfer.status !== "held") {
    return next(new AppError("Only held transfers can be released.", 400));
  }

  const updated = await db.tx(async (t) => {
    const tr = await t.one(
      `UPDATE transfers
       SET status = 'pending'
       WHERE id = $1
       RETURNING *`,
      [transfer.id],
    );

    await writeAuditLog(t, {
      adminId: req.user.id,
      action: "transfer.release",
      entityType: "transfer",
      entityId: transfer.id,
      oldValue: {
        status: "held",
      },
      newValue: {
        status: "pending",
      },
      reason: req.body.reason,
    });

    return tr;
  });

  res.status(200).json({
    status: "success",
    data: {
      transfer: updated,
    },
  });
});

exports.reverseTransfer = catchAsync(async (req, res, next) => {
  const transfer = await loadTransfer(req.params.id);

  if (!transfer) {
    return next(new AppError("Transfer not found.", 404));
  }

  if (!["completed", "refunded"].includes(transfer.status)) {
    return next(new AppError("Only completed transfers can be reversed.", 400));
  }

  if (!req.body.reason) {
    return next(
      new AppError("A reason is required to reverse a transfer.", 400),
    );
  }

  const updated = await db.tx(async (t) => {
    await t.none(
      `UPDATE accounts
       SET
         balance = balance + $1,
         available_balance =
           available_balance + $1,
         updated_at = now()
       WHERE id = $2`,
      [transfer.amount, transfer.from_account_id],
    );

    if (transfer.to_account_id) {
      await t.none(
        `UPDATE accounts
         SET
           balance = balance - $1,
           available_balance =
             available_balance - $1,
           updated_at = now()
         WHERE id = $2`,
        [transfer.amount, transfer.to_account_id],
      );
    }

    await t.none(
      `INSERT INTO transactions
       (
         account_id,
         direction,
         category,
         description,
         amount,
         status,
         related_transfer_id
       )
       VALUES
       (
         $1,
         'credit',
         'reversal',
         $2,
         $3,
         'reversed',
         $4
       )`,
      [
        transfer.from_account_id,
        "Transfer reversed",
        transfer.amount,
        transfer.id,
      ],
    );

    const tr = await t.one(
      `UPDATE transfers
       SET
         status = 'reversed',
         processed_by = $1,
         processed_at = now(),
         decline_reason = $2
       WHERE id = $3
       RETURNING *`,
      [req.user.id, req.body.reason, transfer.id],
    );

    await writeAuditLog(t, {
      adminId: req.user.id,
      action: "transfer.reverse",
      entityType: "transfer",
      entityId: transfer.id,
      oldValue: {
        status: transfer.status,
      },
      newValue: {
        status: "reversed",
      },
      reason: req.body.reason,
    });

    await notify(t, {
      userId: transfer.user_id,
      title: "Transfer reversed",
      body:
        "Your $" +
        Number(transfer.amount).toFixed(2) +
        " transfer was reversed by a representative. Reason: " +
        req.body.reason,
    });

    return tr;
  });

  res.status(200).json({
    status: "success",
    data: {
      transfer: updated,
    },
  });
});

/* ============================================================
   CREDIT SCORE
   ============================================================ */

exports.getCustomerCreditScore = catchAsync(async (req, res, next) => {
  const customer = await db.oneOrNone(
    `SELECT
         id,
         full_name
       FROM users
       WHERE id = $1
         AND role = 'customer'`,
    [req.params.id],
  );

  if (!customer) {
    return next(new AppError("Customer not found.", 404));
  }

  const history = await db.any(
    `SELECT
         cs.*,
         u.full_name AS set_by_name
       FROM credit_scores cs
       LEFT JOIN users u
         ON u.id = cs.set_by_admin_id
       WHERE cs.user_id = $1
       ORDER BY cs.recorded_at DESC
       LIMIT 20`,
    [req.params.id],
  );

  res.status(200).json({
    status: "success",
    data: {
      current: history[0] || null,
      history,
    },
  });
});

exports.setCustomerCreditScore = catchAsync(async (req, res, next) => {
  const {
    score,
    reason,
    paymentHistoryPct,
    usagePct,
    creditAgeYears,
    hardInquiries,
  } = req.body;

  const scoreNum = Number(score);

  if (!Number.isInteger(scoreNum) || scoreNum < 300 || scoreNum > 850) {
    return next(
      new AppError(
        "Credit score must be a whole number between 300 and 850.",
        400,
        "VALIDATION_ERROR",
      ),
    );
  }

  if (!reason) {
    return next(
      new AppError("A reason is required to change a credit score.", 400),
    );
  }

  const customer = await db.oneOrNone(
    `SELECT
         id,
         email,
         full_name
       FROM users
       WHERE id = $1
         AND role = 'customer'`,
    [req.params.id],
  );

  if (!customer) {
    return next(new AppError("Customer not found.", 404));
  }

  const previous = await db.oneOrNone(
    `SELECT score
       FROM credit_scores
       WHERE user_id = $1
       ORDER BY recorded_at DESC
       LIMIT 1`,
    [customer.id],
  );

  const created = await db.tx(async (t) => {
    const row = await t.one(
      `INSERT INTO credit_scores
         (
           user_id,
           score,
           payment_history_pct,
           usage_pct,
           credit_age_years,
           hard_inquiries,
           set_by_admin_id,
           reason
         )
         VALUES
         (
           $1,
           $2,
           $3,
           $4,
           $5,
           $6,
           $7,
           $8
         )
         RETURNING *`,
      [
        customer.id,
        scoreNum,
        paymentHistoryPct ?? 100,
        usagePct ?? 0,
        creditAgeYears ?? 0,
        hardInquiries ?? 0,
        req.user.id,
        reason,
      ],
    );

    await writeAuditLog(t, {
      adminId: req.user.id,
      action: "credit_score.set",
      entityType: "user",
      entityId: customer.id,
      oldValue: {
        score: previous?.score ?? null,
      },
      newValue: {
        score: scoreNum,
      },
      reason,
    });

    await notify(t, {
      userId: customer.id,
      title: "Credit score updated",
      body: "Your simulated credit score was updated to " + scoreNum + ".",
    });

    return row;
  });

  sendEmail({
    to: customer.email,
    ...templates.creditScoreChanged(customer, scoreNum, reason),
  }).catch((err) =>
    console.error("[email] credit score notification failed:", err.message),
  );

  res.status(201).json({
    status: "success",
    data: {
      creditScore: created,
    },
  });
});

/* ============================================================
   AUDIT LOGS
   ============================================================ */

exports.listAuditLogs = catchAsync(async (req, res) => {
  const logs = await db.any(
    `SELECT
       al.*,
       u.full_name AS admin_name,
       u.email AS admin_email
     FROM audit_logs al
     JOIN users u
       ON u.id = al.admin_id
     ORDER BY al.created_at DESC
     LIMIT 300`,
  );

  res.status(200).json({
    status: "success",
    results: logs.length,
    data: {
      logs,
    },
  });
});

/* ============================================================
   DASHBOARD SUMMARY
   ============================================================ */

exports.dashboardSummary = catchAsync(async (req, res) => {
  const [customers, pendingTransfers, totalBalances, todayVolume] =
    await Promise.all([
      db.one(
        `SELECT
           count(*)::int AS count
         FROM users
         WHERE role = 'customer'`,
      ),

      db.one(
        `SELECT
           count(*)::int AS count
         FROM transfers
         WHERE status IN
           (
             'pending',
             'processing',
             'held',
             'scheduled'
           )`,
      ),

      db.one(
        `SELECT
           COALESCE(
             sum(balance),
             0
           )::float AS total
         FROM accounts
         WHERE status != 'closed'`,
      ),

      db.one(
        `SELECT
           COALESCE(
             sum(amount),
             0
           )::float AS total
         FROM transfers
         WHERE status = 'completed'
           AND processed_at >=
             now() - interval '1 day'`,
      ),
    ]);

  res.status(200).json({
    status: "success",
    data: {
      customerCount: customers.count,

      pendingTransfersCount: pendingTransfers.count,

      totalDeposits: totalBalances.total,

      last24hVolume: todayVolume.total,
    },
  });
});

/* ============================================================
   LIVE CHAT — SUPPORT / ADMIN
   ============================================================ */

exports.listChatConversations = catchAsync(async (req, res) => {
  const conversations = await db.any(
    `SELECT
         c.id,
         c.user_id,
         c.status,
         c.created_at,
         c.updated_at,

         u.full_name AS customer_name,
         u.email AS customer_email,
         u.member_number,

         (
           SELECT message
           FROM chat_messages
           WHERE conversation_id = c.id
           ORDER BY created_at DESC
           LIMIT 1
         ) AS last_message,

         (
           SELECT created_at
           FROM chat_messages
           WHERE conversation_id = c.id
           ORDER BY created_at DESC
           LIMIT 1
         ) AS last_message_at

       FROM chat_conversations c

       JOIN users u
         ON u.id = c.user_id

       WHERE u.role = 'customer'

       ORDER BY c.updated_at DESC

       LIMIT 200`,
  );

  res.status(200).json({
    status: "success",
    results: conversations.length,
    data: {
      conversations,
    },
  });
});

exports.adminGetChatMessages = catchAsync(async (req, res, next) => {
  const conversation = await db.oneOrNone(
    `SELECT
           c.id,
           c.user_id,
           c.status,
           c.created_at,
           c.updated_at,

           u.full_name AS customer_name,
           u.email AS customer_email,
           u.member_number

         FROM chat_conversations c

         JOIN users u
           ON u.id = c.user_id

         WHERE c.id = $1
           AND u.role = 'customer'`,
    [req.params.conversationId],
  );

  if (!conversation) {
    return next(new AppError("Chat conversation not found.", 404));
  }

  const messages = await db.any(
    `SELECT
         m.id,
         m.conversation_id,
         m.sender_id,
         m.message,
         m.created_at,
         m.read_at,

         u.full_name AS sender_name,
         u.role AS sender_role

       FROM chat_messages m

       JOIN users u
         ON u.id = m.sender_id

       WHERE m.conversation_id = $1

       ORDER BY m.created_at ASC`,
    [conversation.id],
  );

  await db.none(
    `UPDATE chat_messages
       SET read_at = now()
       WHERE conversation_id = $1
         AND sender_id = $2
         AND read_at IS NULL`,
    [conversation.id, conversation.user_id],
  );

  res.status(200).json({
    status: "success",
    results: messages.length,
    data: {
      conversation,
      messages,
    },
  });
});

exports.adminSendChatMessage = catchAsync(async (req, res, next) => {
  const { message } = req.body;

  if (!message || !message.trim()) {
    return next(new AppError("Message cannot be empty.", 400));
  }

  const conversation = await db.oneOrNone(
    `SELECT
           id,
           user_id,
           status
         FROM chat_conversations
         WHERE id = $1`,
    [req.params.conversationId],
  );

  if (!conversation) {
    return next(new AppError("Chat conversation not found.", 404));
  }

  if (conversation.status !== "open") {
    return next(new AppError("This chat conversation is closed.", 400));
  }

  const newMessage = await db.tx(async (t) => {
    const created = await t.one(
      `INSERT INTO chat_messages
           (
             conversation_id,
             sender_id,
             message
           )
           VALUES
           (
             $1,
             $2,
             $3
           )
           RETURNING *`,
      [conversation.id, req.user.id, message.trim()],
    );

    await t.none(
      `UPDATE chat_conversations
           SET
             updated_at = now()
           WHERE id = $1`,
      [conversation.id],
    );

    return created;
  });

  res.status(201).json({
    status: "success",
    data: {
      message: newMessage,
    },
  });
});

exports.adminCloseChatConversation = catchAsync(async (req, res, next) => {
  const conversation = await db.oneOrNone(
    `UPDATE chat_conversations
         SET
           status = 'closed',
           updated_at = now()
         WHERE id = $1
         RETURNING *`,
    [req.params.conversationId],
  );

  if (!conversation) {
    return next(new AppError("Chat conversation not found.", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      conversation,
    },
  });
});

/* ============================================================
   DAILY SETTLEMENT CYCLE
   ============================================================ */

exports.runDailyCycle = catchAsync(async (req, res) => {
  const result = await runDailyCycle(db);

  await writeAuditLog(db, {
    adminId: req.user.id,
    action: "system.run_daily_cycle",
    entityType: "system",
    entityId: req.user.id,

    newValue: {
      investmentsAccrued: result.investments.length,

      chargesProcessed: result.charges.length,
    },

    reason: "Manually triggered from admin console",
  });

  res.status(200).json({
    status: "success",
    data: result,
  });
});
