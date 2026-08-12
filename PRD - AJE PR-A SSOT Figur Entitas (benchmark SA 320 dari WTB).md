# PRD — AJE PR-A: SSOT Figur Entitas (benchmark SA 320 ditarik dari WTB)

**Status:** **Implemented** — commit db41dca, branch feat/aje-pr-a-entity-figures

**Tanggal:** 2026-07-26 · **Status:** ✅ **TERIMPLEMENTASI** — commit `db41dca`, branch `feat/aje-pr-a-entity-figures` (belum di-push)
**Q1 DIPUTUSKAN (Ari, 2026-07-26): koherensi** — konstanta modul yang dikoreksi,
seed WTB TIDAK diskalakan. Konsekuensi diterima: OM turun, tampilan demo bergeser.
Keputusan ini merambat ke Q2 (§11) — rekomendasi Q2 saya **ubah** karenanya.
**Basis:** branch `feat/audit-context-value-types` = `5a81dd2` (PR-6d)
**Pendahulu:** `PRD - WTB PR-6 Otoritas Sign-off Materialitas, SSOT Cache-Dingin & Tipe Konteks.md` ·
memori `asseris-aje-module-eval`, `asseris-materiality-om-split`, `asseris-wtb-eval-pr1-pr2`
**Turunan dari:** evaluasi modul AJE 2026-07-26 (temuan P0 pertama)

---

## 1 · Problem

Tidak ada satu pun angka laba entitas yang disepakati sistem ini. Saya menemukan
**empat nilai PBT berbeda untuk satu perikatan yang sama** (ENG-2025-014, FY2025),
masing-masing mengklaim mewakili "laba sebelum pajak" entitas yang sama:

| Nilai | Sumber | Dipakai untuk |
|---|---|---|
| **Rp 29,690 M** | turunan WTB, kolom `unadj` | — (tak ada yang membacanya) |
| **Rp 22,780 M** | turunan WTB, kolom `adj` | — (tak ada yang membacanya) |
| **Rp 48,500 M** | `canon_base.ts:112` `FISCAL.pbt` | rekonsiliasi fiskal PSAK 46 |
| **Rp 85,200 M** | `view_materiality.tsx:19` `BENCHMARKS.pbt` | **materialitas SA 320** |
| *(Rp 89,140 M)* | `view_aje.tsx:26` `AJE_PBT_UNADJ` | jembatan laba modul AJE; hulu dari 85,200 |

Angka yang **tidak** ditarik dari buku besar adalah justru angka yang menentukan
materialitas. Rantainya:

```
view_aje.tsx:26   AJE_PBT_UNADJ = 89.140 (konstanta)
   └→ view_sad.tsx:57        FS.pbt          = 85.200 (konstanta, = 89.140 − 3.940 AJE posted)
         └→ view_materiality.tsx:19  BENCHMARKS.pbt = 85.200 (konstanta)
               └→ window.BENCHMARKS → canon_part4.ts:372
                     └→ calcOM = 85.200 × 5% = OM Rp 4.260 jt
```

### 1.1 · Besaran kesalahan

Uji koherensi untuk menentukan angka mana yang benar:

- WTB memberi marjin bruto **30,7%** dan PBT **8,9%** dari pendapatan — profil wajar
  untuk manufaktur.
- PBT 85,200 atas pendapatan 331,900 = **25,7%**, yang menuntut opex mendekati nol.
- Artikulasi neraca↔laba-rugi: pergerakan saldo laba LY→CY = **Rp 18,094 M**;
  laba neto unadjusted turunan WTB = 29,690 − 11,240 = **Rp 18,450 M**. Selisih
  Rp 0,356 M (2%) — konsisten dengan dividen/OCI kecil.

**Kesimpulan: WTB koheren; konstanta modul tidak.**

