/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAmsPersist } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Avatar, Badge, Btn, Panel, Stat, Tabs } from './ui.jsx';

/* ============================================================
   NeoSuite AMS — HCM: Cuti & Kehadiran  ·  Siklus Kinerja
   Saldo cuti · pengajuan & persetujuan · siapa sedang cuti ·
   goal → self → manager → kalibrasi 9-box.
   ============================================================ */
const { useState: useHR } = React;

/* ============================================================
   Cuti & Kehadiran (Leave & Attendance)
   ============================================================ */
const LV_STAT = { 'Disetujui': 'green', 'Menunggu': 'amber', 'Ditolak': 'red' };
const LV_TYPE_COLOR = { 'Cuti Tahunan': '#005085', 'Sakit': '#9a6a00', 'Cuti Menikah': '#5b3fa6', 'Cuti Melahirkan': '#0a6b73', 'Izin': '#647889' };

function LeaveAttendance() {
  const staff = AMS.STAFF;
  const BAL = AMS.LEAVE_BALANCE;
  const [reqs, setReqs] = useAmsPersist('leaveReqs', () => AMS.LEAVE_REQUESTS);
  const [tab, setTab] = useHR('requests');

  const setStatus = (id, status) => setReqs(list => list.map(r => r.id === id ? { ...r, status } : r));
  const pending = reqs.filter(r => r.status === 'Menunggu');
  const onLeaveToday = reqs.filter(r => r.status === 'Disetujui' && new Date(r.from) <= new Date('2026-03-09') && new Date(r.to) >= new Date('2026-03-09'));
  const totalEnt = staff.reduce((s, p) => s + (BAL[p.id] ? BAL[p.id].ent + BAL[p.id].carry : 0), 0);
  const totalUsed = staff.reduce((s, p) => s + (BAL[p.id] ? BAL[p.id].used : 0), 0);

  const tabs = [{ id: 'requests', label: 'Pengajuan Cuti', count: pending.length }, { id: 'balance', label: 'Saldo Cuti' }, { id: 'calendar', label: 'Kalender Kehadiran' }];

  /* simple 14-day strip for calendar (Mar 2026) */
  const days = Array.from({ length: 21 }, (_, i) => new Date(2026, 2, 3 + i));
  const onLeave = (emp, d) => reqs.some(r => r.emp === emp && r.status !== 'Ditolak' && new Date(r.from) <= d && new Date(r.to) >= d);

  return (
    <>
      <SubBar moduleId="leave" right={<div className="row gap8 ac"><Badge kind="blue">Kuota 12 hari/tahun</Badge><Btn sm variant="primary"><I.plus size={14} /> Ajukan Cuti</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={pending.length} label="Menunggu Persetujuan" accent={pending.length ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={onLeaveToday.length} label="Cuti Hari Ini" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={totalUsed + ' / ' + totalEnt} label="Hari Cuti Terpakai (firma)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={Math.round(totalUsed / totalEnt * 100) + '%'} label="Pemanfaatan Kuota" accent="var(--blue)" /></div></Panel>
        </div>

        <Panel noBody>
          <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

          {tab === 'requests' && (
            <table className="dtbl">
              <thead><tr><th>ID</th><th>Karyawan</th><th>Jenis</th><th>Periode</th><th className="num">Hari</th><th>Alasan</th><th>Penyetuju</th><th>Status / Aksi</th></tr></thead>
              <tbody>
                {reqs.map(r => (
                  <tr key={r.id}>
                    <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.id}</td>
                    <td style={{ fontWeight: 600 }}>{r.name}</td>
                    <td><span className="badge" style={{ background: LV_TYPE_COLOR[r.type] + '1a', color: LV_TYPE_COLOR[r.type] }}>{r.type}</span></td>
                    <td className="tiny">{new Date(r.from).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} – {new Date(r.to).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</td>
                    <td className="num mono">{r.days}</td>
                    <td className="tiny muted truncate" style={{ maxWidth: 140 }}>{r.reason}</td>
                    <td className="tiny muted">{r.approver}</td>
                    <td>{r.status === 'Menunggu'
                      ? <div className="row gap6"><button className="btn sm" style={{ height: 22, color: 'var(--green)' }} onClick={() => setStatus(r.id, 'Disetujui')}><I.check size={12} /> Setujui</button><button className="btn sm" style={{ height: 22 }} onClick={() => setStatus(r.id, 'Ditolak')}><I.x size={12} /></button></div>
                      : <Badge kind={LV_STAT[r.status]}>{r.status}</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'balance' && (
            <table className="dtbl">
              <thead><tr><th>Karyawan</th><th>Jabatan</th><th className="num">Kuota</th><th className="num">Saldo Lalu</th><th className="num">Terpakai</th><th className="num">Sisa</th><th style={{ width: 150 }}>Pemakaian</th></tr></thead>
              <tbody>
                {staff.filter(s => BAL[s.id]).map(s => {
                  const b = BAL[s.id]; const total = b.ent + b.carry; const left = total - b.used;
                  return (
                    <tr key={s.id}>
                      <td><div className="row ac gap8"><Avatar name={s.name} size={24} /><span style={{ fontWeight: 600 }}>{s.name}</span></div></td>
                      <td className="tiny muted">{s.role}</td>
                      <td className="num mono">{b.ent}</td>
                      <td className="num mono muted">{b.carry || '—'}</td>
                      <td className="num mono">{b.used}</td>
                      <td className="num mono" style={{ fontWeight: 700, color: left <= 2 ? 'var(--amber)' : 'var(--green)' }}>{left}</td>
                      <td><div style={{ height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: (b.used / total * 100) + '%', height: '100%', borderRadius: 3, background: b.used / total > 0.8 ? 'var(--amber)' : 'var(--blue)' }} /></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {tab === 'calendar' && (
            <div style={{ padding: 14, overflowX: 'auto' }}>
              <table className="dtbl" style={{ minWidth: 760 }}>
                <thead><tr><th style={{ position: 'sticky', left: 0, background: 'var(--surface-2)' }}>Karyawan</th>{days.map((d, i) => <th key={i} className="num" style={{ minWidth: 26, padding: '6px 3px', color: d.getDay() === 0 || d.getDay() === 6 ? 'var(--ink-4)' : 'inherit' }}>{d.getDate()}</th>)}</tr></thead>
                <tbody>
                  {staff.map(s => (
                    <tr key={s.id}>
                      <td style={{ position: 'sticky', left: 0, background: 'var(--surface)', fontWeight: 600 }}><div className="row ac gap6"><Avatar name={s.name} size={20} /><span className="tiny truncate" style={{ maxWidth: 110 }}>{s.name}</span></div></td>
                      {days.map((d, i) => {
                        const wknd = d.getDay() === 0 || d.getDay() === 6;
                        const lv = onLeave(s.id, d);
                        return <td key={i} style={{ textAlign: 'center', padding: '4px 3px', background: wknd ? 'var(--surface-2)' : 'transparent' }}>{lv ? <span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: 4, background: 'var(--blue)' }} title="Cuti" /> : wknd ? '' : <span style={{ color: 'var(--ink-4)', fontSize: 10 }}>·</span>}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="row gap12 tiny muted" style={{ marginTop: 10 }}><span className="row ac gap4"><span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--blue)' }} /> Cuti</span><span className="row ac gap4"><span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--surface-2)', border: '1px solid var(--line)' }} /> Akhir pekan</span><span>· Maret 2026</span></div>
            </div>
          )}
        </Panel>
      </div></div>
    </>
  );
}

/* ============================================================
   Siklus Kinerja (Performance Cycle) — 9-box calibration
   ============================================================ */
const PERF_PHASES = ['Goal Setting', 'Self-Review', 'Manager Review', 'Kalibrasi'];

function Performance() {
  const { fmt } = AMS;
  const staff = AMS.STAFF;
  const C = AMS.PERF_CYCLE;
  const [sel, setSel] = useHR('EMP-021');
  const [pdata, setPdata] = useAmsPersist('perfPeople', () => C.people);
  const advance = (id) => setPdata(m => { const p = { ...m[id] }; if (!p.goalsSet) p.goalsSet = true; else if (!p.selfDone) p.selfDone = true; else if (!p.mgrDone) p.mgrDone = true; else p.calibrated = true; return { ...m, [id]: p }; });

  const people = staff.filter(s => pdata[s.id]).map(s => ({ ...s, ...pdata[s.id] }));
  const phaseIdx = (p) => p.calibrated ? 4 : p.mgrDone ? 3 : p.selfDone ? 2 : p.goalsSet ? 1 : 0;
  const calibrated = people.filter(p => p.calibrated).length;
  const pendingMgr = people.filter(p => p.selfDone && !p.mgrDone).length;
  const avgPerf = (people.reduce((s, p) => s + p.perf, 0) / people.length);
  const person = people.find(p => p.id === sel) || people[0];
  const goals = C.goals[person.id];

  /* 9-box: x = perf (1-5 → low/mid/high), y = potential */
  const band = (v) => v >= 4.3 ? 2 : v >= 3.6 ? 1 : 0;
  const boxColor = (px, py) => {
    const sum = px + py;
    return sum >= 3 ? 'var(--green-bg)' : sum >= 2 ? 'var(--blue-050)' : sum >= 1 ? 'var(--amber-bg)' : 'var(--red-bg)';
  };

  return (
    <>
      <SubBar moduleId="performance" right={<div className="row gap8 ac"><Badge kind="blue">{C.cycle} · {C.phase}</Badge><Btn sm><I.download size={13} /> Laporan Kalibrasi</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={calibrated + ' / ' + people.length} label="Terkalibrasi" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={pendingMgr} label="Menunggu Reviu Manajer" accent="var(--amber)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={avgPerf.toFixed(2)} label="Rata-rata Skor Kinerja" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={people.filter(p => p.promote && p.promote !== '—').length} label="Kandidat Promosi" accent="var(--purple)" /></div></Panel>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1.35fr 1fr', gap: 12, alignItems: 'start' }}>
          {/* roster + progress */}
          <Panel noBody>
            <div className="panel-h"><h3>Status Reviu Kinerja</h3><div style={{ flex: 1 }} /><span className="tiny muted">{C.cycle}</span></div>
            <table className="dtbl">
              <thead><tr><th>Karyawan</th><th style={{ width: 180 }}>Tahapan</th><th className="num">Skor</th><th>Penempatan</th></tr></thead>
              <tbody>
                {people.map(p => {
                  const pi = phaseIdx(p);
                  return (
                    <tr key={p.id} className={p.id === sel ? 'sel' : ''} onClick={() => setSel(p.id)} style={{ cursor: 'pointer' }}>
                      <td><div className="row ac gap8"><Avatar name={p.name} size={24} /><span style={{ fontWeight: 600 }} className="truncate">{p.name}</span></div></td>
                      <td>
                        <div className="row gap4 ac">
                          {PERF_PHASES.map((ph, i) => <span key={i} title={ph} style={{ flex: 1, height: 5, borderRadius: 3, background: i < pi ? 'var(--green)' : i === pi ? 'var(--amber)' : 'var(--surface-3)' }} />)}
                        </div>
                        <div className="tiny muted" style={{ marginTop: 3 }}>{p.calibrated ? 'Selesai' : PERF_PHASES[pi] || 'Mulai'}</div>
                      </td>
                      <td className="num mono" style={{ fontWeight: 700 }}>{p.perf.toFixed(1)}</td>
                      <td><span className="tiny" style={{ fontWeight: 600, color: p.box.includes('Bintang') ? 'var(--green)' : p.box.includes('Tinggi') ? 'var(--blue)' : 'var(--ink-2)' }}>{p.box}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* 9-box grid */}
            <div style={{ padding: 16, borderTop: '1px solid var(--line)' }}>
              <div className="tiny muted upper" style={{ marginBottom: 10 }}>Matriks Kalibrasi 9-Box (Kinerja × Potensi)</div>
              <div className="row" style={{ gap: 8 }}>
                <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 9.5, color: 'var(--ink-4)', textAlign: 'center', fontWeight: 600, letterSpacing: '.05em' }}>POTENSI →</div>
                <div style={{ flex: 1 }}>
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gridTemplateRows: 'repeat(3,52px)', gap: 4 }}>
                    {[2, 1, 0].map(py => [0, 1, 2].map(px => {
                      const here = people.filter(p => band(p.perf) === px && band(p.pot) === py);
                      return (
                        <div key={py + '-' + px} style={{ background: boxColor(px, py), borderRadius: 6, padding: 4, display: 'flex', flexWrap: 'wrap', gap: 3, alignContent: 'flex-start', border: '1px solid var(--line-soft)' }}>
                          {here.map(p => <span key={p.id} onClick={() => setSel(p.id)} title={p.name} style={{ cursor: 'pointer', outline: p.id === sel ? '2px solid var(--navy)' : 'none', borderRadius: '50%' }}><Avatar name={p.name} size={22} /></span>)}
                        </div>
                      );
                    }))}
                  </div>
                  <div style={{ textAlign: 'center', fontSize: 9.5, color: 'var(--ink-4)', fontWeight: 600, letterSpacing: '.05em', marginTop: 4 }}>KINERJA →</div>
                </div>
              </div>
            </div>
          </Panel>

          {/* detail */}
          <Panel noBody>
            <div style={{ background: 'linear-gradient(120deg,#013a52,#005085)', color: '#fff', padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
              <Avatar name={person.name} size={42} />
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 700 }} className="truncate">{person.name}</div><div className="tiny" style={{ color: '#bcd6e4' }}>{person.role}</div></div>
              {person.calibrated ? <Badge kind="green">Terkalibrasi</Badge> : <Badge kind="amber">{PERF_PHASES[phaseIdx(person)]}</Badge>}
            </div>
            <div style={{ padding: 14 }}>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <RowKvBox label="Skor Kinerja" v={person.perf.toFixed(1) + ' / 5'} accent={person.perf >= 4.3 ? 'var(--green)' : 'var(--blue)'} />
                <RowKvBox label="Potensi" v={person.pot.toFixed(1) + ' / 5'} accent="var(--purple)" />
                <RowKvBox label="Penempatan 9-Box" v={person.box} />
                <RowKvBox label="Rekomendasi" v={person.promote === '—' ? 'Pertahankan' : person.promote} accent={person.promote !== '—' ? 'var(--purple)' : undefined} />
              </div>

              {goals ? (
                <>
                  <div className="tiny muted upper" style={{ marginBottom: 8 }}>Sasaran & KPI ({C.cycle})</div>
                  <div style={{ display: 'grid', gap: 9, marginBottom: 14 }}>
                    {goals.map((g, i) => (
                      <div key={i} className="panel" style={{ padding: '9px 11px', boxShadow: 'none' }}>
                        <div className="row jb ac" style={{ marginBottom: 5 }}><span style={{ fontSize: 12, fontWeight: 600 }} className="truncate">{g.kpi}</span><span className="chip tiny">{g.weight}%</span></div>
                        <div className="row jb ac">
                          <span className="tiny muted">Target {g.target} · Aktual <b style={{ color: 'var(--ink)' }}>{g.actual}</b></span>
                          <span className="mono tiny" style={{ fontWeight: 700, color: g.score >= 4.3 ? 'var(--green)' : g.score >= 3.5 ? 'var(--blue)' : 'var(--amber)' }}>{g.score.toFixed(1)}</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 3, background: 'var(--surface-3)', marginTop: 5 }}><div style={{ width: (g.score / 5 * 100) + '%', height: '100%', borderRadius: 3, background: g.score >= 4.3 ? 'var(--green)' : g.score >= 3.5 ? 'var(--blue)' : 'var(--amber)' }} /></div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="panel" style={{ padding: 14, textAlign: 'center', boxShadow: 'none', marginBottom: 14 }}>
                  <div className="tiny muted" style={{ lineHeight: 1.5 }}>Rincian KPI tersedia setelah self-review & manager-review dilengkapi.</div>
                </div>
              )}

              {!person.calibrated && (
                <Btn variant="primary" style={{ width: '100%' }} onClick={() => advance(person.id)}><I.check size={14} /> {!person.selfDone ? 'Tandai Self-Review Selesai' : person.mgrDone ? 'Tandai Terkalibrasi' : 'Selesaikan Reviu Manajer'}</Btn>
              )}
            </div>
          </Panel>
        </div>
      </div></div>
    </>
  );
}

function RowKvBox({ label, v, accent }) {
  return (
    <div className="panel" style={{ padding: '8px 10px', boxShadow: 'none' }}>
      <div className="tiny muted upper" style={{ marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: accent || 'var(--ink)' }}>{v}</div>
    </div>
  );
}

Object.assign(window, { LeaveAttendance, Performance, RowKvBox });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { LeaveAttendance, Performance, RowKvBox };
