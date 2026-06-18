# PRD — W8 · LLM Proxy (NeoSuite AMS)

> Wajib sign-off ("Proceed.") sebelum implementasi.
> Acuan: `CLAUDE.md` (banner stub `llm_providers.js` → "panggilan harus lewat PROXY SERVER");
> memory `neosuite-ams-p4-diagnostic` (Fase 3 narasi LLM **DITUNDA, gated W6/proxy**);
> memory `neosuite-ams-arc` & `neosuite-ams-w7-auth` ("Next: W8 LLM-proxy — unblocks P4 Fase 3").
> Lanjutan **Fase B** setelah **W7 COMPLETE** (auth/sesi/RBAC server-enforced): tRPC + Prisma/SQLite,
> `protectedProcedure`, sesi → `ctx.user`, RBAC SSOT `rbac.js`, 31 server + 59 migration Vitest hijau.
> **Keputusan stack & scope di §11** = rekomendasi (AskUserQuestion 2026-06-18 tak dijawab → diajukan
> sebagai rekomendasi untuk sign-off; alternatif terdokumentasi di §7/§11). Mengikuti pola W7.

| Field | Isi |
|---|---|
| Tanggal | 2026-06-18 |
| Pemilik | Ari Widodo |
| Status | **DRAFT — menunggu sign-off** |

---

## 1. Problem

Lapisan LLM NeoSuite AMS **stub**. `migration/src/llm_providers.js` adalah registry murni (5 provider,
default **Anthropic**) + pembaca konfigurasi dari `ams.v1.settings.ai`; bannernya sendiri menyatakan
*"aplikasi ini TIDAK memanggil API nyata … panggilan harus lewat PROXY SERVER (kunci di server, auth,
rate-limit, redaksi PII) — bukan dari browser (CORS & kunci terekspos)."* Konsekuensinya:

- **Tak ada panggilan LLM nyata.** Panel Pengaturan › AI & LLM menyimpan provider/kunci/model lalu
  menampilkan **status simulatif** (`amsLLMStatus` → "Aktif · via proxy" tanpa proxy yang ada).
- **P4 Fase 3 terblokir.** P4 (AI Tax Audit Diagnostic) sengaja dibangun **deterministik** (Fase 0–2
  SELESAI: `AMS_DIAG`, 17 temuan live, audit-trail keputusan). Fase 3 = **lapisan narasi LLM** di atas
  temuan deterministik itu — ditunda eksplisit *"gated W6/proxy"*. Tanpa proxy, fitur narasi tak bisa
  dibangun secara jujur.
- **Kunci di browser = tak aman.** Jika narasi dipanggil langsung dari klien, kunci API terekspos di
  `localStorage`/jaringan dan banyak provider (Anthropic, Kimi) memblokir CORS. Satu-satunya jalur
  benar = proxy server.

**Catatan jujur (konsisten W6/W7):** app berjalan di **data demo fiktif** (`ENG-2025-014`), bukan
berkas klien nyata. W8 membangun **fondasi pemanggilan LLM yang aman + satu konsumen nyata**, bukan
mengamankan rahasia klien riil. Nilainya: membuka P4 Fase 3 (narasi atas temuan deterministik) dan
menghapus satu-satunya "AI" yang masih simulatif di app, **dengan batas kerahasiaan yang eksplisit**
(§ egress) — bukan menyalakan saluran bocor data.

## 2. Objective

Bangun **proxy LLM sisi server**: endpoint terotentikasi yang menerima permintaan narasi dari klien,
memanggil API LLM nyata dengan **kunci yang tersimpan di server**, menerapkan **auth + RBAC +
rate-limit + redaksi egress**, lalu mengembalikan teks ke klien. Ganti `amsLLMStatus` simulatif dengan
status **nyata** (terkonfigurasi/tidak, dari server). Wire **satu konsumen nyata** — tombol narasi
"Jelaskan temuan" di panel Diagnostik (P4 Fase 3) — sebagai bukti ujung-ke-ujung, dengan **degradasi
anggun** ke deterministik-only bila proxy tak terkonfigurasi. Semua **tanpa regresi numerik** terhadap
baseline W0 dan net Vitest server/migration yang ada (canon tak tersentuh).

## 3. Success Criteria (= DoD W8)

- **Panggilan LLM nyata via server:** endpoint `llm.complete` (protected) memanggil API Anthropic
  Messages nyata dengan kunci dari env server; mengembalikan teks. Terbukti dengan smoke test nyata
  (kunci dev) **atau** mock-adapter test bila kunci tak tersedia di lingkungan CI.
- **Kunci tak pernah di klien.** Kunci hanya di `server/.env` (gitignored). Tak ada kunci di bundel,
  `localStorage`, atau DB. Field kunci di panel Pengaturan menjadi **display-only** ("dikelola server").
