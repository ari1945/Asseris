/* [codemod] ESM imports */
import React from 'react';
import { amsDiagnostics, DIAG_SEV } from './diagnostics';
import type { DiagFinding } from './diagnostics';
import { useAudit, useAuth, useFirm, useNav } from './contexts';
import { amsCrossChecks } from './ai_insights';
import { I } from './icons';
import { Badge, Btn, Panel } from './ui';
import { AMS } from './data';
import { amsDateShortId } from './clock_ssot';
import { amsExportXlsx } from './export_xlsx';
import {
  diagDecisionAttribution, diagDecisionRecord, diagDecisionStamp, diagDecisionTrail,
} from './diagnostics_decision';
import {
  DIAG_STATE_META, detectorStatuses, detectorSummary, engagementDiagInputs,
} from './diagnostics_inputs';
import type { DiagDetectorStatus, DiagDetectorSummary } from './diagnostics_inputs';
import { diagnosticExportModel } from './diagnostics_export';
/* Tahap 8 — seed programme/konfirmasi dibaca via ESM dari data modules
   (eager), bukan window.* yang hanya terisi setelah chunk modul dimuat. */
import { PROGRAMME } from './data_programme';
import { CONFIRMATIONS } from './data_confirmations';

/* ============================================================
   Asseris — Tax Audit Diagnostic · UI (P4 Fase 1-2)
   Penyajian temuan dari mesin DETERMINISTIK `amsDiagnostics` (bukan LLM),
   digabung dengan korelasi lintas-modul `amsCrossChecks` (via extraFindings).
   <DiagnosticPanel area> — embeddable per-modul (filter drillView/modul);
   tanpa `area` → seluruh temuan (view agregat). Tiap temuan = USULAN →
   auditor "Tindak lanjuti / Abaikan + alasan"; keputusan persisten + jejak
   audit (pola sama AiInsightPanel). Mengimpor `diagnostics` memuat AMS_DIAG.
   ============================================================ */
const { useMemo: useMemoDG, useState: useStateDG, useEffect: useEffectDG } = React;

/* ============================================================
   W8 — narasi LLM (opsional) di atas temuan DETERMINISTIK, lewat proxy server.
   Kunci di server; egress di-redaksi ke teks temuan saja; di-rate-limit & diaudit.
   Degradasi anggun: proxy tak terkonfigurasi → pesan jujur, panel deterministik tetap.
   ============================================================ */
let _llmStatusPromise: any = null;
function llmStatusCached() {
  if (!_llmStatusPromise) {
    _llmStatusPromise = (window.amsLlmStatus ? window.amsLlmStatus() : Promise.resolve({ configured: false, canUse: false }))
      .catch(() => ({ configured: false, canUse: false }));
  }
  return _llmStatusPromise;
}

function useLlmNarration(findings: any) {
  const [phase, setPhase] = useStateDG('idle'); // idle | previewing | preview | loading | done | notconfigured | error
  const [text, setText] = useStateDG('');
  const [meta, setMeta] = useStateDG(null);
  const [preview, setPreview] = useStateDG(null);
  const [consented, setConsented] = useStateDG(false);
  const [status, setStatus] = useStateDG(null); // server status (configured/canUse/provider/model)
  useEffectDG(() => { let live = true; llmStatusCached().then((st: any) => { if (live) setStatus(st); }); return () => { live = false; }; }, []);
  const requestPreview = async () => {
    if (!findings.length || !window.amsLlmPreviewDiagnostics) return;
    setPhase('previewing'); setText(''); setMeta(null); setPreview(null); setConsented(false);
    try {
      const r = await window.amsLlmPreviewDiagnostics(findings);
      setPreview(r); setPhase('preview');
    } catch (e) { setPhase('error'); }
  };
  const run = async () => {
    if (!findings.length || !window.amsLlmNarrateDiagnostics || !preview || !consented) return;
    setPhase('loading'); setText(''); setMeta(null);
    try {
      const r = await window.amsLlmNarrateDiagnostics(findings, preview.consentId);
      if (!r || r.status === 'not-configured') { setPhase('notconfigured'); return; }
      setText(r.text || ''); setMeta(r); setPhase('done');
    } catch (e) { setPhase('error'); }
  };
  const reset = () => { setPhase('idle'); setText(''); setMeta(null); setPreview(null); setConsented(false); };
  return { phase, text, meta, preview, consented, setConsented, status, requestPreview, run, reset };
}

