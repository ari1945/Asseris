/* ============================================================
   Asseris — Periode evaluasi tahunan SMM (SMM 1 ¶53) · SSOT
   ------------------------------------------------------------
   CACAT YANG DITUTUP

   Tiga modul mengalamatkan atestasi evaluasi SOQM dengan TAHUN
   KEWAJIBAN PPL AKUNTAN PUBLIK:

       view_governance.tsx   attestKeyFor('soqmAnnualEval', evalPeriod, CPE_REQ.year)
       view_isqm.tsx         attestKeyFor('soqmAnnualEval', smmPeriod,  CPE_REQ.year)
       view_isqm_deep.tsx    attestKeyFor('soqmAnnualEval', period,     CPE_REQ.year)

   `CPE_REQ.year` adalah tahun kalender kewajiban SKP (PMK 186/2021 Pasal 37).
   Ia tidak punya hubungan apa pun dengan periode yang DICAKUP evaluasi tahunan
   SMM 1 ¶53. Keduanya bergerak dengan jadwalnya masing-masing: seed hari ini
   berbunyi PPL 2026 di atas periode evaluasi 1 Jan – 31 Des 2025.

   Argumen ketiga `attestKeyFor` itu adalah FALLBACK — ia hanya terpakai ketika
   label periode tak memuat empat digit. Karena label seed memuat '2025', jalur
   itu tak pernah dieksekusi hari ini: cacatnya DORMAN, bukan aktif. Ia bangun
   pada satu keadaan yang ditulis ketiga modul itu sendiri, `master.period ||
   'Tahun Berjalan'` — begitu `QM_EVAL.period` kosong, alamat atestasi firma
   melompat ke jam PPL, dan atestasi yang sudah tersimpan tak dapat ditemukan
   lagi karena alamatnya berpindah tanpa suara.

   ------------------------------------------------------------
   APA "TAHUN EVALUASI SOQM" ITU

   ¶53 mewajibkan evaluasi sistem manajemen mutu PADA SUATU SAAT, sekurangnya
   setahun sekali, atas suatu periode. Yang dialamatkan atestasi adalah PERIODE
   YANG DICAKUP — bukan tanggal evaluasi dilakukan (`QM_EVAL.date`, yang jatuh
   di tahun berikutnya), dan tentu bukan tahun PPL.

   Karena itu tahun alamat = tahun AKHIR periode yang dicakup, dan sumbernya
   adalah dua tanggal ISO pada `QM_EVAL` — bukan hasil urai label tampilan.
   Label manusiawinya justru DITURUNKAN dari dua tanggal yang sama, sehingga
   label dan alamat tak dapat berselisih.

   ------------------------------------------------------------
   BILA PERIODE TAK DINYATAKAN

   Tidak ada tebakan. Tak ada "yang terdekat", tak ada jam lain yang dipinjam:
   `year` menjadi `null` dan artefaknya TAK DAPAT DIALAMATKAN. Modul menampilkan
   keadaan itu apa adanya dan mengunci penandatanganan — jauh lebih baik daripada
   membubuhkan tanda tangan pada alamat karangan.

   Murni & deterministik — tanpa React, `window`, `Date.now()`, atau localStorage.
   ============================================================ */
import { attestKeyOf, attestYear } from './canon_firm_attest';

/** Nama artefak atestasi evaluasi tahunan SMM (`firmAttest.soqmAnnualEval.<tahun>`). */
export const SOQM_ANNUAL_ATTEST = 'soqmAnnualEval';

/**
 * Alamat sentinel untuk periode yang BELUM dinyatakan.
 *
 * Tetap empat digit agar tidak ditolak diam-diam oleh allow-list baca server
 * (`/^firmAttest\.soqmAnnualEval\.\d{4}$/` — penolakan 403 ditelan `useServerState`
 * sebagai "offline"), dan tahun 0000 tak akan pernah bertabrakan dengan periode
 * evaluasi nyata. Penandatanganan pada alamat ini DIKUNCI modul pemanggil.
 */
export const SOQM_ATTEST_UNSET_KEY = `${SOQM_ANNUAL_ATTEST}.0000`;

