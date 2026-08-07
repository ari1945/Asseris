/* ============================================================
   Asseris — REGISTER JURNAL: pencarian, penyaringan, pengurutan
   PRD: docs/prd-aje-immutability-live-approvals.md (PR-6, temuan P2-f)
   ------------------------------------------------------------
   Register lama hanya punya empat tombol segmen (Semua/Posted/Usulan/Reklas).
   Memadai untuk lima jurnal seed; tidak untuk perikatan nyata dengan 80,
   tempat pertanyaan penelaah berbunyi "mana yang di atas PM", "mana yang
   belum tertaut SAD", "mana yang menunggu saya".

   Fungsi MURNI — logika penyaringan yang hidup di dalam komponen hanya dapat
   diuji lewat render, dan penyaringan yang salah menyembunyikan jurnal tanpa
   satu pun tanda bahwa ia disembunyikan.
   ============================================================ */

export interface AjeRegisterRow {
  id?: string;
  desc?: string;
  ref?: string;
  kind?: string;
  status?: string;
  amount?: number;
  pbt?: number;
  mis?: string | null;
  cycle?: string;
  std?: string;
  preparer?: string;
  proposedOn?: string | null;
  reverses?: string | null;
  dr?: string;
  cr?: string;
  lines?: readonly { code?: string; name?: string }[] | null;
}

/** Ambang materialitas yang dipakai pita nilai (Rp penuh). */
export interface AjeMaterialityBands { pm: number; ctt: number }

export type AjeBandKey = 'all' | 'above-pm' | 'pm-ctt' | 'below-ctt';
export type AjeSadKey = 'all' | 'linked' | 'unlinked';
export type AjeSortKey = 'id' | 'amount' | 'pbt' | 'status' | 'date';
export type AjeSortDir = 'asc' | 'desc';

export interface AjeRegisterFilter {
  q?: string;
  status?: string;        // 'all' | 'Posted' | 'Proposed'
  kind?: string;          // 'all' | 'adjusting' | 'reclass'
  band?: AjeBandKey;
  cycle?: string;         // 'all' | <nama siklus>
  sad?: AjeSadKey;
  preparer?: string;      // 'all' | <nama>
  owner?: string;         // 'all' | <nama pemilik langkah berjalan>
}

const t = (v: unknown) => String(v ?? '').trim();
const low = (v: unknown) => t(v).toLowerCase();

/** Teks yang dapat dicari dari sebuah baris — termasuk kode & nama akun. */
export function ajeSearchBlob(r: AjeRegisterRow): string {
  const accounts = Array.isArray(r.lines) && r.lines.length
    ? r.lines.map((l) => `${t(l && l.code)} ${t(l && l.name)}`).join(' ')
    : `${t(r.dr)} ${t(r.cr)}`;
  return low([r.id, r.desc, r.ref, r.cycle, r.std, r.mis, r.preparer, r.reverses, accounts].map(t).join(' '));
}

/** Pita materialitas sebuah jurnal berdasar NILAInya (bukan efek labanya). */
export function ajeBand(r: AjeRegisterRow, bands: AjeMaterialityBands): AjeBandKey {
  const v = Math.abs(Number(r.amount || 0));
  if (bands.pm > 0 && v >= bands.pm) return 'above-pm';
  if (bands.ctt > 0 && v >= bands.ctt) return 'pm-ctt';
  return 'below-ctt';
}

/**
 * Saring register. `ownerById` memetakan id jurnal → nama pemilik langkah
 * yang sedang berjalan (dari rantai persetujuan); tanpa peta itu filter
 * "pemilik" tak berlaku, bukan diam-diam mengosongkan hasil.
 */
export function filterAjeRows(
  rows: readonly AjeRegisterRow[],
  f: AjeRegisterFilter,
  ctx: { bands: AjeMaterialityBands; ownerById?: Record<string, string> },
): AjeRegisterRow[] {
  const q = low(f.q);
  const owners = ctx.ownerById || {};
  return rows.filter((r) => {
    if (q && !ajeSearchBlob(r).includes(q)) return false;
    if (f.status && f.status !== 'all' && t(r.status) !== f.status) return false;
    if (f.kind && f.kind !== 'all' && t(r.kind) !== f.kind) return false;
    if (f.band && f.band !== 'all' && ajeBand(r, ctx.bands) !== f.band) return false;
    if (f.cycle && f.cycle !== 'all' && t(r.cycle) !== f.cycle) return false;
    if (f.sad === 'linked' && !t(r.mis)) return false;
    if (f.sad === 'unlinked' && t(r.mis)) return false;
    if (f.preparer && f.preparer !== 'all' && t(r.preparer) !== f.preparer) return false;
    if (f.owner && f.owner !== 'all' && t(owners[t(r.id)]) !== f.owner) return false;
    return true;
  });
}

/* Urutan status yang bermakna bagi penelaah: yang masih bergerak lebih dulu. */
const STATUS_RANK: Record<string, number> = { Proposed: 0, Posted: 1 };

/** Urutkan register. Stabil: baris ber-kunci sama mempertahankan urutan asalnya. */
export function sortAjeRows(
  rows: readonly AjeRegisterRow[],
  key: AjeSortKey,
  dir: AjeSortDir = 'asc',
): AjeRegisterRow[] {
  const sign = dir === 'desc' ? -1 : 1;
  const val = (r: AjeRegisterRow): number | string => {
    switch (key) {
      case 'amount': return Math.abs(Number(r.amount || 0));
      case 'pbt': return Number(r.pbt || 0);
      case 'status': return STATUS_RANK[t(r.status)] ?? 9;
      case 'date': return t(r.proposedOn) || '';
      default: return t(r.id);
    }
  };
  return rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) => {
      const x = val(a.r), y = val(b.r);
      if (x < y) return -1 * sign;
      if (x > y) return 1 * sign;
      return a.i - b.i;              // stabil
    })
    .map((x) => x.r);
}

/** Nilai unik sebuah kolom, untuk mengisi pilihan filter. */
export function ajeDistinct(rows: readonly AjeRegisterRow[], pick: (r: AjeRegisterRow) => unknown): string[] {
  const set = new Set<string>();
  rows.forEach((r) => { const v = t(pick(r)); if (v) set.add(v); });
  return [...set].sort();
}
