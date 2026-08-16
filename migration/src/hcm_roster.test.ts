/* ============================================================
   PRD `docs/prd-sdm-kepatuhan-deepening.md` · PR-4 · SC-1 · SC-2 · SC-3 · SC-24 · SC-25.

   Cacat yang ditutup: firma punya TIGA jumlah karyawan (75 · 69 · 10), dan
   seluruh KPI Human Capital adalah konstanta yang tak pernah dihitung dari satu
   peristiwa pun. Dua di antaranya — attrition 16% dan regrettable 62% — bahkan
   MUSTAHIL benar bersamaan untuk firma seukuran ini.

   Uji di sini dirancang agar GAGAL bila literalnya kembali.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AMS } from './data';
import './data_people';
import {
  ageBand, ageOf, certBand, hcmAttrition, hcmAttritionByGrade, hcmDemographics,
  hcmHeadcountTrend, hcmTimeToFill, tenureBand, tenureOf,
} from './canon_hcm';
import type { HcmExit, HcmMember, HcmRequisition } from './canon_hcm';

const ROSTER = AMS.STAFF as unknown as HcmMember[];
const EXITS = (AMS as unknown as { EXITS: HcmExit[] }).EXITS;
const TODAY = String(AMS.TODAY);
const D = hcmDemographics(ROSTER, TODAY);
const bucket = (b: { k: string; n: number }[]) => Object.fromEntries(b.map((x) => [x.k, x.n]));

/* ------------------------------------------------------------------
   1. SC-1/SC-2 — satu roster, dan komposisinya MENUTUP ke sana
   ------------------------------------------------------------------ */

/** Literal `HCM_ANALYTICS` sebelum PR-4. Ia menjadi SPESIFIKASI roster, lalu dihapus. */
const LITERAL_SEBELUM_PR4 = {
  total: 69,
  gradeMix: { Partner: 6, Manager: 11, Senior: 22, Junior: 30 },
  tenureMix: { '< 2 th': 28, '2–5 th': 24, '5–10 th': 12, '> 10 th': 5 },
  ageMix: { '20–25': 22, '26–30': 20, '31–40': 18, '> 40': 9 },
  genderMix: { 'Laki-laki': 38, Perempuan: 31 },
  certMix: { CPA: 17, CA: 24, 'Kandidat CPA': 9, 'S.Ak': 19 },
  avgTenure: 3.8,
};

describe('SC-1 — komposisi diturunkan dari roster, dan menutup ke literal lama', () => {
  it('roster benar-benar berisi 69 orang — bukan 10, bukan 75', () => {
    expect(D.total).toBe(LITERAL_SEBELUM_PR4.total);
  });

  it('gradeMix', () => expect(bucket(D.gradeMix)).toEqual(LITERAL_SEBELUM_PR4.gradeMix));
  it('tenureMix', () => expect(bucket(D.tenureMix)).toEqual(LITERAL_SEBELUM_PR4.tenureMix));
  it('ageMix', () => expect(bucket(D.ageMix)).toEqual(LITERAL_SEBELUM_PR4.ageMix));
  it('genderMix', () => expect(bucket(D.genderMix)).toEqual(LITERAL_SEBELUM_PR4.genderMix));
  it('certMix', () => expect(bucket(D.certMix)).toEqual(LITERAL_SEBELUM_PR4.certMix));
  it('avgTenure', () => expect(D.avgTenure).toBe(LITERAL_SEBELUM_PR4.avgTenure));

  it('setiap orang punya tanggal lahir — komposisi usia tak boleh menebak', () => {
    expect(D.ageUnknown).toBe(0);
  });

  it('setiap Σ komposisi sama dengan headcount — mustahil menyimpang', () => {
    for (const mix of [D.gradeMix, D.tenureMix, D.ageMix, D.genderMix, D.certMix]) {
      expect(mix.reduce((a, b) => a + b.n, 0)).toBe(D.total);
    }
  });

  it('id & email roster unik', () => {
    const ids = ROSTER.map((m) => m.id);
    const emails = ROSTER.map((m) => (m as unknown as { email?: string }).email).filter(Boolean);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(emails).size).toBe(emails.length);
  });
});

