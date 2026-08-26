import test from "node:test";
import assert from "node:assert/strict";
import { roundHalfUpToCents } from "../money.js";

test("rounds half up at the third decimal", () => {
  assert.equal(roundHalfUpToCents(12.345), 12.35);
  assert.equal(roundHalfUpToCents(12.344), 12.34);
});

test("leaves values already at 2 decimals unchanged", () => {
  assert.equal(roundHalfUpToCents(2550), 2550);
  assert.equal(roundHalfUpToCents(5000.5), 5000.5);
});

test("handles classic floating-point trouble cases", () => {
  assert.equal(roundHalfUpToCents(1.005), 1.01);
  assert.equal(roundHalfUpToCents(0.1 + 0.2), 0.3);
});
