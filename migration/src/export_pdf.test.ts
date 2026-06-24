/* ============================================================
   P1 — PDF deliverable generator + nol-vendor seal (export_pdf.ts).
   ------------------------------------------------------------
   This module produces a SIGNED audit deliverable. The risk is in its two
   branches: SEALED (embed sealId/pubKeyId/hash + verify-QR) vs degrade-to-
   UNSEALED (server down / role without CAP.EXPORT → still emit the doc + log
   the export to the audit chain). A bug here = a wrong/forged seal on a final
   audit artifact, with no other test guarding it.
   We mock ./api (seal success/throw) and the lazy libs (jspdf/autotable/qrcode)
   so nothing hits the network or the filesystem; crypto.subtle hashing runs for
   real, so contentHash is genuinely the SHA-256 of the canonical payload.
   ============================================================ */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { webcrypto } from 'node:crypto';

// Node webcrypto guard (sha256Hex uses crypto.subtle; present on Node ≥20, belt-and-suspenders here).
if (!(globalThis as { crypto?: { subtle?: unknown } }).crypto?.subtle) {
  (globalThis as { crypto?: unknown }).crypto = webcrypto;
}

const apiMock = vi.hoisted(() => ({
  exportSeal: vi.fn(),
  exportLogEvent: vi.fn(async () => ({ ok: true })),
}));
vi.mock('./api', () => apiMock);

// jsPDF stub — must not touch disk. save() is a no-op spy.
const pdfMock = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock('jspdf', () => {
  class FakeDoc {
    internal = { pageSize: { getWidth: () => 595, getHeight: () => 842 } };
    lastAutoTable = { finalY: 100 };
    setFont() {} setFontSize() {} setTextColor() {} setDrawColor() {}
    text() {} line() {} addPage() {} addImage() {}
    splitTextToSize(s: unknown) { return Array.isArray(s) ? s : [String(s)]; }
    save = pdfMock.save;
  }
  return { jsPDF: FakeDoc };
});
vi.mock('jspdf-autotable', () => ({
  default: (doc: { lastAutoTable?: { finalY: number } }) => {
    doc.lastAutoTable = { finalY: (doc.lastAutoTable?.finalY || 100) + 40 };
  },
}));
vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn(async () => 'data:image/png;base64,QQ==') } }));

const { amsExportPdf } = await import('./export_pdf');

const MODEL = {
  kind: 'materiality-memo',
  scope: 'engagement',
  scopeId: 'ENG-2025-014',
  fileName: 'memo.pdf',
  firm: 'WHR & Rekan',
  title: 'Memo Materialitas',
  refNo: 'WP-A-1',
  meta: ['FY2025', 'Klien: PT Contoh'],
  blocks: [
    { type: 'heading', text: 'Ringkasan' },
    { type: 'para', text: 'Paragraf uji.' },
    { type: 'kv', rows: [['OM', 'Rp 4.260'], ['PM', 'Rp 3.195']] },
    { type: 'table', head: ['A', 'B'], body: [['1', '2']], boldRows: [0] },
    { type: 'signature', signers: [{ label: 'Disusun', name: 'Bagas', role: 'Senior', at: '2026-01-01' }] },
  ],
};

beforeEach(() => {
  apiMock.exportSeal.mockReset();
  apiMock.exportLogEvent.mockClear();
  pdfMock.save.mockClear();
});

describe('amsExportPdf() — SEALED path', () => {
  it('embeds the seal, returns sealed=true, and does NOT double-log', async () => {
    apiMock.exportSeal.mockResolvedValue({ sealId: 'SEAL-1', pubKeyId: 'KEY-A', signedAt: '2026-01-01T00:00:00.000Z' });
    const r = await amsExportPdf(MODEL);
    expect(r.sealed).toBe(true);
    expect(r.sealId).toBe('SEAL-1');
    expect(r.reason).toBe('ok');
    expect(r.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(apiMock.exportSeal).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'materiality-memo', scope: 'engagement', scopeId: 'ENG-2025-014', contentHash: r.contentHash }),
    );
    expect(apiMock.exportLogEvent).not.toHaveBeenCalled();
    expect(pdfMock.save).toHaveBeenCalledTimes(1);
  });
});

describe('amsExportPdf() — degrade to UNSEALED', () => {
  it('server down → reason=unavailable, still logs the export', async () => {
    apiMock.exportSeal.mockRejectedValue(new Error('network down'));
    const r = await amsExportPdf(MODEL);
    expect(r.sealed).toBe(false);
    expect(r.sealId).toBeNull();
    expect(r.reason).toBe('unavailable');
    expect(apiMock.exportLogEvent).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'materiality-memo', format: 'pdf', contentHash: r.contentHash }),
    );
    expect(pdfMock.save).toHaveBeenCalledTimes(1);
  });

  it('role without CAP.EXPORT → reason=forbidden', async () => {
    apiMock.exportSeal.mockRejectedValue({ data: { code: 'FORBIDDEN' } });
    const r = await amsExportPdf(MODEL);
    expect(r.sealed).toBe(false);
    expect(r.reason).toBe('forbidden');
    expect(apiMock.exportLogEvent).toHaveBeenCalledTimes(1);
  });
});

describe('content hash — provenance integrity', () => {
  it('is a stable function of the canonical content (re-export reproduces it)', async () => {
    apiMock.exportSeal.mockResolvedValue({ sealId: 'S', pubKeyId: 'K' });
    const a = await amsExportPdf(MODEL);
    const b = await amsExportPdf(MODEL);
    expect(a.contentHash).toBe(b.contentHash);
  });
  it('changes when the content changes', async () => {
    apiMock.exportSeal.mockResolvedValue({ sealId: 'S', pubKeyId: 'K' });
    const a = await amsExportPdf(MODEL);
    const b = await amsExportPdf({ ...MODEL, title: 'Judul Berbeda' });
    expect(a.contentHash).not.toBe(b.contentHash);
  });
});
