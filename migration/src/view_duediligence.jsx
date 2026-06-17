/* [codemod] ESM imports */
import React from 'react';
import { useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel, Stat, Tabs } from './ui.jsx';
import { NAReport } from './view_nonaudit2.jsx';

/* ============================================================
   NeoSuite AMS — Financial Due Diligence (Advisory · Non-Asurans)
   Workspace mendalam yang menarik SELURUH angka dari satu sumber
   kebenaran (window.AMS.DUE_DILIGENCE), yang field identitasnya
   sendiri ditarik dari catatan kanonik CRM (OPP-105), Onboarding
   (PROS-06) & Registri Non-Audit (DD-2025-105). NAReport (laporan
   deliverable) tetap dari view_nonaudit2.jsx.
   ============================================================ */
const { useState: useDD } = React;

const DD_STATUS = { 'Selesai': 'green', 'Berjalan': 'amber', 'Belum Mulai': 'gray' };
const DD_SEV = { 'Tinggi': 'red', 'Sedang': 'amber', 'Rendah': 'gray' };
const DD_PBC = { 'Diterima': 'green', 'Tertunda': 'amber', 'Terlambat': 'red' };
const DD_LIKE = { 'Tinggi': 'red', 'Sedang': 'amber', 'Rendah': 'gray' };

/* ---- helper: derive valuation from the single source ---- */
function ddDerive(D) {
  const reported = D.ebitdaBridge.find(b => b.type === 'base').v / 1e9;
  const normalized = D.normEbitda;
  const netDebt = D.netDebtBridge.reduce((s, x) => s + x.v, 0);
  const foundDebtLike = D.netDebtBridge.filter(x => x.found).reduce((s, x) => s + x.v, 0);
  const nwcAdj = D.nwcCompletion - D.nwcPeg;                 // negatif = kurang dari peg
  const ev = normalized * D.valuation.multiple;
  const equity100 = ev - netDebt + nwcAdj;
  const stake = equity100 * D.stakePct / 100;
  /* tawaran awal (pra-DD): EBITDA dilaporkan × multiple awal, net debt tanpa temuan, tanpa penyesuaian WC */
  const preEv = reported * D.valuation.preDdMultiple;
  const preNetDebt = netDebt - foundDebtLike;
  const preEquity100 = preEv - preNetDebt;
  const preStake = preEquity100 * D.stakePct / 100;
  const chip = preStake - stake;                            // headroom negosiasi yang dibuka DD
  return { reported, normalized, netDebt, foundDebtLike, nwcAdj, ev, equity100, stake, preEv, preNetDebt, preEquity100, preStake, chip };
}

/* ---- mini horizontal bridge bar ---- */
function DDBar({ label, value, max, color, strong }) {
  const { fmt } = window.AMS;
  return (
    <div>
      <div className="row jb tiny" style={{ marginBottom: 3 }}>
        <span style={{ fontWeight: strong ? 700 : 400 }}>{label}</span>
        <span className="mono" style={{ fontWeight: 700, color: value < 0 ? 'var(--red)' : 'var(--ink)' }}>{value < 0 ? '(' + fmt(-value, 1) + ')' : fmt(value, 1)} M</span>
      </div>
      <div style={{ height: strong ? 9 : 7, borderRadius: 4, background: 'var(--surface-3)' }}>
        <div style={{ width: (Math.abs(value) / max * 100) + '%', height: '100%', borderRadius: 4, background: color, opacity: strong ? 1 : .72 }} />
      </div>
    </div>
  );
}

/* ============================================================
   Komponen utama
   ============================================================ */
