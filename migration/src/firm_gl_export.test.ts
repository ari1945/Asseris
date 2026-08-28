/* ============================================================
   Firm GL — gerbang status rekonsiliasi & ekspor (PRD firm-erp §11 Q-2).

   Yang wajib dibuktikan di sini BUKAN keadaan hijaunya, melainkan bahwa gerbangnya
   BISA MERAH: pada seed hari ini keempat akun kontrol berstatus `bridged` (residual
   nol), jadi uji yang hanya menjalankan seed akan hijau selamanya tanpa pernah
   menyentuh jalur pemblokiran. Karena itu tiap uji pemblokiran lebih dulu MEMBUKTIKAN
   premisnya — `status === 'open'` benar-benar tercapai — baru menguji akibatnya.

   Ambang tidak pernah disebut di berkas ini. Statusnya datang dari
   `FIRMFIN.reconciliations()` (RECON_TOLERANCE tunggal, data_firmfin.ts:26).
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { AMS } from './data';
import { fmt } from './data_base';
import { FIRMFIN } from './data_firmfin';
import { seedReconLines } from './use_bank_recon';
import { currentBalances, statements, trialBalance } from './firm_ledger';
import type { CoaAccount, GlJournal } from './firm_ledger';
import type { ReconRow, XlsxSheet } from './firm_gl_export';
import { buildJournalExport, buildStatementsExport, buildTrialBalanceExport, statementExportGate } from './firm_gl_export';

const coaSeed = AMS.FIRM_COA as unknown as CoaAccount[];
const seedGl = AMS.FIRM_GL as unknown as GlJournal[];

/** COA dengan saldo TURUNAN jurnal terposting — persis yang dipakai layar (useFirmCoa). */
const derive = (gl: GlJournal[]): CoaAccount[] => {
  const bal = currentBalances(coaSeed, seedGl, gl);
  return coaSeed.map((a) => ({ ...a, bal: bal[a.code] }));
};

const reconOf = (gl: GlJournal[]): ReconRow[] => FIRMFIN.reconciliations({
  engagements: AMS.ENGAGEMENTS, clients: AMS.CLIENTS,
  coa: derive(gl), reconLines: seedReconLines(),
}) as ReconRow[];

const rowOf = (rows: ReconRow[], key: string): ReconRow => {
  const r = rows.find((x) => x.key === key);
  if (!r) throw new Error('baris rekonsiliasi tak ditemukan: ' + key);
  return r;
};

const sheetOf = (sheets: XlsxSheet[], name: string): XlsxSheet => {
  const s = sheets.find((x) => x.name === name);
  if (!s) throw new Error('lembar tak ditemukan: ' + name);
  return s;
};

const cellOf = (sheet: XlsxSheet, label: string): string => {
  const r = sheet.rows.find((x) => x[0] === label);
  if (!r) throw new Error('baris lembar tak ditemukan: ' + label);
  return r[1];
};

const jv = (over: Partial<GlJournal>): GlJournal => ({
  id: 'JV-UJI', date: AMS.TODAY as string, desc: 'uji', dr: '1-101', cr: '4-100',
  amount: 0, posted: true, ...over,
});

const statementsExport = (gl: GlJournal[]) => {
  const posted = gl.filter((j) => j.posted);
  return buildStatementsExport({
    coa: derive(gl),
    balances: currentBalances(coaSeed, seedGl, gl),
    st: statements(coaSeed, seedGl, gl),
    recon: reconOf(gl),
    postedCount: posted.length,
    fmt,
  });
};

/* ------------------------------------------------------------------
   (a) Rekonsiliasi TIDAK menutup → tidak ada berkas, dan alasannya menyebut
       jembatan mana serta besar selisihnya.
   ------------------------------------------------------------------ */
