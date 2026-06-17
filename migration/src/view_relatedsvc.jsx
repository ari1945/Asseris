/* [codemod] ESM imports */
import React from 'react';
import { useAmsPersist, useNav } from './contexts.jsx';
import { FileDropField } from './evidence.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel, Seg, Tabs } from './ui.jsx';
import { NAReport } from './view_nonaudit2.jsx';
import { OKv } from './view_onboarding.jsx';

/* ============================================================
   NeoSuite AMS — Jasa Terkait (SPSJL 4400/4410) & Asurans Lain (SPA)
   AUP (temuan faktual, tanpa asurans) · Kompilasi (tanpa asurans) ·
   Asurans lain SPA 3000/3402/3400.
   ============================================================ */
const { useState: useRS } = React;

/* ---- AUP: dokumen & kertas kerja (spreadsheet) sumber ---- */
const AUP_DOC_ICON = (kind) => /(xls|csv|sheet)/i.test(kind || '') ? 'table' : (/(png|jpg|jpeg|gif|img)/i.test(kind || '') ? 'panel' : 'doc');

function AupDocRow({ d, onRemove }) {
  const FI = I[AUP_DOC_ICON(d.kind)] || I.doc;
  const pending = d.status === 'pending';
  return (
    <div className="row ac gap8" style={{ padding: '8px 10px', borderRadius: 6, background: 'var(--surface-2)' }}>
      <span style={{ width: 26, height: 26, borderRadius: 6, background: pending ? 'var(--surface-3)' : 'var(--navy)', color: pending ? 'var(--ink-3)' : '#fff', display: 'grid', placeItems: 'center', flex: '0 0 26px' }}><FI size={13} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="truncate" style={{ fontSize: 12, fontWeight: 600 }}>{d.name}</div>
        <div className="tiny muted truncate">{d.src}{d.sizeMB ? ' · ' + d.sizeMB + ' MB' : ''}{d.sha ? ' · SHA-256 ' + d.sha.slice(0, 8) + '…' : ''}</div>
      </div>
      <span className="chip tiny" style={{ textTransform: 'uppercase', flex: '0 0 auto' }}>{d.kind}</span>
      <Badge kind={pending ? 'amber' : 'green'}>{pending ? 'Menunggu' : 'Diterima'}</Badge>
      {onRemove && <button className="ev-x" onClick={onRemove} title="Buang"><I.x size={12} /></button>}
    </div>
  );
}

/* Kertas kerja rekomputasi bergaya spreadsheet — sel & formula yang menghasilkan temuan faktual */
function AupWorksheet({ p }) {
  const { fmt } = window.AMS;
  const m = p.measure;
  if (!m) return null;
  const valDisp = (n) => m.money ? ('Rp ' + fmt(n, 0) + ' jt') : (fmt(n, m.dp) + m.unit);
  const compDisp = m.count ? (m.computed + ' keterlambatan') : valDisp(m.computed);
  const threshDisp = m.count ? m.requirement : valDisp(m.threshold);
  const th = { background: 'var(--surface-3)', color: 'var(--ink-3)', fontWeight: 700, textAlign: 'center', padding: '4px 8px', border: '1px solid var(--line-strong)', fontSize: 10.5 };
  const rn = { background: 'var(--surface-3)', color: 'var(--ink-3)', fontWeight: 700, textAlign: 'center', border: '1px solid var(--line-strong)', width: 30, fontSize: 10.5 };
  const ca = { padding: '5px 9px', border: '1px solid var(--line)', fontSize: 11.5 };
  const cb = { padding: '5px 9px', border: '1px solid var(--line)', fontSize: 11.5, textAlign: 'right', fontWeight: 600 };
  let r = 0;
  const inputRows = m.inputs.map((inp) => { r += 1; return { n: r, a: inp.k, b: inp.v }; });
  const calcN = ++r, threshN = m.count ? null : ++r, statN = ++r;
  return (
    <div style={{ border: '1px solid var(--line-strong)', borderRadius: 8, overflow: 'hidden' }}>
      <div className="row ac gap8" style={{ padding: '6px 10px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line-strong)' }}>
        <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-3)', border: '1px solid var(--line-strong)', borderRadius: 4, padding: '1px 6px', background: '#fff' }}>fx</span>
        <span className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{m.formula}</span>
        <span className="tiny muted">— {m.recompute}</span>
      </div>
      <table className="mono" style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
        <thead><tr><th style={rn}></th><th style={th}>A · Keterangan</th><th style={{ ...th, width: 150 }}>B · Nilai</th></tr></thead>
        <tbody>
          {inputRows.map(row => (
            <tr key={row.n}><td style={rn}>{row.n}</td><td style={ca}>{row.a}</td><td style={cb}>{row.b}</td></tr>
          ))}
          <tr><td style={rn}>{calcN}</td><td style={{ ...ca, background: 'var(--blue-050)', fontWeight: 700 }}>{m.label} <span style={{ color: 'var(--blue)' }}>{m.formula}</span></td><td style={{ ...cb, background: 'var(--blue-050)', color: 'var(--navy)' }}>{compDisp}</td></tr>
          {threshN && <tr><td style={rn}>{threshN}</td><td style={ca}>Ambang klausul ({m.requirement})</td><td style={cb}>{threshDisp}</td></tr>}
          <tr><td style={rn}>{statN}</td><td style={{ ...ca, fontWeight: 700 }}>Status =IF(B{calcN}{m.op === 'lte' ? '≤' : '≥'}{m.count ? '0' : 'B' + threshN}…)</td><td style={{ ...cb, background: p.pass ? 'var(--green-bg)' : 'var(--red-bg)', color: p.pass ? 'var(--green)' : 'var(--red)', fontWeight: 800 }}>{p.pass ? 'TERPENUHI' : 'TIDAK'}</td></tr>
        </tbody>
      </table>
    </div>
  );
}

