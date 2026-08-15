/* ============================================================
   Engagement Cockpit — progres terbukti & gerbang CAKUPAN (PR-C-2)

   Dua hal yang dibuktikan berkas ini:

   1. GERBANG CAKUPAN (S4). Setiap kunci `WP_MODULE_MAP` terpetakan ke tepat
      satu fase, dan sebaliknya tak ada entri peta yang menunjuk modul hantu.
      Ini SENGAJA bukan tie-out "jumlah fase = total": tie-out semacam itu
      lulus otomatis begitu roll-up diturunkan dari peta yang sama, dan tak
      membuktikan apa pun (pelajaran #242). Menambah WP baru tanpa memetakan
      fasenya akan MEMERAHKAN uji ini — itu tujuannya.

   2. PROGRES BERGERAK (S3). Menandatangani satu kertas kerja menaikkan
      progres terbukti; nol pekerjaan ⇒ 0%. Dulu angkanya literal 62% dan
      tak bergerak oleh tindakan auditor mana pun.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { WP_MODULE_MAP } from './wp_signoff';
import {
  PHASE_OF_MODULE, CKP_PHASE_ORDER, PHASE_BUDGET_WEIGHT, WP_MILESTONES,
  moduleProvenPct, progressBridge, phaseRollups, unmappedModules,
  type ModuleWpStatus, type PhaseKey,
} from './cockpit_progress';

const wpKeys = (): string[] => Object.keys(WP_MODULE_MAP);

const st = (id: string, o: Partial<ModuleWpStatus> = {}): ModuleWpStatus => ({
  id, ref: id, signed: false, hasEvidence: false, hasConclusion: false, notStarted: true, ...o,
});
const allEmpty = (): ModuleWpStatus[] => wpKeys().map((id) => st(id));

describe('gerbang CAKUPAN peta modul → fase (S4)', () => {
  it('setiap kunci WP_MODULE_MAP punya fase', () => {
    const missing = wpKeys().filter((k) => !PHASE_OF_MODULE[k]);
    expect(missing, `kertas kerja tanpa fase: ${missing.join(', ')}`).toEqual([]);
  });

  it('tak ada entri peta yang menunjuk modul di luar WP_MODULE_MAP', () => {
    const keys = new Set(wpKeys());
    const orphan = Object.keys(PHASE_OF_MODULE).filter((k) => !keys.has(k));
    expect(orphan, `fase menunjuk modul hantu: ${orphan.join(', ')}`).toEqual([]);
  });

  it('setiap fase memakai nilai PhaseKey yang sah & tiap fase terisi', () => {
    const valid = new Set<string>(CKP_PHASE_ORDER);
    Object.entries(PHASE_OF_MODULE).forEach(([id, phase]) => {
      expect(valid.has(phase), `${id} → fase tak dikenal "${phase}"`).toBe(true);
    });
    CKP_PHASE_ORDER.forEach((p) => {
      const n = Object.values(PHASE_OF_MODULE).filter((x) => x === p).length;
      expect(n, `fase ${p} kosong`).toBeGreaterThan(0);
    });
  });

  it('bobot jam anggaran per fase berjumlah 1 (model alokasi, bukan pengukuran)', () => {
    const sum = Object.values(PHASE_BUDGET_WEIGHT).reduce((s, w) => s + w, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(1e-9);
  });
});

describe('progres terbukti bergerak ketika auditor bekerja (S3)', () => {
  it('nol pekerjaan ⇒ 0% — bukan 62%', () => {
    const b = progressBridge(allEmpty(), 62);
    expect(b.provenPct).toBe(0);
    expect(b.assertedPct).toBe(62);
    expect(b.gapPp).toBe(62);
  });

  it('seluruh tonggak terpenuhi ⇒ 100%', () => {
    const full = wpKeys().map((id) => st(id, { signed: true, hasEvidence: true, hasConclusion: true, notStarted: false }));
    const b = progressBridge(full, 62);
    expect(Math.round(b.provenPct)).toBe(100);
    expect(Math.round(b.gapPp ?? 0)).toBe(-38);
  });

  it('menandatangani SATU kertas kerja menaikkan progres terbukti', () => {
    const before = progressBridge(allEmpty(), 62);
    const rows = allEmpty();
    rows[0] = st(rows[0].id, { signed: true, notStarted: true });
    const after = progressBridge(rows, 62);
    expect(after.provenPct).toBeGreaterThan(before.provenPct);
    /* satu tonggak dari (3 × n) → tepat 100/(3n) pp */
    expect(after.provenPct - before.provenPct).toBeCloseTo(100 / (3 * rows.length), 10);
  });

  it('tiap tonggak menyumbang setara — tak ada yang diistimewakan', () => {
    const n = wpKeys().length;
    const one = (o: Partial<ModuleWpStatus>) => {
      const rows = allEmpty();
      rows[0] = st(rows[0].id, o);
      return progressBridge(rows, null).provenPct;
    };
    const a = one({ hasEvidence: true });
    const b = one({ hasConclusion: true });
    const c = one({ signed: true });
    expect(a).toBeCloseTo(b, 10);
    expect(b).toBeCloseTo(c, 10);
    expect(a).toBeCloseTo(100 / (3 * n), 10);
  });
});

