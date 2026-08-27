/* ============================================================
   Asseris — Pengungkapan Baru 2024: mesin turunan (Pilar Dua & Pendanaan Pemasok)
   ------------------------------------------------------------
   Modul MURNI (tanpa React/DOM) supaya angka pengungkapan bisa DIUJI.

   LATAR — apa yang dicabut dari `view_newdisc.tsx`:

   (1) REAKTIVITAS SEMU. Memo modul itu mendeklarasikan `[wtb]` sebagai dependensi
       tetapi badannya HANYA membaca konstanta modul `P2_JURIS`. Memo dihitung
       ulang tiap kali neraca saldo berubah dan SELALU mengembalikan angka yang
       sama. Peninjau yang memindai larik dependensi akan mengira modul ini
       reaktif terhadap WTB. Ia tidak. Kelas cacat ini lebih buruk daripada
       hardcode telanjang: hardcode terlihat, klaim dependensi palsu tidak.

   (2) TABEL YURISDIKSI KARANGAN. Tiga baris literal (Indonesia 44.200/9.724 ·
       Singapura 6.100/640 · "Lainnya" 1.200/240) menjadi masukan bagi ETR grup
       dan eksposur top-up. Perhitungannya benar; masukannya karangan — jadi
       SETIAP klien memperoleh eksposur top-up yang identik.

   (3) SSOT KEDUA, bukan sekadar hardcode. `canon_part3.GROUP_SUBS` sudah
       menyimpan entitas anak yang SAMA lengkap dengan `country`, `pbt`, `tax`:
       Sentosa Trading Pte Ltd = pbt 4.880 / tax 830 → **ETR 17,0%**, di ATAS
       tarif minimum GloBE. Literal modul menuliskan ETR 10,5% untuk entitas yang
       sama, dan dari selisih itulah "eksposur top-up Rp 275 jt" lahir. Dua
       sumber, satu entitas, dua jawaban — dan yang tampil di layar adalah yang
       tak pernah menyentuh data.

   (4) AMBANG CAKUPAN TAK PERNAH DIUJI. Aturan GloBE hanya berlaku bagi grup
       dengan pendapatan konsolidasian >= EUR 750 juta (OECD Model Rules Art.
       1.1; diadopsi PMK 136/2024). Modul lama mengasersikan eksposur top-up
       tanpa pernah menanyakan apakah grupnya masuk cakupan sama sekali.
       `inScope` di sana adalah bendera per-baris yang diketik tangan — bukan
       pengujian ambang.

   SATU SUMBER yang dipakai di sini:
     · Figur entitas induk  → `entityFigures(wtb, 'adj')` (canon_base) — agregasi
                              PREFIKS kode, jadi bekerja untuk bagan akun apa pun
                              (multifinance/SaaS/perkebunan tak punya 4-1100).
     · Entitas anak         → `AMS_CANON.GROUP_SUBS` — struktur grup yang SAMA
                              dipakai PSAK 65 & Group Audit (SA 600).
     · Kurs EUR             → `canon_fx.fxAt(<tgl pelaporan>)` — registry kurs
                              BERMASA BERLAKU. Bukan `FX_RATES` (dicabut #CB1):
                              kurs tanpa masa berlaku adalah cacat tersendiri.
   Tak ada satu pun angka klien yang lahir di berkas ini.

   AMBANG YANG TAK SELALU DAPAT DIHITUNG. Ambang GloBE berdenominasi EUR, jadi
   menguji cakupan menuntut kurs pada TANGGAL PELAPORAN. Bila registry kurs tak
   mencakup tanggal itu, ambangnya `null` dan cakupan menjadi TAK DAPAT
   DISIMPULKAN — bukan "di luar cakupan". Memakai kurs masa lain diam-diam
   adalah persis cacat yang dicabut `canon_fx.ts`, dan "di luar cakupan" adalah
   kesimpulan yang menenangkan yang tak dimiliki modul ini.
   ============================================================ */
import { ASOF_DATE, entityFigures } from './canon_base';
import { globeMinRateRequired } from './canon_cit';
import type { FigureBasis, WTB } from './canon_types';

/* ---------- konstanta HUKUM (bukan angka klien) ---------- */

