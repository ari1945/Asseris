// @vitest-environment jsdom
/* ============================================================
   Pengadaan & Vendor — baris master vendor dipilih dengan KONTROL,
   dibuktikan di DOM.

   Cacat yang dicabut (view_procurement.tsx, tabel "Vendor 360"):

       <tr key={v.id} onClick={() => setVSel(v)} style={{ cursor:'pointer' }} …>

   Interaksi UTAMA modul ini — membuka Vendor 360, satu-satunya jalan ke
   identitas master, kontrak, PO, lisensi & SLA vendor — dipikul oleh sebuah
   `<tr>`. `<tr>` tidak masuk urutan tab, tidak menanggapi Enter/Space, dan
   tidak diumumkan sebagai kontrol. Panel biru di atas tabel menyuruh
   "Klik vendor untuk membuka Vendor 360": bagi pengguna papan-ketik atau
   pembaca layar, instruksi itu tak dapat dijalankan sama sekali.

   Yang diuji di sini adalah PERILAKU HALAMAN, bukan keberadaan atribut:
   berkas ini merender modulnya di jsdom (pola `revenue_row_control.test.ts`,
   #278) dengan konteks firma di-mock. Register vendor TIDAK di-mock — ia
   data seed statis (`data_backoffice.ts`), dan yang sedang dibuktikan adalah
   kontrolnya, bukan angkanya.

   Batas jujur jsdom: jsdom tidak menerjemahkan Enter/Space menjadi `click`
   pada tombol — peramban yang melakukannya. Karena itu "aktif dengan Enter"
   dibuktikan secara struktural (elemennya BENAR-BENAR <button> native, tanpa
   tabIndex buatan, tidak disabled, dapat difokus) DAN secara perilaku
   (mengaktifkannya benar-benar mengubah seleksi). Gerbang peramban sungguhan
   untuk modul ini adalah spek axe/papan-ketik e2e.
   ============================================================ */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/* Konteks di-mock: FirmProvider asli menarik state dari server. */
const ENGAGEMENTS = [
  { id: 'ENG-A', clientId: 'C-1', type: 'Audit Laporan Keuangan', status: 'Fieldwork', partner: 'Uji Partner, CPA' },
];
const CLIENTS = [{ id: 'C-1', name: 'PT Uji Sentosa', fee: 1_000_000_000 }];

vi.mock('./contexts', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('./contexts');
  return {
    ...actual,
    useFirm: () => ({ engagements: ENGAGEMENTS, clients: CLIENTS, activeEngagementId: 'ENG-A' }),
    useNav: () => () => {},
  };
});
vi.mock('./shell', () => ({ SubBar: () => null }));

const { Procurement } = await import('./view_procurement');

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

/* Merender modul lalu membuka tab "Vendor 360" — tabel yang diuji ada di sana. */
const mountVendorTab = (): void => {
  React.act(() => { (root as Root).render(React.createElement(Procurement)); });
  const tab = Array.from(document.querySelectorAll('button.tab'))
    .find((b) => /Vendor 360/.test(b.textContent || '')) as HTMLButtonElement | undefined;
  if (!tab) throw new Error('tab "Vendor 360" tidak ditemukan — modul gagal render');
  React.act(() => { tab.click(); });
};

/* Baris master vendor = baris <tbody> yang sel pertamanya memuat id V-0xx. */
const vendorRows = (): HTMLTableRowElement[] =>
  Array.from(document.querySelectorAll('tbody tr'))
    .filter((tr) => /^V-\d{3}$/.test((tr.querySelector('td')?.textContent || '').trim())) as HTMLTableRowElement[];

