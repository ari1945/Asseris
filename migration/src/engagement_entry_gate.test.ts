/* ============================================================
   Gerbang Masuk Perikatan (SA 210/220 · ISQM 1) — jaring regresi.
   Mengunci semantik prasyarat Perencanaan→Eksekusi (M1) sebelum
   di-wire ke engagementGate (M4). Pure → fit harness node.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { engagementEntryGate, engagementEntryContext } from './engagement_entry_gate';

const SIGNED = { status: 'signed', version: 1, scope: 'Audit LK FY2025', esign: [] };
const DRAFT = { status: 'draft', version: 0, scope: '', esign: [] };

describe('engagementEntryGate — prasyarat masuk Eksekusi', () => {
  it('klien baru: akseptasi disetujui + surat signed → ok, 0 blocker', () => {
    const g = engagementEntryGate({
      clientKind: 'Klien Baru',
      acceptanceRef: { approved: true, decision: 'Terima', approver: 'Rudi Gunawan, CPA', date: '2026-02-18' },
      engagementLetter: SIGNED,
    });
    expect(g.ok).toBe(true);
    expect(g.allMet).toBe(true);
    expect(g.blockers).toHaveLength(0);
    expect(g.criteria.map((c) => c.key)).toEqual(['accepted', 'letterSigned']);
  });

  it('"Terima dengan Syarat" tetap GO (akseptasi bersyarat = diterima)', () => {
    const g = engagementEntryGate({
      clientKind: 'Klien Baru',
      acceptanceRef: { approved: true, decision: 'Terima dengan Syarat' },
      engagementLetter: SIGNED,
    });
    expect(g.ok).toBe(true);
  });

  it('akseptasi ok tapi surat masih draft → blokir (letterSigned)', () => {
    const g = engagementEntryGate({
      clientKind: 'Klien Baru',
      acceptanceRef: { approved: true, decision: 'Terima' },
      engagementLetter: DRAFT,
    });
    expect(g.ok).toBe(false);
    expect(g.blockers.map((b) => b.key)).toEqual(['letterSigned']);
  });

  it('surat "sent" (belum signed) → blokir', () => {
    const g = engagementEntryGate({
      acceptanceRef: { approved: true, decision: 'Terima' },
      engagementLetter: { status: 'sent', esign: [] },
    });
    expect(g.ok).toBe(false);
    expect(g.blockers.map((b) => b.key)).toEqual(['letterSigned']);
  });

  it('akseptasi pending (approved:false) + surat signed → blokir (accepted)', () => {
    const g = engagementEntryGate({
      clientKind: 'Klien Baru',
      acceptanceRef: { approved: false, decision: '' },
      engagementLetter: SIGNED,
    });
    expect(g.ok).toBe(false);
    expect(g.blockers.map((b) => b.key)).toEqual(['accepted']);
  });

  it('keberlanjutan "Lanjut" + signed → ok; label & view = continuance', () => {
    const g = engagementEntryGate({
      clientKind: 'Keberlanjutan',
      acceptanceRef: { decision: 'Lanjut' },
      engagementLetter: SIGNED,
    });
    expect(g.ok).toBe(true);
    const acc = g.criteria.find((c) => c.key === 'accepted');
    expect(acc?.view).toBe('continuance');
    expect(acc?.label).toContain('keberlanjutan');
  });

  it('keberlanjutan "Lanjut dengan Syarat" → GO', () => {
    const g = engagementEntryGate({
      clientKind: 'Keberlanjutan',
      acceptanceRef: { decision: 'Lanjut dengan Syarat' },
      engagementLetter: SIGNED,
    });
    expect(g.criteria.find((c) => c.key === 'accepted')?.met).toBe(true);
  });

  it('jebakan substring: "Tidak Dilanjutkan" → NO-GO (bukan cocok "lanjut")', () => {
    const g = engagementEntryGate({
      clientKind: 'Keberlanjutan',
      acceptanceRef: { decision: 'Tidak Dilanjutkan' },
      engagementLetter: SIGNED,
    });
    expect(g.ok).toBe(false);
    expect(g.blockers.map((b) => b.key)).toEqual(['accepted']);
  });

  it('keberlanjutan "Tertunda" → NO-GO', () => {
    const g = engagementEntryGate({
      clientKind: 'Keberlanjutan',
      acceptanceRef: { decision: 'Tertunda' },
      engagementLetter: SIGNED,
    });
    expect(g.criteria.find((c) => c.key === 'accepted')?.met).toBe(false);
  });

  it('data kontradiktif: approved:true tapi decision "Tidak Dilanjutkan" → fail-safe NO-GO', () => {
    const g = engagementEntryGate({
      acceptanceRef: { approved: true, decision: 'Tidak Dilanjutkan' },
      engagementLetter: SIGNED,
    });
    expect(g.criteria.find((c) => c.key === 'accepted')?.met).toBe(false);
  });

  it('FAIL-SAFE: konteks undefined → 2 blocker, tanpa throw', () => {
    const g = engagementEntryGate(undefined);
    expect(g.ok).toBe(false);
    expect(g.blockers.map((b) => b.key)).toEqual(['accepted', 'letterSigned']);
  });

  it('FAIL-SAFE: engagement legacy tanpa field warisan → "Pra-akseptasi"', () => {
    const g = engagementEntryGate({ clientKind: 'Klien Baru' });
    expect(g.ok).toBe(false);
    expect(g.criteria.find((c) => c.key === 'accepted')?.detail).toContain('Pra-akseptasi');
    expect(g.blockers).toHaveLength(2);
  });

  it('detail akseptasi memuat putusan·approver·tanggal saat tersedia', () => {
    const g = engagementEntryGate({
      acceptanceRef: { approved: true, decision: 'Terima', approver: 'Sari Dewanti, CPA', date: '2026-02-20' },
      engagementLetter: SIGNED,
    });
    const acc = g.criteria.find((c) => c.key === 'accepted');
    expect(acc?.detail).toContain('Sari Dewanti, CPA');
    expect(acc?.detail).toContain('2026-02-20');
  });
});

describe('engagementEntryContext — seam engagement→gerbang (M2)', () => {
  it('engagement dengan warisan lengkap → gerbang ok', () => {
    const eng = {
      id: 'ENG-2025-099', clientKind: 'Klien Baru' as const,
      acceptanceRef: { approved: true, decision: 'Terima' },
      engagementLetter: { status: 'signed', esign: [] },
    };
    expect(engagementEntryGate(engagementEntryContext(eng)).ok).toBe(true);
  });

  it('FAIL-SAFE: engagement legacy/seed (tanpa field warisan) → Pra-akseptasi, tanpa throw', () => {
    const legacy = { id: 'ENG-2025-014', clientId: 'CLI-01', phase: 'Eksekusi' };
    const g = engagementEntryGate(engagementEntryContext(legacy));
    expect(g.ok).toBe(false);
    expect(g.blockers).toHaveLength(2);
  });

  it('default Pra-akseptasi addEngagement (letter status "none") → blokir keduanya', () => {
    const fresh = { clientKind: 'Klien Baru' as const, originProspectId: null, acceptanceRef: null,
      engagementLetter: { status: 'none', version: 0, esign: [] } };
    const g = engagementEntryGate(engagementEntryContext(fresh));
    expect(g.blockers.map((b) => b.key)).toEqual(['accepted', 'letterSigned']);
  });

  it('null/undefined → konteks aman (tanpa throw)', () => {
    expect(engagementEntryGate(engagementEntryContext(null)).ok).toBe(false);
    expect(engagementEntryGate(engagementEntryContext(undefined)).blockers).toHaveLength(2);
  });
});
