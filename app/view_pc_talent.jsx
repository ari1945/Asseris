/* ============================================================
   NeoSuite AMS — People & Compliance (NEW)
   Rekrutmen & Onboarding Staf  ·  Pelatihan & Kompetensi
   ============================================================ */
const { useState: usePCtal } = React;

const REQ_STAT = { 'Dibuka': 'blue', 'Persetujuan': 'amber', 'Terisi': 'green', 'Ditutup': 'gray' };
const PRIO_C = { Tinggi: 'var(--red)', Sedang: 'var(--amber)', Rendah: 'var(--green)' };

function Recruitment() {
  const A = window.AMS;
  const nav = useNav();
  const [tab, setTab] = usePCtal('reqs');
  const [cands, setCands] = useAmsPersist('pc.cands', () => A.CANDIDATES);
  const [hires, setHires] = useAmsPersist('pc.onboard', () => A.ONBOARDING_HIRES);
  const STAGES = A.CAND_STAGES;

  const openReqs = A.REQUISITIONS.filter(r => r.status === 'Dibuka').length;
  const totalApp = A.REQUISITIONS.reduce((s, r) => s + r.applicants, 0);
  const offers = cands.filter(c => c.stage === 'Penawaran').length;
  const avgFill = A.HCM_ANALYTICS.timeToFill;

  const advance = (id, dir) => setCands(list => list.map(c => {
    if (c.id !== id) return c;
    const i = STAGES.indexOf(c.stage) + dir;
    return { ...c, stage: STAGES[Math.max(0, Math.min(STAGES.length - 1, i))] };
  }));
  const toggleTask = (hid, ti) => setHires(list => list.map(h => h.id === hid ? { ...h, tasks: h.tasks.map((t, i) => i === ti ? { ...t, done: !t.done } : t), progress: Math.round(h.tasks.filter((t, i) => (i === ti ? !t.done : t.done)).length / h.tasks.length * 100) } : h));

  const STAGE_C = { 'Pelamar': '#647889', 'Penyaringan': '#5b3fa6', 'Wawancara': '#005085', 'Penawaran': '#9a6a00', 'Diterima': '#0a6b73' };
  const tabs = [{ id: 'reqs', label: 'Requisisi', count: A.REQUISITIONS.length }, { id: 'pipeline', label: 'Pipeline Kandidat', count: cands.length }, { id: 'onboard', label: 'Onboarding', count: hires.length }];

  return (
    <>
      <SubBar moduleId="recruitment" right={<div className="row gap8 ac"><Badge kind="blue">{openReqs} lowongan aktif</Badge><Btn sm variant="primary"><I.plus size={14} /> Requisisi Baru</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={openReqs} label="Requisisi Terbuka" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={totalApp} label="Total Pelamar" accent="var(--blue)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={offers} label="Penawaran Berjalan" accent="var(--amber)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={avgFill + ' hari'} label="Rata-rata Time-to-Fill" /></div></Panel>
        </div>

        <Panel noBody>
          <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

          {tab === 'reqs' && (
            <table className="dtbl">
              <thead><tr><th>ID / Posisi</th><th>Divisi</th><th>Hiring Mgr</th><th className="num">Kuota</th><th className="num">Pelamar</th><th>Prioritas</th><th>Target</th><th>Status</th></tr></thead>
              <tbody>
                {A.REQUISITIONS.map(r => (
                  <tr key={r.id}>
                    <td><div style={{ fontWeight: 600 }}>{r.title}</div><div className="tiny muted mono">{r.id} · {r.reason}</div></td>
                    <td className="tiny">{r.dept}</td>
                    <td><div className="row ac gap6"><Avatar name={A.byId(r.hiringMgr).name} size={22} /><span className="tiny truncate" style={{ maxWidth: 80 }}>{A.byId(r.hiringMgr).name.split(' ')[0]}</span></div></td>
                    <td className="num mono">{r.filled}/{r.count}</td>
                    <td className="num mono" style={{ fontWeight: 700 }}>{r.applicants}</td>
                    <td><span className="row ac gap4 tiny" style={{ color: PRIO_C[r.priority], fontWeight: 600 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor' }} />{r.priority}</span></td>
                    <td className="tiny muted">{new Date(r.target).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</td>
                    <td><Badge kind={REQ_STAT[r.status]}>{r.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'pipeline' && (
            <div style={{ padding: 14, overflowX: 'auto' }}>
              <div className="row" style={{ gap: 10, alignItems: 'flex-start', minWidth: 880 }}>
                {STAGES.map(st => {
                  const col = cands.filter(c => c.stage === st);
                  return (
                    <div key={st} style={{ flex: 1, minWidth: 165 }}>
                      <div className="row ac jb" style={{ marginBottom: 8 }}>
                        <span className="row ac gap6 tiny" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.03em', color: STAGE_C[st] }}><span style={{ width: 8, height: 8, borderRadius: 2, background: STAGE_C[st] }} />{st}</span>
                        <span className="tiny muted">{col.length}</span>
                      </div>
                      <div style={{ display: 'grid', gap: 8 }}>
                        {col.map(c => (
                          <div key={c.id} className="panel" style={{ padding: '9px 10px', boxShadow: 'none', borderLeft: '3px solid ' + STAGE_C[st] }}>
                            <div className="row ac gap8" style={{ marginBottom: 5 }}>
                              <Avatar name={c.name} size={24} />
                              <div style={{ minWidth: 0, flex: 1 }}><div className="truncate" style={{ fontWeight: 600, fontSize: 12 }}>{c.name}</div><div className="tiny muted">{c.cert} · {c.exp}</div></div>
                            </div>
                            <div className="row ac jb" style={{ marginBottom: 6 }}>
                              <span className="tiny muted truncate" style={{ maxWidth: 90 }}>{c.source}</span>
                              {c.rating > 0 && <span className="mono tiny" style={{ fontWeight: 700, color: c.rating >= 4.3 ? 'var(--green)' : 'var(--blue)' }}>★ {c.rating.toFixed(1)}</span>}
                            </div>
                            <div className="row gap4">
                              <button className="btn sm" style={{ height: 20, flex: 1, padding: 0 }} disabled={STAGES.indexOf(c.stage) === 0} onClick={() => advance(c.id, -1)}><I.chevron size={12} style={{ transform: 'rotate(180deg)' }} /></button>
                              <button className="btn sm" style={{ height: 20, flex: 1, padding: 0, color: STAGES.indexOf(c.stage) === STAGES.length - 1 ? 'var(--ink-4)' : 'var(--blue)' }} disabled={STAGES.indexOf(c.stage) === STAGES.length - 1} onClick={() => advance(c.id, 1)}><I.chevron size={12} /></button>
                            </div>
                          </div>
                        ))}
                        {!col.length && <div className="tiny muted" style={{ textAlign: 'center', padding: 12, border: '1px dashed var(--line)', borderRadius: 8 }}>—</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'onboard' && (
            <div style={{ padding: 14, display: 'grid', gap: 12 }}>
              {hires.map(h => (
                <div key={h.id} className="panel" style={{ padding: 0, boxShadow: 'none' }}>
                  <div className="row ac jb" style={{ padding: '10px 13px', borderBottom: '1px solid var(--line)' }}>
                    <div className="row ac gap8"><Avatar name={h.name} size={30} /><div><div style={{ fontWeight: 700, fontSize: 13 }}>{h.name}</div><div className="tiny muted">{h.role} · mulai {new Date(h.start).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} · buddy {A.byId(h.buddy).name.split(' ')[0]}</div></div></div>
                    <div className="row ac gap8" style={{ minWidth: 160 }}><div style={{ flex: 1, height: 7, borderRadius: 4, background: 'var(--surface-3)' }}><div style={{ width: h.progress + '%', height: '100%', borderRadius: 4, background: h.progress === 100 ? 'var(--green)' : 'var(--blue)' }} /></div><span className="mono tiny" style={{ fontWeight: 700 }}>{h.progress}%</span></div>
                  </div>
                  <div style={{ padding: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {h.tasks.map((t, i) => (
                      <div key={i} className="row ac gap8" onClick={() => toggleTask(h.id, i)} style={{ cursor: 'pointer', padding: '6px 9px', borderRadius: 7, border: '1px solid var(--line-soft)', background: t.done ? 'var(--green-bg)' : 'transparent' }}>
                        <span style={{ width: 16, height: 16, borderRadius: 4, border: '1.5px solid ' + (t.done ? 'var(--green)' : 'var(--line-strong)'), background: t.done ? 'var(--green)' : 'transparent', display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>{t.done && <I.check size={11} style={{ color: '#fff' }} />}</span>
                        <div style={{ minWidth: 0, flex: 1 }}><div className="tiny truncate" style={{ fontWeight: 500, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--ink-3)' : 'var(--ink)' }}>{t.t}</div></div>
                        <span className="chip tiny" style={{ flex: '0 0 auto' }}>{t.owner}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div></div>
    </>
  );
}

/* ============================================================
   Pelatihan & Kompetensi (Learning & Competency)
   ============================================================ */
const LVL = [1, 2, 3, 4, 5];
function lvlColor(actual, req) {
  if (actual >= req) return { bg: 'var(--green-bg)', fg: 'var(--green)' };
  if (actual === req - 1) return { bg: 'var(--amber-bg)', fg: 'var(--amber)' };
  return { bg: 'var(--red-bg)', fg: 'var(--red)' };
}

function Learning() {
  const A = window.AMS;
  const [tab, setTab] = usePCtal('matrix');
  const [enroll, setEnroll] = useAmsPersist('pc.enroll', () => A.TRAINING_CATALOG.map(t => ({ id: t.id, enrolled: t.enrolled })));
  const staff = A.STAFF, COMP = A.COMPETENCIES, REQ = A.COMPETENCY_REQ, ACT = A.COMPETENCY_ACTUAL;

  const actualOf = (s, cid) => (ACT[s.id] || {})[cid] ?? Math.max(1, (REQ[s.grade][cid] || 2) - 1);
  const gapCount = staff.reduce((n, s) => n + COMP.filter(c => actualOf(s, c.id) < REQ[s.grade][c.id]).length, 0);
  const totalCells = staff.length * COMP.length;
  const coverage = Math.round((totalCells - gapCount) / totalCells * 100);
  const upcoming = A.TRAINING_CATALOG.filter(t => new Date(t.date) >= new Date('2026-03-09')).length;
  const seatsLeft = A.TRAINING_CATALOG.reduce((s, t) => s + (t.seats - (enroll.find(e => e.id === t.id) || {}).enrolled), 0);

  const doEnroll = (id) => setEnroll(list => list.map(e => e.id === id ? { ...e, enrolled: Math.min(A.TRAINING_CATALOG.find(t => t.id === id).seats, e.enrolled + 1) } : e));
  const tabs = [{ id: 'matrix', label: 'Matriks Kompetensi' }, { id: 'catalog', label: 'Katalog Pelatihan', count: A.TRAINING_CATALOG.length }];

  return (
    <>
      <SubBar moduleId="learning" right={<div className="row gap8 ac"><Badge kind="blue">{COMP.length} kompetensi inti</Badge><Btn sm variant="primary"><I.plus size={14} /> Jadwalkan Pelatihan</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={coverage + '%'} label="Kompetensi Terpenuhi" accent={coverage >= 80 ? 'var(--green)' : 'var(--amber)'} /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={gapCount} label="Gap Kompetensi" accent="var(--amber)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={upcoming} label="Pelatihan Mendatang" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={seatsLeft} label="Kursi Tersedia" accent="var(--blue)" /></div></Panel>
        </div>

        <Panel noBody>
          <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

          {tab === 'matrix' && (
            <div style={{ padding: 14, overflowX: 'auto' }}>
              <table className="dtbl" style={{ minWidth: 820 }}>
                <thead><tr><th style={{ position: 'sticky', left: 0, background: 'var(--surface-2)', minWidth: 160 }}>Karyawan</th>{COMP.map(c => <th key={c.id} className="num" style={{ minWidth: 78, fontSize: 10, verticalAlign: 'bottom' }}>{c.name}</th>)}<th className="num">Gap</th></tr></thead>
                <tbody>
                  {staff.map(s => {
                    const gaps = COMP.filter(c => actualOf(s, c.id) < REQ[s.grade][c.id]).length;
                    return (
                      <tr key={s.id}>
                        <td style={{ position: 'sticky', left: 0, background: 'var(--surface)' }}><div className="row ac gap8"><Avatar name={s.name} size={22} /><div style={{ minWidth: 0 }}><div className="truncate tiny" style={{ fontWeight: 600 }}>{s.name}</div><div className="tiny muted">{s.grade}</div></div></div></td>
                        {COMP.map(c => {
                          const a = actualOf(s, c.id), r = REQ[s.grade][c.id], col = lvlColor(a, r);
                          return <td key={c.id} className="num" style={{ textAlign: 'center' }}><span title={c.name + ': ' + a + '/' + r} style={{ display: 'inline-block', minWidth: 34, padding: '3px 0', borderRadius: 5, background: col.bg, color: col.fg, fontWeight: 700, fontSize: 11 }} className="mono">{a}<span style={{ opacity: .5 }}>/{r}</span></span></td>;
                        })}
                        <td className="num"><Badge kind={gaps === 0 ? 'green' : gaps <= 2 ? 'amber' : 'red'}>{gaps}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="row gap12 tiny muted" style={{ marginTop: 10 }}>
                <span className="row ac gap4"><span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--green-bg)' }} /> Memenuhi</span>
                <span className="row ac gap4"><span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--amber-bg)' }} /> Mendekati (−1)</span>
                <span className="row ac gap4"><span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--red-bg)' }} /> Gap signifikan</span>
                <span>· angka = level aktual / level disyaratkan menurut jenjang (skala 1–5)</span>
              </div>
            </div>
          )}

          {tab === 'catalog' && (
            <table className="dtbl">
              <thead><tr><th>Program</th><th>Penyelenggara</th><th>Jenis</th><th className="num">SKP</th><th>Jadwal</th><th style={{ width: 130 }}>Kuota</th><th></th></tr></thead>
              <tbody>
                {A.TRAINING_CATALOG.map(t => {
                  const en = (enroll.find(e => e.id === t.id) || {}).enrolled;
                  const full = en >= t.seats;
                  const comp = COMP.find(c => c.id === t.comp);
                  return (
                    <tr key={t.id}>
                      <td><div style={{ fontWeight: 600 }}>{t.title}</div><div className="tiny muted">{comp ? comp.name : ''} · {t.fmt} · {t.hours} jam</div></td>
                      <td className="tiny">{t.provider}</td>
                      <td><Badge kind={t.mode === 'Terstruktur' ? 'blue' : 'gray'}>{t.mode}</Badge></td>
                      <td className="num mono" style={{ fontWeight: 700 }}>{t.skp}</td>
                      <td className="tiny muted">{new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</td>
                      <td><div className="row ac gap8"><div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: (en / t.seats * 100) + '%', height: '100%', borderRadius: 3, background: full ? 'var(--amber)' : 'var(--blue)' }} /></div><span className="tiny mono">{en}/{t.seats}</span></div></td>
                      <td><Btn sm variant={full ? '' : 'primary'} disabled={full} style={{ opacity: full ? .5 : 1 }} onClick={() => doEnroll(t.id)}>{full ? 'Penuh' : 'Daftar'}</Btn></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Panel>
        <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>Pelatihan terstruktur tersinkron ke <b>CPE / PPL Tracker</b> (SKP IAPI). Level kompetensi disyaratkan meningkat seiring jenjang — gap menjadi dasar penyusunan rencana pelatihan & rencana pengembangan individu.</div>
      </div></div>
    </>
  );
}

Object.assign(window, { Recruitment, Learning });
