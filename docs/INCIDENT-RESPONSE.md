# INCIDENT-RESPONSE.md — deteksi, respons, eskalasi

> Menutup gap: sebelum ini tak ada dokumen yang menjawab "siapa yang tahu jika server down jam 2
> pagi, dan apa yang mereka lakukan?" (evaluasi 2026-07-03). Ini jawabannya — jujur tentang
> keterbatasan struktur tim saat ini, bukan rencana eskalasi fiktif. **Postur ini adalah keputusan
> Ari** (dikonfirmasi 2026-07-03), bukan asumsi penulis dokumen — lihat §0.

## 0. Postur operasional saat ini (keputusan eksplisit, bukan default yang diasumsikan)

| Pertanyaan | Keputusan | Implikasi |
|---|---|---|
| **Kontak teknis** | **Ari Widodo — satu-satunya kontak teknis.** Tidak ada eskalasi sekunder saat ini. | **Single point of failure** yang diakui secara sadar, bukan celah tersembunyi. Mitigasi: dokumen ini + `docs/DEPLOY.md` dirancang cukup lengkap agar pihak ketiga (mis. kontraktor IT lepas) bisa mengeksekusi pemulihan tanpa pengetahuan mendalam soal aplikasi, JIKA suatu saat Ari benar-benar tak tersedia. Ini bukan pengganti sungguhan untuk kontak sekunder — pertimbangkan menambah satu begitu ada rekan/vendor IT yang bisa dipercaya untuk operasional. |
| **Komitmen waktu respons** | **Best-effort, jam kerja saja.** Tidak ada jaminan 24/7. | Alert di luar jam kerja mungkin baru direspons keesokan hari kerja. Ini harus dikomunikasikan proaktif ke klien SEBELUM onboarding data sungguhan bila mereka menanyakan postur uptime (lihat `docs/PENTEST-READINESS.md` §2 — soal ini sudah relevan begitu ada data klien nyata). |
| **Saluran deteksi** | Email SMTP (lihat §1). | Email bisa terlewat/masuk spam — bukan mekanisme paging (tak ada eskalasi bila tak dibaca dalam waktu X). Lihat batasan di `docs/DEPLOY.md` §16. |

**Kapan meninjau ulang tabel ini:** begitu ada staf teknis kedua, begitu ada klien yang secara
eksplisit meminta SLA lebih ketat (kontraktual), atau begitu insiden nyata menunjukkan postur ini
tak memadai.

## 1. Deteksi — bagaimana sebuah insiden diketahui

1. **`.github/workflows/uptime-alert.yml`** — probe eksternal `/healthz` tiap 15 menit (berjalan
   di GitHub Actions, BUKAN di box EC2 — sengaja, supaya pemeriksa tak ikut mati bila box-nya
   mati). Gagal → email ke `ALERT_EMAIL_TO` (secret repo) via SMTP.
2. **Notifikasi kegagalan bawaan GitHub** — GitHub otomatis mengirim email ke *watcher* repo saat
   scheduled workflow gagal. Lapisan kedua gratis, tanpa konfigurasi tambahan — jangan andalkan
   sebagai satu-satunya, tapi baik untuk redundansi.
3. **Manual** — `curl -k https://$PUBLIC_HOST/healthz` kapan saja dicurigai ada masalah.
4. **Yang BELUM ada (gap diketahui, bukan diabaikan):** tak ada dead-man's-switch untuk
   `backup.sh`/`export-audit-log.sh`/`ship-logs.sh` sendiri (mis. lewat Healthchecks.io) — kalau
   cron job backup di box berhenti jalan (bukan gagal, tapi tak jalan sama sekali, mis. box reboot
   dan crontab tak ter-restore), tak ada yang memberitahu. Item follow-up, di luar cakupan 3 gap
   yang ditutup sesi ini.

## 2. Matriks Severitas

| Level | Definisi | Contoh |
|---|---|---|
| **SEV1** | Aplikasi sepenuhnya tak bisa diakses, atau data berisiko rusak/hilang. | `/healthz` gagal terus-menerus; `DROP SCHEMA` tak sengaja; disk penuh; sertifikat TLS kedaluwarsa (klien tak bisa login sama sekali). |
| **SEV2** | Terdegradasi — sebagian fungsi terganggu, data tak berisiko. | DB lambat tapi `up`; satu servis (mis. `web`/Caddy) restart-loop tapi `server`+`db` sehat; rate-limit edge memblokir IP kantor yang sah. |
| **SEV3** | Kecil, tak menghalangi kerja. | Log/metric anomali tanpa dampak fungsional; peringatan (bukan error) di `docker compose logs`. |

