/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAudit, useFirm } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Avatar, Badge, Btn, Donut, LockBanner, Panel, Stat, Tabs } from './ui.jsx';

/* ============================================================
   Asseris — Time & Budget (expanded module)
   Tabs: Ringkasan · Anggaran per Fase · Timesheet · Tim & Utilisasi · Ekonomi
   ============================================================ */
const { useState: useTB, useMemo: useTBMemo } = React;

/* charge-out (standard) rates & fully-loaded cost rates, IDR / hour */
const TB_BILL = { 'Engagement Partner': 2500000, 'Audit Manager': 1200000, 'Senior Auditor': 700000, 'Junior Auditor': 400000 };
const TB_COST = { 'Engagement Partner': 1100000, 'Audit Manager': 620000, 'Senior Auditor': 360000, 'Junior Auditor': 210000 };
const TB_FEE = 1_520_000_000;            // fee disepakati untuk ENG-2025-014
const TB_ROLE_COLOR = { 'Engagement Partner': '#5b3fa6', 'Audit Manager': '#005085', 'Senior Auditor': '#0a6b73', 'Junior Auditor': '#9a6a00' };

/* opening logged hours per member (BEFORE the live timesheet below) */
const TB_ROSTER = [
  { name: 'Hartono Wijaya, CPA', role: 'Engagement Partner', budget: 120, base: 78 },
  { name: 'Anindya Pramesti',    role: 'Audit Manager',      budget: 360, base: 256.5 },
  { name: 'Dimas Raharjo',       role: 'Senior Auditor',     budget: 420, base: 304 },
  { name: 'Sinta Wulandari',     role: 'Senior Auditor',     budget: 300, base: 150.5 },
  { name: 'Fajar Nugroho',       role: 'Junior Auditor',     budget: 360, base: 189 },
  { name: 'Rina Kusuma',         role: 'Junior Auditor',     budget: 280, base: 120 },
];
/* phases — opening logged hours BEFORE live timesheet */
const TB_PHASES = [
  { id: 'Perencanaan', label: 'Perencanaan',          budget: 320,  base: 318, pct: 100, period: '02–20 Feb' },
  { id: 'Eksekusi',    label: 'Eksekusi (Fieldwork)', budget: 1080, base: 658, pct: 65,  period: '24 Feb–20 Mar' },
  { id: 'Finalisasi',  label: 'Finalisasi & Review',  budget: 320,  base: 98,  pct: 30,  period: '21–28 Mar' },
  { id: 'Pelaporan',   label: 'Pelaporan & Arsip',    budget: 120,  base: 24,  pct: 20,  period: '29–31 Mar' },
];
const TB_WEEKLY = [ // 8 minggu terakhir, jam tercatat / minggu
  { wk: 'W1', h: 96 }, { wk: 'W2', h: 132 }, { wk: 'W3', h: 158 }, { wk: 'W4', h: 174 },
  { wk: 'W5', h: 168 }, { wk: 'W6', h: 152 }, { wk: 'W7', h: 138 }, { wk: 'W8', h: 80 },
];

const tbJt = (n) => 'Rp ' + AMS.fmt(Math.round(n / 1e6)) + ' jt';
const tbM  = (n) => 'Rp ' + AMS.fmt(n / 1e9, 2) + ' M';

