# PRD — Engagement Cockpit Terukur (angka yang bergerak ketika auditor bekerja)

> Wajib diisi sebelum implementasi. Implementasi TIDAK dimulai sebelum sign-off (**"Proceed."**).
> Modul: route `cockpit` → `migration/src/view_cockpit2.tsx` (893 baris, `EngagementCockpit`).
> Terkait: [[PRD - Gerbang Fase Lifecycle Engagement (P5)]] (§1 sudah menandai gate cockpit
> sebagai "hanya tampilan, kriteria 6/7/8 di-hardcode" — belum pernah ditutup).

| Field | Isi |
|---|---|
| Tanggal | 2026-08-15 |
| Pemilik | Ari Widodo |
| Status | **Implemented** — "Proceed." 2026-08-15; PR-C-1…C-7 selesai di `feat/cockpit-arc`, S1–S11 terpenuhi. Q4 (PR-C-8 aksi tulis) dipisah & belum dikerjakan |
| Engagement ID terkait | lintas-engagement; bukti demo `ENG-2025-014` (PT Sentosa Makmur Tbk) |

---

## 1. Problem

Engagement Cockpit adalah layar yang dibuka partner & manajer untuk menjawab satu pertanyaan:
*"perikatan ini sehat atau tidak?"* Layar itu menampilkan **verdict tunggal** (Sehat / Perlu
Perhatian / Perlu Tindakan), lima kartu sinyal, gauge 62%, dan gerbang kesiapan opini.

**Hampir tidak satu pun dari angka itu mengukur pekerjaan yang benar-benar dilakukan.**

### 1.1 Angka utama adalah literal yang ditala agar saling cocok

`CKP_PHASES` (`view_cockpit2.tsx:22–51`) memuat **20 persentase modul hardcode** —
`{ id:'wtb', pct:100 }`, `{ id:'jet', pct:40 }`, dst. Rata-ratanya:

```
Perencanaan 100+100+90+75          = 365
Eksekusi    100+80+60+55+64+40+58  = 457
Specifics   85+70+50+65+30         = 300
Finalisasi  45+40+20+15            = 120
                             1242 / 20 = 62,1 → 62
```

`e.progress` di `data_part1.ts:42` juga **62**. Dua representasi literal dari angka yang sama,
ditala agar sepakat. Konsekuensinya berantai: gauge hero, `schedTone` (kartu "Jadwal"),
`phaseRows` (tabel Jam per Fase), EV-bar "Pekerjaan selesai", dan **ekspor XLSX tersegel**
semuanya turunan dari dua literal ini.

Uji falsifikasi yang gagal: **tanda-tangani seluruh 37 kertas kerja kanonik → cockpit tetap
62%. Jangan tanda-tangani satu pun → tetap 62%.** Layar status tidak merespons status.

### 1.2 Jam per anggota: cockpit membagi ulang total dengan bobot karangan

`CKP_TEAM_W = [0.071, 0.196, 0.261, 0.179, 0.152, 0.141]` (`:69`) — array bobot literal yang
"aligned to TEAM order". Jam tiap orang = bobot × `e.budgetHrs` / `e.actualHrs`.

Sementara itu SSOT-nya **sudah ada dan sudah dipakai modul lain**:
`FIRMFIN.engagementWip(timeEntries, engId)` (`data_firmfin.ts:55–71`) menyimpan roster nyata
per-perikatan (`WIP_ROSTER_ENG`) berisi budget & base per orang, ditambah timesheet live
(`timeEntries`, server-state berlingkup engagement). `view_timebudget.tsx:46` memakainya.

Untuk `ENG-2025-014` keduanya menjawab pertanyaan yang sama dengan angka berbeda:

