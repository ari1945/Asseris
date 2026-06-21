/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAudit, useFirm } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Avatar, Badge, Btn, Donut, Portlet, Progress, Spark, Stat } from './ui.jsx';
import { DashFinansial, DashMutu, DashOperasional } from './view_dashboard2';
import { MSub } from './view_fpm_parts';

/* ============================================================
   Asseris — Firm Dashboard (draggable portlets)
   ============================================================ */
const { useState: useStateD, useRef: useRefD, useEffect: useEffectD } = React;

function useDraggablePortlets(defaultOrder, storeKey) {
  const [order, setOrder] = useStateD(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storeKey) || 'null');
      if (Array.isArray(saved) && saved.length === defaultOrder.length) return saved;
    } catch (e) {}
    return defaultOrder;
  });
  useEffectD(() => { try { localStorage.setItem(storeKey, JSON.stringify(order)); } catch (e) {} }, [order]);

  const dragId = useRefD(null);
  const [overId, setOverId] = useStateD(null);

  const handlers = (id) => ({
    draggable: true,
    onDragStart: (e) => { dragId.current = id; e.dataTransfer.effectAllowed = 'move'; },
    onDragOver: (e) => { e.preventDefault(); if (overId !== id) setOverId(id); },
    onDragEnd: () => { dragId.current = null; setOverId(null); },
    onDrop: (e) => {
      e.preventDefault();
      const from = dragId.current, to = id;
      if (from && to && from !== to) {
        setOrder(o => {
          const arr = [...o];
          const fi = arr.indexOf(from), ti = arr.indexOf(to);
          arr.splice(fi, 1); arr.splice(ti, 0, from);
          return arr;
        });
      }
      setOverId(null); dragId.current = null;
    },
  });
  return { order, handlers, overId, reset: () => setOrder(defaultOrder) };
}

