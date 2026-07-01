import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { User } from '@prisma/client';
import { appRouter } from '../router';
import { createCallerFactory } from '../trpc';
import { prisma } from '../db';
import { amsShortName, deriveReviewNoteTasks, deriveWpAssignmentTasks, deriveDeadlineTasks } from '../taskAgg';

/* 2026-07-01 — PRD "Restrukturisasi Navigasi & Beranda Berbasis Peran", Fase 4.
   tasks.mine aggregates a user's open review notes across EVERY engagement they may
   access. These tests pin the security property (cross-engagement aggregation must not
   widen read access) the same way personal_scope + engagement_isolation do — the
   negative case (a non-member never receives another engagement's tasks) is the point,
   not just "the feature returns rows". */

function callerAs(role: string, id: string, name: string, email: string) {
  const user = { id, role, name, email } as unknown as User;
  return createCallerFactory(appRouter)({ user, token: 'test' });
}

const FIRM = 'TAG-FIRM';
const CLIENT_A = 'TAG-CLIENT-A';
const CLIENT_B = 'TAG-CLIENT-B';
const ENG_A = 'TAG-ENG-A'; // Dimas + Fajar are members
const ENG_B = 'TAG-ENG-B'; // ONLY Dimas is a member

// Short names must match what deriveReviewNoteTasks filters on (amsShortName of the session name).
const DIMAS = { id: 'TAG-dimas', name: 'Dimas Raharjo', email: 'tag.dimas@test.local', short: 'Dimas R.' };
const FAJAR = { id: 'TAG-fajar', name: 'Fajar Nugroho', email: 'tag.fajar@test.local', short: 'Fajar N.' };
const PARTNER = { id: 'TAG-partner', name: 'Hartono Wijaya', email: 'tag.partner@test.local', short: 'Hartono W.' };

// A note in ENG_B addressed to Dimas — the isolation tripwire: Fajar (not a member of
// ENG_B) must never receive it; Dimas (member) must.
const NOTE_B_DIMAS = { id: 'RN-B1', engagementId: ENG_B, module: 'wtb', text: 'Tugas rahasia ENG-B untuk Dimas', author: 'Hartono Wijaya', to: 'Dimas R.', status: 'open', priority: 'high', raised: '2026-03-09', due: '2026-03-12' };

beforeAll(async () => {
  await prisma.firm.create({ data: { id: FIRM, name: 'Task Agg Firm', short: 'TAG' } });
  await prisma.client.create({ data: { id: CLIENT_A, firmId: FIRM, name: 'PT Klien A' } });
  await prisma.client.create({ data: { id: CLIENT_B, firmId: FIRM, name: 'PT Klien B' } });
  await prisma.engagement.create({ data: { id: ENG_A, firmId: FIRM, clientId: CLIENT_A } });
  await prisma.engagement.create({ data: { id: ENG_B, firmId: FIRM, clientId: CLIENT_B } });

  await prisma.user.create({ data: { id: DIMAS.id, firmId: FIRM, name: DIMAS.name, role: 'Senior Auditor', email: DIMAS.email, dataJson: '{}' } });
  await prisma.user.create({ data: { id: FAJAR.id, firmId: FIRM, name: FAJAR.name, role: 'Junior Auditor', email: FAJAR.email, dataJson: '{}' } });
  await prisma.user.create({ data: { id: PARTNER.id, firmId: FIRM, name: PARTNER.name, role: 'Engagement Partner', email: PARTNER.email, dataJson: '{}' } });

  // Memberships: Dimas ∈ {A, B}; Fajar ∈ {A}. Partner has ENGAGEMENT_VIEW_ALL (no rows needed).
  await prisma.engagementMember.create({ data: { engagementId: ENG_A, userId: DIMAS.id } });
  await prisma.engagementMember.create({ data: { engagementId: ENG_B, userId: DIMAS.id } });
  await prisma.engagementMember.create({ data: { engagementId: ENG_A, userId: FAJAR.id } });

  // ENG_A review notes: one to Dimas (open), one to Fajar (open), one to Dimas but resolved.
  await prisma.stateDoc.create({
    data: {
      scope: 'engagement', scopeId: ENG_A, key: 'reviewNotes', version: 1, updatedBy: DIMAS.id,
      valueJson: JSON.stringify([
        { id: 'RN-A1', engagementId: ENG_A, module: 'wtb', text: 'Untuk Dimas di ENG-A', author: 'Hartono Wijaya', to: 'Dimas R.', status: 'open', priority: 'high' },
        { id: 'RN-A2', engagementId: ENG_A, module: 'icfr', text: 'Untuk Fajar di ENG-A', author: 'Hartono Wijaya', to: 'Fajar N.', status: 'open', priority: 'low' },
        { id: 'RN-A3', engagementId: ENG_A, module: 'aje', text: 'Sudah selesai (Dimas)', author: 'Hartono Wijaya', to: 'Dimas R.', status: 'resolved', priority: 'medium' },
      ]),
    },
  });
  // ENG_B review notes: one to Dimas (the isolation tripwire).
  await prisma.stateDoc.create({
    data: {
      scope: 'engagement', scopeId: ENG_B, key: 'reviewNotes', version: 1, updatedBy: DIMAS.id,
      valueJson: JSON.stringify([NOTE_B_DIMAS]),
    },
  });
});