| Anggota | Jam aktual — Cockpit | Jam aktual — SSOT (T&B/WIP) | Δ | Budget — Cockpit | Budget — SSOT | Δ |
|---|---:|---:|---:|---:|---:|---:|
| Hartono Wijaya (Partner) | 81 | 78 | +3 | 131 | 120 | +11 |
| Anindya Pramesti (Manager) | 225 | 268 | **−43** | 361 | 360 | +1 |
| Dimas Raharjo (Senior) | 299 | 320 | −21 | 480 | 420 | **+60** |
| Sinta Wulandari (Senior) | 205 | 158 | **+47 (+30%)** | 329 | 300 | +29 |
| Fajar Nugroho (Junior) | 174 | 196 | −22 | 280 | 360 | **−80** |
| Rina Kusuma (Junior) | 162 | 126 | **+36 (+29%)** | 259 | 280 | −21 |
| **Total** | **1.146** | **1.146** | 0 | **1.840** | **1.840** | 0 |

Totalnya menutup — itulah yang membuat cacat ini lolos. **Setiap barisnya salah; hanya
jumlahnya yang benar.** Pola yang sama persis dengan plug roll-forward WIP yang dicabut di
#239: angka diturunkan dari selisih yang seharusnya ia jelaskan.

Lebih jauh, cockpit membaca `e.actualHrs` **statis** dari seed dan tidak berlangganan
`timeEntries` sama sekali. Maka:

> Catat 8 jam untuk Dimas di Time & Budget → T&B menampilkan 1.154 jam, Dimas 328.
> Cockpit tetap 1.146 jam, Dimas 299, Budget Burn tetap 62%.
> **Cockpit inert terhadap timesheet.**

### 1.3 "Util" yang ditampilkan adalah utilisasi FIRMA, bukan perikatan

Tab Tim menampilkan `Util {m.util}%` dan badge `OVER-UTILIZED` pada `m.util >= 92`. `m.util`
berasal dari `AMS.TEAM` (`data_part1.ts:205–211`) — utilisasi **firma** (71/88/94/90/82/79),
bukan pemakaian jam pada perikatan ini.

Akibat konkretnya: Dimas diberi badge merah **OVER-UTILIZED** (firma 94%) padahal pada
perikatan ini ia memakai 320 dari 420 jam = **76%, di bawah anggaran**. Layar perikatan
menandai orang yang justru paling efisien di perikatan itu.

### 1.4 "WIP Terpakai" dihitung pada tarif yang salah — meleset 2×

`CKP_RATE` diturunkan dari `FIRMFIN.WIP_COST` (tarif **biaya**), lalu hasilnya
(`wipTot = Σ jam × tarif biaya`) diberi label **"WIP Terpakai (aktual)"** dan dipakai untuk
bar **"WIP vs Fee — % terbakar"**.

WIP kanonik dinilai pada tarif **charge-out** (`WIP_BILL`), bukan biaya. Untuk `ENG-2025-014`:

| Figur | Cockpit | Kanonik | Selisih |
|---|---:|---:|---|
| "WIP Terpakai (aktual)" | Rp 0,48 M (biaya) | Rp 0,98 M (`stdValue` @ charge-out) | **2,0×** |
| "WIP vs Fee — % terbakar" | 26% | 53% | 27 pp |
| Estimasi Biaya Std (budget) | Rp 772 jt | Rp 749 jt | 23 jt |
| Margin Rencana | 58% | 60% | 2 pp |

Bar yang dimaksudkan memberitahu partner seberapa banyak fee sudah terbakar menunjukkan
**setengah** dari angka sebenarnya.

### 1.5 Gerbang kesiapan opini memuat kriteria yang mustahil berubah

`TabRisiko` merakit 8 kriteria sendiri (`:709–718`), tiga di antaranya konstanta:

```ts
{ l: 'Penilaian going concern selesai',        ok: false, sub: 'Going Concern 65% — dalam proses' },
{ l: 'Telaah peristiwa kemudian (subsequent)', ok: false, sub: 'Subsequent Events 30% — dalam proses' },
{ l: 'Konfirmasi independensi tim lengkap',    ok: true,  sub: 'Partner & manager terdeklarasi' },
```

Dua kriteria **tidak akan pernah** terpenuhi walau auditor menuntaskan going concern; satu
**selalu** terpenuhi walau tak ada deklarasi independensi. Gauge "x/8 kriteria siap" karena itu
punya plafon 6 dan lantai 1. Ini cacat #240 persis: status ditentukan literal, bukan angka.

