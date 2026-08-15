/* ============================================================
   PRD `docs/prd-sdm-kepatuhan-deepening.md` · PR-1 · SC-4 · SC-5 · SC-6.

   Cacat yang ditutup: menyetujui permintaan cuti TIDAK mengubah saldo siapa
   pun. `LEAVE_BALANCE.used` adalah literal; `LEAVE_REQUESTS` daftar terpisah.
   Kolom "Sisa", KPI "Pemanfaatan Kuota", dan peringatan `sisa ≤ 2` semuanya
   berdiri di atas angka yang tak pernah disentuh persetujuan apa pun.

   Uji di sini dirancang agar GAGAL bila cacat itu kembali.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AMS } from './data';
import {
  LEAVE_POLICY, LEAVE_TYPES, approvalCheck, entitlementOf, evaluateLeaveRow,
  holidayCoverage, leaveFirmSummary, leaveLedger, leaveLedgerOf, leaveStateOn,
  leaveTypeOf, onLeaveOn, workingDaySpan,
} from './canon_leave';
import type { HolidayCalendar, LeaveRequestInput } from './canon_leave';

const CAL = AMS.LEAVE_HOLIDAYS as unknown as HolidayCalendar;
const REQS = AMS.LEAVE_REQUESTS as unknown as LeaveRequestInput[];
const CARRY = AMS.LEAVE_BALANCE as unknown as Record<string, { carry?: number }>;
const TODAY = String(AMS.TODAY);
const ROSTER = [
  ...(AMS.STAFF as unknown as { id: string; joined?: number }[]),
  ...(AMS.FIRM_STAFF as unknown as { id: string; joined?: number }[]),
];

const ledgerFor = (emp: string, reqs: LeaveRequestInput[] = REQS) =>
  leaveLedgerOf(emp, ROSTER.find((s) => s.id === emp)?.joined, reqs, CARRY[emp]?.carry || 0, TODAY, CAL);

/* ------------------------------------------------------------------
   1. Jangkar nol-delta — pencabutan literal tidak menggeser satu angka pun
   ------------------------------------------------------------------ */

/** `used` LITERAL yang dulu ada di `LEAVE_BALANCE` (data_part2, sebelum PR-1).
 *  Register peristiwa harus mereproduksinya PERSIS, per orang — bukan totalnya saja. */
const USED_SEBELUM_PR1: Record<string, number> = {
  'EMP-001': 3, 'EMP-002': 5, 'EMP-003': 2, 'EMP-007': 4,
  'EMP-008': 6, 'EMP-012': 8, 'EMP-021': 1, 'EMP-022': 3,
  'EMP-031': 0, 'EMP-032': 2, 'EMP-501': 2, 'EMP-601': 4,
};

describe('nol-delta — `used` turunan menutup ke literal lama, satu per satu', () => {
  it.each(Object.entries(USED_SEBELUM_PR1))('%s terpakai %i hari', (emp, expected) => {
    expect(ledgerFor(emp).used).toBe(expected);
  });

  it('total firma tak bergeser', () => {
    const total = Object.values(USED_SEBELUM_PR1).reduce((a, b) => a + b, 0);
    expect(leaveFirmSummary(leaveLedger(ROSTER, REQS, CARRY, TODAY, CAL)).used).toBe(total);
  });

  it('`ent` & `used` benar-benar DICABUT dari data — bukan sekadar tak dibaca', () => {
    const bal = CARRY as unknown as Record<string, Record<string, unknown>>;
    for (const emp of Object.keys(USED_SEBELUM_PR1)) {
      expect(Object.keys(bal[emp]), emp).toEqual(['carry']);
    }
  });
});

/* ------------------------------------------------------------------
   2. SC-4 — persetujuan yang benar-benar mengurangi saldo
   ------------------------------------------------------------------ */

