// @vitest-environment jsdom
/* ============================================================
   `useInitialTab` — kontrak DUA ARAH (PRD V-9).

   Yang diuji di sini adalah PERILAKU HOOK YANG DIPAKAI VIEW, bukan fungsi murni
   di bawahnya (itu sudah di `tab_address.test.ts`). Alasannya tercatat berulang
   di proyek ini: uji yang memaku lapisan bawah saja pernah hijau di atas view
   yang bertentangan dengan dirinya sendiri.

   Tiga hal yang dipaku, karena persis inilah yang rusak sebelum V-9:
     SC-1  ganti tab  → bilah alamat ikut berubah (dulu: alamat berbohong)
     SC-2  hash berubah dari LUAR (Back/tempel URL) → tab ikut, tanpa reload
     SC-3  satu perubahan tab = tepat SATU penggantian riwayat, tak ada gelung
   ============================================================ */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { useInitialTab } from './contexts';

const h = React.createElement;

type Root = { render: (n: unknown) => void; unmount: () => void };
let container: HTMLDivElement | null = null;
let root: Root | null = null;

/** Harness: merender hook & mengekspos [tab, setTab] terakhir ke pemanggil uji. */
let latest: { tab: string; setTab: (v: string) => void } | null = null;

function Probe({ moduleId, fallback, valid }: { moduleId: string; fallback: string; valid?: string[] }) {
  const [tab, setTab] = useInitialTab(moduleId, fallback, valid) as [string, (v: string) => void];
  latest = { tab, setTab };
  return h('div', { 'data-tab': tab }, tab);
}

function mount(props: { moduleId: string; fallback: string; valid?: string[] }): void {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container) as unknown as Root;
  React.act(() => { (root as Root).render(h(Probe, props)); });
}

/* Menirukan Back/Forward & URL yang ditempel. `hashchange` dikirim ASINKRON
   (tugas terpisah) baik oleh peramban maupun jsdom — karena itu harness ini
   menunggu satu makrotask; menyetel hash lalu langsung membaca state akan
   melaporkan kegagalan palsu. */
async function setHash(hash: string): Promise<void> {
  await React.act(async () => {
    location.hash = hash;
    await new Promise((r) => setTimeout(r, 0));
  });
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  latest = null;
  history.replaceState(null, '', '/');
});

afterEach(() => {
  React.act(() => { root?.unmount(); });
  container?.remove();
  container = null; root = null; latest = null;
  vi.restoreAllMocks();
});

describe('seed awal — perilaku lama dipertahankan', () => {
  it('tanpa hash & tanpa one-shot → fallback', () => {
    mount({ moduleId: 'wtb', fallback: 'tb' });
    expect(latest?.tab).toBe('tb');
  });

  it('hash modul ini → tab dari URL menang atas fallback', () => {
    history.replaceState(null, '', '#/wtb?tab=review');
    mount({ moduleId: 'wtb', fallback: 'tb' });
    expect(latest?.tab).toBe('review');
  });

  it('hash modul LAIN tidak bocor ke sini (SC-5)', () => {
    history.replaceState(null, '', '#/soqm?tab=toolkit');
    mount({ moduleId: 'wtb', fallback: 'tb' });
    expect(latest?.tab).toBe('tb');
  });

  it('one-shot sessionStorage tetap berlaku & DIKONSUMSI', () => {
    sessionStorage.setItem('ams.navtab.wtb', 'group');
    mount({ moduleId: 'wtb', fallback: 'tb' });
    expect(latest?.tab).toBe('group');
    expect(sessionStorage.getItem('ams.navtab.wtb')).toBeNull();
  });

  it('tab BUSUK di URL jatuh ke fallback bila whitelist diberikan (SC-6)', () => {
    history.replaceState(null, '', '#/wtb?tab=drill');
    mount({ moduleId: 'wtb', fallback: 'tb', valid: ['tb', 'review', 'group'] });
    expect(latest?.tab).toBe('tb');
  });
});

describe('SC-1 — state menulis alamat', () => {
  it('ganti tab → hash ikut berubah', () => {
    history.replaceState(null, '', '#/wtb?tab=tb');
    mount({ moduleId: 'wtb', fallback: 'tb' });
    React.act(() => { latest?.setTab('review'); });
    expect(location.hash).toBe('#/wtb?tab=review');
    expect(latest?.tab).toBe('review');
  });

  it('mount pada hash tanpa `?tab=` MENULIS tab yang tampil — alamat tak boleh setengah', () => {
    history.replaceState(null, '', '#/wtb');
    mount({ moduleId: 'wtb', fallback: 'tb' });
    expect(location.hash).toBe('#/wtb?tab=tb');
  });

  it('seleksi di alamat dipertahankan saat tab berganti', () => {
    history.replaceState(null, '', '#/wtb/ACC-1?tab=tb');
    mount({ moduleId: 'wtb', fallback: 'tb' });
    React.act(() => { latest?.setTab('group'); });
    expect(location.hash).toBe('#/wtb/ACC-1?tab=group');
  });

  it('TIDAK menulis bila hash menunjuk modul lain (modul sedang ditinggalkan)', () => {
    history.replaceState(null, '', '#/wtb?tab=tb');
    mount({ moduleId: 'wtb', fallback: 'tb' });
    history.replaceState(null, '', '#/soqm');     // rute sudah pindah
    React.act(() => { latest?.setTab('review'); });
    expect(location.hash).toBe('#/soqm');          // alamat modul lain utuh
  });
});

