import React from 'react';
import { useAmsPersist, useAuth, useFirm, useInitialSelection, useNav } from './contexts';
import { CAP } from './rbac';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Panel, Progress, Stat } from './ui';
import { AMS } from './data';
import { CONT_FACTORS, INDEPENDENCE, INVOICES, PRIOR_YEAR } from './data_part1';
import { FIRMFIN } from './data_firmfin';
import { feeConcentration, feeConcentrationMap, FEE_CONCENTRATION_CONFIG } from './fee_concentration';
import { verdict, weightedScore, type AssessmentFactor } from './assessment_model';
import { amsExportPdf } from './export_pdf';
import { amsExportXlsx } from './export_xlsx';
import { exportVerifySeal } from './api';
import { buildMemoBlocks, buildMemoSheets, memoMeta, memoRefNo, memoTitle, type MemoInput } from './acceptance_continuance_memo';
import {
  continuanceFlags,
  isOpinionModified,
  type Attention,
  type ContinuanceDecision,
  type ContinuanceRow,
  type PriorYear,
  type StoredDecision,
  type TriggerSeverity,
} from './continuance_engine';

/* ============================================================
   Asseris — Keberlanjutan Klien (ISQM 1 ¶33–34 / SA 220)
   Register pengawasan KEBERLANJUTAN atas portofolio klien aktif
   (bukan penerimaan klien baru — itu modul `onboarding`). Pemicu
   diturunkan dari kanon via continuance_engine; penilaian berbobot +
   keputusan terdokumentasi (kertas kerja SA 230) persist firm-scope.
   Gate: lihat = ENGAGEMENT_VIEW_ALL, putuskan/kunci = FIRM_ADMIN.
   ============================================================ */
const { useState: useStateCN } = React;

const REF_YEAR = 2026; // siklus keberlanjutan yang dinilai (FY2025 audit → keputusan FY2026)

/* seed keputusan demo (state firm-scope; sisanya default "Tertunda") —
   kini dengan penilaian berbobot + jejak agar contoh bermakna. */
const CONTINUANCE_SEED: Record<string, StoredDecision> = {
  'C-058': {
    decision: 'Lanjut', approver: 'Rudi Gunawan, CPA', date: '2026-01-12', approved: true,
    safeguards: '',
    factors: CONT_FACTORS({ 0: { s: 4 }, 1: { s: 4, note: 'Opini WTP FY2024, tanpa temuan signifikan.' }, 2: { s: 4 }, 3: { s: 4 }, 4: { s: 5 }, 5: { s: 4 } }),
    trail: [{ action: 'Disetujui — Lanjut', by: 'Rudi Gunawan, CPA', at: '2026-01-12' }],
  },
  'C-031': {
    decision: 'Lanjut dengan Syarat', approver: 'Hartono Wijaya, CPA', date: '2026-01-20', approved: true,
    conditions: 'Perkuat prosedur aset biologis & pertimbangkan rotasi tim senior.',
    safeguards: 'Libatkan pakar penilai aset biologis; reviu mutu tambahan (EQR) atas area nilai wajar.',
    factors: CONT_FACTORS({ 0: { s: 3 }, 1: { s: 2, note: 'Opini WDP FY2024; 2 temuan signifikan (aset biologis).' }, 2: { s: 3, note: 'Tenur tim senior mendekati batas.' }, 3: { s: 3 }, 4: { s: 3 }, 5: { s: 4 } }),
    trail: [{ action: 'Disetujui — Lanjut dengan Syarat', by: 'Hartono Wijaya, CPA', at: '2026-01-20' }],
  },
};

const DECISIONS: ContinuanceDecision[] = ['Lanjut', 'Lanjut dengan Syarat', 'Tidak Dilanjutkan'];

/* Riwayat keputusan keberlanjutan siklus-siklus sebelumnya (read-only) —
   memperlihatkan kontinuitas penilaian tahunan (ISQM 1: reasesmen berulang). */
