import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import { getDb } from "./db/connection.js";
import { initSchema } from "./db/schema.js";
import { createPreConfirmationsRouter } from "./routes/preConfirmations.js";
import { defaultPdfStorageDir } from "./pdf/generatePdfFile.js";
import { createTermSheetRouter } from "./term-sheet-parsing/router.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp({ db = getDb(), pdfStorageDir = defaultPdfStorageDir } = {}) {
  initSchema(db);

  const app = express();
  const isProduction = process.env.NODE_ENV === "production";

  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/preconfirmations", createPreConfirmationsRouter({ db, pdfStorageDir }));
  app.use("/api/term-sheets", createTermSheetRouter());

  if (isProduction) {
    const clientDistPath = path.join(__dirname, "../../client/dist");
    app.use(express.static(clientDistPath));

    app.get(/^(?!\/api).*/, (req, res) => {
      res.sendFile(path.join(clientDistPath, "index.html"));
    });
  }

  return app;
}
