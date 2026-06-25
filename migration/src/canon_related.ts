/* ============================================================
   Asseris — Pihak Berelasi (SA 550 / PSAK 7) sebagai SUMBER
   KEBENARAN TUNGGAL + mesin scan-rekonsiliasi kelengkapan.
   ------------------------------------------------------------
   Modul ini:
     1. Memegang REGISTRI kanonik pihak berelasi (RP_PARTIES) dan
        register transaksi terungkap (RP_TXN). Sebelumnya dimiliki
        oleh view_related.tsx (hardcode) lalu dikonsumsi
        view_forensic via window — kini satu sumber, di-dual-publish
        ke window oleh view (kompatibilitas legacy dipertahankan).
     2. Menyediakan scanRelatedParties(): merekonsiliasi register
        RPT terhadap POPULASI JURNAL kanonik (forensic_canon
        JOURNAL_POP, entri ber-rpId) untuk menguji KELENGKAPAN —
        inti risiko SA 550 ¶15-17/¶22: RPT tak tercatat / tak
        diungkapkan. Murni & deterministik; tanpa React/efek-samping.

   Pencocokan jurnal↔register: UTAMA via rpId + nilai (toleransi
   Rp 1 jt, selaras tie-out arus kas forensik); nama hanya fallback
   ternormalisasi (sinyal sekunder, hindari false-positive).
   ============================================================ */

export type RpRisk = 'High' | 'Medium' | 'Low';

export interface RelatedParty {
  /** id registri, mis. 'RP-01' */
  id: string;
  name: string;
  /** sifat hubungan, mis. 'Entitas Induk' */
  rel: string;
  /** uraian sifat hubungan */
  nature: string;
  risk: RpRisk;
}

export interface RptTransaction {
  /** id transaksi register, mis. 'T-01' */
  id: string;
  /** tautan ke RelatedParty.id (untuk pencocokan jurnal yang andal) */
  rpId?: string;
  party: string;
  type: string;
  amount: number;
  terms: string;
  /** apakah wajar/arm's-length */
  arm: boolean;
  /** apakah telah diungkapkan dalam CALK (PSAK 7) */
  disclosed: boolean;
  /** asersi terkait (vocab Inggris lama; diresolusi di canon_assertions) */
  assertion: string;
  /** harga pasar wajar bila telah diuji */
  market?: number;
}

/** Subset baris jurnal yang dibutuhkan scan (kompatibel forensic_canon JournalEntry). */
export interface LedgerEntry {
  id: string;
  amount: number;
  rpId?: string;
  party?: string;
  date?: string;
  note?: string;
  dr?: string;
  cr?: string;
}

/* ---- Registri kanonik pihak berelasi (SA 550 / PSAK 7) ---- */
export const RP_PARTIES: RelatedParty[] = [
  { id: 'RP-01', name: 'PT Sentosa Holding', rel: 'Entitas Induk', nature: 'Pengendali langsung 68%', risk: 'High' },
  { id: 'RP-02', name: 'PT Makmur Properti', rel: 'Entitas Afiliasi', nature: 'Sepengendali (common control)', risk: 'High' },
  { id: 'RP-03', name: 'PT Sentosa Logistik', rel: 'Entitas Anak', nature: 'Kepemilikan 99%', risk: 'Medium' },
  { id: 'RP-04', name: 'Budi Santoso (Dir. Utama)', rel: 'Manajemen Kunci', nature: 'Personil manajemen kunci', risk: 'Medium' },
  { id: 'RP-05', name: 'CV Mitra Keluarga', rel: 'Dikendalikan KMP', nature: 'Dimiliki keluarga komisaris', risk: 'High' },
];

/* ---- Register transaksi pihak berelasi terungkap manajemen ----
   rpId menautkan ke RP_PARTIES agar rekonsiliasi ledger andal. */
