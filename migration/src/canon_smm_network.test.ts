import { describe, it, expect } from 'vitest';
import {
  assessNetwork, networkDefectLabel, ADAPTATION_LABEL, NETWORK_DEFECT_LABEL,
  type NetworkItem, type NetworkMonitoringResult, type NetworkDeficiency, type NetworkDefectCode,
} from './canon_smm_network';

/* ============================================================
   Ketentuan jaringan & jasa jaringan ¶48–52.

   Register lama memperlakukan jaringan sebagai SATU BARIS VENDOR
   di QM_PROVIDERS dengan kolom `status: 'Memadai'`. Satu baris
   seperti itu tidak dapat menyatakan apa pun tentang ¶48–52 — dan
   tak ada yang bisa gagal karenanya.

   Uji di bawah memaku bahwa tiap ketentuan ¶48(c), ¶49(b), ¶51(b)
   dan ¶52 punya gerbangnya sendiri.
   ============================================================ */

const YEAR = 2026;

const item = (over: Partial<NetworkItem> = {}): NetworkItem => ({
  id: 'NR-1', kind: 'requirement', title: 'Metodologi audit jaringan',
  firmResponsibility: 'Anindya Pramesti, CPA',
  adaptation: 'adapted', adaptationBasis: 'Disesuaikan dengan SA & PSAK Indonesia.',
  ...over,
});

const monitoring = (over: Partial<NetworkMonitoringResult> = {}): NetworkMonitoringResult => ({
  year: YEAR, obtainedAt: '2026-02-10', communicatedToTeams: true, effectConsidered: true, ...over,
});

const deficiency = (over: Partial<NetworkDeficiency> = {}): NetworkDeficiency => ({
  id: 'ND-1', itemId: 'NR-1', description: 'Template jaringan belum mencakup PSAK 117.',
  communicatedToNetwork: true, remedialAction: 'Kontrol tambahan KAP + eskalasi ke jaringan.',
  ...over,
});

describe('keterterapan ¶48', () => {
  it('KAP non-jaringan: tidak terterap, dinyatakan eksplisit', () => {
    const a = assessNetwork(false, [], [], [], YEAR);
    expect(a.applicable).toBe(false);
    expect(a.compliant).toBe(true);
    expect(a.allDefects).toEqual([]);
  });

  it('KAP jaringan tanpa data sama sekali: TIDAK patuh (¶51(b) gagal)', () => {
    /* Ketiadaan hasil pemantauan tahunan adalah kegagalan, bukan
       "belum" yang diam-diam lolos. */
    const a = assessNetwork(true, [], [], [], YEAR);
    expect(a.applicable).toBe(true);
    expect(a.compliant).toBe(false);
    expect(a.monitoringDefects).toEqual(['monitoring-not-obtained']);
  });
});

describe('¶48(c) — tanggung jawab KAP atas implementasi', () => {
  it('ketentuan tanpa penanggung jawab: cacat', () => {
    const a = assessNetwork(true, [item({ firmResponsibility: '  ' })], [monitoring()], [], YEAR);
    expect(a.items[0].defects).toContain('no-firm-responsibility');
    expect(a.compliant).toBe(false);
  });

  it('ketentuan dengan penanggung jawab: bersih', () => {
    const a = assessNetwork(true, [item()], [monitoring()], [], YEAR);
    expect(a.items[0].compliant).toBe(true);
    expect(a.compliant).toBe(true);
  });
});

describe('¶49(b) — evaluasi adaptasi', () => {
  it('tanpa kesimpulan adaptasi: cacat', () => {
    const a = assessNetwork(true, [item({ adaptation: null })], [monitoring()], [], YEAR);
    expect(a.items[0].defects).toContain('no-adaptation-evaluation');
  });

  it('kesimpulan TANPA dasar tertulis: cacat — evaluasi tanpa alasan bukan evaluasi', () => {
    const a = assessNetwork(true, [item({ adaptation: 'as-is', adaptationBasis: '' })], [monitoring()], [], YEAR);
    expect(a.items[0].defects).toContain('no-adaptation-basis');
  });

  it('"dipakai apa adanya" TETAP menuntut dasar', () => {
    const ok = assessNetwork(true,
      [item({ adaptation: 'as-is', adaptationBasis: 'Setara ketentuan SMM; tak perlu adaptasi.' })],
      [monitoring()], [], YEAR);
    expect(ok.items[0].compliant).toBe(true);
  });

  it('keempat bentuk adaptasi punya label', () => {
    expect(Object.keys(ADAPTATION_LABEL)).toHaveLength(4);
    for (const v of Object.values(ADAPTATION_LABEL)) expect(v.length).toBeGreaterThan(5);
  });
});

