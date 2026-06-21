/* [codemod] ESM imports */
import React from 'react';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Panel, Stat } from './ui.jsx';
import { DiagnosticPanel, useDiagnostics } from './diagnostics_panel.jsx';

/* ============================================================
   Asseris — Tax Audit Diagnostic (view agregat · P4 Fase 1)
   Ringkasan + seluruh temuan dari mesin DETERMINISTIK amsDiagnostics.
   ============================================================ */
function TaxAuditDiagnostic() {
  const findings = useDiagnostics();           // seluruh temuan (tanpa area)
  const c = { high: 0, med: 0, low: 0 };
  findings.forEach(f => { if (c[f.sev] != null) c[f.sev]++; });
  const byDetector = {};
  findings.forEach(f => { byDetector[f.detector] = (byDetector[f.detector] || 0) + 1; });

  return (
    <>
      <SubBar moduleId="diagnostic" right={
        <span className="tiny muted">Deterministik · SA 240 · PSAK 46</span>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={findings.length} label="Total temuan" /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={c.high} label="Severity tinggi" accent="var(--red)" /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={c.med} label="Severity sedang" accent="var(--amber)" /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={Object.keys(byDetector).length} label="Detektor aktif" /></div></Panel>
          </div>

          <div className="tiny muted" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <I.alert size={12} /> Temuan dihitung dari data kanonik (aturan + statistik), bukan model bahasa. Tiap temuan adalah <strong>usulan</strong> — auditor memutuskan tindak lanjut.
          </div>

          <DiagnosticPanel title="Seluruh Temuan Diagnostik" />
        </div>
      </div>
    </>
  );
}

Object.assign(window, { TaxAuditDiagnostic });

export { TaxAuditDiagnostic };