describe('Q-2 — ekspor Laporan Keuangan diblokir saat rekonsiliasi tak menutup', () => {
  /* Menggeser kontrol GL 1-200 sebesar Rp 2 M tanpa menyentuh sub-buku faktur:
     selisih kontrol-vs-sub-buku melonjak sementara komponen jembatan bernama tetap,
     sehingga sisa tak dijelaskan siapa pun → 'open'. */
  const glOpen = [jv({ id: 'JV-UJI-AR', dr: '1-200', cr: '4-100', amount: 2e9, desc: 'uji: menggeser kontrol piutang' }), ...seedGl];

  it('PREMIS — keadaan MERAH benar-benar tercapai (baris AR berstatus open)', () => {
    const ar = rowOf(reconOf(glOpen), 'ar');
    expect(ar.status).toBe('open');
    expect(Math.abs(ar.residual)).toBeGreaterThan(0);
  });

  it('tidak ada model ekspor yang dihasilkan — pemblokiran, bukan flag', () => {
    const res = statementsExport(glOpen);
    expect(res.blocked).toBe(true);
    expect(res.model).toBe(null);
  });

  it('alasannya menyebut jembatan MANA dan berapa selisihnya', () => {
    const ar = rowOf(reconOf(glOpen), 'ar');
    const res = statementsExport(glOpen);
    expect(res.reason).toContain('Piutang Usaha');
    expect(res.reason).toContain('1-200');
    /* Angkanya, bukan sekadar kata "selisih" — dan angka itu berasal dari mesin. */
    expect(res.reason).toContain(fmt(Math.abs(ar.residual) / 1e6, 0));
    expect(res.reason).toContain(fmt(Math.abs(ar.recon) / 1e6, 0));
  });

  it('gerbang membaca status mesin, tidak menghitung ambang sendiri', () => {
    const rows = reconOf(glOpen);
    const gate = statementExportGate(rows, fmt);
    expect(gate.openRows.map((r) => r.key)).toEqual(rows.filter((r) => r.status === 'open').map((r) => r.key));
    /* Cakupan diturunkan dari barisnya — bukan daftar kode yang diketik tangan. */
    expect(gate.coveredCodes).toEqual(rows.map((r) => r.glCode));
  });

  it('gerbang kosong tidak memblokir apa pun (tak ada ambang kedua yang tersembunyi)', () => {
    expect(statementExportGate([], fmt).blocked).toBe(false);
  });

  /* Bukan skenario karangan: satu jurnal beban yang dibayar dari kas — aksi paling
     lumrah di modul ini — sudah cukup membuat kontrol kas menyimpang dari sub-buku
     bank. Gerbangnya karena itu memang menyala pada pemakaian normal, bukan hanya
     pada input yang dipaksakan. */
  it('membayar beban dari kas mengunci ekspor LK (baris Kas menjadi open)', () => {
    const glKas = [jv({ id: 'JV-UJI-KAS', dr: '5-200', cr: '1-101', amount: 500e6, desc: 'uji: beban dibayar dari kas' }), ...seedGl];
    const kas = rowOf(reconOf(glKas), 'cash');
    expect(kas.status).toBe('open');
    const res = statementsExport(glKas);
    expect(res.model).toBe(null);
    expect(res.reason).toContain('Kas & Bank');
  });
});

/* ------------------------------------------------------------------
   (b) Rekonsiliasi menutup → payload = angka `statements()`, bukan salinan.
   ------------------------------------------------------------------ */
