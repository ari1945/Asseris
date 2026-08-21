/* ============================================================
   PRD `docs/prd-regref-tahap-a2.md` — SC-A1..SC-A8 · SC-A11.

   Tiga besaran regulatori berhenti menjadi konstanta telanjang, dan satu
   keempat ikut. Uji di sini memaku dua hal yang mudah hilang:

     · yang DIPILIH menurut tanggal benar-benar berubah ketika tanggalnya
       berubah (kalau tidak, "registry" hanya wadah dengan satu isi);
     · yang tak tercakup TIDAK memakai set tahun lain.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AMS } from './data';
import { ASOF_DATE, RATE } from './canon_base';
import { CIT_REGISTRY, citRateOn, citRateRequired, citRatePct, globeMinRateOn, globeMinRateRequired } from './canon_cit';
import { PPL_REGISTRY, PPL_REQ_PMK186, pplPeriod, pplReqOn, pplYearOf, skpInYear } from './canon_ppl';
import { REGIME_JK, REGIME_PIE, ROTATION_REGISTRY, regimeOf, rotationRegimesOn } from './canon_rotation';
import { SEED_TODAY, SEED_YEAR } from './data_clock';
import { regrefIssues } from './canon_regref';

const SRC = __dirname;
const read = (f: string) => readFileSync(join(SRC, f), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

/* ------------------------------------------------------------------
   R3 — tarif PPh Badan
   ------------------------------------------------------------------ */

describe('SC-A6 — tarif PPh Badan dipilih menurut Tahun Pajak', () => {
  it('registry tidak cacat struktural', () => {
    expect(regrefIssues(CIT_REGISTRY, 'PPh Badan')).toEqual([]);
  });

  it('2019 = 25%, 2020 = 22%, 2025 = 22% — pemilihannya BENAR-BENAR terjadi', () => {
    /* Tanpa satu set bernilai berbeda, uji "dipilih menurut tanggal" akan lolos
       bahkan bila pemilihannya tak pernah dijalankan. */
    expect(citRateOn('2019-06-30').value).toBe(0.25);
    expect(citRateOn('2020-01-01').value).toBe(0.22);
    expect(citRateOn('2025-12-31').value).toBe(0.22);
  });

  it('dasar hukum ikut berpindah bersama tarifnya', () => {
    expect(citRateOn('2019-06-30').set?.basis).toMatch(/UU 36\/2008/);
    expect(citRateOn('2021-06-30').set?.basis).toMatch(/Perpu 1\/2020/);
    expect(citRateOn('2026-03-09').set?.basis).toMatch(/UU 7\/2021/);
  });

  it('masa sebelum 2010 TIDAK dijawab dengan set terdekat — ia MEMBLOKIR', () => {
    const look = citRateOn('2009-12-31');
    expect(look.status).toBe('no-coverage');
    expect(look.value).toBeNull();
    expect(look.blocked).toBe(true);
    expect(() => citRateRequired('2009-12-31')).toThrow();
  });

  it('tanggal tak terbaca juga memblokir, bukan diam-diam memakai yang terakhir', () => {
    expect(citRateOn('bukan-tanggal').blocked).toBe(true);
    expect(citRateOn('').blocked).toBe(true);
  });

  it('SC-A11 — nol-delta: canon_base.RATE tetap 0,22 dan berasal dari registry', () => {
    expect(ASOF_DATE).toBe('2025-12-31');
    expect(RATE).toBe(0.22);
    expect(RATE).toBe(citRateOn(ASOF_DATE).value);
  });

  it('label persen MENGIKUTI tarifnya', () => {
    expect(citRatePct(0.22)).toBe('22%');
    expect(citRatePct(0.25)).toBe('25%');
    expect(citRatePct(0.225)).toBe('22.5%');
  });
});

