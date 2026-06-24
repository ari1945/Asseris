/* ============================================================
   P1 — XLSX register generator + nol-vendor seal (export_xlsx.ts).
   ------------------------------------------------------------
   Same signed-deliverable risk as export_pdf, plus two XLSX-specific concerns:
   the "Segel" provenance sheet must carry the right seal/disclaimer rows, and
   safeName() must keep sheet names Excel-legal (≤31 chars, no []:*?/\) and unique.
   We mock ./api (seal success/throw) and 'xlsx' (capture appended sheets + the
   AOA rows; writeFile is a no-op spy so nothing hits disk). crypto.subtle runs
   for real → contentHash is the genuine SHA-256 of the canonical payload.
   ============================================================ */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { webcrypto } from 'node:crypto';

if (!(globalThis as { crypto?: { subtle?: unknown } }).crypto?.subtle) {
  (globalThis as { crypto?: unknown }).crypto = webcrypto;
}

const apiMock = vi.hoisted(() => ({
  exportSeal: vi.fn(),
  exportLogEvent: vi.fn(async () => ({ ok: true })),
}));
vi.mock('./api', () => apiMock);

// Capture every appended sheet (name + the AOA it was built from) and writeFile calls.
const xlsx = vi.hoisted(() => ({
  appended: [] as Array<{ name: string; aoa: unknown[] }>,
  writeFile: vi.fn(),
}));
vi.mock('xlsx', () => {
  const utils = {
    book_new: () => ({ SheetNames: [] as string[], Sheets: {} as Record<string, unknown> }),
    aoa_to_sheet: (aoa: unknown[]) => ({ __aoa: aoa }),
    book_append_sheet: (wb: { SheetNames: string[] }, ws: { __aoa: unknown[] }, name: string) => {
      wb.SheetNames.push(name);
      xlsx.appended.push({ name, aoa: ws.__aoa });
    },
  };
  return { utils, writeFile: xlsx.writeFile };
});

const { amsExportXlsx } = await import('./export_xlsx');

const MODEL = {
  kind: 'wtb-register',
  scope: 'engagement',
  scopeId: 'ENG-2025-014',
  fileName: 'wtb.xlsx',
  firm: 'WHR & Rekan',
  title: 'Register WTB',
  meta: ['FY2025'],
  sheets: [
    { name: 'WTB', heading: 'Neraca Saldo', columns: ['Kode', 'Saldo'], rows: [['1-1200', 'Rp 52.000'], ['1-1210', '(Rp 1.980)']], totals: ['', 'Rp 50.020'] },
  ],
};

const sealSheet = () => xlsx.appended.find(s => s.name === 'Segel');
const flatRows = (aoa: unknown[]) => aoa.map(r => (Array.isArray(r) ? r.join('|') : String(r)));

beforeEach(() => {
  apiMock.exportSeal.mockReset();
  apiMock.exportLogEvent.mockClear();
  xlsx.appended = [];
  xlsx.writeFile.mockClear();
});

describe('amsExportXlsx() — SEALED path', () => {
  it('appends a "Segel" sheet carrying seal id/key/hash and does NOT double-log', async () => {
    apiMock.exportSeal.mockResolvedValue({ sealId: 'SEAL-9', pubKeyId: 'KEY-Z', signedAt: '2026-01-01T00:00:00.000Z' });
    const r = await amsExportXlsx(MODEL);
    expect(r.sealed).toBe(true);
    expect(r.contentHash).toMatch(/^[0-9a-f]{64}$/);

    // data sheet + Segel sheet both appended
    expect(xlsx.appended.map(s => s.name)).toContain('WTB');
    const seg = sealSheet();
    expect(seg).toBeTruthy();
    const rows = flatRows(seg!.aoa);
    expect(rows.some(l => l.includes('TERSEGEL'))).toBe(true);
    expect(rows.some(l => l.startsWith('Seal ID|SEAL-9'))).toBe(true);
    expect(rows.some(l => l.includes(r.contentHash))).toBe(true);
    expect(rows.some(l => l.startsWith('Disclaimer|'))).toBe(true);

    expect(xlsx.writeFile).toHaveBeenCalledTimes(1);
    expect(apiMock.exportLogEvent).not.toHaveBeenCalled();
  });
});

describe('amsExportXlsx() — degrade to UNSEALED', () => {
  it('server down → "TIDAK TERSEGEL", reason=unavailable, logs the export', async () => {
    apiMock.exportSeal.mockRejectedValue(new Error('network down'));
    const r = await amsExportXlsx(MODEL);
    expect(r.sealed).toBe(false);
    expect(r.reason).toBe('unavailable');
    const rows = flatRows(sealSheet()!.aoa);
    expect(rows.some(l => l.includes('TIDAK TERSEGEL'))).toBe(true);
    expect(rows.some(l => l.startsWith('Segel dilewati|'))).toBe(true);
    expect(apiMock.exportLogEvent).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'wtb-register', format: 'xlsx', contentHash: r.contentHash }),
    );
  });

  it('role without CAP.EXPORT → reason=forbidden', async () => {
    apiMock.exportSeal.mockRejectedValue({ shape: { data: { code: 'FORBIDDEN' } } });
    const r = await amsExportXlsx(MODEL);
    expect(r.reason).toBe('forbidden');
  });
});

describe('safeName() — Excel sheet-name hygiene', () => {
  it('sanitizes illegal chars, truncates to 31, and de-duplicates', async () => {
    apiMock.exportSeal.mockResolvedValue({ sealId: 'S', pubKeyId: 'K' });
    await amsExportXlsx({
      ...MODEL,
      sheets: [
        { name: 'Rekon/Bank:2025*?', columns: ['x'], rows: [['1']] },
        { name: 'Rekon/Bank:2025*?', columns: ['x'], rows: [['2']] }, // collides after sanitization
        { name: 'X'.repeat(40), columns: ['x'], rows: [['3']] },       // over 31 chars
      ],
    });
    const dataNames = xlsx.appended.map(s => s.name).filter(n => n !== 'Segel');
    expect(dataNames).toHaveLength(3);
    dataNames.forEach(n => {
      expect(n.length).toBeLessThanOrEqual(31);
      expect(n).not.toMatch(/[[\]:*?/\\]/);
    });
    expect(new Set(dataNames).size).toBe(3); // all unique
  });
});
