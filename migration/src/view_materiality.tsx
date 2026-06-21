/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useFirm, useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, LockBanner, Panel, Tabs } from './ui.jsx';
import { MatComponent, MatImpact, MatMemo, MatRevision, MatSpecific } from './view_materiality_parts';

/* ============================================================
   NeoSuite AMS — Materiality Workspace (SA 320 · SA 450 · SA 600)
   Tabbed: Penentuan · Spesifik · Komponen · Dampak & SAD · Revisi · Memo
   Heavy tab panels live in view_materiality_parts.jsx
   ============================================================ */
const { useState: useStateM, useMemo: useMemoM } = React;

const BENCHMARKS = [
  { id: 'pbt',    label: 'Laba Sebelum Pajak',  value: 85_200_000_000,  lo: 5,   hi: 10,  def: 5,   note: 'Lazim untuk entitas berorientasi laba' },
  { id: 'rev',    label: 'Total Pendapatan',    value: 331_900_000_000, lo: 0.5, hi: 1,   def: 1,   note: 'Untuk entitas volume tinggi / margin tipis' },
  { id: 'gp',     label: 'Laba Bruto',          value: 99_420_000_000,  lo: 1,   hi: 3,   def: 2,   note: 'Alternatif bila laba bersih fluktuatif' },
  { id: 'assets', label: 'Total Aset',          value: 316_558_000_000, lo: 1,   hi: 2,   def: 1,   note: 'Untuk entitas padat aset' },
  { id: 'equity', label: 'Total Ekuitas',       value: 160_456_000_000, lo: 2,   hi: 5,   def: 3,   note: 'Untuk entitas dengan fokus permodalan' },
];

const QUAL_FACTORS = [
  { id: 'listed', label: 'Entitas tercatat (publik)', note: 'Perhatian investor & OJK → cenderung lebih konservatif' },
  { id: 'covenant', label: 'Kovenan pembiayaan ketat', note: 'Salah saji kecil dapat memicu pelanggaran kovenan' },
  { id: 'firstyear', label: 'Audit tahun pertama', note: 'Risiko lebih tinggi pada saldo awal' },
  { id: 'fraud', label: 'Indikasi risiko kecurangan', note: 'SA 240 — turunkan ambang' },
];

const TABS = [
  { id: 'det',  label: 'Penentuan' },
  { id: 'spec', label: 'Materialitas Spesifik' },
  { id: 'comp', label: 'Komponen (Grup)' },
  { id: 'sad',  label: 'Dampak & SAD' },
  { id: 'rev',  label: 'Revisi & Riwayat' },
  { id: 'memo', label: 'Memo & Persetujuan' },
];

