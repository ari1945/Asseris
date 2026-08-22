// @vitest-environment jsdom
/* ============================================================
   Kas, Bank & Rekonsiliasi DI LAYAR — apa yang benar-benar dilihat pengguna
   ketika kurs periode berjalan tak terdaftar.

   Gerbang teks (`cash_bank_fx.test.ts`) membuktikan mesinnya berhenti. Yang TIDAK
   dibuktikannya: bahwa halaman ikut berhenti — bahwa KPI "Selisih Kurs Diakui
   (GL 5-600)" berbunyi '—' dan bukan '+Rp 0 jt' atau NaN, dan bahwa alasannya
   tertulis alih-alih tab kosong tanpa penjelasan.

   Pola mengikuti `timebudget_econ_render.test.ts`.
   ============================================================ */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { AMS } from './data';
import { currentBalances } from './firm_ledger';
import type { CoaAccount, GlJournal } from './firm_ledger';
import { seedReconLines } from './use_bank_recon';

const seedCoa = () => AMS.FIRM_COA as unknown as CoaAccount[];
const seedGl = () => AMS.FIRM_GL as unknown as GlJournal[];
const derivedCoa = (): CoaAccount[] => {
  const bal = currentBalances(seedCoa(), seedGl(), seedGl());
  return seedCoa().map((a) => ({ ...a, bal: bal[a.code] }));
};

const stage: { canEdit: boolean; sessionName: string; firmName: string; logged: unknown[] } = {
  canEdit: true, sessionName: 'Dimas Raharjo', firmName: 'KAP Uji & Rekan', logged: [],
};

vi.mock('./contexts', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('./contexts');
  return {
    ...actual,
    useAuth: () => ({ user: stage.sessionName ? { name: stage.sessionName } : null, can: () => stage.canEdit }),
    useAudit: () => ({ logActivity: (e: unknown) => { stage.logged.push(e); } }),
    useFirm: () => ({ firm: { name: stage.firmName } }),
    useAmsPersist: (_k: string, init: unknown) => [typeof init === 'function' ? (init as () => unknown)() : init, () => {}],
  };
});
vi.mock('./use_firm_coa', () => ({ useFirmCoa: () => ({ coa: derivedCoa() }) }));
vi.mock('./use_bank_recon', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('./use_bank_recon');
  return { ...actual, useBankRecon: () => ({ lines: seedReconLines(), setLines: () => {}, healed: false }) };
});
vi.mock('./shell', () => ({ SubBar: () => null }));

const { CashBank } = await import('./view_firmtreasury');

type Root = { render: (node: unknown) => void; unmount: () => void };
let container: HTMLDivElement | null = null;
let root: Root | null = null;
const TODAY = String(AMS.TODAY);

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  stage.canEdit = true; stage.sessionName = 'Dimas Raharjo';
  stage.firmName = 'KAP Uji & Rekan'; stage.logged = [];
  container = document.createElement('div');
  document.body.appendChild(container);
  React.act(() => { root = createRoot(container as HTMLDivElement) as unknown as Root; });
});
afterEach(() => {
  React.act(() => { (root as Root).unmount(); });
  container?.remove();
  container = null; root = null;
  (AMS as unknown as Record<string, unknown>).TODAY = TODAY;
});

const mount = (): void => { React.act(() => { (root as Root).render(React.createElement(CashBank)); }); };
const openTab = (label: string): void => {
  const tab = Array.from(document.querySelectorAll('button'))
    .find((b) => (b.textContent || '').trim().startsWith(label));
  expect(tab, `tab '${label}' tak ditemukan`).toBeTruthy();
  React.act(() => { (tab as HTMLButtonElement).click(); });
};
const teks = (): string => document.body.textContent || '';
const nilaiStat = (label: string): string => {
  const stat = Array.from(document.querySelectorAll('.stat'))
    .find((d) => (d.querySelector('.s-lbl')?.textContent || '').trim() === label);
  return stat ? (stat.querySelector('.s-val')?.textContent || '').trim() : '(stat tak ada)';
};

/* ------------------------------------------------------------------ */

describe('layar Kas & Bank — keadaan hari ini (kurs tercakup)', () => {
  it('KPI menyatakan angkanya, bukan tanda hubung', () => {
    mount();
    expect(nilaiStat('Total Kas (ekuivalen IDR)')).toBe('Rp 8,58 M');
    expect(nilaiStat('Selisih Kurs Diakui (GL 5-600)')).toBe('+Rp 61 jt');
  });

  it('tab Revaluasi Valas merender kedua rekening valas pada kurs periodenya', () => {
    mount();
    openTab('Revaluasi Valas');
    expect(teks()).toContain('TOTAL SELISIH KURS DIAKUI (GL 5-600)');
    expect(teks()).toContain('Valas USD');
    expect(teks()).toContain('Cabang Singapura');
    /* Masa berlaku yang dipakai ikut tertulis — pembaca kertas kerja harus tahu
       kurs kapan yang dipakai, bukan hanya angkanya. */
    expect(teks()).toContain('2026-03-01 – 2026-03-31');
  });
});

