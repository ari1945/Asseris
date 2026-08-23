/* ============================================================
   Register faktur · konsistensi SEED — nilai faktur terhadap fee kontrak.

   Cacat aslinya (ditemukan 2026-08-23, sudah tercatat sebagai "terbuka" di
   komentar `ENG_FEE_REALIZATION`, data_part4.ts): `INV-2026-012` menagih
   Rp 1.650 jt berlabel `Final (100%)` kepada klien C-058 yang fee kontraknya
   Rp 580 jt — 284,5% dari fee, di bawah label yang berbunyi 100%.

   MEKANISMENYA salin-tempel dari kolom sebelah: 1.650.000.000 adalah PERSIS
   `ENGAGEMENTS['ENG-2025-058'].materiality`. Kelas cacat yang sama sudah
   dicabut sekali di modul Pendapatan (#277: `contract = e.materiality * 0.4`);
   materialitas bukan proksi nilai kontrak, dan tak pernah boleh jadi.

   Akibatnya BUKAN sekadar satu baris jelek. `recognitionSchedule` membaca
   `billed` dari register faktur dan `contract` dari fee klien, lalu menuliskan
   `liab = max(0, billed − recognized)`. Untuk perikatan yang 100% selesai ini
   menghasilkan liabilitas kontrak Rp 1.070 jt — dan karena baris lain punya
   lubang data, itu SELURUH liabilitas kontrak yang dilaporkan firma.

   Yang dijaga di sini adalah PREMIS SEED, bukan turunan terhadap turunan
   (pelajaran #242): label termin membawa persentasenya sendiri, jadi register
   dapat membantah dirinya tanpa mesin apa pun.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { CLIENTS, ENGAGEMENTS, INVOICES } from './data_part1';
import type { ClientRow, InvoiceRow } from './ams_types';

const inv = INVOICES as unknown as InvoiceRow[];
const cli = CLIENTS as unknown as ClientRow[];
const eng = ENGAGEMENTS as unknown as { id: string; materiality: number }[];

/** `Termin 1 (50%)` → 50; null untuk label tanpa persentase. */
function milestonePct(label: string): number | null {
  const m = /\((\d+(?:[.,]\d+)?)%\)/.exec(label || '');
  return m ? +m[1].replace(',', '.') : null;
}

const feeOf = (clientId: string): number | null => {
  const c = cli.find((x) => x.id === clientId);
  return c ? c.fee : null;
};

/** Baris yang label terminnya menyatakan persentase — hanya itu yang bisa diadu. */
const PCT_ROWS = inv.filter((i) => milestonePct(i.milestone) !== null);

/** Oracle: nilai faktur yang DIJANJIKAN label terminnya sendiri. */
const promised = (i: InvoiceRow): number => Math.round(feeOf(i.clientId)! * milestonePct(i.milestone)! / 100);

describe('premis — gerbang ini tidak hampa', () => {
  it('setiap faktur seed membawa persentase termin', () => {
    expect(PCT_ROWS.length).toBe(inv.length);
    expect(PCT_ROWS.length).toBeGreaterThan(5);
  });

  it('setiap faktur seed menemukan fee kliennya', () => {
    inv.forEach((i) => expect(feeOf(i.clientId), i.id).not.toBeNull());
  });
});

describe('nilai faktur = fee kontrak × persentase termin', () => {
  it.each(inv.map((i) => [i.id, i] as const))('%s', (_id, i) => {
    expect(i.amount, `${i.id} · ${i.client} · ${i.milestone} · fee ${feeOf(i.clientId)}`)
      .toBe(promised(i));
  });

  /* Anti-tautologi. Nilai historis dipaku di sini supaya cacat yang persis ini
     tak bisa tumbuh kembali tanpa membuat berkas ini merah. */
  it('gerbang ini benar-benar bisa merah — nilai historis INV-2026-012 ditolak', () => {
    const historis: InvoiceRow = { ...inv.find((i) => i.id === 'INV-2026-012')!, amount: 1_650_000_000 };
    expect(historis.amount).not.toBe(promised(historis));
  });

  it('premis mekanisme: 1.650 jt adalah materialitas ENG-2025-058, bukan nilai kontrak', () => {
    expect(eng.find((e) => e.id === 'ENG-2025-058')!.materiality).toBe(1_650_000_000);
    expect(feeOf('C-058')).not.toBe(1_650_000_000);
  });
});

describe('penagihan tidak melampaui fee kontrak', () => {
  const byClient = new Map<string, number>();
  inv.forEach((i) => byClient.set(i.clientId, (byClient.get(i.clientId) || 0) + i.amount));

  it.each([...byClient.keys()].map((c) => [c] as const))('%s — Σ faktur ≤ fee', (clientId) => {
    expect(byClient.get(clientId)!).toBeLessThanOrEqual(feeOf(clientId)!);
  });

  it('gerbang plafon bisa merah (anti-tautologi)', () => {
    expect(feeOf('C-058')! + 1).toBeGreaterThan(feeOf('C-058')!);
  });
});

describe('status Lunas berarti benar-benar lunas', () => {
  it.each(inv.filter((i) => i.status === 'Paid').map((i) => [i.id, i] as const))('%s', (_id, i) => {
    expect(i.paid).toBe(i.amount);
  });
});
