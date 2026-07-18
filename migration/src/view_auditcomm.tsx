/* [codemod] ESM imports */
import React from 'react';
import { AMS_CANON } from './canon';
import { useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Avatar, Badge, Btn, Panel } from './ui';

/* ============================================================
   Asseris — Komunikasi Komite Audit (POJK 55/2015)
   ------------------------------------------------------------
   Dimensi komunikasi auditor–komite audit DI LUAR SA 260: tugas
   komite audit per POJK 55/POJK.04/2015 (pedoman kerja) & POJK
   13/POJK.03/2017 (rekomendasi penunjukan AP/KAP), komposisi
   komite, daftar-uji tugas, serta risalah rapat dengan auditor.
   Data ditarik dari AMS_CANON.ojkAuditComm(). (Gap G16)
   ============================================================ */
const { useState: useStateAc, useMemo: useMemoAc } = React;

function AcCard({ value, label, sub, accent }: any) {
  return (
    <div className="panel" style={{ padding: '12px 14px', display: 'grid', gap: 2 }}>
      <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: accent || 'var(--navy)', lineHeight: 1.05 }}>{value}</div>
      <div className="tiny muted" style={{ fontWeight: 600 }}>{label}</div>
      {sub && <div className="tiny" style={{ color: 'var(--ink-4)' }}>{sub}</div>}
    </div>
  );
}

const AC_MEETING_KIND = { 'Pra-audit': 'blue', 'Interim': 'amber', 'Penyelesaian': 'purple', 'Independensi': 'teal' };

