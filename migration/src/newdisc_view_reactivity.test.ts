// @vitest-environment jsdom
/* ============================================================
   Pengungkapan Baru 2024 — gerbang PERILAKU pada view, bukan pada mesinnya.
   ------------------------------------------------------------
   MENGAPA berkas ini ada terpisah dari `newdisc_derive.test.ts`:

   Menguji mesin turunan saja TIDAK menutup cacat yang diperbaiki. Cacat aslinya
   justru berada di sambungan: memo view mendeklarasikan `[wtb]` sementara
   badannya membaca konstanta modul. Mesin sebaik apa pun tak akan menyelamatkan
   view yang tidak memanggilnya. Dan gerbang yang memeriksa "apakah `[wtb]` ada
   di larik dependensi" adalah uji SIMBOL — larik itu memang ada pada kode yang
   cacat; keberadaannya persis yang menyesatkan peninjau.

   Karena itu di sini view benar-benar DIRENDER, neraca saldonya diganti, dan
   teks yang tampil di layar wajib berubah. Kalau seseorang kelak mengembalikan
   tabel literal, uji ini merah tanpa perlu tahu bentuk kesalahannya.
   ============================================================ */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { AMS } from './data';
import { AuditContext, FirmContext, NavContext, NavFromContext } from './contexts';
import { WTB_BY_ENGAGEMENT } from './data_wtb_eng';
import { NewDisclosures2024 } from './view_newdisc';
import type { WTB } from './canon_types';

const h = React.createElement;
type Root = { render: (node: unknown) => void; unmount: () => void };

const SEED_ENG = 'ENG-2025-014';
const SEED_WTB = AMS.WTB as unknown as WTB;

let container: HTMLDivElement | null = null;
let root: Root | null = null;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container) as unknown as Root;
});

afterEach(() => {
  React.act(() => { (root as Root).unmount(); });
  if (container && container.parentNode) container.parentNode.removeChild(container);
  container = null; root = null;
});

/** Provider minimal — hanya konteks yang benar-benar dibaca modul & SubBar. */
function mount(wtb: WTB, engId: string, clientName: string): void {
  const audit = { wtb };
  const firm = {
    activeEngagement: { id: engId, fy: 'FY2025' },
    activeClient: { id: 'C-X', name: clientName },
  };
  React.act(() => {
    (root as Root).render(
      h(NavContext.Provider, { value: () => {} },
        h(NavFromContext.Provider, { value: null },
          h(FirmContext.Provider, { value: firm },
            h(AuditContext.Provider, { value: audit },
              h(NewDisclosures2024, null))))),
    );
  });
}

function text(): string {
  return (container as HTMLDivElement).textContent || '';
}

/** Klik tab menurut labelnya (kontrol native — Tabs merender <button>). */
function openTab(label: string): void {
  const btns = Array.from((container as HTMLDivElement).querySelectorAll('button'));
  const b = btns.find(x => (x.textContent || '').includes(label));
  if (!b) throw new Error('tab tidak ditemukan: ' + label);
  React.act(() => { b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); });
}

/** Salin neraca saldo dengan satu akun digeser (rupiah penuh). */
function shift(wtb: WTB, code: string, delta: number): WTB {
  return wtb.map(r => (r.code === code
    ? { ...r, unadj: (r.unadj || 0) + delta, adj: (r.adj || 0) + delta }
    : { ...r })) as WTB;
}

/** Baris tabel yurisdiksi yang benar-benar terender. */
function jurisRows(): string[] {
  return Array.from((container as HTMLDivElement).querySelectorAll('[data-testid="p2-juris-row"]'))
    .map(el => el.textContent || '');
}

describe('view Pengungkapan Baru — Pilar Dua bereaksi pada neraca saldo', () => {
  it('modul terender & menampilkan tabel yurisdiksi turunan', () => {
    mount(SEED_WTB, SEED_ENG, 'PT Sentosa Makmur Tbk');
    expect(text()).toContain('Profil Pajak per Yurisdiksi');
    expect(jurisRows().length).toBeGreaterThanOrEqual(2);
    expect(text()).toContain('Singapura');
  });

  it('MENGGESER WTB MENGUBAH ANGKA DI LAYAR (bukan sekadar menghitung ulang)', () => {
    mount(SEED_WTB, SEED_ENG, 'PT Sentosa Makmur Tbk');
    const before = jurisRows().join('||');
    const beforeAll = text();

    /* Beban pajak naik Rp 6 miliar → ETR grup & baris Indonesia wajib bergerak. */
    mount(shift(SEED_WTB, '5-5100', 6_000_000_000), SEED_ENG, 'PT Sentosa Makmur Tbk');
    const after = jurisRows().join('||');

    /* Assertion pertama sengaja TIDAK bergantung pada penanda uji apa pun:
       seluruh teks yang terender wajib berubah. Kalau yang lebih dulu dievaluasi
       adalah selektor `p2-juris-row`, view lama gagal hanya karena penandanya
       tak ada ('' vs '') — merah yang benar dengan alasan yang salah, dan
       gerbang ini akan lolos pada view statis mana pun yang kebetulan
       memasang penanda itu. */
    expect(text()).not.toBe(beforeAll);
    expect(after).not.toBe(before);
    expect(after).not.toBe('');
  });

  it('menggeser penjualan mengubah pendapatan yang diuji terhadap ambang GloBE', () => {
    mount(SEED_WTB, SEED_ENG, 'PT Sentosa Makmur Tbk');
    const before = text();
    mount(shift(SEED_WTB, '4-1100', -50_000_000_000), SEED_ENG, 'PT Sentosa Makmur Tbk');
    expect(text()).not.toBe(before);
    expect(text()).toContain('Uji ambang cakupan GloBE');
  });

  it('neraca saldo kosong → panel penolakan, bukan angka', () => {
    mount([] as unknown as WTB, SEED_ENG, 'PT Sentosa Makmur Tbk');
    expect((container as HTMLDivElement).querySelectorAll('[data-testid="newdisc-cannot-assert"]').length)
      .toBeGreaterThanOrEqual(1);
    expect(text()).toContain('Tak dapat diasersikan');
    expect(jurisRows()).toHaveLength(0);
  });
});