function MaterialityCalc() {
  const { fmt } = AMS;
  const { activeEngagement, locked } = useFirm();

  const [tab, setTab] = window.useAmsPersist('mat.tab', 'det');
  const [benchId, setBenchId] = window.useAmsPersist('mat.benchId', 'pbt');
  const [pct, setPct] = window.useAmsPersist('mat.pct', 5);
  const [pmPct, setPmPct] = window.useAmsPersist('mat.pmPct', 75);
  const [cttPct, setCttPct] = window.useAmsPersist('mat.cttPct', 5);
  const [quals, setQuals] = window.useAmsPersist('mat.quals', { listed: true, fraud: true });
  const [appliedOverride, setAppliedOverride] = window.useAmsPersist('mat.appliedOverride', null);

  const bench = BENCHMARKS.find(b => b.id === benchId) || BENCHMARKS[0];
  const om = Math.round(bench.value * pct / 100);
  const pm = Math.round(om * pmPct / 100);
  const ctt = Math.round(om * cttPct / 100);
  const applied = appliedOverride != null ? appliedOverride : activeEngagement.materiality;
  const priorOM = 3_900_000_000;

  const rp = (n) => 'Rp ' + fmt(n);
  const pickBench = (id) => { const b = BENCHMARKS.find(x => x.id === id); setBenchId(id); setPct(b.def); };
  const activeQuals = Object.keys(quals).filter(k => quals[k]).length;
  const onApply = () => setAppliedOverride(om);

  return (
    <>
      <SubBar moduleId="materiality" right={
        <div className="row gap8 ac">
          <Badge kind="blue">SA 320 · SA 450 · SA 600</Badge>
          <Btn sm><I.download size={13} /> Memo Materialitas</Btn>
          <Btn sm variant="primary" onClick={onApply}><I.check size={14} /> Terapkan ke Engagement</Btn>
        </div>
      } />
      <div className="view-scroll">
        {/* sticky tabs + persistent summary rail */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}>
          <div style={{ padding: '0 14px' }}>
            <Tabs tabs={TABS} active={tab} onChange={setTab} />
          </div>
          <div className="row ac" style={{ gap: 0, padding: '0 14px', background: 'var(--surface-2)', borderTop: '1px solid var(--line-soft)' }}>
            <RailChip label="Overall (OM)" value={rp(om)} strong />
            <RailChip label={`Performance · ${pmPct}%`} value={rp(pm)} />
            <RailChip label={`Jelas Remeh · ${cttPct}%`} value={rp(ctt)} />
            <RailChip label="Benchmark" value={`${bench.label} · ${pct}%`} />
            <div style={{ flex: 1 }} />
            <RailChip label="Terterapkan" value={rp(applied)} align="right" last />
          </div>
        </div>

        <div className="view-pad">
          {locked && <LockBanner />}

          {tab === 'det' && (
            <MatDetermination
              bench={bench} benchId={benchId} pickBench={pickBench}
              pct={pct} setPct={setPct} pmPct={pmPct} setPmPct={setPmPct} cttPct={cttPct} setCttPct={setCttPct}
              quals={quals} setQuals={setQuals} activeQuals={activeQuals}
              om={om} pm={pm} ctt={ctt} applied={applied} priorOM={priorOM} rp={rp} locked={locked} />
          )}
          {tab === 'spec' && <MatSpecific om={om} pmPct={pmPct} locked={locked} />}
          {tab === 'comp' && <MatComponent om={om} locked={locked} />}
          {tab === 'sad'  && <MatImpact om={om} pm={pm} ctt={ctt} locked={locked} />}
          {tab === 'rev'  && <MatRevision om={om} applied={applied} locked={locked} />}
          {tab === 'memo' && <MatMemo bench={bench} pct={pct} pmPct={pmPct} cttPct={cttPct} om={om} pm={pm} ctt={ctt} applied={applied} onApply={onApply} locked={locked} />}
        </div>
      </div>
    </>
  );
}

