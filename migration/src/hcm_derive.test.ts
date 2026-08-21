/* ============================================================
   Gerbang modul `hcm` (Human Capital) — prompt perbaikan 15-hcm

   Dua jenis gerbang bercampur di sini, sengaja:

     · GERBANG PERILAKU atas fungsi murni `hcm_derive` — membuktikan
       ketiadaan data tampil sebagai ketiadaan, bukan sebagai angka.
     · GERBANG SUMBER atas `view_people.tsx` / `view_pc_hcm.tsx` —
       membuktikan pola lamanya tak ditulis ulang. Inilah yang MERAH
       pada HEAD sebelum perbaikan; gerbang perilaku hanya bisa merah
       sebagai "modul belum ada", yang tak membuktikan apa pun sendiri.

   Berkas uji WAJIB bebas `any` (CLAUDE.md §Test coverage).
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  APPRAISAL_NO_CYCLE, APPRAISAL_NO_GOALS, EMP_ID_BLOCK, UNKNOWN, UNRECORDED,
  appraisalOf, empIdsOf, nextEmpId, profileOf,
} from './hcm_derive';
import type { CompetencyBook, StaffProfileRow } from './hcm_derive';
import { tenureOf } from './canon_hcm';
import type { PerfGoal, PerfPersonInput } from './canon_perf';

/* ---------- pembaca sumber (pola `kode()` dari cockpit_conventions.test.ts) ---------- */
const bacaKode = (f: string): string =>
  readFileSync(join(__dirname, f), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

/* ---------- perkakas uji ---------- */
const goals = (a: number, b: number, c: number, d: number): PerfGoal[] => ([
  { kpi: 'Realisasi jam terhadap anggaran', target: '≤ 100%', actual: '96%', score: a, weight: 30 },
  { kpi: 'Kualitas kertas kerja (skor reviu)', target: '≥ 4,3', actual: '4,5', score: b, weight: 30 },
  { kpi: 'Pemenuhan PPL (SKP)', target: '40 SKP', actual: '12 SKP', score: c, weight: 15 },
  { kpi: 'Supervisi & coaching junior', target: '≥ 4,0', actual: '4,4', score: d, weight: 25 },
]);

const rec = (): PerfPersonInput => ({
  pot: 4.4,
  steps: { manager: { by: 'EMP-007', byName: 'Anindya Pramesti', at: '2025-12-18', seeded: true } },
});

/* ============================================================
   SC-1 (a) — penilaian TIDAK dapat diturunkan dari `rating`
   ============================================================ */
describe('SC-1 — tanpa catatan kinerja, hasilnya "tidak ada penilaian", bukan angka', () => {
  it('pegawai tanpa catatan kinerja: nol dimensi, skor null, sebab dinyatakan', () => {
    const a = appraisalOf('EMP-305', undefined, undefined);
    expect(a.available).toBe(false);
    expect(a.dims).toEqual([]);
    expect(a.score).toBeNull();
    expect(a.note).toBe(APPRAISAL_NO_CYCLE);
  });

  it('catatan kinerja ada tetapi sasaran belum ditetapkan: tetap nol dimensi', () => {
    const a = appraisalOf('EMP-032', rec(), undefined);
    expect(a.available).toBe(false);
    expect(a.dims).toEqual([]);
    expect(a.score).toBeNull();
    expect(a.note).toBe(APPRAISAL_NO_GOALS);
  });

  /* Gerbang STRUKTURAL: `rating` bukan parameter, jadi mengarang dimensi
     dari sana mustahil tanpa mengubah tanda tangan fungsi — dan mengubahnya
     memerahkan uji ini. Tak bisa dilewati dengan mengganti konstanta. */
  it('appraisalOf tidak menerima `rating` sebagai argumen', () => {
    expect(appraisalOf.length).toBe(3);
    expect(bacaKode('hcm_derive.ts')).not.toMatch(/\brating\b/);
  });
});

/* ============================================================
   SC-2 (b) — rating sama, catatan berbeda ⇒ penilaian BERBEDA
   ============================================================ */
describe('SC-2 — dua orang ber-rating sama menghasilkan penilaian berbeda', () => {
  /* Keduanya ber-`rating` 4,5 di roster. Yang membedakan hanyalah KPI-nya. */
  const kuat = appraisalOf('EMP-A', rec(), goals(4.6, 4.5, 3.5, 4.4));
  const lemah = appraisalOf('EMP-B', rec(), goals(3.9, 3.4, 2.0, 3.6));

  it('skor tertimbangnya berbeda', () => {
    expect(kuat.score).not.toBeNull();
    expect(lemah.score).not.toBeNull();
    expect(kuat.score).not.toBe(lemah.score);
  });

  it('setiap dimensi punya bobot & ukuran yang dapat ditelusuri', () => {
    expect(kuat.dims).toHaveLength(4);
    expect(kuat.dims.reduce((s, d) => s + d.weight, 0)).toBe(100);
    for (const d of kuat.dims) {
      expect(d.kpi.length).toBeGreaterThan(0);
      expect(d.target.length).toBeGreaterThan(0);
      expect(d.actual.length).toBeGreaterThan(0);
    }
  });

  it('dimensinya BUKAN satu angka yang digeser ±0,1/0,2', () => {
    const skor = kuat.dims.map((d) => d.score).sort((x, y) => x - y);
    /* Pola lama: rentang tepat 0,3 (rating−0,2 … rating+0,1) untuk siapa pun. */
    expect(skor[skor.length - 1] - skor[0]).not.toBeCloseTo(0.3, 6);
  });

  it('penilai & tanggalnya terbawa — penilaian punya pembubuh', () => {
    expect(kuat.assessorName).toBe('Anindya Pramesti');
    expect(kuat.assessedAt).toBe('2025-12-18');
    expect(kuat.seeded).toBe(true);
  });
});

/* ============================================================
   SC-3 (c) — profil tanpa baris tak menyatakan kepatuhan apa pun
   ============================================================ */
describe('SC-3 — ketiadaan data personal tampil sebagai ketiadaan', () => {
  const KLAIM = /^(Aktif|Lengkap|Valid|Tetap)$/;
  const kosong = profileOf({ id: 'EMP-305', role: 'Senior Auditor', joined: 2024 }, {});

  it('ditandai `unrecorded`', () => {
    expect(kosong.unrecorded).toBe(true);
  });

  it('nol nilai yang terbaca sebagai pernyataan kepatuhan', () => {
    const nilai = [kosong.location, kosong.birth, kosong.gender, kosong.empType, kosong.band,
      kosong.salaryBand, kosong.npwp, kosong.bpjsKes, kosong.bpjsTk,
      kosong.emergency.name, kosong.emergency.rel, kosong.emergency.phone];
    const pelanggar = nilai.filter((v) => KLAIM.test(v));
    expect(pelanggar, `nilai karangan: ${pelanggar.join(' | ')}`).toEqual([]);
    expect(kosong.empType).toBe(UNRECORDED);
    expect(kosong.bpjsKes).toBe(UNRECORDED);
    expect(kosong.bpjsTk).toBe(UNRECORDED);
    expect(kosong.location).toBe(UNKNOWN);
    expect(kosong.band).toBe(UNKNOWN);
  });

  it('dokumen & keahlian KOSONG, bukan tiga baris karangan ber-status "Valid"', () => {
    expect(kosong.docs).toEqual([]);
    expect(kosong.skills).toEqual([]);
  });

  it('linimasa fallback diturunkan dari roster — laporan, bukan karangan', () => {
    expect(kosong.timeline).toEqual([['2024', 'Bergabung sebagai Senior Auditor']]);
    expect(profileOf({ id: 'EMP-306' }, {}).timeline).toEqual([]);
  });

  it('MASKING dipertahankan — data yang ADA tapi tak boleh dilihat', () => {
    expect(kosong.nik).toBe('3174••••••••');
    expect(kosong.phone).toBe('0811-•••-305');
  });

  it('keahlian terisi bila COMPETENCY_ACTUAL memuat orangnya', () => {
    const comp: CompetencyBook = {
      list: [{ id: 'CO-01', name: 'Pengujian Substantif' }, { id: 'CO-02', name: 'Kertas Kerja' }],
      actual: { 'EMP-021': { 'CO-01': 4, 'CO-02': 4 } },
    };
    expect(profileOf({ id: 'EMP-021' }, {}, comp).skills).toEqual([['Pengujian Substantif', 4], ['Kertas Kerja', 4]]);
    expect(profileOf({ id: 'EMP-305' }, {}, comp).skills).toEqual([]);
  });

  it('baris yang ADA tetap utuh — perbaikan ini tak melucuti data nyata', () => {
    const baris: StaffProfileRow = {
      location: 'Jakarta (HQ)', empType: 'Tetap', bpjsKes: 'Aktif', bpjsTk: 'Aktif', band: 'S2',
      docs: [['Sertifikat CA', 'Valid']],
    };
    const p = profileOf({ id: 'EMP-021' }, { 'EMP-021': baris });
    expect(p.unrecorded).toBe(false);
    expect(p.empType).toBe('Tetap');
    expect(p.bpjsKes).toBe('Aktif');
    expect(p.docs).toEqual([['Sertifikat CA', 'Valid']]);
  });
});

/* ============================================================
   SC-4 (d) — id karyawan baru unik terhadap SELURUH roster
   ============================================================ */
describe('SC-4 — id karyawan baru tak dapat menabrak siapa pun', () => {
  /* Persis id yang ada di seed hari ini (data_part1 + data_roster + exits). */
  const SEED = ['EMP-001', 'EMP-021', 'EMP-101', 'EMP-102', 'EMP-103', 'EMP-208',
    'EMP-428', 'EMP-501', 'EMP-601', 'EMP-914', 'EMP-924'];

  it('tidak menabrak blok roster 1xx — cacat pola lama pada penambahan KEDUA', () => {
    /* Pola lama: 'EMP-' + (100 + list.length) → EMP-100, lalu EMP-101 = Ayu Prasetya. */
    const pertama = nextEmpId(SEED);
    const kedua = nextEmpId([...SEED, pertama]);
    expect(SEED).toContain('EMP-101');
    expect([pertama, kedua]).not.toContain('EMP-101');
    expect(pertama).toBe('EMP-' + EMP_ID_BLOCK);
    expect(kedua).toBe('EMP-701');
  });

  it('empat penambahan berturut menghasilkan empat id berbeda', () => {
    const punya = [...SEED];
    const baru: string[] = [];
    for (let i = 0; i < 4; i++) {
      const id = nextEmpId(punya);
      baru.push(id);
      punya.push(id);
    }
    expect(new Set(baru).size).toBe(4);
    expect(baru.filter((id) => SEED.includes(id))).toEqual([]);
  });

  it('setelah satu karyawan tambahan DIHAPUS, id berikutnya tetap unik terhadap roster', () => {
    const a = nextEmpId(SEED);
    const b = nextEmpId([...SEED, a]);
    const c = nextEmpId([...SEED, b]); /* `a` dihapus */
    const roster = [...SEED, b];
    expect(roster).not.toContain(c);
    expect(new Set([...roster, c]).size).toBe(roster.length + 1);
  });

  it('id BUKAN turunan panjang daftar — daftar sama panjang, isi beda, hasil beda', () => {
    expect(nextEmpId(['EMP-700', 'EMP-701'])).not.toBe(nextEmpId(['EMP-001', 'EMP-002']));
  });

  it('blok habis ⇒ string kosong, bukan id milik orang lain', () => {
    const penuh: string[] = [];
    for (let n = 700; n <= 999; n++) penuh.push('EMP-' + String(n));
    expect(nextEmpId(penuh)).toBe('');
  });

  it('empIdsOf menggabungkan seluruh daftar & membuang yang bukan id pegawai', () => {
    expect(empIdsOf([{ id: 'EMP-001' }], [{ id: 'EMP-501' }], [{ id: 'C-101' }], null))
      .toEqual(['EMP-001', 'EMP-501']);
  });
});

/* ============================================================
   SC-5 (e) — masa kerja dari klok SSOT
   ============================================================ */
describe('SC-5 — masa kerja mengikuti AMS.TODAY, bukan tahun literal', () => {
  it('klok maju satu tahun ⇒ masa kerja bertambah satu', () => {
    expect(tenureOf(2020, '2026-03-09')).toBe(6);
    expect(tenureOf(2020, '2027-03-09')).toBe(7);
  });

  it('tanpa `joined` yang sahih, hasilnya null — bukan angka', () => {
    expect(tenureOf(undefined, '2026-03-09')).toBeNull();
  });
});

/* ============================================================
   SC-6 (f) & gerbang sumber — pola lama tak boleh ditulis ulang
   ============================================================ */
describe('SC-6 — gerbang sumber view_people.tsx', () => {
  const kode = (): string => bacaKode('view_people.tsx');

  it('nol aritmatika atas `rating` — dimensi tak boleh dikarang lagi', () => {
    const pelanggar = [...kode().matchAll(/\.rating\s*[+\-*/]|[+\-*/]\s*\w*\.rating\b/g)].map((m) => m[0]);
    expect(pelanggar, `aritmatika rating: ${pelanggar.join(' | ')}`).toEqual([]);
  });

  it('nol tahun literal dalam perhitungan masa kerja', () => {
    const pelanggar = [...kode().matchAll(/\b20\d\d\s*-\s*\w/g)].map((m) => m[0]);
    expect(pelanggar, `klok beku: ${pelanggar.join(' | ')}`).toEqual([]);
  });

  it('nol literal nama firma di dalam payload ekspor tersegel', () => {
    const pelanggar = [...kode().matchAll(/'KAP [^']*'/g)].map((m) => m[0]);
    expect(pelanggar, `nama firma hardcode: ${pelanggar.join(' | ')}`).toEqual([]);
  });

  it('id karyawan baru tak diturunkan dari panjang daftar', () => {
    expect(kode()).not.toMatch(/'EMP-'\s*\+/);
    expect(kode()).toMatch(/nextEmpId\(/);
  });

  it('penilaian kinerja memakai mesin canon_perf lewat hcm_derive', () => {
    expect(kode()).toMatch(/appraisalOf/);
  });
});

describe('SC-7 — gerbang sumber view_pc_hcm.tsx', () => {
  const kode = (): string => bacaKode('view_pc_hcm.tsx');

  it('nol fallback fabrikasi di dalam view — profileOf pindah ke modul murni', () => {
    const pelanggar = [...kode().matchAll(/\|\|\s*'(Aktif|Tetap|Lengkap|Valid|Jakarta \(HQ\))'/g)].map((m) => m[0]);
    expect(pelanggar, `fallback karangan: ${pelanggar.join(' | ')}`).toEqual([]);
  });

  it('nol tahun literal dalam perhitungan masa kerja', () => {
    const pelanggar = [...kode().matchAll(/\b20\d\d\s*-\s*\w/g)].map((m) => m[0]);
    expect(pelanggar, `klok beku: ${pelanggar.join(' | ')}`).toEqual([]);
  });

  it('profileOf diimpor dari hcm_derive, tidak didefinisikan ulang di view', () => {
    expect(kode()).not.toMatch(/function\s+profileOf\s*\(/);
    expect(kode()).toMatch(/from '\.\/hcm_derive'/);
  });
});
