// W10 — minimal observability: structured JSON logging + in-memory counters. No vendor agent
// (nol-vendor); a log shipper/scraper consumes stdout JSON and the /metrics text endpoint in
// prod. One line per event so logs are grep-/jq-able and parseable by any aggregator.
type Level = 'debug' | 'info' | 'warn' | 'error';

// Counters surfaced at /metrics. Plain object so adding a metric is one key. Process-lifetime
// (reset on restart) — fine for a single-instance deploy; a multi-instance setup aggregates at
// the scraper. ts can't use Date.now() in some sandboxes but the SERVER runtime is real Node.
const counters: Record<string, number> = {
  http_requests_total: 0,
  http_errors_total: 0,
  logins_total: 0,
  llm_requests_total: 0,
  audit_appends_total: 0,
};

export function inc(name: keyof typeof counters | string, by = 1): void {
  counters[name] = (counters[name] ?? 0) + by;
}

function emit(level: Level, msg: string, fields?: Record<string, unknown>): void {
  const rec = { t: new Date().toISOString(), level, msg, ...(fields ?? {}) };
  const line = JSON.stringify(rec);
  if (level === 'error' || level === 'warn') console.error(line);
  else console.log(line);
}

export const log = {
  debug: (msg: string, f?: Record<string, unknown>) => emit('debug', msg, f),
  info: (msg: string, f?: Record<string, unknown>) => emit('info', msg, f),
  warn: (msg: string, f?: Record<string, unknown>) => emit('warn', msg, f),
  error: (msg: string, f?: Record<string, unknown>) => emit('error', msg, f),
};

export function metricsSnapshot(): Record<string, number> {
  return { ...counters, process_uptime_seconds: Math.round(process.uptime()) };
}

/** Prometheus text-exposition format — scrapeable by Prometheus/Grafana with no extra deps. */
export function renderMetrics(): string {
  const snap = metricsSnapshot();
  const lines: string[] = [];
  for (const [k, v] of Object.entries(snap)) {
    lines.push(`# TYPE neosuite_${k} ${k.endsWith('_total') ? 'counter' : 'gauge'}`);
    lines.push(`neosuite_${k} ${v}`);
  }
  return lines.join('\n') + '\n';
}
