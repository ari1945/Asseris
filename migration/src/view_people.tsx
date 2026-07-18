/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAmsPersist, useAuth, useNav } from './contexts';
import { CAP } from './rbac';
import { I } from './icons';
import { SubBar } from './shell';
import { AccessDenied, Avatar, Badge, Btn, Donut, Panel, Seg, Stat, Tabs } from './ui';
import { KvBox } from './view_analytical';
import { FeeDependencyTab, LongAssociationTab, NASPreApprovalTab } from './view_independence_parts';
import { HCMAnalytics, Profile360Drawer } from './view_pc_hcm';
import { rotTier } from './data_licensing';
import { cpeFromTraining, type TrainingCourse } from './cpe_training';

/* ============================================================
   Asseris — HCM + CPE/PPL Tracker + Independence (Package E)
   ============================================================ */
const { useState: useStateE, useMemo: useMemoE } = React;

/* ---------------- HCM (People) ---------------- */
const GRADE_ORDER = ['Partner', 'Manager', 'Senior', 'Junior'];
const GRADE_COLOR = { Partner: '#002C3F', Manager: '#005085', Senior: '#0a6b73', Junior: '#5b3fa6' };

function HCM() {
  const { fmt } = AMS;
  const nav = useNav();
  const authHcm = useAuth();
  const [extra, setExtra] = useAmsPersist('staffExtra', []);
  const staff = [...extra, ...AMS.STAFF];
  const [sel, setSel] = useStateE((AMS.STAFF as any)[3].id);
  const [q, setQ] = useStateE('');
  const [grade, setGrade] = useStateE('All');
  const [showNew, setShowNew] = useStateE(false);
  const [mode, setMode] = useStateE('direktori');
  const [drawer, setDrawer] = useStateE(null);
  const addStaff = (s: any) => { setExtra((list: any) => [{ id: 'EMP-' + String(100 + list.length).padStart(3, '0'), engagements: 0, rating: 4.0, util: 0, status: 'Aktif', joined: 2026, ...s }, ...list]); };

  const filtered = staff.filter(s => (grade === 'All' || s.grade === grade) && (q === '' || s.name.toLowerCase().includes(q.toLowerCase())));
  const person = staff.find(s => s.id === sel) || staff[0];
  const counts = GRADE_ORDER.map(g => ({ g, n: staff.filter(s => s.grade === g).length }));
  const avgUtil = Math.round(staff.reduce((s, p) => s + p.util, 0) / staff.length);
  const tenure = 2026 - person.joined;

  const apprais = [
    ['Kualitas teknis audit', Math.min(5, person.rating + 0.1)],
    ['Kepemimpinan & supervisi', person.rating - 0.2],
    ['Manajemen waktu & deadline', person.rating],
    ['Komunikasi klien', person.rating - 0.1],
  ];

  // 2026-07-06 — Human Capital = direktori & profil detail seluruh staf: kewenangan Partner + HRD (HR_MODULE_VIEW).
  if (!(authHcm && typeof authHcm.can === 'function' && authHcm.can(CAP.HR_MODULE_VIEW))) return (<><SubBar moduleId="hcm" /><AccessDenied moduleId="hcm" /></>);

  return (
    <>
      <SubBar moduleId="hcm" right={<div className="row gap8 ac"><Seg options={[{ value: 'direktori', label: 'Direktori' }, { value: 'analitik', label: 'Analitik' }]} value={mode} onChange={setMode} /><Badge kind="blue">{staff.length} karyawan</Badge><Btn sm><I.download size={13} /> Direktori</Btn><Btn sm variant="primary" onClick={() => setShowNew(true)}><I.plus size={14} /> Karyawan Baru</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        {mode === 'analitik' ? <HCMAnalytics /> : (<>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={staff.length} label="Total SDM" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={staff.filter(s => s.grade === 'Partner').length} label="Partner" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={avgUtil + '%'} label="Rata-rata Utilisasi" accent={avgUtil > 85 ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={staff.filter(s => s.status === 'Cuti').length} label="Sedang Cuti" /></div></Panel>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: 12, alignItems: 'start' }}>
          <Panel noBody>
            <div className="panel-h"><h3>Direktori Karyawan</h3><div style={{ flex: 1 }} /><div className="global-search" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', height: 26, maxWidth: 170 }}><I.search2 size={13} style={{ color: 'var(--ink-4)' }} /><input style={{ color: 'var(--ink)' }} placeholder="Cari…" value={q} onChange={(e: any) => setQ(e.target.value)} /></div><Seg options={['All', ...GRADE_ORDER]} value={grade} onChange={setGrade} /></div>
            <table className="dtbl">
              <thead><tr><th>Karyawan</th><th>Jabatan</th><th>Sertifikasi</th><th className="num">Utilisasi</th><th className="num">Rating</th><th>Status</th></tr></thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} className={s.id === sel ? 'sel' : ''} onClick={() => setSel(s.id)} style={{ cursor: 'pointer' }}>
                    <td><div className="row ac gap8"><Avatar name={s.name} size={28} /><div style={{ minWidth: 0 }}><div className="truncate" style={{ fontWeight: 600 }}>{s.name}</div><div className="tiny muted mono">{s.id}</div></div></div></td>
                    <td><span className="badge" style={{ background: (GRADE_COLOR as any)[s.grade] + '1a', color: (GRADE_COLOR as any)[s.grade] }}>{s.grade}</span></td>
                    <td className="tiny muted">{s.cert}</td>
                    <td className="num"><span style={{ color: s.util > 92 ? 'var(--red)' : s.util > 85 ? 'var(--amber)' : 'var(--green)' }}>{s.util}%</span></td>
                    <td className="num mono">{s.rating.toFixed(1)}</td>
                    <td><Badge kind={s.status === 'Aktif' ? 'green' : 'amber'}>{s.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <Panel noBody>
            <div style={{ background: 'linear-gradient(120deg,#013a52,#005085)', color: '#fff', padding: '16px 18px', display: 'flex', gap: 13, alignItems: 'center' }}>
              <Avatar name={person.name} size={48} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }} className="truncate">{person.name}</div>
                <div className="tiny" style={{ color: '#bcd6e4' }}>{person.role} · {person.cert}</div>
              </div>
              <Badge kind={person.status === 'Aktif' ? 'green' : 'amber'}>{person.status}</Badge>
            </div>
            <div style={{ padding: 14 }}>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <KvBox label="ID Karyawan" v={person.id} />
                <KvBox label="Masa Kerja" v={tenure + ' tahun (sejak ' + person.joined + ')'} />
                <KvBox label="Engagement Aktif" v={person.engagements} />
                <KvBox label="Rating Kinerja" v={person.rating.toFixed(1) + ' / 5'} accent={person.rating >= 4.3 ? 'var(--green)' : 'var(--amber)'} />
              </div>
              <div className="tiny muted upper" style={{ marginBottom: 8 }}>Penilaian Kinerja Terakhir</div>
              <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
                {apprais.map(([l, v]) => (
                  <div key={l}>
                    <div className="row jb tiny" style={{ marginBottom: 2 }}><span>{l}</span><span className="mono" style={{ fontWeight: 700 }}>{v.toFixed(1)}</span></div>
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: (v / 5 * 100) + '%', height: '100%', borderRadius: 3, background: v >= 4.3 ? 'var(--green)' : v >= 3.5 ? 'var(--blue)' : 'var(--amber)' }} /></div>
                  </div>
                ))}
              </div>
              <div className="row gap8">
                <Btn sm variant="primary" style={{ flex: 1 }} onClick={() => setDrawer(person)}><I.users size={13} /> Profil 360°</Btn>
                <Btn sm style={{ flex: 1 }} onClick={() => nav('cpe')}><I.book size={13} /> CPE/PPL</Btn>
              </div>
            </div>
          </Panel>
        </div>
        </>)}
      </div></div>
      {showNew && <StaffForm onClose={() => setShowNew(false)} onAdd={(s: any) => { addStaff(s); setShowNew(false); }} />}
      {drawer && <Profile360Drawer s={drawer} onClose={() => setDrawer(null)} />}
    </>
  );
}

