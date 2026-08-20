/* ============================================================
   PRD `docs/prd-sdm-kepatuhan-deepening.md` · PR-3 · SC-10 · SC-11.

   Cacat yang ditutup: aplikasi ini punya DUA mesin PPL untuk satu kewajiban.
   `canon_ppl.pplStatus()` mengimplementasikan PMK 186/2021 Ps. 37 dengan benar
   (cap SKP tidak terstruktur, SKP hangus, materi wajib) dan dipakai modul
   Kesiapan P2PK — sementara modul yang JUSTRU bernama "CPE / PPL Tracker",
   dan `pplOf` di data_licensing, menjumlahkan SKP MENTAH tanpa cap.

   Uji di sini dirancang agar GAGAL bila mesin kedua itu kembali.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AMS } from './data';
import './data_people';
import {
  PPL_REQ_PMK186, isSkpTopic, pplFromEntries, pplStatus, pplStatusFromEntries,
} from './canon_ppl';
import type { SkpEntry } from './canon_ppl';
import { cpeFromTraining } from './cpe_training';
import type { TrainingCourse } from './cpe_training';

const CPE_LOG = AMS.CPE_LOG as unknown as Record<string, SkpEntry[]>;
const CATALOG = (AMS as unknown as { TRAINING_CATALOG: (TrainingCourse & { topic?: string })[] }).TRAINING_CATALOG;

/* ------------------------------------------------------------------
   1. SC-10 — satu mesin, dan ia MENGUBAH angka yang salah
   ------------------------------------------------------------------ */

/** Jumlah MENTAH yang dulu ditampilkan CPE/PPL Tracker (Σ skp, tanpa cap). */
const MENTAH_SEBELUM_PR3: Record<string, number> = {
  'EMP-001': 24, 'EMP-002': 18, 'EMP-003': 31,
  'EMP-007': 32, 'EMP-021': 12, 'EMP-031': 12,
};
/** SKP yang DAPAT DIPERHITUNGKAN menurut PMK 186 Ps. 37. */
const TERHITUNG: Record<string, number> = {
  'EMP-001': 24, 'EMP-002': 18, 'EMP-003': 31,
  'EMP-007': 28, 'EMP-021': 12, 'EMP-031': 12,
};

describe('SC-10 — cap SKP tidak terstruktur akhirnya berlaku di modul PPL', () => {
  it.each(Object.keys(TERHITUNG))('%s ter-cap dengan benar', (emp) => {
    expect(pplStatusFromEntries(CPE_LOG[emp]).countedTotal).toBe(TERHITUNG[emp]);
  });

  it('LIMA dari enam tak bergeser — pencabutan mesin kedua bukan perombakan', () => {
    const bergeser = Object.keys(TERHITUNG).filter((e) => TERHITUNG[e] !== MENTAH_SEBELUM_PR3[e]);
    expect(bergeser).toEqual(['EMP-007']);
  });

  it('EMP-007 turun 32 → 28 karena 4 SKP tidak terstruktur melampaui batas 10', () => {
    const st = pplStatusFromEntries(CPE_LOG['EMP-007']);
    expect(st.structured).toBe(18);
    expect(st.countedUnstructured).toBe(PPL_REQ_PMK186.unstructuredCap);
    expect(st.forfeitedUnstructured).toBe(4);
    expect(st.countedTotal).toBe(28);
  });

  it('cap tak pernah menambah — countedTotal ≤ jumlah mentah, selalu', () => {
    for (const emp of Object.keys(CPE_LOG)) {
      const entries = CPE_LOG[emp] || [];
      const mentah = entries.reduce((a, r) => a + (Number(r.skp) || 0), 0);
      expect(pplStatusFromEntries(entries).countedTotal, emp).toBeLessThanOrEqual(mentah);
    }
  });

  it('`pplOf` (data_licensing) memakai mesin yang sama, bukan salinan', async () => {
    const { LICENSING } = await import('./data_licensing') as unknown as
      { LICENSING: { pplOf: (id: string) => { total: number; structured: number } } };
    for (const emp of Object.keys(TERHITUNG)) {
      expect(LICENSING.pplOf(emp).total, emp).toBe(TERHITUNG[emp]);
    }
  });
});

/* ------------------------------------------------------------------
   2. SC-11 — materi wajib Pasal 37
   ------------------------------------------------------------------ */

