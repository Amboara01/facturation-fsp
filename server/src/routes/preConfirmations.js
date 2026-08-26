import fs from "node:fs";
import express from "express";
import { createPreConfirmationsRepo } from "../db/preConfirmationsRepo.js";
import { computeCommission } from "../commission/index.js";
import { describeCommissionTerm } from "../commission/describeCommissionTerm.js";
import { buildPreConfirmationDocDefinition } from "../pdf/buildPreConfirmationDocDefinition.js";
import { generatePdfFile, defaultPdfStorageDir } from "../pdf/generatePdfFile.js";
import { generateReferenceNumber } from "../util/referenceNumber.js";
import { toSummaryDto } from "../serializers/preConfirmationSerializer.js";

function validateRequestBody(body) {
  if (!Array.isArray(body?.products) || body.products.length === 0) {
    throw Object.assign(new Error("products must be a non-empty array"), { status: 400 });
  }
  if (!body?.introducer?.name || !Array.isArray(body.introducer.commissionTerms)) {
    throw Object.assign(
      new Error("introducer must have a name and a commissionTerms array"),
      { status: 400 }
    );
  }
}

export function createPreConfirmationsRouter({ db, pdfStorageDir = defaultPdfStorageDir }) {
  const router = express.Router();
  const repo = createPreConfirmationsRepo(db);

  router.post("/", async (req, res, next) => {
    try {
      validateRequestBody(req.body);
      const { products, introducer } = req.body;
      const productsById = new Map(products.map((product) => [product.id, product]));

      const computedLines = introducer.commissionTerms.map((term) => {
        const product = productsById.get(term.productId);
        if (!product) {
          throw Object.assign(
            new Error(`Unknown productId "${term.productId}" in commission term`),
            { status: 400 }
          );
        }
        const { amount, currency } = computeCommission({
          type: term.type,
          params: term.params,
          product,
        });
        return {
          name: product.name,
          notionalAmount: product.notionalAmount,
          notionalCurrency: product.notionalCurrency,
          tradeDate: product.tradeDate,
          commissionLabel: describeCommissionTerm(term.type, term.params),
          computedAmount: amount,
          computedCurrency: currency,
        };
      });

      const generatedAt = new Date().toISOString();
      const referenceNumber = generateReferenceNumber(db, new Date(generatedAt));

      const viewModel = {
        referenceNumber,
        generatedAt,
        introducerName: introducer.name,
        counterpartyFields: introducer.counterpartyFields,
        // Only the fields the PDF actually renders — commissionLabel (and anything else on
        // computedLines) is deliberately left out here, kept only in inputsSnapshot for audit.
        products: computedLines.map(
          ({ name, notionalAmount, notionalCurrency, tradeDate, computedAmount, computedCurrency }) => ({
            name,
            notionalAmount,
            notionalCurrency,
            tradeDate,
            computedAmount,
            computedCurrency,
          })
        ),
      };
      const docDefinition = buildPreConfirmationDocDefinition(viewModel);
      const pdfPath = await generatePdfFile(docDefinition, referenceNumber, pdfStorageDir);

      const inputsSnapshot = {
        products,
        introducer,
        computedLines,
      };

      const id = repo.insertPreConfirmation({
        referenceNumber,
        introducerName: introducer.name,
        generatedAt,
        pdfPath,
        inputsSnapshot,
      });

      const row = repo.getPreConfirmationById(id);
      res.status(201).json(toSummaryDto(row));
    } catch (error) {
      next(error);
    }
  });

  router.get("/", (req, res) => {
    const items = repo.listPreConfirmations().map(toSummaryDto);
    res.json({ items });
  });

  router.get("/:id/pdf", (req, res) => {
    const row = repo.getPreConfirmationById(Number(req.params.id));
    if (!row || !fs.existsSync(row.pdf_path)) {
      res.status(404).json({ error: "Pre-confirmation not found" });
      return;
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${row.reference_number}.pdf"`);
    fs.createReadStream(row.pdf_path).pipe(res);
  });

  router.use((error, req, res, next) => { // eslint-disable-line no-unused-vars
    res.status(error.status || 500).json({ error: error.message });
  });

  return router;
}
