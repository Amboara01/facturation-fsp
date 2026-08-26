function formatDatePrefix(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `PC-${year}${month}${day}`;
}

// Atomically reserves the next sequence number for the day, rather than reading a count and
// hoping nothing else writes before we do. A single UPSERT+RETURNING statement is what makes
// this race-safe: with one Node process and one better-sqlite3 connection (see db/connection.js),
// nothing else can run between the read and the write of a single synchronous statement, so two
// requests reserving "at the same time" deterministically get different numbers. If PDF
// generation or the DB insert fails after a number is reserved, that number is skipped rather
// than reused — gaps in the sequence are an accepted trade-off; a repeated number is not.
export function generateReferenceNumber(db, date = new Date()) {
  const prefix = formatDatePrefix(date);
  const { next_seq: sequence } = db
    .prepare(
      `INSERT INTO ReferenceSequences (date_prefix, next_seq) VALUES (?, 1)
       ON CONFLICT(date_prefix) DO UPDATE SET next_seq = next_seq + 1
       RETURNING next_seq`
    )
    .get(prefix);
  return `${prefix}-${String(sequence).padStart(3, "0")}`;
}
