/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAudit, useNav } from './contexts';
import { I } from './icons';
import { Badge, Btn, Donut, Panel, Progress, Stat } from './ui';
import { HBars, LineChart } from './view_fpm_parts';

/* ============================================================
   Asseris — Risk Assessment · extra tabs
   Peta Kontrol · Tren Risiko · Respons & Prosedur.
   (Register + heatmap stays in view_risk.jsx.)
   ============================================================ */
const { useState: useRisk2 } = React;

const EFF_COLOR = { 'Efektif': '#1f7a4d', 'Sebagian': '#caa53d', 'Tidak Efektif': '#b3261e' };
function rScoreColor(v) { return v >= 15 ? '#b3261e' : v >= 10 ? '#d4641c' : v >= 5 ? '#c79a1e' : '#1f7a4d'; }

/* ---------------- Peta Kontrol ---------------- */
function RiskKontrol() {
  const nav = useNav();
  const { risks } = useAudit();
  const CTL: any = AMS.RISK_CONTROLS;

  const eff = ['Efektif', 'Sebagian', 'Tidak Efektif'].map(e => ({ e, n: CTL.filter(c => c.effective === e).length }));
  const prev = CTL.filter(c => c.type === 'Preventive').length;
  const det = CTL.filter(c => c.type === 'Detective').length;
  const deficiencies = CTL.filter(c => c.dev);
  const untested = CTL.filter(c => !c.tested).length;

  return (
    <div className="view-scroll"><div className="view-pad">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 12 }}>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={CTL.length} label="Total Kontrol" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={Math.round(eff[0].n / CTL.length * 100) + '%'} label="Kontrol Efektif" accent="var(--green)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={deficiencies.length} label="Defisiensi Teridentifikasi" accent="var(--red)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={untested} label="Belum Diuji" accent={untested ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start', marginBottom: 12 }}>
        <Panel title="Efektivitas Kontrol">
          <div style={{ padding: 14 }} className="row gap12 ac">
            <Donut segments={eff.map(x => ({ value: x.n, color: EFF_COLOR[x.e] }))} size={104} thickness={15}
              center={<><div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)' }}>{CTL.length}</div><div className="tiny muted">kontrol</div></>} />
            <div style={{ flex: 1 }}>
              {eff.map(x => (
                <div key={x.e} className="row jb ac" style={{ padding: '4px 0' }}>
                  <span className="row ac gap6"><span style={{ width: 9, height: 9, borderRadius: 2, background: EFF_COLOR[x.e] }} /><span style={{ fontSize: 12, fontWeight: 600 }}>{x.e}</span></span>
                  <span className="mono tiny" style={{ fontWeight: 700 }}>{x.n}</span>
                </div>
              ))}
              <div className="divider" />
              <div className="row jb tiny"><span className="muted">Preventive</span><span className="mono" style={{ fontWeight: 700 }}>{prev}</span></div>
              <div className="row jb tiny"><span className="muted">Detective</span><span className="mono" style={{ fontWeight: 700 }}>{det}</span></div>
            </div>
          </div>
        </Panel>

        <Panel title="Defisiensi Pengendalian" sub="SA 265 · perlu komunikasi TCWG">
          <div style={{ padding: 14, display: 'grid', gap: 8 }}>
            {deficiencies.map(c => (
              <div key={c.id} className="panel" style={{ padding: '9px 11px', boxShadow: 'none', borderLeft: '3px solid ' + EFF_COLOR[c.effective] }}>
                <div className="row jb ac"><span className="row ac gap6"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{c.id}</span><span style={{ fontSize: 12, fontWeight: 600 }}>{c.name}</span></span><Badge kind={c.effective === 'Tidak Efektif' ? 'red' : 'amber'}>{c.effective}</Badge></div>
                <div className="tiny muted" style={{ marginTop: 2 }}>{c.area} · {c.type} · pemilik {c.owner} · menutup {c.risks.join(', ')}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel noBody>
        <div className="panel-h"><h3>Katalog Kontrol → RoMM</h3><div style={{ flex: 1 }} /><span className="tiny muted">tiap kontrol menutup satu/lebih risiko</span></div>
        <table className="dtbl">
          <thead><tr><th>ID</th><th>Kontrol</th><th>Area</th><th>Jenis</th><th>Frekuensi</th><th>Pemilik</th><th>Otomasi</th><th>Efektivitas</th><th>Risiko</th></tr></thead>
          <tbody>
            {CTL.map(c => (
              <tr key={c.id}>
                <td className="mono tiny" style={{ fontWeight: 700 }}>{c.id}</td>
                <td style={{ fontWeight: 600, maxWidth: 200 }} className="truncate">{c.name}</td>
                <td className="tiny muted">{c.area}</td>
                <td><Badge kind={c.type === 'Preventive' ? 'blue' : 'purple'}>{c.type === 'Preventive' ? 'Preventif' : 'Detektif'}</Badge></td>
                <td className="tiny">{c.freq}</td>
                <td className="tiny muted">{c.owner}</td>
                <td>{c.auto ? <span className="badge b-green" style={{ fontSize: 8.5 }}>AUTO</span> : <span className="badge b-gray" style={{ fontSize: 8.5 }}>MANUAL</span>}</td>
                <td><span className="badge" style={{ background: EFF_COLOR[c.effective], color: '#fff', fontSize: 9 }}>{c.effective}</span></td>
                <td>{c.risks.map(r => <span key={r} className="chip tiny" style={{ marginRight: 3, cursor: 'pointer' }} onClick={() => nav('risk')}>{r}</span>)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div></div>
  );
}

/* ---------------- Tren Risiko ---------------- */
function RiskTren() {
  const { risks } = useAudit();
  const T: any = AMS.RISK_TREND;
  const [selId, setSelId] = useRisk2('R-01');
  const sel = risks.find(r => r.id === selId) || risks[0];
  const series = T.series[selId] || T.series['R-01'];

  const rows = risks.map(r => {
    const s = T.series[r.id] || [0, 0, 0, 0];
    return { id: r.id, area: r.area, inherent: s[0], residual: s[s.length - 1], reduction: s[0] - s[s.length - 1] };
  });
  const maxScore = 20;

  return (
    <div className="view-scroll"><div className="view-pad">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 12 }}>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={T.firmAvg[0]} label="Rata-rata Inheren" accent="var(--red)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={T.firmAvg[T.firmAvg.length - 1]} label="Rata-rata Residual" accent="var(--amber)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={'-' + (T.firmAvg[0] - T.firmAvg[T.firmAvg.length - 1]).toFixed(1)} label="Penurunan Risiko" accent="var(--green)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={rows.filter(r => r.residual >= 12).length} label="Residual Signifikan" accent="var(--red)" /></div></Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr', gap: 12, alignItems: 'start', marginBottom: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Trajektori Risiko Residual</h3><div style={{ flex: 1 }} />
            <select className="select" value={selId} onChange={e => setSelId(e.target.value)} style={{ height: 26, maxWidth: 200 }}>
              {risks.map(r => <option key={r.id} value={r.id}>{r.id} · {r.area}</option>)}
            </select>
          </div>
          <div style={{ padding: '14px 16px' }}>
            <LineChart labels={T.periods} yMax={maxScore}
              series={[{ name: sel.area + ' (residual)', color: '#005085', data: series, fill: true }, { name: 'Rata-rata firma', color: '#9a6a00', data: T.firmAvg }]} />
            <div className="panel" style={{ padding: '9px 11px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)', marginTop: 10 }}>
              <div className="tiny" style={{ lineHeight: 1.5 }}>Risiko <b>{sel.area}</b> turun dari skor inheren <b>{series[0]}</b> ke residual <b>{series[series.length - 1]}</b> setelah penerapan kontrol & prosedur audit terencana.</div>
            </div>
          </div>
        </Panel>

        <Panel title="Jembatan Inheren → Residual" sub="penurunan per risiko">
          <div style={{ padding: 14, display: 'grid', gap: 9 }}>
            {rows.sort((a, b) => b.residual - a.residual).map(r => (
              <div key={r.id}>
                <div className="row jb tiny" style={{ marginBottom: 3 }}><span style={{ fontWeight: 600 }}>{r.id} · {r.area}</span><span className="mono"><span style={{ color: 'var(--ink-4)' }}>{r.inherent}</span> → <b style={{ color: rScoreColor(r.residual) }}>{r.residual}</b></span></div>
                <div style={{ height: 8, borderRadius: 4, background: 'var(--surface-3)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', left: 0, width: (r.inherent / maxScore * 100) + '%', height: '100%', background: 'var(--surface-3)' }} />
                  <div style={{ position: 'absolute', left: 0, width: (r.inherent / maxScore * 100) + '%', height: '100%', background: 'rgba(179,38,30,.18)' }} />
                  <div style={{ position: 'absolute', left: 0, width: (r.residual / maxScore * 100) + '%', height: '100%', borderRadius: 4, background: rScoreColor(r.residual) }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel noBody>
        <div className="panel-h"><h3>Ringkasan Inheren vs Residual</h3></div>
        <table className="dtbl">
          <thead><tr><th>Risiko</th><th>Area</th><th className="num">Skor Inheren</th><th className="num">Skor Residual</th><th className="num">Penurunan</th><th style={{ width: 160 }}>Efektivitas Mitigasi</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td className="mono tiny" style={{ fontWeight: 700 }}>{r.id}</td>
                <td style={{ fontWeight: 600 }}>{r.area}</td>
                <td className="num"><span className="badge" style={{ background: rScoreColor(r.inherent), color: '#fff', fontSize: 9 }}>{r.inherent}</span></td>
                <td className="num"><span className="badge" style={{ background: rScoreColor(r.residual), color: '#fff', fontSize: 9 }}>{r.residual}</span></td>
                <td className="num" style={{ fontWeight: 700, color: 'var(--green)' }}>-{r.reduction}</td>
                <td><Progress value={r.inherent ? r.reduction / r.inherent * 100 : 0} color="var(--green)" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div></div>
  );
}

/* ---------------- Respons & Prosedur ---------------- */
function RiskRespons() {
  const nav = useNav();
  const { risks } = useAudit();

  const approaches = [
    { k: 'Substantif diperluas', n: risks.filter(r => r.likelihood * r.impact >= 12).length, color: '#b3261e' },
    { k: 'Uji pengendalian + substantif', n: risks.filter(r => { const s = r.likelihood * r.impact; return s >= 6 && s < 12; }).length, color: '#caa53d' },
    { k: 'Prosedur analitis substantif', n: risks.filter(r => r.likelihood * r.impact < 6).length, color: '#1f7a4d' },
  ];

  return (
    <div className="view-scroll"><div className="view-pad">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 12 }}>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={risks.length} label="Risiko dengan Respons" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={risks.filter(r => r.fraud).length} label="Respons Fraud (SA 240)" accent="var(--red)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={new Set(risks.map(r => r.wp)).size} label="Prosedur Tertaut (WP)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={risks.filter(r => r.assertionLvl).length} label="Level Asersi" /></div></Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 2fr', gap: 12, alignItems: 'start' }}>
        <Panel title="Pendekatan Respons" sub="sesuai skor risiko">
          <div style={{ padding: 14 }}>
            <HBars rows={approaches.map(a => ({ label: a.k, value: a.n || 0.1, right: a.n + ' risiko', color: a.color }))} />
            <div className="panel" style={{ padding: '9px 11px', background: 'var(--blue-050)', borderColor: 'transparent', marginTop: 12 }}>
              <div className="tiny" style={{ lineHeight: 1.5 }}>Respons audit menyesuaikan sifat, saat & luas prosedur dengan tingkat risiko (SA 330). Risiko signifikan menuntut prosedur substantif yang dirancang khusus.</div>
            </div>
          </div>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Matriks Respons Risiko</h3></div>
          <div style={{ maxHeight: 460, overflow: 'auto' }}>
            {risks.map(r => {
              const sc = r.likelihood * r.impact;
              return (
                <div key={r.id} style={{ padding: '12px 14px', borderBottom: '1px solid var(--line-soft)' }}>
                  <div className="row ac gap8" style={{ marginBottom: 5 }}>
                    <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.id}</span>
                    <span style={{ fontWeight: 700, fontSize: 12.5 }}>{r.area}</span>
                    <Badge>{r.assertion}</Badge>
                    {r.fraud && <Badge kind="red">Fraud · SA 240</Badge>}
                    <div style={{ flex: 1 }} />
                    <span className="badge" style={{ background: rScoreColor(sc), color: '#fff' }}>Skor {sc}</span>
                  </div>
                  <div className="row gap10" style={{ alignItems: 'stretch' }}>
                    <div style={{ flex: 1 }}>
                      <div className="tiny muted upper" style={{ marginBottom: 2 }}>Respons Direncanakan</div>
                      <div className="panel" style={{ padding: '8px 10px', boxShadow: 'none', background: 'var(--surface-2)' }}><div className="row ac gap8"><span style={{ color: 'var(--blue)' }}><I.arrowRight size={14} /></span><span style={{ fontSize: 12, fontWeight: 600 }}>{r.response}</span></div></div>
                    </div>
                    <div style={{ width: 220, flex: '0 0 220px' }}>
                      <div className="tiny muted upper" style={{ marginBottom: 2 }}>Prosedur Tertaut</div>
                      {(() => {
                        const procId = r.proc || (((AMS as any).RISKS || []).find((x: any) => x.id === r.id) || {}).proc || 'workpapers';
                        const pm = (window.MODULE_INDEX || {})[procId] || { label: procId, icon: 'flask' };
                        const PI = I[pm.icon] || I.flask;
                        return (
                          <div style={{ display: 'grid', gap: 5 }}>
                            <button type="button" className="row ac gap7" onClick={() => nav(procId, { from: 'risk' })}
                              style={{ padding: '7px 9px', borderRadius: 7, border: '1px solid var(--line)', borderLeft: '3px solid var(--blue)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'var(--blue-050)'; e.currentTarget.style.borderColor = 'var(--blue-100)'; e.currentTarget.style.borderLeftColor = 'var(--blue)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.borderLeftColor = 'var(--blue)'; }}>
                              <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><PI size={14} /></span>
                              <span style={{ flex: 1, fontSize: 11.5, fontWeight: 600 }}>{pm.label}</span>
                              <I.arrowRight size={12} style={{ color: 'var(--ink-4)' }} />
                            </button>
                            <div className="row ac gap6">
                              <span className="chip tiny mono" style={{ cursor: 'pointer' }} onClick={() => nav('workpapers', { from: 'risk' })} title={'Buka kertas kerja ' + r.wp}>{r.wp}</span>
                              <Btn sm variant="ghost" onClick={() => nav('workpapers', { from: 'risk' })}><I.layers size={13} /> Kertas Kerja</Btn>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div></div>
  );
}

Object.assign(window, { RiskKontrol, RiskTren, RiskRespons });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { RiskKontrol, RiskRespons, RiskTren };
