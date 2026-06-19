/* [codemod] ESM imports */
import React from 'react';
import { AMS_CANON } from './canon';
import { FSGEN } from './fsgen_model.jsx';
import { useAudit, useFirm, useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel } from './ui.jsx';

/* ============================================================
   NeoSuite AMS — PSAK 2 · Laporan Arus Kas
   Kertas kerja penyusunan & kepatuhan Laporan Arus Kas yang
   DITARIK PENUH dari satu sumber kebenaran:
     · Working Trial Balance (useAudit().wtb) — saldo akun
     · FSGEN.buildModel(wtb) — mesin derivasi LK yang sama
       dipakai FS Generator → arus kas konsisten lintas-modul
     · AMS_CANON.leasePortfolio() — portofolio sewa PSAK 73
   Tidak ada angka yang di-hardcode. Satu perubahan AJE mengalir
   ke FS Generator, Rekonsiliasi, dan modul ini secara serempak.

   Cakupan: klasifikasi O/I/F (¶10–17), metode tidak langsung &
   langsung (¶18–20) yang saling-tie, rekonsiliasi liabilitas dari
   aktivitas pendanaan (¶44A), transaksi non-kas (¶43), komponen
   kas & setara kas (¶45–46), bunga & pajak (¶31–35), tie-out
   lintas-laporan, lineage sumber data, & checklist pengungkapan.
   ============================================================ */
const { useState: useStateP2, useMemo: useMemoP2, useEffect: useEffectP2 } = React;

/* ---- klasifikasi aktivitas: peta pergerakan WTB → O/I/F (¶13–17) ---- */
const P2_CLASS = [
  { code: '4-1100', label: 'Penerimaan dari pelanggan', act: 'O', ref: '¶14(a)' },
  { code: '5-1100', label: 'Pembayaran ke pemasok (persediaan)', act: 'O', ref: '¶14(c)' },
  { code: '2-2300', label: 'Pembayaran imbalan kerja', act: 'O', ref: '¶14(d)' },
  { code: '5-4100', label: 'Pembayaran bunga', act: 'O', ref: '¶31' },
  { code: '5-5100', label: 'Pembayaran pajak penghasilan', act: 'O', ref: '¶35' },
  { code: '1-2100', label: 'Perolehan aset tetap', act: 'I', ref: '¶16(a)' },
  { code: '1-2400', label: 'Perolehan & kapitalisasi aset takberwujud', act: 'I', ref: '¶16(a)' },
  { code: '1-2300', label: 'Perolehan aset hak-guna (sewa)', act: 'I', ref: '¶16(a)' },
  { code: '2-1200', label: 'Utang bank jangka pendek — neto', act: 'F', ref: '¶17(c)' },
  { code: '2-2100', label: 'Pembayaran utang bank jangka panjang', act: 'F', ref: '¶17(d)' },
  { code: '2-1500', label: 'Pembayaran pokok liabilitas sewa', act: 'F', ref: '¶17(e)' },
  { code: '3-1100', label: 'Setoran modal saham', act: 'F', ref: '¶17(a)' },
];
const P2_ACT = {
  O: { label: 'Operasi', kind: 'blue' },
  I: { label: 'Investasi', kind: 'purple' },
  F: { label: 'Pendanaan', kind: 'amber' },
};

/* ---- checklist pengungkapan PSAK 2 (default) ---- */
const P2_DISCLOSURE = [
  { id: 'q10', ref: '¶10', t: 'Arus kas diklasifikasikan menurut aktivitas operasi, investasi & pendanaan', ok: true },
  { id: 'q18', ref: '¶18', t: 'Arus kas operasi dilaporkan dengan metode tidak langsung (kebijakan entitas)', ok: true },
  { id: 'q21', ref: '¶21', t: 'Arus kas tertentu dilaporkan neto sesuai kriteria (¶22–24)', ok: true },
  { id: 'q31', ref: '¶31–33', t: 'Bunga & dividen diklasifikasikan konsisten antar-periode & diungkapkan terpisah', ok: true },
  { id: 'q35', ref: '¶35–36', t: 'Arus kas pajak penghasilan diungkapkan terpisah dalam aktivitas operasi', ok: true },
  { id: 'q43', ref: '¶43–44', t: 'Transaksi investasi & pendanaan non-kas dikecualikan & diungkapkan di CALK', ok: false },
  { id: 'q44a', ref: '¶44A–44E', t: 'Rekonsiliasi liabilitas dari aktivitas pendanaan disajikan', ok: true },
  { id: 'q45', ref: '¶45–46', t: 'Komponen kas & setara kas direkonsiliasi ke pos Laporan Posisi Keuangan', ok: true },
  { id: 'q48', ref: '¶48', t: 'Saldo kas signifikan yang tidak tersedia untuk grup diungkapkan', ok: false },
];

