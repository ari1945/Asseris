/* ============================================================
   Kanon fase perikatan (TB7) — satu taksonomi, satu tabel bobot.

   Sebelum PRD `prd-timebudget-phase-profile.md` ada EMPAT daftar fase, dan dua
   di antaranya membagi jam anggaran yang SAMA dengan bobot yang BERBEDA:

     Time & Budget  320 / 1080 / 320 / 120   (dari 1840 jam perikatan demo)
     Cockpit        280 /  760 / 361 / 340 / 99

   Dua layar, satu perikatan, dua jawaban. Berkas ini menjaga agar keadaan itu
   tak tumbuh kembali, dan agar pelipatan taksonomi lama ('Specifics' →
   Eksekusi, 'Review & Arsip' → Arsip) TERBACA alih-alih terjadi diam-diam.

   Gerbang mutunya CAKUPAN, bukan tie-out: nilai `phase` apa pun yang
   BENAR-BENAR ada di data atau yang dapat ditulis pengguna harus punya rumah.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AMS } from './data';
import {
  PHASE_ALIAS, PHASE_BUDGET_WEIGHT, PHASE_LABEL, PHASE_ORDER, PHASE_TOKEN,
  allocateExact, phaseBudgetHours, phaseHoursOf, phaseOf, type PhaseId,
} from './phase_canon';
import { CKP_PHASE_ORDER, MODULE_PHASE_LEGACY, PHASE_OF_MODULE } from './cockpit_progress';

const seedPhases = (key: 'ENGAGEMENTS' | 'TIME_ENTRIES'): string[] => {
  const rows = (AMS as unknown as Record<string, { phase?: string }[]>)[key] || [];
  return [...new Set(rows.map((r) => r.phase).filter((p): p is string => !!p))];
};

/* ============================================================
   a · taksonomi
   ============================================================ */