describe('SC-4 — menyetujui cuti mengubah saldo pemohonnya', () => {
  const approve = (id: string) => REQS.map((r) => (r.id === id ? { ...r, status: 'Disetujui' } : r));

  it('LV-0048 (Dimas, 2 hari kerja) menaikkan terpakai 1 → 3 dan menurunkan sisa', () => {
    const before = ledgerFor('EMP-021');
    expect(before.used).toBe(1);
    expect(before.pending).toBe(2);

    const after = ledgerFor('EMP-021', approve('LV-0048'));
    expect(after.used).toBe(3);
    expect(after.remaining).toBe(before.remaining - 2);
    /* yang menunggu sudah jadi terpakai — tak boleh dihitung dua kali. */
    expect(after.pending).toBe(0);
    expect(after.projected).toBe(before.projected);
  });

  it('menolak permintaan TIDAK mengubah terpakai', () => {
    const rejected = REQS.map((r) => (r.id === 'LV-0048' ? { ...r, status: 'Ditolak' } : r));
    const after = ledgerFor('EMP-021', rejected);
    expect(after.used).toBe(1);
    expect(after.pending).toBe(0);
  });

  it('sakit & cuti penting DISETUJUI tidak memotong kuota tahunan', () => {
    /* LV-0049 Sakit (Rina) · LV-0051 Cuti Menikah (Sinta) */
    const rina = ledgerFor('EMP-032', approve('LV-0049'));
    expect(rina.used).toBe(USED_SEBELUM_PR1['EMP-032']);
    expect(rina.nonQuotaDays).toBeGreaterThan(0);

    const sinta = ledgerFor('EMP-022', approve('LV-0051'));
    expect(sinta.used).toBe(USED_SEBELUM_PR1['EMP-022']);
    expect(sinta.nonQuotaDays).toBe(3);
  });
});

/* ------------------------------------------------------------------
   3. SC-5 — hari kerja diturunkan, angka yang dinyatakan hanya dibandingkan
   ------------------------------------------------------------------ */

describe('SC-5 — hari kerja = rentang − akhir pekan − hari libur', () => {
  it('rentang Senin–Jumat penuh = 5 hari kerja', () => {
    const s = workingDaySpan('2026-03-09', '2026-03-13', CAL);
    expect(s).toMatchObject({ calendarDays: 5, weekendDays: 0, holidayDays: 0, workingDays: 5, valid: true });
  });

  it('hari libur di tengah rentang dikurangkan (Isra Mikraj 16 Jan 2026)', () => {
    const s = workingDaySpan('2026-01-12', '2026-01-20', CAL);
    expect(s.calendarDays).toBe(9);
    expect(s.weekendDays).toBe(2);
    expect(s.holidayDays).toBe(1);
    expect(s.workingDays).toBe(6);
  });

  it('hari libur yang jatuh di akhir pekan tidak dihitung dua kali', () => {
    /* 21 Mar 2026 (Idulfitri hari kedua) adalah Sabtu. */
    const s = workingDaySpan('2026-03-21', '2026-03-21', CAL);
    expect(s.weekendDays).toBe(1);
    expect(s.holidayDays).toBe(0);
    expect(s.workingDays).toBe(0);
  });

  it('tanggal tidak valid / terbalik ditolak, bukan diam-diam dihitung', () => {
    expect(workingDaySpan('2026-02-30', '2026-03-01', CAL).valid).toBe(false);
    expect(workingDaySpan('2026-03-10', '2026-03-01', CAL).valid).toBe(false);
    expect(workingDaySpan('bukan-tanggal', '2026-03-01', CAL).valid).toBe(false);
  });

  /* Dua baris seed yang cacatnya BARU TERLIHAT setelah hari kerja dihitung.
     Keduanya SENGAJA dipertahankan apa adanya: memperbaiki tanggalnya akan
     menghapus bukti bahwa gerbang ini bekerja. */
  it('LV-0050 menyatakan 4 hari padahal rentangnya hanya 2 hari kerja', () => {
    const row = evaluateLeaveRow(REQS.find((r) => r.id === 'LV-0050')!, CAL);
    expect(row.declaredDays).toBe(4);
    /* 1–4 Apr 2026: Rab–Sab, 3 Apr Wafat Isa Almasih (Jumat), 4 Apr Sabtu. */
    expect(row.days).toBe(2);
    expect(row.flags).toContain('hari-tidak-cocok');
  });

  it('LV-0049 menyatakan 2 hari padahal berakhir Sabtu', () => {
    const row = evaluateLeaveRow(REQS.find((r) => r.id === 'LV-0049')!, CAL);
    expect(row.declaredDays).toBe(2);
    expect(row.days).toBe(1);
    expect(row.flags).toContain('hari-tidak-cocok');
  });

  it('buku besar memakai hari kerja TERHITUNG, bukan angka yang dinyatakan', () => {
    const approved = REQS.map((r) => (r.id === 'LV-0050' ? { ...r, status: 'Disetujui' } : r));
    /* Bayu dulu akan terpotong 4 hari untuk absen 2 hari kerja. */
    expect(ledgerFor('EMP-008', approved).used).toBe(USED_SEBELUM_PR1['EMP-008'] + 2);
  });

  it('setiap baris seed yang TIDAK ditandai memang cocok hari kerjanya', () => {
    for (const r of REQS) {
      const row = evaluateLeaveRow(r, CAL);
      if (row.flags.includes('hari-tidak-cocok')) continue;
      expect(row.days, r.id).toBe(row.declaredDays);
    }
  });
});

