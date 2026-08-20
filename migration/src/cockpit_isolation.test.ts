/* ============================================================
   Engagement Cockpit — isolasi per-perikatan & identitas orang (PR-C-5)

   Tiga cacat yang ditutup, semuanya berbentuk sama: layar PERIKATAN
   menampilkan data yang bukan miliknya, atau menjodohkan data dengan tebakan
   alih-alih kunci.

     §1.7  `activity`/`deadlines` adalah konstanta FIRMA. Panel "Tenggat
           Mendatang" bahkan SENGAJA memadatkan daftarnya sampai empat baris
           dengan tenggat klien lain (`others`), tanpa penanda apa pun.
     §1.8  Orang dicocokkan dengan NAMA DEPAN (`split(' ')[0]`) — dua "Dimas"
           saling mengklaim kertas kerja.
     §1.8  Risiko dijodohkan ke program audit dengan `String.includes`,
           padahal `RISKS.id` === `PROGRAMME.riskId` sudah tersedia.

   Kriteria S8.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { AMS } from './data';
import { PROGRAMME } from './data_programme';
import {
  staffKey, cockpitRiskCoverage,
  type CockpitRiskRow, type CockpitProgRow,
} from './cockpit_model';

interface ActivityRow { who: string; what: string; when: string; icon: string; eng?: string }
interface DeadlineRow { client: string; task: string; date: string; days: number; sev: string }
interface ClientRow { id: string; name: string }
interface EngRow { id: string; clientId: string }

const A = AMS as unknown as {
  ACTIVITY: ActivityRow[]; DEADLINES: DeadlineRow[]; CLIENTS: ClientRow[];
  ENGAGEMENTS: EngRow[]; RISKS: CockpitRiskRow[];
};

const clientOf = (engId: string): string => {
  const e = A.ENGAGEMENTS.find((x) => x.id === engId);
  const c = e && A.CLIENTS.find((x) => x.id === e.clientId);
  return (c && c.name) || '';
};

/* penyaring yang dipakai cockpit (view_cockpit2 model D) */
const activityFor = (engId: string) => A.ACTIVITY.filter((a) => a.eng === engId);
const deadlinesFor = (engId: string) => A.DEADLINES.filter((d) => d.client === clientOf(engId));

describe('aktivitas berlingkup perikatan (S8)', () => {
  it('setiap baris aktivitas MEMILIKI perikatan — tak ada yang menggantung', () => {
    const tanpaEng = A.ACTIVITY.filter((a) => !a.eng).map((a) => a.what);
    expect(tanpaEng, `aktivitas tanpa perikatan: ${tanpaEng.join(' | ')}`).toEqual([]);
  });

  it('baris milik perikatan lain TIDAK muncul di cockpit perikatan ini', () => {
    const di014 = activityFor('ENG-2025-014');
    expect(di014.length).toBeGreaterThan(0);
    /* baris "draft opini ENG-2025-063 untuk EQR" dulu tampil di SINI */
    expect(di014.some((a) => /ENG-2025-063/.test(a.what))).toBe(false);
    expect(activityFor('ENG-2025-063').some((a) => /ENG-2025-063/.test(a.what))).toBe(true);
  });

  it('ganti perikatan ⇒ feed ikut berubah', () => {
    const a = activityFor('ENG-2025-014');
    const b = activityFor('ENG-2025-063');
    expect(a).not.toEqual(b);
    expect(a.every((x) => x.eng === 'ENG-2025-014')).toBe(true);
    expect(b.every((x) => x.eng === 'ENG-2025-063')).toBe(true);
  });
});

describe('tenggat berlingkup perikatan (S8)', () => {
  it('hanya tenggat klien perikatan ini', () => {
    const rows = deadlinesFor('ENG-2025-014');
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach((d) => expect(d.client).toBe('PT Sentosa Makmur Tbk'));
  });

  it('TIDAK memadatkan daftar dengan tenggat klien lain', () => {
    /* perilaku lama: [...engDeadlines, ...others].slice(0, 4) — selalu 4 baris,
       sisanya diambil dari klien mana pun. */
    const rows = deadlinesFor('ENG-2025-014');
    const asing = rows.filter((d) => d.client !== 'PT Sentosa Makmur Tbk');
    expect(asing).toEqual([]);
    expect(rows.length).toBeLessThan(A.DEADLINES.length);
  });

  it('perikatan tanpa tenggat menghasilkan daftar KOSONG, bukan pinjaman', () => {
    const rows = deadlinesFor('ENG-2025-047');
    expect(rows).toEqual([]);
  });
});

