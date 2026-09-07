---
name: asseris-cloud-session-batas
description: "Apa yang ikut & tidak ikut ke sesi cloud Claude Code — npm run verify jalan tanpa secret, tapi MEMORY.md, MCP lokal, dan browser pane tidak ikut"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 45355f13-7254-4d3f-bfa9-592ed5b3fd18
  modified: 2026-08-27T06:28:22.308Z
---

Sesi cloud meng-clone `origin/master` dari GitHub ke VM Ubuntu. Ia **tidak melihat**
direktori kerja lokal, cabang lokal, maupun mesin ini.

**IKUT ke cloud:** `CLAUDE.md` proyek (ter-commit) · akses GitHub penuh (PR/branch) ·
tool bawaan Read/Write/Edit/Bash/Glob/Grep.

**TIDAK ikut:** seluruh memori otomatis (`MEMORY.md` + berkas topik ini) · `CLAUDE.md`
tingkat-user di `D:\Claude AI\CLAUDE.md` (di LUAR repo, 2 level di atas) · MCP lokal
termasuk Claude in Chrome · `.env` belum-commit · `/doctor` & `/hooks` · **browser pane
`mcp__Claude_Browser__*`** · dev server/HMR · tooling Windows (cloud = Ubuntu). Sesi
cloud juga expire saat idle.

**Gerbang Asseris KOMPATIBEL PENUH dengan cloud** — diverifikasi 2026-08-27:
`server/.env` **ter-track di git** (hanya `.env.local` yang di-ignore),
`server/vitest.config.ts:8` memaku `DATABASE_URL: 'file:./test.db'`, dan
Postgres/Docker hanya dipakai `e2e.yml` + `deploy-smoke.yml` — **bukan** `npm run verify`.
Jadi ke-11 langkah `tools/verify.mjs` jalan di VM tanpa secret tambahan. Repo tak punya
`.devcontainer`, jadi cloud perlu `npm ci` di `migration/` dan `server/`.

**Konsekuensi praktis:** berkas prompt di `docs/prompts-perbaikan/` **adalah** mekanisme
portabilitas cloud — karena ter-commit, ia menggantikan konteks yang tak ikut. Tapi
prompt yang DoD-nya menuntut axe / smoke papan-ketik / verifikasi visual **tidak bisa**
diselesaikan di cloud (mis. `01-home` P2) — kerjakan lokal.

**Hambatan sebenarnya bukan kapasitas eksekusi.** Per 2026-08-27: nol dari 25 prompt siap
dikirim ke cloud (17 mendarat · 2 sudah ada di cabang lokal · 5 terhalang kerja
belum-commit · 1 anti-cloud secara struktural). Yang memblokir adalah antrean keputusan
Ari (9 usulan) dan enam cabang belum mendarat — lihat [[asseris-sensus-cabang-2026-08-27]].

Pindah kanal: `claude --cloud "…"` (lokal → cloud) · `claude --teleport <session-id>`
(cloud → lokal, membawa riwayat percakapan). Repo non-GitHub: `CCR_FORCE_BUNDLE=1`
(bundle maks 100 MB). Auth: GitHub App lewat browser, atau `/web-setup` menyinkronkan
token `gh` CLI.
