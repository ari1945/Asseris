/* [codemod] ESM imports */
import React from 'react';
import { useNav } from './contexts.jsx';
import { I, MODULE_INDEX } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Donut, Panel, Seg, Stat } from './ui.jsx';
import { AddTaskForm, MT_BUCKETS, MT_PRIO_K, MT_PRIO_ORDER, MT_SRC_ICON, TaskRow, mtDueLabel, useMyTasks } from './view_mytasks_parts.jsx';

/* ============================================================
   NeoSuite AMS — My Tasks workspace (main):
   KPI strip · toolbar · List (master-detail) · Board · Focus
   ============================================================ */
const { useState: useStateMTV, useMemo: useMemoMTV } = React;

/* ---------------- Task detail panel ---------------- */
function TaskDetail({ t, mt, nav }) {
  const [newSub, setNewSub] = useStateMTV('');
  if (!t) {
    return (
      <Panel className="mt-detail">
        <div className="mt-detail-empty">
          <I.list size={30} style={{ marginBottom: 10, opacity: .5 }} />
          <div style={{ fontWeight: 600, color: 'var(--ink-3)' }}>Pilih tugas</div>
          <div className="tiny" style={{ marginTop: 4, maxWidth: 200 }}>Klik salah satu tugas untuk melihat detail, checklist, dan tindak lanjut.</div>
        </div>
      </Panel>
    );
  }
  const IconC = I[MT_SRC_ICON[t.src]] || I.flag;
  const mod = MODULE_INDEX[t.route];
  const toggleSub = (sid) => mt.setSub(t.id, t.sub.map(s => s.id === sid ? { ...s, done: !s.done } : s));
  const delSub = (sid) => mt.setSub(t.id, t.sub.filter(s => s.id !== sid));
  const addSub = () => { if (!newSub.trim()) return; mt.setSub(t.id, [...t.sub, { id: 'x' + Date.now(), t: newSub.trim(), done: false }]); setNewSub(''); };

  return (
    <Panel className="mt-detail" noBody>
      <div className="panel-h">
        <span className="mt-icobox" style={{ width: 24, height: 24, borderRadius: 6 }}><IconC size={13} /></span>
        <h3 style={{ fontSize: 12 }}>{t.src}{t.wpRef ? ' · WP ' + t.wpRef : ''}</h3>
        <div style={{ flex: 1 }} />
        <button className={'mt-star ' + (t.starred ? 'on' : '')} onClick={() => mt.toggleStar(t.id, t.starred)}><I.star size={16} fill={t.starred} /></button>
      </div>
      <div style={{ padding: 14, display: 'grid', gap: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: 'var(--ink)' }}>{t.label}</div>

        {/* status */}
        <div className="mt-kv">
          <label>Status</label>
          <Seg value={t.status} onChange={(v) => mt.setStatus(t.id, v)}
            options={[{ value: 'todo', label: 'Belum' }, { value: 'doing', label: 'Dikerjakan' }, { value: 'done', label: 'Selesai' }]} />
        </div>

        <div className="mt-meta-grid">
          <div className="mt-kv">
            <label>Prioritas</label>
            <div className="row ac gap8"><Badge kind={MT_PRIO_K[t.priority]}>{t.priority}</Badge></div>
          </div>
          <div className="mt-kv">
            <label>Jatuh Tempo</label>
            <span className={'mt-due ' + (t.bucket === 'overdue' ? 'over' : t.bucket === 'today' ? 'today' : '')} style={{ fontSize: 12.5 }}>
              <I.calendar size={12} /> {t.due.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <div className="mt-kv">
            <label>Estimasi</label>
            <span className="mono" style={{ fontWeight: 600 }}>{t.est != null ? t.est + ' jam' : '—'}</span>
          </div>
          <div className="mt-kv">
            <label>Engagement</label>
            <span className="mono tiny" style={{ fontWeight: 600 }}>{t.engagement || '—'}</span>
          </div>
        </div>

        {/* subtasks */}
        <div>
          <div className="row jb ac" style={{ marginBottom: 4 }}>
            <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink-4)' }}>Checklist</label>
            {t.subTotal > 0 && <span className="tiny muted mono">{t.subDone}/{t.subTotal}</span>}
          </div>
          {t.subTotal > 0 && <div className="mt-mini" style={{ height: 5, marginBottom: 8 }}><span style={{ width: Math.round(t.progress * 100) + '%', background: t.progress === 1 ? 'var(--green)' : 'var(--blue)' }} /></div>}
          <div>
            {t.sub.map(s => (
              <div key={s.id} className="mt-sub">
                <button className={'mt-sub-box ' + (s.done ? 'on' : '')} onClick={() => toggleSub(s.id)}>{s.done && <I.check size={11} />}</button>
                <span className={'mt-sub-text ' + (s.done ? 'done' : '')}>{s.t}</span>
                <button className="mt-sub-del" onClick={() => delSub(s.id)}><I.trash size={13} /></button>
              </div>
            ))}
          </div>
          <div className="row gap6" style={{ marginTop: 8 }}>
            <input className="input" style={{ flex: 1, height: 26, fontSize: 12 }} value={newSub} placeholder="Tambah langkah…"
              onChange={e => setNewSub(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addSub(); }} />
            <Btn sm onClick={addSub}><I.plus size={13} /></Btn>
          </div>
        </div>

        {/* note */}
        <div className="mt-kv">
          <label>Catatan</label>
          <textarea className="input" value={t.note} placeholder="Tambah catatan pribadi…"
            onChange={e => mt.setNote(t.id, e.target.value)}
            style={{ height: 60, padding: 8, resize: 'vertical', lineHeight: 1.5, fontFamily: 'var(--ui)' }} />
        </div>

        <div className="row gap8">
          <Btn sm variant="primary" style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => { if (t.wpRef) { try { localStorage.setItem('ams.wpOpen', t.wpRef); } catch (e) {} } nav(t.route); }}>
            <I.arrowRight size={14} /> Buka {mod ? mod.label : 'modul'}
          </Btn>
          {t.personal && <Btn sm onClick={() => mt.removePersonal(t.id)} title="Hapus tugas pribadi"><I.trash size={14} /></Btn>}
        </div>
      </div>
    </Panel>
  );
}

