/* ============================================================
   Pihak berelasi (SA 550 / PSAK 7) — scan-rekonsiliasi register
   RPT terhadap populasi jurnal. Memastikan gap KELENGKAPAN
   (RPT tak tercatat) & pengungkapan (tak diungkap) terdeteksi
   deterministik, serta roll-up benar.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import {
  RP_PARTIES, RP_TXN, scanRelatedParties, LEDGER_GAP_META,
  type RelatedParty, type RptTransaction, type LedgerEntry,
} from './canon_related';
import { AMS_FORENSIC } from './forensic_canon';

/* fixture minimal & terkontrol */
const P: RelatedParty[] = [
  { id: 'RP-01', name: 'PT Induk', rel: 'Entitas Induk', nature: '', risk: 'High' },
  { id: 'RP-02', name: 'CV Keluarga', rel: 'Dikendalikan KMP', nature: '', risk: 'High' },
];
const reg = (over: Partial<RptTransaction> & { id: string }): RptTransaction => ({
  id: over.id, rpId: 'RP-01', party: 'PT Induk', type: 'x', amount: 1_000_000_000,
  terms: '', arm: true, disclosed: true, assertion: 'Occurrence', ...over,
});
const je = (over: Partial<LedgerEntry> & { id: string }): LedgerEntry => ({
  id: over.id, amount: 1_000_000_000, rpId: 'RP-01', ...over,
});

describe('registri kanonik', () => {
  it('5 pihak id unik & 6 transaksi register ber-rpId valid', () => {
    expect(RP_PARTIES).toHaveLength(5);
    expect(new Set(RP_PARTIES.map(p => p.id)).size).toBe(5);
    const ids = new Set(RP_PARTIES.map(p => p.id));
    expect(RP_TXN.every(t => t.rpId && ids.has(t.rpId))).toBe(true);
    expect(RP_TXN).toHaveLength(6);
  });
});

