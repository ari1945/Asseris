# PRD — WTB · PR-1 SSOT Materialitas & PR-2 Integritas Ingress

> Wajib diisi sebelum implementasi apa pun. Implementasi TIDAK dimulai sebelum sign-off ("Proceed.").

| Field | Isi |
|---|---|
| Tanggal | 2026-07-25 |
| Pemilik | Ari Widodo |
| Status | Draft |
| Engagement ID terkait | ENG-2025-014 (perikatan demo/seed) |
| Asal | Evaluasi modul WTB 2026-07-25 (temuan 1, 4, 6, 8 + cacat kecil) |

---

## 1. Problem

### 1.1 Materialitas bukan sumber kebenaran tunggal — dan rantainya putus di dua tempat

**P1 · Hardcode di view.** `view_execution.tsx:48` dan `view_analytical.tsx:133` menghitung
`pm = activeEngagement.materiality * 0.75`, mengabaikan `AMS_CANON.materiality()` yang komentarnya
sendiri (`canon_part4.ts:307-313`) menyatakan modul hilir harus memanggilnya *"alih-alih meng-hardcode
75%/5%"*. Dampak paling tajam: teks header **XLSX tersegel** (`view_execution.tsx:67`) mencantumkan PM
yang bisa bertentangan dengan kertas kerja materialitas di perikatan yang sama.

**P2 · Canon membaca kunci yang tak pernah ditulis siapa pun.** `materiality()` membaca
`localStorage['ams.v1.' + k]` (`canon_part4.ts:316`), sementara Materiality Workspace menulis melalui
`useAmsPersist` → `useServerState` yang meng-cache ke `localStorage['ams.v1.<scope>.<scopeId>.<key>']`
(`contexts.tsx:257`) dan ke StateDoc server. Kunci tak-berlingkup `ams.v1.mat.*` hanya dibaca sebagai
*fallback pra-W6* dan **tidak pernah ditulis oleh kode aplikasi mana pun** — satu-satunya penulisnya
adalah `canon_part4.test.ts:18,31`.

Konsekuensinya: `materialityFor()` selalu mengembalikan default (`benchId 'pbt'`, `pct 5`, `pmPct 75`,
`override null`), sehingga `pmFull = engMateriality × 75%`. **Itu persis sama dengan hardcode P1.**
Karena itulah cacat ini tak terlihat: hari ini semua permukaan sepakat — bukan karena SSOT bekerja,
melainkan karena SSOT-nya mati dan kebetulan bernilai sama. Begitu auditor mengubah `pmPct` ke 60%
atau menekan "Terapkan ke Engagement", Workspace menampilkan angka baru sementara WTB, SA 530, SAD,
PSAK 14, dan SPR 2410 **semuanya tetap 75%**.

> Koreksi atas evaluasi 2026-07-25: PR-1 di sana dirumuskan sebagai "ganti hardcode dengan
> `materialityFor()`". Itu tidak cukup — perubahan itu bersifat netral-perilaku karena canon-nya
> sendiri terputus. Perbaikan nyata harus menyentuh P2. Temuan P1 tetap sahih.

**P3 · Setelan materialitas gagal disimpan senyap untuk Manajer.** `mat.benchId/pct/pmPct/cttPct/
appliedOverride` tak terdaftar di `AMS_PERSIST_SCOPE` dan tak cocok `PR4_ENGAGEMENT_KEY_RE` → berlingkup
`'firm'` → `capForWrite('firm', key)` jatuh ke cabang default **`FIRM_ADMIN`** (`rbac.ts`). Hanya Rekan
Pemimpin yang bisa menyimpan; Manajer/Senior melihat nilainya berubah di layar (cache lokal) lalu
kembali ke nilai lama setelah reload. Ini kelas bug yang sama yang sudah dua kali diperbaiki eksplisit
di `capForWrite` (`priorYear`, `capacityPlan.v1`).