- **Auth + RBAC ditegakkan:** tanpa sesi → UNAUTHORIZED; peran tanpa kapabilitas LLM → FORBIDDEN.
  **Uji otorisasi negatif** ada.
- **Redaksi egress:** server hanya meneruskan muatan ber-batas sesuai keputusan §11-Q1 (default:
  teks temuan ter-redaksi — tanpa baris WTB mentah, tanpa nama klien/NPWP). Ada **uji** yang
  membuktikan field terlarang tak ikut keluar.
- **Rate-limit / cost guard:** batas panggilan per-pengguna per-jendela-waktu; melewati batas →
  TOO_MANY_REQUESTS. Ada uji.
- **Degradasi anggun:** proxy tak terkonfigurasi (tanpa kunci) → endpoint balas `not-configured`;
  UI menampilkan deterministik-only + label jujur, **tak crash**, tak ada janji palsu "Aktif".
- **Konsumen nyata (P4 Fase 3):** tombol "Jelaskan temuan ini" di `DiagFindingCard`/panel agregat →
  narasi LLM atas temuan deterministik; ditandai jelas sebagai keluaran model bahasa (bukan
  deterministik), dengan disclaimer + sumber temuan.
- **Gate hijau:** server `typecheck` 0 + server Vitest (lama + baru) hijau; migration `lint` 0 +
  `typecheck` 0 + `build` + **59 Vitest** (zero numeric regression — canon tak disentuh).

## 4. Scope

1. **Server proxy** (`server/src/llm/`): adaptor provider (Anthropic Messages via `fetch`; adaptor
   generik OpenAI-compat untuk OpenAI/DeepSeek/Kimi), pembaca konfigurasi env, redaktor egress,
   rate-limiter in-memory, endpoint tRPC `llm.complete` (+ `llm.status`).
2. **RBAC:** kapabilitas baru (mis. `CAP.LLM_USE`) di SSOT `rbac.js` + cermin `server/src/rbac.ts`;
   gate endpoint; uji negatif.
3. **Klien:** `api.js` panggil `llm.complete`/`llm.status`; `llm_providers.js`/`amsLLMStatus` baca
   status **nyata** dari server (bukan simulatif); panel Pengaturan AI jadi display-only untuk kunci.
4. **Konsumen P4 Fase 3:** tombol narasi di `diagnostics_panel.jsx` (+ view agregat) yang mengirim
   temuan ter-redaksi → menampilkan narasi + disclaimer.
5. **Audit trail:** catat peristiwa pemakaian LLM (siapa/kapan/provider/jumlah token bila tersedia)
   — append-only, pola `AuthEvent` (boleh tabel baru `LlmEvent` atau reuse activity log).
6. **Dokumentasi:** `BUILD.md` bagian W8 (env var, cara set kunci, jalankan), update memory.

## 5. Non-Scope (ditunda)

- **Streaming (SSE/token-by-token).** W8 = non-streaming `mutation` yang mengembalikan teks penuh.
  Streaming = wave lanjutan (butuh transport non-tRPC atau tRPC subscription).
- **Provider Gemini** (API berbeda) — tetap "proxy-pending" di registry sampai diminta.
- **Konsumen LLM lain** (copilot chat `copilot.jsx`, `ai_insights.jsx`) — arsitektur disiapkan,
  wiring di luar W8 (P4 Fase 3 = satu konsumen bukti).
- **Per-user BYO key**, key vault/rotation, multi-tenant key management → W10/produksi.
- **Egress ke data klien nyata.** Data tetap demo fiktif; redaksi adalah pola produksi, bukan
  penjaminan kerahasiaan riil (itu butuh DPA/kontrak provider + W10 hardening).
- **Caching/dedup respons LLM, evaluasi kualitas narasi, fine-tuning, prompt-library besar.**

## 6. Constraints

- **Nol-vendor (lanjut W6/W7 stance):** pakai `fetch` global Node (≥18) untuk panggil API LLM;
  **tanpa** SDK `@anthropic-ai/*`/`openai`/`@google/*`. Tetap agent-executable, dodge native builds.
- **Localhost-only** (W7 boundary) — proxy tak diekspos jaringan; tak ada hardening deploy (W10).
- **Canon tak boleh disentuh** — zero numeric regression; gate Vitest/oracle tetap pin W0 baseline.
- **TypeScript strict** di server (gate `tsc --noEmit` 0). Klien `.jsx` tetap, `.ts` canon utuh.
- **Aturan emas anti-tabrakan** (alias hook unik, ekspor `window`, `<script>` sebelum `app.jsx`) tetap
  berlaku untuk kode klien baru — walau migration ESM sudah immune, ikuti konvensi modul.
