# PRD — SA 530 & SA 540: Tab Analitik dari SSOT
*(desain/seleksi/generator item · risiko/respons/sensitivitas)*

**Status:** DRAFT — menunggu sign-off ("Proceed.")
**Branch:** `sa530-540-analytical-tabs` (off master pasca-merge PR#16/#17)
**Konteks:** lanjutan eksplisit roadmap pasca trio substantif (PR#13 fraud / PR#14 estimasi / PR#15 sampling). Lihat memory `asseris-gap-matrix-eval`.

---

## 1. Problem
Trio substantif mem-persist **inti** tiap modul, tapi tab **analitik/metodologi** masih display-only hardcoded:

- **SA 530** — `F530Design` (tab *Desain & Populasi*) & `F530Selection` (tab *Metode Seleksi*): **0 persist**, array statis. "Mulai Acak: **1 titik**" hardcoded; **tak ada generator item sampel** nyata (interval & n dihitung kalkulator, tapi item terpilih tak pernah dibangkitkan).
- **SA 540** — `F540Risk` (tab *Risiko*) & `F540Response` (tab *Respons & Rentang*): tabel pemetaan risiko, rentang independen CKPN, dan **analisis sensitivitas Goodwill** semuanya **hardcoded** — dan **menduplikasi** data yang sudah ada di register ter-persist (`EST_SEED`: `mgmt/lo/hi/risk/unc` per estimasi).

Akibat: (a) tab tak reaktif terhadap data perikatan & tak auditable; (b) **pelanggaran SSOT** — angka hardcoded bisa divergen dari register; (c) kapabilitas yang dijanjikan metodologi ("generator item", "analisis sensitivitas") **tak benar-benar berfungsi**.

## 2. Objective
Jadikan tab analitik SA530/540: (i) **ditarik dari SSOT** (register/parameter ter-persist + canon), reaktif; (ii) **interaktif & ter-persist** di titik yang memang keputusan auditor; (iii) menyediakan **dua kapabilitas fungsional nyata** — generator item sampel (530) & analisis sensitivitas estimasi (540).

## 3. Success Criteria
1. **SA530 `desain`**: parameter populasi & ambang stratifikasi **editable + persist**; tabel stratifikasi **derive** dari parameter (bukan 3 baris hardcoded).
2. **SA530 `seleksi`**: **generator item nyata** — titik-mulai acak (**seed tersimpan**) + interval (dari kalkulator) → daftar **unit moneter terpilih** dipetakan ke item populasi via fungsi **murni & deterministik**; menampilkan n item + nilai kumulatif. "Mulai Acak" = nilai nyata dari seed.
3. **SA540 `risiko`**: pemetaan kompleksitas/subjektivitas/ketidakpastian **per estimasi derive dari register** + **editable (persist)** → klasifikasi risiko bawaan pada spektrum (¶4/¶13 revisi).
4. **SA540 `respons`**: blok rentang independen **derive dari register** (mgmt/lo/hi → titik-tengah & kemungkinan-salah-saji **live**, bukan 4.870/5.450 hardcoded).
5. **SA540 sensitivitas**: pilih estimasi → definisikan asumsi + Δ → dampak **terhitung** (fungsi murni) + **persist**; menggantikan tabel Goodwill hardcoded.
6. **0 angka hardcoded** yang seharusnya dari register/canon. Lock LUNAK hormati perikatan terkunci; jejak by/at di titik keputusan. `WpPanel` tetap.
7. **Gate:** `npm run typecheck` 0 (full strict) · `npm run lint` 0 (nol `:any` baru, ratchet utuh) · test hijau (+ uji unit fungsi murni baru). **Verifikasi live role Manager (non-Partner)** — pelajaran `task_85a92ff4`.

## 4. Scope
- Dua view: `view_sa530.tsx` (tab `desain`, `seleksi`), `view_sa540.tsx` (tab `risiko`, `respons` + sensitivitas).
- Perluas state ter-persist yang **sudah ada** (`sampling.v1`, `estimates.v1`) dengan sub-key baru — **backward-compat** (normalizer default dari seed, pola `normScenarios` di going concern).
- Fungsi murni baru bertipe + uji unit: seleksi MUS deterministik & sensitivitas estimasi.

## 5. Non-Scope
- Mengubah algoritma kalkulator MUS (sudah ada & ter-persist).
- CRUD populasi piutang 4.182 item nyata / integrasi GL nyata (tak ada sub-ledger AR di data — pakai **populasi representatif berlabel jelas**).
- Generator non-statistik (haphazard); metode atribut.
- Narasi LLM.

## 6. Constraints
- ESM-only `migration/src`; full `strict` tsc; ratchet ESLint `no-explicit-any` (nol `:any` baru).
- SSOT: angka dari register/canon; persist key **statis engagement-scope** (sudah `sampling.v1`/`estimates.v1` — hasil migrasi terakhir).
- **Determinisme**: seleksi & sensitivitas = fungsi murni dari (input + seed tersimpan), bukan `Math.random` saat render → reproducible & dapat diuji. Seed dibangkitkan sekali (tombol "Acak ulang") lalu **disimpan**.

## 7. Existing Solutions (reuse)
- `sampling.v1` (parameter MUS + temuan) & `estimates.v1` (inventaris + bias) sudah persist → tinggal **perluas**, bukan bikin store baru.
- `WpPanel moduleId="sa530"/"sa540"` sudah inline (sign-off/bukti/kesimpulan SA 230).
- Pola **derive-on-render dari SSOT**: `applySocSync()` (serviceorg). Pola **perluas sub-state backward-compat**: `normScenarios()` (going concern). Pola **fungsi murni + test kanon**: `canon_part5.ts` + `canon_part5.test.ts`.

## 8. Proposed Approach
Cermin pola substantif PR#12–#16:
1. **Util murni + tipe + test** — `selectMusItems(pop, interval, seedStart)` (systematic monetary-unit selection: titik mulai ≤ interval, lalu +interval kumulatif → item populasi yang "tertusuk") & `estimateSensitivity(base, drivers[])` (Δ asumsi → Δ hasil). Lokasi: lihat Open Q1.
2. **SA530** — perluas `SamplingState`: `designParams` (karakteristik populasi, ambang stratifikasi) + `selectionSeed`. `F530Design` → input editable + tabel stratifikasi derived. `F530Selection` → panggil `selectMusItems` atas populasi representatif → daftar item terpilih nyata + seed tersimpan.
3. **SA540** — perluas `EstState`: `perEstimateRisk` (kompleksitas/subjektivitas editable per id) + `sensitivity` (driver Δ per estimasi). `F540Risk` derive pemetaan dari register + kontrol editable. `F540Response` derive rentang (mgmt/lo/hi/midpoint/likely-misstatement) + panel sensitivitas interaktif.
4. **Lock LUNAK + jejak**; gate; verifikasi live (Manager); PRD commit; PR.

## 9. Risks & Mitigasi
- **Scope besar (2 view, 5 tab)** → pecah **3 commit**: (a) util+tipe+test, (b) SA530, (c) SA540 — tiap commit gate-hijau mandiri.
- **Populasi nyata absen** → "generator mainan". Mitigasi: populasi seed **representatif berlabel eksplisit** ("populasi ilustratif N item", bukan klaim 4.182 nyata); metodologi seleksi tetap benar & deterministik.
- **SSOT regressi** → pastikan F540Risk/Response benar-benar **derive** (hapus array dobel), bukan menambah sumber kedua.
- **Determinisme/test** → PRNG/seed tersimpan; uji unit kunci output untuk seed tetap.

## 10. Implementation Plan
1. `util/selection + sensitivity` (atau `canon_part5`) + tipe (`canon_types`/lokal) + `*.test.ts`. Gate.
2. SA530 desain+seleksi (perluas `SamplingState`, normalizer, generator). Gate.
3. SA540 risiko+respons+sensitivitas (perluas `EstState`, normalizer, derive+editable). Gate.
4. Verifikasi live (Manager: edit→persist→clear cache→reload→rehydrate server). PRD commit + PR (base master).

## 11. Open Questions (butuh keputusan sebelum/saat mulai)
1. **Letak fungsi murni:** `canon_part5.ts` (SSOT, reusable, test kanon) **atau** util lokal view bertipe + test? Rekomendasi: **util lokal bertipe + test** — spesifik modul, bukan figur SSOT lintas-modul. *(Default bila tak dijawab: util lokal.)*
2. **Sensitivitas SA540:** tetap **panel dalam tab `respons`** (sekarang begitu) atau **tab terpisah** ke-5? Rekomendasi: **tetap dalam `respons`** — hindari menambah tab; roadmap menyebut risiko/respons/sensitivitas sebagai aspek, bukan wajib 3 tab. *(Default: dalam respons.)*
3. **Populasi generator SA530:** populasi sintetis representatif (mis. **80–120 item** berlabel ilustratif) cukup? Rekomendasi: **ya, ~100 item sintetis berlabel**, condong (beberapa saldo besar) agar MUS bermakna. *(Default: ~100 item sintetis.)*

---
**Keputusan diminta:** "Proceed." untuk mulai (dengan default Open Q bila tak ada preferensi lain), atau koreksi scope/Open Q.