/* ----- shared derived model (reactive to live timesheet) ----- */
function useTBModel(timeEntries, e) {
  return useTBMemo(() => {
    const liveByMember = {}, liveByPhase = {};
    timeEntries.forEach(t => {
      liveByMember[t.member] = (liveByMember[t.member] || 0) + t.hours;
      liveByPhase[t.phase] = (liveByPhase[t.phase] || 0) + t.hours;
    });
    const roster = TB_ROSTER.map(r => {
      const actual = r.base + (liveByMember[r.name] || 0);
      const bill = TB_BILL[r.role], cost = TB_COST[r.role];
      return { ...r, actual, bill, cost, billVal: actual * bill, costVal: actual * cost,
               variance: r.budget - actual, util: Math.round(actual / r.budget * 100) };
    });
    const phases = TB_PHASES.map(p => {
      const actual = p.base + (liveByPhase[p.id] || 0);
      const eac = p.pct > 0 ? actual / (p.pct / 100) : p.budget;
      return { ...p, actual, eac, variance: p.budget - actual };
    });
    const actualTotal = roster.reduce((s, r) => s + r.actual, 0);
    const budgetTotal = roster.reduce((s, r) => s + r.budget, 0);
    const stdValue = roster.reduce((s, r) => s + r.billVal, 0);
    const costActual = roster.reduce((s, r) => s + r.costVal, 0);
    const stdValueBudget = roster.reduce((s, r) => s + r.budget * r.bill, 0);
    const costBudget = roster.reduce((s, r) => s + r.budget * r.cost, 0);
    const prog = (e.progress || 0) / 100;
    const eacHrs = prog > 0 ? actualTotal / prog : budgetTotal;
    const revRecognized = TB_FEE * prog;
    return {
      roster, phases, actualTotal, budgetTotal, remaining: budgetTotal - actualTotal,
      burn: actualTotal / budgetTotal, stdValue, costActual, stdValueBudget, costBudget,
      eacHrs, etcHrs: Math.max(0, eacHrs - actualTotal), revRecognized,
      fee: TB_FEE, marginNow: revRecognized - costActual,
      marginCompletion: TB_FEE - costBudget, realization: TB_FEE / stdValueBudget,
      blendedBill: stdValue / actualTotal, blendedCost: costActual / actualTotal,
    };
  }, [timeEntries, e]);
}

/* small horizontal budget/actual bar */
function TBBar({ budget, actual, pct, max }: any) {
  const over = actual > budget;
  const bw = (budget / max) * 100, aw = (actual / max) * 100;
  return (
    <div style={{ position: 'relative', height: 18 }}>
      <div style={{ position: 'absolute', inset: 0, width: bw + '%', background: 'var(--surface-3)', borderRadius: 4 }} />
      <div style={{ position: 'absolute', top: 3, bottom: 3, width: aw + '%', background: over ? 'var(--red)' : 'var(--blue)', borderRadius: 3 }} />
      {pct != null && <div style={{ position: 'absolute', top: 0, bottom: 0, left: `calc(${(pct / 100) * bw}% - 1px)`, width: 2, background: 'var(--navy)' }} title={'Earned ' + pct + '%'} />}
    </div>
  );
}

