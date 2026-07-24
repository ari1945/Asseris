import React from 'react';
import { AMS } from './data';
import { useAudit, useFirm, useNav, useAmsPersist } from './contexts';
import { capacityModel, seedForwardPlan } from './canon_capacity';
import type { CapacitySeed } from './canon_capacity';
import { useFirmWip } from './use_firm_wip';
import { I } from './icons';
import { Badge, Btn, Panel, Progress, Spark, Stat } from './ui';

/* ============================================================
   Asseris — Beranda·Kokpit Eksekutif (Partner/Manager)
   Adopsi konsep "Dashboard Partner" (Varian A). SEMUA angka SSOT — ditarik
   dari sumber yang sama dengan Firm Dashboard (view_dashboard2): `useFirm`
   (engagements/clients), `useAudit` (team/risks/reviewNotes), `FIRMFIN.wip`
   (WIP/AR/realisasi), `capacityModel` (kapasitas), `AMS.BI_DATA/BI_AR_AGING/
   EQR_REVIEWS`. Tak ada angka ilustratif/hardcode (aturan emas SSOT repo).

   Enam portlet bisa disusun-ulang (drag); urutan disimpan di localStorage
   (`ams.home.cockpit.order`) — UI-pref, sengaja BUKAN useAmsPersist.
   Tanpa @types/react → props & event ditik secara struktural (bukan React.*).
   ============================================================ */
const { useState: useStateHC, useMemo: useMemoHC, useEffect: useEffectHC } = React;

/* ---- tipe struktural (no-explicit-any: semua boundary di-cast sekali) ---- */
type Dir = 'up' | 'down' | '';
type Styleish = Record<string, string | number | undefined>;
type NavFn = (id: string, opts?: { from?: string; tab?: string }) => void;
interface Client { name?: string; id?: string }
interface EngRow { id: string; clientId: string; status: string; phase: string; progress: number; partner: string; deadline: string; budgetHrs: number; actualHrs: number; risk: string }
interface TeamMember { name: string; role: string; util: number }
interface RiskRow { id: string; area: string; desc: string; likelihood: number; impact: number; inherent: string; fraud: boolean; owner?: string }
interface ReviewNote { id: string; module: string; moduleLabel?: string; type: string; ref?: string; status: string; priority?: string; to?: string }
interface EqrChecklist { k: string; ok: boolean }
interface EqrRow { id: string; eng: string; client?: string; type: string; stage?: string; status: string; checklist?: EqrChecklist[] }
interface ArBucket { bucket: string; amount: number; color: string }
interface WipAgingRow { key: string; bucket: string; value: number }
interface WipRegister { id: string; recoverable: number }
interface WipResult { unbilledTotal: number; avgRealization: number; registerAll: WipRegister[]; aging: WipAgingRow[] }
interface Bi { fyRevenue: number; prevYearRevenue: number; monthlyRev: number[] }
interface FirmCtx { engagements?: EngRow[]; clientById?: (id: string) => Client | undefined; setActiveEngagementId?: (id: string) => void; activeEngagementId?: string }
interface AuditCtx { team?: TeamMember[]; risks?: RiskRow[]; reviewNotes?: ReviewNote[] }

interface Kpi { aktif: number; total: number; fee: number; feeYoY: string; feeYoYDir: Dir; feeSeries: number[]; wip: number; ar60: number; realisasi: number; util: number }
interface PortRow { id: string; clientName: string; partner: string; phase: string; progress: number; dueLabel: string; dueKind: string; feeLabel: string; flag: string | null; open: () => void }
interface ApprovalItem { key: string; tipe: string; ref: string; prio: string; prioKind: string; route: string }
interface PerhatianItem { key: string; text: string; sub: string; kind: string; level: string; route: string }
interface QGap { k: string; eng: string }
interface Quality { eqrWajib: number; eqrSelesai: number; sig: number; openNotes: number; gaps: QGap[] }
interface AgingBar { b: string; v: number; pct: number; hot: boolean }
interface Finance { wip: number; realisasi: number; trend: number[]; wipAging: AgingBar[]; arAging: AgingBar[] }
interface GradeFill { grade: string; fill: number }
interface Overload { name: string; role: string; util: number }
interface Team { headcount: number; grades: GradeFill[]; overload: Overload[] }
interface DragEvt { preventDefault(): void }
interface DragRoot { onDragOver: (e: DragEvt) => void; onDrop: (e: DragEvt) => void; style?: Styleish }
interface DragGrip { draggable: boolean; onDragStart: () => void; onDragEnd: () => void; style: Styleish }
interface CockpitModel { k: Kpi; portRows: PortRow[]; persetujuan: ApprovalItem[]; perhatian: PerhatianItem[]; q: Quality; fin: Finance; tim: Team }

