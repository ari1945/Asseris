/* ============================================================
   NeoSuite AMS — PSAK 14 · Persediaan (Inventories)
   Kertas kerja penyusunan & audit Persediaan yang DITARIK PENUH
   dari satu sumber kebenaran:
     · Working Trial Balance (useAudit().wtb) — saldo akun 1-1300 & 5-1100
     · AMS_CANON.inventory(wtb) — mesin derivasi persediaan (termasuk
       register per-SKU) yang sama dipakai FS Generator (CALK 6) &
       tab Rekonsiliasi Angka
     · AMS_CANON.materiality() — ambang PM/CTT dari Materiality Workspace
     · FSGEN.buildModel(wtb) — penyajian Neraca & Laba Rugi
   Tidak ada angka yang di-hardcode. Satu perubahan AJE (mis. AJE-01
   pisah batas) mengalir serempak ke roll-forward, FS Generator,
   Rekonsiliasi, dan modul ini.

   Tata letak bertab (pola sama dgn PSAK 16):
     Ikhtisar & Roll-forward · Uji NRV (per-SKU) · Analitis & Asersi ·
     Pengungkapan & Sumber.
   ============================================================ */
const { useState: useStateP14, useMemo: useMemoP14, useEffect: useEffectP14 } = React;

/* peta asersi → prosedur audit (rujuk WP & SA yang sama dipakai Cockpit/Bukti) */
const P14_ASSERT = [
  { asr: 'Keberadaan & Kelengkapan', proc: 'Observasi perhitungan fisik (stock opname) & test count dua arah', sa: 'SA 501', wp: 'C-1', state: 'ok' },
  { asr: 'Penilaian (NRV)', proc: 'Uji nilai realisasi neto atas item slow-moving & usang', sa: 'SA 540', wp: 'C-2', state: 'warn' },
  { asr: 'Pisah Batas', proc: 'Uji cut-off penerimaan & pengiriman barang akhir tahun', sa: 'SA 501', wp: 'C-1', state: 'ok' },
  { asr: 'Hak & Kewajiban', proc: 'Telaah barang konsinyasi & persediaan yang dijaminkan', sa: 'SA 500', wp: 'C-3', state: 'ok' },
  { asr: 'Penyajian', proc: 'Klasifikasi (¶36b) & kelengkapan pengungkapan NRV', sa: 'SA 700', wp: 'C-4', state: 'ok' },
];

/* checklist pengungkapan PSAK 14 (default) */
const P14_DISCLOSURE = [
  { id: 'q36a', ref: '¶36(a)', t: 'Kebijakan akuntansi & rumus biaya (rata-rata tertimbang) diungkapkan', ok: true },
  { id: 'q36b', ref: '¶36(b)', t: 'Jumlah tercatat per klasifikasi (bahan baku, WIP, barang jadi, suku cadang)', ok: true },
  { id: 'q36d', ref: '¶36(d)', t: 'Jumlah persediaan diakui sebagai beban periode (BPP)', ok: true },
  { id: 'q36e', ref: '¶36(e)', t: 'Jumlah penurunan nilai ke NRV yang diakui sebagai beban', ok: false },
  { id: 'q36f', ref: '¶36(f)', t: 'Jumlah pemulihan penurunan & peristiwa penyebabnya', ok: true },
  { id: 'q36h', ref: '¶36(h)', t: 'Jumlah tercatat persediaan yang dijaminkan atas liabilitas', ok: false },
  { id: 'q25',  ref: '¶25',    t: 'Rumus biaya MPKP/rata-rata diterapkan konsisten; LIFO tidak digunakan', ok: true },
  { id: 'q34',  ref: '¶34',    t: 'Beban diakui pada periode pendapatan terkait diakui', ok: true },
];

