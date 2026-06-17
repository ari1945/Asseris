/* ============================================================
   NeoSuite AMS — PSAK 46 · Pajak Penghasilan (Income Taxes)
   Kertas kerja akuntansi & audit atas pajak kini dan pajak tangguhan
   (PSAK 46 jo. IAS 12). Mencakup:
   • Rekonsiliasi fiskal: laba komersial → koreksi permanen/temporer → PKP → pajak kini
   • Perbedaan temporer (carrying vs tax base) → Aset/Liabilitas Pajak Tangguhan @22%
   • Mutasi pajak tangguhan neto (roll-forward) & pemilahan L/R vs OCI
   • Rekonsiliasi tarif pajak efektif (ETR) — penyebab simpangan dari tarif 22%
   • Dua skenario audit recoverability DTA: DIDUKUNG vs DIRAGUKAN (SA 540/450/705)
   • Ketentuan UU HPP (UU 7/2021): tarif 22%, kompensasi rugi 5 th, natura objek pajak
   Tarif PPh Badan 22%. Terkait PSAK 24 (imbalan kerja), PSAK 71 (ECL), PSAK 73 (sewa).
   ============================================================ */
const { useState: useStateP46, useMemo: useMemoP46 } = React;

const P46_RATE = 0.22;

/* ---- rekonsiliasi fiskal: laba komersial → PKP, Rp juta ---- */
const P46_FISCAL = [
  { id: 'pbt',  t: 'Laba sebelum pajak — komersial',                 v: 48500, bucket: 'open' },
  { id: 'perm+',t: 'Beban yang tidak dapat dikurangkan (natura lama, sumbangan, sanksi)', v: 1200, bucket: 'perm' },
  { id: 'perm-',t: 'Penghasilan dikenakan PPh final & dividen dikecualikan', v: -3000, bucket: 'perm' },
  { id: 't1',   t: 'Penyisihan imbalan kerja belum direalisasi (PSAK 24)', v: 1860, bucket: 'temp' },
  { id: 't2',   t: 'Beban CKPN / kerugian ekspektasian (PSAK 71)',    v: 2400, bucket: 'temp' },
  { id: 't3',   t: 'Provisi garansi & liabilitas lain',               v: 900,  bucket: 'temp' },
  { id: 't4',   t: 'Selisih penyusutan komersial di atas fiskal',     v: 1640, bucket: 'temp' },
  { id: 'pkp',  t: 'Penghasilan kena pajak (PKP)',                    v: 53500, bucket: 'close' },
];
const P46_FBUCKET = {
  open:  { lbl: '—',            kind: 'gray' },
  perm:  { lbl: 'Beda Permanen', kind: 'amber' },
  temp:  { lbl: 'Beda Temporer', kind: 'blue' },
  close: { lbl: '—',            kind: 'gray' },
};

/* ---- perbedaan temporer → pajak tangguhan (saldo akhir) ----
   Angka (diff & DTA) ditarik dari AMS_CANON.deferredTax() — satu sumber kebenaran.
   Map ini hanya menyimpan label/ref/sumber (lineage) per pos. */
const P46_TEMP_META = {
  ppe: { pos: 'Aset tetap (penyusutan)',        ref: 'PSAK 16', src: 'wtb',    srcLbl: 'Working Trial Balance', note: 'Penyusutan fiskal lebih cepat → nilai tercatat > dasar pajak.' },
  eb:  { pos: 'Liabilitas imbalan kerja',       ref: 'PSAK 24', src: 'psak24', srcLbl: 'PSAK 24 · Imbalan Kerja', note: 'DBO Rp 13.080 jt; dikurangkan saat dibayar (dasar pajak 0).' },
  ecl: { pos: 'Penyisihan CKPN piutang',        ref: 'PSAK 71', src: 'ecl',    srcLbl: 'Kalkulator ECL (PSAK 71)', note: 'Saldo CKPN Rp 1.980 jt belum dapat dikurangkan fiskal.' },
  lse: { pos: 'Liabilitas sewa neto (ROU)',     ref: 'PSAK 73', src: 'psak73', srcLbl: 'PSAK 73 · Sewa', note: 'Neto liabilitas sewa − aset hak-guna portofolio per 31 Des 2025.' },
  prv: { pos: 'Provisi garansi & lainnya',      ref: 'PSAK 57', src: null,     srcLbl: null, note: 'Dikurangkan saat realisasi/terjadi.' },
  tlc: { pos: 'Rugi fiskal dapat dikompensasi', ref: '¶34',     src: 'tax',    srcLbl: 'Modul Pajak · PPh Badan', note: 'Atribut pajak entitas anak — pemulihan bergantung laba masa depan.' },
};

