import { foundItems } from "../../db/schema.js";
import { sql, eq } from "drizzle-orm";

export async function generateInventoryCode(tx: any, year?: number): Promise<string> {
  const currentYear = year || new Date().getFullYear();
  const prefix = `INV-${currentYear}-`;

  const [result] = await tx
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(foundItems)
    .where(sql`${foundItems.inventoryCode} LIKE ${prefix + "%"}`);

  let nextSeq = (result?.count || 0) + 1;
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
