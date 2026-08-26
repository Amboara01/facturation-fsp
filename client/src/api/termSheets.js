import { apiPostForm } from "./client.js";

export function parseTermSheet(file) {
  const formData = new FormData();
  formData.append("termSheet", file);
  return apiPostForm("/api/term-sheets/parse", formData);
}
