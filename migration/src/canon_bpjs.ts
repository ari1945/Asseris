/* ============================================================
   Asseris — Iuran BPJS (Kesehatan · JHT · JP · JKK · JKM)
   PRD `docs/prd-regulatory-reference-annual.md` · PR-2 · SC-3 · SC-4.
   ------------------------------------------------------------
   Batas upah BPJS DISESUAIKAN SETIAP TAHUN. Sampai 2026-08-19 aplikasi
   menyimpannya sebagai satu objek datar:

       PAYROLL_RATES = { period: 'Maret 2026', kesCap: 12_000_000,
                         jpCap: 10_547_400, ... }

   `period` ada, dan sekilas ia tampak seperti penjaga. Ia bukan: `period`
   dipakai sebagai kunci masa penggajian (id jurnal, post-check, judul slip)
   dan TAK PERNAH dipakai memilih tarifnya. Tak ada `ratesFor(period)` di
   repo ini. Pasangan "masa" dan "batas upah" berlaku semata karena keduanya
   ditulis berdekatan.

   Akibatnya pada Januari 2027 aplikasi akan menghitung potongan setiap
   pegawai dengan batas upah 2026, menampilkannya di slip gaji pegawai itu
   sendiri, dan tak memberi satu pun tanda bahwa dasarnya berasal dari tahun
   yang salah. Dasarnya tidak salah sejak awal — ia MEMBUSUK MENURUT JADWAL.

   Jawaban Q-3 (Ari, 2026-08-19): yang menyangkut uang MEMBLOKIR. Slip gaji
   yang salah lebih mahal daripada slip gaji yang belum dapat dihitung.

   Dua konsumen dulu menghitung potongan SENDIRI-SENDIRI dengan rumus yang
   disalin (`view_payroll` dan `view_personal`). Berkas ini menjadikannya satu
   pintu: gerbang yang hanya dipasang di salah satunya bukan gerbang.

   Fungsi MURNI: tanggal masa DISUNTIKKAN, tak pernah dibaca dari klok.
   ============================================================ */
import { regrefFor } from './canon_regref';
import type { RegRefSet, RegRefStatus } from './canon_regref';

/* ------------------------------------------------------------------
   1. Bentuk
   ------------------------------------------------------------------ */

export interface BpjsRates {
  /** Kesehatan — iuran pekerja & pemberi kerja, dengan batas upah. */
  kesEmp: number; kesEr: number; kesCap: number;
  /** Jaminan Hari Tua — tanpa batas upah. */
  jhtEmp: number; jhtEr: number;
  /** Jaminan Pensiun — dengan batas upah yang DISESUAIKAN TIAP TAHUN. */
  jpEmp: number; jpEr: number; jpCap: number;
  /** Kecelakaan kerja & kematian — pemberi kerja saja. */
  jkkEr: number; jkmEr: number;
}

export interface BpjsRegistry {
  /** Label masa penggajian yang sedang dijalankan (mis. 'Maret 2026'). */
  period: string;
  /** Masa itu sebagai TANGGAL — inilah yang menentukan set mana yang berlaku. */
  periodDate: string;
  sets: RegRefSet<BpjsRates>[];
}

export interface BpjsContribution {
  /** Potongan pekerja. */
  dKes: number; dJht: number; dJp: number;
  /** Iuran pemberi kerja. */
  eKes: number; eJht: number; eJp: number; eJkk: number; eJkm: number;
  /** false = tarif untuk masa ini tak tersedia; seluruh angka di atas 0 dan TAK BOLEH ditampilkan sebagai hasil. */
  computed: boolean;
  blocked: boolean;
  status: RegRefStatus;
  /** Kosong hanya bila `status === 'ok'`. */
  note: string;
  rates: BpjsRates | null;
}

const ZERO = { dKes: 0, dJht: 0, dJp: 0, eKes: 0, eJht: 0, eJp: 0, eJkk: 0, eJkm: 0 };

export const BPJS_LABEL = 'Tarif & batas upah BPJS';

/* ------------------------------------------------------------------
   2. Pencarian & perhitungan
   ------------------------------------------------------------------ */

/** Tarif yang berlaku pada `date`, atau penolakan. `enforcement: 'block'` — ini uang. */
export function bpjsRatesOn(reg: BpjsRegistry | undefined | null, date: string | undefined | null) {
  /* `date` sengaja menerima undefined: registry yang belum punya `periodDate`
     BUKAN alasan untuk diam-diam memakai tarif mana pun. Ia ditolak seperti
     tanggal rusak lainnya. */
  return regrefFor(reg?.sets, String(date ?? ''), { label: BPJS_LABEL, enforcement: 'block' });
}

/**
 * Iuran atas satu upah bulanan.
 *
 * Bila tarif masa itu tak tersedia, SELURUH komponen nol dan `computed: false`.
 * Nol di sini bukan "tidak ada potongan" — ia "belum dapat dihitung", dan
 * konsumen wajib menampilkan `note`, bukan angkanya.
 */
export function bpjsContribution(
  gross: number,
  reg: BpjsRegistry | undefined | null,
  date: string | undefined | null,
): BpjsContribution {
  const look = bpjsRatesOn(reg, date);
  const r = look.value;
  if (!r) {
    return { ...ZERO, computed: false, blocked: look.blocked, status: look.status, note: look.note, rates: null };
  }
  const g = Number(gross) || 0;
  const kesBase = Math.min(g, r.kesCap);
  const jpBase = Math.min(g, r.jpCap);
  return {
    dKes: Math.round(kesBase * r.kesEmp),
    dJht: Math.round(g * r.jhtEmp),
    dJp: Math.round(jpBase * r.jpEmp),
    eKes: Math.round(kesBase * r.kesEr),
    eJht: Math.round(g * r.jhtEr),
    eJp: Math.round(jpBase * r.jpEr),
    eJkk: Math.round(g * r.jkkEr),
    eJkm: Math.round(g * r.jkmEr),
    computed: true,
    blocked: false,
    status: look.status,
    note: look.note,
    rates: r,
  };
}
