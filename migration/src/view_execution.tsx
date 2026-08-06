/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAudit, useAuth, useFirm, useNav, useInitialTab, useMateriality, useAmsPersist } from './contexts';
import { CAP } from './rbac';
/* PR-E — pilihan klasifikasi jurnal ditarik dari sumbernya masing-masing.
   CATATAN LINGKAR: `view_aje` mengimpor `AJEForm` dari berkas ini, jadi
   `view_aje` TIDAK boleh diimpor balik ke sini. `kind` karenanya menjadi
   pilihan eksplisit auditor — yang juga sesuai doktrin PR-D: `kind` adalah
   klasifikasi auditor, bukan turunan baris jurnal. */
import { SAD_SEED } from './view_sad';
import { ASSERTIONS } from './canon_assertions';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, LockBanner, Overlay, Panel, Seg, Stat } from './ui';
import { TrendBars, WtbAnalytical, WtbGrouping, WtbKpiBand, computeWtbSummary, DEFAULT_EXPL, LeadChip, LEAD_SRC_TITLE } from './view_wtb_deep';
import { noteOf, statusOf, fluxStatusKind, FLUX_STATUS_LABEL } from './flux_state';
import { amsExportXlsx } from './export_xlsx';
import { parseTrialBalance, computeCoverage, UNIT_LABEL, leadFromCode } from './wtb_import';
import type { ParseResult, WtbIssue, CoverageEngine, ImportedWtbRow, TbUnit } from './wtb_import';
import { diffWtb, summarizeImport, pushHistory, rawExcerptOf } from './wtb_provenance';
import { isTieException, tieOutPriorYear, tieStatusFor, TIE_LABEL } from './prior_year';
import type { TieResult, TieRow, TieStatus } from './prior_year';
import type { ImportDiff, ImportProvenance } from './wtb_provenance';
import { sha256Hex } from './export_xlsx';
import { checkWtbIntegrity } from './wtb_integrity';
/* PR-5 — kelayakan pengajuan jurnal adalah aturan, bukan ekspresi di komponen. */
import { validateAjeDraft } from './aje_contract';
import type { WtbIntegrityResult, IntegrityMessage, AjeMismatch, UnclassifiedRow } from './wtb_integrity';
import { STANDARD_COA, autoMap, mappingCoverage } from './wtb_mapping';
import type { CoaAccount, MappingCoverageResult } from './wtb_mapping';
import { parseLedger, ledgerForRow } from './wtb_ledger';
import type { LedgerParseResult, LedgerLine, LedgerTieOut } from './wtb_ledger';

/* ============================================================
   Asseris — Working Trial Balance (WTB) + AJE
   ============================================================ */
const { useState: useStateX, useMemo: useMemoX } = React;

/* PRD Fase A — badan overlay yang MENGISI tinggi panel (bukan menggulir sendiri).
   Drawer WTB di berkas ini berisi tata letak dua-panel dengan anak `flex:1`;
   `.ov-body` default adalah blok ber-overflow, sehingga `flex:1` anak itu akan
   mati dan textarea runtuh ke minHeight-nya. Menjadikan .ov-body flex-column
   mempertahankan geometri lama persis. */
const OV_FILL: Record<string, string | number> = { display: 'flex', flexDirection: 'column', overflow: 'hidden' };

/** Empat kolom saldo WTB yang dijumlahkan di tfoot (PR-1b). */
interface WtbTotals { ly: number; unadj: number; aje: number; adj: number }


const WTB_TABS = [
  { id: 'tb', label: 'Neraca Saldo' },
  { id: 'review', label: 'Analisis Pergerakan' },
  { id: 'group', label: 'Pemetaan FS' },
];

