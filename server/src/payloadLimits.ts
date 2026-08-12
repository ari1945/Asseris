import type { IncomingMessage, ServerResponse } from 'node:http';

// Deployment hardening: cap both the transport envelope and each persisted StateDoc.
// A 10 MiB attachment expands to ~13.34 MiB as base64, so the HTTP ceiling leaves enough
// room for JSON/tRPC metadata while still preventing an unbounded request from reaching parsers.
export const MAX_REQUEST_BODY_BYTES = 16 * 1024 * 1024;
export const MAX_STATE_DOC_BYTES = 5 * 1024 * 1024;

/** Fast-path declared oversized requests before tRPC starts parsing the stream. The tRPC
 * maxBodySize remains the authoritative fallback for chunked/missing Content-Length requests. */
export function rejectOversizedContentLength(
  req: IncomingMessage,
  res: ServerResponse,
  maxBytes = MAX_REQUEST_BODY_BYTES,
): boolean {
  const raw = req.headers['content-length'];
  if (typeof raw !== 'string') return false;
  const length = Number(raw);
  if (!Number.isFinite(length) || length <= maxBytes) return false;
  res.writeHead(413, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: 'PAYLOAD_TOO_LARGE', maxBytes }));
  // Discard incoming bytes without buffering them. Destroying immediately can reset the socket
  // before the 413 reaches the client; resume drains safely without retaining the bytes.
  req.resume();
  return true;
}

export class StateDocTooLargeError extends Error {
  constructor(public readonly actualBytes: number) {
    super(`state-doc-too-large:${actualBytes}>${MAX_STATE_DOC_BYTES}`);
  }
}

/** Serialize once, then enforce the limit on UTF-8 bytes (the same representation persisted). */
export function serializeStateDoc(value: unknown): string {
  const valueJson = JSON.stringify(value ?? null);
  const actualBytes = Buffer.byteLength(valueJson, 'utf8');
  if (actualBytes > MAX_STATE_DOC_BYTES) throw new StateDocTooLargeError(actualBytes);
  return valueJson;
}