/* Blok narasi AI — hanya muncul bila peran boleh memakai LLM (status.canUse). */
function DiagNarration({ findings }: any) {
  const { phase, text, meta, preview, consented, setConsented, status, requestPreview, run, reset } = useLlmNarration(findings);
  if (!status || !status.canUse || !findings.length) return null;
  const busy = phase === 'loading' || phase === 'previewing';
  const redactions = preview && preview.redactions;
  const redactionTotal = redactions ? Object.values(redactions).reduce((sum: number, n: any) => sum + Number(n || 0), 0) : 0;
  return (
    <div className="panel" style={{ padding: '10px 12px', marginBottom: 10, background: 'var(--surface-2)', borderColor: 'var(--line-soft)' }}>
      <div className="row ac jb" style={{ gap: 8 }}>
        <div className="row ac gap6" style={{ minWidth: 0 }}>
          <span style={{ color: 'var(--blue)' }}><I.sparkle size={14} /></span>
          <span style={{ fontWeight: 700, fontSize: 12 }}>Narasi AI</span>
          <span className="tiny muted">model bahasa — bukan deterministik</span>
        </div>
        {phase === 'done' || phase === 'notconfigured' || phase === 'error' || phase === 'preview'
          ? <button className="btn sm" onClick={reset}>Tutup</button>
          : <Btn sm variant="primary" disabled={busy} onClick={requestPreview}>{busy ? <>Menyiapkan pratinjau…</> : <><I.sparkle size={12} /> Pratinjau {findings.length} temuan</>}</Btn>}
      </div>

      {phase === 'preview' && preview && (
        <div style={{ marginTop: 9 }}>
          <div className="tiny" style={{ fontWeight: 700, marginBottom: 5 }}>Pratinjau data yang akan dikirim</div>
          <pre className="tiny" style={{ whiteSpace: 'pre-wrap', maxHeight: 230, overflow: 'auto', margin: 0, padding: '9px 10px', background: 'var(--surface)', border: '1px solid var(--line-soft)', borderRadius: 7, lineHeight: 1.5 }}>{preview.preview}</pre>
          <div className="tiny muted" style={{ marginTop: 6 }}>
            {redactionTotal} bagian disamarkan: nominal {redactions.nominal}, ID jurnal {redactions.journalId}, NPWP {redactions.npwp}, nama pihak {redactions.partyName}. Tujuan: {preview.provider || 'provider belum dikonfigurasi'}{preview.model ? ' · ' + preview.model : ''}.
          </div>
          <label className="tiny row ac gap6" style={{ marginTop: 9, cursor: 'pointer' }}>
            <input type="checkbox" checked={consented} onChange={(e: any) => setConsented(e.target.checked)} />
            Saya telah meninjau data ter-redaksi ini dan menyetujui pengiriman ke provider LLM.
          </label>
          <div className="row je" style={{ marginTop: 8 }}>
            <Btn sm variant="primary" disabled={!consented || busy} onClick={run}><I.shield size={12} /> Setujui & kirim</Btn>
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div style={{ marginTop: 9 }}>
          <div className="tiny" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.55, color: 'var(--ink)' }}>{text}</div>
          <div className="tiny muted" style={{ marginTop: 8, paddingTop: 7, borderTop: '1px solid var(--line-soft)', lineHeight: 1.45 }}>
            <I.alert size={10} style={{ verticalAlign: '-1px' }} /> Dihasilkan {meta && meta.provider ? meta.provider + ' · ' + meta.model : 'model bahasa'} dari teks temuan deterministik (ter-redaksi). <b>Verifikasi sebelum dipakai di kertas kerja</b> — narasi tak menggantikan temuan/keputusan auditor.
          </div>
        </div>
      )}
      {phase === 'notconfigured' && (
        <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.45 }}>
          <I.shield size={11} style={{ verticalAlign: '-2px' }} /> Proxy LLM belum dikonfigurasi di server (<span className="mono">LLM_API_KEY</span>). Diagnostik tetap berjalan deterministik; aktifkan proxy untuk narasi (lihat <span className="mono">BUILD.md</span> W8).
        </div>
      )}
      {phase === 'error' && (
        <div className="tiny" style={{ marginTop: 8, color: 'var(--red)', lineHeight: 1.45 }}>
          <I.alert size={11} style={{ verticalAlign: '-2px' }} /> Gagal menghubungi proxy LLM (mungkin batas laju terlampaui). Coba lagi nanti — diagnostik deterministik tak terpengaruh.
        </div>
      )}
    </div>
  );
}

