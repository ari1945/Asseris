/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAmsPersist, useAudit, useAuth, useFirm, useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Avatar, Badge, Btn, Panel, Progress, Seg, Stat } from './ui';
import { KvBox } from './view_analytical';

/* ============================================================
   Asseris — Firm Platform · Approvals (Bagian D-1)
   Antrean DITURUNKAN LIVE dari sumber kanonik (AMS.PLATFORM):
     AJE (useAudit) · Faktur · Pipeline · Opini · Independensi · WIP
   Keputusan ditulis-balik ke SSOT — menyetujui AJE memposting jurnal
   ke Working Trial Balance. Nama klien/engagement tidak pernah drift.
   ============================================================ */
const { useState: useStatePF, useMemo: useMemoPF } = React;

const PF_NOW = new Date('2026-03-10T09:00:00');
const PF_STAMP = '10 Mar 09:00';

/* hours-until helper -> {h, overdue, label, pct} relative to a 48h window */
function slaInfo(dueStr: any) {
  const due = new Date(String(dueStr).replace(' ', 'T'));
  const diffH = (+due - +PF_NOW) / 3.6e6;
  const overdue = diffH < 0;
  const abs = Math.abs(diffH);
  const unit = abs >= 24 ? Math.round(abs / 24) + ' hari' : Math.round(abs) + ' jam';
  return { diffH, overdue, label: overdue ? 'Lewat ' + unit : 'Sisa ' + unit, pct: Math.max(0, Math.min(100, (1 - diffH / 48) * 100)) };
}

const APPR_KIND = { AJE: 'blue', 'Faktur': 'teal', Engagement: 'purple', Opini: 'red', 'WIP Write-off': 'amber', 'Independensi': 'purple' };
/* metadata sumber kanonik per jenis — untuk strip ketertelusuran SSOT */
const APPR_SRC = {
  AJE: { route: 'aje', label: 'Ledger AJE', icon: 'ledger' },
  'Faktur': { route: 'billing', label: 'Billing & Invoicing', icon: 'receipt' },
  Engagement: { route: 'pipeline', label: 'Sales Pipeline', icon: 'trend' },
  Opini: { route: 'opinion', label: 'Audit Opinion', icon: 'gavel' },
  'WIP Write-off': { route: 'wipreal', label: 'WIP & Realisasi', icon: 'hourglass' },
  'Independensi': { route: 'independence', label: 'Independensi & Rotasi', icon: 'shield' },
};

/* terapkan overlay keputusan pengguna di atas item kanonik terderivasi */
function applyOverlay(d: any, ov: any) {
  if (!ov) return d;
  const step = ov.step != null ? ov.step : d.step;
  const status = ov.status || d.status;
  const decMap = {};
  (ov.decisions || []).forEach((x: any) => { (decMap as any)[x.idx] = x; });
  const chain = d.chain.map((c: any, i: any) => {
    const dec = (decMap as any)[i];
    if (dec) return { ...c, status: 'approved', ts: dec.ts, name: dec.name, note: dec.note };
    if (status === 'rejected' && i === step) return { ...c, status: 'rejected', ts: ov.ts || d.step, name: ov.by, note: ov.note || 'Ditolak.' };
    return { ...c, status: i < step ? 'approved' : i === step ? (status === 'pending' ? 'current' : status) : 'pending' };
  });
  return { ...d, chain, step, status, thread: [...d.thread, ...(ov.thread || [])] };
}

