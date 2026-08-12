// Key-rotation gap fix (docs/KEY-ROTATION.md) — offline re-encryption pass for APP_ENCRYPTION_KEY.
//
// secretbox.ts supports exactly ONE active key at a time (no versioned/dual-key decrypt — see
// docs/KEY-ROTATION.md for why that's out of scope here). So "rotating" APP_ENCRYPTION_KEY is not
// transparent: every secret encrypted under the OLD key becomes unreadable the moment the server
// boots with only the NEW key. This script closes that gap by decrypting every stored secret with
// the OLD key and re-encrypting it with the NEW key, in place, BEFORE the operator swaps the env
// var and restarts the server.
//
// Stage 6 scope — everything APP_ENCRYPTION_KEY protects is rotated together:
//   (A) TOTP secrets             User.totpSecret / pendingTotpSecret
//   (B) attachment blobs         Attachment.blob (inline only) — AES-GCM AAD-bound to the row
//                                identity via attachmentAad(), recomputed here identically
//   (C) connector tokens         ConnectorToken.secretEnc — AAD-bound to the connector id
//
// Run with the server STOPPED (or read replica quiesced) — this writes every affected row directly.
//   OLD_APP_ENCRYPTION_KEY=<current key> NEW_APP_ENCRYPTION_KEY=<new key> npm run rotate-encryption-key
// Add DRY_RUN=1 to report what would change without writing anything.
import './env';
import { prisma } from './db';
import { readEncryptionKey, decryptSecret, encryptSecret } from './crypto/secretbox';
import { attachmentAad } from './attachments/aad';

const connectorTokenAad = (connectorId: string): string => `conn:v1|${connectorId}`;

