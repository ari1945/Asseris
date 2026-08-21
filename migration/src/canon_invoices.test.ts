/* ============================================================
   Modul `billing` — gerbang kanon register faktur.

   Modul ini menerbitkan dokumen keuangan BERNOMOR ke klien dan sampai hari
   ini punya NOL uji. Yang dipaku di sini adalah tiga hal yang tak boleh
   bergantung pada nasib:
     · nomor faktur tak pernah menabrak nomor yang sudah pernah terbit;
     · menandai lunas menggerakkan angka yang DIBACA modul AP/AR;
     · pelunasan & pengiriman membawa tanggal (dasar aging piutang).
   ============================================================ */
import { describe, expect, it } from 'vitest';
import {
  arOutstanding, arOverdue, defaultDueDate, markInvoicePaid, markInvoiceSent,
  nextInvoiceId, standardTermDays,
} from './canon_invoices';
import type { InvoiceRecord } from './canon_invoices';
import { AMS } from './data';
import './data_platform';   // efek samping: memasang AMS.PLATFORM (IIFE)
import { INVOICES } from './data_part1';

interface ApprovalItem { id: string; kind: string; sourceId: string; status: string }
const PLATFORM = (AMS as unknown as {
  PLATFORM: { buildApprovals: (ctx: unknown) => ApprovalItem[] };
}).PLATFORM;

const SEED = INVOICES as InvoiceRecord[];
const TODAY = '2026-03-09';

const inv = (over: Partial<InvoiceRecord> = {}): InvoiceRecord => ({
  id: 'INV-2026-001', clientId: 'C-001', client: 'PT Uji', eng: 'ENG-2025-001',
  issued: '2026-01-05', due: '2026-02-04', amount: 100_000_000, paid: 0,
  status: 'Draft', milestone: 'Termin 1 (50%)', ...over,
});

/* Terbitkan `n` faktur berturut-turut lewat pintu penomoran, seperti yang
   dilakukan tombol "Terbitkan Faktur". */
function issueMany(start: InvoiceRecord[], n: number, today = TODAY): InvoiceRecord[] {
  let reg = start;
  for (let i = 0; i < n; i++) reg = [inv({ id: nextInvoiceId(reg, today) }), ...reg];
  return reg;
}

