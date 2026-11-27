import { foundItems } from "../../db/schema.js";
import { sql, eq } from "drizzle-orm";
import type { DbTransaction } from "../../db/index.js";

const INVENTORY_LOCK_NAMESPACE = 1;

export async function generateInventoryCode(tx: DbTransaction, year?: number): Promise<string> {
  const currentYear = year ?? new Date().getFullYear();
  const prefix = `INV-${currentYear}-`;
  const numericPattern = `^${prefix}[0-9]+$`;

  // Serialize sequence allocation per prefix & year within the transaction (FIND-11)
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(${INVENTORY_LOCK_NAMESPACE}::int, ${currentYear}::int)`
  );

  const [result] = await tx
    .select({
      maxSeq: sql<number>`COALESCE(MAX(CASE WHEN ${foundItems.inventoryCode} ~ ${numericPattern} THEN SUBSTRING(${foundItems.inventoryCode} FROM '-([0-9]+)$')::int ELSE 0 END), 0)::int`,
    })
    .from(foundItems)
    .where(sql`${foundItems.inventoryCode} LIKE ${prefix + "%"}`);

  let nextSeq = Number(result?.maxSeq ?? 0) + 1;
  let candidate = `${prefix}${String(nextSeq).padStart(4, "0")}`;

  while (true) {
    const existing = await tx.query.foundItems.findFirst({
      where: eq(foundItems.inventoryCode, candidate),
    });
    if (!existing) {
      break;
    }
    nextSeq++;
    candidate = `${prefix}${String(nextSeq).padStart(4, "0")}`;
  }

  return candidate;
}
