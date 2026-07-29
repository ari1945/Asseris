/* ============================================================
   PR-H1 — BASIS PENYAJIAN: gerbang falsifikasi.

   Yang dijaga di sini bukan "angka X benar" melainkan sifat yang HARUS bertahan
   pada ketiga basis. Alasannya diperoleh dengan cara yang mahal: PRD PR-H
   menyimpulkan — dari penalaran double-entry yang terdengar meyakinkan — bahwa
   memindahkan SELURUH akun ke basis lain otomatis menjaga neraca seimbang.
   Itu KELIRU, dan yang menangkapnya adalah uji `cashTies`, bukan penalaran.

   Sebabnya: WTB mempertahankan akun 4-/5- TERBUKA sementara `3-2100 Saldo Laba`
   adalah saldo PENUTUP yang sudah memuat laba basis `ifAllProposed`. Jurnal audit
   menyentuh satu kaki laba-rugi dan satu kaki neraca, tetapi kaki laba-ruginya
   tak pernah ditutup ke ekuitas di kolom WTB mana pun. Terukur sebelum perbaikan:
   bsDiff 6.910 / 2.970 / 0 untuk unadj / reported / ifAllProposed.

   Karena itu invarian di bawah ditulis sebagai KUANTIFIKASI ATAS SELURUH BASIS.
   Uji yang hanya memeriksa basis default akan lolos sambil membiarkan dua basis
   lain menerbitkan neraca yang tidak seimbang.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { FSGEN } from './fsgen_model';
import { AMS_FORENSIC } from './forensic_canon';
import { AMS } from './data';
import { wtbOn } from './canon_base';
import type { WTB, WtbBasis } from './canon_types';

const BASES: WtbBasis[] = ['unadj', 'reported', 'ifAllProposed'];
const WTB_SEED = AMS.WTB as unknown as WTB;
const TOL = 1e6;                                   // Rp 1 jt — toleransi yang dipakai model

describe('PR-H1 — laporan keuangan seimbang & menutup pada SETIAP basis', () => {
  it.each(BASES)('basis %s: neraca seimbang', (basis) => {
    const m = FSGEN.buildModel(WTB_SEED, undefined, basis);
    expect(Math.abs(m.bs.bsDiff.cy)).toBeLessThan(TOL);
    expect(m.bs.balanced).toBe(true);
  });

  it.each(BASES)('basis %s: arus kas menutup ke saldo kas neraca', (basis) => {
    const m = FSGEN.buildModel(WTB_SEED, undefined, basis);
    expect(m.cf.ties).toBe(true);
    expect(Math.abs(m.cf.cashClose - m.cf.cashBS)).toBeLessThan(TOL);
  });

  it.each(BASES)('basis %s: metode langsung = metode tidak langsung', (basis) => {
    const m = FSGEN.buildModel(WTB_SEED, undefined, basis);
    expect(m.cf.methodTies).toBe(true);
  });

  it.each(BASES)('basis %s: jembatan arus kas forensik tie ke model FSGEN', (basis) => {
    const m = FSGEN.buildModel(WTB_SEED, undefined, basis);
    const B = AMS_FORENSIC.buildCash(m, WTB_SEED, undefined, basis)!;
    expect(B).not.toBeNull();
    /* Ketiganya HARUS ikut basis yang sama. `dmod` forensik dulu membaca `r.adj`
       lewat akses-properti — bentuk yang lolos dari sapuan `wtbVal(…, 'adj')` —
       sehingga jembatan ini diam-diam membandingkan dua basis. */
    expect(B.cfoTies).toBe(true);
    expect(B.bridgeTies).toBe(true);
    expect(B.cashTies).toBe(true);
  });

  /* OCI adalah pengukuran kembali aktuarial: ia TIDAK bergantung pada status jurnal
     audit. Bila plug ini bergerak antar-basis, itu tanda ia sedang menyerap
     ketidakseimbangan basis alih-alih melaporkan OCI — persis keadaan sebelum PR-H1
     (terukur: −356 / 3.584 / 6.554). Invarian ini yang membuat penutupan saldo laba
     dapat dinyatakan BENAR, bukan sekadar "membuat angka menutup". */
  it('plug OCI identik pada ketiga basis (tidak menyerap selisih basis)', () => {
    const [a, b, c] = BASES.map(x => FSGEN.buildModel(WTB_SEED, undefined, x).eqr.oci);
    expect(b).toBeCloseTo(a, 6);
    expect(c).toBeCloseTo(a, 6);
  });
});

describe('PR-H1 — basis mengubah angka ke arah yang benar', () => {
  const m = Object.fromEntries(BASES.map(b => [b, FSGEN.buildModel(WTB_SEED, undefined, b)]));
  const jt = (n: number) => Math.round(n / 1e6);

  /* AJE-03 (1.850, usulan) membalik pendapatan; AJE-05 (1.120, usulan) menambah
     penyusutan. Keduanya menurunkan laba HANYA bila diterima. */
  it('laba neto: reported di antara unadj dan ifAllProposed', () => {
    expect(jt(m.unadj.is.netIncome.cy)).toBe(18_450);
    expect(jt(m.reported.is.netIncome.cy)).toBe(14_510);
    expect(jt(m.ifAllProposed.is.netIncome.cy)).toBe(11_540);
    /* selisih reported → ifAllProposed = efek laba kedua usulan */
    expect(jt(m.reported.is.netIncome.cy) - jt(m.ifAllProposed.is.netIncome.cy)).toBe(2_970);
  });

  it('aset tetap neto: usulan AJE-05 dikecualikan dari basis DILAPORKAN', () => {
    const ppe = (x: keyof typeof m) => jt(m[x].bs.nca.find(l => l.key === 'asettetap')!.cy);
    expect(ppe('reported') - ppe('ifAllProposed')).toBe(1_120);
  });

  /* Penjaga anti-kambuh: `ifAllProposed` WAJIB mereproduksi perilaku pra-PR-H1
     persis, kalau tidak sakelar "bila semua usulan diterima" berbohong. */
  it('ifAllProposed mereproduksi angka pra-PR-H1 (kolom adj)', () => {
    expect(jt(m.ifAllProposed.bs.totalAssets.cy)).toBe(316_558);
    expect(jt(m.ifAllProposed.is.sales.cy)).toBe(330_050);
    expect(jt(m.ifAllProposed.is.cogs.cy)).toBe(233_600);
  });
});

