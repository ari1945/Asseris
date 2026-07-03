import { describe, it, expect } from 'vitest';
import { prisma } from '../db';
import { appendAudit, verifyAuditChain } from '../audit/log';
import { exportAuditLogJsonl } from '../audit/export';

// K5 — off-box append-only export. The chain is GLOBAL across the test DB (shared with every
// other suite, fileParallelism:false), so assertions here are relative (row counts/seq ranges
// around appends WE make), same discipline as audit.test.ts.

describe('exportAuditLogJsonl', () => {
  it('exports rows since a given seq as JSONL that round-trips to the same data', async () => {
    const before = await prisma.auditLog.findFirst({ orderBy: { seq: 'desc' } });
    const sinceSeq = before?.seq ?? 0;

    await appendAudit({ actorUserId: 'AX-1', actorRole: 'Engagement Partner', action: 'STATE_SET', scope: 'firm', key: 'export-k1', detail: 'v0->v1' });
    await appendAudit({ actorUserId: 'AX-1', actorRole: 'Engagement Partner', action: 'STATE_SET', scope: 'firm', key: 'export-k2', detail: 'v0->v1' });

    const result = await exportAuditLogJsonl(sinceSeq);
    expect(result.count).toBe(2);
    expect(result.fromSeq).toBe(sinceSeq + 1);
    expect(result.toSeq).toBe(sinceSeq + 2);

    const lines = result.jsonl.split('\n').map((l) => JSON.parse(l));
    expect(lines).toHaveLength(2);
    expect(lines[0].key).toBe('export-k1');
    expect(lines[1].key).toBe('export-k2');
    // Every exported row must carry the fields verifyAuditChain needs to replay/re-check it.
    for (const l of lines) {
      expect(l).toHaveProperty('seq');
      expect(l).toHaveProperty('hash');
      expect(l).toHaveProperty('prevHash');
    }
  });

  it('sinceSeq at the current tail exports zero rows (idempotent incremental run)', async () => {
    const tail = await prisma.auditLog.findFirst({ orderBy: { seq: 'desc' } });
    const result = await exportAuditLogJsonl(tail!.seq);
    expect(result.count).toBe(0);
    expect(result.jsonl).toBe('');
    expect(result.fromSeq).toBeNull();
    expect(result.toSeq).toBeNull();
  });

  it('refuses to export when the chain is broken (never ships silently-tampered data)', async () => {
    await appendAudit({ actorUserId: 'AX-1', actorRole: 'Engagement Partner', action: 'STATE_SET', scope: 'firm', key: 'export-tamper', detail: 'x' });
    const target = await prisma.auditLog.findFirst({ where: { key: 'export-tamper' }, orderBy: { seq: 'desc' } });
    const original = target!.detail;

    await prisma.auditLog.update({ where: { id: target!.id }, data: { detail: 'FORGED' } });
    expect((await verifyAuditChain()).ok).toBe(false);
    await expect(exportAuditLogJsonl(0)).rejects.toThrow(/chain broken/);

    // Restore so the global chain stays valid for other suites.
    await prisma.auditLog.update({ where: { id: target!.id }, data: { detail: original } });
    expect((await verifyAuditChain()).ok).toBe(true);
  });
});