describe('SC-2 — alamat menulis state (Back/Forward & URL ditempel)', () => {
  it('hashchange dari luar memindahkan tab TANPA reload', async () => {
    history.replaceState(null, '', '#/wtb?tab=tb');
    mount({ moduleId: 'wtb', fallback: 'tb' });
    await setHash('#/wtb?tab=group');
    expect(latest?.tab).toBe('group');
  });

  it('hashchange ke modul LAIN tidak menyentuh tab modul ini', async () => {
    history.replaceState(null, '', '#/wtb?tab=tb');
    mount({ moduleId: 'wtb', fallback: 'tb' });
    await setHash('#/soqm?tab=toolkit');
    expect(latest?.tab).toBe('tb');
  });

  it('tab busuk dari hashchange jatuh ke tab saat ini, bukan panel kosong (SC-6)', async () => {
    history.replaceState(null, '', '#/wtb?tab=review');
    mount({ moduleId: 'wtb', fallback: 'tb', valid: ['tb', 'review', 'group'] });
    await setHash('#/wtb?tab=sudah-dihapus');
    expect(latest?.tab).toBe('review');
  });

  it('tab busuk dari hashchange MENGOREKSI alamat, bukan membiarkannya berbohong', async () => {
    /* Ditemukan pada verifikasi HIDUP, bukan uji: state jatuh ke tab yang berlaku,
       tetapi hash tetap menyebut id yang tak ada — persis penyakit yang V-9 obati. */
    history.replaceState(null, '', '#/wtb?tab=review');
    mount({ moduleId: 'wtb', fallback: 'tb', valid: ['tb', 'review', 'group'] });
    await setHash('#/wtb?tab=sudah-dihapus');
    expect(latest?.tab).toBe('review');
    expect(location.hash).toBe('#/wtb?tab=review');
  });

  it('"tab saat ini" itu benar-benar YANG SEKARANG, bukan yang saat mount', async () => {
    /* Listener dipasang sekali; kalau fallback dibaca dari closure, ia beku di
       'review' dan pengguna yang sudah pindah ke 'group' akan dilempar mundur. */
    history.replaceState(null, '', '#/wtb?tab=review');
    mount({ moduleId: 'wtb', fallback: 'tb', valid: ['tb', 'review', 'group'] });
    React.act(() => { latest?.setTab('group'); });
    await setHash('#/wtb?tab=sudah-dihapus');
    expect(latest?.tab).toBe('group');
  });
});

describe('SC-3 — tak ada gelung, dan riwayat tak dibanjiri', () => {
  it('satu perubahan tab = tepat SATU replaceState, NOL pushState', () => {
    history.replaceState(null, '', '#/wtb?tab=tb');
    mount({ moduleId: 'wtb', fallback: 'tb' });

    const replaceSpy = vi.spyOn(history, 'replaceState');
    const pushSpy = vi.spyOn(history, 'pushState');

    React.act(() => { latest?.setTab('review'); });

    expect(replaceSpy).toHaveBeenCalledTimes(1);
    expect(pushSpy).toHaveBeenCalledTimes(0);   // Q-2 = replaceState: Back = keluar modul
  });

  it('menyetel tab ke nilai yang SAMA tidak menulis alamat sama sekali', () => {
    history.replaceState(null, '', '#/wtb?tab=review');
    mount({ moduleId: 'wtb', fallback: 'tb' });

    const replaceSpy = vi.spyOn(history, 'replaceState');
    React.act(() => { latest?.setTab('review'); });
    expect(replaceSpy).toHaveBeenCalledTimes(0);
  });

  it('hashchange masuk TIDAK memantul jadi tulisan balik (penjaga anti-gelung R-1)', async () => {
    history.replaceState(null, '', '#/wtb?tab=tb');
    mount({ moduleId: 'wtb', fallback: 'tb' });

    const replaceSpy = vi.spyOn(history, 'replaceState');
    await setHash('#/wtb?tab=group');

    expect(latest?.tab).toBe('group');
    expect(replaceSpy).toHaveBeenCalledTimes(0);  // hash sudah benar → tak ada tulisan
  });
});
