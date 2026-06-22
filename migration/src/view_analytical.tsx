/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAudit, useFirm } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Panel } from './ui';
import { DisaggregationTab, RatioAnalysisTab, SubstantiveTab, TrendCommonSizeTab } from './view_analytical2';

/* ============================================================
   Asseris — Analytical Review (SA 520)
   Deep analytical procedures workspace:
   Ringkasan · Rasio · Fluktuasi · Tren & Common-Size ·
   Uji Ekspektasi Substantif · Disagregasi Bulanan
   ============================================================ */
const { useState: useStateAR, useMemo: useMemoAR } = React;

/* ---- per-account flux narrative seed ---- */
const FLUX_SEED = {
  '4-1100': { status: 'explained', note: 'Kenaikan 16,7% sejalan dengan ekspansi 3 distributor baru dan kenaikan harga jual rata-rata 6%. Konsisten dengan data volume penjualan.' },
  '5-1100': { status: 'explained', note: 'BPP naik proporsional dengan volume; rasio BPP/penjualan stabil di 70%. Termasuk AJE-01 cut-off Rp 2,34 M.' },
  '1-1300': { status: 'pending',   note: 'Kenaikan persediaan 18,6% melebihi pertumbuhan penjualan — indikasi slow-moving. Lihat WP C-2 (uji NRV).' },
  '1-2300': { status: 'explained', note: 'Penerapan awal PSAK 73 — pengakuan aset hak-guna atas sewa gudang & kendaraan.' },
  '2-1200': { status: 'explained', note: 'Penarikan fasilitas modal kerja Rp 6,5 M untuk pembelian bahan baku menjelang peak season.' },
};

/* ---- three-year history factor per FS caption (y23 = y24 × factor) ---- */
const HIST_FACTOR = {
  'Aset Lancar': 0.84, 'Aset Tidak Lancar': 0.90, 'Liabilitas Jk. Pendek': 0.86,
  'Liabilitas Jk. Panjang': 1.06, 'Ekuitas': 0.81, 'Pendapatan': 0.86, 'Beban': 0.87,
};

/* ============================================================
   Shared derivation: 3-year statements, aggregates, ratios, flux
   ============================================================ */
