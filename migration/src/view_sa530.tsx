/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAmsPersist, useAuth, useFirm } from './contexts';
import { amsExportPdf } from './export_pdf';
import { I } from './icons';
import { SACanonChips, SACanonicalStatus } from './sa_canonical';
import { SubBar } from './shell';
import { Badge, Btn, Panel, Progress, Seg, Stat, Tabs } from './ui';
import { KvBox } from './view_analytical';
import { SA530_POPULATION, scalePopulation, selectMus, musPlan, type PopItem, type SelectedItem } from './sampling_select';
import { materialityFor } from './canon_selectors';
import { reconcileSamplingTolerance, type SamplingToleranceResult } from './canon_validation';
import { WpPanel } from './wp_signoff';

/* ============================================================
   Asseris — SA 530 · Sampling Audit
   Deep workpaper: desain & populasi, kalkulator ukuran sampel
   (MUS interaktif), metode seleksi, serta evaluasi hasil &
   proyeksi salah saji ke populasi.
   ============================================================ */
const { useState: useState530, useMemo: useMemo530 } = React;

/* ---- model sampling ter-persist engagement-scoped (SA 530) ---- */
type SamplingParams = { bv: number; conf: number; tm: number; em: number };
type SampleFinding = { id: string; bv: number; av: number; type: string; by?: string; at?: string };
/* desain & stratifikasi (¶6–7) + titik-mulai acak generator (fraksi 0–1 dari interval) */
type SamplingDesign = { topThreshold: number; rationale: string; by?: string; at?: string };
type SamplingState = { params: SamplingParams; findings: SampleFinding[]; design: SamplingDesign; seedFrac: number };
/* tipe struktural minimal event input — hindari explicit-any (ratchet) */
type Ev = { target: { value: string } };

/* Salah saji ditemukan dalam sampel (Rp jt) */
const SAMPLE_FINDINGS: SampleFinding[] = [
  { id: 'S-018', bv: 1240, av: 1180, type: 'Lebih saji nilai faktur' },
  { id: 'S-047', bv: 880, av: 812, type: 'Pisah-batas — barang belum dikirim' },
  { id: 'S-103', bv: 1560, av: 1560, type: 'Tidak ada salah saji' },
  { id: 'S-129', bv: 430, av: 388, type: 'Diskon belum dibukukan' },
];

const DESIGN_SEED: SamplingDesign = { topThreshold: 7000, rationale: 'Saldo individual ≥ ambang diuji 100% (signifikan secara individual); sisanya menjadi populasi sampling MUS. Pos nol/kredit ditelaah terpisah.' };
const SAMPLING_SEED: SamplingState = { params: { bv: 245000, conf: 95, tm: 7000, em: 1200 }, findings: SAMPLE_FINDINGS, design: DESIGN_SEED, seedFrac: 0.5 };