**P4 · Lingkup salah secara konseptual.** Materialitas adalah pertimbangan **per-perikatan** (SA 320
¶10-11), tetapi disimpan firm-wide — satu setelan dipakai seluruh perikatan, dan `appliedOverride`
yang berlabel "Terapkan ke Engagement" justru berlaku lintas-perikatan.

### 1.2 Ingress TB menerima data yang salah tanpa perlawanan

**P5 · Satuan tak dideklarasikan.** `parseTrialBalance` tak punya konsep satuan. TB *"dalam ribuan
Rupiah"* — praktik lazim di Indonesia — terimpor bersih dengan `control total seimbang ✓`, karena uji
keseimbangan **invarian terhadap skala**. Seluruh angka understated 1.000×; materialitas, bendera PM,
figur PSAK, dan LK ikut salah tanpa satu peringatan pun.

**P6 · Provenance tipis & penggantian senyap.** `setWtbImport({rows, meta, coverage, importedAt,
source})` (`view_execution.tsx:507`) tidak menyimpan siapa yang mengimpor, nama/hash berkas sumber,
teks mentah, periode TB, atau stempel klien — tak ada yang mencegah TB klien lain ter-paste. Impor
kedua **mengganti seluruh TB tanpa diff dan tanpa konfirmasi**, padahal setiap angka hilir bergerak.

**P7 · Kunci arsip tak dihormati.** `WTBView` tak pernah membaca `locked` (`contexts.tsx:501`),
sementara `AJEViewLegacy` di berkas yang sama melakukannya (`view_execution.tsx:886`). Server baru
memblok setelah 60 hari (`router.ts:124`). Di dalam jendela perakitan, TB perikatan terarsip bisa
diimpor ulang tanpa banner dan tanpa tombol nonaktif; setelahnya gagal dengan `FORBIDDEN` mentah.

---

## 2. Objective

1. Satu perubahan materialitas di Materiality Workspace mengalir **serempak** ke seluruh modul yang
   mengonsumsinya — termasuk artefak tersegel — dan dapat disimpan oleh peran yang memang berwenang.
2. Neraca saldo yang masuk ke sistem membawa **jejak asal yang dapat diaudit** dan tidak dapat salah
   skala, tergantikan, atau berubah setelah arsip tanpa jejak dan konfirmasi.

Alasan ini objective yang benar: keduanya menyentuh kebenaran artefak yang keluar dari sistem
(register XLSX bersegel Ed25519, figur PSAK, LK) — bukan kenyamanan UI. Cacat pada keduanya tidak
terdeteksi oleh pengguna sampai terlambat.

---

## 3. Success Criteria

| # | Kriteria | Cara ukur |
|---|---|---|
| S1 | `grep -rn "materiality \* 0\.75" migration/src` → **0 hasil** | grep |
| S2 | Ubah `pmPct` 75→60 di Workspace → PM berubah serempak di WTB (KPI "Akun > PM", bendera per baris, ambang default fluktuasi, header XLSX), SA 530, SAD, PSAK 14, SPR 2410 | uji live 2 peran + test unit |
| S3 | Peran Manajer dapat menyimpan setelan materialitas dan nilainya bertahan setelah reload | uji live sebagai Manajer |
| S4 | TB seed dibagi 1.000 (simulasi "dalam ribuan") **tidak** lolos impor diam-diam | test unit + uji live |
| S5 | Impor kedua menampilkan pratinjau dampak (akun berubah, Δ total aset, Δ laba, engine PSAK yang padam) dan butuh konfirmasi eksplisit | uji live |
| S6 | Perikatan berfase Arsip: tombol Impor TB / Petakan Akun / Impor GL nonaktif + LockBanner tampil | uji live |
| S7 | Payload `wtbImport` memuat `user`, `importedAt`, `sha256` isi mentah, `unit`, `period`, dan riwayat ≤5 impor terakhir yang tampil di modul | inspeksi StateDoc + uji live |
| S8 | Footer tabel TB menyatakan invarian yang benar dan totalnya konsisten dengan baris yang tampil saat filter aktif | uji live |
| S9 | Gate hijau: `npm run typecheck` 0 error · `npm run lint` · `npm test` (termasuk snapshot `canon_regression.test.ts`) | CI |

