# Kedalaman Fitur 158 Modul — kondisi terkini (2026-08-23)

> Pemutakhiran [`PRD-RINGKASAN-KEDALAMAN-E9.md`](PRD-RINGKASAN-KEDALAMAN-E9.md) (2026-08-13).
> Basis kode: `origin/master` = `4168e6c`. Basis E-9: `8f1a792` (13 Ags, 16:22).
> Bukan PRD — sengaja tanpa awalan `PRD-` agar tidak masuk registri status (CLAUDE.md §7).

## 0 · Metode dan batasnya (baca dulu)

Angka di sini **tidak** berasal dari evaluasi ulang 158 modul. Yang dilakukan:

1. **Rekonstruksi baseline.** 158 laporan `E-9/<batch>/<id>.md` diparse; 1.020 baris
   inventaris fitur (id, level L0–L5, bukti baris) diambil apa adanya.
2. **Rekomputasi agregat** = rata-rata level seluruh fitur — rumus yang E-9 nyatakan sendiri.
3. **Sinyal kode** diekstrak dari `migration/src/view_*.tsx` pada kedua commit (E-9 vs master):
   `amsExportPdf|Xlsx`, `amsPrintDoc`, `<span|div|tr onClick>`, literal tanggal `20xx-xx-xx`,
   `AMS.TODAY`, `<Switch|Check>`, `aria-label`, `useAmsPersist|useServerState`, `WpPanel`,
   `audit.verify|list`, `nav(`, `can(CAP.`.
4. **Uji literal-bukti (falsifikasi).** Untuk tiap fitur, token khas dari kolom bukti E-9
   (string berkutip, `UPPER_SNAKE`, angka ≥4 digit, desimal) dicari di kode master **setelah
   komentar dibuang**. Token yang hilang ⇒ kandidat cacat tertutup; token yang masih hidup ⇒
   **cacat terbukti bertahan**. Rujukan nomor baris dibuang lebih dulu agar tidak jadi positif palsu.

**Yang metode ini TIDAK bisa lakukan** — nyatakan ini sebelum memakai angkanya:

- Sinyal hanya membaca **berkas view**. Modul yang mesinnya di luar view (mis. `diagnostic` →
  `use_diagnostics.ts`/`diagnostics_panel.tsx`, 75 baris view saja) akan **terlihat tak berubah
  padahal berubah**. `diagnostic` di tabel ini masih 0,80 sementara PR #288 nyata mengubahnya.
- Kenaikan berlabel `(s)` adalah **inferensi sinyal**, bukan pembacaan fitur. `amsExport*` muncul
  di sebuah view tidak membuktikan fitur ekspor **yang itu** yang tersambung.
- Kolom "cacat bertahan" (⚠) adalah **satu-satunya kolom berbukti keras** di dokumen ini —
  tetapi ia **batas bawah, bukan sensus**. Ia hanya bisa menguji fitur yang kolom bukti E-9-nya
  memuat literal. Contoh yang memaku batas ini: `spr2400` fitur "Materialitas reviu" dicatat
  E-9 hanya sebagai `:237–239` — **rujukan baris tanpa satu literal pun**. Tak ada ambang token
  yang bisa menangkapnya; menurunkan ambang ke angka 3-digit hanya menambah 7 baris derau
  (`120`, `202`, `560`, `283`) dan tetap melewatkannya. **⚠ kosong tidak berarti bersih** —
  `spr2400` justru kandidat prioritas nomor satu (§5).
- Modul berbagi view (`view_pipeline` = pipeline+billing, `view_people` = hcm+cpe+independence,
  `view_firmtreasury` = treasury+cashbank+fixedassets, `view_firmgl` = firmgl+apar) mendapat
  sinyal **identik** — kenaikannya bisa milik tetangganya.

## 1 · Tiga temuan yang mengubah cara membaca E-9

### T-1 · Agregat E-9 batch B2 tidak bisa direproduksi dari tabel fiturnya sendiri

Merata-ratakan inventaris fitur tiap laporan menghasilkan angka yang sama dengan angka yang
dicetak laporan itu untuk **111 dari 156** modul yang bisa dipasangkan. Untuk 45 sisanya tidak —
dan sebarannya tidak acak:

| Batch | Cakupan | Meleset | Bias rata-rata |
|---|---|---|---|
| A1 | Inti audit | 0/23 | — |
| A2 | Penyelesaian · Referensi · Ruang Kerja | 1/14 | -0,10 |
| A3 | Praktik firma · Beranda · Personal | 3/10 | -0,27 |
| B1 | Operasi Praktik + Keuangan Firma | 1/13 | +0,23 |
| B2 | SDM & Kepatuhan + Operasi Firma | 23/26 | +0,38 |
| B3 | SA 200/500/700 | 3/15 | -0,01 |
| C1 | SA Area Khusus | 2/10 | +0,14 |
| C2 | PSAK & SAK | 9/27 | +0,18 |
| C3 | Non-audit · Platform · OJK · Portal | 4/18 | +0,16 |

**B2 meleset di 23 dari 26 modul, selalu ke atas (+0,38 rata-rata).** Batch itu persis yang
diberi label 🟢 KUAT di ringkasan E-9 (SDM & Kepatuhan 3,37 · Operasi & Admin Firma 3,66).
Sebagian "kekuatan" itu artefak agregasi, bukan kedalaman kode. Contoh terjauh: `leave`
3,2 tertulis vs 2,50 terhitung · `recruitment` 3,2 vs 2,50 · `cpe` 3,4 vs 2,71.
Kolom **E-9 (hitung)** di tabel utama memakai angka terhitung, bukan angka tertulis.

