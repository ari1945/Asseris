/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAmsPersist, useAudit, useAuth, useNav } from './contexts';
import { CAP } from './rbac';
import { MILESTONE_KIND_LABEL, milestoneSlip, normalizeDeliveryPlan, overdueVsBaseline, planConsistencyAll, planSlipSummary, seedDeliveryPlan, shiftMilestone, shiftRequiresReason, withMilestoneStatus } from './canon_delivery';
import type { DeliveryEngPlan, DeliveryPhase, MilestoneKind, MilestoneShift, PlanIssue, SeedEngPlan } from './canon_delivery';
import { Overlay } from './overlay';
import type { ClientRow, EngagementRow } from './ams_types';
import { I } from './icons';
import { SubBar } from './shell';
import { Avatar, Badge, Btn, Panel, Progress, Seg, Stat } from './ui';
import { amsExportXlsx } from './export_xlsx';
import { KvBox } from './view_analytical';

/* ============================================================
   Asseris — Delivery & Milestones (Practice Operations · D+)
   Gantt fase perikatan + pelacakan milestone & deadline.
   ============================================================ */
const { useState: useStateDlv, useMemo: useMemoDlv } = React;

/* Baris rencana siap-render: fase + milestone yang sudah membawa status & slip turunan. */
type DeliveryRow = ReturnType<typeof withMilestoneStatus>;
type RowMilestone = DeliveryRow['milestones'][number];

/* Pergeseran yang menunggu alasan (Q-2c) — dari date-picker ke dialog. */
interface PendingShift { engId: string; idx: number; from: string; to: string; label: string }
interface ShiftReasonProps { ask: PendingShift; onConfirm: (reason: string) => void; onCancel: () => void }
/* Satu baris jejak pergeseran, sudah dilabeli milestone asalnya. */
type TrailRow = MilestoneShift & { label: string };

const PLAN_ISSUE_LABEL: Record<PlanIssue['kind'], string> = {
  sequence: 'Urutan', 'phase-overlap': 'Fase tumpang-tindih',
  'phase-gap': 'Lubang fase', 'past-deadline': 'Lewat tenggat',
};

