/* [codemod] ESM imports */
import React from 'react';
import { useAudit, useFirm } from './contexts.jsx';
import { I, MODULES } from './icons.jsx';
import { Badge, Btn, Panel } from './ui.jsx';

/* ============================================================
   NeoSuite AMS — My Tasks workspace (parts):
   data hook, task row, detail panel, kanban card, add-form
   ============================================================ */
const { useState: useStateMT, useMemo: useMemoMT, useRef: useRefMT } = React;

/* "today" anchored to the engagement fieldwork window (data is March 2026) */
const MT_TODAY = new Date('2026-03-09T00:00:00');
const MT_DAY = 86400000;
const mtStartOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const mtAddDays = (d, n) => new Date(mtStartOfDay(d).getTime() + n * MT_DAY);
const MT_PRIO_K = { high: 'red', medium: 'amber', low: 'gray' };
const MT_PRIO_ORDER = { high: 0, medium: 1, low: 2 };
const MT_SRC_ICON = { 'Review Note': 'doc', 'Catatan WP': 'layers', 'AJE': 'ledger', 'Working Paper': 'layers', 'Deadline': 'clock', 'Pribadi': 'flag' };
const MT_STATUS = {
  todo:  { label: 'Belum Mulai', color: 'var(--ink-4)', kind: 'gray' },
  doing: { label: 'Dikerjakan', color: 'var(--blue)', kind: 'blue' },
  done:  { label: 'Selesai', color: 'var(--green)', kind: 'green' },
};
const MT_BUCKETS = [
  { id: 'overdue', label: 'Terlambat', accent: 'var(--red)' },
  { id: 'today',   label: 'Jatuh Tempo Hari Ini', accent: 'var(--amber)' },
  { id: 'tomorrow',label: 'Besok', accent: 'var(--ink-2)' },
  { id: 'week',    label: 'Minggu Ini', accent: 'var(--ink-2)' },
  { id: 'later',   label: 'Mendatang', accent: 'var(--ink-3)' },
  { id: 'done',    label: 'Selesai', accent: 'var(--green)' },
];

/* synthetic due-day offsets & effort estimates by source */
function mtSystemTasks(audit) {
  const { deadlines, aje, wpState, workpapers } = audit;
  const reviewNotes = audit.reviewNotesActive || audit.reviewNotes || [];  // P5 Fase 2: catatan engagement aktif
  const me = 'Anindya P.';
  const out = [];
  const rnOff = { high: 1, medium: 3, low: 6 };
  reviewNotes.filter(n => n.status === 'open' && n.to === me).forEach(n => out.push({
    id: 'rn-' + n.id, src: 'Review Note', label: n.text, route: n.module, priority: n.priority,
    dueOffset: rnOff[n.priority] ?? 3, est: 1.5, from: n.author,
    sub: [{ id: 's1', t: 'Tinjau catatan & konteks', done: false }, { id: 's2', t: 'Dokumentasikan tanggapan', done: false }, { id: 's3', t: 'Tandai selesai ke reviewer', done: false }],
  }));
  const wpNotes = window.collectWpNotes ? window.collectWpNotes(wpState) : [];
  wpNotes.filter(n => n.status === 'open' && (n.to === me || n.author === me)).forEach(n => out.push({
    id: 'wn-' + n.id, src: 'Catatan WP', label: n.text, route: 'workpapers', wpRef: n.wpRef,
    priority: n.priority, dueOffset: 2, est: 2, from: n.author,
    sub: [{ id: 's1', t: 'Buka kertas kerja ' + n.wpRef, done: false }, { id: 's2', t: 'Lakukan tindak lanjut', done: false }],
  }));
  aje.filter(a => a.status === 'Proposed').forEach(a => out.push({
    id: 'aje-' + a.id, src: 'AJE', label: `Tindak lanjuti ${a.id}: ${a.desc}`, route: 'aje',
    priority: 'medium', dueOffset: 4, est: 2, defaultStatus: 'doing',
    sub: [{ id: 's1', t: 'Validasi dasar jurnal', done: false }, { id: 's2', t: 'Diskusi dengan klien', done: false }, { id: 's3', t: 'Posting / tolak', done: false }],
  }));
  workpapers.filter(w => w.reviewer === '—' || w.status === 'In Progress').forEach(w => out.push({
    id: 'wp-' + w.ref, src: 'Working Paper', label: `Selesaikan WP ${w.ref} — ${w.title}`, route: 'workpapers',
    wpRef: w.ref, priority: 'medium', dueOffset: 5, est: 4, defaultStatus: w.status === 'In Progress' ? 'doing' : 'todo',
  }));
  (deadlines || []).slice(0, 4).forEach((d, i) => out.push({
    id: 'dl-' + i, src: 'Deadline', label: `${d.task} — ${d.client}`, route: 'cockpit',
    priority: d.sev === 'red' ? 'high' : d.sev === 'amber' ? 'medium' : 'low', dueOffset: d.days, est: 3,
  }));
  return out;
}