describe('layar Kas & Bank — klok melewati masa kurs terakhir', () => {
  const majukanKlok = () => { (AMS as unknown as Record<string, unknown>).TODAY = '2026-09-30'; };

  it('KPI selisih kurs berbunyi "—", BUKAN nol dan bukan angka Maret', () => {
    majukanKlok();
    mount();
    const v = nilaiStat('Selisih Kurs Diakui (GL 5-600)');
    expect(v).toBe('—');
    expect(v).not.toContain('61');
    expect(teks(), 'angka revaluasi Maret masih tergambar').not.toContain('+Rp 61 jt');
  });

  it('tab Revaluasi Valas menjelaskan MENGAPA ia berhenti', () => {
    majukanKlok();
    mount();
    openTab('Revaluasi Valas');
    expect(teks()).toContain('Revaluasi dihentikan');
    expect(teks()).toContain('2026-09-30');
    expect(teks()).toMatch(/DITOLAK/);
    expect(teks()).toContain('Data Referensi Regulatori');
    expect(teks(), 'tabel revaluasi tetap tergambar').not.toContain('TOTAL SELISIH KURS DIAKUI');
  });

  it('rekonsiliasi Maret TIDAK ikut berhenti — ia terikat pada periodenya sendiri', () => {
    /* Kertas kerja yang sudah selesai tak boleh "membuka" sendiri karena kalender
       bergerak. Total Kas juga tetap dapat dinyatakan: ia posisi per periode itu. */
    majukanKlok();
    mount();
    expect(nilaiStat('Total Kas (ekuivalen IDR)')).toBe('Rp 8,58 M');
    openTab('Rekonsiliasi Bank');
    expect(teks()).toContain('Seluruh rekening menutup');
  });
});

describe('layar Kas & Bank — kertas kerja & jejak', () => {
  it('tombol ekspor ada, bernama, dan hidup ketika identitas firma tersedia', () => {
    mount();
    openTab('Rekonsiliasi Bank');
    const btn = Array.from(document.querySelectorAll('button'))
      .filter((b) => (b.textContent || '').includes('Ekspor rekening ini') || (b.textContent || '').includes('Seluruh rekening'));
    expect(btn).toHaveLength(2);
    for (const b of btn) {
      expect((b.textContent || '').trim().length, 'tombol tanpa nama').toBeGreaterThan(0);
      expect((b as HTMLButtonElement).disabled).toBe(false);
    }
  });

  it('tanpa identitas firma, ekspor DIMATIKAN dan mengatakan sebabnya', () => {
    stage.firmName = '';
    mount();
    openTab('Rekonsiliasi Bank');
    const b = Array.from(document.querySelectorAll('button'))
      .find((x) => (x.textContent || '').includes('Ekspor rekening ini')) as HTMLButtonElement;
    expect(b.disabled).toBe(true);
    expect(b.getAttribute('title')).toContain('Identitas firma tak tersedia');
  });

  it('pencocokan mencatat NAMA SESI; tanpa sesi ia tidak dicatat sama sekali', () => {
    mount();
    openTab('Rekonsiliasi Bank');
    const baris = Array.from(document.querySelectorAll('tbody tr'))
      .find((tr) => (tr.textContent || '').includes('Jasa giro (bunga)'));
    expect(baris, 'baris OPS-4 tak ditemukan').toBeTruthy();
    React.act(() => { (baris as HTMLTableRowElement).click(); });
    expect(stage.logged).toHaveLength(1);
    expect(stage.logged[0]).toMatchObject({ who: 'Dimas Raharjo', action: 'RECON_TOGGLE' });
    expect((stage.logged[0] as { detail: string }).detail).toContain('OPS-4');
    /* Nama seed TIDAK boleh muncul sebagai pelaku. */
    const seedName = String((AMS.USER as { name?: string }).name || '');
    expect(seedName).toBeTruthy();
    expect((stage.logged[0] as { who: string }).who).not.toBe(seedName);
  });

  it('tanpa identitas sesi, pencocokan TIDAK dicatat atas nama siapa pun', () => {
    stage.sessionName = '';
    mount();
    openTab('Rekonsiliasi Bank');
    const baris = Array.from(document.querySelectorAll('tbody tr'))
      .find((tr) => (tr.textContent || '').includes('Jasa giro (bunga)'));
    React.act(() => { (baris as HTMLTableRowElement).click(); });
    expect(stage.logged).toEqual([]);
  });
});
