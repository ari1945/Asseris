# PRD — SDM & Kepatuhan: satu roster, angka yang punya dasar, dan kontrol yang bisa berkata tidak

> Wajib diisi sebelum implementasi apa pun. Implementasi TIDAK dimulai sebelum sign-off ("Proceed.").

| Field | Isi |
|---|---|
| Tanggal | 2026-08-16 |
| Pemilik | Ari Widodo |
| Status | **In Progress** — Q-1·Q-4·Q-6 dijawab 2026-08-16 (Q-1 = **(b)** perbesar roster ~69 · Q-4 = **(b)** blokir dgn override Partner · Q-6 = **PR-1..PR-3 lalu checkpoint**); Q-2·Q-3·Q-5 mengikuti rekomendasi. **Proceed.** diberikan 2026-08-16. **PR-1 SELESAI** (SC-4·5·6) · **PR-2 SELESAI** (SC-7·8·9) · **PR-3 SELESAI** (SC-10·11). **CHECKPOINT Q-6** — PR-4..PR-7 menunggu keputusan |
| Pemicu | Permintaan: "Kembangkan lebih dalam fitur pada modul-modul pada grup menu *SDM & Kepatuhan* sampai tingkat memadai" |
| Modul | 12 modul grup `SDM & Kepatuhan` (`icons.tsx:116–129`): `hcm` · `orgchart` · `recruitment` · `learning` · `succession` · `payroll` · `leave` · `performance` · `cpe` · `ethics` · `independence` · `hrcase` |
| Berkas | `view_people.tsx` · `view_pc_hcm.tsx` · `view_pc_org.tsx` · `view_pc_talent.tsx` · `view_pc_conduct.tsx` · `view_payroll.tsx` · `view_hrops.tsx` · `view_independence.tsx` · `data_people.ts` · `data_part1.ts` · `data_part2.ts` |
| PRD terkait | `docs/prd-sales-pipeline-deepening.md` · `docs/prd-budget-actual-ledger-derived.md` · `PRD - Kesiapan Pemeriksaan P2PK (SPM 1 & SPM 2 Auditable).md` |
| Prasyarat | Di atas `master` `1bdc7e8`. **Catatan:** worktree saat ini memuat arc Fixed Asset yang belum di-commit (`data_fixedassets.ts`, `view_bo1/firmops/firmops2/firmtreasury`) — arc ini TIDAK menyentuh berkas tersebut. |

---

## 1. Problem

Grup ini punya 12 modul, empat di antaranya berlabel `NEW`. Ia terlihat sebagai modul
SDM terlengkap di aplikasi. Yang tidak terlihat: **firma ini punya tiga jumlah
karyawan yang berbeda, menyetujui cuti tidak mengurangi saldo cuti siapa pun, satu
tombol memainkan empat peran dalam siklus kinerja, dan modul bernama "CPE / PPL
Tracker" memakai mesin PPL yang salah — padahal mesin yang benar sudah ada di repo
ini dan dipakai modul sebelah.**

Cakupan uji seluruh grup: **nol**. Dari 120 berkas uji di `migration/src`, tak satu pun
menyentuh `HCM_ANALYTICS`, `LEAVE_BALANCE`, `PERF_CYCLE`, `REQUISITIONS`,
`SUCCESSION_ROLES`, `COMPETENCY_*`, `GIFTS_REGISTER`, atau `HR_CASES`. Tak ada
`canon_hcm`, `canon_leave`, maupun `canon_perf`.

### 1.1 Tiga jumlah karyawan untuk satu firma

| Sumber | Angka | Dibaca oleh |
|---|---|---|
| `AMS.FIRM` (`data_part1.ts:8`) | `partners:6, managers:11, staff:58` → **75** | kop firma, profil KAP |
| `HCM_ANALYTICS.gradeMix` (`data_people.ts:62`) | 6+11+22+30 = **69** | Human Capital (donut "69 SDM") |
| `AMS.STAFF` (roster sebenarnya) | **10** (+2 `FIRM_STAFF`) | payroll, leave, performance, scheduler, semua modul lain |

Dua sumber literal itu bahkan **tidak sepakat satu sama lain** (75 vs 69). Dan
`headcountTrend` menutup di 69 pada Q3'26 — kurva delapan kuartal yang tak pernah
dihitung dari satu peristiwa perekrutan atau pengunduran diri mana pun.

Seluruh KPI Human Capital berdiri di atas dasar yang sama:

```ts
// data_people.ts:66–71 — tak satu pun diturunkan
annualAttrition: 16,   avgTenure: 3.8,   regrettable: 62,   timeToFill: 38,
```

`view_pc_hcm.tsx:245` bahkan memberi warna kondisional pada `annualAttrition` —
amber bila > 15 — sehingga sebuah konstanta tampak seperti hasil pemantauan. Dan
`view_pc_talent.tsx:31` mengimpor `timeToFill` ke modul Rekrutmen sebagai `avgFill`,
menyebarkan literal yang sama ke modul kedua.

Roster punya `joined` per orang. Masa kerja, campuran senioritas, dan headcount
**dapat diturunkan hari ini juga**; ia hanya tidak pernah diturunkan.

