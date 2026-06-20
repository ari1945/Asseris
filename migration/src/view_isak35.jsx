/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { AMS_CANON } from './canon';
import { FSGEN } from './fsgen_model.jsx';
import { useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Btn, Panel, Tabs } from './ui.jsx';
import { useWpSignoff } from './wp_signoff.jsx';

/* ============================================================
   NeoSuite AMS — ISAK 35 · Entitas Berorientasi Nonlaba
   Kertas kerja penyajian & audit laporan keuangan nonlaba yang
   DITARIK PENUH dari satu sumber kebenaran: AMS_CANON.isak35().
   Workspace: navigator laporan · kontrol penyajian · dokumen langsung
   (Posisi Keuangan · Penghasilan Komprehensif · Perubahan Aset Neto ·
   Arus Kas · CALK) · validasi tie-out · daftar-uji pengungkapan ·
   prosedur audit · keterkaitan modul.
   ============================================================ */
const { useState: useStateI35, useMemo: useMemoI35 } = React;

/* ---- meta navigator laporan ---- */
const I35_STATEMENTS = [
  { id: 'posisi',    label: 'Posisi Keuangan',        tag: 'L1' },
  { id: 'penghasilan', label: 'Penghasilan Komprehensif', tag: 'L2' },
  { id: 'perubahan', label: 'Perubahan Aset Neto',     tag: 'L3' },
  { id: 'aruskas',   label: 'Arus Kas',                tag: 'L4' },
  { id: 'calk',      label: 'Catatan (CALK)',          tag: 'L5' },
];
const I35_TITLES = {
  posisi: 'LAPORAN POSISI KEUANGAN',
  penghasilan: 'LAPORAN PENGHASILAN KOMPREHENSIF',
  perubahan: 'LAPORAN PERUBAHAN ASET NETO',
  aruskas: 'LAPORAN ARUS KAS',
  calk: 'CATATAN ATAS LAPORAN KEUANGAN',
};

function I35KpiTile({ label, value, sub, accent, onClick, children }) {
  return (
    <div className="panel" style={{ padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: 3, cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <div className="tiny upper" style={{ color: 'var(--ink-4)', fontWeight: 700, letterSpacing: '.05em' }}>{label}</div>
      <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: accent || 'var(--navy)', lineHeight: 1.05 }}>{value}</div>
      {children}
      {sub && <div className="tiny muted">{sub}</div>}
    </div>
  );
}

