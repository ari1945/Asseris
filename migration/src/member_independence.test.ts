/* ============================================================
   Independensi per-Anggota Tim (SA 220.16–24 · Kode Etik) — mesin murni.
   Memastikan: status per-anggota (bersih/ter-safeguard/ancaman/belum),
   pemblokir & clearance tingkat-perikatan, roster dari SCHEDULE, seed.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import {
  memberIndepStatus, engagementIndependence, rosterForEngagement, seedDeclarations,
  type MemberDeclaration, type EngagementDeclarations, type MemberRef,
} from './member_independence';
import { SCHEDULE } from './data_part1';

const decl = (over: Partial<MemberDeclaration> = {}): MemberDeclaration =>
  ({ threats: {}, safeguards: '', note: '', signed: false, ...over });

describe('memberIndepStatus — klasifikasi per-anggota', () => {
  it('belum ditandatangani → undeclared & memblok', () => {
    const s = memberIndepStatus(decl({ signed: false }));
    expect(s.status).toBe('undeclared');
    expect(s.blocked).toBe(true);
  });
  it('ditandatangani tanpa ancaman → clean, tak memblok', () => {
    const s = memberIndepStatus(decl({ signed: true }));
    expect(s.status).toBe('clean');
    expect(s.blocked).toBe(false);
  });
  it('ancaman + pengaman → safeguarded, tak memblok', () => {
    const s = memberIndepStatus(decl({ signed: true, threats: { familiarity: true }, safeguards: 'rotasi' }));
    expect(s.status).toBe('safeguarded');
    expect(s.blocked).toBe(false);
    expect(s.threats).toEqual(['familiarity']);
  });
  it('ancaman TANPA pengaman → threat, memblok', () => {
    const s = memberIndepStatus(decl({ signed: true, threats: { selfInterest: true }, safeguards: '   ' }));
    expect(s.status).toBe('threat');
    expect(s.blocked).toBe(true);
  });
});

describe('engagementIndependence — roll-up tingkat-perikatan', () => {
  const roster: MemberRef[] = [
    { member: 'A', role: 'Partner' },
    { member: 'B', role: 'Senior' },
    { member: 'C', role: 'Junior' },
  ];

  it('semua bersih → clear, nol pemblokir', () => {
    const decls: EngagementDeclarations = { A: decl({ signed: true }), B: decl({ signed: true }), C: decl({ signed: true }) };
    const e = engagementIndependence(roster, decls);
    expect(e.clear).toBe(true);
    expect(e.blockers).toBe(0);
    expect(e.signed).toBe(3);
  });

  it('satu anggota belum menyatakan → tak clear', () => {
    const decls: EngagementDeclarations = { A: decl({ signed: true }), B: decl({ signed: true }) }; // C hilang → undeclared
    const e = engagementIndependence(roster, decls);
    expect(e.clear).toBe(false);
    expect(e.blockers).toBe(1);
    // pemblokir diurut ke atas
    expect(e.rows[0].member).toBe('C');
    expect(e.rows[0].status).toBe('undeclared');
  });

  it('ancaman tak-tersafeguard → memblok; ter-safeguard → tidak', () => {
    const unsafe: EngagementDeclarations = { A: decl({ signed: true }), B: decl({ signed: true, threats: { intimidation: true } }), C: decl({ signed: true }) };
    expect(engagementIndependence(roster, unsafe).clear).toBe(false);
    const safe: EngagementDeclarations = { ...unsafe, B: decl({ signed: true, threats: { intimidation: true }, safeguards: 'eskalasi ke Partner' }) };
    const e = engagementIndependence(roster, safe);
    expect(e.clear).toBe(true);
    expect(e.withThreat).toBe(1);
  });

  it('roster kosong → clear (tak ada yang perlu dinyatakan)', () => {
    expect(engagementIndependence([], {}).clear).toBe(true);
  });
});

describe('rosterForEngagement & seed — SSOT SCHEDULE', () => {
  it('mengambil anggota unik yang di-staffing ke perikatan', () => {
    const roster = rosterForEngagement(SCHEDULE, 'ENG-2025-014');
    expect(roster.length).toBeGreaterThanOrEqual(4);
    expect(roster.map((r) => r.member)).toContain('Anindya Pramesti');
    // tak ada duplikat
    expect(new Set(roster.map((r) => r.member)).size).toBe(roster.length);
  });

  it('perikatan tak dikenal → roster kosong', () => {
    expect(rosterForEngagement(SCHEDULE, 'ENG-XXXX')).toEqual([]);
  });

  it('seed menandatangani semua & tetap clear (satu Senior ter-safeguard)', () => {
    const roster = rosterForEngagement(SCHEDULE, 'ENG-2025-014');
    const e = engagementIndependence(roster, seedDeclarations(roster));
    expect(e.clear).toBe(true);
    expect(e.signed).toBe(e.total);
    expect(e.withThreat).toBeGreaterThanOrEqual(1); // Senior ter-safeguard
  });
});
