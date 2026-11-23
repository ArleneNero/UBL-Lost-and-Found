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
  await pool.end();
}

migrateColumns().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