> **Akuntansi 156 vs 158.** E-9 menghasilkan 158 laporan; `MODULES` di master juga berisi 158
> entri — tetapi keduanya bukan himpunan yang sama. `wipreal` punya laporan E-9 dan sudah
> **dilebur** ke `wip` (#237), jadi tak lagi jadi modul. `regref` (#27) adalah modul **baru**
> (#259) tanpa laporan. `sakep` (#134) punya laporan tetapi **tanpa berkas view**, sehingga tak
> punya sinyal kode untuk dibandingkan. Sisanya 156 pasangan; §2 dan tabel §3 memakai 158 baris
> dengan tiga baris itu ditandai eksplisit.

### T-2 · E-9 basi secara struktural, bukan sekadar sebagian

Sejak `8f1a792`, `migration/src` + `server/src` berubah **356 berkas, +42.474/−3.444 baris**.
**146 dari 183** berkas `view_*.tsx` tersentuh; hanya **23 modul** yang berkas view-nya utuh.
Program A–F yang E-9 usulkan sebagai rencana ternyata **sudah dieksekusi** 14–15 Ags
(#225 audittrail · #226/#231 klok · #227/#228/#229/#230 ekspor tersegel · #232 integritas ·
#233 a11y · #234 ledger · #235 RelatedNavDock+tarif). Membaca E-9 sebagai daftar tugas
hari ini akan mengirim orang memperbaiki yang sudah tertutup.

### T-3 · 25 cacat L≤2 terbukti MASIH hidup — ini yang layak jadi antrean

Dari 43 fitur L≤2 yang bukti literalnya bisa diverifikasi ada di kode saat E-9,
**18 hilang** (tertutup) dan **25 masih hidup** di `origin/master`, tersebar di **23 modul**.
Daftar lengkapnya di §4 — itu satu-satunya bagian dokumen ini yang berdiri di atas bukti keras.

## 2 · Distribusi kedalaman

| Bucket | E-9 (tertulis) | E-9 (hitung ulang) | Sekarang (est. sinyal) |
|---|---|---|---|
| <1,5 | 11 | 13 | 7 |
| 1,5-2,5 | 30 | 29 | 25 |
| 2,5-3,5 | 89 | 96 | 86 |
| 3,5-4,5 | 26 | 18 | 38 |
| 4,5+ | 0 | 0 | 0 |
| **rata-rata** | **2,77** | **2,71** | **2,96** |

Kenaikan +0,25 (2,71 → 2,96) hampir seluruhnya dari Program A (ekspor tersegel) dan B (klok).
Angka "sekarang" adalah **batas bawah**: arc per-modul yang mesinnya di luar view tidak terhitung.
Sebaran §2 dihitung atas 156 modul berpasangan (lihat kotak di T-1), sehingga bucket `<1,5`
menunjukkan 11 — bukan 12 seperti ringkasan E-9, yang ikut menghitung `wipreal`.

## 3 · Tabel kedalaman 158 modul

**E-9 (hitung)** = rata-rata inventaris fitur E-9 — baseline yang dipakai di sini (lihat T-1);
**E-9 (tulis)** = angka yang dicetak laporan E-9, dipertahankan agar selisihnya terlihat.
**Sekarang** = setelah re-level sinyal; `(s)` = naik lewat inferensi sinyal, bukan pembacaan fitur.
**⚠** = jumlah cacat L≤2 yang literal buktinya TERBUKTI masih hidup di `origin/master` (§4).

Status: `arc✔` arc modul MENDARAT · `⏸` arc selesai tapi belum di-merge · `◐` dikerjakan,
belum di-commit · `prompt` prompt sudah ditulis, belum dieksekusi · `sapuan` hanya tersentuh
Program A–F · `tetap` berkas view tak berubah sejak E-9. Kolom **PR** hanya diisi bila
kaitannya sudah diverifikasi tangan; selain itu jumlah commit yang menyentuh view-nya.

| # | id | Modul | Grup | Ceil | E-9 (tulis) | E-9 (hitung) | Sekarang | Δ | ⚠ | Status | PR / bukti |
|--:|---|---|---|---|--:|--:|--:|--:|:--:|---|---|
| 1 | `home` | Beranda | Beranda | L4 | 3,60 | 3,57 | **3,57** | — |  | arc◐ | 1 commit |
| 2 | `personal` | Data Personal Saya | Saya | L4 | 3,70 | 3,67 | **3,67** | — |  | arc✔ | 4 commit |
| 3 | `cockpit` | Engagement Cockpit | Ruang Kerja Perikatan | L4 | 2,00 | 2,00 | **2,44**(s) | +0,44 |  | arc✔ | #255 #265 |
| 4 | `tasks` | My Tasks | Ruang Kerja Perikatan | L4 | 2,90 | 2,88 | **2,88** | — |  | arc◐ | 3 commit |
| 5 | `programme` | Audit Programme | Ruang Kerja Perikatan | L4 | 3,30 | 3,33 | **3,67**(s) | +0,34 |  | arc✔ | 7 commit |
| 6 | `reviewnotes` | Review Notes | Ruang Kerja Perikatan | L4 | 3,10 | 3,12 | **3,38**(s) | +0,26 |  | sapuan | 3 commit |
| 7 | `time` | Time & Budget | Ruang Kerja Perikatan | L4 | 2,10 | 2,10 | **2,90**(s) | +0,80 |  | arc✔ | #266 #281 #282 |
| 8 | `audittimeline` | Jadwal & Lini Masa Audit | Ruang Kerja Perikatan | L4 | 3,10 | 3,11 | **3,11** | — |  | arc✔ | 1 commit |
| 9 | `pipeline` | Sales Pipeline | Operasi Praktik | L4 | 2,90 | 2,67 | **3,33**(s) | +0,66 |  | arc✔ | #254 |
| 10 | `delivery` | Delivery & Milestones | Operasi Praktik | L4 | 2,80 | 2,83 | **3,33**(s) | +0,50 |  | arc✔ | #264 |
| 11 | `wip` | WIP · Valuasi & Realisasi | Operasi Praktik | L4 | 3,70 | 3,57 | **3,57** | — |  | arc✔◐ | #237 #239 #270 #273 #274 |
| 12 | `billing` | Billing & Invoicing | Operasi Praktik | L4 | 2,80 | 2,80 | **3,80**(s) | +1,00 |  | arc✔ | #275 |
| 13 | `scheduler` | Resource Scheduler | Operasi Praktik | L4 | 2,00 | 2,00 | **2,00** | — | ⚠1 | sapuan | 2 commit |
| 14 | `capacity` | Capacity Planning | Operasi Praktik | L4 | 3,20 | 3,17 | **3,17** | — |  | arc✔ | 2 commit |
| 15 | `hcm` | Human Capital | SDM & Kepatuhan | L4 | 3,30 | 3,00 | **3,67**(s) | +0,67 |  | arc✔⏸ | #256 · lokal `01e97eb` |
| 16 | `orgchart` | Struktur Organisasi | SDM & Kepatuhan | L4 | 3,00 | 2,80 | **2,80** | — |  | arc◐ | 1 commit |
| 17 | `recruitment` | Rekrutmen & Onboarding | SDM & Kepatuhan | L4 | 3,20 | 2,50 | **2,50** | — |  | sapuan | 4 commit |
| 18 | `learning` | Pelatihan & Kompetensi | SDM & Kepatuhan | L4 | 3,30 | 3,00 | **3,00** | — |  | sapuan | 4 commit |
| 19 | `succession` | Suksesi & Karier | SDM & Kepatuhan | L4 | 3,20 | 2,83 | **2,83** | — |  | arc◐ | 1 commit |
| 20 | `payroll` | Payroll & PPh 21 | SDM & Kepatuhan | L4 | 3,40 | 3,00 | **3,71**(s) | +0,71 |  | arc✔ | 5 commit |
| 21 | `leave` | Cuti & Kehadiran | SDM & Kepatuhan | L4 | 3,20 | 2,50 | **3,00**(s) | +0,50 |  | arc✔ | 6 commit |
| 22 | `performance` | Siklus Kinerja | SDM & Kepatuhan | L4 | 3,50 | 3,33 | **3,83**(s) | +0,50 |  | arc✔ | 6 commit |
| 23 | `cpe` | CPE / PPL Tracker | SDM & Kepatuhan | L4 | 3,40 | 2,71 | **3,71**(s) | +1,00 |  | arc✔ | #257 |
| 24 | `ethics` | Kode Etik & AML/PMPJ | SDM & Kepatuhan | L5 | 3,80 | 3,38 | **3,38** | — |  | sapuan | 3 commit |
| 25 | `independence` | Independensi Firma & Rotasi | SDM & Kepatuhan | L4 | 3,60 | 3,00 | **3,44**(s) | +0,44 |  | arc✔ | #276 |
| 26 | `hrcase` | Sanksi & Disiplin | SDM & Kepatuhan | L4 | 3,50 | 3,00 | **3,00** | — |  | sapuan | 3 commit |
| 27 | `regref` | Registri Regulasi (multi-tahun) | SDM & Kepatuhan | L4 | — | — | **n/a** | — |  | baru | #259 · lokal `18bbcc0` |
| 28 | `firmgl` | General Ledger | Keuangan Firma (ERP) | L4 | 2,00 | 2,00 | **2,00** | — |  | arc✔⏸ | #234 #241 #243 · lokal `daee729` |
| 29 | `apar` | AP / AR Firma | Keuangan Firma (ERP) | L4 | 2,60 | 2,57 | **3,14**(s) | +0,57 |  | arc✔◐ | #240 |
| 30 | `revenue` | Pendapatan Firma | Keuangan Firma (ERP) | L4 | 2,00 | 2,00 | **2,40**(s) | +0,40 | ⚠1 | arc✔ | #277 #278 |
| 31 | `treasury` | Anggaran & Arus Kas | Keuangan Firma (ERP) | L4 | 2,80 | 2,80 | **2,80** | — |  | arc✔ | #242 #287 #290 |
| 32 | `cashbank` | Kas, Bank & Rekonsiliasi | Keuangan Firma (ERP) | L4 | 2,20 | 2,20 | **3,00**(s) | +0,80 |  | arc✔ | #247 #249 #283 |
| 33 | `fixedassets` | Aset Tetap Kantor | Keuangan Firma (ERP) | L4 | 3,00 | 3,00 | **3,00** | — |  | arc✔ | #258 #289 |
| 34 | `firmtax` | PPh Badan Firma | Keuangan Firma (ERP) | L4 | 2,00 | 2,00 | **2,29**(s) | +0,29 |  | arc⏸ | lokal `0508891` |
| 35 | `profitability` | Profitability | Keuangan Firma (ERP) | L4 | 3,00 | 3,00 | **3,00** | — |  | arc✔ | #268 #269 |
| 36 | `approvals` | Approvals | Platform Firma | L5 | 4,00 | 4,00 | **4,43**(s) | +0,43 |  | arc✔ | 9 commit |
| 37 | `integrations` | Integrations | Platform Firma | L4 | 3,00 | 3,20 | **3,20** | — |  | tetap | — |
| 38 | `audittrail` | Audit Trail | Platform Firma | L3 | 1,70 | 1,67 | **3,33**(s) | +1,66 |  | arc✔ | #225 |
| 39 | `nonaudit` | Portofolio Jasa | Jasa Non-Audit (SPAP) | L4 | 2,60 | 1,80 | **2,60**(s) | +0,80 | ⚠1 | sapuan | 3 commit |
| 40 | `review2400` | Reviu LK (SPR 2400) | Jasa Non-Audit (SPAP) | L4 | 3,40 | 3,40 | **3,60**(s) | +0,20 |  | sapuan | 3 commit |
| 41 | `relatedsvc` | Jasa Terkait (4400/4410) | Jasa Non-Audit (SPAP) | L4 | 3,40 | 3,40 | **3,40** | — |  | sapuan | 1 commit |
| 42 | `assurance` | Asurans Lain (SPA) | Jasa Non-Audit (SPAP) | L4 | 3,00 | 3,00 | **3,40**(s) | +0,40 |  | sapuan | 1 commit |
| 43 | `duediligence` | Due Diligence | Jasa Non-Audit (SPAP) | L4 | 3,00 | 2,80 | **2,80** | — |  | tetap | — |
| 44 | `governance` | Governance (SOQM) | Mutu, Risiko & Regulasi | L4 | 3,00 | 3,00 | **3,00** | — |  | arc✔ | 4 commit |
| 45 | `soqm` | SOQM Operasional | Mutu, Risiko & Regulasi | L4 | 3,30 | 3,33 | **3,33** | — |  | arc✔ | 8 commit |
| 46 | `pppk` | Pelaporan PPPK | Mutu, Risiko & Regulasi | L3 | 1,70 | 1,67 | **1,83**(s) | +0,16 | ⚠1 | arc✔ | #257 |
| 47 | `sustain` | Laporan Keberlanjutan (POJK 51) | OJK · Pasar Modal & Keberlanjutan | L4 | 3,20 | 3,20 | **3,20** | — |  | tetap | — |
| 48 | `sectorck` | Daftar-Uji Sektor Jasa Keuangan | OJK · Pasar Modal & Keberlanjutan | L4 | 3,20 | 3,20 | **3,60**(s) | +0,40 |  | sapuan | 1 commit |
| 49 | `ojkfiling` | Batas Waktu & e-Filing OJK/BEI | OJK · Pasar Modal & Keberlanjutan | L3 | 1,40 | 1,40 | **1,40** | — | ⚠1 | tetap | — |
| 50 | `auditcomm` | Komite Audit (POJK 55/2015) | OJK · Pasar Modal & Keberlanjutan | L4 | 3,20 | 3,20 | **3,20** | — |  | tetap | — |
| 51 | `presentasi` | Presentasi Klien | Portal & Dokumen | L4 | 2,30 | 2,33 | **2,83**(s) | +0,50 |  | sapuan | 2 commit |
| 52 | `clientportal` | Portal Klien / PBC | Portal & Dokumen | L4 | 2,70 | 2,88 | **3,25**(s) | +0,37 |  | sapuan | 1 commit |
| 53 | `dms` | Manajemen Dokumen | Portal & Dokumen | L4 | 2,70 | 2,71 | **3,14**(s) | +0,43 | ⚠1 | arc✔ | 4 commit |
| 54 | `dashboard` | Firm Dashboard | Manajemen Praktik Firma | L4 | 2,60 | 2,58 | **2,92**(s) | +0,34 |  | sapuan | 1 commit |
| 55 | `bi` | BI & Konsolidasi | Manajemen Praktik Firma | L3 | 2,00 | 2,00 | **2,33**(s) | +0,33 |  | arc✔ | 3 commit |
| 56 | `crm` | Client CRM | Manajemen Praktik Firma | L4 | 2,40 | 2,78 | **3,00**(s) | +0,22 |  | arc✔ | 4 commit |
| 57 | `engagement` | Engagement Mgmt | Manajemen Praktik Firma | L4 | 3,10 | 3,38 | **3,38** | — |  | arc✔ | 4 commit |
| 58 | `onboarding` | Onboarding Klien | Manajemen Praktik Firma | L5 | 4,00 | 4,00 | **4,00** | — |  | arc✔ | 6 commit |
| 59 | `dataflow` | Alur Data & Integritas | Manajemen Praktik Firma | L4 | 3,30 | 3,44 | **3,44** | — |  | sapuan | 1 commit |
| 60 | `continuance` | Keberlanjutan Klien | Manajemen Praktik Firma | L5 | 3,70 | 3,71 | **3,71** | — |  | arc✔ | 3 commit |
| 61 | `teamindep` | Independensi Tim | Manajemen Praktik Firma | L4 | 3,40 | 3,40 | **3,40** | — |  | sapuan | 1 commit |
| 62 | `risk` | Risk Assessment | 1 · Perencanaan | L4 | 2,60 | 2,57 | **2,57** | — |  | tetap | — |
| 63 | `materiality` | Materiality | 1 · Perencanaan | L4 | 3,00 | 3,00 | **3,00** | — |  | sapuan | 2 commit |
| 64 | `icfr` | Internal Control | 1 · Perencanaan | L4 | 3,00 | 3,00 | **3,00** | — | ⚠1 | sapuan | 1 commit |
| 65 | `strategy` | Strategy Memo | 1 · Perencanaan | L4 | 3,70 | 3,71 | **3,86**(s) | +0,15 |  | arc✔ | 3 commit |
| 66 | `wtb` | Working Trial Balance | 2 · Pelaksanaan | L4 | 3,60 | 3,60 | **3,60** | — |  | arc✔ | 5 commit |
| 67 | `aje` | Adjusting Entries (AJE) | 2 · Pelaksanaan | L5 | 3,70 | 3,67 | **3,67** | — | ⚠1 | sapuan | 2 commit |
| 68 | `workpapers` | Working Papers | 2 · Pelaksanaan | L5 | 3,20 | 3,25 | **3,25** | — | ⚠1 | sapuan | 2 commit |
| 69 | `asersi` | Matriks Asersi | 2 · Pelaksanaan | L4 | 2,20 | 2,25 | **2,25** | — |  | arc✔ | 3 commit |
| 70 | `analytical` | Analytical Review | 2 · Pelaksanaan | L4 | 2,50 | 2,50 | **3,00**(s) | +0,50 | ⚠1 | sapuan | 2 commit |
| 71 | `jet` | Journal Entry Testing | 2 · Pelaksanaan | L4 | 2,10 | 2,12 | **2,12** | — |  | arc✔ | #280 |
| 72 | `diagnostic` | Tax Audit Diagnostic | 2 · Pelaksanaan | L2 | 0,80 | 0,80 | **0,80** | — |  | arc✔ | #288 |
| 73 | `confirm` | Confirmation Hub | Area Khusus & Estimasi | L4 | 2,40 | 2,43 | **3,43**(s) | +1,00 |  | arc✔ | 2 commit |
| 74 | `goingconcern` | Going Concern | Area Khusus & Estimasi | L4 | 3,30 | 3,33 | **3,33** | — |  | sapuan | 4 commit |
| 75 | `opening` | Opening Balance | Area Khusus & Estimasi | L4 | 3,20 | 3,25 | **3,25** | — | ⚠1 | arc◐ | 1 commit |
| 76 | `restatement` | Penyajian Kembali (Restatement) | Area Khusus & Estimasi | L4 | 2,20 | 2,17 | **2,17** | — |  | tetap | — |
| 77 | `subsequent` | Subsequent Events | Area Khusus & Estimasi | L4 | 2,40 | 2,43 | **2,43** | — |  | sapuan | 1 commit |
| 78 | `related` | Related Parties | Area Khusus & Estimasi | L4 | 2,30 | 2,29 | **2,86**(s) | +0,57 |  | sapuan | 1 commit |
| 79 | `groupaudit` | Group Audit | Area Khusus & Estimasi | L4 | 2,60 | 2,57 | **3,14**(s) | +0,57 | ⚠1 | sapuan | 2 commit |
| 80 | `internalaudit` | Internal Audit | Area Khusus & Estimasi | L4 | 1,00 | 1,00 | **1,67**(s) | +0,67 | ⚠2 | prompt | 1 commit |
| 81 | `expert` | Use of Expert | Area Khusus & Estimasi | L4 | 2,30 | 2,33 | **2,33** | — |  | sapuan | 1 commit |
| 82 | `serviceorg` | Service Org | Area Khusus & Estimasi | L4 | 3,00 | 3,00 | **3,00** | — |  | sapuan | 2 commit |
| 83 | `sad` | SAD Ledger | Area Khusus & Estimasi | L4 | 3,30 | 3,33 | **4,00**(s) | +0,67 |  | arc✔ | 3 commit |
| 84 | `evidence` | Evidence Evaluation | Area Khusus & Estimasi | L4 | 2,00 | 2,00 | **2,80**(s) | +0,80 | ⚠1 | sapuan | 1 commit |
| 85 | `sa200` | SA 200 · Tujuan Keseluruhan | SA · Tanggung Jawab (200) | L1 | 1,00 | 1,00 | **1,00** | — |  | sapuan | 1 commit |
| 86 | `sa230` | SA 230 · Dokumentasi Audit | SA · Tanggung Jawab (200) | L4 | 3,25 | 3,25 | **3,75**(s) | +0,50 |  | arc✔ | #286 #291 #292 #293 |
| 87 | `sa240` | SA 240 · Kecurangan (Fraud) | SA · Tanggung Jawab (200) | L4 | 2,86 | 2,86 | **2,86** | — |  | sapuan | 4 commit |
| 88 | `sa250` | SA 250 · Hukum & Regulasi | SA · Tanggung Jawab (200) | L4 | 2,83 | 2,83 | **2,83** | — |  | sapuan | 3 commit |
| 89 | `sa260` | SA 260 · Komunikasi TCWG | SA · Tanggung Jawab (200) | L4 | 2,83 | 2,83 | **2,83** | — |  | sapuan | 3 commit |
| 90 | `sa265` | SA 265 · Defisiensi Pengendalian | SA · Tanggung Jawab (200) | L4 | 3,17 | 3,33 | **3,33** | — |  | sapuan | 3 commit |
| 91 | `sa501` | SA 501 · Bukti Spesifik | SA · Bukti Audit (500) | L1 | 1,25 | 1,00 | **1,80**(s) | +0,80 |  | sapuan | 1 commit |
| 92 | `sa520` | SA 520 · Prosedur Analitis | SA · Bukti Audit (500) | L4 | 3,14 | 3,14 | **3,57**(s) | +0,43 |  | sapuan | 2 commit |
| 93 | `sa530` | SA 530 · Sampling Audit | SA · Bukti Audit (500) | L4 | 3,13 | 3,25 | **3,25** | — |  | sapuan | 2 commit |
| 94 | `sa540` | SA 540 · Estimasi Akuntansi | SA · Bukti Audit (500) | L4 | 3,67 | 3,67 | **3,67** | — |  | sapuan | 2 commit |
| 95 | `sa580` | SA 580 · Representasi Tertulis | SA · Bukti Audit (500) | L4 | 3,00 | 3,00 | **3,00** | — |  | sapuan | 2 commit |
| 96 | `sa701` | SA 701 · Hal Audit Utama | SA · Pelaporan (700) | L4 | 3,57 | 3,57 | **3,57** | — | ⚠1 | sapuan | 1 commit |
| 97 | `sa705` | SA 705/706 · Modifikasi Opini | SA · Pelaporan (700) | L4 | 3,29 | 3,29 | **3,29** | — |  | tetap | — |
| 98 | `sa710` | SA 710 · Komparatif | SA · Pelaporan (700) | L4 | 3,29 | 3,29 | **3,57**(s) | +0,28 |  | sapuan | 1 commit |
| 99 | `sa720` | SA 720 · Informasi Lain | SA · Pelaporan (700) | L4 | 3,25 | 3,25 | **3,25** | — |  | arc✔ | #232 |
| 100 | `sa800` | SA 800 · Kerangka Khusus | SA · Area Khusus & Perikatan | L1 | 1,00 | 1,00 | **2,00**(s) | +1,00 |  | sapuan | 3 commit |
| 101 | `sa805` | SA 805 · LK Tunggal & Elemen | SA · Area Khusus & Perikatan | L1 | 1,00 | 1,00 | **2,20**(s) | +1,20 |  | sapuan | 3 commit |
| 102 | `sa810` | SA 810 · Ringkasan LK | SA · Area Khusus & Perikatan | L1 | 1,00 | 1,00 | **2,00**(s) | +1,00 |  | sapuan | 2 commit |
| 103 | `spr2400` | SPR 2400 · Reviu | SA · Area Khusus & Perikatan | L1 | 1,00 | 1,00 | **1,00** | — |  | sapuan | 1 commit |
| 104 | `spr2410` | SPR 2410 · Reviu Interim | SA · Area Khusus & Perikatan | L4 | 3,00 | 3,00 | **3,00** | — |  | sapuan | 3 commit |
| 105 | `sjah3000` | SJAH 3000 · Asurans | SA · Area Khusus & Perikatan | L1 | 1,00 | 1,00 | **2,00**(s) | +1,00 | ⚠1 | sapuan | 2 commit |
| 106 | `sjah3400` | SJAH 3400 · Info Prospektif | SA · Area Khusus & Perikatan | L4⚠️ | 1,50 | 1,50 | **1,50** | — |  | sapuan | 1 commit |
| 107 | `sjah3402` | SJAH 3402 · Org. Jasa | SA · Area Khusus & Perikatan | L4⚠️ | 1,50 | 1,40 | **1,40** | — | ⚠1 | sapuan | 1 commit |
| 108 | `sjah3410` | SJAH 3410 · Emisi GRK | SA · Area Khusus & Perikatan | L4⚠️ | 2,50 | 2,50 | **2,50** | — |  | sapuan | 1 commit |
| 109 | `sjah3420` | SJAH 3420 · Info Proforma | SA · Area Khusus & Perikatan | L4⚠️ | 1,50 | 1,33 | **1,33** | — | ⚠1 | sapuan | 1 commit |
| 110 | `psak1` | PSAK 1 → 201 · Penyajian LK | Akuntansi (PSAK & SAK) | L4 | 2,40 | 2,40 | **3,00**(s) | +0,60 | ⚠1 | sapuan | 2 commit |
| 111 | `psak2` | PSAK 2 → 207 · Laporan Arus Kas | Akuntansi (PSAK & SAK) | L4 | 2,60 | 2,60 | **3,20**(s) | +0,60 |  | sapuan | 1 commit |
| 112 | `psak14` | PSAK 14 → 202 · Persediaan | Akuntansi (PSAK & SAK) | L4 | 3,20 | 3,00 | **3,60**(s) | +0,60 |  | sapuan | 1 commit |
| 113 | `psak16` | PSAK 16 → 216 · Aset Tetap | Akuntansi (PSAK & SAK) | L4 | 3,50 | 3,50 | **3,50** | — |  | tetap | — |
| 114 | `psak19` | PSAK 19 → 238 · Aset Takberwujud | Akuntansi (PSAK & SAK) | L4 | 2,80 | 2,80 | **3,40**(s) | +0,60 |  | sapuan | 1 commit |
| 115 | `psak22` | PSAK 22 → 103 · Kombinasi Bisnis | Akuntansi (PSAK & SAK) | L4 | 2,60 | 2,60 | **3,20**(s) | +0,60 |  | sapuan | 1 commit |
| 116 | `psak24` | PSAK 24 → 219 · Imbalan Kerja | Akuntansi (PSAK & SAK) | L4 | 2,80 | 2,80 | **3,40**(s) | +0,60 |  | sapuan | 1 commit |
| 117 | `psak25` | PSAK 25 → 208 · Kebijakan, Estimasi & Kesalahan | Akuntansi (PSAK & SAK) | L4 | 2,80 | 2,80 | **3,40**(s) | +0,60 |  | sapuan | 1 commit |
| 118 | `psak46` | PSAK 46 → 212 · Pajak Penghasilan | Akuntansi (PSAK & SAK) | L4 | 3,20 | 3,00 | **3,60**(s) | +0,60 |  | sapuan | 1 commit |
| 119 | `psak48` | PSAK 48/57 → 236/237 · Penurunan Nilai & Provisi | Akuntansi (PSAK & SAK) | L4 | 2,80 | 2,60 | **3,20**(s) | +0,60 |  | sapuan | 2 commit |
| 120 | `psak58` | PSAK 58 → 105 · Aset Dijual & Operasi Dihentikan | Akuntansi (PSAK & SAK) | L4 | 2,50 | 2,60 | **3,20**(s) | +0,60 |  | sapuan | 1 commit |
| 121 | `psak65` | PSAK 65 → 110 · Laporan Konsolidasian | Akuntansi (PSAK & SAK) | L4 | 2,80 | 2,80 | **3,40**(s) | +0,60 |  | sapuan | 1 commit |
| 122 | `psak66` | PSAK 66 → 111 · Pengaturan Bersama | Akuntansi (PSAK & SAK) | L4 | 2,60 | 2,60 | **3,20**(s) | +0,60 |  | sapuan | 1 commit |
| 123 | `psak68` | PSAK 68 → 113 · Pengukuran Nilai Wajar | Akuntansi (PSAK & SAK) | L4 | 2,80 | 2,80 | **3,40**(s) | +0,60 |  | sapuan | 1 commit |
| 124 | `psak71` | PSAK 71 → 109 · Instrumen Keuangan | Akuntansi (PSAK & SAK) | L4 | 3,30 | 3,17 | **3,67**(s) | +0,50 |  | arc✔ | #232 |
| 125 | `psak72` | PSAK 72 → 115 · Pendapatan | Akuntansi (PSAK & SAK) | L4 | 3,00 | 3,00 | **3,50**(s) | +0,50 |  | sapuan | 1 commit |
| 126 | `psak73` | PSAK 73 → 116 · Sewa | Akuntansi (PSAK & SAK) | L4 | 2,80 | 2,60 | **3,20**(s) | +0,60 |  | sapuan | 2 commit |
| 127 | `psak117` | PSAK 117 · Kontrak Asuransi (d/h PSAK 74) | Akuntansi (PSAK & SAK) | L4 | 3,00 | 3,00 | **3,00** | — |  | tetap | — |
| 128 | `isak35` | ISAK 35 → 335 · Entitas Nonlaba | Akuntansi (PSAK & SAK) | L4 | 3,20 | 2,83 | **3,50**(s) | +0,67 |  | sapuan | 2 commit |
| 129 | `segmen` | PSAK 5 · Informasi Segmen | Akuntansi (PSAK & SAK) | L3 | 2,00 | 1,75 | **1,75** | — |  | tetap | — |
| 130 | `invprop` | PSAK 13 · Properti Investasi | Akuntansi (PSAK & SAK) | L2 | 1,40 | 1,40 | **1,40** | — |  | tetap | — |
| 131 | `assoc` | PSAK 15 · Investasi Asosiasi | Akuntansi (PSAK & SAK) | L3 | 2,00 | 2,00 | **2,00** | — |  | tetap | — |
| 132 | `newdisc` | Pengungkapan Baru 2024 | Akuntansi (PSAK & SAK) | L2 | 1,80 | 1,60 | **1,60** | — |  | tetap | — |
| 133 | `sakroadmap` | Roadmap SAK & Pelacak ISAK | Akuntansi (PSAK & SAK) | L4 | 2,80 | 2,80 | **2,80** | — |  | tetap | — |
| 134 | `sakep` | SAK EP · Penomoran | Akuntansi (PSAK & SAK) | L0 | 0,30 | 0,30 | **0,30** | — |  | tetap | — |
| 135 | `framework` | Penentu Kerangka (SAK/EP/EMKM) | Akuntansi (PSAK & SAK) | L3 | 2,20 | 2,20 | **2,20** | — |  | tetap | — |
| 136 | `ecl` | Kalkulator ECL | Akuntansi (PSAK & SAK) | L4 | 2,80 | 2,83 | **3,50**(s) | +0,67 |  | sapuan | 1 commit |
| 137 | `syariah` | SAK Syariah · PSAK 101–112 | Akuntansi Syariah (SAK Syariah) | L4 | 3,00 | 3,00 | **3,00** | — |  | tetap | — |
| 138 | `fsgen` | Financial Statement Gen. | 3 · Penyelesaian & Pelaporan | L4 | 3,10 | 3,11 | **3,22**(s) | +0,11 | ⚠1 | sapuan | 1 commit |
| 139 | `disclosure` | Daftar-Uji Pengungkapan | 3 · Penyelesaian & Pelaporan | L4* | 2,30 | 2,29 | **2,29** | — |  | tetap | — |
| 140 | `opinion` | Audit Opinion Generator | 3 · Penyelesaian & Pelaporan | L4 | 3,40 | 3,42 | **3,50**(s) | +0,08 |  | sapuan | 3 commit |
| 141 | `eqr` | EQR Workflow | 3 · Penyelesaian & Pelaporan | L4 | 2,90 | 2,89 | **2,89** | — |  | arc✔ | 3 commit |
| 142 | `mgmtletter` | Management Letter | 3 · Penyelesaian & Pelaporan | L4* | 2,80 | 2,90 | **3,00**(s) | +0,10 | ⚠2 | arc✔ | 3 commit |
| 143 | `compmatrix` | Matriks Kepatuhan | Referensi & Indeks | L4 | 2,90 | 2,88 | **3,25**(s) | +0,37 |  | sapuan | 2 commit |
| 144 | `templates` | Template Library | Referensi & Indeks | L4 | 2,10 | 2,11 | **2,44**(s) | +0,33 |  | sapuan | 3 commit |
| 145 | `kb` | Knowledge Base | Referensi & Indeks | L4 | 2,90 | 2,90 | **3,20**(s) | +0,30 |  | sapuan | 3 commit |
| 146 | `firmops` | Cockpit Operasi Firma | Operasi & Administrasi Firma | L4 | 3,20 | 2,83 | **3,50**(s) | +0,67 |  | arc✔ | 4 commit |
| 147 | `firmfinance` | Firm Finance | Operasi & Administrasi Firma | L4 | 3,60 | 3,00 | **3,00** | — |  | arc✔ | #241 #242 |
| 148 | `procurement` | Pengadaan & Vendor | Operasi & Administrasi Firma | L4 | 3,60 | 3,57 | **3,57** | — | ⚠1 | sapuan | 2 commit |
| 149 | `facilities` | Aset & Fasilitas Kantor | Operasi & Administrasi Firma | L4 | 3,70 | 3,57 | **3,57** | — |  | sapuan | 2 commit |
| 150 | `records` | Retensi & Arsip (SA 230) | Operasi & Administrasi Firma | L5 | 4,10 | 4,12 | **4,12** | — |  | arc✔ | #291 #292 #293 |
| 151 | `legal` | Kontrak & Legal Firma | Operasi & Administrasi Firma | L4 | 3,60 | 3,38 | **3,38** | — |  | tetap | — |
| 152 | `insurance` | Asuransi (PII) & Risiko | Operasi & Administrasi Firma | L4 | 3,70 | 3,57 | **3,57** | — |  | sapuan | 2 commit |
| 153 | `travel` | Perjalanan & Reimbursement | Operasi & Administrasi Firma | L4 | 3,40 | 3,14 | **3,14** | — |  | tetap | — |
| 154 | `licensing` | Lisensi & Perizinan | Operasi & Administrasi Firma | L4 | 3,80 | 3,71 | **3,71** | — |  | tetap | — |
| 155 | `tax` | PPh 23 · Pemotongan | Operasi & Administrasi Firma | L4 | 3,30 | 2,43 | **3,00**(s) | +0,57 | ⚠1 | sapuan | 4 commit |
| 156 | `crypto` | Compliance & Kriptografi | Operasi & Administrasi Firma | L5 | 4,30 | 4,29 | **4,29** | — |  | arc✔ | 3 commit |
| 157 | `pdp` | Pelindungan Data Pribadi (PDP) | Operasi & Administrasi Firma | L4 | 3,70 | 3,38 | **3,38** | — |  | sapuan | 1 commit |
| 158 | `forensic` | Forensic Cash Flow | Operasi & Administrasi Firma | L4 | 3,50 | 3,12 | **3,12** | — |  | tetap | — |

> **Dua baris tak punya baseline E-9 dan itu bermakna:**
> `regref` (#27) adalah modul yang **belum ada** saat E-9 dijalankan — lahir dari PR #259;
> Tahap A-2-nya menunggu di cabang lokal `18bbcc0`. `sakep` (#134) tetap **tanpa berkas view**:
> ia tidak punya entri di `lazy_views.tsx` dan masih dirender lewat fallback `ComplianceView` —
> satu-satunya L0 di seluruh aplikasi, persis seperti yang E-9 catat, tak berubah sejak itu.
## 4 · Cacat E-9 yang TERBUKTI masih hidup (bukti keras)

Fitur yang E-9 nilai L<=2, yang literal buktinya masih ada di `origin/master` **di luar
komentar**. Bukan inferensi — literalnya bisa di-grep. 25 temuan / 23 modul.

| # | Modul | Fitur (E-9) | L | Literal yang masih hidup | Berkas |
|--:|---|---|:--:|---|---|
| 1 | `internalaudit` Internal Audit | Evaluasi 3 faktor SA 610 | L1 | `IA_FACTORS_SEED` | `view_internalaudit.tsx` |
| 2 | `internalaudit` Internal Audit | Area penggunaan & reperform | L1 | `IA_USE_AREAS`, `IA_REPERF`, `IA_DIRECT` | `view_internalaudit.tsx` |
| 3 | `mgmtletter` Management Letter | `decisionBy` identitas | L2 | `'Linda Wijaya (Manager)'` | `view_final3.tsx` |
| 4 | `mgmtletter` Management Letter | Aksi "Kirim Ringkasan ke PIC"/"Tautkan KKP"/"Jadwalkan Follow-up" | L1 | `'(mock)'` | `view_final3.tsx` |
| 5 | `scheduler` Resource Scheduler | Label jendela minggu | L1 | `2026` | `view_scheduler.tsx` |
| 6 | `revenue` Pendapatan Firma | Roll-forward aset/liabilitas kontrak | L1 | `0.74`, `0.32`, `0.28` | `view_firmrevenue.tsx` |
| 7 | `nonaudit` Portofolio Jasa | Badge kategori + warna | L1 | `NA_CAT_COLOR` | `view_nonaudit.tsx`, `view_nonaudit2.tsx` |
| 8 | `pppk` Pelaporan PPPK | Register klien/opini/rotasi | L2 | `PPPK_REPORT`, `CLIENTS`, `ROTATION` | `view_pppk.tsx` |
| 9 | `ojkfiling` Batas Waktu & e-Filing OJK/BEI | Tabel kewajiban filing | L2 | `AMS_CANON` | `view_ojkfiling.tsx` |
| 10 | `dms` Manajemen Dokumen | Identitas owner & akses | L2 | `'Anindya Pramesti'` | `view_dms.tsx` |
| 11 | `icfr` Internal Control | Matriks kontrol per siklus | L2 | `IC_CYCLES`, `'Rp 842 M'` | `view_icfr.tsx` |
| 12 | `aje` Adjusting Entries (AJE) | Tarif & ambang | L2 | `AJE_TAX`, `0.22`, `COVENANT` | `view_aje.tsx` |
| 13 | `workpapers` Working Papers | Attachment WP | L2 | `WP_ATTACH` | `view_wp.tsx` |
| 14 | `analytical` Analytical Review | Peta akun→risiko | L2 | `RISK_LINK` | `view_analytical.tsx`, `view_analytical2.tsx` |
| 15 | `opening` Opening Balance | Seed transisi | L2 | `OB_TRANSITION` | `view_opening.tsx` |
| 16 | `groupaudit` Group Audit | Seed komponen | L2 | `GA_COMPONENTS` | `view_groupaudit.tsx`, `view_groupaudit_parts.tsx` |
| 17 | `evidence` Evidence Evaluation | Matriks & hierarki | L2 | `EV_SEED`, `EV_PROCS`, `EV_HIERARCHY` | `view_evidence.tsx`, `view_evidence2.tsx` |
| 18 | `sa701` SA 701 · Hal Audit Utama | Deep-link tab | L2 | `'penentuan'` | `view_sa701.tsx` |
| 19 | `sjah3000` SJAH 3000 · Asurans | Nav ke assurance workspace | L1 | `'assurance'` | `view_sjah3000.tsx` |
| 20 | `sjah3402` SJAH 3402 · Org. Jasa | Nav ke serviceorg (SA 402 sisi pengguna) | L1 | `'serviceorg'` | `view_sjah3402.tsx` |
| 21 | `sjah3420` SJAH 3420 · Info Proforma | Deep-link ke psak22/psak65 | L1 | `'psak22'`, `'psak65'` | `view_sjah3420.tsx` |
| 22 | `psak1` PSAK 1 → 201 · Penyajian LK | Skor kepatuhan penyajian (4 kartu + checklist interaktif) | L2 | `P1_COMPONENTS`, `P1_LINES_` | `view_psak1.tsx`, `view_psak14.tsx` |
| 23 | `fsgen` Financial Statement Gen. | Periode/tahun dokumen | L2 | `FY2025` | `view_fsgen.tsx` |
| 24 | `procurement` Pengadaan & Vendor | Gate peran | L2 | `NPWP` | `view_procurement.tsx`, `view_procurement2.tsx` |
| 25 | `tax` PPh 23 · Pemotongan | Gate peran | L2 | `NPWP` | `view_tax23.tsx` |

## 5 · Falsifikasi tangan atas kandidat prioritas

Uji token otomatis hanya menjangkau fitur yang bukti E-9-nya mengandung literal. Untuk
kandidat teratas saya buka kodenya di `origin/master` dan menghitung sendiri — komentar
dibuang lebih dulu, karena beberapa literal E-9 kini hidup HANYA sebagai komentar yang
menjelaskan pencabutannya (jet `+38`, asersi `0.75`, cockpit `CKP_RATE`). Menghitung tanpa
membuang komentar akan melaporkan cacat yang sudah tertutup.

| Modul | Klaim E-9 | Keadaan di `origin/master` | Vonis |
|---|---|---|---|
| `spr2400` | Materialitas hardcode 900/675 jt; laporan reviu tak bisa diekspor | `900`=1, `675`=1 masih hidup; `materiality()`/`useMateriality` **nol panggilan** di `view_spr2400.tsx` | **BERLAKU PENUH** — pelanggaran SSOT utuh |
| `sa200` | Display-only; tombol Memo/AI Assist mati; ttd partner hardcode | `amsExport`=2 (ekspor tersambung, #228); `WpPanel`=0; `Hartono Wijaya`=1 masih hidup | **SEBAGIAN** — ekspor tertutup, ttd & sign-off belum |
| `sa800 / sa805 / sa810` | 3 tombol mati; ttd "Hartono Wijaya, CPA" hardcode | masing-masing `amsExport`=3; `Hartono Wijaya`=1 masih hidup di ketiganya | **SEBAGIAN** — tombol hidup, ttd karangan bertahan |
| `sjah3000` | Tombol Unduh mati; ttd hardcode | `amsExport`=2; `Hartono Wijaya`=**0** | **TERTUTUP** — jangan dikirimi orang |
| `asersi` | P0 PM hardcode `om*0.75` melanggar SSOT materialitas | `0.75` hanya tersisa di komentar; `useMateriality`=2 hidup | **TERTUTUP** (#212) — teks gap E-9 basi |
| `ojkfiling` | TODAY beku `2026-06-17` (data_ojk) | `data_ojk.ts` kini `const TODAY = new Date(AMS.TODAY)` | **TERTUTUP** (#226/#231) |
| `ojkfiling` | Display-only tanpa ekspor | `view_ojkfiling.tsx`: `amsExport`=0, `useAmsPersist|useServerState`=0 | **BERLAKU** — masih cangkang |
| `invprop` | Portofolio HARDCODED literal di view; tak bergerak saat WTB berubah | `valueInUse`=0, `WTB`=0, persist=0; berkas view **tak berubah sama sekali** sejak E-9 | **BERLAKU PENUH** |
| `sa501` | Data contoh hardcode; tanpa ekspor/WpPanel | `amsExport`=2; `WpPanel`=0; `confirmState`=0 | **SEBAGIAN** — ekspor tertutup, sign-off & SA 505 belum |
| `icfr` | Matriks siklus hardcode `Rp 842 M`, tak tie ke WTB | `Rp 842 M`=1, `IC_CYCLES`=2 masih hidup | **BERLAKU PENUH** |
| `mgmtletter` | `decisionBy` identitas hardcode; ekspor lewat amsPrintDoc; aksi "(mock)" | `amsPrintDoc`=**0**, `amsExport`=2 (#229); tapi `Linda Wijaya`=**13 situs**, `(mock)`=2 | **SEBAGIAN — dan lebih buruk dari yang E-9 tulis** |
| `revenue` | Roll-forward aset/liabilitas kontrak dari faktor fiktif x0,74/0,32 | `view_firmrevenue.tsx:157-158` masih `totAsset * 0.74` dan `totRecognized * 0.32` | **BERLAKU** — #277/#278 tidak menyentuhnya |
| `templates` | Semua aksi mati (Unduh/Unggah/Template Baru) | `view_misc2.tsx`: `amsExport`=2, `onClick`=14 | **SEBAGIAN** — teks gap E-9 terlalu keras |
| `internalaudit` | Evaluasi SA 610 hardcode seed | `IA_FACTORS_SEED`, `IA_USE_AREAS`, `IA_REPERF` masih hidup | **BERLAKU PENUH** — prompt `80` belum dieksekusi |

## 6 · Di mana angka §3 diketahui MENGECILKAN keadaan

| Modul | §3 | Kenapa mengecilkan |
|---|--:|---|
| `diagnostic` | 0,80 | Mesinnya di `use_diagnostics.ts`/`diagnostics_panel.tsx`; view hanya 75 baris. PR #288 memberi mesin data perikatan, mencabut pelaku & tanggal karangan, dan membuat detektor bisu berhenti menyamar sebagai bersih. Sinyal berbasis-view buta terhadap semua itu. |
| `firmgl` | 2,00 | #234 (komputasi TB/LK dari jurnal) + #243 (jejak posting akun kontrol) menutup P0 "posting tak berdampak". Ekspor GL/TB/LK memang masih L0 — `firm_gl_export.ts` ada di direktori kerja, belum di master. |
| `profitability` | — | `RATE_CARD` sudah hilang dari `view_profit.tsx` (#268/#269); E-9 tak memberi token yang bisa diuji untuk realisasi fee. |
| `wip` | — | Hasil peleburan `wip`+`wipreal` (#237); baseline E-9 menilai dua modul terpisah, jadi delta-nya tak sebanding. |
| `regref` | — | Modul BARU sesudah E-9 (#259); tak punya baseline. |
| `firmtax`, `hcm` | — | Arc selesai tapi hidup di cabang lokal (`0508891`, `01e97eb`); master belum melihatnya. |

## 7 · Implikasi untuk antrean prompt

Dangkal **dan** belum punya prompt, diurut dari terdangkal. Kolom "Gap utama" adalah kalimat
E-9 apa adanya (2026-08-13); yang terbukti basi di §5 ditandai coret.

| # | id | Modul | Sekarang | ⚠ | View berubah? | Gap utama menurut E-9 |
|--:|---|---|--:|:--:|---|---|
| 85 | `sa200` | SA 200 · Tujuan Keseluruhan | 1,00 | — | ya | Display-only sejati; tombol Memo/AI Assist dead; sign-off partner hardcode |
| 103 | `spr2400` | SPR 2400 · Reviu | 1,00 | — | ya | Materialitas HARCODE 900/675 jt (:237–239, SSOT); laporan reviu tak bisa dieks |
| 109 | `sjah3420` | SJAH 3420 · Info Proforma | 1,33 | ⚠1 | ya | Key pf3420.exec FIRM-scope; penyesuaian/asumsi statis; tanpa ekspor |
| 49 | `ojkfiling` | Batas Waktu & e-Filing OJK/BEI | 1,40 | ⚠1 | **tidak** | ~~Display-only; TODAY beku 2026-06-17 (data_ojk:203)~~ (lihat §5) |
| 107 | `sjah3402` | SJAH 3402 · Org. Jasa | 1,40 | ⚠1 | ya | Key soc3402.exec FIRM-scope; konten Tipe I/II statis; tanpa ekspor |
| 130 | `invprop` | PSAK 13 · Properti Investasi | 1,40 | — | **tidak** | Portofolio HARDCODED literal di view (P1) — tidak bergerak saat WTB berubah |
| 106 | `sjah3400` | SJAH 3400 · Info Prospektif | 1,50 | — | ya | Key pfi3400.exec FIRM-scope (bocor lintas-perikatan, edit non-admin ditolak se |
| 132 | `newdisc` | Pengungkapan Baru 2024 | 1,60 | — | **tidak** | Angka ETR hardcoded lokal — basi per klien |
| 129 | `segmen` | PSAK 5 · Informasi Segmen | 1,75 | — | **tidak** | Tanpa server state & tanpa ekspor — display-only interaktif |
| 91 | `sa501` | SA 501 · Bukti Spesifik | 1,80 | — | ya | Display-only sejati; data contoh hardcode; tanpa ekspor/WpPanel |
| 46 | `pppk` | Pelaporan PPPK | 1,83 | ⚠1 | ya | Tanggal beku daysLeft; aksi utama mati |
| 13 | `scheduler` | Resource Scheduler | 2,00 | ⚠1 | ya | Label minggu hardcode (tak bergeser); tombol "Minggu Depan" mati |
| 100 | `sa800` | SA 800 · Kerangka Khusus | 2,00 | — | ya | 3 tombol mati (Memo/AI Assist/Unduh :104–105,374); ttd "Hartono Wijaya, CPA" h |
| 102 | `sa810` | SA 810 · Ringkasan LK | 2,00 | — | ya | 3 tombol mati (:108–109,401); ttd hardcode (:401); kriteria SA 810 ¶5–9 statis |
| 105 | `sjah3000` | SJAH 3000 · Asurans | 2,00 | ⚠1 | ya | Tombol Unduh mati (:388); ttd hardcode; katalog elemen statis |
| 131 | `assoc` | PSAK 15 · Investasi Asosiasi | 2,00 | — | **tidak** | Tanpa server state & tanpa ekspor |
| 76 | `restatement` | Penyajian Kembali (Restatement) | 2,17 | — | **tidak** | PM snapshot tak reaktif (deps []); LINEAGE kosong; tanpa ekspor |
| 101 | `sa805` | SA 805 · LK Tunggal & Elemen | 2,20 | — | ya | 3 tombol mati (:109–110,388); ttd hardcode (:388); isi contoh statis |
| 135 | `framework` | Penentu Kerangka (SAK/EP/EMKM) | 2,20 | — | **tidak** | Ambang EMKM 50M/10M hardcoded; window.LINEAGE ditulis runtime |
| 69 | `asersi` | Matriks Asersi | 2,25 | — | ya | ~~P0: PM hardcode om*0.75 (SSOT materialitas dilanggar)~~ (lihat §5) |
| 139 | `disclosure` | Daftar-Uji Pengungkapan | 2,29 | — | **tidak** | status firm-scope bocor lintas perikatan; tanpa ekspor; registri hardcode di v |
| 55 | `bi` | BI & Konsolidasi | 2,33 | — | ya | "Paket Laporan Dewan" mati; semua angka seed statis; tanpa gate |
| 81 | `expert` | Use of Expert | 2,33 | — | ya | Divergensi canon_expert_eval — gerbang SA 620 server tak melihat evaluasi modu |
| 77 | `subsequent` | Subsequent Events | 2,43 | — | ya | 2 dead button (Memo SE, Catat Peristiwa); periode hardcode |
| 144 | `templates` | Template Library | 2,44 | — | ya | ~~semua aksi mati (Unduh/Unggah/Template Baru); instansiasi mock; preview skelet~~ (lihat §5) |

**Rekomendasi tiga teratas** (dangkal + cacat terverifikasi + tanpa blokir keputusan Ari):

1. **#103 `spr2400`** — materialitas `900`/`675` literal dengan **nol panggilan** mesin
   materialitas. Cacat SSOT paling bersih di seluruh daftar, dan template induk sudah
   memakainya sebagai contoh terisi. Pertanyaan produknya sudah dijawab E-9: jadikan kertas kerja.
2. **#130 `invprop`** — berkas view **tak tersentuh sejak E-9**, portofolio literal, nol persist,
   nol tautan WTB. Klaim E-9 berlaku penuh tanpa perlu diragukan.
3. **#142 `mgmtletter`** — `Linda Wijaya` di **13 situs** sebagai identitas keputusan. Ini pola
   cacat #3 (nama kolega nyata jadi pelaku jejak) dengan sebaran terbesar yang pernah ditemukan
   di repo ini; agregat 3,00 menyembunyikannya sepenuhnya.

Yang **jangan** dikirim tanpa dibaca ulang: `asersi`, `ojkfiling` (sisi klok), `sjah3000`,
`templates` — E-9 menandainya bermasalah, kodenya sudah tidak.
