/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAudit, useFirm, useInitialTab, useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Avatar, Badge, Btn, Panel, Stat } from './ui';
import { MSub } from './view_fpm_parts';
import { RiskKontrol, RiskRespons, RiskTren } from './view_risk2';
import { DiagnosticPanel } from './diagnostics_panel';
import { reconcileRiskResponse } from './canon_audit_plan';
import { amsExportXlsx } from './export_xlsx';

/* ============================================================
   Asseris — Risk Assessment (RoMM register + heatmap)
   ============================================================ */
const { useState: useStateR } = React;

function scoreColor(v: any) {
  if (v >= 15) return '#b3261e';
  if (v >= 10) return '#d4641c';
  if (v >= 5)  return '#c79a1e';
  return '#1f7a4d';
}
function scoreLabel(v: any) {
  if (v >= 15) return 'Significant';
  if (v >= 10) return 'Elevated';
  if (v >= 5)  return 'Moderate';
  return 'Low';
}

function RiskAssessment() {
  const nav = useNav();
  const { risks, updateRisk } = useAudit();
  const { activeEngagement, activeClient } = useFirm();
  const [selId, setSelId] = useStateR(risks[0]?.id ?? null);
  const [hoverCell, setHoverCell] = useStateR(null);
  const [exporting, setExporting] = useStateR(false);
  const sel = risks.find((r: any) => r.id === selId) || risks[0];

  // W10.5 Fase 2 — sealed XLSX risk register (RoMM). No currency: L/I/score are integers.
  const onExportXlsx = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const rows = risks.map((r: any) => {
        const sc = r.likelihood * r.impact;
        return [r.id, r.area, r.assertion, r.assertionLvl ? 'Level Asersi' : 'Level LK', r.desc, r.likelihood, r.impact, sc, scoreLabel(sc), r.fraud ? 'Ya' : '—', r.response, r.owner, r.wp];
      });
      await amsExportXlsx({
        kind: 'risk-register', scope: 'engagement', scopeId: activeEngagement?.id,
        fileName: `Register Risiko (RoMM) - ${activeClient?.name || 'Klien'}.xlsx`,
        firm: 'KAP Wijaya Hartono & Rekan',
        title: `Register Risiko Salah Saji Material (RoMM) — ${activeClient?.name || ''}`,
        meta: [`${activeEngagement?.id || ''} · ${activeEngagement?.fy || 'FY2025'} · SA 315/330`,
          `${risks.length} risiko · skor = Kemungkinan (L) × Dampak (I)`],
        sheets: [{
          name: 'Register RoMM',
          columns: ['ID', 'Area', 'Asersi', 'Tingkat', 'Deskripsi Risiko', 'L', 'I', 'Skor', 'Tingkat Risiko', 'Fraud (SA 240)', 'Respons Audit', 'Penanggung Jawab', 'WP'],
          rows, colWidths: [8, 22, 14, 13, 46, 5, 5, 7, 14, 14, 40, 20, 8],
        }],
      });
    } finally {
      setExporting(false);
    }
  };

  // build 5x5 occupancy
  const cellRisks = (impact: any, likelihood: any) => risks.filter((r: any) => r.impact === impact && r.likelihood === likelihood);

  const sig = risks.filter((r: any) => r.likelihood * r.impact >= 12).length;
  const fraud = risks.filter((r: any) => r.fraud).length;
  /* Validasi silang RoMM → prosedur (SA 315/330): reuse reconcileRiskResponse
     (canon_audit_plan) — dulu hanya dipakai di Memo Strategi, kini surface
     sebagai guardrail di register. */
  const romGap = reconcileRiskResponse({ risks }).rollup;

  const [mtab, setMtab] = useInitialTab('risk', () => localStorage.getItem('ams.risk.tab') || 'register');
  React.useEffect(() => { try { localStorage.setItem('ams.risk.tab', mtab); } catch (e) {} }, [mtab]);
  const riskTabs = [
    { id: 'register', label: 'Register', icon: 'table' },
    { id: 'kontrol', label: 'Peta Kontrol', icon: 'sliders' },
    { id: 'tren', label: 'Tren Risiko', icon: 'trend' },
    { id: 'respons', label: 'Respons & Prosedur', icon: 'flask' },
  ];

  return (
    <>
      <SubBar moduleId="risk" right={mtab === 'register' ?
        <div className="row gap8">
          <Btn sm onClick={onExportXlsx} disabled={exporting}><I.download size={13} /> {exporting ? 'Menyiapkan…' : 'Export Register (XLSX)'}</Btn>
          <Btn sm variant="primary"><I.plus size={14} /> Tambah Risiko</Btn>
        </div> :
        <Badge kind="blue">RoMM · {risks.length} risiko</Badge>
      } />
      <MSub tabs={riskTabs} active={mtab} onChange={setMtab} />
      {mtab === 'kontrol' && <RiskKontrol />}
      {mtab === 'tren' && <RiskTren />}
      {mtab === 'respons' && <RiskRespons />}
      {mtab === 'register' && <div className="view-scroll">
        <div className="view-pad">
          <div style={{ marginBottom: 12 }}><DiagnosticPanel area="risk" title="Diagnostik Risiko — Temuan Otomatis" /></div>
          {romGap.gapRisks > 0 && (
            <div className="panel" style={{ padding: '10px 12px', marginBottom: 12, background: 'var(--amber-bg)', borderColor: 'transparent' }}>
              <div className="row ac gap8">
                <span style={{ color: 'var(--amber)', flex: '0 0 auto' }}><I.alert size={15} /></span>
                <span className="tiny" style={{ fontWeight: 600, lineHeight: 1.5 }}>
                  <b>{romGap.gapRisks}</b> dari {romGap.total} RoMM belum tertaut penuh ke rencana respons (cakupan {romGap.coveragePct}%)
                  {romGap.byKind['no-response'] ? ` · ${romGap.byKind['no-response']} tanpa respons` : ''}
                  {romGap.byKind['no-proc'] ? ` · ${romGap.byKind['no-proc']} tanpa prosedur` : ''}
                  {romGap.byKind['under-response'] ? ` · ${romGap.byKind['under-response']} respons kurang memadai (risiko signifikan/kecurangan)` : ''}
                  {romGap.byKind['no-wp'] ? ` · ${romGap.byKind['no-wp']} tanpa KK` : ''}
                  {' '}— lengkapi tautan di <button type="button" onClick={() => nav('programme', { from: 'risk' })} style={{ background: 'none', border: 0, padding: 0, color: 'var(--blue)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Program Audit</button>.
                </span>
              </div>
            </div>
          )}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 12 }}>
            <Panel><div style={{ padding: '15px 18px' }}><Stat value={risks.length} label="Total RoMM" /></div></Panel>
            <Panel><div style={{ padding: '15px 18px' }}><Stat value={sig} label="Risiko Signifikan" accent="var(--red)" /></div></Panel>
            <Panel><div style={{ padding: '15px 18px' }}><Stat value={fraud} label="Fraud Risk (SA 240)" accent="var(--amber)" /></div></Panel>
            <Panel><div style={{ padding: '15px 18px' }}><Stat value={risks.filter((r: any) => r.assertionLvl).length} label="Level Asersi" /></div></Panel>
          </div>

          <div className="grid" style={{ gridTemplateColumns: '320px 1fr', gap: 12, alignItems: 'start' }}>
            {/* Heatmap */}
            <Panel title="Matriks Risiko" sub="Dampak × Kemungkinan">
              <div style={{ padding: '14px 14px 10px' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {/* y-axis label */}
                  <div style={{ display: 'grid', placeItems: 'center', writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 10, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Kemungkinan →</div>
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 4 }}>
                      {[5, 4, 3, 2, 1].map(lk => (
                        [1, 2, 3, 4, 5].map(im => {
                          const sc = lk * im;
                          const rs = cellRisks(im, lk);
                          const isHover = hoverCell === lk + '-' + im;
                          return (
                            <div key={lk + '-' + im}
                              onMouseEnter={() => setHoverCell(lk + '-' + im)} onMouseLeave={() => setHoverCell(null)}
                              onClick={() => rs[0] && setSelId(rs[0].id)}
                              style={{ aspectRatio: '1', borderRadius: 5, background: scoreColor(sc), opacity: rs.length ? 1 : 0.22, display: 'grid', placeItems: 'center', position: 'relative', cursor: rs.length ? 'pointer' : 'default', boxShadow: isHover && rs.length ? '0 0 0 2px var(--navy)' : 'none', transition: '.1s' }}>
                              {rs.length > 0 && <span style={{ color: '#fff', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700 }}>{rs.length}</span>}
                            </div>
                          );
                        })
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 4, marginTop: 4 }}>
                      {[1, 2, 3, 4, 5].map(n => <div key={n} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>{n}</div>)}
                    </div>
                    <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 4 }}>Dampak →</div>
                  </div>
                </div>
                <div className="divider" />
                <div className="row wrap gap8">
                  {[['Low', 4], ['Moderate', 7], ['Elevated', 12], ['Significant', 18]].map(([l, v]) => (
                    <span key={l} className="row ac gap6 tiny"><span style={{ width: 11, height: 11, borderRadius: 3, background: scoreColor(v) }} />{l}</span>
                  ))}
                </div>
              </div>
            </Panel>

            {/* Register + detail */}
            <div className="grid" style={{ gap: 12 }}>
              <Panel noBody>
                <div className="panel-h"><h3>Register Risiko (RoMM)</h3><div style={{ flex: 1 }} /><span className="tiny muted">Klik baris untuk detail & respons</span></div>
                <table className="dtbl">
                  <thead><tr>
                    <th style={{ width: 50 }}>ID</th><th>Area / Asersi</th><th style={{ width: 130 }}>Deskripsi Risiko</th>
                    <th className="num" style={{ width: 36 }}>L</th><th className="num" style={{ width: 36 }}>I</th>
                    <th className="num" style={{ width: 50 }}>Skor</th><th style={{ width: 100 }}>Tingkat</th><th style={{ width: 44 }}>WP</th>
                  </tr></thead>
                  <tbody>
                    {risks.map((r: any) => {
                      const sc = r.likelihood * r.impact;
                      return (
                        <tr key={r.id} className={r.id === selId ? 'sel' : ''} onClick={() => setSelId(r.id)} style={{ cursor: 'pointer' }}>
                          <td className="mono tiny" style={{ fontWeight: 700 }}>{r.id}</td>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 12 }}>{r.area}</div>
                            <div className="tiny muted row ac gap6">{r.assertion}{r.fraud && <span className="badge b-red" style={{ fontSize: 8.5, padding: '0 5px' }}>FRAUD</span>}</div>
                          </td>
                          <td className="tiny muted truncate" style={{ maxWidth: 240, whiteSpace: 'normal', lineHeight: 1.35 }}>{r.desc}</td>
                          <td className="num mono">{r.likelihood}</td>
                          <td className="num mono">{r.impact}</td>
                          <td className="num"><span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: scoreColor(sc) }}>{sc}</span></td>
                          <td><Badge kind={sc >= 15 ? 'red' : sc >= 10 ? 'amber' : sc >= 5 ? 'amber' : 'green'}>{scoreLabel(sc)}</Badge></td>
                          <td><span className="chip tiny" style={{ height: 18, padding: '0 6px', fontFamily: 'var(--mono)' }}>{r.wp}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Panel>

              {/* detail / response editor */}
              {!sel ? <Panel><div style={{ padding: 20, color: 'var(--ink-3)', fontSize: 12.5, lineHeight: 1.6 }}>Belum ada risiko salah saji material (RoMM) yang teridentifikasi untuk perikatan ini. Tambahkan risiko lewat tombol <b>Tambah Risiko</b> untuk mulai menyusun register.</div></Panel> :
              <Panel noBody>
                <div style={{ background: 'var(--surface-2)', padding: '15px 18px', borderBottom: '1px solid var(--line)' }} className="row ac gap8">
                  <span className="mono" style={{ fontWeight: 700, color: 'var(--blue)' }}>{sel.id}</span>
                  <span style={{ fontWeight: 700 }}>{sel.area}</span>
                  <Badge>{sel.assertion}</Badge>
                  {sel.fraud && <Badge kind="red">Fraud Risk · SA 240</Badge>}
                  {sel.assertionLvl ? <Badge kind="blue">Level Asersi</Badge> : <Badge kind="purple">Level LK</Badge>}
                  <div style={{ flex: 1 }} />
                  <span className="badge" style={{ background: scoreColor(sel.likelihood * sel.impact), color: '#fff' }}>Skor {sel.likelihood * sel.impact}</span>
                </div>
                <div style={{ padding: 14 }}>
                  <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
                    <div>
                      <div className="tiny muted upper" style={{ marginBottom: 4 }}>Deskripsi Risiko</div>
                      <p style={{ margin: '0 0 14px', fontSize: 12.5, lineHeight: 1.55 }}>{sel.desc}</p>
                      <div className="tiny muted upper" style={{ marginBottom: 4 }}>Respons Audit yang Direncanakan</div>
                      <div className="panel" style={{ padding: '9px 11px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
                        <div className="row ac gap8"><span style={{ color: 'var(--blue)' }}><I.arrowRight size={15} /></span><span style={{ fontSize: 12.5, fontWeight: 600 }}>{sel.response}</span></div>
                      </div>
                      <div className="row gap8" style={{ marginTop: 12 }}>
                        <Btn sm variant="primary" onClick={() => nav(sel.proc || (((AMS.RISKS as any[]) || []).find(x => x.id === sel.id) || {}).proc || 'workpapers', { from: 'risk' })}><I.flask size={14} /> Buka Prosedur Respons</Btn>
                        <Btn sm onClick={() => nav('workpapers', { from: 'risk' })}><I.layers size={14} /> Kertas Kerja ({sel.wp})</Btn>
                      </div>
                    </div>
                    <div>
                      <div className="tiny muted upper" style={{ marginBottom: 8 }}>Penilaian (geser untuk ubah)</div>
                      {[['Kemungkinan (L)', 'likelihood'], ['Dampak (I)', 'impact']].map(([lbl, key]) => (
                        <div key={key} style={{ marginBottom: 14 }}>
                          <div className="row jb ac" style={{ marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{lbl}</span>
                            <span className="mono" style={{ fontWeight: 700 }}>{sel[key]}/5</span>
                          </div>
                          <input type="range" min="1" max="5" value={sel[key]} onChange={(e: any) => updateRisk(sel.id, { [key]: +e.target.value })} style={{ width: '100%', accentColor: 'var(--blue)' }} />
                        </div>
                      ))}
                      <div className="divider" />
                      <div className="row jb ac">
                        <span className="tiny muted upper">Penanggung Jawab</span>
                        <span className="row ac gap6"><Avatar name={sel.owner} size={20} /><span style={{ fontSize: 12, fontWeight: 600 }}>{sel.owner}</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              </Panel>}
            </div>
          </div>
        </div>
      </div>}
    </>
  );
}

Object.assign(window, { RiskAssessment });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { RiskAssessment };
