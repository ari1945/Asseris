/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useFirm, useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Btn, Panel, Stat } from './ui.jsx';

/* ============================================================
   Asseris — Template Library, Knowledge Base
   (Modul Pajak PPh 23 telah dipindah ke view_tax23.jsx —
    modul mendalam dengan register kanonik window.TAX23.)
   ============================================================ */
const { useState: useStateM2 } = React;

/* ---------------- Template Library ----------------
   Katalog & tata kelola dibangun di atas registri kanonik
   AMS.TEMPLATES (lihat data_templates.js). Setiap template
   menaut ke modul yang memakainya + standar yang dipenuhinya. */
const FMT_COLOR = { DOCX: '#2f5b9b', XLSX: '#1f7a4d', PDF: '#b3261e', PPTX: '#c2630f' };
const TPL_PHASES = ['Perencanaan', 'Pelaksanaan', 'Pelaporan', 'Tata Kelola & Mutu', 'Pajak'];
const TPL_STATUS = {
  'Aktif': { k: 'green', dot: 'var(--green)' },
  'Draf': { k: 'gray', dot: 'var(--ink-4)' },
  'Perlu Reviu': { k: 'amber', dot: 'var(--amber)' },
};
const tplDateID = (s) => { const [y, m, d] = s.split('-'); return d + '/' + m + '/' + y.slice(2); };

function FmtBadge({ fmt, size = 38 }) {
  const c = FMT_COLOR[fmt] || 'var(--ink-3)';
  return (
    <div style={{ width: size, height: size * 1.21, borderRadius: 5, background: c + '18', color: c, display: 'grid', placeItems: 'center', flex: '0 0 ' + size + 'px', position: 'relative' }}>
      <I.doc size={size * 0.53} /><span style={{ position: 'absolute', bottom: size * 0.08, fontSize: size * 0.185, fontWeight: 800, letterSpacing: '.02em' }}>{fmt}</span>
    </div>
  );
}

