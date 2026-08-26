import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import pdfMake from "pdfmake";
import { fontDescriptors, isStandardFontName } from "./fonts.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const defaultPdfStorageDir = path.join(__dirname, "../../storage/pdfs");

let configured = false;

function ensureConfigured() {
  if (configured) {
    return;
  }
  pdfMake.setFonts(fontDescriptors);
  pdfMake.setLocalAccessPolicy(isStandardFontName);
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
