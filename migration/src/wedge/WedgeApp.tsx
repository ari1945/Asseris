/* ============================================================
   WedgeApp — panel tipis Wedge MVP (F1)
   ------------------------------------------------------------
   F1 hanya membuktikan mesin `amsDiagnostics` hidup OFFLINE atas
   data contoh (seed canon/forensic). BELUM ada importer TB+GL
   (F2) maupun keputusan/ekspor (F4/F5) — itu fase berikutnya.

   Sengaja TIDAK memakai contexts/shell/DiagnosticPanel lama (terkopel
   ke seam server + data engagement). Presentasi me-reuse DIAG_SEV.
   Idiom proyek (tanpa @types/react): hook tanpa type-arg, props :any.
   ============================================================ */
import React from 'react';
import { amsDiagnostics, DIAG_SEV } from '../diagnostics';

const { useMemo: useMemoW } = React;

const TONE: any = {
  high: { bg: 'var(--red-bg, #fde8e8)', fg: 'var(--red, #c0392b)' },
  med: { bg: 'var(--amber-bg, #fdf3e0)', fg: 'var(--amber, #b9770e)' },
  low: { bg: 'var(--blue-bg, #e8f0fd)', fg: 'var(--blue, #2a63d6)' },
};

function SevBadge({ sev }: any) {
  const t = TONE[sev];
  return (
    <span style={{
      background: t.bg, color: t.fg, fontWeight: 700, fontSize: 11,
      padding: '2px 8px', borderRadius: 6, letterSpacing: 0.3, whiteSpace: 'nowrap',
    }}>{(DIAG_SEV as any)[sev].label.toUpperCase()}</span>
  );
}

function FindingCard({ f }: any) {
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--line, #e3e7ee)', borderRadius: 10,
      padding: '14px 16px', marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <SevBadge sev={f.sev} />
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2, #6b7280)' }}>{f.std}</span>
        <span style={{ fontSize: 11, color: 'var(--ink-2, #9aa3b2)', marginLeft: 'auto' }}>{f.detector}</span>
      </div>
      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy, #16233a)', marginBottom: 4 }}>{f.title}</div>
      <div style={{ fontSize: 13, color: 'var(--ink-2, #4b5563)', lineHeight: 1.5 }}>{f.detail}</div>
      {f.suggestedProcedure && (
        <div style={{ fontSize: 12, color: 'var(--ink-2, #6b7280)', marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--line, #e3e7ee)' }}>
          <strong style={{ color: 'var(--navy, #16233a)' }}>Saran prosedur: </strong>{f.suggestedProcedure}
        </div>
      )}
    </div>
  );
}

export function WedgeApp() {
  // F1: jalankan tanpa ctx → mesin jatuh ke populasi seed (AMS_FORENSIC) + FIG canon.
  const findings: any[] = useMemoW(() => {
    try { return amsDiagnostics(); } catch (e) { console.error('[wedge] amsDiagnostics gagal', e); return []; }
  }, []);

  const counts: any = useMemoW(() => {
    const c: any = { high: 0, med: 0, low: 0 };
    findings.forEach((f: any) => { if (c[f.sev] != null) c[f.sev]++; });
    return c;
  }, [findings]);

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '32px 24px', color: 'var(--navy, #16233a)' }}>
      <header style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue, #2a63d6)', letterSpacing: 1, textTransform: 'uppercase' }}>Asseris · Wedge MVP</div>
        <h1 style={{ fontSize: 24, margin: '4px 0 6px' }}>Diagnostik &amp; Analitik Audit</h1>
        <p style={{ fontSize: 13, color: 'var(--ink-2, #6b7280)', margin: 0, lineHeight: 1.5 }}>
          JET (SA 240) · Benford · Analitik/book-tax (SA 520) — deterministik, lokal, offline.
          <br /><strong style={{ color: 'var(--amber, #b9770e)' }}>F1:</strong> menjalankan mesin atas data contoh (seed). Importer TB+GL menyusul (F2).
        </p>
      </header>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {['high', 'med', 'low'].map((sev: any) => (
          <div key={sev} style={{ flex: 1, background: '#fff', border: '1px solid var(--line, #e3e7ee)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: TONE[sev].fg }}>{counts[sev]}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-2, #6b7280)' }}>{DIAG_SEV[sev as 'high' | 'med' | 'low'].label}</div>
          </div>
        ))}
      </div>

      {findings.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid var(--line, #e3e7ee)', borderRadius: 10, padding: 24, textAlign: 'center', color: 'var(--ink-2, #6b7280)' }}>
          Tidak ada temuan (atau mesin gagal — cek konsol).
        </div>
      ) : (
        findings.map((f: any) => <FindingCard key={f.id} f={f} />)
      )}
    </div>
  );
}
