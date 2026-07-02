# KEY-ROTATION.md — kebijakan rotasi kunci produksi

> Menutup gap: sebelum ini, `APP_ENCRYPTION_KEY`/`APP_SIGNING_KEY` hanya punya prosedur *generate
> sekali* (`docs/DEPLOY.md` §1, §13) — tak ada kebijakan kapan/bagaimana merotasi. Dokumen ini
> adalah kebijakannya. Skrip pendukung: `deploy/aws-ec2-test/rotate-keys.sh`.

## 0. Batasan arsitektur (baca ini dulu — menentukan apa yang AMAN dirotasi)

`APP_ENCRYPTION_KEY` (`server/src/crypto/secretbox.ts`) hanya punya **satu kunci aktif** di
runtime — tak ada dukungan multi-key/versioned, jadi rotasinya butuh re-encryption pass eksplisit.

- **`APP_ENCRYPTION_KEY`** (AES-256-GCM, TOTP-at-rest): rotasi **AMAN** asalkan dijalankan lewat
  `rotate-keys.sh encryption` — skrip itu mendekripsi setiap `totpSecret` tersimpan dengan kunci
  LAMA lalu meng-enkripsi ulang dengan kunci BARU sebelum kunci lama dibuang. Tanpa langkah
  re-encrypt ini, mengganti env var begitu saja membuat SEMUA 2FA pengguna tak terbaca (server
  gagal decrypt, bukan silent-wrong — GCM auth tag membuatnya tamper-evident).
- **`APP_SIGNING_KEY`** (Ed25519, segel ekspor): rotasi **kini transparan** (K4, 2026-07-02).
  `createSeal()` (`server/src/export/seal.ts`) mengarsipkan kunci publik AKTIF ke tabel
  `SigningKey` sebelum tiap segel ditandatangani (`server/src/crypto/keyArchive.ts`,
  `ensureSigningKeyArchived`) — setiap segel yang pernah dibuat pasti sudah punya kunci
  publiknya terarsip durable SEBELUM baris segel itu ada. `verifySeal()` memverifikasi terhadap
  arsip kunci milik segel itu sendiri (dicari lewat `pubKeyId` yang tersimpan di baris segel),
  BUKAN lagi "kunci proses hari ini". Konsekuensinya: merotasi `APP_SIGNING_KEY` **tidak lagi
  mematahkan segel lama** — tak ada lagi langkah arsip manual yang diperlukan (§4 di bawah sudah
  direvisi).

Implikasi kebijakan: kedua kunci kini boleh mengikuti cadence yang sama secara arsitektural —
`APP_SIGNING_KEY` di §1 tetap tak dijadwalkan rutin bukan karena keterbatasan teknis lagi,
melainkan karena tak ada kebutuhan bisnis untuk merotasinya rutin (beda dengan
`APP_ENCRYPTION_KEY` yang melindungi rahasia hidup/live secrets, bukan artefak historis).

## 1. Cadence

| Kunci | Kalender | Event-driven (selalu, di luar jadwal kalender) |
|---|---|---|
| `APP_ENCRYPTION_KEY` | Tiap 180 hari (6 bulan) | Staf dengan akses `.env`/Secrets Manager keluar/berganti peran · kunci dicurigai bocor (log, laptop hilang, dsb) · insiden keamanan apa pun yang menyentuh host |
| `APP_SIGNING_KEY` | **Tidak dijadwalkan rutin** — tak ada kebutuhan bisnis untuk rotasi rutin (segel lama tetap terverifikasi pasca-K4, jadi ini murni pilihan operasional, bukan lagi keterbatasan teknis) | HANYA bila kunci dicurigai bocor/kompromi. Ini keputusan Partner, bukan operasional rutin. |
| `BACKUP_ENCRYPTION_KEY` | Tiap 180 hari, selaras `APP_ENCRYPTION_KEY` | Sama seperti di atas |
| `POSTGRES_PASSWORD` | Tiap 180 hari | Sama seperti di atas |

`BACKUP_ENCRYPTION_KEY` **tidak** butuh re-encryption pass — ia hanya melindungi dump *ke depan*;
backup lama tetap perlu kunci lama untuk `restore.sh` (arsipkan kunci lama, jangan buang, sampai
retensi 30 hari backup lama itu habis — lihat `docs/DEPLOY.md` §6). `POSTGRES_PASSWORD` rotasi =
ganti password user DB + update `.env`/Secrets Manager, tak ada data yang perlu migrasi.

180 hari adalah default operasional yang wajar untuk KAP skala pilot (bukan angka regulasi) —
sesuaikan bila ada persyaratan klien/kontraktual yang lebih ketat.

## 2. Siapa approve

