/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data.js';
import { useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Avatar, Badge, Btn, Panel, Progress, Seg, Stat } from './ui.jsx';
import { KvBox } from './view_analytical.jsx';

/* ============================================================
   NeoSuite AMS — Delivery & Milestones (Practice Operations · D+)
   Gantt fase perikatan + pelacakan milestone & deadline.
   ============================================================ */
const { useState: useStateDlv, useMemo: useMemoDlv } = React;

const DLV_PHASE_COLOR = { Perencanaan: 'var(--purple)', Eksekusi: 'var(--blue)', Finalisasi: 'var(--teal)' };
const DLV_MS_COLOR = { done: 'var(--green)', due: 'var(--amber)', upcoming: 'var(--ink-4)' };
const DLV_d = (s) => new Date(s + 'T00:00:00');
const DLV_fmtDate = (s) => DLV_d(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
const DLV_daysTo = (s, today) => Math.round((DLV_d(s) - DLV_d(today)) / 864e5);

function DeliveryMilestones() {
  const { fmt, DELIVERY, DELIVERY_WINDOW, ENGAGEMENTS, CLIENTS } = AMS;
  const win = DELIVERY_WINDOW;
  const t0 = DLV_d(win.start).getTime(), t1 = DLV_d(win.end).getTime();
  const span = t1 - t0;
  const frac = (s) => ((DLV_d(s).getTime() - t0) / span) * 100;
  const today = win.today;
  const nav = useNav();

  const [filter, setFilter] = useStateDlv('Semua');
  const [sel, setSel] = useStateDlv(null);

  const engById = (id) => ENGAGEMENTS.find(e => e.id === id) || {};
  const cliOf = (e) => CLIENTS.find(c => c.id === e.clientId) || {};

  // month gridlines
  const months = useMemoDlv(() => {
    const out = []; const d = new Date(t0); d.setDate(1);
    while (d.getTime() <= t1) {
      out.push({ label: d.toLocaleDateString('id-ID', { month: 'short' }), pos: ((d.getTime() - t0) / span) * 100 });
      d.setMonth(d.getMonth() + 1);
    }
    return out;
  }, []);

  const rows = DELIVERY.map(p => ({ ...p, e: engById(p.id), c: cliOf(engById(p.id)) }))
    .filter(r => r.e.status !== 'Completed' || filter === 'Semua' ? true : true);

  // KPIs
  const allMs = DELIVERY.flatMap(p => p.milestones.map(m => ({ ...m, eng: p.id })));
  const active = DELIVERY.filter(p => engById(p.id).status !== 'Completed');
  const dueSoon = allMs.filter(m => m.status !== 'done' && DLV_daysTo(m.date, today) >= 0 && DLV_daysTo(m.date, today) <= 7).length;
  const atRisk = active.filter(p => { const e = engById(p.id); return DLV_daysTo(e.deadline, today) <= 14 && e.progress < 85; }).length;
  const overdueMs = allMs.filter(m => m.status !== 'done' && DLV_daysTo(m.date, today) < 0).length;

  const shown = filter === 'Semua' ? rows : filter === 'Aktif' ? rows.filter(r => r.e.status !== 'Completed') : rows.filter(r => DLV_daysTo(r.e.deadline, today) <= 14 && r.e.progress < 85 && r.e.status !== 'Completed');

  const upcoming = allMs.filter(m => m.status !== 'done')
    .sort((a, b) => DLV_d(a.date) - DLV_d(b.date)).slice(0, 7);

  const selRow = sel ? rows.find(r => r.id === sel) : null;

  return (
    <>
      <SubBar moduleId="delivery" right={
        <div className="row gap8 ac">
          <Seg options={['Semua', 'Aktif', 'At-risk']} value={filter} onChange={setFilter} />
          <Btn sm><I.download size={13} /> Ekspor Rencana</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={active.length} label="Perikatan Aktif" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={dueSoon} label="Milestone ≤ 7 hari" accent="var(--blue)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={atRisk} label="Perikatan At-risk" accent={atRisk ? 'var(--red)' : 'var(--green)'} /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={overdueMs} label="Milestone Lewat Tempo" accent={overdueMs ? 'var(--red)' : 'var(--green)'} /></div></Panel>
        </div>

        {/* Gantt */}
        <Panel noBody style={{ marginBottom: 12 }}>
          <div className="panel-h"><h3>Linimasa Pengiriman — Fase & Milestone</h3><div style={{ flex: 1 }} />
            <div className="row gap10 ac">
              {Object.entries(DLV_PHASE_COLOR).map(([k, v]) => <span key={k} className="row ac gap6"><span style={{ width: 9, height: 9, borderRadius: 2, background: v }} /><span className="tiny muted">{k}</span></span>)}
            </div>
          </div>
          <div style={{ padding: '4px 14px 14px' }}>
            {/* month header */}
            <div style={{ position: 'relative', height: 18, marginLeft: 214, borderBottom: '1px solid var(--line)' }}>
              {months.map((m, i) => <span key={i} className="tiny muted upper" style={{ position: 'absolute', left: m.pos + '%', top: 2, fontSize: 9.5, letterSpacing: '.04em' }}>{m.label}</span>)}
              <span style={{ position: 'absolute', left: frac(today) + '%', top: -2, bottom: -2000, width: 2, background: 'var(--red)', opacity: .8, zIndex: 3 }} />
            </div>
            {shown.map((r, ri) => {
              const used = r.e.budgetHrs ? Math.round(r.e.actualHrs / r.e.budgetHrs * 100) : 0;
              const dl = DLV_daysTo(r.e.deadline, today);
              return (
                <div key={r.id} onClick={() => setSel(sel === r.id ? null : r.id)}
                  className="row ac" style={{ padding: '7px 0', borderBottom: ri < shown.length - 1 ? '1px solid var(--line-soft)' : 0, cursor: 'pointer' }}>
                  <div style={{ width: 214, flex: '0 0 214px', paddingRight: 12 }}>
                    <div className="row ac gap8">
                      <Avatar name={r.e.partner || ''} size={24} />
                      <div style={{ minWidth: 0 }}>
                        <div className="truncate" style={{ fontSize: 12, fontWeight: 600 }}>{(r.c.name || r.id).replace('PT ', '')}</div>
                        <div className="tiny muted mono">{r.id} · {r.e.progress}%</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ flex: 1, position: 'relative', height: 30 }}>
                    {/* phase bars */}
                    {r.phases.map((ph, pi) => (
                      <div key={pi} title={ph.name + ' · ' + DLV_fmtDate(ph.start) + '–' + DLV_fmtDate(ph.end)}
                        style={{ position: 'absolute', top: 9, height: 12, left: frac(ph.start) + '%', width: Math.max(0.6, frac(ph.end) - frac(ph.start)) + '%', background: DLV_PHASE_COLOR[ph.name], borderRadius: 3, opacity: r.e.status === 'Completed' ? .42 : .9 }} />
                    ))}
                    {/* milestone diamonds */}
                    {r.milestones.map((m, mi) => (
                      <span key={mi} title={m.label + ' · ' + DLV_fmtDate(m.date)}
                        style={{ position: 'absolute', top: 8, left: 'calc(' + frac(m.date) + '% - 6px)', width: 12, height: 12, background: DLV_MS_COLOR[m.status], transform: 'rotate(45deg)', borderRadius: 2, border: '1.5px solid var(--surface)', zIndex: 2 }} />
                    ))}
                    {/* today line */}
                    <span style={{ position: 'absolute', top: -7, bottom: -7, left: frac(today) + '%', width: 2, background: 'var(--red)', opacity: .55 }} />
                  </div>
                  <div style={{ width: 86, flex: '0 0 86px', textAlign: 'right' }}>
                    <Badge kind={dl < 0 ? 'red' : dl <= 14 ? 'amber' : 'gray'}>{dl < 0 ? Math.abs(dl) + 'h lewat' : dl + ' hari'}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <div className="grid" style={{ gridTemplateColumns: selRow ? '1fr 1fr 340px' : '1fr 1fr', gap: 12, alignItems: 'start' }}>
          <Panel title="Milestone Mendatang" sub="lintas perikatan">
            <div style={{ display: 'grid', gap: 0 }}>
              {upcoming.map((m, i) => {
                const dl = DLV_daysTo(m.date, today);
                return (
                  <div key={i} className="row ac jb" style={{ padding: '8px 0', borderBottom: i < upcoming.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                    <span className="row ac gap8" style={{ minWidth: 0 }}>
                      <span style={{ width: 10, height: 10, background: DLV_MS_COLOR[m.status], transform: 'rotate(45deg)', borderRadius: 2, flex: '0 0 10px' }} />
                      <span style={{ minWidth: 0 }}>
                        <div className="truncate" style={{ fontSize: 12, fontWeight: 600 }}>{m.label}</div>
                        <div className="tiny muted mono">{m.eng}</div>
                      </span>
                    </span>
                    <span style={{ textAlign: 'right' }}>
                      <div className="mono tiny" style={{ fontWeight: 700 }}>{DLV_fmtDate(m.date)}</div>
                      <div className="tiny" style={{ color: dl < 0 ? 'var(--red)' : dl <= 7 ? 'var(--amber)' : 'var(--ink-3)' }}>{dl < 0 ? Math.abs(dl) + 'h lewat' : 'dalam ' + dl + 'h'}</div>
                    </span>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Status Pengiriman" sub="risiko deadline">
            <div style={{ display: 'grid', gap: 8 }}>
              {active.map(p => {
                const e = engById(p.id), c = cliOf(e);
                const dl = DLV_daysTo(e.deadline, today);
                const burn = e.budgetHrs ? e.actualHrs / e.budgetHrs * 100 : 0;
                const risk = dl <= 14 && e.progress < 85;
                return (
                  <div key={p.id} className="panel" style={{ padding: '9px 11px', background: risk ? 'var(--amber-bg)' : 'var(--surface-2)', borderColor: 'transparent' }}>
                    <div className="row ac jb" style={{ marginBottom: 5 }}>
                      <span className="truncate" style={{ fontSize: 12, fontWeight: 600 }}>{(c.name || p.id).replace('PT ', '')}</span>
                      <span className="mono tiny" style={{ fontWeight: 700, color: dl <= 14 ? 'var(--red)' : 'var(--ink-3)' }}>{DLV_fmtDate(e.deadline)}</span>
                    </div>
                    <div className="row ac gap8">
                      <div style={{ flex: 1 }}><Progress value={e.progress} color={risk ? 'var(--amber)' : 'var(--blue)'} /></div>
                      <span className="tiny muted mono">progres {e.progress}%</span>
                    </div>
                    <div className="tiny muted" style={{ marginTop: 4 }}>Burn jam: <b style={{ color: burn > e.progress + 12 ? 'var(--red)' : 'var(--ink-2)' }}>{Math.round(burn)}%</b> dari budget · {fmt(e.actualHrs)}/{fmt(e.budgetHrs)}h</div>
                  </div>
                );
              })}
            </div>
          </Panel>

          {selRow && <DeliveryDetail row={selRow} eng={selRow.e} client={selRow.c} today={today} onClose={() => setSel(null)} onNav={nav} />}
        </div>
      </div></div>
    </>
  );
}

function DeliveryDetail({ row, eng, client, today, onClose, onNav }) {
  const { fmt } = AMS;
  const burn = eng.budgetHrs ? Math.round(eng.actualHrs / eng.budgetHrs * 100) : 0;
  const overburn = burn > eng.progress + 12;
  return (
    <Panel noBody style={{ position: 'sticky', top: 0 }}>
      <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '13px 15px' }}>
        <div className="row jb ac" style={{ marginBottom: 6 }}><span className="mono tiny" style={{ color: '#bcd6e4', fontWeight: 700 }}>{eng.id}</span><button className="top-btn" onClick={onClose}><I.x size={17} /></button></div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{(client.name || eng.id).replace('PT ', '')}</div>
        <div className="tiny" style={{ color: '#bcd6e4' }}>{eng.type} · {eng.phase}</div>
      </div>
      <div style={{ padding: 14 }}>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 13 }}>
          <KvBox label="Progres" v={eng.progress + '%'} accent="var(--blue)" />
          <KvBox label="Deadline" v={DLV_fmtDate(eng.deadline)} accent={DLV_daysTo(eng.deadline, today) <= 14 ? 'var(--red)' : null} />
          <KvBox label="Burn Jam" v={burn + '%'} accent={overburn ? 'var(--red)' : 'var(--green)'} />
          <KvBox label="Jam" v={fmt(eng.actualHrs) + '/' + fmt(eng.budgetHrs)} />
        </div>
        {overburn && <div className="panel" style={{ padding: '8px 10px', background: 'var(--red-bg)', borderColor: 'transparent', marginBottom: 13 }}><div className="row ac gap8"><span style={{ color: 'var(--red)' }}><I.alert size={14} /></span><span className="tiny" style={{ fontWeight: 600 }}>Konsumsi jam ({burn}%) melampaui progres ({eng.progress}%) — tinjau ulang efisiensi & estimasi sisa.</span></div></div>}

        <div className="tiny muted upper" style={{ marginBottom: 7 }}>Fase</div>
        <div style={{ display: 'grid', gap: 6, marginBottom: 14 }}>
          {row.phases.map((ph, i) => (
            <div key={i} className="row ac jb">
              <span className="row ac gap7"><span style={{ width: 8, height: 8, borderRadius: 2, background: DLV_PHASE_COLOR[ph.name] }} /><span className="tiny" style={{ fontWeight: 600 }}>{ph.name}</span></span>
              <span className="tiny muted mono">{DLV_fmtDate(ph.start)} – {DLV_fmtDate(ph.end)}</span>
            </div>
          ))}
        </div>

        <div className="tiny muted upper" style={{ marginBottom: 7 }}>Milestone</div>
        <div style={{ display: 'grid', gap: 0, marginBottom: 14 }}>
          {row.milestones.map((m, i) => {
            const dl = DLV_daysTo(m.date, today);
            return (
              <div key={i} className="row ac jb" style={{ padding: '6px 0', borderBottom: i < row.milestones.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                <span className="row ac gap8">
                  <span style={{ color: DLV_MS_COLOR[m.status] }}>{m.status === 'done' ? <I.checkCircle size={15} /> : m.status === 'due' ? <I.clock size={15} /> : <I.circle size={15} />}</span>
                  <span className="tiny" style={{ fontWeight: 600, textDecoration: m.status === 'done' ? 'none' : 'none' }}>{m.label}</span>
                </span>
                <span className="mono tiny" style={{ color: m.status === 'done' ? 'var(--ink-4)' : dl < 0 ? 'var(--red)' : 'var(--ink-3)' }}>{DLV_fmtDate(m.date)}</span>
              </div>
            );
          })}
        </div>
        <div className="row gap8">
          <Btn sm variant="primary" style={{ flex: 1 }} onClick={() => onNav('cockpit')}><I.dashboard size={13} /> Buka Cockpit</Btn>
          <Btn sm onClick={() => onNav('scheduler')}><I.users size={13} /> Alokasi</Btn>
        </div>
      </div>
    </Panel>
  );
}

Object.assign(window, { DeliveryMilestones });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { DeliveryMilestones };
