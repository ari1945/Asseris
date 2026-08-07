/* ============================================================
   PR-1 — Imutabilitas jurnal Posted (PRD §S1, §S7).

   Uji ini memaku dua hal yang sebelumnya TIDAK ADA di sistem:
   (a) sidik jari isi jurnal yang stabil lintas bentuk penyimpanan, dan
   (b) deteksi penulisan ulang jurnal yang sudah diposting.

   Probe yang memicunya (PRD Lampiran A.1): sebuah tulisan yang mengubah
   nilai 2.340 jt → 9.999 jt DAN kedua akunnya pada jurnal berstatus
   `Posted` melewati `guardSignoffWrite` tanpa menuntut apa pun.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import {
  ajeCanonicalContent, ajeContentHash, ajeImmutabilityViolations,
  ajeNormalizedLines, isReversal, nextAjeId, reverseEntryFrom,
} from './aje_contract';
import type { AjeContractEntry } from './aje_contract';

/** Jurnal seed: memakai `dr`/`cr` + `amount` (tanpa `lines`). */
const SEED: AjeContractEntry = {
  id: 'AJE-01', status: 'Posted', desc: 'Koreksi pisah batas persediaan', ref: 'B-3',
  kind: 'adjusting', amount: 2_340_000_000, mis: 'M-05', assertions: ['cutoff'],
  dr: '5-3100 Beban Pokok', cr: '1-1400 Persediaan',
};

/** Jurnal yang SAMA, ditulis dalam bentuk `lines[]`. */
const SEED_AS_LINES: AjeContractEntry = {
  ...SEED, dr: undefined, cr: undefined,
  lines: [
    { code: '5-3100', name: 'Beban Pokok', debit: 2_340_000_000, credit: 0 },
    { code: '1-1400', name: 'Persediaan', debit: 0, credit: 2_340_000_000 },
  ],
};

describe('ajeContentHash — sidik jari isi jurnal', () => {
  it('stabil: dipanggil dua kali atas objek yang sama → nilai sama', () => {
    expect(ajeContentHash(SEED)).toBe(ajeContentHash({ ...SEED }));
  });

  it('bentuk penyimpanan TIDAK mengubah hash (dr/cr ≡ lines[])', () => {
    /* Kalau ini gagal, memindahkan jurnal seed ke bentuk berbaris akan
       menggugurkan persetujuannya tanpa ada yang mengubah jurnalnya. */
    expect(ajeContentHash(SEED_AS_LINES)).toBe(ajeContentHash(SEED));
  });

  it('urutan baris tidak mengubah hash', () => {
    const flipped: AjeContractEntry = { ...SEED_AS_LINES, lines: [...SEED_AS_LINES.lines!].reverse() };
    expect(ajeContentHash(flipped)).toBe(ajeContentHash(SEED_AS_LINES));
  });

  it('STATUS tidak masuk hash — memposting bukan mengubah isi', () => {
    expect(ajeContentHash({ ...SEED, status: 'Proposed' })).toBe(ajeContentHash(SEED));
  });

  it('nama akun (label kosmetik) tidak masuk hash; KODE akun masuk', () => {
    const relabeled: AjeContractEntry = {
      ...SEED_AS_LINES,
      lines: [{ code: '5-3100', name: 'HPP', debit: 2_340_000_000, credit: 0 },
        { code: '1-1400', name: 'Inventory', debit: 0, credit: 2_340_000_000 }],
    };
    expect(ajeContentHash(relabeled)).toBe(ajeContentHash(SEED_AS_LINES));

    const rerouted: AjeContractEntry = {
      ...SEED_AS_LINES,
      lines: [{ code: '5-9999', name: 'Beban Pokok', debit: 2_340_000_000, credit: 0 },
        { code: '1-1400', name: 'Persediaan', debit: 0, credit: 2_340_000_000 }],
    };
    expect(ajeContentHash(rerouted)).not.toBe(ajeContentHash(SEED_AS_LINES));
  });

  /* Setiap field material harus dapat menggagalkan hash. Bila salah satu
     baris di bawah lolos, field itu dapat diubah pada jurnal Posted tanpa
     terdeteksi — persis cacat yang sedang ditutup. */
  const MUTATIONS: Array<[string, Partial<AjeContractEntry>]> = [
    ['nilai', { amount: 9_999_000_000 }],
    ['deskripsi', { desc: 'diubah setelah disetujui partner' }],
    ['ref WP', { ref: 'Z-9' }],
    ['jenis', { kind: 'reclass' }],
    ['item SAD', { mis: 'M-01' }],
    ['asersi', { assertions: ['valuation'] }],
    ['tanggal efektif', { effectiveDate: '2025-12-31' }],
    ['sumber bukti', { evidenceSource: 'sumber lain' }],
    ['tautan DMS', { dmsLink: 'https://contoh/berkas-lain' }],
    ['penyusun', { preparer: 'Orang Lain' }],
    ['alasan tanpa SAD', { misNoneReason: 'alasan berbeda' }],
  ];
  MUTATIONS.forEach(([label, patch]) => {
    it(`mengubah ${label} MENGUBAH hash`, () => {
      expect(ajeContentHash({ ...SEED, ...patch })).not.toBe(ajeContentHash(SEED));
    });
  });

  it('mengubah nilai baris mengubah hash meski `amount` dibiarkan', () => {
    const tampered: AjeContractEntry = {
      ...SEED_AS_LINES,
      lines: [{ code: '5-3100', debit: 9_999_000_000, credit: 0 }, { code: '1-1400', debit: 0, credit: 9_999_000_000 }],
    };
    expect(ajeContentHash(tampered)).not.toBe(ajeContentHash(SEED_AS_LINES));
  });

  it('serialisasi kanonik tidak memuat status (agar tak ada yang menambahkannya diam-diam)', () => {
    expect(ajeCanonicalContent(SEED)).not.toContain('Posted');
  });
});