function WTBView() {
  const { fmt, rp } = AMS;
  const { wtb, ajeTotalPosted, wtbImport, aje, fluxState, fluxThreshold, priorYearBalances } = useAudit();
  /* PR-2c — WTB tak pernah membaca `locked` padahal AJE di berkas yang sama melakukannya:
     di dalam jendela perakitan SA 230 ¶A21, TB perikatan terarsip bisa diimpor ulang tanpa
     banner & tanpa tombol nonaktif; setelah 60 hari server menolak dengan FORBIDDEN mentah
     tanpa penjelasan UI. */
  const { activeEngagement, activeClient, locked } = useFirm();
  const nav = useNav();
  /* deep-link tab (PRD 2026-07-18): `nav('wtb', { tab: 'review' })` dari SA 520 membuka
     langsung Telaah Pergerakan; tanpa deep-link perilaku lama (tab 'tb'). */
  const [tab, setTab] = useInitialTab('wtb', 'tb');
  const [showAdj, setShowAdj] = useStateX(true);
  const [q, setQ] = useStateX('');
  const [collapsed, setCollapsed] = useStateX({});
  const [drill, setDrill] = useStateX(null);
  const [exporting, setExporting] = useStateX(false);
  const [importOpen, setImportOpen] = useStateX(false);
  const [mapOpen, setMapOpen] = useStateX(false);
  const [ledgerOpen, setLedgerOpen] = useStateX(false);
  const [pyOpen, setPyOpen] = useStateX(false);   // PR-4c — sumber saldo audited TA-1
  const [showIntegrity, setShowIntegrity] = useStateX(false);
  const integrity: WtbIntegrityResult = useMemoX(() => checkWtbIntegrity(wtb, aje), [wtb, aje]);

  /* PR-1b — PM dari SSOT materialitas (SA 320), bukan hardcode `materiality * 0.75`.
     Kini menghormati pmPct + override "Terapkan ke Engagement" dari Materiality Workspace,
     jadi perubahan di sana mengalir serempak ke bendera per-baris, KPI "Akun > PM", ambang
     default fluktuasi, DAN header XLSX tersegel. `null` = materialitas perikatan belum
     ditetapkan → kriteria berbasis PM dinonaktifkan (dulu: NaN yang menyamar sebagai angka). */
  /* PR-6b — satu pintu `useMateriality()` (ter-hidrasi server & reaktif). */
  const pm: number | null = useMateriality().pmFull;

  // W10.5 Fase 2 — sealed XLSX register: the full Working Trial Balance, full-rupiah via rp()
  // (SSOT = the same wtb rows the table renders). Δ YoY mirrors the on-screen adjusted-vs-LY view.
  const onExportXlsx = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const rows = wtb.map((r: any) => {
        const yoy = r.ly !== 0 ? ((r.adj - r.ly) / Math.abs(r.ly)) * 100 : 0;
        /* Kolom "Sumber WP" — kertas kerja tersegel tak boleh menyajikan tebakan mesin
           sebagai penetapan auditor. Baris bawaan pemetaan CoA baku ditandai "Pemetaan CoA". */
        const leadSrc = !r.lead ? '' : r.leadSrc === 'guess' ? 'Tebakan sistem' : r.leadSrc === 'auditor' ? 'Auditor' : 'Pemetaan CoA';
        return [r.code, r.name, r.group, r.lead, leadSrc, rp(r.ly), rp(r.unadj), r.aje ? rp(r.aje) : '—', rp(r.adj), fmt(yoy, 1) + '%'];
      });
      const t = wtb.reduce((a: any, r: any) => ({ ly: a.ly + r.ly, unadj: a.unadj + r.unadj, aje: a.aje + r.aje, adj: a.adj + r.adj }), { ly: 0, unadj: 0, aje: 0, adj: 0 });
      await amsExportXlsx({
        kind: 'wtb-register', scope: 'engagement', scopeId: activeEngagement?.id,
        fileName: `Working Trial Balance - ${activeClient?.name || 'Klien'}.xlsx`,
        firm: 'KAP Wijaya Hartono & Rekan',
        title: `Working Trial Balance — ${activeClient?.name || ''}`,
        meta: [`${activeEngagement?.id || ''} · ${activeEngagement?.fy || 'FY2025'} · ${activeEngagement?.standard || 'SAK'}`,
          `Performance materiality: ${pm != null ? rp(pm) : 'belum ditetapkan'} · saldo penuh dalam Rupiah (setelah penyesuaian audit)`],
        sheets: [{
          name: 'Neraca Saldo Kerja',
          columns: ['Kode', 'Nama Akun', 'Grup FS', 'WP', 'Sumber WP', 'TA Lalu', 'Unadjusted', 'AJE', 'Adjusted', 'Δ YoY'],
          rows,
          totals: ['', 'TOTAL', '', '', '', rp(t.ly), rp(t.unadj), rp(t.aje), rp(t.adj), ''],
          colWidths: [12, 34, 18, 8, 15, 20, 20, 18, 20, 10],
        }],
      });
    } finally {
      setExporting(false);
    }
  };
  /* PR-1b — impor ESM langsung (dulu `window.computeWtbSummary?.()`, sisa era buildless:
     bila global belum terpasang hasilnya `undefined` → WtbKpiBand crash di summary.neracaDiff). */
  /* PR-3a — KPI band memakai ambang BERSAMA yang sama dengan tab & modul `analytical`;
     sebelumnya ia diam-diam memakai default 20%/PM sehingga penyebut "x / y" di KPI
     berbeda dari daftar di bawahnya begitu auditor menggeser ambang. */
  const summary = useMemoX(
    () => computeWtbSummary(wtb, pm, {
      absThr: (fluxThreshold && fluxThreshold.absJt != null) ? fluxThreshold.absJt * 1e6 : pm,
      pctThr: (fluxThreshold && typeof fluxThreshold.pctThr === 'number') ? fluxThreshold.pctThr : 20,
    }, fluxState),
    [wtb, pm, fluxState, fluxThreshold],
  );

  // group rows
  const shown = useMemoX(
    () => wtb.filter((r: any) => q === '' || r.name.toLowerCase().includes(q.toLowerCase()) || r.code.includes(q)),
    [wtb, q],
  );
  const groups = useMemoX(() => {
    const order: any[] = [];
    const map = {};
    shown.forEach((r: any) => {
      if (!(map as any)[r.group]) { (map as any)[r.group] = []; order.push(r.group); }
      (map as any)[r.group].push(r);
    });
    return order.map(g => ({ name: g, rows: (map as any)[g] }));
  }, [shown]);

  /* PR-1b — total mengikuti baris yang TAMPIL. Dulu tfoot selalu menjumlah `wtb` penuh
     sementara barisnya terfilter `q`, sehingga tangkapan layar/cetak sebagai bukti audit
     memperlihatkan total yang tak menjumlahkan apa pun di atasnya. Saat filter aktif,
     total keseluruhan tetap ditampilkan berdampingan agar konteksnya tak hilang. */
  const sumRows = (rows: WtbTotals[]): WtbTotals => rows.reduce(
    (t: WtbTotals, r: WtbTotals) => ({ ly: t.ly + r.ly, unadj: t.unadj + r.unadj, aje: t.aje + r.aje, adj: t.adj + r.adj }),
    { ly: 0, unadj: 0, aje: 0, adj: 0 },
  );
  const totals = useMemoX(() => sumRows(shown), [shown]);
  /* PR-6d — `WtbRow` mendeklarasikan field angka sebagai OPSIONAL (kanon menoleransi baris tak lengkap), sementara `sumRows` menuntutnya ada. Cast dipertahankan eksplisit di batas ini alih-alih melonggarkan tipe kanon. */
  const totalsAll = useMemoX(() => sumRows(wtb as unknown as WtbTotals[]), [wtb]);
  const filtered = shown.length !== wtb.length;

  const num = (n: any) => <span className={n < 0 ? 'neg' : ''}>{fmt(n / 1e6, 1)}</span>;

  return (
    <>
      <SubBar moduleId="wtb" right={
        <div className="row gap8 ac">
          <span className="tiny muted mono">{pm != null ? `PM: Rp ${fmt(pm / 1e6, 0)} jt` : 'PM belum ditetapkan'}</span>
          <Btn sm onClick={onExportXlsx} disabled={exporting}><I.download size={13} /> {exporting ? 'Menyiapkan…' : 'Export XLSX'}</Btn>
          {wtbImport && wtbImport.rows && <Btn sm onClick={() => !locked && setMapOpen(true)} disabled={locked} title={locked ? 'Berkas terarsip — pemetaan terkunci (SA 230 ¶A21)' : 'Petakan bagan akun klien ke CoA standar'}><I.target size={13} /> Petakan Akun</Btn>}
          <Btn sm onClick={() => !locked && setPyOpen(true)} disabled={locked} title={locked ? 'Berkas terarsip — terkunci' : 'Sumber saldo audited TA-1 (SA 510) untuk menelusuri saldo awal'}><I.layers size={13} /> Saldo TA-1</Btn>
          <Btn sm onClick={() => !locked && setLedgerOpen(true)} disabled={locked} title={locked ? 'Berkas terarsip — impor terkunci (SA 230 ¶A21)' : 'Impor buku besar (GL) untuk detail sub-ledger nyata'}><I.table size={13} /> Impor GL</Btn>
          <Btn sm variant="primary" onClick={() => !locked && setImportOpen(true)} disabled={locked} style={{ opacity: locked ? .5 : 1 }} title={locked ? 'Berkas terarsip — impor TB terkunci (SA 230 ¶A21)' : undefined}><I.upload size={14} /> Impor TB</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad">
          {locked && <LockBanner />}
          <WtbKpiBand summary={summary} pm={pm} onGotoReview={() => setTab('review')} />
          <div className="tabs" style={{ marginBottom: 12 }}>
            {WTB_TABS.map(t => <button key={t.id} className={'tab ' + (tab === t.id ? 'on' : '')} onClick={() => setTab(t.id)}>{t.label}{t.id === 'review' && summary.followup ? <span className="badge b-amber" style={{ marginLeft: 7, padding: '0 6px' }}>{summary.followup}</span> : null}</button>)}
          </div>
          {tab === 'review' && <WtbAnalytical pm={pm} onOpenAccount={(r: any) => setDrill(r)} />}
          {tab === 'group' && <WtbGrouping pm={pm} />}
          {tab === 'tb' && (<>
          {/* toolbar */}
          <div className="row ac jb" style={{ marginBottom: 10 }}>
            <div className="row ac gap8">
              <div className="global-search" style={{ background: 'var(--surface)', border: '1px solid var(--line)', height: 28, maxWidth: 240 }}>
                <I.search2 size={14} style={{ color: 'var(--ink-4)' }} />
                <input style={{ color: 'var(--ink)' }} placeholder="Cari akun / kode…" value={q} onChange={(e: any) => setQ(e.target.value)} />
              </div>
              {/* PR-I1 — warna & label dari `hasWarn`, BUKAN dari `status`. `status` menjawab
                  "boleh finalisasi"; chip menjawab "ada yang perlu dilihat". Memakai `status`
                  membuat chip hijau berdampingan dengan peringatan di panel yang dibukanya. */}
              <button className="chip" onClick={() => setShowIntegrity((s: boolean) => !s)} title="Integritas neraca saldo — footing, rekonsiliasi neraca & AJE (SA 330/500)"
                style={{ cursor: 'pointer', border: '1px solid var(--line)', background: !integrity.hasWarn ? 'var(--green-bg)' : 'var(--amber-bg)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: !integrity.hasWarn ? 'var(--green)' : 'var(--amber)' }} />
                {!integrity.hasWarn ? 'Integritas OK' : 'Perlu perhatian'}
                <I.chevDown size={11} style={{ transform: showIntegrity ? 'rotate(180deg)' : 'none' }} />
              </button>
            </div>
            <div className="row ac gap8">
              <span className="tiny muted">Tampilkan kolom:</span>
              <Seg options={[{ value: true, label: 'Dgn AJE' }, { value: false, label: 'Unadjusted' }]} value={showAdj} onChange={setShowAdj} />
            </div>
          </div>

          {showIntegrity && <WtbIntegrityPanel r={integrity} onOpenMapping={(wtbImport && wtbImport.rows && !locked) ? () => setMapOpen(true) : null} />}

          <Panel noBody style={{ overflow: 'hidden' }}>
            <div style={{ maxHeight: 'calc(100vh - 306px)', overflow: 'auto' }}>
              <table className="dtbl">
                <thead>
                  <tr>
                    <th style={{ width: 88 }}>Kode</th>
                    <th>Nama Akun</th>
                    <th style={{ width: 40 }}>WP</th>
                    <th className="num" style={{ width: 120 }}>TA Lalu (Rp jt)</th>
                    <th className="num" style={{ width: 120 }}>Unadjusted</th>
                    <th className="num" style={{ width: 110 }}>AJE</th>
                    {showAdj && <th className="num" style={{ width: 120 }}>Adjusted</th>}
                    <th className="num" style={{ width: 90 }}>Δ YoY</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g: any) => {
                    const gt = g.rows.reduce((a: any, r: any) => ({ ly: a.ly + r.ly, unadj: a.unadj + r.unadj, aje: a.aje + r.aje, adj: a.adj + r.adj }), { ly: 0, unadj: 0, aje: 0, adj: 0 });
                    const isCol = collapsed[g.name];
                    return (
                      <React.Fragment key={g.name}>
                        <tr className="group-row" onClick={() => setCollapsed((c: any) => ({ ...c, [g.name]: !c[g.name] }))} style={{ cursor: 'pointer' }}>
                          <td colSpan={3}><span className="row ac gap6"><I.chevDown size={12} style={{ transform: isCol ? 'rotate(-90deg)' : 'none' }} />{g.name}</span></td>
                          <td className="num">{num(gt.ly)}</td>
                          <td className="num">{num(gt.unadj)}</td>
                          <td className="num">{gt.aje ? num(gt.aje) : '—'}</td>
                          {showAdj && <td className="num">{num(gt.adj)}</td>}
                          <td className="num"></td>
                        </tr>
                        {!isCol && g.rows.map((r: any) => {
                          const base = showAdj ? r.adj : r.unadj;
                          const yoy = r.ly !== 0 ? ((base - r.ly) / Math.abs(r.ly)) * 100 : 0;
                          const matFlag = pm != null && Math.abs(base) > pm;
                          return (
                            <tr key={r.key} onClick={() => setDrill(r)} style={{ cursor: 'pointer' }}>
                              <td className="mono tiny muted">{r.code}</td>
                              <td>
                                <span className="row ac gap6">
                                  {r.name}
                                  {matFlag && <span title="Melebihi performance materiality" style={{ color: 'var(--red)' }}><I.flag size={12} /></span>}
                                </span>
                              </td>
                              <td><LeadChip lead={r.lead} src={r.leadSrc} /></td>
                              {/* PR-4c — "TA Lalu" bukan lagi klaim tak berdasar: bila ada sumber
                                  audited TA-1, baris yang tak tertelusur ditandai (SA 510 ¶6). */}
                              <td className="num muted">
                                <span className="row ac gap5" style={{ justifyContent: 'flex-end' }}>
                                  {(() => {
                                    /* Hanya PENGECUALIAN sungguhan yang ditandai. Akun laba-rugi &
                                       akun bersaldo awal nol tak punya saldo awal untuk ditelusuri —
                                       menandainya membuat 21 dari 22 penanda jadi derau dan
                                       mengubur satu-satunya selisih nyata. */
                                    const ts = tieStatusFor(r, priorYearBalances);
                                    if (!isTieException(ts)) return null;
                                    return <span title={TIE_LABEL[ts]} style={{ color: ts === 'missing' ? 'var(--purple)' : 'var(--amber)' }}><I.alert size={11} /></span>;
                                  })()}
                                  {num(r.ly)}
                                </span>
                              </td>
                              <td className="num">{num(r.unadj)}</td>
                              <td className="num">{r.aje ? <span style={{ color: 'var(--blue)', fontWeight: 600 }}>{num(r.aje)}</span> : <span className="muted">—</span>}</td>
                              {showAdj && <td className="num" style={{ fontWeight: 600 }}>{num(r.adj)}</td>}
                              <td className="num tiny" style={{ color: Math.abs(yoy) > 20 ? 'var(--amber)' : 'var(--ink-3)' }}>{yoy > 0 ? '+' : ''}{yoy.toFixed(0)}%</td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  {/* PR-1b — label lama "TOTAL (harus = 0, balanced)" menyatakan invarian yang
                      SALAH: TB pra-tutup yang benar ber-Σ adjusted = −laba berjalan, dan panel
                      Integritas di atas justru menjelaskan itu sebagai normal. Verdikt ada di
                      sana, bukan di label footer. */}
                  <tr>
                    <td colSpan={3}>{filtered ? `TOTAL TERFILTER — ${shown.length} dari ${wtb.length} akun` : `TOTAL — ${wtb.length} akun`}</td>
                    <td className="num">{num(totals.ly)}</td>
                    <td className="num">{num(totals.unadj)}</td>
                    <td className="num">{num(totals.aje)}</td>
                    {showAdj && <td className="num">{num(totals.adj)}</td>}
                    <td className="num"></td>
                  </tr>
                  {filtered && (
                    <tr>
                      <td colSpan={3} className="muted">TOTAL SELURUH AKUN</td>
                      <td className="num muted">{num(totalsAll.ly)}</td>
                      <td className="num muted">{num(totalsAll.unadj)}</td>
                      <td className="num muted">{num(totalsAll.aje)}</td>
                      {showAdj && <td className="num muted">{num(totalsAll.adj)}</td>}
                      <td className="num"></td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          </Panel>
          <div className="row gap8 tiny muted" style={{ marginTop: 8 }}>
            <span className="row ac gap6"><I.flag size={12} style={{ color: 'var(--red)' }} /> Saldo melebihi performance materiality</span>
            <span>·</span>
            <span>Nilai dalam jutaan Rupiah</span>
            <span>·</span>
            <span>Σ adjusted = 0 hanya untuk TB pra-tutup yang seimbang; selisih sebesar laba berjalan adalah normal — verdiktnya di panel Integritas</span>
            <span>·</span>
            {wtbImport && wtbImport.rows ? (
              <span className="row ac gap5">
                <I.upload size={11} style={{ color: 'var(--blue)' }} />
                Sumber: impor {wtbImport.meta?.source || 'paste-csv'} · {wtbImport.importedAt ? new Date(wtbImport.importedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '—'} ·
                {wtbImport.meta?.balanced ? <span style={{ color: 'var(--green)' }}> control total seimbang ✓</span> : <span style={{ color: 'var(--red)' }}> selisih control total</span>}
              </span>
            ) : (
              <span className="row ac gap5">Data seed demo — belum ada impor TB klien (klik <b style={{ margin: '0 3px' }}>Impor TB</b>)</span>
            )}
          </div>
          </>)}
        </div>
      </div>
      {drill && <WtbDrill row={drill} onClose={() => setDrill(null)} nav={nav} />}
      {importOpen && <WtbImportDrawer onClose={() => setImportOpen(false)} />}
      {mapOpen && <WtbMappingDrawer onClose={() => setMapOpen(false)} />}
      {ledgerOpen && <WtbLedgerDrawer onClose={() => setLedgerOpen(false)} />}
      {pyOpen && <WtbPriorYearDrawer onClose={() => setPyOpen(false)} />}
    </>
  );
}

/* ---------------- W-WTB·4 · Drawer impor buku besar (GL) ---------------- */
const SAMPLE_GL = [
  'Kode\tTanggal\tUraian\tDokumen\tJumlah',
  '1-1100\t2025-12-03\tSetoran tunai penjualan\tBKM-001\t12.500.300.000',
  '1-1100\t2025-12-15\tPembayaran ke pemasok\tBKK-044\t-6.400.000.000',
  '1-1100\t2025-12-28\tPenerimaan piutang\tBKM-090\t15.805.000.000',
  '1-1200\t2025-12-10\tPenjualan kredit PT Ritel Maju\tINV-2207\t30.000.000.000',
  '1-1200\t2025-12-22\tPelunasan sebagian\tBKM-091\t-21.322.400.000',
].join('\n');

function WtbLedgerDrawer({ onClose }: { onClose: () => void }) {
  const { fmt } = AMS;
  const { setWtbLedger, wtbLedger, wtb } = useAudit();
  const { locked } = useFirm();
  const auth = useAuth();
  const canImport = (!auth || typeof auth.can !== 'function' || auth.can(CAP.WP_EDIT)) && !locked; // PR-2c
  const hasLedger = !!(wtbLedger && Object.keys(wtbLedger).length);
  const clearLedger = () => { if (!canImport) return; setWtbLedger({}); onClose(); };
  const [text, setText] = useStateX('');
  const parsed: LedgerParseResult | null = useMemoX(() => (text.trim() ? parseLedger(text) : null), [text]);
  const errors = parsed ? parsed.issues.filter(i => i.level === 'error') : [];
  const m = (v: number) => fmt(v / 1e6, 1);

  // tie-out ringkas: cocokkan kode GL ke saldo unadj WTB (sadar srcCodes W-WTB·3)
  const tie = useMemoX(() => {
    if (!parsed) return null;
    const target: Record<string, number> = {};
    (wtb || []).forEach((r: { code: string; unadj?: number; srcCodes?: string[] }) => {
      const codes = (r.srcCodes && r.srcCodes.length) ? r.srcCodes : [r.code];
      codes.forEach((c: string) => { target[c] = r.unadj || 0; });
    });
    let tied = 0, untied = 0, unmatched = 0;
    for (const code of Object.keys(parsed.byCode)) {
      const total = parsed.byCode[code].reduce((s, l) => s + l.amount, 0);
      if (target[code] == null) { unmatched++; continue; }
      if (Math.abs(total - target[code]) <= 1000) tied++; else untied++;
    }
    return { tied, untied, unmatched };
  }, [parsed, wtb]);

  const apply = () => { if (!parsed || !parsed.ok || !canImport) return; setWtbLedger(parsed.byCode); onClose(); };

  return (
    <Overlay
      variant="modal"
      size="xl"
      onClose={onClose}
      isDirty={() => text.trim() !== ''}
      bodyStyle={OV_FILL}
      header={(
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, borderRadius: '4px 4px 0 0' }}>
          <span style={{ width: 38, height: 38, borderRadius: 9, background: 'rgba(255,255,255,.15)', display: 'grid', placeItems: 'center' }}><I.table size={18} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Impor Buku Besar (GL)</div>
            <div className="tiny" style={{ color: '#bcd6e4' }}>Detail transaksi per akun untuk drill sub-ledger nyata · kolom: Kode · Tanggal · Uraian · Dokumen · Jumlah (atau Debit/Kredit)</div>
          </div>
          {!canImport && <Badge kind="amber">Hanya-baca (butuh WP_EDIT)</Badge>}
          <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>
      )}
      footer={(
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="tiny muted">Disimpan per-perikatan. Drill akun akan menampilkan detail GL nyata + tie-out ke saldo.</span>
          <div className="row gap8">
            {hasLedger && <Btn sm onClick={clearLedger} disabled={!canImport} title="Hapus buku besar terimpor → drill kembali ke ilustrasi sintetik"><I.trash size={13} /> Hapus GL terimpor</Btn>}
            <Btn sm onClick={onClose}>Batal</Btn>
            <Btn sm variant="primary" onClick={apply} disabled={!parsed || !parsed.ok || !canImport}><I.check size={14} /> Terapkan GL</Btn>
          </div>
        </div>
      )}
    >
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 0, flex: 1, minHeight: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--line)', minHeight: 0 }}>
            <div className="row ac jb" style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)' }}>
              <span className="tiny upper" style={{ fontWeight: 700, color: 'var(--ink-3)' }}>1 · Tempel buku besar</span>
              <div className="row gap6">
                <button className="btn sm" onClick={() => setText(SAMPLE_GL)}><I.table size={12} /> Muat contoh</button>
                <button className="btn sm ghost" onClick={() => setText('')} disabled={!text}><I.x size={12} /> Kosongkan</button>
              </div>
            </div>
            <textarea value={text} onChange={(e: { target: { value: string } }) => setText(e.target.value)} spellCheck={false}
              placeholder={'Tempel ekspor buku besar di sini…\n\nSatu baris = satu transaksi. Jumlah bertanda: Debit (+), Kredit (−).\nΣ baris per akun harus = saldo unadjusted akun tsb (tie-out).'}
              style={{ flex: 1, minHeight: 280, border: 'none', outline: 'none', padding: '10px 12px', fontSize: 12, fontFamily: 'var(--mono)', resize: 'none', color: 'var(--ink)', lineHeight: 1.5 }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto' }}>
            <div className="row ac jb" style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)' }}>
              <span className="tiny upper" style={{ fontWeight: 700, color: 'var(--ink-3)' }}>2 · Pratinjau & tie-out</span>
              {parsed && <Badge kind={parsed.ok ? 'green' : 'red'}>{parsed.ok ? 'Siap diterapkan' : errors.length + ' error'}</Badge>}
            </div>
            <div style={{ padding: 12, flex: 1 }}>
              {!parsed && <div className="tiny muted" style={{ padding: '24px 0', textAlign: 'center' }}>Tempel buku besar atau klik “Muat contoh”.</div>}
              {parsed && (<>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 10 }}>
                  <div className="panel" style={{ padding: '7px 10px', boxShadow: 'none', background: 'var(--surface-2)' }}>
                    <div className="tiny muted upper">Baris GL</div><div className="mono" style={{ fontWeight: 700 }}>{parsed.lineCount}</div>
                  </div>
                  <div className="panel" style={{ padding: '7px 10px', boxShadow: 'none', background: 'var(--surface-2)' }}>
                    <div className="tiny muted upper">Akun</div><div className="mono" style={{ fontWeight: 700 }}>{parsed.codeCount}</div>
                  </div>
                  <div className="panel" style={{ padding: '7px 10px', boxShadow: 'none', background: tie && tie.untied ? 'var(--amber-bg)' : 'var(--green-bg)' }}>
                    <div className="tiny muted upper">Tie-out</div>
                    <div className="mono" style={{ fontWeight: 700, color: tie && tie.untied ? 'var(--amber)' : 'var(--green)' }}>{tie ? `${tie.tied} cocok` : '—'}</div>
                  </div>
                </div>

                {errors.map((i, k) => (
                  <div key={'e' + k} className="row ac gap6 tiny" style={{ padding: '4px 8px', border: '1px solid var(--red)', borderRadius: 5, marginBottom: 4, color: 'var(--red)' }}>
                    <I.alert size={12} /> <span>{i.line ? `Baris ${i.line}: ` : ''}{i.message}</span>
                  </div>
                ))}
                {tie && (tie.untied > 0 || tie.unmatched > 0) && (
                  <div className="tiny muted" style={{ marginBottom: 8, lineHeight: 1.5 }}>
                    {tie.untied > 0 && <span style={{ color: 'var(--amber)' }}>{tie.untied} akun: Σ GL ≠ saldo unadjusted. </span>}
                    {tie.unmatched > 0 && <span>{tie.unmatched} akun GL tak ada di WTB. </span>}
                    Detail tetap dapat diimpor; tie-out per akun tampil di drill.
                  </div>
                )}

                <div style={{ border: '1px solid var(--line)', borderRadius: 6, overflow: 'auto', maxHeight: 280 }}>
                  <table className="dtbl">
                    <thead><tr><th>Kode</th><th className="num">Baris</th><th className="num">Σ GL</th></tr></thead>
                    <tbody>
                      {Object.keys(parsed.byCode).map((code: string) => {
                        const sum = parsed.byCode[code].reduce((s, l) => s + l.amount, 0);
                        return (
                          <tr key={code}>
                            <td className="mono tiny">{code}</td>
                            <td className="num muted">{parsed.byCode[code].length}</td>
                            <td className="num" style={{ fontWeight: 600 }}><span className={sum < 0 ? 'neg' : ''}>{m(sum)}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>)}
            </div>
          </div>
        </div>
    </Overlay>
  );
}

/* ---------------- PR-4c · Drawer sumber saldo audited TA-1 (SA 510) ---------------- */
function WtbPriorYearDrawer({ onClose }: { onClose: () => void }) {
  const { fmt } = AMS;
  const { wtb, priorYearBalances, setPriorYearBalances } = useAudit();
  const { activeEngagement, locked } = useFirm();
  const auth = useAuth();
  const canEdit = (!auth || typeof auth.can !== 'function' || auth.can(CAP.WP_EDIT)) && !locked;
  const [text, setText] = useStateX('');
  const [unitPY, setUnitPY]: [TbUnit, (v: TbUnit) => void] = useStateX('full');
  const [sourceName, setSourceName] = useStateX('');
  const [busy, setBusy] = useStateX(false);
  const m = (v: number) => fmt(v / 1e6, 1);

  /* Bentuknya sama dengan neraca saldo, jadi parser W-WTB·1 dipakai ulang: kolom saldo
     dibaca sebagai saldo AKHIR audited TA-1. Gerbang keseimbangan & skala ikut berlaku. */
  const parsed: ParseResult | null = useMemoX(
    /* requireBalanced:false — sumber TA-1 lazimnya EKSTRAK pos neraca dari LK audited,
       bukan neraca saldo utuh; menuntut Σ = 0 di sini akan menolak masukan yang sah. */
    () => (text.trim() ? parseTrialBalance(text, { unit: unitPY, engMateriality: activeEngagement?.materiality, requireBalanced: false }) : null),
    [text, unitPY, activeEngagement?.materiality],
  );
  const errors = parsed ? parsed.issues.filter(i => i.level === 'error') : [];

  const source = useMemoX(() => (parsed && parsed.ok
    ? { rows: parsed.rows.map((r: ImportedWtbRow) => ({ code: r.code, name: r.name, amount: r.adj })) }
    : null), [parsed]);
  const preview: TieResult | null = useMemoX(
    () => (source ? tieOutPriorYear(wtb || [], source) : null), [source, wtb]);
  const current: TieResult = useMemoX(() => tieOutPriorYear(wtb || [], priorYearBalances), [wtb, priorYearBalances]);

  const apply = async () => {
    if (!parsed || !parsed.ok || !canEdit || busy || !source) return;
    setBusy(true);
    try {
      let sha = '';
      try { sha = await sha256Hex(text); } catch (e) { /* konteks non-secure */ }
      setPriorYearBalances({
        rows: source.rows,
        provenance: summarizeImport({
          importedAt: new Date().toISOString(),
          user: auth && auth.user ? { id: auth.user.id, name: auth.user.name, role: auth.user.role } : null,
          unit: unitPY, unitFactor: parsed.meta.unitFactor,
          period: (activeEngagement?.fy || '').replace(/(\d{4})/, (y: string) => String(+y - 1)),
          /* Sumber TA-1 tak menyimpan teks mentah sama sekali, jadi tak ada `sha256Excerpt`:
             hash ini menutup teks penuh dan hanya dapat diverifikasi dengan menempel ulang. */
          sourceName, sha256: sha, rawLength: text.length,
          rowCount: parsed.meta.rowCount, totalAssets: parsed.meta.totalAssets, balanced: parsed.meta.balanced,
        }),
      });
      onClose();
    } finally { setBusy(false); }
  };

  const badge = (s: TieStatus) => (s === 'tied' ? 'green' : s === 'no-source' ? undefined : s === 'missing' ? 'purple' : 'amber');

  return (
    <Overlay
      variant="modal"
      size="xl"
      onClose={onClose}
      isDirty={() => text.trim() !== '' || sourceName.trim() !== ''}
      bodyStyle={OV_FILL}
      header={(
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, borderRadius: '4px 4px 0 0' }}>
          <span style={{ width: 38, height: 38, borderRadius: 9, background: 'rgba(255,255,255,.15)', display: 'grid', placeItems: 'center' }}><I.layers size={18} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Saldo Audited TA-1 (SA 510)</div>
            <div className="tiny" style={{ color: '#bcd6e4' }}>Sumber INDEPENDEN untuk menelusuri saldo awal — tanpa ini, kolom "TA Lalu" tak dapat diverifikasi terhadap apa pun</div>
          </div>
          {locked ? <Badge kind="amber">Terkunci</Badge> : !canEdit ? <Badge kind="amber">Hanya-baca</Badge> : null}
          <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>
      )}
      footer={(
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="tiny muted" style={{ maxWidth: 520 }}>Dipakai modul Saldo Awal (SA 510) sebagai pembanding INDEPENDEN, dan menandai kolom "TA Lalu" di WTB yang tak tertelusur.</span>
          <div className="row gap8">
            {current.hasSource && <Btn sm onClick={() => { if (canEdit) { setPriorYearBalances(null); onClose(); } }} disabled={!canEdit}><I.trash size={13} /> Hapus sumber</Btn>}
            <Btn sm onClick={onClose}>Batal</Btn>
            <Btn sm variant="primary" onClick={apply} disabled={!parsed || !parsed.ok || !canEdit || busy}><I.check size={14} /> {busy ? 'Menyimpan…' : 'Simpan sumber TA-1'}</Btn>
          </div>
        </div>
      )}
    >
        <div className="row ac gap12" style={{ padding: '9px 14px', borderBottom: '1px solid var(--line)', background: 'var(--surface-2)', flexWrap: 'wrap' }}>
          <div className="row ac gap6">
            <span className="tiny upper" style={{ fontWeight: 700, color: 'var(--ink-3)' }}>Satuan</span>
            <Seg options={[{ value: 'full', label: 'Rupiah penuh' }, { value: 'thousand', label: 'Ribuan' }, { value: 'million', label: 'Jutaan' }]} value={unitPY} onChange={setUnitPY} />
          </div>
          <div className="row ac gap6" style={{ flex: 1, minWidth: 200 }}>
            <span className="tiny upper" style={{ fontWeight: 700, color: 'var(--ink-3)' }}>Sumber</span>
            <input className="input" style={{ flex: 1, height: 26 }} value={sourceName} placeholder="mis. LK Audited 2024 — KAP Sutrisno (halaman 4)"
              onChange={(e: { target: { value: string } }) => setSourceName(e.target.value)} />
          </div>
          {current.hasSource && <Badge kind="green">Sumber tersimpan · {current.tied} cocok / {current.untied} selisih</Badge>}
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 0, flex: 1, minHeight: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--line)', minHeight: 0 }}>
            <div className="row ac jb" style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)' }}>
              <span className="tiny upper" style={{ fontWeight: 700, color: 'var(--ink-3)' }}>1 · Tempel saldo akhir audited TA-1</span>
              <button className="btn sm ghost" onClick={() => setText('')} disabled={!text}><I.x size={12} /> Kosongkan</button>
            </div>
            <textarea value={text} onChange={(e: { target: { value: string } }) => setText(e.target.value)} spellCheck={false}
              placeholder={'Kode\tNama\tSaldo\n1-1100\tKas\t18.420.500.000\n…\n\nDari LK audited TA-1 / kertas kerja auditor pendahulu.\nKonvensi tanda: Debit (+), Kredit (−).'}
              style={{ flex: 1, minHeight: 280, border: 'none', outline: 'none', padding: '10px 12px', fontSize: 12, fontFamily: 'var(--mono)', resize: 'none', color: 'var(--ink)', lineHeight: 1.5 }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto' }}>
            <div className="row ac jb" style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)' }}>
              <span className="tiny upper" style={{ fontWeight: 700, color: 'var(--ink-3)' }}>2 · Tie-out ke saldo awal TB berjalan</span>
              {parsed && <Badge kind={parsed.ok ? 'green' : 'red'}>{parsed.ok ? 'Siap' : errors.length + ' error'}</Badge>}
            </div>
            <div style={{ padding: 12, flex: 1 }}>
              {!parsed && !current.hasSource && <div className="tiny muted" style={{ padding: '24px 0', textAlign: 'center' }}>Belum ada sumber TA-1 — penelusuran saldo awal SA 510 tak dapat menyimpulkan apa pun.</div>}
              {errors.map((i: WtbIssue, k: number) => (
                <div key={'e' + k} className="row ac gap6 tiny" style={{ padding: '4px 8px', border: '1px solid var(--red)', borderRadius: 5, marginBottom: 4, color: 'var(--red)' }}>
                  <I.alert size={12} /> <span>{i.line ? `Baris ${i.line}: ` : ''}{i.message}</span>
                </div>
              ))}
              {(preview || (current.hasSource && !parsed)) && (() => {
                const t = preview || current;
                const shown = t.rows.filter((r: TieRow) => isTieException(r.status));
                return (<>
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 10 }}>
                    {[['Cocok', t.tied, 'var(--green)'], ['Selisih', t.untied, t.untied ? 'var(--amber)' : 'var(--ink-3)'],
                      ['Belum tertelusur', t.missing, t.missing ? 'var(--purple)' : 'var(--ink-3)'], ['Hilang dari TB', t.orphan, t.orphan ? 'var(--red)' : 'var(--ink-3)']].map(([l, v, c]) => (
                        <div key={String(l)} className="panel" style={{ padding: '7px 10px', boxShadow: 'none', background: 'var(--surface-2)' }}>
                          <div className="tiny muted upper">{String(l)}</div>
                          <div className="mono" style={{ fontWeight: 700, color: String(c) }}>{String(v)}</div>
                        </div>
                      ))}
                  </div>
                  <div className="tiny muted" style={{ marginBottom: 8, lineHeight: 1.45 }}>
                    Lingkup: pos neraca ({t.outOfScope} akun laba rugi & {t.nilOpening} akun bersaldo awal nol dikecualikan — tak punya saldo awal untuk ditelusuri).
                    {t.missing > 0 && <> Nilai belum tertelusur <b className="mono">{m(t.untracedTotal)}</b> jt.</>}
                  </div>
                  {shown.length === 0
                    ? <div className="row ac gap6 tiny" style={{ color: 'var(--green)', fontWeight: 600 }}><I.checkCircle size={14} /> Seluruh saldo awal dalam lingkup tertelusur ke TA-1 audited.</div>
                    : (
                      <div style={{ border: '1px solid var(--line)', borderRadius: 6, overflow: 'auto', maxHeight: 260 }}>
                        <table className="dtbl">
                          <thead><tr><th>Akun</th><th className="num">TA-1 audited</th><th className="num">Saldo awal</th><th className="num">Selisih</th><th style={{ width: 120 }}>Status</th></tr></thead>
                          <tbody>
                            {shown.slice(0, 30).map((r: TieRow) => (
                              <tr key={r.status + r.code}>
                                <td><div className="truncate" style={{ maxWidth: 140 }}>{r.name}</div><div className="mono tiny muted">{r.code}</div></td>
                                <td className="num muted">{r.priorClose != null ? m(r.priorClose) : '—'}</td>
                                <td className="num">{m(r.opening)}</td>
                                {/* "Selisih" hanya bermakna bila ada pembanding TA-1; untuk baris
                                    yang belum tertelusur, kolom ini kosong — bukan angka sebesar saldo. */}
                                <td className="num" style={{ fontWeight: 600, color: 'var(--amber)' }}>
                                  {r.priorClose == null && r.status === 'missing' ? <span className="muted">—</span> : <span className={r.diff < 0 ? 'neg' : ''}>{m(r.diff)}</span>}
                                </td>
                                <td><Badge kind={badge(r.status)}>{TIE_LABEL[r.status]}</Badge></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                </>);
              })()}
            </div>
          </div>
        </div>
    </Overlay>
  );
}

/* ---------------- W-WTB·3 · Drawer pemetaan bagan akun → CoA standar ---------------- */
function WtbMappingDrawer({ onClose }: { onClose: () => void }) {
  const { fmt } = AMS;
  const { wtbImport, wtbMapping, setWtbMapping, wtbLeads, setWtbLeads } = useAudit();
  const { locked } = useFirm();
  const auth = useAuth();
  const canMap = (!auth || typeof auth.can !== 'function' || auth.can(CAP.WP_EDIT)) && !locked; // PR-2c
  const [leadDraft, setLeadDraft] = useStateX(() => ({ ...(wtbLeads || {}) }));   // PR-4a
  const srcRows = (wtbImport && Array.isArray(wtbImport.rows)) ? wtbImport.rows : [];
  const [draft, setDraft] = useStateX(() => ({ ...(wtbMapping || {}) }));
  const cov: MappingCoverageResult = useMemoX(() => mappingCoverage(srcRows, draft), [srcRows, draft]);
  const m = (v: number) => fmt(v / 1e6, 1);
  const setOne = (code: string, target: string) => setDraft((d: Record<string, string>) => {
    const n = { ...d }; if (target) n[code] = target; else delete n[code]; return n;
  });
  const apply = () => {
    if (!canMap) return;
    setWtbMapping(draft);
    /* PR-4a — hanya lead yang benar-benar diketik yang disimpan; sel kosong = ikut
       tebakan heuristik/pemetaan, bukan lead kosong yang mengikat. */
    const leads: Record<string, string> = {};
    for (const code of Object.keys(leadDraft)) {
      const v = (leadDraft[code] || '').trim();
      if (v) leads[code] = v;
    }
    setWtbLeads(leads);
    onClose();
  };
  const hasMapping = !!(wtbMapping && Object.keys(wtbMapping).length);
  const clearMapping = () => { if (!canMap) return; setWtbMapping({}); setWtbLeads({}); onClose(); };

  // opsi select dikelompokkan per seksi FS
  const groups = [...new Set(STANDARD_COA.map((a: CoaAccount) => a.group))];
  const litCount = cov.psak.engines.filter(e => e.lit).length;

  return (
    <Overlay
      variant="modal"
      size="xl"
      onClose={onClose}
      isDirty={() => Object.keys(draft).length > 0 || Object.keys(leadDraft).length > 0}
      bodyStyle={OV_FILL}
      footer={(
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="tiny muted">Disimpan per-perikatan. Saat diterapkan, WTB di-relabel ke kode standar → canon/FSGEN/cakupan otomatis selaras.</span>
          <div className="row gap8">
            {hasMapping && <Btn sm onClick={clearMapping} disabled={!canMap} title="Hapus pemetaan tersimpan → WTB kembali ke kode klien"><I.trash size={13} /> Hapus pemetaan</Btn>}
            <Btn sm onClick={onClose}>Batal</Btn>
            <Btn sm variant="primary" onClick={apply} disabled={!canMap}><I.check size={14} /> Terapkan Pemetaan</Btn>
          </div>
        </div>
      )}
      header={(
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, borderRadius: '4px 4px 0 0' }}>
          <span style={{ width: 38, height: 38, borderRadius: 9, background: 'rgba(255,255,255,.15)', display: 'grid', placeItems: 'center' }}><I.target size={18} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Pemetaan Bagan Akun → CoA Standar</div>
            <div className="tiny" style={{ color: '#bcd6e4' }}>Petakan akun klien ke kode standar agar engine PSAK & FS Generator mengenalinya. Akun yang dipetakan ke kode sama digabung.</div>
          </div>
          {!canMap && <Badge kind="amber">Hanya-baca (butuh WP_EDIT)</Badge>}
          <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>
      )}
    >
        {/* coverage strip */}
        <div className="row ac jb" style={{ padding: '9px 14px', borderBottom: '1px solid var(--line)', gap: 12, flexWrap: 'wrap' }}>
          <div className="row ac gap14">
            <div><div className="mono" style={{ fontWeight: 700, fontSize: 15, color: cov.unmappedCodes.length ? 'var(--amber)' : 'var(--green)' }}>{cov.mappedCount}/{cov.total}</div><div className="tiny muted">akun dipetakan</div></div>
            <div><div className="mono" style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>{cov.fsLinesCovered}/{cov.fsLinesTotal}</div><div className="tiny muted">baris FS terisi</div></div>
            <div><div className="mono" style={{ fontWeight: 700, fontSize: 15, color: litCount === cov.psak.engines.length ? 'var(--green)' : 'var(--ink)' }}>{litCount}/{cov.psak.engines.length}</div><div className="tiny muted">engine PSAK menyala</div></div>
          </div>
          <div className="row gap6">
            <button className="btn sm" onClick={() => setDraft(autoMap(srcRows))} disabled={!canMap}><I.sync size={12} /> Saran otomatis</button>
            <button className="btn sm ghost" onClick={() => setDraft({})} disabled={!canMap}><I.x size={12} /> Kosongkan</button>
          </div>
        </div>

        <div style={{ overflow: 'auto', flex: 1 }}>
          <table className="dtbl">
            <thead><tr>
              <th>Akun Klien</th><th className="num" style={{ width: 120 }}>Unadjusted</th>
              <th style={{ width: 300 }}>Petakan ke (CoA standar)</th>
              <th style={{ width: 88 }} title="Lead schedule — tebakan dari kode akun, dapat ditimpa">Lead</th>
              <th style={{ width: 90 }}>Status</th>
            </tr></thead>
            <tbody>
              {srcRows.map((r: { code: string; name?: string; unadj?: number }) => {
                const target = draft[r.code] || '';
                const std = target ? STANDARD_COA.find((a: CoaAccount) => a.code === target) : null;
                return (
                  <tr key={r.code}>
                    <td><div style={{ fontWeight: 600 }}>{r.name || r.code}</div><div className="mono tiny muted">{r.code}</div></td>
                    <td className="num"><span className={(r.unadj || 0) < 0 ? 'neg' : ''}>{m(r.unadj || 0)}</span></td>
                    <td>
                      <select value={target} disabled={!canMap}
                        onChange={(e: { target: { value: string } }) => setOne(r.code, e.target.value)}
                        style={{ width: '100%', height: 28, border: '1px solid var(--line-strong)', borderRadius: 5, padding: '0 8px', fontSize: 12, fontFamily: 'var(--ui)', color: 'var(--ink)', background: 'var(--surface)' }}>
                        <option value="">— belum dipetakan —</option>
                        {groups.map((g: string) => (
                          <optgroup key={g} label={g}>
                            {STANDARD_COA.filter((a: CoaAccount) => a.group === g).map((a: CoaAccount) => (
                              <option key={a.code} value={a.code}>{a.code} · {a.label}{a.canonKey ? ' ◆' : ''}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </td>
                    {/* PR-4a — lead schedule: tebakan heuristik ditampilkan sebagai placeholder,
                        nilai yang diketik auditor mengikat (store `wtbLeads.v1`). */}
                    <td>
                      <input className="input mono" disabled={!canMap} maxLength={3}
                        style={{ width: 66, height: 26, textAlign: 'center', textTransform: 'uppercase' }}
                        value={leadDraft[r.code] != null ? leadDraft[r.code] : ''}
                        placeholder={(std && std.lead) || leadFromCode(r.code) || '—'}
                        onChange={(e: { target: { value: string } }) => setLeadDraft((d: Record<string, string>) => ({ ...d, [r.code]: e.target.value.toUpperCase() }))} />
                    </td>
                    <td>
                      {std
                        ? <Badge kind={std.canonKey ? 'blue' : 'green'}>{std.canonKey ? 'PSAK ◆' : 'Terpetakan'}</Badge>
                        : <Badge kind="amber">Belum</Badge>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="tiny muted" style={{ padding: '8px 14px' }}>◆ = akun pemicu engine PSAK (CKPN, imbalan kerja, aset tetap, sewa, pajak tangguhan, dst). Akun belum dipetakan tetap masuk total namun tak mengisi baris FS spesifik.</div>
        </div>
    </Overlay>
  );
}

/* ---------------- W-WTB·1 · Drawer Impor Neraca Saldo (paste/CSV) ---------------- */
/* PR-6c — SKALA CONTOH DINAIKKAN 10×. Nilai lama membuat total aset hanya ~8× OM,
   sehingga tombol "Muat contoh" bawaan SELALU memicu gerbang skala ingress (#130):
   "Total aset hanya 8.3× materialitas perikatan (lazimnya puluhan–ratusan kali) —
   periksa satuan penyajian." Data contoh yang menyalakan gerbang integritasnya sendiri
   mengajari pengguna baru bahwa peringatan itu boleh diabaikan — justru kebalikan dari
   tujuan gerbang. Kini total aset 275.000 jt ⇒ ~83× OM 3.319 jt, sebanding TB seed
   nyata (316.558 jt ⇒ ~95×), jadi contoh LULUS gerbangnya sendiri.
   Faktor 10 dipilih karena ia mempertahankan setiap invarian apa adanya: keseimbangan
   control total (Σ adjusted = 0) bersifat homogen terhadap skala, dan proporsi
   antar-pos — termasuk selisih kolom TA Lalu yang memang ada di contoh ini — tak
   bergeser sedikit pun. CATATAN: rasio ini dibagi dengan OM, jadi ia bergerak bila
   presedens materialitas berubah (PR-6·0 & PR-6b masing-masing menggesernya:
   4,0× → 6,5× → 8,3×). Bila OM berubah drastis lagi, kalibrasi ulang di sini. */
const SAMPLE_TB = [
  'Kode\tNama\tTA Lalu\tUnadjusted\tAJE',
  '1-1100\tKas dan Setara Kas\t45.000.000.000\t50.000.000.000\t0',
  '1-1200\tPiutang Usaha\t72.000.000.000\t80.000.000.000\t0',
  '1-1210\tCKPN Piutang\t-4.000.000.000\t-5.000.000.000\t0',
  '1-2100\tAset Tetap — Harga Perolehan\t180.000.000.000\t200.000.000.000\t0',
  '1-2110\tAkumulasi Penyusutan\t-50.000.000.000\t-60.000.000.000\t0',
  '1-2500\tAset Pajak Tangguhan\t9.000.000.000\t10.000.000.000\t0',
  '2-1100\tUtang Usaha\t-35.000.000.000\t-40.000.000.000\t0',
  '2-2300\tLiabilitas Imbalan Kerja\t-18.000.000.000\t-20.000.000.000\t0',
  '3-1100\tModal Saham\t-100.000.000.000\t-100.000.000.000\t0',
  '3-2100\tSaldo Laba\t-103.000.000.000\t-115.000.000.000\t0',
  '4-1100\tPenjualan Bersih\t-270.000.000.000\t-300.000.000.000\t0',
  '5-1100\tBeban Pokok Penjualan\t180.000.000.000\t200.000.000.000\t0',
  '5-3100\tBeban Umum & Administrasi\t40.000.000.000\t45.000.000.000\t0',
  '5-5100\tBeban Pajak Penghasilan\t50.000.000.000\t55.000.000.000\t0',
].join('\n');

function WtbImportDrawer({ onClose }: { onClose: () => void }) {
  const { fmt, rp } = AMS;
  const { setWtbImport, wtbImport, wtb } = useAudit();
  const { activeEngagement, locked } = useFirm();
  const auth = useAuth();
  const hasCap = !auth || typeof auth.can !== 'function' || auth.can(CAP.WP_EDIT);
  const canImport = hasCap && !locked;   // PR-2c — berkas terarsip tak boleh di-impor ulang
  const [text, setText] = useStateX('');
  /* PR-2a — satuan DIDEKLARASIKAN (uji keseimbangan invarian skala, jadi TB "dalam ribuan"
     lolos bersih sambil understated 1.000×). */
  /* anotasi di LHS, bukan type-arg: `useStateX` untyped (tanpa @types/react) */
  const [unit, setUnit]: [TbUnit, (v: TbUnit) => void] = useStateX('full');
  /* PR-2b — provenance: periode diturunkan dari FY perikatan (dapat diubah bila berbeda). */
  const [period, setPeriod] = useStateX(activeEngagement?.fy || '');
  const [sourceName, setSourceName] = useStateX('');
  const [confirming, setConfirming] = useStateX(false);
  const [busy, setBusy] = useStateX(false);
  const parsed: ParseResult | null = useMemoX(
    () => (text.trim() ? parseTrialBalance(text, { unit, engMateriality: activeEngagement?.materiality }) : null),
    [text, unit, activeEngagement?.materiality],
  );
  const errors = parsed ? parsed.issues.filter(i => i.level === 'error') : [];
  const warns = parsed ? parsed.issues.filter(i => i.level === 'warn') : [];
  const m = (v: number) => fmt(v / 1e6, 1);

  /* PR-2b — dampak penggantian: impor kedua dulu mengganti SELURUH TB tanpa diff dan tanpa
     konfirmasi, padahal setiap angka hilir ikut bergerak. */
  const diff: ImportDiff | null = useMemoX(() => {
    if (!parsed || !parsed.ok) return null;
    const before = computeCoverage(new Set<string>((wtb || []).map((r: { code: string }) => r.code)));
    return diffWtb(wtb || [], parsed.rows, { enginesBefore: before.engines, enginesAfter: parsed.coverage.engines });
  }, [parsed, wtb]);

  const history: ImportProvenance[] = (wtbImport && Array.isArray(wtbImport.history)) ? wtbImport.history : [];
  const storedExcerpt: string = (wtbImport && typeof wtbImport.rawExcerpt === 'string') ? wtbImport.rawExcerpt : '';
  const storedLength: number = (wtbImport && typeof wtbImport.rawLength === 'number') ? wtbImport.rawLength : 0;

  const apply = async () => {
    if (!parsed || !parsed.ok || !canImport || busy) return;
    if (diff && diff.hasChanges && !confirming) { setConfirming(true); return; }
    setBusy(true);
    try {
      /* Dua sidik jari dengan cakupan BERBEDA, dan keduanya dikatakan apa adanya:
         `sha` menutup teks penuh (diverifikasi dengan menempel ulang berkas sumber), sedangkan
         `shaExcerpt` menutup cuplikan yang benar-benar tersimpan (satu-satunya yang dapat
         dihitung ulang dari payload). Dulu hanya `sha` yang disimpan lalu ditampilkan di
         sebelah cuplikan — mengesankan cuplikan itulah yang di-hash. */
      const excerpt = rawExcerptOf(text);
      let sha = '', shaExcerpt = '';
      try { sha = await sha256Hex(text); } catch (e) { /* konteks non-secure: hash dilewati, bukan penghalang */ }
      try { shaExcerpt = await sha256Hex(excerpt); } catch (e) { /* idem */ }
      const prov = summarizeImport({
        importedAt: new Date().toISOString(),
        user: auth && auth.user ? { id: auth.user.id, name: auth.user.name, role: auth.user.role } : null,
        unit, unitFactor: parsed.meta.unitFactor, period, sourceName,
        sha256: sha, sha256Excerpt: shaExcerpt, rawLength: text.length, excerptLength: excerpt.length,
        rowCount: parsed.meta.rowCount, totalAssets: parsed.meta.totalAssets, balanced: parsed.meta.balanced,
      });
      setWtbImport({
        rows: parsed.rows, meta: parsed.meta, coverage: parsed.coverage,
        importedAt: prov.importedAt, source: 'paste-csv',
        provenance: prov,
        /* teks mentah ditahan (dibatasi) agar impor dapat ditelusuri ulang, bukan hanya
           hasil parse-nya — SA 500 keandalan sumber bukti. */
        rawExcerpt: excerpt,
        rawLength: text.length,
        history: pushHistory(history, prov),
      });
      onClose();
    } finally {
      setBusy(false);
    }
  };
  const revert = () => { if (!canImport) return; setWtbImport(null); onClose(); };

  return (
    <Overlay
      variant="modal"
      size="xl"
      onClose={onClose}
      isDirty={() => text.trim() !== '' || sourceName.trim() !== ''}
      bodyStyle={OV_FILL}
      header={(
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, borderRadius: '4px 4px 0 0' }}>
          <span style={{ width: 38, height: 38, borderRadius: 9, background: 'rgba(255,255,255,.15)', display: 'grid', placeItems: 'center' }}><I.upload size={18} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Impor Neraca Saldo Klien</div>
            <div className="tiny" style={{ color: '#bcd6e4' }}>Tempel dari Excel/CSV · tab/titik-koma/koma · kolom: Kode · Nama · TA Lalu · Unadjusted · AJE (atau Debit/Kredit)</div>
          </div>
          {locked ? <Badge kind="amber">Berkas terarsip — terkunci</Badge>
            : !hasCap ? <Badge kind="amber">Hanya-baca (butuh WP_EDIT)</Badge> : null}
          <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>
      )}
      footer={(
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="tiny muted" style={{ maxWidth: 520 }}>
            {confirming
              ? <b style={{ color: 'var(--amber)' }}>Konfirmasi: TB berjalan akan DIGANTI seluruhnya. Periksa dampak di panel 3 sebelum melanjutkan.</b>
              : 'Disimpan per-perikatan (StateDoc · isolasi W7.5) beserta jejak: pengimpor, waktu, satuan, periode, sumber & hash isi. Hilir (materialitas/GC/PSAK/FS) memakai saldo terimpor otomatis.'}
          </span>
          <div className="row gap8">
            {wtbImport && wtbImport.rows && <Btn sm onClick={revert} disabled={!canImport}><I.sync size={13} /> Kembali ke demo</Btn>}
            <Btn sm onClick={confirming ? () => setConfirming(false) : onClose}>{confirming ? 'Kembali' : 'Batal'}</Btn>
            <Btn sm variant="primary" onClick={apply} disabled={!parsed || !parsed.ok || !canImport || busy}>
              <I.check size={14} /> {busy ? 'Menyimpan…' : confirming ? 'Ya, ganti TB berjalan' : 'Terapkan ke WTB'}
            </Btn>
          </div>
        </div>
      )}
    >

        {/* PR-2a/2b — satuan & identitas sumber ditetapkan SEBELUM parse: satuan mengubah
            angka yang diimpor, periode & nama sumber masuk jejak provenance. */}
        <div className="row ac gap12" style={{ padding: '9px 14px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap', background: 'var(--surface-2)' }}>
          <div className="row ac gap6">
            <span className="tiny upper" style={{ fontWeight: 700, color: 'var(--ink-3)' }}>Satuan</span>
            <Seg
              options={[{ value: 'full', label: 'Rupiah penuh' }, { value: 'thousand', label: 'Ribuan' }, { value: 'million', label: 'Jutaan' }]}
              value={unit} onChange={setUnit} />
          </div>
          <div className="row ac gap6">
            <span className="tiny upper" style={{ fontWeight: 700, color: 'var(--ink-3)' }}>Periode</span>
            <input className="input" style={{ width: 96, height: 26 }} value={period} placeholder="FY2025"
              onChange={(e: { target: { value: string } }) => setPeriod(e.target.value)} />
          </div>
          <div className="row ac gap6" style={{ flex: 1, minWidth: 200 }}>
            <span className="tiny upper" style={{ fontWeight: 700, color: 'var(--ink-3)' }}>Sumber</span>
            <input className="input" style={{ flex: 1, height: 26 }} value={sourceName} placeholder="mis. TB-Sentosa-Des2025.xlsx (dari Bpk. Rudi, 12 Jan)"
              onChange={(e: { target: { value: string } }) => setSourceName(e.target.value)} />
          </div>
          {unit !== 'full' && parsed && <Badge kind="blue">{UNIT_LABEL[unit]} → dikali {parsed.meta.unitFactor.toLocaleString('id-ID')}</Badge>}
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 0, flex: 1, minHeight: 0 }}>
          {/* paste */}
          <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--line)', minHeight: 0 }}>
            <div className="row ac jb" style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)' }}>
              <span className="tiny upper" style={{ fontWeight: 700, color: 'var(--ink-3)' }}>1 · Tempel data</span>
              <div className="row gap6">
                <button className="btn sm" onClick={() => setText(SAMPLE_TB)}><I.table size={12} /> Muat contoh</button>
                <button className="btn sm ghost" onClick={() => setText('')} disabled={!text}><I.x size={12} /> Kosongkan</button>
              </div>
            </div>
            <textarea value={text} onChange={(e: { target: { value: string } }) => setText(e.target.value)} spellCheck={false}
              placeholder={'Tempel neraca saldo di sini…\n\nKonvensi tanda: Debit (+), Kredit (−) — agar Σ adjusted = 0.\nAngka format id-ID didukung: 1.850.000.000, (620.000.000), Rp 5.000.000.000.'}
              style={{ flex: 1, minHeight: 300, border: 'none', outline: 'none', padding: '10px 12px', fontSize: 12, fontFamily: 'var(--mono)', resize: 'none', color: 'var(--ink)', lineHeight: 1.5 }} />
          </div>

          {/* preview + validation */}
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto' }}>
            <div className="row ac jb" style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)' }}>
              <span className="tiny upper" style={{ fontWeight: 700, color: 'var(--ink-3)' }}>2 · Pratinjau & validasi</span>
              {parsed && <Badge kind={parsed.ok ? 'green' : 'red'}>{parsed.ok ? 'Siap diterapkan' : errors.length + ' error'}</Badge>}
            </div>
            <div style={{ padding: 12, flex: 1 }}>
              {!parsed && <div className="tiny muted" style={{ padding: '24px 0', textAlign: 'center' }}>Tempel data atau klik “Muat contoh” untuk melihat pratinjau.</div>}
              {parsed && (<>
                {/* verdict tiles */}
                <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 10 }}>
                  <div className="panel" style={{ padding: '7px 10px', boxShadow: 'none', background: 'var(--surface-2)' }}>
                    <div className="tiny muted upper">Baris akun</div><div className="mono" style={{ fontWeight: 700 }}>{parsed.meta.rowCount}</div>
                  </div>
                  <div className="panel" style={{ padding: '7px 10px', boxShadow: 'none', background: parsed.meta.balanced ? 'var(--green-bg)' : 'var(--amber-bg)' }}>
                    <div className="tiny muted upper">Control total</div>
                    <div className="mono" style={{ fontWeight: 700, color: parsed.meta.balanced ? 'var(--green)' : 'var(--red)' }}>{parsed.meta.balanced ? 'Seimbang ✓' : 'Selisih ' + m(parsed.meta.balanceDiff)}</div>
                  </div>
                  <div className="panel" style={{ padding: '7px 10px', boxShadow: 'none', background: 'var(--surface-2)' }}>
                    <div className="tiny muted upper">Cakupan PSAK</div><div className="mono" style={{ fontWeight: 700 }}>{parsed.coverage.matchedPct}%</div>
                  </div>
                </div>

                {/* issues */}
                {(errors.length > 0 || warns.length > 0) && (
                  <div style={{ marginBottom: 10 }}>
                    {errors.map((i: WtbIssue, k: number) => (
                      <div key={'e' + k} className="row ac gap6 tiny" style={{ padding: '4px 8px', border: '1px solid var(--red)', background: 'var(--red-bg, #fdecec)', borderRadius: 5, marginBottom: 4, color: 'var(--red)' }}>
                        <I.alert size={12} /> <span>{i.line ? `Baris ${i.line}: ` : ''}{i.message}</span>
                      </div>
                    ))}
                    {warns.slice(0, 6).map((i: WtbIssue, k: number) => (
                      <div key={'w' + k} className="row ac gap6 tiny" style={{ padding: '4px 8px', border: '1px solid var(--amber)', background: 'var(--amber-bg)', borderRadius: 5, marginBottom: 4, color: 'var(--ink-2)' }}>
                        <I.flag size={12} style={{ color: 'var(--amber)' }} /> <span>{i.line ? `Baris ${i.line}: ` : ''}{i.message}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* coverage honesty */}
                <div className="tiny muted upper" style={{ marginBottom: 5 }}>Engine PSAK yang menyala (pemetaan kode WTB_MAP)</div>
                <div className="row wrap gap6" style={{ marginBottom: 10 }}>
                  {parsed.coverage.engines.map((e: CoverageEngine) => (
                    <span key={e.id} title={e.lit ? 'Semua kode pemicunya hadir' : 'Kode hilang: ' + e.missing.join(', ')}>
                      <Badge kind={e.lit ? 'green' : undefined}>{e.lit ? '● ' : '○ '}{e.label}</Badge>
                    </span>
                  ))}
                </div>
                <div className="tiny muted" style={{ marginBottom: 10, lineHeight: 1.5 }}>
                  Engine bertanda ○ tidak menyala karena bagan akun klien tak memuat kode kanonik yang dipetakan — figur PSAK terkait akan 0 sampai akun dipetakan (lihat W-WTB·3).
                </div>

                {/* preview table */}
                <div style={{ border: '1px solid var(--line)', borderRadius: 6, overflow: 'auto', maxHeight: 220 }}>
                  <table className="dtbl">
                    <thead><tr><th>Kode</th><th>Nama</th><th>Grup</th><th className="num">Unadj</th><th className="num">AJE</th><th className="num">Adjusted</th></tr></thead>
                    <tbody>
                      {parsed.rows.map((r: ImportedWtbRow) => (
                        <tr key={r.key}>
                          <td className="mono tiny muted">{r.code}</td>
                          <td className="truncate" style={{ maxWidth: 150 }}>{r.name}</td>
                          <td className="tiny">{r.group}</td>
                          <td className="num"><span className={r.unadj < 0 ? 'neg' : ''}>{m(r.unadj)}</span></td>
                          <td className="num">{r.aje ? <span className={r.aje < 0 ? 'neg' : ''}>{m(r.aje)}</span> : <span className="muted">—</span>}</td>
                          <td className="num" style={{ fontWeight: 600 }}><span className={r.adj < 0 ? 'neg' : ''}>{m(r.adj)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* PR-2b — dampak penggantian, wajib dilihat sebelum TB berjalan diganti */}
                {diff && diff.hasChanges && (
                  <div style={{ marginTop: 10, border: '1px solid ' + (confirming ? 'var(--amber)' : 'var(--line)'), borderRadius: 6, overflow: 'hidden' }}>
                    <div className="row ac jb" style={{ padding: '7px 10px', background: confirming ? 'var(--amber-bg)' : 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}>
                      <span className="tiny upper" style={{ fontWeight: 700, color: 'var(--ink-3)' }}>3 · Dampak terhadap TB berjalan</span>
                      <Badge kind={diff.enginesLost.length ? 'amber' : undefined}>
                        +{diff.added.length} / −{diff.removed.length} / ~{diff.changed.length}
                      </Badge>
                    </div>
                    <div style={{ padding: 10 }}>
                      <div className="grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 8 }}>
                        <div className="panel" style={{ padding: '7px 10px', boxShadow: 'none', background: 'var(--surface-2)' }}>
                          <div className="tiny muted upper">Δ Total Aset</div>
                          <div className="mono" style={{ fontWeight: 700 }}><span className={diff.deltaAssets < 0 ? 'neg' : ''}>{m(diff.deltaAssets)}</span></div>
                          <div className="tiny muted">{m(diff.assetsBefore)} → {m(diff.assetsAfter)} jt</div>
                        </div>
                        <div className="panel" style={{ padding: '7px 10px', boxShadow: 'none', background: 'var(--surface-2)' }}>
                          <div className="tiny muted upper">Δ Laba Berjalan</div>
                          <div className="mono" style={{ fontWeight: 700 }}><span className={diff.deltaProfit < 0 ? 'neg' : ''}>{m(diff.deltaProfit)}</span></div>
                          <div className="tiny muted">{m(diff.profitBefore)} → {m(diff.profitAfter)} jt</div>
                        </div>
                      </div>
                      {diff.enginesLost.length > 0 && (
                        <div className="row ac gap6 tiny" style={{ padding: '5px 8px', border: '1px solid var(--amber)', background: 'var(--amber-bg)', borderRadius: 5, marginBottom: 6, color: 'var(--ink-2)' }}>
                          <I.alert size={12} style={{ color: 'var(--amber)' }} />
                          <span>Engine PSAK PADAM setelah impor: {diff.enginesLost.join(' · ')} — figur terkait menjadi 0 sampai akun dipetakan.</span>
                        </div>
                      )}
                      <div className="tiny muted" style={{ marginBottom: 5 }}>
                        {diff.unchangedCount} akun tak berubah · perubahan terbesar (Rp jt):
                      </div>
                      <div style={{ border: '1px solid var(--line)', borderRadius: 5, overflow: 'auto', maxHeight: 150 }}>
                        <table className="dtbl">
                          <thead><tr><th style={{ width: 60 }}>Jenis</th><th>Akun</th><th className="num">Dari</th><th className="num">Ke</th><th className="num">Δ</th></tr></thead>
                          <tbody>
                            {[...diff.changed.map(c => ({ ...c, k: 'ubah' })), ...diff.added.map(c => ({ ...c, k: 'baru' })), ...diff.removed.map(c => ({ ...c, k: 'hapus' }))]
                              .slice(0, 12).map(c => (
                                <tr key={c.k + c.code}>
                                  <td><Badge kind={c.k === 'hapus' ? 'red' : c.k === 'baru' ? 'purple' : undefined}>{c.k}</Badge></td>
                                  <td><div className="truncate" style={{ maxWidth: 150 }}>{c.name}</div><div className="mono tiny muted">{c.code}</div></td>
                                  <td className="num muted">{m(c.from)}</td>
                                  <td className="num">{m(c.to)}</td>
                                  <td className="num" style={{ fontWeight: 600 }}><span className={c.delta < 0 ? 'neg' : ''}>{m(c.delta)}</span></td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </>)}

              {/* Cuplikan sumber impor SEBELUMNYA. Payload sudah menyimpannya sejak PR-2b, tapi
                  tak satu pun permukaan menampilkannya — data tulis-saja, sehingga alasan
                  keberadaannya (ketertelusuran sumber, SA 500) tak pernah terpenuhi dan
                  `sha256Excerpt` mengesahkan sesuatu yang tak dapat dilihat. */}
              {storedExcerpt && (
                <details style={{ marginTop: 10 }}>
                  <summary className="tiny muted upper" style={{ cursor: 'pointer', marginBottom: 5 }}>
                    Cuplikan sumber tersimpan {storedLength ? `(${storedExcerpt.length.toLocaleString('id-ID')} dari ${storedLength.toLocaleString('id-ID')} karakter)` : ''}
                  </summary>
                  <pre style={{ margin: 0, padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 5, background: 'var(--surface-2)', maxHeight: 180, overflow: 'auto', fontSize: 11, lineHeight: 1.5, fontFamily: 'var(--mono)', color: 'var(--ink-2)', whiteSpace: 'pre-wrap' }}>{storedExcerpt}</pre>
                  {storedLength > storedExcerpt.length && (
                    <div className="tiny muted" style={{ marginTop: 4 }}>
                      Dipotong — sisanya tak disimpan. Sidik jari teks penuh tetap tercatat di riwayat dan
                      diverifikasi dengan menempel ulang berkas sumber yang sama.
                    </div>
                  )}
                </details>
              )}

              {/* PR-2b — riwayat impor (header provenance, di dalam payload yang sama) */}
              {history.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div className="tiny muted upper" style={{ marginBottom: 5 }}>Riwayat impor ({history.length} terakhir)</div>
                  {history.map((h: ImportProvenance, i: number) => (
                    <div key={i} style={{ padding: '5px 8px', border: '1px solid var(--line)', borderRadius: 5, marginBottom: 4 }}>
                      <div className="row ac jb">
                        <span className="tiny" style={{ fontWeight: 600 }}>{new Date(h.importedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        <span className="tiny muted">{h.userName}{h.userRole ? ' · ' + h.userRole : ''}</span>
                      </div>
                      <div className="tiny muted">
                        {h.rowCount} akun · {UNIT_LABEL[h.unit]}{h.period ? ' · ' + h.period : ''}{h.sourceName ? ' · ' + h.sourceName : ''}
                      </div>
                      {/* Cakupan tiap hash disebut eksplisit — dulu satu label "sha256" berdiri
                          di sebelah cuplikan dan tampak seolah menutup cuplikan itu. */}
                      {(h.sha256 || h.sha256Excerpt) && (
                        <div className="tiny muted" style={{ marginTop: 2 }}>
                          {h.sha256 ? (
                            <span title={`SHA-256 atas teks penuh yang ditempel${h.rawLength ? ` (${h.rawLength.toLocaleString('id-ID')} karakter)` : ''} — verifikasi dengan menempel ulang berkas sumber yang sama`}>
                              teks penuh <span className="mono">{h.sha256.slice(0, 12)}…</span>
                            </span>
                          ) : null}
                          {h.sha256Excerpt ? (
                            <span title="SHA-256 atas cuplikan yang tersimpan — satu-satunya hash yang dapat dihitung ulang dari isi kertas kerja ini">
                              {h.sha256 ? ' · ' : ''}cuplikan tersimpan <span className="mono">{h.sha256Excerpt.slice(0, 12)}…</span>
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
    </Overlay>
  );
}

Object.assign(window, { WtbImportDrawer });

/* ---------------- W-WTB·2 · Panel integritas neraca saldo ---------------- */
function WtbIntegrityPanel({ r, onOpenMapping }: { r: WtbIntegrityResult; onOpenMapping?: (() => void) | null }) {
  const { rp } = AMS;
  const bsExact = Math.abs(r.bsDiff) <= r.tol;
  const ajeOk = r.ajeBalanced && r.registerReconciled;
  const dot = (c: string) => <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, display: 'inline-block', flex: '0 0 auto' }} />;
  const msgColor = (lvl: string) => lvl === 'warn' ? 'var(--amber)' : lvl === 'ok' ? 'var(--green)' : 'var(--ink-2)';
  const msgDot = (lvl: string) => lvl === 'warn' ? 'var(--amber)' : lvl === 'ok' ? 'var(--green)' : 'var(--blue)';

  const Tile = ({ label, value, valColor, sub, bg }: { label: string; value: string; valColor: string; sub: string; bg: string }) => (
    <div className="panel" style={{ padding: '8px 11px', boxShadow: 'none', background: bg }}>
      <div className="tiny muted upper" style={{ letterSpacing: '.04em' }}>{label}</div>
      <div className="mono" style={{ fontWeight: 700, color: valColor, fontSize: 13 }}>{value}</div>
      <div className="tiny muted" style={{ lineHeight: 1.3 }}>{sub}</div>
    </div>
  );

  return (
    <Panel noBody style={{ marginBottom: 12 }}>
      <div className="panel-h">
        <h3>Integritas Neraca Saldo</h3>
        <span className="sub">Footing · rekonsiliasi neraca · rekonsiliasi AJE (SA 330/500)</span>
        <div style={{ flex: 1 }} />
        {/* PR-I1 — idem chip: badge mengikuti ada-tidaknya peringatan, bukan gerbang finalisasi. */}
        <Badge kind={!r.hasWarn ? 'green' : 'amber'}>{!r.hasWarn ? 'OK' : 'Perlu perhatian'}</Badge>
      </div>
      <div style={{ padding: '10px 14px' }}>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 10 }}>
          <Tile label="Footing (Σ adjusted)"
            value={r.footed ? 'Ter-foot ✓' : rp(r.sumAdj)}
            valColor={r.footed ? 'var(--green)' : (r.footingExplainedByIncome ? 'var(--ink)' : 'var(--red)')}
            sub={r.footed ? 'Debit = kredit' : (r.footingExplainedByIncome ? '≈ laba berjalan (TB pra-tutup)' : 'anomali — periksa akun/tanda')}
            bg={r.footed ? 'var(--green-bg)' : 'var(--surface-2)'} />
          <Tile label="Rekonsiliasi Neraca"
            value={bsExact ? 'Seimbang ✓' : rp(r.bsDiff)}
            valColor={r.bsTied ? (bsExact ? 'var(--green)' : 'var(--ink)') : 'var(--red)'}
            sub={bsExact ? 'Aset = Liabilitas + Ekuitas' : (r.bsExplainedByIncome ? '≈ laba berjalan (ditutup ke ekuitas di LK)' : 'tak seimbang — periksa pemetaan')}
            bg={bsExact ? 'var(--green-bg)' : (r.bsExplainedByIncome ? 'var(--surface-2)' : 'var(--amber-bg)')} />
          <Tile label="Rekonsiliasi AJE"
            value={ajeOk ? 'Selaras ✓' : (r.ajeMismatches.length + ' akun selisih')}
            valColor={ajeOk ? 'var(--green)' : 'var(--amber)'}
            sub={r.ajeBalanced ? 'Σ AJE = 0 (jurnal seimbang)' : 'Σ AJE = ' + rp(r.wtbAjeSum)}
            bg={ajeOk ? 'var(--green-bg)' : 'var(--amber-bg)'} />
        </div>

        {/* PR-4d — pola mustahil yang dulu lolos sebagai "OK": masing-masing kondisi tampak
            wajar sendiri-sendiri, residunya diserap FSGEN ke baris plug. */}
        {r.incomeDoubleCounted && (
          <div className="row ac gap8" style={{ marginBottom: 10, padding: '8px 11px', border: '1px solid var(--amber)', background: 'var(--amber-bg)', borderRadius: 6 }}>
            <span style={{ color: 'var(--amber)', flex: '0 0 auto' }}><I.alert size={16} /></span>
            <span style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--ink-2)' }}>
              <b>Laba berjalan tampaknya tercatat dua kali.</b> Neraca sudah pas — artinya saldo laba memuat laba {rp(r.netIncome)} — padahal akun laba-rugi masih terbuka.
              TB pra-tutup yang koheren ber-Σ adjusted = 0 dengan selisih neraca sebesar laba; di sini keduanya tak terpenuhi. Periksa saldo laba & pos penutup sebelum menyusun LK.
            </span>
          </div>
        )}

        {/* PR-I2 — saldo yang tak dapat diklasifikasikan: dulu lenyap tanpa jejak dari
            rekonsiliasi neraca. Ditampilkan per-akun agar dapat ditindaklanjuti, bukan
            sekadar dihitung. */}
        {!r.allClassified && (
          <div style={{ marginBottom: 10, border: '1px solid var(--amber)', background: 'var(--amber-bg)', borderRadius: 6, overflow: 'hidden' }}>
            <div className="row ac gap8" style={{ padding: '8px 11px' }}>
              <span style={{ color: 'var(--amber)', flex: '0 0 auto' }}><I.alert size={16} /></span>
              <span style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--ink-2)', flex: 1 }}>
                <b>{r.unclassified.length} akun tak dapat diklasifikasikan — Σ {rp(r.unclassifiedTotal)}.</b> Kodenya tidak diawali 1–6,
                sehingga saldonya tidak masuk aset/liabilitas/ekuitas maupun laba-rugi. Selama ini belum dipetakan,
                rekonsiliasi neraca di atas tidak menjumlahkan seluruh neraca saldo.
              </span>
              {onOpenMapping && <Btn sm onClick={onOpenMapping}><I.target size={13} /> Petakan Akun</Btn>}
            </div>
            <table className="dtbl">
              <thead><tr><th style={{ width: 110 }}>Kode</th><th>Nama Akun</th><th className="num" style={{ width: 150 }}>Adjusted</th></tr></thead>
              <tbody>
                {r.unclassified.slice(0, 8).map((u: UnclassifiedRow, i: number) => (
                  <tr key={i}>
                    <td className="mono tiny">{u.code || <span className="muted">(kode kosong)</span>}</td>
                    <td className="tiny">{u.name || <span className="muted">—</span>}</td>
                    <td className="num" style={{ fontWeight: 600 }}><span className={u.adj < 0 ? 'neg' : ''}>{rp(u.adj)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {r.unclassified.length > 8 && <div className="tiny muted" style={{ padding: '6px 11px' }}>…{r.unclassified.length - 8} akun lainnya — buka Petakan Akun untuk daftar penuh.</div>}
          </div>
        )}

        <div className="col" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {r.messages.map((m: IntegrityMessage, i: number) => (
            <div key={i} className="row ac gap6 tiny" style={{ color: msgColor(m.level) }}>
              {dot(msgDot(m.level))} <span>{m.text}</span>
            </div>
          ))}
        </div>

        {r.ajeMismatches.length > 0 && (
          <div style={{ marginTop: 10, border: '1px solid var(--line)', borderRadius: 6, overflow: 'hidden' }}>
            <table className="dtbl">
              <thead><tr><th>Akun</th><th className="num">AJE di WTB</th><th className="num">AJE di Register</th><th className="num">Selisih</th></tr></thead>
              <tbody>
                {r.ajeMismatches.slice(0, 6).map((mm: AjeMismatch, i: number) => (
                  <tr key={i}>
                    <td className="mono tiny">{mm.code}</td>
                    <td className="num"><span className={mm.wtb < 0 ? 'neg' : ''}>{rp(mm.wtb)}</span></td>
                    <td className="num"><span className={mm.register < 0 ? 'neg' : ''}>{rp(mm.register)}</span></td>
                    <td className="num" style={{ fontWeight: 600, color: 'var(--amber)' }}><span className={mm.diff < 0 ? 'neg' : ''}>{rp(mm.diff)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Panel>
  );
}

/* WTB account drill — synthetic sub-ledger transactions + lead schedule link */
function WtbDrill({ row, onClose, nav }: any) {
  const { fmt } = AMS;
  const { aje, wtbLedger, fluxState } = useAudit();
  const [dtab, setDtab] = useStateX('ledger');
  // W-WTB·4 — detail GL nyata bila diimpor (tie-out ke unadj, sadar srcCodes); else sintetik
  const glTie: LedgerTieOut = ledgerForRow(wtbLedger || {}, row);
  // deterministic synthetic transactions summing to the unadjusted balance
  const txns = useMemoX(() => {
    const target = row.unadj;
    const n = 7;
    const seed = row.code.split('').reduce((s: any, c: any) => s + c.charCodeAt(0), 0);
    const rnd = (i: any) => { const x = Math.sin(seed + i * 13.7) * 10000; return x - Math.floor(x); };
    const parties = ['PT Ritel Maju', 'PT Distribusi Andal', 'CV Sumber Rejeki', 'PT Niaga Sentosa', 'PT Mitra Dagang', 'CV Berkah Jaya', 'PT Aneka Pangan', 'PT Karya Utama'];
    const raw = Array.from({ length: n }, (_, i) => 0.4 + rnd(i) * 1.2);
    const sum = raw.reduce((a, b) => a + b, 0);
    let acc = 0;
    return raw.map((w, i) => {
      let amt = Math.round(target * w / sum / 1e6) * 1e6;
      if (i === n - 1) amt = target - acc; // last absorbs rounding
      acc += amt;
      const d = 1 + Math.floor(rnd(i + 30) * 27);
      return { id: 'TXN-' + row.code.replace('-', '') + '-' + String(i + 1).padStart(3, '0'), date: `2025-12-${String(d).padStart(2, '0')}`, party: parties[(seed + i) % parties.length], ref: 'DOC-' + Math.floor(rnd(i + 7) * 9000 + 1000), amount: amt };
    });
  }, [row.code]);
  const total = txns.reduce((s: any, t: any) => s + t.amount, 0);
  const num = (n: any) => <span className={n < 0 ? 'neg' : ''}>{fmt(n / 1e6, 1)}</span>;
  const relAje = aje.filter((a: any) => Array.isArray(a.lines)
    ? a.lines.some((l: any) => l.code === row.code)
    : ((a.dr && a.dr.split(' ')[0] === row.code) || (a.cr && a.cr.split(' ')[0] === row.code)));
  const delta = row.adj - row.ly;
  const pct = row.ly !== 0 ? (delta / Math.abs(row.ly)) * 100 : null;
  /* PR-3b — presedens DIPERBAIKI. Dulu `DEFAULT_EXPL[code] || row.note`: saran seed
     mengalahkan catatan auditor sendiri (kebalikan dari computeWtbSummary), sehingga
     setelah auditor menulis penjelasan, drill tetap menampilkan teks kaleng. Kini
     dokumentasi auditor menang, dan saran ditampilkan sebagai saran. */
  const explNote = noteOf(fluxState, row.code);
  const explStatus = statusOf(fluxState, row.code);
  const explSuggestion = (DEFAULT_EXPL as Record<string, string>)[row.code] || '';
  const DTABS = [
    { id: 'ledger', label: 'Buku Besar', n: glTie.hasDetail ? glTie.lines.length : txns.length },
    { id: 'move', label: 'Pergerakan' },
    { id: 'aje', label: 'AJE Terkait', n: relAje.length },
  ];

  return (
    <Overlay
      variant="modal"
      size="lg"
      onClose={onClose}
      header={(<>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, borderRadius: '4px 4px 0 0' }}>
          <span style={{ width: 38, height: 38, borderRadius: 9, background: 'rgba(255,255,255,.15)', display: 'grid', placeItems: 'center' }}><I.table size={18} /></span>
          <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 15 }}>{row.code} · {row.name}</div><div className="tiny" style={{ color: '#bcd6e4' }}>Buku besar pembantu (sub-ledger) · {row.group}</div></div>
          <Badge kind="blue" title={LEAD_SRC_TITLE[row.leadSrc || ''] || undefined}>WP {row.lead}{row.leadSrc === 'guess' ? '?' : ''}</Badge>
          <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 22, flexWrap: 'wrap' }}>
          <div><div className="tiny muted upper">Saldo Unadjusted</div><div className="mono" style={{ fontWeight: 700, fontSize: 15 }}>Rp {fmt(row.unadj / 1e6, 1)} jt</div></div>
          <div><div className="tiny muted upper">Penyesuaian (AJE)</div><div className="mono" style={{ fontWeight: 700, fontSize: 15, color: row.aje ? 'var(--blue)' : 'var(--ink-3)' }}>{row.aje ? 'Rp ' + fmt(row.aje / 1e6, 1) + ' jt' : '—'}</div></div>
          <div><div className="tiny muted upper">Saldo Adjusted</div><div className="mono" style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>Rp {fmt(row.adj / 1e6, 1)} jt</div></div>
          <div><div className="tiny muted upper">TA Lalu</div><div className="mono" style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-3)' }}>Rp {fmt(row.ly / 1e6, 1)} jt</div></div>
        </div>
        <div style={{ padding: '0 16px', borderBottom: '1px solid var(--line)' }}>
          <div className="tabs">
            {DTABS.map(t => <button key={t.id} className={'tab ' + (dtab === t.id ? 'on' : '')} onClick={() => setDtab(t.id)}>{t.label}{t.n != null && <span className="muted" style={{ marginLeft: 6, fontWeight: 500 }}>{t.n}</span>}</button>)}
          </div>
        </div>
      </>)}
      footer={(
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="tiny muted">{glTie.hasDetail ? (glTie.tied ? 'Detail GL nyata · tie-out ke saldo unadjusted cocok ✓' : 'Detail GL nyata · tie-out selisih — periksa kelengkapan GL') : 'Detail ilustratif (sintetik) — impor GL untuk sub-ledger nyata'}</span>
          {/* PR-4d menjanjikan kedua tombol ini MEMBAWA konteks; yang terkirim dulu hanya
              `nav()` telanjang, sehingga "Buka Lead Schedule E" mendarat di daftar WP tanpa
              membuka E, dan "Sampling Akun Ini" membuka SA 530 tanpa tahu akun mana.
              `ams.wpOpen` = kunci one-shot yang sudah dipakai My Tasks/Beranda/Workspace. */}
          <div className="row gap8">
            <Btn sm disabled={!row.lead}
              title={row.lead ? `Buka kertas kerja lead ${row.lead}` : 'Akun ini belum punya lead schedule — tetapkan di Pemetaan CoA'}
              onClick={() => {
                if (!row.lead) return;
                try { localStorage.setItem('ams.wpOpen', row.lead); } catch (e) { /* storage tertutup */ }
                onClose(); nav('workpapers', { from: 'wtb' });
              }}><I.layers size={13} /> Buka Lead Schedule {row.lead || '—'}</Btn>
            <Btn sm variant="primary"
              title={`Buka SA 530 dengan konteks akun ${row.code} — ${row.name}`}
              onClick={() => {
                try {
                  localStorage.setItem('ams.samplingAccount', JSON.stringify({
                    code: row.code, name: row.name, lead: row.lead || '', balance: row.adj,
                  }));
                } catch (e) { /* storage tertutup */ }
                onClose(); nav('sa530', { from: 'wtb', tab: 'desain' });
              }}><I.dice size={13} /> Sampling Akun Ini</Btn>
          </div>
        </div>
      )}
    >
        <div style={{ padding: '10px 16px' }}>
          {dtab === 'ledger' && glTie.hasDetail && (<>
          <div className="row ac jb" style={{ margin: '2px 0 6px' }}>
            <span className="tiny muted">{glTie.lines.length} baris buku besar (GL) nyata · Rp jt</span>
            <Badge kind={glTie.tied ? 'green' : 'amber'}>{glTie.tied ? 'Tie-out cocok ✓' : 'Selisih ' + fmt(glTie.diff / 1e6, 1) + ' jt'}</Badge>
          </div>
          <table className="dtbl">
            <thead><tr><th>Tanggal</th><th>Uraian</th><th>Pihak</th><th>Dokumen</th><th className="num">Jumlah</th></tr></thead>
            <tbody>
              {glTie.lines.map((l: LedgerLine, i: number) => (
                <tr key={i}>
                  <td className="mono tiny muted">{l.date}</td>
                  <td className="truncate" style={{ maxWidth: 220 }}>{l.desc}</td>
                  <td className="truncate tiny" style={{ maxWidth: 140 }}>{l.party || '—'}</td>
                  <td className="mono tiny muted">{l.ref || '—'}</td>
                  <td className="num">{num(l.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan={4}>TOTAL GL{glTie.tied ? ' (= saldo unadjusted ✓)' : ' (≠ unadjusted ' + fmt(glTie.target / 1e6, 1) + ')'}</td><td className="num">{num(glTie.total)}</td></tr></tfoot>
          </table>
          </>)}
          {dtab === 'ledger' && !glTie.hasDetail && (<>
          <div className="row ac jb" style={{ margin: '2px 0 6px' }}>
            <span className="tiny muted">{txns.length} transaksi (ilustratif) pembentuk saldo unadjusted · Rp jt</span>
            <Badge kind="amber">Detail sintetik — impor GL untuk detail nyata</Badge>
          </div>
          <table className="dtbl">
            <thead><tr><th>ID Transaksi</th><th>Tanggal</th><th>Pihak</th><th>Dokumen</th><th className="num">Jumlah</th></tr></thead>
            <tbody>
              {txns.map((t: any) => (
                <tr key={t.id}>
                  <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{t.id}</td>
                  <td className="mono tiny muted">{new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</td>
                  <td className="truncate" style={{ maxWidth: 180 }}>{t.party}</td>
                  <td className="mono tiny muted">{t.ref}</td>
                  <td className="num">{num(t.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan={4}>TOTAL (= saldo unadjusted)</td><td className="num">{num(total)}</td></tr></tfoot>
          </table>
          </>)}

          {dtab === 'move' && (
            <div style={{ padding: '4px 0' }}>
              <div className="row gap8" style={{ marginBottom: 12 }}>
                <div className="panel" style={{ flex: 1, padding: '9px 12px', boxShadow: 'none', background: 'var(--surface-2)' }}>
                  <div className="tiny muted upper">TA Lalu (audited)</div>
                  <div className="mono" style={{ fontWeight: 700, fontSize: 15 }}>{fmt(row.ly / 1e6, 1)}</div>
                </div>
                <div className="panel" style={{ flex: 1, padding: '9px 12px', boxShadow: 'none', background: 'var(--surface-2)' }}>
                  <div className="tiny muted upper">Saldo Kini</div>
                  <div className="mono" style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>{fmt(row.adj / 1e6, 1)}</div>
                </div>
                <div className="panel" style={{ flex: 1, padding: '9px 12px', boxShadow: 'none', background: 'var(--blue-050)' }}>
                  <div className="tiny muted upper">Perubahan</div>
                  <div className="mono" style={{ fontWeight: 700, fontSize: 15, color: 'var(--blue)' }}>{delta > 0 ? '+' : ''}{fmt(delta / 1e6, 1)}{pct != null && <span className="tiny" style={{ marginLeft: 6, color: 'var(--ink-3)' }}>({pct > 0 ? '+' : ''}{fmt(pct, 1)}%)</span>}</div>
                </div>
              </div>
              <div className="row ac gap12" style={{ padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 6, marginBottom: 12 }}>
                <TrendBars py={row.ly} cy={row.adj} w={70} h={46} />
                <div style={{ flex: 1 }}>
                  <div className="tiny muted upper">Komposisi saldo kini</div>
                  <div className="tiny" style={{ color: 'var(--ink-2)', marginTop: 3 }}>Unadjusted {fmt(row.unadj / 1e6, 1)} {row.aje ? <>+ AJE <b style={{ color: 'var(--blue)' }}>{fmt(row.aje / 1e6, 1)}</b></> : null} = <b>{fmt(row.adj / 1e6, 1)}</b> jt</div>
                </div>
              </div>
              <div className="row ac jb" style={{ marginBottom: 5 }}>
                <span className="tiny muted upper">Penjelasan Analitis (SA 520)</span>
                {explStatus && <Badge kind={fluxStatusKind(explStatus)}>{FLUX_STATUS_LABEL[explStatus]}</Badge>}
              </div>
              {explNote ? (
                <div style={{ padding: '9px 11px', border: '1px solid var(--line)', borderLeft: '3px solid var(--blue)', borderRadius: 5, fontSize: 12, lineHeight: 1.55, color: 'var(--ink-2)' }}>{explNote}</div>
              ) : (
                <div style={{ padding: '9px 11px', border: '1px solid var(--line)', borderLeft: '3px solid var(--ink-4)', borderRadius: 5, fontSize: 12, lineHeight: 1.55, color: 'var(--ink-4)' }}>
                  Belum ada penjelasan terdokumentasi — buka tab Analisis Pergerakan untuk mendokumentasikan.
                  {explSuggestion && <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px dashed var(--line)' }}><b style={{ color: 'var(--amber)' }}>Saran sistem:</b> {explSuggestion}</div>}
                </div>
              )}
            </div>
          )}

          {dtab === 'aje' && (
            <div style={{ padding: '4px 0' }}>
              {relAje.length === 0
                ? <div className="tiny muted" style={{ padding: '14px 0', textAlign: 'center' }}>Tidak ada jurnal penyesuaian yang menyentuh akun ini.</div>
                : <table className="dtbl">
                    <thead><tr><th>No.</th><th>Deskripsi</th><th style={{ width: 50 }}>WP</th><th className="num" style={{ width: 120 }}>Jumlah</th><th style={{ width: 96 }}>Status</th></tr></thead>
                    <tbody>
                      {relAje.map((a: any) => (
                        <tr key={a.id}>
                          <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{a.id}</td>
                          <td>{a.desc}</td>
                          <td><span className="chip tiny" style={{ height: 18, padding: '0 6px', fontFamily: 'var(--mono)' }}>{a.ref}</span></td>
                          <td className="num">{num(a.amount)}</td>
                          <td><Badge>{a.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>}
            </div>
          )}
        </div>
    </Overlay>
  );
}

/* ---------------- AJE ---------------- */
function AJEViewLegacy() {
  const { fmt } = AMS;
  const { aje, addAje, wtb } = useAudit();
  const { locked } = useFirm();
  const posted = aje.filter((a: any) => a.status === 'Posted');
  const proposed = aje.filter((a: any) => a.status === 'Proposed');
  const netPosted = posted.reduce((s: any, a: any) => s + a.amount, 0);
  const [showForm, setShowForm] = useStateX(false);
  const [selId, setSelId] = useStateX(null);

  const accounts = wtb.map((r: any) => ({ code: r.code, name: r.name }));

  return (
    <>
      <SubBar moduleId="aje" right={<Btn sm variant="primary" disabled={locked} style={{ opacity: locked ? .5 : 1 }} onClick={() => !locked && setShowForm(true)}><I.plus size={14} /> AJE Baru</Btn>} />
      <div className="view-scroll">
        <div className="view-pad">
          {locked && <LockBanner />}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 12 }}>
            <Panel><div style={{ padding: '15px 18px' }}><Stat value={aje.length} label="Total AJE" /></div></Panel>
            <Panel><div style={{ padding: '15px 18px' }}><Stat value={posted.length} label="Posted" accent="var(--green)" /></div></Panel>
            <Panel><div style={{ padding: '15px 18px' }}><Stat value={proposed.length} label="Proposed" accent="var(--amber)" /></div></Panel>
            <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + fmt(netPosted / 1e6, 0) + ' jt'} label="Dampak Posted ke Laba" /></div></Panel>
          </div>

          <Panel noBody>
            <div className="panel-h"><h3>Daftar Adjusting Journal Entries</h3><span className="sub">Klik status untuk toggle · baris untuk detail jurnal</span></div>
            <table className="dtbl">
              <thead><tr>
                <th style={{ width: 70 }}>No.</th><th>Deskripsi</th><th style={{ width: 50 }}>WP</th>
                <th>Debit</th><th>Kredit</th><th className="num" style={{ width: 130 }}>Jumlah (Rp)</th><th style={{ width: 100 }}>Status</th>
              </tr></thead>
              <tbody>
                {aje.map((a: any) => (
                  <tr key={a.id} onClick={() => setSelId(selId === a.id ? null : a.id)} style={{ cursor: 'pointer' }} className={selId === a.id ? 'sel' : ''}>
                    <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{a.id}{a.lines && <span title="Diposting ke WTB" style={{ marginLeft: 4, color: 'var(--green)' }}>●</span>}</td>
                    <td>{a.desc}</td>
                    <td><span className="chip tiny" style={{ height: 18, padding: '0 6px', fontFamily: 'var(--mono)' }}>{a.ref}</span></td>
                    <td className="tiny mono muted">{a.lines ? a.lines.filter((l: any) => +l.debit).map((l: any) => l.code).join(', ') : a.dr}</td>
                    <td className="tiny mono muted">{a.lines ? a.lines.filter((l: any) => +l.credit).map((l: any) => l.code).join(', ') : a.cr}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{fmt(a.amount)}</td>
                    {/* PR-B - badge tidak lagi menjadi saklar posting (lihat view_aje.tsx). */}
                    <td><Badge>{a.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          {selId && (() => {
            const a = aje.find((x) => x.id === selId);
            /* PR-6d — dulu `a` bertipe `any`, jadi AJE yang tak ditemukan akan melempar
               saat runtime. Kini eksplisit: tak ada baris = tak ada panel. */
            if (!a) return null;
            const lines = a.lines || [
              { code: (a.dr || '').split(' ')[0], name: a.dr, debit: a.amount, credit: 0 },
              { code: (a.cr || '').split(' ')[0], name: a.cr, debit: 0, credit: a.amount },
            ];
            const td = lines.reduce((s: any, l: any) => s + (+l.debit || 0), 0), tc = lines.reduce((s: any, l: any) => s + (+l.credit || 0), 0);
            return (
              <Panel className="" noBody style={{ marginTop: 12 }}>
                <div style={{ background: 'var(--surface-2)', padding: '10px 14px', borderBottom: '1px solid var(--line)' }} className="row ac gap8">
                  <span className="mono" style={{ fontWeight: 700, color: 'var(--blue)' }}>{a.id}</span><span style={{ fontWeight: 600 }}>{a.desc}</span>
                  <div style={{ flex: 1 }} /><span className="chip tiny mono">{a.ref}</span><Badge>{a.status}</Badge>
                </div>
                <table className="dtbl">
                  <thead><tr><th>Kode</th><th>Akun</th><th className="num">Debit</th><th className="num">Kredit</th></tr></thead>
                  <tbody>
                    {lines.map((l: any, i: any) => (
                      <tr key={i}><td className="mono tiny">{l.code}</td><td>{l.name}</td><td className="num">{+l.debit ? fmt(+l.debit) : '—'}</td><td className="num">{+l.credit ? fmt(+l.credit) : '—'}</td></tr>
                    ))}
                  </tbody>
                  <tfoot><tr><td colSpan={2}>TOTAL {td === tc ? '· seimbang ✓' : '· tidak seimbang'}</td><td className="num">{fmt(td)}</td><td className="num">{fmt(tc)}</td></tr></tfoot>
                </table>
              </Panel>
            );
          })()}
        </div>
      </div>
      {showForm && <AJEForm accounts={accounts} onClose={() => setShowForm(false)} onPost={(entry: any) => { addAje(entry); setShowForm(false); }} />}
    </>
  );
}

/* ---- AJE double-entry form (modal) ---- */
/** Akhir tahun buku perikatan aktif sebagai default tanggal efektif ('FY2025'
 *  → '2025-12-31'). Bila tak dapat diturunkan, kosong — pengguna wajib mengisi. */
function fyEndDefault(eng: { fy?: string } | null | undefined): string {
  const m = /(\d{4})/.exec(String((eng && eng.fy) || ''));
  return m ? `${m[1]}-12-31` : '';
}

/** PR-E — bentuk minimal item SAD yang dipakai pemilih salah saji. */
interface SadPickItem { id: string; desc?: string }

function AJEForm({ accounts, onClose, onPost }: any) {
  const { fmt } = AMS;
  const { user } = useAuth();
  const { activeEngagement } = useFirm();
  const [desc, setDesc] = useStateX('');
  const [ref, setRef] = useStateX('');
  /* PR-E — klasifikasi yang selama ini tak pernah ditanyakan, sehingga entri
     buatan auditor tak pernah sampai ke ledger SAD (SA 450) maupun Matriks
     Asersi (SA 315). Model sudah menerimanya; hanya formulirnya yang diam. */
  const [kind, setKind] = useStateX('adjusting');
  const [misId, setMisId] = useStateX('');
  /* PR-5 — jalan keluar EKSPLISIT dari kewajiban item SAD: yang dilarang bukan
     "tak ada item SAD", melainkan tak ada jawabannya. */
  const [misNoneReason, setMisNoneReason] = useStateX('');
  /* PR-5 — tanggal efektif menentukan apakah jurnal masuk tahun buku yang
     diaudit; sumber bukti & tautan DMS menjadikan jurnal dapat ditelusuri ke
     bukti, bukan hanya ke prosedur. Default tanggal = akhir tahun buku aktif. */
  const [effectiveDate, setEffectiveDate] = useStateX(() => fyEndDefault(activeEngagement));
  const [evidenceSource, setEvidenceSource] = useStateX('');
  const [dmsLink, setDmsLink] = useStateX('');
  const [assertions, setAssertions] = useStateX([] as string[]);
  /* Default BERSAMA dengan modul SAD & AJE atas satu kunci persist — dua default
     berbeda untuk satu kunci adalah kelas cacat yang diperbaiki PR-C. */
  const [sadItems] = useAmsPersist('sadItems.v1', () => SAD_SEED) as [SadPickItem[], unknown];
  const [lines, setLines] = useStateX([
    { code: '', debit: '', credit: '' },
    { code: '', debit: '', credit: '' },
  ]);

  const toggleAssertion = (id: string) =>
    setAssertions((cur: string[]) => cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]);

  const setLine = (i: any, patch: any) => setLines((ls: any) => ls.map((l: any, idx: any) => idx === i ? { ...l, ...patch } : l));
  const addLine = () => setLines((ls: any) => [...ls, { code: '', debit: '', credit: '' }]);
  const removeLine = (i: any) => setLines((ls: any) => ls.length > 2 ? ls.filter((_: any, idx: any) => idx !== i) : ls);

  const td = lines.reduce((s: any, l: any) => s + (+l.debit || 0), 0);
  const tc = lines.reduce((s: any, l: any) => s + (+l.credit || 0), 0);
  const balanced = td > 0 && td === tc;
  const allCoded = lines.every((l: any) => !l.code || accounts.find((a: any) => a.code === l.code));
  const filledLines = lines.filter((l: any) => l.code && ((+l.debit || 0) + (+l.credit || 0)) > 0);
  /* PR-5 — kelayakan pengajuan ditentukan fungsi MURNI yang teruji
     (`validateAjeDraft`), bukan ekspresi di dalam komponen. Aturan yang hanya
     ada di JSX hanya teruji lewat render. */
  const issues = validateAjeDraft({
    desc, ref, kind, mis: misId || null, misNoneReason, effectiveDate, evidenceSource, dmsLink,
    assertions, lines: filledLines.map((l: any) => ({ code: l.code, debit: l.debit, credit: l.credit })),
  });
  const issueFor = (f: string) => issues.find((i) => i.field === f);
  const valid = issues.length === 0;

  const post = () => {
    if (!valid) return;
    const entry = {
      desc: desc.trim(), ref: ref.trim(),
      amount: Math.max(td, tc),
      /* PR-E — klasifikasi auditor ikut serta, sehingga entri ini terlihat oleh
         rekonsiliasi SA 450 & Lensa Asersi seperti entri seed. `preparer` diambil
         dari sesi: sebelum ini reviewer/partner dipalsukan ke nama seed. */
      kind,
      mis: misId || undefined,
      misNoneReason: !misId && misNoneReason.trim() ? misNoneReason.trim() : undefined,
      effectiveDate,
      evidenceSource: evidenceSource.trim(),
      dmsLink: dmsLink.trim() || undefined,
      assertions: assertions.length ? assertions : undefined,
      preparer: user?.name,
      lines: filledLines.map((l: any) => ({ code: l.code, name: accounts.find((a: any) => a.code === l.code)?.name || l.code, debit: +l.debit || 0, credit: +l.credit || 0 })),
    };
    onPost(entry);
  };

  return (
    <Overlay
      variant="modal"
      size="lg"
      onClose={onClose}
      /* Formulir jurnal: draft di sini paling mahal untuk hilang (deskripsi + baris
         debit/kredit yang sudah diketik). Guard menutup jalur yang selama ini diam. */
      isDirty={() => desc.trim() !== '' || ref.trim() !== ''
        || lines.some((l: { code: string; debit: string; credit: string }) => l.code !== '' || l.debit !== '' || l.credit !== '')}
      bodyStyle={{ padding: 16 }}
      header={(
        /* PR-E — gradient & heksa ter-hardcode diganti token (mematahkan tema gelap; sekelas perbaikan PR-D di view_aje). */
        <div style={{ background: 'var(--navy-solid)', color: '#fff', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, borderRadius: '4px 4px 0 0' }}>
          <I.ledger size={18} />
          <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 'var(--fs-lg)' }}>Adjusting Journal Entry Baru</div><div className="tiny" style={{ opacity: .82 }}>Diajukan untuk persetujuan · belum memengaruhi WTB</div></div>
          <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>
      )}
      footer={(
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn onClick={onClose}>Batal</Btn>
          {/* PR-B - jurnal lahir 'Proposed'; posting hanya lewat rantai persetujuan. */}
          <Btn variant="primary" disabled={!valid} style={{ opacity: valid ? 1 : .5 }} onClick={post}><I.check size={14} /> Ajukan untuk Persetujuan</Btn>
        </div>
      )}
    >
        <div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 130px', gap: 10, marginBottom: 10 }}>
            <div className="field"><label>Deskripsi Penyesuaian</label><input className="input" value={desc} onChange={(e: any) => setDesc(e.target.value)} placeholder="mis. Koreksi beban dibayar di muka" /></div>
            {/* PR-5 — Ref. WP WAJIB (Q5: untuk semua jenis). Dulu ia opsional dan
                jatuh ke literal 'JE' — sebuah "referensi" yang tak merujuk apa pun
                dan tak dapat dibuka `openCanonicalWp`. */}
            <div className="field">
              <label>Ref. WP <span style={{ color: 'var(--red)' }}>*</span></label>
              <input className="input mono" value={ref} onChange={(e: { target: { value: string } }) => setRef(e.target.value)} placeholder="D-4"
                style={issueFor('ref') ? { borderColor: 'var(--red)' } : undefined} />
            </div>
          </div>

          {/* PR-5 — tanggal efektif & sumber bukti: jangkar ke periode dan ke bukti. */}
          <div className="grid" style={{ gridTemplateColumns: '150px 1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div className="field">
              <label>Tanggal Efektif <span style={{ color: 'var(--red)' }}>*</span></label>
              <input className="input mono" type="date" value={effectiveDate} onChange={(e: { target: { value: string } }) => setEffectiveDate(e.target.value)}
                style={issueFor('effectiveDate') ? { borderColor: 'var(--red)' } : undefined} />
            </div>
            <div className="field">
              <label>Sumber Bukti <span style={{ color: 'var(--red)' }}>*</span></label>
              <input className="input" value={evidenceSource} onChange={(e: { target: { value: string } }) => setEvidenceSource(e.target.value)}
                placeholder="mis. Buku besar 5-3100 + faktur vendor Mar-2026"
                style={issueFor('evidenceSource') ? { borderColor: 'var(--red)' } : undefined} />
            </div>
            <div className="field">
              <label>Tautan DMS / Dokumen <span className="muted">(opsional)</span></label>
              <input className="input mono" value={dmsLink} onChange={(e: { target: { value: string } }) => setDmsLink(e.target.value)} placeholder="DMS-2026-0142 atau URL" />
            </div>
          </div>

          {/* PR-E — klasifikasi auditor: tanpa ini entri tak pernah sampai ke SAD (SA 450) & Matriks Asersi (SA 315). */}
          <div className="grid" style={{ gridTemplateColumns: '190px 1fr', gap: 10, marginBottom: 12 }}>
            <div className="field">
              <label>Jenis</label>
              <select className="select" value={kind} onChange={(e: { target: { value: string } }) =>setKind(e.target.value)}>
                <option value="adjusting">Penyesuaian</option>
                <option value="reclass">Reklasifikasi</option>
              </select>
            </div>
            <div className="field">
              <label>Mengoreksi Salah Saji (SAD · SA 450){kind === 'adjusting' ? <span style={{ color: 'var(--red)' }}> *</span> : null}</label>
              <select className="select" value={misId} onChange={(e: { target: { value: string } }) =>setMisId(e.target.value)}
                style={issueFor('mis') ? { borderColor: 'var(--red)' } : undefined}>
                <option value="">— tidak terkait item SAD —</option>
                {sadItems.map(s => <option key={s.id} value={s.id}>{s.id} · {s.desc}</option>)}
              </select>
            </div>
          </div>

          {/* PR-5 — penyesuaian tanpa item SAD harus MENYATAKAN alasannya. Tanpa
              gerbang ini entri buatan auditor tak pernah sampai ke agregasi SA 450,
              dan ketiadaannya tak pernah menjadi keputusan siapa pun. */}
          {kind === 'adjusting' && !misId && (
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Alasan tidak terkait item SAD <span style={{ color: 'var(--red)' }}>*</span></label>
              <input className="input" value={misNoneReason} onChange={(e: { target: { value: string } }) => setMisNoneReason(e.target.value)}
                placeholder="mis. Reklasifikasi internal antar akun beban — tidak menimbulkan salah saji terhadap LK."
                style={issueFor('mis') ? { borderColor: 'var(--red)' } : undefined} />
            </div>
          )}

          <div className="tiny muted upper" style={{ marginBottom: 6 }}>Asersi yang Dikoreksi <span style={{ textTransform: 'none' }}>(SA 315 — opsional, boleh lebih dari satu)</span></div>
          <div className="row gap6" style={{ flexWrap: 'wrap', marginBottom: 14 }}>
            {ASSERTIONS.map(a => {
              const on = assertions.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  title={a.desc}
                  onClick={() => toggleAssertion(a.id)}
                  aria-pressed={on}
                  className="btn sm"
                  style={{
                    borderColor: on ? 'var(--blue)' : 'var(--line)',
                    background: on ? 'var(--surface-2)' : 'transparent',
                    color: on ? 'var(--blue)' : 'var(--ink-2)',
                    fontWeight: on ? 700 : 500,
                  }}
                >{a.label}</button>
              );
            })}
          </div>

          <div className="tiny muted upper" style={{ marginBottom: 6 }}>Baris Jurnal</div>
          <table className="dtbl" style={{ marginBottom: 8 }}>
            <thead><tr><th>Akun</th><th className="num" style={{ width: 140 }}>Debit</th><th className="num" style={{ width: 140 }}>Kredit</th><th style={{ width: 34 }}></th></tr></thead>
            <tbody>
              {lines.map((l: any, i: any) => (
                <tr key={i}>
                  <td style={{ padding: '3px 6px' }}>
                    <select className="select" style={{ width: '100%', height: 26 }} value={l.code} onChange={(e: any) => setLine(i, { code: e.target.value })}>
                      <option value="">— pilih akun —</option>
                      {accounts.map((a: any) => <option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '3px 6px' }}><input className="input mono" style={{ width: '100%', height: 26, textAlign: 'right' }} type="number" value={l.debit} onChange={(e: any) => setLine(i, { debit: e.target.value, credit: e.target.value ? '' : l.credit })} placeholder="0" /></td>
                  <td style={{ padding: '3px 6px' }}><input className="input mono" style={{ width: '100%', height: 26, textAlign: 'right' }} type="number" value={l.credit} onChange={(e: any) => setLine(i, { credit: e.target.value, debit: e.target.value ? '' : l.debit })} placeholder="0" /></td>
                  <td style={{ padding: '3px 6px' }}><button className="btn sm icon" onClick={() => removeLine(i)} disabled={lines.length <= 2} style={{ opacity: lines.length <= 2 ? .3 : 1 }}><I.x size={13} /></button></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>TOTAL</td>
                <td className="num" style={{ color: balanced ? 'var(--green)' : 'var(--ink)' }}>{fmt(td)}</td>
                <td className="num" style={{ color: balanced ? 'var(--green)' : 'var(--ink)' }}>{fmt(tc)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
          <Btn sm onClick={addLine}><I.plus size={13} /> Tambah Baris</Btn>

          {/* PR-5 — daftar SYARAT yang belum terpenuhi, bukan tombol mati tanpa
              penjelasan. Auditor harus tahu apa yang kurang, bukan menebak. */}
          <div className="panel" style={{ marginTop: 14, padding: '10px 12px', background: valid ? 'var(--green-bg)' : 'var(--amber-bg)', borderColor: 'transparent' }}>
            <div className="row gap8" style={{ alignItems: 'flex-start' }}>
              <span style={{ color: valid ? 'var(--green)' : 'var(--amber)' }}>{valid ? <I.checkCircle size={16} /> : <I.alert size={16} />}</span>
              <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.5 }}>
                {valid ? 'Lengkap & seimbang — siap diajukan untuk persetujuan.' : (
                  <>
                    Belum dapat diajukan:
                    <ul style={{ margin: '5px 0 0', paddingLeft: 18, fontWeight: 500 }}>
                      {issues.map((i, k) => <li key={k} style={{ marginBottom: 2 }}>{i.message}</li>)}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
    </Overlay>
  );
}

Object.assign(window, { WTBView, AJEForm }); // AJEView intentionally overridden by view_aje.jsx (renamed AJEViewLegacy here)


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { AJEForm, WTBView };
