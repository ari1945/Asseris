/* ============================================================
   Asseris — FORECAST ARUS KAS FIRMA: derivasi MURNI
   prompt 31-treasury (TR1 · TR2 · TR3). PRD induk: docs/prd-firm-erp-deepening.md.
   ------------------------------------------------------------
   Berkas ini TIDAK mengubah dari mana angkanya berasal. Deret dasar tetap
   `AMS.CASH_FORECAST` — enam baris seed. Menggantinya dengan turunan jatuh tempo
   AR/AP/pajak adalah **PR-6**, arc tersendiri yang sudah disetujui dan sengaja
   TIDAK dikerjakan di sini.

   Yang dikerjakan berkas ini adalah tiga hal yang dapat dibereskan tanpa PR-6:

     1. derivasinya (penerapan skenario, deret berjalan, zona perhatian,
        pelabelan periode) diangkat keluar dari tampilan supaya dapat diuji;
     2. ambang zona perhatian datang dari SATU parameter — sebelumnya angka
        `7000` diketik empat kali di dalam JSX, sehingga mengubahnya di satu
        tempat menghasilkan layar yang berselisih dengan dirinya sendiri;
     3. label periode mengikuti klok SSOT, dan **berhenti mengklaim tahun** bila
        deret seed tidak lagi sejalan dengan klok itu.

   ------------------------------------------------------------
   SOAL BUTIR 3 — mengapa tidak sekadar menempelkan tahun dari klok

   Bentuk lama menulis `r.m + ' 2026'`. "Forecast bergulir 6 bulan" karena itu
   tidak bergulir: ketika klok pindah tahun, labelnya tetap 2026 dan tak ada yang
   merah. Tetapi memperbaikinya dengan menempelkan tahun klok ke bulan seed
   melahirkan kebohongan KEDUA yang lebih halus — angka Maret akan berlabel
   "September" begitu klok bergerak enam bulan, dan pembacanya tak akan tahu.

   Karena itu aturannya:
     · bulan seed COCOK dengan bulan klok  → label = bulan + tahun dari klok;
     · TIDAK cocok                          → label = bulan seed SAJA (tanpa
       tahun), `aligned: false`, dan `note` menyebut kedua sisi. Tampilan wajib
       menampilkannya. Ketidakcocokan itu adalah kabar, bukan hal yang ditutup.

   MURNI: tanpa React, `AMS`, `window`, atau klok. Tanggal DISUNTIKKAN.
   ============================================================ */

/** Singkatan bulan Bahasa Indonesia — sama dengan yang dipakai deret seed. */
export const BULAN_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'] as const;

export interface CashScenario {
  key: string;
  label: string;
  /** Pengali arus masuk. */
  inF: number;
  /** Pengali arus keluar. */
  outF: number;
}

/* Skenario = PENGALI DATAR atas deret seed. Ia diungkap apa adanya di catatan kaki
   tab, dan menjadi "asumsi bernama atas komponen" pada PR-6 — bukan di sini. */
export const CASH_SCENARIOS: readonly CashScenario[] = [
  { key: 'base', label: 'Basis', inF: 1.0, outF: 1.0 },
  { key: 'opt', label: 'Optimis', inF: 1.12, outF: 0.97 },
  { key: 'cons', label: 'Konservatif', inF: 0.85, outF: 1.06 },
];

export function scenarioByKey(key: string): CashScenario {
  return CASH_SCENARIOS.find((s) => s.key === key) || CASH_SCENARIOS[0];
}

/** Satu baris deret seed (`AMS.CASH_FORECAST`) — nilainya dalam JUTA rupiah. */
export interface ForecastSeedRow {
  m: string;
  open: number;
  inflow: number;
  outflow: number;
}

export interface ForecastRow {
  /** Bulan menurut deret seed. */
  m: string;
  /** Label periode untuk layar & kertas kerja — tanpa tahun bila tak sejalan klok. */
  period: string;
  open: number;
  inflow: number;
  outflow: number;
  net: number;
  close: number;
  /** Saldo akhir di bawah ambang kebijakan likuiditas. */
  watch: boolean;
}

