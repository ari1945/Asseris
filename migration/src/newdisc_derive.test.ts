/* ============================================================
   Pengungkapan Baru 2024 — gerbang terhadap angka karangan & reaktivitas semu.
   ------------------------------------------------------------
   Empat cacat yang dipaku di sini, semuanya pernah HIDUP di view_newdisc.tsx:

   (a) REAKTIVITAS SEMU. Memo modul mendeklarasikan `[wtb]` sedangkan badannya
       hanya membaca konstanta modul. Gerbang yang memeriksa "apakah `[wtb]` ada
       di larik dependensi" TIDAK menangkap ini — larik itu memang ada, dan itu
       justru sumber kesalahpahamannya. Karena itu gerbang di sini bersifat
       PERILAKU: neraca saldo diubah, keluaran WAJIB ikut berubah.

   (b) ISOLASI PERIKATAN. Tabel yurisdiksi literal memberi tiap klien eksposur
       top-up yang identik — termasuk nama entitas anak "Sentosa Trading Pte"
       yang muncul pada perikatan yang tak punya hubungan apa pun dengannya.

   (c) SSOT KEDUA. `GROUP_SUBS` (canon_part3) menyimpan entitas yang SAMA dengan
       pbt/tax sendiri: Sentosa Trading = 4.880/830 → ETR 17,0%, DI ATAS tarif
       minimum GloBE. Literal modul menuliskan 10,5%, dan dari selisih karangan
       itulah "eksposur Rp 275 jt" lahir. Gerbang di bawah memaku bahwa angka
       yang tampil kini berasal dari sumber yang sama dengan PSAK 65.

   (d) AMBANG CAKUPAN TAK PERNAH DIUJI. Eksposur top-up diasersikan tanpa pernah
       menanyakan apakah grupnya masuk cakupan GloBE sama sekali.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AMS } from './data';
import { fxAt } from './canon_fx';
import { AMS_CANON } from './canon';
import { WTB_BY_ENGAGEMENT } from './data_wtb_eng';
import type { WTB, WtbRow } from './canon_types';
import {
  P2_MIN_RATE, P2_THRESHOLD_EUR, SF_PAYABLE_CODE,
  pillarTwo, supplierFinance,
} from './newdisc_derive';
import type { P2Component, SfArrangement } from './newdisc_derive';

const HERE = dirname(fileURLToPath(import.meta.url));
/* Kurs dari registry BERMASA BERLAKU, bukan tabel tanpa masa berlaku (CB1).
   Tanggal ini SENGAJA tercakup supaya gerbang aritmetika ambang punya kurs; uji
   terpisah di bawah memakai tanggal pelaporan sesungguhnya yang TAK tercakup. */
const COVERED_DATE = '2026-03-31';
const EUR = fxAt(COVERED_DATE).value!.closing.EUR;
const REPORT_DATE = AMS_CANON.ASOF.y + '-' + String(AMS_CANON.ASOF.m).padStart(2, '0') + '-31';
const SEED_ENG = 'ENG-2025-014';

/* Neraca saldo perikatan seed (ENG-2025-014) tinggal di data_part1 → AMS.WTB. */
const SEED_WTB = AMS.WTB as unknown as WTB;

const SUBS: P2Component[] = AMS_CANON.GROUP_SUBS.map(s => ({
  id: s.id, name: s.name, country: s.country, pbt: s.pbt, tax: s.tax, rev: s.rev,
}));
const ELIM_REV = AMS_CANON.INTERCO.filter(e => e.type === 'Pendapatan').reduce((a, e) => a + e.amount, 0);
const ELIM_PROFIT = AMS_CANON.INTERCO.filter(e => e.type === 'Laba').reduce((a, e) => a + e.amount, 0);

/** Persis bentuk pemanggilan di view: struktur grup HANYA untuk perikatan seed. */
function forEngagement(engId: string, wtb: WTB, parentName: string) {
  const owns = engId === SEED_ENG;
  return pillarTwo({
    wtb, parentName,
    components: owns ? SUBS : [],
    elimRev: owns ? ELIM_REV : 0,
    elimProfit: owns ? ELIM_PROFIT : 0,
    eurRate: EUR,
  });
}

/** Salin neraca saldo dengan satu akun digeser (rupiah penuh) — dipakai gerbang (a). */
function shift(wtb: WTB, code: string, delta: number): WTB {
  return wtb.map(r => (r.code === code
    ? { ...r, unadj: (r.unadj || 0) + delta, adj: (r.adj || 0) + delta }
    : { ...r })) as WTB;
}

