# PRD — WTB PR-6: Otoritas Sign-off Materialitas, SSOT Cache-Dingin & Tipe Konteks

**Tanggal:** 2026-07-26 · **Status:** MENUNGGU SIGN-OFF ("Proceed.")
**Basis:** `master` = `484c8a1` (PR-3/4/5 merged, pohon bersih, 0 PR fitur terbuka)
**Pendahulu:** `PRD - WTB PR-3 Konsolidasi SA 520 & PR-4 Sambungan Spine Audit.md` ·
memori `asseris-wtb-pr3-pr4-sa520-spine`, `asseris-wtb-eval-pr1-pr2`,
`asseris-authoritative-persist-key-recipe`, `asseris-opinion-signoff-sod-defect`

---

## 1 · Problem

Cacat tersisa dari arc WTB, semuanya di sekitar **SA 320 Materialitas** — angka
yang menjadi tulang belakang penentuan ukuran sampel, ambang SAD, dan agregasi
salah saji.

> **Diperbarui 2026-07-26 pasca-verifikasi live** (login Rekan Pemimpin, dev :5180,
> ENG-2025-040). Dua temuan baru: **P-0 di bawah — dua nilai PM berbeda pada satu
> perikatan, TERBUKTI di layar** (bukan lagi hipotesis), dan **P-2 lebih luas dari
> dugaan awal**: rantai baca-lewat #129 hanya ada di lapisan cache, bukan di server,
> sehingga konfigurasi tersimpan pra-#129 (lingkup firma) menjadi **yatim** dan modul
> Materialitas jatuh ke default tanpa jejak. Urutan PR di §9 disusun ulang: P-0 lebih dulu.

### P-0 · Dua nilai PM pada satu perikatan (TERBUKTI LIVE — paling berat)

Diukur pada ENG-2025-040 (`master` `484c8a1`, dev server, login Rekan Pemimpin):

| Permukaan | Nilai yang dinyatakan | Sumber di kode |
|---|---|---|
| Modul **Materialitas**, KPI "PERFORMANCE · 75%" | **PM Rp 3.195 jt** (OM Rp 4.260 jt) | UI menghitung OM dari benchmark (`calcOM`) |
| Header **WTB** | **PM Rp 5.100 jt** | `materialityFor({engMateriality}).pmFull` |
| **SA 530**, "PM kanon (SA 320)" | **PM Rp 5.100 jt** → TM | `materialityFor({engMateriality}).pm` |

Akar: presedens `omFull = override ?? engMateriality ?? calcOM` (`canon_part4.ts:338`).
Konsumen mengirim `engMateriality = 6,8 M` (dari `AMS.ENGAGEMENTS`) → OM 6,8 M, PM 5,1 M.
Modul Materialitas menampilkan OM = hasil hitung benchmark (PBT 85,2 M × 5% = 4,26 M)
sebagai headline dan menaruh 6,8 M sebagai stat terpisah berlabel "TERTERAPKAN".
**Dua definisi berbeda tentang "OM yang berlaku", keduanya mengklaim otoritas SA 320.**

Konsekuensi audit langsung, terukur di layar: kalkulator MUS SA 530 memakai TM = PM.
Dengan PM 5.100 → **n = 232 item**. Dengan PM 3.195 → n = (245.000 × 3) ÷ (3.195 − 1.920)
≈ **577 item**. **Faktor 2,5× pada ukuran sampel** — yaitu pada luas prosedur audit.

Mengapa lolos semua gerbang: oracle uji yang dipaku di `W0-BASELINE.md` (OM 4260 /
PM 3195 / CTT 213) menguji jalur **zero-arg** `materiality()` — jalur yang **tidak**
dipakai satu pun view. Uji hijau, aplikasi bertentangan dengan dirinya sendiri. Ini
pola yang sama seperti T4 di PR-3 (`analytical` 23 vs 12), satu tingkat lebih dalam.

**Keputusan yang dibutuhkan sebelum implementasi: mana yang berlaku (§10 Q5).**
Ini pertimbangan profesional SA 320 ¶10-11, bukan pilihan teknis — saya tidak
memutuskannya sendiri.

### P-1 · Slot sign-off memo materialitas TANPA gate otoritas (SoD) — **paling berat**

