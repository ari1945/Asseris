// @vitest-environment jsdom
/* ============================================================
   SPR 2400 DI LAYAR — apa yang benar-benar terbaca pengguna.

   Gerbang sumber (`spr2400_conventions.test.ts`) membuktikan bahwa literalnya
   sudah tidak ada di berkas. Yang TIDAK dibuktikannya:

     · bahwa yang menggantikannya benar-benar MENGIKUTI catatan. Mencabut `900`
       lalu menampilkan `0`, `undefined`, atau tanda hubung akan lolos gerbang
       sumber dengan gemilang. Karena itu uji di bawah MENGUBAH catatan kanonik
       dan menuntut layar ikut berubah — satu-satunya cara membedakan "ditarik
       dari sumber" dari "kebetulan sama dengan sumber".
     · bahwa pemilih bentuk simpulan benar-benar radio native yang dapat
       dioperasikan, dan bahwa pratinjau MENYATAKAN mana yang terekam dan mana
       yang sedang disimulasikan.
     · bahwa tombol "AI Assist" benar-benar memanggil sesuatu.

   Pola mengikuti `treasury_render.test.ts`.
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
/* SubBar menarik seluruh shell (TopBar/Sidebar) — di sini cukup isinya. */
vi.mock('./shell', () => ({ SubBar: ({ right }: { right?: unknown }) => right as never }));

const { SPR2400View } = await import('./view_spr2400');

type Root = { render: (node: unknown) => void; unmount: () => void };
type PlanLike = { materiality: number; benchmark: string; pm: number };
type RecordLike = { id: string; client: string; conclusion: string; inquiries: { q: string; done: boolean }[] };

const plan = (): PlanLike => AMS.REVIEW_2400_PLAN as PlanLike;
const rec = (): RecordLike => AMS.REVIEW_2400 as RecordLike;

const PLAN0 = { ...plan() };
const CONCL0 = rec().conclusion;

let container: HTMLDivElement | null = null;
let root: Root | null = null;

const render = () => {
  React.act(() => { (root as Root).render(React.createElement(SPR2400View)); });
};
const teks = (): string => (container as HTMLDivElement).textContent || '';
const tombol = (label: string): HTMLButtonElement => {
  const all = [...(container as HTMLDivElement).querySelectorAll('button')];
  const hit = all.find((b) => (b.textContent || '').includes(label));
  if (!hit) throw new Error(`tombol "${label}" tak ada. Yang ada: ${all.map((b) => b.textContent).join(' | ')}`);
  return hit as HTMLButtonElement;
};
const klik = (el: HTMLElement) => { React.act(() => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); };
const bukaTab = (label: string) => klik(tombol(label));

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  navCalls.length = 0;
  container = document.createElement('div');
  document.body.appendChild(container);
  React.act(() => { root = createRoot(container as HTMLDivElement) as unknown as Root; });
});
afterEach(() => {
  React.act(() => { (root as Root).unmount(); });
  container?.remove();
  container = null; root = null;
  Object.assign(plan(), PLAN0);
  rec().conclusion = CONCL0;
  delete (window as { __amsOpenCopilot?: unknown }).__amsOpenCopilot;
});

/* ==================================================================
   S1 di layar — materialitas MENGIKUTI catatan.
   ================================================================== */
describe('S1 · materialitas di layar mengikuti REVIEW_2400_PLAN', () => {
  it('menampilkan angka rencana reviu yang tercatat, bukan tanda hubung', () => {
    render();
    bukaTab('Materialitas & Bukti');
    const t = teks();
    expect(t).toContain(AMS.fmt(plan().materiality / 1e6, 0));
    expect(t).toContain(AMS.fmt(plan().pm / 1e6, 0));
    expect(t).toContain(plan().benchmark);
  });

  it('MENGUBAH catatan menggeser layar — pembeda turunan vs kebetulan', () => {
    /* Angka sengaja jauh dari 900/675 supaya tak mungkin lolos karena mirip. */
    plan().materiality = 4_321_000_000;
    plan().pm = 3_240_000_000;
    plan().benchmark = '2% dari total aset';
    render();
    bukaTab('Materialitas & Bukti');
    const t = teks();
    expect(t).toContain('4.321');
    expect(t).toContain('3.240');
    expect(t).toContain('2% dari total aset');
    /* dan angka lama benar-benar HILANG dari layar */
    expect(t).not.toContain('900');
    expect(t).not.toContain('675');
  });

  it('tidak menampilkan materialitas perikatan AUDIT aktif', () => {
    render();
    bukaTab('Materialitas & Bukti');
    /* ENG-2025-014 (perikatan audit bawaan) — entitas BERBEDA. Kalau angka ini
       muncul, seseorang menyambungkan useMateriality() ke panel reviu. */
    expect(teks()).not.toContain('1.485');
  });
});

/* ==================================================================
   S2 · S3 di layar — identitas.
   ================================================================== */
