/* ============================================================
   WedgeApp — Wedge MVP (F3: jalankan mesin atas data IMPOR)
   ------------------------------------------------------------
   Alur: unggah TB+GL (atau muat contoh) → parse (template D3) →
   gerbang control-total → buildDiagCtx → amsDiagnostics → temuan ter-SA.
   Sepenuhnya LOKAL/OFFLINE; tak ada contexts/shell/seam server.
   Idiom proyek (tanpa @types/react): hook tanpa type-arg, props :any.
   ============================================================ */
import React from 'react';
import { amsDiagnostics, DIAG_SEV } from '../diagnostics';
import { parseImportWorkbook, controlTotals } from './import_parse';
import { buildDiagCtx } from './build_ctx';
import { buildSampleWorkbook } from './sample_workbook';
import { JET_FLAG_LABELS } from './derive_flags';

const { useState: useStateW, useMemo: useMemoW, useCallback: useCallbackW } = React;

const TONE: any = {
  high: { bg: 'var(--red-bg, #fde8e8)', fg: 'var(--red, #c0392b)' },
  med: { bg: 'var(--amber-bg, #fdf3e0)', fg: 'var(--amber, #b9770e)' },
  low: { bg: 'var(--blue-bg, #e8f0fd)', fg: 'var(--blue, #2a63d6)' },
};
const card: any = { background: '#fff', border: '1px solid var(--line, #e3e7ee)', borderRadius: 10 };
const rpJt = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');

function SevBadge({ sev }: any) {
  const t = TONE[sev];
  return (
    <span style={{ background: t.bg, color: t.fg, fontWeight: 700, fontSize: 11, padding: '2px 8px', borderRadius: 6, letterSpacing: 0.3, whiteSpace: 'nowrap' }}>
      {(DIAG_SEV as any)[sev].label.toUpperCase()}
    </span>
  );
}

