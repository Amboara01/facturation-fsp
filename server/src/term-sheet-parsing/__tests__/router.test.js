import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createTermSheetRouter } from "../router.js";

function buildApp(anthropicClient) {
  const app = express();
  app.use("/api/term-sheets", createTermSheetRouter({ anthropicClient }));
  return app;
}

function stubClient(parseImpl) {
  return { messages: { parse: parseImpl } };
}

async function post(app, { includeFile = true, contentType = "application/pdf" } = {}) {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const form = new FormData();
    if (includeFile) {
      form.append(
        "termSheet",
        new Blob([Buffer.from("%PDF-1.4 fake")], { type: contentType }),
        "sheet.pdf"
      );
    }
    const res = await fetch(`http://127.0.0.1:${port}/api/term-sheets/parse`, {
      method: "POST",
      body: form,
    });
    return { status: res.status, body: await res.json() };
  } finally {
    server.close();
  }
}

const neverCalled = stubClient(async () => {
  throw new Error("anthropicClient should not have been called");
});

test("no file uploaded -> 400", async () => {
  const { status, body } = await post(buildApp(neverCalled), { includeFile: false });
  assert.equal(status, 400);
  assert.match(body.error, /termSheet/);
});

test("wrong mimetype -> 400", async () => {
  const { status } = await post(buildApp(neverCalled), { contentType: "text/plain" });
  assert.equal(status, 400);
});

test("successful single-product extraction -> 200 with a one-element products array", async () => {
  const product = {
    name: "5Y Autocall Note",
    issuer: "Example Bank plc",
    isin: "FR0013479930",
    tradeDate: "2026-09-15",
    totalUpfrontFeePercent: 1.5,
    underlyings: ["EURO STOXX 50"],
  };
  const app = buildApp(stubClient(async () => ({ parsed_output: { products: [product] } })));

  const { status, body } = await post(app);
  assert.equal(status, 200);
  assert.deepEqual(body.products, [product]);
});

test("successful multi-product extraction -> 200 with every product in the array", async () => {
  const products = [
    { name: "Tranche A", issuer: null, isin: "FR0013479930", tradeDate: null, totalUpfrontFeePercent: null, underlyings: [] },
    { name: "Tranche B", issuer: null, isin: "FR0013479931", tradeDate: null, totalUpfrontFeePercent: null, underlyings: [] },
  ];
  const app = buildApp(stubClient(async () => ({ parsed_output: { products } })));

  const { status, body } = await post(app);
  assert.equal(status, 200);
  assert.deepEqual(body.products, products);
});

test("Claude returns an empty products array -> 422", async () => {
  const app = buildApp(stubClient(async () => ({ parsed_output: { products: [] } })));

  const { status, body } = await post(app);
  assert.equal(status, 422);
  assert.ok(body.error);
});

test("Claude returns parsed_output null -> 422", async () => {
  const app = buildApp(stubClient(async () => ({ parsed_output: null })));

  const { status, body } = await post(app);
  assert.equal(status, 422);
  assert.ok(body.error);
});

test("Anthropic SDK failure -> 502, not a raw crash", async () => {
  const app = buildApp(
    stubClient(async () => {
      throw new Error("rate limited");
    })
  );

  const { status, body } = await post(app);
  assert.equal(status, 502);
  assert.ok(body.error);
});
