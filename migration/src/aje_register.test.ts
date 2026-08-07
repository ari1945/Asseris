/* ============================================================
   PR-6 — register dapat dipakai pada skala perikatan nyata (PRD §S8).

   Yang diuji bukan "filter bekerja", melainkan filter tidak MENYEMBUNYIKAN
   baris secara diam-diam: setiap kriteria harus dapat gagal, dan kombinasi
   kriteria harus menyempit — bukan mengosongkan.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import {
  ajeBand, ajeDistinct, ajeSearchBlob, filterAjeRows, sortAjeRows,
} from './aje_register';
import type { AjeRegisterRow } from './aje_register';

const BANDS = { pm: 1_000_000_000, ctt: 100_000_000 };

const ROWS: AjeRegisterRow[] = [
  { id: 'AJE-01', desc: 'Penyesuaian cut-off penjualan', ref: 'B-3', kind: 'adjusting', status: 'Posted', amount: 2_340_000_000, pbt: -2_340_000_000, mis: 'M-05', cycle: 'Persediaan / BPP', preparer: 'Rina Kusuma', proposedOn: '2026-05-04 16:40', dr: '5-1100 BPP', cr: '1-1300 Persediaan' },
  { id: 'AJE-02', desc: 'Tambahan CKPN piutang (ECL)', ref: 'B-7', kind: 'adjusting', status: 'Posted', amount: 620_000_000, pbt: -620_000_000, mis: 'M-04', cycle: 'Piutang / CKPN', preparer: 'Dimas Raharjo', proposedOn: '2026-05-06 09:20', dr: '5-3100 Beban Umum', cr: '1-1210 CKPN' },
  { id: 'AJE-03', desc: 'Pembalikan piutang fiktif', ref: 'B-2', kind: 'adjusting', status: 'Proposed', amount: 1_850_000_000, pbt: -1_850_000_000, mis: 'M-01', cycle: 'Pendapatan / Piutang', preparer: 'Dimas Raharjo', proposedOn: '2026-05-28 15:10', dr: '4-1100 Penjualan', cr: '1-1200 Piutang' },
  { id: 'AJE-04', desc: 'Akrual bonus manajemen', ref: 'CC-1', kind: 'adjusting', status: 'Posted', amount: 980_000_000, pbt: -980_000_000, mis: null, cycle: 'Beban Gaji / Akrual', preparer: 'Sinta Wulandari', proposedOn: '2026-05-09 11:05', dr: '5-3100 Beban Umum', cr: '2-1300 Akrual' },
  { id: 'AJE-05', desc: 'Reklasifikasi utang jangka pendek', ref: 'E-4', kind: 'reclass', status: 'Proposed', amount: 45_000_000, pbt: 0, mis: null, cycle: 'Liabilitas', preparer: 'Dimas Raharjo', proposedOn: '2026-05-30 08:45', dr: '2-2100 Utang Bank', cr: '2-1100 Utang Lancar' },
];

const ids = (rows: AjeRegisterRow[]) => rows.map((r) => r.id);
const f = (filter: Parameters<typeof filterAjeRows>[1], ownerById?: Record<string, string>) =>
  ids(filterAjeRows(ROWS, filter, { bands: BANDS, ownerById }));

describe('pencarian', () => {
  it('mencari di deskripsi, id, ref WP, siklus, penyusun, dan KODE AKUN', () => {
    expect(f({ q: 'ckpn' })).toEqual(['AJE-02']);
    expect(f({ q: 'AJE-03' })).toEqual(['AJE-03']);
    expect(f({ q: 'cc-1' })).toEqual(['AJE-04']);
    expect(f({ q: 'sinta' })).toEqual(['AJE-04']);
    expect(f({ q: '4-1100' })).toEqual(['AJE-03']);
    expect(f({ q: 'M-05' })).toEqual(['AJE-01']);
  });
  it('tanpa kata kunci = tanpa penyaringan', () => {
    expect(f({ q: '' })).toHaveLength(5);
    expect(f({})).toHaveLength(5);
  });
  it('kata kunci tak dikenal mengembalikan kosong (bukan semua)', () => {
    expect(f({ q: 'zzz' })).toEqual([]);
  });
  it('blob pencarian memuat kode akun baris terstruktur', () => {
    const row: AjeRegisterRow = { id: 'X', lines: [{ code: '1-1500', name: 'Beban Dibayar Dimuka' }] };
    expect(ajeSearchBlob(row)).toContain('1-1500');
    expect(ajeSearchBlob(row)).toContain('dimuka');
  });
});

describe('penyaringan', () => {
  it('status & jenis', () => {
    expect(f({ status: 'Proposed' })).toEqual(['AJE-03', 'AJE-05']);
    expect(f({ kind: 'reclass' })).toEqual(['AJE-05']);
  });

  it('pita materialitas memisahkan di atas PM, antara PM–CTT, dan di bawah CTT', () => {
    expect(f({ band: 'above-pm' })).toEqual(['AJE-01', 'AJE-03']);
    expect(f({ band: 'pm-ctt' })).toEqual(['AJE-02', 'AJE-04']);
    expect(f({ band: 'below-ctt' })).toEqual(['AJE-05']);
  });

  it('pita memakai NILAI mutlak — jurnal negatif tidak jatuh ke pita terendah', () => {
    expect(ajeBand({ amount: -2_000_000_000 }, BANDS)).toBe('above-pm');
  });

  it('tautan SAD: tertaut vs belum', () => {
    expect(f({ sad: 'linked' })).toEqual(['AJE-01', 'AJE-02', 'AJE-03']);
    expect(f({ sad: 'unlinked' })).toEqual(['AJE-04', 'AJE-05']);
  });

  it('siklus & penyusun', () => {
    expect(f({ cycle: 'Piutang / CKPN' })).toEqual(['AJE-02']);
    expect(f({ preparer: 'Dimas Raharjo' })).toEqual(['AJE-02', 'AJE-03', 'AJE-05']);
  });

  it('pemilik langkah berjalan — dari rantai persetujuan', () => {
    const owners = { 'AJE-03': 'Hartono Wijaya', 'AJE-05': 'Anindya Pramesti' };
    expect(f({ owner: 'Hartono Wijaya' }, owners)).toEqual(['AJE-03']);
  });

  /* Tanpa peta pemilik, filter itu TAK BERLAKU — bukan diam-diam mengosongkan. */
  it('filter pemilik tanpa peta tidak mengosongkan register secara senyap', () => {
    expect(f({ owner: 'all' })).toHaveLength(5);
  });

  it('kriteria bergabung dengan DAN', () => {
    expect(f({ status: 'Proposed', band: 'above-pm' })).toEqual(['AJE-03']);
    expect(f({ q: 'dimas', sad: 'unlinked' })).toEqual(['AJE-05']);
  });
});

