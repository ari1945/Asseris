// @vitest-environment jsdom
/* ============================================================
   PELAPORAN PPPK — KONTROL YANG DAPAT DIOPERASIKAN, DAN LABEL YANG
   TIDAK MEMBANTAH ANGKANYA SENDIRI.

   Dua kelas cacat yang dipaku berkas ini:

   K · KONTROL PALSU. Lima navigasi di dalam kalimat memakai
       `<span onClick=…>` bergaya `cursor:pointer` + garis bawah biru. Ia
       terlihat tautan dan menanggapi tetikus, tetapi menurut HTML ia bukan
       elemen interaktif: tak masuk urutan tab, tak fokusabel, tak menanggapi
       Enter, dan tak punya peran di pohon aksesibilitas. Pengguna papan ketik
       dan pembaca layar tak punya jalan sama sekali ke aksinya.

   L · LABEL KARANGAN. Kartu "Menuju Tenggat" menghitung sisa hari dari
       `PPPK_REPORT.dueDate` tetapi menuliskan tanggalnya sebagai literal
       "30 Apr". Kalau catatan bergeser, label MEMBANTAH angka di kartu yang
       sama. Pola yang identik ada di kartu "Total Klien FY2025" terhadap
       `PPPK_REPORT.year`.

   ── BATAS YANG DAPAT DIPUTUSKAN jsdom (dan mengapa uji ini berbentuk begini)
   jsdom MEMODELKAN fokusabilitas: `focus()` pada `<span>` tanpa `tabindex`
   TIDAK memindahkan `document.activeElement` (ia tetap di `<body>`), sedangkan
   pada `<button>` ia memindahkannya. Itulah arti harfiah "tak bisa di-Tab",
   dan itu yang diuji di sini — perilaku, bukan atribut.

   jsdom TIDAK mensintesis klik dari Enter/Space pada tombol native (sudah
   diprobe: `keydown{Enter}` pada `<button>` menghasilkan NOL klik). Sintesis
   itu adalah *activation behavior* milik peramban. Karena itu langkah kedua
   memanggil `.click()` pada `document.activeElement` — menjalankan activation
   behavior dari elemen yang SEDANG DIFOKUS, yakni persis jalur yang ditempuh
   Enter. Bukti Enter di peramban sungguhan adalah ranah `e2e/` (lihat pola
   #304 pada `07-a11y-axe-keyboard.spec.ts`); jsdom tak berwenang atasnya dan
   berkas ini tidak berpura-pura sebaliknya.
   ============================================================ */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { AMS } from './data';

const navCalls: string[] = [];
vi.mock('./contexts', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('./contexts');
  return { ...actual, useNav: () => (id: string) => { navCalls.push(id); } };
});
/* SubBar menarik seluruh shell (TopBar/Sidebar) — di sini cukup isinya, supaya
   tombol di sisi kanannya tetap ikut terender dan dapat dihitung. */
vi.mock('./shell', () => ({ SubBar: ({ right }: { right?: unknown }) => right as never }));

const { PPPKReport } = await import('./view_pppk');

type Root = { render: (node: unknown) => void; unmount: () => void };
type ReportLike = { year: number; dueDate: string };

const laporan = (): ReportLike => AMS.PPPK_REPORT as ReportLike;
const YEAR0 = laporan().year;
const DUE0 = laporan().dueDate;

let container: HTMLDivElement | null = null;
let root: Root | null = null;

const box = (): HTMLDivElement => container as HTMLDivElement;
const render = () => { React.act(() => { (root as Root).render(React.createElement(PPPKReport)); }); };
const teks = (): string => box().textContent || '';

/* Tab dipilih dari bilah tab-nya sendiri, bukan dari seluruh dokumen: setelah
   perbaikan, tautan "tinjau tab Realisasi PPL" juga sebuah <button> yang
   memuat teks "Realisasi PPL". */
const bukaTab = (label: string) => {
  const bar = box().querySelector('.tabs');
  if (!bar) throw new Error('bilah tab tak ada');
  const hit = [...bar.querySelectorAll('button')].find((b) => (b.textContent || '').includes(label));
  if (!hit) throw new Error(`tab "${label}" tak ada`);
  React.act(() => { hit.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
};

/* Elemen yang MENAMPILKAN DIRI sebagai tautan: garis bawah sebaris (pola lama)
   atau kelas `.lnk` (pola repo — lihat view_facilities2 / view_procurement2 /
   view_firmops2). Keduanya disapu supaya kemunduran ke <span> tertangkap. */
const bergayaTautan = (): HTMLElement[] =>
  [...box().querySelectorAll<HTMLElement>('*')].filter(
    (el) => el.style.textDecoration === 'underline' || el.classList.contains('lnk'),
  );

const tautanBerteks = (frag: string): HTMLElement => {
  const hit = bergayaTautan().find((el) => (el.textContent || '').includes(frag));
  if (!hit) {
    throw new Error(
      `tautan "${frag}" tak ada. Yang bergaya tautan: ${bergayaTautan().map((e) => e.textContent).join(' | ')}`,
    );
  }
  return hit;
};

/* Jangkau dengan papan ketik, lalu aktifkan yang SEDANG DIFOKUS. Kalau elemen
   itu tak fokusabel, `document.activeElement` masih <body> dan langkah pertama
   sudah memerah — persis cacat yang dicabut. */
const jangkauLaluAktifkan = (el: HTMLElement) => {
  el.focus();
  expect(document.activeElement).toBe(el);
  React.act(() => { (document.activeElement as HTMLElement).click(); });
};

const labelKartu = (frag: string): string => {
  const semua = [...box().querySelectorAll<HTMLElement>('.s-lbl')];
  const hit = semua.find((e) => (e.textContent || '').includes(frag));
  if (!hit) throw new Error(`label kartu "${frag}" tak ada. Yang ada: ${semua.map((e) => e.textContent).join(' | ')}`);
  return hit.textContent || '';
};

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  navCalls.length = 0;
  container = document.createElement('div');
  document.body.appendChild(container);
  React.act(() => { root = createRoot(box()) as unknown as Root; });
});
afterEach(() => {
  React.act(() => { (root as Root).unmount(); });
  container?.remove();
  container = null; root = null;
  laporan().year = YEAR0;
  laporan().dueDate = DUE0;
});