- **Kerahasiaan (CLAUDE.md):** egress ke pihak ketiga adalah keputusan kerahasiaan eksplisit; default
  paling konservatif (§11-Q1) + flag `ai.share` dihormati + tak pernah kirim `10-INVESTMENTS`-class data
  (tak relevan di app ini, tapi prinsipnya: minimalkan egress).

## 7. Existing Solutions / Reuse

- **Reuse penuh:** stack server W6/W7 (tRPC `protectedProcedure`, `createContext`→`ctx.user`,
  Prisma, pola `AuthEvent` append-only, `logAuthEvent`); SSOT RBAC `rbac.js`/`rbac.ts` (`can`,
  `CAP`); registry provider `llm_providers.js` (label/model/baseUrl/`compat` sudah ada — proxy
  tinggal pakai `compat:'OpenAI'|'Anthropic'` untuk pilih adaptor); `api.js` tRPC client + pola
  `useServerState`; panel Pengaturan AI (`view_settings.jsx`) sudah punya UI provider/kunci/`share`.
- **Tak pakai SDK** — alternatif (SDK vendor) ditolak demi konsistensi nol-vendor; `fetch` cukup
  untuk Messages/Chat Completions.
- **Alternatif transport** (Express route SSE terpisah, WebSocket) ditolak untuk W8 demi konsistensi
  tRPC + kesederhanaan; dicatat sebagai jalur streaming masa depan (§5).
- **Alternatif egress kaya** (kirim WTB penuh) ditolak default demi kerahasiaan (§11-Q1).

## 8. Proposed Approach

**Server.** `server/src/llm/`:
- `config.ts` — baca `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`, `LLM_BASE_URL` dari env; `configured()`.
- `redact.ts` — ubah array `DiagFinding` → muatan teks ber-batas (judul/detail/std/severity saja;
  buang field identitas). Fungsi murni, mudah diuji.
- `providers/anthropic.ts` + `providers/openai_compat.ts` — `complete({system,user,model})` via `fetch`;
  petakan ke `/messages` resp `/chat/completions`; kembalikan `{text, usage?}`.
- `ratelimit.ts` — in-memory per-`userId` token-bucket / fixed-window (mis. N/menit).
- Router `llm`: `status` (protected; `{configured, provider, model}`), `complete` (protected;
  gate `CAP.LLM_USE`; rate-limit; redaksi; panggil adaptor; catat `LlmEvent`; balas `{text, usage}`
  atau `not-configured`).

**RBAC.** Tambah `CAP.LLM_USE` ke `rbac.js` GRANTS (rekomendasi: semua 4 peran boleh — narasi =
bantuan baca, bukan aksi istimewa; **atau** batasi ke Senior+ bila ingin konservatif — §11-Q5).

**Klien.** `api.js`: `llmStatus()`, `llmComplete(payload)`. `llm_providers.js`: `amsLLMStatus` jadi
async/baca `llm.status` server (atau komponen panggil langsung). Panel Pengaturan: kunci → display-only
"dikelola server". `diagnostics_panel.jsx`: tombol "Jelaskan temuan ini" → kumpulkan temuan terbuka
(ter-redaksi di server) → `llmComplete` → render narasi + badge "Narasi model bahasa (bukan
deterministik)" + disclaimer; spinner; error/`not-configured` → pesan jujur, panel deterministik tetap.

**Egress default (§11-Q1 = A):** klien kirim **id temuan** (atau temuan ringkas), server merekonstruksi
teks ter-redaksi dari sumber tepercaya bila memungkinkan, atau memvalidasi/menyaring muatan klien
sebelum egress. Tak ada baris WTB mentah, tak ada nama klien/NPWP, tak ada angka di luar yang sudah ada
di string temuan.

## 9. Risks & Mitigations

- **Kebocoran data ke pihak ketiga** (risiko utama, langsung ke aturan kerahasiaan CLAUDE.md) →
  egress minimal ter-redaksi (default §11-Q1=A) + uji anti-kebocoran + hormati `ai.share` + label
  jujur. Catat: provider pihak ketiga bisa cache/latih; produksi butuh DPA (W10).
- **Kunci bocor** → kunci hanya env server, gitignored, tak pernah ke klien/DB/bundel; field UI
  display-only.
- **Biaya/abuse** (panggilan LLM berbayar) → rate-limit per-pengguna + cost guard + audit `LlmEvent`.
- **"AI" menyesatkan lagi** (narasi LLM bisa halusinasi di atas temuan benar) → badge eksplisit
  "model bahasa, bukan deterministik", tampilkan temuan sumber, disclaimer "verifikasi sebelum
  dipakai di kertas kerja"; narasi **tak** menggantikan temuan/keputusan deterministik P4.