/* ============================================================
   GERBANG (a) — REAKTIVITAS: ubah WTB, keluaran WAJIB berubah.
   ============================================================ */
describe('(a) Pilar Dua benar-benar dihitung dari neraca saldo', () => {
  const base = forEngagement(SEED_ENG, SEED_WTB, 'PT Sentosa Makmur Tbk');

  it('figur tersedia untuk perikatan seed', () => {
    expect(base.available).toBe(true);
    expect(base.groupScoped).toBe(true);
  });

  it('menggeser BEBAN PAJAK (5-5100) menggeser beban pajak & ETR grup', () => {
    const bump = 4_000_000_000;                                  // Rp 4 miliar = 4.000 jt
    const moved = forEngagement(SEED_ENG, shift(SEED_WTB, '5-5100', bump), 'PT Sentosa Makmur Tbk');
    expect(moved.totTax).toBe(base.totTax + bump / 1e6);
    expect(moved.etrGroup).not.toBe(base.etrGroup);
    expect(moved.etrGroup as number).toBeGreaterThan(base.etrGroup as number);
  });

  it('menggeser PENJUALAN (4-1100) menggeser laba sebelum pajak, pendapatan & ETR', () => {
    /* Pendapatan tersimpan KREDIT (negatif): −20 miliar = penjualan NAIK 20 miliar. */
    const moved = forEngagement(SEED_ENG, shift(SEED_WTB, '4-1100', -20_000_000_000), 'PT Sentosa Makmur Tbk');
    expect(moved.totPbt).toBe(base.totPbt + 20_000);
    expect(moved.totRev).toBe(base.totRev + 20_000);
    expect(moved.etrGroup).not.toBe(base.etrGroup);
  });

  it('menggeser beban yang TAK dikenal bagan akun tetap mengalir ke PBT (agregasi prefiks)', () => {
    const moved = forEngagement(SEED_ENG, shift(SEED_WTB, '5-2100', 3_000_000_000), 'PT Sentosa Makmur Tbk');
    expect(moved.totPbt).toBe(base.totPbt - 3_000);
  });

  it('neraca saldo kosong → MEMBANTAH, bukan menampilkan nol', () => {
    const none = pillarTwo({ wtb: [] as unknown as WTB, parentName: 'X', components: SUBS, eurRate: EUR });
    expect(none.available).toBe(false);
    expect(none.topUp).toBeNull();
    expect(none.etrGroup).toBeNull();
    expect(none.juris).toHaveLength(0);
  });

  it('ETR null (bukan Infinity / 0%) bila laba sebelum pajak tidak positif', () => {
    /* Hapus seluruh pendapatan → rugi. "ETR atas kerugian" bukan besaran bermakna. */
    const rugi = SEED_WTB.map(r => (String(r.code || '').startsWith('4')
      ? { ...r, unadj: 0, adj: 0 } : { ...r })) as WTB;
    const out = pillarTwo({ wtb: rugi, parentName: 'X', eurRate: EUR });
    expect(out.available).toBe(true);
    expect(out.juris[0].etr).toBeNull();
    expect(out.etrGroup).toBeNull();
    expect(Number.isFinite(out.juris[0].etr as number)).toBe(false);
  });
});

/* ============================================================
   GERBANG (b) — ISOLASI: perikatan berbeda, angka berbeda.
   ============================================================ */
