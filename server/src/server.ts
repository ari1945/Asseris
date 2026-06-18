import { createHTTPServer } from '@trpc/server/adapters/standalone';
import { appRouter } from './router';
import { createContext } from './context';

const PORT = Number(process.env.PORT ?? 5181);

// Standalone tRPC HTTP server. In dev the Vite SPA (5180) reaches it through a
// `/trpc` proxy, so this stays same-origin — no CORS needed. W7: createContext resolves
// the session token → ctx.user; auth procedures are public, the rest gate on it.
const server = createHTTPServer({
  router: appRouter,
  createContext,
});

server.listen(PORT);
console.log(`NeoSuite AMS server (W7) listening on http://localhost:${PORT}`);