/**
 * Tarif pajak efektif minimum GloBE (%) — DIPILIH registry menurut tanggal
 * pelaporan (`canon_cit.GLOBE_MIN_REGISTRY`), bukan diketik.
 *
 * Tahap A-2 · R4. Ia dulu literal `15` — besaran regulatori keempat, yang lolos
 * seluruh gerbang Tahap A dan justru ditemukan gerbang SENSUS, bukan oleh mata.
 * Masa sebelum Tahun Pajak 2025 sengaja TIDAK tercakup: di sana angka ini tak
 * boleh ada sama sekali, jadi perhitungannya BERHENTI alih-alih memakai tarif
 * rezim lain. Pola sama dengan `canon_base.ts` untuk tarif PPh Badan (R3).
 *
 * Catatan pendaratan: literalnya hidup di `view_newdisc.tsx` ketika cabang ini
 * ditulis; PR #321 memindahkannya ke berkas ini lebih dulu. Cacatnya ikut pindah,
 * jadi perbaikannya menyusul ke sini.
 */
export const P2_MIN_RATE = globeMinRateRequired(ASOF_DATE);

/** Ambang pendapatan konsolidasian tahunan untuk masuk cakupan GloBE (EUR).
 *  OECD Model Rules Art. 1.1.1; PMK 136/2024. */
export const P2_THRESHOLD_EUR = 750_000_000;

/** Akun utang usaha — populasi tempat pengaturan pendanaan pemasok bersarang. */
export const SF_PAYABLE_CODE = '2-1100';

/* ---------- Pilar Dua ---------- */

/** Entitas komponen grup. Bentuknya sengaja SUBSET `GROUP_SUBS` agar dapat
 *  diberikan langsung tanpa pemetaan ulang di view. Rp juta. */
export interface P2Component {
  id: string; name: string; country: string;
  pbt: number; tax: number; rev: number;
}

/** Satu yurisdiksi. `etr`/`topUp` null = TAK DAPAT DIHITUNG (bukan nol persen). */
export interface P2JurisRow {
  country: string; entities: string[];
  pbt: number; tax: number; rev: number;
  etr: number | null; topUp: number | null;
}

export interface Pillar2Input {
  wtb?: WTB;
  /** Nama entitas induk — dipakai sebagai label baris yurisdiksinya. */
  parentName: string;
  /** Yurisdiksi pemajakan entitas induk. Default 'Indonesia': neraca saldo yang
   *  masuk ke modul ini adalah entitas ber-NPWP yang membukukan 5-5100 Beban
   *  Pajak Penghasilan dan dilaporkan menurut SAK — bukan asumsi bebas. */
  parentCountry?: string;
  /** Entitas anak per yurisdiksi. `[]` (default) = struktur grup TIDAK terdaftar
   *  untuk perikatan ini → hasilnya `groupScoped: false` dan modul membantah,
   *  bukan meminjam struktur grup klien lain. */
  components?: P2Component[];
  /** Eliminasi pendapatan antar-perusahaan (Rp juta). */
  elimRev?: number;
  /** Eliminasi laba antar-perusahaan (Rp juta). Diatribusikan ke yurisdiksi
   *  INDUK sebagai penjual — konsisten dengan roll-up `psak65()` yang menaruh
   *  eliminasi laba pada entitas induk, sehingga Σ yurisdiksi tetap menutup. */
  elimProfit?: number;
  /** Kurs EUR (rupiah penuh per 1 EUR) pada tanggal pelaporan, dari registry
   *  bermasa berlaku (`canon_fx.fxAt`). **`null` bila tak tercakup** — ambang
   *  lalu tak dapat dihitung dan cakupan tak dapat disimpulkan. */
  eurRate: number | null;
  /** Kolom WTB. Default 'adj': pengungkapan menyertai LK setelah AJE. */
  basis?: FigureBasis;
}

export interface Pillar2 {
  /** false = neraca saldo tak menyediakan figur entitas → modul MEMBANTAH,
   *  tidak menampilkan angka apa pun. */
  available: boolean;
  /** false = struktur grup per-yurisdiksi belum terdaftar untuk perikatan ini;
   *  tabel hanya berisi yurisdiksi induk dan cakupan tak dapat disimpulkan. */
  groupScoped: boolean;
  parentCountry: string;
  juris: P2JurisRow[];
  /** Rp juta. */
  totPbt: number; totTax: number; totRev: number;
  etrGroup: number | null;
  /** Ambang EUR 750 juta dikonversi (Rp juta). **null bila kurs tanggal
   *  pelaporan tak tercakup registry** — ambangnya tak dapat dihitung. */
  thresholdRp: number | null;
  /** Cakupan dapat DISIMPULKAN (struktur grup terdaftar DAN ambang terhitung).
   *  Membedakan "di luar cakupan" dari "tak dapat disimpulkan". */
  scopeKnown: boolean;
  /** Pendapatan konsolidasian >= ambang GloBE. Hanya bermakna bila `scopeKnown`. */
  inScope: boolean;
  /** Yurisdiksi dengan ETR terhitung di bawah tarif minimum — INFORMATIF,
   *  berlaku juga saat grup di luar cakupan. */
  lowTax: P2JurisRow[];
  /** Eksposur top-up. **null = tak dapat diasersikan** — grup di luar cakupan
   *  atau figur tak tersedia. Nol adalah angka; ketiadaan bukan. */
  topUp: number | null;
}