describe('(b) Pilar Dua terisolasi per perikatan', () => {
  const OTHERS = Object.keys(WTB_BY_ENGAGEMENT);

  it('ada perikatan non-seed untuk diuji (bukan hanya perikatan bawaan)', () => {
    expect(OTHERS.length).toBeGreaterThanOrEqual(2);
    expect(OTHERS).not.toContain(SEED_ENG);
  });

  it('setiap perikatan memberi laba/pajak/ETR yang BERBEDA — tak ada dua yang sama', () => {
    const all = [
      forEngagement(SEED_ENG, SEED_WTB, 'PT Sentosa Makmur Tbk'),
      ...OTHERS.map(id => forEngagement(id, WTB_BY_ENGAGEMENT[id] as unknown as WTB, id)),
    ];
    all.forEach(x => expect(x.available).toBe(true));
    const sig = all.map(x => [x.totPbt, x.totTax, x.totRev].join('|'));
    expect(new Set(sig).size).toBe(all.length);
  });

  it('DUA perikatan non-seed pun berbeda satu sama lain (seed tidak menopang gerbang)', () => {
    const [a, b] = OTHERS;
    const A = forEngagement(a, WTB_BY_ENGAGEMENT[a] as unknown as WTB, a);
    const B = forEngagement(b, WTB_BY_ENGAGEMENT[b] as unknown as WTB, b);
    expect(A.totPbt).not.toBe(B.totPbt);
    expect(A.totTax).not.toBe(B.totTax);
    expect(A.etrGroup).not.toBe(B.etrGroup);
  });

  it('entitas anak klien seed TIDAK muncul pada perikatan lain', () => {
    const seedNames = SUBS.map(s => s.name);
    expect(seedNames).toContain('Sentosa Trading Pte Ltd');       // memang ada di canon…
    OTHERS.forEach(id => {
      const out = forEngagement(id, WTB_BY_ENGAGEMENT[id] as unknown as WTB, id);
      const shown = out.juris.flatMap(j => j.entities);
      seedNames.forEach(n => expect(shown).not.toContain(n));      // …tapi TIDAK di sini
      expect(out.juris.map(j => j.country)).not.toContain('Singapura');
      expect(out.groupScoped).toBe(false);
    });
  });

  it('tanpa struktur grup terdaftar, cakupan & top-up MEMBANTAH — tidak dinyatakan nol', () => {
    OTHERS.forEach(id => {
      const out = forEngagement(id, WTB_BY_ENGAGEMENT[id] as unknown as WTB, id);
      expect(out.inScope).toBe(false);
      expect(out.topUp).toBeNull();
      expect(out.juris).toHaveLength(1);                            // hanya yurisdiksi induk
    });
  });
});

/* ============================================================
   (c) SSOT — angka yurisdiksi = angka PSAK 65, bukan salinan kedua.
   ============================================================ */
describe('(c) profil yurisdiksi menutup ke struktur grup kanonik', () => {
  const out = forEngagement(SEED_ENG, SEED_WTB, 'PT Sentosa Makmur Tbk');

  it('Σ yurisdiksi = induk (setelah eliminasi laba) + Σ komponen — identitas tertutup', () => {
    const indukPbt = out.juris.reduce((a, j) => a + j.pbt, 0) - SUBS.reduce((a, s) => a + s.pbt, 0);
    const indukTax = out.totTax - SUBS.reduce((a, s) => a + s.tax, 0);
    expect(out.totPbt).toBe(indukPbt + SUBS.reduce((a, s) => a + s.pbt, 0));
    expect(out.totTax).toBe(indukTax + SUBS.reduce((a, s) => a + s.tax, 0));
    /* Setiap entitas kanonik terwakili tepat sekali. */
    const shown = out.juris.flatMap(j => j.entities);
    SUBS.forEach(s => expect(shown.filter(n => n === s.name)).toHaveLength(1));
    expect(shown).toHaveLength(SUBS.length + 1);                    // + entitas induk
  });

  it('yurisdiksi Singapura membawa pbt/tax PERSIS dari GROUP_SUBS (bukan 6.100/640)', () => {
    const sg = out.juris.find(j => j.country === 'Singapura');
    const cp05 = SUBS.find(s => s.id === 'CP-05') as P2Component;
    expect(sg).toBeTruthy();
    expect(sg!.pbt).toBe(cp05.pbt);
    expect(sg!.tax).toBe(cp05.tax);
    expect(sg!.entities).toEqual([cp05.name]);
    /* Literal lama menuliskan 6.100/640 → ETR 10,5%. Kanon memberi 4.880/830. */
    expect(sg!.pbt).not.toBe(6_100);
    expect(sg!.tax).not.toBe(640);
  });

  it('ETR Singapura kanonik ada DI ATAS tarif minimum — top-up karangan itu lenyap', () => {
    const sg = out.juris.find(j => j.country === 'Singapura') as { etr: number | null };
    expect(sg.etr).not.toBeNull();
    expect(sg.etr as number).toBeGreaterThan(P2_MIN_RATE);
    expect(Math.round((sg.etr as number) * 10) / 10).toBe(17);      // 830 / 4.880
    expect(out.lowTax.map(j => j.country)).not.toContain('Singapura');
  });
});

/* ============================================================
   (d) AMBANG CAKUPAN GloBE — diuji, bukan diasumsikan.
   ============================================================ */
