/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAudit, useAuth, useFirm, useNav } from './contexts';
import { CAP } from './rbac';
import { I } from './icons';
import { SubBar } from './shell';
import { Avatar, Badge, Btn, Panel, Progress, Stat, Tabs } from './ui';
import { deriveWpStatus, WP_META, openCanonicalWp } from './view_wp';
import { APPROACHES, defaultApproach, reconcileRiskResponse, GAP_LABEL } from './canon_audit_plan';
import type { ApproachId, PlanRow, PlanResult, RiskInput } from './canon_audit_plan';

/* ============================================================
   Asseris — Strategy Memo (SA 300), Working Papers index, Governance
   ============================================================ */
const { useState: useStateMS, useMemo: useMemoMS } = React;

/* Pendekatan audit & default per-risiko = SSOT kanon (canon_audit_plan):
   APPROACHES + defaultApproach (dulu SM_APPROACHES/smDefaultApproach inline). */

/* Rekonsiliasi risiko→respons (SSOT canon_audit_plan.reconcileRiskResponse) dipakai
   BERSAMA oleh tab "Pendekatan per Area" & "Dokumen Memo" — narasi memo tak boleh
   menyimpang dari plan aktual. Membaca override dari persist key yang sama
   ('strategyApproach.v1'), status KK dari deriveWpStatus (SSOT). */
function smReconcile(risks: RiskInput[], over: Record<string, ApproachId>, audit: unknown, firm: unknown) {
  const planFor = (r: RiskInput) => over[r.id] || defaultApproach(r);
  const relyControls = risks.filter((r: RiskInput) => planFor(r) === 'ctrl').length;
  /* ref di luar lead schedule (mis. JE-1/RP-1) → '' (kanon perlakukan n/a, tak di-flag). */
  const wpStatusByRef: Record<string, string> = {};
  risks.forEach((r: RiskInput) => {
    const ref = (r.wp || '').trim();
    if (!ref || wpStatusByRef[ref] != null) return;
    const section = ref.split('-')[0];
    wpStatusByRef[ref] = (WP_META as Record<string, unknown>)[section]
      ? deriveWpStatus(section, audit, firm).status
      : '';
  });
  const rr: PlanResult = reconcileRiskResponse({ risks, overrides: over, wpStatusByRef });
  return { planFor, relyControls, rr, wpStatusByRef };
}

/* ---------------- Strategy Memo (SA 300 workspace) ---------------- */
function StrategyMemo() {
  const { fmt } = AMS;
  const firm = useFirm();
  const { activeClient, activeEngagement } = firm;
  const audit = useAudit();
  const { risks } = audit;
  const nav = useNav();
  const om = activeEngagement.materiality, pm = Math.round(om * 0.75), ctt = Math.round(om * 0.05);
  const sigRisks = risks.filter((r: any) => r.inherent === 'Significant');
  const fraudRisks = risks.filter((r: any) => r.fraud);

  /* engagement-scoped (AMS_PERSIST_SCOPE: 'strategyTab.v1' → engagement) — isolasi W7.5
     & RBAC WP_EDIT (bukan firm/FIRM_ADMIN). scopeId = perikatan aktif otomatis. */
  const [tab, setTab] = window.useAmsPersist('strategyTab.v1', 'strategi');

  /* Persetujuan strategi (SA 300) — reviewer sign-off Partner/Manajer (SIGNOFF_REVIEWER).
     Engagement-scoped persist; UI di-gate can() — Senior/Junior hanya melihat status. */
  const auth = useAuth();
  const canApprove = typeof auth?.can === 'function' ? auth.can(CAP.SIGNOFF_REVIEWER) : false;
  const [approved, setApproved] = window.useAmsPersist('strategyApproved.v1', null);
  const approve = () => setApproved({ by: auth.user?.name || auth.user?.initials || 'Auditor', at: new Date().toISOString() });

  const right = (
    <div className="row gap8 ac">
      <Badge kind="blue">SA 300</Badge>
      {approved && <Badge kind="green"><I.check size={12} /> Disetujui · {approved.by}</Badge>}
      <Btn sm onClick={() => window.amsPrintDoc()}><I.download size={13} /> Export PDF</Btn>
      {approved
        ? (canApprove && <Btn sm onClick={() => setApproved(null)}>Batalkan Persetujuan</Btn>)
        : <Btn sm variant="primary" disabled={!canApprove} title={canApprove ? 'Setujui strategi audit (SA 300)' : 'Perlu peran Partner/Manajer (reviewer sign-off)'} onClick={canApprove ? approve : undefined}><I.check size={14} /> Setujui Strategi</Btn>}
    </div>
  );

  return (
    <>
      <SubBar moduleId="strategy" right={right} />
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)', padding: '0 12px' }}>
        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            { id: 'strategi', label: 'Strategi Keseluruhan' },
            { id: 'pendekatan', label: 'Pendekatan per Area', count: risks.length },
            { id: 'jadwal', label: 'Jadwal & Sumber Daya' },
            { id: 'memo', label: 'Dokumen Memo' },
          ]}
        />
      </div>
      <div className="view-scroll"><div className="view-pad">
        {tab === 'strategi' && <SmOverview {...{ fmt, activeClient, activeEngagement, risks, sigRisks, fraudRisks, om, pm, ctt, nav, setTab }} />}
        {tab === 'pendekatan' && <SmApproach {...{ fmt, risks, pm, activeEngagement, nav, audit, firm }} />}
        {tab === 'jadwal' && <SmSchedule {...{ fmt, activeEngagement }} />}
        {tab === 'memo' && <SmMemo {...{ fmt, activeClient, activeEngagement, risks, sigRisks, om, pm, ctt, audit, firm }} />}
      </div></div>
    </>
  );
}

