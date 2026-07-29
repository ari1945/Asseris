/* ============================================================
   PR-F — Rekonsiliasi fiskal PSAK 46 sebagai TURUNAN, bukan konstanta.

   Sebelum PR-F, `FISCAL.pbt = 48.500` dan `FISCAL.pkp = 53.500` adalah dua
   konstanta yang identitas rekonsiliasinya benar secara aritmetika
   (48.500 + 1.200 − 3.000 + 6.800 = 53.500 ✓) tetapi titik berangkatnya
   membantah buku besar: PBT turunan WTB adalah 29.690 (unadj) / 25.750
   (dilaporkan) / 22.780 (bila seluruh usulan diposting). Akibatnya satu entitas
   melaporkan DUA beban pajak — 11.770 lewat jalur PSAK 46 dan 5.665 lewat WTB.

   Uji di bawah memaku RANTAI-nya, bukan angka akhirnya: bila seseorang menala
   ulang salah satu ujung tanpa yang lain, uji ini yang gagal lebih dulu.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { fiscalReconciliation, entityFigures, ajeEffect, FISCAL } from './canon_base';
import { deferredTax } from './canon_part1';
import type { WTB } from './canon_types';
import type { AjeLike } from './canon_base';
import { AMS } from './data';
import { FIXTURE_WTB, FIXTURE_TB_FULL } from './__fixtures__/wtb';

const SEED = AMS.WTB as unknown as WTB;
const SEED_AJE = AMS.AJE as unknown as AjeLike[];

describe('fiscalReconciliation() — basis PBT dilaporkan (Opsi 1)', () => {
  const fr = fiscalReconciliation();

  it('PBT = WTB unadjusted + efek jurnal TERPOSTING, bukan kolom adj', () => {
    expect(fr.pbtUnadj).toBe(29_690);
    expect(fr.ajePosted).toBe(-3_940);
    expect(fr.pbt).toBe(25_750);
    /* Rantai ke selektor sumber — bukan pengulangan angka literal. */
    const unadj = entityFigures(SEED, 'unadj').pbt!;
    const posted = ajeEffect(SEED_AJE, 'Posted').pbt;
    expect(fr.pbt).toBe(Math.round((unadj + posted) / 1e6));
    /* dan itu BUKAN kolom `adj` WTB (yang memuat dua usulan belum diputuskan) */
    expect(fr.pbt).not.toBe(Math.round(entityFigures(SEED, 'adj').pbt! / 1e6));
  });

  it('PKP adalah identitas rekonsiliasi, bukan nilai tersimpan', () => {
    expect(fr.pkp).toBe(fr.pbt + fr.permAdd - fr.permLess + fr.tempMovement);
    /* PR-G1 — 25.750 + 1.200 − 3.000 + 7.420. Movement naik 6.800 → 7.420 karena
       koreksi fiskal AJE-02 (CKPN 620 jt, Ps. 9(1)(c) UU PPh) kini terhitung. */
    expect(fr.pkp).toBe(31_370);
    expect(FISCAL).not.toHaveProperty('pkp');       // tak boleh kembali jadi konstanta
    expect(FISCAL).not.toHaveProperty('pbt');
  });

  /* PR-G1 — KONTRAK BARU. Beda permanen tetap murni input kertas kerja fiskal, tetapi
     movement beda temporer kini DUA LAPIS: kertas kerja klien (pra-audit) + koreksi dari
     jurnal audit terposting. Uji lama memaku lapis pertama sebagai keseluruhan — yaitu
     persis cacatnya: laba komersial bergerak mengikuti jurnal audit, koreksi fiskalnya
     tidak. */
  it('beda permanen TETAP input kertas kerja fiskal', () => {
    expect(fr.permAdd).toBe(1_200);
    expect(fr.permLess).toBe(3_000);
  });

  it('movement beda temporer = kertas kerja klien + koreksi jurnal terposting', () => {
    expect(fr.tempMovementWp).toBe(6_800);
    expect(fr.tempMovementAje).toBe(620);
    expect(fr.tempMovement).toBe(fr.tempMovementWp + fr.tempMovementAje);
    /* lapis pertama = jumlah rinciannya (satu daftar, dua konsumen: total di canon,
       baris tabel di view PSAK 46) */
    expect(FISCAL.tempMovementItems.reduce((s, x) => s + x.v, 0)).toBe(fr.tempMovementWp);
    expect(FISCAL.tempMovementItems).toHaveLength(4);
  });

  it('hanya jurnal TERPOSTING & berklasifikasi temporer yang menggerakkan movement', () => {
    /* AJE-05 (koreksi penyusutan, Ps. 11 UU PPh) berklasifikasi temporer TETAPI masih
       usulan → tak boleh terhitung. AJE-01/03/04 terposting tetapi nol beda. */
    expect(fr.taxEffectItems.map(x => x.id)).toEqual(['AJE-02']);
    expect(fr.taxEffectItems[0].bucket).toBe('ecl');
    expect(fr.taxEffectItems[0].basis).toMatch(/9\(1\)\(c\)/);
  });

  it('jurnal terposting tanpa klasifikasi fiskal DILAPORKAN, bukan dianggap nol beda', () => {
    expect(fr.unclassifiedAje).toEqual([]);          // seluruh seed sudah diklasifikasi
    const tanpa = fiscalReconciliation(SEED, [
      { id: 'AJE-X', status: 'Posted', dr: '5-3100 Beban', cr: '2-1300 Akrual', amount: 500_000_000 },
    ]);
    expect(tanpa.unclassifiedAje).toEqual(['AJE-X']);
    expect(tanpa.tempMovementAje).toBe(0);           // diam TIDAK menambah koreksi
  });

  it('konsekuensi di luar tahun berjalan dibawa sebagai catatan (mis. pembetulan SPT)', () => {
    expect(fr.taxNotes.map(n => n.id)).toContain('AJE-03');
    expect(fr.taxNotes.find(n => n.id === 'AJE-03')!.note).toMatch(/Ps\. 8 UU KUP/);
  });

  it('membawa daftar jurnal yang masih usulan — rekonsiliasi fiskal di hilir AJE', () => {
    expect(fr.pendingAje).toEqual(['AJE-03', 'AJE-05']);
  });

  it('kontrak kanon: dapat dipanggil tanpa argumen DAN murni terhadap argumen', () => {
    expect(fiscalReconciliation().pbt).toBe(25_750);
    /* register AJE kosong → PBT jatuh ke unadjusted (nol jurnal terposting) */
    expect(fiscalReconciliation(SEED, []).pbt).toBe(29_690);
    /* seluruh jurnal seed dianggap terposting → PBT = kolom adj 22.780 */
    const allPosted = SEED_AJE.map(a => ({ ...a, status: 'Posted' }));
    expect(fiscalReconciliation(SEED, allPosted).pbt).toBe(22_780);
  });

  /* Sengaja dipaku: `[]` BUKAN cara memberi populasi kosong — ia memicu fallback
     singleton `wtbRows()`, aturan yang sama dengan wtbRow/wtbVal dan yang menopang
     kontrak zero-arg. Tanpa uji ini seseorang akan menyimpulkan dari tanda tangan
     fungsinya bahwa `[]` berarti "tak ada data", lalu heran melihat angka seed. */
  it('WTB `[]` jatuh ke singleton (aturan wtbRows), bukan populasi kosong', () => {
    expect(fiscalReconciliation([], []).pbt).toBe(fiscalReconciliation(SEED, []).pbt);
  });

  it('murni terhadap WTB yang diberi: fixture lengkap memberi PBT-nya sendiri', () => {
    const fr2 = fiscalReconciliation(FIXTURE_TB_FULL as unknown as WTB, []);
    expect(fr2.pbt).toBe(11_000);                                   // FIXTURE_TB_FIGURES.unadj.pbt
    expect(fr2.pkp).toBe(11_000 + 1_200 - 3_000 + 6_800);
  });
});

