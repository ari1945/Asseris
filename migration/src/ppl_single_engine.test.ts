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
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { AMS } from './data';
import './data_people';
import {
  PPL_REQ_PMK186, isSkpTopic, pplFromEntries, pplPeriod, pplStatus, pplStatusFromEntries,
} from './canon_ppl';
import type { SkpEntry } from './canon_ppl';
import { cpeFromTraining, skpEntriesOf } from './cpe_training';
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
   5. "Data Personal Saya" tak dapat berpisah dari CPE/PPL Tracker
   ------------------------------------------------------------------

   PR-3 mencabut mesin kedua dari `view_people` dan `data_licensing`, tetapi
   MELEWATKAN `view_personal` — halaman yang justru dibaca pegawai sendiri. Di
   sana SKP dijumlahkan MENTAH:

       skpTotal  = Σ skp
       skpStruct = Σ skp (type === 'Terstruktur')
       skpOk     = skpTotal >= 40 && skpStruct >= 30

   Empat cacat sekaligus: tanpa batas 10 SKP tidak terstruktur, tanpa materi
   wajib, tanpa periode, dan MASUKAN-nya kurang satu register (kredit pelatihan
   tak pernah dibaca).

   Gerbang `reduce`+`.skp` di §4 kemudian menemukan yang KEEMPAT: drawer profil
   360° di `view_pc_hcm` menjumlahkan `cpeLog` mentah lalu memutuskan kepatuhan
   dengan `cpe >= 40`. Satu orang, satu tahun, EMPAT angka resmi.

   Yang dipaku di sini: mesin (`pplPeriod`) DAN komposisi masukannya
   (`skpEntriesOf`) sama untuk seluruh konsumen. Menyatukan mesin saja tidak
   cukup — dua pembaca yang merakit masukan berbeda tetap berpisah.
   ------------------------------------------------------------------ */

type Att = Record<string, Record<string, { confirmed?: boolean }>>;
const TODAY = String(AMS.TODAY);

/** Ketiga register, persis seperti yang dirakit kedua view & `pplOf`. */
const sumberSkp = (extra: Record<string, SkpEntry[]>, att: Att) => ({
  extra,
  training: cpeFromTraining(CATALOG, att) as unknown as Record<string, SkpEntry[]>,
  base: CPE_LOG,
});

