/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { AiInsightPanel } from './ai_insights';
import { useAudit, useAuditHeavy, useFirm, useNav } from './contexts';
import { I, MODULE_INDEX } from './icons';
import { SubBar } from './shell';
import { Avatar, Badge, Btn, Donut, Panel, Progress, Tabs } from './ui';
import { amsExportXlsx } from './export_xlsx';
import { PROGRAMME } from './view_cockpit';
import { FIRMFIN } from './data_firmfin';
import { WpCompletenessRecap, wpCompletenessFor, wpModuleStatuses, WP_MODULE_MAP, engagementGate, EngagementGateSummary, eqrStatusFor } from './wp_signoff';
import { eqrGateDetail } from './canon_eqr_gate';
import { cockpitEconomics, cockpitRiskCoverage, type CockpitWip, type CockpitMember, type CockpitRiskCoverage } from './cockpit_model';
import {
  progressBridge, phaseRollups, PHASE_BUDGET_WEIGHT, CKP_PHASE_ORDER,
  type ModuleWpStatus, type PhaseRollup, type ProgressBridge,
} from './cockpit_progress';

/* ============================================================
   Asseris — Engagement Cockpit (DEEP)
   Engagement command center for the active engagement.
   Overrides window.EngagementCockpit (loaded after view_cockpit.jsx).
   ============================================================ */
const { useState: useStateCkp, useMemo: useMemoCkp } = React;

/* PR-C-2: `CKP_PHASES` dulu memuat 20 persentase HARDCODE yang rata-ratanya
   1242/20 = 62,1 → 62 — persis `e.progress` literal. Dua representasi angka
   yang sama, ditala agar sepakat, dan tak bergerak oleh tindakan auditor mana
   pun. Peta modul→fase + roll-up terbukti kini di `cockpit_progress.ts`,
   dihitung dari `wpState` lewat `wpModuleStatuses`. Bobot jam anggaran per
   fase (`PHASE_BUDGET_WEIGHT`) tetap literal — ia MODEL ALOKASI, dan kini
   diberi label demikian alih-alih menyamar sebagai pengukuran. */

/* label modul untuk pipeline fase — SSOT `MODULE_INDEX` (icons.tsx) */
const ckpModuleLabel = (id: string): string => {
  const m = (MODULE_INDEX as Record<string, { label?: string }>)[id];
  return (m && m.label) || id;
};

/* engagement lifecycle milestones (critical path) */
const CKP_MILESTONES = [
  { n: 1, name: 'Perencanaan & Strategi Audit', phase: 'Perencanaan', date: '2026-01-15', owner: 'Anindya Pramesti', status: 'done', sa: 'SA 300' },
  { n: 2, name: 'Penilaian Risiko & Materialitas', phase: 'Perencanaan', date: '2026-01-28', owner: 'Anindya Pramesti', status: 'done', sa: 'SA 315 · SA 320' },
  { n: 3, name: 'Walkthrough & Uji Pengendalian (ICFR)', phase: 'Perencanaan', date: '2026-02-12', owner: 'Dimas Raharjo', status: 'risk', sa: 'SA 330', note: 'ICFR 75% — sedikit di belakang jadwal.' },
  { n: 4, name: 'Eksekusi Prosedur Substantif', phase: 'Eksekusi', date: '2026-03-20', owner: 'Tim Lapangan', status: 'active', sa: 'SA 330 · SA 500' },
  { n: 5, name: 'Penyelesaian Area Spesifik (ECL · Sewa · GC)', phase: 'Specifics', date: '2026-03-24', owner: 'Sinta Wulandari', status: 'active', sa: 'PSAK 71/73 · SA 570' },
  { n: 6, name: 'Draft Laporan Keuangan & SAD', phase: 'Finalisasi', date: '2026-03-27', owner: 'Anindya Pramesti', status: 'upcoming', sa: 'SA 450' },
  { n: 7, name: 'Review Partner & EQR (SMM)', phase: 'Finalisasi', date: '2026-03-29', owner: 'Hartono Wijaya', status: 'upcoming', sa: 'SMM 2 · SA 220' },
  { n: 8, name: 'Tanda Tangan Opini & Penerbitan', phase: 'Finalisasi', date: '2026-03-31', owner: 'Hartono Wijaya', status: 'upcoming', sa: 'SA 700' },
  { n: 9, name: 'Arsip Dokumentasi (SMM · 60 hari)', phase: 'Arsip', date: '2026-04-30', owner: 'Anindya Pramesti', status: 'upcoming', sa: 'SA 230' },
];

/* PR-C-1: jam & ekonomi per anggota TIDAK lagi hidup di sini. Dulu berkas ini
   memegang `CKP_TEAM_W` (array bobot literal) + `CKP_RATE`/`rateFor` dan membagi
   ulang total jam perikatan dengan bobot itu — total menutup, tiap barisnya salah,
   dan layar inert terhadap timesheet. Sekarang: `cockpit_model.cockpitEconomics()`
   di atas SSOT `FIRMFIN.engagementWip(timeEntries, engId)`. Lihat cockpit_model.ts. */

const CKP_TODAY = new Date(AMS.TODAY); /* K-02: klok dari SSOT AMS.TODAY, bukan literal */
const CKP_START = new Date('2026-01-06');

const idDate = (s: any) => new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' });
const rpM = (n: any) => 'Rp ' + (n / 1e9).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' M';
const ckpBar = (p: any) => p >= 85 ? 'var(--green)' : p >= 50 ? 'var(--blue)' : p >= 25 ? 'var(--amber)' : 'var(--red)';
const TONE = { green: 'var(--green)', amber: 'var(--amber)', red: 'var(--red)', blue: 'var(--blue)', gray: 'var(--ink-3)' };
const TONE_BG = { green: 'var(--green-bg)', amber: 'var(--amber-bg)', red: 'var(--red-bg)', blue: 'var(--blue-050)', gray: 'var(--surface-2)' };