/* combine system + personal tasks with persisted per-task meta */
function useMyTasks() {
  const audit = useAudit();
  const firm = useFirm();
  const [meta, setMeta] = window.useAmsPersist('mt.meta', {});
  const [personal, setPersonal] = window.useAmsPersist('mt.personal', []);
  const engId = firm.activeEngagement ? firm.activeEngagement.id : '';

  const system = useMemoMT(() => mtSystemTasks(audit),
    [audit.reviewNotesActive, audit.aje, audit.workpapers, audit.deadlines, audit.wpState]);

  const tasks = useMemoMT(() => {
    const decorate = (base) => {
      const m = meta[base.id] || {};
      const status = m.status || base.defaultStatus || 'todo';
      const due = base.dueDate ? new Date(base.dueDate + 'T00:00:00') : mtAddDays(MT_TODAY, base.dueOffset != null ? base.dueOffset : 7);
      const dayDiff = Math.round((mtStartOfDay(due) - mtStartOfDay(MT_TODAY)) / MT_DAY);
      const sub = m.sub || base.sub || [];
      const subDone = sub.filter(s => s.done).length;
      const done = status === 'done';
      const bucket = done ? 'done' : dayDiff < 0 ? 'overdue' : dayDiff === 0 ? 'today' : dayDiff === 1 ? 'tomorrow' : dayDiff <= 7 ? 'week' : 'later';
      return {
        ...base, status, done, starred: !!m.starred, sub, subDone, subTotal: sub.length,
        note: m.note != null ? m.note : (base.note || ''), est: m.est != null ? m.est : base.est,
        due, dayDiff, bucket, engagement: base.personal && base.engagement === false ? '' : engId,
        progress: sub.length ? subDone / sub.length : (done ? 1 : status === 'doing' ? 0.4 : 0),
      };
    };
    return [...system.map(decorate), ...personal.map(p => decorate({ ...p, personal: true }))];
  }, [system, personal, meta, engId]);

  const update = (id, patch) => setMeta(m => ({ ...m, [id]: { ...(m[id] || {}), ...patch } }));
  const setStatus = (id, status) => update(id, { status });
  const cycleDone = (id, cur) => update(id, { status: cur === 'done' ? 'todo' : 'done' });
  const toggleStar = (id, cur) => update(id, { starred: !cur });
  const setSub = (id, sub) => update(id, { sub });
  const setNote = (id, note) => update(id, { note });
  const addPersonal = (t) => setPersonal(list => [{ id: 'p-' + Date.now(), created: 'baru saja', ...t }, ...list]);
  const removePersonal = (id) => { setPersonal(list => list.filter(p => p.id !== id)); setMeta(m => { const n = { ...m }; delete n[id]; return n; }); };

  return { tasks, meta, update, setStatus, cycleDone, toggleStar, setSub, setNote, addPersonal, removePersonal };
}

/* due chip text */
function mtDueLabel(t) {
  if (t.done) return 'Selesai';
  if (t.dayDiff < 0) return `Terlambat ${-t.dayDiff} hari`;
  if (t.dayDiff === 0) return 'Hari ini';
  if (t.dayDiff === 1) return 'Besok';
  const d = t.due.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
  return d;
}

/* status checkbox: click to cycle done/undone (long-list quick toggle) */
function TaskCheck({ status, onClick, size = 18 }) {
  return (
    <button className={'mt-check ' + status} onClick={(e) => { e.stopPropagation(); onClick(); }} title="Tandai selesai"
      style={{ width: size, height: size }}>
      {status === 'done' ? <I.check size={12} /> : status === 'doing' ? <I.play size={9} style={{ color: '#fff' }} /> : null}
    </button>
  );
}

