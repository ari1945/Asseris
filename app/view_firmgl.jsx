/* ============================================================
   NeoSuite AMS — Firm General Ledger + AP/AR (Package F)
   ============================================================ */
const { useState: useStateF1, useMemo: useMemoF1 } = React;

/* ---------------- Firm General Ledger ---------------- */
function FirmGL() {
  const { fmt } = window.AMS;
  const coa = window.AMS.FIRM_COA;
  const [gl, setGl] = useAmsPersist('firmgl', () => window.AMS.FIRM_GL);
  const [tab, setTab] = useStateF1('journal');
  const [form, setForm] = useStateF1(false);
  const [ledAcct, setLedAcct] = useStateF1('1-100');
  const [stmt, setStmt] = useStateF1('pl');

  const acctName = (c) => (coa.find(a => a.code === c) || {}).name || c;
  const posted = gl.filter(j => j.posted);
  const unposted = gl.filter(j => !j.posted).length;

  // trial balance by type
  const tbByType = useMemoF1(() => {
    const groups = {};
    coa.forEach(a => { if (!groups[a.type]) groups[a.type] = []; groups[a.type].push(a); });
    return groups;
  }, [coa]);
  const totalDr = coa.filter(a => a.bal > 0).reduce((s, a) => s + a.bal, 0);
  const totalCr = -coa.filter(a => a.bal < 0).reduce((s, a) => s + a.bal, 0);
  const balanced = Math.abs(totalDr - totalCr) < 1e6;

  // ---- account ledger (running balance) derived from posted journals ----
  const ledger = useMemoF1(() => {
    const acct = coa.find(a => a.code === ledAcct) || coa[0];
    const posts = posted.filter(j => j.dr === acct.code || j.cr === acct.code)
      .slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    let movement = 0;
    const lines = posts.map(j => {
      const dr = j.dr === acct.code ? j.amount : 0;
      const cr = j.cr === acct.code ? j.amount : 0;
      movement += dr - cr;
      return { ...j, dr2: dr, cr2: cr };
    });
    const closing = acct.bal;
    const opening = closing - movement;
    let run = opening;
    const rows = lines.map(l => { run += l.dr2 - l.cr2; return { ...l, running: run }; });
    return { acct, opening, closing, rows, totalDr: lines.reduce((s, l) => s + l.dr2, 0), totalCr: lines.reduce((s, l) => s + l.cr2, 0) };
  }, [ledAcct, gl]);
  const drCr = (v) => (v >= 0 ? fmt(Math.abs(v) / 1e6, 0) + ' D' : fmt(Math.abs(v) / 1e6, 0) + ' K');

  // ---- financial statements from COA ----
  const byType = (t) => coa.filter(a => a.type === t);
  const sumType = (t) => byType(t).reduce((s, a) => s + a.bal, 0);
  const revenue = -sumType('Pendapatan'), expense = sumType('Beban');
  const netProfit = revenue - expense;
  const totAset = sumType('Aset');
  const totLiab = -sumType('Liabilitas');
  const totEkuitas = -sumType('Ekuitas') + netProfit;

  const togglePost = (id) => setGl(list => list.map(j => j.id === id ? { ...j, posted: !j.posted } : j));
  const addJV = (entry) => setGl(list => [{ id: 'JV-0' + (313 + list.length), posted: true, date: '2026-03-09', ...entry }, ...list]);

  const tabs = [
    { id: 'journal', label: 'Jurnal Umum', count: gl.length },
    { id: 'ledger', label: 'Buku Besar' },
    { id: 'tb', label: 'Neraca Saldo' },
    { id: 'statements', label: 'Laporan Keuangan' },
    { id: 'coa', label: 'Bagan Akun', count: coa.length },
  ];

  return (
    <>
      <SubBar moduleId="firmgl" right={
        <div className="row gap8 ac">
          <span className="tiny mono" style={{ color: balanced ? 'var(--green)' : 'var(--red)' }}>● {balanced ? 'Balanced' : 'Out of balance'}</span>
          <Btn sm variant="primary" onClick={() => setForm(true)}><I.plus size={14} /> Jurnal Baru</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(totalDr / 1e9, 1) + ' M'} label="Total Debit" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(totalCr / 1e9, 1) + ' M'} label="Total Kredit" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={gl.length} label="Jurnal (bulan ini)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={unposted} label="Belum Diposting" accent={unposted ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
        </div>

        <Panel noBody>
          <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

          {tab === 'journal' && (
            <table className="dtbl">
              <thead><tr><th>No. Voucher</th><th>Tanggal</th><th>Keterangan</th><th>Debit</th><th>Kredit</th><th className="num">Jumlah</th><th>Status</th></tr></thead>
              <tbody>
                {gl.map(j => (
                  <tr key={j.id}>
                    <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{j.id}</td>
                    <td className="mono tiny muted">{new Date(j.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</td>
                    <td className="truncate" style={{ maxWidth: 240 }}>{j.desc}</td>
                    <td className="tiny mono muted">{j.dr} {acctName(j.dr).slice(0, 18)}</td>
                    <td className="tiny mono muted">{j.cr} {acctName(j.cr).slice(0, 18)}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{fmt(j.amount / 1e6, 0)} jt</td>
                    <td><span onClick={() => togglePost(j.id)} style={{ cursor: 'pointer' }}><Badge kind={j.posted ? 'green' : 'amber'}>{j.posted ? 'Posted' : 'Draft'}</Badge></span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'ledger' && (
            <div className="grid" style={{ gridTemplateColumns: '230px 1fr', gap: 0, alignItems: 'stretch' }}>
              <div style={{ borderRight: '1px solid var(--line)', padding: '8px 0', maxHeight: 460, overflow: 'auto' }}>
                {coa.map(a => (
                  <div key={a.code} onClick={() => setLedAcct(a.code)} className="row ac jb" style={{ padding: '7px 12px', cursor: 'pointer', background: a.code === ledAcct ? 'var(--blue-050)' : 'transparent', borderLeft: '3px solid ' + (a.code === ledAcct ? 'var(--blue)' : 'transparent') }}>
                    <div style={{ minWidth: 0 }}><div className="mono tiny muted">{a.code}</div><div className="truncate" style={{ fontSize: 12, fontWeight: a.code === ledAcct ? 700 : 500 }}>{a.name}</div></div>
                    <span className="mono tiny" style={{ color: a.bal < 0 ? 'var(--red)' : 'var(--ink-3)' }}>{fmt(Math.abs(a.bal) / 1e6, 0)}</span>
                  </div>
                ))}
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="panel-h" style={{ borderBottom: '1px solid var(--line)' }}>
                  <div><h3 style={{ margin: 0 }}>{ledger.acct.code} · {ledger.acct.name}</h3><span className="tiny muted">{ledger.acct.type} · saldo normal {ledger.acct.bal >= 0 ? 'Debit' : 'Kredit'}</span></div>
                  <div style={{ flex: 1 }} />
                  <div style={{ textAlign: 'right' }}><div className="tiny muted">Saldo akhir</div><div className="mono" style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)' }}>Rp {fmt(Math.abs(ledger.closing) / 1e6, 0)} jt {ledger.closing >= 0 ? 'D' : 'K'}</div></div>
                </div>
                <table className="dtbl">
                  <thead><tr><th>Tanggal</th><th>No. & Keterangan</th><th>Lawan Akun</th><th className="num">Debit</th><th className="num">Kredit</th><th className="num">Saldo Berjalan</th></tr></thead>
                  <tbody>
                    <tr style={{ background: 'var(--surface-2)' }}><td colSpan={5} style={{ fontWeight: 600, fontStyle: 'italic' }}>Saldo Awal Periode</td><td className="num mono" style={{ fontWeight: 700 }}>{drCr(ledger.opening)}</td></tr>
                    {ledger.rows.map(r => (
                      <tr key={r.id}>
                        <td className="mono tiny muted">{new Date(r.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</td>
                        <td><div className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.id}</div><div className="tiny truncate" style={{ maxWidth: 220 }}>{r.desc}</div></td>
                        <td className="tiny mono muted">{r.dr2 ? r.cr : r.dr} {acctName(r.dr2 ? r.cr : r.dr).slice(0, 14)}</td>
                        <td className="num">{r.dr2 ? fmt(r.dr2 / 1e6, 0) : '—'}</td>
                        <td className="num">{r.cr2 ? fmt(r.cr2 / 1e6, 0) : '—'}</td>
                        <td className="num mono" style={{ fontWeight: 600 }}>{drCr(r.running)}</td>
                      </tr>
                    ))}
                    {!ledger.rows.length && <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 18 }}>Tidak ada mutasi terposting pada periode ini.</td></tr>}
                  </tbody>
                  <tfoot><tr><td colSpan={3}>MUTASI PERIODE · Rp jt</td><td className="num">{fmt(ledger.totalDr / 1e6, 0)}</td><td className="num">{fmt(ledger.totalCr / 1e6, 0)}</td><td className="num">{drCr(ledger.closing)}</td></tr></tfoot>
                </table>
              </div>
            </div>
          )}

          {tab === 'tb' && (
            <table className="dtbl">
              <thead><tr><th>Kode</th><th>Nama Akun</th><th>Tipe</th><th className="num">Debit</th><th className="num">Kredit</th></tr></thead>
              <tbody>
                {coa.map(a => (
                  <tr key={a.code} onClick={() => { setLedAcct(a.code); setTab('ledger'); }} style={{ cursor: 'pointer' }}>
                    <td className="mono tiny muted">{a.code}</td>
                    <td style={{ fontWeight: 600 }}>{a.name}</td>
                    <td><span className="badge b-gray">{a.type}</span></td>
                    <td className="num">{a.bal > 0 ? fmt(a.bal / 1e6, 0) : '—'}</td>
                    <td className="num">{a.bal < 0 ? fmt(-a.bal / 1e6, 0) : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={3}>TOTAL {balanced ? '· seimbang ✓' : ''}</td><td className="num">{fmt(totalDr / 1e6, 0)}</td><td className="num">{fmt(totalCr / 1e6, 0)}</td></tr></tfoot>
            </table>
          )}

          {tab === 'statements' && (
            <div style={{ padding: 14 }}>
              <div className="row gap8 ac" style={{ marginBottom: 12 }}><Seg options={[{ value: 'pl', label: 'Laba Rugi' }, { value: 'bs', label: 'Neraca' }]} value={stmt} onChange={setStmt} /><span className="tiny muted">FY2025 · dihasilkan dari neraca saldo · Rp jt</span></div>
              {stmt === 'pl' ? (
                <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr', gap: 14, alignItems: 'start' }}>
                  <Panel title="Laporan Laba Rugi" sub="FY2025">
                    <table className="dtbl">
                      <tbody>
                        <tr style={{ fontWeight: 700, background: 'var(--surface-2)' }}><td style={{ padding: '7px 9px' }}>Pendapatan Jasa</td><td className="num" style={{ padding: '7px 9px' }}>{fmt(revenue / 1e6, 0)}</td></tr>
                        <tr className="group-row"><td colSpan={2}>Beban Usaha</td></tr>
                        {byType('Beban').map(a => (
                          <tr key={a.code}><td style={{ padding: '7px 9px', paddingLeft: 20 }}>{a.name}</td><td className="num" style={{ padding: '7px 9px', color: 'var(--red)' }}>({fmt(a.bal / 1e6, 0)})</td></tr>
                        ))}
                        <tr style={{ fontWeight: 600 }}><td style={{ padding: '7px 9px' }}>Total Beban Usaha</td><td className="num" style={{ padding: '7px 9px', color: 'var(--red)' }}>({fmt(expense / 1e6, 0)})</td></tr>
                        <tr style={{ fontWeight: 800, background: 'var(--green-bg)' }}><td style={{ padding: '9px' }}>LABA OPERASI</td><td className="num" style={{ padding: '9px', color: 'var(--green)' }}>{fmt(netProfit / 1e6, 0)}</td></tr>
                      </tbody>
                    </table>
                  </Panel>
                  <div style={{ display: 'grid', gap: 12 }}>
                    <KvBox label="Margin Operasi" v={(netProfit / revenue * 100).toFixed(1) + '%'} accent="var(--green)" />
                    <KvBox label="Cost-to-Income Ratio" v={(expense / revenue * 100).toFixed(1) + '%'} />
                    <Panel title="Komposisi Beban">
                      {byType('Beban').map(a => (
                        <div key={a.code} style={{ marginBottom: 9 }}>
                          <div className="row jb tiny" style={{ marginBottom: 3 }}><span>{a.name}</span><span className="mono" style={{ fontWeight: 700 }}>{(a.bal / expense * 100).toFixed(0)}%</span></div>
                          <div style={{ height: 7, borderRadius: 4, background: 'var(--surface-3)' }}><div style={{ width: (a.bal / expense * 100) + '%', height: '100%', borderRadius: 4, background: 'var(--blue)' }} /></div>
                        </div>
                      ))}
                    </Panel>
                  </div>
                </div>
              ) : (
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'start' }}>
                  <Panel title="Aset">
                    <table className="dtbl">
                      <tbody>
                        {byType('Aset').map(a => <tr key={a.code}><td style={{ padding: '7px 9px' }}>{a.name}</td><td className="num" style={{ padding: '7px 9px' }}>{fmt(a.bal / 1e6, 0)}</td></tr>)}
                        <tr style={{ fontWeight: 800, background: 'var(--surface-2)' }}><td style={{ padding: '9px' }}>TOTAL ASET</td><td className="num" style={{ padding: '9px' }}>{fmt(totAset / 1e6, 0)}</td></tr>
                      </tbody>
                    </table>
                  </Panel>
                  <Panel title="Liabilitas & Ekuitas">
                    <table className="dtbl">
                      <tbody>
                        <tr className="group-row"><td colSpan={2}>Liabilitas</td></tr>
                        {byType('Liabilitas').map(a => <tr key={a.code}><td style={{ padding: '7px 9px', paddingLeft: 20 }}>{a.name}</td><td className="num" style={{ padding: '7px 9px' }}>{fmt(-a.bal / 1e6, 0)}</td></tr>)}
                        <tr style={{ fontWeight: 600 }}><td style={{ padding: '7px 9px' }}>Total Liabilitas</td><td className="num" style={{ padding: '7px 9px' }}>{fmt(totLiab / 1e6, 0)}</td></tr>
                        <tr className="group-row"><td colSpan={2}>Ekuitas</td></tr>
                        {byType('Ekuitas').map(a => <tr key={a.code}><td style={{ padding: '7px 9px', paddingLeft: 20 }}>{a.name}</td><td className="num" style={{ padding: '7px 9px' }}>{fmt(-a.bal / 1e6, 0)}</td></tr>)}
                        <tr><td style={{ padding: '7px 9px', paddingLeft: 20 }}>Laba Tahun Berjalan</td><td className="num" style={{ padding: '7px 9px', color: 'var(--green)' }}>{fmt(netProfit / 1e6, 0)}</td></tr>
                        <tr style={{ fontWeight: 600 }}><td style={{ padding: '7px 9px' }}>Total Ekuitas</td><td className="num" style={{ padding: '7px 9px' }}>{fmt(totEkuitas / 1e6, 0)}</td></tr>
                        <tr style={{ fontWeight: 800, background: 'var(--surface-2)' }}><td style={{ padding: '9px' }}>TOTAL LIABILITAS & EKUITAS</td><td className="num" style={{ padding: '9px' }}>{fmt((totLiab + totEkuitas) / 1e6, 0)}</td></tr>
                      </tbody>
                    </table>
                  </Panel>
                  <div className="tiny" style={{ gridColumn: '1 / -1', color: Math.abs(totAset - (totLiab + totEkuitas)) < 1e6 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                    {Math.abs(totAset - (totLiab + totEkuitas)) < 1e6 ? '✓ Neraca seimbang — Aset = Liabilitas + Ekuitas' : 'Neraca tidak seimbang'}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'coa' && (
            <div style={{ padding: 12 }}>
              {Object.entries(tbByType).map(([type, accts]) => (
                <div key={type} style={{ marginBottom: 14 }}>
                  <div className="upper tiny" style={{ fontWeight: 700, color: 'var(--blue)', marginBottom: 6 }}>{type}</div>
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 8 }}>
                    {accts.map(a => (
                      <div key={a.code} className="panel" onClick={() => { setLedAcct(a.code); setTab('ledger'); }} style={{ padding: '8px 11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                        <div><div className="mono tiny muted">{a.code}</div><div style={{ fontSize: 12, fontWeight: 600 }}>{a.name}</div></div>
                        <div className="mono tiny" style={{ fontWeight: 700, color: a.bal < 0 ? 'var(--red)' : 'var(--ink)' }}>{fmt(Math.abs(a.bal) / 1e6, 0)} jt</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div></div>
      {form && <FirmJVForm coa={coa} onClose={() => setForm(false)} onPost={(e) => { addJV(e); setForm(false); }} />}
    </>
  );
}

function FirmJVForm({ coa, onClose, onPost }) {
  const { fmt } = window.AMS;
  const [desc, setDesc] = useStateF1('');
  const [dr, setDr] = useStateF1('');
  const [cr, setCr] = useStateF1('');
  const [amount, setAmount] = useStateF1('');
  const valid = desc.trim() && dr && cr && dr !== cr && +amount > 0;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.4)', zIndex: 90, display: 'grid', placeItems: 'center' }} onClick={onClose}>
      <div className="panel" style={{ width: 520, maxWidth: '94vw', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, borderRadius: '4px 4px 0 0' }}>
          <I.ledger size={18} /><div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>Jurnal Umum Firma</div><div className="tiny" style={{ color: '#bcd6e4' }}>Double-entry · GL KAP</div></div>
          <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>
        <div style={{ padding: 16, display: 'grid', gap: 12 }}>
          <div className="field"><label>Keterangan</label><input className="input" value={desc} onChange={e => setDesc(e.target.value)} placeholder="mis. Pembayaran beban operasional" /></div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field"><label>Akun Debit</label><select className="select" value={dr} onChange={e => setDr(e.target.value)}><option value="">— pilih —</option>{coa.map(a => <option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}</select></div>
            <div className="field"><label>Akun Kredit</label><select className="select" value={cr} onChange={e => setCr(e.target.value)}><option value="">— pilih —</option>{coa.map(a => <option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}</select></div>
          </div>
          <div className="field"><label>Jumlah (Rp)</label><input className="input mono" type="number" value={amount} onChange={e => setAmount(e.target.value)} style={{ textAlign: 'right' }} /></div>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn onClick={onClose}>Batal</Btn>
          <Btn variant="primary" disabled={!valid} style={{ opacity: valid ? 1 : .5 }} onClick={() => onPost({ desc: desc.trim(), dr, cr, amount: +amount })}><I.check size={14} /> Posting Jurnal</Btn>
        </div>
      </div>
    </div>
  );
}

/* ---------------- AP / AR ---------------- */
const APAR_STATUS = { Paid: 'green', Outstanding: 'blue', Overdue: 'red', Partial: 'amber', Sent: 'blue', Draft: 'gray' };
const AGING_BUCKETS = [
  { k: 'current', l: 'Belum jatuh tempo', c: '#1f7a4d', lo: -1e9, hi: 0 },
  { k: 'b30', l: '1–30 hari', c: '#5b3fa6', lo: 0, hi: 30 },
  { k: 'b60', l: '31–60 hari', c: '#9a6a00', lo: 30, hi: 60 },
  { k: 'b90', l: '> 60 hari', c: '#b3261e', lo: 60, hi: 1e9 },
];

function agingBucket(daysOver) {
  return AGING_BUCKETS.find(b => daysOver > b.lo && daysOver <= b.hi) || AGING_BUCKETS[0];
}

function AgingStrip({ items, getDue, getOut }) {
  const { fmt } = window.AMS;
  const REF = new Date('2026-03-09');
  const buckets = AGING_BUCKETS.map(b => ({ ...b, v: 0, n: 0 }));
  items.forEach(it => {
    const out = getOut(it); if (out <= 0) return;
    const dOver = Math.round((REF - new Date(getDue(it))) / 864e5);
    const b = buckets.find(x => dOver > x.lo && dOver <= x.hi) || buckets[0];
    b.v += out; b.n += 1;
  });
  const tot = buckets.reduce((s, b) => s + b.v, 0) || 1;
  return (
    <Panel title="Skedul Umur (Aging)" sub={'Rp ' + fmt(tot / 1e6, 0) + ' jt outstanding'}>
      <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', marginBottom: 12 }}>
        {buckets.map(b => b.v > 0 && <div key={b.k} title={b.l} style={{ width: (b.v / tot * 100) + '%', background: b.c }} />)}
      </div>
      {buckets.map(b => (
        <div key={b.k} className="row jb ac" style={{ padding: '5px 0', borderBottom: '1px solid var(--line-soft)' }}>
          <span className="row ac gap8"><span style={{ width: 9, height: 9, borderRadius: 2, background: b.c }} /><span style={{ fontSize: 12 }}>{b.l}</span><span className="tiny muted">· {b.n}</span></span>
          <span className="row ac" style={{ gap: 12 }}><span className="mono" style={{ fontWeight: 600 }}>Rp {fmt(b.v / 1e6, 0)} jt</span><span className="tiny muted" style={{ width: 36, textAlign: 'right' }}>{(b.v / tot * 100).toFixed(0)}%</span></span>
        </div>
      ))}
    </Panel>
  );
}

function FirmAPAR() {
  const { fmt } = window.AMS;
  const nav = useNav();
  const [tab, setTab] = useStateF1('ap');
  const [ap, setAp] = useAmsPersist('firmap', () => window.AMS.FIRM_AP);
  const ar = window.AMS.INVOICES;
  const REF = new Date('2026-03-09');

  const apOutstanding = ap.filter(x => x.status !== 'Paid').reduce((s, x) => s + (x.amount - x.paid), 0);
  const apOverdue = ap.filter(x => x.status === 'Overdue').reduce((s, x) => s + (x.amount - x.paid), 0);
  const arOutstanding = ar.filter(x => x.status !== 'Paid' && x.status !== 'Draft').reduce((s, x) => s + (x.amount - x.paid), 0);
  const arOverdue = ar.filter(x => x.status === 'Overdue').reduce((s, x) => s + (x.amount - x.paid), 0);
  const netPosition = arOutstanding - apOutstanding;
  const payAp = (id) => setAp(list => list.map(x => x.id === id ? { ...x, paid: x.amount, status: 'Paid' } : x));

  // DSO / DPO (approx): outstanding / annualized revenue|cost × 365 — basis kanonik (FIRMFIN)
  const FFp = (window.FIRMFIN && window.FIRMFIN.pl()) || { revenue: 11_300_000_000, totalExpense: 8_500_000_000, salary: 5_420_000_000 };
  const annualRev = FFp.revenue, annualPurch = FFp.totalExpense - FFp.salary;
  const dso = Math.round(arOutstanding / annualRev * 365);
  const dpo = Math.round(apOutstanding / annualPurch * 365);

  // 30/60/90 payment requirement projection for AP
  const payReq = [30, 60, 90].map(d => {
    const lim = new Date(REF.getTime() + d * 864e5);
    const v = ap.filter(x => x.status !== 'Paid' && new Date(x.due) <= lim).reduce((s, x) => s + (x.amount - x.paid), 0);
    return { d, v };
  });

  const tabs = [{ id: 'ap', label: 'Utang (AP)', count: ap.filter(x => x.status !== 'Paid').length }, { id: 'ar', label: 'Piutang (AR)', count: ar.filter(x => x.status !== 'Paid' && x.status !== 'Draft').length }];

  const apRows = ap.map(x => ({ ...x, out: x.amount - x.paid, dOver: Math.round((REF - new Date(x.due)) / 864e5) }));
  const arRows = ar.filter(x => x.status !== 'Draft').map(x => ({ ...x, out: x.amount - x.paid, dOver: Math.round((REF - new Date(x.due)) / 864e5) }));

  return (
    <>
      <SubBar moduleId="apar" right={<div className="row gap8 ac"><Btn sm onClick={() => nav('firmgl')}><I.ledger size={13} /> Ke GL</Btn><Btn sm variant="primary"><I.plus size={14} /> {tab === 'ap' ? 'Tagihan Vendor' : 'Faktur Klien'}</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(arOutstanding / 1e6, 0) + ' jt'} label={'Piutang Outstanding · DSO ' + dso + ' hr'} accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(apOutstanding / 1e6, 0) + ' jt'} label={'Utang Outstanding · DPO ' + dpo + ' hr'} accent="var(--amber)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={(netPosition >= 0 ? '+' : '') + 'Rp ' + fmt(netPosition / 1e6, 0) + ' jt'} label="Posisi Neto" accent={netPosition >= 0 ? 'var(--green)' : 'var(--red)'} /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt((apOverdue + arOverdue) / 1e6, 0) + ' jt'} label="Total Jatuh Tempo Lewat" accent="var(--red)" /></div></Panel>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1.55fr 1fr', gap: 12, alignItems: 'start' }}>
          <Panel noBody>
            <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>
            {tab === 'ap' ? (
              <table className="dtbl">
                <thead><tr><th>No.</th><th>Vendor</th><th>Kategori</th><th className="num">Outstanding</th><th>Jatuh Tempo</th><th>Umur</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {apRows.map(x => (
                    <tr key={x.id}>
                      <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{x.id}</td>
                      <td style={{ fontWeight: 600 }} className="truncate">{x.vendor}</td>
                      <td className="tiny muted">{x.cat}</td>
                      <td className="num">{fmt(x.out / 1e6, 0)} jt</td>
                      <td className="mono tiny" style={{ color: x.status === 'Overdue' ? 'var(--red)' : 'var(--ink-3)' }}>{new Date(x.due).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</td>
                      <td className="tiny mono" style={{ color: x.dOver > 0 ? 'var(--red)' : 'var(--ink-4)' }}>{x.out > 0 ? (x.dOver > 0 ? x.dOver + 'h' : agingBucket(x.dOver).l.replace('Belum jatuh tempo', 'lancar')) : '—'}</td>
                      <td><Badge kind={APAR_STATUS[x.status]}>{x.status}</Badge></td>
                      <td>{x.status !== 'Paid' && <button className="btn sm" style={{ height: 22 }} onClick={() => payAp(x.id)}>Bayar</button>}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td colSpan={3}>TOTAL OUTSTANDING</td><td className="num">{fmt(apOutstanding / 1e6, 0)}</td><td colSpan={4}></td></tr></tfoot>
              </table>
            ) : (
              <table className="dtbl">
                <thead><tr><th>No. Faktur</th><th>Klien</th><th>Termin</th><th className="num">Outstanding</th><th>Jatuh Tempo</th><th>Umur</th><th>Status</th></tr></thead>
                <tbody>
                  {arRows.map(x => (
                    <tr key={x.id} onClick={() => nav('billing')} style={{ cursor: 'pointer' }}>
                      <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{x.id}</td>
                      <td style={{ fontWeight: 600 }} className="truncate">{x.client.replace('PT ', '')}</td>
                      <td className="tiny muted">{x.milestone}</td>
                      <td className="num">{x.out > 0 ? fmt(x.out / 1e6, 0) + ' jt' : '—'}</td>
                      <td className="mono tiny" style={{ color: x.dOver > 0 && x.out > 0 ? 'var(--red)' : 'var(--ink-3)' }}>{new Date(x.due).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</td>
                      <td className="tiny mono" style={{ color: x.dOver > 0 && x.out > 0 ? 'var(--red)' : 'var(--ink-4)' }}>{x.out > 0 ? (x.dOver > 0 ? x.dOver + 'h' : 'lancar') : '—'}</td>
                      <td><Badge kind={APAR_STATUS[x.status]}>{x.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td colSpan={3}>TOTAL OUTSTANDING</td><td className="num">{fmt(arOutstanding / 1e6, 0)}</td><td colSpan={3}></td></tr></tfoot>
              </table>
            )}
          </Panel>

          <div style={{ display: 'grid', gap: 12 }}>
            {tab === 'ap'
              ? <AgingStrip items={ap} getDue={x => x.due} getOut={x => x.amount - x.paid} />
              : <AgingStrip items={arRows} getDue={x => x.due} getOut={x => x.out} />}
            {tab === 'ap' && (
              <Panel title="Kebutuhan Kas — Pembayaran Vendor" sub="proyeksi bergulir">
                <div style={{ display: 'grid', gap: 8 }}>
                  {payReq.map((p, i) => (
                    <div key={p.d}>
                      <div className="row jb tiny" style={{ marginBottom: 3 }}><span>Dalam {p.d} hari ke depan</span><span className="mono" style={{ fontWeight: 700 }}>Rp {fmt(p.v / 1e6, 0)} jt</span></div>
                      <div style={{ height: 8, borderRadius: 4, background: 'var(--surface-3)' }}><div style={{ width: (p.v / (payReq[2].v || 1) * 100) + '%', height: '100%', borderRadius: 4, background: ['#1f7a4d', '#9a6a00', '#b3261e'][i] }} /></div>
                    </div>
                  ))}
                </div>
                <div className="tiny muted" style={{ marginTop: 10, lineHeight: 1.5 }}>Disusun dari tanggal jatuh tempo utang yang belum dibayar; gunakan untuk menjaga saldo rekening operasional.</div>
              </Panel>
            )}
            {tab === 'ar' && (
              <Panel title="Konsentrasi Piutang" sub="per klien">
                {Object.values(arRows.filter(x => x.out > 0).reduce((m, x) => {
                  const k = x.client.replace('PT ', '');
                  (m[k] = m[k] || { k, v: 0 }).v += x.out; return m;
                }, {})).sort((a, b) => b.v - a.v).map((c, i) => {
                  const mx = arOutstanding || 1;
                  return (
                    <div key={c.k} style={{ marginBottom: 9 }}>
                      <div className="row jb tiny" style={{ marginBottom: 3 }}><span className="truncate" style={{ maxWidth: 150 }}>{c.k}</span><span className="mono" style={{ fontWeight: 700 }}>Rp {fmt(c.v / 1e6, 0)} jt</span></div>
                      <div style={{ height: 8, borderRadius: 4, background: 'var(--surface-3)' }}><div style={{ width: (c.v / mx * 100) + '%', height: '100%', borderRadius: 4, background: 'var(--blue)' }} /></div>
                    </div>
                  );
                })}
              </Panel>
            )}
          </div>
        </div>
        <div className="tiny muted" style={{ marginTop: 8 }}>AR tersinkron dari modul Billing & Invoicing · AP dikelola di sini · keduanya mengalir ke GL firma.</div>
      </div></div>
    </>
  );
}

Object.assign(window, { FirmGL, FirmAPAR });
