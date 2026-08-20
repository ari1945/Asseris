/* ============================================================
   PRD `docs/prd-sdm-kepatuhan-deepening.md` · PR-6 · SC-15 · SC-16 · SC-17.

   Tiga cacat yang ditutup:
     (1) `filled` & `applicants` literal — memindahkan kandidat ke "Diterima"
         tak menggerakkan apa pun;
     (2) `doEnroll` menaikkan bilangan bulat ANONIM, sementara kehadiran
         berkunci empId — pendaftaran & kehadiran dua dunia terpisah;
     (3) `COMPETENCY_ACTUAL` cuplikan beku — gap kompetensi mustahil menutup.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AMS } from './data';
import './data_people';
import {
  attendCheck, competencyCoverage, competencyLevel, enrolCheck, enrolmentState,
  normaliseEnrolment, recruitmentSummary, requisitionState,
} from './canon_talent';
import type { AttendanceMap, TalentCandidate, TalentHire, TalentRequisition } from './canon_talent';

const A = AMS as unknown as {
  REQUISITIONS: TalentRequisition[]; CANDIDATES: TalentCandidate[]; ONBOARDING_HIRES: TalentHire[];
  CAND_STAGES: string[]; TRAINING_CATALOG: { id: string; seats: number; comp?: string; skp: number }[];
  TRAINING_ENROLMENT: Record<string, string[]>;
  COMPETENCIES: { id: string }[]; COMPETENCY_REQ: Record<string, Record<string, number>>;
  COMPETENCY_ACTUAL: Record<string, Record<string, number>>;
  STAFF: { id: string; grade?: string }[];
};

/* ------------------------------------------------------------------
   1. SC-15 — penghitung requisition
   ------------------------------------------------------------------ */

/** `filled` literal sebelum PR-6. */
const FILLED_SEBELUM_PR6: Record<string, number> = {
  'REQ-2026-07': 0, 'REQ-2026-06': 2, 'REQ-2026-05': 0, 'REQ-2026-04': 1,
};

describe('SC-15 — `filled` diturunkan dari register, nol-delta', () => {
  it.each(Object.entries(FILLED_SEBELUM_PR6))('%s terisi %i', (id, n) => {
    const r = A.REQUISITIONS.find((x) => x.id === id) as TalentRequisition;
    expect(requisitionState(r, A.CANDIDATES, A.ONBOARDING_HIRES).filled).toBe(n);
  });

  it('`filled` & `applicants` literal DICABUT dari data', () => {
    for (const r of A.REQUISITIONS) {
      expect(r as unknown as Record<string, unknown>).not.toHaveProperty('filled');
      expect(r as unknown as Record<string, unknown>).not.toHaveProperty('applicants');
    }
  });

  it('memindahkan kandidat ke "Diterima" MENAIKKAN terisi', () => {
    const req = A.REQUISITIONS.find((r) => r.id === 'REQ-2026-07') as TalentRequisition;
    const before = requisitionState(req, A.CANDIDATES, A.ONBOARDING_HIRES);
    expect(before.filled).toBe(0);
    const moved = A.CANDIDATES.map((c) => (c.id === 'C-101' ? { ...c, stage: 'Diterima' } : c));
    const after = requisitionState(req, moved, A.ONBOARDING_HIRES);
    expect(after.filled).toBe(1);
    expect(after.remaining).toBe(before.remaining - 1);
  });

  it('onboarding tanpa kandidat tetap terhitung (REQ-2026-04)', () => {
    const req = A.REQUISITIONS.find((r) => r.id === 'REQ-2026-04') as TalentRequisition;
    const st = requisitionState(req, [], A.ONBOARDING_HIRES);
    expect(st.filled).toBe(1);
    expect(st.filledBy).toEqual(['Galuh Wicaksono']);
  });

  it('orang yang sama di kandidat DAN onboarding tak dihitung dua kali', () => {
    const req = A.REQUISITIONS.find((r) => r.id === 'REQ-2026-06') as TalentRequisition;
    const st = requisitionState(req, A.CANDIDATES, A.ONBOARDING_HIRES);
    /* Vina Maharani ada sebagai C-110 (Diterima) DAN NH-01. */
    expect(st.filledBy.filter((n) => n === 'Vina Maharani')).toHaveLength(1);
    expect(st.filled).toBe(2);
  });

  it('lamaran masuk DIPISAH dari kandidat di pipeline', () => {
    const req = A.REQUISITIONS.find((r) => r.id === 'REQ-2026-06') as TalentRequisition;
    const st = requisitionState(req, A.CANDIDATES, A.ONBOARDING_HIRES);
    expect(st.applicantsDeclared).toBe(96);
    /* registernya berisi jauh lebih sedikit — dan itu kini terlihat, bukan disamarkan */
    expect(st.inPipeline).toBeLessThan(st.applicantsDeclared as number);
  });

  it('ringkasan firma menutup ke jumlah baris register', () => {
    const s = recruitmentSummary(A.REQUISITIONS, A.CANDIDATES, A.ONBOARDING_HIRES);
    expect(s.inPipeline).toBe(A.CANDIDATES.length);
    expect(s.filled).toBe(Object.values(FILLED_SEBELUM_PR6).reduce((a, b) => a + b, 0));
    expect(s.offersOutstanding).toBe(A.CANDIDATES.filter((c) => c.stage === 'Penawaran').length);
  });

  it('kelebihan isi ditandai, bukan didiamkan', () => {
    const req: TalentRequisition = { id: 'R-X', count: 1 };
    const cands: TalentCandidate[] = [
      { id: 'a', name: 'A', req: 'R-X', stage: 'Diterima' },
      { id: 'b', name: 'B', req: 'R-X', stage: 'Diterima' },
    ];
    const st = requisitionState(req, cands, []);
    expect(st.overfilled).toBe(true);
    expect(st.remaining).toBe(0);
  });
});

