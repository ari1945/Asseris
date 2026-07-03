# Panduan Pengguna Asseris

> **Untuk siapa dokumen ini:** Partner, Manager, Senior/Junior Auditor, staf Admin & HR Firma,
> dan staf Finance Firma yang MEMAKAI aplikasi Asseris sehari-hari. Bila Anda mencari cara
> men-deploy/mengoperasikan server (instalasi, backup, kunci enkripsi, dsb.) — itu bukan di sini,
> lihat **`docs/DEPLOY.md`** (dokumen untuk operator/IT, bukan end-user).
>
> Versi: 2026-07-03. Aplikasi masih aktif dikembangkan — bila tampilan yang Anda lihat berbeda
> dari panduan ini, laporkan ke admin firma supaya panduan diperbarui (jangan asumsikan panduan
> selalu 100% mutakhir untuk setiap modul kecil).

---

## Daftar Isi
1. [Tentang Asseris](#1-tentang-asseris)
2. [Peran & Hak Akses (RBAC)](#2-peran--hak-akses-rbac)
3. [Memulai — Login Pertama Kali & Navigasi](#3-memulai--login-pertama-kali--navigasi)
4. [Siklus Hidup Perikatan (4 Fase)](#4-siklus-hidup-perikatan-4-fase)
5. [Panduan per Peran](#5-panduan-per-peran)
   - [5.1 Engagement Partner](#51-engagement-partner)
   - [5.2 Audit Manager](#52-audit-manager)
   - [5.3 Senior Auditor](#53-senior-auditor)
   - [5.4 Junior Auditor](#54-junior-auditor)
   - [5.5 Admin & HR Firma](#55-admin--hr-firma)
   - [5.6 Finance Firma](#56-finance-firma)
6. [Katalog Modul Lengkap](#6-katalog-modul-lengkap) (rujukan — semua modul, per grup)
7. [Pertanyaan Umum & Troubleshooting](#7-pertanyaan-umum--troubleshooting)

---

## 1. Tentang Asseris

Asseris adalah **sistem operasi kantor akuntan publik (KAP)** — satu aplikasi yang menggabungkan
dua hal yang biasanya terpisah-pisah di banyak file Excel/Word:

- **Kerja audit per-perikatan** (workspace **Perikatan**): neraca saldo, kertas kerja, program
  audit, materialitas, risiko, sampai opini dan laporan keuangan — mengikuti Standar Audit (SA)
  yang berlaku di Indonesia.
- **Operasi & tata kelola firma** (workspace **Firma**): SDM/HCM, keuangan firma (ERP), kendali
  mutu (ISQM 1/2), portofolio klien, sampai kepatuhan regulator (OJK/BEI bila relevan).

Dua workspace ini bisa dipindah lewat pengalih di bagian atas aplikasi. Modul mana yang Anda
lihat di setiap workspace **tergantung peran Anda** — lihat §2.

**Prinsip penting yang perlu Anda ketahui sebagai pengguna:**
- **Satu sumber kebenaran (SSOT).** Angka yang Anda lihat di satu modul (mis. materialitas,
  going concern) dihitung dari neraca saldo (WTB) yang SAMA — bukan salinan terpisah yang bisa
  tidak sinkron. Kalau Anda mengubah WTB (impor TB baru/AJE), modul-modul lain ikut ter-update.
- **Semua yang Anda simpan tercatat berversi & ber-jejak.** Tiap perubahan kertas kerja/AJE/WTB
  disimpan dengan nomor versi dan jejak audit (siapa, kapan, apa yang berubah) — tak bisa
  diam-diam hilang atau ditimpa tanpa jejak.
- **Isolasi data per-perikatan.** Senior/Junior Auditor hanya bisa melihat/mengerjakan perikatan
  tempat mereka terdaftar sebagai anggota tim — bukan seluruh portofolio klien firma.

---

## 2. Peran & Hak Akses (RBAC)

Ada **6 peran**. Peran Anda ditentukan admin firma saat akun Anda dibuat — Anda tidak bisa
mengubah peran sendiri.

| Peran | Inti tugas | Bisa apa saja (kapabilitas kunci) |
|---|---|---|
| **Engagement Partner** | Pemilik akhir opini & tata kelola firma | Semua kapabilitas di bawah + **menyetujui opini**, **menandatangani EQR** (penelaahan pengendalian mutu independen), **override gerbang fase** (lanjut meski prasyarat belum lengkap — dipakai hati-hati), pengaturan firma (Firm Admin), kelola SDM firma-wide |
| **Audit Manager** | Mengelola pelaksanaan perikatan & me-review | Edit kertas kerja & AJE, **sign-off sebagai reviewer**, kelola roster klien/perikatan, lihat SEMUA perikatan (oversight portofolio), baca jejak audit, kelola integrasi/konektor data |
| **Senior Auditor** | Eksekusi lapangan, termasuk penyesuaian | Edit kertas kerja, **edit AJE/override WTB**, ekspor dokumen — **hanya pada perikatan tempat dia anggota tim** |
| **Junior Auditor** | Eksekusi lapangan dasar | Edit kertas kerja, ekspor dokumen — **TIDAK bisa edit AJE/angka WTB** (hanya Senior ke atas), hanya pada perikatan tempat dia anggota tim |
| **Admin & HR Firma** | Operasional SDM firma | Kelola dokumen People & Compliance **firma-wide** (payroll, cuti, kinerja, SKP/CPE, deklarasi etik/independensi) atas nama siapa pun — **tidak pernah menyentuh data perikatan/audit** |
| **Finance Firma** | Keuangan internal firma | Kelola General Ledger firma, AP/AR, pajak firma, rekonsiliasi bank — **tidak pernah menyentuh data perikatan/audit** |

**Yang perlu Anda pahami dari tabel di atas:**
- **Admin & HR Firma dan Finance Firma BUKAN staf audit** — mereka tidak pernah menjadi anggota
  perikatan, tidak muncul di roster penugasan audit, dan workspace **Perikatan** kosong bagi
  mereka secara default. Ini desain, bukan bug.
- **Isolasi per-perikatan (Senior/Junior).** Kalau Anda Senior/Junior Auditor dan tidak melihat
  perikatan tertentu, kemungkinan besar Anda memang belum ditambahkan sebagai anggota tim
  perikatan itu — minta Manager/Partner menambahkan Anda, bukan laporkan sebagai bug.
- **Sidebar dikurasi per peran, tapi tidak membatasi akses.** Partner & Manager melihat SEMUA
  grup modul di kedua workspace (mode oversight). Senior/Junior secara default hanya melihat
  grup **People & Compliance** dan **Portal & Dokumen** di workspace Firma (karena jarang mereka
  butuh modul ERP/SDM firma-wide) — tapi kalau Anda memang perlu, klik **"Tampilkan Semua"** di
  sidebar atau tekan **⌘K** (Cmd/Ctrl+K) untuk mencari modul apa pun secara langsung.

---

## 3. Memulai — Login Pertama Kali & Navigasi

### 3.1 Login pertama kali
1. Buka alamat Asseris firma Anda (diberikan oleh admin firma).
2. Masukkan **email** dan **kata sandi** yang diberikan admin.
3. **Jika firma Anda mengaktifkan verifikasi dua-langkah (TOTP/authenticator app)** — biasa untuk
   Partner-admin pertama, opsional untuk staf lain tergantung kebijakan firma — Anda akan diminta
   memindai kode QR dengan aplikasi authenticator (mis. Google Authenticator, Authy) **satu kali
   saat pendaftaran**. Simpan aplikasi authenticator itu — kode QR **tidak bisa ditampilkan ulang**
   setelah pendaftaran selesai; kalau hilang, hubungi admin firma untuk reset.
4. Setelah login, Anda mendarat di halaman **Beranda** — ringkasan tugas & informasi yang relevan
   untuk peran Anda (bukan dashboard generik yang sama untuk semua orang).

**Lupa kata sandi atau kehilangan akses authenticator?** Hubungi admin firma (Partner/Manager) —
belum ada fitur "lupa kata sandi" otomatis lewat email di aplikasi ini (lihat §7).

### 3.2 Navigasi dasar
- **Pengalih Workspace** (atas): pindah antara **Perikatan** (kerja audit) dan **Firma** (operasi
  firma). Modul yang tersedia berbeda di tiap workspace.
- **Sidebar kiri**: daftar modul dikelompokkan per topik (mis. "Core Execution", "People &
  Compliance"). Grup yang muncul tergantung peran Anda (§2) — ada tombol **"Tampilkan Semua"**
  untuk melepas kurasi bila Anda butuh modul di luar daftar default.
- **⌘K / Ctrl+K (Command Palette)**: cara tercepat membuka modul apa pun by name, termasuk modul
  yang sengaja tidak tampil di sidebar (mis. halaman Standar Audit (SA) mendalam, referensi
  PSAK/SAK) — modul-modul ini tetap ada, cuma "disembunyikan" dari sidebar utama supaya tidak
  memenuhi layar, bisa dibuka lewat cara ini kapan saja.
- **Chip "Standar Terkait"**: hampir tiap layar kerja audit (mis. Working Trial Balance,
  Materialitas) punya chip yang menautkan ke Standar Audit (SA)/PSAK terkait — klik untuk
  membuka penjelasan standar tanpa keluar dari konteks kerja Anda.
- **Breadcrumb/tombol kembali**: saat Anda membuka modul dari tautan modul lain (mis. dari
  Dashboard perikatan ke Working Trial Balance), ada jejak "kembali" di bagian atas — pakai ini,
  bukan tombol back browser, supaya konteks perikatan tetap terjaga.
- **Perikatan aktif**: sebagian besar modul workspace Perikatan bekerja pada SATU perikatan yang
  sedang "aktif". Pastikan Anda memilih perikatan yang benar sebelum mulai kerja (nama klien &
  tahun buku biasanya tampil di header).

---

## 4. Siklus Hidup Perikatan (4 Fase)

Setiap perikatan audit berjalan lewat 4 fase berurutan. Memahami fase ini penting karena
**beberapa aksi hanya bisa dilakukan di fase tertentu**, dan berpindah fase punya prasyarat
("gerbang") yang harus dipenuhi dulu.

```
Perencanaan  →  Eksekusi  →  Finalisasi  →  Arsip
```

| Fase | Apa yang terjadi | Prasyarat masuk fase ini |
|---|---|---|
| **Perencanaan** | Penerimaan/keberlanjutan klien, surat perikatan, strategi audit, materialitas, penilaian risiko | (Fase awal — dimulai saat perikatan dibuat) |
| **Eksekusi** | Pengujian lapangan: WTB, kertas kerja, AJE, sampling, konfirmasi, dst. | ✅ Keputusan **penerimaan/keberlanjutan klien disetujui** (SA 220/ISQM 1) DAN ✅ **surat perikatan sudah ditandatangani** (SA 210). Tanpa keduanya, transisi ke Eksekusi diblokir kecuali di-override Partner. |
| **Finalisasi** | Review, penyelesaian, penyusunan opini & laporan keuangan | ✅ **≥80% kertas kerja kunci sudah berkesimpulan** (SA 230) DAN ✅ **tidak ada kertas kerja yang sama sekali belum disentuh** DAN ✅ **tidak ada catatan review prioritas-tinggi yang masih terbuka** DAN ✅ **neraca saldo seimbang & ter-rekonsiliasi**. |
| **Arsip** | Perikatan selesai, opini final, hanya baca | ✅ Opini final DAN ✅ 100% kertas kerja sudah di-review. |

**Tentang "gerbang" (gate) ini:**
- Sifatnya **soft-gate** — sistem akan memberi peringatan/konfirmasi bila prasyarat belum
  terpenuhi, bukan otomatis mengunci Anda tanpa jalan keluar.
- **Hanya Engagement Partner** yang bisa **override** (melanjutkan fase meski prasyarat belum
  lengkap) — dan tindakan override ini **tercatat di jejak audit**, bukan diam-diam. Kalau Anda
  Manager/Senior/Junior dan butuh perikatan lanjut fase tapi prasyarat belum lengkap, itu perlu
  keputusan Partner, bukan sesuatu yang bisa Anda putuskan sendiri.
- Setelah **Arsip**, perikatan terkunci untuk diedit (masa retensi berlaku, lihat SA 230 §A21 di
  dokumentasi operator `docs/DEPLOY.md` bila Anda admin firma — bagi end-user, cukup tahu bahwa
  perikatan yang sudah diarsip tak lagi bisa diubah lewat alur normal).

---

## 5. Panduan per Peran

Bagian ini menjelaskan **apa yang biasanya Anda kerjakan sehari-hari**, berdasarkan peran Anda —
bukan daftar lengkap semua modul (itu ada di §6, sebagai rujukan).

### 5.1 Engagement Partner

Anda punya akses penuh ke seluruh aplikasi (kedua workspace, semua perikatan). Tugas inti yang
KHUSUS hanya bisa Anda lakukan (peran lain tidak bisa):

1. **Menyetujui opini audit** (modul `opinion` — Audit Opinion Generator) — persetujuan akhir
   sebelum laporan diterbitkan ke klien.
2. **Menandatangani EQR** (modul `eqr` — EQR Workflow) — penelaahan pengendalian mutu independen
   (ISQM 2), harus Partner (bukan Manager yang mengerjakan perikatan itu).
3. **Override gerbang fase** (§4) — memutuskan lanjut meski prasyarat belum lengkap, dalam
   situasi mendesak yang Anda pertimbangkan sendiri risikonya.
4. **Pengaturan firma** (Firm Admin) — termasuk hal yang berdampak ke seluruh firma, bukan satu
   perikatan.
5. **Kelola dokumen People & Compliance firma-wide** (payroll run, deklarasi etik/independensi,
   dst.) — sama seperti Admin & HR Firma, tapi sebagai cadangan oversight.

Selain itu, Anda juga bisa melakukan semua yang bisa dilakukan Audit Manager (lihat §5.2) di
perikatan mana pun (bukan hanya yang Anda pimpin).

**Alur kerja umum**: buka **Firm Dashboard** (Beranda Firma) untuk gambaran seluruh portofolio →
masuk ke perikatan tertentu bila ada yang perlu perhatian (catatan review prioritas-tinggi,
gerbang fase tertahan) → di akhir perikatan, tinjau ringkasan Finalisasi → **Opinion Generator**
→ setujui.

### 5.2 Audit Manager

Anda mengelola pelaksanaan perikatan sehari-hari dan mereview pekerjaan tim.

1. **Kelola roster klien & perikatan** (modul `engagement` — Engagement Mgmt) — tambah/ubah data
   perikatan, tugaskan Senior/Junior sebagai anggota tim.
2. **Sign-off sebagai reviewer** — di tiap kertas kerja (Working Papers), Anda menandatangani
   slot "Reviewer" setelah memeriksa pekerjaan Senior/Junior. Ini berbeda dari slot "Preparer"
   (diisi Senior/Junior yang mengerjakan).
3. **Edit AJE/WTB** — sama seperti Senior Auditor, Anda bisa mengusulkan/mengubah jurnal
   penyesuaian.
4. **Lihat SEMUA perikatan** (oversight portofolio) — tidak dibatasi hanya perikatan tempat Anda
   terdaftar sebagai anggota (beda dari Senior/Junior).
5. **Kelola integrasi/konektor data** — memicu sinkronisasi data eksternal (mis. Coretax/e-Faktur
   bila terhubung) ke sistem.

**Yang TIDAK bisa Anda lakukan** (perlu Partner): menyetujui opini final, menandatangani EQR,
override gerbang fase.

**Alur kerja umum**: masuk ke perikatan → **Engagement Cockpit** untuk lihat status keseluruhan →
**My Tasks**/**Review Notes** untuk lihat kertas kerja yang butuh review Anda → buka kertas kerja
→ periksa bukti & kesimpulan Preparer → sign-off Reviewer atau kembalikan dengan catatan.

### 5.3 Senior Auditor

Anda mengerjakan pengujian lapangan **hanya pada perikatan tempat Anda terdaftar sebagai anggota
tim** — cek dengan Manager/Partner bila ada perikatan yang seharusnya bisa Anda akses tapi tidak
muncul.

1. **Impor & kerjakan Working Trial Balance (WTB)** — tempel/impor neraca saldo klien (modul
   `wtb`), lalu seluruh modul PSAK/materialitas/going concern otomatis mengikuti angka ini.
2. **Edit kertas kerja (Working Papers)** — isi bukti audit, tickmark, catatan, dan kesimpulan
   auditor (SA 230) per prosedur.
3. **Edit AJE (Adjusting Journal Entries)** — usulkan penyesuaian audit terhadap saldo klien
   (Junior TIDAK bisa melakukan ini).
4. **Prosedur substantif spesifik**: Analytical Review, Sampling Audit (SA 530), Journal Entry
   Testing (JET/SA 240), Confirmation Hub (SA 505), dan modul area khusus lain sesuai penugasan
   (Going Concern, Related Parties, Group Audit, dst. — lihat §6).
5. **Ekspor dokumen** (working paper, register AJE, dsb.) dengan segel digital.

**Alur kerja umum**: buka **My Tasks** untuk lihat kertas kerja yang ditugaskan ke Anda → buka
kertas kerja → jalankan prosedur (baca chip "Standar Terkait" bila ragu standar mana yang
relevan) → catat bukti & kesimpulan → tandatangani sebagai Preparer → kirim untuk direview
Manager/Partner.

### 5.4 Junior Auditor

Sama seperti Senior Auditor dari sisi ruang lingkup (perikatan tempat Anda anggota tim saja),
tapi dengan satu batasan penting:

- **Anda TIDAK bisa mengedit AJE atau mengubah angka WTB** (override saldo). Bila pengujian Anda
  menemukan salah saji yang perlu penyesuaian, **catat temuan Anda di kertas kerja dan eskalasi
  ke Senior/Manager** — merekalah yang akan memutuskan & menginput penyesuaiannya.
- Anda tetap bisa mengedit kertas kerja, menjalankan prosedur pengujian, dan mengekspor dokumen.

**Alur kerja umum**: sama seperti Senior (§5.3) untuk bagian kertas kerja & prosedur, minus
langkah AJE. Kesimpulan pengujian Anda tetap masuk sebagai bukti yang akan direview.

### 5.5 Admin & HR Firma

Anda **tidak pernah menyentuh data perikatan/audit** — workspace Perikatan kosong bagi Anda
secara default (ini desain, bukan berarti Anda kehilangan akses). Fokus Anda murni operasional
SDM firma:

1. **Human Capital** (`hcm`), **Struktur Organisasi** (`orgchart`), **Rekrutmen & Onboarding**
   (`recruitment`) — data karyawan firma.
2. **Payroll & PPh 21** (`payroll`), **Cuti & Kehadiran** (`leave`) — administrasi rutin.
3. **Siklus Kinerja** (`performance`), **CPE/PPL Tracker** (`cpe`), **Pelatihan & Kompetensi**
   (`learning`), **Suksesi & Karier** (`succession`).
4. **Kode Etik & AML/PMPJ** (`ethics`), **Independence & Rotasi** (`independence`), **Sanksi &
   Disiplin** (`hrcase`) — dokumen kepatuhan ISQM 1 terkait SDM.

Anda bisa mengelola dokumen ini **atas nama siapa pun di firma** (bukan cuma data diri sendiri) —
staf lain (Partner/Manager/Senior/Junior) bisa melihat/mengisi bagian **milik mereka sendiri**
saja (mis. isi cuti sendiri, lihat SKP CPE sendiri) lewat modul yang sama.

### 5.6 Finance Firma

Sama seperti Admin & HR Firma, Anda **tidak menyentuh data perikatan/audit** — fokus murni
keuangan internal firma (BUKAN keuangan klien):

1. **General Ledger** (`firmgl`), **AP/AR Firma** (`apar`) — pembukuan firma.
2. **Pendapatan & WIP** (`revenue`), **WIP Valuation** (`wip`) — nilai pekerjaan dalam proses.
3. **Anggaran & Arus Kas** (`treasury`), **Kas, Bank & Rekonsiliasi** (`cashbank`).
4. **Aset Tetap Kantor** (`fixedassets`), **Pajak Firma** (`firmtax`), **Profitability**
   (`profitability`).
5. Anda juga melihat grup **Practice Operations** (Sales Pipeline, Delivery & Milestones, WIP &
   Realisasi, Billing & Invoicing, Resource Scheduler, Capacity Planning) — sisi operasional yang
   berkaitan langsung dengan keuangan firma.

---

## 6. Katalog Modul Lengkap

> Rujukan lengkap SEMUA modul, dikelompokkan per grup. **"Peran utama"** di judul tiap grup
> berarti peran yang melihat grup ini di sidebar SECARA DEFAULT — peran lain tetap bisa membuka
> modul di grup ini lewat ⌘K/"Tampilkan Semua" bila kapabilitasnya mengizinkan (lihat §2), tapi
> tidak akan melihatnya otomatis di sidebar mereka.
>
> Baris bertag **NEW** = modul yang relatif baru ditambahkan — fungsinya sudah lengkap (bukan
> placeholder), tag ini murni penanda usia fitur bagi tim internal, bukan indikasi "belum jadi".

### 6.1 Workspace **Perikatan** (kerja audit per-perikatan)

Grup di bawah ini **selalu terlihat penuh** bagi Engagement Partner, Audit Manager, Senior
Auditor, dan Junior Auditor. **Admin & HR Firma dan Finance Firma tidak melihat workspace ini
sama sekali** (mereka bukan staf audit).

#### Engagement Workspace
| Modul | Fungsi |
|---|---|
| Engagement Cockpit | Ringkasan status satu perikatan: progres fase, risiko tinggi, tugas terbuka — titik masuk harian saat mengerjakan sebuah perikatan. |
| My Tasks | Daftar kertas kerja & tugas yang ditugaskan ke Anda pribadi, lintas perikatan tempat Anda anggota. |
| Audit Programme | Program audit — daftar prosedur yang direncanakan per area, dengan status pelaksanaan. |
| Review Notes | Catatan review terbuka (temuan reviewer yang perlu ditindaklanjuti Preparer) — prioritas tinggi/sedang/rendah. |
| Time & Budget | Pencatatan jam kerja aktual vs anggaran perikatan. |
| Jadwal & Lini Masa Audit | Gantt/linimasa perikatan — milestone & tenggat. |

#### Referensi & Indeks
| Modul | Fungsi |
|---|---|
| Matriks Kepatuhan | Tabel silang modul ↔ Standar Audit/PSAK — cek standar mana yang sudah "menyala" (datanya lengkap) untuk perikatan ini. |
| Template Library | Pustaka template kertas kerja/surat yang bisa dipakai ulang. |
| Knowledge Base | Referensi metodologi & catatan internal firma. |

#### Core Planning (Fase Perencanaan)
| Modul | Fungsi | Standar terkait |
|---|---|---|
| Risk Assessment | Identifikasi & penilaian risiko salah saji material (RoMM) per area. | SA 315 |
| Materiality | Kalkulasi materialitas keseluruhan (OM), materialitas pelaksanaan (PM), dan ambang trivial (CTT) dari benchmark yang dipilih. | SA 320 |
| Internal Control | Pemetaan & evaluasi pengendalian internal klien. | SA 315, SA 265, SA 250 |
| Strategy Memo | Memo strategi audit keseluruhan — pendekatan per area risiko. | SA 300 |

#### Core Execution (Fase Eksekusi — inti)
| Modul | Fungsi | Standar terkait |
|---|---|---|
| Working Trial Balance (WTB) | Neraca saldo kerja — SUMBER ANGKA untuk seluruh modul lain. Impor via paste/CSV. | SA 500 |
| Adjusting Entries (AJE) | Register jurnal penyesuaian audit (hanya Senior ke atas yang bisa edit). | SA 450 |
| Working Papers | Kertas kerja per area/akun — bukti, tickmark, kesimpulan auditor (SA 230), sign-off Preparer/Reviewer. | SA 330, SA 230 |
| Matriks Asersi | Peta asersi manajemen (keberadaan, kelengkapan, dst.) ke prosedur & bukti yang menguji tiap asersi. | SA 315 |
| Analytical Review | Prosedur analitis (rasio, tren, perbandingan). | SA 520 |
| Journal Entry Testing (JET) | Pengujian jurnal untuk deteksi indikasi kecurangan. | SA 240, SA 330 |
| Tax Audit Diagnostic | Mesin diagnostik otomatis (Benford's law, rekonsiliasi buku-pajak) — bantuan identifikasi anomali, bukan pengganti prosedur manual. | — |

#### Core Specifics (prosedur area khusus)
| Modul | Fungsi | Standar terkait |
|---|---|---|
| Confirmation Hub | Kelola konfirmasi eksternal (piutang, bank, dst.) dan status balasannya. | SA 505 |
| Going Concern | Evaluasi kelangsungan usaha — rasio keuangan, Altman Z-score, skenario. | SA 570 |
| Opening Balance | Verifikasi saldo awal (perikatan tahun pertama). | SA 510 |
| Subsequent Events | Peristiwa setelah tanggal neraca yang berdampak ke LK. | SA 560 |
| Related Parties | Identifikasi & pengujian transaksi pihak berelasi. | SA 550 |
| Group Audit | Audit grup usaha dengan komponen/anak perusahaan. | SA 600 |
| Internal Audit | Evaluasi & pemanfaatan pekerjaan auditor internal klien. | SA 610 |
| Use of Expert | Dokumentasi penggunaan pekerjaan pakar (aktuaris, penilai, dst.). | SA 620 |
| Service Org | Pertimbangan atas organisasi jasa (mis. penyedia payroll outsourcing klien). | SA 402, SJAH 3402 |
| SAD Ledger | Ringkasan salah saji (Summary of Audit Differences) — dasar evaluasi materialitas akhir. | SA 450 |
| Evidence Evaluation | Evaluasi kecukupan & ketepatan bukti audit secara keseluruhan. | SA 500, SA 501 |

#### Finalisasi & Pelaporan (Fase Finalisasi)
| Modul | Fungsi | Standar terkait |
|---|---|---|
| Financial Statement Gen. | Penyusun laporan keuangan otomatis dari WTB + AJE. | SA 700, SA 710, SA 720 |
| Daftar-Uji Pengungkapan | Checklist kelengkapan pengungkapan (disclosure) LK. | — |
| Audit Opinion Generator | Penyusunan & persetujuan opini audit (hanya Partner yang menyetujui final). | SA 700, SA 701, SA 705/706, SA 580, SA 720 |
| EQR Workflow | Alur penelaahan pengendalian mutu independen (hanya Partner menandatangani). | ISQM 2, SA 220.36 |
| Management Letter | Surat manajemen — komunikasi defisiensi pengendalian & temuan ke TCWG. | SA 260, SA 265 |

> **Referensi mendalam (dibuka via chip "Standar Terkait" atau ⌘K, tidak muncul di sidebar):**
> halaman khusus tiap Standar Audit (SA 200/230/240/250/260/265 seri "Tanggung Jawab"; SA
> 501/520/530/540/580 seri "Bukti Audit"; SA 701/705/710/720 seri "Pelaporan"; SA 800/805/810,
> SPR 2400/2410, SJAH 3000/3400/3402/3410/3420 untuk perikatan non-audit) — dan seluruh referensi
> **Akuntansi (PSAK & SAK)** (PSAK 1 s.d. 117, ISAK 35, SAK EP, SAK Syariah, kalkulator ECL, dsb.)
> yang menjadi rujukan teknis saat mengerjakan prosedur di atas. Gunakan chip di layar kerja Anda
> daripada mencari manual satu-satu — chip sudah menautkan standar yang RELEVAN untuk modul yang
> sedang Anda buka.

### 6.2 Workspace **Firma** (operasi & tata kelola firma)

Peran utama per grup ditandai eksplisit — ini yang membedakan Firma dari Perikatan (di mana
semua staf audit melihat semuanya).

#### Firm Practice Management — *peran utama: Partner, Manager (oversight)*
| Modul | Fungsi |
|---|---|
| Firm Dashboard | Ringkasan seluruh portofolio firma — semua perikatan, risiko tinggi lintas klien. |
| BI & Konsolidasi | Business intelligence — agregasi data lintas perikatan/klien. |
| Client CRM | Data klien & kontak, terkait SA 210 (persetujuan ketentuan perikatan). |
| Engagement Mgmt | Kelola roster perikatan & penugasan tim (dipakai Manager sehari-hari). |
| Onboarding Klien | Alur akseptasi klien baru: Akseptasi → PMPJ/APU-PPT → Surat Perikatan → Konversi ke Perikatan. |
| Alur Data & Integritas | Rekonsiliasi & pengecekan integritas alur data (WTB↔GL↔laporan). |
| Keberlanjutan Klien | Register keberlanjutan klien aktif — pemicu rotasi/konflik/PIE/fee. |

#### Practice Operations — *peran utama: Finance Firma; Partner/Manager (oversight)*
| Modul | Fungsi |
|---|---|
| Sales Pipeline | Prospek & peluang bisnis baru. |
| Delivery & Milestones | Tenggat deliverable lintas perikatan. |
| WIP & Realisasi | Nilai pekerjaan-dalam-proses vs jam ter-realisasi. |
| Billing & Invoicing | Penagihan klien. |
| Resource Scheduler | Penjadwalan staf lintas perikatan. |
| Capacity Planning | Kapasitas tim vs beban kerja portofolio. |

#### People & Compliance — *peran utama: Admin & HR Firma (kelola penuh); SEMUA peran (data pribadi masing-masing)*
| Modul | Fungsi |
|---|---|
| Human Capital | Data karyawan firma. |
| Struktur Organisasi | Bagan organisasi firma. |
| Rekrutmen & Onboarding | Proses rekrutmen staf baru. |
| Pelatihan & Kompetensi | Katalog pelatihan internal & eksternal. |
| Suksesi & Karier | Perencanaan jenjang karier & suksesi. |
| Payroll & PPh 21 | Penggajian & pajak penghasilan karyawan. |
| Cuti & Kehadiran | Pengajuan & persetujuan cuti. |
| Siklus Kinerja | Penilaian kinerja tahunan/periodik. |
| CPE / PPL Tracker | Pencatatan jam pengembangan profesional berkelanjutan (kredit SKP). |
| Kode Etik & AML/PMPJ | Deklarasi kepatuhan kode etik & anti pencucian uang. |
| Independence & Rotasi | Deklarasi independensi & jadwal rotasi partner/staf kunci. |
| Sanksi & Disiplin | Register kasus disiplin/pelanggaran etik. |

#### Firm Finance (ERP) — *peran utama: Finance Firma; Partner/Manager (oversight)*
| Modul | Fungsi |
|---|---|
| General Ledger | Buku besar keuangan firma. |
| AP / AR Firma | Utang/piutang firma (bukan klien). |
| Pendapatan & WIP | Pengakuan pendapatan jasa & nilai WIP. |
| Anggaran & Arus Kas | Perencanaan anggaran & proyeksi kas firma. |
| Kas, Bank & Rekonsiliasi | Rekonsiliasi bank firma. |
| Aset Tetap Kantor | Register aset tetap milik firma (bukan klien). |
| Pajak Firma | Kewajiban pajak firma sebagai entitas. |
| Profitability | Analisis profitabilitas per klien/lini jasa. |

#### Firm Platform — *peran utama: Partner, Manager (oversight/administratif)*
| Modul | Fungsi |
|---|---|
| Approvals | Antrean persetujuan lintas modul. |
| Integrations | Status konektor data eksternal (mis. Coretax/e-Faktur). |
| Audit Trail | Jejak audit sistem (siapa mengubah apa, kapan) — hanya-baca, untuk oversight kepatuhan. |

#### Jasa Non-Audit (SPAP) — *peran utama: Partner, Manager (oversight); staf yang ditugaskan ke perikatan non-audit*
| Modul | Fungsi | Standar terkait |
|---|---|---|
| Portofolio Jasa | Ringkasan jasa non-audit yang dijalankan firma. | — |
| Reviu LK (SPR 2400) | Perikatan reviu laporan keuangan. | SPR 2400, SPR 2410 |
| Jasa Terkait (4400/4410) | Prosedur disepakati & kompilasi. | SPJ 4400/4410 |
| Asurans Lain (SPA) | Perikatan asurans selain audit/reviu historis. | SJAH 3000, SJAH 3400 |
| Due Diligence | Perikatan due diligence (M&A, dsb.). | SJAH 3000, SJAH 3420 |

#### Mutu, Risiko & Regulasi — *peran utama: Partner (tata kelola mutu firma)*
| Modul | Fungsi |
|---|---|
| Governance (SOQM) | Tata kelola sistem kendali mutu firma (ISQM 1). |
| SOQM Operasional | Pelaksanaan harian sistem kendali mutu. |
| Pelaporan PPPK | Pelaporan ke regulator (Pusat Pembinaan Profesi Keuangan). |

#### OJK · Pasar Modal & Keberlanjutan — *peran utama: Partner, Manager (klien emiten/terdaftar OJK)*
| Modul | Fungsi |
|---|---|
| Laporan Keberlanjutan (POJK 51) | Kepatuhan pelaporan keberlanjutan bagi klien wajib. |
| Daftar-Uji Sektor Jasa Keuangan | Checklist kepatuhan sektoral (bank/asuransi/dst.). |
| Batas Waktu & e-Filing OJK/BEI | Kalender tenggat pelaporan ke OJK/BEI. |
| Komite Audit (POJK 55/2015) | Dokumentasi komunikasi dengan komite audit klien emiten. |

#### Portal & Dokumen — *peran utama: SEMUA peran (dokumen kerja & komunikasi klien)*
| Modul | Fungsi |
|---|---|
| Presentasi Klien | Materi presentasi hasil audit ke klien. |
| Portal Klien / PBC | Portal permintaan dokumen ke klien (Prepared-by-Client) & pertukaran file. |
| Manajemen Dokumen | Penyimpanan & pengorganisasian dokumen firma/perikatan. |

#### Backoffice & Firm Mgmt — *peran utama: Finance Firma (operasional), Partner (kontrak/legal/lisensi)*
| Modul | Fungsi |
|---|---|
| Cockpit Operasi Firma | Ringkasan operasional backoffice firma. |
| Firm Finance | Ringkasan keuangan firma (tautan ke Firm Finance ERP). |
| Pengadaan & Vendor | Pembelian & manajemen vendor firma. |
| Aset & Fasilitas Kantor | Manajemen aset fisik kantor. |
| Retensi & Arsip (SA 230) | Kebijakan retensi dokumen sesuai SA 230. |
| Kontrak & Legal Firma | Manajemen kontrak firma (bukan kontrak klien). |
| Asuransi (PII) & Risiko | Asuransi tanggung jawab profesional (Professional Indemnity Insurance). |
| Perjalanan & Reimbursement | Klaim perjalanan dinas staf. |
| Lisensi & Perizinan | Izin praktik firma & sertifikasi profesional staf. |
| Pajak PPh 23 | Kewajiban withholding tax firma. |
| Compliance & Kriptografi | Pengaturan teknis kriptografi/kepatuhan (biasanya domain admin teknis, bukan end-user harian). |
| Pelindungan Data Pribadi (PDP) | Kepatuhan UU Pelindungan Data Pribadi — **lihat catatan di §7, ini area yang masih dalam pengembangan kebijakan**. |
| WIP Valuation | Nilai pekerjaan-dalam-proses per perikatan (tautan ke Time & Budget). |
| Forensic Cash Flow | Analisis forensik arus kas — deteksi anomali. |

---

## 7. Pertanyaan Umum & Troubleshooting

**T: Saya login tapi tidak melihat perikatan yang seharusnya saya kerjakan.**
J: Kemungkinan besar Anda belum ditambahkan sebagai anggota tim perikatan itu (isolasi
per-perikatan, §2). Minta Manager/Partner menambahkan Anda lewat Engagement Mgmt.

**T: Saya lupa kata sandi / kehilangan akses aplikasi authenticator (TOTP).**
J: Belum ada fitur reset mandiri lewat email — hubungi admin firma (Partner) untuk reset manual.

**T: Saya Junior Auditor, kenapa saya tidak bisa mengubah angka di AJE?**
J: Ini disengaja (§2, §5.4) — hanya Senior Auditor ke atas yang bisa mengubah penyesuaian audit.
Catat temuan Anda di kertas kerja dan eskalasi ke Senior/Manager.

**T: Saya Admin & HR Firma / Finance Firma, kenapa workspace Perikatan kosong?**
J: Disengaja — kedua peran ini murni operasional firma, bukan staf audit (§2, §5.5, §5.6).

**T: Modul yang saya cari tidak ada di sidebar.**
J: Coba **⌘K/Ctrl+K** untuk mencari langsung, atau klik **"Tampilkan Semua"** di sidebar. Sidebar
dikurasi per peran untuk kerapian, bukan pembatasan akses (§2). Kalau setelah itu tetap tidak
ketemu, cek dulu apakah modulnya memang ada di §6 katalog — kalau tidak ada, kemungkinan memang
belum dibangun.

**T: Bagaimana staf baru ditambahkan ke aplikasi?**
J: **Ini keterbatasan yang perlu Anda ketahui**: saat ini belum ada menu "Tambah Pengguna" di
dalam aplikasi untuk Partner/admin firma. Penambahan staf baru di luar admin pertama (yang dibuat
saat instalasi) memerlukan langkah teknis oleh operator/IT — lihat
**`docs/PILOT-ONBOARDING-PLAN.md`** §"Prasyarat Teknis" untuk detail dan rencana penanganannya
selama masa pilot.

**T: Apakah data klien saya aman / sesuai UU Pelindungan Data Pribadi (PDP)?**
J: Modul teknis (enkripsi, jejak audit, isolasi data) sudah dibangun (lihat `docs/DEPLOY.md`).
Kajian gap kepatuhan UU PDP awal sudah selesai (`docs/PDP-COMPLIANCE-ASSESSMENT.md`,
2026-07-03) — tapi **belum direview pengacara** dan sejumlah gap operasional (mis. permintaan
hapus/akses data belum bisa dieksekusi otomatis terhadap data produksi) masih terbuka. Ini
keputusan level firma/legal, bukan sesuatu yang end-user perlu selesaikan sendiri, tapi Anda
perlu tahu statusnya belum tuntas bila ditanya klien.

**T: Ke mana saya melapor kalau menemukan bug atau modul yang tidak sesuai harapan?**
J: Hubungi admin firma (Partner/Manager) — mereka yang berkoordinasi dengan tim pengembang.
