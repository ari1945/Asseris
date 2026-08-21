import type { InvoiceRow } from './ams_types';

/* ============================================================
   Asseris — kanon register faktur (Billing & Invoicing).

   Logika murni di balik dokumen keuangan BERNOMOR: penomoran, transisi
   status, dan turunan piutang yang dibaca modul AP/AR, Pendapatan &
   Penagihan, serta pemicu keberlanjutan klien. Dipisah dari
   `view_pipeline.tsx` supaya dapat diuji tanpa DOM — modul yang menerbitkan
   tagihan ke klien ini sebelumnya punya NOL uji.

   Yang dicabut di sini:
   · nomor faktur dulu diturunkan dari PANJANG ARRAY
     (`'INV-2026-0' + (46 + invoices.length)`), sehingga satu baris hilang =
     nomor berikutnya menabrak nomor yang sudah terbit, tahunnya beku, dan
     formatnya pecah di atas 99;
   · pelunasan/pengiriman dulu tak membawa tanggal, sehingga aging piutang
     dan rekonsiliasi kas tak punya dasar.
   ============================================================ */

export interface InvoiceRecord extends InvoiceRow {
  /** Tanggal kirim ke klien (YYYY-MM-DD) — dari klok SSOT saat status → Sent. */
  sentAt?: string;
  /** Tanggal pelunasan (YYYY-MM-DD) — dari klok SSOT saat ditandai lunas. */
  paidAt?: string;
}

const DAY_MS = 864e5;
const ID_RE = /^INV-(\d{4})-(\d+)$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Milidetik UTC dari tanggal ISO; null bila bukan YYYY-MM-DD. UTC dipakai agar
    selisih hari tidak bergeser oleh zona waktu peramban. */
function utc(date: string): number | null {
  if (!ISO_RE.test(date || '')) return null;
  const t = Date.parse(date + 'T00:00:00Z');
  return Number.isNaN(t) ? null : t;
}

/** `INV-2026-045` → 45. Null untuk id di luar pola (tak ikut menentukan nomor). */
export function invoiceSeq(id: string): number | null {
  const m = ID_RE.exec(id || '');
  return m ? +m[2] : null;
}

/** Tahun pada id faktur; null bila di luar pola. */
export function invoiceYear(id: string): string | null {
  const m = ID_RE.exec(id || '');
  return m ? m[1] : null;
}

/**
 * Nomor faktur berikutnya.
 *
 * Urutan diturunkan dari nomor TERTINGGI yang pernah dipakai pada register
 * (bukan dari jumlah barisnya), sehingga menghapus/membatalkan satu faktur
 * tidak mendaur ulang nomor yang sudah terbit. Tahun datang dari klok SSOT.
 * Lebar minimum tiga digit dan tumbuh sendiri melewati 999.
 *
 * CATATAN KEBIJAKAN (menunggu keputusan Ari): urutan TIDAK di-reset per tahun
 * buku — meneruskan nomor tertinggi adalah pilihan minimal yang tak mungkin
 * menabrak; reset tahunan, urutan per-klien, atau prefiks firma adalah
 * kebijakan penomoran yang tidak boleh dikarang di sini.
 *
 * @param today klok SSOT (`AMS.TODAY`, YYYY-MM-DD). Bila tak terbaca, tahun
 *   jatuh ke tahun terakhir yang benar-benar dipakai register; bila register
 *   pun kosong, fungsi mengembalikan '' dan pemanggil WAJIB menolak menerbitkan
 *   faktur tanpa nomor.
 */
export function nextInvoiceId(register: InvoiceRecord[], today: string): string {
  const rows = register || [];
  const seqs = rows.map((r) => invoiceSeq(r.id)).filter((n): n is number => n != null);
  const next = (seqs.length ? Math.max(...seqs) : 0) + 1;

  const fromClock = /^\d{4}/.exec(today || '');
  const years = rows.map((r) => invoiceYear(r.id)).filter((y): y is string => y != null);
  const year = fromClock ? fromClock[0] : (years.length ? years.sort()[years.length - 1] : '');
  if (!year) return '';

  return 'INV-' + year + '-' + String(next).padStart(3, '0');
}

/** Faktur dikirim ke klien: status → Sent, membawa tanggal kirim. */
export function markInvoiceSent(inv: InvoiceRecord, today: string): InvoiceRecord {
  return { ...inv, status: 'Sent', sentAt: today };
}

