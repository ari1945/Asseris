# PRD — WTB · PR-3 Konsolidasi SA 520 & PR-4 Sambungan Spine Audit

> Wajib diisi sebelum implementasi apa pun. Implementasi TIDAK dimulai sebelum sign-off ("Proceed.").

| Field | Isi |
|---|---|
| Tanggal | 2026-07-25 |
| Pemilik | Ari Widodo |
| Status | Draft |
| Engagement ID terkait | ENG-2025-014 |
| Prasyarat | PR-1 (#129) & PR-2 (#130) — MERGED, `master` = `33fb3de` |
| Asal | Evaluasi modul WTB 2026-07-25, temuan 2, 3, 5, 9, 10 + cacat kecil |

---

## 1. Problem

### 1.1 Tiga permukaan SA 520, tak satu pun utuh

| Permukaan | Data | Persist | Sign-off |
|---|---|---|---|
| Tab "Analisis Pergerakan" (WTB) | fluktuasi per-akun **nyata** dari WTB | `wtbOverrides` (engagement) | tidak ada |
| Modul `analytical` | fluktuasi per-akun **nyata** dari WTB | `fluxState.v1` (engagement) | tidak ada |
| Modul `sa520` | **hardcode `SAP_ROWS`** — 6 baris literal | **tidak ada** | ADA (`WP_MODULE_MAP.sa520`) |

Permukaan yang punya data nyata tak punya sign-off; permukaan yang punya sign-off tak punya
data. `view_sa520.tsx` seluruhnya seed literal — ekspektasi, aktual, ambang, dan catatan
investigasi semuanya konstanta, tak satu pun tersimpan.

**Seed yang saling bertentangan.** Untuk akun **4-1100 Penjualan** yang sama:
`DEFAULT_EXPL` (`view_wtb_deep.tsx:39`) menyebut *"volume 11% + harga jual rata-rata 5%"*,
`FLUX_SEED` (`view_analytical.tsx:20`) menyebut *"16,7% ... harga jual rata-rata 6%"*.
Dua penjelasan auditor yang kontradiktif atas satu akun dalam satu perikatan. Ambangnya pun
berbeda (20% vs 15%), sehingga himpunan akun ter-flag dan hitungan "explained" berbeda.

### 1.2 Dokumentasi terisi otomatis lalu ditandai selesai

`computeWtbSummary` (`view_wtb_deep.tsx:65-66`):
```
const noteText = r.note || DEFAULT_EXPL[r.code] || '';
const status   = r.revStatus || (noteText ? 'explained' : 'followup');
```
Pada perikatan baru, akun ter-flag langsung berstatus **"Dijelaskan"** dengan narasi yang
menyebut angka spesifik dan referensi WP (*"DSO 54→56 hari… konfirmasi piutang dijalankan
(WP B)"*) yang tak pernah dikerjakan siapa pun. Catatan tersimpan **tanpa penulis dan tanpa
cap waktu**. SA 520 ¶7 menempatkan investigasi fluktuasi sebagai kewajiban auditor;
dokumentasinya adalah asersi auditor. Mengisi asersi itu lebih dulu dan menandainya selesai
memproduksi bukti audit fiktif.

Cacat turunan: di drill akun, `expl = DEFAULT_EXPL[code] || row.note`
(`view_execution.tsx:739`) — urutannya **terbalik** dari `computeWtbSummary`, sehingga
setelah auditor menulis penjelasan sendiri, drill tetap menampilkan teks kaleng.

### 1.3 Dokumentasi fluktuasi ter-gate terlalu ketat

`wtbOverrides` → `capForWrite` = **`AJE_EDIT`** (`rbac.ts:179`), yang dipegang Partner,
Manager, Senior — **bukan Junior Auditor**. Padahal `AJE_EDIT` dimaksudkan untuk *"changing
the numbers"*, sementara catatan telaah fluktuasi adalah dokumentasi kertas kerja biasa
(`WP_EDIT`, dipegang semua auditor). Junior tak bisa mendokumentasikan telaahnya sendiri.

### 1.4 TB terimpor kehilangan tulang punggung lead schedule

`wtb_import.ts:275` menetapkan `lead: ''`. Lead hanya terisi bila baris melewati
`applyMapping` dan cocok ke salah satu **28** akun `STANDARD_COA`. Untuk TB klien nyata
(ratusan akun) akibatnya berantai: kolom WP kosong · `WtbAssertionStrip` mengembalikan
`null` sehingga **strip asersi SA 315 hilang total** · "Buka Lead Schedule" tanpa rujukan ·
kolom Lead Schedule di tab Pemetaan FS kosong.

### 1.5 WTB bukan kertas kerja dalam model sistemnya sendiri

`wtb` absen dari `WP_MODULE_MAP` → tak ada sign-off penyusun/penelaah, tak ada daftar bukti
wajib, tak muncul di rekap kelengkapan. Kertas kerja paling sentral di perikatan tidak
auditable.

### 1.6 Penelusuran saldo awal SA 510 adalah tautologi

`OBTrace` (`view_opening.tsx`) menyajikan kolom "Saldo Akhir TA-1 (Audited)" vs "Saldo Awal
TA Kini" lalu menyimpulkan **"Cocok"** — padahal **kedua kolom dibaca dari sumber yang sama**
(`priorClose = r.ly`, `opening = r.ly`), kecuali segelintir akun transisi PSAK 73 yang
di-hardcode. Selisihnya nol **secara konstruksi**. Kertas kerja ini tak membuktikan apa pun,
dan label "TA Lalu (audited)" di WTB (`view_execution.tsx:814`) sama tak berdasarnya: apa
pun yang di-paste klien menjadi basis seluruh analitis. Tidak ada satu pun sumber saldo
audited TA-1 yang independen di sistem.

### 1.7 Gerbang integritas menerima kombinasi yang mustahil

Seed: `Σ adj = −11,54 M` (= −laba) **dan** `bsDiff = 0`. Keduanya tak bisa benar bersamaan
pada TB koheren — artinya saldo laba **sudah** menyerap laba berjalan sementara akun L/R
masih terbuka (laba tercatat dua kali). `checkWtbIntegrity` menilai keduanya wajar secara
terpisah → status **OK**; FSGEN lalu menyerap residu 6,55 M ke baris plug "mutasi RE bukan
dari laba berjalan" (`fsgen_model.tsx:109`), sehingga tak pernah terlihat.

---

## 2. Objective

1. Satu sumber kebenaran untuk telaah fluktuasi SA 520, dengan dokumentasi yang **hanya**
   berisi asersi auditor yang sebenarnya — ber-penulis, ber-waktu, dan tak pernah
   dinyatakan selesai oleh sistem.
2. Neraca saldo tersambung ke tulang punggung audit: lead schedule, asersi, sign-off, dan
   saldo awal yang benar-benar diverifikasi terhadap sumber independen.

---

## 3. Success Criteria

| # | Kriteria | Cara ukur |
|---|---|---|
| S1 | Mendokumentasikan fluktuasi di tab WTB muncul identik di modul `analytical` dan di roll-up `sa520`; hitungan "explained" tunggal | uji live 3 permukaan |
| S2 | Perikatan tanpa dokumentasi apa pun menampilkan **0 akun "Dijelaskan"** (bukan 22/23 seperti sekarang) | uji live + unit test |
| S3 | Setiap catatan tersimpan membawa penulis + cap waktu; drill menampilkan catatan auditor, bukan teks seed | uji live |
| S4 | Junior Auditor dapat menyimpan catatan telaah fluktuasi (kini gagal senyap) | uji live sebagai Junior |
| S5 | `sa520` menampilkan data nyata dari WTB dan prosedur substantifnya tersimpan | uji live + reload |
| S6 | TB terimpor tanpa pemetaan tetap memperoleh `lead`; strip asersi SA 315 muncul | uji live impor |
| S7 | `wtb` muncul di rekap kelengkapan WP dengan sign-off & bukti wajib | uji live |
| S8 | `OBTrace` membandingkan terhadap sumber TA-1 independen; selisih ≠ 0 terdeteksi | unit test + uji live |
| S9 | TB dengan pola laba-ganda memicu peringatan integritas eksplisit | unit test |
| S10 | Gate hijau: typecheck 0 · lint 0 · seluruh test · build | CI |

---

## 4. Scope

**PR-3a · SSOT telaah fluktuasi**
- `fluxState.v1` (engagement, `WP_EDIT`) menjadi SSOT tunggal:
  `{ [kodeAkun]: { status, note, by, at } }`.
- Migrasi **baca-lewat** non-destruktif dari `wtbOverrides.{note,revStatus}` (pola
  `readPersisted` PR-1a). `wtbOverrides` menyisakan `aje` saja (tetap `AJE_EDIT` — itu
  memang mengubah angka).
- Tab WTB dan modul `analytical` membaca & menulis store yang sama; satu ambang bersama.

**PR-3b · Kejujuran dokumentasi**
- `DEFAULT_EXPL` & `FLUX_SEED` menjadi **saran berlabel** yang tak pernah menetapkan status;
  status default `followup` sampai auditor menekan tombol.
- Catatan disimpan dengan `by` (dari sesi) + `at`.
- Perbaiki presedens di drill: catatan auditor mengalahkan saran seed.

**PR-3c · `sa520` menjadi kertas kerja nyata**
- Roll-up fluktuasi dari SSOT (menggantikan angka literal).
- Prosedur analitis substantif (`SAP_ROWS`) menjadi state tersimpan `sa520.v1` yang dapat
  disunting; sign-off yang sudah terdaftar di `WP_MODULE_MAP` akhirnya punya isi.

**PR-4a · Lead schedule untuk TB terimpor**
- Turunkan `lead` heuristik dari kode/grup untuk baris tak terpetakan, dan jadikan kolom
  lead **dapat disunting** di drawer pemetaan.

**PR-4b · WTB sebagai kertas kerja auditable**
- Daftarkan `wtb` di `WP_MODULE_MAP` dengan bukti wajib: neraca saldo klien bertandatangan ·
  rekonsiliasi TB ke buku besar · tie ke LK audited TA-1.

**PR-4c · Sumber saldo TA-1 independen (SA 510)**
- Store baru `priorYearBalances.v1` (engagement, `WP_EDIT`): saldo audited TA-1 per akun,
  diimpor/diketik sekali, dengan provenance seperti PR-2b.
- `OBTrace` membandingkan TB berjalan terhadap store ini (bukan terhadap dirinya sendiri);
  selisih nyata terdeteksi.
- Kolom "TA Lalu" di WTB menampilkan status tie: cocok / selisih / belum ada sumber.

**PR-4d · Aturan integritas laba-ganda + tautan modul**
- `checkWtbIntegrity`: kombinasi `|bsDiff| ≤ tol` **dan** `|Σadj + laba| ≤ tol` → peringatan
  eksplisit "saldo laba tampaknya sudah memuat laba berjalan sementara akun L/R masih
  terbuka — risiko laba tercatat ganda".
- Drill: "Buka Lead Schedule" menyetel `ams.wpOpen`; "Sampling Akun Ini" mengirim konteks
  akun via deep-link `nav(id, { tab })`.

---

## 5. Non-Scope

- **Menggabungkan route** `analytical` / `sa520` / tab WTB menjadi satu modul. PR ini
  menyatukan **data**, bukan navigasi — penggabungan route adalah perubahan kebiasaan
  pengguna yang layak diputuskan terpisah (lihat §11 Q2).
- Memindahkan `mat.memo.signoff` ke engagement-scope (butuh `guardSignoffWrite`; PRD
  sebelumnya §11 Q2, masih terbuka).
- Memperbaiki data seed WTB yang mencatat laba ganda — PR-4d hanya membuat sistem
  **mendeteksi**-nya (lihat §11 Q3).
- Impor berkas ke server (tetap paste/CSV).
- `SAMPLE_TB` yang memicu peringatan skala 6,5× (utang kecil dari PR-2; lihat §11 Q4).

---

## 6. Constraints

- ESM-only; `strict: true`; ratchet ESLint `no-explicit-any` — `:any` baru meng-un-suppress
  seluruh berkas.
- `useStateX<T>()` type-arg dilarang → anotasi di LHS.
- Menambah `wtb` ke `WP_MODULE_MAP` **menggeser penyebut** rekap kelengkapan WP → persentase
  di cockpit akan turun. Itu benar secara metodologi, tapi harus dinyatakan, bukan
  mengejutkan.
- SA 520 ¶6-7 (prosedur analitis substantif & investigasi), SA 510 ¶6 (saldo awal),
  SA 315 (asersi), SA 230 (dokumentasi ber-penulis & ber-waktu).

---

## 7. Existing Solutions

- `fluxState.v1` **sudah ada**, sudah engagement-scoped, sudah `WP_EDIT` — dipakai sebagai
  SSOT, bukan membuat store baru.
- `WP_MODULE_MAP` + `wp_signoff` sudah menyediakan sign-off & bukti wajib — cukup daftarkan.
- Pola provenance & impor sudah dibangun di PR-2b (`wtb_provenance.ts`) — dipakai ulang
  untuk `priorYearBalances.v1`, jangan tulis ulang.
- `readPersisted` (PR-1a) sudah menyediakan pola migrasi baca-lewat — dipakai untuk
  `wtbOverrides` → `fluxState.v1`.
- `useInitialTab` / `nav({tab})` sudah ada untuk deep-link berkonteks.

---

## 8. Proposed Approach

**Satukan data lebih dulu, navigasi belakangan.** Tiga permukaan yang membaca satu store
langsung menghapus kontradiksi tanpa mengusik kebiasaan pengguna. Menggabungkan route pada
saat yang sama akan mencampur dua jenis risiko (kebenaran data vs perubahan navigasi) dalam
satu PR yang sulit ditinjau.

**Seed jadi saran, bukan jawaban.** Menghapus `DEFAULT_EXPL`/`FLUX_SEED` sepenuhnya akan
membuat demo tampak kosong dan menghilangkan nilai jualnya. Menjadikannya *saran berlabel
yang tak pernah menetapkan status* mempertahankan demo sekaligus menutup lubang bukti
fiktif: sistem boleh menyarankan, hanya auditor yang boleh menyatakan.

**SA 510 butuh sumber, bukan tampilan yang lebih baik.** Selama tak ada saldo audited TA-1
yang independen, `OBTrace` hanya bisa membandingkan angka dengan dirinya sendiri. Karena itu
PR-4c memperkenalkan store-nya — memakai ulang mesin impor & provenance PR-2 sehingga
biayanya kecil.

---

## 9. Risks

| Risiko | Mitigasi |
|---|---|
| Migrasi `wtbOverrides` → `fluxState.v1` menghilangkan catatan lama | Baca-lewat non-destruktif; `wtbOverrides` tak dihapus; uji dengan data lama |
| Rekap kelengkapan WP turun setelah `wtb` didaftarkan → terlihat seperti regresi | Nyatakan di badan PR + tunjukkan angka sebelum/sesudah |
| `sa520.v1` menggantikan `SAP_ROWS` → demo kehilangan isi | Seed dipakai sebagai **nilai awal** state, bukan konstanta render |
| Heuristik `lead` salah menebak | Selalu dapat disunting; tebakan ditandai sebagai tebakan |
| Aturan integritas baru menyalakan peringatan pada seed demo yang memang laba-ganda | Itu perilaku yang benar; jelaskan di PR (dan lihat §11 Q3) |
| Menyentuh `wtb_integrity` → snapshot/uji lama | `npm test` penuh; perbarui fixture yang mengunci pola lama (`wtb_integrity.test.ts:72`) |

---

## 10. Implementation Plan

| Fase | Isi | Gate |
|---|---|---|
| **PR-3a** | SSOT `fluxState.v1` + migrasi baca-lewat + tab WTB & `analytical` menulis ke sana | typecheck · lint · test |
| **PR-3b** | Seed jadi saran; status tak pernah otomatis; `by`/`at`; presedens drill | + uji live 3 permukaan & peran Junior |
| **PR-3c** | `sa520` roll-up nyata + `sa520.v1` tersimpan | + uji live reload |
| **PR-4a** | Lead heuristik + kolom lead dapat disunting | + uji live impor |
| **PR-4b** | `wtb` → `WP_MODULE_MAP` | + uji live rekap |
| **PR-4c** | `priorYearBalances.v1` + `OBTrace` nyata + status tie di WTB | + unit test selisih |
| **PR-4d** | Aturan laba-ganda + deep-link berkonteks | + unit test |

PR-3 dan PR-4 = dua PR terpisah dari `master`. **Tidak bertumpuk** bila memungkinkan; bila
keduanya menyentuh `view_wtb_deep.tsx`/`view_execution.tsx`, PR-3 di-merge lebih dulu dan
PR-4 di-rebase (resep squash-stack dari sesi sebelumnya berlaku).

---

## 11. Open Questions

1. **`DEFAULT_EXPL` / `FLUX_SEED`: jadikan saran berlabel (rekomendasi saya) atau cabut
   sepenuhnya?** Menentukan bentuk PR-3b.
2. **Route: pertahankan tiga (rekomendasi saya, satukan data saja) atau lebur `analytical`
   ke `sa520` sekarang?**
3. **Data seed WTB yang laba-ganda: perbaiki agar koheren, atau biarkan justru untuk
   mendemonstrasikan deteksi baru PR-4d?** Bila dibiarkan, demo akan selalu menampilkan
   peringatan integritas.
4. **Utang kecil PR-2:** naikkan angka `SAMPLE_TB` agar tak memicu peringatan skala 6,5×
   (rekomendasi saya) — ikut dikerjakan di sini atau dibiarkan?

---
**Sign-off:** ditandai dengan balasan **"Proceed."**