/* normalisasi temuan crossChecks (ai_insights) → bentuk DiagFinding.
   `ran` DIKEMBALIKAN, bukan disimpulkan dari panjang larik: korelasi yang gagal
   dijalankan dan korelasi yang berjalan tanpa temuan sama-sama menghasilkan
   larik kosong, dan D3 justru soal membedakan keduanya. */
function crossChecksAsFindings(audit: any): { findings: DiagFinding[]; ran: boolean } {
  let cc: any[] = [];
  let ran = true;
  try {
    cc = amsCrossChecks({
      aje: audit.aje, risks: audit.risks, wtb: audit.wtb, workpapers: audit.workpapers,
      programme: PROGRAMME, confirmations: CONFIRMATIONS,
    }) || [];
  } catch (e) { cc = []; ran = false; }
  return {
    ran,
    findings: cc.map(c => ({
      ...c,
      detector: 'crossChecks',
      drillView: (c.refs && c.refs[0]) || (c.modules && c.modules[0]),
    })) as DiagFinding[],
  };
}

export interface DiagnosticState {
  /** Temuan setelah penyaring area (kosongkan `area` untuk agregat). */
  findings: DiagFinding[];
  /** Keadaan detektor dihitung atas SELURUH temuan run ini, bukan yang tersaring
      area: sebuah detektor tidak berhenti berjalan karena panel host menyaringnya. */
  statuses: DiagDetectorStatus[];
  summary: DiagDetectorSummary;
}

/* hook bersama: jalankan mesin atas data PERIKATAN + crossChecks, filter per-area.

   D2 — ctx dirakit `engagementDiagInputs()` dari `useAudit().wtb`/`.aje`. Dulu
   hanya `aje` yang dikirim, sehingga populasi jurnal, figur, dan baris
   rekonsiliasi ketiganya jatuh ke bawaan ilustratif mesin: dua perikatan berbeda
   menghasilkan temuan yang IDENTIK, lalu disajikan sebagai diagnostik perikatan
   masing-masing. */
function useDiagnosticState(area?: any): DiagnosticState {
  const audit = useAudit();
  return useMemoDG(() => {
    const cc = crossChecksAsFindings(audit);
    const { ctx, availability } = engagementDiagInputs({
      wtb: audit.wtb, aje: audit.aje, extraFindings: cc.findings, crossChecksRan: cc.ran,
    });
    let all: DiagFinding[] = [];
    try { all = amsDiagnostics(ctx); } catch (e) { all = []; }
    const statuses = detectorStatuses(availability, all);
    const findings = area
      ? all.filter(f => f.drillView === area || (f.modules || []).includes(area))
      : all;
    return { findings, statuses, summary: detectorSummary(statuses) };
  }, [audit.aje, audit.risks, audit.wtb, audit.workpapers, area]);
}

/* keputusan auditor (persisten + jejak audit).

   D1 — identitas SESI dibaca langsung dari `useAuth()`, bukan lewat
   `useCurrentAuditor()` (hook itu sendiri berbunyi `auth.user.name ||
   AMS.USER.name`, jadi ia hanya memindahkan fallback seed satu lapis ke dalam)
   dan bukan dari `AMS.USER` (data seed: sama untuk siapa pun yang login).
   Tanpa identitas, keputusan TIDAK DICATAT — bukan dicatat atas nama siapa pun;
   lihat `diagnostics_decision.ts`. Stempelnya bertanggal, dari klok SSOT. */
function useDiagDecisions() {
  const audit = useAudit();
  const auth = useAuth() as { user?: { name?: string; role?: string } } | null;
  const [decisions, setDecisions] = window.useAmsPersist('diagnostics.v1', () => ({}));
  const sessionName = String((auth && auth.user && auth.user.name) || '');
  const sessionRole = String((auth && auth.user && auth.user.role) || '');
  const canDecide = !!sessionName;
  const decide = (f: any, verdict: any, reason: any) => {
    const rec = diagDecisionRecord({
      sessionName, sessionRole, when: diagDecisionStamp(), verdict, reason,
    });
    if (!rec) return false;
    setDecisions((d: any) => ({ ...d, [f.id]: rec }));
    const trail = diagDecisionTrail(f, rec);
    if (trail && audit.logActivity) audit.logActivity(trail);
    return true;
  };
  return { decisions, decide, canDecide, sessionName };
}

