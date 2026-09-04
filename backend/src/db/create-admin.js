require("dotenv").config();

const argon2 = require("argon2");
const { db } = require("../config/db");
const { generateMemberNumber } = require("../utils/generators");

async function createAdmin() {
  const email = "admin@meridiantrust.demo";
  const password = "Admin!2345";

  try {
    const existing = await db.oneOrNone(
      "SELECT id, email, role FROM users WHERE email = $1",
      [email],
    );

    if (existing) {
      console.log("Admin already exists:");
      console.log(existing);
      return;
    }

    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
    });

    const admin = await db.one(
      `INSERT INTO users
        (member_number, full_name, email, password_hash, role, status, kyc_status, avatar_initials)
       VALUES
        ($1, $2, $3, $4, 'admin', 'active', 'verified', 'MR')
       RETURNING id, member_number, full_name, email, role, status`,
      [generateMemberNumber(), "Marcus Reyes", email, passwordHash],
    );

    console.log("✅ Admin created successfully:");
    console.log(admin);
  } catch (error) {
    console.error("❌ Failed to create admin:");
    console.error(error);
  } finally {
    process.exit();
  }
}

createAdmin();
