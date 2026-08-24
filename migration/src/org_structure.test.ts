/* ============================================================
   Gerbang modul `orgchart` (Struktur Organisasi) — sebelumnya NOL uji.

   Yang dipaku di sini adalah PERILAKU, bukan keberadaan simbol:

     a. setiap nilai `dept` yang ada di ORG terwakili di daftar divisi yang
        dirender — nol orang hilang;
     b. CAKUPAN: jumlah anggota seluruh divisi + yang tanpa divisi == jumlah
        orang yang punya entri ORG. Gerbang ini dibuktikan DAPAT MERAH dengan
        menjalankan derivasi LAMA (`Object.keys(DEPT_HEAD)`) berdampingan:
        derivasi lama kehilangan tepat satu orang, derivasi baru nol;
     c. orang tanpa entri ORG TIDAK diklasifikasikan sebagai puncak organisasi;
     d. ORG bebas siklus, DAN rentang kendali tetap berakhir pada data bersiklus;
     e. setiap id di DEPT_HEAD ada di roster (anti-kambuh; hijau sejak awal);
     f. gerbang sumber: nol <span onClick>/<div onClick> di view_pc_org.tsx,
        view memakai derivasi bersama, dan cincin fokus terlihat.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AMS } from './data';
import './data_people';
import {
  orgCycles, orgDepartments, orgDeptHeadsHilang, orgDeptNames, orgRoots,
  orgSpan, orgTree, orgUnreachable,
} from './org_structure';
import type { OrgMap } from './org_structure';

type Person = { id: string; name: string; role: string; grade: string };

const A = AMS as unknown as {
  STAFF: Person[];
  ORG: Record<string, { reports: string | null; dept: string }>;
  DEPT_HEAD: Record<string, string>;
};
const STAFF: Person[] = A.STAFF;
const ORG: OrgMap = A.ORG;
const DEPT_HEAD: Record<string, string> = A.DEPT_HEAD;

const SRC = join(__dirname, 'view_pc_org.tsx');
const src = (): string => readFileSync(SRC, 'utf8');
/* kode saja — komentar mengutip pola lama sebagai catatan sejarah */
const kode = (): string => src().replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/* ------------------------------------------------------------------
   a. Nol divisi hilang
   ------------------------------------------------------------------ */
describe('a — daftar divisi diturunkan dari struktur, bukan dari daftar kepala divisi', () => {
  it('setiap nilai `dept` pada ORG muncul di daftar divisi', () => {
    const dipakai = [...new Set(Object.keys(ORG).map((id) => String(ORG[id]?.dept || '')).filter(Boolean))];
    const dirender = orgDeptNames(ORG, DEPT_HEAD);
    const hilang = dipakai.filter((d) => !dirender.includes(d));
    expect(hilang, `divisi hilang dari tampilan: ${hilang.join(' | ')}`).toEqual([]);
  });

  it('divisi tanpa kepala tetap tampil, dengan kepala dinyatakan tidak ada', () => {
    const { departments } = orgDepartments(STAFF, ORG, DEPT_HEAD);
    const tanpaKepala = departments.filter((d) => d.headId === null);
    /* Hari ini: 'Kepemimpinan Firma' — divisi Managing Partner, yang memang
       tidak punya atasan divisi. Ia WAJIB ada, dengan headId null (bukan
       disembunyikan, bukan dikarang kepalanya). */
    expect(tanpaKepala.map((d) => d.dept)).toContain('Kepemimpinan Firma');
    tanpaKepala.forEach((d) => expect(d.members.length, `${d.dept} kosong`).toBeGreaterThan(0));
  });

  it('derivasi LAMA (Object.keys(DEPT_HEAD)) memang kehilangan divisi — gerbang ini bisa merah', () => {
    const lama = Object.keys(DEPT_HEAD);
    const baru = orgDeptNames(ORG, DEPT_HEAD);
    expect(baru.length).toBeGreaterThan(lama.length);
    expect(lama).not.toContain('Kepemimpinan Firma');
    expect(baru).toContain('Kepemimpinan Firma');
  });
});

/* ------------------------------------------------------------------
   b. Gerbang CAKUPAN — bukan tie-out
   ------------------------------------------------------------------ */
