/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAudit, useAuth, useFirm, useNav } from './contexts';
import { CAP } from './rbac';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, LockBanner, Panel, Seg, Stat } from './ui';
import { TrendBars, WtbAnalytical, WtbGrouping, WtbKpiBand } from './view_wtb_deep';
import { amsExportXlsx } from './export_xlsx';
import { parseTrialBalance } from './wtb_import';
import type { ParseResult, WtbIssue, CoverageEngine, ImportedWtbRow } from './wtb_import';
import { checkWtbIntegrity } from './wtb_integrity';
import type { WtbIntegrityResult, IntegrityMessage, AjeMismatch } from './wtb_integrity';
import { STANDARD_COA, autoMap, mappingCoverage } from './wtb_mapping';
import type { CoaAccount, MappingCoverageResult } from './wtb_mapping';
import { parseLedger, ledgerForRow } from './wtb_ledger';
import type { LedgerParseResult, LedgerLine, LedgerTieOut } from './wtb_ledger';

/* ============================================================
   Asseris — Working Trial Balance (WTB) + AJE
   ============================================================ */
const { useState: useStateX, useMemo: useMemoX } = React;

const WTB_TABS = [
  { id: 'tb', label: 'Neraca Saldo' },
  { id: 'review', label: 'Analisis Pergerakan' },
  { id: 'group', label: 'Pemetaan FS' },
];