| Dasar PBT | OM @5% | PM @75% | CTT @5% | Kelebihan OM sekarang |
|---|---|---|---|---|
| Hardcode 85,200 (**berlaku sekarang**) | 4.260 | 3.195 | 213 | — |
| **WTB unadjusted 29,690 → basis terpilih (Q2)** | **1.484** | **1.113** | **74** | **2,87×** |
| WTB adjusted 22,780 | 1.139 | 854 | 57 | 3,74× |
| FISCAL 48,500 | 2.425 | 1.819 | 121 | 1,76× |

Konsekuensi audit langsung: ambang lolos SA 450 terlalu tinggi, agregat salah saji
dibandingkan terhadap OM yang salah, dan ukuran sampel SA 530 (TM = PM) di-scope
terlalu longgar — arah yang sama, dan **bertumpuk**, dengan cacat P-0 di PRD PR-6.

### 1.2 · Tabel benchmark memakai dasar yang campur aduk

Lebih halus dari sekadar "satu angka salah". Saya bandingkan kelima benchmark
terhadap WTB:

| Benchmark | Hardcode | WTB unadj | WTB adj | Verdict |
|---|---|---|---|---|
| Total Ekuitas | 160,456 | 160,457 | 160,457 | ✅ tie |
| Total Pendapatan | 331,900 | **331,900** | 330,050 | ⚠️ tie ke **unadjusted** |
| Total Aset | 316,558 | 322,488 | **316,558** | ⚠️ tie ke **adjusted** |
| Laba Bruto | 99,420 | 101,760 | 96,450 | ❌ tak tie ke mana pun |
| Laba Sebelum Pajak | 85,200 | 29,690 | 22,780 | ❌ tak tie ke mana pun |

Pendapatan diambil dari basis **unadjusted**, total aset dari basis **adjusted**,
dalam satu tabel yang sama. Auditor yang berpindah benchmark berpindah basis tanpa
diberi tahu. Ini cacat **metodologi**, bukan sekadar cacat angka: SA 320 ¶A5
menghendaki tolok ukur pada basis yang konsisten dan dinyatakan.

### 1.3 · Benchmark buta-perikatan

`BENCHMARKS` adalah konstanta tingkat-modul yang dipublikasikan ke `window`
(`view_materiality.tsx:315`) lalu dibaca `canon_part4.ts:372`. Sementara WTB
**per-perikatan** (`wtbImport`/`wtbOverrides` di `contexts.tsx:772,785`).
Akibatnya kelima perikatan di `AMS.ENGAGEMENTS` berbagi satu tabel benchmark
statis yang diturunkan dari satu neraca saldo. Perikatan yang mengimpor TB
sendiri lewat W-WTB·1 tetap memakai benchmark milik ENG-2025-014.

### 1.4 · Mengapa lolos sampai sekarang

`ENG-2025-014.materiality = 4_250_000_000` (`data_part1.ts:42`) — disetel agar
cocok dengan `calcOM` fantasi (4.260). Detektor `drift` di `canon_part4.ts:382`
memicu pada rasio > 0,5%; selisih 4.250 vs 4.260 = **0,235%** → **tak pernah
menyala**. Seed perikatan ditala ke angka yang salah, sehingga satu-satunya alarm
yang bisa menangkapnya justru dibungkam.

---

## 2 · Objective

Satu figur entitas, satu sumber: **WTB**. Setiap benchmark SA 320, setiap jembatan
laba, dan setiap rasio likuiditas ditarik dari `useAudit().wtb` melalui selector
kanonik murni — bukan konstanta yang disalin tangan.

Mengapa ini objective yang benar: `AMS_CANON` sudah menjadi SSOT untuk PSAK 14/16/22/
46/48/58/65/71/73. Figur entitas tingkat-atas (PBT, laba bruto, aset lancar,
liabilitas lancar, total aset, ekuitas) adalah satu-satunya lapisan yang **belum**
punya selector — sehingga tiap modul mengarangnya sendiri. Ini menutup lubang
terakhir di lapisan itu.

