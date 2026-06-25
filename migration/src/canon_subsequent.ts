/* ============================================================
   Asseris — Peristiwa Kemudian (SA 560 / PSAK 8) sebagai SUMBER
   KEBENARAN TUNGGAL + mesin rekonsiliasi ke laporan keuangan.
   ------------------------------------------------------------
   Modul ini:
     1. Memegang daftar kanonik peristiwa setelah tanggal neraca
        (SE_EVENTS). Sebelumnya dimiliki view_subsequent.tsx
        (hardcode) — kini satu sumber, bertipe.
     2. Menyediakan scanSubsequent(): merekonsiliasi tiap peristiwa
        terhadap perlakuan LK yang seharusnya —
          · PENYESUAI (Type 1, PSAK 8 ¶8): wajib tercermin di LK
            lewat jurnal penyesuai → status pembukuan diturunkan
            dari register AJE kanonik (AMS.AJE): posted/proposed/
            UNBOOKED. 'unbooked' = peristiwa penyesuai material yang
            belum dibukukan (temuan kelengkapan SA 560).
          · NON-PENYESUAI (Type 2, ¶10): wajib diungkapkan → status
            pengungkapan: disclosed/undisclosed.
        Murni & deterministik; tanpa React/efek-samping.

   Tautan peristiwa↔AJE bersifat EKSPLISIT (field `aje` = id AJE),
   bukan pencocokan teks — tanpa tautan = unbooked (jujur).
   ============================================================ */

export type SeType = 'adjusting' | 'nonadjusting';

export interface SubsequentEvent {
  /** id peristiwa, mis. 'SE-01' */
  id: string;
  /** tanggal kejadian (ISO) */
  date: string;
  /** hari sejak tanggal neraca (untuk geometri timeline) */
  day: number;
  title: string;
  type: SeType;
  /** estimasi dampak keuangan (judgment kertas kerja) */
  amount: number;
  desc: string;
  /** perlakuan akuntansi (PSAK 8) */
  treatment: string;
  /** id AJE penaut bila peristiwa penyesuai telah/akan dibukukan */
  aje?: string;
  /** status pengungkapan untuk peristiwa non-penyesuai */
  disclosed?: boolean;
}

/** Subset baris AJE yang dibutuhkan rekonsiliasi (kompatibel AMS.AJE).
    Hanya `id` & `status` yang dipakai; sisanya opsional agar selaras AjeRow. */
export interface AjeEntry {
  id: string;
  status?: string; // 'Posted' | 'Proposed'
  amount?: number;
  desc?: string;
  ref?: string;
  dr?: string;
  cr?: string;
}

export type BookStatus = 'posted' | 'proposed' | 'unbooked';
export type DiscStatus = 'disclosed' | 'undisclosed';

/* ---- Daftar kanonik peristiwa kemudian (SA 560 / PSAK 8) ----
   `aje` tak diisi pada SE-01/SE-04 → peristiwa penyesuai material
   teridentifikasi saat fieldwork namun BELUM dibukukan (temuan).
   SE-02 (kebakaran) sengaja `disclosed:false` → gap pengungkapan. */
export const SE_EVENTS: SubsequentEvent[] = [
  { id: 'SE-01', date: '2026-01-12', day: 12, title: 'Pelanggan utama (PT Distribusi Andal) mengajukan PKPU', type: 'adjusting', amount: 2_530_000_000, desc: 'Kondisi sudah ada pada tgl neraca — piutang Rp 2,53 M perlu dievaluasi penurunan nilainya.', treatment: 'Sesuaikan CKPN / hapus buku piutang per 31 Des 2025.' },
  { id: 'SE-02', date: '2026-01-28', day: 28, title: 'Kebakaran di gudang cabang Cikarang', type: 'nonadjusting', amount: 4_100_000_000, desc: 'Peristiwa terjadi setelah tgl neraca — tidak menyesuaikan, namun material untuk diungkapkan.', treatment: 'Ungkapkan dalam CALK (sifat & estimasi dampak keuangan).', disclosed: false },
  { id: 'SE-03', date: '2026-02-10', day: 41, title: 'Penarikan fasilitas kredit baru Rp 20 M', type: 'nonadjusting', amount: 20_000_000_000, desc: 'Pendanaan baru untuk ekspansi — peristiwa non-penyesuai.', treatment: 'Ungkapkan dalam CALK peristiwa setelah periode pelaporan.', disclosed: true },
  { id: 'SE-04', date: '2026-02-18', day: 49, title: 'Putusan pengadilan atas gugatan pemasok', type: 'adjusting', amount: 850_000_000, desc: 'Mengonfirmasi kewajiban yang sudah ada pada tgl neraca — provisi perlu disesuaikan.', treatment: 'Akui/sesuaikan provisi liabilitas Rp 850 jt per 31 Des 2025.' },
  { id: 'SE-05', date: '2026-03-05', day: 64, title: 'Deklarasi dividen interim oleh Direksi', type: 'nonadjusting', amount: 6_000_000_000, desc: 'Dividen dideklarasi setelah tgl neraca — tidak diakui sebagai liabilitas per 31 Des.', treatment: 'Ungkapkan dalam CALK; tidak diakui sebagai liabilitas.', disclosed: true },
];

