/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAmsPersist, useAuth, useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Avatar, Badge, Btn, Panel, Stat, Tabs } from './ui';
import { amsExportXlsx } from './export_xlsx';
import { resolveEmpId } from './ethics_compliance';
import {
  LEAVE_POLICY, approvalCheck, evaluateLeaveRow, holidayCoverage, leaveFirmSummary,
  leaveLedger, leaveStateOn, onLeaveOn,
} from './canon_leave';
import type { HolidayCalendar, LeaveRequestInput, LeaveRow } from './canon_leave';

/* ============================================================
   Asseris — HCM: Cuti & Kehadiran  ·  Siklus Kinerja
   Saldo cuti · pengajuan & persetujuan · siapa sedang cuti ·
   goal → self → manager → kalibrasi 9-box.
   ============================================================ */
const { useState: useHR } = React;

/* ============================================================
   Cuti & Kehadiran (Leave & Attendance)
   ============================================================ */
const LV_STAT: Record<string, string> = { 'Disetujui': 'green', 'Menunggu': 'amber', 'Ditolak': 'red' };
const LV_TYPE_COLOR: Record<string, string> = { 'Cuti Tahunan': '#005085', 'Sakit': '#9a6a00', 'Cuti Menikah': '#5b3fa6', 'Cuti Melahirkan': '#0a6b73', 'Cuti Duka': '#7a4b4b', 'Izin': '#647889' };

type LeaveStaffRow = { id: string; name: string; role?: string; joined?: number | string };

/* Roster modul cuti = STAFF ∪ FIRM_STAFF. Pegawai firm-ops (Admin&HR / Finance)
   punya saldo cuti sendiri tetapi dulu tak pernah muncul di register cuti firma
   karena view ini hanya mengiterasi AMS.STAFF. */
function leaveRoster(): LeaveStaffRow[] {
  const A = AMS as unknown as { STAFF?: LeaveStaffRow[]; FIRM_STAFF?: LeaveStaffRow[] };
  return [...(A.STAFF || []), ...(A.FIRM_STAFF || [])];
}

const DAY_MS_HR = 86_400_000;
const isoDay = (t: number) => new Date(t).toISOString().slice(0, 10);

