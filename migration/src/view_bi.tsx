/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { FIRMFIN } from './data_firmfin';
import { useFirmCoa } from './use_firm_coa';
import { usePipelineRegister } from './use_pipeline';
import { grossValue, openOpportunities, stageSummary, weightedValue } from './canon_pipeline';
import { useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Avatar, Badge, Btn, Donut, Panel, Seg, Stat } from './ui';
import { amsExportXlsx } from './export_xlsx';
import { BIKlien, BIPartner, BIPendapatan, BIPipeline } from './view_bi2';
import { MSub } from './view_fpm_parts';

/* ============================================================
   Asseris — BI Firma Terkonsolidasi (executive analytics)
   Menyatukan data lintas modul: P&L konsolidasi, pendapatan per
   lini jasa, forecast pipeline tertimbang, konsentrasi klien,
   tren realisasi & utilisasi, scorecard partner.
   ============================================================ */
const { useState: useBI } = React;

const BI_PARTNER_UTIL = { 'Hartono Wijaya': 71, 'Rudi Gunawan': 68, 'Sari Dewanti': 74 };

/* mini multi-series bar+line chart */
function BIChart({ months, bars, line, barColor, lineColor, barMax, lineMax, unit }: any) {
  const bmax = barMax || Math.max(...bars) * 1.15;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 150, position: 'relative', padding: '14px 0 0' }}>
        {bars.map((v: any, i: any) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end', position: 'relative' }}>
            {line && <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: `calc(${(line[i] / (lineMax || 100)) * 100}% + 2px)`, width: 6, height: 6, borderRadius: '50%', background: lineColor, zIndex: 2 }} title={line[i] + (unit || '%')} />}
            <div style={{ width: '70%', maxWidth: 30, height: (v / bmax * 100) + '%', background: barColor, borderRadius: '3px 3px 0 0', minHeight: 2 }} title={v} />
            <span className="tiny muted" style={{ fontSize: 11 }}>{months[i]}</span>
          </div>
        ))}
        {/* line polyline overlay */}
        {line && (
          <svg style={{ position: 'absolute', inset: '14px 0 18px', width: '100%', height: 'calc(100% - 32px)', pointerEvents: 'none', overflow: 'visible' }} preserveAspectRatio="none" viewBox="0 0 100 100">
            <polyline fill="none" stroke={lineColor} strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.5"
              points={line.map((v: any, i: any) => `${(i + 0.5) / line.length * 100},${100 - (v / (lineMax || 100)) * 100}`).join(' ')} />
          </svg>
        )}
      </div>
    </div>
  );
}

