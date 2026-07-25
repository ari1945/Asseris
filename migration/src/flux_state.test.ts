/* PR-3 — SSOT telaah fluktuasi SA 520 (fungsi murni). */
import { describe, it, expect } from 'vitest';
import {
  mergeLegacyFlux, statusOf, noteOf, upsertFlux, setFluxExpectation, fluxCounts,
  fluxThresholds, isFluxFlagged,
} from './flux_state';
import type { FluxState } from './flux_state';

const AT = '2026-07-25T10:00:00.000Z';
const ARI = { name: 'Anindya Pramesti', role: 'Audit Manager' };

describe('mergeLegacyFlux — baca-lewat dua store warisan', () => {
  it('catatan lama tab WTB (wtbOverrides) terbaca', () => {
    const s = mergeLegacyFlux(null, { '1-1200': { note: 'DSO naik 2 hari', revStatus: 'explained' } });
    expect(statusOf(s, '1-1200')).toBe('explained');
    expect(noteOf(s, '1-1200')).toBe('DSO naik 2 hari');
  });

  it('store baru menang atas store lama untuk kode yang sama', () => {
    const s = mergeLegacyFlux(
      { '1-1200': { status: 'followup', note: 'baru' } },
      { '1-1200': { status: 'explained', note: 'lama' } as never },
    );
    expect(noteOf(s, '1-1200')).toBe('baru');
  });

  it("kosakata lama 'pending' BUKAN telaah selesai → jatuh ke followup, tak pernah explained", () => {
    const s = mergeLegacyFlux({ '1-1300': { status: 'pending', note: 'indikasi slow-moving' } }, null);
    expect(statusOf(s, '1-1300')).toBe('followup');
  });

  it('entri kosong (tanpa status, catatan, ekspektasi) tidak dibawa masuk', () => {
    const s = mergeLegacyFlux({ '9-9999': { status: undefined, note: '' } }, { '8-8888': { note: '' } });
    expect(Object.keys(s)).toHaveLength(0);
  });

  it('field aje pada wtbOverrides diabaikan (bukan urusan telaah)', () => {
    const s = mergeLegacyFlux(null, { '1-1210': { note: '', revStatus: undefined } as never });
    expect(statusOf(s, '1-1210')).toBeNull();
  });

  it('entri warisan tanpa penulis/waktu dibiarkan kosong — tidak dikarang', () => {
    const s = mergeLegacyFlux(null, { '1-1200': { note: 'catatan lama', revStatus: 'explained' } });
    expect(s['1-1200'].by).toBe('');
    expect(s['1-1200'].at).toBe('');
  });

  it('ekspektasi exp/tol modul analytical ikut terbawa', () => {
    const s = mergeLegacyFlux({ '4-1100': { exp: 8, tol: 5 } }, null);
    expect(s['4-1100'].exp).toBe(8);
    expect(s['4-1100'].tol).toBe(5);
  });
});

describe('statusOf — ketiadaan entri = BELUM DITELAAH', () => {
  it('akun tanpa entri mengembalikan null, bukan explained', () => {
    expect(statusOf({}, '1-1100')).toBeNull();
    expect(statusOf(null, '1-1100')).toBeNull();
  });
});

describe('upsertFlux — menstempel penulis & waktu (SA 230)', () => {
  it('menyimpan status, catatan, by, at', () => {
    const s = upsertFlux({}, '1-1300', { status: 'explained', note: 'uji NRV dijalankan' }, ARI, AT);
    expect(s['1-1300']).toEqual({ status: 'explained', note: 'uji NRV dijalankan', by: 'Anindya Pramesti', at: AT });
  });

  it('tanpa aktor → penulis kosong, bukan nama palsu', () => {
    const s = upsertFlux({}, '1-1300', { status: 'followup', note: 'x' }, null, AT);
    expect(s['1-1300'].by).toBe('');
  });

  it('MERGE, bukan replace — ekspektasi exp/tol bertahan', () => {
    const a = setFluxExpectation({}, '4-1100', { exp: 12, tol: 3 }, ARI, AT);
    const b = upsertFlux(a, '4-1100', { status: 'explained', note: 'sesuai ekspektasi' }, ARI, AT);
    expect(b['4-1100'].exp).toBe(12);
    expect(b['4-1100'].tol).toBe(3);
    expect(b['4-1100'].status).toBe('explained');
  });

  it('tak mengubah state lama (murni)', () => {
    const a: FluxState = {};
    upsertFlux(a, '1-1100', { status: 'explained', note: 'x' }, ARI, AT);
    expect(Object.keys(a)).toHaveLength(0);
  });
});

