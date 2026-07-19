/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAudit, useAuth, useFirm } from './contexts';
import { CAP } from './rbac';
import { I } from './icons';
import { Badge, Btn, Panel } from './ui';
import { usePhaseGate, PhaseGateDialog, eqrStatusFor } from './wp_signoff';
import { useEthicsGate } from './ethics_gate';
import { useMemberIndependenceGate } from './view_independence';

/* ============================================================
   Asseris — Audit Opinion Generator · Engine & Panels
   (SA 700 / 705 / 701 / 706 / 570 / 710 / 720 · ISQM 2 / SA 220)
   Shared constants, opinion-determination engine, KAM workshop,
   review & sign-off. Loaded BEFORE view_opinion.jsx.
   ============================================================ */
const { useState: useStateOP } = React;

const OPINIONS = {
  unmodified: { title: 'Wajar Tanpa Modifikasian', short: 'WTM', basisTitle: 'Basis untuk Opini', k: 'green' },
  qualified:  { title: 'Wajar Dengan Pengecualian', short: 'WDP', basisTitle: 'Basis untuk Opini Wajar Dengan Pengecualian', k: 'amber' },
  adverse:    { title: 'Tidak Wajar', short: 'TW', basisTitle: 'Basis untuk Opini Tidak Wajar', k: 'red' },
  disclaimer: { title: 'Tidak Menyatakan Pendapat', short: 'TMP', basisTitle: 'Basis untuk Tidak Menyatakan Pendapat', k: 'red' },
};

const SIGNERS = {
  partner1: { name: 'Hartono Wijaya, CPA', reg: 'AP.1142', role: 'Rekan Perikatan' },
  partner2: { name: 'Rudi Gunawan, CPA', reg: 'AP.0987', role: 'Rekan' },
  partner3: { name: 'Sari Dewanti, CPA', reg: 'AP.1330', role: 'Rekan' },
};

/* ---- Uncorrected misstatements carried from SAD (SA 450) ----
   pbt = efek laba sebelum pajak; na = efek aset neto. qual flags drive
   qualitative materiality even when quantitatively below threshold. */
const UNCORR = [
  { id: 'M-01', desc: 'Piutang fiktif belum dibalik (channel stuffing Q4)', type: 'Factual', fsli: 'Pendapatan / Piutang', pbt: -1_950_000_000, na: -1_950_000_000, origin: 'current', qual: ['fraud', 'trend', 'covenant'] },
  { id: 'M-03', desc: 'Proyeksi salah saji sampling piutang (SA 530)', type: 'Projected', fsli: 'Piutang Usaha', pbt: -640_000_000, na: -640_000_000, origin: 'current', qual: ['estimate'] },
  { id: 'M-04', desc: 'Selisih estimasi CKPN (PSAK 71)', type: 'Judgmental', fsli: 'CKPN / Beban Penyisihan', pbt: -680_000_000, na: -680_000_000, origin: 'current', qual: ['estimate'] },
  { id: 'M-07', desc: 'Reklas utang bank ≤1 thn ke liabilitas lancar', type: 'Factual', fsli: 'Klasifikasi Liabilitas', pbt: 0, na: 0, origin: 'current', qual: ['classification', 'covenant'] },
  { id: 'M-08', desc: 'Beban dibayar dimuka belum diamortisasi (carryover PY)', type: 'Judgmental', fsli: 'Beban Dibayar Dimuka', pbt: 0, na: -180_000_000, origin: 'prior', qual: [] },
];
const QUAL_LABEL = { fraud: 'Indikasi kecurangan', trend: 'Menutupi tren laba', covenant: 'Memengaruhi covenant', classification: 'Salah klasifikasi', estimate: 'Bias estimasi terarah' };
const TYPE_KIND = { Factual: 'blue', Judgmental: 'purple', Projected: 'teal' };

/* aggregate uncorrected effect under rollover (current-year) or
   iron-curtain (cumulative incl. prior-year) method */
function aggUncorr(method: any) {
  const inScope = method === 'ironcurtain' ? UNCORR : UNCORR.filter((m: any) => m.origin === 'current');
  const pbt = inScope.reduce((s, m) => s + Math.abs(m.pbt), 0);
  const na = inScope.reduce((s, m) => s + Math.abs(m.na), 0);
  const quals = [...new Set(inScope.flatMap((m: any) => m.qual))];
  return { pbt, na, quals, count: inScope.length };
}

/* SA 450 → severity classification of misstatement */
function classifyMis(agg: any, om: any) {
  const ratio = Math.max(agg.pbt, agg.na) / om;
  const hasFraud = agg.quals.includes('fraud');
  if (ratio >= 2 || (hasFraud && ratio >= 1)) return { sev: 'pervasive', ratio, reason: ratio >= 2 ? 'Agregat ≥ 2× materialitas — tersebar luas.' : 'Indikasi kecurangan dengan dampak ≥ materialitas.' };
  if (ratio >= 1) return { sev: 'material', ratio, reason: 'Agregat melampaui materialitas keseluruhan.' };
  if (agg.quals.length) return { sev: 'material', ratio, reason: 'Material secara kualitatif (SA 450.A21) meski di bawah ambang kuantitatif.' };
  return { sev: 'none', ratio, reason: 'Di bawah materialitas, tanpa faktor kualitatif signifikan.' };
}

const SEV_MIS = { none: 0, material: 1, pervasive: 2 };
const SEV_SCOPE = { sufficient: 0, limited: 1, pervasive: 2 };

/* SA 705 decision logic → {opinion, driver, pervasive} */
function recommendOpinion({ misSev, scope, gc }: any) {
  const ms = (SEV_MIS as any)[misSev], ss = (SEV_SCOPE as any)[scope];
  // going concern with inadequate disclosure = material misstatement
  const gcMis = gc === 'inadequate' ? 1 : 0;
  const effMis = Math.max(ms, gcMis);
  if (ss === 2) return { opinion: 'disclaimer', driver: 'evidence', pervasive: true };
  if (effMis === 2) return { opinion: 'adverse', driver: 'misstatement', pervasive: true };
  if (effMis === 1) return { opinion: 'qualified', driver: 'misstatement', pervasive: false };
  if (ss === 1) return { opinion: 'qualified', driver: 'evidence', pervasive: false };
  return { opinion: 'unmodified', driver: null, pervasive: false };
}

