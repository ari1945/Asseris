/* ============================================================
   Aset Tetap — KERTAS KERJA (FA1, gerbang a·b·c·d).

   Yang diuji BUKAN "apakah kolomnya ada", melainkan:
     a. bagian yang DAPAT DINYATAKAN SALAH ikut ke berkas — komponen roll-forward
        DAN `residual`; dan ketika roll-forward tidak menutup, berkasnya
        mengatakannya sejelas layar;
     b. angkanya IDENTIK dengan hasil `rollForward()` untuk masukan yang sama —
        bukan salinan tampilan, bukan hitungan kedua;
     c. melepas satu aset di dalam jendela MENGGESER komponen di berkas
        (gerbang perilaku, bukan gerbang keberadaan kolom);
     d. kandidat pencatatan ganda ikut ke berkas bila ada.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { rp } from './data_base';
import {
  FIXED_ASSETS, assetsAt, activeAssets, duplicateCandidates, rollForward,
  type AssetSeed, type DisposalRef,
} from './data_fixedassets';
import { fixedAssetsExportModel, type AssetExportModel } from './fixedassets_export';

const REF = new Date('2026-03-09');
const GL_CODE = '1-400';
const GL_BAL = 6_100_000_000;

/* Seed pelepasan seperti `BO.DISPOSALS`: DSP-00 Selesai tetapi MENGGANTUNG
   (AST-0512 tak ada di register), DSP-01 belum disetujui. */
const SEED_DISPOSALS: DisposalRef[] = [
  { id: 'DSP-01', assetId: 'AST-0655', date: '2026-03-20', status: 'Menunggu Approval' },
  { id: 'DSP-00', assetId: 'AST-0512', date: '2025-11-10', status: 'Selesai' },
];

function model(disposals: DisposalRef[], seed: AssetSeed[] = FIXED_ASSETS): AssetExportModel {
  return fixedAssetsExportModel({
    register: assetsAt(REF, activeAssets(disposals, seed)),
    rollFwd: rollForward(REF, disposals, seed),
    dups: duplicateCandidates(seed),
    glCode: GL_CODE,
    glBalance: GL_BAL,
    firmName: 'KAP Uji & Rekan',
    preparedOn: '2026-03-09',
    preparedBy: 'Anindya Pramesti',
  });
}

const sheet = (m: AssetExportModel, name: string) => {
  const s = m.sheets.find((x) => x.name === name);
  expect(s, `lembar '${name}' tidak ada di kertas kerja`).toBeTruthy();
  return s!;
};
const komponen = (m: AssetExportModel, label: string): string => {
  const s = sheet(m, 'Roll-Forward NBV');
  const r = s.rows.find((x) => String(x[0]) === label);
  expect(r, `komponen '${label}' tidak ada di lembar roll-forward`).toBeTruthy();
  return String(r![2]);
};

/* ------------------------------------------------------------------
   a — bagian yang dapat dinyatakan salah ikut ke berkas
   ------------------------------------------------------------------ */

