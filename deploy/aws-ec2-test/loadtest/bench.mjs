#!/usr/bin/env node
/* ============================================================
   Asseris — Skrip bench reusable (PRD: docs/prd-performance-baseline-capacity.md)
   ------------------------------------------------------------
   Memformalkan metodologi ramp konkurensi docs/DEPLOY.md §12.3 (yang sebelumnya
   ad hoc, tak pernah di-commit) + menambah sumbu volume data yang belum pernah
   diuji (WTB ribuan baris, bukan cuma seed demo 27-baris).

   Node >=18 (fetch bawaan). TANPA dependensi npm baru — protokol HTTP tRPC
   (non-batch) diimplementasikan manual di bawah (lihat `call()`), bukan lewat
   @trpc/client, supaya skrip ini portable tanpa perlu node_modules workspace
   manapun ter-install.

   Target: server:5181 LANGSUNG (bukan lewat edge Caddy) — sama seperti §12.3,
   supaya (a) mengisolasi bottleneck arsitektur dari overhead TLS/Caddy, dan
   (b) menghindari rate-limit edge (§14, 5 req/menit/IP utk auth.login) yang
   akan mencemari hasil ramp konkurensi. Port 5181 TIDAK dipublish di
   `docker-compose.deploy.yml` (sengaja, internal-only) — pakai override lokal
   `docker-compose.loadtest-override.yml` di folder ini HANYA utk sesi bench,
   jangan pernah publish port ini di deploy produksi sungguhan.

   Contoh pakai (lihat README.md folder ini utk detail penuh):
     node bench.mjs login --email=anindya.p@whr-cpa.id --password='Manager#2025!'
     node bench.mjs seed-wtb --token=<token> --engagement=ENG-2025-014 \
       --fixture=fixtures/synthetic-wtb-group.parsed.json
     node bench.mjs volume --token=<token> --engagements=ENG-2025-014,ENG-2025-040
     node bench.mjs concurrency --tokens=<t1>,<t2>,<t3>,<t4> \
       --engagement=ENG-2025-014 --levels=5,10,20,50 --duration=15
   ============================================================ */
import { readFileSync } from 'node:fs';

const BASE = process.env.LOADTEST_BASE_URL || 'http://localhost:5181';

/* ---------- protokol HTTP tRPC non-batch (createHTTPHandler bawaan @trpc/server) ----------
   Server memasang prosedur di ROOT (server/src/server.ts:39 — "/trpc" prefix distrip Caddy/Vite
   di depan, BUKAN oleh handler ini), dan skrip ini memanggil server:5181 LANGSUNG (bypass Caddy,
   lihat komentar berkas) — jadi TANPA prefix /trpc di sini:
   Query:    GET  /<path>?input=<encodeURIComponent(JSON.stringify(input))>
   Mutation: POST /<path>  body=JSON.stringify(input)
   Respons sukses: { result: { data: <output> } } — TANPA transformer (plain JSON, dicek trpc.ts). */
async function call(method, path, input, token) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers['authorization'] = `Bearer ${token}`;
  const t0 = performance.now();
  let res;
  try {
    if (method === 'query') {
      const qs = input !== undefined ? `?input=${encodeURIComponent(JSON.stringify(input))}` : '';
      res = await fetch(`${BASE}/${path}${qs}`, { headers });
    } else {
      res = await fetch(`${BASE}/${path}`, { method: 'POST', headers, body: JSON.stringify(input ?? {}) });
    }
  } catch (e) {
    return { ms: performance.now() - t0, ok: false, status: 0, error: String(e && e.message || e) };
  }
  const ms = performance.now() - t0;
  let body = null;
  try { body = await res.json(); } catch { /* respons non-JSON (mis. 502) — body tetap null */ }
  if (!res.ok || !body || body.error) {
    return { ms, ok: false, status: res.status, error: (body && body.error && body.error.message) || `http ${res.status}` };
  }
  return { ms, ok: true, status: res.status, data: body.result.data };
}

async function login(email, password) {
  const r = await call('mutation', 'auth.login', { email, password });
  if (!r.ok) throw new Error(`login gagal (${email}): ${r.error}`);
  return r.data.token;
}

