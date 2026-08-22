// @vitest-environment jsdom
/* ============================================================
   Aset Tetap DI LAYAR (FA3 · FA4).

   Gerbang murni (`fixedassets_export.test.ts`) membuktikan isi kertas kerjanya.
   Yang TIDAK dibuktikannya:
     · bahwa memilih aset untuk membuka skedul penyusutannya dapat dilakukan
       PENUH dengan papan-ketik — `<tr onClick>` lolos setiap gerbang murni;
     · bahwa ekspor menolak keluar tanpa identitas penerbit.

   Pola mengikuti `treasury_render.test.ts`.
   ============================================================ */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';

const stage = { firmName: 'KAP Uji & Rekan' };

vi.mock('./contexts', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('./contexts');
  return { ...actual, useFirm: () => ({ firm: { name: stage.firmName } }) };
});
vi.mock('./shell', () => ({ SubBar: ({ right }: { right?: unknown }) => right as never }));

const { FixedAssets } = await import('./view_firmtreasury');

type Root = { render: (node: unknown) => void; unmount: () => void };
let container: HTMLDivElement | null = null;
let root: Root | null = null;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  stage.firmName = 'KAP Uji & Rekan';
  container = document.createElement('div');
  document.body.appendChild(container);
  React.act(() => { root = createRoot(container as HTMLDivElement) as unknown as Root; });
});
afterEach(() => {
  React.act(() => { (root as Root).unmount(); });
  container?.remove();
  container = null; root = null;
});

const mount = (): void => { React.act(() => { (root as Root).render(React.createElement(FixedAssets)); }); };
const teks = (): string => document.body.textContent || '';
const tombolAset = (): HTMLButtonElement | null =>
  document.querySelector('button.asset-row-btn') as HTMLButtonElement | null;

/* ------------------------------------------------------------------
   FA3 — kontrol native
   ------------------------------------------------------------------ */

describe('FA3 — memilih aset dapat dilakukan penuh dengan papan-ketik', () => {
  it('kode aset adalah <button> ber-aria-expanded, bukan <tr onClick>', () => {
    mount();
    const btn = tombolAset();
    expect(btn, 'tombol kode aset tak ada').toBeTruthy();
    expect(btn!.getAttribute('aria-expanded')).toBe('false');
    expect(btn!.getAttribute('title')).toContain('skedul penyusutan');
    /* Baris tabel tak boleh lagi jadi kontrol: jsdom tak punya handler React di
       DOM, jadi yang diperiksa adalah tak ada baris yang mengaku dapat diklik. */
    const barisKlik = Array.from(document.querySelectorAll('tbody tr'))
      .filter((tr) => (tr.getAttribute('style') || '').includes('cursor'));
    expect(barisKlik.length, 'baris register masih mengaku dapat diklik').toBe(0);
  });

  it('mengaktifkan tombol membuka skedul penyusutan, dan aria-expanded mengikutinya', () => {
    mount();
    const btn = tombolAset() as HTMLButtonElement;
    const kode = (btn.textContent || '').trim();
    expect(kode.length).toBeGreaterThan(0);
    React.act(() => { btn.click(); });
    expect(teks()).toContain('Skedul Penyusutan');
    expect(tombolAset()!.getAttribute('aria-expanded')).toBe('true');
    React.act(() => { (tombolAset() as HTMLButtonElement).click(); });
    expect(tombolAset()!.getAttribute('aria-expanded')).toBe('false');
  });
});

/* ------------------------------------------------------------------
   FA4 — identitas penerbit ekspor
   ------------------------------------------------------------------ */

describe('FA4 — kertas kerja tersegel tidak keluar tanpa penerbit', () => {
  const tombolEkspor = (): HTMLButtonElement =>
    Array.from(document.querySelectorAll('button'))
      .find((x) => (x.textContent || '').includes('Kertas Kerja')) as HTMLButtonElement;

  it('tombol ekspor hidup ketika identitas firma tersedia', () => {
    mount();
    expect(tombolEkspor().disabled).toBe(false);
  });

  it('tombol ekspor mati bila identitas firma tak tersedia', () => {
    stage.firmName = '';
    mount();
    const b = tombolEkspor();
    expect(b.disabled).toBe(true);
    expect(b.getAttribute('title')).toContain('Identitas firma tak tersedia');
  });
});
