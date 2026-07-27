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
    expect(fr.pkp).toBe(30_750);                    // 25.750 + 1.200 − 3.000 + 6.800
    expect(FISCAL).not.toHaveProperty('pkp');       // tak boleh kembali jadi konstanta
    expect(FISCAL).not.toHaveProperty('pbt');
  });

  it('beda permanen & movement beda temporer TETAP input kertas kerja fiskal', () => {
    expect(fr.permAdd).toBe(1_200);
    expect(fr.permLess).toBe(3_000);
    expect(fr.tempMovement).toBe(6_800);
    /* total movement = jumlah rinciannya (satu daftar, dua konsumen: total di
       canon, baris tabel di view PSAK 46) */
    expect(FISCAL.tempMovementItems.reduce((s, x) => s + x.v, 0)).toBe(fr.tempMovement);
    expect(FISCAL.tempMovementItems).toHaveLength(4);
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
    expect(dt.pkp).toBe(30_750);
    expect(dt.currentTax).toBe(Math.round(30_750 * 0.22));          // 6.765
    expect(dt.taxExpense).toBe(dt.currentTax - dt.deferredPL);      // 5.269
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