type CycleEntry = { decision: ContinuanceDecision; approver: string; date: string };
const CONTINUANCE_HISTORY: Record<string, Record<string, CycleEntry>> = {
  '2025': {
    'C-014': { decision: 'Lanjut', approver: 'Hartono Wijaya, CPA', date: '2025-01-15' },
    'C-031': { decision: 'Lanjut', approver: 'Hartono Wijaya, CPA', date: '2025-01-18' },
    'C-040': { decision: 'Lanjut dengan Syarat', approver: 'Rudi Gunawan, CPA', date: '2025-01-20' },
    'C-058': { decision: 'Lanjut', approver: 'Rudi Gunawan, CPA', date: '2025-01-12' },
    'C-063': { decision: 'Lanjut', approver: 'Rudi Gunawan, CPA', date: '2025-01-22' },
    'C-022': { decision: 'Lanjut', approver: 'Sari Dewanti, CPA', date: '2025-01-25' },
  },
  '2024': {
    'C-014': { decision: 'Lanjut', approver: 'Hartono Wijaya, CPA', date: '2024-01-16' },
    'C-031': { decision: 'Lanjut', approver: 'Hartono Wijaya, CPA', date: '2024-01-19' },
    'C-063': { decision: 'Lanjut', approver: 'Rudi Gunawan, CPA', date: '2024-01-21' },
  },
};
function cycleHistoryFor(clientId: string): { yr: string; d: CycleEntry }[] {
  return Object.keys(CONTINUANCE_HISTORY).sort().reverse()
    .map((yr) => ({ yr, d: CONTINUANCE_HISTORY[yr][clientId] }))
    .filter((x): x is { yr: string; d: CycleEntry } => !!x.d);
}

const attnKind = (a: Attention) => (a === 'Tinggi' ? 'red' : a === 'Sedang' ? 'amber' : 'green');
const decKind = (d: ContinuanceDecision) => (d === 'Lanjut' ? 'green' : d === 'Lanjut dengan Syarat' ? 'amber' : d === 'Tidak Dilanjutkan' ? 'red' : 'gray');
const sevColor = (s: TriggerSeverity) => (s === 'high' ? 'var(--red)' : s === 'med' ? 'var(--amber)' : 'var(--ink-4)');
const rp0 = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');

/* pemilih skor 1–5 (paralel ScorePick akseptasi) */
function CNScorePick({ value, onChange, disabled }: { value: number; onChange: (n: number) => void; disabled?: boolean }) {
  return (
    <div className="row" style={{ gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} disabled={disabled} onClick={() => onChange(n)}
          style={{
            width: 24, height: 24, borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: disabled ? 'default' : 'pointer',
            border: '1px solid ' + (n <= value ? 'transparent' : 'var(--line-strong)'),
            background: n <= value ? (value >= 4 ? 'var(--green)' : value >= 3 ? 'var(--amber)' : 'var(--red)') : 'var(--surface-2)',
            color: n <= value ? '#fff' : 'var(--ink-4)', opacity: disabled ? 0.7 : 1, transition: '.12s',
          }}>{n}</button>
      ))}
    </div>
  );
}

/* kartu pengalaman tahun lalu (SA 220.A24) */
function PriorYearCard({ row }: { row: ContinuanceRow }) {
  const py = row.priorYear;
  if (!py) return <div className="tiny muted">Tidak ada data tahun lalu (klien baru / belum terekam).</div>;
  const modified = isOpinionModified(py.opinion);
  return (
    <div style={{ display: 'grid', gap: 7 }}>
      <div className="row ac gap8">
        <span className="tiny muted upper" style={{ flex: '0 0 96px' }}>Opini {py.fy || ''}</span>
        <Badge kind={modified ? 'red' : 'green'}>{py.opinion || '—'}</Badge>
        {modified && <span className="tiny" style={{ color: 'var(--red)' }}>modifikasian</span>}
      </div>
      <div className="row ac gap8">
        <span className="tiny muted upper" style={{ flex: '0 0 96px' }}>Temuan signifikan</span>
        <span style={{ fontSize: 12, fontWeight: 600 }}>{py.findings ?? 0}{py.findingsNote ? ' — ' + py.findingsNote : ''}</span>
      </div>
      {!!py.uncorrected && (
        <div className="row ac gap8">
          <span className="tiny muted upper" style={{ flex: '0 0 96px' }}>Salah saji tak dikoreksi</span>
          <span className="mono" style={{ fontSize: 12 }}>{rp0(py.uncorrected)}</span>
        </div>
      )}
      {py.changed && <div className="row gap8"><span className="tiny muted upper" style={{ flex: '0 0 96px' }}>Perubahan keadaan</span><span style={{ fontSize: 12 }}>{py.changed}</span></div>}
      {py.difficulties && <div className="row gap8"><span className="tiny muted upper" style={{ flex: '0 0 96px' }}>Kesulitan/keterbatasan</span><span style={{ fontSize: 12 }}>{py.difficulties}</span></div>}
    </div>
  );
}

