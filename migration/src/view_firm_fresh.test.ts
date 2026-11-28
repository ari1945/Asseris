// @vitest-environment jsdom
/* ============================================================
   Direktori Klien & formulir klien/perikatan untuk firma NYATA — PRD
   prd-identitas-firma-sesi A5 + A6, keputusan Q-4.

   A6 — `ClientCRM` membaca `clients[0].id` tanpa penjaga: firma tanpa klien crash di
        Direktori Klien (view_firm.tsx lama :23, :31).
   A5 — formulir memaku orang & angka firma demo: partner "Hartono Wijaya, CPA" sebagai
        nilai awal, tiga partner & tiga manajer demo sebagai satu-satunya pilihan, tenggat
        2026-04-30, 1.200 jam, materialitas Rp 2 M — semuanya ikut tertulis ke baris firma
        mana pun yang menekan "Simpan".
   Q-4 — partner penanggung jawab WAJIB dipilih, dari pengguna firma sesi.

   Konteks firma di-mock (FirmProvider asli menarik state dari server; yang diuji di sini
   adalah halamannya). `AMS.FIRM_USERS` diisi seperti yang dilakukan `hydrateCoreFromApi`.
   ============================================================ */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';

const firm = vi.hoisted(() => ({
  clients: [] as Array<Record<string, unknown>>,
  added: [] as Array<Record<string, unknown>>,
  addedEng: [] as Array<Record<string, unknown>>,
}));

vi.mock('./contexts', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('./contexts');
  return {
    ...actual,
    useFirm: () => ({
      clients: firm.clients, engagements: [], activeEngagementId: null,
      engagementsForClient: () => [], setActiveEngagementId: () => {},
      addClient: (c: Record<string, unknown>) => { firm.added.push(c); },
      updateClient: () => {}, setEngagementPhase: () => {},
      addEngagement: (e: Record<string, unknown>) => { firm.addedEng.push(e); },
    }),
    useNav: () => () => {},
  };
});
vi.mock('./shell', () => ({
  SubBar: ({ right }: { right?: unknown }) => React.createElement('div', { className: 'subbar' }, right as string),
}));
vi.mock('./wp_signoff', () => ({ usePhaseGate: () => ({ pending: null }), PhaseGateDialog: () => null }));

const { ClientCRM, EngagementMgmt } = await import('./view_firm');
const { AMS } = await import('./data');

const DEMO_PEOPLE = ['Hartono Wijaya', 'Rudi Gunawan', 'Sari Dewanti', 'Anindya Pramesti', 'Bayu Saputra', 'Citra Halim'];
const FIRM_USERS = [
  { id: 'U-1', name: 'Laksmi Purnamasari', initials: 'LP', role: 'Engagement Partner' },
  { id: 'U-2', name: 'Dimas Pratama', initials: 'DP', role: 'Junior Auditor' },
];

type Root = { render: (node: unknown) => void; unmount: () => void };
let container: HTMLDivElement | null = null;
let root: Root | null = null;
const savedUsers = AMS.FIRM_USERS;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  firm.clients = [];
  firm.added.length = 0;
  firm.addedEng.length = 0;
  AMS.FIRM_USERS = FIRM_USERS;
  container = document.createElement('div');
  document.body.appendChild(container);
  React.act(() => { root = createRoot(container as HTMLDivElement) as unknown as Root; });
});
afterEach(() => {
  React.act(() => { (root as Root).unmount(); });
  container?.remove();
  container = null; root = null;
  AMS.FIRM_USERS = savedUsers;
});

const mount = (C: unknown) => React.act(() => { (root as Root).render(React.createElement(C as () => null)); });
const button = (re: RegExp) => {
  const b = Array.from(document.querySelectorAll('button')).find((x) => re.test(x.textContent || ''));
  if (!b) throw new Error('tombol ' + re + ' tidak ditemukan');
  return b as HTMLButtonElement;
};
const labelled = (text: string) => {
  const l = Array.from(document.querySelectorAll('label')).find((x) => (x.textContent || '').trim() === text);
  const el = l && document.getElementById(l.getAttribute('for') || '');
  if (!el) throw new Error('kontrol berlabel "' + text + '" tidak ditemukan');
  return el as HTMLInputElement & HTMLSelectElement;
};
/* React mendengar `input`/`change` lewat setter nilai native — set langsung + event. */
const setValue = (el: HTMLInputElement | HTMLSelectElement, v: string) => {
  const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, v);
  React.act(() => { el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true })); });
};
const optionTexts = (el: HTMLSelectElement) => Array.from(el.options).map((o) => o.textContent || '');

