import test from "node:test";
import assert from "node:assert/strict";
import { openDatabase } from "../../db/connection.js";
import { initSchema } from "../../db/schema.js";
import { generateReferenceNumber } from "../referenceNumber.js";

function buildTestDb() {
  const db = openDatabase(":memory:");
  initSchema(db);
  return db;
}

test("first reference number of the day is PC-YYYYMMDD-001", () => {
  const db = buildTestDb();
  const ref = generateReferenceNumber(db, new Date("2026-08-26T10:00:00Z"));
  assert.equal(ref, "PC-20260826-001");
});

test("sequence increments within the same day", () => {
  const db = buildTestDb();
  const date = new Date("2026-08-26T10:00:00Z");
  assert.equal(generateReferenceNumber(db, date), "PC-20260826-001");
  assert.equal(generateReferenceNumber(db, date), "PC-20260826-002");
  assert.equal(generateReferenceNumber(db, date), "PC-20260826-003");
});

test("different days each start their own sequence at 001", () => {
  const db = buildTestDb();
  assert.equal(generateReferenceNumber(db, new Date("2026-08-26T10:00:00Z")), "PC-20260826-001");
  assert.equal(generateReferenceNumber(db, new Date("2026-08-27T10:00:00Z")), "PC-20260827-001");
  assert.equal(generateReferenceNumber(db, new Date("2026-08-26T23:59:00Z")), "PC-20260826-002");
});

// Reproduces the actual race this fix addresses: two requests both reach the "reserve a
// number" step before either has written its PDF or its PreConfirmations row (the real app
// calls generateReferenceNumber() synchronously, then awaits PDF generation, then inserts —
// see routes/preConfirmations.js). Calling it twice back-to-back with no row ever inserted in
// between simulates exactly that interleaving without needing real concurrency. This would have
// returned "PC-20260826-001" twice under the old SELECT COUNT(*) implementation.
test("two reservations for the same day never collide, even with no row inserted between them", () => {
  const db = buildTestDb();
  const date = new Date("2026-08-26T10:00:00Z");
  const first = generateReferenceNumber(db, date);
  const second = generateReferenceNumber(db, date);
  assert.notEqual(first, second);
  assert.equal(first, "PC-20260826-001");
  assert.equal(second, "PC-20260826-002");
});
