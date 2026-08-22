/* ============================================================
   FA2 — jalur keputusan kandidat pencatatan ganda (MURNI).

   Keputusan Ari (usulan-FA2, opsi yang direkomendasikan):
     · lingkup FIRMA (`assetDupDecisions.v1`, scope firm) — register aset milik
       firma, bukan perikatan;
     · kewenangan `FIRMFIN_EDIT`, DIDAFTARKAN eksplisit di `capForWrite`;
     · pasangan yang sudah diputuskan TETAP TAMPIL dengan statusnya (opsi B),
       tidak hilang, dan TIDAK mengubah register (itu PR-2).

   Yang diuji di sini adalah bagian yang menentukan apakah catatannya berguna:
     · keputusan tanpa pelaku/alasan DITOLAK — bukan disimpan setengah;
     · keputusan atas pasangan yang TAK LAGI dihitung tetap ada dan ditandai,
       bukan lenyap ketika seed register berubah;
     · "duplikat dikonfirmasi" TIDAK mengurangi apa pun dari register — ia
       menyatakan berapa harga perolehan yang firma sendiri akui tercatat dua kali.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { FIXED_ASSETS, duplicateCandidates, type AssetSeed, type DupCandidate } from './data_fixedassets';
import {
  dupBoard, dupDecisionRecord, dupPairKey,
  type DupDecision, type DupDecisionMap,
} from './fixedassets_dup_decisions';

const DUPS: DupCandidate[] = duplicateCandidates();
const HARI_INI = '2026-03-09';

const putuskan = (d: DupCandidate, verdict: 'bukan' | 'duplikat', reason: string): DupDecision =>
  dupDecisionRecord(d, { verdict, who: 'Bayu Santoso', role: 'Finance Firma', when: HARI_INI, reason });

describe('FA2 — kunci pasangan stabil', () => {
  it('kunci tidak bergantung pada urutan a/b di dalam pasangan', () => {
    const d = DUPS[0];
    const terbalik = { ...d, a: d.b, b: d.a } as DupCandidate;
    expect(dupPairKey(terbalik)).toBe(dupPairKey(d));
  });

  it('kunci menyebut kedua register: Keuangan dulu, GA kemudian', () => {
    for (const d of DUPS) {
      const fin = d.a.src === 'finance' ? d.a : d.b;
      const ga = d.a.src === 'finance' ? d.b : d.a;
      expect(dupPairKey(d)).toBe(`${fin.id}|${ga.id}`);
    }
  });
});

describe('FA2 — keputusan tanpa pelaku atau alasan DITOLAK', () => {
  it('pelaku kosong ditolak — keputusan tanpa penanggung jawab bukan catatan', () => {
    expect(() => dupDecisionRecord(DUPS[0], {
      verdict: 'bukan', who: '  ', role: 'Finance Firma', when: HARI_INI, reason: 'aset fisik berbeda',
    })).toThrow(/pelaku/i);
  });

  it('alasan kosong ditolak — pertimbangan yang tak ditulis tak dapat ditinjau', () => {
    expect(() => dupDecisionRecord(DUPS[0], {
      verdict: 'duplikat', who: 'Bayu Santoso', role: 'Finance Firma', when: HARI_INI, reason: '   ',
    })).toThrow(/alasan/i);
  });

  it('tanggal kosong ditolak — stempel diambil dari klok SSOT, bukan jam mesin', () => {
    expect(() => dupDecisionRecord(DUPS[0], {
      verdict: 'bukan', who: 'Bayu Santoso', role: 'Finance Firma', when: '', reason: 'aset fisik berbeda',
    })).toThrow(/tanggal/i);
  });
});

describe('FA2 — keputusan MEMOTRET pasangannya', () => {
  it('catatan membawa cukup untuk ditampilkan tanpa menghitung ulang', () => {
    const d = DUPS[0];
    const fin = d.a.src === 'finance' ? d.a : d.b;
    const ga = d.a.src === 'finance' ? d.b : d.a;
    const rec = putuskan(d, 'bukan', 'Pemeriksaan fisik: dua batch berbeda, nomor seri tak beririsan.');
    expect(rec).toMatchObject({
      verdict: 'bukan', who: 'Bayu Santoso', role: 'Finance Firma', when: HARI_INI,
      cat: d.cat, finId: fin.id, finName: fin.name, gaId: ga.id, gaName: ga.name,
      daysApart: d.daysApart, combinedCost: d.combinedCost,
    });
    expect(rec.reason).toContain('nomor seri');
  });
});

describe('FA2 — papan keputusan: yang diputuskan TETAP TAMPIL', () => {
  it('tanpa keputusan, semuanya terbuka dan tak ada yang dikonfirmasi', () => {
    const b = dupBoard(DUPS, {});
    expect(b.rows.length).toBe(DUPS.length);
    expect(b.open).toBe(DUPS.length);
    expect(b.decided).toBe(0);
    expect(b.confirmed).toBe(0);
    expect(b.confirmedCost).toBe(0);
    expect(b.stale).toBe(0);
    expect(b.rows.every((r) => r.detected && r.decision === null)).toBe(true);
  });

  it('pasangan yang diputuskan TIDAK hilang dari daftar', () => {
    const d = DUPS[0];
    const decisions: DupDecisionMap = { [dupPairKey(d)]: putuskan(d, 'bukan', 'Aset fisik berbeda.') };
    const b = dupBoard(DUPS, decisions);
    expect(b.rows.length, 'daftar menyusut — keputusan jadi tak dapat ditinjau').toBe(DUPS.length);
    const baris = b.rows.find((r) => r.key === dupPairKey(d));
    expect(baris?.decision?.verdict).toBe('bukan');
    expect(baris?.detected).toBe(true);
    expect(b.open).toBe(DUPS.length - 1);
    expect(b.decided).toBe(1);
  });

  it('"duplikat dikonfirmasi" MENYATAKAN nilainya — dan tidak mengubah register', () => {
    const d = DUPS[0];
    const decisions: DupDecisionMap = { [dupPairKey(d)]: putuskan(d, 'duplikat', 'Satu server fisik, dua nomor aset.') };
    const b = dupBoard(DUPS, decisions);
    expect(b.confirmed).toBe(1);
    expect(b.confirmedCost).toBe(d.combinedCost);
    /* Mesin registernya tak tersentuh: `duplicateCandidates` tetap menghitung
       pasangan yang sama, dan tak ada satu pun jalan dari keputusan ke seed. */
    expect(duplicateCandidates().length).toBe(DUPS.length);
  });
});

