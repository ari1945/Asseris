import { describe, it, expect } from 'vitest';
import {
  collectSmmDeficiencies, smmDeficiencyFromNetwork, smmDeficiencyFromRisk,
  originOf, ORIGIN_LABEL,
  type NetworkDeficiencyLike, type RiskRowLike,
} from './canon_smm_deficiencies';
import { evaluateSmm, isOpen, isSignificant, isPervasive } from './canon_smm_evaluation';
import type { NetworkItem } from './canon_smm_network';

/* ============================================================
   Cacat yang dipaku uji ini (V-6 tinjauan visual 2026-08-13):

   Panel "Faktor Keputusan ¶54" MENYATAKAN "Tidak ada defisiensi
   lain yang terbuka — Nihil (0)" sementara layar Governance untuk
   firma & periode yang sama menampilkan defisiensi jaringan
   TERBUKA tanpa tindakan remedial (¶52(b)). `evaluateSmm` tidak
   pernah menerima defisiensi jaringan sebagai masukan.
   ============================================================ */

const ITEM_SUPPLEMENTED: NetworkItem = {
  id: 'NR-02', kind: 'requirement', title: 'Kebijakan independensi jaringan',
  component: 'Ketentuan Etika', firmResponsibility: 'Sari Dewanti, CPA',
  adaptation: 'supplemented', adaptationBasis: 'Ditambah batas rotasi lokal yang lebih ketat.',
};

const ITEM_ADAPTED: NetworkItem = {
  id: 'NR-01', kind: 'requirement', title: 'Metodologi audit jaringan',
  component: 'Sumber Daya', firmResponsibility: 'Anindya Pramesti, CPA',
  adaptation: 'adapted', adaptationBasis: 'Diadaptasi ke SA & PSAK Indonesia.',
};

const ND_NO_REMEDIAL: NetworkDeficiencyLike = {
  id: 'ND-01', itemId: 'NR-01',
  description: 'Template jaringan belum mengakomodasi PSAK 117.',
  communicatedToNetwork: true, remedialAction: null,
};

describe('¶52 → ¶54 · defisiensi jaringan masuk hitungan kesimpulan', () => {
  it('defisiensi jaringan tanpa tindakan remedial adalah TERBUKA (¶52(b))', () => {
    const d = smmDeficiencyFromNetwork(ND_NO_REMEDIAL, ITEM_ADAPTED);
    expect(d.remediated).toBe(false);
    expect(isOpen(d)).toBe(true);
  });

  it('locus bawaan RANCANGAN — ketentuan jaringan yang dipakai adalah respons yang KAP rancang (¶49(a))', () => {
    const d = smmDeficiencyFromNetwork(ND_NO_REMEDIAL, ITEM_ADAPTED);
    expect(d.locus).toBe('design');
  });

  it('rancangan tanpa respons kompensasi menembus lantai signifikansi A163', () => {
    const d = smmDeficiencyFromNetwork(ND_NO_REMEDIAL, ITEM_ADAPTED);
    expect(d.compensatingResponse).toBe(false);
    expect(isSignificant(d)).toBe(true);
  });

  it('¶49(b) "supplemented" DITURUNKAN menjadi respons kompensasi — bukan dikarang', () => {
    const d = smmDeficiencyFromNetwork({ ...ND_NO_REMEDIAL, itemId: 'NR-02' }, ITEM_SUPPLEMENTED);
    expect(d.compensatingResponse).toBe(true);
    // tanpa lantai rancangan, signifikansi kembali ke penilaian KAP
    expect(isSignificant(d)).toBe(false);
  });

  it('penilaian eksplisit KAP mengalahkan bawaan', () => {
    const d = smmDeficiencyFromNetwork(
      { ...ND_NO_REMEDIAL, locus: 'operation', compensatingResponse: true }, ITEM_ADAPTED);
    expect(d.locus).toBe('operation');
    expect(d.compensatingResponse).toBe(true);
  });

  it('effectCorrected GAGAL-TERTUTUP — remedialAction saja tidak menutup defisiensi (A191)', () => {
    const d = smmDeficiencyFromNetwork(
      { ...ND_NO_REMEDIAL, remedialAction: 'Template lokal PSAK 117 dirilis.' }, ITEM_ADAPTED);
    expect(d.remediated).toBe(true);
    expect(d.effectCorrected).toBe(false);
    expect(isOpen(d)).toBe(true);          // dua syarat, bukan satu
  });

  it('A191 penuh: diremediasi DAN dampaknya dikoreksi ⇒ tertutup, tetap jadi carve-out', () => {
    const d = smmDeficiencyFromNetwork(
      { ...ND_NO_REMEDIAL, remedialAction: 'Template lokal dirilis.', effectCorrected: true }, ITEM_ADAPTED);
    expect(isOpen(d)).toBe(false);
    expect(evaluateSmm([d]).carveOut).toEqual(['ND-01']);
  });

  it('pervasivitas A192 pada defisiensi jaringan memaksa ¶54(c)', () => {
    const d = smmDeficiencyFromNetwork(
      { ...ND_NO_REMEDIAL, pervasiveness: ['multi-component'] }, ITEM_ADAPTED);
    expect(isPervasive(d)).toBe(true);
    expect(evaluateSmm([d]).conclusion).toBe('not-reasonable');
  });
});