function AuditCommitteeView() {
  const nav = useNav();
  const loader = window.loadLS || ((k, d) => d);
  const A = useMemoAc(() => AMS_CANON.ojkAuditComm(), []);

  const [tab, setTab] = useStateAc(() => loader('ams.auditcomm.tab', 'tugas'));
  const [done, setDone] = useStateAc(() => loader('ams.auditcomm.done', {}));
  React.useEffect(() => { try { localStorage.setItem('ams.auditcomm.tab', JSON.stringify(tab)); } catch (e) {} }, [tab]);
  React.useEffect(() => { try { localStorage.setItem('ams.auditcomm.done', JSON.stringify(done)); } catch (e) {} }, [done]);

  const isDone = (it: any) => (done[it.ref] != null ? done[it.ref] : it.done);
  const toggle = (ref: any) => { const it = A.duties.find((d: any) => d.ref === ref); setDone((m: any) => ({ ...m, [ref]: !(m[ref] != null ? m[ref] : it.done) })); };
  const doneCount = A.duties.filter(isDone).length;
  const score = Math.round(doneCount / A.duties.length * 100);

  const TABS = [
    { id: 'tugas', label: 'Daftar-Uji Tugas' },
    { id: 'rapat', label: 'Risalah Rapat Auditor' },
    { id: 'komposisi', label: 'Komposisi & Syarat' },
  ];

  return (
    <>
      <SubBar moduleId="auditcomm" right={
        <div className="row gap8 ac">
          <Badge kind="purple">POJK 55/2015</Badge>
          <Btn sm onClick={() => nav('sa260', { from: 'auditcomm' })}><I.mail size={13} /> SA 260 · TCWG</Btn>
          <Btn sm onClick={() => nav('nonaudit', { from: 'auditcomm' })}><I.briefcase size={13} /> Pra-persetujuan NAS</Btn>
          <Btn sm variant="primary" onClick={() => nav('governance', { from: 'auditcomm' })}><I.building size={14} /> Governance</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            <AcCard value={score + '%'} label="Daftar-Uji Tugas Komite" sub={doneCount + '/' + A.duties.length + ' tugas terdokumentasi'} accent={score === 100 ? 'var(--green)' : 'var(--amber)'} />
            <AcCard value={A.meetings.length} label="Rapat dengan Auditor" sub="terpisah dari komunikasi SA 260" accent="var(--navy)" />
            <AcCard value={A.composition.length} label="Anggota Komite" sub={A.chairIndep ? 'diketuai Komisaris Independen' : 'periksa kepengurusan'} accent="var(--purple)" />
            <AcCard value={A.hasFin ? 'Sesuai' : 'Periksa'} label="Kompetensi Keuangan" sub="≥1 anggota ahli akuntansi/keuangan" accent={A.hasFin ? 'var(--green)' : 'var(--red)'} />
          </div>

          <div className="panel" style={{ padding: '10px 14px', background: 'var(--blue-050)', borderColor: 'transparent' }}>
            <div className="row gap8" style={{ alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--blue)', marginTop: 1, flex: '0 0 auto' }}><I.link2 size={14} /></span>
              <div style={{ fontSize: 12, lineHeight: 1.55 }}>Modul melengkapi dimensi <b>regulatori OJK</b> dari komunikasi komite audit — di luar komunikasi audit formal <b>SA 260</b> yang sudah tercakup. Acuan: <span className="mono">{A.reg}</span>.</div>
            </div>
          </div>

          <div className="seg" style={{ width: 'fit-content', flexWrap: 'wrap' }}>
            {TABS.map(t => <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>)}
          </div>

          {/* ===== TAB · TUGAS ===== */}
          {tab === 'tugas' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
              <Panel noBody>
                <div className="panel-h"><h3>Daftar-Uji Tugas Komite Audit</h3><span className="sub mono">POJK 55/2015 Ps. 4</span><div style={{ flex: 1 }} /><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)' }}>{doneCount}/{A.duties.length}</span></div>
                <div>
                  {A.duties.map((d: any, i: any) => {
                    const on = isDone(d);
                    return (
                      <div key={d.ref} className="row gap10" style={{ padding: '10px 14px', alignItems: 'flex-start', borderBottom: i < A.duties.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                        <span onClick={() => toggle(d.ref)} style={{ cursor: 'pointer', flex: '0 0 16px', width: 16, height: 16, borderRadius: 4, marginTop: 1, border: '1.5px solid ' + (on ? 'var(--green)' : 'var(--line-strong)'), background: on ? 'var(--green)' : '#fff', display: 'grid', placeItems: 'center' }}>{on && <I.check size={11} style={{ color: '#fff' }} />}</span>
                        <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--purple)', width: 40, flex: '0 0 40px', marginTop: 1 }}>{d.ref}</span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span onClick={() => toggle(d.ref)} style={{ cursor: 'pointer', display: 'block', fontSize: 12.5, lineHeight: 1.45, color: on ? 'var(--ink-3)' : 'var(--ink)', textDecoration: on ? 'line-through' : 'none' }}>{d.t}</span>
                          <span className="tiny mono muted" style={{ display: 'block', marginTop: 2 }}>{d.basis}</span>
                        </span>
                        {d.view && <button onClick={() => nav(d.view, { from: 'auditcomm' })} title="Buka modul terkait" className="row ac" style={{ flex: '0 0 auto', padding: '3px 7px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer' }}><I.link2 size={12} style={{ color: 'var(--blue)' }} /></button>}
                      </div>
                    );
                  })}
                </div>
              </Panel>

              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div style={{ background: 'linear-gradient(120deg,#3d2a73,#5b3fa6)', color: '#fff', padding: '14px 16px' }}>
                    <div className="tiny upper" style={{ color: '#d6cdf0', letterSpacing: '.05em', marginBottom: 8 }}>Dokumentasi Tugas Komite</div>
                    <div className="row ac gap12">
                      <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1, fontFamily: 'JetBrains Mono, monospace' }}>{score}<span style={{ fontSize: 18 }}>%</span></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,.18)', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: score + '%', background: score === 100 ? '#4ade80' : '#c4b5fd', borderRadius: 4, transition: '.3s' }} /></div>
                        <div className="tiny" style={{ color: '#d6cdf0', marginTop: 6 }}>{doneCount}/{A.duties.length} tugas terdokumentasi</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: 14 }}>
                    <div className="tiny muted" style={{ lineHeight: 1.55 }}>Komite Audit memberi rekomendasi penunjukan AP/KAP, mengevaluasi independensi & mutu audit, serta menelaah LK dan ketaatan regulasi — melengkapi komunikasi audit formal SA 260.</div>
                  </div>
                </Panel>
                <Panel title="Tautan Terkait" sub="lineage">
                  <div style={{ display: 'grid', gap: 6 }}>
                    {A.bridge.map((m: any) => { const IconC = (I as any)[m.icon || 'link2'] || I.link2; return (
                      <button key={m.id} onClick={() => nav(m.id, { from: 'auditcomm' })} className="row ac gap9" style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', borderLeft: '3px solid var(--purple)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                        <span style={{ color: 'var(--purple)', flex: '0 0 auto' }}><IconC size={15} /></span>
                        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600 }}>{m.lbl}</div><div className="tiny muted" style={{ lineHeight: 1.35 }}>{m.rel}</div></div>
                        <I.arrowRight size={13} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                      </button>
                    ); })}
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {/* ===== TAB · RAPAT ===== */}
          {tab === 'rapat' && (
            <Panel noBody>
              <div className="panel-h"><h3>Risalah Rapat Auditor ↔ Komite Audit</h3><span className="sub mono">terpisah dari komunikasi TCWG (SA 260)</span></div>
              <div>
                {A.meetings.map((m: any, i: any) => (
                  <div key={i} className="row gap12" style={{ padding: '12px 14px', alignItems: 'flex-start', borderBottom: i < A.meetings.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                    <div style={{ flex: '0 0 86px', width: 86 }}>
                      <div className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>{m.date}</div>
                      <Badge kind={(AC_MEETING_KIND as any)[m.kind] || 'gray'}>{m.kind}</Badge>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.45 }}>{m.topic}</div>
                      <div className="tiny muted" style={{ marginTop: 2 }}><I.users size={11} style={{ verticalAlign: -2, marginRight: 3 }} />{m.who}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="tiny muted" style={{ padding: '10px 14px 12px', lineHeight: 1.5 }}>Rapat komite audit mencakup rekomendasi penunjukan KAP, evaluasi independensi & mutu, serta telaah LK — sebagian beririsan dengan, namun tidak menggantikan, komunikasi formal auditor–TCWG (SA 260).</div>
            </Panel>
          )}

          {/* ===== TAB · KOMPOSISI ===== */}
          {tab === 'komposisi' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
              <Panel noBody>
                <div className="panel-h"><h3>Komposisi Komite Audit</h3><span className="sub mono">POJK 55/2015 Ps. 4–10</span></div>
                <div>
                  {A.composition.map((c: any, i: any) => (
                    <div key={i} className="row ac gap10" style={{ padding: '15px 18px', borderBottom: i < A.composition.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                      <Avatar name={c.name} size={30} />
                      <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12.5, fontWeight: 600 }}>{c.name}</div><div className="tiny muted">{c.role}</div></div>
                      <div className="row gap6">
                        {c.indep && <Badge kind="green">Independen</Badge>}
                        {c.fin && <Badge kind="blue">Ahli Keuangan</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel title="Pemenuhan Syarat" sub="checklist persyaratan">
                <div style={{ display: 'grid', gap: 9 }}>
                  {[
                    { ok: A.compMin, t: 'Beranggotakan paling sedikit 3 orang' },
                    { ok: A.chairIndep, t: 'Diketuai oleh Komisaris Independen' },
                    { ok: A.hasFin, t: '≥1 anggota berlatar akuntansi/keuangan' },
                    { ok: true, t: 'Anggota dari pihak independen (di luar emiten)' },
                    { ok: true, t: 'Memiliki piagam (charter) komite audit' },
                  ].map((r, i) => (
                    <div key={i} className="row ac gap8">
                      <span style={{ width: 16, height: 16, borderRadius: 4, background: r.ok ? 'var(--green)' : 'var(--red)', display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>{r.ok ? <I.check size={11} style={{ color: '#fff' }} /> : <I.x size={11} style={{ color: '#fff' }} />}</span>
                      <span style={{ fontSize: 12, lineHeight: 1.4 }}>{r.t}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          )}

          <div className="tiny muted" style={{ padding: '0 2px 4px', lineHeight: 1.5 }}>
            Modul melengkapi dimensi regulatori OJK komunikasi komite audit ({A.reg}) di luar SA 260 — daftar-uji tugas (rekomendasi penunjukan AP/KAP, evaluasi independensi, telaah LK & ketaatan regulasi), risalah rapat auditor, hingga pemenuhan syarat komposisi. Angka ditarik dari satu sumber kebenaran <span className="mono">AMS_CANON.ojkAuditComm()</span>; status tersimpan otomatis.
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { AuditCommitteeView });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { AuditCommitteeView };
