/* ============================================================
   PR-D — turunan jurnal: SATU sumber, bukan dua.

   `AJE_META` dulu menyimpan `pbt` ter-hardcode untuk kelima jurnal seed,
   padahal kelimanya persis sama dengan hasil turunan dari baris jurnal.
   Duplikasi itu bukan sekadar mubazir: bila `amount` di seed diubah, META
   menang dan register membantah baris jurnalnya sendiri.

   Uji ini memaku bahwa pembuangan itu TIDAK mengubah satu angka pun, dan
   bahwa turunannya benar-benar mengikuti baris jurnal.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { ajeDerivePbt, ajeKindSuggestion, ajeLines } from './view_aje';
import { AMS } from './data';

/* Nilai yang DULU di-hardcode di AJE_META.pbt — oracle pembanding. */
const LEGACY_PBT: Record<string, number> = {
  'AJE-01': -2_340_000_000,
  'AJE-02': -620_000_000,
  'AJE-03': -1_850_000_000,
  'AJE-04': -980_000_000,
  'AJE-05': -1_120_000_000,
};

describe('ajeDerivePbt — turunan menggantikan AJE_META.pbt', () => {
  it('kelima jurnal seed menghasilkan angka yang PERSIS sama dengan hardcode lama', () => {
    (AMS.AJE as Array<{ id: string }>).forEach(a => {
      expect(ajeDerivePbt(a)).toBe(LEGACY_PBT[a.id]);
    });
  });

  /* Inti duplikasinya: dulu mengubah `amount` tak menggerakkan `pbt`. */
  it('mengubah nilai jurnal menggerakkan efek laba (dulu tidak)', () => {
    const a = { id: 'AJE-01', dr: '5-1100 BPP', cr: '1-1300 Persediaan', amount: 2_340_000_000 };
    expect(ajeDerivePbt(a)).toBe(-2_340_000_000);
    expect(ajeDerivePbt({ ...a, amount: 3_000_000_000 })).toBe(-3_000_000_000);
  });

  it('satu jalur untuk entri seed (dr/cr) dan entri berbaris (lines)', () => {
    const viaStrings = { dr: '5-3100 Beban Umum', cr: '2-1300 Akrual', amount: 500_000_000 };
    const viaLines = { lines: [
      { code: '5-3100', debit: 500_000_000, credit: 0 },
      { code: '2-1300', debit: 0, credit: 500_000_000 },
    ] };
    expect(ajeDerivePbt(viaStrings)).toBe(-500_000_000);
    expect(ajeDerivePbt(viaLines)).toBe(-500_000_000);
  });

  it('jurnal neraca-saja tidak berdampak pada laba', () => {
    expect(ajeDerivePbt({ dr: '1-1200 Piutang', cr: '1-1100 Kas', amount: 750_000_000 })).toBe(0);
  });

  it('ajeLines menormalkan dr/cr menjadi baris seimbang', () => {
    const l = ajeLines({ dr: '5-1100 BPP', cr: '1-1300 Persediaan', amount: 100 });
    expect(l).toHaveLength(2);
    expect(l[0]).toMatchObject({ code: '5-1100', debit: 100 });
    expect(l[1]).toMatchObject({ code: '1-1300', credit: 100 });
  });
});

describe('ajeKindSuggestion — saran, dan heuristik lama yang salah dua arah', () => {
  /* Heuristik lama: "menyentuh akun 4-/5- ⇒ penyesuaian". Reklasifikasi antar akun
     BEBAN menyentuh 5- sehingga dulu dilabeli Penyesuaian — padahal efek labanya nol
     dan legenda tabel menjanjikan "Reklasifikasi tidak berdampak pada laba". */
  it('reklasifikasi antar akun beban disarankan sebagai reclass (dulu: adjusting)', () => {
    const a = { lines: [
      { code: '5-3100', debit: 400_000_000, credit: 0 },
      { code: '5-2100', debit: 0, credit: 400_000_000 },
    ] };
    expect(ajeDerivePbt(a)).toBe(0);
    expect(ajeKindSuggestion(a)).toBe('reclass');
  });

  /* Arah sebaliknya: koreksi neraca-saja dulu dilabeli Reklasifikasi. Saran kini tetap
     'reclass' karena efek labanya nol — TAPI jenis jurnal adalah pertimbangan auditor,
     dan itulah sebabnya nilai ini hanya SARAN yang dapat ditimpa `a.kind`. */
  it('efek laba nol → saran reclass; efek laba ada → saran adjusting', () => {
    expect(ajeKindSuggestion({ dr: '1-1200 Piutang', cr: '2-1100 Utang', amount: 100 })).toBe('reclass');
    expect(ajeKindSuggestion({ dr: '5-1100 BPP', cr: '1-1300 Persediaan', amount: 100 })).toBe('adjusting');
  });

  it('saran konsisten dengan janji legenda: reclass ⇒ efek laba nol', () => {
    (AMS.AJE as Array<{ id: string }>).forEach(a => {
      if (ajeKindSuggestion(a) === 'reclass') expect(ajeDerivePbt(a)).toBe(0);
    });
  });
});
