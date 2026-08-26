import test from "node:test";
import assert from "node:assert/strict";
import { buildPreConfirmationDocDefinition } from "../buildPreConfirmationDocDefinition.js";

function cleanViewModel() {
  return {
    referenceNumber: "PC-20260826-001",
    generatedAt: "2026-08-26T09:00:00.000Z",
    introducerName: "Introducer X",
    counterpartyFields: { contactName: "Jane Doe" },
    products: [
      {
        name: "Product A",
        notionalAmount: 1_000_000,
        notionalCurrency: "EUR",
        tradeDate: "2026-08-26",
        computedAmount: 5000,
        computedCurrency: "EUR",
      },
    ],
  };
}

test("throws when a forbidden fee/firm-cut key is present anywhere in the view model", () => {
  const polluted = cleanViewModel();
  polluted.products[0].totalUpfrontFeeAmount = 15_000;

  assert.throws(() => buildPreConfirmationDocDefinition(polluted), /forbidden key/i);
});

test("throws when the total-upfront-fee percentage leaks alongside notional (would let a viewer derive the fee)", () => {
  const polluted = cleanViewModel();
  polluted.products[0].totalUpfrontFeePercent = 1.5;

  assert.throws(() => buildPreConfirmationDocDefinition(polluted), /forbidden key/i);
});

test("throws when a forbidden key is present at the top level", () => {
  const polluted = cleanViewModel();
  polluted.firmRetainedAmount = 10_000;

  assert.throws(() => buildPreConfirmationDocDefinition(polluted), /forbidden key/i);
});

test("logo slot is blank when no logo is supplied", () => {
  const docDefinition = buildPreConfirmationDocDefinition(cleanViewModel());

  assert.ok(!docDefinition.content.some((block) => block?.image));
  assert.equal(docDefinition.images, undefined);
});

test("logo slot renders the supplied image", () => {
  const viewModel = cleanViewModel();
  viewModel.logoDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

  const docDefinition = buildPreConfirmationDocDefinition(viewModel);

  const logoBlock = docDefinition.content.find((block) => block?.image);
  assert.equal(logoBlock?.image, "logo");
  assert.equal(docDefinition.images.logo, viewModel.logoDataUrl);
});

test("product cell shows the ISIN in mono under the name when present", () => {
  const viewModel = cleanViewModel();
  viewModel.products[0].isin = "FR0013479930";

  const docDefinition = buildPreConfirmationDocDefinition(viewModel);
  const table = docDefinition.content.find((block) => block?.table)?.table;
  const productCell = table.body[1][0];

  assert.deepEqual(productCell.stack[0], { text: "Product A" });
  assert.equal(productCell.stack[1].text, "FR0013479930");
  assert.equal(productCell.stack[1].font, "Mono");
});

test("product cell has no ISIN line when isin is absent", () => {
  const docDefinition = buildPreConfirmationDocDefinition(cleanViewModel());

  const table = docDefinition.content.find((block) => block?.table)?.table;
  const productRow = table.body[1];
  assert.equal(productRow[0], "Product A");
});

test("clean view model never contains the fee amount and shows only one introducer's line", () => {
  const viewModel = cleanViewModel();
  const FEE_AMOUNT_MARKER = "9999999.42"; // never present in a clean view model
  const OTHER_INTRODUCER = "Should Never Appear Introducer";

  const docDefinition = buildPreConfirmationDocDefinition(viewModel);
  const serialized = JSON.stringify(docDefinition);

  assert.ok(!serialized.includes(FEE_AMOUNT_MARKER));
  assert.ok(!serialized.includes(OTHER_INTRODUCER));
  assert.ok(serialized.includes("Introducer X"));
  assert.ok((serialized.match(/Introducer X/g) || []).length >= 1);
});
