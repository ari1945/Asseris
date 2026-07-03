# LOGGING.md — retensi & agregasi log kontainer

> Menutup gap: sebelum ini, log `db`/`server`/`web` (Caddy) hanya ada di dalam driver `json-file`
> default Docker — **tanpa rotasi** (disk tumbuh tak terbatas) **dan tanpa salinan off-box**
> (kalau instance EC2 hilang, seluruh riwayat log operasional ikut hilang). Ditemukan dari evaluasi
> 2026-07-03. Ini bukan dokumen sekali-baca — sama seperti `backup.sh`/`export-audit-log.sh`, ini
> prosedur berulang, jadi berdiri sendiri (bukan bagian §1-§9 `docs/DEPLOY.md`).

## 1. Yang dibatasi secara sengaja (bukan bug)

Ini **retensi log operasional/debugging**, BUKAN penyimpanan bukti audit/kertas kerja — jangan
disamakan dengan kebijakan retensi dokumen SPAP/kertas kerja perikatan (itu diatur terpisah, di
level aplikasi: `AuditLog` hash-chained + `docs/DEPLOY.md` §6a). Log di sini adalah `stdout`/
`stderr` proses (request log, error, event boot) — berguna untuk debugging insiden, **bukan**
kepatuhan.

Tidak ada UI pencarian/agregasi (mis. Grafana Loki/ELK) — di luar cakupan untuk deploy satu-box
firma kecil. Kalau perlu menelusuri sesuatu di masa lalu: unduh arsip dari S3, `zgrep` langsung.
Kalau kebutuhan tumbuh (multi-box, tim ops lebih besar), ini titik natural untuk upgrade ke
agregator sungguhan — dicatat sebagai keputusan masa depan, bukan dibangun sekarang untuk
kebutuhan yang belum ada.

## 2. Lapisan 1 — rotasi lokal (selalu aktif, tak perlu konfigurasi)

`docker-compose.yml` dan `deploy/aws-ec2-test/docker-compose.deploy.yml` kini menyetel tiap servis
(`db`, `server`, `web`):
```yaml
logging:
  driver: json-file
  options:
    max-size: "20m"
    max-file: "5"
```
Membatasi tiap kontainer maksimum **100 MB** (5 file × 20 MB, dirotasi otomatis oleh Docker) — dari
sebelumnya tak terbatas. Untuk 3 servis, plafon total ~300 MB di disk `t3.small` (20 GB) — aman.
Ini **tidak** memberi durabilitas off-box; kalau box hilang, 100 MB terakhir per servis ini tetap
ikut hilang. Untuk itu, lapisan 2.

## 3. Lapisan 2 — salinan off-box (opt-in, terjadwal)

Skrip: `deploy/aws-ec2-test/ship-logs.sh` (pola sama `backup.sh`/`export-audit-log.sh`: cursor
lokal `.since` di `LOG_SHIP_DIR` — tiap run hanya mengirim jendela waktu baru sejak run terakhir;
run yang gagal TIDAK memajukan cursor, jadi run berikutnya otomatis mengulang jendela yang sama).

```cron
15 * * * *  cd /home/ubuntu/Asseris && sh deploy/aws-ec2-test/ship-logs.sh >> /var/log/asseris-log-ship.log 2>&1
```

Arsip lokal: `./logs-shipped/asseris-logs-<UTC>.tar.gz` (gabungan log `db`+`server`+`web` untuk
jendela waktu itu). Yang lebih tua dari `LOG_LOCAL_RETENTION_DAYS` (default **3 hari**) otomatis
di-prune — pendek karena salinan off-box (bila dikonfigurasi) adalah salinan durable jangka
panjangnya, lokal cuma buffer jangka pendek.

**Off-box (S3, opt-in):** set `LOG_S3_BUCKET=<nama-bucket>` (default jatuh ke `BACKUP_S3_BUCKET`
bila `LOG_S3_BUCKET` kosong — pola sama `export-audit-log.sh`) → tersalin ke
`s3://<bucket>/logs/…`, prefix **terpisah** dari dump DB (`s3://<bucket>/asseris-…`) dan ekspor
audit (`s3://<bucket>/audit-log/…`) supaya bisa diberi kebijakan lifecycle sendiri. Kegagalan
salin off-box **loud**: skrip exit non-zero + baris log `LOG_SHIP_OFFBOX_FAILED` (arsip lokal tetap
ada, hanya salinan off-box yang gagal) — sama seperti `BACKUP_OFFBOX_FAILED` di `backup.sh`.

**Rekomendasi lifecycle S3** (dikonfigurasi sekali di bucket, bukan oleh skrip ini — skrip tidak
bisa mengatur lifecycle bucket secara retroaktif untuk Object Lock, tapi lifecycle expiration biasa
bisa kapan saja):
```bash
aws s3api put-bucket-lifecycle-configuration --bucket <nama-bucket> --lifecycle-configuration '{
  "Rules": [{
    "ID": "asseris-logs-retention",
    "Filter": {"Prefix": "logs/"},
    "Status": "Enabled",
    "Expiration": {"Days": 90}
  }]
}'
```
90 hari adalah default operasional yang wajar untuk debugging pasca-insiden, bukan angka
regulasi — sesuaikan sesuai kebutuhan.

**Belum live-verified terhadap AWS S3 sungguhan** — teruji end-to-end (upload sukses + kegagalan
loud + cursor dedup + retensi prune) vs MinIO (S3-compatible lokal) di CI
`.github/workflows/log-shipping-drill.yml` (jadwal bulanan + tiap kali skrip/compose berubah),
gap yang sama seperti Secrets Manager/backup off-box (`docs/DEPLOY.md` §13/§6).

## 4. Debugging langsung (tanpa menunggu arsip)

Untuk insiden yang sedang berlangsung, log langsung di box masih cara tercepat:
```bash
docker compose -f deploy/aws-ec2-test/docker-compose.deploy.yml --env-file deploy/aws-ec2-test/.env \
  logs -f --tail=200 server
```
`ship-logs.sh`/arsip S3 adalah untuk **setelah** fakta (insiden sudah lewat, atau box sudah tak
bisa diakses) — bukan pengganti ini.

## 5. Referensi
- Skrip: `deploy/aws-ec2-test/ship-logs.sh`
- CI drill: `.github/workflows/log-shipping-drill.yml`
- Pola off-box yang sama: `deploy/aws-ec2-test/backup.sh` (§6 `docs/DEPLOY.md`),
  `deploy/aws-ec2-test/export-audit-log.sh` (§6a)
- Alerting (deteksi live, beda dari retensi log): `docs/DEPLOY.md` §16, `docs/INCIDENT-RESPONSE.md`