function DueDiligence() {
  const { fmt } = window.AMS;
  const D = window.AMS.DUE_DILIGENCE;
  const nav = useNav();
  const [tab, setTab] = window.useAmsPersist('dd.tab', 'ikhtisar');
  const [showReport, setShowReport] = useDD(false);

  const X = ddDerive(D);
  const flags = D.workstreams.reduce((s, w) => s + w.flags, 0);
  const doneN = D.workstreams.filter(w => w.status === 'Selesai').length;
  const adjPct = (X.normalized - X.reported) / X.reported * 100;
  const pbcOpen = D.pbc.filter(p => p.status !== 'Diterima').length;

  const tabs = [
    { id: 'ikhtisar', label: 'Ikhtisar' },
    { id: 'qoe', label: 'Quality of Earnings' },
    { id: 'netdebt', label: 'Net Debt & Modal Kerja' },
    { id: 'valuasi', label: 'Valuasi & Harga' },
    { id: 'pajak', label: 'Pajak & Kontinjensi' },
    { id: 'redflags', label: 'Red Flags & SPA', count: D.redFlags.length },
    { id: 'pbc', label: 'Permintaan Data', count: pbcOpen },
  ];

  return (
    <>
      <SubBar moduleId="duediligence" right={<div className="row gap8 ac"><Badge kind="purple">Advisory · Non-Asurans</Badge><Btn sm variant="primary" onClick={() => setShowReport(true)}><I.doc size={13} /> Laporan DD</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">

        {/* ---- header deal ---- */}
        <div className="panel" style={{ padding: '12px 15px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 13 }}>
          <span style={{ width: 42, height: 42, borderRadius: 10, background: '#5b3fa6', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, flex: '0 0 42px' }}>DD</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{D.client} <span className="muted" style={{ fontWeight: 400 }}>→ {D.dealType} {D.target}</span></div>
            <div className="tiny muted">{D.id} · {D.period} · Partner {D.partner.split(',')[0]} · Manajer {D.manager} · Tenggat {D.deadline}</div>
          </div>
          <div className="row ac" style={{ gap: 14 }}>
            <div style={{ textAlign: 'right' }}><div className="tiny muted">Progres</div><div className="mono" style={{ fontWeight: 700, color: 'var(--blue)' }}>{D.progress}%</div></div>
            <div style={{ textAlign: 'right' }}><div className="tiny muted">Imbalan</div><div className="mono" style={{ fontWeight: 700 }}>Rp {fmt(D.fee / 1e6, 0)} jt</div></div>
          </div>
        </div>

        {/* ---- single source of truth provenance strip ---- */}
        <div className="panel" style={{ padding: '10px 13px', marginBottom: 12, background: 'var(--blue-050)', borderColor: 'transparent' }}>
          <div className="row ac gap8" style={{ marginBottom: 8 }}>
            <span style={{ color: 'var(--blue)' }}><I.link2 size={14} /></span>
            <span className="tiny" style={{ fontWeight: 700, letterSpacing: '.02em' }}>SATU SUMBER KEBENARAN</span>
            <span className="tiny muted">— identitas perikatan ditarik dari catatan kanonik, bukan di-hardcode</span>
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {[
              { id: 'crm', ic: 'users', src: D.sourceOpp, lbl: 'CRM · Peluang', val: 'Won · Rp ' + fmt(D.fee / 1e6, 0) + ' jt' },
              { id: 'onboarding', ic: 'flag', src: D.sourceProspect, lbl: 'Onboarding · PMPJ', val: D.pmpj.verified ? 'Terverifikasi · ' + D.pmpj.cddLevel : 'Belum' },
              { id: 'nonaudit', ic: 'flask', src: D.id, lbl: 'Registri Non-Audit', val: D.status + ' · ' + D.progress + '%' },
              { id: 'assurance', ic: 'shield', src: D.relatedEng, lbl: 'Asurans Proyeksi', val: 'SPA 3400 · klien sama' },
            ].map(s => (
              <button key={s.src} type="button" onClick={() => nav(s.id, { from: 'duediligence' })}
                style={{ textAlign: 'left', background: '#fff', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--blue)', flex: '0 0 auto', marginTop: 1 }}>{I[s.ic] ? React.createElement(I[s.ic], { size: 14 }) : null}</span>
                <span style={{ minWidth: 0 }}>
                  <span className="tiny muted" style={{ display: 'block' }}>{s.lbl}</span>
                  <span className="mono" style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--navy)' }}>{s.src}</span>
                  <span className="tiny" style={{ display: 'block', color: 'var(--ink-3)' }}>{s.val}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ---- KPI ---- */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(X.normalized, 1) + ' M'} label="EBITDA Ternormalisasi" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(X.netDebt, 0) + ' M'} label="Net Debt + Debt-like" accent="var(--amber)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(X.stake, 0) + ' M'} label={'Indikasi Harga ' + D.stakePct + '%'} accent="var(--navy)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(X.chip, 0) + ' M'} label="Headroom Negosiasi (DD)" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={D.redFlags.length} label="Red Flag" accent="var(--red)" /></div></Panel>
        </div>

        <Panel noBody>
          <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

          {/* ============ IKHTISAR ============ */}
          {tab === 'ikhtisar' && (
            <div style={{ padding: 16 }}>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'start' }}>
                <div>
                  <div className="tiny muted upper" style={{ marginBottom: 8 }}>Konteks Transaksi</div>
                  <div style={{ display: 'grid', gap: 7 }}>
                    {[
                      ['Target', D.target],
                      ['Profil target', D.targetDesc],
                      ['Jenis transaksi', D.dealType],
                      ['Rasional', D.rationale],
                      ['Periode telaah', D.scopePeriods.join(' · ')],
                      ['Dasar penyelesaian', D.basis],
                    ].map((r, i) => (
                      <div key={i} className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                        <span className="tiny muted" style={{ width: 120, flex: '0 0 120px' }}>{r[0]}</span>
                        <span style={{ fontSize: 12.5, lineHeight: 1.5 }}>{r[1]}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="tiny muted upper" style={{ marginBottom: 8 }}>Progres Workstream</div>
                  <div style={{ display: 'grid', gap: 9 }}>
                    {D.workstreams.map((w, i) => (
                      <div key={i}>
                        <div className="row jb ac" style={{ marginBottom: 3 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 600 }}>{w.area}</span>
                          <span className="row ac gap6"><span className="tiny muted">{w.lead.split(' ')[0]}</span><Badge kind={DD_STATUS[w.status]}>{w.status}</Badge></span>
                        </div>
                        <div className="row ac gap8">
                          <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: w.pct + '%', height: '100%', borderRadius: 3, background: w.pct === 100 ? 'var(--green)' : 'var(--blue)' }} /></div>
                          <span className="mono tiny" style={{ width: 32, textAlign: 'right' }}>{w.pct}%</span>
                          {w.flags ? <span className="badge b-red" style={{ minWidth: 18, textAlign: 'center' }}>{w.flags}</span> : <span className="muted tiny" style={{ width: 18, textAlign: 'center' }}>—</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="panel" style={{ marginTop: 12, padding: '10px 12px', background: 'var(--green-bg)', borderColor: 'transparent' }}>
                    <div className="tiny" style={{ lineHeight: 1.55 }}><b>Dampak DD ke harga:</b> tawaran awal Rp {fmt(X.preStake, 0)} M ({D.stakePct}%) → indikasi pasca-DD Rp {fmt(X.stake, 0)} M; temuan membuka headroom negosiasi <b>Rp {fmt(X.chip, 0)} M</b>.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============ QUALITY OF EARNINGS ============ */}
          {tab === 'qoe' && (() => {
            const bridgeMax = Math.max(...D.ebitdaBridge.map(b => Math.abs(b.v / 1e9)));
            const revMax = Math.max(...D.qoeMonthly.map(m => m.rev));
            return (
              <div style={{ padding: 16 }}>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'start' }}>
                  <div>
                    <div className="tiny muted upper" style={{ marginBottom: 8 }}>Normalisasi EBITDA (jembatan)</div>
                    <div style={{ display: 'grid', gap: 9 }}>
                      {D.ebitdaBridge.map((b, i) => {
                        const v = b.v / 1e9;
                        const isTot = b.type === 'total' || b.type === 'base';
                        const col = b.type === 'add' ? 'var(--green)' : b.type === 'less' ? 'var(--red)' : 'var(--navy)';
                        return <DDBar key={i} label={b.k} value={v} max={bridgeMax} color={col} strong={isTot} />;
                      })}
                    </div>
                    <div className="tiny muted" style={{ marginTop: 10, lineHeight: 1.5 }}>EBITDA ternormalisasi {'Rp ' + fmt(X.normalized, 1) + ' M'} ({adjPct >= 0 ? '+' : ''}{adjPct.toFixed(1)}% vs dilaporkan) → dasar valuation multiple.</div>
                  </div>
                  <div>
                    <div className="tiny muted upper" style={{ marginBottom: 8 }}>Tren Bulanan TTM — Pendapatan & Margin EBITDA</div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 130, padding: '4px 0', borderBottom: '1px solid var(--line)' }}>
                      {D.qoeMonthly.map((m, i) => (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, height: '100%', justifyContent: 'flex-end' }} title={m.m + ': Rp ' + m.rev + ' M · margin ' + m.mgn + '%'}>
                          <div style={{ width: '100%', maxWidth: 20, height: (m.rev / revMax * 96) + 'px', borderRadius: '3px 3px 0 0', background: 'var(--blue)', opacity: .85, position: 'relative' }}>
                            <span style={{ position: 'absolute', top: -3, left: '50%', transform: 'translate(-50%,-100%)', width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 0 2px #fff' }} />
                          </div>
                          <span className="tiny muted" style={{ fontSize: 9 }}>{m.m}</span>
                        </div>
                      ))}
                    </div>
                    <div className="row" style={{ marginTop: 8, gap: 14 }}>
                      <span className="tiny"><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: 'var(--blue)', marginRight: 5, verticalAlign: '-1px' }} />Pendapatan (Rp M)</span>
                      <span className="tiny"><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: 'var(--green)', marginRight: 5, verticalAlign: '-1px' }} />Margin EBITDA ternormalisasi</span>
                    </div>
                    <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 12 }}>
                      <div className="panel" style={{ padding: 10 }}><div className="tiny muted">Pendapatan berulang</div><div className="mono" style={{ fontWeight: 700, color: 'var(--green)' }}>{D.revQuality.recurringPct}%</div></div>
                      <div className="panel" style={{ padding: 10 }}><div className="tiny muted">Retensi pelanggan</div><div className="mono" style={{ fontWeight: 700 }}>{D.revQuality.retentionPct}%</div></div>
                      <div className="panel" style={{ padding: 10 }}><div className="tiny muted">Pertumbuhan organik</div><div className="mono" style={{ fontWeight: 700 }}>+{D.revQuality.organicGrowth}%</div></div>
                    </div>
                  </div>
                </div>
                <div className="tiny muted upper" style={{ margin: '18px 0 8px' }}>Konsentrasi Pelanggan (% pendapatan)</div>
                <div style={{ display: 'grid', gap: 7 }}>
                  {D.customers.map((c, i) => (
                    <div key={i} className="row ac gap10">
                      <span style={{ fontSize: 12.5, fontWeight: c.flag ? 700 : 500, width: 280, flex: '0 0 280px', color: c.flag ? 'var(--red)' : 'var(--ink)' }}>{c.flag && <I.alert size={12} style={{ verticalAlign: '-1px', marginRight: 4 }} />}{c.name}</span>
                      <div style={{ flex: 1, height: 14, borderRadius: 4, background: 'var(--surface-3)' }}><div style={{ width: c.pct + '%', height: '100%', borderRadius: 4, background: c.flag ? 'var(--red)' : 'var(--navy)', opacity: c.flag ? 1 : .65 }} /></div>
                      <span className="mono tiny" style={{ width: 38, textAlign: 'right', fontWeight: 700 }}>{c.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* ============ NET DEBT & MODAL KERJA ============ */}
          {tab === 'netdebt' && (() => {
            const ndMax = Math.max(...D.netDebtBridge.map(x => Math.abs(x.v)), X.netDebt);
            const nwcMax = Math.max(...D.nwcMonthly, D.nwcPeg);
            const ndColor = (x) => x.kind === 'cash' ? 'var(--green)' : x.found ? 'var(--red)' : 'var(--amber)';
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
            return (
              <div style={{ padding: 16 }}>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'start' }}>
                  <div>
                    <div className="tiny muted upper" style={{ marginBottom: 8 }}>Net Debt & Item Debt-like</div>
                    <div style={{ display: 'grid', gap: 9 }}>
                      {D.netDebtBridge.map((x, i) => <DDBar key={i} label={x.k} value={x.v} max={ndMax} color={ndColor(x)} />)}
                      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 8 }}><DDBar label="Net debt total" value={X.netDebt} max={ndMax} color="var(--navy)" strong /></div>
                    </div>
                    <div className="panel" style={{ marginTop: 10, padding: '9px 11px', background: 'var(--red-bg)', borderColor: 'transparent' }}>
                      <div className="tiny" style={{ lineHeight: 1.5 }}><b>Temuan debt-like (merah):</b> Rp {fmt(X.foundDebtLike, 1)} M tidak tercermin di tawaran awal → penyesuaian harga.</div>
                    </div>
                  </div>
                  <div>
                    <div className="tiny muted upper" style={{ marginBottom: 8 }}>Modal Kerja Ternormalisasi vs Peg</div>
                    <div style={{ position: 'relative', height: 130, display: 'flex', alignItems: 'flex-end', gap: 5, padding: '4px 0', borderBottom: '1px solid var(--line)' }}>
                      {/* peg line */}
                      <div style={{ position: 'absolute', left: 0, right: 0, bottom: (D.nwcPeg / nwcMax * 122) + 'px', borderTop: '2px dashed var(--amber)', zIndex: 2 }}>
                        <span className="tiny mono" style={{ position: 'absolute', right: 0, top: -14, color: 'var(--amber)', fontWeight: 700 }}>Peg {fmt(D.nwcPeg, 0)} M</span>
                      </div>
                      {D.nwcMonthly.map((v, i) => {
                        const last = i === D.nwcMonthly.length - 1;
                        return (
                          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, height: '100%', justifyContent: 'flex-end' }} title={months[i] + ': Rp ' + v + ' M'}>
                            <div style={{ width: '100%', maxWidth: 20, height: (v / nwcMax * 122) + 'px', borderRadius: '3px 3px 0 0', background: last ? 'var(--navy)' : 'var(--teal)', opacity: last ? 1 : .55 }} />
                            <span className="tiny muted" style={{ fontSize: 9 }}>{months[i]}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 12 }}>
                      <div className="panel" style={{ padding: 10 }}><div className="tiny muted">Peg (rata-rata 12 bln)</div><div className="mono" style={{ fontWeight: 700 }}>Rp {fmt(D.nwcPeg, 1)} M</div></div>
                      <div className="panel" style={{ padding: 10 }}><div className="tiny muted">Posisi penutupan</div><div className="mono" style={{ fontWeight: 700, color: 'var(--navy)' }}>Rp {fmt(D.nwcCompletion, 1)} M</div></div>
                      <div className="panel" style={{ padding: 10 }}><div className="tiny muted">Selisih vs peg</div><div className="mono" style={{ fontWeight: 700, color: X.nwcAdj < 0 ? 'var(--red)' : 'var(--green)' }}>{X.nwcAdj < 0 ? '(' + fmt(-X.nwcAdj, 1) + ')' : '+' + fmt(X.nwcAdj, 1)} M</div></div>
                    </div>
                    <div className="tiny muted" style={{ marginTop: 10, lineHeight: 1.5 }}>Completion accounts: penyesuaian harga rupiah-per-rupiah atas selisih modal kerja penutupan terhadap peg ternormalisasi.</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ============ VALUASI & HARGA ============ */}
          {tab === 'valuasi' && (() => {
            const rows = [
              { k: 'EBITDA ternormalisasi × ' + fmt(D.valuation.multiple, 1) + 'x', v: X.ev, strong: false, note: 'Enterprise Value' },
              { k: '(−) Net debt & item debt-like', v: -X.netDebt, strong: false, note: '' },
              { k: '(' + (X.nwcAdj < 0 ? '−' : '+') + ') Penyesuaian modal kerja vs peg', v: X.nwcAdj, strong: false, note: '' },
              { k: 'Equity Value (100%)', v: X.equity100, strong: true, note: '' },
              { k: 'Indikasi harga ' + D.stakePct + '% saham', v: X.stake, strong: true, note: 'objek transaksi' },
            ];
            const evMax = Math.max(X.ev, X.equity100);
            return (
              <div style={{ padding: 16 }}>
                <div className="grid" style={{ gridTemplateColumns: '1.25fr 1fr', gap: 16, alignItems: 'start' }}>
                  <div>
                    <div className="tiny muted upper" style={{ marginBottom: 8 }}>Jembatan Enterprise → Equity Value</div>
                    <table className="dtbl">
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={i} style={{ background: r.strong ? 'var(--surface-2)' : 'transparent' }}>
                            <td style={{ fontWeight: r.strong ? 700 : 500, fontSize: 12.5 }}>{r.k}{r.note && <span className="tiny muted" style={{ marginLeft: 6 }}>· {r.note}</span>}</td>
                            <td className="num mono" style={{ fontWeight: 700, color: r.v < 0 ? 'var(--red)' : r.strong ? 'var(--navy)' : 'var(--ink)' }}>{r.v < 0 ? '(' + fmt(-r.v, 1) + ')' : fmt(r.v, 1)} M</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ display: 'grid', gap: 9, marginTop: 14 }}>
                      <DDBar label="Enterprise Value" value={X.ev} max={evMax} color="var(--navy)" strong />
                      <DDBar label="Equity Value (100%)" value={X.equity100} max={evMax} color="var(--blue)" strong />
                      <DDBar label={'Harga ' + D.stakePct + '% saham'} value={X.stake} max={evMax} color="var(--teal)" strong />
                    </div>
                  </div>
                  <div>
                    <div className="tiny muted upper" style={{ marginBottom: 8 }}>Dampak DD pada Negosiasi</div>
                    <div className="panel" style={{ padding: 14 }}>
                      <div className="row jb ac" style={{ marginBottom: 10 }}>
                        <div><div className="tiny muted">Tawaran awal ({fmt(D.valuation.preDdMultiple, 1)}x · EBITDA dilaporkan)</div><div className="mono" style={{ fontSize: 17, fontWeight: 700 }}>Rp {fmt(X.preStake, 0)} M</div></div>
                        <I.arrowRight size={20} style={{ color: 'var(--ink-4)' }} />
                        <div style={{ textAlign: 'right' }}><div className="tiny muted">Indikasi pasca-DD ({fmt(D.valuation.multiple, 1)}x)</div><div className="mono" style={{ fontSize: 17, fontWeight: 700, color: 'var(--navy)' }}>Rp {fmt(X.stake, 0)} M</div></div>
                      </div>
                      <div className="panel" style={{ padding: '10px 12px', background: 'var(--green-bg)', borderColor: 'transparent' }}>
                        <div className="row jb ac"><span className="tiny" style={{ fontWeight: 600 }}>Headroom negosiasi yang dibuka DD</span><span className="mono" style={{ fontWeight: 800, fontSize: 16, color: 'var(--green)' }}>Rp {fmt(X.chip, 0)} M</span></div>
                      </div>
                      <ul style={{ margin: '12px 0 0', paddingLeft: 16, fontSize: 11.5, lineHeight: 1.6, color: 'var(--ink-2)' }}>
                        <li>Multiple turun {fmt(D.valuation.preDdMultiple, 1)}x → {fmt(D.valuation.multiple, 1)}x (kualitas laba & konsentrasi pelanggan).</li>
                        <li>Net debt naik Rp {fmt(X.foundDebtLike, 1)} M dari temuan debt-like.</li>
                        <li>Penyesuaian modal kerja Rp {fmt(-X.nwcAdj, 1)} M (di bawah peg).</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ============ PAJAK & KONTINJENSI ============ */}
          {tab === 'pajak' && (
            <div style={{ padding: 16 }}>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
                <div>
                  <div className="tiny muted upper" style={{ marginBottom: 8 }}>Eksposur Pajak</div>
                  <table className="dtbl">
                    <thead><tr><th>Pos</th><th className="num">Eksposur</th><th>Likelihood</th><th>Status</th></tr></thead>
                    <tbody>
                      {D.taxExposure.map((t, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600, fontSize: 12.5 }}>{t.item}</td>
                          <td className="num mono" style={{ fontWeight: 700 }}>Rp {fmt(t.exposure, 1)} M</td>
                          <td><Badge kind={DD_LIKE[t.likelihood]}>{t.likelihood}</Badge></td>
                          <td className="tiny muted" style={{ whiteSpace: 'normal' }}>{t.status}</td>
                        </tr>
                      ))}
                      <tr style={{ background: 'var(--surface-2)' }}>
                        <td style={{ fontWeight: 700 }}>Total eksposur pajak</td>
                        <td className="num mono" style={{ fontWeight: 700, color: 'var(--red)' }}>Rp {fmt(D.taxExposure.reduce((s, t) => s + t.exposure, 0), 1)} M</td>
                        <td colSpan={2} className="tiny muted">→ usulkan indemnity khusus + escrow</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <div className="tiny muted upper" style={{ marginBottom: 8 }}>Komitmen & Kontinjensi</div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {D.contingencies.map((c, i) => (
                      <div key={i} className="panel" style={{ padding: '10px 12px', boxShadow: 'none' }}>
                        <div className="row jb ac">
                          <span style={{ fontSize: 12.5, fontWeight: 600 }}>{c.item}</span>
                          <span className="mono" style={{ fontWeight: 700 }}>Rp {fmt(c.value, 0)} M</span>
                        </div>
                        <div className="row jb ac" style={{ marginTop: 3 }}>
                          <Badge kind={c.kind === 'Komitmen modal' ? 'blue' : 'amber'}>{c.kind}</Badge>
                          <span className="tiny muted">{c.due}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============ RED FLAGS & SPA ============ */}
          {tab === 'redflags' && (
            <div style={{ padding: 16 }}>
              <div className="tiny muted" style={{ marginBottom: 10, lineHeight: 1.5 }}>Setiap temuan dipetakan ke mekanisme dalam Sale & Purchase Agreement (SPA): penyesuaian harga, indemnity/escrow, warranty, atau condition precedent.</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {D.redFlags.map((f, i) => (
                  <div key={i} className="panel" style={{ padding: '12px 14px', boxShadow: 'none', borderLeft: '3px solid var(--' + DD_SEV[f.sev] + ')' }}>
                    <div className="row ac gap8" style={{ marginBottom: 6 }}>
                      <Badge kind={DD_SEV[f.sev]}>{f.sev}</Badge>
                      <span className="chip tiny">{f.area}</span>
                      <div style={{ flex: 1 }} />
                      <span className="mono tiny muted">Kuantum: Rp {fmt(f.quantum, 1)} M</span>
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.5, marginBottom: 6 }}>{f.t}</div>
                    <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--blue)', flex: '0 0 auto', marginTop: 1 }}><I.scale size={13} /></span>
                      <span className="tiny" style={{ lineHeight: 1.5, color: 'var(--ink-2)' }}><b>Implikasi SPA:</b> {f.spa}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============ PERMINTAAN DATA (PBC) ============ */}
          {tab === 'pbc' && (
            <div style={{ padding: 0 }}>
              <div className="row gap8" style={{ padding: '12px 16px 0' }}>
                {['Diterima', 'Tertunda', 'Terlambat'].map(s => {
                  const n = D.pbc.filter(p => p.status === s).length;
                  return <div key={s} className="panel" style={{ padding: '8px 12px', flex: 1 }}><div className="row jb ac"><span className="tiny muted">{s}</span><span className="mono" style={{ fontWeight: 700, color: 'var(--' + DD_PBC[s] + ')' }}>{n}</span></div></div>;
                })}
              </div>
              <table className="dtbl" style={{ marginTop: 8 }}>
                <thead><tr><th>Ref</th><th>Item</th><th>Kategori</th><th>Penyedia</th><th>Status</th></tr></thead>
                <tbody>
                  {D.pbc.map((p, i) => (
                    <tr key={i}>
                      <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{p.ref}</td>
                      <td style={{ fontWeight: 600, fontSize: 12.5 }}>{p.item}</td>
                      <td><span className="chip tiny">{p.cat}</span></td>
                      <td className="tiny muted">{p.owner}</td>
                      <td><Badge kind={DD_PBC[p.status]}>{p.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div></div>

      {showReport && <NAReport kind="dd" engId={D.id} onClose={() => setShowReport(false)} />}
    </>
  );
}

Object.assign(window, { DueDiligence });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { DueDiligence };
