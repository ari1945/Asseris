/* ============================================================
   Asseris — KURS VALUTA ASING, BERMASA BERLAKU (registry regref)
   PRD `docs/prd-regulatory-reference-annual.md` · pola PR-1 · prompt 32-cashbank CB1.
   ------------------------------------------------------------
   Sampai berkas ini ada, kurs firma hidup sebagai DUA record tanpa tanggal:

     data_part2.ts  FX_RATES = { IDR: 1, USD: 16_250, SGD: 12_050, EUR: 17_600 }
     data_part2.ts  FX_BOOK  = { IDR: 1, USD: 15_780, SGD: 11_640, EUR: 17_120 }

   Kurs berubah setiap hari. Yang berdiri di atas kedua record itu bukan hiasan:
   seluruh tab Revaluasi Valas, KPI "Total Kas (ekuivalen IDR)", KPI "Selisih Kurs
   Diakui (GL 5-600)" — dan sejak #249, JURNAL REVALUASI YANG BENAR-BENAR MASUK
   PEMBUKUAN FIRMA (JV-0319/JV-0320). Ketika klok bergerak, aplikasi tetap
   merevaluasi pada kurs Maret 2026 dan membukukan selisihnya, tanpa satu pun tanda.

   Itu cacat yang sama persis dengan `PAYROLL_RATES.period` dan `CPE_REQ`: punya
   nilai, tidak punya masa. Mekanismenya sudah ada — `canon_regref.ts` — dan berkas
   ini memakainya, bukan membuat cara kedua.

   ------------------------------------------------------------
   MENGAPA SATU SET MEMBAWA DUA TABEL KURS

   Untuk satu periode pelaporan ada dua kurs, dan keduanya hanya berarti berpasangan:

     · `book`    — kurs tercatat pos valas SEBELUM penjabaran ulang periode ini
                   (kurs perolehan/kurs saat transaksi dibukukan);
     · `closing` — kurs penutup tanggal pelaporan periode ini.

   Selisih keduanya × saldo valas ADALAH revaluasi periode itu (PSAK 10 par. 28) —
   angka yang diposting JV-0319/0320. Menyimpannya sebagai dua registry terpisah
   membuat pasangan yang tak sepadan mungkin terjadi (kurs penutup April dipasangkan
   dengan kurs tercatat Februari) dan revaluasinya akan tetap menghasilkan angka.
   Satu set, dua tabel, satu masa berlaku: pasangan yang salah menjadi mustahil
   dirumuskan, bukan sekadar tidak dianjurkan.

   ------------------------------------------------------------
   TIDAK ADA KURS YANG DIKARANG

   Yang benar-benar diketahui aplikasi ini hanya SATU periode: Maret 2026 — kurs
   tercatat yang dipakai saldo awal akun `1-104`/`1-105`, dan kurs penutup yang
   dipakai JV-0319/JV-0320 tanggal 2026-03-31. Karena itu hanya satu set yang
   didaftarkan, rentangnya DITUTUP di 2026-03-31, dan April 2026 dan seterusnya
   sengaja dibiarkan TAK TERCAKUP. Menyalin kurs Maret ke April akan mengulang
   persis cacat yang dicabut berkas ini.

   `verified: false`: nilainya benar sebagai nilai yang DIPAKAI pembukuan firma,
   tetapi belum dicocokkan dengan dokumen sumbernya (kurs tengah BI? kurs KMK?).
   Sesuai aturan `canon_regref` No. 3, itu tetap menghitung dengan penanda — yang
   memblokir adalah TAK TERCAKUP, bukan belum dicocokkan.

   MURNI: tanpa React, `window`, `AMS`, atau klok. Tanggal selalu DISUNTIKKAN.
   ============================================================ */
import { regrefFor } from './canon_regref';
import type { RegRefEnforcement, RegRefLookup, RegRefSet } from './canon_regref';

/** Peta kode mata uang → kurs terhadap IDR. */
export type FxTable = Readonly<Record<string, number>>;

/** Sepasang kurs untuk SATU periode pelaporan. */
export interface FxPeriodRates {
  /** Kurs tercatat sebelum penjabaran ulang periode ini (kurs perolehan). */
  book: FxTable;
  /** Kurs penutup tanggal pelaporan periode ini (PSAK 10 par. 23(a)). */
  closing: FxTable;
}

export const FX_LABEL = 'Kurs valuta asing — kurs tercatat & kurs penutup';
/** Hasilnya DIBUKUKAN (JV-0319/0320). Yang menyangkut uang memblokir. */
export const FX_ENFORCEMENT: RegRefEnforcement = 'block';