describe('ajeNormalizedLines', () => {
  it('menurunkan baris dari dr/cr seed', () => {
    expect(ajeNormalizedLines(SEED)).toEqual([
      { code: '5-3100', name: 'Beban Pokok', debit: 2_340_000_000, credit: 0 },
      { code: '1-1400', name: 'Persediaan', debit: 0, credit: 2_340_000_000 },
    ]);
  });
  it('jurnal tanpa dr/cr maupun lines → kosong (bukan lempar)', () => {
    expect(ajeNormalizedLines({ id: 'X' })).toEqual([]);
    expect(ajeNormalizedLines(null)).toEqual([]);
  });
  it('angka berbentuk string dinormalkan (formulir mengirim string)', () => {
    const s: AjeContractEntry = { id: 'X', lines: [{ code: '1-1', debit: '250000', credit: '' }] };
    expect(ajeNormalizedLines(s)[0]).toEqual({ code: '1-1', name: '', debit: 250000, credit: 0 });
  });
});

describe('ajeImmutabilityViolations — INTI PR-1', () => {
  const posted = [SEED];

  it('menulis ulang nilai & akun jurnal Posted TERDETEKSI', () => {
    const tampered = [{
      ...SEED, amount: 9_999_000_000, desc: 'diubah setelah disetujui partner',
      dr: '1-1100 Kas', cr: '4-1000 Pendapatan',
    }];
    const v = ajeImmutabilityViolations(posted, tampered);
    expect(v).toHaveLength(1);
    expect(v[0].id).toBe('AJE-01');
    expect(v[0].prevHash).not.toBe(v[0].nextHash);
  });

  it('tulisan yang tidak mengubah apa pun BUKAN pelanggaran', () => {
    expect(ajeImmutabilityViolations(posted, [{ ...SEED }])).toEqual([]);
  });

  it('mengubah bentuk penyimpanan (dr/cr → lines) BUKAN pelanggaran', () => {
    expect(ajeImmutabilityViolations(posted, [SEED_AS_LINES])).toEqual([]);
  });

  it('jurnal Proposed boleh diubah sebebasnya (di sini; persetujuannya gugur di PR-2)', () => {
    const prop = [{ ...SEED, status: 'Proposed' }];
    const edited = [{ ...SEED, status: 'Proposed', amount: 1 }];
    expect(ajeImmutabilityViolations(prop, edited)).toEqual([]);
  });

  it('unpost (Posted → Proposed) BUKAN pelanggaran imutabilitas — itu urusan AJE_POST', () => {
    expect(ajeImmutabilityViolations(posted, [{ ...SEED, status: 'Proposed', amount: 1 }])).toEqual([]);
  });

  it('menambah jurnal baru & menghapus jurnal bukan urusan aturan ini', () => {
    expect(ajeImmutabilityViolations(posted, [SEED, { id: 'AJE-06', status: 'Proposed' }])).toEqual([]);
    expect(ajeImmutabilityViolations(posted, [])).toEqual([]);
  });

  it('mendeteksi setiap jurnal yang dilanggar, bukan hanya yang pertama', () => {
    const two = [SEED, { ...SEED, id: 'AJE-02' }];
    const both = [{ ...SEED, amount: 1 }, { ...SEED, id: 'AJE-02', amount: 2 }];
    expect(ajeImmutabilityViolations(two, both).map((x) => x.id)).toEqual(['AJE-01', 'AJE-02']);
  });
});

