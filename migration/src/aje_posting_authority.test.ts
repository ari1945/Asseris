/* ============================================================
   PR-B — Gerbang otorisasi posting jurnal (ISQM 1 · SA 450).

   Cacat yang ditutup: `addAje` melahirkan entri berstatus 'Posted', dan
   `buildApprovals` lalu menghitung `doneTo = posted ? steps.length : 1`,
   sehingga `chain()` menandai Audit Manager, Engagement Partner, DAN EQR
   Reviewer sebagai 'approved' — lengkap dengan stempel waktu dan catatan
   "Disetujui." — untuk jurnal yang baru saja dibuat sendiri oleh seorang
   Senior Auditor. Itu bukan kontrol yang hilang, melainkan sistem yang
   MENERBITKAN BUKTI AUDIT PALSU atas nama partner.

   Uji di berkas ini memaku bahwa status posting tidak pernah lagi menjadi
   bukti persetujuan.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { AMS } from './data';
import './data_platform';   // efek samping: memasang AMS.PLATFORM (IIFE)
import { can, CAP } from './rbac';

const PLATFORM = (AMS as unknown as { PLATFORM: { buildApprovals: (ctx: unknown) => ApprovalItem[] } }).PLATFORM;

interface ChainLink { role: string; name: string; status: string; ts: string | null; note: string | null }
interface ApprovalItem {
  id: string; kind: string; sourceId: string; amount: number; status: string;
  step: number; chain: ChainLink[]; required: number; chainComplete: boolean;
  postedWithoutFullChain: boolean; from: string;
}

const build = (aje: unknown[]): ApprovalItem[] =>
  PLATFORM.buildApprovals({ aje, engagements: AMS.ENGAGEMENTS, clients: AMS.CLIENTS })
    .filter(i => i.kind === 'AJE');

/** Jurnal buatan pengguna: tak punya keputusan tercatat sama sekali. */
const userJournal = (over: Record<string, unknown> = {}) => ({
  id: 'AJE-99', desc: 'Jurnal buatan pengguna', ref: 'X-1',
  status: 'Proposed', dr: '5-3100 Beban Umum', cr: '2-1300 Akrual',
  amount: 750_000_000, ...over,
});

describe('PR-B — status posting BUKAN bukti persetujuan', () => {
  /* Inti PR-B. Sebelum perbaikan, uji ini gagal pada ketiga tingkat nilai. */
  it('jurnal Posted tanpa keputusan tercatat: TAK ADA langkah selain Penyusun yang approved', () => {
    ([400_000_000, 1_200_000_000, 3_500_000_000]).forEach(amount => {
      const [item] = build([userJournal({ amount, status: 'Posted' })]);
      const approved = item.chain.filter(c => c.status === 'approved');
      expect(approved).toHaveLength(1);
      expect(approved[0].role).toBe('Penyusun');
      /* dan tak satu pun langkah membawa stempel waktu palsu */
      item.chain.slice(1).forEach(c => expect(c.ts).toBeNull());
    });
  });

  it('jurnal Posted tanpa rantai lengkap ditandai sebagai eksepsi kontrol', () => {
    const [item] = build([userJournal({ status: 'Posted' })]);
    expect(item.postedWithoutFullChain).toBe(true);
    expect(item.chainComplete).toBe(false);
  });

  it('status antrean mengikuti RANTAI, bukan status posting jurnal', () => {
    const [posted] = build([userJournal({ status: 'Posted' })]);
    expect(posted.status).toBe('pending');   // dulu: 'approved'
  });

  /* Panjang rantai mengikuti ROUTING_RULES: >2 M menuntut langkah EQR. */
  it('ambang nilai menentukan panjang rantai (ROUTING_RULES)', () => {
    expect(build([userJournal({ amount: 400_000_000 })])[0].chain).toHaveLength(3);
    expect(build([userJournal({ amount: 2_500_000_000 })])[0].chain).toHaveLength(4);
    expect(build([userJournal({ amount: 2_500_000_000 })])[0].chain[3].role).toBe('EQR Reviewer');
  });
});