- **Regresi numerik** → canon tak disentuh; gate Vitest/oracle; PR diff tak menyentuh `canon_*`.
- **Kegagalan/timeout provider** → timeout `fetch` + retry terbatas + error anggun; degradasi ke
  deterministik-only.
- **Lock-in transport** (pilih non-streaming) → adaptor `complete()` dirancang agar bisa diperluas
  ke streaming tanpa rombak konsumen (kembalikan promise teks dulu).

## 10. Implementation Plan (fase, gate per fase)

- **Fase 0 — Proxy server (tanpa klien).** `server/src/llm/*` (config, redact, adaptor Anthropic +
  OpenAI-compat, ratelimit), router `llm.status`/`llm.complete`, `CAP.LLM_USE`, `LlmEvent` (atau reuse).
  Adaptor diuji dengan **mock fetch** (tak butuh kunci nyata di CI) + uji redaksi + uji rate-limit +
  uji RBAC negatif. Gate: server `typecheck` 0, server Vitest hijau. Smoke nyata opsional bila kunci ada.
- **Fase 1 — Status nyata di klien.** `api.js` `llmStatus`/`llmComplete`; `amsLLMStatus` baca server;
  panel Pengaturan kunci → display-only. Gate: lint 0, typecheck 0, build, 59 Vitest; live: badge AI
  menunjukkan status server nyata (terkonfigurasi/tidak), 0 console err.
- **Fase 2 — Konsumen P4 Fase 3.** Tombol "Jelaskan temuan" di `diagnostics_panel.jsx` + view agregat;
  render narasi + disclaimer + degradasi anggun. Gate: live preview — terkonfigurasi → narasi muncul;
  tak terkonfigurasi → pesan jujur + deterministik tetap; 0 console err; 59 Vitest utuh.
- **Fase 3 (opsional, bila diminta) — perluasan.** Wire copilot/ai_insights; siapkan jalur streaming.
  Default: **ditunda** (Non-Scope).

Tiap fase = commit terpisah, pesan `W8 Fase N: …`, mengikuti pola W6/W7.

## 11. Open Questions / Keputusan (rekomendasi untuk sign-off)

> AskUserQuestion 2026-06-18 tak dijawab. Rekomendasi di bawah diadopsi bila "Proceed." diberikan tanpa
> override; sebut nomor Q untuk mengubah.

- **Q1 — Batas egress data.** *Rekomendasi: **A — teks temuan ter-redaksi saja*** (judul/detail/std/
  severity; tanpa baris WTB mentah, nama klien/NPWP, atau angka di luar string temuan). Alt: B (+ FIG
  kunci) / C (konteks penuh). Alasan: P4 sudah deterministik & teruji; narasi hanya butuh teks temuan;
  paling selaras aturan kerahasiaan.
- **Q2 — Cakupan provider.** *Rekomendasi: **A — Anthropic dulu + adaptor OpenAI-compat*** (menutup
  OpenAI/DeepSeek/Kimi via satu jalur; Anthropic = default registry & model Claude terbaru). Alt:
  Anthropic-only / kelima-nya (Gemini API berbeda — ditunda).
- **Q3 — Kustodian kunci.** *Rekomendasi: **A — env var server (kunci firma)***; field kunci UI jadi
  display-only. Alt: per-user BYO key (kunci transit browser — lebih lemah, ditunda W10).
- **Q4 — Cakupan W8.** *Rekomendasi: **A — proxy + wire P4 Fase 3 narasi*** (bukti ujung-ke-ujung +
  buka unblock yang dinyatakan). Alt: proxy-plumbing-only.
- **Q5 — Kapabilitas LLM per-peran.** *Rekomendasi: **semua 4 peran boleh `LLM_USE`*** (narasi =
  bantuan baca, bukan aksi istimewa; tetap di-rate-limit & di-audit). Alt: batasi Senior+ bila ingin
  konservatif biaya.
- **Q6 — Transport.** *Rekomendasi: **non-streaming `mutation`*** (teks penuh) untuk W8; streaming
  ditunda (§5). Konfirmasi bila streaming wajib di W8.

---

### Ringkasan untuk keputusan
W8 = proxy LLM aman (kunci di server, auth+RBAC+rate-limit+redaksi) + satu konsumen nyata yang membuka
**P4 Fase 3** (narasi model bahasa di atas temuan **deterministik** yang sudah ada), dengan degradasi
anggun & label jujur. Nol-vendor (`fetch`), canon tak tersentuh, localhost-only. **Menunggu "Proceed."**
(atau "Proceed, kecuali Qx = …").