/* ------------------------------------------------------------------
   4. SC-6 — hak cuti dari masa kerja, saldo bawaan punya masa berlaku
   ------------------------------------------------------------------ */

describe('SC-6 — hak cuti diturunkan dari tahun bergabung', () => {
  it('masa kerja ≥ 2 tahun penuh → 12 hari, tanpa asumsi', () => {
    const e = entitlementOf(2020, '2026-03-09');
    expect(e).toMatchObject({ days: 12, eligible: true, precision: 'tahun', assumed: false });
  });

  it('bergabung TAHUN INI → belum berhak (UU 13/2003 Ps. 79 minta 12 bulan)', () => {
    const e = entitlementOf(2026, '2026-03-09');
    expect(e.eligible).toBe(false);
    expect(e.days).toBe(0);
  });

  it('bergabung TAHUN LALU → dijawab "diasumsikan", bukan dipastikan', () => {
    const e = entitlementOf(2025, '2026-03-09');
    expect(e.eligible).toBe(true);
    expect(e.assumed).toBe(true);
    expect(e.note).toMatch(/DIASUMSIKAN/);
  });

  it('tanggal penuh menjawab pasti — 11 bulan belum berhak, 12 bulan berhak', () => {
    expect(entitlementOf('2025-04-10', '2026-03-09')).toMatchObject({ eligible: false, assumed: false, precision: 'tanggal' });
    expect(entitlementOf('2025-03-09', '2026-03-09')).toMatchObject({ eligible: true, assumed: false, precision: 'tanggal' });
  });

  it('tanggal bergabung tak tercatat → hak TIDAK diklaim', () => {
    expect(entitlementOf(undefined, '2026-03-09')).toMatchObject({ eligible: false, days: 0, precision: 'tidak-tercatat' });
  });

  it('seluruh roster nyata memakai 12 hari — pencabutan `ent` literal nol-delta', () => {
    for (const emp of Object.keys(USED_SEBELUM_PR1)) {
      expect(ledgerFor(emp).entitlement.days, emp).toBe(12);
    }
  });

  it('saldo bawaan ter-cap dan hangus setelah bulan kedaluwarsa', () => {
    const big = leaveLedgerOf('X', 2020, [], 40, '2026-03-09', CAL);
    expect(big.carryUsable).toBe(LEAVE_POLICY.carryForwardCap);
    expect(big.carryForfeited).toBe(40 - LEAVE_POLICY.carryForwardCap);

    const after = leaveLedgerOf('X', 2020, [], 3, '2026-07-01', CAL);
    expect(after.carryExpired).toBe(true);
    expect(after.carryUsable).toBe(0);
    expect(after.quota).toBe(12);
  });

  it('carry roster nyata belum hangus pada TODAY — nol-delta pada kuota', () => {
    for (const emp of Object.keys(USED_SEBELUM_PR1)) {
      const l = ledgerFor(emp);
      expect(l.carryUsable, emp).toBe(CARRY[emp]?.carry || 0);
      expect(l.quota, emp).toBe(12 + (CARRY[emp]?.carry || 0));
    }
  });
});

/* ------------------------------------------------------------------
   5. Gerbang persetujuan — ia harus PERNAH berkata tidak
   ------------------------------------------------------------------ */

