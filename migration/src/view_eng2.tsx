/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useFirm } from './contexts.jsx';
import { I } from './icons.jsx';
import { Avatar, Badge, Panel, Progress, Seg, Stat } from './ui.jsx';
import { EngagementDetail } from './view_firm.jsx';
import { HBars } from './view_fpm_parts.jsx';

/* ============================================================
   NeoSuite AMS — Engagement Management · extra tabs
   Portofolio · Anggaran & Burn · Staffing · Jadwal.
   (Papan / Kanban stays in view_firm.jsx.)
   ============================================================ */
const { useState: useEng2 } = React;

const ENG_PHASE_COLOR = { Perencanaan: '#5b3fa6', Eksekusi: '#005085', Finalisasi: '#9a6a00', Arsip: '#1f7a4d' };
const engDetail = (e) => (AMS as any).ENG_DETAIL[e.id] || (AMS as any).ENG_DETAIL._default(e);

/* ---------------- Portofolio (filterable table) ---------------- */
function EngPortofolio() {
  const { fmt } = AMS;
  const { engagements, clients, clientById, setActiveEngagementId } = useFirm();
  const [phase, setPhase] = useEng2('All');
  const [risk, setRisk] = useEng2('All');
  const [detailId, setDetailId] = useEng2(null);

  const rows = engagements.filter(e => (phase === 'All' || e.phase === phase) && (risk === 'All' || e.risk === risk));
  const detail = detailId ? engagements.find(e => e.id === detailId) : null;

  return (
    <div className="view-scroll"><div className="view-pad">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 12 }}>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={engagements.length} label="Total Engagement" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={engagements.filter(e => e.risk === 'High').length} label="Risiko Tinggi" accent="var(--red)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={engagements.filter(e => e.actualHrs / e.budgetHrs > 0.95).length} label="Burn > 95%" accent="var(--amber)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={Math.round(engagements.reduce((s, e) => s + e.progress, 0) / engagements.length) + '%'} label="Rata-rata Progress" /></div></Panel>
      </div>

      <Panel noBody>
        <div className="panel-h">
          <h3>Portofolio Perikatan</h3><div style={{ flex: 1 }} />
          <span className="tiny muted">Fase</span><Seg options={['All', 'Perencanaan', 'Eksekusi', 'Finalisasi', 'Arsip']} value={phase} onChange={setPhase} />
          <span className="tiny muted" style={{ marginLeft: 6 }}>Risiko</span><Seg options={['All', 'High', 'Medium', 'Low']} value={risk} onChange={setRisk} />
        </div>
        <table className="dtbl">
          <thead><tr>
            <th>Engagement</th><th>Klien</th><th>Jenis</th><th>Fase</th><th style={{ width: 110 }}>Progress</th>
            <th>Partner</th><th className="num">Budget Burn</th><th>Risiko</th><th className="num">Deadline</th>
          </tr></thead>
          <tbody>
            {rows.map(e => {
              const c = clientById(e.clientId);
              const burn = e.actualHrs / e.budgetHrs;
              return (
                <tr key={e.id} style={{ cursor: 'pointer' }} onClick={() => { setActiveEngagementId(e.id); setDetailId(e.id); }}>
                  <td className="mono tiny" style={{ fontWeight: 700 }}>{e.id}</td>
                  <td className="truncate" style={{ maxWidth: 150 }}>{c?.name.replace('PT ', '')}</td>
                  <td className="tiny muted truncate" style={{ maxWidth: 130 }}>{e.type}</td>
                  <td><span className="row ac gap6"><span style={{ width: 8, height: 8, borderRadius: 2, background: ENG_PHASE_COLOR[e.phase] }} /><span className="tiny">{e.phase}</span></span></td>
                  <td><div className="row ac gap6"><Progress value={e.progress} /><span className="mono tiny" style={{ width: 26 }}>{e.progress}%</span></div></td>
                  <td className="tiny muted truncate" style={{ maxWidth: 110 }}>{e.partner.split(',')[0]}</td>
                  <td className="num" style={{ color: burn > 0.95 ? 'var(--red)' : burn > 0.85 ? 'var(--amber)' : 'inherit', fontWeight: 600 }}>{Math.round(burn * 100)}%</td>
                  <td><Badge kind={e.risk === 'High' ? 'red' : e.risk === 'Medium' ? 'amber' : 'green'}>{e.risk}</Badge></td>
                  <td className="num tiny">{new Date(e.deadline).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
      {detail && <EngagementDetail e={detail} client={clients.find(c => c.id === detail.clientId)} onClose={() => setDetailId(null)} />}
    </div></div>
  );
}

/* ---------------- Anggaran & Burn ---------------- */
function EngAnggaran() {
  const { fmt } = AMS;
  const { engagements, clientById } = useFirm();
  const [selId, setSelId] = useEng2(engagements[0].id);
  const sel = engagements.find(e => e.id === selId) || engagements[0];
  const det = engDetail(sel);

  const totalBudget = engagements.reduce((s, e) => s + e.budgetHrs, 0);
  const totalActual = engagements.reduce((s, e) => s + e.actualHrs, 0);
  const overBudget = engagements.filter(e => e.actualHrs > e.budgetHrs).length;
  const blendedRate = 720_000;

  return (
    <div className="view-scroll"><div className="view-pad">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 12 }}>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={fmt(totalBudget) + 'h'} label="Total Anggaran Jam" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={fmt(totalActual) + 'h'} label="Total Jam Aktual" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={Math.round(totalActual / totalBudget * 100) + '%'} label="Burn Portofolio" accent={totalActual / totalBudget > 0.9 ? 'var(--amber)' : undefined} /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={overBudget} label="Melebihi Anggaran" accent={overBudget ? 'var(--red)' : 'var(--green)'} /></div></Panel>
      </div>

      <Panel noBody className="mb12">
        <div className="panel-h"><h3>Anggaran vs Aktual per Engagement</h3></div>
        <div style={{ padding: 14, display: 'grid', gap: 11 }}>
          {engagements.map(e => {
            const c = clientById(e.clientId);
            const burn = e.actualHrs / e.budgetHrs;
            return (
              <div key={e.id} onClick={() => setSelId(e.id)} style={{ cursor: 'pointer', opacity: e.id === selId ? 1 : 0.92 }}>
                <div className="row jb ac" style={{ marginBottom: 3 }}>
                  <span className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: e.id === selId ? 'var(--blue)' : 'var(--ink-3)' }}>{e.id}</span><span style={{ fontSize: 12, fontWeight: 600 }}>{c?.name.replace('PT ', '')}</span></span>
                  <span className="mono tiny" style={{ fontWeight: 700, color: burn > 1 ? 'var(--red)' : burn > 0.9 ? 'var(--amber)' : 'var(--green)' }}>{fmt(e.actualHrs)} / {fmt(e.budgetHrs)}h · {Math.round(burn * 100)}%</span>
                </div>
                <div style={{ height: 9, borderRadius: 5, background: 'var(--surface-3)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: Math.min(100, burn * 100) + '%', background: burn > 1 ? 'var(--red)' : burn > 0.9 ? 'var(--amber)' : 'var(--blue)' }} />
                  {burn > 1 && <div style={{ position: 'absolute', left: '100%', top: 0, bottom: 0, width: 3, background: 'var(--red)', transform: 'translateX(-3px)' }} />}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
        <Panel title={'Rincian Anggaran per Fase · ' + sel.id} sub={clientById(sel.clientId)?.name.replace('PT ', '')}>
          <div style={{ padding: 14, display: 'grid', gap: 11 }}>
            {det.budgetByPhase.map(p => {
              const b = p.actual / p.budget;
              return (
                <div key={p.phase}>
                  <div className="row jb tiny" style={{ marginBottom: 3 }}><span className="row ac gap6"><span style={{ width: 9, height: 9, borderRadius: 2, background: p.color }} /><span style={{ fontWeight: 600 }}>{p.phase}</span></span><span className="mono" style={{ fontWeight: 700 }}>{fmt(p.actual)} / {fmt(p.budget)}h</span></div>
                  <Progress value={Math.min(100, b * 100)} color={p.color} />
                </div>
              );
            })}
            <div className="divider" />
            <div className="row jb"><span className="tiny muted">Estimasi biaya waktu (blended Rp {fmt(blendedRate / 1e3, 0)}rb/jam)</span><span className="mono" style={{ fontWeight: 700 }}>Rp {fmt(sel.actualHrs * blendedRate / 1e6, 0)} jt</span></div>
          </div>
        </Panel>

        <Panel title={'Tagihan Bertahap · ' + sel.id} sub="milestone billing">
          <div style={{ padding: 14, display: 'grid', gap: 9 }}>
            {det.billing.map((b, i) => (
              <div key={i} className="row ac gap10" style={{ padding: '8px 10px', borderRadius: 7, background: 'var(--surface-2)' }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: b.status === 'Tertagih' ? 'var(--green)' : b.status === 'WIP' ? 'var(--amber)' : 'var(--surface-3)', color: b.status === 'Belum' ? 'var(--ink-3)' : '#fff', display: 'grid', placeItems: 'center', flex: '0 0 30px', fontWeight: 700, fontSize: 11 }} className="mono">{b.pct}%</span>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600 }}>{b.milestone}</div><div className="tiny muted">{b.date}</div></div>
                <div style={{ textAlign: 'right' }}><div className="mono tiny" style={{ fontWeight: 700 }}>{b.amount ? 'Rp ' + fmt(b.amount / 1e6, 0) + ' jt' : '—'}</div><Badge kind={b.status === 'Tertagih' ? 'green' : b.status === 'WIP' ? 'amber' : 'gray'}>{b.status}</Badge></div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div></div>
  );
}

/* ---------------- Staffing ---------------- */
function EngStaffing() {
  const { fmt } = AMS;
  const { engagements, clientById } = useFirm();
  const [selId, setSelId] = useEng2(engagements[0].id);
  const sel = engagements.find(e => e.id === selId) || engagements[0];
  const det = engDetail(sel);

  /* aggregate person allocation across all engagements */
  const people = {};
  engagements.forEach(e => {
    engDetail(e).staffing.forEach(s => {
      const key = s.name;
      if (!people[key]) people[key] = { name: s.name, role: s.role, hrs: 0, engs: 0 };
      people[key].hrs += s.hrs; people[key].engs++;
    });
  });
  const roster = (Object.values(people) as any[]).sort((a, b) => b.hrs - a.hrs);
  const maxHrs = Math.max(...roster.map(p => p.hrs), 1);
  const roleColor = { Partner: '#013a52', Manager: '#005085', Senior: '#0a6b73', Staff: '#5b8aa6' };

  return (
    <div className="view-scroll"><div className="view-pad">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 12 }}>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={roster.length} label="Anggota Tertugas" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={fmt(roster.reduce((s, p) => s + p.hrs, 0))} label="Total Jam Dialokasikan" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={roster.filter(p => p.role === 'Partner' || p.role === 'Manager').length} label="Partner & Manajer" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={Math.round(roster.reduce((s, p) => s + p.engs, 0) / roster.length * 10) / 10} label="Rata-rata Engagement/Org" /></div></Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.1fr 1fr', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Beban Tim Lintas Engagement</h3></div>
          <div style={{ padding: 14 }}>
            <HBars rows={roster.map(p => ({ label: p.name, value: p.hrs, right: fmt(p.hrs) + 'h', color: roleColor[p.role] || '#5b8aa6', sub: p.role + ' · ' + p.engs + ' engagement' }))} max={maxHrs} />
          </div>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Komposisi Tim</h3><div style={{ flex: 1 }} />
            <select className="select" value={selId} onChange={e => setSelId(e.target.value)} style={{ height: 26, maxWidth: 200 }}>
              {engagements.map(e => <option key={e.id} value={e.id}>{e.id} · {clientById(e.clientId)?.name.replace('PT ', '')}</option>)}
            </select>
          </div>
          <table className="dtbl">
            <thead><tr><th>Anggota</th><th>Peran</th><th className="num">Alokasi</th><th className="num">Jam</th><th className="num">Rate/jam</th></tr></thead>
            <tbody>
              {det.staffing.map((s, i) => (
                <tr key={i}>
                  <td><span className="row ac gap8"><Avatar name={s.name} size={24} />{s.name.split(',')[0]}</span></td>
                  <td><Badge kind={s.role === 'Partner' ? 'blue' : 'gray'}>{s.role}</Badge></td>
                  <td className="num">{s.alloc}%</td>
                  <td className="num" style={{ fontWeight: 600 }}>{fmt(s.hrs)}</td>
                  <td className="num muted">{fmt(s.rate / 1e3, 0)}rb</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan="3">Total tim {sel.id}</td><td className="num">{fmt(det.staffing.reduce((s, x) => s + x.hrs, 0))}h</td><td></td></tr></tfoot>
          </table>
        </Panel>
      </div>
    </div></div>
  );
}

/* ---------------- Jadwal (timeline / gantt) ---------------- */
function EngJadwal() {
  const { fmt } = AMS;
  const { engagements, clientById } = useFirm();
  const [selId, setSelId] = useEng2(engagements[0].id);
  const sel = engagements.find(e => e.id === selId) || engagements[0];

  const today = new Date('2026-03-05');
  const t0 = new Date('2026-01-01').getTime();
  const t1 = new Date('2026-08-31').getTime();
  const span = t1 - t0;
  const pos = (d) => Math.max(0, Math.min(100, (new Date(d).getTime() - t0) / span * 100));
  const todayPos = pos(today);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu'];

  const sorted = engagements.slice().sort((a, b) => +new Date(a.deadline) - +new Date(b.deadline));
  const phases = ['Perencanaan', 'Eksekusi', 'Finalisasi', 'Arsip'];
  const phIdx = phases.indexOf(sel.phase);
  const milestones = [
    { t: 'Penerimaan & perencanaan', ph: 0 }, { t: 'Penilaian risiko & materialitas', ph: 0 },
    { t: 'Pengujian pengendalian', ph: 1 }, { t: 'Prosedur substantif', ph: 1 },
    { t: 'Penyelesaian & SAD', ph: 2 }, { t: 'EQR & penerbitan opini', ph: 2 }, { t: 'Arsip kertas kerja', ph: 3 },
  ];

  return (
    <div className="view-scroll"><div className="view-pad">
      <Panel noBody className="mb12">
        <div className="panel-h"><h3>Linimasa Perikatan FY2025</h3><div style={{ flex: 1 }} /><span className="tiny muted">garis merah = hari ini · bar = rentang ke tenggat</span></div>
        <div style={{ padding: '14px 16px' }}>
          {/* month axis */}
          <div style={{ position: 'relative', marginLeft: 170, height: 16, borderBottom: '1px solid var(--line)', marginBottom: 8 }}>
            {months.map((m, i) => <span key={m} style={{ position: 'absolute', left: (i / months.length * 100) + '%', fontSize: 9.5, color: 'var(--ink-4)', fontWeight: 700 }}>{m}</span>)}
            <span style={{ position: 'absolute', left: todayPos + '%', top: -2, bottom: -200, width: 2, background: 'var(--red)', opacity: .5, zIndex: 1 }} />
          </div>
          <div style={{ display: 'grid', gap: 7, position: 'relative' }}>
            {sorted.map(e => {
              const c = clientById(e.clientId);
              const dl = pos(e.deadline);
              const start = Math.max(0, dl - (e.budgetHrs / 2200 * 60)); // notional duration from budget
              const days = Math.round((+new Date(e.deadline) - +today) / 86400000);
              return (
                <div key={e.id} className="row ac" onClick={() => setSelId(e.id)} style={{ cursor: 'pointer', background: e.id === selId ? 'var(--blue-050)' : 'transparent', borderRadius: 6, padding: '2px 0' }}>
                  <div style={{ width: 170, flex: '0 0 170px', minWidth: 0, paddingLeft: 4 }}>
                    <div className="truncate" style={{ fontSize: 11.5, fontWeight: 600 }}>{c?.name.replace('PT ', '')}</div>
                    <div className="tiny muted mono">{e.id}</div>
                  </div>
                  <div style={{ flex: 1, position: 'relative', height: 24 }}>
                    <div style={{ position: 'absolute', left: start + '%', width: Math.max(4, dl - start) + '%', top: 4, height: 16, borderRadius: 4, background: ENG_PHASE_COLOR[e.phase], opacity: .25 }} />
                    <div style={{ position: 'absolute', left: start + '%', width: Math.max(4, (dl - start) * e.progress / 100) + '%', top: 4, height: 16, borderRadius: 4, background: ENG_PHASE_COLOR[e.phase], display: 'flex', alignItems: 'center', paddingLeft: 6 }}>
                      <span className="mono" style={{ fontSize: 9.5, fontWeight: 700, color: '#fff' }}>{e.progress}%</span>
                    </div>
                    <span style={{ position: 'absolute', left: 'calc(' + dl + '% + 4px)', top: 5, fontSize: 9.5, fontWeight: 700, color: days < 14 ? 'var(--red)' : 'var(--ink-3)', whiteSpace: 'nowrap' }} className="mono">{new Date(e.deadline).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} · {days}h</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Panel>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
        <Panel title={'Milestone · ' + sel.id} sub={clientById(sel.clientId)?.name.replace('PT ', '')}>
          <div style={{ padding: 14 }}>
            {milestones.map((m, i) => {
              const done = m.ph < phIdx || (m.ph === phIdx && sel.progress >= 50);
              const active = m.ph === phIdx;
              return (
                <div key={i} className="row gap8" style={{ padding: '7px 0', borderBottom: i < milestones.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                  <span style={{ flex: '0 0 18px', width: 18, height: 18, borderRadius: '50%', background: done ? 'var(--green)' : active ? 'var(--blue)' : 'var(--surface-3)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 10 }}>{done ? <I.check size={11} /> : active ? '•' : ''}</span>
                  <span style={{ fontSize: 12, color: done ? 'var(--ink-3)' : 'var(--ink)', fontWeight: active ? 600 : 400, flex: 1 }}>{m.t}</span>
                  <span className="tiny muted">{phases[m.ph]}</span>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Beban Tenggat (30 hari)" sub="perikatan jatuh tempo terdekat">
          <div style={{ padding: 14, display: 'grid', gap: 8 }}>
            {sorted.filter(e => { const d = Math.round((+new Date(e.deadline) - +today) / 86400000); return d >= 0 && d <= 90; }).slice(0, 6).map(e => {
              const c = clientById(e.clientId);
              const days = Math.round((+new Date(e.deadline) - +today) / 86400000);
              return (
                <div key={e.id} className="row ac gap10" style={{ padding: '8px 10px', borderRadius: 7, background: 'var(--surface-2)' }}>
                  <div style={{ width: 40, textAlign: 'center', flex: '0 0 40px' }}><div className="mono" style={{ fontSize: 16, fontWeight: 700, color: days < 14 ? 'var(--red)' : days < 30 ? 'var(--amber)' : 'var(--navy)' }}>{days}</div><div className="tiny muted">hari</div></div>
                  <div className="vdivider" style={{ height: 26 }} />
                  <div style={{ flex: 1, minWidth: 0 }}><div className="truncate" style={{ fontSize: 12, fontWeight: 600 }}>{c?.name.replace('PT ', '')}</div><div className="tiny muted">{e.type} · {e.phase}</div></div>
                  <div style={{ width: 70 }}><Progress value={e.progress} color={ENG_PHASE_COLOR[e.phase]} /></div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div></div>
  );
}

Object.assign(window, { EngPortofolio, EngAnggaran, EngStaffing, EngJadwal });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { EngAnggaran, EngJadwal, EngPortofolio, EngStaffing };