function InvCard({ value, unit, label, sub, accent }) {
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

/* baris roll-forward persediaan */
function RFRow({ label, v, sc, sub, total, memo, neg }) {
  const strong = sub || total;
  const val = neg ? -Math.abs(v) : v;
  return (
    <div className="row ac jb" style={{
      padding: total ? '9px 0' : '5px 0',
      borderTop: total ? '1.5px solid var(--navy)' : (sub ? '1px solid var(--line)' : 0),
      marginTop: sub ? 4 : 0,
    }}>
      <span style={{ fontSize: total ? 12.5 : 12, fontWeight: strong ? 700 : 400, color: strong ? 'var(--ink)' : 'var(--ink-2)', lineHeight: 1.35 }}>
        {label}{memo && <span className="tiny" style={{ color: 'var(--purple)', fontWeight: 600, marginLeft: 6 }}>{memo}</span>}
      </span>
      <span className="mono" style={{ fontSize: total ? 13 : 12, fontWeight: strong ? 700 : 500, color: val < 0 ? 'var(--red)' : (strong ? 'var(--navy)' : 'var(--ink)'), whiteSpace: 'nowrap', marginLeft: 10 }}>
        {sc(val)}
      </span>
    </div>
  );
}

function PSAK14View() {
  const { fmt } = window.AMS;
  const firm = (typeof useFirm === 'function') ? useFirm() : {};
  const audit = (typeof useAudit === 'function') ? useAudit() : {};
  const nav = (typeof useNav === 'function') ? useNav() : (() => {});
  const loader = window.loadLS || ((k, d) => d);

  /* ——— SUMBER KEBENARAN ——— */
  const wtb = (audit && audit.wtb && audit.wtb.length) ? audit.wtb : ((window.AMS && window.AMS.WTB) || []);
  const model = useMemoP14(() => (window.FSGEN ? window.FSGEN.buildModel(wtb) : null), [wtb]);
  const inv = useMemoP14(() => (window.AMS_CANON ? window.AMS_CANON.inventory(wtb) : null), [wtb]);

  const [unit, setUnit] = useStateP14(() => loader('ams.psak14.unit', 'jutaan'));
  const [tab, setTab] = useStateP14(() => loader('ams.psak14.tab', 'ikhtisar'));
  const [disc, setDisc] = useStateP14(() => loader('ams.psak14.disc', P14_DISCLOSURE));
  const [formula, setFormula] = useStateP14(() => loader('ams.psak14.formula', 'wavg'));
  useEffectP14(() => { try { localStorage.setItem('ams.psak14.unit', JSON.stringify(unit)); } catch (e) {} }, [unit]);
  useEffectP14(() => { try { localStorage.setItem('ams.psak14.tab', JSON.stringify(tab)); } catch (e) {} }, [tab]);
  useEffectP14(() => { try { localStorage.setItem('ams.psak14.disc', JSON.stringify(disc)); } catch (e) {} }, [disc]);
  useEffectP14(() => { try { localStorage.setItem('ams.psak14.formula', JSON.stringify(formula)); } catch (e) {} }, [formula]);
  const toggleDisc = (id) => setDisc(list => list.map(r => r.id === id ? { ...r, ok: !r.ok } : r));

  if (!model || !inv) {
    return <><SubBar moduleId="psak14" /><div className="view-pad"><Panel title="PSAK 14"><div className="tiny muted">Mesin FS Generator / kanonik belum dimuat.</div></Panel></div></>;
  }

  const client = firm.activeClient || { name: 'PT Sentosa Makmur Tbk' };
  const eng = firm.activeEngagement || { id: 'ENG-2025-014', fy: 'FY2025' };
  const aje01 = ((window.AMS && window.AMS.AJE) || []).find(a => a.id === 'AJE-01');
  const riskInv = ((window.AMS && window.AMS.RISKS) || []).find(r => r.id === 'R-02');

  /* ——— skala penyajian (kanonik dalam Rp juta) ——— */
  const UN = unit === 'penuh' ? { mult: 1e6, short: 'Rp' } : { mult: 1, short: 'Rp jt' };
  const sc = (vJuta) => fmt(Math.round(vJuta * UN.mult), 0);

  /* ——— roll-forward mutasi persediaan (¶34) ——— */
  const rf = [
    { label: 'Persediaan awal — 1 Jan 2025 (audited)', v: inv.openingCost },
    { label: 'Pembelian & biaya konversi', v: inv.purchases, memo: 'derivasi' },
    { label: 'Barang tersedia untuk dijual', v: inv.goodsAvail, sub: true },
    { label: 'Beban pokok penjualan — sebelum audit', v: inv.cogsUnadj, neg: true },
    { label: 'Persediaan akhir — sebelum audit', v: inv.closeUnadj, sub: true },
    { label: 'Penyesuaian audit · pisah batas (AJE-01)', v: inv.ajeInv },
    { label: 'Persediaan akhir — audited (31 Des 2025)', v: inv.closeNet, total: true },
  ];

  /* ——— aging barang jadi (dari mesin kanonik — dasar reqWD barang jadi) ——— */
  const aging = inv.fgAging;
  const agingWD = inv.fgReqWD;

  /* ——— tie-out lintas-laporan (semua ditarik live, dalam Rp juta) ——— */
  const M = (full) => full / 1e6;
  const persedBS = model.bs.ca.find(l => l.key === 'persed');
  const tieRows = [
    { id: 't1', label: 'Roll-forward menutup ke saldo persediaan neraca', std: '¶34', a: inv.closeNet, b: M(model.bs.ca.find(l => l.key === 'persed').cy), note: 'Awal + pembelian − BPP + AJE = Persediaan (WTB 1-1300 adjusted).' },
    { id: 't2', label: 'BPP audited = WTB 5-1100', std: '¶34', a: inv.cogsAdj, b: M(model.is.cogs.cy), note: 'Beban pokok penjualan audited menutup ke buku besar 5-1100.' },
    { id: 't3', label: 'Persediaan = pos Neraca FS Generator', std: 'PSAK 1', a: inv.closeNet, b: M(persedBS.cy), note: 'Nilai tercatat neto sama dengan pos Persediaan pada Laporan Posisi Keuangan.' },
    { id: 't4', label: 'Saldo awal = komparatif WTB 2024', std: '¶36', a: inv.openingCost, b: M((wtb.find(r => r.code === '1-1300') || {}).ly || 0), note: 'Persediaan awal = saldo audited periode lalu (kolom komparatif WTB).' },
    { id: 't5', label: 'Penyesuaian pisah batas terposting = AJE-01', std: 'SA 450', a: inv.ajeInv, b: M((wtb.find(r => r.code === '1-1300') || {}).aje || 0), note: 'AJE-01 (Posted) Rp ' + fmt(Math.abs(inv.ajeInv)) + ' jt tercermin pada saldo adjusted.' },
    { id: 't6', label: 'Marjin kotor mengalir ke Laba Rugi', std: 'PSAK 1', a: inv.gm, b: M(model.is.gross.cy), note: 'Penjualan − BPP = laba bruto pada Laporan Laba Rugi.' },
  ].map(r => ({ ...r, diff: r.a - r.b, ok: Math.abs(r.a - r.b) < 1.5 }));
  const tiePass = tieRows.filter(r => r.ok).length;

  /* ——— lineage: tiap angka punya satu sumber ——— */
  const lineage = [
    { k: 'Persediaan — nilai tercatat neto', src: 'WTB · 1-1300', route: 'wtb', icon: 'ledger' },
    { k: 'Beban pokok penjualan', src: 'WTB · 5-1100', route: 'wtb', icon: 'ledger' },
    { k: 'Penyajian Neraca & CALK 6', src: 'FS Generator', route: 'fsgen', icon: 'report' },
    { k: 'Penyesuaian pisah batas (AJE-01)', src: 'Buku Besar · AJE', route: 'aje', icon: 'scale' },
    { k: 'Risiko penilaian persediaan (R-02)', src: 'Penilaian Risiko', route: 'risk', icon: 'flag' },
    { k: 'Materialitas pelaksanaan (PM) & CTT', src: 'SA 320 · Materialitas', route: 'materiality', icon: 'target' },
    { k: 'Estimasi NRV (item usang)', src: 'SA 540 · Estimasi', route: 'sa540', icon: 'target' },
    { k: 'Observasi stock opname', src: 'SA 501 · WP C-1', route: 'sa501', icon: 'search2' },
    { k: 'Selisih NRV → akumulasi salah saji', src: 'SAD Ledger', route: 'sad', icon: 'scale' },
  ];

  const discOk = disc.filter(d => d.ok).length;
  /* ——— materialitas: SATU sumber dari SA 320 (Materiality Workspace) ———
     membaca konfigurasi benchmark/PM%/CTT% & override yang sama dipakai modul
     Materialitas & SAD — bukan lagi hardcode 75%. */
  const mat = (window.AMS_CANON && window.AMS_CANON.materiality)
    ? window.AMS_CANON.materiality({ engMateriality: eng.materiality })
    : { pm: null, ctt: null, om: null };
  const overMat  = inv.shortfallWD;                      // usulan penurunan belum dibukukan (juta)
  const pm  = mat.pm;                                     // materialitas pelaksanaan (juta)
  const ctt = mat.ctt;                                    // ambang jelas remeh (juta)
  const abovePM  = pm  != null ? overMat > pm  : null;   // signifikan secara individual?
  const aboveCTT = ctt != null ? overMat > ctt : null;   // wajib diakumulasi ke SAD?
  const STATE = { ok: { kind: 'green', I: 'checkCircle', c: 'var(--green)' }, warn: { kind: 'amber', I: 'alert', c: 'var(--amber)' } };

  /* ============ PANEL: roll-forward (¶34) ============ */
  const rollforwardPanel = (
    <Panel noBody>
      <div className="panel-h">
        <h3>Mutasi Persediaan (Roll-forward)</h3>
        <span className="sub">1 Jan – 31 Des 2025 · {UN.short}</span>
        <div style={{ flex: 1 }} />
        <span className="tiny muted">ditarik dari WTB & BPP</span>
      </div>
      <div style={{ padding: '6px 16px 14px' }}>
        {rf.map((l, i) => <RFRow key={i} {...l} sc={sc} />)}
        <div className="panel" style={{ marginTop: 12, padding: '9px 11px', background: 'var(--green-bg)', borderColor: 'transparent' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--green)', marginTop: 1 }}><I.checkCircle size={15} /></span>
            <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>
              Pembelian Rp {sc(inv.purchases)} {UN.short} merupakan <b>derivasi</b> (saldo akhir − awal + BPP) sehingga roll-forward menutup. Penyesuaian <b>pisah batas (AJE-01)</b> Rp {fmt(Math.abs(inv.ajeInv))} jt menurunkan persediaan & menaikkan BPP — saldo akhir menutup persis ke <b>WTB 1-1300</b>.
            </span>
          </div>
        </div>
      </div>
    </Panel>
  );

  /* ============ PANEL: klasifikasi (¶36b) ============ */
  const klasifikasiPanel = (
    <Panel noBody>
      <div className="panel-h"><h3>Klasifikasi Persediaan</h3><span className="sub mono">¶36(b)</span><div style={{ flex: 1 }} /><span className="tiny muted">biaya − cadangan = neto</span></div>
      <div style={{ padding: '4px 14px 12px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead>
            <tr style={{ color: 'var(--ink-4)', textAlign: 'right' }}>
              <th style={{ textAlign: 'left', fontWeight: 600, padding: '6px 4px' }}>Klasifikasi</th>
              <th style={{ fontWeight: 600, padding: '6px 4px' }}>Biaya perolehan</th>
              <th style={{ fontWeight: 600, padding: '6px 4px' }}>Cadangan NRV</th>
              <th style={{ fontWeight: 600, padding: '6px 4px' }}>Nilai tercatat neto</th>
              <th style={{ fontWeight: 600, padding: '6px 4px' }}>%</th>
            </tr>
          </thead>
          <tbody>
            {inv.mix.map((r, i) => (
              <tr key={i} style={{ borderTop: '1px solid var(--line-soft)' }}>
                <td style={{ padding: '7px 4px', fontWeight: 600 }}>{r.label}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '7px 4px' }}>{sc(r.cost)}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '7px 4px', color: 'var(--red)' }}>{sc(-r.bookedWD)}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '7px 4px', fontWeight: 600 }}>{sc(r.carry)}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '7px 4px', color: 'var(--ink-4)' }}>{fmt(r.pct * 100, 0)}</td>
              </tr>
            ))}
            <tr style={{ borderTop: '1.5px solid var(--navy)', fontWeight: 700 }}>
              <td style={{ padding: '8px 4px' }}>Total persediaan</td>
              <td className="mono" style={{ textAlign: 'right', padding: '8px 4px' }}>{sc(inv.grossCost)}</td>
              <td className="mono" style={{ textAlign: 'right', padding: '8px 4px', color: 'var(--red)' }}>{sc(-inv.bookedWD)}</td>
              <td className="mono" style={{ textAlign: 'right', padding: '8px 4px', color: 'var(--navy)' }}>{sc(inv.closeNet)}</td>
              <td className="mono" style={{ textAlign: 'right', padding: '8px 4px', color: 'var(--ink-4)' }}>100</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );

  /* ============ PANEL: uji NRV ringkasan klasifikasi (¶28–33) ============ */
  const ujiNrvPanel = (
    <Panel noBody>
      <div className="panel-h"><h3>Uji Nilai Realisasi Neto — Ikhtisar</h3><span className="sub mono">¶28–33</span><div style={{ flex: 1 }} /><Badge kind="amber">SA 540 · WP C-2</Badge></div>
      <div style={{ padding: '4px 14px 12px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead>
            <tr style={{ color: 'var(--ink-4)', textAlign: 'right' }}>
              <th style={{ textAlign: 'left', fontWeight: 600, padding: '6px 4px' }}>Klasifikasi</th>
              <th style={{ fontWeight: 600, padding: '6px 4px' }}>Biaya</th>
              <th style={{ fontWeight: 600, padding: '6px 4px' }}>NRV taksiran</th>
              <th style={{ fontWeight: 600, padding: '6px 4px' }}>Penurunan</th>
              <th style={{ fontWeight: 600, padding: '6px 4px' }}>Dibukukan</th>
              <th style={{ fontWeight: 600, padding: '6px 4px' }}>Selisih</th>
            </tr>
          </thead>
          <tbody>
            {inv.mix.map((r, i) => (
              <tr key={i} style={{ borderTop: '1px solid var(--line-soft)' }}>
                <td style={{ padding: '7px 4px', fontWeight: 600 }}>{r.label}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '7px 4px' }}>{sc(r.cost)}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '7px 4px' }}>{sc(r.nrv)}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '7px 4px', color: 'var(--amber)' }}>{sc(r.reqWD)}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '7px 4px', color: 'var(--ink-4)' }}>{sc(r.bookedWD)}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '7px 4px', fontWeight: 600, color: r.shortfall > 0 ? 'var(--red)' : 'var(--green)' }}>{sc(r.shortfall)}</td>
              </tr>
            ))}
            <tr style={{ borderTop: '1.5px solid var(--navy)', fontWeight: 700 }}>
              <td style={{ padding: '8px 4px' }}>Total</td>
              <td className="mono" style={{ textAlign: 'right', padding: '8px 4px' }}>{sc(inv.grossCost)}</td>
              <td className="mono" style={{ textAlign: 'right', padding: '8px 4px' }}>{sc(inv.grossCost - inv.requiredWD)}</td>
              <td className="mono" style={{ textAlign: 'right', padding: '8px 4px', color: 'var(--amber)' }}>{sc(inv.requiredWD)}</td>
              <td className="mono" style={{ textAlign: 'right', padding: '8px 4px', color: 'var(--ink-4)' }}>{sc(inv.bookedWD)}</td>
              <td className="mono" style={{ textAlign: 'right', padding: '8px 4px', color: 'var(--red)' }}>{sc(inv.shortfallWD)}</td>
            </tr>
          </tbody>
        </table>
        <div onClick={() => nav('sad', { from: 'psak14' })} className="row ac jb" style={{ marginTop: 10, padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', background: 'var(--amber-bg)', cursor: 'pointer' }}>
          <span style={{ fontSize: 11.5, lineHeight: 1.4 }}>Persediaan diukur pada <b>nilai terendah biaya & NRV</b> (¶9). Uji menunjukkan penurunan kurang dibukukan Rp <b>{fmt(inv.shortfallWD)} jt</b>{aboveCTT != null && <> — {aboveCTT ? <>di atas ambang jelas remeh (CTT Rp {fmt(ctt)} jt), <b>wajib diakumulasikan ke SAD</b></> : <>di bawah ambang jelas remeh (CTT Rp {fmt(ctt)} jt)</>}{abovePM ? <>; bahkan <b style={{ color: 'var(--red)' }}>melampaui PM Rp {fmt(pm)} jt</b></> : null}</>}. Rincian per-SKU pada kertas kerja di bawah.</span>
          <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--amber)', whiteSpace: 'nowrap', marginLeft: 8 }}>Usulkan ke SAD <I.arrowRight size={12} /></span>
        </div>
      </div>
    </Panel>
  );

  /* ============ PANEL: umur barang jadi ============ */
  const agingPanel = (
    <Panel title="Umur Barang Jadi (Slow-moving)" sub="dasar taksiran NRV barang jadi">
      <div style={{ display: 'grid', gap: 0 }}>
        {aging.map((b, i) => (
          <div key={i} className="row ac jb" style={{ padding: '7px 0', borderBottom: i < aging.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.25 }}>{b.band}</div>
              <div className="tiny muted">{b.lbl} · penurunan {fmt(b.rate * 100, 0)}%</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="mono" style={{ fontSize: 12, fontWeight: 500 }}>{sc(b.amt)}</div>
              <div className="mono tiny" style={{ color: b.wd ? 'var(--amber)' : 'var(--ink-4)' }}>{b.wd ? '−' + sc(b.wd) : '—'}</div>
            </div>
          </div>
        ))}
        <div className="row ac jb" style={{ padding: '8px 0' }}>
          <span style={{ fontSize: 12, fontWeight: 700 }}>Taksiran penurunan barang jadi</span>
          <span className="mono" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--amber)' }}>{sc(agingWD)}</span>
        </div>
      </div>
    </Panel>
  );

  /* ============ PANEL: analitis (SA 520) ============ */
  const analitisPanel = (
    <Panel title="Analitis Persediaan" sub="SA 520 · prosedur analitis">
      <div style={{ display: 'grid', gap: 0 }}>
        <div className="row ac jb" style={{ padding: '7px 0', borderBottom: '1px solid var(--line-soft)' }}>
          <span style={{ fontSize: 12 }}>Perputaran persediaan</span>
          <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{fmt(inv.turnover, 2)}×</span>
        </div>
        <div className="row ac jb" style={{ padding: '7px 0', borderBottom: '1px solid var(--line-soft)' }}>
          <span style={{ fontSize: 12 }}>Hari persediaan (DIO)</span>
          <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{fmt(inv.dio, 0)} hari</span>
        </div>
        <div className="row ac jb" style={{ padding: '7px 0', borderBottom: '1px solid var(--line-soft)' }}>
          <span style={{ fontSize: 12 }}>Marjin kotor</span>
          <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)' }}>{fmt(inv.gmPct * 100, 1)}%</span>
        </div>
        <div className="row ac jb" style={{ padding: '7px 0' }}>
          <span style={{ fontSize: 12 }}>Saldo rata-rata</span>
          <span className="mono" style={{ fontSize: 12, fontWeight: 500 }}>{sc(inv.avgInv)}</span>
        </div>
      </div>
      <div className="tiny muted" style={{ marginTop: 6, lineHeight: 1.5 }}>
        DIO {fmt(inv.dio, 0)} hari mengindikasikan perputaran lambat — konsisten dengan {riskInv ? <b>{riskInv.id} · {riskInv.inherent}</b> : 'risiko keusangan'} ({riskInv ? riskInv.desc.toLowerCase() : 'persediaan usang tidak diturunkan ke NRV'}).
      </div>
    </Panel>
  );

  /* ============ PANEL: rumus biaya & pengukuran (¶9–25) ============ */
  const pengukuranPanel = (
    <Panel noBody>
      <div className="panel-h"><h3>Pengukuran & Rumus Biaya</h3><span className="sub mono">¶9–25</span></div>
      <div style={{ padding: '10px 13px', display: 'grid', gap: 9 }}>
        <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>Diukur pada <b>nilai terendah</b> antara biaya perolehan & nilai realisasi neto (¶9). Biaya mencakup pembelian, konversi & biaya lain hingga lokasi & kondisi kini (¶10).</div>
        <div className="seg" style={{ width: 'fit-content' }}>
          <button className={formula === 'wavg' ? 'on' : ''} onClick={() => setFormula('wavg')}>Rata-rata tertimbang</button>
          <button className={formula === 'fifo' ? 'on' : ''} onClick={() => setFormula('fifo')}>MPKP (FIFO)</button>
        </div>
        <div className="panel" style={{ padding: '8px 10px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
          <div className="row gap6" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--amber)', marginTop: 1 }}><I.alert size={14} /></span>
            <span className="tiny" style={{ lineHeight: 1.45 }}>Metode <b>MTKP (LIFO) dilarang</b> oleh PSAK 14 ¶25. Rumus biaya diterapkan konsisten untuk persediaan sejenis.</span>
          </div>
        </div>
        <div style={{ fontSize: 11, lineHeight: 1.5, color: 'var(--ink-3)', borderTop: '1px solid var(--line-soft)', paddingTop: 8 }}>
          <b>Pengendalian NRV (ICFR I-02):</b> ber-status <b style={{ color: 'var(--amber)' }}>defisiensi</b> → prosedur substantif NRV diperluas (SA 540), tercermin pada kertas kerja per-SKU.
        </div>
      </div>
    </Panel>
  );

  /* ============ PANEL: asersi & prosedur ============ */
  const asersiPanel = (
    <Panel noBody>
      <div className="panel-h"><h3>Asersi & Prosedur Audit</h3><div style={{ flex: 1 }} /><span className="tiny muted">SA 501 · SA 540</span></div>
      <div>
        {P14_ASSERT.map((r, i) => {
          const st = STATE[r.state];
          return (
            <div key={i} className="row ac gap10" style={{ padding: '9px 14px', borderBottom: i < P14_ASSERT.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
              <span style={{ color: st.c, display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>{r.state === 'ok' ? <I.checkCircle size={15} /> : <I.alert size={15} />}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.3 }}>{r.asr}</div>
                <div className="tiny muted">{r.proc}</div>
              </div>
              <Badge kind="gray">{r.sa}</Badge>
              <span className="mono tiny" style={{ color: 'var(--ink-4)', width: 30, textAlign: 'right' }}>{r.wp}</span>
            </div>
          );
        })}
      </div>
      <div className="tiny muted" style={{ padding: '9px 14px', lineHeight: 1.5, borderTop: '1px solid var(--line-soft)' }}>
        Pengendalian NRV (ICFR <b>I-02</b>) ber-status <b style={{ color: 'var(--amber)' }}>defisiensi</b> → prosedur substantif NRV diperluas (SA 540).
      </div>
    </Panel>
  );

  /* ============ PANEL: tie-out ============ */
  const tieoutPanel = (
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
  );

  /* ============ PANEL: lineage ============ */
  const lineagePanel = (
    <Panel noBody>
      <div className="panel-h"><h3>Sumber Data (Lineage)</h3><div style={{ flex: 1 }} /><span className="tiny muted">klik untuk telusuri</span></div>
      <div style={{ padding: 6 }}>
        {lineage.map((r, i) => {
          const IconC = I[r.icon] || I.doc;
          return (
            <button key={i} onClick={() => nav(r.route, { from: 'psak14' })} className="row ac gap9" style={{ width: '100%', textAlign: 'left', padding: '8px 9px', borderRadius: 7, border: '1px solid transparent', background: 'none', cursor: 'pointer' }}
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
        Tidak ada angka di-input ulang: persediaan & BPP ditarik dari WTB yang sama dipakai FS Generator. Perubahan AJE mengalir serempak ke modul ini. Ambang materialitas {pm != null && <>(<b className="mono">PM Rp {fmt(pm)} jt</b> · <b className="mono">CTT Rp {fmt(ctt)} jt</b>) </>}ditarik langsung dari modul Materialitas (SA 320){mat.applied ? ' — nilai terapan' : ''}.
      </div>
    </Panel>
  );

  /* ============ PANEL: checklist pengungkapan ============ */
  const disclosurePanel = (
    <Panel noBody>
      <div className="panel-h"><h3>Pengungkapan PSAK 14</h3><span className="sub mono">¶36–39</span><div style={{ flex: 1 }} /><span className="tiny muted">{discOk}/{disc.length}</span></div>
      <div>
        {disc.map((d, i) => (
          <label key={d.id} className="row gap9" style={{ padding: '8px 13px', cursor: 'pointer', alignItems: 'flex-start', borderBottom: i < disc.length - 1 ? '1px solid var(--line-soft)' : 0 }} onClick={() => toggleDisc(d.id)}>
            <span style={{ flex: '0 0 16px', width: 16, height: 16, borderRadius: 4, marginTop: 1, border: '1.5px solid ' + (d.ok ? 'var(--green)' : 'var(--amber)'), background: d.ok ? 'var(--green)' : '#fff', display: 'grid', placeItems: 'center' }}>{d.ok && <I.check size={11} style={{ color: '#fff' }} />}</span>
            <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)', width: 52, flex: '0 0 52px', marginTop: 1 }}>{d.ref}</span>
            <span style={{ fontSize: 11.5, lineHeight: 1.4, color: d.ok ? 'var(--ink-2)' : 'var(--ink)', fontWeight: d.ok ? 400 : 600 }}>{d.t}</span>
          </label>
        ))}
      </div>
    </Panel>
  );

  /* ============ TABS ============ */
  const TABS = [
    { id: 'ikhtisar',     label: 'Ikhtisar & Roll-forward', icon: 'table',   badge: tiePass + '/' + tieRows.length, bad: tiePass !== tieRows.length },
    { id: 'nrv',          label: 'Uji NRV (per-SKU)',       icon: 'scale',   badge: fmt(inv.shortfallWD, 0) + ' jt', bad: !!aboveCTT },
    { id: 'analitis',     label: 'Analitis & Asersi',       icon: 'search2', badge: fmt(inv.dio, 0) + 'h', bad: false },
    { id: 'pengungkapan', label: 'Pengungkapan & Sumber',   icon: 'doc',     badge: discOk + '/' + disc.length, bad: discOk < disc.length },
  ];

  return (
    <>
      <SubBar moduleId="psak14" right={
        <div className="row gap8 ac">
          <Badge kind="green">PSAK 14 · IAS 2</Badge>
          <div className="seg" style={{ width: 'fit-content' }}>
            <button className={unit === 'jutaan' ? 'on' : ''} onClick={() => setUnit('jutaan')}>Jutaan</button>
            <button className={unit === 'penuh' ? 'on' : ''} onClick={() => setUnit('penuh')}>Penuh</button>
          </div>
          <Btn sm onClick={() => nav('sa501', { from: 'psak14' })}><I.search2 size={13} /> SA 501 · Opname</Btn>
          <Btn sm onClick={() => nav('fsgen', { from: 'psak14' })}><I.report size={13} /> FS Generator</Btn>
          <Btn sm onClick={() => nav('wtb', { from: 'psak14' })}><I.ledger size={13} /> Buku Besar</Btn>
          <Btn sm><I.download size={13} /> Kertas Kerja C</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>

          {/* summary */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            <InvCard value={fmt(inv.closeNet / 1e3, 1)} unit="M" label="Persediaan — neto audited" sub="31 Des 2025 · WTB 1-1300" accent="var(--navy)" />
            <InvCard value={fmt(inv.cogsAdj / 1e3, 1)} unit="M" label="Beban pokok penjualan" sub="¶34 · WTB 5-1100" accent="var(--blue)" />
            <InvCard value={fmt(inv.dio, 0)} unit="hari" label="Hari persediaan (DIO)" sub={'Perputaran ' + fmt(inv.turnover, 1) + '× · SA 520'} accent="var(--purple)" />
            <InvCard value={fmt(inv.shortfallWD, 0)} unit="jt" label="Usulan penurunan NRV" sub={abovePM ? '> PM · signifikan' : aboveCTT ? '> CTT · wajib ke SAD' : '≤ CTT · remeh'} accent="var(--amber)" />
            <InvCard value={tiePass + '/' + tieRows.length} label="Tie-out lintas-laporan" sub={tiePass === tieRows.length ? 'seluruh rekonsiliasi menutup' : 'perlu ditelusuri'} accent={tiePass === tieRows.length ? 'var(--green)' : 'var(--amber)'} />
          </div>

          {/* tab bar */}
          <div className="row" style={{ gap: 0, borderBottom: '1px solid var(--line)', overflowX: 'auto', flexWrap: 'nowrap' }}>
            {TABS.map(t => {
              const IconT = I[t.icon] || I.doc;
              const on = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} className="row ac gap7" style={{
                  padding: '9px 15px', border: 'none', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                  fontSize: 12.5, fontWeight: on ? 700 : 500, color: on ? 'var(--navy)' : 'var(--ink-3)',
                  borderBottom: '2px solid ' + (on ? 'var(--navy)' : 'transparent'), marginBottom: -1,
                }}>
                  <IconT size={14} />
                  {t.label}
                  {t.badge && <span className="mono" style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 9, color: t.bad ? 'var(--amber)' : (on ? 'var(--navy)' : 'var(--ink-4)'), background: t.bad ? 'var(--amber-bg)' : (on ? 'var(--blue-050)' : 'var(--surface-2, #f1f3f6)') }}>{t.badge}</span>}
                </button>
              );
            })}
          </div>

          {/* ============ TAB: IKHTISAR ============ */}
          {tab === 'ikhtisar' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 336px', gap: 12, alignItems: 'start' }}>
              <div className="grid" style={{ gap: 12 }}>{rollforwardPanel}{klasifikasiPanel}</div>
              {tieoutPanel}
            </div>
          )}

          {/* ============ TAB: UJI NRV (per-SKU) ============ */}
          {tab === 'nrv' && (
            <div className="grid" style={{ gap: 12 }}>
              <div className="grid" style={{ gridTemplateColumns: '1fr 336px', gap: 12, alignItems: 'start' }}>
                <div className="grid" style={{ gap: 12 }}>{ujiNrvPanel}{agingPanel}</div>
                {pengukuranPanel}
              </div>
              <NRVWorkingPaper inv={inv} sc={sc} fmt={fmt} nav={nav} ctt={ctt} pm={pm} />
            </div>
          )}

          {/* ============ TAB: ANALITIS & ASERSI ============ */}
          {tab === 'analitis' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 336px', gap: 12, alignItems: 'start' }}>
              {asersiPanel}
              {analitisPanel}
            </div>
          )}

          {/* ============ TAB: PENGUNGKAPAN & SUMBER ============ */}
          {tab === 'pengungkapan' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>{disclosurePanel}{lineagePanel}</div>
          )}

          <div className="tiny muted" style={{ padding: '0 2px 4px', lineHeight: 1.5 }}>
            Kertas kerja persediaan <b>{client.name}</b> ({eng.id} · {eng.fy}) disusun sesuai PSAK 14 dan ditarik penuh dari Working Trial Balance (1-1300 & 5-1100) melalui mesin kanonik yang sama dipakai FS Generator (CALK 6) dan tab Rekonsiliasi Angka. {aje01 ? <>Penyesuaian <b>{aje01.id}</b> ({aje01.desc}) berstatus {aje01.status} telah tercermin.</> : null} Status & pilihan tersimpan otomatis untuk jejak audit.
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { PSAK14View });
