/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAmsPersist, useAudit, useAuth, useFirm } from './contexts';
import { amsExportPdf } from './export_pdf';
import { I } from './icons';
import { SACanonChips, SACanonicalStatus } from './sa_canonical';
import { SubBar } from './shell';
import { Badge, Btn, Check, Panel, Tabs } from './ui';
import {
  EXPERT_EVAL_STEPS, expertEvalComplete, expertEvalDone,
  type ExpertEvalState, type ExpertEvalStepKey,
} from './canon_expert_eval';
import { estimateSensitivity, type SensDriver } from './estimate_sensitivity';
import { EST_SEED, estimateMisstatement, type BiasRow, type Estimate, type EstState } from './canon_estimates';
import { AMS_CANON } from './canon';
import {
  derivedPerPct, effectiveRange, hydrateViuDerivations,
  type EffectiveRange, type EstimateDerivation, type Psak48Like, type RangeScenario,
} from './canon_range';
import type { ViuParams } from './canon_viu';
import { retrospectiveSummary, type Retrospective } from './canon_retrospective';
import { amsAttachEvidence, FileDropField } from './evidence';
import { EXPERT_DOC_MAX_MB, isLegacyDocUid, uploadExpertDoc, useExpertDocs, type DropMeta, type ExpertDoc } from './expert_docs';
import { KvBox } from './view_analytical';
import { WpPanel } from './wp_signoff';
import { amsDateShortId } from './clock_ssot';

/* ============================================================
   Asseris — SA 540 · Audit atas Estimasi Akuntansi
   Deep workpaper: inventaris estimasi & ketidakpastian,
   penilaian risiko bawaan (kompleksitas/subjektivitas/
   ketidakpastian), respons (uji proses manajemen & rentang
   independen), indikator bias, serta pengungkapan.
   ============================================================ */
const { useState: useState540, useMemo: useMemo540 } = React;

/* Bentuk registri, seed, dan DASAR PENGUKURAN salah saji kini tinggal di
   `canon_estimates.ts` — modul murni ber-uji unit yang dipakai bersama oleh
   modul ini dan SAD Ledger (SA 450). Tidak ada seed kedua di mana pun. */

/* tipe struktural minimal event input — hindari explicit-any (ratchet) */
type Ev = { target: { value: string } };

const EST_UNC = ['Tinggi', 'Sedang', 'Rendah'];
const EST_RISK = ['Signifikan', 'Non-signifikan'];
/* jalur respons yang MENUNTUT evaluasi pekerjaan pakar (SA 500 ¶8 / SA 620) —
   satu literal, dipakai daftar pilihan DAN gerbang panel evaluasi */
const EST_APPROACH_EXPERT = 'Gunakan pakar (SA 620)';
const EST_APPROACH = ['Uji proses manajemen', 'Rentang independen', EST_APPROACH_EXPERT, 'Uji peristiwa kemudian'];
const BIAS_FLAG = ['amber', 'green'];

function estToday() {
  try { return amsDateShortId(); }
  catch (e) { return ''; }
}
function nextEId(list: Estimate[]) {
  const n = list.reduce((mx, e) => { const m = /E-(\d+)/.exec(e.id || ''); return m ? Math.max(mx, +m[1]) : mx; }, 0);
  return 'E-' + String(n + 1).padStart(2, '0');
}
function nextBId(list: BiasRow[]) {
  const n = list.reduce((mx, b) => { const m = /B-(\d+)/.exec(b.id || ''); return m ? Math.max(mx, +m[1]) : mx; }, 0);
  return 'B-' + String(n + 1).padStart(2, '0');
}

/* ============================================================ */
function SA540View() {
  const firm = useFirm();
  const auth = useAuth();
  const me = (auth && auth.user && auth.user.name) || 'Auditor';
  const client = firm?.activeClient?.name || 'PT Sentosa Makmur Tbk';
  const engId = firm?.activeEngagement?.id || 'default';
  const engLabel = firm?.activeEngagement?.id || 'ENG-2025-014';
  const locked = !!(firm && firm.locked);
  /* engagement-scoped (AMS_PERSIST_SCOPE: 'estimates.v1' → engagement) — isolasi W7.5
     & RBAC WP_EDIT (bukan firm/FIRM_ADMIN). scopeId = perikatan aktif otomatis. */
  const [est, setEst] = useAmsPersist('estimates.v1', () => EST_SEED);

  /* PR-4 · Q3 — TAUTAN HIDUP ke mesin nilai pakai. Estimasi ber-dasar 'viu'
     (E-05 goodwill) tidak menyimpan skenarionya; ia dibangkitkan dari hasil
     `psak48()` pada tiap pembacaan, dengan asumsi yang SAMA (`viuParams.v1`)
     yang dikemudikan auditor di PSAK 48. Konsekuensinya disengaja: mengubah
     WACC di sana menggerakkan rentang auditor di sini — dan, bila titik
     manajemen keluar rentang, salah saji di SAD Ledger.
     Penulisan tetap mengenai `s.register` MENTAH (lihat setRegister), sehingga
     skenario hidup tak pernah ikut ter-persist & membeku. */
  const auditCtx = useAudit();
  const [viuOverride] = useAmsPersist('viuParams.v1', () => ({} as Partial<ViuParams>));
  const p48 = useMemo540(() => {
    const wtb = (auditCtx && auditCtx.wtb && auditCtx.wtb.length) ? auditCtx.wtb : ((AMS && AMS.WTB) || []);
    const aje = (auditCtx && auditCtx.aje) ? auditCtx.aje : undefined;
    return AMS_CANON.psak48(wtb, aje, 'reported', viuOverride) as unknown as Psak48Like;
  }, [auditCtx, viuOverride]);
  const register: Estimate[] = useMemo540(
    () => hydrateViuDerivations((est && est.register) || [], p48),
    [est, p48],
  );
  const bias: BiasRow[] = (est && est.bias) || [];
  /* backward-compat: state lama tak punya sensitivity → seed */
  const sensitivity: Record<string, SensDriver[]> = (est && est.sensitivity) || EST_SEED.sensitivity;
  const setRegister = (fn: (l: Estimate[]) => Estimate[]) => setEst((s: EstState) => ({ ...s, register: fn((s && s.register) || []) }));
  const setBias = (fn: (l: BiasRow[]) => BiasRow[]) => setEst((s: EstState) => ({ ...s, bias: fn((s && s.bias) || []) }));
  const setSensitivity = (id: string, drivers: SensDriver[]) => setEst((s: EstState) => ({ ...s, sensitivity: { ...((s && s.sensitivity) || {}), [id]: drivers } }));

  /* ARC ESTIMASI PR-2 — evaluasi pakar berbagi kunci dengan PSAK 68
     (`expertEval.v1`), dikunci per id estimasi untuk jalur SA 620. */
  const [expertEval, setExpertEval] = useAmsPersist('expertEval.v1', () => ({} as ExpertEvalState));
  const toggleExpert = (ref: string, key: ExpertEvalStepKey, on: boolean) =>
    setExpertEval((m: ExpertEvalState) => ({ ...m, [ref]: { ...(m && m[ref]), [key]: on, by: me, at: estToday() } }));
  const setExpertDoc = (ref: string, uid: string) =>
    setExpertEval((m: ExpertEvalState) => ({ ...m, [ref]: { ...(m && m[ref]), docUid: uid || undefined, by: me, at: estToday() } }));
  const [tab, setTab] = useState540('inventaris');
  const sig = register.filter(e => e.risk === 'Signifikan').length;
  const uncHi = register.filter(e => e.unc === 'Tinggi').length;
  const biasFlags = bias.filter(b => b.flag !== 'green').length;
  const tabs = [
    { id: 'inventaris', label: 'Inventaris Estimasi' },
    { id: 'risiko', label: 'Risiko & Ketidakpastian' },
    { id: 'respons', label: 'Respons & Rentang' },
    { id: 'bias', label: 'Bias & Pengungkapan' },
  ];

  const exportMemo = () => {
    const regRows = register.map(e => [e.id, e.name, e.mgmt.toLocaleString('id-ID'), e.lo.toLocaleString('id-ID') + '–' + e.hi.toLocaleString('id-ID'), e.unc, e.risk]);
    const biasRows = bias.map(b => [b.id, b.t, b.est, b.flag === 'green' ? 'Wajar' : 'Perhatian']);
    amsExportPdf({
      kind: 'memo-estimasi', scope: 'engagement', scopeId: engId,
      firm: (AMS.FIRM as { name?: string }).name || 'KAP', title: 'Memo Audit atas Estimasi Akuntansi (SA 540)',
      refNo: 'E-540 · ' + engLabel,
      meta: [client + ' · ' + engLabel, 'SA 540 (Revisi) — Estimasi Akuntansi & Pengungkapan', 'Dibuat: ' + estToday() + ' · ' + me],
      blocks: [
        { type: 'heading', text: 'Inventaris Estimasi (Rp jt)' },
        { type: 'table', head: ['Ref', 'Estimasi', 'Titik Mgmt', 'Rentang Auditor', 'Ketidakpastian', 'Risiko'], body: regRows.length ? regRows : [['—', '—', '—', '—', '—', '—']], columnStyles: { 1: { cellWidth: 150 } } },
        { type: 'heading', text: 'Indikator Kemungkinan Bias Manajemen (¶32)' },
        { type: 'table', head: ['Ref', 'Indikator', 'Estimasi', 'Status'], body: biasRows.length ? biasRows : [['—', '—', '—', '—']], columnStyles: { 1: { cellWidth: 220 } } },
      ],
    }).catch(() => {});
  };

  return (
    <>
      <SubBar moduleId="sa540" right={
        <div className="row gap8 ac">
          <SACanonChips stdId="sa540" />
          <Btn sm onClick={exportMemo}><I.download size={13} /> Memo Estimasi</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 210 }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Standar Audit 540 (Revisi)</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Estimasi Akuntansi & Pengungkapan</div>
              <div className="tiny muted">{client} · {engLabel}</div>
            </div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Estimasi Teridentifikasi</div><div className="mono" style={{ fontWeight: 700, fontSize: 12 }}>{register.length} · {sig} signifikan</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Ketidakpastian Tinggi</div><div className="mono" style={{ fontWeight: 700, fontSize: 12, color: 'var(--red)' }}>{uncHi} estimasi</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Indikasi Bias</div><div className="mono" style={{ fontWeight: 700, fontSize: 12, color: 'var(--amber)' }}>{biasFlags} perhatian</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Sikap Auditor</div>
              <Badge kind="amber" dot>Skeptisisme Profesional</Badge>
            </div>
          </div>
        </Panel>

        <SACanonicalStatus stdId="sa540" />

        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

        {tab === 'inventaris' && <F540Register register={register} setRegister={setRegister} me={me} locked={locked} />}
        {tab === 'risiko' && <F540Risk register={register} setRegister={setRegister} locked={locked} />}
        {tab === 'respons' && <F540Response register={register} sensitivity={sensitivity} setSensitivity={setSensitivity} locked={locked} expertEval={expertEval} toggleExpert={toggleExpert} setExpertDoc={setExpertDoc} />}
        {tab === 'bias' && <F540Bias bias={bias} setBias={setBias} me={me} locked={locked} register={register} setRegister={setRegister} />}

      </div></div>
    </>
  );
}