/* lineage kertas kerja: hulu (sumber data) & hilir (pengguna output) */
const P46_UPSTREAM = [
  { id: 'psak24', ic: 'users',    lbl: 'PSAK 24 · Imbalan Kerja',  rel: 'Liabilitas imbalan → beda temporer dapat dikurangkan' },
  { id: 'ecl',    ic: 'target',   lbl: 'PSAK 71 · ECL / CKPN',     rel: 'Penyisihan piutang → aset pajak tangguhan' },
  { id: 'psak73', ic: 'building', lbl: 'PSAK 73 · Sewa',           rel: 'Liabilitas sewa neto ROU → beda temporer' },
  { id: 'wtb',    ic: 'table',    lbl: 'Working Trial Balance',    rel: 'Saldo akun & dasar pajak aset/liabilitas' },
  { id: 'tax',    ic: 'receipt',  lbl: 'Modul Pajak · PPh Badan',  rel: 'SPT, rekonsiliasi fiskal & rugi fiskal' },
];
const P46_DOWNSTREAM = [
  { id: 'sa540',   ic: 'target', lbl: 'SA 540 · Estimasi Akuntansi', rel: 'Recoverability DTA diuji sebagai estimasi' },
  { id: 'sad',     ic: 'scale',  lbl: 'SAD Ledger',                 rel: 'Lebih/kurang saji pajak → akumulasi salah saji' },
  { id: 'fsgen',   ic: 'report', lbl: 'FS Generator',               rel: 'Beban & saldo pajak masuk penyajian LK' },
  { id: 'opinion', ic: 'gavel',  lbl: 'Audit Opinion Generator',    rel: 'Modifikasi opini bila DTA tak terpulihkan' },
];

/* ---- mutasi pajak tangguhan neto (roll-forward) — disusun dari canon di dalam komponen ---- */
const P46_MBUCKET = {
  open:  { lbl: '—',         kind: 'gray' },
  pl:    { lbl: 'Laba Rugi', kind: 'blue' },
  oci:   { lbl: 'OCI',       kind: 'purple' },
  close: { lbl: '—',         kind: 'gray' },
};

/* ---- peta penyajian (PSAK 46 jo. PSAK 1) — amt diisi dari canon saat render ---- */
const P46_PRESENT_META = [
  { id: 'p1', stmt: 'sofp', ref: '¶74', key: 'closing',    line: 'Aset pajak tangguhan — neto (tidak lancar)', note: 'DTA/DTL disaling-hapus: hak hukum & otoritas pajak yang sama.' },
  { id: 'p2', stmt: 'sofp', ref: '¶12', key: 'currentTax', line: 'Utang pajak kini (PPh Badan terutang)', note: 'Dikurangi angsuran PPh 25 & kredit pajak untuk utang neto.' },
  { id: 'p3', stmt: 'pl',   ref: '¶79', key: 'currentTax', line: 'Beban pajak kini', note: 'PKP 53.500 × 22%.' },
  { id: 'p4', stmt: 'pl',   ref: '¶79', key: 'deferredNeg', line: 'Manfaat pajak tangguhan', note: 'Kenaikan aset pajak tangguhan neto via laba rugi.' },
  { id: 'p5', stmt: 'oci',  ref: '¶62', key: 'oci',        line: 'Pajak penghasilan terkait pengukuran kembali', note: 'Mengikuti pos OCI imbalan kerja (PSAK 24).' },
];

/* ---- prosedur audit per-skenario recoverability DTA ---- */
const P46_PROC_SUPP = [
  { id: 's1', ref: 'SA 500 ¶6',  t: 'Peroleh SPT Tahunan PPh Badan & rekonsiliasi fiskal; rekonsiliasi ke buku besar dan laporan keuangan' },
  { id: 's2', ref: 'SA 500',     t: 'Uji dasar pengenaan pajak (tax base) tiap aset/liabilitas & pilah beda temporer vs permanen' },
  { id: 's3', ref: 'PSAK 46 ¶47',t: 'Verifikasi tarif 22% (berlaku / secara substantif berlaku) dipakai mengukur pajak tangguhan' },
  { id: 's4', ref: 'SA 540',     t: 'Evaluasi proyeksi laba kena pajak masa depan yang mendukung pemulihan DTA & rugi fiskal' },
  { id: 's5', ref: 'PSAK 46 ¶74',t: 'Uji syarat saling hapus DTA/DTL — hak hukum & entitas/otoritas pajak yang sama' },
  { id: 's6', ref: 'SA 500',     t: 'Rekonsiliasi tarif pajak efektif (ETR) & telaah penyebab simpangan dari 22%' },
  { id: 's7', ref: 'PSAK 46 ¶79',t: 'Telaah kecukupan pengungkapan CALK: komponen beban pajak, rekonsiliasi ETR, rugi fiskal & batas waktu' },
  { id: 's8', ref: 'SA 230',     t: 'Dokumentasikan dasar kesimpulan & jejak audit pos perpajakan' },
];
const P46_PROC_DOUBT = [
  { id: 'd1', ref: 'SA 540 ¶13', t: 'Pahami dasar & asumsi proyeksi laba kena pajak; identifikasi indikator (riwayat rugi, kedaluwarsa kompensasi)' },
  { id: 'd2', ref: 'PSAK 46 ¶56',t: 'Nilai ulang jumlah tercatat DTA tiap tanggal pelaporan; turunkan sejauh tidak lagi terpulihkan' },
  { id: 'd3', ref: 'SA 540 ¶16', t: 'Kembangkan ekspektasi independen laba kena pajak masa depan (titik / rentang)' },
  { id: 'd4', ref: 'SA 540',     t: 'Uji sensitivitas asumsi proyeksi: pertumbuhan, margin & pembalikan beda temporer' },
  { id: 'd5', ref: 'SA 450',     t: 'Bila DTA lebih saji material → akumulasikan ke SAD Ledger sebagai salah saji' },
  { id: 'd6', ref: 'SA 705',     t: 'Bila tidak dikoreksi & material → pertimbangkan modifikasi opini (WDP / Tidak Wajar)' },
  { id: 'd7', ref: 'SA 260/580', t: 'Komunikasikan ke TCWG & peroleh representasi tertulis manajemen' },
  { id: 'd8', ref: 'SA 230',     t: 'Dokumentasikan pertimbangan profesional & dasar kesimpulan' },
];

