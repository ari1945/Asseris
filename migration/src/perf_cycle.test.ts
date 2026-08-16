/* ============================================================
   PRD `docs/prd-sdm-kepatuhan-deepening.md` · PR-2 · SC-7 · SC-8 · SC-9.

   Tiga cacat yang ditutup:
     (1) skor kinerja tersimpan dapat berbeda dari KPI-nya sendiri — dan untuk
         EMP-021 memang berbeda (4,5 tersimpan vs 4,355 tertimbang);
     (2) penempatan 9-box punya dua sumber — untuk TIGA dari tujuh orang, string
         tersimpan bertentangan dengan sel yang dihitung grid di layar yang sama;
     (3) satu tombol menjalankan penetapan sasaran → self-review → reviu manajer
         → kalibrasi, oleh pengguna yang sama, tanpa `can()` dan tanpa jejak.

   Uji di sini dirancang agar GAGAL bila cacat itu kembali.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AMS } from './data';
/* IMPOR EFEK-SAMPING — WAJIB. `data_people` adalah IIFE yang menempelkan `ORG`
   (garis pelaporan) ke AMS lewat Object.assign, dan ia HANYA dimuat oleh
   `main.tsx`. Tanpa baris ini `AMS.ORG` undefined, `managerOf` mengembalikan
   null untuk semua orang, dan gerbang reviu manajer memblokir seluruh roster.
   Arahnya benar (gagal-tertutup), tetapi ia menguji hal yang salah. */
import './data_people';
import {
  NINE_BOX, PERF_BAND_HIGH, PERF_BAND_MID, PERF_STAGES, managerOf, nineBoxOf,
  perfAdvanceCheck, perfBand, perfCycle, perfCycleSummary, perfPersonOf, perfScoreOf, perfStamp,
} from './canon_perf';
import type { PerfActor, PerfGoal, PerfPersonInput } from './canon_perf';

const C = AMS.PERF_CYCLE as unknown as {
  cycle: string; people: Record<string, PerfPersonInput>; goals: Record<string, PerfGoal[]>;
};
const ORG = (AMS as unknown as { ORG: Record<string, { reports?: string | null }> }).ORG;
const ROSTER = (AMS.STAFF as unknown as { id: string }[]).filter((s) => !!C.people[s.id]);
const CYCLE = perfCycle(ROSTER, C.people, C.goals);

const HR: PerfActor = { emp: 'EMP-501', canHrManage: true };
const actorOf = (emp: string | null, hr = false): PerfActor => ({ emp, canHrManage: hr });

/* ------------------------------------------------------------------
   1. Jangkar nol-delta — skor turunan menutup ke `perf` literal lama
   ------------------------------------------------------------------ */

/** `perf` LITERAL sebelum PR-2. Enam harus direproduksi PERSIS oleh KPI-nya. */
const PERF_SEBELUM_PR2: Record<string, number> = {
  'EMP-007': 4.7, 'EMP-008': 4.2, 'EMP-012': 4.3,
  'EMP-022': 4.4, 'EMP-031': 4.0, 'EMP-032': 3.9,
};

describe('nol-delta — skor tertimbang menutup ke `perf` lama', () => {
  it.each(Object.entries(PERF_SEBELUM_PR2))('%s = %f', (emp, expected) => {
    expect(CYCLE[emp].score.score).toBe(expected);
  });

  /* SATU orang SENGAJA bergerak: EMP-021 punya KPI sejak awal, dan headline-nya
     tak pernah cocok dengan KPI itu. Ini koreksi, bukan regresi. */
  it('EMP-021 BERGERAK 4,5 → 4,36 — angka lamanya tak pernah cocok dengan KPI-nya', () => {
    expect(CYCLE['EMP-021'].score.score).toBe(4.36);
    expect(CYCLE['EMP-021'].score.score).not.toBe(4.5);
  });

  it('`perf` & `box` benar-benar DICABUT dari data — bukan sekadar tak dibaca', () => {
    for (const [emp, rec] of Object.entries(C.people)) {
      const r = rec as unknown as Record<string, unknown>;
      expect(r, emp).not.toHaveProperty('perf');
      expect(r, emp).not.toHaveProperty('box');
    }
  });

  it('setiap orang punya sasaran dengan bobot berjumlah 100', () => {
    for (const s of ROSTER) {
      expect(CYCLE[s.id].score.weightSum, s.id).toBe(100);
      expect(CYCLE[s.id].score.flags, s.id).toEqual([]);
    }
  });
});

