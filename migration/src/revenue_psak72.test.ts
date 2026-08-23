/* ============================================================
   Modul `revenue` (Pendapatan & Penagihan) — gerbang PSAK 72.

   Dua arc bertumpuk di berkas ini:

   #277 — nilai kontrak berhenti dikarang dari materialitas; pita ilustrasi
     berhenti menjamin kolom "diakui" sebagai data nyata; baris tabel dapat
     dipilih tanpa tetikus.

   PRD `docs/prd-revenue-input-method-psak72.md` (Opsi A, "Proceed."
     2026-08-22) — kemajuan berhenti berupa angka yang diketik
     (`engagement.progress`) dan menjadi METODE MASUKAN berpagar. SC-1..SC-8
     dirujuk per uji.

   Prinsip yang sama di keduanya: yang tak diketahui dinyatakan sebagai tak
   diketahui, dan setiap cacat DORMAN dibuktikan dengan keadaan yang DIBANGUN
   — bukan dengan berharap seed memicunya.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AMS } from './data';
import { FIRMFIN } from './data_firmfin';
import { pmExtraHours } from './profit_model';
import { tbModel } from './timebudget_model';
import {
  MEASURE_COMPLETED,
  MEASURE_INPUT_HOURS,
  contractValueOf,
  hoursOfEngagements,
  progressOf,
  recognitionSchedule,
  type RevClient,
  type RevEngagement,
  type RevHours,
  type RevHoursSource,
  type RevInvoice,
} from './revenue_psak72';

const SRC = join(__dirname);
const readRaw = (f: string): string => readFileSync(join(SRC, f), 'utf8');

/** Kode saja — komentar dibuang, supaya prosa yang MENJELASKAN pola lama
    tidak dihitung sebagai pola lama itu sendiri. */
const read = (f: string): string => readRaw(f)
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

const VIEW = 'view_firmrevenue.tsx';
const ENGINE = 'revenue_psak72.ts';

/* ---------- fixtures ---------- */

const eng = (over: Partial<RevEngagement> = {}): RevEngagement => ({
  id: 'ENG-T-001', clientId: 'C-T1', type: 'Audit Laporan Keuangan',
  status: 'Fieldwork', partner: 'Uji Partner, CPA', ...over,
});
const cli = (over: Partial<RevClient> = {}): RevClient => ({
  id: 'C-T1', name: 'PT Uji Sentosa', fee: 1_000_000_000, ...over,
});
const inv = (over: Partial<RevInvoice> = {}): RevInvoice => ({
  eng: 'ENG-T-001', status: 'Sent', amount: 200_000_000, ...over,
});
/** Jam tetap untuk seluruh perikatan uji — 50% kecuali dinyatakan lain. */
const hours = (map: Record<string, RevHours> = {}) =>
  (id: string): RevHours => map[id] || { actualHrs: 100, budgetHrs: 200 };