/* ---------------- Tab: Inventaris Estimasi ---------------- */
function F540Register({ register, setRegister, me, locked }: { register: Estimate[]; setRegister: (fn: (l: Estimate[]) => Estimate[]) => void; me: string; locked: boolean }) {
  const uid = React.useId();
  const [selId, setSelId] = useState540('E-01');
  const sel = register.find(e => e.id === selId) || register[0] || null;
  const uncKind = (u: string) => u === 'Tinggi' ? 'red' : u === 'Sedang' ? 'amber' : 'green';
  /* rentang yang BERLAKU — terhitung dari skenario bila ada dasarnya, bukan lo/hi ketik */
  const rng: EffectiveRange = sel ? effectiveRange(sel) : { lo: 0, hi: 0, source: 'manual', method: 'manual', grounded: false, legacy: true, scenarioCount: 0 };
  const pos = sel && rng.hi > rng.lo ? Math.max(0, Math.min(100, ((sel.mgmt - rng.lo) / (rng.hi - rng.lo)) * 100)) : 50;
  const patch = (id: string, p: Partial<Estimate>) => setRegister(l => l.map(e => e.id === id ? { ...e, ...p, by: me, at: estToday() } : e));
  const add = () => {
    const id = nextEId(register);
    setRegister(l => [...l, { id, name: 'Estimasi baru', acct: '', mgmt: 0, lo: 0, hi: 0, unc: 'Sedang', risk: 'Non-signifikan', method: '', assump: [], approach: 'Uji proses manajemen', note: '', by: me, at: estToday() }]);
    setSelId(id);
  };
  const del = (id: string) => { setRegister(l => l.filter(e => e.id !== id)); setSelId(null); };
  return (
    <div className="grid split" style={{ gridTemplateColumns: '1fr 380px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Inventaris Estimasi Akuntansi</h3><div style={{ flex: 1 }} /><span className="tiny muted" style={{ marginRight: 8 }}>{register.length} estimasi</span>{!locked && <Btn sm onClick={add}><I.plus size={12} /> Tambah</Btn>}</div>
        <table className="dtbl">
          <thead><tr><th style={{ width: 50 }}>Ref</th><th>Estimasi</th><th className="num">Titik Mgmt</th><th style={{ width: 88 }}>Ketidakpastian</th><th style={{ width: 96 }}>Risiko</th></tr></thead>
          <tbody>
            {register.map(e => (
              <tr key={e.id} className={e.id === (sel && sel.id) ? 'sel' : ''} onClick={() => setSelId(e.id)} style={{ cursor: 'pointer' }}>
                <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{e.id}</td>
                <td style={{ fontWeight: 600, whiteSpace: 'normal', lineHeight: 1.35 }}>{e.name}<div className="tiny muted" style={{ fontWeight: 400, marginTop: 2 }}>{e.acct}</div></td>
                <td className="num mono">{e.mgmt.toLocaleString('id-ID')}</td>
                <td><Badge kind={uncKind(e.unc)}>{e.unc}</Badge></td>
                <td><Badge kind={e.risk === 'Signifikan' ? 'red' : 'gray'}>{e.risk === 'Signifikan' ? 'Signifikan' : 'Non-sig.'}</Badge></td>
              </tr>
            ))}
            {!register.length && <tr><td colSpan={5} className="tiny muted" style={{ textAlign: 'center', padding: 18 }}>Belum ada estimasi tercatat.</td></tr>}
          </tbody>
        </table>
      </Panel>

      {sel && (
        <Panel noBody>
          <div style={{ background: 'var(--surface-2)', padding: '15px 18px', borderBottom: '1px solid var(--line)' }}>
            <div className="row ac jb">
              <div className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{sel.id}</span><Badge kind={uncKind(sel.unc)}>Ketidakpastian {sel.unc}</Badge>{sel.risk === 'Signifikan' && <Badge kind="red">Signifikan</Badge>}</div>
              {!locked && <button className="btn sm icon" title="Hapus" onClick={() => del(sel.id)}><I.x size={13} /></button>}
            </div>
            {locked && <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4, lineHeight: 1.35 }}>{sel.name}</div>}
          </div>
          <div style={{ padding: 14 }}>
            {!locked && (
              <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                <div className="field"><label htmlFor={uid+'-estimasi'}>Estimasi</label><input id={uid+'-estimasi'} className="input" value={sel.name} onChange={(e: Ev) => patch(sel.id, { name: e.target.value })} /></div>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div className="field"><label htmlFor={uid+'-akun'}>Akun</label><input id={uid+'-akun'} className="input" value={sel.acct} onChange={(e: Ev) => patch(sel.id, { acct: e.target.value })} /></div>
                  <div className="field"><label htmlFor={uid+'-pendekatan'}>Pendekatan</label><select id={uid+'-pendekatan'} className="select" value={sel.approach} onChange={(e: Ev) => patch(sel.id, { approach: e.target.value })}>{EST_APPROACH.map(a => <option key={a}>{a}</option>)}</select></div>
                </div>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div className="field"><label htmlFor={uid+'-titik-mgmt'}>Titik Mgmt</label><input id={uid+'-titik-mgmt'} className="input mono" type="number" value={sel.mgmt} onChange={(e: Ev) => patch(sel.id, { mgmt: +e.target.value })} style={{ textAlign: 'right' }} /></div>
                  <div className="field">
                    <label htmlFor={uid+'-batas-bawah-terhitung'}>Batas Bawah{rng.source === 'derived' && <span className="muted" style={{ textTransform: 'none' }}> · terhitung</span>}</label>
                    <input id={uid+'-batas-bawah-terhitung'} className="input mono" type="number" value={rng.lo} readOnly={rng.source === 'derived'} disabled={rng.source === 'derived'}
                      onChange={(e: Ev) => patch(sel.id, { lo: +e.target.value })} style={{ textAlign: 'right' }} />
                  </div>
                  <div className="field">
                    <label htmlFor={uid+'-batas-atas-terhitung'}>Batas Atas{rng.source === 'derived' && <span className="muted" style={{ textTransform: 'none' }}> · terhitung</span>}</label>
                    <input id={uid+'-batas-atas-terhitung'} className="input mono" type="number" value={rng.hi} readOnly={rng.source === 'derived'} disabled={rng.source === 'derived'}
                      onChange={(e: Ev) => patch(sel.id, { hi: +e.target.value })} style={{ textAlign: 'right' }} />
                  </div>
                </div>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div className="field"><label htmlFor={uid+'-ketidakpastian'}>Ketidakpastian</label><select id={uid+'-ketidakpastian'} className="select" value={sel.unc} onChange={(e: Ev) => patch(sel.id, { unc: e.target.value })}>{EST_UNC.map(u => <option key={u}>{u}</option>)}</select></div>
                  <div className="field"><label htmlFor={uid+'-risiko'}>Risiko</label><select id={uid+'-risiko'} className="select" value={sel.risk} onChange={(e: Ev) => patch(sel.id, { risk: e.target.value })}>{EST_RISK.map(r => <option key={r}>{r}</option>)}</select></div>
                </div>
              </div>
            )}

            <div className="tiny muted upper" style={{ marginBottom: 4 }}>Metode Pengukuran</div>
            {locked ? <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.5 }}>{sel.method}</p>
              : <textarea className="input" value={sel.method} onChange={(e: Ev) => patch(sel.id, { method: e.target.value })} style={{ height: 44, padding: 8, lineHeight: 1.4, resize: 'vertical', marginBottom: 12 }} />}

            <div className="tiny muted upper" style={{ marginBottom: 6 }}>Titik Manajemen vs Rentang Auditor (Rp jt)</div>
            <div style={{ position: 'relative', height: 30, marginBottom: 4 }}>
              <div style={{ position: 'absolute', top: 12, left: 0, right: 0, height: 6, borderRadius: 3, background: 'linear-gradient(90deg,var(--green-solid),var(--amber-solid),var(--red-solid))', opacity: .25 }} />
              <div style={{ position: 'absolute', top: 12, left: 0, right: 0, height: 6, borderRadius: 3, border: '1px solid var(--line-strong)' }} />
              <div style={{ position: 'absolute', top: 6, left: `calc(${pos}% - 1px)`, width: 2, height: 18, background: 'var(--navy-solid)' }} />
              <div style={{ position: 'absolute', top: -2, left: `${pos}%`, transform: 'translateX(-50%)' }}><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)' }}>{sel.mgmt.toLocaleString('id-ID')}</span></div>
            </div>
            <div className="row jb tiny mono muted" style={{ marginBottom: 8 }}><span>{rng.lo.toLocaleString('id-ID')}</span><span>rentang independen auditor</span><span>{rng.hi.toLocaleString('id-ID')}</span></div>

            <RangeBasis est={sel} rng={rng} patch={patch} locked={locked} />

            <div className="tiny muted upper" style={{ marginBottom: 5 }}>Asumsi Signifikan {!locked && <span className="muted" style={{ textTransform: 'none' }}>(satu per baris)</span>}</div>
            {locked ? sel.assump.map((a, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 12, alignItems: 'flex-start', padding: '6px 0', borderBottom: i < sel.assump.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                <span style={{ color: 'var(--blue)', flex: '0 0 auto', marginTop: 1 }}><I.arrowRight size={13} /></span><span style={{ lineHeight: 1.4 }}>{a}</span>
              </div>
            )) : <textarea className="input" value={sel.assump.join('\n')} onChange={(e: Ev) => patch(sel.id, { assump: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })} style={{ height: 64, padding: 8, lineHeight: 1.5, resize: 'vertical' }} placeholder="Asumsi signifikan, satu per baris…" />}

            <div className="tiny muted upper" style={{ margin: '12px 0 5px' }}>Catatan Auditor</div>
            {locked ? (
              <div className="panel" style={{ padding: '9px 11px', background: 'var(--surface-2)', borderColor: 'transparent' }}>
                <div className="row gap8" style={{ alignItems: 'flex-start' }}><span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.flag size={14} /></span><span style={{ fontSize: 12, lineHeight: 1.4 }}>{sel.note}</span></div>
              </div>
            ) : <textarea className="input" value={sel.note} onChange={(e: Ev) => patch(sel.id, { note: e.target.value })} style={{ height: 50, padding: 8, lineHeight: 1.45, resize: 'vertical' }} placeholder="Catatan/kesimpulan atas estimasi…" />}
            {sel.by && <div className="tiny muted" style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--line-soft)' }}><I.check size={11} /> Diperbarui {sel.by} · {sel.at}</div>}
          </div>
        </Panel>
      )}
    </div>
  );
}