/* ---- bentuk hasil rekonsiliasi ---- */
export interface SeReflection {
  id: string;
  title: string;
  type: SeType;
  amount: number;
  /** untuk peristiwa penyesuai */
  bookStatus?: BookStatus;
  ajeId?: string;
  /** untuk peristiwa non-penyesuai */
  discStatus?: DiscStatus;
  /** true bila perlakuan LK belum dipenuhi (penyesuai unbooked / non-penyesuai undisclosed) */
  isGap: boolean;
}

export interface SeScanRollup {
  events: number;
  adjustingCount: number;
  nonAdjustingCount: number;
  /** total estimasi dampak peristiwa penyesuai */
  adjustingImpact: number;
  bookedImpact: number;
  proposedImpact: number;
  /** dampak peristiwa penyesuai yang BELUM dibukukan (temuan utama) */
  unbookedImpact: number;
  unbookedCount: number;
  undisclosedCount: number;
  /** total gap (unbooked penyesuai + undisclosed non-penyesuai) */
  gaps: number;
}

export interface SeScanResult {
  reflections: SeReflection[];
  rollup: SeScanRollup;
}

/* ============================================================
   scanSubsequent — rekonsiliasi peristiwa ↔ perlakuan LK.
     · penyesuai → status pembukuan dari register AJE
     · non-penyesuai → status pengungkapan dari `disclosed`
   ============================================================ */
export function scanSubsequent(input: {
  events: SubsequentEvent[];
  aje: AjeEntry[];
}): SeScanResult {
  const { events, aje } = input;
  const ajeById = new Map<string, AjeEntry>();
  aje.forEach(a => ajeById.set(a.id, a));

  const reflections: SeReflection[] = events.map(e => {
    if (e.type === 'adjusting') {
      const linked = e.aje ? ajeById.get(e.aje) : undefined;
      const bookStatus: BookStatus = linked
        ? (linked.status === 'Posted' ? 'posted' : 'proposed')
        : 'unbooked';
      return { id: e.id, title: e.title, type: e.type, amount: e.amount, bookStatus, ajeId: linked ? linked.id : undefined, isGap: bookStatus === 'unbooked' };
    }
    const discStatus: DiscStatus = e.disclosed ? 'disclosed' : 'undisclosed';
    return { id: e.id, title: e.title, type: e.type, amount: e.amount, discStatus, isGap: discStatus === 'undisclosed' };
  });

  const adj = reflections.filter(r => r.type === 'adjusting');
  const impactBy = (s: BookStatus) => adj.filter(r => r.bookStatus === s).reduce((acc, r) => acc + r.amount, 0);
  const unbookedCount = adj.filter(r => r.bookStatus === 'unbooked').length;
  const undisclosedCount = reflections.filter(r => r.type === 'nonadjusting' && r.discStatus === 'undisclosed').length;

  const rollup: SeScanRollup = {
    events: events.length,
    adjustingCount: adj.length,
    nonAdjustingCount: reflections.length - adj.length,
    adjustingImpact: adj.reduce((acc, r) => acc + r.amount, 0),
    bookedImpact: impactBy('posted'),
    proposedImpact: impactBy('proposed'),
    unbookedImpact: impactBy('unbooked'),
    unbookedCount,
    undisclosedCount,
    gaps: unbookedCount + undisclosedCount,
  };

  return { reflections, rollup };
}

/* ---- metadata status untuk UI (badge) ---- */
export const BOOK_STATUS_META: Record<BookStatus, { l: string; k: string }> = {
  posted: { l: 'Dibukukan', k: 'green' },
  proposed: { l: 'Diusulkan (AJE)', k: 'amber' },
  unbooked: { l: 'Belum Dibukukan', k: 'red' },
};

export const DISC_STATUS_META: Record<DiscStatus, { l: string; k: string }> = {
  disclosed: { l: 'Diungkapkan', k: 'green' },
  undisclosed: { l: 'Belum Diungkapkan', k: 'red' },
};