describe('V2 — nilai kontrak: dinyatakan atau tidak sama sekali', () => {
  it('fee klien adalah SATU-SATUNYA sumber nilai kontrak', () => {
    expect(contractValueOf(cli({ fee: 750_000_000 }))).toBe(750_000_000);
    expect(contractValueOf(cli({ fee: 0 }))).toBe(0);          // pro bono ≠ tak diketahui
  });

  it.each<[string, RevClient | null]>([
    ['klien tak ditemukan', null],
    ['fee tak ada', { id: 'C-T1', name: 'PT Uji' }],
    ['fee null', { id: 'C-T1', name: 'PT Uji', fee: null }],
    ['fee NaN', { id: 'C-T1', name: 'PT Uji', fee: Number.NaN }],
    ['fee tak berhingga', { id: 'C-T1', name: 'PT Uji', fee: Number.POSITIVE_INFINITY }],
    ['fee negatif', { id: 'C-T1', name: 'PT Uji', fee: -1 }],
  ])('%s ⇒ null, bukan taksiran', (_label, client) => {
    expect(contractValueOf(client)).toBeNull();
  });

  it('perikatan tanpa klien: baris hidup, angkanya kosong, bukan dikarang', () => {
    const s = recognitionSchedule({
      engagements: [eng({ id: 'ENG-X', clientId: 'C-HILANG' })],
      clients: [cli()],
      invoices: [inv({ eng: 'ENG-X', amount: 300_000_000 })],
      hoursOf: hours(),
    });
    const row = s.rows[0];
    expect(row.gaps).toEqual(['contract-unknown']);
    expect(row.contract).toBeNull();
    expect(row.recognized).toBeNull();
    expect(row.asset).toBeNull();
    expect(row.liab).toBeNull();
    expect(row.client).toBe('—');
    /* kemajuan TETAP terukur — lubangnya hanya di harga, dan itu terbaca */
    expect(row.pct).toBe(0.5);
    /* tertagih tetap fakta register — ia tak bergantung pada nilai kontrak */
    expect(row.billed).toBe(300_000_000);
  });

  it('baris berlubang KELUAR dari total, tetapi tertagihnya tetap masuk', () => {
    const s = recognitionSchedule({
      engagements: [eng(), eng({ id: 'ENG-X', clientId: 'C-HILANG' })],
      clients: [cli()],
      invoices: [inv({ amount: 100_000_000 }), inv({ eng: 'ENG-X', amount: 300_000_000 })],
      hoursOf: hours(),
    });
    expect(s.gapRows.map((r) => r.id)).toEqual(['ENG-X']);
    expect(s.totContract).toBe(1_000_000_000);              // hanya baris ber-fee
    expect(s.totRecognized).toBe(500_000_000);              // 1 M × 50%
    expect(s.totBilled).toBe(400_000_000);                  // KEDUA faktur
    expect(s.totAsset).toBe(400_000_000);                   // 500 − 100
    expect(s.totLiab).toBe(0);
    expect(s.backlog).toBe(500_000_000);
  });

  it('materialitas tak lagi disebut oleh modul pendapatan mana pun', () => {
    expect(read(VIEW)).not.toMatch(/materiality/);
    expect(read(ENGINE)).not.toMatch(/materiality/);
  });
});

describe('SC-1 — kemajuan tak lagi berupa angka yang diketik', () => {
  it('GERBANG CAKUPAN: kolom `progress` tak DIBACA di jalur pengakuan', () => {
    /* Yang dilarang bukan katanya, melainkan PEMBACAANNYA: akses properti
       `.progress` dan bentuk lama `progress / 100`. Satu pembacaan saja cukup
       untuk menghidupkan kembali `jam ?? progress`, yaitu proksi yang menyamar
       sebagai angka — cacat yang dicabut #277. */
    const terlarang = /\.progress\b|\bprogress\s*\/\s*100\b/;
    expect(read(ENGINE)).not.toMatch(terlarang);
    expect(read(VIEW)).not.toMatch(terlarang);
  });

  it('`RevEngagement` tak punya medan `progress` untuk dibaca', () => {
    /* Gerbang teks di atas dapat dilewati lewat destructuring; ini menutup
       pintunya di TIPE — kalau medannya kembali, ia terlihat di sini. */
    const blok = /export interface RevEngagement \{[\s\S]*?\r?\n\}/.exec(read(ENGINE));
    expect(blok, 'deklarasi RevEngagement tak ditemukan').not.toBeNull();
    expect(blok && blok[0]).not.toMatch(/progress/i);
  });

  it('mesin menolak menerima `progress`: jam-lah masukannya', () => {
    const s = recognitionSchedule({
      engagements: [eng()], clients: [cli()], invoices: [],
      hoursOf: hours({ 'ENG-T-001': { actualHrs: 300, budgetHrs: 1200 } }),
    });
    expect(s.rows[0].pct).toBe(0.25);
    expect(s.rows[0].measure).toBe(MEASURE_INPUT_HOURS);
    expect(s.rows[0].recognized).toBe(250_000_000);
  });
});

