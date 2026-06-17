# Evaluasi Fitur NeoSuite AMS — Peta Gap & Pendalaman

> **Sifat dokumen:** evaluasi (read-only) — *tidak* mengubah kode aplikasi.
> **Tanggal:** 2026-06-18 · **Basis kode:** `migration/src` (canonical, ESM, pasca-W5).
> **Tujuan:** menilai apakah fitur perlu *penambahan* (breadth) atau *pendalaman* (depth),
> berbasis pemindaian kode—bukan asumsi.

---

## 1. Ringkasan eksekutif

**Aplikasi luas tapi dangkal.** Keluasan (breadth) sudah jenuh — ~132 modul terhubung
(151 route, 161 view top-level) mencakup nyaris seluruh SA + PSAK + operasi firma.
**Menambah modul baru bukan prioritas.** Nilai terbesar ada pada **pendalaman**: mengubah
modul dari "menampilkan angka" menjadi "kertas kerja yang tersimpan, berbukti, dan
ditandatangani".

Angka kunci (161 view top-level):

| Indikator | Nilai | Makna |
|---|---:|---|
| Tier 4 — *auditable WP* (persist + evidence/sign-off) | **6 (4%)** | Sangat sedikit modul yang benar-benar "kertas kerja". |
| Tier 2 — *ephemeral* (ada input, **tak** disimpan) | **78 (48%)** | Hampir separuh fitur tampak interaktif tapi hilang saat reload. |
| Persist (`useAmsPersist`/`usePersisted`) | 42 (26%) | Hanya seperempat modul menyimpan state. |
| Evidence dock terpasang | **3** | Lampiran bukti audit praktis belum ada. |
| Sign-off / review note | 16 | Jejak telaah-tanda tangan minim. |
| Konsumsi canon (mesin angka) | 38 | …namun **34 tak menyimpan**, **37 tanpa evidence**. |
| Menyentuh AI (LLM/copilot) | 2 | AI = drawer global, belum terembed per-modul. |

**Tiga kalimat simpulan:**
1. Lapisan angka kanonik (`AMS_CANON`) sudah matang & teruji (W4/W5) — fondasi kuat.
2. Tapi modul-modul yang memakainya sebagian besar **display-only**: benar secara hitung,
   belum auditable.
3. Pendalaman paling bernilai = **persistensi → kelengkapan kertas kerja (evidence + sign-off)
   → AI diagnostic → benang alur engagement**, dalam urutan itu.

---

## 2. Metodologi & keterbatasan

**Sinyal kedalaman** dipindai per-file (`view_*.jsx`, di luar `*_parts.jsx`):

| Sinyal | Deteksi |
|---|---|
| `persist` | `useAmsPersist` / `usePersisted` |
| `input` | `<input` / `<textarea` / `<select` / `onChange` |
| `evidence` | `amsEvidence*` / `EvidenceDock` |
| `signoff` | `signoff` / `reviewNote` / `deriveWpStatus` / `openCanonicalWp` |
| `export` | `amsPrintDoc` / `window.print` / `.csv` |
| `canon` | `AMS_CANON` / `canon_selectors` |
| `ai` | `AMS_LLM` / `aiInsight` / `__amsOpenCopilot` |

**Tier kedalaman** (0–4): 0 statis · 1 compute-display (pakai canon, tanpa input) ·
2 ephemeral (input, tanpa persist) · 3 persistent · 4 auditable (persist + evidence/sign-off).

Pengelompokan area memakai `connectivity.json` (graf modul: group/workspace/edges).

**Keterbatasan (jujur):**
- Ini **heuristik berbasis pola** — mendeteksi *keberadaan* mekanisme, bukan kualitas/kelengkapan
  implementasinya. Modul bisa "punya input" tapi dangkal, atau "tak ber-persist" karena memang
  display-by-design (mis. indeks/referensi).
- Pencocokan view↔graf parsial (≈84/132 id cocok by-name); agregat tier/flag tetap valid,
  pengelompokan area bersifat indikatif.
- Validasi sampel: `view_psak16` (Aset Tetap) terkonfirmasi murni compute-display
  (0 persist, 0 evidence/sign-off, 3 rujukan canon) — sesuai klasifikasi.

---

## 3. Peta gap per area audit

Rata-rata tier (0–4) dan % persist per area (dari modul yang tercocokkan ke graf):

| Area | tier~ | persist% | evidence/signoff | n |
|---|---:|---:|---|---:|
| **Akuntansi (PSAK & SAK)** | **1.1** | **0%** | ev0 / so1 | 16 |
| Backoffice & Firm Mgmt | 1.1 | 22% | ev1 / so0 | 9 |
| Core Specifics | 1.9 | 10% | ev0 / so0 | 10 |
| SA · Pelaporan (700) | 2.0 | 0% | ev0 / so0 | 4 |
| SA · Bukti Audit (500) | 2.0 | 0% | ev0 / so2 | 5 |
| SA · Tanggung Jawab (200) | 2.0 | 0% | ev0 / so0 | 2 |
| SA · Area Khusus & Perikatan | 2.3 | 25% | ev0 / so0 | 8 |
| Core Execution | 2.3 | 33% | ev0 / so0 | 3 |
| Mutu, Risiko & Regulasi | 2.3 | 33% | ev0 / so0 | 3 |
| Core Planning | 2.5 | 50% | ev0 / so0 | 2 |
| Firm Practice Management | 2.2 | 20% | ev0 / so0 | 5 |
| Firm Finance (ERP) | 3.0 | 100% | ev0 / so0 | 2 |
| Jasa Non-Audit (SPAP) | 3.0 | 100% | ev0 / so0 | 3 |
| **Finalisasi & Pelaporan** | **4.0** | 100% | ev0 / so2 | 2 |
| **Portal & Dokumen** | **4.0** | 100% | ev2 / so1 | 2 |