### 1.2 Menyetujui cuti tidak mengurangi saldo cuti

`LEAVE_BALANCE.used` adalah literal (`data_part2.ts:177`). `LEAVE_REQUESTS` adalah
daftar terpisah. Tak ada satu baris pun yang menghubungkan keduanya.

Falsifikasi (bisa dijalankan sekarang): setujui `LV-0048` — Dimas Raharjo, EMP-021,
2 hari. Status berubah "Menunggu" → "Disetujui". `used` EMP-021 tetap **1**. Kolom
"Sisa", bilah "Pemakaian", KPI "Pemanfaatan Kuota", dan peringatan amber `sisa ≤ 2`
semuanya dihitung dari angka yang tak pernah disentuh persetujuan apa pun.

Dua cacat menyertainya:

- `days: 5` adalah field literal pada permintaan, bukan turunan `from`→`to`. Tak ada
  yang mencegah permintaan menyatakan 2 hari atas rentang 10 hari.
- Tak ada akrual, tak ada kedaluwarsa carry-forward, tak ada hari libur nasional.
  Badge "Kuota 12 hari/tahun" (`view_hrops.tsx:46`) diketik tangan di samping `ent: 12`
  per orang — dua tempat untuk satu kebijakan, dan UU 13/2003 Ps. 79 (hak setelah 12
  bulan masa kerja) tidak pernah diuji terhadap `joined`.

### 1.3 Siklus Kinerja: dua sumber untuk satu skor, satu tombol untuk empat peran

**(a) Skor tersimpan bertentangan dengan KPI-nya sendiri.** `perf: 4.5` disimpan untuk
EMP-021. Sasarannya punya bobot dan skor:

| KPI | Bobot | Skor |
|---|---|---|
| Realisasi jam thd anggaran | 30% | 4,6 |
| Kualitas kertas kerja | 30% | 4,5 |
| Pemenuhan PPL (SKP) | 15% | 3,5 |
| Supervisi & coaching junior | 25% | 4,4 |

Tertimbang = **4,36**. Yang menggerakkan 9-box, "Rata-rata Skor Kinerja", dan
rekomendasi promosi adalah **4,5** — bukan sasarannya. Panel KPI menampilkan dasar
yang tidak dipakai.

**(b) Penempatan 9-box punya dua sumber.** `box: '9-box: Bintang'` adalah string
tersimpan, sementara `band(perf) × band(pot)` (`view_hrops.tsx:156`) menghitung sel
secara independen. Tabel membaca string; grid membaca hitungan. Keduanya bisa
berbeda dan tak ada yang memberi tahu.

**(c) Satu orang memainkan empat peran.** `advance()` (`view_hrops.tsx:143`):

```ts
if (!p.goalsSet) p.goalsSet = true;
else if (!p.selfDone) p.selfDone = true;
else if (!p.mgrDone) p.mgrDone = true;
else p.calibrated = true;
```

