/* [codemod] ESM imports */
import React from 'react';
import { useAmsPersist, useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel, Stat } from './ui.jsx';

/* ============================================================
   NeoSuite AMS — EQR Workflow (ISQM 2)  ·  Pelaporan PPPK
   Engagement Quality Review sebagai gerbang wajib penerbitan
   opini · Laporan Tahunan KAP ke P2PK/PPPK Kemenkeu.
   ============================================================ */
const { useState: useEQR } = React;

const EQR_STAT = { 'Belum Mulai': 'gray', 'Berjalan': 'amber', 'Selesai': 'green' };

/* ============================================================
   EQR Workflow — mandatory gate before opinion
   ============================================================ */
function EQRWorkflow() {
  const nav = useNav();
  const [reviews, setReviews] = useAmsPersist('eqrReviews.v2', () => window.AMS.EQR_REVIEWS);
  const [sel, setSel] = useEQR(reviews[0].id);

  const setReview = (id, fn) => setReviews(list => list.map(r => r.id === id ? fn(r) : r));
  const r = reviews.find(x => x.id === sel) || reviews[0];
  const meta = (window.AMS.EQR_META || {})[r.id] || {};
  const doneN = r.checklist.filter(c => c.ok).length;
  const allChecked = doneN === r.checklist.length;
  const openFindings = r.findings.filter(f => f.status === 'Terbuka').length;
  const canClear = allChecked && openFindings === 0 && !r.cleared;

  const toggleCheck = (i) => setReview(r.id, pr => ({ ...pr, checklist: pr.checklist.map((c, j) => j === i ? { ...c, ok: !c.ok } : c), status: 'Berjalan' }));
  const clearGate = () => setReview(r.id, pr => ({ ...pr, cleared: true, status: 'Selesai', clearedBy: pr.reviewer, clearedDate: new Date().toISOString().slice(0, 10) }));

  return (
    <>
      <SubBar moduleId="eqr" right={<div className="row gap8 ac"><Badge kind="blue">ISQM 2 · SA 220</Badge></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={reviews.length} label="EQR Aktif" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={reviews.filter(x => x.type.includes('PIE')).length} label="Wajib (PIE/Emiten)" accent="var(--red)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={reviews.filter(x => x.cleared).length + ' / ' + reviews.length} label="Gerbang Lolos" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={reviews.reduce((s, x) => s + x.findings.filter(f => f.status === 'Terbuka').length, 0)} label="Temuan Terbuka" accent="var(--amber)" /></div></Panel>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '300px 1fr', gap: 12, alignItems: 'start' }}>
          {/* list */}
          <Panel noBody>
            <div className="panel-h"><h3>Daftar EQR</h3></div>
            <div style={{ display: 'grid' }}>
              {reviews.map(x => (
                <div key={x.id} onClick={() => setSel(x.id)} style={{ padding: '11px 13px', cursor: 'pointer', borderBottom: '1px solid var(--line-soft)', borderLeft: '3px solid ' + (x.id === sel ? 'var(--blue)' : 'transparent'), background: x.id === sel ? 'var(--blue-050)' : 'transparent' }}>
                  <div className="row jb ac" style={{ marginBottom: 3 }}><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{x.id}</span><Badge kind={EQR_STAT[x.status]}>{x.status}</Badge></div>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }} className="truncate">{x.client.replace('PT ', '')}</div>
                  <div className="row jb ac" style={{ marginTop: 3 }}><span className="tiny muted">{x.reviewer.split(',')[0]}</span><span className="badge tiny" style={{ background: x.type.includes('PIE') ? 'var(--red-bg)' : 'var(--surface-3)', color: x.type.includes('PIE') ? 'var(--red)' : 'var(--ink-3)' }}>{x.type}</span></div>
                </div>
              ))}
            </div>
          </Panel>

          {/* detail */}
          <Panel noBody>
            <div style={{ background: 'linear-gradient(120deg,#013a52,#005085)', color: '#fff', padding: '14px 18px' }}>
              <div className="row jb ac"><div><div style={{ fontSize: 15, fontWeight: 700 }}>{r.client}</div><div className="tiny" style={{ color: '#bcd6e4' }}>{r.id} · {r.eng} · Partner {r.partner} · Reviewer {r.reviewer.split(',')[0]}</div></div>{r.cleared ? <Badge kind="green"><I.checkCircle size={12} /> Gerbang Lolos</Badge> : <Badge kind="amber">Gerbang Terkunci</Badge>}</div>
            </div>
            <div style={{ padding: 16 }}>
              {/* Kelayakan & penunjukan reviewer (ISQM 2 ¶18–20) */}
              {(meta.coolingOff || meta.competence) && (
                <div style={{ marginBottom: 16 }}>
                  <div className="tiny muted upper" style={{ marginBottom: 8 }}>Kelayakan & Penunjukan Reviewer (ISQM 2 ¶18–20)</div>
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                    {[{ ok: meta.coolingOk, label: 'Cooling-off / Independensi', v: meta.coolingOff }, { ok: meta.compOk, label: 'Kompetensi & Otoritas', v: meta.competence }, { ok: meta.objOk, label: 'Objektivitas', v: meta.objectivity }].map((e, i) => (
                      <div key={i} className="panel" style={{ padding: '10px 11px', boxShadow: 'none' }}>
                        <div className="row ac gap6" style={{ marginBottom: 4 }}><span style={{ color: e.ok ? 'var(--green)' : 'var(--amber)' }}>{e.ok ? <I.checkCircle size={14} /> : <I.alert size={14} />}</span><span className="tiny" style={{ fontWeight: 700 }}>{e.label}</span></div>
                        <div className="tiny muted" style={{ lineHeight: 1.4 }}>{e.v}</div>
                      </div>
                    ))}
                  </div>
                  {meta.appointedBy && <div className="tiny muted" style={{ marginTop: 6 }}>Ditunjuk oleh <b style={{ color: 'var(--ink-2)' }}>{meta.appointedBy}</b> pada {meta.appointedDate}.</div>}
                </div>
              )}

              {/* Lini masa reviu */}
              {meta.timeline && (
                <div style={{ marginBottom: 16 }}>
                  <div className="tiny muted upper" style={{ marginBottom: 10 }}>Lini Masa Reviu Mutu Perikatan</div>
                  <div className="row" style={{ alignItems: 'flex-start' }}>
                    {meta.timeline.map((s, i) => {
                      const col = s.status === 'Selesai' ? 'var(--green)' : s.status === 'Berjalan' ? 'var(--blue)' : 'var(--surface-3)';
                      return (
                        <div key={i} style={{ flex: 1, position: 'relative' }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ width: 22, height: 22, borderRadius: '50%', background: col, color: s.status === 'Belum Mulai' ? 'var(--ink-4)' : '#fff', display: 'grid', placeItems: 'center', flex: '0 0 22px', zIndex: 1 }}>{s.status === 'Selesai' ? <I.check size={12} /> : <span style={{ fontSize: 10, fontWeight: 700 }}>{i + 1}</span>}</span>
                            {i < meta.timeline.length - 1 && <span style={{ flex: 1, height: 2, background: s.status === 'Selesai' ? 'var(--green)' : 'var(--line)' }} />}
                          </div>
                          <div style={{ paddingRight: 8, marginTop: 5 }}><div className="tiny" style={{ fontWeight: 600, lineHeight: 1.3 }}>{s.stage}</div><div className="tiny muted mono">{s.date}</div></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="row jb ac" style={{ marginBottom: 10 }}><div className="tiny muted upper">Checklist Telaah Mutu Perikatan</div><span className="mono tiny" style={{ fontWeight: 700 }}>{doneN}/{r.checklist.length}</span></div>
              <div style={{ display: 'grid', gap: 6, marginBottom: 16 }}>
                {r.checklist.map((c, i) => (
                  <div key={i} onClick={r.cleared ? undefined : () => toggleCheck(i)} className="panel" style={{ padding: '9px 12px', cursor: r.cleared ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 10, boxShadow: 'none' }}>
                    <span style={{ width: 20, height: 20, borderRadius: 5, display: 'grid', placeItems: 'center', background: c.ok ? 'var(--green)' : 'var(--surface-3)', color: '#fff', flex: '0 0 20px' }}>{c.ok && <I.check size={13} />}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 500 }}>{c.k}</span>
                  </div>
                ))}
              </div>

              <div className="tiny muted upper" style={{ marginBottom: 8 }}>Temuan EQR</div>
              {r.findings.length ? (
                <div style={{ display: 'grid', gap: 6, marginBottom: 16 }}>
                  {r.findings.map((f, i) => (
                    <div key={i} className="panel" style={{ padding: '9px 12px', boxShadow: 'none', borderLeft: '3px solid var(--amber)' }}>
                      <div className="row jb ac"><span style={{ fontSize: 12, fontWeight: 600 }}>{f.t}</span><div className="row gap6 ac"><Badge kind="amber">{f.sev}</Badge><Badge kind={f.status === 'Terbuka' ? 'red' : 'green'}>{f.status}</Badge></div></div>
                    </div>
                  ))}
                </div>
              ) : <div className="tiny muted" style={{ marginBottom: 16 }}>Tidak ada temuan terbuka.</div>}

              {/* Konsultasi & perbedaan pendapat (ISQM 2 ¶21–22) */}
              {meta.consults && meta.consults.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div className="tiny muted upper" style={{ marginBottom: 8 }}>Konsultasi atas Hal Sulit / Kontroversial</div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {meta.consults.map((c, i) => (
                      <div key={i} className="panel" style={{ padding: '9px 12px', boxShadow: 'none', borderLeft: '3px solid var(--blue)' }}>
                        <div className="row jb ac"><span style={{ fontSize: 12, fontWeight: 600 }}>{c.t}</span><Badge kind={c.status === 'Selesai' ? 'green' : 'amber'}>{c.status}</Badge></div>
                        <div className="tiny muted" style={{ marginTop: 2 }}>Dikonsultasikan dengan {c.with}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {meta.diff && (
                <div style={{ marginBottom: 16 }}>
                  <div className="tiny muted upper" style={{ marginBottom: 8 }}>Perbedaan Pendapat & Penyelesaian (SA 220 ¶31–35)</div>
                  <div className="panel" style={{ padding: '12px 14px', boxShadow: 'none', borderLeft: '3px solid var(--purple)' }}>
                    <div className="row jb ac" style={{ marginBottom: 8 }}><span style={{ fontSize: 12.5, fontWeight: 700 }}>{meta.diff.topic}</span><Badge kind="green">{meta.diff.status}</Badge></div>
                    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
                      <div><div className="tiny muted upper" style={{ marginBottom: 2 }}>Posisi Tim</div><div className="tiny" style={{ lineHeight: 1.45 }}>{meta.diff.team}</div></div>
                      <div><div className="tiny muted upper" style={{ marginBottom: 2 }}>Posisi Reviewer</div><div className="tiny" style={{ lineHeight: 1.45 }}>{meta.diff.reviewer}</div></div>
                    </div>
                    <div className="panel" style={{ padding: '8px 11px', background: 'var(--green-bg)', borderColor: 'transparent' }}><div className="tiny" style={{ lineHeight: 1.45 }}><b>Penyelesaian:</b> {meta.diff.resolution}</div></div>
                  </div>
                </div>
              )}

              {r.cleared ? (
                <div className="panel" style={{ padding: '12px 14px', background: 'var(--green-bg)', borderColor: 'transparent' }}>
                  <div className="row ac gap8" style={{ marginBottom: 8 }}><span style={{ color: 'var(--green)' }}><I.checkCircle size={17} /></span><div><div style={{ fontSize: 12.5, fontWeight: 700 }}>EQR selesai — gerbang opini terbuka</div><div className="tiny muted">{r.clearedBy} · {r.clearedDate}</div></div></div>
                  <Btn sm variant="primary" onClick={() => nav('opinion')}><I.gavel size={13} /> Lanjut ke Penerbitan Opini</Btn>
                </div>
              ) : (
                <div className="panel" style={{ padding: '12px 14px', background: canClear ? 'var(--blue-050)' : 'var(--amber-bg)', borderColor: 'transparent' }}>
                  <div className="row ac gap8" style={{ marginBottom: canClear ? 10 : 0 }}>
                    <span style={{ color: canClear ? 'var(--blue)' : 'var(--amber)' }}>{canClear ? <I.shield size={16} /> : <I.lock size={16} />}</span>
                    <span className="tiny" style={{ fontWeight: 600, lineHeight: 1.5 }}>{canClear ? 'Seluruh checklist terpenuhi & tidak ada temuan terbuka. Reviewer dapat menutup EQR.' : 'Opini tidak dapat diterbitkan sebelum EQR selesai (gerbang wajib ISQM 2). Lengkapi checklist & selesaikan temuan.'}</span>
                  </div>
                  {canClear && <Btn sm variant="primary" onClick={clearGate}><I.check size={13} /> Tutup EQR sebagai {r.reviewer.split(',')[0]}</Btn>}
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div></div>
    </>
  );
}

Object.assign(window, { EQRWorkflow });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { EQRWorkflow };