/* ---------------- Dasar rentang (PR-4) ----------------
   Menjawab "dari mana rentang itu berasal?". Tiga keadaan:
     terhitung dari skenario · manual beralasan · TAK BERDASAR.
   Yang terakhir tetap dipakai (menghapusnya akan menghapus salah saji nyata
   dari SA 450) tetapi tak boleh lagi menyamar sebagai rentang yang teruji. */
const RANGE_METHOD_LABEL: Record<string, string> = {
  scenarios: 'Terhitung dari skenario asumsi',
  viu: 'Terhitung dari mesin nilai pakai (PSAK 48)',
  manual: 'Ditetapkan auditor',
};

function RangeBasis({ est, rng, patch, locked }: { est: Estimate; rng: EffectiveRange; patch: (id: string, p: Partial<Estimate>) => void; locked: boolean }) {
  const uid = React.useId();
  const d: EstimateDerivation = est.derivation || { method: 'manual' };
  const scenarios: RangeScenario[] = (d.scenarios || []);
  const isViu = d.method === 'viu';
  const setD = (p: Partial<EstimateDerivation>) => patch(est.id, { derivation: { ...d, ...p } });
  const setScenarios = (fn: (l: RangeScenario[]) => RangeScenario[]) => {
    /* skenario 'viu' dibangkitkan hidup — tak pernah disunting/disimpan di sini */
    if (isViu) return;
    setD({ scenarios: fn(scenarios) });
  };
  const addScenario = () => setScenarios(l => [...l, { id: 'sc' + (l.length + 1), label: 'Skenario baru', value: est.mgmt }]);

  return (
    <div className="panel" style={{ padding: '10px 12px', marginBottom: 12, background: 'var(--surface-2)', borderColor: rng.grounded ? 'transparent' : 'var(--amber)' }}>
      <div className="row ac jb" style={{ marginBottom: 6 }}>
        <span className="tiny muted upper" style={{ fontWeight: 700 }}>Dasar Rentang</span>
        {rng.grounded
          ? <Badge kind={rng.source === 'derived' ? 'blue' : 'green'}>{rng.source === 'derived' ? `${rng.scenarioCount} skenario` : 'Beralasan'}</Badge>
          : <Badge kind="amber">Tak berdasar</Badge>}
      </div>

      {!locked && (
        <div className="field" style={{ marginBottom: 8 }}>
          <label htmlFor={uid+'-metode'}>Metode</label>
          <select id={uid+'-metode'} className="select" value={d.method} onChange={(e: Ev) => setD({ method: e.target.value as EstimateDerivation['method'] })} style={{ height: 28 }}>
            <option value="manual">Ditetapkan auditor (wajib beralasan)</option>
            <option value="scenarios">Terhitung dari skenario asumsi</option>
            <option value="viu">Terhitung dari mesin nilai pakai — uji penurunan nilai UPK/goodwill</option>
          </select>
        </div>
      )}
      <div className="tiny" style={{ color: 'var(--ink-2)', lineHeight: 1.45, marginBottom: 8 }}>{RANGE_METHOD_LABEL[d.method] || d.method}</div>

      {(d.method === 'scenarios' || isViu) && (
        <>
          <table className="dtbl" style={{ marginBottom: 6 }}>
            <thead><tr><th>Skenario</th><th className="num" style={{ width: 84 }}>Nilai</th>{!locked && !isViu && <th style={{ width: 24 }}></th>}</tr></thead>
            <tbody>
              {scenarios.map((s, i) => (
                <tr key={s.id || i}>
                  <td style={{ whiteSpace: 'normal' }}>
                    {locked || isViu ? <>{s.label}{s.note && <div className="tiny muted">{s.note}</div>}</>
                      : <input className="input" value={s.label} onChange={(e: Ev) => setScenarios(l => l.map(x => x.id === s.id ? { ...x, label: e.target.value } : x))} style={{ height: 24 }} />}
                  </td>
                  <td className="num mono">
                    {locked || isViu ? s.value.toLocaleString('id-ID')
                      : <input className="input mono" type="number" value={s.value} onChange={(e: Ev) => setScenarios(l => l.map(x => x.id === s.id ? { ...x, value: +e.target.value } : x))} style={{ height: 24, width: 76, textAlign: 'right' }} />}
                  </td>
                  {!locked && !isViu && <td><button className="btn sm icon" title="Hapus skenario" onClick={() => setScenarios(l => l.filter(x => x.id !== s.id))}><I.x size={11} /></button></td>}
                </tr>
              ))}
              {!scenarios.length && <tr><td colSpan={locked || isViu ? 2 : 3} className="tiny muted" style={{ textAlign: 'center', padding: 10 }}>Belum ada skenario — rentang belum terhitung.</td></tr>}
            </tbody>
          </table>
          {!locked && !isViu && <Btn sm onClick={addScenario}><I.plus size={12} /> Skenario</Btn>}
          {isViu && (
            <div className="tiny" style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}>
              Skenario ini <b>tidak disimpan</b> — ia dibangkitkan dari asumsi nilai pakai yang berlaku di PSAK 48. Mengubah WACC di sana menggerakkan rentang ini, dan bila titik manajemen keluar rentang, salah saji di SAD Ledger ikut bergerak.
            </div>
          )}
          {scenarios.length === 1 && <div className="tiny" style={{ color: 'var(--amber)', marginTop: 6, lineHeight: 1.45 }}>Satu skenario bukan rentang — dibutuhkan minimal dua, sehingga batas manual di atas yang dipakai.</div>}
        </>
      )}

      {d.method === 'manual' && (
        <>
          <div className="tiny muted upper" style={{ marginBottom: 4 }}>Alasan batas yang dipilih</div>
          {locked
            ? <div style={{ fontSize: 12, lineHeight: 1.45 }}>{d.rationale || <span style={{ color: 'var(--amber)' }}>Belum dinyatakan.</span>}</div>
            : <textarea className="input" value={d.rationale || ''} onChange={(e: Ev) => setD({ rationale: e.target.value })}
                placeholder="Dari mana batas bawah & atas ini berasal? (mis. tabel sensitivitas laporan pakar, rentang pembanding industri…)"
                style={{ height: 48, padding: 8, lineHeight: 1.4, resize: 'vertical' }} />}
          {!rng.grounded && (
            <div className="tiny" style={{ color: 'var(--amber)', marginTop: 6, lineHeight: 1.45 }}>
              {rng.legacy ? 'Rentang warisan — belum pernah menyatakan dasarnya.' : 'Tanpa alasan, rentang ini adalah angka yang diketik.'} Ia <b>tetap dipakai</b> untuk mengukur salah saji, tetapi ditandai di SAD Ledger &amp; memo estimasi.
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- Tab: Risiko & Ketidakpastian ---------------- */
function F540Risk({ register, setRegister, locked }: { register: Estimate[]; setRegister: (fn: (l: Estimate[]) => Estimate[]) => void; locked: boolean }) {
  const lvlKind = (v?: string) => v === 'Tinggi' ? 'red' : v === 'Sedang' ? 'amber' : 'green';
  const patch = (id: string, p: Partial<Estimate>) => setRegister(l => l.map(e => e.id === id ? { ...e, ...p } : e));
  const drivers = [
    { k: 'Kompleksitas', ic: 'layers', color: 'blue', d: 'Kerumitan metode/model & data yang dibutuhkan untuk membuat estimasi.', ex: 'Model ECL multi-skenario & DCF goodwill tergolong kompleks.' },
    { k: 'Subjektivitas', ic: 'sliders', color: 'purple', d: 'Keterbatasan pengetahuan/data objektif → pertimbangan manajemen.', ex: 'Pemilihan WACC & overlay makro melibatkan pertimbangan signifikan.' },
    { k: 'Ketidakpastian Estimasi', ic: 'target', color: 'red', d: 'Kerentanan terhadap kurangnya presisi pengukuran.', ex: 'Rentang hasil yang masuk akal lebar (CKPN, goodwill, imbalan kerja).' },
  ];
  return (
    <div className="grid" style={{ gap: 12 }}>
      <Panel noBody>
        <div className="panel-h"><h3>Faktor Risiko Bawaan Estimasi (¶ Pendekatan SA 540 Revisi)</h3><div style={{ flex: 1 }} /><Badge kind="blue">Spektrum risiko bawaan</Badge></div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 0 }}>
          {drivers.map((d, i) => {
            const Ic = (I as any)[d.ic];
            return (
              <div key={i} style={{ padding: 16, borderRight: i < 2 ? '1px solid var(--line-soft)' : 0 }}>
                <span style={{ width: 38, height: 38, borderRadius: 9, display: 'grid', placeItems: 'center', background: `var(--${d.color}-bg)`, color: `var(--${d.color})`, marginBottom: 10 }}><Ic size={19} /></span>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{d.k}</div>
                <p className="tiny muted" style={{ margin: '4px 0 8px', lineHeight: 1.45 }}>{d.d}</p>
                <div className="chip tiny" style={{ background: 'var(--surface-2)' }}>{d.ex}</div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel noBody>
        <div className="panel-h"><h3>Pemetaan Ketidakpastian per Estimasi</h3><div style={{ flex: 1 }} /><span className="tiny muted">Kompleksitas × Subjektivitas {locked ? '' : '· dapat disunting'}</span></div>
        <table className="dtbl">
          <thead><tr><th>Estimasi</th><th style={{ width: 124 }}>Kompleksitas</th><th style={{ width: 124 }}>Subjektivitas</th><th style={{ width: 110 }}>Ketidakpastian</th><th style={{ width: 96 }}>Risiko</th></tr></thead>
          <tbody>
            {register.map(e => (
              <tr key={e.id}>
                <td style={{ fontWeight: 600 }}>{e.name}</td>
                <td>{locked
                  ? <Badge kind={lvlKind(e.cplx)}>{e.cplx || '—'}</Badge>
                  : <select className="select" value={e.cplx || 'Sedang'} onChange={(ev: Ev) => patch(e.id, { cplx: ev.target.value })} style={{ height: 28 }}>{EST_UNC.map(u => <option key={u}>{u}</option>)}</select>}</td>
                <td>{locked
                  ? <Badge kind={lvlKind(e.subj)}>{e.subj || '—'}</Badge>
                  : <select className="select" value={e.subj || 'Sedang'} onChange={(ev: Ev) => patch(e.id, { subj: ev.target.value })} style={{ height: 28 }}>{EST_UNC.map(u => <option key={u}>{u}</option>)}</select>}</td>
                <td><Badge kind={lvlKind(e.unc)}>{e.unc}</Badge></td>
                <td><Badge kind={e.risk === 'Signifikan' ? 'red' : 'gray'}>{e.risk === 'Signifikan' ? 'Signifikan' : 'Non-sig.'}</Badge></td>
              </tr>
            ))}
            {!register.length && <tr><td colSpan={5} className="tiny muted" style={{ textAlign: 'center', padding: 16 }}>Belum ada estimasi — tambahkan di tab Inventaris.</td></tr>}
          </tbody>
        </table>
        <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.book size={15} /></span>
            <span style={{ fontSize: 12, lineHeight: 1.45 }}>SA 540 revisi menuntut penilaian risiko bawaan secara <b>terpisah</b> dari risiko pengendalian, dengan mempertimbangkan derajat <b>kompleksitas, subjektivitas, & ketidakpastian estimasi</b> pada spektrum risiko bawaan (¶4, ¶13).</span>
          </div>
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- Tab: Respons & Rentang ---------------- */
/* PR-2 — `docUid` menunjuk id lampiran DMS SERVER, bukan lagi uid `localStorage`.
   Lihat expert_docs.tsx untuk sebabnya. */
function docName(docs: ExpertDoc[], uid?: string) {
  if (!uid) return 'belum ditautkan';
  const d = docs.find(x => x.id === uid);
  if (d) return d.name || d.id;
  return isLegacyDocUid(uid)
    ? 'tautan warisan — dokumen ada di perangkat lama, bukan di DMS'
    : 'tautan putus — dokumen tak ada lagi di DMS';
}

/** Ukuran manusiawi; laporan pakar kerap besar dan batasnya nyata (lihat EXPERT_DOC_MAX_MB). */
function docSize(bytes: number) {
  return bytes >= 1048576 ? (bytes / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB';
}

function F540Response({ register, sensitivity, setSensitivity, locked, expertEval, toggleExpert, setExpertDoc }: { register: Estimate[]; sensitivity: Record<string, SensDriver[]>; setSensitivity: (id: string, drivers: SensDriver[]) => void; locked: boolean; expertEval: ExpertEvalState; toggleExpert: (ref: string, key: ExpertEvalStepKey, on: boolean) => void; setExpertDoc: (ref: string, uid: string) => void }) {
  /* Dokumen pakar dibaca dari DMS server — daftar yang SAMA dengan yang dipakai
     gerbang sign-off (`useEstimateExpertGate`), agar keduanya tak dapat menyimpang. */
  const { docs: expertDocs, ready: docsReady, engId: docsEng, reload: reloadDocs } = useExpertDocs();
  const [upBusy, setUpBusy] = useState540(false);
  const [upErr, setUpErr] = useState540('');
  const approaches = [
    { k: 'Uji bagaimana manajemen membuat estimasi', ref: '¶18', d: 'Evaluasi metode, asumsi signifikan, & data; uji penerapan & matematika model.', used: 'Persediaan · Garansi' },
    { k: 'Uji peristiwa hingga tanggal laporan auditor', ref: '¶21(a)', d: 'Bukti dari peristiwa setelah periode yang menguatkan/menyangkal estimasi.', used: 'Piutang (penerimaan kas pasca-periode)' },
    { k: 'Kembangkan estimasi/rentang titik auditor', ref: '¶21(b)', d: 'Auditor menyusun nilai/rentang independen untuk mengevaluasi titik manajemen.', used: 'CKPN · Goodwill' },
    { k: 'Uji efektivitas pengendalian atas proses estimasi', ref: '¶20', d: 'Bila bermaksud mengandalkan kontrol atas penyusunan estimasi.', used: 'ITGC model ECL' },
  ];
  const indep = register.filter(e => e.approach === 'Rentang independen');
  const [selId, setSelId] = useState540((indep[0] || register[0])?.id || 'E-01');
  const sel = register.find(e => e.id === selId) || register[0] || null;
  const drivers: SensDriver[] = (sel && sensitivity[sel.id]) || [];
  /* Dasar pengukuran = BATAS TERDEKAT (kanon `estimateMisstatement`), bukan titik
     tengah. Di dalam rentang → nol salah saji; kecondongan terhadap titik tengah
     tetap dilaporkan, tetapi sebagai indikator arah ¶32. */
  const rng = sel ? effectiveRange(sel) : null;
  const mis = sel && rng ? estimateMisstatement(sel.mgmt, rng.lo, rng.hi, sel.plSign) : null;
  const sens = sel && rng ? estimateSensitivity(sel.mgmt, rng.lo, rng.hi, drivers) : null;
  /* butir 16 — dampak per 1% TERDERIVASI bila rentangnya punya skenario; input
     manual hanya fallback dan harus terbaca sebagai fallback. */
  const autoPerPct = sel ? derivedPerPct(sel.derivation, sel.mgmt) : null;
  const setDrivers = (fn: (l: SensDriver[]) => SensDriver[]) => { if (!sel || locked) return; setSensitivity(sel.id, fn(drivers)); };
  const patchD = (id: string, p: Partial<SensDriver>) => setDrivers(l => l.map(d => d.id === id ? { ...d, ...p } : d));
  const addD = () => setDrivers(l => [...l, { id: 'd' + (l.reduce((m, d) => Math.max(m, +(/(\d+)$/.exec(d.id)?.[1] || 0)), 0) + 1), label: 'Asumsi baru', deltaPct: 0, perPct: 0 }]);
  const delD = (id: string) => setDrivers(l => l.filter(d => d.id !== id));
  return (
    <div className="grid split" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Respons Audit atas Estimasi (¶18–21)</h3><div style={{ flex: 1 }} /></div>
          <div style={{ padding: '6px 14px 14px' }}>
            {approaches.map((a, i) => (
              <div key={i} className="row gap10" style={{ padding: '11px 0', alignItems: 'flex-start', borderBottom: i < approaches.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                <span style={{ color: 'var(--blue)', flex: '0 0 auto', marginTop: 1 }}><I.checkCircle size={16} /></span>
                <div style={{ flex: 1 }}>
                  <div className="row jb ac"><div style={{ fontSize: 12, fontWeight: 700 }}>{a.k}</div><span className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{a.ref}</span></div>
                  <div className="tiny muted" style={{ lineHeight: 1.45, margin: '2px 0 5px' }}>{a.d}</div>
                  <div className="chip tiny" style={{ background: 'var(--surface-2)' }}>Diterapkan pada: {a.used}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Rentang Independen — {sel ? sel.name : '—'}</h3><div style={{ flex: 1 }} />
            <select className="select" value={selId} onChange={(e: Ev) => setSelId(e.target.value)} style={{ height: 28, maxWidth: 220 }}>{register.map(e => <option key={e.id} value={e.id}>{e.id} · {e.name}</option>)}</select>
          </div>
          {sel ? (
            <div style={{ padding: 14 }}>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 12 }}>
                <KvBox label="Titik Manajemen" v={sel.mgmt.toLocaleString('id-ID')} />
                <KvBox label={`Rentang Auditor${rng && rng.source === 'derived' ? ' · terhitung' : ''}`} v={`${(rng ? rng.lo : 0).toLocaleString('id-ID')}–${(rng ? rng.hi : 0).toLocaleString('id-ID')}`} accent={rng && rng.grounded ? 'var(--blue)' : 'var(--amber)'} />
                <KvBox label="Salah Saji → SAD"
                  v={mis && mis.amount ? mis.amount.toLocaleString('id-ID') : '—'}
                  accent={mis && mis.amount < 0 ? 'var(--num-neg)' : mis && mis.amount ? 'var(--green)' : 'var(--ink-4)'} />
              </div>
              {mis && mis.basis === 'indeterminate' ? (
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55 }}>Rentang auditor tidak koheren (batas bawah melebihi batas atas) — salah saji <b>tidak dapat diukur</b> dan tidak diakumulasi ke SA 450. Perbaiki rentang di tab Inventaris.</p>
              ) : mis && mis.amount ? (
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55 }}>Titik manajemen <b>{sel.mgmt.toLocaleString('id-ID')}</b> berada <b>di luar</b> rentang wajar auditor. Selisih ke <b>batas terdekat</b> ({(mis.bound ?? 0).toLocaleString('id-ID')}) sebesar <b>{Math.abs(mis.amount).toLocaleString('id-ID')} jt</b> mengalir ke SAD Ledger sebagai kemungkinan salah saji judgmental <span className="mono">EST-{sel.id}</span>; dievaluasi bersama indikasi bias & telaah retrospektif (SA 240).</p>
              ) : (
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55 }}>Titik manajemen <b>{sel.mgmt.toLocaleString('id-ID')}</b> berada <b>di dalam</b> rentang wajar auditor — rentang itu sendiri zona yang dapat diterima, sehingga <b>tidak ada salah saji</b> untuk diakumulasi ke SA 450. {mis && mis.profitTilt ? <>Namun titik itu {mis.favoursProfit ? <b>menguntungkan laba</b> : 'menekan laba'} sebesar <b>{Math.abs(mis.profitTilt).toLocaleString('id-ID')} jt</b> dibanding titik tengah ({(mis.midpoint || 0).toLocaleString('id-ID')}) — dicatat sebagai indikator <b>arah</b> (¶32), bukan salah saji.</> : null}</p>
              )}
            </div>
          ) : <div className="tiny muted" style={{ padding: 16 }}>Belum ada estimasi.</div>}
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Penggunaan Pakar (SA 620)" sub={sel ? sel.id + ' · ' + sel.approach : ''}>
          {sel && sel.approach === EST_APPROACH_EXPERT ? (
            <>
              <div className="row ac jb" style={{ marginBottom: 7 }}>
                <span className="tiny muted">Evaluasi tersimpan per-perikatan</span>
                <Badge kind={expertEvalComplete(expertEval && expertEval[sel.id]) ? 'green' : 'amber'}>
                  {expertEvalDone(expertEval && expertEval[sel.id])}/{EXPERT_EVAL_STEPS.length}
                </Badge>
              </div>
              <div style={{ display: 'grid', gap: 4 }}>
                {EXPERT_EVAL_STEPS.map(s => (
                  <Check key={s.key} label={s.t} title={s.ref} disabled={locked}
                    on={!!(expertEval && expertEval[sel.id] && expertEval[sel.id][s.key])}
                    onChange={(on: boolean) => toggleExpert(sel.id, s.key, on)} />
                ))}
              </div>

              {/* Tautan ke laporan pakar di DMS. Disimpan sebagai id lampiran, bukan
                  nama berkas: tautan harus PUTUS bila dokumennya dicabut — dan kini
                  pencabutan itu terlihat SERVER, bukan hanya di perangkat ini. */}
              <div className="field" style={{ marginTop: 10 }}>
                <label>Laporan pakar (DMS perikatan · SHA-256 diverifikasi server)</label>
                {locked ? (
                  <div style={{ fontSize: 12 }}>{docName(expertDocs, expertEval && expertEval[sel.id] && expertEval[sel.id].docUid)}</div>
                ) : (
                  <select className="select" style={{ height: 28 }}
                    value={(expertEval && expertEval[sel.id] && expertEval[sel.id].docUid) || ''}
                    onChange={(e: Ev) => setExpertDoc(sel.id, e.target.value)}>
                    <option value="">— belum ditautkan —</option>
                    {expertDocs.map(d => <option key={d.id} value={d.id}>{d.name} · {docSize(d.size)}</option>)}
                  </select>
                )}
                {isLegacyDocUid(expertEval && expertEval[sel.id] && expertEval[sel.id].docUid) && (
                  <div className="tiny" style={{ color: 'var(--amber)', marginTop: 4, lineHeight: 1.45 }}>
                    <b>Tautan warisan.</b> Dokumen ini tertaut ke bukti lokal perangkat lama, bukan ke DMS — server tak dapat memverifikasi keberadaannya. Unggah ulang laporan pakar di bawah, lalu tautkan kembali. Setelah penegakan penuh menyala, tautan warisan tidak lagi diterima untuk sign-off.
                  </div>
                )}
                {!locked && (
                  <div style={{ marginTop: 8 }}>
                    <FileDropField compact multiple={false}
                      hint={`Unggah laporan pakar ke DMS perikatan — PDF · XLSX · DOCX, maks ${EXPERT_DOC_MAX_MB} MB`}
                      onFiles={(files: DropMeta[]) => {
                        const f = files && files[0];
                        if (!f) return;
                        setUpErr(''); setUpBusy(true);
                        uploadExpertDoc(docsEng, sel.id, f).then(res => {
                          setUpBusy(false);
                          if (res.ok !== true) { setUpErr(res.message); return; }
                          reloadDocs();
                          setExpertDoc(sel.id, res.doc.id);
                          /* Penghitung bukti kertas kerja masih membaca store lokal; catatan
                             ini menjaganya jujur. Ia BUKAN sumber gerbang — gerbang memakai
                             id lampiran server di atas. */
                          try { amsAttachEvidence('sa540', { file: res.doc.name, type: 'Laporan pakar (SA 620)', std: 'SA 620', classified: 'sa540', sha256: res.doc.sha256, attachmentId: res.doc.id }); } catch (e) { /* store lokal opsional */ }
                        });
                      }} />
                    {upBusy && <div className="tiny muted" style={{ marginTop: 4 }}>Mengunggah & memverifikasi SHA-256 di server…</div>}
                    {!!upErr && (
                      <div className="tiny" style={{ color: 'var(--red)', marginTop: 4, lineHeight: 1.45 }}>
                        <b>Unggahan ditolak:</b> {upErr}
                      </div>
                    )}
                  </div>
                )}
                {docsReady && !expertDocs.length && !upBusy && (
                  <div className="tiny" style={{ color: 'var(--amber)', marginTop: 6, lineHeight: 1.45 }}>
                    Belum ada laporan pakar di DMS perikatan ini.
                  </div>
                )}
                {!docsReady && (
                  <div className="tiny muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
                    Daftar dokumen DMS belum dapat dibaca (server tak terjangkau) — tautan tidak dapat diverifikasi dari perangkat ini.
                  </div>
                )}
              </div>
              <div className="tiny muted" style={{ marginTop: 9, lineHeight: 1.5 }}>
                Estimasi ini bergantung sepenuhnya pada pekerjaan pihak ketiga. Kecukupan pekerjaan itu adalah <b>bukti audit</b> (SA 500 ¶8) — bukan asumsi.
              </div>
            </>
          ) : (
            <div className="tiny muted" style={{ lineHeight: 1.5 }}>
              Jalur respons estimasi ini <b>bukan</b> "{EST_APPROACH_EXPERT}", sehingga evaluasi pakar tidak dituntut. Ubah pendekatan di tab Inventaris bila estimasi bersandar pada pekerjaan pihak ketiga.
            </div>
          )}
        </Panel>
        <Panel noBody>
          <div className="panel-h"><h3>Analisis Sensitivitas — {sel ? sel.id : '—'}</h3><div style={{ flex: 1 }} />
            <Badge kind={autoPerPct != null ? 'blue' : 'amber'}>{autoPerPct != null ? 'dapat diturunkan' : 'input manual'}</Badge>
            {!locked && sel && <Btn sm style={{ marginLeft: 8 }} onClick={addD}><I.plus size={12} /> Driver</Btn>}
          </div>
          <div style={{ padding: 12 }}>
            <div className="tiny" style={{ color: autoPerPct != null ? 'var(--ink-2)' : 'var(--amber)', lineHeight: 1.45, marginBottom: 8 }}>
              {autoPerPct != null
                ? <>Sebaran skenario rentang menyiratkan dampak <b>{autoPerPct.toLocaleString('id-ID')} jt per 1%</b>. {!locked && <>Pakai tombol di tiap baris untuk memakainya alih-alih mengetik.</>}</>
                : <>Rentang estimasi ini belum punya skenario, sehingga dampak per 1% <b>diketik auditor</b> — verdict di bawah hanya sekuat angka itu.</>}
            </div>
            <table className="dtbl" style={{ marginTop: -4 }}>
              <thead><tr><th>Asumsi</th><th className="num" style={{ width: 56 }}>Δ%</th><th className="num" style={{ width: 64 }}>per 1%</th><th className="num" style={{ width: 76 }}>Dampak</th>{!locked && <th style={{ width: 24 }}></th>}</tr></thead>
              <tbody>
                {sens && sens.drivers.map(d => (
                  <tr key={d.id}>
                    <td style={{ whiteSpace: 'normal' }}>{locked ? d.label : <input className="input" value={d.label} onChange={(e: Ev) => patchD(d.id, { label: e.target.value })} style={{ height: 24 }} />}</td>
                    <td className="num mono">{locked ? d.deltaPct : <input className="input mono" type="number" value={d.deltaPct} onChange={(e: Ev) => patchD(d.id, { deltaPct: +e.target.value })} style={{ height: 24, width: 50, textAlign: 'right' }} />}</td>
                    <td className="num mono">
                      {locked ? d.perPct : (
                        <span className="row ac gap6" style={{ justifyContent: 'flex-end' }}>
                          <input className="input mono" type="number" value={d.perPct} onChange={(e: Ev) => patchD(d.id, { perPct: +e.target.value })} style={{ height: 24, width: 58, textAlign: 'right' }} />
                          {autoPerPct != null && d.perPct !== autoPerPct && (
                            <button className="btn sm icon" title={`Turunkan dari skenario rentang (${autoPerPct.toLocaleString('id-ID')})`} onClick={() => patchD(d.id, { perPct: autoPerPct })}><I.arrowLeft size={11} /></button>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="num mono" style={{ fontWeight: 700, color: d.impact < 0 ? 'var(--red)' : d.impact > 0 ? 'var(--green)' : 'var(--ink-4)' }}>{d.impact ? d.impact.toLocaleString('id-ID') : '—'}</td>
                    {!locked && <td><button className="btn sm icon" title="Hapus" onClick={() => delD(d.id)}><I.x size={11} /></button></td>}
                  </tr>
                ))}
                {sens && !sens.drivers.length && <tr><td colSpan={locked ? 4 : 5} className="tiny muted" style={{ textAlign: 'center', padding: 12 }}>Tambah driver asumsi untuk analisis.</td></tr>}
              </tbody>
            </table>
            {sens && (
              <div className="panel" style={{ marginTop: 10, padding: '9px 11px', background: sens.withinRange ? 'var(--green-bg)' : 'var(--amber-bg)', borderColor: 'transparent' }}>
                <div className="row jb ac" style={{ marginBottom: 3 }}><span className="tiny muted">Total dampak</span><span className="mono tiny" style={{ fontWeight: 700, color: sens.totalImpact < 0 ? 'var(--red)' : 'var(--green)' }}>{sens.totalImpact.toLocaleString('id-ID')} jt</span></div>
                <div className="row jb ac" style={{ marginBottom: 5 }}><span className="tiny muted">Titik baru</span><span className="mono tiny" style={{ fontWeight: 700 }}>{sens.newPoint.toLocaleString('id-ID')} jt</span></div>
                <div className="row ac gap8"><span style={{ color: sens.withinRange ? 'var(--green)' : 'var(--amber)', flex: '0 0 auto' }}>{sens.withinRange ? <I.checkCircle size={14} /> : <I.alert size={14} />}</span><span style={{ fontSize: 11, lineHeight: 1.4 }}>{sens.withinRange ? 'Titik baru tetap dalam rentang auditor — estimasi tahan terhadap perubahan asumsi.' : <>Titik baru <b>keluar</b> rentang auditor sejauh <b>{sens.breach.toLocaleString('id-ID')} jt</b> — sensitif; pertimbangkan sebagai Hal Audit Utama (SA 701).</>}</span></div>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Bias & Pengungkapan ---------------- */
/* ---- Telaah retrospektif TERHITUNG (PR-5 · butir 18-19) ----
   Dulu klaim "CKPN PY understated 42%" adalah teks bebas di baris bias: tak
   dapat dibantah karena tak berasal dari apa pun. Kini ia turunan dua angka,
   dan tanpa keduanya panel berkata TAK DAPAT DIHITUNG — bukan 0%. */
function F540Retrospective({ register, setRegister, locked }: { register: Estimate[]; setRegister: (fn: (l: Estimate[]) => Estimate[]) => void; locked: boolean }) {
  const summary = retrospectiveSummary(register);
  const patchRetro = (id: string, p: Partial<Retrospective>) =>
    setRegister(l => l.map(e => e.id === id ? { ...e, retrospective: { ...(e.retrospective || {}), ...p } } : e));
  const numOrUndef = (v: string) => v.trim() === '' ? undefined : +v;
  return (
    <Panel noBody>
      <div className="panel-h"><h3>Telaah Retrospektif — Estimasi PY vs Realisasi</h3><span className="sub mono">SA 540 ¶32 · SA 240 ¶32b</span><div style={{ flex: 1 }} />
        {summary.systematic && <Badge kind="red">Pola berulang</Badge>}
        <span className="tiny muted" style={{ marginLeft: 8 }}>{summary.rows.length - summary.incomputable.length}/{summary.rows.length} terhitung</span>
      </div>
      <table className="dtbl">
        <thead><tr>
          <th>Estimasi</th>
          <th className="num" style={{ width: 92 }}>Estimasi PY</th>
          <th className="num" style={{ width: 92 }}>Realisasi</th>
          <th className="num" style={{ width: 96 }}>Selisih</th>
          <th style={{ width: 108 }}>Arah</th>
        </tr></thead>
        <tbody>
          {summary.rows.map(r => {
            const v = r.variance;
            return (
              <tr key={r.id}>
                <td style={{ fontWeight: 600, whiteSpace: 'normal', lineHeight: 1.35 }}>
                  {r.name}
                  {r.retro && r.retro.source && <div className="tiny muted" style={{ fontWeight: 400, marginTop: 2 }}>{r.retro.source}</div>}
                </td>
                <td className="num mono">{locked
                  ? (r.retro && r.retro.pyEstimate != null ? r.retro.pyEstimate.toLocaleString('id-ID') : '—')
                  : <input className="input mono" type="number" value={(r.retro && r.retro.pyEstimate) ?? ''} onChange={(e: Ev) => patchRetro(r.id, { pyEstimate: numOrUndef(e.target.value) })} style={{ height: 24, width: 82, textAlign: 'right' }} />}</td>
                <td className="num mono">{locked
                  ? (r.retro && r.retro.actual != null ? r.retro.actual.toLocaleString('id-ID') : '—')
                  : <input className="input mono" type="number" value={(r.retro && r.retro.actual) ?? ''} onChange={(e: Ev) => patchRetro(r.id, { actual: numOrUndef(e.target.value) })} style={{ height: 24, width: 82, textAlign: 'right' }} />}</td>
                <td className="num mono" style={{ fontWeight: 700, color: v ? (v.favouredProfit ? 'var(--amber)' : 'var(--ink-2)') : 'var(--ink-4)' }}>
                  {v ? `${v.diff < 0 ? '(' : ''}${Math.abs(v.diff).toLocaleString('id-ID')}${v.diff < 0 ? ')' : ''} · ${(v.pct * 100).toFixed(0)}%` : '—'}
                </td>
                <td>
                  {v
                    ? <Badge kind={r.flagged ? 'amber' : 'green'}>{v.direction === 'understated' ? 'Understated' : v.direction === 'overstated' ? 'Overstated' : 'Akurat'}</Badge>
                    : <span className="tiny muted">tak dapat dihitung</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="panel" style={{ margin: 12, padding: '10px 12px', background: summary.systematic ? 'var(--amber-bg)' : 'var(--blue-050)', borderColor: 'transparent' }}>
        <div className="row gap8" style={{ alignItems: 'flex-start' }}>
          <span style={{ color: summary.systematic ? 'var(--amber)' : 'var(--blue)', flex: '0 0 auto' }}><I.book size={15} /></span>
          <span style={{ fontSize: 12, lineHeight: 1.45 }}>
            {summary.systematic
              ? <><b>{summary.flagged.length} estimasi</b> meleset ke arah yang menguntungkan laba melebihi ambang — pola berulang seperti ini adalah indikator bias manajemen (¶32) dan wajib dipertimbangkan bersama SA 240 ¶32(b).</>
              : summary.flagged.length
                ? <><b>{summary.flagged.map(f => f.id).join(', ')}</b> meleset ke arah yang menguntungkan laba. Satu kejadian belum membentuk pola, tetapi tetap dipertimbangkan dalam evaluasi kewajaran estimasi.</>
                : <>Selisih hanya dihitung bila estimasi PY <b>dan</b> realisasinya ada. {summary.incomputable.length} estimasi belum dapat ditelaah — isi kedua angkanya agar arah bias dapat dinilai, bukan diklaim.</>}
          </span>
        </div>
      </div>
    </Panel>
  );
}

function F540Bias({ bias, setBias, me, locked, register, setRegister }: { bias: BiasRow[]; setBias: (fn: (l: BiasRow[]) => BiasRow[]) => void; me: string; locked: boolean; register: Estimate[]; setRegister: (fn: (l: Estimate[]) => Estimate[]) => void }) {
  const patch = (id: string, p: Partial<BiasRow>) => setBias(l => l.map(b => b.id === id ? { ...b, ...p, by: me, at: estToday() } : b));
  const add = () => { const id = nextBId(bias); setBias(l => [...l, { id, t: 'Indikator bias baru', est: '', flag: 'amber', d: '', by: me, at: estToday() }]); };
  const del = (id: string) => setBias(l => l.filter(b => b.id !== id));
  const perhatian = bias.filter(b => b.flag !== 'green').length;
  return (
    <div className="grid split" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Indikator Kemungkinan Bias Manajemen (¶32)</h3><div style={{ flex: 1 }} /><Badge kind="amber">{perhatian} perhatian</Badge>{!locked && <Btn sm style={{ marginLeft: 8 }} onClick={add}><I.plus size={12} /> Tambah</Btn>}</div>
          <table className="dtbl">
            <thead><tr><th>Indikator</th><th style={{ width: 150 }}>Estimasi</th><th style={{ width: 120 }}>Status</th>{!locked && <th style={{ width: 30 }}></th>}</tr></thead>
            <tbody>
              {bias.map(b => (
                <tr key={b.id}>
                  <td style={{ fontWeight: 600, whiteSpace: 'normal', lineHeight: 1.35 }}>
                    {locked ? <>{b.t}<div className="tiny muted" style={{ fontWeight: 400, marginTop: 2 }}>{b.d}</div></>
                      : <div style={{ display: 'grid', gap: 4 }}>
                          <textarea className="input" value={b.t} onChange={(e: Ev) => patch(b.id, { t: e.target.value })} style={{ height: 34, padding: 6, lineHeight: 1.3, resize: 'vertical', fontWeight: 600 }} />
                          <input className="input" value={b.d} onChange={(e: Ev) => patch(b.id, { d: e.target.value })} placeholder="Detail/dasar…" style={{ height: 26, fontWeight: 400 }} />
                        </div>}
                  </td>
                  <td className="tiny">{locked ? b.est : <input className="input" value={b.est} onChange={(e: Ev) => patch(b.id, { est: e.target.value })} style={{ height: 26 }} />}</td>
                  <td>{locked ? (b.flag === 'green' ? <Badge kind="green">Wajar</Badge> : <Badge kind="amber">Perhatian</Badge>)
                    : <select className="select" value={b.flag} onChange={(e: Ev) => patch(b.id, { flag: e.target.value })} style={{ height: 28, fontSize: 12 }}>{BIAS_FLAG.map(f => <option key={f} value={f}>{f === 'green' ? 'Wajar' : 'Perhatian'}</option>)}</select>}</td>
                  {!locked && <td><button className="btn sm icon" title="Hapus" onClick={() => del(b.id)}><I.x size={12} /></button></td>}
                </tr>
              ))}
              {!bias.length && <tr><td colSpan={locked ? 3 : 4} className="tiny muted" style={{ textAlign: 'center', padding: 16 }}>Belum ada indikator bias.</td></tr>}
            </tbody>
          </table>
          <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
            <div className="row gap8" style={{ alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--amber)', flex: '0 0 auto' }}><I.alert size={15} /></span>
              <span style={{ fontSize: 12, lineHeight: 1.45 }}>Indikator bias <b>secara individual</b> belum tentu salah saji, namun <b>secara kolektif</b> dipertimbangkan dalam mengevaluasi kewajaran estimasi & implikasi terhadap audit secara keseluruhan (¶32, SA 240 ¶32b).</span>
            </div>
          </div>
        </Panel>

        <F540Retrospective register={register} setRegister={setRegister} locked={locked} />

        <Panel noBody>
          <div className="panel-h"><h3>Evaluasi Pengungkapan Estimasi (¶26–27)</h3><div style={{ flex: 1 }} /></div>
          <div style={{ padding: '6px 14px 14px' }}>
            {[
              { t: 'Pengungkapan ketidakpastian estimasi memadai untuk estimasi risiko tinggi', done: true },
              { t: 'Asumsi signifikan & sensitivitas diungkap (CKPN, goodwill, imbalan kerja)', done: true },
              { t: 'Metode & sumber data utama dijelaskan dalam CALK', done: true },
              { t: 'Pengungkapan tidak menyesatkan & seimbang (tidak bias)', done: false },
            ].map((p, i) => (
              <div key={i} className="row gap10" style={{ padding: '10px 0', alignItems: 'flex-start', borderBottom: i < 3 ? '1px solid var(--line-soft)' : 0 }}>
                <span style={{ flex: '0 0 auto', marginTop: 1, color: p.done ? 'var(--green)' : 'var(--amber)' }}>{p.done ? <I.checkCircle size={16} /> : <I.clock size={16} />}</span>
                <div style={{ flex: 1, fontSize: 12, lineHeight: 1.45 }}>{p.t}</div>
              </div>
            ))}
          </div>
        </Panel>

        <WpPanel moduleId="sa540" title="Kertas Kerja — Sign-off, Bukti & Kesimpulan (SA 540/230)" />
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Representasi Tertulis (¶37 → SA 580)">
          <p className="tiny muted" style={{ margin: '0 0 8px', lineHeight: 1.5 }}>Diperoleh representasi bahwa metode, asumsi, & data yang dipakai manajemen <b>wajar</b> untuk mencapai pengakuan/pengukuran sesuai kerangka pelaporan.</p>
          <div className="row jb ac" style={{ fontSize: 12, padding: '8px 10px', border: '1px solid var(--line-soft)', borderRadius: 7 }}>
            <span className="row ac gap8"><span style={{ color: 'var(--blue)' }}><I.doc size={14} /></span>Lihat Surat Representasi</span>
            <I.arrowRight size={14} style={{ color: 'var(--ink-4)' }} />
          </div>
        </Panel>
        <Panel title="Komunikasi TCWG (SA 260)">
          <div style={{ display: 'grid', gap: 7 }}>
            {['Area ketidakpastian estimasi tinggi & dampaknya', 'Indikasi bias manajemen yang teridentifikasi', 'Selisih titik mgmt vs rentang auditor (CKPN)'].map((t, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 12, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--blue)', flex: '0 0 auto', marginTop: 1 }}><I.mail size={14} /></span>
                <span style={{ lineHeight: 1.4 }}>{t}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}



/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SA540View };