describe('gerbang persetujuan menolak, bukan sekadar menghias', () => {
  it('kuota tidak cukup → ditolak dengan angka kekurangannya', () => {
    /* hak 12, sudah terpakai 10, minta 5 → kurang 3. */
    const l = leaveLedgerOf('E1', 2020, [
      { id: 'A', emp: 'E1', type: 'Cuti Tahunan', from: '2026-01-05', to: '2026-01-16', days: 9, status: 'Disetujui' },
      { id: 'B', emp: 'E1', type: 'Cuti Tahunan', from: '2026-02-02', to: '2026-02-03', days: 2, status: 'Disetujui' },
      { id: 'C', emp: 'E1', type: 'Cuti Tahunan', from: '2026-02-09', to: '2026-02-13', days: 5, status: 'Menunggu' },
    ], 0, '2026-03-09', CAL);
    expect(l.used).toBe(11);
    expect(l.remaining).toBe(1);
    const chk = approvalCheck(l, 'C');
    expect(chk.ok).toBe(false);
    expect(chk.wouldRemain).toBe(-4);
    expect(chk.reason).toMatch(/kurang 4 hari/);
  });

  it('kuota cukup → diizinkan, dengan sisa setelahnya', () => {
    const l = ledgerFor('EMP-021');
    const chk = approvalCheck(l, 'LV-0048', 'EMP-007');
    expect(chk.ok).toBe(true);
    expect(chk.wouldRemain).toBe(l.remaining - 2);
  });

  it('pemohon tidak dapat menyetujui permintaannya sendiri', () => {
    const l = ledgerFor('EMP-021');
    const chk = approvalCheck(l, 'LV-0048', 'EMP-021');
    expect(chk.ok).toBe(false);
    expect(chk.reason).toMatch(/pemohonnya sendiri/);
  });

  it('rentang tidak valid tak dapat disetujui', () => {
    const l = leaveLedgerOf('E1', 2020, [
      { id: 'X', emp: 'E1', type: 'Cuti Tahunan', from: '2026-03-10', to: '2026-03-01', days: 1, status: 'Menunggu' },
    ], 0, '2026-03-09', CAL);
    expect(approvalCheck(l, 'X').ok).toBe(false);
  });

  it('cuti penting melebihi batas UU ditolak (menikah > 3 hari)', () => {
    const l = leaveLedgerOf('E1', 2020, [
      { id: 'M', emp: 'E1', type: 'Cuti Menikah', from: '2026-02-02', to: '2026-02-06', days: 5, status: 'Menunggu' },
    ], 0, '2026-03-09', CAL);
    const chk = approvalCheck(l, 'M');
    expect(chk.ok).toBe(false);
    expect(chk.reason).toMatch(/3 hari per kejadian/);
  });

  it('yang belum berhak tak dapat disetujui cuti tahunannya', () => {
    const l = leaveLedgerOf('E1', 2026, [
      { id: 'N', emp: 'E1', type: 'Cuti Tahunan', from: '2026-02-02', to: '2026-02-03', days: 2, status: 'Menunggu' },
    ], 0, '2026-03-09', CAL);
    expect(approvalCheck(l, 'N').ok).toBe(false);
  });

  it('permintaan yang tak ada di buku besar tahun berjalan ditolak', () => {
    expect(approvalCheck(ledgerFor('EMP-021'), 'TIDAK-ADA').ok).toBe(false);
  });
});

/* ------------------------------------------------------------------
   6. Kalender hari libur — kejujuran cakupan
   ------------------------------------------------------------------ */

describe('kalender hari libur menyatakan batas pengetahuannya', () => {
  it('2026 terisi & terkonfirmasi', () => {
    const c = holidayCoverage(CAL, 2026);
    expect(c.usable).toBe(true);
    expect(c.confirmed).toBe(true);
    expect(c.note).toBe('');
  });

  it('tahun tanpa entri MENYATAKAN dirinya melebih-hitung', () => {
    const c = holidayCoverage(CAL, 2028);
    expect(c.usable).toBe(false);
    expect(c.note).toMatch(/LEBIH BANYAK/);
  });

  it('tahun di atas confirmedThroughYear ditandai belum dicocokkan', () => {
    const c = holidayCoverage({ ...CAL, confirmedThroughYear: 2025 }, 2026);
    expect(c.usable).toBe(true);
    expect(c.confirmed).toBe(false);
    expect(c.note).toMatch(/SKB/);
  });

  it('setiap entri punya penetapan yang jelas & tanggal yang nyata', () => {
    for (const h of CAL.entries) {
      expect(['tetap', 'hisab'], h.date).toContain(h.penetapan);
      expect(workingDaySpan(h.date, h.date, undefined).valid, h.date).toBe(true);
    }
  });

  it('tanpa kalender, hari kerja lebih banyak — selisihnya bukan nol', () => {
    const withCal = workingDaySpan('2026-01-12', '2026-01-20', CAL).workingDays;
    const without = workingDaySpan('2026-01-12', '2026-01-20', undefined).workingDays;
    expect(without).toBe(withCal + 1);
  });
});

