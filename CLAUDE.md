# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A tool for a non-technical middle-office operator to generate correct, confidential PDF
pre-confirmations for introducer commissions on structured product deals. The full product
spec, including the commission-type table, confidentiality hard constraints, data model, and
acceptance criteria, lives in `spec.md` at the repo root — read it before making any change to
commission calculation, PDF content, or the data model. Both Phase 1 and Phase 2 (term sheet
upload + Claude extraction, logo upload) are now built.

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
- `ANTHROPIC_API_KEY` must be set in `server/.env` for term-sheet extraction to work (see
  `server/.env.example`); every other feature works with no env vars beyond the defaults.

There is no client-side test suite at all — UI changes, including the product/introducer state
logic in `PreConfirmationForm.jsx`, are manually verified against the running dev server (and, in
practice, via a live browser session), not by automated tests. Be extra careful with any change
that touches multiple `setState` calls in one handler there — see the stale-closure note below.

## Deployment

`railway.toml` + `server/src/config.js` (a `DATA_DIR` env var, defaulting to `server/storage`
locally) exist so the SQLite file and generated PDFs can point at a mounted persistent volume in
production. `better-sqlite3` is pinned to `^12.11.1`, not the `13.x` line — every `13.x` release
currently has zero prebuilt binaries published upstream, which forces a `node-gyp` source compile
that fails on Railway's build image (no Python). Don't bump past 12.x without checking upstream
has fixed that.

## Architecture

Two independent npm packages with no shared code: `server/` (Express + SQLite + pdfmake +
`@anthropic-ai/sdk`) and `client/` (Vite + React, no router — single-page app with local
view-switching state). The root `package.json` only orchestrates both via `concurrently`.

### No "deal" entity — one request = one introducer = one row = one PDF

There is no `Deal` table and no server-side concept of a multi-introducer deal.
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

The same "structural exclusion, not just an instruction" philosophy is reused in
`term-sheet-parsing/schema.js` (below): the Zod schema has no notional or introducer/commission
field at all, so the model has nowhere to put one even if a document's text tried to induce it to.

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
`constants/commissionTypes.js` list is manually kept in sync with the registry keys. The
"Share of total fees" input in `CommissionTermInput.jsx` also supports an alternate fraction
(numerator/denominator) entry mode purely as a client-side precision aid — it just computes a
full-float-precision percentage and writes it into the same `sharePercent` param; the server never
knows a fraction was involved.

### Term sheet extraction (`server/src/term-sheet-parsing/`)

Isolated in its own directory so it can be removed cleanly. `POST /api/term-sheets/parse` takes a
PDF upload (`multer`, in-memory, PNG/JPEG... no — PDF only, 20MB cap) and calls
`client.messages.parse()` (Claude Opus 5, via `@anthropic-ai/sdk`'s `zodOutputFormat` structured
output) with a system prompt (`prompt.js`) and a Zod schema (`schema.js`).

- **Response is always `{ products: [...] }`, an array** — a single term sheet can describe more
  than one product (multi-tranche notes, baskets), so extraction returns one entry per product
  found, never a single flat object.
- **Two things are structurally never extractable, not just prompted against**: the notional
  *amount* (always human-typed and verified, same trust tier as commission) and anything about
  the introducer's commission/split. Neither has a field in the schema at all.
  `totalUpfrontFeePercent` *is* extracted — it's the product's disclosed total fee, a legitimate
  term-sheet figure, distinct from the confidential introducer-specific split of that fee.
  `notionalCurrency` is also extracted (unlike the amount, the currency alone is a non-sensitive
  fact, same tier as ISIN or trade date) — only the amount itself carries the "human must type
  it" trust requirement.
- Failures collapse to one thing the client needs — 400 (bad upload), 422 (nothing usable found),
  502 (Anthropic API/network failure) — all as `{ error: message }`, same convention as
  `routes/preConfirmations.js`. The client's `apiPost`-family helpers already throw on non-2xx, so
  no special client-side branching is needed.
- Nothing about the request or response is logged, and the PDF is never persisted (pure
  request/response, no DB row).

Client side, `TermSheetUpload.jsx` lives next to "+ Add product" (not inside a single
`ProductRow`, since one upload can yield several products). `PreConfirmationForm.jsx`'s
`handleExtractedProducts` has one deliberate wrinkle worth knowing before touching it: if the form
still shows nothing but the single untouched starting row (checked via `isProductBlank` —
`name`/`isin`/`notionalAmount`/`totalUpfrontFeePercent` all still at their pristine defaults;
`notionalCurrency`/`tradeDate` are deliberately excluded from that check since "EUR"/today are
legitimate values, not blank-indicators), the first extracted product populates that row *in
place* instead of leaving a dangling empty card; every product after the first is always a new
row. This is computed as **one** `setProducts` + **one** `setIntroducers` call, not
"`updateProduct()` then `appendProducts()`" — calling two state-updating helpers back to back in
the same handler was tried first and silently dropped the first update, because both would have
read the same stale `products` closure snapshot (`setProducts` doesn't update that binding
synchronously). Any future handler that needs to touch an existing row and add new ones in the
same event needs to avoid that same trap.