describe('ekspor Laporan Keuangan — angkanya SAMA dengan yang dirender', () => {
  it('PREMIS — pada seed hari ini tak ada akun kontrol berstatus open', () => {
    expect(reconOf(seedGl).filter((r) => r.status === 'open')).toEqual([]);
  });

  it('Laba Rugi & Neraca mengambil angka dari statements()', () => {
    const st = statements(coaSeed, seedGl, seedGl);
    const res = statementsExport(seedGl);
    expect(res.blocked).toBe(false);
    if (!res.model) throw new Error('model ekspor kosong padahal rekonsiliasi menutup');
    const pl = sheetOf(res.model.sheets, 'Laba Rugi');
    const bs = sheetOf(res.model.sheets, 'Neraca');
    expect(cellOf(pl, 'Pendapatan Jasa')).toBe(fmt(st.revenue / 1e6, 0));
    expect(cellOf(pl, 'Total Beban Usaha')).toBe(fmt(st.expense / 1e6, 0));
    expect(cellOf(pl, 'LABA OPERASI')).toBe(fmt(st.netProfit / 1e6, 0));
    expect(cellOf(bs, 'TOTAL ASET')).toBe(fmt(st.totAset / 1e6, 0));
    expect(cellOf(bs, 'Total Liabilitas')).toBe(fmt(st.totLiab / 1e6, 0));
    expect(cellOf(bs, 'Total Ekuitas')).toBe(fmt(st.totEkuitas / 1e6, 0));
  });

  /* Kalau angkanya salinan beku, memposting jurnal tak akan menggesernya.
     Jurnalnya sengaja TIDAK menyentuh akun kontrol (kas 1-101…1-106, 1-200, 1-300,
     2-100): membayar beban dari kas menggeser kontrol kas tanpa menggeser sub-buku
     bank, sehingga baris Kas menjadi `open` dan ekspornya justru terkunci — perilaku
     yang benar, tapi bukan yang sedang diuji di sini. */
  it('memposting jurnal MENGGESER angka ekspor, dan tetap sama dengan statements()', () => {
    const extra = jv({ id: 'JV-UJI-BEBAN', dr: '5-200', cr: '2-300', amount: 500e6, desc: 'uji: beban akrual tambahan' });
    const glPlus = [extra, ...seedGl];
    const before = statementsExport(seedGl);
    const after = statementsExport(glPlus);
    if (!before.model || !after.model) throw new Error('model ekspor kosong padahal rekonsiliasi menutup');
    const labaBefore = cellOf(sheetOf(before.model.sheets, 'Laba Rugi'), 'LABA OPERASI');
    const labaAfter = cellOf(sheetOf(after.model.sheets, 'Laba Rugi'), 'LABA OPERASI');
    expect(labaAfter).not.toBe(labaBefore);
    expect(labaAfter).toBe(fmt(statements(coaSeed, seedGl, glPlus).netProfit / 1e6, 0));
  });

  it('payload tersegel membawa status rekonsiliasi — dan NOL identitas', () => {
    const res = statementsExport(seedGl);
    if (!res.model) throw new Error('model ekspor kosong padahal rekonsiliasi menutup');
    const rk = sheetOf(res.model.sheets, 'Rekonsiliasi');
    expect(rk.rows.length).toBe(reconOf(seedGl).length);
    expect(rk.rows.map((r) => r[0])).toEqual(reconOf(seedGl).map((r) => r.glCode));
    /* F-2 — identitas tidak lagi lewat model. `scope` tetap ada (ia menentukan
       DARI MANA eksporter menarik identitas), tetapi `firm` dan `scopeId` harus
       absen: itulah yang dulu memungkinkan `scopeId:'default'` meloloskan artefak
       tanpa benar-benar tersegel. */
    expect(res.model.scope).toBe('firm');
    expect((res.model as { firm?: unknown }).firm).toBe(undefined);
    expect((res.model as { scopeId?: unknown }).scopeId).toBe(undefined);
  });
});

/* ------------------------------------------------------------------
   (c) Neraca Saldo yang diekspor seimbang — atas jurnal terposting.
   ------------------------------------------------------------------ */
