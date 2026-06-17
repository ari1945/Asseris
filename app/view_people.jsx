/* ============================================================
   NeoSuite AMS — HCM + CPE/PPL Tracker + Independence (Package E)
   ============================================================ */
const { useState: useStateE, useMemo: useMemoE } = React;

/* ---------------- HCM (People) ---------------- */
const GRADE_ORDER = ['Partner', 'Manager', 'Senior', 'Junior'];
const GRADE_COLOR = { Partner: '#002C3F', Manager: '#005085', Senior: '#0a6b73', Junior: '#5b3fa6' };

function HCM() {
  const { fmt } = window.AMS;
  const nav = useNav();
  const [extra, setExtra] = useAmsPersist('staffExtra', []);
  const staff = [...extra, ...window.AMS.STAFF];
  const [sel, setSel] = useStateE(window.AMS.STAFF[3].id);
  const [q, setQ] = useStateE('');
  const [grade, setGrade] = useStateE('All');
  const [showNew, setShowNew] = useStateE(false);
  const [mode, setMode] = useStateE('direktori');
  const [drawer, setDrawer] = useStateE(null);
  const addStaff = (s) => { setExtra(list => [{ id: 'EMP-' + String(100 + list.length).padStart(3, '0'), engagements: 0, rating: 4.0, util: 0, status: 'Aktif', joined: 2026, ...s }, ...list]); };

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

  return (
    <>
      <SubBar moduleId="hcm" right={<div className="row gap8 ac"><Seg options={[{ value: 'direktori', label: 'Direktori' }, { value: 'analitik', label: 'Analitik' }]} value={mode} onChange={setMode} /><Badge kind="blue">{staff.length} karyawan</Badge><Btn sm><I.download size={13} /> Direktori</Btn><Btn sm variant="primary" onClick={() => setShowNew(true)}><I.plus size={14} /> Karyawan Baru</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        {mode === 'analitik' ? <HCMAnalytics /> : (<>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={staff.length} label="Total SDM" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={staff.filter(s => s.grade === 'Partner').length} label="Partner" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={avgUtil + '%'} label="Rata-rata Utilisasi" accent={avgUtil > 85 ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={staff.filter(s => s.status === 'Cuti').length} label="Sedang Cuti" /></div></Panel>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: 12, alignItems: 'start' }}>
          <Panel noBody>
            <div className="panel-h"><h3>Direktori Karyawan</h3><div style={{ flex: 1 }} /><div className="global-search" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', height: 26, maxWidth: 170 }}><I.search2 size={13} style={{ color: 'var(--ink-4)' }} /><input style={{ color: 'var(--ink)' }} placeholder="Cari…" value={q} onChange={e => setQ(e.target.value)} /></div><Seg options={['All', ...GRADE_ORDER]} value={grade} onChange={setGrade} /></div>
            <table className="dtbl">
              <thead><tr><th>Karyawan</th><th>Jabatan</th><th>Sertifikasi</th><th className="num">Utilisasi</th><th className="num">Rating</th><th>Status</th></tr></thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} className={s.id === sel ? 'sel' : ''} onClick={() => setSel(s.id)} style={{ cursor: 'pointer' }}>
                    <td><div className="row ac gap8"><Avatar name={s.name} size={28} /><div style={{ minWidth: 0 }}><div className="truncate" style={{ fontWeight: 600 }}>{s.name}</div><div className="tiny muted mono">{s.id}</div></div></div></td>
                    <td><span className="badge" style={{ background: GRADE_COLOR[s.grade] + '1a', color: GRADE_COLOR[s.grade] }}>{s.grade}</span></td>
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
      {showNew && <StaffForm onClose={() => setShowNew(false)} onAdd={(s) => { addStaff(s); setShowNew(false); }} />}
      {drawer && <Profile360Drawer s={drawer} onClose={() => setDrawer(null)} />}
    </>
  );
}

function StaffForm({ onClose, onAdd }) {
  const [d, setD] = useStateE({ name: '', role: 'Junior Auditor', grade: 'Junior', cert: 'S.Ak', email: '' });
  const set = (k, v) => setD(s => ({ ...s, [k]: v }));
  const valid = d.name.trim();
  const ROLE_BY_GRADE = { Partner: 'Engagement Partner', Manager: 'Audit Manager', Senior: 'Senior Auditor', Junior: 'Junior Auditor' };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.4)', zIndex: 90, display: 'grid', placeItems: 'center' }} onClick={onClose}>
      <div className="panel" style={{ width: 500, maxWidth: '94vw', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, borderRadius: '4px 4px 0 0' }}>
          <I.users size={18} /><div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>Karyawan Baru</div><div className="tiny" style={{ color: '#bcd6e4' }}>Tambah ke direktori SDM</div></div>
          <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>
        <div style={{ padding: 16, display: 'grid', gap: 12 }}>
          <div className="field"><label>Nama Lengkap</label><input className="input" value={d.name} onChange={e => set('name', e.target.value)} placeholder="Nama karyawan" /></div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field"><label>Jenjang</label><select className="select" value={d.grade} onChange={e => set('grade', e.target.value)}>{['Partner', 'Manager', 'Senior', 'Junior'].map(g => <option key={g}>{g}</option>)}</select></div>
            <div className="field"><label>Sertifikasi</label><input className="input" value={d.cert} onChange={e => set('cert', e.target.value)} placeholder="CPA / CA / S.Ak" /></div>
          </div>
          <div className="field"><label>Email</label><input className="input" value={d.email} onChange={e => set('email', e.target.value)} placeholder="nama@whr-cpa.id" /></div>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn onClick={onClose}>Batal</Btn>
          <Btn variant="primary" disabled={!valid} style={{ opacity: valid ? 1 : .5 }} onClick={() => onAdd({ ...d, role: ROLE_BY_GRADE[d.grade] })}><I.check size={14} /> Tambah Karyawan</Btn>
        </div>
      </div>
    </div>
  );
}