function WTBView() {
  const { fmt, rp } = AMS;
  const { wtb, ajeTotalPosted, wtbImport, aje } = useAudit();
  const { activeEngagement, activeClient } = useFirm();
  const nav = useNav();
  const [tab, setTab] = useStateX('tb');
  const [showAdj, setShowAdj] = useStateX(true);
  const [q, setQ] = useStateX('');
  const [collapsed, setCollapsed] = useStateX({});
  const [drill, setDrill] = useStateX(null);
  const [exporting, setExporting] = useStateX(false);
  const [importOpen, setImportOpen] = useStateX(false);
  const [mapOpen, setMapOpen] = useStateX(false);
  const [ledgerOpen, setLedgerOpen] = useStateX(false);
  const [showIntegrity, setShowIntegrity] = useStateX(false);
  const integrity: WtbIntegrityResult = useMemoX(() => checkWtbIntegrity(wtb, aje), [wtb, aje]);

  const pm = activeEngagement.materiality * 0.75;

  // W10.5 Fase 2 — sealed XLSX register: the full Working Trial Balance, full-rupiah via rp()
  // (SSOT = the same wtb rows the table renders). Δ YoY mirrors the on-screen adjusted-vs-LY view.
  const onExportXlsx = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const rows = wtb.map((r: any) => {
        const yoy = r.ly !== 0 ? ((r.adj - r.ly) / Math.abs(r.ly)) * 100 : 0;
        return [r.code, r.name, r.group, r.lead, rp(r.ly), rp(r.unadj), r.aje ? rp(r.aje) : '—', rp(r.adj), fmt(yoy, 1) + '%'];
      });
      const t = wtb.reduce((a: any, r: any) => ({ ly: a.ly + r.ly, unadj: a.unadj + r.unadj, aje: a.aje + r.aje, adj: a.adj + r.adj }), { ly: 0, unadj: 0, aje: 0, adj: 0 });
      await amsExportXlsx({
        kind: 'wtb-register', scope: 'engagement', scopeId: activeEngagement?.id,
        fileName: `Working Trial Balance - ${activeClient?.name || 'Klien'}.xlsx`,
        firm: 'KAP Wijaya Hartono & Rekan',
        title: `Working Trial Balance — ${activeClient?.name || ''}`,
        meta: [`${activeEngagement?.id || ''} · ${activeEngagement?.fy || 'FY2025'} · ${activeEngagement?.standard || 'SAK'}`,
          `Performance materiality: ${rp(pm)} · saldo penuh dalam Rupiah (setelah penyesuaian audit)`],
        sheets: [{
          name: 'Neraca Saldo Kerja',
          columns: ['Kode', 'Nama Akun', 'Grup FS', 'WP', 'TA Lalu', 'Unadjusted', 'AJE', 'Adjusted', 'Δ YoY'],
          rows,
          totals: ['', 'TOTAL', '', '', rp(t.ly), rp(t.unadj), rp(t.aje), rp(t.adj), ''],
          colWidths: [12, 34, 18, 8, 20, 20, 18, 20, 10],
        }],
      });
    } finally {
      setExporting(false);
    }
  };
  const summary = useMemoX(() => window.computeWtbSummary?.(wtb, pm), [wtb, pm]);

  // group rows
  const groups = useMemoX(() => {
    const order: any[] = [];
    const map = {};
    wtb.filter((r: any) => q === '' || r.name.toLowerCase().includes(q.toLowerCase()) || r.code.includes(q)).forEach((r: any) => {
      if (!(map as any)[r.group]) { (map as any)[r.group] = []; order.push(r.group); }
      (map as any)[r.group].push(r);
    });
    return order.map(g => ({ name: g, rows: (map as any)[g] }));
  }, [wtb, q]);

  const totals = useMemoX(() => {
    const t = { ly: 0, unadj: 0, aje: 0, adj: 0 };
    wtb.forEach((r: any) => { t.ly += r.ly; t.unadj += r.unadj; t.aje += r.aje; t.adj += r.adj; });
    return t;
  }, [wtb]);

  const num = (n: any) => <span className={n < 0 ? 'neg' : ''}>{fmt(n / 1e6, 1)}</span>;

  return (
    <>
      <SubBar moduleId="wtb" right={
        <div className="row gap8 ac">
          <span className="tiny muted mono">PM: Rp {fmt(pm / 1e6, 0)} jt</span>
          <Btn sm onClick={onExportXlsx} disabled={exporting}><I.download size={13} /> {exporting ? 'Menyiapkan…' : 'Export XLSX'}</Btn>
          {wtbImport && wtbImport.rows && <Btn sm onClick={() => setMapOpen(true)} title="Petakan bagan akun klien ke CoA standar"><I.target size={13} /> Petakan Akun</Btn>}
          <Btn sm onClick={() => setLedgerOpen(true)} title="Impor buku besar (GL) untuk detail sub-ledger nyata"><I.table size={13} /> Impor GL</Btn>
          <Btn sm variant="primary" onClick={() => setImportOpen(true)}><I.upload size={14} /> Impor TB</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad">
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
              <button className="chip" onClick={() => setShowIntegrity((s: boolean) => !s)} title="Integritas neraca saldo — footing, rekonsiliasi neraca & AJE (SA 330/500)"
                style={{ cursor: 'pointer', border: '1px solid var(--line)', background: integrity.status === 'ok' ? 'var(--green-bg)' : 'var(--amber-bg)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: integrity.status === 'ok' ? 'var(--green)' : 'var(--amber)' }} />
                {integrity.status === 'ok' ? 'Integritas OK' : 'Perlu perhatian'}
                <I.chevDown size={11} style={{ transform: showIntegrity ? 'rotate(180deg)' : 'none' }} />
              </button>
            </div>
            <div className="row ac gap8">
              <span className="tiny muted">Tampilkan kolom:</span>
              <Seg options={[{ value: true, label: 'Dgn AJE' }, { value: false, label: 'Unadjusted' }]} value={showAdj} onChange={setShowAdj} />
            </div>
          </div>

          {showIntegrity && <WtbIntegrityPanel r={integrity} />}

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
                          const matFlag = Math.abs(base) > pm;
                          return (
                            <tr key={r.key} onClick={() => setDrill(r)} style={{ cursor: 'pointer' }}>
                              <td className="mono tiny muted">{r.code}</td>
                              <td>
                                <span className="row ac gap6">
                                  {r.name}
                                  {matFlag && <span title="Melebihi performance materiality" style={{ color: 'var(--red)' }}><I.flag size={12} /></span>}
                                </span>
                              </td>
                              <td><span className="chip tiny" style={{ height: 18, padding: '0 6px', fontFamily: 'var(--mono)' }}>{r.lead}</span></td>
                              <td className="num muted">{num(r.ly)}</td>
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
                  <tr>
                    <td colSpan={3}>TOTAL (harus = 0, balanced)</td>
                    <td className="num">{num(totals.ly)}</td>
                    <td className="num">{num(totals.unadj)}</td>
                    <td className="num">{num(totals.aje)}</td>
                    {showAdj && <td className="num">{num(totals.adj)}</td>}
                    <td className="num"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Panel>
          <div className="row gap8 tiny muted" style={{ marginTop: 8 }}>
            <span className="row ac gap6"><I.flag size={12} style={{ color: 'var(--red)' }} /> Saldo melebihi performance materiality</span>
            <span>·</span>
            <span>Nilai dalam jutaan Rupiah</span>
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
  const auth = useAuth();
  const canImport = !auth || typeof auth.can !== 'function' || auth.can(CAP.WP_EDIT);
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.4)', zIndex: 90, display: 'grid', placeItems: 'center' }} onClick={onClose}>
      <div className="panel" style={{ width: 900, maxWidth: '96vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' }} onClick={(e: { stopPropagation: () => void }) => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, borderRadius: '4px 4px 0 0' }}>
          <span style={{ width: 38, height: 38, borderRadius: 9, background: 'rgba(255,255,255,.15)', display: 'grid', placeItems: 'center' }}><I.table size={18} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Impor Buku Besar (GL)</div>
            <div className="tiny" style={{ color: '#bcd6e4' }}>Detail transaksi per akun untuk drill sub-ledger nyata · kolom: Kode · Tanggal · Uraian · Dokumen · Jumlah (atau Debit/Kredit)</div>
          </div>
          {!canImport && <Badge kind="amber">Hanya-baca (butuh WP_EDIT)</Badge>}
          <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>

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

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="tiny muted">Disimpan per-perikatan. Drill akun akan menampilkan detail GL nyata + tie-out ke saldo.</span>
          <div className="row gap8">
            {hasLedger && <Btn sm onClick={clearLedger} disabled={!canImport} title="Hapus buku besar terimpor → drill kembali ke ilustrasi sintetik"><I.trash size={13} /> Hapus GL terimpor</Btn>}
            <Btn sm onClick={onClose}>Batal</Btn>
            <Btn sm variant="primary" onClick={apply} disabled={!parsed || !parsed.ok || !canImport}><I.check size={14} /> Terapkan GL</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- W-WTB·3 · Drawer pemetaan bagan akun → CoA standar ---------------- */
function WtbMappingDrawer({ onClose }: { onClose: () => void }) {
  const { fmt } = AMS;
  const { wtbImport, wtbMapping, setWtbMapping } = useAudit();
  const auth = useAuth();
  const canMap = !auth || typeof auth.can !== 'function' || auth.can(CAP.WP_EDIT);
  const srcRows = (wtbImport && Array.isArray(wtbImport.rows)) ? wtbImport.rows : [];
  const [draft, setDraft] = useStateX(() => ({ ...(wtbMapping || {}) }));
  const cov: MappingCoverageResult = useMemoX(() => mappingCoverage(srcRows, draft), [srcRows, draft]);
  const m = (v: number) => fmt(v / 1e6, 1);
  const setOne = (code: string, target: string) => setDraft((d: Record<string, string>) => {
    const n = { ...d }; if (target) n[code] = target; else delete n[code]; return n;
  });
  const apply = () => { if (!canMap) return; setWtbMapping(draft); onClose(); };
  const hasMapping = !!(wtbMapping && Object.keys(wtbMapping).length);
  const clearMapping = () => { if (!canMap) return; setWtbMapping({}); onClose(); };

  // opsi select dikelompokkan per seksi FS
  const groups = [...new Set(STANDARD_COA.map((a: CoaAccount) => a.group))];
  const litCount = cov.psak.engines.filter(e => e.lit).length;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.4)', zIndex: 90, display: 'grid', placeItems: 'center' }} onClick={onClose}>
      <div className="panel" style={{ width: 920, maxWidth: '96vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' }} onClick={(e: { stopPropagation: () => void }) => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, borderRadius: '4px 4px 0 0' }}>
          <span style={{ width: 38, height: 38, borderRadius: 9, background: 'rgba(255,255,255,.15)', display: 'grid', placeItems: 'center' }}><I.target size={18} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Pemetaan Bagan Akun → CoA Standar</div>
            <div className="tiny" style={{ color: '#bcd6e4' }}>Petakan akun klien ke kode standar agar engine PSAK & FS Generator mengenalinya. Akun yang dipetakan ke kode sama digabung.</div>
          </div>
          {!canMap && <Badge kind="amber">Hanya-baca (butuh WP_EDIT)</Badge>}
          <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>

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
              <th style={{ width: 320 }}>Petakan ke (CoA standar)</th><th style={{ width: 90 }}>Status</th>
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

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="tiny muted">Disimpan per-perikatan. Saat diterapkan, WTB di-relabel ke kode standar → canon/FSGEN/cakupan otomatis selaras.</span>
          <div className="row gap8">
            {hasMapping && <Btn sm onClick={clearMapping} disabled={!canMap} title="Hapus pemetaan tersimpan → WTB kembali ke kode klien"><I.trash size={13} /> Hapus pemetaan</Btn>}
            <Btn sm onClick={onClose}>Batal</Btn>
            <Btn sm variant="primary" onClick={apply} disabled={!canMap}><I.check size={14} /> Terapkan Pemetaan</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- W-WTB·1 · Drawer Impor Neraca Saldo (paste/CSV) ---------------- */
const SAMPLE_TB = [
  'Kode\tNama\tTA Lalu\tUnadjusted\tAJE',
  '1-1100\tKas dan Setara Kas\t4.500.000.000\t5.000.000.000\t0',
  '1-1200\tPiutang Usaha\t7.200.000.000\t8.000.000.000\t0',
  '1-1210\tCKPN Piutang\t-400.000.000\t-500.000.000\t0',
  '1-2100\tAset Tetap — Harga Perolehan\t18.000.000.000\t20.000.000.000\t0',
  '1-2110\tAkumulasi Penyusutan\t-5.000.000.000\t-6.000.000.000\t0',
  '1-2500\tAset Pajak Tangguhan\t900.000.000\t1.000.000.000\t0',
  '2-1100\tUtang Usaha\t-3.500.000.000\t-4.000.000.000\t0',
  '2-2300\tLiabilitas Imbalan Kerja\t-1.800.000.000\t-2.000.000.000\t0',
  '3-1100\tModal Saham\t-10.000.000.000\t-10.000.000.000\t0',
  '3-2100\tSaldo Laba\t-10.300.000.000\t-11.500.000.000\t0',
  '4-1100\tPenjualan Bersih\t-27.000.000.000\t-30.000.000.000\t0',
  '5-1100\tBeban Pokok Penjualan\t18.000.000.000\t20.000.000.000\t0',
  '5-3100\tBeban Umum & Administrasi\t4.000.000.000\t4.500.000.000\t0',
  '5-5100\tBeban Pajak Penghasilan\t5.000.000.000\t5.500.000.000\t0',
].join('\n');

function WtbImportDrawer({ onClose }: { onClose: () => void }) {
  const { fmt } = AMS;
  const { setWtbImport, wtbImport } = useAudit();
  const auth = useAuth();
  const canImport = !auth || typeof auth.can !== 'function' || auth.can(CAP.WP_EDIT);
  const [text, setText] = useStateX('');
  const parsed: ParseResult | null = useMemoX(() => (text.trim() ? parseTrialBalance(text) : null), [text]);
  const errors = parsed ? parsed.issues.filter(i => i.level === 'error') : [];
  const warns = parsed ? parsed.issues.filter(i => i.level === 'warn') : [];
  const m = (v: number) => fmt(v / 1e6, 1);

  const apply = () => {
    if (!parsed || !parsed.ok || !canImport) return;
    setWtbImport({
      rows: parsed.rows, meta: parsed.meta, coverage: parsed.coverage,
      importedAt: new Date().toISOString(), source: 'paste-csv',
    });
    onClose();
  };
  const revert = () => { setWtbImport(null); onClose(); };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.4)', zIndex: 90, display: 'grid', placeItems: 'center' }} onClick={onClose}>
      <div className="panel" style={{ width: 940, maxWidth: '96vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' }} onClick={(e: { stopPropagation: () => void }) => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, borderRadius: '4px 4px 0 0' }}>
          <span style={{ width: 38, height: 38, borderRadius: 9, background: 'rgba(255,255,255,.15)', display: 'grid', placeItems: 'center' }}><I.upload size={18} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Impor Neraca Saldo Klien</div>
            <div className="tiny" style={{ color: '#bcd6e4' }}>Tempel dari Excel/CSV · tab/titik-koma/koma · kolom: Kode · Nama · TA Lalu · Unadjusted · AJE (atau Debit/Kredit)</div>
          </div>
          {!canImport && <Badge kind="amber">Hanya-baca (butuh WP_EDIT)</Badge>}
          <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
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
              </>)}
            </div>
          </div>
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="tiny muted">Disimpan per-perikatan (StateDoc · isolasi W7.5). Hilir (materialitas/GC/PSAK/FS) memakai saldo terimpor otomatis.</span>
          <div className="row gap8">
            {wtbImport && wtbImport.rows && <Btn sm onClick={revert} disabled={!canImport}><I.sync size={13} /> Kembali ke demo</Btn>}
            <Btn sm onClick={onClose}>Batal</Btn>
            <Btn sm variant="primary" onClick={apply} disabled={!parsed || !parsed.ok || !canImport}><I.check size={14} /> Terapkan ke WTB</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { WtbImportDrawer });