/* ------------------------------------------------------------------
   2. SC-16 — pendaftaran punya nama
   ------------------------------------------------------------------ */

/** `enrolled` literal sebelum PR-6 — kini panjang daftar nama. */
const ENROLLED_SEBELUM_PR6: Record<string, number> = {
  'TR-01': 22, 'TR-02': 18, 'TR-03': 25, 'TR-04': 31, 'TR-05': 9, 'TR-06': 7,
};

describe('SC-16 — pendaftaran berkunci empId', () => {
  it.each(Object.entries(ENROLLED_SEBELUM_PR6))('%s punya %i peserta bernama', (id, n) => {
    expect(A.TRAINING_ENROLMENT[id]).toHaveLength(n);
  });

  it('`enrolled: <angka>` DICABUT dari katalog', () => {
    for (const t of A.TRAINING_CATALOG) {
      expect(t as unknown as Record<string, unknown>).not.toHaveProperty('enrolled');
    }
  });

  it('setiap peserta terdaftar ADA di roster', () => {
    const ids = new Set(A.STAFF.map((s) => s.id));
    for (const [tr, list] of Object.entries(A.TRAINING_ENROLMENT)) {
      for (const emp of list) expect(ids.has(emp), `${tr} → ${emp}`).toBe(true);
    }
  });

  it('tak ada peserta ganda dalam satu pelatihan', () => {
    for (const [tr, list] of Object.entries(A.TRAINING_ENROLMENT)) {
      expect(new Set(list).size, tr).toBe(list.length);
    }
  });

  it('kursi tersisa diturunkan dari daftar nama', () => {
    const t = A.TRAINING_CATALOG.find((x) => x.id === 'TR-03') as { id: string; seats: number };
    const st = enrolmentState(t.id, t.seats, A.TRAINING_ENROLMENT);
    expect(st.enrolled).toHaveLength(25);
    expect(st.seatsLeft).toBe(t.seats - 25);
    expect(st.full).toBe(t.seats <= 25);
  });

  it('bentuk LAMA masih dibaca — jumlahnya dihormati, tetapi tak menjadi nama', () => {
    const legacy = [{ id: 'TR-01', enrolled: 12 }];
    const st = enrolmentState('TR-01', 30, legacy);
    expect(st.enrolled).toEqual([]);
    expect(st.anonymousCount).toBe(12);
    expect(st.seatsLeft).toBe(18);
    expect(normaliseEnrolment(legacy).map).toEqual({});
  });

  it('gerbang pendaftaran menolak: tanpa peserta · di luar roster · ganda · penuh', () => {
    const st = enrolmentState('T', 2, { T: ['EMP-001'] });
    expect(enrolCheck(st, '', true).ok).toBe(false);
    expect(enrolCheck(st, 'EMP-999', false).reason).toMatch(/roster/);
    expect(enrolCheck(st, 'EMP-001', true).reason).toMatch(/sudah terdaftar/);
    expect(enrolCheck(st, 'EMP-002', true).ok).toBe(true);
    const penuh = enrolmentState('T', 1, { T: ['EMP-001'] });
    expect(enrolCheck(penuh, 'EMP-002', true).reason).toMatch(/penuh/);
  });

  it('KEHADIRAN hanya untuk peserta terdaftar — inilah jembatan yang dulu putus', () => {
    const st = enrolmentState('T', 5, { T: ['EMP-001'] });
    expect(attendCheck(st, 'EMP-001').ok).toBe(true);
    const luar = attendCheck(st, 'EMP-002');
    expect(luar.ok).toBe(false);
    expect(luar.reason).toMatch(/terdaftar/);
  });
});

/* ------------------------------------------------------------------
   3. SC-17 — kompetensi yang dapat menutup
   ------------------------------------------------------------------ */

const COMP_ARGS = {
  roster: A.STAFF, competencies: A.COMPETENCIES, required: A.COMPETENCY_REQ,
  actual: A.COMPETENCY_ACTUAL, catalog: A.TRAINING_CATALOG,
};

