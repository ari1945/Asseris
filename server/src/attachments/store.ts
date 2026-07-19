// F0.1 (PRD 2026-07-19) — attachment data operations. Pure persistence + integrity + quota logic;
// access control (engagement isolation, RBAC) and the AuditLog append stay in router.ts alongside
// the other write paths (mirrors how submitLeaveRequest / runBankSync are structured).
import { createHash } from 'node:crypto';
import { prisma } from '../db';
import { writeBlob, readBlob } from './blobStore';

// PRD §11 Q2 (approved as recommended): 10 MB/file, 50 MB/engagement. Enforced against the DECODED
// byte length the server measures, never the client-claimed size. Firm/user scopes use the same
// per-file cap; the aggregate cap applies to engagement scope (where evidence accumulates).
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_SCOPE_BYTES = 50 * 1024 * 1024;

// Allow-list mirrors the client EV_ALLOW (evidence.tsx) — audit-relevant document/image types.
export const ALLOWED_EXT = ['pdf', 'xlsx', 'xls', 'docx', 'doc', 'csv', 'png', 'jpg', 'jpeg', 'txt'];

export type AttachmentMeta = {
  id: string;
  scope: string;
  scopeId: string;
  collection: string;
  refId: string | null;
  name: string;
  mime: string | null;
  size: number;
  sha256: string;
  retentionClass: string | null;
  uploadedBy: string | null;
  createdAt: Date;
};

export class AttachmentError extends Error {
  constructor(
    public reason: 'too-big' | 'quota' | 'bad-type' | 'checksum' | 'not-found' | 'empty',
    message: string,
  ) {
    super(message);
  }
}

const META_SELECT = {
  id: true, scope: true, scopeId: true, collection: true, refId: true, name: true,
  mime: true, size: true, sha256: true, retentionClass: true, uploadedBy: true, createdAt: true,
} as const;

function extOf(name: string): string {
  return (name.split('.').pop() || '').toLowerCase();
}

/** Sum of live (non-deleted) attachment bytes already stored for a scope target — the quota base. */
export async function scopeUsage(scope: string, scopeId: string): Promise<number> {
  const rows = await prisma.attachment.findMany({
    where: { scope, scopeId, deletedAt: null },
    select: { size: true },
  });
  return rows.reduce((sum, r) => sum + r.size, 0);
}

export type CreateInput = {
  scope: string;
  scopeId: string;
  collection: string;
  refId?: string | null;
  name: string;
  mime?: string | null;
  sha256: string; // client-computed; re-verified here
  retentionClass?: string | null;
  bytes: Buffer;
  uploadedBy: string | null;
};

/** Validate (type, size, quota, checksum), encrypt, and persist a new attachment. Returns metadata
 *  only (never the bytes). Throws AttachmentError on any rejection so the router maps it to a tRPC
 *  code. Does NOT append audit — the router does, after this resolves. */
export async function createAttachment(input: CreateInput): Promise<AttachmentMeta> {
  const size = input.bytes.length;
  if (size === 0) throw new AttachmentError('empty', 'berkas kosong');
  if (extOf(input.name) && !ALLOWED_EXT.includes(extOf(input.name))) {
    throw new AttachmentError('bad-type', `jenis berkas tak diizinkan: .${extOf(input.name)}`);
  }
  if (size > MAX_FILE_BYTES) {
    throw new AttachmentError('too-big', `berkas ${(size / 1048576).toFixed(1)} MB > batas ${MAX_FILE_BYTES / 1048576} MB`);
  }
  // Integrity: recompute SHA-256 from the actual bytes and require the client's claim to match.
  // A mismatch means the bytes and the claimed hash disagree — reject rather than store a lie.
  const actual = createHash('sha256').update(input.bytes).digest('hex');
  if (actual.toLowerCase() !== input.sha256.toLowerCase()) {
    throw new AttachmentError('checksum', 'checksum tak cocok dengan isi berkas');
  }
  // Aggregate quota (engagement scope is where this bites; firm/user rarely approach it but the
  // same guard applies uniformly).
  const used = await scopeUsage(input.scope, input.scopeId);
  if (used + size > MAX_SCOPE_BYTES) {
    throw new AttachmentError('quota', `kuota lampiran ${MAX_SCOPE_BYTES / 1048576} MB terlampaui untuk ${input.scope}`);
  }
  const stored = writeBlob(input.bytes);
  const row = await prisma.attachment.create({
    data: {
      scope: input.scope, scopeId: input.scopeId, collection: input.collection, refId: input.refId ?? null,
      name: input.name, mime: input.mime ?? null, size, sha256: actual,
      retentionClass: input.retentionClass ?? null,
      storageKind: stored.storageKind, blob: stored.blob, uploadedBy: input.uploadedBy,
    },
    select: META_SELECT,
  });
  return row;
}

/** Live attachment metadata for a scope target, optionally filtered to a collection / refId. */
export async function listAttachments(
  scope: string, scopeId: string, collection?: string, refId?: string,
): Promise<AttachmentMeta[]> {
  return prisma.attachment.findMany({
    where: {
      scope, scopeId, deletedAt: null,
      ...(collection ? { collection } : {}),
      ...(refId ? { refId } : {}),
    },
    select: META_SELECT,
    orderBy: { createdAt: 'desc' },
  });
}

/** Fetch one live attachment's metadata (no bytes), or null if missing/deleted. */
export async function getMeta(id: string): Promise<AttachmentMeta | null> {
  const row = await prisma.attachment.findFirst({ where: { id, deletedAt: null }, select: META_SELECT });
  return row ?? null;
}

/** Decode the raw bytes of a live attachment for download, or null if missing/deleted/undecodable. */
export async function readBytes(id: string): Promise<{ meta: AttachmentMeta; bytes: Buffer } | null> {
  const row = await prisma.attachment.findFirst({
    where: { id, deletedAt: null },
    select: { ...META_SELECT, storageKind: true, blob: true },
  });
  if (!row) return null;
  const bytes = readBlob(row);
  if (!bytes) return null;
  const { storageKind: _sk, blob: _b, ...meta } = row;
  return { meta, bytes };
}

/** Soft-delete: mark deletedAt/deletedBy and drop the inline bytes (free the space) while keeping the
 *  row for the audit trail. Idempotent-ish: returns the row's scope info for the caller's audit, or
 *  null if it was already gone. */
export async function softRemove(id: string, deletedBy: string | null): Promise<AttachmentMeta | null> {
  const row = await prisma.attachment.findFirst({ where: { id, deletedAt: null }, select: META_SELECT });
  if (!row) return null;
  await prisma.attachment.update({
    where: { id },
    data: { deletedAt: new Date(), deletedBy, blob: null },
  });
  return row;
}
