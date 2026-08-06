// @vitest-environment jsdom
/* ============================================================
   Uji kontrak <Overlay> (PRD Fase A · PR-1)
   ------------------------------------------------------------
   Satu-satunya berkas uji yang berjalan di jsdom (pragma di atas).
   806 uji lain tetap di environment `node` — vitest.config.mjs tak diubah,
   jadi tak ada risiko regresi pada suite kanon.

   Yang diuji adalah PERILAKU DOM, bukan logika di baliknya: Escape yang
   benar-benar menutup, fokus yang benar-benar pindah & pulih, counter
   scroll-lock yang benar-benar melepas `body.overflow` pada saat yang tepat.
   Menguji "logika murni di bawahnya" saja akan mengulang mode kegagalan
   yang tercatat di proyek ini (uji memaku jalur yang tak dipakai view).
   ============================================================ */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  Overlay, Z, panelGeometry, focusableWithin,
  lockScroll, unlockScroll, scrollLockDepth, __resetScrollLock,
} from './overlay';

const h = React.createElement;

type Root = { render: (node: unknown) => void; unmount: () => void };

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(node: unknown): void {
  React.act(() => { (root as Root).render(node); });
}

function press(key: string, opts?: { shiftKey?: boolean }): void {
  React.act(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key, bubbles: true, cancelable: true, shiftKey: !!(opts && opts.shiftKey),
    }));
  });
}

function dialog(): HTMLElement {
  const el = document.querySelector('[role="dialog"]');
  if (!el) throw new Error('dialog tidak ditemukan');
  return el as HTMLElement;
}

function dialogs(): HTMLElement[] {
  return Array.from(document.querySelectorAll('[role="dialog"]')) as HTMLElement[];
}

function backdropOf(d: HTMLElement): HTMLElement {
  return d.parentElement as HTMLElement;
}

function mouseDownOn(el: HTMLElement): void {
  React.act(() => {
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  });
}

function clickText(label: string): void {
  const btn = Array.from(document.querySelectorAll('button'))
    .find((b) => (b.textContent || '').trim() === label);
  if (!btn) throw new Error('tombol tidak ditemukan: ' + label);
  React.act(() => { (btn as HTMLButtonElement).click(); });
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  __resetScrollLock();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container) as Root;
});

afterEach(() => {
  if (root) React.act(() => { (root as Root).unmount(); });
  if (container && container.parentNode) container.parentNode.removeChild(container);
  root = null;
  container = null;
  __resetScrollLock();
  document.body.innerHTML = '';
});

/* ============================================================ */
describe('Overlay — semantik dialog (P2: 0 dari 29 berkas punya ini)', () => {
  it('memasang role=dialog + aria-modal', () => {
    mount(h(Overlay, { onClose: () => {}, title: 'Judul uji' }, 'isi'));
    const d = dialog();
    expect(d.getAttribute('role')).toBe('dialog');
    expect(d.getAttribute('aria-modal')).toBe('true');
  });

  it('aria-labelledby menunjuk elemen yang BENAR-BENAR ada & memuat judul', () => {
    mount(h(Overlay, { onClose: () => {}, title: 'Pendapatan' }, 'isi'));
    const id = dialog().getAttribute('aria-labelledby');
    expect(id).toBeTruthy();
    const label = document.getElementById(id as string);
    expect(label).not.toBeNull();
    expect((label as HTMLElement).textContent).toContain('Pendapatan');
  });

  it('header kustom tetap dilabeli (dibungkus id label), bukan kehilangan nama', () => {
    mount(h(Overlay, { onClose: () => {}, header: h('div', null, 'Kertas Kerja R') }, 'isi'));
    const id = dialog().getAttribute('aria-labelledby');
    expect(document.getElementById(id as string)?.textContent).toContain('Kertas Kerja R');
  });

  it('tanpa header/title, jatuh ke aria-label', () => {
    mount(h(Overlay, { onClose: () => {}, labelText: 'Konfirmasi' }, 'isi'));
    expect(dialog().getAttribute('aria-label')).toBe('Konfirmasi');
    expect(dialog().getAttribute('aria-labelledby')).toBeNull();
  });
});

