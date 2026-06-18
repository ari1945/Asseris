/* [codemod] ESM imports */
import React from 'react';
import { amsDiagnostics, DIAG_SEV } from './diagnostics';
import { useAudit, useNav } from './contexts.jsx';
import { amsCrossChecks } from './ai_insights.jsx';
import { I } from './icons.jsx';
import { Badge, Btn, Panel } from './ui.jsx';

/* ============================================================
   NeoSuite AMS — Tax Audit Diagnostic · UI (P4 Fase 1-2)
   Penyajian temuan dari mesin DETERMINISTIK `amsDiagnostics` (bukan LLM),
   digabung dengan korelasi lintas-modul `amsCrossChecks` (via extraFindings).
   <DiagnosticPanel area> — embeddable per-modul (filter drillView/modul);
   tanpa `area` → seluruh temuan (view agregat). Tiap temuan = USULAN →
   auditor "Tindak lanjuti / Abaikan + alasan"; keputusan persisten + jejak
   audit (pola sama AiInsightPanel). Mengimpor `diagnostics` memuat AMS_DIAG.
   ============================================================ */
const { useMemo: useMemoDG, useState: useStateDG } = React;

/* normalisasi temuan crossChecks (ai_insights) → bentuk DiagFinding */
function crossChecksAsFindings(audit) {
  let cc = [];
  try {
    cc = amsCrossChecks({
      aje: audit.aje, risks: audit.risks, wtb: audit.wtb, workpapers: audit.workpapers,
      programme: window.PROGRAMME, confirmations: window.CONFIRMATIONS,
    }) || [];
  } catch (e) { cc = []; }
  return cc.map(c => ({
    ...c,
    detector: 'crossChecks',
    drillView: (c.refs && c.refs[0]) || (c.modules && c.modules[0]),
  }));
}

/* hook bersama: jalankan mesin + crossChecks atas data live, filter per-area */
function useDiagnostics(area) {
  const audit = useAudit();
  return useMemoDG(() => {
    let all = [];
    try { all = amsDiagnostics({ aje: audit.aje, extraFindings: crossChecksAsFindings(audit) }); } catch (e) { all = []; }
    if (!area) return all;
    return all.filter(f => f.drillView === area || (f.modules || []).includes(area));
  }, [audit.aje, audit.risks, audit.wtb, audit.workpapers, area]);
}

/* keputusan auditor (persisten + jejak audit) — pola AiInsightPanel */
function useDiagDecisions() {
  const audit = useAudit();
  const [decisions, setDecisions] = window.useAmsPersist('diagnostics.v1', () => ({}));
  const USER = (window.AMS && window.AMS.USER) || { name: 'Anindya Pramesti', role: 'Audit Manager' };
  const decide = (f, verdict, reason) => {
    const when = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    setDecisions(d => ({ ...d, [f.id]: { verdict, who: USER.name, role: USER.role, when, reason: reason || '' } }));
    if (audit.logActivity) audit.logActivity({
      who: USER.name,
      what: `${verdict === 'follow' ? 'menindaklanjuti' : 'menutup (abaikan)'} temuan diagnostik — ${f.title}${reason ? ' · ' + reason : ''}`,
      mod: 'diagnostic', icon: verdict === 'follow' ? 'check' : 'flag',
    });
  };
  return { decisions, decide };
}

function diagSevCount(findings) {
  const c = { high: 0, med: 0, low: 0 };
  findings.forEach(f => { if (c[f.sev] != null) c[f.sev]++; });
  return c;
}