describe('A6 — Direktori Klien untuk firma tanpa klien', () => {
  it('merender keadaan kosong, bukan crash', () => {
    mount(ClientCRM);
    expect(document.body.textContent).toContain('Belum ada klien di direktori firma ini');
    expect(button(/Klien Baru/)).toBeTruthy();
  });
});

describe('A5 + Q-4 — formulir Klien Baru', () => {
  it('pilihan partner = pengguna firma berkapabilitas partner; tanpa nama demo; nilai awal kosong', () => {
    mount(ClientCRM);
    React.act(() => { button(/Klien Baru/).click(); });
    const partner = labelled('Partner Penanggung Jawab');
    expect(partner.value).toBe('');
    expect(optionTexts(partner)).toEqual(['— pilih partner —', 'Laksmi Purnamasari']);
    for (const n of DEMO_PEOPLE) expect(document.body.textContent).not.toContain(n);
  });

  it('partner WAJIB: "Tambah Klien" nonaktif sampai partner dipilih, lalu tersimpan dengan partner itu', () => {
    mount(ClientCRM);
    React.act(() => { button(/Klien Baru/).click(); });
    setValue(labelled('Nama Entitas'), 'PT Klien Pertama');
    setValue(labelled('Industri'), 'Jasa');
    setValue(labelled('Domisili'), 'Bandung');
    expect(button(/Tambah Klien/).disabled).toBe(true);
    setValue(labelled('Partner Penanggung Jawab'), 'Laksmi Purnamasari');
    expect(button(/Tambah Klien/).disabled).toBe(false);
    React.act(() => { button(/Tambah Klien/).click(); });
    expect(firm.added).toHaveLength(1);
    expect(firm.added[0].partner).toBe('Laksmi Purnamasari');
  });
});

describe('A5 — formulir Engagement Baru', () => {
  it('tanpa partner/manajer/tenggat/jam/materialitas karangan; pilihan dari pengguna firma', () => {
    firm.clients = [{ id: 'C-1', name: 'PT Klien Pertama', fee: 0, risk: 'Low', status: 'Active', partner: 'Laksmi Purnamasari' }];
    mount(EngagementMgmt);
    React.act(() => { button(/Engagement Baru/).click(); });
    const partner = labelled('Partner');
    const manager = labelled('Manajer');
    expect(partner.value).toBe('');
    expect(manager.value).toBe('');
    expect(labelled('Tenggat').value).toBe('');
    expect(labelled('Anggaran Jam').value).toBe('');
    expect(optionTexts(partner)).toEqual(['— pilih partner —', 'Laksmi Purnamasari']);
    // Manajer: pengguna berkapabilitas reviewer (partner juga reviewer); junior tidak.
    expect(optionTexts(manager)).toEqual(['— belum ditetapkan —', 'Laksmi Purnamasari']);
    for (const n of DEMO_PEOPLE) expect(document.body.textContent).not.toContain(n);

    expect(button(/Buat Engagement/).disabled).toBe(true);
    setValue(partner, 'Laksmi Purnamasari');
    setValue(labelled('Tenggat'), '2027-03-31');
    setValue(labelled('Anggaran Jam'), '800');
    expect(button(/Buat Engagement/).disabled).toBe(false);
    React.act(() => { button(/Buat Engagement/).click(); });
    expect(firm.addedEng).toHaveLength(1);
    expect(firm.addedEng[0]).toMatchObject({ clientId: 'C-1', partner: 'Laksmi Purnamasari', manager: '', deadline: '2027-03-31', budgetHrs: 800 });
    expect(firm.addedEng[0]).not.toHaveProperty('materiality');
  });
});