describe('FA1a — kertas kerja memuat roll-forward, komponennya, dan `residual`', () => {
  it('lembar roll-forward menyebut kelima komponen dan kedua saldo akhir', () => {
    const m = model(SEED_DISPOSALS);
    const s = sheet(m, 'Roll-Forward NBV');
    const label = s.rows.map((r) => String(r[0]));
    expect(label).toEqual([
      'NBV awal periode',
      '+ Penambahan (capex)',
      '− Beban penyusutan periode',
      '− Pelepasan (NBV pada tanggal pelepasan)',
      'NBV akhir menurut komponen',
      'NBV akhir menurut register',
    ]);
    expect(String(s.totals?.[0]), '`residual` tak punya baris sendiri').toContain('Selisih');
  });

  it('ketika roll-forward TIDAK menutup, berkasnya mengatakannya', () => {
    /* Perolehan bertanggal SESUDAH tanggal acuan: ia ada di saldo akhir menurut
       register (penyusutan 0, NBV = harga perolehan penuh) tetapi bukan saldo
       awal dan bukan capex jendela ini. Tak satu pun komponen menjelaskannya —
       persis bentuk pergerakan yang harus membuat roll-forward gagal. */
    const seed: AssetSeed[] = [...FIXED_ASSETS, {
      id: 'FA-999', name: 'Perolehan bertanggal maju', cat: 'Perangkat Kantor', qty: 1,
      acq: '2026-06-01', cost: 500_000_000, life: 4, residu: 0, loc: '—',
      custodian: '—', vendorId: null, insured: null, status: 'Digunakan', src: 'ga',
    }];
    const rf = rollForward(REF, SEED_DISPOSALS, seed);
    expect(rf.ties, 'fixture gagal: roll-forward justru menutup').toBe(false);

    const m = model(SEED_DISPOSALS, seed);
    expect(String(sheet(m, 'Roll-Forward NBV').totals?.[1])).toContain('TIDAK MENUTUP');
    const meta = m.meta.join(' \n ');
    expect(meta, 'baris meta tak menyatakan kegagalan roll-forward').toContain('TIDAK MENUTUP');
    expect(meta, 'selisihnya tidak disebut angkanya').toContain(rp(rf.residual));
  });

  it('selisihnya tidak dibulatkan hilang', () => {
    const seed: AssetSeed[] = [...FIXED_ASSETS, {
      id: 'FA-998', name: 'Perolehan bertanggal maju (ganjil)', cat: 'Perangkat Kantor', qty: 1,
      acq: '2026-06-01', cost: 1_234_567, life: 4, residu: 0, loc: '—',
      custodian: '—', vendorId: null, insured: null, status: 'Digunakan', src: 'ga',
    }];
    const rf = rollForward(REF, SEED_DISPOSALS, seed);
    const m = model(SEED_DISPOSALS, seed);
    expect(komponen(m, 'NBV akhir menurut komponen')).toBe(rp(rf.computed));
    expect(String(sheet(m, 'Roll-Forward NBV').totals?.[2])).toBe(rp(rf.residual));
    expect(rp(rf.residual)).toContain('1.234.567');
  });

  it('daftar pelepasan yang menjelaskan pergerakan ikut ke berkas', () => {
    expect(sheet(model(SEED_DISPOSALS), 'Pelepasan')).toBeTruthy();
  });
});

/* ------------------------------------------------------------------
   b — angka ekspor == angka mesin
   ------------------------------------------------------------------ */

describe('FA1b — angka di berkas identik dengan hasil `rollForward()`', () => {
  it('tiap komponen sama persis, bukan hitungan kedua', () => {
    const rf = rollForward(REF, SEED_DISPOSALS);
    const m = model(SEED_DISPOSALS);
    expect(komponen(m, 'NBV awal periode')).toBe(rp(rf.opening));
    expect(komponen(m, '+ Penambahan (capex)')).toBe(rp(rf.capex));
    expect(komponen(m, '− Beban penyusutan periode')).toBe(rp(-rf.depreciation));
    expect(komponen(m, '− Pelepasan (NBV pada tanggal pelepasan)')).toBe(rp(-rf.disposalNbv));
    expect(komponen(m, 'NBV akhir menurut komponen')).toBe(rp(rf.computed));
    expect(komponen(m, 'NBV akhir menurut register')).toBe(rp(rf.closing));
    expect(String(sheet(m, 'Roll-Forward NBV').totals?.[2])).toBe(rp(rf.residual));
  });

  it('model MEMAKAI roll-forward yang diberikan — ia tidak menghitung sendiri', () => {
    /* Roll-forward palsu: kalau modul diam-diam memanggil `rollForward()` lagi,
       angka-angka mustahil ini tak akan muncul dan uji memerah. */
    const palsu = {
      ...rollForward(REF, SEED_DISPOSALS),
      opening: 111_111_111, capex: 222_222_222, depreciation: 333_333_333,
      disposalNbv: 444_444_444, computed: 555_555_555, closing: 666_666_666,
      residual: -111_111_111, ties: false,
    };
    const m = fixedAssetsExportModel({
      register: assetsAt(REF, activeAssets(SEED_DISPOSALS)),
      rollFwd: palsu, dups: [], glCode: GL_CODE, glBalance: GL_BAL,
      firmName: 'KAP Uji & Rekan', preparedOn: '2026-03-09',
    });
    expect(komponen(m, 'NBV awal periode')).toBe(rp(111_111_111));
    expect(komponen(m, '− Beban penyusutan periode')).toBe(rp(-333_333_333));
    expect(String(sheet(m, 'Roll-Forward NBV').totals?.[2])).toBe(rp(-111_111_111));
  });

  it('kertas kerja tanpa identitas penerbit DITOLAK', () => {
    expect(() => fixedAssetsExportModel({
      register: assetsAt(REF, activeAssets(SEED_DISPOSALS)),
      rollFwd: rollForward(REF, SEED_DISPOSALS), dups: [],
      glCode: GL_CODE, glBalance: GL_BAL, firmName: '  ', preparedOn: '2026-03-09',
    })).toThrow(/nama firma/i);
  });
});

