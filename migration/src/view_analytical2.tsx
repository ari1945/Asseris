/* [codemod] ESM imports */
import React from 'react';
import { I } from './icons.jsx';
import { Badge, Btn, MiniBars, Panel, Seg, Spark } from './ui.jsx';
import { KvBox, VERDICT_COLOR, benchVerdict } from './view_analytical';

/* ============================================================
   NeoSuite AMS — Analytical Review (SA 520) · part 2
   Deep tabs: Ratio analysis · Trend & Common-Size ·
   Substantive expectation modeling · Monthly disaggregation
   ============================================================ */
const { useState: useStateA2, useMemo: useMemoA2 } = React;

/* ---------- benchmark gauge (band p25–p75 + median tick + actual marker) ---------- */
function RatioGauge({ val, bench, good }) {
  const lo = Math.min(bench.lo, val), hi = Math.max(bench.hi, val);
  const pad = (hi - lo) * 0.18 || 1;
  const min = lo - pad, max = hi + pad, span = max - min || 1;
  const pos = x => ((x - min) / span) * 100;
  const verdict = benchVerdict(val, bench, good);
  const mColor = VERDICT_COLOR[verdict];
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ position: 'relative', height: 8, borderRadius: 4, background: 'var(--surface-3)' }}>
        {/* benchmark band */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: pos(bench.lo) + '%', width: (pos(bench.hi) - pos(bench.lo)) + '%', background: 'var(--blue-100)', borderRadius: 4 }} />
        {/* median tick */}
        <div style={{ position: 'absolute', top: -2, bottom: -2, left: pos(bench.med) + '%', width: 2, background: 'var(--blue-400)' }} />
        {/* actual marker */}
        <div style={{ position: 'absolute', top: '50%', left: pos(val) + '%', width: 11, height: 11, borderRadius: '50%', background: mColor, border: '2px solid var(--surface)', transform: 'translate(-50%,-50%)', boxShadow: '0 0 0 1px ' + mColor }} />
      </div>
      <div className="row jb" style={{ marginTop: 4 }}>
        <span className="tiny muted">Industri p25 <b className="mono" style={{ color: 'var(--ink-2)' }}>{fmtR(bench.lo)}</b></span>
        <span className="tiny muted">med <b className="mono" style={{ color: 'var(--blue)' }}>{fmtR(bench.med)}</b></span>
        <span className="tiny muted">p75 <b className="mono" style={{ color: 'var(--ink-2)' }}>{fmtR(bench.hi)}</b></span>
      </div>
    </div>
  );
}
function fmtR(n) { return (Math.abs(n) >= 100 ? Math.round(n) : n.toFixed(1)).toLocaleString('id-ID'); }
const VERDICT_LABEL = { good: 'Unggul', ok: 'Dalam Tolok Ukur', watch: 'Pantau', bad: 'Di Luar Tolok Ukur' };
const VERDICT_BADGE = { good: 'green', ok: 'blue', watch: 'amber', bad: 'red' };

/* ============================================================
   TAB · Ratio analysis (14 ratios, 3-yr trend, benchmark gauge)
   ============================================================ */
