/* ============================================================
   Properti Investasi (PSAK 13) — gerbang atas SSOT dan atas klaim rekonsiliasi.

   Tiga cacat yang ditutup arc ini:

     C-1  `view_invprop.tsx` membawa sub-ledger privat (`IP_PORTFOLIO`, `IP_ROLL`,
          `IP_PL`, `IP_SENS`) sementara akun kanoniknya sudah ada di neraca saldo
          per-perikatan (`1-2600`, `4-1500`). Selisihnya dua orde besaran.
     C-2  Nol konteks perikatan — `grep "useAudit\|useFirm"` nol hasil. Portofolio
          yang sama tampil untuk SETIAP klien.
     C-3  Badge `tie: close === fvSum` membandingkan dua konstanta yang disetel
          agar sama. Ia tak pernah dapat memerah.

   Gerbang di bawah dibagi dua: uji MESIN (angka bergerak, isolasi perikatan,
   badge dua arah) dan gerbang SUMBER atas view (literal tercabut, konteks
   tersambung, kunci persistensi berlingkup perikatan).
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { WTB_BY_ENGAGEMENT } from './data_wtb_eng';
import type { WTB } from './canon_types';
import {
  IP_ACCOUNT, IP_RENT_ACCOUNT, IP_MOVEMENTS_EMPTY, IP_DOC_EMPTY,
  invpropGl, invpropRollForward, invpropSubledger, invpropNoi, invpropDoc,
  type InvPropProperty,
} from './invprop_derive';

/* Perikatan properti — satu-satunya yang memiliki akun `1-2600`. */
const ENG_PROP = 'ENG-2025-063';
/* Perikatan multifinance — TIDAK memiliki properti investasi sama sekali. */
const ENG_FIN = 'ENG-2025-040';

const wtbOf = (id: string): WTB => (WTB_BY_ENGAGEMENT[id] || []) as unknown as WTB;

/** Neraca saldo dengan saldo satu akun DIGESER (Rp penuh). */
const bump = (rows: WTB, code: string, deltaFull: number): WTB =>
  rows.map(r => (r.code === code ? { ...r, unadj: (r.unadj || 0) + deltaFull } : r));

const M = 1_000_000;

describe('invprop · saldo berasal dari neraca saldo perikatan', () => {
  it('menarik saldo awal, akhir & pendapatan sewa dari akun kanonik', () => {
    const gl = invpropGl(wtbOf(ENG_PROP), []);
    expect(gl.present).toBe(true);
    expect(gl.rentPresent).toBe(true);
    /* Nilai ini DIBACA dari data_wtb_eng.ts, bukan diketik ulang sebagai oracle:
       `1-2600` ly=248.000*M unadj=272.400*M · `4-1500` unadj=-32.200*M. */
    expect(gl.open).toBe(248_000);
    expect(gl.close).toBe(272_400);
    expect(gl.rental).toBe(32_200);
  });

  /* ——— GERBANG UTAMA ———
     Mengubah saldo akun menggerakkan angka modul sebesar itu. Inilah yang
     mustahil pada kode lama: `IP_ROLL.open` adalah konstanta di dalam view. */
  it('GERBANG: menggeser saldo 1-2600 menggerakkan saldo akhir sebesar itu', () => {
    const base = wtbOf(ENG_PROP);
    const before = invpropGl(base, []);
    const after = invpropGl(bump(base, IP_ACCOUNT, 10_000 * M), []);
    expect(after.close - before.close).toBe(10_000);
    /* saldo awal (komparatif `ly`) TIDAK ikut bergerak — kolom yang berbeda */
    expect(after.open).toBe(before.open);
  });

  it('GERBANG: menggeser saldo 4-1500 menggerakkan pendapatan sewa sebesar itu', () => {
    const base = wtbOf(ENG_PROP);
    const before = invpropGl(base, []);
    /* pendapatan berkonvensi kredit: kredit bertambah = unadj makin negatif */
    const after = invpropGl(bump(base, IP_RENT_ACCOUNT, -1_500 * M), []);
    expect(after.rental - before.rental).toBe(1_500);
  });

  it('basis DILAPORKAN: jurnal TERPOSTING atas 1-2600 ikut terbawa, usulan tidak', () => {
    const rows = wtbOf(ENG_PROP);
    const posted = invpropGl(rows, [
      { id: 'AJE-X', status: 'Posted', dr: IP_ACCOUNT, cr: '4-1500', amount: 3_000 * M },
    ]);
    const proposed = invpropGl(rows, [
      { id: 'AJE-Y', status: 'Proposed', dr: IP_ACCOUNT, cr: '4-1500', amount: 3_000 * M },
    ]);
    expect(posted.close).toBe(272_400 + 3_000);
    expect(proposed.close).toBe(272_400);
  });
});

