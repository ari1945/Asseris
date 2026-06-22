/* ============================================================
   WedgeApp — Wedge MVP (F4: tinjau & PUTUSKAN per temuan + jejak audit)
   ------------------------------------------------------------
   Alur: unggah TB+GL (atau contoh) → parse (D3) → gerbang control-total →
   buildDiagCtx → amsDiagnostics → temuan ter-SA → auditor terima/tolak
   tiap temuan (jejak audit) → persist lokal (render ulang pasca-reload).
   Sepenuhnya LOKAL/OFFLINE; tak ada contexts/shell/seam server.
   ============================================================ */
import React from 'react';
import { amsDiagnostics, DIAG_SEV } from '../diagnostics';
import { parseImportWorkbook, controlTotals } from './import_parse';
import { buildDiagCtx } from './build_ctx';
import { buildSampleWorkbook } from './sample_workbook';
import { JET_FLAG_LABELS } from './derive_flags';
import { usePersist } from './use_persist';
import { exportWpXlsx, exportWpPdf, canonicalText } from './export_wp';
import { verifySealText } from './seal';
import { VerifySealPanel } from './VerifySealPanel';

const { useState: useStateW, useMemo: useMemoW, useCallback: useCallbackW } = React;

const TONE: any = {
  high: { bg: 'var(--red-bg, #fde8e8)', fg: 'var(--red, #c0392b)' },
  med: { bg: 'var(--amber-bg, #fdf3e0)', fg: 'var(--amber, #b9770e)' },
  low: { bg: 'var(--blue-bg, #e8f0fd)', fg: 'var(--blue, #2a63d6)' },
};
const card: any = { background: '#fff', border: '1px solid var(--line, #e3e7ee)', borderRadius: 10 };
const rpJt = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const nowStamp = () => new Date().toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function SevBadge({ sev }: any) {
  const t = TONE[sev];
  return (
    <span style={{ background: t.bg, color: t.fg, fontWeight: 700, fontSize: 11, padding: '2px 8px', borderRadius: 6, letterSpacing: 0.3, whiteSpace: 'nowrap' }}>
      {(DIAG_SEV as any)[sev].label.toUpperCase()}
    </span>
  );
}