/* ------------------------------------------------------------------
   c — gerbang PERILAKU
   ------------------------------------------------------------------ */

describe('FA1c — melepas satu aset menggeser komponen di berkas', () => {
  it('pelepasan di dalam jendela mengubah penyusutan, NBV pelepasan, dan saldo akhir', () => {
    const tanpa = model([]);
    const dengan = model([{ id: 'DSP-T1', assetId: 'AST-0770', date: '2025-12-01', status: 'Selesai' }]);

    expect(komponen(tanpa, '− Pelepasan (NBV pada tanggal pelepasan)')).toBe(rp(0));
    expect(komponen(dengan, '− Pelepasan (NBV pada tanggal pelepasan)'))
      .not.toBe(komponen(tanpa, '− Pelepasan (NBV pada tanggal pelepasan)'));
    expect(komponen(dengan, '− Beban penyusutan periode'))
      .not.toBe(komponen(tanpa, '− Beban penyusutan periode'));
    expect(komponen(dengan, 'NBV akhir menurut register'))
      .not.toBe(komponen(tanpa, 'NBV akhir menurut register'));

    /* Asetnya juga hilang dari register aktif dan MUNCUL di daftar pelepasan —
       kalau hanya salah satu yang terjadi, berkasnya bercerita dua versi. */
    const kode = sheet(dengan, 'Register Aset').rows.map((r) => String(r[0]));
    expect(kode).not.toContain('AST-0770');
    const lepas = sheet(dengan, 'Pelepasan').rows.map((r) => String(r[1]));
    expect(lepas).toEqual(['AST-0770']);
    expect(sheet(tanpa, 'Pelepasan').rows.length).toBe(0);
  });

  it('NBV pelepasan dinilai pada TANGGAL PELEPASAN, bukan pada tanggal acuan', () => {
    const d: DisposalRef[] = [{ id: 'DSP-T1', assetId: 'AST-0770', date: '2025-12-01', status: 'Selesai' }];
    const rf = rollForward(REF, d);
    expect(rf.disposed.length).toBe(1);
    expect(String(sheet(model(d), 'Pelepasan').rows[0][3])).toBe(rp(rf.disposed[0].nbv));
  });
});

/* ------------------------------------------------------------------
   d — kandidat pencatatan ganda
   ------------------------------------------------------------------ */

describe('FA1d — kandidat pencatatan ganda ikut ke berkas', () => {
  it('lembar kandidat memuat tiap pasangan yang dihitung mesin', () => {
    const dups = duplicateCandidates();
    expect(dups.length, 'fixture gagal: seed tak punya kandidat').toBeGreaterThan(0);
    const m = model(SEED_DISPOSALS);
    const s = sheet(m, 'Kandidat Pencatatan Ganda');
    expect(s.rows.length).toBe(dups.length);
    for (const d of dups) {
      const fin = d.a.src === 'finance' ? d.a : d.b;
      const ga = d.a.src === 'finance' ? d.b : d.a;
      const baris = s.rows.find((r) => String(r[1]) === fin.id && String(r[3]) === ga.id);
      expect(baris, `pasangan ${fin.id}|${ga.id} tak ada di berkas`).toBeTruthy();
      expect(String(baris![6])).toBe(rp(d.combinedCost));
    }
    expect(m.meta.join(' ')).toContain(`${dups.length} pasangan`);
  });

  it('tanpa kandidat, lembarnya tidak dipaksa ada — dan meta mengatakannya', () => {
    const seed = FIXED_ASSETS.filter((a) => a.src === 'finance');
    expect(duplicateCandidates(seed).length).toBe(0);
    const m = model(SEED_DISPOSALS, seed);
    expect(m.sheets.some((s) => s.name === 'Kandidat Pencatatan Ganda')).toBe(false);
    expect(m.meta.join(' ')).toContain('Tidak ada kandidat pencatatan ganda');
  });
});