---

## 4. Scope

**PR-1a · Menyambung kembali rantai materialitas**
- `materiality()` membaca konfigurasi dari lokasi yang benar-benar ditulis aplikasi, dengan rantai
  fallback **baca-lewat**: kunci berlingkup → kunci firm → kunci legacy `ams.v1.mat.*` → default.
  Fallback legacy dipertahankan agar `canon_part4.test.ts` tetap sahih tanpa perubahan.
- Menerima `opts.engagementId` (opsional) sehingga canon bisa membaca setelan per-perikatan.
- Daftarkan `mat.*` secara eksplisit di `AMS_PERSIST_SCOPE` dan tambahkan cabang eksplisit di
  `capForWrite` (menutup P3), sejajar preseden `priorYear` / `capacityPlan.v1`.
- Uji: perubahan `pmPct`/override tercermin di `materiality()`; fallback berjenjang; tanpa konfigurasi
  → perilaku lama (75%) tak berubah.

**PR-1b · WTB & Analytical memakai kanon**
- Ganti kedua hardcode dengan `materialityFor({ engMateriality, engagementId })`, dengan penanganan
  `null` yang eksplisit (materialitas belum ditetapkan → jangan diam-diam 0).
- Footer tabel: ganti `TOTAL (harus = 0, balanced)` menjadi pernyataan yang benar untuk TB pra-tutup,
  dan tampilkan total baris-terlihat vs total keseluruhan saat filter pencarian aktif.
- Buang `window.computeWtbSummary?.()` (`view_execution.tsx:80`) → impor ESM langsung.

**PR-2a · Gerbang skala**
- Selektor **Satuan** pada drawer impor: Rupiah penuh (default) · ribuan · jutaan; faktor dikalikan
  saat parse dan disimpan di `meta.unit`.
- Uji kewajaran magnitudo terhadap kolom TA Lalu (bila ada) dan materialitas perikatan: peringatan
  pada penyimpangan ≥10×, blokir pada ≥100×, dengan pesan yang menyebut satuan sebagai penyebab
  paling mungkin.

**PR-2b · Provenance & impor ulang**
- Payload impor menyimpan: `user` (id + nama + peran dari `auth.user`), `importedAt`, `sha256` teks
  mentah (`crypto.subtle`, pola `export_xlsx.ts:28`), `unit`, `period`, `sourceName`, dan cuplikan
  teks mentah terbatas untuk penelusuran.
- `history[]` ≤5 entri header impor sebelumnya di dalam payload yang sama (menghindari endpoint server
  baru), ditampilkan sebagai panel "Riwayat Impor" di modul.
- Impor saat sudah ada TB → **pratinjau dampak** (jumlah akun ditambah/dihapus/berubah, Δ total aset,
  Δ laba, engine PSAK yang padam) + konfirmasi eksplisit sebelum penggantian.

**PR-2c · Menghormati kunci arsip**
- `WTBView` membaca `locked`; LockBanner + nonaktifkan Impor TB / Petakan Akun / Impor GL, selaras
  dengan `view_aje`.

---

## 5. Non-Scope

- Penyatuan tiga permukaan SA 520 dan pembongkaran `DEFAULT_EXPL` / `FLUX_SEED` → **PR-3**.
- `lead` untuk baris terimpor, pendaftaran `wtb` ke `WP_MODULE_MAP`, ikatan SA 510 pada kolom TA Lalu,
  deep-link `sa530` ber-konteks akun, aturan integritas "laba berjalan ganda" → **PR-4**.
