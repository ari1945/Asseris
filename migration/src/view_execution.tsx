/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAudit, useFirm, useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell.jsx';
import { Badge, Btn, LockBanner, Panel, Seg, Stat } from './ui.jsx';
import { TrendBars, WtbAnalytical, WtbGrouping, WtbKpiBand } from './view_wtb_deep';
import { amsExportXlsx } from './export_xlsx.js';

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
  const { wtb, ajeTotalPosted } = useAudit();
  const { activeEngagement, activeClient } = useFirm();
  const nav = useNav();
  const [tab, setTab] = useStateX('tb');
  const [showAdj, setShowAdj] = useStateX(true);
  const [q, setQ] = useStateX('');
  const [collapsed, setCollapsed] = useStateX({});
  const [drill, setDrill] = useStateX(null);
  const [exporting, setExporting] = useStateX(false);

  const pm = activeEngagement.materiality * 0.75;

  // W10.5 Fase 2 — sealed XLSX register: the full Working Trial Balance, full-rupiah via rp()
  // (SSOT = the same wtb rows the table renders). Δ YoY mirrors the on-screen adjusted-vs-LY view.
  const onExportXlsx = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const rows = wtb.map((r) => {
        const yoy = r.ly !== 0 ? ((r.adj - r.ly) / Math.abs(r.ly)) * 100 : 0;
        return [r.code, r.name, r.group, r.lead, rp(r.ly), rp(r.unadj), r.aje ? rp(r.aje) : '—', rp(r.adj), fmt(yoy, 1) + '%'];
      });
      const t = wtb.reduce((a, r) => ({ ly: a.ly + r.ly, unadj: a.unadj + r.unadj, aje: a.aje + r.aje, adj: a.adj + r.adj }), { ly: 0, unadj: 0, aje: 0, adj: 0 });
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
  const summary = useMemoX(() => window.computeWtbSummary(wtb, pm), [wtb, pm]);

  // group rows
  const groups = useMemoX(() => {
    const order = [];
    const map = {};
    wtb.filter(r => q === '' || r.name.toLowerCase().includes(q.toLowerCase()) || r.code.includes(q)).forEach(r => {
      if (!map[r.group]) { map[r.group] = []; order.push(r.group); }
      map[r.group].push(r);
    });
    return order.map(g => ({ name: g, rows: map[g] }));
  }, [wtb, q]);

  const totals = useMemoX(() => {
    const t = { ly: 0, unadj: 0, aje: 0, adj: 0 };
    wtb.forEach(r => { t.ly += r.ly; t.unadj += r.unadj; t.aje += r.aje; t.adj += r.adj; });
    return t;
  }, [wtb]);

  const num = (n) => <span className={n < 0 ? 'neg' : ''}>{fmt(n / 1e6, 1)}</span>;

  return (
    <>
      <SubBar moduleId="wtb" right={
        <div className="row gap8 ac">
          <span className="tiny muted mono">PM: Rp {fmt(pm / 1e6, 0)} jt</span>
          <Btn sm><I.sync size={13} /> Sync GL</Btn>
          <Btn sm onClick={onExportXlsx} disabled={exporting}><I.download size={13} /> {exporting ? 'Menyiapkan…' : 'Export XLSX'}</Btn>
          <Btn sm variant="primary"><I.plus size={14} /> Add Account</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad">
          <WtbKpiBand summary={summary} pm={pm} onGotoReview={() => setTab('review')} />
          <div className="tabs" style={{ marginBottom: 12 }}>
            {WTB_TABS.map(t => <button key={t.id} className={'tab ' + (tab === t.id ? 'on' : '')} onClick={() => setTab(t.id)}>{t.label}{t.id === 'review' && summary.followup ? <span className="badge b-amber" style={{ marginLeft: 7, padding: '0 6px' }}>{summary.followup}</span> : null}</button>)}
          </div>
          {tab === 'review' && <WtbAnalytical pm={pm} onOpenAccount={(r) => setDrill(r)} />}
          {tab === 'group' && <WtbGrouping pm={pm} />}
          {tab === 'tb' && (<>
          {/* toolbar */}
          <div className="row ac jb" style={{ marginBottom: 10 }}>
            <div className="row ac gap8">
              <div className="global-search" style={{ background: 'var(--surface)', border: '1px solid var(--line)', height: 28, maxWidth: 240 }}>
                <I.search2 size={14} style={{ color: 'var(--ink-4)' }} />
                <input style={{ color: 'var(--ink)' }} placeholder="Cari akun / kode…" value={q} onChange={e => setQ(e.target.value)} />
              </div>
              <span className="chip"><span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)' }} /> Balanced</span>
            </div>
            <div className="row ac gap8">
              <span className="tiny muted">Tampilkan kolom:</span>
              <Seg options={[{ value: true, label: 'Dgn AJE' }, { value: false, label: 'Unadjusted' }]} value={showAdj} onChange={setShowAdj} />
            </div>
          </div>

          <Panel noBody style={{ overflow: 'hidden' }}>
            <div style={{ maxHeight: 'calc(100vh - 372px)', overflow: 'auto' }}>
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
                  {groups.map(g => {
                    const gt = g.rows.reduce((a, r) => ({ ly: a.ly + r.ly, unadj: a.unadj + r.unadj, aje: a.aje + r.aje, adj: a.adj + r.adj }), { ly: 0, unadj: 0, aje: 0, adj: 0 });
                    const isCol = collapsed[g.name];
                    return (
                      <React.Fragment key={g.name}>
                        <tr className="group-row" onClick={() => setCollapsed(c => ({ ...c, [g.name]: !c[g.name] }))} style={{ cursor: 'pointer' }}>
                          <td colSpan={3}><span className="row ac gap6"><I.chevDown size={12} style={{ transform: isCol ? 'rotate(-90deg)' : 'none' }} />{g.name}</span></td>
                          <td className="num">{num(gt.ly)}</td>
                          <td className="num">{num(gt.unadj)}</td>
                          <td className="num">{gt.aje ? num(gt.aje) : '—'}</td>
                          {showAdj && <td className="num">{num(gt.adj)}</td>}
                          <td className="num"></td>
                        </tr>
                        {!isCol && g.rows.map(r => {
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
            <span>WTB tersinkron dari GL klien — terakhir 2 jam lalu</span>
          </div>
          </>)}
        </div>
      </div>
      {drill && <WtbDrill row={drill} onClose={() => setDrill(null)} nav={nav} />}
    </>
  );
}

/* WTB account drill — synthetic sub-ledger transactions + lead schedule link */
function WtbDrill({ row, onClose, nav }) {
  const { fmt } = AMS;
  const { aje } = useAudit();
  const [dtab, setDtab] = useStateX('ledger');
  // deterministic synthetic transactions summing to the unadjusted balance
  const txns = useMemoX(() => {
    const target = row.unadj;
    const n = 7;
    const seed = row.code.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
    const rnd = (i) => { const x = Math.sin(seed + i * 13.7) * 10000; return x - Math.floor(x); };
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
  const total = txns.reduce((s, t) => s + t.amount, 0);
  const num = (n) => <span className={n < 0 ? 'neg' : ''}>{fmt(n / 1e6, 1)}</span>;
  const relAje = aje.filter(a => Array.isArray(a.lines)
    ? a.lines.some(l => l.code === row.code)
    : ((a.dr && a.dr.split(' ')[0] === row.code) || (a.cr && a.cr.split(' ')[0] === row.code)));
  const delta = row.adj - row.ly;
  const pct = row.ly !== 0 ? (delta / Math.abs(row.ly)) * 100 : null;
  const expl = (window.DEFAULT_EXPL || {})[row.code] || (row.note || '');
  const DTABS = [
    { id: 'ledger', label: 'Buku Besar', n: txns.length },
    { id: 'move', label: 'Pergerakan' },
    { id: 'aje', label: 'AJE Terkait', n: relAje.length },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.4)', zIndex: 90, display: 'grid', placeItems: 'center' }} onClick={onClose}>
      <div className="panel" style={{ width: 720, maxWidth: '94vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
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
          {dtab === 'ledger' && (<>
          <div className="tiny muted" style={{ margin: '2px 0 6px' }}>{txns.length} transaksi pembentuk saldo unadjusted · Rp jt</div>
          <table className="dtbl">
            <thead><tr><th>ID Transaksi</th><th>Tanggal</th><th>Pihak</th><th>Dokumen</th><th className="num">Jumlah</th></tr></thead>
            <tbody>
              {txns.map(t => (
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
                      {relAje.map(a => (
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
          <span className="tiny muted">Sub-ledger sinkron dari GL klien · tie-out ke saldo buku besar ✓</span>
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
  const posted = aje.filter(a => a.status === 'Posted');
  const proposed = aje.filter(a => a.status === 'Proposed');
  const netPosted = posted.reduce((s, a) => s + a.amount, 0);
  const [showForm, setShowForm] = useStateX(false);
  const [selId, setSelId] = useStateX(null);

  const accounts = wtb.map(r => ({ code: r.code, name: r.name }));

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
                {aje.map(a => (
                  <tr key={a.id} onClick={() => setSelId(selId === a.id ? null : a.id)} style={{ cursor: 'pointer' }} className={selId === a.id ? 'sel' : ''}>
                    <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{a.id}{a.lines && <span title="Diposting ke WTB" style={{ marginLeft: 4, color: 'var(--green)' }}>●</span>}</td>
                    <td>{a.desc}</td>
                    <td><span className="chip tiny" style={{ height: 18, padding: '0 6px', fontFamily: 'var(--mono)' }}>{a.ref}</span></td>
                    <td className="tiny mono muted">{a.lines ? a.lines.filter(l => +l.debit).map(l => l.code).join(', ') : a.dr}</td>
                    <td className="tiny mono muted">{a.lines ? a.lines.filter(l => +l.credit).map(l => l.code).join(', ') : a.cr}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{fmt(a.amount)}</td>
                    <td><span onClick={(e) => { e.stopPropagation(); if (!locked) toggleAjeStatus(a.id); }} style={{ cursor: locked ? 'default' : 'pointer' }}><Badge>{a.status}</Badge></span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          {selId && (() => {
            const a = aje.find(x => x.id === selId);
            const lines = a.lines || [
              { code: a.dr.split(' ')[0], name: a.dr, debit: a.amount, credit: 0 },
              { code: a.cr.split(' ')[0], name: a.cr, debit: 0, credit: a.amount },
            ];
            const td = lines.reduce((s, l) => s + (+l.debit || 0), 0), tc = lines.reduce((s, l) => s + (+l.credit || 0), 0);
            return (
              <Panel className="" noBody style={{ marginTop: 12 }}>
                <div style={{ background: 'var(--surface-2)', padding: '10px 14px', borderBottom: '1px solid var(--line)' }} className="row ac gap8">
                  <span className="mono" style={{ fontWeight: 700, color: 'var(--blue)' }}>{a.id}</span><span style={{ fontWeight: 600 }}>{a.desc}</span>
                  <div style={{ flex: 1 }} /><span className="chip tiny mono">{a.ref}</span><Badge>{a.status}</Badge>
                </div>
                <table className="dtbl">
                  <thead><tr><th>Kode</th><th>Akun</th><th className="num">Debit</th><th className="num">Kredit</th></tr></thead>
                  <tbody>
                    {lines.map((l, i) => (
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
      {showForm && <AJEForm accounts={accounts} onClose={() => setShowForm(false)} onPost={(entry) => { addAje(entry); setShowForm(false); }} />}
    </>
  );
}

/* ---- AJE double-entry form (modal) ---- */
function AJEForm({ accounts, onClose, onPost }) {
  const { fmt } = AMS;
  const [desc, setDesc] = useStateX('');
  const [ref, setRef] = useStateX('');
  const [lines, setLines] = useStateX([
    { code: '', debit: '', credit: '' },
    { code: '', debit: '', credit: '' },
  ]);

  const setLine = (i, patch) => setLines(ls => ls.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  const addLine = () => setLines(ls => [...ls, { code: '', debit: '', credit: '' }]);
  const removeLine = (i) => setLines(ls => ls.length > 2 ? ls.filter((_, idx) => idx !== i) : ls);

  const td = lines.reduce((s, l) => s + (+l.debit || 0), 0);
  const tc = lines.reduce((s, l) => s + (+l.credit || 0), 0);
  const balanced = td > 0 && td === tc;
  const allCoded = lines.every(l => !l.code || accounts.find(a => a.code === l.code));
  const filledLines = lines.filter(l => l.code && ((+l.debit || 0) + (+l.credit || 0)) > 0);
  const valid = balanced && desc.trim() && filledLines.length >= 2;

  const post = () => {
    const entry = {
      desc: desc.trim(), ref: ref.trim() || 'JE',
      amount: Math.max(td, tc),
      lines: filledLines.map(l => ({ code: l.code, name: accounts.find(a => a.code === l.code)?.name || l.code, debit: +l.debit || 0, credit: +l.credit || 0 })),
    };
    onPost(entry);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.4)', zIndex: 90, display: 'grid', placeItems: 'center' }} onClick={onClose}>
      <div className="panel" style={{ width: 680, maxWidth: '94vw', boxShadow: 'var(--shadow-lg)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, borderRadius: '4px 4px 0 0' }}>
          <I.ledger size={18} />
          <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>Adjusting Journal Entry Baru</div><div className="tiny" style={{ color: '#bcd6e4' }}>Posting langsung ke Working Trial Balance · ENG-2025-014</div></div>
          <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>
        <div style={{ padding: 16, overflow: 'auto' }}>
          <div className="grid" style={{ gridTemplateColumns: '1fr 130px', gap: 10, marginBottom: 14 }}>
            <div className="field"><label>Deskripsi Penyesuaian</label><input className="input" value={desc} onChange={e => setDesc(e.target.value)} placeholder="mis. Koreksi beban dibayar di muka" /></div>
            <div className="field"><label>Ref. WP</label><input className="input mono" value={ref} onChange={e => setRef(e.target.value)} placeholder="D-4" /></div>
          </div>

          <div className="tiny muted upper" style={{ marginBottom: 6 }}>Baris Jurnal</div>
          <table className="dtbl" style={{ marginBottom: 8 }}>
            <thead><tr><th>Akun</th><th className="num" style={{ width: 140 }}>Debit</th><th className="num" style={{ width: 140 }}>Kredit</th><th style={{ width: 34 }}></th></tr></thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td style={{ padding: '3px 6px' }}>
                    <select className="select" style={{ width: '100%', height: 26 }} value={l.code} onChange={e => setLine(i, { code: e.target.value })}>
                      <option value="">— pilih akun —</option>
                      {accounts.map(a => <option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '3px 6px' }}><input className="input mono" style={{ width: '100%', height: 26, textAlign: 'right' }} type="number" value={l.debit} onChange={e => setLine(i, { debit: e.target.value, credit: e.target.value ? '' : l.credit })} placeholder="0" /></td>
                  <td style={{ padding: '3px 6px' }}><input className="input mono" style={{ width: '100%', height: 26, textAlign: 'right' }} type="number" value={l.credit} onChange={e => setLine(i, { credit: e.target.value, debit: e.target.value ? '' : l.debit })} placeholder="0" /></td>
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
