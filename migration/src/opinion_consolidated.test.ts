/* ============================================================
   SA 600 PR-3a — laporan audit menyebut LK KONSOLIDASIAN.

   Ditemukan 2026-07-27 saat memutuskan populasi ENG-2025-014: laporan
   yang benar-benar diterbitkan sistem berbunyi "laporan keuangan
   {client} (Perusahaan)" — kata "konsolidasian" NOL kemunculan di
   view_opinion maupun fsgen_model. Padahal entitasnya Tbk yang
   mengendalikan empat entitas anak, dan `GROUP_CONTROL` menyimpulkan
   keempatnya "Dikonsolidasi" (PSAK 65).

   Artinya sistem menerbitkan opini STANDALONE atas entitas yang wajib
   mempublikasikan laporan keuangan konsolidasian. Itu bukan angka yang
   meleset — itu opini atas laporan yang salah.

   Uji ini memaku perbaikannya agar tak kembali diam-diam.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { OPINION_PARA_O as OPINION_PARA, OP_TXT as OP_TEXT } from './view_opinion';

const CLIENT = 'PT Sentosa Makmur Tbk';
const TYPES = ['unmodified', 'qualified', 'adverse', 'disclaimer'] as const;

describe('SA 600 PR-3a — laporan audit atas LK konsolidasian', () => {
  it('paragraf opini keempat jenis menyebut "konsolidasian"', () => {
    TYPES.forEach(t => {
      const para = OPINION_PARA(t, 'Basis untuk Opini', CLIENT);
      expect(para).toMatch(/konsolidasian/);
    });
  });

  /* Frasa pengenal laporan konsolidasian menurut praktik SA 700 di Indonesia:
     entitas anak disebut, dan entitas pelapor dinamai "Grup" — bukan "Perusahaan". */
  it('paragraf pendahuluan menyebut entitas anak dan menamai pelapor "Grup"', () => {
    const intro = OP_TEXT.intro(CLIENT);
    expect(intro).toMatch(/laporan keuangan konsolidasian/);
    expect(intro).toMatch(/entitas anaknya/);
    expect(intro).toMatch(/Grup/);
  });

  /* Regresi yang dijaga: sebutan "Perusahaan" adalah penanda laporan
     STANDALONE. Ia tak boleh muncul lagi di prosa laporan. */
  it('prosa laporan tidak lagi menamai pelapor "Perusahaan"', () => {
    const prosa = [
      OP_TEXT.intro(CLIENT),
      OP_TEXT.basisStd(false),
      OP_TEXT.gc,
      ...TYPES.map(t => OPINION_PARA(t, 'Basis untuk Opini', CLIENT)),
    ].join(' | ');
    expect(prosa).not.toMatch(/Perusahaan/);
  });

  it('independensi dinyatakan terhadap Grup', () => {
    expect(OP_TEXT.basisStd(false)).toMatch(/independen terhadap Grup/);
  });
});
