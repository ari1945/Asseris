/* ============================================================
   Asseris — PR-4c · Saldo audited TA-1 sebagai sumber INDEPENDEN (SA 510)
   ------------------------------------------------------------
   Fungsi MURNI (tanpa efek samping, tanpa `any`).

   MASALAH yang ditutup: penelusuran saldo awal (`OBTrace` di modul `opening`) menyajikan
   kolom "Saldo Akhir TA-1 (Audited)" vs "Saldo Awal TA Kini" lalu menyimpulkan "Cocok"
   untuk setiap akun — padahal KEDUA kolom dibaca dari sumber yang sama (`r.ly`), kecuali
   segelintir akun transisi PSAK 73 yang di-hardcode. Selisihnya nol SECARA KONSTRUKSI:
   kertas kerja itu tak membuktikan apa pun. Label "TA Lalu (audited)" di WTB sama tak
   berdasarnya — apa pun yang di-paste klien menjadi basis seluruh analitis.

   SA 510 ¶6 menuntut bukti bahwa saldo awal tidak mengandung salah saji material dan
   dibawa dengan benar dari periode sebelumnya. Itu mensyaratkan pembanding di LUAR TB
   berjalan. Modul ini menyediakan tie-out terhadap sumber tersebut.
   ============================================================ */

export interface PriorYearRow {
  code: string;
  name?: string;
  /** saldo akhir audited TA-1 (Rp penuh, Dr + / Cr −) */
  amount: number;
}

export interface PriorYearSource {
  rows: PriorYearRow[];
  /** jejak asal (bentuk sama dgn ImportProvenance PR-2b) */
  provenance?: unknown;
}

export type TieStatus =
  | 'tied'          // saldo awal = saldo akhir audited TA-1
  | 'untied'        // ada sumber, tapi berbeda → SELISIH yang harus dijelaskan
  | 'missing'       // akun bersaldo awal, tak ada di sumber TA-1 → BELUM TERTELUSUR
  | 'orphan'        // akun ada di sumber TA-1, hilang dari TB berjalan
  | 'out-of-scope'  // akun laba-rugi — tak punya saldo awal untuk ditelusuri
  | 'nil-opening'   // saldo awal nol — tak ada yang dibawa dari TA-1
  | 'no-source';    // belum ada sumber TA-1 sama sekali

/* Kelompok posisi keuangan — LINGKUP penelusuran saldo awal (SA 510 ¶6).
   Akun laba-rugi tak punya saldo awal: `ly`-nya adalah AKTIVITAS periode lalu yang
   ditutup ke saldo laba, bukan saldo yang dibawa. Menandainya "tak ada di TA-1 audited"
   memproduksi pengecualian palsu yang menenggelamkan selisih sungguhan — pada satu TB
   demo 28 akun, 21 dari 22 penanda adalah derau semacam itu. */
export const SOFP_GROUPS = ['Aset Lancar', 'Aset Tidak Lancar', 'Liabilitas Jk. Pendek', 'Liabilitas Jk. Panjang', 'Ekuitas'];

/** Apakah baris masuk lingkup penelusuran saldo awal. Pakai `group` bila ada; selain itu
    jatuh ke awalan kode CoA (1/2/3 = posisi keuangan, 4/5 = laba rugi). */
export function isOpeningBalanceScope(row: { group?: string; code?: string }): boolean {
  if (row.group) return SOFP_GROUPS.includes(row.group);
  const head = (row.code || '').trim().charAt(0);
  return head === '1' || head === '2' || head === '3';
}

export interface TieRow {
  code: string;
  name: string;
  /** saldo akhir audited TA-1 dari sumber independen (null bila tak ada) */
  priorClose: number | null;
  /** saldo awal yang dibawa TB berjalan (kolom `ly`) */
  opening: number;
  diff: number;
  status: TieStatus;
}

export interface TieResult {
  rows: TieRow[];
  hasSource: boolean;
  tied: number;
  untied: number;
  missing: number;
  orphan: number;
  /** akun laba-rugi yang dilewati — di luar lingkup saldo awal */
  outOfScope: number;
  /** akun posisi keuangan bersaldo awal nol — tak ada yang dibawa */
  nilOpening: number;
  /** Σ |selisih| atas akun yang PUNYA pembanding tapi tak cocok (untied + orphan).
      Akun `missing` TIDAK masuk: saldonya bukan "selisih", melainkan nilai yang belum
      tertelusur — lihat `untracedTotal`. */
  totalDiff: number;
  /** Σ |saldo awal| yang tak punya pembanding di TA-1 sama sekali */
  untracedTotal: number;
}

export interface TieRowInput { code: string; name?: string; ly?: number; group?: string }

/**
 * Tie-out saldo awal TB berjalan terhadap sumber audited TA-1.
 * `tol` = ambang Rupiah di bawah mana selisih diabaikan (pembulatan penyajian).
 *
 * TANPA sumber, seluruh baris berstatus `no-source` — TIDAK dilaporkan "cocok".
 * Itu inti perbaikannya: ketiadaan bukti bukan bukti kecocokan.
 */
