/* ============================================================
   PRD `docs/prd-regulatory-reference-annual.md` · PR-1 · SC-1 · SC-2 · SC-7.

   Cacat yang ditutup: data referensi regulatori di aplikasi ini berubah
   menurut KALENDER, tetapi tiga di antaranya punya tiga perilaku berbeda
   ketika tahunnya lewat — dan salah satunya (batas upah BPJS) tak punya
   perilaku apa pun; ia sekadar terus menghitung.

   PR-1 membangun mekanismenya dan memindahkan kalender hari libur ke
   sana LEBIH DULU, karena ia satu-satunya yang sudah benar hari ini:
   kalau migrasi menggeser perilakunya, kesalahannya ada pada mekanisme
   baru, bukan pada data. Karena itu bagian 3 seluruhnya nol-delta.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { AMS } from './data';
import { regrefFor, regrefIssues, regrefSpan, isIsoDate } from './canon_regref';
import type { RegRefSet } from './canon_regref';
import { holidayCoverage, holidayDates, holidayEntries, workingDaySpan } from './canon_leave';
import type { HolidayCalendar } from './canon_leave';

const CAL = AMS.LEAVE_HOLIDAYS as unknown as HolidayCalendar;

const OPTS_BLOCK = { label: 'Uji', enforcement: 'block' as const };
const OPTS_WARN = { label: 'Uji', enforcement: 'warn' as const };

function set(from: string, to: string | null, value: number, verified = true): RegRefSet<number> {
  return {
    effectiveFrom: from, effectiveTo: to, value,
    basis: 'Uji', sourceDoc: verified ? 'Dokumen Uji' : '',
    verified, note: verified ? '' : 'belum dicocokkan',
  };
}

/* ------------------------------------------------------------------
   1. SC-2 — tak ada "yang terdekat"
   ------------------------------------------------------------------ */

describe('SC-2 — set yang tak mencakup tanggalnya bukan jawaban yang mendekati', () => {
  const SETS = [set('2025-01-01', '2025-12-31', 10), set('2026-01-01', '2026-12-31', 20)];

  it('tanggal di dalam rentang mengembalikan set tahun itu', () => {
    expect(regrefFor(SETS, '2026-03-15', OPTS_BLOCK).value).toBe(20);
    expect(regrefFor(SETS, '2025-12-31', OPTS_BLOCK).value).toBe(10);
    expect(regrefFor(SETS, '2026-01-01', OPTS_BLOCK).value).toBe(20);
  });

  it('tanggal DI LUAR cakupan mengembalikan null — BUKAN tahun terdekat', () => {
    const look = regrefFor(SETS, '2027-01-01', OPTS_BLOCK);
    expect(look.status).toBe('no-coverage');
    expect(look.value).toBeNull();
    expect(look.set).toBeNull();
    /* inilah kesalahan yang hendak dicegah: memakai 20 (angka 2026) untuk 2027 */
    expect(look.value).not.toBe(20);
  });

  it('yang menyangkut uang MEMBLOKIR; yang tidak cukup memperingatkan', () => {
    expect(regrefFor(SETS, '2027-01-01', OPTS_BLOCK).blocked).toBe(true);
    expect(regrefFor(SETS, '2027-01-01', OPTS_WARN).blocked).toBe(false);
    /* dan keduanya tetap menolak menyerahkan nilai tahun lain */
    expect(regrefFor(SETS, '2027-01-01', OPTS_WARN).value).toBeNull();
  });

  it('alasan penolakan menyebut data & tanggalnya, bukan "terjadi kesalahan"', () => {
    const note = regrefFor(SETS, '2027-06-01', { label: 'Batas upah BPJS', enforcement: 'block' }).note;
    expect(note).toContain('Batas upah BPJS');
    expect(note).toContain('2027-06-01');
    expect(note).toMatch(/DITOLAK/);
  });

  it('rentang terbuka (effectiveTo null) berlaku ke depan', () => {
    const terbuka = [set('2024-01-01', null, 7)];
    expect(regrefFor(terbuka, '2031-12-31', OPTS_BLOCK).value).toBe(7);
    expect(regrefFor(terbuka, '2023-12-31', OPTS_BLOCK).status).toBe('no-coverage');
  });

  it('tanggal yang tak dapat dibaca ditolak, tidak ditebak', () => {
    for (const bad of ['', 'kemarin', '2026-3-1', '01-01-2026']) {
      const look = regrefFor(SETS, bad, OPTS_BLOCK);
      expect(look.status, bad).toBe('bad-date');
      expect(look.value, bad).toBeNull();
      expect(look.blocked, bad).toBe(true);
    }
    expect(isIsoDate('2026-03-01')).toBe(true);
  });
});

/* ------------------------------------------------------------------
   2. SC-1 — belum terverifikasi ≠ tak tercakup
   ------------------------------------------------------------------ */

describe('SC-1 — belum dicocokkan tetap menghitung, dengan penanda', () => {
  const SETS = [set('2026-01-01', '2026-12-31', 20, false)];

  it('nilainya diserahkan, tetapi statusnya berkata belum dicocokkan', () => {
    const look = regrefFor(SETS, '2026-05-01', OPTS_BLOCK);
    expect(look.status).toBe('unverified');
    expect(look.value).toBe(20);
    expect(look.note).toBeTruthy();
  });

  it('belum terverifikasi TIDAK memblokir — memblokirnya akan menggeser angka tanpa alasan', () => {
    /* Ini keadaan tabel TER hari ini: lapisannya direkonstruksi, jujur mengatakannya,
       dan tetap dipakai. Tak tercakup adalah cerita lain — itu memblokir. */
    expect(regrefFor(SETS, '2026-05-01', OPTS_BLOCK).blocked).toBe(false);
    expect(regrefFor(SETS, '2027-05-01', OPTS_BLOCK).blocked).toBe(true);
  });
});

