/* ============================================================
   NeoSuite AMS — Financial Statement Generator (workspace)
   Statement navigator · presentation controls · sign-off ·
   live document (Neraca · Laba Rugi & OCI · Ekuitas · Arus Kas · CALK) ·
   tie-out validation · account mapping · disclosure checklist.
   All figures derive from the Working Trial Balance (adjusted).
   ============================================================ */
const { useState: useStateFS, useMemo: useMemoFS } = React;

function FSGenerator() {
  const { fmt } = window.AMS;
  const { wtb, ajeTotalPosted } = useAudit();
  const { activeClient, locked } = useFirm();
  const nav = useNav();

  const [tab, setTab] = useStateFS('neraca');
  const [unit, setUnit] = window.useAmsPersist('fsgen.unit', 'jutaan');
  const [comparative, setComparative] = window.useAmsPersist('fsgen.comparative', true);
  const [rounding, setRounding] = window.useAmsPersist('fsgen.rounding', true);
  const [dock, setDock] = useStateFS('validate');
  const [activeKey, setActiveKey] = useStateFS(null);
  const [signoff, setSignoff] = window.useAmsPersist('fsgen.signoff', {});
  const [disclosures, setDisclosures] = window.useAmsPersist('fsgen.disclosures', window.FSGEN.DISCLOSURES);
  const [cfMethodPref, setCfMethodPref] = window.useAmsPersist('fsgen.cfMethod', 'auto');
  /* Emiten/entitas tercatat → OJK mewajibkan metode langsung; jika belum dipilih, ikuti status klien. */
  const cfMethod = cfMethodPref === 'auto' ? (activeClient?.listed ? 'direct' : 'indirect') : cfMethodPref;

  const model = useMemoFS(() => window.FSGEN.buildModel(wtb), [wtb]);
  const checks = useMemoFS(() => window.FSGEN.buildTieOuts(model, ajeTotalPosted), [model, ajeTotalPosted]);

  const U = window.FSGEN.UNITS[unit];
  const sc = (n) => { const x = n / U.div; const a = fmt(Math.abs(x), U.dp); return x < 0 ? '(' + a + ')' : a; };
  const M = (n) => 'Rp ' + fmt(n / 1e9, 1) + ' M';

  const passed = checks.filter(c => c.ok).length;
  const discDone = disclosures.filter(d => d.done).length;
  const discPct = Math.round((discDone / disclosures.length) * 100);
  const allSigned = signoff.prepared && signoff.reviewed;

  const pickLine = (key) => { setActiveKey(key); setDock('mapping'); };

  /* statement nav meta */
  const navItems = [
    { id: 'neraca',  label: 'Posisi Keuangan', tag: 'L1', status: model.bs.balanced ? 'ok' : 'warn', statusLabel: model.bs.balanced ? 'Seimbang' : 'Selisih' },
    { id: 'labarugi', label: 'Laba Rugi & PKL', tag: 'L2', status: 'ok' },
    { id: 'ekuitas', label: 'Perubahan Ekuitas', tag: 'L3', status: Math.abs((model.eqr.netIncome + model.eqr.oci) - (model.eqr.endRE - model.eqr.beginRE)) < 1e6 ? 'ok' : 'warn' },
    { id: 'aruskas', label: 'Arus Kas', tag: 'L4', status: model.cf.ties ? 'ok' : 'warn', statusLabel: model.cf.ties ? 'Menutup ke saldo kas' : 'Tidak menutup' },
    { id: 'calk',    label: 'Catatan (CALK)', tag: 'L5', status: discPct === 100 ? 'ok' : 'warn', statusLabel: discPct + '% lengkap' },
  ];

  const title = { neraca: 'LAPORAN POSISI KEUANGAN', labarugi: 'LAPORAN LABA RUGI DAN PENGHASILAN KOMPREHENSIF LAIN', ekuitas: 'LAPORAN PERUBAHAN EKUITAS', aruskas: 'LAPORAN ARUS KAS', calk: 'CATATAN ATAS LAPORAN KEUANGAN' }[tab];
  const periodTxt = tab === 'neraca' ? 'Per 31 Desember 2025' : 'Untuk tahun yang berakhir 31 Desember 2025';

  /* ---- shared document row ---- */
  const colCount = comparative ? 3 : 2;
  const styleFor = (lvl) => ({
    section:  { fontWeight: 800, fontSize: 12.5, paddingTop: 14, color: '#0c2430' },
    sub:      { fontWeight: 700, fontSize: 12, paddingTop: 8, color: '#28414e' },
    line:     { fontWeight: 400 },
    subtotal: { fontWeight: 700, borderTop: '1px solid #cdd5dc' },
    total:    { fontWeight: 800, borderTop: '2px solid #2a3f4a', borderBottom: '1px solid #2a3f4a', fontSize: 12.5 },
  }[lvl]);
  const numCell = (v, py) => v == null ? '' : sc(v);

  const R = ({ label, cy, py, lvl = 'line', note, pickKey, indent }) => {
    const st = styleFor(lvl);
    const isActive = pickKey && activeKey === pickKey;
    return (
      <tr style={{ ...st, background: isActive ? '#eaf3fb' : 'transparent', cursor: pickKey ? 'pointer' : 'default' }}
        onClick={pickKey ? () => pickLine(pickKey) : undefined}>
        <td style={{ padding: '3px 0', paddingLeft: lvl === 'line' ? (indent ? 28 : 16) : 0, ...st }}>
          {label}
          {note && <sup style={{ color: '#7a8893', marginLeft: 3, fontWeight: 400 }}>{note}</sup>}
        </td>
        <td className="num" style={{ padding: '3px 0', fontFamily: 'var(--mono)', ...st }}>{numCell(cy)}</td>
        {comparative && <td className="num" style={{ padding: '3px 0', fontFamily: 'var(--mono)', color: '#7a8893', fontWeight: st.fontWeight }}>{numCell(py)}</td>}
      </tr>
    );
  };

  const f0 = (n) => fmt(n / 1e6, 0); // CALK narrative always in jutaan

  return (
    <>
      <SubBar moduleId="fsgen" right={
        <div className="row gap8 ac">
          <span className="tiny mono" style={{ color: model.bs.balanced ? 'var(--green)' : 'var(--red)' }}>{model.bs.balanced ? '● Neraca seimbang' : '● Tidak seimbang'}</span>
          <span className="tiny mono" style={{ color: passed === checks.length ? 'var(--green)' : 'var(--amber)' }}>● {passed}/{checks.length} tie-out</span>
          <Btn sm onClick={() => nav('wtb')}><I.table size={13} /> Buka WTB</Btn>
          <Btn sm variant="primary" onClick={() => window.amsPrintDoc()}><I.download size={14} /> Export PDF</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad">
          {locked && <LockBanner />}

          {/* KPI / command band */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(6,1fr)', marginBottom: 12 }}>
            <KpiTile label="Total Aset" value={M(model.bs.totalAssets.cy)} sub={'YoY ' + yoy(model.bs.totalAssets, fmt)} />
            <KpiTile label="Posisi Neraca" value={model.bs.balanced ? 'Seimbang' : 'Selisih'} accent={model.bs.balanced ? 'var(--green)' : 'var(--red)'} sub={model.bs.balanced ? 'Aset = Liab + Ekuitas' : 'Selisih ' + M(Math.abs(model.bs.bsDiff.cy))} />
            <KpiTile label="Laba Bersih" value={M(model.is.netIncome.cy)} accent="var(--blue)" sub={'Margin ' + fmt(model.is.netIncome.cy / model.is.sales.cy * 100, 1) + '%'} />
            <KpiTile label="Tie-out" value={passed + ' / ' + checks.length} accent={passed === checks.length ? 'var(--green)' : 'var(--amber)'} onClick={() => setDock('validate')} sub={passed === checks.length ? 'Seluruh rekonsiliasi lolos' : (checks.length - passed) + ' perlu perhatian'}>
              <div className="pbar" style={{ marginTop: 4 }}><span style={{ width: (passed / checks.length * 100) + '%', background: passed === checks.length ? 'var(--green)' : 'var(--amber)' }} /></div>
            </KpiTile>
            <KpiTile label="Kelengkapan CALK" value={discPct + '%'} accent={discPct === 100 ? 'var(--green)' : 'var(--amber)'} onClick={() => setDock('disclose')} sub={discDone + '/' + disclosures.length + ' pengungkapan PSAK'}>
              <div className="pbar" style={{ marginTop: 4 }}><span style={{ width: discPct + '%', background: discPct === 100 ? 'var(--green)' : 'var(--amber)' }} /></div>
            </KpiTile>
            <KpiTile label="Status Laporan" value={allSigned ? 'Final' : 'Draft'} accent={allSigned ? 'var(--green)' : 'var(--amber)'} sub={allSigned ? 'Siap untuk EQR' : (signoff.prepared ? 'Menunggu reviu partner' : 'Belum ditandatangani')} />
          </div>

          {/* workspace: rail | paper | dock */}
          <div className="row gap12" style={{ alignItems: 'flex-start' }}>
            <div style={{ width: 212, flex: '0 0 212px', position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', gap: 12 }} className="no-print">
              <FSStatementNav items={navItems} active={tab} onChange={setTab} />
              <FSPresentation unit={unit} setUnit={setUnit} comparative={comparative} setComparative={setComparative} rounding={rounding} setRounding={setRounding} cfMethod={cfMethod} setCfMethod={setCfMethodPref} listed={!!activeClient?.listed} />
              <FSSignoff signoff={signoff} setSignoff={setSignoff} locked={locked} />
            </div>

            {/* document */}
            <div style={{ flex: 1, minWidth: 0, background: '#e7eaef', borderRadius: 6, padding: 16, border: '1px solid var(--line)' }}>
              <div className="doc-paper" style={{ background: '#fff', maxWidth: 1080, margin: '0 auto', padding: '46px 66px', boxShadow: 'var(--shadow)', fontSize: 12.5, color: '#16242c' }}>
                <div style={{ textAlign: 'center', marginBottom: 3, fontWeight: 800, fontSize: 14 }}>{activeClient?.name || 'PT Sentosa Makmur Tbk'}</div>
                <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 12.5 }}>{title}</div>
                <div style={{ textAlign: 'center', color: '#7a8893', fontSize: 11, marginBottom: 18 }}>{periodTxt} · (dalam {U.label})</div>

                {tab !== 'calk' && tab !== 'ekuitas' && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: '1.5px solid #2a3f4a' }}>
                        <th style={{ textAlign: 'left', padding: '4px 0' }}></th>
                        <th style={{ textAlign: 'right', padding: '4px 0', fontSize: 11, width: 150 }}>2025</th>
                        {comparative && <th style={{ textAlign: 'right', padding: '4px 0', fontSize: 11, width: 150, color: '#7a8893' }}>2024</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {tab === 'neraca' && <>
                        <R label="ASET" lvl="section" />
                        <R label="Aset Lancar" lvl="sub" />
                        {model.bs.ca.map(l => <R key={l.key} label={l.label} cy={l.cy} py={l.py} note={l.note} pickKey={l.key} />)}
                        <R label="Total Aset Lancar" cy={model.bs.totalCA.cy} py={model.bs.totalCA.py} lvl="subtotal" />
                        <R label="Aset Tidak Lancar" lvl="sub" />
                        {model.bs.nca.map(l => <R key={l.key} label={l.label} cy={l.cy} py={l.py} note={l.note} pickKey={l.key} />)}
                        <R label="Total Aset Tidak Lancar" cy={model.bs.totalNCA.cy} py={model.bs.totalNCA.py} lvl="subtotal" />
                        <R label="TOTAL ASET" cy={model.bs.totalAssets.cy} py={model.bs.totalAssets.py} lvl="total" />
                        <R label="LIABILITAS DAN EKUITAS" lvl="section" />
                        <R label="Liabilitas Jangka Pendek" lvl="sub" />
                        {model.bs.cl.map(l => <R key={l.key} label={l.label} cy={l.cy} py={l.py} note={l.note} pickKey={l.key} />)}
                        <R label="Total Liabilitas Jangka Pendek" cy={model.bs.totalCL.cy} py={model.bs.totalCL.py} lvl="subtotal" />
                        <R label="Liabilitas Jangka Panjang" lvl="sub" />
                        {model.bs.ncl.map(l => <R key={l.key} label={l.label} cy={l.cy} py={l.py} note={l.note} pickKey={l.key} />)}
                        <R label="Total Liabilitas Jangka Panjang" cy={model.bs.totalNCL.cy} py={model.bs.totalNCL.py} lvl="subtotal" />
                        <R label="Ekuitas" lvl="sub" />
                        {model.bs.eq.map(l => <R key={l.key} label={l.label} cy={l.cy} py={l.py} note={l.note} pickKey={l.key} />)}
                        <R label="Total Ekuitas" cy={model.bs.totalEq.cy} py={model.bs.totalEq.py} lvl="subtotal" />
                        <R label="TOTAL LIABILITAS DAN EKUITAS" cy={model.bs.totalLE.cy} py={model.bs.totalLE.py} lvl="total" />
                      </>}

                      {tab === 'labarugi' && <>
                        <R label="Penjualan bersih" cy={model.is.sales.cy} py={model.is.sales.py} note="15" />
                        <R label="Beban pokok penjualan" cy={-model.is.cogs.cy} py={-model.is.cogs.py} />
                        <R label="LABA BRUTO" cy={model.is.gross.cy} py={model.is.gross.py} lvl="subtotal" />
                        <R label="Beban penjualan" cy={-model.is.sell.cy} py={-model.is.sell.py} />
                        <R label="Beban umum dan administrasi" cy={-model.is.admin.cy} py={-model.is.admin.py} />
                        <R label="LABA USAHA" cy={model.is.opProfit.cy} py={model.is.opProfit.py} lvl="subtotal" />
                        <R label="Beban keuangan" cy={-model.is.finCost.cy} py={-model.is.finCost.py} />
                        <R label="LABA SEBELUM PAJAK" cy={model.is.pbt.cy} py={model.is.pbt.py} lvl="subtotal" />
                        <R label="Beban pajak penghasilan" cy={-model.is.tax.cy} py={-model.is.tax.py} note="12" />
                        <R label="LABA TAHUN BERJALAN" cy={model.is.netIncome.cy} py={model.is.netIncome.py} lvl="subtotal" />
                        <R label="Penghasilan komprehensif lain — pengukuran kembali imbalan kerja" cy={model.eqr.oci} py={0} note="13" />
                        <R label="TOTAL LABA KOMPREHENSIF TAHUN BERJALAN" cy={model.is.netIncome.cy + model.eqr.oci} py={model.is.netIncome.py} lvl="total" />
                        <tr><td colSpan={colCount} style={{ height: 10 }}></td></tr>
                        <R label="Laba per saham dasar (Rupiah penuh)" cy={null} />
                        <tr>
                          <td style={{ padding: '3px 0', paddingLeft: 16 }}>— Laba per saham dasar</td>
                          <td className="num" style={{ fontFamily: 'var(--mono)' }}>{fmt(model.is.eps.cy, 0)}</td>
                          {comparative && <td className="num" style={{ fontFamily: 'var(--mono)', color: '#7a8893' }}>{fmt(model.is.eps.py, 0)}</td>}
                        </tr>
                      </>}

                      {tab === 'aruskas' && <>
                        <R label="ARUS KAS DARI AKTIVITAS OPERASI" lvl="section" />
                        {cfMethod === 'direct'
                          ? model.cf.cfoDirect.map((l, i) => l.sub
                              ? <R key={'d' + i} label={l.label} cy={l.v} lvl="subtotal" />
                              : <R key={'d' + i} label={l.label} cy={l.v} indent />)
                          : model.cf.cfo.map((l, i) => l.head
                              ? <R key={i} label={l.label} lvl="sub" />
                              : <R key={i} label={l.label} cy={l.v} py={null} indent={!/Laba tahun/.test(l.label)} />)}
                        <R label="Kas Neto dari Aktivitas Operasi" cy={cfMethod === 'direct' ? model.cf.cfoDirectTotal : model.cf.cfoTotal} lvl="subtotal" />
                        <R label="ARUS KAS DARI AKTIVITAS INVESTASI" lvl="section" />
                        {model.cf.cfi.map((l, i) => <R key={'i' + i} label={l.label} cy={l.v} note={l.memo ? '8' : ''} />)}
                        <R label="Kas Neto untuk Aktivitas Investasi" cy={model.cf.cfiTotal} lvl="subtotal" />
                        <R label="ARUS KAS DARI AKTIVITAS PENDANAAN" lvl="section" />
                        {model.cf.cff.map((l, i) => <R key={'f' + i} label={l.label} cy={l.v} note={l.memo ? '8' : ''} />)}
                        <R label="Kas Neto dari Aktivitas Pendanaan" cy={model.cf.cffTotal} lvl="subtotal" />
                        <R label="KENAIKAN KAS DAN SETARA KAS — NETO" cy={model.cf.netChange} lvl="subtotal" />
                        <R label="Kas dan setara kas awal tahun" cy={model.cf.cashOpen} />
                        <R label="KAS DAN SETARA KAS AKHIR TAHUN" cy={model.cf.cashClose} lvl="total" />
                      </>}
                    </tbody>
                  </table>
                )}

                {tab === 'ekuitas' && <EquityStatement model={model} sc={sc} fmt={fmt} />}

                {tab === 'aruskas' && (
                  <div style={{ marginTop: 14, padding: '9px 12px', border: '1px dashed #c2cbd2', borderRadius: 6, fontSize: 11, color: '#465a66', lineHeight: 1.55 }}>
                    <b>Metode penyajian:</b> arus kas operasi disusun dengan <b>metode {cfMethod === 'direct' ? 'langsung' : 'tidak langsung'}</b>{cfMethod === 'direct' ? ' — menyajikan kelompok utama penerimaan & pembayaran kas bruto (wajib bagi entitas tercatat per OJK).' : '.'} Total arus kas operasi identik antarmetode (lihat panel Validasi). <br />
                    <b>Transaksi non-kas (PSAK 73):</b> pengakuan awal aset hak-guna dan liabilitas sewa atas kontrak gudang & kendaraan sebesar ± Rp {f0(model.meta.rouAdd)} juta tidak melibatkan arus kas dan diungkapkan sebagai informasi tambahan. Lihat Catatan 8.
                  </div>
                )}

                {tab === 'calk' && <CALK model={model} activeClient={activeClient} f0={f0} disclosures={disclosures} />}

                {tab === 'neraca' && !model.bs.balanced && <div style={{ marginTop: 14, color: '#b3261e', fontSize: 11, fontWeight: 600 }}>⚠ Neraca tidak seimbang — periksa pemetaan akun WTB.</div>}

                <div style={{ marginTop: 22, paddingTop: 12, borderTop: '1px solid #e0e4e8', color: '#7a8893', fontSize: 10.5, lineHeight: 1.5 }}>
                  Catatan atas laporan keuangan merupakan bagian yang tidak terpisahkan dari laporan keuangan ini. Dihasilkan otomatis dari Working Trial Balance (saldo setelah penyesuaian audit) — NeoSuite AMS.
                  {allSigned && <span> · Disusun {signoff.prepared.by} ({signoff.prepared.date}); direviu {signoff.reviewed.by} ({signoff.reviewed.date}).</span>}
                </div>
              </div>
            </div>

            {/* right dock */}
            <div style={{ width: 324, flex: '0 0 324px', position: 'sticky', top: 0 }} className="no-print">
              <Panel noBody>
                <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}>
                  <Tabs tabs={[{ id: 'validate', label: 'Validasi', count: passed + '/' + checks.length }, { id: 'mapping', label: 'Pemetaan' }, { id: 'disclose', label: 'CALK', count: discPct + '%' }]} active={dock} onChange={setDock} />
                </div>
                <div style={{ maxHeight: 'calc(100vh - 150px)', overflow: 'auto' }}>
                  {dock === 'validate' && <FSValidationPanel checks={checks} sc={sc} unitShort={U.label} />}
                  {dock === 'mapping' && <FSMappingPanel model={model} wtb={wtb} sc={sc} activeKey={activeKey} onPick={pickLine} />}
                  {dock === 'disclose' && <FSDisclosurePanel disclosures={disclosures} setDisclosures={setDisclosures} locked={locked} />}
                </div>
              </Panel>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function yoy(o, fmt) { const d = (o.cy - o.py) / Math.abs(o.py || 1) * 100; return (d >= 0 ? '+' : '') + fmt(d, 1) + '%'; }

/* ---- KPI tile ---- */
function KpiTile({ label, value, sub, accent, onClick, children }) {
  return (
    <div className="panel" style={{ padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: 3, cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <div className="tiny upper" style={{ color: 'var(--ink-4)', fontWeight: 700, letterSpacing: '.05em' }}>{label}</div>
      <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: accent || 'var(--navy)', lineHeight: 1.05 }}>{value}</div>
      {children}
      {sub && <div className="tiny muted">{sub}</div>}
    </div>
  );
}

/* ---- Statement of changes in equity (column rollforward) ---- */
function EquityStatement({ model, sc }) {
  const e = model.eqr;
  const rows = [
    { l: 'Saldo per 1 Januari 2025', modal: e.beginModal, re: e.beginRE, strong: true },
    { l: 'Laba tahun berjalan', modal: 0, re: e.netIncome },
    { l: 'Penghasilan komprehensif lain — neto', modal: 0, re: e.oci, note: '13' },
    { l: 'Dividen tunai', modal: 0, re: 0 },
    { l: 'Saldo per 31 Desember 2025', modal: e.endModal, re: e.endRE, total: true },
  ];
  const cell = (v, bold) => <td className="num" style={{ padding: '5px 0', fontFamily: 'var(--mono)', fontWeight: bold ? 800 : 500 }}>{sc(v)}</td>;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr style={{ borderBottom: '1.5px solid #2a3f4a' }}>
          <th style={{ textAlign: 'left', padding: '4px 0' }}></th>
          <th style={{ textAlign: 'right', padding: '4px 0', fontSize: 11, width: 130 }}>Modal Saham</th>
          <th style={{ textAlign: 'right', padding: '4px 0', fontSize: 11, width: 130 }}>Saldo Laba</th>
          <th style={{ textAlign: 'right', padding: '4px 0', fontSize: 11, width: 130 }}>Total Ekuitas</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ borderTop: r.total ? '2px solid #2a3f4a' : r.strong ? 'none' : '1px solid #eef1f4', borderBottom: r.total ? '1px solid #2a3f4a' : 'none' }}>
            <td style={{ padding: '5px 0', fontWeight: r.total || r.strong ? 700 : 400, color: r.total || r.strong ? '#0c2430' : '#28414e' }}>
              {r.l}{r.note && <sup style={{ color: '#7a8893', marginLeft: 3 }}>{r.note}</sup>}
            </td>
            {cell(r.modal, r.total)}
            {cell(r.re, r.total)}
            {cell(r.modal + r.re, r.total)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ---- Notes to the financial statements (CALK) ---- */
function CALK({ model, activeClient, f0, disclosures }) {
  const arNet = model.bs.ca.find(l => l.key === 'piutang');
  const note = (no, title, body, psak) => (
    <div style={{ marginBottom: 13 }}>
      <div className="row ac gap8" style={{ marginBottom: 4 }}>
        <span style={{ fontWeight: 700, fontSize: 12, color: '#0c2430' }}>{no}. {title}</span>
        {psak && <span style={{ fontSize: 9.5, fontWeight: 700, color: '#005085', background: '#e3eef6', padding: '1px 6px', borderRadius: 9 }}>{psak}</span>}
      </div>
      <div style={{ fontSize: 11.5, lineHeight: 1.6, color: '#283b46' }}>{body}</div>
    </div>
  );
  const done = disclosures.filter(d => d.done).length;
  return (
    <div>
      {note('1', 'Umum', `${activeClient?.name} ("Perusahaan") bergerak di bidang ${(activeClient?.industry || '').toLowerCase()}, berkedudukan di ${activeClient?.city}. Laporan keuangan disusun sesuai Standar Akuntansi Keuangan (SAK) di Indonesia${activeClient?.listed ? '; Perusahaan merupakan emiten yang tercatat di Bursa Efek Indonesia' : ''}.`)}
      {note('2', 'Dasar Penyusunan', 'Laporan keuangan disusun atas dasar akrual dan konsep biaya historis, kecuali instrumen keuangan tertentu yang diukur pada nilai wajar. Mata uang penyajian dan fungsional adalah Rupiah.', 'PSAK 1')}
      {note('3', 'Ikhtisar Kebijakan Akuntansi Signifikan', 'Pengakuan pendapatan mengikuti PSAK 72 (pengalihan pengendalian), instrumen keuangan & penurunan nilai mengikuti PSAK 71 (expected credit loss), sewa mengikuti PSAK 73, dan imbalan kerja mengikuti PSAK 24.', 'PSAK 1')}
      {note('4', 'Kas dan Setara Kas', `Terdiri atas kas, bank, dan deposito jatuh tempo ≤ 3 bulan. Saldo per 31 Desember 2025 sebesar Rp ${f0(model.bs.ca.find(l => l.key === 'kas').cy)} juta (2024: Rp ${f0(model.bs.ca.find(l => l.key === 'kas').py)} juta).`)}
      {note('5', 'Piutang Usaha — Neto', `Disajikan neto setelah cadangan kerugian kredit ekspektasian (ECL). Piutang usaha neto Rp ${f0(arNet.cy)} juta (2024: Rp ${f0(arNet.py)} juta). Penambahan cadangan dibukukan melalui AJE berdasarkan model ECL per-tingkat (staging).`, 'PSAK 71')}
      {note('6', 'Persediaan', `Diukur pada nilai terendah antara biaya perolehan dan nilai realisasi neto (NRV). Saldo Rp ${f0(model.bs.ca.find(l => l.key === 'persed').cy)} juta. Penyesuaian pisah batas dibukukan via AJE.`, 'PSAK 14')}
      {note('7', 'Aset Tetap — Neto', `Nilai tercatat neto Rp ${f0(model.bs.nca.find(l => l.key === 'asettetap').cy)} juta. Penyusutan periode berjalan Rp ${f0(model.meta.depreciation)} juta dengan metode garis lurus; belanja modal Rp ${f0(model.meta.capex)} juta atas mesin produksi.`, 'PSAK 16')}
      {note('8', 'Sewa (PSAK 73)', `Perusahaan menerapkan PSAK 73 atas kontrak sewa gudang & kendaraan. Aset hak-guna diakui Rp ${f0(model.bs.nca.find(l => l.key === 'rou').cy)} juta dengan liabilitas sewa terkait, disusutkan garis lurus selama masa sewa. Pengakuan awal merupakan transaksi non-kas.`, 'PSAK 73')}
      {note('12', 'Perpajakan', `Beban pajak penghasilan Rp ${f0(model.is.tax.cy)} juta; tarif pajak efektif ${fmtPct(model.is.tax.cy, model.is.pbt.cy)}. Aset pajak tangguhan Rp ${f0(model.bs.nca.find(l => l.key === 'pjktangguh').cy)} juta berasal dari perbedaan temporer penyusutan & cadangan ECL.`, 'PSAK 46')}
      {note('13', 'Liabilitas Imbalan Kerja', `Liabilitas imbalan pasca-kerja Rp ${f0(model.bs.ncl.find(l => l.key === 'imbalan').cy)} juta dihitung aktuaris independen. Pengukuran kembali (remeasurement) diakui pada penghasilan komprehensif lain.`, 'PSAK 24')}
      {note('15', 'Pendapatan', `Penjualan bersih FY2025 Rp ${f0(model.is.sales.cy)} juta (2024: Rp ${f0(model.is.sales.py)} juta). Pendapatan diakui pada saat pengendalian barang beralih ke pelanggan.`, 'PSAK 72')}
      {note('17', 'Peristiwa Setelah Periode Pelaporan', 'Tidak terdapat peristiwa penyesuai material setelah tanggal pelaporan selain yang telah diungkapkan (lihat modul Subsequent Events).', 'PSAK 8')}
      <div className="row ac jb" style={{ marginTop: 8, padding: '8px 11px', background: '#f3f6f9', borderRadius: 6 }}>
        <span className="tiny" style={{ color: '#465a66', fontStyle: 'italic' }}>Catatan tertaut langsung ke saldo neraca & laba rugi (Working Trial Balance). Kelengkapan pengungkapan dipantau di panel "CALK".</span>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: done === disclosures.length ? '#1f7a4d' : '#9a6a00', whiteSpace: 'nowrap', marginLeft: 10 }}>{done}/{disclosures.length} PSAK</span>
      </div>
    </div>
  );
}
function fmtPct(tax, pbt) { const { fmt } = window.AMS; return pbt ? fmt(tax / pbt * 100, 1) + '%' : '—'; }

Object.assign(window, { FSGenerator });
