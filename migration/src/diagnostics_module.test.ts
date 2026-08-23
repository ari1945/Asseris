/* ============================================================
   Diagnostik Forensik & Pajak — GERBANG PERILAKU (prompt 72-diagnostic)
   ------------------------------------------------------------
   Gerbang SUMBER ada di diagnostics_conventions.test.ts. Berkas ini menguji
   yang tak dapat dilihat dari sumber: apa yang terjadi pada catatan keputusan
   tanpa identitas, apakah stempelnya benar-benar mengikuti klok perikatan,
   apakah dua perikatan berbeda menghasilkan temuan berbeda, dan apakah detektor
   yang tak menerima masukan dapat dibedakan dari detektor yang bersih.

   MESIN diagnostics.ts TIDAK DISENTUH — diagnostics.test.ts tetap gerbangnya.
   ============================================================ */
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { AMS } from './data';
import { WTB_BY_ENGAGEMENT } from './data_wtb_eng';
import { amsDiagnostics } from './diagnostics';
import type { DiagFinding } from './diagnostics';
import {
  diagDecisionRecord, diagDecisionStamp, diagDecisionTrail, diagStampBertanggal,
} from './diagnostics_decision';
import type { DiagDecision } from './diagnostics_decision';
import {
  DIAG_DETECTORS, detectorStatuses, detectorSummary, engagementDiagInputs,
} from './diagnostics_inputs';
import type { DiagAvailability } from './diagnostics_inputs';
import { diagnosticExportModel } from './diagnostics_export';

const TODAY_ASLI = String(AMS.TODAY);
const setToday = (iso: string): void => { (AMS as { TODAY: string }).TODAY = iso; };

beforeEach(() => setToday(TODAY_ASLI));
afterAll(() => setToday(TODAY_ASLI));

const TEMUAN = { id: 'benford', title: 'Distribusi digit-awal menyimpang dari hukum Benford' };

/* ============================================================
   (a) Keputusan tanpa identitas sesi TIDAK tersimpan.
   ============================================================ */
describe('D1a — tanpa identitas sesi, keputusan tidak dicatat', () => {
  const stempel = '09 Mar 2026, 14.22';

  it('nama sesi kosong → null (bukan dicatat atas nama siapa pun)', () => {
    expect(diagDecisionRecord({ sessionName: '', when: stempel, verdict: 'follow' })).toBeNull();
    expect(diagDecisionRecord({ sessionName: '   ', when: stempel, verdict: 'follow' })).toBeNull();
    expect(diagDecisionRecord({ sessionName: undefined, when: stempel, verdict: 'follow' })).toBeNull();
    expect(diagDecisionRecord({ sessionName: null, when: stempel, verdict: 'follow' })).toBeNull();
  });

  it('identitas sesi ada → catatan bernama, dan namanya milik SESI', () => {
    const rec = diagDecisionRecord({
      sessionName: 'Budi Santoso', sessionRole: 'Partner', when: stempel, verdict: 'follow',
    });
    expect(rec).not.toBeNull();
    expect(rec!.who).toBe('Budi Santoso');
    expect(rec!.role).toBe('Partner');
  });

  it('jejak audit ikut hilang bila catatannya null — tak ada jejak yatim', () => {
    expect(diagDecisionTrail(TEMUAN, null)).toBeNull();
    const rec = diagDecisionRecord({ sessionName: 'Budi Santoso', when: stempel, verdict: 'follow' });
    const trail = diagDecisionTrail(TEMUAN, rec);
    expect(trail).not.toBeNull();
    expect(trail!.who).toBe('Budi Santoso');
    expect(trail!.what).toContain(stempel);
  });

  it('"abaikan" tanpa alasan tidak tersimpan — pertimbangan tanpa pertimbangan', () => {
    expect(diagDecisionRecord({ sessionName: 'Budi Santoso', when: stempel, verdict: 'dismiss', reason: '  ' })).toBeNull();
    expect(diagDecisionRecord({ sessionName: 'Budi Santoso', when: stempel, verdict: 'dismiss', reason: 'temuan sudah ditangani AJE-07' })).not.toBeNull();
  });

  it('verdict tak dikenal ditolak', () => {
    expect(diagDecisionRecord({ sessionName: 'Budi Santoso', when: stempel, verdict: 'maybe' })).toBeNull();
  });
});