/* ---------------- Kanban card ---------------- */
function BoardCard({ t, mt, onSelect, onDragStart, onDragEnd, dragging }) {
  const IconC = I[MT_SRC_ICON[t.src]] || I.flag;
  return (
    <div className={`mt-card p-${t.priority} ${dragging ? 'dragging' : ''}`} draggable
      onDragStart={(e) => onDragStart(e, t.id)} onDragEnd={onDragEnd} onClick={() => onSelect(t.id)}>
      <div className="row ac gap6" style={{ marginBottom: 6 }}>
        <span className="mt-icobox" style={{ width: 20, height: 20, borderRadius: 5 }}><IconC size={11} /></span>
        <span className="tiny muted" style={{ fontWeight: 600 }}>{t.src}{t.wpRef ? ' · ' + t.wpRef : ''}</span>
        <div style={{ flex: 1 }} />
        {t.starred && <I.star size={13} fill style={{ color: '#d9a400' }} />}
      </div>
      <div className="mt-card-title">{t.label}</div>
      {t.subTotal > 0 && (
        <div className="row ac gap6" style={{ marginBottom: 6 }}>
          <div className="mt-mini"><span style={{ width: Math.round(t.progress * 100) + '%', background: t.progress === 1 ? 'var(--green)' : 'var(--blue)' }} /></div>
          <span className="tiny muted mono">{t.subDone}/{t.subTotal}</span>
        </div>
      )}
      <div className="mt-card-foot">
        <Badge kind={MT_PRIO_K[t.priority]}>{t.priority}</Badge>
        <span className={'mt-due ' + (t.bucket === 'overdue' ? 'over' : t.bucket === 'today' ? 'today' : '')}><I.clock size={11} /> {mtDueLabel(t)}</span>
      </div>
    </div>
  );
}

