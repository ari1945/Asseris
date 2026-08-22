// @vitest-environment jsdom
/* ============================================================
   V5 — baris skedul pengakuan dipilih dengan KONTROL, dibuktikan di DOM.

   Gerbang teks (`revenue_psak72.test.ts`) hanya membuktikan `<tr onClick>`
   sudah tak ada di sumber. Yang TIDAK dibuktikannya: bahwa penggantinya
   benar-benar sebuah kontrol yang bisa difokus dan diaktifkan tanpa tetikus,
   dan bahwa mengaktifkannya benar-benar membuka panel rinci.

   Berkas ini merender modulnya di jsdom (pola `overlay.test.ts`) dengan
   konteks firma & register faktur di-mock — yang diuji adalah PERILAKU
   halaman, bukan logika di baliknya.
   ============================================================ */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';

/* Konteks & register di-mock: FirmProvider asli menarik state dari server. */
const ENGAGEMENTS = [
  { id: 'ENG-A', clientId: 'C-1', type: 'Audit Laporan Keuangan', progress: 60, partner: 'Uji Partner, CPA', actualHrs: 100, budgetHrs: 200 },
  { id: 'ENG-B', clientId: 'C-HILANG', type: 'Agreed-Upon Procedures', progress: 20, partner: 'Uji Partner, CPA', actualHrs: 10, budgetHrs: 100 },
];
const CLIENTS = [{ id: 'C-1', name: 'PT Uji Sentosa', fee: 1_000_000_000 }];
const INVOICES = [{ id: 'INV-1', eng: 'ENG-A', client: 'PT Uji Sentosa', status: 'Sent', amount: 200_000_000, paid: 0, due: '2026-01-31' }];

vi.mock('./contexts', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('./contexts');
  return { ...actual, useFirm: () => ({ engagements: ENGAGEMENTS, clients: CLIENTS }) };
});
vi.mock('./use_invoices', () => ({
  useInvoiceRegister: () => ({ register: INVOICES, setRegister: () => {}, canEdit: false }),
}));
vi.mock('./shell', () => ({ SubBar: () => null }));

const { FirmRevenue } = await import('./view_firmrevenue');

type Root = { render: (node: unknown) => void; unmount: () => void };
let container: HTMLDivElement | null = null;
let root: Root | null = null;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  React.act(() => { root = createRoot(container as HTMLDivElement) as unknown as Root; });
});
afterEach(() => {
  React.act(() => { (root as Root).unmount(); });
  container?.remove();
  container = null; root = null;
});

const mount = (): void => { React.act(() => { (root as Root).render(React.createElement(FirmRevenue)); }); };
const idButtons = (): HTMLButtonElement[] =>
  Array.from(document.querySelectorAll('button')).filter((b) => /^ENG-/.test(b.textContent || ''));

describe('V5 — pemilihan perikatan tanpa tetikus', () => {
  it('halaman merender, dan nomor perikatan adalah <button> native', () => {
    mount();
    const btns = idButtons();
    expect(btns.map((b) => b.textContent)).toEqual(['ENG-A', 'ENG-B']);
    /* Native ⇒ ikut urutan tab tanpa tabIndex buatan, dan punya nama. */
    btns.forEach((b) => {
      expect(b.tagName).toBe('BUTTON');
      expect(b.getAttribute('type')).toBe('button');
      expect(b.hasAttribute('disabled')).toBe(false);
      b.focus();
      expect(document.activeElement).toBe(b);
    });
  });

  it('tak ada <tr> pembawa handler klik yang tersisa di tabel', () => {
    mount();
    /* React memasang handler pada root, jadi atribut `onclick` DOM tak dapat
       diperiksa; yang dapat dibuktikan: setiap baris yang dapat dipilih
       memuat kontrol, dan tak ada baris yang memikul peran tombol sendiri. */
    const rows = Array.from(document.querySelectorAll('tbody tr'));
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach((tr) => {
      expect(tr.getAttribute('role')).toBeNull();
      expect(tr.querySelector('button')).not.toBeNull();
    });
  });

  it('mengaktifkan kontrol membuka panel rinci, dan aria-expanded mengikutinya', () => {
    mount();
    const [a] = idButtons();
    expect(a.getAttribute('aria-expanded')).toBe('false');
    React.act(() => { a.click(); });
    expect(idButtons()[0].getAttribute('aria-expanded')).toBe('true');
    expect(document.body.textContent).toContain('Kurva Pengakuan');
    React.act(() => { idButtons()[0].click(); });
    expect(idButtons()[0].getAttribute('aria-expanded')).toBe('false');
  });

  it('perikatan tanpa nilai kontrak: panel menyatakan lubangnya, bukan menggambar NaN', () => {
    mount();
    React.act(() => { idButtons()[1].click(); });
    const text = document.body.textContent || '';
    expect(text).toContain('Nilai kontrak perikatan ini belum ditetapkan');
    expect(text).not.toContain('NaN');
    expect(text).not.toContain('Kurva Pengakuan');
  });
});

describe('V2/V4 — apa yang dinyatakan layar', () => {
  it('baris berlubang tampil "belum ditetapkan" dan diumumkan di atas tabel', () => {
    mount();
    const text = document.body.textContent || '';
    expect(text).toContain('belum ditetapkan');
    expect(text).toContain('ENG-B');
    expect(text).not.toContain('NaN');
  });

  it('pita ilustrasi tak menjamin kolom "diakui" sebagai data nyata', () => {
    mount();
    const tabs = Array.from(document.querySelectorAll('button'))
      .filter((b) => /Aset & Liabilitas Kontrak/.test(b.textContent || ''));
    expect(tabs.length).toBe(1);
    React.act(() => { tabs[0].click(); });
    const text = document.body.textContent || '';
    expect(text).toContain('register faktur');
    expect(text).not.toContain('adalah data nyata');
  });
});