/* ============================================================
   Jasa Terkait — AUP (4400) + Kompilasi (4410)
   ============================================================ */
function RelatedServices() {
  const [view, setView] = useRS('aup');
  return (
    <>
      <SubBar moduleId="relatedsvc" right={<div className="row gap8 ac"><Badge kind="purple">SPSJL · Tanpa Asurans</Badge><Seg options={['AUP 4400', 'Kompilasi 4410']} value={view === 'aup' ? 'AUP 4400' : 'Kompilasi 4410'} onChange={v => setView(v.includes('AUP') ? 'aup' : 'cmp')} /></div>} />
      <div className="view-scroll"><div className="view-pad">
        {view === 'aup' ? <AUPPanel /> : <CompilationPanel />}
      </div></div>
    </>
  );
}

function AUPPanel() {
  const { fmt } = window.AMS;
  const [exec, setExec] = useAmsPersist('aup4400.exec', () => ({}));
  const [custom, setCustom] = useAmsPersist('aup4400.custom', () => []);
  const [docs, setDocs] = useAmsPersist('aup4400.docs', () => ({}));
  const [selNo, setSelNo] = useRS(1);
  const [tab, setTab] = useRS('procs');
  const [rpt, setRpt] = useRS(false);

  const E = window.AMS.aupEngine(exec, custom);
  const A = E.meta;
  const toggle = (no) => setExec(m => ({ ...m, [no]: !(no in m ? m[no] : !!A.procedures.find(p => p.no === no)?.seedDone) }));
  const setDone = (no, v) => setExec(m => ({ ...m, [no]: v }));
  const nextNo = Math.max(0, ...E.procedures.map(p => p.no)) + 1;
  const addProc = () => setCustom(list => [...list, { no: nextNo, clause: 'Tambahan', proc: '', finding: '', done: false, exception: false }]);
  const editCustom = (no, k, v) => setCustom(list => list.map(p => p.no === no ? { ...p, [k]: v } : p));
  const delCustom = (no) => setCustom(list => list.filter(p => p.no !== no));

  const termsOk = A.terms.filter(t => t.ok).length;
  const docPending = E.procedures.reduce((s, p) => s + ((p.docs || []).filter(d => d.status === 'pending').length), 0);
  const tabs = [
    { id: 'terms', label: 'Persyaratan Perikatan', count: A.terms.length - termsOk || null },
    { id: 'procs', label: 'Prosedur & Temuan Faktual', count: E.total - E.done || null },
    { id: 'exc', label: 'Register Pengecualian', count: E.exceptions || null },
    { id: 'data', label: 'Data & Dokumen', count: docPending || null },
    { id: 'lineage', label: 'Tarikan Data' },
    { id: 'report', label: 'Laporan' },
  ];

  return (
    <>
      {/* engagement header */}
      <div className="panel" style={{ padding: '11px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 38, height: 38, borderRadius: 9, background: '#5b3fa6', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700 }}>AP</span>
        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{A.client}</div><div className="tiny muted truncate">{A.id} · Prosedur yang Disepakati ({A.standard}) · Pengguna: {A.requester}</div></div>
        <div className="row gap8 ac">
          <div style={{ textAlign: 'right' }}><div className="tiny muted">Prosedur</div><div className="mono" style={{ fontWeight: 700 }}>{E.done}/{E.total}</div></div>
          <div style={{ textAlign: 'right' }}><div className="tiny muted">Pengecualian</div><div className="mono" style={{ fontWeight: 700, color: E.exceptions ? 'var(--red)' : 'var(--green)' }}>{E.exceptions}</div></div>
          <div style={{ textAlign: 'right' }}><div className="tiny muted">Progres</div><div className="mono" style={{ fontWeight: 700 }}>{E.progress}%</div></div>
          <Btn sm variant="primary" onClick={() => setRpt(true)}><I.doc size={13} /> Laporan Temuan Faktual</Btn>
        </div>
      </div>

      <Panel noBody>
        <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

        {/* ---- Persyaratan Perikatan ---- */}
        {tab === 'terms' && (
          <div style={{ padding: 16 }}>
            <div className="grid" style={{ gridTemplateColumns: '1.1fr 1fr', gap: 14, alignItems: 'start' }}>
              <div>
                <div className="tiny muted upper" style={{ marginBottom: 8 }}>Ringkasan Perikatan</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  <OKv label="Hal Pokok yang Disepakati" v={'Kepatuhan ' + A.subject + '.'} />
                  <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <OKv label="Pihak yang Menyepakati" v={A.requester} />
                    <OKv label="Kriteria Perbandingan" v="Klausul rasio keuangan perjanjian kredit sindikasi" />
                  </div>
                  <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <OKv label="Partner" v={A.partner.split(',')[0]} />
                    <OKv label="Tanggal Pisah Batas" v={A.cutoff} />
                    <OKv label="Target Laporan" v={A.reportTarget} accent="var(--blue)" />
                  </div>
                  <OKv label="Independensi" v={A.independence} />
                </div>
                <div className="panel" style={{ marginTop: 12, padding: '10px 13px', background: 'var(--blue-050)', borderColor: 'transparent' }}>
                  <div className="tiny" style={{ lineHeight: 1.55 }}><b>{A.framework}.</b> KAP melaporkan <b>temuan faktual</b> atas prosedur yang disepakati; <b>tidak menyatakan opini maupun keyakinan</b>. Pengguna menarik simpulannya sendiri. Distribusi laporan <b>terbatas</b> pada pihak yang menyepakati prosedur.</div>
                </div>
              </div>
              <div>
                <div className="tiny muted upper" style={{ marginBottom: 8 }}>Daftar Periksa Persyaratan (SPSJL 4400)</div>
                <div style={{ display: 'grid', gap: 7 }}>
                  {A.terms.map((t, i) => (
                    <div key={i} className="row ac gap8" style={{ padding: '9px 11px', borderRadius: 6, background: 'var(--surface-2)' }}>
                      <span style={{ color: t.ok ? 'var(--green)' : 'var(--amber)', flex: '0 0 auto' }}>{t.ok ? <I.checkCircle size={16} /> : <I.clock size={16} />}</span>
                      <span className="tiny" style={{ fontWeight: 500, lineHeight: 1.45 }}>{t.k}</span>
                      <div style={{ flex: 1 }} />
                      <Badge kind={t.ok ? 'green' : 'amber'}>{t.ok ? 'Disepakati' : 'Pending'}</Badge>
                    </div>
                  ))}
                </div>
                <div className="row jb ac" style={{ marginTop: 10 }}><span className="tiny muted">Kelengkapan persyaratan</span><span className="mono" style={{ fontWeight: 700 }}>{termsOk}/{A.terms.length}</span></div>
              </div>
            </div>
          </div>
        )}

        {/* ---- Prosedur & Temuan Faktual (computed) ---- */}
        {tab === 'procs' && (
          <>
            <div className="panel" style={{ margin: 12, padding: '8px 12px', background: 'var(--surface-2)', boxShadow: 'none', borderColor: 'transparent', display: 'flex', alignItems: 'center', gap: 8 }}>
              <I.sync size={13} style={{ color: 'var(--blue)' }} />
              <span className="tiny muted" style={{ lineHeight: 1.5 }}>Temuan faktual & status <b>dihitung otomatis</b> dari angka sumber tiap prosedur (rekomputasi terhadap ambang klausul) — bukan teks tetap. Ubah status pelaksanaan dengan kotak centang.</span>
              <div style={{ flex: 1 }} />
              <Btn sm onClick={addProc}><I.plus size={12} /> Prosedur Tambahan</Btn>
            </div>
            <table className="dtbl">
              <thead><tr><th style={{ width: 32 }}></th><th className="num" style={{ width: 34 }}>No.</th><th>Klausul</th><th>Prosedur Disepakati</th><th>Temuan Faktual (dihitung)</th><th style={{ width: 110 }}>Hasil</th></tr></thead>
              <tbody>
                {E.procedures.map(p => (
                  <tr key={p.no}>
                    <td><span onClick={() => p.custom ? editCustom(p.no, 'done', !p.done) : toggle(p.no)} style={{ cursor: 'pointer', width: 18, height: 18, borderRadius: 5, display: 'grid', placeItems: 'center', background: p.done ? 'var(--green)' : 'var(--surface-3)', color: '#fff' }}>{p.done && <I.check size={11} />}</span></td>
                    <td className="num mono" style={{ fontWeight: 700 }}>{p.no}</td>
                    <td className="tiny muted" style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>{p.custom ? <span className="chip tiny">Tambahan</span> : p.clause}</td>
                    <td className="tiny" style={{ width: '34%', whiteSpace: 'normal', verticalAlign: 'top' }}>
                      {p.custom ? <input className="input" value={p.proc} onChange={e => editCustom(p.no, 'proc', e.target.value)} placeholder="Prosedur yang disepakati…" style={{ width: '100%', height: 26 }} /> : (
                        <>
                          <div>{p.proc}</div>
                          {p.measure && <div className="tiny muted mono" style={{ marginTop: 3 }}>{p.measure.recompute} · ambang {p.measure.requirement}</div>}
                        </>
                      )}
                    </td>
                    <td className="tiny" style={{ width: '32%', whiteSpace: 'normal', verticalAlign: 'top' }}>
                      {p.custom ? <input className="input" value={p.finding} onChange={e => editCustom(p.no, 'finding', e.target.value)} placeholder="Temuan faktual…" style={{ width: '100%', height: 26 }} /> : (p.done ? <span style={{ color: p.exception ? 'var(--red)' : 'var(--ink-2)' }}>{p.finding}</span> : <span style={{ fontStyle: 'italic', color: 'var(--ink-4)' }}>Belum dikerjakan</span>)}
                    </td>
                    <td style={{ verticalAlign: 'top' }}>
                      {!p.done ? <Badge kind="gray">Pending</Badge> : p.custom ? (
                        <span onClick={() => editCustom(p.no, 'exception', !p.exception)} style={{ cursor: 'pointer' }}><Badge kind={p.exception ? 'red' : 'green'}>{p.exception ? 'Pengecualian' : 'Sesuai'}</Badge></span>
                      ) : <Badge kind={p.exception ? 'red' : 'green'}>{p.exception ? 'Pengecualian' : 'Sesuai'}</Badge>}
                      {p.custom && <span onClick={() => delCustom(p.no)} title="Hapus" style={{ cursor: 'pointer', marginLeft: 6, color: 'var(--ink-4)' }}><I.x size={12} /></span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="tiny muted" style={{ padding: '8px 14px 12px', lineHeight: 1.5 }}>Setiap prosedur baku menyimpan angka sumber & ambang klausul; bila salah satu input diubah di satu tempat, temuan faktual & status pengecualian mengalir konsisten ke Register Pengecualian dan Laporan Temuan Faktual.</div>
          </>
        )}

        {/* ---- Register Pengecualian ---- */}
        {tab === 'exc' && (() => {
          const exc = E.procedures.filter(p => p.done && p.exception);
          return (
            <div style={{ padding: 16 }}>
              {exc.length === 0 ? (
                <div className="panel" style={{ padding: '16px 18px', background: 'var(--green-bg)', borderColor: 'transparent', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <I.checkCircle size={18} style={{ color: 'var(--green)' }} />
                  <span className="tiny" style={{ fontWeight: 600, lineHeight: 1.5 }}>Tidak ada pengecualian pada prosedur yang telah dilaksanakan. Seluruh temuan faktual sesuai dengan ambang klausul yang disepakati.</span>
                </div>
              ) : (
                <>
                  <div className="tiny muted upper" style={{ marginBottom: 8 }}>{exc.length} pengecualian — wajib dilaporkan apa adanya sebagai temuan faktual</div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {exc.map(p => (
                      <div key={p.no} className="panel" style={{ padding: '12px 14px', boxShadow: 'none', borderLeft: '3px solid var(--red)' }}>
                        <div className="row jb ac" style={{ marginBottom: 6 }}>
                          <span className="row ac gap8"><Badge kind="red">Pengecualian</Badge><span className="mono tiny muted">Prosedur {p.no} · {p.clause}</span></span>
                          {p.measure && <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--red)' }}>{p.measure.money ? 'Rp ' + fmt(p.measure.computed, 0) + ' jt' : fmt(p.measure.computed, p.measure.dp) + p.measure.unit} vs {p.measure.requirement}</span>}
                        </div>
                        <div className="tiny" style={{ fontWeight: 600, marginBottom: 4 }}>{p.proc}</div>
                        <div className="tiny" style={{ color: 'var(--red)', lineHeight: 1.5 }}>{p.finding}</div>
                        {p.measure && <div className="tiny muted" style={{ marginTop: 6 }}>Sumber: {p.measure.source}</div>}
                      </div>
                    ))}
                  </div>
                  <div className="tiny muted" style={{ marginTop: 10, lineHeight: 1.5 }}>SPSJL 4400 mensyaratkan seluruh pengecualian dilaporkan, sekecil apa pun. KAP tidak memberikan keyakinan atas dampaknya — pengguna menilai sendiri implikasi terhadap kepatuhan covenant.</div>
                </>
              )}
            </div>
          );
        })()}

        {/* ---- Data & Dokumen (wadah dokumen + spreadsheet per prosedur) ---- */}
        {tab === 'data' && (() => {
          const sel = E.procedures.find(p => p.no === selNo) || E.procedures[0];
          if (!sel) return null;
          const seedDocs = sel.docs || [];
          const uploaded = docs[sel.no] || [];
          const onFiles = (metas) => setDocs(d => ({ ...d, [sel.no]: [...(d[sel.no] || []), ...metas.filter(mm => mm.ok).map(mm => ({ name: mm.name, kind: mm.ext, src: 'Unggahan KAP', status: 'received', sha: mm.sha256, sizeMB: mm.sizeMB }))] }));
          const rmUpload = (i) => setDocs(d => ({ ...d, [sel.no]: (d[sel.no] || []).filter((_, j) => j !== i) }));
          return (
            <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', minHeight: 400 }}>
              {/* rail prosedur */}
              <div style={{ borderRight: '1px solid var(--line-soft)' }}>
                <div className="tiny muted upper" style={{ padding: '10px 12px 6px' }}>Prosedur</div>
                {E.procedures.map(p => {
                  const dc = (p.docs || []).length + (docs[p.no] || []).length;
                  const pend = (p.docs || []).filter(x => x.status === 'pending').length;
                  return (
                    <div key={p.no} onClick={() => setSelNo(p.no)} style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--line-soft)', borderLeft: '3px solid ' + (p.no === sel.no ? 'var(--blue)' : 'transparent'), background: p.no === sel.no ? 'var(--blue-050)' : 'transparent' }}>
                      <div className="row jb ac"><span className="mono tiny" style={{ fontWeight: 700 }}>Prosedur {p.no}</span><span className="chip tiny">{dc}</span></div>
                      <div className="tiny muted truncate" style={{ marginTop: 2 }}>{p.custom ? 'Tambahan' : p.clause}</div>
                      {pend > 0 && <div className="tiny" style={{ color: 'var(--amber)', marginTop: 2 }}>{pend} menunggu</div>}
                    </div>
                  );
                })}
              </div>
              {/* detail */}
              <div style={{ padding: 16 }}>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>Prosedur {sel.no} · {sel.custom ? 'Tambahan' : sel.clause}</div>
                  <div className="tiny muted" style={{ lineHeight: 1.45 }}>{sel.proc || 'Prosedur tambahan tanpa deskripsi.'}</div>
                </div>

                <div className="tiny muted upper" style={{ marginBottom: 6 }}>Dokumen & Spreadsheet Sumber</div>
                <div style={{ display: 'grid', gap: 6, marginBottom: 10 }}>
                  {seedDocs.length === 0 && uploaded.length === 0 && <div className="ev-empty">Belum ada dokumen untuk prosedur ini.</div>}
                  {seedDocs.map((d, i) => <AupDocRow key={'s' + i} d={d} />)}
                  {uploaded.map((d, i) => <AupDocRow key={'u' + i} d={d} onRemove={() => rmUpload(i)} />)}
                </div>
                {typeof FileDropField !== 'undefined'
                  ? <FileDropField compact hint={'PDF · XLSX · CSV · DOCX — lampirkan ke Prosedur ' + sel.no} onFiles={onFiles} />
                  : null}

                {sel.measure && (
                  <>
                    <div className="tiny muted upper" style={{ margin: '14px 0 6px' }}>Kertas Kerja Rekomputasi (spreadsheet)</div>
                    <AupWorksheet p={sel} />
                    <div className="tiny muted" style={{ marginTop: 6, lineHeight: 1.5 }}>Sel & formula di atas menghasilkan temuan faktual untuk prosedur ini. Mengubah angka sumber mengalir ke kolom Temuan Faktual, Register Pengecualian, dan Laporan.</div>
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {/* ---- Tarikan Data (lineage) ---- */}
        {tab === 'lineage' && (
          <div style={{ padding: 16 }}>
            <div className="tiny muted upper" style={{ marginBottom: 8 }}>Angka Sumber per Prosedur</div>
            <table className="dtbl">
              <thead><tr><th className="num" style={{ width: 34 }}>No.</th><th>Input Sumber</th><th className="num">Nilai</th><th>Dokumen Sumber</th></tr></thead>
              <tbody>
                {E.procedures.filter(p => p.measure).map(p => (
                  p.measure.inputs.map((inp, j) => (
                    <tr key={p.no + '-' + j}>
                      {j === 0 && <td className="num mono" rowSpan={p.measure.inputs.length} style={{ fontWeight: 700, verticalAlign: 'top' }}>{p.no}</td>}
                      <td className="tiny">{inp.k}</td>
                      <td className="num mono tiny" style={{ fontWeight: 600 }}>{inp.v}</td>
                      {j === 0 && <td className="tiny muted" rowSpan={p.measure.inputs.length} style={{ verticalAlign: 'top', whiteSpace: 'normal' }}>{p.measure.source}</td>}
                    </tr>
                  ))
                ))}
              </tbody>
            </table>
            <div className="tiny muted upper" style={{ margin: '16px 0 8px' }}>Satu Sumber, Banyak Konsumen</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {[
                { m: 'Modul Jasa Terkait — Prosedur & Temuan', v: E.done + '/' + E.total + ' prosedur · ' + E.exceptions + ' pengecualian', here: true },
                { m: 'Laporan Temuan Faktual (SPSJL 4400)', v: 'temuan ditarik dari engine yang sama' },
                { m: 'Portofolio Jasa Non-Audit — progres', v: E.progress + '%' },
                { m: 'Matriks Kepatuhan — SPA 4400', v: 'Perikatan Prosedur yang Disepakati' },
              ].map((c, i) => (
                <div key={i} className="row ac jb" style={{ padding: '9px 12px', borderRadius: 6, background: c.here ? 'var(--blue-050)' : 'var(--surface-2)' }}>
                  <span className="row ac gap8"><I.arrowRight size={13} style={{ color: 'var(--blue)' }} /><span className="tiny" style={{ fontWeight: 600 }}>{c.m}</span></span>
                  <span className="mono tiny muted">{c.v}</span>
                </div>
              ))}
            </div>
            <div className="panel" style={{ marginTop: 12, padding: '10px 13px', background: 'var(--surface-2)', boxShadow: 'none', borderColor: 'transparent' }}>
              <div className="tiny muted" style={{ lineHeight: 1.55 }}>Sumber kebenaran tunggal: <span className="mono">window.AMS.aupEngine()</span>. Status pelaksanaan disimpan terpisah dari definisi prosedur, sehingga seluruh konsumen di atas menampilkan angka yang identik tanpa duplikasi.</div>
            </div>
          </div>
        )}

        {/* ---- Laporan ---- */}
        {tab === 'report' && (
          <div style={{ padding: 16 }}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div className="panel" style={{ padding: 12 }}><div className="tiny muted upper" style={{ marginBottom: 4 }}>Prosedur Dilaksanakan</div><div className="mono" style={{ fontSize: 18, fontWeight: 700 }}>{E.done} / {E.total}</div></div>
              <div className="panel" style={{ padding: 12 }}><div className="tiny muted upper" style={{ marginBottom: 4 }}>Temuan Pengecualian</div><div className="mono" style={{ fontSize: 18, fontWeight: 700, color: E.exceptions ? 'var(--red)' : 'var(--green)' }}>{E.exceptions}</div></div>
            </div>
            <div className="panel" style={{ padding: '11px 14px', marginBottom: 12, background: E.ready ? 'var(--green-bg)' : 'var(--amber-bg)', borderColor: 'transparent' }}>
              <div className="row ac gap8"><span style={{ color: E.ready ? 'var(--green)' : 'var(--amber)' }}>{E.ready ? <I.checkCircle size={16} /> : <I.clock size={16} />}</span>
                <span className="tiny" style={{ fontWeight: 600, lineHeight: 1.5 }}>{E.ready
                  ? 'Seluruh prosedur yang disepakati telah dilaksanakan — Laporan Temuan Faktual siap diterbitkan, mencakup ' + E.exceptions + ' pengecualian.'
                  : (E.total - E.done) + ' prosedur belum dilaksanakan — selesaikan seluruh prosedur sebelum menerbitkan Laporan Temuan Faktual.'}</span></div>
            </div>
            <Btn variant="primary" onClick={() => setRpt(true)} style={{ width: '100%' }}><I.doc size={14} /> Pratinjau Laporan Temuan Faktual</Btn>
            <div className="tiny muted" style={{ marginTop: 10, lineHeight: 1.5 }}>Laporan memuat seluruh prosedur yang dilaksanakan beserta temuan faktualnya — termasuk pengecualian — diakhiri pernyataan bahwa pekerjaan ini <b>bukan audit/reviu</b> dan <b>tidak memberikan asurans</b>, dengan pembatasan distribusi.</div>
          </div>
        )}
      </Panel>
      {rpt && <NAReport kind="aup" onClose={() => setRpt(false)} />}
    </>
  );
}

function CompilationPanel() {
  const { fmt } = window.AMS;
  const C = window.AMS.COMPILATION_4410;
  const [rpt, setRpt] = useRS(false);
  const allCompiled = C.statements.every(s => s.compiled);
  const srcOk = C.sourceQuality.filter(s => s.ok).length;
  const figures = [
    ['Total Aset', 4_850_000_000], ['Total Liabilitas', 1_920_000_000], ['Total Ekuitas', 2_930_000_000],
    ['Pendapatan', 6_240_000_000], ['Laba Bersih', 540_000_000],
  ];
  return (
    <>
      <div className="panel" style={{ padding: '11px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 38, height: 38, borderRadius: 9, background: '#5b3fa6', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700 }}>K</span>
        <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{C.client}</div><div className="tiny muted">{C.id} · Kompilasi Informasi Keuangan (SPSJL 4410) · Kerangka {C.framework} · {C.period}</div></div>
        <Badge kind={allCompiled ? 'green' : 'amber'}>{allCompiled ? 'Siap Diterbitkan' : 'Dalam Proses'}</Badge>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
        <Panel title="Informasi Keuangan yang Dikompilasi">
          <div style={{ display: 'grid', gap: 8 }}>
            {C.statements.map((s, i) => (
              <div key={i} className="row ac jb" style={{ padding: '9px 11px', borderRadius: 6, background: 'var(--surface-2)' }}>
                <span className="row ac gap8"><span style={{ color: s.compiled ? 'var(--green)' : 'var(--ink-4)' }}>{s.compiled ? <I.checkCircle size={16} /> : <I.clock size={16} />}</span><span style={{ fontSize: 12.5, fontWeight: 600 }}>{s.name}</span></span>
                <Badge kind={s.compiled ? 'green' : 'amber'}>{s.compiled ? 'Selesai' : 'Proses'}</Badge>
              </div>
            ))}
          </div>
          <div className="divider" />
          <div className="tiny muted upper" style={{ marginBottom: 6 }}>Ikhtisar Angka Terkompilasi</div>
          <div style={{ display: 'grid', gap: 0 }}>
            {figures.map(([k, v], i) => (
              <div key={k} className="row jb ac" style={{ padding: '5px 0', borderBottom: i < figures.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                <span className="tiny" style={{ fontWeight: i >= 3 ? 600 : 400 }}>{k}</span>
                <span className="mono tiny" style={{ fontWeight: 700 }}>Rp {fmt(v / 1e6, 0)} jt</span>
              </div>
            ))}
          </div>
        </Panel>

        <div style={{ display: 'grid', gap: 12 }}>
          <Panel title="Kelengkapan Data Sumber dari Manajemen">
            <div style={{ display: 'grid', gap: 7 }}>
              {C.sourceQuality.map((s, i) => (
                <div key={i} className="row ac jb" style={{ padding: '6px 0', borderBottom: i < C.sourceQuality.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                  <span style={{ fontSize: 12 }}>{s.k}</span>
                  <Badge kind={s.ok ? 'green' : 'amber'}>{s.ok ? 'Diterima' : 'Menunggu'}</Badge>
                </div>
              ))}
            </div>
            <div className="row jb ac" style={{ marginTop: 10 }}><span className="tiny muted">Kelengkapan</span><span className="mono" style={{ fontWeight: 700 }}>{srcOk}/{C.sourceQuality.length}</span></div>
          </Panel>
          <Panel title="Laporan Kompilasi">
            <div className="tiny" style={{ lineHeight: 1.6, color: 'var(--ink-2)' }}>"Kami telah mengompilasi laporan keuangan {C.client} berdasarkan informasi yang diberikan manajemen, sesuai SPSJL 4410. Kami tidak mengaudit atau mereviu, sehingga <b>tidak menyatakan opini maupun keyakinan</b> atas laporan keuangan ini. Tanggung jawab atas laporan keuangan berada pada manajemen."</div>
            <Btn sm variant="primary" style={{ marginTop: 12, width: '100%', opacity: allCompiled ? 1 : .5 }} disabled={!allCompiled} onClick={() => setRpt(true)}><I.doc size={13} /> Terbitkan Laporan Kompilasi</Btn>
          </Panel>
        </div>
      </div>
      {rpt && <NAReport kind="cmp" onClose={() => setRpt(false)} />}
    </>
  );
}

/* ============================================================
   Asurans Lain — SPA 3000 / 3402 / 3400
   ============================================================ */
function OtherAssurance() {
  const ENG = window.AMS.ASSURANCE_ENG;
  const ids = Object.keys(ENG);
  const meta = window.AMS.NONAUDIT.reduce((m, e) => { m[e.id] = e; return m; }, {});
  const [sel, setSel] = useRS(ids[0]);
  const [rpt, setRpt] = useRS(false);
  const nav = useNav();
  /* PFI-2025-090 ditarik LIVE dari pfiEngine (SUMBER KEBENARAN SJAH 3400);
     ASR-2025-081 ditarik LIVE dari socEngine (SUMBER KEBENARAN SJAH 3402). */
  const isPfi = window.AMS.pfiEngine && window.AMS.PFI_3400 && sel === window.AMS.PFI_3400.id;
  const isSoc = window.AMS.socEngine && window.AMS.SOC_3402 && sel === window.AMS.SOC_3402.id;
  const isGhg = window.AMS.ghgEngine && window.AMS.GHG_3410 && sel === window.AMS.GHG_3410.id;
  const e = isPfi ? window.AMS.pfiEngine().assuranceEntry : isSoc ? window.AMS.socEngine().assuranceEntry : isGhg ? window.AMS.ghgEngine().assuranceEntry : ENG[sel];
  const m = meta[sel];
  const doneN = e.matters.filter(x => x.ok).length;

  return (
    <>
      <SubBar moduleId="assurance" right={<div className="row gap8 ac"><Badge kind="blue">{e.std} · Keyakinan {e.level}</Badge></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: '260px 1fr', gap: 12, alignItems: 'start' }}>
          <Panel noBody>
            <div className="panel-h"><h3>Perikatan Asurans</h3></div>
            <div>
              {ids.map(id => (
                <div key={id} onClick={() => setSel(id)} style={{ padding: '11px 13px', cursor: 'pointer', borderBottom: '1px solid var(--line-soft)', borderLeft: '3px solid ' + (id === sel ? 'var(--blue)' : 'transparent'), background: id === sel ? 'var(--blue-050)' : 'transparent' }}>
                  <div className="row jb ac" style={{ marginBottom: 3 }}><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{id}</span><span className="chip tiny">{ENG[id].std}</span></div>
                  <div style={{ fontSize: 12, fontWeight: 600 }} className="truncate">{meta[id].client.replace('PT ', '')}</div>
                  <div className="tiny muted truncate">{ENG[id].subject}</div>
                </div>
              ))}
            </div>
          </Panel>

          <div>
            <div className="panel" style={{ padding: '12px 16px', marginBottom: 12 }}>
              <div className="row jb ac"><div><div style={{ fontWeight: 700, fontSize: 14 }}>{m.client}</div><div className="tiny muted">{sel} · {m.stdLabel}</div></div><div className="row gap8 ac">{isPfi && <Btn sm onClick={() => nav('sjah3400', { from: 'assurance' })}><I.arrowRight size={13} /> Modul SJAH 3400</Btn>}{isSoc && <Btn sm onClick={() => nav('sjah3402', { from: 'assurance' })}><I.arrowRight size={13} /> Modul SJAH 3402</Btn>}{isGhg && <Btn sm onClick={() => nav('sjah3410', { from: 'assurance' })}><I.arrowRight size={13} /> Modul SJAH 3410</Btn>}<Badge kind={e.level.includes('Memadai') ? 'green' : 'blue'}>Keyakinan {e.level}</Badge><Btn sm variant="primary" onClick={() => setRpt(true)}><I.doc size={13} /> Laporan Asurans</Btn></div></div>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                <OKv label="Hal Pokok (Subject Matter)" v={e.subject} />
                <OKv label="Kriteria yang Sesuai" v={e.criteria} />
              </div>
            </div>

            <Panel noBody>
              <div className="panel-h"><h3>Hal Pokok & Bukti Asurans</h3><div style={{ flex: 1 }} /><span className="mono tiny" style={{ fontWeight: 700 }}>{doneN}/{e.matters.length} selesai</span></div>
              <table className="dtbl">
                <thead><tr><th style={{ width: '20%' }}>Hal Pokok</th><th style={{ width: '15%' }}>Asersi Manajemen</th><th style={{ width: '30%' }}>Prosedur Asurans</th><th style={{ width: '23%' }}>Simpulan</th><th style={{ width: '12%' }}>Status</th></tr></thead>
                <tbody>
                  {e.matters.map((x, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, whiteSpace: 'normal', verticalAlign: 'top' }}>{x.m}</td>
                      <td className="mono tiny" style={{ whiteSpace: 'normal', verticalAlign: 'top' }}>{x.claim}</td>
                      <td className="tiny muted" style={{ whiteSpace: 'normal', verticalAlign: 'top' }}>{x.proc}</td>
                      <td className="tiny" style={{ whiteSpace: 'normal', verticalAlign: 'top' }}>{x.concl}</td>
                      <td style={{ verticalAlign: 'top' }}><Badge kind={x.ok ? 'green' : 'amber'}>{x.ok ? 'Selesai' : 'Proses'}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>

            <div className="panel" style={{ marginTop: 12, padding: '11px 14px', background: doneN === e.matters.length ? 'var(--green-bg)' : 'var(--amber-bg)', borderColor: 'transparent' }}>
              <div className="row ac gap8"><span style={{ color: doneN === e.matters.length ? 'var(--green)' : 'var(--amber)' }}>{doneN === e.matters.length ? <I.checkCircle size={16} /> : <I.clock size={16} />}</span>
                <span className="tiny" style={{ fontWeight: 600, lineHeight: 1.5 }}>{doneN === e.matters.length
                  ? 'Seluruh hal pokok selesai — simpulan asurans (' + e.level + ') dapat dirumuskan dan laporan diterbitkan sesuai ' + e.std + '.'
                  : 'Asurans ' + e.level.toLowerCase() + ' (' + e.std + '): lengkapi bukti atas seluruh hal pokok sebelum merumuskan simpulan.'}</span></div>
            </div>
          </div>
        </div>
      </div></div>
      {rpt && <NAReport kind={'asr:' + sel} onClose={() => setRpt(false)} />}
    </>
  );
}

Object.assign(window, { RelatedServices, AUPPanel, CompilationPanel, OtherAssurance });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { AUPPanel, CompilationPanel, OtherAssurance, RelatedServices };