/* ---------------- W-WTB·2 · Panel integritas neraca saldo ---------------- */
function WtbIntegrityPanel({ r }: { r: WtbIntegrityResult }) {
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
        <Badge kind={r.status === 'ok' ? 'green' : 'amber'}>{r.status === 'ok' ? 'OK' : 'Perlu perhatian'}</Badge>
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
  const { aje, wtbLedger } = useAudit();
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
  const expl = (window.DEFAULT_EXPL || {})[row.code] || (row.note || '');
  const DTABS = [
    { id: 'ledger', label: 'Buku Besar', n: glTie.hasDetail ? glTie.lines.length : txns.length },
    { id: 'move', label: 'Pergerakan' },
    { id: 'aje', label: 'AJE Terkait', n: relAje.length },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.4)', zIndex: 90, display: 'grid', placeItems: 'center' }} onClick={onClose}>
      <div className="panel" style={{ width: 720, maxWidth: '94vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' }} onClick={(e: any) => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, borderRadius: '4px 4px 0 0' }}>
          <span style={{ width: 38, height: 38, borderRadius: 9, background: 'rgba(255,255,255,.15)', display: 'grid', placeItems: 'center' }}><I.table size={18} /></span>
          <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{row.code} · {row.name}</div><div className="tiny" style={{ color: '#bcd6e4' }}>Buku besar pembantu (sub-ledger) · {row.group}</div></div>
          <Badge kind="blue">WP {row.lead}</Badge>
          <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 22, flexWrap: 'wrap' }}>
          <div><div className="tiny muted upper">Saldo Unadjusted</div><div className="mono" style={{ fontWeight: 700, fontSize: 14 }}>Rp {fmt(row.unadj / 1e6, 1)} jt</div></div>
          <div><div className="tiny muted upper">Penyesuaian (AJE)</div><div className="mono" style={{ fontWeight: 700, fontSize: 14, color: row.aje ? 'var(--blue)' : 'var(--ink-3)' }}>{row.aje ? 'Rp ' + fmt(row.aje / 1e6, 1) + ' jt' : '—'}</div></div>
          <div><div className="tiny muted upper">Saldo Adjusted</div><div className="mono" style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)' }}>Rp {fmt(row.adj / 1e6, 1)} jt</div></div>
          <div><div className="tiny muted upper">TA Lalu</div><div className="mono" style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink-3)' }}>Rp {fmt(row.ly / 1e6, 1)} jt</div></div>
        </div>
        <div style={{ padding: '0 16px', borderBottom: '1px solid var(--line)' }}>
          <div className="tabs">
            {DTABS.map(t => <button key={t.id} className={'tab ' + (dtab === t.id ? 'on' : '')} onClick={() => setDtab(t.id)}>{t.label}{t.n != null && <span className="muted" style={{ marginLeft: 6, fontWeight: 500 }}>{t.n}</span>}</button>)}
          </div>
        </div>
        <div style={{ padding: '10px 16px', overflow: 'auto', flex: 1 }}>
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
              <div className="tiny muted upper" style={{ marginBottom: 5 }}>Penjelasan Analitis (SA 520)</div>
              <div style={{ padding: '9px 11px', border: '1px solid var(--line)', borderLeft: '3px solid var(--blue)', borderRadius: 5, fontSize: 12, lineHeight: 1.55, color: expl ? 'var(--ink-2)' : 'var(--ink-4)' }}>{expl || 'Belum ada penjelasan terdokumentasi — buka tab Analisis Pergerakan untuk mendokumentasikan.'}</div>
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
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="tiny muted">{glTie.hasDetail ? (glTie.tied ? 'Detail GL nyata · tie-out ke saldo unadjusted cocok ✓' : 'Detail GL nyata · tie-out selisih — periksa kelengkapan GL') : 'Detail ilustratif (sintetik) — impor GL untuk sub-ledger nyata'}</span>
          <div className="row gap8">
            <Btn sm onClick={() => { onClose(); nav('workpapers'); }}><I.layers size={13} /> Buka Lead Schedule {row.lead}</Btn>
            <Btn sm variant="primary" onClick={() => { onClose(); nav('sampling'); }}><I.dice size={13} /> Sampling Akun Ini</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- AJE ---------------- */
