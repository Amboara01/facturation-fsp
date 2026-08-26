export function toSummaryDto(row) {
  return {
    id: row.id,
    referenceNumber: row.reference_number,
    introducerName: row.introducer_name,
    generatedAt: row.generated_at,
    pdfUrl: `/api/preconfirmations/${row.id}/pdf`,
  };
}
