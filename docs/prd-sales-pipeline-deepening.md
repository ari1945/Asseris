# PRD — Sales Pipeline: satu register, angka yang punya dasar, dan serah-terima yang tak memalsukan apa pun

> Wajib diisi sebelum implementasi apa pun. Implementasi TIDAK dimulai sebelum sign-off ("Proceed.").

| Field | Isi |
|---|---|
| Tanggal | 2026-08-15 |
| Pemilik | Ari Widodo |
| Status | **In Progress** — Approved 2026-08-15 ("Saya ikut rekomendasi anda"): Q-1=a · Q-2=a · Q-3=a · Q-4=a · Q-5=a · Q-6=b (fallback a). **PR-1** (SC-1·2·9·10) · **PR-2** (SC-4·5) · **PR-3** (SC-6) · **PR-4** (SC-11·12·13) SELESAI. PR-5..PR-6 menyusul |
| Pemicu | Permintaan: "kembangkan lebih dalam fitur pada modul Sales Pipeline sampai tingkat memadai" |
| Modul | `pipeline` (`migration/src/view_pipeline.tsx`) + konsumen: `view_bi`, `view_bi2`, `view_capacity`, `data_platform` (antrean persetujuan), `view_crm2` (Peluang) |
| PRD terkait | `docs/prd-budget-actual-ledger-derived.md` · `docs/prd-ar-ap-bridge-falsifiable.md` · `docs/prd-penerimaan-keberlanjutan-detail.md` · `docs/prd-acceptance-to-engagement-flow-sa210.md` |
| Prasyarat | Di atas `master` `03f8717` |

---

## 1. Problem

Modul Sales Pipeline hari ini adalah papan Kanban 5 kolom dengan 4 KPI. Ia terlihat
selesai. Yang tidak terlihat: **tak satu pun angka di dalamnya menutup ke apa pun,
dan panel bertajuk "Penerimaan Klien (SA 220 / SMM)" mencentang hal-hal yang tidak
pernah diperiksa.**

### 1.1 Dua register peluang untuk satu firma

| Register | Isi | Dibaca oleh |
|---|---|---|
| `AMS.PIPELINE` (`data_part1.ts:294`) | 7 peluang `OPP-101..107` (klien baru) | view_pipeline, view_bi, view_bi2, view_capacity, data_platform |
| `AMS.CRM_360[*].opps` (`data_fpm.ts`) | 7 peluang `OPP-201..214` (cross-sell klien eksisting) | view_crm2 (`CRMPeluang`) saja |

Peluang cross-sell — ESG Assurance 480 jt, Audit Kepatuhan OJK 540 jt, SOC 1 620 jt,
dan seterusnya — **tidak pernah masuk pipeline firma**. "Pipeline Tertimbang" di modul
Sales Pipeline dan "Tertimbang" di CRM Peluang adalah dua angka yang tak pernah
dijumlahkan, atas basis klien yang sama.

### 1.2 Modul menulis ke satu tempat, seluruh konsumen membaca tempat lain

`view_pipeline.tsx:34` menyimpan ke dokumen persist:

```ts
const [opps, setOpps] = useAmsPersist('pipeline', () => AMS.PIPELINE);
```

Sementara **setiap** konsumen hilir membaca literal seed:

| Berkas | Baris | Sumber |
|---|---|---|
| `view_bi.tsx` | 54 | `const PIPELINE = AMS.PIPELINE` |
| `view_bi2.tsx` | 92 | `const PIPE: any = AMS.PIPELINE` |
| `view_capacity.tsx` | 48 | `pipeline: AMS.PIPELINE` |
| `data_platform.ts` | 121 | `ctx.pipeline \|\| A.PIPELINE` |

