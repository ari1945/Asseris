/* ============================================================
   Asseris — Katalog data referensi regulatori
   PRD `docs/prd-regulatory-reference-annual.md` · PR-4 · SC-8 · SC-9.
   ------------------------------------------------------------
   Enam set data di aplikasi ini berubah menurut kalender, bukan menurut kode.
   Sebelum arc ini, tak ada satu tempat pun yang dapat menjawab pertanyaan yang
   sesungguhnya ditanyakan setiap Januari: APA YANG HARUS SAYA PERBARUI?

   Katalog ini adalah jawabannya, dan sekaligus daftar yang ditegakkan gerbang
   uji: registry baru yang tak terdaftar di sini = uji merah. Halaman
   `view_regref` merender katalog ini, bukan daftarnya sendiri — supaya
   "yang tampil" dan "yang ditegakkan" tak dapat berbeda.

   `breaksIfStale` sengaja ditulis sebagai AKIBAT, bukan nama data. "Kalender
   libur 2027 belum diisi" tidak memberi tahu siapa pun apa yang rusak;
   "hari kerja setiap permintaan cuti akan lebih-hitung" memberi tahu.
   ============================================================ */
import { AMS } from './data';
import {
  BIAYA_JABATAN_LABEL, BIAYA_JABATAN_REGISTRY, PTKP_LABEL, PTKP_REGISTRY,
  TER_LABEL, TER_REGISTRY,
} from './canon_pph21';
import { BPJS_LABEL } from './canon_bpjs';
import type { BpjsRegistry } from './canon_bpjs';
import type { HolidayCalendar } from './canon_leave';
import type { RegRefEnforcement, RegRefSet } from './canon_regref';

export interface RegRefCatalogEntry {
  id: string;
  label: string;
  /** `block` = menghentikan perhitungan; `warn` = menghitung dengan penanda. */
  enforcement: RegRefEnforcement;
  /** Seberapa sering ia berubah, dalam bahasa manusia. */
  cadence: string;
  /** APA yang rusak bila ia kedaluwarsa — akibatnya, bukan namanya. */
  breaksIfStale: string;
  /** Modul yang memakainya, untuk tautan. */
  module: string;
  sets: RegRefSet<unknown>[];
}

/** Katalog dibaca SAAT DIPANGGIL: dua registry hidup di lapisan data (AMS). */
export function regrefCatalog(): RegRefCatalogEntry[] {
  const cal = AMS.LEAVE_HOLIDAYS as unknown as HolidayCalendar | undefined;
  const bpjs = AMS.PAYROLL_RATES as unknown as BpjsRegistry | undefined;
  return [
    {
      id: 'bpjs',
      label: BPJS_LABEL,
      enforcement: 'block',
      cadence: 'Tahunan — batas upah Jaminan Pensiun disesuaikan tiap tahun (PP 45/2015 Ps. 29)',
      breaksIfStale:
        'Potongan BPJS SETIAP pegawai dihitung dengan batas upah tahun lain, dan tampil di slip '
        + 'gaji orangnya sendiri. Karena itu masa yang tak tercakup MENGHENTIKAN perhitungan.',
      module: 'payroll',
      sets: (bpjs?.sets || []) as RegRefSet<unknown>[],
    },
    {
      id: 'ter',
      label: TER_LABEL,
      enforcement: 'block',
      cadence: 'Saat PMK berubah — TER berlaku sejak 1 Januari 2024',
      breaksIfStale:
        'PPh 21 bulanan setiap pegawai memakai lapisan tarif yang tak lagi berlaku. Masa sebelum '
        + '2024 lebih buruk lagi: metodenya belum ada, jadi perhitungannya dihentikan.',
      module: 'payroll',
      sets: TER_REGISTRY as RegRefSet<unknown>[],
    },
    {
      id: 'ptkp',
      label: PTKP_LABEL,
      enforcement: 'block',
      cadence: 'Saat PMK berubah — berlaku sejak Tahun Pajak 2016',
      breaksIfStale:
        'Rekonsiliasi PPh 21 masa Desember memakai PTKP yang salah, sehingga kurang/lebih potong '
        + 'akhir tahun ikut salah.',
      module: 'payroll',
      sets: PTKP_REGISTRY as RegRefSet<unknown>[],
    },
    {
      id: 'biaya-jabatan',
      label: BIAYA_JABATAN_LABEL,
      enforcement: 'block',
      cadence: 'Saat PMK berubah — 5% maksimal Rp 6.000.000/tahun sejak 2009',
      breaksIfStale:
        'Penghasilan neto tahunan terlalu besar atau terlalu kecil, dan seluruh rekonsiliasi '
        + 'Desember bergeser mengikutinya.',
      module: 'payroll',
      sets: BIAYA_JABATAN_REGISTRY as RegRefSet<unknown>[],
    },
    {
      id: 'hari-libur',
      label: 'Kalender hari libur nasional',
      enforcement: 'warn',
      cadence: 'Tahunan — SKB 3 Menteri, biasanya terbit pertengahan tahun sebelumnya',
      breaksIfStale:
        'Hari kerja setiap permintaan cuti LEBIH-hitung, karena hanya akhir pekan yang '
        + 'dikecualikan. Cuti bukan uang, jadi ia dihitung dengan penanda, tidak dihentikan.',
      module: 'leave',
      sets: (cal?.sets || []) as RegRefSet<unknown>[],
    },
  ];
}

/** Id yang WAJIB ada. Gerbang uji memakai ini; menambah registry tanpa mendaftarkannya = merah. */
export const REGREF_EXPECTED_IDS = ['bpjs', 'ter', 'ptkp', 'biaya-jabatan', 'hari-libur'] as const;
