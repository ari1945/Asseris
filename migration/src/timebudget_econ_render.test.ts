// @vitest-environment jsdom
/* ============================================================
   TB5/TB6 di LAYAR — tab Ekonomi modul Time & Budget.

   Gerbang teks (`timebudget_contract_billing.test.ts`) membuktikan model &
   sumbernya. Yang TIDAK dibuktikannya: bahwa halaman benar-benar menampilkan
   angka register alih-alih pecahan fee, dan bahwa perikatan tanpa nilai
   kontrak benar-benar berbunyi '—' + pita peringatan alih-alih menggambar
   NaN atau angka karangan.

   Pola mengikuti `revenue_row_control.test.ts`: modulnya dirender di jsdom
   dengan konteks firma, state audit, dan register faktur di-mock — yang diuji
   adalah PERILAKU halaman.
   ============================================================ */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { AMS } from './data';
import { FIRMFIN } from './data_firmfin';
import { progressOf } from './revenue_psak72';

const DEMO = 'ENG-' + '2025-014';   /* punya roster di seed → modelnya lahir */

interface SeedEng { id: string; clientId: string; progress: number; fy: string; deadline: string }
interface SeedClient { id: string; name: string; fee?: number | null }
interface SeedInvoice {
  id: string; eng: string; status: string; amount: number; paid: number;
  due: string; milestone: string;
}

const seedEng = (): SeedEng => {
  const e = (AMS as unknown as { ENGAGEMENTS: SeedEng[] }).ENGAGEMENTS.find((x) => x.id === DEMO);
  if (!e) throw new Error('perikatan demo tak ada di seed');
  return { ...e };
};
const seedInvoices = (): SeedInvoice[] =>
  (AMS as unknown as { INVOICES: SeedInvoice[] }).INVOICES
    .filter((i) => i.eng === DEMO).map((i) => ({ ...i }));
const seedEntries = (): unknown[] =>
  (AMS as unknown as { TIME_ENTRIES: unknown[] }).TIME_ENTRIES.map((t) => ({ ...(t as object) }));
/* Oracle PENGAKUAN — sesudah #278 dasarnya metode masukan berpagar, bukan
   `e.progress`. Dirakit dengan memanggil kanonnya atas jam roster perikatan
   ini, bukan dengan menyalin rumusnya ke sini. */
const diakuiDemo = (fee: number): number => {
  const w = FIRMFIN.engagementWip(
    (AMS as unknown as { TIME_ENTRIES: unknown[] }).TIME_ENTRIES,
    DEMO,
  ) as { actualHrs: number; budgetHrs: number } | null;
  const pct = progressOf({ id: DEMO, clientId: '' }, w).pct;
  if (pct == null) throw new Error('premis: kemajuan perikatan demo tak terukur');
  return Math.round(fee * pct);
};
const seedClient = (): SeedClient => {
  const c = (AMS as unknown as { CLIENTS: SeedClient[] }).CLIENTS.find((x) => x.id === seedEng().clientId);
  if (!c) throw new Error('klien perikatan demo tak ada di seed');
  return { ...c };
};

/* Panggung yang dapat ditulis ulang per kasus uji. */
const stage: { clients: SeedClient[]; invoices: SeedInvoice[] } = { clients: [], invoices: [] };

vi.mock('./contexts', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('./contexts');
  return {
    ...actual,
    useFirm: () => ({
      activeEngagement: seedEng(),
      activeClient: stage.clients.find((c) => c.id === seedEng().clientId) || null,
      clients: stage.clients,
      locked: false,
    }),
    useAuditHeavy: () => ({ timeEntries: seedEntries(), addTimeEntry: () => {}, team: [] }),
    useNav: () => () => {},
  };
});
vi.mock('./use_invoices', () => ({
  useInvoiceRegister: () => ({ register: stage.invoices, setRegister: () => {}, canEdit: false }),
}));
vi.mock('./shell', () => ({ SubBar: () => null }));

const { TimeBudget } = await import('./view_timebudget');

type Root = { render: (node: unknown) => void; unmount: () => void };
let container: HTMLDivElement | null = null;
let root: Root | null = null;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  stage.clients = [seedClient()];
  stage.invoices = seedInvoices();
  container = document.createElement('div');
  document.body.appendChild(container);
  React.act(() => { root = createRoot(container as HTMLDivElement) as unknown as Root; });
});
afterEach(() => {
  React.act(() => { (root as Root).unmount(); });
  container?.remove();
  container = null; root = null;
});

/** Render, lalu buka tab Ekonomi lewat kontrolnya (bukan state internal). */
const mountEkonomi = (): void => {
  React.act(() => { (root as Root).render(React.createElement(TimeBudget)); });
  const tab = Array.from(document.querySelectorAll('button'))
    .find((b) => (b.textContent || '').trim() === 'Ekonomi');
  expect(tab, 'tab Ekonomi tak ditemukan').toBeTruthy();
  React.act(() => { (tab as HTMLButtonElement).click(); });
};
const teks = (): string => document.body.textContent || '';
/* Nilai yang dirender di sebelah sebuah label baris. */
const nilaiDekat = (label: string): string => {
  const baris = Array.from(document.querySelectorAll('div'))
    .filter((d) => (d.textContent || '').includes(label))
    .sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)[0];
  return baris ? (baris.textContent || '').replace(label, '').trim() : '';
};
const jt = (n: number): string => 'Rp ' + AMS.fmt(Math.round(n / 1e6)) + ' jt';
/** Nilai sebuah <Stat> (ui.tsx: .stat > .s-val + .s-lbl) menurut labelnya. */
const nilaiStat = (label: string): string => {
  const stat = Array.from(document.querySelectorAll('.stat'))
    .find((d) => (d.querySelector('.s-lbl')?.textContent || '').trim() === label);
  return stat ? (stat.querySelector('.s-val')?.textContent || '').trim() : '(stat tak ada)';
};