describe('view Pengungkapan Baru — isolasi perikatan di layar', () => {
  const OTHERS = Object.keys(WTB_BY_ENGAGEMENT);

  it('perikatan lain TIDAK menampilkan entitas anak klien seed', () => {
    mount(SEED_WTB, SEED_ENG, 'PT Sentosa Makmur Tbk');
    expect(text()).toContain('Sentosa Trading Pte Ltd');            // milik perikatan seed…

    OTHERS.forEach(id => {
      mount(WTB_BY_ENGAGEMENT[id] as unknown as WTB, id, 'Klien ' + id);
      expect(text()).not.toContain('Sentosa');                       // …dan hanya di sana
      expect(text()).not.toContain('Singapura');
      expect(text()).toContain('Struktur grup per-yurisdiksi belum terdaftar');
      expect(jurisRows()).toHaveLength(1);
    });
  });

  it('dua perikatan non-seed menampilkan angka yang BERBEDA', () => {
    const [a, b] = OTHERS;
    mount(WTB_BY_ENGAGEMENT[a] as unknown as WTB, a, 'Klien A');
    const rowsA = jurisRows().join('||');
    mount(WTB_BY_ENGAGEMENT[b] as unknown as WTB, b, 'Klien B');
    const rowsB = jurisRows().join('||');
    expect(rowsA).not.toBe(rowsB);
  });
});

describe('view Pengungkapan Baru — tab Pendanaan Pemasok membantah', () => {
  it('tak menampilkan nilai tercatat/penyedia karangan, dan mengatakan alasannya', () => {
    mount(SEED_WTB, SEED_ENG, 'PT Sentosa Makmur Tbk');
    openTab('Pendanaan Pemasok');
    const t = text();
    expect(t).toContain('Register pengaturan pendanaan pemasok belum ada');
    expect(t).toContain('Tak dapat diasersikan');
    expect(t).toContain('tak diketahui');
    /* Angka-angka karangan lama. */
    expect(t).not.toContain('90–150 hari');
    expect(t).not.toContain('30–60 hari');
    expect(t).not.toContain('8.600');
  });

  it('utang usaha yang ditampilkan berbeda antar perikatan (turunan WTB)', () => {
    const withPayables = Object.keys(WTB_BY_ENGAGEMENT)
      .filter(id => (WTB_BY_ENGAGEMENT[id] as unknown as WTB).some(r => r.code === '2-1100'));
    const seen: string[] = [];
    withPayables.forEach(id => {
      mount(WTB_BY_ENGAGEMENT[id] as unknown as WTB, id, 'Klien ' + id);
      openTab('Pendanaan Pemasok');
      const el = Array.from((container as HTMLDivElement).querySelectorAll('.stat'))
        .find(x => (x.textContent || '').includes('Utang usaha per buku besar'));
      seen.push((el && el.textContent) || '');
    });
    expect(seen.length).toBeGreaterThanOrEqual(2);
    expect(new Set(seen).size).toBe(seen.length);
  });
});

describe('view Pengungkapan Baru — tab Perubahan Iklim tidak disentuh', () => {
  it('tetap kualitatif: lima area estimasi, tanpa besaran klien', () => {
    mount(SEED_WTB, SEED_ENG, 'PT Sentosa Makmur Tbk');
    openTab('Perubahan Iklim');
    const t = text();
    ['PSAK 16', 'PSAK 48', 'PSAK 71', 'PSAK 57', 'PSAK 1'].forEach(s => expect(t).toContain(s));
    expect(t).toContain('Pengaruh Iklim terhadap Estimasi Akuntansi');
    /* Tab ini memang tak pernah memuat angka klien — dan tetap begitu. */
    expect(t).not.toMatch(/Rp\s[\d.]+\sjt/);
  });
});