/* ---------- small building blocks ---------- */
function Gauge({ pct, size = 54, stroke = 7, tone }: any) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: `0 0 ${size}px` }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={(TONE as any)[tone] || 'var(--blue)'} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${Math.min(100, pct) / 100 * c} ${c}`} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
        <span className="mono" style={{ fontSize: size * 0.27, fontWeight: 700, color: 'var(--ink-1)' }}>{Math.round(pct)}<span style={{ fontSize: size * 0.16 }}>%</span></span>
      </div>
    </div>
  );
}

function SignalCard({ icon, label, tone, value, read, onClick }: any) {
  const IconC = (I as any)[icon] || I.pulse;
  return (
    <button onClick={onClick} className="ckp-signal" style={{ borderLeft: `3px solid ${(TONE as any)[tone]}`, cursor: onClick ? 'pointer' : 'default' }}>
      <div className="row ac gap8" style={{ marginBottom: 7 }}>
        <span style={{ width: 26, height: 26, borderRadius: 7, background: (TONE_BG as any)[tone], color: (TONE as any)[tone], display: 'grid', placeItems: 'center', flex: '0 0 26px' }}><IconC size={15} /></span>
        <span className="tiny upper" style={{ fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '.05em' }}>{label}</span>
        <div style={{ flex: 1 }} />
        <span style={{ width: 8, height: 8, borderRadius: 50, background: (TONE as any)[tone] }} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink-1)', lineHeight: 1.1 }}>{value}</div>
      <div className="tiny muted" style={{ marginTop: 3, lineHeight: 1.35 }}>{read}</div>
    </button>
  );
}

function EVBar({ label, pct, tone, hint }: any) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="row jb ac" style={{ marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
        <span className="mono tiny" style={{ fontWeight: 700, color: (TONE as any)[tone] }}>{Math.round(pct)}% {hint && <span className="muted" style={{ fontWeight: 500 }}>· {hint}</span>}</span>
      </div>
      <div style={{ height: 9, borderRadius: 6, background: 'var(--surface-3)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ width: Math.min(100, pct) + '%', height: '100%', borderRadius: 6, background: (TONE as any)[tone] }} />
      </div>
    </div>
  );
}

/* ============================================================ */
function EngagementCockpit() {
  const { fmt } = AMS;
  const nav = useNav();
  const { activeEngagement, activeClient } = useFirm();
  /* PR-C-1: `timeEntries` ikut dilanggan — tanpa ini cockpit membaca `e.actualHrs`
     statis dari seed dan INERT terhadap timesheet yang dicatat di Time & Budget. */
  const { reviewNotesActive, aje, risks, workpapers, team, activity, deadlines, wpState, timeEntries } = useAuditHeavy(['reviewNotes', 'timeEntries']);  // P5 Fase 2: catatan engagement aktif
  const e = activeEngagement;
  const [tab, setTab] = useStateCkp('ringkasan');

  const D = useMemoCkp(() => {
    /* PR-C-2 · PROGRES — dua angka, bukan satu literal:
         asserted = penilaian manajer perikatan (e.progress)
         proven   = terbukti dari kertas kerja (wpState → tiga tonggak per WP)
       `overall` yang dipakai seluruh sinyal kesehatan = TERBUKTI. */
    const wpStatuses: ModuleWpStatus[] = wpModuleStatuses({ wpState }, Object.keys(WP_MODULE_MAP));
    const bridge = progressBridge(wpStatuses, e.progress != null ? e.progress : null);
    const rolls = phaseRollups(wpStatuses);
    const overall = Math.round(bridge.provenPct);
    const asserted = bridge.assertedPct;

    const dl = new Date(e.deadline);
    const totalDays = Math.max(1, (+dl - +CKP_START) / 86400000);
    const elapsedPct = Math.min(100, Math.max(0, (+CKP_TODAY - +CKP_START) / 86400000 / totalDays * 100));
    const daysLeft = Math.round((+dl - +CKP_TODAY) / 86400000);

    /* review notes (engagement scope) */
    const openNotes = reviewNotesActive.filter((n: any) => n.status === 'open');
    const highOpen = openNotes.filter((n: any) => n.priority === 'high');
    /* AJE */
    const proposedAje = aje.filter((a: any) => a.status === 'Proposed');
    const proposedAmt = proposedAje.reduce((s: any, a: any) => s + a.amount, 0);
    /* WP */
    const wpReviewed = workpapers.filter((w: any) => w.status === 'Reviewed').length;
    const wpNoReviewer = workpapers.filter((w: any) => w.reviewer === '—');
    /* WP kanonik (SSOT wpState) — SUMBER TUNGGAL gerbang kelengkapan,
       sama dgn firm-board gate (engagementGate) & WpCompletenessRecap.
       Mengganti hitungan demo `workpapers` utk kriteria gate (Fase 2 P5). */
    const wpRecap = wpCompletenessFor({ wpState }, Object.keys(WP_MODULE_MAP));
    /* risks */
    const sigRisks = risks.filter((r: any) => r.inherent === 'Significant');
    const fraudRisks = risks.filter((r: any) => r.fraud);
    /* programme (cross-file; guarded) */
    const PRG = (typeof PROGRAMME !== 'undefined' && Array.isArray(PROGRAMME)) ? PROGRAMME : [];
    const procs = PRG.flatMap((r: any) => r.procs || []);
    const excTot = procs.reduce((s, p) => s + (p.exc || 0), 0);
    /* PR-C-5: dijodohkan lewat KUNCI (`RISKS.id` === `PROGRAMME.riskId`), bukan
       heuristik `String.includes`; dan "tertangani" = SELURUH prosedur selesai.
       Dulu kartu hero memakai `procs.some(done)` sementara daftar di tab Risiko
       menandai hijau hanya bila `done === total` — dua definisi di satu layar. */
    const sigCoverage = cockpitRiskCoverage(sigRisks, PRG);
    const sigAreas = sigCoverage;
    const sigCovered = sigCoverage.filter((r) => r.covered).length;

    /* PR-C-1 · EKONOMI PERIKATAN — satu sumber: FIRMFIN.engagementWip (roster +
       timesheet live), sama dengan Time & Budget dan modul WIP. Perikatan tanpa
       roster → `hasRoster:false`; rincian per-anggota TIDAK diarang-arang. */
    const fee = activeClient?.fee || 0;
    const econ = cockpitEconomics({
      ew: FIRMFIN.engagementWip(timeEntries, e.id) as CockpitWip | null,
      fallbackBudgetHrs: e.budgetHrs, fallbackActualHrs: e.actualHrs,
      fee, firmTeam: team, workpapers, procs,
    });
    const burnPct = econ.burnPct;

    /* health tones */
    const schedTone = overall >= elapsedPct - 4 ? 'green' : overall >= elapsedPct - 14 ? 'amber' : 'red';
    /* Denominator efisiensi anggaran = progres DI-ASSERT, bukan terbukti.
       Kartu ini tentang EKONOMI (rupiah/jam yang terpakai vs pekerjaan yang
       manajer nyatakan selesai). Memakai progres terbukti akan mencampur dua
       masalah berbeda — keterlambatan dokumentasi menjadi "berisiko over-budget"
       — dan membuat kartu ini kehilangan daya beda. Ketertinggalan bukti sudah
       punya sinyalnya sendiri (kartu Jadwal + panel jembatan). */
    const econBase = asserted != null ? asserted : overall;
    const budgetTone = burnPct <= econBase + 5 ? 'green' : burnPct <= econBase + 15 ? 'amber' : 'red';
    const qualTone = openNotes.length === 0 ? 'green' : highOpen.length >= 3 ? 'red' : 'amber';
    const riskTone = sigAreas.length && sigCovered === sigAreas.length && excTot === 0 ? 'green' : excTot > 2 || (sigAreas.length && sigCovered < sigAreas.length / 2) ? 'red' : 'amber';
    /* P5 cleanup: signal band "Dokumentasi WP" ikut SSOT wpRecap (37 WP kanonik),
       sama dgn gerbang fase & WpCompletenessRecap — bukan register `workpapers` legacy. */
    const docTone = wpRecap.total > 0 && wpRecap.signed === wpRecap.total ? 'green' : (wpRecap.total - wpRecap.signed) > 2 ? 'red' : 'amber';

    const toneScore = { green: 0, amber: 1, red: 2, blue: 0, gray: 0 };
    const tones = [schedTone, budgetTone, qualTone, riskTone, docTone];
    const worst = Math.max(...tones.map((t: any) => (toneScore as any)[t]));
    const verdict = worst >= 2 ? { tone: 'red', l: 'Perlu Tindakan' } : worst >= 1 ? { tone: 'amber', l: 'Perlu Perhatian' } : { tone: 'green', l: 'Sehat / On-track' };

    /* phase hours model (data-driven from phase progress) */
    /* PR-C-2 · JAM PER FASE. Dua kolom yang dulu tercampur, kini dipisah:
         `bud`   = MODEL ALOKASI (bobot literal × jam anggaran) — dilabeli model
         `tsAct` = jam yang BENAR-BENAR ber-tag fase di timesheet
       Kolom "Aktual" lama adalah PLUG: total jam dibagi proporsional terhadap
       progres literal, lalu disajikan sebagai pengukuran. Jam pembuka roster
       tidak ber-tag fase, jadi jumlah `tsAct` sengaja TIDAK sama dengan total
       jam — selisihnya dinyatakan, bukan disebar. */
    const tsByPhase: Record<string, number> = {};
    (timeEntries || []).forEach((t: { phase?: string; hours?: number }) => {
      const k = t.phase || '—';
      tsByPhase[k] = (tsByPhase[k] || 0) + (t.hours || 0);
    });
    const rollByPhase = new Map(rolls.map((r: PhaseRollup) => [r.phase, r]));
    const phaseRows = [...CKP_PHASE_ORDER, 'Review & Arsip' as const].map((phase) => {
      const roll = rollByPhase.get(phase as never);
      return {
        phase,
        color: roll ? roll.token : 'var(--ink-3)',
        pct: roll ? Math.round(roll.provenPct) : 0,
        wpCount: roll ? roll.total : 0,
        bud: Math.round((PHASE_BUDGET_WEIGHT as Record<string, number>)[phase] * econ.budgetHrs),
        tsAct: Math.round(tsByPhase[phase] || 0),
      };
    });
    const tsTotal = phaseRows.reduce((s, r) => s + r.tsAct, 0);
    const untaggedHrs = Math.max(0, Math.round(econ.actualHrs - tsTotal));

    return {
      overall, asserted, econBase, bridge, rolls, wpStatuses, untaggedHrs, tsTotal,
      elapsedPct, daysLeft, burnPct,
      openNotes, highOpen, proposedAje, proposedAmt, wpReviewed, wpNoReviewer, wpRecap,
      sigRisks, fraudRisks, excTot, sigAreas, sigCovered, sigCoverage,
      /* PR-C-5 · isolasi tampilan: hanya kejadian & tenggat MILIK perikatan ini */
      activityEng: (activity || []).filter((a: { eng?: string }) => a.eng === e.id),
      deadlinesEng: (deadlines || []).filter((d: { client?: string }) => d.client === activeClient?.name),
      schedTone, budgetTone, qualTone, riskTone, docTone, verdict,
      phaseRows, econ, fee,
      /* jam tingkat-perikatan: SSOT roster bila ada, seed bila tidak */
      budgetHrs: econ.budgetHrs, actualHrs: econ.actualHrs,
    };
  }, [e, reviewNotesActive, aje, risks, workpapers, team, activity, deadlines, activeClient, wpState, timeEntries]);

  const TABS = [
    { id: 'ringkasan', label: 'Ringkasan' },
    { id: 'jalur', label: 'Jalur Kritis' },
    { id: 'anggaran', label: 'Anggaran & Jam' },
    { id: 'tim', label: 'Tim & Beban' },
    { id: 'risiko', label: 'Risiko & Kualitas' },
  ];

  /* K-06 lanjutan — wire tombol "Status Report" (dulu mati): ekspor XLSX tersegel
     status engagement — progres, anggaran, tim & kualitas (dari model D). */
  const [exporting, setExporting] = useStateCkp(false);
  const onExportXlsx = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      /* PR-C-2: sheet menyebut BASIS tiap kolom — "terbukti" bukan "progres",
         "model alokasi" bukan "anggaran fase", dan hanya jam ber-tag fase. */
      const phaseSheet = D.phaseRows.map((p: { phase: string; pct: number; bud: number; wpCount: number; tsAct: number }) =>
        [p.phase, p.wpCount || '', p.wpCount ? p.pct + '%' : '—', p.bud, p.tsAct || '']);
      /* PR-C-1: kolom memisahkan tarif CHARGE-OUT dari tarif BIAYA — dulu satu
         kolom "Rate" berisi tarif biaya sementara nilainya dilabeli WIP. */
      const teamSheet = D.econ.members.map((m: CockpitMember) => [
        m.name.split(',')[0], m.grade, m.bill, m.cost, Math.round(m.budget), Math.round(m.actual),
        m.util, m.wpPrep, m.wpRev, m.procPrep, m.procRev,
      ]);
      const riskSheet = D.sigRisks.map((r: { id: string; risk?: string; t?: string; inherent: string; fraud?: boolean; likelihood?: string; impact?: string }) => [r.id, r.risk || r.t, r.inherent, r.fraud ? 'Ya' : 'Tidak', r.likelihood || '', r.impact || '']);
      await amsExportXlsx({
        kind: 'cockpit-status', scope: 'engagement', scopeId: e?.id,
        fileName: `Status Report - ${activeClient?.name || 'Klien'}.xlsx`,
        firm: 'KAP Wijaya Hartono & Rekan',
        title: `Status Report Engagement — ${activeClient?.name || ''}`,
        meta: [`${e?.id || ''} · ${e?.fy || ''} · progres TERBUKTI ${D.overall}%${D.asserted != null ? ` (di-assert manajer ${D.asserted}%, selisih ${(D.bridge.gapPp ?? 0).toFixed(1)} pp)` : ''} · sisa ${D.daysLeft} hari`,
          D.econ.hasRoster
            ? `Kesimpulan: ${D.verdict.l} · burn ${Math.round(D.burnPct)}% · WIP @tarif standar Rp ${Math.round((D.econ.wipStd || 0) / 1e6)} jt · biaya waktu Rp ${Math.round((D.econ.timeCost || 0) / 1e6)} jt — jam & Rp jt`
            : `Kesimpulan: ${D.verdict.l} · burn ${Math.round(D.burnPct)}% · roster jam belum disiapkan — rincian per-anggota tak terukur`],
        sheets: [
          { name: 'Fase', heading: 'Kelengkapan TERBUKTI per fase (wpState: bukti · kesimpulan SA 230 · sign-off)',
            columns: ['Fase', 'WP kanonik', 'Terbukti', 'Jam anggaran (model alokasi)', 'Jam ber-tag fase'],
            rows: phaseSheet, colWidths: [26, 12, 12, 28, 18] },
          { name: 'Tim', heading: D.econ.hasRoster ? 'Beban tim (jam & Rp) — roster + timesheet (SSOT Time & Budget)' : 'Beban tim — roster jam belum disiapkan',
            columns: ['Anggota', 'Grade', 'Tarif charge-out', 'Tarif biaya', 'Jam anggaran', 'Jam aktual', 'Util perikatan %', 'WP prep', 'WP rev', 'Proc prep', 'Proc rev'],
            rows: teamSheet, colWidths: [22, 10, 16, 14, 13, 12, 16, 10, 10, 10, 10] },
          { name: 'Risiko Signifikan', heading: 'Risiko signifikan & fraud',
            columns: ['ID', 'Risiko', 'Inheren', 'Fraud', 'Likelihood', 'Impact'], rows: riskSheet, colWidths: [8, 42, 12, 8, 12, 12] },
        ],
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <SubBar moduleId="cockpit" right={
        <div className="row gap8 ac">
          <Badge kind={D.verdict.tone === 'red' ? 'red' : D.verdict.tone === 'amber' ? 'amber' : 'green'}>{D.verdict.l}</Badge>
          <Badge kind="blue">{e.id} · {e.fy}</Badge>
          <Btn sm onClick={onExportXlsx} disabled={exporting}><I.download size={13} /> {exporting ? 'Menyiapkan…' : 'Status Report'}</Btn>
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
                <div className="mono" style={{ fontSize: 28, fontWeight: 700 }}>{D.overall}%</div>
                {/* PR-C-2: angka utama = TERBUKTI; asersi manajer ditampilkan
                    sebagai pembanding, bukan disembunyikan atau digantikan. */}
                <div className="tiny" style={{ color: '#bcd6e4' }}>terbukti</div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.01em' }}>{activeClient?.name}</div>
              <div style={{ fontSize: 12, color: '#bcd6e4', margin: '3px 0 9px' }}>{e.type} · {e.standard} · Partner {e.partner.split(',')[0]} · Manager {e.manager}</div>
              <div className="row gap6 wrap">
                <span className="ckp-htag">Fase: {e.phase}</span>
                {D.asserted != null && <span className="ckp-htag" title="Penilaian manajer perikatan — dijembatani ke progres terbukti di panel Ringkasan">Di-assert manajer {D.asserted}%</span>}
                <span className="ckp-htag" style={{ background: e.risk === 'High' ? 'rgba(255,107,87,.24)' : 'rgba(255,255,255,.14)' }}>Risiko {e.risk}</span>
                <span className="ckp-htag">Materialitas {rpM(e.materiality)}</span>
                <span className="ckp-htag">Fee {rpM(D.fee)}</span>
              </div>
            </div>
            <div className="ckp-hero-stats">
              {[
                ['Sisa Hari', D.daysLeft + ' hari', D.daysLeft < 14 ? '#ff9b8a' : '#fff', idDate(e.deadline)],
                ['Budget Burn', Math.round(D.burnPct) + '%', D.burnPct > 100 ? '#ff9b8a' : '#fff', `${fmt(D.actualHrs)}/${fmt(D.budgetHrs)} jam`],
                ['Review Notes', D.openNotes.length + ' open', D.openNotes.length ? '#ffd479' : '#7fe0a8', `${D.highOpen.length} prioritas tinggi`],
                ['Risk Signifikan', `${D.sigCovered}/${D.sigAreas.length}`, D.sigCovered < D.sigAreas.length ? '#ffd479' : '#7fe0a8', `${D.excTot} pengecualian`],
              ].map(([l, v, c, sub]) => (
                <div key={l} className="ckp-hstat">
                  <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: c }}>{v}</div>
                  <div className="tiny" style={{ color: '#bcd6e4', fontWeight: 600 }}>{l}</div>
                  <div className="tiny" style={{ color: '#8fb0c2', fontSize: 11 }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        {/* ---------- HEALTH SIGNAL BAND ---------- */}
        <div className="ckp-signals">
          <SignalCard icon="calendar" label="Jadwal" tone={D.schedTone} value={`${D.overall}% terbukti vs ${Math.round(D.elapsedPct)}% waktu`}
            read={D.schedTone === 'green' ? 'Sesuai jadwal' : D.schedTone === 'amber' ? 'Sedikit di belakang jadwal' : 'Bukti kertas kerja tertinggal dari waktu berjalan'} onClick={() => setTab('ringkasan')} />
          <SignalCard icon="coins" label="Anggaran" tone={D.budgetTone} value={`${Math.round(D.burnPct)}% terpakai`}
            read={`${D.budgetTone === 'green' ? 'Efisien' : D.budgetTone === 'amber' ? 'Pantau pemakaian jam' : 'Berisiko over-budget'} vs progres di-assert ${D.econBase}%`} onClick={() => setTab('anggaran')} />
          <SignalCard icon="check" label="Kualitas Review" tone={D.qualTone} value={`${D.openNotes.length} catatan open`}
            read={D.qualTone === 'green' ? 'Semua terselesaikan' : `${D.highOpen.length} prioritas tinggi tertunda`} onClick={() => setTab('risiko')} />
          <SignalCard icon="shield" label="Risiko & Pengecualian" tone={D.riskTone} value={`${D.excTot} pengecualian`}
            read={`${D.sigCovered}/${D.sigAreas.length} risiko signifikan tertangani`} onClick={() => setTab('risiko')} />
          <SignalCard icon="flask" label="Dokumentasi WP" tone={D.docTone} value={`${D.wpRecap.signed}/${D.wpRecap.total} di-review`}
            read={D.wpRecap.signed === D.wpRecap.total ? 'Lengkap' : `${D.wpRecap.total - D.wpRecap.signed} WP belum ditandatangani`} onClick={() => nav('workpapers')} />
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
   PR-C-2 · JEMBATAN PROGRES — asersi manajer vs terbukti kertas kerja
   ------------------------------------------------------------
   Ketiga baris tonggak BENAR-BENAR menjumlah menjadi progres terbukti
   (masing-masing maksimum 33,3 pp). Selisih terhadap asersi manajer
   dinyatakan sebagai SATU baris bernama — tidak dipecah menjadi komponen
   palsu, karena defisiensi antar-tonggak saling tumpang tindih dan
   pemecahan semacam itu hanya akan menjadi plug berbaju enumerasi.
   ============================================================ */
function ProgressBridgePanel({ D, nav }: { D: { bridge: ProgressBridge; overall: number }; nav: (id: string) => void }) {
  const b = D.bridge;
  const gap = b.gapPp;
  const maxPp = 100 / b.rows.length;
  return (
    <Panel noBody>
      <div className="panel-h">
        <h3>Progres — Asersi Manajer vs Terbukti Kertas Kerja</h3>
        <span className="sub">dua sumber independen, selisih dinyatakan</span>
      </div>
      <div className="ckp-bridge">
        <div className="ckp-bridge-nums">
          <div className="ckp-bridge-num">
            <div className="mono" style={{ fontSize: 28, fontWeight: 700, color: 'var(--ink-2)' }}>
              {b.assertedPct == null ? '—' : b.assertedPct + '%'}
            </div>
            <div className="tiny muted upper" style={{ fontWeight: 700 }}>Di-assert manajer</div>
            <div className="tiny muted">penilaian profesional atas kemajuan</div>
          </div>
          <div className="ckp-bridge-arrow"><I.arrowRight size={18} /></div>
          <div className="ckp-bridge-num">
            <div className="mono" style={{ fontSize: 28, fontWeight: 700, color: ckpBar(D.overall) }}>{D.overall}%</div>
            <div className="tiny muted upper" style={{ fontWeight: 700 }}>Terbukti kertas kerja</div>
            <div className="tiny muted">{b.total} WP kanonik × 3 tonggak</div>
          </div>
        </div>
        <div className="ckp-bridge-rows">
          {b.rows.map((r) => (
            <div key={r.key} className="ckp-bridge-row">
              <span className="ckp-bridge-tick" style={{ color: r.count ? 'var(--green)' : 'var(--ink-4)' }}>
                {r.count ? <I.checkCircle size={14} /> : <I.alert size={14} />}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row jb ac">
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{r.label} <span className="chip tiny" style={{ height: 16, fontFamily: 'var(--mono)' }}>{r.sa}</span></span>
                  <span className="mono tiny" style={{ fontWeight: 700 }}>+{r.pp.toFixed(1)} pp <span className="muted" style={{ fontWeight: 500 }}>· {r.count}/{r.total}</span></span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: 'var(--surface-3)', marginTop: 4 }}>
                  <div style={{ width: (r.pp / maxPp * 100) + '%', height: '100%', borderRadius: 3, background: 'var(--teal)' }} />
                </div>
              </div>
            </div>
          ))}
          <div className="ckp-bridge-total">
            <span style={{ fontSize: 12, fontWeight: 700 }}>= Progres terbukti</span>
            <span className="mono" style={{ fontWeight: 700, color: ckpBar(D.overall) }}>{b.provenPct.toFixed(1)}%</span>
          </div>
          {gap != null && (
            <div className="ckp-bridge-gap">
              <span style={{ fontSize: 12, fontWeight: 600 }}>
                {gap >= 0 ? 'Asersi manajer yang belum terbukti kertas kerja' : 'Kertas kerja mendahului asersi manajer'}
              </span>
              <span className="mono tiny" style={{ fontWeight: 700, color: Math.abs(gap) > 20 ? 'var(--amber)' : 'var(--ink-2)' }}>
                {gap >= 0 ? '' : '+'}{Math.abs(gap).toFixed(1)} pp
              </span>
            </div>
          )}
        </div>
        <div className="ckp-info" style={{ marginTop: 10 }}>
          <I.lock size={13} />
          <span>Selisih ini <b>bukan kesalahan</b> — asersi manajer dan bukti kertas kerja adalah dua sumber independen. Yang tak boleh terjadi adalah selisih yang tidak dinyatakan. Tutup selisih dengan melengkapi bukti, mencatat kesimpulan SA 230, dan sign-off penelaah.</span>
        </div>
        <button className="btn sm" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={() => nav('workpapers')}>
          <I.flask size={14} /> Buka Indeks Kertas Kerja
        </button>
      </div>
    </Panel>
  );
}

/* ============================================================
   TAB · RINGKASAN — phase pipeline + needs attention + activity
   ============================================================ */
function TabRingkasan({ D, e, nav, activity, setTab }: any) {
  /* assemble prioritized action items */
  const items = [];
  if (D.daysLeft <= 25) items.push({ tone: D.daysLeft < 14 ? 'red' : 'amber', icon: 'calendar', t: `Tenggat fieldwork ${D.daysLeft} hari lagi`, sub: `Target ${idDate(e.deadline)} · ${D.overall}% selesai`, route: 'programme' });
  if (D.proposedAje.length) items.push({ tone: 'amber', icon: 'ledger', t: `${D.proposedAje.length} AJE menunggu posting`, sub: `Nilai usulan ${rpM(D.proposedAmt)} — perlu persetujuan partner`, route: 'aje' });
  if (D.excTot) items.push({ tone: D.excTot > 2 ? 'red' : 'amber', icon: 'alert', t: `${D.excTot} pengecualian terbuka pada prosedur`, sub: 'Evaluasi dampak terhadap salah saji & materialitas', route: 'programme' });
  D.highOpen.slice(0, 2).forEach((n: any) => items.push({ tone: 'red', icon: 'check', t: `Review note: ${n.moduleLabel}`, sub: n.text, route: n.module }));
  if (D.wpNoReviewer.length) items.push({ tone: 'amber', icon: 'flask', t: `${D.wpNoReviewer.length} kertas kerja belum di-review`, sub: D.wpNoReviewer.map((w: any) => w.ref + ' ' + w.title).join(' · '), route: 'workpapers' });
  if (D.sigCovered < D.sigAreas.length) items.push({ tone: 'amber', icon: 'shield', t: `${D.sigAreas.length - D.sigCovered} risiko signifikan belum tuntas diuji`, sub: 'Pastikan setiap RoMM signifikan memiliki prosedur selesai', route: 'risk' });

  const actIcon = { upload: 'upload', check: 'check', sync: 'sync', flag: 'flag', send: 'send' };

  return (
    <div className="grid" style={{ gap: 12 }}>
      {/* PR-C-2 · jembatan asersi → terbukti */}
      <ProgressBridgePanel D={D} nav={nav} />

      {/* phase pipeline — kini roll-up TERBUKTI dari wpState, bukan 20 literal */}
      <Panel noBody>
        <div className="panel-h">
          <h3>Pipeline Fase Audit</h3>
          <span className="sub">kelengkapan terbukti per kertas kerja · {D.bridge.total} WP kanonik · klik untuk membuka</span>
        </div>
        <div className="ckp-phases">
          {D.rolls.map((p: PhaseRollup) => {
            const pp = Math.round(p.provenPct);
            const isActive = p.phase === e.phase || (e.phase === 'Eksekusi' && p.phase === 'Specifics');
            return (
              <div key={p.phase} className={'ckp-phasecol' + (isActive ? ' on' : '')}>
                <div className="ckp-phasecol-h">
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: p.token }} />
                  <span style={{ fontWeight: 700, fontSize: 12 }}>{p.phase}</span>
                  {isActive && <span className="ckp-now">AKTIF</span>}
                  <div style={{ flex: 1 }} />
                  <span className="mono tiny" style={{ fontWeight: 700, color: ckpBar(pp) }}>{pp}%</span>
                </div>
                <div className="ckp-phasecol-sub tiny muted">
                  {p.total} kertas kerja{p.notStarted > 0 && <span> · <b style={{ color: 'var(--amber)' }}>{p.notStarted} belum dimulai</b></span>}
                </div>
                <div className="ckp-modlist">
                  {p.modules.map((m) => (
                    <button key={m.id} onClick={() => nav(m.id)} className="ckp-modrow" title={`${ckpModuleLabel(m.id)} — ${m.pct}% terbukti`}>
                      <div className="row jb ac" style={{ marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }} className="truncate">{ckpModuleLabel(m.id)}</span>
                        <span className="mono tiny" style={{ color: ckpBar(m.pct), fontWeight: 700 }}>{m.pct}%</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: m.pct + '%', height: '100%', borderRadius: 3, background: ckpBar(m.pct) }} /></div>
                    </button>
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
              const IconC = (I as any)[it.icon] || I.alert;
              return (
                <div key={i} className="ckp-attn" onClick={() => nav(it.route)}>
                  <span className="ckp-attn-ic" style={{ background: (TONE_BG as any)[it.tone], color: (TONE as any)[it.tone] }}><IconC size={15} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-1)' }}>{it.t}</div>
                    <div className="tiny muted" style={{ marginTop: 1, lineHeight: 1.4 }}>{it.sub}</div>
                  </div>
                  <span className="ckp-attn-go"><I.arrowRight size={15} /></span>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* PR-C-5 · aktivitas HANYA milik perikatan ini. Dulu feed firma tampil
            apa adanya di sini — termasuk baris "draft opini ENG-2025-063". */}
        <Panel noBody>
          <div className="panel-h"><h3>Aktivitas Terkini</h3><span className="sub">perikatan ini</span></div>
          <div style={{ padding: '4px 12px 10px' }}>
            {D.activityEng.length === 0 && (
              <div className="tiny muted" style={{ padding: '14px 2px' }}>Belum ada aktivitas tercatat untuk perikatan ini.</div>
            )}
            {D.activityEng.map((a: any, i: any) => {
              const IconC = (I as any)[(actIcon as any)[a.icon] || 'pulse'] || I.pulse;
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
function TabJalur({ D, e, nav, deadlines, activeClient }: any) {
  const span = Math.max(1, (+new Date(CKP_MILESTONES[CKP_MILESTONES.length - 1].date) - +CKP_START) / 86400000);
  const posOf = (d: any) => Math.min(100, Math.max(0, (+new Date(d) - +CKP_START) / 86400000 / span * 100));
  const todayPos = posOf(CKP_TODAY.toISOString().slice(0, 10));
  /* PR-C-5: HANYA tenggat perikatan ini. Dulu daftar sengaja dipadatkan sampai
     empat baris dengan tenggat KLIEN LAIN (`others`), tanpa penanda apa pun —
     tenggat PT Graha Properti tampil di ruang kerja PT Sentosa Makmur. Kosong
     kini dikatakan kosong. Pencocokan exact-match nama klien kanonik (sama
     dengan deriveDeadlineTasks), bukan `includes` atas potongan nama. */
  const shown = D.deadlinesEng;

  return (
    <div className="grid" style={{ gap: 12 }}>
      {/* horizontal rail */}
      <Panel noBody>
        <div className="panel-h"><h3>Jalur Kritis Engagement</h3><span className="sub">{CKP_MILESTONES.filter((m: any) => m.status === 'done').length}/{CKP_MILESTONES.length} milestone selesai · hari ini {idDate(CKP_TODAY.toISOString())}</span></div>
        <div style={{ padding: '26px 22px 16px' }}>
          <div className="ckp-rail">
            <div className="ckp-rail-line" />
            <div className="ckp-rail-fill" style={{ width: todayPos + '%' }} />
            <div className="ckp-today" style={{ left: todayPos + '%' }}><span>HARI INI</span></div>
            {CKP_MILESTONES.map((m: any) => (
              <div key={m.n} className="ckp-node" style={{ left: posOf(m.date) + '%' }} title={m.name}>
                <span className="ckp-dot" style={{ background: (TONE as any)[(MS_TONE as any)[m.status]], boxShadow: m.status === 'active' ? `0 0 0 4px ${TONE_BG.blue}` : 'none' }}>{m.status === 'done' ? '✓' : m.n}</span>
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
            {CKP_MILESTONES.map((m: any) => {
              const tone = (MS_TONE as any)[m.status];
              const overdue = m.status !== 'done' && new Date(m.date) < CKP_TODAY;
              return (
                <div key={m.n} className="ckp-ms">
                  <span className="ckp-ms-dot" style={{ background: (TONE as any)[tone] }}>{m.status === 'done' ? <I.check size={13} /> : m.n}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row ac gap8" style={{ flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{m.name}</span>
                      <span className="chip tiny" style={{ height: 17, fontFamily: 'var(--mono)' }}>{m.sa}</span>
                      {overdue && <span className="badge b-red" style={{ fontSize: 11, padding: '0 5px' }}>LEWAT TARGET</span>}
                    </div>
                    <div className="tiny muted" style={{ marginTop: 2 }}>{m.phase} · {m.owner}{m.note ? ' · ' + m.note : ''}</div>
                  </div>
                  <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
                    <div className="mono tiny" style={{ fontWeight: 700 }}>{idDate(m.date)}</div>
                    <Badge kind={tone === 'gray' ? 'gray' : tone}>{(MS_LABEL as any)[m.status]}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* upcoming deadlines */}
        <Panel noBody>
          <div className="panel-h"><h3>Tenggat Mendatang</h3><span className="sub">{activeClient?.name || 'perikatan ini'}</span></div>
          <div style={{ padding: '8px 12px 12px' }}>
            {shown.length === 0 && (
              <div className="tiny muted" style={{ padding: '12px 2px' }}>Tak ada tenggat terdaftar untuk perikatan ini.</div>
            )}
            {shown.map((d: { client: string; task: string; date: string; days: number; sev: string }, i: number) => (
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
            <div className="ckp-info" style={{ marginTop: 8 }}><I.lock size={13} /> Arsip dokumentasi wajib selesai ≤60 hari setelah tanggal opini (SMM 1 · SA 230).</div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ============================================================
   TAB · ANGGARAN & JAM — earned value + by phase + fee recovery
   ============================================================ */
function TabAnggaran({ D, e }: any) {
  const { fmt } = AMS;
  /* PR-C-1: margin & realisasi dari model ekonomi SSOT; `recovery` (dead code
     yang tak pernah dirender) dihapus. Nilai bisa `null` → perikatan tanpa roster. */
  const econ = D.econ;
  const dash = '—';
  /* kurva jam memakai progres DI-ASSERT (lihat catatan econBase di model D) */
  const variance = D.actualHrs - Math.round(D.budgetHrs * D.econBase / 100);

  return (
    <div className="grid" style={{ gap: 12 }}>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
        {/* earned value */}
        <Panel noBody>
          <div className="panel-h"><h3>Earned Value — Waktu · Anggaran · Pekerjaan</h3></div>
          <div style={{ padding: '14px 16px' }}>
            <EVBar label="Waktu berjalan" pct={D.elapsedPct} tone="gray" hint={`${D.daysLeft} hari tersisa`} />
            <EVBar label="Anggaran jam terpakai" pct={D.burnPct} tone={D.budgetTone} hint={`${fmt(D.actualHrs)}/${fmt(D.budgetHrs)} jam`} />
            <EVBar label="Pekerjaan terbukti (kertas kerja)" pct={D.overall} tone={D.schedTone} hint={`${D.bridge.total} WP kanonik`} />
            {D.asserted != null && <EVBar label="Pekerjaan di-assert manajer" pct={D.asserted} tone="gray" hint="penilaian profesional" />}
            <div className="ckp-info" style={{ marginTop: 4 }}>
              {variance > 0
                ? <span><b>{fmt(variance)} jam</b> di atas kurva untuk progres di-assert {D.econBase}% — efisiensi perlu dipantau.</span>
                : <span>Pemakaian jam <b>{fmt(Math.abs(variance))} jam</b> di bawah kurva progres di-assert {D.econBase}% — efisien.</span>}
            </div>
          </div>
        </Panel>

        {/* fee recovery */}
        <Panel noBody>
          <div className="panel-h"><h3>Fee · WIP · Biaya Waktu</h3><span className="sub">{econ.hasRoster ? 'roster + timesheet (SSOT Time & Budget)' : 'roster jam belum disiapkan'}</span></div>
          <div style={{ padding: '12px 16px' }}>
            <div className="ckp-fee-grid">
              {[
                ['Fee Perikatan', rpM(D.fee), 'var(--ink-1)'],
                /* PR-C-1: WIP dinilai pada tarif CHARGE-OUT. Dulu kartu ini
                   memakai tarif BIAYA namun dilabeli "WIP Terpakai" → meleset 2×. */
                ['WIP @ Tarif Standar', econ.wipStd == null ? dash : rpM(econ.wipStd), 'var(--blue)'],
                ['Biaya Waktu (aktual)', econ.timeCost == null ? dash : rpM(econ.timeCost), 'var(--ink-1)'],
                ['Margin Rencana (biaya std)', econ.marginPct == null ? dash : Math.round(econ.marginPct) + '%',
                  econ.marginPct == null ? 'var(--ink-3)' : econ.marginPct >= 30 ? 'var(--green)' : 'var(--amber)'],
              ].map(([l, v, c]) => (
                <div key={l} className="ckp-fee">
                  <div className="mono" style={{ fontSize: 19, fontWeight: 700, color: c }}>{v}</div>
                  <div className="tiny muted upper">{l}</div>
                </div>
              ))}
            </div>
            <div className="divider" />
            <div className="row jb ac" style={{ marginBottom: 5 }}>
              <span className="tiny muted">WIP @ tarif standar vs Fee</span>
              <span className="mono tiny" style={{ fontWeight: 700 }}>{econ.wipVsFeePct == null ? dash : Math.round(econ.wipVsFeePct) + '% terbakar'}</span>
            </div>
            <Progress value={econ.wipVsFeePct || 0} color="var(--blue)" />
            <div className="ckp-info" style={{ marginTop: 10 }}>
              {econ.hasRoster
                ? <span>WIP dinilai pada tarif charge-out (sama dengan modul WIP & Realisasi); biaya waktu pada tarif biaya. Margin rencana memakai biaya pada jam <b>anggaran</b> — margin akhir bergantung selisih jam aktual vs anggaran hingga penerbitan opini.</span>
                : <span>Perikatan ini belum punya roster jam, sehingga WIP, biaya waktu, dan margin <b>tak terukur</b> — bukan nol. Siapkan roster di Time &amp; Budget.</span>}
            </div>
          </div>
        </Panel>
      </div>

      {/* PR-C-2 · jam per fase. Kolom "Aktual" lama adalah PLUG: total jam
          dibagi proporsional terhadap progres literal, lalu disajikan sebagai
          pengukuran. Kini hanya jam yang BENAR-BENAR ber-tag fase di timesheet
          yang muncul, dan jam tak ber-tag dinyatakan sebagai barisnya sendiri. */}
      <Panel noBody>
        <div className="panel-h">
          <h3>Jam per Fase</h3>
          <span className="sub">anggaran = model alokasi · aktual = hanya jam ber-tag fase di timesheet</span>
        </div>
        <table className="dtbl">
          <thead><tr>
            <th>Fase</th>
            <th className="num" style={{ width: 66 }}>WP</th>
            <th className="num" style={{ width: 96 }}>Anggaran<span className="tiny muted"> (model)</span></th>
            <th className="num" style={{ width: 108 }}>Ter-timesheet</th>
            <th style={{ width: 200 }}>Kelengkapan terbukti</th>
            <th className="num" style={{ width: 70 }}>Terbukti</th>
          </tr></thead>
          <tbody>
            {D.phaseRows.map((r: any) => (
              <tr key={r.phase}>
                <td><span className="row ac gap8"><span style={{ width: 9, height: 9, borderRadius: 3, background: r.color, flex: '0 0 9px' }} /><span style={{ fontWeight: 600, fontSize: 12 }}>{r.phase}</span></span></td>
                <td className="num mono tiny muted">{r.wpCount || '—'}</td>
                <td className="num mono tiny">{fmt(r.bud)}</td>
                <td className="num mono tiny" style={{ fontWeight: 700 }}>{r.tsAct ? fmt(r.tsAct) : <span className="muted" style={{ fontWeight: 400 }}>—</span>}</td>
                <td>
                  <div className="row ac gap8">
                    <div style={{ flex: 1, height: 7, borderRadius: 5, background: 'var(--surface-3)', overflow: 'hidden' }}><div style={{ width: Math.min(100, r.pct) + '%', height: '100%', background: r.color }} /></div>
                  </div>
                </td>
                <td className="num mono tiny" style={{ color: ckpBar(r.pct), fontWeight: 700 }}>{r.wpCount ? r.pct + '%' : '—'}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={2} style={{ fontWeight: 600, fontSize: 12 }}>Jam tanpa tag fase (roster pembuka)</td>
              <td className="num mono tiny muted">—</td>
              <td className="num mono tiny" style={{ fontWeight: 700 }}>{fmt(D.untaggedHrs)}</td>
              <td colSpan={2} className="tiny muted">jam pembuka roster tidak ber-tag fase — tidak dialokasikan paksa</td>
            </tr>
          </tbody>
        </table>
        <div style={{ padding: '10px 14px' }}>
          <div className="ckp-info">
            <I.alert size={13} />
            <span>Total {fmt(D.actualHrs)} jam = {fmt(D.tsTotal)} ber-tag fase + {fmt(D.untaggedHrs)} tanpa tag. Kolom anggaran adalah <b>model alokasi</b> (bobot fase × jam anggaran), bukan hasil pengukuran — jangan dibaca sebagai komitmen per fase.</span>
          </div>
        </div>
      </Panel>
    </div>
  );
}

/* ============================================================
   TAB · TIM & BEBAN — roster, utilization, assignments
   ============================================================ */
function TabTim({ D, nav }: any) {
  const { fmt } = AMS;
  /* PR-C-1: baris tim = roster SSOT (`engagementWip`), bukan total dibagi bobot.
     `util` kini utilisasi PERIKATAN (actual/budget roster); utilisasi FIRMA
     ditampilkan terpisah & berlabel — dulu angka firma dipakai untuk memasang
     badge OVER-UTILIZED di layar perikatan. */
  const members: CockpitMember[] = D.econ.members;
  const maxAct = Math.max(...members.map((m) => m.actual), 1);
  return (
    <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Tim Engagement</h3><span className="sub">{D.econ.hasRoster ? `${members.length} anggota · roster + timesheet` : 'roster jam belum disiapkan'}</span></div>
        <div style={{ padding: '6px 6px 10px' }}>
          {!D.econ.hasRoster && (
            <div className="ckp-info" style={{ margin: '6px 6px 2px' }}>
              <I.alert size={13} />
              <span>Perikatan ini belum punya roster jam, jadi beban per anggota <b>tak terukur</b>. Total perikatan {fmt(D.actualHrs)}/{fmt(D.budgetHrs)} jam tetap berlaku. Siapkan roster di <b>Time &amp; Budget</b> agar rinciannya muncul di sini.</span>
            </div>
          )}
          {members.map((m) => {
            const over = m.actual > m.budget;
            return (
              <div key={m.name} className="ckp-member">
                <Avatar name={m.name} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row ac gap8">
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{m.name}</span>
                    <span className="chip tiny" style={{ height: 17 }}>{m.grade}</span>
                    {over && <span className="badge b-red" style={{ fontSize: 11, padding: '0 5px' }}>LEWAT ANGGARAN</span>}
                  </div>
                  <div className="tiny muted" style={{ marginBottom: 5 }}>{m.role} · {fmt(m.actual)}/{fmt(m.budget)} jam · {m.wpPrep} WP disusun · {m.wpRev} WP direviu · {m.procPrep} prosedur</div>
                  <div className="row ac gap8">
                    <div style={{ flex: 1, height: 6, borderRadius: 5, background: 'var(--surface-3)', overflow: 'hidden' }}><div style={{ width: (m.actual / maxAct * 100) + '%', height: '100%', background: over ? 'var(--red)' : 'var(--blue)' }} /></div>
                    <span className="mono tiny muted" style={{ width: 148, textAlign: 'right' }}>
                      Util perikatan {m.util}%{m.firmUtil != null && <span> · firma {m.firmUtil}%</span>}
                    </span>
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
              segments={members.map((m, i) => ({ value: m.actual, color: ['#013a52', '#005085', '#1d6fb8', '#0a6b73', '#5b3fa6', '#9a6a00'][i % 6] }))}
              center={<div><div className="mono" style={{ fontSize: 15, fontWeight: 700 }}>{fmt(members.reduce((s, m) => s + m.actual, 0))}</div><div className="tiny muted">jam</div></div>} />
            <div style={{ flex: 1 }}>
              {members.length === 0 && <div className="tiny muted">Tak terukur — roster jam belum disiapkan.</div>}
              {members.map((m, i) => (
                <div key={m.name} className="row jb ac" style={{ padding: '3px 0' }}>
                  <span className="row ac gap6 tiny"><span style={{ width: 8, height: 8, borderRadius: 2, background: ['#013a52', '#005085', '#1d6fb8', '#0a6b73', '#5b3fa6', '#9a6a00'][i % 6] }} />{m.name.split(' ')[0]}</span>
                  <span className="mono tiny" style={{ fontWeight: 700 }}>{fmt(m.actual)}j</span>
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
   PR-C-3 · KESIAPAN OPINI & EQR — gerbang KANONIK
   ------------------------------------------------------------
   Sampai PR ini panel ini merakit 8 kriterianya sendiri, tiga di antaranya
   KONSTANTA:

     { l:'Penilaian going concern selesai',        ok:false, … }
     { l:'Telaah peristiwa kemudian (subsequent)', ok:false, … }
     { l:'Konfirmasi independensi tim lengkap',    ok:true,  … }

   Dua tak akan pernah terpenuhi walau auditor menuntaskan pekerjaannya; satu
   selalu terpenuhi walau tak ada deklarasi. Gauge "x/8" karena itu berplafon 6
   dan berlantai 1 — cacat #240 persis: status ditentukan literal, bukan angka.

   Sementara itu gerbang KANONIK sudah ada dan sudah mengikat transisi fase:
   `engagementGate()` (kesimpulan SA 230 ≥80%, nol WP belum-dimulai, nol catatan
   prioritas tinggi, integritas WTB, opini final, EQR SMM 2). Cockpit tak pernah
   memanggilnya — dua gerbang berbeda untuk satu perikatan, dan yang MENGIKAT
   bukan yang ditampilkan. Kini panel ini menampilkan yang mengikat.

   Going concern & subsequent events tidak hilang: keduanya kertas kerja kanonik
   (`goingconcern`, `subsequent` di fase Specifics), jadi kelengkapannya terlihat
   di pipeline & ikut menggerakkan progres terbukti — terukur, bukan hardcode.
   Independensi DIHAPUS dari gerbang: tak ada sumber terukur yang tersambung ke
   sini, dan kriteria yang tak terukur lebih baik hilang daripada berbohong.
   ============================================================ */
function OpinionReadinessPanel({ nav }: { nav: (id: string, opts?: Record<string, unknown>) => void }) {
  const audit = useAuditHeavy(['reviewNotes']);
  const firm = useFirm();
  const engId: string | undefined = firm && firm.activeEngagementId;
  const phase: string = (firm && firm.activeEngagement && firm.activeEngagement.phase) || 'Perencanaan';

  /* dua gerbang yang benar-benar dihadapi auditor */
  const nextGate = engagementGate(audit, firm, {});                                        // → fase berikutnya
  const issueGate = engagementGate(audit, firm, { fromPhase: 'Finalisasi', nextPhase: 'Arsip' }); // → penerbitan & arsip
  const eqr = eqrStatusFor(engId);

  const met = issueGate.criteria.filter((c: { met: boolean }) => c.met).length;
  const tot = issueGate.criteria.length;
  const pct = tot ? (met / tot) * 100 : 0;

  return (
    <Panel noBody>
      <div className="panel-h"><h3>Kesiapan Opini &amp; EQR</h3><span className="sub">gerbang kanonik — sama dengan yang mengikat transisi fase</span></div>
      <div style={{ padding: '12px 14px' }}>
        <div className="row ac gap10" style={{ marginBottom: 12 }}>
          <Gauge pct={pct} size={58} stroke={8} tone={met === tot ? 'green' : met >= tot * 0.6 ? 'amber' : 'red'} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{met} / {tot} prasyarat penerbitan terpenuhi</div>
            <div className="tiny muted">SA 700 · SA 230 · SMM 2 — fase aktif: {phase}</div>
          </div>
        </div>

        {/* rekap kelengkapan kertas kerja auditable (sign-off + bukti kanonik) */}
        <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--line-soft)' }}>
          <div className="tiny muted upper" style={{ fontWeight: 700, letterSpacing: '.04em', marginBottom: 8 }}>Kelengkapan Kertas Kerja</div>
          <WpCompletenessRecap />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div className="tiny muted upper" style={{ fontWeight: 700, letterSpacing: '.04em', marginBottom: 8 }}>Prasyarat penerbitan &amp; arsip</div>
          <EngagementGateSummary nextPhase="Arsip" gate={issueGate} compact />
        </div>

        {nextGate.severity !== 'none' && nextGate.criteria.length > 0 && nextGate.nextPhase !== 'Arsip' && (
          <div style={{ marginBottom: 12, paddingTop: 10, borderTop: '1px solid var(--line-soft)' }}>
            <div className="tiny muted upper" style={{ fontWeight: 700, letterSpacing: '.04em', marginBottom: 8 }}>
              Prasyarat fase berikut → {nextGate.nextPhase}
            </div>
            <EngagementGateSummary nextPhase={nextGate.nextPhase} gate={nextGate} compact />
          </div>
        )}

        {/* EQR dinyatakan apa adanya — termasuk ketika ia TIDAK wajib */}
        <div className="ckp-info" style={{ marginBottom: 8 }}>
          <I.shield size={13} />
          <span>{eqr.applicable
            ? <>EQR wajib untuk perikatan ini (SMM 2): <b>{eqrGateDetail(eqr)}</b></>
            : <>EQR tidak wajib untuk perikatan ini (Non-PIE) — {eqrGateDetail(eqr)}</>}</span>
        </div>
        <button className="btn sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => nav('eqr')}><I.shield size={14} /> Buka EQR</button>
      </div>
    </Panel>
  );
}

/* ============================================================
   TAB · RISIKO & KUALITAS — risk coverage, notes board, readiness gate
   ============================================================ */
function TabRisiko({ D, e, nav }: any) {
  /* PR-C-5: satu sumber cakupan — `cockpitRiskCoverage` (join `riskId`), sama
     dengan yang dipakai kartu hero. Dulu tab ini menjodohkan ulang sendiri
     dengan `String.includes` dan memakai definisi "tuntas" yang berbeda. */
  const byId = new Map<string, CockpitRiskCoverage>(
    (D.sigCoverage as CockpitRiskCoverage[]).map((c) => [c.id, c]),
  );
  const sigData = D.sigRisks.map((r: any) => ({ ...r, ...(byId.get(r.id) || { total: 0, done: 0, exc: 0, covered: false }) }));

  const notesByPr = { high: D.openNotes.filter((n: any) => n.priority === 'high'), medium: D.openNotes.filter((n: any) => n.priority === 'medium'), low: D.openNotes.filter((n: any) => n.priority === 'low') };
  const prTone = { high: 'red', medium: 'amber', low: 'gray' };
  const prLabel = { high: 'Prioritas Tinggi', medium: 'Sedang', low: 'Rendah' };

  return (
    <div className="grid" style={{ gap: 12 }}>
      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 12, alignItems: 'start' }}>
        {/* significant risk coverage */}
        <Panel noBody>
          <div className="panel-h"><h3>Cakupan Risiko Signifikan (RoMM)</h3><span className="sub">{D.sigCovered}/{D.sigAreas.length} tuntas · {D.fraudRisks.length} risiko kecurangan</span></div>
          <div style={{ padding: '6px 6px 10px' }}>
            {sigData.map((r: any) => {
              const full = r.covered;
              const tone = full ? 'green' : r.done > 0 ? 'amber' : 'red';
              return (
                <div key={r.id} className="ckp-risk" onClick={() => nav('risk')}>
                  <span className="ckp-risk-ic" style={{ background: TONE_BG[tone], color: TONE[tone] }}>{full ? <I.checkCircle size={16} /> : <I.alert size={16} />}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row ac gap6" style={{ flexWrap: 'wrap' }}>
                      <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--ink-3)' }}>{r.id}</span>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{r.area}</span>
                      {r.fraud && <span className="badge b-amber" style={{ fontSize: 11, padding: '0 5px' }}>FRAUD · SA 240</span>}
                      {r.exc > 0 && <span className="badge b-red" style={{ fontSize: 11, padding: '0 5px' }}>{r.exc} EXC</span>}
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

        <OpinionReadinessPanel nav={nav} />
      </div>

      {/* review notes board */}
      <Panel noBody>
        <div className="panel-h"><h3>Papan Catatan Review</h3><span className="sub">{D.openNotes.length} terbuka</span></div>
        <div className="ckp-notes">
          {['high', 'medium', 'low'].map((pr: any) => (
            <div key={pr} className="ckp-notecol">
              <div className="ckp-notecol-h" style={{ color: (TONE as any)[(prTone as any)[pr]] }}>
                <span style={{ width: 8, height: 8, borderRadius: 50, background: (TONE as any)[(prTone as any)[pr]] }} />
                {(prLabel as any)[pr]} <span className="muted" style={{ fontWeight: 500 }}>· {(notesByPr as any)[pr].length}</span>
              </div>
              {(notesByPr as any)[pr].length === 0 && <div className="tiny muted" style={{ padding: '10px 4px' }}>Tidak ada.</div>}
              {(notesByPr as any)[pr].map((n: any) => (
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
    .ckp-now { font-size:11px; font-weight:800; letter-spacing:.06em; color:#fff; background:var(--blue-solid); padding:1px 6px; border-radius:9px; }
    .ckp-phasecol-sub { padding:6px 13px 0; }
    /* daftar WP kanonik per fase bisa panjang (Specifics 26) — kolom bergulir
       sendiri, TIDAK dipotong diam-diam. */
    .ckp-modlist { padding:8px 10px; max-height:300px; overflow-y:auto; }
    .ckp-modrow { display:block; width:100%; text-align:left; background:none; border:0; font:inherit; color:inherit; padding:7px 8px; border-radius:6px; cursor:pointer; margin-bottom:1px; }
    .ckp-modrow:hover { background:var(--surface-2); }
    .ckp-modrow:focus-visible { outline:2px solid var(--blue); outline-offset:-2px; }

    .ckp-bridge { padding:14px 16px 16px; }
    .ckp-bridge-nums { display:flex; align-items:center; gap:18px; margin-bottom:14px; }
    .ckp-bridge-num { flex:1; }
    .ckp-bridge-arrow { color:var(--ink-4); flex:0 0 auto; }
    .ckp-bridge-rows { border-top:1px solid var(--line-soft); padding-top:10px; }
    .ckp-bridge-row { display:flex; gap:9px; align-items:flex-start; padding:6px 0; }
    .ckp-bridge-tick { flex:0 0 auto; margin-top:2px; }
    .ckp-bridge-total { display:flex; justify-content:space-between; align-items:center; padding:9px 0 8px; margin-top:4px; border-top:1px solid var(--line); }
    .ckp-bridge-gap { display:flex; justify-content:space-between; align-items:center; padding:8px 10px; border-radius:7px; background:var(--surface-2); }

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
    .ckp-rail-fill { position:absolute; left:0; top:14px; height:3px; border-radius:3px; background:var(--blue-solid); }
    .ckp-node { position:absolute; top:5px; transform:translateX(-50%); }
    .ckp-dot { width:22px; height:22px; border-radius:50%; color:#fff; font-size:11px; font-weight:700; display:grid; place-items:center; border:2px solid var(--surface); }
    .ckp-today { position:absolute; top:-20px; transform:translateX(-50%); }
    .ckp-today span { font-size:11px; font-weight:800; letter-spacing:.06em; color:var(--blue); background:var(--blue-050); padding:1px 6px; border-radius:8px; border:1px solid var(--blue-100); white-space:nowrap; }
    .ckp-today::after { content:''; position:absolute; left:50%; top:16px; transform:translateX(-50%); width:2px; height:18px; background:var(--blue-solid); }

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
    .ckp-notecol-h { font-size:12px; font-weight:700; display:flex; align-items:center; gap:7px; margin-bottom:10px; }
    .ckp-note { background:var(--surface-2); border:1px solid var(--line); border-radius:8px; padding:10px 11px; margin-bottom:8px; cursor:pointer; transition:.12s; }
    .ckp-note:hover { border-color:var(--blue-400); box-shadow:var(--shadow-sm); }

    @media (max-width:1180px){ .ckp-signals{ grid-template-columns:repeat(3,1fr);} }
  `}</style>;
}

Object.assign(window, { EngagementCockpit });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { EngagementCockpit };
