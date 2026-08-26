# spec.md

## Context
Business introducers are owed commissions on structured product deals. Today the 
pre-confirmation document is assembled by hand and has been wrong before.

## Goal
A tool, operated by a non-technical middle-office person, that generates a correct, 
confidential, professional PDF pre-confirmation for one introducer, covering one or 
more products on a deal.

## Scope (Phase 1 — build first)
- Manual entry form: introducer info, one or more products, per-product commission terms
- Commission engine: flat / bps of notional / share of total fees, per the 5-row table
- PDF generation: summary table, fixed issuer block, optional counterparty fields, 
  logo (left blank if no logo has been provided)
- Persistence: every generated pre-confirmation saved (data + PDF file), simple list view ordered by date (generated_at) 
- Multi-introducer deals: separate document per introducer

## Scope (Phase 2 — add if time allows, cut cleanly if not)
- Term sheet PDF upload + Claude API extraction (issuer, ISIN, underlying, coupon/barrier terms, notional, dates/trade dates). PS: extract notional-adjacent fields only — never commission/introducer/fee data
- Logo upload

## Non-goals
- Reverse invoicing, general accounting, online validate-and-pay flow (explicitly 
  out of scope per brief)
- Live FX rates / market data integration
- Auth
- Date-range filtering on the history list (plain list is enough for Phase 1)

## Commission engine — must handle

| # | Notional | Total upfront fee | Introducer's agreed terms |
|---|---|---|---|
| A | 1 000 000 EUR | 1.50 % | 50 bps of notional |
| B | 1 000 000 EUR | 1.50 % | one third of total fees |
| C | 2 500 000 USD | 1.20 % | flat 5 000 EUR |
| D | 750 000 EUR | 0.85 % | 40 % of total fees |
| E | 500 000 EUR | 0.60 % | 120 bps of notional |

- Flat amount (currency as agreed, no conversion)
- Share of total fees (%, computed from total upfront fee — never displayed alongside 
  the fee itself)
- Bps of notional (basis points × notional)
- Assume list of commission types will grow — engine should be extendable, not hardcoded 
  to 3 types

## Confidentiality — hard constraints
- Total upfront fee and firm's retained amount must never appear in generated PDF, 
  in any log, or in any operator-facing screen sent to the counterparty
- Each introducer's document shows only their own commission line — never another 
  introducer's, even on a shared deal

## Data model
- PreConfirmations table: id, reference_number, introducer_name, generated_at, 
  pdf_path, inputs_snapshot (JSON)
- No separate normalized tables for deals/products/commissions — the JSON snapshot 
  is the source of truth for "what was sent," simpler and more faithfully audit-safe 
  than reconstructing from relational data later

## Acceptance Criteria
- [ ] All 5 rows from the brief's table compute the correct commission amount
- [ ] Generated PDF never contains total fee or firm's cut, even for any commission type 
  including "share of fees"
- [ ] A deal with 2 introducers produces 2 separate PDFs, each showing only one 
  introducer's line
- [ ] A saved pre-confirmation can be re-opened later exactly as sent (stored PDF, 
  not regenerated)
- [ ] Manual entry works fully with zero term sheet involvement

## Known limitations (stated, not hidden)
- Term sheet parsing uses Anthropic API commercial terms — no compliance/legal review 
  performed for production use
- No FX conversion; mixed-currency commissions on one deal shown per-currency, not blended
- Single-operator assumption; no concurrent-edit conflict handling