/* ============================================================ */
describe('Overlay — Escape (P2: hanya 4 dari 29 berkas menanganinya)', () => {
  it('Escape menutup', () => {
    const onClose = vi.fn();
    mount(h(Overlay, { onClose, title: 'X' }, 'isi'));
    press('Escape');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('dismissable:false → Escape TIDAK menutup', () => {
    const onClose = vi.fn();
    mount(h(Overlay, { onClose, title: 'X', dismissable: false }, 'isi'));
    press('Escape');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('listener dilepas saat unmount (Escape sesudahnya tak memanggil onClose)', () => {
    const onClose = vi.fn();
    mount(h(Overlay, { onClose, title: 'X' }, 'isi'));
    mount(h('div', null, 'kosong'));
    press('Escape');
    expect(onClose).not.toHaveBeenCalled();
  });
});

/* ============================================================ */
describe('Overlay — backdrop', () => {
  it('mousedown di backdrop menutup', () => {
    const onClose = vi.fn();
    mount(h(Overlay, { onClose, title: 'X' }, 'isi'));
    mouseDownOn(backdropOf(dialog()));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('mousedown DI DALAM panel tidak menutup (seleksi teks aman)', () => {
    const onClose = vi.fn();
    mount(h(Overlay, { onClose, title: 'X' }, 'isi'));
    mouseDownOn(dialog());
    expect(onClose).not.toHaveBeenCalled();
  });

  it('dismissable:false → backdrop tidak menutup', () => {
    const onClose = vi.fn();
    mount(h(Overlay, { onClose, title: 'X', dismissable: false }, 'isi'));
    mouseDownOn(backdropOf(dialog()));
    expect(onClose).not.toHaveBeenCalled();
  });
});

/* ============================================================ */
describe('Overlay — guard draft belum tersimpan (P2: 0 dari 29)', () => {
  it('isDirty → Escape TIDAK langsung menutup, tapi memunculkan prompt', () => {
    const onClose = vi.fn();
    mount(h(Overlay, { onClose, title: 'X', isDirty: () => true }, 'isi'));
    press('Escape');
    expect(onClose).not.toHaveBeenCalled();
    expect(dialogs().length).toBe(2);
    expect(document.body.textContent).toContain('belum tersimpan');
  });

  it('"Buang perubahan" meneruskan penutupan', () => {
    const onClose = vi.fn();
    mount(h(Overlay, { onClose, title: 'X', isDirty: () => true }, 'isi'));
    press('Escape');
    clickText('Buang perubahan');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('"Kembali menyunting" membatalkan — overlay tetap terbuka', () => {
    const onClose = vi.fn();
    mount(h(Overlay, { onClose, title: 'X', isDirty: () => true }, 'isi'));
    press('Escape');
    clickText('Kembali menyunting');
    expect(onClose).not.toHaveBeenCalled();
    expect(dialogs().length).toBe(1);
  });

  it('backdrop juga melewati guard, bukan hanya Escape', () => {
    const onClose = vi.fn();
    mount(h(Overlay, { onClose, title: 'X', isDirty: () => true }, 'isi'));
    mouseDownOn(backdropOf(dialogs()[0]));
    expect(onClose).not.toHaveBeenCalled();
    expect(dialogs().length).toBe(2);
  });

  it('isDirty false → tutup normal tanpa prompt', () => {
    const onClose = vi.fn();
    mount(h(Overlay, { onClose, title: 'X', isDirty: () => false }, 'isi'));
    press('Escape');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(dialogs().length).toBe(1);
  });
});

/* ============================================================ */
describe('Overlay — fokus (P2: focus trap & restore 0 dari 29)', () => {
  it('fokus berpindah ke dalam panel saat buka', () => {
    mount(h(Overlay, { onClose: () => {}, title: 'X' }, h('button', null, 'A')));
    const d = dialog();
    const active = document.activeElement as HTMLElement;
    expect(d === active || d.contains(active)).toBe(true);
  });

  it('fokus DIPULIHKAN ke elemen pemicu saat tutup', () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'pemicu';
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    mount(h(Overlay, { onClose: () => {}, title: 'X' }, h('button', null, 'A')));
    expect(document.activeElement).not.toBe(trigger);

    mount(h('div', null, 'kosong'));
    expect(document.activeElement).toBe(trigger);
  });

  it('Tab dari elemen terakhir kembali ke pertama (terperangkap)', () => {
    mount(h(Overlay, { onClose: () => {}, labelText: 'X' },
      h('button', { key: 'a' }, 'A'), h('button', { key: 'b' }, 'B')));
    const items = focusableWithin(dialog());
    expect(items.length).toBeGreaterThanOrEqual(2);
    const last = items[items.length - 1];
    React.act(() => { last.focus(); });
    press('Tab');
    expect(document.activeElement).toBe(items[0]);
  });

  it('Shift-Tab dari elemen pertama melompat ke terakhir', () => {
    mount(h(Overlay, { onClose: () => {}, labelText: 'X' },
      h('button', { key: 'a' }, 'A'), h('button', { key: 'b' }, 'B')));
    const items = focusableWithin(dialog());
    React.act(() => { items[0].focus(); });
    press('Tab', { shiftKey: true });
    expect(document.activeElement).toBe(items[items.length - 1]);
  });
});

/* ============================================================ */
describe('scroll lock — COUNTER, bukan boolean', () => {
  it('mengunci saat buka & memulihkan nilai SEMULA saat tutup', () => {
    document.body.style.overflow = 'scroll';
    mount(h(Overlay, { onClose: () => {}, title: 'X' }, 'isi'));
    expect(document.body.style.overflow).toBe('hidden');
    expect(scrollLockDepth()).toBe(1);
    mount(h('div', null, 'kosong'));
    expect(scrollLockDepth()).toBe(0);
    expect(document.body.style.overflow).toBe('scroll');
  });

  it('overlay bertumpuk: menutup yang ATAS tidak melepas lock yang BAWAH', () => {
    mount(h(Overlay, { onClose: () => {}, title: 'X', isDirty: () => true }, 'isi'));
    expect(scrollLockDepth()).toBe(1);
    press('Escape');                       // prompt "buang perubahan" terbuka
    expect(scrollLockDepth()).toBe(2);
    clickText('Kembali menyunting');       // hanya yang atas ditutup
    expect(scrollLockDepth()).toBe(1);
    expect(document.body.style.overflow).toBe('hidden');   // BAWAH masih terkunci
  });

  it('unlockScroll tak pernah minus (unlock berlebih diabaikan)', () => {
    lockScroll();
    unlockScroll();
    unlockScroll();
    unlockScroll();
    expect(scrollLockDepth()).toBe(0);
    expect(document.body.style.overflow).toBe('');
  });
});

/* ============================================================ */
describe('geometri & skala z', () => {
  it('modal: tinggi MENGIKUTI ISI (maxHeight), tak ada height dipaku', () => {
    const g = panelGeometry('modal', 'md');
    expect(g.maxHeight).toBe('94vh');
    expect(g.height).toBeUndefined();
  });

  it('ukuran modal sm/md/lg/xl menaik ketat', () => {
    const w = (s: 'sm' | 'md' | 'lg' | 'xl'): number => panelGeometry('modal', s).width as number;
    expect(w('sm')).toBeLessThan(w('md'));
    expect(w('md')).toBeLessThan(w('lg'));
    expect(w('lg')).toBeLessThan(w('xl'));
  });

  it('sheet: tinggi penuh & lebar berskala (bukan modal terpusat)', () => {
    const g = panelGeometry('sheet', 'sm');
    expect(g.height).toBe('100%');
    expect(panelGeometry('sheet', 'lg').width).not.toBe(g.width);
  });

  /* Invarian yang menjadi DASAR skala ini (lihat komentar MODAL_W/SHEET_W):
     skala boleh MELEBARKAN panel warisan, tak pernah MENYEMPITKAN — penyempitan
     satu-satunya arah yang dapat memecah tabel/formulir yang sudah muat.
     Memaku angka ajaib (mis. "sheet sm = 440px") membuat uji ini gagal setiap
     kali skala digeser secara SENGAJA, tanpa pernah menangkap penyempitan yang
     tak disengaja. Yang dipaku di sini adalah aturannya, bukan nilainya. */
  /* Ambil angka PERTAMA, bukan buang semua non-digit: `min(480px, 94vw)` punya
     DUA angka, dan menyapu non-digit menghasilkan 44094 — assertion jadi selalu
     lolos. Versi pertama uji ini memang begitu, dan probe mutasi yang
     menemukannya (uji hijau atas skala yang sengaja dirusak). */
  const px = (v: string | number | undefined): number => {
    if (typeof v === 'number') return v;
    const m = String(v).match(/\d+/);
    return m ? Number(m[0]) : NaN;
  };

  it.each([
    ['modal', 460, 'sm'], ['modal', 500, 'md'], ['modal', 540, 'md'], ['modal', 560, 'md'],
    ['modal', 680, 'lg'], ['modal', 720, 'lg'], ['modal', 900, 'xl'], ['modal', 920, 'xl'], ['modal', 940, 'xl'],
    ['sheet', 420, 'sm'], ['sheet', 440, 'sm'], ['sheet', 460, 'sm'], ['sheet', 480, 'sm'],
    ['sheet', 540, 'md'], ['sheet', 760, 'lg'], ['sheet', 780, 'lg'],
  ] as const)('%s %ipx → %s tidak menyempit', (variant, corpusWidth, size) => {
    expect(px(panelGeometry(variant, size).width)).toBeGreaterThanOrEqual(corpusWidth);
  });

  it('varian page (DEPRECATED) mempertahankan bentuk warisan 92vh', () => {
    expect(panelGeometry('page', 'md').height).toBe('92vh');
  });

  it('skala z bertingkat: sheet < modal < confirm < toast', () => {
    expect(Z.sheet).toBeLessThan(Z.modal);
    expect(Z.modal).toBeLessThan(Z.confirm);
    expect(Z.confirm).toBeLessThan(Z.toast);
  });

  it('prompt konfirmasi berada DI ATAS overlay yang memunculkannya', () => {
    mount(h(Overlay, { onClose: () => {}, title: 'X', isDirty: () => true }, 'isi'));
    press('Escape');
    const zs = dialogs().map((d) => Number((backdropOf(d) as HTMLElement).style.zIndex));
    expect(zs.length).toBe(2);
    expect(zs[1]).toBeGreaterThan(zs[0]);
  });
});

/* ============================================================ */
describe('focusableWithin', () => {
  function fixture(html: string): HTMLElement {
    const el = document.createElement('div');
    el.innerHTML = html;
    document.body.appendChild(el);
    return el;
  }

  it('mengabaikan disabled, aria-hidden, tabindex=-1, dan input hidden', () => {
    const el = fixture(`
      <button id="ok">ok</button>
      <button disabled>no</button>
      <button aria-hidden="true">no</button>
      <a tabindex="-1" href="#">no</a>
      <input type="hidden" />
      <input id="ok2" type="text" />
    `);
    const ids = focusableWithin(el).map((n) => n.id);
    expect(ids).toEqual(['ok', 'ok2']);
  });

  it('root null → daftar kosong, bukan crash', () => {
    expect(focusableWithin(null)).toEqual([]);
  });
});
