// @vitest-environment jsdom
/* ============================================================
   Anggaran & Arus Kas DI LAYAR (TR1 · TR2 · TR3 · TR5).

   Gerbang murni (`treasury_forecast.test.ts`) membuktikan derivasinya. Yang TIDAK
   dibuktikannya:
     · bahwa pengungkapan basis forecast benar-benar TERBACA di tab arus kas,
       dan pengungkapan skenario yang lama masih ada di sana;
     · bahwa satu perubahan kebijakan menggeser KEEMPAT penanda zona perhatian
       sekaligus (kartu KPI, label grafik, warna batang, kolom saldo akhir);
     · bahwa drill-down anggaran benar-benar dapat dioperasikan papan-ketik.

   Pola mengikuti `timebudget_econ_render.test.ts`.
   ============================================================ */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { AMS } from './data';
import { FIRM_CASH_POLICY } from './data_firmfin';
import { currentBalances } from './firm_ledger';
import type { CoaAccount, GlJournal } from './firm_ledger';

const seedCoa = () => AMS.FIRM_COA as unknown as CoaAccount[];
const seedGl = () => AMS.FIRM_GL as unknown as GlJournal[];
const derivedCoa = (): CoaAccount[] => {
  const bal = currentBalances(seedCoa(), seedGl(), seedGl());
  return seedCoa().map((a) => ({ ...a, bal: bal[a.code] }));
};

const stage = { firmName: 'KAP Uji & Rekan' };

vi.mock('./contexts', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('./contexts');
  /* `firm` = kunci AuthContext yang NYATA. Dulu digantung di `useFirm()`, konteks
     yang tak punya kunci itu sama sekali — mock yang mengarang bentuk konteks. */
  return { ...actual, useAuth: () => ({ firm: stage.firmName ? { name: stage.firmName } : null }) };
});
vi.mock('./use_firm_coa', () => ({ useFirmCoa: () => ({ coa: derivedCoa() }) }));
vi.mock('./shell', () => ({ SubBar: ({ right }: { right?: unknown }) => right as never }));
const eksporStage: { calls: { firm?: string }[]; gagal: string } = { calls: [], gagal: '' };
vi.mock('./export_xlsx', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('./export_xlsx');
  return {
    ...actual,
    amsExportXlsx: async (model: { firm?: string }) => {
      if (eksporStage.gagal) throw new Error(eksporStage.gagal);
      eksporStage.calls.push(model);
    },
  };
});

const { FirmTreasury } = await import('./view_firmtreasury');

type Root = { render: (node: unknown) => void; unmount: () => void };
let container: HTMLDivElement | null = null;
let root: Root | null = null;
const TODAY = String(AMS.TODAY);
const FLOOR = FIRM_CASH_POLICY.watchFloorIdr;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  stage.firmName = 'KAP Uji & Rekan';
  eksporStage.calls = []; eksporStage.gagal = '';
  container = document.createElement('div');
  document.body.appendChild(container);
  React.act(() => { root = createRoot(container as HTMLDivElement) as unknown as Root; });
});
afterEach(() => {
  React.act(() => { (root as Root).unmount(); });
  container?.remove();
  container = null; root = null;
  (AMS as unknown as Record<string, unknown>).TODAY = TODAY;
  FIRM_CASH_POLICY.watchFloorIdr = FLOOR;
});

const mount = (): void => { React.act(() => { (root as Root).render(React.createElement(FirmTreasury)); }); };
const openTab = (label: string): void => {
  const tab = Array.from(document.querySelectorAll('button'))
    .find((b) => (b.textContent || '').trim().startsWith(label));
  expect(tab, `tab '${label}' tak ditemukan`).toBeTruthy();
  React.act(() => { (tab as HTMLButtonElement).click(); });
};
const teks = (): string => document.body.textContent || '';
const amber = (el: Element | null | undefined): boolean =>
  !!el && ((el as HTMLElement).getAttribute('style') || '').includes('var(--amber');

/* ------------------------------------------------------------------
   TR1 — pengungkapan basis
   ------------------------------------------------------------------ */

