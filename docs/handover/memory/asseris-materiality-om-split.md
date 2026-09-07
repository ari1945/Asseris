---
name: asseris-materiality-om-split
description: "P-0 TERBUKTI LIVE — satu perikatan, dua PM (3.195 jt vs 5.100 jt) karena workspace & hilir beda definisi OM; oracle uji menguji jalur zero-arg yang tak dipakai view"
metadata: 
  node_type: memory
  type: project
  originSessionId: 505e514b-592c-4122-a086-413cf88825f2
  modified: 2026-07-26T14:52:48.618Z
---

2026-07-26. Ditemukan saat verifikasi live PR-5 (login Rekan Pemimpin, dev :5180,
perikatan aktif **ENG-2025-040**, master `484c8a1`).

**STATUS: PR-6·0 & PR-6a MERGED** (`master` = `46b276a`).
- **#134 `c2d5758` (PR-6·0)** — presedens disatukan (`omFull = appliedOverride ?? benchmark
  × pct`); `basis` + `drift` di `MaterialityResult`; modul Materialitas menarik OM/PM/CTT
  dari canon (dulu hitung sendiri → juga MENGABAIKAN override yang ia terbitkan sendiri);
  rail menyatakan basis. 651 test. Live: ketiga permukaan sepakat OM 4.260.000.000 /
  PM 3.195.000.000; SA 530 n = **577** (dari 232).
- **#135 `46b276a` (PR-6a)** — resep 3-titik untuk `mat.memo.signoff`: `SIGNOFF_KEYS` +
  `MAT_MEMO_SLOT_CAP` (manager=SIGNOFF_REVIEWER, partner=OPINION_APPROVE) + scope
  engagement + gate UI `can()`. **Nama penanda tangan dulu HARDCODE** → Junior merekam
  identitas Rekan; kini dari sesi. `sigNamed()` sendiri karena `sig()` melewatkan
  pergantian NAMA pada `at` sama. Server 289 test. **Keputusan Ari: tanda tangan
  firm-scope lama SENGAJA tidak dibawa** (tak dapat diatribusikan ke satu perikatan) —
  K4 PRD direvisi. BELUM diverifikasi di layar: penolakan gate UI untuk Junior (butuh
  login peran itu; sisi server ber-uji).

- **#136 `effb9f0` (PR-6b)** — AuditProvider jadi pemilik tunggal 5 kunci `mat.*`
  (dihidrasi saat boot) + `useMateriality()` + **baca-lewat SISI SERVER** untuk `mat.*`
  (tier perikatan v0 → baca tier firma). Temuan: **#129 hanya menutup rantai baca-lewat di
  lapisan cache, bukan server** → konfigurasi pra-#129 YATIM. `configSource` +
  `readPersistedWithHit` membuat jalur basi terdeteksi. Uji invarian statik
  `materiality_single_door.test.ts` melarang view memanggil `materialityFor()` langsung.
  `AuditContextShape` memaku BENTUK nilai konteks (bukti: TS2741). 657 test.
  **Live cache-dingin TANPA membuka modul Materialitas: WTB PM 2.489 jt** = 75% ×
  (Pendapatan 331.900 × 1%) — konfigurasi auditan yang sebenarnya pulih.
- **#137 `31e2ef2` (PR-6c)** — `SAMPLE_TB` dinaikkan 10× (total aset 275.000 jt ⇒ ~83× OM),
  sebanding TB seed nyata ~95×. **K10 belum diverifikasi live** (sesi login habis).

**PM perikatan aktif bergerak 3× sesi ini**: 5.100 → 3.195 → **2.489 jt**; sampel SA 530
232 → 577.

## PR-6d — SELESAI, PR #138 TERBUKA (menunggu merge)

Branch `feat/audit-context-value-types`, commit terakhir **`5a81dd2`**. `useAudit()` kini
mengembalikan `AuditContextValue` (44 field). Gerbang lokal: typecheck 0 · lint 0 · 657 test.
**Jalur error: 59 → 48 → 28 → 8 → 0**; lompatan terbesar dari mendeklarasikan field DAUN
`WpStateEntry` (chain/procs/noteStatus/exec/asrConcl/conclusion) — dengan
`[k: string]: unknown` saja, `st.chain.preparer` tetap gagal karena `st.chain` = `unknown`.
Ternyata TAK perlu menyentuh ~30 titik `|| {}` (perkiraan awal saya salah).

**Dua cacat nyata tersingkap saat `any` dilepas:** (1) `view_execution` drill AJE
`aje.find()` lalu langsung `a.lines`/`a.dr.split()` → MELEMPAR bila AJE tak ditemukan; kini
`if (!a) return null`. (2) `wpEvidenceEval` menuntut `EvRec`/`ExecP` penuh padahal hanya
membaca `tier` & `items[].result` → parameter dilonggarkan.

**CI #138 sempat MERAH di job migration**: `npm run lint` exit 2 "suppressions left that do
not occur anymore" — karena PR ini MENGURANGI `any`. Diperbaiki `--prune-suppressions`
(`5a81dd2`). **CI setelah perbaikan belum dikonfirmasi — cek dulu di sesi berikutnya.**

**K10 PR-6c KINI TERVERIFIKASI LIVE**: "Muat contoh" → "SIAP DITERAPKAN · 14 baris ·
CONTROL TOTAL Seimbang ✓ · cakupan PSAK 55%", peringatan skala HILANG.

## Catatan lama (WIP, sudah tak berlaku)

Branch `feat/audit-context-value-types`, commit **`0ff283c`**, **typecheck MERAH: 48 error
di 9 berkas** (dari 59). Keputusan Ari: tipe penuh (bukan hanya pemaku bentuk).
`AuditContextValue` 44 field sudah ditulis; `useAudit()` sudah dikembalikan bertipe.

**Akar sisa error (seragam, penting):** konsumen menulis `wpState[ref] || {}` → tipe jadi
union `WpStateEntry | {}` → akses `.preparer`/`.text`/`.disposition` gagal di sisi `{}`.
Selama ini tersembunyi di balik `any`. Jalan keluar: (a) cast per titik ~30 sunting, atau
(b) hapus `|| {}` (Record index tak pernah undefined tanpa `noUncheckedIndexedAccess`).
Sisa lain: `.find()` AJE `possibly undefined` (~10 titik view_execution), index string ke
`RiskRow` (view_risk), `r.adj` possibly undefined (view_psak71). PRD: `PRD - WTB PR-6 Otoritas Sign-off Materialitas,
SSOT Cache-Dingin & Tipe Konteks.md`.

## Cacat (belum diperbaiki saat catatan ini ditulis)

Satu perikatan menampilkan **dua PM yang berbeda**:

| Permukaan | PM | Jalur |
|---|---|---|
| Modul Materialitas (KPI "PERFORMANCE · 75%") | **3.195 jt** (OM 4.260) | UI hitung OM dari benchmark = `calcOM` |
| Header WTB · SA 530 "PM kanon (SA 320)" | **5.100 jt** (OM 6.800) | `materialityFor({engMateriality})` |

Akar: `omFull = override ?? engMateriality ?? calcOM` (`canon_part4.ts:338`). View mengirim
`engMateriality` = 6,8 M dari `AMS.ENGAGEMENTS`; workspace menampilkan `calcOM` sebagai
headline dan 6,8 M sebagai stat "TERTERAPKAN". **Dua definisi "OM yang berlaku".**

Konsekuensi audit: kalkulator MUS SA 530 memakai TM = PM → n = **232** item pada 5.100;
n ≈ **577** pada 3.195. **Faktor 2,5× pada luas prosedur.**

**Keputusan Ari (Q5) = benchmark adalah dasar**; `mat.appliedOverride` menang bila ada;
`engMateriality` **tidak pernah** sumber OM, hanya untuk deteksi *drift*. ⇒ PM turun ke
3.195, sampel naik ~577. Disadari & diterima.

## Mengapa lolos 646 test + CI 6/6

Oracle yang dipaku di `W0-BASELINE.md` (OM 4260 / PM 3195 / CTT 213) menguji
`materiality()` **zero-arg** — jalur yang **tidak dipakai satu pun view**. Semua view
mengirim `{engMateriality, engagementId}`. **Pelajaran: memaku angka pada jalur yang
bukan jalur produksi = uji hijau di atas aplikasi yang bertentangan dengan dirinya.**
Saat menambah/mengubah engine kanon, paku jalur yang benar-benar dipanggil view.

## Temuan bersama (sesi yang sama)

- **#129 membuat konfigurasi materialitas pra-#129 yatim.** Server ENG-2025-014
  menyimpan `mat.benchId="rev"`, `mat.pct=1` di lingkup **firma** (v1); kunci
  lingkup-perikatan v0. `useServerState` hanya menanyakan **satu** (scope,scopeId) ke
  server dan mengadopsi hanya bila `version>0`; rantai baca-lewat `readPersisted`
  punya tier firma **tapi hanya atas cache localStorage, bukan atas server**. Hasil:
  UI menampilkan default "Laba Sebelum Pajak · 5%", slider 5/75/5 — keputusan auditor
  (Total Pendapatan · 1%) **hilang senyap**. Rantai fallback di lapisan cache TIDAK
  menggantikan fallback di lapisan server.
- **`mat.*` tak dihidrasi di AuditProvider** → hanya `view_materiality` yang menulis
  cache-nya, jadi 8 konsumen `materialityFor` memakai default di browser cache-dingin.
- **`view_materiality_parts.tsx` NOL gate `can()`** → Junior dapat menandatangani slot
  "Disetujui — Partner" memo materialitas, lalu ikut ke PDF **bersegel Ed25519**.
  `mat.memo.signoff` juga masih firm-scope → tanda tangan bocor lintas-perikatan.
  Keputusan Ari: slot partner = `OPINION_APPROVE`, manager = `SIGNOFF_REVIEWER`.
- **Gerbang skala ingress = konsumen ke-9 materialitas.** Peringatan `SAMPLE_TB`
  berbunyi "4.0×" (÷ 6.800), bukan "6,5×" (÷ 4.260) yang tercatat sesi lalu — angkanya
  bergeser mengikuti definisi OM. Pembanding: TB seed nyata 46,6× (lulus).

## GOTCHA (baru)

- **Perikatan aktif ≠ `DEFAULT_ENG_ID`.** Aktif = `ENG-2025-040`; `persist_scope.ts`
  `DEFAULT_ENG_ID` = `'ENG-2025-014'`. Probe `state.get` WAJIB baca
  `localStorage['ams.v1.user.<uid>.activeEng']` lebih dulu — saya sempat mengukur
  perikatan yang salah selama beberapa langkah. Header kertas kerja SA 530 memuat
  "ENG-2025-014" sebagai **teks seed statis**, bukan penanda perikatan aktif.

- **`window.AMS` & `window.AMS_CANON` sudah TIDAK ADA** (window-strip selesai) →
  probe konsol tak bisa memanggil canon. Ukur lewat **DOM terender** atau `state.get`
  tRPC langsung: `fetch('/trpc/state.get?input=' + encodeURIComponent(JSON.stringify(
  {scope,scopeId,key})), {credentials:'include'})`. `window.useAmsPersist` masih ada.
- **Panel Browser tak "displayed" ⇒ `computer` click TIDAK mendaftar** (hit-testing
  butuh compositing) meski tool melaporkan koordinat sukses. Screenshot juga mustahil.
  Jalan keluar: `.click()` via `javascript_tool`. Piksel tetap belum pernah ditinjau
  manusia (utang 4 sesi).
- `/bootstrap` mengembalikan **200 walau tanpa sesi** → BUKAN bukti login. Verifikasi
  dengan `auth.me` (null = belum) atau `state.get` (UNAUTHORIZED).
- Login harus dilakukan Ari sendiri (saya tak mengisi kata sandi). Kredensial seed ada
  di `BUILD.md`.
- Drawer impor TB punya langkah konfirmasi "Ya, ganti TB berjalan" — `.click()` pada
  "Terapkan ke WTB" TIDAK menulis apa pun sampai konfirmasi itu ditekan (aman untuk
  probe; keluar lewat "Kembali" → "Batal").

Terkait: [[asseris-wtb-pr3-pr4-sa520-spine]] · [[asseris-wtb-eval-pr1-pr2]] ·
[[asseris-authoritative-persist-key-recipe]] · [[asseris-opinion-signoff-sod-defect]]