/* compact list row (master) */
function TaskRow({ t, selected, onSelect, mt }) {
  const IconC = I[MT_SRC_ICON[t.src]] || I.flag;
  return (
    <div className={`mt-row p-${t.priority} ${selected ? 'sel' : ''} ${t.done ? 'is-done' : ''}`} onClick={() => onSelect(t.id)}>
      <TaskCheck status={t.status} onClick={() => mt.cycleDone(t.id, t.status)} />
      <span className="mt-icobox"><IconC size={14} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="mt-row-title">{t.label}</div>
        <div className="mt-row-meta">
          <span className="chip tiny" style={{ height: 17 }}>{t.src}</span>
          <span className={'mt-due ' + (t.bucket === 'overdue' ? 'over' : t.bucket === 'today' ? 'today' : '')}>
            <I.clock size={11} /> {mtDueLabel(t)}
          </span>
          {t.subTotal > 0 && <span className="tiny muted row ac gap6"><I.checkCircle size={11} /> {t.subDone}/{t.subTotal}</span>}
          {t.status === 'doing' && <Badge kind="blue">Dikerjakan</Badge>}
        </div>
      </div>
      <button className={'mt-star ' + (t.starred ? 'on' : '')} title="Bintangi"
        onClick={(e) => { e.stopPropagation(); mt.toggleStar(t.id, t.starred); }}>
        <I.star size={15} fill={t.starred} />
      </button>
      <Badge kind={MT_PRIO_K[t.priority]}>{t.priority}</Badge>
    </div>
  );
}

/* add-personal-task inline form */
function AddTaskForm({ mt, onClose }) {
  const [d, setD] = useStateMT({ label: '', priority: 'medium', dueDate: mtAddDays(MT_TODAY, 2).toISOString().slice(0, 10), route: 'cockpit', est: '2' });
  const modules = MODULES.flatMap(g => g.items).filter(m => m.deep);
  const submit = () => {
    if (!d.label.trim()) return;
    mt.addPersonal({ label: d.label.trim(), priority: d.priority, dueDate: d.dueDate, route: d.route, src: 'Pribadi', est: +d.est || undefined, sub: [] });
    onClose();
  };
  return (
    <Panel noBody style={{ marginBottom: 12 }}>
      <div className="panel-h"><h3>Tugas Pribadi Baru</h3><div style={{ flex: 1 }} /><button className="mt-sub-del" onClick={onClose}><I.x size={15} /></button></div>
      <div style={{ padding: 14, display: 'grid', gap: 10 }}>
        <input className="input" autoFocus value={d.label} placeholder="Apa yang perlu dikerjakan?"
          onChange={e => setD(s => ({ ...s, label: e.target.value }))}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }} />
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 0.7fr', gap: 10 }}>
          <div className="field"><label>Prioritas</label><select className="select" value={d.priority} onChange={e => setD(s => ({ ...s, priority: e.target.value }))}>{['high', 'medium', 'low'].map(p => <option key={p} value={p}>{p}</option>)}</select></div>
          <div className="field"><label>Jatuh Tempo</label><input className="input mono" type="date" value={d.dueDate} onChange={e => setD(s => ({ ...s, dueDate: e.target.value }))} /></div>
          <div className="field"><label>Tautan Modul</label><select className="select" value={d.route} onChange={e => setD(s => ({ ...s, route: e.target.value }))}>{modules.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></div>
          <div className="field"><label>Estimasi (j)</label><input className="input mono" type="number" min="0" step="0.5" value={d.est} onChange={e => setD(s => ({ ...s, est: e.target.value }))} style={{ textAlign: 'right' }} /></div>
        </div>
        <div className="row je gap8"><Btn sm onClick={onClose}>Batal</Btn><Btn sm variant="primary" onClick={submit}><I.plus size={13} /> Tambah Tugas</Btn></div>
      </div>
    </Panel>
  );
}

Object.assign(window, {
  MT_TODAY, MT_PRIO_K, MT_PRIO_ORDER, MT_SRC_ICON, MT_STATUS, MT_BUCKETS,
  mtAddDays, mtStartOfDay, mtDueLabel, useMyTasks, TaskCheck, TaskRow, AddTaskForm,
});


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { AddTaskForm, MT_BUCKETS, MT_PRIO_K, MT_PRIO_ORDER, MT_SRC_ICON, MT_STATUS, MT_TODAY, TaskCheck, TaskRow, mtAddDays, mtDueLabel, mtStartOfDay, useMyTasks };