function smpToday() {
  try { return new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch (e) { return ''; }
}
function nextSmpId(list: SampleFinding[]) {
  const n = list.reduce((mx, f) => { const m = /S-(\d+)/.exec(f.id || ''); return m ? Math.max(mx, +m[1]) : mx; }, 0);
  return 'S-' + String(n + 1).padStart(3, '0');
}

/* ============================================================ */
function SA530View() {
  const firm = useFirm();
  const auth = useAuth();
  const me = (auth && auth.user && auth.user.name) || 'Auditor';
  const client = firm?.activeClient?.name || 'PT Sentosa Makmur Tbk';
  const engId = firm?.activeEngagement?.id || 'default';
  const engLabel = firm?.activeEngagement?.id || 'ENG-2025-014';
  const locked = !!(firm && firm.locked);
  const [tab, setTab] = useState530('kalkulator');

  /* Default TM = Performance Materiality (75% × materialitas overall perikatan),
     dikonversi ke Rp juta. Konsolidasi SA 530: dahulu SamplingEngine memakai PM ini
     sebagai default; sa530 mewarisinya (fallback ke seed bila materialitas absen).
     Hanya memengaruhi seed awal — state ter-persist tetap menang. */
  const matRp = firm?.activeEngagement?.materiality;
  const pmJuta = (typeof matRp === 'number' && matRp > 0) ? Math.round((matRp * 0.75) / 1e6) : SAMPLING_SEED.params.tm;
  /* engagement-scoped (AMS_PERSIST_SCOPE: 'sampling.v1' → engagement) — isolasi W7.5
     & RBAC WP_EDIT (bukan firm/FIRM_ADMIN). scopeId = perikatan aktif otomatis. */
  const [smp, setSmp] = useAmsPersist('sampling.v1', () => ({ ...SAMPLING_SEED, params: { ...SAMPLING_SEED.params, tm: pmJuta } }));
  const params: SamplingParams = (smp && smp.params) || SAMPLING_SEED.params;
  const findings: SampleFinding[] = (smp && smp.findings) || [];
  /* backward-compat: state lama tak punya design/seedFrac → default seed */
  const design: SamplingDesign = (smp && smp.design) || DESIGN_SEED;
  const seedFrac: number = (smp && typeof smp.seedFrac === 'number') ? smp.seedFrac : 0.5;
  const { bv, conf, tm, em } = params;
  const setParam = (patch: Partial<SamplingParams>) => { if (locked) return; setSmp((s: SamplingState) => ({ ...s, params: { ...s.params, ...patch } })); };
  const setFindings = (fn: (l: SampleFinding[]) => SampleFinding[]) => setSmp((s: SamplingState) => ({ ...s, findings: fn((s && s.findings) || []) }));
  const setDesign = (patch: Partial<SamplingDesign>) => { if (locked) return; setSmp((s: SamplingState) => ({ ...s, design: { ...((s && s.design) || DESIGN_SEED), ...patch, by: me, at: smpToday() } })); };
  const setSeedFrac = (v: number) => { if (locked) return; setSmp((s: SamplingState) => ({ ...s, seedFrac: v })); };
  const setBv = (v: number) => setParam({ bv: v });
  const setConf = (v: number) => setParam({ conf: v });
  const setTm = (v: number) => setParam({ tm: v });
  const setEm = (v: number) => setParam({ em: v });

  const calc = useMemo530(() => musPlan(bv, conf, tm, em), [bv, conf, tm, em]);

  /* PR-F · Validasi silang SA 530 — TM sampel vs Performance Materiality (PM) kanon.
     PM ditarik dari SSOT materialitas (menghormati pmPct workspace, BUKAN hardcode
     ×0.75). Proyeksi salah saji ke populasi (¶13–14) konsisten dgn exportMemo &
     F530Evaluation. `accepted` = kesimpulan modul (proyeksi < TM). */
  const pmCanon: number | null = useMemo530(() => materialityFor({ engMateriality: matRp }).pm, [matRp]);
  const totalProj = useMemo530(() => findings.reduce((s: number, f: SampleFinding) => {
    const taint = f.bv ? (f.bv - f.av) / f.bv : 0;
    return s + Math.round(taint * calc.interval);
  }, 0), [findings, calc.interval]);
  const tol: SamplingToleranceResult = useMemo530(() => reconcileSamplingTolerance({
    tm, pm: pmCanon, projectedMisstatement: totalProj, accepted: totalProj < tm,
  }), [tm, pmCanon, totalProj]);

  const tabs = [
    { id: 'desain', label: 'Desain & Populasi' },
    { id: 'kalkulator', label: 'Ukuran Sampel' },
    { id: 'seleksi', label: 'Metode Seleksi' },
    { id: 'evaluasi', label: 'Evaluasi Hasil' },
  ];

  const exportMemo = () => {
    const projOf = (f: SampleFinding) => { const ms = f.bv - f.av; const taint = f.bv ? ms / f.bv : 0; return Math.round(taint * calc.interval); };
    const findRows = findings.map(f => { const ms = f.bv - f.av; return [f.id, f.type, f.bv.toLocaleString('id-ID'), f.av.toLocaleString('id-ID'), ms ? ms.toLocaleString('id-ID') : '—', projOf(f) ? projOf(f).toLocaleString('id-ID') : '—']; });
    const totalProj = findings.reduce((s, f) => s + projOf(f), 0);
    amsExportPdf({
      kind: 'memo-sampling', scope: 'engagement', scopeId: engId,
      firm: (AMS.FIRM as { name?: string }).name || 'KAP', title: 'Kertas Kerja Sampling Audit (SA 530)',
      refNo: 'S-530 · ' + engLabel,
      meta: [client + ' · ' + engLabel, 'SA 530 — Sampling Audit · Metode MUS (PPS)', 'Dibuat: ' + smpToday() + ' · ' + me],
      blocks: [
        { type: 'heading', text: 'Penentuan Ukuran Sampel' },
        { type: 'kv', rows: [['Nilai populasi disampel (jt)', bv.toLocaleString('id-ID')], ['Tingkat keyakinan', conf + '% (risiko ' + calc.risk + '%)'], ['Salah saji ditoleransi TM (jt)', tm.toLocaleString('id-ID')], ['Ekspektasi salah saji EM (jt)', em.toLocaleString('id-ID')], ['Ukuran sampel', calc.basic > 0 ? calc.n + ' item' : 'tak terdefinisi'], ['Interval sampling (jt)', calc.basic > 0 ? calc.interval.toLocaleString('id-ID') : '—']] },
        { type: 'heading', text: 'Evaluasi Salah Saji & Proyeksi ke Populasi (¶13–14)' },
        { type: 'table', head: ['Ref', 'Sifat', 'Tercatat', 'Teraudit', 'Salah Saji', 'Proyeksi'], body: findRows.length ? findRows : [['—', '—', '—', '—', '—', '—']] },
        { type: 'para', text: 'Proyeksi salah saji total Rp ' + totalProj.toLocaleString('id-ID') + ' jt ' + (totalProj < tm ? 'di bawah' : 'melampaui') + ' salah saji yang ditoleransi (TM Rp ' + tm.toLocaleString('id-ID') + ' jt). ' + (totalProj < tm ? 'Ditambah pertimbangan risiko sampling, populasi dapat diterima; salah saji aktual dicatat ke SAD.' : 'Pertimbangkan perluasan sampel atau prosedur alternatif.') },
      ],
    }).catch(() => {});
  };

  return (
    <>
      <SubBar moduleId="sa530" right={
        <div className="row gap8 ac">
          <SACanonChips stdId="sa530" />
          <Btn sm onClick={exportMemo}><I.download size={13} /> Kertas Kerja Sampling</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 210 }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Standar Audit 530</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Sampling Audit</div>
              <div className="tiny muted">{client} · Piutang Usaha · ENG-2025-014</div>
            </div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Populasi (Rp jt)</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{bv.toLocaleString('id-ID')} · {SA530_POPULATION.length} item ilustratif</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Ukuran Sampel</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--blue)' }}>{calc.n} item</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Keyakinan</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{conf}% · risiko {calc.risk}%</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Metode</div>
              <Badge kind="purple" dot>MUS (PPS)</Badge>
            </div>
          </div>
        </Panel>

        <SACanonicalStatus stdId="sa530" />

        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

        {tab === 'desain' && <F530Design bv={bv} design={design} setDesign={setDesign} locked={locked} />}
        {tab === 'kalkulator' && <F530Calc bv={bv} setBv={setBv} conf={conf} setConf={setConf} tm={tm} setTm={setTm} em={em} setEm={setEm} calc={calc} locked={locked} tol={tol} pmCanon={pmCanon} />}
        {tab === 'seleksi' && <F530Selection interval={calc.interval} bv={bv} seedFrac={seedFrac} setSeedFrac={setSeedFrac} locked={locked} />}
        {tab === 'evaluasi' && <F530Evaluation interval={calc.interval} tm={tm} findings={findings} setFindings={setFindings} me={me} locked={locked} />}

      </div></div>
    </>
  );
}