function DiagFindingCard({ f, decision, onDecide, nav }) {
  const [mode, setMode] = useStateDG(null);
  const [reason, setReason] = useStateDG('');
  const tone = (DIAG_SEV[f.sev] || DIAG_SEV.low).tone;
  return (
    <div className="panel" style={{ padding: '11px 13px', borderLeft: `3px solid var(--${tone})`, opacity: decision ? 0.78 : 1 }}>
      <div className="row ac jb" style={{ gap: 8, marginBottom: 4 }}>
        <div className="row ac gap8" style={{ minWidth: 0 }}>
          <Badge kind={tone} dot>{(DIAG_SEV[f.sev] || DIAG_SEV.low).label}</Badge>
          <span style={{ fontWeight: 700, fontSize: 12.5 }}>{f.title}</span>
        </div>
        <span className="tiny mono muted" style={{ flex: '0 0 auto' }}>{f.std}</span>
      </div>
      <div className="tiny" style={{ color: 'var(--ink-2)', lineHeight: 1.5, marginBottom: f.suggestedProcedure ? 6 : 0 }}>{f.detail}</div>
      {f.suggestedProcedure && (
        <div className="tiny" style={{ background: 'var(--surface-2)', borderRadius: 6, padding: '6px 9px', color: 'var(--ink-2)', lineHeight: 1.45 }}>
          <span style={{ fontWeight: 700 }}><I.flask size={11} /> Saran prosedur: </span>{f.suggestedProcedure}
        </div>
      )}

      {decision ? (
        <div className="tiny" style={{ marginTop: 8, padding: '6px 9px', borderRadius: 6, background: decision.verdict === 'follow' ? 'var(--green-bg)' : 'var(--surface-3)' }}>
          <span style={{ color: decision.verdict === 'follow' ? 'var(--green)' : 'var(--ink-3)', fontWeight: 700 }}>
            {decision.verdict === 'follow' ? <I.checkCircle size={12} /> : <I.flag size={12} />} {decision.verdict === 'follow' ? 'Ditindaklanjuti' : 'Diabaikan'}
          </span>
          <span className="muted"> oleh {decision.who} · {decision.when}</span>
          {decision.reason && <div className="muted" style={{ marginTop: 2, fontStyle: 'italic' }}>“{decision.reason}”</div>}
          <div className="muted" style={{ marginTop: 2 }}><I.lock size={9} /> tercatat ke jejak audit</div>
        </div>
      ) : (
        <div style={{ marginTop: 8 }}>
          {mode !== 'dismiss' ? (
            <div className="row ac gap6" style={{ flexWrap: 'wrap' }}>
              {f.drillView && <Btn sm onClick={() => nav(f.drillView, { from: 'diagnostic' })}><I.arrowRight size={12} /> Buka modul</Btn>}
              <Btn sm variant="primary" onClick={() => onDecide(f, 'follow', '')}><I.check size={12} /> Tindak lanjuti</Btn>
              <button className="btn sm" onClick={() => setMode('dismiss')}>Abaikan</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 6 }}>
              <textarea className="input" rows={2} value={reason} onChange={e => setReason(e.target.value)}
                placeholder="Alasan diabaikan / pertimbangan auditor (wajib dicatat)…"
                style={{ width: '100%', padding: 8, fontFamily: 'var(--ui)', lineHeight: 1.4, resize: 'vertical' }} />
              <div className="row ac gap6">
                <button className="btn sm" onClick={() => { setMode(null); setReason(''); }}>Batal</button>
                <Btn sm variant="primary" disabled={!reason.trim()} onClick={() => onDecide(f, 'dismiss', reason.trim())}><I.check size={12} /> Catat</Btn>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* Panel embeddable. `area` = id host (filter); kosong = agregat. */
function DiagnosticPanel({ area, title }) {
  const nav = useNav();
  const findings = useDiagnostics(area);
  const { decisions, decide } = useDiagDecisions();
  const [showDone, setShowDone] = useStateDG(false);
  const open = findings.filter(f => !decisions[f.id]);
  const done = findings.filter(f => decisions[f.id]);
  const c = diagSevCount(open);   // badge = sebaran severity temuan TERBUKA (selaras "N terbuka")
  const list = showDone ? findings : open;
  return (
    <Panel title={title || 'Diagnostik Forensik & Pajak'}
      sub={`Berbasis aturan & statistik (SA 240 · PSAK 46) — bukan LLM · ${open.length} terbuka`}>
      <div className="row ac jb" style={{ marginBottom: findings.length ? 10 : 0 }}>
        <div className="row ac gap6" style={{ flexWrap: 'wrap' }}>
          <Badge kind="red">{c.high} Tinggi</Badge>
          <Badge kind="amber">{c.med} Sedang</Badge>
          <Badge kind="blue">{c.low} Rendah</Badge>
        </div>
        {done.length > 0 && <button className="btn sm" onClick={() => setShowDone(s => !s)}>{showDone ? 'Sembunyikan diputuskan' : `Tampilkan ${done.length} diputuskan`}</button>}
      </div>
      {findings.length === 0
        ? <div className="tiny muted" style={{ padding: '4px 0' }}><I.check size={12} /> Tidak ada temuan diagnostik{area ? ' untuk area ini' : ''}.</div>
        : list.length === 0
          ? <div className="tiny muted" style={{ padding: '4px 0' }}><I.checkCircle size={13} /> Semua temuan telah diputuskan auditor.</div>
          : <div style={{ display: 'grid', gap: 9 }}>{list.map(f => <DiagFindingCard key={f.id} f={f} decision={decisions[f.id]} onDecide={decide} nav={nav} />)}</div>}
      <div className="tiny muted" style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--line-soft)' }}>
        <I.lock size={10} /> Temuan dihitung dari data kanonik · tiap keputusan tercatat untuk reviu mutu (ISQM 1).
      </div>
    </Panel>
  );
}

Object.assign(window, { DiagnosticPanel });

export { DiagnosticPanel, useDiagnostics, useDiagDecisions, diagSevCount };