describe('FA2 — keputusan atas pasangan yang TAK LAGI dihitung', () => {
  /* Seed register berubah satu tanggal → `duplicateCandidates()` bisa berhenti
     memunculkan pasangan lama. Menghapus keputusannya berarti mengoreksi satu
     tanggal diam-diam membatalkan pemeriksaan manusia. */
  const geser = (): AssetSeed[] => FIXED_ASSETS.map((a) =>
    a.id === 'AST-1042' ? { ...a, acq: '2020-01-01' } : a);

  it('pasangan lenyap dari mesin ketika tanggalnya digeser (prasyarat uji)', () => {
    const sesudah = duplicateCandidates(geser());
    expect(sesudah.length).toBe(DUPS.length - 1);
    expect(sesudah.map((x) => dupPairKey(x))).not.toContain('FA-006|AST-1042');
  });

  it('keputusannya TETAP ada, ditandai tak lagi terdeteksi, dan tidak ikut dihitung sebagai duplikat aktif', () => {
    const lama = DUPS.find((x) => dupPairKey(x) === 'FA-006|AST-1042') as DupCandidate;
    const decisions: DupDecisionMap = { 'FA-006|AST-1042': putuskan(lama, 'duplikat', 'Satu batch laptop, dua nomor aset.') };
    const b = dupBoard(duplicateCandidates(geser()), decisions);

    const baris = b.rows.find((r) => r.key === 'FA-006|AST-1042');
    expect(baris, 'keputusan lenyap bersama pasangannya').toBeTruthy();
    expect(baris!.detected).toBe(false);
    expect(baris!.finName, 'baris usang tak dapat ditampilkan tanpa potretnya').toBe(lama.a.src === 'finance' ? lama.a.name : lama.b.name);
    expect(b.stale).toBe(1);
    expect(b.confirmed, 'pasangan usang tak boleh dihitung sebagai duplikat aktif').toBe(0);
    expect(b.confirmedCost).toBe(0);
  });

  it('baris usang berada SESUDAH yang masih terdeteksi', () => {
    const lama = DUPS.find((x) => dupPairKey(x) === 'FA-006|AST-1042') as DupCandidate;
    const decisions: DupDecisionMap = { 'FA-006|AST-1042': putuskan(lama, 'bukan', 'Dua batch berbeda.') };
    const rows = dupBoard(duplicateCandidates(geser()), decisions).rows;
    expect(rows.map((r) => r.detected)).toEqual([true, false]);
  });
});