describe('ekspor Neraca Saldo — seimbang atas jurnal terposting', () => {
  const tbExport = (gl: GlJournal[]) => {
    const tb = trialBalance(coaSeed, seedGl, gl);
    const res = buildTrialBalanceExport({
      rows: tb.rows, totalDr: tb.totalDr, totalCr: tb.totalCr, balanced: tb.balanced,
      recon: reconOf(gl),
      postedCount: gl.filter((j) => j.posted).length, fmt,
    });
    if (!res.model) throw new Error('model Neraca Saldo kosong: ' + res.reason);
    return { tb, model: res.model };
  };

  it('total debit = total kredit pada seed', () => {
    const { tb, model } = tbExport(seedGl);
    const totals = sheetOf(model.sheets, 'Neraca Saldo').totals || [];
    expect(totals[3]).toBe(fmt(tb.totalDr / 1e6, 0));
    expect(totals[4]).toBe(fmt(tb.totalCr / 1e6, 0));
    expect(totals[3]).toBe(totals[4]);
  });

  it('tetap seimbang setelah jurnal double-entry baru diposting', () => {
    /* `2-100` adalah akun kontrol AP: memakainya di sini akan MENGUNCI ekspor
       (perilaku Q-2 yang benar sejak pemblokiran diperluas), bukan menguji
       keseimbangan. Dipakai pasangan non-kontrol. */
    const glPlus = [jv({ id: 'JV-UJI-TB', dr: '5-300', cr: '2-300', amount: 750e6, desc: 'uji: jurnal seimbang' }), ...seedGl];
    const { tb, model } = tbExport(glPlus);
    const totals = sheetOf(model.sheets, 'Neraca Saldo').totals || [];
    expect(tb.balanced).toBe(true);
    expect(totals[3]).toBe(totals[4]);
    /* Barisnya diturunkan dari neraca saldo, bukan dari tabel yang sudah dirender. */
    expect(sheetOf(model.sheets, 'Neraca Saldo').rows.length).toBe(tb.rows.length);
  });

  it('ketidakseimbangan DINYATAKAN, tidak dihaluskan', () => {
    /* Jurnal timpang tak mungkin dibuat lewat UI (satu dr, satu cr), jadi
       ketidakseimbangan disimulasikan lewat COA — yang diuji adalah bahwa
       pembawa pesannya jujur, bukan bahwa ia mustahil. */
    const tb = trialBalance(coaSeed, seedGl, seedGl);
    const res = buildTrialBalanceExport({
      rows: tb.rows, totalDr: tb.totalDr, totalCr: tb.totalCr + 5e9, balanced: false,
      recon: reconOf(seedGl), postedCount: 0, fmt,
    });
    if (!res.model) throw new Error('model Neraca Saldo kosong: ' + res.reason);
    expect(res.model.meta.some((m) => m.includes('TIDAK SEIMBANG'))).toBe(true);
    expect((sheetOf(res.model.sheets, 'Neraca Saldo').totals || [])[1]).toBe('TIDAK SEIMBANG');
  });
});

/* ------------------------------------------------------------------
   Q-2 diperluas (keputusan Ari 2026-08-22): Neraca Saldo tersegel membawa
   saldo akun kontrol yang SAMA dengan yang dinyatakan tak menutup — kalau ia
   tetap boleh keluar, seorang reviewer dapat memakainya sebagai kertas kerja
   dan melewati peringatan yang hanya hidup di tab Laporan Keuangan.
   Jurnal Umum & Buku Besar TETAP bebas: keduanya jejak transaksi, bukan
   pernyataan posisi.
   ------------------------------------------------------------------ */
describe('Q-2 — ekspor Neraca Saldo juga diblokir saat rekonsiliasi tak menutup', () => {
  const glOpen = [jv({ id: 'JV-UJI-AR2', dr: '1-200', cr: '4-100', amount: 2e9, desc: 'uji: menggeser kontrol piutang' }), ...seedGl];

  const tbResult = (gl: GlJournal[]) => {
    const tb = trialBalance(coaSeed, seedGl, gl);
    return buildTrialBalanceExport({
      rows: tb.rows, totalDr: tb.totalDr, totalCr: tb.totalCr, balanced: tb.balanced,
      recon: reconOf(gl), postedCount: gl.filter((j) => j.posted).length,
      fmt,
    });
  };

  it('PREMIS — keadaan MERAH tercapai', () => {
    expect(rowOf(reconOf(glOpen), 'ar').status).toBe('open');
  });

  it('tidak ada model Neraca Saldo yang dihasilkan', () => {
    const res = tbResult(glOpen);
    expect(res.blocked).toBe(true);
    expect(res.model).toBe(null);
  });

  it('alasannya menyebut ARTEFAK yang dikunci, jembatannya, dan selisihnya', () => {
    const ar = rowOf(reconOf(glOpen), 'ar');
    const res = tbResult(glOpen);
    expect(res.reason).toContain('Neraca Saldo');
    expect(res.reason).toContain('Piutang Usaha');
    expect(res.reason).toContain('1-200');
    expect(res.reason).toContain(fmt(Math.abs(ar.residual) / 1e6, 0));
  });

  it('rekonsiliasi menutup → Neraca Saldo keluar seperti biasa', () => {
    const res = tbResult(seedGl);
    expect(res.blocked).toBe(false);
    expect(res.model).not.toBe(null);
  });

  it('Jurnal Umum TIDAK terikat Q-2 — tetap terbit saat rekonsiliasi terbuka', () => {
    const m = buildJournalExport({ gl: glOpen, acctName: (c) => c, fmt });
    expect(m.sheets.length).toBe(1);
    expect(sheetOf(m.sheets, 'Jurnal Umum').rows.length).toBe(glOpen.length);
  });
});
