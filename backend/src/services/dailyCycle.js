// Simulated daily settlement cycle. Two things happen each time this runs:
//  1. Every investment holding gets a randomized daily price move, and the
//     resulting gain/loss is posted straight into the linked account balance.
//  2. Any recurring charge (bill, subscription, simulated tax withholding)
//     whose next_run_date has arrived gets debited and rolled forward.
//
// Triggered automatically once a day by node-cron (see server.js) and can
// also be triggered on demand from the admin console for demos.

const STOCK_VOLATILITY = 2.2; // rough daily stddev, in percent, for the random walk

function randomDailyMovePct() {
  // Box-Muller-ish approximation for a roughly bell-shaped daily return,
  // centered slightly positive to mimic long-run market drift.
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return 0.15 + z * STOCK_VOLATILITY;
}

function advanceDate(date, frequency) {
  const d = new Date(date);
  if (frequency === 'weekly') d.setDate(d.getDate() + 7);
  else if (frequency === 'quarterly') d.setMonth(d.getMonth() + 3);
  else d.setMonth(d.getMonth() + 1); // monthly default
  return d.toISOString().split('T')[0];
}

async function accrueInvestments(db) {
  const investments = await db.any('SELECT * FROM investments');
  const results = [];

  for (const inv of investments) {
    const pct = randomDailyMovePct();
    const oldPrice = Number(inv.current_price);
    const newPrice = Math.max(0.01, oldPrice * (1 + pct / 100));
    const oldValue = oldPrice * Number(inv.shares);
    const newValue = newPrice * Number(inv.shares);
    const delta = newValue - oldValue;

    await db.tx(async (t) => {
      await t.none(
        `UPDATE investments SET current_price = $1, daily_change_pct = $2, last_accrued_at = now() WHERE id = $3`,
        [newPrice.toFixed(2), pct.toFixed(3), inv.id]
      );
      if (Math.abs(delta) >= 0.01) {
        await t.none(
          'UPDATE accounts SET balance = balance + $1, available_balance = available_balance + $1, updated_at = now() WHERE id = $2',
          [delta, inv.account_id]
        );
        await t.none(
          `INSERT INTO transactions (account_id, direction, category, description, amount, status)
           VALUES ($1,$2,'investment',$3,$4,'completed')`,
          [
            inv.account_id,
            delta >= 0 ? 'credit' : 'debit',
            `${inv.symbol} daily ${delta >= 0 ? 'gain' : 'loss'} (${pct.toFixed(2)}%)`,
            Math.abs(delta).toFixed(2),
          ]
        );
      }
    });

    results.push({ symbol: inv.symbol, pct: Number(pct.toFixed(3)), delta: Number(delta.toFixed(2)) });
  }

  return results;
}

async function processRecurringCharges(db) {
  const today = new Date().toISOString().split('T')[0];
  const due = await db.any('SELECT * FROM recurring_charges WHERE active = true AND next_run_date <= $1', [today]);
  const results = [];

  for (const charge of due) {
    const account = await db.oneOrNone('SELECT * FROM accounts WHERE id = $1', [charge.account_id]);
    if (!account) continue;

    const canPay = Number(account.available_balance) >= Number(charge.amount);

    await db.tx(async (t) => {
      if (canPay) {
        await t.none(
          'UPDATE accounts SET balance = balance - $1, available_balance = available_balance - $1, updated_at = now() WHERE id = $2',
          [charge.amount, account.id]
        );
      }
      await t.none(
        `INSERT INTO transactions (account_id, direction, category, description, amount, status)
         VALUES ($1,'debit',$2,$3,$4,$5)`,
        [account.id, charge.category, charge.payee, charge.amount, canPay ? 'completed' : 'declined']
      );
      await t.none('UPDATE recurring_charges SET next_run_date = $1 WHERE id = $2', [
        advanceDate(charge.next_run_date, charge.frequency),
        charge.id,
      ]);
      if (!canPay) {
        await t.none(
          `INSERT INTO notifications (user_id, title, body) VALUES ($1,$2,$3)`,
          [charge.user_id, 'Payment declined', `${charge.payee} for $${Number(charge.amount).toFixed(2)} was declined — insufficient funds.`]
        );
      }
    });

    results.push({ payee: charge.payee, amount: Number(charge.amount), paid: canPay });
  }

  return results;
}

async function runDailyCycle(db) {
  const investmentResults = await accrueInvestments(db);
  const chargeResults = await processRecurringCharges(db);
  return { investments: investmentResults, charges: chargeResults, ranAt: new Date().toISOString() };
}

module.exports = { runDailyCycle, accrueInvestments, processRecurringCharges };