describe('SC-17 — pelatihan terkonfirmasi menaikkan level', () => {
  it('tanpa kehadiran → level = penilaian dasar (nol-delta)', () => {
    const lv = competencyLevel({
      empId: 'EMP-032', compId: 'CO-03', base: A.COMPETENCY_ACTUAL['EMP-032']['CO-03'],
      required: A.COMPETENCY_REQ.Junior['CO-03'], catalog: A.TRAINING_CATALOG, attendance: {},
    });
    expect(lv.credit).toBe(0);
    expect(lv.level).toBe(lv.base);
  });

  it('menyelesaikan TR-03 (CO-03) MENAIKKAN level & menutup gap', () => {
    const required = A.COMPETENCY_REQ.Junior['CO-03'];
    const base = A.COMPETENCY_ACTUAL['EMP-031']['CO-03'];
    const before = competencyLevel({ empId: 'EMP-031', compId: 'CO-03', base, required, catalog: A.TRAINING_CATALOG, attendance: {} });
    const att: AttendanceMap = { 'TR-03': { 'EMP-031': { confirmed: true } } };
    const after = competencyLevel({ empId: 'EMP-031', compId: 'CO-03', base, required, catalog: A.TRAINING_CATALOG, attendance: att });
    expect(after.level).toBe(before.level + 1);
    expect(after.from).toEqual(['TR-03']);
    expect(after.gap).toBeLessThan(before.gap === 0 ? 1 : before.gap);
  });

  it('pelatihan yang dipetakan ke kompetensi LAIN tak menaikkan', () => {
    const att: AttendanceMap = { 'TR-04': { 'EMP-031': { confirmed: true } } };  // CO-04
    const lv = competencyLevel({ empId: 'EMP-031', compId: 'CO-03', base: 3, required: 3, catalog: A.TRAINING_CATALOG, attendance: att });
    expect(lv.credit).toBe(0);
  });

  it('kehadiran yang BELUM dikonfirmasi tak menaikkan', () => {
    const att: AttendanceMap = { 'TR-03': { 'EMP-031': { confirmed: false } } };
    expect(competencyLevel({ empId: 'EMP-031', compId: 'CO-03', base: 3, required: 4, catalog: A.TRAINING_CATALOG, attendance: att }).credit).toBe(0);
  });

  it('level tak pernah melewati 5', () => {
    const att: AttendanceMap = { 'TR-03': { 'EMP-031': { confirmed: true } } };
    expect(competencyLevel({ empId: 'EMP-031', compId: 'CO-03', base: 5, required: 5, catalog: A.TRAINING_CATALOG, attendance: att }).level).toBe(5);
  });

  it('cakupan firma BERGERAK ketika pelatihan dikonfirmasi — gap dapat menutup', () => {
    const before = competencyCoverage({ ...COMP_ARGS, attendance: {} });
    expect(before.closedByTraining).toBe(0);
    /* konfirmasi TR-03 untuk seluruh roster */
    const att: AttendanceMap = { 'TR-03': Object.fromEntries(A.STAFF.map((s) => [s.id, { confirmed: true }])) };
    const after = competencyCoverage({ ...COMP_ARGS, attendance: att });
    expect(after.gaps).toBeLessThan(before.gaps);
    expect(after.closedByTraining).toBeGreaterThan(0);
    expect(after.coveragePct).toBeGreaterThan(before.coveragePct);
  });

  it('cakupan tanpa sel → 0%, bukan NaN', () => {
    expect(competencyCoverage({ roster: [], competencies: [], required: {}, actual: {}, catalog: [], attendance: {} }).coveragePct).toBe(0);
  });
});

/* ------------------------------------------------------------------
   4. Gerbang cakupan
   ------------------------------------------------------------------ */

const SRC = join(__dirname);
const read = (f: string) => readFileSync(join(SRC, f), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('gerbang cakupan — penghitung & pendaftaran', () => {
  it('view talent masuk lewat canon_talent', () => {
    expect(read('view_pc_talent.tsx')).toMatch(/from '\.\/canon_talent'/);
  });

  it('tak ada lagi pembacaan `r.filled` / `r.applicants` di view', () => {
    const src = read('view_pc_talent.tsx');
    expect(src).not.toMatch(/\br\.filled\b/);
    expect(src).not.toMatch(/\br\.applicants\b/);
  });

  it('pendaftaran anonim (`e.enrolled + 1`) sudah dicabut', () => {
    expect(read('view_pc_talent.tsx')).not.toMatch(/enrolled \+ 1/);
  });

  it('kunci persist pendaftaran berpindah ke v2 — bentuk lama tak ditimpa diam-diam', () => {
    expect(read('view_pc_talent.tsx')).toMatch(/'pc\.enroll\.v2'/);
  });

  it('matriks kompetensi memakai level efektif, bukan cuplikan beku', () => {
    const src = read('view_pc_talent.tsx');
    expect(src).toMatch(/competencyLevel\(/);
    expect(src).not.toMatch(/\(ACT\[s\.id\] \|\| \{\}\)\[cid\] \?\?/);
  });

  it('konfirmasi kehadiran digerbangi pendaftaran, di dalam setter juga', () => {
    const src = read('view_pc_talent.tsx');
    expect(src).toMatch(/attendOk\(/);
    expect(src).toMatch(/if \(!\(a\[trId\] \|\| \{\}\)\[empId\]\?\.confirmed && !attendOk\(trId, empId\)\.ok\) return a;/);
  });
});
