/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAmsPersist, useFirm, useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel, Progress, Stat } from './ui.jsx';
import { MSub } from './view_fpm_parts.jsx';
import { StepLetter, StepPMPJ } from './view_onboarding2.jsx';
import { OBAcceptance, OBAml, OBAnalitik } from './view_onboarding3.jsx';

/* ============================================================
   NeoSuite AMS — Front-office: Client & Engagement Onboarding
   Gerbang: Akseptasi & Keberlanjutan · PMPJ/APU-PPT · Engagement
   Letter · Konversi ke Perikatan. (Hub + Akseptasi + Konversi)
   ============================================================ */
const { useState: useStateOB, useMemo: useMemoOB } = React;

/* ---- gate logic shared with step panels ---- */
const OB_STAGES = [
  { id: 'acceptance', label: 'Akseptasi & Keberlanjutan', short: 'Akseptasi', color: '#5b3fa6' },
  { id: 'pmpj',       label: 'PMPJ / APU-PPT (KYC)',       short: 'PMPJ',      color: '#0a6b73' },
  { id: 'letter',     label: 'Engagement Letter',          short: 'Letter',    color: '#005085' },
  { id: 'convert',    label: 'Konversi ke Perikatan',      short: 'Konversi',  color: '#1f7a4d' },
];
function obAccScore(p) {
  const f = (p.acceptance && p.acceptance.factors) || [];
  const tw = f.reduce((s, x) => s + x.w, 0) || 1;
  return f.reduce((s, x) => s + x.s * x.w, 0) / tw;
}
function obAccVerdict(score) {
  return score >= 4 ? { k: 'green', l: 'Terima' }
    : score >= 3 ? { k: 'amber', l: 'Terima dengan Syarat' }
    : { k: 'red', l: 'Tolak' };
}
function obGates(p) {
  return {
    acceptance: p.acceptance && p.acceptance.approved ? (p.acceptance.decision === 'Tolak' ? 'reject' : 'done') : 'todo',
    pmpj: p.pmpj && p.pmpj.verified ? 'done' : 'todo',
    letter: p.letter && p.letter.status === 'signed' ? 'done' : (p.letter && p.letter.status === 'sent' ? 'progress' : 'todo'),
    convert: p.converted ? 'done' : 'todo',
  };
}
function obStage(p) {
  const g = obGates(p);
  if (p.converted) return 'convert';
  if (g.acceptance !== 'done') return 'acceptance';
  if (g.pmpj !== 'done') return 'pmpj';
  if (g.letter !== 'done') return 'letter';
  return 'convert';
}
const OB_GATE_COLOR = { done: 'var(--green)', progress: 'var(--amber)', reject: 'var(--red)', todo: 'var(--line-strong)' };

/* append a prospect to persisted onboarding list (used by Pipeline handoff) */
window.amsAddProspect = function (p) {
  try {
    const k = 'ams.v1.prospects';
    const cur = JSON.parse(localStorage.getItem(k) || 'null') || AMS.PROSPECTS;
    if (cur.some(x => x.id === p.id || x.name === p.name)) return;
    localStorage.setItem(k, JSON.stringify([p, ...cur]));
  } catch (e) {}
};

/* small key/value box (self-contained) */
function OKv({ label, v, accent }) {
  return (
    <div className="panel" style={{ padding: '7px 10px', boxShadow: 'none' }}>
      <div className="tiny muted upper" style={{ marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: accent || 'var(--ink)' }}>{v}</div>
    </div>
  );
}

/* 1–5 score picker */
function ScorePick({ value, onChange }) {
  return (
    <div className="row" style={{ gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} onClick={() => onChange(n)}
          style={{
            width: 26, height: 26, borderRadius: 6, fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
            border: '1px solid ' + (n <= value ? 'transparent' : 'var(--line-strong)'),
            background: n <= value ? (value >= 4 ? 'var(--green)' : value >= 3 ? 'var(--amber)' : 'var(--red)') : 'var(--surface-2)',
            color: n <= value ? '#fff' : 'var(--ink-4)', transition: '.12s',
          }}>{n}</button>
      ))}
    </div>
  );
}