function FirmBI() {
  const { fmt } = AMS;
  const nav = useNav();
  const B: any = AMS.BI_DATA;
  const CLIENTS = AMS.CLIENTS;
  /* PRD Sales Pipeline PR-1 — register hidup, bukan literal seed `AMS.PIPELINE`.
     Dulu memindahkan kartu di modul Sales Pipeline tidak menggerakkan satu pun
     angka di layar ini; kini satu register untuk seluruh firma (intake +
     cross-sell, yang selama ini tak pernah terhitung di pipeline firma). */
  const { register: PIPELINE } = usePipelineRegister();
  const EQR: any = AMS.EQR_REVIEWS;
  const [metric, setMetric] = useBI('rev');

  /* P&L roll-up — DITURUNKAN dari buku besar (PRD budget-actual-ledger-derived).
     Dulu modul ini menjumlahkan `FIRM_BUDGET[].actual` sendiri: salinan ketiga dari
     aritmetika yang sama, membaca literal yang tak bergerak saat jurnal diposting.
     Akibatnya headline "Laba Operasi" di sini menyatakan 2.800 jt sementara Firm
     Finance & Firm GL menyatakan 2.590 jt — dua angka laba untuk satu firma. */
  const { coa } = useFirmCoa();
  const bud: any = FIRMFIN.budget({ coa });
  const actRev = bud.actRev, profit = bud.actProfit;
  const marginPct = profit / actRev * 100;
  const yoy = (B.fyRevenue / B.prevYearRevenue - 1) * 100;

  /* weighted pipeline */
  const openPipe = openOpportunities(PIPELINE);
  const gross = grossValue(openPipe);
  const weighted = weightedValue(openPipe);
  const byStage = stageSummary(openPipe).map((s) => ({ st: s.stage, gross: s.gross, wt: s.weighted, n: s.n }));
  const maxStage = Math.max(...byStage.map((s: any) => s.gross), 1);

  /* client concentration */
  const active = CLIENTS.filter((c) => c.status === 'Active').slice().sort((a: any, b: any) => b.fee - a.fee);
  const totClientFee = active.reduce((s: any, c: any) => s + c.fee, 0);
  const top1 = active[0].fee / totClientFee * 100;
  const top3 = active.slice(0, 3).reduce((s: any, c: any) => s + c.fee, 0) / totClientFee * 100;
  const hhi = Math.round(active.reduce((s: any, c: any) => s + Math.pow(c.fee / totClientFee * 100, 2), 0));

  /* partner book */
  const partners = Object.values(CLIENTS.reduce((m: any, c) => {
    const p = c.partner.split(',')[0];
    if (!m[p]) m[p] = { p, fee: 0, n: 0 };
    m[p].fee += c.fee; m[p].n++;
    return m;
  }, {} as any)).sort((a: any, b: any) => b.fee - a.fee);
  const maxPartnerFee = Math.max(...partners.map((p: any) => p.fee));

  const revMax = Math.max(...B.monthlyRev) * 1.15;
  const metrics = { rev: { bars: B.monthlyRev, color: '#005085', label: 'Pendapatan diakui (Rp jt)', max: revMax }, margin: { bars: B.monthlyMargin, color: '#1f7a4d', label: 'Margin (%)', max: 50 }, util: { bars: B.monthlyUtil, color: '#0a6b73', label: 'Utilisasi tim (%)', max: 100 } };
  const m = (metrics as any)[metric];

  const [tab, setTab] = useBI(() => localStorage.getItem('ams.bi.tab') || 'ikhtisar');
  React.useEffect(() => { try { localStorage.setItem('ams.bi.tab', tab); } catch (e) {} }, [tab]);
  const biTabs = [
    { id: 'ikhtisar', label: 'Ikhtisar', icon: 'dashboard' },
    { id: 'pendapatan', label: 'Pendapatan', icon: 'coins' },
    { id: 'pipeline', label: 'Pipeline & Forecast', icon: 'trend' },
    { id: 'klien', label: 'Klien & Konsentrasi', icon: 'users' },
    { id: 'partner', label: 'Partner & Produktivitas', icon: 'briefcase' },
  ];

  /* K-06 lanjutan — wire tombol "Paket Laporan Dewan" (dulu mati): ekspor XLSX tersegel
     paket laporan untuk Dewan — P&L, pipeline & konsentrasi klien (Rp jt). */
  const [exporting, setExporting] = useBI(false);
  const onExportBoard = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const stageRows = byStage.map((s: any) => [s.st, s.n, Math.round(s.gross / 1e6), Math.round(s.wt / 1e6)]);
      const clientRows = active.map((c: any) => [c.name, Math.round(c.fee / 1e6), c.status, c.partner || '']);
      await amsExportXlsx({
        kind: 'bi-board', scope: 'firm',
        fileName: 'Paket Laporan Dewan - FY2025.xlsx',
        title: 'Paket Laporan Dewan — Konsolidasi FY2025',
        meta: [`Pendapatan Rp ${Math.round(actRev / 1e6)} jt · laba Rp ${Math.round(profit / 1e6)} jt (${marginPct.toFixed(0)}%)`,
          `Pipeline tertimbang Rp ${Math.round(weighted / 1e6)} jt · konsentrasi 3 klien ${top3.toFixed(0)}% — Rp juta`],
        sheets: [
          { name: 'Pipeline', heading: 'Pipeline per stage (Rp juta)',
            columns: ['Stage', 'Jumlah', 'Gross', 'Tertimbang'], rows: stageRows, colWidths: [16, 9, 14, 14] },
          { name: 'Klien', heading: 'Klien aktif (Rp juta)',
            columns: ['Klien', 'Fee', 'Status', 'Partner'], rows: clientRows, colWidths: [32, 12, 10, 18] },
        ]});
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <SubBar moduleId="bi" right={<div className="row gap8 ac"><Badge kind="blue">Konsolidasi FY2025</Badge><Btn sm onClick={onExportBoard} disabled={exporting}><I.download size={13} /> {exporting ? 'Menyiapkan…' : 'Paket Laporan Dewan'}</Btn></div>} />
      <MSub tabs={biTabs} active={tab} onChange={setTab} />
      {tab === 'pendapatan' && <BIPendapatan />}
      {tab === 'pipeline' && <BIPipeline />}
      {tab === 'klien' && <BIKlien />}
      {tab === 'partner' && <BIPartner />}
      {tab === 'ikhtisar' && <div className="view-scroll"><div className="view-pad">
        {/* KPI strip */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + fmt(actRev / 1e9, 1) + ' M'} label="Pendapatan FY2025" delta={(yoy >= 0 ? '+' : '') + yoy.toFixed(1) + '% YoY'} deltaDir={yoy >= 0 ? 'up' : 'down'} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + fmt(profit / 1e9, 1) + ' M'} label="Laba Operasi" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={marginPct.toFixed(0) + '%'} label="Margin Operasi" accent={marginPct >= 30 ? 'var(--green)' : 'var(--amber)'} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + fmt(weighted / 1e9, 1) + ' M'} label="Pipeline Tertimbang" accent="var(--blue)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={top3.toFixed(0) + '%'} label="Konsentrasi 3 Klien" accent={top3 > 50 ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
        </div>

        {/* trend + service mix */}
        <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: 12, alignItems: 'start', marginBottom: 12 }}>
          <Panel noBody>
            <div className="panel-h"><h3>Tren Kinerja Firma (12 bulan)</h3><div style={{ flex: 1 }} /><Seg options={[{ value: 'rev', label: 'Pendapatan' }, { value: 'margin', label: 'Margin' }, { value: 'util', label: 'Utilisasi' }]} value={metric} onChange={setMetric} /></div>
            <div style={{ padding: '8px 16px 16px' }}>
              <div className="row jb ac" style={{ marginBottom: 4 }}><span className="tiny muted">{m.label}</span>{metric === 'rev' && <span className="tiny" style={{ color: 'var(--amber)' }}>━ Target Rp {fmt(B.targetRevenue / 1e9, 0)} M/thn</span>}</div>
              <BIChart months={B.months} bars={m.bars} barColor={m.color} barMax={m.max} />
              <div className="row jb tiny muted" style={{ marginTop: 6 }}><span>Mar 2025</span><span>{metric === 'rev' ? 'rata-rata Rp ' + fmt(m.bars.reduce((s: any, v: any) => s + v, 0) / 12, 0) + ' jt/bln' : 'rata-rata ' + (m.bars.reduce((s: any, v: any) => s + v, 0) / 12).toFixed(0) + '%'}</span><span>Feb 2026</span></div>
            </div>
          </Panel>

          <Panel noBody>
            <div className="panel-h"><h3>Pendapatan per Lini Jasa</h3></div>
            <div style={{ padding: 14 }}>
              <div className="row gap12 ac" style={{ marginBottom: 14 }}>
                <Donut segments={B.revenueByService.map((s: any) => ({ value: s.amount, color: s.color }))} size={104} thickness={15}
                  center={<><div className="mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{fmt(B.fyRevenue / 1e9, 1)}M</div><div className="tiny muted">total</div></>} />
                <div style={{ flex: 1, display: 'grid', gap: 5 }}>
                  {B.revenueByService.map((s: any) => (
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
                {byStage.map((s: any) => (
                  <div key={s.st}>
                    <div className="row jb tiny" style={{ marginBottom: 3 }}><span style={{ fontWeight: 600 }}>{s.st} <span className="muted">({s.n})</span></span><span className="mono">{fmt(s.wt / 1e6, 0)} jt</span></div>
                    <div style={{ height: 8, borderRadius: 4, background: 'var(--surface-3)', position: 'relative' }}>
                      <div style={{ width: (s.gross / maxStage * 100) + '%', height: '100%', borderRadius: 4, background: 'var(--surface-3)', position: 'absolute' }} />
                      <div style={{ width: (s.gross / maxStage * 100) + '%', height: '100%', borderRadius: 4, background: 'var(--blue-100)', position: 'absolute' }} />
                      <div style={{ width: (s.wt / maxStage * 100) + '%', height: '100%', borderRadius: 4, background: 'var(--blue-solid)', position: 'absolute' }} />
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
                {active.slice(0, 6).map((c: any, i: any) => (
                  <div key={c.id}>
                    <div className="row jb tiny" style={{ marginBottom: 2 }}><span className="truncate" style={{ maxWidth: 150, fontWeight: 600 }}>{c.name.replace('PT ', '')}{c.listed && <span className="badge b-blue" style={{ fontSize: 11, padding: '0 4px', marginLeft: 4 }}>IDX</span>}</span><span className="mono" style={{ fontWeight: 700 }}>{(c.fee / totClientFee * 100).toFixed(0)}%</span></div>
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
              {partners.map((p: any) => {
                const util = (BI_PARTNER_UTIL as any)[p.p] || 70;
                const eqrN = EQR.filter((e: any) => e.partner === p.p).length;
                return (
                  <div key={p.p}>
                    <div className="row ac gap8" style={{ marginBottom: 5 }}>
                      <Avatar name={p.p} size={28} />
                      <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600 }} className="truncate">{p.p}</div><div className="tiny muted">{p.n} klien · {eqrN} EQR · util {util}%</div></div>
                      <div style={{ textAlign: 'right' }}><div className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>Rp {fmt(p.fee / 1e9, 2)}M</div></div>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: (p.fee / maxPartnerFee * 100) + '%', height: '100%', borderRadius: 3, background: 'var(--blue-solid)' }} /></div>
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



/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { BIChart, FirmBI };
