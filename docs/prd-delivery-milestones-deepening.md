# PRD — Delivery & Milestones: rencana pengiriman yang DAPAT GAGAL

> Wajib diisi sebelum implementasi apa pun. Implementasi TIDAK dimulai sebelum sign-off ("Proceed.").

| Field | Isi |
|---|---|
| Tanggal | 2026-08-16 |
| Pemilik | Ari Widodo |
| Status | **In Progress** — Approved ("Sesuai rekomendasi" 2026-08-16; Q-1..Q-5 = seluruh rekomendasi) |
| Pemicu | "Kembangkan lebih dalam fitur pada modul Delivery dan Milestones sampai tingkat memadai" (Ari, 2026-08-16) |
| Modul | `migration/src/view_delivery.tsx` · `canon_delivery.ts` · konsumen baca-saja `view_audittimeline.tsx` |
| PRD terkait | `docs/prd-sales-pipeline-deepening.md` (Implemented) — arc ini memakai pola yang sama: cabut literal → turunkan → gerbang yang bisa memerah |
| Prasyarat | Tidak ada. Berdiri di atas `master` `07d5b97` |

---

## 1. Problem

Modul Delivery menampilkan empat KPI, satu Gantt, dan panel "Status Pengiriman" yang
membaca seperti alat kendali pengiriman perikatan. **Tidak satu pun dari indikator
risikonya dapat memerah karena pekerjaan tertinggal, dan tiga di antaranya dapat
dipadamkan tanpa mengerjakan apa pun.**

### D-1 · KPI "Perikatan At-risk" dapat dipadamkan dengan mengganti dropdown fase

`progress` adalah **literal beku** di `data_part1.ts:42–52` (62 · 28 · 54 · 88 · 45 · 100 · 15).
Tidak ada satu pun jalur di seluruh `migration/src` yang menurunkannya dari pekerjaan
nyata. Satu-satunya penulisnya adalah `contexts.tsx:965`:

```ts
progress: phase === 'Arsip' ? 100 : phase === 'Finalisasi' ? Math.max(e.progress, 85) : e.progress
```

Sementara definisi at-risk di `view_delivery.tsx:102` (dan lagi di :105, :209) adalah:

```ts
DLV_daysTo(e.deadline, today) <= 14 && e.progress < 85
```

Ambangnya **85**. Ratchet-nya **85**. Konsekuensinya tepat satu: **memindahkan fase ke
"Finalisasi" memadamkan flag at-risk untuk perikatan mana pun, seketika, tanpa satu
kertas kerja pun bertambah.** Alarm "burn jam melampaui progres" (`burn > progress + 12`,
:220 & :240) dibungkam oleh ratchet yang sama — perikatan yang membakar 96% budget di
progres 62% menjadi "sehat" begitu fase diubah.

Ini bukan angka yang keliru; ini indikator risiko yang **pintu keluarnya adalah sebuah
dropdown**.

### D-2 · `done` milestone adalah klaim bebas — termasuk untuk EQR dan tanda tangan opini

`setMsDone` (`view_delivery.tsx:76`) menulis boolean murni. Milestone seed yang ada
mencakup **"EQR (SA 220)"**, **"Sign-off"**, **"Tanda tangan opini"**, **"Arsip (SMM)"**.
Semuanya dapat ditandai selesai dengan satu klik sementara:

- `eqrGateFor()` (`canon_eqr_gate.ts:69`) menyatakan `missing-review` / `open-review`;
- rantai tanda tangan kertas kerja kosong;
- `finalisationGateCriteria()` (`engagement_phase_gate.ts:48`) belum satu pun terpenuhi.

Dalam aplikasi audit ini bukan cacat angka — ini **jejak penyelesaian yang dikarang di
atas gerbang mutu yang sudah ada dan sudah bekerja, tetapi tidak pernah ditanya.**
Kelas cacat yang identik dengan #169 (status disulap jadi tanda tangan bertanggal) dan
#177 (integritas tanda tangan kertas kerja).

### D-3 · Keterlambatan dapat dihapus dengan menggeser date-picker

