import { describe, it, expect } from 'vitest';
import { AMS } from './data';
import {
  objectiveCoverage, coverageByComponent, SMM1_OBJECTIVE_COUNT, SMM1_OBJECTIVE_BY_ID,
  type ObjectiveLinkedRisk, type ObjectiveWaiver,
} from './canon_smm_objectives';

/* ============================================================
   Gerbang cakupan tujuan mutu DI ATAS DATA NYATA (bukan fixture).

   `canon_smm_objectives.test.ts` menguji mesinnya; berkas ini menguji
   bahwa mesin itu benar-benar dipasang pada register risiko firma.

   Uji ini SENGAJA memaku keadaan GAGAL. Register seed hanya menautkan
   lima tujuan dari 27 — jadi sistem manajemen mutu demo memang punya
   22 defisiensi rancangan. Menutupinya (mis. dengan menyeed waiver
   karangan atau menautkan risiko yang tak nyata) akan mengembalikan
   persis cacat yang arc ini perbaiki: layar yang menyatakan kepatuhan
   yang tak pernah diuji.

   Kalau angka di bawah berubah, itu HARUS karena register risiko
   memang berubah — bukan karena gerbangnya dilonggarkan.
   ============================================================ */

const RISKS = (AMS as unknown as { SOQM_RISKS: ObjectiveLinkedRisk[] }).SOQM_RISKS;
const WAIVERS = (AMS as unknown as { SMM_OBJECTIVE_WAIVERS: ObjectiveWaiver[] }).SMM_OBJECTIVE_WAIVERS;

describe('register risiko seed — penautan ke tujuan mandatori', () => {
  it('SOQM_RISKS terekspos dari AMS', () => {
    expect(Array.isArray(RISKS)).toBe(true);
    expect(RISKS.length).toBeGreaterThan(0);
  });

  it('setiap tautan tujuan menunjuk id yang benar-benar ada di ¶28–33', () => {
    const bad: string[] = [];
    for (const r of RISKS) {
      for (const id of r.objectives || []) {
        if (!SMM1_OBJECTIVE_BY_ID.has(id)) bad.push(`${r.id}→${id}`);
      }
    }
    expect(bad, `tautan menggantung: ${bad.join(', ')}`).toEqual([]);
  });

  it('QR-06 (Pemantauan & Remediasi) TIDAK menautkan tujuan ¶28–33', () => {
    /* Pemantauan & remediasi adalah PROSES (¶35–47). Menautkannya ke sebuah
       tujuan ¶28–33 akan menutup tujuan itu secara palsu. */
    const qr06 = RISKS.find((r) => r.id === 'QR-06');
    expect(qr06).toBeTruthy();
    expect(qr06?.objectives || []).toEqual([]);
  });
});

describe('registri waiver ¶17 — kosong, dan itu disengaja', () => {
  it('tidak ada waiver terseed', () => {
    /* Menyeed waiver karangan akan MENUTUP tujuan mandatori tanpa
       pertimbangan profesional yang nyata. */
    expect(WAIVERS).toEqual([]);
  });
});

describe('cakupan atas data nyata — GAGAL yang disengaja', () => {
  const cov = objectiveCoverage(RISKS, WAIVERS);

  it('lima tujuan tercakup, tepat yang ditautkan register', () => {
    expect([...cov.covered].sort()).toEqual(
      ['QO-29a', 'QO-30a', 'QO-31d', 'QO-32d', 'QO-33c'].sort(),
    );
  });

  it('22 tujuan mandatori TIDAK tertangani — defisiensi rancangan', () => {
    expect(cov.uncovered).toHaveLength(22);
    expect(cov.covered.length + cov.waived.length + cov.uncovered.length).toBe(SMM1_OBJECTIVE_COUNT);
  });

  it('sistem TIDAK lengkap — gerbang harus merah, bukan hijau', () => {
    expect(cov.complete).toBe(false);
    expect(cov.addressedPct).toBe(19);
  });

  it('REGRESI: metrik komponen lama jauh lebih longgar daripada metrik tujuan', () => {
    /* Metrik lama = komponen-punya-risiko / 8 komponen. Enam risiko seed
       menyentuh C3–C8, jadi 6/8 = 75% — sementara metrik tujuan 19%.
       Selisih 56 poin itulah yang dulu menyembunyikan 22 lubang. */
    const byComp = coverageByComponent(cov);
    const touched = byComp.filter((c) => c.covered > 0).length;
    expect(touched).toBe(5);                    // C3·C4·C5·C6·C7 tersentuh
    expect(cov.addressedPct).toBe(19);          // metrik tujuan
  });

  it('C1 Tata Kelola & Kepemimpinan: NOL dari 5 tujuan tertangani', () => {
    /* Temuan yang muncul saat menautkan register ke tujuan mandatori:
       komponen yang oleh ¶19 disebut menetapkan LINGKUNGAN bagi seluruh
       sistem manajemen mutu tidak punya satu pun risiko mutu terdaftar.
       Register lama hanya menyentuh C3–C8. */
    const c1 = coverageByComponent(cov).find((c) => c.component === 'C1');
    expect(c1?.total).toBe(5);
    expect(c1?.covered).toBe(0);
    expect(c1?.uncovered).toBe(5);
  });

  it('Sumber Daya (C6) punya 8 tujuan tetapi hanya 1 tertangani', () => {
    const c6 = coverageByComponent(cov).find((c) => c.component === 'C6');
    expect(c6).toBeTruthy();
    expect(c6?.total).toBe(8);
    expect(c6?.covered).toBe(1);
    expect(c6?.uncovered).toBe(7);
  });

  it('C2 & C8 tidak muncul dalam rincian per komponen (keduanya proses)', () => {
    const codes = coverageByComponent(cov).map((c) => c.component);
    expect(codes).not.toContain('C2');
    expect(codes).not.toContain('C8');
  });
});