---

## 3 · Success Criteria

Terukur, dapat diverifikasi di CI:

1. `grep -nE '(8[59]_[12][40]0|112_300|81_400|160_456|99_420|316_558|331_900)_000_000'`
   atas `migration/src/**` → **nol** kecocokan di luar `data_part1.ts` (seed WTB) dan
   fixture uji.
2. `entityFigures(FIXTURE_WTB)` punya uji unit yang memaku kesepuluh field terhadap
   nilai turunan tangan, termasuk uji **artikulasi**: |ΔSaldo Laba − Laba Neto| ≤ 2%.
3. Mengubah satu baris WTB fixture menggeser OM, jembatan laba AJE, dan rasio lancar
   dalam satu arah yang konsisten — dibuktikan satu uji integrasi lintas-modul.
4. Detektor `drift` menyala untuk ENG-2025-014 **sebelum** seed perikatan diperbarui,
   dan padam **sesudahnya** (membuktikan alarm hidup, bukan dibungkam ulang).
5. Modul AJE, SAD, dan Materialitas menampilkan **satu** nilai PBT dilaporkan yang
   sama — diverifikasi lewat pembacaan DOM, bukan asumsi.
6. `npm run typecheck` 0 error · `npm test` hijau · `npm run lint` tanpa suppression baru.

---

## 4 · Scope

**Baru — `canon_base.ts`:**
```ts
export interface EntityFigures {
  revenue, cogs, grossProfit, opex, financeCost,
  pbt, taxExpense, netIncome,            // laba rugi
  curAssets, curLiab, currentRatio,      // likuiditas
  totalAssets, equity,                   // neraca
}
export function entityFigures(wtb: WTB | undefined, basis: 'unadj' | 'adj'): EntityFigures
export function benchmarksFromWTB(wtb: WTB | undefined, basis): Benchmark[]
```
Murni, tanpa efek samping, mengikuti pola `figuresFromWTB()` yang sudah ada
(`canon_base.ts:38`) — yang sengaja **tidak** mengekspos pos-pos ini hari ini.

**Diubah:**
- `view_aje.tsx` — hapus `AJE_PBT_UNADJ` & `AJE_FS`; tarik dari selector.
- `view_sad.tsx` — hapus `FS`; tarik dari selector.
- `view_materiality.tsx` — `BENCHMARKS` dari konstanta → turunan WTB reaktif.
- `canon_part4.ts` — `calcOM` menerima `benches` lewat **argumen eksplisit**
  (`opts.benchmarks`), tak lagi lewat `window.BENCHMARKS`. Mengikuti arah PR-6b
  ("panggil canon dengan argumen EKSPLISIT").
- `data_part1.ts` — `ENGAGEMENTS[].materiality` diselaraskan ke dasar baru.
- `canon_part5.test.ts`, `canon_part4.test.ts`, `canon_selectors.test.ts`,
  `W0-BASELINE.md` — perbarui oracle.

**Keputusan basis (Q2, direvisi pasca-Q1):** benchmark dihitung pada **`unadj`** —
figur yang dilaporkan klien, yaitu yang tersedia saat perencanaan (SA 320 ¶10, ¶A5).
Basis dinyatakan eksplisit di UI Materialitas, dan `entityFigures()` tetap menerima
parameter `basis` agar revisi SA 320 ¶12-13 dapat dihitung dan dibandingkan.

