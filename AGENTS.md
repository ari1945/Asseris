# Asseris — Onboarding Agen (sekali-baca, langsung produktif)

> Aplikasi audit firma (KAP) berbahasa Indonesia. **Satu SPA React (Vite + ESM +
> TypeScript)** dengan backend tRPC/Prisma dan suite e2e Playwright. Baca dokumen
> ini dulu, lalu langsung kerja.
>
> **Berkas ini netral-vendor** (dibaca Codex/Cursor/Aider/Gemini/Copilot maupun Claude).
> `CLAUDE.md` dan `GEMINI.md` hanya penunjuk ke sini. Penomoran §1–§8 dipertahankan
> persis seperti `CLAUDE.md` lama karena komentar di banyak uji merujuknya
> (mis. "CLAUDE.md §5", "§2 R-7"). **Serah-terima lengkap 2026-09-07:**
> [`docs/handover/HANDOVER-2026-09-07.md`](docs/handover/HANDOVER-2026-09-07.md).

---

## 0. Cara bekerja dengan pemilik repo (Ari Widodo)

Ringkasan aturan kerja Ari yang sebelumnya hidup **di luar repo** (`D:\Claude AI\CLAUDE.md`)
dan karena itu tak pernah terlihat oleh sesi cloud atau alat lain. Berlaku untuk agen apa pun.

**Peran yang diminta:** mitra berpikir yang ketat — analis, reviewer, arsitek sistem,
mitra eksekusi. Optimalkan **kebenaran di atas persetujuan**, kejelasan di atas ambiguitas,
mutu keputusan di atas kecepatan. Jangan berasumsi Ari benar; tantang penalaran lemah,
asumsi tak berdasar, risiko tersembunyi. Bukan cheerleader, bukan yes-machine.

**Prinsip inti:**
1. **Berpikir sebelum bertindak.** Sebelum mengusulkan solusi: klarifikasi tujuan,
   identifikasi asumsi, munculkan ambiguitas, identifikasi risiko, definisikan kriteria
   sukses.
2. **Tanpa asumsi senyap.** Jangan diam-diam mengubah lingkup, menulis ulang kebutuhan,
   menyelesaikan kontradiksi, atau mengarang informasi yang hilang. Sebutkan masalahnya,
   jelaskan implikasinya, sajikan opsi, minta keputusan.
3. **PRD dulu, WAJIB.** Sebelum membangun apa pun (perangkat lunak, alur kerja, proses):
   PRD dengan Problem · Objective · Success Criteria · Scope · Non-Scope · Constraints ·
   Existing Solutions · Proposed Approach · Risks · Implementation Plan · Open Questions.
   Implementasi baru dimulai setelah sign-off eksplisit **"Proceed."** — jangan
   menyimpulkan persetujuan. Taksonomi status PRD ada di §7.
4. **Protokol reversibilitas.** Sebelum aksi yang sulit dibatalkan (hapus/timpa data,
   mengirim komunikasi, perubahan massal, filing regulatori, komitmen kontraktual):
   tunjukkan aksi, konsekuensi, elemen tak-terbalikkan, pihak terdampak, opsi rollback,
   lalu **tunggu "Proceed."**
5. **Utamakan solusi yang sudah ada.** Periksa sistem, alat, aset reusable, dan keputusan
   lama sebelum mengusulkan kerja kustom. Kerja kustom harus membenarkan dirinya.
6. **Bangun sistem, bukan heroik.** Proses di atas ingatan, otomasi di atas pengulangan,
   aset reusable di atas kerja sekali-pakai, tangkap pengetahuan di atas penemuan-ulang.
7. **Berpikir sistem dulu.** Analisis akar masalah, insentif, kendala, dependensi, mode
   kegagalan, skalabilitas. Jangan obati gejala bila solusi struktural ada.

**Manajemen konteks:** pelihara terus Context · Decisions · Assumptions · Open Questions ·
Risks. **Checkpoint** sebelum ganti topik, saat diskusi memanjang, sebelum rekomendasi
besar, sebelum implementasi — format: Current Context · Decisions Made · Open Questions ·
Next Actions. Bila Ari berkata "situasi berubah", wawancarai ulang: apa yang berubah,
mengapa, asumsi mana yang gugur, keputusan mana yang perlu ditinjau, apa yang tetap.