export interface Forecast {
  rows: ForecastRow[];
  /** Saldo akhir terendah sepanjang horizon. */
  minClose: number;
  /** `minClose` di bawah ambang — SATU sumber untuk kartu KPI dan warna baris. */
  minCloseWatch: boolean;
  avgOutflow: number;
  /** Bulan tertutup oleh kas awal terhadap rata-rata arus keluar. */
  runway: number;
  netGen: number;
  /** Ambang yang dipakai, diteruskan apa adanya untuk ditulis di catatan kaki. */
  watchFloor: number;
  /** Bulan seed sejalan dengan klok SSOT. */
  aligned: boolean;
  /** Kosong bila sejalan; bila tidak, ia menyebut kedua sisi. */
  note: string;
}

function isoParts(iso: string): { y: number; m: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  if (!(m >= 1 && m <= 12)) return null;
  return { y, m: m - 1 };
}

/** Label 'Mmm YYYY' untuk `n` bulan berturut mulai bulan `today`. */
export function periodLabels(today: string, n: number): string[] {
  const p = isoParts(today);
  if (!p) return [];
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const idx = p.m + i;
    out.push(`${BULAN_ID[idx % 12]} ${p.y + Math.floor(idx / 12)}`);
  }
  return out;
}

/**
 * Terapkan skenario, bangun deret berjalan, tandai zona perhatian, beri label periode.
 *
 * `watchFloor` DISUNTIKKAN — ia kebijakan keuangan firma (`FIRM_CASH_POLICY`),
 * bukan detail tampilan, dan berkas ini tidak boleh punya nilai defaultnya sendiri.
 */
export function cashForecast(
  seed: readonly ForecastSeedRow[],
  sc: CashScenario,
  opts: { today: string; watchFloor: number },
): Forecast {
  const rows0 = (seed || []).map((r) => {
    const inflow = Math.round(r.inflow * sc.inF);
    const outflow = Math.round(r.outflow * sc.outF);
    return { m: r.m, open: r.open, inflow, outflow, net: inflow - outflow };
  });

  const labels = periodLabels(opts.today, rows0.length);
  /* Sejalan bila SETIAP bulan seed sama dengan bulan klok pada posisi yang sama. */
  const aligned = labels.length === rows0.length
    && rows0.every((r, i) => labels[i].split(' ')[0] === r.m);
  const klokBulan = labels.length ? labels[0] : '(tanggal tak terbaca)';
  const note = aligned ? ''
    : `Deret forecast diseed untuk ${rows0.length ? rows0[0].m + '–' + rows0[rows0.length - 1].m : '—'}, `
      + `sementara klok menunjuk ${klokBulan}. Angka di bawah BUKAN periode berjalan, `
      + 'jadi labelnya berhenti menyebut tahun sampai deretnya diperbarui.';

  /* Deret BERJALAN: hanya saldo awal baris pertama yang berasal dari seed; sisanya
     adalah saldo akhir bulan sebelumnya. Skenario karena itu TIDAK pernah menggeser
     saldo awal periode pertama. */
  let prev = 0;
  const rows: ForecastRow[] = rows0.map((r, i) => {
    const open = i === 0 ? (seed[0] ? seed[0].open : 0) : prev;
    const close = open + r.net;
    prev = close;
    return {
      ...r, open, close,
      period: aligned ? labels[i] : r.m,
      watch: close < opts.watchFloor,
    };
  });

  const minClose = rows.length ? Math.min(...rows.map((r) => r.close)) : 0;
  const avgOutflow = rows.length ? rows.reduce((s, r) => s + r.outflow, 0) / rows.length : 0;
  return {
    rows, minClose,
    minCloseWatch: rows.length ? minClose < opts.watchFloor : false,
    avgOutflow,
    runway: avgOutflow ? (rows[0].open / avgOutflow) : 0,
    netGen: rows.reduce((s, r) => s + r.net, 0),
    watchFloor: opts.watchFloor,
    aligned, note,
  };
}
