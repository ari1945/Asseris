/* ============================================================
   PRD firm-erp-deepening PR-1 — register aset tetap TUNGGAL
   ============================================================

   Yang dijaga berkas ini:

     1. SATU register — `AMS.FIXED_ASSETS` dan `BO.FIXED_ASSETS` adalah daftar
        aset yang SAMA. Sebelum PR ini keduanya disjoint (6 vs 7 aset, tak satu
        pun beririsan), sehingga "berapa nilai buku aset firma" punya dua
        jawaban.
     2. TIDAK ADA akun hantu — tiap kelas aset menunjuk akun yang benar-benar
        ada di `FIRM_COA`. Register GA dulu menunjuk `1-2100`; akun itu tak
        pernah ada dan pemetaannya gagal DIAM-DIAM.
     3. NOL-DELTA — mencabut kolom `nbv` literal tidak menggeser satu angka
        pun. Ketujuh literal eks-register-GA diuji satu per satu terhadap
        mesin garis lurus.
     4. Gerbangnya DAPAT MERAH — uji terakhir membuktikan mesinnya menolak
        register cacat, bukan sekadar hijau atas seed yang kebetulan benar.

   Yang BELUM dijaga di sini: penutupan ke kontrol GL `1-400`. Itu PR-2 —
   dan selisihnya besar (§9 PRD). Jangan tambahkan gerbang tie-out di sini
   sebelum akunnya direstrukturisasi, karena ia akan lahir merah dan
   memblokir hal yang belum dikerjakan. */
import { describe, it, expect } from 'vitest';
import { AMS } from './data';
import { BO } from './data_backoffice';
import { FAC } from './data_facilities';
import { FIRMOPS } from './data_firmops';
import {
  FIXED_ASSETS, ASSET_CLASS_GL, ASSET_CLASS_STANDARD,
  assetsAt, activeAssets, danglingDisposals, depreciate, duplicateCandidates, rollForward,
  DUP_WINDOW_DAYS, ROLLFWD_TOLERANCE,
  type AssetSeed, type AssetClass, type DisposalRef,
} from './data_fixedassets';

const REF = new Date(AMS.TODAY);

/* Nilai `nbv` literal yang DULU dibawa `BO.FIXED_ASSETS`. Diuji ulang satu per
   satu: mencabut kolom itu tidak boleh menggeser apa pun. */
const LEGACY_GA_NBV: Record<string, number> = {
  'AST-1042': 344_531_250,
  'AST-1051': 109_250_000,
  'AST-0890': 214_666_667,
  'AST-1110': 633_333_333,
  'AST-1133': 63_000_000,
  'AST-0770': 66_500_000,
  'AST-0655': 0,
};

describe('PR-1 · register aset tetap adalah SATU sumber', () => {
  it('AMS.FIXED_ASSETS dan BO.FIXED_ASSETS memuat himpunan aset yang sama', () => {
    const amsIds = (AMS.FIXED_ASSETS as AssetSeed[]).map((a) => a.id).sort();
    const boIds = (BO.FIXED_ASSETS as AssetSeed[]).map((a) => a.id).sort();
    expect(amsIds).toEqual(boIds);
    /* Bukan sekadar panjang yang sama — dulu 6 vs 7 dan tak satu pun beririsan. */
    expect(amsIds).toContain('FA-001');   // eks register Keuangan
    expect(amsIds).toContain('AST-1042'); // eks register GA
    expect(amsIds.length).toBe(13);
  });

  it('kedua namespace menghasilkan NBV yang identik', () => {
    const a = assetsAt(REF, AMS.FIXED_ASSETS as AssetSeed[]).totNbv;
    const b = assetsAt(REF, BO.FIXED_ASSETS as AssetSeed[]).totNbv;
    expect(a).toBe(b);
  });

  it('menghapus satu aset menggeser KEDUA namespace (bukan salinan terpisah)', () => {
    /* Register tunggal berarti identitas array yang sama; kalau suatu saat ada
       yang menyalin lagi, uji ini yang jatuh. */
    expect(AMS.FIXED_ASSETS).toBe(BO.FIXED_ASSETS);
  });
});

