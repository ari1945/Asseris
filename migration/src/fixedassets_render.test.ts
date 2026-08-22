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

const stage = { firmName: 'KAP Uji & Rekan', sessionName: 'Bayu Santoso', role: 'Finance Firma', canEdit: true, logged: [] as unknown[] };

/* `firm` DAN `user` adalah kunci AuthContext yang NYATA (contexts.tsx:
   `firm: D.FIRM`, `user: {...}`). FirmContext tidak menerbitkan kunci `firm`
   sama sekali — me-mock-nya di sana berarti menguji bentuk konteks yang tak
   pernah ada, dan tombol yang "hidup" di uji berdiri mati di produksi. */
vi.mock('./contexts', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('./contexts');
  return {
    ...actual,
    useAuth: () => ({
      user: stage.sessionName ? { name: stage.sessionName, role: stage.role } : null,
      firm: stage.firmName ? { name: stage.firmName } : null,
      can: () => stage.canEdit,
    }),
    useAudit: () => ({ logActivity: (e: unknown) => { stage.logged.push(e); } }),
    useAmsPersist: (_k: string, init: unknown) => {
      const [v, setV] = React.useState(() => (typeof init === 'function' ? (init as () => unknown)() : init));
      return [v, (next: unknown) => {
        const nv = typeof next === 'function' ? (next as (p: unknown) => unknown)(v) : next;
        store.value = nv;
        setV(nv);
      }];
    },
  };
});
vi.mock('./shell', () => ({ SubBar: ({ right }: { right?: unknown }) => right as never }));

/* Persistensi disadap: yang diuji bukan tRPC-nya, melainkan bahwa layar benar-benar
   MENULIS keputusan (dengan pelaku & alasan), bukan sekadar menutup formulirnya. */
const store: { value: unknown } = { value: undefined };

const { FixedAssets } = await import('./view_firmtreasury');

type Root = { render: (node: unknown) => void; unmount: () => void };
let container: HTMLDivElement | null = null;
let root: Root | null = null;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  stage.firmName = 'KAP Uji & Rekan'; stage.sessionName = 'Bayu Santoso';
  stage.role = 'Finance Firma'; stage.canEdit = true; stage.logged = [];
  store.value = undefined;
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

/* ------------------------------------------------------------------
   FA2 — jalur keputusan kandidat pencatatan ganda
   ------------------------------------------------------------------ */

describe('FA2 — kandidat pencatatan ganda dapat diputuskan, dan keputusannya tinggal', () => {
  const tombol = (label: string): HTMLButtonElement | undefined =>
    Array.from(document.querySelectorAll('button'))
      .find((x) => (x.textContent || '').trim() === label) as HTMLButtonElement | undefined;

  const putuskan = (label: string, alasan: string): void => {
    React.act(() => { (tombol(label) as HTMLButtonElement).click(); });
    const ta = document.querySelector('textarea') as HTMLTextAreaElement;
    expect(ta, 'kotak alasan tak muncul').toBeTruthy();
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
    React.act(() => {
      setter.call(ta, alasan);
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    });
    React.act(() => { (tombol('Catat keputusan') as HTMLButtonElement).click(); });
  };

  it('tanpa kewenangan, tombol keputusan tak ada — dan sebabnya dikatakan', () => {
    stage.canEdit = false;
    mount();
    expect(tombol('Bukan duplikat')).toBeFalsy();
    expect(tombol('Duplikat')).toBeFalsy();
    expect(teks()).toContain('firmfin.edit');
  });

  it('tanpa identitas sesi, keputusan tak dapat diatribusikan — tombolnya juga tak ada', () => {
    stage.sessionName = '';
    mount();
    expect(tombol('Bukan duplikat')).toBeFalsy();
    expect(teks()).toContain('Identitas sesi tak tersedia');
  });

  it('alasan WAJIB — tombol simpan mati sampai diisi', () => {
    mount();
    React.act(() => { (tombol('Bukan duplikat') as HTMLButtonElement).click(); });
    expect((tombol('Catat keputusan') as HTMLButtonElement).disabled).toBe(true);
  });

  it('keputusan tersimpan dengan pelaku, peran, tanggal & alasan — dan barisnya TIDAK hilang', () => {
    mount();
    putuskan('Bukan duplikat', 'Nomor seri tak beririsan.');
    const tersimpan = store.value as Record<string, { verdict: string; who: string; role: string; when: string; reason: string }>;
    const kunci = Object.keys(tersimpan);
    expect(kunci.length, 'tak ada yang ditulis').toBe(1);
    const rec = tersimpan[kunci[0]];
    expect(rec.verdict).toBe('bukan');
    expect(rec.who).toBe('Bayu Santoso');
    expect(rec.role).toBe('Finance Firma');
    expect(rec.when, 'stempel bukan dari klok SSOT').toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(rec.reason).toContain('Nomor seri');
    /* Tercatat ke jejak audit, bukan hanya ke dokumen. */
    expect(stage.logged.length).toBe(1);
    /* Dan barisnya tetap dapat ditinjau — tak hilang dari layar. */
    expect(teks()).toContain('yang sudah diputuskan');
  });

  it('"duplikat dikonfirmasi" MENGUNGKAPKAN nilainya dan menyatakan register belum dikoreksi', () => {
    mount();
    putuskan('Duplikat', 'Satu server fisik, dua nomor aset.');
    React.act(() => { (tombol('Tampilkan 1 yang sudah diputuskan') as HTMLButtonElement).click(); });
    const t = teks();
    expect(t).toContain('Duplikat dikonfirmasi');
    expect(t).toContain('benar-benar duplikat');
    expect(t, 'layar tak mengatakan registernya belum dikoreksi').toContain('belum');
    expect(t).toContain('Bayu Santoso');
  });
});