/* ---------------- Tab: Desain & Populasi ---------------- */
function F530Design({ bv, design, setDesign, locked }: { bv: number; design: SamplingDesign; setDesign: (p: Partial<SamplingDesign>) => void; locked: boolean }) {
  const pop = scalePopulation(SA530_POPULATION, bv);
  const sum = (l: PopItem[]) => l.reduce((s, p) => s + p.bv, 0);
  const top = pop.filter(p => p.bv >= design.topThreshold);
  const samp = pop.filter(p => p.bv < design.topThreshold);
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Desain Sampel (¶6–7)</h3><div style={{ flex: 1 }} /><Badge kind="blue">Keberadaan & Keakuratan</Badge></div>
          <div style={{ padding: 14, display: 'grid', gap: 12 }}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <KvBox label="Karakteristik populasi" v={`${SA530_POPULATION.length} item ilustratif · condong`} />
              <KvBox label="Nilai populasi (jt)" v={bv.toLocaleString('id-ID')} accent="var(--blue)" />
            </div>
            <div>
              <div className="row jb ac" style={{ marginBottom: 6 }}><span style={{ fontSize: 12, fontWeight: 600 }}>Ambang stratifikasi — saldo individual signifikan (Rp jt)</span><span className="tiny muted">≥ ambang diuji 100%</span></div>
              <input className="input mono" type="number" value={design.topThreshold} disabled={locked} onChange={(e: Ev) => setDesign({ topThreshold: Math.max(0, +e.target.value) })} style={{ height: 30, width: 160, textAlign: 'right' }} />
            </div>
            <div>
              <div className="row jb ac" style={{ marginBottom: 6 }}><span style={{ fontSize: 12, fontWeight: 600 }}>Rasional desain & definisi penyimpangan</span>{design.by && <span className="tiny muted">{design.by} · {design.at}</span>}</div>
              <textarea className="input" value={design.rationale} disabled={locked} onChange={(e: Ev) => setDesign({ rationale: e.target.value })} style={{ width: '100%', minHeight: 64, resize: 'vertical', lineHeight: 1.45 }} />
            </div>
          </div>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Stratifikasi Populasi</h3><div style={{ flex: 1 }} /><span className="tiny muted">Diturunkan dari ambang · top stratum diuji penuh</span></div>
          <table className="dtbl">
            <thead><tr><th>Stratum</th><th className="num">Item</th><th className="num">Nilai (jt)</th><th style={{ width: 130 }}>Pendekatan</th></tr></thead>
            <tbody>
              <tr><td style={{ fontWeight: 600 }}>Saldo ≥ ambang (individual signifikan)</td><td className="num mono">{top.length}</td><td className="num mono">{sum(top).toLocaleString('id-ID')}</td><td><Badge kind="purple">Uji 100%</Badge></td></tr>
              <tr><td style={{ fontWeight: 600 }}>Saldo dalam populasi sampling</td><td className="num mono">{samp.length}</td><td className="num mono">{sum(samp).toLocaleString('id-ID')}</td><td><Badge kind="blue">MUS</Badge></td></tr>
              <tr style={{ fontWeight: 700, background: 'var(--surface-2)' }}><td>Total populasi</td><td className="num mono">{pop.length}</td><td className="num mono">{sum(pop).toLocaleString('id-ID')}</td><td></td></tr>
            </tbody>
          </table>
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Risiko Sampling vs Non-Sampling">
          <div style={{ display: 'grid', gap: 10 }}>
            <div>
              <div className="row ac gap6" style={{ fontWeight: 700, fontSize: 12, marginBottom: 3 }}><span style={{ color: 'var(--blue)' }}><I.dice size={14} /></span>Risiko Sampling</div>
              <p className="tiny muted" style={{ margin: 0, lineHeight: 1.5 }}>Kesimpulan dari sampel berbeda dari kesimpulan bila seluruh populasi diuji. Dikendalikan lewat ukuran sampel & metode (¶A3).</p>
            </div>
            <div className="divider" />
            <div>
              <div className="row ac gap6" style={{ fontWeight: 700, fontSize: 12, marginBottom: 3 }}><span style={{ color: 'var(--amber)' }}><I.alert size={14} /></span>Risiko Non-Sampling</div>
              <p className="tiny muted" style={{ margin: 0, lineHeight: 1.5 }}>Kesalahan karena faktor manusia — prosedur tak tepat, salah interpretasi bukti. Dikendalikan lewat supervisi & review.</p>
            </div>
          </div>
        </Panel>
        <Panel title="Faktor Penentu Ukuran Sampel (¶ Lamp. 2–3)">
          <div style={{ display: 'grid', gap: 7 }}>
            {[['Risiko salah saji material ↑', 'Sampel ↑'], ['Salah saji yang ditoleransi ↑', 'Sampel ↓'], ['Ekspektasi salah saji ↑', 'Sampel ↑'], ['Stratifikasi efektif', 'Sampel ↓'], ['Jumlah unit populasi', 'Hampir tak berpengaruh']].map((r, i) => (
              <div key={i} className="row jb ac" style={{ fontSize: 11.5, padding: '6px 9px', border: '1px solid var(--line-soft)', borderRadius: 6 }}>
                <span>{r[0]}</span><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r[1]}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Kalkulator Ukuran Sampel ---------------- */
function F530Calc({ bv, setBv, conf, setConf, tm, setTm, em, setEm, calc, locked, tol, pmCanon }: any) {
  const Field = ({ label, hint, children }: any) => (
    <div style={{ marginBottom: 16 }}>
      <div className="row jb ac" style={{ marginBottom: 6 }}><span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span><span className="tiny muted">{hint}</span></div>
      {children}
    </div>
  );
  const t: SamplingToleranceResult = tol || { tm, pm: pmCanon, ratio: null, exceedsPm: false, issues: [], severe: false, count: 0 };
  return (
    <>
    {/* PR-F/SA530 — banner validasi silang TM vs PM (SA 320/530) */}
    {t.count > 0 && (
      <div className="panel" style={{ margin: '0 0 12px', padding: '11px 13px', background: t.severe ? 'var(--amber-bg)' : 'var(--blue-050)', borderColor: 'transparent' }}>
        <div className="row gap8" style={{ alignItems: 'flex-start' }}>
          <span style={{ color: t.severe ? 'var(--amber)' : 'var(--blue)', marginTop: 1 }}>{t.severe ? <I.alert size={16} /> : <I.book size={16} />}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 3 }}>
              Validasi silang SA 530 — {t.count} catatan konsistensi TM vs PM
            </div>
            <ul style={{ margin: '2px 0 0', paddingLeft: 16, fontSize: 11.5, lineHeight: 1.55, color: 'var(--ink-2)' }}>
              {t.issues.map((i, k) => (
                <li key={k} style={i.severe ? { color: 'var(--ink)' } : undefined}>{i.severe && <b>[berat] </b>}{i.text}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    )}
    <div className="grid" style={{ gridTemplateColumns: '1fr 380px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Kalkulator Ukuran Sampel — Monetary Unit Sampling</h3><div style={{ flex: 1 }} /><Badge kind="purple">PPS</Badge></div>
        <div style={{ padding: 18 }}>
          <Field label="Nilai populasi yang disampel (Rp jt)" hint={bv.toLocaleString('id-ID')}>
            <input type="range" min="50000" max="400000" step="5000" value={bv} disabled={locked} onChange={(e: Ev) => setBv(parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--blue)' }} />
          </Field>
          <Field label="Tingkat keyakinan" hint={`risiko penerimaan keliru ${calc.risk}%`}>
            <Seg options={[{ value: 90, label: '90%' }, { value: 95, label: '95%' }, { value: 99, label: '99%' }]} value={conf} onChange={setConf} />
          </Field>
          <Field label="Salah saji yang dapat ditoleransi — TM (Rp jt)" hint={tm.toLocaleString('id-ID')}>
            <input type="range" min="3000" max="14000" step="250" value={tm} disabled={locked} onChange={(e: Ev) => setTm(parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--blue)' }} />
            {/* PR-F — rujuk-silang TM aktif vs PM kanon (SA 320.9: TM ≤ PM) */}
            <div className="row jb ac tiny" style={{ marginTop: 5, color: 'var(--ink-3)' }}>
              <span className="muted">PM kanon (SA 320)</span>
              <span className="mono" style={{ fontWeight: 700, color: t.exceedsPm ? 'var(--amber)' : 'var(--ink-2)' }}>
                {t.pm != null ? 'Rp ' + t.pm.toLocaleString('id-ID') + ' jt' : 'belum ditetapkan'}
                {t.pm != null && (t.exceedsPm ? ' · TM > PM' : t.ratio != null ? ' · TM ' + Math.round(t.ratio * 100) + '% PM' : '')}
              </span>
            </div>
          </Field>
          <Field label="Ekspektasi salah saji — EM (Rp jt)" hint={em.toLocaleString('id-ID')}>
            <input type="range" min="0" max="4000" step="100" value={em} disabled={locked} onChange={(e: Ev) => setEm(parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--blue)' }} />
          </Field>

          <div className="panel" style={{ padding: '11px 13px', background: 'var(--surface-2)', borderColor: 'transparent', marginTop: 4 }}>
            <div className="tiny muted upper" style={{ marginBottom: 6 }}>Rumus MUS</div>
            <div className="mono" style={{ fontSize: 12.5, lineHeight: 1.7 }}>
              n = (NilaiPopulasi × RF) ÷ (TM − EM × EF)<br />
              n = ({bv.toLocaleString('id-ID')} × {calc.rf}) ÷ ({tm.toLocaleString('id-ID')} − {em.toLocaleString('id-ID')} × {calc.ef})<br />
              <span style={{ color: calc.basic > 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>n = {calc.basic > 0 ? calc.n + ' item' : 'tak terdefinisi — TM terlalu kecil'}</span>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '18px 18px 16px', textAlign: 'center' }}>
            <div className="tiny upper" style={{ color: '#bcd6e4', letterSpacing: '.05em' }}>Ukuran Sampel Direkomendasikan</div>
            <div className="mono" style={{ fontSize: 46, fontWeight: 800, lineHeight: 1.1, margin: '6px 0 2px' }}>{calc.basic > 0 ? calc.n : '—'}</div>
            <div className="tiny" style={{ color: '#bcd6e4' }}>unit moneter terpilih</div>
          </div>
          <div style={{ padding: 14, display: 'grid', gap: 10 }}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <KvBox label="Interval Sampling (jt)" v={calc.basic > 0 ? calc.interval.toLocaleString('id-ID') : '—'} accent="var(--purple)" />
              <KvBox label="Faktor Keandalan" v={calc.rf} />
              <KvBox label="Faktor Ekspansi" v={calc.ef} />
              <KvBox label="Presisi Dasar (jt)" v={calc.basic > 0 ? Math.round(calc.basic).toLocaleString('id-ID') : '—'} />
            </div>
          </div>
        </Panel>
        <Panel title="Catatan Pertimbangan">
          <div className="panel" style={{ padding: '10px 12px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
            <div className="row gap8" style={{ alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.book size={15} /></span>
              <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Ukuran populasi (jumlah item) <b>tidak</b> berpengaruh signifikan pada ukuran sampel untuk populasi besar (¶A11). Penentu utama: keyakinan yang diinginkan, TM, dan ekspektasi salah saji.</span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
    </>
  );
}

/* ---------------- Tab: Metode Seleksi ---------------- */
function F530Selection({ interval, bv, seedFrac, setSeedFrac, locked }: { interval: number; bv: number; seedFrac: number; setSeedFrac: (v: number) => void; locked: boolean }) {
  const seedStart = Math.max(1, Math.round(seedFrac * interval));
  const selected: SelectedItem[] = useMemo530(() => selectMus(scalePopulation(SA530_POPULATION, bv), interval, seedStart), [bv, interval, seedStart]);
  /* ---- data peta sumbu-moneter (di-port dari SamplingEngine saat konsolidasi) ---- */
  const scaled: PopItem[] = useMemo530(() => scalePopulation(SA530_POPULATION, bv), [bv]);
  const popTotal = scaled.reduce((s, p) => s + p.bv, 0);
  const selIds = useMemo530(() => new Set(selected.map(s => s.id)), [selected]);
  const spans: { id: string; name: string; bv: number; from: number; to: number; key: boolean }[] = useMemo530(() => { let cum = 0; return scaled.map(p => { const from = cum; cum += p.bv; return { id: p.id, name: p.name, bv: p.bv, from, to: cum, key: p.bv >= interval }; }); }, [scaled, interval]);
  const ticks: number[] = useMemo530(() => { const out: number[] = []; if (interval > 0) { for (let u = seedStart, k = 0; u <= popTotal && k < 80; u += interval, k++) out.push(u); } return out; }, [interval, seedStart, popTotal]);
  const totalHits = selected.reduce((s, x) => s + x.hits, 0);
  const keyN = selected.filter(s => s.key).length;
  const reroll = () => { if (locked) return; setSeedFrac(Math.random()); };
  const methods = [
    { k: 'MUS / PPS', sel: true, d: 'Seleksi proporsional terhadap nilai (probability-proportional-to-size). Item bernilai lebih besar berpeluang lebih besar terpilih.', use: 'Dieksekusi pada tab ini — efektif untuk uji lebih saji & populasi condong.', tag: 'Dieksekusi' },
    { k: 'Acak (random)', sel: false, d: 'Setiap unit pengambilan punya peluang sama terpilih. Memerlukan penomoran populasi.', use: 'Alternatif bila fokus pada deviasi atribut, bukan nilai.', tag: 'Tersedia' },
    { k: 'Sistematis', sel: false, d: 'Titik awal acak lalu interval tetap. Hati-hati pola periodik dalam populasi.', use: 'Cocok bila tidak ada pola sistematik berkorelasi.', tag: 'Tersedia' },
    { k: 'Haphazard', sel: false, d: 'Tanpa teknik terstruktur namun tanpa bias sadar. Tidak untuk sampling statistik.', use: 'Hanya untuk pendekatan non-statistik.', tag: 'Tidak dipakai' },
  ];
  return (
    <div className="grid" style={{ gap: 12 }}>
      <Panel noBody>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 0 }}>
          {[
            { v: selected.length, l: 'Item Terpilih', a: 'var(--blue)' },
            { v: totalHits, l: 'Unit Moneter Tertusuk', a: 'var(--purple)' },
            { v: keyN, l: 'Key Item (≥ interval)', a: 'var(--ink)' },
            { v: seedStart.toLocaleString('id-ID'), l: 'Titik Mulai (jt)', a: 'var(--ink)' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '12px 16px', borderRight: i < 3 ? '1px solid var(--line-soft)' : 0 }}><Stat value={s.v} label={s.l} accent={s.a} /></div>
          ))}
        </div>
      </Panel>

      <Panel noBody>
        <div className="panel-h"><h3>Peta Seleksi Sistematis — Sumbu Unit Moneter (¶ Lamp. 4)</h3><div style={{ flex: 1 }} /><span className="tiny muted">{selected.length} item terpilih · {ticks.length} titik pilih</span></div>
        <div style={{ padding: 14 }}>
          {interval > 0 ? (
            <>
              <div style={{ position: 'relative', height: 54, marginBottom: 10 }}>
                <div style={{ position: 'absolute', left: 0, right: 0, top: 24, height: 8, borderRadius: 4, background: 'var(--surface-3)', overflow: 'hidden', display: 'flex' }}>
                  {spans.map(p => {
                    const w = popTotal ? (p.bv / popTotal) * 100 : 0;
                    const isSel = selIds.has(p.id);
                    return <div key={p.id} title={p.name + ': ' + p.bv.toLocaleString('id-ID') + ' jt'} style={{ width: w + '%', height: '100%', background: isSel ? (p.key ? 'var(--purple)' : 'var(--blue)') : 'transparent', borderRight: '1px solid var(--surface)', opacity: isSel ? 1 : 0.25 }} />;
                  })}
                </div>
                {ticks.map((u, i) => <div key={i} style={{ position: 'absolute', top: 18, left: (popTotal ? (u / popTotal) * 100 : 0) + '%', width: 1.5, height: 20, background: 'var(--navy)', opacity: 0.55 }} title={'Unit pilih ' + (i + 1)} />)}
                <div className="tiny muted" style={{ position: 'absolute', top: 38, left: 0 }}>Rp 0</div>
                <div className="tiny muted" style={{ position: 'absolute', top: 38, right: 0 }}>{popTotal.toLocaleString('id-ID')} jt</div>
              </div>
              <div className="row gap12 tiny muted">
                <span className="row ac gap6"><span style={{ width: 10, height: 8, borderRadius: 2, background: 'var(--purple)' }} /> Individual ≥ interval (pasti terpilih)</span>
                <span className="row ac gap6"><span style={{ width: 10, height: 8, borderRadius: 2, background: 'var(--blue)' }} /> Terpilih sistematis</span>
                <span className="row ac gap6"><span style={{ width: 2, height: 12, background: 'var(--navy)' }} /> Titik pilih (kelipatan interval)</span>
              </div>
            </>
          ) : <div className="tiny muted">Interval tak terdefinisi — sesuaikan parameter di tab Ukuran Sampel.</div>}
        </div>
      </Panel>

      <Panel noBody>
        <div className="panel-h"><h3>Item Sampel Terpilih — MUS Sistematis (¶ Lamp. 4)</h3><div style={{ flex: 1 }} /><span className="tiny muted">interval {interval.toLocaleString('id-ID')} · mulai {seedStart.toLocaleString('id-ID')} jt</span>{!locked && <Btn sm style={{ marginLeft: 8 }} onClick={reroll}><I.dice size={12} /> Acak ulang titik mulai</Btn>}</div>
        {interval > 0 ? (
          <table className="dtbl">
            <thead><tr><th style={{ width: 90 }}>Ref</th><th>Pelanggan</th><th className="num">Nilai Buku (jt)</th><th className="num" style={{ width: 84 }}>Tertusuk</th><th style={{ width: 110 }}>Jenis</th></tr></thead>
            <tbody>
              {selected.map(s => (
                <tr key={s.id}>
                  <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{s.id}</td>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td className="num mono">{s.bv.toLocaleString('id-ID')}</td>
                  <td className="num mono">{s.hits}×</td>
                  <td>{s.key ? <Badge kind="purple">Key item</Badge> : <Badge kind="blue">Sampel</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="tiny muted" style={{ padding: 16 }}>Interval tak terdefinisi — sesuaikan parameter di tab Ukuran Sampel.</div>}
      </Panel>

      <Panel noBody>
        <div className="panel-h"><h3>Metode Seleksi Sampel (¶ Lamp. 4)</h3><div style={{ flex: 1 }} /><span className="tiny muted">4 metode dipertimbangkan</span></div>
        <div style={{ padding: '6px 14px 14px' }}>
          {methods.map((m, i) => (
            <div key={i} className="row gap12" style={{ padding: '12px 0', alignItems: 'flex-start', borderBottom: i < methods.length - 1 ? '1px solid var(--line-soft)' : 0, opacity: m.k === 'Haphazard' ? 0.6 : 1 }}>
              <span style={{ flex: '0 0 34px', width: 34, height: 34, borderRadius: 8, display: 'grid', placeItems: 'center', background: m.sel ? 'var(--purple-bg)' : 'var(--surface-2)', color: m.sel ? 'var(--purple)' : 'var(--ink-3)' }}>{m.sel ? <I.checkCircle size={17} /> : <I.dice size={16} />}</span>
              <div style={{ flex: 1 }}>
                <div className="row jb ac"><div style={{ fontSize: 12.5, fontWeight: 700 }}>{m.k}</div><Badge kind={m.sel ? 'purple' : m.tag === 'Tidak dipakai' ? 'gray' : 'blue'}>{m.tag}</Badge></div>
                <div className="tiny muted" style={{ lineHeight: 1.45, margin: '3px 0 5px' }}>{m.d}</div>
                <div className="chip tiny" style={{ background: m.sel ? 'var(--purple-bg)' : 'var(--surface-2)' }}>{m.use}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- Tab: Evaluasi Hasil ---------------- */
function F530Evaluation({ interval, tm, findings, setFindings, me, locked }: any) {
  const rows = (findings as SampleFinding[]).map(f => {
    const ms = f.bv - f.av;
    const taint = f.bv ? ms / f.bv : 0;
    const proj = Math.round(taint * interval);
    return { ...f, ms, taint, proj };
  });
  const totalProj = rows.reduce((s, r) => s + r.proj, 0);
  const exceptions = rows.filter(r => r.ms !== 0).length;
  const within = totalProj < tm;
  const patch = (id: string, p: Partial<SampleFinding>) => setFindings((l: SampleFinding[]) => l.map(f => f.id === id ? { ...f, ...p, by: me, at: smpToday() } : f));
  const add = () => setFindings((l: SampleFinding[]) => [...l, { id: nextSmpId(l), bv: 0, av: 0, type: 'Salah saji baru', by: me, at: smpToday() }]);
  const del = (id: string) => setFindings((l: SampleFinding[]) => l.filter(f => f.id !== id));
  return (
    <div className="grid" style={{ gap: 12 }}>
      <Panel noBody>
        <div className="panel-h"><h3>Proyeksi Salah Saji ke Populasi (¶13–14)</h3><div style={{ flex: 1 }} /><Badge kind={exceptions ? 'amber' : 'green'}>{exceptions} salah saji ditemukan</Badge>{!locked && <Btn sm style={{ marginLeft: 8 }} onClick={add}><I.plus size={12} /> Tambah</Btn>}</div>
        <table className="dtbl">
          <thead><tr><th style={{ width: 60 }}>Ref</th><th>Sifat</th><th className="num" style={{ width: 110 }}>Tercatat</th><th className="num" style={{ width: 110 }}>Teraudit</th><th className="num">Salah Saji</th><th className="num">Tainting</th><th className="num">Proyeksi</th>{!locked && <th style={{ width: 30 }}></th>}</tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.id}</td>
                <td style={{ fontWeight: 600, whiteSpace: 'normal' }}>{locked ? r.type : <input className="input" value={r.type} onChange={(e: Ev) => patch(r.id, { type: e.target.value })} style={{ height: 26 }} />}</td>
                <td className="num mono">{locked ? r.bv.toLocaleString('id-ID') : <input className="input mono" type="number" value={r.bv} onChange={(e: Ev) => patch(r.id, { bv: +e.target.value })} style={{ height: 26, width: 96, textAlign: 'right' }} />}</td>
                <td className="num mono">{locked ? r.av.toLocaleString('id-ID') : <input className="input mono" type="number" value={r.av} onChange={(e: Ev) => patch(r.id, { av: +e.target.value })} style={{ height: 26, width: 96, textAlign: 'right' }} />}</td>
                <td className="num mono" style={{ color: r.ms ? 'var(--amber)' : 'var(--ink-4)' }}>{r.ms ? r.ms.toLocaleString('id-ID') : '—'}</td>
                <td className="num mono tiny">{(r.taint * 100).toFixed(1)}%</td>
                <td className="num mono" style={{ fontWeight: 700, color: r.proj ? 'var(--red)' : 'var(--ink-4)' }}>{r.proj ? r.proj.toLocaleString('id-ID') : '—'}</td>
                {!locked && <td><button className="btn sm icon" title="Hapus" onClick={() => del(r.id)}><I.x size={12} /></button></td>}
              </tr>
            ))}
            <tr style={{ fontWeight: 700, background: 'var(--surface-2)' }}>
              <td colSpan={locked ? 6 : 6}>Proyeksi salah saji total (untuk item &lt; interval)</td>
              <td className="num mono" style={{ color: 'var(--red)' }}>{totalProj.toLocaleString('id-ID')}</td>
              {!locked && <td></td>}
            </tr>
          </tbody>
        </table>
      </Panel>

      <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Kesimpulan Sampel (¶15)</h3><div style={{ flex: 1 }} /></div>
          <div style={{ padding: 14 }}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <KvBox label="Proyeksi Salah Saji (jt)" v={totalProj.toLocaleString('id-ID')} accent="var(--red)" />
              <KvBox label="Dapat Ditoleransi (jt)" v={tm.toLocaleString('id-ID')} accent="var(--green)" />
            </div>
            <div style={{ marginBottom: 10 }}>
              <div className="row jb tiny" style={{ marginBottom: 4 }}><span className="muted">Proyeksi vs Toleransi</span><span className="mono" style={{ fontWeight: 700 }}>{Math.round(totalProj / tm * 100)}%</span></div>
              <Progress value={Math.round(totalProj / tm * 100)} color={within ? 'var(--green)' : 'var(--red)'} />
            </div>
            <div className="panel" style={{ padding: '10px 12px', background: within ? 'var(--green-bg)' : 'var(--red-bg)', borderColor: 'transparent' }}>
              <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                <span style={{ color: within ? 'var(--green)' : 'var(--red)', flex: '0 0 auto' }}>{within ? <I.checkCircle size={16} /> : <I.alert size={16} />}</span>
                <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>{within
                  ? <>Proyeksi salah saji (<b>{totalProj.toLocaleString('id-ID')} jt</b>) <b>di bawah</b> salah saji yang ditoleransi. Ditambah pertimbangan risiko sampling, populasi dapat diterima — namun salah saji aktual dicatat ke <b>SAD Ledger</b>.</>
                  : <>Proyeksi salah saji <b>melampaui</b> toleransi — pertimbangkan perluasan sampel atau prosedur alternatif, dan diskusikan koreksi dengan manajemen.</>}</span>
              </div>
            </div>
          </div>
        </Panel>

        <div className="grid" style={{ gap: 12 }}>
          <Panel title="Sifat & Sebab Penyimpangan (¶12)">
            <p className="tiny muted" style={{ margin: 0, lineHeight: 1.5 }}>Auditor menyelidiki sifat & penyebab setiap penyimpangan serta mengevaluasi dampaknya pada tujuan prosedur & area audit lain. Tidak ada indikasi <b>anomali</b> (kesalahan satu kali yang bukan representatif) — semua diperlakukan representatif & diproyeksikan.</p>
          </Panel>
          <Panel title="Tautan Modul">
            <div style={{ display: 'grid', gap: 7 }}>
              {[['SAD Ledger — catat salah saji', 'scale'], ['Confirmation Hub (SA 505)', 'mail'], ['Materiality — TM & MK', 'target']].map((r, i) => {
                const Lic = (I as any)[r[1]];
                return (
                  <div key={i} className="row jb ac" style={{ fontSize: 12, padding: '8px 10px', border: '1px solid var(--line-soft)', borderRadius: 7 }}>
                    <span className="row ac gap8"><span style={{ color: 'var(--blue)' }}><Lic size={14} /></span>{r[0]}</span>
                    <I.arrowRight size={14} style={{ color: 'var(--ink-4)' }} />
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      </div>

      <WpPanel moduleId="sa530" title="Kertas Kerja — Sign-off, Bukti & Kesimpulan (SA 530/230)" />
    </div>
  );
}

Object.assign(window, { SA530View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SA530View };