describe('b — cakupan: nol orang hilang dari tab Divisi', () => {
  /** Sisi kanan dihitung dari ORG langsung, BUKAN dari daftar divisi. */
  const berOrg = (): number => STAFF.filter((s) => !!ORG[s.id]).length;

  it('jumlah anggota seluruh divisi + tanpa divisi == jumlah orang ber-entri ORG', () => {
    const { departments, tanpaDivisi } = orgDepartments(STAFF, ORG, DEPT_HEAD);
    const terhitung = departments.reduce((n, d) => n + d.members.length, 0) + tanpaDivisi.length;
    expect(terhitung).toBe(berOrg());
  });

  it('membuang satu divisi membuat cakupan MERAH (gerbang tidak tautologis)', () => {
    const { departments } = orgDepartments(STAFF, ORG, DEPT_HEAD);
    const dipotong = departments.filter((d) => d.dept !== 'Kepemimpinan Firma');
    const terhitung = dipotong.reduce((n, d) => n + d.members.length, 0);
    expect(terhitung).toBeLessThan(berOrg());
  });

  it('derivasi LAMA kehilangan Managing Partner secara spesifik', () => {
    const lamaMembers = Object.keys(DEPT_HEAD)
      .flatMap((d) => STAFF.filter((s) => ORG[s.id]?.dept === d).map((s) => s.id));
    const baruMembers = orgDepartments(STAFF, ORG, DEPT_HEAD)
      .departments.flatMap((d) => d.members.map((s) => s.id));
    const hilang = baruMembers.filter((id) => !lamaMembers.includes(id));
    expect(hilang, 'derivasi lama seharusnya kehilangan tepat Managing Partner').toEqual(['EMP-001']);
  });

  it('setiap orang ber-entri ORG muncul TEPAT SEKALI di seluruh divisi', () => {
    const { departments, tanpaDivisi } = orgDepartments(STAFF, ORG, DEPT_HEAD);
    const semua = [...departments.flatMap((d) => d.members.map((s) => s.id)), ...tanpaDivisi.map((s) => s.id)];
    const kembar = semua.filter((id, i) => semua.indexOf(id) !== i);
    expect(kembar, `muncul ganda: ${kembar.join(' | ')}`).toEqual([]);
  });
});

/* ------------------------------------------------------------------
   c. Puncak organisasi yang sah vs belum punya atasan
   ------------------------------------------------------------------ */
describe('c — orang tanpa garis pelaporan bukan puncak organisasi', () => {
  it('data hari ini: tepat satu puncak yang sah, nol yatim', () => {
    const { puncak, tanpaAtasan } = orgRoots(STAFF, ORG);
    expect(puncak.map((p) => p.id)).toEqual(['EMP-001']);
    expect(tanpaAtasan).toEqual([]);
  });

  it('karyawan baru tanpa entri ORG masuk `tanpaAtasan`, bukan `puncak`', () => {
    const baru: Person = { id: 'EMP-999', name: 'Karyawan Baru', role: 'Junior Auditor', grade: 'Junior' };
    const { puncak, tanpaAtasan } = orgRoots([...STAFF, baru], ORG);
    expect(puncak.map((p) => p.id)).toEqual(['EMP-001']);
    expect(tanpaAtasan.map((o) => o.person.id)).toEqual(['EMP-999']);
    expect(tanpaAtasan[0].alasan).toBe('tanpa-entri');
  });

  it('atasan yang tak ada di roster juga bukan alasan menjadi puncak', () => {
    const baru: Person = { id: 'EMP-998', name: 'Anak Yatim', role: 'Senior', grade: 'Senior' };
    const org: OrgMap = { ...ORG, 'EMP-998': { reports: 'EMP-TIDAK-ADA', dept: 'Audit & Asurans' } };
    const { puncak, tanpaAtasan } = orgRoots([...STAFF, baru], org);
    expect(puncak.map((p) => p.id)).toEqual(['EMP-001']);
    expect(tanpaAtasan.map((o) => o.alasan)).toEqual(['atasan-tak-dikenal']);
  });

  it('derivasi LAMA (!reports) menyamakan yatim dengan Managing Partner', () => {
    const baru: Person = { id: 'EMP-999', name: 'Karyawan Baru', role: 'Junior Auditor', grade: 'Junior' };
    const staff = [...STAFF, baru];
    const akarLama = staff.filter((s) => !(ORG[s.id] || {}).reports).map((s) => s.id);
    expect(akarLama).toEqual(['EMP-001', 'EMP-999']);
    expect(orgRoots(staff, ORG).puncak.map((p) => p.id)).toEqual(['EMP-001']);
  });
});

/* ------------------------------------------------------------------
   d. Siklus
   ------------------------------------------------------------------ */
