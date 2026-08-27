const pgPromise = require("pg-promise");

require("dotenv").config();

const pgp = pgPromise({
  error(err, e) {
    if (e.cn) {
      console.error("[db] connection error:", err);
    }
  },
});

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("❌ DATABASE_URL is missing");
} else {
  try {
    const parsed = new URL(databaseUrl);

    console.log("[db] Database configuration:");
    console.log("  protocol:", parsed.protocol);
    console.log("  hostname:", parsed.hostname);
    console.log("  port:", parsed.port);
    console.log("  database:", parsed.pathname);
    console.log("  username:", parsed.username);
  } catch (err) {
    console.error("❌ DATABASE_URL is malformed");
  }
}

const db = pgp({
  connectionString: databaseUrl,
  max: 20,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Verify the database connection when the server starts
db.one("SELECT NOW() AS now")
  .then(() => {
    console.log("✅ PostgreSQL connection successful");
  })
  .catch((err) => {
    console.error("❌ PostgreSQL connection failed.");
    console.error(err);
  });

module.exports = db;
