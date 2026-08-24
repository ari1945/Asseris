/* ============================================================
   Gerbang modul `succession` (Suksesi & Karier) — sebelumnya NOL uji.

   Modul ini sudah MEMBANDINGKAN klaim kesiapan di data dengan kesiapan yang
   diturunkan mesin (`canon_succession`). Cacatnya ada pada apa yang terjadi
   sesudah pembandingan: hasilnya dihitung lalu dibuang, dan peringatannya
   menyusut jadi satu glyph tanpa nama.

   Yang dipaku di sini PERILAKU, bukan keberadaan simbol:

     a. jumlah kontradiksi == jumlah kandidat yang label turunannya berbeda dari
        klaim data, DAN angka itu sampai ke lapisan tampilan (selector-nya diuji,
        bukan sekadar keberadaan variabelnya);
     b. klaim 'Siap sekarang' dengan sertifikasi kurang menghasilkan kontradiksi
        DAN daftar pemblokir ter-enumerasi — tak dapat dipuaskan dengan mengubah
        teks, karena yang diperiksa `kind` pemblokirnya;
     c. rujukan orang yang tidak ada di roster TIDAK menjadi orang berjenjang
        'Junior' dan TIDAK menghasilkan skor kesiapan — `readinessFor` bahkan
        tidak boleh dipanggil untuknya;
     d. gerbang sumber a11y: nol <tr onClick>/<span onClick>/<div onClick> di
        view_pc_org.tsx (ikut menutup modul `orgchart` di berkas yang sama);
     e. makna tidak disampaikan lewat glyph saja: nol '⚠' di dalam kode.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AMS } from './data';
import './data_people';
import { readinessOf } from './canon_succession';
import type { Readiness } from './canon_succession';
import { refLabel, successionBoard } from './succession_board';
import type { RoleInput, RosterPerson } from './succession_board';

interface LadderRow { grade: string; next?: string; criteria?: string[] }
interface IdpRow { target?: string; sponsor?: string; progress?: number; actions?: { a: string; s: string; due?: string }[] }
interface RoleRow {
  id: string; role: string; incumbent: string;
  critical?: string; riskOfLoss?: string; vacancyImpact?: string;
  successors: { id: string; readiness?: string; gaps?: string }[];
}

const A = AMS as unknown as {
  STAFF: RosterPerson[];
  byId: (id: string) => RosterPerson;
  SUCCESSION_ROLES: RoleRow[];
  CAREER_LADDER: LadderRow[];
  COMPETENCY_ACTUAL: Record<string, Record<string, number>>;
  COMPETENCY_REQ: Record<string, Record<string, number>>;
  IDP: Record<string, IdpRow>;
};

/* Wiring yang SAMA dengan view: kesiapan diturunkan dari tangga karier ×
   kompetensi × progres IDP. Sengaja diduplikasi di sini supaya uji punya
   oracle sendiri, bukan memanggil ulang kode yang diujinya. */
const readinessFor = (empId: string): Readiness => {
  const p = A.byId(empId);
  const rung = (A.CAREER_LADDER || []).find((r) => r.grade === p.grade);
  return readinessOf({
    cert: p.cert, currentGrade: p.grade, targetGrade: rung?.next,
    ladder: A.CAREER_LADDER, competencyActual: (A.COMPETENCY_ACTUAL || {})[empId],
    competencyRequired: (A.COMPETENCY_REQ || {})[rung?.next || ''] || (A.COMPETENCY_REQ || {})[p.grade],
    idp: (A.IDP || {})[empId],
  });
};

const board = () => successionBoard({ roles: A.SUCCESSION_ROLES, staff: A.STAFF, readinessFor });

const SRC = join(__dirname, 'view_pc_org.tsx');
const src = (): string => readFileSync(SRC, 'utf8');
/* kode saja — komentar mengutip pola lama sebagai catatan sejarah */
const kode = (): string => src().replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/* ------------------------------------------------------------------
   a. Kontradiksi dihitung — dan sampai ke layar
   ------------------------------------------------------------------ */
