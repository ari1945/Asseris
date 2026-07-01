import './env'; // MUST be first — loads .env/.env.local before db/config read process.env.
import { createServer } from 'node:http';
import { createHTTPHandler } from '@trpc/server/adapters/standalone';
import { appRouter } from './router';
import { createContext } from './context';
import { prisma } from './db';
import { log, inc, renderMetrics } from './obs/log';
import { assertProdConfig, configSummary } from './prodConfig';

const PORT = Number(process.env.PORT ?? 5181);

// Deploy-Readiness M2 (§3.2) — log a redacted config summary, then FAIL-FAST in production if any
// required secret is missing/insecure (exit 1 before we ever listen). Dev/test are unaffected.
log.info('config.summary', { ...configSummary() });
assertProdConfig(process.env, {
  onProblem: (p) => log.error('config.invalid', { key: p.key, problem: p.problem }),
  onExit: (count) => {
    log.error('config.fail_fast', {
      detail: `Menolak start: ${count} masalah konfigurasi produksi tidak aman. Perbaiki env di atas lalu jalankan ulang.`,
    });
    process.exit(1);
  },
});

// The tRPC request handler (procedures served at root; the Vite dev proxy strips the /trpc
// prefix, and prod fronts this with the same path shape). onError feeds the error counter +
// structured log so observability sees failures without each resolver logging by hand.
const trpcHandler = createHTTPHandler({
  router: appRouter,
  createContext,
  onError({ error, path, type }) {
    inc('http_errors_total');
    log.error('trpc.error', { path: path ?? null, type, code: error.code, message: error.message });
  },
});

// W10 — wrap the tRPC handler so the same port also answers operational probes. /healthz and
// /metrics are plain HTTP (no tRPC), consumed by container healthchecks and a Prometheus scraper.
// Everything else delegates to tRPC unchanged.
const server = createServer((req, res) => {
  const path = (req.url ?? '').split('?')[0];

  if (path === '/healthz') {
    // Liveness + a cheap DB reachability check (the one dependency that matters).
    prisma.$queryRaw`SELECT 1`
      .then(() => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', db: 'up', uptime: Math.round(process.uptime()) }));
      })
      .catch(() => {
        res.writeHead(503, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ status: 'degraded', db: 'down' }));
      });
    return;
  }

  if (path === '/metrics') {
    res.writeHead(200, { 'content-type': 'text/plain; version=0.0.4' });
    res.end(renderMetrics());
    return;
  }

  inc('http_requests_total');
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    log.info('http.request', { method: req.method, path, status: res.statusCode, ms: Math.round(ms) });
  });
  trpcHandler(req, res);
});

server.listen(PORT, () => log.info('server.listen', { port: PORT, env: process.env.NODE_ENV ?? 'development' }));
