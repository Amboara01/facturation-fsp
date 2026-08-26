import path from "node:path";
import fs from "node:fs";
import pdfMake from "pdfmake";
import { fontDescriptors, isAllowedFontPath } from "./fonts.js";
import { DATA_DIR } from "../config.js";

export const defaultPdfStorageDir = path.join(DATA_DIR, "pdfs");

let configured = false;

function ensureConfigured() {
  if (configured) {
    return;
  }
  pdfMake.setFonts(fontDescriptors);
  pdfMake.setLocalAccessPolicy(isAllowedFontPath);
  pdfMake.setUrlAccessPolicy(() => false);
  configured = true;
}

export async function generatePdfFile(docDefinition, referenceNumber, storageDir = defaultPdfStorageDir) {
  ensureConfigured();
  fs.mkdirSync(storageDir, { recursive: true });
  const filePath = path.join(storageDir, `${referenceNumber}.pdf`);
  const doc = pdfMake.createPdf(docDefinition);
  await doc.write(filePath);
  return filePath;
}
