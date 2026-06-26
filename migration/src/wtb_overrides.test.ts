/* B — overlayWtbOverrides: override WTB di-key per KODE (tahan re-impor/re-map). */
import { describe, it, expect } from 'vitest';
import { overlayWtbOverrides, type OverlayWtbRow, type WtbOverrideEntry } from './wtb_overrides';

const seed: OverlayWtbRow[] = [
  { key: 'wtb0', code: '1-1100', name: 'Kas', unadj: 3000, aje: 0 },
  { key: 'wtb1', code: '1-1200', name: 'Piutang', unadj: 5000, aje: 0 },
];
/* WTB sama (kode sama) tapi TERIMPOR ulang → key posisi berganti namespace & urutan. */
const reimported: OverlayWtbRow[] = [
  { key: 'imp0', code: '1-1200', name: 'Piutang Usaha', unadj: 5200, aje: 0 },
  { key: 'imp1', code: '1-1100', name: 'Kas & Setara', unadj: 3100, aje: 0 },
];

describe('overlayWtbOverrides — keying by code', () => {
  it('override menempel ke baris berkode sama (catatan + status + aje)', () => {
    const ov: Record<string, WtbOverrideEntry> = { '1-1200': { note: 'cek aging', revStatus: 'reviewed', aje: -300 } };
    const out = overlayWtbOverrides(seed, ov, {});
    const piutang = out.find((r) => r.code === '1-1200')!;
    expect(piutang.note).toBe('cek aging');
    expect(piutang.revStatus).toBe('reviewed');
    expect(piutang.aje).toBe(-300);
    expect(piutang.adj).toBe(5000 - 300); // unadj + aje
  });

  it('BUG B tertutup: override BERTAHAN setelah re-impor (key posisi berubah)', () => {
    const ov: Record<string, WtbOverrideEntry> = { '1-1200': { note: 'cek aging', revStatus: 'reviewed' } };
    const out = overlayWtbOverrides(reimported, ov, {});
    const piutang = out.find((r) => r.code === '1-1200')!;
    // key kini 'imp0' (bukan 'wtb1') — override TETAP nempel karena di-key code
    expect(piutang.key).toBe('imp0');
    expect(piutang.note).toBe('cek aging');
    expect(piutang.revStatus).toBe('reviewed');
    expect(piutang.adj).toBe(5200); // unadj terimpor baru + aje 0
  });

  it('override pada kode yang tak ada (yatim) diabaikan aman', () => {
    const ov: Record<string, WtbOverrideEntry> = { '9-9999': { note: 'akun lenyap' } };
    const out = overlayWtbOverrides(seed, ov, {});
    expect(out).toHaveLength(2);
    expect(out.every((r) => r.note == null)).toBe(true);
  });

  it('delta AJE posted (by code) ditambahkan ke aje & adj', () => {
    const out = overlayWtbOverrides(seed, {}, { '1-1100': 250 });
    const kas = out.find((r) => r.code === '1-1100')!;
    expect(kas.aje).toBe(250);
    expect(kas.adj).toBe(3000 + 250);
  });

  it('override.aje + delta posted dijumlah (keduanya by code)', () => {
    const out = overlayWtbOverrides(seed, { '1-1100': { aje: 100 } }, { '1-1100': 250 });
    const kas = out.find((r) => r.code === '1-1100')!;
    expect(kas.aje).toBe(350);
    expect(kas.adj).toBe(3000 + 350);
  });
});