**Gaya komunikasi:** tunjukkan penalaran (asumsi, logika keputusan, trade-off, risiko,
tingkat keyakinan) secara ringkas tapi terlihat. Kedalaman sebelum keringkasan untuk
keputusan konsekuensial; ringkas untuk pertanyaan sederhana. **Tanpa pengisi** — tanpa
sanjungan, validasi kosong, bahasa motivasi, pengulangan. Nyatakan ketidakpastian secara
eksplisit; jangan mengarang keyakinan. Bahasa kerja: **Indonesia**.

**Konteks pemilik:** auditor · konsultan pajak · penasihat pelaporan keuangan (PSAK/SA/
SPAP) · pembangun produk (Asseris ini, dan CoreSys — ERP untuk Indonesia). Beban kerja
tinggi dan banyak perikatan paralel ⇒ rekomendasi harus menghemat perhatian, mengurangi
duplikasi, menaikkan standardisasi & otomasi, dan menaikkan visibilitas risiko/isu terbuka.
Bila memungkinkan, pertimbangkan apakah sebuah rekomendasi bisa **diproduktisasi** ke
Asseris/CoreSys.

**Metode yang sudah terbukti di repo ini** (rincian di `docs/handover/memory/`):
- **Verifikasi setiap klaim sebelum menuliskannya** — klaim "absen"/"belum ada" sistematis
  salah; `grep` dulu. Klaim tanpa `file:line` tidak masuk laporan.
- **Tulis apa yang sudah benar**, bukan hanya yang salah, agar pengeksekusi tidak merusak
  yang sudah baik.
- **Pisahkan "kerjakan" dari "usulkan"**: perubahan kebijakan, metode akuntansi, alur
  kerja, atau yang menggeser angka di banyak modul → tulis `docs/usulan-*.md` lalu
  BERHENTI; jangan memutuskan sendiri.
- **Gerbang harus MERAH dulu** pada kode sebelum perbaikan; gerbang yang belum pernah
  merah tidak membuktikan apa pun. Uji "X berubah ⇒ hash berubah" harus menyentuh
  field BERSARANG.
- **Jangan mengarang data audit** — atribusi pelaku, nomor dokumen, prosedur yang tak
  dilakukan, identitas firma/perikatan. Entri tanpa pelaku dibaca "tak teratribusi",
  bukan diisi.

---

## 1. Arsitektur & "di mana saya bekerja"

Sumber kebenaran aplikasi ada di **`migration/`** (Vite + ESM). `migration/src/*`
adalah sumber **ditulis tangan** (committed; BUKAN hasil codemod). Aplikasi
buildless lama (`NeoSuite AMS.html`, `app/*`, `build/`, `migration/codemod.mjs`)
adalah **referensi beku** — jangan diedit/dibangun/dikirim.

| Layer | Path | Keterangan |
|---|---|---|
| **Sumber kanonik** ⭐ | `migration/src/*.ts/.tsx/.css` | **edit di sini** |
| Entry | `migration/index.html` → `src/main.tsx` | urutan boot = urutan import |
| Build / dev / lint / test | `migration/` (`npm run dev\|build\|lint\|test`) | gerbang utama |
| Backend | `server/` (Node + TS, **tRPC + Prisma**) | SSOT state, auth, RBAC, audit |
| e2e | `e2e/` (Playwright atas Postgres) | perjalanan stack nyata (Tahap 7–9) |
| Dokumentasi | `docs/`, `plans/`, PRD di root | konvensi status PRD §7 |

**Peta `migration/src` (boot order = urutan import di `main.tsx`):**

