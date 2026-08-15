import React from 'react';
import { useAmsPersist } from './contexts';
import { AMS } from './data';

/* ============================================================
   Asseris — useBankRecon: SATU PINTU baris rekonsiliasi bank.

   PRD cash-bank-reconciliation-register 2026-08-15.

   Status `matched` tiap baris menentukan mana yang masih menjadi item rekonsiliasi
   terbuka — dan lewat `FIRMFIN.bankRecon()/cash()` ia menentukan `residual` baris Kas,
   yang menentukan apakah ekspor Laporan Keuangan terkunci. Karena itu overrides-nya
   TIDAK boleh berhenti di modul Treasury: ia harus disalurkan ke ctx FIRMFIN, persis
   seperti `useFirmCoa` menyalurkan COA turunan-ledger (#241). Kalau tidak, mencocokkan
   satu baris di layar Rekonsiliasi Bank tak menggeser apa pun di Firm Finance —
   kelas cacat "tombol yang berhenti di batas modulnya" yang sudah tiga kali dicabut.

   Cache localStorage bisa TERTINGGAL di belakang seed (gotcha `mergeSeedJournals`
   #243: kunci `firmgl` basi membuat Pendapatan anjlok diam-diam). Baris seed yang
   hilang karena itu digabungkan kembali; suntingan pengguna atas baris yang ADA
   dipertahankan.
   ============================================================ */

export interface BankReconLine {
  id: string;
  account: string;
  date?: string;
  desc?: string;
  amount: number;
  matched?: boolean;
  ref?: string;
}

interface BankReconSeed { account: string; period: string; lines: Omit<BankReconLine, 'account'>[] }

/** Baris seed sebagai daftar datar, tiap baris membawa rekeningnya. */
export function seedReconLines(): BankReconLine[] {
  const regs = (AMS.BANK_RECONS || []) as unknown as BankReconSeed[];
  return regs.flatMap((r) => (r.lines || []).map((l) => ({ ...l, account: r.account })));
}

/** Gabungkan baris seed yang HILANG, dan segarkan yang BERUBAH.
 *  Aturannya sama dengan `mergeSeedJournals`: satu-satunya field yang dapat disunting
 *  pengguna adalah `matched` (klik baris). Isi barisnya — jumlah, tanggal, rekening,
 *  jenis item — hanya berasal dari seed. Cache lama karena itu tak boleh memenangkan
 *  nilai yang sudah berubah; kalau boleh, item rekonsiliasi basi diam-diam membuat
 *  rekening tampak menutup padahal tidak. */
export function mergeSeedReconLines(stored: BankReconLine[], seed: BankReconLine[]): BankReconLine[] {
  const seedById = new Map((seed || []).map((l) => [l.id, l]));
  const have = new Set((stored || []).map((l) => l.id));
  const isStale = (l: BankReconLine, s: BankReconLine) =>
    l.amount !== s.amount || l.ref !== s.ref || l.date !== s.date
    || l.desc !== s.desc || l.account !== s.account;
  const missing = (seed || []).filter((l) => !have.has(l.id));
  const stale = (stored || []).some((l) => {
    const s = seedById.get(l.id);
    return !!s && isStale(l, s);
  });
  if (!missing.length && !stale) return stored || [];
  const refreshed = (stored || []).map((l) => {
    const s = seedById.get(l.id);
    return s ? { ...s, matched: l.matched } : l;
  });
  return [...refreshed, ...missing];
}

export interface BankReconResult {
  lines: BankReconLine[];
  setLines: (f: unknown) => void;
  healed: boolean;
}

export function useBankRecon(): BankReconResult {
  const seed = React.useMemo(() => seedReconLines(), []);
  const [stored, setLines] = useAmsPersist('bankrecon', () => seedReconLines()) as [BankReconLine[], (f: unknown) => void];
  /* Anotasi eksplisit: `React.useMemo` di repo ini untyped → tanpa ini `lines` jadi `any`. */
  const lines: BankReconLine[] = React.useMemo(() => mergeSeedReconLines(stored, seed), [stored, seed]);
  return { lines, setLines, healed: lines.length !== (stored || []).length };
}