- Unggah berkas ke server (tetap paste/CSV; F0.1 attachment di luar cakupan).
- Mengubah **nilai** default materialitas (5% / 75% / 5%) atau tabel benchmark — hanya jalur bacanya
  yang diperbaiki, bukan angkanya.
- Perbaikan presedens `DEFAULT_EXPL` di drill (`view_execution.tsx:739`) — masuk PR-3 bersama
  pembongkaran seed, agar tidak dua kali menyentuh berkas yang sama.

---

## 6. Constraints

- **Waktu:** dua PR terpisah, dapat di-merge independen; PR-1a→1b berurutan, PR-2a/b/c dapat paralel.
- **Sistem:** ESM-only, `migration/src` sebagai sumber kebenaran; `strict: true` penuh; ratchet ESLint
  `no-explicit-any` — `:any` baru meng-un-suppress **seluruh** berkas, jadi tipe harus ditulis penuh.
- **Regulasi/metodologi:** SA 320 (materialitas per perikatan), SA 230 ¶A21 (assembly lock), SA 500
  (keandalan sumber bukti).
- **Kompatibilitas:** perubahan tak boleh menggeser angka bagi pengguna yang belum pernah menyentuh
  Materiality Workspace — nilai default harus tetap menghasilkan `engMateriality × 75%`.

---

## 7. Existing Solutions

- `AMS_CANON.materiality()` **sudah ada** dan sudah dirancang sebagai SSOT — tidak perlu mesin baru,
  hanya perlu disambungkan ke penyimpanan yang benar. Custom work minimal.
- `capForWrite` sudah punya pola cabang eksplisit per-kunci — cukup ikuti preseden, jangan buat
  mekanisme izin baru.
- `checkWtbIntegrity` sudah menangani rekonsiliasi; gerbang skala adalah lapisan **ingress**, tidak
  tumpang-tindih dengannya.
- `export_xlsx.ts:28` sudah punya `sha256Hex` — pakai ulang, jangan tulis helper hash baru.
- StateDocHistory sudah memversikan di server, tetapi tak ada endpoint baca untuk klien; membangun
  endpoint baru tidak sebanding untuk kebutuhan ini → riwayat disimpan di dalam payload.

---

## 8. Proposed Approach

**Materialitas — pindahkan ke lingkup perikatan sekaligus (rekomendasi).**
Alternatif yang lebih kecil adalah membiarkan `mat.*` berlingkup firma dan hanya membetulkan kunci
baca canon. Saya tidak merekomendasikannya: itu memperbaiki P1-P3 tetapi mengukuhkan P4 — satu
setelan materialitas untuk semua klien, yang salah menurut SA 320 dan akan menuntut migrasi kedua
begitu ada perikatan kedua yang nyata. Karena `materiality()` sudah menerima `opts`, menambah
`engagementId` hanya menyentuh 6 pemanggil, dan **baca-lewat** (perikatan → firma → legacy) membuat
setelan lama tetap terbaca tanpa satu pun tulisan destruktif. Sebagai efek samping, `mat.*` jatuh ke
default lingkup perikatan di `capForWrite` = `WP_EDIT`, menutup P3 tanpa cabang khusus — dan bila
"Terapkan ke Engagement" perlu otoritas Rekan, pola yang sudah terbukti adalah `guardSignoffWrite`
seperti `strategyApproved.v1`, bukan mengunci seluruh setelan ke `FIRM_ADMIN`.

**Skala — deklarasi eksplisit, bukan deteksi otomatis.**
Menebak satuan dari magnitudo tidak dapat diandalkan (klien kecil yang sah bisa terlihat seperti TB
ribuan). Karena itu satuan **dideklarasikan** pengguna, dan uji magnitudo hanya berperan sebagai
jaring pengaman kedua yang memberi peringatan, dengan blokir keras hanya pada penyimpangan ekstrem
(≥100×) di mana pembanding (TA Lalu / materialitas) tersedia.