/* ==================================================================
   K · setiap kontrol navigasi terjangkau papan ketik.
   ================================================================== */
describe('K · kontrol navigasi terjangkau papan ketik', () => {
  const TAB_BERTAUTAN = ['Ringkasan & Kelengkapan', 'Realisasi PPL', 'Rotasi AP Emiten'];

  it('setiap elemen bergaya tautan dapat difokus — di seluruh tab yang punya', () => {
    for (const tab of TAB_BERTAUTAN) {
      render();
      bukaTab(tab);
      const kandidat = bergayaTautan();
      /* sapuan yang tak menemukan apa pun tidak membuktikan apa pun */
      expect(kandidat.length, `tab "${tab}" tak punya elemen bergaya tautan`).toBeGreaterThan(0);
      for (const el of kandidat) {
        el.focus();
        expect(
          document.activeElement,
          `tab "${tab}": <${el.tagName.toLowerCase()}> "${el.textContent}" tak dapat difokus`,
        ).toBe(el);
      }
    }
  });

  it('nol <span>/<div> yang berperan sebagai tautan', () => {
    for (const tab of TAB_BERTAUTAN) {
      render();
      bukaTab(tab);
      const palsu = bergayaTautan().filter((el) => el.tagName === 'SPAN' || el.tagName === 'DIV');
      expect(palsu.map((el) => el.textContent), `tab "${tab}"`).toEqual([]);
    }
  });

  it('"tinjau tab Realisasi PPL" — dijangkau lalu diaktifkan, tab benar-benar beralih', () => {
    render();
    expect(teks()).not.toContain('Kewajiban PPL berkelanjutan');
    jangkauLaluAktifkan(tautanBerteks('tinjau tab Realisasi PPL'));
    expect(teks()).toContain('Kewajiban PPL berkelanjutan');
  });

  it('"DMS" — dijangkau lalu diaktifkan, nav dipanggil', () => {
    render();
    jangkauLaluAktifkan(tautanBerteks('DMS'));
    expect(navCalls).toContain('dms');
  });

  it('"CPE / PPL Tracker" di tab Realisasi PPL — dijangkau lalu diaktifkan, nav dipanggil', () => {
    render();
    bukaTab('Realisasi PPL');
    jangkauLaluAktifkan(tautanBerteks('CPE / PPL Tracker'));
    expect(navCalls).toContain('cpe');
  });

  it('"Independence & Rotasi" di tab Rotasi AP — dijangkau lalu diaktifkan, nav dipanggil', () => {
    render();
    bukaTab('Rotasi AP Emiten');
    jangkauLaluAktifkan(tautanBerteks('Independence & Rotasi'));
    expect(navCalls).toContain('independence');
  });
});

/* ==================================================================
   L · label kartu ditarik dari catatan, bukan diketik.
   Pembeda "turunan" vs "kebetulan sama": DUA nilai berbeda harus
   menghasilkan DUA label berbeda. Memeriksa "label memuat tanggal"
   saja adalah tautologi — literal "30 Apr" pun memuat tanggal.
   ================================================================== */
describe('L · label kartu mengikuti PPPK_REPORT', () => {
  it('dua nilai dueDate berbeda menghasilkan dua label tenggat berbeda', () => {
    laporan().dueDate = '2026-04-30';
    render();
    const label1 = labelKartu('Menuju Tenggat');

    laporan().dueDate = '2027-09-14';
    render();
    const label2 = labelKartu('Menuju Tenggat');

    expect(label2).not.toBe(label1);
    expect(label1).toContain('30 Apr');
    expect(label2).toContain('14 Sep');
    expect(label2).not.toContain('30 Apr');
  });

  it('label tenggat tidak menyebut tanggal yang tidak ada di catatan', () => {
    laporan().dueDate = '2026-06-01';
    render();
    expect(labelKartu('Menuju Tenggat')).not.toContain('30 Apr');
  });

  it('dua nilai year berbeda menghasilkan dua label klien berbeda', () => {
    laporan().year = 2025;
    render();
    const label1 = labelKartu('Total Klien');

    laporan().year = 2031;
    render();
    const label2 = labelKartu('Total Klien');

    expect(label2).not.toBe(label1);
    expect(label1).toContain('2025');
    expect(label2).toContain('2031');
  });
});

/* ==================================================================
   B · tidak ada tombol yang mengaku bisa melakukan sesuatu, lalu diam.
   Aturan keras 4: tombol mati diaktifkan atau dihapus — tidak ada opsi
   ketiga, dan MENAMAINYA membuat keadaan lebih buruk.
   ================================================================== */
describe('B · nol tombol tanpa aksi', () => {
  it('tidak ada CTA "Ajukan Laporan Tahunan" — penyampaian e-reporting bukan kemampuan modul ini', () => {
    render();
    const tombol = [...box().querySelectorAll('button')].map((b) => b.textContent || '');
    expect(tombol.filter((t) => t.includes('Ajukan Laporan Tahunan'))).toEqual([]);
  });
});