export const RP_TXN: RptTransaction[] = [
  { id: 'T-01', rpId: 'RP-01', party: 'PT Sentosa Holding', type: 'Pinjaman diterima', amount: 5_600_000_000, terms: 'Bunga 6% (pasar 9%)', arm: false, disclosed: true, assertion: 'Valuation' },
  { id: 'T-02', rpId: 'RP-02', party: 'PT Makmur Properti', type: 'Sewa gudang dibayar', amount: 2_160_000_000, terms: 'Setara harga pasar', arm: true, disclosed: true, assertion: 'Occurrence' },
  { id: 'T-03', rpId: 'RP-03', party: 'PT Sentosa Logistik', type: 'Jasa distribusi', amount: 4_320_000_000, terms: 'Cost-plus 8%', arm: true, disclosed: true, assertion: 'Accuracy' },
  { id: 'T-04', rpId: 'RP-02', party: 'PT Makmur Properti', type: 'Penjualan barang', amount: 1_850_000_000, terms: 'Diskon 22% di atas normal', arm: false, disclosed: false, assertion: 'Occurrence' },
  { id: 'T-05', rpId: 'RP-04', party: 'Budi Santoso (Dir. Utama)', type: 'Remunerasi & bonus', amount: 3_200_000_000, terms: 'Sesuai kontrak kerja', arm: true, disclosed: true, assertion: 'Completeness' },
  { id: 'T-06', rpId: 'RP-05', party: 'CV Mitra Keluarga', type: 'Pembelian bahan baku', amount: 2_780_000_000, terms: 'Harga 12% di atas pasar', arm: false, disclosed: false, assertion: 'Valuation' },
];

/* ---- helper murni ---- */
const AMOUNT_TOL = 1_000_000; // Rp 1 jt — selaras toleransi tie-out forensik

