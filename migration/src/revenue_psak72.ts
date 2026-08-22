/* ============================================================
   Asseris — kanon skedul pengakuan pendapatan firma (PSAK 72).

   Logika murni di balik modul "Pendapatan & Penagihan" (`view_firmrevenue`):
   nilai kontrak per perikatan, pendapatan diakui, aset/liabilitas kontrak.
   Dipisah dari view supaya dapat diuji tanpa DOM — tabel yang menyatakan
   berapa pendapatan firma yang boleh diakui sebelumnya punya NOL uji.

   Yang dicabut di sini:

   · **Nilai kontrak tak boleh dikarang.** Rumus lama `c ? c.fee :
     e.materiality * 0.4` mengambil MATERIALITAS — sebuah pertimbangan audit —
     sebagai proksi harga kontrak ketika perikatan tak menemukan kliennya.
     Keduanya tak punya hubungan apa pun: materialitas ditetapkan dari
     benchmark laporan keuangan KLIEN, harga kontrak dari negosiasi fee.
     Angka 0,4 tak berasal dari mana-mana. Sebuah baris yang kehilangan
     kliennya sekarang berkata "belum ditetapkan" dan KELUAR dari total,
     bukan diam-diam membawa angka karangan ke dalam pendapatan diakui.

   · **Metode yang tidak diukur tak boleh dilabeli.** Kolom lama memasang
     'Over-time (input)' / 'Point-in-time' dari `type`-nya perikatan,
     sementara SETIAP baris — tanpa kecuali — dihitung `nilai kontrak × pct`
     dengan `pct` = `engagement.progress`, yaitu persentase penyelesaian yang
     DILAPORKAN, bukan masukan yang dikeluarkan (jam) maupun keluaran yang
     diserahkan. Modul kini menyebut PENGUKURAN yang benar-benar dipakai dan
     MENANDAI baris yang klasifikasi PSAK 72-nya belum ditetapkan, alih-alih
     mengarang klasifikasi. Usulan penggantinya (metode masukan berbasis jam)
     ada di `docs/usulan-R3-metode-pengukuran-psak72.md` — keputusan Ari.
   ============================================================ */

/** Perikatan — subset yang dipakai skedul. Struktural: `EngagementRow` masuk. */
export interface RevEngagement {
  id: string;
  clientId: string;
  type?: string;
  progress?: number;
  partner?: string;
  actualHrs?: number;
  budgetHrs?: number;
}

/** Klien — subset yang dipakai skedul. Struktural: `ClientRow` masuk. */
export interface RevClient {
  id: string;
  name: string;
  /** Fee kontrak. Opsional DI SINI karena data runtime (hidrasi API) boleh
      datang tanpa kolom ini; ketiadaannya adalah lubang data, bukan izin
      menaksir. */
  fee?: number | null;
}

/** Faktur — subset yang dipakai skedul. Struktural: `InvoiceRecord` masuk. */
export interface RevInvoice {
  eng?: string;
  status?: string;
  amount?: number;
}

/** Satu-satunya lubang data yang dikenal skedul ini. */
export type RevenueGap = 'contract-unknown';

export interface RevenueRow {
  id: string;
  clientId: string;
  /** Nama klien, atau '—' bila perikatan tak menemukan kliennya. */
  client: string;
  /** Nilai kontrak (Rp). `null` = belum ditetapkan → baris keluar dari total. */
  contract: number | null;
  /** Fraksi penyelesaian yang DILAPORKAN (0..1). */
  pct: number;
  /** Pendapatan diakui (Rp). `null` bila nilai kontrak belum ditetapkan. */
  recognized: number | null;
  /** Tertagih dari register faktur (Rp) — fakta, bukan turunan. */
  billed: number;
  /** Aset kontrak (diakui > ditagih). `null` bila kontrak belum ditetapkan. */
  asset: number | null;
  /** Liabilitas kontrak (ditagih > diakui). `null` bila belum ditetapkan. */
  liab: number | null;
  /** Dasar pengukuran yang BENAR-BENAR dipakai baris ini. */
  measure: string;
  /**
   * `true` bila klasifikasi PSAK 72 baris ini belum ditetapkan: jenis
   * perikatannya bukan audit laporan keuangan, sehingga kewajiban
   * pelaksanaannya mungkin diselesaikan pada SATU titik waktu — dan
   * persentase penyelesaian bukan ukuran yang tepat untuknya.
   */
  classificationOpen: boolean;
  partner: string;
  hrs: number | null;
  budgetHrs: number | null;
  gap: RevenueGap | null;
}