/* ============================================================
   HUB — onboarding board (4 gates) + KPIs
   ============================================================ */
function ClientOnboarding() {
  const { fmt } = AMS;
  const [prospects, setProspects] = useAmsPersist('prospects', () => AMS.PROSPECTS);
  const [selId, setSelId] = useStateOB(null);
  const [showNew, setShowNew] = useStateOB(false);
  const [dragId, setDragId] = useStateOB(null);
  const [over, setOver] = useStateOB(null);

  const patchProspect = (id, fn) => setProspects(list => list.map(p => p.id === id ? fn(p) : p));
  const addProspect = (p) => setProspects(list => [p, ...list]);
  const sel = selId ? prospects.find(p => p.id === selId) : null;

  const live = prospects.filter(p => !p.converted);
  const kpis = [
    { v: live.length, l: 'Dalam Onboarding' },
    { v: prospects.filter(p => obStage(p) === 'acceptance' && !p.converted).length, l: 'Menunggu Akseptasi', a: 'var(--purple)' },
    { v: prospects.filter(p => p.pmpj && !p.pmpj.verified).length, l: 'PMPJ / EDD Tertunda', a: 'var(--amber)' },
    { v: prospects.filter(p => obStage(p) === 'convert' && !p.converted).length, l: 'Siap Dikonversi', a: 'var(--green)' },
  ];

  const [mtab, setMtab] = useStateOB(() => localStorage.getItem('ams.ob.tab') || 'papan');
  React.useEffect(() => { try { localStorage.setItem('ams.ob.tab', mtab); } catch (e) {} }, [mtab]);
  const obTabs = [
    { id: 'papan', label: 'Papan Onboarding', icon: 'flag' },
    { id: 'analitik', label: 'Analitik', icon: 'trend' },
    { id: 'acceptance', label: 'Akseptasi', icon: 'checkCircle' },
    { id: 'aml', label: 'PMPJ / APU-PPT', icon: 'shield' },
  ];

  return (
    <>
      <SubBar moduleId="onboarding" right={
        <div className="row gap8 ac">
          <span className="tiny muted">Penerimaan klien & perikatan — SA 220 · ISQM 1 · APU-PPT</span>
          <Btn sm variant="primary" onClick={() => setShowNew(true)}><I.plus size={14} /> Prospek Baru</Btn>
        </div>
      } />
      <MSub tabs={obTabs} active={mtab} onChange={setMtab} />
      {mtab === 'analitik' && <OBAnalitik />}
      {mtab === 'acceptance' && <OBAcceptance />}
      {mtab === 'aml' && <OBAml />}
      {mtab === 'papan' && <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          {kpis.map((k, i) => <Panel key={i}><div style={{ padding: '11px 14px' }}><Stat value={k.v} label={k.l} accent={k.a} /></div></Panel>)}
        </div>

        {/* 4-gate board */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 10, alignItems: 'start' }}>
          {OB_STAGES.map(st => {
            const col = prospects.filter(p => obStage(p) === st.id);
            return (
              <div key={st.id}
                onDragOver={(e) => { e.preventDefault(); if (over !== st.id) setOver(st.id); }}
                onDragLeave={() => setOver(o => o === st.id ? null : o)}
                onDrop={(e) => { e.preventDefault(); setDragId(null); setOver(null); }}
                style={{ borderRadius: 8, padding: 5, minHeight: 140, background: over === st.id ? 'var(--blue-050)' : 'transparent' }}>
                <div className="row ac gap6" style={{ marginBottom: 8, padding: '0 3px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: st.color }} />
                  <span style={{ fontWeight: 700, fontSize: 11.5 }}>{st.label}</span>
                  <span className="chip tiny">{col.length}</span>
                </div>
                <div className="grid" style={{ gap: 8 }}>
                  {col.map(p => {
                    const g = obGates(p);
                    const pep = p.pmpj && p.pmpj.ubo && p.pmpj.ubo.some(u => u.pep);
                    return (
                      <div key={p.id} className="panel" onClick={() => setSelId(p.id)}
                        style={{ padding: 10, cursor: 'pointer', borderTop: '3px solid ' + st.color, opacity: p.converted ? .72 : 1 }}>
                        <div className="row jb ac" style={{ marginBottom: 3 }}>
                          <span className="badge" style={{ fontSize: 9, padding: '0 6px', background: p.kind === 'Keberlanjutan' ? 'var(--blue-100)' : 'var(--purple-bg)', color: p.kind === 'Keberlanjutan' ? 'var(--blue)' : 'var(--purple)' }}>{p.kind}</span>
                          {p.converted ? <span className="badge b-green" style={{ fontSize: 9, padding: '0 6px' }}>Terkonversi</span>
                            : pep ? <span className="badge b-red" style={{ fontSize: 9, padding: '0 6px' }}>PEP</span> : null}
                        </div>
                        <div className="truncate" style={{ fontWeight: 600, fontSize: 12.5 }}>{p.name.replace('PT ', '')}</div>
                        <div className="tiny muted" style={{ marginBottom: 7 }}>{p.service}</div>
                        <div className="row jb ac">
                          <span className="mono tiny" style={{ fontWeight: 700 }}>Rp {fmt(p.fee / 1e6, 0)} jt</span>
                          <div className="row" style={{ gap: 3 }} title="Status gerbang: Akseptasi · PMPJ · Letter · Konversi">
                            {['acceptance', 'pmpj', 'letter', 'convert'].map(k => (
                              <span key={k} style={{ width: 7, height: 7, borderRadius: '50%', background: OB_GATE_COLOR[g[k]] }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {!col.length && <div className="tiny muted" style={{ padding: '14px 6px', textAlign: 'center', opacity: .6 }}>—</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div></div>}

      {sel && <OnboardingDrawer p={sel} onClose={() => setSelId(null)} onPatch={(fn) => patchProspect(sel.id, fn)} />}
      {showNew && <ProspectForm onClose={() => setShowNew(false)} onAdd={(p) => { addProspect(p); setShowNew(false); setSelId(p.id); }} />}
    </>
  );
}

/* ============================================================
   DRAWER — stepper rail + active step body
   ============================================================ */
function OnboardingDrawer({ p, onClose, onPatch }) {
  const { fmt } = AMS;
  const g = obGates(p);
  const [step, setStep] = useStateOB(() => obStage(p));

  const stepStatus = (id) => p.converted && id === 'convert' ? 'done' : g[id];
  const stageColor = (OB_STAGES.find(s => s.id === step) || {}).color;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.4)', zIndex: 90, display: 'grid', placeItems: 'center', padding: 18 }} onClick={onClose}>
      <div className="panel" style={{ width: 1080, maxWidth: '96vw', height: '92vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        {/* header */}
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 12, flex: '0 0 auto' }}>
          <span style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(255,255,255,.14)', display: 'grid', placeItems: 'center', fontSize: 15, fontWeight: 700, flex: '0 0 42px' }}>{p.name.replace('PT ', '').slice(0, 2).toUpperCase()}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row ac gap8"><span style={{ fontSize: 15, fontWeight: 700 }} className="truncate">{p.name}</span><span className="badge" style={{ fontSize: 9.5, background: 'rgba(255,255,255,.16)', color: '#fff' }}>{p.kind}</span>{p.listed && <span className="badge" style={{ fontSize: 9.5, background: 'rgba(255,255,255,.16)', color: '#fff' }}>IDX</span>}</div>
            <div className="tiny" style={{ color: '#bcd6e4' }}>{p.industry} · {p.service} · {p.standard} · {p.partner.split(',')[0]}</div>
          </div>
          <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>

        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* stepper rail */}
          <div style={{ flex: '0 0 218px', borderRight: '1px solid var(--line)', background: 'var(--surface-2)', padding: 12, overflow: 'auto' }}>
            {OB_STAGES.map((s, i) => {
              const stt = stepStatus(s.id);
              const on = step === s.id;
              const locked = s.id === 'convert' && (g.acceptance !== 'done' || g.pmpj !== 'done' || g.letter !== 'done') && !p.converted;
              return (
                <div key={s.id} onClick={() => setStep(s.id)}
                  style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 3, background: on ? 'var(--surface)' : 'transparent', boxShadow: on ? 'inset 3px 0 0 ' + s.color : 'none' }}>
                  <span style={{ flex: '0 0 24px', width: 24, height: 24, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, color: '#fff',
                    background: stt === 'done' ? 'var(--green)' : stt === 'reject' ? 'var(--red)' : stt === 'progress' ? 'var(--amber)' : on ? s.color : 'var(--line-strong)' }}>
                    {stt === 'done' ? <I.check size={13} /> : stt === 'reject' ? <I.x size={13} /> : i + 1}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: on ? 700 : 600, color: on ? 'var(--ink)' : 'var(--ink-2)' }}>{s.label}</div>
                    <div className="tiny" style={{ color: stt === 'done' ? 'var(--green)' : stt === 'reject' ? 'var(--red)' : stt === 'progress' ? 'var(--amber)' : 'var(--ink-4)' }}>
                      {locked ? 'Terkunci' : stt === 'done' ? 'Selesai' : stt === 'reject' ? 'Ditolak' : stt === 'progress' ? 'Berjalan' : on ? 'Sedang dikerjakan' : 'Menunggu'}
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="divider" />
            <div style={{ display: 'grid', gap: 7 }}>
              <OKv label="NPWP" v={<span className="mono" style={{ fontSize: 11 }}>{p.npwp}</span>} />
              <OKv label="Imbalan Tahunan" v={'Rp ' + fmt(p.fee / 1e6, 0) + ' jt'} />
              <OKv label="Tutup Buku" v={p.fyEnd} />
              <OKv label="Sumber" v={<span className="mono" style={{ fontSize: 11 }}>{p.source}</span>} />
            </div>
          </div>

          {/* body */}
          <div style={{ flex: 1, overflow: 'auto', padding: 18, minWidth: 0 }}>
            {step === 'acceptance' && <StepAcceptance p={p} onPatch={onPatch} />}
            {step === 'pmpj' && <StepPMPJ p={p} onPatch={onPatch} />}
            {step === 'letter' && <StepLetter p={p} onPatch={onPatch} />}
            {step === 'convert' && <StepConvert p={p} onPatch={onPatch} onClose={onClose} goStep={setStep} />}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   STEP 1 — Akseptasi & Keberlanjutan (SA 220 / ISQM 1)
   ============================================================ */
function StepAcceptance({ p, onPatch }) {
  const a = p.acceptance;
  const score = obAccScore(p);
  const verdict = obAccVerdict(score);
  const setFactor = (i, patch) => onPatch(pr => ({ ...pr, acceptance: { ...pr.acceptance, factors: pr.acceptance.factors.map((f, j) => j === i ? { ...f, ...patch } : f) } }));
  const setAcc = (patch) => onPatch(pr => ({ ...pr, acceptance: { ...pr.acceptance, ...patch } }));

  return (
    <div>
      <div className="row jb ac" style={{ marginBottom: 4 }}>
        <div><div style={{ fontSize: 15, fontWeight: 700 }}>Penilaian {p.kind === 'Keberlanjutan' ? 'Keberlanjutan' : 'Penerimaan'} Klien</div>
          <div className="tiny muted">Matriks faktor berbobot — SA 220 ¶12–13 · ISQM 1 ¶30. Skala 1 (buruk) – 5 (sangat baik).</div></div>
        <Badge kind="purple">{p.kind === 'Keberlanjutan' ? 'Continuance' : 'Acceptance'}</Badge>
      </div>

      {p.priorYear && (
        <div className="panel" style={{ padding: '9px 12px', background: 'var(--blue-050)', borderColor: 'transparent', margin: '10px 0' }}>
          <div className="row ac gap8"><span style={{ color: 'var(--blue)' }}><I.clock size={15} /></span><span className="tiny" style={{ fontWeight: 600 }}>Riwayat tahun lalu: {p.priorYear}</span></div>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: '1.7fr 1fr', gap: 14, alignItems: 'start', marginTop: 12 }}>
        {/* factor matrix */}
        <div style={{ display: 'grid', gap: 9 }}>
          {a.factors.map((f, i) => (
            <div key={i} className="panel" style={{ padding: 12 }}>
              <div className="row jb ac" style={{ marginBottom: 7 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>{f.k}</span>
                <span className="chip tiny" title="Bobot">{f.w}%</span>
              </div>
              <div className="row jb ac" style={{ gap: 12 }}>
                <input className="input" value={f.note} onChange={e => setFactor(i, { note: e.target.value })} placeholder="Dasar penilaian / pertimbangan…" style={{ flex: 1 }} disabled={a.approved} />
                <ScorePick value={f.s} onChange={a.approved ? () => {} : (v => setFactor(i, { s: v }))} />
              </div>
            </div>
          ))}
        </div>

        {/* verdict + sign-off */}
        <div style={{ display: 'grid', gap: 12 }}>
          <div className="panel" style={{ padding: 16, textAlign: 'center' }}>
            <div className="tiny muted upper" style={{ marginBottom: 6 }}>Skor Berbobot</div>
            <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1, color: 'var(--' + verdict.k + ')' }}>{score.toFixed(2)}</div>
            <div className="tiny muted" style={{ marginBottom: 10 }}>dari 5,00</div>
            <Progress value={score / 5 * 100} color={'var(--' + verdict.k + ')'} />
            <div style={{ marginTop: 12 }}><span className={'badge b-' + verdict.k} style={{ fontSize: 12, padding: '3px 10px' }}>Rekomendasi: {verdict.l}</span></div>
          </div>

          <div className="panel" style={{ padding: 14, display: 'grid', gap: 10 }}>
            <div className="field"><label>Keputusan Partner</label>
              <select className="select" value={a.decision || verdict.l} disabled={a.approved} onChange={e => setAcc({ decision: e.target.value })}>
                {['Terima', 'Terima dengan Syarat', 'Tolak'].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            {(a.decision === 'Terima dengan Syarat' || (!a.decision && verdict.l === 'Terima dengan Syarat')) && (
              <div className="field"><label>Safeguard / Syarat</label>
                <textarea className="input" value={a.safeguard} disabled={a.approved} onChange={e => setAcc({ safeguard: e.target.value })} placeholder="mis. tambahkan spesialis industri; EDD pemilik manfaat…" style={{ height: 58, padding: 8, lineHeight: 1.5, resize: 'vertical' }} />
              </div>
            )}
            {a.approved ? (
              <div className="panel" style={{ padding: '10px 12px', background: 'var(--green-bg)', borderColor: 'transparent' }}>
                <div className="row ac gap8" style={{ marginBottom: 3 }}><span style={{ color: 'var(--green)' }}><I.checkCircle size={15} /></span><span style={{ fontSize: 12, fontWeight: 700 }}>Disetujui — {a.decision}</span></div>
                <div className="tiny muted">{a.approver} · {a.date}</div>
                <Btn sm style={{ marginTop: 9 }} onClick={() => setAcc({ approved: false })}><I.doc size={12} /> Buka kembali untuk edit</Btn>
              </div>
            ) : (
              <Btn variant="primary" onClick={() => setAcc({ approved: true, decision: a.decision || verdict.l, approver: p.partner, date: new Date().toISOString().slice(0, 10) })}>
                <I.check size={14} /> Setujui sebagai {p.partner.split(',')[0]}
              </Btn>
            )}
            <div className="tiny muted" style={{ lineHeight: 1.5 }}>Persetujuan menandatangani gerbang penerimaan dan membuka tahap PMPJ.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   STEP 4 — Konversi ke Perikatan
   ============================================================ */
function StepConvert({ p, onPatch, onClose, goStep }) {
  const { fmt } = AMS;
  const nav = useNav();
  const { addClient, addEngagement, clientById } = useFirm();
  const g = obGates(p);

  const checks = [
    { id: 'acceptance', t: 'Akseptasi/keberlanjutan disetujui partner', ok: g.acceptance === 'done', detail: p.acceptance.approved ? p.acceptance.decision + ' · ' + p.acceptance.approver : 'Belum disetujui' },
    { id: 'pmpj', t: 'PMPJ / APU-PPT terverifikasi', ok: g.pmpj === 'done', detail: p.pmpj.verified ? 'CDD ' + p.pmpj.cddLevel + ' · risiko ' + p.pmpj.riskRating : 'Belum diverifikasi' },
    { id: 'letter', t: 'Engagement letter ditandatangani (SA 210)', ok: g.letter === 'done', detail: p.letter.status === 'signed' ? 'v' + p.letter.version + ' · ' + (p.letter.signedDate || '') : 'Belum ditandatangani' },
  ];
  const ready = checks.every(c => c.ok);

  const doConvert = () => {
    let clientId = p.clientId;
    if (!clientId) {
      clientId = 'C-' + Math.floor(Math.random() * 800 + 100);
      addClient({ id: clientId, name: p.name, industry: p.industry, tier: p.listed ? 'Tier 1' : 'Tier 2', risk: p.pmpj.riskRating === 'Tinggi' ? 'High' : p.pmpj.riskRating === 'Rendah' ? 'Low' : 'Medium', npwp: p.npwp, city: p.city, listed: !!p.listed, since: 2026, partner: p.partner, fee: p.fee, status: 'Active' });
    }
    addEngagement({ clientId, type: p.service.includes('Review') ? 'Review (SPR 2400)' : p.service.includes('Due') ? 'Agreed-Upon Procedures' : 'Audit Laporan Keuangan', standard: p.standard, partner: p.partner, manager: p.manager, deadline: p.deadline, budgetHrs: p.budgetHrs, materiality: p.materiality, risk: p.pmpj.riskRating === 'Tinggi' ? 'High' : p.pmpj.riskRating === 'Rendah' ? 'Low' : 'Medium' });
    onPatch(pr => ({ ...pr, converted: true }));
  };

  if (p.converted) {
    return (
      <div style={{ maxWidth: 560, margin: '24px auto', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--green-bg)', color: 'var(--green)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}><I.checkCircle size={34} /></div>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Perikatan Berhasil Dibuat</div>
        <p style={{ color: 'var(--ink-2)', fontSize: 13, lineHeight: 1.6, margin: '8px 0 18px' }}>
          {p.name} telah dikonversi dari prospek menjadi perikatan aktif pada fase <b>Perencanaan</b>. Seluruh gerbang front-office (akseptasi, PMPJ, engagement letter) tercatat di jejak audit.
        </p>
        <div className="row gap8" style={{ justifyContent: 'center' }}>
          <Btn variant="primary" onClick={() => { onClose(); nav('engagement'); }}><I.briefcase size={14} /> Buka Engagement Management</Btn>
          <Btn onClick={() => { onClose(); nav('crm'); }}><I.users size={14} /> Lihat di Client CRM</Btn>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Konversi Prospek menjadi Perikatan</div>
      <div className="tiny muted" style={{ marginBottom: 16 }}>Semua gerbang front-office harus terpenuhi sebelum perikatan dibuat.</div>

      <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
        {checks.map(c => (
          <div key={c.id} className="panel" onClick={() => goStep(c.id)} style={{ padding: '11px 13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 11, borderLeft: '3px solid ' + (c.ok ? 'var(--green)' : 'var(--amber)') }}>
            <span style={{ color: c.ok ? 'var(--green)' : 'var(--ink-4)' }}>{c.ok ? <I.checkCircle size={20} /> : <I.clock size={20} />}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>{c.t}</div>
              <div className="tiny muted">{c.detail}</div>
            </div>
            {!c.ok && <span className="tiny" style={{ color: 'var(--blue)', fontWeight: 600 }}>Lengkapi →</span>}
          </div>
        ))}
      </div>

      <div className="panel" style={{ padding: 14, marginBottom: 16 }}>
        <div className="tiny muted upper" style={{ marginBottom: 10 }}>Pratinjau Perikatan yang Akan Dibuat</div>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <OKv label="Klien" v={p.name.replace('PT ', '')} />
          <OKv label="Jenis & Standar" v={p.service + ' · ' + p.standard} />
          <OKv label="Partner / Manajer" v={p.partner.split(',')[0] + ' / ' + p.manager.split(' ')[0]} />
          <OKv label="Materialitas" v={'Rp ' + fmt(p.materiality / 1e6, 0) + ' jt'} />
          <OKv label="Anggaran" v={fmt(p.budgetHrs) + ' jam'} />
          <OKv label="Tenggat" v={new Date(p.deadline).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} />
        </div>
      </div>

      {ready
        ? <Btn variant="primary" style={{ width: '100%', height: 38 }} onClick={doConvert}><I.arrowRight size={15} /> Konversi ke Perikatan (fase Perencanaan)</Btn>
        : <div className="panel" style={{ padding: '11px 13px', background: 'var(--amber-bg)', borderColor: 'transparent' }}><div className="row ac gap8"><span style={{ color: 'var(--amber)' }}><I.lock size={15} /></span><span className="tiny" style={{ fontWeight: 600 }}>Lengkapi seluruh gerbang di atas untuk membuka konversi.</span></div></div>}
    </div>
  );
}

/* ============================================================
   New prospect form
   ============================================================ */
function ProspectForm({ onClose, onAdd }) {
  const blankFactors = AMS.PROSPECTS[1].acceptance.factors.map(f => ({ ...f, s: 3, note: '' }));
  const [d, setD] = useStateOB({ name: '', industry: '', city: '', kind: 'Klien Baru', service: 'Audit Laporan Keuangan', standard: 'SA', partner: 'Hartono Wijaya, CPA', manager: 'Anindya Pramesti', fee: 600000000, materiality: 1500000000, npwp: '', fyEnd: '31 Desember 2025', deadline: '2026-04-30', budgetHrs: 900, listed: false });
  const set = (k, v) => setD(s => ({ ...s, [k]: v }));
  const valid = d.name.trim() && d.industry.trim();
  const submit = () => onAdd({
    id: 'PROS-' + Date.now().toString().slice(-4), ...d, source: 'Manual',
    acceptance: { approved: false, decision: '', approver: '', date: '', safeguard: '', factors: blankFactors },
    pmpj: { verified: false, riskRating: 'Sedang', cddLevel: 'Standar', str: false, purpose: 'Perikatan ' + d.service.toLowerCase() + '.', ubo: [], screening: [] },
    letter: { version: 0, status: 'draft', scope: 'Perikatan ' + d.service + ' FY2025 sesuai ' + d.standard + '.', esign: [] },
  });
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.4)', zIndex: 92, display: 'grid', placeItems: 'center' }} onClick={onClose}>
      <div className="panel" style={{ width: 560, maxWidth: '94vw', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, borderRadius: '4px 4px 0 0' }}>
          <I.flag size={18} /><div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>Prospek Baru</div><div className="tiny" style={{ color: '#bcd6e4' }}>Mulai proses onboarding klien & perikatan</div></div>
          <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>
        <div style={{ padding: 16, display: 'grid', gap: 12 }}>
          <div className="field"><label>Nama Entitas</label><input className="input" value={d.name} onChange={e => set('name', e.target.value)} placeholder="PT Calon Klien Sejahtera" /></div>
          <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 10 }}>
            <div className="field"><label>Industri</label><input className="input" value={d.industry} onChange={e => set('industry', e.target.value)} placeholder="Manufaktur · Consumer Goods" /></div>
            <div className="field"><label>Domisili</label><input className="input" value={d.city} onChange={e => set('city', e.target.value)} placeholder="Jakarta" /></div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1.4fr 1fr', gap: 10 }}>
            <div className="field"><label>Tipe</label><select className="select" value={d.kind} onChange={e => set('kind', e.target.value)}>{['Klien Baru', 'Keberlanjutan'].map(s => <option key={s}>{s}</option>)}</select></div>
            <div className="field"><label>Jenis Jasa</label><select className="select" value={d.service} onChange={e => set('service', e.target.value)}>{['Audit Laporan Keuangan', 'Review (SPR 2400)', 'Agreed-Upon Procedures', 'Audit LK + Jasa Pajak', 'Due Diligence'].map(s => <option key={s}>{s}</option>)}</select></div>
            <div className="field"><label>Standar</label><select className="select" value={d.standard} onChange={e => set('standard', e.target.value)}>{['SA', 'SA + PSAK 71', 'SA + PSAK 73', 'SPR 2400', 'SJAH 3000'].map(s => <option key={s}>{s}</option>)}</select></div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field"><label>Partner</label><select className="select" value={d.partner} onChange={e => set('partner', e.target.value)}>{['Hartono Wijaya, CPA', 'Rudi Gunawan, CPA', 'Sari Dewanti, CPA'].map(s => <option key={s}>{s}</option>)}</select></div>
            <div className="field"><label>Manajer</label><select className="select" value={d.manager} onChange={e => set('manager', e.target.value)}>{['Anindya Pramesti', 'Bayu Saputra', 'Citra Halim'].map(s => <option key={s}>{s}</option>)}</select></div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div className="field"><label>Imbalan (Rp)</label><input className="input mono" type="number" value={d.fee} onChange={e => set('fee', +e.target.value)} style={{ textAlign: 'right' }} /></div>
            <div className="field"><label>Anggaran Jam</label><input className="input mono" type="number" value={d.budgetHrs} onChange={e => set('budgetHrs', +e.target.value)} style={{ textAlign: 'right' }} /></div>
            <div className="field"><label>Tenggat</label><input className="input" type="date" value={d.deadline} onChange={e => set('deadline', e.target.value)} /></div>
          </div>
          <div className="field"><label>NPWP</label><input className="input mono" value={d.npwp} onChange={e => set('npwp', e.target.value)} placeholder="01.234.567.8-000.000" /></div>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn onClick={onClose}>Batal</Btn>
          <Btn variant="primary" disabled={!valid} style={{ opacity: valid ? 1 : .5 }} onClick={submit}><I.check size={14} /> Mulai Onboarding</Btn>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ClientOnboarding, OnboardingDrawer, StepAcceptance, StepConvert, ProspectForm, OKv, ScorePick, obGates, obStage, obAccScore, obAccVerdict, OB_STAGES });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { ClientOnboarding, OB_STAGES, OKv, OnboardingDrawer, ProspectForm, ScorePick, StepAcceptance, StepConvert, obAccScore, obAccVerdict, obGates, obStage };
export const amsAddProspect = window.amsAddProspect;