function norm(s: string | undefined): string {
  return (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Resolusi rpId sebuah baris register: eksplisit dulu, fallback nama→registri. */
function registerRpId(t: RptTransaction, byName: Map<string, string>): string | undefined {
  return t.rpId || byName.get(norm(t.party));
}

/* ---- bentuk hasil scan ---- */
export type LedgerGapReason = 'unrecorded' | 'undisclosed';

export interface RpMatch {
  txnId: string;
  journalId: string;
  rpId: string;
  amount: number;
  disclosed: boolean;
  arm: boolean;
}

export interface LedgerGap {
  journalId: string;
  rpId: string;
  party: string;
  amount: number;
  /** 'unrecorded' = tak ada di register (gap kelengkapan); 'undisclosed' = ada di register tapi belum diungkap */
  reason: LedgerGapReason;
  /** id transaksi register yang cocok (untuk reason 'undisclosed') */
  txnId?: string;
  date?: string;
  note?: string;
}

export interface UnsupportedRegister {
  txnId: string;
  rpId?: string;
  party: string;
  amount: number;
  disclosed: boolean;
}

export interface RpScanRollup {
  parties: number;
  /** total nilai register RPT */
  exposure: number;
  nonArm: number;
  undisclosed: number;
  /** jurnal pihak berelasi tanpa match register terungkap */
  ledgerGaps: number;
  unrecorded: number;
  unsupportedRegister: number;
  /** nilai eksposur jurnal pihak berelasi (subset ber-rpId) */
  ledgerRpExposure: number;
}

export interface RpScanResult {
  matched: RpMatch[];
  /** jurnal ke pihak berelasi tanpa entri register yang TELAH diungkap */
  ledgerGaps: LedgerGap[];
  /** entri register tanpa dukungan jejak jurnal */
  unsupportedRegister: UnsupportedRegister[];
  rollup: RpScanRollup;
}

/* ============================================================
   scanRelatedParties — rekonsiliasi register ↔ populasi jurnal.

   Untuk tiap jurnal ber-rpId (aktivitas pihak berelasi di buku):
     · cari register txn dengan rpId sama & nilai dalam toleransi
     · match + register.disclosed  → tercakup (matched)
     · match + register tak diungkap → ledgerGap reason 'undisclosed'
     · tak ada match                → ledgerGap reason 'unrecorded'
   Untuk tiap register txn: bila tak ada jurnal pendukung ber-rpId
   yang nilainya cocok → unsupportedRegister.
   ============================================================ */
export function scanRelatedParties(input: {
  parties: RelatedParty[];
  register: RptTransaction[];
  journal: LedgerEntry[];
}): RpScanResult {
  const { parties, register, journal } = input;
  const validRp = new Set(parties.map(p => p.id));
  const byName = new Map<string, string>();
  parties.forEach(p => byName.set(norm(p.name), p.id));

  // register terindeks per rpId (resolusi rpId eksplisit/fallback nama)
  const regResolved = register.map(t => ({ t, rpId: registerRpId(t, byName) }));

  // hanya jurnal yang menyentuh pihak berelasi terdaftar
  const rpJournal = journal.filter(j => j.rpId && validRp.has(j.rpId));

  const matched: RpMatch[] = [];
  const ledgerGaps: LedgerGap[] = [];
  const usedTxn = new Set<string>();

  for (const j of rpJournal) {
    const candidates = regResolved.filter(r => r.rpId === j.rpId && !usedTxn.has(r.t.id));
    const hit = candidates.find(r => Math.abs(r.t.amount - j.amount) <= AMOUNT_TOL);
    if (!hit) {
      ledgerGaps.push({ journalId: j.id, rpId: j.rpId!, party: j.party || partyName(parties, j.rpId!), amount: j.amount, reason: 'unrecorded', date: j.date, note: j.note });
      continue;
    }
    usedTxn.add(hit.t.id);
    if (hit.t.disclosed) {
      matched.push({ txnId: hit.t.id, journalId: j.id, rpId: j.rpId!, amount: j.amount, disclosed: true, arm: hit.t.arm });
    } else {
      matched.push({ txnId: hit.t.id, journalId: j.id, rpId: j.rpId!, amount: j.amount, disclosed: false, arm: hit.t.arm });
      ledgerGaps.push({ journalId: j.id, rpId: j.rpId!, party: hit.t.party, amount: j.amount, reason: 'undisclosed', txnId: hit.t.id, date: j.date, note: j.note });
    }
  }

  // register tanpa jejak jurnal ber-rpId yang nilainya cocok
  const matchedTxnIds = new Set(matched.map(m => m.txnId));
  const unsupportedRegister: UnsupportedRegister[] = regResolved
    .filter(r => !matchedTxnIds.has(r.t.id))
    .map(r => ({ txnId: r.t.id, rpId: r.rpId, party: r.t.party, amount: r.t.amount, disclosed: r.t.disclosed }));

  const rollup: RpScanRollup = {
    parties: parties.length,
    exposure: register.reduce((s, t) => s + t.amount, 0),
    nonArm: register.filter(t => !t.arm).length,
    undisclosed: register.filter(t => !t.disclosed).length,
    ledgerGaps: ledgerGaps.length,
    unrecorded: ledgerGaps.filter(g => g.reason === 'unrecorded').length,
    unsupportedRegister: unsupportedRegister.length,
    ledgerRpExposure: rpJournal.reduce((s, j) => s + j.amount, 0),
  };

  return { matched, ledgerGaps, unsupportedRegister, rollup };
}

function partyName(parties: RelatedParty[], rpId: string): string {
  const p = parties.find(x => x.id === rpId);
  return p ? p.name : rpId;
}

export const LEDGER_GAP_META: Record<LedgerGapReason, { l: string; k: string; hint: string }> = {
  unrecorded: { l: 'Tak Tercatat di Register', k: 'red', hint: 'Aktivitas pihak berelasi terbukti di buku besar namun tak ada di daftar RPT manajemen — potensi RPT tak terungkap (SA 550 ¶15-17).' },
  undisclosed: { l: 'Belum Diungkapkan', k: 'amber', hint: 'Transaksi tercatat di register namun belum diungkapkan dalam CALK (PSAK 7).' },
};
