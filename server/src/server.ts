import { createHTTPServer } from '@trpc/server/adapters/standalone';
import { appRouter } from './router';

const PORT = Number(process.env.PORT ?? 5181);

// Standalone tRPC HTTP server. In dev the Vite SPA (5180) reaches it through a
// `/trpc` proxy (Fase 1), so this stays same-origin — no CORS needed. No auth in
// W6: bind localhost only; do NOT expose to a network until W7.
const server = createHTTPServer({
  router: appRouter,
  createContext: () => ({}),
});

server.listen(PORT);
console.log(`NeoSuite AMS server (W6) listening on http://localhost:${PORT}`);
