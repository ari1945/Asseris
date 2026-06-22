/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAudit, useFirm, useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Avatar, Badge, Btn, Panel, Progress, Stat, Tabs } from './ui';

/* ============================================================
   Asseris — Strategy Memo (SA 300), Working Papers index, Governance
   ============================================================ */
const { useState: useStateMS, useMemo: useMemoMS } = React;

/* Audit-approach options used across the area-plan table */
const SM_APPROACHES = [
  { id: 'sub',  short: 'Substantif',          label: 'Prosedur substantif',                 color: 'var(--blue)' },
  { id: 'ctrl', short: 'Pengendalian + Sub.', label: 'Andalkan pengendalian + substantif',  color: 'var(--teal)' },
  { id: 'ext',  short: 'Substantif Diperluas', label: 'Substantif diperluas (risiko sig.)',  color: 'var(--red)' },
];
const smDefaultApproach = (r) => r.inherent === 'Significant' ? 'ext' : (r.likelihood * r.impact >= 9 ? 'ctrl' : 'sub');

/* ---------------- Strategy Memo (SA 300 workspace) ---------------- */
function StrategyMemo() {
  const { fmt } = AMS;
  const { activeClient, activeEngagement } = useFirm();
  const { risks } = useAudit();
  const nav = useNav();
  const om = activeEngagement.materiality, pm = Math.round(om * 0.75), ctt = Math.round(om * 0.05);
  const sigRisks = risks.filter(r => r.inherent === 'Significant');
  const fraudRisks = risks.filter(r => r.fraud);

  const [tab, setTab] = window.useAmsPersist('strategyTab.' + activeEngagement.id, 'strategi');

  const right = (
    <div className="row gap8 ac">
      <Badge kind="blue">SA 300</Badge>
      <Btn sm onClick={() => window.amsPrintDoc()}><I.download size={13} /> Export PDF</Btn>
      <Btn sm variant="primary"><I.check size={14} /> Setujui Strategi</Btn>
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
        {tab === 'pendekatan' && <SmApproach {...{ fmt, risks, pm, activeEngagement, nav }} />}
        {tab === 'jadwal' && <SmSchedule {...{ fmt, activeEngagement }} />}
        {tab === 'memo' && <SmMemo {...{ fmt, activeClient, activeEngagement, sigRisks, om, pm, ctt }} />}
      </div></div>
    </>
  );
}

/* ---- Tab 1 · Overall strategy (SA 300 — scope · timing · direction) ---- */
function SmOverview({ fmt, activeClient, activeEngagement, risks, sigRisks, fraudRisks, om, pm, ctt, nav, setTab }) {
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
              <div style={{ width: 36, height: 36, borderRadius: 9, background: 'color-mix(in srgb,' + p.tone + ' 13%, transparent)', color: p.tone, display: 'grid', placeItems: 'center', flex: '0 0 36px' }}>{React.createElement(I[p.icon], { size: 19 })}</div>
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
            {sigRisks.map((r, i) => (
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
              <Btn sm variant="primary" style={{ width: '100%', marginTop: 9 }}><I.sparkle size={13} /> Perbarui dengan AI</Btn>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ---- Tab 2 · Audit approach by area (editable response per RoMM) ---- */
function SmApproach({ fmt, risks, pm, activeEngagement, nav }) {
  const [over, setOver] = window.useAmsPersist('strategyApproach.' + activeEngagement.id, {});
  const planFor = (r) => over[r.id] || smDefaultApproach(r);
  const counts = SM_APPROACHES.map(a => ({ ...a, n: risks.filter(r => planFor(r) === a.id).length }));
  const relyControls = risks.filter(r => planFor(r) === 'ctrl').length;

  return (
    <div className="grid" style={{ gap: 12 }}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {counts.map(c => (
          <Panel key={c.id}><div style={{ padding: '11px 14px' }}><Stat value={c.n} label={c.short} accent={c.color} /></div></Panel>
        ))}
        <div style={{ display: 'none' }} />
      </div>

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
            </tr>
          </thead>
          <tbody>
            {risks.map(r => {
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
                      {SM_APPROACHES.map(a => (
                        <button key={a.id} className={plan === a.id ? 'on' : ''} onClick={() => setOver(s => ({ ...s, [r.id]: a.id }))} title={a.label}>{a.short}</button>
                      ))}
                    </div>
                  </td>
                  <td style={{ whiteSpace: 'normal', maxWidth: 240, fontSize: 11.5, color: 'var(--ink-2)' }}>{r.response}</td>
                  <td><span className="row ac gap6"><Avatar name={r.owner} size={22} /><span className="tiny">{r.owner}</span></span></td>
                  <td><span className="chip mono">{r.wp}</span></td>
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
              Performance Materiality <b className="mono">Rp {fmt(pm / 1e6, 0)} jt</b> menjadi ambang penentuan luas sampel & pemilihan item kunci. {AMS.WTB.filter(r => Math.abs(r.adj) > pm).length} akun WTB melampaui PM dan diperlakukan sebagai area fokus.
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---- Tab 3 · Schedule, team & resources ---- */
function SmSchedule({ fmt, activeEngagement }) {
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
                  <span style={{ width: 24, height: 24, borderRadius: 7, background: 'color-mix(in srgb,' + c + ' 15%, transparent)', color: c, display: 'grid', placeItems: 'center', flex: '0 0 24px' }}>{React.createElement(I[p.icon], { size: 13 })}</span>
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
                  <span className="row ac gap8" style={{ minWidth: 0 }}><span style={{ color: 'var(--blue)' }}>{React.createElement(I[e.icon], { size: 15 })}</span><span style={{ fontSize: 12 }}>{e.t}</span></span>
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
            {team.map(m => (
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
function SmMemo({ fmt, activeClient, activeEngagement, sigRisks, om, pm, ctt }) {
  const [editing, setEditing] = useStateMS(false);
  const [edits, setEdits] = useStateMS({});

  const Sec = ({ n, title, id, children }) => {
    const saved = edits[id];
    return (
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: '#0c2430', marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid #e0e4e8' }}>{n}. {title}</div>
        <div
          contentEditable={editing}
          suppressContentEditableWarning
          onBlur={editing ? (e => setEdits(s => ({ ...s, [id]: e.currentTarget.innerHTML }))) : undefined}
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
        <Btn sm onClick={() => setEditing(e => !e)} variant={editing ? 'primary' : ''}>{editing ? <><I.check size={13} /> Selesai Edit</> : <><I.doc size={13} /> Edit Teks</>}</Btn>
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
              {sigRisks.map(r => <li key={r.id} style={{ marginBottom: 4 }}><b>{r.area}</b> — {r.desc}{r.fraud ? ' (risiko kecurangan, SA 240)' : ''}.</li>)}
            </ul>
          </Sec>
          <Sec n="5" id="s5" title="Pendekatan & Strategi Audit">
            Pendekatan audit menggabungkan pengujian pengendalian atas siklus signifikan dengan prosedur substantif. Untuk area risiko signifikan, dilakukan prosedur substantif yang diperluas termasuk pengujian rinci, konfirmasi pihak ketiga, dan pengujian estimasi. Sampling menggunakan metode Monetary Unit Sampling (SA 530).
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