Rotasi kunci produksi (host yang menyimpan data klien riil) **wajib approval Partner** sebelum
dieksekusi — sejalan dengan gerbang etik/AML dan sign-off berlapis yang sudah ada di aplikasi
(`ethics_gate`, RBAC `FIRM_ADMIN`). Yang menjalankan skrip boleh staf teknis yang dipercaya, tapi
keputusan "rotasi sekarang" bukan keputusan operasional sepihak — terutama untuk `APP_SIGNING_KEY`
(§0) yang punya dampak permanen ke segel lama.

## 3. Prosedur — `APP_ENCRYPTION_KEY`

```bash
# 1. Dry-run dulu — SELALU, laporkan tanpa menulis apa pun.
OLD_APP_ENCRYPTION_KEY=<nilai-saat-ini> sh deploy/aws-ec2-test/rotate-keys.sh encryption --dry-run

# 2. Rotasi sungguhan (re-encrypt tiap totpSecret + generate kunci baru).
OLD_APP_ENCRYPTION_KEY=<nilai-saat-ini> sh deploy/aws-ec2-test/rotate-keys.sh encryption
#    → skrip mencetak kunci baru SEKALI + langkah manual berikutnya.

# 3. Update APP_ENCRYPTION_KEY di .env (atau secret JSON di AWS Secrets Manager, §Secrets Manager
#    di bawah) ke kunci baru dari langkah 2 — SATU baris, sama seperti toggle CADDY_TLS_MODE.

# 4. Restart server SEKARANG — proses lama masih pegang kunci lama di memori.
docker compose -f deploy/aws-ec2-test/docker-compose.deploy.yml --env-file deploy/aws-ec2-test/.env \
  up -d --force-recreate server

# 5. Verifikasi: satu user dengan 2FA login penuh (bukti TOTP terbaca dengan kunci baru).

# 6. Simpan OLD key di tempat aman TERPISAH sampai langkah 4-5 terbukti sukses, baru hapus semua salinannya.
```

Jendela waktu antara langkah 2 (re-encrypt DB) dan langkah 4 (restart server dengan kunci baru):
**jangan biarkan proses server lama menulis `totpSecret` baru** di rentang ini (mis. user lain
sedang enrol 2FA) — nilainya akan ter-enkripsi dengan kunci LAMA yang baru saja dibuang. Untuk
firma pilot skala kecil, jalankan di luar jam kerja atau matikan enrolment 2FA sesaat.

## 4. Prosedur — `APP_SIGNING_KEY`

```bash
sh deploy/aws-ec2-test/rotate-keys.sh signing
# → cetak kunci baru SEKALI + langkah manual berikutnya
```

**Pasca-K4 (2026-07-02):** tidak ada lagi langkah arsip manual kunci lama — `createSeal()` sudah
mengarsipkan kunci publik aktif ke tabel `SigningKey` (DB, ikut ter-backup normal) SEBELUM tiap
segel dibuat, dan `verifySeal()` mencari kunci lewat `pubKeyId` milik segel itu sendiri. Segel yang
dibuat sebelum rotasi tetap `valid:true` setelah restart dengan `APP_SIGNING_KEY` baru — verifikasi
lewat `audit.verify`/tombol "Verifikasi Segel" di app cukup, tak perlu arsip offline terpisah lagi.

## 5. Secrets Manager (bila `SECRETS_PROVIDER=aws-sm`)

Prosedur di atas sama — bedanya langkah "update .env" menjadi: tulis versi BARU dari secret JSON
(`docs/DEPLOY.md` §13) via `aws secretsmanager put-secret-value --secret-id asseris/prod/keys
--secret-string '{...kunci baru...}'`. `server/src/secrets.ts` selalu fetch versi TERKINI (tak ada
`VersionId` pinning) — begitu `put-secret-value` selesai dan server di-restart, kunci baru otomatis
terpakai. AWS Secrets Manager sendiri menyimpan versi lama (`AWSPREVIOUS`) selama beberapa waktu,
tapi itu tidak relevan lagi untuk `APP_SIGNING_KEY` pasca-K4 — arsip kunci publik yang menjamin
segel lama tetap terverifikasi ada di tabel `SigningKey` (DB aplikasi), bukan di Secrets Manager.

## 6. Referensi
- Generate kunci awal: `docs/DEPLOY.md` §1, §13
- Skrip: `deploy/aws-ec2-test/rotate-keys.sh` (orkestrasi) + `server/src/rotateEncryptionKey.ts`
  (re-encryption pass — reuse `encryptSecret`/`decryptSecret` dari `secretbox.ts`, tanpa mengubah
  format penyimpanan)
- Gerbang produksi yang menggerbangi kedua kunci: `server/src/prodConfig.ts` (`assertProdConfig`)
