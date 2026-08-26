import { useState } from "react";
import { parseTermSheet } from "../../api/termSheets.js";

export default function TermSheetUpload({ onExtracted }) {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [inputKey, setInputKey] = useState(0);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    setStatus("uploading");
    setMessage("");

    try {
      const { products } = await parseTermSheet(file);
      onExtracted(products);
      setStatus("success");
      setMessage(
        `Added ${products.length} product${products.length === 1 ? "" : "s"} from ${file.name}`
      );
    } catch (error) {
      setStatus("error");
      setMessage(error.message);
    } finally {
      // Remount the file input so re-picking the same filename fires onChange again.
      setInputKey((key) => key + 1);
    }
  }

  return (
    <div className="term-sheet-upload">
      <label className="btn btn-outline btn-small">
        {status === "uploading" ? "Extracting…" : "Upload term sheet"}
        <input
          key={inputKey}
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          disabled={status === "uploading"}
          hidden
        />
      </label>
      {status === "success" && <span className="derived-hint">{message}</span>}
      {status === "error" && <span className="derived-hint field-warning">{message}</span>}
    </div>
  );
}
