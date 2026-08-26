import { z } from "zod";

// Deliberately no notionalAmount/notionalCurrency field — the notional is always human-typed,
// never extracted, and this schema has nowhere for the model to put one even if it tried.
const ExtractedProductSchema = z.object({
  name: z.string().nullable(),
  issuer: z.string().nullable(),
  isin: z.string().nullable(),
  tradeDate: z.string().nullable(),
  totalUpfrontFeePercent: z.number().nullable(),
  underlyings: z.array(z.string()),
});

// A single term sheet can describe more than one product (multi-tranche notes, baskets of
// related products) — the schema always returns an array, even for a single-product document.
export const TermSheetExtractionSchema = z.object({
  products: z.array(ExtractedProductSchema),
});