function FirmDashboard() {
  const { fmt, rp } = AMS;
  const { engagements, clients, setActiveEngagementId } = useFirm();
  const { team, activity, deadlines, risks } = useAudit();

  const activeEng = engagements.filter(e => e.status !== 'Completed');
  const totalWIP = engagements.reduce((s, e) => s + (e.budgetHrs - e.actualHrs > 0 ? 0 : 0) + e.actualHrs * 850000, 0);
  const totalFee = clients.reduce((s, c) => s + c.fee, 0);

  /* ---- portlet definitions ---- */
  const portlets = {
    kpi: () => (
      <Portlet title="Firm KPI · FY2025" dot="#005085" dragProps={dragP('kpi')}
        actions={<Btn sm variant="ghost" icon><I.download size={14} /></Btn>}>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 0 }}>
          {[
            { v: activeEng.length, l: 'Engagement Aktif', d: '+2', dir: 'up' },
            { v: '87%', l: 'Realization Rate', d: '+3.1pp', dir: 'up' },
            { v: 'Rp 9,3 M', l: 'Total Fee Pipeline', d: '+11%', dir: 'up' },
            { v: '84%', l: 'Avg. Utilisasi Tim', d: '-2pp', dir: 'down' },
          ].map((k, i) => (
            <div key={i} style={{ padding: '6px 14px', borderLeft: i ? '1px solid var(--line-soft)' : 0 }}>
              <Stat value={k.v} label={k.l} delta={k.d} deltaDir={k.dir} />
            </div>
          ))}
        </div>
      </Portlet>
    ),

    engagements: () => (
      <Portlet title="Engagement Tracker" dot="#1f7a4d" dragProps={dragP('engagements')}
        actions={<Btn sm variant="ghost"><I.filter size={13} /> Filter</Btn>}>
        <table className="dtbl">
          <thead><tr>
            <th>Engagement</th><th>Klien</th><th>Fase</th><th>Progress</th><th>Partner</th><th className="r">Deadline</th>
          </tr></thead>
          <tbody>
            {engagements.slice(0, 6).map(e => {
              const c = clients.find(x => x.id === e.clientId);
              return (
                <tr key={e.id} onClick={() => setActiveEngagementId(e.id)} style={{ cursor: 'pointer' }}>
                  <td className="mono" style={{ fontSize: 11.5 }}>{e.id}</td>
                  <td className="truncate" style={{ maxWidth: 150 }}>{c?.name.replace('PT ', '')}</td>
                  <td><Badge>{e.status}</Badge></td>
                  <td style={{ width: 120 }}>
                    <div className="row ac gap8">
                      <Progress value={e.progress} color={e.progress >= 85 ? 'var(--green)' : e.progress < 30 ? 'var(--amber)' : undefined} />
                      <span className="mono tiny" style={{ width: 28 }}>{e.progress}%</span>
                    </div>
                  </td>
                  <td className="truncate tiny muted" style={{ maxWidth: 110 }}>{e.partner.split(',')[0]}</td>
                  <td className="num tiny">{new Date(e.deadline).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Portlet>
    ),

    riskheat: () => {
      const heat = [[1,2,4,7,9],[1,3,5,8,10],[2,4,6,9,12],[3,6,9,12,15],[5,9,12,16,20]];
      const colorFor = v => v >= 12 ? '#b3261e' : v >= 7 ? '#d98324' : v >= 4 ? '#caa53d' : '#1f7a4d';
      const counts = { high: risks.filter(r => r.likelihood * r.impact >= 12).length, med: risks.filter(r => { const s = r.likelihood * r.impact; return s >= 6 && s < 12; }).length };
      return (
        <Portlet title="Risk Heatmap · Firm-wide" dot="#b3261e" dragProps={dragP('riskheat')}>
          <div className="row gap12" style={{ alignItems: 'center' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,26px)', gridAutoRows: '26px', gap: 3 }}>
              {heat.slice().reverse().map((row, ri) => row.map((v, ci) => (
                <div key={ri + '-' + ci} title={'Skor ' + v} style={{ background: colorFor(v), borderRadius: 3, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 9.5, fontFamily: 'var(--mono)', fontWeight: 700, opacity: .35 + (v / 20) * 0.65 }}>{v}</div>
              )))}
            </div>
            <div style={{ flex: 1 }}>
              <div className="tiny muted upper" style={{ marginBottom: 6 }}>Dampak → · Kemungkinan ↑</div>
              <div className="row ac gap8" style={{ marginBottom: 5 }}><Badge kind="red">{counts.high} High</Badge><span className="tiny muted">butuh respons signifikan</span></div>
              <div className="row ac gap8"><Badge kind="amber">{counts.med} Medium</Badge><span className="tiny muted">pemantauan berkala</span></div>
            </div>
          </div>
        </Portlet>
      );
    },

    deadlines: () => (
      <Portlet title="Deadline Mendatang" dot="#9a6a00" dragProps={dragP('deadlines')}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {deadlines.map((d, i) => (
            <div key={i} className="row ac gap8" style={{ padding: '7px 0', borderBottom: i < deadlines.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
              <div style={{ width: 38, textAlign: 'center' }}>
                <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: d.sev === 'red' ? 'var(--red)' : d.sev === 'amber' ? 'var(--amber)' : 'var(--navy)' }}>{d.days}</div>
                <div className="tiny muted">hari</div>
              </div>
              <div className="vdivider" style={{ height: 26 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="truncate" style={{ fontWeight: 600, fontSize: 12 }}>{d.task}</div>
                <div className="tiny muted truncate">{d.client} · {d.date}</div>
              </div>
              <Badge kind={d.sev === 'red' ? 'red' : d.sev === 'amber' ? 'amber' : 'gray'}>{d.sev === 'red' ? 'Kritis' : d.sev === 'amber' ? 'Dekat' : 'Aman'}</Badge>
            </div>
          ))}
        </div>
      </Portlet>
    ),

    phases: () => {
      const byPhase = { Perencanaan: 0, Eksekusi: 0, Finalisasi: 0, Arsip: 0 };
      engagements.forEach(e => { byPhase[e.phase] = (byPhase[e.phase] || 0) + 1; });
      const segs = [
        { label: 'Perencanaan', value: byPhase.Perencanaan, color: '#5b3fa6' },
        { label: 'Eksekusi', value: byPhase.Eksekusi, color: '#005085' },
        { label: 'Finalisasi', value: byPhase.Finalisasi, color: '#9a6a00' },
        { label: 'Arsip', value: byPhase.Arsip, color: '#1f7a4d' },
      ];
      return (
        <Portlet title="Portofolio per Fase" dot="#5b3fa6" dragProps={dragP('phases')}>
          <div className="row gap12 ac">
            <Donut segments={segs} size={96} thickness={14}
              center={<><div className="mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--navy)' }}>{engagements.length}</div><div className="tiny muted">engagement</div></>} />
            <div style={{ flex: 1 }}>
              {segs.map(s => (
                <div key={s.label} className="row ac jb" style={{ padding: '3px 0' }}>
                  <span className="row ac gap6"><span style={{ width: 9, height: 9, borderRadius: 2, background: s.color }} /><span style={{ fontSize: 12 }}>{s.label}</span></span>
                  <span className="mono" style={{ fontWeight: 700 }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Portlet>
      );
    },

    billing: () => (
      <Portlet title="Billing & Realisasi (12 bln)" dot="#0a6b73" dragProps={dragP('billing')}>
        <div className="row jb" style={{ alignItems: 'flex-end', marginBottom: 8 }}>
          <Stat value="Rp 9,3 M" label="WIP Belum Ditagih" />
          <Stat value="87%" label="Collection Rate" accent="var(--green)" />
        </div>
        <Spark data={[42,48,45,52,58,55,63,61,68,72,70,78]} width={300} height={48} color="#0a6b73" />
        <div className="row jb tiny muted" style={{ marginTop: 4 }}><span>Mar'25</span><span>Feb'26</span></div>
      </Portlet>
    ),

    team: () => (
      <Portlet title="Utilisasi Tim" dot="#024661" dragProps={dragP('team')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {team.map(t => (
            <div key={t.name} className="row ac gap8">
              <Avatar name={t.name} size={26} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row jb"><span className="truncate" style={{ fontSize: 12, fontWeight: 600 }}>{t.name}</span><span className="mono tiny" style={{ fontWeight: 700, color: t.util > 92 ? 'var(--red)' : t.util > 85 ? 'var(--amber)' : 'var(--green)' }}>{t.util}%</span></div>
                <Progress value={t.util} color={t.util > 92 ? 'var(--red)' : t.util > 85 ? 'var(--amber)' : 'var(--green)'} />
              </div>
            </div>
          ))}
        </div>
      </Portlet>
    ),

    activity: () => (
      <Portlet title="Aktivitas Terkini" dot="#2f7bb0" dragProps={dragP('activity')}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {activity.map((a, i) => {
            const IconC = I[a.icon] || I.pulse;
            return (
              <div key={i} className="row gap8" style={{ padding: '8px 0', borderBottom: i < activity.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                <span style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--blue-100)', color: 'var(--blue)', display: 'grid', placeItems: 'center', flex: '0 0 26px' }}><IconC size={14} /></span>
                <div style={{ flex: 1, lineHeight: 1.4 }}>
                  <span style={{ fontSize: 12 }}><b>{a.who}</b> {a.what}</span>
                  <div className="tiny muted">{a.when}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Portlet>
    ),
  };

  const defaultOrder = ['kpi', 'engagements', 'phases', 'riskheat', 'deadlines', 'billing', 'team', 'activity'];
  const { order, handlers, overId, reset } = useDraggablePortlets(defaultOrder, 'ams.dash.order');
  function dragP(id) {
    const h = handlers(id);
    return { className: (overId === id ? 'drop-target ' : ''), gripProps: { draggable: true, onDragStart: h.onDragStart, onDragEnd: h.onDragEnd }, onDragOver: h.onDragOver, onDrop: h.onDrop };
  }

  // span: kpi & engagements wide
  const span = { kpi: 'span 12', engagements: 'span 8', phases: 'span 4', riskheat: 'span 4', deadlines: 'span 4', billing: 'span 4', team: 'span 4', activity: 'span 8' };

  const [tab, setTab] = useStateD(() => localStorage.getItem('ams.dash.tab') || 'ringkasan');
  useEffectD(() => { try { localStorage.setItem('ams.dash.tab', tab); } catch (e) {} }, [tab]);
  const dashTabs = [
    { id: 'ringkasan', label: 'Ringkasan', icon: 'dashboard' },
    { id: 'operasional', label: 'Operasional', icon: 'briefcase' },
    { id: 'finansial', label: 'Finansial', icon: 'coins' },
    { id: 'mutu', label: 'Mutu & Risiko', icon: 'shield' },
  ];

  return (
    <>
      <SubBar moduleId="dashboard" right={tab === 'ringkasan' ?
        <div className="row gap8 ac">
          <span className="tiny muted">Tarik <I.grip size={12} style={{ verticalAlign: 'middle' }} /> untuk menata ulang portlet</span>
          <Btn sm onClick={reset}><I.sync size={13} /> Reset Layout</Btn>
          <Btn sm variant="primary"><I.plus size={14} /> Tambah Portlet</Btn>
        </div> :
        <Badge kind="blue">FY2025 · Firma-wide</Badge>
      } />
      <MSub tabs={dashTabs} active={tab} onChange={setTab} />
      {tab === 'ringkasan' && (
        <div className="view-scroll">
          <div className="view-pad">
            <div className="grid" style={{ gridTemplateColumns: 'repeat(12,1fr)', gap: 12 }}>
              {order.map(id => (
                <div key={id} style={{ gridColumn: span[id] || 'span 4' }}>
                  {portlets[id]()}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {tab === 'operasional' && <DashOperasional />}
      {tab === 'finansial' && <DashFinansial />}
      {tab === 'mutu' && <DashMutu />}
    </>
  );
}

Object.assign(window, { FirmDashboard });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { FirmDashboard };