/* ---------- Determination tab ---------- */
function MatDetermination({ bench, benchId, pickBench, pct, setPct, pmPct, setPmPct, cttPct, setCttPct, quals, setQuals, activeQuals, om, pm, ctt, applied, priorOM, rp, locked }) {
  const { fmt } = AMS;
  const nav = useNav();
  const toggleQ = (id) => setQuals(q => ({ ...q, [id]: !q[id] }));

  return (
    <div className="grid" style={{ gridTemplateColumns: '1.15fr 1fr', gap: 12, alignItems: 'start' }}>
      {/* LEFT — inputs */}
      <div className="grid" style={{ gap: 12 }}>
        <Panel title="1 · Pemilihan Benchmark" sub="Dasar penentuan materialitas keseluruhan">
          <table className="dtbl">
            <thead><tr><th style={{ width: 28 }}></th><th>Benchmark</th><th className="num">Nilai (Rp)</th><th className="num" style={{ width: 90 }}>Kisaran %</th></tr></thead>
            <tbody>
              {BENCHMARKS.map(b => (
                <tr key={b.id} className={b.id === benchId ? 'sel' : ''} onClick={() => !locked && pickBench(b.id)} style={{ cursor: locked ? 'default' : 'pointer' }}>
                  <td><span style={{ width: 15, height: 15, borderRadius: '50%', border: '2px solid ' + (b.id === benchId ? 'var(--blue)' : 'var(--line-strong)'), display: 'grid', placeItems: 'center' }}>{b.id === benchId && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--blue)' }} />}</span></td>
                  <td><div style={{ fontWeight: 600 }}>{b.label}</div><div className="tiny muted">{b.note}</div></td>
                  <td className="num">{fmt(b.value)}</td>
                  <td className="num tiny muted">{b.lo}–{b.hi}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="2 · Persentase yang Diterapkan">
          <div style={{ padding: '4px 2px' }}>
            <SliderRow label={`Persentase Benchmark (${bench.label})`} value={pct} min={bench.lo} max={bench.hi} step={0.25} suffix="%" onChange={setPct} hint={`Kisaran lazim ${bench.lo}–${bench.hi}%`} disabled={locked} />
            <SliderRow label="Performance Materiality (% dari OM)" value={pmPct} min={50} max={90} step={1} suffix="%" onChange={setPmPct} hint="Buffer risiko agregasi salah saji" disabled={locked} />
            <SliderRow label="Clearly Trivial Threshold (% dari OM)" value={cttPct} min={1} max={10} step={0.5} suffix="%" onChange={setCttPct} hint="Ambang salah saji yang jelas remeh" disabled={locked} />
          </div>
        </Panel>

        <Panel title="3 · Faktor Kualitatif" sub="Pertimbangan yang menurunkan ambang">
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {QUAL_FACTORS.map(f => {
              const on = !!quals[f.id];
              return (
                <div key={f.id} onClick={() => !locked && toggleQ(f.id)}
                  className="panel" style={{ padding: '9px 11px', cursor: locked ? 'default' : 'pointer', background: on ? 'var(--blue-050)' : 'var(--surface)', borderColor: on ? 'var(--blue-100)' : 'var(--line)' }}>
                  <div className="row ac gap8">
                    <span style={{ width: 16, height: 16, borderRadius: 4, border: '2px solid ' + (on ? 'var(--blue)' : 'var(--line-strong)'), background: on ? 'var(--blue)' : 'transparent', display: 'grid', placeItems: 'center', flex: '0 0 16px' }}>{on && <I.check size={11} color="#fff" />}</span>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{f.label}</span>
                  </div>
                  <div className="tiny muted" style={{ marginTop: 4, lineHeight: 1.4 }}>{f.note}</div>
                </div>
              );
            })}
          </div>
          {activeQuals > 0 && (
            <div className="tiny" style={{ marginTop: 10, color: 'var(--ink-2)', lineHeight: 1.5 }}>
              <b>{activeQuals} faktor</b> aktif — pertimbangkan persentase pada batas bawah kisaran ({bench.lo}%) dan dokumentasikan alasan profesional.
            </div>
          )}
        </Panel>
      </div>

      {/* RIGHT — results */}
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '16px 18px' }}>
            <div className="tiny" style={{ color: '#bcd6e4', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 3 }}>Overall Materiality (OM)</div>
            <div className="mono" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1 }}>{rp(om)}</div>
            <div className="tiny" style={{ color: '#9fc0d2', marginTop: 5 }}>= {fmt(bench.value / 1e9, 1)} M × {pct}% ({bench.label})</div>
          </div>
          <div style={{ padding: '14px 18px' }}>
            {[
              ['Overall Materiality', om, '#005085', 100],
              ['Performance Materiality', pm, '#2f7bb0', pmPct],
              ['Clearly Trivial', ctt, '#9ac0db', cttPct],
            ].map(([lbl, val, color, w]) => (
              <div key={lbl} style={{ marginBottom: 11 }}>
                <div className="row jb ac" style={{ marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{lbl}</span>
                  <span className="mono" style={{ fontWeight: 700 }}>{rp(val)}</span>
                </div>
                <div style={{ height: 10, borderRadius: 6, background: 'var(--surface-3)' }}>
                  <div style={{ width: Math.max(4, w) + '%', height: '100%', borderRadius: 6, background: color }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Perbandingan & Validasi">
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
            <Compare label="OM Diusulkan" a={om} />
            <Compare label="OM Terterapkan (locked)" a={applied} />
            <Compare label="OM Tahun Lalu" a={priorOM} />
            <div>
              <div className="tiny muted upper" style={{ marginBottom: 2 }}>Perubahan YoY</div>
              <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: om > priorOM ? 'var(--amber)' : 'var(--green)' }}>
                {om > priorOM ? '+' : ''}{((om - priorOM) / priorOM * 100).toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="divider" />
          <div className="panel" style={{ padding: '10px 12px', background: Math.abs(om - applied) / applied > 0.1 ? 'var(--amber-bg)' : 'var(--green-bg)', borderColor: 'transparent' }}>
            <div className="row ac gap8">
              <span style={{ color: Math.abs(om - applied) / applied > 0.1 ? 'var(--amber)' : 'var(--green)' }}>
                {Math.abs(om - applied) / applied > 0.1 ? <I.alert size={16} /> : <I.checkCircle size={16} />}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>
                {Math.abs(om - applied) / applied > 0.1
                  ? `OM usulan menyimpang ${(Math.abs(om - applied) / applied * 100).toFixed(0)}% dari yang diterapkan — perlu dokumentasi & persetujuan partner.`
                  : 'OM usulan konsisten dengan nilai yang diterapkan pada engagement.'}
              </span>
            </div>
          </div>
        </Panel>

        <Panel title="Dampak ke Working Trial Balance">
          <div className="row jb ac">
            <span className="tiny muted">Akun melebihi Performance Materiality ({rp(pm)})</span>
            <Badge kind="red">{AMS.WTB.filter(r => Math.abs(r.adj) > pm).length} akun</Badge>
          </div>
          <div className="divider" />
          <div className="row gap8">
            <Btn sm style={{ flex: 1 }} onClick={() => nav('wtb')}><I.table size={14} /> Lihat di WTB</Btn>
            <Btn sm style={{ flex: 1 }}><I.sparkle size={14} /> Tanya AI Co-pilot</Btn>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function SliderRow({ label, value, min, max, step, suffix, onChange, hint, disabled }: any) {
  return (
    <div style={{ marginBottom: 15 }}>
      <div className="row jb ac" style={{ marginBottom: 5 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>{label}</span>
        <span className="mono" style={{ fontWeight: 700, color: 'var(--blue)' }}>{value}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={e => onChange(+e.target.value)} style={{ width: '100%', accentColor: 'var(--blue)', opacity: disabled ? .5 : 1 }} />
      {hint && <div className="tiny muted" style={{ marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

function Compare({ label, a }) {
  const { fmt } = AMS;
  return (
    <div>
      <div className="tiny muted upper" style={{ marginBottom: 2 }}>{label}</div>
      <div className="mono" style={{ fontSize: 14, fontWeight: 700 }}>Rp {fmt(a)}</div>
    </div>
  );
}

function RailChip({ label, value, strong, align, last }: any) {
  return (
    <div style={{ padding: '7px 16px 7px 0', marginRight: last ? 0 : 16, borderRight: last ? 'none' : '1px solid var(--line)', textAlign: align || 'left' }}>
      <div className="tiny muted upper" style={{ fontSize: 9.5, letterSpacing: '.06em' }}>{label}</div>
      <div className="mono" style={{ fontWeight: 700, fontSize: strong ? 14 : 12.5, color: strong ? 'var(--blue)' : 'var(--ink)' }}>{value}</div>
    </div>
  );
}

Object.assign(window, { MaterialityCalc, SliderRow, Compare, BENCHMARKS });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { BENCHMARKS, Compare, MaterialityCalc, SliderRow };
