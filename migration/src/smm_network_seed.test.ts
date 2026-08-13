import { describe, it, expect } from 'vitest';
import { AMS } from './data';
import { assessNetwork, type NetworkItem, type NetworkMonitoringResult, type NetworkDeficiency } from './canon_smm_network';

/* ============================================================
   ¶48–52 DI ATAS DATA NYATA.

   Keputusan Q-2 (Ari, 2026-08-13): firma dimodelkan sebagai BAGIAN
   DARI JARINGAN, dan "KAP besar harus disiapkan wadah jaringan".
   Wadah itu adalah QM_NETWORK.

   Dua cacat SENGAJA dipertahankan di seed agar gerbangnya hidup:
     · NS-02 (inspeksi lintas-batas) belum dievaluasi adaptasinya ¶49(b)
     · ND-01 belum punya tindakan remedial KAP ¶52(b)

   Bila angka di bawah berubah, itu harus karena wadah jaringannya
   memang berubah — bukan karena gerbangnya dilonggarkan.
   ============================================================ */

type NetShape = {
  inNetwork: boolean; name: string; year: number;
  items: NetworkItem[]; monitoring: NetworkMonitoringResult[]; deficiencies: NetworkDeficiency[];
};
const NET = (AMS as unknown as { QM_NETWORK: NetShape }).QM_NETWORK;

describe('wadah jaringan tersedia', () => {
  it('firma dimodelkan sebagai bagian dari jaringan (keputusan Q-2)', () => {
    expect(NET.inNetwork).toBe(true);
    expect(NET.name).toContain('AGN-Asia');
  });

  it('ketentuan & jasa jaringan terdaftar terpisah, bukan satu baris vendor', () => {
    const req = NET.items.filter((i) => i.kind === 'requirement');
    const svc = NET.items.filter((i) => i.kind === 'service');
    expect(req.length).toBeGreaterThanOrEqual(3);
    expect(svc.length).toBeGreaterThanOrEqual(2);
  });

  it('setiap ketentuan/jasa punya penanggung jawab KAP (¶48(c))', () => {
    for (const i of NET.items) {
      expect((i.firmResponsibility || '').trim().length, i.id).toBeGreaterThan(0);
    }
  });
});

describe('penilaian ¶48–52 atas seed', () => {
  const a = assessNetwork(NET.inNetwork, NET.items, NET.monitoring, NET.deficiencies, NET.year);

  it('terterap, dan TIDAK patuh penuh — gerbangnya hidup', () => {
    expect(a.applicable).toBe(true);
    expect(a.compliant).toBe(false);
  });

  it('¶51(b) hasil pemantauan jaringan tahunan LENGKAP untuk periode evaluasi', () => {
    expect(a.monitoringDefects).toEqual([]);
  });

  it('¶49(b) NS-02 belum dievaluasi adaptasinya', () => {
    const ns02 = a.items.find((x) => x.itemId === 'NS-02');
    expect(ns02?.defects).toEqual(['no-adaptation-evaluation']);
  });

  it('keempat item lain bersih', () => {
    const clean = a.items.filter((x) => x.compliant).map((x) => x.itemId);
    expect(clean.sort()).toEqual(['NR-01', 'NR-02', 'NR-03', 'NS-01']);
  });

  it('¶52(b) ND-01 dikomunikasikan ke jaringan TETAPI tanpa tindakan remedial KAP', () => {
    const nd = a.deficiencies.find((x) => x.deficiencyId === 'ND-01');
    expect(nd?.defects).toEqual(['deficiency-no-remedial']);
  });

  it('tepat dua jenis cacat, keduanya disengaja', () => {
    expect([...a.allDefects].sort()).toEqual(['deficiency-no-remedial', 'no-adaptation-evaluation']);
  });
});

describe('¶48 — ketentuan jaringan yang lebih ketat tidak boleh diturunkan', () => {
  it('kebijakan rotasi jaringan DITAMBAH batas lokal yang lebih ketat', () => {
    /* ¶48: KAP tidak boleh membiarkan kepatuhan pada ketentuan jaringan
       melanggar ketentuan SMM / peraturan lokal. */
    const nr02 = NET.items.find((i) => i.id === 'NR-02');
    expect(nr02?.adaptation).toBe('supplemented');
    expect(nr02?.adaptationBasis).toMatch('POJK 13/2017');
  });
});
