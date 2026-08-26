import test from "node:test";
import assert from "node:assert/strict";
import { toSummaryDto } from "../preConfirmationSerializer.js";

const SECRET_FEE = "9999999.42";
const OTHER_INTRODUCER = "Should Never Appear Introducer";

test("toSummaryDto exposes exactly the safe fields, nothing from inputs_snapshot", () => {
  const row = {
    id: 7,
    reference_number: "PC-20260826-007",
    introducer_name: "Introducer X",
    generated_at: "2026-08-26T09:00:00.000Z",
    pdf_path: "/some/path/PC-20260826-007.pdf",
    inputs_snapshot: JSON.stringify({
      totalUpfrontFeeAmount: SECRET_FEE,
      firmRetainedAmount: "1234.56",
      otherIntroducerName: OTHER_INTRODUCER,
    }),
  };

  const dto = toSummaryDto(row);

  assert.deepEqual(Object.keys(dto).sort(), [
    "generatedAt",
    "id",
    "introducerName",
    "pdfUrl",
    "referenceNumber",
  ]);

  const serialized = JSON.stringify(dto);
  assert.ok(!serialized.includes(SECRET_FEE));
  assert.ok(!serialized.includes("1234.56"));
  assert.ok(!serialized.includes(OTHER_INTRODUCER));
});