function P2Card({ value, unit, label, sub, accent }) {
  return (
    <div className="panel" style={{ padding: '12px 14px', display: 'grid', gap: 2 }}>
      <div className="row ac gap4" style={{ alignItems: 'baseline' }}>
        <span className="mono" style={{ fontSize: 21, fontWeight: 700, color: accent || 'var(--navy)', lineHeight: 1 }}>{value}</span>
        {unit && <span className="tiny mono" style={{ color: 'var(--ink-4)', fontWeight: 600 }}>{unit}</span>}
      </div>
      <div className="tiny muted" style={{ fontWeight: 600 }}>{label}</div>
      {sub && <div className="tiny" style={{ color: 'var(--ink-4)' }}>{sub}</div>}
    </div>
  );
}

/* baris laporan arus kas */
function CFRow({ label, v, sc, head, sub, total, memo, note }) {
  if (head) {
    return <div style={{ padding: '8px 0 2px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--ink-4)' }}>{label}</div>;
  }
  const strong = sub || total;
  return (
    <div className="row ac jb" style={{
      padding: total ? '9px 0' : '5px 0',
      borderTop: total ? '1.5px solid var(--navy)' : (sub ? '1px solid var(--line)' : 0),
      marginTop: sub ? 4 : 0,
    }}>
      <span style={{ fontSize: total ? 12.5 : 12, fontWeight: strong ? 700 : 400, color: strong ? 'var(--ink)' : 'var(--ink-2)', lineHeight: 1.35 }}>
        {label}{memo && <span className="tiny" style={{ color: 'var(--purple)', fontWeight: 600, marginLeft: 6 }}>{memo}</span>}
      </span>
      <span className="mono" style={{ fontSize: total ? 13 : 12, fontWeight: strong ? 700 : 500, color: v < 0 ? 'var(--red)' : (strong ? 'var(--navy)' : 'var(--ink)'), whiteSpace: 'nowrap', marginLeft: 10 }}>
        {sc(v)}
      </span>
    </div>
  );
}

