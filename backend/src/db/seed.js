require('dotenv').config();
const argon2 = require('argon2');
const { db, pgp } = require('../config/db');
const { generateAccountNumber, generateMemberNumber } = require('../utils/generators');

const hash = (pw) => argon2.hash(pw, { type: argon2.argon2id });

function nextMonth(day = 1) {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, day);
  return d.toISOString().split('T')[0];
}
function inDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

async function seed() {
  console.log('Seeding Meridian Trust demo data...');

  await db.tx(async (t) => {
    // Wipe existing demo data (safe for a fresh dev database only).
    await t.none(
      `TRUNCATE notifications, audit_logs, credit_scores, recurring_charges, investments,
       transactions, transfers, accounts, users RESTART IDENTITY CASCADE`
    );

    const superAdminHash = await hash('SuperAdmin!2345');
    const adminHash = await hash('Admin!2345');
    const memberHash = await hash('Password!2345');

    const superAdmin = await t.one(
      `INSERT INTO users (member_number, full_name, email, password_hash, role, status, kyc_status, avatar_initials)
       VALUES ($1,'Nora Whitfield','superadmin@meridiantrust.demo',$2,'superadmin','active','verified','NW') RETURNING *`,
      [generateMemberNumber(), superAdminHash]
    );

    const admin = await t.one(
      `INSERT INTO users (member_number, full_name, email, password_hash, role, status, kyc_status, avatar_initials)
       VALUES ($1,'Marcus Reyes','admin@meridiantrust.demo',$2,'admin','active','verified','MR') RETURNING *`,
      [generateMemberNumber(), adminHash]
    );

    // ---- Flagship demo member: Edward Etkinson -------------------------
    const member = await t.one(
      `INSERT INTO users (member_number, full_name, email, phone, password_hash, role, status, kyc_status, avatar_initials, created_at)
       VALUES ($1,'Edward Etkinson','edward.etkinson@example.com','+1-914-555-0142',$2,'customer','active','verified','EE','2018-06-14') RETURNING *`,
      [generateMemberNumber(), memberHash]
    );

    const checking = await t.one(
      `INSERT INTO accounts (user_id, account_type, account_number, nickname, balance, available_balance)
       VALUES ($1,'checking',$2,'Everyday Checking', 84215.22, 84215.22) RETURNING *`,
      [member.id, generateAccountNumber()]
    );

    const savings = await t.one(
      `INSERT INTO accounts (user_id, account_type, account_number, nickname, balance, available_balance, apy, savings_goal)
       VALUES ($1,'savings',$2,'High-Yield Savings', 1120000.00, 1120000.00, 4.50, 1500000) RETURNING *`,
      [member.id, generateAccountNumber()]
    );

    const credit = await t.one(
      `INSERT INTO accounts (user_id, account_type, account_number, nickname, balance, available_balance, credit_limit)
       VALUES ($1,'credit',$2,'Visa Signature Card', 1447.00, 48553.00, 50000) RETURNING *`,
      [member.id, generateAccountNumber()]
    );

    const brokerage = await t.one(
      `INSERT INTO accounts (user_id, account_type, account_number, nickname, balance, available_balance)
       VALUES ($1,'savings',$2,'Brokerage / Investment Account', 850000.00, 850000.00) RETURNING *`,
      [member.id, generateAccountNumber()]
    );
    // Total across checking + savings + brokerage: $84,215.22 + $1,120,000 + $850,000 ≈ $2.05M

    await t.none(
      `INSERT INTO credit_scores (user_id, score, payment_history_pct, usage_pct, credit_age_years, hard_inquiries)
       VALUES ($1, 796, 100, 3, 12, 1)`,
      [member.id]
    );

    // ---- Investment holdings, linked to the brokerage account ----------
    const holdings = [
      ['TSLA', 'Tesla, Inc.', 220, 189.40, 248.12],
      ['AAPL', 'Apple Inc.', 400, 165.20, 214.88],
      ['NVDA', 'NVIDIA Corporation', 150, 410.00, 612.55],
      ['VOO', 'Vanguard S&P 500 ETF', 500, 380.00, 452.30],
      ['MSFT', 'Microsoft Corporation', 180, 310.00, 398.21],
    ];
    for (const [symbol, name, shares, avgCost, currentPrice] of holdings) {
      await t.none(
        `INSERT INTO investments (user_id, account_id, symbol, company_name, shares, avg_cost, current_price)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [member.id, brokerage.id, symbol, name, shares, avgCost, currentPrice]
      );
    }

    // ---- Recurring charges — real-world-style bills, subscriptions, tax --
    const charges = [
      [checking.id, 'Internal Revenue Service — Est. Tax', 'taxes', 4200.0, 'quarterly', nextMonth(15)],
      [checking.id, 'New York State Dept. of Taxation', 'taxes', 950.0, 'quarterly', nextMonth(15)],
      [checking.id, 'Con Edison Utilities', 'bills', 184.5, 'monthly', nextMonth(3)],
      [checking.id, 'Verizon Wireless', 'bills', 96.0, 'monthly', nextMonth(7)],
      [checking.id, 'Blue Cross Blue Shield Premium', 'bills', 612.0, 'monthly', nextMonth(1)],
      [checking.id, 'Spotify Premium', 'subscription', 11.99, 'monthly', nextMonth(20)],
      [checking.id, 'Cloud Storage Pro', 'subscription', 9.99, 'monthly', nextMonth(25)],
      [checking.id, 'Meridian Trust Mortgage Payment', 'bills', 3120.0, 'monthly', nextMonth(1)],
    ];
    for (const [accountId, payee, category, amount, frequency, nextRunDate] of charges) {
      await t.none(
        `INSERT INTO recurring_charges (user_id, account_id, payee, category, amount, frequency, next_run_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [member.id, accountId, payee, category, amount, frequency, nextRunDate]
      );
    }

    // ---- Recent transaction history, matching the balances above -------
    const txns = [
      [checking.id, 'credit', 'income', 'Direct Deposit — Employer', 12450.0, "now() - interval '2 hours'"],
      [credit.id, 'debit', 'shopping', 'Amazon', 267.99, "now() - interval '1 day'"],
      [checking.id, 'debit', 'food', 'Nobu Restaurant', 314.25, "now() - interval '3 days'"],
      [checking.id, 'debit', 'transfer', 'Transfer to Brokerage', 5000.0, "now() - interval '4 days'"],
      [checking.id, 'debit', 'bills', 'Con Edison Utilities', 184.5, "now() - interval '5 days'"],
      [credit.id, 'debit', 'gas', 'Shell Gas Station', 82.4, "now() - interval '6 days'"],
      [checking.id, 'debit', 'taxes', 'Internal Revenue Service — Est. Tax', 4200.0, "now() - interval '20 days'"],
      [brokerage.id, 'credit', 'investment', 'TSLA daily gain (1.8%)', 981.4, "now() - interval '1 day'"],
    ];
    for (const [accountId, direction, category, description, amount, ts] of txns) {
      await t.none(
        `INSERT INTO transactions (account_id, direction, category, description, amount, status, created_at)
         VALUES ($1,$2,$3,$4,$5,'completed', ${ts})`,
        [accountId, direction, category, description, amount]
      );
    }

    // ---- A second member, used to test the admin approval queue --------
    const member2 = await t.one(
      `INSERT INTO users (member_number, full_name, email, phone, password_hash, role, status, kyc_status, avatar_initials)
       VALUES ($1,'Priya Nandakumar','priya.n@example.com','+1-914-555-0198',$2,'customer','active','verified','PN') RETURNING *`,
      [generateMemberNumber(), memberHash]
    );
    const checking2 = await t.one(
      `INSERT INTO accounts (user_id, account_type, account_number, nickname, balance, available_balance)
       VALUES ($1,'checking',$2,'Everyday Checking', 2100.0, 1400.0) RETURNING *`,
      [member2.id, generateAccountNumber()]
    );
    await t.none(
      `INSERT INTO credit_scores (user_id, score, payment_history_pct, usage_pct, credit_age_years, hard_inquiries)
       VALUES ($1, 701, 96, 22, 3, 2)`,
      [member2.id]
    );
    await t.none(
      `INSERT INTO transfers (user_id, from_account_id, external_label, kind, amount, memo, status)
       VALUES ($1,$2,'External Account (ACH)','external_ach', 700.0, 'Rent', 'pending')`,
      [member2.id, checking2.id]
    );

    // ---- A third member with KYC still pending, to demo the review workflow ----
    const member3 = await t.one(
      `INSERT INTO users (member_number, full_name, email, phone, password_hash, role, status, kyc_status, avatar_initials)
       VALUES ($1,'James Okafor','james.okafor@example.com','+1-914-555-0177',$2,'customer','active','pending','JO') RETURNING *`,
      [generateMemberNumber(), memberHash]
    );
    await t.none(
      `INSERT INTO accounts (user_id, account_type, account_number, nickname, balance, available_balance)
       VALUES ($1,'checking',$2,'Everyday Checking', 500.0, 500.0)`,
      [member3.id, generateAccountNumber()]
    );
    await t.none(
      `INSERT INTO credit_scores (user_id, score, payment_history_pct, usage_pct, credit_age_years, hard_inquiries)
       VALUES ($1, 680, 100, 0, 0, 0)`,
      [member3.id]
    );

    console.log('Seeded successfully. This is entirely simulated demo data — no real funds, no real institution.\n');
    console.log('  Superadmin login: superadmin@meridiantrust.demo / SuperAdmin!2345');
    console.log('  Admin login:      admin@meridiantrust.demo / Admin!2345');
    console.log('  Member login:     edward.etkinson@example.com / Password!2345');
    console.log('  Member login:     priya.n@example.com / Password!2345');
    console.log('  Member login (KYC pending — try approving in the admin console): james.okafor@example.com / Password!2345');
    console.log('\n  Or use the in-app "Create Account" form to sign up with your own email + password.');
  });
}

seed()
  .then(() => {
    pgp.end();
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed failed:', err);
    pgp.end();
    process.exit(1);
  });
