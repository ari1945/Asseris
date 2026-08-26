// @vitest-environment jsdom
/* ============================================================
   Tab "Aset & Liabilitas Kontrak" — apa yang boleh dinyatakan panel PSAK 72.

   Dua panel roll-forward di tab ini menyajikan saldo awal 1 Januari dan
   pergerakan periode. Keduanya tak punya dasar:

   · Panel LIABILITAS memakai ×1,4 / ×0,9 / ×1,3 atas SATU basis yang sama
     (`totLiab`). 1,4 + 0,9 − 1,3 = 1,0 — persamaannya menutup secara ALJABAR,
     apa pun datanya. Itu bukan rekonsiliasi; itu A == A yang ditulis panjang.

   · Panel ASET memakai ×0,74 / ×0,32 / ×0,28 atas TIGA basis BERBEDA
     (`totAsset`, `totRecognized`, `totBilled`), sehingga ia tak menutup sama
     sekali — dengan seed sekarang selisihnya Rp 15,0 jt, dan selisih itu
     TERBACA di layar karena ketiga baris ikut dicetak.

   Spanduk di atasnya menyatakan faktor-faktor itu "disintesis agar menutup ke
   saldo akhir". Untuk panel aset kalimat itu tidak benar.

   Yang dibuktikan berkas ini adalah PERILAKU halaman (pola
   `revenue_row_control.test.ts`), bukan aritmetika di baliknya — sebab cacat
   yang dipaku memang hidup di lapisan penyajian.

   Dua set data dipakai, berbeda pada SATU faktur saja. Gerbang inti (G3):
   mengubah faktur bertanggal 2026 tidak boleh menggerakkan angka mana pun
   selain saldo akhir. Pada kode lama ia menggerakkan "Saldo awal (1 Jan)" —
   sebuah saldo periode LALU yang bergeser karena penagihan periode INI.
   ============================================================ */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';

/* --- Fixture. Angka harapan di bawah dihitung TANGAN, bukan dari mesin yang
       sedang diuji (gerbang yang memanggil mesinnya sendiri = tautologi). ---
   ENG-A: fee 1.000 jt × (100/200 jam) = diakui 500 jt · ditagih 200 jt ⇒ aset 300 jt
   ENG-B: fee   800 jt × (200/400 jam) = diakui 400 jt · ditagih 700 jt ⇒ liab 300 jt
   Σ diakui 900 jt · Σ ditagih 900 jt · Σ aset 300 jt · Σ liab 300 jt          */
const ENGAGEMENTS = [
  { id: 'ENG-A', clientId: 'C-1', type: 'Audit Laporan Keuangan', status: 'Fieldwork', partner: 'Uji Partner, CPA', actualHrs: 100, budgetHrs: 200 },
  { id: 'ENG-B', clientId: 'C-2', type: 'Audit Laporan Keuangan', status: 'Fieldwork', partner: 'Uji Partner, CPA', actualHrs: 200, budgetHrs: 400 },
];
const CLIENTS = [
  { id: 'C-1', name: 'PT Uji Sentosa', fee: 1_000_000_000 },
  { id: 'C-2', name: 'PT Uji Bahari', fee: 800_000_000 },
];
const INV_SET_1 = [
  { id: 'INV-1', eng: 'ENG-A', client: 'PT Uji Sentosa', status: 'Sent', amount: 200_000_000, paid: 0, due: '2026-01-31' },
  { id: 'INV-2', eng: 'ENG-B', client: 'PT Uji Bahari', status: 'Sent', amount: 700_000_000, paid: 0, due: '2026-01-31' },
];
/* Set kedua = set pertama dengan SATU faktur 2026 dinaikkan 200 → 260 jt.
   Konsekuensi yang dihitung tangan: aset ENG-A 300 → 240 jt; liabilitas tak
   tersentuh (ENG-B tak berubah); saldo 1 JANUARI tak boleh bergerak sama sekali. */
const INV_SET_2 = [
  { ...INV_SET_1[0], amount: 260_000_000 },
  INV_SET_1[1],
];
const state: { invoices: typeof INV_SET_1 } = { invoices: INV_SET_1 };

vi.mock('./contexts', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('./contexts');
  return {
    ...actual,
    useFirm: () => ({ engagements: ENGAGEMENTS, clients: CLIENTS, activeEngagementId: 'ENG-A' }),
    useAuditHeavy: () => ({ timeEntries: [] }),
  };
});
vi.mock('./use_invoices', () => ({
  useInvoiceRegister: () => ({ register: state.invoices, setRegister: () => {}, canEdit: false }),
}));
vi.mock('./shell', () => ({ SubBar: () => null }));

const { FirmRevenue } = await import('./view_firmrevenue');

type Root = { render: (node: unknown) => void; unmount: () => void };
let container: HTMLDivElement | null = null;
let root: Root | null = null;

function fresh(): void {
  container = document.createElement('div');
  document.body.appendChild(container);
  React.act(() => { root = createRoot(container as HTMLDivElement) as unknown as Root; });
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  state.invoices = INV_SET_1;
  fresh();
});
afterEach(() => {
  React.act(() => { (root as Root).unmount(); });
  container?.remove();
  container = null; root = null;
});

/** Merender modul lalu membuka tab "Aset & Liabilitas Kontrak". */
function openRollfwd(): void {
  React.act(() => { (root as Root).render(React.createElement(FirmRevenue)); });
  const tab = Array.from(document.querySelectorAll('button'))
    .filter((b) => (b.textContent || '').includes('Aset & Liabilitas Kontrak'));
  expect(tab.length).toBe(1);
  React.act(() => { tab[0].click(); });
}