/* ---- Tab 1 · Overall strategy (SA 300 — scope · timing · direction) ---- */
function SmOverview({ fmt, activeClient, activeEngagement, risks, sigRisks, fraudRisks, om, pm, ctt, nav, setTab }: any) {
  const deadline = new Date(activeEngagement.deadline).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  const pillars = [
    { icon: 'briefcase', tone: 'var(--blue)', title: 'Karakteristik Perikatan', sub: 'Ruang lingkup',
      items: [
        `Kerangka pelaporan: PSAK (SAK Umum) · standar audit ${activeEngagement.standard}`,
        `${activeEngagement.type} atas ${activeClient?.name}${activeClient?.listed ? ' (emiten BEI)' : ''}`,
        `Industri ${activeClient?.industry.toLowerCase()} — ${activeClient?.city}`,
        'Cakupan komponen tunggal (non-grup); tanpa auditor komponen',
      ] },
    { icon: 'clock', tone: 'var(--teal)', title: 'Tujuan & Waktu Pelaporan', sub: 'Penjadwalan & komunikasi',
      items: [
        `Tenggat penerbitan opini: ${deadline}`,
        'Komunikasi TCWG: rapat perencanaan, interim, & penutupan (SA 260)',
        'Laporan ke manajemen: defisiensi pengendalian (SA 265)',
        'Pelaporan berkelanjutan ke partner & EQR sepanjang perikatan',
      ] },
    { icon: 'target', tone: 'var(--red)', title: 'Arah Audit', sub: 'Faktor pengarah upaya',
      items: [
        `${sigRisks.length} risiko signifikan — fokus prosedur substantif diperluas`,
        `${fraudRisks.length} risiko kecurangan (SA 240): pendapatan & management override`,
        'Estimasi akuntansi: ECL (PSAK 71), sewa (PSAK 73), imbalan kerja',
        'Materialitas mengarahkan luas pengujian & evaluasi salah saji (SA 450)',
      ] },
  ];

  return (
    <div className="grid" style={{ gap: 12 }}>
      {/* parameter strip */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={activeEngagement.risk} label="Risiko Engagement" accent={activeEngagement.risk === 'High' ? 'var(--red)' : activeEngagement.risk === 'Medium' ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(om / 1e9, 1) + ' M'} label="Overall Materiality" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={sigRisks.length} label="Risiko Signifikan" accent="var(--red)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={deadline.replace(/ \d{4}/, '')} label="Tenggat Opini" /></div></Panel>
      </div>

      {/* SA 300 three pillars */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 12, alignItems: 'start' }}>
        {pillars.map(p => (
          <Panel key={p.title} noBody>
            <div style={{ padding: '13px 15px', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', gap: 11 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: 'color-mix(in srgb,' + p.tone + ' 13%, transparent)', color: p.tone, display: 'grid', placeItems: 'center', flex: '0 0 36px' }}>{React.createElement((I as any)[p.icon], { size: 19 })}</div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>{p.title}</div>
                <div className="tiny upper muted" style={{ marginTop: 1 }}>{p.sub}</div>
              </div>
            </div>
            <div style={{ padding: '11px 15px 14px' }}>
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'grid', gap: 9 }}>
                {p.items.map((t, i) => (
                  <li key={i} style={{ display: 'flex', gap: 8, fontSize: 12, lineHeight: 1.5, color: 'var(--ink-2)' }}>
                    <span style={{ flex: '0 0 6px', width: 6, height: 6, borderRadius: '50%', background: p.tone, marginTop: 6 }} />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Panel>
        ))}
      </div>

      {/* significant factors + materiality + linkage */}
      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: 12, alignItems: 'start' }}>
        <Panel title="Faktor Signifikan yang Mengarahkan Upaya Tim" sub="SA 300.8 — penentuan area fokus & alokasi sumber daya">
          <div style={{ display: 'grid', gap: 0 }}>
            {sigRisks.map((r: any, i: any) => (
              <div key={r.id} className="row ac jb" style={{ padding: '10px 0', borderBottom: i < sigRisks.length - 1 ? '1px solid var(--line-soft)' : 0, gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div className="row ac gap8" style={{ marginBottom: 2 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600 }}>{r.area}</span>
                    <Badge kind="blue">{r.assertion}</Badge>
                    {r.fraud && <Badge kind="red">SA 240</Badge>}
                  </div>
                  <div className="tiny muted truncate" style={{ maxWidth: 440 }}>{r.desc}</div>
                </div>
                <Badge>{r.inherent}</Badge>
              </div>
            ))}
          </div>
          <div className="divider" />
          <div className="row gap8">
            <Btn sm onClick={() => setTab('pendekatan')}><I.layers size={14} /> Lihat pendekatan per area</Btn>
            <Btn sm onClick={() => nav('risk')}><I.shield size={14} /> Buka Risk Assessment</Btn>
          </div>
        </Panel>

        <div className="grid" style={{ gap: 12 }}>
          <Panel title="Materialitas" sub="SA 320">
            <div style={{ display: 'grid', gap: 10 }}>
              {[['Overall Materiality', om, 'var(--blue)', 100], ['Performance Materiality', pm, 'var(--blue-400)', 75], ['Clearly Trivial', ctt, 'var(--ink-4)', 5]].map(([l, v, c, w]) => (
                <div key={l}>
                  <div className="row jb ac" style={{ marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{l}</span>
                    <span className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>Rp {fmt(v / 1e6, 0)} jt</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 6, background: 'var(--surface-3)' }}><div style={{ width: Math.max(4, w) + '%', height: '100%', borderRadius: 6, background: c }} /></div>
                </div>
              ))}
            </div>
            <div className="tiny muted" style={{ marginTop: 9 }}>Benchmark: 5% laba sebelum pajak. Ditinjau ulang bila ada perubahan signifikan.</div>
            <div className="divider" />
            <Btn sm style={{ width: '100%' }} onClick={() => nav('materiality')}><I.target size={14} /> Kalkulator Materialitas</Btn>
          </Panel>

          <Panel noBody>
            <div style={{ padding: '12px 14px', background: 'var(--blue-050)', borderRadius: 'var(--radius)' }}>
              <div className="row ac gap8" style={{ marginBottom: 7 }}><span style={{ color: 'var(--blue)' }}><I.sparkle size={15} /></span><span style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>AI Co-pilot</span></div>
              <div style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-2)' }}>Susun draf strategi audit dari penilaian risiko, materialitas, dan profil klien aktif.</div>
              <Btn sm variant="primary" style={{ width: '100%', marginTop: 9 }} onClick={() => window.__amsOpenCopilot?.()}><I.sparkle size={13} /> Perbarui dengan AI</Btn>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ---- Tab 2 · Audit approach by area (editable response per RoMM) ---- */
function SmApproach({ fmt, risks, pm, activeEngagement, nav, audit, firm }: any) {
  /* engagement-scoped (AMS_PERSIST_SCOPE: 'strategyApproach.v1' → engagement) — isolasi W7.5
     & RBAC WP_EDIT (bukan firm/FIRM_ADMIN). scopeId = perikatan aktif otomatis. */
  const [over, setOver] = window.useAmsPersist('strategyApproach.v1', {});
  /* SSOT bersama dgn tab Dokumen Memo (smReconcile) — plan, rely-controls & SA 330 rollup. */
  const { planFor, relyControls, rr } = smReconcile(risks, over, audit, firm);
  const counts = APPROACHES.map(a => ({ ...a, n: risks.filter((r: any) => planFor(r) === a.id).length }));
  const planById = new Map<string, PlanRow>(rr.rows.map(row => [row.id, row]));
  const gapRows = rr.rows.filter(row => row.gaps.length > 0);

  return (
    <div className="grid" style={{ gap: 12 }}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {counts.map(c => (
          <Panel key={c.id}><div style={{ padding: '11px 14px' }}><Stat value={c.n} label={c.short} accent={c.color} /></div></Panel>
        ))}
        <div style={{ display: 'none' }} />
      </div>

      {/* SA 330 — rekonsiliasi pemetaan risiko → respons → prosedur/KK */}
      <Panel title="Pemetaan Risiko → Prosedur (SA 330)" sub="SA 300.9 · SA 330.18/.21 — kememadaian & ketertautan respons terhadap setiap RoMM">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          <div><Stat value={rr.rollup.coveragePct + '%'} label="Cakupan respons memadai" accent={rr.rollup.coveragePct === 100 ? 'var(--green)' : rr.rollup.coveragePct >= 75 ? 'var(--amber)' : 'var(--red)'} /></div>
          <div><Stat value={`${rr.rollup.significant}/${rr.rollup.total}`} label="RoMM signifikan / total" /></div>
          <div><Stat value={rr.rollup.gapRisks} label="Risiko ber-gap" accent={rr.rollup.gapRisks ? 'var(--red)' : 'var(--green)'} /></div>
          <div><Stat value={rr.rollup.byKind['under-response']} label="Respons kurang memadai" accent={rr.rollup.byKind['under-response'] ? 'var(--red)' : 'var(--ink-3)'} /></div>
        </div>
        <div className="divider" />
        {gapRows.length === 0 ? (
          <div className="row ac gap8" style={{ padding: '10px 12px', background: 'var(--green-bg, var(--surface-2))', borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--ink-2)' }}>
            <span style={{ color: 'var(--green)' }}><I.check size={16} /></span>
            Seluruh RoMM memiliki respons memadai & tertaut prosedur/kertas kerja — tak ada gap rencana (SA 330).
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 0 }}>
            {gapRows.map((row, i) => {
              const underResp = row.gaps.includes('under-response');
              return (
                <div key={row.id} className="row ac jb" style={{ padding: '10px 0', borderBottom: i < gapRows.length - 1 ? '1px solid var(--line-soft)' : 0, gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="row ac gap8" style={{ marginBottom: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600 }}>{row.area}</span>
                      <Badge kind="blue">{row.assertion}</Badge>
                      <Badge kind={row.inherent === 'Significant' ? 'red' : 'gray'}>{row.inherent}</Badge>
                      {row.fraud && <Badge kind="red">SA 240</Badge>}
                    </div>
                    <div className="row ac gap6" style={{ flexWrap: 'wrap' }}>
                      {row.gaps.map(g => <Badge key={g} kind={g === 'under-response' ? 'red' : 'amber'}>{GAP_LABEL[g]}</Badge>)}
                      {underResp && <span className="tiny muted">terencana <b>{(APPROACHES.find(a => a.id === row.plan) || { short: row.plan }).short}</b> · minimum <b>{(APPROACHES.find(a => a.id === row.minAdequate) || { short: row.minAdequate }).short}</b></span>}
                    </div>
                  </div>
                  <div className="row ac gap6" style={{ flex: '0 0 auto' }}>
                    {row.wpKnown && <Btn sm onClick={() => openCanonicalWp(nav, row.wpSection)} title={`Status KK: ${row.wpStatus}`}><I.doc size={13} /> KK {row.wpSection}</Btn>}
                    <Btn sm onClick={() => nav(row.proc || 'execution')}><I.arrowRight size={13} /> Tindak lanjut</Btn>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel title="Pendekatan Audit per Area Signifikan" sub="SA 300 · SA 330 — respons keseluruhan & respons tingkat asersi" actions={<Btn sm onClick={() => nav('execution')}><I.arrowRight size={13} /> Ke Audit Programme</Btn>}>
        <table className="dtbl">
          <thead>
            <tr>
              <th>Area / Akun</th>
              <th>Asersi</th>
              <th>Risiko Inheren</th>
              <th style={{ minWidth: 280 }}>Pendekatan Terencana</th>
              <th>Prosedur Kunci</th>
              <th>PIC</th>
              <th>WP</th>
              <th>SA 330</th>
            </tr>
          </thead>
          <tbody>
            {risks.map((r: any) => {
              const plan = planFor(r);
              return (
                <tr key={r.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.area}</div>
                    {r.fraud && <span className="tiny" style={{ color: 'var(--red)', fontWeight: 600 }}>Risiko kecurangan · SA 240</span>}
                  </td>
                  <td><Badge kind="blue">{r.assertion}</Badge></td>
                  <td><Badge>{r.inherent}</Badge></td>
                  <td>
                    <div className="seg" role="group">
                      {APPROACHES.map(a => (
                        <button key={a.id} className={plan === a.id ? 'on' : ''} onClick={() => setOver((s: any) => ({ ...s, [r.id]: a.id }))} title={a.label}>{a.short}</button>
                      ))}
                    </div>
                  </td>
                  <td style={{ whiteSpace: 'normal', maxWidth: 240, fontSize: 11.5, color: 'var(--ink-2)' }}>{r.response}</td>
                  <td><span className="row ac gap6"><Avatar name={r.owner} size={22} /><span className="tiny">{r.owner}</span></span></td>
                  <td><span className="chip mono">{r.wp}</span></td>
                  <td>{(() => { const pr = planById.get(r.id); if (!pr) return null; return pr.gaps.length === 0 ? <Badge kind="green">Memadai</Badge> : <Badge kind={pr.gaps.includes('under-response') ? 'red' : 'amber'}>{pr.gaps.length} gap</Badge>; })()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div style={{ padding: '11px 14px', background: relyControls > 0 ? 'var(--teal-bg)' : 'var(--surface-2)', borderRadius: 'var(--radius)' }}>
            <div className="row ac gap8" style={{ marginBottom: 5 }}><span style={{ color: 'var(--teal)' }}><I.sliders size={16} /></span><span style={{ fontSize: 12.5, fontWeight: 700 }}>Strategi Pengendalian</span></div>
            <div style={{ fontSize: 11.5, lineHeight: 1.55, color: 'var(--ink-2)' }}>
              {relyControls > 0
                ? `Mengandalkan pengujian pengendalian untuk ${relyControls} area. Uji efektivitas operasi (SA 330) wajib didokumentasikan sebelum mengurangi prosedur substantif.`
                : 'Pendekatan substantif penuh — tidak mengandalkan pengendalian. Sesuai untuk area dengan risiko signifikan & populasi yang dapat diuji secara substantif.'}
            </div>
          </div>
        </Panel>
        <Panel noBody>
          <div style={{ padding: '11px 14px', background: 'var(--amber-bg)', borderRadius: 'var(--radius)' }}>
            <div className="row ac gap8" style={{ marginBottom: 5 }}><span style={{ color: 'var(--amber)' }}><I.scale size={16} /></span><span style={{ fontSize: 12.5, fontWeight: 700 }}>Tautan ke Materialitas</span></div>
            <div style={{ fontSize: 11.5, lineHeight: 1.55, color: 'var(--ink-2)' }}>
              Performance Materiality <b className="mono">Rp {fmt(pm / 1e6, 0)} jt</b> menjadi ambang penentuan luas sampel & pemilihan item kunci. {AMS.WTB.filter(r => Math.abs(r.adj ?? 0) > pm).length} akun WTB melampaui PM dan diperlakukan sebagai area fokus.
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---- Tab 3 · Schedule, team & resources ---- */
function SmSchedule({ fmt, activeEngagement }: any) {
  const phaseOrder = ['Perencanaan', 'Eksekusi', 'Finalisasi', 'Arsip'];
  const curIdx = Math.max(0, phaseOrder.indexOf(activeEngagement.phase));
  const phases = [
    { label: 'Perencanaan', range: '05 Jan – 02 Feb', icon: 'target' },
    { label: 'Eksekusi (Fieldwork)', range: '03 Feb – 31 Mar', icon: 'flask' },
    { label: 'Finalisasi & Review', range: '01 – 18 Apr', icon: 'check' },
    { label: 'Pelaporan & EQR', range: '19 – 30 Apr', icon: 'report' },
  ];
  const deadline = new Date(activeEngagement.deadline).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  const milestones = [
    { t: 'Rapat tim perikatan & diskusi kecurangan (SA 315/240)', d: '28 Jan', done: true },
    { t: 'Materialitas & strategi audit disetujui partner', d: '02 Feb', done: true },
    { t: 'Walkthrough pengendalian siklus signifikan', d: '14 Feb', done: true },
    { t: 'Konfirmasi piutang — batch 2', d: '15 Mar', done: false },
    { t: 'Selesai fieldwork', d: '31 Mar', done: false },
    { t: 'Draf opini & telaah pengendali mutu (EQR)', d: '22 Apr', done: false },
    { t: 'Penerbitan laporan auditor', d: deadline.replace(/ \d{4}/, ''), done: false },
  ];
  const team: any = AMS.TEAM;
  const used = activeEngagement.actualHrs, budget = activeEngagement.budgetHrs;
  const pct = Math.round(used / budget * 100);
  const experts = [
    { t: 'Spesialis penilaian sewa (PSAK 73)', kind: 'Internal', icon: 'expert' },
    { t: 'Pakar aktuaria — imbalan kerja (SA 500)', kind: 'Eksternal', icon: 'scale' },
    { t: 'Tim audit data analytics & JE testing', kind: 'Internal', icon: 'server' },
    { t: 'Konsultan pajak — pajak tangguhan', kind: 'Internal', icon: 'receipt' },
  ];

  return (
    <div className="grid" style={{ gap: 12 }}>
      {/* phase timeline */}
      <Panel title="Lini Masa Perikatan" sub="Penjadwalan keseluruhan — SA 300">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {phases.map((p, i) => {
            const state = i < curIdx ? 'done' : i === curIdx ? 'active' : 'todo';
            const c = state === 'done' ? 'var(--green)' : state === 'active' ? 'var(--blue)' : 'var(--line-strong)';
            return (
              <div key={p.label} style={{ position: 'relative' }}>
                <div style={{ height: 4, borderRadius: 4, background: c, marginBottom: 9 }} />
                <div className="row ac gap8" style={{ marginBottom: 3 }}>
                  <span style={{ width: 24, height: 24, borderRadius: 7, background: 'color-mix(in srgb,' + c + ' 15%, transparent)', color: c, display: 'grid', placeItems: 'center', flex: '0 0 24px' }}>{React.createElement((I as any)[p.icon], { size: 13 })}</span>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{p.label}</span>
                </div>
                <div className="tiny muted mono">{p.range}</div>
                <div style={{ marginTop: 5 }}>{state === 'done' ? <Badge kind="green">Selesai</Badge> : state === 'active' ? <Badge kind="blue">Berjalan</Badge> : <Badge kind="gray">Mendatang</Badge>}</div>
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
        {/* milestones */}
        <Panel title="Milestone Kunci">
          <div style={{ display: 'grid', gap: 0 }}>
            {milestones.map((m, i) => (
              <div key={i} className="row ac jb" style={{ padding: '9px 0', borderBottom: i < milestones.length - 1 ? '1px solid var(--line-soft)' : 0, gap: 10 }}>
                <span className="row ac gap8" style={{ minWidth: 0 }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', flex: '0 0 18px', display: 'grid', placeItems: 'center', background: m.done ? 'var(--green)' : 'transparent', border: m.done ? 0 : '1.5px solid var(--line-strong)', color: '#fff' }}>{m.done && <I.check size={11} />}</span>
                  <span style={{ fontSize: 12, color: m.done ? 'var(--ink-3)' : 'var(--ink)', textDecoration: m.done ? 'line-through' : 'none' }}>{m.t}</span>
                </span>
                <span className="mono tiny muted" style={{ flex: '0 0 auto' }}>{m.d}</span>
              </div>
            ))}
          </div>
        </Panel>

        <div className="grid" style={{ gap: 12 }}>
          {/* hours budget */}
          <Panel title="Anggaran Jam (SA 300 — sifat, waktu & luas)">
            <div className="row jb ac" style={{ marginBottom: 7 }}>
              <span className="mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--navy)' }}>{fmt(used)}<span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}> / {fmt(budget)} jam</span></span>
              <Badge kind={pct > 90 ? 'red' : pct > 75 ? 'amber' : 'green'}>{pct}% terpakai</Badge>
            </div>
            <Progress value={pct} color={pct > 90 ? 'var(--red)' : pct > 75 ? 'var(--amber)' : 'var(--blue)'} />
            <div className="tiny muted" style={{ marginTop: 6 }}>Sisa anggaran <b className="mono">{fmt(budget - used)} jam</b> untuk penyelesaian fieldwork & finalisasi.</div>
          </Panel>

          {/* experts */}
          <Panel title="Penggunaan Pakar & Spesialis" sub="SA 500 · SA 620">
            <div style={{ display: 'grid', gap: 0 }}>
              {experts.map((e, i) => (
                <div key={i} className="row ac jb" style={{ padding: '8px 0', borderBottom: i < experts.length - 1 ? '1px solid var(--line-soft)' : 0, gap: 10 }}>
                  <span className="row ac gap8" style={{ minWidth: 0 }}><span style={{ color: 'var(--blue)' }}>{React.createElement((I as any)[e.icon], { size: 15 })}</span><span style={{ fontSize: 12 }}>{e.t}</span></span>
                  <Badge kind={e.kind === 'Eksternal' ? 'purple' : 'gray'}>{e.kind}</Badge>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {/* team staffing */}
      <Panel title="Tim Perikatan & Alokasi" sub={`Partner ${activeEngagement.partner.split(',')[0]} · Manajer ${activeEngagement.manager}`}>
        <table className="dtbl">
          <thead><tr><th>Anggota</th><th>Peran</th><th style={{ width: 200 }}>Utilisasi</th><th className="num">Beban</th></tr></thead>
          <tbody>
            {team.map((m: any) => (
              <tr key={m.name}>
                <td><span className="row ac gap8"><Avatar name={m.name} size={24} /><span style={{ fontWeight: 600 }}>{m.name}</span></span></td>
                <td className="muted">{m.role}</td>
                <td>
                  <div className="row ac gap8"><div style={{ flex: 1 }}><Progress value={m.util} color={m.util > 90 ? 'var(--red)' : m.util > 80 ? 'var(--amber)' : 'var(--green)'} /></div><span className="mono tiny" style={{ width: 30, textAlign: 'right' }}>{m.util}%</span></div>
                </td>
                <td className="num"><Badge kind={m.util > 90 ? 'red' : 'gray'}>{m.util > 90 ? 'Penuh' : 'Tersedia'}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

/* ---- Tab 4 · Memo document (editable, exportable to PDF) ---- */
function SmMemo({ fmt, activeClient, activeEngagement, risks, sigRisks, om, pm, ctt, audit, firm }: any) {
  const [editing, setEditing] = useStateMS(false);
  const [edits, setEdits] = useStateMS({});

  /* §5 auto-populate dari rekonsiliasi risiko→respons (SSOT bersama tab Pendekatan):
     rely-controls, cakupan respons & gap SA 330 — bukan prosa statis. */
  const [over] = window.useAmsPersist('strategyApproach.v1', {});
  const { relyControls, rr } = smReconcile(risks || [], over, audit, firm);

  const Sec = ({ n, title, id, children }: any) => {
    const saved = edits[id];
    return (
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: '#0c2430', marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid #e0e4e8' }}>{n}. {title}</div>
        <div
          contentEditable={editing}
          suppressContentEditableWarning
          onBlur={editing ? ((e: any) => setEdits((s: any) => ({ ...s, [id]: e.currentTarget.innerHTML }))) : undefined}
          style={{ fontSize: 12, lineHeight: 1.65, color: '#283b46', outline: editing ? '1px dashed #9fc0d2' : 'none', borderRadius: 4, padding: editing ? '4px 6px' : 0, background: editing ? '#f6fafc' : 'transparent', cursor: editing ? 'text' : 'default' }}
          {...(saved != null ? { dangerouslySetInnerHTML: { __html: saved } } : {})}
        >{saved != null ? undefined : children}</div>
      </div>
    );
  };

  return (
    <Panel noBody>
      <div className="row ac jb" style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)' }}>
        <span className="tiny muted">Dokumen final — diekspor ke berkas kertas kerja</span>
        <Btn sm onClick={() => setEditing((e: any) => !e)} variant={editing ? 'primary' : ''}>{editing ? <><I.check size={13} /> Selesai Edit</> : <><I.doc size={13} /> Edit Teks</>}</Btn>
      </div>
      {editing && <div style={{ background: 'var(--blue-050)', borderBottom: '1px solid var(--blue-100)', padding: '7px 14px', fontSize: 11.5, color: 'var(--blue)', fontWeight: 600 }}><I.doc size={12} style={{ verticalAlign: 'middle' }} /> Mode edit aktif — klik paragraf mana pun untuk mengubah teks. Perubahan tersimpan saat Anda klik di luar paragraf.</div>}
      <div style={{ background: '#e7eaef', padding: 18 }}>
        <div className="doc-paper" style={{ background: '#fff', maxWidth: 720, margin: '0 auto', padding: '40px 50px', boxShadow: 'var(--shadow)' }}>
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>MEMORANDUM STRATEGI AUDIT</div>
            <div className="mono" style={{ fontSize: 10.5, color: '#7a8893', marginTop: 4 }}>{activeEngagement.id} · {activeClient?.name} · {activeEngagement.fy}</div>
          </div>
          <Sec n="1" id="s1" title="Latar Belakang Perikatan">
            Kami ditunjuk untuk mengaudit laporan keuangan {activeClient?.name} untuk tahun buku {activeEngagement.fy} sesuai Standar Audit (SA) yang ditetapkan IAPI. Perikatan ini merupakan {activeEngagement.type.toLowerCase()} dengan partner penanggung jawab {activeEngagement.partner}.
          </Sec>
          <Sec n="2" id="s2" title="Pemahaman atas Entitas & Lingkungannya">
            {activeClient?.name} bergerak di bidang {activeClient?.industry.toLowerCase()}, berdomisili di {activeClient?.city}{activeClient?.listed ? ', dan merupakan emiten yang tercatat di Bursa Efek Indonesia' : ''}. Penilaian risiko inheren entitas: <b>{activeClient?.risk}</b>. Faktor risiko industri mencakup tekanan margin, fluktuasi harga bahan baku, dan kompleksitas pengakuan pendapatan.
          </Sec>
          <Sec n="3" id="s3" title="Materialitas">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, margin: '4px 0' }}>
              {[['Overall Materiality', om], ['Performance Materiality', pm], ['Clearly Trivial', ctt]].map(([l, v]) => (
                <div key={l} style={{ border: '1px solid #e0e4e8', borderRadius: 6, padding: '8px 10px' }}>
                  <div style={{ fontSize: 10, color: '#7a8893', textTransform: 'uppercase' }}>{l}</div>
                  <div className="mono" style={{ fontWeight: 700, fontSize: 13, color: '#0c2430' }}>Rp {fmt(v / 1e6, 0)} jt</div>
                </div>
              ))}
            </div>
            Benchmark: 5% laba sebelum pajak. Materialitas akan ditinjau kembali jika terdapat perubahan signifikan selama audit.
          </Sec>
          <Sec n="4" id="s4" title="Risiko Signifikan yang Teridentifikasi">
            <ul style={{ margin: '4px 0', paddingLeft: 18 }}>
              {sigRisks.map((r: any) => <li key={r.id} style={{ marginBottom: 4 }}><b>{r.area}</b> — {r.desc}{r.fraud ? ' (risiko kecurangan, SA 240)' : ''}.</li>)}
            </ul>
          </Sec>
          <Sec n="5" id="s5" title="Pendekatan & Strategi Audit">
            Pendekatan ditetapkan per area risiko (lihat tab <i>Pendekatan per Area</i>). Dari {rr.rollup.total} RoMM teridentifikasi, {relyControls === 0
              ? 'seluruh area menggunakan prosedur substantif tanpa mengandalkan pengendalian'
              : <>{relyControls} area mengandalkan pengujian efektivitas pengendalian (SA 330) dan sisanya prosedur substantif</>}; {sigRisks.length} risiko signifikan memperoleh prosedur substantif yang diperluas termasuk pengujian rinci, konfirmasi pihak ketiga (SA 505), dan pengujian estimasi. Cakupan respons memadai atas RoMM mencapai <b>{rr.rollup.coveragePct}%</b>{rr.rollup.gapRisks > 0
              ? <> — <b style={{ color: '#b4232a' }}>{rr.rollup.gapRisks} risiko masih ber-gap</b> dan memerlukan tindak lanjut respons sebelum eksekusi</>
              : ' — seluruh RoMM telah tertaut prosedur & kertas kerja'}. Sampling menggunakan metode Monetary Unit Sampling (SA 530).
          </Sec>
          <Sec n="6" id="s6" title="Tim Perikatan & Jadwal">
            Partner: {activeEngagement.partner} · Manajer: {activeEngagement.manager} · Anggaran {fmt(activeEngagement.budgetHrs)} jam. Tenggat fieldwork & pelaporan: {new Date(activeEngagement.deadline).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}.
          </Sec>
          <div style={{ marginTop: 26, paddingTop: 12, borderTop: '1px solid #e0e4e8', fontSize: 11, color: '#7a8893' }}>
            Disiapkan oleh {activeEngagement.manager} · Disetujui oleh {activeEngagement.partner.split(',')[0]} · Asseris
          </div>
        </div>
      </div>
    </Panel>
  );
}
Object.assign(window, { StrategyMemo });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { StrategyMemo };