Empat klik berturut oleh pengguna yang sama membawa siapa pun dari penetapan sasaran
sampai terkalibrasi. Tak ada `can()`, tak ada pemeriksaan bahwa penilai ≠ yang dinilai,
tak ada pencatatan siapa yang membubuhkan. Self-review, reviu manajer, dan kalibrasi
adalah tiga pihak yang berbeda — di sini satu tombol memerankan ketiganya. Ini kelas
cacat yang sudah pernah ditutup untuk sign-off opini (#23) dan tanda tangan kertas
kerja (#177); di modul kinerja ia masih berdiri.

### 1.4 PPL: mesin yang benar sudah ada, modul PPL memakai yang salah

`canon_ppl.ts` mengimplementasikan PMK 186/PMK.01/2021 Pasal 37 dengan benar —
cap SKP tidak terstruktur, SKP hangus, materi wajib, carry-forward:

```ts
// canon_ppl.ts:114
const countedUnstructured = Math.min(unstructured, req.unstructuredCap);  // 10
```

`view_pppk.tsx:161` memakainya dan menampilkan peringatan SKP hangus.

**CPE / PPL Tracker tidak.** `view_people.tsx:221` dan `data_licensing.pplOf`
menjumlahkan mentah:

```ts
const total = recs.reduce((a, r) => a + r.skp, 0);   // tanpa cap
```

EMP-007 punya 18 SKP terstruktur + **14** tidak terstruktur. Tracker menjumlahkannya
mentah menjadi **32**; menurut Ps. 37 hanya **28** yang dapat diperhitungkan (4 SKP
hangus).

> **KOREKSI (2026-08-16, saat mengerjakan PR-3).** Rumusan awal butir ini keliru.
> Ia menyatakan `view_pppk` menampilkan 28 untuk orang yang sama sehingga
> perbedaannya kasat mata. **Tidak.** `view_pppk` tidak membaca `CPE_LOG` sama
> sekali — ia membaca `PPPK_PPL` (`data_part4.ts:392`), register terpisah yang
> berkunci NAMA dan berisi agregat `structured`/`unstructured` sendiri. Untuk
> Anindya register itu berbunyi 22/10 → 32 terhitung. Jadi **sebelum PR-3 kedua
> modul sama-sama menampilkan 32** — Tracker lewat penjumlahan mentah 18+14, P2PK
> lewat perhitungan benar 22+min(10,10). Keduanya cocok **secara kebetulan**, dan
> itulah sebabnya tak ada yang pernah menyadarinya.
>
> Cacat sesungguhnya karenanya lebih besar dari yang tertulis: bukan hanya dua
> MESIN, tetapi juga dua REGISTER. Lihat §1.4a.

Dan Tracker tak pernah
menguji materi wajib (4 SKP pembinaan, 16 SKP akuntansi/asurans) — `CPE_LOG` tak
punya field topik sama sekali, sehingga kepatuhan Pasal 37 tak dapat diklaim namun
badge hijau "Memenuhi" tetap diterbitkan.

Ini pola yang persis diperingatkan arc WTB PR-3/4/5: **perbaikan SSOT yang hanya
menyentuh sebagian konsumen lebih buruk daripada tak menyentuh** — sekarang ada dua
jawaban resmi dan tak ada cara tahu mana yang dibaca orang.

### 1.4a Dua register SKP untuk satu firma (temuan baru — PR-3)

| Register | Bentuk | Kunci | Dibaca oleh |
|---|---|---|---|
| `CPE_LOG` (`data_part1.ts:476`) | per-kegiatan (`t`, `type`, `skp`, `date`) | `empId` | CPE/PPL Tracker · `pplOf` · Lisensi AP |
| `PPPK_PPL` (`data_part4.ts:392`) | agregat `structured` / `unstructured` | **nama** | Kesiapan P2PK |

Keempat orang yang ada di kedua register punya angka berbeda — bukan selisih
pembulatan, melainkan realisasi yang berlainan:

| | `CPE_LOG` terhitung | `PPPK_PPL` terhitung | selisih |
|---|---|---|---|
| Hartono Wijaya | 24 | 32 | +8 |
| Rudi Gunawan | 18 | 30 | +12 |
| Sari Dewanti | 31 | 28 | −3 |
| Anindya Pramesti | 28 | 32 | +4 |
| Bayu Saputra | (tak ada) | 24 | — |

Register yang dilaporkan ke PPPK bukan register yang dipantau firma sehari-hari,
dan `PPPK_PPL` berkunci nama sehingga tak dapat disambungkan tanpa keputusan
pemetaan. PR-3 **tidak** menyatukannya — itu di luar SC-10/SC-11 — tetapi
`ppl_single_engine.test.ts` MEMAKU perbedaannya agar tidak terlupakan.

**Konsekuensi yang harus dinyatakan:** setelah PR-3, Tracker menampilkan 28 untuk
Anindya sementara P2PK tetap 32. Perbedaan itu **baru terlihat**, bukan baru ada.

### 1.5 Payroll: tarif TER adalah input, bukan perhitungan; jurnal tak pernah diposting

Mesin slip gaji nyata dan benar (BPJS berjenjang, cap upah, kontribusi pemberi kerja,
jurnal seimbang). Tiga hal menggantung:

- **`ter: 0.20` adalah data, bukan fungsi.** PMK 168/2023 mendefinisikan TER sebagai
  tabel (kategori PTKP → tabel A/B/C; bruto → lapisan). Tak ada tabel TER di seluruh
  repo (grep `TER_TABLE|terTable|terBracket` → kosong). Konsekuensi: kenaikan gaji
  tidak mengubah tarif, dan tarif tidak dapat diuji terhadap peraturan yang dikutip
  modul itu sendiri di footer-nya.
- **Rekonsiliasi Desember tidak ada.** Footer modul menjanjikan "rekonsiliasi tahunan
  tarif progresif Pasal 17 pada masa Desember"; tak ada kode yang melakukannya.
  "Estimasi Tahunan" pada tab Bukti Potong adalah `pph × 12`.
- **"Posting ke General Ledger" tidak memposting.** `view_payroll.tsx:178` memanggil
  `nav('firmgl')`. Sejak #241/#242 `firmgl` diturunkan dari jurnal terposting —
  sehingga beban gaji, utang PPh 21, dan utang BPJS **tidak pernah sampai ke buku
  besar firma**. Tombolnya digerbangi status payroll, yang membuatnya tampak seperti
  kontrol; yang digerbangi hanyalah navigasi.

### 1.6 Rekrutmen & Pelatihan: penghitung tanpa orang di belakangnya

| Field | Nilai | Kenyataan |
|---|---|---|
| `REQ-2026-07.applicants` | 34 | `CANDIDATES` memuat **4** baris untuk req ini |
| `REQ-2026-06.filled` | 2 | `ONBOARDING_HIRES` memuat 1 nama untuk req ini |
| `TR-03.enrolled` | 25 | tak ada satu pun `empId` terlampir |

`doEnroll` (`view_pc_talent.tsx:181`) menaikkan bilangan bulat anonim. Sementara
`cpeFromTraining` membaca `trainingAttendance.v1` yang **berkunci empId**. Pendaftaran
dan kehadiran adalah dua dunia terpisah: 25 orang bisa "terdaftar" dengan nol kehadiran
terkonfirmasi, dan kehadiran bisa dikonfirmasi untuk orang yang tak pernah mendaftar.
Kursi habis tanpa ada yang bisa ditanya siapa yang mengisinya.

`COMPETENCY_ACTUAL` adalah cuplikan beku. Menyelesaikan TR-03 (Data Analytics, `comp:
'CO-03'`) tidak menggerakkan level siapa pun — sehingga analisis gap kompetensi
**tidak pernah bisa menutup**, apa pun pelatihan yang diikuti.

### 1.7 Suksesi menyatakan kesiapan alih-alih menurunkannya

`readiness: 'Siap sekarang'` adalah string literal. Di berkas yang sama tersedia
`CAREER_LADDER` (kriteria promosi eksplisit), `COMPETENCY_ACTUAL`/`REQ` (gap per
kompetensi), dan `IDP` (progres rencana pengembangan). Tak satu pun dikonsultasikan.

EMP-021 dinyatakan **"Siap sekarang"** untuk Audit Manager. IDP-nya sendiri:
*"Selesaikan ujian CPA (2 dari 4) — Berjalan"*. `CAREER_LADDER` untuk Senior→Manager
mensyaratkan **"CPA penuh"**. Sistem menyimpan kedua fakta dan tidak pernah
membandingkannya.

### 1.8 Kode Etik & AML: ambang diketahui, status diketik

`over = g.value >= 1_000_000` dihitung — hanya untuk pewarnaan baris. `status` tetap
data bebas. G-04 (voucher Rp 2 jt dari calon klien) duduk di "Menunggu" sejak
2026-03-08 tanpa eskalasi, SLA, atau pemberitahuan.

`AML_SCREENING` punya tanggal skrining tetapi tak ada periodisitas: skrining
2026-01-08 akan berstatus "Bersih" selamanya. Gerbang `ethicsComplianceOf` — yang
memang **fail-closed dan benar** — karenanya lolos atas skrining yang bisa berumur
bertahun-tahun.

### 1.9 Kasus HR tidak menyentuh gerbang mana pun

`HC-2026-03` adalah investigasi dugaan **pelanggaran independensi** terhadap EMP-022,
berstatus terbuka, dengan langkah tercatat *"Recuse sementara dari perikatan"*.
Aplikasi tidak mengetahuinya. `member_independence` menggerbangi per-deklarasi;
kasus disiplin berat yang aktif tidak memblokir staffing, sign-off, maupun penerbitan
opini. Rekusal yang dicatat sebagai teks tidak menghasilkan rekusal apa pun.

`closeCase` (`view_pc_conduct.tsx:245`) juga menaikkan satu anak tangga sanksi secara
otomatis lalu menutup kasus dalam satu klik — pelapor, penyelidik, dan pemutus sanksi
kembali menjadi satu orang.

### 1.10 Independensi & Rotasi: masa tugas diketik tangan

Ambang rotasi terdiferensiasi per rezim dan **benar** (PP 20/2015 5 th · POJK 13/2017
3 th), dan `tenure >= rotationLimit` diturunkan. Tetapi `tenure: 7` sendiri adalah
literal — aplikasi punya riwayat perikatan dan catatan penandatangan namun tak pernah
menurunkan tahun berturut-turut. `cooloff: 2` adalah data yang tak dievaluasi apa pun.
Dan pelanggaran EMP-002 (7 ≥ 5) menaikkan spanduk merah yang **tidak memblokir
penugasan**.

### 1.11 Ringkasan kematangan

| Modul | Keadaan | Vonis |
|---|---|---|
| `ethics` | gerbang murni, fail-closed, teruji (`ethics_compliance.test.ts`) | **Memadai** |
| `independence` | rotasi diturunkan & berdasar hukum; `tenure` literal; tak memblokir | Setengah jalan |
| `payroll` | mesin nyata; TER input; GL tak pernah diposting | Setengah jalan |
| `cpe` | diturunkan — dengan mesin yang salah | Setengah jalan |
| `orgchart` | peta 10 orang, jujur, dangkal | Tipis |
| `hrcase` | register jujur, tak tersambung ke gerbang apa pun | Tipis |
| `hcm` | KPI 100% literal, bertentangan dgn `FIRM` dan `STAFF` | Kosmetik |
| `recruitment` | penghitung literal, `timeToFill` diimpor dari literal | Kosmetik |
| `learning` | pendaftaran anonim, kompetensi beku | Kosmetik |
| `succession` | kesiapan dinyatakan di atas data yang cukup untuk menurunkannya | Kosmetik |
| `leave` | persetujuan tidak mengubah saldo | **Kontrol tak berfungsi** |
| `performance` | dua sumber skor · satu klik empat peran | **Kontrol tak berfungsi** |

---

## 2. Objective

Membawa 12 modul ke tingkat **memadai**, yang di repo ini berarti tiga hal — dan tidak
lebih:

1. **Setiap angka punya dasar yang dapat ditelusuri.** Bila ia dapat diturunkan dari
   roster, riwayat, atau register — ia diturunkan. Bila ia benar-benar data eksternal
   (mis. survei pasar), ia diberi label sumber dan tanggal, bukan disamarkan sebagai
   hasil hitungan.
2. **Setiap kontrol dapat berkata tidak.** Persetujuan mengubah saldo; gerbang
   memblokir; pemisahan tugas ditegakkan oleh kapabilitas, bukan oleh kesopanan.
3. **Setiap klaim kepatuhan menyebut dasar hukumnya dan dapat difalsifikasi oleh uji.**
   Satu mesin per kewajiban — tidak dua.

---

## 3. Success Criteria

Setiap SC adalah pernyataan yang dapat **digagalkan oleh uji**; masing-masing akan
punya uji di `migration/src/*.test.ts`.

| # | Kriteria |
|---|---|
| SC-1 | Headcount, campuran senioritas, dan rata-rata masa kerja di Human Capital **diturunkan dari `AMS.STAFF`** (`joined`, `grade`). Gerbang menolak selisih antara donut Human Capital dan panjang roster. |
| SC-2 | `FIRM.partners/managers/staff` dan `HCM_ANALYTICS.gradeMix` tidak lagi menjadi dua sumber: satu dicabut, atau keduanya diturunkan dari roster yang sama. |
| SC-3 | Attrition, regrettable-rate, dan time-to-fill **diturunkan dari peristiwa** (`EXITS`, `REQUISITIONS`+`ONBOARDING_HIRES`) atau diberi label eksplisit "data historis — sumber & tanggal", tidak ditampilkan sebagai metrik hidup. |
| SC-4 | Menyetujui satu permintaan cuti **menambah `used`** karyawan itu. Uji: setujui LV-0048 → saldo EMP-021 turun 2 hari. |
| SC-5 | `days` pada permintaan cuti **diturunkan** dari `from`→`to` dikurangi akhir pekan & hari libur nasional; nilai yang tidak konsisten ditolak, bukan ditampilkan. |
| SC-6 | Hak cuti diturunkan dari `joined` (UU 13/2003 Ps. 79); carry-forward punya masa berlaku; badge kuota membaca SSOT yang sama dengan kolom kuota. |
| SC-7 | Skor kinerja **= agregasi tertimbang sasaran**. Tak ada `perf` tersimpan yang dapat berbeda dari KPI-nya. Uji: EMP-021 → 4,36 di kedua tempat. |
| SC-8 | Penempatan 9-box **diturunkan** dari (skor × potensi); string `box` tersimpan dicabut. |
| SC-9 | Pemisahan tugas siklus kinerja ditegakkan: self-review hanya oleh yang dinilai; reviu manajer hanya oleh atasan (`ORG.reports`) dengan kapabilitas; kalibrasi hanya oleh HR/Partner. Setiap transisi mencatat siapa & kapan. Uji: percobaan self-approve gagal. |
| SC-10 | CPE / PPL Tracker dan `pplOf` memanggil **`pplStatus()` dari `canon_ppl.ts`**. Uji: EMP-007 menampilkan 28 (bukan 32) dan 4 SKP hangus terlihat. |
| SC-11 | Materi wajib PPL (4 pembinaan · 16 akuntansi) terlacak per entri SKP; ketika tak terlacak, modul menyatakan "belum dapat dibuktikan", bukan centang hijau. |
| SC-12 | Tarif TER **diturunkan** dari tabel PMK 168/2023 (kategori PTKP + bruto). Uji: menaikkan gaji memindahkan lapisan TER. |
| SC-13 | Jurnal penggajian **benar-benar diposting** ke `firmgl` (jurnal terposting, bukan navigasi), digerbangi status payroll & kapabilitas; posting ganda ditolak. |
| SC-14 | Rekonsiliasi PPh 21 masa Desember (tarif progresif Pasal 17 vs Σ TER 12 masa) dihitung dan selisihnya ditampilkan. |
| SC-15 | `applicants` & `filled` **diturunkan** dari `CANDIDATES` dan `ONBOARDING_HIRES`. Memindahkan kandidat ke tahap "Diterima" menaikkan `filled`. |
| SC-16 | Pendaftaran pelatihan **menyimpan empId**, dan kehadiran hanya dapat dikonfirmasi untuk orang yang terdaftar. Kursi tersisa diturunkan dari daftar nama. |
| SC-17 | Menyelesaikan pelatihan yang dipetakan ke kompetensi **menaikkan level aktual** orang itu; gap kompetensi karenanya dapat menutup. |
| SC-18 | Kesiapan suksesi **diturunkan** dari `CAREER_LADDER` × `COMPETENCY_ACTUAL` × progres IDP. Uji: EMP-021 tidak dapat berstatus "Siap sekarang" selama CPA belum penuh. |
| SC-19 | Status hadiah/gratifikasi **diturunkan dari nilai vs ambang** kebijakan (satu SSOT ambang); item di atas ambang yang menggantung > N hari tereskalasi. |
| SC-20 | Skrining AML/PMPJ punya periodisitas; skrining kedaluwarsa **memblokir** gerbang etik seperti halnya skrining tertunda. |
| SC-21 | Kasus disiplin berat yang aktif berkategori independensi/kerahasiaan **memblokir** staffing & sign-off orang itu, dengan alasan yang dapat dibaca. Uji: EMP-022 dengan HC-2026-03 terbuka tidak dapat di-sign-off. |
| SC-22 | Penetapan sanksi memisahkan pelapor · penyelidik · pemutus; kenaikan anak tangga sanksi tidak lagi otomatis satu klik. |
| SC-23 | `INDEPENDENCE.tenure` diturunkan dari riwayat penandatanganan; cooling-off dievaluasi; pelanggaran rotasi **memblokir** penugasan AP pada klien itu. |
| SC-24a | **(baru, PR-3)**  &  disatukan menjadi satu register SKP berkunci ; laporan PPPK dan pemantauan harian membaca angka yang sama. Sampai itu terjadi, perbedaannya dipaku uji. |
| SC-24 | Gerbang cakupan: tak ada literal baru di `data_people.ts`/`data_part2.ts` yang menduplikasi fakta yang sudah dapat diturunkan (pola gerbang cakupan #242/#254, dengan pembuangan komentar). |

---

## 4. Scope

- 12 modul grup `SDM & Kepatuhan` dan berkas data pendukungnya.
- Mesin kanon baru: `canon_hcm.ts` · `canon_leave.ts` · `canon_perf.ts` ·
  `canon_pph21.ts` · `canon_talent.ts` · `canon_succession.ts` · `canon_conduct.ts`.
- Adopsi `canon_ppl.ts` oleh CPE Tracker & `pplOf` (bukan mesin baru).
- Penyambungan ke gerbang eksisting: `ethics_gate`, `member_independence`,
  `wp_signoff`, `firmgl`.
- Kapabilitas RBAC baru bila diperlukan (`migration/src/rbac.ts` ↔ `server/src/rbac.ts`).
- Uji untuk setiap SC; gerbang cakupan; `npm run verify` hijau penuh.

## 5. Non-Scope

- Integrasi nyata ke Coretax DJP, BPJS, atau penyedia payroll pihak ketiga (tetap
  ekspor/atestasi manual seperti pola slip gaji sekarang).
- Penyimpanan berkas HR (kontrak, ijazah) — belum ada file-storage server; tetap
  daftar metadata.
- Modul di luar grup ini (`scheduler`, `capacity`, `personal`) kecuali sebagai
  konsumen SSOT yang berubah.
- Perubahan skema Prisma untuk entitas HR baru, kecuali PR yang memerlukannya
  dinyatakan eksplisit di §10.
- Arc Fixed Asset yang sedang berjalan di worktree.

## 6. Constraints

- **PRD dulu** — tak ada implementasi sebelum "Proceed."
- `master` selalu hijau (R-7); cacat yang belum ditutup dikarantina, bukan dikirim merah.
- SSOT: angka dari `canon*`/data, bukan hardcode (CLAUDE.md §3.2).
- Tipografi 8 ukuran · token warna semantik · kontrol form native (§5, §3.7).
- Ratchet `:any` — sinkronkan `lint:any-baseline` bila baseline bergeser.
- Data personal tetap ter-filter server (`personalScope.ts`); pendalaman **tidak boleh**
  memperluas apa yang dilihat peran non-HR.
- Isolasi per-perikatan W7.5 — jangan ulangi cacat fallback ID literal
  (`asseris-timebudget-engagement-isolation`).

## 7. Existing Solutions — yang SUDAH ada (jangan bangun ulang)

Diverifikasi dengan grep, bukan diasumsikan:

| Sudah ada | Berkas | Implikasi |
|---|---|---|
| Mesin PPL PMK 186 lengkap (cap, hangus, materi, carry-forward) | `canon_ppl.ts` + uji | **Adopsi**, jangan tulis mesin PPL baru |
| Gerbang Kode Etik & AML fail-closed | `ethics_compliance.ts` + `ethics_gate.tsx` + uji | Perluas periodisitas saja |
| Independensi per-anggota × perikatan, 5 ancaman IESBA, penanda `seeded` | `member_independence.ts` + uji | Titik sambung untuk SC-21 |
| Jembatan pelatihan → SKP | `cpe_training.ts` + uji | Titik sambung untuk SC-16/17 |
| Ambang rotasi terdiferensiasi per rezim | `data_part1.ts:490` | Basis SC-23 |
| Mesin slip gaji (BPJS, cap, jurnal seimbang) | `view_payroll.tsx:21` | Ekstrak ke kanon, jangan tulis ulang |
| Rantai sign-off & bukti | `wp_signoff.tsx` | Pola SoD untuk SC-9/22 |
| Ekspor PDF/XLSX ber-atestasi | `export_pdf.ts` · `export_xlsx.ts` | Pakai apa adanya |

## 8. Proposed Approach

**Tesis: roster adalah SSOT.** Setiap modul dalam grup ini pada akhirnya berbicara
tentang orang yang sama. Hari ini masing-masing membawa cuplikan angkanya sendiri.
Pendalaman = membuat semuanya membaca satu roster dan satu register peristiwa, lalu
menurunkan sisanya.

Pola yang dipakai sama dengan arc Pipeline (#254) dan Budget-Actual (#242) yang sudah
terbukti:

1. **Ekstrak mesin murni** (`canon_*.ts`) — tanpa React, tanpa state, dapat diuji.
2. **Ganti literal dengan turunan**, jangkarkan pada nilai lama agar **delta nol**
   pada figur firma (pola nol-delta aljabar dari #241) — kecuali ketika literalnya
   memang salah, yang harus dinyatakan terang-terangan di PR.
3. **Gerbang cakupan, bukan gerbang tie-out**: menguji "Σ turunan == literal lama"
   menjadi tautologis setelah literalnya dicabut. Yang diuji adalah bahwa setiap
   konsumen memanggil kanon (dengan pembuangan komentar — GOTCHA #254).
4. **Kontrol menegakkan, bukan menghias**: setiap gerbang harus punya uji yang
   membuktikan ia pernah berkata *tidak*.

## 9. Risks

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Roster demo 10 orang vs KPI berskala 69 — menurunkan headcount akan **mengecilkan seluruh dashboard Human Capital** | Demo terlihat "kosong" | Q-1: putuskan perbesar roster vs terima angka kecil |
| Menurunkan `used` cuti mengubah angka yang sudah dilihat | Saldo demo bergeser | Rancang seed permintaan cuti agar Σ = `used` lama (nol-delta), lalu dokumentasikan |
| Menurunkan skor kinerja mengubah 9-box | Penempatan orang bergeser | Nyatakan eksplisit: EMP-021 4,5→4,36; itu koreksi, bukan regresi |
| TER dari tabel bisa berbeda dari `ter` literal | Slip gaji berubah nilai | Bandingkan dulu tabel vs literal; laporkan selisih per orang sebelum mengganti |
| Memblokir sign-off atas kasus HR terbuka dapat memblokir demo | Alur demo mandek | Ikuti pola `seeded`: seed tetap ada, tapi tidak menembus gerbang; sediakan override ber-atestasi |
| 7 mesin kanon baru = arc besar | Lelah reviu, konflik | Pecah per-PR seperti §10; setiap PR mandiri & hijau |
| Konflik `eslint-suppressions.json` antar-PR | CI merah | REGENERASI (`lint:any-baseline`), jangan tebak angka |

## 10. Implementation Plan

Tujuh PR, masing-masing mandiri dan `verify` hijau. Urutan dipilih agar cacat
**kontrol tak berfungsi** (§1.2, §1.3) ditutup lebih dulu.

| PR | Judul | SC | Berkas utama |
|---|---|---|---|
| **PR-1** ✅ | Cuti: persetujuan yang benar-benar mengurangi saldo | SC-4·5·6 | `canon_leave.ts` (baru) · `leave_register.test.ts` (baru, 60 uji) · `view_hrops.tsx` · `view_pc_hcm.tsx` · `view_personal.tsx` · `data_part2.ts` |
| **PR-2** ✅ | Kinerja: skor dari sasarannya, dan empat peran yang berbeda | SC-7·8·9 | `canon_perf.ts` (baru) · `perf_cycle.test.ts` (baru, 48 uji) · `view_hrops.tsx` · `view_pc_hcm.tsx` · `view_personal.tsx` · `data_part2.ts` |
| **PR-3** ✅ | PPL: satu mesin, bukan dua | SC-10·11 | `canon_ppl.ts` (diperluas: topik) · `ppl_single_engine.test.ts` (baru, 28 uji) · `view_people.tsx` · `data_licensing.ts` · `cpe_training.ts` · `data_part1.ts` · `data_people.ts` |
| **PR-4** | Human Capital: roster sebagai SSOT | SC-1·2·3·24 | `canon_hcm.ts` (baru) · `view_pc_hcm.tsx` · `data_people.ts` · `data_part1.ts` |
| **PR-5** | Payroll: TER yang dihitung, jurnal yang diposting | SC-12·13·14 | `canon_pph21.ts` (baru) · `view_payroll.tsx` · `firmgl` |
| **PR-6** | Rekrutmen & Pelatihan: penghitung yang punya nama | SC-15·16·17 | `canon_talent.ts` (baru) · `view_pc_talent.tsx` · `cpe_training.ts` |
| **PR-7** | Suksesi, Konduk & Rotasi: gerbang yang bisa berkata tidak | SC-18·19·20·21·22·23 | `canon_succession.ts` · `canon_conduct.ts` (baru) · `view_pc_org.tsx` · `view_pc_conduct.tsx` · `view_independence.tsx` · `member_independence.ts` |

Perkiraan: PR-1..PR-3 kecil–sedang; PR-4·PR-5 sedang; PR-6·PR-7 besar. PR-7 dapat
dipecah lagi bila reviu menghendaki.

## 10a. Keputusan 2026-08-16 & implikasi sekuens

| Q | Keputusan |
|---|---|
| Q-1 | **(b)** Perbesar `AMS.STAFF` menjadi ~69 orang bernama — dikerjakan di **PR-4** |
| Q-2 | Rekomendasi: tambah register peristiwa (`EXITS`, tanggal buka→terisi) |
| Q-3 | Rekomendasi: muat tabel TER PMK 168/2023 **penuh** (3 kategori × seluruh lapisan) |
| Q-4 | **(b)** Kasus HR berat aktif memblokir staffing & sign-off, dengan **override ber-atestasi Partner** (pola `ethicsOverride`) |
| Q-5 | Rekomendasi: jangkarkan posting payroll → GL agar **delta nol** pada figur firma (pola #241) |
| Q-6 | **PR-1..PR-3 dulu, lalu checkpoint** |

**SC-25 (sekuens — konsekuensi Q-1 × Q-6).** Perbesaran roster ada di PR-4, sementara
PR-1..PR-3 dibangun di atas roster 10 orang. Bila mesin `canon_leave`, `canon_perf`,
dan adopsi `canon_ppl` benar-benar diturunkan dari roster, **PR-4 tidak boleh
memerlukan satu pun perubahan pada ketiganya**. Setiap berkas mesin yang harus disunting
saat roster diperbesar adalah bukti masih ada literal yang bersembunyi. PR-4 karenanya
berfungsi ganda sebagai uji retrospektif atas PR-1..PR-3, dan `git diff --stat` PR-4
atas `canon_leave.ts`/`canon_perf.ts` harus **kosong**.

## 11. Open Questions

**Q-1 — Skala roster demo.** Menurunkan headcount dari `AMS.STAFF` membuat Human
Capital menampilkan **10–12 orang**, bukan 69. Pilihan:
&nbsp;&nbsp;**(a)** Terima angka kecil — jujur, tetapi dashboard terlihat sepi.
&nbsp;&nbsp;**(b)** Perbesar `AMS.STAFF` menjadi ~69 orang bernama, sehingga seluruh
modul (payroll, cuti, kinerja, penjadwalan) ikut terisi realistis. Biaya: seed besar,
tetapi seluruh grup jadi bermakna sekaligus.
&nbsp;&nbsp;**(c)** Pertahankan `HCM_ANALYTICS` sebagai "data historis firma" berlabel
sumber & tanggal, terpisah dari metrik roster hidup.
&nbsp;&nbsp;*Rekomendasi saya: **(b)*** — ia satu-satunya yang membuat 12 modul ini
sekaligus kredibel, dan mahalnya sekali bayar.

**Q-2 — Attrition & time-to-fill.** Keduanya butuh register peristiwa yang belum ada
(`EXITS`, tanggal buka→terisi requisition). Tambah register peristiwa (jujur, kerja
lebih), atau tandai sebagai data historis berlabel (SC-3 opsi kedua)?
*Rekomendasi: tambah register peristiwa* — tanpa itu Rekrutmen tetap kosmetik.

**Q-3 — TER PMK 168/2023.** Tabel TER penuh adalah 3 kategori × ~44 lapisan bruto.
Muat seluruhnya (akurat, ~130 baris data), atau lapisan ringkas yang mencakup rentang
gaji firma saja (10 orang, Rp 9,5–92 jt) dengan pernyataan cakupan eksplisit?
*Rekomendasi: seluruhnya* — separuh tabel adalah cacat berikutnya yang menunggu.

**Q-4 — Kekuatan gerbang kasus HR (SC-21).** Kasus disiplin berat yang aktif
sebaiknya: **(a)** memblokir sign-off keras (seperti gerbang etik), **(b)** memblokir
dengan override ber-atestasi oleh Partner, atau **(c)** memperingatkan saja?
*Rekomendasi: **(b)*** — konsisten dengan pola `ethicsOverride` yang sudah ada.

**Q-5 — Posting payroll ke GL (SC-13).** Posting sebagai jurnal firma nyata mengubah
figur `firmgl`, `FIRMFIN`, dan laporan laba rugi firma. Terima pergeseran itu (dan
laporkan deltanya), atau jangkarkan agar beban gaji yang sudah ada di seed dikurangi
sehingga delta nol?
*Rekomendasi: jangkarkan (delta nol)* — pola #241, agar arc ini tak menggeser angka
firma sebagai efek samping.

**Q-6 — Cakupan arc.** Tujuh PR adalah arc besar. Kerjakan penuh, atau berhenti
setelah PR-3 (yang menutup dua cacat "kontrol tak berfungsi" + satu SSOT ganda) lalu
nilai ulang?
*Rekomendasi: jalankan PR-1..PR-3 dulu, checkpoint, lanjut* — tiga PR pertama sudah
memberi perbaikan integritas terbesar per satuan usaha.

---

## 12. Catatan verifikasi

Setiap klaim §1 diverifikasi terhadap sumber pada 2026-08-16, bukan diingat:

- Tiga headcount: `data_part1.ts:8` · `data_people.ts:62` · `awk` atas array `STAFF` (10).
- Cakupan uji nol: `grep -l` atas 120 berkas uji untuk 8 simbol data HR → hanya
  `rbac.test.ts` (nama kapabilitas).
- Cap PPL tak dipakai: `grep -rn "unstructuredCap"` → 6 hit, tak satu pun di
  `view_people.tsx` atau `data_licensing.ts`.
- Tabel TER tak ada: `grep -rn "TER_TABLE|terTable|TER_A|terBracket"` → kosong.
- Skor tertimbang EMP-021: 4,6×30 + 4,5×30 + 3,5×15 + 4,4×25 = 435,5 → **4,355**
  (bobot berjumlah 100) vs `perf: 4.5` tersimpan.