/** Panel (div.panel) yang judulnya SENDIRI memuat `title`.
    `:scope >` mengikat: tab ini dibungkus `<Panel noBody>`, jadi pencarian
    h3 keturunan akan ikut memilih pembungkusnya dan gerbang gagal karena
    bentuk DOM alih-alih karena cacat yang dipaku. */
function panelTitled(title: string): HTMLElement {
  const hit = Array.from(document.querySelectorAll('div.panel')).filter((p) => {
    const h = p.querySelector(':scope > div.panel-h > h3');
    return !!h && (h.textContent || '').includes(title);
  });
  expect(hit.length, 'panel berjudul ' + title).toBe(1);
  return hit[0] as HTMLElement;
}

/** Semua besaran "Rp N jt" di dalam sebuah panel, dalam juta rupiah.
    Ditulis sebagai literal /.../ — RegExp yang DIRAKIT dari string kehilangan
    escape-nya dan mendarat sebagai pola yang tak pernah cocok (BUILD.md §R-7). */
function rupiahJt(el: HTMLElement): number[] {
  const out: number[] = [];
  const re = /(\()?Rp\s*([\d.]+(?:,\d+)?)\s*jt/g;
  const text = el.textContent || '';
  let m = re.exec(text);
  while (m) {
    const n = parseFloat(m[2].replace(/\./g, '').replace(',', '.'));
    out.push(m[1] ? -n : n);
    m = re.exec(text);
  }
  return out;
}

/** Baris label/nilai (RowKv → div.row.jb.ac dengan dua <span>). */
function kvRows(el: HTMLElement): { label: string; jt: number | null }[] {
  return Array.from(el.querySelectorAll('div.row.jb.ac')).map((r) => {
    const spans = Array.from(r.querySelectorAll('span'));
    const label = ((spans[0] && spans[0].textContent) || '').trim();
    const v = rupiahJt(r as HTMLElement);
    return { label, jt: v.length ? v[0] : null };
  });
}

describe('G1/G2 — panel kontrak hanya boleh menyatakan besaran yang punya dasar', () => {
  it('panel ASET tak menampilkan besaran selain saldo akhir yang diturunkan', () => {
    openRollfwd();
    /* Satu-satunya besaran aset kontrak yang punya dasar pada fixture ini
       adalah saldo akhirnya: 300 jt. Setiap angka lain di panel ini adalah
       angka yang tak dapat ditelusuri ke satu pun sumber data. */
    expect(rupiahJt(panelTitled('Aset Kontrak'))).toEqual([300]);
  });

  it('panel LIABILITAS tak menampilkan besaran selain saldo akhir yang diturunkan', () => {
    openRollfwd();
    expect(rupiahJt(panelTitled('Liabilitas Kontrak'))).toEqual([300]);
  });

  it('judul panel tak menjanjikan roll-forward yang tak dapat disusun', () => {
    openRollfwd();
    const heads = Array.from(document.querySelectorAll('div.panel h3')).map((h) => h.textContent || '');
    expect(heads.some((h) => h.includes('Roll-Forward'))).toBe(false);
  });
});

describe('G3 — mengubah SATU faktur 2026 hanya menggerakkan saldo akhir', () => {
  it('saldo akhir bergerak sebesar delta faktur; tak ada baris lain, termasuk 1 Januari', () => {
    openRollfwd();
    const rows1 = kvRows(panelTitled('Aset Kontrak'));
    /* Komposisi panel dipaku: SATU baris bernilai, yakni saldo akhirnya.
       Baris pergerakan mana pun yang muncul di sini tidak dapat berdiri
       sendiri — tak ada jurnal aset kontrak untuk menopangnya. */
    expect(rows1.filter((r) => r.jt != null).map((r) => r.label)).toEqual(['Saldo akhir aset kontrak']);
    expect(rows1[0].jt).toBe(300);

    /* Set kedua: faktur ENG-A 200 → 260 jt. */
    React.act(() => { (root as Root).unmount(); });
    container?.remove();
    state.invoices = INV_SET_2;
    fresh();
    openRollfwd();

    const rows2 = kvRows(panelTitled('Aset Kontrak'));
    expect(rows2.filter((r) => r.jt != null).map((r) => r.label)).toEqual(['Saldo akhir aset kontrak']);
    /* 500 diakui − 260 ditagih = 240: bergerak PERSIS sebesar delta fakturnya
       (−60 jt). Panel yang beku akan gagal di sini sama seperti panel yang
       menggerakkan angka periode lalu. */
    expect(rows2[0].jt).toBe(240);

    /* Liabilitas tak tersentuh — ENG-B tak diubah. */
    expect(rupiahJt(panelTitled('Liabilitas Kontrak'))).toEqual([300]);
  });
});

describe('G4 — panel MEMBANTAH, dan pengakuannya tidak keliru', () => {
  it('menyatakan saldo awal & pergerakan belum tersedia', () => {
    openRollfwd();
    const text = document.body.textContent || '';
    expect(text).toContain('saldo per 1 Januari dan pergerakan periode berjalan belum tersedia');
    expect(text).toContain('tak ada taksiran yang dipasang menggantikannya');
  });

  it('spanduk berhenti mengklaim faktor yang disintesis agar menutup', () => {
    openRollfwd();
    const text = document.body.textContent || '';
    expect(text).not.toContain('disintesis agar menutup ke saldo akhir');
    expect(text).not.toContain('Saldo awal (1 Jan)');
  });
});
