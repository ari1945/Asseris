/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAmsPersist, useAuth, useFirm } from './contexts';
import { amsExportPdf } from './export_pdf';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Panel, Spark } from './ui';
import { RowKv } from './view_calc';
import { WpPanel } from './wp_signoff';

/* ============================================================
   Asseris — Going Concern (SA 570)
   ============================================================ */
const { useMemo: useMemoGC } = React;

const GC_RATIOS = [
  { id: 'cr',  label: 'Current Ratio',     value: 1.60, py: 1.82, unit: 'x',  good: (v: any) => v >= 1.2, warn: (v: any) => v >= 1.0, trend: [2.1, 1.95, 1.82, 1.71, 1.60], hint: 'Aset Lancar ÷ Liabilitas Jk. Pendek' },
  { id: 'qr',  label: 'Quick Ratio',       value: 0.79, py: 0.95, unit: 'x',  good: (v: any) => v >= 1.0, warn: (v: any) => v >= 0.7, trend: [1.1, 1.02, 0.95, 0.86, 0.79], hint: '(Aset Lancar − Persediaan) ÷ Liab. Jk. Pendek' },
  { id: 'der', label: 'Debt-to-Equity',    value: 0.97, py: 0.88, unit: 'x',  good: (v: any) => v <= 1.0, warn: (v: any) => v <= 1.5, trend: [0.74, 0.81, 0.88, 0.92, 0.97], hint: 'Total Liabilitas ÷ Total Ekuitas', invert: true },
  { id: 'icr', label: 'Interest Coverage', value: 3.96, py: 4.80, unit: 'x',  good: (v: any) => v >= 3, warn: (v: any) => v >= 1.5, trend: [6.1, 5.4, 4.8, 4.3, 3.96], hint: 'EBIT ÷ Beban Bunga' },
  { id: 'ocf', label: 'Arus Kas Operasi',  value: 18.2, py: 22.4, unit: ' M', good: (v: any) => v > 0, warn: (v: any) => v > -5, trend: [28, 25, 22.4, 20.1, 18.2], hint: 'Arus kas dari aktivitas operasi (Rp M)' },
  { id: 'wc',  label: 'Modal Kerja',        value: 57.1, py: 64.8, unit: ' M', good: (v: any) => v > 0, warn: (v: any) => v > 0, trend: [78, 71, 64.8, 60.5, 57.1], hint: 'Aset Lancar − Liab. Jk. Pendek (Rp M)' },
];

const GC_INDICATORS: GCIndicators = {
  Keuangan: [
    { id: 'k1', label: 'Posisi liabilitas lancar bersih (net current liability)', on: false },
    { id: 'k2', label: 'Arus kas operasi negatif', on: false },
    { id: 'k3', label: 'Rasio keuangan kunci memburuk', on: true },
    { id: 'k4', label: 'Kerugian operasi substansial', on: false },
    { id: 'k5', label: 'Ketidakmampuan membayar kreditur saat jatuh tempo', on: false },
    { id: 'k6', label: 'Kesulitan memperoleh pendanaan baru', on: false },
  ],
  Operasi: [
    { id: 'o1', label: 'Kehilangan manajemen kunci tanpa pengganti', on: false },
    { id: 'o2', label: 'Kehilangan pasar/pelanggan/pemasok utama', on: false },
    { id: 'o3', label: 'Kesulitan tenaga kerja', on: false },
    { id: 'o4', label: 'Kelangkaan pasokan penting', on: false },
  ],
  Lainnya: [
    { id: 'l1', label: 'Ketidakpatuhan terhadap ketentuan permodalan/perundangan', on: false },
    { id: 'l2', label: 'Proses hukum yang dapat berdampak material', on: true },
    { id: 'l3', label: 'Perubahan peraturan/kebijakan pemerintah yang merugikan', on: false },
  ],
};

