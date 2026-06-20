/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { AiInsightPanel } from './ai_insights.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel } from './ui.jsx';
import { DiagnosticPanel } from './diagnostics_panel.jsx';
import { AMS_FORENSIC } from './forensic_canon';

/* ============================================================
   NeoSuite AMS — Journal Entry Testing (SA 240 / JET Tool)
   ============================================================ */
const { useState: useStateJ, useMemo: useMemoJ } = React;

/* Kriteria & populasi jurnal ditarik dari sumber kanonik bersama
   (AMS_FORENSIC) — populasi yang SAMA dipakai Forensic Cash Flow. */
const JET_CRITERIA = (AMS_FORENSIC && AMS_FORENSIC.JET_CRITERIA) || [];
const JE_POP = (AMS_FORENSIC && AMS_FORENSIC.JOURNAL_POP) || [];

function JournalEntryTesting() {
  const { fmt } = AMS;
  const [crit, setCrit] = useStateJ(JET_CRITERIA);
  const [selId, setSelId] = useStateJ('JV-24-08841');
  const [tested, setTested] = useStateJ({});
  const [minAmt, setMinAmt] = useStateJ(0);

  const active = crit.filter(c => c.on).map(c => c.id);
  const toggleCrit = (id) => setCrit(cs => cs.map(c => c.id === id ? { ...c, on: !c.on } : c));

  const scored = JE_POP.map(je => {
    const hit = je.flags.filter(f => active.includes(f));
    return { ...je, hit, score: hit.length };
  });
  const flagged = scored.filter(j => j.score > 0 && j.amount >= minAmt).sort((a, b) => b.score - a.score);
  const sel = scored.find(j => j.id === selId) || flagged[0];

  // user stratification
  const byUser: any = {};
  JE_POP.forEach(j => { byUser[j.user] = (byUser[j.user] || 0) + 1; });
  const userStrat: any[] = Object.entries(byUser).sort((a: any, b: any) => b[1] - a[1]);
  const maxUser = Math.max(...userStrat.map((u: any) => u[1]));

  const totalJE = 18452, manualJE = 1240;
  const exceptions = Object.values(tested).filter(v => v === 'exception').length;
  const critLabel = (id) => JET_CRITERIA.find(c => c.id === id)?.label || id;

  const funnel = [
    { l: 'Total Jurnal', v: totalJE, c: '#024661' },
    { l: 'Jurnal Manual', v: manualJE, c: '#005085' },
    { l: 'Memenuhi Kriteria', v: flagged.length + 38, c: '#c79a1e' },
    { l: 'Dipilih untuk Diuji', v: flagged.length, c: '#b3261e' },
  ];

  return (
    <>
      <SubBar moduleId="jet" right={
        <div className="row gap8 ac">
          <Badge kind="blue">SA 240 · ¶32</Badge>
          <Btn sm><I.upload size={13} /> Import GL</Btn>
          <Btn sm variant="primary"><I.flask size={14} /> Jalankan Pengujian</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad">
          <div style={{ marginBottom: 12 }}><DiagnosticPanel area="jet" title="Diagnostik JET — Temuan Otomatis" /></div>
          {/* funnel */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
            {funnel.map((f, i) => (
              <Panel key={i} noBody>
                <div style={{ padding: '11px 14px', borderTop: '3px solid ' + f.c }}>
                  <div className="mono" style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)' }}>{fmt(f.v)}</div>
                  <div className="tiny muted upper">{f.l}</div>
                  {i > 0 && <div className="tiny" style={{ marginTop: 3, color: 'var(--ink-4)' }}>{(f.v / funnel[i - 1].v * 100).toFixed(1)}% dari tahap sebelumnya</div>}
                </div>
              </Panel>
            ))}
          </div>

          <div className="grid" style={{ gridTemplateColumns: '250px 1fr', gap: 12, alignItems: 'start' }}>
            {/* AI Tier-2: triage lintas-modul yang relevan ke JET */}
            <div style={{ gridColumn: '1 / -1' }}><AiInsightPanel scope="jet" title="AI · Triage Risiko Jurnal (lintas-modul)" embedded /></div>
            {/* criteria */}
            <div className="grid" style={{ gap: 12 }}>
              <Panel title="Kriteria Risiko" sub={active.length + ' aktif'}>
                <div style={{ padding: '2px 0' }}>
                  {crit.map(c => (
                    <label key={c.id} className="row gap8" style={{ padding: '8px 2px', cursor: 'pointer', alignItems: 'flex-start', borderBottom: '1px solid var(--line-soft)' }} onClick={() => toggleCrit(c.id)}>
                      <span style={{ flex: '0 0 32px', width: 32, height: 18, borderRadius: 9, background: c.on ? 'var(--blue)' : 'var(--line-strong)', position: 'relative', transition: '.15s', marginTop: 1 }}>
                        <span style={{ position: 'absolute', top: 2, left: c.on ? 16 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: '.15s' }} />
                      </span>
                      <span style={{ fontSize: 11.5, lineHeight: 1.35, color: c.on ? 'var(--ink)' : 'var(--ink-3)' }}>{c.label}</span>
                    </label>
                  ))}
                </div>
                <div className="divider" />
                <div className="row jb ac" style={{ marginBottom: 5 }}><span style={{ fontSize: 11.5, fontWeight: 600 }}>Ambang nilai minimum</span><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>Rp {fmt(minAmt / 1e6, 0)} jt</span></div>
                <input type="range" min="0" max="2000000000" step="50000000" value={minAmt} onChange={e => setMinAmt(+e.target.value)} style={{ width: '100%', accentColor: 'var(--blue)' }} />
              </Panel>
              <Panel title="Stratifikasi per User" sub="frekuensi posting">
                <div style={{ display: 'grid', gap: 7 }}>
                  {userStrat.map(([u, n]) => (
                    <div key={u}>
                      <div className="row jb tiny" style={{ marginBottom: 2 }}><span className="mono">{u}</span><span className="mono" style={{ fontWeight: 700 }}>{n}</span></div>
                      <div style={{ height: 7, borderRadius: 4, background: 'var(--surface-3)' }}><div style={{ width: (n / maxUser * 100) + '%', height: '100%', borderRadius: 4, background: u.includes('adm') || u.includes('cfo') ? 'var(--amber)' : 'var(--blue)' }} /></div>
                    </div>
                  ))}
                </div>
                <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.4 }}>User non-rutin yang menjurnal manual (mis. <b className="mono">cfo.user</b>) menambah risiko management override.</div>
              </Panel>
            </div>

            {/* flagged table + detail */}
            <div className="grid" style={{ gap: 12 }}>
              <Panel noBody>
                <div className="panel-h"><h3>Jurnal Ter-flag</h3><div style={{ flex: 1 }} /><span className="tiny muted">{flagged.length} entri · {exceptions} eksepsi</span></div>
                <table className="dtbl">
                  <thead><tr>
                    <th>No. Jurnal</th><th>Tanggal</th><th>User</th><th className="num">Nilai (Rp)</th><th className="num" style={{ width: 60 }}>Skor</th><th style={{ width: 120 }}>Status Uji</th>
                  </tr></thead>
                  <tbody>
                    {flagged.map(j => (
                      <tr key={j.id} className={j.id === sel.id ? 'sel' : ''} onClick={() => setSelId(j.id)} style={{ cursor: 'pointer' }}>
                        <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{j.id}</td>
                        <td className="mono tiny">{j.date} <span className="muted">{j.time}</span></td>
                        <td className="mono tiny">{j.user}</td>
                        <td className="num">{fmt(j.amount)}</td>
                        <td className="num">
                          <span style={{ display: 'inline-grid', placeItems: 'center', width: 22, height: 22, borderRadius: 5, fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 11, color: '#fff', background: j.score >= 4 ? 'var(--red)' : j.score >= 2 ? 'var(--amber)' : 'var(--green)' }}>{j.score}</span>
                        </td>
                        <td>
                          {tested[j.id] === 'clear' ? <Badge kind="green">Clear</Badge>
                            : tested[j.id] === 'exception' ? <Badge kind="red">Eksepsi</Badge>
                            : <Badge kind="gray">Belum diuji</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>

              {/* detail */}
              {sel && (
                <Panel noBody>
                  <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }} className="row ac gap8">
                    <span className="mono" style={{ fontWeight: 700, color: 'var(--blue)' }}>{sel.id}</span>
                    <span className="tiny muted mono">{sel.date} · {sel.time} · {sel.user}</span>
                    <div style={{ flex: 1 }} />
                    <span className="badge" style={{ background: sel.score >= 4 ? 'var(--red)' : 'var(--amber)', color: '#fff' }}>Skor risiko {sel.score}</span>
                  </div>
                  <div style={{ padding: 14 }}>
                    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <div className="tiny muted upper" style={{ marginBottom: 6 }}>Entri Jurnal</div>
                        <table className="dtbl" style={{ border: '1px solid var(--line)' }}>
                          <thead><tr><th>Akun</th><th className="num">Debit</th><th className="num">Kredit</th></tr></thead>
                          <tbody>
                            <tr><td>{sel.dr}</td><td className="num">{fmt(sel.amount)}</td><td className="num muted">—</td></tr>
                            <tr><td>{sel.cr}</td><td className="num muted">—</td><td className="num">{fmt(sel.amount)}</td></tr>
                          </tbody>
                          <tfoot><tr><td>Total</td><td className="num">{fmt(sel.amount)}</td><td className="num">{fmt(sel.amount)}</td></tr></tfoot>
                        </table>
                      </div>
                      <div>
                        <div className="tiny muted upper" style={{ marginBottom: 6 }}>Alasan Ter-flag</div>
                        <div className="row wrap gap6" style={{ marginBottom: 14 }}>
                          {sel.hit.length ? sel.hit.map(h => <span key={h} className="badge b-red" style={{ textTransform: 'none', letterSpacing: 0 }}><I.flag size={11} /> {critLabel(h)}</span>) : <span className="tiny muted">Tidak ada (kriteria nonaktif)</span>}
                        </div>
                        <div className="tiny muted upper" style={{ marginBottom: 6 }}>Konklusi Pengujian</div>
                        <div className="row gap8">
                          <Btn sm variant="primary" onClick={() => setTested(t => ({ ...t, [sel.id]: 'clear' }))}><I.check size={14} /> Tandai Clear</Btn>
                          <Btn sm onClick={() => setTested(t => ({ ...t, [sel.id]: 'exception' }))} style={{ color: 'var(--red)', borderColor: 'var(--red)' }}><I.alert size={14} /> Eksepsi</Btn>
                        </div>
                      </div>
                    </div>
                  </div>
                </Panel>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { JournalEntryTesting });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { JournalEntryTesting };
