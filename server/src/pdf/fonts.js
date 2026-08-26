import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const STANDARD_FONT_NAMES = new Set([
  "Helvetica",
  "Helvetica-Bold",
  "Helvetica-Oblique",
  "Helvetica-BoldOblique",
]);

// JetBrains Mono (SIL OFL) — used only for notional/commission-amount cells in the summary
// table, so figures line up on genuinely tabular digit widths rather than relying on a
// proportional font's incidental alignment. See font-files/OFL.txt for the license.
const monoRegular = path.join(__dirname, "font-files/JetBrainsMono-Regular.ttf");
const monoBold = path.join(__dirname, "font-files/JetBrainsMono-Bold.ttf");

export const fontDescriptors = {
  Helvetica: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
  Mono: {
    normal: monoRegular,
    bold: monoBold,
    italics: monoRegular,
    bolditalics: monoBold,
  },
};

const ALLOWED_LOCAL_FONT_PATHS = new Set([monoRegular, monoBold]);

export function isAllowedFontPath(candidatePath) {
  return STANDARD_FONT_NAMES.has(candidatePath) || ALLOWED_LOCAL_FONT_PATHS.has(candidatePath);
}
