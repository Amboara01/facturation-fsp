import test from "node:test";
import assert from "node:assert/strict";
import { computeCommission } from "../index.js";

test("row A: 1,000,000 EUR notional, 50 bps of notional -> 5,000 EUR", () => {
  const result = computeCommission({
    type: "bpsOfNotional",
    params: { bps: 50 },
    product: { notionalAmount: 1_000_000, notionalCurrency: "EUR" },
  });
  assert.deepEqual(result, { amount: 5000, currency: "EUR" });
});

test("row B: 1,000,000 EUR notional, 1.50% total fee, one third of total fees -> 5,000 EUR", () => {
  const result = computeCommission({
    type: "shareOfTotalFees",
    params: { sharePercent: 100 / 3 },
    product: { notionalAmount: 1_000_000, notionalCurrency: "EUR", totalUpfrontFeePercent: 1.5 },
  });
  assert.deepEqual(result, { amount: 5000, currency: "EUR" });
});

test("row C: 2,500,000 USD notional, flat 5,000 EUR -> 5,000 EUR (no conversion)", () => {
  const result = computeCommission({
    type: "flatAmount",
    params: { amount: 5000, currency: "EUR" },
    product: { notionalAmount: 2_500_000, notionalCurrency: "USD" },
  });
  assert.deepEqual(result, { amount: 5000, currency: "EUR" });
});

test("row D: 750,000 EUR notional, 0.85% total fee, 40% of total fees -> 2,550 EUR", () => {
  const result = computeCommission({
    type: "shareOfTotalFees",
    params: { sharePercent: 40 },
    product: { notionalAmount: 750_000, notionalCurrency: "EUR", totalUpfrontFeePercent: 0.85 },
  });
  assert.deepEqual(result, { amount: 2550, currency: "EUR" });
});

test("row E: 500,000 EUR notional, 120 bps of notional -> 6,000 EUR", () => {
  const result = computeCommission({
    type: "bpsOfNotional",
    params: { bps: 120 },
    product: { notionalAmount: 500_000, notionalCurrency: "EUR" },
  });
  assert.deepEqual(result, { amount: 6000, currency: "EUR" });
});