**Impor ulang — diff, bukan larangan.**
Impor ulang adalah kebutuhan sah (TB revisi dari klien). Yang tidak sah adalah penggantian tanpa
kesadaran. Karena itu jalurnya tetap terbuka tetapi harus melewati pratinjau dampak — pola yang sama
dengan gerbang fase dan konfirmasi ireversibel di modul lain.

---

## 9. Risks

| Risiko | Mitigasi |
|---|---|
| Menyentuh `materiality()` = menyentuh `AMS_CANON` → snapshot regresi meleset | Perbarui `canon_regression.test.ts`; jalankan `npm test`, bukan hanya typecheck/lint/build |
| Setelan materialitas lama tampak "hilang" setelah pindah lingkup | Baca-lewat berjenjang perikatan→firma→legacy; tanpa tulisan destruktif; verifikasi dengan data lama |
| Perubahan diam-diam menggeser angka bagi pengguna yang belum pernah menyetel | Test eksplisit: tanpa konfigurasi → `pm === engMateriality × 0,75` (nilai identik dengan hari ini) |
| Ratchet `no-explicit-any` gigit berkas besar | Ketik penuh; jangan tambahkan `:any` baru di `view_execution.tsx` / `canon_part4.ts` |
| Verifikasi live palsu (Vite dev menyajikan stylesheet/modul basi) | Hard-reload + uji-silang build produksi sebelum menyatakan lolos |
| Ambang skala menghasilkan false positive pada klien kecil | Peringatan (bukan blokir) di ≥10×; blokir hanya ≥100× dan hanya bila pembanding tersedia |
| `pmFull` bisa `null` (materialitas belum ditetapkan) → NaN mengalir ke UI | Tangani eksplisit: tampilkan "PM belum ditetapkan" + nonaktifkan bendera PM, jangan fallback ke 0 |

---

## 10. Implementation Plan

| Fase | Isi | Gate |
|---|---|---|
| **PR-1a** | Reader berlingkup + `opts.engagementId` + `AMS_PERSIST_SCOPE` + `capForWrite`; test canon | typecheck · lint · test (termasuk snapshot canon) |
| **PR-1b** | WTB & Analytical → `materialityFor`; footer TOTAL; total ikut filter; buang `window.computeWtbSummary` | + uji live 2 peran (Rekan & Manajer), ubah `pmPct` → amati serempak |
| **PR-2a** | Selektor satuan + uji magnitudo + test | typecheck · lint · test |
| **PR-2b** | Provenance (user/hash/periode/satuan) + riwayat + pratinjau diff & konfirmasi | + uji live impor ulang |
| **PR-2c** | Hormati `locked` (banner + tombol nonaktif) | + uji live pada perikatan berfase Arsip |

Setiap fase = satu branch dari `master` (bukan bertumpuk — branch yang akan dihapus menyebabkan PR
turunan auto-close), satu PR, di-merge sebelum fase berikutnya bila menyentuh berkas yang sama.

---

## 11. Open Questions

1. **Lingkup materialitas: pindah ke perikatan (rekomendasi saya) atau tetap firma?** Ini keputusan
   terbesar di PRD ini — menentukan apakah PR-1a menyentuh `capForWrite` atau tidak, dan apakah ada
   migrasi baca-lewat.
2. **Apakah "Terapkan ke Engagement" perlu gerbang otoritas Rekan** (`guardSignoffWrite`, pola
   `strategyApproved.v1`), atau cukup `WP_EDIT` seperti input kertas kerja lain?
3. **Ambang skala:** peringatan ≥10× dan blokir ≥100× — angka ini usulan saya, bukan turunan standar.
   Perlu penetapan Anda.
4. **Periode TB:** diisi manual di drawer impor, atau diturunkan otomatis dari FY perikatan dan hanya
   dapat diubah bila berbeda?

---
**Sign-off:** ditandai dengan balasan **"Proceed."**
