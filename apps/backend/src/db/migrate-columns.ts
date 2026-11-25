import { pool } from "./index.js";

async function migrateColumns() {
  console.log("🔧 Running idempotent column migrations on found_items...");
  await pool.query(`
    ALTER TABLE found_items
    ADD COLUMN IF NOT EXISTS storage_limit_days INTEGER,
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
  `);
  const res = await pool.query<{ column_name: string }>(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'found_items'
    ORDER BY ordinal_position;
  `);
  console.log("✅ found_items columns:", res.rows.map((r) => r.column_name).join(", "));

  console.log("🔧 Running idempotent column migrations on item_returns...");
  await pool.query(`
    ALTER TABLE item_returns
    ADD COLUMN IF NOT EXISTS recipient_identifier VARCHAR(50);
  `);
  const returnCols = await pool.query<{ column_name: string }>(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'item_returns'
    ORDER BY ordinal_position;
  `);
  console.log("✅ item_returns columns:", returnCols.rows.map((r) => r.column_name).join(", "));

  console.log("🔧 Running idempotent table migration for otp_challenges...");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS otp_challenges (
      challenge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(180) NOT NULL,
      otp_salt TEXT NOT NULL,
      otp_hash TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 5,
      expires_at TIMESTAMPTZ NOT NULL,
      resend_available_at TIMESTAMPTZ NOT NULL,
      consumed_at TIMESTAMPTZ,
      locked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_otp_challenges_email_created
      ON otp_challenges (email, created_at DESC);
  `);
  const otpCols = await pool.query<{ column_name: string }>(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'otp_challenges'
    ORDER BY ordinal_position;
  `);
  console.log("✅ otp_challenges columns:", otpCols.rows.map((r) => r.column_name).join(", "));

  await pool.end();
}

migrateColumns().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
