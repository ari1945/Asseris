#!/usr/bin/env sh
# Key-rotation orchestrator — see docs/KEY-ROTATION.md for the full policy (cadence, approval,
# what each key protects, why signing can't rotate transparently). This script only
# ORCHESTRATES: generates the new key value, runs the safe re-encryption pass (encryption key
# only, via server/src/rotateEncryptionKey.ts), and prints the exact manual steps left — it does
# NOT touch .env or AWS Secrets Manager for you. That edit stays manual and explicit on purpose,
# same reasoning as the CADDY_TLS_MODE one-line toggle (Caddyfile): an operator should always see
# exactly what changed before it takes effect, not have a script silently rewrite prod secrets.
#
#   sh deploy/aws-ec2-test/rotate-keys.sh encryption --dry-run
#   sh deploy/aws-ec2-test/rotate-keys.sh encryption
#   sh deploy/aws-ec2-test/rotate-keys.sh signing
set -e
KIND="${1:?usage: rotate-keys.sh <encryption|signing> [--dry-run]}"
COMPOSE="docker compose -f deploy/aws-ec2-test/docker-compose.deploy.yml --env-file deploy/aws-ec2-test/.env"

case "$KIND" in
  encryption)
    : "${OLD_APP_ENCRYPTION_KEY:?set OLD_APP_ENCRYPTION_KEY — the CURRENT value, from .env or Secrets Manager}"
    NEW_KEY=$(openssl rand -hex 32)
    echo "New APP_ENCRYPTION_KEY generated (shown once — copy it now):"
    echo "  $NEW_KEY"
    echo ""

    if [ "$2" = "--dry-run" ]; then
      echo "Dry-run: melaporkan apa yang AKAN direnkripsi, tak menulis apa pun."
      $COMPOSE run --rm -e OLD_APP_ENCRYPTION_KEY="$OLD_APP_ENCRYPTION_KEY" -e NEW_APP_ENCRYPTION_KEY="$NEW_KEY" \
        -e DRY_RUN=1 server npm run rotate-encryption-key
      echo "Dry-run selesai — tak ada baris ditulis. Jalankan ulang tanpa --dry-run untuk rotasi sungguhan."
      exit 0
    fi

    echo "Ini akan MENULIS ULANG totpSecret setiap user 2FA di database (re-encrypt in place)."
    printf "Ketik 'ROTATE' untuk lanjut: "
    read -r CONFIRM
    [ "$CONFIRM" = "ROTATE" ] || { echo "Dibatalkan."; exit 1; }

    echo "Re-encrypting setiap totpSecret tersimpan (OLD -> NEW key) ..."
    $COMPOSE run --rm -e OLD_APP_ENCRYPTION_KEY="$OLD_APP_ENCRYPTION_KEY" -e NEW_APP_ENCRYPTION_KEY="$NEW_KEY" \
      server npm run rotate-encryption-key
    echo ""
    echo "Langkah MANUAL berikutnya (WAJIB, urutan ini — lihat docs/KEY-ROTATION.md):"
    echo "  1. Update APP_ENCRYPTION_KEY di .env (atau secret JSON di AWS Secrets Manager) -> $NEW_KEY"
    echo "  2. Restart server SEKARANG: \$COMPOSE up -d --force-recreate server"
    echo "  3. Verifikasi: satu user 2FA login penuh (TOTP terbaca dengan key baru)."
    echo "  4. Simpan OLD_APP_ENCRYPTION_KEY di tempat aman terpisah sampai langkah 2-3 terbukti sukses, lalu hapus semua salinannya."
    ;;

  signing)
    echo "PERINGATAN: APP_SIGNING_KEY TIDAK bisa dirotasi transparan."
    echo "  verifyHash() (server/src/crypto/signing.ts) hanya mengecek terhadap kunci publik PROSES"
    echo "  SAAT INI — tak ada dukungan multi-key/versioned. Merotasi kunci ini membuat SEMUA segel"
    echo "  ekspor lama gagal 'audit.verify' setelah restart. Rotasi hanya untuk kunci DICURIGAI BOCOR"
    echo "  (lihat docs/KEY-ROTATION.md - Rotasi APP_SIGNING_KEY)."
    echo ""
    printf "Ketik 'ROTATE' untuk lanjut dan menerima segel lama tak lagi terverifikasi otomatis: "
    read -r CONFIRM
    [ "$CONFIRM" = "ROTATE" ] || { echo "Dibatalkan."; exit 1; }

    NEW_KEY=$(openssl genpkey -algorithm ed25519 -outform DER | base64 -w0)
    echo ""
    echo "New APP_SIGNING_KEY generated (shown once — copy it now):"
    echo "  $NEW_KEY"
    echo ""
    echo "Langkah MANUAL berikutnya (WAJIB — lihat docs/KEY-ROTATION.md):"
    echo "  1. ARSIPKAN kunci LAMA offline, terpisah dari host — satu-satunya cara memverifikasi segel lama nanti."
    echo "  2. Update APP_SIGNING_KEY di .env (atau Secrets Manager) -> kunci baru di atas."
    echo "  3. Restart server: \$COMPOSE up -d --force-recreate server"
    echo "  4. Catat tanggal rotasi + pubKeyId baru (muncul di log server saat boot) di log rotasi kunci firma."
    ;;

  *)
    echo "usage: rotate-keys.sh <encryption|signing> [--dry-run]"
    exit 1
    ;;
esac