function FindingCard({ f, decision, onDecide }: any) {
  const [reason, setReason] = useStateW('');
  const decided = !!decision;
  return (
    <div style={{ ...card, padding: '14px 16px', marginBottom: 10, opacity: decided ? 0.82 : 1 }}>
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

      {decided ? (
        <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 6, fontSize: 12,
          background: decision.verdict === 'follow' ? 'var(--green-bg, #e7f6ee)' : 'var(--surface-3, #f0f2f6)',
          color: decision.verdict === 'follow' ? 'var(--green, #1e8e5a)' : 'var(--ink-3, #6b7280)' }}>
          <strong>{decision.verdict === 'follow' ? '✓ Ditindaklanjuti' : '⊘ Diabaikan'}</strong>
          {' '}· {decision.who} · {decision.when}{decision.reason ? ` · "${decision.reason}"` : ''}
          {' '}<button onClick={() => onDecide(f, null, '')} style={{ marginLeft: 6, fontSize: 11, background: 'none', border: 0, color: 'var(--blue, #2a63d6)', cursor: 'pointer', textDecoration: 'underline' }}>ubah</button>
        </div>
      ) : (
        <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input value={reason} onChange={(e: any) => setReason(e.target.value)} placeholder="Alasan / catatan (opsional)"
            style={{ flex: 1, minWidth: 180, fontSize: 12, padding: '6px 9px', border: '1px solid var(--line, #e3e7ee)', borderRadius: 6 }} />
          <button onClick={() => onDecide(f, 'follow', reason)} style={{ fontSize: 12, fontWeight: 600, background: 'var(--green, #1e8e5a)', color: '#fff', border: 0, borderRadius: 6, padding: '6px 12px', cursor: 'pointer' }}>Tindaklanjuti</button>
          <button onClick={() => onDecide(f, 'dismiss', reason)} style={{ fontSize: 12, fontWeight: 600, background: 'var(--surface-3, #eef1f5)', color: 'var(--ink-2, #4b5563)', border: '1px solid var(--line, #e3e7ee)', borderRadius: 6, padding: '6px 12px', cursor: 'pointer' }}>Abaikan</button>
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
  const [review, setReview] = usePersist('wedge.v1.review', null);   // { ts, findings, report, decisions, auditTrail }
  const [auditor, setAuditor] = usePersist('wedge.v1.auditor', 'Auditor');
  const [status, setStatus] = useStateW('idle');
  const [errMsg, setErrMsg] = useStateW('');
  const [seal, setSeal] = useStateW(null);          // { seal, verified, fmt }

  const findings: any[] = (review && review.findings) || [];
  const report: any = (review && review.report) || null;
  const decisions: any = (review && review.decisions) || {};
  const auditTrail: any[] = (review && review.auditTrail) || [];

  const runImport = useCallbackW((data: any) => {
    setStatus('loading'); setErrMsg('');
    Promise.resolve()
      .then(() => parseImportWorkbook(data))
      .then((parsed: any) => {
        const ct = controlTotals(parsed);
        const built = buildDiagCtx(parsed);
        const all = amsDiagnostics(built.ctx);
        setReview({
          ts: nowStamp(),
          findings: all,
          report: { ct, warnings: parsed.warnings, flagTally: built.flagTally, journalCount: built.journalCount, tbCount: parsed.tb.length },
          decisions: {},
          auditTrail: [{ when: nowStamp(), who: auditor, what: `Impor ${parsed.gl.length} baris GL + ${parsed.tb.length} baris TB → ${all.length} temuan` }],
        });
        setStatus('done');
      })
      .catch((e: any) => { console.error('[wedge] impor gagal', e); setErrMsg(String(e && e.message || e)); setStatus('error'); });
  }, [auditor, setReview]);

  const onFile = useCallbackW((e: any) => {
    const f = e.target.files && e.target.files[0];
    if (f) f.arrayBuffer().then(runImport);
  }, [runImport]);

  const loadSample = useCallbackW(() => {
    setStatus('loading');
    buildSampleWorkbook().then(runImport).catch((e: any) => { setErrMsg(String(e)); setStatus('error'); });
  }, [runImport]);

  const decide = useCallbackW((f: any, verdict: any, reason: any) => {
    setReview((rv: any) => {
      if (!rv) return rv;
      const decisions = { ...(rv.decisions || {}) };
      const trail = (rv.auditTrail || []).slice();
      if (verdict == null) {
        delete decisions[f.id];
        trail.push({ when: nowStamp(), who: auditor, what: `Batalkan keputusan — ${f.title}` });
      } else {
        decisions[f.id] = { verdict, reason: reason || '', who: auditor, when: nowStamp() };
        trail.push({ when: nowStamp(), who: auditor, what: `${verdict === 'follow' ? 'Tindaklanjuti' : 'Abaikan'} — ${f.title}${reason ? ' · ' + reason : ''}` });
      }
      return { ...rv, decisions, auditTrail: trail };
    });
  }, [auditor, setReview]);

  const meta = useMemoW(() => ({ firm: 'KAP — Asseris Wedge (lokal)', auditor }), [auditor]);
  const doExport = useCallbackW((fmt: any) => {
    if (!review) return;
    setSeal({ pending: true, fmt });
    const fn = fmt === 'pdf' ? exportWpPdf : exportWpXlsx;
    fn(review, meta)
      .then((s: any) => verifySealText(canonicalText(review, meta), s).then((v: any) => setSeal({ seal: s, verified: v, fmt })))
      .catch((e: any) => { console.error('[wedge] ekspor gagal', e); setSeal({ error: String(e), fmt }); });
  }, [review, meta]);

  const counts = useMemoW(() => {
    const c: any = { high: 0, med: 0, low: 0 };
    findings.forEach((f: any) => { if (c[f.sev] != null) c[f.sev]++; });
    return c;
  }, [findings]);
  const decidedCount = Object.keys(decisions).length;

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
          <input type="file" accept=".xlsx,.xls" onChange={onFile} style={{ fontSize: 13 }} aria-label="Unggah workbook TB+GL" />
          <button onClick={loadSample} style={{ background: 'var(--blue, #2a63d6)', color: '#fff', border: 0, borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Muat data contoh</button>
          {status === 'loading' && <span style={{ fontSize: 12, color: 'var(--ink-2, #6b7280)' }}>Memproses…</span>}
          <label style={{ fontSize: 12, color: 'var(--ink-2, #6b7280)', marginLeft: 'auto' }}>Auditor:&nbsp;
            <input value={auditor} onChange={(e: any) => setAuditor(e.target.value)} style={{ fontSize: 12, padding: '4px 8px', border: '1px solid var(--line, #e3e7ee)', borderRadius: 6, width: 140 }} />
          </label>
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

          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            {['high', 'med', 'low'].map((sev: any) => (
              <div key={sev} style={{ ...card, flex: 1, padding: '12px 14px' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: TONE[sev].fg }}>{counts[sev]}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-2, #6b7280)' }}>{(DIAG_SEV as any)[sev].label}</div>
              </div>
            ))}
            <div style={{ ...card, flex: 1, padding: '12px 14px' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy, #16233a)' }}>{decidedCount}/{findings.length}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-2, #6b7280)' }}>Diputuskan</div>
            </div>
          </div>

          <div style={{ ...card, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 13 }}>Ekspor kertas kerja tersegel:</strong>
            <button onClick={() => doExport('xlsx')} style={{ fontSize: 12, fontWeight: 600, background: 'var(--navy, #16233a)', color: '#fff', border: 0, borderRadius: 6, padding: '6px 12px', cursor: 'pointer' }}>Ekspor XLSX</button>
            <button onClick={() => doExport('pdf')} style={{ fontSize: 12, fontWeight: 600, background: 'var(--navy, #16233a)', color: '#fff', border: 0, borderRadius: 6, padding: '6px 12px', cursor: 'pointer' }}>Ekspor PDF</button>
            {seal && seal.pending && <span style={{ fontSize: 12, color: 'var(--ink-2, #6b7280)' }}>Menyegel…</span>}
            {seal && seal.error && <span style={{ fontSize: 12, color: 'var(--red, #c0392b)' }}>Gagal: {seal.error}</span>}
            {seal && seal.seal && (
              <span style={{ fontSize: 12, color: seal.verified ? 'var(--green, #1e8e5a)' : 'var(--amber, #b9770e)' }}>
                {seal.verified ? '✓ Tersegel & terverifikasi' : '⚠ verifikasi gagal'} · {seal.seal.alg}{seal.seal.degraded ? ' (hash-only)' : ''} · {String(seal.seal.contentHash).slice(0, 12)}…
              </span>
            )}
          </div>

          <h2 style={{ fontSize: 16, margin: '4px 0 12px' }}>{findings.length} temuan ter-peringkat · diimpor {review.ts}</h2>
          {findings.length === 0
            ? <div style={{ ...card, padding: 24, textAlign: 'center', color: 'var(--ink-2, #6b7280)' }}>Tidak ada temuan diagnostik dari data ini.</div>
            : findings.map((f: any) => <FindingCard key={f.id} f={f} decision={decisions[f.id]} onDecide={decide} />)}

          {auditTrail.length > 0 && (
            <details style={{ ...card, padding: '12px 16px', marginTop: 16 }}>
              <summary style={{ fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Jejak audit ({auditTrail.length})</summary>
              <div style={{ marginTop: 8 }}>
                {auditTrail.slice().reverse().map((a: any, i: any) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--ink-2, #4b5563)', padding: '4px 0', borderTop: i ? '1px solid var(--line, #eef1f5)' : 0 }}>
                    <span style={{ color: 'var(--ink-3, #9aa3b2)' }}>{a.when}</span> · <strong>{a.who}</strong> · {a.what}
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}

      {!report && status !== 'loading' && (
        <div style={{ ...card, padding: 28, textAlign: 'center', color: 'var(--ink-2, #6b7280)', fontSize: 13, marginBottom: 20 }}>
          Unggah workbook TB+GL atau klik <strong>Muat data contoh</strong> untuk menjalankan diagnostik.
        </div>
      )}

      <VerifySealPanel />
    </div>
  );
}