describe('SC-2 — Pagar 1: kewajiban tuntas diakui penuh', () => {
  it.each(['Completed', 'Selesai', 'Archived', 'Arsip', 'completed'])(
    'status "%s" ⇒ 100% tanpa memandang jam', (status) => {
      const p = progressOf(eng({ status }), { actualHrs: 945, budgetHrs: 980 });
      expect(p.pct).toBe(1);
      expect(p.completed).toBe(true);
      expect(p.capped).toBe(false);
    });

  it('perikatan BELUM selesai dengan jam yang sama TIDAK diakui penuh', () => {
    /* Kontrol: memastikan 100% di atas datang dari Pagar 1, bukan dari jamnya. */
    const p = progressOf(eng({ status: 'Review' }), { actualHrs: 945, budgetHrs: 980 });
    expect(p.completed).toBe(false);
    expect(p.pct).toBeCloseTo(945 / 980, 10);
  });

  it('Pagar 1 tak bergantung pada kelengkapan jam', () => {
    const p = progressOf(eng({ status: 'Completed' }), null);
    expect(p.pct).toBe(1);
    expect(p.actualHrs).toBeNull();
  });

  it('baris yang tuntas menyebut dasarnya sendiri', () => {
    const s = recognitionSchedule({
      engagements: [eng({ status: 'Completed' })], clients: [cli()], invoices: [],
      hoursOf: hours({ 'ENG-T-001': { actualHrs: 945, budgetHrs: 980 } }),
    });
    expect(s.rows[0].measure).toBe(MEASURE_COMPLETED);
    expect(s.rows[0].recognized).toBe(1_000_000_000);
  });
});

describe('SC-3 — Pagar 2a: jam melewati anggaran tak menambah pendapatan', () => {
  it('jam 120% anggaran ⇒ diakui 100%, dan penjepitannya TERBACA', () => {
    const p = progressOf(eng(), { actualHrs: 240, budgetHrs: 200 });
    expect(p.pct).toBe(1);
    expect(p.capped).toBe(true);
    expect(p.completed).toBe(false);
  });

  it('tepat 100% belum terjepit', () => {
    expect(progressOf(eng(), { actualHrs: 200, budgetHrs: 200 }).capped).toBe(false);
  });

  it('Pagar 2a DORMAN pada seed — karena itu diuji dengan keadaan yang DIBANGUN', () => {
    /* Premis PRD dibuktikan, bukan dipercaya: tak satu pun perikatan seed
       melewati anggarannya (tertinggi ENG-2025-058, 96,4%). Uji nilai atas
       seed karena itu TIDAK akan pernah menangkap hilangnya pagar ini. */
    const src = AMS.ENGAGEMENTS as unknown as RevHoursSource[];
    const lewat = src.filter((e) => (e.actualHrs || 0) > (e.budgetHrs || 0));
    expect(lewat).toEqual([]);
    expect(seedSchedule().rows.some((r) => r.capped)).toBe(false);
  });
});

describe('SC-4 — kemajuan yang tak terukur dinyatakan, bukan ditaksir', () => {
  it.each<[string, RevHours | null]>([
    ['tak ada jam sama sekali', null],
    ['jam aktual hilang', { budgetHrs: 200 }],
    ['anggaran hilang', { actualHrs: 100 }],
    ['anggaran nol', { actualHrs: 100, budgetHrs: 0 }],
    ['anggaran negatif', { actualHrs: 100, budgetHrs: -200 }],
    ['jam aktual negatif', { actualHrs: -1, budgetHrs: 200 }],
    ['jam NaN', { actualHrs: Number.NaN, budgetHrs: 200 }],
  ])('%s ⇒ belum terukur', (_label, h) => {
    expect(progressOf(eng(), h).pct).toBeNull();
  });

  it('baris tanpa kemajuan terukur keluar dari total, tagihannya tetap dihitung', () => {
    const s = recognitionSchedule({
      engagements: [eng(), eng({ id: 'ENG-Y' })],
      clients: [cli()],
      invoices: [inv({ amount: 100_000_000 }), inv({ eng: 'ENG-Y', amount: 250_000_000 })],
      hoursOf: hours({ 'ENG-Y': { actualHrs: null, budgetHrs: null } }),
    });
    const y = s.rows[1];
    expect(y.gaps).toEqual(['progress-unknown']);
    expect(y.contract).toBe(1_000_000_000);   // harganya diketahui …
    expect(y.recognized).toBeNull();          // … kemajuannya tidak
    expect(y.billed).toBe(250_000_000);
    expect(s.gapRows.map((r) => r.id)).toEqual(['ENG-Y']);
    expect(s.totContract).toBe(1_000_000_000);
    expect(s.totRecognized).toBe(500_000_000);
    expect(s.totBilled).toBe(350_000_000);
  });

  it('kedua lubang pada satu baris dinyatakan KEDUANYA', () => {
    const s = recognitionSchedule({
      engagements: [eng({ id: 'ENG-Z', clientId: 'C-HILANG' })],
      clients: [], invoices: [], hoursOf: () => null,
    });
    expect(s.rows[0].gaps).toEqual(['contract-unknown', 'progress-unknown']);
  });
});