describe('jembatan menjumlah — tak ada plug', () => {
  it('ketiga baris BENAR-BENAR menjumlah menjadi progres terbukti', () => {
    const rows = allEmpty();
    rows[0] = st(rows[0].id, { signed: true, hasEvidence: true, notStarted: false });
    rows[1] = st(rows[1].id, { hasConclusion: true, notStarted: false });
    rows[2] = st(rows[2].id, { hasEvidence: true, hasConclusion: true, signed: true, notStarted: false });
    const b = progressBridge(rows, 62);
    const sum = b.rows.reduce((s, r) => s + r.pp, 0);
    expect(sum).toBeCloseTo(b.provenPct, 10);
    expect(b.rows).toHaveLength(3);
    expect(b.rows.map((r) => r.key)).toEqual(['evidence', 'conclusion', 'signoff']);
  });

  it('tiap baris menyebut jumlah modulnya, bukan hanya persentase', () => {
    const rows = allEmpty();
    rows[0] = st(rows[0].id, { hasEvidence: true });
    rows[1] = st(rows[1].id, { hasEvidence: true });
    const b = progressBridge(rows, null);
    const ev = b.rows.find((r) => r.key === 'evidence');
    expect(ev?.count).toBe(2);
    expect(ev?.total).toBe(rows.length);
  });

  it('selisih terhadap asersi TIDAK dipecah menjadi komponen palsu', () => {
    const b = progressBridge(allEmpty(), 62);
    /* hanya tiga baris tonggak; sisa disajikan sebagai satu gapPp bernama */
    expect(b.rows).toHaveLength(WP_MILESTONES.length);
    expect(b.gapPp).toBe(62 - b.provenPct);
  });

  it('tanpa asersi manajer, jembatan tetap sah dengan gap null', () => {
    const b = progressBridge(allEmpty(), null);
    expect(b.assertedPct).toBeNull();
    expect(b.gapPp).toBeNull();
  });
});

describe('skor per kertas kerja & roll-up fase', () => {
  it('skor satu WP = 0 · 33 · 67 · 100', () => {
    expect(moduleProvenPct(st('x'))).toBe(0);
    expect(moduleProvenPct(st('x', { hasEvidence: true }))).toBe(33);
    expect(moduleProvenPct(st('x', { hasEvidence: true, hasConclusion: true }))).toBe(67);
    expect(moduleProvenPct(st('x', { hasEvidence: true, hasConclusion: true, signed: true }))).toBe(100);
  });

  it('roll-up mencakup seluruh WP dan tak menjatuhkan satu pun', () => {
    const rolls = phaseRollups(allEmpty());
    const covered = rolls.reduce((s, r) => s + r.total, 0);
    expect(covered).toBe(wpKeys().length);
    expect(unmappedModules(allEmpty())).toEqual([]);
  });

  it('modul diurut yang paling tertinggal lebih dulu', () => {
    const rows = allEmpty().map((s) =>
      PHASE_OF_MODULE[s.id] === 'Finalisasi' ? st(s.id, { signed: true, hasEvidence: true, hasConclusion: true }) : s);
    /* satu modul Finalisasi dibuat kosong lagi → harus muncul paling atas */
    const fin = rows.filter((s) => PHASE_OF_MODULE[s.id] === 'Finalisasi');
    const victim = fin[fin.length - 1].id;
    const rows2 = rows.map((s) => (s.id === victim ? st(s.id) : s));
    const roll = phaseRollups(rows2).find((r) => r.phase === 'Finalisasi');
    expect(roll?.modules[0].id).toBe(victim);
    expect(roll?.modules[0].pct).toBe(0);
  });

  it('progres fase bergerak sendiri-sendiri, tak saling menular', () => {
    const rows = allEmpty().map((s) =>
      PHASE_OF_MODULE[s.id] === 'Perencanaan' ? st(s.id, { signed: true, hasEvidence: true, hasConclusion: true }) : s);
    const byPhase = new Map<PhaseKey, number>(phaseRollups(rows).map((r) => [r.phase, Math.round(r.provenPct)]));
    expect(byPhase.get('Perencanaan')).toBe(100);
    expect(byPhase.get('Eksekusi')).toBe(0);
    expect(byPhase.get('Specifics')).toBe(0);
    expect(byPhase.get('Finalisasi')).toBe(0);
  });
});