### PDF generation (`server/src/pdf/`)

Uses `pdfmake`'s server-side `PdfPrinter`/`createPdf` API (not the older static `PdfPrinter`
constructor export — see `generatePdfFile.js` for the actual import/usage shape, since pdfmake's
docs/examples online often show an older API). Two font families are registered in `fonts.js`:
the base-14 standard Helvetica (body text) and a vendored **JetBrains Mono** (`font-files/`, SIL
OFL) used specifically for notionals, commission amounts, and ISINs — chosen for unambiguous
digit/letter shapes, not decoration. Local file access for fonts is gated through a
`localAccessPolicy` callback restricted to exactly the standard font names plus the two vendored
TTF paths — do not broaden that policy. Generated PDFs are deliberately **uncompressed**
(`compress: false`) so tests can do a byte-level substring scan for confidential data — but that
scan (`decodeHexTextRuns()` in `routes/__tests__/preConfirmations.route.test.js`) only correctly
decodes the standard-Helvetica text (1 byte per glyph). The embedded Mono font uses CID/Identity-H
glyph codes resolved via a separate ToUnicode CMap that the test helper does **not** decode — the
`!includes(SECRET_FEE_MARKER)` absence checks still hold for Helvetica-rendered text, but are not
a rigorous guarantee for Mono-rendered cells (Amount/Notional/ISIN). This is a known, documented
gap, not a secret one — see the comment at the top of that test file before relying on it or
extending it.

Logo upload is built: `buildPreConfirmationDocDefinition.js` accepts an optional `logoDataUrl` on
the view model (PNG/JPEG data URL only — that's all pdfkit's image embedding supports, no
SVG/GIF/WebP) and renders nothing at all when it's absent — no placeholder box or text — via
pdfmake's `images` map. Client side it lives on the *introducer* (`LogoUpload.jsx` inside
`IntroducerBlock.jsx`, PNG/JPEG only, 2MB cap, converted to a data URL via `FileReader`), and
`routes/preConfirmations.js` validates the shape of `introducer.logoDataUrl` (a
`data:image/(png|jpeg);base64,` prefix) before it ever reaches pdfmake, so a malformed value is a
clean 400 rather than an opaque 500 from deep inside pdfkit.

PDFs are stored on disk under `DATA_DIR/pdfs/` (gitignored) and served only through the explicit
`GET /api/preconfirmations/:id/pdf` route, never via `express.static` — avoids exposing a
guessable/traversable public path to confidential documents. Once generated, a `PreConfirmations`
row and its PDF are write-once; there is no edit/regenerate endpoint.

### Storage (`server/src/db/`, `server/src/config.js`)

SQLite via `better-sqlite3`, a single `PreConfirmations` table (see `db/schema.js`) matching
`spec.md`'s data model exactly — `inputs_snapshot` (JSON text) is the audit source of truth, not
a normalized deals/products/commissions schema. Adding a new field to a product or introducer
(e.g. `isin`, `extractedInfo`, `logoDataUrl`) generally needs **no DB migration at all** — it just
flows into the same JSON column, which is the whole point of that design choice; only add a
migration if the *shape* of the table itself needs to change. `db/connection.js` exposes both a
lazy production singleton (`getDb()`, path from `config.js`'s `DATA_DIR`) and `openDatabase(path)`
for tests to open an isolated `:memory:` instance — `app.js`'s `createApp()` takes
`{ db, pdfStorageDir }` overrides for exactly this reason; route tests boot a real Express app
against an in-memory DB and a temp PDF directory rather than mocking anything.

Reference numbers are `PC-YYYYMMDD-NNN`, sequential per day, generated by counting existing
same-day rows (`util/referenceNumber.js`) — not strictly race-safe under concurrent writes, which
is an accepted limitation given `spec.md`'s single-operator assumption.

### Client design system (`client/src/index.css`, `client/src/App.css`)

Deliberate, not default: Public Sans (headings + body) and JetBrains Mono (money/reference/date
values, matching the PDF's font choice) loaded via Google Fonts, a small burgundy accent
(`--accent`), and a fixed spacing scale (`--space-1` through `--space-6`, 4/8/16/24/32/48px)
applied almost entirely via `gap` on flex/grid containers rather than ad hoc margins, so each
spacing relationship has one source of truth. Introducer cards get a left accent "spine" — the
one deliberate signature element, tied to the actual domain rule that each introducer's document
is separate and self-contained, not decoration for its own sake.