describe('setFluxExpectation — menetapkan ekspektasi ≠ menyelesaikan telaah', () => {
  it('akun belum ditelaah → status followup, bukan explained', () => {
    const s = setFluxExpectation({}, '5-1100', { exp: 10 }, ARI, AT);
    expect(statusOf(s, '5-1100')).toBe('followup');
    expect(s['5-1100'].exp).toBe(10);
  });

  it('tidak menimpa kesimpulan yang sudah ada', () => {
    const a = upsertFlux({}, '5-1100', { status: 'explained', note: 'ok' }, ARI, AT);
    const b = setFluxExpectation(a, '5-1100', { tol: 2 }, ARI, AT);
    expect(statusOf(b, '5-1100')).toBe('explained');
    expect(noteOf(b, '5-1100')).toBe('ok');
  });
});

describe('fluxCounts — akun tanpa telaah TIDAK dihitung dijelaskan', () => {
  it('perikatan kosong: semua ter-flag = unreviewed, explained 0', () => {
    const c = fluxCounts(['1-1100', '1-1200', '4-1100'], {});
    expect(c).toMatchObject({ explained: 0, unreviewed: 3, total: 3, outstanding: 3 });
  });

  it('memilah keempat keadaan', () => {
    let s: FluxState = {};
    s = upsertFlux(s, 'a', { status: 'explained', note: '' }, ARI, AT);
    s = upsertFlux(s, 'b', { status: 'followup', note: '' }, ARI, AT);
    s = upsertFlux(s, 'c', { status: 'unexplained', note: '' }, ARI, AT);
    const c = fluxCounts(['a', 'b', 'c', 'd'], s);
    expect(c).toMatchObject({ explained: 1, followup: 1, unexplained: 1, unreviewed: 1, total: 4, outstanding: 3 });
  });

  it('telaah atas akun yang TIDAK ter-flag tak ikut terhitung', () => {
    const s = upsertFlux({}, 'z', { status: 'explained', note: '' }, ARI, AT);
    expect(fluxCounts(['a'], s)).toMatchObject({ explained: 0, unreviewed: 1 });
  });
});

describe('ambang fluktuasi — SATU aturan untuk semua permukaan', () => {
  it('ambang tersimpan menang atas PM; fallback ke PM lalu 20%', () => {
    expect(fluxThresholds({ absJt: 500, pctThr: 15 }, 3_188_000_000)).toEqual({ absThr: 500_000_000, pctThr: 15 });
    expect(fluxThresholds(null, 3_188_000_000)).toEqual({ absThr: 3_188_000_000, pctThr: 20 });
    expect(fluxThresholds(null, null)).toEqual({ absThr: null, pctThr: 20 });
  });

  it('aturan OR — nominal ATAU persentase, bukan keduanya (dulu Ringkasan analytical memakai AND)', () => {
    const t = fluxThresholds({ absJt: 1000, pctThr: 20 }, null);
    expect(isFluxFlagged(2_000_000_000, 5, t)).toBe(true);    // nominal saja
    expect(isFluxFlagged(10_000_000, 45, t)).toBe(true);      // persentase saja
    expect(isFluxFlagged(10_000_000, 5, t)).toBe(false);
  });

  it('tanpa PM & tanpa ambang nominal, kriteria persentase tetap berlaku', () => {
    const t = fluxThresholds({ absJt: null, pctThr: 20 }, null);
    expect(t.absThr).toBe(null);
    expect(isFluxFlagged(9_999_999_999, 3, t)).toBe(false);
    expect(isFluxFlagged(1, 25, t)).toBe(true);
  });
});