async function main(): Promise<void> {
  const oldKey = readEncryptionKey({ APP_ENCRYPTION_KEY: process.env.OLD_APP_ENCRYPTION_KEY } as NodeJS.ProcessEnv);
  const newKey = readEncryptionKey({ APP_ENCRYPTION_KEY: process.env.NEW_APP_ENCRYPTION_KEY } as NodeJS.ProcessEnv);
  if (!oldKey) throw new Error('OLD_APP_ENCRYPTION_KEY tak diset atau tak valid (32 byte, hex/base64).');
  if (!newKey) throw new Error('NEW_APP_ENCRYPTION_KEY tak diset atau tak valid (32 byte, hex/base64).');
  if (oldKey.equals(newKey)) throw new Error('OLD_APP_ENCRYPTION_KEY dan NEW_APP_ENCRYPTION_KEY identik — tak ada yang perlu dirotasi.');
  const dryRun = process.env.DRY_RUN === '1';

  // Decrypt EVERY row with the old key first, and abort the whole run on the first failure —
  // partial rotation (some rows re-encrypted, some still on the old key, with the old key then
  // discarded) is worse than doing nothing: it silently locks out whichever rows land on the
  // wrong side. Fail closed, same posture as prodConfig.ts/secrets.ts.

  // ---- Phase A: TOTP secrets (active + pending) ----
  const users = await prisma.user.findMany({
    where: { OR: [{ totpSecret: { not: null } }, { pendingTotpSecret: { not: null } }] },
    select: { id: true, email: true, totpSecret: true, pendingTotpSecret: true },
  });
  const plain = new Map<string, { active: string | null; pending: string | null }>();
  for (const u of users) {
    const active = u.totpSecret ? decryptSecret(u.totpSecret, oldKey) : null;
    const pending = u.pendingTotpSecret ? decryptSecret(u.pendingTotpSecret, oldKey) : null;
    if ((u.totpSecret && active === null) || (u.pendingTotpSecret && pending === null)) {
      throw new Error(
        `gagal dekripsi secret TOTP user ${u.id} (${u.email}) dengan OLD_APP_ENCRYPTION_KEY — ` +
          'kunci lama salah, atau data sudah ter-korupsi/tamper. Rotasi DIBATALKAN, tak ada baris ditulis.',
      );
    }
    plain.set(u.id, { active, pending });
  }

  // ---- Phase B: attachment blobs (inline storage only) ----
  const attachments = await prisma.attachment.findMany({
    where: { storageKind: 'inline', blob: { not: null } },
    select: { id: true, scope: true, scopeId: true, collection: true, name: true, sha256: true, blob: true },
  });
  const plainBlobs = new Map<string, string | null>();
  for (const a of attachments) {
    const aad = attachmentAad({ id: a.id, scope: a.scope, scopeId: a.scopeId, collection: a.collection, name: a.name, sha256: a.sha256 });
    const plainB64 = a.blob ? decryptSecret(a.blob, oldKey, aad) : null;
    if (a.blob && plainB64 === null) {
      throw new Error(
        `gagal dekripsi blob attachment ${a.id} (${a.name}) dengan OLD_APP_ENCRYPTION_KEY — ` +
          'kunci lama salah, atau data sudah ter-korupsi/tamper. Rotasi DIBATALKAN, tak ada baris ditulis.',
      );
    }
    plainBlobs.set(a.id, plainB64);
  }

  // ---- Phase C: connector tokens ----
  const tokens = await prisma.connectorToken.findMany({ select: { id: true, connectorId: true, secretEnc: true } });
  const plainTokens = new Map<string, string>();
  for (const t of tokens) {
    const plainToken = decryptSecret(t.secretEnc, oldKey, connectorTokenAad(t.connectorId));
    if (plainToken === null) {
      throw new Error(
        `gagal dekripsi token connector ${t.id} (${t.connectorId}) dengan OLD_APP_ENCRYPTION_KEY — ` +
          'kunci lama salah, atau data sudah ter-korupsi/tamper. Rotasi DIBATALKAN, tak ada baris ditulis.',
      );
    }
    plainTokens.set(t.id, plainToken);
  }

  console.log(
    `${users.length} user TOTP + ${attachments.length} attachment blob + ${tokens.length} token connector akan dirotasi ` +
      `(dry-run: ${dryRun ? 'YA — tak ada tulis' : 'tidak'})`,
  );
  if (dryRun) {
    for (const u of users) console.log(`  would re-encrypt TOTP: ${u.id} (${u.email})`);
    for (const a of attachments) console.log(`  would re-encrypt attachment: ${a.id} (${a.name})`);
    for (const t of tokens) console.log(`  would re-encrypt connector token: ${t.id} (${t.connectorId})`);
    return;
  }

  await prisma.$transaction([
    ...users.map((u) => {
      const secrets = plain.get(u.id)!;
      return prisma.user.update({
        where: { id: u.id },
        data: {
          totpSecret: secrets.active ? encryptSecret(secrets.active, newKey) : null,
          pendingTotpSecret: secrets.pending ? encryptSecret(secrets.pending, newKey) : null,
        },
      });
    }),
    ...attachments.map((a) => {
      const aad = attachmentAad({ id: a.id, scope: a.scope, scopeId: a.scopeId, collection: a.collection, name: a.name, sha256: a.sha256 });
      const plainB64 = plainBlobs.get(a.id)!;
      return prisma.attachment.update({
        where: { id: a.id },
        data: { blob: plainB64 ? encryptSecret(plainB64, newKey, aad) : null },
      });
    }),
    ...tokens.map((t) => {
      const plainToken = plainTokens.get(t.id)!;
      return prisma.connectorToken.update({
        where: { id: t.id },
        data: { secretEnc: encryptSecret(plainToken, newKey, connectorTokenAad(t.connectorId)) },
      });
    }),
  ]);
  for (const u of users) console.log(`  re-encrypted TOTP: ${u.id} (${u.email})`);
  for (const a of attachments) console.log(`  re-encrypted attachment: ${a.id} (${a.name})`);
  for (const t of tokens) console.log(`  re-encrypted connector token: ${t.id} (${t.connectorId})`);

  console.log('');
  console.log('✓ Rotasi selesai. LANGKAH SELANJUTNYA (wajib, dalam urutan ini):');
  console.log('  1. Update APP_ENCRYPTION_KEY (.env atau Secrets Manager) ke NEW_APP_ENCRYPTION_KEY.');
  console.log('  2. Restart server SEKARANG — jangan biarkan proses lama (masih pegang OLD key di memori) berjalan lagi.');
  console.log('  3. Verifikasi: satu user login 2FA penuh (TOTP), satu attachment diunduh (blob), satu sinkronisasi connector.');
  console.log('  4. Hapus OLD_APP_ENCRYPTION_KEY dari mana pun ia sempat disimpan untuk menjalankan skrip ini.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('✗ rotate-encryption-key gagal:', e instanceof Error ? e.message : e);
    await prisma.$disconnect();
    process.exit(1);
  });