function RatioAnalysisTab({ der, fmt }) {
  const cats = ['Semua', 'Likuiditas', 'Profitabilitas', 'Efisiensi', 'Solvabilitas'];
  const [cat, setCat] = useStateA2('Semua');
  const shown = der.ratios.filter(r => cat === 'Semua' || r.cat === cat);
  const adverse = der.ratios.filter(r => benchVerdict(r.y[2], r.bench, r.good) === 'bad');

  return (
    <>
      <div className="row ac jb wrap gap8" style={{ marginBottom: 12 }}>
        <Seg options={cats} value={cat} onChange={setCat} />
        <div className="row ac gap12">
          <span className="tiny muted row ac gap6"><span style={{ width: 18, height: 8, borderRadius: 4, background: 'var(--blue-100)', display: 'inline-block' }} /> rentang industri (p25–p75)</span>
          <span className="tiny muted row ac gap6"><span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--ink-2)', display: 'inline-block' }} /> nilai FY2025</span>
          {adverse.length > 0 && <Badge kind="red">{adverse.length} di luar tolok ukur</Badge>}
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 12 }}>
        {shown.map(r => {
          const cy = r.y[2], py = r.y[1];
          const delta = cy - py;
          const adv = r.good === 'low' ? delta > 0 : r.good === 'high' ? delta < 0 : Math.abs(delta) > (r.unit === '%' ? 1 : r.unit === ' hr' ? 5 : 0.1);
          const verdict = benchVerdict(cy, r.bench, r.good);
          const fnum = x => (r.unit === ' hr' || Math.abs(x) >= 100 ? Math.round(x) : x.toFixed(r.unit === '×' ? 2 : 1));
          return (
            <Panel key={r.key} noBody>
              <div style={{ padding: '11px 13px 13px' }}>
                <div className="row jb ac" style={{ marginBottom: 1 }}>
                  <span className="tiny upper" style={{ fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '.04em' }}>{r.label}</span>
                  <Badge kind={VERDICT_BADGE[verdict]}>{VERDICT_LABEL[verdict]}</Badge>
                </div>
                <div className="tiny muted" style={{ minHeight: 26, lineHeight: 1.35, marginBottom: 4 }}>{r.formula}</div>
                <div className="row jb" style={{ alignItems: 'flex-end' }}>
                  <div>
                    <span className="mono" style={{ fontSize: 26, fontWeight: 700, color: 'var(--navy)' }}>{fnum(cy)}</span>
                    <span className="mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-3)' }}>{r.unit}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <Spark data={r.y} width={84} height={30} color={verdict === 'bad' ? '#b3261e' : '#005085'} />
                    <div className="tiny muted" style={{ marginTop: -1 }}>FY23 → FY25</div>
                  </div>
                </div>
                <div className="row ac gap6" style={{ marginTop: 2 }}>
                  <span className="tiny" style={{ color: adv ? 'var(--amber)' : 'var(--green)', fontWeight: 700 }}>{delta > 0 ? '▲' : '▼'} {fnum(Math.abs(delta))}{r.unit}</span>
                  <span className="tiny muted">vs PY ({fnum(py)}{r.unit})</span>
                </div>
                <RatioGauge val={cy} bench={r.bench} good={r.good} />
              </div>
            </Panel>
          );
        })}
      </div>
    </>
  );
}

/* ============================================================
   TAB · Trend & Common-Size analysis
   ============================================================ */