describe('invprop · isolasi perikatan (C-2)', () => {
  /* ——— GERBANG: dua perikatan, dua angka ——— */
  it('GERBANG: perikatan berbeda menghasilkan angka berbeda', () => {
    const prop = invpropGl(wtbOf(ENG_PROP), []);
    const fin = invpropGl(wtbOf(ENG_FIN), []);
    expect(prop.close).not.toBe(fin.close);
    expect(prop.rental).not.toBe(fin.rental);
  });

  it('perikatan tanpa akun 1-2600 MEMBANTAH, bukan meminjam angka perikatan lain', () => {
    const fin = invpropGl(wtbOf(ENG_FIN), []);
    expect(fin.present).toBe(false);
    expect(fin.rentPresent).toBe(false);
    expect(fin.close).toBe(0);
    expect(fin.open).toBe(0);
  });

  it('hanya satu perikatan seed yang memiliki properti investasi', () => {
    const ids = Object.keys(WTB_BY_ENGAGEMENT);
    const withIp = ids.filter(id => invpropGl(wtbOf(id), []).present);
    expect(withIp).toEqual([ENG_PROP]);
  });

  /* PERANGKAP SINGLETON — `wtbRows()` di canon_base jatuh ke `AMS.WTB` untuk larik
     kosong. Mesin ini menentukan keberadaan akun atas larik yang DIBERIKAN. */
  it('larik kosong & undefined tidak meminjam neraca saldo ENG-2025-014', () => {
    for (const arg of [[] as WTB, undefined]) {
      const gl = invpropGl(arg, []);
      expect(gl.present).toBe(false);
      expect(gl.close).toBe(0);
      expect(gl.rental).toBe(0);
    }
  });

  it('keberadaan dinilai PER AKUN, bukan per larik', () => {
    const rentOnly = wtbOf(ENG_PROP).filter(r => r.code !== IP_ACCOUNT);
    const gl = invpropGl(rentOnly, []);
    expect(gl.present).toBe(false);
    expect(gl.rentPresent).toBe(true);
    expect(gl.close).toBe(0);
    expect(gl.rental).toBe(32_200);
  });
});

describe('invprop · roll-forward BISA memerah (C-3)', () => {
  /* ——— GERBANG: badge dua arah ———
     Sisi kiri = saldo awal (kolom `ly` WTB) + mutasi auditor.
     Sisi kanan = saldo akhir buku besar (kolom `unadj` + jurnal terposting).
     Dua kolom, dua sumber — bukan `A == A` dengan dua nama. */
  it('GERBANG: MERAH pada keadaan awal — mutasi belum diaudit', () => {
    const gl = invpropGl(wtbOf(ENG_PROP), []);
    const roll = invpropRollForward(gl, IP_MOVEMENTS_EMPTY);
    expect(roll.empty).toBe(true);
    expect(roll.tie).toBe(false);
    /* 248.000 + 0 − 0 = 248.000 vs buku besar 272.400 → selisih 24.400 */
    expect(roll.computed).toBe(248_000);
    expect(roll.gl).toBe(272_400);
    expect(roll.diff).toBe(-24_400);
  });

  it('GERBANG: HIJAU ketika mutasi yang diaudit benar-benar menutup', () => {
    const gl = invpropGl(wtbOf(ENG_PROP), []);
    /* angka konkret, bukan `fvGain = close − open` yang tautologis */
    const roll = invpropRollForward(gl, { additions: 12_000, fvGain: 14_400, disposals: 2_000 });
    expect(roll.computed).toBe(272_400);
    expect(roll.diff).toBe(0);
    expect(roll.tie).toBe(true);
    expect(roll.empty).toBe(false);
  });

  it('GERBANG: kembali MERAH ketika buku besar bergeser di bawah mutasi yang sama', () => {
    const shifted = invpropGl(bump(wtbOf(ENG_PROP), IP_ACCOUNT, 10_000 * M), []);
    const roll = invpropRollForward(shifted, { additions: 12_000, fvGain: 14_400, disposals: 2_000 });
    expect(roll.tie).toBe(false);
    expect(roll.diff).toBe(-10_000);
  });

  it('pelepasan mengurangi, bukan menambah', () => {
    const gl = invpropGl(wtbOf(ENG_PROP), []);
    const a = invpropRollForward(gl, { additions: 0, fvGain: 0, disposals: 5_000 });
    expect(a.computed).toBe(gl.open - 5_000);
  });
});

