/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAudit, useFirm, useNav } from './contexts';
import { I, MODULES, MODULE_INDEX } from './icons';
import { SubBar } from './shell';
import { Avatar, Badge, Btn, Panel, Seg } from './ui';

/* ============================================================
   Asseris — Review Notes (review-clearance workspace)
   Threaded notes · type taxonomy · open→responded→cleared
   workflow · aging & SLA · clearance-readiness gate (ISA 230 /
   ISQM 1) · grouping · master–detail conversation
   ============================================================ */
const { useState: useStateWS2, useMemo: useMemoWS2 } = React;

/* ---- reference "today" for the active engagement (aligns with WP sign-offs) ---- */
const RN_TODAY = new Date(2026, 2, 9); // 09 Mar 2026
const RN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const RN_fmtDate = (iso) => { if (!iso) return '—'; const d = new Date(iso); return `${d.getDate()} ${RN_MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
const RN_days = (iso, ref = RN_TODAY) => { if (!iso) return null; return Math.round((+ref - +new Date(iso)) / 86400000); };

/* ---- note-type taxonomy ---- */
const RN_TYPES = {
  review:   { label: 'Review Note',   short: 'Review',   kind: 'blue',   icon: 'flag',    desc: 'Catatan telaah manajer/partner atas kertas kerja' },
  coaching: { label: 'Coaching Note', short: 'Coaching', kind: 'teal',   icon: 'sparkle', desc: 'Pembinaan & pengembangan staf (tidak wajib dikliring formal)' },
  eqr:      { label: 'EQR Note',      short: 'EQR',      kind: 'purple', icon: 'shield',  desc: 'Catatan penelaah pengendalian mutu perikatan (PIE)' },
  query:    { label: 'Query',         short: 'Query',    kind: 'amber',  icon: 'search2', desc: 'Pertanyaan/klarifikasi yang menunggu jawaban' },
};
const RN_PRIO = { high: { k: 'red', label: 'Tinggi' }, medium: { k: 'amber', label: 'Sedang' }, low: { k: 'gray', label: 'Rendah' } };
const RN_PRIO_ORDER = { high: 0, medium: 1, low: 2 };

/* ---- people → role (for thread attribution) ---- */
const RN_ROLE = {
  'Hartono Wijaya': 'Engagement Partner', 'Hartono W.': 'Engagement Partner',
  'Anindya Pramesti': 'Audit Manager', 'Anindya P.': 'Audit Manager',
  'Sari Dewanti': 'EQR · Penelaah Mutu',
  'Dimas Raharjo': 'Senior Auditor', 'Dimas R.': 'Senior Auditor',
  'Sinta Wulandari': 'Senior Auditor', 'Sinta W.': 'Senior Auditor',
  'Fajar Nugroho': 'Junior Auditor', 'Fajar N.': 'Junior Auditor',
  'Rina Kusuma': 'Junior Auditor', 'Rina K.': 'Junior Auditor',
};
const RN_roleOf = (n) => RN_ROLE[n] || 'Tim Audit';
const RN_ME = 'Anindya P.'; // current user (Audit Manager)
const RN_ASSIGNEES = ['Dimas R.', 'Sinta W.', 'Fajar N.', 'Rina K.', 'Anindya P.'];

/* phase of a note from status + whether the preparer has responded */
function RN_phase(n, thread) {
  if (n.status === 'resolved') return 'cleared';
  return thread.some(m => m.kind === 'response') ? 'responded' : 'open';
}
const RN_PHASE_META = {
  open:      { label: 'Terbuka',      kind: 'amber', dot: 'var(--amber)' },
  responded: { label: 'Direspons',    kind: 'blue',  dot: 'var(--blue)' },
  cleared:   { label: 'Dikliring',    kind: 'green', dot: 'var(--green)' },
};

/* ---------------- Review Notes ---------------- */
function ReviewNotes() {
  const nav = useNav();
  const firm = useFirm();
  const { reviewNotesActive, addReviewNote, resolveReviewNote, updateReviewNote, noteThreads, addNoteReply, wpState, setWp } = useAudit();  // P5 Fase 2: catatan engagement aktif

  const [statusF, setStatusF] = useStateWS2('open');      // open | resolved | all
  const [typeF, setTypeF] = useStateWS2('all');           // all | review | coaching | eqr | query
  const [sourceF, setSourceF] = useStateWS2('all');       // all | module | wp
  const [assigneeF, setAssigneeF] = useStateWS2('all');
  const [groupBy, setGroupBy] = useStateWS2('none');      // none | reviewer | assignee | module | type | priority
  const [q, setQ] = useStateWS2('');
  const [selId, setSelId] = useStateWS2(null);
  const [showForm, setShowForm] = useStateWS2(false);
  const [composer, setComposer] = useStateWS2('');
  const [draft, setDraft] = useStateWS2({ text: '', type: 'review', module: 'wtb', wpRef: 'B', to: 'Dimas R.', priority: 'medium', due: '2026-03-14', ref: '' });

  const wpRefs = window.WP_REFS || [];
  const seedById = useMemoWS2(() => Object.fromEntries(((AMS as any).REVIEW_NOTES || []).map((n: any) => [n.id, n])), []);

  /* unified, enriched note list (module + WP), with merged seed metadata */
  const allNotes = useMemoWS2(() => {
    const moduleNotes = reviewNotesActive.map(n => ({ type: 'review', thread: [], ...(seedById[n.id] || {}), ...n, wp: false }));
    const wpNotes = (window.collectWpNotes ? window.collectWpNotes(wpState) : []).map(n => ({ type: 'review', thread: [], ...n }));
    return [...moduleNotes, ...wpNotes];
  }, [reviewNotesActive, wpState, seedById]);

  const threadOf = (n) => [...(n.thread || []), ...((noteThreads || {})[n.id] || [])];

  /* annotate each note with derived fields */
  const notes = useMemoWS2(() => allNotes.map(n => {
    const thread = threadOf(n);
    const phase = RN_phase(n, thread);
    const due = n.due || null;
    const dd = RN_days(due);
    const overdue = phase !== 'cleared' && dd != null && dd > 0;
    return { ...n, _thread: thread, _phase: phase, _replies: thread.length, _age: RN_days(n.raised), _overdue: overdue, _dueIn: dd != null ? -dd : null };
  }), [allNotes, noteThreads]);

  /* filtering */
  const filtered = useMemoWS2(() => {
    let l = notes;
    if (statusF === 'open') l = l.filter(n => n.status === 'open');
    else if (statusF === 'resolved') l = l.filter(n => n.status === 'resolved');
    if (typeF !== 'all') l = l.filter(n => n.type === typeF);
    if (sourceF === 'module') l = l.filter(n => !n.wp);
    else if (sourceF === 'wp') l = l.filter(n => n.wp);
    if (assigneeF !== 'all') l = l.filter(n => n.to === assigneeF);
    if (q.trim()) { const s = q.toLowerCase(); l = l.filter(n => (n.text + ' ' + n.author + ' ' + n.to + ' ' + (n.moduleLabel || '') + ' ' + (n.ref || '')).toLowerCase().includes(s)); }
    /* sort: open first, then high priority, then most overdue */
    return [...l].sort((a, b) =>
      (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1) ||
      RN_PRIO_ORDER[a.priority] - RN_PRIO_ORDER[b.priority] ||
      (b._overdue - a._overdue) ||
      ((a._dueIn ?? 999) - (b._dueIn ?? 999)));
  }, [notes, statusF, typeF, sourceF, assigneeF, q]);

  /* selection */
  const selected = useMemoWS2(() => filtered.find(n => (n.wp ? 'wp-' : 'm-') + n.id === selId) || notes.find(n => (n.wp ? 'wp-' : 'm-') + n.id === selId) || filtered[0] || null, [filtered, notes, selId]);
  const selKey = selected ? (selected.wp ? 'wp-' : 'm-') + selected.id : null;
  React.useEffect(() => { if (selected && selId !== selKey) setSelId(selKey); }, [selKey]);

  /* portfolio metrics (clearance gate) — coaching notes excluded from mandatory clearance */
  const M = useMemoWS2(() => {
    const open = notes.filter(n => n.status === 'open');
    const mustClear = notes.filter(n => n.type !== 'coaching'); // review/eqr/query require formal clearance
    const clearedMust = mustClear.filter(n => n.status === 'resolved');
    const blocking = open.filter(n => n.type !== 'coaching');
    return {
      total: notes.length,
      open: open.length,
      responded: open.filter(n => n._phase === 'responded').length,
      awaiting: open.filter(n => n._phase === 'open').length,
      high: open.filter(n => n.priority === 'high').length,
      overdue: open.filter(n => n._overdue).length,
      wp: notes.filter(n => n.wp && n.status === 'open').length,
      eqrOpen: open.filter(n => n.type === 'eqr').length,
      clearedPct: mustClear.length ? Math.round(clearedMust.length / mustClear.length * 100) : 100,
      mustClear: mustClear.length, clearedMust: clearedMust.length, blocking: blocking.length,
    };
  }, [notes]);

  /* aging buckets over OPEN notes */
  const aging = useMemoWS2(() => {
    const b = [{ k: '0–2 hari', n: 0, c: 'var(--green)' }, { k: '3–5 hari', n: 0, c: 'var(--amber)' }, { k: '6–10 hari', n: 0, c: '#c97a16' }, { k: '>10 hari', n: 0, c: 'var(--red)' }];
    notes.filter(n => n.status === 'open').forEach(n => { const a = n._age ?? 0; if (a <= 2) b[0].n++; else if (a <= 5) b[1].n++; else if (a <= 10) b[2].n++; else b[3].n++; });
    return b;
  }, [notes]);

  /* grouping for the list */
  const groups = useMemoWS2(() => {
    if (groupBy === 'none') return [{ key: '', label: '', items: filtered }];
    const keyFn = {
      reviewer: n => n.author, assignee: n => n.to, module: n => n.moduleLabel,
      type: n => RN_TYPES[n.type]?.label || n.type, priority: n => RN_PRIO[n.priority]?.label || n.priority,
    }[groupBy];
    const map = new Map();
    filtered.forEach(n => { const k = keyFn(n); if (!map.has(k)) map.set(k, []); map.get(k).push(n); });
    return [...map.entries()].map(([label, items]) => ({ key: label, label, items }));
  }, [filtered, groupBy]);

  /* ---- actions ---- */
  const toggleClear = (n, withMsg) => {
    if (n.type === 'coaching' && n.status === 'open') { /* coaching: just mark acknowledged */ }
    if (n.wp) {
      const ns = (wpState[n.wpRef] || {}).noteStatus || {};
      setWp(n.wpRef, { noteStatus: { ...ns, [n.id]: n.status === 'open' ? 'resolved' : 'open' } });
    } else resolveReviewNote(n.id);
    if (withMsg) addNoteReply(n.id, withMsg);
  };
  const clearNote = (n) => toggleClear(n, { author: RN_ME, kind: 'clear', text: 'Catatan ditelaah & dikliring.' });
  const reopenNote = (n) => toggleClear(n, { author: RN_ME, kind: 'comment', text: 'Catatan dibuka kembali untuk tindak lanjut.' });

  const postComposer = (n) => {
    const t = composer.trim(); if (!t) return;
    const kind = n.to === RN_ME ? 'response' : 'comment';
    addNoteReply(n.id, { author: RN_ME, kind, text: t });
    setComposer('');
  };

  const openSource = (n) => {
    if (n.wp) { try { localStorage.setItem('ams.wpOpen', n.wpRef); } catch (e) {} nav('workpapers'); }
    else nav(n.module);
  };

  const submitNew = () => {
    if (!draft.text.trim()) return;
    if (draft.module === 'workpapers' && draft.wpRef) {
      const note = { id: 'wn-' + Date.now(), author: 'Anindya P.', to: draft.to, text: draft.text.trim(), type: draft.type, priority: draft.priority, due: draft.due, ref: draft.ref, status: 'open', created: 'baru saja', raised: '2026-03-09' };
      setWp(draft.wpRef, { notes: [...((wpState[draft.wpRef] || {}).notes || []), note] });
    } else {
      const m = MODULE_INDEX[draft.module];
      addReviewNote({ text: draft.text.trim(), module: draft.module, to: draft.to, type: draft.type, priority: draft.priority, due: draft.due, ref: draft.ref, moduleLabel: m?.label || draft.module, raised: '2026-03-09' });
    }
    setDraft({ text: '', type: 'review', module: 'wtb', wpRef: 'B', to: 'Dimas R.', priority: 'medium', due: '2026-03-14', ref: '' });
    setShowForm(false);
  };

  return (
    <>
      <SubBar moduleId="reviewnotes" right={
        <div className="row gap8 ac">
          {M.blocking > 0
            ? <Badge kind="amber" dot>{M.blocking} perlu kliring</Badge>
            : <Badge kind="green" dot>Siap diarsipkan</Badge>}
          <Btn sm variant="primary" onClick={() => setShowForm(s => !s)}><I.plus size={14} /> Catatan Baru</Btn>
        </div>
      } />

      <div className="view-scroll" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: '1 0 auto', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* ---- metrics band ---- */}
        <div style={{ padding: '12px 14px 0', flex: '0 0 auto' }}>
          <div className="grid" style={{ gridTemplateColumns: '1.5fr 2.4fr', gap: 12 }}>
            <RN_ClearanceCard M={M} aging={aging} />
            <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              <RN_Stat icon="doc"    val={M.open}      lbl="Terbuka"           sub={`${M.total} total catatan`} c="var(--amber)" />
              <RN_Stat icon="flag"   val={M.high}      lbl="Prioritas Tinggi"  sub="butuh perhatian segera"    c="var(--red)" />
              <RN_Stat icon="clock"  val={M.overdue}   lbl="Lewat Jatuh Tempo" sub="melewati SLA kliring"      c="var(--red)" />
              <RN_Stat icon="sync"   val={M.responded} lbl="Menunggu Kliring"  sub="sudah direspons preparer"  c="var(--blue)" />
              <RN_Stat icon="shield" val={M.eqrOpen}   lbl="Catatan EQR"       sub="penelaah mutu (PIE)"       c="var(--purple)" />
              <RN_Stat icon="layers" val={M.wp}        lbl="Terkait WP"        sub="tersemat di kertas kerja"  c="var(--teal)" />
            </div>
          </div>
        </div>

        {/* ---- new note form ---- */}
        {showForm && (
          <div style={{ padding: '12px 14px 0', flex: '0 0 auto' }}>
            <Panel noBody>
              <div className="panel-h"><h3>Catatan Review Baru</h3><div style={{ flex: 1 }} /><span className="tiny muted">Akan tampil di My Tasks penerima & Cockpit</span></div>
              <div style={{ padding: 14, display: 'grid', gap: 10 }}>
                <div className="row gap6" style={{ flexWrap: 'wrap' }}>
                  {Object.entries(RN_TYPES).map(([k, t]) => (
                    <button key={k} className="chip x" onClick={() => setDraft(d => ({ ...d, type: k }))}
                      style={{ height: 26, background: draft.type === k ? `var(--${t.kind}-bg, var(--blue-100))` : 'var(--surface-3)', color: draft.type === k ? `var(--${t.kind})` : 'var(--ink-3)', border: draft.type === k ? `1px solid var(--${t.kind})` : '1px solid transparent', fontWeight: 700 }}>
                      {React.createElement(I[t.icon] || I.flag, { size: 12 })} {t.label}
                    </button>
                  ))}
                </div>
                <textarea className="input" value={draft.text} onChange={e => setDraft(d => ({ ...d, text: e.target.value }))} placeholder="Tulis catatan review / coaching / query…" style={{ height: 70, padding: 9, resize: 'vertical', lineHeight: 1.5, fontFamily: 'var(--ui)' }} />
                <div className="grid" style={{ gridTemplateColumns: draft.module === 'workpapers' ? '1.3fr 1.4fr 1fr 1fr 1fr' : '1.4fr 1fr 1fr 1fr', gap: 10 }}>
                  <div className="field"><label>Modul</label><select className="select" value={draft.module} onChange={e => setDraft(d => ({ ...d, module: e.target.value }))}>{MODULES.flatMap(g => g.items).filter(m => m.deep).map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></div>
                  {draft.module === 'workpapers' && <div className="field"><label>Kertas Kerja</label><select className="select" value={draft.wpRef} onChange={e => setDraft(d => ({ ...d, wpRef: e.target.value }))}>{wpRefs.map(w => <option key={w.ref} value={w.ref}>{w.ref} · {w.title}</option>)}</select></div>}
                  <div className="field"><label>Ditujukan ke</label><select className="select" value={draft.to} onChange={e => setDraft(d => ({ ...d, to: e.target.value }))}>{['Dimas R.', 'Anindya P.', 'Sinta W.', 'Fajar N.', 'Rina K.'].map(p => <option key={p}>{p}</option>)}</select></div>
                  <div className="field"><label>Prioritas</label><select className="select" value={draft.priority} onChange={e => setDraft(d => ({ ...d, priority: e.target.value }))}>{Object.keys(RN_PRIO).map(p => <option key={p} value={p}>{RN_PRIO[p].label}</option>)}</select></div>
                  <div className="field"><label>Jatuh Tempo</label><input type="date" className="input" value={draft.due} onChange={e => setDraft(d => ({ ...d, due: e.target.value }))} /></div>
                </div>
                <input className="input" value={draft.ref} onChange={e => setDraft(d => ({ ...d, ref: e.target.value }))} placeholder="Referensi silang (opsional) — mis. WP B-3, AJE-01, R-01" />
                <div className="row je gap8"><Btn sm onClick={() => setShowForm(false)}>Batal</Btn><Btn sm variant="primary" onClick={submitNew}><I.check size={13} /> Simpan Catatan</Btn></div>
              </div>
            </Panel>
          </div>
        )}

        {/* ---- toolbar ---- */}
        <div className="row ac gap8" style={{ padding: '12px 14px 10px', flexWrap: 'wrap', flex: '0 0 auto' }}>
          <div style={{ position: 'relative', width: 230 }}>
            <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)' }}><I.search2 size={14} /></span>
            <input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="Cari catatan, orang, referensi…" style={{ width: '100%', paddingLeft: 28 }} />
          </div>
          <Seg options={[{ value: 'open', label: 'Terbuka' }, { value: 'resolved', label: 'Dikliring' }, { value: 'all', label: 'Semua' }]} value={statusF} onChange={setStatusF} />
          <div className="row gap6 ac" style={{ flexWrap: 'wrap' }}>
            <button className="chip x" onClick={() => setTypeF('all')} style={{ background: typeF === 'all' ? 'var(--navy)' : 'var(--surface-3)', color: typeF === 'all' ? '#fff' : 'var(--ink-3)', fontWeight: 700 }}>Semua tipe</button>
            {Object.entries(RN_TYPES).map(([k, t]) => (
              <button key={k} className="chip x" onClick={() => setTypeF(typeF === k ? 'all' : k)}
                style={{ background: typeF === k ? `var(--${t.kind}-bg, var(--blue-100))` : 'var(--surface-3)', color: typeF === k ? `var(--${t.kind})` : 'var(--ink-3)', fontWeight: 700, border: typeF === k ? `1px solid var(--${t.kind})` : '1px solid transparent' }}>
                {React.createElement(I[t.icon] || I.flag, { size: 11 })} {t.short}
              </button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <label style={{ textTransform: 'none', letterSpacing: 0 }}>Sumber</label>
            <select className="select" value={sourceF} onChange={e => setSourceF(e.target.value)} style={{ width: 120 }}><option value="all">Semua</option><option value="module">Modul</option><option value="wp">Kertas Kerja</option></select>
          </div>
          <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <label style={{ textTransform: 'none', letterSpacing: 0 }}>Penerima</label>
            <select className="select" value={assigneeF} onChange={e => setAssigneeF(e.target.value)} style={{ width: 120 }}><option value="all">Semua</option>{RN_ASSIGNEES.map(p => <option key={p}>{p}</option>)}</select>
          </div>
          <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <label style={{ textTransform: 'none', letterSpacing: 0 }}>Kelompok</label>
            <select className="select" value={groupBy} onChange={e => setGroupBy(e.target.value)} style={{ width: 130 }}><option value="none">Tidak ada</option><option value="reviewer">Reviewer</option><option value="assignee">Penerima</option><option value="module">Modul</option><option value="type">Tipe</option><option value="priority">Prioritas</option></select>
          </div>
        </div>

        {/* ---- master–detail ---- */}
        <div style={{ flex: '1 1 auto', minHeight: 540, display: 'grid', gridTemplateColumns: 'minmax(360px, 430px) 1fr', gap: 12, padding: '0 14px 14px', overflow: 'hidden' }}>
          {/* list */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            <div className="panel-h" style={{ flex: '0 0 auto' }}><h3>Daftar Catatan</h3><div style={{ flex: 1 }} /><span className="tiny muted">{filtered.length} ditampilkan</span></div>
            <div style={{ overflowY: 'auto', overflowX: 'hidden', flex: 1 }}>
              {groups.map(g => (
                <div key={g.key || 'all'}>
                  {g.label && <div className="row ac jb" style={{ padding: '7px 12px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line-soft)', position: 'sticky', top: 0, zIndex: 1 }}><span className="tiny upper" style={{ fontWeight: 700, color: 'var(--ink-3)' }}>{g.label}</span><span className="tiny muted">{g.items.length}</span></div>}
                  {g.items.map(n => <RN_Row key={(n.wp ? 'wp-' : 'm-') + n.id} n={n} active={selected && n.id === selected.id && n.wp === selected.wp} onClick={() => setSelId((n.wp ? 'wp-' : 'm-') + n.id)} />)}
                </div>
              ))}
              {!filtered.length && <div className="muted tiny" style={{ padding: 36, textAlign: 'center' }}>Tidak ada catatan yang cocok dengan filter.</div>}
            </div>
          </div>

          {/* detail */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            {selected
              ? <RN_Detail n={selected} thread={selected._thread} phase={selected._phase} firm={firm}
                  composer={composer} setComposer={setComposer} postComposer={postComposer}
                  clearNote={clearNote} reopenNote={reopenNote} openSource={openSource}
                  updateReviewNote={updateReviewNote} />
              : <div className="muted tiny" style={{ margin: 'auto', padding: 36, textAlign: 'center' }}>Pilih catatan untuk melihat percakapan & kliring.</div>}
          </div>
        </div>
        </div>
      </div>
    </>
  );
}

/* ---- compact KPI tile ---- */
function RN_Stat({ icon, val, lbl, sub, c }) {
  return (
    <div className="panel" style={{ padding: '11px 13px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span style={{ width: 30, height: 30, borderRadius: 8, flex: '0 0 30px', display: 'grid', placeItems: 'center', background: 'var(--surface-3)', color: c }}>{React.createElement(I[icon] || I.doc, { size: 16 })}</span>
      <div style={{ minWidth: 0 }}>
        <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy)', lineHeight: 1 }}>{val}</div>
        <div className="tiny" style={{ fontWeight: 700, color: 'var(--ink-2)', marginTop: 3 }}>{lbl}</div>
        <div className="tiny muted truncate">{sub}</div>
      </div>
    </div>
  );
}

/* ---- clearance-readiness gate (ISA 230 / ISQM 1) ---- */
function RN_ClearanceCard({ M, aging }) {
  const ready = M.blocking === 0;
  const maxA = Math.max(1, ...aging.map(b => b.n));
  return (
    <div className="panel" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10, background: ready ? 'var(--green-bg)' : 'var(--amber-bg)', borderBottom: '1px solid var(--line-soft)' }}>
        <span style={{ color: ready ? 'var(--green)' : 'var(--amber)' }}>{ready ? <I.checkCircle size={18} /> : <I.lock size={17} />}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700 }}>Kesiapan Kliring File</div>
          <div className="tiny" style={{ color: ready ? 'var(--green)' : 'var(--amber)', fontWeight: 600 }}>{ready ? 'Semua catatan wajib telah dikliring' : `${M.blocking} catatan wajib belum dikliring`}</div>
        </div>
        <div className="mono" style={{ fontSize: 26, fontWeight: 800, color: ready ? 'var(--green)' : 'var(--amber)', lineHeight: 1 }}>{M.clearedPct}%</div>
      </div>
      <div style={{ padding: '11px 14px', display: 'grid', gap: 10 }}>
        <div>
          <div className="pbar" style={{ height: 7 }}><span style={{ width: M.clearedPct + '%', background: ready ? 'var(--green)' : 'var(--amber)' }} /></div>
          <div className="row jb tiny muted" style={{ marginTop: 4 }}><span>{M.clearedMust} dari {M.mustClear} dikliring</span><span>review · EQR · query</span></div>
        </div>
        <div>
          <div className="tiny upper" style={{ fontWeight: 700, color: 'var(--ink-3)', marginBottom: 5 }}>Umur catatan terbuka</div>
          <div style={{ display: 'grid', gap: 4 }}>
            {aging.map(b => (
              <div key={b.k} className="row ac gap8">
                <span className="tiny muted" style={{ width: 64, flex: '0 0 64px' }}>{b.k}</span>
                <div style={{ flex: 1, height: 9, background: 'var(--surface-3)', borderRadius: 5, overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: (b.n / maxA * 100) + '%', background: b.c, borderRadius: 5 }} /></div>
                <span className="mono tiny" style={{ width: 16, textAlign: 'right', fontWeight: 700, color: b.n ? 'var(--ink)' : 'var(--ink-4)' }}>{b.n}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="tiny muted" style={{ lineHeight: 1.45, borderTop: '1px solid var(--line-soft)', paddingTop: 8 }}>
          <I.shield size={11} style={{ verticalAlign: '-1px', marginRight: 4, color: 'var(--ink-4)' }} />
          ISA 230 / ISQM 1 — seluruh catatan review wajib dituntaskan & dikliring sebelum dokumentasi audit difinalisasi (assembly 60 hari). Coaching note tidak menghambat kliring.
        </div>
      </div>
    </div>
  );
}

/* ---- list row ---- */
function RN_Row({ n, active, onClick }: any) {
  const t = RN_TYPES[n.type] || RN_TYPES.review;
  const ph = RN_PHASE_META[n._phase];
  const resolved = n.status === 'resolved';
  return (
    <button onClick={onClick} style={{ width: '100%', textAlign: 'left', display: 'block', padding: '10px 12px', border: 0, borderBottom: '1px solid var(--line-soft)', borderLeft: active ? '3px solid var(--blue)' : '3px solid transparent', background: active ? 'var(--blue-050)' : 'transparent', cursor: 'pointer', opacity: resolved && !active ? 0.72 : 1 }}>
      <div className="row ac gap6" style={{ marginBottom: 5 }}>
        <span title={t.label} style={{ color: `var(--${t.kind})`, display: 'inline-flex' }}>{React.createElement(I[t.icon] || I.flag, { size: 13 })}</span>
        <Badge kind={ph.kind} dot>{ph.label}</Badge>
        {n.priority === 'high' && <Badge kind="red">{RN_PRIO.high.label}</Badge>}
        <div style={{ flex: 1 }} />
        {n._overdue
          ? <span className="tiny" style={{ color: 'var(--red)', fontWeight: 700 }}>+{n._dueIn != null ? -n._dueIn : ''}h lewat</span>
          : n._replies > 0 && <span className="tiny muted row ac gap6" style={{ gap: 3 }}><I.mail size={11} /> {n._replies}</span>}
      </div>
      <div style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--ink)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textDecoration: resolved ? 'line-through' : 'none' }}>{n.text}</div>
      <div className="row ac gap6" style={{ marginTop: 6 }}>
        <Avatar name={n.author} size={18} />
        <span className="tiny muted truncate" style={{ maxWidth: 110 }}>{n.author.split(' ')[0]} → {n.to}</span>
        <div style={{ flex: 1 }} />
        <span className="chip tiny" style={{ height: 18, background: n.wp ? 'var(--teal-bg)' : 'var(--surface-3)', color: n.wp ? 'var(--teal)' : 'var(--ink-3)', maxWidth: 150 }}>
          {n.wp && <I.layers size={10} />}<span className="truncate">{n.moduleLabel}</span>
        </span>
      </div>
    </button>
  );
}

/* ---- detail / conversation pane ---- */
function RN_Detail({ n, thread, phase, firm, composer, setComposer, postComposer, clearNote, reopenNote, openSource, updateReviewNote }) {
  const t = RN_TYPES[n.type] || RN_TYPES.review;
  const ph = RN_PHASE_META[phase];
  const resolved = n.status === 'resolved';
  const dueDays = n.due ? RN_days(n.due) : null;
  const editable = !n.wp; // module notes carry editable meta

  /* full conversation = originating note + thread */
  const msgs = [{ author: n.author, kind: 'note', when: n.created, text: n.text }, ...thread];
  const KIND_META = {
    note:     { label: t.label, c: `var(--${t.kind})`, bg: `var(--${t.kind}-bg, var(--blue-100))` },
    response: { label: 'Tanggapan Preparer', c: 'var(--blue)', bg: 'var(--blue-050)' },
    comment:  { label: 'Komentar', c: 'var(--ink-3)', bg: 'var(--surface-2)' },
    clear:    { label: 'Kliring', c: 'var(--green)', bg: 'var(--green-bg)' },
  };

  return (
    <>
      {/* header */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', flex: '0 0 auto' }}>
        <div className="row ac gap8" style={{ marginBottom: 8, flexWrap: 'wrap' }}>
          <span className="chip" style={{ background: `var(--${t.kind}-bg, var(--blue-100))`, color: `var(--${t.kind})`, fontWeight: 700 }}>{React.createElement(I[t.icon] || I.flag, { size: 12 })} {t.label}</span>
          <Badge kind={ph.kind} dot>{ph.label}</Badge>
          <Badge kind={RN_PRIO[n.priority].k}>Prioritas {RN_PRIO[n.priority].label}</Badge>
          {n._overdue && <Badge kind="red"><I.clock size={11} /> Lewat {n._dueIn != null ? -n._dueIn : ''} hari</Badge>}
          <div style={{ flex: 1 }} />
          <span className="mono tiny muted">{n.id}</span>
        </div>
        <div className="row ac gap8">
          <span className="chip x" onClick={() => openSource(n)} style={{ background: n.wp ? 'var(--teal-bg)' : 'var(--surface-3)', color: n.wp ? 'var(--teal)' : 'var(--ink-2)', cursor: 'pointer' }}>{n.wp ? <I.layers size={12} /> : <I.arrowRight size={12} />} {n.moduleLabel} ↗</span>
          {n.ref && <span className="chip tiny"><I.link2 size={11} /> {n.ref}</span>}
        </div>
      </div>

      {/* conversation */}
      <div style={{ overflowY: 'auto', overflowX: 'hidden', flex: 1, padding: '14px', background: 'var(--surface-2)' }}>
        <div style={{ display: 'grid', gap: 12, maxWidth: 720 }}>
          {msgs.map((m, i) => {
            const km = KIND_META[m.kind] || KIND_META.comment;
            const mine = m.author === RN_ME;
            return (
              <div key={i} className="row gap10" style={{ alignItems: 'flex-start' }}>
                <Avatar name={m.author} size={30} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row ac gap8" style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700 }}>{m.author}</span>
                    <span className="tiny muted">{RN_roleOf(m.author)}</span>
                    <span className="badge" style={{ background: km.bg, color: km.c }}>{km.label}</span>
                    <div style={{ flex: 1 }} />
                    <span className="tiny muted">{m.when}</span>
                  </div>
                  <div style={{ background: m.kind === 'note' ? '#fff' : km.bg, border: '1px solid var(--line)', borderLeft: `3px solid ${km.c}`, borderRadius: 7, padding: '10px 12px', fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink)' }}>
                    {m.kind === 'clear' && <I.check size={13} style={{ verticalAlign: '-2px', marginRight: 5, color: 'var(--green)' }} />}
                    {m.text}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* composer + actions */}
      <div style={{ borderTop: '1px solid var(--line)', padding: 12, flex: '0 0 auto', background: 'var(--surface)' }}>
        {firm.locked ? (
          <div className="row ac gap8 tiny muted" style={{ justifyContent: 'center', padding: 6 }}><I.lock size={13} /> Engagement diarsipkan — catatan read-only.</div>
        ) : (
          <>
            <textarea className="input" value={composer} onChange={e => setComposer(e.target.value)} placeholder={n.to === RN_ME ? 'Tulis tanggapan Anda sebagai preparer…' : 'Tambahkan komentar pada catatan ini…'} style={{ width: '100%', height: 56, padding: 9, resize: 'vertical', lineHeight: 1.5, fontFamily: 'var(--ui)', marginBottom: 8 }} />
            <div className="row ac gap8">
              <span className="tiny muted">{n.to === RN_ME ? 'Anda penerima — kirim sebagai tanggapan' : 'Kirim sebagai komentar'}</span>
              <div style={{ flex: 1 }} />
              <Btn sm onClick={() => postComposer(n)}><I.send size={13} /> Kirim</Btn>
              {resolved
                ? <Btn sm onClick={() => reopenNote(n)}><I.sync size={13} /> Buka Kembali</Btn>
                : <Btn sm variant="primary" onClick={() => clearNote(n)} style={{ background: 'var(--green)', borderColor: 'var(--green)' }}><I.checkCircle size={13} /> Tuntaskan & Kliring</Btn>}
            </div>
          </>
        )}
        {/* meta strip */}
        <div className="row ac gap8" style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line-soft)', flexWrap: 'wrap' }}>
          <RN_Meta label="Diangkat oleh" value={<span className="row ac gap6"><Avatar name={n.author} size={18} />{n.author}</span>} />
          <span className="vdivider" style={{ height: 26 }} />
          {editable && !firm.locked ? (
            <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <label style={{ textTransform: 'none', letterSpacing: 0 }}>Penerima</label>
              <select className="select" value={n.to} onChange={e => updateReviewNote(n.id, { to: e.target.value })} style={{ height: 24, width: 110 }}>{RN_ASSIGNEES.map(p => <option key={p}>{p}</option>)}</select>
            </div>
          ) : <RN_Meta label="Ditujukan ke" value={n.to} />}
          <span className="vdivider" style={{ height: 26 }} />
          {editable && !firm.locked ? (
            <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <label style={{ textTransform: 'none', letterSpacing: 0 }}>Prioritas</label>
              <select className="select" value={n.priority} onChange={e => updateReviewNote(n.id, { priority: e.target.value })} style={{ height: 24, width: 100 }}>{Object.keys(RN_PRIO).map(p => <option key={p} value={p}>{RN_PRIO[p].label}</option>)}</select>
            </div>
          ) : <RN_Meta label="Prioritas" value={RN_PRIO[n.priority].label} />}
          <span className="vdivider" style={{ height: 26 }} />
          <RN_Meta label="Jatuh tempo" value={<span style={{ color: n._overdue ? 'var(--red)' : 'var(--ink)', fontWeight: 600 }}>{RN_fmtDate(n.due)}{dueDays != null && !resolved && <span className="tiny muted" style={{ marginLeft: 4 }}>{dueDays > 0 ? `(${dueDays}h lewat)` : `(${-dueDays}h lagi)`}</span>}</span>} />
          <span className="vdivider" style={{ height: 26 }} />
          <RN_Meta label="Umur" value={`${n._age ?? 0} hari`} />
        </div>
      </div>
    </>
  );
}
function RN_Meta({ label, value }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="tiny upper" style={{ fontWeight: 700, color: 'var(--ink-4)', fontSize: 9.5, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{value}</div>
    </div>
  );
}

/* ---------------- My Tasks ---------------- */
/* MyTasks lives in view_mytasks.jsx (expanded personal task workspace) */

Object.assign(window, { ReviewNotes });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { ReviewNotes };