function Approvals() {
  const nav = useNav();
  const { user } = useAuth();
  const { engagements, clients } = useFirm();
  const { aje, toggleAjeStatus, logActivity } = useAudit();
  const [overlay, setOverlay] = useAmsPersist('approvals_ov_v3', () => ({}));
  const [filter, setFilter] = useStatePF('pending');
  const [kindFilter, setKindFilter] = useStatePF('Semua');
  const [selId, setSelId] = useStatePF(null);
  const [showRules, setShowRules] = useStatePF(false);

  /* === SUMBER KEBENARAN: turunkan antrean live dari entitas kanonik === */
  const derived = useMemoPF(
    () => (AMS as any).PLATFORM.buildApprovals({ aje, engagements, clients }),
    [aje, engagements, clients]);
  const items = useMemoPF(() => derived.map((d: any) => applyOverlay(d, overlay[d.id])), [derived, overlay]);

  const canApprove = user.role.includes('Partner') || user.role.includes('Manager');
  const pending = items.filter((i: any) => i.status === 'pending');
  const breached = pending.filter((i: any) => slaInfo(i.due).overdue);
  const kinds = ['Semua', ...Array.from(new Set(items.map((i: any) => i.kind)))];
  const shown = items.filter((i: any) =>
    (filter === 'all' || i.status === filter) &&
    (kindFilter === 'Semua' || i.kind === kindFilter));
  const sel = items.find((i: any) => i.id === selId) || shown[0] || items[0];

  /* sebaran sumber data → strip ketertelusuran SSOT */
  const bySource = useMemoPF(() => {
    const m = {};
    derived.forEach((d: any) => { const s = (APPR_SRC as any)[d.kind]; const k = d.kind; ((m as any)[k] = (m as any)[k] || { kind: k, route: s.route, icon: s.icon, label: s.label, n: 0, pend: 0 }); (m as any)[k].n++; if (d.status === 'pending') (m as any)[k].pend++; });
    return Object.values(m);
  }, [derived]);

  const decide = (id: any, decision: any, note: any) => {
    const it = items.find((x: any) => x.id === id);
    const d = derived.find((x: any) => x.id === id);
    if (!it || !d) return;
    if (decision === 'approve') {
      const newStep = it.step + 1;
      const done = newStep >= it.chain.length;
      setOverlay((o: any) => {
        const prev = o[id] || {};
        const decisions = [...(prev.decisions || []), { idx: it.step, name: user.name, ts: '2026-03-10 09:00', note: note || 'Disetujui.' }];
        const thread = note ? [...(prev.thread || []), { who: user.name, role: user.role, when: PF_STAMP, text: note, kind: 'approve' }] : (prev.thread || []);
        return { ...o, [id]: { ...prev, step: newStep, status: done ? 'approved' : 'pending', decisions, thread } };
      });
      /* === TULIS-BALIK SSOT: persetujuan final AJE memposting jurnal ke WTB === */
      if (done && d.writesBack && d.sourceModule === 'aje' && toggleAjeStatus) toggleAjeStatus(d.sourceId);
    } else if (decision === 'reject') {
      setOverlay((o: any) => ({ ...o, [id]: { ...(o[id] || {}), status: 'rejected', by: user.name, note: note || 'Ditolak.', thread: [...((o[id] || {}).thread || []), { who: user.name, role: user.role, when: PF_STAMP, text: note || 'Ditolak.', kind: 'reject' }] } }));
    } else if (decision === 'revise') {
      setOverlay((o: any) => ({ ...o, [id]: { ...(o[id] || {}), status: 'revision', thread: [...((o[id] || {}).thread || []), { who: user.name, role: user.role, when: PF_STAMP, text: note || 'Mohon revisi & ajukan ulang.', kind: 'revise' }] } }));
    }
    logActivity && logActivity({ who: user.name, action: decision === 'approve' ? 'APPROVE' : decision === 'reject' ? 'REJECT' : 'EDIT', detail: `${it.kind} ${it.ref} — ${it.title.slice(0, 40)}` });
  };

  const addComment = (id: any, text: any) => {
    setOverlay((o: any) => ({ ...o, [id]: { ...(o[id] || {}), thread: [...((o[id] || {}).thread || []), { who: user.name, role: user.role, when: PF_STAMP, text }] } }));
  };

  return (
    <>
      <SubBar moduleId="approvals" right={
        <div className="row gap8 ac">
          <Badge kind={pending.length ? 'amber' : 'green'}>{pending.length} menunggu</Badge>
          <Btn sm onClick={() => setShowRules(true)}><I.scale size={13} /> Aturan Routing</Btn>
          <Seg options={[{ value: 'pending', label: 'Menunggu' }, { value: 'approved', label: 'Disetujui' }, { value: 'all', label: 'Semua' }]} value={filter} onChange={setFilter} />
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={pending.length} label="Menunggu Persetujuan" accent="var(--amber)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={pending.filter((i: any) => i.priority === 'high').length} label="Prioritas Tinggi" accent="var(--red)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={breached.length} label="Lewat SLA" accent={breached.length ? 'var(--red)' : 'var(--green)'} /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={items.filter((i: any) => i.status === 'approved').length} label="Disetujui" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + AMS.fmt(pending.reduce((s: any, i: any) => s + i.amount, 0) / 1e6, 0) + ' jt'} label="Nilai Menunggu" /></div></Panel>
        </div>

        {/* strip ketertelusuran SSOT — antrean diturunkan dari modul sumber */}
        <Panel><div style={{ padding: '10px 14px' }}>
          <div className="row ac gap8" style={{ marginBottom: 9 }}>
            <span style={{ color: 'var(--blue)' }}><I.link2 size={14} /></span>
            <span className="tiny" style={{ fontWeight: 700 }}>Sumber Kebenaran</span>
            <span className="tiny muted">Antrean diturunkan langsung dari modul kanonik — klik untuk membuka sumbernya.</span>
          </div>
          <div className="row gap6" style={{ flexWrap: 'wrap' }}>
            {bySource.map((s: any) => { const Ic = (I as any)[s.icon] || I.doc; return (
              <button key={s.kind} className="lin-chip" style={{ borderLeftColor: 'var(--blue)', maxWidth: 230 }} onClick={() => nav(s.route, { from: 'approvals' })} title={'Buka ' + s.label}>
                <span className="lin-ic" style={{ color: 'var(--blue)' }}><Ic size={14} /></span>
                <span className="lin-txt"><span className="lin-lbl">{s.label}</span><span className="lin-rel">{s.n} item{s.pend ? ' · ' + s.pend + ' menunggu' : ' · selesai'}</span></span>
                <span className="lin-go"><I.arrowRight size={12} /></span>
              </button>
            ); })}
          </div>
        </div></Panel>

        {!canApprove && <div className="panel" style={{ padding: '10px 14px', margin: '12px 0', background: 'var(--amber-bg)', borderColor: 'transparent' }}><div className="row ac gap8"><span style={{ color: 'var(--amber)' }}><I.lock size={15} /></span><span className="tiny" style={{ fontWeight: 600 }}>Peran Anda (<b>{user.role}</b>) hanya dapat melihat. Ganti ke Manager/Partner di menu pengguna untuk menyetujui.</span></div></div>}

        <div className="grid" style={{ gridTemplateColumns: '0.92fr 1.25fr', gap: 12, alignItems: 'start', marginTop: 12 }}>
          {/* LIST */}
          <Panel noBody>
            <div className="panel-h"><h3>Kotak Persetujuan</h3><div style={{ flex: 1 }} /><span className="tiny muted">{shown.length} item</span></div>
            <div className="row gap6" style={{ padding: '8px 12px', flexWrap: 'wrap', borderBottom: '1px solid var(--line-soft)' }}>
              {kinds.map(k => <button key={k} className="chip x" style={{ height: 24, background: kindFilter === k ? 'var(--blue)' : 'var(--surface-3)', color: kindFilter === k ? '#fff' : 'var(--ink-2)' }} onClick={() => setKindFilter(k)}>{k}</button>)}
            </div>
            <div style={{ maxHeight: 540, overflowY: 'auto', overflowX: 'hidden' }}>
              {shown.map((i: any) => {
                const sla = slaInfo(i.due);
                const isPend = i.status === 'pending';
                return (
                  <div key={i.id} onClick={() => setSelId(i.id)}
                    style={{ padding: '11px 13px', borderBottom: '1px solid var(--line-soft)', cursor: 'pointer', background: i.id === sel.id ? 'var(--blue-050)' : 'transparent', borderLeft: '3px solid ' + (i.id === sel.id ? 'var(--blue)' : 'transparent') }}>
                    <div className="row ac gap8" style={{ marginBottom: 4 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: i.priority === 'high' ? 'var(--red)' : i.priority === 'medium' ? 'var(--amber)' : 'var(--ink-4)', flex: '0 0 7px' }} />
                      <Badge kind={(APPR_KIND as any)[i.kind]}>{i.kind}</Badge>
                      <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{i.ref}</span>
                      <div style={{ flex: 1 }} />
                      {isPend
                        ? <span className="tiny mono" style={{ fontWeight: 700, color: sla.overdue ? 'var(--red)' : sla.diffH < 12 ? 'var(--amber)' : 'var(--ink-3)' }}>{sla.label}</span>
                        : <Badge kind={i.status === 'approved' ? 'green' : i.status === 'rejected' ? 'red' : 'amber'}>{i.status === 'approved' ? 'Disetujui' : i.status === 'rejected' ? 'Ditolak' : 'Revisi'}</Badge>}
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 3 }} className="truncate">{i.title}</div>
                    <div className="tiny muted">{i.from} · {(i.client || '').replace('PT ', '')}{i.amount ? ' · Rp ' + AMS.fmt(i.amount / 1e6, 0) + ' jt' : ''}</div>
                    {isPend && <div className="row ac gap6" style={{ marginTop: 6 }}>
                      {i.chain.map((c: any, ci: any) => <span key={ci} title={c.role + ' · ' + c.name} style={{ flex: 1, height: 3, borderRadius: 2, background: c.status === 'approved' ? 'var(--green)' : c.status === 'current' ? 'var(--blue)' : c.status === 'rejected' ? 'var(--red)' : 'var(--line-strong)' }} />)}
                      <span className="tiny muted mono" style={{ flex: '0 0 auto' }}>{i.chain.filter((c: any) => c.status === 'approved').length}/{i.chain.length}</span>
                    </div>}
                  </div>
                );
              })}
              {!shown.length && <div className="muted tiny" style={{ padding: 28, textAlign: 'center' }}><I.checkCircle size={24} style={{ color: 'var(--green)', display: 'block', margin: '0 auto 8px' }} />Tidak ada item.</div>}
            </div>
          </Panel>

          {/* DETAIL */}
          {sel && <ApprovalDetail key={sel.id} it={sel} canApprove={canApprove} user={user} nav={nav} onDecide={decide} onComment={addComment} />}
        </div>
      </div></div>
      {showRules && <RoutingRulesModal onClose={() => setShowRules(false)} />}
    </>
  );
}