describe('S2 · pratinjau laporan tidak menandatangani siapa pun', () => {
  it('nol nama akuntan publik sebagai penanda tangan', () => {
    render();
    bukaTab('Bentuk Simpulan');
    const t = teks();
    /* nama rekan BOLEH muncul sebagai rekaman registri berlabel, tetapi tidak
       boleh berdiri sebagai blok tanda tangan */
    expect(t).not.toContain('· Akuntan Publik');
    expect(t).toContain('tidak ditandatangani');
  });
});

describe('S3 · identitas perikatan ditarik dari catatan', () => {
  it('id & klien di layar sama dengan REVIEW_2400', () => {
    render();
    const t = teks();
    expect(t).toContain(rec().id);
    expect(t).toContain(rec().client);
  });

  it('modul tidak lagi mengaku tahu perikatan mana yang AKTIF', () => {
    render();
    const t = teks();
    expect(t).not.toContain('Perikatan Aktif');
    expect(t).toContain('Perikatan Reviu Tertaut');
  });
});

/* ==================================================================
   S4 · T-4 — pemilih simpulan & basis.
   ================================================================== */
describe('S4 · pemilih bentuk simpulan adalah radio native', () => {
  const radios = (): HTMLInputElement[] =>
    [...(container as HTMLDivElement).querySelectorAll('input[type="radio"]')] as HTMLInputElement[];

  it('empat opsi, semuanya input radio dalam satu grup', () => {
    render();
    bukaTab('Bentuk Simpulan');
    const r = radios();
    expect(r.length).toBe(4);
    expect(new Set(r.map((x) => x.name)).size).toBe(1);
  });

  it('terbuka pada simpulan TEREKAM, dan menandainya sebagai terekam', () => {
    render();
    bukaTab('Bentuk Simpulan');
    const dipilih = radios().filter((x) => x.checked);
    expect(dipilih.length).toBe(1);
    expect(dipilih[0].value).toBe(rec().conclusion);
    const t = teks();
    expect(t).toContain('Terekam');
    expect(t).toContain('Simpulan terekam perikatan');
  });

  it('mengubah catatan mengubah opsi yang ditandai terekam', () => {
    rec().conclusion = 'adverse';
    render();
    bukaTab('Bentuk Simpulan');
    expect(radios().filter((x) => x.checked)[0].value).toBe('adverse');
  });

  it('memilih bentuk LAIN menyatakan diri simulasi, bukan simpulan perikatan', () => {
    render();
    bukaTab('Bentuk Simpulan');
    const lain = radios().find((x) => x.value !== rec().conclusion) as HTMLInputElement;
    /* MouseEvent, bukan Event: React memetakan onChange radio/checkbox ke
       peristiwa `click` sintetiknya — `new Event('click')` tak dikenalinya dan
       uji akan lolos VAKUM (layar tak pernah berubah, assertion negatif hijau). */
    klik(lain);
    const t = teks();
    expect(t).toContain('Simulasi metodologi');
    expect(t).not.toContain('Simpulan terekam perikatan');
    /* simpulan terekam TETAP disebut — pratinjau tak boleh menyembunyikannya */
    expect(t).toContain('Simpulan terekam');
  });
});

/* ==================================================================
   S6 — tombol yang dulu mati.
   ================================================================== */
describe('S6 · tombol AI Assist benar-benar memanggil sesuatu', () => {
  it('mengaktifkannya membuka drawer AI Co-pilot', () => {
    let dibuka = 0;
    (window as { __amsOpenCopilot?: unknown }).__amsOpenCopilot = () => { dibuka++; };
    render();
    klik(tombol('AI Assist'));
    expect(dibuka).toBe(1);
  });

  it('tidak meledak bila drawer belum terdaftar', () => {
    render();
    expect(() => klik(tombol('AI Assist'))).not.toThrow();
  });
});

describe('S5 · navigasi ke perikatan reviu benar-benar bekerja', () => {
  it('tombol "Perikatan Langsung" menavigasi ke review2400', () => {
    render();
    klik(tombol('Perikatan Langsung'));
    expect(navCalls).toContain('review2400');
  });

  it('tautan di tab Prosedur Reviu adalah <button>, dan ia menavigasi', () => {
    render();
    bukaTab('Prosedur Reviu');
    klik(tombol('Analitis & Inquiry'));
    expect(navCalls).toContain('review2400');
  });
});

/* ==================================================================
   T-5 — status bukti berhenti mengarang.
   ================================================================== */
describe('T-5 · kecukupan bukti: kriteria vs status terekam', () => {
  it('status inquiry di layar sama dengan rekaman perikatan', () => {
    render();
    bukaTab('Materialitas & Bukti');
    const inq = rec().inquiries;
    const selesai = inq.filter((x) => x.done).length;
    expect(teks()).toContain(`${selesai}/${inq.length} inquiry terjawab`);
    for (const q of inq) expect(teks()).toContain(q.q);
  });

  it('kriteria ¶55 disajikan sebagai kriteria, bukan sebagai status terpenuhi', () => {
    render();
    bukaTab('Materialitas & Bukti');
    expect(teks()).toContain('dinilai di kertas kerja perikatan');
  });
});
