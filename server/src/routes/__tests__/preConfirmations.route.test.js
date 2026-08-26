import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createApp } from "../../app.js";
import { openDatabase } from "../../db/connection.js";

// 1,000,000 EUR notional * 43.21% total upfront fee -> 432,100.00 EUR. Never used by either
// introducer's commission term below, so it must never surface anywhere the client/PDF can see.
const SECRET_FEE_MARKER = "432100.00";

// pdfmake/pdfkit render text as hex-encoded glyph strings inside `<...> TJ` operators
// (e.g. `<5072652d>` for "Pre-"), not literal ASCII bytes — decode those runs so a
// substring scan over the PDF bytes actually means something instead of trivially
// passing against opaque hex.
function decodeHexTextRuns(buffer) {
  const raw = buffer.toString("latin1");
  const hexRuns = raw.match(/<([0-9a-fA-F]{2,})>/g) || [];
  return hexRuns.map((run) => Buffer.from(run.slice(1, -1), "hex").toString("latin1")).join("");
}

function buildTestApp() {
  const db = openDatabase(":memory:");
  const pdfStorageDir = fs.mkdtempSync(path.join(os.tmpdir(), "preconf-pdf-"));
  const app = createApp({ db, pdfStorageDir });
  return { app, pdfStorageDir };
}

async function post(app, body) {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const res = await fetch(`http://127.0.0.1:${port}/api/preconfirmations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
  } finally {
    server.close();
  }
}

async function get(app, urlPath) {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const res = await fetch(`http://127.0.0.1:${port}${urlPath}`);
    const contentType = res.headers.get("content-type") || "";
    const body = contentType.includes("application/json")
      ? await res.json()
      : Buffer.from(await res.arrayBuffer());
    return { status: res.status, contentType, body };
  } finally {
    server.close();
  }
}

const products = [
  {
    id: "p1",
    name: "Product A",
    notionalAmount: 1_000_000,
    notionalCurrency: "EUR",
    totalUpfrontFeePercent: 43.21,
    tradeDate: "2026-08-26",
  },
];

test("a deal with 2 introducers: 2 sequential POSTs create 2 rows and 2 distinct PDFs", async () => {
  const { app, pdfStorageDir } = buildTestApp();

  const first = await post(app, {
    products,
    introducer: {
      name: "Introducer X",
      commissionTerms: [{ productId: "p1", type: "bpsOfNotional", params: { bps: 50 } }],
    },
  });
  assert.equal(first.status, 201);

  const second = await post(app, {
    products,
    introducer: {
      name: "Introducer Y",
      commissionTerms: [{ productId: "p1", type: "flatAmount", params: { amount: 5000, currency: "EUR" } }],
    },
  });
  assert.equal(second.status, 201);

  assert.notEqual(first.body.id, second.body.id);
  assert.notEqual(first.body.referenceNumber, second.body.referenceNumber);

  const pdfFiles = fs.readdirSync(pdfStorageDir);
  assert.equal(pdfFiles.length, 2);

  const list = await get(app, "/api/preconfirmations");
  assert.equal(list.status, 200);
  assert.equal(list.body.items.length, 2);
  for (const item of list.body.items) {
    assert.deepEqual(Object.keys(item).sort(), [
      "generatedAt",
      "id",
      "introducerName",
      "pdfUrl",
      "referenceNumber",
    ]);
  }
  assert.ok(!JSON.stringify(list.body).includes(SECRET_FEE_MARKER));

  let firstPdfText;
  for (const created of [first.body, second.body]) {
    const pdfResponse = await get(app, `/api/preconfirmations/${created.id}/pdf`);
    assert.equal(pdfResponse.status, 200);
    assert.equal(pdfResponse.contentType, "application/pdf");
    assert.ok(pdfResponse.body.length > 0);
    const decodedText = decodeHexTextRuns(pdfResponse.body);
    assert.ok(!decodedText.includes(SECRET_FEE_MARKER));
    if (created.id === first.body.id) {
      firstPdfText = decodedText;
    }
  }

  assert.ok(firstPdfText.includes("Introducer X"));
  assert.ok(!firstPdfText.includes("Introducer Y"));
});
