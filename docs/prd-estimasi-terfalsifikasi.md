# PRD — Estimasi Akuntansi yang Terfalsifikasi (SA 540 · PSAK 68 · Tier B nilai pakai)

| Field | Nilai |
|---|---|
| Status | Implemented — PR-1..PR-5 (#182·#183·#184·#185·#186) merged 2026-08-12; K1–K13 tertutup |
| Tanggal | 2026-08-12 |
| Arc | Integritas estimasi — lanjutan pola #169–#181 (temuan lewat probe, bukan lewat uji) |
| Basis | master `3305826` · 8/8 gerbang hijau · nol PR terbuka |
| Keputusan yang sudah diambil | Tier B = **hanya nilai pakai (value-in-use)**; urutan eksekusi P0 → P1 → P2; satu arc PRD, P0 mendarat lebih dulu sebagai PR sendiri |

---

## 1. Problem

Kerangka SA 540 di Asseris sudah lengkap secara bentuk: registri estimasi ter-persist per-perikatan, pemetaan kompleksitas × subjektivitas, empat jalur respons ¶18–21, pita titik-manajemen-vs-rentang, panel bias ¶32, dan fungsi sensitivitas murni yang teruji. PSAK 68 menutup hierarki Level 1/2/3, roll-forward ¶93e, dan lineage hulu–hilir.

Yang tidak ada adalah **kemampuan gagal**. Lima cacat terverifikasi:

### P0-a — Selisih estimasi tidak pernah sampai ke SAD

[`view_sa540.tsx:390`](../migration/src/view_sa540.tsx:390) menyatakan selisih titik manajemen vs titik tengah "dicatat sebagai **kemungkinan salah saji** ke SAD Ledger". Grep seluruh repo atas `estimates.v1` menghasilkan tiga situs saja: deklarasi scope di [`contexts.tsx:371`](../migration/src/contexts.tsx:371), pembacaan oleh modulnya sendiri di [`view_sa540.tsx:102`](../migration/src/view_sa540.tsx:102), dan PRD lain. **Nol konsumen.** Kalimat itu narasi, bukan aliran data.

Akibatnya salah saji judgmental atas estimasi tidak pernah masuk agregasi SA 450. Yang menutupi gejalanya: [`view_sad.tsx:32`](../migration/src/view_sad.tsx:32) memuat `M-04 · Selisih estimasi cadangan kerugian penurunan nilai (PSAK 71)` sebagai **baris seed yang dipaku** — angka Rp 680 jt yang tidak berasal dari registri estimasi mana pun. Ledger tampak benar justru karena hasilnya dikarang.

### P0-b — Kesimpulan PSAK 68 tidak bergantung pada bukti

[`view_psak68.tsx:676`](../migration/src/view_psak68.tsx:676) menampilkan "Penetapan level, teknik & input dinilai **wajar** … tidak ada usulan AJE atas pengukuran NW" sebagai teks statis. Ia tampil apa adanya meskipun `score` = 0% (nol dari sebelas prosedur audit diselesaikan). Checklist pengungkapan ¶91–99 di [`view_psak68.tsx:502`](../migration/src/view_psak68.tsx:502) di-hardcode `ok: true` untuk ketujuh butirnya — tidak ada keadaan dunia yang membuatnya merah.

Ini kelas cacat yang sama dengan chip hijau di atas peringatan Rp 11.540 jt (#169) dan panel "8/8 lolos" di atas LPE yang tak foot (#178).

### P1-a — Rentang auditor adalah plug

[`view_sa540.tsx:237`](../migration/src/view_sa540.tsx:237): `lo` dan `hi` adalah dua `<input type="number">` bebas. Tidak ada yang merekam asumsi mana yang menghasilkan batas itu. Seluruh mesin hilir — posisi pita, verdict sensitivitas, dan (setelah P0-a) besaran salah saji — bersandar pada dua angka yang boleh diketik tanpa dasar.

Ini identik dengan plug PSAK 24 Rp 6.554 jt berlabel "catatan 13" (#178) dan saldo awal DTA (#153): angka yang terlihat berwibawa karena diberi label standar.

### P1-b — Sensitivitas menghitung dari angka yang diketik

[`estimate_sensitivity.ts`](../migration/src/estimate_sensitivity.ts) benar: fungsi murni, deterministik, teruji unit. Masalahnya di masukannya — `perPct` ("dampak Rp jt per 1% perubahan asumsi") adalah input manual di [`view_sa540.tsx:422`](../migration/src/view_sa540.tsx:422). Auditor mengetik sensitivitas alih-alih menurunkannya. Verdict "titik baru tetap dalam rentang auditor — estimasi **tahan** terhadap perubahan asumsi" karena itu dapat hijau di atas angka karangan, dan sebaliknya.

### P1-c — Telaah retrospektif hanya kalimat

Telaah retrospektif adalah bukti bias terkuat yang dimiliki auditor (¶32 + SA 240 ¶32b). Hari ini ia hidup sebagai teks bebas di kolom catatan: `"CKPN PY understated 42% terhadap realisasi"` ([`view_sa540.tsx:35`](../migration/src/view_sa540.tsx:35)) dan `"selisih PY −6%"` ([`:27`](../migration/src/view_sa540.tsx:27)). Tidak ada estimasi PY, tidak ada realisasi, tidak ada selisih terhitung. Angka 42% tidak dapat dibantah karena tidak berasal dari apa pun.

### P2 — Jalur pakar tanpa gerbang

`approach: 'Gunakan pakar (SA 620)'` dapat dipilih, dan panel "Penggunaan Pakar (SA 620)" di [`view_sa540.tsx:399`](../migration/src/view_sa540.tsx:399) menampilkan empat baris centang hijau yang **di-hardcode `ok: true`** — kompetensi, objektivitas, ruang lingkup, kewajaran temuan. Tidak ada dokumen yang dituntut, tidak ada evaluasi yang terisi, dan tidak ada yang menghalangi sign-off SA 230 atas kertas kerja yang jalur responsnya bergantung sepenuhnya pada pekerjaan pihak ketiga yang tak pernah dievaluasi.

### Temuan metodologis — dasar pengukuran salah saji keliru

Terpisah dari lima cacat di atas, dan lebih mendasar: [`view_sa540.tsx:354`](../migration/src/view_sa540.tsx:354) menghitung salah saji sebagai `mgmt − midpoint`.

Itu tidak sesuai SA 540/450. Bila titik manajemen berada **di dalam** rentang auditor yang wajar, rentang itu sendirilah zona yang dapat diterima — tidak ada salah saji untuk diakumulasi. Salah saji timbul hanya ketika titik manajemen berada **di luar** rentang, dan besarannya adalah jarak ke **batas terdekat**, bukan ke titik tengah.

Rumus midpoint melebih-lebihkan salah saji secara sistematis pada setiap estimasi yang sebetulnya wajar. Yang seharusnya diukur terhadap titik tengah adalah **arah** — kecenderungan titik manajemen berada di sisi yang menguntungkan laba secara berulang — dan itu adalah indikator bias ¶32, bukan salah saji ¶450. Koreksi ini justru memperbaiki keduanya sekaligus dan menjadi bagian P0-a.

---

## 2. Objective

Membuat setiap klaim tentang estimasi akuntansi **dapat gagal**: rentang yang punya turunan, sensitivitas yang dihitung, selisih yang mengalir ke SA 450 dengan dasar pengukuran yang benar, kesimpulan yang bergantung pada bukti, dan jalur pakar yang bergerbang.

**Bukan** membangun kemampuan menghitung nilai wajar. Batas Tier A/B/C di §5 mengikat.

---

## 3. Success Criteria (semuanya harus DAPAT GAGAL)

Tiap kriteria disertai keadaan **hari ini**, sehingga keberhasilan tak dapat diklaim tanpa perubahan perilaku nyata.

| # | Probe | Hari ini | Setelah |
|---|---|---|---|
| K1 | `grep -rn "estimates.v1" migration/src` | 2 situs (deklarasi + modulnya sendiri) | ≥ 4 — termasuk konsumen SAD |
| K2 | Set `E-01` → `mgmt` di luar rentang (mis. 4.000 vs lo 4.600) | SAD tak berubah | baris turunan muncul di SAD, `pbt` = −600 jt **Rp penuh**, `type: 'Judgmental'`, `qual:['estimate']` |
| K3 | Set `E-01` → `mgmt` **di dalam** rentang | selisih vs midpoint dilaporkan sbg salah saji | **nol** salah saji; tercatat sbg indikator arah di panel bias |
| K4 | `grep -c "M-04" migration/src/view_sad.tsx` | 1 (baris seed dipaku) | 0 — digantikan baris turunan dari registri |
| K5 | Hapus seluruh isi registri estimasi | SAD tetap menampilkan M-04 Rp 680 jt | baris estimasi hilang dari SAD; total ter-recompute |
| K6 | PSAK 68 dgn 0/11 prosedur selesai | panel "dinilai **wajar** … tidak ada usulan AJE" tampil | panel menyatakan kesimpulan **belum dapat ditarik**; nada & warna mengikuti `score` |
| K7 | Kosongkan bukti pengungkapan ¶93e | 7/7 checklist hijau | butir tanpa bukti menjadi terbuka (amber), bukan hijau |
| K8 | Ubah `wacc` nilai pakai dari 13,5% → 15,0% | tak ada UI-nya; `P48` konstanta modul | headroom & rentang auditor E-05 ter-recompute; tersimpan per-perikatan |
| K9 | Isi driver asumsi E-05, jangan isi `lo`/`hi` | mustahil — `lo`/`hi` wajib diketik | `lo`/`hi` **terderivasi** dari skenario; field manual jadi read-only + jejak "diturunkan dari N skenario" |
| K10 | Registri PY kosong, klaim "understated 42%" | tampil sbg fakta di panel bias | butir retrospektif menyatakan **tak dapat dihitung**; 42% tak muncul dari mana pun |
| K11 | Estimasi ber-`approach: 'Gunakan pakar (SA 620)'` tanpa dokumen pakar | sign-off SA 230 berhasil; 4 centang hijau | sign-off **ditolak**; centang mencerminkan isian nyata |
| K12 | `npm run verify` dari root | 8/8 hijau | 8/8 hijau — nol regresi, termasuk `budget-bundle` & ratchet `:any` |
| K13 | Uji unit `canon_estimates.test.ts` untuk batas: mgmt = lo, mgmt = hi, lo = hi, rentang terbalik (lo > hi) | tak ada | ada & lulus; rentang terbalik ditolak, bukan menghasilkan salah saji negatif |

---

## 4. Scope — urutan = urutan PR

### PR-1 (P0) · Selisih estimasi mengalir ke SA 450, dengan dasar yang benar

1. Modul murni baru [`migration/src/canon_estimates.ts`](../migration/src/canon_estimates.ts) — satu-satunya rumah aturan pengukuran salah saji estimasi:
   - `estimateMisstatement(mgmt, lo, hi)` → `{ amount, basis: 'below-lo' | 'above-hi' | 'within-range', biasDirection }`. **Batas terdekat**, bukan midpoint. Di dalam rentang → `amount = 0`.
   - `estimateMisstatements(register)` → `SadEntry[]` turunan, id deterministik (`EST-<id estimasi>`), `type: 'Judgmental'`, `qual: ['estimate']`, `disp: 'uncorrected'` awal.
   - **Konversi satuan eksplisit di satu tempat**: registri SA 540 dalam **Rp juta**, `SadEntry.pbt`/`na` dalam **Rp penuh**. Faktor `1_000_000` hidup hanya di sini, ber-uji unit. (Jebakan yang sama sudah menggigit di `mat.pm` juta vs `amount` penuh.)
2. **SAD membaca, tidak menyalin.** `view_sad.tsx` menggabungkan baris turunan secara read-only ke `items` — bukan menulis ke `sadItems.v1`. SSOT tunggal tetap registri estimasi; tak ada jalur tulis baru, tak ada RBAC baru, tak ada sinkronisasi yang bisa menyimpang.
3. **Cabut `M-04` dari `SAD_SEED`** ([`view_sad.tsx:32`](../migration/src/view_sad.tsx:32)) — digantikan turunan E-01. Tanpa ini, dobel hitung.
4. Baris turunan ditandai visual sebagai turunan & tak dapat disunting di SAD; penyuntingannya di SA 540.
5. Perbaiki narasi [`view_sa540.tsx:390`](../migration/src/view_sa540.tsx:390) agar menyatakan dasar yang sebenarnya dipakai.

### PR-2 (P0) · Kesimpulan PSAK 68 bergantung pada bukti

6. Panel kesimpulan ([`view_psak68.tsx:676`](../migration/src/view_psak68.tsx:676)) menjadi fungsi dari `score` + keberadaan bukti pakar. Di bawah ambang: "kesimpulan belum dapat ditarik", bukan "wajar".
7. Checklist ¶91–99 ([`:502`](../migration/src/view_psak68.tsx:502)) menjadi turunan: tiap butir hijau hanya bila sumbernya ada (roll-forward menutup, sensitivitas terisi, dst.). Butir tanpa bukti = terbuka.
8. Empat centang "Penggunaan Pakar (SA 620)" di SA 540 ([`:399`](../migration/src/view_sa540.tsx:399)) menjadi state nyata, bukan literal — menyiapkan gerbang PR-5.

### PR-3 (P1 · Tier B) · Nilai pakai dapat dikemudikan auditor

9. `P48` ([`canon_part2.ts:435`](../migration/src/canon_part2.ts:435)) berhenti menjadi konstanta modul. `psak48()` menerima parameter opsional; nilai default = seed sekarang (nol perubahan angka bila tak di-override).
10. Kunci persist baru `viuParams.v1`, **engagement-scoped** ([`contexts.tsx`](../migration/src/contexts.tsx) daftar scope) — `{ wacc, growth, terminal, years, cf1 }` per UPK.
11. `view_psak48.tsx` mendapat kontrol asumsi + jejak siapa/kapan mengubah. `valueInUse` tidak disentuh — matematikanya sudah benar dan teruji.
12. Label hasil: **"ekspektasi independen auditor"**, bukan "nilai wajar". Ini pembeda Tier B dari Tier C dan harus terbaca di UI.

### PR-4 (P1) · Rentang & sensitivitas punya turunan

13. Registri estimasi memperoleh `derivation`: daftar skenario `{ label, driver, shift, resultingValue }`. `lo` = hasil terendah, `hi` = tertinggi — **terhitung**, bukan diketik.
14. Untuk estimasi bertipe DCF (E-05 goodwill), skenario dijalankan lewat `valueInUse` dari PR-3 → rentang auditor terderivasi penuh dari asumsi.
15. Estimasi non-DCF tetap boleh rentang manual, tetapi **wajib beralasan**: field dasar terisi, dan tanpa dasar ditandai `tak berdasar` — terlihat di panel & memo PDF.
16. `perPct` sensitivitas ([`:422`](../migration/src/view_sa540.tsx:422)) diturunkan dari `derivation` bila tersedia; input manual hanya fallback yang ditandai.
17. Migrasi maju: state lama tanpa `derivation` tetap terbaca (pola `normScenarios` going concern) dan ditandai warisan — **tidak** digugurkan massal.

### PR-5 (P1+P2) · Telaah retrospektif & gerbang pakar

18. Sub-key `retrospective` pada `estimates.v1`: `{ pyEstimate, actual, variancePct, source }` per estimasi. Selisih **terhitung**; klaim "42%" harus berasal dari dua angka atau tidak muncul.
19. Butir bias ¶32 yang bersumber retrospektif menjadi turunan, bukan teks bebas.
20. **Gerbang sign-off**: estimasi ber-`approach: 'Gunakan pakar (SA 620)'` menuntut dokumen pakar di DMS + evaluasi SA 500 ¶8 terisi sebelum sign-off SA 230 kertas kerja `sa540`. Memakai pola gerbang yang sudah ada (`guardSignoffWrite` / gerbang etik-AML), bukan mekanisme baru.

---

## 5. Non-Scope (mengikat)

Tidak dibangun, sekarang maupun nanti, tanpa PRD terpisah yang membalik keputusan ini:

- **Mesin valuasi aktuaria** (PSAK 24 · projected unit credit) — Tier C.
- **Appraisal properti** (SPI/IVS, DRC penuh) — Tier C.
- **Pricing derivatif** (kurva forward, OIS, CVA/DVA) — Tier C.
- **Model ECL perbankan** (PD × LGD × EAD multi-skenario) — Tier C.
- **Integrasi data pasar berlisensi** apa pun (Bloomberg/Refinitiv/kurva yield).
- `FV_PORTFOLIO` ([`canon_part2.ts:343`](../migration/src/canon_part2.ts:343)) **tetap seed dari pakar**. Bahwa PSAK 68 mengagregasi alih-alih mengukur adalah benar dan disengaja — bukan cacat, dan tidak diperbaiki.

Alasan garis ini: tiap mesin hitung dalam aplikasi audit menjadi objek pengendalian mutu ISQM 1 — wajib divalidasi, diberi versi, diuji regresi, dan dipertahankan saat asumsi standar berubah. Nilai pakai lolos karena matematikanya deterministik, inputnya lima, dan **mesinnya sudah ada serta teruji** ([`valueInUse`, canon_part2.ts:447](../migration/src/canon_part2.ts:447)). Empat yang lain tidak lolos satu pun syarat itu.

---

## 6. Constraints

1. **`master` selalu hijau (R-7).** `npm run verify` 8/8 tiap PR. Repro cacat yang belum ditutup memakai `it.fails()` + `// KARANTINA s/d <tanggal>`.
2. **Satuan.** Registri estimasi & kanon PSAK dalam **Rp juta**; `SadEntry.pbt`/`na` & materialitas penuh dalam **Rp penuh**. Konversi hanya di `canon_estimates.ts`.
3. **SSOT.** SAD **membaca** registri; tidak ada salinan. Tidak ada angka estimasi kedua di mana pun.
4. **Ratchet `:any`.** `:any` baru = lint merah. Catatan: 19 `:any` masih di atas baseline dari commit lintas-platform — jangan menambah. `view_psak68.tsx` memakai `any` cukup banyak (`P68Card`, `(I as any)`); menyentuhnya berisiko **meng-un-suppress seluruh berkas** (jebakan #178). Sinkronkan via `npm run lint:any-baseline` bila perlu.
5. **Skala tipografi mengikat** (8 ukuran) dan **token warna semantik** — negatif pakai `--num-neg`, bukan `--red`.
6. **Backward-compat persist.** State lama harus terbaca; normalizer default dari seed.
7. Registri status: perbarui [`docs/PRD-REGISTRY.md`](PRD-REGISTRY.md) saat status berubah.

---

## 7. Existing Solutions (dipakai ulang, bukan dibangun ulang)

| Aset | Lokasi | Dipakai untuk |
|---|---|---|
| `estimateSensitivity` | [`estimate_sensitivity.ts`](../migration/src/estimate_sensitivity.ts) | mesin sensitivitas — sudah murni & teruji, hanya masukannya yang diperbaiki |
| `valueInUse` | [`canon_part2.ts:447`](../migration/src/canon_part2.ts:447) | seluruh Tier B — DCF sudah ada, tinggal dibuka parameternya |
| `reconcileUncorrectedMisstatements` | [`canon_validation.ts`](../migration/src/canon_validation.ts) | rekonsiliasi SA 450 yang sudah dipakai SAD |
| `SadEntry` | [`canon_validation.ts`](../migration/src/canon_validation.ts) | bentuk baris turunan — tak ada tipe baru |
| Pola `useAmsPersist` + scope map | [`contexts.tsx:371`](../migration/src/contexts.tsx:371) | `viuParams.v1` mengikuti pola `sadItems.v1` |
| Pola gerbang sign-off | `guardSignoffWrite` / gerbang etik-AML | gerbang pakar PR-5 |
| Pola normalizer backward-compat | `normScenarios` (going concern) | migrasi `derivation` & `retrospective` |
| Pola PRD probe-table | [`prd-wp-signoff-integrity.md`](prd-wp-signoff-integrity.md) | struktur kriteria dokumen ini |

---

## 8. Risks

| # | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| R1 | Dobel hitung salah saji (M-04 seed + turunan E-01) | SAD melebih-lebihkan; opini bisa salah | K4 & K5 memaksa pencabutan seed; uji unit atas total |
| R2 | Salah satuan juta ↔ penuh | salah saji meleset 10⁶× — kelas jebakan yang sudah pernah terjadi | konversi di satu fungsi, ber-uji unit; K2 menguji nilai persis |
| R3 | Koreksi midpoint → batas-terdekat **menurunkan** salah saji terakumulasi | tampak seperti pelonggaran | disengaja & benar; arah dipindah ke bias ¶32, bukan dihilangkan. Perlu keputusan eksplisit Ari (Q1) |
| R4 | Menyentuh `view_psak68.tsx` meng-un-suppress `:any` seluruh berkas | lint merah beruntun | ubah seminimal mungkin; jalankan `lint:any-baseline`; pertimbangkan pecah komponen |
| R5 | Membuka `P48` mengubah angka yang sudah dipaku uji regresi kanon | snapshot `canon_regression.test.ts` merah | default = seed sekarang; nol perubahan tanpa override eksplisit |
| R6 | Gerbang pakar memblokir sign-off pada perikatan berjalan | tim tertahan | gerbang hanya untuk estimasi ber-jalur SA 620; pesan penolakan menyebut dokumen yang kurang |
| R7 | Rentang terderivasi memaksa pengisian ulang registri lama | friksi migrasi | state warisan ditandai, tidak digugurkan (butir 17) |
| R8 | Bundle membengkak (gerbang `budget-bundle` CI) | gerbang merah | modul kanon murni kecil; PSAK 48 & SA 540 sudah lazy |

---

## 9. Implementation Plan

| PR | Isi | Gerbang |
|---|---|---|
| PR-1 | `canon_estimates.ts` + wire SAD + cabut M-04 + koreksi dasar pengukuran | K1–K5, K13, K12 |
| PR-2 | Kesimpulan & checklist PSAK 68 jadi turunan | K6, K7, K12 |
| PR-3 | Tier B — `viuParams.v1` + parameterisasi `psak48()` | K8, K12 + snapshot kanon utuh |
| PR-4 | `derivation` rentang & sensitivitas terderivasi | K9, K12 |
| PR-5 | Retrospektif terhitung + gerbang pakar SA 620 | K10, K11, K12 |

Tiap PR: `npm run verify` hijau sebelum dikirim, dan **verifikasi hidup** (bukan hanya uji) atas probe yang relevan — pola yang menangkap #175/#178 ketika 1.128 uji melewatkannya.

---

## 9a. Hasil pelaksanaan (2026-08-12)

Seluruh arc dieksekusi dalam satu sesi. Tiap PR lolos `npm run verify` (8/8 gerbang)
**dan** verifikasi hidup pada ENG-2025-014 (peran Audit Manager) — bukan hanya uji.

| PR | Commit | Modul kanon baru | Probe |
|---|---|---|---|
| [#182](https://github.com/ari1945/Asseris/pull/182) | `cb6c0b9` | `canon_estimates.ts` (20 uji) | K1–K5, K13 |
| [#183](https://github.com/ari1945/Asseris/pull/183) | `af5a436` | `canon_fv_disclosure.ts` (18) · `canon_expert_eval.ts` (13) | K6, K7 |
| [#184](https://github.com/ari1945/Asseris/pull/184) | `b4e9c4d` | `canon_viu.ts` (16) | K8, R5 |
| [#185](https://github.com/ari1945/Asseris/pull/185) | `bd20d5a` | `canon_range.ts` (22) | K9, butir 13–17 |
| [#186](https://github.com/ari1945/Asseris/pull/186) | `65de432` | `canon_retrospective.ts` (14) + `estimate_gate.tsx` | K10, K11 |

Uji frontend 1160 → **1250**. Ratchet `no-explicit-any` turun (`view_sad.tsx` 42 → 40).

**Temuan yang tidak diantisipasi PRD ini:**

1. **Pencabutan `M-04` membalik kesimpulan opini demo.** Agregat turun 3.270 → 2.590 jt,
   yakni **106% → 84%** materialitas keseluruhan. Angka karangan Rp 680 jt selama ini
   mendorong perikatan demo ke rekomendasi opini modifikasian SA 705.
2. **Tier B jauh lebih kecil dari perkiraan, jangkauannya jauh lebih besar.** `valueInUse`
   sudah ada & teruji; yang hilang hanya kemudinya. Setelah dibuka, satu perubahan WACC
   menggerakkan PSAK 48 → rentang SA 540 → salah saji SAD (13,5%→15,0% ⇒ agregat
   84% → **136% OM**).
3. **Rentang E-05 yang diketik `0–1.800` meremehkan sebarannya sendiri.** Sensitivitas
   yang diakui auditor menyiratkan `0–8.830` pada asumsi dasar — 4,9× lebih lebar.

**Keputusan desain yang diambil saat pelaksanaan (di luar §4):**

- `bsEffect` **tidak** diturunkan untuk baris SAD turunan: efek neraca estimasi menuntut
  deklarasi sisi aset/liabilitas *dan* klasifikasi lancar/tidak-lancar yang tak ada di
  registri. Mekanisme `liquidity.missing` yang sudah ada menahan proyeksi rasio lancar
  dan menyebut barisnya — lebih benar daripada menerka tanda.
- Rentang tak berdasar **tetap dipakai** mengukur salah saji, hanya ditandai.
  Menggugurkannya akan menghapus temuan nyata dari agregasi SA 450.
- Skenario `viu` **tidak di-persist** — dibangkitkan tiap pembacaan agar tautannya hidup.
- Tautan laporan pakar memakai **`docUid`**, bukan nama berkas, sehingga tautan putus
  begitu dokumennya dicabut dari bukti.

**Utang yang tersisa:** tinjauan visual Ari baru dilakukan untuk #182; panel baru yang
paling layak ditinjau adalah **Dasar Rentang** (SA 540 · tab Inventaris) dan **Telaah
Retrospektif** (tab Bias). Penegakan gerbang pakar ada di **lapisan UI**, sejajar dengan
gerbang etik/AML — padanan server-side belum ada (lihat catatan lingkup `ethics_gate.tsx`).

---

## 10. Open Questions — SEMUA TERJAWAB



> Ari menjawab ketiganya dengan **"Proceed."** (2026-08-12): Q1 = batas terdekat ·
> Q2 = 11/11 prosedur + bukti pakar · Q3 = ya, nilai pakai menurunkan rentang E-05.
> Ketiganya terimplementasi & terverifikasi hidup.

**Q1 — Dasar pengukuran salah saji (mengunci PR-1).**
Rekomendasi saya: **batas terdekat**, `0` bila titik manajemen di dalam rentang; kecenderungan arah terhadap titik tengah dipindah menjadi indikator bias ¶32. Ini sesuai SA 540/450 dan memperbaiki dua hal sekaligus. Konsekuensi yang harus Anda terima secara sadar: salah saji terakumulasi **turun**, dan pada data demo M-04 Rp 680 jt kemungkinan menjadi nol. Setuju?

**Q2 — Ambang kesimpulan PSAK 68 (mengunci PR-2).**
Pada `score` berapa panel boleh menyatakan kesimpulan? Rekomendasi: kesimpulan positif hanya pada **11/11 prosedur + bukti pakar ada**; di bawah itu "belum dapat ditarik". Alternatifnya ambang lebih longgar (mis. ≥ 80%) yang lebih ramah alur kerja tetapi mengembalikan sebagian masalah aslinya.

**Q3 — Cakupan Tier B (mengunci PR-3/PR-4).**
Nilai pakai dipakai untuk goodwill/UPK (PSAK 48) — itu jelas. Pertanyaannya: apakah ia juga menjadi mesin penurun rentang auditor E-05 di SA 540 (butir 14), sehingga satu perubahan WACC menggerakkan PSAK 48 **dan** rentang SA 540 **dan** salah saji SAD sekaligus? Rekomendasi saya **ya** — justru itu nilainya. Tapi ini menaikkan taruhan tiap perubahan asumsi, dan Anda berhak menolaknya.

---

## 11. Catatan eksekusi

Saya siap mulai PR-1 begitu ada **"Proceed."**. Bila Q1 belum Anda putuskan, PR-1 tetap dapat berjalan dengan dasar batas-terdekat di belakang flag internal — tapi saya tidak menyarankannya: dasar pengukuran salah saji adalah keputusan metodologi, bukan detail implementasi, dan tidak seharusnya mendarat diam-diam.