describe('collectSmmDeficiencies — satu pemetaan untuk semua layar', () => {
  const RISKS: RiskRowLike[] = [
    { id: 'QR-01', comp: 'Penerimaan & Keberlanjutan', risk: 'Integritas klien', deficiency: null },
    { id: 'QR-02', comp: 'Sumber Daya', risk: 'Kapasitas senior',
      deficiency: { sev: 'Sedang', locus: 'design', compensatingResponse: false, status: 'Berjalan' } },
  ];
  const NET = { inNetwork: true, items: [ITEM_ADAPTED], deficiencies: [ND_NO_REMEDIAL] };

  it('hanya baris ber-defisiensi yang dihitung', () => {
    const out = collectSmmDeficiencies({ risks: RISKS, network: null });
    expect(out.map((d) => d.id)).toEqual(['QR-02']);
  });

  it('defisiensi jaringan ikut terkumpul dan asalnya tertelusur', () => {
    const out = collectSmmDeficiencies({ risks: RISKS, network: NET });
    expect(out.map((d) => d.id)).toEqual(['QR-02', 'ND-01']);
    expect(originOf(out, 'QR-02')).toBe('risk');
    expect(originOf(out, 'ND-01')).toBe('network');
  });

  it('KAP non-jaringan: ¶48–52 tidak terterap, defisiensi jaringan diabaikan', () => {
    const out = collectSmmDeficiencies({ risks: RISKS, network: { ...NET, inNetwork: false } });
    expect(out.map((d) => d.id)).toEqual(['QR-02']);
  });

  it('TRIPWIRE — defisiensi jaringan terbuka TIDAK BOLEH lenyap dari faktor ¶54', () => {
    const withNet = evaluateSmm(collectSmmDeficiencies({ risks: RISKS, network: NET }));
    const withoutNet = evaluateSmm(collectSmmDeficiencies({ risks: RISKS, network: null }));

    /* Bentuk lama: kedua sisi identik — persis cacatnya. Panel ¶54 lalu
       menyatakan "tidak ada defisiensi lain terbuka" di atas ND-01. */
    expect(withoutNet.openSignificant).toEqual(['QR-02']);
    expect(withNet.openSignificant).toEqual(['QR-02', 'ND-01']);
    expect(withNet.openSignificant.length).toBeGreaterThan(withoutNet.openSignificant.length);
  });

  it('masukan kosong/null aman', () => {
    expect(collectSmmDeficiencies(null)).toEqual([]);
    expect(collectSmmDeficiencies({})).toEqual([]);
    expect(originOf([], 'X')).toBeNull();
  });
});

describe('pemetaan baris risiko dipertahankan apa adanya', () => {
  it('status "Selesai" saja TIDAK menutup defisiensi — dampaknya belum dikoreksi', () => {
    const d = smmDeficiencyFromRisk({ id: 'QR-09', deficiency: { status: 'Selesai', sev: 'Tinggi' } });
    expect(d.remediated).toBe(true);
    expect(d.effectCorrected).toBe(false);
    expect(isOpen(d)).toBe(true);
  });

  it('label asal tersedia untuk kedua sumber', () => {
    expect(ORIGIN_LABEL.risk.length).toBeGreaterThan(3);
    expect(ORIGIN_LABEL.network).toContain('¶52');
  });
});
