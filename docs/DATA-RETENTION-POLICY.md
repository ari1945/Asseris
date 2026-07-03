# DATA-RETENTION-POLICY.md — retensi & pemusnahan data pasca-engagement/kontrak

> Menutup gap: "belum ada kebijakan retensi data klien pasca-engagement selesai/kontrak berakhir
> (kapan data dihapus, siapa yang berwenang)." Dua hal BERBEDA disatukan sengaja dalam satu
> dokumen karena sering tertukar:
> 1. **Retensi kertas kerja SATU perikatan** (sudah ada, `app/data_records.js`) — soal SA 230/UU
>    KUP, TIDAK berubah oleh dokumen ini.
> 2. **Retensi/pemusnahan data SELURUH firma** pasca kontrak SOFTWARE dengan Ari berakhir — gap
>    yang BENAR-BENAR baru, ditutup dokumen ini.

## 1. Kelas retensi existing (per-dokumen, sudah ada di kode — rujukan, bukan diubah)

Dari `app/data_records.js` (`RETENTION_CLASSES`):

| Kelas | Dasar | Masa simpan | Catatan |
|---|---|---|---|
| Kertas kerja audit (`kk-audit`) | SA 230 | 7 tahun | Default kelas berkas asurans |
| Telaah mutu perikatan (EQR) | ISQM 2 / SPM 1 | 7 tahun | |
| Dokumen pajak & keuangan firma | UU KUP Ps. 28(11) | 10 tahun | |
| **Data pribadi / PMPJ (APU-PPT)** | **POJK & UU PDP** | **5 tahun pasca berakhirnya hubungan** | Tunduk UU PDP — minimisasi & pemusnahan tepat waktu wajib (`data_records.js:46`) |
| Template & metodologi internal | Kebijakan firma | 3 tahun | |

Mekanisme pendukung yang sudah ada (jangan dibangun ulang): **Legal Hold** (`HOLDS` di
`data_records.js`) menangguhkan pemusnahan bila ada sengketa/somasi; **assembly window** SA 230
¶A21 60 hari pasca tanggal laporan (`data_records.js:138`) sebelum berkas dikunci.

**Batasan jujur (Finding K7, sudah tercatat sebelumnya)**: kelas di atas TERDEFINISI tapi TAK
DITEGAKKAN teknis — tak ada job otomatis yang benar-benar menghapus/memusnahkan data saat masa
retensi habis, dan `StateDoc` (penyimpan nilai kertas kerja) tak punya snapshot historis atau
assembly-lock nyata yang membekukan file setelah 60 hari. Roadmap teknis: §6.

## 2. Retensi & pemusnahan data SELURUH FIRMA pasca kontrak software berakhir

Ini gap yang belum pernah didefinisikan — konteks: arsitektur single-tenant berarti "kontrak
software Ari↔firma berakhir" secara praktis = "instance EC2+DB firma itu perlu dihentikan", bukan
sekadar menghapus baris di database bersama (tidak ada database bersama).

### 2.1 Definisi & pemicu
"Kontrak berakhir" = firma pilot memutuskan berhenti berlangganan Asseris sepenuhnya (bukan
sekadar satu perikatan/klien mereka selesai — itu tetap tunduk kelas retensi §1 seperti biasa).

### 2.2 Timeline (proposal, menunggu sign-off Ari — pola sama RTO/RPO di `docs/DEPLOY.md` §7)

| Tahap | Jangka waktu | Aksi |
|---|---|---|
| **T+0** | Saat firma pilot mengonfirmasi tertulis kontrak berakhir | Instance TIDAK langsung dimatikan — masuk masa tenggang. |
| **T+0 s.d. T+30 hari** | Masa tenggang | Firma pilot dapat meminta ekspor penuh data mereka (backup `pg_dump` mentah + ekspor terstruktur XLSX/PDF yang sudah ada). Instance tetap berjalan read-only atau penuh sesuai kebutuhan transisi. |
| **T+30 hari** | Batas akhir masa tenggang | Backup final terenkripsi dibuat & diserahkan ke firma (1x, terverifikasi checksum) sebagai bukti serah-terima. |
| **T+30 s.d. T+37 hari** | Masa tunggu konfirmasi | Tunggu konfirmasi tertulis firma bahwa backup final sudah diterima & diverifikasi baik. |
| **T+37 hari** | Eksekusi pemusnahan | Instance EC2 di-terminate (bukan sekadar stop), volume EBS dihapus, salinan off-box S3 (`docs/DEPLOY.md` §6, §6a) di prefix firma tersebut dihapus (kecuali ada Legal Hold aktif — §2.4). |
| **T+37 hari** | Pencatatan | Ari mencatat bukti pemusnahan (log manual — lihat §3) sebagai bukti akuntabilitas Prosesor. |

**Pengecualian**: kewajiban retensi hukum yang MELEKAT ke jenis dokumen tertentu (mis. PMPJ 5
tahun, pajak 10 tahun di §1) **tidak otomatis gugur** hanya karena kontrak software berakhir —
kewajiban itu ada di FIRMA (Pengendali), bukan di infrastruktur Ari. Firma pilot bertanggung
jawab memindahkan/menyimpan sendiri dokumen yang masih wajib retensi setelah menerima backup
final T+30, di luar sistem Ari.

