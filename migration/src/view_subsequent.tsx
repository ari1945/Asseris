/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Panel, Stat } from './ui';
import { SE_EVENTS, scanSubsequent, BOOK_STATUS_META, DISC_STATUS_META, type SubsequentEvent, type SeReflection } from './canon_subsequent';

/* ============================================================
   Asseris — Subsequent Events (SA 560 / PSAK 8)
   Daftar peristiwa bersumber dari canon_subsequent (SSOT);
   rekonsiliasi perlakuan LK (penyesuai→AJE, non-penyesuai→
   pengungkapan) memakai register AJE kanonik (AMS.AJE).
   ============================================================ */
const { useState: useStateSE } = React;

const SE_PROCEDURES = [
  { t: 'Inquiry kepada manajemen atas peristiwa setelah tgl neraca', done: true },
  { t: 'Telaah notulen RUPS/Direksi/Komisaris hingga tgl laporan', done: true },
  { t: 'Telaah laporan keuangan interim terkini', done: true },
  { t: 'Inquiry status litigasi & klaim ke penasihat hukum', done: false },
  { t: 'Peroleh representasi tertulis manajemen (SA 580)', done: false },
];

function SubsequentEvents() {
  const { fmt } = AMS;
  const nav = useNav();
  const [events, setEvents] = useStateSE(SE_EVENTS as SubsequentEvent[]);
  const [selId, setSelId] = useStateSE('SE-01');
  const [procs, setProcs] = useStateSE(SE_PROCEDURES);

  const sel = events.find((e: any) => e.id === selId);
  const adjusting = events.filter((e: any) => e.type === 'adjusting').length;

  /* —— Rekonsiliasi perlakuan LK: penyesuai→AJE, non-penyesuai→pengungkapan —— */
  const scan = scanSubsequent({ events, aje: AMS.AJE });
  const reflById = new Map(scan.reflections.map(r => [r.id, r]));
  const openGap = (r: SeReflection) => { setSelId(r.id); nav(r.type === 'adjusting' ? 'aje' : 'disclosure'); };
  const setType = (id: any, type: any) => setEvents((list: any) => list.map((e: any) => e.id === id ? { ...e, type } : e));
  const toggleProc = (i: any) => setProcs((ps: any) => ps.map((p: any, idx: any) => idx === i ? { ...p, done: !p.done } : p));
  const procDone = procs.filter((p: any) => p.done).length;
  const periodDays = 73; // 31 Dec 2025 -> 14 Mar 2026

  return (
    <>
      <SubBar moduleId="subsequent" right={
        <div className="row gap8 ac">
          <Badge kind="blue">SA 560 · PSAK 8</Badge>
          <Btn sm><I.download size={13} /> Memo Subsequent Events</Btn>
          <Btn sm variant="primary"><I.plus size={14} /> Catat Peristiwa</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad">
          {/* timeline */}
          <Panel noBody style={{ marginBottom: 12 }}>
            <div style={{ padding: '14px 18px 18px' }}>
              <div className="row jb ac" style={{ marginBottom: 14 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>Periode Peristiwa Kemudian</span>
                <span className="tiny muted">31 Des 2025 (tgl neraca) → 14 Mar 2026 (tgl laporan) · {periodDays} hari</span>
              </div>
              <div style={{ position: 'relative', height: 64, margin: '0 8px' }}>
                {/* line */}
                <div style={{ position: 'absolute', top: 30, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,var(--blue),var(--navy))', borderRadius: 3 }} />
                {/* endpoints */}
                <div style={{ position: 'absolute', left: 0, top: 22, textAlign: 'left' }}><div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--navy)', border: '2px solid #fff', boxShadow: '0 0 0 1px var(--navy)' }} /><div className="tiny mono" style={{ marginTop: 8, color: 'var(--navy)', fontWeight: 700 }}>31 Des</div></div>
                <div style={{ position: 'absolute', right: 0, top: 22, textAlign: 'right' }}><div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--navy)', border: '2px solid #fff', boxShadow: '0 0 0 1px var(--navy)', marginLeft: 'auto' }} /><div className="tiny mono" style={{ marginTop: 8, color: 'var(--navy)', fontWeight: 700 }}>14 Mar</div></div>
                {/* events */}
                {events.map((e: any) => {
                  const pct = (e.day / periodDays) * 96 + 2;
                  const isSel = e.id === selId;
                  return (
                    <div key={e.id} onClick={() => setSelId(e.id)} title={e.title} style={{ position: 'absolute', left: pct + '%', top: 24, transform: 'translateX(-50%)', cursor: 'pointer', textAlign: 'center' }}>
                      <div style={{ width: isSel ? 16 : 12, height: isSel ? 16 : 12, borderRadius: '50%', background: e.type === 'adjusting' ? 'var(--red)' : 'var(--amber)', border: '2px solid #fff', boxShadow: isSel ? '0 0 0 2px var(--navy)' : '0 0 0 1px rgba(0,0,0,.15)', transition: '.1s', marginTop: isSel ? -2 : 0 }} />
                      <div className="tiny mono" style={{ marginTop: 6, color: 'var(--ink-3)' }}>{e.id}</div>
                    </div>
                  );
                })}
              </div>
              <div className="row gap12" style={{ marginTop: 6 }}>
                <span className="row ac gap6 tiny"><span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--red)' }} /> Penyesuai (Type 1)</span>
                <span className="row ac gap6 tiny"><span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--amber)' }} /> Non-Penyesuai (Type 2)</span>
              </div>
            </div>
          </Panel>

          {/* —— rekonsiliasi perlakuan ke laporan keuangan (inti SA 560) —— */}
          <Panel noBody style={{ marginBottom: 12 }}>
            <div className="panel-h">
              <h3>Rekonsiliasi ke Laporan Keuangan</h3>
              <div style={{ flex: 1 }} />
              <Badge kind="blue">SA 560 ¶6,10 · PSAK 8</Badge>
            </div>
            <div style={{ padding: '11px 14px' }}>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 12 }}>
                <Stat value={scan.rollup.gaps} label="Gap Perlakuan" accent={scan.rollup.gaps ? 'var(--red)' : 'var(--green)'} />
                <Stat value={'Rp ' + fmt(scan.rollup.adjustingImpact / 1e9, 2) + ' M'} label="Dampak Penyesuai" />
                <Stat value={'Rp ' + fmt(scan.rollup.unbookedImpact / 1e9, 2) + ' M'} label="Belum Dibukukan" accent={scan.rollup.unbookedImpact ? 'var(--red)' : undefined} />
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {scan.reflections.map((r: SeReflection) => {
                  const meta = r.type === 'adjusting' ? BOOK_STATUS_META[r.bookStatus!] : DISC_STATUS_META[r.discStatus!];
                  const need = r.type === 'adjusting' ? 'Penyesuai → wajib dibukukan (jurnal penyesuai)' : 'Non-penyesuai → wajib diungkapkan (CALK)';
                  return (
                    <div key={r.id} onClick={() => r.isGap && openGap(r)} className="panel row jb ac" style={{ padding: '9px 11px', borderColor: 'var(--line)', cursor: r.isGap ? 'pointer' : 'default', borderLeft: '3px solid var(--' + (r.isGap ? meta.k : 'line') + ')' }}>
                      <span className="row ac gap8" style={{ minWidth: 0 }}>
                        <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.id}</span>
                        <span style={{ minWidth: 0 }}>
                          <div className="truncate" style={{ fontSize: 12, fontWeight: 600, maxWidth: 360 }}>{r.title}</div>
                          <div className="tiny muted">{need}{r.ajeId ? ' · ' + r.ajeId : ''}</div>
                        </span>
                      </span>
                      <span className="row ac gap8" style={{ flexShrink: 0 }}>
                        <span className="mono tiny" style={{ fontWeight: 700 }}>Rp {fmt(r.amount / 1e6, 0)} jt</span>
                        <Badge kind={meta.k}>{meta.l}</Badge>
                      </span>
                    </div>
                  );
                })}
              </div>
              {scan.rollup.gaps > 0 && (
                <div className="tiny muted" style={{ marginTop: 9, lineHeight: 1.45 }}>
                  <I.alert size={12} style={{ verticalAlign: 'middle', color: 'var(--red)' }} /> {scan.rollup.unbookedCount} peristiwa penyesuai belum dibukukan & {scan.rollup.undisclosedCount} non-penyesuai belum diungkap — klik untuk tindak lanjut ke AJE / Daftar-Uji Pengungkapan.
                </div>
              )}
            </div>
          </Panel>

          <div className="grid" style={{ gridTemplateColumns: '1fr 320px', gap: 12, alignItems: 'start' }}>
            <div className="grid" style={{ gap: 12 }}>
              <Panel noBody>
                <div className="panel-h"><h3>Daftar Peristiwa Kemudian</h3><div style={{ flex: 1 }} /><span className="tiny muted">{adjusting} penyesuai · {events.length - adjusting} non-penyesuai</span></div>
                <table className="dtbl">
                  <thead><tr><th>ID</th><th>Tanggal</th><th>Peristiwa</th><th className="num">Dampak (Rp)</th><th style={{ width: 130 }}>Klasifikasi</th></tr></thead>
                  <tbody>
                    {events.map((e: any) => (
                      <tr key={e.id} className={e.id === selId ? 'sel' : ''} onClick={() => setSelId(e.id)} style={{ cursor: 'pointer' }}>
                        <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{e.id}</td>
                        <td className="mono tiny">{new Date(e.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</td>
                        <td className="truncate" style={{ maxWidth: 320, whiteSpace: 'normal', lineHeight: 1.35, fontSize: 11.5 }}>{e.title}</td>
                        <td className="num">{fmt(e.amount / 1e6, 0)} jt</td>
                        <td>{e.type === 'adjusting' ? <Badge kind="red">Penyesuai</Badge> : <Badge kind="amber">Non-Penyesuai</Badge>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>

              {sel && (
                <Panel noBody>
                  <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }} className="row ac gap8">
                    <span className="mono" style={{ fontWeight: 700, color: 'var(--blue)' }}>{sel.id}</span>
                    <span className="tiny muted mono">{new Date(sel.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                    <div style={{ flex: 1 }} />
                    <span className="tiny muted">Dampak Rp {fmt(sel.amount / 1e6, 0)} jt</span>
                  </div>
                  <div style={{ padding: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{sel.title}</div>
                    <p style={{ margin: '0 0 12px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-2)' }}>{sel.desc}</p>
                    <div className="panel" style={{ padding: '9px 11px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)', marginBottom: 14 }}>
                      <div className="tiny muted upper" style={{ marginBottom: 2 }}>Perlakuan Akuntansi (PSAK 8)</div>
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}>{sel.treatment}</div>
                    </div>
                    <div className="tiny muted upper" style={{ marginBottom: 6 }}>Klasifikasi — geser sesuai pertimbangan</div>
                    <div className="seg" style={{ width: 'fit-content' }}>
                      <button className={sel.type === 'adjusting' ? 'on' : ''} onClick={() => setType(sel.id, 'adjusting')}>Penyesuai (Type 1)</button>
                      <button className={sel.type === 'nonadjusting' ? 'on' : ''} onClick={() => setType(sel.id, 'nonadjusting')}>Non-Penyesuai (Type 2)</button>
                    </div>
                  </div>
                </Panel>
              )}
            </div>

            <Panel title="Prosedur Audit (SA 560)" sub={procDone + '/' + procs.length}>
              <div style={{ display: 'grid', gap: 0 }}>
                {procs.map((p: any, i: any) => (
                  <label key={i} className="row gap8" style={{ padding: '8px 0', cursor: 'pointer', alignItems: 'flex-start', borderBottom: i < procs.length - 1 ? '1px solid var(--line-soft)' : 0 }} onClick={() => toggleProc(i)}>
                    <span style={{ flex: '0 0 16px', width: 16, height: 16, borderRadius: 4, marginTop: 1, border: '1.5px solid ' + (p.done ? 'var(--green)' : 'var(--line-strong)'), background: p.done ? 'var(--green)' : '#fff', display: 'grid', placeItems: 'center' }}>{p.done && <I.check size={11} style={{ color: '#fff' }} />}</span>
                    <span style={{ fontSize: 11.5, lineHeight: 1.4, color: p.done ? 'var(--ink-3)' : 'var(--ink)' }}>{p.t}</span>
                  </label>
                ))}
              </div>
              <div className="divider" />
              <div className="panel" style={{ padding: '9px 11px', background: procDone === procs.length ? 'var(--green-bg)' : 'var(--amber-bg)', borderColor: 'transparent' }}>
                <div className="row ac gap8"><span style={{ color: procDone === procs.length ? 'var(--green)' : 'var(--amber)' }}>{procDone === procs.length ? <I.checkCircle size={15} /> : <I.clock size={15} />}</span>
                  <span style={{ fontSize: 11.5, lineHeight: 1.4 }}>{procDone === procs.length ? 'Seluruh prosedur selesai — siap kesimpulan & representasi tertulis.' : `${procs.length - procDone} prosedur belum diselesaikan hingga tgl laporan.`}</span>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { SubsequentEvents });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SubsequentEvents };
