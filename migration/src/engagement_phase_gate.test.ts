/* ============================================================
   Gerbang →Finalisasi sadar-progres (isu #3) — uji fungsi murni.
   Mengunci: ambang kesimpulan 80% (79 gagal, 80 lolos, 100 lolos),
   perlakuan notStarted (apa pun >0 = gagal), kriteria catatan high,
   serta integrasi melalui engagementGate (severity 'warn', lompatan
   Perencanaan→Finalisasi tetap bergerbang, Arsip tak terdampak).
   ============================================================ */
import { describe, it, expect } from 'vitest';
import {
  FINALISATION_THRESHOLDS,
  finalisationGateCriteria,
  type FinalisationGateInput,
} from './engagement_phase_gate';

/* default integritas WTB = ok agar kasus 3-kriteria lama tak berubah; uji
   khusus W-WTB·2 meng-override wtbIntegrityOk. */
const crit = (i: Partial<FinalisationGateInput>) => {
  const full: FinalisationGateInput = {
    conclusionPct: 100, notStarted: 0, highOpenCount: 0,
    wtbIntegrityOk: true, wtbIntegrityDetail: '', ...i,
  };
  const cs = finalisationGateCriteria(full);
  const by = (k: string) => cs.find(c => c.key === k)!;
  return { cs, by, allMet: cs.every(c => c.met) };
};

describe('finalisationGateCriteria() — ambang kesimpulan SA 230', () => {
  it('menghasilkan 4 kriteria (concluded, allStarted, noHighNotes, wtbIntegrity)', () => {
    const { cs } = crit({ conclusionPct: 100, notStarted: 0, highOpenCount: 0 });
    expect(cs.map(c => c.key)).toEqual(['concluded', 'allStarted', 'noHighNotes', 'wtbIntegrity']);
  });

  it('ambang konstan = 80%', () => {
    expect(FINALISATION_THRESHOLDS.minConclusionPct).toBe(80);
  });

  it('79% kesimpulan → kriteria concluded GAGAL', () => {
    expect(crit({ conclusionPct: 79, notStarted: 0, highOpenCount: 0 }).by('concluded').met).toBe(false);
  });

  it('80% kesimpulan → kriteria concluded LOLOS (batas inklusif)', () => {
    expect(crit({ conclusionPct: 80, notStarted: 0, highOpenCount: 0 }).by('concluded').met).toBe(true);
  });

  it('100% kesimpulan → concluded lolos', () => {
    expect(crit({ conclusionPct: 100, notStarted: 0, highOpenCount: 0 }).by('concluded').met).toBe(true);
  });

  it('0% kesimpulan → concluded gagal', () => {
    expect(crit({ conclusionPct: 0, notStarted: 0, highOpenCount: 0 }).by('concluded').met).toBe(false);
  });
});

describe('finalisationGateCriteria() — WP belum dimulai', () => {
  it('notStarted=0 → allStarted lolos', () => {
    expect(crit({ conclusionPct: 100, notStarted: 0, highOpenCount: 0 }).by('allStarted').met).toBe(true);
  });

  it('notStarted=1 → allStarted gagal walau kesimpulan 90%', () => {
    const r = crit({ conclusionPct: 90, notStarted: 1, highOpenCount: 0 });
    expect(r.by('allStarted').met).toBe(false);
    expect(r.allMet).toBe(false);
    expect(r.by('allStarted').detail).toContain('1');
  });

  it('notStarted banyak → tetap gagal', () => {
    expect(crit({ conclusionPct: 100, notStarted: 7, highOpenCount: 0 }).by('allStarted').met).toBe(false);
  });
});

describe('finalisationGateCriteria() — catatan review prioritas tinggi', () => {
  it('highOpenCount=0 → noHighNotes lolos', () => {
    expect(crit({ conclusionPct: 100, notStarted: 0, highOpenCount: 0 }).by('noHighNotes').met).toBe(true);
  });

  it('highOpenCount>0 → noHighNotes gagal', () => {
    expect(crit({ conclusionPct: 100, notStarted: 0, highOpenCount: 2 }).by('noHighNotes').met).toBe(false);
  });
});

describe('finalisationGateCriteria() — integritas neraca saldo (W-WTB·2 / A1)', () => {
  it('wtbIntegrityOk=true → kriteria wtbIntegrity lolos, detail ringkas', () => {
    const r = crit({ wtbIntegrityOk: true });
    expect(r.by('wtbIntegrity').met).toBe(true);
    expect(r.by('wtbIntegrity').detail).toContain('rekonsiliasi');
    expect(r.by('wtbIntegrity').view).toBe('wtb');
  });

  it('wtbIntegrityOk=false → wtbIntegrity gagal & memblok allMet (memantulkan detail)', () => {
    const r = crit({ wtbIntegrityOk: false, wtbIntegrityDetail: 'kolom AJE tak seimbang' });
    expect(r.by('wtbIntegrity').met).toBe(false);
    expect(r.by('wtbIntegrity').detail).toBe('kolom AJE tak seimbang');
    expect(r.allMet).toBe(false);
  });

  it('detail kosong saat tak-ok → fallback label generik (tak pernah kosong)', () => {
    const r = crit({ wtbIntegrityOk: false, wtbIntegrityDetail: '' });
    expect(r.by('wtbIntegrity').detail.length).toBeGreaterThan(0);
  });

  it('integritas gagal sendirian → satu-satunya blocker', () => {
    const { cs } = crit({ conclusionPct: 100, notStarted: 0, highOpenCount: 0, wtbIntegrityOk: false });
    expect(cs.filter(c => !c.met).map(c => c.key)).toEqual(['wtbIntegrity']);
  });
});

describe('finalisationGateCriteria() — kombinasi & semua-terpenuhi', () => {
  it('hanya lolos penuh saat ≥80% + notStarted 0 + high 0', () => {
    expect(crit({ conclusionPct: 80, notStarted: 0, highOpenCount: 0 }).allMet).toBe(true);
    expect(crit({ conclusionPct: 80, notStarted: 0, highOpenCount: 1 }).allMet).toBe(false);
    expect(crit({ conclusionPct: 80, notStarted: 1, highOpenCount: 0 }).allMet).toBe(false);
    expect(crit({ conclusionPct: 79, notStarted: 0, highOpenCount: 0 }).allMet).toBe(false);
  });

  it('eksekusi 0% (skenario yang dicegah isu #3) → 2 blocker eksekusi', () => {
    const { cs } = crit({ conclusionPct: 0, notStarted: 10, highOpenCount: 0 });
    const blockers = cs.filter(c => !c.met).map(c => c.key);
    expect(blockers).toEqual(['concluded', 'allStarted']);
  });
});