/** Kalimat tunggal untuk keadaan "periode evaluasi belum dinyatakan". */
export const SOQM_PERIOD_UNSET_LABEL = 'Periode evaluasi belum ditetapkan';

/** Bentuk `AMS.QM_EVAL` sejauh yang dibaca modul ini. */
export interface SmmEvalPeriodInput {
  /** ISO `YYYY-MM-DD` — awal periode yang dicakup evaluasi. */
  periodStart?: string | null;
  /** ISO `YYYY-MM-DD` — akhir periode yang dicakup; TAHUN ALAMAT berasal dari sini. */
  periodEnd?: string | null;
  /** Label warisan/manusiawi; hanya dipakai bila dua tanggal di atas absen. */
  period?: string | null;
}

export interface SmmEvalPeriod {
  start: string | null;
  end: string | null;
  /** Tahun alamat atestasi; `null` = periode tak dinyatakan, artefak tak dapat dialamatkan. */
  year: number | null;
  /** Label siap-tampil, DITURUNKAN dari `start`/`end` bila keduanya ada. */
  label: string;
}

const MONTH_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

interface Ymd { y: number; m: number; d: number }

/** Urai `YYYY-MM-DD` secara ketat; `null` bila bukan tanggal kalender yang sah. */
function parseIsoDate(v: string | null | undefined): Ymd | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || '').trim());
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  /* Tolak 31 Feb dkk. — UTC agar zona waktu mesin tak ikut menentukan. */
  const probe = new Date(Date.UTC(y, mo - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) return null;
  return { y, m: mo, d };
}

/**
 * Label periode dari dua tanggal ISO — bentuk yang sama persis dengan label
 * yang selama ini diketik tangan pada seed (`'1 Jan – 31 Des 2025'`), sehingga
 * menurunkannya tidak mengubah satu pun tampilan. Tahun ditulis sekali bila
 * kedua ujung berada di tahun yang sama.
 */
export function smmEvalPeriodLabel(start: string | null | undefined, end: string | null | undefined): string {
  const a = parseIsoDate(start), b = parseIsoDate(end);
  if (!a || !b) return '';
  const head = a.y === b.y ? `${a.d} ${MONTH_ID[a.m - 1]}` : `${a.d} ${MONTH_ID[a.m - 1]} ${a.y}`;
  return `${head} – ${b.d} ${MONTH_ID[b.m - 1]} ${b.y}`;
}

/**
 * Periode evaluasi tahunan SMM — SATU turunan yang dipakai ketiga modul.
 *
 * Urutan sumber tahun alamat:
 *   1. `periodEnd` (SSOT) — tahun akhir periode yang dicakup;
 *   2. empat digit pertama pada label `period` — KOMPATIBILITAS data warisan,
 *      dipertahankan persis seperti `attestYear` agar alamat atestasi yang
 *      sudah tersimpan tidak berpindah;
 *   3. tidak ada — `null`. Tidak ada jam lain yang dipinjam.
 */
export function smmEvalPeriod(master: SmmEvalPeriodInput | null | undefined): SmmEvalPeriod {
  const m = master || {};
  const a = parseIsoDate(m.periodStart), b = parseIsoDate(m.periodEnd);
  const derived = smmEvalPeriodLabel(m.periodStart, m.periodEnd);
  const legacyLabel = String(m.period || '').trim();
  if (b) {
    return {
      start: a ? String(m.periodStart).trim() : null,
      end: String(m.periodEnd).trim(),
      year: b.y,
      label: derived || legacyLabel || SOQM_PERIOD_UNSET_LABEL,
    };
  }
  const legacyYear = attestYear(legacyLabel);
  return {
    start: a ? String(m.periodStart).trim() : null,
    end: null,
    year: legacyYear ? Number(legacyYear) : null,
    label: legacyLabel || SOQM_PERIOD_UNSET_LABEL,
  };
}

/** Alamat atestasi untuk periode ini; `null` bila periodenya tak dinyatakan. */
export function soqmAnnualAttestKey(p: SmmEvalPeriod | null | undefined): string | null {
  const y = p ? p.year : null;
  return y == null ? null : attestKeyOf(SOQM_ANNUAL_ATTEST, y);
}
