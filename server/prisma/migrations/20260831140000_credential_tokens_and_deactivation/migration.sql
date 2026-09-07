-- B1/B2 — penonaktifan pengguna + token kredensial sekali-pakai.
--
-- Dua kolom pada "User" untuk offboarding staf (SOFT: baris user tetap ada supaya tanda tangan
-- dan jejak audit yang menyebutnya tetap tertelusur — SA 230 melarang bukti audit hilang hanya
-- karena orangnya keluar), dan satu tabel baru untuk token undangan/reset password.
--
-- Token disimpan sebagai SHA-256, bukan token mentah: pembaca database (backup, dump, operator)
-- karena itu tak dapat mengambil alih akun siapa pun.

-- Penonaktifan pengguna. Null = aktif; nilai = kapan dan oleh siapa dinonaktifkan.
ALTER TABLE "User" ADD COLUMN "deactivatedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "deactivatedBy" TEXT;

-- Token kredensial sekali-pakai (undangan staf baru & lupa-password).
CREATE TABLE "CredentialToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "requestIp" TEXT,

    CONSTRAINT "CredentialToken_pkey" PRIMARY KEY ("id")
);

-- Pencarian token SELALU lewat hash-nya, jadi indeks ini yang dipakai jalur panas — sekaligus
-- menjamin dua token tak pernah berbagi hash.
CREATE UNIQUE INDEX "CredentialToken_tokenHash_key" ON "CredentialToken"("tokenHash");

-- Rate-limit membaca token terakhir milik satu user per keperluan.
CREATE INDEX "CredentialToken_userId_purpose_idx" ON "CredentialToken"("userId", "purpose");

-- Pembersihan token kedaluwarsa memindai kolom ini.
CREATE INDEX "CredentialToken_expiresAt_idx" ON "CredentialToken"("expiresAt");

-- CASCADE (bukan RESTRICT seperti Connector→Firm): token adalah kredensial sementara, bukan bukti
-- audit. Bila suatu saat sebuah User benar-benar dihapus, tokennya HARUS ikut hilang — token
-- menggantung yang menunjuk user tak ada adalah kredensial tanpa pemilik.
ALTER TABLE "CredentialToken" ADD CONSTRAINT "CredentialToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