function arDerive(wtb, pm) {
  const byCode = {};
  wtb.forEach(r => { byCode[r.code] = r; });
  /* y24 = prior audited (ly), y25 = current adjusted (adj), y23 = derived */
  const hist = {};
  wtb.forEach(r => {
    const f = HIST_FACTOR[r.group] ?? 0.88;
    const y24 = r.ly, y25 = r.adj;
    const y23 = r.ly === 0 ? 0 : Math.round(r.ly * f);
    hist[r.code] = { code: r.code, name: r.name, group: r.group, y: [y23, y24, y25] };
  });
  const v = (code, yi) => (hist[code] ? hist[code].y[yi] : 0);
  const sumYi = (codes, yi) => codes.reduce((s, c) => s + v(c, yi), 0);

  const C = {
    ca: ['1-1100', '1-1200', '1-1210', '1-1300', '1-1400', '1-1500'],
    nca: ['1-2100', '1-2110', '1-2400', '1-2410', '1-2300', '1-2500'],
    cl: ['2-1100', '2-1200', '2-1300', '2-1400', '2-1500'],
    ncl: ['2-2100', '2-2200', '2-2300'],
    eq: ['3-1100', '3-2100'],
    inv: ['1-1300'], ar: ['1-1200', '1-1210'], ap: ['2-1100'],
    debt: ['2-1200', '2-2100', '2-2200', '2-1500'], cash: ['1-1100'],
  };
  /* agg[name] = [y23,y24,y25]; assets +, liab/eq/rev stored negative → abs where needed */
  const A: any = {};
  const triple = fn => [0, 1, 2].map(fn);
  A.sales = triple(i => -v('4-1100', i));
  A.cogs = triple(i => v('5-1100', i));
  A.selling = triple(i => v('5-2100', i));
  A.admin = triple(i => v('5-3100', i));
  A.opex = triple(i => v('5-2100', i) + v('5-3100', i));
  A.interest = triple(i => v('5-4100', i));
  A.tax = triple(i => v('5-5100', i));
  A.grossProfit = triple(i => A.sales[i] - A.cogs[i]);
  A.ebit = triple(i => A.sales[i] - A.cogs[i] - A.opex[i]);
  A.netIncome = triple(i => A.sales[i] - A.cogs[i] - A.opex[i] - A.interest[i] - A.tax[i]);
  A.ca = triple(i => sumYi(C.ca, i));
  A.nca = triple(i => sumYi(C.nca, i));
  A.assets = triple(i => A.ca[i] + A.nca[i]);
  A.cl = triple(i => Math.abs(sumYi(C.cl, i)));
  A.ncl = triple(i => Math.abs(sumYi(C.ncl, i)));
  A.equity = triple(i => Math.abs(sumYi(C.eq, i)));
  A.inv = triple(i => sumYi(C.inv, i));
  A.ar = triple(i => sumYi(C.ar, i));
  A.ap = triple(i => Math.abs(sumYi(C.ap, i)));
  A.debt = triple(i => Math.abs(sumYi(C.debt, i)));

  /* ratios: each carries 3-year series + industry benchmark band */
  const safe = (a, b) => (b ? a / b : 0);
  const R = (key, label, cat, formula, unit, good, fn, bench) =>
    ({ key, label, cat, formula, unit, good, y: triple(fn), bench });
  const ratios = [
    R('current', 'Current Ratio', 'Likuiditas', 'Aset Lancar ÷ Liabilitas Jk. Pendek', '×', 'high', i => safe(A.ca[i], A.cl[i]), { med: 1.85, lo: 1.40, hi: 2.30 }),
    R('quick', 'Quick Ratio', 'Likuiditas', '(Aset Lancar − Persediaan) ÷ Liab. Jk. Pendek', '×', 'high', i => safe(A.ca[i] - A.inv[i], A.cl[i]), { med: 1.05, lo: 0.80, hi: 1.30 }),
    R('ccc', 'Cash Conversion Cycle', 'Likuiditas', 'DIO + DSO − DPO', ' hr', 'low', i => safe(A.inv[i], A.cogs[i]) * 365 + safe(A.ar[i], A.sales[i]) * 365 - safe(A.ap[i], A.cogs[i]) * 365, { med: 86, lo: 60, hi: 110 }),

    R('gm', 'Gross Margin', 'Profitabilitas', '(Penjualan − BPP) ÷ Penjualan', '%', 'high', i => safe(A.grossProfit[i], A.sales[i]) * 100, { med: 31, lo: 27, hi: 36 }),
    R('om', 'Operating Margin', 'Profitabilitas', 'Laba Usaha ÷ Penjualan', '%', 'high', i => safe(A.ebit[i], A.sales[i]) * 100, { med: 14, lo: 10, hi: 18 }),
    R('nm', 'Net Margin', 'Profitabilitas', 'Laba Bersih ÷ Penjualan', '%', 'high', i => safe(A.netIncome[i], A.sales[i]) * 100, { med: 9.5, lo: 6, hi: 13 }),
    R('roe', 'Return on Equity', 'Profitabilitas', 'Laba Bersih ÷ Ekuitas', '%', 'high', i => safe(A.netIncome[i], A.equity[i]) * 100, { med: 14, lo: 9, hi: 19 }),
    R('roa', 'Return on Assets', 'Profitabilitas', 'Laba Bersih ÷ Total Aset', '%', 'high', i => safe(A.netIncome[i], A.assets[i]) * 100, { med: 7.5, lo: 4.5, hi: 11 }),

    R('dio', 'Days Inventory (DIO)', 'Efisiensi', 'Persediaan ÷ BPP × 365', ' hr', 'low', i => safe(A.inv[i], A.cogs[i]) * 365, { med: 95, lo: 70, hi: 120 }),
    R('dso', 'Days Sales (DSO)', 'Efisiensi', 'Piutang ÷ Penjualan × 365', ' hr', 'low', i => safe(A.ar[i], A.sales[i]) * 365, { med: 52, lo: 40, hi: 65 }),
    R('dpo', 'Days Payable (DPO)', 'Efisiensi', 'Utang Usaha ÷ BPP × 365', ' hr', 'flat', i => safe(A.ap[i], A.cogs[i]) * 365, { med: 60, lo: 45, hi: 80 }),
    R('ato', 'Asset Turnover', 'Efisiensi', 'Penjualan ÷ Total Aset', '×', 'high', i => safe(A.sales[i], A.assets[i]), { med: 1.10, lo: 0.85, hi: 1.40 }),

    R('de', 'Debt-to-Equity', 'Solvabilitas', 'Utang Berbunga ÷ Ekuitas', '×', 'low', i => safe(A.debt[i], A.equity[i]), { med: 0.55, lo: 0.30, hi: 0.80 }),
    R('icr', 'Interest Coverage', 'Solvabilitas', 'Laba Usaha ÷ Beban Keuangan', '×', 'high', i => safe(A.ebit[i], A.interest[i]), { med: 6.5, lo: 4.0, hi: 9.0 }),
  ];

  /* flux (CY adj vs PY ly) */
  const flux = wtb.map(r => {
    const cy = r.adj, py = r.ly;
    const dAbs = cy - py;
    const dPct = py !== 0 ? (dAbs / Math.abs(py)) * 100 : 100;
    return { code: r.code, name: r.name, group: r.group, cy, py, dAbs, dPct };
  });

  return { hist, A, ratios, flux };
}