describe('P-A1 — baris vendor dapat dijangkau papan-ketik', () => {
  it('tabel master vendor benar-benar terender', () => {
    mountVendorTab();
    expect(vendorRows().length).toBeGreaterThan(1);
  });

  it('tiap baris memuat kontrol NATIVE yang dapat difokus, dan tak ada <tr> yang memikul peran tombol', () => {
    mountVendorTab();
    const rows = vendorRows();
    expect(rows.length).toBeGreaterThan(1);
    rows.forEach((tr) => {
      /* Baris tak boleh menyamar jadi kontrol. */
      expect(tr.getAttribute('role'), `baris ${tr.textContent?.slice(0, 12)} memikul role`).toBeNull();
      expect(tr.getAttribute('tabindex')).toBeNull();

      const btn = tr.querySelector('button');
      expect(btn, `baris ${tr.textContent?.slice(0, 12)} tanpa kontrol pemilih`).not.toBeNull();
      const b = btn as HTMLButtonElement;
      expect(b.tagName).toBe('BUTTON');
      expect(b.getAttribute('type')).toBe('button');
      expect(b.hasAttribute('disabled')).toBe(false);
      /* Native + tanpa tabIndex buatan ⇒ ikut urutan tab apa adanya. */
      expect(b.getAttribute('tabindex')).toBeNull();
      b.focus();
      expect(document.activeElement, 'kontrol tidak dapat difokus').toBe(b);
    });
  });

  it('kontrol punya nama yang dapat dibaca teknologi bantu', () => {
    mountVendorTab();
    vendorRows().forEach((tr) => {
      const b = tr.querySelector('button') as HTMLButtonElement;
      const nama = (b.textContent || '').trim() || b.getAttribute('aria-label') || b.getAttribute('title') || '';
      expect(nama.length, 'kontrol tanpa nama').toBeGreaterThan(0);
    });
  });
});

describe('P-A2 — mengaktifkan kontrol benar-benar MENGUBAH seleksi', () => {
  it('Vendor 360 tertutup sebelum diaktifkan', () => {
    mountVendorTab();
    expect(document.body.textContent).not.toContain('Data Master');
  });

  it('mengaktifkan kontrol baris membuka Vendor 360 untuk vendor ITU', () => {
    mountVendorTab();
    const baris = vendorRows()[1];
    const id = (baris.querySelector('td')?.textContent || '').trim();
    const nama = (baris.querySelectorAll('td')[1]?.textContent || '').trim();
    expect(id).toMatch(/^V-\d{3}$/);

    React.act(() => { (baris.querySelector('button') as HTMLButtonElement).click(); });

    /* Drawer terbuka, dan isinya vendor yang barisnya diaktifkan — bukan vendor lain. */
    const teks = document.body.textContent || '';
    expect(teks, 'Vendor 360 tidak terbuka').toContain('Data Master');
    expect(teks).toContain(nama.slice(0, 18));
  });

  it('keadaan terpilih diumumkan lewat aria-pressed, dan berpindah saat baris lain diaktifkan', () => {
    mountVendorTab();
    const tekan = (i: number): void => {
      React.act(() => { (vendorRows()[i].querySelector('button') as HTMLButtonElement).click(); });
    };
    const pressed = (): (string | null)[] =>
      vendorRows().map((tr) => (tr.querySelector('button') as HTMLButtonElement).getAttribute('aria-pressed'));

    /* Sebelum ada seleksi: tak satu pun tertekan. */
    expect(pressed().every((p) => p === 'false'), 'aria-pressed tidak dipasang').toBe(true);

    tekan(1);
    expect(pressed()[1]).toBe('true');
    expect(pressed().filter((p) => p === 'true').length, 'lebih dari satu baris tertekan').toBe(1);

    tekan(3);
    expect(pressed()[3]).toBe('true');
    expect(pressed()[1]).toBe('false');
  });
});

describe('P-A3 — gerbang sumber: nol kontrol palsu di KEDUA berkas modul', () => {
  const kode = (f: string): string =>
    readFileSync(join(__dirname, f), 'utf8')
      /* komentar dibuang: berkas ini mengutip pola lama sebagai catatan sejarah,
         dan pemindai yang ikut membaca komentar akan menuduh catatan itu sendiri. */
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');

  it.each(['view_procurement.tsx', 'view_procurement2.tsx'])(
    'nol <tr>/<div>/<span>/<td>/<li> ber-onClick di %s',
    (f) => {
      const hit = [...kode(f).matchAll(/<(tr|div|span|td|li)\b[^>]*\sonClick=/g)].map((m) => m[0].slice(0, 70));
      expect(hit, 'kontrol palsu: ' + hit.join(' | ')).toEqual([]);
    },
  );

  it('kontrol baris punya cincin fokus yang terlihat', () => {
    const src = readFileSync(join(__dirname, 'view_procurement.tsx'), 'utf8');
    expect(src, 'kelas kontrol baris tak ditemukan').toMatch(/proc-rowbtn/);
    expect(src, 'tanpa :focus-visible — fokus papan-ketik tak terlihat').toMatch(/\.proc-rowbtn:focus-visible/);
  });
});
