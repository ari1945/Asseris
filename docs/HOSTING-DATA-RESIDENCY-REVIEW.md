# HOSTING-DATA-RESIDENCY-REVIEW.md — kesesuaian lokasi hosting AWS untuk data pajak/keuangan Indonesia

> Menutup gap: "belum ada review apakah hosting di AWS EC2 (kemungkinan region tertentu) sesuai
> ketentuan lokasi data untuk data keuangan/pajak Indonesia." **Bukan legal opinion final** —
> kesimpulan kerangka hukum di §2 perlu diverifikasi pengacara sebelum dijadikan klaim kepatuhan
> ke klien, sama seperti `docs/PDP-COMPLIANCE-ASSESSMENT.md`.

## 1. Kondisi saat ini (dibaca dari kode, bukan asumsi)

- **Region default**: `ap-southeast-3` (Jakarta) — `deploy/aws-ec2-test/terraform/variables.tf:11-14`.
  Alternatif yang didokumentasikan: `ap-southeast-1` (Singapura) untuk kasus tertentu (mis. jenis
  instance/AZ tak tersedia di Jakarta).
- **Model**: single-tenant — satu EC2 (+EBS+Elastic IP) per firma, di region yang sama dengan
  DB Postgres-nya (berjalan di kontainer yang sama, bukan RDS terpisah lintas region).
- **Backup off-box (opsional)**: `BACKUP_S3_BUCKET` (`docs/DEPLOY.md` §6) — region bucket S3
  **tidak dipaksa sama** dengan region EC2 oleh kode; ini keputusan operator saat membuat bucket.
- **Secrets Manager (opsional)**: `AWS_REGION` diisi terpisah saat setup (`docs/DEPLOY.md` §13) —
  juga tidak dipaksa sama dengan region EC2 oleh kode.

## 2. Kerangka hukum lokasi data Indonesia (ringkasan, PERLU VERIFIKASI PENGACARA)

Dua rezim yang sering tertukar — penting dibedakan:

1. **PP 71/2019 (Penyelenggaraan Sistem dan Transaksi Elektronik)** — mewajibkan lokalisasi
   ketat HANYA untuk **"data elektronik strategis"** (umumnya terkait pemerintahan/keamanan
   negara/data kependudukan skala nasional) yang wajib disimpan & diproses **di dalam negeri**.
   Data pajak/keuangan KAP klien SME **kemungkinan besar TIDAK masuk kategori strategis** —
   melainkan kategori "tinggi" atau "rendah" yang boleh diproses di luar negeri dengan syarat
   (kerja sama internasional/hukum negara tujuan). **Ini kesimpulan yang perlu dikonfirmasi
   pengacara**, bukan final.
2. **UU PDP 27/2022** — TIDAK mewajibkan hosting di dalam negeri untuk data pribadi sektor privat
   secara umum. Yang diwajibkan adalah syarat untuk **transfer lintas batas** (Ps. 56 — negara
   tujuan setara/consent/perjanjian mengikat), BUKAN larangan hosting luar negeri per se.
   Lihat `docs/PDP-COMPLIANCE-ASSESSMENT.md` §2 baris "Transfer data lintas batas" — ini relevan
   untuk fitur LLM (W8), BUKAN untuk hosting EC2 (karena `ap-southeast-3` sudah di Indonesia).

**Kesimpulan praktis**: dengan region `ap-southeast-3` (Jakarta) sebagai default, hosting inti
(EC2+DB+backup lokal) SUDAH berada di dalam yurisdiksi Indonesia — ini melampaui kewajiban
minimum UU PDP (yang tak mewajibkan hosting lokal) dan kemungkinan besar aman terhadap PP
71/2019 untuk profil klien non-regulasi (§0 `docs/PDP-COMPLIANCE-ASSESSMENT.md`). Isu residensi
data yang SEBENARNYA masih terbuka bukan di hosting EC2, melainkan di **transfer LLM lintas
batas** (§2 poin 2 di atas) dan **konsistensi region backup off-box S3** (§3).

## 3. Temuan & rekomendasi operasional

| # | Temuan | Rekomendasi |
|---|---|---|
| 1 | Region EC2 default sudah `ap-southeast-3` (Jakarta) — baik. | **Pastikan dipakai secara eksplisit** saat provisioning firma pilot pertama (`terraform apply -var aws_region=ap-southeast-3` atau biarkan default) — jangan biarkan operator diam-diam pakai `ap-southeast-1` karena alasan ketersediaan tanpa mencatat kenapa. |
| 2 | Region bucket S3 off-box (`BACKUP_S3_BUCKET`) tidak dipaksa sama dengan EC2 oleh kode. | Saat membuat bucket S3, **pilih `ap-southeast-3` juga** — konsistensi lokasi data penuh (primary + backup), bukan cuma primary. Tambahkan catatan ini ke runbook operator (`docs/DEPLOY.md` §6). |
| 3 | `AWS_REGION` untuk Secrets Manager independen dari region EC2. | Sama seperti #2 — selaraskan ke `ap-southeast-3` saat setup, dokumentasikan alasan (bukan cuma default AWS CLI). |
| 4 | Fitur LLM proxy (W8) mengirim data ke luar negeri. | **Ini bukan soal region hosting** — sudah ditandai terpisah di `docs/PDP-COMPLIANCE-ASSESSMENT.md` §2/§5 sebagai isu transfer lintas-batas Ps. 56, bukan diselesaikan lewat pemilihan region AWS. |
| 5 | Belum ada klien firma pilot ter-regulasi OJK (dikonfirmasi Ari 2026-07-03). | Bila kelak ada, POJK (mis. ketentuan penyelenggaraan teknologi informasi bagi lembaga jasa keuangan) punya syarat tambahan yang TERPISAH dari UU PDP/PP 71 — **wajib kajian ulang sebelum onboarding klien jenis itu**, jangan diasumsikan otomatis sama dengan profil non-regulasi saat ini. |

## 4. Batasan kajian ini

- Bukan legal opinion — kesimpulan §2 adalah pembacaan awam kerangka regulasi untuk mempercepat
  review pengacara, bukan pengganti review itu sendiri.
- Tidak menilai kontrak/kepatuhan AWS sendiri (mis. AWS Digital Sovereignty commitments,
  sertifikasi ISO/SOC region `ap-southeast-3`) — di luar cakupan, bisa jadi kajian tambahan bila
  diperlukan.
- Asumsi eksplisit: klien firma pilot non-regulasi khusus (§0 `docs/PDP-COMPLIANCE-ASSESSMENT.md`)
  — kajian ini TIDAK valid otomatis untuk klien ter-regulasi OJK/data strategis.

## 5. Referensi
- Region & provisioning: `deploy/aws-ec2-test/terraform/variables.tf`, `docs/DEPLOY.md` §0, §6
- Transfer lintas-batas LLM: `docs/PDP-COMPLIANCE-ASSESSMENT.md` §2, §5
- Peran Pengendali/Prosesor: `docs/PDP-COMPLIANCE-ASSESSMENT.md` §1

## 6. Status
2026-07-03: kajian awal selesai, region existing (`ap-southeast-3`) dinilai **memadai untuk
profil klien non-regulasi saat ini** dengan rekomendasi konsistensi §3. Belum direview pengacara.