/**
 * Faktur ditandai lunas: pelunasan PENUH, membawa tanggal pelunasan.
 *
 * Pembayaran PARSIAL (dan referensi/bukti banknya) sengaja TIDAK diputuskan di
 * sini — struktur data sudah mengandaikannya (`paid` terpisah, status
 * 'Partial' ada di seed), tetapi dari mana angka & buktinya berasal (modul ini
 * atau "Kas, Bank & Rekonsiliasi") adalah keputusan Ari. Lihat usulan B4.
 */
export function markInvoicePaid(inv: InvoiceRecord, today: string): InvoiceRecord {
  return { ...inv, paid: inv.amount, status: 'Paid', paidAt: today };
}

/** Selisih hari terbit → jatuh tempo; null bila salah satu tanggal tak terbaca. */
export function termDays(issued: string, due: string): number | null {
  const a = utc(issued), b = utc(due);
  if (a == null || b == null) return null;
  return Math.round((b - a) / DAY_MS);
}

/**
 * Termin kredit standar firma, DIBACA dari register (bukan diasumsikan).
 *
 * Dikembalikan hanya bila register menyatakannya tanpa ragu — satu termin
 * dominan tunggal. Bila register kosong atau terminnya seri, jawabannya
 * `null`: firma belum menyatakan kebijakan termin, dan mengarang jumlah hari
 * pada dokumen yang keluar ke klien lebih buruk daripada bertanya.
 */
export function standardTermDays(register: InvoiceRecord[]): number | null {
  const counts: Record<string, number> = {};
  (register || []).forEach((i) => {
    const t = termDays(i.issued, i.due);
    if (t == null || t < 0) return;
    counts[String(t)] = (counts[String(t)] || 0) + 1;
  });
  const entries = Object.entries(counts);
  if (!entries.length) return null;
  const top = Math.max(...entries.map(([, n]) => n));
  const winners = entries.filter(([, n]) => n === top);
  return winners.length === 1 ? +winners[0][0] : null;
}

/** Tanggal + n hari (ISO). '' bila tanggalnya tak terbaca. */
export function addDays(date: string, days: number): string {
  const t = utc(date);
  if (t == null) return '';
  return new Date(t + days * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Jatuh tempo default untuk faktur baru: tanggal terbit + termin standar firma.
 * '' bila register belum menyatakan termin — form lalu meminta pengguna
 * mengisinya (tombol "Terbitkan Faktur" tetap terkunci sampai diisi).
 */
export function defaultDueDate(issued: string, register: InvoiceRecord[]): string {
  const term = standardTermDays(register);
  if (term == null) return '';
  return addDays(issued, term);
}

/** Faktur yang sudah menjadi piutang: terbit (bukan Draft) dan belum lunas. */
export function arOpenInvoices(register: InvoiceRecord[]): InvoiceRecord[] {
  return (register || []).filter((i) => i.status !== 'Paid' && i.status !== 'Draft');
}

/** Piutang outstanding — Σ sisa tagihan faktur yang sudah terbit & belum lunas. */
export function arOutstanding(register: InvoiceRecord[]): number {
  return arOpenInvoices(register).reduce((s, i) => s + (i.amount - i.paid), 0);
}

/** Piutang yang melewati jatuh tempo — Σ sisa tagihan faktur berstatus Overdue. */
export function arOverdue(register: InvoiceRecord[]): number {
  return (register || [])
    .filter((i) => i.status === 'Overdue')
    .reduce((s, i) => s + (i.amount - i.paid), 0);
}

export interface InvoiceTotals {
  /** Σ nilai faktur yang sudah terbit (Draft belum menagih apa pun). */
  billed: number;
  /** Σ yang sudah dibayar klien. */
  collected: number;
  /** Sisa tagihan atas faktur terbit. */
  outstanding: number;
  /** Sisa tagihan yang melewati jatuh tempo. */
  overdue: number;
}

/** Headline KPI modul Billing — satu turunan, dipakai apa adanya oleh view. */
export function invoiceTotals(register: InvoiceRecord[]): InvoiceTotals {
  const rows = register || [];
  const billed = rows.filter((i) => i.status !== 'Draft').reduce((s, i) => s + i.amount, 0);
  const collected = rows.reduce((s, i) => s + i.paid, 0);
  return { billed, collected, outstanding: billed - collected, overdue: arOverdue(rows) };
}