function AJEViewLegacy() {
  const { fmt } = AMS;
  const { aje, toggleAjeStatus, addAje, wtb } = useAudit();
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
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={aje.length} label="Total AJE" /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={posted.length} label="Posted" accent="var(--green)" /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={proposed.length} label="Proposed" accent="var(--amber)" /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(netPosted / 1e6, 0) + ' jt'} label="Dampak Posted ke Laba" /></div></Panel>
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
                    <td><span onClick={(e: any) => { e.stopPropagation(); if (!locked) toggleAjeStatus(a.id); }} style={{ cursor: locked ? 'default' : 'pointer' }}><Badge>{a.status}</Badge></span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          {selId && (() => {
            const a = aje.find((x: any) => x.id === selId);
            const lines = a.lines || [
              { code: a.dr.split(' ')[0], name: a.dr, debit: a.amount, credit: 0 },
              { code: a.cr.split(' ')[0], name: a.cr, debit: 0, credit: a.amount },
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
function AJEForm({ accounts, onClose, onPost }: any) {
  const { fmt } = AMS;
  const [desc, setDesc] = useStateX('');
  const [ref, setRef] = useStateX('');
  const [lines, setLines] = useStateX([
    { code: '', debit: '', credit: '' },
    { code: '', debit: '', credit: '' },
  ]);

  const setLine = (i: any, patch: any) => setLines((ls: any) => ls.map((l: any, idx: any) => idx === i ? { ...l, ...patch } : l));
  const addLine = () => setLines((ls: any) => [...ls, { code: '', debit: '', credit: '' }]);
  const removeLine = (i: any) => setLines((ls: any) => ls.length > 2 ? ls.filter((_: any, idx: any) => idx !== i) : ls);

  const td = lines.reduce((s: any, l: any) => s + (+l.debit || 0), 0);
  const tc = lines.reduce((s: any, l: any) => s + (+l.credit || 0), 0);
  const balanced = td > 0 && td === tc;
  const allCoded = lines.every((l: any) => !l.code || accounts.find((a: any) => a.code === l.code));
  const filledLines = lines.filter((l: any) => l.code && ((+l.debit || 0) + (+l.credit || 0)) > 0);
  const valid = balanced && desc.trim() && filledLines.length >= 2;

  const post = () => {
    const entry = {
      desc: desc.trim(), ref: ref.trim() || 'JE',
      amount: Math.max(td, tc),
      lines: filledLines.map((l: any) => ({ code: l.code, name: accounts.find((a: any) => a.code === l.code)?.name || l.code, debit: +l.debit || 0, credit: +l.credit || 0 })),
    };
    onPost(entry);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.4)', zIndex: 90, display: 'grid', placeItems: 'center' }} onClick={onClose}>
      <div className="panel" style={{ width: 680, maxWidth: '94vw', boxShadow: 'var(--shadow-lg)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={(e: any) => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, borderRadius: '4px 4px 0 0' }}>
          <I.ledger size={18} />
          <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>Adjusting Journal Entry Baru</div><div className="tiny" style={{ color: '#bcd6e4' }}>Posting langsung ke Working Trial Balance · ENG-2025-014</div></div>
          <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>
        <div style={{ padding: 16, overflow: 'auto' }}>
          <div className="grid" style={{ gridTemplateColumns: '1fr 130px', gap: 10, marginBottom: 14 }}>
            <div className="field"><label>Deskripsi Penyesuaian</label><input className="input" value={desc} onChange={(e: any) => setDesc(e.target.value)} placeholder="mis. Koreksi beban dibayar di muka" /></div>
            <div className="field"><label>Ref. WP</label><input className="input mono" value={ref} onChange={(e: any) => setRef(e.target.value)} placeholder="D-4" /></div>
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

          <div className="panel" style={{ marginTop: 14, padding: '10px 12px', background: balanced ? 'var(--green-bg)' : td || tc ? 'var(--amber-bg)' : 'var(--surface-2)', borderColor: 'transparent' }}>
            <div className="row ac gap8">
              <span style={{ color: balanced ? 'var(--green)' : 'var(--amber)' }}>{balanced ? <I.checkCircle size={16} /> : <I.alert size={16} />}</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>
                {balanced ? 'Jurnal seimbang (Dr = Cr) — siap diposting ke WTB.' : (td || tc) ? `Belum seimbang: selisih Rp ${fmt(Math.abs(td - tc))}` : 'Masukkan minimal satu debit dan satu kredit yang seimbang.'}
              </span>
            </div>
          </div>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn onClick={onClose}>Batal</Btn>
          <Btn variant="primary" disabled={!valid} style={{ opacity: valid ? 1 : .5 }} onClick={post}><I.check size={14} /> Posting ke WTB</Btn>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { WTBView, AJEForm }); // AJEView intentionally overridden by view_aje.jsx (renamed AJEViewLegacy here)


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { AJEForm, WTBView };