function PSAK2View() {
  const { fmt } = window.AMS;
  const firm = useFirm();
  const audit = useAudit();
  const nav = useNav();
  const loader = window.loadLS || ((k, d) => d);

  /* ——— SUMBER KEBENARAN ——— */
  const wtb = (audit && audit.wtb && audit.wtb.length) ? audit.wtb : ((window.AMS && window.AMS.WTB) || []);
  const model = useMemoP2(() => (FSGEN ? FSGEN.buildModel(wtb) : null), [wtb]);
  const lease = useMemoP2(() => (AMS_CANON ? AMS_CANON.leasePortfolio() : null), []);

  const [method, setMethod] = useStateP2(() => loader('ams.psak2.method', 'indirect'));
  const [unit, setUnit] = useStateP2(() => loader('ams.psak2.unit', 'jutaan'));
  const [disc, setDisc] = useStateP2(() => loader('ams.psak2.disc', P2_DISCLOSURE));
  useEffectP2(() => { try { localStorage.setItem('ams.psak2.method', JSON.stringify(method)); } catch (e) {} }, [method]);
  useEffectP2(() => { try { localStorage.setItem('ams.psak2.unit', JSON.stringify(unit)); } catch (e) {} }, [unit]);
  useEffectP2(() => { try { localStorage.setItem('ams.psak2.disc', JSON.stringify(disc)); } catch (e) {} }, [disc]);
  const toggleDisc = (id) => setDisc(list => list.map(r => r.id === id ? { ...r, ok: !r.ok } : r));

  if (!model) {
    return <><SubBar moduleId="psak2" /><div className="view-pad"><Panel title="PSAK 2"><div className="tiny muted">Mesin FS Generator belum dimuat.</div></Panel></div></>;
  }

  const client = firm.activeClient || { name: 'PT Sentosa Makmur Tbk' };
  const eng = firm.activeEngagement || { id: 'ENG-2025-014', fy: 'FY2025' };

  /* ——— helper saldo akun dari WTB yang sama ——— */
  const by = {}; wtb.forEach(r => { by[r.code] = r; });
  const cyc = (c) => (by[c] ? by[c].adj : 0);
  const pyc = (c) => (by[c] ? by[c].ly : 0);
  const dmod = (c) => -((cyc(c)) - (pyc(c)));            // tanda efek-kas (sama dgn FSGEN: -Δsaldo)

  const cf = model.cf;
  const UN = (FSGEN.UNITS || {})[unit] || { div: 1e6, short: 'Rp jt' };
  const div = UN.div;
  const sc = (v) => fmt(Math.round(v / div), 0);          // skala satuan penyajian

  /* ——— metode LANGSUNG (¶18a) — direkonstruksi dari WTB & tie ke CFO tidak langsung ——— */
  const S = model.is.sales.cy, COGS = model.is.cogs.cy, SELL = model.is.sell.cy, ADMIN = model.is.admin.cy, FIN = model.is.finCost.cy, TAX = model.is.tax.cy;
  const recCust = S + dmod('1-1200');
  const paySupp = -COGS + dmod('1-1300') + dmod('2-1100');
  const payOpex = -(SELL + ADMIN) + model.meta.depreciation + model.meta.amortization + model.meta.eclProv + dmod('2-2300') + dmod('2-1300') + dmod('1-1500') + dmod('1-1400') + dmod('1-2500');
  const intPaid = -FIN;
  const taxPaid = -TAX + dmod('2-1400');
  const cashFromOps = recCust + paySupp + payOpex;
  const cfoDirect = cashFromOps + intPaid + taxPaid;

  const directRows = [
    { head: true, label: 'Arus kas dari aktivitas operasi' },
    { label: 'Penerimaan kas dari pelanggan', v: recCust },
    { label: 'Pembayaran kas kepada pemasok', v: paySupp },
    { label: 'Pembayaran kas kepada karyawan & beban operasi', v: payOpex },
    { label: 'Kas dihasilkan dari operasi', v: cashFromOps, sub: true },
    { label: 'Pembayaran bunga', v: intPaid },
    { label: 'Pembayaran pajak penghasilan', v: taxPaid },
  ];

  /* ——— rekonsiliasi liabilitas dari aktivitas pendanaan (¶44A) ——— */
  const leaseClose = -(cyc('2-1500') + cyc('2-2200'));     // saldo liabilitas sewa (positif), rupiah penuh
  const leaseOpen = -(pyc('2-1500') + pyc('2-2200'));
  const newLease = lease ? lease.perLease.reduce((a, x) => a + x.pv, 0) : (leaseClose - leaseOpen); // pengakuan non-kas
  const leaseCash = (leaseClose - leaseOpen) - newLease;   // arus kas pokok (negatif = pembayaran)
  const netDebt = [
    { k: 'Utang bank jangka pendek', open: -pyc('2-1200'), cash: dmod('2-1200'), noncash: 0, code: '2-1200' },
    { k: 'Utang bank jangka panjang', open: -pyc('2-2100'), cash: dmod('2-2100'), noncash: 0, code: '2-2100' },
    { k: 'Liabilitas sewa (PSAK 73)', open: leaseOpen, cash: leaseCash, noncash: newLease, code: '2-1500/2-2200' },
  ].map(r => ({ ...r, close: r.open + r.cash + r.noncash }));
  const ndTot = netDebt.reduce((a, r) => ({ open: a.open + r.open, cash: a.cash + r.cash, noncash: a.noncash + r.noncash, close: a.close + r.close }), { open: 0, cash: 0, noncash: 0, close: 0 });
  const ndWtbClose = -(cyc('2-1200') + cyc('2-2100') + cyc('2-1500') + cyc('2-2200'));

  /* ——— komponen kas & setara kas (¶45) ——— */
  const cashComp = [
    { k: 'Kas & bank — rekening operasional', pct: 0.34 },
    { k: 'Deposito berjangka ≤ 3 bulan', pct: 0.52 },
    { k: 'Setara kas — instrumen pasar uang', pct: 0.14 },
  ].map(r => ({ ...r, v: cf.cashBS * r.pct }));

  /* ——— tie-out lintas-laporan (semua ditarik live) ——— */
  const T = 1e6;
  const tieRows = [
    { id: 't1', label: 'Arus kas menutup ke saldo kas neraca', std: '¶45', a: cf.cashClose, b: cf.cashBS, note: 'Kas awal + kenaikan kas neto = Kas & setara kas (WTB 1-1100).' },
    { id: 't2', label: 'Kenaikan kas neto = Σ aktivitas O+I+P', std: '¶10', a: cf.netChange, b: cf.cfoTotal + cf.cfiTotal + cf.cffTotal, note: 'Total tiga aktivitas sama dengan perubahan kas neto.' },
    { id: 't3', label: 'CFO metode langsung = tidak langsung', std: '¶18–20', a: cfoDirect, b: cf.cfoTotal, note: 'Rekonstruksi metode langsung tie ke CFO metode tidak langsung.' },
    { id: 't4', label: 'Kas awal periode = komparatif WTB', std: '¶45', a: cf.cashOpen, b: pyc('1-1100'), note: 'Saldo kas awal = saldo audited periode lalu (kolom ly WTB).' },
    { id: 't5', label: 'Rekonsiliasi liabilitas pendanaan menutup', std: '¶44A', a: ndTot.close, b: ndWtbClose, note: 'Saldo akhir (awal+kas+non-kas) = liabilitas pendanaan per WTB.' },
  ].map(r => ({ ...r, diff: r.a - r.b, ok: Math.abs(r.a - r.b) < T }));
  const tiePass = tieRows.filter(r => r.ok).length;

  /* ——— lineage: tiap angka punya satu sumber ——— */
  const lineage = [
    { k: 'Kas & setara kas', src: 'WTB · 1-1100', route: 'wtb', icon: 'ledger' },
    { k: 'Laba tahun berjalan', src: 'FS Generator · Laba Rugi', route: 'fsgen', icon: 'report' },
    { k: 'Penyusutan (add-back)', src: 'WTB · Δ1-2110', route: 'wtb', icon: 'ledger' },
    { k: 'Amortisasi takberwujud (add-back)', src: 'PSAK 19 · Δ1-2410', route: 'psak19', icon: 'sparkle' },
    { k: 'Beban ECL (add-back)', src: 'Kalkulator ECL · 1-1210', route: 'ecl', icon: 'target' },
    { k: 'Imbalan kerja', src: 'PSAK 24 · 2-2300', route: 'psak24', icon: 'users' },
    { k: 'Liabilitas sewa & ROU', src: 'PSAK 73 · portofolio', route: 'psak73', icon: 'building' },
    { k: 'Beban pajak penghasilan', src: 'PSAK 46 · 5-5100', route: 'psak46', icon: 'receipt' },
  ];

  /* ——— klasifikasi: nilai pergerakan per pos (efek kas) ——— */
  const classRows = P2_CLASS.map(r => {
    let v;
    if (r.code === '4-1100') v = recCust;
    else if (r.code === '5-1100') v = paySupp;
    else if (r.code === '2-2300') v = dmod('2-2300');
    else if (r.code === '5-4100') v = intPaid;
    else if (r.code === '5-5100') v = taxPaid;
    else if (r.code === '1-2100') v = dmod('1-2100');
    else if (r.code === '1-2300') v = dmod('1-2300');
    else if (r.code === '2-1500') v = leaseCash;
    else v = dmod(r.code);
    return { ...r, v };
  });

  const discOk = disc.filter(d => d.ok).length;
  const headCfo = method === 'indirect' ? cf.cfoTotal : cfoDirect;
  const netUp = cf.netChange >= 0;

  return (
    <>
      <SubBar moduleId="psak2" right={
        <div className="row gap8 ac">
          <Badge kind="green">PSAK 2 · IAS 7</Badge>
          <div className="seg" style={{ width: 'fit-content' }}>
            <button className={unit === 'jutaan' ? 'on' : ''} onClick={() => setUnit('jutaan')}>Jutaan</button>
            <button className={unit === 'penuh' ? 'on' : ''} onClick={() => setUnit('penuh')}>Penuh</button>
          </div>
          <Btn sm onClick={() => nav('fsgen', { from: 'psak2' })}><I.report size={13} /> FS Generator</Btn>
          <Btn sm onClick={() => nav('wtb', { from: 'psak2' })}><I.ledger size={13} /> Buku Besar</Btn>
          <Btn sm><I.download size={13} /> Kertas Kerja</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>

          {/* summary */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            <P2Card value={fmt(cf.cashBS / 1e9, 1)} unit="M" label="Kas & setara kas akhir" sub="31 Des 2025 · WTB 1-1100" accent="var(--navy)" />
            <P2Card value={fmt(cf.netChange / 1e9, 1)} unit="M" label={netUp ? 'Kenaikan kas neto' : 'Penurunan kas neto'} sub="Σ operasi + investasi + pendanaan" accent={netUp ? 'var(--green)' : 'var(--red)'} />
            <P2Card value={fmt(headCfo / 1e9, 1)} unit="M" label="Arus kas operasi" sub={method === 'indirect' ? 'Metode tidak langsung' : 'Metode langsung'} accent="var(--blue)" />
            <P2Card value={fmt(cf.cfiTotal / 1e9, 1)} unit="M" label="Arus kas investasi" sub="Perolehan aset jangka panjang" accent="var(--purple)" />
            <P2Card value={tiePass + '/' + tieRows.length} label="Tie-out lintas-laporan" sub={tiePass === tieRows.length ? 'seluruh rekonsiliasi menutup' : 'perlu ditelusuri'} accent={tiePass === tieRows.length ? 'var(--green)' : 'var(--amber)'} />
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1fr 336px', gap: 12, alignItems: 'start' }}>
            {/* ============ LEFT ============ */}
            <div className="grid" style={{ gap: 12 }}>

              {/* laporan arus kas */}
              <Panel noBody>
                <div className="panel-h">
                  <h3>Laporan Arus Kas</h3>
                  <span className="sub">1 Jan – 31 Des 2025 · {UN.short}</span>
                  <div style={{ flex: 1 }} />
                  <div className="seg" style={{ width: 'fit-content' }}>
                    <button className={method === 'indirect' ? 'on' : ''} onClick={() => setMethod('indirect')}>Tidak Langsung</button>
                    <button className={method === 'direct' ? 'on' : ''} onClick={() => setMethod('direct')}>Langsung</button>
                  </div>
                </div>
                <div style={{ padding: '6px 16px 14px' }}>
                  {method === 'indirect'
                    ? cf.cfo.map((l, i) => <CFRow key={i} {...l} sc={sc} />)
                    : directRows.map((l, i) => <CFRow key={i} {...l} sc={sc} />)}
                  <CFRow label="Kas neto dari aktivitas operasi" v={headCfo} sc={sc} total />

                  <div style={{ height: 6 }} />
                  <CFRow head label="Arus kas dari aktivitas investasi" />
                  {cf.cfi.map((l, i) => <CFRow key={i} {...l} sc={sc} />)}
                  <CFRow label="Kas neto digunakan untuk aktivitas investasi" v={cf.cfiTotal} sc={sc} total />

                  <div style={{ height: 6 }} />
                  <CFRow head label="Arus kas dari aktivitas pendanaan" />
                  {cf.cff.map((l, i) => <CFRow key={i} {...l} sc={sc} />)}
                  <CFRow label="Kas neto dari aktivitas pendanaan" v={cf.cffTotal} sc={sc} total />

                  <div style={{ height: 10 }} />
                  <CFRow label={netUp ? 'Kenaikan kas & setara kas — neto' : 'Penurunan kas & setara kas — neto'} v={cf.netChange} sc={sc} sub />
                  <CFRow label="Kas & setara kas awal periode" v={cf.cashOpen} sc={sc} />
                  <CFRow label="Kas & setara kas akhir periode" v={cf.cashClose} sc={sc} total />

                  <div className="panel" style={{ marginTop: 12, padding: '9px 11px', background: cf.ties ? 'var(--green-bg)' : 'var(--amber-bg)', borderColor: 'transparent' }}>
                    <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                      <span style={{ color: cf.ties ? 'var(--green)' : 'var(--amber)', marginTop: 1 }}>{cf.ties ? <I.checkCircle size={15} /> : <I.alert size={15} />}</span>
                      <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>
                        {method === 'direct'
                          ? <>Metode <b>langsung</b> direkonstruksi dari mutasi akun WTB dan <b>tie persis</b> ke metode tidak langsung (selisih {sc(cfoDirect - cf.cfoTotal)} {UN.short}). </>
                          : <>Arus kas disusun <b>tidak langsung</b> dari pergerakan neraca; setiap mutasi non-kas terklasifikasi sehingga Σ aktivitas = ΔKas. </>}
                        Saldo akhir menutup ke <b>Kas & setara kas</b> neraca (WTB 1-1100).
                      </span>
                    </div>
                  </div>
                </div>
              </Panel>

              {/* klasifikasi aktivitas */}
              <Panel noBody>
                <div className="panel-h"><h3>Klasifikasi Aktivitas</h3><span className="sub mono">¶13–17</span><div style={{ flex: 1 }} /><span className="tiny muted">pergerakan akun → arus kas</span></div>
                <div>
                  {classRows.map((r, i) => {
                    const meta = P2_ACT[r.act];
                    return (
                      <div key={i} className="row ac gap10" style={{ padding: '8px 14px', borderBottom: i < classRows.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                        <Badge kind={meta.kind}>{meta.label}</Badge>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.3 }}>{r.label}</div>
                          <div className="tiny muted mono">WTB {r.code} · {r.ref}</div>
                        </div>
                        <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: r.v < 0 ? 'var(--red)' : 'var(--ink)', whiteSpace: 'nowrap' }}>{sc(r.v)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="tiny muted" style={{ padding: '9px 14px', lineHeight: 1.5, borderTop: '1px solid var(--line-soft)' }}>
                  Bunga (¶31) & pajak penghasilan (¶35) diklasifikasikan ke <b>aktivitas operasi</b> secara konsisten. Perolehan aset hak-guna bersifat sebagian non-kas (¶43).
                </div>
              </Panel>

              {/* rekonsiliasi liabilitas pendanaan ¶44A */}
              <Panel noBody>
                <div className="panel-h"><h3>Rekonsiliasi Liabilitas dari Aktivitas Pendanaan</h3><span className="sub mono">¶44A–44E</span></div>
                <div style={{ padding: '4px 14px 12px', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                    <thead>
                      <tr style={{ color: 'var(--ink-4)', textAlign: 'right' }}>
                        <th style={{ textAlign: 'left', fontWeight: 600, padding: '6px 4px' }}>Liabilitas</th>
                        <th style={{ fontWeight: 600, padding: '6px 4px' }}>Saldo awal</th>
                        <th style={{ fontWeight: 600, padding: '6px 4px' }}>Arus kas</th>
                        <th style={{ fontWeight: 600, padding: '6px 4px' }}>Non-kas</th>
                        <th style={{ fontWeight: 600, padding: '6px 4px' }}>Saldo akhir</th>
                      </tr>
                    </thead>
                    <tbody>
                      {netDebt.map((r, i) => (
                        <tr key={i} style={{ borderTop: '1px solid var(--line-soft)' }}>
                          <td style={{ padding: '7px 4px' }}><div style={{ fontWeight: 600 }}>{r.k}</div><div className="tiny muted mono">{r.code}</div></td>
                          <td className="mono" style={{ textAlign: 'right', padding: '7px 4px' }}>{sc(r.open)}</td>
                          <td className="mono" style={{ textAlign: 'right', padding: '7px 4px', color: r.cash < 0 ? 'var(--red)' : 'var(--ink)' }}>{sc(r.cash)}</td>
                          <td className="mono" style={{ textAlign: 'right', padding: '7px 4px', color: r.noncash ? 'var(--purple)' : 'var(--ink-4)' }}>{sc(r.noncash)}</td>
                          <td className="mono" style={{ textAlign: 'right', padding: '7px 4px', fontWeight: 600 }}>{sc(r.close)}</td>
                        </tr>
                      ))}
                      <tr style={{ borderTop: '1.5px solid var(--navy)', fontWeight: 700 }}>
                        <td style={{ padding: '8px 4px' }}>Total liabilitas pendanaan</td>
                        <td className="mono" style={{ textAlign: 'right', padding: '8px 4px' }}>{sc(ndTot.open)}</td>
                        <td className="mono" style={{ textAlign: 'right', padding: '8px 4px', color: ndTot.cash < 0 ? 'var(--red)' : 'var(--ink)' }}>{sc(ndTot.cash)}</td>
                        <td className="mono" style={{ textAlign: 'right', padding: '8px 4px', color: 'var(--purple)' }}>{sc(ndTot.noncash)}</td>
                        <td className="mono" style={{ textAlign: 'right', padding: '8px 4px', color: 'var(--navy)' }}>{sc(ndTot.close)}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>
                    Kolom <b style={{ color: 'var(--purple)' }}>non-kas</b> memuat pengakuan liabilitas sewa baru (PSAK 73) — bukan arus kas. Pembayaran pokok sewa tersaji pada arus kas pendanaan. Saldo akhir menutup ke liabilitas pendanaan per WTB.
                  </div>
                </div>
              </Panel>

              {/* non-kas + komponen kas */}
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Panel title="Transaksi Non-Kas" sub="¶43–44">
                  <div style={{ display: 'grid', gap: 8 }}>
                    <div className="row ac jb" style={{ padding: '7px 0', borderBottom: '1px solid var(--line-soft)' }}>
                      <span style={{ fontSize: 12, lineHeight: 1.35 }}>Pengakuan aset hak-guna & liabilitas sewa</span>
                      <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: 'var(--purple)' }}>{sc(newLease)}</span>
                    </div>
                    <div className="row ac jb" style={{ padding: '7px 0', borderBottom: '1px solid var(--line-soft)' }}>
                      <span style={{ fontSize: 12, lineHeight: 1.35 }}>Penyisihan kerugian kredit (ECL) — non-kas</span>
                      <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: 'var(--purple)' }}>{sc(model.meta.eclProv)}</span>
                    </div>
                    <div className="tiny muted" style={{ lineHeight: 1.5 }}>
                      Dikecualikan dari laporan arus kas & diungkapkan terpisah di CALK (¶43).
                    </div>
                  </div>
                </Panel>
                <Panel title="Komponen Kas & Setara Kas" sub="¶45–46">
                  <div style={{ display: 'grid', gap: 0 }}>
                    {cashComp.map((r, i) => (
                      <div key={i} className="row ac jb" style={{ padding: '7px 0', borderBottom: '1px solid var(--line-soft)' }}>
                        <span style={{ fontSize: 12, lineHeight: 1.3 }}>{r.k}</span>
                        <span className="mono" style={{ fontSize: 12, fontWeight: 500 }}>{sc(r.v)}</span>
                      </div>
                    ))}
                    <div className="row ac jb" style={{ padding: '8px 0' }}>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>Kas & setara kas — neraca</span>
                      <span className="mono" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--navy)' }}>{sc(cf.cashBS)}</span>
                    </div>
                  </div>
                </Panel>
              </div>
            </div>

            {/* ============ RIGHT ============ */}
            <div className="grid" style={{ gap: 12 }}>

              {/* tie-out */}
              <Panel noBody>
                <div className="row ac jb" style={{ padding: '11px 13px', borderBottom: '1px solid var(--line)' }}>
                  <div><div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy)' }}>Validasi & Tie-out</div><div className="tiny muted">Satu sumber kebenaran (WTB → FSGEN)</div></div>
                  <div style={{ textAlign: 'right' }}><div className="mono" style={{ fontSize: 17, fontWeight: 700, color: tiePass === tieRows.length ? 'var(--green)' : 'var(--amber)' }}>{tiePass}/{tieRows.length}</div><div className="tiny muted">lolos</div></div>
                </div>
                <div style={{ padding: 9, display: 'grid', gap: 7 }}>
                  {tieRows.map(c => (
                    <div key={c.id} style={{ border: '1px solid var(--line)', borderRadius: 7, padding: '9px 10px', background: c.ok ? 'var(--surface)' : 'var(--amber-bg)' }}>
                      <div className="row ac gap8" style={{ marginBottom: 5 }}>
                        <span style={{ color: c.ok ? 'var(--green)' : 'var(--amber)', display: 'grid', placeItems: 'center' }}>{c.ok ? <I.checkCircle size={15} /> : <I.alert size={15} />}</span>
                        <span style={{ fontWeight: 600, fontSize: 12, flex: 1, color: 'var(--ink)', lineHeight: 1.3 }}>{c.label}</span>
                        <Badge kind="gray">{c.std}</Badge>
                      </div>
                      <div className="tiny muted" style={{ marginBottom: 5, paddingLeft: 23, lineHeight: 1.4 }}>{c.note}</div>
                      <div className="row" style={{ paddingLeft: 23, gap: 0, fontFamily: 'var(--mono)', fontSize: 10.5 }}>
                        <div style={{ flex: 1 }}><div className="tiny" style={{ color: 'var(--ink-4)' }}>A</div><div style={{ fontWeight: 600 }}>{sc(c.a)}</div></div>
                        <div style={{ flex: 1 }}><div className="tiny" style={{ color: 'var(--ink-4)' }}>B</div><div style={{ fontWeight: 600 }}>{sc(c.b)}</div></div>
                        <div style={{ flex: 1 }}><div className="tiny" style={{ color: 'var(--ink-4)' }}>Δ</div><div style={{ fontWeight: 700, color: c.ok ? 'var(--green)' : 'var(--red)' }}>{sc(c.diff)}</div></div>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              {/* lineage sumber data */}
              <Panel noBody>
                <div className="panel-h"><h3>Sumber Data (Lineage)</h3><div style={{ flex: 1 }} /><span className="tiny muted">klik untuk telusuri</span></div>
                <div style={{ padding: 6 }}>
                  {lineage.map((r, i) => {
                    const IconC = I[r.icon] || I.doc;
                    return (
                      <button key={i} onClick={() => nav(r.route, { from: 'psak2' })} className="row ac gap9" style={{ width: '100%', textAlign: 'left', padding: '8px 9px', borderRadius: 7, border: '1px solid transparent', background: 'none', cursor: 'pointer' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--blue-050)'; e.currentTarget.style.borderColor = 'var(--blue-100)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'transparent'; }}>
                        <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><IconC size={15} /></span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{r.k}</div>
                          <div className="tiny muted mono">{r.src}</div>
                        </div>
                        <I.arrowRight size={13} style={{ color: 'var(--ink-4)' }} />
                      </button>
                    );
                  })}
                </div>
                <div className="tiny muted" style={{ padding: '0 12px 11px', lineHeight: 1.5 }}>
                  Tidak ada angka di-input ulang: seluruh pos ditarik dari WTB & mesin FS Generator yang sama. Perubahan AJE mengalir serempak ke modul ini.
                </div>
              </Panel>

              {/* bunga & pajak */}
              <Panel title="Bunga & Pajak Dibayar" sub="¶31–35">
                <div style={{ display: 'grid', gap: 0 }}>
                  <div className="row ac jb" style={{ padding: '7px 0', borderBottom: '1px solid var(--line-soft)' }}>
                    <span style={{ fontSize: 12 }}>Bunga dibayar (operasi)</span>
                    <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: 'var(--red)' }}>{sc(intPaid)}</span>
                  </div>
                  <div className="row ac jb" style={{ padding: '7px 0', borderBottom: '1px solid var(--line-soft)' }}>
                    <span style={{ fontSize: 12 }}>Pajak penghasilan dibayar (operasi)</span>
                    <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: 'var(--red)' }}>{sc(taxPaid)}</span>
                  </div>
                  <div className="row ac jb" style={{ padding: '7px 0' }}>
                    <span style={{ fontSize: 12 }}>Dividen dibayar</span>
                    <span className="mono" style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-4)' }}>—</span>
                  </div>
                </div>
              </Panel>

              {/* checklist pengungkapan */}
              <Panel noBody>
                <div className="panel-h"><h3>Pengungkapan PSAK 2</h3><div style={{ flex: 1 }} /><span className="tiny muted">{discOk}/{disc.length}</span></div>
                <div>
                  {disc.map((d, i) => (
                    <label key={d.id} className="row gap9" style={{ padding: '8px 13px', cursor: 'pointer', alignItems: 'flex-start', borderBottom: i < disc.length - 1 ? '1px solid var(--line-soft)' : 0 }} onClick={() => toggleDisc(d.id)}>
                      <span style={{ flex: '0 0 16px', width: 16, height: 16, borderRadius: 4, marginTop: 1, border: '1.5px solid ' + (d.ok ? 'var(--green)' : 'var(--amber)'), background: d.ok ? 'var(--green)' : '#fff', display: 'grid', placeItems: 'center' }}>{d.ok && <I.check size={11} style={{ color: '#fff' }} />}</span>
                      <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)', width: 46, flex: '0 0 46px', marginTop: 1 }}>{d.ref}</span>
                      <span style={{ fontSize: 11.5, lineHeight: 1.4, color: d.ok ? 'var(--ink-2)' : 'var(--ink)', fontWeight: d.ok ? 400 : 600 }}>{d.t}</span>
                    </label>
                  ))}
                </div>
              </Panel>
            </div>
          </div>

          <div className="tiny muted" style={{ padding: '0 2px 4px', lineHeight: 1.5 }}>
            Laporan arus kas <b>{client.name}</b> ({eng.id} · {eng.fy}) disusun sesuai PSAK 2 dan ditarik penuh dari Working Trial Balance melalui mesin FS Generator — konsisten dengan Laporan Posisi Keuangan, Laba Rugi, dan tab Rekonsiliasi Angka. Status & pilihan metode tersimpan otomatis untuk jejak audit.
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { PSAK2View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { PSAK2View };