describe('(d) uji ambang cakupan GloBE', () => {
  const out = forEngagement(SEED_ENG, SEED_WTB, 'PT Sentosa Makmur Tbk');

  it('ambang EUR 750 juta dikonversi dengan kurs BERMASA BERLAKU', () => {
    expect(P2_THRESHOLD_EUR).toBe(750_000_000);
    expect(out.thresholdRp).toBe(Math.round(P2_THRESHOLD_EUR * EUR / 1e6));
    expect(out.thresholdRp as number).toBeGreaterThan(0);
  });

  it('grup seed berada DI BAWAH ambang → di luar cakupan, top-up tak diasersikan', () => {
    expect(out.thresholdRp).not.toBeNull();
    expect(out.totRev).toBeLessThan(out.thresholdRp as number);
    expect(out.scopeKnown).toBe(true);
    expect(out.inScope).toBe(false);
    expect(out.topUp).toBeNull();                                   // null, BUKAN 0
  });

  it('TANGGAL PELAPORAN sesungguhnya tak tercakup registry kurs → cakupan tak dapat disimpulkan', () => {
    /* Registry kurs (canon_fx) sengaja hanya mencakup Maret 2026, sedangkan ASOF
       perikatan = 31 Des 2025. Modul WAJIB berhenti, bukan memakai kurs masa lain. */
    const look = fxAt(REPORT_DATE);
    expect(look.value).toBeNull();
    const real = pillarTwo({
      wtb: SEED_WTB, parentName: 'PT Sentosa Makmur Tbk', components: SUBS,
      elimRev: ELIM_REV, elimProfit: ELIM_PROFIT,
      eurRate: look.value ? look.value.closing.EUR : null,
    });
    expect(real.thresholdRp).toBeNull();
    expect(real.scopeKnown).toBe(false);       // ≠ "di luar cakupan"
    expect(real.inScope).toBe(false);
    expect(real.topUp).toBeNull();
    /* Angka yurisdiksi TETAP terhitung — yang hilang hanya kesimpulan cakupan. */
    expect(real.totPbt).toBe(out.totPbt);
    expect(real.juris).toHaveLength(out.juris.length);
  });

  it('grup yang MELEWATI ambang & punya yurisdiksi bertarif rendah menghasilkan top-up', () => {
    /* Falsifikasi dua arah: kalau ambang atau perhitungan top-up sekadar hiasan,
       kasus ini akan tetap memberi null. */
    const big: P2Component[] = [
      { id: 'X1', name: 'Anak Bertarif Rendah', country: 'Yurisdiksi Uji',
        pbt: 10_000, tax: 500, rev: 20_000_000 },
    ];
    const scoped = pillarTwo({ wtb: SEED_WTB, parentName: 'Induk', components: big, eurRate: EUR });
    expect(scoped.scopeKnown).toBe(true);
    expect(scoped.inScope).toBe(true);
    expect(scoped.topUp).not.toBeNull();
    const uji = scoped.juris.find(j => j.country === 'Yurisdiksi Uji') as { etr: number | null; topUp: number | null };
    expect(uji.etr as number).toBeCloseTo(5, 6);
    expect(uji.topUp).toBe(Math.round(10_000 * (P2_MIN_RATE - 5) / 100));   // 1.000
    expect(scoped.topUp).toBe(uji.topUp);
  });
});

/* ============================================================
   Pendanaan pemasok — jalur (b): MEMBANTAH, dan penolakannya terfalsifikasi.
   ============================================================ */
