/* [codemod] ESM imports */
import React from 'react';
import { amsDiagnostics, DIAG_SEV } from './diagnostics';
import { useAudit, useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { Badge, Btn, Panel } from './ui.jsx';

/* ============================================================
   NeoSuite AMS — Tax Audit Diagnostic · UI (P4 Fase 1)
   Penyajian temuan dari mesin DETERMINISTIK `amsDiagnostics` (bukan LLM).
   <DiagnosticPanel area> — embeddable per-modul (filter drillView/modul);
   tanpa `area` → seluruh temuan (view agregat). Mengimpor `diagnostics`
   memuat window.AMS_DIAG ke bundle.
   ============================================================ */
const { useMemo: useMemoDG } = React;

/* hook bersama: jalankan mesin atas data live, filter per-area bila diberi */
function useDiagnostics(area) {
  const audit = useAudit();
  return useMemoDG(() => {
    let all = [];
    try { all = amsDiagnostics({ aje: audit.aje }); } catch (e) { all = []; }
    if (!area) return all;
    return all.filter(f => f.drillView === area || (f.modules || []).includes(area));
  }, [audit.aje, area]);
}

function diagSevCount(findings) {
  const c = { high: 0, med: 0, low: 0 };
  findings.forEach(f => { if (c[f.sev] != null) c[f.sev]++; });
  return c;
}

function DiagFindingCard({ f, nav }) {
  const tone = (DIAG_SEV[f.sev] || DIAG_SEV.low).tone;
  return (
    <div className="panel" style={{ padding: '11px 13px', borderLeft: `3px solid var(--${tone})` }}>
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
      {f.drillView && (
        <div className="row" style={{ marginTop: 8 }}>
          <Btn sm onClick={() => nav(f.drillView, { from: 'diagnostic' })}><I.arrowRight size={12} /> Buka modul</Btn>
        </div>
      )}
    </div>
  );
}

/* Panel embeddable. `area` = id host (filter); kosong = agregat. */
function DiagnosticPanel({ area, title }) {
  const nav = useNav();
  const findings = useDiagnostics(area);
  const c = diagSevCount(findings);
  return (
    <Panel title={title || 'Diagnostik Forensik & Pajak'}
      sub={`Berbasis aturan & statistik (SA 240 · PSAK 46) — bukan LLM · ${findings.length} temuan`}>
      <div className="row ac gap6" style={{ marginBottom: findings.length ? 10 : 0, flexWrap: 'wrap' }}>
        <Badge kind="red">{c.high} Tinggi</Badge>
        <Badge kind="amber">{c.med} Sedang</Badge>
        <Badge kind="blue">{c.low} Rendah</Badge>
      </div>
      {findings.length === 0
        ? <div className="tiny muted" style={{ padding: '4px 0' }}><I.check size={12} /> Tidak ada temuan diagnostik{area ? ' untuk area ini' : ''}.</div>
        : <div style={{ display: 'grid', gap: 9 }}>{findings.map(f => <DiagFindingCard key={f.id} f={f} nav={nav} />)}</div>}
    </Panel>
  );
}

Object.assign(window, { DiagnosticPanel });

export { DiagnosticPanel, useDiagnostics, diagSevCount };