describe('deferredTax() — konsumen rekonsiliasi fiskal', () => {
  it('pajak kini = PKP × 22%, dan identitas pembukuan tetap tertutup', () => {
    const dt = deferredTax();
    expect(dt.pkp).toBe(31_370);
    expect(dt.currentTax).toBe(Math.round(31_370 * 0.22));          // 6.901
    expect(dt.taxExpense).toBe(dt.currentTax - dt.deferredPL);      // 5.269
  });

  /* PR-G1 — INVARIANS YANG MENJELASKAN MENGAPA CACAT INI BERTAHAN LIMA EVALUASI.
     `tempMovement` masuk `currentTax` (+) dan `deferredPL` (−) dengan bobot yang sama,
     sehingga LENYAP dari beban pajak: taxExpense = (pbt + permAdd − permLess) × tarif.
     Akibatnya movement yang salah tak pernah menggerakkan angka yang paling banyak
     dilihat orang — hanya PEMISAHAN pajak kini vs tangguhan yang salah, yaitu justru
     yang menentukan angka SPT dan pos DTA di neraca. */
  it('beban yang seluruhnya dikoreksi fiskal TIDAK menggerakkan pajak kini — seluruhnya ke tangguhan', () => {
    const base = deferredTax();
    const naik = deferredTax(SEED, [
      ...SEED_AJE,
      { id: 'AJE-Z', status: 'Posted', dr: '5-3100 Beban', cr: '1-1210 CKPN', amount: 1_000_000_000,
        taxEffect: { kind: 'temporary' as const, bucket: 'ecl' as const, amount: 1_000, basis: 'uji' } },
    ]);
    /* Beban komersial turun 1.000 (PBT −1.000) tetapi dikoreksi kembali 1.000 di
       movement → PKP dan pajak kini TIDAK bergerak sedikit pun. Itulah arti "beda
       temporer": kewajiban pajak tahun berjalan tak tersentuh. */
    expect(naik.pbt).toBe(base.pbt - 1_000);
    expect(naik.pkp).toBe(base.pkp);
    expect(naik.currentTax).toBe(base.currentTax);
    /* Seluruh efeknya mendarat di pajak tangguhan… */
    expect(naik.deferredPL - base.deferredPL).toBe(Math.round(1_000 * 0.22));
    /* …dan beban pajak turun persis sebesar tarif × beban, bukan lebih. */
    expect(base.taxExpense - naik.taxExpense).toBe(Math.round(1_000 * 0.22));
  });

  /* Kontrol negatif: jurnal dengan beban yang SAMA tetapi berklasifikasi `none`
     justru menurunkan pajak kini — pembeda yang dulu tak ada sama sekali. */
  it('beban yang deductible menurunkan pajak kini; klasifikasi fiskal yang membedakannya', () => {
    const ded = deferredTax(SEED, [
      ...SEED_AJE,
      { id: 'AJE-Y', status: 'Posted', dr: '5-3100 Beban', cr: '2-1300 Akrual', amount: 1_000_000_000,
        taxEffect: { kind: 'none' as const, basis: 'uji — deductible akrual' } },
    ]);
    const base = deferredTax();
    expect(ded.pkp).toBe(base.pkp - 1_000);
    expect(base.currentTax - ded.currentTax).toBe(Math.round(1_000 * 0.22));
    expect(ded.deferredPL).toBe(base.deferredPL);
  });

  it('identitas ETR: beban pajak = (PBT + permAdd − permLess) × tarif', () => {
    const dt = deferredTax();
    const fr = fiscalReconciliation();
    const viaEtr = Math.round(fr.pbt * dt.rate)
                 + Math.round(fr.permAdd * dt.rate)
                 - Math.round(fr.permLess * dt.rate);
    /* Baris "penyesuaian periode lalu" pada rekonsiliasi tarif efektif harus
       NOL — kalau tidak, panel PSAK 46 memunculkan baris penyeimbang palsu. */
    expect(viaEtr).toBe(dt.taxExpense);
  });

  it('register AJE hidup menggerakkan pajak kini (modul PSAK 46 kini reaktif)', () => {
    const none = deferredTax(SEED, []);                              // nol jurnal terposting
    const some = deferredTax(SEED, SEED_AJE);
    expect(none.pbt).toBe(29_690);
    expect(some.pbt).toBe(25_750);
    expect(none.currentTax).toBeGreaterThan(some.currentTax);
  });

  it('ETR null (bukan Infinity) bila PBT nol', () => {
    /* FIXTURE_WTB hanya memuat pos ber-WTB_MAP — tanpa akun 4-/5- selain pajak,
       sehingga PBT-nya nol. Dulu mustahil karena pbt konstanta 48.500. */
    const dt = deferredTax(FIXTURE_WTB as unknown as WTB, []);
    expect(dt.pbt).toBe(0);
    expect(dt.etr).toBeNull();
    expect(Number.isFinite(dt.closing)).toBe(true);                  // DTA tetap terhitung
  });
});