/* ---- navigator laporan (rail kiri) ---- */
function I35Nav({ items, active, onChange }) {
  return (
    <Panel noBody>
      <div className="panel-h"><h3>Set Laporan</h3><span className="sub mono">ISAK 35</span></div>
      <div style={{ padding: 6, display: 'grid', gap: 4 }}>
        {items.map(it => {
          const on = active === it.id;
          const meta = it.status === 'warn' ? { c: 'var(--amber)' } : { c: 'var(--green)' };
          return (
            <button key={it.id} onClick={() => onChange(it.id)} className="row ac gap8"
              style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid ' + (on ? 'var(--blue)' : 'var(--line)'), background: on ? 'var(--blue-050)' : 'var(--surface)', cursor: 'pointer', textAlign: 'left' }}>
              <span className="mono tiny" style={{ fontWeight: 700, color: on ? 'var(--blue)' : 'var(--ink-4)', flex: '0 0 22px' }}>{it.tag}</span>
              <span style={{ fontSize: 12.5, fontWeight: on ? 700 : 500, flex: 1, color: on ? 'var(--navy)' : 'var(--ink-2)' }}>{it.label}</span>
              {it.status && <span style={{ width: 7, height: 7, borderRadius: 4, background: meta.c, flex: '0 0 auto' }} />}
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

function ISAK35View() {
  const { fmt } = AMS;
  const nav = useNav();
  const canon = AMS_CANON;
  const m = useMemoI35(() => canon.isak35(), []);

  const [tab, setTab] = window.useAmsPersist('isak35.tab', 'posisi');
  const [unit, setUnit] = window.useAmsPersist('isak35.unit', 'jutaan');
  const [comparative, setComparative] = window.useAmsPersist('isak35.comparative', true);
  const [expenseView, setExpenseView] = window.useAmsPersist('isak35.expenseView', 'fungsional');
  const [dock, setDock] = useStateI35('validate');
  const [disc, setDisc] = window.useAmsPersist('isak35.disc', m.disclosures);
  const [procDone, setProcDone] = window.useAmsPersist('isak35.proc', {});
  /* sign-off kanonik (SSOT wpState['isak35']) — bentuk {prepared,reviewed} dipertahankan utk KPI & footnote */
  const i35Wp = useWpSignoff('isak35');
  const signoff = {
    prepared: i35Wp.preparer ? { by: i35Wp.preparer.by, date: i35Wp.preparer.at } : null,
    reviewed: i35Wp.reviewer ? { by: i35Wp.reviewer.by, date: i35Wp.reviewer.at } : null,
  };

  const U = FSGEN.UNITS[unit];
  const sc = (n) => { if (n == null) return ''; const x = n / U.div; const a = fmt(Math.abs(x), U.dp); return x < 0 ? '(' + a + ')' : a; };
  const M = (n) => 'Rp ' + fmt(n / 1e9, 1) + ' M';
  const f0 = (n) => fmt(n / 1e6, 0);

  const passed = m.passed;
  const discDone = disc.filter(d => d.done).length;
  const discPct = Math.round((discDone / disc.length) * 100);
  const allSigned = signoff.prepared && signoff.reviewed;

  const navItems = I35_STATEMENTS.map(s => {
    let status, label;
    if (s.id === 'posisi') { status = m.bs.balanced ? 'ok' : 'warn'; }
    else if (s.id === 'aruskas') { status = m.cf.ties ? 'ok' : 'warn'; }
    else if (s.id === 'calk') { status = discPct === 100 ? 'ok' : 'warn'; }
    else status = 'ok';
    return { ...s, status, statusLabel: label };
  });

  const title = I35_TITLES[tab];
  const periodTxt = tab === 'posisi' ? 'Per 31 Desember 2025' : 'Untuk tahun yang berakhir 31 Desember 2025';

  /* ---- baris dokumen bersama ---- */
  const styleFor = (lvl) => ({
    section:  { fontWeight: 800, fontSize: 12.5, paddingTop: 14, color: '#0c2430' },
    sub:      { fontWeight: 700, fontSize: 12, paddingTop: 8, color: '#28414e' },
    line:     { fontWeight: 400 },
    subtotal: { fontWeight: 700, borderTop: '1px solid #cdd5dc' },
    total:    { fontWeight: 800, borderTop: '2px solid #2a3f4a', borderBottom: '1px solid #2a3f4a', fontSize: 12.5 },
  }[lvl]);

  const R = ({ label, cy, py, lvl = 'line', note, indent }) => {
    const st = styleFor(lvl);
    return (
      <tr style={st}>
        <td style={{ padding: '3px 0', paddingLeft: lvl === 'line' ? (indent ? 28 : 16) : 0, ...st }}>
          {label}{note && <sup style={{ color: '#7a8893', marginLeft: 3, fontWeight: 400 }}>{note}</sup>}
        </td>
        <td className="num" style={{ padding: '3px 0', fontFamily: 'var(--mono)', ...st }}>{sc(cy)}</td>
        {comparative && <td className="num" style={{ padding: '3px 0', fontFamily: 'var(--mono)', color: '#7a8893', fontWeight: st.fontWeight }}>{sc(py)}</td>}
      </tr>
    );
  };

  const a = m.act;

  return (
    <>
      <SubBar moduleId="isak35" right={
        <div className="row gap8 ac">
          <span className="tiny mono" style={{ color: m.bs.balanced ? 'var(--green)' : 'var(--red)' }}>{m.bs.balanced ? '● Posisi seimbang' : '● Tidak seimbang'}</span>
          <span className="tiny mono" style={{ color: passed === m.checks.length ? 'var(--green)' : 'var(--amber)' }}>● {passed}/{m.checks.length} tie-out</span>
          <Btn sm onClick={() => nav('fsgen', { from: 'isak35' })}><I.report size={13} /> FS Generator</Btn>
          <Btn sm variant="primary" onClick={() => window.amsPrintDoc && window.amsPrintDoc()}><I.download size={14} /> Export PDF</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad">

          {/* KPI band */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(6,1fr)', marginBottom: 12 }}>
            <I35KpiTile label="Total Aset" value={M(m.bs.totalAssets.cy)} sub={'YoY ' + i35yoy(m.bs.totalAssets, fmt)} />
            <I35KpiTile label="Total Aset Neto" value={M(m.bs.totalNA.cy)} accent="var(--blue)" sub={'Naik ' + M(a.changeNA.cy) + ' tahun ini'} />
            <I35KpiTile label="Dengan Pembatasan" value={Math.round(m.bs.naReTot.cy / m.bs.totalNA.cy * 100) + '%'} accent="var(--navy)" sub={M(m.bs.naReTot.cy) + ' terikat'} />
            <I35KpiTile label="Rasio Beban Program" value={Math.round(a.programRatio.cy * 100) + '%'} accent={a.programRatio.cy >= 0.75 ? 'var(--green)' : 'var(--amber)'} sub={M(a.program.cy) + ' dari ' + M(a.expTot.cy)}>
              <div className="pbar" style={{ marginTop: 4 }}><span style={{ width: (a.programRatio.cy * 100) + '%', background: a.programRatio.cy >= 0.75 ? 'var(--green)' : 'var(--amber)' }} /></div>
            </I35KpiTile>
            <I35KpiTile label="Tie-out" value={passed + ' / ' + m.checks.length} accent={passed === m.checks.length ? 'var(--green)' : 'var(--amber)'} onClick={() => setDock('validate')} sub={passed === m.checks.length ? 'Seluruh rekonsiliasi lolos' : (m.checks.length - passed) + ' perlu perhatian'}>
              <div className="pbar" style={{ marginTop: 4 }}><span style={{ width: (passed / m.checks.length * 100) + '%', background: passed === m.checks.length ? 'var(--green)' : 'var(--amber)' }} /></div>
            </I35KpiTile>
            <I35KpiTile label="Kelengkapan CALK" value={discPct + '%'} accent={discPct === 100 ? 'var(--green)' : 'var(--amber)'} onClick={() => setDock('disclose')} sub={discDone + '/' + disc.length + ' pengungkapan'}>
              <div className="pbar" style={{ marginTop: 4 }}><span style={{ width: discPct + '%', background: discPct === 100 ? 'var(--green)' : 'var(--amber)' }} /></div>
            </I35KpiTile>
          </div>

          {/* workspace */}
          <div className="row gap12" style={{ alignItems: 'flex-start' }}>
            <div style={{ width: 212, flex: '0 0 212px', position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', gap: 12 }} className="no-print">
              <I35Nav items={navItems} active={tab} onChange={setTab} />
              <Panel noBody>
                <div className="panel-h"><h3>Penyajian</h3></div>
                <div style={{ padding: 12, display: 'grid', gap: 12 }}>
                  <div>
                    <div className="tiny muted upper" style={{ marginBottom: 5, fontWeight: 700 }}>Satuan</div>
                    <div className="seg" style={{ width: '100%' }}>
                      {['jutaan', 'ribuan', 'penuh'].map(u => <button key={u} className={unit === u ? 'on' : ''} onClick={() => setUnit(u)} style={{ flex: 1, textTransform: 'capitalize' }}>{u}</button>)}
                    </div>
                  </div>
                  <label className="row ac jb" style={{ cursor: 'pointer' }}>
                    <span style={{ fontSize: 12 }}>Kolom komparatif 2024</span>
                    <input type="checkbox" checked={comparative} onChange={e => setComparative(e.target.checked)} />
                  </label>
                  <div>
                    <div className="tiny muted upper" style={{ marginBottom: 5, fontWeight: 700 }}>Klasifikasi Beban</div>
                    <div className="seg" style={{ width: '100%' }}>
                      <button className={expenseView === 'fungsional' ? 'on' : ''} onClick={() => setExpenseView('fungsional')} style={{ flex: 1 }}>Fungsional</button>
                      <button className={expenseView === 'sifat' ? 'on' : ''} onClick={() => setExpenseView('sifat')} style={{ flex: 1 }}>Sifat</button>
                    </div>
                  </div>
                </div>
              </Panel>
              <I35Signoff moduleId="isak35" />
            </div>

            {/* dokumen */}
            <div style={{ flex: 1, minWidth: 0, background: '#e7eaef', borderRadius: 6, padding: 16, border: '1px solid var(--line)' }}>
              <div className="doc-paper" style={{ background: '#fff', maxWidth: 1080, margin: '0 auto', padding: '46px 66px', boxShadow: 'var(--shadow)', fontSize: 12.5, color: '#16242c' }}>
                <div style={{ textAlign: 'center', marginBottom: 3, fontWeight: 800, fontSize: 14 }}>{m.entity.name}</div>
                <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 12.5 }}>{title}</div>
                <div style={{ textAlign: 'center', color: '#7a8893', fontSize: 11, marginBottom: 18 }}>{periodTxt} · (dalam {U.label})</div>

                {(tab === 'posisi' || tab === 'penghasilan' || tab === 'aruskas') && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: '1.5px solid #2a3f4a' }}>
                        <th style={{ textAlign: 'left', padding: '4px 0' }}></th>
                        <th style={{ textAlign: 'right', padding: '4px 0', fontSize: 11, width: 150 }}>2025</th>
                        {comparative && <th style={{ textAlign: 'right', padding: '4px 0', fontSize: 11, width: 150, color: '#7a8893' }}>2024</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {tab === 'posisi' && <>
                        <R label="ASET" lvl="section" />
                        <R label="Aset Lancar" lvl="sub" />
                        {m.bs.ca.map(l => <R key={l.code} label={l.label} cy={l.cy} py={l.py} note={l.note} />)}
                        <R label="Total Aset Lancar" cy={m.bs.totalCA.cy} py={m.bs.totalCA.py} lvl="subtotal" />
                        <R label="Aset Tidak Lancar" lvl="sub" />
                        {m.bs.nca.map(l => <R key={l.code} label={l.label} cy={l.cy} py={l.py} note={l.note} />)}
                        <R label="Total Aset Tidak Lancar" cy={m.bs.totalNCA.cy} py={m.bs.totalNCA.py} lvl="subtotal" />
                        <R label="TOTAL ASET" cy={m.bs.totalAssets.cy} py={m.bs.totalAssets.py} lvl="total" />
                        <R label="LIABILITAS DAN ASET NETO" lvl="section" />
                        <R label="Liabilitas Jangka Pendek" lvl="sub" />
                        {m.bs.cl.map(l => <R key={l.code} label={l.label} cy={l.cy} py={l.py} note={l.note} />)}
                        <R label="Total Liabilitas Jangka Pendek" cy={m.bs.totalCL.cy} py={m.bs.totalCL.py} lvl="subtotal" />
                        <R label="Liabilitas Jangka Panjang" lvl="sub" />
                        {m.bs.ncl.map(l => <R key={l.code} label={l.label} cy={l.cy} py={l.py} note={l.note} />)}
                        <R label="Total Liabilitas Jangka Panjang" cy={m.bs.totalNCL.cy} py={m.bs.totalNCL.py} lvl="subtotal" />
                        <R label="Aset Neto" lvl="sub" />
                        {m.bs.naUn.map(l => <R key={l.code} label={l.label} cy={l.cy} py={l.py} note={l.note} />)}
                        {m.bs.naRe.map(l => <R key={l.code} label={l.label} cy={l.cy} py={l.py} note={l.note} />)}
                        <R label="Total Aset Neto" cy={m.bs.totalNA.cy} py={m.bs.totalNA.py} lvl="subtotal" />
                        <R label="TOTAL LIABILITAS DAN ASET NETO" cy={m.bs.totalLNA.cy} py={m.bs.totalLNA.py} lvl="total" />
                      </>}

                      {tab === 'penghasilan' && <>
                        <R label="TANPA PEMBATASAN DARI PEMBERI SUMBER DAYA" lvl="section" />
                        <R label="Penghasilan" lvl="sub" />
                        {a.incomeUn.map(l => <R key={l.key} label={l.label} cy={l.cy} py={l.py} note={l.note} indent />)}
                        <R label={a.release.label} cy={a.release.cy} py={a.release.py} note="12" indent />
                        <R label="Total Penghasilan Tanpa Pembatasan" cy={a.totUnAvail.cy} py={a.totUnAvail.py} lvl="subtotal" />
                        <R label={'Beban' + (expenseView === 'sifat' ? ' (menurut sifat)' : ' (menurut fungsi)')} lvl="sub" />
                        {(expenseView === 'sifat' ? i35ExpenseByNature(a.expense) : a.expense).map(l => <R key={l.key} label={l.label} cy={-l.cy} py={-l.py} note={l.note} indent />)}
                        <R label="Total Beban" cy={-a.expTot.cy} py={-a.expTot.py} lvl="subtotal" />
                        <R label="SURPLUS (DEFISIT) — TANPA PEMBATASAN" cy={a.surplusUn.cy} py={a.surplusUn.py} lvl="subtotal" />
                        <R label="DENGAN PEMBATASAN DARI PEMBERI SUMBER DAYA" lvl="section" />
                        {a.incomeRe.map(l => <R key={l.key} label={l.label} cy={l.cy} py={l.py} note={l.note} indent />)}
                        <R label={a.release.label} cy={-a.release.cy} py={-a.release.py} note="12" indent />
                        <R label="SURPLUS (DEFISIT) — DENGAN PEMBATASAN" cy={a.surplusRe.cy} py={a.surplusRe.py} lvl="subtotal" />
                        <R label="KENAIKAN ASET NETO" cy={a.changeNA.cy} py={a.changeNA.py} lvl="subtotal" />
                        <R label="Penghasilan komprehensif lain" cy={a.oci.cy} py={a.oci.py} />
                        <R label="TOTAL PENGHASILAN KOMPREHENSIF" cy={a.totalComp.cy} py={a.totalComp.py} lvl="total" />
                      </>}

                      {tab === 'aruskas' && <>
                        <R label="ARUS KAS DARI AKTIVITAS OPERASI" lvl="section" />
                        {m.cf.cfo.map((l, i) => l.head ? <R key={i} label={l.label} lvl="sub" /> : <R key={i} label={l.label} cy={l.v} indent={!/Perubahan aset neto/.test(l.label)} />)}
                        <R label="Kas Neto dari Aktivitas Operasi" cy={m.cf.cfoTotal} lvl="subtotal" />
                        <R label="ARUS KAS DARI AKTIVITAS INVESTASI" lvl="section" />
                        {m.cf.cfi.map((l, i) => <R key={'i' + i} label={l.label} cy={l.v} indent />)}
                        <R label="Kas Neto untuk Aktivitas Investasi" cy={m.cf.cfiTotal} lvl="subtotal" />
                        <R label="ARUS KAS DARI AKTIVITAS PENDANAAN" lvl="section" />
                        {m.cf.cff.map((l, i) => <R key={'f' + i} label={l.label} cy={l.v} indent />)}
                        <R label="Kas Neto dari Aktivitas Pendanaan" cy={m.cf.cffTotal} lvl="subtotal" />
                        <R label="KENAIKAN KAS DAN SETARA KAS — NETO" cy={m.cf.netChange} lvl="subtotal" />
                        <R label="Kas dan setara kas awal tahun" cy={m.cf.cashOpen} />
                        <R label="KAS DAN SETARA KAS AKHIR TAHUN" cy={m.cf.cashClose} lvl="total" />
                      </>}
                    </tbody>
                  </table>
                )}

                {tab === 'perubahan' && <I35EquityStatement m={m} sc={sc} />}
                {tab === 'calk' && <I35Calk m={m} f0={f0} disc={disc} />}

                {tab === 'penghasilan' && (
                  <div style={{ marginTop: 14, padding: '9px 12px', border: '1px dashed #c2cbd2', borderRadius: 6, fontSize: 11, color: '#465a66', lineHeight: 1.55 }}>
                    <b>Penyajian ISAK 35:</b> hasil periode disebut <b>surplus/(defisit)</b>, bukan laba/rugi. Penghasilan & beban dikelompokkan menurut kelas aset neto (tanpa & dengan pembatasan). Baris <b>"{a.release.label}"</b> merupakan reklasifikasi — masuk ke kelas tanpa pembatasan dan keluar dari kelas dengan pembatasan dalam jumlah sama, sehingga berjumlah nol pada total (¶11).
                  </div>
                )}
                {tab === 'posisi' && !m.bs.balanced && <div style={{ marginTop: 14, color: '#b3261e', fontSize: 11, fontWeight: 600 }}>⚠ Posisi keuangan tidak seimbang — periksa pemetaan akun.</div>}

                <div style={{ marginTop: 22, paddingTop: 12, borderTop: '1px solid #e0e4e8', color: '#7a8893', fontSize: 10.5, lineHeight: 1.5 }}>
                  Catatan atas laporan keuangan merupakan bagian yang tidak terpisahkan dari laporan keuangan ini. Disusun sesuai ISAK 35 — Penyajian Laporan Keuangan Entitas Berorientasi Nonlaba; angka diturunkan dari saldo buku besar setelah penyesuaian audit (NeoSuite AMS).
                  {allSigned && <span> · Disusun {signoff.prepared.by} ({signoff.prepared.date}); direviu {signoff.reviewed.by} ({signoff.reviewed.date}).</span>}
                </div>
              </div>
            </div>

            {/* dock kanan */}
            <div style={{ width: 324, flex: '0 0 324px', position: 'sticky', top: 0 }} className="no-print">
              <Panel noBody>
                <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}>
                  <Tabs tabs={[{ id: 'validate', label: 'Validasi', count: passed + '/' + m.checks.length }, { id: 'disclose', label: 'CALK', count: discPct + '%' }, { id: 'audit', label: 'Audit' }]} active={dock} onChange={setDock} />
                </div>
                <div style={{ maxHeight: 'calc(100vh - 150px)', overflow: 'auto' }}>
                  {dock === 'validate' && <I35Validation checks={m.checks} sc={sc} unitLabel={U.label} />}
                  {dock === 'disclose' && <I35Disclosure disc={disc} setDisc={setDisc} />}
                  {dock === 'audit' && <I35Audit proc={m.proc} done={procDone} setDone={setProcDone} nav={nav} />}
                </div>
              </Panel>
            </div>
          </div>

          <div className="tiny muted" style={{ padding: '10px 2px 4px', lineHeight: 1.5 }}>
            Kertas kerja ini menelusuri penyajian laporan keuangan <b>{m.entity.name}</b> ({m.entity.legal}) terhadap <b>ISAK 35</b> — dari klasifikasi aset neto, penyajian penghasilan komprehensif & pelepasan pembatasan, hingga daftar-uji pengungkapan. Seluruh angka ditarik dari satu sumber kebenaran <span className="mono">AMS_CANON.isak35()</span>. Status tersimpan otomatis untuk jejak audit.
          </div>
        </div>
      </div>
    </>
  );
}

function i35yoy(o, fmt) { const d = (o.cy - o.py) / Math.abs(o.py || 1) * 100; return (d >= 0 ? '+' : '') + fmt(d, 1) + '%'; }

/* beban menurut sifat (ilustratif, total identik dgn fungsional) */
function i35ExpenseByNature(expense) {
  const tot = expense.reduce((a, e) => a + e.cy, 0);
  const totPy = expense.reduce((a, e) => a + e.py, 0);
  const split = [
    { key: 'gaji', label: 'Beban gaji & imbalan kerja', p: 0.54, note: '15' },
    { key: 'penyusutan', label: 'Beban penyusutan', p: 0.097, note: '8' },
    { key: 'beasiswa', label: 'Beban beasiswa & bantuan langsung', p: 0.157, note: '15' },
    { key: 'operasional', label: 'Beban operasional & pemeliharaan', p: 0.126, note: '' },
    { key: 'umum', label: 'Beban administrasi & umum', p: 0.08, note: '16' },
  ];
  return split.map(s => ({ key: s.key, label: s.label, note: s.note, cy: Math.round(tot * s.p), py: Math.round(totPy * s.p) }));
}

/* ---- Laporan Perubahan Aset Neto (kolom rollforward) ---- */
function I35EquityStatement({ m, sc }) {
  const e = m.equityRoll;
  const rows = [
    { l: 'Saldo per 1 Januari 2025', un: e.un.open, re: e.re.open, strong: true },
    { l: 'Surplus (defisit) tahun berjalan', un: e.un.change, re: e.re.change },
    { l: 'Penghasilan komprehensif lain', un: e.un.oci, re: e.re.oci },
    { l: 'Saldo per 31 Desember 2025', un: e.un.close, re: e.re.close, total: true },
  ];
  const cell = (v, bold) => <td className="num" style={{ padding: '5px 0', fontFamily: 'var(--mono)', fontWeight: bold ? 800 : 500 }}>{sc(v)}</td>;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr style={{ borderBottom: '1.5px solid #2a3f4a' }}>
          <th style={{ textAlign: 'left', padding: '4px 0' }}></th>
          <th style={{ textAlign: 'right', padding: '4px 0', fontSize: 10.5, width: 150 }}>Tanpa Pembatasan</th>
          <th style={{ textAlign: 'right', padding: '4px 0', fontSize: 10.5, width: 150 }}>Dengan Pembatasan</th>
          <th style={{ textAlign: 'right', padding: '4px 0', fontSize: 10.5, width: 130 }}>Total Aset Neto</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ borderTop: r.total ? '2px solid #2a3f4a' : r.strong ? 'none' : '1px solid #eef1f4', borderBottom: r.total ? '1px solid #2a3f4a' : 'none' }}>
            <td style={{ padding: '5px 0', fontWeight: r.total || r.strong ? 700 : 400, color: r.total || r.strong ? '#0c2430' : '#28414e' }}>{r.l}</td>
            {cell(r.un, r.total)}
            {cell(r.re, r.total)}
            {cell(r.un + r.re, r.total)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ---- CALK ---- */
function I35Calk({ m, f0, disc }) {
  const e = m.entity;
  const get = (grp, code) => m.bs[grp].find(l => l.code === code);
  const note = (no, title, body, std) => (
    <div style={{ marginBottom: 13 }}>
      <div className="row ac gap8" style={{ marginBottom: 4 }}>
        <span style={{ fontWeight: 700, fontSize: 12, color: '#0c2430' }}>{no}. {title}</span>
        {std && <span style={{ fontSize: 9.5, fontWeight: 700, color: '#005085', background: '#e3eef6', padding: '1px 6px', borderRadius: 9 }}>{std}</span>}
      </div>
      <div style={{ fontSize: 11.5, lineHeight: 1.6, color: '#283b46' }}>{body}</div>
    </div>
  );
  const done = disc.filter(d => d.done).length;
  return (
    <div>
      {note('1', 'Umum', `${e.name} ("Yayasan") merupakan entitas berorientasi nonlaba yang bergerak di bidang ${e.sector.toLowerCase()}, berkedudukan di ${e.city}, didirikan berdasarkan ${e.legal}. Laporan keuangan disusun sesuai Standar Akuntansi Keuangan di Indonesia dengan penyajian mengikuti ISAK 35.`, 'ISAK 35')}
      {note('2', 'Dasar Penyusunan', 'Laporan keuangan disusun atas dasar akrual dan konsep biaya historis. Ekuitas disajikan sebagai aset neto yang diklasifikasikan menjadi (a) tanpa pembatasan dan (b) dengan pembatasan dari pemberi sumber daya. Mata uang penyajian dan fungsional adalah Rupiah.', 'ISAK 35')}
      {note('3', 'Kebijakan Akuntansi Signifikan', 'Sumbangan & hibah diakui saat hak atas sumber daya timbul; pembatasan dari pemberi sumber daya menentukan klasifikasi aset neto. Pendapatan jasa layanan pendidikan diakui pada periode jasa diberikan. Investasi diukur pada nilai wajar. Piutang disajikan neto setelah cadangan kerugian kredit ekspektasian.', 'PSAK 1')}
      {note('4', 'Kas dan Setara Kas', `Saldo per 31 Desember 2025 sebesar Rp ${f0(get('ca', '1-1100').cy)} juta (2024: Rp ${f0(get('ca', '1-1100').py)} juta), terdiri atas kas, bank, dan deposito jatuh tempo ≤ 3 bulan.`)}
      {note('6', 'Piutang Hibah & Sumbangan Terikat', `Piutang hibah Rp ${f0(get('ca', '1-1300').cy)} juta mencerminkan komitmen pemberi sumber daya yang belum dicairkan; pencairan terikat pada pemenuhan tujuan program tertentu.`, 'ISAK 35')}
      {note('7', 'Investasi & Dana Abadi', `Investasi jangka pendek Rp ${f0(get('ca', '1-1600').cy)} juta. Investasi dana abadi (endowment) Rp ${f0(get('nca', '1-2100').cy)} juta dikelola untuk menghasilkan imbal hasil yang sebagian terikat pemberi sumber daya.`, 'PSAK 71')}
      {note('8', 'Aset Tetap — Neto', `Nilai tercatat neto Rp ${f0(get('nca', '1-2200').cy)} juta. Penyusutan periode berjalan Rp ${f0(m.cf.depreciation)} juta dengan metode garis lurus selama masa manfaat.`, 'PSAK 16')}
      {note('12', 'Aset Neto Dengan Pembatasan', `Aset neto dengan pembatasan Rp ${f0(m.bs.naReTot.cy)} juta terdiri atas dana yang dibatasi untuk program beasiswa, pembangunan fasilitas, dan dana abadi. Selama tahun berjalan, Rp ${f0(m.act.release.cy)} juta dibebaskan dari pembatasan karena pemenuhan tujuan program & berakhirnya pembatasan waktu (ISAK 35 ¶11).`, 'ISAK 35')}
      {note('15', 'Beban Program', `Total beban program Rp ${f0(m.act.program.cy)} juta (${Math.round(m.act.programRatio.cy * 100)}% dari total beban) mencakup pendidikan & pengajaran, beasiswa, serta riset dan pengabdian masyarakat. Beban pendukung (manajemen, umum & penggalangan dana) Rp ${f0(m.act.support.cy)} juta.`, 'ISAK 35')}
      {note('17', 'Peristiwa Setelah Periode Pelaporan', 'Tidak terdapat peristiwa penyesuai material setelah tanggal pelaporan selain yang telah diungkapkan.', 'PSAK 8')}
      <div className="row ac jb" style={{ marginTop: 8, padding: '8px 11px', background: '#f3f6f9', borderRadius: 6 }}>
        <span className="tiny" style={{ color: '#465a66', fontStyle: 'italic' }}>Catatan tertaut langsung ke saldo posisi keuangan & penghasilan komprehensif. Kelengkapan pengungkapan dipantau di panel "CALK".</span>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: done === disc.length ? '#1f7a4d' : '#9a6a00', whiteSpace: 'nowrap', marginLeft: 10 }}>{done}/{disc.length}</span>
      </div>
    </div>
  );
}

/* ---- panel: validasi tie-out ---- */
function I35Validation({ checks, sc, unitLabel }) {
  return (
    <div style={{ padding: 12, display: 'grid', gap: 8 }}>
      <div className="tiny muted" style={{ lineHeight: 1.5 }}>Rekonsiliasi lintas-laporan ISAK 35. Toleransi Rp 1 juta. Satuan: {unitLabel}.</div>
      {checks.map(c => (
        <div key={c.id} className="panel" style={{ padding: '9px 11px', borderColor: c.ok ? 'transparent' : 'var(--amber)', background: c.ok ? 'var(--green-bg)' : 'var(--amber-bg)' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: c.ok ? 'var(--green)' : 'var(--amber)', marginTop: 1, flex: '0 0 auto' }}>{c.ok ? <I.checkCircle size={15} /> : <I.clock size={15} />}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="row ac jb gap6">
                <span style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.3 }}>{c.label}</span>
                <span className="tiny mono" style={{ color: 'var(--ink-4)', flex: '0 0 auto' }}>{c.std}</span>
              </div>
              <div className="tiny muted" style={{ lineHeight: 1.45, marginTop: 2 }}>{c.note}</div>
              <div className="row ac gap8 tiny mono" style={{ marginTop: 4, color: 'var(--ink-3)' }}>
                <span>{c.ref}</span>
                {!c.ok && <span style={{ color: 'var(--amber)', fontWeight: 700 }}>Δ {sc(c.diff)}</span>}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---- panel: daftar-uji pengungkapan ---- */
function I35Disclosure({ disc, setDisc }) {
  const toggle = (id) => setDisc(list => list.map(d => d.id === id ? { ...d, done: !d.done } : d));
  const done = disc.filter(d => d.done).length;
  return (
    <div style={{ padding: 12 }}>
      <div className="row ac jb" style={{ marginBottom: 8 }}>
        <span className="tiny muted" style={{ lineHeight: 1.4 }}>Daftar-uji pengungkapan ISAK 35 / PSAK 1. Klik untuk menandai.</span>
        <span className="mono tiny" style={{ fontWeight: 700, color: done === disc.length ? 'var(--green)' : 'var(--amber)' }}>{done}/{disc.length}</span>
      </div>
      <div style={{ display: 'grid', gap: 0 }}>
        {disc.map((d, i) => (
          <label key={d.id} className="row gap8" style={{ padding: '8px 0', cursor: 'pointer', alignItems: 'flex-start', borderBottom: i < disc.length - 1 ? '1px solid var(--line-soft)' : 0 }} onClick={() => toggle(d.id)}>
            <span style={{ flex: '0 0 16px', width: 16, height: 16, borderRadius: 4, marginTop: 1, border: '1.5px solid ' + (d.done ? 'var(--green)' : 'var(--amber)'), background: d.done ? 'var(--green)' : '#fff', display: 'grid', placeItems: 'center' }}>{d.done && <I.check size={11} style={{ color: '#fff' }} />}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11.5, lineHeight: 1.4, color: d.done ? 'var(--ink-2)' : 'var(--ink)', fontWeight: d.done ? 400 : 600 }}>{d.label}</div>
              <div className="mono tiny" style={{ color: 'var(--ink-4)', marginTop: 1 }}>{d.ref}{!d.done && <span style={{ color: 'var(--amber)', fontWeight: 700, marginLeft: 6 }}>belum lengkap</span>}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

/* ---- panel: prosedur audit ---- */
function I35Audit({ proc, done, setDone, nav }) {
  const toggle = (i) => setDone(d => ({ ...d, [i]: !d[i] }));
  const n = proc.filter((_, i) => done[i]).length;
  return (
    <div style={{ padding: 12 }}>
      <div className="row ac jb" style={{ marginBottom: 8 }}>
        <span className="tiny muted" style={{ lineHeight: 1.4 }}>Prosedur audit khusus entitas nonlaba.</span>
        <span className="mono tiny" style={{ fontWeight: 700, color: n === proc.length ? 'var(--green)' : 'var(--ink-3)' }}>{n}/{proc.length}</span>
      </div>
      <div style={{ display: 'grid', gap: 0 }}>
        {proc.map((p, i) => (
          <label key={i} className="row gap8" style={{ padding: '8px 0', cursor: 'pointer', alignItems: 'flex-start', borderBottom: i < proc.length - 1 ? '1px solid var(--line-soft)' : 0 }} onClick={() => toggle(i)}>
            <span style={{ flex: '0 0 16px', width: 16, height: 16, borderRadius: 4, marginTop: 1, border: '1.5px solid ' + (done[i] ? 'var(--green)' : 'var(--line-strong)'), background: done[i] ? 'var(--green)' : '#fff', display: 'grid', placeItems: 'center' }}>{done[i] && <I.check size={11} style={{ color: '#fff' }} />}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11.5, lineHeight: 1.4, color: done[i] ? 'var(--ink-3)' : 'var(--ink)' }}>{p.t}</div>
              <div className="mono tiny" style={{ color: 'var(--blue)', marginTop: 1, fontWeight: 600 }}>{p.ref}</div>
            </div>
          </label>
        ))}
      </div>
      <Btn sm style={{ width: '100%', marginTop: 10 }} onClick={() => nav('opinion', { from: 'isak35' })}><I.gavel size={13} /> Lanjut ke Opini Audit</Btn>
    </div>
  );
}

/* ---- rail: sign-off (kanonik wpState['isak35']) ---- */
function I35Signoff({ moduleId }) {
  const s = useWpSignoff(moduleId || 'isak35');
  const Row = ({ slot, label, signed, canSign }) => (
    <button onClick={() => signed ? s.unsign(slot) : (canSign && s.sign(slot))} disabled={!signed && !canSign}
      className="row ac gap8" style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid ' + (signed ? 'var(--green)' : 'var(--line)'), background: signed ? 'var(--green-bg)' : 'var(--surface)', cursor: (signed || canSign) ? 'pointer' : 'not-allowed', textAlign: 'left', opacity: (signed || canSign) ? 1 : 0.6 }}>
      <span style={{ color: signed ? 'var(--green)' : 'var(--ink-4)', flex: '0 0 auto' }}>{signed ? <I.checkCircle size={15} /> : <I.clock size={15} />}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="tiny muted">{label}</div>
        <div style={{ fontSize: 11.5, fontWeight: 600 }}>{signed ? signed.by : 'Belum ditandatangani'}</div>
      </div>
      {signed && <span className="tiny mono" style={{ color: 'var(--ink-4)' }}>{signed.at}</span>}
    </button>
  );
  return (
    <Panel noBody>
      <div className="panel-h"><h3>Sign-off</h3></div>
      <div style={{ padding: 10, display: 'grid', gap: 8 }}>
        <Row slot="preparer" label="Disusun oleh" signed={s.preparer} canSign={!s.locked} />
        <Row slot="reviewer" label="Direviu oleh" signed={s.reviewer} canSign={!s.locked && !!s.preparer} />
      </div>
    </Panel>
  );
}

Object.assign(window, { ISAK35View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { ISAK35View };