/* ---- model going concern substantif ter-persist engagement-scoped (SA-08) ---- */
type GCIndicator = { id: string; label: string; on: boolean };
type GCIndicators = Record<string, GCIndicator[]>;
type DebtMaturity = { month: number; amount: number };
type GCAssumptions = { openingCash: number; baseInflow: number; baseOutflow: number; debtMonths: DebtMaturity[] };
type GCScenario = { revShock: number; costCut: number; financing: boolean };
type Covenant = { id: string; name: string; metric: string; threshold: number; actual: number; dir: '≥' | '≤'; by?: string; at?: string };
type Mitigation = { id: string; plan: string; type: string; feasibility: string; evidence: boolean; note: string; by?: string; at?: string };
type GCState = { assumptions: GCAssumptions; scenario: GCScenario; indicators: GCIndicators; covenants: Covenant[]; mitigations: Mitigation[] };
/* tipe struktural minimal event input — hindari explicit-any (ratchet) */
type Ev = { target: { value: string } };

const MITI_FEAS = ['Tinggi', 'Sedang', 'Rendah'];

const GC_COVENANTS_SEED: Covenant[] = [
  { id: 'CV-01', name: 'Debt Service Coverage Ratio', metric: 'DSCR', threshold: 1.20, actual: 1.34, dir: '≥' },
  { id: 'CV-02', name: 'Maksimum Debt-to-EBITDA', metric: 'Debt/EBITDA', threshold: 3.50, actual: 3.62, dir: '≤' },
  { id: 'CV-03', name: 'Minimum Current Ratio (bank covenant)', metric: 'Current Ratio', threshold: 1.25, actual: 1.60, dir: '≥' },
];

const GC_MITIGATIONS_SEED: Mitigation[] = [
  { id: 'MT-01', plan: 'Refinancing fasilitas jatuh tempo Jun & Des (term sheet bank)', type: 'Pendanaan', feasibility: 'Tinggi', evidence: true, note: 'Term sheet indikatif diterima; due diligence bank berjalan.' },
  { id: 'MT-02', plan: 'Program efisiensi biaya operasi 8% (opex)', type: 'Operasional', feasibility: 'Sedang', evidence: false, note: 'Rencana manajemen; realisasi penghematan belum terbukti.' },
  { id: 'MT-03', plan: 'Divestasi aset non-inti untuk likuiditas', type: 'Aset', feasibility: 'Rendah', evidence: false, note: 'Masih kajian; belum ada komitmen pembeli.' },
];

const GC_SEED: GCState = {
  assumptions: { openingCash: 21.9, baseInflow: 28.5, baseOutflow: 26.8, debtMonths: [{ month: 5, amount: 8.0 }, { month: 11, amount: 8.0 }] },
  scenario: { revShock: 0, costCut: 0, financing: true },
  indicators: GC_INDICATORS,
  covenants: GC_COVENANTS_SEED,
  mitigations: GC_MITIGATIONS_SEED,
};

