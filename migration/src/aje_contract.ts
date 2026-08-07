/* ============================================================
   Asseris — KONTRAK JURNAL PENYESUAIAN (AJE)
   PRD: docs/prd-aje-immutability-live-approvals.md
   ------------------------------------------------------------
   Modul MURNI: tanpa React, tanpa `window`, tanpa DOM. Ia diimpor oleh
   KEDUANYA — UI klien dan `server/src/signoff.ts` lintas paket — dengan pola
   yang sama seperti `rbac`. Setiap simbol di sini karenanya harus tetap dapat
   dijalankan di Node tanpa lingkungan browser.

   Cacat yang ditutup PR-1 (probe di PRD Lampiran A.1): `guardSignoffWrite`
   hanya mem-DIFF STATUS jurnal. Isi di luar status tak pernah diperiksa,
   sehingga sebuah tulisan `state.set` dapat mengganti NILAI dan KEDUA AKUN
   sebuah jurnal yang sudah berstatus `Posted` — jurnal tetap `Posted`, rantai
   persetujuan lama tetap tertera lengkap dengan nama & tanggal Rekan
   Perikatan, dan baris barunya mengalir ke WTB lewat `userPostDeltas`.
   Itu memindahkan tanda tangan Partner ke dokumen yang berbeda.

   Mekanisme intinya satu: HASH ISI JURNAL.
     1. Jurnal `Posted` yang hash-nya berubah = DITOLAK (aturan, bukan
        otoritas — tak ada kapabilitas yang dapat memuaskannya).
     2. Setiap keputusan persetujuan membawa hash versi yang disetujuinya,
        sehingga keputusan atas versi lama GUGUR secara turunan (PR-2).
   Aturan 2 ada karena keputusan hidup di StateDoc yang BERBEDA dari ledger
   (`approvals_ov_v4` vs `aje`): pembatalan lintas-dokumen tak dapat dijamin
   atomik, jadi ia harus menjadi turunan — tak ada tulisan yang perlu
   berhasil agar persetujuan gugur.
   ============================================================ */

/** Baris jurnal ternormalisasi — hanya kode & angka yang mengikat. */
export interface AjeContractLine {
  code?: string;
  name?: string;
  debit?: number | string;
  credit?: number | string;
}

/** Bentuk jurnal seperti yang benar-benar tersimpan di ledger `aje`. Sengaja
 *  longgar (`Partial`-like): seed memakai `dr`/`cr` string, entri buatan
 *  auditor memakai `lines[]`, dan keduanya harus menghasilkan hash yang sama
 *  bila jurnalnya memang sama. */
export interface AjeContractEntry {
  id?: string;
  status?: string;
  desc?: string;
  ref?: string;
  kind?: string;
  amount?: number;
  mis?: string | null;
  misNoneReason?: string | null;
  assertions?: readonly string[] | null;
  effectiveDate?: string | null;
  /** Waktu pengajuan jurnal (ISO / 'YYYY-MM-DD HH:mm'). Milik JURNAL sejak PR-3 —
   *  dulu hanya ada di tabel metadata sebuah view, sementara antrean memakai
   *  konstanta untuk semua jurnal. Di luar hash: ia fakta pengajuan, bukan isi. */
  proposedOn?: string | null;
  evidenceSource?: string | null;
  dmsLink?: string | null;
  preparer?: string | null;
  reverses?: string | null;
  dr?: string;
  cr?: string;
  lines?: readonly AjeContractLine[] | null;
}

/** Nilai numerik yang toleran terhadap string ('620000000') & null. */
function num(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
}

function str(v: unknown): string {
  return v == null ? '' : String(v);
}

/** Kode akun dari sisi `dr`/`cr` gaya seed ('5-3100 Beban Umum' → '5-3100'). */
function codeOf(side: unknown): string {
  return str(side).split(' ')[0] || '';
}

/**
 * Baris jurnal ternormalisasi, apa pun bentuk simpanannya.
 * Entri seed (`dr`/`cr` + `amount`) dan entri buatan auditor (`lines[]`)
 * menghasilkan bentuk yang SAMA — itulah syarat agar hash tidak berubah hanya
 * karena representasinya berpindah.
 */