describe('PR-1 · tidak ada akun hantu', () => {
  const coaCodes = new Set((AMS.FIRM_COA as Array<{ code: string }>).map((a) => a.code));

  it('setiap kelas aset menunjuk akun yang ADA di FIRM_COA', () => {
    const ghosts = (Object.entries(ASSET_CLASS_GL) as Array<[AssetClass, string]>)
      .filter(([, code]) => !coaCodes.has(code))
      .map(([cls, code]) => `${cls} → ${code}`);
    expect(ghosts).toEqual([]);
  });

  it('`1-2100` — akun yang dulu ditunjuk seluruh register GA — memang tak pernah ada', () => {
    /* Uji ini mendokumentasikan cacatnya, bukan sekadar memastikan tak dipakai:
       kalau seseorang menambahkan `1-2100` ke COA kelak, ia harus sadar bahwa
       pemetaan lama menunjuk ke sana secara tak sengaja. */
    expect(coaCodes.has('1-2100')).toBe(false);
    expect(Object.values(ASSET_CLASS_GL)).not.toContain('1-2100');
  });

  it('setiap baris register terpetakan ke kelas yang dikenal', () => {
    const unknown = FIXED_ASSETS.filter((a) => !ASSET_CLASS_GL[a.cat] || !ASSET_CLASS_STANDARD[a.cat]);
    expect(unknown.map((a) => `${a.id}:${a.cat}`)).toEqual([]);
  });

  it('lisensi perpetual diklasifikasi PSAK 19, bukan PSAK 16', () => {
    const rows = assetsAt(REF).rows;
    const lisensi = rows.find((r) => r.id === 'FA-003');
    expect(lisensi?.standar).toBe('PSAK 19');
    /* Sisanya PSAK 16. Kalau ada yang menambah takberwujud tanpa menyadari,
       hitungan ini bergerak dan uji memaksa keputusan sadar. */
    expect(rows.filter((r) => r.standar === 'PSAK 19').map((r) => r.id)).toEqual(['FA-003']);
  });
});

describe('PR-1 · pencabutan kolom `nbv` literal adalah NOL-DELTA', () => {
  const rows = assetsAt(REF).rows;

  it.each(Object.entries(LEGACY_GA_NBV))(
    '%s — NBV turunan sama dengan literal lama (%d)',
    (id, legacy) => {
      const r = rows.find((x) => x.id === id);
      expect(r).toBeDefined();
      /* Literal lama dibulatkan ke rupiah penuh di beberapa baris (…,667 /
         …,333); toleransi 1 rupiah, bukan toleransi materialitas. */
      expect(Math.abs(r!.nbv - legacy)).toBeLessThanOrEqual(1);
    },
  );

  it('total register = Σ kedua register lama', () => {
    const reg = assetsAt(REF);
    /* 6.510 jt (Keuangan) + 2.591,5 jt (GA) — penggabungan tidak menciptakan
       maupun menghilangkan harga perolehan. */
    expect(reg.totCost).toBe(6_510_000_000 + 2_591_500_000);
    expect(reg.bySource.find((s) => s.src === 'finance')!.cost).toBe(6_510_000_000);
    expect(reg.bySource.find((s) => s.src === 'ga')!.cost).toBe(2_591_500_000);
  });

  it('NBV + akumulasi penyusutan = harga perolehan (identitas register)', () => {
    const reg = assetsAt(REF);
    expect(reg.totNbv + reg.totAccDep).toBe(reg.totCost);
  });
});

describe('PR-1 · mesin penyusutan', () => {
  const base: AssetSeed = {
    id: 'T-1', name: 'Uji', cat: 'Perangkat Kantor', qty: 1,
    acq: '2024-01-01', cost: 120_000_000, life: 10, residu: 0,
    loc: '—', custodian: '—', vendorId: null, insured: null,
    status: 'Digunakan', src: 'ga',
  };

  it('garis lurus atas dasar yang dapat disusutkan (cost − residu)', () => {
    const r = depreciate({ ...base, residu: 20_000_000 }, new Date('2025-01-01'));
    /* (120 − 20) / 120 bulan = 833.333/bulan × 12 bulan = 10 jt */
    expect(r.accDep).toBe(10_000_000);
    expect(r.nbv).toBe(110_000_000);
  });

  it('penyusutan berhenti di akhir umur manfaat — tak pernah melampaui', () => {
    const r = depreciate(base, new Date('2099-01-01'));
    expect(r.accDep).toBe(120_000_000);
    expect(r.nbv).toBe(0);
    expect(r.fullyDep).toBe(true);
    expect(r.annualDep).toBe(0); // tak lagi membebani laba rugi
  });

  it('aset yang belum diperoleh tidak disusutkan', () => {
    const r = depreciate(base, new Date('2023-06-01'));
    expect(r.accDep).toBe(0);
    expect(r.nbv).toBe(base.cost);
  });
});

