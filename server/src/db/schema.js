export function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS PreConfirmations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference_number TEXT NOT NULL UNIQUE,
      introducer_name TEXT NOT NULL,
      generated_at TEXT NOT NULL,
      pdf_path TEXT NOT NULL,
      inputs_snapshot TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ReferenceSequences (
      date_prefix TEXT PRIMARY KEY,
      next_seq INTEGER NOT NULL
    );
  `);
}
