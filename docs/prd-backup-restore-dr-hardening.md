# PRD — Backup/Restore Durability & DR Hardening (restore drill nyata + off-box copy + RTO/RPO)

> Wajib diisi sebelum implementasi apa pun. Implementasi TIDAK dimulai sebelum ada sign-off ("Proceed.").

| Field | Isi |
|---|---|
| Tanggal | 2026-07-02 |
| Pemilik | Ari Widodo |
| Status | Draft |
| Engagement ID terkait | — (infra deploy single-tenant, bukan engagement klien) |

## 1. Problem
Tiga gap konkret di jalur backup/restore/DR (`deploy/aws-ec2-test/backup.sh`, `restore.sh`,
`docs/DEPLOY.md` §6–§7), ditemukan pada review go-live readiness:

1. **Restore drill belum pernah benar-benar dieksekusi.** `docs/DEPLOY.md` §7 menulis drill ini
   **WAJIB** ("DoD §3.4") sebelum backup bisa dipercaya, tapi ini baru instruksi manual di dokumen —
   belum sekali pun benar-benar dijalankan dan dibuktikan. Klaim "backup bisa dipulihkan" saat ini
   **tak berdasar bukti**.
2. **Backup cuma di satu box.** `backup.sh` menulis ke `./backups/` lokal di EC2 yang sama dengan
   database produksi. Dokumen sendiri sudah memperingatkan ("Salin backups ke lokasi ke-2 — S3, dsb
   — satu box bukan durable") tapi peringatan itu belum diotomasi. Kalau instance EC2 hilang total
   (rusak, kena kompromi, akun AWS disuspend), **backup ikut hilang** — DR gagal total.
3. **RTO/RPO tak terdefinisi.** Tak ada angka eksplisit untuk "berapa lama downtime yang bisa
   diterima" (RTO) atau "berapa banyak data yang boleh hilang" (RPO). Tanpa ini, tak ada cara
   objektif menilai apakah arsitektur backup-harian-30-hari saat ini "cukup" atau tidak — dan tak
   ada dasar untuk representasi ke klien soal jaminan pemulihan.

## 2. Objective
Membuat klaim "kami bisa memulihkan data klien dalam X jam dengan kehilangan data maksimum Y jam"
menjadi **teruji secara empiris dan dijalankan otomatis**, bukan asumsi di atas kertas — dan
memastikan salinan backup selamat walau EC2 utama hilang total.

## 3. Success Criteria
1. **Drill nyata tereksekusi**, dibuktikan dengan log/output konkret: backup diambil → data
   dihapus/diganti pada instance terpisah → `restore.sh` dijalankan → `audit.verify` (rantai hash
   `AuditLog`) melaporkan `ok` → waktu total diukur.
2. **Drill itu otomatis, bukan sekali-jalan manusia** — CI job baru (mis.
   `restore-drill.yml`) menjalankan siklus penuh backup→wipe→restore→verify di kontainer efemeral,
   terjadwal (mingguan) + dipicu tiap kali `backup.sh`/`restore.sh` berubah. Kalau drill ini merah,
   itu sinyal nyata bahwa backup TAK bisa dipulihkan — bukan lagi asumsi.
3. **Backup tersalin off-box otomatis** setelah tiap backup lokal berhasil (target: S3, opt-in via
   env var — pola sama seperti `secrets.ts` opt-in AWS yang sudah ada). Kegagalan salinan off-box
   harus **terlihat jelas** (exit non-zero + log baris tegas) walau backup lokal tetap tersimpan
   sebagai jaring pengaman sementara.
4. **RTO/RPO terdefinisi eksplisit** di `docs/DEPLOY.md`, dengan angka **terukur** (bukan tebakan)
   dari hasil drill, plus keputusan Ari soal target yang mau dikomunikasikan ke klien.

## 4. Scope
- `deploy/aws-ec2-test/backup.sh`: tambah langkah opsional salin ke S3 (`BACKUP_S3_BUCKET` env,
  pola opt-in identik `secrets.ts`) — default OFF, tak mengubah perilaku instalasi existing.
- `.github/workflows/restore-drill.yml` baru: siklus backup→wipe→restore→verifikasi hash-chain
  otomatis via ephemeral Postgres+server (pola sama `deploy-smoke.yml`), plus kontainer MinIO
  (S3-compatible lokal) untuk menguji jalur upload S3 tanpa kredensial AWS asli.
- **Drill manual nyata SEKALI**, dijalankan sesi ini via WSL Docker Compose lokal (pola sama
  sesi #3 deploy-readiness) — sebagai bukti pertama, bukan pengganti otomasi CI di atas.
- `docs/DEPLOY.md`: bagian baru "Recovery Objectives (RTO/RPO)" — angka terukur dari drill +
  proposal target untuk disetujui Ari; update §7 (restore drill) mencatat "terakhir dieksekusi:
  tanggal + link CI run", bukan lagi cuma instruksi.
- Update memori proyek: tandai prioritas go-live #1 (restore drill) dan #5 sebagian (off-box backup)
  di [[asseris-deploy-readiness]]/[[neosuite-ams-next-session]].

## 5. Non-Scope
- **Alerting/paging manusia sungguhan** (PagerDuty, dsb) — tetap prioritas go-live #3 terpisah,
  belum disentuh di sini. Kegagalan off-box copy di sini baru "loud di log", belum "membangunkan
  orang jam 3 pagi".
- **Verifikasi live terhadap AWS S3 sungguhan** — TIDAK ADA kredensial AWS di lingkungan kerja ini
  (konsisten dengan gap Secrets Manager sebelumnya). Jalur S3 akan code-complete + teruji vs MinIO
  di CI, tapi verifikasi end-to-end ke bucket S3 asli **tetap item terbuka** menunggu Ari
  menyediakan kredensial/bucket.
- **Replikasi kontinu / WAL streaming / point-in-time recovery** — perubahan arsitektur lebih besar
  (butuh standby DB, dsb). Hanya relevan kalau keputusan RTO/RPO Ari menuntut RPO < 24 jam (lihat
  Open Questions #4).
- **Multi-region / cross-account backup vaulting** — di luar skala pilot single-tenant.
- **Live smoke test di EC2 sungguhan** — tetap prioritas go-live #4 terpisah (perlu instance pilot
  nyata, bukan WSL lokal).

## 6. Constraints
- Tak ada kredensial AWS tersedia di sesi kerja manapun sejauh ini (dicatat berulang di memori).
- Docker tersedia via WSL `dockerd` (terbukti sesi #3/#4) — cukup untuk drill lokal & CI ephemeral,
  bukan pengganti penuh EC2 nyata (tak ada network/EBS/noisy-neighbor asli).
- `backup.sh`/`restore.sh` sudah dipakai sebagai runbook operasional — perubahan harus backward
  compatible (default behavior tak berubah kalau env var S3 kosong).
- RTO/RPO pada akhirnya adalah **keputusan bisnis/kontraktual**, bukan sesuatu yang boleh saya
  tetapkan sepihak — akan diajukan sebagai proposal + angka terukur, keputusan akhir milik Ari.

## 7. Existing Solutions
Sudah ada dan **tak perlu dibangun ulang**:
- `backup.sh` — pg_dump --clean --if-exists → gzip → AES-256-CBC (`BACKUP_ENCRYPTION_KEY`,
  terpisah dari `APP_ENCRYPTION_KEY` by design) → retensi 30 hari. Ini tetap fondasi; PRD ini
  cuma **menambah** langkah salin-keluar, bukan mengganti mekanisme backup itu sendiri.
- `restore.sh` — decrypt → gunzip → psql restore destruktif, sudah mengandung instruksi verifikasi
  `audit.verify`. PRD ini men-scripting verifikasi itu (headless, via tRPC call) supaya bisa
  dijalankan otomatis di CI, bukan menulis ulang restore.
- `secrets.ts` (PR #56, opt-in AWS Secrets Manager) — pola opt-in-via-env-var yang sama akan
  ditiru untuk `BACKUP_S3_BUCKET`, bukan pola baru.
- `.github/workflows/deploy-smoke.yml` — pola boot ephemeral server+postgres yang akan ditiru untuk
  `restore-drill.yml`, bukan infra CI baru dari nol.

## 8. Proposed Approach
1. **Fase 1 — Drill manual nyata (bukti pertama).** Jalankan siklus penuh di WSL Docker Compose
   lokal: `backup.sh` → hapus/timpa data di container terpisah → `restore.sh` → cek `/healthz` →
   panggil endpoint `audit.verify` via curl/script (headless, bukan klik UI) → catat durasi total.
   Ini menutup gap #1 secara faktual (ada bukti bahwa restore BISA dipulihkan), sekaligus memberi
   **angka RTO empiris pertama**.
2. **Fase 2 — Otomasi drill di CI.** `restore-drill.yml`: job terjadwal mingguan + on-push ke
   `deploy/aws-ec2-test/{backup,restore}.sh`. Assert keras: hash-chain `AuditLog` identik
   sebelum/sesudah restore, row count tabel kunci cocok. Drill jadi self-proving, bukan dokumen mati
   yang bisa basi lagi seperti sekarang.
3. **Fase 3 — Off-box copy opt-in.** `backup.sh` +langkah `aws s3 cp` kalau `BACKUP_S3_BUCKET` di-set
   (default kosong = perilaku lama, tak berubah). Uji di CI pakai kontainer MinIO (S3-compatible,
   nol biaya/kredensial) supaya jalur kode teruji tanpa AWS asli. Kegagalan upload S3 → exit
   non-zero + baris log tegas (`BACKUP_OFFBOX_FAILED`), backup lokal tetap ada.
4. **Fase 4 — Dokumentasi RTO/RPO.** Tambah bagian baru di `DEPLOY.md`: RPO = frekuensi backup saat
   ini (harian → RPO ≤24 jam, KECUALI Ari minta lebih ketat → lihat Open Questions #4); RTO =
   angka terukur dari Fase 1 + provisioning time instance baru (perkiraan, bukan terukur — perlu
   EC2 nyata utk validasi penuh, prioritas go-live #4 terpisah). Keduanya ditandai **PROPOSAL**,
   perlu sign-off eksplisit Ari sebagai angka final yang mau dikomunikasikan ke klien.

## 9. Risks
- **Drill CI bisa flaky** (kontainer efemeral, timing) — mitigasi: retry policy sama seperti
  `edge-smoke` yang sudah terbukti stabil, dan job ini TAK memblokir deploy PR lain (jalan
  terjadwal + on-path-change saja, bukan gate tiap PR).
- **RTO/RPO yang saya usulkan salah tebak vs ekspektasi klien/kontrak** — mitigasi: eksplisit
  ditandai "proposal", bukan final, sampai Ari konfirmasi; tak ditulis ke materi klien sebelum
  sign-off.
- **Off-box copy gagal senyap** kalau tak ada yang membaca log cron — risiko residual karena
  alerting sungguhan di luar scope ini; didokumentasikan sebagai keterbatasan terbuka, bukan
  disembunyikan.
- **WSL Docker bukan pengganti penuh EC2 nyata** — angka RTO dari drill lokal adalah *lower bound*,
  bukan angka final; harus divalidasi ulang di EC2 pilot sungguhan (tertaut ke prioritas go-live #4).

## 10. Implementation Plan
| Fase | Isi | Bukti keberhasilan |
|---|---|---|
| 1 | Drill manual nyata (WSL Docker) | Log lengkap backup→wipe→restore→`audit.verify=ok` + durasi |
| 2 | CI `restore-drill.yml` (terjadwal + on-change) | CI run hijau, dapat diulang, tak manual |
| 3 | `backup.sh` +opt-in S3 upload, teruji vs MinIO di CI | Upload sukses ke MinIO lokal di CI; default-off tak berubah utk instalasi existing |
| 4 | `docs/DEPLOY.md` bagian RTO/RPO + update §7 | Angka terukur+proposal tertulis, menunggu sign-off Ari |

## 11. Open Questions
1. **RTO/RPO target macam apa yang sebenarnya dijanjikan/diharapkan klien** (kalau ada komitmen
   kontraktual)? Tanpa ini saya cuma bisa mengusulkan angka berbasis kemampuan teknis saat ini
   (RPO ≤24 jam, RTO ≈ durasi drill + provisioning) — **bukan angka yang saya putuskan sendiri**.
2. **Kapan kredensial/bucket AWS S3 sungguhan akan tersedia** untuk verifikasi off-box copy secara
   live (bukan cuma vs MinIO)? Sampai saat itu, status tetap "code-complete, belum live-verified" —
   pola yang sama seperti gap AWS Secrets Manager sebelumnya.
3. Apakah frekuensi backup perlu dinaikkan dari harian (mis. per-6-jam) untuk memperketat RPO?
   Ini menambah biaya storage/S3 request — worth it hanya kalau Ari/klien butuh RPO <24 jam.
4. Kegagalan off-box copy: cukup "loud di log cron" untuk sekarang, atau perlu ditautkan ke mekanisme
   alerting minimal (mis. email cron `MAILTO`) sebagai langkah antara sebelum alerting penuh
   (prioritas go-live #3) dibangun?

---
**Sign-off:** ditandai dengan balasan **"Proceed."**
