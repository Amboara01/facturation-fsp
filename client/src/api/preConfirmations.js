import { apiGet, apiPost } from "./client.js";

export function createPreConfirmation(payload) {
  return apiPost("/api/preconfirmations", payload);
}

export function listPreConfirmations() {
  return apiGet("/api/preconfirmations");
}

export function getPdfUrl(id) {
  return `/api/preconfirmations/${id}/pdf`;
}