describe('a — jumlah klaim yang dibantah bukti', () => {
  it('sama dengan jumlah kandidat yang label turunannya berbeda dari klaim data', () => {
    /* oracle: dihitung langsung dari data, tanpa lewat selector yang diuji */
    let oracle = 0;
    for (const r of A.SUCCESSION_ROLES) {
      for (const s of r.successors) {
        if (!s.readiness) continue;
        if (!A.STAFF.some((p) => p.id === s.id)) continue;
        if (readinessFor(s.id).label !== s.readiness) oracle++;
      }
    }
    const b = board();
    expect(oracle, 'data demo harus memuat kontradiksi — kalau nol, gerbang ini tak membuktikan apa pun').toBeGreaterThan(0);
    expect(b.kpi.contradicting).toBe(oracle);
    expect(b.contradictions.length).toBe(oracle);
  });

  it('setiap kontradiksi menyebut klaim, turunan, dan pemblokirnya', () => {
    for (const c of board().contradictions) {
      expect(c.claimed, `${c.candidateId} tanpa klaim`).toBeTruthy();
      expect(c.derived, `${c.candidateId} tanpa turunan`).toBeTruthy();
      expect(c.derived).not.toBe(c.claimed);
      expect(c.candidateName, `${c.candidateId} tanpa nama`).toBeTruthy();
      expect(c.blockers.length, `${c.candidateId} tanpa pemblokir ter-enumerasi`).toBeGreaterThan(0);
    }
  });

  it('angka itu dirender, bukan berhenti di variabel', () => {
    /* Sebelum perbaikan: `const contradicting = …` muncul TEPAT SEKALI di
       berkas — dihitung lalu dibuang. */
    expect(kode(), 'jumlah kontradiksi tidak dirender sebagai KPI').toMatch(/value=\{[^}]*contradicting[^}]*\}/);
    expect(kode(), 'daftar kontradiksi tidak dirender').toMatch(/contradictions\.map/);
  });

  it('view memakai derivasi bersama succession_board (bukan salinan privat)', () => {
    expect(kode()).toMatch(/from '\.\/succession_board'/);
    expect(kode()).toMatch(/successionBoard\(/);
    expect(kode(), 'nama orang tidak lagi lewat rujukan yang bisa dikarang').toMatch(/refLabel\(/);
  });
});

/* ------------------------------------------------------------------
   b. Klaim 'Siap sekarang' vs sertifikasi yang kurang
   ------------------------------------------------------------------ */
describe('b — klaim siap yang dibantah sertifikasi', () => {
  it('EMP-021 (SR-05) diklaim "Siap sekarang" tetapi terhalang sertifikasi', () => {
    const c = board().contradictions.find((x) => x.roleId === 'SR-05' && x.candidateId === 'EMP-021');
    expect(c, 'kontradiksi EMP-021 hilang').toBeTruthy();
    expect(c?.claimed).toBe('Siap sekarang');
    expect(c?.derived).not.toBe('Siap sekarang');
    expect(c?.blockers.map((b) => b.kind)).toContain('sertifikasi');
    /* pemblokir menyebut kriteria tangga karier & sertifikasi yang dipegang —
       bukan kalimat baru yang dikarang lapisan tampilan */
    const cert = c?.blockers.find((b) => b.kind === 'sertifikasi');
    expect(cert?.detail).toContain('CPA penuh');
    expect(cert?.detail).toContain('CA (kandidat CPA)');
  });

  it('kandidat sintetis: klaim siap + sertifikasi kurang → kontradiksi berpemblokir', () => {
    const staff: RosterPerson[] = [
      { id: 'EMP-008', name: 'Bayu Saputra', role: 'Audit Manager', grade: 'Manager', cert: 'CPA' },
      { id: 'EMP-021', name: 'Dimas Raharjo', role: 'Senior Auditor', grade: 'Senior', cert: 'CA (kandidat CPA)' },
    ];
    const roles: RoleInput[] = [{
      id: 'SR-SINT', role: 'Audit Manager', incumbent: 'EMP-008',
      critical: 'Penting', riskOfLoss: 'Sedang', vacancyImpact: 'Sedang',
      successors: [{ id: 'EMP-021', readiness: 'Siap sekarang', gaps: '—' }],
    }];
    const b = successionBoard({ roles, staff, readinessFor });
    expect(b.kpi.contradicting).toBe(1);
    expect(b.roles[0].successors[0].contradicts).toBe(true);
    expect(b.roles[0].successors[0].readiness?.blockers.some((x) => x.kind === 'sertifikasi')).toBe(true);
  });
});

/* ------------------------------------------------------------------
   c. Rujukan yang tak dapat diselesaikan
   ------------------------------------------------------------------ */
