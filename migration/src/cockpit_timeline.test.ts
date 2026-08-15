/* ============================================================
   Engagement Cockpit — jalur kritis turunan (PR-C-4)

   Cacat yang ditutup: seluruh tab "Jalur Kritis" literal — tanggal mulai
   `new Date('2026-01-06')` dan sembilan milestone ber-date/owner/status
   hardcode. Ganti perikatan aktif, tak ada satu pun yang berubah.

   Yang dibuktikan (kriteria S9):
     · tanggal mulai punya RANTAI SUMBER dan setiap tingkat menyebut dasarnya
     · milestone yang tanggalnya TIDAK diketahui bernilai null — bukan tebakan
     · status & pemilik bergerak mengikuti perikatan
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  engagementStart, engagementMilestones, archiveDeadline, timelineSpan, fyEndOf,
  ARCHIVE_WINDOW_DAYS,
  type TimelineEngagement, type GateLike,
} from './cockpit_timeline';

const ENG: TimelineEngagement = {
  id: 'ENG-2025-014', phase: 'Eksekusi', deadline: '2026-03-31', fy: 'FY2025',
  partner: 'Hartono Wijaya, CPA', manager: 'Anindya Pramesti',
};
const TODAY = '2026-03-09';
const gate = (met: number, unmet: number): GateLike => ({
  criteria: [...Array(met).fill({ met: true }), ...Array(unmet).fill({ met: false })],
});

describe('tanggal mulai — rantai sumber, bukan literal (S9)', () => {
  it('memakai startDate bila ada', () => {
    const s = engagementStart({ ...ENG, startDate: '2026-01-15' });
    expect(s?.iso).toBe('2026-01-15');
    expect(s?.basis).toBe('startDate');
  });

  it('memakai tanggal putusan penerimaan bila startDate tak ada', () => {
    const s = engagementStart({ ...ENG, acceptanceRef: { date: '2025-11-20' } });
    expect(s?.iso).toBe('2025-11-20');
    expect(s?.basis).toBe('acceptance');
    expect(s?.label).toMatch(/SA 220/);
  });

  it('jatuh ke akhir tahun buku — TURUNAN, dan dasarnya dinyatakan', () => {
    const s = engagementStart(ENG);
    expect(s?.iso).toBe('2025-12-31');
    expect(s?.basis).toBe('fyEnd');
    expect(s?.label).toMatch(/asumsi entitas tahun kalender/);
  });

  it('tanpa sumber apa pun ⇒ null (tak terukur), bukan tanggal karangan', () => {
    expect(engagementStart({ phase: 'Eksekusi', deadline: '2026-03-31' })).toBeNull();
    expect(engagementStart(null)).toBeNull();
  });

  it('akhir tahun buku diturunkan dari fy, bukan dipaku', () => {
    expect(fyEndOf('FY2025')).toBe('2025-12-31');
    expect(fyEndOf('FY2024')).toBe('2024-12-31');
    expect(fyEndOf(undefined)).toBeNull();
  });

  it('perikatan berbeda ⇒ tanggal mulai berbeda', () => {
    const a = engagementStart({ fy: 'FY2025' });
    const b = engagementStart({ fy: 'FY2024' });
    expect(a?.iso).not.toBe(b?.iso);
  });
});

describe('batas arsip = aturan, bukan tebakan', () => {
  it('tenggat + 60 hari (SMM 1 · SA 230)', () => {
    expect(ARCHIVE_WINDOW_DAYS).toBe(60);
    expect(archiveDeadline('2026-03-31')).toBe('2026-05-30');
  });
  it('tanpa tenggat ⇒ null', () => {
    expect(archiveDeadline(undefined)).toBeNull();
  });
});

describe('milestone — hanya yang berdasar yang bertanggal (S9)', () => {
  const rows = () => engagementMilestones({
    engagement: ENG, start: engagementStart(ENG),
    gates: { toEksekusi: gate(2, 0), toFinalisasi: gate(3, 1), toArsip: gate(0, 4) },
  });

  it('tepat tiga milestone bertanggal; sisanya null', () => {
    const r = rows();
    const bertanggal = r.filter((x) => x.dateIso);
    expect(bertanggal.map((x) => x.key)).toEqual(['start', 'opini', 'arsip']);
    r.filter((x) => !x.dateIso).forEach((x) => expect(x.dateIso).toBeNull());
  });

  it('setiap tanggal menyebut dasarnya', () => {
    const r = rows();
    r.filter((x) => x.dateIso).forEach((x) => expect(x.dateBasis.length).toBeGreaterThan(3));
    expect(r.find((x) => x.key === 'arsip')?.dateBasis).toMatch(/60 hari/);
    expect(r.find((x) => x.key === 'opini')?.dateIso).toBe('2026-03-31');
  });

  it('status turun dari fase perikatan, bukan dipaku', () => {
    const r = rows();
    const by = (k: string) => r.find((x) => x.key === k);
    expect(by('perencanaan')?.status).toBe('done');     // fase aktif Eksekusi
    expect(by('finalisasi')?.status).toBe('upcoming');
    expect(by('arsip')?.status).toBe('upcoming');
  });

  it('fase berjalan jadi "risk" HANYA bila gerbangnya punya blocker', () => {
    const berisiko = engagementMilestones({
      engagement: ENG, start: null, gates: { toFinalisasi: gate(3, 1) },
    }).find((x) => x.key === 'eksekusi');
    expect(berisiko?.status).toBe('risk');
    expect(berisiko?.blockers).toBe(1);

    const bersih = engagementMilestones({
      engagement: ENG, start: null, gates: { toFinalisasi: gate(4, 0) },
    }).find((x) => x.key === 'eksekusi');
    expect(bersih?.status).toBe('active');
    expect(bersih?.blockers).toBe(0);
  });

  it('pemilik dari partner/manager perikatan — bukan enam nama yang dipaku', () => {
    const r = engagementMilestones({
      engagement: { ...ENG, partner: 'Rudi Gunawan, CPA', manager: 'Citra Halim' },
      start: null,
    });
    const pemilik = new Set(r.map((x) => x.owner));
    expect(pemilik).toEqual(new Set(['Rudi Gunawan', 'Citra Halim']));
  });

  it('ganti perikatan ⇒ seluruh jalur ikut berubah', () => {
    const a = engagementMilestones({ engagement: ENG, start: engagementStart(ENG) });
    const b = engagementMilestones({
      engagement: { id: 'ENG-2025-063', phase: 'Finalisasi', deadline: '2026-03-15', fy: 'FY2025', partner: 'Rudi Gunawan, CPA', manager: 'Citra Halim' },
      start: engagementStart({ fy: 'FY2025' }),
    });
    expect(a.map((x) => x.dateIso)).not.toEqual(b.map((x) => x.dateIso));
    expect(a.map((x) => x.status)).not.toEqual(b.map((x) => x.status));
    expect(a.map((x) => x.owner)).not.toEqual(b.map((x) => x.owner));
  });
});

describe('span rail & waktu berjalan', () => {
  it('rail membentang mulai → batas arsip', () => {
    const sp = timelineSpan(engagementStart(ENG), ENG.deadline, TODAY);
    expect(sp.startIso).toBe('2025-12-31');
    expect(sp.endIso).toBe('2026-05-30');
    expect(sp.posOf('2025-12-31')).toBe(0);
    expect(sp.posOf('2026-05-30')).toBe(100);
  });

  it('waktu berjalan diukur ke TENGGAT PELAPORAN, bukan batas arsip', () => {
    const sp = timelineSpan(engagementStart(ENG), ENG.deadline, TODAY);
    /* 31 Des 2025 → 9 Mar 2026 = 68 hari dari 90 hari ke 31 Mar 2026 */
    expect(Math.round(sp.elapsedPct ?? 0)).toBe(76);
    expect(sp.daysLeftToDeadline).toBe(22);
  });

  it('tanpa tanggal mulai ⇒ rail & elapsed tak terukur (null), bukan 0', () => {
    const sp = timelineSpan(null, ENG.deadline, TODAY);
    expect(sp.posOf('2026-03-31')).toBeNull();
    expect(sp.elapsedPct).toBeNull();
    /* sisa hari tetap terukur — tenggatnya nyata */
    expect(sp.daysLeftToDeadline).toBe(22);
  });
});

describe('TRIPWIRE — nol tanggal literal tersisa di view', () => {
  it('view_cockpit2 tak lagi memuat CKP_START / CKP_MILESTONES literal', () => {
    const kode = readFileSync(join(__dirname, 'view_cockpit2.tsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(kode).not.toMatch(/CKP_MILESTONES/);
    expect(kode).not.toMatch(/new Date\('20\d\d-\d\d-\d\d'\)/);
    const iso = [...kode.matchAll(/'20\d\d-\d\d-\d\d'/g)].map((m) => m[0]);
    expect(iso, `tanggal literal tersisa: ${iso.join(', ')}`).toEqual([]);
  });
});