export interface RevenueSchedule {
  rows: RevenueRow[];
  /** Baris yang KELUAR dari total kontrak karena lubang data. */
  gaps: RevenueRow[];
  totContract: number;
  totRecognized: number;
  /** Σ tertagih SELURUH baris — angka register, tak bergantung nilai kontrak. */
  totBilled: number;
  totAsset: number;
  totLiab: number;
  backlog: number;
}

export interface RevenueScheduleInput {
  engagements: RevEngagement[];
  clients: RevClient[];
  invoices: RevInvoice[];
}

/** Faktur yang belum terbit tidak menagih apa pun. */
const UNBILLED_STATUS = 'Draft';

/** Pengukuran yang dipakai SETIAP baris hari ini. Sengaja menyebut sumbernya. */
export const MEASURE_REPORTED_PCT = 'Over-time · % penyelesaian dilaporkan';

/**
 * Nilai kontrak sebuah perikatan.
 *
 * Satu-satunya sumbernya adalah fee klien. Tidak ada proksi, tidak ada
 * taksiran, tidak ada "yang terdekat": bila fee tak dinyatakan sebagai angka
 * berhingga non-negatif, jawabannya `null` dan pemanggil WAJIB memperlakukan
 * barisnya sebagai lubang data.
 */
export function contractValueOf(client: RevClient | null | undefined): number | null {
  if (!client) return null;
  const fee = client.fee;
  if (typeof fee !== 'number' || !Number.isFinite(fee) || fee < 0) return null;
  return fee;
}

/** Fraksi penyelesaian yang dilaporkan, dijepit ke 0..1. */
function reportedFraction(progress: number | undefined): number {
  const p = typeof progress === 'number' && Number.isFinite(progress) ? progress : 0;
  return Math.min(1, Math.max(0, p / 100));
}

/**
 * Klasifikasi PSAK 72 baris ini BELUM ditetapkan?
 *
 * Kolom lama memasang 'Point-in-time' untuk perikatan non-audit lalu tetap
 * mengakui `kontrak × pct` untuk baris itu juga — label dan aritmetikanya
 * saling membantah. Di sini ketidaktahuan dinyatakan sebagai ketidaktahuan.
 */
function classificationOpenFor(type: string | undefined): boolean {
  return !(type || '').includes('Audit');
}

const num = (v: number | undefined | null): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

/**
 * Skedul pengakuan pendapatan per perikatan.
 *
 * `billed` selalu ikut total (ia fakta register faktur); `contract`,
 * `recognized`, `asset`, `liab` hanya ikut bila nilai kontraknya diketahui.
 * Konsekuensinya disengaja: `totAsset − totLiab` boleh berbeda dari
 * `totRecognized − totBilled` ketika ada lubang data, dan perbedaannya
 * TERBACA lewat `gaps` alih-alih tersembunyi di balik angka karangan.
 */
export function recognitionSchedule(input: RevenueScheduleInput): RevenueSchedule {
  const { engagements, clients, invoices } = input;

  const rows: RevenueRow[] = (engagements || []).map((e) => {
    const c = (clients || []).find((x) => x.id === e.clientId) || null;
    const contract = contractValueOf(c);
    const pct = reportedFraction(e.progress);
    const recognized = contract == null ? null : Math.round(contract * pct);
    const billed = (invoices || [])
      .filter((i) => i.eng === e.id && i.status !== UNBILLED_STATUS)
      .reduce((s, i) => s + (num(i.amount) || 0), 0);
    return {
      id: e.id,
      clientId: e.clientId,
      client: c ? c.name : '—',
      contract,
      pct,
      recognized,
      billed,
      asset: recognized == null ? null : Math.max(0, recognized - billed),
      liab: recognized == null ? null : Math.max(0, billed - recognized),
      measure: MEASURE_REPORTED_PCT,
      classificationOpen: classificationOpenFor(e.type),
      partner: (e.partner || '').split(',')[0],
      hrs: num(e.actualHrs),
      budgetHrs: num(e.budgetHrs),
      gap: contract == null ? 'contract-unknown' : null,
    };
  });

  const priced = rows.filter((r) => r.contract != null);
  const sum = (pick: (r: RevenueRow) => number | null): number =>
    priced.reduce((s, r) => s + (pick(r) || 0), 0);

  const totContract = sum((r) => r.contract);
  const totRecognized = sum((r) => r.recognized);
  return {
    rows,
    gaps: rows.filter((r) => r.gap != null),
    totContract,
    totRecognized,
    totBilled: rows.reduce((s, r) => s + r.billed, 0),
    totAsset: sum((r) => r.asset),
    totLiab: sum((r) => r.liab),
    backlog: totContract - totRecognized,
  };
}
