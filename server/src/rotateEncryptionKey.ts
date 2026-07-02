// Key-rotation gap fix (docs/KEY-ROTATION.md) — offline re-encryption pass for APP_ENCRYPTION_KEY.
//
// secretbox.ts supports exactly ONE active key at a time (no versioned/dual-key decrypt — see
// docs/KEY-ROTATION.md for why that's out of scope here). So "rotating" APP_ENCRYPTION_KEY is not
// transparent: every totpSecret already encrypted under the OLD key becomes unreadable the moment
// the server boots with only the NEW key. This script closes that gap by decrypting every stored
// totpSecret with the OLD key and re-encrypting it with the NEW key, in place, BEFORE the operator
// swaps the env var and restarts the server — reusing encryptSecret/decryptSecret exactly as-is
// (both already take an explicit key buffer; no changes to secretbox.ts needed).
//
// Run with the server STOPPED (or read replica quiesced) — this writes every affected row directly.
//   OLD_APP_ENCRYPTION_KEY=<current key> NEW_APP_ENCRYPTION_KEY=<new key> npm run rotate-encryption-key
// Add DRY_RUN=1 to report what would change without writing anything.
import './env';
import { prisma } from './db';
import { readEncryptionKey, decryptSecret, encryptSecret } from './crypto/secretbox';

async function main(): Promise<void> {
  const oldKey = readEncryptionKey({ APP_ENCRYPTION_KEY: process.env.OLD_APP_ENCRYPTION_KEY } as NodeJS.ProcessEnv);
  const newKey = readEncryptionKey({ APP_ENCRYPTION_KEY: process.env.NEW_APP_ENCRYPTION_KEY } as NodeJS.ProcessEnv);
  if (!oldKey) throw new Error('OLD_APP_ENCRYPTION_KEY tak diset atau tak valid (32 byte, hex/base64).');
  if (!newKey) throw new Error('NEW_APP_ENCRYPTION_KEY tak diset atau tak valid (32 byte, hex/base64).');
  if (oldKey.equals(newKey)) throw new Error('OLD_APP_ENCRYPTION_KEY dan NEW_APP_ENCRYPTION_KEY identik — tak ada yang perlu dirotasi.');
  const dryRun = process.env.DRY_RUN === '1';

  const users = await prisma.user.findMany({
    where: { totpSecret: { not: null } },
    select: { id: true, email: true, totpSecret: true },
  });

  // Decrypt EVERY row with the old key first, and abort the whole run on the first failure —
  // partial rotation (some rows re-encrypted, some still on the old key, with the old key then
  // discarded) is worse than doing nothing: it silently locks out whichever users land on the
  // wrong side. Fail closed, same posture as prodConfig.ts/secrets.ts.
  const plain = new Map<string, string>();
  for (const u of users) {
    const decrypted = decryptSecret(u.totpSecret as string, oldKey);
    if (decrypted === null) {
      throw new Error(
        `gagal dekripsi totpSecret user ${u.id} (${u.email}) dengan OLD_APP_ENCRYPTION_KEY — ` +
          'kunci lama salah, atau data sudah ter-korupsi/tamper. Rotasi DIBATALKAN, tak ada baris ditulis.'
      );
    }
    plain.set(u.id, decrypted);
  }

  console.log(`${users.length} totpSecret akan dirotasi (dry-run: ${dryRun ? 'YA — tak ada tulis' : 'tidak'})`);
  if (dryRun) {
    for (const u of users) console.log(`  would re-encrypt: ${u.id} (${u.email})`);
    return;
  }

  for (const u of users) {
    const reencrypted = encryptSecret(plain.get(u.id) as string, newKey);
    await prisma.user.update({ where: { id: u.id }, data: { totpSecret: reencrypted } });
    console.log(`  re-encrypted: ${u.id} (${u.email})`);
  }

  console.log('');
  console.log('✓ Rotasi selesai. LANGKAH SELANJUTNYA (wajib, dalam urutan ini):');
  console.log('  1. Update APP_ENCRYPTION_KEY (.env atau Secrets Manager) ke NEW_APP_ENCRYPTION_KEY.');
  console.log('  2. Restart server SEKARANG — jangan biarkan proses lama (masih pegang OLD key di memori) berjalan lagi.');
  console.log('  3. Verifikasi: satu user dengan 2FA login penuh (TOTP terbaca dengan key baru).');
  console.log('  4. Hapus OLD_APP_ENCRYPTION_KEY dari mana pun ia sempat disimpan untuk menjalankan skrip ini.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('✗ rotate-encryption-key gagal:', e instanceof Error ? e.message : e);
    await prisma.$disconnect();
    process.exit(1);
  });
