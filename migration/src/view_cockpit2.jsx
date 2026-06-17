/* [codemod] ESM imports */
import React from 'react';
import { AiInsightPanel } from './ai_insights.jsx';
import { useAudit, useFirm, useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Avatar, Badge, Btn, Donut, Panel, Progress, Tabs } from './ui.jsx';
import { PROGRAMME } from './view_cockpit.jsx';
import { WpCompletenessRecap } from './wp_signoff.jsx';

/* ============================================================
   NeoSuite AMS — Engagement Cockpit (DEEP)
   Engagement command center for the active engagement.
   Overrides window.EngagementCockpit (loaded after view_cockpit.jsx).
   ============================================================ */
const { useState: useStateCkp, useMemo: useMemoCkp } = React;

/* roll-up completion across modules — phases of the audit lifecycle */
const CKP_PHASES = [
  { phase: 'Perencanaan', key: 'Perencanaan', color: '#5b3fa6', weight: 0.152, modules: [
    { id: 'strategy', label: 'Strategy Memo', pct: 100 },
    { id: 'materiality', label: 'Materiality', pct: 100 },
    { id: 'risk', label: 'Risk Assessment', pct: 90 },
    { id: 'icfr', label: 'Internal Control', pct: 75 },
  ]},
  { phase: 'Eksekusi', key: 'Eksekusi', color: '#005085', weight: 0.413, modules: [
    { id: 'wtb', label: 'Working Trial Balance', pct: 100 },
    { id: 'aje', label: 'Adjusting Entries', pct: 80 },
    { id: 'analytical', label: 'Analytical Review', pct: 60 },
    { id: 'sampling', label: 'Sampling', pct: 55 },
    { id: 'confirm', label: 'Confirmation Hub', pct: 64 },
    { id: 'jet', label: 'Journal Entry Testing', pct: 40 },
    { id: 'workpapers', label: 'Working Papers', pct: 58 },
  ]},
  { phase: 'Specifics', key: 'Specifics', color: '#0a6b73', weight: 0.196, modules: [
    { id: 'ecl', label: 'ECL (PSAK 71)', pct: 85 },
    { id: 'psak73', label: 'Sewa (PSAK 73)', pct: 70 },
    { id: 'related', label: 'Related Parties', pct: 50 },
    { id: 'goingconcern', label: 'Going Concern', pct: 65 },
    { id: 'subsequent', label: 'Subsequent Events', pct: 30 },
  ]},
  { phase: 'Finalisasi', key: 'Finalisasi', color: '#9a6a00', weight: 0.185, modules: [
    { id: 'sad', label: 'SAD Ledger', pct: 45 },
    { id: 'fsgen', label: 'Financial Statements', pct: 40 },
    { id: 'opinion', label: 'Audit Opinion', pct: 20 },
    { id: 'mgmtletter', label: 'Management Letter', pct: 15 },
  ]},
];
/* archive carries the residual weight */
const CKP_ARCHIVE_W = 0.054;

/* engagement lifecycle milestones (critical path) */
const CKP_MILESTONES = [
  { n: 1, name: 'Perencanaan & Strategi Audit', phase: 'Perencanaan', date: '2026-01-15', owner: 'Anindya Pramesti', status: 'done', sa: 'SA 300' },
  { n: 2, name: 'Penilaian Risiko & Materialitas', phase: 'Perencanaan', date: '2026-01-28', owner: 'Anindya Pramesti', status: 'done', sa: 'SA 315 · SA 320' },
  { n: 3, name: 'Walkthrough & Uji Pengendalian (ICFR)', phase: 'Perencanaan', date: '2026-02-12', owner: 'Dimas Raharjo', status: 'risk', sa: 'SA 330', note: 'ICFR 75% — sedikit di belakang jadwal.' },
  { n: 4, name: 'Eksekusi Prosedur Substantif', phase: 'Eksekusi', date: '2026-03-20', owner: 'Tim Lapangan', status: 'active', sa: 'SA 330 · SA 500' },
  { n: 5, name: 'Penyelesaian Area Spesifik (ECL · Sewa · GC)', phase: 'Specifics', date: '2026-03-24', owner: 'Sinta Wulandari', status: 'active', sa: 'PSAK 71/73 · SA 570' },
  { n: 6, name: 'Draft Laporan Keuangan & SAD', phase: 'Finalisasi', date: '2026-03-27', owner: 'Anindya Pramesti', status: 'upcoming', sa: 'SA 450' },
  { n: 7, name: 'Review Partner & EQR (ISQM)', phase: 'Finalisasi', date: '2026-03-29', owner: 'Hartono Wijaya', status: 'upcoming', sa: 'ISQM 2 · SA 220' },
  { n: 8, name: 'Tanda Tangan Opini & Penerbitan', phase: 'Finalisasi', date: '2026-03-31', owner: 'Hartono Wijaya', status: 'upcoming', sa: 'SA 700' },
  { n: 9, name: 'Arsip Dokumentasi (ISQM · 60 hari)', phase: 'Arsip', date: '2026-04-30', owner: 'Anindya Pramesti', status: 'upcoming', sa: 'SA 230' },
];

/* per-member effort weighting (aligned to TEAM order) */
const CKP_TEAM_W = [0.071, 0.196, 0.261, 0.179, 0.152, 0.141];
const CKP_RATE = { Partner: 1_500_000, Manager: 900_000, Senior: 600_000, Junior: 350_000 };
const rateFor = (role) => /Partner/.test(role) ? CKP_RATE.Partner : /Manager/.test(role) ? CKP_RATE.Manager : /Senior/.test(role) ? CKP_RATE.Senior : CKP_RATE.Junior;
const gradeOf = (role) => /Partner/.test(role) ? 'Partner' : /Manager/.test(role) ? 'Manager' : /Senior/.test(role) ? 'Senior' : 'Junior';

const CKP_TODAY = new Date('2026-03-09');
const CKP_START = new Date('2026-01-06');

const idDate = (s) => new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' });
const rpM = (n) => 'Rp ' + (n / 1e9).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' M';
const ckpBar = (p) => p >= 85 ? 'var(--green)' : p >= 50 ? 'var(--blue)' : p >= 25 ? 'var(--amber)' : 'var(--red)';
const TONE = { green: 'var(--green)', amber: 'var(--amber)', red: 'var(--red)', blue: 'var(--blue)', gray: 'var(--ink-3)' };
const TONE_BG = { green: 'var(--green-bg)', amber: 'var(--amber-bg)', red: 'var(--red-bg)', blue: 'var(--blue-050)', gray: 'var(--surface-2)' };