export function ajeNormalizedLines(a: AjeContractEntry | null | undefined): AjeContractLine[] {
  if (!a) return [];
  if (Array.isArray(a.lines) && a.lines.length) {
    return a.lines.map((l) => ({
      code: str(l && l.code),
      name: str(l && l.name),
      debit: num(l && l.debit),
      credit: num(l && l.credit),
    }));
  }
  if (!a.dr && !a.cr) return [];
  const amt = num(a.amount);
  return [
    { code: codeOf(a.dr), name: str(a.dr).split(' ').slice(1).join(' ') || str(a.dr), debit: amt, credit: 0 },
    { code: codeOf(a.cr), name: str(a.cr).split(' ').slice(1).join(' ') || str(a.cr), debit: 0, credit: amt },
  ];
}

/* FNV-1a 32-bit, dijalankan dua kali dengan offset-basis berbeda lalu
   digabung → 16 hex. Deterministik, sinkron, tanpa dependensi: klien dan
   server WAJIB menghitung nilai yang identik, jadi tak boleh ada
   `crypto.subtle` (async, hanya browser) maupun `node:crypto` (hanya server). */
function fnv1a(s: string, basis: number): number {
  let h = basis >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    /* h *= 16777619 dalam aritmetika 32-bit tanpa kehilangan presisi float */
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

function hex8(n: number): string {
  return (n >>> 0).toString(16).padStart(8, '0');
}

/**
 * Serialisasi KANONIK atas isi jurnal yang mengikat persetujuan.
 *
 * `status` SENGAJA di luar: memposting mengubah status, dan itu memang aksi
 * yang sah — yang tak boleh berubah adalah APA yang disetujui, bukan di mana
 * ia berada dalam rantai. `name` baris juga di luar (label kosmetik yang ikut
 * berubah saat CoA di-relabel), sedangkan kode & angka masuk.
 *
 * Baris diurutkan agar penulisan ulang dalam urutan berbeda tidak dianggap
 * jurnal yang berbeda.
 */
export function ajeCanonicalContent(a: AjeContractEntry | null | undefined): string {
  const e = a || {};
  const lines = ajeNormalizedLines(e)
    .map((l) => `${str(l.code)}:${num(l.debit)}:${num(l.credit)}`)
    .sort();
  const assertions = Array.isArray(e.assertions) ? [...e.assertions].map(str).sort() : [];
  return [
    str(e.id),
    str(e.desc),
    str(e.ref),
    str(e.kind),
    String(num(e.amount)),
    str(e.mis),
    str(e.misNoneReason),
    assertions.join(','),
    str(e.effectiveDate),
    str(e.evidenceSource),
    str(e.dmsLink),
    str(e.preparer),
    str(e.reverses),
    lines.join(';'),
  ].join('|');
}

/**
 * Sidik jari isi jurnal (16 hex). Dua jurnal ber-hash sama adalah jurnal yang
 * sama bagi rantai persetujuan; hash yang berubah = yang disetujui bukan lagi
 * yang tersimpan.
 */
export function ajeContentHash(a: AjeContractEntry | null | undefined): string {
  const s = ajeCanonicalContent(a);
  return hex8(fnv1a(s, 0x811c9dc5)) + hex8(fnv1a(s + '' + s.length, 0x01000193));
}

/* ============================================================
   IMUTABILITAS JURNAL POSTED
   ============================================================ */

export interface AjeImmutabilityViolation {
  id: string;
  was: string;
  now: string;
  prevHash: string;
  nextHash: string;
}

function indexById(v: unknown): Record<string, AjeContractEntry> {
  const m: Record<string, AjeContractEntry> = {};
  if (Array.isArray(v)) {
    for (const x of v) {
      const e = x as AjeContractEntry | null;
      if (e && e.id != null) m[String(e.id)] = e;
    }
  }
  return m;
}

/**
 * Jurnal `Posted` yang isinya berubah sementara statusnya TETAP `Posted`.
 *
 * Ini deteksi, bukan otorisasi: pemanggil (server) menolaknya untuk SETIAP
 * peran — Rekan Pemimpin sekalipun. Koreksi atas jurnal yang sudah diposting
 * dilakukan lewat pembalikan (`reverseEntryFrom`), bukan penulisan ulang,
 * karena angka lama sudah mengalir ke WTB, SAD, materialitas, dan opini:
 * fakta bahwa ia pernah ada tak boleh dapat dihapus.
 *
 * Transisi status (post/unpost) TIDAK dilaporkan di sini — itu urusan
 * kapabilitas `AJE_POST` yang sudah ditegakkan terpisah.
 */
export function ajeImmutabilityViolations(prev: unknown, next: unknown): AjeImmutabilityViolation[] {
  const p = indexById(prev);
  const n = indexById(next);
  const out: AjeImmutabilityViolation[] = [];
  for (const id of Object.keys(n)) {
    const was = p[id];
    if (!was) continue;
    const wasStatus = str(was.status);
    const nowStatus = str(n[id].status);
    if (wasStatus !== 'Posted' || nowStatus !== 'Posted') continue;
    const prevHash = ajeContentHash(was);
    const nextHash = ajeContentHash(n[id]);
    if (prevHash !== nextHash) out.push({ id, was: wasStatus, now: nowStatus, prevHash, nextHash });
  }
  return out;
}

/* ============================================================
   PEMBALIKAN (koreksi jurnal Posted)
   ============================================================ */

export interface ReverseOptions {
  /** Id jurnal balik. Pemanggil yang tahu penomoran ledger-nya. */
  id: string;
  /** Alasan koreksi — WAJIB: pembalikan tanpa alasan bukan jejak audit. */
  reason: string;
  /** Penyusun jurnal balik (dari sesi, bukan default seed). */
  preparer?: string | null;
  /** Tanggal efektif pembalikan (ISO). Default: mengikuti jurnal asal. */
  effectiveDate?: string | null;
}

/**
 * Jurnal balik atas `a`: debit↔kredit ditukar, jurnal ASAL tidak disentuh.
 *
 * Ia lahir `Proposed` — pembalikan adalah usulan yang menempuh rantai
 * persetujuan yang sama, bukan jalan pintas untuk membatalkan keputusan
 * partner. Setelah keduanya `Posted`, efek netonya nol dan register
 * memperlihatkan pasangannya (`reverses`), bukan satu jurnal yang berubah
 * diam-diam.
 */
export function reverseEntryFrom(a: AjeContractEntry, opts: ReverseOptions): AjeContractEntry {
  const lines = ajeNormalizedLines(a).map((l) => ({
    code: str(l.code),
    name: str(l.name),
    debit: num(l.credit),
    credit: num(l.debit),
  }));
  return {
    id: opts.id,
    status: 'Proposed',
    desc: `Pembalikan ${str(a.id)} — ${opts.reason}`,
    ref: str(a.ref),
    kind: str(a.kind) || 'adjusting',
    amount: num(a.amount),
    mis: a.mis ?? null,
    assertions: Array.isArray(a.assertions) ? [...a.assertions] : null,
    effectiveDate: opts.effectiveDate ?? a.effectiveDate ?? null,
    evidenceSource: a.evidenceSource ?? null,
    preparer: opts.preparer ?? null,
    reverses: str(a.id),
    lines,
  };
}

/** Jurnal ini adalah pembalikan atas jurnal lain? */
export function isReversal(a: AjeContractEntry | null | undefined): boolean {
  return !!(a && a.reverses);
}

/**
 * Id jurnal berikutnya: satu di atas sufiks numerik TERTINGGI yang ada.
 *
 * `addAje` dulu memakai `list.length + 1`, yang menghasilkan id GANDA begitu
 * sebuah entri pernah dihapus (5 entri dengan id tertinggi AJE-06 → id baru
 * 'AJE-06' lagi). Id ganda pada ledger yang di-index-by-id berarti dua jurnal
 * berbagi satu rantai persetujuan — dan satu di antaranya menghilang dari peta.
 */
export function nextAjeId(list: readonly AjeContractEntry[] | null | undefined, prefix = 'AJE-'): string {
  let max = 0;
  for (const a of list || []) {
    const m = /(\d+)\s*$/.exec(str(a && a.id));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return prefix + String(max + 1).padStart(2, '0');
}
