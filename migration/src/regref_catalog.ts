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
import { FX_LABEL, FX_REGISTRY } from './canon_fx';
import { CIT_LABEL, CIT_REGISTRY, GLOBE_MIN_LABEL, GLOBE_MIN_REGISTRY } from './canon_cit';
import { PPL_LABEL, PPL_REGISTRY } from './canon_ppl';
import { ROTATION_LABEL, ROTATION_REGISTRY } from './canon_rotation';
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
    {
      id: 'kurs',
      label: FX_LABEL,
      enforcement: 'block',
      cadence: 'Setiap periode pelaporan — kurs penutup ditetapkan pada tiap tanggal pelaporan; kurs berubah harian',
      breaksIfStale:
        'Revaluasi pos moneter valas dihitung pada kurs periode LAIN dan hasilnya DIBUKUKAN ke '
        + 'GL 5-600 (JV-0319/0320), sehingga laba operasi firma dan saldo akun kas valas ikut '
        + 'bergeser tanpa satu pun tanda. Rekonsiliasi rekening valas juga membandingkan bank '
        + 'dan buku pada dasar yang berbeda. Karena itu masa yang tak tercakup MENGHENTIKAN '
        + 'perhitungan, bukan memakai kurs terakhir.',
      module: 'cashbank',
      sets: FX_REGISTRY as RegRefSet<unknown>[],
    },
    {
      id: 'pph-badan',
      label: CIT_LABEL,
      enforcement: 'block',
      cadence: 'Saat UU pajak berubah — 25% (2010–2019) → 22% (2020–2021, Perpu 1/2020) → 22% (2022→, UU HPP)',
      breaksIfStale:
        'Pajak kini, pajak tangguhan, rekonsiliasi tarif efektif, kertas kerja konsolidasi dan '
        + 'informasi proforma seluruhnya dikalikan tarif tahun yang salah — di kertas kerja yang '
        + 'menopang opini. Karena itu masa yang tak tercakup MENGHENTIKAN perhitungan.',
      module: 'psak46',
      sets: CIT_REGISTRY as RegRefSet<unknown>[],
    },
    {
      id: 'globe-min',
      label: GLOBE_MIN_LABEL,
      enforcement: 'block',
      cadence: 'Saat aturan adopsi berubah — Indonesia lewat PMK 136/2024, berlaku Tahun Pajak 2025',
      breaksIfStale:
        'Estimasi eksposur top-up tax dihitung terhadap ambang yang tak lagi berlaku, lalu '
        + 'diungkapkan sebagai angka yang “dapat diestimasi secara wajar”. Masa sebelum adopsi '
        + 'sengaja tak tercakup: di sana angka itu tak boleh ada sama sekali.',
      module: 'newdisc',
      sets: GLOBE_MIN_REGISTRY as RegRefSet<unknown>[],
    },
    {
      id: 'ppl',
      label: PPL_LABEL,
      enforcement: 'block',
      cadence: 'Saat PMK berubah — ambang berlaku sejak PMK 186/PMK.01/2021 Pasal 37',
      breaksIfStale:
        'Kepatuhan PPL setiap Akuntan Publik dinilai terhadap ambang tahun yang salah, dan '
        + 'labelnya tetap menyebut tahun lama. Sebuah verdict kepatuhan tak punya jawaban '
        + 'separuh, jadi masa yang tak tercakup MENGHENTIKAN penilaian alih-alih menebak.',
      module: 'cpe',
      sets: PPL_REGISTRY as RegRefSet<unknown>[],
    },
    {
      id: 'rotasi-ap',
      label: ROTATION_LABEL,
      enforcement: 'block',
      cadence: 'Saat PP/POJK berubah — PP 20/2015 (PIE umum) & POJK 13/POJK.03/2017 (jasa keuangan)',
      breaksIfStale:
        'Peringatan “wajib rotasi” dan jendela peringatan dini dihitung terhadap batas rezim '
        + 'yang tak lagi berlaku, sementara spanduknya tetap mengutip dasar hukum — kutipan yang '
        + 'benar di atas angka yang salah. Masa yang tak tercakup MENGHENTIKAN penilaian.',
      module: 'independence',
      sets: ROTATION_REGISTRY as RegRefSet<unknown>[],
    },
  ];
}

/** Id yang WAJIB ada. Gerbang uji memakai ini; menambah registry tanpa mendaftarkannya = merah. */
export const REGREF_EXPECTED_IDS = [
  'bpjs', 'ter', 'ptkp', 'biaya-jabatan', 'hari-libur',
  /* #283 — kurs (registry FX), mendarat di master sesudah cabang ini bercabang. */
  'kurs',
  /* Tahap A-2 — R1 · R2 · R3, plus besaran keempat (GloBE) yang ditemukan gerbang sensus. */
  'pph-badan', 'globe-min', 'ppl', 'rotasi-ap',
] as const;
