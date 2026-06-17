/* ============================================================
   NeoSuite AMS — Resource Scheduler (Package D)
   ============================================================ */
const { useState: useStateD3, useMemo: useMemoD3 } = React;

function ResourceScheduler() {
  const { fmt } = window.AMS;
  const nav = useNav();
  const [schedule, setSchedule] = useAmsPersist('schedule', () => window.AMS.SCHEDULE);
  const [sel, setSel] = useStateD3(null);
  const [showNew, setShowNew] = useStateD3(false);
  const addBooking = (b) => setSchedule(list => list.map(m => m.member === b.member ? { ...m, alloc: [...m.alloc, { eng: b.eng, client: b.client, hrs: +b.hrs, color: b.color }] } : m));

  const totalCap = schedule.reduce((s, m) => s + m.capacity, 0);
  const totalAlloc = schedule.reduce((s, m) => s + m.alloc.reduce((a, x) => a + x.hrs, 0), 0);
  const utilPct = Math.round(totalAlloc / totalCap * 100);
  const overbooked = schedule.filter(m => m.alloc.reduce((a, x) => a + x.hrs, 0) > m.capacity).length;
  const benchHrs = schedule.reduce((s, m) => s + Math.max(0, m.capacity - m.alloc.reduce((a, x) => a + x.hrs, 0)), 0);

  // distinct engagements for legend
  const engColors = {};
  schedule.forEach(m => m.alloc.forEach(a => { engColors[a.eng] = { color: a.color, client: a.client }; }));

  return (
    <>
      <SubBar moduleId="scheduler" right={
        <div className="row gap8 ac">
          <span className="tiny muted">Minggu 9–13 Mar 2026</span>
          <Btn sm><I.calendar size={13} /> Minggu Depan</Btn>
          <Btn sm variant="primary" onClick={() => setShowNew(true)}><I.plus size={14} /> Booking Baru</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={utilPct + '%'} label="Utilisasi Tim" accent={utilPct > 90 ? 'var(--red)' : utilPct > 75 ? 'var(--green)' : 'var(--amber)'} /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={fmt(benchHrs) + 'h'} label="Kapasitas Tersedia (bench)" accent="var(--blue)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={overbooked} label="Anggota Over-booked" accent={overbooked ? 'var(--red)' : 'var(--green)'} /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={Object.keys(engColors).length} label="Engagement Aktif" /></div></Panel>
        </div>

        {/* allocation matrix */}
        <Panel noBody style={{ marginBottom: 12 }}>
          <div className="panel-h"><h3>Alokasi Sumber Daya — Mingguan</h3><div style={{ flex: 1 }} /><span className="tiny muted">jam/minggu vs kapasitas 40h · klik baris</span></div>
          <div style={{ padding: '6px 14px 12px' }}>
            {schedule.map((m, mi) => {
              const used = m.alloc.reduce((a, x) => a + x.hrs, 0);
              const pct = used / m.capacity * 100;
              const over = used > m.capacity;
              return (
                <div key={m.member} onClick={() => setSel(sel === mi ? null : mi)} style={{ padding: '9px 0', borderBottom: mi < schedule.length - 1 ? '1px solid var(--line-soft)' : 0, cursor: 'pointer' }}>
                  <div className="row ac gap10">
                    <div style={{ width: 180, flex: '0 0 180px' }} className="row ac gap8">
                      <Avatar name={m.member} size={28} />
                      <div style={{ minWidth: 0 }}><div className="truncate" style={{ fontSize: 12.5, fontWeight: 600 }}>{m.member.split(',')[0]}</div><div className="tiny muted">{m.role}</div></div>
                    </div>
                    {/* stacked bar */}
                    <div style={{ flex: 1, height: 26, borderRadius: 5, background: 'var(--surface-3)', display: 'flex', overflow: 'hidden', position: 'relative' }}>
                      {m.alloc.map((a, ai) => (
                        <div key={ai} title={a.client + ': ' + a.hrs + 'h'} style={{ width: (a.hrs / m.capacity * 100) + '%', background: a.color, display: 'grid', placeItems: 'center' }}>
                          {a.hrs / m.capacity > 0.12 && <span style={{ color: '#fff', fontSize: 9.5, fontWeight: 700, fontFamily: 'var(--mono)' }}>{a.hrs}h</span>}
                        </div>
                      ))}
                      {/* capacity line at 100% is full width; mark overflow */}
                      {over && <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 3, background: 'var(--red)' }} />}
                    </div>
                    <div style={{ width: 76, flex: '0 0 76px', textAlign: 'right' }}>
                      <span className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: over ? 'var(--red)' : pct < 60 ? 'var(--amber)' : 'var(--green)' }}>{used}/{m.capacity}h</span>
                      <div className="tiny muted">{Math.round(pct)}%</div>
                    </div>
                  </div>
                  {sel === mi && (
                    <div style={{ marginTop: 8, marginLeft: 190, display: 'grid', gap: 5 }}>
                      {m.alloc.map((a, ai) => (
                        <div key={ai} className="row ac jb" style={{ background: 'var(--surface-2)', borderRadius: 6, padding: '5px 9px' }}>
                          <span className="row ac gap6"><span style={{ width: 9, height: 9, borderRadius: 2, background: a.color }} /><span className="tiny" style={{ fontWeight: 600 }}>{a.client}</span><span className="tiny muted mono">{a.eng}</span></span>
                          <span className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700 }}>{a.hrs}h</span><button className="btn sm" style={{ height: 20, padding: '0 7px' }} onClick={(e) => { e.stopPropagation(); nav('cockpit'); }}>↗</button></span>
                        </div>
                      ))}
                      {m.capacity - used > 0 && <div className="tiny muted" style={{ paddingLeft: 4 }}>Tersedia: <b>{m.capacity - used}h</b> — dapat dialokasikan ke engagement baru.</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
          <Panel title="Engagement (legenda)">
            <div style={{ display: 'grid', gap: 7 }}>
              {Object.entries(engColors).map(([eng, v]) => {
                const hrs = schedule.reduce((s, m) => s + m.alloc.filter(a => a.eng === eng).reduce((a, x) => a + x.hrs, 0), 0);
                return (
                  <div key={eng} className="row ac jb" style={{ padding: '5px 0', borderBottom: '1px solid var(--line-soft)' }}>
                    <span className="row ac gap8"><span style={{ width: 11, height: 11, borderRadius: 3, background: v.color }} /><span style={{ fontSize: 12, fontWeight: 600 }}>{v.client}</span><span className="tiny muted mono">{eng}</span></span>
                    <span className="mono tiny" style={{ fontWeight: 700 }}>{hrs}h/mgg</span>
                  </div>
                );
              })}
            </div>
          </Panel>
          <Panel title="Peringatan Kapasitas">
            <div style={{ display: 'grid', gap: 8 }}>
              {schedule.filter(m => m.alloc.reduce((a, x) => a + x.hrs, 0) > m.capacity).map(m => (
                <div key={m.member} className="panel" style={{ padding: '9px 11px', background: 'var(--red-bg)', borderColor: 'transparent' }}>
                  <div className="row ac gap8"><span style={{ color: 'var(--red)' }}><I.alert size={15} /></span><span className="tiny" style={{ fontWeight: 600 }}><b>{m.member.split(',')[0]}</b> over-booked {m.alloc.reduce((a, x) => a + x.hrs, 0) - m.capacity}h — realokasi diperlukan.</span></div>
                </div>
              ))}
              {schedule.filter(m => m.capacity - m.alloc.reduce((a, x) => a + x.hrs, 0) >= 15).map(m => (
                <div key={m.member} className="panel" style={{ padding: '9px 11px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
                  <div className="row ac gap8"><span style={{ color: 'var(--amber)' }}><I.clock size={15} /></span><span className="tiny" style={{ fontWeight: 600 }}><b>{m.member.split(',')[0]}</b> under-utilized ({m.capacity - m.alloc.reduce((a, x) => a + x.hrs, 0)}h tersedia) — alokasikan ke pipeline.</span></div>
                </div>
              ))}
              {!overbooked && schedule.every(m => m.capacity - m.alloc.reduce((a, x) => a + x.hrs, 0) < 15) && <div className="tiny muted" style={{ padding: 12, textAlign: 'center' }}>Alokasi seimbang — tidak ada peringatan kapasitas.</div>}
            </div>
          </Panel>
        </div>
      </div></div>
      {showNew && <BookingForm schedule={schedule} onClose={() => setShowNew(false)} onAdd={(b) => { addBooking(b); setShowNew(false); }} />}
    </>
  );
}

function BookingForm({ schedule, onClose, onAdd }) {
  const engs = window.AMS.ENGAGEMENTS, cl = window.AMS.CLIENTS;
  const colors = ['#005085', '#1f7a4d', '#5b3fa6', '#0a6b73', '#9a6a00'];
  const [d, setD] = useStateD3({ member: schedule[0].member, eng: engs[0].id, hrs: 8 });
  const set = (k, v) => setD(s => ({ ...s, [k]: v }));
  const valid = +d.hrs > 0;
  const submit = () => {
    const e = engs.find(x => x.id === d.eng); const c = cl.find(x => x.id === e.clientId);
    onAdd({ member: d.member, eng: d.eng, client: (c?.name || '').replace('PT ', '').replace(' Tbk', ''), hrs: +d.hrs, color: colors[engs.indexOf(e) % colors.length] });
  };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.4)', zIndex: 90, display: 'grid', placeItems: 'center' }} onClick={onClose}>
      <div className="panel" style={{ width: 460, maxWidth: '94vw', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, borderRadius: '4px 4px 0 0' }}>
          <I.calendar size={18} /><div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>Booking Baru</div><div className="tiny" style={{ color: '#bcd6e4' }}>Alokasikan anggota ke engagement</div></div>
          <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>
        <div style={{ padding: 16, display: 'grid', gap: 12 }}>
          <div className="field"><label>Anggota Tim</label><select className="select" value={d.member} onChange={e => set('member', e.target.value)}>{schedule.map(m => <option key={m.member} value={m.member}>{m.member} ({m.role})</option>)}</select></div>
          <div className="field"><label>Engagement</label><select className="select" value={d.eng} onChange={e => set('eng', e.target.value)}>{engs.map(x => { const c = cl.find(y => y.id === x.clientId); return <option key={x.id} value={x.id}>{x.id} · {(c?.name || '').replace('PT ', '')}</option>; })}</select></div>
          <div className="field"><label>Jam / Minggu</label><input className="input mono" type="number" value={d.hrs} onChange={e => set('hrs', +e.target.value)} style={{ textAlign: 'right' }} /></div>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn onClick={onClose}>Batal</Btn>
          <Btn variant="primary" disabled={!valid} style={{ opacity: valid ? 1 : .5 }} onClick={submit}><I.check size={14} /> Tambah Booking</Btn>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ResourceScheduler });