/* editor pengalaman tahun lalu — auditor memutakhirkan basis SA 220.A24; persist server
   (StateDoc firma). Opini memakai kode ringkas selaras isOpinionModified (pemicu keberlanjutan). */
const PY_OPINIONS = ['WTP', 'WTP-EoM', 'WDP', 'TMP', 'TW'];
function PriorYearEditor({ value, onPatch }: { value?: PriorYear; onPatch: (p: Partial<PriorYear>) => void }) {
  const v: PriorYear = value || {};
  const inp = { width: '100%', fontSize: 11.5, padding: '5px 8px', background: 'var(--surface)' } as const;
  const lbl = { marginBottom: 3 } as const;
  return (
    <div style={{ display: 'grid', gap: 7 }}>
      <div className="row gap8">
        <div style={{ flex: '1 1 50%' }}>
          <div className="tiny muted" style={lbl}>Opini</div>
          <select className="input" value={v.opinion || ''} style={inp}
            onChange={(e: { target: { value: string } }) => onPatch({ opinion: e.target.value })}>
            <option value="">—</option>
            {PY_OPINIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div style={{ flex: '1 1 50%' }}>
          <div className="tiny muted" style={lbl}>Tahun buku</div>
          <input className="input" value={v.fy || ''} placeholder="mis. FY2024" style={inp}
            onChange={(e: { target: { value: string } }) => onPatch({ fy: e.target.value })} />
        </div>
      </div>
      <div className="row gap8">
        <div style={{ flex: '0 0 96px' }}>
          <div className="tiny muted" style={lbl}>Temuan signifikan</div>
          <input className="input" type="number" min={0} value={v.findings ?? 0} style={inp}
            onChange={(e: { target: { value: string } }) => onPatch({ findings: Math.max(0, Number(e.target.value) || 0) })} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="tiny muted" style={lbl}>Catatan temuan</div>
          <input className="input" value={v.findingsNote || ''} placeholder="Ringkas temuan signifikan…" style={inp}
            onChange={(e: { target: { value: string } }) => onPatch({ findingsNote: e.target.value })} />
        </div>
      </div>
      <div>
        <div className="tiny muted" style={lbl}>Salah saji tak dikoreksi (Rp)</div>
        <input className="input" type="number" min={0} value={v.uncorrected ?? 0} style={inp}
          onChange={(e: { target: { value: string } }) => onPatch({ uncorrected: Math.max(0, Number(e.target.value) || 0) })} />
      </div>
      <div>
        <div className="tiny muted" style={lbl}>Perubahan keadaan</div>
        <input className="input" value={v.changed || ''} placeholder="Perubahan signifikan sejak tahun lalu…" style={inp}
          onChange={(e: { target: { value: string } }) => onPatch({ changed: e.target.value })} />
      </div>
      <div>
        <div className="tiny muted" style={lbl}>Kesulitan/keterbatasan</div>
        <input className="input" value={v.difficulties || ''} placeholder="Hambatan/keterbatasan audit tahun lalu…" style={inp}
          onChange={(e: { target: { value: string } }) => onPatch({ difficulties: e.target.value })} />
      </div>
    </div>
  );
}

function ContinuanceRegister() {
  const auth = useAuth();
  const nav = useNav();
  const { clients } = useFirm();
  const [decisions, setDecisions] = useAmsPersist('continuanceDecisions', CONTINUANCE_SEED);
  // Pengalaman tahun lalu (SA 220.A24) kini PERSIST server (StateDoc firma, keyed clientId),
  // bukan lagi konstanta hardcode. `PRIOR_YEAR` hanya seed awal saat StateDoc masih kosong
  // (version 0) → hydrate-on-first-load; setelah edit pertama, server jadi SSOT & auditable.
  const [priorYearMap, setPriorYearMap] = useAmsPersist('priorYear', PRIOR_YEAR);

  const canView = !!(auth && typeof auth.can === 'function' && auth.can(CAP.ENGAGEMENT_VIEW_ALL));
  const canDecide = !!(auth && typeof auth.can === 'function' && auth.can(CAP.FIRM_ADMIN));

  // Perkaya klien terhidrasi-server (yang melucuti field non-CRM) dengan pengalaman
  // tahun lalu dari peta terpersist ber-clientId, agar pemicu & kartu tahun-lalu hidup.
  const enrichedClients = clients.map((c: { id: string }) => ({ ...c, priorYear: priorYearMap[c.id] }));
  // Konsentrasi imbalan (Kode Etik/IESBA 290): rasio fee klien thd pendapatan firma
  // (GL 4-100 via FIRMFIN.pl) & portofolio partner → pemicu keberlanjutan + panel.
  const firmRevenue: number = FIRMFIN.pl({}).revenue || 0;
  const feeConc = feeConcentration(enrichedClients, firmRevenue);
  const concMap = feeConcentrationMap(feeConc);
  const sum = continuanceFlags(enrichedClients, INDEPENDENCE, INVOICES, decisions, REF_YEAR, concMap);
  // Deep-link (mis. dari Lini Masa Audit): buka langsung baris klien perikatan
  // terpilih bila valid; jika tidak, jatuh ke default (baris teratas) → nol regresi.
  const seedClient = useInitialSelection('continuance');
  const [selId, setSelId] = useStateCN(
    seedClient && sum.rows.some((r) => r.clientId === seedClient) ? seedClient
      : (sum.rows[0] ? sum.rows[0].clientId : '')
  );
  const sel = sum.rows.find((r) => r.clientId === selId) || sum.rows[0];

  const me = (auth && auth.user && auth.user.name) || 'Partner';
  const stamp = () => new Date().toISOString().slice(0, 10);

  const patchRec = (clientId: string, patch: Partial<StoredDecision>) =>
    setDecisions((prev: Record<string, StoredDecision>) => ({ ...prev, [clientId]: { ...(prev[clientId] || {}), ...patch } }));
  const patchPriorYear = (clientId: string, patch: Partial<PriorYear>) =>
    setPriorYearMap((prev: Record<string, PriorYear>) => ({ ...prev, [clientId]: { ...(prev[clientId] || {}), ...patch } }));

  // kertas kerja klien terpilih
  const rec: StoredDecision = (sel && decisions[sel.clientId]) || {};
  const factors: AssessmentFactor[] = (rec.factors && rec.factors.length) ? rec.factors : CONT_FACTORS();
  const score = weightedScore(factors);
  const rv = verdict(score, 'continuance');
  const approved = !!rec.approved;
  const editable = canView && !approved;

  const patchFactor = (i: number, p: Partial<AssessmentFactor>) => {
    if (!sel || !editable) return;
    const base = (rec.factors && rec.factors.length) ? rec.factors : CONT_FACTORS();
    patchRec(sel.clientId, { factors: base.map((f, idx) => (idx === i ? { ...f, ...p } : f)) });
  };
  const setSafeguards = (v: string) => { if (sel && editable) patchRec(sel.clientId, { safeguards: v }); };
  const setDecisionField = (d: ContinuanceDecision) => { if (sel && canDecide && !approved) patchRec(sel.clientId, { decision: d }); };
  const approveWp = () => {
    if (!sel || !canDecide) return;
    const dec: ContinuanceDecision = rec.decision || (rv.l as ContinuanceDecision);
    const at = stamp();
    patchRec(sel.clientId, { approved: true, decision: dec, approver: me, date: at, factors, trail: [...(rec.trail || []), { action: 'Disetujui — ' + dec, by: me, at }] });
  };
  const reopenWp = () => {
    if (!sel || !canDecide) return;
    patchRec(sel.clientId, { approved: false, trail: [...(rec.trail || []), { action: 'Dibuka kembali untuk revisi', by: me, at: stamp() }] });
  };

  // Ekspor memo kertas kerja (SA 230) tersegel — PDF/XLSX via generator bersama.
  const firmMeta = AMS as { FIRM?: { name?: string } };
  const firmName = (firmMeta.FIRM && firmMeta.FIRM.name) || 'Kantor Akuntan Publik';
  const [busyExport, setBusyExport] = useStateCN(false);
  const [verifyRes, setVerifyRes] = useStateCN(null as { valid: boolean; reason?: string } | null);
  const buildMemoInput = (): MemoInput | null => sel ? ({
    kind: 'continuance', client: sel.client, clientId: sel.clientId, industry: sel.industry,
    partner: sel.partner, cycle: String(REF_YEAR), score, verdict: rv.l, factors,
    decision: approved ? sel.decision : (rec.decision || rv.l),
    approver: rec.approver, date: rec.date, approved,
    safeguards: rec.safeguards, triggers: sel.triggers, priorYear: sel.priorYear || null, trail: rec.trail,
  }) : null;
  const doExport = async (fmtKind: 'pdf' | 'xlsx') => {
    const mi = buildMemoInput();
    if (!mi || !sel || busyExport) return;
    setBusyExport(true); setVerifyRes(null);
    try {
      const base = { kind: 'continuance-memo', firm: firmName, title: memoTitle(mi), meta: memoMeta(mi) };
      const res = fmtKind === 'pdf'
        ? await amsExportPdf({ ...base, refNo: memoRefNo(mi), fileName: `Memo Keberlanjutan - ${sel.client}.pdf`, blocks: buildMemoBlocks(mi) })
        : await amsExportXlsx({ ...base, fileName: `Memo Keberlanjutan - ${sel.client}.xlsx`, sheets: buildMemoSheets(mi) });
      if (res && res.sealed && res.sealId) patchRec(sel.clientId, { memoSeal: { sealId: res.sealId, contentHash: res.contentHash } });
    } finally { setBusyExport(false); }
  };
  const doVerify = async () => {
    if (!rec.memoSeal) return;
    setVerifyRes(await exportVerifySeal({ sealId: rec.memoSeal.sealId, contentHash: rec.memoSeal.contentHash }));
  };

  if (!canView) {
    return (
      <>
        <SubBar moduleId="continuance" />
        <div className="view-scroll"><div className="view-pad">
          <Panel>
            <div className="row ac gap10" style={{ padding: '14px 16px' }}>
              <span style={{ color: 'var(--amber)' }}><I.lock size={18} /></span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Akses terbatas — pengawasan oversight</div>
                <div className="tiny muted" style={{ marginTop: 2 }}>Keputusan keberlanjutan portofolio hanya untuk Partner/Manajer (oversight). Server tetap menegakkan isolasi data.</div>
              </div>
            </div>
          </Panel>
        </div></div>
      </>
    );
  }

  return (
    <>
      <SubBar moduleId="continuance" right={<Badge kind={sum.pending ? 'amber' : 'green'}>{sum.pending} perlu keputusan</Badge>} />
      <div className="view-scroll">
        <div className="view-pad">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
            <Panel><div style={{ padding: '15px 18px' }}><Stat value={sum.total} label="Klien Aktif" /></div></Panel>
            <Panel><div style={{ padding: '15px 18px' }}><Stat value={sum.pending} label="Perlu Keputusan" accent={sum.pending ? 'var(--amber)' : undefined} /></div></Panel>
            <Panel><div style={{ padding: '15px 18px' }}><Stat value={sum.attentionHigh} label="Perhatian Tinggi" accent="var(--red)" /></div></Panel>
            <Panel><div style={{ padding: '15px 18px' }}><Stat value={sum.rotationFlags} label="Pemicu Rotasi AP" /></div></Panel>
          </div>

          {/* KONSENTRASI IMBALAN (Kode Etik/IESBA 290) — ketergantungan imbalan firma & partner */}
          <Panel noBody style={{ marginBottom: 12 }}>
            <div className="panel-h">
              <h3>Konsentrasi Imbalan — Ketergantungan (Kode Etik · IESBA 290)</h3>
              <div style={{ flex: 1 }} />
              <span className="tiny muted">Pendapatan firma {rp0(feeConc.firmRevenue)} · ambang PIE {(FEE_CONCENTRATION_CONFIG.pieBreach * 100).toFixed(0)}%</span>
            </div>
            <div style={{ padding: '10px 14px' }}>
              <div className="row ac gap8" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
                <Badge kind={feeConc.breaches ? 'red' : 'green'}>{feeConc.breaches} pelampauan PIE</Badge>
                <Badge kind={feeConc.watches ? 'amber' : 'gray'}>{feeConc.watches} pemantauan</Badge>
                <span className="tiny muted">Konsentrasi puncak {(feeConc.topRatio * 100).toFixed(1)}% pendapatan firma · klik baris untuk kertas kerja</span>
              </div>
              <table className="dtbl">
                <thead><tr>
                  <th>Klien</th><th>Partner</th><th className="r">Imbalan</th><th className="r">% Firma</th><th className="r">% Partner</th><th>Status</th>
                </tr></thead>
                <tbody>
                  {feeConc.rows.map((r) => (
                    <tr key={r.clientId} onClick={() => setSelId(r.clientId)}
                      style={{ cursor: 'pointer', background: sel && sel.clientId === r.clientId ? 'var(--blue-100)' : undefined }}>
                      <td className="truncate" style={{ maxWidth: 180 }}>
                        {r.client.replace('PT ', '')}{r.pie && <span className="tiny mono" style={{ color: 'var(--blue)', marginLeft: 5 }}>PIE</span>}
                      </td>
                      <td className="truncate tiny muted" style={{ maxWidth: 110 }}>{r.partner.split(',')[0]}</td>
                      <td className="num tiny mono">{rp0(r.fee)}</td>
                      <td className="num tiny mono" style={{ fontWeight: 700, color: r.level === 'breach' ? 'var(--red)' : r.level === 'watch' ? 'var(--amber)' : undefined }}>{(r.ratioFirm * 100).toFixed(1)}%</td>
                      <td className="num tiny mono">{(r.ratioPartner * 100).toFixed(0)}%</td>
                      <td><Badge kind={r.level === 'breach' ? 'red' : r.level === 'watch' ? 'amber' : 'green'}>{r.level === 'breach' ? 'Signifikan' : r.level === 'watch' ? 'Pantau' : 'Wajar'}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className="grid" style={{ gridTemplateColumns: '1fr 380px', gap: 12, alignItems: 'start' }}>
            {/* Register */}
            <Panel noBody>
              <div className="panel-h"><h3>Register Keberlanjutan — Portofolio Aktif</h3><div style={{ flex: 1 }} /><span className="tiny muted">Klik baris untuk kertas kerja & keputusan</span></div>
              <table className="dtbl">
                <thead><tr>
                  <th>Klien</th><th>Partner</th><th className="r">Asosiasi</th><th>Pemicu</th><th>Perhatian</th><th>Keputusan</th>
                </tr></thead>
                <tbody>
                  {sum.rows.map((r) => (
                    <tr key={r.clientId} onClick={() => setSelId(r.clientId)}
                      style={{ cursor: 'pointer', background: sel && sel.clientId === r.clientId ? 'var(--blue-100)' : undefined }}>
                      <td className="truncate" style={{ maxWidth: 170 }}>
                        {r.client.replace('PT ', '')}{r.pie && <span className="tiny mono" style={{ color: 'var(--blue)', marginLeft: 5 }}>PIE</span>}
                      </td>
                      <td className="truncate tiny muted" style={{ maxWidth: 110 }}>{r.partner.split(',')[0]}</td>
                      <td className="num tiny">{r.assocYears} th</td>
                      <td>
                        {r.triggers.length === 0
                          ? <span className="tiny muted">—</span>
                          : <span className="row ac gap4">
                            {r.triggers.slice(0, 4).map((t, i) => <span key={i} title={t.label + ' — ' + t.detail} style={{ width: 9, height: 9, borderRadius: 2, background: sevColor(t.severity) }} />)}
                            <span className="tiny muted" style={{ marginLeft: 2 }}>{r.triggers.length}</span>
                          </span>}
                      </td>
                      <td><Badge kind={attnKind(r.attention)}>{r.attention}</Badge></td>
                      <td><Badge kind={decKind(r.decision)} dot={!!(decisions[r.clientId] && decisions[r.clientId].approved)}>{r.decision}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>

            {/* Ringkasan pemicu + tindak lanjut */}
            {sel && (
              <div className="grid" style={{ gap: 12 }}>
                <Panel title={sel.client.replace('PT ', '')} sub={`${sel.industry} · ${sel.partner.split(',')[0]}`}>
                  <div style={{ padding: '12px 14px' }}>
                    <div className="row ac gap8" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
                      <Badge kind={attnKind(sel.attention)}>Perhatian {sel.attention}</Badge>
                      {sel.pie && <Badge kind="blue">Emiten / PIE</Badge>}
                      <Badge kind={sel.risk === 'High' ? 'red' : sel.risk === 'Medium' ? 'amber' : 'gray'}>Risiko {sel.risk}</Badge>
                    </div>

                    <div className="tiny muted upper" style={{ marginBottom: 6 }}>Pemicu keberlanjutan</div>
                    {sel.triggers.length === 0
                      ? <div className="tiny muted" style={{ marginBottom: 8 }}>Tidak ada pemicu signifikan — kandidat keberlanjutan rutin.</div>
                      : <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 10 }}>
                        {sel.triggers.map((t, i) => (
                          <div key={i} className="row gap8" style={{ alignItems: 'flex-start' }}>
                            <span style={{ width: 9, height: 9, borderRadius: 2, background: sevColor(t.severity), marginTop: 4, flex: '0 0 9px' }} />
                            <div><div style={{ fontSize: 12, fontWeight: 600 }}>{t.label}</div><div className="tiny muted">{t.detail}</div></div>
                          </div>
                        ))}
                      </div>}

                    <div className="divider" />
                    <div className="row ac jb">
                      <span className="tiny muted upper">Status keputusan</span>
                      <Badge kind={decKind(sel.decision)} dot={approved}>{approved ? sel.decision : 'Tertunda'}</Badge>
                    </div>
                    {approved && (
                      <div className="tiny muted" style={{ marginTop: 6 }}>
                        Disetujui {sel.approver} · {sel.decidedDate}
                      </div>
                    )}
                    <div className="tiny muted" style={{ marginTop: 8 }}>Isi kertas kerja berbobot di bawah, lalu Partner mengunci keputusan.</div>
                  </div>
                </Panel>

                <Panel title="Tindak lanjut">
                  <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <Btn sm variant="ghost" onClick={() => nav('onboarding', { from: 'continuance' })}><I.flag size={13} /> PMPJ / Engagement Letter (SA 210)</Btn>
                    <Btn sm variant="ghost" onClick={() => nav('pppk', { from: 'continuance' })}><I.report size={13} /> Rotasi AP & Pelaporan PPPK</Btn>
                    <Btn sm variant="ghost" onClick={() => nav('governance', { from: 'continuance' })}><I.building size={13} /> ISQM 1 · Komponen C4</Btn>
                  </div>
                </Panel>
              </div>
            )}
          </div>

          {/* KERTAS KERJA KEBERLANJUTAN (SA 230) — penilaian berbobot + tahun-lalu + keputusan */}
          {sel && (
            <Panel noBody style={{ marginTop: 12 }}>
              <div className="panel-h">
                <h3>Kertas Kerja Keberlanjutan — {sel.client.replace('PT ', '')}</h3>
                <div style={{ flex: 1 }} />
                <span className="tiny muted">SA 220 · ISQM 1 ¶34 · siklus {REF_YEAR}</span>
              </div>
              <div className="grid" style={{ gridTemplateColumns: '1.35fr 1fr', gap: 0 }}>
                {/* KIRI — penilaian berbobot */}
                <div style={{ padding: '14px 16px', borderRight: '1px solid var(--line)' }}>
                  <div className="row ac jb" style={{ marginBottom: 10 }}>
                    <span className="tiny muted upper">Penilaian berbobot faktor</span>
                    <div className="row ac gap8">
                      <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--' + rv.k + ')' }}>{score.toFixed(2)}</span>
                      <span className={'badge b-' + rv.k} style={{ fontSize: 11, padding: '2px 8px' }}>{rv.l}</span>
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}><Progress value={score / 5 * 100} color={'var(--' + rv.k + ')'} /></div>

                  <div style={{ display: 'grid', gap: 12 }}>
                    {factors.map((f, i) => (
                      <div key={i}>
                        <div className="row ac jb" style={{ gap: 8, marginBottom: 5 }}>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{f.k} <span className="tiny muted">· bobot {f.w}</span></span>
                          <CNScorePick value={f.s} onChange={(n) => patchFactor(i, { s: n })} disabled={!editable} />
                        </div>
                        <input className="input" value={f.note || ''} disabled={!editable}
                          onChange={(e: { target: { value: string } }) => patchFactor(i, { note: e.target.value })}
                          placeholder="Catatan/justifikasi penilai…"
                          style={{ width: '100%', fontSize: 11.5, padding: '5px 8px', background: editable ? 'var(--surface)' : 'var(--surface-2)' }} />
                      </div>
                    ))}
                  </div>
                  {!canView ? null : !editable && (
                    <div className="tiny muted" style={{ marginTop: 10 }}>Kertas kerja terkunci (disetujui). Buka kembali untuk merevisi penilaian.</div>
                  )}
                </div>

                {/* KANAN — tahun lalu + safeguard + keputusan + jejak */}
                <div style={{ padding: '14px 16px', display: 'grid', gap: 12, alignContent: 'start' }}>
                  <div>
                    <div className="tiny muted upper" style={{ marginBottom: 7 }}>Pengalaman tahun lalu (SA 220.A24)</div>
                    {editable
                      ? <PriorYearEditor value={sel.priorYear} onPatch={(p) => patchPriorYear(sel.clientId, p)} />
                      : <PriorYearCard row={sel} />}
                  </div>

                  <div>
                    <div className="tiny muted upper" style={{ marginBottom: 5 }}>Safeguard / syarat keberlanjutan</div>
                    <textarea className="input" value={rec.safeguards || ''} disabled={!editable}
                      onChange={(e: { target: { value: string } }) => setSafeguards(e.target.value)}
                      placeholder="Tindakan pengaman atas ancaman teridentifikasi (mis. rotasi, EQR, pakar)…"
                      style={{ width: '100%', minHeight: 56, fontSize: 11.5, padding: '6px 8px', resize: 'vertical', background: editable ? 'var(--surface)' : 'var(--surface-2)' }} />
                  </div>

                  <div>
                    <div className="tiny muted upper" style={{ marginBottom: 6 }}>Keputusan (menuntun: {rv.l})</div>
                    {canDecide ? (
                      <>
                        <div className="row wrap gap6">
                          {DECISIONS.map((d) => (
                            <Btn key={d} sm variant={(rec.decision || rv.l) === d ? 'primary' : ''} disabled={approved} onClick={() => setDecisionField(d)}>{d}</Btn>
                          ))}
                        </div>
                        <div className="row gap6" style={{ marginTop: 8 }}>
                          {!approved
                            ? <Btn sm variant="primary" onClick={approveWp}><I.check size={13} /> Setujui &amp; Kunci</Btn>
                            : <Btn sm variant="ghost" onClick={reopenWp}><I.sync size={13} /> Buka kembali</Btn>}
                        </div>
                        <div className="tiny muted" style={{ marginTop: 6 }}>Persetujuan atas nama Anda ({me}) — SA 220 / ISQM 1.</div>
                      </>
                    ) : (
                      <div className="tiny muted">Hanya Partner (otoritas firma) yang mengunci keputusan. Anda dapat menilai & menelaah.</div>
                    )}
                  </div>

                  {rec.trail && rec.trail.length > 0 && (
                    <div>
                      <div className="tiny muted upper" style={{ marginBottom: 5 }}>Jejak persetujuan</div>
                      <div style={{ display: 'grid', gap: 4 }}>
                        {rec.trail.map((t, i) => (
                          <div key={i} className="tiny muted">• {t.action} — {t.by} · {t.at}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {cycleHistoryFor(sel.clientId).length > 0 && (
                    <div>
                      <div className="tiny muted upper" style={{ marginBottom: 5 }}>Riwayat siklus keberlanjutan</div>
                      <div style={{ display: 'grid', gap: 4 }}>
                        <div className="row ac jb tiny">
                          <span style={{ fontWeight: 600 }}>Siklus {REF_YEAR} (berjalan)</span>
                          <Badge kind={decKind(approved ? sel.decision : 'Tertunda')} dot={approved}>{approved ? sel.decision : 'Tertunda'}</Badge>
                        </div>
                        {cycleHistoryFor(sel.clientId).map(({ yr, d }) => (
                          <div key={yr} className="row ac jb tiny" title={`${d.approver} · ${d.date}`}>
                            <span className="muted">Siklus {yr}</span>
                            <Badge kind={decKind(d.decision)} dot>{d.decision}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="tiny muted upper" style={{ marginBottom: 5 }}>Dokumentasi (SA 230) — memo tersegel</div>
                    <div className="row wrap gap6">
                      <Btn sm variant="ghost" disabled={busyExport} onClick={() => doExport('pdf')}><I.download size={13} /> Memo PDF</Btn>
                      <Btn sm variant="ghost" disabled={busyExport} onClick={() => doExport('xlsx')}><I.download size={13} /> Memo XLSX</Btn>
                      {rec.memoSeal && <Btn sm variant="ghost" onClick={doVerify}><I.shield size={13} /> Verifikasi Segel</Btn>}
                    </div>
                    {rec.memoSeal && (
                      <div className="tiny mono" style={{ marginTop: 5, color: 'var(--ink-3)' }}>Segel: {rec.memoSeal.sealId}</div>
                    )}
                    {verifyRes && (
                      <div className="tiny" style={{ marginTop: 4, color: verifyRes.valid ? 'var(--green)' : 'var(--red)' }}>
                        {verifyRes.valid ? '✓ Segel sah — konten utuh' : '✗ Segel tidak sah' + (verifyRes.reason ? ' (' + verifyRes.reason + ')' : '')}
                      </div>
                    )}
                    <div className="tiny muted" style={{ marginTop: 5 }}>Segel Ed25519 (provenans Asseris) — bukan e-Meterai/PSrE.</div>
                  </div>
                </div>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}

Object.assign(window, { ContinuanceRegister });

export { ContinuanceRegister };