async function stateGet(token, scope, scopeId, key) {
  const r = await call('query', 'state.get', { scope, scopeId, key }, token);
  if (!r.ok) throw new Error(`state.get gagal (${scope}/${scopeId}/${key}): ${r.error}`);
  return r.data; // { value, version }
}
async function stateSet(token, scope, scopeId, key, value, baseVersion) {
  return call('mutation', 'state.set', { scope, scopeId, key, value, baseVersion }, token);
}

function percentiles(samplesMs) {
  const s = [...samplesMs].sort((a, b) => a - b);
  const at = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  return { p50: at(0.5), p95: at(0.95), p99: at(0.99), min: s[0] ?? 0, max: s[s.length - 1] ?? 0, n: s.length };
}
function fmtP(p) {
  return `p50=${p.p50.toFixed(0)}ms  p95=${p.p95.toFixed(0)}ms  p99=${p.p99.toFixed(0)}ms  n=${p.n}`;
}

/* ---------- argv sederhana: --key=value / --key value ---------- */
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const eq = a.indexOf('=');
    if (eq !== -1) { out[a.slice(2, eq)] = a.slice(eq + 1); }
    else { out[a.slice(2)] = argv[i + 1]; i++; }
  }
  return out;
}

/* ---------- subcommand: login (cetak token, dipakai subcommand lain) ---------- */
async function cmdLogin(args) {
  const token = await login(args.email, args.password);
  console.log(token);
}

/* ---------- subcommand: seed-wtb (muat fixture ke satu perikatan, jalur state.set nyata) ---------- */
async function cmdSeedWtb(args) {
  const payload = JSON.parse(readFileSync(args.fixture, 'utf8'));
  const cur = await stateGet(args.token, 'engagement', args.engagement, 'wtbImport');
  const t0 = performance.now();
  const r = await stateSet(args.token, 'engagement', args.engagement, 'wtbImport', payload, cur.version);
  const ms = performance.now() - t0;
  if (!r.ok) throw new Error(`state.set wtbImport gagal utk ${args.engagement}: ${r.error}`);
  const kb = (JSON.stringify(payload).length / 1024).toFixed(1);
  console.log(`${args.engagement}: ${payload.rows.length} baris dimuat, payload ${kb} KB, state.set ${ms.toFixed(0)}ms → versi ${r.data.version}`);
}

/* ---------- mode=volume: single-session, bootstrap p50/p95 per perikatan ---------- */
async function cmdVolume(args) {
  const engagements = args.engagements.split(',').map((s) => s.trim());
  const reps = Number(args.reps || 20);
  console.log(`mode=volume  reps=${reps}  target=${BASE}\n`);
  for (const eng of engagements) {
    const samples = [];
    let errors = 0;
    for (let i = 0; i < reps; i++) {
      const r = await call('query', 'bootstrap', { engagementId: eng }, args.token);
      if (!r.ok) { errors++; continue; }
      samples.push(r.ms);
    }
    const p = percentiles(samples);
    console.log(`bootstrap ${eng.padEnd(16)} ${fmtP(p)}  errors=${errors}`);
  }
}