/* ============================================================
   PR-H0 — GERBANG KESETARAAN JALUR.

   PR-G1 lolos seluruh gerbang (typecheck 0 · lint 0 · 755 test) sambil hanya
   terpasang pada SATU dari tiga bentuk pemanggilan, karena setiap uji yang ada
   memakai `deferredTax()` zero-arg atau `deferredTax(SEED, SEED_AJE)` — dan
   keduanya kebetulan benar. Bentuk yang salah, `deferredTax(wtb)`, justru yang
   dipakai `view_psak71` dan `view_reconcile`.

   Ini kelas kegagalan yang sama dengan oracle materialitas (#138): uji memaku
   jalur yang tak dipakai satu view pun. Karena itu penjaganya bukan "angka X
   benar" melainkan "KETIGA jalur menjawab sama" — pernyataan yang tak dapat
   dipenuhi oleh perbaikan separuh.
   ============================================================ */
describe('PR-H0 — ketiga bentuk pemanggilan deferredTax() menjawab satu basis', () => {
  const zero = deferredTax();
  const wtbOnly = deferredTax(SEED);
  const both = deferredTax(SEED, SEED_AJE);
  const bucket = (d: ReturnType<typeof deferredTax>, id: string) =>
    d.items.find(i => i.id === id)!;

  it.each(['ecl', 'ppe', 'eb', 'lse', 'prv', 'tlc'])(
    'saldo ember %s identik pada zero-arg / (wtb) / (wtb, aje)', (id) => {
      expect(bucket(wtbOnly, id).diff).toBe(bucket(zero, id).diff);
      expect(bucket(wtbOnly, id).diff).toBe(bucket(both, id).diff);
      expect(bucket(wtbOnly, id).car).toBe(bucket(both, id).car);
    });

  it('agregat DTA & suku identitas juga identik', () => {
    for (const k of ['closing', 'opening', 'currentTax', 'deferredPL', 'taxExpense', 'pbt', 'pkp'] as const) {
      expect([k, wtbOnly[k]]).toEqual([k, zero[k]]);
      expect([k, wtbOnly[k]]).toEqual([k, both[k]]);
    }
  });

  /* Penjaga arah: nilai yang dulu bocor. Bila `reportedBalance` kehilangan
     fallback-nya lagi, ember `ecl` kembali ke 1.980 (kolom `unadj` mentah) dan
     baris ini gagal lebih dulu — sebelum snapshot manapun bergerak. */
  it('saldo ember ecl = basis DILAPORKAN (2.600), bukan unadj mentah (1.980)', () => {
    expect(bucket(wtbOnly, 'ecl').diff).toBe(2_600);
    expect(bucket(wtbOnly, 'ecl').diff).not.toBe(1_980);
  });

  /* `[]` eksplisit BUKAN "tak diisi": nol jurnal terposting adalah pernyataan,
     dan fallback tidak boleh menimpanya. */
  it('larik kosong eksplisit tidak jatuh ke register singleton', () => {
    expect(bucket(deferredTax(SEED, []), 'ecl').diff).toBe(1_980);
  });
});

describe('penjaga anti-kambuh — angka fantasi tidak boleh kembali', () => {
  it('tak ada 48.500 / 53.500 / 11.770 di jalur perhitungan PSAK 46', () => {
    const dt = deferredTax();
    expect(dt.pbt).not.toBe(48_500);
    expect(dt.pkp).not.toBe(53_500);
    expect(dt.currentTax).not.toBe(11_770);
  });

  it('PBT fiskal = PBT dilaporkan yang dipakai modul AJE & SAD (satu angka)', () => {
    /* Kriteria sukses PRD: satu entitas, satu PBT dilaporkan. Bila modul lain
       menghitungnya lewat jalan sendiri, keduanya wajib mendarat di sini. */
    const unadj = entityFigures(SEED, 'unadj').pbt!;
    const posted = ajeEffect(SEED_AJE, 'Posted').pbt;
    expect(deferredTax().pbt).toBe(Math.round((unadj + posted) / 1e6));
  });
});