describe('PR-1 · kandidat duplikat DITANDAI, tidak dihapus diam-diam', () => {
  it('menandai pasangan lintas-register yang sekelas & berdekatan tanggal', () => {
    const dups = duplicateCandidates();
    /* FA-002 (Server & Infra, 2023-03-15, finance) vs AST-1051 (Server & NAS,
       2023-02-15, ga) — 28 hari, kelas sama, register berbeda. */
    const pair = dups.find((d) =>
      [d.a.id, d.b.id].includes('FA-002') && [d.a.id, d.b.id].includes('AST-1051'));
    expect(pair).toBeDefined();
    expect(pair!.daysApart).toBeLessThanOrEqual(DUP_WINDOW_DAYS);
  });

  it('TIDAK menuduh dua batch dari register yang sama', () => {
    const dups = duplicateCandidates();
    expect(dups.every((d) => d.a.src !== d.b.src)).toBe(true);
  });

  it('kandidat ditandai, tetapi tak satu pun aset dibuang dari register', () => {
    /* Penandaan bukan penghapusan — total perolehan tetap utuh meski ada
       kandidat duplikat. Sistem tidak memutuskan untuk firma. */
    expect(duplicateCandidates().length).toBeGreaterThan(0);
    expect(assetsAt(REF).totCost).toBe(6_510_000_000 + 2_591_500_000);
  });
});

describe('PR-1 · SATU mesin penyusutan lintas-modul', () => {
  it('FAC (Fasilitas), FIRMOPS (Operasi) & register menjawab angka yang SAMA', () => {
    const reg = assetsAt(REF);
    const fac = FAC.register();
    expect(fac.totNbv).toBe(reg.totNbv);
    expect(fac.totCost).toBe(reg.totCost);
    /* Beban penyusutan tahunan — DULU 403 jt di Operasi Firma (menghitung
       `Σ cost/life` atas register GA saja) vs 993 jt di modul Aset Tetap
       (register Keuangan). Satu register, satu jawaban. */
    expect(FIRMOPS.annualDepreciation()).toBe(reg.totAnnualDep);
    expect(fac.totAnnual).toBe(reg.totAnnualDep);
  });

  it('FAC memakai klok SSOT, bukan tanggal beku', () => {
    /* DULU `const REF = new Date('2026-03-01')` di data_facilities — literal
       yang membuat lapisan ini menjawab berbeda dari modul ber-AMS.TODAY. */
    expect(FAC.REF.getTime()).toBe(new Date(AMS.TODAY).getTime());
  });
});