Selector menyediakan **keduanya**; yang mengikat untuk OM adalah `unadj`. Selisih
terhadap `adj` disajikan sebagai **pemicu revisi** ("figur final bergeser X% dari
dasar perencanaan — pertimbangkan revisi OM"), bukan sebagai perhitungan ulang
otomatis. Alasan penuh di §11 Q2.

---

## 5 · Non-Scope

- **`FISCAL.pbt = 48.500` TIDAK disentuh.** Lihat §9 R-1 — ini risiko utama.
- Gerbang otorisasi posting AJE → **PR-B** (PRD terpisah).
- Rekonsiliasi SA 450 cache-dingin & pemeriksaan nilai → **PR-C**.
- Pembuangan `AJE_META.pbt`/`curEff` → **PR-D**.
- Presedens `omFull = override ?? engMateriality ?? calcOM` → **milik PR-6 P-0**,
  bukan PRD ini.
- Benchmark per-perikatan penuh (§1.3): PRD ini membuat selectornya *mampu*
  per-perikatan, tapi tidak memigrasikan kelima perikatan seed.

---

## 6 · Constraints

- ~~**Tak boleh mendahului PR-6.**~~ **DIKOREKSI saat implementasi:** footprint #138
  (PR-6d) ternyata `contexts.tsx` · `view_evidence` · `view_execution` · `view_psak71` ·
  `view_risk` · `view_wp` — **nol overlap** dengan berkas PR-A. Kendala ini ditulis
  sebelum footprint-nya diperiksa; PR-A dicabang dari `master` `31e2ef2` dan berdiri
  sendiri. `contexts.tsx` disentuh keduanya tetapi pada fungsi berbeda (`useMateriality`
  vs `AuditContextValue`) — konflik rebase, kalau ada, remeh.
- `window.BENCHMARKS` masih kontrak window (W3 Fase 4 belum tuntas) — pelepasannya
  harus mempertahankan jembatan `window` sampai konsumen terakhir pindah.
- Hanya ENG-2025-014 yang punya WTB bermakna; empat perikatan lain harus
  degradasi anggun (`entityFigures(undefined)` → semua field `null`, bukan NaN/0).
- `npm run typecheck` strict penuh; test `.ts` wajib bebas-`any`.

---

## 7 · Existing Solutions

- `figuresFromWTB()` (`canon_base.ts:38`) — pola yang benar, sudah terbukti, sudah
  ber-uji (`canon_base.test.ts:30`). **Cakupannya hanya pos neraca untuk PSAK 46/71/
  73.** PR-A memperluasnya ke laba-rugi & likuiditas; tidak membangun mekanisme baru.
- `wtbVal(wtb, code, field)` — akses per-kode per-kolom sudah ada dan dipakai luas.
- Custom work yang dibenarkan: hanya agregasi per-prefix-kode (4-/5-/1-1/2-1) yang
  memang belum ada. Sisanya komposisi.

---

## 8 · Proposed Approach

Selector murni + argumen eksplisit, karena itu pola yang sudah dimenangkan PR-6b
dan satu-satunya yang dapat diuji tanpa DOM.

**Alternatif yang ditolak:**

1. *Perbaiki konstanta ke nilai WTB yang benar, tetap konstanta.* Ditolak — memperbaiki
   gejala. Impor TB baru (W-WTB·1) langsung membuatnya basi lagi, senyap.
2. *Naikkan skala seed WTB agar PBT ≈ 85 M sehingga OM tak bergerak.* Ditolak sebagai
   default — menyelesaikan kenyamanan demo dengan mengorbankan koherensi laporan
   keuangan (butuh opex ≈ 0). **Tapi lihat §11 Q1: ini keputusan Ari, bukan saya.**
3. *Biarkan `BENCHMARKS` di `window`, cukup jadikan getter reaktif.* Ditolak — getter
   yang membaca state React dari luar React adalah sumber cache-dingin berikutnya,
   kelas bug yang persis sedang ditutup PR-6b.

**Urutan penerapan** dipilih agar tiap langkah dapat diverifikasi sendiri:
selector + uji lebih dulu (nol perubahan perilaku), baru konsumen satu per satu,
seed perikatan **terakhir** — supaya kriteria sukses #4 (drift menyala lalu padam)
benar-benar dapat diamati.

---

## 9 · Risks

### R-1 · PSAK 46 pecah bila `FISCAL.pbt` ikut ditarik ke WTB — **paling berat**

`FISCAL` internal konsisten pada PBT 48.500:
`48.500 + 1.200 (permAdd) − 3.000 (permLess) + 6.800 (temp) = 53.500 = PKP` ✅

Dengan PBT WTB adjusted: `22.780 + 1.200 − 3.000 + 6.800 = 27.780 ≠ 53.500` ❌

Menarik `FIG.pbt` ke WTB **merusak rekonsiliasi fiskal PSAK 46** dan seluruh modul
pajak tangguhan. **Mitigasi:** `FISCAL.pbt` eksplisit di luar scope (§5). PR-A
menambahkan **uji konsistensi yang sengaja dibiarkan gagal-terdokumentasi** (skip
dengan alasan tertulis) yang menandai bahwa `FISCAL.pbt` ≠ `entityFigures().pbt`,
supaya utang ini tercatat dan tak terlupakan. Rekonsiliasi fiskal yang benar =
PRD tersendiri. Perlu diakui terang-terangan: **setelah PR-A, sistem masih punya
dua PBT** (WTB untuk SA 320, FISCAL untuk PSAK 46) — turun dari empat menjadi dua.

### R-2 · OM turun 2,87× → modul hilir mendadak "melampaui materialitas"

OM 4.260 → 1.484 mengubah kesimpulan SA 450: agregat uncorrected yang tadinya di
bawah OM bisa melampauinya, dan `opinionInconsistent` (`canon_validation.ts`) dapat
menyala. Ukuran sampel SA 530 (TM = PM) juga naik tajam: PM 3.195 → 1.113.
**Ini perilaku yang benar** — tapi tampak seperti regresi.
**Mitigasi:** langkah 5 memperbarui `ENGAGEMENTS[].materiality`; catatan rilis
menyatakan pergeseran ini sebagai koreksi, bukan bug; screenshot sebelum/sesudah
SAD dilampirkan ke PR.

### R-3 · Oracle uji terpaku ke angka lama

`W0-BASELINE.md` memaku OM 4260 / PM 3195 / CTT 213 — persis oracle yang menurut
PRD PR-6 memaku **jalur zero-arg yang tak dipakai satu pun view**. PR-A akan
membuatnya merah. **Mitigasi:** perbarui baseline dalam commit yang sama dengan
alasan tertulis; jangan pernah melonggarkan assert agar hijau.

### R-4 · Tabrakan dengan PR-6 di `canon_part4.ts`

**Mitigasi:** §6 — PR-A menunggu #138 merge, lalu rebase. Tidak menumpuk branch
(pelajaran `asseris-sidebar-learning-curve`).

### R-5 · Artikulasi WTB tak sempurna (Δ Rp 0,356 M)

Uji artikulasi bisa jadi rapuh. **Mitigasi:** toleransi 2% dengan alasan
terdokumentasi, bukan angka ajaib.

---

## 10 · Implementation Plan

| # | Langkah | Verifikasi |
|---|---|---|
| 1 | `entityFigures()` + `benchmarksFromWTB()` di `canon_base.ts` + uji unit lengkap | `npm test` hijau; nol perubahan perilaku app |
| 2 | `canon_part4.ts` `calcOM` terima `opts.benchmarks`; `window.BENCHMARKS` jadi fallback bertanda deprecated | uji `canon_part4.test.ts` diperluas |
| 3 | `view_materiality.tsx` `BENCHMARKS` → turunan WTB reaktif; UI menyatakan basis (`adj`) | drift **menyala** untuk ENG-2025-014 (kriteria #4) |
| 4 | `view_aje.tsx` + `view_sad.tsx` buang konstanta | ketiga modul menampilkan PBT sama (kriteria #5) |
| 5 | `data_part1.ts` `ENGAGEMENTS[].materiality` selaras | drift **padam** (kriteria #4) |
| 6 | Perbarui `W0-BASELINE.md` + oracle; uji integrasi lintas-modul | kriteria #3 & #6 |
| 7 | Verifikasi visual live (login Rekan Pemimpin, dev :5180) — AJE · SAD · Materialitas · SA 530 | screenshot dilampirkan ke PR |

Langkah 7 tidak opsional: dua sesi terakhir melewatkannya (utang tercatat di
`asseris-session-2026-07-25-checkpoint`), dan PR-6 P-0 hanya terbukti karena
verifikasi live akhirnya dijalankan.

---

## 11 · Open Questions

**Q1 — Mana yang dikoreksi: konstanta modul, atau skala seed WTB?**
✅ **TERTUTUP (Ari, 2026-07-26): koherensi — konstanta modul yang dikoreksi.**
Seed WTB tidak diskalakan. OM turun dan tampilan demo bergeser; diterima.

**Q2 — Basis benchmark: `adj` atau `unadj`?**
🔄 **Rekomendasi DIUBAH menjadi `unadj`.** Draf pertama merekomendasikan `adj`;
setelah Q1 memilih koherensi, dua argumen membalikkannya:

*(a) Sirkularitas.* Dengan basis `adj`, memposting AJE menggerakkan ambang yang
menilai AJE itu sendiri. Konkret: PBT unadj 29.690 → OM 1.484. Auditor memposting
tiga AJE (−3.940) → PBT 25.750 → OM 1.287. Ambang mengetat **13% akibat koreksi
auditor sendiri**, menarik item baru ke dalam scope, yang melahirkan AJE berikutnya.
SA 320 ¶10 menetapkan materialitas saat menyusun strategi audit dan ¶12 merevisinya
bila ada informasi baru — bukan menghitung ulang terus-menerus.

*(b) Kolom `adj` belum tepercaya.* Kolom `aje` di seed WTB memasukkan AJE-03 dan
AJE-05 yang **berstatus Proposed**. Mendasarkan materialitas pada `adj` hari ini
berarti mendasarkannya pada jurnal yang belum disetujui partner. Kontaminasi ini
baru bersih setelah PR-B (gerbang posting) dan PR-C (rekonsiliasi live).

Basis `adj` tetap dihitung dan disajikan sebagai **pemicu revisi** SA 320 ¶12-13,
tidak mengikat OM. Tak ada tambahan scope: `entityFigures(wtb, basis)` sudah
menerima parameter itu di §4.

**Q3 — `FISCAL.pbt` (48.500): utang tercatat, atau ikut PR-A?**
✅ **Diputuskan: utang tercatat** (§5, R-1) — konsisten dengan disiplin scope PRD
ini. Rekonsiliasi fiskal yang benar butuh PRD sendiri. Konsekuensi dinyatakan
terbuka: **setelah PR-A sistem masih punya dua PBT**, turun dari empat menjadi dua.
Ditandai uji ber-`skip` beralasan agar tak terlupakan.

**Q4 — Perikatan tanpa WTB (§1.3):**
✅ **Diputuskan: jalan tengah.** Nilai `ENGAGEMENTS[].materiality` tetap ditampilkan
— tapi berlabel eksplisit **"nilai administratif · TB belum diimpor"**, bukan
disajikan sebagai benchmark terhitung, dan `basis` dilaporkan `'none'`. Demo
multi-perikatan tetap utuh tanpa mengklaim otoritas SA 320 yang tak dimiliki.
Sejalan dengan Q1: jujur soal apa yang diketahui sistem.

---

**Sign-off:** ditandai dengan balasan **"Proceed."**
Q1 tertutup. Q2 direvisi menjadi `unadj`; Q3/Q4 diputuskan seperti di atas.
Bila Q2 tidak Anda setujui, §4 dan tabel §1.1 saya susun ulang sebelum implementasi.
