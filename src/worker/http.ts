/** Small HTTP helpers shared by the admin and planner APIs. */

export class HttpError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

/** Single-line text: control characters removed, whitespace collapsed, length checked. */
export function cleanLine(value: unknown, max: number, label: string, required = false): string {
  if (value === undefined || value === null) {
    if (required) throw new HttpError(400, `${label} is required.`);
    return "";
  }
  if (typeof value !== "string") throw new HttpError(400, `${label} must be text.`);
  const text = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (required && !text) throw new HttpError(400, `${label} is required.`);
  if (text.length > max) throw new HttpError(400, `${label} must be at most ${max} characters.`);
  return text;
}

/** Multi-line text: newlines kept, other control characters removed. */
export function cleanBlock(value: unknown, max: number, label: string): string {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new HttpError(400, `${label} must be text.`);
  const text = value.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();
  if (text.length > max) throw new HttpError(400, `${label} must be at most ${max} characters.`);
  return text;
}

export async function readBody(request: Request, maxBytes = 300_000): Promise<Record<string, unknown>> {
  if (Number(request.headers.get("Content-Length") ?? "0") > maxBytes) throw new HttpError(413, "Request is too large.");
  const raw = await request.text();
  if (raw.length > maxBytes) throw new HttpError(413, "Request is too large.");
  if (!raw) return {};
  try {
    const body = JSON.parse(raw);
    return body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
  } catch { throw new HttpError(400, "The request body could not be read."); }
}