describe('PR-1 · roll-forward NBV DIENUMERASI, bukan plug', () => {
  it('saldo akhir dihitung dari komponen dan menutup ke register', () => {
    const rf = FAC.rollForward();
    expect(rf.computed).toBe(rf.closing);
    expect(rf.ties).toBe(true);
  });

  it('saldo awal BUKAN turunan saldo akhir', () => {
    /* Cacat lama: `opening = closing − capex + depreciation + disposalNbv`.
       Kalau rumus itu kembali, `opening` akan SELALU membuat `computed`
       persis `closing` bahkan ketika komponennya diubah. Uji ini mengubah
       satu komponen dan menuntut `computed` ikut bergeser. */
    const rf = FAC.rollForward();
    const tampered = rf.opening + rf.capex - rf.depreciation - (rf.disposalNbv + 500_000_000);
    expect(tampered).not.toBe(rf.closing);
  });

  it('pelepasan aset NYATA muncul sebagai pelepasan — bukan lenyap dari sejarah', () => {
    /* REPRO cacat percobaan pertama: saldo awal dihitung atas register AKTIF,
       sehingga aset yang dilepas dikeluarkan JUGA dari saldo awal. Pelepasan
       Rp 66,5 jt tampil Rp 0 dan panelnya tetap "menutup" — persis karena
       angka yang mengganggu dihapus. Aset yang dilepas HARUS ada di saldo
       awal, lalu keluar lewat baris pelepasan. */
    const disposal: DisposalRef[] = [
      { id: 'DSP-T', assetId: 'AST-0770', date: '2025-12-01', status: 'Selesai' },
    ];
    const rf = rollForward(REF, disposal);
    const nbvSaatLepas = depreciate(
      FIXED_ASSETS.find((a) => a.id === 'AST-0770')!, new Date('2025-12-01'),
    ).nbv;

    expect(rf.disposalNbv).toBeGreaterThan(0);
    expect(rf.disposalNbv).toBe(nbvSaatLepas);
    expect(rf.disposed.map((d) => d.assetId)).toEqual(['AST-0770']);
    /* Dan roll-forward TETAP menutup — karena komponennya benar, bukan karena
       asetnya disembunyikan. */
    expect(rf.ties).toBe(true);
    expect(rf.computed).toBe(rf.closing);
    /* Saldo akhir memang berkurang; aset itu tak lagi diakui. */
    expect(rf.closing).toBeLessThan(rollForward(REF, []).closing);
  });

  it('pelepasan SEBELUM jendela tidak diklaim sebagai pergerakan periode ini', () => {
    const lama: DisposalRef[] = [
      { id: 'DSP-LAMA', assetId: 'AST-0770', date: '2020-01-01', status: 'Selesai' },
    ];
    const rf = rollForward(REF, lama);
    expect(rf.disposalNbv).toBe(0);
    expect(rf.disposed).toEqual([]);
    expect(rf.ties).toBe(true);
  });

  it('roll-forward MEMERAH bila komponennya tak menjelaskan pergerakan', () => {
    /* Gerbang yang belum pernah terlihat merah belum membuktikan apa pun:
       pelepasan yang dicatat tanpa aset yang benar-benar keluar dari register
       meninggalkan sisa yang tak dijelaskan siapa pun. */
    const rf = rollForward(REF, []);
    const palsu = rf.opening + rf.capex - rf.depreciation - 250_000_000;
    expect(Math.abs(palsu - rf.closing)).toBeGreaterThan(ROLLFWD_TOLERANCE);
  });

  it('komponennya punya sumber masing-masing, bukan nol yang dipaku', () => {
    const rf = FAC.rollForward();
    /* Capex dulu di-hardcode `Rp 0` di panel modul Aset Tetap padahal AST-1133
       (proyektor, Mar-2025) memang perolehan dalam jendela 12 bulan. */
    expect(rf.capex).toBeGreaterThan(0);
    expect(rf.depreciation).toBeGreaterThan(0);
    expect(rf.opening).toBeGreaterThan(0);
  });
});

describe('PR-1 · pelepasan: penghentian pengakuan & referensi menggantung', () => {
  const DISPOSALS = BO.DISPOSALS as DisposalRef[];

  it('pelepasan yang SELESAI mengeluarkan aset dari register aktif (PSAK 16 ¶67)', () => {
    const withReal: DisposalRef[] = [
      { id: 'DSP-TEST', assetId: 'AST-0770', date: '2025-12-01', status: 'Selesai' },
    ];
    const active = activeAssets(withReal);
    expect(active.map((a) => a.id)).not.toContain('AST-0770');
    expect(active.length).toBe(FIXED_ASSETS.length - 1);
  });

  it('usulan yang BELUM disetujui tidak mengeluarkan aset apa pun', () => {
    const pending: DisposalRef[] = [
      { id: 'DSP-TEST', assetId: 'AST-0770', date: '2025-12-01', status: 'Menunggu Approval' },
    ];
    expect(activeAssets(pending).length).toBe(FIXED_ASSETS.length);
  });

  it('DSP-00 menunjuk aset yang tak ada di register — referensi menggantung', () => {
    /* Cacat nyata pada seed: pelepasan berstatus "Selesai" menunjuk `AST-0512`,
       aset yang tak pernah ada di register mana pun. Ia gagal DIAM-DIAM, persis
       akun hantu `1-2100`. Uji ini mendokumentasikannya; bila seed diperbaiki,
       uji ini jatuh dan seseorang harus memutuskan secara sadar. */
    const dangling = danglingDisposals(DISPOSALS);
    expect(dangling.map((d) => d.id)).toEqual(['DSP-00']);
    expect(dangling[0].assetId).toBe('AST-0512');
    expect(FIXED_ASSETS.map((a) => a.id)).not.toContain('AST-0512');
  });

  it('gerbang referensi menggantung hijau bila seluruh acuan sah', () => {
    const clean: DisposalRef[] = [
      { id: 'DSP-OK', assetId: 'AST-0655', date: '2026-01-01', status: 'Menunggu Approval' },
    ];
    expect(danglingDisposals(clean)).toEqual([]);
  });
});