const R = Math.round;
/** Rupiah penuh → Rp juta. */
const jt = (n: number | null): number => (n == null ? 0 : R(n / 1e6));

const EMPTY: Pillar2 = {
  available: false, groupScoped: false, parentCountry: '',
  juris: [], totPbt: 0, totTax: 0, totRev: 0, etrGroup: null,
  thresholdRp: null, scopeKnown: false, inScope: false, lowTax: [], topUp: null,
};

/**
 * ETR per yurisdiksi & eksposur top-up Pilar Dua, seluruhnya diturunkan.
 *
 * Identitas yang ditutup (dan diuji): Σ pbt yurisdiksi = pbt induk − eliminasi
 * laba + Σ pbt anak; Σ tax yurisdiksi = tax induk + Σ tax anak. Tanpa identitas
 * itu, tabel yurisdiksi bisa menyimpang dari konsolidasi tanpa suara — persis
 * yang terjadi ketika tabelnya berupa literal.
 */
export function pillarTwo(input: Pillar2Input): Pillar2 {
  const { wtb, parentName, eurRate, basis = 'adj' } = input;
  const parentCountry = input.parentCountry || 'Indonesia';
  const components = input.components || [];
  const elimRev = input.elimRev || 0;
  const elimProfit = input.elimProfit || 0;

  const f = entityFigures(wtb, basis);
  if (!f.available) return { ...EMPTY, parentCountry };

  /* Induk: figur SENDIRI dari neraca saldonya sendiri. Eliminasi laba/pendapatan
     antar-perusahaan dibebankan di sini (yurisdiksi penjual). */
  const parent: P2Component = {
    id: 'PARENT', name: parentName, country: parentCountry,
    pbt: jt(f.pbt) - elimProfit,
    tax: jt(f.taxExpense),
    rev: jt(f.revenue) - elimRev,
  };

  const groupScoped = components.length > 0;
  const all: P2Component[] = [parent, ...components];

  /* Kelompokkan menurut yurisdiksi, pertahankan urutan kemunculan (induk lebih
     dulu) — bukan urutan abjad, supaya baris induk tak berpindah-pindah. */
  const order: string[] = [];
  const bucket = new Map<string, P2JurisRow>();
  for (const c of all) {
    let row = bucket.get(c.country);
    if (!row) {
      row = { country: c.country, entities: [], pbt: 0, tax: 0, rev: 0, etr: null, topUp: null };
      bucket.set(c.country, row);
      order.push(c.country);
    }
    row.entities.push(c.name);
    row.pbt += c.pbt; row.tax += c.tax; row.rev += c.rev;
  }

  const juris = order.map(k => {
    const row = bucket.get(k) as P2JurisRow;
    /* ETR tak terdefinisi bila laba sebelum pajak nol atau rugi: membagi dengan
       nol memberi Infinity, dan "ETR" atas kerugian bukan besaran yang bermakna
       untuk uji tarif minimum. null, bukan 0. */
    row.etr = row.pbt > 0 ? row.tax / row.pbt * 100 : null;
    return row;
  });

  const totPbt = juris.reduce((a, r) => a + r.pbt, 0);
  const totTax = juris.reduce((a, r) => a + r.tax, 0);
  const totRev = juris.reduce((a, r) => a + r.rev, 0);
  const etrGroup = totPbt > 0 ? totTax / totPbt * 100 : null;

  /* Tanpa kurs tercakup, ambang EUR tak dapat dinyatakan dalam rupiah sama sekali. */
  const thresholdRp = eurRate == null ? null : R(P2_THRESHOLD_EUR * eurRate / 1e6);
  /* Cakupan hanya dapat DISIMPULKAN bila struktur grup terdaftar DAN ambangnya
     terhitung. Menyimpulkan "di luar cakupan" dari pendapatan induk saja akan
     menyembunyikan anak-anak yang tak terdaftar; menyimpulkannya tanpa kurs akan
     memakai ambang yang tak pernah dihitung. Keduanya kesimpulan menenangkan
     tanpa dasar. */
  const scopeKnown = groupScoped && thresholdRp != null;
  const inScope = scopeKnown && totRev >= (thresholdRp as number);

  const lowTax = juris.filter(r => r.etr != null && r.etr < P2_MIN_RATE);
  /* Top-up diasersikan HANYA di dalam cakupan. Di luar cakupan angkanya bukan
     nol melainkan tak berlaku — dan itu dua pernyataan yang berbeda. */
  const topUp = inScope
    ? lowTax.reduce((a, r) => a + R(r.pbt * (P2_MIN_RATE - (r.etr as number)) / 100), 0)
    : null;
  if (inScope) {
    for (const r of juris) {
      r.topUp = r.etr != null && r.etr < P2_MIN_RATE ? R(r.pbt * (P2_MIN_RATE - r.etr) / 100) : 0;
    }
  }

  return { available: true, groupScoped, parentCountry, juris,
           totPbt, totTax, totRev, etrGroup, thresholdRp, scopeKnown, inScope, lowTax, topUp };
}