function diagSevCount(findings: any) {
  const c = { high: 0, med: 0, low: 0 };
  findings.forEach((f: any) => { if ((c as any)[f.sev] != null) (c as any)[f.sev]++; });
  return c;
}

/* Keadaan tiap detektor di satu baris chip. D3: sebuah detektor yang berjalan
   dan tidak menemukan apa pun adalah INFORMASI ASURANS — ia harus terlihat, dan
   harus terlihat BERBEDA dari detektor yang tak dapat berjalan sama sekali. */
function DetectorStatusStrip({ statuses }: { statuses: DiagDetectorStatus[] }) {
  return (
    <div className="row ac gap6" style={{ flexWrap: 'wrap' }}>
      {statuses.map((d) => {
        const meta = DIAG_STATE_META[d.state];
        const ket = d.state === 'found'
          ? `${d.count} temuan`
          : d.state === 'clean' ? 'bersih' : 'tidak dapat berjalan';
        return (
          <span key={d.id} className="chip tiny"
            title={`${d.label} · ${d.std} — ${meta.label}${d.reason ? '. ' + d.reason : ''}`}
            style={{ color: `var(--${meta.tone})`, opacity: d.state === 'unavailable' ? 0.85 : 1 }}>
            {d.state === 'found' ? <I.alert size={11} /> : d.state === 'clean' ? <I.check size={11} /> : <I.lock size={11} />}
            {' '}{d.label} · {ket}
          </span>
        );
      })}
    </div>
  );
}