describe('pengurutan', () => {
  it('nilai (mutlak), naik & turun', () => {
    expect(ids(sortAjeRows(ROWS, 'amount', 'desc'))).toEqual(['AJE-01', 'AJE-03', 'AJE-04', 'AJE-02', 'AJE-05']);
    expect(ids(sortAjeRows(ROWS, 'amount', 'asc'))[0]).toBe('AJE-05');
  });
  it('efek laba memakai nilai bertanda, bukan mutlak', () => {
    expect(ids(sortAjeRows(ROWS, 'pbt', 'asc'))[0]).toBe('AJE-01');   // paling negatif
  });
  it('tanggal usulan', () => {
    expect(ids(sortAjeRows(ROWS, 'date', 'desc'))[0]).toBe('AJE-05');
  });
  it('status menempatkan yang masih bergerak lebih dulu', () => {
    expect(ids(sortAjeRows(ROWS, 'status', 'asc')).slice(0, 2)).toEqual(['AJE-03', 'AJE-05']);
  });
  it('stabil: kunci sama mempertahankan urutan asal', () => {
    const same: AjeRegisterRow[] = [{ id: 'A', amount: 1 }, { id: 'B', amount: 1 }, { id: 'C', amount: 1 }];
    expect(ids(sortAjeRows(same, 'amount', 'desc'))).toEqual(['A', 'B', 'C']);
  });
  it('tidak memutasi masukan', () => {
    const before = ids(ROWS);
    sortAjeRows(ROWS, 'amount', 'desc');
    expect(ids(ROWS)).toEqual(before);
  });
});

describe('ajeDistinct — pilihan filter berasal dari data, bukan daftar tetap', () => {
  it('mengumpulkan nilai unik & terurut, mengabaikan kosong', () => {
    expect(ajeDistinct(ROWS, (r) => r.preparer)).toEqual(['Dimas Raharjo', 'Rina Kusuma', 'Sinta Wulandari']);
    expect(ajeDistinct(ROWS, (r) => r.mis)).toEqual(['M-01', 'M-04', 'M-05']);
  });
});
