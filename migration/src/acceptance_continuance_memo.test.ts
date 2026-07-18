/* ============================================================
   Memo Penerimaan & Keberlanjutan — jaring regresi builder murni.
   Mengunci: struktur blok/lembar deterministik (hash segel reprodusibel),
   konten spesifik-jenis (tahun-lalu/pemicu hanya keberlanjutan).
   ============================================================ */
import { describe, it, expect } from 'vitest';
import {
  buildMemoBlocks, buildMemoSheets, memoTitle, memoRefNo, memoMeta,
  type MemoInput,
} from './acceptance_continuance_memo';

const CONT: MemoInput = {
  kind: 'continuance', client: 'PT Bumi Hijau Agrindo', clientId: 'C-031', industry: 'Agribisnis',
  partner: 'Hartono Wijaya, CPA', cycle: '2026', score: 2.85, verdict: 'Tidak Dilanjutkan',
  factors: [
    { k: 'Integritas', w: 20, s: 3, note: 'a' }, { k: 'Tahun lalu', w: 25, s: 2 },
    { k: 'Independensi', w: 20, s: 3 }, { k: 'Kapasitas', w: 15, s: 3 },
    { k: 'Risiko', w: 10, s: 3 }, { k: 'Etika', w: 10, s: 4 },
  ],
  decision: 'Lanjut dengan Syarat', approver: 'Hartono Wijaya, CPA', date: '2026-01-20', approved: true,
  safeguards: 'Pakar penilai + EQR.',
  triggers: [{ label: 'Opini modifikasian tahun lalu', detail: 'WDP', severity: 'high' }],
  priorYear: { fy: 'FY2024', opinion: 'WDP', findings: 2, uncorrected: 1_800_000_000, changed: 'Ekspansi' },
  trail: [{ action: 'Disetujui — Lanjut dengan Syarat', by: 'Hartono Wijaya, CPA', at: '2026-01-20' }],
};

const ACC: MemoInput = {
  kind: 'acceptance', client: 'PT Sari Boga', clientId: 'PROS-02', industry: 'F&B',
  partner: 'Sari Dewanti, CPA', cycle: 'FY2025', score: 3.4, verdict: 'Terima dengan Syarat',
  factors: [{ k: 'Integritas', w: 25, s: 3 }, { k: 'Independensi', w: 20, s: 4 }],
  decision: 'Terima dengan Syarat', approver: 'Sari Dewanti, CPA', date: '2026-02-18', approved: true,
};

describe('judul / refNo / meta per-jenis', () => {
  it('judul & refNo membedakan penerimaan vs keberlanjutan', () => {
    expect(memoTitle(ACC)).toMatch(/PENERIMAAN/);
    expect(memoTitle(CONT)).toMatch(/KEBERLANJUTAN/);
    expect(memoRefNo(ACC)).toBe('No. PROS-02/ACC/2026');
    expect(memoRefNo(CONT)).toBe('No. C-031/CONT/2026');
  });
  it('meta memuat basis standar sesuai jenis', () => {
    expect(memoMeta(ACC).join(' ')).toMatch(/SA 300/);
    expect(memoMeta(CONT).join(' ')).toMatch(/ISQM 1 ¶33–34/);
  });
});

describe('blok PDF', () => {
  it('memuat ringkasan kv, tabel faktor, safeguard, tanda tangan', () => {
    const b = buildMemoBlocks(CONT);
    const types = b.map((x) => x.type);
    expect(types).toContain('kv');
    expect(types).toContain('table');
    expect(types).toContain('signature');
    const factorTable = b.find((x) => x.type === 'table' && (x as { head: string[] }).head.includes('Bobot'));
    expect(factorTable).toBeTruthy();
    expect((factorTable as { body: string[][] }).body).toHaveLength(6);
  });
  it('tahun-lalu & pemicu HANYA untuk keberlanjutan', () => {
    const cont = JSON.stringify(buildMemoBlocks(CONT));
    expect(cont).toMatch(/Pengalaman Tahun Lalu/);
    expect(cont).toMatch(/Pemicu Keberlanjutan/);
    const acc = JSON.stringify(buildMemoBlocks(ACC));
    expect(acc).not.toMatch(/Pengalaman Tahun Lalu/);
    expect(acc).not.toMatch(/Pemicu Keberlanjutan/);
  });
});

describe('lembar XLSX', () => {
  it('keberlanjutan: Ringkasan+Faktor+Tahun Lalu+Pemicu+Jejak', () => {
    const names = buildMemoSheets(CONT).map((s) => s.name);
    expect(names).toEqual(['Ringkasan', 'Faktor', 'Tahun Lalu', 'Pemicu', 'Jejak']);
  });
  it('penerimaan: hanya Ringkasan+Faktor (tanpa sheet keberlanjutan)', () => {
    const names = buildMemoSheets(ACC).map((s) => s.name);
    expect(names).toEqual(['Ringkasan', 'Faktor']);
  });
  it('sheet Faktor punya satu baris per faktor', () => {
    const f = buildMemoSheets(CONT).find((s) => s.name === 'Faktor')!;
    expect(f.rows).toHaveLength(6);
  });
});

describe('determinisme (hash segel reprodusibel)', () => {
  it('input sama → blok & lembar identik', () => {
    expect(JSON.stringify(buildMemoBlocks(CONT))).toBe(JSON.stringify(buildMemoBlocks(CONT)));
    expect(JSON.stringify(buildMemoSheets(CONT))).toBe(JSON.stringify(buildMemoSheets(CONT)));
  });
});