function LeaveAttendance() {
  const nav = useNav();
  const auth = useAuth();
  const roster = leaveRoster();
  // 2026-07-05 — saldo cuti & pengajuan ter-filter server (personal.get): non-privileged hanya
  // menerima barisnya sendiri (tabel Saldo Cuti otomatis menyusut, pola view_payroll).
  const [BAL] = useAmsPersist('leaveBalance', () => AMS.LEAVE_BALANCE);
  const [reqs, setReqs] = useAmsPersist('leaveReqs', () => AMS.LEAVE_REQUESTS);
  const [tab, setTab] = useHR('requests');

  const carry = (BAL || {}) as Record<string, { carry?: number } | undefined>;
  const list = (Array.isArray(reqs) ? reqs : []) as LeaveRequestInput[];
  const today = String(AMS.TODAY || '');
  const cal = AMS.LEAVE_HOLIDAYS as unknown as HolidayCalendar;
  const coverage = holidayCoverage(cal, Number(today.slice(0, 4)) || new Date().getUTCFullYear());
  /* Baris yang boleh dilihat caller = yang punya entri saldo (server sudah menyaring). */
  const visible = roster.filter((s) => !!carry[s.id]);
  const ledgers = leaveLedger(visible, list, carry, today, cal, LEAVE_POLICY);
  const firm = leaveFirmSummary(ledgers);
  const meEmp = resolveEmpId(auth && auth.user);

  /* Baris SSOT (hari kerja terhitung) untuk seluruh permintaan yang tampil —
     termasuk tahun lain, yang tak masuk buku besar tahun berjalan. */
  const ledgerOf = (emp?: string) => (emp ? ledgers[emp] : undefined);
  const rowOf = (r: LeaveRequestInput): LeaveRow => {
    const led = ledgerOf(r.emp);
    const inLedger = led && led.rows.find((x) => x.id === r.id);
    return inLedger || evaluateLeaveRow(r, cal);
  };
  const nameOf = (emp: string, fallback?: string) => roster.find((s) => s.id === emp)?.name || fallback || emp;

  const setStatus = (id: string, status: string) =>
    setReqs((l: unknown) => (Array.isArray(l) ? l : []).map((r: LeaveRequestInput) => (r.id === id ? { ...r, status, decidedBy: auth?.user?.name, decidedAt: today } : r)));

  const pending = list.filter((r) => r.status === 'Menunggu');
  const onLeaveToday = onLeaveOn(list, today);
  const flaggedRows = list.map(rowOf).filter((r) => r.flags.length > 0);

  const tabs = [{ id: 'requests', label: 'Pengajuan Cuti', count: pending.length }, { id: 'balance', label: 'Saldo Cuti' }, { id: 'calendar', label: 'Kalender Kehadiran' }];

  /* Strip kalender berpusat pada AMS.TODAY — dulu dipaku ke Maret 2026, sehingga
     klok bergerak meninggalkannya tanpa suara. */
  const t0 = (() => { const t = Date.parse(today + 'T00:00:00Z'); return Number.isFinite(t) ? t - 7 * DAY_MS_HR : Date.now(); })();
  const days = Array.from({ length: 21 }, (_, i) => t0 + i * DAY_MS_HR);
  const holidayNames = new Map((cal?.entries || []).map((h) => [h.date, h.name]));

  return (
    <>
      <SubBar moduleId="leave" right={<div className="row gap8 ac"><Badge kind="blue">Kuota {LEAVE_POLICY.annualDays} hari/tahun</Badge><Btn sm variant="primary" onClick={() => nav('personal')} title="Ajukan cuti via Data Personal Saya (self-service)"><I.plus size={14} /> Ajukan Cuti</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={pending.length} label="Menunggu Persetujuan" accent={pending.length ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={onLeaveToday.length} label="Cuti Hari Ini" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={firm.used + ' / ' + firm.quota} label="Hari Cuti Terpakai (firma)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={firm.utilisationPct + '%'} label="Pemanfaatan Kuota" accent="var(--blue)" /></div></Panel>
        </div>

        {(coverage.note || flaggedRows.length > 0) && (
          <div className="panel" style={{ padding: '9px 12px', marginBottom: 12, background: 'var(--amber-bg)', borderColor: 'transparent', boxShadow: 'none' }}>
            {coverage.note && <div className="tiny" style={{ lineHeight: 1.5 }}><b>Kalender hari libur:</b> {coverage.note}</div>}
            {flaggedRows.length > 0 && (
              <div className="tiny" style={{ lineHeight: 1.5, marginTop: coverage.note ? 4 : 0 }}>
                <b>{flaggedRows.length} permintaan</b> menyatakan jumlah hari yang tidak sama dengan hari kerja dalam rentangnya — buku besar memakai hari kerja terhitung, bukan angka yang dinyatakan.
              </div>
            )}
          </div>
        )}

        <Panel noBody>
          <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

          {tab === 'requests' && (
            <table className="dtbl">
              <thead><tr><th>ID</th><th>Karyawan</th><th>Jenis</th><th>Periode</th><th className="num">Hari Kerja</th><th>Alasan</th><th>Penyetuju</th><th>Status / Aksi</th></tr></thead>
              <tbody>
                {list.map((r) => {
                  const row = rowOf(r);
                  const led = ledgerOf(r.emp);
                  const chk = led ? approvalCheck(led, r.id, meEmp) : { ok: false, reason: 'Buku besar cuti karyawan ini tidak tersedia.', wouldRemain: 0 };
                  const mismatch = row.flags.includes('hari-tidak-cocok');
                  return (
                    <tr key={r.id}>
                      <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.id}</td>
                      <td style={{ fontWeight: 600 }}>{nameOf(r.emp || '', r.name)}</td>
                      <td><span className="badge" style={{ background: (LV_TYPE_COLOR[r.type] || 'var(--ink-3)') + '1a', color: LV_TYPE_COLOR[r.type] || 'var(--ink-2)' }} title={row.meta.basis}>{r.type}</span></td>
                      <td className="tiny">{new Date(r.from).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} – {new Date(r.to).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</td>
                      <td className="num mono" title={row.span.valid ? `${row.span.calendarDays} hari kalender − ${row.span.weekendDays} akhir pekan − ${row.span.holidayDays} hari libur` : row.span.reason}>
                        {row.span.valid ? row.days : '—'}
                        {mismatch && <span className="tiny" style={{ color: 'var(--amber)', marginLeft: 4 }} title={`Baris menyatakan ${row.declaredDays} hari`}>(dinyatakan {row.declaredDays})</span>}
                      </td>
                      <td className="tiny muted truncate" style={{ maxWidth: 140 }}>{r.reason}</td>
                      <td className="tiny muted">{r.approver}</td>
                      <td>{r.status === 'Menunggu'
                        ? <div className="row gap6">
                            <button className="btn sm" disabled={!chk.ok} title={chk.ok ? `Sisa setelah disetujui: ${chk.wouldRemain} hari` : chk.reason} style={{ height: 22, color: chk.ok ? 'var(--green)' : 'var(--ink-4)', opacity: chk.ok ? 1 : .55 }} onClick={() => chk.ok && setStatus(r.id, 'Disetujui')}><I.check size={12} /> Setujui</button>
                            <button aria-label="Tolak permintaan" className="btn sm" style={{ height: 22 }} onClick={() => setStatus(r.id, 'Ditolak')}><I.x size={12} /></button>
                          </div>
                        : <Badge kind={LV_STAT[r.status] || 'gray'}>{r.status}</Badge>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {tab === 'balance' && (
            <table className="dtbl">
              <thead><tr><th>Karyawan</th><th>Jabatan</th><th className="num">Hak</th><th className="num">Saldo Lalu</th><th className="num">Terpakai</th><th className="num">Diajukan</th><th className="num">Sisa</th><th style={{ width: 150 }}>Pemakaian</th></tr></thead>
              <tbody>
                {visible.map((s) => {
                  const l = ledgers[s.id];
                  if (!l) return null;
                  const pct = l.quota > 0 ? (l.used / l.quota) * 100 : 0;
                  return (
                    <tr key={s.id}>
                      <td><div className="row ac gap8"><Avatar name={s.name} size={24} /><span style={{ fontWeight: 600 }}>{s.name}</span></div></td>
                      <td className="tiny muted">{s.role}</td>
                      <td className="num mono" title={l.entitlement.note || `Diturunkan dari tahun bergabung ${s.joined} · ${LEAVE_POLICY.basis}`}>
                        {l.entitlement.days}{l.entitlement.assumed && <span style={{ color: 'var(--amber)' }} title={l.entitlement.note}> ~</span>}
                      </td>
                      <td className="num mono muted" title={l.carryIn ? `Hangus ${l.carryExpiresOn}` : ''}>{l.carryUsable || '—'}</td>
                      <td className="num mono">{l.used}</td>
                      <td className="num mono muted">{l.pending || '—'}</td>
                      <td className="num mono" style={{ fontWeight: 700, color: l.remaining < 0 ? 'var(--red)' : l.remaining <= 2 ? 'var(--amber)' : 'var(--green)' }}>{l.remaining}</td>
                      <td><div style={{ height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: Math.min(100, pct) + '%', height: '100%', borderRadius: 3, background: pct > 100 ? 'var(--red)' : pct > 80 ? 'var(--amber)' : 'var(--blue)' }} /></div></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot><tr><td colSpan={4}>TOTAL FIRMA</td><td className="num mono">{firm.used}</td><td className="num mono">{firm.pending}</td><td className="num mono">{firm.remaining}</td><td></td></tr></tfoot>
            </table>
          )}

          {tab === 'calendar' && (
            <div style={{ padding: 14, overflowX: 'auto' }}>
              <table className="dtbl" style={{ minWidth: 760 }}>
                <thead><tr><th style={{ position: 'sticky', left: 0, background: 'var(--surface-2)' }}>Karyawan</th>{days.map((t) => { const d = new Date(t); const wknd = d.getUTCDay() === 0 || d.getUTCDay() === 6; const hol = holidayNames.get(isoDay(t)); return <th key={t} className="num" title={hol || ''} style={{ minWidth: 26, padding: '6px 3px', color: hol ? 'var(--red)' : wknd ? 'var(--ink-4)' : 'inherit' }}>{d.getUTCDate()}</th>; })}</tr></thead>
                <tbody>
                  {/* 2026-07-06 — self-scoped: BAL (leaveBalance via personal.get) hanya berisi baris
                      yang boleh dilihat caller; non-privileged → hanya dirinya sendiri. */}
                  {visible.map((s) => (
                    <tr key={s.id}>
                      <td style={{ position: 'sticky', left: 0, background: 'var(--surface)', fontWeight: 600 }}><div className="row ac gap6"><Avatar name={s.name} size={20} /><span className="tiny truncate" style={{ maxWidth: 110 }}>{s.name}</span></div></td>
                      {days.map((t) => {
                        const iso = isoDay(t);
                        const d = new Date(t);
                        const wknd = d.getUTCDay() === 0 || d.getUTCDay() === 6;
                        const hol = holidayNames.get(iso);
                        const st = leaveStateOn(list, s.id, iso);
                        const bg = st.state === 'approved' ? 'var(--blue-solid)' : st.state === 'pending' ? 'var(--amber)' : '';
                        return <td key={t} style={{ textAlign: 'center', padding: '4px 3px', background: hol ? 'var(--red-bg)' : wknd ? 'var(--surface-2)' : 'transparent' }}>{bg ? <span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: 4, background: bg }} title={`${st.type} · ${st.state === 'approved' ? 'disetujui' : 'menunggu'}`} /> : hol ? '' : wknd ? '' : <span style={{ color: 'var(--ink-4)', fontSize: 11 }}>·</span>}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="row gap12 tiny muted" style={{ marginTop: 10 }}><span className="row ac gap4"><span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--blue-solid)' }} /> Cuti disetujui</span><span className="row ac gap4"><span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--amber)' }} /> Menunggu</span><span className="row ac gap4"><span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--red-bg)', border: '1px solid var(--line)' }} /> Hari libur</span><span className="row ac gap4"><span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--surface-2)', border: '1px solid var(--line)' }} /> Akhir pekan</span></div>
            </div>
          )}
        </Panel>

        <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>
          Hak cuti tahunan diturunkan dari tahun bergabung — <b>{LEAVE_POLICY.basis}</b>. Hari kerja dihitung dari rentang tanggal dikurangi akhir pekan dan hari libur nasional ({cal?.basis}); jumlah hari yang dinyatakan pada permintaan hanya dibandingkan, tidak dipakai. Sakit dan cuti penting <b>tidak</b> memotong kuota cuti tahunan.
        </div>
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
  const staff: any = AMS.STAFF;
  const C: any = AMS.PERF_CYCLE;
  const [sel, setSel] = useHR('EMP-021');
  const [pdata, setPdata] = useAmsPersist('perfPeople', () => C.people);
  // 2026-07-05 — sasaran/KPI (perfGoals) ter-filter server (personal.get) sejalan perfPeople.
  const [goalsAll] = useAmsPersist('perfGoals', () => C.goals);
  const advance = (id: any) => setPdata((m: any) => { const p = { ...m[id] }; if (!p.goalsSet) p.goalsSet = true; else if (!p.selfDone) p.selfDone = true; else if (!p.mgrDone) p.mgrDone = true; else p.calibrated = true; return { ...m, [id]: p }; });

  const people = staff.filter((s: any) => pdata[s.id]).map((s: any) => ({ ...s, ...pdata[s.id] }));
  // Guard: data ter-filter bisa kosong (mis. peran self-only yang EMP-nya tak ada di siklus kinerja).
  if (!people.length) return (<><SubBar moduleId="performance" /><div className="view-scroll"><div className="view-pad"><Panel><div style={{ padding: 28, textAlign: 'center' }} className="tiny muted">Tidak ada data kinerja yang dapat Anda lihat. Data kinerja staf lain hanya untuk Rekan Pemimpin / HR (lihat data personal Anda di modul <b>Data Personal Saya</b>).</div></Panel></div></div></>);
  const phaseIdx = (p: any) => p.calibrated ? 4 : p.mgrDone ? 3 : p.selfDone ? 2 : p.goalsSet ? 1 : 0;
  const calibrated = people.filter((p: any) => p.calibrated).length;
  const pendingMgr = people.filter((p: any) => p.selfDone && !p.mgrDone).length;
  const avgPerf = (people.reduce((s: any, p: any) => s + p.perf, 0) / people.length);
  const person = people.find((p: any) => p.id === sel) || people[0];
  const goals = (goalsAll || {})[person.id];

  /* 9-box: x = perf (1-5 → low/mid/high), y = potential */
  const band = (v: any) => v >= 4.3 ? 2 : v >= 3.6 ? 1 : 0;
  const boxColor = (px: any, py: any) => {
    const sum = px + py;
    return sum >= 3 ? 'var(--green-bg)' : sum >= 2 ? 'var(--blue-050)' : sum >= 1 ? 'var(--amber-bg)' : 'var(--red-bg)';
  };

  const onExport = async () => {
    const rows: (string | number)[][] = [];
    for (const p of people) rows.push([p.id, p.name, p.role, p.calibrated ? 'Selesai' : (PERF_PHASES[phaseIdx(p)] || 'Mulai'), p.perf.toFixed(1), p.pot.toFixed(1), p.box, p.promote === '—' ? 'Pertahankan' : p.promote]);
    await amsExportXlsx({
      kind: 'firm-performance', scope: 'firm',
      fileName: 'Laporan Kalibrasi Kinerja.xlsx',
      firm: 'KAP Wijaya Hartono & Rekan',
      title: `Kalibrasi Kinerja — ${C.cycle}`,
      meta: [`${calibrated}/${people.length} terkalibrasi · rata-rata skor ${avgPerf.toFixed(2)} · ${pendingMgr} menunggu reviu manajer`],
      sheets: [{ name: 'Kalibrasi', columns: ['ID', 'Karyawan', 'Jabatan', 'Tahapan', 'Skor Kinerja', 'Potensi', '9-Box', 'Rekomendasi'], rows, colWidths: [10, 24, 22, 18, 12, 10, 22, 18] }],
    });
  };

  return (
    <>
      <SubBar moduleId="performance" right={<div className="row gap8 ac"><Badge kind="blue">{C.cycle} · {C.phase}</Badge><Btn sm onClick={onExport}><I.download size={13} /> Laporan Kalibrasi</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={calibrated + ' / ' + people.length} label="Terkalibrasi" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={pendingMgr} label="Menunggu Reviu Manajer" accent="var(--amber)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={avgPerf.toFixed(2)} label="Rata-rata Skor Kinerja" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={people.filter((p: any) => p.promote && p.promote !== '—').length} label="Kandidat Promosi" accent="var(--purple)" /></div></Panel>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1.35fr 1fr', gap: 12, alignItems: 'start' }}>
          {/* roster + progress */}
          <Panel noBody>
            <div className="panel-h"><h3>Status Reviu Kinerja</h3><div style={{ flex: 1 }} /><span className="tiny muted">{C.cycle}</span></div>
            <table className="dtbl">
              <thead><tr><th>Karyawan</th><th style={{ width: 180 }}>Tahapan</th><th className="num">Skor</th><th>Penempatan</th></tr></thead>
              <tbody>
                {people.map((p: any) => {
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
                <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 11, color: 'var(--ink-4)', textAlign: 'center', fontWeight: 600, letterSpacing: '.05em' }}>POTENSI →</div>
                <div style={{ flex: 1 }}>
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gridTemplateRows: 'repeat(3,52px)', gap: 4 }}>
                    {[2, 1, 0].map(py => [0, 1, 2].map(px => {
                      const here = people.filter((p: any) => band(p.perf) === px && band(p.pot) === py);
                      return (
                        <div key={py + '-' + px} style={{ background: boxColor(px, py), borderRadius: 6, padding: 4, display: 'flex', flexWrap: 'wrap', gap: 3, alignContent: 'flex-start', border: '1px solid var(--line-soft)' }}>
                          {here.map((p: any) => <span key={p.id} onClick={() => setSel(p.id)} title={p.name} style={{ cursor: 'pointer', outline: p.id === sel ? '2px solid var(--navy)' : 'none', borderRadius: '50%' }}><Avatar name={p.name} size={22} /></span>)}
                        </div>
                      );
                    }))}
                  </div>
                  <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--ink-4)', fontWeight: 600, letterSpacing: '.05em', marginTop: 4 }}>KINERJA →</div>
                </div>
              </div>
            </div>
          </Panel>

          {/* detail */}
          <Panel noBody>
            <div style={{ background: 'linear-gradient(120deg,#013a52,#005085)', color: '#fff', padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
              <Avatar name={person.name} size={42} />
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 15, fontWeight: 700 }} className="truncate">{person.name}</div><div className="tiny" style={{ color: '#bcd6e4' }}>{person.role}</div></div>
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
                    {goals.map((g: any, i: any) => (
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

function RowKvBox({ label, v, accent }: any) {
  return (
    <div className="panel" style={{ padding: '8px 10px', boxShadow: 'none' }}>
      <div className="tiny muted upper" style={{ marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: accent || 'var(--ink)' }}>{v}</div>
    </div>
  );
}



/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { LeaveAttendance, Performance, RowKvBox };
