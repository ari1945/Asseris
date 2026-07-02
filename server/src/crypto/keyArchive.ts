// K4 hardening — durable archive of every Ed25519 public key that has ever signed a seal.
// Closes the "rotation breaks old seals" gap: createSeal() calls ensureSigningKeyArchived()
// before every signHash(), so by construction no seal ever references a pubKeyId that isn't
// already durable here. verifySeal() then looks up the seal's OWN pubKeyId (not "today's
// key"), so a rotation never invalidates anything already sealed.
import { prisma } from '../db';
import { getSigner, exportPublicKeyBase64 } from './signing';

/**
 * Ensure the CURRENT active signing key's public half is recorded. Idempotent — pubKeyId is
 * derived from the key material itself, so re-archiving the same key is a no-op upsert.
 * Cheap enough to call on every createSeal() (one indexed upsert), which is what guarantees
 * "no seal without an archived key" without relying on a separate rotation-time manual step.
 */
export async function ensureSigningKeyArchived(): Promise<void> {
  const signer = getSigner();
  const publicKey = exportPublicKeyBase64(signer.publicKey);
  await prisma.signingKey.upsert({
    where: { pubKeyId: signer.pubKeyId },
    create: { pubKeyId: signer.pubKeyId, publicKey },
    update: {}, // key material for a given pubKeyId never changes — nothing to update
  });
}

/** Look up an archived public key (base64 SPKI DER) by its pubKeyId, or null if unknown. */
export async function lookupSigningKey(pubKeyId: string): Promise<string | null> {
  const row = await prisma.signingKey.findUnique({ where: { pubKeyId } });
  return row?.publicKey ?? null;
}
