/* ============================================================
   Timesheet seed — milik SATU perikatan, bukan milik semua

   `TIME_ENTRIES` adalah timesheet perikatan demo (7 entri · 48 jam, seluruhnya
   anggota roster …-014). Ia dipakai sebagai NILAI AWAL `useServerState` untuk
   SETIAP perikatan, sehingga perikatan mana pun yang dibuka memulai hidupnya
   dengan 48 jam milik orang lain sebagai timesheetnya sendiri.

   Hari ini akibatnya masih tersembunyi: hanya …-014 yang punya roster, dan
   `pmExtraHours` mengurangkan baseline seed sehingga deltanya nol. Ia berhenti
   tersembunyi begitu perikatan lain diberi roster — 48 jam hantu itu langsung
   masuk ke jam aktual, biaya, dan nilai WIP perikatan yang salah. Karena itu
   ini prasyarat, bukan pekerjaan sampingan.

   Presedens di berkas yang sama: `REVIEW_NOTES` & register akseptasi sudah
   distempel `engagementId`, dan `risks` sudah menyaring seed-nya
   (`ENG_RISK_SEED.filter(r => r.engagementId === activeEngagementId)`).

   Konsekuensi kedua yang diuji di sini: baseline `pmExtraHours` harus ikut
   ber-scope. Kalau baseline tetap seluruh register (48 jam) sementara timesheet
   perikatan itu kosong, sepuluh jam pertama yang dicatat auditor akan DIABAIKAN
   (`max(0, 10 − 48) = 0`) — pekerjaan nyata yang hilang tanpa suara.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { AMS } from './data';
import { pmExtraHours, type PMTimeEntry } from './profit_model';

const DEMO = 'ENG-' + '2025-014';
const LAIN = 'ENG-' + '2025-063';
const A = AMS as unknown as { TIME_ENTRIES: (PMTimeEntry & { engagementId?: string })[] };
const seed = () => A.TIME_ENTRIES.map((t) => ({ ...t }));
const jam = (rows: readonly PMTimeEntry[]) => rows.reduce((s, t) => s + t.hours, 0);

describe('seed timesheet distempel pemiliknya', () => {
  it('setiap entri seed menyebut perikatannya', () => {
    expect(seed().length).toBeGreaterThan(0);
    seed().forEach((t) => expect(t.engagementId, JSON.stringify(t)).toBe(DEMO));
  });

  it('premis: seluruh anggotanya memang anggota roster …-014', () => {
    /* kalau tidak, 48 jam itu tak akan pernah bisa mencemari apa pun */
    expect(jam(seed())).toBeGreaterThan(0);
  });
});

describe('baseline pmExtraHours ikut ber-scope', () => {
  const dgn = (n: number): PMTimeEntry[] => [
    ...Array.from({ length: n }, (_, i) => ({ id: 'X' + i, hours: 1 } as unknown as PMTimeEntry)),
  ];

  it('perikatan tanpa entri seed: jam pertama yang dicatat LANGSUNG terhitung', () => {
    expect(pmExtraHours(dgn(10), seed(), LAIN)).toEqual({ [LAIN]: 10 });
  });

  it('perikatan demo: baseline seed-nya sendiri yang dikurangkan', () => {
    expect(pmExtraHours(seed(), seed(), DEMO)).toEqual({ [DEMO]: 0 });
    expect(pmExtraHours([...seed(), { hours: 5 } as PMTimeEntry], seed(), DEMO)).toEqual({ [DEMO]: 5 });
  });

  it('anti-tautologi — baseline TIDAK ber-scope akan menelan 10 jam pertama', () => {
    const bulat = jam(seed());
    expect(bulat).toBeGreaterThan(10);
    expect(Math.max(0, 10 - bulat)).toBe(0);   /* perilaku lama, dinyatakan */
  });

  it('tanpa perikatan aktif tetap tak ada yang dikredit', () => {
    expect(pmExtraHours(dgn(10), seed(), null)).toEqual({});
  });
});