describe('nextAjeId — penomoran yang tak menghasilkan id ganda', () => {
  it('mengikuti sufiks tertinggi, bukan panjang daftar', () => {
    /* `list.length + 1` menghasilkan 'AJE-05' di sini — id yang SUDAH dipakai. */
    const list = [{ id: 'AJE-01' }, { id: 'AJE-03' }, { id: 'AJE-04' }, { id: 'AJE-06' }];
    expect(nextAjeId(list)).toBe('AJE-07');
  });
  it('daftar kosong → AJE-01', () => {
    expect(nextAjeId([])).toBe('AJE-01');
    expect(nextAjeId(null)).toBe('AJE-01');
  });
  it('id tanpa sufiks angka diabaikan, bukan melempar', () => {
    expect(nextAjeId([{ id: 'PAJE' }, { id: 'AJE-02' }])).toBe('AJE-03');
  });
});

describe('reverseEntryFrom — jalan koreksi yang sah (PRD §S7)', () => {
  const rev = reverseEntryFrom(SEED, { id: 'AJE-06', reason: 'salah akun beban', preparer: 'Dimas Raharjo' });

  it('lahir Proposed — pembalikan menempuh rantai yang sama', () => {
    expect(rev.status).toBe('Proposed');
  });

  it('debit ↔ kredit tertukar, nilai sama', () => {
    expect(rev.lines).toEqual([
      { code: '5-3100', name: 'Beban Pokok', debit: 0, credit: 2_340_000_000 },
      { code: '1-1400', name: 'Persediaan', debit: 2_340_000_000, credit: 0 },
    ]);
  });

  it('menunjuk jurnal asalnya & membawa alasan di deskripsi', () => {
    expect(rev.reverses).toBe('AJE-01');
    expect(isReversal(rev)).toBe(true);
    expect(rev.desc).toContain('AJE-01');
    expect(rev.desc).toContain('salah akun beban');
  });

  it('penyusun dari sesi, bukan diwarisi dari jurnal asal', () => {
    expect(rev.preparer).toBe('Dimas Raharjo');
  });

  it('jurnal ASAL tidak tersentuh (tak ada mutasi in-place)', () => {
    expect(SEED.status).toBe('Posted');
    expect(SEED.amount).toBe(2_340_000_000);
    expect(ajeContentHash(SEED)).toBe(ajeContentHash({ ...SEED }));
  });

  it('hash pembalikan BERBEDA dari jurnal asal (ia jurnal lain, bukan salinan)', () => {
    expect(ajeContentHash(rev)).not.toBe(ajeContentHash(SEED));
  });
});