function StaffForm({ onClose, onAdd }: any) {
  const [d, setD] = useStateE({ name: '', role: 'Junior Auditor', grade: 'Junior', cert: 'S.Ak', email: '' });
  const set = (k: any, v: any) => setD((s: any) => ({ ...s, [k]: v }));
  const valid = d.name.trim();
  const ROLE_BY_GRADE = { Partner: 'Engagement Partner', Manager: 'Audit Manager', Senior: 'Senior Auditor', Junior: 'Junior Auditor' };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.4)', zIndex: 90, display: 'grid', placeItems: 'center' }} onClick={onClose}>
      <div className="panel" style={{ width: 500, maxWidth: '94vw', boxShadow: 'var(--shadow-lg)' }} onClick={(e: any) => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, borderRadius: '4px 4px 0 0' }}>
          <I.users size={18} /><div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>Karyawan Baru</div><div className="tiny" style={{ color: '#bcd6e4' }}>Tambah ke direktori SDM</div></div>
          <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>
        <div style={{ padding: 16, display: 'grid', gap: 12 }}>
          <div className="field"><label>Nama Lengkap</label><input className="input" value={d.name} onChange={(e: any) => set('name', e.target.value)} placeholder="Nama karyawan" /></div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field"><label>Jenjang</label><select className="select" value={d.grade} onChange={(e: any) => set('grade', e.target.value)}>{['Partner', 'Manager', 'Senior', 'Junior'].map(g => <option key={g}>{g}</option>)}</select></div>
            <div className="field"><label>Sertifikasi</label><input className="input" value={d.cert} onChange={(e: any) => set('cert', e.target.value)} placeholder="CPA / CA / S.Ak" /></div>
          </div>
          <div className="field"><label>Email</label><input className="input" value={d.email} onChange={(e: any) => set('email', e.target.value)} placeholder="nama@whr-cpa.id" /></div>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn onClick={onClose}>Batal</Btn>
          <Btn variant="primary" disabled={!valid} style={{ opacity: valid ? 1 : .5 }} onClick={() => onAdd({ ...d, role: (ROLE_BY_GRADE as any)[d.grade] })}><I.check size={14} /> Tambah Karyawan</Btn>
        </div>
      </div>
    </div>
  );
}

