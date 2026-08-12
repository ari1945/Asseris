/* Kecukupan pengungkapan PSAK 68 (¶91-99) — menutup K7 PRD prd-estimasi-terfalsifikasi:
   tiap butir HARUS dapat menjadi merah bila sumbernya hilang. */
import { describe, it, expect } from 'vitest';
import { fvDisclosureChecks, fvDisclosureSummary, type Psak68Like, type FvItemLike } from './canon_fv_disclosure';
import { psak68 } from './canon_part2';
import { expertRefsOf } from './canon_expert_eval';

/** fixture minimal yang LULUS seluruh butir — tiap uji merusak satu hal saja. */
function fixture(): Psak68Like {
  const l3: FvItemLike = {
    id: 'b', label: 'Bangunan', cls: 'Revaluasi', level: 3,
    technique: 'DRC', hbu: 'Penggunaan saat ini',
    inputs: [{ k: 'Biaya pengganti', obs: false, val: 'Rp 6,8 jt/m²', range: '6,2–7,4' }],
  };
  const l1: FvItemLike = {
    id: 's', label: 'SUN', cls: 'FVOCI', level: 1,
    technique: 'Harga kuotasi', hbu: null,
    inputs: [{ k: 'Harga kuotasi', obs: true, val: 'IBPA' }],
  };
  return {
    items: [l1, l3], l3: [l3], l3Total: 100,
    l3RF: { opening: 90, closing: 100 },
    sens: [{ item: 'b', label: 'Biaya pengganti ±5%' }],
    transfers: { note: 'Tidak ada transfer periode berjalan.' },
    byLevel: [{ level: 1, n: 1 }, { level: 2, n: 0 }, { level: 3, n: 1 }],
  };
}
const by = (p: Psak68Like, id: string) => fvDisclosureChecks(p).find(c => c.id === id)!;

describe('fvDisclosureChecks — fixture lengkap', () => {
  it('seluruh butir terpenuhi', () => {
    const s = fvDisclosureSummary(fixture());
    expect(s.ok).toBe(true);
    expect(s.open).toEqual([]);
    expect(s.checks).toHaveLength(7);
  });
});

describe('tiap butir DAPAT gagal', () => {
  it('¶93b — tabel hierarki tak mencakup seluruh pos', () => {
    const p = fixture();
    p.byLevel = [{ level: 1, n: 1 }, { level: 2, n: 0 }, { level: 3, n: 0 }];
    expect(by(p, 'hierarchy').ok).toBe(false);
    expect(by(p, 'hierarchy').why).toContain('1 dari 2');
  });

  it('¶93b — tanpa pos sama sekali', () => {
    const p = fixture();
    p.items = []; p.byLevel = [];
    expect(by(p, 'hierarchy').ok).toBe(false);
  });

  it('¶93d — pos tanpa teknik valuasi disebut namanya', () => {
    const p = fixture();
    p.items[1].technique = '';
    expect(by(p, 'technique').ok).toBe(false);
    expect(by(p, 'technique').why).toContain('Bangunan');
  });

  it('¶93d — pos tanpa input sama sekali', () => {
    const p = fixture();
    p.items[0].inputs = [];
    expect(by(p, 'technique').ok).toBe(false);
    expect(by(p, 'technique').why).toContain('SUN');
  });

  it('¶93e — roll-forward tak menutup ke saldo Level 3', () => {
    const p = fixture();
    p.l3RF = { opening: 90, closing: 97 };
    const c = by(p, 'l3rollforward');
    expect(c.ok).toBe(false);
    expect(c.why).toContain('-3');
  });

  it('¶93e — selisih pembulatan 1 jt masih dianggap menutup', () => {
    const p = fixture();
    p.l3RF = { opening: 90, closing: 101 };
    expect(by(p, 'l3rollforward').ok).toBe(true);
  });

  it('¶93e — tanpa pos Level 3, butir tidak dipaksakan', () => {
    const p = fixture();
    p.l3 = []; p.l3Total = 0; p.l3RF = { opening: 0, closing: 0 };
    expect(by(p, 'l3rollforward').ok).toBe(true);
  });

  it('¶93d — input tak teramati tanpa nilai/rentang kuantitatif', () => {
    const p = fixture();
    p.l3[0].inputs = [{ k: 'Biaya pengganti', obs: false }];
    expect(by(p, 'l3quant').ok).toBe(false);
    expect(by(p, 'l3quant').why).toContain('Bangunan');
  });

  it('¶93d — pos Level 3 yang seluruh inputnya teramati tetap gagal (kontradiktif)', () => {
    const p = fixture();
    p.l3[0].inputs = [{ k: 'Harga pasar', obs: true, val: 'x' }];
    expect(by(p, 'l3quant').ok).toBe(false);
  });

  it('¶93h — sensitivitas tak menutup seluruh pos Level 3', () => {
    const p = fixture();
    p.sens = [];
    expect(by(p, 'l3sens').ok).toBe(false);
    expect(by(p, 'l3sens').why).toContain('Bangunan');
  });

  it('¶93h — tabel sensitivitas ada tetapi untuk pos LAIN', () => {
    const p = fixture();
    p.sens = [{ item: 'lain', label: 'Sesuatu' }];
    expect(by(p, 'l3sens').ok).toBe(false);
  });

  it('¶93c — kebijakan transfer belum dinyatakan', () => {
    const p = fixture();
    p.transfers = { note: '   ' };
    expect(by(p, 'transfers').ok).toBe(false);
  });

  it('¶93i — aset non-keuangan tanpa penggunaan tertinggi & terbaik', () => {
    const p = fixture();
    p.items[1].hbu = null;
    expect(by(p, 'hbu').ok).toBe(false);
    expect(by(p, 'hbu').why).toContain('Bangunan');
  });

  it('¶93i — aset KEUANGAN tanpa hbu tidak dipermasalahkan', () => {
    const p = fixture();
    p.items[0].hbu = null;
    expect(by(p, 'hbu').ok).toBe(true);
  });
});

describe('terhadap kanon psak68() yang sebenarnya', () => {
  it('portofolio nilai wajar seed memenuhi ketujuh butir', () => {
    const s = fvDisclosureSummary(psak68() as unknown as Psak68Like);
    expect(s.open.map(c => c.id)).toEqual([]);
    expect(s.ok).toBe(true);
  });

  it('roll-forward Level 3 kanon menutup persis ke saldo Level 3', () => {
    const p = psak68();
    expect(p.l3RF.closing).toBe(p.l3Total);
  });

  it('pakar yang dirujuk portofolio = V-2 (KJPP) & V-3 (derivatif)', () => {
    expect(expertRefsOf(psak68().items).sort()).toEqual(['V-2', 'V-3']);
  });
});