describe('SC-11 — materi wajib terlacak, atau dinyatakan belum terbukti', () => {
  it('seluruh entri terstruktur seed sudah terklasifikasi', () => {
    for (const emp of Object.keys(CPE_LOG)) {
      const st = pplStatusFromEntries(CPE_LOG[emp]);
      expect(st.topicsTracked, emp).toBe(true);
    }
  });

  it('SATU entri tanpa klasifikasi membatalkan keterlacakan SELURUH tahun', () => {
    const rusak = (CPE_LOG['EMP-003'] || []).map((r, i) => (i === 0 ? { ...r, topic: undefined } : r));
    expect(pplStatusFromEntries(rusak).topicsTracked).toBe(false);
    /* dan kepatuhan penuh karenanya tak dapat diklaim dari data itu */
    expect(pplFromEntries(rusak).topicPembinaan).toBeUndefined();
  });

  it('entri TIDAK terstruktur tak perlu topik — Ps. 37 menaruh materi DI DALAM terstruktur', () => {
    const e: SkpEntry[] = [
      { type: 'Terstruktur', skp: 20, topic: 'akuntansi' },
      { type: 'Tidak Terstruktur', skp: 5 },
    ];
    expect(pplFromEntries(e).topicAkuntansi).toBe(20);
    expect(pplStatus(pplFromEntries(e)).topicsTracked).toBe(true);
  });

  it('limb materi diuji terpisah dari limb jumlah', () => {
    /* cukup total & terstruktur, tetapi materi wajib kurang → tetap TIDAK patuh. */
    const st = pplStatus({ structured: 40, unstructured: 0, topicPembinaan: 0, topicAkuntansi: 40 });
    expect(st.countedTotal).toBe(40);
    expect(st.shortfalls).toEqual(['topic-pembinaan']);
    expect(st.compliant).toBe(false);
  });

  it('EMP-007 kurang di KEDUA limb materi', () => {
    const r = pplFromEntries(CPE_LOG['EMP-007']);
    expect(r.topicPembinaan).toBe(0);
    expect(r.topicAkuntansi).toBe(14);
    const st = pplStatus(r);
    expect(st.shortfalls).toContain('topic-pembinaan');
    expect(st.shortfalls).toContain('topic-akuntansi');
  });

  it('EMP-003 memenuhi kedua limb materi, tetapi masih kurang SKP', () => {
    const st = pplStatusFromEntries(CPE_LOG['EMP-003']);
    expect(st.shortfalls).not.toContain('topic-pembinaan');
    expect(st.shortfalls).not.toContain('topic-akuntansi');
    expect(st.shortfalls).toContain('total');
  });

  it('jembatan pelatihan → SKP membawa klasifikasi materinya', () => {
    const att = { 'TR-05': { 'EMP-021': { confirmed: true } } };
    const byEmp = cpeFromTraining(CATALOG, att);
    expect(byEmp['EMP-021'][0].topic).toBe('pembinaan');
    /* dan kredit itu benar-benar mengisi limb materi */
    const gabung = [...(CPE_LOG['EMP-021'] || []), ...byEmp['EMP-021']];
    expect(pplFromEntries(gabung).topicPembinaan).toBe(6);
  });

  it('setiap kursus terstruktur di katalog punya klasifikasi materi', () => {
    for (const t of CATALOG) {
      if (!String(t.mode).toLowerCase().startsWith('terstruktur')) continue;
      expect(isSkpTopic(t.topic), t.id).toBe(true);
    }
  });
});

/* ------------------------------------------------------------------
   3. SC-24a — SATU register SKP (dulu dua)
   ------------------------------------------------------------------ */

/* PR-3 menyatukan MESIN-nya dan, sambil mengerjakannya, membuktikan bahwa
   REGISTER-nya ada dua:

     CPE_LOG    (data_part1)  per-kegiatan, berkunci empId  -> CPE/PPL Tracker · pplOf
     PPPK_PPL   (data_part4)  agregat s/u,  berkunci NAMA   -> Kesiapan P2PK

   Kelima orang di register kedua punya angka BERBEDA dari register pertama:
   Hartono 32 vs 24 · Rudi 30 vs 18 · Sari 28 vs 31 · Anindya 32 vs 28 · dan
   Bayu 24 vs NOL, karena ia tak punya satu pun catatan SKP. Sebelum PR-3
   keduanya kebetulan sama-sama 32 untuk Anindya, sehingga tak terlihat.

   SC-24a mencabut register kedua. `PPPK_PPL` kini POPULASI saja — siapa yang
   dilaporkan — dan angkanya dibaca lewat `LICENSING.pplOf` dari register yang
   sama dengan pemantauan harian. Uji ini menjaga agar angka kedua tak lahir
   kembali dalam bentuk apa pun. */

/** Angka yang kini ditampilkan Kesiapan P2PK — sama persis dgn Tracker. */
const SATU_REGISTER: Record<string, number> = {
  'EMP-001': 24, 'EMP-002': 18, 'EMP-003': 31, 'EMP-007': 28, 'EMP-008': 0,
};

type PppkRow = { emp: string; ap: string; grade: string };

