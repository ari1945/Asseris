# Loadtest — baseline performa & validasi kapasitas

> PRD: [`docs/prd-performance-baseline-capacity.md`](../../../docs/prd-performance-baseline-capacity.md).
> Hasil terkini: [`docs/DEPLOY.md`](../../../docs/DEPLOY.md) §19. Memformalkan (dan memperluas)
> metodologi ramp §12.3 yang sebelumnya ad hoc / tak pernah di-commit.

Tiga skrip, tanpa dependensi npm baru (Node ≥18 bawaan + `tsx` yang sudah ada di
`server/node_modules`):

| Skrip | Jalankan dari | Fungsi |
|---|---|---|
| `gen-synthetic-wtb.ts` | `server/node_modules/.bin/tsx` | Bangkitkan WTB sintetis (fiktif) volume besar, validasi lewat parser NYATA (`wtb_import.ts`) |
| `bench-canon.ts` | `server/node_modules/.bin/tsx` | Ukur biaya komputasi kanon (`figuresFromWTB`/`reconcile`/`psak65`) headless, tanpa browser |
| `bench.mjs` | `node` biasa | Ukur waktu jaringan (`bootstrap`/`state.set`) single-session & ramp konkurensi thd stack Docker nyata |

## 1. Bangkitkan data sintetis

```bash
# preset besar (grup/konsolidasi, ~5.000+ baris) — default
server/node_modules/.bin/tsx deploy/aws-ec2-test/loadtest/gen-synthetic-wtb.ts

# preset "wajar" (utk perikatan pendamping, skenario multi-perikatan aktif)
WTB_SUBS=2 WTB_CUST=40 WTB_VEND=40 WTB_FA=20 WTB_INV=10 \
  WTB_OUT_NAME=synthetic-wtb-moderate \
  server/node_modules/.bin/tsx deploy/aws-ec2-test/loadtest/gen-synthetic-wtb.ts
```

Keluaran ke `fixtures/`: `.csv` (bisa ditempel manual ke drawer impor UI utk verifikasi visual)
+ `.parsed.json` (payload persis yang dikirim `state.set` — dipakai `bench.mjs seed-wtb`).
Skrip **gagal** (`process.exitCode=1`) bila parser `wtb_import.ts` melaporkan error — jangan
lanjut ke langkah berikut bila itu terjadi.

## 2. Ukur biaya komputasi kanon (headless, tanpa Docker)

```bash
server/node_modules/.bin/tsx deploy/aws-ec2-test/loadtest/bench-canon.ts
```

Membandingkan `figuresFromWTB`/`reconcile`/`psak65` pada WTB seed existing (baseline) vs
fixture besar (`fixtures/synthetic-wtb-group.parsed.json`, generate dulu lewat langkah 1).
**Tak butuh stack Docker berjalan** — murni komputasi Node.

## 3. Ukur waktu jaringan (perlu stack Docker berjalan)

**3.0 — boot stack dengan port 5181 terbuka ke host** (HANYA utk bench lokal, lihat
komentar `docker-compose.loadtest-override.yml`):
```bash
docker compose -f deploy/aws-ec2-test/docker-compose.deploy.yml \
  -f deploy/aws-ec2-test/loadtest/docker-compose.loadtest-override.yml \
  --env-file deploy/aws-ec2-test/.env up -d --build
```
Ikuti `docs/DEPLOY.md`/`README.md` §6 utk seed data demo dulu (`ALLOW_DEMO_SEED=1 npm run seed`)
bila belum. Cap CPU/RAM meniru t3.small (opsional, ikuti §12.3): `docker update --cpus=1.2
--memory=1200m asseris-test-server-1` dst.

**3.1 — login, ambil token:**
```bash
TOKEN=$(node deploy/aws-ec2-test/loadtest/bench.mjs login \
  --email=anindya.p@whr-cpa.id --password='Manager#2025!')
```

**3.2 — muat WTB sintetis ke perikatan uji (jalur `state.set` nyata):**
```bash
node deploy/aws-ec2-test/loadtest/bench.mjs seed-wtb --token=$TOKEN \
  --engagement=ENG-2025-014 \
  --fixture=deploy/aws-ec2-test/loadtest/fixtures/synthetic-wtb-group.parsed.json
```

**3.3 — mode volume (single-session, bootstrap p50/p95 per perikatan):**
```bash
node deploy/aws-ec2-test/loadtest/bench.mjs volume --token=$TOKEN \
  --engagements=ENG-2025-014,ENG-2025-040 --reps=20
```
`ENG-2025-014` (WTB besar dimuat langkah 3.2) vs `ENG-2025-040` (baseline, belum disentuh) —
delta murni akibat volume data, bukan noise lain.

**3.4 — mode concurrency (ramp thd perikatan bervolume besar):**
```bash
TOK2=$(node deploy/aws-ec2-test/loadtest/bench.mjs login --email=hartono.w@whr-cpa.id --password='Partner#2025!')
TOK3=$(node deploy/aws-ec2-test/loadtest/bench.mjs login --email=dimas.r@whr-cpa.id --password='Senior#2025!')
TOK4=$(node deploy/aws-ec2-test/loadtest/bench.mjs login --email=fajar.n@whr-cpa.id --password='Junior#2025!')
node deploy/aws-ec2-test/loadtest/bench.mjs concurrency \
  --tokens=$TOKEN,$TOK2,$TOK3,$TOK4 --engagement=ENG-2025-014 \
  --levels=5,10,20,50 --duration=15
```

## Batasan yang jujur (bukan dijual berlebihan)
- **Bukan EC2 nyata** — cap Docker Compose lokal meniru t3.small, bukan burstable-CPU EC2
  sungguhan (pola sama §12.3/§12.4 `docs/DEPLOY.md`).
- **`bench-canon.ts` mengukur komputasi murni, BUKAN render React/paint browser** — angka
  jaringan (`bench.mjs`) + komputasi (`bench-canon.ts`) digabung memberi gambaran menyeluruh,
  tapi waktu render DOM tabel WTB tak-berpaginasi di browser sungguhan TETAP tak terukur di
  sini (perlu instrumentasi browser terpisah — dicatat sebagai gap, bukan diklaim terukur).
- Data seluruhnya **fiktif** (nama entitas/pelanggan/pemasok rekaan) — jangan pernah dipakai
  selain lokal/uji.