function DiagFindingCard({ f, decision, onDecide, nav, canDecide }: any) {
  const [mode, setMode] = useStateDG(null);
  const [reason, setReason] = useStateDG('');
  const tone = ((DIAG_SEV as any)[f.sev] || DIAG_SEV.low).tone;
  return (
    <div className="panel" style={{ padding: '11px 13px', borderLeft: `3px solid var(--${tone})`, opacity: decision ? 0.78 : 1 }}>
      <div className="row ac jb" style={{ gap: 8, marginBottom: 4 }}>
        <div className="row ac gap8" style={{ minWidth: 0 }}>
          <Badge kind={tone} dot>{((DIAG_SEV as any)[f.sev] || DIAG_SEV.low).label}</Badge>
          <span style={{ fontWeight: 700, fontSize: 12 }}>{f.title}</span>
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
          <span className="muted"> oleh {decision.who}{decision.role ? ' (' + decision.role + ')' : ''} · {decision.when}</span>
          {decision.reason && <div className="muted" style={{ marginTop: 2, fontStyle: 'italic' }}>“{decision.reason}”</div>}
          {diagDecisionAttribution(decision) === 'legacy'
            ? (
              <div style={{ marginTop: 2, color: 'var(--amber)' }}>
                <I.alert size={9} /> Keputusan bentuk lama: stempelnya tanpa tanggal dan pelakunya berasal dari data
                seed — atribusi ini <b>tidak dapat diverifikasi</b>. Putuskan ulang bila hendak dijadikan bukti.
              </div>
            )
            : <div className="muted" style={{ marginTop: 2 }}><I.lock size={9} /> tercatat ke jejak audit</div>}
        </div>
      ) : (
        <div style={{ marginTop: 8 }}>
          {!canDecide ? (
            <div className="tiny" style={{ color: 'var(--amber)', lineHeight: 1.45 }}>
              <I.alert size={11} style={{ verticalAlign: '-1px' }} /> Identitas sesi tak tersedia — keputusan tidak
              dapat dicatat. Sebuah pertimbangan profesional tanpa pelaku bukan bukti; masuk kembali untuk memutuskan.
            </div>
          ) : mode !== 'dismiss' ? (
            <div className="row ac gap6" style={{ flexWrap: 'wrap' }}>
              {f.drillView && <Btn sm onClick={() => nav(f.drillView, { from: 'diagnostic' })}><I.arrowRight size={12} /> Buka modul</Btn>}
              <Btn sm variant="primary" onClick={() => onDecide(f, 'follow', '')}><I.check size={12} /> Tindak lanjuti</Btn>
              <button className="btn sm" onClick={() => setMode('dismiss')}>Abaikan</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 6 }}>
              <textarea className="input" rows={2} value={reason} onChange={(e: any) => setReason(e.target.value)}
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
function DiagnosticPanel({ area, title }: any) {
  const nav = useNav();
  const { findings, statuses } = useDiagnosticState(area);
  const { decisions, decide, canDecide, sessionName } = useDiagDecisions();
  const firm = useFirm() as { activeEngagement?: { id?: string; client?: string; name?: string } } | null;
  const [showDone, setShowDone] = useStateDG(false);
  const [ekspor, setEkspor] = useStateDG('idle');   // idle | busy | gagal
  const open = findings.filter((f: any) => !decisions[f.id]);
  const done = findings.filter((f: any) => decisions[f.id]);
  const c = diagSevCount(open);   // badge = sebaran severity temuan TERBUKA (selaras "N terbuka")
  const list = showDone ? findings : open;

  /* D5 — kertas kerja temuan + keputusan (SA 240/SA 230). Nama firma dari SSOT
     `AMS.FIRM`, bukan literal; payload MENOLAK disegel bila kosong. */
  const eng = firm && firm.activeEngagement;
  const doExport = async () => {
    setEkspor('busy');
    try {
      await amsExportXlsx(diagnosticExportModel({
        findings, decisions, detectors: statuses,
        firmName: (AMS.FIRM as { name?: string } | undefined)?.name || '',
        engagementId: (eng && eng.id) || '',
        engagementLabel: eng ? `${eng.client || eng.name || eng.id}` : '',
        preparedOn: amsDateShortId(),
        preparedBy: sessionName,
        area: area || '',
      }));
      setEkspor('idle');
    } catch (e) { setEkspor('gagal'); }
  };

  return (
    <Panel title={title || 'Diagnostik Forensik & Pajak'}
      sub={`Berbasis aturan & statistik (SA 240 · PSAK 46) — bukan LLM · ${open.length} terbuka`}>
      <div className="row ac jb" style={{ marginBottom: findings.length ? 10 : 0 }}>
        <div className="row ac gap6" style={{ flexWrap: 'wrap' }}>
          <Badge kind="red">{c.high} Tinggi</Badge>
          <Badge kind="amber">{c.med} Sedang</Badge>
          <Badge kind="blue">{c.low} Rendah</Badge>
        </div>
        <div className="row ac gap6">
          {done.length > 0 && <button className="btn sm" onClick={() => setShowDone((s: any) => !s)}>{showDone ? 'Sembunyikan diputuskan' : `Tampilkan ${done.length} diputuskan`}</button>}
          <Btn sm disabled={ekspor === 'busy'} onClick={doExport}
            title="Ekspor XLSX tersegel: temuan, severity, standar, prosedur usulan, keputusan auditor beserta pelaku & tanggalnya, dan keadaan tiap detektor">
            <I.download size={12} /> {ekspor === 'busy' ? 'Menyiapkan…' : 'Ekspor kertas kerja'}
          </Btn>
        </div>
      </div>
      {ekspor === 'gagal' && (
        <div className="tiny" style={{ color: 'var(--red)', marginBottom: 8, lineHeight: 1.45 }}>
          <I.alert size={11} style={{ verticalAlign: '-1px' }} /> Kertas kerja tidak disusun — identitas firma atau
          atribusi sebuah keputusan tidak lengkap. Kertas kerja tak disegel di atas atribusi yang tak dapat dipertanggungjawabkan.
        </div>
      )}
      <div style={{ marginBottom: 10 }}><DetectorStatusStrip statuses={statuses} /></div>
      {open.length > 0 && <DiagNarration findings={open} />}
      {findings.length === 0
        ? <div className="tiny muted" style={{ padding: '4px 0' }}><I.check size={12} /> Tidak ada temuan diagnostik{area ? ' untuk area ini' : ''}.</div>
        : list.length === 0
          ? <div className="tiny muted" style={{ padding: '4px 0' }}><I.checkCircle size={13} /> Semua temuan telah diputuskan auditor.</div>
          : <div style={{ display: 'grid', gap: 9 }}>{list.map((f: any) => <DiagFindingCard key={f.id} f={f} decision={decisions[f.id]} onDecide={decide} nav={nav} canDecide={canDecide} />)}</div>}
      <div className="tiny muted" style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--line-soft)' }}>
        <I.lock size={10} /> Temuan dihitung dari data kanonik perikatan ini · tiap keputusan tercatat atas nama
        pengguna sesi, bertanggal, untuk reviu mutu (SMM 1). Detektor yang <b>tidak dapat berjalan</b> tidak
        menghasilkan nol temuan — ia tidak menghasilkan simpulan apa pun.
      </div>
    </Panel>
  );
}

Object.assign(window, { DiagnosticPanel });

export {
  DiagnosticPanel, DetectorStatusStrip, useDiagnosticState, useDiagDecisions, diagSevCount,
};