function TimeBudget() {
  const { activeEngagement, locked } = useFirm();
  const { timeEntries, addTimeEntry, team } = useAudit();
  const [tab, setTab] = useTB('overview');
  const e = activeEngagement;
  const m = useTBModel(timeEntries, e);

  const tabs = [
    { id: 'overview', label: 'Ringkasan' },
    { id: 'phase', label: 'Anggaran per Fase' },
    { id: 'timesheet', label: 'Timesheet', count: timeEntries.length },
    { id: 'team', label: 'Tim & Utilisasi' },
    { id: 'econ', label: 'Ekonomi' },
  ];

  return (
    <>
      <SubBar moduleId="time" right={
        <div className="row gap8 ac">
          <Badge kind="blue">{e.id}</Badge>
          <Btn sm><I.sparkle size={13} /> Analisis AI</Btn>
          <Btn sm variant="primary"><I.download size={13} /> Export Timesheet</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">
        {locked && <LockBanner />}
        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>
        {tab === 'overview' && <TBOverview m={m} e={e} />}
        {tab === 'phase' && <TBPhase m={m} />}
        {tab === 'timesheet' && <TBTimesheet m={m} timeEntries={timeEntries} addTimeEntry={addTimeEntry} team={team} locked={locked} />}
        {tab === 'team' && <TBTeam m={m} />}
        {tab === 'econ' && <TBEconomics m={m} e={e} />}
      </div></div>
    </>
  );
}

/* =================== RINGKASAN =================== */
function TBOverview({ m, e }) {
  const { fmt } = AMS;
  const burnPct = Math.round(m.burn * 100);
  const onTrack = m.burn <= e.progress / 100 + 0.05;
  const eacVar = m.budgetTotal - m.eacHrs; // + = di bawah anggaran
  const maxWk = Math.max(...TB_WEEKLY.map(w => w.h));
  return (
    <>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(6,1fr)', gap: 12, marginBottom: 12 }}>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={fmt(m.actualTotal)} label="Jam Aktual" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={fmt(m.budgetTotal)} label="Anggaran Jam" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={fmt(m.remaining)} label="Sisa Jam" accent={m.remaining < 120 ? 'var(--red)' : 'var(--green)'} /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={burnPct + '%'} label="Budget Burn" accent={burnPct > 95 ? 'var(--red)' : burnPct > 85 ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={fmt(Math.round(m.eacHrs))} label="Proyeksi (EAC)" accent={eacVar < 0 ? 'var(--red)' : 'var(--ink)'} /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={Math.round(m.marginCompletion / m.fee * 100) + '%'} label="Margin Proyeksi" accent="var(--green)" /></div></Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: 12, alignItems: 'start', marginBottom: 12 }}>
        <Panel title="Budget Burn vs Progress Audit">
          <div style={{ marginBottom: 12 }}>
            <div className="row jb tiny" style={{ marginBottom: 4 }}><span style={{ fontWeight: 600 }}>Jam terpakai</span><span className="mono">{fmt(m.actualTotal)} / {fmt(m.budgetTotal)} jam</span></div>
            <div style={{ height: 14, borderRadius: 7, background: 'var(--surface-3)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ width: Math.min(100, m.burn * 100) + '%', height: '100%', borderRadius: 7, background: m.burn > 0.95 ? 'var(--red)' : m.burn > 0.85 ? 'var(--amber)' : 'var(--blue)' }} />
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: e.progress + '%', width: 2, background: 'var(--navy)' }} title="Progress audit" />
            </div>
            <div className="row jb tiny muted" style={{ marginTop: 5 }}><span>Burn {burnPct}%</span><span>Progress audit {e.progress}% (garis hitam)</span></div>
          </div>
          <div className="panel" style={{ padding: '9px 11px', background: onTrack ? 'var(--green-bg)' : 'var(--amber-bg)', borderColor: 'transparent' }}>
            <div className="row ac gap8">
              <span style={{ color: onTrack ? 'var(--green)' : 'var(--amber)' }}>{onTrack ? <I.check size={15} /> : <I.alert size={15} />}</span>
              <span className="tiny" style={{ fontWeight: 600 }}>
                {onTrack
                  ? `Sesuai jalur — burn ${burnPct}% selaras dengan progress ${e.progress}%. Proyeksi penyelesaian ${fmt(Math.round(m.eacHrs))} jam (${eacVar >= 0 ? 'di bawah' : 'melampaui'} anggaran ${fmt(Math.abs(Math.round(eacVar)))} jam).`
                  : `Burn melampaui progress — risiko over-budget. Tinjau alokasi & ruang lingkup sisa pekerjaan.`}
              </span>
            </div>
          </div>
        </Panel>

        <Panel title="Proyeksi Penyelesaian (EAC)" sub="metode earned-value">
          <div style={{ display: 'grid', gap: 9 }}>
            <EacRow label="Jam aktual sampai saat ini" v={fmt(m.actualTotal) + ' jam'} />
            <EacRow label="Estimasi sisa (ETC)" v={fmt(Math.round(m.etcHrs)) + ' jam'} />
            <div className="divider" />
            <EacRow label="Estimate at Completion" v={fmt(Math.round(m.eacHrs)) + ' jam'} strong />
            <EacRow label="Varians vs anggaran" v={(eacVar >= 0 ? '+' : '−') + fmt(Math.abs(Math.round(eacVar))) + ' jam'} accent={eacVar >= 0 ? 'var(--green)' : 'var(--red)'} />
            <EacRow label="Biaya pada penyelesaian" v={tbJt(m.costBudget)} />
            <EacRow label="Recovery rate (realisasi)" v={Math.round(m.realization * 100) + '%'} accent={m.realization >= 1 ? 'var(--green)' : 'var(--amber)'} />
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
        <Panel title="Anggaran vs Aktual per Fase">
          <div style={{ display: 'grid', gap: 11 }}>
            {m.phases.map(p => {
              const maxB = Math.max(...m.phases.map(x => Math.max(x.budget, x.actual)));
              return (
                <div key={p.id}>
                  <div className="row jb tiny" style={{ marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{p.label}</span>
                    <span className="mono muted">{fmt(p.actual)} / {fmt(p.budget)} jam · {p.pct}%</span>
                  </div>
                  <TBBar budget={p.budget} actual={p.actual} pct={p.pct} max={maxB} />
                </div>
              );
            })}
          </div>
          <div className="row gap8 ac tiny muted" style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--line-soft)' }}>
            <span className="row ac gap6"><span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--blue)' }} /> Aktual</span>
            <span className="row ac gap6"><span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--surface-3)' }} /> Anggaran</span>
            <span className="row ac gap6"><span style={{ width: 2, height: 12, background: 'var(--navy)' }} /> % selesai (earned)</span>
          </div>
        </Panel>

        <Panel title="Tren Jam Mingguan" sub="8 minggu terakhir">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 132, padding: '6px 2px 4px', borderBottom: '1px solid var(--line)' }}>
            {TB_WEEKLY.map((w, i) => (
              <div key={w.wk} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--ink-2)' }}>{w.h}</span>
                <div style={{ width: '100%', height: (w.h / maxWk) * 96, borderRadius: '3px 3px 0 0', background: i === TB_WEEKLY.length - 1 ? 'var(--blue-400)' : 'var(--blue)', opacity: i === TB_WEEKLY.length - 1 ? 0.55 : 1 }} />
              </div>
            ))}
          </div>
          <div className="row jb" style={{ marginTop: 4 }}>
            {TB_WEEKLY.map(w => <span key={w.wk} className="tiny muted" style={{ flex: 1, textAlign: 'center' }}>{w.wk}</span>)}
          </div>
          <div className="row jb tiny muted" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--line-soft)' }}>
            <span>Rata-rata {fmt(Math.round(TB_WEEKLY.reduce((s, w) => s + w.h, 0) / TB_WEEKLY.length))} jam/minggu</span>
            <span>Puncak {Math.max(...TB_WEEKLY.map(w => w.h))} jam (W4)</span>
          </div>
        </Panel>
      </div>
    </>
  );
}
function EacRow({ label, v, strong, accent }: any) {
  return (
    <div className="row jb ac" style={{ fontSize: strong ? 13 : 12 }}>
      <span style={{ fontWeight: strong ? 700 : 500, color: strong ? 'var(--ink)' : 'var(--ink-2)' }}>{label}</span>
      <span className="mono" style={{ fontWeight: strong ? 800 : 600, color: accent || 'var(--ink)' }}>{v}</span>
    </div>
  );
}