/* small helper: status vs benchmark band */
function benchVerdict(val, b, good) {
  if (val < b.lo) return good === 'low' ? 'good' : good === 'flat' ? 'watch' : 'bad';
  if (val > b.hi) return good === 'high' ? 'good' : good === 'flat' ? 'watch' : 'bad';
  return 'ok';
}
const VERDICT_COLOR = { good: 'var(--green)', ok: 'var(--ink-2)', watch: 'var(--amber)', bad: 'var(--red)' };

/* ============================================================
   Main view
   ============================================================ */
function AnalyticalReview() {
  const { fmt } = AMS;
  const { wtb, risks } = useAudit();
  const { activeEngagement, activeClient } = useFirm();
  const pm = Math.round(activeEngagement.materiality * 0.75);
  const ct = Math.round(activeEngagement.materiality * 0.05);

  const [tab, setTab] = useStateAR('ringkasan');
  const der = useMemoAR(() => arDerive(wtb, pm), [wtb]);

  const TABS = [
    { id: 'ringkasan', label: 'Ringkasan' },
    { id: 'rasio', label: 'Analisis Rasio' },
    { id: 'fluktuasi', label: 'Fluktuasi (Flux)' },
    { id: 'tren', label: 'Tren & Common-Size' },
    { id: 'substantif', label: 'Uji Ekspektasi' },
    { id: 'disagregasi', label: 'Disagregasi Bulanan' },
  ];

  return (
    <>
      <SubBar moduleId="analytical" right={
        <div className="row gap8 ac">
          <Badge kind="blue">SA 520</Badge>
          <Btn sm><I.download size={13} /> Export Kertas Kerja</Btn>
          <Btn sm variant="primary"><I.sparkle size={14} /> Jelaskan dengan AI</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad">
          <div className="row ac wrap" style={{ gap: 0, marginBottom: 12, borderBottom: '1px solid var(--line)' }}>
            <div className="tabs" style={{ border: 0 }}>
              {TABS.map(t => (
                <button key={t.id} className={'tab ' + (tab === t.id ? 'on' : '')} onClick={() => setTab(t.id)}>{t.label}</button>
              ))}
            </div>
          </div>

          {tab === 'ringkasan' && <ARSummary der={der} pm={pm} ct={ct} risks={risks} eng={activeEngagement} client={activeClient} fmt={fmt} />}
          {tab === 'rasio' && <RatioAnalysisTab der={der} fmt={fmt} />}
          {tab === 'fluktuasi' && <FluxTab der={der} pm={pm} fmt={fmt} />}
          {tab === 'tren' && <TrendCommonSizeTab der={der} fmt={fmt} />}
          {tab === 'substantif' && <SubstantiveTab der={der} pm={pm} ct={ct} fmt={fmt} />}
          {tab === 'disagregasi' && <DisaggregationTab der={der} fmt={fmt} />}
        </div>
      </div>
    </>
  );
}

/* ============================================================
   TAB · Ringkasan (overview, SA 520 stage tracker, risk signals)
   ============================================================ */
function ARSummary({ der, pm, ct, risks, eng, client, fmt }: any) {
  const [memo, setMemo] = window.useAmsPersist('ar.memo.' + eng.id, '');
  /* "unexpected" fluctuation = material AND unusual %  → genuine exceptions to investigate */
  const rows = der.flux.map(r => ({ ...r, flagged: Math.abs(r.dAbs) > pm && Math.abs(r.dPct) > 15 }));
  const flagged = rows.filter(r => r.flagged);
  const explained = flagged.filter(r => FLUX_SEED[r.code]?.status === 'explained').length;
  const unexplainedAmt = flagged.filter(r => FLUX_SEED[r.code]?.status !== 'explained').reduce((s, r) => s + Math.abs(r.dAbs), 0);
  const adverseRatios = der.ratios.filter(r => benchVerdict(r.y[2], r.bench, r.good) === 'bad').length;

  /* link flagged accounts to RoMM register */
  const RISK_LINK = {
    '4-1100': 'R-01', '5-1100': 'R-01', '1-1300': 'R-02',
    '1-1200': 'R-03', '1-1210': 'R-03', '1-2300': 'R-06', '2-2200': 'R-06',
  };
  const signals = flagged.map(r => ({ ...r, risk: risks.find(x => x.id === RISK_LINK[r.code]) }))
    .filter(r => r.risk).slice(0, 8);

  const stages = [
    { k: 'Awal', sub: 'Perencanaan · SA 315', desc: 'Identifikasi area dengan fluktuasi tak terduga untuk menilai RoMM.', done: true },
    { k: 'Substantif', sub: 'Eksekusi · SA 520.5', desc: 'Uji ekspektasi atas akun yang dapat diprediksi (Beban Keuangan, Penyusutan, Penjualan).', done: false, active: true },
    { k: 'Akhir', sub: 'Finalisasi · SA 520.6', desc: 'Telaah menyeluruh kewajaran LK selaras pemahaman auditor.', done: false },
  ];

  const KPIS = [
    { v: flagged.length, l: 'Fluktuasi tak terduga', sub: 'material & menyimpang > 15%', accent: 'var(--blue)' },
    { v: explained + '/' + flagged.length, l: 'Terjelaskan', sub: Math.round(explained / (flagged.length || 1) * 100) + '% selesai', accent: 'var(--green)' },
    { v: 'Rp ' + fmt(unexplainedAmt / 1e6, 0) + ' jt', l: 'Selisih belum dijelaskan', sub: 'vs PM Rp ' + fmt(pm / 1e6, 0) + ' jt', accent: unexplainedAmt > pm ? 'var(--red)' : 'var(--amber)' },
    { v: adverseRatios, l: 'Rasio di luar tolok ukur', sub: 'dari ' + der.ratios.length + ' rasio industri', accent: adverseRatios ? 'var(--amber)' : 'var(--green)' },
  ];

  return (
    <>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
        {KPIS.map((k, i) => (
          <Panel key={i} noBody>
            <div style={{ padding: '12px 14px' }}>
              <div className="mono" style={{ fontSize: 24, fontWeight: 700, color: k.accent, lineHeight: 1.1 }}>{k.v}</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 3 }}>{k.l}</div>
              <div className="tiny muted" style={{ marginTop: 1 }}>{k.sub}</div>
            </div>
          </Panel>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 380px', gap: 12, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 12 }}>
          {/* SA 520 stage tracker */}
          <Panel noBody>
            <div className="panel-h"><h3>Tahap Prosedur Analitis (SA 520)</h3><div style={{ flex: 1 }} /><span className="tiny muted">{client.name} · {eng.fy}</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0 }}>
              {stages.map((s, i) => (
                <div key={s.k} style={{ padding: '13px 15px', borderRight: i < 2 ? '1px solid var(--line)' : 0, background: s.active ? 'var(--blue-050)' : 'transparent' }}>
                  <div className="row ac gap8" style={{ marginBottom: 6 }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', background: s.done ? 'var(--green)' : s.active ? 'var(--blue)' : 'var(--surface-3)', color: s.done || s.active ? '#fff' : 'var(--ink-3)' }}>
                      {s.done ? <I.check size={13} /> : <span className="mono tiny" style={{ fontWeight: 700 }}>{i + 1}</span>}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{s.k}</span>
                    {s.active && <Badge kind="blue">Berjalan</Badge>}
                    {s.done && <Badge kind="green">Selesai</Badge>}
                  </div>
                  <div className="tiny" style={{ fontWeight: 600, color: 'var(--ink-2)', marginBottom: 4 }}>{s.sub}</div>
                  <div className="tiny muted" style={{ lineHeight: 1.5 }}>{s.desc}</div>
                </div>
              ))}
            </div>
          </Panel>

          {/* Risk signals */}
          <Panel noBody>
            <div className="panel-h"><h3>Sinyal Analitis &amp; Tautan Risiko (RoMM)</h3><div style={{ flex: 1 }} /><span className="tiny muted">fluktuasi → register risiko · nilai Rp jt</span></div>
            <table className="dtbl">
              <thead><tr><th style={{ width: 70 }}>Kode</th><th>Akun</th><th className="num" style={{ width: 70 }}>Δ %</th><th style={{ width: 64 }}>Risiko</th><th>Asersi & Respons</th></tr></thead>
              <tbody>
                {signals.map(s => (
                  <tr key={s.code}>
                    <td className="mono tiny muted">{s.code}</td>
                    <td className="truncate" style={{ maxWidth: 150 }}>{s.name}</td>
                    <td className="num" style={{ color: 'var(--amber)', fontWeight: 700 }}>{s.dPct > 0 ? '+' : ''}{s.dPct.toFixed(0)}%</td>
                    <td><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--red)' }}>{s.risk.id}</span></td>
                    <td className="tiny"><b>{s.risk.assertion}</b> · <span className="muted">{s.risk.response}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>

        {/* Conclusion memo */}
        <Panel noBody style={{ position: 'sticky', top: 0 }}>
          <div className="panel-h"><h3>Kesimpulan Prosedur Analitis</h3></div>
          <div style={{ padding: 14 }}>
            <div className="panel" style={{ padding: '9px 11px', background: 'var(--surface-2)', boxShadow: 'none', marginBottom: 12 }}>
              <div className="row jb" style={{ marginBottom: 5 }}><span className="tiny muted upper">Materialitas Pelaksanaan</span><span className="mono tiny" style={{ fontWeight: 700 }}>Rp {fmt(pm / 1e6, 0)} jt</span></div>
              <div className="row jb"><span className="tiny muted upper">Ambang Trivial (CT)</span><span className="mono tiny" style={{ fontWeight: 700 }}>Rp {fmt(ct / 1e6, 0)} jt</span></div>
            </div>
            <div className="tiny muted upper" style={{ marginBottom: 5 }}>Memo Konklusi Auditor</div>
            <textarea value={memo} onChange={e => setMemo(e.target.value)} placeholder="Catat kesimpulan menyeluruh: apakah laporan keuangan konsisten dengan pemahaman auditor; selisih signifikan yang teridentifikasi telah diselidiki & didukung bukti…" className="input" style={{ width: '100%', height: 150, padding: 10, resize: 'vertical', lineHeight: 1.55, fontFamily: 'var(--ui)' }} />
            <div className="row gap6" style={{ marginTop: 10 }}>
              <Btn sm variant="primary"><I.check size={13} /> Tandatangani Konklusi</Btn>
              <Btn sm><I.sparkle size={13} /> Draf dengan AI</Btn>
            </div>
            <div className="tiny muted" style={{ marginTop: 10, lineHeight: 1.5, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
              Disusun: <b style={{ color: 'var(--ink-2)' }}>Anindya P.</b> · Direviu: <b style={{ color: 'var(--ink-2)' }}>Hartono W.</b> (EP)
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}

/* ============================================================
   TAB · Fluktuasi (the classic flux table + expectation modeling)
   ============================================================ */
function FluxTab({ der, pm, fmt }: any) {
  const [thr, setThr] = useStateAR(15);
  const [flaggedOnly, setFlaggedOnly] = useStateAR(false);
  const [state, setState] = useStateAR(FLUX_SEED);
  const [selCode, setSelCode] = useStateAR('1-1300');

  const rows = der.flux.map(r => ({ ...r, flagged: Math.abs(r.dAbs) > pm || Math.abs(r.dPct) > thr }));
  const shown = flaggedOnly ? rows.filter(r => r.flagged) : rows;
  const sel = rows.find(r => r.code === selCode) || rows[0];
  const flaggedCount = rows.filter(r => r.flagged).length;
  const explainedCount = rows.filter(r => r.flagged && state[r.code]?.status === 'explained').length;

  const num = (n) => <span className={n < 0 ? 'neg' : ''}>{fmt(n / 1e6, 0)}</span>;
  const setStatus = (code, status) => setState(s => ({ ...s, [code]: { ...(s[code] || { note: '' }), status } }));
  const setNote = (code, note) => setState(s => ({ ...s, [code]: { ...(s[code] || { status: 'pending' }), note } }));

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 360px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h">
          <h3>Analisis Fluktuasi (CY vs PY)</h3>
          <div style={{ flex: 1 }} />
          <div className="row ac gap8">
            <span className="tiny muted">Ambang</span>
            <input type="range" min="5" max="50" value={thr} onChange={e => setThr(+e.target.value)} style={{ width: 90, accentColor: 'var(--blue)' }} />
            <span className="mono tiny" style={{ fontWeight: 700, width: 30 }}>{thr}%</span>
            <Badge kind="red">{flaggedCount} flagged</Badge>
            <label className="row ac gap6" style={{ cursor: 'pointer' }} onClick={() => setFlaggedOnly(f => !f)}>
              <span style={{ width: 28, height: 16, borderRadius: 9, background: flaggedOnly ? 'var(--blue)' : 'var(--line-strong)', position: 'relative', flex: '0 0 auto' }}>
                <span style={{ position: 'absolute', top: 2, left: flaggedOnly ? 14 : 2, width: 12, height: 12, borderRadius: '50%', background: '#fff', transition: '.15s' }} />
              </span>
              <span className="tiny" style={{ fontWeight: 600 }}>Flagged saja</span>
            </label>
          </div>
        </div>
        <div style={{ maxHeight: 'calc(100vh - 250px)', overflow: 'auto' }}>
          <table className="dtbl">
            <thead><tr>
              <th style={{ width: 70 }}>Kode</th><th>Akun</th>
              <th className="num" style={{ width: 96 }}>CY</th><th className="num" style={{ width: 96 }}>PY</th>
              <th className="num" style={{ width: 96 }}>Δ Abs</th><th className="num" style={{ width: 64 }}>Δ %</th><th style={{ width: 96 }}>Status</th>
            </tr></thead>
            <tbody>
              {shown.map(r => {
                const st = state[r.code]?.status;
                return (
                  <tr key={r.code} className={r.code === selCode ? 'sel' : ''} onClick={() => setSelCode(r.code)} style={{ cursor: 'pointer' }}>
                    <td className="mono tiny muted">{r.code}</td>
                    <td><span className="row ac gap6">{r.name}{r.flagged && <span style={{ color: 'var(--amber)' }} title="Melebihi ambang"><I.flag size={11} /></span>}</span></td>
                    <td className="num">{num(r.cy)}</td>
                    <td className="num muted">{num(r.py)}</td>
                    <td className="num" style={{ color: r.flagged ? 'var(--ink)' : 'var(--ink-3)', fontWeight: r.flagged ? 600 : 400 }}>{num(r.dAbs)}</td>
                    <td className="num tiny" style={{ color: Math.abs(r.dPct) > thr ? 'var(--amber)' : 'var(--ink-3)', fontWeight: Math.abs(r.dPct) > thr ? 700 : 400 }}>{r.dPct > 0 ? '+' : ''}{r.dPct.toFixed(0)}%</td>
                    <td>{!r.flagged ? <span className="tiny muted">—</span> : st === 'explained' ? <Badge kind="green">Explained</Badge> : st === 'unexplained' ? <Badge kind="red">Unexplained</Badge> : <Badge kind="amber">Pending</Badge>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="row ac" style={{ padding: '7px 12px', borderTop: '1px solid var(--line)', background: 'var(--surface-2)' }}>
          <span className="tiny muted">{explainedCount}/{flaggedCount} flagged terjelaskan · nilai Rp jt · Δ% terhadap PY</span>
        </div>
      </Panel>

      <Panel noBody style={{ position: 'sticky', top: 0 }}>
        <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
          <div className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{sel.code}</span><span style={{ fontWeight: 700, fontSize: 13 }} className="truncate">{sel.name}</span></div>
        </div>
        <div style={{ padding: 14 }}>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <KvBox label="Perubahan Absolut" v={'Rp ' + fmt(sel.dAbs / 1e6, 0) + ' jt'} accent={Math.abs(sel.dAbs) > pm ? 'var(--amber)' : null} />
            <KvBox label="Perubahan %" v={(sel.dPct > 0 ? '+' : '') + sel.dPct.toFixed(1) + '%'} accent={Math.abs(sel.dPct) > thr ? 'var(--amber)' : null} />
          </div>
          <div className="panel" style={{ padding: '9px 10px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)', marginBottom: 12 }}>
            <div className="row jb ac" style={{ marginBottom: 5 }}>
              <span className="tiny muted upper">Ekspektasi Auditor</span>
              <div className="row ac gap4">
                <input type="number" value={state[sel.code]?.exp ?? 8} onChange={e => setState(s => ({ ...s, [sel.code]: { ...(s[sel.code] || { status: 'pending', note: '' }), exp: +e.target.value } }))} className="input mono" style={{ width: 56, height: 24, textAlign: 'right', padding: '0 6px' }} />
                <span className="tiny" style={{ fontWeight: 700 }}>%</span>
                <span className="tiny muted">± </span>
                <input type="number" value={state[sel.code]?.tol ?? 5} onChange={e => setState(s => ({ ...s, [sel.code]: { ...(s[sel.code] || { status: 'pending', note: '' }), tol: +e.target.value } }))} className="input mono" style={{ width: 46, height: 24, textAlign: 'right', padding: '0 6px' }} />
              </div>
            </div>
            {(() => {
              const exp = state[sel.code]?.exp ?? 8, tol = state[sel.code]?.tol ?? 5;
              const within = Math.abs(sel.dPct - exp) <= tol;
              return (
                <div className="row ac gap6" style={{ fontSize: 11.5 }}>
                  <span style={{ color: within ? 'var(--green)' : 'var(--red)' }}>{within ? <I.checkCircle size={14} /> : <I.alert size={14} />}</span>
                  <span style={{ lineHeight: 1.4 }}>Aktual <b className="mono">{sel.dPct > 0 ? '+' : ''}{sel.dPct.toFixed(0)}%</b> {within ? 'sesuai' : 'menyimpang dari'} ekspektasi (<span className="mono">{exp}%±{tol}</span>){within ? '' : ' — perlu investigasi & bukti pendukung.'}</span>
                </div>
              );
            })()}
          </div>
          <div className="tiny muted upper" style={{ marginBottom: 5 }}>Penjelasan Manajemen / Auditor</div>
          <textarea value={state[sel.code]?.note || ''} onChange={e => setNote(sel.code, e.target.value)} placeholder="Catat penjelasan dan bukti pendukung…" className="input" style={{ width: '100%', height: 92, padding: 9, resize: 'vertical', lineHeight: 1.5, fontFamily: 'var(--ui)', marginBottom: 12 }} />
          <div className="tiny muted upper" style={{ marginBottom: 5 }}>Konklusi</div>
          <div className="row gap6">
            <Btn sm onClick={() => setStatus(sel.code, 'explained')} style={state[sel.code]?.status === 'explained' ? { background: 'var(--green)', color: '#fff', borderColor: 'var(--green)' } : {}}><I.check size={13} /> Explained</Btn>
            <Btn sm onClick={() => setStatus(sel.code, 'pending')} style={state[sel.code]?.status === 'pending' ? { background: 'var(--amber)', color: '#fff', borderColor: 'var(--amber)' } : {}}>Pending</Btn>
            <Btn sm onClick={() => setStatus(sel.code, 'unexplained')} style={state[sel.code]?.status === 'unexplained' ? { background: 'var(--red)', color: '#fff', borderColor: 'var(--red)' } : {}}>Unexpl.</Btn>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function KvBox({ label, v, accent }: any) {
  return (
    <div className="panel" style={{ padding: '7px 10px', boxShadow: 'none' }}>
      <div className="tiny muted upper" style={{ marginBottom: 1 }}>{label}</div>
      <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: accent || 'var(--navy)' }}>{v}</div>
    </div>
  );
}

Object.assign(window, { AnalyticalReview, arDerive, benchVerdict, VERDICT_COLOR, FLUX_SEED, KvBox });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { AnalyticalReview, FLUX_SEED, KvBox, VERDICT_COLOR, arDerive, benchVerdict };