/* ---------------- CPE/PPL Tracker ---------------- */
function CPETracker() {
  const { fmt } = window.AMS;
  const nav = useNav();
  const staff = window.AMS.STAFF, req = window.AMS.CPE_REQ;
  const [extraLog, setExtraLog] = useAmsPersist('cpeExtra', {});
  const [sel, setSel] = useStateE('EMP-007');
  const [showNew, setShowNew] = useStateE(false);
  const log = (() => { const m = {}; staff.forEach(s => { m[s.id] = [...(extraLog[s.id] || []), ...((window.AMS.CPE_LOG[s.id]) || [])]; }); return m; })();
  const addSkp = (id, rec) => setExtraLog(l => ({ ...l, [id]: [{ ...rec, date: '2026-03-09' }, ...(l[id] || [])] }));

  const summary = staff.map(s => {
    const recs = log[s.id] || [];
    const structured = recs.filter(r => r.type === 'Terstruktur').reduce((a, r) => a + r.skp, 0);
    const total = recs.reduce((a, r) => a + r.skp, 0);
    const compliant = total >= req.annual && structured >= req.structured;
    return { ...s, structured, total, compliant, recs };
  });
  const compliantN = summary.filter(s => s.compliant).length;
  const atRisk = summary.filter(s => !s.compliant && s.total < req.annual * 0.5).length;
  const person = summary.find(s => s.id === sel) || summary[0];

  return (
    <>
      <SubBar moduleId="cpe" right={<div className="row gap8 ac"><Badge kind="blue">PPL {req.year} · {req.annual} SKP</Badge><Btn sm variant="primary" onClick={() => setShowNew(true)}><I.plus size={14} /> Catat SKP</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={`${compliantN}/${staff.length}`} label="Memenuhi PPL" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={req.annual + ' SKP'} label="Syarat Tahunan" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={req.structured + ' SKP'} label="Min. Terstruktur" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={atRisk} label="Berisiko Tidak Memenuhi" accent="var(--red)" /></div></Panel>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr', gap: 12, alignItems: 'start' }}>
          <Panel noBody>
            <div className="panel-h"><h3>Status PPL per Karyawan</h3><div style={{ flex: 1 }} /><span className="tiny muted">tahun {req.year}</span></div>
            <table className="dtbl">
              <thead><tr><th>Karyawan</th><th className="num">Terstruktur</th><th className="num">Total SKP</th><th style={{ width: 140 }}>Progress</th><th>Status</th></tr></thead>
              <tbody>
                {summary.map(s => (
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
            <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }} className="row ac gap8">
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
                {person.recs.length ? person.recs.map((r, i) => (
                  <div key={i} className="row ac jb" style={{ padding: '7px 0', borderBottom: i < person.recs.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                    <div style={{ minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600 }} className="truncate">{r.t}</div><div className="tiny muted">{new Date(r.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} · {r.type}</div></div>
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
      {showNew && <SkpForm staff={staff} onClose={() => setShowNew(false)} onAdd={(id, rec) => { addSkp(id, rec); setShowNew(false); }} />}
    </>
  );
}

function SkpForm({ staff, onClose, onAdd }) {
  const [d, setD] = useStateE({ id: 'EMP-007', t: '', type: 'Terstruktur', skp: 4 });
  const set = (k, v) => setD(s => ({ ...s, [k]: v }));
  const valid = d.t.trim() && +d.skp > 0;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.4)', zIndex: 90, display: 'grid', placeItems: 'center' }} onClick={onClose}>
      <div className="panel" style={{ width: 460, maxWidth: '94vw', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, borderRadius: '4px 4px 0 0' }}>
          <I.book size={18} /><div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>Catat SKP (PPL)</div><div className="tiny" style={{ color: '#bcd6e4' }}>Tambah satuan kredit pendidikan profesional</div></div>
          <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>
        <div style={{ padding: 16, display: 'grid', gap: 12 }}>
          <div className="field"><label>Karyawan</label><select className="select" value={d.id} onChange={e => set('id', e.target.value)}>{staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div className="field"><label>Kegiatan / Pelatihan</label><input className="input" value={d.t} onChange={e => set('t', e.target.value)} placeholder="mis. Workshop SA Terkini IAPI" /></div>
          <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 10 }}>
            <div className="field"><label>Jenis</label><select className="select" value={d.type} onChange={e => set('type', e.target.value)}>{['Terstruktur', 'Tidak Terstruktur'].map(s => <option key={s}>{s}</option>)}</select></div>
            <div className="field"><label>SKP</label><input className="input mono" type="number" value={d.skp} onChange={e => set('skp', +e.target.value)} style={{ textAlign: 'right' }} /></div>
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
  const [data, setData] = useAmsPersist('independence', () => window.AMS.INDEPENDENCE);
  const declared = data.filter(d => d.declared).length;
  const conflicts = data.reduce((s, d) => s + d.conflicts, 0);
  const rotationDue = data.filter(d => d.tenure >= d.rotationLimit).length;
  const rotationWarn = data.filter(d => d.tenure >= d.rotationLimit - 1 && d.tenure < d.rotationLimit).length;
  const toggle = (id) => setData(list => list.map(d => d.id === id ? { ...d, declared: !d.declared } : d));
  const [sel, setSel] = useStateE(null);
  const [appr, setAppr] = useAmsPersist('indepAppr', {});
  const curr = sel ? data.find(d => d.id === sel) : null;
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
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={`${declared}/${data.length}`} label="Deklarasi Diterima" accent={declared === data.length ? 'var(--green)' : 'var(--amber)'} /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={conflicts} label="Konflik Teridentifikasi" accent={conflicts ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={rotationDue} label="Rotasi Wajib" accent={rotationDue ? 'var(--red)' : 'var(--green)'} /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={rotationWarn} label="Rotasi Tahun Depan" accent="var(--amber)" /></div></Panel>
        </div>

        {rotationDue > 0 && (
          <div className="panel" style={{ padding: '11px 14px', marginBottom: 12, background: 'var(--red-bg)', borderColor: 'transparent' }}>
            <div className="row ac gap8"><span style={{ color: 'var(--red)' }}><I.alert size={17} /></span><span style={{ fontSize: 12.5, fontWeight: 600 }}>Rotasi partner wajib: <b>{data.filter(d => d.tenure >= d.rotationLimit).map(d => d.name.split(' ')[0]).join(', ')}</b> telah mencapai batas {data.find(d => d.tenure >= d.rotationLimit)?.rotationLimit} tahun pada emiten — tunjuk partner pengganti (UU 5/2011 & POJK 13/2017).</span></div>
          </div>
        )}

        <Panel noBody>
          <div className="panel-h"><h3>Register Independensi & Rotasi Partner</h3><div style={{ flex: 1 }} /><span className="tiny muted">klik baris untuk alur persetujuan</span></div>
          <table className="dtbl">
            <thead><tr><th>Partner / Staf</th><th>Deklarasi Tahunan</th><th>Alur Persetujuan</th><th className="num">Konflik</th><th>Klien (rotasi)</th><th className="num" style={{ width: 130 }}>Masa Tugas</th></tr></thead>
            <tbody>
              {data.map(d => {
                const rotPct = d.tenure / d.rotationLimit * 100;
                const rotCol = d.tenure >= d.rotationLimit ? 'var(--red)' : d.tenure >= d.rotationLimit - 1 ? 'var(--amber)' : 'var(--green)';
                const lvl = appr[d.id] != null ? appr[d.id] : (d.declared ? 3 : 0);
                const STEPS = ['Belum', 'Diajukan', 'Direviu', 'Disetujui'];
                return (
                  <tr key={d.id} className={d.id === sel ? 'sel' : ''} onClick={() => setSel(d.id)} style={{ cursor: 'pointer' }}>
                    <td><div className="row ac gap8"><Avatar name={d.name} size={24} /><span style={{ fontWeight: 600 }}>{d.name}</span></div></td>
                    <td><span onClick={(e) => { e.stopPropagation(); toggle(d.id); }} style={{ cursor: 'pointer' }}>{d.declared ? <Badge kind="green"><I.check size={10} /> Diterima</Badge> : <Badge kind="red">Belum</Badge>}</span></td>
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
      {curr && <IndepDrawer d={curr} lvl={appr[curr.id] != null ? appr[curr.id] : (curr.declared ? 3 : 0)} onApprove={(n) => setAppr(a => ({ ...a, [curr.id]: n }))} onDeclare={() => toggle(curr.id)} onClose={() => setSel(null)} />}
    </>
  );
}

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

function IndepDrawer({ d, lvl, onApprove, onDeclare, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.4)', zIndex: 90, display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
      <div className="panel" style={{ width: 480, maxWidth: '95vw', height: '100%', borderRadius: 0, display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, flex: '0 0 auto' }}>
          <Avatar name={d.name} size={42} />
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14.5, fontWeight: 700 }} className="truncate">{d.name}</div><div className="tiny" style={{ color: '#bcd6e4' }}>Deklarasi Independensi · TA 2026</div></div>
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

          {d.conflicts > 0 && (
            <div className="panel" style={{ padding: '9px 12px', marginBottom: 18, background: 'var(--amber-bg)', borderColor: 'transparent', boxShadow: 'none' }}>
              <div className="tiny" style={{ fontWeight: 600, lineHeight: 1.45 }}><I.alert size={12} /> Konflik dilaporkan: {d.finInterest}. Pengamanan (safeguard) telah diterapkan & didokumentasikan.</div>
            </div>
          )}

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
                    {done && <div className="tiny" style={{ color: 'var(--green)', fontWeight: 600, marginTop: 2 }}>✓ Selesai</div>}
                  </div>
                </div>
              );
            })}
          </div>
          {lvl >= 3 && <div className="panel" style={{ padding: '9px 12px', marginTop: 16, background: 'var(--green-bg)', borderColor: 'transparent', boxShadow: 'none' }}><div className="tiny" style={{ fontWeight: 600 }}><I.check size={12} /> Deklarasi independensi disetujui penuh & terarsip untuk TA 2026.</div></div>}
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