const HC_ORDER_DEFAULT = ['portofolio', 'persetujuan', 'perhatian', 'kualitas', 'keuangan', 'tim'];
const HC_ORDER_KEY = 'ams.home.cockpit.order';
const HC_WIDE = new Set(['portofolio']);

function hcLoadOrder(): string[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(HC_ORDER_KEY) || 'null');
    if (Array.isArray(raw) && raw.length === HC_ORDER_DEFAULT.length
      && HC_ORDER_DEFAULT.every((id) => raw.includes(id))) return raw as string[];
  } catch (e) { /* ignore */ }
  return HC_ORDER_DEFAULT;
}

const hcRpM = (v: number) => 'Rp ' + AMS.fmt(v / 1e9, v >= 1e10 ? 1 : 2) + ' M';
const hcRpJt = (v: number) => AMS.fmt(Math.round(v / 1e6)) + ' jt';
const hcInitials = (name: string) => (name || '').split(/[ ,]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const hcDaysTo = (iso: string) => { const d = new Date(iso); const t = new Date(); return Math.round((d.getTime() - t.getTime()) / 86400000); };
const HC_PHASE_KIND: Record<string, string> = { Perencanaan: 'purple', Eksekusi: 'blue', Finalisasi: 'amber', Arsip: 'green' };

/* ---- KPI strip (6 metrik SSOT) ---- */
function HcKpiStrip({ k }: { k: Kpi }) {
  return (
    <div className="grid hc-kpi" style={{ gridTemplateColumns: 'repeat(6,1fr)', gap: 10, marginBottom: 14 }}>
      <Panel noBody><div className="hc-kpi-c"><Stat value={k.aktif} label="Perikatan Aktif" delta={k.total + ' portofolio'} /></div></Panel>
      <Panel noBody><div className="hc-kpi-c">
        <Stat value={hcRpM(k.fee)} label="Fee Diakui (FY)" delta={k.feeYoY} deltaDir={k.feeYoYDir} />
        <div className="hc-kpi-spark"><Spark data={k.feeSeries} width={124} height={26} /></div>
      </div></Panel>
      <Panel noBody><div className="hc-kpi-c"><Stat value={hcRpM(k.wip)} label="WIP Belum Ditagih" accent="var(--amber)" /></div></Panel>
      <Panel noBody><div className="hc-kpi-c"><Stat value={hcRpM(k.ar60)} label="Piutang > 60 Hari" accent={k.ar60 > 0 ? 'var(--amber)' : undefined} /></div></Panel>
      <Panel noBody><div className="hc-kpi-c"><Stat value={k.realisasi + '%'} label="Realisasi WIP" accent={k.realisasi < 90 ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
      <Panel noBody><div className="hc-kpi-c"><Stat value={k.util + '%'} label="Utilisasi Tim" accent={k.util > 90 ? 'var(--red)' : undefined} /></div></Panel>
    </div>
  );
}

/* ---- Portlet: Portofolio Perikatan (lebar penuh) ---- */
function HcPortofolio({ rows, nav, grip }: { rows: PortRow[]; nav: NavFn; grip: DragGrip }) {
  return (
    <Panel noBody className="hc-portlet">
      <div className="panel-h"><span className="hc-grip" {...grip}><I.grip size={14} /></span><h3>Portofolio Perikatan</h3><span className="sub">{rows.length} aktif</span><div style={{ flex: 1 }} /><Btn sm variant="ghost" onClick={() => nav('engagement', { from: 'home' })}>Semua <I.arrowRight size={12} /></Btn></div>
      <table className="dtbl hc-tbl">
        <thead><tr><th>Klien</th><th style={{ width: 44 }}>PIC</th><th style={{ width: 96 }}>Tahap</th><th style={{ width: 128 }}>Progres</th><th style={{ width: 92 }}>Deadline</th><th className="num" style={{ width: 92 }}>Fee</th><th>Bottleneck</th></tr></thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.id} style={{ cursor: 'pointer' }} onClick={() => e.open()}>
              <td className="truncate" style={{ maxWidth: 220, fontWeight: 600 }}>{e.clientName}</td>
              <td><span className="avatar" style={{ width: 24, height: 24, fontSize: 9.5 }} title={e.partner}>{hcInitials(e.partner)}</span></td>
              <td><Badge kind={HC_PHASE_KIND[e.phase] || 'gray'}>{e.phase}</Badge></td>
              <td><div className="row ac gap8"><div style={{ flex: 1 }}><Progress value={e.progress} color={e.progress >= 75 ? 'var(--green)' : undefined} /></div><span className="mono tiny" style={{ width: 30, textAlign: 'right' }}>{e.progress}%</span></div></td>
              <td className="tiny mono" style={{ color: e.dueKind === 'red' ? 'var(--red)' : e.dueKind === 'amber' ? 'var(--amber)' : 'var(--ink-3)' }}>{e.dueLabel}</td>
              <td className="num tiny">{e.feeLabel}</td>
              <td className="tiny">{e.flag ? <span style={{ color: 'var(--amber)', fontWeight: 500 }}><I.alert size={11} /> {e.flag}</span> : <span className="muted">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

/* ---- Portlet: Antrian Persetujuan (disembunyikan bila kosong) ---- */
function HcPersetujuan({ items, nav, grip }: { items: ApprovalItem[]; nav: NavFn; grip: DragGrip }) {
  if (!items.length) return null;
  return (
    <Panel noBody className="hc-portlet">
      <div className="panel-h"><span className="hc-grip" {...grip}><I.grip size={14} /></span><h3>Antrian Persetujuan Anda</h3><span className="sub">{items.length} menunggu</span></div>
      <div className="hc-list">
        {items.map((a) => (
          <div key={a.key} className="hc-row" onClick={() => nav(a.route, { from: 'home' })} style={{ cursor: 'pointer' }}>
            <div className="hc-main"><span style={{ fontWeight: 600, fontSize: 12.5 }}>{a.tipe}</span><span className="muted tiny">{a.ref}</span></div>
            <Badge kind={a.prioKind}>{a.prio}</Badge>
            <Btn sm variant="ghost" onClick={(ev: { stopPropagation(): void }) => { ev.stopPropagation(); nav(a.route, { from: 'home' }); }}>Reviu</Btn>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ---- Portlet: Butuh Perhatian Partner ---- */
function HcPerhatian({ items, nav, grip }: { items: PerhatianItem[]; nav: NavFn; grip: DragGrip }) {
  return (
    <Panel noBody className="hc-portlet">
      <div className="panel-h"><span className="hc-grip" {...grip}><I.grip size={14} /></span><h3>Butuh Perhatian Partner</h3><span className="sub">{items.filter((r) => r.kind === 'red').length} tinggi</span></div>
      <div className="hc-list">
        {!items.length && <div className="muted tiny" style={{ padding: 20, textAlign: 'center' }}>Tidak ada isu berprioritas. 🎉</div>}
        {items.map((r) => (
          <div key={r.key} className="hc-row" onClick={() => nav(r.route, { from: 'home' })} style={{ cursor: 'pointer' }}>
            <span className="hc-sev" style={{ background: r.kind === 'red' ? 'var(--red)' : r.kind === 'amber' ? 'var(--amber)' : 'var(--green)' }} />
            <div className="hc-main"><span style={{ fontSize: 12.5 }}>{r.text}</span><span className="muted tiny">{r.sub}</span></div>
            <Badge kind={r.kind}>{r.level}</Badge>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ---- Portlet: Kualitas & Kepatuhan ---- */
function HcKualitas({ q, nav, grip }: { q: Quality; nav: NavFn; grip: DragGrip }) {
  return (
    <Panel noBody className="hc-portlet">
      <div className="panel-h"><span className="hc-grip" {...grip}><I.grip size={14} /></span><h3>Kualitas & Kepatuhan</h3><span className="sub">EQR · Reviu · Risiko</span><div style={{ flex: 1 }} /><Btn sm variant="ghost" onClick={() => nav('eqr', { from: 'home' })}><I.arrowRight size={12} /></Btn></div>
      <div className="panel-body">
        <div className="hc-gauges">
          <div><div className="hc-g-num">{q.eqrSelesai}/{q.eqrWajib}</div><div className="hc-g-lbl">EQR Selesai</div><Progress value={q.eqrWajib ? q.eqrSelesai / q.eqrWajib * 100 : 0} color="var(--purple)" /></div>
          <div><div className="hc-g-num" style={{ color: q.sig ? 'var(--red)' : 'var(--green)' }}>{q.sig}</div><div className="hc-g-lbl">Risiko Signifikan</div><Progress value={Math.min(100, q.sig * 20)} color="var(--red)" /></div>
          <div><div className="hc-g-num" style={{ color: q.openNotes ? 'var(--amber)' : 'var(--green)' }}>{q.openNotes}</div><div className="hc-g-lbl">Catatan Reviu Terbuka</div><Progress value={Math.min(100, q.openNotes * 20)} color="var(--amber)" /></div>
        </div>
        {!!q.gaps.length && (
          <div className="hc-findings">
            {q.gaps.map((g, i) => (
              <div key={i} className="row ac gap8" style={{ padding: '4px 0' }}>
                <span className="tiny" style={{ flex: 1 }}>{g.k}</span>
                <Badge kind="amber">{g.eng}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}

/* ---- Portlet: Keuangan Firma (tren + aging) ---- */
function HcKeuangan({ fin, nav, grip }: { fin: Finance; nav: NavFn; grip: DragGrip }) {
  const agingRow = (rows: AgingBar[]) => rows.map((r, i) => (
    <div key={i} className="row ac gap8" style={{ padding: '3px 0' }}>
      <span className="tiny muted" style={{ width: 78, flex: '0 0 78px' }}>{r.b}</span>
      <div style={{ flex: 1 }}><Progress value={r.pct} color={r.hot ? 'var(--red)' : 'var(--amber)'} /></div>
      <span className="num tiny" style={{ width: 62, flex: '0 0 62px' }}>{hcRpJt(r.v)}</span>
    </div>
  ));
  return (
    <Panel noBody className="hc-portlet">
      <div className="panel-h"><span className="hc-grip" {...grip}><I.grip size={14} /></span><h3>Keuangan Firma</h3><span className="sub">WIP {hcRpM(fin.wip)} · Realisasi {fin.realisasi}%</span><div style={{ flex: 1 }} /><Btn sm variant="ghost" onClick={() => nav('firmfinance', { from: 'home' })}><I.arrowRight size={12} /></Btn></div>
      <div className="panel-body">
        <div className="hc-g-lbl" style={{ marginBottom: 4 }}>Tren Pendapatan Diakui</div>
        <Spark data={fin.trend} width={520} height={44} />
        <div className="hc-fin-cols">
          <div><div className="hc-g-lbl" style={{ marginBottom: 6 }}>WIP Aging</div>{agingRow(fin.wipAging)}</div>
          <div><div className="hc-g-lbl" style={{ marginBottom: 6 }}>Piutang Aging</div>{agingRow(fin.arAging)}</div>
        </div>
      </div>
    </Panel>
  );
}

/* ---- Portlet: Kinerja & Kapasitas Tim ---- */
function HcTim({ tim, nav, grip }: { tim: Team; nav: NavFn; grip: DragGrip }) {
  return (
    <Panel noBody className="hc-portlet">
      <div className="panel-h"><span className="hc-grip" {...grip}><I.grip size={14} /></span><h3>Kinerja & Kapasitas Tim</h3><span className="sub">{tim.headcount} personel</span><div style={{ flex: 1 }} /><Btn sm variant="ghost" onClick={() => nav('capacity', { from: 'home' })}><I.arrowRight size={12} /></Btn></div>
      <div className="panel-body">
        {tim.grades.map((g) => (
          <div key={g.grade} className="row ac gap8" style={{ padding: '3px 0' }}>
            <span className="tiny" style={{ width: 96, flex: '0 0 96px', fontWeight: 600 }}>{g.grade}</span>
            <div style={{ flex: 1 }}><Progress value={Math.min(100, g.fill)} color={g.fill > 100 ? 'var(--red)' : g.fill > 90 ? 'var(--amber)' : 'var(--green)'} /></div>
            <span className="num tiny" style={{ width: 40, flex: '0 0 40px', color: g.fill > 100 ? 'var(--red)' : undefined }}>{g.fill}%</span>
          </div>
        ))}
        {!!tim.overload.length && (
          <div className="hc-findings">
            {tim.overload.map((o, i) => (
              <div key={i} className="hc-row" style={{ padding: '5px 0', borderBottom: 0 }}>
                <span className="hc-sev" style={{ background: 'var(--red)' }} />
                <div className="hc-main"><span className="tiny">{o.name} — <b>{o.util}%</b></span><span className="muted tiny">{o.role}</span></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}

function HomeCockpit() {
  const nav = useNav() as unknown as NavFn;
  const firm = useFirm() as unknown as FirmCtx;
  const audit = useAudit() as unknown as AuditCtx;

  const engagements: EngRow[] = firm.engagements || [];
  const clientById = firm.clientById || (() => undefined);
  const setActive = firm.setActiveEngagementId;
  const activeId = firm.activeEngagementId;

  const team: TeamMember[] = audit.team || [];
  const risks: RiskRow[] = audit.risks || [];
  const reviewNotes: ReviewNote[] = audit.reviewNotes || [];

  /* Kapasitas — derivasi SSOT bersama Firm Dashboard & Capacity Planning. */
  const [schedule] = useAmsPersist('schedule', () => AMS.SCHEDULE);
  const [plan] = useAmsPersist('capacityPlan.v1', () => seedForwardPlan(AMS.CAPACITY as CapacitySeed));

  /* WIP — SSOT tunggal (useFirmWip): sama dgn WIP Valuation/Realisasi & Firm
     Finance, dengan overlay jam-aktual T&B. Bukan lagi FIRMFIN.wip({engagements})
     tanpa overlay yang menghasilkan angka basi berbeda. */
  const W = useFirmWip().wip as unknown as WipResult;

  /* ---- perhitungan turunan (SSOT) ---- */
  const model: CockpitModel = useMemoHC(() => {
    const BI = (AMS.BI_DATA as unknown as Bi) || ({} as Bi);
    const AR = (AMS.BI_AR_AGING as unknown as ArBucket[]) || [];
    const EQR = (AMS.EQR_REVIEWS as unknown as EqrRow[]) || [];

    const active = engagements.filter((e) => e.status !== 'Completed' && e.phase !== 'Arsip');
    const ar60 = AR.slice(2).reduce((s, a) => s + a.amount, 0);
    const feeFy = Number(BI.fyRevenue) || 0;
    const feePrev = Number(BI.prevYearRevenue) || 0;
    const feeYoYNum = feePrev ? Math.round((feeFy - feePrev) / feePrev * 100) : 0;
    const utilAvg = team.length ? Math.round(team.reduce((s, t) => s + (t.util || 0), 0) / team.length) : 0;

    const k: Kpi = {
      aktif: active.length,
      total: engagements.length,
      fee: feeFy,
      feeYoY: (feeYoYNum >= 0 ? '+' : '') + feeYoYNum + '% YoY',
      feeYoYDir: feeYoYNum > 0 ? 'up' : feeYoYNum < 0 ? 'down' : '',
      feeSeries: BI.monthlyRev || [1],
      wip: W.unbilledTotal,
      ar60,
      realisasi: Math.round((W.avgRealization || 0) * 100),
      util: utilAvg,
    };

    /* WIP recoverable per-engagement (untuk kolom Fee portofolio) */
    const recovById: Record<string, number> = {};
    (W.registerAll || []).forEach((r) => { recovById[r.id] = r.recoverable; });

    const portRows: PortRow[] = active
      .slice()
      .sort((a, b) => (hcDaysTo(a.deadline) - hcDaysTo(b.deadline)))
      .map((e) => {
        const cli = clientById(e.clientId) || {};
        const days = hcDaysTo(e.deadline);
        const burn = e.budgetHrs ? e.actualHrs / e.budgetHrs : 0;
        const noteOpen = reviewNotes.some((n) => n.status !== 'resolved' && n.status !== 'closed');
        let flag: string | null = null;
        if (e.risk === 'High') flag = 'Risiko tinggi';
        else if (burn > 0.9 && e.progress < 90) flag = 'Burn >90% belum selesai';
        else if (e.phase === 'Finalisasi' && e.progress >= 90 && days <= 14) flag = 'Menunggu finalisasi';
        else if (noteOpen && e.id === activeId) flag = 'Catatan reviu terbuka';
        const recov = recovById[e.id];
        return {
          id: e.id,
          clientName: cli.name || e.clientId,
          partner: e.partner,
          phase: e.phase,
          progress: e.progress,
          dueLabel: (e.deadline || '').slice(0, 10) + (Number.isFinite(days) ? (days < 0 ? ` · lewat ${-days}h` : ` · ${days}h`) : ''),
          dueKind: days <= 14 ? 'red' : days <= 30 ? 'amber' : 'gray',
          feeLabel: recov ? hcRpJt(recov) : '—',
          flag,
          open: () => { if (setActive) setActive(e.id); nav('cockpit', { from: 'home' }); },
        };
      });

    /* Antrian persetujuan: EQR aktif (firm-wide) + catatan reviu terbuka */
    const persetujuan: ApprovalItem[] = [];
    EQR.filter((e) => e.status !== 'Selesai').forEach((e) => {
      persetujuan.push({
        key: 'eqr-' + e.id,
        tipe: 'EQR — ' + (e.stage || 'tinjau'),
        ref: (e.client || e.eng) + ' · ' + e.id,
        prio: String(e.type || '').includes('Wajib') ? 'High' : 'Medium',
        prioKind: String(e.type || '').includes('Wajib') ? 'red' : 'amber',
        route: 'eqr',
      });
    });
    reviewNotes.filter((n) => n.status === 'open' && (n.type === 'review' || n.type === 'eqr')).slice(0, 4).forEach((n) => {
      persetujuan.push({
        key: 'rn-' + n.id,
        tipe: 'Catatan reviu — ' + (n.moduleLabel || n.module),
        ref: (n.ref || n.id) + (n.to ? ' · ' + n.to : ''),
        prio: n.priority === 'high' ? 'High' : 'Medium',
        prioKind: n.priority === 'high' ? 'red' : 'amber',
        route: n.module || 'reviewnotes',
      });
    });

    /* Butuh perhatian: perikatan risiko tinggi (firm-wide) + risiko signifikan/fraud */
    const perhatian: PerhatianItem[] = [];
    active.filter((e) => e.risk === 'High').forEach((e) => {
      const cli = clientById(e.clientId) || {};
      perhatian.push({ key: 'eng-' + e.id, text: 'Perikatan risiko tinggi — ' + (cli.name || e.clientId), sub: e.id + ' · ' + e.phase, kind: 'red', level: 'High', route: 'cockpit' });
    });
    risks.filter((r) => r.inherent === 'Significant').slice(0, 4).forEach((r) => {
      perhatian.push({ key: 'risk-' + r.id, text: r.desc, sub: r.area + (r.fraud ? ' · Fraud (SA 240)' : '') + ' · ' + (r.owner || ''), kind: r.fraud ? 'red' : 'amber', level: r.fraud ? 'Fraud' : 'Significant', route: 'risk' });
    });

    /* Kualitas */
    const q: Quality = {
      eqrWajib: EQR.filter((e) => String(e.type || '').includes('Wajib')).length,
      eqrSelesai: EQR.filter((e) => String(e.type || '').includes('Wajib') && e.status === 'Selesai').length,
      sig: risks.filter((r) => (Number(r.likelihood) * Number(r.impact)) >= 12).length,
      openNotes: reviewNotes.filter((n) => n.status !== 'resolved' && n.status !== 'closed').length,
      gaps: EQR.filter((e) => e.status !== 'Selesai' && Array.isArray(e.checklist))
        .flatMap((e) => (e.checklist || []).filter((c) => !c.ok).slice(0, 1).map((c) => ({ k: c.k, eng: e.eng || e.id })))
        .slice(0, 3),
    };

    /* Keuangan — aging dari FIRMFIN (WIP) & BI_AR_AGING (piutang) */
    const wipAgingRaw = W.aging || [];
    const wipMax = Math.max(1, ...wipAgingRaw.map((a) => a.value));
    const arMax = Math.max(1, ...AR.map((a) => a.amount));
    const fin: Finance = {
      wip: W.unbilledTotal,
      realisasi: Math.round((W.avgRealization || 0) * 100),
      trend: BI.monthlyRev || [1],
      wipAging: wipAgingRaw.map((a, i) => ({ b: a.bucket, v: a.value, pct: a.value / wipMax * 100, hot: i >= 2 })),
      arAging: AR.map((a, i) => ({ b: a.bucket, v: a.amount, pct: a.amount / arMax * 100, hot: i >= 2 })),
    };

    /* Tim — kapasitas per-grade (fill%) + overload */
    const grades: GradeFill[] = capacityModel(schedule, plan, { nowLabel: (AMS.CAPACITY as CapacitySeed).weeks[0] }).grades
      .map((g) => {
        const supply = g.supply.reduce((s: number, v: number) => s + v, 0);
        const demand = g.demand.reduce((s: number, v: number) => s + v, 0);
        return { grade: g.grade, fill: supply > 0 ? Math.round(demand / supply * 100) : 0 };
      });
    const tim: Team = {
      headcount: team.length,
      grades,
      overload: team.filter((t) => (t.util || 0) > 90).map((t) => ({ name: t.name, role: t.role, util: t.util })),
    };

    return { k, portRows, persetujuan, perhatian, q, fin, tim };
  }, [W, engagements, team, risks, reviewNotes, schedule, plan, clientById, setActive, activeId, nav]);

  /* ---- drag-reorder portlet (handler di DOM: gagang span + sel div) ---- */
  const [order, setOrder]: [string[], (v: string[]) => void] = useStateHC(hcLoadOrder);
  const [dragId, setDragId]: [string | null, (v: string | null) => void] = useStateHC(null);
  useEffectHC(() => { try { localStorage.setItem(HC_ORDER_KEY, JSON.stringify(order)); } catch (e) { /* ignore */ } }, [order]);

  const rootFor = (id: string): DragRoot => ({
    onDragOver: (e) => { e.preventDefault(); },
    onDrop: (e) => {
      e.preventDefault();
      if (!dragId || dragId === id) { setDragId(null); return; }
      const o = order.slice();
      o.splice(o.indexOf(id), 0, o.splice(o.indexOf(dragId), 1)[0]);
      setOrder(o); setDragId(null);
    },
    style: dragId === id ? { opacity: 0.45 } : undefined,
  });
  const gripFor = (id: string): DragGrip => ({
    draggable: true,
    onDragStart: () => setDragId(id),
    onDragEnd: () => setDragId(null),
    style: { cursor: 'grab' },
  });

  const renderWidget = (id: string, grip: DragGrip) => {
    if (id === 'portofolio') return <HcPortofolio rows={model.portRows} nav={nav} grip={grip} />;
    if (id === 'persetujuan') return <HcPersetujuan items={model.persetujuan} nav={nav} grip={grip} />;
    if (id === 'perhatian') return <HcPerhatian items={model.perhatian} nav={nav} grip={grip} />;
    if (id === 'kualitas') return <HcKualitas q={model.q} nav={nav} grip={grip} />;
    if (id === 'keuangan') return <HcKeuangan fin={model.fin} nav={nav} grip={grip} />;
    return <HcTim tim={model.tim} nav={nav} grip={grip} />;
  };

  return (
    <div>
      <HcKpiStrip k={model.k} />
      <div className="hc-grid">
        {order.map((id) => {
          const el = renderWidget(id, gripFor(id));
          if (!el) return null;
          return <div key={id} className={'hc-cell' + (HC_WIDE.has(id) ? ' wide' : '')} {...rootFor(id)}>{el}</div>;
        })}
      </div>
      <div className="tiny muted" style={{ textAlign: 'center', marginTop: 10 }}>Seret gagang (<I.grip size={11} />) di header portlet untuk menyusun ulang — urutan tersimpan.</div>
    </div>
  );
}

Object.assign(window, { HomeCockpit });

export { HomeCockpit };