`setMsDate` (`view_delivery.tsx:77`) menimpa `date` **di tempat**. Tidak ada
`baselineDate`, tidak ada riwayat, tidak ada pencatat. KPI "Milestone Lewat Tempo"
(:103) menghitung terhadap tanggal yang baru saja digeser.

⇒ Tiga milestone lewat tempo → tarik date-picker → **0 lewat tempo**, dan modul melaporkan
pengiriman on-track. Tidak ada artefak yang menunjukkan komitmen semula pernah ada.
Untuk sebuah modul yang tugasnya melacak komitmen tanggal, ini menghapus seluruh nilainya
— sebagai alat manajemen maupun sebagai jejak.

### D-4 · Milestone tidak punya jenis; konsumen mengenalinya lewat regex label

`view_audittimeline.tsx:129` — timeline yang **dihadapkan ke klien**:

```ts
const signMs = plan.milestones.find((m) => /sign|opini/i.test(m.label));
```

Ganti label "Sign-off" menjadi "Penerbitan laporan" di modul Delivery dan timeline klien
kehilangan tanggal tanda tangannya — diam-diam, tanpa error.

### D-5 · Tidak ada urutan, prasyarat, atau konsistensi rencana

Milestone adalah daftar datar tanpa relasi. Tidak terdeteksi bila:
- "Sign-off" dijadwalkan / ditandai selesai **mendahului** "Selesai fieldwork" atau "EQR";
- fase Finalisasi mulai **sebelum** Eksekusi berakhir, atau ada lubang di antara fase;
- milestone jatuh **setelah** `e.deadline` perikatan (mis. sign-off lewat tenggat pelaporan).

Sebuah "rencana" yang tidak dapat dinyatakan tidak konsisten bukanlah rencana.

### D-6 · Penulisannya kemungkinan besar GAGAL SENYAP untuk Manajer

`deliveryPlan.v1` **tidak punya cabang** di `capForWrite` (`rbac.ts:139–197`) → jatuh ke
fallthrough firm-scope `return FIRM_ADMIN` (:197) → **Partner-only**.

Seorang Audit Manager menandai milestone selesai, melihatnya berubah di layar, lalu
tulisannya ditolak server dan kembali saat reload. Ini persis kelas cacat yang sudah
didokumentasikan **tiga kali** di berkas yang sama (`priorYear` :155, `capacityPlan.v1`
:186, `pipeline` :163) — `deliveryPlan.v1` terlewat.

> ⚠ Belum diverifikasi hidup (butuh sesi login peran Manajer). Verifikasi ini adalah
> langkah pertama PR-1; bila ternyata lolos, cabang RBAC tetap ditambahkan sebagai
> penegasan eksplisit + uji.

### D-7 · Bukan alat perencanaan, dan tidak dapat dioperasikan keyboard

- Milestone **tidak dapat ditambah, dihapus, atau diganti nama**; fase tidak dapat disunting.
  Yang bisa hanya toggle `done` dan geser tanggal. Rencana pengiriman yang tidak dapat
  direncanakan.
