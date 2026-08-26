const STANDARD_FONT_NAMES = new Set([
  "Helvetica",
  "Helvetica-Bold",
  "Helvetica-Oblique",
  "Helvetica-BoldOblique",
]);

export const fontDescriptors = {
  Helvetica: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
};

export function isStandardFontName(candidatePath) {
  return STANDARD_FONT_NAMES.has(candidatePath);
}