/* ---- kompensasi rugi fiskal (5 tahun · UU PPh jo. UU HPP) ---- */
const P46_TLC = [
  { yr: '2023', amt: 1200, exp: '2028', kind: 'green' },
  { yr: '2024', amt: 1800, exp: '2029', kind: 'green' },
];

/* ---- ketentuan pajak kunci (UU HPP No.7/2021) ---- */
const P46_HPP = [
  { k: 'Tarif PPh Badan', v: '22%', note: 'Final — rencana penurunan ke 20% dibatalkan UU HPP.' },
  { k: 'Kompensasi rugi fiskal', v: '5 tahun', note: 'Rugi fiskal dikompensasikan maksimum lima tahun ke depan.' },
  { k: 'Natura / kenikmatan', v: 'Objek PPh', note: 'Kini dapat dikurangkan bagi pemberi kerja → sebagian beda permanen bergeser ke temporer.' },
  { k: 'Tarif pengukuran DT', v: '¶47', note: 'Pajak tangguhan diukur pada tarif yang berlaku / secara substantif berlaku saat pembalikan.' },
];

function P46Card({ value, label, sub, accent }) {
  return (
    <div className="panel" style={{ padding: '12px 14px', display: 'grid', gap: 2 }}>
      <div className="mono" style={{ fontSize: 21, fontWeight: 700, color: accent || 'var(--navy)', lineHeight: 1.05 }}>{value}</div>
      <div className="tiny muted" style={{ fontWeight: 600 }}>{label}</div>
      {sub && <div className="tiny" style={{ color: 'var(--ink-4)' }}>{sub}</div>}
    </div>
  );
}