/* ---------- small building blocks ---------- */
function Gauge({ pct, size = 54, stroke = 7, tone }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: `0 0 ${size}px` }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={TONE[tone] || 'var(--blue)'} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${Math.min(100, pct) / 100 * c} ${c}`} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
        <span className="mono" style={{ fontSize: size * 0.27, fontWeight: 700, color: 'var(--ink-1)' }}>{Math.round(pct)}<span style={{ fontSize: size * 0.16 }}>%</span></span>
      </div>
    </div>
  );
}

function SignalCard({ icon, label, tone, value, read, onClick }) {
  const IconC = I[icon] || I.pulse;
  return (
    <button onClick={onClick} className="ckp-signal" style={{ borderLeft: `3px solid ${TONE[tone]}`, cursor: onClick ? 'pointer' : 'default' }}>
      <div className="row ac gap8" style={{ marginBottom: 7 }}>
        <span style={{ width: 26, height: 26, borderRadius: 7, background: TONE_BG[tone], color: TONE[tone], display: 'grid', placeItems: 'center', flex: '0 0 26px' }}><IconC size={15} /></span>
        <span className="tiny upper" style={{ fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '.05em' }}>{label}</span>
        <div style={{ flex: 1 }} />
        <span style={{ width: 8, height: 8, borderRadius: 50, background: TONE[tone] }} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink-1)', lineHeight: 1.1 }}>{value}</div>
      <div className="tiny muted" style={{ marginTop: 3, lineHeight: 1.35 }}>{read}</div>
    </button>
  );
}

function EVBar({ label, pct, tone, hint }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="row jb ac" style={{ marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
        <span className="mono tiny" style={{ fontWeight: 700, color: TONE[tone] }}>{Math.round(pct)}% {hint && <span className="muted" style={{ fontWeight: 500 }}>· {hint}</span>}</span>
      </div>
      <div style={{ height: 9, borderRadius: 6, background: 'var(--surface-3)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ width: Math.min(100, pct) + '%', height: '100%', borderRadius: 6, background: TONE[tone] }} />
      </div>
    </div>
  );
}

/* ============================================================ */
function EngagementCockpit() {
  const { fmt } = window.AMS;
  const nav = useNav();
  const { activeEngagement, activeClient } = useFirm();
  const { reviewNotes, aje, risks, workpapers, team, activity, deadlines } = useAudit();
  const e = activeEngagement;
  const [tab, setTab] = useStateCkp('ringkasan');

  const D = useMemoCkp(() => {
    const allMods = CKP_PHASES.flatMap(p => p.modules);
    const overall = e.progress != null ? e.progress : Math.round(allMods.reduce((s, m) => s + m.pct, 0) / allMods.length);
    const phasePct = (p) => Math.round(p.modules.reduce((s, m) => s + m.pct, 0) / p.modules.length);

    const dl = new Date(e.deadline);
    const totalDays = Math.max(1, (dl - CKP_START) / 86400000);
    const elapsedPct = Math.min(100, Math.max(0, (CKP_TODAY - CKP_START) / 86400000 / totalDays * 100));
    const daysLeft = Math.round((dl - CKP_TODAY) / 86400000);
    const burnPct = e.budgetHrs ? e.actualHrs / e.budgetHrs * 100 : 0;

    /* review notes (engagement scope) */
    const openNotes = reviewNotes.filter(n => n.status === 'open');
    const highOpen = openNotes.filter(n => n.priority === 'high');
    /* AJE */
    const proposedAje = aje.filter(a => a.status === 'Proposed');
    const proposedAmt = proposedAje.reduce((s, a) => s + a.amount, 0);
    /* WP */
    const wpReviewed = workpapers.filter(w => w.status === 'Reviewed').length;
    const wpNoReviewer = workpapers.filter(w => w.reviewer === '—');
    /* risks */
    const sigRisks = risks.filter(r => r.inherent === 'Significant');
    const fraudRisks = risks.filter(r => r.fraud);
    /* programme (cross-file; guarded) */
    const PRG = (typeof PROGRAMME !== 'undefined' && Array.isArray(PROGRAMME)) ? PROGRAMME : [];
    const procs = PRG.flatMap(r => r.procs || []);
    const excTot = procs.reduce((s, p) => s + (p.exc || 0), 0);
    const sigAreas = PRG.filter(r => r.sig);
    const sigCovered = sigAreas.filter(r => r.procs.some(p => p.status === 'done')).length;

    /* health tones */
    const schedTone = overall >= elapsedPct - 4 ? 'green' : overall >= elapsedPct - 14 ? 'amber' : 'red';
    const budgetTone = burnPct <= overall + 5 ? 'green' : burnPct <= overall + 15 ? 'amber' : 'red';
    const qualTone = openNotes.length === 0 ? 'green' : highOpen.length >= 3 ? 'red' : 'amber';
    const riskTone = sigAreas.length && sigCovered === sigAreas.length && excTot === 0 ? 'green' : excTot > 2 || (sigAreas.length && sigCovered < sigAreas.length / 2) ? 'red' : 'amber';
    const docTone = wpReviewed === workpapers.length ? 'green' : wpNoReviewer.length > 2 ? 'red' : 'amber';

    const toneScore = { green: 0, amber: 1, red: 2, blue: 0, gray: 0 };
    const tones = [schedTone, budgetTone, qualTone, riskTone, docTone];
    const worst = Math.max(...tones.map(t => toneScore[t]));
    const verdict = worst >= 2 ? { tone: 'red', l: 'Perlu Tindakan' } : worst >= 1 ? { tone: 'amber', l: 'Perlu Perhatian' } : { tone: 'green', l: 'Sehat / On-track' };

    /* phase hours model (data-driven from phase progress) */
    const phaseRows = CKP_PHASES.map(p => ({ phase: p.phase, color: p.color, pct: phasePct(p), bud: Math.round(p.weight * e.budgetHrs), })).concat([{ phase: 'Review & Arsip', color: '#7a7f87', pct: 0, bud: Math.round(CKP_ARCHIVE_W * e.budgetHrs) }]);
    let actRaw = phaseRows.map(r => r.bud * (r.pct / 100));
    const rawSum = actRaw.reduce((s, x) => s + x, 0) || 1;
    phaseRows.forEach((r, i) => { r.act = Math.round(actRaw[i] / rawSum * e.actualHrs); });

    /* per-member effort + assignments */
    const fn = (full) => (full || '').split(' ')[0];
    const members = team.map((m, i) => {
      const w = CKP_TEAM_W[i] != null ? CKP_TEAM_W[i] : 1 / team.length;
      const bud = Math.round(w * e.budgetHrs), act = Math.round(w * e.actualHrs);
      const grade = gradeOf(m.role), rate = rateFor(m.role);
      const first = fn(m.name);
      const wpPrep = workpapers.filter(x => fn(x.preparer) === first).length;
      const wpRev = workpapers.filter(x => fn(x.reviewer) === first).length;
      const procPrep = procs.filter(x => fn(x.prep) === first).length;
      const procRev = procs.filter(x => fn(x.rev) === first).length;
      return { ...m, grade, rate, bud, act, wpPrep, wpRev, procPrep, procRev, wip: act * rate };
    });
    const wipTot = members.reduce((s, m) => s + m.wip, 0);
    const stdBudgetCost = members.reduce((s, m) => s + m.bud * m.rate, 0);
    const fee = activeClient?.fee || 0;

    return {
      overall, phasePct, elapsedPct, daysLeft, burnPct,
      openNotes, highOpen, proposedAje, proposedAmt, wpReviewed, wpNoReviewer,
      sigRisks, fraudRisks, excTot, sigAreas, sigCovered,
      schedTone, budgetTone, qualTone, riskTone, docTone, verdict,
      phaseRows, members, wipTot, stdBudgetCost, fee,
    };
  }, [e, reviewNotes, aje, risks, workpapers, team, activeClient]);

  const TABS = [
    { id: 'ringkasan', label: 'Ringkasan' },
    { id: 'jalur', label: 'Jalur Kritis' },
    { id: 'anggaran', label: 'Anggaran & Jam' },
    { id: 'tim', label: 'Tim & Beban' },
    { id: 'risiko', label: 'Risiko & Kualitas' },
  ];

  return (
    <>
      <SubBar moduleId="cockpit" right={
        <div className="row gap8 ac">
          <Badge kind={D.verdict.tone === 'red' ? 'red' : D.verdict.tone === 'amber' ? 'amber' : 'green'}>{D.verdict.l}</Badge>
          <Badge kind="blue">{e.id} · {e.fy}</Badge>
          <Btn sm><I.download size={13} /> Status Report</Btn>
          <Btn sm variant="primary" onClick={() => nav('engagement')}><I.briefcase size={14} /> Kelola Engagement</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        {/* ---------- HERO ---------- */}
        <Panel noBody style={{ marginBottom: 12, overflow: 'hidden' }}>
          <div className="ckp-hero">
            <div style={{ position: 'relative', width: 100, height: 100, flex: '0 0 100px' }}>
              <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="9" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="#4db8ff" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${D.overall / 100 * 264} 264`} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', flexDirection: 'column' }}>
                <div className="mono" style={{ fontSize: 26, fontWeight: 700 }}>{D.overall}%</div>
                <div className="tiny" style={{ color: '#bcd6e4' }}>selesai</div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.01em' }}>{activeClient?.name}</div>
              <div style={{ fontSize: 12.5, color: '#bcd6e4', margin: '3px 0 9px' }}>{e.type} · {e.standard} · Partner {e.partner.split(',')[0]} · Manager {e.manager}</div>
              <div className="row gap6 wrap">
                <span className="ckp-htag">Fase: {e.phase}</span>
                <span className="ckp-htag" style={{ background: e.risk === 'High' ? 'rgba(255,107,87,.24)' : 'rgba(255,255,255,.14)' }}>Risiko {e.risk}</span>
                <span className="ckp-htag">Materialitas {rpM(e.materiality)}</span>
                <span className="ckp-htag">Fee {rpM(D.fee)}</span>
              </div>
            </div>
            <div className="ckp-hero-stats">
              {[
                ['Sisa Hari', D.daysLeft + ' hari', D.daysLeft < 14 ? '#ff9b8a' : '#fff', idDate(e.deadline)],
                ['Budget Burn', Math.round(D.burnPct) + '%', D.burnPct > 100 ? '#ff9b8a' : '#fff', `${fmt(e.actualHrs)}/${fmt(e.budgetHrs)} jam`],
                ['Review Notes', D.openNotes.length + ' open', D.openNotes.length ? '#ffd479' : '#7fe0a8', `${D.highOpen.length} prioritas tinggi`],
                ['Risk Signifikan', `${D.sigCovered}/${D.sigAreas.length}`, D.sigCovered < D.sigAreas.length ? '#ffd479' : '#7fe0a8', `${D.excTot} pengecualian`],
              ].map(([l, v, c, sub]) => (
                <div key={l} className="ckp-hstat">
                  <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: c }}>{v}</div>
                  <div className="tiny" style={{ color: '#bcd6e4', fontWeight: 600 }}>{l}</div>
                  <div className="tiny" style={{ color: '#8fb0c2', fontSize: 10 }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        {/* ---------- HEALTH SIGNAL BAND ---------- */}
        <div className="ckp-signals">
          <SignalCard icon="calendar" label="Jadwal" tone={D.schedTone} value={`${D.overall}% vs ${Math.round(D.elapsedPct)}% waktu`}
            read={D.schedTone === 'green' ? 'Sesuai jadwal' : D.schedTone === 'amber' ? 'Sedikit di belakang jadwal' : 'Tertinggal dari jadwal'} onClick={() => setTab('jalur')} />
          <SignalCard icon="coins" label="Anggaran" tone={D.budgetTone} value={`${Math.round(D.burnPct)}% terpakai`}
            read={D.budgetTone === 'green' ? 'Efisien vs progres' : D.budgetTone === 'amber' ? 'Pantau pemakaian jam' : 'Berisiko over-budget'} onClick={() => setTab('anggaran')} />
          <SignalCard icon="check" label="Kualitas Review" tone={D.qualTone} value={`${D.openNotes.length} catatan open`}
            read={D.qualTone === 'green' ? 'Semua terselesaikan' : `${D.highOpen.length} prioritas tinggi tertunda`} onClick={() => setTab('risiko')} />
          <SignalCard icon="shield" label="Risiko & Pengecualian" tone={D.riskTone} value={`${D.excTot} pengecualian`}
            read={`${D.sigCovered}/${D.sigAreas.length} risiko signifikan tertangani`} onClick={() => setTab('risiko')} />
          <SignalCard icon="flask" label="Dokumentasi WP" tone={D.docTone} value={`${D.wpReviewed}/${workpapers.length} di-review`}
            read={D.wpNoReviewer.length ? `${D.wpNoReviewer.length} WP belum ada reviewer` : 'Lengkap'} onClick={() => nav('workpapers')} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <Tabs tabs={TABS} active={tab} onChange={setTab} />
        </div>

        {tab === 'ringkasan' && <TabRingkasan D={D} e={e} nav={nav} activity={activity} setTab={setTab} />}
        {tab === 'jalur' && <TabJalur D={D} e={e} nav={nav} deadlines={deadlines} activeClient={activeClient} />}
        {tab === 'anggaran' && <TabAnggaran D={D} e={e} />}
        {tab === 'tim' && <TabTim D={D} nav={nav} />}
        {tab === 'risiko' && <TabRisiko D={D} e={e} nav={nav} />}

      </div></div>
      <CockpitStyles />
    </>
  );
}