/* ------------------------------------------------------------------
   2. SC-7 — skor = agregasi tertimbang sasaran
   ------------------------------------------------------------------ */

describe('SC-7 — skor kinerja diturunkan dari sasarannya', () => {
  it('menghitung Σ(skor × bobot) ÷ Σ(bobot)', () => {
    const g: PerfGoal[] = [
      { kpi: 'a', target: '', actual: '', score: 5, weight: 50 },
      { kpi: 'b', target: '', actual: '', score: 3, weight: 50 },
    ];
    expect(perfScoreOf(g).score).toBe(4);
  });

  it('mengubah satu skor KPI MENGGERAKKAN skor kinerja', () => {
    const base = C.goals['EMP-021'];
    const bumped = base.map((g, i) => (i === 2 ? { ...g, score: 4.5 } : g));
    /* KPI PPL bobot 15: (4,5 − 3,5) × 15 ÷ 100 = +0,15 */
    expect(perfScoreOf(bumped).score).toBe(4.51);
    expect(perfScoreOf(base).score).toBe(4.36);
  });

  it('tanpa sasaran → null, BUKAN nol', () => {
    const s = perfScoreOf([]);
    expect(s.score).toBeNull();
    expect(s.flags).toContain('tanpa-sasaran');
  });

  it('bobot yang tidak berjumlah 100 ditandai, bukan didiamkan', () => {
    const s = perfScoreOf([{ kpi: 'a', target: '', actual: '', score: 4, weight: 60 }]);
    expect(s.flags).toContain('bobot-tidak-100');
    expect(s.score).toBe(4);
  });

  it('skor di luar skala 1–5 ditandai', () => {
    const s = perfScoreOf([{ kpi: 'a', target: '', actual: '', score: 9, weight: 100 }]);
    expect(s.flags).toContain('skor-di-luar-skala');
  });

  it('rata-rata firma hanya dari yang DAPAT dinilai, dan tak pernah NaN', () => {
    expect(perfCycleSummary({}).avgScore).toBeNull();
    const one = perfCycleSummary({ x: perfPersonOf('x', { pot: 4 }, []) });
    expect(one.avgScore).toBeNull();
    expect(one.unscored).toBe(1);
    const real = perfCycleSummary(CYCLE);
    expect(real.scored).toBe(ROSTER.length);
    expect(Number.isFinite(real.avgScore as number)).toBe(true);
  });
});

/* ------------------------------------------------------------------
   3. SC-8 — penempatan 9-box diturunkan
   ------------------------------------------------------------------ */

/** Label `box` LITERAL sebelum PR-2 — TIGA di antaranya bertentangan dengan
 *  sel yang dihitung grid di layar yang sama. Didaftarkan agar pertentangannya
 *  tercatat, bukan supaya direproduksi. */
const BOX_SEBELUM_PR2: Record<string, string> = {
  'EMP-007': 'Bintang', 'EMP-008': 'Kinerja Tinggi', 'EMP-012': 'Kinerja Tinggi',
  'EMP-021': 'Bintang', 'EMP-022': 'Kinerja Tinggi', 'EMP-031': 'Inti', 'EMP-032': 'Inti',
};
const BOX_BERTENTANGAN = ['EMP-008', 'EMP-031', 'EMP-032'];

