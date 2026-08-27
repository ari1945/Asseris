/* ============================================================
   Asseris — Tarif PPh Badan & tarif minimum GloBE (berkunci masa berlaku)
   PRD `docs/prd-regref-tahap-a2.md` · PR-1 · SC-A6 · SC-A7 · SC-A8.
   ------------------------------------------------------------
   Tarif PPh Badan hidup di aplikasi ini sebagai `const RATE = 0.22`, delapan
   kali, di delapan berkas — salah satunya sebagai FALLBACK:

       const RATE = C ? C.RATE : 0.22;        // data_proforma.ts

   Fallback itu adalah bentuk paling halus dari cacat yang sama: ia tidak salah
   hari ini, ia hanya tidak dapat berkata kedaluwarsa. Tarif ini SUDAH pernah
   berubah — 25% sampai Tahun Pajak 2019, 22% sejak 2020 — dan rencana
   penurunan ke 20% pada 2022 DIBATALKAN UU 7/2021 (HPP). Tiga peristiwa
   legislatif dalam satu dekade untuk satu angka yang mengalikan pajak kini,
   pajak tangguhan, kertas kerja proforma, dan rekonsiliasi tarif efektif.

   Aturannya sama dengan `canon_regref.ts`:

     1. Tak ada "yang terdekat" — masa yang tak tercakup bukan 22%.
     2. Ini menyangkut uang, jadi ia MEMBLOKIR. `citRateRequired()` MELEMPAR
        bila masa yang diminta tak tercakup; tak ada nilai diam-diam.
     3. Belum dicocokkan ≠ tak tercakup: ketiga set di bawah `verified: false`
        karena belum ada yang mencocokkannya baris-per-baris dengan naskah
        UU-nya. Ia tetap menghitung, dengan penanda.

   Tarif minimum GloBE (Pilar Dua) ikut di sini karena ia besaran yang sama
   jenisnya: tarif pajak korporasi yang ditetapkan aturan dan berubah menurut
   kalender adopsi. Ia ditemukan oleh GERBANG SENSUS, bukan oleh pembacaan —
   lihat `regref_census.ts`.

   Fungsi MURNI: tanggal DISUNTIKKAN, tak pernah dibaca dari klok.
   ============================================================ */
import { regrefFor } from './canon_regref';
import type { RegRefLookup, RegRefSet } from './canon_regref';

export const CIT_LABEL = 'Tarif PPh Badan';
export const GLOBE_MIN_LABEL = 'Tarif minimum efektif GloBE (Pilar Dua)';

/**
 * Tarif PPh Badan menurut Tahun Pajak.
 *
 * Set 2010–2019 BUKAN hiasan sejarah: ia yang membuat registry ini dapat
 * dinyatakan salah. Tanpa satu set bernilai berbeda, uji "tarif dipilih menurut
 * tanggal" akan lolos bahkan bila pemilihannya tak pernah terjadi.
 */
export const CIT_REGISTRY: RegRefSet<number>[] = [
  {
    effectiveFrom: '2010-01-01',
    effectiveTo: '2019-12-31',
    basis: 'UU 36/2008 Pasal 17 ayat (1) huruf b — 25% sejak Tahun Pajak 2010',
    sourceDoc: '',
    verified: false,
    note: 'Tarif 25% Tahun Pajak 2010–2019 belum dicocokkan dengan naskah UU 36/2008; '
      + 'ia dipakai bila kertas kerja menyentuh masa sebelum 2020.',
    value: 0.25,
  },
  {
    effectiveFrom: '2020-01-01',
    effectiveTo: '2021-12-31',
    basis: 'Perpu 1/2020 jo. UU 2/2020 Pasal 5 — 22% untuk Tahun Pajak 2020 & 2021',
    sourceDoc: '',
    verified: false,
    note: 'Tarif 22% Tahun Pajak 2020–2021 belum dicocokkan dengan naskah UU 2/2020.',
    value: 0.22,
  },
  {
    effectiveFrom: '2022-01-01',
    effectiveTo: null,
    basis: 'UU 7/2021 (HPP) Pasal 17 — 22% sejak Tahun Pajak 2022; rencana penurunan ke 20% dibatalkan',
    sourceDoc: '',
    verified: false,
    note: 'Tarif 22% sejak Tahun Pajak 2022 belum dicocokkan dengan naskah UU 7/2021 (HPP).',
    value: 0.22,
  },
];

/**
 * Tarif minimum efektif GloBE.
 *
 * Indonesia mengadopsi lewat PMK 136/2024 (berlaku Tahun Pajak 2025). Modul
 * Pengungkapan Baru menghitung estimasi eksposur *top-up tax* dari angka ini —
 * karena itu ia menyangkut uang, dan karena itu ia memblokir.
 */
export const GLOBE_MIN_REGISTRY: RegRefSet<number>[] = [
  {
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    basis: 'PMK 136/2024 — GloBE Rules OECD, tarif minimum efektif 15% sejak Tahun Pajak 2025',
    sourceDoc: '',
    verified: false,
    note: 'Tarif minimum 15% dan tanggal mulai berlakunya belum dicocokkan dengan naskah PMK 136/2024; '
      + 'masa sebelum Tahun Pajak 2025 sengaja TIDAK tercakup — legislasi belum berlaku.',
    value: 15,
  },
];

/** Tarif PPh Badan yang berlaku pada `date`, atau penolakan yang menyebut alasannya. */
export function citRateOn(date: string | undefined | null): RegRefLookup<number> {
  return regrefFor(CIT_REGISTRY, String(date ?? ''), { label: CIT_LABEL, enforcement: 'block' });
}

/** Tarif minimum GloBE yang berlaku pada `date` (dalam PERSEN, mis. 15). */
export function globeMinRateOn(date: string | undefined | null): RegRefLookup<number> {
  return regrefFor(GLOBE_MIN_REGISTRY, String(date ?? ''), { label: GLOBE_MIN_LABEL, enforcement: 'block' });
}

/** Ditolaknya sebuah perhitungan karena dasarnya tak tercakup registry. */
export class RegRefBlocked extends Error {
  readonly label: string;
  readonly date: string;
  constructor(label: string, date: string, note: string) {
    super(note);
    this.name = 'RegRefBlocked';
    this.label = label;
    this.date = date;
  }
}

/**
 * Tarif PPh Badan sebagai ANGKA, atau lemparan.
 *
 * Dipakai di tempat yang secara struktural menuntut sebuah angka (konstanta
 * modul di lapisan kanon). Melempar adalah bentuk "MEMBLOKIR" di lapisan itu:
 * lebih baik satu kertas kerja berhenti dengan alasan yang terbaca daripada
 * seluruh pajak tangguhan dihitung dengan tarif tahun yang salah, diam-diam.
 */
export function citRateRequired(date: string): number {
  const look = citRateOn(date);
  if (look.value == null) throw new RegRefBlocked(CIT_LABEL, date, look.note);
  return look.value;
}

/** Tarif minimum GloBE sebagai ANGKA (persen), atau lemparan. */
export function globeMinRateRequired(date: string): number {
  const look = globeMinRateOn(date);
  if (look.value == null) throw new RegRefBlocked(GLOBE_MIN_LABEL, date, look.note);
  return look.value;
}

/** '22%' — label yang MENGIKUTI tarifnya, supaya teks tak dapat basi sendirian. */
export function citRatePct(rate: number): string {
  return (rate * 100).toFixed(rate * 100 % 1 === 0 ? 0 : 1) + '%';
}