afterAll(async () => {
  await prisma.stateDoc.deleteMany({ where: { scopeId: { in: [ENG_A, ENG_B] } } });
  await prisma.engagementMember.deleteMany({ where: { engagementId: { in: [ENG_A, ENG_B] } } });
  await prisma.user.deleteMany({ where: { firmId: FIRM } });
  await prisma.engagement.deleteMany({ where: { firmId: FIRM } });
  await prisma.client.deleteMany({ where: { firmId: FIRM } });
  await prisma.firm.deleteMany({ where: { id: FIRM } });
  await prisma.$disconnect();
});

describe('amsShortName — normalisasi nama sesi penuh → bentuk singkat data kerja', () => {
  it('penuh → singkat', () => {
    expect(amsShortName('Dimas Raharjo')).toBe('Dimas R.');
    expect(amsShortName('Anindya Pramesti, CPA')).toBe('Anindya P.');
  });
  it('idempoten pada nama yang sudah singkat', () => {
    expect(amsShortName('Dimas R.')).toBe('Dimas R.');
  });
  it('kosong/bukan-string → string kosong', () => {
    expect(amsShortName('')).toBe('');
    expect(amsShortName(null)).toBe('');
  });
});

describe('deriveReviewNoteTasks — filter murni: open + milik saya + per engagement', () => {
  const notes = [
    { id: 'N1', engagementId: ENG_A, to: 'Dimas R.', status: 'open', text: 'a', module: 'wtb', priority: 'high' },
    { id: 'N2', engagementId: ENG_A, to: 'Fajar N.', status: 'open', text: 'b', module: 'aje', priority: 'low' },
    { id: 'N3', engagementId: ENG_A, to: 'Dimas R.', status: 'resolved', text: 'c', module: 'risk', priority: 'medium' },
    { id: 'N4', engagementId: 'OTHER', to: 'Dimas R.', status: 'open', text: 'd', module: 'wtb', priority: 'high' },
  ];
  it('hanya note open milik saya di engagement ini; id ter-prefiks engagement', () => {
    const t = deriveReviewNoteTasks(ENG_A, 'PT Klien A', notes, 'Dimas R.');
    expect(t.map((x) => x.id)).toEqual([`rn-${ENG_A}-N1`]);
    expect(t[0].engagementId).toBe(ENG_A);
    expect(t[0].engagementLabel).toBe('PT Klien A');
  });
  it('note untuk engagement LAIN tidak bocor walau ada di array (seed-bleed guard)', () => {
    // N4 is tagged OTHER but present in the array we pass as ENG_A's doc.
    const t = deriveReviewNoteTasks(ENG_A, 'PT Klien A', notes, 'Dimas R.');
    expect(t.find((x) => x.id.includes('N4'))).toBeUndefined();
  });
  it('note legacy tanpa engagementId tetap tampil (tak ada yang hilang)', () => {
    const legacy = [{ id: 'L1', to: 'Dimas R.', status: 'open', text: 'x', module: 'wtb', priority: 'high' }];
    expect(deriveReviewNoteTasks(ENG_A, 'PT Klien A', legacy, 'Dimas R.')).toHaveLength(1);
  });
});

