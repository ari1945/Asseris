# KEY-ROTATION.md — kebijakan rotasi kunci produksi

> Menutup gap: sebelum ini, `APP_ENCRYPTION_KEY`/`APP_SIGNING_KEY` hanya punya prosedur *generate
> sekali* (`docs/DEPLOY.md` §1, §13) — tak ada kebijakan kapan/bagaimana merotasi. Dokumen ini
> adalah kebijakannya. Skrip pendukung: `deploy/aws-ec2-test/rotate-keys.sh`.

## 0. Batasan arsitektur (baca ini dulu — menentukan apa yang AMAN dirotasi)

Kedua kunci hanya punya **satu kunci aktif** di runtime — `server/src/crypto/secretbox.ts` dan
`server/src/crypto/signing.ts` **tidak** punya dukungan multi-key/versioned. Konsekuensinya beda
untuk tiap kunci, dan itu menentukan seberapa sering masing-masing boleh dirotasi:

- **`APP_ENCRYPTION_KEY`** (AES-256-GCM, TOTP-at-rest): rotasi **AMAN** asalkan dijalankan lewat
  `rotate-keys.sh encryption` — skrip itu mendekripsi setiap `totpSecret` tersimpan dengan kunci
  LAMA lalu meng-enkripsi ulang dengan kunci BARU sebelum kunci lama dibuang. Tanpa langkah
  re-encrypt ini, mengganti env var begitu saja membuat SEMUA 2FA pengguna tak terbaca (server
  gagal decrypt, bukan silent-wrong — GCM auth tag membuatnya tamper-evident).
- **`APP_SIGNING_KEY`** (Ed25519, segel ekspor): rotasi **TIDAK transparan**. `verifyHash()`
  (`server/src/crypto/signing.ts`) hanya mengecek terhadap kunci publik proses SAAT INI — tak ada
  cara memberitahunya "segel ini ditandatangani kunci versi sebelumnya, cek dengan kunci itu".
  Merotasi kunci ini membuat **semua segel ekspor yang sudah diterbitkan gagal `audit.verify`**
  begitu server restart dengan kunci baru. Membangun verifikasi bervensi (simpan `pubKeyId` per
  segel + cek terhadap arsip kunci historis) adalah perubahan arsitektur nyata, sengaja **di luar
  cakupan** dokumen/skrip ini (lihat PRD *Deploy Security Hardening*, 2026-07-02, Non-Scope) —
  dicatat sebagai kandidat PRD terpisah bila rotasi rutin ternyata jadi kebutuhan nyata.

Implikasi kebijakan: **kedua kunci TIDAK dirotasi dengan cadence yang sama.**

## 1. Cadence

| Kunci | Kalender | Event-driven (selalu, di luar jadwal kalender) |
|---|---|---|
| `APP_ENCRYPTION_KEY` | Tiap 180 hari (6 bulan) | Staf dengan akses `.env`/Secrets Manager keluar/berganti peran · kunci dicurigai bocor (log, laptop hilang, dsb) · insiden keamanan apa pun yang menyentuh host |
| `APP_SIGNING_KEY` | **Tidak dijadwalkan rutin** — biaya (segel lama tak terverifikasi) melebihi manfaat rutin tanpa dukungan versioned-verify | HANYA bila kunci dicurigai bocor/kompromi. Ini keputusan Partner, bukan operasional rutin. |
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
# → wajib ketik 'ROTATE' untuk konfirmasi (menerima segel lama tak lagi terverifikasi otomatis)
# → cetak kunci baru SEKALI + langkah manual berikutnya
```

**Sebelum menjalankan**: arsipkan kunci LAMA offline (mis. brankas/password manager terpisah dari
host) — itu satu-satunya cara memverifikasi segel lama secara manual di kemudian hari (di luar
tombol `audit.verify` di app, yang hanya cek terhadap kunci aktif). Catat pubKeyId lama (muncul di
log server) berdampingan dengan arsip kunci, supaya ketertelusuran "segel ini dari era kunci mana"
tetap ada meski verifikasi otomatis tidak.

## 5. Secrets Manager (bila `SECRETS_PROVIDER=aws-sm`)

Prosedur di atas sama — bedanya langkah "update .env" menjadi: tulis versi BARU dari secret JSON
(`docs/DEPLOY.md` §13) via `aws secretsmanager put-secret-value --secret-id asseris/prod/keys
--secret-string '{...kunci baru...}'`. `server/src/secrets.ts` selalu fetch versi TERKINI (tak ada
`VersionId` pinning) — begitu `put-secret-value` selesai dan server di-restart, kunci baru otomatis
terpakai. AWS Secrets Manager sendiri menyimpan versi lama (`AWSPREVIOUS`) selama beberapa waktu —
itu BUKAN pengganti arsip manual kunci lama di §4 (rotasi versi tetap mengubah nilai `SecretString`
"current" yang di-fetch aplikasi; `AWSPREVIOUS` adalah jaring pengaman AWS-internal, bukan bagian
alur rotasi Asseris).

## 6. Referensi
- Generate kunci awal: `docs/DEPLOY.md` §1, §13
- Skrip: `deploy/aws-ec2-test/rotate-keys.sh` (orkestrasi) + `server/src/rotateEncryptionKey.ts`
  (re-encryption pass — reuse `encryptSecret`/`decryptSecret` dari `secretbox.ts`, tanpa mengubah
  format penyimpanan)
- Gerbang produksi yang menggerbangi kedua kunci: `server/src/prodConfig.ts` (`assertProdConfig`)