describe('SC-8 — 9-box dari (skor × potensi), bukan string tersimpan', () => {
  it('sembilan sel semuanya bernama — bukan tiga', () => {
    const labels = NINE_BOX.flat().map((c) => c.label);
    expect(labels).toHaveLength(9);
    expect(new Set(labels).size).toBe(9);
    for (const c of NINE_BOX.flat()) expect(c.action, c.key).not.toBe('');
  });

  it('pita mengikuti ambang lama — penempatan tak bergeser karena pindah mesin', () => {
    expect(perfBand(PERF_BAND_HIGH)).toBe(2);
    expect(perfBand(PERF_BAND_HIGH - 0.01)).toBe(1);
    expect(perfBand(PERF_BAND_MID)).toBe(1);
    expect(perfBand(PERF_BAND_MID - 0.01)).toBe(0);
    expect(perfBand(null)).toBeNull();
  });

  it('TIGA label lama memang bertentangan dengan selnya', () => {
    const bertentangan = ROSTER
      .filter((s) => CYCLE[s.id].placement.label !== BOX_SEBELUM_PR2[s.id])
      .map((s) => s.id);
    expect(bertentangan.sort()).toEqual(BOX_BERTENTANGAN);
  });

  it('EMP-008 (4,2/3,6) ada di sel Inti, bukan "Kinerja Tinggi"', () => {
    const p = CYCLE['EMP-008'];
    expect([p.placement.px, p.placement.py]).toEqual([1, 1]);
    expect(p.placement.label).toBe('Inti');
  });

  it('EMP-031 & EMP-032 ada di sel Pekerja Efektif, bukan "Inti"', () => {
    for (const emp of ['EMP-031', 'EMP-032']) {
      expect([CYCLE[emp].placement.px, CYCLE[emp].placement.py], emp).toEqual([1, 0]);
      expect(CYCLE[emp].placement.label, emp).toBe('Pekerja Efektif');
    }
  });

  it('empat lainnya tidak bergeser', () => {
    for (const emp of ['EMP-007', 'EMP-012', 'EMP-021', 'EMP-022']) {
      expect(CYCLE[emp].placement.label, emp).toBe(BOX_SEBELUM_PR2[emp]);
    }
  });

  it('skor turunan EMP-021 tetap di sel Bintang — koreksi tak merembet', () => {
    expect(CYCLE['EMP-021'].placement.label).toBe('Bintang');
  });

  it('tanpa skor atau tanpa potensi → TIDAK ditempatkan, dan bilang kenapa', () => {
    expect(nineBoxOf(null, 4).placeable).toBe(false);
    expect(nineBoxOf(null, 4).note).toMatch(/sasaran/);
    expect(nineBoxOf(4, null).note).toMatch(/[Pp]otensi/);
    expect(nineBoxOf(null, null).placeable).toBe(false);
  });
});

/* ------------------------------------------------------------------
   4. SC-9 — pemisahan tugas
   ------------------------------------------------------------------ */

const person = (steps: PerfPersonInput['steps'], emp = 'EMP-021') =>
  perfPersonOf(emp, { pot: 4.4, steps }, C.goals[emp]);

