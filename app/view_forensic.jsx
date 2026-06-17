/* ============================================================
   NeoSuite AMS — Forensic Cash Flow (analitik anomali kas)
   ------------------------------------------------------------
   DITARIK PENUH dari satu sumber kebenaran:
     · Working Trial Balance (useAudit().wtb) — saldo akun
     · FSGEN.buildModel(wtb) — mesin derivasi LK yang sama dipakai
       FS Generator & PSAK 2 → waterfall & jembatan arus kas konsisten
     · AMS_FORENSIC — populasi jurnal kanonik yang SAMA dipakai JET
     · RP_TXN / RP_PARTIES (SA 550 · PSAK 7) — eksposur pihak berelasi
   Tidak ada angka arus kas yang di-hardcode. Satu perubahan AJE
   mengalir serempak ke FS Generator, PSAK 2, dan modul ini.
   ============================================================ */
const { useState: useStateFC, useMemo: useMemoFC } = React;

function FCStat({ value, unit, label, sub, accent }) {
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

const FC_ACT = { O: { label: 'Operasi', kind: 'blue' }, I: { label: 'Investasi', kind: 'purple' }, F: { label: 'Pendanaan', kind: 'amber' } };

function ForensicCashFlow() {
  const { fmt } = window.AMS;
  const nav = useNav();
  const audit = (typeof useAudit === 'function') ? useAudit() : {};
  const firm = (typeof useFirm === 'function') ? useFirm() : {};

  const wtb = (audit && audit.wtb && audit.wtb.length) ? audit.wtb : ((window.AMS && window.AMS.WTB) || []);
  const model = useMemoFC(() => (window.FSGEN ? window.FSGEN.buildModel(wtb) : null), [wtb]);
  const B = useMemoFC(() => (window.AMS_FORENSIC ? window.AMS_FORENSIC.buildCash(model, wtb) : null), [model, wtb]);

  const [unit, setUnit] = window.useAmsPersist('forensic.unit', 'M');
  const [onlyRisk, setOnlyRisk] = useStateFC(false);
  const [sel, setSel] = useStateFC('JV-24-09001');

  if (!model || !B) {
    return <><SubBar moduleId="forensic" /><div className="view-pad"><Panel title="Forensic Cash Flow"><div className="tiny muted">Mesin FS Generator belum dimuat.</div></Panel></div></>;
  }

  const U = unit === 'M' ? { div: 1e9, dp: 1, s: 'M' } : { div: 1e6, dp: 0, s: 'jt' };
  const sc = (v) => { const x = v / U.div; const a = fmt(Math.abs(x), U.dp); return x < 0 ? '(' + a + ')' : a; };
  const cf = B.cf;

  const rows = (onlyRisk ? B.flagged : B.cashPop.slice().sort((a, b) => b.fscore - a.fscore || b.amount - a.amount));
  const selTx = B.cashPop.find(f => f.id === sel) || rows[0];

  const rpTxn = window.RP_TXN || [];
  const rpById = {}; (window.RP_PARTIES || []).forEach(p => { rpById[p.id] = p; });
  const rpExposed = rpTxn.filter(t => !t.arm || !t.disclosed);
  const rpTotal = rpTxn.reduce((s, t) => s + t.amount, 0);

  /* waterfall geometry — stage cumulatif dari model.cf */
  let cum = 0;
  const bars = B.waterfall.map(w => {
    if (w.type === 'base' || w.type === 'total') { const b = { ...w, start: 0, end: w.value }; cum = w.value; return b; }
    const start = cum; cum += w.value; return { ...w, start: Math.min(start, cum), end: Math.max(start, cum) };
  });
  const maxBar = Math.max(...bars.map(b => Math.max(b.end, Math.abs(b.value)))) * 1.08;
  const H = 150;
  const maxFlow = Math.max(B.totalIn, B.totalOut);

  /* tie-out lintas-laporan */
  const pyc = (c) => (B.by[c] ? B.by[c].ly : 0);
  const T = 1e6;
  const tieRows = [
    { id: 't1', label: 'Saldo akhir menutup ke kas neraca', std: 'PSAK 2 ¶45', a: cf.cashClose, b: cf.cashBS, note: 'Kas awal + Σ aktivitas = Kas & setara kas (WTB 1-1100).' },
    { id: 't2', label: 'Jembatan kas bruto = kenaikan kas neto', std: '¶18', a: B.bridgeNet, b: cf.netChange, note: 'Total arus masuk − arus keluar = perubahan kas neto.' },
    { id: 't3', label: 'CFO metode langsung = tidak langsung', std: '¶18–20', a: B.cfoDirect, b: cf.cfoTotal, note: 'Rekonstruksi arus kas operasi tie ke FS Generator.' },
    { id: 't4', label: 'Kas awal = komparatif audited WTB', std: '¶45', a: cf.cashOpen, b: pyc('1-1100'), note: 'Saldo kas awal = kolom prior-year WTB.' },
  ].map(r => ({ ...r, diff: r.a - r.b, ok: Math.abs(r.a - r.b) < T }));
  const tiePass = tieRows.filter(r => r.ok).length;

  const lineage = [
    { k: 'Kas & setara kas', src: 'WTB · 1-1100', route: 'wtb', icon: 'ledger' },
    { k: 'Waterfall & arus kas', src: 'FS Generator · model.cf', route: 'fsgen', icon: 'report' },
    { k: 'Laporan Arus Kas (PSAK 2)', src: 'Kertas kerja arus kas', route: 'psak2', icon: 'water' },
    { k: 'Populasi jurnal anomali', src: 'Journal Entry Testing · SA 240', route: 'jet', icon: 'flask' },
    { k: 'Pihak berelasi (RPT)', src: 'SA 550 · PSAK 7', route: 'related', icon: 'group' },
    { k: 'Tekanan likuiditas', src: 'Going Concern · SA 570', route: 'goingconcern', icon: 'pulse' },
  ];

  const anomalyPctOut = B.totalOut ? (B.anomalyOut / B.totalOut * 100) : 0;

  return (
    <>
      <SubBar moduleId="forensic" right={
        <div className="row gap8 ac">
          <Badge kind="blue">Forensic Analytics</Badge>
          <div className="seg" style={{ width: 'fit-content' }}>
            <button className={unit === 'M' ? 'on' : ''} onClick={() => setUnit('M')}>Miliar</button>
            <button className={unit === 'jt' ? 'on' : ''} onClick={() => setUnit('jt')}>Jutaan</button>
          </div>
          <Btn sm onClick={() => nav('psak2', { from: 'forensic' })}><I.water size={13} /> Laporan Arus Kas</Btn>
          <Btn sm variant="primary"><I.search2 size={14} /> Pindai Anomali</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>

          {/* ringkasan */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            <FCStat value={fmt(B.totalIn / 1e9, 1)} unit="M" label="Total Arus Masuk" sub="metode langsung (bruto)" accent="var(--green)" />
            <FCStat value={fmt(B.totalOut / 1e9, 1)} unit="M" label="Total Arus Keluar" sub="metode langsung (bruto)" accent="var(--red)" />
            <FCStat value={(cf.netChange >= 0 ? '+' : '') + fmt(cf.netChange / 1e9, 1)} unit="M" label={cf.netChange >= 0 ? 'Kenaikan Kas Neto' : 'Penurunan Kas Neto'} sub="= Σ O + I + P" accent={cf.netChange >= 0 ? 'var(--navy)' : 'var(--red)'} />
            <FCStat value={B.flagged.length} label="Anomali Kas Terdeteksi" sub={fmt(B.anomalyOut / 1e9, 1) + ' M · ' + anomalyPctOut.toFixed(1) + '% arus keluar'} accent="var(--amber)" />
            <FCStat value={tiePass + '/' + tieRows.length} label="Tie-out Lintas-Laporan" sub={tiePass === tieRows.length ? 'seluruh rekonsiliasi menutup' : 'perlu ditelusuri'} accent={tiePass === tieRows.length ? 'var(--green)' : 'var(--amber)'} />
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1fr 336px', gap: 12, alignItems: 'start' }}>
            {/* ============ LEFT ============ */}
            <div className="grid" style={{ gap: 12 }}>

              {/* waterfall */}
              <Panel noBody>
                <div className="panel-h"><h3>Waterfall Arus Kas FY2025</h3><span className="sub mono">dalam {U.s} Rupiah</span><div style={{ flex: 1 }} /><span className="tiny muted">ditarik dari FS Generator · model.cf</span></div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, height: H + 50, padding: '14px 18px 0' }}>
                  {bars.map((b, i) => {
                    const barH = Math.abs(b.end - b.start) / maxBar * H;
                    const bottom = b.start / maxBar * H;
                    const color = b.type === 'base' ? '#024661' : b.type === 'total' ? '#005085' : b.type === 'in' ? '#1f7a4d' : '#b3261e';
                    return (
                      <div key={i} style={{ flex: 1, position: 'relative', height: H + 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <span className="mono tiny" style={{ position: 'absolute', bottom: (bottom + barH) + 22, fontWeight: 700, color, whiteSpace: 'nowrap' }}>{sc(b.value)}</span>
                        <div style={{ width: '70%', height: Math.max(3, barH), background: color, borderRadius: 3, marginBottom: bottom + 22, opacity: b.type === 'base' || b.type === 'total' ? 1 : 0.82 }} />
                        <span className="tiny" style={{ position: 'absolute', bottom: 0, fontWeight: 600, color: 'var(--ink-2)' }}>{b.label}</span>
                      </div>
                    );
                  })}
                </div>
              </Panel>

              {/* komposisi arus bruto */}
              <Panel noBody>
                <div className="panel-h"><h3>Komposisi Arus Kas Bruto</h3><span className="sub mono">metode langsung · {U.s}</span><div style={{ flex: 1 }} /><span className="tiny muted">tie ke kenaikan kas neto</span></div>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                  <div style={{ padding: '12px 14px', borderRight: '1px solid var(--line-soft)' }}>
                    <div className="row jb ac" style={{ marginBottom: 8 }}><span className="tiny muted upper">Arus Masuk</span><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--green)' }}>{sc(B.totalIn)}</span></div>
                    {B.inflows.map((f, i) => (
                      <div key={i} style={{ marginBottom: 9 }}>
                        <div className="row jb tiny" style={{ marginBottom: 3 }}><span className="row ac gap6" style={{ minWidth: 0 }}><Badge kind={FC_ACT[f.act].kind}>{f.act}</Badge><span className="truncate">{f.label}</span></span><span className="mono" style={{ fontWeight: 600 }}>{sc(f.v)}</span></div>
                        <div style={{ height: 8, borderRadius: 4, background: 'var(--surface-3)' }}><div style={{ width: (f.v / maxFlow * 100) + '%', height: '100%', borderRadius: 4, background: 'var(--green)' }} /></div>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '12px 14px' }}>
                    <div className="row jb ac" style={{ marginBottom: 8 }}><span className="tiny muted upper">Arus Keluar</span><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--red)' }}>{sc(B.totalOut)}</span></div>
                    {B.outflows.map((f, i) => (
                      <div key={i} style={{ marginBottom: 9 }}>
                        <div className="row jb tiny" style={{ marginBottom: 3 }}><span className="row ac gap6" style={{ minWidth: 0 }}><Badge kind={FC_ACT[f.act].kind}>{f.act}</Badge><span className="truncate">{f.label}</span></span><span className="mono" style={{ fontWeight: 600 }}>{sc(f.v)}</span></div>
                        <div style={{ height: 8, borderRadius: 4, background: 'var(--surface-3)' }}><div style={{ width: (f.v / maxFlow * 100) + '%', height: '100%', borderRadius: 4, background: 'var(--red)' }} /></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="tiny muted" style={{ padding: '9px 14px', lineHeight: 1.5, borderTop: '1px solid var(--line-soft)' }}>
                  Arus bruto direkonstruksi dari mutasi WTB (metode langsung, PSAK 2 ¶18). Arus masuk − keluar = <b style={{ color: 'var(--navy)' }}>{sc(B.bridgeNet)} {U.s}</b> = kenaikan kas neto laporan arus kas.
                </div>
              </Panel>

              {/* tabel anomali */}
              <Panel noBody>
                <div className="panel-h"><h3>Transaksi Kas Anomali</h3>
                  <div style={{ flex: 1 }} />
                  <label className="row ac gap6 tiny muted" style={{ cursor: 'pointer' }} onClick={() => setOnlyRisk(o => !o)}>
                    <span style={{ width: 30, height: 17, borderRadius: 9, background: onlyRisk ? 'var(--blue)' : 'var(--line-strong)', position: 'relative', transition: '.15s' }}>
                      <span style={{ position: 'absolute', top: 2, left: onlyRisk ? 15 : 2, width: 13, height: 13, borderRadius: '50%', background: '#fff', transition: '.15s' }} />
                    </span>
                    Hanya berisiko
                  </label>
                  <span className="tiny muted" style={{ marginLeft: 10 }}>{B.flagged.length} dari {B.cashPop.length} mutasi kas</span>
                </div>
                <table className="dtbl">
                  <thead><tr><th>No. Jurnal</th><th>Transaksi</th><th style={{ width: 64 }}>Arah</th><th className="num">Nilai (Rp)</th><th className="num" style={{ width: 50 }}>Skor</th></tr></thead>
                  <tbody>
                    {rows.map(f => (
                      <tr key={f.id} className={f.id === selTx.id ? 'sel' : ''} onClick={() => setSel(f.id)} style={{ cursor: 'pointer' }}>
                        <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{f.id}</td>
                        <td style={{ maxWidth: 230, whiteSpace: 'normal', lineHeight: 1.3, fontSize: 11.5 }}>
                          <span className="row ac gap6">{f.party}{f.rpId && <span title="Pihak berelasi" style={{ color: 'var(--red)', display: 'inline-flex' }}><I.group size={11} /></span>}</span>
                        </td>
                        <td><Badge kind={f.dir === 'in' ? 'green' : 'gray'}>{f.dir === 'in' ? 'Masuk' : 'Keluar'}</Badge></td>
                        <td className="num">{fmt(f.amount / 1e6, 0)} jt</td>
                        <td className="num"><span style={{ display: 'inline-grid', placeItems: 'center', width: 22, height: 22, borderRadius: 5, fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 11, color: '#fff', background: f.fscore >= 4 ? 'var(--red)' : f.fscore >= 2 ? 'var(--amber)' : f.fscore >= 1 ? '#c79a1e' : 'var(--green)' }}>{f.fscore}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>

              {/* detail anomali */}
              {selTx && (
                <Panel noBody>
                  <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }} className="row ac gap8">
                    <span className="mono" style={{ fontWeight: 700, color: 'var(--blue)' }}>{selTx.id}</span>
                    <span className="tiny muted mono">{selTx.date} · {selTx.time} · {selTx.user}</span>
                    <div style={{ flex: 1 }} />
                    <span className="badge" style={{ background: selTx.fscore >= 4 ? 'var(--red)' : selTx.fscore >= 1 ? 'var(--amber)' : 'var(--green)', color: '#fff' }}>Skor forensik {selTx.fscore}</span>
                  </div>
                  <div style={{ padding: 14 }}>
                    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <div className="tiny muted upper" style={{ marginBottom: 6 }}>Entri Jurnal</div>
                        <table className="dtbl" style={{ border: '1px solid var(--line)' }}>
                          <thead><tr><th>Akun</th><th className="num">Debit</th><th className="num">Kredit</th></tr></thead>
                          <tbody>
                            <tr><td>{selTx.dr}</td><td className="num">{fmt(selTx.amount)}</td><td className="num muted">—</td></tr>
                            <tr><td>{selTx.cr}</td><td className="num muted">—</td><td className="num">{fmt(selTx.amount)}</td></tr>
                          </tbody>
                        </table>
                        <div className="tiny muted" style={{ marginTop: 10, lineHeight: 1.5 }}>{selTx.note}</div>
                      </div>
                      <div>
                        <div className="tiny muted upper" style={{ marginBottom: 6 }}>Indikator Forensik</div>
                        <div className="row wrap gap6" style={{ marginBottom: 12 }}>
                          {selTx.forensic.length ? selTx.forensic.map(fl => <span key={fl} className="badge b-red" style={{ textTransform: 'none', letterSpacing: 0 }}><I.flag size={11} /> {fl}</span>) : <span className="tiny muted">Tidak ada indikator — pola normal.</span>}
                        </div>
                        {selTx.rpId && rpById[selTx.rpId] && (
                          <div className="panel" style={{ padding: '8px 10px', marginBottom: 12, background: 'var(--surface-2)', borderColor: 'var(--line)' }}>
                            <div className="tiny muted upper" style={{ marginBottom: 3 }}>Pihak Berelasi · PSAK 7</div>
                            <div style={{ fontSize: 12, fontWeight: 600 }}>{rpById[selTx.rpId].name}</div>
                            <div className="tiny muted">{rpById[selTx.rpId].rel} · {rpById[selTx.rpId].nature}</div>
                          </div>
                        )}
                        <div className="row wrap gap8">
                          <Btn sm variant="primary"><I.flask size={14} /> Investigasi Lanjutan</Btn>
                          <Btn sm onClick={() => nav('jet', { from: 'forensic' })}><I.flask size={13} /> Buka di JET</Btn>
                          {selTx.rpId && <Btn sm onClick={() => nav('related', { from: 'forensic' })}><I.group size={13} /> Pihak Berelasi</Btn>}
                        </div>
                      </div>
                    </div>
                  </div>
                </Panel>
              )}
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

              {/* eksposur pihak berelasi */}
              <Panel noBody>
                <div className="panel-h"><h3>Eksposur Pihak Berelasi</h3><span className="sub mono">SA 550 · PSAK 7</span></div>
                <div style={{ padding: '10px 13px', borderBottom: '1px solid var(--line-soft)' }} className="row jb ac">
                  <FCStat value={'Rp ' + fmt(rpTotal / 1e9, 1)} unit="M" label="Nilai transaksi RPT" />
                  <div style={{ textAlign: 'right' }}><div className="mono" style={{ fontSize: 19, fontWeight: 700, color: 'var(--amber)' }}>{rpExposed.length}</div><div className="tiny muted">non-arm's / belum diungkap</div></div>
                </div>
                <div>
                  {rpExposed.map((t, i) => (
                    <button key={t.id} onClick={() => nav('related', { from: 'forensic' })} className="row ac gap8" style={{ width: '100%', textAlign: 'left', padding: '8px 13px', background: 'none', border: 0, borderBottom: i < rpExposed.length - 1 ? '1px solid var(--line-soft)' : 0, cursor: 'pointer' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600 }} className="truncate">{t.party}</div>
                        <div className="tiny muted">{t.type} · {t.terms}</div>
                      </div>
                      <span className="mono tiny" style={{ fontWeight: 700 }}>{fmt(t.amount / 1e6, 0)} jt</span>
                      {!t.disclosed && <Badge kind="red">Belum diungkap</Badge>}
                    </button>
                  ))}
                </div>
                <div className="tiny muted" style={{ padding: '9px 13px', lineHeight: 1.5 }}>
                  Mutasi kas ke pihak berelasi (mis. <b className="mono">CV Mitra Keluarga</b>) ditandai pada tabel anomali dan ditautkan ke registri RPT yang sama.
                </div>
              </Panel>

              {/* lineage */}
              <Panel noBody>
                <div className="panel-h"><h3>Sumber Data (Lineage)</h3><div style={{ flex: 1 }} /><span className="tiny muted">klik untuk telusuri</span></div>
                <div style={{ padding: 6 }}>
                  {lineage.map((r, i) => {
                    const IconC = I[r.icon] || I.doc;
                    return (
                      <button key={i} onClick={() => nav(r.route, { from: 'forensic' })} className="row ac gap9" style={{ width: '100%', textAlign: 'left', padding: '8px 9px', borderRadius: 7, border: '1px solid transparent', background: 'none', cursor: 'pointer' }}
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
                  Populasi jurnal yang sama dipakai Journal Entry Testing; arus kas memakai mesin FS Generator yang sama. Perubahan AJE mengalir serempak.
                </div>
              </Panel>
            </div>
          </div>

          <div className="tiny muted" style={{ padding: '0 2px 4px', lineHeight: 1.5 }}>
            Analitik forensik arus kas <b>{(firm.activeClient && firm.activeClient.name) || 'PT Sentosa Makmur Tbk'}</b> ditarik penuh dari Working Trial Balance melalui mesin FS Generator — konsisten dengan Laporan Arus Kas (PSAK 2), FS Generator, dan populasi jurnal Journal Entry Testing (SA 240). Tidak ada angka yang di-input ulang.
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { ForensicCashFlow });