export function tieOutPriorYear(
  current: TieRowInput[],
  source: PriorYearSource | null | undefined,
  tol = 1000,
): TieResult {
  const src = (source && Array.isArray(source.rows)) ? source.rows : null;
  const hasSource = !!(src && src.length);
  const byCode = new Map<string, PriorYearRow>();
  if (src) for (const r of src) byCode.set(r.code, r);

  const rows: TieRow[] = [];
  let tied = 0, untied = 0, missing = 0, orphan = 0, outOfScope = 0, nilOpening = 0;
  let totalDiff = 0, untracedTotal = 0;

  for (const r of current) {
    const opening = r.ly || 0;
    /* Di luar lingkup dilaporkan apa adanya — bukan disembunyikan, tapi juga tak dihitung
       sebagai pengecualian dan tak diberi penanda peringatan oleh konsumen. */
    if (!isOpeningBalanceScope(r)) {
      outOfScope++;
      rows.push({ code: r.code, name: r.name || r.code, priorClose: null, opening, diff: 0, status: 'out-of-scope' });
      continue;
    }
    if (!hasSource) {
      rows.push({ code: r.code, name: r.name || r.code, priorClose: null, opening, diff: 0, status: 'no-source' });
      continue;
    }
    const p = byCode.get(r.code);
    if (!p) {
      /* Saldo awal nol tanpa pasangan di TA-1 bukan pengecualian: tak ada yang dibawa,
         tak ada yang perlu ditelusuri (mis. akun transisi PSAK 73 yang baru timbul). */
      if (Math.abs(opening) <= tol) {
        nilOpening++;
        rows.push({ code: r.code, name: r.name || r.code, priorClose: null, opening, diff: 0, status: 'nil-opening' });
        continue;
      }
      missing++;
      /* `diff` HANYA bermakna bila ada pembanding. Dulu di sini `diff = opening`, sehingga
         akun tak tertelusur muncul sebagai "selisih" sebesar saldonya di drawer WTB —
         sementara modul SA 510 menghitung sendiri dan menampilkan "—" untuk baris yang
         sama. Satu mesin, dua kertas kerja, dua angka. */
      rows.push({ code: r.code, name: r.name || r.code, priorClose: null, opening, diff: 0, status: 'missing' });
      untracedTotal += Math.abs(opening);
      continue;
    }
    const diff = opening - p.amount;
    if (Math.abs(diff) <= tol) {
      tied++;
      rows.push({ code: r.code, name: r.name || p.name || r.code, priorClose: p.amount, opening, diff: 0, status: 'tied' });
    } else {
      untied++;
      totalDiff += Math.abs(diff);
      rows.push({ code: r.code, name: r.name || p.name || r.code, priorClose: p.amount, opening, diff, status: 'untied' });
    }
  }

  /* akun yang ADA di TA-1 tapi hilang dari TB berjalan — saldo awal yang tak terbawa.
     Uji keberadaan memakai SELURUH kode TB (termasuk yang di luar lingkup), supaya akun
     laba-rugi yang ikut ter-paste tidak salah dilaporkan sebagai "hilang dari TB". */
  if (hasSource) {
    const currentCodes = new Set(current.map(r => r.code));
    for (const p of src as PriorYearRow[]) {
      if (currentCodes.has(p.code)) continue;
      if (!isOpeningBalanceScope(p)) continue;
      orphan++;
      totalDiff += Math.abs(p.amount);
      rows.push({ code: p.code, name: p.name || p.code, priorClose: p.amount, opening: 0, diff: -p.amount, status: 'orphan' });
    }
  }

  return { rows, hasSource, tied, untied, missing, orphan, outOfScope, nilOpening, totalDiff, untracedTotal };
}

/** Status tie satu akun — dipakai kolom "TA Lalu" di WTB. Menerima baris utuh agar
    penilaian lingkup memakai aturan yang SAMA dengan `tieOutPriorYear`. */
export function tieStatusFor(
  row: TieRowInput,
  source: PriorYearSource | null | undefined,
  tol = 1000,
): TieStatus {
  if (!isOpeningBalanceScope(row)) return 'out-of-scope';
  const src = (source && Array.isArray(source.rows)) ? source.rows : null;
  if (!src || !src.length) return 'no-source';
  const opening = row.ly || 0;
  const p = src.find(r => r.code === row.code);
  if (!p) return Math.abs(opening) <= tol ? 'nil-opening' : 'missing';
  return Math.abs(opening - p.amount) <= tol ? 'tied' : 'untied';
}

/** Status yang BUKAN pengecualian — konsumen tak memberi penanda peringatan untuk ini. */
export function isTieException(s: TieStatus): boolean {
  return s === 'untied' || s === 'missing' || s === 'orphan';
}

export const TIE_LABEL: Record<TieStatus, string> = {
  tied: 'Cocok dengan TA-1 audited',
  untied: 'SELISIH terhadap TA-1 audited',
  missing: 'Belum tertelusur ke TA-1 audited',
  orphan: 'Ada di TA-1, hilang dari TB berjalan',
  'out-of-scope': 'Laba rugi — di luar penelusuran saldo awal',
  'nil-opening': 'Saldo awal nol — tak ada yang dibawa',
  'no-source': 'Belum ada sumber TA-1 audited',
};