function gcToday() {
  try { return new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch (e) { return ''; }
}
function nextCovId(list: Covenant[]) {
  const n = list.reduce((mx, c) => { const m = /CV-(\d+)/.exec(c.id || ''); return m ? Math.max(mx, +m[1]) : mx; }, 0);
  return 'CV-' + String(n + 1).padStart(2, '0');
}
function nextMitiId(list: Mitigation[]) {
  const n = list.reduce((mx, c) => { const m = /MT-(\d+)/.exec(c.id || ''); return m ? Math.max(mx, +m[1]) : mx; }, 0);
  return 'MT-' + String(n + 1).padStart(2, '0');
}
function covBreached(c: Covenant) { return c.dir === '≥' ? c.actual < c.threshold : c.actual > c.threshold; }

function GoingConcern() {
  const { fmt } = AMS;
  const firm = useFirm();
  const auth = useAuth();
  const me = (auth && auth.user && auth.user.name) || 'Auditor';
  const client = firm?.activeClient?.name || 'PT Sentosa Makmur Tbk';
  const engId = firm?.activeEngagement?.id || 'default';
  const engLabel = firm?.activeEngagement?.id || 'ENG-2025-014';
  const locked = !!(firm && firm.locked);
  const [gc, setGc] = useAmsPersist('goingconcern.' + engId, () => GC_SEED);
  const assumptions: GCAssumptions = (gc && gc.assumptions) || GC_SEED.assumptions;
  const scenario: GCScenario = (gc && gc.scenario) || GC_SEED.scenario;
  const inds: GCIndicators = (gc && gc.indicators) || GC_SEED.indicators;
  const covenants: Covenant[] = (gc && gc.covenants) || [];
  const mitigations: Mitigation[] = (gc && gc.mitigations) || [];
  const { revShock, costCut, financing } = scenario;

  const setScenario = (patch: Partial<GCScenario>) => { if (locked) return; setGc((s: GCState) => ({ ...s, scenario: { ...s.scenario, ...patch } })); };
  const setAssumption = (patch: Partial<GCAssumptions>) => { if (locked) return; setGc((s: GCState) => ({ ...s, assumptions: { ...s.assumptions, ...patch } })); };
  const setDebt = (i: number, patch: Partial<DebtMaturity>) => { if (locked) return; setGc((s: GCState) => ({ ...s, assumptions: { ...s.assumptions, debtMonths: s.assumptions.debtMonths.map((d, j) => j === i ? { ...d, ...patch } : d) } })); };
  const toggle = (cat: string, id: string) => { if (locked) return; setGc((s: GCState) => ({ ...s, indicators: { ...s.indicators, [cat]: s.indicators[cat].map(it => it.id === id ? { ...it, on: !it.on } : it) } })); };
  const setCovenants = (fn: (l: Covenant[]) => Covenant[]) => setGc((s: GCState) => ({ ...s, covenants: fn(s.covenants || []) }));
  const setMitigations = (fn: (l: Mitigation[]) => Mitigation[]) => setGc((s: GCState) => ({ ...s, mitigations: fn(s.mitigations || []) }));

  /* 12-month cash projection dari asumsi yang dapat diedit & tersimpan */
  const projection = useMemoGC(() => {
    let bal = assumptions.openingCash;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    const rows = [];
    for (let i = 0; i < 12; i++) {
      const inflow = assumptions.baseInflow * (1 - revShock / 100);
      const outflow = assumptions.baseOutflow * (1 - costCut / 100);
      const dm = assumptions.debtMonths.find(d => d.month === i);
      const debt = dm ? (financing ? 0 : dm.amount) : 0;
      const net = inflow - outflow - debt;
      bal += net;
      rows.push({ m: months[i], inflow, outflow, debt, net, bal });
    }
    return rows;
  }, [assumptions, revShock, costCut, financing]);

  const minBal = Math.min(...projection.map((r: any) => r.bal));
  const breach = projection.find((r: any) => r.bal < 0);
  const minBar = Math.max(...projection.map((r: any) => Math.abs(r.bal)), 5);

  const covBreaches = covenants.filter(covBreached).length;
  const triggered = Object.values(inds).flat().filter((i) => i.on).length;
  const ratioFlags = GC_RATIOS.filter(r => !r.good(r.value)).length;
  const score = triggered * 2 + ratioFlags + covBreaches * 2;
  const level = score >= 8 ? { l: 'Material Uncertainty', k: 'red', txt: 'Terdapat ketidakpastian material atas kelangsungan usaha. Pertimbangkan paragraf "Material Uncertainty Related to Going Concern" pada laporan auditor (SA 570 ¶22).' }
    : score >= 4 ? { l: 'Elevated', k: 'amber', txt: 'Terdapat indikasi yang perlu dievaluasi lebih lanjut beserta rencana mitigasi manajemen. Dokumentasikan kesimpulan dan pengaruhnya terhadap opini.' }
    : { l: 'Low Risk', k: 'green', txt: 'Tidak terdapat ketidakpastian material. Penggunaan dasar kelangsungan usaha oleh manajemen dinilai tepat — opini standar (unmodified).' };

  // Altman Z proxy
  const z = (1.2 * 0.18 + 1.4 * 0.31 + 3.3 * 0.11 + 0.6 * 1.03 + 1.0 * 1.05).toFixed(2);

  const exportMemo = () => {
    const projRows = projection.map((r: any) => [r.m, r.inflow.toFixed(1), r.outflow.toFixed(1), r.debt ? r.debt.toFixed(1) : '—', r.bal.toFixed(1)]);
    const covRows = covenants.map(c => [c.id, c.name, c.dir + ' ' + c.threshold.toFixed(2), c.actual.toFixed(2), covBreached(c) ? 'LANGGAR' : 'Patuh']);
    const mitiRows = mitigations.map(m => [m.id, m.plan, m.type, m.feasibility, m.evidence ? 'Ya' : 'Belum']);
    amsExportPdf({
      kind: 'memo-goingconcern', scope: 'engagement', scopeId: engId,
      firm: (AMS.FIRM as { name?: string }).name || 'KAP', title: 'Memo Penilaian Kelangsungan Usaha (SA 570)',
      refNo: 'A-570 · ' + engLabel,
      meta: [client + ' · ' + engLabel, 'SA 570 — Going Concern · Penilaian: ' + level.l, 'Kas terendah 12 bln: Rp ' + minBal.toFixed(1) + ' M' + (breach ? ' · defisit ' + breach.m : ''), 'Dibuat: ' + gcToday() + ' · ' + me],
      blocks: [
        { type: 'para', text: level.txt },
        { type: 'heading', text: 'Proyeksi Arus Kas 12 Bulan (Rp miliar)' },
        { type: 'table', head: ['Bulan', 'Masuk', 'Keluar', 'Utang JT', 'Saldo'], body: projRows },
        { type: 'heading', text: 'Uji Kepatuhan Covenant' },
        { type: 'table', head: ['Ref', 'Covenant', 'Ambang', 'Aktual', 'Status'], body: covRows.length ? covRows : [['—', '—', '—', '—', '—']] },
        { type: 'heading', text: 'Evaluasi Rencana Mitigasi Manajemen (SA 570 ¶16)' },
        { type: 'table', head: ['Ref', 'Rencana', 'Jenis', 'Kelayakan', 'Berbukti'], body: mitiRows.length ? mitiRows : [['—', '—', '—', '—', '—']] },
      ],
    }).catch(() => {});
  };

  return (
    <>
      <SubBar moduleId="goingconcern" right={
        <div className="row gap8 ac">
          <Badge kind="blue">SA 570</Badge>
          <Btn sm onClick={exportMemo}><I.download size={13} /> Memo Going Concern</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad">
          {/* verdict banner */}
          <Panel noBody style={{ marginBottom: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'stretch' }}>
              <div style={{ width: 6, background: `var(--${level.k === 'red' ? 'red' : level.k === 'amber' ? 'amber' : 'green'})` }} />
              <div style={{ padding: '13px 16px', flex: 1 }}>
                <div className="row ac gap8" style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Penilaian Kelangsungan Usaha</span>
                  <Badge kind={level.k}>{level.l}</Badge>
                  <span className="tiny muted">· {triggered} indikator aktif · {ratioFlags} rasio di bawah ambang{covBreaches ? ` · ${covBreaches} covenant dilanggar` : ''}</span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5, maxWidth: 880 }}>{level.txt}</div>
              </div>
              <div style={{ padding: '13px 18px', borderLeft: '1px solid var(--line)', textAlign: 'center', display: 'grid', placeItems: 'center' }}>
                <div className="tiny muted upper">Altman Z-Score</div>
                <div className="mono" style={{ fontSize: 24, fontWeight: 700, color: (+z) > 2.99 ? 'var(--green)' : (+z) > 1.8 ? 'var(--amber)' : 'var(--red)' }}>{z}</div>
                <div className="tiny muted">{(+z) > 2.99 ? 'Safe zone' : (+z) > 1.8 ? 'Grey zone' : 'Distress'}</div>
              </div>
            </div>
          </Panel>

          {/* ratios grid */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 12 }}>
            {GC_RATIOS.map(r => {
              const st = r.good(r.value) ? 'green' : r.warn(r.value) ? 'amber' : 'red';
              const improving = r.invert ? r.value < r.py : r.value > r.py;
              return (
                <Panel key={r.id} noBody>
                  <div style={{ padding: '11px 13px' }}>
                    <div className="row jb ac" style={{ marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>{r.label}</span>
                      <span className={'badge b-' + st} style={{ padding: '1px 6px' }}>{st === 'green' ? 'OK' : st === 'amber' ? 'Pantau' : 'Risiko'}</span>
                    </div>
                    <div className="row jb" style={{ alignItems: 'flex-end' }}>
                      <div>
                        <span className="mono" style={{ fontSize: 23, fontWeight: 700, color: 'var(--navy)' }}>{r.value.toFixed(2)}{r.unit}</span>
                        <div className="tiny muted" style={{ marginTop: 2 }}>
                          PY {r.py.toFixed(2)}{r.unit} · <span style={{ color: improving ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{improving ? '▲ membaik' : '▼ menurun'}</span>
                        </div>
                      </div>
                      <Spark data={r.trend} width={92} height={34} color={st === 'green' ? '#1f7a4d' : st === 'amber' ? '#c79a1e' : '#b3261e'} />
                    </div>
                    <div className="tiny muted" style={{ marginTop: 7, paddingTop: 7, borderTop: '1px solid var(--line-soft)' }}>{r.hint}</div>
                  </div>
                </Panel>
              );
            })}
          </div>

          {/* cash flow projection + stress test */}
          <div className="grid" style={{ gridTemplateColumns: '300px 1fr', gap: 12, marginBottom: 12, alignItems: 'start' }}>
            <Panel title="Asumsi & Stress Test" sub="Input klien · skenario 12 bulan">
              <div className="tiny muted upper" style={{ marginBottom: 6 }}>Asumsi Proyeksi Arus Kas (Rp M)</div>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div className="field"><label>Kas awal</label><input className="input mono" type="number" step="0.1" value={assumptions.openingCash} disabled={locked} onChange={(e: Ev) => setAssumption({ openingCash: +e.target.value })} style={{ height: 28, textAlign: 'right' }} /></div>
                <div className="field"><label>Arus masuk/bln</label><input className="input mono" type="number" step="0.1" value={assumptions.baseInflow} disabled={locked} onChange={(e: Ev) => setAssumption({ baseInflow: +e.target.value })} style={{ height: 28, textAlign: 'right' }} /></div>
                <div className="field"><label>Arus keluar/bln</label><input className="input mono" type="number" step="0.1" value={assumptions.baseOutflow} disabled={locked} onChange={(e: Ev) => setAssumption({ baseOutflow: +e.target.value })} style={{ height: 28, textAlign: 'right' }} /></div>
                <div className="field"><label>Utang JT (Rp M)</label>
                  <div style={{ display: 'grid', gap: 4 }}>
                    {assumptions.debtMonths.map((d, i) => (
                      <div key={i} className="row ac gap6">
                        <span className="tiny muted" style={{ width: 30 }}>{['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'][d.month]}</span>
                        <input className="input mono" type="number" step="0.1" value={d.amount} disabled={locked} onChange={(e: Ev) => setDebt(i, { amount: +e.target.value })} style={{ height: 26, textAlign: 'right', flex: 1 }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="divider" />
              <div style={{ marginBottom: 14 }}>
                <div className="row jb ac" style={{ marginBottom: 4 }}><span style={{ fontSize: 12, fontWeight: 600 }}>Penurunan Pendapatan</span><span className="mono" style={{ fontWeight: 700, color: revShock > 0 ? 'var(--red)' : 'var(--ink)' }}>−{revShock}%</span></div>
                <input type="range" min="0" max="40" value={revShock} disabled={locked} onChange={(e: Ev) => setScenario({ revShock: +e.target.value })} style={{ width: '100%', accentColor: 'var(--red)' }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <div className="row jb ac" style={{ marginBottom: 4 }}><span style={{ fontSize: 12, fontWeight: 600 }}>Efisiensi Biaya (mitigasi)</span><span className="mono" style={{ fontWeight: 700, color: costCut > 0 ? 'var(--green)' : 'var(--ink)' }}>−{costCut}%</span></div>
                <input type="range" min="0" max="25" value={costCut} disabled={locked} onChange={(e: Ev) => setScenario({ costCut: +e.target.value })} style={{ width: '100%', accentColor: 'var(--green)' }} />
              </div>
              <label className="row ac gap8" style={{ cursor: 'pointer', fontSize: 12, marginBottom: 12 }}>
                <span onClick={() => setScenario({ financing: !financing })} style={{ width: 36, height: 20, borderRadius: 11, background: financing ? 'var(--green)' : 'var(--line-strong)', position: 'relative', transition: '.15s', flex: '0 0 36px' }}><span style={{ position: 'absolute', top: 2, left: financing ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff' }} /></span>
                Refinancing utang tersedia
              </label>
              <div className="divider" />
              <div style={{ display: 'grid', gap: 6 }}>
                <RowKv label="Kas terendah (12 bln)" v={'Rp ' + minBal.toFixed(1) + ' M'} strong />
                <RowKv label="Bulan defisit pertama" v={breach ? breach.m : 'Tidak ada'} />
              </div>
              <div className="panel" style={{ marginTop: 10, padding: '9px 11px', background: breach ? 'var(--red-bg)' : minBal < 5 ? 'var(--amber-bg)' : 'var(--green-bg)', borderColor: 'transparent' }}>
                <div className="row ac gap8"><span style={{ color: breach ? 'var(--red)' : minBal < 5 ? 'var(--amber)' : 'var(--green)' }}>{breach ? <I.alert size={15} /> : <I.checkCircle size={15} />}</span>
                  <span style={{ fontSize: 11.5, lineHeight: 1.4 }}>{breach ? `Proyeksi kas negatif pada ${breach.m} — indikasi material uncertainty.` : minBal < 5 ? 'Likuiditas menipis namun tetap positif — pantau ketat.' : 'Proyeksi kas tetap positif sepanjang 12 bulan.'}</span>
                </div>
              </div>
            </Panel>

            <Panel title="Proyeksi Arus Kas 12 Bulan" sub="dalam miliar Rupiah">
              {/* bar chart of ending balance */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 120, padding: '14px 0 4px', borderBottom: '1px solid var(--line)' }}>
                {projection.map((r: any, i: any) => {
                  const h = Math.abs(r.bal) / minBar * 95;
                  const neg = r.bal < 0;
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }} title={r.m + ': Rp ' + r.bal.toFixed(1) + ' M'}>
                      <span className="mono" style={{ fontSize: 8.5, color: neg ? 'var(--red)' : 'var(--ink-3)', marginBottom: 2 }}>{r.bal.toFixed(0)}</span>
                      <div style={{ width: '78%', height: Math.max(2, h), background: neg ? 'var(--red)' : r.bal < 5 ? 'var(--amber)' : 'var(--blue)', borderRadius: '3px 3px 0 0' }} />
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 5, marginTop: 3 }}>
                {projection.map((r: any, i: any) => <div key={i} style={{ flex: 1, textAlign: 'center' }} className="tiny muted">{r.m}</div>)}
              </div>
              <div className="tiny muted" style={{ marginTop: 8 }}>Saldo kas akhir bulan proyeksi · {assumptions.debtMonths.length} jatuh tempo utang (Rp {fmt(assumptions.debtMonths.reduce((s, d) => s + d.amount, 0))} M total) {financing ? '— di-refinancing' : '— tanpa refinancing'}.</div>
            </Panel>
          </div>

          {/* indicators checklist */}
          <Panel title="Daftar Indikator (SA 570 ¶A3)" sub="Aktifkan indikator yang teridentifikasi — penilaian otomatis menyesuaikan">
            <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 0 }}>
              {Object.entries(inds).map(([cat, items]: [string, any], ci: number) => (
                <div key={cat} style={{ padding: '4px 14px 10px', borderLeft: ci ? '1px solid var(--line-soft)' : 0 }}>
                  <div className="upper tiny" style={{ fontWeight: 700, color: 'var(--blue)', margin: '8px 0 6px' }}>{cat}</div>
                  {items.map((it: any) => (
                    <label key={it.id} className="row gap8" style={{ padding: '7px 0', cursor: 'pointer', alignItems: 'flex-start', borderBottom: '1px solid var(--line-soft)' }}>
                      <span onClick={() => toggle(cat, it.id)} style={{ flex: '0 0 17px', width: 17, height: 17, borderRadius: 4, marginTop: 1, border: '1.5px solid ' + (it.on ? 'var(--red)' : 'var(--line-strong)'), background: it.on ? 'var(--red)' : '#fff', display: 'grid', placeItems: 'center' }}>
                        {it.on && <I.check size={12} style={{ color: '#fff' }} />}
                      </span>
                      <span style={{ fontSize: 12, lineHeight: 1.4, color: it.on ? 'var(--ink)' : 'var(--ink-3)' }} onClick={() => toggle(cat, it.id)}>{it.label}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </Panel>

          <GCCovenants covenants={covenants} setCovenants={setCovenants} me={me} locked={locked} />
          <GCMitigations mitigations={mitigations} setMitigations={setMitigations} me={me} locked={locked} />

          <div style={{ marginTop: 12 }}><WpPanel moduleId="goingconcern" title="Kertas Kerja — Sign-off, Bukti & Kesimpulan (SA 570/230)" /></div>
        </div>
      </div>
    </>
  );
}

/* ---------------- Register Covenant (SA 570 / SA-08) ---------------- */
function GCCovenants({ covenants, setCovenants, me, locked }: { covenants: Covenant[]; setCovenants: (fn: (l: Covenant[]) => Covenant[]) => void; me: string; locked: boolean }) {
  const patch = (id: string, p: Partial<Covenant>) => setCovenants(l => l.map(c => c.id === id ? { ...c, ...p, by: me, at: gcToday() } : c));
  const add = () => { const id = nextCovId(covenants); setCovenants(l => [...l, { id, name: 'Covenant baru', metric: '', threshold: 0, actual: 0, dir: '≥', by: me, at: gcToday() }]); };
  const del = (id: string) => setCovenants(l => l.filter(c => c.id !== id));
  const breaches = covenants.filter(covBreached).length;
  return (
    <div style={{ marginTop: 12 }}>
    <Panel title="Uji Kepatuhan Covenant" sub={`${covenants.length} covenant · ${breaches} dilanggar`} actions={!locked && <Btn sm onClick={add}><I.plus size={12} /> Tambah</Btn>}>
      <table className="dtbl">
        <thead><tr><th style={{ width: 56 }}>Ref</th><th>Covenant</th><th style={{ width: 120 }}>Metrik</th><th style={{ width: 130 }}>Ambang</th><th style={{ width: 110 }}>Aktual</th><th style={{ width: 96 }}>Status</th>{!locked && <th style={{ width: 30 }}></th>}</tr></thead>
        <tbody>
          {covenants.map(c => {
            const br = covBreached(c);
            const headroom = c.dir === '≥' ? c.actual - c.threshold : c.threshold - c.actual;
            return (
              <tr key={c.id}>
                <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{c.id}</td>
                <td>{locked ? <span style={{ fontWeight: 600 }}>{c.name}</span> : <input className="input" value={c.name} onChange={(e: Ev) => patch(c.id, { name: e.target.value })} style={{ height: 26 }} />}</td>
                <td>{locked ? <span className="tiny">{c.metric}</span> : <input className="input" value={c.metric} onChange={(e: Ev) => patch(c.id, { metric: e.target.value })} style={{ height: 26 }} />}</td>
                <td>
                  <div className="row ac gap4">
                    {locked ? <span className="mono tiny">{c.dir} {c.threshold.toFixed(2)}</span> : <>
                      <select className="select" value={c.dir} onChange={(e: Ev) => patch(c.id, { dir: e.target.value as Covenant['dir'] })} style={{ height: 26, width: 48 }}><option>≥</option><option>≤</option></select>
                      <input className="input mono" type="number" step="0.01" value={c.threshold} onChange={(e: Ev) => patch(c.id, { threshold: +e.target.value })} style={{ height: 26, width: 64, textAlign: 'right' }} />
                    </>}
                  </div>
                </td>
                <td>{locked ? <span className="mono tiny">{c.actual.toFixed(2)}</span> : <input className="input mono" type="number" step="0.01" value={c.actual} onChange={(e: Ev) => patch(c.id, { actual: +e.target.value })} style={{ height: 26, width: 76, textAlign: 'right' }} />}</td>
                <td><Badge kind={br ? 'red' : headroom < Math.abs(c.threshold) * 0.05 ? 'amber' : 'green'}>{br ? 'Langgar' : headroom < Math.abs(c.threshold) * 0.05 ? 'Pantau' : 'Patuh'}</Badge></td>
                {!locked && <td><button className="btn sm icon" title="Hapus" onClick={() => del(c.id)}><I.x size={12} /></button></td>}
              </tr>
            );
          })}
          {!covenants.length && <tr><td colSpan={locked ? 6 : 7} className="tiny muted" style={{ textAlign: 'center', padding: 16 }}>Belum ada covenant tercatat.</td></tr>}
        </tbody>
      </table>
      <div className="tiny muted" style={{ padding: '8px 12px', lineHeight: 1.45 }}>Pelanggaran covenant dapat mempercepat jatuh tempo utang (cross-default) & memperkuat indikasi ketidakpastian material (SA 570 ¶A3). Pelanggaran menambah bobot penilaian otomatis.</div>
    </Panel>
    </div>
  );
}

/* ---------------- Evaluasi Rencana Mitigasi Manajemen (SA 570 ¶16) ---------------- */
function GCMitigations({ mitigations, setMitigations, me, locked }: { mitigations: Mitigation[]; setMitigations: (fn: (l: Mitigation[]) => Mitigation[]) => void; me: string; locked: boolean }) {
  const patch = (id: string, p: Partial<Mitigation>) => setMitigations(l => l.map(m => m.id === id ? { ...m, ...p, by: me, at: gcToday() } : m));
  const add = () => { const id = nextMitiId(mitigations); setMitigations(l => [...l, { id, plan: 'Rencana mitigasi baru', type: 'Operasional', feasibility: 'Sedang', evidence: false, note: '', by: me, at: gcToday() }]); };
  const del = (id: string) => setMitigations(l => l.filter(m => m.id !== id));
  const feasKind = (f: string) => f === 'Tinggi' ? 'green' : f === 'Sedang' ? 'amber' : 'red';
  const credible = mitigations.filter(m => m.feasibility === 'Tinggi' && m.evidence).length;
  return (
    <div style={{ marginTop: 12 }}>
    <Panel title="Evaluasi Rencana Mitigasi Manajemen (SA 570 ¶16)" sub={`${credible}/${mitigations.length} layak & berbukti`} actions={!locked && <Btn sm onClick={add}><I.plus size={12} /> Tambah</Btn>}>
      <div style={{ display: 'grid', gap: 8 }}>
        {mitigations.map(m => (
          <div key={m.id} className="panel" style={{ padding: '10px 12px', boxShadow: 'none' }}>
            <div className="row ac jb" style={{ marginBottom: 6 }}>
              <span className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{m.id}</span>
                {locked ? <Badge kind="gray">{m.type}</Badge> : <select className="select" value={m.type} onChange={(e: Ev) => patch(m.id, { type: e.target.value })} style={{ height: 26 }}>{['Pendanaan', 'Operasional', 'Aset', 'Restrukturisasi', 'Lainnya'].map(t => <option key={t}>{t}</option>)}</select>}
              </span>
              <span className="row ac gap6">
                <Badge kind={feasKind(m.feasibility)}>Kelayakan {m.feasibility}</Badge>
                <Badge kind={m.evidence ? 'green' : 'gray'}>{m.evidence ? 'Berbukti' : 'Belum berbukti'}</Badge>
                {!locked && <button className="btn sm icon" title="Hapus" onClick={() => del(m.id)}><I.x size={12} /></button>}
              </span>
            </div>
            {locked
              ? <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.4 }}>{m.plan}</div>
              : <input className="input" value={m.plan} onChange={(e: Ev) => patch(m.id, { plan: e.target.value })} placeholder="Rencana manajemen…" style={{ marginBottom: 6 }} />}
            <div className="row ac gap8" style={{ marginTop: 8, flexWrap: 'wrap' }}>
              {!locked && <>
                <span className="tiny muted">Kelayakan:</span>
                <select className="select" value={m.feasibility} onChange={(e: Ev) => patch(m.id, { feasibility: e.target.value })} style={{ height: 26, width: 96 }}>{MITI_FEAS.map(f => <option key={f}>{f}</option>)}</select>
                <label className="row ac gap6" style={{ cursor: 'pointer', fontSize: 11.5 }}><input type="checkbox" checked={m.evidence} onChange={() => patch(m.id, { evidence: !m.evidence })} /> Bukti diperoleh</label>
              </>}
              {locked
                ? (m.note && <span className="tiny muted">{m.note}</span>)
                : <input className="input" value={m.note} onChange={(e: Ev) => patch(m.id, { note: e.target.value })} placeholder="Dasar penilaian kelayakan & bukti…" style={{ flex: 1, minWidth: 180, height: 26 }} />}
            </div>
            {m.by && <div className="tiny muted" style={{ marginTop: 6 }}><I.check size={10} /> {m.by} · {m.at}</div>}
          </div>
        ))}
        {!mitigations.length && <div className="tiny muted" style={{ textAlign: 'center', padding: 16 }}>Belum ada rencana mitigasi tercatat.</div>}
      </div>
      <div className="tiny muted" style={{ marginTop: 10, lineHeight: 1.45 }}>SA 570 ¶16: auditor mengevaluasi <b>kelayakan</b> rencana manajemen & apakah didukung <b>bukti memadai</b>. Rencana yang tak layak/tak berbukti tak meniadakan ketidakpastian material.</div>
    </Panel>
    </div>
  );
}

Object.assign(window, { GoingConcern });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { GoingConcern };