describe('SC-A8 — tarif minimum GloBE terdaftar sebagai data regulatori', () => {
  it('berlaku sejak Tahun Pajak 2025; sebelum itu tak tercakup', () => {
    expect(globeMinRateOn('2025-06-30').value).toBe(15);
    const before = globeMinRateOn('2024-12-31');
    expect(before.status).toBe('no-coverage');
    expect(before.blocked).toBe(true);
    expect(() => globeMinRateRequired('2024-12-31')).toThrow();
  });

  it('modul Pengungkapan Baru tak lagi mengetik ambangnya', () => {
    const src = read('view_newdisc.tsx');
    expect(src).toContain('globeMinRateRequired');
    expect(src).not.toMatch(/P2_MIN_RATE\s*=\s*15/);
  });
});

/* ------------------------------------------------------------------
   R1 — kewajiban PPL
   ------------------------------------------------------------------ */

describe('SC-A1..SC-A3 — kewajiban PPL berkunci masa berlaku', () => {
  it('registry tidak cacat struktural, dan MENUNJUK ambangnya (bukan menyalin)', () => {
    expect(regrefIssues(PPL_REGISTRY, 'PPL')).toEqual([]);
    /* `toBe` bukan `toEqual`: salinan akan lolos `toEqual` lalu hidup sendiri. */
    expect(pplReqOn('2026-03-09').value).toBe(PPL_REQ_PMK186);
  });

  it('masa sebelum PMK 186/2021 TIDAK dijawab dengan ambang setelahnya', () => {
    const look = pplReqOn('2021-12-31');
    expect(look.status).toBe('no-coverage');
    expect(look.value).toBeNull();
    expect(look.blocked).toBe(true);
  });

  it('SC-A2 — tahun PPL DITURUNKAN dari tanggal, tidak diketik', () => {
    expect(pplYearOf('2027-01-01')).toBe(2027);
    expect(pplYearOf('2026-03-09')).toBe(2026);
    expect(pplYearOf('bukan-tanggal')).toBeNull();
    /* Nilai benih tetap 2026 — nol-delta — tetapi asalnya kini satu klok. */
    expect((AMS as unknown as { CPE_REQ: { year: number } }).CPE_REQ.year).toBe(pplYearOf(SEED_TODAY));
    expect(AMS.TODAY).toBe(SEED_TODAY);
    expect(SEED_YEAR).toBe(2026);
  });

  it('SC-A2 — tak ada lagi tahun beku di luar klok benih', () => {
    expect(read('data_part1.ts'), 'ROTATION_YEAR diketik lagi').not.toMatch(/ROTATION_YEAR\s*=\s*\d{4}/);
    expect(read('data_part1.ts'), 'CPE_REQ.year diketik lagi').not.toMatch(/CPE_REQ\s*=\s*\{[^}]*year:\s*20\d\d/);
    expect(read('data_part4.ts'), 'TODAY diketik lagi').not.toMatch(/TODAY\s*=\s*'20\d\d-/);
  });

  it('SC-A3 — catatan SKP disaring ke tahun PPL yang dinilai', () => {
    const entries = [
      { t: 'A', type: 'Terstruktur', skp: 30, date: '2026-02-01', topic: 'akuntansi' },
      { t: 'B', type: 'Terstruktur', skp: 30, date: '2025-02-01', topic: 'akuntansi' },
      { t: 'C', type: 'Tidak Terstruktur', skp: 10, date: '2026-03-01' },
      { t: 'D', type: 'Terstruktur', skp: 99, date: 'entah' },
    ];
    expect(skpInYear(entries, 2026).map((e) => e.t)).toEqual(['A', 'C']);
    /* Entri tanpa tanggal terbaca DIBUANG: ia tak dapat diklaim milik tahun mana pun. */
    expect(skpInYear(entries, 2025).map((e) => e.t)).toEqual(['B']);

    const p26 = pplPeriod(entries, '2026-03-09');
    expect(p26.year).toBe(2026);
    expect(p26.status?.structured).toBe(30);
    expect(p26.status?.countedTotal).toBe(40);
    const p25 = pplPeriod(entries, '2025-03-09');
    expect(p25.status?.structured).toBe(30);
    expect(p25.status?.countedTotal).toBe(30);
  });

  it('masa tak tercakup: TIDAK ada verdict, bukan verdict palsu', () => {
    const p = pplPeriod([{ t: 'A', type: 'Terstruktur', skp: 40, date: '2021-02-01' }], '2021-03-09');
    expect(p.req).toBeNull();
    expect(p.status).toBeNull();
    expect(p.look.note.length).toBeGreaterThan(40);
  });

  it('konsumen PPL tak lagi menyimpan ambang literal sendiri', () => {
    for (const f of ['view_people.tsx', 'view_personal.tsx', 'data_licensing.ts']) {
      expect(read(f), f).toContain('pplReqOn');
      expect(read(f), `${f}: fallback literal ambang PPL kembali`)
        .not.toMatch(/annual:\s*40[\s\S]{0,40}structured:\s*30/);
    }
  });
});

/* ------------------------------------------------------------------
   R2 — batas rotasi AP
   ------------------------------------------------------------------ */

describe('SC-A4..SC-A5 — batas rotasi AP terdaftar sebagai data regulatori', () => {
  it('registry tidak cacat struktural, dan MENUNJUK rezimnya', () => {
    expect(regrefIssues(ROTATION_REGISTRY, 'Rotasi AP')).toEqual([]);
    const v = rotationRegimesOn('2026-03-09').value;
    expect(v?.pie).toBe(REGIME_PIE);
    expect(v?.jk).toBe(REGIME_JK);
  });

  it('masa sebelum POJK 13/2017 tak tercakup — bukan dijawab 3 tahun', () => {
    const look = rotationRegimesOn('2016-12-31');
    expect(look.status).toBe('no-coverage');
    expect(look.value).toBeNull();
    expect(look.blocked).toBe(true);
  });

  it('rezim yang disuntikkan benar-benar dipakai `regimeOf`', () => {
    const alt = {
      pie: { ...REGIME_PIE, limit: 4, basis: 'UJI' },
      jk: { ...REGIME_JK, limit: 2, basis: 'UJI' },
      nonpie: { limit: 0, cooloff: 0, basis: 'UJI', label: 'UJI' },
    };
    expect(regimeOf({ listed: true, regimes: alt }).limit).toBe(4);
    expect(regimeOf({ sektorJK: true, regimes: alt }).limit).toBe(2);
    /* tanpa suntikan → konstanta modul (perilaku lama, dipertahankan) */
    expect(regimeOf({ listed: true }).limit).toBe(REGIME_PIE.limit);
  });

  it('SC-A4 — fallback literal `rotationLimit || 5` DICABUT', () => {
    expect(read('data_licensing.ts')).not.toMatch(/rotationLimit\s*\|\|\s*\d/);
    expect(read('data_licensing.ts')).toContain("'tak-dinilai'");
  });

  it('SC-A4 — AP tanpa deklarasi independensi tidak dilaporkan "Patuh"', () => {
    const src = read('data_licensing.ts');
    expect(src).toMatch(/rotState:\s*RotTier\s*=\s*limit == null \? 'tak-dinilai'/);
    expect(src).toMatch(/Rotasi Tak Dapat Dinilai/);
  });

  it('SC-A5 — spanduk rotasi mengutip basis registry, bukan string yang diketik', () => {
    const src = read('view_people.tsx');
    expect(src).toContain('basisOf(');
    expect(src, 'kutipan hukum diketik lagi di view').not.toContain('UU 5/2011 & POJK 13/2017');
    expect(src, 'kutipan hukum diketik lagi di view').not.toContain('POJK 13/2017 · PP 20/2015');
  });

  it('SC-A11 — nol-delta: masa tugas & batas seed tidak bergeser', () => {
    const ind = (AMS as unknown as { INDEPENDENCE: Array<{ id: string; tenure: number; rotationLimit: number; rotationBasis: string }> }).INDEPENDENCE;
    const jk = ind.find((d) => d.id === 'EMP-004');
    expect(jk?.rotationLimit).toBe(3);
    expect(jk?.rotationBasis).toMatch(/POJK 13/);
    const pie = ind.find((d) => d.id === 'EMP-001');
    expect(pie?.rotationLimit).toBe(5);
    expect(pie?.rotationBasis).toMatch(/PP 20\/2015/);
  });
});