function ApprovalDetail({ it, canApprove, user, nav, onDecide, onComment }: any) {
  const [note, setNote] = useStatePF('');
  const [comment, setComment] = useStatePF('');
  const sla = slaInfo(it.due);
  const isPend = it.status === 'pending';
  const src = (APPR_SRC as any)[it.kind] || { route: it.sourceRoute, label: 'Modul sumber', icon: 'doc' };
  const SrcIc = (I as any)[src.icon] || I.doc;
  const fmt = AMS.fmt;

  return (
    <Panel noBody>
      <div style={{ background: 'linear-gradient(120deg,#013a52,#005085)', color: '#fff', padding: '14px 16px' }}>
        <div className="row ac gap8" style={{ marginBottom: 8 }}>
          <Badge kind={(APPR_KIND as any)[it.kind]}>{it.kind}</Badge>
          <span className="mono tiny" style={{ fontWeight: 700, color: '#bcd6e4' }}>{it.ref}</span>
          <div style={{ flex: 1 }} />
          {isPend
            ? <span className="badge" style={{ background: 'rgba(255,255,255,.16)', color: '#fff' }}>{sla.label}</span>
            : <Badge kind={it.status === 'approved' ? 'green' : it.status === 'rejected' ? 'red' : 'amber'}>{it.status === 'approved' ? 'Disetujui' : it.status === 'rejected' ? 'Ditolak' : 'Perlu Revisi'}</Badge>}
        </div>
        <div style={{ fontSize: 15.5, fontWeight: 700, lineHeight: 1.3 }}>{it.title}</div>
        <div className="tiny" style={{ color: '#bcd6e4', marginTop: 3 }}>{it.client}{it.eng && it.eng !== '—' ? ' · ' + it.eng : ''}{it.amount ? ' · Rp ' + fmt(it.amount / 1e6, 0) + ' juta' : ''}</div>
      </div>

      <div style={{ padding: '14px 16px' }}>
        {/* provenance / sumber kebenaran */}
        <div className="panel" style={{ padding: '9px 11px', marginBottom: 14, boxShadow: 'none', background: 'var(--blue-050)', borderColor: 'transparent' }}>
          <div className="row ac jb">
            <div className="row ac gap8" style={{ minWidth: 0 }}>
              <span style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--surface)', color: 'var(--blue)', display: 'grid', placeItems: 'center', flex: '0 0 28px' }}><SrcIc size={15} /></span>
              <div style={{ minWidth: 0 }}>
                <div className="tiny" style={{ fontWeight: 700 }}>Sumber: {src.label}</div>
                <div className="tiny muted truncate">{it.prov}</div>
              </div>
            </div>
            <Btn sm onClick={() => nav(it.sourceRoute, { from: 'approvals' })}>Buka <I.arrowRight size={12} /></Btn>
          </div>
        </div>

        {/* meta + SLA */}
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '9px 14px', marginBottom: 14 }}>
          <KvBox label="Pengaju" v={it.from} />
          <KvBox label="Diajukan" v={new Date(String(it.submitted).replace(' ', 'T')).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} />
        </div>
        {isPend && <div className="panel" style={{ padding: 11, marginBottom: 14, background: sla.overdue ? 'var(--red-bg)' : 'var(--surface-2)', borderColor: 'transparent' }}>
          <div className="row jb ac" style={{ marginBottom: 6 }}>
            <span className="tiny" style={{ fontWeight: 700, color: sla.overdue ? 'var(--red)' : 'var(--ink-2)' }}><I.clock size={12} style={{ verticalAlign: -2, marginRight: 4 }} />Batas SLA · {new Date(String(it.due).replace(' ', 'T')).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            <span className="mono tiny" style={{ fontWeight: 700, color: sla.overdue ? 'var(--red)' : 'var(--ink-2)' }}>{sla.label}</span>
          </div>
          <Progress value={sla.pct} color={sla.overdue ? 'var(--red)' : sla.diffH < 12 ? 'var(--amber)' : 'var(--green)'} />
        </div>}

        {/* approval chain */}
        <div className="tiny muted upper" style={{ marginBottom: 10, letterSpacing: '.05em' }}>Alur Persetujuan</div>
        <div style={{ position: 'relative', marginBottom: 16 }}>
          {it.chain.map((c: any, i: any) => {
            const last = i === it.chain.length - 1;
            const col = c.status === 'approved' ? 'var(--green)' : c.status === 'current' ? 'var(--blue)' : c.status === 'rejected' ? 'var(--red)' : 'var(--line-strong)';
            return (
              <div key={i} className="row gap10" style={{ position: 'relative', paddingBottom: last ? 0 : 16 }}>
                {!last && <span style={{ position: 'absolute', left: 13, top: 28, bottom: 0, width: 2, background: c.status === 'approved' ? 'var(--green)' : 'var(--line)' }} />}
                <span style={{ flex: '0 0 28px', width: 28, height: 28, borderRadius: '50%', background: c.status === 'pending' ? 'var(--surface-3)' : col, color: c.status === 'pending' ? 'var(--ink-4)' : '#fff', display: 'grid', placeItems: 'center', zIndex: 1, border: c.status === 'current' ? '2px solid var(--blue)' : 'none' }}>
                  {c.status === 'approved' ? <I.check size={14} /> : c.status === 'rejected' ? <I.x size={14} /> : c.status === 'current' ? <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue)' }} /> : <span className="tiny mono">{i + 1}</span>}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row ac gap6"><span style={{ fontSize: 12.5, fontWeight: 600 }}>{c.name}</span>{c.status === 'current' && <Badge kind="blue">Menunggu</Badge>}</div>
                  <div className="tiny muted">{c.role}{c.ts ? ' · ' + new Date(String(c.ts).replace(' ', 'T')).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</div>
                  {c.note && <div className="tiny" style={{ color: 'var(--ink-2)', marginTop: 3, fontStyle: 'italic' }}>“{c.note}”</div>}
                </div>
              </div>
            );
          })}
        </div>

        {/* SSOT write-back notice for AJE */}
        {it.writesBack && isPend && it.kind === 'AJE' && (
          <div className="panel" style={{ padding: '9px 11px', marginBottom: 14, boxShadow: 'none', background: 'var(--surface-2)', borderColor: 'transparent' }}>
            <div className="row ac gap8 tiny" style={{ color: 'var(--ink-2)' }}><I.sync size={13} style={{ color: 'var(--blue)' }} /><span>Persetujuan pada langkah final akan <b>memposting jurnal ini ke Working Trial Balance</b> — perubahan langsung tercermin di WTB & laporan keuangan.</span></div>
          </div>
        )}

        {/* discussion */}
        <div className="tiny muted upper" style={{ marginBottom: 8, letterSpacing: '.05em' }}>Diskusi · {it.thread.length}</div>
        <div style={{ display: 'grid', gap: 9, marginBottom: 10 }}>
          {it.thread.map((t: any, i: any) => (
            <div key={i} className="row gap8" style={{ alignItems: 'flex-start' }}>
              <Avatar name={t.who} size={26} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row ac gap6"><span style={{ fontSize: 12, fontWeight: 600 }}>{t.who}</span><span className="tiny muted">{t.when}</span>{t.kind && <Badge kind={t.kind === 'approve' ? 'green' : t.kind === 'reject' ? 'red' : 'amber'}>{t.kind === 'approve' ? 'Setuju' : t.kind === 'reject' ? 'Tolak' : 'Revisi'}</Badge>}</div>
                <div className="tiny" style={{ color: 'var(--ink-2)', marginTop: 2, lineHeight: 1.5 }}>{t.text}</div>
              </div>
            </div>
          ))}
          {!it.thread.length && <div className="tiny muted" style={{ padding: '4px 0' }}>Belum ada komentar.</div>}
        </div>
        <div className="row gap6">
          <input className="input" style={{ flex: 1, height: 30 }} placeholder="Tulis komentar…" value={comment} onChange={(e: any) => setComment(e.target.value)} onKeyDown={(e: any) => { if (e.key === 'Enter' && comment.trim()) { onComment(it.id, comment.trim()); setComment(''); } }} />
          <Btn sm icon disabled={!comment.trim()} onClick={() => { if (comment.trim()) { onComment(it.id, comment.trim()); setComment(''); } }}><I.send size={14} /></Btn>
        </div>
      </div>

      {/* decision footer */}
      {isPend && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', background: 'var(--surface-2)' }}>
          {!canApprove ? (
            <div className="tiny muted row ac gap6"><I.lock size={13} /> Peran Anda tidak dapat mengambil keputusan pada item ini.</div>
          ) : (
            <>
              <textarea className="input" style={{ width: '100%', height: 46, padding: '7px 9px', resize: 'none', marginBottom: 9, fontFamily: 'inherit' }} placeholder="Catatan keputusan (opsional, tercatat di jejak audit)…" value={note} onChange={(e: any) => setNote(e.target.value)} />
              <div className="row gap8">
                <Btn sm variant="primary" style={{ flex: 1 }} onClick={() => { onDecide(it.id, 'approve', note.trim()); setNote(''); }}><I.check size={14} /> {it.step === it.chain.length - 1 ? 'Setujui & Finalkan' : 'Setujui Langkah Saya'}</Btn>
                <Btn sm style={{ color: 'var(--amber)', borderColor: 'var(--amber)' }} onClick={() => { onDecide(it.id, 'revise', note.trim()); setNote(''); }}>Minta Revisi</Btn>
                <Btn sm style={{ color: 'var(--red)', borderColor: 'var(--red)' }} onClick={() => { onDecide(it.id, 'reject', note.trim()); setNote(''); }}>Tolak</Btn>
              </div>
            </>
          )}
        </div>
      )}
    </Panel>
  );
}