### 2.3 Siapa berwenang

| Aksi | Berwenang memicu | Berwenang eksekusi |
|---|---|---|
| Konfirmasi kontrak berakhir | Partner firma pilot (tertulis, email cukup) | — |
| Persetujuan backup final diterima | Partner firma pilot (tertulis) | — |
| Eksekusi pemusnahan infrastruktur | — | Ari (operator teknis) — **dual-konfirmasi**: tak boleh eksekusi tanpa konfirmasi tertulis §2.2 tahap "T+30 s.d. T+37" |
| Override/perpanjang masa tenggang | Ari (kebijaksanaan operasional, mis. firma butuh waktu lebih) | — |

### 2.4 Legal Hold override
Bila ada sengketa hukum, somasi, atau permintaan regulator terkait data firma tersebut,
pemusnahan **ditangguhkan** sampai hold dicabut — pola sama `HOLDS` di `data_records.js` §1,
diterapkan manual di level infrastruktur (bukan otomatis, karena ini level firma bukan level
dokumen).

## 3. Prosedur interim MANUAL (karena belum ada tombol/skrip otomatis — jujur, lihat §6)

Sampai ada tooling otomatis, eksekusi §2.2 tahap T+37 dilakukan manual oleh Ari mengikuti
checklist ini (dicatat di log operator, mis. file/issue tracker — tidak perlu tabel DB baru):

1. [ ] Konfirmasi tertulis firma (§2.3) tersimpan.
2. [ ] Backup final dibuat: `sh deploy/aws-ec2-test/backup.sh` (manual run, bukan cron) →
   simpan checksum.
3. [ ] Backup final diserahkan ke firma (mis. link download aman/terenkripsi) + konfirmasi
   diterima.
4. [ ] Salinan off-box S3 firma tersebut (bila `BACKUP_S3_BUCKET` dipakai) dihapus:
   `aws s3 rm s3://<bucket>/asseris-<firma>/ --recursive` dan prefix `audit-log/` terkait.
5. [ ] Instance EC2 di-terminate: `terraform destroy` (bila diprovisioning via
   `deploy/aws-ec2-test/terraform/`) atau `aws ec2 terminate-instances` manual + hapus Elastic IP.
6. [ ] Catat tanggal+bukti eksekusi (screenshot/log CLI) sebagai bukti akuntabilitas Prosesor
   (§4).

## 4. Akuntabilitas Prosesor — bukti penghapusan

Sebagai Prosesor (`docs/PDP-COMPLIANCE-ASSESSMENT.md` §1), Ari perlu bisa MEMBUKTIKAN penghapusan
sudah dilakukan (bukan sekadar mengklaim) bila diminta firma atau regulator. Checklist §3 di atas
BERFUNGSI sebagai bukti minimal — simpan hasil checklist per firma yang kontraknya berakhir,
terpisah dari data firma itu sendiri (supaya bukti tak ikut terhapus).

## 5. Retensi akun staf firma resign (gap terpisah, dicatat di sini)

Belum ada kebijakan eksplisit untuk retensi akun `User`/`TeamMember` staf yang resign dari firma
pilot (selama firma masih berlangganan). Rekomendasi sementara: nonaktifkan (bukan hapus) akun
staf resign — mempertahankan integritas jejak audit (`AuditLog` mereferensikan `userId`), dengan
PII minimal (nama/email tetap ada untuk keperluan jejak audit historis, konsisten prinsip Ps. 16
"akurasi" bukan "hapus total" karena kebutuhan akuntabilitas audit lebih berat). Ini judgment call
yang perlu dikonfirmasi bersama kajian legal (`docs/PDP-COMPLIANCE-ASSESSMENT.md` §5).

## 6. Roadmap teknis (target-state, di luar cakupan sesi ini)

- Job purge otomatis yang menegakkan kelas retensi §1 tanpa intervensi manual.
- Assembly-lock 60 hari nyata (Finding K7) — StateDoc snapshot historis + freeze pasca tanggal
  laporan.
- Skrip `terminate-firm.sh` yang mengotomasi checklist §3 (backup→serah-terima→hapus S3→terminate
  EC2→log) — analog `backup.sh`/`restore.sh` yang sudah ada.

## 7. Referensi
- Kelas retensi & Legal Hold: `app/data_records.js`
- Peran Pengendali/Prosesor: `docs/PDP-COMPLIANCE-ASSESSMENT.md` §1
- Komitmen data-handling: `docs/DATA-HANDLING-COMMITMENT.md` §6, §7
- Backup/off-box: `docs/DEPLOY.md` §6, §6a · Terraform provisioning: `deploy/aws-ec2-test/terraform/`

## 8. Status
2026-07-03: kebijakan & prosedur interim manual **didefinisikan** (dokumen ini). Timeline §2.2
adalah **proposal menunggu sign-off Ari** (pola sama RTO/RPO) — belum pernah dieksekusi terhadap
firma pilot sungguhan (belum ada firma pilot yang kontraknya berakhir). Roadmap §6 belum dimulai.