/* ============================================================
   REAKTIVITAS — kriteria yang membuat seluruh perubahan ini ada gunanya.

   Basis DILAPORKAN ditentukan STATUS POSTING. Bila angka modul tidak bergerak
   saat partner memposting jurnal, maka "dilaporkan" hanya label baru untuk
   konstanta — dan cacatnya lebih halus daripada sebelumnya, karena kini ia
   MENGAKU reaktif. Diuji dengan menggerakkan status, bukan dengan mengubah WTB.
   ============================================================ */
describe('PR-H1 — angka bergerak saat status jurnal berubah', () => {
  const jt = (n: number) => Math.round(n / 1e6);
  const withStatus = (id: string, status: string) =>
    (AMS.AJE as Array<{ id: string; status: string }>).map(a => (a.id === id ? { ...a, status } : a));

  const view = (aje: unknown) => {
    const m = FSGEN.buildModel(WTB_SEED, aje as never, 'reported');
    return {
      ppe: jt(m.bs.nca.find(l => l.key === 'asettetap')!.cy),
      piutang: jt(m.bs.ca.find(l => l.key === 'piutang')!.cy),
      laba: jt(m.is.netIncome.cy),
      seimbang: m.bs.balanced, kasTie: m.cf.ties,
    };
  };

  it('memposting AJE-05 menurunkan aset tetap 1.120 jt', () => {
    const before = view(AMS.AJE);
    const after = view(withStatus('AJE-05', 'Posted'));
    expect(before.ppe - after.ppe).toBe(1_120);
    expect(before.laba - after.laba).toBe(1_120);
    /* neraca & arus kas TETAP menutup sesudah status berubah — penutupan saldo
       laba ikut bergerak, bukan dipatok ke satu status tertentu. */
    expect(after.seimbang).toBe(true);
    expect(after.kasTie).toBe(true);
  });

  it('memposting AJE-03 menurunkan piutang neto & laba 1.850 jt', () => {
    const before = view(AMS.AJE);
    const after = view(withStatus('AJE-03', 'Posted'));
    expect(before.piutang - after.piutang).toBe(1_850);
    expect(before.laba - after.laba).toBe(1_850);
    expect(after.seimbang).toBe(true);
    expect(after.kasTie).toBe(true);
  });

  /* Titik temu dua basis: bila SEMUA usulan diposting, basis `reported` wajib
     mendarat PERSIS di `ifAllProposed`. Bila tidak, kedua jalur menghitung hal
     berbeda dan sakelar di layar akan menampilkan dua angka yang tak pernah
     bertemu. */
  it('semua usulan diposting → reported == ifAllProposed', () => {
    const semua = (AMS.AJE as Array<{ status: string }>).map(a => ({ ...a, status: 'Posted' }));
    const rep = FSGEN.buildModel(WTB_SEED, semua as never, 'reported');
    const all = FSGEN.buildModel(WTB_SEED, undefined, 'ifAllProposed');
    expect(jt(rep.bs.totalAssets.cy)).toBe(jt(all.bs.totalAssets.cy));
    expect(jt(rep.is.netIncome.cy)).toBe(jt(all.is.netIncome.cy));
    expect(jt(rep.bs.totalEq.cy)).toBe(jt(all.bs.totalEq.cy));
  });
});

/* ============================================================
   PR-H4 — INVARIAN yang dipakai konsumen tingkat-view.

   `view_dataflow` menyimpulkan "neraca saldo seimbang" dari Σ seluruh baris.
   Klaim yang dipegang saat memindahkannya ke basis DILAPORKAN: jumlah itu
   INVARIAN terhadap basis, karena tiap jurnal berpasangan debit=kredit sehingga
   Σ efeknya nol. Klaim itu dipaku di sini alih-alih dipercaya — kalau suatu
   ketika ada jurnal tak-seimbang masuk register, uji ini yang gagal lebih dulu,
   bukan indikator "seimbang" di layar yang diam-diam berubah arti.
   ============================================================ */
describe('PR-H4 — Σ neraca saldo invarian terhadap basis', () => {
  const total = (basis: WtbBasis) =>
    WTB_SEED.reduce((a, r) => a + wtbOn(WTB_SEED, AMS.AJE as never, r.code, basis), 0);

  it('Σ identik pada unadj / reported / ifAllProposed', () => {
    const [u, r, p] = BASES.map(total);
    expect(Math.round(r)).toBe(Math.round(u));
    expect(Math.round(p)).toBe(Math.round(u));
  });

  /* Σ ≠ 0 pada seed: WTB mempertahankan akun 4-/5- terbuka sementara saldo laba
     adalah saldo penutup. Dinyatakan agar tak ada yang "memperbaiki" jadi nol —
     lihat penutupan laba (`reShift`) di fsgen_model. */
  it('Σ = −laba neto basis ifAllProposed (bukan nol) — sifat WTB, bukan cacat', () => {
    const m = FSGEN.buildModel(WTB_SEED, undefined, 'ifAllProposed');
    expect(Math.round(total('unadj') / 1e6)).toBe(-Math.round(m.is.netIncome.cy / 1e6));
  });
});