describe('SC-24a — satu register SKP untuk satu firma', () => {
  const PPPK = (AMS as unknown as { PPPK_PPL: PppkRow[] }).PPPK_PPL;
  const STAFF = AMS.STAFF as unknown as { id: string; name: string; grade: string; cert?: string }[];

  it('PPPK_PPL berkunci empId — bukan nama', () => {
    expect(PPPK.length).toBeGreaterThan(0);
    for (const row of PPPK) {
      expect(typeof row.emp, row.ap).toBe('string');
      expect(STAFF.find((s) => s.id === row.emp), row.emp).toBeTruthy();
    }
  });

  it('PPPK_PPL tidak lagi membawa realisasi SENDIRI — register kedua dicabut', () => {
    for (const row of PPPK) {
      expect(row, row.emp).not.toHaveProperty('structured');
      expect(row, row.emp).not.toHaveProperty('unstructured');
    }
  });

  it('identitas & jenjang DITURUNKAN dari roster, tidak diketik ulang', () => {
    for (const row of PPPK) {
      const s = STAFF.find((x) => x.id === row.emp)!;
      expect(row.ap, row.emp).toBe(s.name);
      const punyaAP = String(s.cert || '').split(',').map((c) => c.trim()).includes('AP');
      expect(row.grade, row.emp).toBe(s.grade + (punyaAP ? ' · AP' : ''));
    }
  });

  it('laporan PPPK dan pemantauan harian membaca ANGKA YANG SAMA', async () => {
    const { LICENSING } = await import('./data_licensing') as unknown as
      { LICENSING: { pplOf: (id: string) => { total: number; recs: SkpEntry[] } } };
    for (const row of PPPK) {
      const dariRegister = pplStatusFromEntries(CPE_LOG[row.emp]).countedTotal;
      expect(LICENSING.pplOf(row.emp).total, row.emp).toBe(dariRegister);
      expect(dariRegister, row.emp).toBe(SATU_REGISTER[row.emp]);
    }
  });

  it('NOL SKP karena tak ada catatan dapat dibedakan dari nol yang terhitung', async () => {
    const { LICENSING } = await import('./data_licensing') as unknown as
      { LICENSING: { pplOf: (id: string) => { total: number; recs: SkpEntry[] } } };
    /* Bayu Saputra tak punya entri sama sekali. Angkanya nol, dan sebabnya
       harus dapat dinyatakan — bukan disamarkan menjadi "belum memenuhi". */
    expect(LICENSING.pplOf('EMP-008').recs).toHaveLength(0);
    expect(LICENSING.pplOf('EMP-008').total).toBe(0);
    expect(LICENSING.pplOf('EMP-001').recs.length).toBeGreaterThan(0);
  });

  it('populasi AP mencerminkan register izin — tak ada AP yang hilang dari laporan', async () => {
    const { BO } = await import('./data_backoffice') as unknown as
      { BO: { AP_LICENSES: { emp: string }[] } };
    for (const lic of BO.AP_LICENSES) {
      expect(PPPK.map((r) => r.emp), lic.emp).toContain(lic.emp);
    }
  });
});

/* ------------------------------------------------------------------
   4. GERBANG CAKUPAN
   ------------------------------------------------------------------ */

const SRC = join(__dirname);
const read = (f: string) => readFileSync(join(SRC, f), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

/** Setiap pembaca SKP. Menambah pembaca? Daftarkan di sini. */
const KONSUMEN = ['view_people.tsx', 'data_licensing.ts', 'view_pppk.tsx', 'view_isqm_parts.tsx'];

describe('gerbang cakupan — satu mesin PPL, nol penjumlah mentah', () => {
  it.each(KONSUMEN)('%s masuk lewat canon_ppl', (f) => {
    expect(read(f)).toMatch(/from '\.\/canon_ppl'/);
  });

  it('tak ada konsumen yang menjumlahkan SKP mentah sendiri', () => {
    for (const f of KONSUMEN) {
      /* pola lama: `recs.reduce((a, r) => a + r.skp, 0)` */
      expect(read(f), f).not.toMatch(/reduce\(\([^)]*\)\s*=>\s*\w+\s*\+\s*\(?\w+\.skp/);
    }
  });

  it('SC-24a — register SKP kedua tak dapat lahir kembali di data_part4', () => {
    /* Komentar dibuang oleh `read`, jadi ini menguji KODE. Menaruh kembali
       `structured`/`unstructured` pada baris PPPK berarti dua angka lagi. */
    expect(read('data_part4.ts')).not.toContain('unstructured');
    expect(read('data_part4.ts')).toContain('PPPK_PPL_POP');
  });

  it('SC-24a — konsumen PPPK tak merakit realisasi dari barisnya sendiri', () => {
    for (const f of ['view_pppk.tsx', 'view_isqm_parts.tsx']) {
      expect(read(f), f).not.toContain('p.structured');
      expect(read(f), f).toContain('pplOf(');
    }
  });

  it('CPE/PPL Tracker tidak lagi menghitung kepatuhan sendiri', () => {
    /* pola lama: `total >= req.annual && structured >= req.structured` */
    expect(read('view_people.tsx')).not.toMatch(/>=\s*req\.annual\s*&&/);
  });

  it('ambang PPL punya SATU sumber — canon_ppl, bukan CPE_REQ per-view', () => {
    const src = read('view_people.tsx');
    expect(src).toMatch(/PPL_REQ_PMK186\.annual/);
    /* CPE_REQ boleh dipakai untuk TAHUN saja, tidak untuk ambang. */
    expect(src).not.toMatch(/CPE_REQ[\s\S]{0,40}annual\s*[,}]/);
  });

  it('formulir Catat SKP merekam materi wajib untuk entri terstruktur', () => {
    const src = read('view_people.tsx');
    expect(src).toMatch(/needTopic/);
    expect(src).toMatch(/isSkpTopic\(d\.topic\)/);
  });
});