describe('identitas orang — bukan nama depan (S8)', () => {
  it('menormalkan nama lengkap & singkat ke kunci yang sama', () => {
    expect(staffKey('Hartono Wijaya, CPA')).toBe('hartono w');
    expect(staffKey('Hartono W.')).toBe('hartono w');
    expect(staffKey('Anindya Pramesti')).toBe(staffKey('Anindya P.'));
    expect(staffKey('Dimas Raharjo')).toBe(staffKey('Dimas R.'));
  });

  it('dua orang bernama depan sama TIDAK lagi bertabrakan', () => {
    /* cacat lama: split(' ')[0] menjadikan keduanya "Dimas" */
    expect(staffKey('Dimas Raharjo')).not.toBe(staffKey('Dimas Santoso'));
    expect(staffKey('Dimas R.')).not.toBe(staffKey('Dimas S.'));
  });

  it('BATAS YANG DIAKUI: inisial marga sama masih bertabrakan', () => {
    /* Register hanya menyimpan "Dimas R." — tak ada informasi lain untuk
       membedakan. Perbaikan tuntas menuntut ID staf di register. Uji ini
       MENDOKUMENTASIKAN batas itu, bukan merayakannya. */
    expect(staffKey('Dimas Raharjo')).toBe(staffKey('Dimas Rahman'));
  });

  it('tahan terhadap masukan kosong / tak biasa', () => {
    expect(staffKey(undefined)).toBe('');
    expect(staffKey('')).toBe('');
    expect(staffKey('Sistem')).toBe('sistem');
  });
});

describe('cakupan risiko dijodohkan dengan KUNCI, bukan tebakan string (S8)', () => {
  const risks = (): CockpitRiskRow[] => A.RISKS.filter((r) => r.inherent === 'Significant');
  const prog = () => PROGRAMME as unknown as CockpitProgRow[];

  it('setiap risiko signifikan menemukan baris programnya lewat riskId', () => {
    const cov = cockpitRiskCoverage(risks(), prog());
    const yatim = cov.filter((c) => c.total === 0).map((c) => c.id);
    expect(yatim, `risiko tanpa program: ${yatim.join(', ')}`).toEqual([]);
  });

  it('join TIDAK bergantung pada kemiripan nama area', () => {
    /* R-03: RISKS.area 'Piutang Usaha' vs PROGRAMME.area 'Piutang Usaha — ECL'.
       Heuristik lama kebetulan cocok; kunci tak perlu kebetulan. */
    const cov = cockpitRiskCoverage(
      [{ id: 'R-03', area: 'nama yang sama sekali berbeda', inherent: 'Significant' }],
      prog(),
    );
    expect(cov[0].total).toBeGreaterThan(0);
    expect(cov[0].area).toBe('Piutang Usaha — ECL');
  });

  it('risiko tanpa padanan program tidak diam-diam mengambil baris lain', () => {
    const cov = cockpitRiskCoverage([{ id: 'R-99', area: 'Pendapatan', inherent: 'Significant' }], prog());
    expect(cov[0].total).toBe(0);
    expect(cov[0].covered).toBe(false);
  });

  it('"tertangani" = SELURUH prosedur selesai — satu definisi, satu layar', () => {
    const p: CockpitProgRow[] = [{ riskId: 'R-1', area: 'X', sig: true, procs: [{ status: 'done' }, { status: 'open' }] }];
    const cov = cockpitRiskCoverage([{ id: 'R-1', inherent: 'Significant' }], p);
    expect(cov[0].done).toBe(1);
    expect(cov[0].total).toBe(2);
    /* definisi lama kartu hero (`procs.some(done)`) akan menyebut ini tertangani */
    expect(cov[0].covered).toBe(false);
  });

  it('pengecualian dijumlahkan dari prosedur yang benar', () => {
    const p: CockpitProgRow[] = [{ riskId: 'R-1', area: 'X', procs: [{ status: 'done', exc: 2 }, { status: 'done', exc: 1 }] }];
    const cov = cockpitRiskCoverage([{ id: 'R-1' }], p);
    expect(cov[0].exc).toBe(3);
    expect(cov[0].covered).toBe(true);
  });
});