function Templates() {
  const T: any[] = (AMS as any).TEMPLATES || [];
  const nav = useNav();
  const [q, setQ] = useStateM2('');
  const [phase, setPhase] = useStateM2('Semua');
  const [detail, setDetail] = useStateM2(null);

  const dmsTpl = ((AMS as any).DMS_DOCS || []).filter((d: any) => d.type === 'Template').length;
  const aktif = T.filter(t => t.status === 'Aktif').length;
  const draf = T.filter(t => t.status === 'Draf').length;
  const due = T.filter(t => t.reviewDue).length;
  const instans = T.reduce((s, t) => s + t.engs.length, 0);
  const topUsed = [...T].sort((a, b) => b.dl - a.dl).slice(0, 5);

  const matches = (t) => (phase === 'Semua' || t.phase === phase) &&
    (q === '' || (t.name + ' ' + t.id + ' ' + t.cat + ' ' + t.sa.map(s => s.code).join(' ')).toLowerCase().includes(q.toLowerCase()));
  const shown = T.filter(matches);
  const phasesToShow = TPL_PHASES.filter(p => shown.some(t => t.phase === p));

  return (
    <>
      <SubBar moduleId="templates" right={<div className="row gap8 ac"><Btn sm><I.upload size={13} /> Unggah</Btn><Btn sm variant="primary"><I.plus size={14} /> Template Baru</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={T.length} label="Template Terdaftar" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={aktif} label="Aktif & Disahkan" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={due} label="Perlu Reviu" accent={due ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={instans} label="Instans di Engagement" accent="var(--blue)" /></div></Panel>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1fr 300px', gap: 12, alignItems: 'start' }}>
          <div>
            <div className="row jb ac wrap gap8" style={{ marginBottom: 12 }}>
              <div className="row gap6 wrap">
                {['Semua', ...TPL_PHASES].map(p => (
                  <button key={p} className="chip x" style={{ cursor: 'pointer', background: phase === p ? 'var(--blue)' : 'var(--surface-3)', color: phase === p ? '#fff' : 'var(--ink-2)' }} onClick={() => setPhase(p)}>{p}{p !== 'Semua' ? ' · ' + T.filter(t => t.phase === p).length : ''}</button>
                ))}
              </div>
              <div className="global-search" style={{ background: 'var(--surface)', border: '1px solid var(--line)', height: 30, maxWidth: 240 }}>
                <I.search2 size={14} style={{ color: 'var(--ink-4)' }} /><input style={{ color: 'var(--ink)' }} placeholder="Cari template / standar…" value={q} onChange={e => setQ(e.target.value)} />
              </div>
            </div>

            {phasesToShow.map(p => {
              const items = shown.filter(t => t.phase === p);
              return (
                <div key={p} style={{ marginBottom: 18 }}>
                  <div className="row ac gap8" style={{ marginBottom: 8 }}>
                    <span className="upper tiny" style={{ fontWeight: 700, color: 'var(--ink-3)' }}>{p}</span>
                    <span className="hr-soft" style={{ flex: 1, height: 1, background: 'var(--line-soft)' }} />
                    <span className="tiny muted">{items.length}</span>
                  </div>
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 10 }}>
                    {items.map(t => {
                      const mod = (window.MODULE_INDEX || {})[t.module] || { label: t.module, icon: 'panel' };
                      const ModIc = I[mod.icon] || I.panel;
                      const st = TPL_STATUS[t.status] || TPL_STATUS['Aktif'];
                      return (
                        <div key={t.id} className="panel" style={{ padding: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 9 }} onClick={() => setDetail(t)}>
                          <div className="row gap10 ac">
                            <FmtBadge fmt={t.fmt} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="row ac gap6" style={{ marginBottom: 2 }}>
                                <span style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.25 }} className="truncate">{t.name}</span>
                              </div>
                              <div className="row ac gap6 tiny muted">
                                <span className="mono" style={{ fontWeight: 700, color: 'var(--ink-3)' }}>{t.id}</span>
                                <span>· v{t.ver}</span>
                              </div>
                            </div>
                            <span title={t.status} style={{ width: 8, height: 8, borderRadius: 8, background: st.dot, flex: '0 0 8px' }} />
                          </div>
                          <div className="row ac gap6 wrap">
                            {t.sa.map(s => <span key={s.code} className="chip tiny" style={{ height: 18, background: 'var(--navy-050,var(--surface-3))', color: 'var(--navy)', borderColor: 'transparent' }}>{s.code}</span>)}
                          </div>
                          <div className="row jb ac" style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 8, marginTop: 'auto' }}>
                            <span className="row ac gap5 tiny" style={{ color: 'var(--blue)', fontWeight: 600 }}><ModIc size={12} /> {mod.label}</span>
                            <span className="tiny muted">{t.dl} unduhan{t.engs.length ? ' · ' + t.engs.length + ' eng.' : ''}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {!shown.length && <div className="muted tiny" style={{ padding: 24, textAlign: 'center' }}>Tidak ada template yang cocok.</div>}
          </div>

          {/* Governance rail */}
          <div className="grid" style={{ gap: 12 }}>
            <Panel title="Tata Kelola Registri">
              <div className="tiny muted" style={{ marginBottom: 10, lineHeight: 1.5 }}>Registri tunggal — modul lain menarik template terkait dari sumber yang sama (<span className="mono">AMS.TEMPLATES</span>).</div>
              {[['Aktif & disahkan', aktif, 'var(--green)'], ['Perlu reviu (jatuh tempo)', due, 'var(--amber)'], ['Draf / penyusunan', draf, 'var(--ink-4)']].map(([l, n, c]: any[]) => (
                <div key={l} style={{ marginBottom: 8 }}>
                  <div className="row jb ac" style={{ marginBottom: 3 }}><span className="tiny" style={{ color: 'var(--ink-2)' }}>{l}</span><span className="mono tiny" style={{ fontWeight: 700 }}>{n}</span></div>
                  <div style={{ height: 5, borderRadius: 3, background: 'var(--surface-3)', overflow: 'hidden' }}><div style={{ width: (T.length ? n / T.length * 100 : 0) + '%', height: '100%', background: c }} /></div>
                </div>
              ))}
              <div className="row jb ac" style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--line-soft)' }}>
                <span className="tiny muted">Diarsipkan & dikendalikan di DMS</span>
                <button className="chip tiny" style={{ cursor: 'pointer', height: 20 }} onClick={() => nav('dms', { from: 'templates' })}><I.archive size={11} /> {dmsTpl} pack</button>
              </div>
              <button className="lin-cta" style={{ marginTop: 8 }} onClick={() => nav('compmatrix', { from: 'templates' })}>
                <I.table size={13} /> Telusuri di Matriks Kepatuhan
              </button>
            </Panel>

            <Panel title="Paling Sering Dipakai">
              <div style={{ display: 'grid', gap: 0 }}>
                {topUsed.map((t, i) => (
                  <div key={t.id} className="row gap8 ac" style={{ padding: '8px 0', borderBottom: i < topUsed.length - 1 ? '1px solid var(--line-soft)' : 0, cursor: 'pointer' }} onClick={() => setDetail(t)}>
                    <span className="mono" style={{ fontWeight: 700, color: 'var(--blue)', flex: '0 0 16px' }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3 }} className="truncate">{t.name}</div><div className="tiny muted">{t.dl} unduhan</div></div>
                    <span className="chip tiny" style={{ height: 17, color: FMT_COLOR[t.fmt], borderColor: 'transparent', background: FMT_COLOR[t.fmt] + '14' }}>{t.fmt}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </div></div>
      {detail && <TemplateDetail t={detail} onClose={() => setDetail(null)} />}
    </>
  );
}

function TplDocPreview({ t }) {
  const isXls = t.fmt === 'XLSX';
  return (
    <div style={{ background: '#fff', minHeight: 360, boxShadow: 'var(--shadow)', padding: isXls ? 0 : '34px 38px' }}>
      {isXls ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5, fontFamily: 'var(--mono)' }}>
          <thead><tr>{['Ref', 'Akun', 'TA Lalu', 'Saldo', 'AJE', 'Adjusted'].map(h => <th key={h} style={{ background: '#1f7a4d', color: '#fff', padding: '6px 8px', textAlign: h === 'Ref' || h === 'Akun' ? 'left' : 'right', border: '1px solid #15603c' }}>{h}</th>)}</tr></thead>
          <tbody>{[['A', 'Kas & Setara Kas'], ['B', 'Piutang Usaha'], ['C', 'Persediaan'], ['', '⋯'], ['', 'TOTAL']].map((r, i) => <tr key={i}>{['', r[1] || '', '', '', '', ''].map((c, j) => <td key={j} style={{ padding: '5px 8px', border: '1px solid #dfe3e7', background: i % 2 ? '#f7faf8' : '#fff', textAlign: j > 1 ? 'right' : 'left', fontWeight: i === 4 ? 700 : 400 }}>{j === 0 ? r[0] : c}</td>)}</tr>)}</tbody>
        </table>
      ) : (
        <>
          <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 13.5, marginBottom: 4 }}>{t.name.toUpperCase()}</div>
          <div style={{ textAlign: 'center', fontSize: 9.5, color: '#7a8893', marginBottom: 18 }}>KAP Wijaya Hartono &amp; Rekan · Template Standar IAPI · v{t.ver}</div>
          {[1, 2, 3, 4].map(n => <div key={n} style={{ marginBottom: 13 }}><div style={{ fontWeight: 700, fontSize: 11, marginBottom: 5 }}>{n}. {['Latar Belakang', 'Ruang Lingkup', 'Prosedur', 'Kesimpulan'][n - 1]}</div>{[1, 2, 3].map(k => <div key={k} style={{ height: 6.5, background: '#eef1f4', borderRadius: 3, marginBottom: 4, width: k === 3 ? '70%' : '100%' }} />)}</div>)}
        </>
      )}
    </div>
  );
}