describe('scanRelatedParties — pencocokan & gap', () => {
  it('jurnal cocok + register diungkap → matched, tanpa gap', () => {
    const r = scanRelatedParties({ parties: P, register: [reg({ id: 'T-1', disclosed: true })], journal: [je({ id: 'J-1' })] });
    expect(r.matched).toHaveLength(1);
    expect(r.matched[0]).toMatchObject({ txnId: 'T-1', journalId: 'J-1', disclosed: true });
    expect(r.ledgerGaps).toHaveLength(0);
    expect(r.unsupportedRegister).toHaveLength(0);
  });

  it('jurnal cocok + register TAK diungkap → gap reason undisclosed', () => {
    const r = scanRelatedParties({ parties: P, register: [reg({ id: 'T-1', disclosed: false })], journal: [je({ id: 'J-1' })] });
    expect(r.matched).toHaveLength(1);
    expect(r.ledgerGaps).toHaveLength(1);
    expect(r.ledgerGaps[0]).toMatchObject({ reason: 'undisclosed', txnId: 'T-1', journalId: 'J-1' });
  });

  it('jurnal pihak berelasi tanpa register → gap reason unrecorded (kelengkapan)', () => {
    const r = scanRelatedParties({ parties: P, register: [], journal: [je({ id: 'J-1', amount: 1_200_000_000 })] });
    expect(r.ledgerGaps).toHaveLength(1);
    expect(r.ledgerGaps[0]).toMatchObject({ reason: 'unrecorded', journalId: 'J-1', rpId: 'RP-01' });
    expect(r.rollup.unrecorded).toBe(1);
  });

  it('nilai di luar toleransi → tak match → unrecorded (bukan keliru match)', () => {
    const r = scanRelatedParties({ parties: P, register: [reg({ id: 'T-1', amount: 3_200_000_000 })], journal: [je({ id: 'J-1', amount: 1_200_000_000 })] });
    expect(r.matched).toHaveLength(0);
    expect(r.ledgerGaps[0].reason).toBe('unrecorded');
    expect(r.unsupportedRegister).toHaveLength(1); // register 3,2 M tak didukung jurnal
  });

  it('toleransi Rp 1 jt: selisih ≤ 1 jt tetap match', () => {
    const r = scanRelatedParties({ parties: P, register: [reg({ id: 'T-1', amount: 1_000_000_000 })], journal: [je({ id: 'J-1', amount: 1_000_900_000 })] });
    expect(r.matched).toHaveLength(1);
    expect(r.ledgerGaps).toHaveLength(0);
  });

  it('register tanpa jejak jurnal → unsupportedRegister', () => {
    const r = scanRelatedParties({ parties: P, register: [reg({ id: 'T-1' }), reg({ id: 'T-2', amount: 9_000_000_000 })], journal: [je({ id: 'J-1' })] });
    expect(r.matched.map(m => m.txnId)).toEqual(['T-1']);
    expect(r.unsupportedRegister.map(u => u.txnId)).toEqual(['T-2']);
  });

  it('jurnal ke pihak TIDAK terdaftar diabaikan', () => {
    const r = scanRelatedParties({ parties: P, register: [], journal: [je({ id: 'J-x', rpId: 'RP-99' })] });
    expect(r.ledgerGaps).toHaveLength(0);
    expect(r.rollup.ledgerRpExposure).toBe(0);
  });

  it('jurnal tanpa rpId diabaikan (hanya aktivitas pihak berelasi)', () => {
    const r = scanRelatedParties({ parties: P, register: [], journal: [{ id: 'J-0', amount: 5_000_000 }] });
    expect(r.ledgerGaps).toHaveLength(0);
    expect(r.rollup.ledgerRpExposure).toBe(0);
  });

  it('fallback nama: register tanpa rpId diresolusi via nama pihak', () => {
    const t: RptTransaction = { id: 'T-1', party: 'CV Keluarga', type: 'x', amount: 1_000_000_000, terms: '', arm: false, disclosed: false, assertion: 'Valuation' };
    const r = scanRelatedParties({ parties: P, register: [t], journal: [je({ id: 'J-1', rpId: 'RP-02' })] });
    expect(r.matched).toHaveLength(1);
    expect(r.ledgerGaps[0]).toMatchObject({ reason: 'undisclosed', txnId: 'T-1' });
  });

  it('satu jurnal tak mengonsumsi dua register (no double-match)', () => {
    const r = scanRelatedParties({ parties: P, register: [reg({ id: 'T-1' }), reg({ id: 'T-2' })], journal: [je({ id: 'J-1' })] });
    expect(r.matched).toHaveLength(1);
    expect(r.unsupportedRegister).toHaveLength(1);
  });

  it('roll-up: exposure/nonArm/undisclosed atas register penuh', () => {
    const r = scanRelatedParties({ parties: P, register: [reg({ id: 'T-1', amount: 1e9, arm: false, disclosed: false }), reg({ id: 'T-2', amount: 2e9, arm: true, disclosed: true })], journal: [] });
    expect(r.rollup.exposure).toBe(3e9);
    expect(r.rollup.nonArm).toBe(1);
    expect(r.rollup.undisclosed).toBe(1);
  });

  it('input kosong → hasil kosong stabil', () => {
    const r = scanRelatedParties({ parties: [], register: [], journal: [] });
    expect(r).toEqual({ matched: [], ledgerGaps: [], unsupportedRegister: [], rollup: { parties: 0, exposure: 0, nonArm: 0, undisclosed: 0, ledgerGaps: 0, unrecorded: 0, unsupportedRegister: 0, ledgerRpExposure: 0 } });
  });
});

describe('integrasi populasi jurnal kanonik (forensic_canon)', () => {
  it('JOURNAL_POP nyata: T-06 (CV Mitra Keluarga) undisclosed & advance Direksi unrecorded', () => {
    const r = scanRelatedParties({ parties: RP_PARTIES, register: RP_TXN, journal: AMS_FORENSIC.JOURNAL_POP });
    // JV-24-09001 (RP-05, 2,78 M) cocok T-06 yang disclosed:false → undisclosed
    const disc = r.ledgerGaps.find(g => g.journalId === 'JV-24-09001');
    expect(disc).toMatchObject({ reason: 'undisclosed', txnId: 'T-06', rpId: 'RP-05' });
    // JV-24-09002 (RP-04, 1,2 M Piutang Direksi) tak ada di register → unrecorded
    const unrec = r.ledgerGaps.find(g => g.journalId === 'JV-24-09002');
    expect(unrec).toMatchObject({ reason: 'unrecorded', rpId: 'RP-04' });
    expect(r.rollup.ledgerRpExposure).toBe(2_780_000_000 + 1_200_000_000);
  });
});

describe('metadata gap', () => {
  it('label & severity untuk kedua reason ada', () => {
    expect(LEDGER_GAP_META.unrecorded.k).toBe('red');
    expect(LEDGER_GAP_META.undisclosed.k).toBe('amber');
  });
});