/* ---------- SSOT jam: satu ukuran, dan lingkupnya benar ---------- */

const seedSchedule = () => {
  const seed = AMS.TIME_ENTRIES as unknown as Array<{ engagementId?: string; hours: number }>;
  return recognitionSchedule({
    engagements: AMS.ENGAGEMENTS as unknown as RevEngagement[],
    clients: AMS.CLIENTS as unknown as RevClient[],
    invoices: AMS.INVOICES as unknown as RevInvoice[],
    hoursOf: hoursOfEngagements(
      AMS.ENGAGEMENTS as unknown as RevHoursSource[],
      pmExtraHours(seed, seed, DEMO_ENG),
    ),
  });
};
const DEMO_ENG = 'ENG-2025-014';

describe('SC-5 — satu ukuran kemajuan, dipakai bersama WIP & profitabilitas', () => {
  it('jam yang dipakai pengakuan identik dengan jam `engagementWip`', () => {
    /* Invarian roster_profile: Σbase + timesheet === actualHrs. Kalau ia
       pecah, dua modul akan melaporkan kemajuan berbeda untuk perikatan yang
       sama — dan itulah yang uji ini tolak. */
    const seed = AMS.TIME_ENTRIES as unknown as Array<{ engagementId?: string; hours: number }>;
    const viaWip = FIRMFIN.engagementWip(seed, DEMO_ENG) as { actualHrs: number; budgetHrs: number };
    const viaRevenue = hoursOfEngagements(
      AMS.ENGAGEMENTS as unknown as RevHoursSource[],
      pmExtraHours(seed, seed, DEMO_ENG),
    )(DEMO_ENG);
    expect(viaRevenue).toEqual({ actualHrs: viaWip.actualHrs, budgetHrs: viaWip.budgetHrs });
  });

  it('LINGKUP: timesheet perikatan aktif tak menggeser perikatan lain', () => {
    /* Cacat sekeluarga pernah mendarat (#269) lalu dicabut (#274): jam milik
       satu perikatan dikreditkan ke semua. */
    const seed = AMS.TIME_ENTRIES as unknown as Array<{ engagementId?: string; hours: number }>;
    const live = [...seed, { engagementId: DEMO_ENG, hours: 40 }];
    const src = AMS.ENGAGEMENTS as unknown as RevHoursSource[];
    const before = hoursOfEngagements(src, pmExtraHours(seed, seed, DEMO_ENG));
    const after = hoursOfEngagements(src, pmExtraHours(live, seed, DEMO_ENG));
    expect(after(DEMO_ENG)?.actualHrs).toBe((before(DEMO_ENG)?.actualHrs || 0) + 40);
    src.filter((e) => e.id !== DEMO_ENG).forEach((e) => {
      expect(after(e.id)?.actualHrs, e.id).toBe(before(e.id)?.actualHrs);
    });
  });

  it('perikatan yang tak dikenal pembaca jam ⇒ null, bukan nol', () => {
    expect(hoursOfEngagements([], {})('ENG-TAK-ADA')).toBeNull();
  });

  it('Time & Budget dan Pendapatan Firma melaporkan pendapatan diakui yang SAMA', () => {
    /* Sampai 2026-08-22 ada DUA angka "pendapatan diakui" untuk satu
       perikatan: layar T&B memakai `fee × e.progress`, modul Pendapatan
       memakai rumusnya sendiri. Keduanya kini lewat `progressOf`. */
    const seed = AMS.TIME_ENTRIES as unknown as Array<{ engagementId?: string; hours: number }>;
    const e = (AMS.ENGAGEMENTS as unknown as Array<{ id: string }>).find((x) => x.id === DEMO_ENG);
    const tb = tbModel(
      seed as never, e as never, AMS.CLIENTS as unknown as Array<{ id: string; fee?: number }>,
    );
    const row = seedSchedule().rows.find((r) => r.id === DEMO_ENG);
    expect(tb, 'model T&B tak terbentuk').not.toBeNull();
    expect(tb?.revRecognized).toBe(row?.recognized);
    expect(tb?.recogPct).toBe(row?.pct);
  });
});