## 3. Runbook respons (langkah demi langkah)

### 3.1 Terima & triase (target: dalam jam kerja, best-effort — §0)
```bash
curl -k https://$PUBLIC_HOST/healthz         # status + db up/down?
docker compose -f deploy/aws-ec2-test/docker-compose.deploy.yml \
  --env-file deploy/aws-ec2-test/.env ps     # semua servis "healthy"/"running"?
docker compose -f deploy/aws-ec2-test/docker-compose.deploy.yml \
  --env-file deploy/aws-ec2-test/.env logs --tail=200 server db web
curl -k https://$PUBLIC_HOST/metrics          # http_errors_total naik tajam?
```
Klasifikasikan severitas (§2) berdasarkan temuan di atas.

### 3.2 Mitigasi (paling umum → paling drastis)
1. **Restart servis yang bermasalah**: `docker compose ... restart <servis>` — paling murah,
   coba dulu untuk kondisi non-korup (mis. servis stuck, memory leak sementara).
2. **Rollback config/image**: `docker compose ... up -d --build` di commit/tag sebelumnya
   (`docs/DEPLOY.md` §9).
3. **Restore dari backup** (data korup/hilang, SEV1): ikuti `docs/DEPLOY.md` §7 — skrip
   `restore.sh` dari dump terenkripsi terakhir. **SELALU backup dulu sebelum restore** jika data
   saat ini masih sebagian bisa diselamatkan.
4. **Rotasi kunci** (bila insiden = kebocoran/kompromi kredensial): `docs/KEY-ROTATION.md`.

### 3.3 Komunikasi (bila berdampak ke klien — SEV1/SEV2 berkepanjangan)
Template singkat untuk klien (isi sesuai konteks, jangan janji waktu pemulihan yang belum pasti):
```
Subjek: [Nama Firma] — Gangguan layanan Asseris

Kami mendeteksi gangguan pada sistem Asseris sejak [waktu, WIB]. Tim kami sedang menangani.
Data Anda [aman/sedang diverifikasi] — kami akan mengabari begitu ada perkembangan.
```

### 3.4 Resolusi & tutup
- Konfirmasi `/healthz` → `{"status":"ok","db":"up"}` stabil (bukan sesaat).
- Verifikasi integritas: buka app → **Jejak Audit** → `audit.verify` harus `ok` (terutama pasca
  restore — lihat `docs/DEPLOY.md` §7).

## 4. Tinjauan pasca-insiden (untuk SEV1, dan SEV2 yang berkepanjangan)

Isi singkat, dalam 1-2 hari kerja setelah resolusi — bukan formalitas, tujuannya supaya kelas bug
yang sama tak terjadi lagi tanpa terdeteksi (semangat sama seperti `restore-drill.yml`: hal yang
tak pernah diuji/ditinjau cenderung diam-diam rusak lagi):

- **Kronologi**: kapan terdeteksi, kapan terkonfirmasi, kapan pulih (timestamp UTC + WIB).
- **Akar masalah**: apa yang sebenarnya terjadi (bukan cuma gejala).
- **Dampak**: klien/data yang terpengaruh, durasi downtime.
- **Tindakan korektif**: apa yang diubah supaya tak terulang (kode/config/dokumen/proses) —
  termasuk apakah dokumen ini (`INCIDENT-RESPONSE.md`) atau `docs/DEPLOY.md` perlu diperbarui.
- **Apakah §0 (postur operasional) masih memadai** setelah insiden ini, atau perlu ditinjau ulang
  bersama Ari.

## 5. Referensi
- Deteksi: `.github/workflows/uptime-alert.yml`, `.github/scripts/send-alert-email.py`
- Backup/restore/RTO-RPO: `docs/DEPLOY.md` §6, §7
- Rollback: `docs/DEPLOY.md` §9
- Rotasi kunci: `docs/KEY-ROTATION.md`
- Retensi log: `docs/LOGGING.md`
- Batasan arsitektur (single-box, single-process): `docs/DEPLOY.md` §10