describe('PR-3b — satu mesin DAN satu komposisi untuk seluruh pembaca SKP', () => {
  it('angka pegawai = angka HR = angka laporan izin, untuk empId yang sama', async () => {
    const { LICENSING } = await import('./data_licensing') as unknown as
      { LICENSING: { pplOf: (id: string) => { total: number; structured: number } } };
    const src = sumberSkp({}, {});
    for (const emp of Object.keys(CPE_LOG)) {
      const per = pplPeriod(skpEntriesOf(emp, src), TODAY);
      /* `pplOf` adalah konsumen yang ditulis TERPISAH dan membaca store nyata —
         bukan pemanggilan ulang ekspresi yang sama. */
      expect(LICENSING.pplOf(emp).total, emp).toBe(per.status.countedTotal);
      expect(LICENSING.pplOf(emp).structured, emp).toBe(per.status.structured);
    }
  });

  it('KOMPOSISI: register ketiga (kredit pelatihan) benar-benar ikut', () => {
    /* Ini yang membedakan `view_personal` lama: ia hanya membaca cpeExtra +
       cpeLog. TR-05 = 6 SKP terstruktur, materi pembinaan. */
    const att: Att = { 'TR-05': { 'EMP-021': { confirmed: true } } };
    const tanpa = pplPeriod(skpEntriesOf('EMP-021', sumberSkp({}, {})), TODAY);
    const dengan = pplPeriod(skpEntriesOf('EMP-021', sumberSkp({}, att)), TODAY);
    expect(tanpa.status.countedTotal).toBe(12);
    expect(dengan.status.countedTotal).toBe(18);
    expect(dengan.status.structured).toBe(12);
    /* dan kredit itu mengisi limb materi, bukan sekadar menambah angka */
    expect(pplFromEntries(dengan.entries).topicPembinaan).toBe(6);
  });

  it('KOMPOSISI: entri manual (cpeExtra) mendahului register dasar', () => {
    const extra = { 'EMP-021': [{ t: 'Catat manual', type: 'Terstruktur', skp: 2, date: TODAY, topic: 'akuntansi' }] };
    const recs = skpEntriesOf('EMP-021', sumberSkp(extra as Record<string, SkpEntry[]>, {}));
    expect(recs[0].t).toBe('Catat manual');
    expect(recs).toHaveLength(3);
  });

  it('PERIODE: SKP tahun lalu tak lagi ikut — di KEDUA halaman sekaligus', () => {
    const extra = { 'EMP-021': [{ t: 'Workshop 2025', type: 'Terstruktur', skp: 30, date: '2025-11-02', topic: 'akuntansi' }] };
    const src = sumberSkp(extra as Record<string, SkpEntry[]>, {});
    const per = pplPeriod(skpEntriesOf('EMP-021', src), TODAY);
    expect(per.year).toBe(2026);
    expect(per.status.countedTotal).toBe(12);
    /* tanpa periode ia akan tampak 42 SKP dan "memenuhi" */
    expect(pplStatusFromEntries(skpEntriesOf('EMP-021', src)).countedTotal).toBe(42);
  });

  /** Rumus MENTAH yang dicabut dari `view_personal` — disimpan sebagai oracle. */
  const mentah = (entries: readonly SkpEntry[]) => {
    const total = entries.reduce((a, r) => a + (Number(r.skp) || 0), 0);
    const structured = entries.filter((r) => r.type === 'Terstruktur')
      .reduce((a, r) => a + (Number(r.skp) || 0), 0);
    return { total, structured, ok: total >= 40 && structured >= 30 };
  };

  it('ANGKA yang tampil berubah: 44 SKP mentah → 32 SKP terhitung', () => {
    /* 22 terstruktur + 22 tidak terstruktur. Yang berpindah di sini adalah
       ANGKANYA — satu orang, satu tahun, dua figur resmi. Batas 10 SKP tidak
       terstruktur (Ps. 37) membakar 12 SKP yang tak pernah dapat dipakai. */
    const entries: SkpEntry[] = [
      { t: 'Terstruktur A', type: 'Terstruktur', skp: 22, date: '2026-02-01', topic: 'akuntansi' },
      { t: 'Self-study', type: 'Tidak Terstruktur', skp: 22, date: '2026-02-02' },
    ];
    expect(mentah(entries).total).toBe(44);

    const st = pplPeriod(entries, TODAY).status;
    expect(st.countedTotal).toBe(32);
    expect(st.forfeitedUnstructured).toBe(12);
    /* kedua rumus SEPAKAT bahwa ia tidak patuh — yang berbeda hanya angkanya,
       dan angka itulah yang dibaca pegawai serta dilaporkan ke PPPK. */
    expect(mentah(entries).ok).toBe(false);
    expect(st.compliant).toBe(false);
    expect(st.shortfalls).toContain('total');
    expect(st.shortfalls).toContain('structured');
  });

  it('PUTUSAN berubah: rumus mentah bilang "memenuhi", Pasal 37 bilang tidak', () => {
    /* Batas SKP tidak terstruktur sendiri tak pernah dapat membalik putusan
       (bila terstruktur ≥ 30, cap tak menggigit). Yang MEMBALIKKANNYA adalah
       limb yang rumus mentah tak punya sama sekali: materi wajib 4 + 16.
       30 SKP terstruktur seluruhnya materi akuntansi ⇒ pembinaan NOL. */
    const entries: SkpEntry[] = [
      { t: 'Rangkaian akuntansi', type: 'Terstruktur', skp: 30, date: '2026-02-01', topic: 'akuntansi' },
      { t: 'Self-study', type: 'Tidak Terstruktur', skp: 10, date: '2026-02-02' },
    ];
    expect(mentah(entries)).toMatchObject({ total: 40, structured: 30, ok: true });

    const st = pplPeriod(entries, TODAY).status;
    expect(st.countedTotal).toBe(40);
    expect(st.topicsTracked).toBe(true);
    expect(st.shortfalls).toEqual(['topic-pembinaan']);
    expect(st.compliant).toBe(false);
  });

  it('"patuh tetapi materi tak terlacak" BUKAN centang hijau', () => {
    /* 30 terstruktur TANPA klasifikasi + 10 tidak terstruktur = 40 SKP: seluruh
       limb yang DAPAT diuji terpenuhi, tetapi Pasal 37 belum terbukti. Halaman
       wajib menampilkan bedanya, bukan menyulapnya jadi "Memenuhi" — karena
       itu `skpProven = compliant && topicsTracked`, bukan `compliant` saja. */
    const entries: SkpEntry[] = [
      { t: 'Kursus tanpa klasifikasi', type: 'Terstruktur', skp: 30, date: '2026-02-01' },
      { t: 'Self-study', type: 'Tidak Terstruktur', skp: 10, date: '2026-02-02' },
    ];
    const st = pplPeriod(entries, TODAY).status;
    expect(st.countedTotal).toBe(40);
    expect(st.compliant).toBe(true);
    expect(st.topicsTracked).toBe(false);
    expect(st.compliant && st.topicsTracked).toBe(false);
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
const KONSUMEN = ['view_people.tsx', 'view_personal.tsx', 'view_pc_hcm.tsx', 'data_licensing.ts', 'view_pppk.tsx', 'view_isqm_parts.tsx'];

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

  /* ---- SC-…b — penjumlah SKP mentah dilarang di SELURUH view ---- */

  /* Penjumlah SKP tangan sendiri: satu baris yang memuat `reduce(` sekaligus
     `.skp`. Baris render (`{r.skp} SKP`) tak pernah memuat `reduce(`. */
  const NEWLINE = /\r?\n/;
  const PUNYA_REDUCE = /\breduce\s*\(/;
  const PUNYA_SKP = /\.skp\b/;
  const menjumlahSkpMentah = (line: string) => PUNYA_REDUCE.test(line) && PUNYA_SKP.test(line);

  /** Setiap `view_*.tsx`. Pembaca SKP baru tak dapat menyelinap tanpa terdaftar. */
  const SEMUA_VIEW = readdirSync(SRC).filter((f) => /^view_.*\.tsx$/.test(f));

  it('daftar view tidak kosong — gerbang ini harus benar-benar memindai sesuatu', () => {
    expect(SEMUA_VIEW.length).toBeGreaterThan(50);
    expect(SEMUA_VIEW).toContain('view_personal.tsx');
    expect(SEMUA_VIEW).toContain('view_people.tsx');
  });

  it('TIDAK ADA view yang menjumlahkan SKP mentah — satu mesin PPL, tanpa kecuali', () => {
    /* Pola yang dicabut: `recs.reduce((a, r) => a + (r.skp || 0), 0)`.
       Dipindai per-BARIS (setelah komentar dibuang): sebuah baris yang memuat
       `reduce(` sekaligus `.skp` adalah penjumlahan SKP tangan sendiri —
       sementara baris render (`{r.skp} SKP`) tak pernah memuat `reduce(`. */
    const pelanggar: string[] = [];
    for (const f of SEMUA_VIEW) {
      /* baris dilaporkan apa adanya, bukan nomornya: `read` membuang komentar
         sehingga penomoran tak lagi sejajar dengan berkas aslinya. */
      for (const line of read(f).split(NEWLINE)) {
        if (menjumlahSkpMentah(line)) pelanggar.push(`${f} → ${line.trim()}`);
      }
    }
    expect(pelanggar).toEqual([]);
  });

  it('gerbang itu benar-benar MENANGKAP polanya (kontrol negatif)', () => {
    /* Gerbang yang tak pernah merah tak membuktikan apa pun. */
    const contoh = 'const skpTotal = skpRecs.reduce((a, r) => a + (r.skp || 0), 0);';
    expect(menjumlahSkpMentah(contoh)).toBe(true);
    const render = '<span className="mono">{r.skp} SKP</span>';
    expect(menjumlahSkpMentah(render)).toBe(false);
  });

  /* ---- view_personal: mesin, komposisi, dan yang WAJIB ditampilkan ---- */

  it('view_personal masuk lewat `pplPeriod`, bukan `pplStatus` telanjang', () => {
    const src = read('view_personal.tsx');
    expect(src).toMatch(/pplPeriod\(/);
    /* dan periodenya dari klok SSOT, bukan `new Date()` lokal peramban */
    expect(src).toMatch(/pplPeriod\(skpAll, String\(AMS\.TODAY\)\)/);
  });

  it('view_personal merakit KETIGA register lewat `skpEntriesOf`', () => {
    const src = read('view_personal.tsx');
    expect(src).toMatch(/skpEntriesOf</);
    /* register ketiga — kredit pelatihan — yang dulu tak pernah ia baca */
    expect(src).toContain('cpeFromTraining');
    expect(src).toContain('trainingAttendance.v1');
    /* dan tak lagi merakit tangan sendiri dari cpeExtra + cpeLog */
    expect(src).not.toMatch(/\[\s*\.\.\.\(cpeExtraAll\[/);
  });

  it('view_personal tidak lagi menghitung kepatuhan sendiri', () => {
    /* pola lama: `skpTotal >= req.annual && skpStruct >= req.structured` */
    expect(read('view_personal.tsx')).not.toMatch(/>=\s*req\.annual\s*&&/);
    /* ambang tak lagi diambil dari CPE_REQ per-view */
    expect(read('view_personal.tsx')).not.toContain('CPE_REQ');
  });

  it('view_personal menampilkan SKP hangus dan status materi wajib', () => {
    const src = read('view_personal.tsx');
    expect(src).toContain('forfeitedUnstructured');
    expect(src).toContain('topicsTracked');
    /* "patuh tetapi tak terbukti" harus punya kata-katanya sendiri */
    expect(src).toContain('Belum terbukti');
    expect(src).toContain('PPL_SHORTFALL_LABEL');
  });

  it('drawer 360° HCM tidak lagi memutuskan kepatuhan dari jumlah mentah', () => {
    /* Angka SKP KEEMPAT: `cpe >= 40` diwarnai hijau di drawer profil, dihitung
       dari `cpeLog` saja. Gerbang `reduce`+`.skp` di atas yang menemukannya. */
    const src = read('view_pc_hcm.tsx');
    expect(src).toMatch(/pplPeriod\(/);
    expect(src).toMatch(/skpEntriesOf\(/);
    expect(src).not.toMatch(/cpe\s*>=\s*40/);
  });

  it('matriks kehadiran pelatihan menjumlahkan lewat jembatan, bukan katalog', () => {
    /* Σ SKP di matriks harus kredit yang SAMA dengan yang mengalir ke mesin PPL. */
    const src = read('view_pc_talent.tsx');
    expect(src).toContain('cpeFromTraining(A.TRAINING_CATALOG, attendance)');
    expect(src).toMatch(/const gained = trainingSkpFor\(/);
    /* `reduce` lain di berkas ini menghitung KURSI dan KEHADIRAN, bukan SKP —
       gerbang `reduce`+`.skp` di atas yang menjaga bedanya. */
  });

  it('kedua halaman PPL memakai periode yang SAMA — satu klok, satu tahun', () => {
    for (const f of ['view_people.tsx', 'view_personal.tsx']) {
      expect(read(f), f).toMatch(/pplPeriod\(/);
      expect(read(f), f).toMatch(/AMS\.TODAY/);
      /* tahun tak boleh datang dari jam peramban: dua pembaca, dua tahun */
      expect(read(f), f).not.toMatch(/new Date\(\)\.getFullYear\(\)/);
    }
  });

  it('formulir Catat SKP merekam materi wajib untuk entri terstruktur', () => {
    const src = read('view_people.tsx');
    expect(src).toMatch(/needTopic/);
    expect(src).toMatch(/isSkpTopic\(d\.topic\)/);
  });
});