describe('SC-9 — empat tahap, empat pihak', () => {
  it('garis pelaporan diambil dari AMS.ORG, bukan ditebak', () => {
    expect(managerOf(ORG, 'EMP-021')).toBe('EMP-007');
    expect(managerOf(ORG, 'EMP-032')).toBe('EMP-022');
    expect(managerOf(ORG, 'EMP-001')).toBeNull();
  });

  it('SELF-REVIEW hanya oleh yang dinilai — atasan & HR ditolak', () => {
    const p = person({ goals: { by: 'EMP-007' } });
    expect(PERF_STAGES[p.stageIndex].key).toBe('self');
    expect(perfAdvanceCheck(p, actorOf('EMP-021'), ORG).ok).toBe(true);
    expect(perfAdvanceCheck(p, actorOf('EMP-007'), ORG).ok).toBe(false);
    expect(perfAdvanceCheck(p, HR, ORG).ok).toBe(false);
    expect(perfAdvanceCheck(p, actorOf('EMP-007'), ORG).reason).toMatch(/yang dinilai sendiri/);
  });

  it('REVIU MANAJER hanya oleh atasan langsung — dan HR TIDAK menggantikannya', () => {
    const p = person({ goals: { by: 'EMP-007' }, self: { by: 'EMP-021' } });
    expect(PERF_STAGES[p.stageIndex].key).toBe('manager');
    expect(perfAdvanceCheck(p, actorOf('EMP-007'), ORG).ok).toBe(true);
    expect(perfAdvanceCheck(p, actorOf('EMP-008'), ORG).ok).toBe(false);
    /* HR punya kewenangan tulis, tetapi ia bukan penilai. Kalau HR boleh
       menandatangani reviu manajer, pemisahan tugasnya kembali jadi hiasan. */
    const hr = perfAdvanceCheck(p, HR, ORG);
    expect(hr.ok).toBe(false);
    expect(hr.reason).toMatch(/atasan langsung/);
  });

  it('yang dinilai tidak dapat menandatangani reviu manajernya sendiri', () => {
    const p = person({ goals: { by: 'EMP-007' }, self: { by: 'EMP-021' } });
    const self = perfAdvanceCheck(p, actorOf('EMP-021'), ORG);
    expect(self.ok).toBe(false);
    expect(self.reason).toMatch(/orang yang dinilai/);
  });

  it('tanpa garis pelaporan, reviu manajer tak punya penilai yang sah', () => {
    const p = perfPersonOf('EMP-999', { pot: 4, steps: { goals: { by: 'X' }, self: { by: 'EMP-999' } } }, C.goals['EMP-021']);
    const chk = perfAdvanceCheck(p, actorOf('EMP-007'), ORG);
    expect(chk.ok).toBe(false);
    expect(chk.reason).toMatch(/[Gg]aris pelaporan/);
  });

  it('KALIBRASI butuh HR_MANAGE, dan bukan oleh atasan yang menilai', () => {
    const p = person({ goals: { by: 'EMP-007' }, self: { by: 'EMP-021' }, manager: { by: 'EMP-007' } });
    expect(PERF_STAGES[p.stageIndex].key).toBe('calibration');
    expect(perfAdvanceCheck(p, HR, ORG).ok).toBe(true);
    /* tanpa kapabilitas */
    expect(perfAdvanceCheck(p, actorOf('EMP-002'), ORG).ok).toBe(false);
    /* atasan langsung, meski ber-HR_MANAGE — kalibrasi adalah lapis independen */
    const mgr = perfAdvanceCheck(p, actorOf('EMP-007', true), ORG);
    expect(mgr.ok).toBe(false);
    expect(mgr.reason).toMatch(/independen/);
    /* yang dinilai sendiri, meski ber-HR_MANAGE */
    expect(perfAdvanceCheck(p, actorOf('EMP-021', true), ORG).ok).toBe(false);
  });

  it('PENETAPAN SASARAN oleh atasan atau HR, tak pernah oleh yang dinilai', () => {
    const p = person({});
    expect(PERF_STAGES[p.stageIndex].key).toBe('goals');
    expect(perfAdvanceCheck(p, actorOf('EMP-007'), ORG).ok).toBe(true);
    expect(perfAdvanceCheck(p, HR, ORG).ok).toBe(true);
    expect(perfAdvanceCheck(p, actorOf('EMP-021'), ORG).ok).toBe(false);
    expect(perfAdvanceCheck(p, actorOf('EMP-031'), ORG).ok).toBe(false);
  });

  it('GAGAL-TERTUTUP: akun tak terpetakan tak dapat membubuhkan apa pun', () => {
    for (const steps of [{}, { goals: { by: 'X' } }, { goals: { by: 'X' }, self: { by: 'EMP-021' } }]) {
      expect(perfAdvanceCheck(person(steps as PerfPersonInput['steps']), actorOf(null, true), ORG).ok).toBe(false);
    }
  });

  it('SATU ORANG TIDAK DAPAT MENJALANKAN SELURUH SIKLUS — cacat aslinya', () => {
    /* Inilah bentuk cacat lama: empat klik berturut oleh pengguna yang sama.
       Siapa pun yang dicoba, rantainya harus putus sebelum tuntas. */
    for (const who of ['EMP-021', 'EMP-007', 'EMP-501', 'EMP-001']) {
      let p = person({});
      let steps: PerfPersonInput['steps'] = {};
      let langkah = 0;
      for (let i = 0; i < 4; i++) {
        const chk = perfAdvanceCheck(p, actorOf(who, true), ORG);
        if (!chk.ok || !chk.stage) break;
        steps = { ...steps, [chk.stage]: { by: who } };
        p = person(steps);
        langkah++;
      }
      expect(langkah, `${who} berhasil menyelesaikan ${langkah} tahap sendirian`).toBeLessThan(4);
    }
  });

  it('siklus yang sudah tuntas tak dapat digerakkan lagi', () => {
    const p = person({ goals: { by: 'A' }, self: { by: 'EMP-021' }, manager: { by: 'EMP-007' }, calibration: { by: 'EMP-501' } });
    expect(p.complete).toBe(true);
    expect(perfAdvanceCheck(p, HR, ORG).ok).toBe(false);
  });

  it('stempel mencatat siapa & kapan', () => {
    const st = perfStamp(actorOf('EMP-007'), 'Anindya Pramesti', '2026-03-09');
    expect(st).toMatchObject({ by: 'EMP-007', byName: 'Anindya Pramesti', at: '2026-03-09' });
    expect(st.seeded).toBeUndefined();
  });
});