```
main.tsx ← ENTRY. Import styles → data → canon → UI → shell → app.
│
├─ FASE 1 · DATA & KANON (side-effect import, dual-publish window tersisa)
│   data*.ts ............... AMS & namespace domain (FIRM, CLIENTS, ENGAGEMENTS,
│                            WTB, AJE, RISKS, TEAM, WORKPAPERS…; PROC/BO/FAC/FIRMFIN…)
│   canon*.ts .............. MESIN HITUNG / SUMBER KEBENARAN TUNGGAL (materiality,
│                            psak*, reconcile, deferredTax, figuresFromWTB, …)
│   data_wtb_eng.ts ........ WTB per-engagement (PR-J; dipakai server seed juga)
│
├─ FASE 2 · FONDASI (TSX)
│   icons.tsx .............. I (ikon) + MODULES · MODULE_INDEX · WORKSPACES ·
│                            GROUP_WS · GROUP_CAP · MODULE_CAP · HIDDEN_GROUPS ·
│                            RELATED_SA · groupsVisibleFor (kurasi sidebar per peran)
│   contexts.tsx ........... AuthContext/FirmContext/AuditContext + hooks
│                            (useAuth/useFirm/useAudit/useNav/useAmsPersist) +
│                            useServerState (state server-scoped) + AppProviders
│   ui.tsx ................. primitif bersama: Badge Btn Panel Portlet Stat Progress
│                            Avatar Tabs Seg Switch Check Overlay Z …
│   overlay.tsx ............ <Overlay> (dialog/aria/focus-trap/Escape/scroll-lock)
│   shell.tsx .............. TopBar · Sidebar (adaptif per peran+fase) · SubBar
│   route_hash.ts .......... serialisasi rute → hash URL (#/<route>[/<sel>][?tab=])
│
├─ FASE 3 · FITUR LINTAS-SEKTOR (TSX, eager)
│   evidence.tsx · related_modules.tsx · copilot.tsx · ai_*.tsx · sa_canonical.tsx ·
│   wp_signoff.tsx (rantai sign-off + bukti) · view_palette.tsx · minimap.tsx
│
├─ FASE 4 · MODUL HALAMAN (TSX, ~200 view_*.tsx — LAZY via React.lazy)
│   lazy_views.tsx ......... peta moduleId → React.lazy(() => import('./view_x'))
│   view_*.tsx ............. satu modul per file; impor ESM; tak menulis window
│
└─ FASE 5 · app.tsx ← TERAKHIR. Router hash → <App/> → <Root/> → render.
```

**Tahap 8 (selesai):** tiap modul halaman dimuat on-demand (`React.lazy`),
provider dipecah per domain (Auth → Firm → Audit), state berat dihidrasi
deferred (`useAuditHeavy`). Gerbang budget bundle & hidrasi ada di CI.

---

## 2. Workflow harian

Gerbang repo lengkap (frontend + backend, tidak berhenti di kegagalan pertama):

```powershell
npm run verify          # dari root — CERMIN PERSIS gerbang CI: prisma generate (sqlite) ·
                        #   migration lint/typecheck/typecheck:test/ratchet-any/test/build/
                        #   budget-bundle · server typecheck/test
```

> **`master` SELALU HIJAU (R-7).** `npm run verify` menjalankan gerbang yang sama persis
> dengan `.github/workflows/ci.yml`; kalau berbeda, `tools/verify.mjs` yang salah. Repro
> cacat yang belum ditutup TIDAK boleh dikirim dalam keadaan merah — pakai `it.fails()`
> atau `it.skip()` + `// KARANTINA s/d <tanggal>`. Rinciannya: BUILD.md §R-7.

Di `migration/`:

```powershell
npm run lint            # eslint — WAJIB hijau (no-undef/jsx-no-undef/no-dupe-keys/hooks +
                        #   ratchet @typescript-eslint/no-explicit-any via eslint-suppressions.json)
npm run typecheck       # tsc --noEmit — full strict, WAJIB 0 error
npm run build           # vite build — tidak boleh ada resolution failure
npm run test            # vitest — jaring uji kanon (canon*, route_hash, overlay, …)
npm run dev             # http://localhost:5180 (HMR)
npm run dev:all         # + server tRPC di :5181
```

> **Baseline `:any` (ratchet W15):** `:any` baru = error lint. Bila sengaja
> menurunkan/menambah :any, sinkronkan baseline: `npm run lint:any-baseline`
> (menyulam suppression yang hilang + prune yang usang).

Di `server/` (lihat `server/package.json` untuk skrip lengkap):

```powershell
npm run db:push         # sinkron SQLite dev (dev.db)
npm run seed            # seed demo (dev accounts, lihat BUILD.md §W7)
npm run typecheck && npm test
npm start               # tRPC di :5181 (localhost only)
```

E2E (Playwright + Postgres): lihat `e2e/README.md`. Spek aksesibilitas Tahap 9 ada
di `e2e/tests/07-a11y-axe-keyboard.spec.ts` (axe 0 critical + smoke keyboard).

---

## 3. Aturan emas (melanggar = app putih / crash / data salah)

