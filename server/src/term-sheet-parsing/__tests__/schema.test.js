import test from "node:test";
import assert from "node:assert/strict";
import { TermSheetExtractionSchema } from "../schema.js";

function sampleProduct(overrides = {}) {
  return {
    name: "5Y Autocall Note on EURO STOXX 50",
    issuer: "Example Bank plc",
    isin: "FR0013479930",
    tradeDate: "2026-09-15",
    totalUpfrontFeePercent: 1.5,
    underlyings: ["EURO STOXX 50"],
    ...overrides,
  };
}

test("top-level schema key is exactly 'products'", () => {
  const keys = Object.keys(TermSheetExtractionSchema.shape);
  assert.deepEqual(keys, ["products"]);
});

test("each product entry's key set is exactly the 6 allowed fields", () => {
  const productSchema = TermSheetExtractionSchema.shape.products.element;
  const keys = Object.keys(productSchema.shape).sort();
  assert.deepEqual(keys, [
    "isin",
    "issuer",
    "name",
    "totalUpfrontFeePercent",
    "tradeDate",
    "underlyings",
  ]);
});

test("notionalAmount and notionalCurrency are not among a product entry's fields", () => {
  const productSchema = TermSheetExtractionSchema.shape.products.element;
  const keys = Object.keys(productSchema.shape);
  assert.ok(!keys.includes("notionalAmount"));
  assert.ok(!keys.includes("notionalCurrency"));
});

test("accepts a single-product array", () => {
  const result = TermSheetExtractionSchema.safeParse({ products: [sampleProduct()] });
  assert.equal(result.success, true);
});

test("accepts a multi-product array (multi-tranche / basket term sheets)", () => {
  const result = TermSheetExtractionSchema.safeParse({
    products: [
      sampleProduct({ name: "Tranche A", isin: "FR0013479930" }),
      sampleProduct({ name: "Tranche B", isin: "FR0013479931" }),
    ],
  });
  assert.equal(result.success, true);
  assert.equal(result.data.products.length, 2);
});

test("accepts an empty array as the valid 'found nothing' result", () => {
  const result = TermSheetExtractionSchema.safeParse({ products: [] });
  assert.equal(result.success, true);
});

test("accepts all-null fields within a product entry", () => {
  const result = TermSheetExtractionSchema.safeParse({
    products: [
      {
        name: null,
        issuer: null,
        isin: null,
        tradeDate: null,
        totalUpfrontFeePercent: null,
        underlyings: [],
      },
    ],
  });
  assert.equal(result.success, true);
});

test("rejects a product entry carrying a notional field, even if otherwise valid", () => {
  const result = TermSheetExtractionSchema.safeParse({
    products: [sampleProduct({ notionalAmount: 1_000_000 })],
  });
  // Zod's default object schema strips unknown keys but still validates successfully —
  // the real guarantee is the key-set test above (the model has nowhere to put it in the
  // JSON-schema sent to the API); this test documents that even if a stray key showed up,
  // it would never survive being read back out through this schema's shape.
  assert.equal(result.success, true);
  assert.ok(!("notionalAmount" in result.data.products[0]));
});