function PSAK46View() {
  const { fmt } = window.AMS;
  const firm = (typeof useFirm === 'function') ? useFirm() : {};
  const nav = (typeof useNav === 'function') ? useNav() : (() => {});
  const loader = window.loadLS || ((k, d) => d);

  const [scenario, setScenario] = useStateP46(() => loader('ams.psak46.scenario', 'support'));
  const [doneS, setDoneS] = useStateP46(() => loader('ams.psak46.doneS', {}));
  const [doneD, setDoneD] = useStateP46(() => loader('ams.psak46.doneD', {}));
  const [stmtTab, setStmtTab] = useStateP46('all');

  React.useEffect(() => { try { localStorage.setItem('ams.psak46.scenario', JSON.stringify(scenario)); } catch (e) {} }, [scenario]);
  React.useEffect(() => { try { localStorage.setItem('ams.psak46.doneS', JSON.stringify(doneS)); } catch (e) {} }, [doneS]);
  React.useEffect(() => { try { localStorage.setItem('ams.psak46.doneD', JSON.stringify(doneD)); } catch (e) {} }, [doneD]);

  const supp = scenario === 'support';
  const procs = supp ? P46_PROC_SUPP : P46_PROC_DOUBT;
  const doneMap = supp ? doneS : doneD;
  const setDone = supp ? setDoneS : setDoneD;
  const toggle = (id) => setDone(m => ({ ...m, [id]: !m[id] }));
  const doneCount = procs.filter(p => doneMap[p.id]).length;
  const score = Math.round((doneCount / procs.length) * 100);

  /* derive deferred tax per row + totals — ditarik dari AMS_CANON (satu sumber kebenaran) */
  const canon = window.AMS_CANON;
  const DT = useMemoP46(() => canon.deferredTax(), []);
  const tempRows = useMemoP46(() => DT.items.map(it => ({ ...it, ...P46_TEMP_META[it.id] })), [DT]);
  const dtaTotal = tempRows.filter(r => r.dt > 0).reduce((a, r) => a + r.dt, 0);
  const dtlTotal = tempRows.filter(r => r.dt < 0).reduce((a, r) => a + r.dt, 0);
  const netDT = DT.closing;

  const client = firm.activeClient || { name: 'PT Sentosa Makmur Tbk' };
  const eng = firm.activeEngagement || { id: 'ENG-2025-014', fy: 'FY2025' };

  const currentTax = DT.currentTax, deferredPL = DT.deferredPL, taxExpense = DT.taxExpense, pbt = DT.pbt;
  const etr = DT.etr * 100;

  /* roll-forward pajak tangguhan neto — disusun dari canon agar foot otomatis */
  const P46_MOVE = [
    { id: 'open',  t: 'Saldo awal — Aset pajak tangguhan neto (1 Jan 2025)', v: DT.opening, bucket: 'open' },
    { id: 'pl',    t: 'Diakui di laba rugi — manfaat pajak tangguhan', v: DT.deferredPL, bucket: 'pl' },
    { id: 'oci',   t: 'Diakui di OCI — pajak atas pengukuran kembali', v: DT.oci, bucket: 'oci' },
    { id: 'close', t: 'Saldo akhir — Aset pajak tangguhan neto (31 Des 2025)', v: DT.closing, bucket: 'close' },
  ];
  /* rekonsiliasi tarif pajak efektif — hanya beda permanen yang menjadi penyebab; foot ke taxExpense */
  const etrStat = Math.round(pbt * canon.RATE);
  const etrNd = Math.round(canon.FIG.permAdd * canon.RATE);
  const etrExo = -Math.round(canon.FIG.permLess * canon.RATE);
  const etrResid = taxExpense - (etrStat + etrNd + etrExo);
  const P46_ETR = [
    { id: 'stat', t: 'Laba sebelum pajak × tarif 22%', v: etrStat, head: true },
    { id: 'nd',   t: 'Efek beban yang tidak dapat dikurangkan', v: etrNd },
    { id: 'exo',  t: 'Efek penghasilan tidak kena pajak / PPh final', v: etrExo },
    ...(etrResid !== 0 ? [{ id: 'adj', t: 'Penyesuaian pajak tangguhan periode lalu', v: etrResid }] : []),
    { id: 'tot',  t: 'Beban pajak penghasilan', v: taxExpense, head: true },
  ];
  /* peta penyajian — amount dari canon */
  const presentVals = { closing: DT.closing, currentTax: DT.currentTax, deferredNeg: -DT.deferredPL, oci: DT.oci };
  const P46_PRESENT = P46_PRESENT_META.map(p => ({ ...p, amt: presentVals[p.key] }));

  const presentFiltered = P46_PRESENT.filter(p => stmtTab === 'all' || p.stmt === stmtTab);
  const stmtBadge = { sofp: { k: 'teal', l: 'Posisi Keuangan' }, pl: { k: 'blue', l: 'Laba Rugi' }, oci: { k: 'purple', l: 'OCI' } };

  return (
    <>
      <SubBar moduleId="psak46" right={
        <div className="row gap8 ac">
          <Badge kind="green">PSAK 46 · IAS 12</Badge>
          <Btn sm onClick={() => nav('sa540', { from: 'psak46' })}><I.target size={13} /> SA 540 · Estimasi</Btn>
          <Btn sm onClick={() => nav('tax', { from: 'psak46' })}><I.receipt size={13} /> Modul Pajak</Btn>
          <Btn sm><I.download size={13} /> Kertas Kerja PPh</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>

          {/* summary */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            <P46Card value={'Rp ' + fmt(taxExpense) + ' jt'} label="Beban pajak penghasilan" sub="¶79 · Laba Rugi (kini − tangguhan)" accent="var(--navy)" />
            <P46Card value={'Rp ' + fmt(currentTax) + ' jt'} label="Beban pajak kini" sub="PKP 53.500 × 22%" accent="var(--blue)" />
            <P46Card value={'Rp ' + fmt(deferredPL) + ' jt'} label="Manfaat pajak tangguhan — L/R" sub="kenaikan DTA neto via laba rugi" accent="var(--purple)" />
            <P46Card value={'Rp ' + fmt(netDT) + ' jt'} label="Aset pajak tangguhan neto" sub={supp ? '¶74 · pemulihan didukung' : '¶56 · recoverability diragukan'} accent={supp ? 'var(--green)' : 'var(--amber)'} />
            <P46Card value={score + '%'} label="Prosedur audit selesai" sub={doneCount + '/' + procs.length + ' langkah'} accent={score === 100 ? 'var(--green)' : 'var(--navy)'} />
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
            {/* ============ LEFT ============ */}
            <div className="grid" style={{ gap: 12 }}>

              {/* rekonsiliasi fiskal */}
              <Panel noBody>
                <div className="panel-h"><h3>Rekonsiliasi Fiskal</h3><span className="sub mono">laba komersial → PKP</span><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
                <div>
                  {P46_FISCAL.map((r, i) => {
                    const b = P46_FBUCKET[r.bucket];
                    const isTot = r.bucket === 'open' || r.bucket === 'close';
                    return (
                      <div key={r.id} className="row ac gap10" style={{ padding: '9px 14px', borderBottom: i < P46_FISCAL.length - 1 ? '1px solid var(--line-soft)' : 0, background: isTot ? 'var(--surface-2)' : 'transparent' }}>
                        <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: isTot ? 700 : 500, color: isTot ? 'var(--navy)' : 'var(--ink)' }}>{r.t}</div>
                        {!isTot ? <Badge kind={b.kind}>{b.lbl}</Badge> : <span style={{ width: 86 }} />}
                        <div className="mono" style={{ width: 84, textAlign: 'right', fontWeight: 700, color: r.v < 0 ? 'var(--red)' : isTot ? 'var(--navy)' : 'var(--ink)' }}>{fmt(r.v)}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="row ac jb" style={{ padding: '10px 14px 12px' }}>
                  <span className="tiny muted" style={{ lineHeight: 1.45 }}>Beda <b style={{ color: 'var(--amber)' }}>permanen</b> tidak menimbulkan pajak tangguhan; beda <b style={{ color: 'var(--blue)' }}>temporer</b> menjadi dasar pengakuan DTA/DTL.</span>
                  <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)', whiteSpace: 'nowrap' }}>Pajak kini = Rp {fmt(currentTax)} jt</span>
                </div>
              </Panel>

              {/* perbedaan temporer → pajak tangguhan */}
              <Panel noBody>
                <div className="panel-h"><h3>Perbedaan Temporer & Pajak Tangguhan</h3><span className="sub mono">nilai tercatat vs dasar pajak · @22%</span></div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="dtbl" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Pos</th>
                        <th style={{ textAlign: 'right', width: 78 }}>Tercatat</th>
                        <th style={{ textAlign: 'right', width: 78 }}>Dasar pajak</th>
                        <th style={{ textAlign: 'left', width: 118 }}>Jenis</th>
                        <th style={{ textAlign: 'right', width: 84 }}>DTA/(DTL)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tempRows.map((r) => (
                        <tr key={r.id} onClick={r.src ? () => nav(r.src, { from: 'psak46' }) : undefined} style={{ cursor: r.src ? 'pointer' : 'default' }} title={r.src ? 'Buka ' + r.srcLbl : undefined}>
                          <td>
                            <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.3 }} className="row ac gap6">
                              <span>{r.pos} <span className="mono tiny" style={{ color: 'var(--ink-4)', fontWeight: 600 }}>{r.ref}</span></span>
                              {r.src && <I.link2 size={12} style={{ color: 'var(--blue)', flex: '0 0 auto' }} />}
                            </div>
                            <div className="tiny muted" style={{ lineHeight: 1.4 }}>{r.note}{r.car == null && <span className="mono" style={{ color: 'var(--ink-3)' }}> · beda temporer Rp {fmt(r.diff)} jt</span>}{r.src && <span style={{ color: 'var(--blue)' }}> · sumber: {r.srcLbl}</span>}</div>
                          </td>
                          <td className="mono tiny" style={{ textAlign: 'right', color: 'var(--ink-2)' }}>{r.car != null ? fmt(r.car) : '—'}</td>
                          <td className="mono tiny" style={{ textAlign: 'right', color: 'var(--ink-2)' }}>{r.base != null ? fmt(r.base) : '—'}</td>
                          <td><Badge kind={r.type === 'tax' ? 'amber' : 'teal'}>{r.type === 'tax' ? 'Kena Pajak' : 'Dpt Dikurangkan'}</Badge></td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: r.dt < 0 ? 'var(--red)' : 'var(--green)' }}>{r.dt < 0 ? '(' + fmt(-r.dt) + ')' : fmt(r.dt)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: 'var(--surface-2)' }}>
                        <td colSpan={3} style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--navy)' }}>Aset pajak tangguhan neto</td>
                        <td className="mono tiny" style={{ textAlign: 'right', color: 'var(--ink-3)' }}>DTA {fmt(dtaTotal)} · DTL ({fmt(-dtlTotal)})</td>
                        <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--navy)' }}>{fmt(netDT)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>
                  Beda temporer <b>kena pajak</b> → liabilitas pajak tangguhan (DTL); beda <b>dapat dikurangkan</b> & rugi fiskal → aset pajak tangguhan (DTA), diakui sepanjang <b>besar kemungkinan</b> tersedia laba kena pajak masa depan (¶24, ¶34).
                </div>
              </Panel>

              {/* mutasi pajak tangguhan */}
              <Panel noBody>
                <div className="panel-h"><h3>Mutasi Pajak Tangguhan Neto</h3><span className="sub mono">roll-forward · L/R vs OCI</span><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
                <div>
                  {P46_MOVE.map((r, i) => {
                    const b = P46_MBUCKET[r.bucket];
                    const isTot = r.bucket === 'open' || r.bucket === 'close';
                    return (
                      <div key={r.id} className="row ac gap10" style={{ padding: '9px 14px', borderBottom: i < P46_MOVE.length - 1 ? '1px solid var(--line-soft)' : 0, background: isTot ? 'var(--surface-2)' : 'transparent' }}>
                        <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: isTot ? 700 : 500, color: isTot ? 'var(--navy)' : 'var(--ink)' }}>{r.t}</div>
                        {!isTot ? <Badge kind={b.kind}>{b.lbl}</Badge> : <span style={{ width: 60 }} />}
                        <div className="mono" style={{ width: 78, textAlign: 'right', fontWeight: 700, color: isTot ? 'var(--navy)' : 'var(--green)' }}>{isTot ? fmt(r.v) : '+' + fmt(r.v)}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="row gap14" style={{ padding: '10px 14px 4px' }}>
                  <div className="row ac gap6 tiny muted"><span style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--blue)' }} /> Manfaat ke L/R: <b style={{ color: 'var(--ink)' }}>Rp {fmt(deferredPL)} jt</b></div>
                  <div className="row ac gap6 tiny muted"><span style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--purple)' }} /> Ke OCI: <b style={{ color: 'var(--ink)' }}>Rp {fmt(DT.oci)} jt</b></div>
                </div>
                <div className="tiny muted" style={{ padding: '0 14px 12px', lineHeight: 1.5 }}>
                  Manfaat L/R <b>Rp {fmt(deferredPL)} jt</b> = beda temporer tahun berjalan (rekonsiliasi fiskal Rp {fmt(canon.FIG.fiscalTempMovement)} jt) × 22%; OCI <b>Rp {fmt(DT.oci)} jt</b> = pengukuran kembali PSAK 24 Rp {fmt(canon.FIG.ociRemeasure)} jt × 22%. Saldo akhir <b>Rp {fmt(DT.closing)} jt</b> = jumlah pajak tangguhan per pos di atas.
                </div>
              </Panel>

              {/* rekonsiliasi tarif pajak efektif */}
              <Panel noBody>
                <div className="panel-h"><h3>Rekonsiliasi Tarif Pajak Efektif</h3><span className="sub mono">¶81(c) · ETR</span><div style={{ flex: 1 }} /><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)' }}>ETR {etr.toFixed(1)}%</span></div>
                <div>
                  {P46_ETR.map((r, i) => (
                    <div key={r.id} className="row ac gap10" style={{ padding: '9px 14px', borderBottom: i < P46_ETR.length - 1 ? '1px solid var(--line-soft)' : 0, background: r.head ? 'var(--surface-2)' : 'transparent' }}>
                      <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: r.head ? 700 : 500, color: r.head ? 'var(--navy)' : 'var(--ink)' }}>{r.t}</div>
                      <div className="mono tiny" style={{ width: 60, textAlign: 'right', color: 'var(--ink-4)' }}>{r.head ? (r.id === 'stat' ? '22,0%' : etr.toFixed(1) + '%') : ((r.v / pbt * 100 >= 0 ? '+' : '') + (r.v / pbt * 100).toFixed(1) + '%')}</div>
                      <div className="mono" style={{ width: 78, textAlign: 'right', fontWeight: 700, color: r.v < 0 ? 'var(--red)' : r.head ? 'var(--navy)' : 'var(--ink)' }}>{fmt(r.v)}</div>
                    </div>
                  ))}
                </div>
                <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>
                  ETR <b>{etr.toFixed(1)}%</b> di bawah tarif statutori 22% — selisih terutama dari penghasilan PPh final/dividen yang dikecualikan, sebagian diimbangi beban non-deductible.
                </div>
              </Panel>

              {/* prosedur audit */}
              <Panel noBody>
                <div className="panel-h"><h3>Prosedur Audit — Recoverability Aset Pajak Tangguhan</h3><div style={{ flex: 1 }} />
                  <div className="seg" style={{ width: 'fit-content' }}>
                    <button className={supp ? 'on' : ''} onClick={() => setScenario('support')}>Didukung</button>
                    <button className={!supp ? 'on' : ''} onClick={() => setScenario('doubt')}>Diragukan</button>
                  </div>
                </div>
                <div className="row gap8" style={{ padding: '10px 14px', alignItems: 'flex-start', background: supp ? 'var(--blue-050)' : 'var(--amber-bg)' }}>
                  <span style={{ color: supp ? 'var(--blue)' : 'var(--amber)', marginTop: 1 }}>{supp ? <I.checkCircle size={15} /> : <I.alert size={15} />}</span>
                  <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>
                    {supp
                      ? <>Proyeksi laba kena pajak <b>memadai</b> untuk memulihkan DTA & rugi fiskal dalam batas waktu kompensasi. Fokus audit pada <b>akurasi tax base, tarif & pengungkapan</b>.</>
                      : <>Recoverability DTA <b>diragukan</b> (riwayat rugi / proyeksi lemah). Auditor menguji ulang asumsi proyeksi dan menilai apakah DTA perlu <b>diturunkan</b> (¶56) — berpotensi memengaruhi opini.</>}
                  </div>
                </div>
                <div>
                  {procs.map((p, i) => {
                    const on = !!doneMap[p.id];
                    return (
                      <label key={p.id} className="row gap10" style={{ padding: '9px 14px', cursor: 'pointer', alignItems: 'flex-start', borderBottom: i < procs.length - 1 ? '1px solid var(--line-soft)' : 0 }} onClick={() => toggle(p.id)}>
                        <span style={{ flex: '0 0 16px', width: 16, height: 16, borderRadius: 4, marginTop: 1, border: '1.5px solid ' + (on ? 'var(--green)' : 'var(--line-strong)'), background: on ? 'var(--green)' : '#fff', display: 'grid', placeItems: 'center' }}>{on && <I.check size={11} style={{ color: '#fff' }} />}</span>
                        <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)', width: 86, flex: '0 0 86px', marginTop: 1 }}>{p.ref}</span>
                        <span style={{ fontSize: 12, lineHeight: 1.4, color: on ? 'var(--ink-3)' : 'var(--ink)', textDecoration: on ? 'line-through' : 'none' }}>{p.t}</span>
                      </label>
                    );
                  })}
                </div>
              </Panel>

              {/* peta penyajian */}
              <Panel noBody>
                <div className="panel-h"><h3>Peta Penyajian dalam Laporan Keuangan</h3><div style={{ flex: 1 }} />
                  <div className="seg" style={{ width: 'fit-content' }}>
                    <button className={stmtTab === 'all' ? 'on' : ''} onClick={() => setStmtTab('all')}>Semua</button>
                    <button className={stmtTab === 'sofp' ? 'on' : ''} onClick={() => setStmtTab('sofp')}>Posisi</button>
                    <button className={stmtTab === 'pl' ? 'on' : ''} onClick={() => setStmtTab('pl')}>L/R</button>
                    <button className={stmtTab === 'oci' ? 'on' : ''} onClick={() => setStmtTab('oci')}>OCI</button>
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="dtbl" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Pos</th>
                        <th style={{ textAlign: 'left', width: 130 }}>Disajikan di</th>
                        <th style={{ textAlign: 'left', width: 48 }}>Ref</th>
                        <th style={{ textAlign: 'right', width: 84 }}>Rp juta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {presentFiltered.map((r) => {
                        const sb = stmtBadge[r.stmt];
                        return (
                          <tr key={r.id}>
                            <td>
                              <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.3 }}>{r.line}</div>
                              <div className="tiny muted" style={{ lineHeight: 1.4 }}>{r.note}</div>
                            </td>
                            <td><Badge kind={sb.k}>{sb.l}</Badge></td>
                            <td className="mono tiny" style={{ color: 'var(--ink-3)' }}>{r.ref}</td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: r.amt < 0 ? 'var(--red)' : 'var(--ink)' }}>{r.amt < 0 ? '(' + fmt(-r.amt) + ')' : fmt(r.amt)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>
                  DTA & DTL <b>disaling-hapus</b> menjadi satu pos neto bila terdapat hak hukum & merujuk pada otoritas pajak yang sama (¶74). Pajak atas pos OCI <b>mengikuti</b> pos induknya (¶62).
                </div>
              </Panel>
            </div>

            {/* ============ RIGHT ============ */}
            <div className="grid" style={{ gap: 12 }}>

              {/* kesimpulan */}
              <Panel noBody>
                <div style={{ background: 'linear-gradient(120deg,#013a52,#005085)', color: '#fff', padding: '14px 16px' }}>
                  <div className="tiny upper" style={{ color: '#bcd6e4', letterSpacing: '.05em', marginBottom: 8 }}>Kesimpulan Audit — {supp ? 'DTA Didukung' : 'Recoverability Diragukan'}</div>
                  <div className="row ac gap12">
                    <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1, fontFamily: 'JetBrains Mono, monospace' }}>{score}<span style={{ fontSize: 18 }}>%</span></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,.18)', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: score + '%', background: score === 100 ? '#4ade80' : '#7cc6ff', borderRadius: 4, transition: '.3s' }} /></div>
                      <div className="tiny" style={{ color: '#bcd6e4', marginTop: 6 }}>{doneCount}/{procs.length} prosedur audit selesai</div>
                    </div>
                  </div>
                </div>
                <div style={{ padding: 14 }}>
                  <div className="panel" style={{ padding: '9px 11px', background: supp ? 'var(--green-bg)' : 'var(--amber-bg)', borderColor: 'transparent' }}>
                    <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                      <span style={{ color: supp ? 'var(--green)' : 'var(--amber)', marginTop: 1 }}>{supp ? <I.checkCircle size={15} /> : <I.alert size={15} />}</span>
                      <span style={{ fontSize: 11.5, lineHeight: 1.5 }}>{supp
                        ? <>Aset pajak tangguhan neto <b>Rp {fmt(netDT)} jt</b> didukung proyeksi laba kena pajak; tax base, tarif 22% & pengungkapan teruji. Mendukung <b>opini tanpa modifikasi</b> atas pos perpajakan.</>
                        : <>Bila estimasi independen menunjukkan DTA <b>tidak terpulihkan</b> secara material dan manajemen menolak menurunkannya → pertimbangkan <b>modifikasi opini (SA 705)</b>.</>}</span>
                    </div>
                  </div>
                  {!supp && (
                    <div style={{ marginTop: 12 }}>
                      <div className="tiny muted upper" style={{ marginBottom: 6 }}>Pohon Keputusan</div>
                      <div className="grid" style={{ gap: 6 }}>
                        {[
                          ['Proyeksi laba kena pajak memadai?', 'SA 540'],
                          ['DTA terpulihkan dalam batas kompensasi?', 'PSAK 46 ¶56'],
                          ['Manajemen menurunkan DTA tak terpulih?', 'SA 450'],
                          ['Jika tidak → modifikasi opini', 'SA 705'],
                        ].map((s, i) => (
                          <div key={i} className="row ac gap8" style={{ padding: '7px 9px', borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--line-soft)' }}>
                            <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--amber)', flex: '0 0 18px' }}>{i + 1}</span>
                            <span style={{ fontSize: 11.5, lineHeight: 1.35, flex: 1 }}>{s[0]}</span>
                            <span className="mono tiny" style={{ color: 'var(--ink-4)' }}>{s[1]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Panel>

              {/* komponen pajak tangguhan */}
              <Panel title="Komponen Pajak Tangguhan Neto" sub="saldo akhir · Rp juta">
                <div style={{ display: 'grid', gap: 9 }}>
                  {tempRows.map((r) => {
                    const pos = r.dt > 0;
                    const w = Math.min(50, Math.abs(r.dt) / Math.max.apply(null, tempRows.map(x => Math.abs(x.dt))) * 50);
                    return (
                      <div key={r.id}>
                        <div className="row ac jb" style={{ marginBottom: 3 }}>
                          <span style={{ fontSize: 11.5 }}>{r.pos}</span>
                          <span className="mono tiny" style={{ fontWeight: 700, color: pos ? 'var(--green)' : 'var(--red)' }}>{pos ? fmt(r.dt) : '(' + fmt(-r.dt) + ')'}</span>
                        </div>
                        <div style={{ position: 'relative', height: 7, background: 'var(--surface-3)', borderRadius: 4 }}>
                          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--line-strong)' }} />
                          <div style={{ position: 'absolute', top: 0, bottom: 0, height: '100%', borderRadius: 4, background: pos ? 'var(--green)' : 'var(--red)', left: pos ? '50%' : (50 - w) + '%', width: w + '%' }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="row ac jb" style={{ paddingTop: 6, borderTop: '1px solid var(--line-soft)' }}>
                    <span className="tiny muted" style={{ fontWeight: 700 }}>Aset pajak tangguhan neto</span>
                    <span className="mono" style={{ fontWeight: 800, color: 'var(--navy)' }}>Rp {fmt(netDT)} jt</span>
                  </div>
                </div>
              </Panel>

              {/* kompensasi rugi fiskal */}
              <Panel title="Kompensasi Rugi Fiskal" sub="5 tahun · entitas anak">
                <div style={{ display: 'grid', gap: 0 }}>
                  {P46_TLC.map((r, i) => (
                    <div key={i} className="row ac gap8" style={{ padding: '8px 0', borderBottom: i < P46_TLC.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                      <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)', flex: '0 0 38px' }}>{r.yr}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>Rp {fmt(r.amt)} jt</div>
                        <div className="tiny muted">kedaluwarsa {r.exp}</div>
                      </div>
                      <Badge kind={r.kind}>aktif</Badge>
                    </div>
                  ))}
                  <div className="row ac jb" style={{ padding: '9px 0 2px' }}>
                    <span className="tiny muted" style={{ fontWeight: 700 }}>Total rugi fiskal → DTA</span>
                    <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--green)' }}>Rp 3.000 → 660 jt</span>
                  </div>
                  <div className="tiny muted" style={{ lineHeight: 1.45, paddingTop: 6, borderTop: '1px solid var(--line-soft)' }}>
                    DTA atas rugi fiskal hanya diakui sepanjang <b>besar kemungkinan</b> tersedia laba kena pajak sebelum hak kompensasi <b>kedaluwarsa</b> (¶34–36).
                  </div>
                </div>
              </Panel>

              {/* ketentuan pajak kunci */}
              <Panel title="Ketentuan Pajak Kunci" sub="UU HPP No. 7/2021">
                <div style={{ display: 'grid', gap: 0 }}>
                  {P46_HPP.map((a, i) => (
                    <div key={i} style={{ padding: '8px 0', borderBottom: i < P46_HPP.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                      <div className="row ac jb">
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{a.k}</span>
                        <span className="mono" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--navy)' }}>{a.v}</span>
                      </div>
                      <div className="tiny muted" style={{ lineHeight: 1.4, marginTop: 1 }}>{a.note}</div>
                    </div>
                  ))}
                </div>
              </Panel>

              {/* keterkaitan kertas kerja — lineage dua arah */}
              <Panel noBody>
                <div className="panel-h"><h3>Keterkaitan Kertas Kerja</h3><span className="sub mono">lineage data</span></div>

                <div className="row ac gap6" style={{ padding: '9px 14px 4px' }}>
                  <I.arrowRight size={13} style={{ color: 'var(--blue)' }} />
                  <span className="tiny upper" style={{ fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink-3)' }}>Hulu — sumber beda temporer</span>
                </div>
                <div style={{ display: 'grid', gap: 6, padding: '2px 12px 10px' }}>
                  {P46_UPSTREAM.map((m) => {
                    const IconC = I[m.ic] || I.doc;
                    return (
                      <button key={m.id} onClick={() => nav(m.id, { from: 'psak46' })} className="row ac gap9" style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', borderLeft: '3px solid var(--blue)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                        <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><IconC size={15} /></span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{m.lbl}</div>
                          <div className="tiny muted" style={{ lineHeight: 1.35 }}>{m.rel}</div>
                        </div>
                        <I.arrowRight size={13} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                      </button>
                    );
                  })}
                </div>

                <div className="row ac gap6" style={{ padding: '4px 14px 4px', borderTop: '1px solid var(--line-soft)' }}>
                  <I.arrowRight size={13} style={{ color: 'var(--green)' }} />
                  <span className="tiny upper" style={{ fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink-3)' }}>Hilir — pengguna angka pajak</span>
                </div>
                <div style={{ display: 'grid', gap: 6, padding: '2px 12px 12px' }}>
                  {P46_DOWNSTREAM.map((m) => {
                    const IconC = I[m.ic] || I.doc;
                    return (
                      <button key={m.id} onClick={() => nav(m.id, { from: 'psak46' })} className="row ac gap9" style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', borderLeft: '3px solid var(--green)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                        <span style={{ color: 'var(--green)', flex: '0 0 auto' }}><IconC size={15} /></span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{m.lbl}</div>
                          <div className="tiny muted" style={{ lineHeight: 1.35 }}>{m.rel}</div>
                        </div>
                        <I.arrowRight size={13} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => nav('compmatrix', { from: 'psak46' })} className="row ac gap8" style={{ padding: '9px 14px', borderTop: '1px solid var(--line-soft)', background: 'var(--surface-2)', cursor: 'pointer', width: '100%', textAlign: 'left', border: 'none' }}>
                  <I.table size={14} style={{ color: 'var(--navy)' }} />
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Matriks Kepatuhan \u00b7 indeks standar</span>
                  <I.arrowRight size={13} style={{ color: 'var(--ink-4)' }} />
                </button>
              </Panel>
            </div>
          </div>

          <div className="tiny muted" style={{ padding: '0 2px 4px', lineHeight: 1.5 }}>
            Kertas kerja ini menelusuri pajak penghasilan <b>{client.name}</b> ({eng.id} · {eng.fy}) terhadap PSAK 46 — dari rekonsiliasi fiskal & pajak kini, perbedaan temporer & pajak tangguhan, mutasi L/R vs OCI dan rekonsiliasi tarif efektif, hingga prosedur audit dua skenario recoverability DTA serta ketentuan UU HPP. Status & skenario tersimpan otomatis untuk jejak audit.
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { PSAK46View });