describe('TR1 — tab arus kas menyatakan basis forecastnya', () => {
  it('menyebut deretnya ANGKA SEED, dan menyebut penggantinya', () => {
    mount();
    openTab('Forecast Arus Kas');
    const t = teks();
    expect(t).toContain('ANGKA SEED');
    expect(t).toContain('AMS.CASH_FORECAST');
    expect(t).toMatch(/PR-6/);
    expect(t, 'sumber pengganti (AR/AP/pajak) tak disebut').toMatch(/jatuh tempo/);
  });

  it('memperlihatkan tandanya dengan ANGKA: saldo awal seed vs akun kontrol kas', () => {
    /* Pengungkapan yang hanya berupa kalimat mudah dilewati. Dua angka yang
       berselisih di sebelahnya tidak. */
    mount();
    openTab('Forecast Arus Kas');
    expect(teks()).toContain('Rp 8,58 M');   // saldo awal seed 8.575 jt
    expect(teks()).toContain('Rp 8,48 M');   // kontrol kas GL 8.480.638.000
  });

  it('pengungkapan skenario yang LAMA tidak dihapus', () => {
    mount();
    openTab('Forecast Arus Kas');
    const t = teks();
    expect(t).toContain('menyesuaikan arus masuk');
    expect(t).toContain('zona perhatian');
  });
});

/* ------------------------------------------------------------------
   TR2 — satu kebijakan menggerakkan empat penanda
   ------------------------------------------------------------------ */

describe('TR2 — satu parameter menggeser KEEMPAT penanda zona perhatian', () => {
  const penanda = () => {
    const kpi = Array.from(document.querySelectorAll('.stat'))
      .find((d) => (d.querySelector('.s-lbl')?.textContent || '').includes('Proyeksi Kas Terendah'));
    const labelGrafik = document.querySelectorAll('.mono.tiny')[0];
    const batang = Array.from(document.querySelectorAll('div'))
      .filter((d) => ((d as HTMLElement).getAttribute('style') || '').includes('borderRadius') === false
        && ((d as HTMLElement).getAttribute('style') || '').includes('4px 4px 0 0'));
    const selSaldoAkhir = Array.from(document.querySelectorAll('tbody tr'))
      .map((tr) => tr.querySelectorAll('td')[5])
      .filter(Boolean);
    return {
      kpi: kpi?.querySelector('.s-val') as HTMLElement | null,
      labelGrafik: labelGrafik as HTMLElement | null,
      batang: batang as HTMLElement[],
      selSaldoAkhir: selSaldoAkhir as HTMLElement[],
    };
  };

  it('pada kebijakan Rp 7 M seed berada di atas ambang — tak satu pun penanda menyala', () => {
    /* Premis yang harus dinyatakan: jalur amber DORMAN pada data hari ini
       (saldo terendah 9.045 jt > 7.000 jt). Tanpa menyebutnya, uji di bawah
       akan terlihat membuktikan sesuatu yang sebenarnya tidak diuji. */
    mount();
    openTab('Forecast Arus Kas');
    const p = penanda();
    expect(amber(p.kpi)).toBe(false);
    expect(amber(p.labelGrafik)).toBe(false);
    expect(p.batang.filter((b) => amber(b))).toHaveLength(0);
    expect(p.selSaldoAkhir.filter((td) => amber(td))).toHaveLength(0);
  });

  it('menaikkan ambang di LAPISAN DATA menyalakan keempatnya sekaligus', () => {
    FIRM_CASH_POLICY.watchFloorIdr = 12_000_000_000;
    mount();
    openTab('Forecast Arus Kas');
    const p = penanda();
    expect(amber(p.kpi), 'kartu KPI').toBe(true);
    expect(amber(p.labelGrafik), 'label grafik').toBe(true);
    expect(p.batang.length).toBe(6);
    expect(p.batang.every((b) => amber(b)), 'warna batang').toBe(true);
    expect(p.selSaldoAkhir).toHaveLength(6);
    expect(p.selSaldoAkhir.every((td) => amber(td)), 'kolom saldo akhir').toBe(true);
  });

  it('catatan kaki menyebut ambang yang BERLAKU, bukan angka yang diketik', () => {
    FIRM_CASH_POLICY.watchFloorIdr = 12_000_000_000;
    mount();
    openTab('Forecast Arus Kas');
    expect(teks()).toContain('Saldo < Rp 12 M');
    expect(teks()).toContain('belum dinyatakan');
  });
});

/* ------------------------------------------------------------------
   TR3 — periode
   ------------------------------------------------------------------ */