describe('deriveWpAssignmentTasks — self-scope preparer/reviewer', () => {
  const wps = [
    { ref: 'A', title: 'Kas', status: 'Reviewed', preparer: 'Dimas R.', reviewer: 'Hartono W.' }, // reviewed → not preparer task
    { ref: 'B', title: 'Piutang', status: 'In Review', preparer: 'Dimas R.', reviewer: 'Hartono W.' }, // Dimas prepares, Hartono reviews
    { ref: 'C', title: 'Persediaan', status: 'In Progress', preparer: 'Fajar N.', reviewer: '—' },
  ];
  it('Dimas: siapkan B (bukan A yang sudah Reviewed)', () => {
    const t = deriveWpAssignmentTasks(wps, 'Dimas R.');
    expect(t.map((x) => x.id)).toEqual(['wp-prep-B']);
  });
  it('Hartono: reviu B (status In Review)', () => {
    const t = deriveWpAssignmentTasks(wps, 'Hartono W.');
    expect(t.map((x) => x.id)).toEqual(['wp-rev-B']);
  });
});

describe('deriveDeadlineTasks — scope ke klien terjangkau', () => {
  const dls = [
    { client: 'PT Klien A', task: 'Fieldwork', sev: 'amber' },
    { client: 'PT Klien B', task: 'EQR', sev: 'red' },
  ];
  it("oversight 'all' → semua deadline", () => {
    expect(deriveDeadlineTasks(dls, 'all')).toHaveLength(2);
  });
  it('member → hanya deadline klien yang terjangkau', () => {
    const t = deriveDeadlineTasks(dls, new Set(['PT Klien A']));
    expect(t.map((x) => x.engagementLabel)).toEqual(['PT Klien A']);
    expect(t[0].priority).toBe('medium'); // amber
  });
});

describe('tasks.mine — agregasi lintas-perikatan + isolasi via router nyata', () => {
  it('Dimas (anggota A & B) melihat tugas dari KEDUA perikatan dalam satu daftar', async () => {
    const r = await callerAs('Senior Auditor', DIMAS.id, DIMAS.name, DIMAS.email).tasks.mine();
    expect(r.me).toBe('Dimas R.');
    expect(r.engagementCount).toBe(2);
    const rn = r.tasks.filter((t) => t.src === 'Review Note');
    // RN-A1 (ENG_A) + RN-B1 (ENG_B); NOT RN-A3 (resolved), NOT RN-A2 (Fajar's).
    expect(rn.map((t) => t.id).sort()).toEqual([`rn-${ENG_A}-RN-A1`, `rn-${ENG_B}-RN-B1`].sort());
    expect(rn.some((t) => t.engagementId === ENG_A)).toBe(true);
    expect(rn.some((t) => t.engagementId === ENG_B)).toBe(true);
  });

  it('Fajar (anggota A saja) TIDAK menerima tugas ENG-B milik Dimas (isolasi negatif)', async () => {
    const r = await callerAs('Junior Auditor', FAJAR.id, FAJAR.name, FAJAR.email).tasks.mine();
    expect(r.engagementCount).toBe(1);
    const rn = r.tasks.filter((t) => t.src === 'Review Note');
    // Only Fajar's own ENG_A note; zero ENG_B tasks, zero Dimas notes.
    expect(rn.map((t) => t.id)).toEqual([`rn-${ENG_A}-RN-A2`]);
    expect(r.tasks.some((t) => t.engagementId === ENG_B)).toBe(false);
    expect(r.tasks.some((t) => t.label.includes('rahasia'))).toBe(false);
  });

  it('Partner (ENGAGEMENT_VIEW_ALL) melihat semua perikatan firma ini', async () => {
    const r = await callerAs('Engagement Partner', PARTNER.id, PARTNER.name, PARTNER.email).tasks.mine();
    // Oversight → 'all' engagements across the DB. At minimum the two seeded here are visible.
    expect(r.engagementCount).toBeGreaterThanOrEqual(2);
  });

  it('mine membutuhkan sesi (protectedProcedure)', async () => {
    const anon = createCallerFactory(appRouter)({ user: null, token: null });
    await expect(anon.tasks.mine()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});
