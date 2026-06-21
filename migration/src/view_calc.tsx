/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { AMS_CANON } from './canon';
import { useAudit, useFirm, useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Donut, Panel, Seg, Stat } from './ui.jsx';

/* ============================================================
   Asseris — Sampling Engine (SA 530) + ECL Calculator (PSAK 71)
   ============================================================ */
const { useState: useStateS, useMemo: useMemoS } = React;

/* ---------------- Sampling Engine (MUS) ---------------- */
const REL_FACTOR = { 90: 2.31, 95: 3.0, 99: 4.61 };

function SamplingEngine() {
  const { fmt } = AMS;
  const { activeEngagement } = useFirm();
  const pm = Math.round(activeEngagement.materiality * 0.75);

  const [method, setMethod] = useStateS('mus');
  const [bv] = useStateS(49_472_400_000);       // Piutang Usaha (adjusted)
  const [popN] = useStateS(1284);
  const [conf, setConf] = useStateS(95);
  const [tm, setTm] = useStateS(pm);
  const [em, setEm] = useStateS(0);
  // per-item evaluation: each sample item can be tested with an audited value
  const [evalItems, setEvalItems] = useStateS([
    { doc: 'INV-24-0912', party: 'PT Ritel Maju Bersama', book: 4_120_000_000, sig: true, audited: 4_120_000_000, tested: true },
    { doc: 'INV-24-1140', party: 'PT Distribusi Andal', book: 2_880_000_000, sig: true, audited: 2_530_000_000, tested: true },
    { doc: 'INV-24-0733', party: 'CV Sumber Rejeki', book: 1_340_000_000, sig: false, audited: 1_340_000_000, tested: false },
    { doc: 'INV-24-1455', party: 'PT Niaga Sentosa', book: 1_120_000_000, sig: false, audited: 1_120_000_000, tested: false },
    { doc: 'INV-24-0501', party: 'PT Mitra Dagang Utama', book: 980_000_000, sig: false, audited: 980_000_000, tested: false },
    { doc: 'INV-24-1622', party: 'CV Berkah Jaya', book: 760_000_000, sig: false, audited: 760_000_000, tested: false },
    { doc: 'INV-24-0288', party: 'PT Aneka Pangan', book: 540_000_000, sig: false, audited: 540_000_000, tested: false },
  ]);
  const setItem = (i, patch) => setEvalItems(list => list.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const found = evalItems.filter(it => it.tested).reduce((s, it) => s + (it.book - (+it.audited || 0)), 0);
  const testedCount = evalItems.filter(it => it.tested).length;
  const misstatedCount = evalItems.filter(it => it.tested && it.book !== (+it.audited || 0)).length;

  const rf = REL_FACTOR[conf];
  const si = Math.max(1, Math.round((tm - em * 1.6) / rf));         // sampling interval
  const n = Math.max(1, Math.ceil(bv / si));
  const basicPrecision = Math.round(rf * si);
  const projected = Math.round(found * 1.0);                         // extrapolated
  const uml = basicPrecision + projected;
  const pass = uml < tm;

  const rp = (x) => 'Rp ' + fmt(x);

  /* generated population (deterministic) representing the AR sub-ledger */
  const population = useMemoS(() => {
    const parties = ['PT Ritel Maju Bersama', 'PT Distribusi Andal', 'CV Sumber Rejeki', 'PT Niaga Sentosa', 'PT Mitra Dagang Utama', 'CV Berkah Jaya', 'PT Aneka Pangan', 'PT Karya Utama', 'PT Sentosa Retail', 'CV Maju Jaya'];
    const N = 48; // displayed population sample (represents popN)
    const raw = Array.from({ length: N }, (_, i) => { const x = Math.sin(99 + i * 7.3) * 10000; const r = x - Math.floor(x); return 0.08 + Math.pow(r, 2.2) * 4.2; });
    const sum = raw.reduce((a, b) => a + b, 0);
    let cum = 0;
    return raw.map((w, i) => {
      const amount = Math.round(bv * w / sum / 1e6) * 1e6;
      const from = cum; cum += amount;
      return { idx: i, doc: 'INV-24-' + String(1000 + i * 17 % 9000).padStart(4, '0'), party: parties[i % parties.length], amount, from, to: cum };
    });
  }, [bv]);
  const popTotal = population.reduce((s, p) => s + p.amount, 0);

  const [seedStart, setSeedStart] = useStateS(0.37);
  const [selectedIdx, setSelectedIdx] = useStateS(null);
  /* MUS systematic selection: pick the item containing each (start + k·SI) monetary unit */
  const selection = useMemoS(() => {
    if (selectedIdx == null) return null;
    return selectedIdx;
  }, [selectedIdx]);

  const runSelection = () => {
    const startUnit = seedStart * si;
    const hits = new Set();
    for (let u = startUnit; u < popTotal; u += si) {
      const item = population.find(p => u >= p.from && u < p.to);
      if (item) hits.add(item.idx);
    }
    // items ≥ SI are individually significant (always selected)
    population.forEach(p => { if (p.amount >= si) hits.add(p.idx); });
    const idxArr = Array.from(hits).sort((a: any, b: any) => a - b);
    setSelectedIdx(idxArr);
    setEvalItems(idxArr.map(i => { const p = population[i]; return { doc: p.doc, party: p.party, book: p.amount, sig: p.amount >= si, audited: p.amount, tested: false }; }));
  };

  return (
    <>
      <SubBar moduleId="sampling" right={
        <div className="row gap8 ac">
          <Badge kind="blue">SA 530</Badge>
          <Btn sm><I.download size={13} /> Export Sampel</Btn>
          <Btn sm variant="primary" onClick={runSelection}><I.flask size={14} /> Jalankan Seleksi</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad">
          {/* method tabs */}
          <div className="row jb ac" style={{ marginBottom: 12 }}>
            <Seg options={[{ value: 'mus', label: 'MUS (Nilai Moneter)' }, { value: 'random', label: 'Random' }, { value: 'attribute', label: 'Atribut' }]} value={method} onChange={setMethod} />
            <span className="tiny muted">Populasi: <b>Piutang Usaha</b> · {fmt(popN)} item · {rp(bv)}</span>
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
            {/* Inputs */}
            <Panel title="1 · Parameter Sampling" sub={method === 'mus' ? 'Monetary Unit Sampling' : method === 'random' ? 'Seleksi acak' : 'Pengujian atribut'}>
              <div style={{ padding: '2px 2px' }}>
                <div className="field" style={{ marginBottom: 14 }}>
                  <label>Tingkat Keyakinan (Confidence)</label>
                  <div className="seg" style={{ width: 'fit-content' }}>
                    {[90, 95, 99].map(c => <button key={c} className={conf === c ? 'on' : ''} onClick={() => setConf(c)}>{c}%</button>)}
                  </div>
                  <div className="tiny muted">Reliability factor R = <b className="mono">{rf}</b></div>
                </div>
                <NumRow label="Tolerable Misstatement (TM)" value={tm} onChange={setTm} step={50_000_000} hint={`Default = Performance Materiality (${rp(pm)})`} />
                <NumRow label="Expected Misstatement (EM)" value={em} onChange={setEm} step={25_000_000} hint="Estimasi salah saji yang diperkirakan" />
              </div>
            </Panel>

            {/* Outputs */}
            <Panel noBody>
              <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '16px 18px', display: 'flex', gap: 22 }}>
                <div>
                  <div className="tiny" style={{ color: '#bcd6e4', textTransform: 'uppercase', letterSpacing: '.07em' }}>Ukuran Sampel</div>
                  <div className="mono" style={{ fontSize: 34, fontWeight: 700, lineHeight: 1 }}>{n}</div>
                  <div className="tiny" style={{ color: '#9fc0d2' }}>item terpilih</div>
                </div>
                <div className="vdivider" style={{ background: 'rgba(255,255,255,.18)' }} />
                <div style={{ display: 'grid', gap: 8, alignContent: 'center' }}>
                  <Kv label="Sampling Interval" v={rp(si)} />
                  <Kv label="Basic Precision (R × SI)" v={rp(basicPrecision)} />
                  <Kv label="Coverage" v={Math.min(100, Math.round(n * si / bv * 100)) + '% nilai populasi'} />
                </div>
              </div>
              <div style={{ padding: 14 }}>
                <div className="tiny muted upper" style={{ marginBottom: 4 }}>Formula MUS</div>
                <div className="panel mono" style={{ padding: '9px 11px', background: 'var(--surface-2)', fontSize: 11.5, color: 'var(--ink-2)', lineHeight: 1.7 }}>
                  SI = (TM − EM × 1.6) ÷ R = ({fmt(tm / 1e6)}jt − {fmt(em / 1e6)}jt × 1.6) ÷ {rf}<br />
                  n = Nilai Buku ÷ SI = {fmt(bv / 1e6)}jt ÷ {fmt(si / 1e6)}jt = <b style={{ color: 'var(--blue)' }}>{n} item</b>
                </div>
              </div>
            </Panel>
          </div>

          {/* Population & systematic selection visualization */}
          <Panel title="2 · Populasi & Seleksi Sistematis (MUS)" sub={`${population.length} item ditampilkan · representasi ${fmt(popN)} item populasi`} style={{ marginTop: 12 }}>
            <div className="row jb ac" style={{ marginBottom: 10 }}>
              <div className="row ac gap8">
                <span className="tiny muted">Titik mulai acak (× SI):</span>
                <input type="range" min="0" max="0.99" step="0.01" value={seedStart} onChange={e => setSeedStart(+e.target.value)} style={{ width: 120, accentColor: 'var(--blue)' }} />
                <span className="mono tiny" style={{ fontWeight: 700 }}>{seedStart.toFixed(2)}</span>
              </div>
              <div className="tiny muted">Interval seleksi (SI) = <b className="mono">{rp(si)}</b> · {selection ? selection.length + ' item terpilih' : 'klik "Jalankan Seleksi"'}</div>
            </div>
            {/* monetary axis with interval marks + hits */}
            <div style={{ position: 'relative', height: 54, marginBottom: 10 }}>
              <div style={{ position: 'absolute', left: 0, right: 0, top: 24, height: 8, borderRadius: 4, background: 'var(--surface-3)', overflow: 'hidden', display: 'flex' }}>
                {population.map(p => {
                  const w = p.amount / popTotal * 100;
                  const isSel = selection && selection.includes(p.idx);
                  return <div key={p.idx} title={p.party + ': ' + rp(p.amount)} style={{ width: w + '%', height: '100%', background: isSel ? (p.amount >= si ? 'var(--purple)' : 'var(--blue)') : 'transparent', borderRight: '1px solid var(--surface)', opacity: isSel ? 1 : 0.25 }} />;
                })}
              </div>
              {/* interval tick marks */}
              {(() => {
                const ticks = []; const startUnit = seedStart * si;
                for (let u = startUnit, k = 0; u < popTotal && k < 80; u += si, k++) ticks.push(u);
                return ticks.map((u, i) => <div key={i} style={{ position: 'absolute', top: 18, left: (u / popTotal * 100) + '%', width: 1.5, height: 20, background: 'var(--navy)', opacity: .55 }} title={'Unit pilih ' + (i + 1)} />);
              })()}
              <div className="tiny muted" style={{ position: 'absolute', top: 38, left: 0 }}>Rp 0</div>
              <div className="tiny muted" style={{ position: 'absolute', top: 38, right: 0 }}>{rp(popTotal)}</div>
            </div>
            <div className="row gap12 tiny muted">
              <span className="row ac gap6"><span style={{ width: 10, height: 8, borderRadius: 2, background: 'var(--purple)' }} /> Individual ≥ SI (pasti terpilih)</span>
              <span className="row ac gap6"><span style={{ width: 10, height: 8, borderRadius: 2, background: 'var(--blue)' }} /> Terpilih sistematis</span>
              <span className="row ac gap6"><span style={{ width: 2, height: 12, background: 'var(--navy)' }} /> Titik pilih (kelipatan SI)</span>
            </div>
          </Panel>

          {/* Sample preview + evaluation */}
          <div className="grid" style={{ gridTemplateColumns: '1.45fr 1fr', gap: 12, marginTop: 12, alignItems: 'start' }}>
            <Panel title="3 · Pengujian Item Sampel" sub={`${testedCount}/${evalItems.length} diuji · ${misstatedCount} salah saji`}>
              <table className="dtbl">
                <thead><tr><th style={{ width: 30 }}></th><th>Dokumen</th><th className="num">Per Buku</th><th className="num" style={{ width: 130 }}>Nilai Audit</th><th className="num" style={{ width: 90 }}>Selisih</th></tr></thead>
                <tbody>
                  {evalItems.map((it, i) => {
                    const ms = it.book - (+it.audited || 0);
                    return (
                      <tr key={i} style={{ opacity: it.tested ? 1 : 0.55 }}>
                        <td><button onClick={() => setItem(i, { tested: !it.tested })} title="Tandai diuji" style={{ width: 18, height: 18, borderRadius: 4, border: '1.5px solid ' + (it.tested ? 'var(--green)' : 'var(--line-strong)'), background: it.tested ? 'var(--green)' : '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 0 }}>{it.tested && <I.check size={11} style={{ color: '#fff' }} />}</button></td>
                        <td><div style={{ fontWeight: 600 }} className="mono tiny">{it.doc}</div><div className="tiny muted truncate" style={{ maxWidth: 150 }}>{it.party} {it.sig && <span className="badge b-purple" style={{ fontSize: 8, padding: '0 4px' }}>≥SI</span>}</div></td>
                        <td className="num">{fmt(it.book / 1e6, 0)}</td>
                        <td className="num">
                          {it.tested ? <input type="number" value={it.audited} onChange={e => setItem(i, { audited: +e.target.value })} className="input mono" style={{ width: 110, height: 24, textAlign: 'right', padding: '0 6px' }} /> : <span className="muted tiny">belum diuji</span>}
                        </td>
                        <td className="num" style={{ fontWeight: 600, color: ms !== 0 && it.tested ? 'var(--red)' : 'var(--ink-3)' }}>{it.tested ? fmt(ms / 1e6, 1) : '—'}</td>
                      </tr>
                    );
                  })}
                  <tr><td colSpan={5} className="tiny muted" style={{ textAlign: 'center', padding: '7px' }}>… {Math.max(0, n - evalItems.length)} item sistematis lainnya (uji terpisah)</td></tr>
                </tbody>
                <tfoot><tr><td colSpan={4}>TOTAL SALAH SAJI SAMPEL</td><td className="num" style={{ color: 'var(--red)' }}>{fmt(found / 1e6, 1)}</td></tr></tfoot>
              </table>
              <div className="tiny muted" style={{ marginTop: 8 }}>Ubah <b>Nilai Audit</b> tiap item — proyeksi salah saji & UML di panel kanan menghitung ulang otomatis.</div>
            </Panel>

            <Panel title="4 · Evaluasi Hasil" sub="Proyeksi salah saji">
              <div className="panel" style={{ padding: '9px 11px', background: 'var(--surface-2)', borderColor: 'var(--line)', marginBottom: 10 }}>
                <RowKv label="Salah saji ditemukan (sampel)" v={rp(found)} strong />
                <div className="tiny muted" style={{ marginTop: 2 }}>dari {testedCount} item diuji · {misstatedCount} salah saji</div>
              </div>
              <div style={{ display: 'grid', gap: 7 }}>
                <RowKv label="Projected Misstatement" v={rp(projected)} />
                <RowKv label="Basic Precision" v={rp(basicPrecision)} />
                <RowKv label="Upper Misstatement Limit" v={rp(uml)} strong />
                <RowKv label="Tolerable Misstatement" v={rp(tm)} />
              </div>
              <div className="panel" style={{ marginTop: 12, padding: '10px 12px', background: pass ? 'var(--green-bg)' : 'var(--red-bg)', borderColor: 'transparent' }}>
                <div className="row ac gap8">
                  <span style={{ color: pass ? 'var(--green)' : 'var(--red)' }}>{pass ? <I.checkCircle size={16} /> : <I.alert size={16} />}</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>
                    {pass ? 'UML < TM — populasi dapat diterima tanpa penyesuaian lanjutan.' : 'UML ≥ TM — perluas sampel atau usulkan koreksi (AJE).'}
                  </span>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------------- ECL Calculator (PSAK 71) ---------------- */
function ECLCalculator() {
  const { fmt } = AMS;
  const nav = useNav();
  const audit = useAudit();
  const wtb = (audit && audit.wtb && audit.wtb.length) ? audit.wtb : ((AMS && AMS.WTB) || []);
  /* SATU sumber: matriks bucket, gross & loss-rate efektif ditarik dari AMS_CANON.psak71(wtb).
     Tidak ada lagi angka hardcode — konsisten dengan modul PSAK 71 & tab Rekonsiliasi. */
  const p71 = (AMS_CANON ? AMS_CANON.psak71(wtb) : null);
  const [buckets, setBuckets] = useStateS(() => (p71 ? p71.buckets.map(b => ({
    id: b.id, label: b.label, stage: b.stage, gross: Math.round(b.gross) * 1e6, rate: +b.rate.toFixed(1),
  })) : []));
  const booked = (p71 ? p71.ckpnBooked : 1980) * 1e6; // WTB 1-1210 (satu sumber)

  const setRate = (id, rate) => setBuckets(bs => bs.map(b => b.id === id ? { ...b, rate: Math.max(0, Math.min(100, rate)) } : b));

  const withEcl = buckets.map(b => ({ ...b, ecl: Math.round(b.gross * b.rate / 100) }));
  const totalGross = withEcl.reduce((s, b) => s + b.gross, 0);
  const totalEcl = withEcl.reduce((s, b) => s + b.ecl, 0);
  const diff = totalEcl - booked;

  const stageSum = (st) => withEcl.filter(b => b.stage === st).reduce((s, b) => s + b.ecl, 0);
  const segs = [
    { label: 'Stage 1', value: stageSum(1), color: '#1f7a4d' },
    { label: 'Stage 2', value: stageSum(2), color: '#c79a1e' },
    { label: 'Stage 3', value: stageSum(3), color: '#b3261e' },
  ];
  const stageColor = { 1: 'green', 2: 'amber', 3: 'red' };
  const rp = (x) => 'Rp ' + fmt(x);

  return (
    <>
      <SubBar moduleId="ecl" right={
        <div className="row gap8 ac">
          <Badge kind="blue">PSAK 71 · ECL</Badge>
          <Btn sm onClick={() => nav('psak71', { from: 'ecl' })}><I.coins size={13} /> Modul PSAK 71</Btn>
          <Btn sm onClick={() => nav('psak46', { from: 'ecl' })}><I.receipt size={13} /> Dampak Pajak Tangguhan</Btn>
          <Btn sm><I.download size={13} /> Kertas Kerja B-7</Btn>
          <Btn sm variant="primary"><I.ledger size={14} /> Usulkan AJE</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 12 }}>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={rp(totalGross / 1e6) + ' jt'} label="Eksposur Bruto" /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={rp(totalEcl / 1e6) + ' jt'} label="ECL per Model" accent="var(--blue)" /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={rp(booked / 1e6) + ' jt'} label="CKPN Dibukukan Klien" /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={(diff >= 0 ? '+' : '') + rp(diff / 1e6) + ' jt'} label="Selisih (Under/Over)" accent={Math.abs(diff) > 100e6 ? 'var(--red)' : 'var(--green)'} /></div></Panel>
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1.55fr 1fr', gap: 12, alignItems: 'start' }}>
            <Panel title="Matriks Provisi — Aging × Loss Rate" sub="Ubah loss rate untuk recalc otomatis">
              <table className="dtbl">
                <thead><tr>
                  <th>Bucket Umur</th><th>Stage</th><th className="num">Eksposur Bruto</th><th className="num" style={{ width: 130 }}>Loss Rate (%)</th><th className="num">ECL (Rp)</th>
                </tr></thead>
                <tbody>
                  {withEcl.map(b => (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 600 }}>{b.label}</td>
                      <td><Badge kind={stageColor[b.stage]}>Stage {b.stage}</Badge></td>
                      <td className="num">{fmt(b.gross)}</td>
                      <td className="num">
                        <input type="number" value={b.rate} step="0.5" onChange={e => setRate(b.id, +e.target.value)}
                          className="input mono" style={{ width: 80, height: 24, textAlign: 'right', padding: '0 7px' }} />
                      </td>
                      <td className="num" style={{ fontWeight: 700, color: 'var(--blue)' }}>{fmt(b.ecl)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td colSpan={2}>TOTAL</td><td className="num">{fmt(totalGross)}</td><td className="num">{(totalEcl / totalGross * 100).toFixed(1)}%</td><td className="num">{fmt(totalEcl)}</td></tr>
                </tfoot>
              </table>
            </Panel>

            <div className="grid" style={{ gap: 12 }}>
              <Panel title="Komposisi ECL per Stage">
                <div className="row gap12 ac">
                  <Donut segments={segs} size={104} thickness={15}
                    center={<><div className="mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{fmt(totalEcl / 1e6)}jt</div><div className="tiny muted">total</div></>} />
                  <div style={{ flex: 1 }}>
                    {segs.map(s => (
                      <div key={s.label} className="row jb ac" style={{ padding: '4px 0' }}>
                        <span className="row ac gap6"><span style={{ width: 9, height: 9, borderRadius: 2, background: s.color }} /><span style={{ fontSize: 12 }}>{s.label}</span></span>
                        <span className="mono" style={{ fontWeight: 700 }}>{fmt(s.value / 1e6)}jt</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>

              <Panel title="Kesimpulan Audit">
                <div className="panel" style={{ padding: '11px 12px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
                  <div className="row gap8">
                    <span style={{ color: 'var(--amber)' }}><I.alert size={16} /></span>
                    <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                      CKPN klien <b>{rp(booked)}</b> lebih rendah <b>{rp(Math.abs(diff))}</b> dari model ECL. Diusulkan
                      <b> AJE-02</b> untuk menambah cadangan sesuai PSAK 71.
                    </div>
                  </div>
                </div>
                <div className="row gap8" style={{ marginTop: 12 }}>
                  <Btn sm variant="primary" style={{ flex: 1 }} onClick={() => nav('aje')}><I.ledger size={14} /> Buat AJE-02</Btn>
                  <Btn sm style={{ flex: 1 }}><I.sparkle size={14} /> Telaah AI</Btn>
                </div>
                <div onClick={() => nav('psak46', { from: 'ecl' })} className="row ac jb" style={{ marginTop: 10, padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', borderLeft: '3px solid var(--green)', background: 'var(--surface)', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 600 }}>Dampak pajak tangguhan (PSAK 46)</div>
                    <div className="tiny muted">CKPN Rp {fmt(AMS_CANON.FIG.ckpn)} jt × 22% — belum deductible fiskal</div>
                  </div>
                  <span className="mono" style={{ fontWeight: 700, color: 'var(--green)', whiteSpace: 'nowrap' }}>DTA Rp {fmt(Math.round(AMS_CANON.FIG.ckpn * AMS_CANON.RATE))} jt <I.arrowRight size={12} /></span>
                </div>
              </Panel>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---- helpers ---- */
function NumRow({ label, value, onChange, step, hint }: any) {
  const { fmt } = AMS;
  return (
    <div className="field" style={{ marginBottom: 13 }}>
      <label>{label}</label>
      <div className="row ac gap8">
        <input type="number" value={value} step={step} onChange={e => onChange(Math.max(0, +e.target.value))}
          className="input mono" style={{ flex: 1, textAlign: 'right' }} />
        <button className="btn sm icon" onClick={() => onChange(value + step)}><I.plus size={13} /></button>
      </div>
      <div className="tiny muted mono">Rp {fmt(value)}{hint ? '' : ''}</div>
      {hint && <div className="tiny muted">{hint}</div>}
    </div>
  );
}
function Kv({ label, v }: any) { return <div><div className="tiny" style={{ color: '#9fc0d2' }}>{label}</div><div className="mono" style={{ fontWeight: 700, fontSize: 13 }}>{v}</div></div>; }
function RowKv({ label, v, strong }: any) {
  return <div className="row jb ac"><span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{label}</span><span className="mono" style={{ fontWeight: strong ? 700 : 600, fontSize: strong ? 14 : 12.5, color: strong ? 'var(--navy)' : 'inherit' }}>{v}</span></div>;
}

Object.assign(window, { SamplingEngine, ECLCalculator, Kv, RowKv });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { ECLCalculator, Kv, RowKv, SamplingEngine };
