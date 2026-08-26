# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A tool for a non-technical middle-office operator to generate correct, confidential PDF
pre-confirmations for introducer commissions on structured product deals. The full product
spec, including the commission-type table, confidentiality hard constraints, data model, and
acceptance criteria, lives in `spec.md` at the repo root — read it before making any change to
commission calculation, PDF content, or the data model. `spec.md` also defines Phase 2 (term
sheet upload + Claude extraction, logo upload) as not-yet-built scope; everything currently in
the repo is Phase 1.

## Commands

Run from the repo root unless noted.

- `npm run dev` — runs server (`nodemon`, port 3001) and client (Vite, port 5173) concurrently.
  The client dev server proxies `/api/*` to `http://localhost:3001` (see `client/vite.config.js`).
- `npm run build` — builds the client into `client/dist`.
- `npm run start` — starts the server only (`node server/src/index.js`); in production
  (`NODE_ENV=production`) it also serves `client/dist` as static files with an SPA fallback.
- `cd server && npm test` — runs the full backend test suite via Node's built-in test runner:
  `node --test "src/**/__tests__/*.test.js"`. Requires a Node version with `node:test` built in.
  - Run a single test file directly, e.g.:
    `node --test src/commission/__tests__/commission.table.test.js`
  - Run a subset by name: `node --test --test-name-pattern="row B" src/**/__tests__/*.test.js`
  - Note: `node --test <directory>` does NOT auto-discover files under `__tests__/` (Node's
    default discovery only recognizes `test`/`tests` dirs, not `__tests__`) — always pass an
    explicit glob or file path, as the `test` script does.
- `cd client && npm run lint` — runs `oxlint` on the client.

There is no test suite for the client; UI changes should be manually verified against the
running dev server.

## Architecture

Two independent npm packages with no shared code: `server/` (Express + SQLite + pdfmake) and
`client/` (Vite + React, no router — single-page app with local view-switching state). The root
`package.json` only orchestrates both via `concurrently`.

### No "deal" entity — one request = one introducer = one row = one PDF

There is no `Deal`/`Product` table and no server-side concept of a multi-introducer deal.
`POST /api/preconfirmations` accepts `products[]` plus exactly **one** `introducer` object, and
creates exactly one `PreConfirmations` row and one PDF file. A deal with N introducers means the
client (`PreConfirmationForm.jsx`) fires N sequential requests, reusing the same `products[]`
each time — never a batched array of introducers in one request body. This is deliberate: it
means no request body, log line, or in-memory object on the server ever holds more than one
introducer's data at once, which is what makes "each introducer's document shows only their own
commission line" a structural guarantee rather than a rendering convention.

### Confidentiality is enforced by data flow, not by hiding fields at render time

Total upfront fee and the firm's retained amount must never reach a PDF, a log, or an API
response — this is a hard constraint from `spec.md`, not just a preference. The codebase enforces
it in three independent layers:

1. **The fee is never entered directly.** The form only collects `totalUpfrontFeePercent` (a
   percentage of notional); the amount is derived (`notionalAmount * totalUpfrontFeePercent /
   100`) only inside `commission/calculators/shareOfTotalFees.js`, the one calculator that needs
   it. Nothing else in the codebase ever computes or stores a "firm's cut" value at all.
2. **`serializers/preConfirmationSerializer.js` is the only code path that turns a DB row into an
   API response.** `toSummaryDto()` reads only four safe columns and never parses
   `inputs_snapshot` (the JSON audit blob, which *does* legitimately contain the fee — that's the
   allowed audit trail per `spec.md`'s data model). Routes must never hand-roll a response shape
   that reads `inputs_snapshot` directly.
3. **`pdf/buildPreConfirmationDocDefinition.js` takes a narrow, explicit view model** (only the
   fields it actually renders) and runs a recursive `assertNoForbiddenKeys()` check against a
   deny-list (`totalUpfrontFeeAmount`, `totalUpfrontFeeCurrency`, `totalUpfrontFeePercent`,
   `firmRetainedAmount`, `firmCut`) before building anything — a defense-in-depth throw if a fee
   field ever leaks into the PDF view model, even accidentally. `routes/preConfirmations.js`
   builds this view model by explicitly picking safe fields off `computedLines`, not by spreading
   or passing the raw product/introducer objects through.

When adding a new field anywhere near money, check whether it needs to go in the forbidden-key
list and whether the serializer needs to keep excluding it.

### Commission engine (`server/src/commission/`)

Strategy/registry pattern: `registry.js` holds a `Map<type, calculatorFn>`; `index.js` registers
the three built-in types (`flatAmount`, `bpsOfNotional`, `shareOfTotalFees`) and exposes
`computeCommission({ type, params, product })` as the single call site everything else uses. Add
a new commission type by adding one calculator module and one `registerCommissionType()` call —
no other call site changes. All money math routes through `money.js`'s `roundHalfUpToCents()`
(half-up to 2 decimals, with an epsilon nudge to work around float representation errors like
`1.005 * 100 !== 100.5`) — never round ad hoc elsewhere. The client's
`constants/commissionTypes.js` list is manually kept in sync with the registry keys.

### PDF generation (`server/src/pdf/`)

Uses `pdfmake`'s server-side `PdfPrinter`/`createPdf` API (not the older static `PdfPrinter`
constructor export — see `generatePdfFile.js` for the actual import/usage shape, since pdfmake's
docs/examples online often show an older API). Only the base-14 standard fonts are used
(`fonts.js`), gated through a `localAccessPolicy` callback restricted to exactly those font
names — do not broaden that policy to allow arbitrary local file access. Generated PDFs are
deliberately **uncompressed** (`compress: false` in the doc definition) so that tests can do a
meaningful byte-level substring scan for confidential data; if compression is ever turned on,
the hex-decoding scan in `routes/__tests__/preConfirmations.route.test.js` needs rethinking.
PDF text is rendered as hex-encoded glyph runs (`<...> TJ`), not literal ASCII bytes — see
`decodeHexTextRuns()` in that test file before writing any new PDF-content assertions.

There's no logo upload yet (Phase 2). `buildPreConfirmationDocDefinition.js` accepts an optional
`logoDataUrl` on the view model and renders nothing at all when it's absent — no placeholder box
or text — via pdfmake's `images` map (`{ image: 'logo' }` + `docDefinition.images.logo`).

PDFs are stored on disk under `server/storage/pdfs/` (gitignored) and served only through the
explicit `GET /api/preconfirmations/:id/pdf` route, never via `express.static` — avoids exposing
a guessable/traversable public path to confidential documents. Once generated, a
`PreConfirmations` row and its PDF are write-once; there is no edit/regenerate endpoint.

### Storage (`server/src/db/`)

SQLite via `better-sqlite3`, a single `PreConfirmations` table (see `db/schema.js`) matching
`spec.md`'s data model exactly — `inputs_snapshot` (JSON text) is the audit source of truth, not
a normalized deals/products/commissions schema. `db/connection.js` exposes both a lazy
production singleton (`getDb()`, file at `server/storage/db/app.db`, gitignored) and
`openDatabase(path)` for tests to open an isolated `:memory:` instance — `app.js`'s `createApp()`
takes `{ db, pdfStorageDir }` overrides for exactly this reason; route tests boot a real Express
app against an in-memory DB and a temp PDF directory rather than mocking anything.

Reference numbers are `PC-YYYYMMDD-NNN`, sequential per day, generated by counting existing
same-day rows (`util/referenceNumber.js`) — not strictly race-safe under concurrent writes, which
is an accepted limitation given `spec.md`'s single-operator assumption.
