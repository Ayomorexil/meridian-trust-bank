require('dotenv').config();
const cron = require('node-cron');
const app = require('./app');
const { db } = require('./config/db');
const { runDailyCycle } = require('./services/dailyCycle');

const PORT = process.env.PORT || 5000;

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});

// Real scheduled job: every day at 00:05 server time, accrue investment
// gains/losses and process any due bills/subscriptions/tax withholdings.
// (Also triggerable on demand from the admin console for demos.)
cron.schedule('5 0 * * *', async () => {
  try {
    const result = await runDailyCycle(db);
    console.log(
      `[daily-cycle] accrued ${result.investments.length} holdings, processed ${result.charges.length} recurring charges`
    );
  } catch (err) {
    console.error('[daily-cycle] failed:', err);
  }
});

app.listen(PORT, () => {
  console.log(`Meridian Trust API listening on port ${PORT}`);
});