/* ---------------- Main view ---------------- */
function MyTasks() {
  const nav = useNav();
  const mt = useMyTasks();
  const [view, setView] = window.useAmsPersist('mt.view', 'list');
  const [groupBy, setGroupBy] = useStateMTV('due');
  const [source, setSource] = useStateMTV('all');
  const [q, setQ] = useStateMTV('');
  const [sel, setSel] = useStateMTV(null);
  const [adding, setAdding] = useStateMTV(false);
  const [drag, setDrag] = useStateMTV(null);
  const [dropCol, setDropCol] = useStateMTV(null);

  const sources = ['all', 'Review Note', 'Catatan WP', 'AJE', 'Working Paper', 'Deadline', 'Pribadi'];
  const filtered = useMemoMTV(() => {
    let list = mt.tasks;
    if (source !== 'all') list = list.filter(t => t.src === source);
    if (q.trim()) { const k = q.toLowerCase(); list = list.filter(t => t.label.toLowerCase().includes(k) || t.src.toLowerCase().includes(k)); }
    return list;
  }, [mt.tasks, source, q]);

  const active = mt.tasks.filter(t => !t.done);
  const stats = {
    active: active.length,
    overdue: active.filter(t => t.bucket === 'overdue').length,
    today: active.filter(t => t.bucket === 'today').length,
    doing: mt.tasks.filter(t => t.status === 'doing').length,
    done: mt.tasks.filter(t => t.done).length,
    estWeek: active.filter(t => ['overdue', 'today', 'tomorrow', 'week'].includes(t.bucket)).reduce((s, t) => s + (t.est || 0), 0),
  };
  const total = mt.tasks.length || 1;
  const donePct = Math.round(stats.done / total * 100);

  const selTask = mt.tasks.find(t => t.id === sel) || null;

  /* grouping for list */
  const groups = useMemoMTV(() => {
    const sortFn = (a, b) => (a.done - b.done) || (a.dayDiff - b.dayDiff) || (MT_PRIO_ORDER[a.priority] - MT_PRIO_ORDER[b.priority]);
    if (groupBy === 'priority') {
      const prioAccent = { high: 'var(--red)', medium: 'var(--amber)', low: 'var(--ink-3)' };
      return ['high', 'medium', 'low'].map(p => ({ key: p, label: p.toUpperCase(), accent: prioAccent[p], items: filtered.filter(t => t.priority === p && !t.done).sort(sortFn) }))
        .concat([{ key: 'done', label: 'SELESAI', accent: 'var(--green)', items: filtered.filter(t => t.done) }]);
    }
    if (groupBy === 'source') {
      return sources.slice(1).map(s => ({ key: s, label: s, accent: 'var(--ink-2)', items: filtered.filter(t => t.src === s).sort(sortFn) }));
    }
    return MT_BUCKETS.map(b => ({ key: b.id, label: b.label, accent: b.accent, items: filtered.filter(t => t.bucket === b.id).sort(sortFn) }));
  }, [filtered, groupBy]);

  /* board columns by status */
  const cols = [
    { id: 'todo', label: 'Belum Mulai', dot: 'var(--ink-4)' },
    { id: 'doing', label: 'Sedang Dikerjakan', dot: 'var(--blue)' },
    { id: 'done', label: 'Selesai', dot: 'var(--green)' },
  ];
  const onDrop = (e, status) => { e.preventDefault(); if (drag) mt.setStatus(drag, status); setDrag(null); setDropCol(null); };

  /* focus = overdue + today + starred + doing, not done */
  const focus = active.filter(t => ['overdue', 'today'].includes(t.bucket) || t.starred || t.status === 'doing')
    .sort((a, b) => (b.starred - a.starred) || (a.dayDiff - b.dayDiff));
  const focusEst = focus.reduce((s, t) => s + (t.est || 0), 0);

  return (
    <>
      <SubBar moduleId="tasks" right={
        <div className="row gap8 ac">
          <Badge kind={stats.overdue ? 'red' : stats.active ? 'amber' : 'green'}>{stats.active} aktif</Badge>
          <Btn sm variant="primary" onClick={() => setAdding(a => !a)}><I.plus size={14} /> Tugas Baru</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        {/* KPI strip */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr) 1.3fr', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={stats.active} label="Tugas Aktif" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={stats.overdue} label="Terlambat" accent="var(--red)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={stats.today} label="Jatuh Tempo Hari Ini" accent="var(--amber)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={stats.doing} label="Dikerjakan" accent="var(--blue)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={stats.done} label="Selesai" accent="var(--green)" /></div></Panel>
          <Panel>
            <div style={{ padding: '11px 14px' }}>
              <div className="row jb tiny" style={{ marginBottom: 6 }}><span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink-3)', fontSize: 10.5 }}>Penyelesaian</span><span className="mono" style={{ fontWeight: 700, color: 'var(--navy)' }}>{donePct}%</span></div>
              <div className="mt-mini" style={{ height: 8 }}><span style={{ width: donePct + '%', background: 'var(--green)' }} /></div>
              <div className="tiny muted" style={{ marginTop: 7 }}>Estimasi beban minggu ini: <b className="mono" style={{ color: 'var(--ink)' }}>{stats.estWeek.toFixed(1)} jam</b></div>
            </div>
          </Panel>
        </div>

        {adding && <AddTaskForm mt={mt} onClose={() => setAdding(false)} />}

        {/* toolbar */}
        <div className="mt-toolbar">
          <Seg value={view} onChange={setView} options={[
            { value: 'list', label: 'Daftar' }, { value: 'board', label: 'Papan' }, { value: 'focus', label: 'Fokus' },
          ]} />
          <div style={{ width: 1, height: 22, background: 'var(--line)' }} />
          {view === 'list' && (
            <Seg value={groupBy} onChange={setGroupBy} options={[
              { value: 'due', label: 'per Jatuh Tempo' }, { value: 'priority', label: 'per Prioritas' }, { value: 'source', label: 'per Sumber' },
            ]} />
          )}
          <div style={{ flex: 1 }} />
          <div className="mt-search"><I.search2 size={14} /><input value={q} placeholder="Cari tugas…" onChange={e => setQ(e.target.value)} />{q && <button className="mt-sub-del" onClick={() => setQ('')}><I.x size={13} /></button>}</div>
          <select className="select" value={source} onChange={e => setSource(e.target.value)} style={{ flex: '0 0 auto' }}>
            {sources.map(s => <option key={s} value={s}>{s === 'all' ? 'Semua Sumber' : s}</option>)}
          </select>
        </div>

        {/* ---------- LIST (master-detail) ---------- */}
        {view === 'list' && (
          <div className="mt-split">
            <div>
              {groups.filter(g => g.items.length).map(g => (
                <div key={g.key}>
                  <div className="mt-group-h"><span style={{ color: g.accent }}>{g.label}</span><span className="cnt">{g.items.length}</span><span className="ln" /></div>
                  {g.items.map(t => <TaskRow key={t.id} t={t} selected={sel === t.id} onSelect={setSel} mt={mt} />)}
                </div>
              ))}
              {!filtered.length && <div className="muted tiny" style={{ padding: 36, textAlign: 'center' }}><I.checkCircle size={26} style={{ color: 'var(--green)', display: 'block', margin: '0 auto 8px' }} />Tidak ada tugas yang cocok.</div>}
            </div>
            <TaskDetail t={selTask} mt={mt} nav={nav} />
          </div>
        )}

        {/* ---------- BOARD (kanban) ---------- */}
        {view === 'board' && (
          <div className="mt-board">
            {cols.map(c => {
              const items = filtered.filter(t => t.status === c.id).sort((a, b) => a.dayDiff - b.dayDiff);
              return (
                <div key={c.id} className={'mt-col ' + (dropCol === c.id ? 'drop-on' : '')}
                  onDragOver={e => { e.preventDefault(); setDropCol(c.id); }}
                  onDragLeave={e => { if (e.currentTarget === e.target) setDropCol(null); }}
                  onDrop={e => onDrop(e, c.id)}>
                  <div className="mt-col-h"><span className="dot" style={{ background: c.dot }} /><span className="ttl">{c.label}</span><span className="cnt">{items.length}</span></div>
                  <div className="mt-col-body">
                    {items.map(t => <BoardCard key={t.id} t={t} mt={mt} onSelect={setSel} dragging={drag === t.id}
                      onDragStart={(e, id) => { setDrag(id); e.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => { setDrag(null); setDropCol(null); }} />)}
                    {!items.length && <div className="mt-col-empty">Tarik tugas ke sini</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ---------- FOCUS ---------- */}
        {view === 'focus' && (
          <div className="mt-split">
            <div>
              <Panel noBody style={{ marginBottom: 12 }}>
                <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 20, background: 'linear-gradient(120deg,#013a52,#005085)', color: '#fff', borderRadius: 'var(--radius) var(--radius) 0 0' }}>
                  <Donut size={84} thickness={11}
                    segments={[{ value: stats.done, color: '#4db8ff' }, { value: Math.max(0, total - stats.done), color: 'rgba(255,255,255,.18)' }]}
                    center={<div><div style={{ fontSize: 19, fontWeight: 800, fontFamily: 'var(--mono)' }}>{donePct}%</div></div>} />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>Fokus Hari Ini</div>
                    <div style={{ fontSize: 12.5, color: '#bcd6e4', marginTop: 3 }}>{focus.length} tugas prioritas · estimasi <b style={{ color: '#fff' }}>{focusEst.toFixed(1)} jam</b></div>
                    <div className="row gap8" style={{ marginTop: 9 }}>
                      <span className="badge b-red" style={{ background: 'rgba(255,107,87,.22)', color: '#ffd2c9' }}>{stats.overdue} terlambat</span>
                      <span className="badge" style={{ background: 'rgba(255,255,255,.16)', color: '#fff' }}>{stats.today} hari ini</span>
                    </div>
                  </div>
                </div>
                <div style={{ padding: '11px 12px 5px' }}>
                  {focus.map(t => <TaskRow key={t.id} t={t} selected={sel === t.id} onSelect={setSel} mt={mt} />)}
                  {!focus.length && <div className="muted tiny" style={{ padding: 30, textAlign: 'center' }}><I.checkCircle size={26} style={{ color: 'var(--green)', display: 'block', margin: '0 auto 8px' }} />Tidak ada yang mendesak. Kerja bagus! 🎉</div>}
                </div>
              </Panel>
            </div>
            <TaskDetail t={selTask} mt={mt} nav={nav} />
          </div>
        )}

      </div></div>
    </>
  );
}

Object.assign(window, { MyTasks, TaskDetail, BoardCard });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { BoardCard, MyTasks, TaskDetail };