describe('PR-B — keputusan seed mencerminkan reviu yang benar-benar tercatat', () => {
  const seeded = () => build(AMS.AJE as unknown[]);

  it('AJE-02 (direviu & diposting): Manager + Partner approved, rantai lengkap', () => {
    const it02 = seeded().find(i => i.sourceId === 'AJE-02')!;
    expect(it02.chain.map(c => c.status)).toEqual(['approved', 'approved', 'approved']);
    expect(it02.chainComplete).toBe(true);
    expect(it02.chain[2].name).toBe('Hartono Wijaya');
  });

  it('AJE-03 (direviu manajer, belum disetujui partner): langkah Partner masih current', () => {
    const it03 = seeded().find(i => i.sourceId === 'AJE-03')!;
    expect(it03.chain[1].status).toBe('approved');
    expect(it03.chain[2].status).toBe('current');
    expect(it03.chainComplete).toBe(false);
  });

  it('AJE-05 (baru diajukan): hanya Penyusun yang selesai', () => {
    const it05 = seeded().find(i => i.sourceId === 'AJE-05')!;
    expect(it05.chain[1].status).toBe('current');
    expect(it05.chain.filter(c => c.status === 'approved')).toHaveLength(1);
  });

  /* Eksepsi nyata yang tersingkap oleh perbaikan ini: AJE-01 bernilai Rp 2,34 M
     sehingga ROUTING_RULES menuntut langkah EQR, tetapi jejak historis hanya
     mencatat persetujuan Manager & Partner. Dulu tertutup oleh stempel otomatis. */
  it('AJE-01 (Rp 2,34 M) tersingkap: diposting tanpa langkah EQR yang disyaratkan', () => {
    const it01 = seeded().find(i => i.sourceId === 'AJE-01')!;
    expect(it01.chain).toHaveLength(4);
    expect(it01.chain[3].role).toBe('EQR Reviewer');
    expect(it01.chain[3].status).not.toBe('approved');
    expect(it01.postedWithoutFullChain).toBe(true);
  });
});

describe('PR-B — kapabilitas AJE_POST terpisah & Partner-only', () => {
  it('hanya peran tingkat-partner yang boleh memposting jurnal', () => {
    expect(can('Engagement Partner', CAP.AJE_POST)).toBe(true);
    expect(can('Rekan Pemimpin', CAP.AJE_POST)).toBe(true);
    expect(can('Audit Manager', CAP.AJE_POST)).toBe(false);
    expect(can('Senior Auditor', CAP.AJE_POST)).toBe(false);
    expect(can('Junior Auditor', CAP.AJE_POST)).toBe(false);
  });

  /* Menyusun/mengajukan jurnal TETAP boleh bagi Senior — yang dicabut hanyalah
     kewenangan memposting. Kalau keduanya menyatu, PR-B akan melumpuhkan kerja
     lapangan alih-alih menegakkan pemisahan tugas. */
  it('AJE_EDIT (menyusun) tetap dimiliki Senior Auditor dan TERPISAH dari AJE_POST', () => {
    expect(can('Senior Auditor', CAP.AJE_EDIT)).toBe(true);
    expect(can('Senior Auditor', CAP.AJE_POST)).toBe(false);
    expect(CAP.AJE_POST).not.toBe(CAP.AJE_EDIT);
  });

  /* Menyatukan dgn OPINION_APPROVE berarti siapa pun yang boleh memposting jurnal
     otomatis boleh menyetujui opini audit — itulah sebabnya cap-nya dipisah. */
  it('AJE_POST bukan alias OPINION_APPROVE', () => {
    expect(CAP.AJE_POST).not.toBe(CAP.OPINION_APPROVE);
  });

  it('langkah Manager memakai SIGNOFF_REVIEWER — Manager berwenang di langkahnya sendiri', () => {
    expect(can('Audit Manager', CAP.SIGNOFF_REVIEWER)).toBe(true);
    expect(can('Senior Auditor', CAP.SIGNOFF_REVIEWER)).toBe(false);
  });

  it('langkah EQR memakai EQR_REVIEW — Manager tak dapat menyelesaikannya', () => {
    expect(can('Audit Manager', CAP.EQR_REVIEW)).toBe(false);
    expect(can('Engagement Partner', CAP.EQR_REVIEW)).toBe(true);
  });
});