describe('Pendanaan pemasok — tanpa register, modul membantah', () => {
  it('utang usaha diturunkan dari WTB dan BERBEDA tiap perikatan', () => {
    const all = [
      supplierFinance(SEED_WTB),
      ...Object.keys(WTB_BY_ENGAGEMENT).map(id => supplierFinance(WTB_BY_ENGAGEMENT[id] as unknown as WTB)),
    ];
    const known = all.filter(s => s.available).map(s => s.tradePayables);
    expect(known.length).toBeGreaterThanOrEqual(2);
    known.forEach(v => expect(typeof v).toBe('number'));
    expect(new Set(known).size).toBe(known.length);
  });

  it('bagan akun tanpa utang usaha (multifinance) MEMBANTAH — populasinya tak dikarang', () => {
    /* ENG-2025-040 membiayai konsumen, bukan berdagang: tak ada 2-1100 sama
       sekali. Mesin yang "ramah" akan menjatuhkannya ke nol dan menyajikan
       populasi kosong seolah fakta. */
    const sf = supplierFinance(WTB_BY_ENGAGEMENT['ENG-2025-040'] as unknown as WTB);
    expect(sf.available).toBe(false);
    expect(sf.tradePayables).toBeNull();
    expect(sf.registered).toBe(false);
  });

  it('utang usaha = saldo 2-1100 dibalik positif (bukan 8.600 karangan)', () => {
    const row = SEED_WTB.find(r => r.code === SF_PAYABLE_CODE) as WtbRow;
    const sf = supplierFinance(SEED_WTB);
    expect(sf.tradePayables).toBe(Math.round(-(row.adj as number) / 1e6));
    expect(sf.tradePayables).not.toBe(8_600);
  });

  it('nilai tercatat / penarikan / penyedia / rentang jatuh tempo TIDAK diasersikan', () => {
    const sf = supplierFinance(SEED_WTB);
    expect(sf.available).toBe(true);
    expect(sf.registered).toBe(false);
    expect(sf.carrying).toBeNull();
    expect(sf.drawn).toBeNull();
    expect(sf.providers).toBeNull();
    expect(sf.rangeDays).toBeNull();
    expect(sf.outsideArrangement).toBeNull();
    /* Nilai tercatat TIDAK disamakan dengan seluruh utang usaha — itu karangan lain. */
    expect(sf.carrying).not.toBe(sf.tradePayables);
  });

  it('penolakannya TERFALSIFIKASI: beri register → modul mengasersikan', () => {
    const reg: SfArrangement[] = [
      { provider: 'Bank A', carrying: 1_200, drawn: 900, minDays: 90, maxDays: 120 },
      { provider: 'Bank B', carrying: 800, drawn: 500, minDays: 100, maxDays: 150 },
    ];
    const sf = supplierFinance(SEED_WTB, reg);
    expect(sf.registered).toBe(true);
    expect(sf.providers).toBe(2);
    expect(sf.carrying).toBe(2_000);
    expect(sf.drawn).toBe(1_400);
    expect(sf.rangeDays).toBe('90–150 hari');
    expect(sf.outsideArrangement).toBe((sf.tradePayables as number) - 2_000);
  });

  it('WTB tanpa akun utang usaha → populasinya pun tak diketahui', () => {
    const tanpa = SEED_WTB.filter(r => r.code !== SF_PAYABLE_CODE) as WTB;
    const sf = supplierFinance(tanpa);
    expect(sf.available).toBe(false);
    expect(sf.tradePayables).toBeNull();
  });
});

/* ============================================================
   SENSUS STATIK — literal karangan tak boleh kembali ke view.
   Komentar DIBUANG lebih dulu: gerbang cakupan yang membaca komentar sebagai
   kode adalah mode kegagalan yang sudah tercatat di repo ini (dan berkas ini
   MENYEBUT angka-angka itu di komentarnya sendiri).
   ============================================================ */
describe('view_newdisc.tsx — tak ada lagi tabel/angka karangan', () => {
  const RAW = readFileSync(join(HERE, 'view_newdisc.tsx'), 'utf8');
  const CODE = RAW
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1 ');

  it('konstanta tabel Pilar Dua & pendanaan pemasok sudah dicabut', () => {
    expect(CODE).not.toMatch(/P2_JURIS/);
    expect(CODE).not.toMatch(/\bconst\s+SF\s*=/);
  });

  it('tak ada literal angka klien yang tersisa', () => {
    [/\b44200\b/, /\b9724\b/, /\b6100\b/, /\b10\.5\b/, /\b8600\b/, /\b44_200\b/].forEach(re => {
      expect(CODE).not.toMatch(re);
    });
  });

  it('tak ada identitas entitas yang dikarang di dalam view', () => {
    expect(CODE).not.toMatch(/Sentosa/);
  });

  it('tak ada tabel kurs tanpa masa berlaku (CB1) — kurs lewat registry', () => {
    expect(CODE).not.toMatch(/(USD|SGD|EUR)\s*:\s*[0-9]/);
    expect(CODE).not.toMatch(/FX_RATES/);
    expect(CODE).toMatch(/fxAt\(/);
  });

  it('view memanggil mesin turunan dengan neraca saldo (bukan konstanta modul)', () => {
    expect(CODE).toMatch(/pillarTwo\(\{[\s\S]*?wtb/);
    expect(CODE).toMatch(/supplierFinance\(wtb\)/);
  });
});
