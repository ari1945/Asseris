/* ============================================================
   W6 Fase 1 — tRPC client (browser).
   Talks to the server through the Vite dev-proxy at /trpc (→ :5181).
   Plain JS, untyped: contexts.jsx is .jsx, outside the canon tsc gate.
   The whole app degrades gracefully when the server is absent — every
   caller swallows network errors and falls back to the localStorage cache.
   ============================================================ */
import { createTRPCClient, httpBatchLink } from '@trpc/client';

export const api = createTRPCClient({
  links: [httpBatchLink({ url: '/trpc' })],
});

/* True when a mutation lost an optimistic-concurrency race (server returned 409). */
export function isConflict(err) {
  const code = err && (err.data?.code || err.shape?.data?.code);
  const status = err && (err.data?.httpStatus || err.shape?.data?.httpStatus);
  return code === 'CONFLICT' || status === 409;
}

window.AMS_API = api;