describe('taksonomi fase', () => {
  it('empat fase, sama dengan taksonomi DATA (Opsi B)', () => {
    expect([...PHASE_ORDER]).toEqual(['Perencanaan', 'Eksekusi', 'Finalisasi', 'Arsip']);
  });

  it('cockpit memakai kanon yang sama — bukan salinan kedua', () => {
    expect([...CKP_PHASE_ORDER]).toEqual([...PHASE_ORDER]);
  });

  it('setiap fase punya label & token; tak ada yang kosong', () => {
    PHASE_ORDER.forEach((p) => {
      expect(PHASE_LABEL[p], p).toBeTruthy();
      expect(PHASE_TOKEN[p], p).toMatch(/^var\(--/);
    });
    /* Token harus BERBEDA antar fase — dua fase sewarna tak dapat dibedakan. */
    expect(new Set(PHASE_ORDER.map((p) => PHASE_TOKEN[p])).size).toBe(PHASE_ORDER.length);
  });
});

/* ============================================================
   b · CAKUPAN — setiap nilai `phase` yang nyata punya rumah
   ============================================================ */
describe('cakupan — nol fase yang hilang diam-diam', () => {
  it('setiap `phase` pada ENGAGEMENTS seed dikenal kanon', () => {
    const nilai = seedPhases('ENGAGEMENTS');
    expect(nilai.length).toBeGreaterThan(1);
    const asing = nilai.filter((p) => phaseOf(p) == null);
    expect(asing, 'fase perikatan tak dikenal: ' + asing.join(' | ')).toEqual([]);
  });

  it('setiap `phase` pada TIME_ENTRIES seed dikenal kanon', () => {
    const asing = seedPhases('TIME_ENTRIES').filter((p) => phaseOf(p) == null);
    expect(asing, 'fase timesheet tak dikenal: ' + asing.join(' | ')).toEqual([]);
  });

  /* Ini gerbang SC-4: yang dapat ditulis pengguna lewat formulir timesheet
     harus terbaca oleh SETIAP layar yang mengelompokkan jam per fase. Dulu
     formulir menulis 'Pelaporan' dan cockpit tak mengenalnya. */
  it('setiap opsi yang ditawarkan formulir timesheet dikenal kanon', () => {
    const src = readFileSync(join(__dirname, 'view_timebudget.tsx'), 'utf8');
    /* formulir mengambil opsinya DARI kanon — tak ada daftar literal lagi */
    expect(src).toMatch(/const phaseOpts = PHASE_ORDER;/);
    PHASE_ORDER.forEach((p) => expect(phaseOf(p), p).toBe(p));
  });

  it('setiap fase pada peta modul lama terlipat ke kanon', () => {
    const nilai = [...new Set(Object.values(MODULE_PHASE_LEGACY))];
    expect(nilai).toContain('Specifics');           // premis: peta lama masih bertaksonomi lama
    nilai.forEach((v) => expect(phaseOf(v), v).not.toBeNull());
    Object.entries(MODULE_PHASE_LEGACY).forEach(([id, lama]) => {
      expect(PHASE_OF_MODULE[id], id).toBe(phaseOf(lama));
    });
  });

  it('pelipatan mengikuti KEPUTUSAN yang tercatat, bukan tebakan', () => {
    expect(phaseOf('Specifics')).toBe('Eksekusi');
    expect(phaseOf('Review & Arsip')).toBe('Arsip');
    expect(phaseOf('Pelaporan')).toBe('Arsip');
    expect(Object.keys(PHASE_ALIAS).sort()).toEqual(['Pelaporan', 'Review & Arsip', 'Specifics']);
  });

  it('fase yang tak dikenal menghasilkan null — bukan fase terdekat', () => {
    ['', '  ', 'Fieldwork', 'perencanaan', 'Arsip lama', undefined, null]
      .forEach((v) => expect(phaseOf(v as string), String(v)).toBeNull());
  });
});

/* ============================================================
   c · bobot & alokasi
   ============================================================ */
describe('bobot anggaran fase', () => {
  it('berjumlah tepat 1 — bukan "kira-kira 1"', () => {
    const sum = PHASE_ORDER.reduce((s, p) => s + PHASE_BUDGET_WEIGHT[p], 0);
    expect(Math.abs(sum - 1)).toBeLessThan(1e-9);
  });

  it('bobot lipatan = jumlah bobot asalnya (0,413 + 0,196 = 0,609)', () => {
    expect(PHASE_BUDGET_WEIGHT.Eksekusi).toBeCloseTo(0.413 + 0.196, 10);
    expect(PHASE_BUDGET_WEIGHT.Arsip).toBeCloseTo(0.054, 10);
    expect(PHASE_BUDGET_WEIGHT.Perencanaan).toBeCloseTo(0.152, 10);
    expect(PHASE_BUDGET_WEIGHT.Finalisasi).toBeCloseTo(0.185, 10);
  });

  it('alokasi menutup EKSAK ke totalnya, untuk banyak total', () => {
    [0, 1, 7, 640, 1480, 1840, 2200, 99999.5].forEach((total) => {
      const per = phaseBudgetHours(total);
      const jml = PHASE_ORDER.reduce((s, p) => s + per[p], 0);
      expect(jml, 'total=' + total).toBeCloseTo(total, 9);
    });
  });

  it('allocateExact menolak bobot nol/negatif tanpa mengarang', () => {
    expect(allocateExact(100, [])).toEqual([]);
    expect(allocateExact(100, [0, 0])).toEqual([0, 0]);
  });
});

/* ============================================================
   d · jam per fase — nol jam yang hilang, nol jam yang dikarang
   ============================================================ */
describe('phaseHoursOf', () => {
  it('Σ per fase + tanpa-fase == Σ jam masukan', () => {
    const entries = [
      { phase: 'Eksekusi', hours: 8 },
      { phase: 'Pelaporan', hours: 3 },      // ejaan lama → Arsip
      { phase: 'Specifics', hours: 5 },      // taksonomi cockpit → Eksekusi
      { phase: 'Antah-berantah', hours: 2 }, // tak dikenal → untagged
      { phase: 'Perencanaan' },              // tanpa jam
    ];
    const { byPhase, untagged } = phaseHoursOf(entries);
    expect(byPhase.Eksekusi).toBe(13);
    expect(byPhase.Arsip).toBe(3);
    expect(byPhase.Perencanaan).toBe(0);
    expect(untagged).toBe(2);
    const total = PHASE_ORDER.reduce((s, p) => s + byPhase[p], 0) + untagged;
    expect(total).toBe(18);
  });

  it('jam berfase asing DINYATAKAN, bukan dibuang', () => {
    const { byPhase, untagged } = phaseHoursOf([{ phase: 'Zzz', hours: 9 }]);
    expect(untagged).toBe(9);
    expect(PHASE_ORDER.reduce((s, p) => s + byPhase[p], 0)).toBe(0);
  });

  it('masukan kosong/null tidak melempar', () => {
    expect(phaseHoursOf(null).untagged).toBe(0);
    expect(phaseHoursOf([]).untagged).toBe(0);
  });
});

/* ============================================================
   e · gerbang sumber — bobot & daftar fase kedua tak boleh tumbuh lagi
   ============================================================ */
describe('gerbang sumber', () => {
  const kode = (f: string): string =>
    readFileSync(join(__dirname, f), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');

  it('Time & Budget tak menyimpan profil/bobot fase sendiri', () => {
    const src = kode('timebudget_model.ts');
    expect(src, 'profil fase kedua').not.toMatch(/TB_PHASE_PROFILE/);
    expect(src, 'bobot fase kedua').not.toMatch(/budgetShare|openingShare/);
  });

  it('nol periode/kalender karangan di model Time & Budget', () => {
    const src = kode('timebudget_model.ts') + kode('view_timebudget.tsx');
    const bulan = [...src.matchAll(/'\d{1,2}[–-]\d{1,2} (Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des)/g)].map((m) => m[0]);
    expect(bulan, 'periode dipaku: ' + bulan.join(' | ')).toEqual([]);
  });

  it('nol daftar fase literal di view — hanya kanon', () => {
    const src = kode('view_timebudget.tsx') + kode('view_cockpit2.tsx');
    expect(src).not.toMatch(/'Perencanaan',\s*'Eksekusi'/);
    expect(src, "'Pelaporan' tak boleh muncul sebagai kode").not.toMatch(/'Pelaporan'/);
    expect(src, "'Specifics' tak boleh muncul sebagai kode").not.toMatch(/'Specifics'/);
  });

  it('geometri Gantt karangan tidak kembali', () => {
    const src = kode('view_timebudget.tsx');
    expect(src, 'posisi timeline dipaku').not.toMatch(/\[4,\s*30,\s*67,\s*86\]/);
    expect(src).not.toMatch(/\[24,\s*36,\s*16,\s*12\]/);
  });

  it('gerbang ini benar-benar bisa merah (anti-tautologi)', () => {
    const palsu = "const TB_PHASE_PROFILE = [{ period: '02–20 Feb', budgetShare: 320 }]; const left=[4, 30, 67, 86];";
    expect(palsu).toMatch(/TB_PHASE_PROFILE/);
    expect(palsu).toMatch(/budgetShare/);
    expect([...palsu.matchAll(/'\d{1,2}[–-]\d{1,2} (Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des)/g)].length).toBe(1);
    expect(palsu).toMatch(/\[4,\s*30,\s*67,\s*86\]/);
  });
});

/* ============================================================
   f · SC-2 — cockpit & Time & Budget menjawab SAMA untuk perikatan yang sama
   ============================================================ */
describe('SC-2 — satu perikatan, satu anggaran per fase', () => {
  /* Oracle: kedua layar memanggil `phaseBudgetHours` atas `budgetHrs` yang sama
     (`FIRMFIN.engagementWip`). Uji ini menegakkan bahwa keduanya benar-benar
     memanggil kanon — bukan bahwa dua salinan kebetulan sepakat. */
  it('kedua layar mengambil bobotnya dari berkas kanon yang sama', () => {
    const ckp = readFileSync(join(__dirname, 'view_cockpit2.tsx'), 'utf8');
    const tb = readFileSync(join(__dirname, 'timebudget_model.ts'), 'utf8');
    expect(ckp).toMatch(/from '\.\/phase_canon'/);
    expect(tb).toMatch(/from '\.\/phase_canon'/);
    expect(ckp).toMatch(/phaseBudgetHours\(/);
    expect(tb).toMatch(/phaseBudgetHours\(/);
  });

  it('anggaran fase untuk 1840 jam identik & menutup eksak', () => {
    const per = phaseBudgetHours(1840);
    const jml = PHASE_ORDER.reduce((s: number, p: PhaseId) => s + per[p], 0);
    expect(jml).toBeCloseTo(1840, 9);
    /* Angka LAMA Time & Budget (320/1080/320/120) sudah tidak berlaku — dan
       memang begitu maksudnya; PRD §9 menyatakan angka ini berubah. */
    expect(Math.round(per.Eksekusi)).not.toBe(1080);
  });
});
