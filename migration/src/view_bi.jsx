/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Avatar, Badge, Btn, Donut, Panel, Seg, Stat } from './ui.jsx';
import { BIKlien, BIPartner, BIPendapatan, BIPipeline } from './view_bi2.jsx';
import { MSub } from './view_fpm_parts.jsx';

/* ============================================================
   NeoSuite AMS — BI Firma Terkonsolidasi (executive analytics)
   Menyatukan data lintas modul: P&L konsolidasi, pendapatan per
   lini jasa, forecast pipeline tertimbang, konsentrasi klien,
   tren realisasi & utilisasi, scorecard partner.
   ============================================================ */
const { useState: useBI } = React;

const BI_PARTNER_UTIL = { 'Hartono Wijaya': 71, 'Rudi Gunawan': 68, 'Sari Dewanti': 74 };

/* mini multi-series bar+line chart */
function BIChart({ months, bars, line, barColor, lineColor, barMax, lineMax, unit }) {
  const bmax = barMax || Math.max(...bars) * 1.15;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 150, position: 'relative', padding: '14px 0 0' }}>
        {bars.map((v, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end', position: 'relative' }}>
            {line && <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: `calc(${(line[i] / (lineMax || 100)) * 100}% + 2px)`, width: 6, height: 6, borderRadius: '50%', background: lineColor, zIndex: 2 }} title={line[i] + (unit || '%')} />}
            <div style={{ width: '70%', maxWidth: 30, height: (v / bmax * 100) + '%', background: barColor, borderRadius: '3px 3px 0 0', minHeight: 2 }} title={v} />
            <span className="tiny muted" style={{ fontSize: 9.5 }}>{months[i]}</span>
          </div>
        ))}
        {/* line polyline overlay */}
        {line && (
          <svg style={{ position: 'absolute', inset: '14px 0 18px', width: '100%', height: 'calc(100% - 32px)', pointerEvents: 'none', overflow: 'visible' }} preserveAspectRatio="none" viewBox="0 0 100 100">
            <polyline fill="none" stroke={lineColor} strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.5"
              points={line.map((v, i) => `${(i + 0.5) / line.length * 100},${100 - (v / (lineMax || 100)) * 100}`).join(' ')} />
          </svg>
        )}
      </div>
    </div>
  );
}

