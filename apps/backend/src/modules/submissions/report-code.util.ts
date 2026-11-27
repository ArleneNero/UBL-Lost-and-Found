import { foundSubmissions } from "../../db/schema.js";
import { sql, eq } from "drizzle-orm";
import type { DbTransaction } from "../../db/index.js";

const REPORT_LOCK_NAMESPACE = 2;

export async function generateReportCode(tx: DbTransaction, year?: number): Promise<string> {
  const currentYear = year ?? new Date().getFullYear();
  const prefix = `REP-${currentYear}-`;
  const numericPattern = `^${prefix}[0-9]+$`;

  // Serialize sequence allocation per prefix & year within the transaction (FIND-11)
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(${REPORT_LOCK_NAMESPACE}::int, ${currentYear}::int)`
  );

  const [result] = await tx
    .select({
      maxSeq: sql<number>`COALESCE(MAX(CASE WHEN ${foundSubmissions.reportCode} ~ ${numericPattern} THEN SUBSTRING(${foundSubmissions.reportCode} FROM '-([0-9]+)$')::int ELSE 0 END), 0)::int`,
    })
    .from(foundSubmissions)
    .where(sql`${foundSubmissions.reportCode} LIKE ${prefix + "%"}`);

  let nextSeq = Number(result?.maxSeq ?? 0) + 1;
  let candidate = `${prefix}${String(nextSeq).padStart(4, "0")}`;

  while (true) {
    const existing = await tx.query.foundSubmissions.findFirst({
      where: eq(foundSubmissions.reportCode, candidate),
    });
    if (!existing) {
      break;
    }
    nextSeq++;
    candidate = `${prefix}${String(nextSeq).padStart(4, "0")}`;
  }

  return candidate;
}