/* ------------------------------------------------------------------
   5. Identitas tahapan — warisan boolean & seed tak menyamar
   ------------------------------------------------------------------ */

describe('tahapan yang selesai harus dapat ditanya "oleh siapa?"', () => {
  it('boolean lama dibaca sebagai selesai TAPI tanpa identitas', () => {
    const p = perfPersonOf('E', { pot: 4, goalsSet: true, selfDone: true }, C.goals['EMP-021']);
    expect(p.stages[0].done).toBe(true);
    expect(p.stages[0].attributed).toBe(false);
    expect(p.unattributed).toEqual(['goals', 'self']);
    expect(PERF_STAGES[p.stageIndex].key).toBe('manager');
  });

  it('stempel seed demo tidak dihitung ber-identitas', () => {
    for (const s of ROSTER) {
      const done = CYCLE[s.id].stages.filter((x) => x.done);
      expect(done.length, s.id).toBeGreaterThan(0);
      expect(CYCLE[s.id].unattributed.length, s.id).toBe(done.length);
    }
    expect(perfCycleSummary(CYCLE).unattributed).toBe(ROSTER.length);
  });

  it('stempel nyata (bukan seed) ber-identitas', () => {
    const p = perfPersonOf('E', { pot: 4, steps: { goals: { by: 'EMP-007', byName: 'A', at: '2026-03-09' } } }, []);
    expect(p.stages[0].attributed).toBe(true);
    expect(p.unattributed).toEqual([]);
  });

  it('setiap tahap seed menyebut penilai yang sah menurut ORG', () => {
    for (const s of ROSTER) {
      for (const st of CYCLE[s.id].stages) {
        if (!st.done || !st.stamp?.by) continue;
        if (st.key === 'self') expect(st.stamp.by, s.id).toBe(s.id);
        if (st.key === 'manager') expect(st.stamp.by, s.id).toBe(managerOf(ORG, s.id));
      }
    }
  });
});

/* ------------------------------------------------------------------
   6. GERBANG CAKUPAN — siapa membaca apa
   ------------------------------------------------------------------ */

const SRC = join(__dirname);
/* Kode saja — komentar berkas ini JUSTRU menjelaskan pola lama yang dicabut. */
const read = (f: string) => readFileSync(join(SRC, f), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

/** Setiap view yang menampilkan skor/penempatan kinerja. */
const KONSUMEN = ['view_hrops.tsx', 'view_pc_hcm.tsx', 'view_personal.tsx'];

describe('gerbang cakupan — tak ada konsumen yang kembali ke literal', () => {
  it.each(KONSUMEN)('%s tidak membaca `.perf` / `.box` tersimpan', (f) => {
    const src = read(f);
    expect(src).not.toMatch(/\b(p|person|perf|myPerf)\s*\.\s*perf\b/);
    expect(src).not.toMatch(/\b(p|person|perf|myPerf)\s*\.\s*box\b/);
  });

  it.each(KONSUMEN)('%s masuk lewat canon_perf', (f) => {
    expect(read(f)).toMatch(/from '\.\/canon_perf'/);
  });

  it('tak ada view yang menghitung pita 9-box sendiri', () => {
    for (const f of KONSUMEN) {
      /* pola lama: `v >= 4.3 ? 2 : v >= 3.6 ? 1 : 0` */
      expect(read(f), f).not.toMatch(/>=\s*4\.3\s*\?\s*2\s*:/);
    }
  });

  it('rantai advance() empat-langkah satu-tombol sudah dicabut', () => {
    const src = read('view_hrops.tsx');
    expect(src).not.toMatch(/if \(!p\.goalsSet\)/);
    expect(src).not.toMatch(/p\.calibrated = true/);
  });

  it('advance() memeriksa kewenangan SEBELUM menulis, bukan hanya menyembunyikan tombol', () => {
    const src = read('view_hrops.tsx');
    expect(src).toMatch(/const advance = \(id: string\) => \{[\s\S]{0,400}?perfAdvanceCheck\([\s\S]{0,200}?if \(!chk\.ok/);
  });

  it('gate memakai kapabilitas yang sama dengan penegakan tulis server', async () => {
    const { capForWrite, CAP } = await import('./rbac');
    expect(capForWrite('firm', 'perfPeople')).toBe(CAP.HR_MANAGE);
    expect(read('view_hrops.tsx')).toMatch(/CAP\.HR_MANAGE/);
  });
});