/* =================== ANGGARAN PER FASE =================== */
function TBPhase({ m }) {
  const { fmt } = AMS;
  const totB = m.phases.reduce((s, p) => s + p.budget, 0);
  const totA = m.phases.reduce((s, p) => s + p.actual, 0);
  const totEac = m.phases.reduce((s, p) => s + p.eac, 0);
  return (
    <>
      <Panel noBody className="" >
        <div className="panel-h"><h3>Anggaran Jam per Fase Audit</h3><div style={{ flex: 1 }} /><span className="tiny muted">metode earned-value · proyeksi per fase</span></div>
        <table className="dtbl">
          <thead><tr><th>Fase</th><th>Periode</th><th className="num">Anggaran</th><th className="num">Aktual</th><th className="num">% Selesai</th><th className="num">Proyeksi (EAC)</th><th className="num">Varians</th><th>Status</th></tr></thead>
          <tbody>
            {m.phases.map(p => {
              const eacVar = p.budget - p.eac;
              const st = p.pct >= 100 ? 'Selesai' : eacVar < -10 ? 'Over-budget' : p.pct > 0 ? 'Berjalan' : 'Belum mulai';
              const stKind = st === 'Selesai' ? 'green' : st === 'Over-budget' ? 'red' : st === 'Berjalan' ? 'blue' : 'gray';
              return (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.label}</td>
                  <td className="tiny muted mono">{p.period}</td>
                  <td className="num mono">{fmt(p.budget)}</td>
                  <td className="num mono" style={{ fontWeight: 600 }}>{fmt(p.actual)}</td>
                  <td className="num mono">{p.pct}%</td>
                  <td className="num mono">{fmt(Math.round(p.eac))}</td>
                  <td className="num mono" style={{ color: eacVar < 0 ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>{eacVar >= 0 ? '+' : '−'}{fmt(Math.abs(Math.round(eacVar)))}</td>
                  <td><Badge kind={stKind}>{st}</Badge></td>
                </tr>
              );
            })}
          </tbody>
          <tfoot><tr><td colSpan={2}>TOTAL</td><td className="num">{fmt(totB)}</td><td className="num">{fmt(totA)}</td><td className="num">{Math.round(totA / totEac * 100)}%</td><td className="num">{fmt(Math.round(totEac))}</td><td className="num" style={{ color: totB - totEac < 0 ? 'var(--red)' : 'var(--green)' }}>{totB - totEac >= 0 ? '+' : '−'}{fmt(Math.abs(Math.round(totB - totEac)))}</td><td></td></tr></tfoot>
        </table>
      </Panel>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12, alignItems: 'start' }}>
        <Panel title="Timeline Fase" sub="Feb–Mar 2026">
          <div style={{ display: 'grid', gap: 10 }}>
            {m.phases.map((p, i) => {
              const seg = [[0, 18], [22, 25], [50, 8], [82, 4]][i]; // [leftStart%, span ticks≈]
              const left = [4, 30, 67, 86][i];
              const width = [24, 36, 16, 12][i];
              return (
                <div key={p.id}>
                  <div className="row jb tiny" style={{ marginBottom: 3 }}><span style={{ fontWeight: 600 }}>{p.label}</span><span className="muted mono">{p.period}</span></div>
                  <div style={{ position: 'relative', height: 16, background: 'var(--surface-3)', borderRadius: 4 }}>
                    <div style={{ position: 'absolute', top: 2, bottom: 2, left: left + '%', width: width + '%', borderRadius: 3, background: p.pct >= 100 ? 'var(--green)' : 'var(--blue)', overflow: 'hidden' }}>
                      <div style={{ width: p.pct + '%', height: '100%', background: 'rgba(255,255,255,.28)' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="tiny muted" style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--line-soft)' }}>Bilah terang = porsi terselesaikan. Tenggat fieldwork 31 Mar 2026.</div>
        </Panel>

        <Panel title="Komposisi Jam per Peran" sub="aktual berjalan">
          <TBRoleMix m={m} />
        </Panel>
      </div>
    </>
  );
}

/* role composition donut + legend */
function TBRoleMix({ m }) {
  const { fmt } = AMS;
  const byRole: any = {};
  m.roster.forEach(r => { byRole[r.role] = (byRole[r.role] || 0) + r.actual; });
  const segs = Object.entries(byRole).map(([role, h]: [string, any]) => ({ value: h, color: TB_ROLE_COLOR[role], role, h }));
  const tot = segs.reduce((s, x) => s + x.value, 0);
  return (
    <div className="row gap8 ac" style={{ alignItems: 'center', gap: 18 }}>
      <Donut segments={segs} size={120} thickness={18} center={<div><div className="mono" style={{ fontWeight: 800, fontSize: 17 }}>{fmt(Math.round(tot))}</div><div className="tiny muted">jam</div></div>} />
      <div style={{ flex: 1, display: 'grid', gap: 8 }}>
        {segs.map(s => (
          <div key={s.role} className="row jb ac tiny">
            <span className="row ac gap6"><span style={{ width: 10, height: 10, borderRadius: 2, background: s.color }} /><span style={{ fontWeight: 600 }}>{s.role}</span></span>
            <span className="mono muted">{fmt(Math.round(s.h))}j · {Math.round(s.h / tot * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =================== TIMESHEET =================== */
function TBTimesheet({ m, timeEntries, addTimeEntry, team, locked }) {
  const { fmt } = AMS;
  const [form, setForm] = useTB({ member: 'Anindya Pramesti', phase: 'Eksekusi', task: '', hours: '' });
  const [fMember, setFMember] = useTB('all');
  const [fPhase, setFPhase] = useTB('all');

  const filtered = timeEntries.filter(t => (fMember === 'all' || t.member === fMember) && (fPhase === 'all' || t.phase === fPhase));
  const totalLogged = filtered.reduce((s, t) => s + t.hours, 0);

  const submit = () => {
    if (locked || !form.task.trim() || !(+form.hours > 0)) return;
    addTimeEntry({ member: form.member, phase: form.phase, task: form.task, hours: +form.hours, date: '2026-03-09' });
    setForm(f => ({ ...f, task: '', hours: '' }));
  };
  const phaseOpts = ['Perencanaan', 'Eksekusi', 'Finalisasi', 'Pelaporan'];

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 320px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h">
          <h3>Catatan Waktu (Timesheet)</h3>
          <div style={{ flex: 1 }} />
          <select className="select" value={fMember} onChange={ev => setFMember(ev.target.value)} style={{ height: 24, fontSize: 11.5 }}>
            <option value="all">Semua anggota</option>
            {team.map(t => <option key={t.name} value={t.name}>{t.name.split(',')[0]}</option>)}
          </select>
          <select className="select" value={fPhase} onChange={ev => setFPhase(ev.target.value)} style={{ height: 24, fontSize: 11.5 }}>
            <option value="all">Semua fase</option>
            {phaseOpts.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        {!locked && (
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)', background: 'var(--surface-2)', display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="field" style={{ flex: '1 1 120px' }}><label>Anggota</label><select className="select" value={form.member} onChange={ev => setForm(f => ({ ...f, member: ev.target.value }))}>{team.map(t => <option key={t.name}>{t.name}</option>)}</select></div>
            <div className="field" style={{ flex: '0 0 110px' }}><label>Fase</label><select className="select" value={form.phase} onChange={ev => setForm(f => ({ ...f, phase: ev.target.value }))}>{phaseOpts.map(p => <option key={p}>{p}</option>)}</select></div>
            <div className="field" style={{ flex: '2 1 160px' }}><label>Tugas</label><input className="input" value={form.task} onChange={ev => setForm(f => ({ ...f, task: ev.target.value }))} placeholder="Deskripsi pekerjaan" /></div>
            <div className="field" style={{ flex: '0 0 64px' }}><label>Jam</label><input className="input mono" type="number" value={form.hours} onChange={ev => setForm(f => ({ ...f, hours: ev.target.value }))} style={{ textAlign: 'right' }} /></div>
            <Btn sm variant="primary" onClick={submit}><I.plus size={13} /> Catat</Btn>
          </div>
        )}
        <div style={{ maxHeight: 420, overflow: 'auto' }}>
          <table className="dtbl">
            <thead><tr><th>Tanggal</th><th>Anggota</th><th>Tugas</th><th>Fase</th><th className="num">Jam</th><th className="num">Nilai (std)</th></tr></thead>
            <tbody>
              {filtered.map(t => {
                const r = TB_ROSTER.find(x => x.name === t.member);
                const val = r ? t.hours * TB_BILL[r.role] : 0;
                return (
                  <tr key={t.id}>
                    <td className="mono tiny muted">{new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</td>
                    <td className="truncate" style={{ maxWidth: 120, fontWeight: 600 }}>{t.member.split(',')[0]}</td>
                    <td className="tiny muted truncate" style={{ maxWidth: 200 }}>{t.task}</td>
                    <td><Badge kind="blue">{t.phase}</Badge></td>
                    <td className="num mono" style={{ fontWeight: 600 }}>{t.hours.toFixed(1)}</td>
                    <td className="num mono tiny muted">{tbJt(val)}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 22 }}>Tidak ada entri untuk filter ini.</td></tr>}
            </tbody>
            <tfoot><tr><td colSpan={4}>TOTAL ({filtered.length} entri)</td><td className="num">{fmt(totalLogged, 1)}</td><td></td></tr></tfoot>
          </table>
        </div>
      </Panel>

      <div style={{ display: 'grid', gap: 12 }}>
        <Panel title="Jam per Anggota">
          <div style={{ display: 'grid', gap: 9 }}>
            {m.roster.slice().sort((a, b) => b.actual - a.actual).map(r => {
              const max = Math.max(...m.roster.map(x => x.actual), 1);
              return (
                <div key={r.name}>
                  <div className="row jb tiny" style={{ marginBottom: 3 }}><span className="row ac gap6"><Avatar name={r.name} size={20} /><span style={{ fontWeight: 600 }}>{r.name.split(' ')[0]}</span></span><span className="mono" style={{ fontWeight: 700 }}>{fmt(r.actual, 1)}j</span></div>
                  <div style={{ height: 7, borderRadius: 4, background: 'var(--surface-3)' }}><div style={{ width: (r.actual / max * 100) + '%', height: '100%', borderRadius: 4, background: TB_ROLE_COLOR[r.role] }} /></div>
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel title="Jam per Fase">
          <div style={{ display: 'grid', gap: 9 }}>
            {m.phases.map(p => {
              const max = Math.max(...m.phases.map(x => x.actual), 1);
              return (
                <div key={p.id}>
                  <div className="row jb tiny" style={{ marginBottom: 3 }}><span style={{ fontWeight: 600 }}>{p.label}</span><span className="mono muted">{fmt(p.actual, 0)}j</span></div>
                  <div style={{ height: 7, borderRadius: 4, background: 'var(--surface-3)' }}><div style={{ width: (p.actual / max * 100) + '%', height: '100%', borderRadius: 4, background: 'var(--teal)' }} /></div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* =================== TIM & UTILISASI =================== */
function TBTeam({ m }) {
  const { fmt } = AMS;
  const maxA = Math.max(...m.roster.map(r => r.budget));
  return (
    <>
      <Panel noBody>
        <div className="panel-h"><h3>Realisasi & Utilisasi per Anggota</h3><div style={{ flex: 1 }} /><span className="tiny muted">tarif standar (charge-out) per jam</span></div>
        <table className="dtbl">
          <thead><tr><th>Anggota</th><th>Peran</th><th className="num">Tarif/jam</th><th className="num">Anggaran</th><th className="num">Aktual</th><th className="num">Varians</th><th style={{ width: 150 }}>Anggaran vs Aktual</th><th className="num">Util.</th><th className="num">Nilai (std)</th></tr></thead>
          <tbody>
            {m.roster.map(r => (
              <tr key={r.name}>
                <td><span className="row ac gap8"><Avatar name={r.name} size={22} /><span style={{ fontWeight: 600 }}>{r.name.split(',')[0]}</span></span></td>
                <td><span className="row ac gap6"><span style={{ width: 8, height: 8, borderRadius: 2, background: TB_ROLE_COLOR[r.role] }} /><span className="tiny">{r.role}</span></span></td>
                <td className="num mono tiny">{tbJt(r.bill)}</td>
                <td className="num mono">{fmt(r.budget)}</td>
                <td className="num mono" style={{ fontWeight: 600 }}>{fmt(r.actual, 1)}</td>
                <td className="num mono" style={{ color: r.variance < 0 ? 'var(--red)' : 'var(--green)' }}>{r.variance >= 0 ? '+' : '−'}{fmt(Math.abs(r.variance), 1)}</td>
                <td><TBBar budget={r.budget} actual={r.actual} max={maxA} /></td>
                <td className="num mono" style={{ fontWeight: 600, color: r.util > 100 ? 'var(--red)' : r.util > 85 ? 'var(--amber)' : 'var(--ink)' }}>{r.util}%</td>
                <td className="num mono tiny">{tbJt(r.billVal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td colSpan={3}>TOTAL</td><td className="num">{fmt(m.budgetTotal)}</td><td className="num">{fmt(m.actualTotal, 1)}</td><td className="num">{m.remaining >= 0 ? '+' : '−'}{fmt(Math.abs(m.remaining), 1)}</td><td></td><td className="num">{Math.round(m.actualTotal / m.budgetTotal * 100)}%</td><td className="num">{tbJt(m.stdValue)}</td></tr></tfoot>
        </table>
      </Panel>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12, alignItems: 'start' }}>
        <Panel title="Utilisasi vs Anggaran">
          <div style={{ display: 'grid', gap: 11 }}>
            {m.roster.map(r => (
              <div key={r.name}>
                <div className="row jb tiny" style={{ marginBottom: 3 }}><span style={{ fontWeight: 600 }}>{r.name.split(' ')[0]}</span><span className="mono" style={{ color: r.util > 100 ? 'var(--red)' : 'var(--ink-2)', fontWeight: 700 }}>{r.util}%</span></div>
                <div style={{ height: 8, borderRadius: 4, background: 'var(--surface-3)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ width: Math.min(100, r.util) + '%', height: '100%', borderRadius: 4, background: r.util > 100 ? 'var(--red)' : r.util > 85 ? 'var(--amber)' : 'var(--green)' }} />
                </div>
              </div>
            ))}
          </div>
          <div className="tiny muted" style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--line-soft)' }}>Utilisasi = jam aktual ÷ anggaran jam per anggota pada engagement ini.</div>
        </Panel>
        <Panel title="Komposisi Tim" sub="jam aktual per peran"><TBRoleMix m={m} /></Panel>
      </div>
    </>
  );
}

/* =================== EKONOMI =================== */
function TBEconomics({ m, e }) {
  const { fmt } = AMS;
  const wd = m.fee - m.stdValueBudget; // + = write-up, - = write-down
  const marginPct = Math.round(m.marginCompletion / m.fee * 100);
  return (
    <>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={tbM(m.fee)} label="Fee Disepakati" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={tbM(m.costBudget)} label="Biaya pd Penyelesaian" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={tbM(m.marginCompletion)} label="Margin Proyeksi" accent="var(--green)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={marginPct + '%'} label="Margin %" accent={marginPct >= 40 ? 'var(--green)' : 'var(--amber)'} /></div></Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 12, alignItems: 'start' }}>
        <Panel title="Ekonomi Engagement" sub="saat ini vs proyeksi penyelesaian">
          <table className="dtbl">
            <thead><tr><th>Komponen</th><th className="num">Saat ini ({e.progress}%)</th><th className="num">Penyelesaian (100%)</th></tr></thead>
            <tbody>
              <tr><td>Jam tercatat</td><td className="num mono">{fmt(m.actualTotal, 0)} j</td><td className="num mono">{fmt(Math.round(m.eacHrs))} j</td></tr>
              <tr><td>Nilai standar (WIP @ charge-out)</td><td className="num mono">{tbJt(m.stdValue)}</td><td className="num mono">{tbJt(m.stdValueBudget)}</td></tr>
              <tr><td>Biaya langsung (fully-loaded)</td><td className="num mono">{tbJt(m.costActual)}</td><td className="num mono">{tbJt(m.costBudget)}</td></tr>
              <tr><td>Pendapatan diakui (% completion)</td><td className="num mono">{tbJt(m.revRecognized)}</td><td className="num mono">{tbJt(m.fee)}</td></tr>
              <tr style={{ background: 'var(--surface-2)' }}><td style={{ fontWeight: 700 }}>Margin kotor</td><td className="num mono" style={{ fontWeight: 700, color: 'var(--green)' }}>{tbJt(m.marginNow)}</td><td className="num mono" style={{ fontWeight: 700, color: 'var(--green)' }}>{tbJt(m.marginCompletion)}</td></tr>
              <tr><td>Margin %</td><td className="num mono">{Math.round(m.marginNow / m.revRecognized * 100)}%</td><td className="num mono">{marginPct}%</td></tr>
              <tr><td>Tarif efektif blended</td><td className="num mono">{tbJt(m.blendedBill)}/j</td><td className="num mono">{tbJt(m.stdValueBudget / m.budgetTotal)}/j</td></tr>
            </tbody>
          </table>
          <div className="tiny muted" style={{ marginTop: 8 }}>WIP = work-in-progress dinilai pada tarif standar. Pendapatan diakui mengikuti metode persentase penyelesaian sesuai progress audit.</div>
        </Panel>

        <div style={{ display: 'grid', gap: 12 }}>
          <Panel title="Realisasi (Recovery Rate)">
            <div className="row gap8 ac" style={{ gap: 18 }}>
              <Donut
                segments={wd >= 0
                  ? [{ value: m.stdValueBudget, color: 'var(--blue)' }, { value: wd, color: 'var(--green)' }]
                  : [{ value: m.fee, color: 'var(--blue)' }, { value: -wd, color: 'var(--red)' }]}
                size={120} thickness={18}
                center={<div><div className="mono" style={{ fontWeight: 800, fontSize: 18, color: m.realization >= 1 ? 'var(--green)' : 'var(--amber)' }}>{Math.round(m.realization * 100)}%</div><div className="tiny muted">realisasi</div></div>}
              />
              <div style={{ flex: 1, display: 'grid', gap: 8 }}>
                <EacRow label="Nilai standar (budget)" v={tbJt(m.stdValueBudget)} />
                <EacRow label="Fee disepakati" v={tbJt(m.fee)} />
                <div className="divider" />
                <EacRow label={wd >= 0 ? 'Write-up' : 'Write-down'} v={(wd >= 0 ? '+' : '−') + tbJt(Math.abs(wd)).replace('Rp ', '')} accent={wd >= 0 ? 'var(--green)' : 'var(--red)'} strong />
              </div>
            </div>
          </Panel>
          <Panel title="Penagihan & WIP" sub="status faktur">
            <div style={{ display: 'grid', gap: 9 }}>
              <EacRow label="Sudah ditagih (2 termin)" v={tbJt(m.fee * 0.5)} />
              <EacRow label="WIP belum ditagih" v={tbJt(Math.max(0, m.revRecognized - m.fee * 0.5))} accent="var(--amber)" />
              <EacRow label="Sisa nilai kontrak" v={tbJt(m.fee * 0.5)} />
              <div className="divider" />
              <div className="panel" style={{ padding: '9px 11px', background: 'var(--blue-050)', borderColor: 'transparent' }}>
                <div className="row ac gap8"><span style={{ color: 'var(--blue)' }}><I.receipt size={15} /></span><span className="tiny" style={{ fontWeight: 600 }}>Termin ke-3 ({tbJt(m.fee * 0.3)}) jatuh tempo saat fieldwork selesai (31 Mar).</span></div>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { TimeBudget });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { TimeBudget };