/* ---------- mode=concurrency: ramp N sesi konkuren, campuran baca(bootstrap)+tulis(state.set kecil) ---------- */
async function runLevel(tokens, engagementId, concurrency, durationMs) {
  const readSamples = [];
  const writeSamples = [];
  let errors = 0;
  let conflicts = 0; // CAS 409 pada shared-doc probe (lihat --sharedWriteKey) — dihitung terpisah,
                      // BUKAN error arsitektur (lihat catatan di bawah)
  let ops = 0;
  const errorSamples = []; // beberapa contoh pesan error mentah — utk membedakan saturasi server
                            // nyata vs artefak client (mis. keep-alive socket ditutup pihak lain)
  const deadline = Date.now() + durationMs;

  async function worker(idx) {
    const token = tokens[idx % tokens.length];
    // Kunci StateDoc PER-WORKER (bukan satu kunci dibagi semua) — meniru pola realistis "N staf
    // menulis dokumen kerja masing-masing", bukan worst-case artifisial semua orang menulis SATU
    // field yang sama di saat bersamaan (itu diukur terpisah lewat --sharedWriteKey bila diminta).
    const writeKey = `loadtestProbe-${idx}`;
    while (Date.now() < deadline) {
      try {
        // 2 baca : 1 tulis, mendekati pola kerja nyata (lebih banyak baca daripada simpan)
        const doWrite = ops % 3 === 2;
        if (!doWrite) {
          const r = await call('query', 'bootstrap', { engagementId }, token);
          ops++;
          if (!r.ok) { errors++; if (errorSamples.length < 5) errorSamples.push(`baca: ${r.error}`); continue; }
          readSamples.push(r.ms);
        } else {
          const cur = await stateGet(token, 'engagement', engagementId, writeKey);
          const r = await stateSet(token, 'engagement', engagementId, writeKey,
            { ping: Date.now(), by: idx }, cur.version);
          ops++;
          if (!r.ok) {
            // HTTP 409 = TRPCError CONFLICT (CAS race). Dengan kunci per-worker ini seharusnya
            // jarang terjadi (hanya bila worker yang sama menyusul dirinya sendiri lebih cepat
            // dari round-trip sebelumnya) — dihitung terpisah, bukan error arsitektur.
            if (r.status === 409) { conflicts++; }
            else { errors++; if (errorSamples.length < 5) errorSamples.push(`tulis: ${r.error}`); }
            continue;
          }
          writeSamples.push(r.ms);
        }
      } catch (e) {
        // stateGet/stateSet melempar Error pada respons non-ok — tangkap di sini supaya SATU
        // worker gagal tak menjatuhkan seluruh Promise.all (dan level pengujian ini).
        ops++; errors++;
        if (errorSamples.length < 5) errorSamples.push(`exception: ${e && e.message || e}`);
      }
    }
  }
  const t0 = performance.now();
  await Promise.all(Array.from({ length: concurrency }, (_, i) => worker(i)));
  const wallMs = performance.now() - t0;
  return {
    opsPerSec: ops / (wallMs / 1000),
    read: percentiles(readSamples),
    write: percentiles(writeSamples),
    errors,
    conflicts,
    errorSamples,
  };
}

async function cmdConcurrency(args) {
  const tokens = args.tokens.split(',').map((s) => s.trim());
  const levels = args.levels.split(',').map((s) => Number(s.trim()));
  const durationS = Number(args.duration || 15);
  console.log(`mode=concurrency  levels=${levels.join('/')}  durasi=${durationS}dtk/level  engagement=${args.engagement}  target=${BASE}\n`);
  console.log('Konkurensi | Ops/dtk | Baca p50/p95/p99 | Tulis p50/p95/p99 | Error | CAS-409');
  for (const level of levels) {
    const r = await runLevel(tokens, args.engagement, level, durationS * 1000);
    console.log(
      `${String(level).padStart(10)} | ${r.opsPerSec.toFixed(0).padStart(7)} | ` +
      `${r.read.p50.toFixed(0)}/${r.read.p95.toFixed(0)}/${r.read.p99.toFixed(0)}ms (n=${r.read.n}) | ` +
      `${r.write.p50.toFixed(0)}/${r.write.p95.toFixed(0)}/${r.write.p99.toFixed(0)}ms (n=${r.write.n}) | ${r.errors} | ${r.conflicts}`,
    );
    if (r.errorSamples.length) console.log(`  contoh error: ${r.errorSamples.join(' || ')}`);
  }
}

async function main() {
  const [sub, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  switch (sub) {
    case 'login': return cmdLogin(args);
    case 'seed-wtb': return cmdSeedWtb(args);
    case 'volume': return cmdVolume(args);
    case 'concurrency': return cmdConcurrency(args);
    default:
      console.error('Subcommand tak dikenal. Pakai: login | seed-wtb | volume | concurrency (lihat README.md).');
      process.exitCode = 1;
  }
}

main().catch((e) => { console.error('GAGAL:', e.message || e); process.exitCode = 1; });