/* ============================================================
   TAB · RINGKASAN — phase pipeline + needs attention + activity
   ============================================================ */
function TabRingkasan({ D, e, nav, activity, setTab }) {
  /* assemble prioritized action items */
  const items = [];
  if (D.daysLeft <= 25) items.push({ tone: D.daysLeft < 14 ? 'red' : 'amber', icon: 'calendar', t: `Tenggat fieldwork ${D.daysLeft} hari lagi`, sub: `Target ${idDate(e.deadline)} · ${D.overall}% selesai`, route: 'programme' });
  if (D.proposedAje.length) items.push({ tone: 'amber', icon: 'ledger', t: `${D.proposedAje.length} AJE menunggu posting`, sub: `Nilai usulan ${rpM(D.proposedAmt)} — perlu persetujuan partner`, route: 'aje' });
  if (D.excTot) items.push({ tone: D.excTot > 2 ? 'red' : 'amber', icon: 'alert', t: `${D.excTot} pengecualian terbuka pada prosedur`, sub: 'Evaluasi dampak terhadap salah saji & materialitas', route: 'programme' });
  D.highOpen.slice(0, 2).forEach(n => items.push({ tone: 'red', icon: 'check', t: `Review note: ${n.moduleLabel}`, sub: n.text, route: n.module }));
  if (D.wpNoReviewer.length) items.push({ tone: 'amber', icon: 'flask', t: `${D.wpNoReviewer.length} kertas kerja belum di-review`, sub: D.wpNoReviewer.map(w => w.ref + ' ' + w.title).join(' · '), route: 'workpapers' });
  if (D.sigCovered < D.sigAreas.length) items.push({ tone: 'amber', icon: 'shield', t: `${D.sigAreas.length - D.sigCovered} risiko signifikan belum tuntas diuji`, sub: 'Pastikan setiap RoMM signifikan memiliki prosedur selesai', route: 'risk' });

  const actIcon = { upload: 'upload', check: 'check', sync: 'sync', flag: 'flag', send: 'send' };

  return (
    <div className="grid" style={{ gap: 12 }}>
      {/* phase pipeline */}
      <Panel noBody>
        <div className="panel-h"><h3>Pipeline Fase Audit</h3><span className="sub">roll-up penyelesaian modul per fase · klik modul untuk membuka</span></div>
        <div className="ckp-phases">
          {CKP_PHASES.map(p => {
            const pp = D.phasePct(p);
            const isActive = p.phase === e.phase || (e.phase === 'Eksekusi' && p.phase === 'Specifics');
            return (
              <div key={p.phase} className={'ckp-phasecol' + (isActive ? ' on' : '')}>
                <div className="ckp-phasecol-h">
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: p.color }} />
                  <span style={{ fontWeight: 700, fontSize: 12.5 }}>{p.phase}</span>
                  {isActive && <span className="ckp-now">AKTIF</span>}
                  <div style={{ flex: 1 }} />
                  <span className="mono tiny" style={{ fontWeight: 700, color: ckpBar(pp) }}>{pp}%</span>
                </div>
                <div style={{ padding: '8px 10px' }}>
                  {p.modules.map(m => (
                    <div key={m.id} onClick={() => nav(m.id)} className="ckp-modrow">
                      <div className="row jb ac" style={{ marginBottom: 4 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 600 }} className="truncate">{m.label}</span>
                        <span className="mono tiny" style={{ color: ckpBar(m.pct), fontWeight: 700 }}>{m.pct}%</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: m.pct + '%', height: '100%', borderRadius: 3, background: ckpBar(m.pct) }} /></div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* AI Tier-2: radar kontradiksi lintas-modul */}
      <AiInsightPanel />

      <div className="grid" style={{ gridTemplateColumns: '1.35fr 1fr', gap: 12, alignItems: 'start' }}>
        {/* needs attention */}
        <Panel noBody>
          <div className="panel-h"><h3>Perlu Perhatian Sekarang</h3><span className="sub">{items.length} item</span></div>
          <div style={{ padding: '6px 8px 10px' }}>
            {items.length === 0 && <div className="muted tiny" style={{ padding: 18, textAlign: 'center' }}>Tidak ada item mendesak. 🎯</div>}
            {items.map((it, i) => {
              const IconC = I[it.icon] || I.alert;
              return (
                <div key={i} className="ckp-attn" onClick={() => nav(it.route)}>
                  <span className="ckp-attn-ic" style={{ background: TONE_BG[it.tone], color: TONE[it.tone] }}><IconC size={15} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-1)' }}>{it.t}</div>
                    <div className="tiny muted" style={{ marginTop: 1, lineHeight: 1.4 }}>{it.sub}</div>
                  </div>
                  <span className="ckp-attn-go"><I.arrowRight size={15} /></span>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* activity feed */}
        <Panel noBody>
          <div className="panel-h"><h3>Aktivitas Terkini</h3></div>
          <div style={{ padding: '4px 12px 10px' }}>
            {activity.map((a, i) => {
              const IconC = I[actIcon[a.icon] || 'pulse'] || I.pulse;
              return (
                <div key={i} className="ckp-act">
                  <span className="ckp-act-ic"><IconC size={13} /></span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, lineHeight: 1.45 }}><b style={{ fontWeight: 700 }}>{a.who}</b> {a.what}</div>
                    <div className="tiny muted">{a.when}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ============================================================
   TAB · JALUR KRITIS — milestone timeline + deadlines
   ============================================================ */
const MS_TONE = { done: 'green', active: 'blue', risk: 'amber', upcoming: 'gray' };
const MS_LABEL = { done: 'Selesai', active: 'Berjalan', risk: 'Berisiko', upcoming: 'Akan datang' };
function TabJalur({ D, e, nav, deadlines, activeClient }) {
  const dl = new Date(e.deadline);
  const span = Math.max(1, (new Date(CKP_MILESTONES[CKP_MILESTONES.length - 1].date) - CKP_START) / 86400000);
  const posOf = (d) => Math.min(100, Math.max(0, (new Date(d) - CKP_START) / 86400000 / span * 100));
  const todayPos = posOf(CKP_TODAY.toISOString().slice(0, 10));
  const cname = activeClient?.name?.replace('PT ', '') || '';
  const engDeadlines = deadlines.filter(d => cname && d.client.includes(cname.split(' ')[0]));
  const others = deadlines.filter(d => !engDeadlines.includes(d));
  const shown = [...engDeadlines, ...others].slice(0, 4);

  return (
    <div className="grid" style={{ gap: 12 }}>
      {/* horizontal rail */}
      <Panel noBody>
        <div className="panel-h"><h3>Jalur Kritis Engagement</h3><span className="sub">{CKP_MILESTONES.filter(m => m.status === 'done').length}/{CKP_MILESTONES.length} milestone selesai · hari ini {idDate(CKP_TODAY.toISOString())}</span></div>
        <div style={{ padding: '26px 22px 16px' }}>
          <div className="ckp-rail">
            <div className="ckp-rail-line" />
            <div className="ckp-rail-fill" style={{ width: todayPos + '%' }} />
            <div className="ckp-today" style={{ left: todayPos + '%' }}><span>HARI INI</span></div>
            {CKP_MILESTONES.map(m => (
              <div key={m.n} className="ckp-node" style={{ left: posOf(m.date) + '%' }} title={m.name}>
                <span className="ckp-dot" style={{ background: TONE[MS_TONE[m.status]], boxShadow: m.status === 'active' ? `0 0 0 4px ${TONE_BG.blue}` : 'none' }}>{m.status === 'done' ? '✓' : m.n}</span>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: 12, alignItems: 'start' }}>
        {/* milestone list */}
        <Panel noBody>
          <div className="panel-h"><h3>Milestone & Sign-off</h3></div>
          <div style={{ padding: '6px 6px 10px' }}>
            {CKP_MILESTONES.map(m => {
              const tone = MS_TONE[m.status];
              const overdue = m.status !== 'done' && new Date(m.date) < CKP_TODAY;
              return (
                <div key={m.n} className="ckp-ms">
                  <span className="ckp-ms-dot" style={{ background: TONE[tone] }}>{m.status === 'done' ? <I.check size={13} /> : m.n}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row ac gap8" style={{ flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700 }}>{m.name}</span>
                      <span className="chip tiny" style={{ height: 17, fontFamily: 'var(--mono)' }}>{m.sa}</span>
                      {overdue && <span className="badge b-red" style={{ fontSize: 8.5, padding: '0 5px' }}>LEWAT TARGET</span>}
                    </div>
                    <div className="tiny muted" style={{ marginTop: 2 }}>{m.phase} · {m.owner}{m.note ? ' · ' + m.note : ''}</div>
                  </div>
                  <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
                    <div className="mono tiny" style={{ fontWeight: 700 }}>{idDate(m.date)}</div>
                    <Badge kind={tone === 'gray' ? 'gray' : tone}>{MS_LABEL[m.status]}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* upcoming deadlines */}
        <Panel noBody>
          <div className="panel-h"><h3>Tenggat Mendatang</h3></div>
          <div style={{ padding: '8px 12px 12px' }}>
            {shown.map((d, i) => (
              <div key={i} className="ckp-dl">
                <span style={{ width: 7, height: 7, borderRadius: 50, background: TONE[d.sev === 'red' ? 'red' : d.sev === 'amber' ? 'amber' : 'gray'], flex: '0 0 7px' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }} className="truncate">{d.task}</div>
                  <div className="tiny muted">{d.client}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="mono tiny" style={{ fontWeight: 700 }}>{d.date}</div>
                  <div className="tiny" style={{ color: TONE[d.sev === 'red' ? 'red' : d.sev === 'amber' ? 'amber' : 'gray'], fontWeight: 600 }}>{d.days} hari</div>
                </div>
              </div>
            ))}
            <div className="ckp-info" style={{ marginTop: 8 }}><I.lock size={13} /> Arsip dokumentasi wajib selesai ≤60 hari setelah tanggal opini (ISQM 1 · SA 230).</div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ============================================================
   TAB · ANGGARAN & JAM — earned value + by phase + fee recovery
   ============================================================ */
function TabAnggaran({ D, e }) {
  const { fmt } = window.AMS;
  const margin = D.fee ? (1 - D.stdBudgetCost / D.fee) * 100 : 0;
  const recovery = D.stdBudgetCost ? D.wipTot / (D.stdBudgetCost * (D.overall / 100) || 1) * 100 : 0;
  const variance = e.actualHrs - Math.round(e.budgetHrs * D.overall / 100);

  return (
    <div className="grid" style={{ gap: 12 }}>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
        {/* earned value */}
        <Panel noBody>
          <div className="panel-h"><h3>Earned Value — Waktu · Anggaran · Pekerjaan</h3></div>
          <div style={{ padding: '14px 16px' }}>
            <EVBar label="Waktu berjalan" pct={D.elapsedPct} tone="gray" hint={`${D.daysLeft} hari tersisa`} />
            <EVBar label="Anggaran jam terpakai" pct={D.burnPct} tone={D.budgetTone} hint={`${fmt(e.actualHrs)}/${fmt(e.budgetHrs)} jam`} />
            <EVBar label="Pekerjaan selesai" pct={D.overall} tone={D.schedTone} hint={`${CKP_MILESTONES.filter(m => m.status === 'done').length} milestone`} />
            <div className="ckp-info" style={{ marginTop: 4 }}>
              {variance > 0
                ? <span><b>{fmt(variance)} jam</b> di atas yang seharusnya untuk progres {D.overall}% — efisiensi perlu dipantau.</span>
                : <span>Pemakaian jam <b>{fmt(Math.abs(variance))} jam</b> di bawah kurva progres — efisien.</span>}
            </div>
          </div>
        </Panel>

        {/* fee recovery */}
        <Panel noBody>
          <div className="panel-h"><h3>Fee & Realisasi (WIP)</h3></div>
          <div style={{ padding: '12px 16px' }}>
            <div className="ckp-fee-grid">
              {[
                ['Fee Perikatan', rpM(D.fee), 'var(--ink-1)'],
                ['Estimasi Biaya Std (budget)', rpM(D.stdBudgetCost), 'var(--ink-1)'],
                ['Margin Rencana', Math.round(margin) + '%', margin >= 30 ? 'var(--green)' : 'var(--amber)'],
                ['WIP Terpakai (aktual)', rpM(D.wipTot), 'var(--blue)'],
              ].map(([l, v, c]) => (
                <div key={l} className="ckp-fee">
                  <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: c }}>{v}</div>
                  <div className="tiny muted upper">{l}</div>
                </div>
              ))}
            </div>
            <div className="divider" />
            <div className="row jb ac" style={{ marginBottom: 5 }}>
              <span className="tiny muted">WIP vs Fee</span>
              <span className="mono tiny" style={{ fontWeight: 700 }}>{Math.round(D.wipTot / (D.fee || 1) * 100)}% terbakar</span>
            </div>
            <Progress value={D.wipTot / (D.fee || 1) * 100} color="var(--blue)" />
            <div className="ckp-info" style={{ marginTop: 10 }}>Realisasi pada tarif standar; margin akhir bergantung pada selisih jam aktual vs budget hingga penerbitan opini.</div>
          </div>
        </Panel>
      </div>

      {/* hours by phase */}
      <Panel noBody>
        <div className="panel-h"><h3>Jam per Fase — Budget vs Aktual</h3><span className="sub">total {fmt(e.actualHrs)} / {fmt(e.budgetHrs)} jam</span></div>
        <table className="dtbl">
          <thead><tr>
            <th>Fase</th>
            <th className="num" style={{ width: 90 }}>Budget</th>
            <th className="num" style={{ width: 90 }}>Aktual</th>
            <th className="num" style={{ width: 90 }}>Sisa</th>
            <th style={{ width: 220 }}>Pemakaian</th>
            <th className="num" style={{ width: 70 }}>Selesai</th>
          </tr></thead>
          <tbody>
            {D.phaseRows.map(r => {
              const used = r.bud ? r.act / r.bud * 100 : 0;
              const over = r.act > r.bud;
              return (
                <tr key={r.phase}>
                  <td><span className="row ac gap8"><span style={{ width: 9, height: 9, borderRadius: 3, background: r.color, flex: '0 0 9px' }} /><span style={{ fontWeight: 600, fontSize: 12 }}>{r.phase}</span></span></td>
                  <td className="num mono tiny">{fmt(r.bud)}</td>
                  <td className="num mono tiny" style={{ fontWeight: 700 }}>{fmt(r.act)}</td>
                  <td className="num mono tiny" style={{ color: over ? 'var(--red)' : 'var(--ink-3)' }}>{fmt(r.bud - r.act)}</td>
                  <td>
                    <div className="row ac gap8">
                      <div style={{ flex: 1, height: 7, borderRadius: 5, background: 'var(--surface-3)', overflow: 'hidden' }}><div style={{ width: Math.min(100, used) + '%', height: '100%', background: over ? 'var(--red)' : r.color }} /></div>
                      <span className="mono tiny" style={{ width: 34, textAlign: 'right', color: over ? 'var(--red)' : 'var(--ink-2)', fontWeight: 600 }}>{Math.round(used)}%</span>
                    </div>
                  </td>
                  <td className="num mono tiny" style={{ color: ckpBar(r.pct), fontWeight: 700 }}>{r.pct}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

/* ============================================================
   TAB · TIM & BEBAN — roster, utilization, assignments
   ============================================================ */
function TabTim({ D, nav }) {
  const { fmt } = window.AMS;
  const maxAct = Math.max(...D.members.map(m => m.act), 1);
  const totalAssign = (m) => m.wpPrep + m.wpRev + m.procPrep;
  return (
    <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Tim Engagement</h3><span className="sub">{D.members.length} anggota · jam aktual & penugasan</span></div>
        <div style={{ padding: '6px 6px 10px' }}>
          {D.members.map(m => {
            const over = m.act > m.bud;
            return (
              <div key={m.name} className="ckp-member">
                <Avatar name={m.name} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row ac gap8">
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{m.name}</span>
                    <span className="chip tiny" style={{ height: 17 }}>{m.grade}</span>
                    {m.util >= 92 && <span className="badge b-red" style={{ fontSize: 8.5, padding: '0 5px' }}>OVER-UTILIZED</span>}
                  </div>
                  <div className="tiny muted" style={{ marginBottom: 5 }}>{m.role} · {fmt(m.act)}/{fmt(m.bud)} jam · {m.wpPrep} WP disusun · {m.wpRev} WP direviu · {m.procPrep} prosedur</div>
                  <div className="row ac gap8">
                    <div style={{ flex: 1, height: 6, borderRadius: 5, background: 'var(--surface-3)', overflow: 'hidden' }}><div style={{ width: (m.act / maxAct * 100) + '%', height: '100%', background: over ? 'var(--red)' : 'var(--blue)' }} /></div>
                    <span className="mono tiny muted" style={{ width: 70, textAlign: 'right' }}>Util {m.util}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="grid" style={{ gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Distribusi Beban Jam</h3></div>
          <div style={{ padding: '10px 14px 14px' }} className="row ac gap12">
            <Donut size={104} thickness={15}
              segments={D.members.map((m, i) => ({ value: m.act, color: ['#013a52', '#005085', '#1d6fb8', '#0a6b73', '#5b3fa6', '#9a6a00'][i % 6] }))}
              center={<div><div className="mono" style={{ fontSize: 17, fontWeight: 700 }}>{fmt(D.members.reduce((s, m) => s + m.act, 0))}</div><div className="tiny muted">jam</div></div>} />
            <div style={{ flex: 1 }}>
              {D.members.map((m, i) => (
                <div key={m.name} className="row jb ac" style={{ padding: '3px 0' }}>
                  <span className="row ac gap6 tiny"><span style={{ width: 8, height: 8, borderRadius: 2, background: ['#013a52', '#005085', '#1d6fb8', '#0a6b73', '#5b3fa6', '#9a6a00'][i % 6] }} />{m.name.split(' ')[0]}</span>
                  <span className="mono tiny" style={{ fontWeight: 700 }}>{fmt(m.act)}j</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
        <Panel noBody>
          <div className="panel-h"><h3>Penugasan Kertas Kerja</h3></div>
          <div style={{ padding: '8px 12px 12px' }}>
            <div className="ckp-info" style={{ marginBottom: 8 }}>Penanggung jawab tersinkron dari indeks kertas kerja & program audit.</div>
            <button className="btn sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => nav('workpapers')}><I.flask size={14} /> Buka Indeks Kertas Kerja</button>
            <button className="btn sm" style={{ width: '100%', justifyContent: 'center', marginTop: 6 }} onClick={() => nav('programme')}><I.layers size={14} /> Buka Program Audit</button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ============================================================
   TAB · RISIKO & KUALITAS — risk coverage, notes board, readiness gate
   ============================================================ */
function TabRisiko({ D, e, nav }) {
  const PRG = (typeof PROGRAMME !== 'undefined' && Array.isArray(PROGRAMME)) ? PROGRAMME : [];
  const sigData = D.sigRisks.map(r => {
    const area = PRG.find(p => p.area && (p.area.includes(r.area) || r.area.includes(p.area.split(' ')[0])));
    const procs = area ? area.procs : [];
    const dn = procs.filter(p => p.status === 'done').length;
    const exc = procs.reduce((s, p) => s + (p.exc || 0), 0);
    return { ...r, total: procs.length, done: dn, exc };
  });

  /* opinion readiness gate */
  const gate = [
    { l: 'Seluruh risiko signifikan direspons & diuji', ok: D.sigCovered === D.sigAreas.length, sub: `${D.sigCovered}/${D.sigAreas.length} area tuntas` },
    { l: 'Tidak ada pengecualian belum dievaluasi', ok: D.excTot === 0, sub: `${D.excTot} pengecualian terbuka` },
    { l: 'AJE signifikan telah dibukukan', ok: D.proposedAje.length === 0, sub: `${D.proposedAje.length} AJE usulan tertunda` },
    { l: 'Seluruh kertas kerja telah di-review', ok: D.wpNoReviewer.length === 0, sub: `${D.wpNoReviewer.length} WP tanpa reviewer` },
    { l: 'Seluruh catatan review terselesaikan', ok: D.openNotes.length === 0, sub: `${D.openNotes.length} catatan open` },
    { l: 'Penilaian going concern selesai', ok: false, sub: 'Going Concern 65% — dalam proses' },
    { l: 'Telaah peristiwa kemudian (subsequent)', ok: false, sub: 'Subsequent Events 30% — dalam proses' },
    { l: 'Konfirmasi independensi tim lengkap', ok: true, sub: 'Partner & manager terdeklarasi' },
  ];
  const ready = gate.filter(g => g.ok).length;
  const notesByPr = { high: D.openNotes.filter(n => n.priority === 'high'), medium: D.openNotes.filter(n => n.priority === 'medium'), low: D.openNotes.filter(n => n.priority === 'low') };
  const prTone = { high: 'red', medium: 'amber', low: 'gray' };
  const prLabel = { high: 'Prioritas Tinggi', medium: 'Sedang', low: 'Rendah' };

  return (
    <div className="grid" style={{ gap: 12 }}>
      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 12, alignItems: 'start' }}>
        {/* significant risk coverage */}
        <Panel noBody>
          <div className="panel-h"><h3>Cakupan Risiko Signifikan (RoMM)</h3><span className="sub">{D.sigCovered}/{D.sigAreas.length} tuntas · {D.fraudRisks.length} risiko kecurangan</span></div>
          <div style={{ padding: '6px 6px 10px' }}>
            {sigData.map(r => {
              const full = r.total > 0 && r.done === r.total;
              const tone = full ? 'green' : r.done > 0 ? 'amber' : 'red';
              return (
                <div key={r.id} className="ckp-risk" onClick={() => nav('risk')}>
                  <span className="ckp-risk-ic" style={{ background: TONE_BG[tone], color: TONE[tone] }}>{full ? <I.checkCircle size={16} /> : <I.alert size={16} />}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row ac gap6" style={{ flexWrap: 'wrap' }}>
                      <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--ink-3)' }}>{r.id}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 700 }}>{r.area}</span>
                      {r.fraud && <span className="badge b-amber" style={{ fontSize: 8.5, padding: '0 5px' }}>FRAUD · SA 240</span>}
                      {r.exc > 0 && <span className="badge b-red" style={{ fontSize: 8.5, padding: '0 5px' }}>{r.exc} EXC</span>}
                    </div>
                    <div className="tiny muted" style={{ marginTop: 1, lineHeight: 1.4 }}>{r.response} · WP {r.wp} · {r.owner}</div>
                  </div>
                  <div style={{ textAlign: 'right', flex: '0 0 64px' }}>
                    <div className="mono tiny" style={{ fontWeight: 700, color: TONE[tone] }}>{r.done}/{r.total || '–'}</div>
                    <div style={{ width: 56, marginTop: 3 }}><Progress value={r.total ? r.done / r.total * 100 : 0} color={TONE[tone]} /></div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* opinion readiness gate */}
        <Panel noBody>
          <div className="panel-h"><h3>Kesiapan Opini & EQR</h3></div>
          <div style={{ padding: '12px 14px' }}>
            <div className="row ac gap10" style={{ marginBottom: 12 }}>
              <Gauge pct={ready / gate.length * 100} size={58} stroke={8} tone={ready === gate.length ? 'green' : ready >= gate.length * 0.6 ? 'amber' : 'red'} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{ready} / {gate.length} kriteria siap</div>
                <div className="tiny muted">Gate penerbitan laporan auditor (SA 700 · ISQM 2)</div>
              </div>
            </div>
            {/* rekap kelengkapan kertas kerja auditable (sign-off + bukti kanonik) */}
            <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--line-soft)' }}>
              <div className="tiny muted upper" style={{ fontWeight: 700, letterSpacing: '.04em', marginBottom: 8 }}>Kelengkapan Kertas Kerja</div>
              <WpCompletenessRecap />
            </div>
            {gate.map((g, i) => (
              <div key={i} className="ckp-gate">
                <span style={{ color: g.ok ? 'var(--green)' : 'var(--ink-4)', flex: '0 0 auto', marginTop: 1 }}>{g.ok ? <I.checkCircle size={15} /> : <I.alert size={15} />}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: g.ok ? 'var(--ink-1)' : 'var(--ink-2)' }}>{g.l}</div>
                  <div className="tiny muted">{g.sub}</div>
                </div>
              </div>
            ))}
            <button className="btn sm" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }} onClick={() => nav('eqr')}><I.shield size={14} /> Buka EQR</button>
          </div>
        </Panel>
      </div>

      {/* review notes board */}
      <Panel noBody>
        <div className="panel-h"><h3>Papan Catatan Review</h3><span className="sub">{D.openNotes.length} terbuka</span></div>
        <div className="ckp-notes">
          {['high', 'medium', 'low'].map(pr => (
            <div key={pr} className="ckp-notecol">
              <div className="ckp-notecol-h" style={{ color: TONE[prTone[pr]] }}>
                <span style={{ width: 8, height: 8, borderRadius: 50, background: TONE[prTone[pr]] }} />
                {prLabel[pr]} <span className="muted" style={{ fontWeight: 500 }}>· {notesByPr[pr].length}</span>
              </div>
              {notesByPr[pr].length === 0 && <div className="tiny muted" style={{ padding: '10px 4px' }}>Tidak ada.</div>}
              {notesByPr[pr].map(n => (
                <div key={n.id} className="ckp-note" onClick={() => nav(n.module)}>
                  <div className="tiny" style={{ fontSize: 12, lineHeight: 1.4, color: 'var(--ink-1)', marginBottom: 6 }}>{n.text}</div>
                  <div className="row ac gap6" style={{ flexWrap: 'wrap' }}>
                    <span className="chip tiny" style={{ height: 16 }}>{n.moduleLabel}</span>
                    <div style={{ flex: 1 }} />
                    <Avatar name={n.author} size={16} />
                    <span className="tiny muted">→ {n.to}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ============================================================ */
function CockpitStyles() {
  return <style>{`
    .ckp-hero { background: linear-gradient(120deg,#013a52,#005085); color:#fff; padding:18px 22px; display:flex; gap:22px; align-items:center; flex-wrap:wrap; }
    .ckp-htag { font-size:11px; font-weight:600; padding:3px 9px; border-radius:20px; background:rgba(255,255,255,.14); }
    .ckp-hero-stats { display:flex; gap:18px; flex-wrap:nowrap; }
    .ckp-hstat { text-align:center; min-width:72px; }

    .ckp-signals { display:grid; grid-template-columns:repeat(5,1fr); gap:10px; margin-bottom:14px; }
    .ckp-signal { text-align:left; background:var(--surface); border:1px solid var(--line); border-radius:9px; padding:11px 13px; transition:.13s; }
    .ckp-signal:hover { box-shadow:var(--shadow-sm); border-color:var(--ink-4); }

    .ckp-phases { display:grid; grid-template-columns:repeat(4,1fr); gap:0; }
    .ckp-phasecol { border-right:1px solid var(--line); }
    .ckp-phasecol:last-child { border-right:0; }
    .ckp-phasecol.on { background:var(--blue-050); }
    .ckp-phasecol-h { padding:11px 13px; border-bottom:1px solid var(--line); display:flex; align-items:center; gap:8px; }
    .ckp-now { font-size:8.5px; font-weight:800; letter-spacing:.06em; color:#fff; background:var(--blue); padding:1px 6px; border-radius:9px; }
    .ckp-modrow { padding:7px 8px; border-radius:6px; cursor:pointer; margin-bottom:1px; }
    .ckp-modrow:hover { background:var(--surface-2); }

    .ckp-attn { display:flex; gap:11px; align-items:flex-start; padding:10px 10px; border-radius:8px; cursor:pointer; transition:.12s; }
    .ckp-attn:hover { background:var(--surface-2); }
    .ckp-attn-ic { width:30px; height:30px; border-radius:8px; display:grid; place-items:center; flex:0 0 30px; }
    .ckp-attn-go { color:var(--ink-4); display:grid; place-items:center; align-self:center; }
    .ckp-attn:hover .ckp-attn-go { color:var(--blue); }

    .ckp-act { display:flex; gap:10px; padding:8px 0; border-bottom:1px solid var(--line-soft); }
    .ckp-act:last-child { border-bottom:0; }
    .ckp-act-ic { width:24px; height:24px; border-radius:50%; background:var(--surface-3); color:var(--ink-3); display:grid; place-items:center; flex:0 0 24px; }

    .ckp-rail { position:relative; height:30px; }
    .ckp-rail-line { position:absolute; left:0; right:0; top:14px; height:3px; border-radius:3px; background:var(--surface-3); }
    .ckp-rail-fill { position:absolute; left:0; top:14px; height:3px; border-radius:3px; background:var(--blue); }
    .ckp-node { position:absolute; top:5px; transform:translateX(-50%); }
    .ckp-dot { width:22px; height:22px; border-radius:50%; color:#fff; font-size:10px; font-weight:700; display:grid; place-items:center; border:2px solid var(--surface); }
    .ckp-today { position:absolute; top:-20px; transform:translateX(-50%); }
    .ckp-today span { font-size:8.5px; font-weight:800; letter-spacing:.06em; color:var(--blue); background:var(--blue-050); padding:1px 6px; border-radius:8px; border:1px solid var(--blue-100); white-space:nowrap; }
    .ckp-today::after { content:''; position:absolute; left:50%; top:16px; transform:translateX(-50%); width:2px; height:18px; background:var(--blue); }

    .ckp-ms { display:flex; gap:12px; align-items:flex-start; padding:9px 10px; border-radius:8px; }
    .ckp-ms:hover { background:var(--surface-2); }
    .ckp-ms-dot { width:24px; height:24px; border-radius:50%; color:#fff; font-size:11px; font-weight:700; display:grid; place-items:center; flex:0 0 24px; margin-top:1px; }

    .ckp-dl { display:flex; gap:10px; align-items:center; padding:8px 0; border-bottom:1px solid var(--line-soft); }
    .ckp-dl:last-child { border-bottom:0; }
    .ckp-info { font-size:11px; color:var(--ink-3); line-height:1.45; background:var(--surface-2); border-radius:7px; padding:8px 10px; display:flex; gap:7px; align-items:flex-start; }
    .ckp-info svg { flex:0 0 auto; margin-top:1px; color:var(--ink-4); }

    .ckp-fee-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .ckp-fee { background:var(--surface-2); border-radius:8px; padding:10px 12px; }

    .ckp-member { display:flex; gap:12px; align-items:flex-start; padding:11px 10px; border-radius:8px; }
    .ckp-member:hover { background:var(--surface-2); }

    .ckp-risk { display:flex; gap:11px; align-items:flex-start; padding:10px 10px; border-radius:8px; cursor:pointer; }
    .ckp-risk:hover { background:var(--surface-2); }
    .ckp-risk-ic { width:30px; height:30px; border-radius:8px; display:grid; place-items:center; flex:0 0 30px; margin-top:1px; }

    .ckp-gate { display:flex; gap:9px; align-items:flex-start; padding:7px 0; border-bottom:1px solid var(--line-soft); }
    .ckp-gate:last-child { border-bottom:0; }

    .ckp-notes { display:grid; grid-template-columns:repeat(3,1fr); gap:0; }
    .ckp-notecol { padding:12px 14px; border-right:1px solid var(--line); }
    .ckp-notecol:last-child { border-right:0; }
    .ckp-notecol-h { font-size:11.5px; font-weight:700; display:flex; align-items:center; gap:7px; margin-bottom:10px; }
    .ckp-note { background:var(--surface-2); border:1px solid var(--line); border-radius:8px; padding:10px 11px; margin-bottom:8px; cursor:pointer; transition:.12s; }
    .ckp-note:hover { border-color:var(--blue-400); box-shadow:var(--shadow-sm); }

    @media (max-width:1180px){ .ckp-signals{ grid-template-columns:repeat(3,1fr);} }
  `}</style>;
}

Object.assign(window, { EngagementCockpit });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { EngagementCockpit };
