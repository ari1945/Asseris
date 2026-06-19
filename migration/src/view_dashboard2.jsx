/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data.js';
import { useAudit, useFirm, useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { Badge, Btn, Panel, Progress, Stat } from './ui.jsx';
import { HBars, LineChart, StackBar } from './view_fpm_parts.jsx';
import { FIRMFIN } from './data_firmfin.js';

/* ============================================================
   NeoSuite AMS — Firm Dashboard · extra tabs
   Operasional · Finansial · Mutu & Risiko (the Ringkasan tab
   stays in view_dashboard.jsx as the draggable portlet board).
   ============================================================ */
const { useState: useDash2 } = React;

function riskScoreColor(v) { return v >= 15 ? '#b3261e' : v >= 10 ? '#d4641c' : v >= 5 ? '#c79a1e' : '#1f7a4d'; }

/* ---------------- Operasional ---------------- */
function DashOperasional() {
  const { fmt } = AMS;
  const nav = useNav();
  const { engagements, clients, clientById } = useFirm();
  const { team, deadlines } = useAudit();

  const active = engagements.filter(e => e.status !== 'Completed');
  const critical = deadlines.filter(d => d.days <= 14).length;
  const avgBurn = Math.round(engagements.reduce((s, e) => s + e.actualHrs / e.budgetHrs, 0) / engagements.length * 100);
  const overUtil = team.filter(t => t.util > 90).length;

  /* workload per partner */
  const byPartner = Object.values(engagements.reduce((m, e) => {
    const p = e.partner.split(',')[0];
    if (!m[p]) m[p] = { p, n: 0, hrs: 0, budget: 0 };
    m[p].n++; m[p].hrs += e.actualHrs; m[p].budget += e.budgetHrs;
    return m;
  }, {})).sort((a, b) => b.hrs - a.hrs);

  const phases = ['Perencanaan', 'Eksekusi', 'Finalisasi', 'Arsip'];
  const phColor = { Perencanaan: '#5b3fa6', Eksekusi: '#005085', Finalisasi: '#9a6a00', Arsip: '#1f7a4d' };

  return (
    <div className="view-scroll"><div className="view-pad">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 12 }}>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={active.length} label="Engagement Aktif" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={critical} label="Deadline ≤ 14 Hari" accent={critical ? 'var(--red)' : 'var(--green)'} /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={avgBurn + '%'} label="Rata-rata Budget Burn" accent={avgBurn > 90 ? 'var(--amber)' : undefined} /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={overUtil} label="Tim Over-utilised (>90%)" accent={overUtil ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start', marginBottom: 12 }}>
        <Panel title="Beban Kerja per Partner" sub="jam aktual vs anggaran">
          <div style={{ padding: '12px 14px' }}>
            <HBars rows={byPartner.map(p => ({ label: p.p, value: p.hrs, right: fmt(p.hrs) + ' / ' + fmt(p.budget) + 'h', sub: p.n + ' perikatan · burn ' + Math.round(p.hrs / p.budget * 100) + '%', color: p.hrs / p.budget > 0.9 ? 'var(--amber)' : 'var(--blue)' }))} />
          </div>
        </Panel>

        <Panel title="Bottleneck per Fase" sub="distribusi & progres rata-rata">
          <div style={{ padding: '12px 14px', display: 'grid', gap: 10 }}>
            {phases.map(ph => {
              const col = engagements.filter(e => e.phase === ph);
              const avg = col.length ? Math.round(col.reduce((s, e) => s + e.progress, 0) / col.length) : 0;
              return (
                <div key={ph} className="row ac gap10">
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: phColor[ph], flex: '0 0 9px' }} />
                  <span style={{ width: 92, fontSize: 12, fontWeight: 600, flex: '0 0 92px' }}>{ph}</span>
                  <span className="chip tiny" style={{ flex: '0 0 auto' }}>{col.length}</span>
                  <div style={{ flex: 1 }}><Progress value={avg} color={phColor[ph]} /></div>
                  <span className="mono tiny" style={{ width: 34, textAlign: 'right', flex: '0 0 34px' }}>{avg}%</span>
                </div>
              );
            })}
            <div className="panel" style={{ padding: '9px 11px', background: 'var(--amber-bg)', borderColor: 'transparent', marginTop: 2 }}>
              <div className="tiny" style={{ fontWeight: 600, lineHeight: 1.5 }}><I.alert size={11} /> Fase Eksekusi menampung beban terbesar — pantau perikatan dengan burn &gt; 90% agar tidak menggeser tenggat finalisasi.</div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.1fr 1fr', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Deadline Mendatang</h3><div style={{ flex: 1 }} /><Btn sm variant="ghost" onClick={() => nav('scheduler')}><I.calendar size={13} /> Kalender</Btn></div>
          <table className="dtbl">
            <thead><tr><th style={{ width: 50 }}>Hari</th><th>Tugas</th><th>Klien</th><th style={{ width: 90 }}>Tanggal</th><th style={{ width: 80 }}>Status</th></tr></thead>
            <tbody>
              {deadlines.map((d, i) => (
                <tr key={i}>
                  <td className="num" style={{ fontWeight: 700, color: d.sev === 'red' ? 'var(--red)' : d.sev === 'amber' ? 'var(--amber)' : 'var(--navy)' }}>{d.days}h</td>
                  <td className="truncate" style={{ maxWidth: 180, fontWeight: 600 }}>{d.task}</td>
                  <td className="tiny muted truncate" style={{ maxWidth: 130 }}>{d.client}</td>
                  <td className="tiny mono">{d.date}</td>
                  <td><Badge kind={d.sev === 'red' ? 'red' : d.sev === 'amber' ? 'amber' : 'gray'}>{d.sev === 'red' ? 'Kritis' : d.sev === 'amber' ? 'Dekat' : 'Aman'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Kapasitas Tim · 8 Minggu" sub="supply vs demand (jam)" actions={<Btn sm variant="ghost" onClick={() => nav('capacity')}><I.arrowRight size={13} /></Btn>}>
          <div style={{ padding: '12px 14px', display: 'grid', gap: 12 }}>
            {AMS.CAPACITY.grades.map(g => {
              const supply = g.supply.reduce((s, v) => s + v, 0);
              const demand = g.demand.reduce((s, v) => s + v, 0);
              const ratio = Math.round(demand / supply * 100);
              return (
                <div key={g.grade}>
                  <div className="row jb ac" style={{ marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{g.grade}</span>
                    <span className="mono tiny" style={{ fontWeight: 700, color: ratio > 100 ? 'var(--red)' : ratio > 90 ? 'var(--amber)' : 'var(--green)' }}>{ratio}% terisi</span>
                  </div>
                  <Progress value={Math.min(100, ratio)} color={ratio > 100 ? 'var(--red)' : ratio > 90 ? 'var(--amber)' : 'var(--green)'} />
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div></div>
  );
}

/* ---------------- Finansial ---------------- */
function DashFinansial() {
  const { fmt } = AMS;
  const nav = useNav();
  const { engagements } = useFirm();
  const W = FIRMFIN.wip({ engagements });
  const B = AMS.BI_DATA;
  const AGING = AMS.BI_AR_AGING;

  const wipRows = W.register.map(r => ({ id: r.id, client: r.clientShort, wip: r.unbilled, recoverable: r.recoverable, billed: r.billed }));
  const totalWip = W.unbilledTotal;
  const totalAr = AGING.reduce((s, a) => s + a.amount, 0);

  return (
    <div className="view-scroll"><div className="view-pad">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 12 }}>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(totalWip / 1e9, 2) + ' M'} label="WIP Belum Ditagih" accent="var(--amber)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value="87%" label="Collection Rate" delta="+3pp" deltaDir="up" accent="var(--green)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value="87%" label="Realization Rate" delta="+3.1pp" deltaDir="up" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(B.fyRevenue / 1e9, 1) + ' M'} label="Pendapatan FY2025" delta="+11% YoY" deltaDir="up" /></div></Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: 12, alignItems: 'start', marginBottom: 12 }}>
        <Panel title="Tren Pendapatan Diakui" sub="12 bulan · Rp juta" actions={<Btn sm variant="ghost" onClick={() => nav('bi')}><I.trend size={13} /> BI</Btn>}>
          <div style={{ padding: '12px 16px' }}>
            <LineChart labels={B.months} series={[{ name: 'Pendapatan', color: '#005085', data: B.monthlyRev, fill: true }]} yMax={Math.max(...B.monthlyRev) * 1.15} />
          </div>
        </Panel>

        <Panel title="Umur Piutang (AR Aging)" sub={'total Rp ' + fmt(totalAr / 1e9, 2) + ' M'}>
          <div style={{ padding: '12px 14px' }}>
            <div style={{ marginBottom: 12 }}><StackBar parts={AGING.map(a => ({ value: a.amount, color: a.color, label: a.bucket }))} height={11} /></div>
            <HBars rows={AGING.map(a => ({ label: a.bucket, value: a.amount, right: 'Rp ' + fmt(a.amount / 1e6, 0) + ' jt', color: a.color, pct: a.amount / totalAr * 100 }))} />
            <div className="panel" style={{ padding: '9px 11px', background: 'var(--amber-bg)', borderColor: 'transparent', marginTop: 12 }}>
              <div className="tiny" style={{ fontWeight: 600, lineHeight: 1.5 }}><I.clock size={11} /> Rp {fmt(AGING[3].amount / 1e6, 0)} jt jatuh tempo &gt; 90 hari — eskalasi penagihan.</div>
            </div>
          </div>
        </Panel>
      </div>

      <Panel noBody>
        <div className="panel-h"><h3>WIP per Engagement</h3><div style={{ flex: 1 }} /><Btn sm variant="ghost" onClick={() => nav('wip')}><I.hourglass size={13} /> WIP Valuation</Btn></div>
        <table className="dtbl">
          <thead><tr><th>Engagement</th><th>Klien</th><th className="num">Recoverable</th><th className="num">Tertagih</th><th className="num">WIP</th><th style={{ width: 140 }}>Porsi WIP</th></tr></thead>
          <tbody>
            {wipRows.map(r => (
              <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => nav('wip')}>
                <td className="mono tiny" style={{ fontWeight: 700 }}>{r.id}</td>
                <td className="truncate" style={{ maxWidth: 200 }}>{r.client}</td>
                <td className="num">{fmt(r.recoverable / 1e6, 0)} jt</td>
                <td className="num muted">{fmt(r.billed / 1e6, 0)} jt</td>
                <td className="num" style={{ fontWeight: 700, color: 'var(--amber)' }}>{fmt(r.wip / 1e6, 0)} jt</td>
                <td><Progress value={r.wip / totalWip * 100 * 2.2} color="var(--amber)" /></td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td colSpan="4">Total WIP belum ditagih</td><td className="num" style={{ color: 'var(--amber)' }}>{fmt(totalWip / 1e6, 0)} jt</td><td></td></tr></tfoot>
        </table>
      </Panel>
    </div></div>
  );
}

/* ---------------- Mutu & Risiko ---------------- */
function DashMutu() {
  const nav = useNav();
  const { risks, reviewNotes } = useAudit();
  const EQR = AMS.EQR_REVIEWS;
  const IND = AMS.INDEPENDENCE;

  const sig = risks.filter(r => r.likelihood * r.impact >= 12).length;
  const fraud = risks.filter(r => r.fraud).length;
  const openNotes = reviewNotes.filter(n => n.status !== 'resolved');
  const eqrActive = EQR.filter(e => e.status !== 'Selesai').length;
  const declaredPct = Math.round(IND.filter(i => i.declared).length / IND.length * 100);
  const rotationWarn = IND.filter(i => i.tenure >= i.rotationLimit).length;

  const cellRisks = (impact, likelihood) => risks.filter(r => r.impact === impact && r.likelihood === likelihood);

  return (
    <div className="view-scroll"><div className="view-pad">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 12 }}>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={sig} label="Risiko Signifikan (firm)" accent="var(--red)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={eqrActive} label="EQR Berjalan" accent={eqrActive ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={declaredPct + '%'} label="Independensi Terdeklarasi" accent={declaredPct === 100 ? 'var(--green)' : 'var(--amber)'} /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={openNotes.length} label="Catatan Reviu Terbuka" accent={openNotes.length ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '320px 1fr', gap: 12, alignItems: 'start', marginBottom: 12 }}>
        <Panel title="Heatmap Risiko Firma" sub="Dampak × Kemungkinan" actions={<Btn sm variant="ghost" onClick={() => nav('risk')}><I.arrowRight size={13} /></Btn>}>
          <div style={{ padding: '14px 14px 10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 4 }}>
              {[5, 4, 3, 2, 1].map(lk => [1, 2, 3, 4, 5].map(im => {
                const rs = cellRisks(im, lk); const sc = lk * im;
                return <div key={lk + '-' + im} onClick={() => rs[0] && nav('risk')} style={{ aspectRatio: '1', borderRadius: 5, background: riskScoreColor(sc), opacity: rs.length ? 1 : 0.2, display: 'grid', placeItems: 'center', cursor: rs.length ? 'pointer' : 'default' }}>
                  {rs.length > 0 && <span style={{ color: '#fff', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700 }}>{rs.length}</span>}
                </div>;
              }))}
            </div>
            <div className="divider" />
            <div className="row jb tiny"><span className="row ac gap6"><span style={{ width: 10, height: 10, borderRadius: 3, background: '#b3261e' }} />{sig} Significant</span><span className="row ac gap6"><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--amber)' }} />{fraud} Fraud (SA 240)</span></div>
          </div>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Engagement Quality Review (EQR)</h3><div style={{ flex: 1 }} /><Btn sm variant="ghost" onClick={() => nav('eqr')}><I.checkCircle size={13} /> EQR</Btn></div>
          <table className="dtbl">
            <thead><tr><th>Engagement</th><th>Partner</th><th>Reviewer</th><th>Jenis</th><th>Tahap</th><th style={{ width: 90 }}>Status</th></tr></thead>
            <tbody>
              {EQR.map(e => (
                <tr key={e.id} style={{ cursor: 'pointer' }} onClick={() => nav('eqr')}>
                  <td className="mono tiny" style={{ fontWeight: 700 }}>{e.eng}</td>
                  <td className="tiny truncate" style={{ maxWidth: 110 }}>{e.partner}</td>
                  <td className="tiny muted truncate" style={{ maxWidth: 120 }}>{e.reviewer.split(',')[0]}</td>
                  <td><Badge kind={e.type.includes('Wajib') ? 'red' : 'gray'}>{e.type.includes('Wajib') ? 'Wajib' : 'Sukarela'}</Badge></td>
                  <td className="tiny">{e.stage}</td>
                  <td><Badge kind={e.status === 'Selesai' ? 'green' : 'amber'}>{e.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Catatan Reviu Terbuka</h3><div style={{ flex: 1 }} /><span className="chip tiny">{openNotes.length}</span></div>
          <div style={{ maxHeight: 280, overflow: 'auto' }}>
            {openNotes.length === 0 && <div className="muted tiny" style={{ padding: 14 }}>Tidak ada catatan reviu terbuka.</div>}
            {openNotes.map(n => (
              <div key={n.id} className="row gap10" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line-soft)', cursor: 'pointer' }} onClick={() => nav(n.module)}>
                <span style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--blue-100)', color: 'var(--blue)', display: 'grid', placeItems: 'center', flex: '0 0 26px' }}>{React.createElement(I[{ review: 'search2', coaching: 'sparkle', eqr: 'checkCircle', query: 'help' }[n.type] || 'doc'], { size: 14 })}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row ac gap6"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{n.id}</span><Badge>{n.moduleLabel}</Badge></div>
                  <div className="tiny" style={{ lineHeight: 1.4, marginTop: 2 }}>{(n.text || '').slice(0, 90)}{(n.text || '').length > 90 ? '…' : ''}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Independensi & Rotasi Partner</h3><div style={{ flex: 1 }} /><Btn sm variant="ghost" onClick={() => nav('governance')}><I.shield size={13} /></Btn></div>
          <table className="dtbl">
            <thead><tr><th>Partner</th><th>Klien Rotasi</th><th className="num">Tenure</th><th style={{ width: 96 }}>Status</th></tr></thead>
            <tbody>
              {IND.filter(i => i.rotationClient).map(i => {
                const warn = i.tenure >= i.rotationLimit;
                return (
                  <tr key={i.id}>
                    <td style={{ fontWeight: 600 }}>{i.name}</td>
                    <td className="tiny muted truncate" style={{ maxWidth: 150 }}>{i.rotationClient}</td>
                    <td className="num" style={{ color: warn ? 'var(--red)' : 'inherit' }}>{i.tenure}/{i.rotationLimit}</td>
                    <td><Badge kind={warn ? 'red' : 'green'}>{warn ? 'Rotasi Wajib' : 'Aman'}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rotationWarn > 0 && <div style={{ padding: '10px 14px' }}><div className="panel" style={{ padding: '9px 11px', background: 'var(--red-bg)', borderColor: 'transparent' }}><div className="tiny" style={{ fontWeight: 600, lineHeight: 1.5 }}><I.alert size={11} /> {rotationWarn} partner mencapai batas rotasi — siapkan transisi sesuai SA 700 & ketentuan PPPK.</div></div></div>}
        </Panel>
      </div>
    </div></div>
  );
}

Object.assign(window, { DashOperasional, DashFinansial, DashMutu });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { DashFinansial, DashMutu, DashOperasional };