describe('invprop · sub-ledger per-properti tanpa sumber kanonik', () => {
  const prop = (id: string, fv: number): InvPropProperty =>
    ({ id, name: id, use: '', city: '', fv, area: 0, yieldPct: null, occ: null, level: 3 });

  it('sub-ledger KOSONG tidak pernah dinyatakan menutup', () => {
    const gl = invpropGl(wtbOf(ENG_PROP), []);
    const sub = invpropSubledger([], gl.close);
    expect(sub.empty).toBe(true);
    expect(sub.ok).toBe(false);
    expect(sub.sub).toBe(0);
    expect(sub.diff).toBe(-272_400);
  });

  it('KOSONG melawan buku besar NOL tetap bukan kelolosan (0 == 0 hampa)', () => {
    const sub = invpropSubledger([], 0);
    expect(sub.diff).toBe(0);
    expect(sub.ok).toBe(false);
    expect(sub.empty).toBe(true);
  });

  it('total kontrol menutup ke buku besar hanya bila memang sama', () => {
    const gl = invpropGl(wtbOf(ENG_PROP), []);
    expect(invpropSubledger([prop('IP-1', 200_000), prop('IP-2', 72_400)], gl.close).ok).toBe(true);
    expect(invpropSubledger([prop('IP-1', 200_000)], gl.close).ok).toBe(false);
  });
});

describe('invprop · NOI & dokumen tersimpan', () => {
  it('NOI null selama beban operasi langsung belum diisi', () => {
    const gl = invpropGl(wtbOf(ENG_PROP), []);
    expect(invpropNoi(gl, IP_DOC_EMPTY.opex)).toBeNull();
    expect(invpropNoi(gl, { rented: 0, vacant: 0, entered: true })).toBe(32_200);
    expect(invpropNoi(gl, { rented: 8_000, vacant: 500, entered: true })).toBe(24_200);
  });

  it('NOI null bila perikatan tak punya akun pendapatan sewa', () => {
    const gl = invpropGl(wtbOf(ENG_FIN), []);
    expect(invpropNoi(gl, { rented: 100, vacant: 0, entered: true })).toBeNull();
  });

  it('dokumen default LAHIR KOSONG — tak ada portofolio & tak ada sensitivitas', () => {
    expect(IP_DOC_EMPTY.properties).toEqual([]);
    expect(IP_DOC_EMPTY.sens).toEqual([]);
    expect(IP_DOC_EMPTY.movements).toEqual({ additions: 0, fvGain: 0, disposals: 0 });
    expect(IP_DOC_EMPTY.opex.entered).toBe(false);
  });

  it('dokumen parsial/rusak dinormalisasi tanpa merobohkan modul', () => {
    const d = invpropDoc({ movements: { additions: 5, fvGain: NaN, disposals: 1 } });
    expect(d.movements).toEqual({ additions: 5, fvGain: 0, disposals: 1 });
    expect(d.properties).toEqual([]);
    expect(invpropDoc(null)).toEqual(IP_DOC_EMPTY);
  });
});

/* ============================================================
   GERBANG SUMBER atas view_invprop.tsx
   ============================================================ */
const SRC = join(__dirname, 'view_invprop.tsx');
/* Komentar dibuang: berkas ini mengutip pola lama sebagai catatan sejarah, dan
   gerbang yang memindai komentar akan menuduh catatan itu sendiri. */
const kode = (): string =>
  readFileSync(SRC, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('invprop · gerbang sumber view', () => {
  it('C-1: keempat sub-ledger privat tercabut', () => {
    const k = kode();
    expect(k).not.toMatch(/IP_PORTFOLIO/);
    expect(k).not.toMatch(/IP_ROLL/);
    expect(k).not.toMatch(/IP_PL\b/);
    expect(k).not.toMatch(/IP_SENS/);
  });

  it('C-1: nol literal besaran untuk angka yang punya akun kanonik', () => {
    const k = kode();
    /* saldo & pendapatan karangan yang dulu dipajang modul */
    expect(k).not.toMatch(/13575/);
    expect(k).not.toMatch(/15748/);
    expect(k).not.toMatch(/1373/);
    expect(k).not.toMatch(/1860/);
    /* nilai wajar per-properti karangan */
    expect(k).not.toMatch(/9200/);
    expect(k).not.toMatch(/4148/);
    /* nama properti karangan */
    expect(k).not.toMatch(/Menara Sentosa/);
    expect(k).not.toMatch(/Sentosa Plaza/);
  });

  it('C-2: modul membaca konteks perikatan', () => {
    const k = kode();
    expect(k).toMatch(/useAudit\(\)/);
    expect(k).toMatch(/useFirm\(\)/);
    expect(k).toMatch(/activeEngagement/);
  });

  it('C-1/C-3: saldo & rekonsiliasi datang dari mesin turunan', () => {
    const k = kode();
    expect(k).toMatch(/from '\.\/invprop_derive'/);
    expect(k).toMatch(/invpropGl\(/);
    expect(k).toMatch(/invpropRollForward\(/);
    expect(k).toMatch(/invpropSubledger\(/);
  });

  it('C-2: neraca saldo TIDAK jatuh ke AMS.WTB (perangkap singleton)', () => {
    const k = kode();
    expect(k).not.toMatch(/AMS\.WTB/);
  });

  it('kunci persistensi invprop berlingkup PERIKATAN, bukan firma', () => {
    const ctx = readFileSync(join(__dirname, 'contexts.tsx'), 'utf8');
    expect(ctx).toMatch(/'invprop\.v1': 'engagement'/);
  });
});