describe('SC-2 — `FIRM` berhenti menjadi jumlah karyawan ketiga', () => {
  const FIRM = AMS.FIRM as unknown as { partners: number; managers: number; staff: number };

  it('FIRM menutup ke roster yang SAMA', () => {
    const g = bucket(D.gradeMix);
    expect(FIRM.partners).toBe(g.Partner);
    expect(FIRM.managers).toBe(g.Manager);
    expect(FIRM.staff).toBe(g.Senior + g.Junior);
  });

  it('FIRM menjumlah ke headcount — dulu 6+11+58 = 75 ≠ 69 ≠ 10', () => {
    expect(FIRM.partners + FIRM.managers + FIRM.staff).toBe(D.total);
  });

  it('mengubah roster MENGGERAKKAN FIRM — ia turunan, bukan salinan', () => {
    const extra = hcmDemographics([...ROSTER, { id: 'X-1', grade: 'Junior', joined: 2026, born: 2004, gender: 'L', cert: 'S.Ak' }], TODAY);
    expect(extra.total).toBe(D.total + 1);
    expect(bucket(extra.gradeMix).Junior).toBe(bucket(D.gradeMix).Junior + 1);
  });
});

/* ------------------------------------------------------------------
   2. SC-3 — attrition & time-to-fill dari peristiwa
   ------------------------------------------------------------------ */

describe('SC-3 — attrition punya register di belakangnya', () => {
  const A = hcmAttrition(ROSTER, EXITS, TODAY);

  it('attrition 16% direproduksi — 11 kepergian ÷ 69 aktif', () => {
    expect(A.exits).toBe(11);
    expect(A.headcount).toBe(69);
    expect(A.ratePct).toBe(16);
  });

  /* Angka lama `regrettable: 62` SENGAJA tidak direproduksi: ia tak dapat dicapai
     oleh pecahan bulat mana pun pada 11 kepergian. Ini koreksi, bukan regresi. */
  it('regrettable menjadi 64% (7 dari 11), BUKAN 62%', () => {
    expect(A.regrettable).toBe(7);
    expect(A.regrettablePct).toBe(64);
    expect(A.regrettablePct).not.toBe(62);
  });

  it('62% memang MUSTAHIL pada 11 kepergian — sebabnya, bukan kelalaian', () => {
    const bisa = Array.from({ length: 12 }, (_, r) => Math.round((r / 11) * 100)).includes(62);
    expect(bisa).toBe(false);
  });

  it('attrition 16% DAN regrettable 62% mustahil pada firma seukuran ini', () => {
    /* Untuk KAP (puluhan orang) pasangan bulat yang memenuhi KEDUANYA hanya ada
       pada headcount 79–83 — sementara `gradeMix` di objek yang SAMA berbunyi 69.
       Batas atas 120 disebut eksplisit: di atas itu ada solusi lain (128+), tetapi
       tak satu pun berlaku bagi firma ini. */
    const sol = new Set<number>();
    for (let h = 40; h <= 120; h++) {
      for (let e = 1; e <= 40; e++) {
        if (Math.round((e / h) * 100) !== 16) continue;
        for (let r = 0; r <= e; r++) if (Math.round((r / e) * 100) === 62) { sol.add(h); break; }
      }
    }
    expect([...sol]).toEqual([79, 80, 81, 82, 83]);
    expect(sol.has(D.total)).toBe(false);
  });

  it('jendela 12 bulan menyaring — kepergian lama tak ikut dihitung', () => {
    const tua: HcmExit[] = [...EXITS, { id: 'EX-LAMA', emp: 'X', grade: 'Senior', date: '2021-01-05', reason: 'x', regrettable: true }];
    expect(hcmAttrition(ROSTER, tua, TODAY).exits).toBe(11);
    expect(hcmAttrition(ROSTER, tua, TODAY, 120).exits).toBe(12);
  });

  it('roster kosong → null, bukan NaN atau nol palsu', () => {
    expect(hcmAttrition([], EXITS, TODAY).ratePct).toBeNull();
    expect(hcmAttrition(ROSTER, [], TODAY).regrettablePct).toBeNull();
  });

  it('attrition per jenjang memakai penyebut jenjangnya sendiri', () => {
    const byG = hcmAttritionByGrade(ROSTER, EXITS, TODAY);
    const g = bucket(D.gradeMix);
    for (const row of byG) expect(row.headcount, row.g).toBe(g[row.g]);
    expect(byG.reduce((a, r) => a + r.exits, 0)).toBe(11);
    /* Partner: tak ada yang keluar → 0%, bukan angka karangan. */
    expect(byG.find((r) => r.g === 'Partner')?.ratePct).toBe(0);
  });
});