/* ------------------------------------------------------------------
   7. Jenis cuti & pembacaan kalender
   ------------------------------------------------------------------ */

describe('jenis cuti', () => {
  it('hanya cuti tahunan & izin yang memotong kuota', () => {
    expect(LEAVE_TYPES.filter((t) => t.consumesAnnual).map((t) => t.key)).toEqual(['Cuti Tahunan', 'Izin']);
  });

  it('jenis tak terdaftar menandai dirinya, dan tetap memotong kuota', () => {
    const m = leaveTypeOf('Cuti Rekreasi Bulan Purnama');
    expect(m.consumesAnnual).toBe(true);
    expect(m.basis).toMatch(/tidak terdaftar/);
  });

  it('setiap jenis menyebut dasar hukumnya', () => {
    for (const t of LEAVE_TYPES) expect(t.basis, t.key).not.toBe('');
  });
});

describe('siapa sedang cuti', () => {
  it('hanya yang DISETUJUI yang dihitung "cuti hari ini"', () => {
    /* LV-0042 (Citra) 9–13 Mar disetujui; TODAY = 9 Mar. */
    expect(onLeaveOn(REQS, TODAY).map((r) => r.id)).toEqual(['LV-0042']);
  });

  it('strip kalender membedakan disetujui dari menunggu', () => {
    expect(leaveStateOn(REQS, 'EMP-012', '2026-03-10').state).toBe('approved');
    expect(leaveStateOn(REQS, 'EMP-021', '2026-03-24').state).toBe('pending');
    expect(leaveStateOn(REQS, 'EMP-021', '2026-03-30').state).toBe('none');
  });
});

/* ------------------------------------------------------------------
   8. GERBANG CAKUPAN — siapa membaca apa
   ------------------------------------------------------------------ */

const SRC = join(__dirname);
/* Kode saja. Komentar berkas-berkas ini JUSTRU menjelaskan pola lama yang
   dicabut (`ent`/`used`); tanpa pembuangan komentar gerbang gagal karena
   prosanya sendiri — dan menghapus penjelasan sejarahnya adalah kemunduran. */
const read = (f: string) => readFileSync(join(SRC, f), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

/** Setiap view yang menampilkan saldo cuti. Menambah konsumen? Daftarkan di sini. */
const KONSUMEN = [
  'view_hrops.tsx',    // modul Cuti & Kehadiran
  'view_pc_hcm.tsx',   // drawer profil 360°
  'view_personal.tsx', // Data Personal Saya
];

describe('gerbang cakupan — tak ada konsumen yang kembali ke literal', () => {
  it.each(KONSUMEN)('%s tidak membaca `.ent` / `.used` dari saldo cuti', (f) => {
    const src = read(f);
    expect(src).not.toMatch(/\b(bal|lv|b)\s*\.\s*(ent|used)\b/);
    expect(src).not.toMatch(/\.\s*ent\s*\+\s*.*carry/);
  });

  it.each(KONSUMEN)('%s masuk lewat canon_leave', (f) => {
    expect(read(f)).toMatch(/from '\.\/canon_leave'/);
  });

  it('aritmetika saldo tidak disalin ke view', () => {
    for (const f of KONSUMEN) {
      /* pola lama: `total - b.used`, `lvTotal - bal.used` */
      expect(read(f), f).not.toMatch(/-\s*\w+\.used\b/);
    }
  });

  it('tak ada view yang menghitung hari kerja sendiri', () => {
    for (const f of KONSUMEN) {
      /* satu-satunya pintu adalah workingDaySpan/evaluateLeaveRow di kanon. */
      expect(read(f), f).not.toMatch(/getDay\(\)\s*===\s*0\s*\|\|/);
    }
  });

  it('kuota tahunan tidak lagi diketik tangan di badge', () => {
    expect(read('view_hrops.tsx')).not.toMatch(/Kuota 12 hari/);
  });

  it('strip kalender tidak lagi dipaku ke Maret 2026', () => {
    expect(read('view_hrops.tsx')).not.toMatch(/new Date\(2026,\s*2,/);
  });
});
