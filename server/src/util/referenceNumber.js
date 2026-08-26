function formatDatePrefix(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `PC-${year}${month}${day}`;
}

export function generateReferenceNumber(db, date = new Date()) {
  const prefix = formatDatePrefix(date);
  const { count } = db
    .prepare(`SELECT COUNT(*) as count FROM PreConfirmations WHERE reference_number LIKE ?`)
    .get(`${prefix}-%`);
  const sequence = String(count + 1).padStart(3, "0");
  return `${prefix}-${sequence}`;
}