Padahal gerbang kanonik **sudah ada**: `engagementGate()` (`wp_signoff.tsx:535`) dengan
kriteria nyata — kesimpulan SA 230 ≥80%, nol WP belum-dimulai, nol catatan prioritas-tinggi,
integritas WTB (`checkWtbIntegrity`), opini final, dan gerbang EQR (`eqrStatusFor`, SMM 2).
Cockpit **tidak memanggilnya sama sekali**. Dua gerbang kesiapan yang berbeda untuk satu
perikatan; yang mengikat lifecycle bukan yang ditampilkan.

### 1.6 Jalur kritis tidak terhubung ke perikatan

- `CKP_MILESTONES` (`:56–66`): 9 milestone dengan `date`, `owner`, dan `status`
  (`done/active/risk/upcoming`) literal. Ganti perikatan aktif → milestone tak berubah.
  Badge **"LEWAT TARGET"** dihitung terhadap tanggal literal ini.
- Salah satu `note`-nya (`'ICFR 75% — sedikit di belakang jadwal'`) menyalin literal §1.1 —
  duplikasi ketiga dari angka yang sama.
- `CKP_START = new Date('2026-01-06')` (`:83`) literal — dasar `elapsedPct`, posisi rail
  "HARI INI", dan `schedTone`. `ENGAGEMENTS` tidak punya field tanggal mulai sama sekali.

### 1.7 Isolasi per-perikatan (W7.5) bocor di lapisan tampilan

`useAuditHeavy` menyerahkan `activity`, `team`, `workpapers`, `deadlines` sebagai konstanta
firma mentah (`contexts.tsx:1305` → `D.ACTIVITY`, `D.TEAM`, `D.WORKPAPERS`, `D.DEADLINES`).
Panel "Aktivitas Terkini", "Tim Engagement", dan penugasan WP karena itu identik untuk
perikatan mana pun.

`TabJalur` malah **sengaja** memadatkan panel "Tenggat Mendatang" dengan tenggat klien lain:

```ts
const others = deadlines.filter((d: any) => !engDeadlines.includes(d));
const shown  = [...engDeadlines, ...others].slice(0, 4);   // :460–461
```

Tenggat milik klien lain tampil di dalam ruang kerja perikatan ini, tanpa penanda.

### 1.8 Identitas orang dicocokkan dengan nama depan

`const fn = (full) => (full || '').split(' ')[0]` lalu `fn(x.preparer) === first` (`:201–210`)
— dua "Dimas" di firma akan saling mengklaim kertas kerja. Cakupan risiko juga dicocokkan
dengan heuristik string: `p.area.includes(r.area) || r.area.includes(p.area.split(' ')[0])`.

### 1.9 Pelanggaran konvensi repo (CLAUDE.md §3.7 & §5)

| # | Pelanggaran | Lokasi |
|---|---|---|
| a | `<div onClick>` sebagai tombol — gagal keyboard & axe | `.ckp-modrow` `.ckp-attn` `.ckp-risk` `.ckp-note` |
| b | Warna hardcode, bukan token | `CKP_PHASES.color`, gradien hero `#013a52/#005085`, 6-warna Donut, `#ff9b8a/#ffd479/#7fe0a8/#bcd6e4/#8fb0c2` |
| c | Skala tipografi: `fontSize: size*0.27` = 14,6px (setengah langkah) dan `size*0.16` = 8,6px (di bawah lantai 11px) | `Gauge` `:101` |
| d | `Object.assign(window, { EngagementCockpit })` tanpa pembaca terdaftar di CLAUDE.md §3.1 | `:889` |
| e | Dead code: `recovery` dihitung, tak pernah dipakai | `:542` |

### 1.10 Nol uji

Repo punya 1.862 uji. **Tak satu pun menyentuh cockpit.** Satu-satunya berkas uji yang
menyebut kata "cockpit" adalah `firm_wip.test.ts`, dan itu tentang WIP firma.

---

## 2. Objective