function FirmBI() {
  const { fmt } = AMS;
  const nav = useNav();
  const B = AMS.BI_DATA;
  const CLIENTS = AMS.CLIENTS;
  const PIPELINE = AMS.PIPELINE;
  const FIRM_BUDGET = AMS.FIRM_BUDGET;
  const EQR = AMS.EQR_REVIEWS;
  const [metric, setMetric] = useBI('rev');

  /* P&L roll-up */
  const actRev = FIRM_BUDGET.filter(b => b.type === 'rev').reduce((s, b) => s + b.actual, 0);
  const actCost = FIRM_BUDGET.filter(b => b.type === 'cost').reduce((s, b) => s + b.actual, 0);
  const profit = actRev - actCost;
  const marginPct = profit / actRev * 100;
  const yoy = (B.fyRevenue / B.prevYearRevenue - 1) * 100;

  /* weighted pipeline */
  const openPipe = PIPELINE.filter(p => !['Won', 'Lost'].includes(p.stage));
  const gross = openPipe.reduce((s, p) => s + p.value, 0);
  const weighted = openPipe.reduce((s, p) => s + p.value * p.prob / 100, 0);
  const stages = ['Lead', 'Qualified', 'Proposal', 'Negotiation'];
  const byStage = stages.map(st => {
    const items = openPipe.filter(p => p.stage === st);
    return { st, gross: items.reduce((s, p) => s + p.value, 0), wt: items.reduce((s, p) => s + p.value * p.prob / 100, 0), n: items.length };
  });
  const maxStage = Math.max(...byStage.map(s => s.gross), 1);

  /* client concentration */
  const active = CLIENTS.filter(c => c.status === 'Active').slice().sort((a, b) => b.fee - a.fee);
  const totClientFee = active.reduce((s, c) => s + c.fee, 0);
  const top1 = active[0].fee / totClientFee * 100;
  const top3 = active.slice(0, 3).reduce((s, c) => s + c.fee, 0) / totClientFee * 100;
  const hhi = Math.round(active.reduce((s, c) => s + Math.pow(c.fee / totClientFee * 100, 2), 0));

  /* partner book */
  const partners = Object.values(CLIENTS.reduce((m, c) => {
    const p = c.partner.split(',')[0];
    if (!m[p]) m[p] = { p, fee: 0, n: 0 };
    m[p].fee += c.fee; m[p].n++;
    return m;
  }, {})).sort((a, b) => b.fee - a.fee);
  const maxPartnerFee = Math.max(...partners.map(p => p.fee));

  const revMax = Math.max(...B.monthlyRev) * 1.15;
  const metrics = { rev: { bars: B.monthlyRev, color: '#005085', label: 'Pendapatan diakui (Rp jt)', max: revMax }, margin: { bars: B.monthlyMargin, color: '#1f7a4d', label: 'Margin (%)', max: 50 }, util: { bars: B.monthlyUtil, color: '#0a6b73', label: 'Utilisasi tim (%)', max: 100 } };
  const m = metrics[metric];

  const [tab, setTab] = useBI(() => localStorage.getItem('ams.bi.tab') || 'ikhtisar');
  React.useEffect(() => { try { localStorage.setItem('ams.bi.tab', tab); } catch (e) {} }, [tab]);
  const biTabs = [
    { id: 'ikhtisar', label: 'Ikhtisar', icon: 'dashboard' },
    { id: 'pendapatan', label: 'Pendapatan', icon: 'coins' },
    { id: 'pipeline', label: 'Pipeline & Forecast', icon: 'trend' },
    { id: 'klien', label: 'Klien & Konsentrasi', icon: 'users' },
    { id: 'partner', label: 'Partner & Produktivitas', icon: 'briefcase' },
  ];

  return (
    <>
      <SubBar moduleId="bi" right={<div className="row gap8 ac"><Badge kind="blue">Konsolidasi FY2025</Badge><Btn sm><I.download size={13} /> Paket Laporan Dewan</Btn></div>} />
      <MSub tabs={biTabs} active={tab} onChange={setTab} />
      {tab === 'pendapatan' && <BIPendapatan />}
      {tab === 'pipeline' && <BIPipeline />}
      {tab === 'klien' && <BIKlien />}
      {tab === 'partner' && <BIPartner />}
      {tab === 'ikhtisar' && <div className="view-scroll"><div className="view-pad">
        {/* KPI strip */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(actRev / 1e9, 1) + ' M'} label="Pendapatan FY2025" delta={(yoy >= 0 ? '+' : '') + yoy.toFixed(1) + '% YoY'} deltaDir={yoy >= 0 ? 'up' : 'down'} /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(profit / 1e9, 1) + ' M'} label="Laba Operasi" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={marginPct.toFixed(0) + '%'} label="Margin Operasi" accent={marginPct >= 30 ? 'var(--green)' : 'var(--amber)'} /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(weighted / 1e9, 1) + ' M'} label="Pipeline Tertimbang" accent="var(--blue)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={top3.toFixed(0) + '%'} label="Konsentrasi 3 Klien" accent={top3 > 50 ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
        </div>

        {/* trend + service mix */}
        <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: 12, alignItems: 'start', marginBottom: 12 }}>
          <Panel noBody>
            <div className="panel-h"><h3>Tren Kinerja Firma (12 bulan)</h3><div style={{ flex: 1 }} /><Seg options={[{ value: 'rev', label: 'Pendapatan' }, { value: 'margin', label: 'Margin' }, { value: 'util', label: 'Utilisasi' }]} value={metric} onChange={setMetric} /></div>
            <div style={{ padding: '8px 16px 16px' }}>
              <div className="row jb ac" style={{ marginBottom: 4 }}><span className="tiny muted">{m.label}</span>{metric === 'rev' && <span className="tiny" style={{ color: 'var(--amber)' }}>━ Target Rp {fmt(B.targetRevenue / 1e9, 0)} M/thn</span>}</div>
              <BIChart months={B.months} bars={m.bars} barColor={m.color} barMax={m.max} />
              <div className="row jb tiny muted" style={{ marginTop: 6 }}><span>Mar 2025</span><span>{metric === 'rev' ? 'rata-rata Rp ' + fmt(m.bars.reduce((s, v) => s + v, 0) / 12, 0) + ' jt/bln' : 'rata-rata ' + (m.bars.reduce((s, v) => s + v, 0) / 12).toFixed(0) + '%'}</span><span>Feb 2026</span></div>
            </div>
          </Panel>

          <Panel noBody>
            <div className="panel-h"><h3>Pendapatan per Lini Jasa</h3></div>
            <div style={{ padding: 14 }}>
              <div className="row gap12 ac" style={{ marginBottom: 14 }}>
                <Donut segments={B.revenueByService.map(s => ({ value: s.amount, color: s.color }))} size={104} thickness={15}
                  center={<><div className="mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{fmt(B.fyRevenue / 1e9, 1)}M</div><div className="tiny muted">total</div></>} />
                <div style={{ flex: 1, display: 'grid', gap: 5 }}>
                  {B.revenueByService.map(s => (
                    <div key={s.svc} className="row jb ac">
                      <span className="row ac gap6" style={{ minWidth: 0 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: s.color, flex: '0 0 9px' }} /><span className="tiny truncate" style={{ fontWeight: 600 }}>{s.svc}</span></span>
                      <span className="mono tiny" style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{(s.amount / B.fyRevenue * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="panel" style={{ padding: '8px 11px', background: 'var(--blue-050)', borderColor: 'transparent' }}>
                <div className="tiny" style={{ lineHeight: 1.5 }}>Jasa non-audit menyumbang <b>{((B.fyRevenue - B.revenueByService[0].amount) / B.fyRevenue * 100).toFixed(0)}%</b> pendapatan — diversifikasi mengurangi ketergantungan pada audit LK.</div>
              </div>
            </div>
          </Panel>
        </div>

        {/* pipeline + concentration + partners */}
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 12, alignItems: 'start' }}>
          {/* weighted pipeline */}
          <Panel noBody>
            <div className="panel-h"><h3>Forecast Pipeline Tertimbang</h3></div>
            <div style={{ padding: 14 }}>
              <div className="row jb ac" style={{ marginBottom: 12 }}>
                <div><div className="tiny muted">Gross</div><div className="mono" style={{ fontSize: 15, fontWeight: 700 }}>Rp {fmt(gross / 1e6, 0)} jt</div></div>
                <I.arrowRight size={16} style={{ color: 'var(--ink-4)' }} />
                <div style={{ textAlign: 'right' }}><div className="tiny muted">Tertimbang prob.</div><div className="mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--blue)' }}>Rp {fmt(weighted / 1e6, 0)} jt</div></div>
              </div>
              <div style={{ display: 'grid', gap: 9 }}>
                {byStage.map(s => (
                  <div key={s.st}>
                    <div className="row jb tiny" style={{ marginBottom: 3 }}><span style={{ fontWeight: 600 }}>{s.st} <span className="muted">({s.n})</span></span><span className="mono">{fmt(s.wt / 1e6, 0)} jt</span></div>
                    <div style={{ height: 8, borderRadius: 4, background: 'var(--surface-3)', position: 'relative' }}>
                      <div style={{ width: (s.gross / maxStage * 100) + '%', height: '100%', borderRadius: 4, background: 'var(--surface-3)', position: 'absolute' }} />
                      <div style={{ width: (s.gross / maxStage * 100) + '%', height: '100%', borderRadius: 4, background: 'var(--blue-100)', position: 'absolute' }} />
                      <div style={{ width: (s.wt / maxStage * 100) + '%', height: '100%', borderRadius: 4, background: 'var(--blue)', position: 'absolute' }} />
                    </div>
                  </div>
                ))}
              </div>
              <Btn sm style={{ width: '100%', marginTop: 12 }} onClick={() => nav('pipeline')}><I.trend size={13} /> Buka Sales Pipeline</Btn>
            </div>
          </Panel>

          {/* client concentration */}
          <Panel noBody>
            <div className="panel-h"><h3>Konsentrasi Klien</h3><div style={{ flex: 1 }} /><span className="chip tiny" title="Herfindahl-Hirschman Index">HHI {hhi}</span></div>
            <div style={{ padding: 14 }}>
              <div style={{ display: 'grid', gap: 7, marginBottom: 12 }}>
                {active.slice(0, 6).map((c, i) => (
                  <div key={c.id}>
                    <div className="row jb tiny" style={{ marginBottom: 2 }}><span className="truncate" style={{ maxWidth: 150, fontWeight: 600 }}>{c.name.replace('PT ', '')}{c.listed && <span className="badge b-blue" style={{ fontSize: 8, padding: '0 4px', marginLeft: 4 }}>IDX</span>}</span><span className="mono" style={{ fontWeight: 700 }}>{(c.fee / totClientFee * 100).toFixed(0)}%</span></div>
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: (c.fee / active[0].fee * 100) + '%', height: '100%', borderRadius: 3, background: i === 0 ? 'var(--amber)' : 'var(--navy)' }} /></div>
                  </div>
                ))}
              </div>
              <div className="panel" style={{ padding: '9px 11px', background: top1 > 25 ? 'var(--amber-bg)' : 'var(--green-bg)', borderColor: 'transparent' }}>
                <div className="tiny" style={{ fontWeight: 600, lineHeight: 1.5 }}><I.alert size={11} /> Klien terbesar {top1.toFixed(0)}% pendapatan. {top1 > 25 ? 'Di atas ambang kehati-hatian 25% — pantau ketergantungan & independensi (imbalan).' : 'Dalam batas sehat.'}</div>
              </div>
            </div>
          </Panel>

          {/* partner scorecard */}
          <Panel noBody>
            <div className="panel-h"><h3>Scorecard Partner</h3></div>
            <div style={{ padding: 14, display: 'grid', gap: 12 }}>
              {partners.map(p => {
                const util = BI_PARTNER_UTIL[p.p] || 70;
                const eqrN = EQR.filter(e => e.partner === p.p).length;
                return (
                  <div key={p.p}>
                    <div className="row ac gap8" style={{ marginBottom: 5 }}>
                      <Avatar name={p.p} size={28} />
                      <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12.5, fontWeight: 600 }} className="truncate">{p.p}</div><div className="tiny muted">{p.n} klien · {eqrN} EQR · util {util}%</div></div>
                      <div style={{ textAlign: 'right' }}><div className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>Rp {fmt(p.fee / 1e9, 2)}M</div></div>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: (p.fee / maxPartnerFee * 100) + '%', height: '100%', borderRadius: 3, background: 'var(--blue)' }} /></div>
                  </div>
                );
              })}
              <Btn sm style={{ width: '100%' }} onClick={() => nav('profitability')}><I.coins size={13} /> Profitabilitas Detail</Btn>
            </div>
          </Panel>
        </div>

        <div className="tiny muted" style={{ marginTop: 10, lineHeight: 1.5 }}>BI terkonsolidasi menarik data dari Keuangan Firma (P&L), Pipeline (forecast tertimbang), CRM (konsentrasi & portofolio partner), HCM (utilisasi), dan Mutu (EQR). HHI = indeks konsentrasi; semakin tinggi semakin terkonsentrasi.</div>
      </div></div>}
    </>
  );
}

Object.assign(window, { FirmBI, BIChart });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { BIChart, FirmBI };
