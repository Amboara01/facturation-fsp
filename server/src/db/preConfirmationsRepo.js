export function createPreConfirmationsRepo(db) {
  const insertStmt = db.prepare(`
    INSERT INTO PreConfirmations (reference_number, introducer_name, generated_at, pdf_path, inputs_snapshot)
    VALUES (@referenceNumber, @introducerName, @generatedAt, @pdfPath, @inputsSnapshot)
  `);
  const listStmt = db.prepare(`
    SELECT id, reference_number, introducer_name, generated_at, pdf_path, inputs_snapshot
    FROM PreConfirmations
    ORDER BY generated_at DESC
  `);
  const getByIdStmt = db.prepare(`
    SELECT id, reference_number, introducer_name, generated_at, pdf_path, inputs_snapshot
    FROM PreConfirmations
    WHERE id = ?
  `);

  return {
    insertPreConfirmation(record) {
      const info = insertStmt.run({
        referenceNumber: record.referenceNumber,
        introducerName: record.introducerName,
        generatedAt: record.generatedAt,
        pdfPath: record.pdfPath,
        inputsSnapshot: JSON.stringify(record.inputsSnapshot),
      });
      return info.lastInsertRowid;
    },
    listPreConfirmations() {
      return listStmt.all();
    },
    getPreConfirmationById(id) {
      return getByIdStmt.get(id);
    },
  };
}