Jadikan Engagement Cockpit **layar status yang benar-benar mengukur status**: setiap angka
dapat ditelusuri ke pemilik datanya, bergerak ketika auditor bekerja, dan tidak bertentangan
dengan modul lain yang menjawab pertanyaan yang sama.

Kedua, naikkan dari papan pajang menjadi **tempat kerja** — item "Perlu Perhatian" dapat
ditindaklanjuti di tempat, dalam batas RBAC, dengan tulisan menuju SSOT server.

Prinsip yang mengikat desain (pelajaran arc #239 · #240 · #242 · #251):

1. **Enumerasi, jangan turunkan dari selisih.** Komponen jembatan disebutkan satu per satu.
2. **Dua sumber independen tetap dua sumber.** Bila assertion manajer dan bukti kertas kerja
   memang dua hal berbeda, tampilkan keduanya + jembatan — jangan paksa satu menjadi turunan
   yang lain (pola rekonsiliasi kas/bank #247/#251).
3. **Gerbang uji CAKUPAN, bukan tie-out tautologis** (#242). Bila roll-up diturunkan dari
   `WP_MODULE_MAP`, ujilah bahwa **setiap** modul terpetakan — bukan bahwa jumlahnya sama
   dengan dirinya sendiri.
4. **Kriteria yang tak terukur tidak ditampilkan sebagai kriteria.** Lebih baik hilang
   daripada hardcode `ok:false`.

## 3. Success Criteria

Terverifikasi lewat uji otomatis kecuali disebut lain.

| # | Kriteria | Cara verifikasi |
|---|---|---|
| S1 | Jam & ekonomi per anggota cockpit **identik** dengan `FIRMFIN.engagementWip()` untuk perikatan yang sama | uji nol-delta enam baris + total |
| S2 | Mencatat *n* jam untuk satu anggota **hanya** menggeser baris anggota itu | uji falsifikasi: +8 jam Dimas ⇒ Δ Hartono = 0 |
| S3 | Menandatangani satu kertas kerja **menggeser** progres terbukti; nol tanda tangan ⇒ progres terbukti 0% | uji atas `wpCompletenessFor` berlapis fase |
| S4 | Setiap kunci `WP_MODULE_MAP` terpetakan ke **tepat satu** fase — nol yatim, nol ganda | uji cakupan (bukan tie-out) |
| S5 | Gerbang kesiapan cockpit = `engagementGate()` kanonik; **nol** kriteria berkonstanta `ok` | grep gate + uji: setiap kriteria berubah oleh ≥1 input |
| S6 | "WIP" cockpit pada tarif charge-out, sama dengan modul WIP; biaya diberi label biaya | uji nol-delta vs `stdValue`/`costValue` |
| S7 | Utilisasi berlabel lingkupnya (perikatan vs firma) dan angkanya sesuai label | uji + tinjauan visual |
| S8 | Ganti perikatan aktif ⇒ aktivitas, tim, WP, tenggat **ikut berubah**; nol baris milik klien lain | uji isolasi dua perikatan |
| S9 | Tanggal mulai & milestone berasal dari data perikatan; nol tanggal literal di berkas view | grep + uji |
| S10 | `npm run verify` hijau; axe 0 critical; nol `<div onClick>` di berkas ini; nol warna hardcode; skala tipografi patuh | gerbang CI + e2e a11y |
| S11 | Ekspor XLSX menyegel angka yang sama dengan layar (dan hanya angka terukur) | uji atas payload ekspor |

## 4. Scope

Tujuh PR bertumpuk, masing-masing dapat dikirim sendiri dalam keadaan hijau.

| PR | Judul | Menutup |
|---|---|---|
| **C-1** | Jam & ekonomi perikatan dari SSOT `engagementWip` | §1.2 §1.3 §1.4 |
| **C-2** | Progres terbukti vs progres di-assert + jembatan | §1.1 |
| **C-3** | Gerbang kesiapan = `engagementGate` kanonik + EQR | §1.5 |
| **C-4** | Jalur kritis dari data perikatan | §1.6 |
| **C-5** | Isolasi per-perikatan & identitas orang | §1.7 §1.8 |
| **C-6** | Kepatuhan konvensi (a11y · token warna · tipografi · window · dead code) | §1.9 |
| **C-7** | Ekspor & segel XLSX mengikuti layar (hanya angka terukur) | §1.1 hilir |
| **C-8** | Cockpit sebagai tempat kerja (aksi inline ber-RBAC) | §2 alinea 2 |

## 5. Non-Scope

- Mengubah `WIP_ROSTER_ENG` menjadi data server/Prisma. Tetap seed; cockpit hanya membacanya.
- Membangun modul timesheet baru. Time & Budget sudah ada dan menang sebagai SSOT.
- Mengubah `engagementGate` itu sendiri (aturan fase P5) — cockpit **memakai**, tidak
  mendefinisikan ulang.
- Memperbaiki fallback di `view_timebudget.tsx:46`
  (`engagementWip(…, e.id) || engagementWip(…, 'ENG-2025-014')` — perikatan tanpa roster
  diam-diam meminjam roster ENG-2025-014). Cacat nyata, **modul lain**, track terpisah.
- Redesain visual. Perbaikan token/tipografi bersifat kepatuhan, bukan restyling.

## 6. Constraints

- `master` selalu hijau (R-7). `npm run verify` = cermin CI.
- SSOT (CLAUDE.md §3.2): angka dari `canon*`/pemilik data, tak boleh salinan privat.
- Skala tipografi & token warna MENGIKAT (§5).
- Kontrol native + `aria-label` (§3.7); gerbang axe e2e menggagalkan `critical`.
- Ratchet `:any`: berkas ini padat `any`; sinkronkan via `npm run lint:any-baseline`.
- Bila menyentuh `AMS_CANON` → perbarui snapshot `canon_regression.test.ts`.
- Isolasi per-engagement W7.5 ditegakkan server; UI mencerminkan.

## 7. Existing Solutions (dipakai ulang, bukan dibangun ulang)

| Kebutuhan | Sudah ada | Berkas |
|---|---|---|
| Jam, roster, WIP, biaya per perikatan | `FIRMFIN.engagementWip`, `WIP_BILL`, `WIP_COST`, `WIP_ROSTER_ENG` | `data_firmfin.ts:43–71` |
| Kelengkapan WP per modul | `wpCompletenessFor`, `WP_MODULE_MAP`, `WpCompletenessRecap` | `wp_signoff.tsx:33,419,448` |
| Gerbang fase & kesiapan | `engagementGate`, `finalisationGateCriteria`, `engagementEntryGate` | `wp_signoff.tsx:535`, `engagement_phase_gate.ts`, `engagement_entry_gate.ts` |
| Gerbang EQR (SMM 2) | `eqrStatusFor`, `eqrGateFor` | `wp_signoff.tsx:497–528` |
| Integritas WTB | `checkWtbIntegrity` | canon WTB |
| Catatan review berlingkup perikatan | `reviewNotesActive` | `contexts.tsx` (P5 Fase 2) |
| Ekspor tersegel | `amsExportXlsx` | `export_xlsx.ts` |

**Nol store baru, nol mesin hitung baru.** Seluruh pekerjaan adalah menyambungkan cockpit ke
kanon yang sudah dibayar di arc sebelumnya.

## 8. Proposed Approach

### PR-C-1 · Jam & ekonomi dari SSOT

Buang `CKP_TEAM_W` dan `CKP_RATE`. Berlangganan `timeEntries` (`useAuditHeavy(['timeEntries'])`)
dan panggil `FIRMFIN.engagementWip(timeEntries, e.id)`.

Perikatan **tanpa** roster (6 dari 7 di demo) → `engagementWip` mengembalikan `null`. Jangan
diam-diam membagi rata dan jangan meminjam roster perikatan lain (cacat T&B di §5). Tampilkan
keadaan kosong yang jujur: *"Roster jam belum disiapkan untuk perikatan ini — buka Time &
Budget."* Total tingkat-perikatan (`e.budgetHrs`/`e.actualHrs`) tetap tampil dengan penanda
bahwa rinciannya belum terukur.

Pisahkan tiga figur yang selama ini tercampur, dengan label yang benar:

| Figur | Tarif | Label |
|---|---|---|
| Nilai WIP | `WIP_BILL` (charge-out) | "WIP @ tarif standar" |
| Biaya waktu | `WIP_COST` | "Biaya waktu (aktual)" |
| Margin rencana | biaya budget vs fee | "Margin rencana (biaya std)" |

Utilisasi: tampilkan **utilisasi perikatan** (`actual/budget` roster) sebagai angka utama;
`TEAM.util` bila dipertahankan diberi label eksplisit "utilisasi firma". Ambang
`OVER-UTILIZED` pindah ke utilisasi perikatan.

Uji: nol-delta enam baris vs `engagementWip`; falsifikasi Δ-terisolasi (S2); perikatan
tanpa roster tidak memunculkan angka per-orang apa pun.

### PR-C-2 · Progres terbukti vs progres di-assert

Ini keputusan desain terpenting dalam PRD ini, dan saya **tidak** mengusulkan sekadar
mengganti literal dengan turunan.

`e.progress` adalah **assertion manajer perikatan** — penilaian profesional tentang seberapa
jauh pekerjaan berjalan. Kelengkapan kertas kerja adalah **bukti**. Keduanya sah dan tidak
identik: pekerjaan bisa 80% selesai secara substansi sementara sign-off tertinggal, dan
sebaliknya sign-off bisa mendahului kesimpulan. Memaksa yang satu menjadi turunan yang lain
membuang informasi — persis sebabnya saldo bank tetap literal di #251.

Karena itu: **dua angka + jembatan yang dienumerasi.**

```
Progres di-assert (manajer)              62%
  − WP kunci tanpa kesimpulan SA 230    −xx pp   (n modul)
  − WP kunci tanpa bukti wajib lengkap  −xx pp   (n modul)
  − WP kunci belum ditandatangani       −xx pp   (n modul)
= Progres terbukti (kertas kerja)        xx%
```

Setiap komponen selisih **disebut namanya dan jumlah modulnya**, dapat diklik ke modulnya.
Tidak ada baris "lain-lain", tidak ada plug.

`CKP_PHASES` berubah dari daftar persentase literal menjadi **peta modul→fase** (`id` saja,
tanpa `pct`). Persentase per fase dihitung dari `wpCompletenessFor` atas modul-modul di fase
itu. `schedTone` memakai progres **terbukti**. Gauge hero menampilkan terbukti sebagai angka
utama dan di-assert sebagai pembanding.

Gerbang mutu = **cakupan**, bukan tie-out (pelajaran #242): uji bahwa setiap kunci
`WP_MODULE_MAP` muncul pada tepat satu fase. Tie-out "jumlah fase = total" akan lulus secara
otomatis dan tidak membuktikan apa pun.

Bobot jam per fase (`weight`, `CKP_ARCHIVE_W`) tetap literal — itu **model alokasi anggaran**,
bukan pengukuran — tetapi diberi label demikian, dan kolom "Aktual" per fase tidak lagi
menyajikan alokasi proporsional sebagai pengukuran. Bila `timeEntries` punya `phase` (dan ia
punya), jam aktual per fase diambil dari sana untuk perikatan ber-roster.

### PR-C-3 · Gerbang kesiapan kanonik

Ganti 8 kriteria rakitan tangan dengan `engagementGate(audit, firm, { nextPhase })` +
`eqrStatusFor(engId)`. Tampilkan gerbang →Finalisasi dan →Arsip sesuai fase aktif, dengan
`severity` dan tombol menuju modul (`criterion.view`).

Tiga kriteria hardcode: **hapus** kecuali dapat diikat ke sinyal nyata. Going concern &
subsequent events punya modul dan (bila terdaftar di `WP_MODULE_MAP`) punya wpState — ikat ke
situ; bila tidak, hilangkan dari gerbang dan pindahkan ke daftar "belum terukur" yang jujur.
Independensi: ikat ke `INDEPENDENCE` bila datanya menutup, atau hapus. **Tidak ada kriteria
berkonstanta.**

### PR-C-4 · Jalur kritis dari data perikatan

Milestone diturunkan dari: fase perikatan (`PHASE_ORDER`), tenggat (`e.deadline`), status
gerbang tiap transisi, dan tanggal opini/arsip bila ada. Status `done/active/upcoming` dari
posisi fase; `risk` dari gerbang yang belum terpenuhi — bukan literal.

`CKP_START`: butuh tanggal mulai perikatan yang tidak ada di `ENGAGEMENTS` → **Open Question
Q1**.

Panel tenggat: hanya tenggat perikatan ini. Kosong ⇒ katakan kosong.

### PR-C-5 · Isolasi & identitas

Sediakan `activity`/`workpapers`/`team` berlingkup perikatan di `contexts.tsx` (mengikuti pola
`reviewNotesActive` dari P5 Fase 2). Cocokkan orang dengan identitas staf (`staffByName`/id),
bukan `split(' ')[0]`. Cocokkan area risiko dengan kunci, bukan `String.includes`.

### PR-C-6 · Kepatuhan konvensi

`<div onClick>` → `<button>` (pola sapuan #244/#250). Warna → token (`--purple`, `--blue`,
`--teal`, `--amber` untuk fase; gradien hero → token permukaan gelap). `Gauge` → ukuran dari
skala 8-langkah, bukan perkalian. Lepas `Object.assign(window, …)` setelah audit pembaca.
Hapus `recovery`.

### PR-C-7 · Ekspor mengikuti layar

`amsExportXlsx` menyegel model `D`. Begitu `D` terukur, ekspor ikut benar — tetapi sheet perlu
menyebut **basis** tiap figur (terbukti vs di-assert, charge-out vs biaya) agar berkas tersegel
dapat berdiri sendiri sebagai bukti.

### PR-C-8 · Cockpit sebagai tempat kerja

Aksi inline pada "Perlu Perhatian", digerbangi `useAuth().can(CAP.*)` dan ditulis lewat SSOT
server: tutup/balas catatan review, tandatangani WP dari kartu, tandai AJE untuk telaah.
Plus jejak "berubah sejak kunjungan terakhir" (stempel per-pengguna per-perikatan).

## 9. Risks

| # | Risiko | Mitigasi |
|---|---|---|
| R1 | **Angka akan bergeser dan terlihat seperti regresi.** Progres 62% → apa pun yang terbukti (kemungkinan jauh lebih rendah); "WIP" 0,48 → 0,98 M; jam per orang berubah hingga 30% | Nyatakan pergeseran di badan tiap PR dengan angka sebelum/sesudah, sebagaimana #247 (`1-100` → enam sub-akun). Ini koreksi, bukan kerusakan |
| R2 | Progres terbukti mendekati 0% karena `wpState` demo kosong ⇒ cockpit tampak rusak | Panel jembatan menjelaskan *mengapa*, per komponen; seed wpState demo bila perlu agar layar demo bermakna — dan katakan itu seed |
| R3 | Gerbang cakupan (S4) memaksa setiap modul WP masuk peta fase; modul baru akan memerahkan CI | Itu tujuannya (anti-kambuh). Dokumentasikan di CLAUDE.md §4 checklist modul baru |
| R4 | Ratchet `:any` meledak — berkas 893 baris padat `any` | Ketik ulang bertahap per PR; `lint:any-baseline` disinkronkan, arah harus turun |
| R5 | PR bertumpuk saling konflik (pelajaran sesi lalu: PR bentrok = **nol** check CI) | Kirim berurutan, rebase satu-satu, verifikasi jumlah check CI ≠ 0 sebelum menunggu |
| R6 | Q1 (tanggal mulai) menyentuh skema Prisma & seed | Jaga di PR-C-4 saja; PR lain tak bergantung padanya |

## 10. Implementation Plan

| Tahap | Isi | Gerbang |
|---|---|---|
| 0 | Uji karakterisasi cockpit (belum ada satu pun) — kunci perilaku sekarang agar pergeseran terlihat | `npm run test` |
| 1 | **PR-C-1** jam & ekonomi SSOT | S1 S2 S6 S7 · verify |
| 2 | **PR-C-2** progres terbukti + jembatan | S3 S4 · verify |
| 3 | **PR-C-3** gerbang kanonik | S5 · verify |
| 4 | **PR-C-4** jalur kritis (setelah Q1 dijawab) | S9 · verify |
| 5 | **PR-C-5** isolasi & identitas | S8 · verify |
| 6 | **PR-C-6** kepatuhan konvensi | S10 · verify + e2e axe |
| 7 | **PR-C-7** ekspor & segel mengikuti layar | S11 · verify |
| 8 | **PR-C-8** aksi inline ber-RBAC | verify + e2e |

Tahap 1–3 adalah inti "tingkat memadai": setelah itu setiap angka di cockpit terukur.
Tahap 4–6 menutup isolasi & kepatuhan. Tahap 8 opsional dan boleh dipisah ke arc lain.

## 11. Open Questions — JAWABAN AKHIR

| # | Jawaban |
|---|---|
| **Q1** | **Opsi (b) dengan fallback**, tetapi kenyataannya menggeser desain: `ENGAGEMENTS` **tak membawa** `acceptanceRef`/`engagementLetter` sama sekali, jadi surat perikatan dipakai *ketika ada* dan rantainya `startDate` → `acceptanceRef.date` → akhir tahun buku dari `fy`. Setiap tingkat **menyebutkan dasarnya di layar**. Tanggal karangan TIDAK dimasukkan ke seed. |
| **Q2** | **Ya — `e.progress` dipertahankan** sebagai asersi manajer, dijembatani ke progres terbukti. |
| **Q3** | **"Belum terukur"** dipilih. Perikatan tanpa roster tidak menampilkan rincian per-anggota dan tidak meminjam roster perikatan lain. |
| **Q4** | **Dipisah.** PR-C-8 (aksi tulis ber-RBAC) belum dikerjakan. |
| **Q5** | **Tidak jadi masalah.** `wpState` demo TIDAK diseed; progres terbukti 0% justru menjadi demonstrasi paling jelas bahwa angkanya kini mengukur sesuatu. |

## 11b. Open Questions (naskah asli)

**Q1 — Tanggal mulai perikatan.** `ENGAGEMENTS` tak punya `startDate`. Pilihan:
(a) tambah field ke seed + `ams_types.ts` + skema Prisma;
(b) turunkan dari tanggal surat perikatan di `engagement_entry_gate`;
(c) pertahankan konstanta tapi pindahkan ke data, bukan view.
Rekomendasi: **(b) dengan fallback (a)** — surat perikatan adalah kejadian nyata yang
menandai mulainya pekerjaan, dan datanya sudah dikumpulkan gerbang masuk.

**Q2 — `e.progress` dipertahankan?** Rekomendasi saya: **ya**, sebagai assertion manajer yang
dapat diedit & ter-audit, dijembatani ke progres terbukti (§8 PR-C-2). Alternatifnya menghapus
total dan hanya menampilkan yang terbukti — lebih sederhana, tetapi membuang penilaian
profesional yang justru inti pekerjaan manajer perikatan.

**Q3 — Perikatan tanpa roster jam (6 dari 7).** Tampilkan "belum terukur" (usulan saya), atau
sediakan roster seed untuk semuanya agar demo terisi? Yang pertama jujur; yang kedua
memamerkan fitur. Untuk sistem yang tujuannya pertahanan audit, saya condong ke yang pertama.

**Q4 — PR-C-8 (aksi tulis) masuk arc ini atau terpisah?** Ia mengubah cockpit dari read-only
menjadi penulis SSOT — permukaan RBAC & audit-trail baru. Usulan: **pisahkan** setelah C-1…C-7
hijau.

**Q5 — Seed `wpState` demo.** Bila progres terbukti jatuh ke ~0% pada data demo, apakah kita
seed sign-off/bukti agar layar demo bermakna (R2)? Menyeed berarti angka demo kembali menjadi
karangan — hanya karangan yang jujur karena diberi label seed.