/* ============================================================
   (c) Stempel memuat TANGGAL dan mengikuti klok SSOT.
   ============================================================ */
describe('D1c — stempel keputusan bertanggal dan mengikuti klok SSOT', () => {
  it('bentuk lama ("14:23", jam-menit saja) DITOLAK sebagai stempel', () => {
    expect(diagStampBertanggal('14:23')).toBe(false);
    expect(diagStampBertanggal('')).toBe(false);
    expect(diagDecisionRecord({ sessionName: 'Budi Santoso', when: '14:23', verdict: 'follow' })).toBeNull();
  });

  it('majukan AMS.TODAY → stempel ikut maju', () => {
    setToday('2026-03-09');
    const a = diagDecisionStamp();
    setToday('2026-04-17');
    const b = diagDecisionStamp();
    expect(a.startsWith('09 Mar 2026')).toBe(true);
    expect(b.startsWith('17 Apr 2026')).toBe(true);
    expect(a).not.toBe(b);
  });

  it('stempel dari klok SSOT diterima catatan keputusan', () => {
    setToday('2026-03-09');
    const rec = diagDecisionRecord({
      sessionName: 'Budi Santoso', when: diagDecisionStamp(), verdict: 'follow',
    });
    expect(rec).not.toBeNull();
    expect(rec!.when).toContain('2026');
    expect(rec!.when).toContain('Mar');
  });
});

/* ============================================================
   (d) Data perikatan yang dikirim ke mesin MENGUBAH temuan.
   ============================================================ */
describe('D2 — mesin menerima data perikatan, bukan bawaan ilustratif', () => {
  const ctxFor = (engId: string) =>
    engagementDiagInputs({ wtb: WTB_BY_ENGAGEMENT[engId], aje: [], crossChecksRan: false }).ctx;

  it('populasi jurnal ilustratif TIDAK menyelinap masuk lewat bawaan mesin', () => {
    const { ctx } = engagementDiagInputs({ wtb: WTB_BY_ENGAGEMENT['ENG-2025-040'], aje: [] });
    expect(Array.isArray(ctx.journalPop)).toBe(true);
    expect(ctx.journalPop!.length).toBe(0);
    const f = amsDiagnostics(ctx);
    /* jet-concentration & rpt-exposure HANYA lahir dari populasi jurnal. */
    expect(f.map((x: DiagFinding) => x.id)).not.toContain('jet-concentration');
    expect(f.map((x: DiagFinding) => x.id)).not.toContain('rpt-exposure');
  });

  it('dua perikatan berbeda TIDAK menghasilkan temuan yang identik', () => {
    const a = amsDiagnostics(ctxFor('ENG-2025-040'));
    const b = amsDiagnostics(ctxFor('ENG-2025-063'));
    const sidik = (f: DiagFinding[]) => f.map((x) => x.id + '|' + x.sev + '|' + x.detail).join('\n');
    expect(sidik(a)).not.toBe(sidik(b));
  });

  it('mengubah AJE perikatan mengubah temuan', () => {
    const wtb = WTB_BY_ENGAGEMENT['ENG-2025-040'];
    const kosong = amsDiagnostics(engagementDiagInputs({ wtb, aje: [] }).ctx);
    const berisi = amsDiagnostics(engagementDiagInputs({
      wtb,
      aje: [{ id: 'AJE-99', status: 'Posted', amount: 9_100_000, dr: '5-5100', cr: '1-1210' }],
    }).ctx);
    expect(JSON.stringify(kosong)).not.toBe(JSON.stringify(berisi));
  });

  it('neraca saldo kosong → figur & rekonsiliasi dinyatakan TIDAK tersedia', () => {
    const { availability } = engagementDiagInputs({ wtb: [], aje: [] });
    expect(availability.fig).toBe(false);
    expect(availability.reconcileRows).toBe(false);
  });

  it('neraca saldo perikatan → figur tersedia', () => {
    const { availability } = engagementDiagInputs({ wtb: WTB_BY_ENGAGEMENT['ENG-2025-040'], aje: [] });
    expect(availability.fig).toBe(true);
  });
});