describe('d — siklus pelaporan', () => {
  it('ORG produksi bebas siklus', () => {
    const cyc = orgCycles(ORG);
    expect(cyc, `lingkaran pelaporan: ${cyc.map((c) => c.join('→')).join(' | ')}`).toEqual([]);
  });

  it('orgCycles menemukan lingkaran yang ditanam', () => {
    const org: OrgMap = { A: { reports: 'B', dept: 'X' }, B: { reports: 'A', dept: 'X' }, C: { reports: 'A', dept: 'X' } };
    expect(orgCycles(org)).toEqual([['A', 'B']]);
  });

  it('rentang kendali BERAKHIR pada data bersiklus (tidak menggantung)', () => {
    const staff: Person[] = ['A', 'B', 'C'].map((id) => ({ id, name: id, role: '', grade: 'Junior' }));
    const org: OrgMap = { A: { reports: 'B', dept: 'X' }, B: { reports: 'A', dept: 'X' }, C: { reports: 'A', dept: 'X' } };
    const span = orgSpan(staff, org);
    /* A→B→A: dari A terjangkau B dan C; dari B terjangkau A dan C. Yang penting:
       fungsinya SELESAI dan tidak menghitung orang yang sama dua kali. */
    expect(span.get('A')).toEqual({ direct: 2, total: 2 });
    expect(span.get('B')).toEqual({ direct: 1, total: 2 });
    expect(span.get('C')).toEqual({ direct: 0, total: 0 });
  });

  it('pohon render BERAKHIR pada data bersiklus, dan yang tak terjangkau dilaporkan', () => {
    const staff: Person[] = ['A', 'B', 'R'].map((id) => ({ id, name: id, role: '', grade: 'Junior' }));
    const org: OrgMap = { R: { reports: null, dept: 'X' }, A: { reports: 'B', dept: 'X' }, B: { reports: 'A', dept: 'X' } };
    const { puncak } = orgRoots(staff, org);
    const tree = orgTree(staff, org, puncak);
    expect(tree.map((n) => n.person.id)).toEqual(['R']);
    expect(orgUnreachable(staff, tree).map((s) => s.id)).toEqual(['A', 'B']);
  });

  it('rentang kendali produksi menutup ke roster: total bawahan Managing Partner == seluruh staf lain', () => {
    const span = orgSpan(STAFF, ORG);
    expect(span.get('EMP-001')?.total).toBe(STAFF.length - 1);
  });
});

/* ------------------------------------------------------------------
   e. Kepala divisi ada di roster
   ------------------------------------------------------------------ */
describe('e — kepala divisi', () => {
  /* Hijau sejak sebelum perbaikan (data DEPT_HEAD hari ini bersih). Nilainya
     sebagai gerbang anti-kambuh: kalau kelak DEPT_HEAD menunjuk id yang tak ada,
     tampilan TIDAK boleh diam-diam menuliskan idnya sebagai nama orang. */
  it('setiap id pada DEPT_HEAD ada di roster', () => {
    const hilang = orgDeptHeadsHilang(DEPT_HEAD, STAFF);
    expect(hilang, `kepala divisi tak ada di roster: ${hilang.map((h) => `${h.dept}=${h.headId}`).join(' | ')}`).toEqual([]);
  });

  it('kepala yang tak ada di roster ditandai `headHilang`, bukan dirender sebagai nama', () => {
    const { departments } = orgDepartments(STAFF, ORG, { ...DEPT_HEAD, 'Audit & Asurans': 'EMP-TIDAK-ADA' });
    const d = departments.find((x) => x.dept === 'Audit & Asurans');
    expect(d?.headHilang).toBe(true);
  });
});

/* ------------------------------------------------------------------
   f. Gerbang sumber a11y & pemakaian derivasi bersama
   ------------------------------------------------------------------ */
describe('f — view_pc_org.tsx', () => {
  it('nol <span onClick> / <div onClick>', () => {
    const pelanggar = [...kode().matchAll(/<(div|span)\b[^>]*\sonClick=/g)].map((m) => m[0].slice(0, 70));
    expect(pelanggar, `kontrol palsu: ${pelanggar.join(' | ')}`).toEqual([]);
  });

  it('simpul bagan dan kartu anggota divisi adalah <button> native', () => {
    const baris = (cls: string): string => kode().split('\n').find((l) => l.includes(`className="${cls}`) || l.includes(`'${cls} '`) || l.includes(`${cls} '`)) || '';
    expect(kode(), 'simpul bagan bukan <button>').toMatch(/<button[^>]*org-node|org-node[^>]*<\/button>/s);
    expect(baris('org-member'), 'kartu anggota divisi tak ditemukan').not.toBe('');
    expect(kode()).toMatch(/<button[\s\S]{0,200}?org-member/);
  });

  it('cincin fokus terlihat untuk simpul bagan dan kartu anggota', () => {
    expect(src()).toMatch(/\.org-node:focus-visible/);
    expect(src()).toMatch(/\.org-member:focus-visible/);
  });

  it('daftar divisi TIDAK lagi diturunkan dari Object.keys(DEPT_HEAD)', () => {
    expect(kode()).not.toMatch(/Object\.keys\(\s*A?\.?DEPT_HEAD/);
  });

  it('view memakai derivasi bersama org_structure (bukan salinan privat)', () => {
    expect(kode()).toMatch(/from '\.\/org_structure'/);
    ['orgDepartments', 'orgRoots', 'orgSpan', 'orgTree'].forEach((fn) => {
      expect(kode(), `${fn} tidak dipakai view`).toMatch(new RegExp(`\\b${fn}\\b`));
    });
  });

  it('tidak ada lagi rekursi span tanpa penjaga siklus di view', () => {
    expect(kode()).not.toMatch(/const spanAll\s*=/);
  });
});
