import express from "express";
import multer from "multer";
import Anthropic from "@anthropic-ai/sdk";
import { extractTermSheetFields } from "./extractTermSheetFields.js";

// Comfortably under Anthropic's 32MB request limit even after base64 inflates the payload ~33%.
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter(req, file, cb) {
    if (file.mimetype !== "application/pdf") {
      cb(Object.assign(new Error("File must be a PDF"), { status: 400 }));
      return;
    }
    cb(null, true);
  },
});

export function createTermSheetRouter({ anthropicClient = new Anthropic() } = {}) {
  const router = express.Router();

  router.post("/parse", upload.single("termSheet"), async (req, res, next) => {
    try {
      if (!req.file) {
        throw Object.assign(
          new Error('No PDF file uploaded (expected field "termSheet")'),
          { status: 400 }
        );
      }

      let result;
      try {
        result = await extractTermSheetFields(req.file.buffer, { anthropicClient });
      } catch (extractionError) {
        throw Object.assign(new Error("Term sheet extraction failed"), {
          status: 502,
          cause: extractionError,
        });
      }

      if (!result || result.products.length === 0) {
        throw Object.assign(
          new Error("Could not extract any fields from this document"),
          { status: 422 }
        );
      }

      res.status(200).json({ products: result.products });
    } catch (error) {
      next(error);
    }
  });

  router.use((error, req, res, next) => { // eslint-disable-line no-unused-vars
    if (error instanceof multer.MulterError) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(error.status || 500).json({ error: error.message });
  });

  return router;
}