const DLV_PHASE_COLOR = { Perencanaan: 'var(--purple)', Eksekusi: 'var(--blue)', Finalisasi: 'var(--teal)' };
const DLV_MS_COLOR = { done: 'var(--green)', due: 'var(--amber)', upcoming: 'var(--ink-4)' };
const DLV_d = (s: any) => new Date(s + 'T00:00:00');
const DLV_fmtDate = (s: any) => DLV_d(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
const DLV_daysTo = (s: any, today: any) => Math.round((+DLV_d(s) - +DLV_d(today)) / 864e5);

function DeliveryMilestones() {
  const { fmt, ENGAGEMENTS, CLIENTS } = AMS;
  /* SSOT: rencana pengiriman tersimpan (deliveryPlan.v1, seed dari AMS.DELIVERY);
     status milestone DITURUNKAN dari flag done × klok AMS.TODAY (Fase 4 PR-A2). */
  const [planRaw, setPlan] = useAmsPersist('deliveryPlan.v1', () => seedDeliveryPlan(AMS.DELIVERY as unknown as SeedEngPlan[]));
  const today = AMS.TODAY;
  const win = AMS.DELIVERY_WINDOW as { start: string; end: string; today: string };
  const t0 = DLV_d(win.start).getTime(), t1 = DLV_d(win.end).getTime();
  const span = t1 - t0;
  const frac = (s: any) => ((DLV_d(s).getTime() - t0) / span) * 100;
  const nav = useNav();

  const [filter, setFilter] = useStateDlv('Semua');
  const [sel, setSel] = useStateDlv(null);
  const [exporting, setExporting] = useStateDlv(false);

  /* PR-1 — SoD rencana pengiriman: menulis deliveryPlan.v1 = ENGAGEMENT_MANAGE
     (Partner/Manajer), sejajar rencana kapasitas. Gate UI ini WAJIB selaras dengan
     capForWrite('firm','deliveryPlan.v1'); kalau tidak, milestone berubah di layar
     lalu tulisannya ditolak SENYAP oleh server (FORBIDDEN tidak memunculkan toast —
     hanya konflik CAS yang punya toast). Peran lain melihat modul BACA-SAJA dengan
     alasan yang terlihat, bukan kontrol aktif yang tulisannya dibuang. */
  const auth = useAuth();
  const canEdit = !!(auth && typeof auth.can === 'function' && auth.can(CAP.ENGAGEMENT_MANAGE));
  const who = (AMS.USER && AMS.USER.name) || 'Pengguna';
  const { logActivity } = useAudit();
  /* pergeseran mundur yang menunggu alasan (Q-2c) */
  const [ask, setAsk] = useStateDlv(null);

  /* K-06 lanjutan — wire tombol "Ekspor Rencana" (dulu mati): ekspor XLSX tersegel
     linimasa pengiriman per engagement (fase + milestone). */
  const onExportXlsx = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      /* PR-2 — ekspor membawa baseline & pergeseran. Rencana yang diekspor tanpa
         komitmen semula menyembunyikan perlonggaran yang justru ingin ditelusuri. */
      const planRows = DELIVERY.flatMap((p) => p.milestones.map((m) => [
        p.id, m.label, MILESTONE_KIND_LABEL[m.kind], m.baselineDate, m.date,
        m.slip === 0 ? '—' : (m.slip > 0 ? '+' : '') + m.slip,
        m.done ? 'Selesai' : 'Terbuka',
        (m.shifts || []).map((s) => `${s.at} ${s.by}: ${s.from}→${s.to}${s.reason ? ' (' + s.reason + ')' : ''}`).join(' · ') || '—',
      ]));
      await amsExportXlsx({
        kind: 'delivery-plan', scope: 'firm', scopeId: undefined,
        fileName: `Rencana Pengiriman (Delivery Plan).xlsx`,
        firm: 'KAP Wijaya Hartono & Rekan',
        title: 'Rencana Pengiriman — Fase & Milestone',
        meta: [`${DELIVERY.length} perikatan · ${planRows.length} milestone`,
          `Aktif ${active.length} · at-risk ${atRisk} · lewat tempo ${overdueMs} (vs komitmen semula ${overdueBaseline})`,
          `Tergeser ${slip.shiftedCount} milestone · total ${slip.totalSlipDays} hari mundur`],
        sheets: [
          { name: 'Milestone', heading: 'Milestone pengiriman per engagement (baseline = komitmen semula)',
            columns: ['Engagement', 'Milestone', 'Jenis', 'Komitmen semula', 'Tanggal kini', 'Geser (hari)', 'Status', 'Jejak pergeseran'],
            rows: planRows, colWidths: [14, 36, 20, 15, 13, 12, 10, 60] },
          { name: 'Fase', heading: 'Fase pengiriman per engagement',
            columns: ['Engagement', 'Fase', 'Mulai', 'Selesai'],
            rows: DELIVERY.flatMap((p: DeliveryEngPlan) => p.phases.map((ph: DeliveryPhase) => [p.id, ph.name, ph.start, ph.end])),
            colWidths: [14, 30, 12, 12] },
          /* PR-3 — pengecualian ikut diekspor: rencana yang diekspor tanpa temuannya
             membaca seperti rencana yang konsisten. */
          { name: 'Pengecualian', heading: 'Temuan konsistensi rencana',
            columns: ['Engagement', 'Jenis temuan', 'Rincian'],
            rows: issues.map((is) => [is.eng, PLAN_ISSUE_LABEL[is.kind], is.detail]),
            colWidths: [14, 22, 90] },
        ],
      });
    } finally {
      setExporting(false);
    }
  };

  /* PR-2 — normalisasi dijalankan pada tiap PEMBACAAN, bukan hanya saat seed:
     dokumen `deliveryPlan.v1` yang sudah tersimpan di server (ditulis sebelum PR
     ini) tak punya `baselineDate`. Tanpa ini rencana lama tampak "tak pernah
     tergeser" selamanya. */
  /* `useMemoDlv` (React.useMemo) UNTYPED di repo ini — anotasi wajib di LUAR hook,
     kalau tidak seluruh `.map`/`.flatMap` di bawahnya jadi implicit-any. */
  const plan: DeliveryEngPlan[] = useMemoDlv(() => normalizeDeliveryPlan(planRaw), [planRaw]);
  /* rencana + status & slip milestone turunan (done/due/upcoming vs today). */
  const DELIVERY: DeliveryRow[] = useMemoDlv(() => plan.map((p) => withMilestoneStatus(p, today)), [plan, today]);

  /* jalur tulis milestone: tandai selesai/urung + geser tanggal → deliveryPlan.v1 */
  const setMsDone = (engId: string, idx: number, done: boolean) => {
    if (!canEdit) return;
    setPlan(() => plan.map((p) => p.id === engId ? { ...p, milestones: p.milestones.map((m, i) => i === idx ? { ...m, done } : m) } : p));
  };
  /* PR-2 — menggeser tanggal MENCATAT (siapa · kapan · dari → ke · alasan) dan tak
     pernah menyentuh `baselineDate`. Q-2 = opsi (c): pergeseran MUNDUR wajib
     beralasan; UI meminta alasan lebih dulu lewat <ShiftReason>. */
  const applyMsDate = (engId: string, idx: number, date: string, reason?: string) => {
    if (!canEdit || !date) return; // date picker dikosongkan → jangan timpa tanggal valid dgn ''
    setPlan(() => plan.map((p) => p.id === engId
      ? { ...p, milestones: p.milestones.map((m, i) => i === idx ? shiftMilestone(m, date, { at: today, by: who, reason }) : m) }
      : p));
    const from = plan.find((p) => p.id === engId)?.milestones[idx];
    logActivity && from && logActivity({
      who, action: 'DELIVERY_SHIFT',
      detail: `Milestone "${from.label}" (${engId}) digeser ${from.date} → ${date}`
        + ` · baseline ${from.baselineDate}` + (reason ? ` · alasan: ${reason}` : ''),
    });
  };
  const setMsDate = (engId: string, idx: number, date: string) => {
    if (!canEdit || !date) return;
    const m = plan.find((p) => p.id === engId)?.milestones[idx];
    if (!m || m.date === date) return;
    if (shiftRequiresReason(m.date, date)) { setAsk({ engId, idx, from: m.date, to: date, label: m.label }); return; }
    applyMsDate(engId, idx, date);
  };

  const engById = (id: any) => ENGAGEMENTS.find((e) => e.id === id) || ({} as EngagementRow);
  const cliOf = (e: any) => CLIENTS.find((c) => c.id === e.clientId) || ({} as ClientRow);

  // month gridlines
  const months = useMemoDlv(() => {
    const out = []; const d = new Date(t0); d.setDate(1);
    while (d.getTime() <= t1) {
      out.push({ label: d.toLocaleDateString('id-ID', { month: 'short' }), pos: ((d.getTime() - t0) / span) * 100 });
      d.setMonth(d.getMonth() + 1);
    }
    return out;
  }, []);

  const rows = DELIVERY.map((p: any) => ({ ...p, e: engById(p.id), c: cliOf(engById(p.id)) }))
    .filter((r: any) => r.e.status !== 'Completed' || filter === 'Semua' ? true : true);

  // KPIs
  const allMs = DELIVERY.flatMap((p: any) => p.milestones.map((m: any) => ({ ...m, eng: p.id })));
  const active = DELIVERY.filter((p: any) => engById(p.id).status !== 'Completed');
  const dueSoon = allMs.filter((m: any) => m.status !== 'done' && DLV_daysTo(m.date, today) >= 0 && DLV_daysTo(m.date, today) <= 7).length;
  const atRisk = active.filter((p: any) => { const e = engById(p.id); return DLV_daysTo(e.deadline, today) <= 14 && e.progress < 85; }).length;
  const overdueMs = allMs.filter((m: any) => m.status !== 'done' && DLV_daysTo(m.date, today) < 0).length;
  /* PR-2 — dua angka yang berbeda dengan sengaja:
       overdueMs        lewat tempo vs tanggal KINI    — dapat dinolkan dgn menggeser
       overdueBaseline  lewat tempo vs komitmen SEMULA — hanya turun bila dikerjakan
     Keduanya ditampilkan berdampingan; selisihnya ADALAH perlonggaran komitmen. */
  const overdueBaseline = overdueVsBaseline(plan, today);
  const slip = planSlipSummary(plan);
  /* PR-3 — rencana yang tidak konsisten kini punya SUARA: urutan terbalik, fase
     tumpang-tindih/berlubang, dan milestone yang jatuh setelah tenggat perikatan. */
  const issues: PlanIssue[] = planConsistencyAll(plan, (id) => engById(id));

  const shown = filter === 'Semua' ? rows : filter === 'Aktif' ? rows.filter((r: any) => r.e.status !== 'Completed') : rows.filter((r: any) => DLV_daysTo(r.e.deadline, today) <= 14 && r.e.progress < 85 && r.e.status !== 'Completed');

  const upcoming = allMs.filter((m: any) => m.status !== 'done')
    .sort((a: any, b: any) => +DLV_d(a.date) - +DLV_d(b.date)).slice(0, 7);

  const selRow = sel ? rows.find((r: any) => r.id === sel) : null;

  return (
    <>
      <SubBar moduleId="delivery" right={
        <div className="row gap8 ac">
          {!canEdit && <span className="chip tiny muted" title="Menyunting rencana pengiriman (tandai milestone selesai / geser tanggal) dibatasi peran Partner / Manajer — setara rencana kapasitas & roster perikatan"><I.lock size={11} /> Read-only</span>}
          <Seg options={['Semua', 'Aktif', 'At-risk']} value={filter} onChange={setFilter} />
          <Btn sm onClick={onExportXlsx} disabled={exporting}><I.download size={13} /> {exporting ? 'Menyiapkan…' : 'Ekspor Rencana'}</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={active.length} label="Perikatan Aktif" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={dueSoon} label="Milestone ≤ 7 hari" accent="var(--blue)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={atRisk} label="Perikatan At-risk" accent={atRisk ? 'var(--red)' : 'var(--green)'} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }} title="Kiri: terhadap tanggal yang berlaku kini. Bawah: terhadap komitmen SEMULA — angka ini tidak turun dengan menggeser tanggal.">
            <Stat value={overdueMs} label="Milestone Lewat Tempo" accent={overdueMs ? 'var(--red)' : 'var(--green)'}
              delta={`${overdueBaseline} vs komitmen semula`} deltaDir={overdueBaseline > overdueMs ? 'up' : 'flat'} />
          </div></Panel>
          <Panel><div style={{ padding: '15px 18px' }} title="Milestone yang tanggalnya bergerak dari komitmen semula; hari = jumlah pergeseran MUNDUR saja.">
            <Stat value={slip.shiftedCount} label="Milestone Tergeser" accent={slip.totalSlipDays ? 'var(--amber)' : 'var(--ink-3)'}
              delta={slip.totalSlipDays ? `+${slip.totalSlipDays} hari mundur` : 'komitmen utuh'} deltaDir={slip.totalSlipDays ? 'up' : 'flat'} />
          </div></Panel>
        </div>

        {/* PR-2 — perlonggaran komitmen dinamai, bukan disembunyikan di selisih KPI. */}
        {slip.worst && (
          <Panel noBody style={{ marginBottom: 12 }}>
            <div className="row ac gap8" style={{ padding: '9px 14px', background: 'var(--amber-bg)' }}>
              <span style={{ color: 'var(--amber)', display: 'inline-flex' }}><I.alert size={14} /></span>
              <span className="tiny" style={{ fontWeight: 600 }}>
                Komitmen pengiriman tergeser: {slip.shiftedCount} milestone, total <b>{slip.totalSlipDays} hari</b> mundur.
                Terbesar <b>{slip.worst.label}</b> ({slip.worst.eng}) <b>+{slip.worst.slip} hari</b> dari komitmen semula.
              </span>
              <span style={{ flex: 1 }} />
              <span className="tiny muted">{overdueBaseline} milestone lewat komitmen semula &amp; belum selesai</span>
            </div>
          </Panel>
        )}

        {/* PR-3 — Pengecualian rencana. Sebuah "rencana" yang tak pernah bisa
            dinyatakan tidak konsisten bukanlah rencana. */}
        {issues.length > 0 && (
          <Panel title="Pengecualian Rencana" sub={`${issues.length} temuan konsistensi`} style={{ marginBottom: 12 }}>
            <div style={{ display: 'grid', gap: 0 }}>
              {issues.map((is, i) => (
                <div key={i} className="row ac gap8" style={{ padding: '7px 0', borderBottom: i < issues.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                  <Badge kind={is.kind === 'past-deadline' || is.kind === 'sequence' ? 'red' : 'amber'}>{PLAN_ISSUE_LABEL[is.kind]}</Badge>
                  <span className="tiny mono muted" style={{ flex: '0 0 108px' }}>{is.eng}</span>
                  <span className="tiny" style={{ flex: 1, minWidth: 0 }}>{is.detail}</span>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* Gantt */}
        <Panel noBody style={{ marginBottom: 12 }}>
          <div className="panel-h"><h3>Linimasa Pengiriman — Fase & Milestone</h3><div style={{ flex: 1 }} />
            <div className="row gap10 ac">
              {Object.entries(DLV_PHASE_COLOR).map(([k, v]) => <span key={k} className="row ac gap6"><span style={{ width: 9, height: 9, borderRadius: 2, background: v }} /><span className="tiny muted">{k}</span></span>)}
            </div>
          </div>
          <div style={{ padding: '4px 14px 14px' }}>
            {/* month header */}
            <div style={{ position: 'relative', height: 18, marginLeft: 214, borderBottom: '1px solid var(--line)' }}>
              {months.map((m: any, i: any) => <span key={i} className="tiny muted upper" style={{ position: 'absolute', left: m.pos + '%', top: 2, fontSize: 11, letterSpacing: '.04em' }}>{m.label}</span>)}
              <span style={{ position: 'absolute', left: frac(today) + '%', top: -2, bottom: -2000, width: 2, background: 'var(--red-solid)', opacity: .8, zIndex: 3 }} />
            </div>
            {shown.map((r: any, ri: any) => {
              const used = r.e.budgetHrs ? Math.round(r.e.actualHrs / r.e.budgetHrs * 100) : 0;
              const dl = DLV_daysTo(r.e.deadline, today);
              return (
                <div key={r.id} onClick={() => setSel(sel === r.id ? null : r.id)}
                  className="row ac" style={{ padding: '7px 0', borderBottom: ri < shown.length - 1 ? '1px solid var(--line-soft)' : 0, cursor: 'pointer' }}>
                  <div style={{ width: 214, flex: '0 0 214px', paddingRight: 12 }}>
                    <div className="row ac gap8">
                      <Avatar name={r.e.partner || ''} size={24} />
                      <div style={{ minWidth: 0 }}>
                        <div className="truncate" style={{ fontSize: 12, fontWeight: 600 }}>{(r.c.name || r.id).replace('PT ', '')}</div>
                        <div className="tiny muted mono">{r.id} · {r.e.progress}%</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ flex: 1, position: 'relative', height: 30 }}>
                    {/* phase bars */}
                    {r.phases.map((ph: any, pi: any) => (
                      <div key={pi} title={ph.name + ' · ' + DLV_fmtDate(ph.start) + '–' + DLV_fmtDate(ph.end)}
                        style={{ position: 'absolute', top: 9, height: 12, left: frac(ph.start) + '%', width: Math.max(0.6, frac(ph.end) - frac(ph.start)) + '%', background: (DLV_PHASE_COLOR as any)[ph.name], borderRadius: 3, opacity: r.e.status === 'Completed' ? .42 : .9 }} />
                    ))}
                    {/* PR-2 — bayangan komitmen SEMULA: belah ketupat berongga di
                        posisi baseline + garis ke posisi kini. Pergeseran menjadi
                        terlihat di linimasa, bukan hanya terhitung di KPI. */}
                    {(r.milestones as RowMilestone[]).filter((m) => m.slip !== 0).map((m, mi) => {
                      const a = frac(m.baselineDate), b = frac(m.date);
                      return (
                        <React.Fragment key={'bl' + mi}>
                          <span title={'Komitmen semula: ' + DLV_fmtDate(m.baselineDate) + ' · tergeser ' + (m.slip > 0 ? '+' : '') + m.slip + ' hari'}
                            style={{ position: 'absolute', top: 8, left: 'calc(' + a + '% - 6px)', width: 12, height: 12, transform: 'rotate(45deg)', borderRadius: 2, border: '1.5px dashed var(--ink-4)', opacity: .75 }} />
                          <span style={{ position: 'absolute', top: 14, left: Math.min(a, b) + '%', width: Math.abs(b - a) + '%', height: 1.5, background: m.slip > 0 ? 'var(--amber)' : 'var(--ink-4)', opacity: .8 }} />
                        </React.Fragment>
                      );
                    })}
                    {/* milestone diamonds */}
                    {r.milestones.map((m: any, mi: any) => (
                      <span key={mi} title={m.label + ' · ' + DLV_fmtDate(m.date)}
                        style={{ position: 'absolute', top: 8, left: 'calc(' + frac(m.date) + '% - 6px)', width: 12, height: 12, background: (DLV_MS_COLOR as any)[m.status], transform: 'rotate(45deg)', borderRadius: 2, border: '1.5px solid var(--surface)', zIndex: 2 }} />
                    ))}
                    {/* today line */}
                    <span style={{ position: 'absolute', top: -7, bottom: -7, left: frac(today) + '%', width: 2, background: 'var(--red-solid)', opacity: .55 }} />
                  </div>
                  <div style={{ width: 86, flex: '0 0 86px', textAlign: 'right' }}>
                    <Badge kind={dl < 0 ? 'red' : dl <= 14 ? 'amber' : 'gray'}>{dl < 0 ? Math.abs(dl) + 'h lewat' : dl + ' hari'}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <div className="grid" style={{ gridTemplateColumns: selRow ? '1fr 1fr 340px' : '1fr 1fr', gap: 12, alignItems: 'start' }}>
          <Panel title="Milestone Mendatang" sub="lintas perikatan">
            <div style={{ display: 'grid', gap: 0 }}>
              {upcoming.map((m: any, i: any) => {
                const dl = DLV_daysTo(m.date, today);
                return (
                  <div key={i} className="row ac jb" style={{ padding: '8px 0', borderBottom: i < upcoming.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                    <span className="row ac gap8" style={{ minWidth: 0 }}>
                      <span style={{ width: 10, height: 10, background: (DLV_MS_COLOR as any)[m.status], transform: 'rotate(45deg)', borderRadius: 2, flex: '0 0 10px' }} />
                      <span style={{ minWidth: 0 }}>
                        <div className="truncate" style={{ fontSize: 12, fontWeight: 600 }}>{m.label}</div>
                        <div className="tiny muted mono">{m.eng}</div>
                      </span>
                    </span>
                    <span style={{ textAlign: 'right' }}>
                      <div className="mono tiny" style={{ fontWeight: 700 }}>{DLV_fmtDate(m.date)}</div>
                      <div className="tiny" style={{ color: dl < 0 ? 'var(--red)' : dl <= 7 ? 'var(--amber)' : 'var(--ink-3)' }}>{dl < 0 ? Math.abs(dl) + 'h lewat' : 'dalam ' + dl + 'h'}</div>
                    </span>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Status Pengiriman" sub="risiko deadline">
            <div style={{ display: 'grid', gap: 8 }}>
              {active.map((p: any) => {
                const e = engById(p.id), c = cliOf(e);
                const dl = DLV_daysTo(e.deadline, today);
                const burn = e.budgetHrs ? e.actualHrs / e.budgetHrs * 100 : 0;
                const risk = dl <= 14 && e.progress < 85;
                return (
                  <div key={p.id} className="panel" style={{ padding: '9px 11px', background: risk ? 'var(--amber-bg)' : 'var(--surface-2)', borderColor: 'transparent' }}>
                    <div className="row ac jb" style={{ marginBottom: 5 }}>
                      <span className="truncate" style={{ fontSize: 12, fontWeight: 600 }}>{(c.name || p.id).replace('PT ', '')}</span>
                      <span className="mono tiny" style={{ fontWeight: 700, color: dl <= 14 ? 'var(--red)' : 'var(--ink-3)' }}>{DLV_fmtDate(e.deadline)}</span>
                    </div>
                    <div className="row ac gap8">
                      <div style={{ flex: 1 }}><Progress value={e.progress} color={risk ? 'var(--amber)' : 'var(--blue)'} /></div>
                      <span className="tiny muted mono">progres {e.progress}%</span>
                    </div>
                    <div className="tiny muted" style={{ marginTop: 4 }}>Burn jam: <b style={{ color: burn > e.progress + 12 ? 'var(--red)' : 'var(--ink-2)' }}>{Math.round(burn)}%</b> dari budget · {fmt(e.actualHrs)}/{fmt(e.budgetHrs)}h</div>
                  </div>
                );
              })}
            </div>
          </Panel>

          {selRow && <DeliveryDetail row={selRow} eng={selRow.e} client={selRow.c} today={today} canEdit={canEdit}
            onToggleMs={(idx: number, done: boolean) => setMsDone(selRow.id, idx, done)}
            onDateMs={(idx: number, date: string) => setMsDate(selRow.id, idx, date)}
            onClose={() => setSel(null)} onNav={nav} />}
        </div>
      </div></div>

      {ask && <ShiftReason ask={ask} onCancel={() => setAsk(null)}
        onConfirm={(reason: string) => { applyMsDate(ask.engId, ask.idx, ask.to, reason); setAsk(null); }} />}
    </>
  );
}

/* ------------------------------------------------------------------
   Q-2 opsi (c) — pergeseran MUNDUR wajib beralasan. Friksi diletakkan tepat pada
   tindakan yang melonggarkan komitmen; menjadwalkan lebih awal lewat tanpa dialog.
   ------------------------------------------------------------------ */
function ShiftReason({ ask, onConfirm, onCancel }: ShiftReasonProps) {
  const [reason, setReason] = useStateDlv('');
  const days = DLV_daysTo(ask.to, ask.from);
  const ok = reason.trim().length >= 4;
  return (
    <Overlay open onClose={onCancel} size="sm" title="Geser komitmen pengiriman"
      footer={
        <div className="row gap8 je">
          <Btn sm onClick={onCancel}>Batal</Btn>
          <Btn sm variant="primary" disabled={!ok} onClick={() => onConfirm(reason.trim())}>Geser &amp; catat</Btn>
        </div>
      }>
      <div style={{ display: 'grid', gap: 10 }}>
        <div className="tiny">
          <b>{ask.label}</b> mundur <b>{days} hari</b>: {DLV_fmtDate(ask.from)} → {DLV_fmtDate(ask.to)}.
        </div>
        <div className="tiny muted">
          Komitmen semula tetap tersimpan dan tetap dihitung sebagai lewat tempo — menggeser
          tanggal tidak menghapus keterlambatan, hanya mencatat perubahan rencananya.
        </div>
        <label className="tiny" style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontWeight: 600 }}>Alasan pergeseran (wajib)</span>
          <input type="text" value={reason} autoFocus onChange={(e: { target: { value: string } }) => setReason(e.target.value)}
            placeholder="mis. PBC klien terlambat; stock opname dijadwal ulang"
            style={{ height: 30, border: '1px solid var(--line)', borderRadius: 5, background: 'var(--surface)', color: 'var(--ink)', padding: '0 8px', fontSize: 12 }} />
        </label>
        {!ok && <div className="tiny muted">Minimal 4 karakter.</div>}
      </div>
    </Overlay>
  );
}

function DeliveryDetail({ row, eng, client, today, canEdit, onToggleMs, onDateMs, onClose, onNav }: any) {
  const { fmt } = AMS;
  const burn = eng.budgetHrs ? Math.round(eng.actualHrs / eng.budgetHrs * 100) : 0;
  const overburn = burn > eng.progress + 12;
  return (
    <Panel noBody style={{ position: 'sticky', top: 0 }}>
      <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: 'var(--on-dark-fg)', padding: '13px 15px' }}>
        <div className="row jb ac" style={{ marginBottom: 6 }}><span className="mono tiny" style={{ color: 'var(--on-dark-muted)', fontWeight: 700 }}>{eng.id}</span><button aria-label="Tutup" className="top-btn" onClick={onClose}><I.x size={17} /></button></div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{(client.name || eng.id).replace('PT ', '')}</div>
        <div className="tiny" style={{ color: 'var(--on-dark-muted)' }}>{eng.type} · {eng.phase}</div>
      </div>
      <div style={{ padding: 14 }}>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 13 }}>
          <KvBox label="Progres" v={eng.progress + '%'} accent="var(--blue)" />
          <KvBox label="Deadline" v={DLV_fmtDate(eng.deadline)} accent={DLV_daysTo(eng.deadline, today) <= 14 ? 'var(--red)' : null} />
          <KvBox label="Burn Jam" v={burn + '%'} accent={overburn ? 'var(--red)' : 'var(--green)'} />
          <KvBox label="Jam" v={fmt(eng.actualHrs) + '/' + fmt(eng.budgetHrs)} />
        </div>
        {overburn && <div className="panel" style={{ padding: '8px 10px', background: 'var(--red-bg)', borderColor: 'transparent', marginBottom: 13 }}><div className="row ac gap8"><span style={{ color: 'var(--red)' }}><I.alert size={14} /></span><span className="tiny" style={{ fontWeight: 600 }}>Konsumsi jam ({burn}%) melampaui progres ({eng.progress}%) — tinjau ulang efisiensi & estimasi sisa.</span></div></div>}

        <div className="tiny muted upper" style={{ marginBottom: 7 }}>Fase</div>
        <div style={{ display: 'grid', gap: 6, marginBottom: 14 }}>
          {row.phases.map((ph: any, i: any) => (
            <div key={i} className="row ac jb">
              <span className="row ac gap7"><span style={{ width: 8, height: 8, borderRadius: 2, background: (DLV_PHASE_COLOR as any)[ph.name] }} /><span className="tiny" style={{ fontWeight: 600 }}>{ph.name}</span></span>
              <span className="tiny muted mono">{DLV_fmtDate(ph.start)} – {DLV_fmtDate(ph.end)}</span>
            </div>
          ))}
        </div>

        <div className="row ac jb" style={{ marginBottom: 7 }}><span className="tiny muted upper">Milestone</span>
          <span className="tiny muted">{canEdit ? 'klik status = tandai selesai · tanggal dapat disunting' : 'baca-saja — perlu peran Partner / Manajer'}</span></div>
        <div style={{ display: 'grid', gap: 0, marginBottom: 14 }}>
          {row.milestones.map((m: any, i: any) => {
            const dl = DLV_daysTo(m.date, today);
            return (
              <div key={i} className="row ac jb" style={{ padding: '6px 0', borderBottom: i < row.milestones.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                <span className="row ac gap8" style={{ minWidth: 0 }}>
                  <button type="button" disabled={!canEdit}
                    title={canEdit ? (m.done ? 'Tandai belum selesai' : 'Tandai selesai') : 'Menandai milestone dibatasi peran Partner / Manajer'}
                    aria-label={(m.done ? 'Tandai belum selesai: ' : 'Tandai selesai: ') + m.label}
                    onClick={() => onToggleMs && onToggleMs(i, !m.done)}
                    style={{ background: 'none', border: 0, padding: 0, cursor: canEdit ? 'pointer' : 'not-allowed', color: (DLV_MS_COLOR as any)[m.status], display: 'inline-flex' }}>
                    {m.status === 'done' ? <I.checkCircle size={15} /> : m.status === 'due' ? <I.clock size={15} /> : <I.circle size={15} />}
                  </button>
                  <span className="tiny truncate" title={'Jenis: ' + MILESTONE_KIND_LABEL[m.kind as MilestoneKind]}
                    style={{ fontWeight: 600, textDecoration: m.status === 'done' ? 'line-through' : 'none', color: m.status === 'done' ? 'var(--ink-4)' : 'var(--ink)' }}>{m.label}</span>
                </span>
                <span className="row ac gap6">
                  {/* PR-2 — komitmen SEMULA selalu ikut tampil bila berbeda. Tidak ada
                      jalur UI yang menyuntingnya; ia hanya dapat dilampaui, tak dihapus. */}
                  {m.slip !== 0 && (
                    <span className="tiny mono" title={'Komitmen semula ' + DLV_fmtDate(m.baselineDate) + (m.shifts && m.shifts.length ? ' · ' + m.shifts.length + '× digeser' : '')}
                      style={{ color: m.slip > 0 ? 'var(--amber)' : 'var(--ink-3)', fontWeight: 700 }}>
                      {m.slip > 0 ? '+' : ''}{m.slip}h
                    </span>
                  )}
                  <input type="date" value={m.date} disabled={!canEdit} onChange={(e: { target: { value: string } }) => onDateMs && onDateMs(i, e.target.value)}
                    aria-label={'Tanggal milestone: ' + m.label}
                    title={(dl < 0 ? Math.abs(dl) + ' hari lewat' : dl + ' hari lagi')
                      + (m.slip !== 0 ? ' · komitmen semula ' + DLV_fmtDate(m.baselineDate) : '')
                      + (canEdit ? '' : ' · baca-saja (perlu peran Partner / Manajer)')}
                    className="mono tiny" style={{ border: '1px solid var(--line)', borderRadius: 4, background: 'var(--surface)', color: m.status === 'done' ? 'var(--ink-4)' : dl < 0 ? 'var(--red)' : 'var(--ink-3)', height: 24, padding: '0 4px' }} />
                </span>
              </div>
            );
          })}
        </div>
        {/* PR-2 — jejak pergeseran: siapa · kapan · dari → ke · alasan. Tanpa panel ini
            komitmen yang bergerak hanyalah angka baru tanpa penanggung jawab. */}
        {(() => {
          const trail: TrailRow[] = (row.milestones as RowMilestone[])
            .flatMap((m) => (m.shifts || []).map((s) => ({ ...s, label: m.label })));
          if (!trail.length) return null;
          return (
            <>
              <div className="tiny muted upper" style={{ marginBottom: 7 }}>Jejak pergeseran ({trail.length})</div>
              <div style={{ display: 'grid', gap: 0, marginBottom: 14 }}>
                {trail.map((s, i: number) => (
                  <div key={i} style={{ padding: '6px 0', borderBottom: i < trail.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                    <div className="row ac jb">
                      <span className="tiny truncate" style={{ fontWeight: 600 }}>{s.label}</span>
                      <span className="mono tiny muted">{DLV_fmtDate(s.from)} → {DLV_fmtDate(s.to)}</span>
                    </div>
                    <div className="tiny muted">{s.by} · {DLV_fmtDate(s.at)}{s.reason ? ' · ' + s.reason : ''}</div>
                  </div>
                ))}
              </div>
            </>
          );
        })()}

        <div className="row gap8">
          <Btn sm variant="primary" style={{ flex: 1 }} onClick={() => onNav('cockpit')}><I.dashboard size={13} /> Buka Cockpit</Btn>
          <Btn sm onClick={() => onNav('scheduler')}><I.users size={13} /> Alokasi</Btn>
        </div>
      </div>
    </Panel>
  );
}



/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { DeliveryMilestones };