function RoutingRulesModal({ onClose }: any) {
  const RULES: any[] = ((AMS as any).PLATFORM && (AMS as any).PLATFORM.ROUTING_RULES) || [];
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.4)', zIndex: 90, display: 'grid', placeItems: 'center' }} onClick={onClose}>
      <div className="panel" style={{ width: 760, maxWidth: '94vw', maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' }} onClick={(e: any) => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, borderRadius: '4px 4px 0 0' }}>
          <I.scale size={18} /><div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>Aturan Routing Persetujuan</div><div className="tiny" style={{ color: '#bcd6e4' }}>Matriks otorisasi berbasis jenis & nilai — sesuai kebijakan ISQM firma</div></div>
          <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>
        <div style={{ padding: 16, overflow: 'auto' }}>
          <table className="dtbl">
            <thead><tr><th>Jenis Permintaan</th><th>Ambang 1</th><th>Rute Persetujuan</th><th>Ambang 2</th><th>Rute</th><th>Ambang 3</th><th>Rute</th></tr></thead>
            <tbody>
              {RULES.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{r.kind}</td>
                  <td className="tiny mono muted">{r.t1}</td><td className="tiny">{r.a1}</td>
                  <td className="tiny mono muted">{r.t2}</td><td className="tiny">{r.a2}</td>
                  <td className="tiny mono muted">{r.t3}</td><td className="tiny" style={{ fontWeight: 600, color: 'var(--blue)' }}>{r.a3}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="tiny muted" style={{ marginTop: 12, lineHeight: 1.5 }}>Routing dievaluasi otomatis saat permintaan dibuat dari modul sumber. Eskalasi otomatis terjadi bila SLA terlampaui. EQR (Engagement Quality Review) wajib untuk seluruh emiten PIE dan opini modifikasi.</div>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end' }}>
          <Btn variant="primary" onClick={onClose}>Mengerti</Btn>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Approvals });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { Approvals };