**Akibat terukur:** tarik kartu OPP-103 (Rp 1,28 M) dari Negotiation ke Won — papan
berubah, "Pipeline Tertimbang" di modul turun Rp 960 jt, dan **BI Pipeline & Forecast,
Kapasitas, serta antrean Penerimaan Klien tidak bergerak satu rupiah pun.** Ini pola
yang persis sama dengan yang sudah dicabut di WTB (PR-3/4/5) dan Firm Finance (#241):
perbaikan yang hanya menyentuh sebagian konsumen.

### 1.3 Win rate: 50% dan 75%, di dua layar yang bersebelahan

| Layar | Nilai | Asal |
|---|---|---|
| Sales Pipeline · "Win Rate" | **50%** | diturunkan: 1 Won ÷ (1 Won + 1 Lost) |
| BI · Pipeline & Forecast · "Win Rate (TTM)" | **75%** | literal `BI_WINLOSS.winRate` (`data_fpm.ts:184`) |

`BI_WINLOSS` juga menyimpan `lossReasons` (Harga/fee, Rotasi wajib) — **alasan kalah
untuk peluang yang tak pernah punya field alasan kalah.** Modul pipeline hanya
menyetel `prob: 0` saat "Kalah" ditekan; tak ada yang ditanya, tak ada yang disimpan.

### 1.4 Panel "Penerimaan Klien (SA 220 / SMM)" adalah centang yang tak bisa gagal

`view_pipeline.tsx:176-181`:

```ts
const accept = [
  { t: 'Integritas & reputasi calon klien',            ok: true },
  { t: 'Independensi & potensi konflik kepentingan',   ok: true },
  { t: 'Kompetensi & kapasitas sumber daya',           ok: o.stage !== 'Lead' },
  { t: 'Penilaian risiko perikatan & fee proporsional', ok: o.prob >= 50 },
];
```

Dua baris pertama **dipaku `true`** — dua tuntutan paling keras SA 220/SMM 1 dirender
hijau tanpa membaca apa pun. Dua baris sisanya diturunkan dari tahap dan probabilitas,
yaitu dari hal yang justru seharusnya *digerbangi* oleh penilaian penerimaan. Sirkular:
seret kartu ke kanan → penilaian penerimaan "membaik".

Lalu panel menyimpulkan (`:223`): `prob >= 50` ⇒ *"Penilaian penerimaan memadai — siap
terbitkan engagement letter & konversi ke perikatan."*

**Data untuk menjawab dengan benar sudah ada di sistem, satu modul di sebelahnya:**

| Peluang | Panel hari ini | Data yang sudah ada |
|---|---|---|
| OPP-101 Karya Beton (Proposal, 60%) | 4/4 hijau, "siap terbitkan engagement letter" | `PROS-03`: akseptasi **sudah disetujui** 'Terima' oleh Hartono Wijaya, **2026-02-26** — enam bulan lalu; klien `C-052` sudah terdaftar |
| OPP-103 Pelita Energi (Negotiation, 75%) | 4/4 hijau | `PROS-01`: **'Terima dengan Syarat'** 2026-02-18 — dengan pengaman wajib (spesialis energi + EDD pemilik manfaat PEP). Syaratnya tak muncul di mana pun pada papan |
| OPP-107 Bahari Logistik (Qualified, 50%) | Independensi ✓ | Pemilik peluang **Bayu Saputra**, `INDEPENDENCE` EMP-008: **`declared: false`** — belum mendeklarasikan independensi sama sekali |
| OPP-102 Digital Andalan (Lead, 25%) | Independensi ✓ | Pemilik **Sari Dewanti**, EMP-003: **`conflicts: 1`** — "Saudara bekerja di calon klien (di-mitigasi)" |

Baris independensi **secara struktural tak dapat pernah bernilai merah**, sehingga ia
membawa nol informasi sambil memakai label SA 220. Ini kelas cacat yang sama dengan
tanda tangan bertanggal-hari-ini di #169 dan status AR/AP dari `note` hardcode di #240.

### 1.5 Serah-terima ke Onboarding memalsukan tiga hal dan gagal senyap

`toOnboarding()` (`view_pipeline.tsx:160-175`):

| Baris | Yang dilakukan | Masalah |
|---|---|---|
| `materiality: Math.round(o.value * 2.5)` | materialitas = **fee × 2,5** | Materialitas SA 320 adalah persentase *benchmark entitas* (laba/pendapatan/aset), bukan kelipatan fee KAP. Faktor 2,5 adalah rata-rata rasio seed (2,66 · 2,11 · 2,37) — sebuah **plug**. Nilai ini mengalir ke `addEngagement({ materiality })` (`view_onboarding.tsx:439`) dan menjadi materialitas perikatan — dasar seluruh scoping audit |
| `partner: o.owner + ', CPA'` | menempelkan gelar CPA | OPP-107 dimiliki **Bayu Saputra — seorang Manager**. Konversi mengangkatnya jadi *"Bayu Saputra, CPA"* selaku Engagement Partner. Bandingkan `PROS-05`: partner sebenarnya **Sari Dewanti, CPA**, Bayu manager |
| `budgetHrs: value / 700_000` | jam anggaran dari tarif Senior | Kapasitas memakai tarif berbeda untuk konversi yang sama: `CAP_BLENDED_RATE = 800_000` (`canon_capacity.ts:85`). Dua tarif, satu konversi |

Ditambah: `window.amsAddProspect` (`view_onboarding.tsx:60`) menulis **langsung ke
`localStorage`**, melewati `useAmsPersist`/server, dan **`return` diam-diam** bila nama
prospek sudah ada. Untuk 4 dari 7 peluang (OPP-101/103/104/107) prospeknya **sudah ada**
— jadi tombol "Kirim ke Onboarding" akan: menandai peluang **Won**, tidak membuat apa
pun, tidak memberi pesan, lalu memindahkan pengguna ke modul Onboarding. Peluang
berubah status karena tombol yang tidak melakukan apa-apa.

### 1.6 Kapasitas menebak karena pipeline tak punya bahan

`canon_capacity.ts:80-86`, komentar kanon sendiri:

> *"pipeline nyata (view_pipeline) TAK punya jam/tgl-mulai. Estimasi jam/minggu =
> value / rate-blended / durasi-rerata. KONSTAN tunable; ini asumsi PERENCANAAN kasar."*

Setiap peluang diasumsikan berdurasi **24 minggu**, mulai **pada tanggal target close**,
dengan tarif blended tunggal lintas-grade. Perencanaan sumber daya firma berdiri di
atas tiga konstanta karena register peluang tidak menyimpan satu pun fakta jadwal.

### 1.7 Tanpa RBAC, tanpa jejak audit, dan tulisannya gagal senyap

- **Tak ada gate kapabilitas.** Modul Billing di **berkas yang sama** men-gate
  `CAP.FIRMFIN_EDIT`; Kapasitas men-gate `CAP.ENGAGEMENT_MANAGE`. Sales Pipeline tidak
  men-gate apa pun: Junior Auditor dapat membuat peluang, menyeret ke **Won**, dan
  menekan "Kirim ke Onboarding".
- **`'pipeline'` tak punya cabang di `capForWrite`** (`rbac.ts:139-189`) → jatuh ke
  `return FIRM_ADMIN`. Artinya semua orang selain Engagement Partner melihat kartu
  bergerak di layar lalu **tulisannya ditolak SENYAP oleh server** — gotcha yang persis
  sama yang sudah ditambal untuk `priorYear`, `capacityPlan.v1`, dan `invoices`.
- **Tak ada `logActivity`** pada transisi tahap, Won, Lost, maupun konversi — padahal
  Billing di berkas yang sama mencatat `INV_SENT`/`INV_PAID`/`INV_CREATE`. Perubahan
  status peluang bernilai Rp 1,28 M tidak meninggalkan jejak siapa pun.

### 1.8 Sisa cacat terukur

| # | Cacat | Bukti |
|---|---|---|
| a | KPI berlabel **"Dimenangkan (YTD)"** menjumlahkan **seluruh** stage Won tanpa filter periode (`:41`) | Seed menyamarkannya: satu-satunya Won kebetulan `close: 2026-03-01` |
| b | Peluang dengan target close **lewat** tetap dihitung penuh dalam forecast | Tak ada perbandingan `close` terhadap hari ini |
| c | Probabilitas **lepas dari tahap** | Kartu di 'Lead' boleh 90%; tertimbang jadi sewenang-wenang |
| d | Tak ada riwayat tahap / stempel waktu | Tak mungkin: umur peluang, velocity, deteksi macet, win rate per periode, conversion rate antar-tahap |
| e | Kolom **Lost tidak ada** di papan | Hanya bisa dicapai lewat sheet detail; peluang kalah lenyap dari pandangan |
| f | `id: 'OPP-' + (108 + list.length)` (`:48`) | Hapus satu lalu tambah satu → id bertabrakan |
| g | Kartu `<div draggable onClick>` (`:84`) | Tak fokusabel, tak dapat dioperasikan keyboard — melanggar aturan emas §3.7 CLAUDE.md; satu-satunya cara memindah tahap adalah drag-and-drop tetikus |
| h | Sheet detail tidak beralamat | Pola V-9 (`#/pipeline/OPP-103`) sudah tersedia di `route_hash.ts` tapi tak dipakai |
| i | Tak ada aktivitas/kontak/langkah-berikutnya per peluang | `CRM_360[*].activities` ada, tapi terpisah dan tak bisa dibuat dari pipeline |
| j | **Nol uji** untuk modul ini | Satu-satunya singgungan: `canon_capacity.test.ts` (menguji heuristiknya, bukan pipelinenya) |

---

## 2. Objective

Menjadikan Sales Pipeline **register bisnis-development satu-satunya milik firma** —
tempat setiap angka dapat ditelusuri ke fakta yang tercatat, setiap klaim kepatuhan
dapat bernilai merah, dan serah-terima ke perikatan tidak mengarang satu field pun.

Bukan: menambah grafik. Yang ditambah harus punya dasar terlebih dulu.

---

## 3. Success Criteria

| # | Kriteria | Cara memfalsifikasi |
|---|---|---|
| SC-1 | Satu register peluang; **nol** konsumen membaca literal `AMS.PIPELINE`/`CRM_360[*].opps` untuk angka pipeline | Gerbang **cakupan**: uji menyisir konsumen terdaftar dan gagal bila ada yang mengimpor seed langsung (bukan tie-out tautologis — pelajaran #242) |
| SC-2 | Memindah kartu di modul **menggerakkan** BI Forecast, Kapasitas, dan antrean Penerimaan | Uji: mutasi register → ketiga turunan bergeser sesuai delta |
| SC-3 | Win rate & alasan kalah **diturunkan**; `BI_WINLOSS.winRate` literal dicabut | Uji: hapus literal ⇒ BI tetap merender angka; angkanya sama dengan modul |
| SC-4 | Panel penerimaan **dapat bernilai merah**: OPP-107 (pemilik `declared:false`) TIDAK boleh merender independensi hijau | Uji langsung atas seed nyata, per baris kriteria |
| SC-5 | Keputusan akseptasi yang sudah ada (PROS-01/03/05) tampil di papan; peluang yang sudah punya prospek tidak menawarkan "Kirim ke Onboarding" seolah baru | Uji: 4 peluang ber-`source` tertaut; tombol berubah jadi "Buka prospek PROS-xx" |
| SC-6 | Konversi tidak mengarang materialitas maupun gelar partner; duplikat **ditolak dengan pesan**, bukan senyap | Uji: `materiality` tak lagi turunan fee; `partner` diambil dari roster, bukan `owner + ', CPA'`; handoff duplikat mengembalikan error yang terlihat |
| SC-7 | Satu tarif untuk satu konversi nilai→jam (SSOT `FIRMFIN.WIP_BILL`); `CAP_BLENDED_RATE` & `PIPELINE_BUDGET_RATE` tidak lagi dua konstanta lepas | Uji: kedua jalur menghasilkan angka identik dari satu sumber |
| SC-8 | Kapasitas memakai jam & tanggal mulai **yang tercatat** bila ada; heuristik hanya untuk peluang tanpa build-up, dan **ditandai** sebagai estimasi | Uji: peluang dengan build-up ⇒ demand ≠ hasil heuristik |
| SC-9 | `capForWrite('firm','pipeline')` eksplisit; gate UI `can()` selaras; Junior tak bisa menyeret ke Won | Uji RBAC dua sisi (klien + server) |
| SC-10 | Setiap transisi tahap, Won, Lost, konversi tercatat `logActivity` dengan siapa/kapan/dari-ke | Uji: N transisi ⇒ N entri |
| SC-11 | Umur peluang, waktu-di-tahap, conversion rate antar-tahap, dan deteksi macet tersedia dari riwayat tercatat | Uji atas riwayat seed |
| SC-12 | Probabilitas berdisiplin tahap: default per tahap, override wajib beralasan & ditandai | Uji: prob 90% di 'Lead' ⇒ ditandai menyimpang |
| SC-13 | KPI "Dimenangkan (YTD)" benar-benar YTD; peluang lewat target close dikeluarkan/ditandai di forecast | Uji dengan tanggal disuntik |
| SC-14 | Kartu & aksi tahap dapat dioperasikan **keyboard**; axe 0 critical | `npm run test` + spec a11y e2e |
| SC-15 | Sheet detail beralamat `#/pipeline/<OPP-id>` dan tab beralamat (pola V-9) | Uji route_hash |
| SC-16 | `npm run verify` hijau | Gerbang CI |

---

## 4. Scope

- `migration/src/canon_pipeline.ts` **(baru)** — mesin hitung murni: register gabungan,
  probabilitas per tahap, tertimbang, umur/velocity, win-loss, build-up fee→jam,
  dan **kesiapan penerimaan** (`acceptanceReadiness`) yang membaca prospek + independensi.
- `migration/src/view_pipeline.tsx` — papan, sheet detail, formulir, RBAC, jejak audit,
  a11y, alamat.
- `migration/src/data_part1.ts` — struktur `PIPELINE` diperkaya (riwayat tahap, origin,
  kontak, langkah berikutnya, alasan kalah, build-up fee); `data_fpm.ts` cross-sell
  digabung ke register yang sama.
- Konsumen: `view_bi.tsx`, `view_bi2.tsx`, `view_capacity.tsx`, `canon_capacity.ts`,
  `data_platform.ts`, `view_crm2.tsx` — dialihkan ke register.
- `migration/src/rbac.ts` (+ cermin server) — cabang `'pipeline'`.
- `view_onboarding.tsx` — jalur `amsAddProspect` diperbaiki (persist, bukan localStorage
  mentah; gagal terlihat, bukan senyap).
- Uji: `canon_pipeline.test.ts`, `pipeline_acceptance_readiness.test.ts`,
  `pipeline_ssot_coverage.test.ts`, `pipeline_handoff_integrity.test.ts`, `pipeline_rbac.test.ts`.

## 5. Non-Scope

- Integrasi CRM eksternal / email tracking / e-mail sequence.
- Penilaian materialitas SA 320 itu sendiri (sudah ada kanon; PRD ini hanya **berhenti
  mengarangnya** dari fee dan menyerahkannya ke jalur yang benar).
- Perombakan modul Billing (berbagi berkas, tapi bukan sasaran).
- Modul Onboarding di luar titik serah-terima.
- Peramalan statistik (regresi/ML) — di luar "memadai".

## 6. Constraints

- Aturan emas CLAUDE.md §3 & §5: SSOT dari `canon*`, kontrol form native, token warna,
  skala tipografi 8 ukuran, alias hook per-berkas.
- `master` selalu hijau (R-7); `npm run verify` = cermin CI.
- Baseline `:any` (ratchet W15) — berkas yang disentuh tak boleh menambah `:any`.
- `data_part1.ts` disantap juga oleh seed server (`data_wtb_eng` pola) — perubahan bentuk
  data harus tetap kompatibel dengan pembaca lama sampai semuanya dialihkan.
- Perubahan `AMS_CANON` ⇒ **wajib** perbarui snapshot `canon_regression.test.ts`.

## 7. Existing Solutions (dicek dulu, jangan bikin ulang)

| Sudah ada | Lokasi | Dipakai untuk |
|---|---|---|
| Register prospek + 4 gerbang akseptasi/PMPJ/surat/konversi | `view_onboarding.tsx` (`obGates`) | Sumber status penerimaan yang **nyata** |
| Deklarasi & konflik independensi | `AMS.INDEPENDENCE` | Baris independensi yang dapat merah |
| Tarif charge-out per grade | `FIRMFIN.WIP_BILL` | SSOT konversi nilai↔jam |
| Model kapasitas | `canon_capacity.ts` | Konsumen jam & tanggal mulai |
| Antrean persetujuan turunan | `data_platform.ts` `buildApprovals` | Sudah membaca pipeline — tinggal dialihkan ke register |
| Kontrak Overlay, `Switch`/`Check` native, `route_hash`, `useInitialSelection` | `ui.tsx`, `overlay.tsx`, `route_hash.ts` | a11y & alamat — **jangan rakit ulang** |
| Pola gerbang cakupan (bukan tie-out tautologis) | PRD #242/#243 | Bentuk uji SC-1 |

## 8. Proposed Approach

**Prinsip: dasar dulu, fitur menyusul.** Urutan PR sengaja menaruh kebenaran di depan;
menambah analitik di atas register yang bercabang dua hanya menggandakan kebohongan.

Satu aturan pemandu, diambil dari arc kas-bank (#247/#251):
**komponen harus dienumerasi, bukan diturunkan dari selisih yang hendak dijelaskannya.**
Terapannya di sini: nilai peluang harus punya build-up (jam × tarif × realisasi), bukan
angka bebas yang lalu dibagi konstanta untuk menebak jam.

### PR-1 — Satu register, RBAC, jejak audit
`canon_pipeline.ts` menjadi sumber tunggal; cross-sell (`OPP-2xx`) masuk register yang
sama dengan `origin: 'cross-sell' | 'baru'` + `clientId`. Semua konsumen dialihkan.
`capForWrite('firm','pipeline') → ENGAGEMENT_MANAGE` (setara `prospects`/roster) + gate
UI + `logActivity` pada setiap transisi. Gerbang **cakupan** SC-1.

### PR-2 — Penerimaan yang dapat bernilai merah
Panel SA 220/SMM dibongkar. `acceptanceReadiness(opp, { prospects, independence, clients })`
mengembalikan per-kriteria: `status: 'ok' | 'issue' | 'belum-dinilai'` + `basis` (kalimat
yang menyebut sumbernya) — **tak ada default hijau**. Peluang tanpa prospek berstatus
"belum dinilai", bukan tercentang. Keputusan akseptasi yang sudah ada (termasuk syarat
'Terima dengan Syarat') ditampilkan di kartu & sheet.

### PR-3 — Serah-terima yang tidak mengarang
Materialitas tidak lagi diturunkan dari fee (field dikosongkan + diarahkan ke jalur
SA 320); partner diambil dari roster/prospek; duplikat **ditolak dengan pesan**;
`amsAddProspect` lewat persist (server-SSOT), bukan `localStorage` mentah; peluang
**tidak** berpindah ke Won bila handoff gagal. Untuk peluang yang sudah punya prospek,
tombol berubah menjadi "Buka PROS-xx" dengan lineage `source` yang dua arah.

### PR-4 — Siklus hidup: riwayat, umur, velocity, disiplin probabilitas
`history: [{ stage, at, by }]` pada setiap peluang (seed di-backfill). Turunan: umur,
waktu-di-tahap, conversion rate antar-tahap, deteksi macet (ambang per tahap),
win rate **per periode**. Probabilitas: default per tahap, override wajib beralasan dan
ditandai menyimpang. Peluang lewat target close ditandai & dikeluarkan dari forecast
berjalan. Kolom **Lost** hadir di papan. KPI "Dimenangkan (YTD)" benar-benar YTD.

### PR-5 — Build-up fee → jam nyata → kapasitas nyata
Nilai peluang dibangun dari `{ grade, hours }[] × FIRMFIN.WIP_BILL` + realisasi/diskon,
plus `startPlanned` & `durationWeeks`. `pipelineDemand()` memakai angka tercatat bila
ada; heuristik hanya fallback **dan ditandai sebagai estimasi**. `PIPELINE_BUDGET_RATE`
dan `CAP_BLENDED_RATE` dihapus sebagai konstanta lepas.

### PR-6 — Win-loss turunan, aktivitas & langkah berikutnya, a11y, alamat
Alasan menang/kalah ditangkap saat transisi; `BI_WINLOSS` literal dicabut, analitik
win-loss diturunkan. Aktivitas/kontak/langkah-berikutnya per peluang, menyatu ke aliran
aktivitas CRM. Kartu jadi kontrol native yang dapat dioperasikan keyboard (pindah tahap
tanpa tetikus); sheet detail beralamat `#/pipeline/<OPP-id>` dengan tab beralamat (V-9).

## 9. Risks

| # | Risiko | Mitigasi |
|---|---|---|
| R-1 | **Angka yang tampil akan bergeser** (mis. Win Rate BI 75% → turunan). Ini disengaja, tapi harus disadari | Cantumkan delta sebelum/sesudah di deskripsi PR; jangan sembunyikan di balik uji tautologis |
| R-2 | Menggabungkan cross-sell menaikkan pipeline gross firma (± Rp 3 M) — bukan pertumbuhan, melainkan yang selama ini tak terhitung | Nyatakan eksplisit di UI: pecahan origin baru vs cross-sell |
| R-3 | Mengubah bentuk `PIPELINE` memecah pembaca lama | Bentuk aditif; pembaca lama tetap jalan hingga dialihkan dalam PR yang sama |
| R-4 | Konsumen `AMS.PIPELINE` mungkin lebih banyak dari 4 yang teridentifikasi | Gerbang cakupan SC-1 dijalankan lebih dulu (di PR-1) supaya pembaca tersembunyi ketahuan, bukan ditebak |
| R-5 | Menyentuh `AMS_CANON` merah-kan `canon_regression.test.ts` | Snapshot diperbarui pada PR yang sama (pelajaran #90) |
| R-6 | Cakupan besar → PR raksasa sulit ditinjau | Enam PR berurutan, tiap PR hijau sendiri; PR-1..PR-3 dapat berhenti sebagai potongan yang utuh |
| R-7 | `materiality` dikosongkan bisa memerahkan alur konversi hilir | Diperiksa di PR-3: konversi meminta materialitas dari jalur SA 320, bukan diam-diam nol |

## 10. Implementation Plan

| PR | Isi | SC | Perkiraan berkas |
|---|---|---|---|
| PR-1 | Register tunggal + RBAC + audit | SC-1, SC-2, SC-9, SC-10 | `canon_pipeline.ts`(baru), `view_pipeline`, `view_bi`, `view_bi2`, `view_capacity`, `data_platform`, `view_crm2`, `rbac.ts`, +3 uji |
| PR-2 | Kesiapan penerimaan terfalsifikasi | SC-4, SC-5 | `canon_pipeline`, `view_pipeline`, +1 uji |
| PR-3 | Integritas serah-terima | SC-6 | `view_pipeline`, `view_onboarding`, +1 uji |
| PR-4 | Riwayat, umur, velocity, disiplin prob | SC-11, SC-12, SC-13 | `canon_pipeline`, `data_part1`, `view_pipeline`, +1 uji |
| PR-5 | Build-up fee→jam; kapasitas nyata | SC-7, SC-8 | `canon_pipeline`, `canon_capacity`, `data_part1`, `view_pipeline`, `view_capacity`, +1 uji |
| PR-6 | Win-loss turunan, aktivitas, a11y, alamat | SC-3, SC-14, SC-15 | `canon_pipeline`, `data_fpm`, `view_pipeline`, `view_bi2`, +2 uji |

Setiap PR: `npm run verify` hijau sebelum dikirim (SC-16).

**Potongan minimum "memadai" bila arc harus dipendekkan: PR-1 → PR-3.** Setelah itu
modul berhenti membohongi dan berhenti gagal senyap; PR-4..PR-6 adalah pendalaman fitur
di atas dasar yang sudah benar.

## 11. Open Questions

| # | Pertanyaan | Opsi | Rekomendasi |
|---|---|---|---|
| Q-1 | Apakah menandai **Won** harus digerbangi keputusan akseptasi yang disetujui? | (a) Tidak — Won = kesepakatan komersial; gerbang tetap di konversi ke perikatan, tapi papan menampilkan status gerbang sebenarnya · (b) Ya — Won terkunci sampai akseptasi disetujui | **(a)** — mencampur keputusan komersial dengan keputusan mutu justru mengaburkan keduanya; yang wajib adalah gerbangnya **terlihat**, bukan dipindah |
| Q-2 | Peluang cross-sell digabung ke satu register? | (a) Gabung, dengan `origin` · (b) Tetap terpisah, tapi BI menjumlahkan keduanya | **(a)** — dua register untuk satu konsep adalah akar 1.1; (b) hanya memindahkan duplikasi ke lapisan agregasi |
| Q-3 | Build-up fee wajib? | (a) Opsional; tanpa build-up, nilai ditandai "tanpa dasar" & dikecualikan dari demand kapasitas · (b) Wajib mulai tahap Proposal | **(a)** untuk PR-5, dengan opsi menaikkan ke (b) setelah data terisi — memaksa (b) di awal akan memblokir entri peluang tahap awal |
| Q-4 | Riwayat tahap pada seed | (a) Backfill riwayat plausibel di seed agar umur/velocity punya isi · (b) Kosongkan; turunan menampilkan "—" | **(a)** — tanpa riwayat, PR-4 menghasilkan papan berisi tanda hubung; backfill ditandai jelas sebagai data demo |
| Q-5 | Nasib `BI_WINLOSS.lossReasons` & `byQuarter` literal | (a) Cabut seluruhnya, turunkan dari register (butuh backfill alasan kalah di seed) · (b) Cabut `winRate` saja, sisanya menyusul | **(a)** — mencabut separuh meninggalkan satu layar dengan dua basis, persis cacat yang sedang diperbaiki |
| Q-6 | Materialitas pada konversi (PR-3) | (a) Kosongkan + wajib diisi di gerbang perikatan lewat jalur SA 320 · (b) Turunkan dari figur entitas bila tersedia, kosong bila tidak | **(b)** bila `figuresFromWTB`/benchmark tersedia untuk calon klien; jika tidak, jatuh ke (a). Yang tidak boleh: kelipatan fee |

---

## 12. Hasil PR-2 atas seed nyata

Setelah panel dapat bernilai merah, **8 dari 14 peluang membawa hal terbuka** —
seluruhnya dulu tampil sebagai centang hijau:

| Peluang | Hal terbuka | Sumber |
|---|---|---|
| OPP-107 Bahari Logistik | Independensi | Pemilik **Bayu Saputra `declared: false`** — tim menilai dirinya **5/5** "tidak ada konflik"; akseptasi sudah 'Terima' 10 Feb 2026 dan **surat SA 210 sudah ditandatangani** |
| OPP-102 · OPP-104 · OPP-210 · OPP-212 | Independensi | **Sari Dewanti `conflicts: 1`** — "Saudara bekerja di calon klien (di-mitigasi)" |
| OPP-201 · OPP-202 | Independensi | **Rotasi tahun ke-5 dari batas 5** atas PT Sentosa Makmur (PP 20/2015 Ps. 11) |
| OPP-214 | Independensi | **Rotasi tahun ke-7 dari batas 5** atas PT Graha Properti Investama |
| OPP-103 Pelita Energi | Risiko | PMPJ risiko **Tinggi** (EDD) belum diverifikasi; kecocokan PEP kini disebut, bukan disembunyikan |

Dua keputusan yang diambil saat implementasi, di luar teks PRD:

1. **Register mengalahkan penilaian-diri.** Skor faktor adalah penilaian tim atas
   dirinya sendiri; deklarasi independensi, kecocokan skrining, dan tenur rotasi
   adalah fakta terdaftar. Bila berselisih, yang terdaftar menang.
2. **Hal terbuka MENGHALANGI, bukan sekadar dicatat.** "Siap terbitkan surat
   perikatan" kini menuntut `issues === 0`, bukan hanya akseptasi + PMPJ. Tanpa ini
   OPP-107 tetap berbunyi "dapat diterbitkan" di atas independensi yang belum
   dideklarasikan.

Ditemukan **verifikasi hidup, bukan uji**: fallback pencocokan prospek lewat NAMA
menautkan OPP-201 (ESG Assurance Rp 480 jt) ke PROS-04 — catatan prospek AUDIT
klien yang sama (Rp 1.850 jt) — sehingga papan menampilkan keputusan penerimaan
perikatan lain seolah milik peluang ini. Fallback nama kini intake-saja; cross-sell
hanya tertaut lewat `source` eksplisit.

## 13. Hasil PR-3

Empat kekeliruan serah-terima dicabut; `canon_pipeline_handoff.ts` MEMUTUSKAN dulu
(`planHandoff`) lalu menulis (`applyHandoff`) lewat `useAmsPersist('prospects')`.

| Dulu | Sekarang |
|---|---|
| `materiality: value × 2,5` | **Dikosongkan**, dengan alasan tercetak. Bukan inert: nilai itu mengalir ke `addEngagement` → `materialityFor()` → ambang kertas kerja (`wp_canon`) & pembacaan neraca saldo (`view_execution`) |
| `partner: owner + ', CPA'` | Dari **roster staf**. Yang menghalangi bukan gelar melainkan PERAN: Bayu Saputra memang ber-CPA, tetapi Audit Manager ⇒ partner dikosongkan (SA 220.14) |
| `budgetHrs: value / 700.000` | Dikosongkan — konversi nilai→jam satu-tarif adalah PR-5 |
| duplikat → `return` senyap | Tombol berubah jadi **"Buka Prospek PROS-xx"**; 5 dari 14 peluang memang sudah punya prospek |
| cross-sell membuat prospek "Klien Baru" | Diarahkan ke **Keberlanjutan** — mencegah klien ganda di roster |
| serah-terima menandai **Won** | Tahap TIDAK digeser: mengirim calon ke penilaian penerimaan ≠ memenangkan perikatan (Q-1) |
| `window.amsAddProspect` menulis `localStorage` mentah | **Dicabut** (nol pembaca tersisa); tulisan lewat persist/server-SSOT |

Konsekuensi hilir yang ditutup pada PR yang sama (risiko R-7 PRD): konversi prospek →
perikatan kini punya dua gerbang baru — **materialitas awal ditetapkan (SA 320)** dan
**partner penanggung jawab ditunjuk (SA 220.14)** — supaya materialitas kosong
memblokir, bukan diam-diam menerbitkan perikatan berambang nol.

## 14. Hasil PR-4

`history: [{ stage, at, by, prob, reason }]` menjadi **data register**, di-backfill
pada seluruh 14 peluang seed (Q-4 opsi a). Dari satu fakta itu lahir seluruh turunan
siklus hidup: umur, waktu-di-tahap, deteksi macet per-tahap, conversion rate
antar-tahap, median hari per tahap, dan **win rate per periode**.

Angka yang berubah wataknya:

| KPI | Dulu | Sekarang |
|---|---|---|
| Win Rate | 33% sepanjang masa — tak pernah bergerak | **YTD 2026: 33%** (1 menang · 2 kalah), sepanjang-masa tetap ditampilkan sebagai pembanding |
| — | tak ada | strip eksepsi: peluang **macet**, **lewat target close**, **probabilitas menyimpang tanpa alasan** |
| Kolom tahap | hanya jumlah & nilai | + **konversi %** dan **median hari** dari riwayat |

**Disiplin probabilitas (SC-12).** Tiap tahap punya default firma (Lead 20 · Qualified 40
· Proposal 60 · Negotiation 75) dengan toleransi ±10 poin. Menyimpang boleh — tetapi
ditandai, dan tanpa alasan tercatat ia masuk hitungan "menyimpang tanpa alasan". Ini
yang membuat "Pipeline Tertimbang" dapat dipertanggungjawabkan: sebelumnya kartu di
Lead boleh 90% tanpa siapa pun tahu.

**Cacat yang ditemukan verifikasi PR-1, kini ditutup.** `move()` lama menyetel prob=100
saat Won dan tidak memulihkannya saat kartu ditarik kembali — OPP-103 kembali ke
Negotiation membawa 100% alih-alih 75%, menaikkan tertimbang firma **Rp 320 jt** dari
satu perjalanan bolak-balik. `moveWithHistory` memulihkan angka yang memang tercatat,
dan bila tahap tujuan belum pernah dikunjungi ia memakai default tahap — bukan mewarisi
keyakinan tahap lama diam-diam.

## 15. Catatan

Temuan 1.4 dan 1.5 bukan sekadar utang fitur — keduanya menghasilkan **artefak yang
menyesatkan atas nama standar profesi**: layar bertajuk SA 220/SMM yang mencentang
independensi tanpa membacanya, dan materialitas perikatan yang lahir dari kelipatan fee.
Keduanya masuk PR-2/PR-3, dan menurut saya itulah alasan terkuat untuk tidak memulai
arc ini dari sisi analitik.