function FindingCard({ f }: any) {
  return (
    <div style={{ ...card, padding: '14px 16px', marginBottom: 10 }}>
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

function GateBanner({ ct }: any) {
  const ok = ct.ok;
  return (
    <div style={{ ...card, padding: '12px 16px', marginBottom: 16, borderLeft: `4px solid ${ok ? 'var(--green, #1e8e5a)' : 'var(--amber, #b9770e)'}` }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: ok ? 'var(--green, #1e8e5a)' : 'var(--amber, #b9770e)', marginBottom: 4 }}>
        {ok ? '✓ Gerbang control-total LULUS' : '⚠ Gerbang control-total PERLU PERHATIAN'}
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-2, #4b5563)', lineHeight: 1.6 }}>
        Neraca saldo {ct.tbBalanced ? 'seimbang' : 'TIDAK seimbang'} (Σ saldo = {rpJt(ct.tbUnadjSum)}; toleransi {rpJt(ct.tbTolerance)}) ·
        {' '}{ct.glCount} baris GL · {ct.glUnparsedDates} tanggal tak terbaca.
      </div>
    </div>
  );
}

export function WedgeApp() {
  const [findings, setFindings] = useStateW([]);
  const [report, setReport] = useStateW(null);
  const [status, setStatus] = useStateW('idle');   // idle | loading | done | error
  const [errMsg, setErrMsg] = useStateW('');

  const runImport = useCallbackW((data: any) => {
    setStatus('loading'); setErrMsg('');
    Promise.resolve()
      .then(() => parseImportWorkbook(data))
      .then((parsed: any) => {
        const ct = controlTotals(parsed);
        const built = buildDiagCtx(parsed);
        const all = amsDiagnostics(built.ctx);
        setFindings(all);
        setReport({ ct, warnings: parsed.warnings, flagTally: built.flagTally, journalCount: built.journalCount, tbCount: parsed.tb.length });
        setStatus('done');
      })
      .catch((e: any) => { console.error('[wedge] impor gagal', e); setErrMsg(String(e && e.message || e)); setStatus('error'); });
  }, []);

  const onFile = useCallbackW((e: any) => {
    const f = e.target.files && e.target.files[0];
    if (f) f.arrayBuffer().then(runImport);
  }, [runImport]);

  const loadSample = useCallbackW(() => {
    setStatus('loading');
    buildSampleWorkbook().then(runImport).catch((e: any) => { setErrMsg(String(e)); setStatus('error'); });
  }, [runImport]);

  const counts = useMemoW(() => {
    const c: any = { high: 0, med: 0, low: 0 };
    findings.forEach((f: any) => { if (c[f.sev] != null) c[f.sev]++; });
    return c;
  }, [findings]);

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '32px 24px', color: 'var(--navy, #16233a)' }}>
      <header style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue, #2a63d6)', letterSpacing: 1, textTransform: 'uppercase' }}>Asseris · Wedge MVP</div>
        <h1 style={{ fontSize: 24, margin: '4px 0 6px' }}>Diagnostik &amp; Analitik Audit</h1>
        <p style={{ fontSize: 13, color: 'var(--ink-2, #6b7280)', margin: 0, lineHeight: 1.5 }}>
          JET (SA 240) · Benford · Analitik/book-tax (SA 520) — deterministik, lokal, offline.
        </p>
      </header>

      <div style={{ ...card, padding: '16px 18px', marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Impor Trial Balance + General Ledger</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="file" accept=".xlsx,.xls" onChange={onFile}
            style={{ fontSize: 13 }} aria-label="Unggah workbook TB+GL" />
          <button onClick={loadSample} style={{ background: 'var(--blue, #2a63d6)', color: '#fff', border: 0, borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Muat data contoh
          </button>
          {status === 'loading' && <span style={{ fontSize: 12, color: 'var(--ink-2, #6b7280)' }}>Memproses…</span>}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-2, #9aa3b2)', marginTop: 8 }}>
          Template: workbook .xlsx dengan sheet <strong>TB</strong> (kode·nama·saldo), <strong>GL</strong> (id·tanggal·jam·user·debit·kredit·nilai·deskripsi), opsional <strong>FISKAL</strong>.
        </div>
      </div>

      {status === 'error' && (
        <div style={{ ...card, padding: 16, marginBottom: 16, borderLeft: '4px solid var(--red, #c0392b)', color: 'var(--red, #c0392b)', fontSize: 13 }}>
          Gagal memproses berkas: {errMsg}
        </div>
      )}

      {report && (
        <>
          <GateBanner ct={report.ct} />
          {report.warnings && report.warnings.length > 0 && (
            <div style={{ ...card, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--amber, #b9770e)' }}>
              {report.warnings.length} peringatan parsing: {report.warnings.slice(0, 3).join(' · ')}{report.warnings.length > 3 ? '…' : ''}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            {['high', 'med', 'low'].map((sev: any) => (
              <div key={sev} style={{ ...card, flex: 1, padding: '12px 14px' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: TONE[sev].fg }}>{counts[sev]}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-2, #6b7280)' }}>{(DIAG_SEV as any)[sev].label}</div>
              </div>
            ))}
          </div>

          {report.flagTally && Object.keys(report.flagTally).length > 0 && (
            <div style={{ ...card, padding: '12px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Distribusi flag risiko JET ({report.journalCount} jurnal)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {Object.keys(report.flagTally).map((k: any) => (
                  <span key={k} style={{ fontSize: 11, background: 'var(--surface-2, #f0f3f8)', borderRadius: 6, padding: '3px 8px', color: 'var(--ink-2, #4b5563)' }}>
                    {(JET_FLAG_LABELS as any)[k] || k}: <strong>{report.flagTally[k]}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}

          <h2 style={{ fontSize: 16, margin: '4px 0 12px' }}>{findings.length} temuan ter-peringkat</h2>
          {findings.length === 0
            ? <div style={{ ...card, padding: 24, textAlign: 'center', color: 'var(--ink-2, #6b7280)' }}>Tidak ada temuan diagnostik dari data ini.</div>
            : findings.map((f: any) => <FindingCard key={f.id} f={f} />)}
        </>
      )}

      {!report && status !== 'loading' && (
        <div style={{ ...card, padding: 28, textAlign: 'center', color: 'var(--ink-2, #6b7280)', fontSize: 13 }}>
          Unggah workbook TB+GL atau klik <strong>Muat data contoh</strong> untuk menjalankan diagnostik.
        </div>
      )}
    </div>
  );
}