describe('SC-7 — pergerakan angka pada seed dinyatakan, bukan disembunyikan', () => {
  it('seluruh baris seed terukur; tak ada lubang data', () => {
    const s = seedSchedule();
    expect(s.rows).toHaveLength(7);
    expect(s.gapRows).toEqual([]);
  });

  it('total pengakuan seed = 4.942.825.724 (metode masukan berpagar)', () => {
    expect(seedSchedule().totRecognized).toBe(4_942_825_724);
  });

  it('ENG-2025-058 membuktikan Pagar 1 pada data nyata, bukan pada fixture', () => {
    /* Tanpa Pagar 1 baris ini akan diakui 945/980 × 580 jt = 559,3 jt —
       menahan 3,6% pendapatan atas perikatan yang opininya sudah terbit. */
    const r = seedSchedule().rows.find((x) => x.id === 'ENG-2025-058');
    expect(r?.completed).toBe(true);
    expect(r?.pct).toBe(1);
    expect(r?.recognized).toBe(580_000_000);
    expect(Math.round(580_000_000 * (945 / 980))).toBe(559_285_714);   // yang DIHINDARI
  });
});

describe('V3/V4 — pengukuran disebut apa adanya, klasifikasi tak dikarang', () => {
  it('perikatan non-audit ditandai "klasifikasi belum ditetapkan", bukan "Point-in-time"', () => {
    const s = recognitionSchedule({
      engagements: [
        eng({ id: 'ENG-AUD', type: 'Audit Laporan Keuangan' }),
        eng({ id: 'ENG-AUP', type: 'Agreed-Upon Procedures' }),
        eng({ id: 'ENG-REV', type: 'Review (SPR 2400)' }),
      ],
      clients: [cli()], invoices: [], hoursOf: hours(),
    });
    expect(s.rows.filter((r) => r.classificationOpen).map((r) => r.id)).toEqual(['ENG-AUP', 'ENG-REV']);
  });

  it('label metode lama tak boleh kembali ke layar', () => {
    const src = read(VIEW);
    expect(src).not.toMatch(/Over-time \(input\)/);
    expect(src).not.toMatch(/Point-in-time/);
    expect(src).not.toMatch(/jam terhadap anggaran/);
  });

  it('SC-6 — layar menyatakan metode barunya, kedua pagarnya, dan perpindahannya', () => {
    const src = readRaw(VIEW);
    expect(src).not.toMatch(/adalah data nyata/);
    expect(src).toMatch(/register faktur/);          // apa yang FAKTA
    expect(src).toMatch(/metode masukan/i);          // apa yang DIUKUR
    expect(src).toMatch(/tuntas/);                   // Pagar 1
    expect(src).toMatch(/melewati anggaran/);        // Pagar 2a
    expect(src).toMatch(/dilaporkan/);               // apa yang DITINGGALKAN
  });
});

describe('V5 — baris dapat dipilih tanpa tetikus', () => {
  it('tak ada <tr> yang memikul onClick di modul ini', () => {
    expect(read(VIEW)).not.toMatch(/<tr[^>]*onClick/);
  });

  it('pemilihan perikatan dipikul kontrol native ber-aria-expanded', () => {
    expect(read(VIEW)).toMatch(/<button[^>]*aria-expanded/);
  });
});

describe('tertagih datang dari register, bukan dari skedul', () => {
  it('faktur Draft belum menagih apa pun; mengirimnya membalik aset ⇄ liabilitas', () => {
    const base = {
      engagements: [eng()], clients: [cli()],
      hoursOf: hours({ 'ENG-T-001': { actualHrs: 20, budgetHrs: 200 } }),
    };
    const draft = recognitionSchedule({ ...base, invoices: [inv({ status: 'Draft', amount: 400_000_000 })] });
    const sent = recognitionSchedule({ ...base, invoices: [inv({ status: 'Sent', amount: 400_000_000 })] });
    expect(draft.rows[0].billed).toBe(0);
    expect(draft.rows[0].asset).toBe(100_000_000);   // diakui 100 jt, belum ditagih
    expect(draft.rows[0].liab).toBe(0);
    expect(sent.rows[0].billed).toBe(400_000_000);
    expect(sent.rows[0].asset).toBe(0);
    expect(sent.rows[0].liab).toBe(300_000_000);     // ditagih mendahului penyelesaian
  });
});