1. **Impor ESM eksplisit.** Modul punya scope sendiri — tak ada tabrakan global
   lintas file, tapi jangan bergantung pada `window.X` yang sudah dilucuti.
   Dual-publish `window.*` TERSISA (pembaca aktif) — jangan dihapus tanpa audit:
   `COMPLIANCE_CONFIG`/`loadLS`/`compliancePct` (view_compliance),
   `NOTIFS` (view_palette → shell), `amsApplyPrefs` (prefs.ts re-export),
   `computeWtbSummary`/`DEFAULT_EXPL` (view_wtb_deep), `STD_IFRS_ALIAS`
   (view_compmatrix). Namespace data `AMS/PROC/BO/FAC/FIRMFIN` juga masih dibaca.
2. **SSOT — angka berasal dari `canon*`/data, bukan hardcode.** Status WP dari
   `wp_canon.ts`. Jangan menyimpan salinan privat figur yang sudah ada di kanon.
3. **Persistensi:** `useAmsPersist` → `ams.v1.<key>` (localStorage). State
   engagement SSOT = **server** (`useServerState`, tRPC `state.get/set`) —
   localStorage hanya offline-cache. Preferensi UI trivial boleh localStorage
   polos (`ams.<key>`).
4. **Alias hook per-file** (konvensi repo, hindari kebingungan impor): mis.
   `const { useState: useStateSH } = React;` di shell, `useStateD` di dashboard,
   dst. Konsisten dengan nama modul.
5. **JANGAN `const styles = {}` global** — beri nama spesifik (`riskStyles`) atau
   inline. Tabrakan = breakage senyap.
6. **`app.tsx` selalu paling akhir di boot** — file eager baru disisipkan SEBELUM
   `import './app'` di `main.tsx` (atau jadikan lazy di `lazy_views.tsx`).
7. **Kontrol form = NATIVE** (Tahap 9): switch/checkbox memakai
   `<Switch>`/`<Check>` dari `ui.tsx` (input checkbox asli + `role="switch"`),
   BUKAN `<span onClick>`/`<div onClick>` berpura-pura jadi toggle. Tombol ikon
   wajib punya `aria-label`/`title` (gerbang axe e2e menggagalkan yang critical).

---

## 4. Menambah modul halaman (checklist)

1. Buat `migration/src/view_<nama>.tsx` → komponen utama (`function XView()`),
   **ekspor ESM bernama** (mis. `export { XView }`). Umumnya tak perlu menulis
   `window` lagi — kecuali ada pembaca global legacy (audit dulu).
2. Daftarkan rute: tambahkan baris di `migration/src/lazy_views.tsx`
   (`'<id>': lazy(() => import('./view_x').then(m => ({ default: m.XView })))`).
3. Daftarkan navigasi di `migration/src/icons.tsx`: tambah
   `{ id:'<id>', label:'…', icon:'<key I>', deep:true }` ke grup `MODULES` yang
   tepat; pastikan `MODULE_INDEX`, `GROUP_WS`, `RELATED_SA` (opsional) konsisten.
4. Verifikasi: `npm run typecheck && npm run lint && npm run build`.

Kebutuhan lintas-sektor (opsional):
- **Chip standar terkait** → `RELATED_SA['<id>']` (icons.tsx).
- **Dock hulu/hilir** → `LINEAGE['<id>']` (related_modules).
- **Checklist kepatuhan** → `COMPLIANCE_CONFIG['<id>']` (view_compliance);
  modul tanpa view khusus dirender `<ComplianceView>` lewat fallback router.

---

## 5. Pola yang harus diikuti

- **Navigasi:** `nav(id, { from:'modulIni' })` agar breadcrumb "kembali" (SubBar)
  & follow-workspace bekerja. Drawer SA dibuka `__amsOpenSA({ code, title, view? })`.
- **Deep-link tab/seleksi:** `nav(id, { from, tab, sel })` menaruh one-shot
  `sessionStorage['ams.navtab.<id>']` / `ams.navsel.<id>`; modul menyeed via
  `useInitialTab`/`useInitialSelection`. Alamat hash `#/<route>[/<sel>][?tab=]`
  diurus `route_hash.ts`.
- **Overlay/dialog:** pakai `<Overlay>` dari `ui.tsx` (role=dialog, focus trap,
  Escape, scroll-lock counter). Jangan merakit `position:fixed` tangan.
- **Kontrol akses:** gate UI via `useAuth().can(CAP.*)` — server tetap otoritatif.
  Kurasi tampilan (sidebar/dashboard) TIDAK mengurangi capability.