describe('TR3 — label periode mengikuti klok SSOT', () => {
  it('hari ini: Mar–Agu 2026', () => {
    mount();
    openTab('Forecast Arus Kas');
    expect(teks()).toContain('Mar 2026');
    expect(teks()).toContain('Agu 2026');
  });

  it('klok maju setahun → tahun pada label ikut maju, tanpa 2026 tersisa', () => {
    (AMS as unknown as Record<string, unknown>).TODAY = '2027-03-09';
    mount();
    openTab('Forecast Arus Kas');
    expect(teks()).toContain('Mar 2027');
    expect(teks(), 'tahun lama masih tergambar').not.toContain('Mar 2026');
  });

  it('klok yang tak lagi sejalan deret: label BERHENTI menyebut tahun & alasannya muncul', () => {
    (AMS as unknown as Record<string, unknown>).TODAY = '2026-09-30';
    mount();
    openTab('Forecast Arus Kas');
    const t = teks();
    expect(t).toContain('BUKAN periode berjalan');
    expect(t).toContain('Sep 2026');
    expect(t, 'label menurut pada tahun klok').not.toContain('Mar 2026');
  });
});

/* ------------------------------------------------------------------
   TR4/TR5 — identitas ekspor & kontrol native
   ------------------------------------------------------------------ */

describe('TR4/TR5 — ekspor tersegel & drill-down papan-ketik', () => {
  it('tombol Export mati bila identitas firma tak tersedia', () => {
    stage.firmName = '';
    mount();
    const b = Array.from(document.querySelectorAll('button'))
      .find((x) => (x.textContent || '').includes('Export')) as HTMLButtonElement;
    expect(b.disabled).toBe(true);
    expect(b.getAttribute('title')).toContain('Identitas firma tak tersedia');
  });

  it('baris anggaran adalah <button> ber-aria-expanded, bukan <tr onClick>', () => {
    mount();
    const btn = document.querySelector('button.bud-line-btn') as HTMLButtonElement | null;
    expect(btn, 'tombol baris anggaran tak ada').toBeTruthy();
    expect(btn!.getAttribute('aria-expanded')).toBe('false');
    expect(btn!.getAttribute('title')).toContain('Buka fasing');
  });

  it('mengaktifkan tombol membuka drill-down, dan aria-expanded mengikutinya', () => {
    mount();
    const btn = document.querySelector('button.bud-line-btn') as HTMLButtonElement;
    const nama = (btn.textContent || '').trim();
    React.act(() => { btn.click(); });
    const sesudah = document.querySelector('button.bud-line-btn') as HTMLButtonElement;
    expect(sesudah.getAttribute('aria-expanded')).toBe('true');
    expect(teks()).toContain('Fasing Triwulanan');
    expect(teks()).toContain('Pendorong Varians');
    expect(nama.length).toBeGreaterThan(0);
  });

  it('label kuartal memakai tahun buku dari data, bukan angka yang diketik', () => {
    mount();
    const btn = document.querySelector('button.bud-line-btn') as HTMLButtonElement;
    React.act(() => { btn.click(); });
    const fy = AMS.FIRM_BUDGET_FY as unknown as number;
    expect(teks()).toContain(`Q1 ${fy}`);
    expect(teks()).toContain(`FY${fy}`);
  });
});

/* ------------------------------------------------------------------
   TR6 — kertas kerja Anggaran & Arus Kas benar-benar dapat DIKELUARKAN
   ------------------------------------------------------------------ */

describe('TR6 — tombol Export bukan sekadar tergambar', () => {
  const tombolExport = (): HTMLButtonElement =>
    Array.from(document.querySelectorAll('button'))
      .find((b) => (b.textContent || '').includes('Export')) as HTMLButtonElement;

  it('hidup ketika identitas firma tersedia, dan klik SAMPAI ke penulis berkas', async () => {
    mount();
    const b = tombolExport();
    expect(b, 'tombol Export tak ada').toBeTruthy();
    expect(b.disabled).toBe(false);
    await React.act(async () => { b.click(); });
    expect(eksporStage.calls).toHaveLength(1);
    expect(eksporStage.calls[0].firm).toBe('KAP Uji & Rekan');
  });

  it('tanpa identitas firma ia DIMATIKAN dan menyebut sebabnya', () => {
    stage.firmName = '';
    mount();
    const b = tombolExport();
    expect(b.disabled).toBe(true);
    expect(b.getAttribute('title')).toContain('Identitas firma tak tersedia');
  });

  it('kegagalan ekspor berakhir di layar, bukan sebagai rejection tanpa penangan', async () => {
    eksporStage.gagal = 'penulis XLSX menolak muatan';
    mount();
    await React.act(async () => { tombolExport().click(); });
    const alert = document.querySelector('[role="alert"]');
    expect(alert, 'tak ada baris alasan kegagalan').toBeTruthy();
    expect(alert?.textContent).toContain('Ekspor gagal');
    expect(alert?.textContent).toContain('penulis XLSX menolak muatan');
  });
});
