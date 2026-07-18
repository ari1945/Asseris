/* ============================================================
   Keberlanjutan Klien (ISQM 1 ¶33–34 / SA 220) — mesin pemicu.
   Memastikan: pemicu turun dari data kanonik, hanya klien aktif,
   keputusan tersimpan ter-merge, urutan (belum-diputuskan & perhatian
   tinggi dulu), dan integrasi seed nyata.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { continuanceFlags, type StoredDecision } from './continuance_engine';
import { CLIENTS, INDEPENDENCE, INVOICES } from './data_part1';

const CLI = [
  { id: 'C-1', name: 'PT Alpha', industry: 'Manufaktur', partner: 'P. Satu', risk: 'High', listed: true, since: 2015, status: 'Active' },
  { id: 'C-2', name: 'PT Beta', industry: 'Jasa', partner: 'P. Dua', risk: 'Low', listed: false, since: 2024, status: 'Active' },
  { id: 'C-3', name: 'PT Gamma', industry: 'Properti', partner: 'P. Tiga', risk: 'Medium', listed: false, since: 2020, status: 'Proposal' },
];
const INDEP = [
  { name: 'P. Satu', rotationClient: 'PT Alpha', tenure: 7, rotationLimit: 5, conflicts: 0, basis: 'PP 20/2015' },
];
const INV = [{ clientId: 'C-1', status: 'Overdue' }];

describe('continuanceFlags — pemicu & ruang lingkup', () => {
  const sum = continuanceFlags(CLI, INDEP, INV, {}, 2026);

  it('hanya klien berstatus Active (proposal dikecualikan — itu domain onboarding)', () => {
    expect(sum.total).toBe(2);
    expect(sum.rows.map((r) => r.clientId).sort()).toEqual(['C-1', 'C-2']);
  });

  it('menghimpun pemicu klien berisiko dari kanon', () => {
    const a = sum.rows.find((r) => r.clientId === 'C-1')!;
    const keys = a.triggers.map((t) => t.key).sort();
    expect(keys).toEqual(['asosiasi', 'fee', 'pie', 'risiko', 'rotasi']);
    expect(a.triggers.find((t) => t.key === 'rotasi')!.severity).toBe('high'); // tenur 7 > batas 5
    expect(a.attention).toBe('Tinggi');
  });

  it('klien bersih → tanpa pemicu, perhatian Rendah', () => {
    const b = sum.rows.find((r) => r.clientId === 'C-2')!;
    expect(b.triggers).toHaveLength(0);
    expect(b.attention).toBe('Rendah');
  });

  it('default keputusan Tertunda bila belum diputuskan', () => {
    expect(sum.rows.every((r) => r.decision === 'Tertunda' && !r.decided)).toBe(true);
    expect(sum.pending).toBe(2);
    expect(sum.decided).toBe(0);
  });
});

describe('continuanceFlags — keputusan tersimpan & urutan', () => {
  const decisions: Record<string, StoredDecision> = {
    'C-2': { decision: 'Lanjut', approver: 'Partner X', date: '2026-01-10' },
  };
  const sum = continuanceFlags(CLI, INDEP, INV, decisions, 2026);

  it('me-merge keputusan tersimpan', () => {
    const b = sum.rows.find((r) => r.clientId === 'C-2')!;
    expect(b.decided).toBe(true);
    expect(b.decision).toBe('Lanjut');
    expect(b.approver).toBe('Partner X');
    expect(sum.decided).toBe(1);
  });

  it('mengurutkan belum-diputuskan & perhatian tinggi lebih dulu', () => {
    expect(sum.rows[0].clientId).toBe('C-1'); // pending + Tinggi
    expect(sum.rows[1].clientId).toBe('C-2'); // sudah diputuskan
  });

  it('menghitung rotationFlags & attentionHigh', () => {
    expect(sum.rotationFlags).toBe(1);
    expect(sum.attentionHigh).toBe(1);
  });
});

describe('pemicu pengalaman tahun lalu (SA 220.A24 / ISQM 1 ¶34)', () => {
  const base = { id: 'C-9', name: 'PT Delta', industry: 'Jasa', partner: 'P. Empat', risk: 'Low', listed: false, since: 2023, status: 'Active' };

  it('opini modifikasian (WDP) → pemicu opiniLY severity high & perhatian Tinggi', () => {
    const sum = continuanceFlags([{ ...base, priorYear: { fy: 'FY2024', opinion: 'WDP', findings: 0 } }], [], [], {}, 2026);
    const r = sum.rows[0];
    const t = r.triggers.find((x) => x.key === 'opiniLY')!;
    expect(t.severity).toBe('high');
    expect(r.attention).toBe('Tinggi');
  });

  it('WTP-EoM (penekanan, SA 706) BUKAN modifikasi → tanpa pemicu opiniLY', () => {
    const sum = continuanceFlags([{ ...base, priorYear: { fy: 'FY2024', opinion: 'WTP-EoM', findings: 0 } }], [], [], {}, 2026);
    expect(sum.rows[0].triggers.some((x) => x.key === 'opiniLY')).toBe(false);
  });

  it('teks penuh "Wajar Tanpa Pengecualian" tidak salah-tandai modifikasi', () => {
    const sum = continuanceFlags([{ ...base, priorYear: { opinion: 'Wajar Tanpa Pengecualian' } }], [], [], {}, 2026);
    expect(sum.rows[0].triggers.some((x) => x.key === 'opiniLY')).toBe(false);
  });

  it('≥2 temuan → temuanLY med; 1 temuan → temuanLY low', () => {
    const two = continuanceFlags([{ ...base, priorYear: { findings: 2, findingsNote: 'X' } }], [], [], {}, 2026);
    expect(two.rows[0].triggers.find((x) => x.key === 'temuanLY')!.severity).toBe('med');
    const one = continuanceFlags([{ ...base, priorYear: { findings: 1 } }], [], [], {}, 2026);
    expect(one.rows[0].triggers.find((x) => x.key === 'temuanLY')!.severity).toBe('low');
  });

  it('perubahan keadaan non-kosong → pemicu perubahan; kosong → tanpa pemicu', () => {
    const chg = continuanceFlags([{ ...base, priorYear: { changed: 'Regulasi baru' } }], [], [], {}, 2026);
    expect(chg.rows[0].triggers.some((x) => x.key === 'perubahan')).toBe(true);
    const none = continuanceFlags([{ ...base, priorYear: { changed: '   ' } }], [], [], {}, 2026);
    expect(none.rows[0].triggers.some((x) => x.key === 'perubahan')).toBe(false);
  });

  it('tanpa priorYear → tanpa pemicu tahun-lalu (fail-safe data lama)', () => {
    const sum = continuanceFlags([base], [], [], {}, 2026);
    expect(sum.rows[0].triggers.some((x) => ['opiniLY', 'temuanLY', 'perubahan'].includes(x.key))).toBe(false);
    expect(sum.rows[0].priorYear).toBeUndefined();
  });

  it('meneruskan priorYear ke row untuk UI', () => {
    const sum = continuanceFlags([{ ...base, priorYear: { fy: 'FY2024', opinion: 'WTP', findings: 1 } }], [], [], {}, 2026);
    expect(sum.rows[0].priorYear).toEqual({ fy: 'FY2024', opinion: 'WTP', findings: 1 });
  });
});

describe('integrasi seed nyata', () => {
  const sum = continuanceFlags(CLIENTS, INDEPENDENCE, INVOICES, {}, 2026);

  it('mencakup hanya klien aktif (C-052 Proposal dikecualikan)', () => {
    expect(sum.rows.some((r) => r.clientId === 'C-052')).toBe(false);
    expect(sum.total).toBeGreaterThanOrEqual(6);
  });

  it('menandai rotasi terlampaui Rudi Gunawan / Graha Properti (tenur 7 > 5)', () => {
    const graha = sum.rows.find((r) => r.client.includes('Graha'))!;
    const rot = graha.triggers.find((t) => t.key === 'rotasi')!;
    expect(rot.severity).toBe('high');
    expect(graha.attention).toBe('Tinggi');
  });

  it('menandai rotasi jatuh tempo Hartono / Sentosa (tenur 5 = 5)', () => {
    const sentosa = sum.rows.find((r) => r.client.includes('Sentosa'))!;
    expect(sentosa.triggers.some((t) => t.key === 'rotasi' && t.severity === 'high')).toBe(true);
  });

  it('menandai opini modifikasian tahun lalu Bumi Hijau (WDP FY2024)', () => {
    const bumi = sum.rows.find((r) => r.client.includes('Bumi Hijau'))!;
    expect(bumi.triggers.some((t) => t.key === 'opiniLY' && t.severity === 'high')).toBe(true);
    expect(bumi.attention).toBe('Tinggi');
  });
});