/* ---------- Pendanaan pemasok (amandemen PSAK 2 & PSAK 7) ---------- */

/** Satu pengaturan pendanaan pemasok. Rp juta. Tak ada produsen di repo saat ini
 *  — ini SEAM tempat register nyata dipasang, dan sekaligus yang membuat
 *  penolakan modul dapat DIFALSIFIKASI (beri register → modul mengasersikan). */
export interface SfArrangement {
  provider: string; carrying: number; drawn: number;
  minDays: number; maxDays: number;
}

export interface SupplierFinance {
  /** false = neraca saldo tak memuat akun utang usaha → populasinya pun tak diketahui. */
  available: boolean;
  /** Utang usaha per buku besar (Rp juta) — POPULASI, bukan jumlah dalam pengaturan. */
  tradePayables: number | null;
  /** false = tak ada register pengaturan pendanaan pemasok. Seluruh field di
   *  bawah null: nilai tercatat, penarikan, jumlah penyedia & rentang jatuh
   *  tempo TAK DAPAT diasersikan dari neraca saldo saja. */
  registered: boolean;
  providers: number | null;
  carrying: number | null;
  drawn: number | null;
  /** Utang usaha di LUAR pengaturan — hanya terhitung bila register ada. */
  outsideArrangement: number | null;
  /** Rentang jatuh tempo pengaturan, dari register. */
  rangeDays: string | null;
}

/**
 * Ikhtisar pendanaan pemasok. Tanpa register, satu-satunya angka yang boleh
 * diucapkan adalah utang usaha per buku besar — dan itu POPULASI, bukan bagian
 * yang berada di dalam pengaturan. Menyamakan keduanya (nilai tercatat = seluruh
 * utang usaha) adalah kebohongan yang berbeda, bukan perbaikan.
 */
export function supplierFinance(wtb?: WTB, register?: SfArrangement[] | null,
                                basis: FigureBasis = 'adj'): SupplierFinance {
  const rows = (wtb && wtb.length) ? wtb : [];
  const row = rows.find(r => String(r.code || '') === SF_PAYABLE_CODE);
  if (!row) {
    return { available: false, tradePayables: null, registered: false, providers: null,
             carrying: null, drawn: null, outsideArrangement: null, rangeDays: null };
  }
  const raw = row[basis];
  /* Liabilitas tersimpan KREDIT (negatif) di WTB → dibalik positif. */
  const tradePayables = jt(-(raw != null ? raw : 0));

  if (!register || !register.length) {
    return { available: true, tradePayables, registered: false, providers: null,
             carrying: null, drawn: null, outsideArrangement: null, rangeDays: null };
  }
  const carrying = register.reduce((a, x) => a + x.carrying, 0);
  const drawn = register.reduce((a, x) => a + x.drawn, 0);
  const lo = Math.min(...register.map(x => x.minDays));
  const hi = Math.max(...register.map(x => x.maxDays));
  return {
    available: true, tradePayables, registered: true,
    providers: register.length, carrying, drawn,
    outsideArrangement: tradePayables - carrying,
    rangeDays: lo + '–' + hi + ' hari',
  };
}