`view_materiality_parts.tsx` `MatMemo` (baris 455-463) menyimpan tiga slot persetujuan
(`preparer` / `manager` / `partner`) di kunci `mat.memo.signoff` dan menandatanganinya
lewat `doSign(key, name, role)`. Berkas itu **tidak memanggil `useAuth()` maupun `can()`
sama sekali** (grep: nol kecocokan). Konsekuensi:

1. **Junior Auditor dapat menandatangani slot Rekan Perikatan.** Tanda tangan itu lalu
   ikut ke PDF memo yang **tersegel Ed25519** (`amsExportPdf`, baris 469-477) sebagai
   "Disetujui — Partner" → artefak bersegel memuat persetujuan yang tak pernah
   diberikan pemilik otoritasnya.
2. Ini **pelanggaran langsung invarian BUILD.md** ("JANGAN tambah sign-off baru tanpa
   (1) gate UI `can()` peran-spesifik DAN (2) entri di `guardSignoffWrite`") dan sekelas
   dengan P0 SoD opini yang diperbaiki di #23.
3. Kunci `mat.memo.signoff` **masih firm-scope** (sengaja tak ikut pindah di #129, alasan
   tertulis di `contexts.tsx:201`: pindah tanpa `guardSignoffWrite` akan melonggarkan
   otoritas dari Rekan menjadi WP_EDIT). Akibat lanjutan: **tanda tangan bocor
   lintas-perikatan** — menandatangani memo ENG-A membuat memo ENG-B tampak
   tertandatangani, karena satu nilai firm dipakai semua perikatan.

Catatan penting: memindahkan lingkup **tanpa** menambah gate justru memperburuk (#129
sudah benar menundanya). Ketiganya harus diperbaiki dalam satu gerakan — resep 3-titik.

### P-2 · Lubang cache-dingin SSOT materialitas

#129 (PR-1a) memperbaiki **jalur kunci** `materiality()`: dari `ams.v1.mat.*`
(tak-berlingkup, tak pernah ditulis sejak W6) menjadi `readPersisted`
(perikatan → firma → legacy → default). Yang **tidak** diperbaiki: **ketersediaan**
nilainya.

- `readPersisted` (`persist_scope.ts:57`) hanya membaca **cache localStorage** yang
  ditulis `useServerState`.
- Cache `mat.benchId/pct/pmPct/cttPct/appliedOverride` **hanya ditulis oleh
  `view_materiality.tsx`** (baris 46-51). Kunci `mat.*` **tidak** ikut dihidrasi di
  `AuditProvider` — bandingkan `aje`, `wtbOverrides`, `fluxState.v1`, dst.
  (`contexts.tsx:539-573`) yang dihidrasi saat boot.

**Diverifikasi live (2026-07-26), dan lebih luas dari dugaan awal.** Keadaan nyata
ENG-2025-040 saat diukur:

| Kunci | Server *engagement* (ENG-2025-040 aktif) | Server *firm* | Cache localStorage | Yang dilihat UI |
|---|---|---|---|---|
| `mat.benchId` | — (v0) | **`"rev"`** (v1) | — | `pbt` (default) |
| `mat.pct` | — (v0) | **`1`** (v1) | — | `5` (default) |
| `mat.pmPct` | — (v0) | — (v0) | — | 75 (default) |

> **Perangkap pengukuran (dicatat agar tak terulang):** perikatan **aktif** adalah
> `ENG-2025-040`, bukan `DEFAULT_ENG_ID = 'ENG-2025-014'` di `persist_scope.ts`. Probe
> `state.get` harus membaca `localStorage['ams.v1.user.<uid>.activeEng']` lebih dulu.
> Header kertas kerja SA 530 mencantumkan "ENG-2025-014" sebagai teks seed statis — itu
> **bukan** indikator perikatan aktif.

Modul Materialitas menampilkan **"Laba Sebelum Pajak · 5%"** dengan slider `5/75/5`,
padahal server menyimpan **Total Pendapatan · 1%**. Sebab: `useServerState` hanya
menanyakan **satu** `(scope, scopeId)` ke server (`contexts.tsx:307`) dan mengadopsi
nilai server hanya bila `version > 0`; nilai pra-#129 hidup di lingkup **firma**, jadi
kueri lingkup-perikatan mengembalikan v0 → default. Rantai baca-lewat `readPersisted`
memang punya tier firma, tetapi **hanya atas cache localStorage** — bukan atas server.
⇒ **#129 membuat konfigurasi materialitas pra-#129 yatim**: keputusan benchmark auditor
hilang dari UI-nya sendiri, senyap, tanpa jejak. (Kalau konfigurasi itu dihormati,
`calcOM` = 331,9 M × 1% = 3.319 jt — angka **keempat**, bertumpuk di atas P-0.)

Akibat lanjutan pada browser bersih / storage terhapus / mesin auditor kedua, **selama
modul Materialitas belum pernah dibuka pada sesi itu**, delapan konsumen memakai
**pmPct 75, pct 5, benchId `pbt`, tanpa `appliedOverride`** meski server menyimpan
setelan auditor yang berbeda:

| Konsumen | Dampak |
|---|---|
| `view_sa530.tsx:85,111` | **ukuran sampel** SA 530 salah (PM basi) |
| `view_sad.tsx:71` | ambang agregasi salah saji SA 450 |
| `view_psak14.tsx:168` | uji NRV persediaan |
| `view_execution.tsx:72` | PM di permukaan eksekusi |
| `view_analytical.tsx:146` | ambang prosedur analitis |
| `view_spr2410.tsx:76` | reviu interim |
| `view_wp.tsx:154,335` | kertas kerja |
| `view_misc1.tsx:53` | ringkasan |

Sifat cacatnya: **senyap dan bergantung keadaan cache browser** — dua auditor pada
perikatan yang sama bisa melihat PM berbeda, dan tak ada indikasi apa pun di UI.
Ini pola yang sama seperti tiga sesi WTB sebelumnya: *perbaikan SSOT yang hanya
menyentuh sebagian jalur lebih buruk daripada tak menyentuh* — di sini jalur kunci
diperbaiki, jalur hidrasi tidak.

### P-3 · Nilai `AuditContext` tak bertipe (cacat pencegahan)

`createContext(null)` (`contexts.tsx:20`) + objek nilai 40-field tanpa tipe
(`contexts.tsx:642-655`). Field yang **lupa dimasukkan ke objek nilai** tetapi sudah
masuk array deps **LOLOS `typecheck` + `lint`** dan gagal senyap saat runtime. Sudah
menggigit dua kali (memori `asseris-wtb-pr3-pr4-sa520-spine` GOTCHA). P-2 menambah field
ke objek ini → memperbaiki tipe adalah **prasyarat**, bukan pekerjaan terpisah.

### P-4 · `SAMPLE_TB` memicu peringatan skala (rendah, tapi terikat P-0)

Tombol "Muat contoh" di drawer impor TB (`view_execution.tsx:750`) memuat neraca saldo
yang **memicu gerbang skala** ingress (#130). Gerbang yang menyala pada data contoh
bawaan mengajari pengguna baru bahwa peringatan integritas boleh diabaikan.

**Diverifikasi live 2026-07-26** — teks persisnya:
> "Total aset hanya **4.0×** materialitas perikatan (lazimnya puluhan–ratusan kali) —
> periksa satuan penyajian."

Angka **4,0×**, bukan 6,5× seperti tercatat di catatan sesi sebelumnya. Selisihnya
bukan kekeliruan pencatatan melainkan **bukti tambahan P-0**: gerbang ini membagi
dengan materialitas yang definisinya sedang diperdebatkan. 27.500 jt ÷ **6.800** jt
= 4,0× (jalur `engMateriality`); 27.500 jt ÷ **4.260** jt = 6,45× (jalur `calcOM`) —
persis angka lama. ⇒ **gerbang skala ingress adalah konsumen ke-9** materialitas,
tidak ada di daftar delapan di P-2. Karena keputusan Q5 = opsi (a) menaikkan rasio
menjadi ~6,5×, `SAMPLE_TB` **wajib diperbaiki setelah PR-6·0**, dikalibrasi terhadap
angka pasca-perbaikan.

Kalibrasi: TB seed nyata = 316.558 jt ÷ 6.800 jt = **46,6×** (lulus gerbang). Sampel
perlu ~10× lebih besar untuk masuk kisaran wajar. Sisa pratinjau sudah sehat
(14 baris · control total "Seimbang ✓" · cakupan PSAK 55%), jadi yang salah **hanya**
skalanya.

---

## 2 · Objective

1. Tidak ada slot persetujuan di aplikasi yang dapat ditandatangani tanpa otoritas
   peran yang tepat, di UI **dan** di server, dengan isolasi per-perikatan.
2. Materialitas yang dilihat setiap modul **identik dengan yang disimpan server**,
   tanpa bergantung pada modul mana yang sudah pernah dibuka di browser itu.
3. Field yang hilang dari nilai `AuditContext` **gagal di `typecheck`**, bukan saat runtime.
4. Data contoh bawaan lulus gerbang integritasnya sendiri.

## 3 · Success Criteria

**Gerbang wajib (semua):** `npm run typecheck` = 0 · `npm run lint` = 0 ·
`npm test` ≥ 646 lulus (snapshot `canon_regression` **tidak berubah**) · CI 6/6.

**Kriteria fungsional, per PR:**

| # | Kriteria | Cara uji |
|---|---|---|
| **K0a** | Satu perikatan → **satu** nilai OM/PM/CTT di seluruh permukaan (Materialitas, WTB, SA 530, SAD, PSAK 14, analitis, SPR 2410) | live, bandingkan angka terender |
| **K0b** | Uji baru memaku **jalur yang dipakai view** (`materiality({engMateriality, engagementId})`), bukan hanya jalur zero-arg | test unit baru |
| **K0c** | Bila benchmark & materialitas perikatan berbeda, UI menyatakan **mana yang berlaku dan mengapa** — tak ada dua angka tanpa penjelasan | live |
| **K0d** | Konfigurasi tersimpan pra-#129 (lingkup firma di **server**) tidak hilang: terbaca atau ter-migrasi eksplisit, tak pernah senyap jatuh ke default | live pada ENG-2025-040 (`benchId="rev"`, `pct=1`) + test |
| K1 | Junior/Senior **tak bisa** menandatangani slot manager/partner memo materialitas (tombol tergate) | live, login Junior |
| K2 | Request `state.set` termodifikasi yang menyisipkan slot partner **ditolak server** (FORBIDDEN) | test integrasi `server/src/signoff.test.ts` |
| K3 | Tanda tangan memo ENG-2025-040 **tidak** muncul di ENG-2025-031 | live, ganti perikatan |
| K4 | ~~Tanda tangan firm-scope lama tetap **terbaca**~~ → **DIREVISI saat implementasi:** tanda tangan firm-scope lama **sengaja tidak dibawa**. `readPersisted` (rantai baca-lewat) hanya dipakai pembaca non-React (canon) dan kunci ini tak punya pembaca canon; `useServerState` hanya membaca kunci lingkupnya sendiri. Membawanya juga **salah secara substansi** — tanda tangan firm-wide tak dapat diatribusikan ke satu perikatan (itulah cacatnya), jadi harus ditandatangani ulang per perikatan oleh pemegang otoritas. Nol kehilangan di repo ini: nilai firm-scope di server kosong (diverifikasi live) | live + komentar kode |
| K5 | Dengan `localStorage` kosong + server menyimpan `pmPct = 60`, **kedelapan** konsumen menampilkan PM turunan 60 — sebelum modul Materialitas dibuka | live + test |
| K6 | Menyunting pmPct di Materiality Workspace mengubah PM di WTB/SA 530 **tanpa reload** (satu pemilik, bukan dua salinan) | live |
| K7 | `materiality()` tanpa argumen konfigurasi mengembalikan `configSource` eksplisit (`'args' \| 'cache' \| 'default'`) sehingga jalur basi dapat dideteksi | test unit |
| K8 | Tak ada berkas `view_*.tsx` yang memanggil `materialityFor(` langsung (invarian statis) | test statis baru |
| K9 | Field yang dihapus dari objek nilai `AuditContext` → `typecheck` gagal | dibuktikan sekali secara manual, dicatat di PR |
| K10 | "Muat contoh" pada drawer impor TB **tidak** memunculkan peringatan skala | live |

## 4 · Scope

**PR-6·0 — satu definisi "OM yang berlaku" (P-0).** Menunggu Q5. Menetapkan presedens
tunggal di `canon_part4.ts`, memakainya di modul Materialitas **dan** kedelapan konsumen,
menampilkan basis yang berlaku secara eksplisit di UI (K0c), dan memaku jalur
ber-argumen dengan uji baru (K0b). Digabung dengan PR-6b bila Q5 → opsi (c), karena
keduanya lalu menyentuh presedens yang sama.

**PR-6a — otoritas sign-off memo materialitas (P-1).** Resep 3-titik penuh:
`AMS_PERSIST_SCOPE['mat.memo.signoff'] = 'engagement'` · gate UI `can()` per-slot di
`MatMemo` · entri `guardSignoffWrite` di `server/src/signoff.ts` yang mem-**diff** nilai
tersimpan vs masuk dan menuntut kapabilitas per-slot · uji matriks RBAC.

**PR-6b — SSOT materialitas cache-dingin + tipe `AuditContext` (P-2 + P-3).**
- `canon_part4.ts`: `materiality(opts)` menerima `opts.config` eksplisit (murni, tanpa
  baca storage) dan mengembalikan `configSource`. Tanpa `config` → rantai `readPersisted`
  lama tetap jalan (fingerprint regresi & pemanggil non-React utuh).
- `contexts.tsx`: `AuditProvider` menjadi **pemilik tunggal** 5 kunci `mat.*` (hidrasi
  saat boot, engagement-scope), mengekspos `matConfig` + `setMatConfig(patch)`.
- Hook `useMateriality()` (reaktif) → dipakai kedelapan konsumen; `view_materiality.tsx`
  **berhenti** memakai `useAmsPersist('mat.*')` dan mengikat ke konteks (menghindari
  dua pemilik satu kunci = split-brain baru, karena instance `useServerState` **tidak**
  saling sinkron dalam satu sesi).
- Antarmuka `AuditContextValue` (memakai tipe yang sudah ada di `ams_types.ts`:
  `RiskRow`, `ReviewNote`, `TimeEntry`, `WorkpaperRow`, …; `WTB` dari `canon_types`).
- Uji invarian statis K8.

**PR-6c — `SAMPLE_TB` lulus gerbang skala (P-4).** Sesuaikan angka contoh agar
konsisten skala dengan seed demo, atau tandai contoh sebagai skala berbeda secara
eksplisit — mana pun yang tak melemahkan gerbang.

## 5 · Non-Scope

- Penggabungan route `analytical` → `sa520` (PRD PR-3 §11 Q2 — sengaja tak diambil).
- Deteksi laba-ganda yang **memblokir** (PRD PR-4 §11 Q3 — sengaja advisory).
- Menaikkan presisi tipe seluruh 40 field `AuditContext` sampai nol-`any`; target PR ini
  hanya **nama field wajib ada** (K9). Presisi bertahap.
- Mengubah cara `useServerState` bekerja (mis. menambah sinkronisasi lintas-instance
  global). Solusi di sini adalah **satu pemilik per kunci**, bukan mesin baru.
- Verifikasi live yang butuh login: saya **tidak** mengisi kata sandi ke formulir
  (aturan keras). Anda yang login di panel Browser; saya mengukur setelahnya.

## 6 · Constraints

- ESM-only; edit hanya di `migration/src/*` (`app/*` referensi beku).
- `typecheck` full-strict 0 error; ratchet ESLint `no-explicit-any` (`--prune-suppressions`
  bila jumlah `any` menurun).
- Snapshot `canon_regression.test.ts` **tidak boleh berubah** → jalur zero-arg
  `materiality()` wajib berperilaku identik.
- Rantai baca-lewat wajib non-destruktif (nilai firm-scope lama tetap terbaca).
- Rules-of-hooks: `useMateriality()` dipanggil tanpa syarat.

## 7 · Existing Solutions (dipakai, bukan dibuat ulang)

- Resep 3-titik kunci otoritatif → memori `asseris-authoritative-persist-key-recipe`.
- Pola gate per-slot → `view_opinion_parts.tsx` + `server/src/signoff.ts`
  (`guardSignoffWrite`) + `firm_attest.tsx` (`allowed = can(...)`).
- Rantai baca-lewat → `persist_scope.ts` `readPersisted` (sudah ada).
- Uji matriks RBAC → `src/rbac.test.ts` (sudah ada; tambah baris).
- Uji invarian statis → pola `psak_renumber.test.ts`.

## 8 · Risks

| Risiko | Mitigasi |
|---|---|
| **Dua pemilik satu kunci** (`AuditProvider` + `view_materiality`) → split-brain baru, tepat kelas bug yang sedang diperbaiki | `view_materiality` **wajib** berhenti memakai `useAmsPersist('mat.*')`; grep seluruh pemanggil sebelum selesai (pelajaran 3 sesi) |
| Gate baru **menutup** alur sah (mis. Manajer tak bisa menyimpan setelan materialitas) | `mat.*` konfigurasi sudah engagement-scope (capForWrite = WP_EDIT); yang digate hanya **slot tanda tangan**. Uji live per peran |
| `configSource` menambah field ke `MaterialityResult` → snapshot regresi bergeser | jalur zero-arg dijaga; bila snapshot bergerak, itu **sinyal**, bukan diizinkan `-u` tanpa pemeriksaan |
| Migrasi 8 konsumen ke hook → salah satu terlewat → kontradiksi dalam satu modul | invarian statis K8 memaksa nol pemanggil langsung di `view_*.tsx` |
| Mengetik `AuditContext` memecah ~100 call-site (`useAudit()` bisa `null`) | `useAudit()` di-tipe non-null lewat cast eksplisit + komentar jujur; risiko runtime **tidak berubah** dari hari ini (sudah tanpa guard) → lihat Q1 |

## 9 · Implementation Plan

**Urutan PR: 6·0 → 6a → 6b → 6c.** P-0 lebih dulu karena ia satu-satunya yang mengubah
**angka audit** yang sedang tampil, dan karena PR-6b (SSOT cache-dingin) harus dibangun
di atas presedens yang sudah tetap — memperbaiki ketersediaan konfigurasi sebelum
menyepakati definisi mana yang berlaku hanya akan memindahkan kontradiksi.

**PR-6·0** (menunggu Q5)
1. `canon_part4.ts`: presedens tunggal + komentar yang menyatakan aturannya eksplisit.
2. Uji baru untuk jalur ber-argumen (K0b); periksa apakah snapshot regresi bergerak —
   bila ya, **itu sinyal**, diperiksa sebelum `-u`.
3. Modul Materialitas: KPI headline memakai presedens yang sama; label basis yang
   berlaku (K0c); stat "TERTERAPKAN" diberi arti yang jelas atau dihapus.
4. Live: bandingkan Materialitas ⟷ WTB ⟷ SA 530 (K0a) + dampak ukuran sampel.

**PR-6a** (urutan: server → scope → UI)
1. `server/src/signoff.ts`: entri `mat.memo.signoff` — diff per slot → cap yang dituntut.
2. `server/src/signoff.test.ts`: request termodifikasi per peran (K2).
3. `contexts.tsx`: `AMS_PERSIST_SCOPE['mat.memo.signoff'] = 'engagement'` + komentar
   mengganti catatan penundaan di baris 201.
4. `view_materiality_parts.tsx`: `useAuth()` + `can()` per slot; tombol nonaktif +
   alasan terlihat (bukan sembunyi senyap); nama penanda tangan dari **sesi**, bukan
   hardcode `'Anindya Pramesti'` (cacat kecil yang ikut ketemu).
5. `rbac.test.ts`: baris matriks.
6. Gerbang + live per peran (K1/K3/K4).

**PR-6b**
1. `canon_types.ts`: `MaterialityConfig`, `MaterialityOpts.config`, `MaterialityResult.configSource`.
2. `persist_scope.ts`: varian pembaca yang melaporkan hit (untuk `configSource`).
3. `canon_part4.ts`: `materiality()` jalur args-first, fallback cache tak berubah.
4. `contexts.tsx`: `AuditContextValue` (P-3) **lebih dulu**, lalu hidrasi 5 kunci
   `mat.*` + `matConfig`/`setMatConfig` + `useMateriality()`.
5. `view_materiality.tsx` + `view_materiality_parts.tsx`: ikat ke konteks.
6. Migrasi 8 konsumen → `useMateriality()`.
7. Uji: unit (K7), invarian statis (K8), regresi snapshot tak bergerak.
8. Bukti K9 (hapus satu field → typecheck gagal), lalu pulihkan.
9. Live: cache dingin (K5) + reaktivitas (K6).

**PR-6c** — perbaiki `SAMPLE_TB`, verifikasi K10 live.

## 10 · Keputusan (2026-07-26) & Open Questions

**TERJAWAB — Q5 = opsi (a):** benchmark adalah dasar; `mat.appliedOverride` ("Terapkan ke
Engagement") menang bila ada; **`engMateriality` tidak pernah menjadi sumber OM** — ia hanya
dipakai mendeteksi *drift* terhadap nilai di daftar perikatan. Konsekuensi disadari &
diterima: PM 5,1 M → 3,195 M, ukuran sampel MUS ~232 → ~577 pada perikatan demo.

**TERJAWAB — Q2 = `OPINION_APPROVE`** untuk slot "Disetujui — Partner"; slot Manager =
`SIGNOFF_REVIEWER`; slot Preparer = `WP_EDIT`.

**TERJAWAB — Q1 = cast non-null** (`useAudit(): AuditContextValue`), nol perubahan
call-site, risiko runtime tak berubah dari hari ini.

**TERJAWAB — Q4 = samakan skala `SAMPLE_TB`** agar lulus gerbangnya sendiri.

**TERJAWAB — Q3 = urutan `6·0 → 6a → 6b → 6c`** (P-0 lebih dulu; lihat §9).

Pertanyaan awal disimpan di bawah sebagai rekaman alasan.



**Q1 · Tipe `useAudit()`.** (a) **Rekomendasi:** kembalikan `AuditContextValue` lewat cast
eksplisit + komentar jujur — nol perubahan call-site, risiko runtime sama seperti hari ini.
(b) `AuditContextValue | null` dengan guard di ~100 call-site — lebih jujur, tapi PR jadi
sapuan besar yang mengaburkan perbaikan inti.

**Q2 · Kapabilitas slot "Disetujui — Partner" pada memo materialitas.** Slot manager
jelas `SIGNOFF_REVIEWER` (Partner + Manajer). Untuk slot partner: (a) **Rekomendasi:**
`OPINION_APPROVE` (Partner-saja) — memakai kapabilitas yang sudah ada, semantik
"persetujuan otoritatif rekan perikatan"; (b) `FIRM_ADMIN` — dipakai untuk akseptasi &
penerbitan surat, tapi itu otoritas *firma*, bukan *perikatan*; (c) kapabilitas baru
`MATERIALITY_APPROVE` — paling presisi, tapi menambah permukaan matriks RBAC.

**Q5 · Mana yang berlaku sebagai OM (P-0)? — pertimbangan profesional, keputusan Anda.**
- **(a) Materialitas perikatan menang** (perilaku hilir sekarang; OM 6,8 M · PM 5,1 M ·
  n = 232). Presedens `override ?? engMateriality ?? calcOM` dipertahankan; modul
  Materialitas diperbaiki agar headline-nya mengikuti, dengan hasil hitung benchmark
  ditampilkan sebagai **pembanding**, bukan sebagai OM.
- **(b) Hasil hitung benchmark menang** (perilaku workspace sekarang; OM 4,26 M ·
  PM 3,195 M · n ≈ 577). `engMateriality` diturunkan menjadi angka administratif
  (nilai di daftar perikatan), semua konsumen mengikuti benchmark + override.
- **(c) Benchmark adalah dasar, materialitas perikatan hanyalah nilai tersimpan
  hasil penetapan** — yakni: bila `appliedOverride` ada, ia menang; jika tidak,
  benchmark × persen; `engMateriality` **tidak** pernah menjadi sumber OM, hanya
  dipakai untuk mendeteksi *drift* ("nilai di daftar perikatan 6,8 M tidak sama dengan
  materialitas yang ditetapkan 4,26 M — perbarui atau terapkan"). **Rekomendasi saya**:
  ini yang paling dekat dengan SA 320 ¶10-11 (materialitas ditetapkan dari benchmark +
  pertimbangan, lalu *diterapkan*), dan ia menjelaskan mengapa tombol "Terapkan ke
  Engagement" ada. Konsekuensi: PM turun 5,1 M → 3,195 M, sampel naik ~232 → ~577,
  jadi ini **mengubah luas prosedur pada perikatan demo** — perlu Anda sadari, bukan
  efek samping teknis.

**Q3 · Urutan.** Anda memilih A(=P-2)+C lalu B(=P-1). Temuan "nol gate `can()`"
belum diketahui saat itu. Saya usul **P-1 lebih dulu** (PR-6a): dampaknya adalah
tanda tangan palsu pada artefak bersegel, sedangkan P-2 adalah angka basi yang
terkoreksi begitu modul Materialitas dibuka. Konfirmasi atau pertahankan urutan asli.

**Q4 · `SAMPLE_TB` (P-4).** Sesuaikan angka contoh agar lulus gerbang, atau biarkan
memicu gerbang **secara sengaja** sebagai demo gerbang yang berfungsi (dengan label
eksplisit "contoh ini sengaja memicu peringatan skala")? Yang kedua lebih mendidik
tetapi menambah teks UI.

---

**Menunggu "Proceed."** — tidak ada implementasi dimulai sebelum itu.
