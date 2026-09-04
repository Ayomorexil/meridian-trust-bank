require('dotenv').config();
const fs = require('fs');
const { db } = require('./src/config/db');

async function runMigration() {
  try {
    const sql = fs.readFileSync(
      './src/db/migrations/002_live_chat.sql',
      'utf8'
    );

    await db.none(sql);

    console.log('✅ Live chat migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();