describe('TB6 — panel penagihan menampilkan register, bukan pecahan fee', () => {
  it('premis: register seed BERSELISIH dengan rumus lama (cacatnya tak dorman)', () => {
    const tertagih = seedInvoices().reduce((s, i) => s + i.amount, 0);
    expect(seedClient().fee).toBeTruthy();
    expect(tertagih).not.toBe((seedClient().fee as number) * 0.5);
  });

  it('"Sudah ditagih" = Σ faktur terbit, dan angka lama TIDAK muncul lagi', () => {
    mountEkonomi();
    const tertagih = seedInvoices().reduce((s, i) => s + i.amount, 0);
    const lama = (seedClient().fee as number) * 0.5;
    expect(teks()).toContain(`Sudah ditagih (${seedInvoices().length} faktur terbit)`);
    expect(nilaiDekat(`Sudah ditagih (${seedInvoices().length} faktur terbit)`)).toBe(jt(tertagih));
    expect(teks(), 'angka fee × 0,5 masih di layar').not.toContain(jt(lama));
    expect(teks(), 'label "(2 termin)" yang dipaku').not.toContain('(2 termin)');
  });

  it('sisa nilai kontrak = fee − tertagih', () => {
    mountEkonomi();
    const sisa = (seedClient().fee as number) - seedInvoices().reduce((s, i) => s + i.amount, 0);
    expect(nilaiDekat('Sisa nilai kontrak')).toBe(jt(sisa));
  });

  it('liabilitas kontrak yang dulu tersembunyi kini terbaca', () => {
    mountEkonomi();
    const tertagih = seedInvoices().reduce((s, i) => s + i.amount, 0);
    const diakui = diakuiDemo(seedClient().fee as number);
    expect(tertagih).toBeGreaterThan(diakui);   // perikatan demo menagih di muka
    expect(nilaiDekat('Liabilitas kontrak (ditagih > diakui)')).toBe(jt(tertagih - diakui));
    expect(nilaiDekat('Aset kontrak (diakui > ditagih)')).toBe(jt(0));
  });

  it('"Termin ke-3" dicabut; yang tampil adalah faktur nyata & tanggalnya sendiri', () => {
    mountEkonomi();
    expect(teks(), 'klaim termin karangan masih ada').not.toContain('Termin ke-3');
    const belumLunas = seedInvoices().filter((i) => i.amount - i.paid > 0)
      .sort((a, b) => a.due.localeCompare(b.due))[0];
    expect(teks()).toContain(belumLunas.id);
    expect(teks()).toContain(jt(belumLunas.amount - belumLunas.paid));
    /* Tanggalnya berasal dari faktur itu, bukan "31 Mar" yang dipaku. */
    expect(teks()).toContain(String(+belumLunas.due.slice(0, 4)));
  });

  it('register kosong berkata demikian — bukan menampilkan Rp 0 tanpa penjelasan', () => {
    stage.invoices = [];
    mountEkonomi();
    expect(teks()).toContain('Register faktur belum memuat satu pun faktur');
    expect(teks()).toContain('Sudah ditagih (0 faktur terbit)');
  });

  it('faktur draf tak menagih, dan layar menyebut keberadaannya', () => {
    stage.invoices = seedInvoices().map((i) => ({ ...i, status: 'Draft' }));
    mountEkonomi();
    expect(nilaiDekat('Sudah ditagih (0 faktur terbit)')).toBe(jt(0));
    expect(teks()).toContain('faktur masih berstatus draf');
  });
});

describe('TB5 — perikatan tanpa nilai kontrak berbunyi, bukan ditambal', () => {
  beforeEach(() => { stage.clients = []; });   /* klien tak ada di register */

  it('pita lubang data muncul dan menyebut apa yang TETAP terukur', () => {
    mountEkonomi();
    expect(teks()).toContain('Nilai kontrak');
    expect(teks()).toContain('belum ditetapkan');
    expect(teks()).toContain('tidak terukur');
    expect(teks()).toContain('biaya waktu di bawah tetap terukur');
  });

  it('besaran rupiah bergantung-kontrak berbunyi “—”, dan tak ada NaN', () => {
    mountEkonomi();
    ['Fee Disepakati', 'Margin Proyeksi', 'Margin %'].forEach((label) => {
      expect(nilaiStat(label), label).toBe('—');
    });
    expect(teks(), 'NaN bocor ke layar').not.toMatch(/NaN/);
    expect(teks(), 'fee karangan 1.520 jt').not.toContain('Rp 1.520 jt');
  });

  it('yang TIDAK ikut hilang: jam, WIP, biaya — dan tertagih dari register', () => {
    mountEkonomi();
    const tertagih = seedInvoices().reduce((s, i) => s + i.amount, 0);
    expect(nilaiDekat(`Sudah ditagih (${seedInvoices().length} faktur terbit)`)).toBe(jt(tertagih));
    expect(nilaiDekat('Sisa nilai kontrak')).toBe('—');
    expect(teks()).toContain('Biaya pd Penyelesaian');
  });

  it('donat realisasi diganti pernyataan, bukan lingkaran 0%', () => {
    mountEkonomi();
    expect(teks()).toContain('Tanpa nilai kontrak, rasio itu');
    expect(teks(), 'realisasi 0% yang dikarang').not.toMatch(/0%\s*realisasi/);
  });

  it('kasus ber-fee TETAP merender donatnya (anti-tautologi)', () => {
    stage.clients = [seedClient()];
    mountEkonomi();
    expect(teks()).not.toContain('Tanpa nilai kontrak, rasio itu');
    expect(teks()).toContain('realisasi');
  });
});