describe('B1 — nomor faktur tak dapat menabrak nomor yang sudah terbit', () => {
  it('nomor berikutnya melampaui nomor TERTINGGI, bukan jumlah baris', () => {
    /* Seed tertinggi = INV-2026-045; jumlah barisnya 7. Formula lama
       (46 + panjang) kebetulan cocok pada keadaan seed — itulah yang membuat
       cacat ini tak terlihat sampai satu baris hilang. */
    expect(nextInvoiceId(SEED, TODAY)).toBe('INV-2026-046');
  });

  it('faktur yang DIHAPUS dari register tidak mendaur ulang nomornya', () => {
    const afterIssue = issueMany(SEED, 1);            // + INV-2026-046
    const issued = afterIssue[0].id;
    /* Hapus satu baris LAIN (mis. draft dibatalkan), lalu terbitkan lagi. */
    const afterDelete = afterIssue.filter((x) => x.id !== 'INV-2026-045');
    const next = nextInvoiceId(afterDelete, TODAY);
    expect(next).not.toBe(issued);
    expect(afterDelete.some((x) => x.id === next)).toBe(false);
  });

  it('50 penerbitan berturut-turut menghasilkan 50 nomor UNIK (lewat 99)', () => {
    const reg = issueMany(SEED, 50);
    const ids = reg.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('format tidak pecah saat melewati 99 — tiga digit, tanpa nol tambahan', () => {
    const reg = issueMany(SEED, 60);                  // 046..105
    const ids = reg.map((x) => x.id);
    expect(ids).toContain('INV-2026-099');
    expect(ids).toContain('INV-2026-100');
    expect(ids.some((x) => /^INV-\d{4}-0\d{3}$/.test(x))).toBe(false);
  });

  it('tahun diambil dari klok SSOT, bukan literal', () => {
    expect(nextInvoiceId(SEED, '2027-01-04').startsWith('INV-2027-')).toBe(true);
    /* Tahun buku baru pun tak boleh memakai ulang nomor yang sudah ada. */
    const next2027 = nextInvoiceId(SEED, '2027-01-04');
    expect(SEED.some((x) => x.id === next2027)).toBe(false);
  });

  it('register kosong mulai dari nomor pertama tahun berjalan', () => {
    expect(nextInvoiceId([], '2026-01-02')).toBe('INV-2026-001');
  });
});

describe('B2 — pelunasan menggerakkan angka yang dibaca modul AP/AR', () => {
  it('menandai lunas mengurangi piutang outstanding sebesar sisa tagihannya', () => {
    const target = SEED.find((x) => x.status === 'Overdue');
    if (!target) throw new Error('seed tanpa faktur Overdue — premis uji hilang');
    const before = arOutstanding(SEED);
    const after = arOutstanding(SEED.map((x) => x.id === target.id ? markInvoicePaid(x, TODAY) : x));
    expect(before - after).toBe(target.amount - target.paid);
  });

  it('menandai lunas mengosongkan piutang jatuh tempo lewat untuk baris itu', () => {
    const target = SEED.find((x) => x.status === 'Overdue');
    if (!target) throw new Error('seed tanpa faktur Overdue — premis uji hilang');
    const after = SEED.map((x) => x.id === target.id ? markInvoicePaid(x, TODAY) : x);
    expect(arOverdue(SEED) - arOverdue(after)).toBe(target.amount - target.paid);
  });

  it('faktur Draft belum menjadi piutang; mengirimnya menjadikannya piutang', () => {
    const draft = inv({ id: 'INV-2026-090', amount: 250_000_000, status: 'Draft' });
    const reg = [draft];
    expect(arOutstanding(reg)).toBe(0);
    expect(arOutstanding([markInvoiceSent(draft, TODAY)])).toBe(250_000_000);
  });
});

describe('B2 (lanjutan) — antrean persetujuan menilai register, bukan seed', () => {
  const build = (invoices: InvoiceRecord[]): ApprovalItem[] =>
    PLATFORM.buildApprovals({ engagements: AMS.ENGAGEMENTS, clients: AMS.CLIENTS, invoices })
      .filter((i) => i.kind === 'Faktur');

  it('faktur yang baru diterbitkan masuk antrean otorisasi', () => {
    const baru = inv({ id: nextInvoiceId(SEED, TODAY), status: 'Draft' });
    const antre = build([...SEED, baru]);
    expect(antre.some((i) => i.sourceId === baru.id && i.status === 'pending')).toBe(true);
    /* Falsifier: tanpa register yang dikirim, antrean tak pernah melihatnya. */
    expect(build(SEED).some((i) => i.sourceId === baru.id)).toBe(false);
  });

  it('faktur yang sudah dikirim tidak lagi menunggu otorisasi penerbitan', () => {
    const draft = SEED.find((x) => x.status === 'Draft');
    if (!draft) throw new Error('seed tanpa faktur Draft — premis uji hilang');
    const sebelum = build(SEED).find((i) => i.sourceId === draft.id);
    const sesudah = build(SEED.map((x) => x.id === draft.id ? markInvoiceSent(x, TODAY) : x))
      .find((i) => i.sourceId === draft.id);
    expect(sebelum && sebelum.status).toBe('pending');
    expect(sesudah && sesudah.status).not.toBe('pending');
  });
});

describe('B4 — pelunasan & pengiriman membawa tanggal', () => {
  it('markInvoicePaid mencatat tanggal pelunasan dari klok SSOT', () => {
    expect(markInvoicePaid(inv({ status: 'Sent' }), TODAY).paidAt).toBe(TODAY);
  });

  it('markInvoiceSent mencatat tanggal kirim dari klok SSOT', () => {
    expect(markInvoiceSent(inv(), TODAY).sentAt).toBe(TODAY);
  });

  it('baris warisan tanpa tanggal tetap terbaca — bukan crash, bukan tanggal karangan', () => {
    const legacy = inv({ status: 'Paid', paid: 100_000_000 });
    expect(legacy.paidAt).toBeUndefined();
    expect(arOutstanding([legacy])).toBe(0);
  });
});

describe('B5 — nilai awal form diturunkan, bukan literal', () => {
  it('termin standar firma DIBACA dari register, bukan diasumsikan', () => {
    /* Ketujuh faktur seed berjarak persis 30 hari terbit→jatuh tempo. */
    expect(standardTermDays(SEED)).toBe(30);
  });

  it('jatuh tempo default = tanggal terbit + termin standar', () => {
    expect(defaultDueDate('2026-03-09', SEED)).toBe('2026-04-08');
    expect(defaultDueDate('2026-12-20', SEED)).toBe('2027-01-19');
  });

  it('register tanpa termin tunggal TIDAK mengarang jumlah hari', () => {
    const campur = [
      inv({ id: 'INV-2026-101', issued: '2026-01-01', due: '2026-01-31' }),
      inv({ id: 'INV-2026-102', issued: '2026-02-01', due: '2026-03-18' }),
    ];
    expect(standardTermDays(campur)).toBeNull();
    expect(defaultDueDate('2026-03-09', campur)).toBe('');
    expect(standardTermDays([])).toBeNull();
  });
});