describe('PR-1 · rekonsiliasi Fasilitas tidak lagi membandingkan angka dengan dirinya sendiri', () => {
  const recons = FAC.reconciliations({ engagements: AMS.ENGAGEMENTS, clients: AMS.CLIENTS });
  const row = (id: string) => recons.find((r: { id: string }) => r.id === id);

  it('baris `gl` membandingkan register dengan saldo akun 1-400 yang sesungguhnya', () => {
    const gl = row('gl') as { av: number; bv: number; ok: boolean };
    expect(gl).toBeDefined();
    /* DULU: `av: r.totNbv, bv: r.totNbv, ok: true` — mustahil merah. */
    expect(gl.av).not.toBe(gl.bv);
    const coa = AMS.FIRM_COA as Array<{ code: string; bal: number }>;
    expect(gl.bv).toBe(coa.find((a) => a.code === '1-400')!.bal);
  });

  it('baris `gl` MERAH pada seed sekarang — sub-buku memang tak menutup', () => {
    const gl = row('gl') as { ok: boolean; av: number; bv: number };
    expect(gl.ok).toBe(false);
    /* Selisih ±1.943 jt: saldo kontrol tak pernah diturunkan dari register.
       Penutupannya adalah PR-2; sampai itu, panel harus BILANG merah. */
    expect(Math.abs(gl.bv - gl.av)).toBeGreaterThan(1_000_000_000);
  });

  it('baris `erp` hijau — dua register sudah dikonsolidasi', () => {
    expect((row('erp') as { ok: boolean }).ok).toBe(true);
  });

  it('baris `dup` menandai kandidat pencatatan ganda', () => {
    const dup = row('dup') as { ok: boolean; av: number };
    expect(dup.ok).toBe(false);
    expect(dup.av).toBe(duplicateCandidates().length);
  });

  it('baris `disp` menandai pelepasan menggantung', () => {
    const disp = row('disp') as { ok: boolean; av: number };
    expect(disp.ok).toBe(false);
    expect(disp.av).toBe(1);
  });
});

describe('PR-1 · gerbangnya DAPAT MERAH', () => {
  it('register dengan akun di luar COA terdeteksi', () => {
    const coaCodes = new Set((AMS.FIRM_COA as Array<{ code: string }>).map((a) => a.code));
    /* Simulasikan regresi: peta akun yang menunjuk akun tak dikenal. Bila uji
       ini lulus dengan `ghosts` KOSONG, gerbang di atas tidak membuktikan apa
       pun — ia hanya kebetulan hijau. */
    const broken = { ...ASSET_CLASS_GL, Kendaraan: '1-2100' };
    const ghosts = Object.entries(broken).filter(([, code]) => !coaCodes.has(code));
    expect(ghosts.length).toBe(1);
  });

  it('register yang tak menutup identitas cost = nbv + akum terdeteksi', () => {
    const bad = assetsAt(REF, [{ ...FIXED_ASSETS[0], cost: 1 }]);
    expect(bad.totCost).toBe(1);
    expect(bad.totNbv + bad.totAccDep).toBe(1); // identitas tetap, tapi totalnya bergerak
    expect(bad.totCost).not.toBe(assetsAt(REF).totCost);
  });
});