function TrendCommonSizeTab({ der, fmt }) {
  const [mode, setMode] = useStateA2('horizontal');
  const groupsBS = ['Aset Lancar', 'Aset Tidak Lancar', 'Liabilitas Jk. Pendek', 'Liabilitas Jk. Panjang', 'Ekuitas'];
  const groupsPL = ['Pendapatan', 'Beban'];
  const lines = Object.values(der.hist);
  const jt = n => fmt(n / 1e6, 0);

  const salesBase = der.A.sales.map(x => x); // for P&L common-size
  const assetBase = der.A.assets.map(x => x); // for BS common-size

  function Section({ title, groups, base }) {
    return (
      <Panel noBody style={{ marginBottom: 12 }}>
        <div className="panel-h"><h3>{title}</h3><div style={{ flex: 1 }} />
          <span className="tiny muted">{mode === 'horizontal' ? 'Rp jt · indeks FY23 = 100' : '% terhadap ' + (base === salesBase ? 'Penjualan' : 'Total Aset')}</span>
        </div>
        <table className="dtbl">
          <thead><tr>
            <th>Akun</th>
            {mode === 'horizontal'
              ? <><th className="num" style={{ width: 96 }}>FY23</th><th className="num" style={{ width: 96 }}>FY24</th><th className="num" style={{ width: 96 }}>FY25</th><th className="num" style={{ width: 72 }}>Indeks</th><th style={{ width: 96 }}>Tren</th></>
              : <><th className="num" style={{ width: 90 }}>FY23 %</th><th className="num" style={{ width: 90 }}>FY24 %</th><th className="num" style={{ width: 90 }}>FY25 %</th><th className="num" style={{ width: 76 }}>Δ pp</th><th style={{ width: 110 }}>Komposisi FY25</th></>}
          </tr></thead>
          <tbody>
            {groups.map(g => {
              const gl = lines.filter((l: any) => l.group === g);
              return (
                <React.Fragment key={g}>
                  <tr className="group-row"><td colSpan={6}>{g}</td></tr>
                  {gl.map((l: any) => {
                    const isContra = l.y[2] < 0;
                    if (mode === 'horizontal') {
                      const idx = l.y[0] !== 0 ? (l.y[2] / l.y[0]) * 100 : null;
                      return (
                        <tr key={l.code}>
                          <td className="truncate" style={{ maxWidth: 220 }}>{l.name}</td>
                          <td className="num muted">{jt(l.y[0])}</td>
                          <td className="num muted">{jt(l.y[1])}</td>
                          <td className="num" style={{ fontWeight: 600 }}>{jt(l.y[2])}</td>
                          <td className="num tiny" style={{ fontWeight: 700, color: idx == null ? 'var(--ink-4)' : idx > 130 ? 'var(--amber)' : idx < 90 ? 'var(--red)' : 'var(--ink-2)' }}>{idx == null ? 'baru' : Math.round(idx)}</td>
                          <td><MiniBars data={l.y.map(Math.abs)} width={84} height={22} color={isContra ? '#9a6a00' : '#005085'} /></td>
                        </tr>
                      );
                    }
                    const pcts = l.y.map((x, i) => base[i] ? (Math.abs(x) / base[i]) * 100 : 0);
                    const dpp = pcts[2] - pcts[0];
                    return (
                      <tr key={l.code}>
                        <td className="truncate" style={{ maxWidth: 220 }}>{l.name}</td>
                        <td className="num muted">{pcts[0].toFixed(1)}</td>
                        <td className="num muted">{pcts[1].toFixed(1)}</td>
                        <td className="num" style={{ fontWeight: 600 }}>{pcts[2].toFixed(1)}</td>
                        <td className="num tiny" style={{ fontWeight: 700, color: Math.abs(dpp) < 0.6 ? 'var(--ink-3)' : dpp > 0 ? 'var(--amber)' : 'var(--green)' }}>{dpp > 0 ? '+' : ''}{dpp.toFixed(1)}</td>
                        <td><div style={{ height: 8, borderRadius: 4, background: 'var(--surface-3)', overflow: 'hidden' }}><div style={{ height: '100%', width: Math.min(100, pcts[2]) + '%', background: isContra ? 'var(--amber)' : 'var(--blue)' }} /></div></td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </Panel>
    );
  }

  return (
    <>
      <div className="row ac jb wrap gap8" style={{ marginBottom: 12 }}>
        <Seg options={[{ value: 'horizontal', label: 'Horizontal (Indeks)' }, { value: 'common', label: 'Common-Size (Vertikal)' }]} value={mode} onChange={setMode} />
        <span className="tiny muted">{mode === 'horizontal' ? 'Analisis tren 3 tahun — indeks relatif terhadap FY2023.' : 'Analisis vertikal — proporsi setiap pos terhadap basis laporan.'}</span>
      </div>
      <Section title="Laporan Laba Rugi" groups={groupsPL} base={salesBase} />
      <Section title="Laporan Posisi Keuangan" groups={groupsBS} base={assetBase} />
    </>
  );
}

/* ============================================================
   TAB · Substantive analytical procedures (expectation modeling)
   ============================================================ */
function ExpResult({ expectation, recorded, threshold, fmt, label }: any) {
  const diff = recorded - expectation;
  const pct = expectation ? (diff / expectation) * 100 : 0;
  const within = Math.abs(diff) <= threshold;
  const jt = n => fmt(n, 0);
  return (
    <div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 9 }}>
        <KvBox label="Ekspektasi" v={'Rp ' + jt(expectation) + ' jt'} />
        <KvBox label={label || 'Tercatat (CY)'} v={'Rp ' + jt(recorded) + ' jt'} />
        <KvBox label="Selisih" v={(diff > 0 ? '+' : '') + jt(diff) + ' (' + (pct > 0 ? '+' : '') + pct.toFixed(1) + '%)'} accent={within ? 'var(--ink)' : 'var(--red)'} />
        <KvBox label="Ambang" v={'Rp ' + jt(threshold) + ' jt'} />
      </div>
      <div className="panel" style={{ padding: '8px 11px', boxShadow: 'none', background: within ? 'var(--green-bg)' : 'var(--red-bg)', borderColor: 'transparent' }}>
        <div className="row ac gap8" style={{ fontSize: 12 }}>
          <span style={{ color: within ? 'var(--green)' : 'var(--red)' }}>{within ? <I.checkCircle size={15} /> : <I.alert size={15} />}</span>
          <span style={{ lineHeight: 1.4 }}>{within
            ? <>Selisih <b>Rp {jt(Math.abs(diff))} jt</b> berada di bawah ambang — <b>konsisten</b> dengan ekspektasi independen auditor.</>
            : <>Selisih <b>Rp {jt(Math.abs(diff))} jt</b> melampaui ambang — <b>perlu penyelidikan</b> & bukti pendukung tambahan (SA 520.7).</>}</span>
        </div>
      </div>
    </div>
  );
}

function NumDriver({ label, suffix, value, onChange, w = 92 }: any) {
  return (
    <div>
      <div className="tiny muted upper" style={{ marginBottom: 3 }}>{label}</div>
      <div className="row ac gap4">
        <input type="number" value={value} onChange={e => onChange(+e.target.value)} className="input mono" style={{ width: w, height: 26, textAlign: 'right', padding: '0 7px' }} />
        {suffix && <span className="tiny muted" style={{ fontWeight: 600 }}>{suffix}</span>}
      </div>
    </div>
  );
}

function SubstantiveTab({ der, pm, ct, fmt }) {
  const pmJt = Math.round(pm / 1e6);
  const jtv = arr => arr.map(x => x / 1e6);

  /* recorded (Rp jt) */
  const recInterest = der.A.interest[2] / 1e6;
  const recSales = der.A.sales[2] / 1e6;
  const recCogs = der.A.cogs[2] / 1e6;
  const avgDebt = (der.A.debt[1] + der.A.debt[2]) / 2 / 1e6;
  const priorRatio = der.A.sales[1] ? der.A.cogs[1] / der.A.sales[1] * 100 : 70;

  /* model state (persisted per engagement) */
  const [rate, setRate] = window.useAmsPersist('ar.sub.rate', +(der.A.debt[1] ? der.A.interest[1] / der.A.debt[1] * 100 : 11.5).toFixed(1));
  const [thrA, setThrA] = window.useAmsPersist('ar.sub.thrA', pmJt);
  const [ch, setCh] = window.useAmsPersist('ar.sub.ch', [
    { n: 'Distributor Jawa', vol: 18200, price: 9.8 },
    { n: 'Distributor Luar Jawa', vol: 9400, price: 10.2 },
    { n: 'Ritel Modern (MT)', vol: 5600, price: 10.3 },
  ]);
  const [thrB, setThrB] = window.useAmsPersist('ar.sub.thrB', pmJt);
  const [ratio, setRatio] = window.useAmsPersist('ar.sub.ratio', +priorRatio.toFixed(1));
  const [thrC, setThrC] = window.useAmsPersist('ar.sub.thrC', pmJt);

  const expInterest = avgDebt * rate / 100;
  const expSales = ch.reduce((s, c) => s + c.vol * c.price, 0);
  const expCogs = recSales * ratio / 100;
  const setChVal = (i, k, val) => setCh(arr => arr.map((c, j) => j === i ? { ...c, [k]: val } : c));

  return (
    <>
      <div className="panel" style={{ padding: '10px 13px', marginBottom: 12, background: 'var(--blue-050)', borderColor: 'var(--blue-100)', display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ color: 'var(--blue)' }}><I.flask size={17} /></span>
        <span style={{ fontSize: 12.5, lineHeight: 1.5 }}><b>Prosedur analitis substantif (SA 520.5)</b> — auditor membangun <b>ekspektasi independen</b> atas saldo yang dapat diprediksi, lalu membandingkannya dengan nilai tercatat. Selisih melampaui ambang harus diselidiki. Sesuaikan pemicu (driver) di bawah untuk menguji sensitivitas.</span>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
        {/* Model A — Interest expense */}
        <Panel noBody>
          <div className="panel-h"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)', marginRight: 7 }}>A</span><h3>Beban Keuangan — Utang × Suku Bunga Efektif</h3></div>
          <div style={{ padding: 13 }}>
            <div className="row gap12 wrap" style={{ marginBottom: 12 }}>
              <NumDriver label="Rata-rata Utang Berbunga (jt)" value={Math.round(avgDebt)} onChange={() => {}} w={110} />
              <NumDriver label="Suku Bunga Efektif" suffix="%" value={rate} onChange={setRate} />
              <NumDriver label="Ambang (jt)" value={thrA} onChange={setThrA} w={88} />
            </div>
            <div className="tiny muted" style={{ marginBottom: 10, lineHeight: 1.5 }}>Ekspektasi = Rp {fmt(Math.round(avgDebt), 0)} jt × {rate}% = <b className="mono" style={{ color: 'var(--navy)' }}>Rp {fmt(Math.round(expInterest), 0)} jt</b>. Rata-rata utang = (saldo PY + CY) ÷ 2, termasuk liabilitas sewa PSAK 73.</div>
            <ExpResult expectation={Math.round(expInterest)} recorded={Math.round(recInterest)} threshold={thrA} fmt={fmt} />
          </div>
        </Panel>

        {/* Model C — COGS via expected ratio */}
        <Panel noBody>
          <div className="panel-h"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)', marginRight: 7 }}>C</span><h3>Beban Pokok Penjualan — Rasio BPP/Penjualan</h3></div>
          <div style={{ padding: 13 }}>
            <div className="row gap12 wrap" style={{ marginBottom: 12 }}>
              <NumDriver label="Penjualan CY (jt)" value={Math.round(recSales)} onChange={() => {}} w={110} />
              <NumDriver label="Rasio BPP Ekspektasi" suffix="%" value={ratio} onChange={setRatio} />
              <NumDriver label="Ambang (jt)" value={thrC} onChange={setThrC} w={88} />
            </div>
            <div className="tiny muted" style={{ marginBottom: 10, lineHeight: 1.5 }}>Rasio historis FY24 = <b className="mono">{priorRatio.toFixed(1)}%</b>. Ekspektasi = Penjualan × {ratio}% = <b className="mono" style={{ color: 'var(--navy)' }}>Rp {fmt(Math.round(expCogs), 0)} jt</b>. Menguji konsistensi marjin kotor.</div>
            <ExpResult expectation={Math.round(expCogs)} recorded={Math.round(recCogs)} threshold={thrC} fmt={fmt} />
          </div>
        </Panel>

        {/* Model B — Revenue build-up (full width) */}
        <Panel noBody style={{ gridColumn: '1 / -1' }}>
          <div className="panel-h"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)', marginRight: 7 }}>B</span><h3>Penjualan — Build-Up Volume × Harga per Saluran Distribusi</h3><div style={{ flex: 1 }} /><Badge kind="amber">Risiko R-01</Badge></div>
          <div style={{ padding: 13 }}>
            <table className="dtbl" style={{ marginBottom: 12 }}>
              <thead><tr><th>Saluran Distribusi</th><th className="num" style={{ width: 150 }}>Volume ('000 unit)</th><th className="num" style={{ width: 150 }}>Harga Rata² (Rp '000)</th><th className="num" style={{ width: 140 }}>Ekspektasi (jt)</th></tr></thead>
              <tbody>
                {ch.map((c, i) => (
                  <tr key={i}>
                    <td>{c.n}</td>
                    <td className="num"><input type="number" value={c.vol} onChange={e => setChVal(i, 'vol', +e.target.value)} className="input mono" style={{ width: 110, height: 24, textAlign: 'right', padding: '0 7px' }} /></td>
                    <td className="num"><input type="number" step="0.1" value={c.price} onChange={e => setChVal(i, 'price', +e.target.value)} className="input mono" style={{ width: 90, height: 24, textAlign: 'right', padding: '0 7px' }} /></td>
                    <td className="num" style={{ fontWeight: 600 }}>{fmt(Math.round(c.vol * c.price), 0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td>Total Ekspektasi Penjualan</td><td className="num"></td><td className="num"></td><td className="num">{fmt(Math.round(expSales), 0)}</td></tr></tfoot>
            </table>
            <div className="row ac gap12 wrap" style={{ marginBottom: 11 }}>
              <NumDriver label="Ambang (jt)" value={thrB} onChange={setThrB} w={92} />
              <span className="tiny muted" style={{ maxWidth: 460, lineHeight: 1.5 }}>Ekspektasi dibangun dari data operasional independen (volume terkirim & daftar harga). Selisih signifikan dapat mengindikasikan <b>channel stuffing</b> atau salah saji cut-off — tautkan ke pengujian R-01.</span>
            </div>
            <ExpResult expectation={Math.round(expSales)} recorded={Math.round(recSales)} threshold={thrB} fmt={fmt} label="Penjualan Tercatat" />
          </div>
        </Panel>
      </div>
    </>
  );
}

/* ============================================================
   TAB · Monthly disaggregation + anomaly detection
   ============================================================ */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTH_REV = [24800, 23900, 26400, 25100, 27800, 26900, 25600, 24200, 27300, 28600, 27900, 43400];
const MONTH_COGS = [17360, 16730, 18480, 17570, 18000, 18830, 17920, 16940, 19110, 19000, 19530, 33010];

function DisaggregationTab({ der, fmt }) {
  const [metric, setMetric] = useStateA2('rev');
  const rev = MONTH_REV, cogs = MONTH_COGS;
  const gp = rev.map((r, i) => r - cogs[i]);
  const gm = rev.map((r, i) => (r - cogs[i]) / r * 100);
  const series = metric === 'rev' ? rev : metric === 'cogs' ? cogs : gm;
  const isPct = metric === 'gm';

  const mean = series.reduce((s, x) => s + x, 0) / series.length;
  const sd = Math.sqrt(series.reduce((s, x) => s + (x - mean) ** 2, 0) / series.length) || 1;
  const z = series.map(x => (x - mean) / sd);
  const max = Math.max(...series);
  const anomalies = z.filter(v => Math.abs(v) > 1.5).length;

  /* revenue-specific stats for the December narrative */
  const revMean = rev.reduce((s, x) => s + x, 0) / rev.length;
  const revSd = Math.sqrt(rev.reduce((s, x) => s + (x - revMean) ** 2, 0) / rev.length) || 1;
  const decZ = (rev[11] - revMean) / revSd;
  const decAbove = Math.round((rev[11] / revMean - 1) * 100);

  const jt = n => fmt(n, 0);

  return (
    <>
      <div className="row ac jb wrap gap8" style={{ marginBottom: 12 }}>
        <Seg options={[{ value: 'rev', label: 'Penjualan' }, { value: 'cogs', label: 'BPP' }, { value: 'gm', label: 'Marjin Kotor %' }]} value={metric} onChange={setMetric} />
        <div className="row ac gap8">
          <span className="tiny muted">deteksi anomali |z| &gt; 1,5</span>
          {anomalies > 0 ? <Badge kind="red">{anomalies} anomali</Badge> : <Badge kind="green">Tidak ada anomali</Badge>}
        </div>
      </div>

      <Panel noBody style={{ marginBottom: 12 }}>
        <div className="panel-h"><h3>Disagregasi Bulanan FY2025 — {metric === 'rev' ? 'Penjualan' : metric === 'cogs' ? 'Beban Pokok Penjualan' : 'Marjin Kotor'}</h3><div style={{ flex: 1 }} /><span className="tiny muted">{isPct ? '%' : 'Rp jt'} · garis = rata-rata · pita = ±1,5σ</span></div>
        <div style={{ padding: '16px 16px 10px' }}>
          <DisaggChart series={series} z={z} mean={mean} sd={sd} max={max} isPct={isPct} jt={jt} />
        </div>
      </Panel>

      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Rincian Bulanan</h3><div style={{ flex: 1 }} /><span className="tiny muted">nilai Rp jt</span></div>
          <table className="dtbl">
            <thead><tr><th style={{ width: 56 }}>Bulan</th><th className="num">Penjualan</th><th className="num">BPP</th><th className="num">Laba Kotor</th><th className="num" style={{ width: 64 }}>GM %</th><th className="num" style={{ width: 56 }}>z</th><th style={{ width: 80 }}>Status</th></tr></thead>
            <tbody>
              {MONTHS.map((m, i) => {
                const flag = Math.abs(z[i]) > 1.5;
                return (
                  <tr key={m}>
                    <td style={{ fontWeight: 600 }}>{m}</td>
                    <td className="num">{jt(rev[i])}</td>
                    <td className="num muted">{jt(cogs[i])}</td>
                    <td className="num">{jt(gp[i])}</td>
                    <td className="num tiny" style={{ color: gm[i] < 27 ? 'var(--red)' : 'var(--ink-2)', fontWeight: gm[i] < 27 ? 700 : 400 }}>{gm[i].toFixed(1)}</td>
                    <td className="num tiny" style={{ fontWeight: 700, color: flag ? 'var(--red)' : 'var(--ink-3)' }}>{z[i] > 0 ? '+' : ''}{z[i].toFixed(1)}</td>
                    <td>{flag ? <Badge kind="red">Anomali</Badge> : <span className="tiny muted">normal</span>}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot><tr><td>Total</td><td className="num">{jt(rev.reduce((s, x) => s + x, 0))}</td><td className="num">{jt(cogs.reduce((s, x) => s + x, 0))}</td><td className="num">{jt(gp.reduce((s, x) => s + x, 0))}</td><td className="num">{(gp.reduce((s, x) => s + x, 0) / rev.reduce((s, x) => s + x, 0) * 100).toFixed(1)}</td><td></td><td></td></tr></tfoot>
          </table>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Interpretasi &amp; Tindak Lanjut</h3></div>
          <div style={{ padding: 14 }}>
            <div className="panel" style={{ padding: '10px 11px', boxShadow: 'none', background: 'var(--red-bg)', borderColor: 'transparent', marginBottom: 11 }}>
              <div className="row ac gap8" style={{ marginBottom: 5 }}><span style={{ color: 'var(--red)' }}><I.alert size={15} /></span><b style={{ fontSize: 12.5 }}>Lonjakan Penjualan Desember</b></div>
              <div className="tiny" style={{ lineHeight: 1.55, color: 'var(--ink-2)' }}>Penjualan Des <b className="mono">Rp {jt(rev[11])} jt</b> (z = +{decZ.toFixed(1)}) — ~{decAbove}% di atas rata-rata bulanan, disertai marjin kotor anjlok ke <b className="mono">{gm[11].toFixed(1)}%</b>. Pola khas <b>channel stuffing</b> menjelang tutup buku.</div>
            </div>
            <div className="tiny muted upper" style={{ marginBottom: 6 }}>Prosedur Lanjutan</div>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, lineHeight: 1.7, color: 'var(--ink-2)' }}>
              <li>Perluas <b>cut-off testing</b> 10 hari sebelum &amp; sesudah tutup buku (WP B-3).</li>
              <li>Telaah <b>retur penjualan</b> Januari 2026 atas penjualan Desember.</li>
              <li>Konfirmasi piutang distributor bersaldo besar per 31 Des.</li>
              <li>Evaluasi syarat penjualan &amp; hak retur (PSAK 72).</li>
            </ul>
            <div className="row gap6" style={{ marginTop: 12 }}>
              <Btn sm variant="primary"><I.link2 size={13} /> Tautkan ke R-01</Btn>
              <Btn sm><I.flag size={13} /> Buat Review Note</Btn>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}

/* combined bar + mean/band overlay */
function DisaggChart({ series, z, mean, sd, max, isPct, jt }) {
  const W = 760, H = 190, padL = 8, padR = 8, padT = 10, padB = 22;
  const n = series.length;
  const bw = (W - padL - padR) / n;
  const top = max * 1.12;
  const y = v => padT + (1 - v / top) * (H - padT - padB);
  const bandHi = mean + 1.5 * sd, bandLo = Math.max(0, mean - 1.5 * sd);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block', overflow: 'visible' }}>
      {/* ±1.5σ band */}
      <rect x={padL} y={y(bandHi)} width={W - padL - padR} height={Math.max(0, y(bandLo) - y(bandHi))} fill="var(--blue-100)" opacity="0.5" />
      {/* mean line */}
      <line x1={padL} y1={y(mean)} x2={W - padR} y2={y(mean)} stroke="var(--blue-400)" strokeWidth="1.5" strokeDasharray="4 3" />
      {series.map((v, i) => {
        const flag = Math.abs(z[i]) > 1.5;
        const h = (H - padT - padB) - (y(v) - padT);
        return (
          <g key={i}>
            <rect x={padL + i * bw + bw * 0.16} y={y(v)} width={bw * 0.68} height={Math.max(0, h)} rx="2"
              fill={flag ? '#b3261e' : '#005085'} opacity={flag ? 1 : 0.82} />
            <text x={padL + i * bw + bw / 2} y={y(v) - 4} textAnchor="middle" fontSize="9.5" fontFamily="var(--mono)" fill={flag ? '#b3261e' : 'var(--ink-3)'} fontWeight={flag ? 700 : 500}>{isPct ? v.toFixed(0) : jt(v)}</text>
            <text x={padL + i * bw + bw / 2} y={H - 7} textAnchor="middle" fontSize="10" fill="var(--ink-3)">{MONTHS[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}

Object.assign(window, { RatioAnalysisTab, TrendCommonSizeTab, SubstantiveTab, DisaggregationTab, RatioGauge, ExpResult, DisaggChart });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { DisaggChart, DisaggregationTab, ExpResult, RatioAnalysisTab, RatioGauge, SubstantiveTab, TrendCommonSizeTab };