export const FX_REGISTRY: RegRefSet<FxPeriodRates>[] = [
  {
    effectiveFrom: '2026-03-01',
    effectiveTo: '2026-03-31',
    basis:
      'PSAK 10 par. 23(a) & 28 — pos moneter valas dijabarkan pada kurs penutup tanggal '
      + 'pelaporan; selisihnya terhadap kurs tercatat diakui dalam laba rugi.',
    sourceDoc: '',
    verified: false,
    note:
      'Angkanya adalah kurs yang SUDAH dipakai pembukuan firma untuk periode Maret 2026 '
      + '(saldo awal 1-104/1-105 pada kurs tercatat; JV-0319/JV-0320 pada kurs penutup '
      + '31 Maret 2026), tetapi dasar kutipannya belum dicocokkan dengan dokumen resmi — '
      + 'belum ditetapkan apakah kurs tengah BI atau kurs KMK yang dipakai. Yang perlu '
      + 'dilengkapi: rujukan kutipan per mata uang, bukan angkanya.',
    value: {
      book: { IDR: 1, USD: 15_780, SGD: 11_640, EUR: 17_120 },
      closing: { IDR: 1, USD: 16_250, SGD: 12_050, EUR: 17_600 },
    },
  },
];

/** Kurs yang berlaku pada `date`, atau penolakan yang menyebutkan alasannya. */
export function fxAt(date: string): RegRefLookup<FxPeriodRates> {
  return regrefFor(FX_REGISTRY, date, { label: FX_LABEL, enforcement: FX_ENFORCEMENT });
}

/**
 * Kurs untuk tanggal yang HARUS tercakup (mis. periode pelaporan yang sedang
 * direkonsiliasi). Melempar bila tidak — sebab diam-diam memakai kurs masa lain
 * adalah persis kesalahan yang hendak dicabut, dan lapisan seed tak punya layar
 * untuk mengatakannya.
 */
export function fxRequired(date: string): FxPeriodRates {
  const look = fxAt(date);
  if (!look.value) throw new Error('canon_fx: ' + look.note);
  return look.value;
}

/* ------------------------------------------------------------------
   Revaluasi (PSAK 10) — MURNI, tanggal disuntikkan
   ------------------------------------------------------------------ */

export interface FxPosition {
  id: string;
  bank?: string;
  name?: string;
  ccy: string;
  balance: number;
}

export interface FxRevalRow extends FxPosition {
  bookRate: number;
  closingRate: number;
  bookIDR: number;
  mktIDR: number;
  gain: number;
}

export interface FxRevaluation {
  /** `true` hanya bila ada set yang mencakup `asOf` DAN semua mata uangnya terdaftar. */
  covered: boolean;
  status: RegRefLookup<FxPeriodRates>['status'] | 'missing-currency';
  /** Alasan yang dapat dibaca manusia; kosong bila terhitung tanpa catatan. */
  note: string;
  asOf: string;
  /** Masa berlaku set yang dipakai, untuk ditulis di layar & kertas kerja. */
  effective: { from: string; to: string | null } | null;
  /** Kosong bila tak tercakup — TIDAK PERNAH baris dengan kurs masa lain. */
  rows: FxRevalRow[];
  /** `null` bila tak tercakup. Nol berarti nol; `null` berarti tak dapat dihitung. */
  total: number | null;
  /** Mata uang yang dipegang tetapi tak ada di set yang berlaku. */
  missing: string[];
}

/**
 * Revaluasi posisi valas pada `asOf`.
 *
 * Tak tercakup ⇒ `rows: []`, `total: null`, `covered: false`. Ia TIDAK jatuh ke
 * kurs periode terakhir, dan tidak mengembalikan nol (nol adalah angka; ketiadaan
 * jawaban bukan). Mata uang yang dipegang tetapi tak ada dalam set yang berlaku
 * juga MENGHENTIKAN — `fx[ccy] || 1` diam-diam menilai valas 1:1 terhadap rupiah,
 * dan itu bentuk karangan yang paling sulit terlihat.
 */
export function fxRevaluation(positions: readonly FxPosition[], asOf: string): FxRevaluation {
  const look = fxAt(asOf);
  const effective = look.set ? { from: look.set.effectiveFrom, to: look.set.effectiveTo } : null;
  const valas = positions.filter((p) => p.ccy !== 'IDR');
  if (!look.value) {
    return {
      covered: false, status: look.status, note: look.note, asOf, effective,
      rows: [], total: null, missing: [],
    };
  }
  const { book, closing } = look.value;
  const missing = valas
    .filter((p) => typeof book[p.ccy] !== 'number' || typeof closing[p.ccy] !== 'number')
    .map((p) => p.ccy)
    .filter((c, i, a) => a.indexOf(c) === i)
    .sort();
  if (missing.length) {
    return {
      covered: false, status: 'missing-currency', asOf, effective, rows: [], total: null, missing,
      note: `${FX_LABEL} yang berlaku pada ${asOf} tidak memuat ${missing.join(', ')}. `
        + 'Perhitungan DITOLAK agar valas tidak diam-diam dinilai 1:1 terhadap rupiah.',
    };
  }
  const rows: FxRevalRow[] = valas.map((p) => {
    const bookRate = book[p.ccy];
    const closingRate = closing[p.ccy];
    const bookIDR = p.balance * bookRate;
    const mktIDR = p.balance * closingRate;
    return { ...p, bookRate, closingRate, bookIDR, mktIDR, gain: mktIDR - bookIDR };
  });
  return {
    covered: true, status: look.status, note: look.note, asOf, effective, rows, missing: [],
    total: rows.reduce((s, r) => s + r.gain, 0),
  };
}
