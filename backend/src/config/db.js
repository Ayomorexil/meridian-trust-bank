const pgPromise = require('pg-promise');
require('dotenv').config();

const pgp = pgPromise({
  error(err, e) {
    if (e.cn) {
      console.error('[db] connection error:', err);
    }
  },
});

const db = pgp({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Verify the database connection when the server starts
db.connect()
  .then((obj) => {
    console.log('✅ PostgreSQL connected successfully.');
    obj.done();
  })
  .catch((err) => {
    console.error('❌ PostgreSQL connection failed.');
    console.error(err);
  });

module.exports = { db, pgp };