/* ============================================================
   (e) Detektor bisu ≠ detektor bersih.
   ============================================================ */
describe('D3 — tiga keadaan detektor dapat dibedakan', () => {
  const semua: DiagAvailability = {
    journalPop: true, aje: true, fig: true, reconcileRows: true, crossChecks: true,
  };

  it('registri mencakup setiap label detektor yang benar-benar diterbitkan mesin', () => {
    const ctx = engagementDiagInputs({ wtb: WTB_BY_ENGAGEMENT['ENG-2025-040'], aje: [] }).ctx;
    const terbit = new Set(amsDiagnostics(ctx).map((f: DiagFinding) => f.detector));
    const terdaftar = new Set(DIAG_DETECTORS.map((d) => d.id));
    const luput = [...terbit].filter((d) => !terdaftar.has(String(d)));
    expect(luput, 'detektor tak terdaftar: ' + luput.join(', ')).toEqual([]);
  });

  it('tanpa masukan → "tidak dapat berjalan", BUKAN nol temuan', () => {
    const tanpaPop: DiagAvailability = { ...semua, journalPop: false };
    const st = detectorStatuses(tanpaPop, []);
    const jet = st.find((d) => d.id === 'jet')!;
    expect(jet.state).toBe('unavailable');
    expect(jet.count).toBe(0);
    expect(jet.missing).toEqual(['journalPop']);
    expect(jet.reason.length).toBeGreaterThan(20);
  });

  it('berjalan & bersih dan tidak dapat berjalan adalah dua keadaan BERBEDA', () => {
    const bersih = detectorStatuses(semua, []).find((d) => d.id === 'jet')!;
    const bisu = detectorStatuses({ ...semua, journalPop: false }, []).find((d) => d.id === 'jet')!;
    expect(bersih.state).toBe('clean');
    expect(bisu.state).toBe('unavailable');
    expect(bersih.count).toBe(bisu.count);   // keduanya nol — angka saja tak membedakan
    expect(bersih.state).not.toBe(bisu.state);
  });

  it('berjalan & menemukan dihitung per detektor', () => {
    const st = detectorStatuses(semua, [{ detector: 'reconcile' }, { detector: 'reconcile' }]);
    const rec = st.find((d) => d.id === 'reconcile')!;
    expect(rec.state).toBe('found');
    expect(rec.count).toBe(2);
  });

  it('mode "any" — Benford tetap berjalan bila hanya AJE yang ada', () => {
    const st = detectorStatuses({ ...semua, journalPop: false }, []);
    expect(st.find((d) => d.id === 'benford')!.state).toBe('clean');
    const st2 = detectorStatuses({ ...semua, journalPop: false, aje: false }, []);
    expect(st2.find((d) => d.id === 'benford')!.state).toBe('unavailable');
  });

  it('ringkasan memisahkan "berjalan" dari "menghasilkan temuan"', () => {
    const st = detectorStatuses({ ...semua, journalPop: false }, [{ detector: 'reconcile' }]);
    const s = detectorSummary(st);
    expect(s.total).toBe(DIAG_DETECTORS.length);
    expect(s.unavailable).toBe(2);          // jet + forensic
    expect(s.found).toBe(1);                // reconcile
    expect(s.ran).toBe(s.found + s.clean);
    expect(s.ran + s.unavailable).toBe(s.total);
  });
});

/* ============================================================
   (f) Payload ekspor memuat pelaku & tanggal setiap keputusan.
   ============================================================ */