function TemplateDetail({ t, onClose }) {
  const nav = useNav();
  const firm = useFirm();
  const [used, setUsed] = useStateM2(false);
  const mod = (window.MODULE_INDEX || {})[t.module] || { label: t.module, icon: 'panel' };
  const ModIc = I[mod.icon] || I.panel;
  const st = TPL_STATUS[t.status] || TPL_STATUS['Aktif'];
  const engObjs = (t.engs || []).map((id: any) => ((AMS as any).ENGAGEMENTS || []).find((e: any) => e.id === id) || { id, client: '' });
  const activeEng = firm.activeEngagement;
  const go = (id) => { nav(id, { from: 'templates' }); onClose(); };
  const openSA = (s) => window.__amsOpenSA && window.__amsOpenSA({ ...s, title: s.code, fromModule: 'templates' });

  const Kv = ({ label, children }) => (
    <div><div className="tiny muted upper" style={{ marginBottom: 3, letterSpacing: '.04em' }}>{label}</div><div style={{ fontSize: 14, fontWeight: 600 }}>{children}</div></div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.4)', zIndex: 90, display: 'grid', placeItems: 'center', padding: 24 }} onClick={onClose}>
      <div className="panel" style={{ width: 1060, maxWidth: '96vw', maxHeight: '94vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, borderRadius: '4px 4px 0 0' }}>
          <span style={{ width: 40, height: 48, borderRadius: 5, background: 'rgba(255,255,255,.16)', display: 'grid', placeItems: 'center', position: 'relative', flex: '0 0 40px' }}><I.doc size={21} /><span style={{ position: 'absolute', bottom: 3, fontSize: 7.5, fontWeight: 800 }}>{t.fmt}</span></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{t.name}</div>
            <div className="row ac gap8" style={{ color: '#bcd6e4', marginTop: 3, fontSize: 12.5 }}><span className="mono">{t.id}</span><span>· {t.phase}</span><span>· {t.cat}</span></div>
          </div>
          <span className={'badge b-' + st.k} style={{ marginRight: 4 }}>{t.status}</span>
          <button className="top-btn" onClick={onClose}><I.x size={20} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', overflow: 'hidden', flex: 1 }}>
          <div style={{ background: '#e7eaef', padding: 22, overflow: 'auto' }}>
            <TplDocPreview t={t} />
            <div className="tiny" style={{ textAlign: 'center', color: '#7a8893', marginTop: 12 }}>Pratinjau — isi terisi otomatis dari konteks engagement saat digunakan.</div>
          </div>

          <div style={{ overflowY: 'auto', overflowX: 'hidden', padding: 20, borderLeft: '1px solid var(--line)', display: 'grid', gap: 16, alignContent: 'start' }}>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)' }}>{t.desc}</div>

            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Kv label="Steward">{t.steward}</Kv>
              <Kv label="Versi">v{t.ver}</Kv>
              <Kv label="Diperbarui">{tplDateID(t.updated)}</Kv>
              <Kv label="Tinjauan berikutnya"><span style={{ color: t.reviewDue ? 'var(--amber)' : 'var(--ink)' }}>{tplDateID(t.nextReview)}{t.reviewDue ? ' ⚠' : ''}</span></Kv>
              <Kv label="Retensi">{t.retention} tahun</Kv>
              <Kv label="Unduhan">{t.dl}</Kv>
            </div>

            <div>
              <div className="tiny muted upper" style={{ marginBottom: 6, letterSpacing: '.04em' }}>Modul yang memakai</div>
              <button type="button" className="lin-chip" style={{ borderLeftColor: 'var(--blue)', width: '100%' }} onClick={() => go(t.module)}>
                <span className="lin-ic" style={{ color: 'var(--blue)' }}><ModIc size={14} /></span>
                <span className="lin-txt"><span className="lin-lbl">{mod.label}</span><span className="lin-rel">Modul tujuan — template terisi & terdokumentasi di sini</span></span>
                <span className="lin-go"><I.arrowRight size={12} /></span>
              </button>
            </div>

            <div>
              <div className="tiny muted upper" style={{ marginBottom: 6, letterSpacing: '.04em' }}>Standar dipenuhi</div>
              <div className="row gap6 wrap">
                {t.sa.map(s => (
                  <button key={s.code} type="button" className="sa-rel-chip" title={s.code + (s.view ? ' — buka rujukan' : ' — lihat di Matriks Kepatuhan')} onClick={() => openSA(s)}>{s.code}</button>
                ))}
              </div>
            </div>

            {t.dmsDoc && (
              <div className="panel" style={{ padding: '9px 11px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)', cursor: 'pointer' }} onClick={() => go('dms')}>
                <div className="row jb ac"><span className="tiny" style={{ fontWeight: 600, color: 'var(--blue)' }}><I.archive size={11} /> Terkendali di DMS</span><span className="mono tiny" style={{ fontWeight: 700 }}>{t.dmsDoc}</span></div>
              </div>
            )}

            <div>
              <div className="tiny muted upper" style={{ marginBottom: 6, letterSpacing: '.04em' }}>Dipakai di engagement · {engObjs.length}</div>
              <div className="grid" style={{ gap: 5 }}>
                {engObjs.length ? engObjs.map(e => (
                  <div key={e.id} className="row jb ac" style={{ fontSize: 12.5, padding: '7px 10px', border: '1px solid var(--line-soft)', borderRadius: 6 }}>
                    <span className="mono" style={{ fontWeight: 700, color: 'var(--ink-2)' }}>{e.id}</span>
                    <span className="truncate muted" style={{ maxWidth: 150 }}>{(e.client || '').replace('PT ', '')}</span>
                  </div>
                )) : <span className="tiny muted">Template tingkat firma — belum diinstansiasi ke engagement.</span>}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <span className="tiny muted">{used ? <span style={{ color: 'var(--green)', fontWeight: 600 }}><I.checkCircle size={12} /> Disalin ke berkas {activeEng ? activeEng.id : 'engagement'} — terdaftar di DMS &amp; modul {mod.label}.</span> : 'Registri tunggal · perubahan mengalir ke seluruh modul terkait.'}</span>
          <div className="row gap8">
            <Btn onClick={onClose}>Tutup</Btn>
            <Btn><I.download size={14} /> Unduh</Btn>
            <Btn variant="primary" onClick={() => setUsed(true)} disabled={used} style={{ opacity: used ? .5 : 1 }}><I.plus size={14} /> Gunakan{activeEng ? ' di ' + activeEng.id : ''}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Templates });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { Templates };
