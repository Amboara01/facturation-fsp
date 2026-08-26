import { useState } from "react";

// Matches what the PDF layer can actually embed (pdfkit supports PNG/JPEG only, no SVG/GIF/WebP).
const ACCEPTED_TYPES = ["image/png", "image/jpeg"];
const MAX_BYTES = 2 * 1024 * 1024;

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function LogoUpload({ value, onChange }) {
  const [error, setError] = useState("");
  const [inputKey, setInputKey] = useState(0);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    setError("");
    setInputKey((key) => key + 1);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Logo must be a PNG or JPEG image");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Logo must be smaller than 2 MB");
      return;
    }

    onChange(await readFileAsDataUrl(file));
  }

  return (
    <div className="logo-upload">
      {value ? (
        <div className="logo-preview">
          <img src={value} alt="Introducer logo preview" />
          <button type="button" className="btn btn-ghost" onClick={() => onChange(null)}>
            Remove logo
          </button>
        </div>
      ) : (
        <label className="btn btn-outline btn-small">
          Upload logo
          <input
            key={inputKey}
            type="file"
            accept="image/png,image/jpeg"
            onChange={handleFileChange}
            hidden
          />
        </label>
      )}
      {error && <span className="derived-hint field-warning">{error}</span>}
    </div>
  );
}