**Pembacaan:** justru area **substansi audit** — PSAK accounting & standar SA inti — paling
dangkal (tier 1–2, persist 0–33%, evidence ~nol). Area yang sudah "matang" (tier 4) adalah
portal/dokumen/finalisasi — yang memang bermuara pada output. Artinya: **mesinnya benar,
kertas kerjanya belum.**

---

## 4. Register gap berprioritas

Diurut berdasar *leverage* (dampak × kesiapan fondasi). Semua butuh **PRD lebih dulu**
sebelum dibangun.

### P1 — Persistensi kertas kerja akuntansi (PSAK suite)
- **Gap:** 16–19 modul PSAK (16/19/22/46/48/57/58/65/71/73/…) = compute-display; **0% persist,
  evidence ~nol**. Angka ditarik benar dari `AMS_CANON`, tapi catatan/penyesuaian/kesimpulan
  auditor tak tersimpan.
- **Kenapa #1:** ini inti substansi audit; fondasi angka (canon) sudah matang → tinggal
  menambah lapisan *state + kesimpulan*. Leverage tertinggi.
- **Bentuk:** per modul — kesimpulan auditor, catatan, status WP (persist via `useAmsPersist`),
  tombol "tandai selesai/ditelaah".
- **Dependensi:** memuncak bila ada **W6 (backend/data)** — tanpa itu, persist hanya `localStorage`.

### P2 — Kelengkapan kertas kerja: evidence + sign-off di seluruh WP
- **Gap:** evidence dock hanya di **3** view, sign-off di **16**. Mekanismenya **sudah ada**
  (`amsAttachEvidence`, `deriveWpStatus`, `openCanonicalWp`) tapi belum disebar.
- **Bentuk:** komponen WP standar (preparer/reviewer + tanggal + status + lampiran + cross-ref)
  yang dipasang lintas modul. Sebagian besar pekerjaan = *menyebarkan pola yang sudah ada*.
- **Acuan pola:** lihat §5.

### P3 — Backbone persistensi (78 modul ephemeral)
- **Gap:** 78 view punya input tanpa persist → input hilang saat reload.
- **Catatan:** ini gejala dari **tidak adanya lapisan data nyata (W6)**. Memperbaiki satu-satu
  via `localStorage` menambal; solusi sebenarnya = lapisan data (Fase B). **Selesaikan arah
  arsitektur dulu** sebelum menambal massal.

### P4 — Kedalaman AI / Tax Audit Diagnostic
- **Gap:** AI hanya **2** sentuhan; copilot/ai_insights/ai_extract ada tapi sebagai overlay
  global. Side-project "AI-Tax Audit Diagnostic" Anda **belum jadi fitur**.
- **Bentuk:** diagnostic terembed per area (deteksi anomali atas WTB/AJE, red-flag SA 240,
  saran prosedur), bukan chat umum. Bisa berdiri di atas `forensic_canon` yang sudah ada.

### P5 — Benang alur engagement (lifecycle)
- **Gap:** `tasks` & `reviewnotes` nyaris terisolasi; planning→risk→execution→completion→archive
  belum menjadi engagement berstate yang menyambung.
- **Bentuk:** status engagement terpusat, review-note yang mengalir antar-modul, gerbang
  fase (mis. tak bisa "selesai" sebelum WP kunci ditandatangani).

---

## 5. Pola acuan (template dari modul Tier-4)

Enam modul sudah memenuhi pola "auditable" — gunakan sebagai cetakan saat mendalamkan yang lain:

`clientportal` · `dms` · `fsgen` · `isak35` · `opinion` · `settings`

(khususnya **Portal & Dokumen** dan **Finalisasi & Pelaporan** = tier 4.0 — sudah persist +
evidence/sign-off).

---

## 6. Target pendalaman konkret (kandidat pertama)

Modul **canon-heavy + ada input + TANPA persist/evidence** — "angka benar, tapi tak tersimpan &
tak auditable". Kandidat batch pertama (diurut ukuran/kompleksitas):

`sa230` (966L) · `psak71` (887L) · `spr2410` (598L) · `sad` (523L) · `psak25` (513L) ·
`sa501` (432L) · `calc` (384L) · `segmen` (227L) · `lease` (215L) · `assoc` (212L)

Ini memberi efek paling terasa: modul besar, sentral, dipakai lintas-area.

---

## 7. Rekomendasi urutan

1. **Tetapkan arah lapisan data (W6) lebih dulu** — karena P1/P3 bergantung padanya. Bila belum
   siap backend, putuskan apakah `localStorage` cukup untuk fase ini (eksplisit, bukan default).
2. **P2 (evidence + sign-off)** bisa jalan lebih awal & murah — polanya sudah ada, tinggal disebar;
   tidak menunggu backend.
3. **P1 (persist + kesimpulan PSAK)** menyusul P2/W6.
4. **P4 (AI diagnostic)** sebagai diferensiator — setelah fondasi WP auditable berdiri.
5. **P5 (alur)** mengikat semuanya di akhir.

> **Aturan kerja:** setiap item di atas = **PRD dulu** (Problem · Objective · Success Criteria ·
> Scope · Non-Scope · Risks · Plan) sebelum implementasi. Dokumen ini *menilai*, belum *membangun*.

---

## 8. Keputusan yang menunggu Anda

- Lapisan data: **backend nyata (W6)** vs **`localStorage` dulu**? (mengunci P1/P3)
- Mulai dari **P2 (cepat, murah, polanya ada)** atau langsung tetapkan arah W6?
- Apakah **AI Tax Audit Diagnostic (P4)** ingin dinaikkan prioritasnya sebagai diferensiator pasar?