describe('¶51(b) — hasil pemantauan jaringan tahunan', () => {
  it('hasil tahun LAIN tidak memenuhi tahun berjalan', () => {
    const a = assessNetwork(true, [item()], [monitoring({ year: YEAR - 1 })], [], YEAR);
    expect(a.monitoringDefects).toEqual(['monitoring-not-obtained']);
  });

  it('tanggal perolehan kosong = belum diperoleh', () => {
    const a = assessNetwork(true, [item()], [monitoring({ obtainedAt: null })], [], YEAR);
    expect(a.monitoringDefects).toEqual(['monitoring-not-obtained']);
  });

  it('diperoleh tetapi belum dikomunikasikan ke tim: cacat ¶51(b)(i)', () => {
    const a = assessNetwork(true, [item()], [monitoring({ communicatedToTeams: false })], [], YEAR);
    expect(a.monitoringDefects).toContain('monitoring-not-communicated');
  });

  it('diperoleh tetapi pengaruhnya belum dipertimbangkan: cacat ¶51(b)(ii)', () => {
    const a = assessNetwork(true, [item()], [monitoring({ effectConsidered: false })], [], YEAR);
    expect(a.monitoringDefects).toContain('monitoring-effect-not-considered');
  });

  it('lengkap: tanpa cacat pemantauan', () => {
    const a = assessNetwork(true, [item()], [monitoring()], [], YEAR);
    expect(a.monitoringDefects).toEqual([]);
  });
});

describe('¶52 — defisiensi DALAM ketentuan/jasa jaringan', () => {
  it('belum dikomunikasikan ke jaringan: cacat ¶52(a)', () => {
    const a = assessNetwork(true, [item()], [monitoring()], [deficiency({ communicatedToNetwork: false })], YEAR);
    expect(a.deficiencies[0].defects).toContain('deficiency-not-communicated');
    expect(a.compliant).toBe(false);
  });

  it('tanpa tindakan remedial KAP: cacat ¶52(b)', () => {
    /* ¶52(b) menuntut KAP tetap merancang remediasi sendiri —
       melaporkan ke jaringan saja tidak memenuhi. */
    const a = assessNetwork(true, [item()], [monitoring()], [deficiency({ remedialAction: '' })], YEAR);
    expect(a.deficiencies[0].defects).toContain('deficiency-no-remedial');
  });

  it('dikomunikasikan DAN diremediasi: bersih', () => {
    const a = assessNetwork(true, [item()], [monitoring()], [deficiency()], YEAR);
    expect(a.deficiencies[0].compliant).toBe(true);
    expect(a.compliant).toBe(true);
  });
});

describe('agregasi', () => {
  it('allDefects unik lintas sumber', () => {
    const a = assessNetwork(true,
      [item({ id: 'NR-1', firmResponsibility: '' }), item({ id: 'NR-2', firmResponsibility: '' })],
      [], [deficiency({ communicatedToNetwork: false, remedialAction: '' })], YEAR);
    expect(a.allDefects).toContain('no-firm-responsibility');
    expect(a.allDefects).toContain('monitoring-not-obtained');
    expect(a.allDefects).toContain('deficiency-not-communicated');
    expect(new Set(a.allDefects).size).toBe(a.allDefects.length);
    expect(a.compliant).toBe(false);
  });

  it('setiap kode cacat punya kalimat siap-tampil', () => {
    const codes = Object.keys(NETWORK_DEFECT_LABEL) as NetworkDefectCode[];
    expect(codes).toHaveLength(8);
    for (const c of codes) expect(networkDefectLabel(c).length).toBeGreaterThan(20);
  });

  it('input null aman', () => {
    const a = assessNetwork(true, null, null, null, YEAR);
    expect(a.compliant).toBe(false);   // ¶51(b) tetap gagal
    expect(a.items).toEqual([]);
  });
});