const kindVar = (k: any) => k === 'green' ? 'var(--green)' : k === 'amber' ? 'var(--amber)' : k === 'red' ? 'var(--red)' : 'var(--blue)';
const kindBg = (k: any) => k === 'green' ? 'var(--green-bg)' : k === 'amber' ? 'var(--amber-bg)' : k === 'red' ? 'var(--red-bg)' : 'var(--blue-100)';

function DocH({ children }: any) {
  return <div style={{ fontWeight: 800, fontSize: 12.5, margin: '0 0 6px' }}>{children}</div>;
}

/* ============================================================
   TAB 1 — Opinion Determination Engine
   ============================================================ */
function DeterminationPanel({ doc, patch }: any) {
  const { fmt } = AMS;
  const { activeEngagement } = useFirm();
  const om = activeEngagement?.materiality || 4_250_000_000;
  const pm = Math.round(om * 0.75);

  const agg = aggUncorr(doc.method);
  const auto = classifyMis(agg, om);
  const misSev = doc.misOverride === 'auto' ? auto.sev : doc.misOverride;
  const rec = recommendOpinion({ misSev, scope: doc.scope, gc: doc.gcStatus });
  const recO = (OPINIONS as any)[rec.opinion];

  const rp = (n: any) => 'Rp ' + fmt(n / 1e9, 2) + ' M';
  const bind = Math.max(agg.pbt, agg.na);

  /* SA705 matrix cells */
  const cell = (driver: any, perv: any) => {
    const op = driver === 'misstatement' ? (perv ? 'adverse' : 'qualified') : (perv ? 'disclaimer' : 'qualified');
    const active = rec.opinion !== 'unmodified' && rec.driver === driver && rec.pervasive === perv;
    const o = OPINIONS[op];
    return (
      <div style={{ padding: '11px 12px', borderRadius: 8, border: '1.5px solid ' + (active ? kindVar(o.k) : 'var(--line)'), background: active ? kindBg(o.k) : '#fff', position: 'relative' }}>
        {active && <span style={{ position: 'absolute', top: 8, right: 9, width: 8, height: 8, borderRadius: '50%', background: kindVar(o.k) }} />}
        <div style={{ fontWeight: 700, fontSize: 13 }}>{o.title}</div>
        <div className="tiny muted" style={{ marginTop: 2 }}>{o.short} · {driver === 'misstatement' ? 'SA 705.7–8' : 'SA 705.9–10'}</div>
      </div>
    );
  };

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 380px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>

        <Panel title="Salah Saji Tidak Dikoreksi" sub="Diteruskan dari SAD Ledger — SA 450">
          <div className="row ac jb" style={{ marginBottom: 9 }}>
            <span className="tiny muted">Metode evaluasi agregat</span>
            <div className="seg">
              {[['rollover', 'Rollover'], ['ironcurtain', 'Iron Curtain']].map(([v, l]) =>
                <button key={v} className={doc.method === v ? 'on' : ''} onClick={() => patch({ method: v })}>{l}</button>)}
            </div>
          </div>
          <table className="dtbl" style={{ width: '100%' }}>
            <thead><tr>
              <th style={{ textAlign: 'left' }}>Ref</th><th style={{ textAlign: 'left' }}>Uraian</th>
              <th>Jenis</th><th style={{ textAlign: 'right' }}>Efek Laba</th><th style={{ textAlign: 'right' }}>Efek Aset Neto</th>
            </tr></thead>
            <tbody>
              {(doc.method === 'ironcurtain' ? UNCORR : UNCORR.filter((m: any) => m.origin === 'current')).map((m: any) => (
                <tr key={m.id}>
                  <td className="mono tiny" style={{ fontWeight: 700 }}>{m.id}</td>
                  <td style={{ maxWidth: 230 }}><div style={{ fontSize: 12 }}>{m.desc}</div>
                    {m.qual.length > 0 && <div className="row gap6" style={{ flexWrap: 'wrap', marginTop: 3 }}>{m.qual.map((q: any) => <span key={q} className="tiny" style={{ color: 'var(--red)', fontWeight: 600 }}>● {(QUAL_LABEL as any)[q]}</span>)}</div>}
                  </td>
                  <td style={{ textAlign: 'center' }}><Badge kind={(TYPE_KIND as any)[m.type]}>{m.type}</Badge></td>
                  <td className="mono" style={{ textAlign: 'right', color: m.pbt ? 'var(--red)' : 'var(--ink-3)' }}>{m.pbt ? rp(m.pbt) : '—'}</td>
                  <td className="mono" style={{ textAlign: 'right', color: m.na ? 'var(--red)' : 'var(--ink-3)' }}>{m.na ? rp(m.na) : '—'}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid var(--line-strong)', fontWeight: 700 }}>
                <td colSpan={3}>Agregat ({agg.count} item)</td>
                <td className="mono" style={{ textAlign: 'right', color: 'var(--red)' }}>{rp(agg.pbt)}</td>
                <td className="mono" style={{ textAlign: 'right', color: 'var(--red)' }}>{rp(agg.na)}</td>
              </tr>
            </tbody>
          </table>

          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 12 }}>
            <ThreshCard label="Materialitas Keseluruhan" v={rp(om)} />
            <ThreshCard label="Materialitas Pelaksanaan" v={rp(pm)} />
            <ThreshCard label="Agregat ÷ Materialitas" v={fmt(auto.ratio * 100, 0) + '%'} accent={auto.ratio >= 1 ? 'var(--red)' : 'var(--amber)'} />
          </div>
          <div className="pbar" style={{ marginTop: 10 }}>
            <span style={{ width: Math.min(100, auto.ratio * 100) + '%', background: auto.ratio >= 1 ? 'var(--red)' : 'var(--amber)' }} />
          </div>
          <div className="tiny muted" style={{ marginTop: 5 }}>Bilah relatif terhadap materialitas keseluruhan ({rp(om)}). Agregat saat ini {rp(bind)}.</div>
        </Panel>

        <Panel title="Matriks Keputusan SA 705" sub="Sifat hal × tingkat pervasif">
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr', gap: 8, alignItems: 'stretch' }}>
            <div />
            <div className="tiny muted upper" style={{ textAlign: 'center', alignSelf: 'end', paddingBottom: 4 }}>Material, tidak pervasif</div>
            <div className="tiny muted upper" style={{ textAlign: 'center', alignSelf: 'end', paddingBottom: 4 }}>Material & pervasif</div>

            <div className="tiny" style={{ fontWeight: 700, display: 'grid', alignItems: 'center' }}>Salah saji material<div className="muted" style={{ fontWeight: 400 }}>LK mengandung salah saji</div></div>
            {cell('misstatement', false)}
            {cell('misstatement', true)}

            <div className="tiny" style={{ fontWeight: 700, display: 'grid', alignItems: 'center' }}>Ketidakmampuan memperoleh bukti<div className="muted" style={{ fontWeight: 400 }}>pembatasan ruang lingkup</div></div>
            {cell('evidence', false)}
            {cell('evidence', true)}
          </div>
        </Panel>
      </div>

      {/* right: inputs + recommendation */}
      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Parameter Penentuan">
          <Field label="1 · Salah saji tidak dikoreksi (SA 450)">
            <div className="seg" style={{ width: '100%' }}>
              {[['auto', 'Auto'], ['none', 'Tdk Material'], ['material', 'Material'], ['pervasive', 'Pervasif']].map(([v, l]) =>
                <button key={v} className={doc.misOverride === v ? 'on' : ''} style={{ flex: 1, fontSize: 11 }} onClick={() => patch({ misOverride: v })}>{l}</button>)}
            </div>
            <div className="panel" style={{ marginTop: 7, padding: '7px 9px', background: 'var(--surface-2)', borderColor: 'transparent' }}>
              <div className="tiny"><b>Auto:</b> {(OPINIONS as any)[recommendOpinion({ misSev: auto.sev, scope: 'sufficient', gc: 'none' }).opinion].short !== 'WTM' ? auto.sev.toUpperCase() : 'TIDAK MATERIAL'}</div>
              <div className="tiny muted" style={{ marginTop: 2 }}>{auto.reason}</div>
            </div>
          </Field>
          <div className="divider" />
          <Field label="2 · Kecukupan bukti audit (ruang lingkup)">
            <div className="seg" style={{ width: '100%' }}>
              {[['sufficient', 'Cukup'], ['limited', 'Terbatas'], ['pervasive', 'Pervasif']].map(([v, l]) =>
                <button key={v} className={doc.scope === v ? 'on' : ''} style={{ flex: 1, fontSize: 11 }} onClick={() => patch({ scope: v })}>{l}</button>)}
            </div>
          </Field>
          <div className="divider" />
          <Field label="3 · Kelangsungan usaha (SA 570)">
            <div className="seg" style={{ width: '100%' }}>
              {[['none', 'Tdk Ada'], ['adequate', 'Layak'], ['mu', 'KU Material'], ['inadequate', 'Tdk Layak']].map(([v, l]) =>
                <button key={v} className={doc.gcStatus === v ? 'on' : ''} style={{ flex: 1, fontSize: 10.5 }} onClick={() => patch({ gcStatus: v, opts: { ...doc.opts, gc: v === 'mu' } })}>{l}</button>)}
            </div>
            <div className="tiny muted" style={{ marginTop: 6 }}>{({
              none: 'Tidak terdapat peristiwa/kondisi yang meragukan kelangsungan usaha.',
              adequate: 'Terdapat kondisi namun mitigasi memadai — tanpa paragraf khusus.',
              mu: 'Ketidakpastian material diungkapkan memadai → paragraf KU (opini tidak dimodifikasi).',
              inadequate: 'Pengungkapan tidak memadai → salah saji material (WDP/TW).',
            } as any)[doc.gcStatus]}</div>
          </Field>
        </Panel>

        <div className="panel" style={{ padding: 0, overflow: 'hidden', borderColor: kindVar(recO.k) }}>
          <div style={{ padding: '13px 15px', background: kindBg(recO.k) }}>
            <div className="tiny upper" style={{ color: kindVar(recO.k), fontWeight: 700 }}>Rekomendasi Sistem</div>
            <div className="row ac jb" style={{ marginTop: 4 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{recO.title}</div>
              <Badge kind={recO.k}>{recO.short}</Badge>
            </div>
          </div>
          <div style={{ padding: '11px 15px' }}>
            <div className="tiny" style={{ lineHeight: 1.6, color: 'var(--ink-2)' }}>
              {rec.opinion === 'unmodified' && 'Bukti cukup & tepat; tidak ada salah saji material yang belum dikoreksi.'}
              {rec.opinion === 'qualified' && (rec.driver === 'misstatement' ? 'Terdapat salah saji material yang tidak pervasif (SA 705.7).' : 'Pembatasan ruang lingkup material namun tidak pervasif (SA 705.9).')}
              {rec.opinion === 'adverse' && 'Salah saji material dan pervasif terhadap laporan keuangan secara keseluruhan (SA 705.8).'}
              {rec.opinion === 'disclaimer' && 'Tidak dapat memperoleh bukti yang cukup; dampak potensial pervasif (SA 705.10).'}
            </div>
            {rec.opinion !== doc.type
              ? <Btn sm variant="primary" style={{ width: '100%', marginTop: 11 }} onClick={() => patch({ type: rec.opinion })}><I.check size={13} /> Terapkan ke Laporan</Btn>
              : <div className="row ac gap6 tiny" style={{ marginTop: 10, color: 'var(--green)', fontWeight: 700 }}><I.checkCircle size={13} /> Konsisten dengan opini terpilih di laporan</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function ThreshCard({ label, v, accent }: any) {
  return (
    <div className="panel" style={{ padding: '8px 10px', background: 'var(--surface-2)', borderColor: 'transparent' }}>
      <div className="tiny muted upper" style={{ fontSize: 9.5 }}>{label}</div>
      <div className="mono" style={{ fontWeight: 700, fontSize: 13, marginTop: 3, color: accent || 'var(--ink)' }}>{v}</div>
    </div>
  );
}

function Field({ label, children }: any) {
  return <div><div className="tiny muted upper" style={{ marginBottom: 5 }}>{label}</div>{children}</div>;
}

/* ============================================================
   TAB 1 (lanjutan) — Pohon Keputusan SA 705 yang DITELUSURI AUDITOR
   Rambu skeptisisme Tier 3: AI/sistem tidak menyimpulkan opini.
   Sistem hanya menerapkan logika SA 705 atas pertimbangan auditor;
   auditor mendokumentasikan basis opini (SA 230) dengan atribusi.
   ============================================================ */
function OpinionDecisionTree({ doc, patch }: any) {
  const { fmt } = AMS;
  const audit = useAudit();
  const { activeEngagement } = useFirm();
  const USER: any = (AMS && AMS.USER) || { name: 'Anindya Pramesti', role: 'Audit Manager' };
  const om = activeEngagement?.materiality || 4_250_000_000;
  const agg = aggUncorr(doc.method);
  const auto = classifyMis(agg, om);
  const misSev = doc.misOverride === 'auto' ? auto.sev : doc.misOverride;
  const rec = recommendOpinion({ misSev, scope: doc.scope, gc: doc.gcStatus });
  const recO = (OPINIONS as any)[rec.opinion];
  const rp = (n: any) => 'Rp ' + fmt(n / 1e9, 2) + ' M';
  const [basis, setBasis] = useStateOP(doc.opinionBasis || '');

  const tnVar = (t: any) => t === 'green' ? 'var(--green)' : t === 'amber' ? 'var(--amber)' : 'var(--red)';
  const tnBg = (t: any) => t === 'green' ? 'var(--green-bg)' : t === 'amber' ? 'var(--amber-bg)' : 'var(--red-bg)';

  const nodes = [
    {
      q: 'Apakah terdapat salah saji material yang tidak dikoreksi?',
      a: misSev === 'none' ? 'Tidak material' : misSev === 'material' ? 'Material, tidak pervasif' : 'Material & pervasif',
      tone: misSev === 'none' ? 'green' : misSev === 'pervasive' ? 'red' : 'amber',
      input: `Agregat SAD ${rp(Math.max(agg.pbt, agg.na))} = ${fmt(auto.ratio * 100, 0)}% materialitas keseluruhan${agg.quals.length ? '; faktor kualitatif: ' + agg.quals.map((q: any) => (QUAL_LABEL as any)[q]).join(', ') : ''}.`,
      sa: 'SA 450 · 705.7–8', ref: 'sad',
    },
    {
      q: 'Apakah bukti audit yang diperoleh cukup & tepat?',
      a: doc.scope === 'sufficient' ? 'Cukup & tepat' : doc.scope === 'limited' ? 'Terbatas, tidak pervasif' : 'Terbatas & pervasif',
      tone: doc.scope === 'sufficient' ? 'green' : doc.scope === 'pervasive' ? 'red' : 'amber',
      input: 'Pertimbangan auditor atas pembatasan ruang lingkup / ketidakmampuan memperoleh bukti.',
      sa: 'SA 705.9–10', ref: 'evidence',
    },
    {
      q: 'Apakah kelangsungan usaha & pengungkapannya memadai?',
      a: ({ none: 'Tidak ada indikasi', adequate: 'Memadai', mu: 'KU material — diungkapkan memadai', inadequate: 'Pengungkapan tidak memadai' } as any)[doc.gcStatus],
      tone: doc.gcStatus === 'inadequate' ? 'red' : doc.gcStatus === 'mu' ? 'amber' : 'green',
      input: 'Penilaian SA 570 atas kondisi, rencana manajemen & kecukupan pengungkapan.',
      sa: 'SA 570', ref: 'goingconcern',
    },
  ];

  const recorded = doc.opinionDecision;
  const stale = recorded && recorded.opinion !== rec.opinion;
  const record = () => {
    const when = new Date().toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    patch({ opinionBasis: basis, opinionDecision: { who: USER.name, role: USER.role, when, opinion: rec.opinion, rationale: basis } });
    if (audit.logActivity) audit.logActivity({ who: USER.name, what: `menetapkan basis opini ${recO.short} (pohon keputusan SA 705) — ${basis.slice(0, 90)}`, mod: 'opinion', icon: 'gavel' });
  };

  return (
    <Panel title="Pohon Keputusan SA 705 — Ditelusuri Auditor" sub="setiap simpul adalah pertimbangan profesional Anda">
      <div className="opdt-guard">
        <I.shield size={15} />
        <span>Sistem hanya <b>menerapkan logika SA 705</b> atas pertimbangan yang <b>Anda</b> tetapkan di panel parameter — <b>AI tidak menyimpulkan opini</b>. Angka di tiap simpul dihitung dari SAD Ledger; keputusan & basis didokumentasikan atas nama auditor (SA 230).</span>
      </div>

      <div className="opdt-tree">
        {nodes.map((n, i) => (
          <div key={i} className="opdt-node">
            <div className="opdt-rail"><span className="opdt-dot" style={{ background: tnVar(n.tone) }}>{i + 1}</span>{i < nodes.length - 1 && <span className="opdt-line" />}</div>
            <div className="opdt-body">
              <div className="opdt-q">{n.q} <span className="opdt-sa">{n.sa}</span></div>
              <div className="opdt-a" style={{ background: tnBg(n.tone), color: tnVar(n.tone) }}><I.check size={12} /> Pertimbangan auditor: <b>{n.a}</b></div>
              <div className="opdt-input"><I.sparkle size={11} /> Masukan terhitung: {n.input}</div>
            </div>
          </div>
        ))}
        <div className="opdt-node">
          <div className="opdt-rail"><span className="opdt-dot" style={{ background: kindVar(recO.k) }}><I.gavel size={12} /></span></div>
          <div className="opdt-body">
            <div className="opdt-outcome" style={{ borderColor: kindVar(recO.k), background: kindBg(recO.k) }}>
              <div className="tiny upper" style={{ color: kindVar(recO.k), fontWeight: 800 }}>Penerapan SA 705 atas pertimbangan auditor</div>
              <div className="row ac jb" style={{ marginTop: 3 }}>
                <span style={{ fontWeight: 800, fontSize: 15 }}>{recO.title}</span>
                <Badge kind={recO.k}>{recO.short}</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="opdt-basis">
        <div className="tiny muted upper" style={{ marginBottom: 5 }}>Basis untuk opini — didokumentasikan auditor (SA 230)</div>
        <textarea className="input" value={basis} onChange={(e: any) => setBasis(e.target.value)} placeholder="Catat pertimbangan profesional yang mendasari opini: bagaimana agregat salah saji, kecukupan bukti, dan going concern dievaluasi terhadap materialitas…" style={{ width: '100%', height: 70, padding: 9, resize: 'vertical', lineHeight: 1.5, fontFamily: 'var(--ui)' }} />
        {recorded && !stale ? (
          <div className="opdt-recorded">
            <I.checkCircle size={14} />
            <div style={{ flex: 1 }}>
              <div>Basis opini <b>{(OPINIONS as any)[recorded.opinion].short}</b> dicatat oleh <b>{recorded.who}</b> · {recorded.when}</div>
              <div className="opdt-trace"><I.lock size={9} /> tercatat ke jejak audit · dapat diperbarui bila pertimbangan berubah</div>
            </div>
            <Btn sm onClick={record}><I.sync size={12} /> Perbarui</Btn>
          </div>
        ) : (
          <div className="row ac jb" style={{ marginTop: 8, flexWrap: 'wrap', gap: 8 }}>
            {stale && <span className="tiny" style={{ color: 'var(--amber)', fontWeight: 600 }}><I.alert size={12} style={{ verticalAlign: -2 }} /> Pertimbangan berubah sejak basis terakhir dicatat — perbarui.</span>}
            <div style={{ flex: 1 }} />
            <Btn sm variant="primary" disabled={!basis.trim()} onClick={record}><I.gavel size={13} /> Catat keputusan auditor</Btn>
          </div>
        )}
      </div>
    </Panel>
  );
}

/* ============================================================
   TAB 3 — KAM Workshop (SA 701) — linked to risk register
   ============================================================ */
function KAMWorkshop({ doc, patch }: any) {
  const risks = (AMS.RISKS || []).filter((r: any) => r.inherent === 'Significant');
  const usedRisks = new Set(doc.kams.map((k: any) => k.risk).filter(Boolean));
  const [open, setOpen] = useStateOP(doc.kams[0]?.id || null);

  const setKams = (fn: any) => patch({ kams: fn(doc.kams) });
  const update = (id: any, p: any) => setKams((ks: any) => ks.map((k: any) => k.id === id ? { ...k, ...p } : k));
  const remove = (id: any) => setKams((ks: any) => ks.filter((k: any) => k.id !== id));
  const move = (id: any, dir: any) => setKams((ks: any) => { const i = ks.indexOf(ks.find((k: any) => k.id === id)); const j = i + dir; if (j < 0 || j >= ks.length) return ks; const n = [...ks]; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const promote = (r: any) => {
    const id = 'k' + Date.now();
    setKams((ks: any) => [...ks, { id, risk: r.id, title: r.area, why: `Risiko signifikan ${r.id}: ${r.desc} (asersi: ${r.assertion}).`, how: 'Uraikan prosedur audit yang dirancang untuk menanggapi risiko ini.', wpRef: '' }]);
    setOpen(id);
  };
  const addBlank = () => { const id = 'k' + Date.now(); setKams((ks: any) => [...ks, { id, risk: null, title: 'Hal Audit Utama Baru', why: '', how: '', wpRef: '' }]); setOpen(id); };

  return (
    <div className="grid" style={{ gridTemplateColumns: '300px 1fr', gap: 12, alignItems: 'start' }}>
      <Panel title="Kandidat dari Register Risiko" sub="Risiko signifikan — SA 701.9">
        <div className="tiny muted" style={{ marginBottom: 9, lineHeight: 1.55 }}>Hal audit utama dipilih dari hal-hal yang dikomunikasikan kepada TCWG, dengan fokus pada area berisiko signifikan & pertimbangan auditor tertinggi.</div>
        <div style={{ display: 'grid', gap: 7 }}>
          {risks.map((r: any) => {
            const used = usedRisks.has(r.id);
            return (
              <div key={r.id} className="panel" style={{ padding: '8px 10px', borderColor: used ? 'var(--green)' : 'var(--line)', background: used ? 'var(--green-bg)' : '#fff' }}>
                <div className="row ac jb"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.id}</span>{r.fraud && <Badge kind="red">Fraud</Badge>}</div>
                <div style={{ fontSize: 12, fontWeight: 600, marginTop: 3 }}>{r.area}</div>
                <div className="tiny muted" style={{ marginTop: 2, lineHeight: 1.45 }}>{r.desc}</div>
                {used
                  ? <div className="row ac gap6 tiny" style={{ marginTop: 6, color: 'var(--green)', fontWeight: 700 }}><I.checkCircle size={12} /> Menjadi KAM</div>
                  : <Btn sm style={{ width: '100%', marginTop: 7 }} onClick={() => promote(r)}><I.plus size={12} /> Jadikan KAM</Btn>}
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="Penyusun Hal Audit Utama" sub={doc.kams.length + ' KAM · disusun menurut signifikansi'}
        actions={<Btn sm onClick={addBlank}><I.plus size={13} /> KAM Manual</Btn>}>
        {doc.kams.length === 0 && <div className="tiny muted" style={{ padding: '18px 0', textAlign: 'center' }}>Belum ada KAM. Promosikan risiko signifikan dari kiri atau tambah manual.</div>}
        <div style={{ display: 'grid', gap: 9 }}>
          {doc.kams.map((k: any, i: any) => (
            <div key={k.id} className="panel" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="row ac gap8" style={{ padding: '8px 10px', background: 'var(--surface-2)', borderBottom: open === k.id ? '1px solid var(--line)' : 0 }}>
                <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600 }} className="truncate">{k.title}</span>
                {k.risk && <span className="chip tiny" style={{ background: 'var(--blue-100)', color: 'var(--blue)' }}><I.shield size={10} /> {k.risk}</span>}
                <button className="p-act" onClick={() => move(k.id, -1)} title="Naik"><I.chevDown size={13} style={{ transform: 'rotate(180deg)' }} /></button>
                <button className="p-act" onClick={() => move(k.id, 1)} title="Turun"><I.chevDown size={13} /></button>
                <button className="p-act" onClick={() => setOpen(open === k.id ? null : k.id)} title="Edit"><I.doc size={13} /></button>
                <button className="p-act" onClick={() => remove(k.id)} title="Hapus" style={{ color: 'var(--red)' }}><I.x size={13} /></button>
              </div>
              {open === k.id && (
                <div style={{ padding: 11, display: 'grid', gap: 9 }}>
                  <div><div className="tiny muted upper" style={{ marginBottom: 4 }}>Judul KAM</div>
                    <input className="input" style={{ width: '100%' }} value={k.title} onChange={(e: any) => update(k.id, { title: e.target.value })} /></div>
                  <div><div className="tiny muted upper" style={{ marginBottom: 4 }}>Mengapa merupakan hal yang paling signifikan</div>
                    <textarea className="input" value={k.why} onChange={(e: any) => update(k.id, { why: e.target.value })} style={{ height: 64, padding: 8, resize: 'vertical', lineHeight: 1.5, fontFamily: 'var(--ui)' }} /></div>
                  <div><div className="tiny muted upper" style={{ marginBottom: 4 }}>Bagaimana hal tersebut ditangani dalam audit</div>
                    <textarea className="input" value={k.how} onChange={(e: any) => update(k.id, { how: e.target.value })} style={{ height: 76, padding: 8, resize: 'vertical', lineHeight: 1.5, fontFamily: 'var(--ui)' }} /></div>
                  <div style={{ width: 220 }}><div className="tiny muted upper" style={{ marginBottom: 4 }}>Referensi Kertas Kerja</div>
                    <input className="input" style={{ width: '100%' }} placeholder="mis. C-300 · E-210" value={k.wpRef} onChange={(e: any) => update(k.id, { wpRef: e.target.value })} /></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ============================================================
   TAB 4 — Review, Completeness & Sign-off (SA 700 / 220 / ISQM 2)
   ============================================================ */
const REVIEW_CHAIN = [
  { role: 'manager', label: 'Reviu Manajer', who: 'Anindya Pramesti', sub: 'Manajer Perikatan', std: 'SA 220' },
  { role: 'partner', label: 'Reviu Rekan Perikatan', who: 'Hartono Wijaya, CPA', sub: 'Engagement Partner', std: 'SA 220.17' },
  { role: 'eqr', label: 'Reviu Pengendalian Mutu (EQR)', who: 'Rudi Gunawan, CPA', sub: 'Engagement Quality Reviewer', std: 'ISQM 2 · SA 220.36' },
];

function OpinionSignoff({ doc, patch }: any) {
  const { activeEngagement, activeClient } = useFirm();
  const { wpState, setWp } = useAudit();   // mirror sign-off opini ke SSOT wpState['900']
  const auth = useAuth();
  // W7 — issuing the auditor's opinion requires opinion.approve (Engagement Partner; server-enforced).
  const canApprove = !auth || typeof auth.can !== 'function' || auth.can(CAP.OPINION_APPROVE);
  /* Otoritas tanda tangan PER-SLOT reviu berjenjang (SoD): tiap slot terikat kapabilitas perannya —
     Manajer→SIGNOFF_REVIEWER (Partner+Manager), Rekan Perikatan→OPINION_APPROVE (Partner),
     EQR→EQR_REVIEW (Partner). Menutup celah: Junior/Senior tak boleh menandatangani slot manapun;
     Manager tak boleh menandatangani slot Partner/EQR. Penegakan server = fase lanjut. */
  const SLOT_CAP: Record<string, string> = { manager: CAP.SIGNOFF_REVIEWER, partner: CAP.OPINION_APPROVE, eqr: CAP.EQR_REVIEW };
  /* #3 — deklarasi Kode Etik/AML penanda tangan wajib sah sebelum membubuhkan tanda tangan/menerbitkan opini. */
  const eg = useEthicsGate();
  /* F2 — independensi per-anggota tim (SA 220.16–24 / Kode Etik): seluruh anggota harus
     menyatakan independensi & ancaman ter-safeguard sebelum sign-off/opini (mirror gerbang etik). */
  const mig = useMemberIndependenceGate();
  const canSignSlot = (role: string) => (!auth || typeof auth.can !== 'function' || auth.can(SLOT_CAP[role])) && !eg.blocked && mig.clear;
  // Q4 — rekam penanda tangan SEBENARNYA (dari sesi), bukan nama slot hardcode (REVIEW_CHAIN.who).
  const me = (auth && auth.user && auth.user.name) || 'Auditor';
  const pg = usePhaseGate();               // P5 Fase 3: tawaran arsip pasca-finalisasi (lewat gerbang fase)
  const o = (OPINIONS as any)[doc.type];
  const eqrRequired = !!activeClient?.listed;
  /* Q-02 (ISQM 2): ikat penerbitan opini ke penyelesaian EQR SUBSTANTIF di modul
     EQR (review.cleared), bukan sekadar centang `eqr` di rantai tanda tangan.
     Berlaku bila klien PIE (wajib) ATAU ada review EQR utk engagement ini. */
  const eqrGate = eqrStatusFor(activeEngagement?.id);
  const eqrEnforced = eqrRequired || eqrGate.applicable;
  const eqrSubstantiveDone = !eqrEnforced || eqrGate.cleared;
  const today = '2026-03-14';

  /* SA 700 required-element completeness — auto + manual */
  const autoChecks = [
    { id: 'title', label: 'Judul "Laporan Auditor Independen"', ok: true },
    { id: 'addr', label: 'Pihak yang dituju (pemegang saham)', ok: true },
    { id: 'opinion', label: 'Paragraf Opini (' + o.short + ')', ok: true },
    { id: 'basis', label: 'Paragraf Basis Opini', ok: true },
    { id: 'kam', label: 'Hal Audit Utama (SA 701)', ok: doc.type === 'disclaimer' ? true : (doc.opts.kam && doc.kams.length > 0), na: doc.type === 'disclaimer', note: doc.type === 'disclaimer' ? 'Tidak relevan untuk TMP' : (doc.kams.length || 0) + ' KAM' },
    { id: 'gc', label: 'Kelangsungan Usaha (SA 570)', ok: doc.gcStatus === 'none' || doc.gcStatus === 'adequate' ? true : doc.opts.gc || doc.type !== 'unmodified', na: doc.gcStatus === 'none' },
    { id: 'mgmt', label: 'Tanggung Jawab Manajemen & TCWG', ok: true },
    { id: 'auditor', label: 'Tanggung Jawab Auditor', ok: true },
    { id: 'sign', label: 'Tanda tangan, nama & No. Izin AP', ok: true },
    { id: 'date', label: 'Tanggal & alamat auditor', ok: !!doc.reportDate },
  ];
  const manualChecks = [
    { id: 'tieout', label: 'Angka opini selaras dengan LK final (tie-out)' },
    { id: 'sad', label: 'Seluruh salah saji tak dikoreksi dievaluasi (SA 450)' },
    { id: 'subsequent', label: 'Peristiwa kemudian ditelaah s.d. tanggal laporan (SA 560)' },
    { id: 'repdate', label: 'Surat representasi manajemen diterima' },
    { id: 'tcwg', label: 'Komunikasi TCWG diselesaikan (SA 260)' },
  ];
  const tickManual = (id: any) => patch({ checklist: { ...doc.checklist, [id]: !doc.checklist[id] } });
  const autoDone = autoChecks.every((c: any) => c.ok || c.na);
  const manualDone = manualChecks.every((c: any) => doc.checklist[c.id]);

  const sign = (role: any) => {
    const next = doc.signoff[role] ? null : { date: today, by: me };
    patch({ signoff: { ...doc.signoff, [role]: next } });
    /* mirror ke chain kanonik wpState['900']: manager→reviewer, partner→partner, eqr→eqr.
       Q4: rekam penanda tangan SEBENARNYA (me), bukan nama slot yang diharapkan. */
    const slot = role === 'manager' ? 'reviewer' : role;
    const curChain = { ...(((wpState || {})['900'] || {}).chain || {}) };
    if (next) { curChain[slot] = { by: me, at: today }; if (!curChain.preparer) curChain.preparer = { by: 'Generator Laporan', at: today }; }
    else delete curChain[slot];
    const wpPatch: any = { chain: curChain };
    if (slot === 'reviewer') { wpPatch.status = next ? 'Reviewed' : 'In Review'; wpPatch.reviewer = next ? me : null; wpPatch.signedAt = next ? today : null; }
    setWp('900', wpPatch);
  };
  const chainComplete = REVIEW_CHAIN.every((r: any) => (r.role === 'eqr' && !eqrRequired) ? true : doc.signoff[r.role]);
  const canFinalize = autoDone && manualDone && chainComplete && eqrSubstantiveDone && !doc.finalized && canApprove && !eg.blocked && mig.clear;

  const finalize = () => { patch({ finalized: true, finalizedDate: today }); setWp('900', { status: 'Reviewed' }); };

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Kelengkapan Laporan" sub="Elemen wajib — SA 700.21–49">
          <div className="tiny muted upper" style={{ marginBottom: 7 }}>Otomatis dari penyusun laporan</div>
          <div style={{ display: 'grid', gap: 1 }}>
            {autoChecks.map((c: any) => (
              <div key={c.id} className="row ac gap8" style={{ padding: '6px 2px', borderBottom: '1px solid var(--line-soft)' }}>
                <span style={{ color: c.na ? 'var(--ink-3)' : c.ok ? 'var(--green)' : 'var(--amber)' }}>
                  {c.na ? <I.x size={14} /> : c.ok ? <I.checkCircle size={15} /> : <I.alert size={14} />}
                </span>
                <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: c.na ? 'var(--ink-3)' : 'var(--ink)' }}>{c.label}</span>
                {c.note && <span className="tiny muted">{c.note}</span>}
              </div>
            ))}
          </div>
          <div className="tiny muted upper" style={{ margin: '12px 0 7px' }}>Konfirmasi manual auditor</div>
          <div style={{ display: 'grid', gap: 1 }}>
            {manualChecks.map((c: any) => (
              <label key={c.id} className="row ac gap8" style={{ padding: '6px 2px', borderBottom: '1px solid var(--line-soft)', cursor: 'pointer' }} onClick={() => tickManual(c.id)}>
                <span style={{ width: 16, height: 16, borderRadius: 4, border: '1.5px solid ' + (doc.checklist[c.id] ? 'var(--green)' : 'var(--line-strong)'), background: doc.checklist[c.id] ? 'var(--green)' : '#fff', display: 'grid', placeItems: 'center', color: '#fff', flex: '0 0 16px' }}>{doc.checklist[c.id] && <I.check size={11} />}</span>
                <span style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>{c.label}</span>
              </label>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Alur Tanda Tangan" sub="Reviu berjenjang — SA 220 / ISQM 2">
          {!eqrRequired && <div className="tiny muted" style={{ marginBottom: 9 }}>Klien non-PIE — EQR opsional sesuai kebijakan firma.</div>}
          {eqrRequired && <div className="row ac gap6 tiny" style={{ marginBottom: 9, color: 'var(--blue)', fontWeight: 600 }}><I.shield size={12} /> Klien tercatat (PIE) — EQR wajib sebelum tanggal laporan.</div>}
          <div style={{ display: 'grid', gap: 8 }}>
            {REVIEW_CHAIN.map((r, i) => {
              const optional = r.role === 'eqr' && !eqrRequired;
              const done = doc.signoff[r.role];
              const prevDone = i === 0 || doc.signoff[REVIEW_CHAIN[i - 1].role] || (REVIEW_CHAIN[i - 1].role === 'eqr' && !eqrRequired);
              return (
                <div key={r.role} className="panel" style={{ padding: '10px 12px', borderColor: done ? 'var(--green)' : 'var(--line)', background: done ? 'var(--green-bg)' : '#fff', opacity: optional && !done ? 0.7 : 1 }}>
                  <div className="row ac jb">
                    <div className="row ac gap8">
                      <span style={{ width: 24, height: 24, borderRadius: '50%', background: done ? 'var(--green)' : 'var(--surface-3)', color: done ? '#fff' : 'var(--ink-3)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 11 }}>{done ? <I.check size={13} /> : i + 1}</span>
                      <div><div style={{ fontSize: 12.5, fontWeight: 700 }}>{r.label}{optional && <span className="muted" style={{ fontWeight: 400 }}> · opsional</span>}</div>
                        <div className="tiny muted">{r.who} · {r.sub}</div></div>
                    </div>
                    <span className="tiny mono muted">{r.std}</span>
                  </div>
                  <div className="row ac jb" style={{ marginTop: 8 }}>
                    {done ? <span className="tiny" style={{ color: 'var(--green)', fontWeight: 600 }}>Ditandatangani{done.by ? ' oleh ' + done.by : ''} · {done.date}</span>
                      : <span className="tiny muted">{!prevDone ? 'Menunggu reviu sebelumnya' : canSignSlot(r.role) ? 'Menunggu tanda tangan' : 'Menunggu otoritas berwenang'}</span>}
                    <Btn sm variant={done ? '' : 'primary'} disabled={done ? !canSignSlot(r.role) : (!prevDone || !canSignSlot(r.role))} onClick={() => sign(r.role)}
                      title={!canSignSlot(r.role) ? 'Hanya otoritas yang berwenang dapat menandatangani slot ini' : undefined}>
                      {done ? 'Batalkan' : <><I.check size={12} /> Tandatangani</>}
                    </Btn>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <div className="panel" style={{ padding: 0, overflow: 'hidden', borderColor: doc.finalized ? 'var(--green)' : canFinalize ? 'var(--blue)' : 'var(--line)' }}>
          <div style={{ padding: '13px 15px', background: doc.finalized ? 'var(--green-bg)' : 'var(--surface-2)' }}>
            <div className="row ac jb">
              <div><div style={{ fontWeight: 700, fontSize: 13 }}>{doc.finalized ? 'Laporan Difinalisasi' : 'Finalisasi & Penerbitan'}</div>
                <div className="tiny muted">{doc.finalized ? 'Terkunci ' + doc.finalizedDate + ' — siap diarsipkan' : 'Memerlukan kelengkapan + seluruh tanda tangan'}</div></div>
              {doc.finalized && <Badge kind="green">Issued</Badge>}
            </div>
          </div>
          <div style={{ padding: '11px 15px' }}>
            <div className="row gap8" style={{ flexWrap: 'wrap', marginBottom: doc.finalized ? 0 : 10 }}>
              <Pill ok={autoDone} label="Kelengkapan" />
              <Pill ok={manualDone} label="Konfirmasi manual" />
              <Pill ok={chainComplete} label="Tanda tangan" />
              {eqrEnforced && <Pill ok={eqrGate.cleared} label="EQR (modul) lolos" />}
            </div>
            {!doc.finalized && eqrEnforced && !eqrGate.cleared && (
              <div className="tiny" style={{ color: 'var(--amber)', fontWeight: 600, marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center' }}><I.shield size={12} /> Penelaahan Mutu Perikatan (EQR) belum lolos gerbang di modul EQR — wajib selesai sebelum opini diterbitkan (ISQM 2 ¶19–36).</div>
            )}
            {!doc.finalized && !canApprove && (
              <div className="tiny" style={{ color: 'var(--amber)', fontWeight: 600, marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center' }}><I.lock size={12} /> Hanya Engagement Partner yang dapat menerbitkan opini (ditegakkan di server).</div>
            )}
            {!doc.finalized && eg.blocked && (
              <div className="tiny" style={{ color: 'var(--red)', fontWeight: 600, marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center' }}><I.lock size={12} /> {eg.reason} ({eg.name}) — tanda tangan &amp; penerbitan opini diblokir hingga Deklarasi Kode Etik/AML sah (atau pengecualian Partner).</div>
            )}
            {!doc.finalized && !mig.clear && (
              <div className="tiny" style={{ color: 'var(--red)', fontWeight: 600, marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center' }}><I.shield size={12} /> Independensi tim belum bersih ({mig.blockers} anggota belum menyatakan / ancaman tak-tersafeguard) — tanda tangan &amp; penerbitan opini diblokir (SA 220 · Kode Etik). Lihat modul Independensi Tim.</div>
            )}
            {!doc.finalized
              ? <Btn variant="primary" disabled={!canFinalize} style={{ width: '100%' }} onClick={finalize}><I.lock size={14} /> Finalisasi Laporan Auditor</Btn>
              : <div className="grid" style={{ gap: 8 }}>
                  {activeEngagement && activeEngagement.phase !== 'Arsip' && (
                    <Btn variant="primary" style={{ width: '100%' }} onClick={() => pg.attempt(activeEngagement.id, activeEngagement.phase, 'Arsip')}><I.archive size={14} /> Arsipkan engagement</Btn>
                  )}
                  {activeEngagement && activeEngagement.phase === 'Arsip' && (
                    <div className="tiny row ac gap6" style={{ color: 'var(--green)', fontWeight: 600 }}><I.check size={12} /> Engagement telah diarsipkan & terkunci.</div>
                  )}
                  <Btn style={{ width: '100%' }} onClick={() => patch({ finalized: false })}><I.sync size={13} /> Buka Kembali (reopen)</Btn>
                </div>}
          </div>
        </div>
      </div>
      {pg.pending && <PhaseGateDialog gate={pg.pending.gate} fromPhase={pg.pending.fromPhase} toPhase={pg.pending.toPhase} onConfirm={pg.confirm} onCancel={pg.cancel} />}
    </div>
  );
}

function Pill({ ok, label }: any) {
  return <span className="chip tiny" style={{ background: ok ? 'var(--green-bg)' : 'var(--surface-3)', color: ok ? 'var(--green)' : 'var(--ink-3)' }}>{ok ? <I.check size={11} /> : <I.clock size={11} />} {label}</span>;
}

Object.assign(window, {
  AMSOpinion: { OPINIONS, SIGNERS, UNCORR, QUAL_LABEL, TYPE_KIND, aggUncorr, classifyMis, recommendOpinion, kindVar, kindBg, DocH, DeterminationPanel, OpinionDecisionTree, KAMWorkshop, OpinionSignoff },
});


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export const AMSOpinion = window.AMSOpinion;
