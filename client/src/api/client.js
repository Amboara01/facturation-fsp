async function parseResponse(res) {
  const contentType = res.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await res.json() : undefined;
  if (!res.ok) {
    throw new Error(body?.error || `Request failed with status ${res.status}`);
  }
  return body;
}

export async function apiGet(path) {
  const res = await fetch(path);
  return parseResponse(res);
}

export async function apiPost(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseResponse(res);
}
