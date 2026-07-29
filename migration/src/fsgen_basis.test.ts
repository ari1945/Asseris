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