- Tidak ada **pemilik** per milestone — "Konfirmasi piutang" tidak dimiliki siapa pun.
- Baris Gantt adalah `<div onClick>` (`view_delivery.tsx:145`) — melanggar Aturan Emas §3.7
  dan tidak dapat dioperasikan keyboard (preseden #250 · #252).
- Kode mati: filter tautologis `... ? true : true` (:96); `months` `useMemo` berdeps `[]`
  sementara membaca `t0/t1/span`.
- Ekspor XLSX hanya memuat fase + milestone + status — tanpa baseline, geser, pemilik,
  atau pengecualian.

---

## 2. Objective

Menjadikan Delivery & Milestones sebagai **alat kendali pengiriman yang dapat memerah
karena kenyataan**, bukan papan status yang selalu bisa dibuat hijau:

1. Setiap indikator risiko punya **jalur gagal** yang tidak dapat ditutup tanpa mengubah fakta.
2. Klaim penyelesaian pada milestone bergerbang mutu **dikonfrontasi dengan gerbang yang sudah ada** (`eqrGateFor`, `finalisationGateCriteria`, rantai tanda tangan).
3. Komitmen tanggal semula **tidak dapat dihapus** — pergeseran adalah data, bukan penyuntingan.
4. Rencana benar-benar dapat direncanakan (tambah/hapus/pemilik), oleh **orang yang berhak**, dengan tulisan yang **tidak gagal senyap**.

## 3. Success Criteria

| # | Kriteria | Cara diuji |
|---|---|---|
| SC-1 | `capForWrite('firm','deliveryPlan.v1') === ENGAGEMENT_MANAGE`, bukan `FIRM_ADMIN` | uji unit sejajar `pipeline_rbac.test.ts` |
| SC-2 | Peran tanpa ENGAGEMENT_MANAGE melihat modul **baca-saja** (kontrol dinonaktifkan + alasan), bukan kontrol aktif yang tulisannya ditolak | uji + verifikasi hidup 2 peran |
| SC-3 | Menggeser tanggal milestone **tidak menurunkan** hitungan lewat-tempo terhadap baseline; "geser" muncul sebagai KPI & kolom tersendiri | uji kanon + hidup |
| SC-4 | Baseline milestone **tidak dapat disunting** dari UI; hanya `date` yang bergerak | uji |
| SC-5 | Milestone `kind:'eqr'` tidak dapat ditandai selesai secara manual — `done`-nya **diturunkan** dari `eqrGateFor()` | uji kanon (2 keadaan: cleared & missing-review) |
| SC-6 | Milestone bergerbang lain (`signoff`, `fieldwork-end`, `archive`) yang ditandai selesai tanpa bukti pendukung menampilkan status **"diklaim tanpa bukti"** dan masuk daftar pengecualian + ekspor | uji + hidup |
| SC-7 | `view_audittimeline` menemukan milestone tanda tangan lewat `m.kind === 'signoff'`; regex `/sign\|opini/i` **tidak ada lagi** di repo | grep-gate + uji |
| SC-8 | Rencana yang tidak konsisten (urutan terbalik · fase tumpang tindih/berlubang · milestone melewati `e.deadline`) menghasilkan temuan bernama, bukan diam | uji kanon per-jenis temuan |
| SC-9 | Ratchet `Math.max(e.progress, 85)` dicabut; mengubah fase ke Finalisasi **tidak lagi** memadamkan at-risk | uji + hidup |
| SC-10 | Angka kemajuan yang ditampilkan Delivery **berlabel jujur** sesuai keputusan Q-3, dan asalnya dapat ditelusuri dari UI | hidup |
| SC-11 | Milestone dapat ditambah, dihapus, diganti nama, dan diberi pemilik dari roster TEAM | hidup |
| SC-12 | Baris Gantt dapat dioperasikan keyboard (`button`/`role` + fokus terlihat); `npx playwright test 07-a11y` 0 critical | e2e axe |
| SC-13 | Ekspor XLSX memuat baseline · tanggal kini · geser (hari) · pemilik · status bukti · temuan konsistensi | hidup |
| SC-14 | Filter tautologis `? true : true` dan deps `months` yang salah dicabut | review + lint |
| SC-15 | `npm run verify` hijau penuh; ratchet `:any` tidak naik | gerbang repo |

## 4. Scope

- `migration/src/canon_delivery.ts` — model + seluruh derivasi baru (murni, teruji).
- `migration/src/view_delivery.tsx` — UI: KPI, Gantt, panel, detail, ekspor.
- `migration/src/view_audittimeline.tsx` — konsumen baca-saja: cabut regex, hormati baseline.
- `migration/src/rbac.ts` — satu cabang `capForWrite`.
- `migration/src/data_part4.ts` — seed `DELIVERY`: `kind` eksplisit + `baselineDate`.
- `migration/src/contexts.tsx:965` — cabut ratchet progres.
- Berkas uji terkait.

## 5. Non-Scope

- Sinkronisasi Google Calendar / notifikasi server atas milestone jatuh tempo.
- Lampiran dokumen (DMS) per milestone.
- Gantt drag-and-drop, resource leveling, CPM penuh dengan lag/lead & float.
- Dependensi **antar-perikatan**.
- Migrasi `deliveryPlan.v1` dari firm-scope ke engagement-scope (lihat Q-5).
- Menurunkan kemajuan **pekerjaan** untuk 7 perikatan dari kertas kerja — mustahil tanpa mengarang data (lihat Constraint C-1).

## 6. Constraints

- **C-1 · Data kertas kerja hanya ada untuk perikatan aktif.** `WP_INDEX`/`WP_META`
  (`wp_canon.ts:16`) adalah satu set untuk ENG-2025-014. Menurunkan "kemajuan pekerjaan"
  untuk ketujuh perikatan berarti **mengarang enam set kertas kerja** — persis pelanggaran
  yang PRD ini cabut. Karena itu Q-3 menawarkan kemajuan **rencana** (milestone selesai /
  total, berlaku untuk semua) dengan label yang jujur, bukan kemajuan pekerjaan palsu.
- **C-2 · Filosofi soft-gate P5** (`engagement_phase_gate.ts:10–12`): kriteria membimbing,
  penegakan diatur pemanggil. Q-1 harus konsisten dengan ini.
- **C-3 · `deliveryPlan.v1` firm-scope, satu dokumen memuat SELURUH perikatan.** Gantt
  lintas-perikatan membutuhkannya. Konsekuensi isolasi W7.5 → Q-5.
- **C-4 · Klok tunggal `AMS.TODAY`** (`data_part4.ts:428`), bukan wall-clock. Seluruh
  derivasi baru menerima `today` sebagai parameter (pola `canon_delivery` sekarang).
- **C-5 · SSOT & aturan emas repo** — tak ada angka hardcode, kontrol form native, token
  CSS terdaftar, skala tipografi 8 ukuran.

## 7. Existing Solutions (dipakai ulang, bukan dibuat baru)

| Kebutuhan | Yang SUDAH ada |
|---|---|
| Gerbang EQR | `canon_eqr_gate.ts` — `eqrGateFor()`, `EQR_GATE_LABEL`, `eqrGateDetail()` |
| Gerbang masuk Finalisasi | `engagement_phase_gate.ts` — `finalisationGateCriteria()` |
| Rantai tanda tangan & bukti WP | `wp_signoff.tsx`, `wp_canon.ts` (`wpEffectiveChain`, `deriveWpStatus`) |
| Status milestone turunan | `canon_delivery.ts` — `milestoneStatus()` (PR-A2, dipertahankan) |
| Ekspor tersegel | `export_xlsx.ts` — `amsExportXlsx()` |
| Pola RBAC key firm-scope | `rbac.ts` cabang `priorYear` / `capacityPlan.v1` / `pipeline` |
| Pola "cabut literal → turunkan → gerbang cakupan" | arc Sales Pipeline (`prd-sales-pipeline-deepening.md`) |

Tidak ada pustaka baru. Tidak ada dependensi baru.

## 8. Proposed Approach

Model milestone diperluas; **seluruh derivasi murni** di `canon_delivery.ts` (pola
`canon_capacity`/`canon_assertions` — tak menyentuh `AMS_CANON`):

```ts
type MilestoneKind =
  | 'kickoff' | 'interim' | 'stocktake' | 'confirmation'
  | 'fieldwork-end' | 'eqr' | 'signoff' | 'archive' | 'other';

interface DeliveryMilestone {
  label: string;
  kind: MilestoneKind;
  date: string;            // komitmen KINI — dapat digeser
  baselineDate: string;    // komitmen SEMULA — tidak dapat disunting dari UI
  done: boolean;           // untuk kind bergerbang penuh: DITURUNKAN, bukan disimpan
  doneAt?: string;
  owner?: string;          // dari roster TEAM
  shifts?: { at: string; by: string; from: string; to: string; reason?: string }[];
}
```

Derivasi baru (murni, masing-masing teruji):

- `milestoneSlip(m)` → hari geser vs baseline; `planSlip(plan)` → total & jumlah tergeser.
- `overdueVsBaseline(plan, today)` → lewat-tempo yang **tidak dapat dihapus** dengan menggeser.
- `milestoneEvidence(m, ctx)` → `{ required, satisfied, reason, detail }`, memanggil
  `eqrGateFor` / `finalisationGateCriteria` / rantai tanda tangan sesuai `kind`.
- `planConsistency(plan, eng, today)` → temuan bernama: `sequence` · `phase-overlap` ·
  `phase-gap` · `past-deadline`.
- `planProgress(plan)` → kemajuan **rencana** (milestone selesai / total) — dipakai sesuai Q-3.

UI: KPI diperluas (tergeser · diklaim tanpa bukti · temuan konsistensi), Gantt menampilkan
**bayangan baseline** di belakang batang fase & belah ketupat milestone, panel detail
menampilkan bukti + geser + pemilik, dan panel baru "Pengecualian Rencana".

## 9. Risks

| # | Risiko | Mitigasi |
|---|---|---|
| R-1 | Mencabut ratchet 85 mengubah angka di **24 berkas** yang membaca `.progress` | Ratchet hanya menaikkan saat fase Finalisasi/Arsip; PR-5 terpisah & terakhir, dengan snapshot uji sebelum/sesudah dan daftar konsumen terdampak |
| R-2 | Migrasi bentuk `deliveryPlan.v1` mematahkan dokumen tersimpan pengguna | Migrasi maju di `seedDeliveryPlan`: `baselineDate ??= date`, `kind ??= inferKindFromLabel(label)` (peta eksplisit sekali, bukan regex permanen), `owner ??= undefined` |
| R-3 | Gerbang bukti terlalu keras → auditor tak dapat mencatat kenyataan lapangan | Q-1; rekomendasi soft-gate + badge, kecuali `eqr` yang memang punya SSOT penuh |
| R-4 | Menghitung bukti untuk 7 perikatan sementara gerbang hanya bermakna untuk perikatan aktif | `milestoneEvidence` mengembalikan `required:false` + alasan eksplisit bila konteks tak tersedia — **tidak** menghijaukan diam-diam |
| R-5 | `capForWrite` diperketat → peran yang tadinya (mengira) bisa menulis kehilangan akses | SC-2: baca-saja yang **terlihat** dengan alasan, bukan tombol mati; verifikasi hidup 2 peran |
| R-6 | Gerbang cakupan menjadi tautologis (pelajaran #242) | Gerbang menguji **cakupan konsumen** (setiap `kind` bergerbang punya sumber bukti; tak ada regex label tersisa), bukan mengulang aljabar derivasi |

## 10. Implementation Plan

| PR | Isi | SC |
|---|---|---|
| **PR-1** | RBAC: cabang `capForWrite` + gate UI baca-saja + uji. Verifikasi hidup D-6 lebih dulu | SC-1 · SC-2 |
| **PR-2** | Baseline & geser: model + migrasi maju + derivasi + KPI/kolom + ekspor | SC-3 · SC-4 |
| **PR-3** | `kind` bertipe + seed eksplisit; cabut regex `audittimeline`; `planConsistency` + panel pengecualian | SC-7 · SC-8 |
| **PR-4** | `milestoneEvidence` — konfrontasi klaim `done` dengan `eqrGateFor` / finalisasi / rantai tanda tangan (kebijakan per Q-1) | SC-5 · SC-6 |
| **PR-5** | Cabut ratchet progres; label kemajuan sesuai Q-3; at-risk didefinisikan ulang (geser + bukti + burn, bukan literal) | SC-9 · SC-10 |
| **PR-6** | Perencanaan penuh (tambah/hapus/nama/pemilik), a11y baris Gantt, cabut kode mati, ekspor lengkap | SC-11 · SC-12 · SC-13 · SC-14 |

Setiap PR: `npm run verify` hijau + verifikasi hidup di `:5180` sebelum PR berikutnya.
PR-5 dieksekusi **setelah** PR-2..PR-4 agar at-risk punya basis pengganti sebelum
basis lamanya dicabut.

## 11. Open Questions

**Q-1 · Kebijakan gerbang bukti pada milestone.**
(a) **Soft-gate** — boleh ditandai selesai, tetapi berbadge merah "diklaim tanpa bukti",
masuk daftar pengecualian & ekspor. (b) **Hard-block** — tidak dapat ditandai selesai
sebelum gerbang lolos.
→ *Rekomendasi:* **(a) untuk semua, KECUALI `kind:'eqr'` yang `done`-nya diturunkan penuh
dari `eqrGateFor()`.* Alasan: konsisten dengan filosofi soft-gate P5 (C-2); milestone
seperti "Stock opname CPO" tak punya sumber bukti dalam sistem sehingga hard-block akan
memblokir pencatatan kenyataan; sementara EQR **punya** SSOT penuh sehingga membiarkannya
di-toggle manual berarti mempertahankan cacat D-2 yang paling serius.

**Q-2 · Apakah menggeser tanggal wajib disertai alasan?**
(a) Baseline + riwayat geser dicatat, alasan **opsional**. (b) Alasan **wajib** untuk
setiap pergeseran. (c) Alasan wajib **hanya untuk pergeseran mundur** (yang memperlonggar
komitmen / menghapus keterlambatan).
→ *Rekomendasi:* **(c)** — friksi diletakkan tepat pada tindakan yang menghapus kabar buruk,
tidak pada penjadwalan maju yang wajar.

**Q-3 · Angka kemajuan yang ditampilkan Delivery.**
(a) **Kemajuan rencana turunan** = milestone selesai / total, berlaku untuk semua
perikatan, dilabeli tegas "kemajuan rencana (milestone)" — `e.progress` tidak lagi
ditampilkan di modul ini. (b) Tetap `e.progress` literal, ratchet dicabut, dilabeli
"deklarasi manajer" + tanggal deklarasi.
→ *Rekomendasi:* **(a)**, dengan `e.progress` tetap ditampilkan berdampingan sebagai
"deklarasi manajer" agar selisih keduanya terlihat — selisih itu sendiri adalah sinyal
manajemen yang berguna. Menurunkan kemajuan **pekerjaan** untuk 7 perikatan tidak
diusulkan (C-1).

**Q-4 · Kapabilitas tulis rencana pengiriman.**
(a) `ENGAGEMENT_MANAGE` (Partner + Audit Manager) — sejajar `capacityPlan.v1`/`pipeline`.
(b) Diperluas ke `WP_EDIT` (termasuk Senior) agar tim lapangan dapat menandai
milestone-nya sendiri.
→ *Rekomendasi:* **(a)** untuk arc ini. Rencana pengiriman adalah komitmen ke klien;
memperluasnya ke seluruh auditor adalah keputusan tersendiri, bukan efek samping PRD ini.

**Q-5 · Scope dokumen.** `deliveryPlan.v1` firm-scope memuat rencana **seluruh** perikatan
dalam satu dokumen; menulis satu milestone berarti menulis dokumen yang memuat perikatan
lain — bersinggungan dengan isolasi W7.5.
→ *Rekomendasi:* **tetap firm-scope di arc ini** (Gantt lintas-perikatan memerlukannya;
gate tulis ENGAGEMENT_MANAGE + jejak audit mengurangi risikonya), dan catat migrasi
per-engagement sebagai pekerjaan terpisah bila isolasi ketat diperlukan.

---

## Lampiran — bukti temuan

| Temuan | Berkas:baris |
|---|---|
| D-1 progres literal | `data_part1.ts:42,47,48,49,50,51,52` |
| D-1 ratchet 85 | `contexts.tsx:965` |
| D-1 ambang at-risk 85 | `view_delivery.tsx:102,105,209` |
| D-1 alarm burn dibungkam | `view_delivery.tsx:220,240` |
| D-2 toggle `done` bebas | `view_delivery.tsx:76,274` |
| D-2 gerbang yang tak pernah ditanya | `canon_eqr_gate.ts:69` · `engagement_phase_gate.ts:48` |
| D-3 tanggal ditimpa di tempat | `view_delivery.tsx:77–80` |
| D-3 lewat-tempo vs tanggal tergeser | `view_delivery.tsx:103` |
| D-4 regex label | `view_audittimeline.tsx:129` |
| D-6 tak ada cabang RBAC → `FIRM_ADMIN` | `rbac.ts:139–197` (fallthrough :197) |
| D-7 `<div onClick>` baris Gantt | `view_delivery.tsx:145` |
| D-7 filter tautologis | `view_delivery.tsx:96` |
| D-7 deps `months` | `view_delivery.tsx:93` |