describe('c — orang yang tidak ada di roster', () => {
  const staff: RosterPerson[] = [
    { id: 'EMP-008', name: 'Bayu Saputra', role: 'Audit Manager', grade: 'Manager', cert: 'CPA' },
  ];
  const roles: RoleInput[] = [{
    id: 'SR-GHOST', role: 'Peran Uji', incumbent: 'EMP-HANTU-1',
    critical: 'Kritikal', riskOfLoss: 'Tinggi', vacancyImpact: 'Tinggi',
    successors: [
      { id: 'EMP-HANTU-2', readiness: 'Siap sekarang', gaps: '—' },
      { id: 'EMP-008', readiness: 'Siap 2–3 th', gaps: 'x' },
    ],
  }];

  it('jalur LAMA memang mengarang orang — gerbang ini punya sesuatu untuk dibantah', () => {
    /* A.byId TIDAK melempar: ia mengembalikan orang palsu berjenjang 'Junior'
       (data_people.ts). Angka kesiapannya pun ikut terhitung. Inilah yang
       dulu masuk ke kartu kandidat DAN ke ekspor tersegel. */
    const hantu = A.byId('EMP-HANTU-2');
    expect(hantu.name).toBe('EMP-HANTU-2');
    expect(hantu.grade).toBe('Junior');
    expect(readinessOf({ cert: hantu.cert, currentGrade: hantu.grade, ladder: A.CAREER_LADDER }).label).toBeTruthy();
  });

  it('rujukan tak dikenal tidak menjadi orang berjenjang Junior', () => {
    const b = successionBoard({ roles, staff, readinessFor });
    const inc = b.roles[0].incumbent;
    expect(inc.ada).toBe(false);
    expect(inc.grade).toBe('');
    expect(inc.name).toBe('');
    expect(refLabel(inc)).toContain('tidak ada di roster');
    expect(refLabel(inc)).toContain('EMP-HANTU-1');
  });

  it('kesiapannya tidak dihitung, dan tidak menghasilkan kontradiksi', () => {
    const b = successionBoard({ roles, staff, readinessFor });
    const hantu = b.roles[0].successors.find((s) => s.ref.id === 'EMP-HANTU-2');
    expect(hantu?.readiness).toBe(null);
    expect(hantu?.contradicts).toBe(false);
    expect(b.contradictions.some((c) => c.candidateId === 'EMP-HANTU-2')).toBe(false);
    expect(b.kpi.unresolved).toBe(2);
    expect(b.unresolved.map((u) => u.kind).sort()).toEqual(['kandidat', 'pemangku']);
  });

  it('mesin kesiapan bahkan tidak dipanggil untuk orang yang tidak ada', () => {
    const dipanggil: string[] = [];
    const spy = (id: string): Readiness => { dipanggil.push(id); return readinessFor(id); };
    successionBoard({ roles, staff, readinessFor: spy });
    expect(dipanggil).toEqual(['EMP-008']);
  });

  it('roster nyata hari ini tidak memuat rujukan yang menggantung (anti-kambuh)', () => {
    expect(board().unresolved).toEqual([]);
  });
});

/* ------------------------------------------------------------------
   d & e. Gerbang sumber view_pc_org.tsx
   ------------------------------------------------------------------ */
describe('d — kontrol native di view_pc_org.tsx', () => {
  it('nol <tr onClick> / <span onClick> / <div onClick>', () => {
    const pelanggar = [...kode().matchAll(/<(tr|div|span)\b[^>]*\sonClick=/g)].map((m) => m[0].slice(0, 70));
    expect(pelanggar, `kontrol palsu: ${pelanggar.join(' | ')}`).toEqual([]);
  });

  it('baris tabel dipilih lewat <button> dengan cincin fokus terlihat', () => {
    expect(kode(), 'tombol baris tidak ditemukan').toMatch(/<button[\s\S]{0,200}?pc-rowbtn/);
    expect(src(), 'cincin fokus tombol baris tidak ada').toMatch(/\.pc-rowbtn:focus-visible/);
  });
});

describe('e — makna tidak lewat glyph saja', () => {
  it("nol '⚠' di dalam kode", () => {
    expect(kode().includes('⚠'), "'⚠' dipakai sebagai pembawa makna").toBe(false);
  });

  it('penjelasan kontradiksi tidak hanya hidup di atribut title', () => {
    /* Sebelum: <span className="badge" title={blockers…}>{label}{' ⚠'}</span> —
       satu-satunya penjelasan ada di `title` pada elemen non-fokusabel. */
    expect(kode()).not.toMatch(/<span[^>]*\stitle=\{[^}]*blockers/);
    expect(kode(), 'pemblokir tidak dirender sebagai teks').toMatch(/blockers\.map/);
  });
});