/* ------------------------------------------------------------------
   3. Integritas struktural registry
   ------------------------------------------------------------------ */

describe('registry yang tumpang tindih atau cacat DILAPORKAN', () => {
  it('tumpang tindih terdeteksi', () => {
    const bad = [set('2026-01-01', '2026-12-31', 1), set('2026-06-01', '2026-12-31', 2)];
    expect(regrefIssues(bad, 'Uji').join(' ')).toMatch(/tumpang tindih/);
  });

  it('rentang terbuka di tengah terdeteksi sebagai tumpang tindih', () => {
    const bad = [set('2025-01-01', null, 1), set('2026-01-01', '2026-12-31', 2)];
    expect(regrefIssues(bad, 'Uji').join(' ')).toMatch(/tumpang tindih/);
  });

  it('effectiveTo mendahului effectiveFrom terdeteksi', () => {
    expect(regrefIssues([set('2026-12-31', '2026-01-01', 1)], 'Uji').join(' ')).toMatch(/mendahului/);
  });

  it('verified tanpa dokumen sumber terdeteksi', () => {
    const bad: RegRefSet<number>[] = [{ ...set('2026-01-01', '2026-12-31', 1), sourceDoc: '' }];
    expect(regrefIssues(bad, 'Uji').join(' ')).toMatch(/dokumen sumber/);
  });

  it('belum terverifikasi tanpa menyatakan APA yang belum terdeteksi', () => {
    const bad: RegRefSet<number>[] = [{ ...set('2026-01-01', '2026-12-31', 1, false), note: '' }];
    expect(regrefIssues(bad, 'Uji').join(' ')).toMatch(/apa yang belum/);
  });

  it('registry kalender hari libur yang NYATA bersih', () => {
    expect(regrefIssues(CAL.sets, 'Kalender hari libur')).toEqual([]);
  });

  it('setiap entri libur jatuh DI DALAM rentang setnya sendiri', () => {
    for (const s of CAL.sets) {
      for (const h of s.value) {
        expect(h.date >= s.effectiveFrom, h.date).toBe(true);
        expect(s.effectiveTo == null || h.date <= s.effectiveTo, h.date).toBe(true);
      }
    }
  });

  it('span registry dapat dinyatakan untuk halaman referensi', () => {
    expect(regrefSpan(CAL.sets)).toEqual({ from: '2026-01-01', to: '2026-12-31' });
    expect(regrefSpan([])).toBeNull();
  });
});

/* ------------------------------------------------------------------
   4. SC-7 — migrasi kalender hari libur NOL-DELTA
   ------------------------------------------------------------------ */

describe('SC-7 — kalender hari libur berpindah bentuk tanpa berpindah perilaku', () => {
  it('2026 terisi & terkonfirmasi, tanpa catatan', () => {
    const c = holidayCoverage(CAL, 2026);
    expect(c.entries).toBe(16);
    expect(c.usable).toBe(true);
    expect(c.confirmed).toBe(true);
    expect(c.note).toBe('');
  });

  it.each([2024, 2025, 2027, 2028])('%i belum diisi, dan MENGATAKANNYA', (year) => {
    const c = holidayCoverage(CAL, year);
    expect(c.entries).toBe(0);
    expect(c.usable).toBe(false);
    expect(c.confirmed).toBe(false);
    expect(c.note).toMatch(/LEBIH BANYAK/);
  });

  it('hari kerja 2027 dihitung tanpa libur — memperingatkan, TIDAK memblokir', () => {
    /* Cuti bukan uang: menolak menghitungnya lebih merugikan daripada
       menghitungnya dengan penanda. Bandingkan dengan BPJS (PR-2). */
    const span = workingDaySpan('2027-01-11', '2027-01-15', CAL);
    expect(span.valid).toBe(true);
    expect(span.workingDays).toBe(5);
    expect(holidayCoverage(CAL, 2027).note).toBeTruthy();
  });

  it('semua tanggal libur terjangkau lintas set', () => {
    expect(holidayDates(CAL).size).toBe(16);
    expect(holidayEntries(CAL)).toHaveLength(16);
    expect(holidayDates(CAL).has('2026-08-17')).toBe(true);
  });

  it('libur yang jatuh pada hari kerja tetap mengurangi hari kerja', () => {
    /* 17 Agustus 2026 = Senin. Nol-delta terhadap perilaku sebelum migrasi. */
    const dengan = workingDaySpan('2026-08-17', '2026-08-21', CAL).workingDays;
    const tanpa = workingDaySpan('2026-08-17', '2026-08-21', undefined).workingDays;
    expect(tanpa).toBe(5);
    expect(dengan).toBe(4);
  });

  it('cuti bersama masih SENGAJA kosong — dan itu terlihat, bukan tersembunyi', () => {
    /* Q-4 PRD: SKB memuat cuti bersama; selama ia kosong, hari kerja LEBIH-hitung.
       Uji ini memaku keadaannya supaya tak terlupakan saat datanya tersedia. */
    expect(holidayEntries(CAL).filter((h) => h.kind === 'cuti-bersama')).toHaveLength(0);
  });
});