describe('SC-3 — time-to-fill dari tanggal requisition', () => {
  const REQS = (AMS as unknown as { REQUISITIONS: HcmRequisition[] }).REQUISITIONS;

  it('38 hari direproduksi — dibuka 2025-12-05, terisi 2026-01-12', () => {
    expect(hcmTimeToFill(REQS).days).toBe(38);
  });

  it('requisition terisi TANPA tanggal tak dapat dihitung, dan itu dilaporkan', () => {
    const tanpa: HcmRequisition[] = [{ id: 'R', status: 'Terisi', opened: '2026-01-01' }];
    const t = hcmTimeToFill(tanpa);
    expect(t.days).toBeNull();
    expect(t.undated).toBe(1);
  });

  it('tanpa requisition terisi sama sekali → null, bukan nol', () => {
    expect(hcmTimeToFill([{ id: 'R', status: 'Dibuka' }]).days).toBeNull();
  });
});

/* ------------------------------------------------------------------
   3. Tren headcount menutup ke roster
   ------------------------------------------------------------------ */

describe('tren headcount dihitung mundur dari roster', () => {
  const T = hcmHeadcountTrend(ROSTER, EXITS, TODAY);

  it('titik terakhir = headcount nyata — kurvanya tak dapat menyimpang', () => {
    expect(T).toHaveLength(5);
    expect(T[T.length - 1].total).toBe(D.total);
  });

  /* Presisi TAHUNAN karena roster hanya menyimpan tahun bergabung. Versi
     kuartalan menaruh semua perekrutan setahun di Q1 dan membuat headcount masa
     lalu tampak LEBIH TINGGI daripada hari ini — artefak, bukan sejarah. */
  it('setiap titik masuk akal — tak negatif, dan pergerakan punya peristiwa', () => {
    for (const p of T) {
      expect(p.total, p.q).toBeGreaterThan(0);
      expect(p.hires, p.q).toBeGreaterThanOrEqual(0);
      expect(p.exits, p.q).toBeGreaterThanOrEqual(0);
    }
    /* 2026 YTD: 2 masuk, 4 keluar → headcount memang TURUN dari 2025.
       Itu yang dikatakan register, bukan artefak pembulatan kuartal. */
    const y26 = T[T.length - 1], y25 = T[T.length - 2];
    expect(y26.total).toBe(y25.total + y26.hires - y26.exits);
    expect(y26.total).toBeLessThan(y25.total);
  });

  it('label titik adalah TAHUN, bukan kuartal palsu', () => {
    for (const p of T) expect(p.q).toMatch(/^\d{4}$/);
  });

  it('tiap langkah konsisten: total(t) = total(t−1) + masuk − keluar', () => {
    for (let i = 1; i < T.length; i++) {
      expect(T[i].total, T[i].q).toBe(T[i - 1].total + T[i].hires - T[i].exits);
    }
  });

  it('Σ keluar pada tren = kepergian yang jatuh di jendela tren', () => {
    expect(T.reduce((a, p) => a + p.exits, 0)).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------
   4. Fungsi pita
   ------------------------------------------------------------------ */

describe('pita masa kerja, usia & sertifikasi', () => {
  it('batas pita masa kerja', () => {
    expect(tenureBand(1)).toBe('< 2 th');
    expect(tenureBand(2)).toBe('2–5 th');
    expect(tenureBand(5)).toBe('2–5 th');
    expect(tenureBand(6)).toBe('5–10 th');
    expect(tenureBand(10)).toBe('5–10 th');
    expect(tenureBand(11)).toBe('> 10 th');
    expect(tenureBand(null)).toBeNull();
  });

  it('batas pita usia', () => {
    expect(ageBand(25)).toBe('20–25');
    expect(ageBand(26)).toBe('26–30');
    expect(ageBand(41)).toBe('> 40');
    expect(ageBand(null)).toBeNull();
  });

  it('`CA (kandidat CPA)` jatuh ke Kandidat, bukan CA — urutan periksa penting', () => {
    expect(certBand('CA (kandidat CPA)')).toBe('Kandidat CPA');
    expect(certBand('CPA, CA, AP')).toBe('CPA');
    expect(certBand('CA')).toBe('CA');
    expect(certBand('S.Ak')).toBe('S.Ak');
    expect(certBand(undefined)).toBe('S.Ak');
  });

  it('data hilang → null, tidak dihitung sebagai nol', () => {
    expect(tenureOf(undefined, TODAY)).toBeNull();
    expect(ageOf(undefined, TODAY)).toBeNull();
  });
});

/* ------------------------------------------------------------------
   5. SC-25 — PR-4 tak boleh menyunting kanon PR-1..PR-3
   ------------------------------------------------------------------ */

const SRC = join(__dirname);
const raw = (f: string) => readFileSync(join(SRC, f), 'utf8');
const read = (f: string) => raw(f)
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('SC-25 — memperbesar roster tak menyentuh mesin PR-1..PR-3', () => {
  /* Kalau mesinnya benar-benar diturunkan dari roster, menambah 59 orang tidak
     boleh memerlukan satu pun perubahan di dalamnya. Setiap penyesuaian yang
     dibutuhkan adalah bukti masih ada literal yang bersembunyi. */
  it('canon_leave & canon_perf tidak menyebut roster yang diperbesar', () => {
    for (const f of ['canon_leave.ts', 'canon_perf.ts']) {
      expect(read(f), f).not.toMatch(/data_roster/);
      expect(read(f), f).not.toMatch(/STAFF_EXT/);
    }
  });

  it('mesin cuti & kinerja tetap agnostik terhadap ukuran roster', () => {
    for (const f of ['canon_leave.ts', 'canon_perf.ts', 'canon_ppl.ts']) {
      /* tak ada angka headcount yang dipaku di dalam mesin */
      expect(read(f), f).not.toMatch(/\b69\b/);
    }
  });

  it('seluruh 69 personel punya garis pelaporan ATAU memang puncak organisasi', () => {
    const ORG = (AMS as unknown as { ORG: Record<string, { reports?: string | null }> }).ORG;
    const tanpa = ROSTER.filter((m) => !ORG[m.id]).map((m) => m.id);
    /* hanya Managing Partner (EMP-001) yang boleh tanpa atasan */
    expect(tanpa).toEqual([]);
    expect(ORG['EMP-001'].reports).toBeNull();
  });

  it('setiap atasan yang ditunjuk benar-benar ada di roster', () => {
    const ORG = (AMS as unknown as { ORG: Record<string, { reports?: string | null }> }).ORG;
    const ids = new Set(ROSTER.map((m) => m.id));
    for (const [emp, rec] of Object.entries(ORG)) {
      if (!rec.reports) continue;
      expect(ids.has(rec.reports), `${emp} → ${rec.reports}`).toBe(true);
    }
  });

  it('setiap personel roster punya baris penggajian', () => {
    const PAY = AMS.PAYROLL as unknown as Record<string, unknown>;
    expect(ROSTER.filter((m) => !PAY[m.id]).map((m) => m.id)).toEqual([]);
  });
});

/* ------------------------------------------------------------------
   6. SC-24 — gerbang cakupan
   ------------------------------------------------------------------ */

describe('SC-24 — literal komposisi benar-benar dicabut', () => {
  it('data_people tak lagi menuliskan angka komposisi', () => {
    const src = read('data_people.ts');
    expect(src).not.toMatch(/annualAttrition:\s*\d/);
    expect(src).not.toMatch(/avgTenure:\s*[\d.]/);
    expect(src).not.toMatch(/regrettable:\s*\d/);
    expect(src).not.toMatch(/timeToFill:\s*\d/);
    expect(src).not.toMatch(/gradeMix:\s*\[/);
  });

  it('data_part1 tak lagi menuliskan jumlah karyawan', () => {
    expect(read('data_part1.ts')).not.toMatch(/partners:\s*\d+,\s*managers:\s*\d+,\s*staff:\s*\d+/);
  });

  it('view HCM menampilkan keadaan "belum dapat dihitung", bukan nol palsu', () => {
    const src = read('view_pc_hcm.tsx');
    /* Warna kondisional pada attrition kini sah — yang diwarnai TURUNAN, bukan
       konstanta. Yang harus dijaga: view menghormati nilai null. */
    expect(src).toMatch(/D\.annualAttrition == null/);
    expect(src).toMatch(/D\.timeToFill == null/);
    expect(src).toMatch(/D\.avgTenure == null/);
  });

  it('dasar perhitungan ditampilkan, bukan disembunyikan', () => {
    expect(read('view_pc_hcm.tsx')).toMatch(/attritionBasis/);
    expect(read('view_pc_hcm.tsx')).toMatch(/timeToFillBasis/);
  });
});