describe('D5 — kertas kerja diagnostik dapat dikeluarkan, lengkap atribusinya', () => {
  const findings = [
    { id: 'benford-insufficient', detector: 'benford', sev: 'low', std: 'SA 240 ¶32', title: 'Populasi terlalu kecil untuk uji Benford', detail: 'Hanya 7 nilai valid.', modules: ['jet'] },
    { id: 'bt-etr', detector: 'bookTax', sev: 'med', std: 'PSAK 46 ¶81', title: 'ETR menyimpang', detail: 'ETR 31%.', modules: ['psak46'] },
  ];
  const rec = (verdict: 'follow' | 'dismiss', reason?: string): DiagDecision =>
    diagDecisionRecord({ sessionName: 'Budi Santoso', sessionRole: 'Partner', when: '09 Mar 2026, 14.22', verdict, reason })!;
  const detectors = detectorStatuses(
    { journalPop: false, aje: true, fig: true, reconcileRows: true, crossChecks: true },
    findings,
  );

  const model = () => diagnosticExportModel({
    findings,
    decisions: { 'bt-etr': rec('dismiss', 'sudah dijelaskan di rekonsiliasi tarif efektif') },
    detectors,
    firmName: 'KAP Contoh & Rekan',
    engagementId: 'ENG-2025-040',
    engagementLabel: 'PT Mandiri Sejahtera Finance',
    preparedOn: '09 Mar 2026',
    preparedBy: 'Budi Santoso',
  });

  it('setiap keputusan yang ada membawa pelaku, peran, dan tanggal di payload', () => {
    const m = model();
    const sheet = m.sheets.find((s) => s.name === 'Temuan')!;
    const iPelaku = sheet.columns.indexOf('Pelaku');
    const iTanggal = sheet.columns.indexOf('Tanggal');
    const baris = sheet.rows.find((r) => r[0] === 'bt-etr')!;
    expect(baris[iPelaku]).toBe('Budi Santoso');
    expect(baris[iTanggal]).toBe('09 Mar 2026, 14.22');
    expect(baris[sheet.columns.indexOf('Peran')]).toBe('Partner');
    expect(baris[sheet.columns.indexOf('Keputusan')]).toBe('Diabaikan');
  });

  it('temuan yang belum diputuskan tidak dikarang keputusannya', () => {
    const sheet = model().sheets.find((s) => s.name === 'Temuan')!;
    const baris = sheet.rows.find((r) => r[0] === 'benford-insufficient')!;
    expect(baris[sheet.columns.indexOf('Keputusan')]).toBe('Belum diputuskan');
    expect(baris[sheet.columns.indexOf('Pelaku')]).toBe('');
    expect(baris[sheet.columns.indexOf('Tanggal')]).toBe('');
  });

  it('keputusan tanpa pelaku/tanggal MENOLAK disegel', () => {
    expect(() => diagnosticExportModel({
      findings, detectors, firmName: 'KAP Contoh & Rekan', preparedOn: '09 Mar 2026',
      decisions: { 'bt-etr': { verdict: 'follow', who: '', role: '', when: '', reason: '' } },
    })).toThrow(/pelaku\/tanggal/);
  });

  it('nama firma kosong MENOLAK disegel (bukan diganti literal)', () => {
    expect(() => diagnosticExportModel({
      findings, detectors, decisions: {}, firmName: '', preparedOn: '09 Mar 2026',
    })).toThrow(/nama firma kosong/);
  });

  it('keadaan detektor ikut tersegel — nol temuan tak dapat dibaca "tidak diperiksa"', () => {
    const m = model();
    const sheet = m.sheets.find((s) => s.name === 'Detektor')!;
    expect(sheet.rows.length).toBe(DIAG_DETECTORS.length);
    const jet = sheet.rows.find((r) => r[0] === 'jet')!;
    expect(jet[sheet.columns.indexOf('Keadaan')]).toBe('tidak dapat berjalan');
    expect(m.meta.join(' ')).toMatch(/TIDAK DAPAT BERJALAN/);
  });

  it('segel ber-scope perikatan', () => {
    const m = model();
    expect(m.scope).toBe('engagement');
    expect(m.scopeId).toBe('ENG-2025-040');
  });
});