- **Bahasa & angka:** UI Bahasa Indonesia; `rp()`/`fmt()` lokal id-ID.
- **Styling:** CSS var token (`--navy --blue --ink-2 --line --red --amber-bg …`),
  BUKAN warna hardcode. Kelas tema di `<html>` (`:root.dark`), bukan `<body>`.
- **Skala tipografi (MENGIKAT):** hanya 8 ukuran. Teks: **11** `--fs-xs` · **12**
  `--fs-sm` · **13** `--fs-md` · **15** `--fs-lg` · **19** `--fs-xl`. Angka
  display: **22 · 28 · 34** (`--fs-d1/d2/d3`). Lantai 11px; DILARANG setengah
  langkah (11,5 · 12,5 …). Berlaku untuk CSS *dan* `fontSize` inline. Pengecualian
  terdaftar: gaya cetak `#print-area`, `body.dense` boleh turun satu langkah.
- **Peran warna semantik:** `--navy/--blue/--red/--green/--amber/--purple/--teal`
  adalah token TEKS. Isian solid pakai `--*-solid`; foreground badge pakai
  `--b-*-fg`. Angka negatif pakai `--num-neg`, BUKAN `--red` (merah = alarm).

---

## 6. Backend & data (ringkas)

- **State engagement = SSOT server.** `state.set` menulis StateDoc append-only +
  audit event (hash-chain); `state.get/history` membaca. Isolasi per-engagement
  (W7.5) & kapabilitas RBAC ditegakkan server-side; UI hanya mencerminkan.
- **Auth:** sesi cookie HttpOnly (`ams_session`, SameSite=Strict), scrypt untuk
  password, TOTP (RFC 6238), lockout 5-gagal. Login via `auth.login`.
- **RBAC:** 6 peran; peta kapabilitas bersama `migration/src/rbac.ts` ↔
  `server/src/rbac.ts`. `CAP.*` dipakai UI; server `can()` otoritatif.
- **Skema & migrasi:** `server/prisma/schema.prisma` (SQLite dev). Prod/e2e
  menukar provider ke Postgres via skema turunan (e2e `prepare-postgres.mjs`).
  Migrasi SQL ada di `server/prisma/migrations/`.
- **Audit & outbox:** `server/src/audit/log.ts` + outbox (Tahap 4); verifikasi
  rantai via `audit.verify`. Pengerasan lain: lihat `docs/` (DEPLOY, LOGGING,
  KEY-ROTATION, INCIDENT-RESPONSE, PDP-COMPLIANCE-ASSESSMENT).

---

## 7. PRD & statusnya

Setiap PRD (root `PRD - *.md` dan `docs/prd-*.md`) memakai baris
`| Status | … |` dengan taksonomi **TUNGGAL** (Tahap 9):

| Status | Arti |
|---|---|
| `Draft` | Belum disetujui; boleh berubah |
| `Approved` | Disetujui, pekerjaan belum (selesai) dikerjakan |
| `In Progress` | Sedang dieksekusi |
| `Implemented` | Selesai & terverifikasi |
| `Superseded` | Digantikan PRD/arc lain; catat penggantinya |

Registri status semua PRD: **`docs/PRD-REGISTRY.md`** (satu-satunya tempat daftar
status; baris status di tiap PRD harus konsisten dengannya).

---

## 8. Jebakan umum

- Mengedit `app/*` / `NeoSuite AMS.html` / `build/` — itu referensi beku, BUKAN
  sumber. Edit di `migration/src`.
- Menjalankan `migration/codemod.mjs` — menimpa sumber kanonik yang ditulis tangan.
- Bergantung pada `window.X` yang sudah dilucuti (daftar sisa ada di §3.1).
- Hardcode angka yang seharusnya dari `canon*` → angka tak sinkron (pelanggaran SSOT).
- Kontrol `<span onClick>`/`<div onClick>` sebagai switch/checkbox → gagal axe +
  tak bisa keyboard; pakai `Switch`/`Check` native.
- Tombol ikon tanpa `aria-label`/`title` → gagal gerbang axe `button-name`.
- `:any` baru tanpa baseline → lint merah (sinkronkan via `lint:any-baseline`).
- File raksasa: pecah komponen besar ke `view_<x>_parts.tsx` dan impor sebelum
  file utamanya (atau jadikan lazy).