/* ---------------- CPE/PPL Tracker ---------------- */
function CPETracker() {
  const { fmt } = AMS;
  const nav = useNav();
  const auth = useAuth();
  const staff: any = AMS.STAFF, req: any = AMS.CPE_REQ;
  const [extraLog, setExtraLog] = useAmsPersist('cpeExtra', {});
  // 2026-07-05 — cpeLog (kredit SKP dasar) & cpeExtra ter-filter server (personal.get).
  const [cpeLog] = useAmsPersist('cpeLog', () => AMS.CPE_LOG);
  const [attendance] = useAmsPersist('trainingAttendance.v1', () => ({}));
  const [sel, setSel] = useStateE('EMP-007');
  const [showNew, setShowNew] = useStateE(false);
  /* #1/#2 — kredit SKP otomatis dari pelatihan yang kehadirannya dikonfirmasi (SSOT cpeFromTraining). */
  const trainingByEmp = cpeFromTraining(AMS.TRAINING_CATALOG as TrainingCourse[], attendance);
  // Firm-view → seluruh roster; selain itu batasi ke id yang datanya benar-benar diterima
  // (unit/self) agar tabel tak menampilkan baris orang lain (data nilai sudah ter-filter server).
  const canFirm = !!(auth && typeof auth.can === 'function' && auth.can(CAP.PERSONAL_CPE_VIEW_FIRM));
  const scopedIds = new Set<string>([...Object.keys(cpeLog || {}), ...Object.keys(extraLog || {})]);
  const vstaff = canFirm ? staff : staff.filter((s: any) => scopedIds.has(s.id));
  const log = (() => { const m = {}; vstaff.forEach((s: any) => { (m as any)[s.id] = [...(extraLog[s.id] || []), ...(trainingByEmp[s.id] || []), ...(((cpeLog as any)[s.id]) || [])]; }); return m; })();
  const addSkp = (id: any, rec: any) => setExtraLog((l: any) => ({ ...l, [id]: [{ ...rec, date: '2026-03-09' }, ...(l[id] || [])] }));

  const summary = vstaff.map((s: any) => {
    const recs = (log as any)[s.id] || [];
    const structured = recs.filter((r: any) => r.type === 'Terstruktur').reduce((a: any, r: any) => a + r.skp, 0);
    const total = recs.reduce((a: any, r: any) => a + r.skp, 0);
    const compliant = total >= req.annual && structured >= req.structured;
    return { ...s, structured, total, compliant, recs };
  });
  const compliantN = summary.filter((s: any) => s.compliant).length;
  const atRisk = summary.filter((s: any) => !s.compliant && s.total < req.annual * 0.5).length;
  const person = summary.find((s: any) => s.id === sel) || summary[0];
  // Guard: data ter-filter bisa kosong (peran self-only tanpa catatan SKP tersimpan).
  if (!person) return (<><SubBar moduleId="cpe" /><div className="view-scroll"><div className="view-pad"><Panel><div style={{ padding: 28, textAlign: 'center' }} className="tiny muted">Belum ada catatan PPL/SKP yang dapat Anda lihat. Lihat data PPL Anda sendiri di modul <b>Data Personal Saya</b>.</div></Panel></div></div></>);

  return (
    <>
      <SubBar moduleId="cpe" right={<div className="row gap8 ac"><Badge kind="blue">PPL {req.year} · {req.annual} SKP</Badge><Btn sm variant="primary" onClick={() => setShowNew(true)}><I.plus size={14} /> Catat SKP</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={`${compliantN}/${vstaff.length}`} label="Memenuhi PPL" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={req.annual + ' SKP'} label="Syarat Tahunan" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={req.structured + ' SKP'} label="Min. Terstruktur" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={atRisk} label="Berisiko Tidak Memenuhi" accent="var(--red)" /></div></Panel>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr', gap: 12, alignItems: 'start' }}>
          <Panel noBody>
            <div className="panel-h"><h3>Status PPL per Karyawan</h3><div style={{ flex: 1 }} /><span className="tiny muted">tahun {req.year}</span></div>
            <table className="dtbl">
              <thead><tr><th>Karyawan</th><th className="num">Terstruktur</th><th className="num">Total SKP</th><th style={{ width: 140 }}>Progress</th><th>Status</th></tr></thead>
              <tbody>
                {summary.map((s: any) => (
                  <tr key={s.id} className={s.id === sel ? 'sel' : ''} onClick={() => setSel(s.id)} style={{ cursor: 'pointer' }}>
                    <td><div className="row ac gap8"><Avatar name={s.name} size={24} /><span style={{ fontWeight: 600 }} className="truncate">{s.name}</span></div></td>
                    <td className="num mono" style={{ color: s.structured >= req.structured ? 'var(--green)' : 'var(--amber)' }}>{s.structured}/{req.structured}</td>
                    <td className="num mono" style={{ fontWeight: 600 }}>{s.total}/{req.annual}</td>
                    <td><div style={{ height: 7, borderRadius: 4, background: 'var(--surface-3)' }}><div style={{ width: Math.min(100, s.total / req.annual * 100) + '%', height: '100%', borderRadius: 4, background: s.compliant ? 'var(--green)' : s.total >= req.annual * 0.5 ? 'var(--amber)' : 'var(--red)' }} /></div></td>
                    <td>{s.compliant ? <Badge kind="green">Memenuhi</Badge> : <Badge kind={s.total >= req.annual * 0.5 ? 'amber' : 'red'}>{Math.round(s.total / req.annual * 100)}%</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <Panel noBody>
            <div style={{ background: 'var(--surface-2)', padding: '15px 18px', borderBottom: '1px solid var(--line)' }} className="row ac gap8">
              <Avatar name={person.name} size={28} />
              <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 13 }}>{person.name}</div><div className="tiny muted">{person.role}</div></div>
              {person.compliant ? <Badge kind="green">Memenuhi</Badge> : <Badge kind="amber">Kurang {Math.max(0, req.annual - person.total)} SKP</Badge>}
            </div>
            <div style={{ padding: 14 }}>
              <div className="row gap12" style={{ marginBottom: 14 }}>
                <Donut segments={[{ value: person.structured, color: '#005085' }, { value: Math.max(0, person.total - person.structured), color: '#0a6b73' }, { value: Math.max(0, req.annual - person.total), color: '#e7ebef' }]} size={92} thickness={13}
                  center={<><div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)' }}>{person.total}</div><div className="tiny muted">SKP</div></>} />
                <div style={{ flex: 1, display: 'grid', gap: 5, alignContent: 'center' }}>
                  <div className="row jb tiny"><span className="row ac gap6"><span style={{ width: 8, height: 8, borderRadius: 2, background: '#005085' }} />Terstruktur</span><b className="mono">{person.structured}</b></div>
                  <div className="row jb tiny"><span className="row ac gap6"><span style={{ width: 8, height: 8, borderRadius: 2, background: '#0a6b73' }} />Tidak terstruktur</span><b className="mono">{person.total - person.structured}</b></div>
                  <div className="row jb tiny"><span className="row ac gap6"><span style={{ width: 8, height: 8, borderRadius: 2, background: '#e7ebef' }} />Kurang</span><b className="mono">{Math.max(0, req.annual - person.total)}</b></div>
                </div>
              </div>
              <div className="tiny muted upper" style={{ marginBottom: 6 }}>Riwayat SKP {req.year}</div>
              <div style={{ display: 'grid', gap: 0 }}>
                {person.recs.length ? person.recs.map((r: any, i: any) => (
                  <div key={i} className="row ac jb" style={{ padding: '7px 0', borderBottom: i < person.recs.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                    <div style={{ minWidth: 0 }}><div className="row ac gap6"><span style={{ fontSize: 12, fontWeight: 600 }} className="truncate">{r.t}</span>{r.src === 'training' && <Badge kind="teal"><I.flask size={9} /> Pelatihan</Badge>}</div><div className="tiny muted">{new Date(r.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} · {r.type}</div></div>
                    <span className="mono" style={{ fontWeight: 700 }}>{r.skp} SKP</span>
                  </div>
                )) : <div className="tiny muted" style={{ padding: 12, textAlign: 'center' }}>Belum ada SKP tercatat tahun ini.</div>}
              </div>
              {!person.compliant && <div className="panel" style={{ marginTop: 12, padding: '9px 11px', background: 'var(--amber-bg)', borderColor: 'transparent' }}><div className="tiny" style={{ fontWeight: 600, lineHeight: 1.4 }}>Perlu tambahan {Math.max(0, req.annual - person.total)} SKP ({Math.max(0, req.structured - person.structured)} terstruktur) sebelum akhir tahun untuk memenuhi PPL IAPI.</div></div>}
              <div className="row gap8" style={{ marginTop: 12 }}>
                <Btn sm variant="primary" style={{ flex: 1 }} onClick={() => setShowNew(true)}><I.plus size={13} /> Catat SKP</Btn>
                <Btn sm style={{ flex: 1 }} onClick={() => nav('learning')}><I.flask size={13} /> Cari Pelatihan</Btn>
              </div>
            </div>
          </Panel>
        </div>
      </div></div>
      {showNew && <SkpForm staff={vstaff.length ? vstaff : staff} onClose={() => setShowNew(false)} onAdd={(id: any, rec: any) => { addSkp(id, rec); setShowNew(false); }} />}
    </>
  );
}

function SkpForm({ staff, onClose, onAdd }: any) {
  const [d, setD] = useStateE({ id: 'EMP-007', t: '', type: 'Terstruktur', skp: 4 });
  const set = (k: any, v: any) => setD((s: any) => ({ ...s, [k]: v }));
  const valid = d.t.trim() && +d.skp > 0;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.4)', zIndex: 90, display: 'grid', placeItems: 'center' }} onClick={onClose}>
      <div className="panel" style={{ width: 460, maxWidth: '94vw', boxShadow: 'var(--shadow-lg)' }} onClick={(e: any) => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, borderRadius: '4px 4px 0 0' }}>
          <I.book size={18} /><div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>Catat SKP (PPL)</div><div className="tiny" style={{ color: '#bcd6e4' }}>Tambah satuan kredit pendidikan profesional</div></div>
          <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>
        <div style={{ padding: 16, display: 'grid', gap: 12 }}>
          <div className="field"><label>Karyawan</label><select className="select" value={d.id} onChange={(e: any) => set('id', e.target.value)}>{staff.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div className="field"><label>Kegiatan / Pelatihan</label><input className="input" value={d.t} onChange={(e: any) => set('t', e.target.value)} placeholder="mis. Workshop SA Terkini IAPI" /></div>
          <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 10 }}>
            <div className="field"><label>Jenis</label><select className="select" value={d.type} onChange={(e: any) => set('type', e.target.value)}>{['Terstruktur', 'Tidak Terstruktur'].map(s => <option key={s}>{s}</option>)}</select></div>
            <div className="field"><label>SKP</label><input className="input mono" type="number" value={d.skp} onChange={(e: any) => set('skp', +e.target.value)} style={{ textAlign: 'right' }} /></div>
          </div>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn onClick={onClose}>Batal</Btn>
          <Btn variant="primary" disabled={!valid} style={{ opacity: valid ? 1 : .5 }} onClick={() => onAdd(d.id, { t: d.t, type: d.type, skp: +d.skp })}><I.check size={14} /> Catat SKP</Btn>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Independence & Rotation ---------------- */
function Independence() {
  const nav = useNav();
  const auth = useAuth();
  const me: string = (auth && auth.user && auth.user.name) || 'Auditor';
  const [data, setData] = useAmsPersist('independence', () => AMS.INDEPENDENCE);
  const declared = data.filter((d: any) => d.declared).length;
  const conflicts = data.reduce((s: any, d: any) => s + d.conflicts, 0);
  const rotationDue = data.filter((d: any) => d.tenure >= d.rotationLimit).length;
  const rotationWarn = data.filter((d: any) => d.tenure >= d.rotationLimit - 1 && d.tenure < d.rotationLimit).length;
  /* jendela peringatan dini ≤6 bulan sebelum batas (SSOT rotTier) */
  type RotRow = { name: string; rotationClient?: string; tenure: number; rotationLimit: number };
  const rotationAlertList = (data as RotRow[]).filter((d) => d.rotationClient !== '—' && rotTier(d.tenure, d.rotationLimit) === 'alert');
  const toggle = (id: any) => setData((list: any) => list.map((d: any) => d.id === id ? { ...d, declared: !d.declared } : d));
  const [sel, setSel] = useStateE(null);
  /* indepAppr: per-orang jejak persetujuan. Bentuk lama = number (level saja);
     bentuk baru = { level, steps:[{by,at}], period } agar AUDITABLE (siapa &
     kapan tiap lapis: self → reviu manajer etika → persetujuan partner). */
  const [appr, setAppr] = useAmsPersist('indepAppr', {});
  const indepToday = (() => { try { return new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); } catch (e) { return ''; } })();
  const lvlOf = (d: { id: string; declared: boolean }): number => {
    const a = (appr as Record<string, unknown>)[d.id];
    if (a == null) return d.declared ? 3 : 0;
    return typeof a === 'number' ? a : (((a as { level?: number }).level) ?? 0);
  };
  const recOf = (id: string): { level: number; steps: Array<{ by: string; at: string } | undefined>; period: string } => {
    const a = (appr as Record<string, unknown>)[id];
    if (a && typeof a === 'object') return a as { level: number; steps: Array<{ by: string; at: string } | undefined>; period: string };
    return { level: typeof a === 'number' ? a : 0, steps: [], period: INDEP_PERIOD };
  };
  const setApprove = (id: string, n: number) => setAppr((a: Record<string, unknown>) => {
    const cur = a[id] as { steps?: Array<{ by: string; at: string } | undefined> } | number | undefined;
    if (n === 0) return { ...a, [id]: { level: 0, steps: [], period: INDEP_PERIOD } };
    const steps = (cur && typeof cur === 'object' && Array.isArray(cur.steps)) ? cur.steps.slice() : [];
    steps[n - 1] = { by: me, at: indepToday };
    return { ...a, [id]: { level: n, steps, period: INDEP_PERIOD } };
  });
  /* Q-03b — register ancaman & pengamanan (editable + jejak mitigasi). */
  const [threats, setThreats] = useAmsPersist('indepThreats', () => seedIndepThreats(AMS.INDEPENDENCE as Array<{ id: string; conflicts: number; finInterest: string }>));
  const addThreat = (personId: string) => setThreats((list: Array<{ id: string }>) => [...list, {
    id: 'TH-' + personId + '-' + (list.length + 1), personId, type: THREAT_TYPES[0], desc: '',
    severity: 'Sedang', safeguard: '', status: 'Terbuka', by: '', at: '',
  }]);
  const updateThreat = (id: string, patch: Record<string, string>) =>
    setThreats((list: Array<{ id: string }>) => list.map((t) => t.id === id ? { ...t, ...patch } : t));
  const signThreat = (id: string) =>
    setThreats((list: Array<{ id: string }>) => list.map((t) => t.id === id ? { ...t, status: 'Dimitigasi', by: me, at: indepToday } : t));
  /* Q-03c — pengakuan rotasi & cooling-off + tindak lanjut. */
  const [rotAck, setRotAck] = useAmsPersist('indepRotAck', {});
  const ackRotation = (id: string, action: string) =>
    setRotAck((m: Record<string, unknown>) => ({ ...m, [id]: { acknowledged: true, action, by: me, at: indepToday } }));
  const curr = sel ? data.find((d: any) => d.id === sel) : null;
  const [itab, setItab] = useStateE('rotasi');
  const itabs = [{ id: 'rotasi', label: 'Deklarasi & Rotasi' }, { id: 'fee', label: 'Ketergantungan Imbalan' }, { id: 'nas', label: 'Pra-Persetujuan NAS' }, { id: 'longassoc', label: 'Asosiasi Jangka Panjang' }];

  return (
    <>
      <SubBar moduleId="independence" right={<div className="row gap8 ac"><Badge kind="blue">Kode Etik IAPI · IESBA</Badge><Btn sm><I.send size={13} /> Minta Deklarasi</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div style={{ marginBottom: 12 }}><Tabs tabs={itabs} active={itab} onChange={setItab} /></div>
        {itab === 'fee' && <FeeDependencyTab />}
        {itab === 'nas' && <NASPreApprovalTab />}
        {itab === 'longassoc' && <LongAssociationTab />}
        {itab === 'rotasi' && (<>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={`${declared}/${data.length}`} label="Deklarasi Diterima" accent={declared === data.length ? 'var(--green)' : 'var(--amber)'} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={conflicts} label="Konflik Teridentifikasi" accent={conflicts ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={rotationDue} label="Rotasi Wajib" accent={rotationDue ? 'var(--red)' : 'var(--green)'} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={rotationWarn} label="Rotasi Tahun Depan" accent="var(--amber)" /></div></Panel>
        </div>

        {rotationDue > 0 && (
          <div className="panel" style={{ padding: '15px 18px', marginBottom: 12, background: 'var(--red-bg)', borderColor: 'transparent' }}>
            <div className="row ac gap8"><span style={{ color: 'var(--red)' }}><I.alert size={17} /></span><span style={{ fontSize: 12.5, fontWeight: 600 }}>Rotasi partner wajib: <b>{data.filter((d: any) => d.tenure >= d.rotationLimit).map((d: any) => d.name.split(' ')[0]).join(', ')}</b> telah mencapai batas {data.find((d: any) => d.tenure >= d.rotationLimit)?.rotationLimit} tahun pada emiten — tunjuk partner pengganti (UU 5/2011 & POJK 13/2017).</span></div>
          </div>
        )}

        {rotationAlertList.length > 0 && (
          <div className="panel" style={{ padding: '15px 18px', marginBottom: 12, background: 'var(--amber-bg)', borderColor: 'transparent' }}>
            <div className="row ac gap8"><span style={{ color: 'var(--amber)' }}><I.alert size={17} /></span><span style={{ fontSize: 12.5, fontWeight: 600 }}>Peringatan dini rotasi (≤6 bulan): <b>{rotationAlertList.map((d) => d.name.split(' ')[0]).join(', ')}</b> memasuki jendela 6 bulan sebelum batas rotasi pada emiten — mulai perencanaan transisi & cooling-off partner pengganti sekarang (POJK 13/2017 · PP 20/2015).</span></div>
          </div>
        )}

        <Panel noBody>
          <div className="panel-h"><h3>Register Independensi & Rotasi Partner</h3><div style={{ flex: 1 }} /><span className="tiny muted">klik baris untuk alur persetujuan</span></div>
          <table className="dtbl">
            <thead><tr><th>Partner / Staf</th><th>Deklarasi Tahunan</th><th>Alur Persetujuan</th><th className="num">Konflik</th><th>Klien (rotasi)</th><th className="num" style={{ width: 130 }}>Masa Tugas</th></tr></thead>
            <tbody>
              {data.map((d: any) => {
                const rotPct = d.tenure / d.rotationLimit * 100;
                const rotCol = d.tenure >= d.rotationLimit ? 'var(--red)' : d.tenure >= d.rotationLimit - 1 ? 'var(--amber)' : 'var(--green)';
                const lvl = lvlOf(d);
                const STEPS = ['Belum', 'Diajukan', 'Direviu', 'Disetujui'];
                return (
                  <tr key={d.id} className={d.id === sel ? 'sel' : ''} onClick={() => setSel(d.id)} style={{ cursor: 'pointer' }}>
                    <td><div className="row ac gap8"><Avatar name={d.name} size={24} /><span style={{ fontWeight: 600 }}>{d.name}</span></div></td>
                    <td><span onClick={(e: any) => { e.stopPropagation(); toggle(d.id); }} style={{ cursor: 'pointer' }}>{d.declared ? <Badge kind="green"><I.check size={10} /> Diterima</Badge> : <Badge kind="red">Belum</Badge>}</span></td>
                    <td><div className="row ac gap4">{[1, 2, 3].map(i => <span key={i} title={STEPS[i]} style={{ width: 22, height: 5, borderRadius: 3, background: i <= lvl ? 'var(--green)' : 'var(--surface-3)' }} />)}<span className="tiny muted" style={{ marginLeft: 4 }}>{STEPS[lvl]}</span></div></td>
                    <td className="num">{d.conflicts ? <Badge kind="amber">{d.conflicts}</Badge> : <span className="muted">0</span>}</td>
                    <td className="tiny">{d.rotationClient === '—' ? <span className="muted">—</span> : <span className="row ac gap4">{d.rotationClient.replace('PT ', '')}{d.listed && <span className="badge b-blue" style={{ fontSize: 8, padding: '0 4px' }}>IDX</span>}</span>}</td>
                    <td>
                      {d.rotationClient === '—' ? <span className="muted tiny">n/a</span> : (
                        <div className="row ac gap8">
                          <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: Math.min(100, rotPct) + '%', height: '100%', borderRadius: 3, background: rotCol }} /></div>
                          <span className="mono tiny" style={{ fontWeight: 700, color: rotCol }}>{d.tenure}/{d.rotationLimit}th</span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
        <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>Ambang rotasi AP terdiferensiasi per rezim: <b>5 tahun</b> berturut-turut untuk entitas kepentingan publik (PIE) umum (PP 20/2015 Ps. 11) dan <b>3 tahun</b> untuk entitas <b>sektor jasa keuangan</b> — bank, asuransi, pembiayaan (POJK 13/POJK.03/2017). Cooling-off minimal <b>2 tahun</b>; KAP tidak dibatasi. Dimensi etika lain (ketergantungan imbalan, pra-persetujuan NAS, asosiasi jangka panjang) dipantau pada tab terpisah.</div>
        </>)}
      </div></div>
      {curr && <IndepDrawer d={curr} lvl={lvlOf(curr)} rec={recOf(curr.id)} period={INDEP_PERIOD}
        threats={(threats as IndepThreat[]).filter((t) => t.personId === curr.id)}
        onAddThreat={() => addThreat(curr.id)} onUpdateThreat={updateThreat} onSignThreat={signThreat}
        rotAck={(rotAck as Record<string, RotAck>)[curr.id]} onAckRotation={(action: string) => ackRotation(curr.id, action)}
        onApprove={(n: number) => setApprove(curr.id, n)} onDeclare={() => toggle(curr.id)} onClose={() => setSel(null)} />}
    </>
  );
}

/* Periode deklarasi independensi berjalan (tahun audit). Sumber tunggal label
   periode untuk register & drawer; jejak persetujuan distempel periode ini. */
const INDEP_PERIOD = 'TA 2026';
/* Kategori ancaman independensi (IESBA 120) + tingkat keparahan. */
const THREAT_TYPES = ['Kepentingan pribadi', 'Telaah pribadi', 'Advokasi', 'Kedekatan', 'Intimidasi'];
const THREAT_SEV = ['Tinggi', 'Sedang', 'Rendah'];
type IndepThreat = { id: string; personId: string; type: string; desc: string; severity: string; safeguard: string; status: string; by: string; at: string };
type RotAck = { acknowledged?: boolean; action?: string; by?: string; at?: string };
const sevVar = (s: string): string => s === 'Tinggi' ? 'red' : s === 'Sedang' ? 'amber' : 'green';
/* Seed register ancaman/pengamanan dari konflik terdeklarasi (INDEPENDENCE). */
const seedIndepThreats = (rows: Array<{ id: string; conflicts: number; finInterest: string }>) =>
  rows.filter(r => r.conflicts > 0).map(r => ({
    id: 'TH-' + r.id, personId: r.id, type: 'Kedekatan', desc: r.finInterest,
    severity: 'Sedang', safeguard: 'Pengamanan diterapkan & didokumentasikan (telaah independen).',
    status: 'Dimitigasi', by: '', at: '',
  }));
const INDEP_Q = [
  'Tidak memiliki kepentingan keuangan langsung/tidak langsung yang material pada klien.',
  'Tidak ada hubungan keluarga dekat pada posisi kunci di klien.',
  'Tidak ada pinjaman/jaminan dengan klien di luar kondisi normal.',
  'Tidak memberikan jasa non-asurans yang dilarang pada klien audit.',
  'Imbalan tidak bergantung pada hasil (contingent fee).',
  'Tidak ada ancaman kedekatan/intimidasi yang tidak dapat dimitigasi.',
];
const INDEP_CHAIN = [
  { role: 'Personel — Deklarasi mandiri', who: 'Diri sendiri' },
  { role: 'Reviu Manajer Etika', who: 'Anindya Pramesti' },
  { role: 'Persetujuan Ethics & Independence Partner', who: 'Sari Dewanti, CPA' },
];

function IndepDrawer({ d, lvl, rec, period, threats, onAddThreat, onUpdateThreat, onSignThreat, rotAck, onAckRotation, onApprove, onDeclare, onClose }: any) {
  const steps = (rec && rec.steps) || [];
  const per = period || INDEP_PERIOD;
  const tlist: IndepThreat[] = threats || [];
  const rotRelevant = d.rotationClient !== '—' && d.tenure >= d.rotationLimit - 1;
  const [rotDraft, setRotDraft] = useStateE('');
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.4)', zIndex: 90, display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
      <div className="panel" style={{ width: 480, maxWidth: '95vw', height: '100%', borderRadius: 0, display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' }} onClick={(e: any) => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, flex: '0 0 auto' }}>
          <Avatar name={d.name} size={42} />
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14.5, fontWeight: 700 }} className="truncate">{d.name}</div><div className="tiny" style={{ color: '#bcd6e4' }}>Deklarasi Independensi · {per}</div></div>
          <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 18 }}>
          <div className="tiny muted upper" style={{ marginBottom: 8 }}>Kuesioner Independensi (SA 220 · Kode Etik IAPI)</div>
          <div style={{ display: 'grid', gap: 7, marginBottom: 18 }}>
            {INDEP_Q.map((q, i) => (
              <div key={i} className="row gap8" style={{ padding: '8px 11px', border: '1px solid var(--line-soft)', borderRadius: 8, alignItems: 'flex-start' }}>
                <span style={{ flex: '0 0 auto', marginTop: 1, color: d.declared ? 'var(--green)' : 'var(--ink-4)' }}>{d.declared ? <I.check size={14} /> : <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 4, border: '1.5px solid var(--line-strong)' }} />}</span>
                <span style={{ fontSize: 12, lineHeight: 1.4 }}>{q}</span>
              </div>
            ))}
          </div>

          {/* Q-03b — Register ancaman & pengamanan (IESBA 120): editable + jejak mitigasi */}
          <div className="row jb ac" style={{ marginBottom: 8 }}>
            <span className="tiny muted upper">Ancaman & Pengamanan (IESBA 120)</span>
            <button className="btn sm" onClick={onAddThreat}><I.plus size={12} /> Tambah</button>
          </div>
          <div style={{ display: 'grid', gap: 8, marginBottom: 18 }}>
            {tlist.length === 0 && <div className="tiny muted">Tidak ada ancaman tercatat untuk personel ini.</div>}
            {tlist.map((t) => (
              <div key={t.id} className="panel" style={{ padding: '10px 12px', boxShadow: 'none', borderLeft: '3px solid var(--' + sevVar(t.severity) + ')' }}>
                <div className="row gap6" style={{ marginBottom: 6 }}>
                  <select className="select" value={t.type} onChange={(e: { target: { value: string } }) => onUpdateThreat(t.id, { type: e.target.value })} style={{ flex: 1 }}>
                    {THREAT_TYPES.map(x => <option key={x} value={x}>{x}</option>)}
                  </select>
                  <select className="select" value={t.severity} onChange={(e: { target: { value: string } }) => onUpdateThreat(t.id, { severity: e.target.value })} style={{ width: 104 }}>
                    {THREAT_SEV.map(x => <option key={x} value={x}>{x}</option>)}
                  </select>
                </div>
                <input className="input" value={t.desc} placeholder="Uraian ancaman" onChange={(e: { target: { value: string } }) => onUpdateThreat(t.id, { desc: e.target.value })} style={{ width: '100%', marginBottom: 6 }} />
                <textarea className="input" value={t.safeguard} placeholder="Pengamanan yang diterapkan" onChange={(e: { target: { value: string } }) => onUpdateThreat(t.id, { safeguard: e.target.value })} style={{ width: '100%', height: 44, resize: 'vertical', marginBottom: 6 }} />
                <div className="row jb ac">
                  {t.status === 'Dimitigasi'
                    ? <span className="tiny" style={{ color: 'var(--green)', fontWeight: 600 }}><I.check size={11} /> Dimitigasi{t.by ? ' · ' + t.by + ' · ' + t.at : ''}</span>
                    : <Badge kind="amber">Terbuka</Badge>}
                  {t.status === 'Dimitigasi'
                    ? <button className="btn sm" onClick={() => onUpdateThreat(t.id, { status: 'Terbuka', by: '', at: '' })}><I.sync size={11} /> Buka</button>
                    : <Btn sm variant={t.safeguard.trim() ? 'primary' : ''} disabled={!t.safeguard.trim()} onClick={() => onSignThreat(t.id)}><I.check size={12} /> Tandai dimitigasi</Btn>}
                </div>
              </div>
            ))}
          </div>

          {/* Q-03c — Pengakuan rotasi & cooling-off + tindak lanjut */}
          {rotRelevant && (<>
            <div className="tiny muted upper" style={{ marginBottom: 8 }}>Rotasi &amp; Cooling-off (PP 20/2015 · POJK 13/2017)</div>
            <div className="panel" style={{ padding: '10px 12px', marginBottom: 18, boxShadow: 'none', background: d.tenure >= d.rotationLimit ? 'var(--red-bg)' : 'var(--amber-bg)', borderColor: 'transparent' }}>
              <div className="tiny" style={{ fontWeight: 600, marginBottom: 6, lineHeight: 1.45 }}>
                {d.tenure}/{d.rotationLimit} th pada {d.rotationClient.replace('PT ', '')}{d.listed ? ' (IDX)' : ''} · cooling-off {d.cooloff} th — {d.tenure >= d.rotationLimit ? 'WAJIB ROTASI.' : 'tahun terakhir sebelum batas.'}
              </div>
              {rotAck && rotAck.acknowledged
                ? <div className="tiny" style={{ color: 'var(--green)', fontWeight: 600 }}><I.check size={11} /> Diakui: {rotAck.by} · {rotAck.at}{rotAck.action ? ' — ' + rotAck.action : ''}</div>
                : (<>
                  <textarea className="input" value={rotDraft} onChange={(e: { target: { value: string } }) => setRotDraft(e.target.value)} placeholder="Tindak lanjut (mis. tunjuk partner pengganti FY2026)" style={{ width: '100%', height: 40, resize: 'vertical', marginBottom: 6 }} />
                  <Btn sm variant={rotDraft.trim() ? 'primary' : ''} disabled={!rotDraft.trim()} onClick={() => onAckRotation(rotDraft.trim())}><I.check size={12} /> Akui &amp; catat tindak lanjut</Btn>
                </>)}
            </div>
          </>)}

          <div className="tiny muted upper" style={{ marginBottom: 10 }}>Alur Persetujuan Bertingkat</div>
          <div style={{ display: 'grid', gap: 0 }}>
            {INDEP_CHAIN.map((c, i) => {
              const done = lvl >= i + 1;
              const active = lvl === i;
              return (
                <div key={i} className="row gap10" style={{ paddingBottom: i < INDEP_CHAIN.length - 1 ? 14 : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto' }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: done ? 'var(--green)' : active ? 'var(--blue)' : 'var(--surface-3)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>{done ? <I.check size={13} /> : i + 1}</span>
                    {i < INDEP_CHAIN.length - 1 && <span style={{ width: 1.5, flex: 1, minHeight: 24, background: done ? 'var(--green)' : 'var(--line)' }} />}
                  </div>
                  <div style={{ minWidth: 0, paddingBottom: 4, flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{c.role}</div>
                    <div className="tiny muted">{c.who}</div>
                    {active && (
                      <Btn sm variant="primary" style={{ marginTop: 6 }} onClick={() => { if (i === 0 && !d.declared) onDeclare(); onApprove(i + 1); }}>
                        <I.check size={12} /> {i === 0 ? 'Tandatangani & Ajukan' : i === 1 ? 'Reviu & Teruskan' : 'Setujui Final'}
                      </Btn>
                    )}
                    {done && <div className="tiny" style={{ color: 'var(--green)', fontWeight: 600, marginTop: 2 }}>✓ {steps[i] ? steps[i].by + ' · ' + steps[i].at : 'Selesai'}</div>}
                  </div>
                </div>
              );
            })}
          </div>
          {lvl >= 3 && <div className="panel" style={{ padding: '9px 12px', marginTop: 16, background: 'var(--green-bg)', borderColor: 'transparent', boxShadow: 'none' }}><div className="tiny" style={{ fontWeight: 600 }}><I.check size={12} /> Deklarasi independensi disetujui penuh & terarsip untuk {per}.</div></div>}
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, flex: '0 0 auto' }}>
          {lvl > 0 && <Btn style={{ flex: 1 }} onClick={() => onApprove(0)}><I.sync size={13} /> Reset</Btn>}
          <Btn variant="primary" style={{ flex: 1 }}><I.download size={13} /> Unduh Deklarasi</Btn>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { HCM, CPETracker, Independence });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { CPETracker, HCM, Independence };