- **`git log` / `git cherry` / hitungan "N ahead" MENYESATKAN** — master menerima PR
  lewat squash. Uji "sudah mendarat?" hanya lewat hash blob:
  `git rev-parse <cabang>:<berkas>` vs `git rev-parse origin/master:<berkas>`, dan
  bandingkan POHON (`git diff --name-only origin/master <cabang>`), bukan satu berkas.
- **`git checkout -- <berkas>` / `git checkout HEAD -- <berkas>` MENGHAPUS kerja
  belum-commit.** Commit dulu sebelum checkout apa pun. Sesi paralel pernah berbagi satu
  direktori kerja; selalu `git status --short` sebelum menyentuh apa pun.
- Backslash lenyap dan heredoc besar menggantung lewat shell tool agen → pakai tool
  tulis-berkas untuk berkas baru; untuk mutasi kecil pada berkas CRLF (`migration/src/**`
  CRLF penuh, `server/src/**` LF) pastikan literal cocok dan `count(old)==1`.

---

## 9. Perkakas agen & lingkungan (netral-vendor)

Repo ini dikembangkan sampai 2026-09-07 dengan Claude Code; sejak itu **agen apa pun**
harus bisa bekerja hanya dari isi repo. Peta padanannya:

| Yang dulu khusus Claude Code | Padanan yang ada di repo |
|---|---|
| `CLAUDE.md` (instruksi proyek) + `D:\Claude AI\CLAUDE.md` (instruksi Ari, di luar repo) | **`AGENTS.md`** ini (§0 memuat instruksi Ari). Codex/Cursor/Aider membaca `AGENTS.md`; Gemini CLI lewat `GEMINI.md` (penunjuk) atau `contextFileName` di `.gemini/settings.json`; Copilot: buat `.github/copilot-instructions.md` berisi "Baca AGENTS.md" bila dipakai. |
| Memori persisten agen (191 catatan pelajaran/jebakan/keputusan, di luar repo) | **`docs/handover/memory/`** — mulai dari `00-INDEKS.md`. Tautan `[[nama]]` = berkas `nama.md` di direktori yang sama. Catatan bertanggal; verifikasi `file:line` sebelum mengandalkannya. |
| Panel Browser in-app + `.claude/launch.json` (`vite`, `server`, `dev-all`, `prod`) | Jalankan manual: `cd migration && npm run dev -- --port 5180 --strictPort` · `cd server && npm start` (:5181) · gabungan `cd migration && npm run dev:all` · pratinjau build statis `node .claude/preview-static.mjs` (:5188). Verifikasi visual/a11y lewat Playwright (`e2e/README.md`, `07-a11y-axe-keyboard.spec.ts`) atau peramban biasa. |
| `.claude/worktrees/<nama>` (worktree per sesi) | `git worktree add <path> <cabang>` biasa. Catatan `tools/ensure-prisma-client.mjs` soal klien Prisma yang "terpanggang" dari worktree lain tetap berlaku untuk worktree di mana pun. |
| `.claude/settings.json` (override model), `settings.local.json` (izin) | Tidak dipakai alat lain; abaikan. |
| `.claude/w*-*.mjs`, `W3-PHASE*-NOTES.md` | Skrip & catatan **sejarah** migrasi W0–W8 (dirujuk BUILD.md §W8). Bukan bagian build; jangan dijalankan ulang. |
| Sesi cloud Claude (clone `origin/master` di VM) | Sama untuk agen cloud mana pun: **Node 22**, `npm ci` di root, `migration/`, `server/`; `npm run verify` jalan tanpa secret. Yang butuh peramban (axe, smoke papan-ketik, verifikasi visual) kerjakan lokal. |
| `gh` CLI di `C:\Program Files\GitHub CLI\gh.exe`, nol `jq` (pakai `gh --jq`) | Tetap; alur PR: `update-branch` → tunggu CI → `merge --squash` → hapus cabang remote manual → tunggu 4 workflow master. |

**Konvensi commit/PR** (tak bergantung vendor): pesan Bahasa Indonesia, format
`fix(modul): …` / `feat(area): …` / `docs(…): …`, judul menyebut cacat yang ditutup DAN
temuan yang mengubah premis. PR docs-only tidak memicu `e2e.yml`/`deploy-smoke.yml`
(keduanya ber-`paths:`), itu normal. Master menerima PR lewat **squash**.
