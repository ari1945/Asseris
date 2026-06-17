/* [codemod] ESM imports */
import React from 'react';
import { useFirm } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Avatar, Badge, Btn, Panel, Progress, Stat, Tabs } from './ui.jsx';
import { EvDirection, EvDossier, EvSelection } from './view_evidence2.jsx';

/* ============================================================
   NeoSuite AMS — Evidence Evaluation (SA 500 · Bukti Audit)
   Deep workpaper: strategi & ringkasan, matriks kecukupan &
   ketepatan, cakupan asersi (heatmap), prosedur & keandalan
   sumber, keandalan informasi (IPE) & pakar, konsistensi/
   kontradiksi bukti, kesimpulan & sign-off.
   ============================================================ */
const { useState: useStateEV, useMemo: useMemoEV } = React;

/* ---- Asersi (account balances + transactions, gabungan) ---- */
const EV_ASR = [
  { k: 'E',  full: 'Existence / Occurrence' },
  { k: 'C',  full: 'Completeness' },
  { k: 'A',  full: 'Accuracy / Valuation' },
  { k: 'CO', full: 'Cutoff' },
  { k: 'RO', full: 'Rights & Obligations' },
  { k: 'PD', full: 'Presentation & Disclosure' },
];

/* ---- 8 prosedur perolehan bukti (SA 500 ¶A14–A25) ---- */
const EV_PROCS = [
  { id: 'confirm',  label: 'Konfirmasi Eksternal',   ref: '¶A18', rel: 5, desc: 'Bukti tertulis langsung dari pihak ketiga independen — keandalan tertinggi.' },
  { id: 'inspectA', label: 'Inspeksi Aset Fisik',    ref: '¶A14', rel: 5, desc: 'Pemeriksaan fisik aset oleh auditor — andal untuk asersi keberadaan.' },
  { id: 'recalc',   label: 'Penghitungan Ulang',     ref: '¶A19', rel: 5, desc: 'Pengecekan akurasi matematis dokumen/catatan secara independen.' },
  { id: 'reperf',   label: 'Pelaksanaan Kembali',    ref: '¶A20', rel: 5, desc: 'Auditor melaksanakan ulang prosedur/pengendalian yang dijalankan entitas.' },
  { id: 'observe',  label: 'Observasi',              ref: '¶A17', rel: 4, desc: 'Menyaksikan proses dijalankan; terbatas pada momen observasi.' },
  { id: 'inspectD', label: 'Inspeksi Dokumen',       ref: '¶A14', rel: 3, desc: 'Keandalan bergantung pada sumber & efektivitas pengendalian internal.' },
  { id: 'analytic', label: 'Prosedur Analitis',      ref: '¶A21', rel: 3, desc: 'Evaluasi hubungan data keuangan & non-keuangan; jarang konklusif sendiri.' },
  { id: 'inquiry',  label: 'Permintaan Keterangan',  ref: '¶A22', rel: 1, desc: 'Tidak cukup sendiri (¶A2) — wajib dikuatkan bukti korroboratif lain.' },
];
const EV_PROC_MAP = Object.fromEntries(EV_PROCS.map(p => [p.id, p]));

/* ---- Hierarki keandalan sumber bukti (SA 500 ¶A31) ---- */
const EV_HIERARCHY = [
  ['Bukti dari pihak ketiga independen (konfirmasi langsung)', 5],
  ['Bukti diperoleh langsung oleh auditor (inspeksi/observasi)', 5],
  ['Bukti internal dengan pengendalian entitas yang efektif', 3],
  ['Bukti internal dengan pengendalian entitas yang lemah', 2],
  ['Representasi lisan manajemen', 1],
];

/* ---- Area bukti (lead schedule) ---- */
const EV_SEED = [
  { id: 'EV-A',  area: 'Kas & Setara Kas',     wp: 'A',  risk: 'Rendah',     suff: 4, approp: 5, select: 'Seluruh saldo (100%)',
    procs: ['confirm', 'recalc', 'inspectD'], asr: { E: 3, C: 2, A: 3, CO: 0, RO: 3, PD: 2 } },
  { id: 'EV-B',  area: 'Piutang Usaha & ECL',  wp: 'B',  risk: 'Signifikan', suff: 3, approp: 4, select: 'Sampel statistik + item signifikan',
    procs: ['confirm', 'reperf', 'analytic', 'inspectD'], asr: { E: 3, C: 1, A: 2, CO: 2, RO: 2, PD: 2 } },
  { id: 'EV-C',  area: 'Persediaan',           wp: 'C',  risk: 'Signifikan', suff: 2, approp: 3, select: 'Observasi opname + sampel NRV',
    procs: ['observe', 'inspectA', 'recalc', 'inquiry'], asr: { E: 2, C: 1, A: 1, CO: 2, RO: 2, PD: 1 } },
  { id: 'EV-E',  area: 'Aset Tetap',           wp: 'E',  risk: 'Moderat',    suff: 4, approp: 4, select: 'Sampel penambahan material',
    procs: ['inspectA', 'inspectD', 'recalc'], asr: { E: 3, C: 2, A: 3, CO: 2, RO: 3, PD: 2 } },
  { id: 'EV-R',  area: 'Pendapatan',           wp: 'R',  risk: 'Signifikan', suff: 3, approp: 4, select: 'Sampel + cut-off dua arah',
    procs: ['reperf', 'analytic', 'inspectD', 'confirm'], asr: { E: 3, C: 2, A: 3, CO: 3, RO: 0, PD: 2 } },
  { id: 'EV-F',  area: 'Sewa (PSAK 73)',       wp: 'F',  risk: 'Signifikan', suff: 2, approp: 3, select: 'Seluruh kontrak material',
    procs: ['recalc', 'inspectD', 'inquiry'], asr: { E: 2, C: 2, A: 1, CO: 0, RO: 2, PD: 1 } },
  { id: 'EV-AA', area: 'Utang Usaha',          wp: 'AA', risk: 'Moderat',    suff: 4, approp: 4, select: 'Search unrecorded + sampel',
    procs: ['confirm', 'reperf', 'inspectD'], asr: { E: 3, C: 3, A: 2, CO: 2, RO: 2, PD: 2 } },
];

/* ---- Informasi yang dihasilkan entitas (IPE · SA 500 ¶A56) ---- */
const EV_IPE = [
  { ref: 'IPE-1', report: 'Aging Report Piutang',       sys: 'ERP — Modul AR',        usedFor: 'Uji aging & ECL', area: 'B', acc: true,  comp: true,  status: 'Andal' },
  { ref: 'IPE-2', report: 'Laporan Mutasi Persediaan',  sys: 'ERP — Modul Inventory', usedFor: 'Uji NRV & opname', area: 'C', acc: true,  comp: false, status: 'Perlu Uji Ulang' },
  { ref: 'IPE-3', report: 'Register Aset Tetap',        sys: 'Fixed Asset System',    usedFor: 'Vouching & penyusutan', area: 'E', acc: true, comp: true, status: 'Andal' },
  { ref: 'IPE-4', report: 'Daftar Kontrak Sewa',        sys: 'Spreadsheet manual',    usedFor: 'Kalkulasi PSAK 73', area: 'F', acc: false, comp: false, status: 'Andal Terbatas' },
  { ref: 'IPE-5', report: 'Sales Detail Report',        sys: 'ERP — Modul Sales',     usedFor: 'Cut-off & sampel', area: 'R', acc: true,  comp: true,  status: 'Andal' },
];

/* ---- Pakar (SA 500 ¶8) ---- */
const EV_EXPERTS = [
  { name: 'KJPP Rinaldi & Rekan',         type: 'Pakar Manajemen', area: 'Penilaian properti investasi', comp: 'Memadai', obj: 'Independen', concl: 'Laporan penilaian dapat diandalkan; asumsi tingkat kapitalisasi diuji kewajaran.' },
  { name: 'Aktuaris — PT Dayamandiri',    type: 'Pakar Manajemen', area: 'Imbalan kerja (PSAK 24)',       comp: 'Memadai', obj: 'Independen', concl: 'Asumsi diskonto & mortalita wajar; rekonsiliasi liabilitas cocok.' },
  { name: 'Spesialis Valuasi (KAP)',      type: 'Pakar Auditor',   area: 'Re-estimasi ECL (PSAK 71)',     comp: 'Tinggi',  obj: 'Internal',   concl: 'Mendukung kewajaran kalibrasi PD/LGD model manajemen.' },
];

/* ---- Konsistensi & kontradiksi bukti (SA 500 ¶11) ---- */
const EV_CONSIST = [
  { id: 'X-1', topic: 'Saldo kas BCA',                  a: 'Konfirmasi bank — Rp 12,40 M',     b: 'Buku besar — Rp 12,40 M',          state: 'Konsisten',         open: false, res: 'Cocok tepat — tidak ada selisih.' },
  { id: 'X-2', topic: 'Eksistensi piutang PT Ritel Maju', a: 'Konfirmasi positif disetujui',    b: 'Penerimaan kas subsequent',        state: 'Saling Menguatkan', open: false, res: 'Dua sumber independen mengonfirmasi keberadaan & penilaian.' },
  { id: 'X-3', topic: 'Kuantitas persediaan gudang B',  a: 'Observasi opname auditor',          b: 'Laporan mutasi (IPE-2)',           state: 'Kontradiksi',       open: true,  res: 'Selisih 1,8% — koreksi mutasi belum di-posting. Investigasi & re-uji kelengkapan.' },
  { id: 'X-4', topic: 'Masa sewa kontrak L-07',         a: 'Memo transisi manajemen',           b: 'Dokumen kontrak asli',             state: 'Kontradiksi',       open: true,  res: 'Opsi perpanjangan dinilai ulang; re-kalkulasi present value diminta.' },
  { id: 'X-5', topic: 'Pengakuan pendapatan akhir TA',  a: 'Cut-off testing dok. pengiriman',   b: 'Prosedur analitis tren bulanan',   state: 'Konsisten',         open: false, res: 'Tren konsisten; tidak ada indikasi pergeseran cut-off.' },
];

const EV_RISK_COLOR = { 'Signifikan': 'red', 'Moderat': 'amber', 'Rendah': 'green' };

/* score helpers */
const evScore = (i) => (i.suff + i.approp) / 2;
const evStatus = (sc) => sc >= 3.5 ? { k: 'green', t: 'Memadai' } : sc >= 3 ? { k: 'amber', t: 'Cukup' } : { k: 'red', t: 'Kurang' };
const evRateColor = (v) => v >= 4 ? 'var(--green)' : v >= 3 ? 'var(--amber)' : 'var(--red)';
/* heatmap cell color by assertion strength 0-3 */
const evCell = (v) => v === 0 ? { bg: 'var(--surface-3)', fg: 'var(--ink-4)', t: '·' }
  : v === 1 ? { bg: 'var(--red-bg)', fg: 'var(--red)', t: '1' }
  : v === 2 ? { bg: 'var(--amber-bg)', fg: 'var(--amber)', t: '2' }
  : { bg: 'var(--green-bg)', fg: 'var(--green)', t: '3' };

/* ============================================================ */
function EvidenceEvaluation() {
  const firm = (typeof useFirm === 'function') ? useFirm() : null;
  const client = firm?.activeClient?.name || 'PT Sentosa Makmur Tbk';
  const [tab, setTab] = useStateEV('ringkasan');
  const [items, setItems] = useStateEV(EV_SEED);
  const [selId, setSelId] = useStateEV('EV-C');

  const setVal = (id, key, v) => setItems(l => l.map(i => i.id === id ? { ...i, [key]: v } : i));
  const cycleAsr = (id, a) => setItems(l => l.map(i => i.id === id ? { ...i, asr: { ...i.asr, [a]: (i.asr[a] + 1) % 4 } } : i));

  /* aggregate metrics */
  const avgScore = items.reduce((s, i) => s + evScore(i), 0) / items.length;
  const adequate = items.filter(i => evScore(i) >= 3.5).length;
  const needWork = items.filter(i => evScore(i) < 3).length;
  let relevant = 0, covered = 0;
  items.forEach(i => EV_ASR.forEach(({ k }) => { if (i.asr[k] > 0) { relevant++; if (i.asr[k] >= 2) covered++; } }));
  const coverage = Math.round(covered / relevant * 100);
  const openContra = EV_CONSIST.filter(c => c.open).length;

  const verdict = (avgScore >= 3.5 && coverage >= 85 && openContra === 0)
    ? { k: 'green', label: 'Bukti Cukup & Tepat', t: 'Bukti audit yang cukup dan tepat telah diperoleh untuk seluruh asersi material. Dasar yang memadai untuk menarik kesimpulan audit.' }
    : (avgScore >= 3 && coverage >= 70)
    ? { k: 'amber', label: 'Sebagian Perlu Diperkuat', t: 'Mayoritas area memadai, namun terdapat asersi/area dengan bukti belum cukup atau kontradiksi terbuka — rancang prosedur tambahan sebelum simpulan.' }
    : { k: 'red', label: 'Belum Memadai', t: 'Bukti belum cukup & tepat pada beberapa area material. Perluas prosedur substantif sebelum menyimpulkan.' };

  const tabs = [
    { id: 'ringkasan', label: 'Strategi & Ringkasan' },
    { id: 'matriks',   label: 'Kecukupan & Ketepatan' },
    { id: 'seleksi',   label: 'Seleksi Item' },
    { id: 'arah',      label: 'Relevansi & Arah Uji' },
    { id: 'berkas',    label: 'Berkas Bukti' },
    { id: 'asersi',    label: 'Cakupan Asersi' },
    { id: 'prosedur',  label: 'Prosedur & Keandalan' },
    { id: 'informasi', label: 'Keandalan Informasi & Pakar' },
    { id: 'konsisten', label: 'Konsistensi Bukti' },
    { id: 'kesimpulan',label: 'Kesimpulan & Sign-off' },
  ];

  const sel = items.find(i => i.id === selId);

  return (
    <>
      <SubBar moduleId="evidence" right={
        <div className="row gap8 ac">
          <Badge kind="blue">SA 500</Badge>
          <Btn sm><I.download size={13} /> Memo Evaluasi Bukti</Btn>
          <Btn sm variant="primary"><I.check size={14} /> Simpulkan Bukti</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        {/* summary header */}
        <Panel noBody className="" >
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 180 }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Evaluasi Bukti Audit</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{client}</div>
              <div className="tiny muted">{items.length} area · {firm?.activeEngagement?.id || 'ENG-2025-014'}</div>
            </div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Skor Bukti</div><div className="mono" style={{ fontWeight: 700, fontSize: 13, color: `var(--${avgScore >= 3.5 ? 'green' : 'amber'})` }}>{avgScore.toFixed(1)} / 5</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Cakupan Asersi</div><div className="mono" style={{ fontWeight: 700, fontSize: 13, color: `var(--${coverage >= 85 ? 'green' : 'amber'})` }}>{coverage}%</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Area Memadai</div><div className="mono" style={{ fontWeight: 700, fontSize: 13 }}>{adequate}/{items.length}</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Kontradiksi Terbuka</div><div className="mono" style={{ fontWeight: 700, fontSize: 13, color: `var(--${openContra ? 'red' : 'green'})` }}>{openContra}</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Simpulan Bukti</div>
              <Badge kind={verdict.k} dot>{verdict.label}</Badge>
            </div>
          </div>
        </Panel>

        <div style={{ margin: '12px 0', overflowX: 'auto', paddingBottom: 1 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

        {tab === 'ringkasan'  && <EvStrategy items={items} verdict={verdict} avgScore={avgScore} coverage={coverage} />}
        {tab === 'matriks'    && <EvMatrix items={items} sel={sel} selId={selId} setSelId={setSelId} setVal={setVal} cycleAsr={cycleAsr} />}
        {tab === 'seleksi'    && <EvSelection />}
        {tab === 'arah'       && <EvDirection />}
        {tab === 'berkas'     && <EvDossier />}
        {tab === 'asersi'     && <EvAssertions items={items} cycleAsr={cycleAsr} coverage={coverage} covered={covered} relevant={relevant} />}
        {tab === 'prosedur'   && <EvProcedures items={items} />}
        {tab === 'informasi'  && <EvInformation />}
        {tab === 'konsisten'  && <EvConsistency openContra={openContra} />}
        {tab === 'kesimpulan' && <EvConclusion items={items} verdict={verdict} avgScore={avgScore} coverage={coverage} openContra={openContra} firm={firm} />}

      </div></div>
    </>
  );
}

/* ---------------- Tab 1: Strategi & Ringkasan ---------------- */
function EvStrategy({ items, verdict, avgScore, coverage }) {
  const principles = [
    { ic: 'scale', t: 'Kecukupan (Sufficiency)', d: 'Ukuran kuantitas bukti. Dipengaruhi penilaian risiko salah saji & kualitas bukti — makin tinggi risiko, makin banyak bukti dibutuhkan.', ref: '¶5(e), ¶A4' },
    { ic: 'target', t: 'Ketepatan (Appropriateness)', d: 'Ukuran kualitas bukti: relevansi terhadap asersi & keandalan sumber. Bukti yang lebih tepat mengurangi kuantitas yang diperlukan.', ref: '¶5(b), ¶A5' },
    { ic: 'layers', t: 'Relevansi & Keandalan', d: 'Relevansi = kaitan dengan asersi yang diuji. Keandalan = dipengaruhi sumber, sifat, dan keadaan perolehan bukti.', ref: '¶A27–A31' },
    { ic: 'flask', t: 'Skeptisisme Profesional', d: 'Pertimbangkan relevansi & keandalan informasi; evaluasi konsistensi bukti dari berbagai sumber serta indikasi kontradiksi.', ref: '¶7, ¶11' },
  ];
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 330px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Strategi Perolehan & Evaluasi Bukti</h3><div style={{ flex: 1 }} /><span className="tiny muted">SA 500 · SA 330</span></div>
          <div style={{ padding: 14 }}>
            <p style={{ margin: '0 0 12px', fontSize: 12.5, lineHeight: 1.6, color: 'var(--ink-2)' }}>
              Tim merancang prosedur audit lanjutan yang responsif terhadap risiko salah saji material yang dinilai (SA 330),
              guna memperoleh <b>bukti audit yang cukup dan tepat</b> sebagai dasar kesimpulan opini. Setiap area lead schedule
              dievaluasi atas dua dimensi — kecukupan (kuantitas) dan ketepatan (kualitas: relevansi & keandalan) — serta
              cakupan terhadap asersi material yang relevan.
            </p>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {principles.map((p, i) => {
                const IconC = I[p.ic] || I.layers;
                return (
                  <div key={i} className="panel" style={{ padding: '11px 12px', borderColor: 'var(--line)', display: 'flex', gap: 10 }}>
                    <div style={{ width: 30, height: 30, flex: '0 0 30px', borderRadius: 7, background: 'var(--blue-100)', color: 'var(--blue)', display: 'grid', placeItems: 'center' }}><IconC size={16} /></div>
                    <div>
                      <div className="row ac jb" style={{ marginBottom: 2 }}><span style={{ fontSize: 12, fontWeight: 700 }}>{p.t}</span><span className="mono tiny muted">{p.ref}</span></div>
                      <div className="tiny" style={{ color: 'var(--ink-2)', lineHeight: 1.45 }}>{p.d}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Status Bukti per Area</h3><div style={{ flex: 1 }} /><span className="tiny muted">skor = (kecukupan + ketepatan) / 2</span></div>
          <div style={{ padding: '6px 14px 12px' }}>
            {items.map(i => {
              const sc = evScore(i); const st = evStatus(sc);
              return (
                <div key={i.id} className="row ac gap8" style={{ padding: '8px 0', borderBottom: '1px solid var(--line-soft)' }}>
                  <span className="mono tiny muted" style={{ width: 30, flex: '0 0 30px' }}>{i.wp}</span>
                  <span style={{ width: 150, flex: '0 0 150px', fontWeight: 600, fontSize: 12 }}>{i.area}</span>
                  <Badge kind={EV_RISK_COLOR[i.risk]}>{i.risk}</Badge>
                  <div style={{ flex: 1, maxWidth: 240 }}><Progress value={sc / 5 * 100} color={`var(--${st.k})`} /></div>
                  <span className="mono" style={{ width: 30, textAlign: 'right', fontWeight: 700, color: `var(--${st.k})` }}>{sc.toFixed(1)}</span>
                  <span style={{ width: 78, textAlign: 'right' }}><Badge kind={st.k}>{st.t}</Badge></span>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div style={{ padding: '14px 16px', background: `var(--${verdict.k}-bg)`, borderBottom: '1px solid var(--line)' }}>
            <div className="row ac gap8" style={{ marginBottom: 6 }}>
              <span style={{ color: `var(--${verdict.k})` }}>{verdict.k === 'green' ? <I.checkCircle size={18} /> : <I.alert size={18} />}</span>
              <span style={{ fontWeight: 800, fontSize: 14, color: `var(--${verdict.k})` }}>{verdict.label}</span>
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--ink-2)' }}>{verdict.t}</div>
          </div>
          <div style={{ padding: 14, display: 'grid', gap: 12 }}>
            <div className="row ac jb"><span className="tiny muted upper">Skor Bukti Rata-rata</span><span className="mono" style={{ fontWeight: 700, color: `var(--${avgScore >= 3.5 ? 'green' : 'amber'})` }}>{avgScore.toFixed(1)} / 5</span></div>
            <div className="row ac jb"><span className="tiny muted upper">Cakupan Asersi</span><span className="mono" style={{ fontWeight: 700, color: `var(--${coverage >= 85 ? 'green' : 'amber'})` }}>{coverage}%</span></div>
          </div>
        </Panel>

        <Panel title="Pernyataan Standar" sub="SA 500 ¶6">
          <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.6, color: 'var(--ink-2)' }}>
            "Auditor harus merancang dan melaksanakan prosedur audit yang tepat sesuai dengan kondisi untuk memperoleh
            bukti audit yang cukup dan tepat." Cukup ≠ banyak; bukti berkualitas tinggi dari sumber andal menurunkan
            kuantitas yang dibutuhkan untuk tingkat keyakinan yang sama.
          </p>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab 2: Matriks Kecukupan & Ketepatan ---------------- */
function EvMatrix({ items, sel, selId, setSelId, setVal, cycleAsr }) {
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 330px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Matriks Kecukupan & Ketepatan Bukti</h3><div style={{ flex: 1 }} /><span className="tiny muted">klik baris untuk evaluasi · skala 1–5</span></div>
          <table className="dtbl">
            <thead><tr>
              <th>Area / WP</th><th>Risiko</th><th>Seleksi Item</th>
              <th className="num" style={{ width: 44 }} title="Kecukupan">Suff</th>
              <th className="num" style={{ width: 52 }} title="Ketepatan">Approp</th>
              <th className="num" style={{ width: 44 }}>Skor</th>
              <th style={{ width: 90 }}>Status</th>
            </tr></thead>
            <tbody>
              {items.map(i => {
                const sc = evScore(i); const st = evStatus(sc);
                return (
                  <tr key={i.id} className={i.id === selId ? 'sel' : ''} onClick={() => setSelId(i.id)} style={{ cursor: 'pointer' }}>
                    <td><div style={{ fontWeight: 600 }}>{i.area}</div><div className="tiny muted mono">WP {i.wp}</div></td>
                    <td><Badge kind={EV_RISK_COLOR[i.risk]}>{i.risk}</Badge></td>
                    <td className="tiny muted truncate" style={{ maxWidth: 170 }}>{i.select}</td>
                    <td className="num"><span className="mono" style={{ fontWeight: 700, color: evRateColor(i.suff) }}>{i.suff}</span></td>
                    <td className="num"><span className="mono" style={{ fontWeight: 700, color: evRateColor(i.approp) }}>{i.approp}</span></td>
                    <td className="num"><span className="mono" style={{ fontWeight: 700, color: `var(--${st.k})` }}>{sc.toFixed(1)}</span></td>
                    <td><Badge kind={st.k}>{st.t}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>

        {sel && (
          <Panel noBody>
            <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }} className="row ac gap8">
              <span className="mono" style={{ fontWeight: 700, color: 'var(--blue)' }}>{sel.id}</span>
              <span style={{ fontWeight: 700 }}>{sel.area}</span>
              <Badge kind={EV_RISK_COLOR[sel.risk]}>{sel.risk}</Badge>
              <div style={{ flex: 1 }} />
              <span className="tiny muted">Sesuaikan penilaian, prosedur & cakupan asersi</span>
            </div>
            <div style={{ padding: 14 }}>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <div>
                  {[['Kecukupan — kuantitas bukti', 'suff'], ['Ketepatan — relevansi & keandalan', 'approp']].map(([lbl, key]) => (
                    <div key={key} style={{ marginBottom: 12 }}>
                      <div className="row jb ac" style={{ marginBottom: 4 }}><span style={{ fontSize: 12, fontWeight: 600 }}>{lbl}</span><span className="mono" style={{ fontWeight: 700, color: evRateColor(sel[key]) }}>{sel[key]}/5</span></div>
                      <input type="range" min="1" max="5" value={sel[key]} onChange={e => setVal(sel.id, key, +e.target.value)} style={{ width: '100%', accentColor: 'var(--blue)' }} />
                    </div>
                  ))}
                  <div className="tiny muted upper" style={{ margin: '4px 0 6px' }}>Prosedur Diterapkan</div>
                  <div className="row wrap gap6">
                    {sel.procs.map(p => {
                      const pr = EV_PROC_MAP[p];
                      return <span key={p} className="chip tiny" title={pr.desc} style={{ height: 20 }}><span style={{ width: 7, height: 7, borderRadius: 2, background: pr.rel >= 4 ? 'var(--green)' : pr.rel >= 3 ? 'var(--amber)' : 'var(--red)' }} />{pr.label}</span>;
                    })}
                  </div>
                </div>
                <div>
                  <div className="tiny muted upper" style={{ marginBottom: 6 }}>Cakupan Asersi <span style={{ textTransform: 'none', letterSpacing: 0 }}>(klik untuk ubah kekuatan 0→3)</span></div>
                  <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {EV_ASR.map(({ k, full }) => {
                      const c = evCell(sel.asr[k]);
                      return (
                        <button key={k} onClick={() => cycleAsr(sel.id, k)} title={full} style={{ cursor: 'pointer', border: '1px solid var(--line)', borderRadius: 6, background: c.bg, color: c.fg, padding: '6px 8px', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 11, fontWeight: 700 }}>{k}</span>
                          <span className="mono" style={{ fontWeight: 700 }}>{c.t}</span>
                        </button>
                      );
                    })}
                  </div>
                  {EV_ASR.some(({ k }) => sel.asr[k] === 1) && (
                    <div className="panel" style={{ marginTop: 10, padding: '8px 10px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
                      <div className="tiny" style={{ lineHeight: 1.4 }}>Terdapat asersi dengan bukti <b>lemah (1)</b> — rancang prosedur tambahan agar bukti cukup & tepat.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Panel>
        )}
      </div>

      <Panel title="Hierarki Keandalan Sumber" sub="SA 500 ¶A31">
        <div style={{ display: 'grid', gap: 0 }}>
          {EV_HIERARCHY.map(([t, r], i) => (
            <div key={i} className="row gap8 ac" style={{ padding: '9px 0', borderBottom: i < EV_HIERARCHY.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
              <div style={{ display: 'flex', gap: 2, flex: '0 0 auto' }}>
                {[1, 2, 3, 4, 5].map(n => <span key={n} style={{ width: 6, height: 14, borderRadius: 1, background: n <= r ? (r >= 4 ? 'var(--green)' : r >= 3 ? 'var(--amber)' : 'var(--red)') : 'var(--surface-3)' }} />)}
              </div>
              <span style={{ fontSize: 11.5, lineHeight: 1.35 }}>{t}</span>
            </div>
          ))}
        </div>
        <div className="divider" />
        <div className="tiny muted" style={{ lineHeight: 1.5 }}>Makin tinggi keandalan sumber, makin sedikit bukti yang dibutuhkan untuk tingkat keyakinan yang sama.</div>
      </Panel>
    </div>
  );
}

/* ---------------- Tab 3: Cakupan Asersi (heatmap) ---------------- */
function EvAssertions({ items, cycleAsr, coverage, covered, relevant }) {
  return (
    <div className="grid" style={{ gap: 12 }}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={coverage + '%'} label="Asersi Tercakup (kekuatan ≥ 2)" accent={coverage >= 85 ? 'var(--green)' : 'var(--amber)'} /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={covered + '/' + relevant} label="Sel Tercakup / Relevan" accent="var(--blue)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={items.reduce((s, i) => s + EV_ASR.filter(({ k }) => i.asr[k] === 1).length, 0)} label="Asersi Bukti Lemah (gap)" accent="var(--red)" /></div></Panel>
      </div>

      <Panel noBody>
        <div className="panel-h"><h3>Heatmap Cakupan Asersi × Area</h3><div style={{ flex: 1 }} /><span className="tiny muted">klik sel untuk ubah kekuatan · 0 n.a · 1 lemah · 2 memadai · 3 kuat</span></div>
        <div style={{ padding: 14, overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 5, width: '100%' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', fontSize: 11, color: 'var(--ink-3)', fontWeight: 700, padding: '0 6px' }}>Area</th>
                {EV_ASR.map(({ k, full }) => (
                  <th key={k} title={full} style={{ width: 64, fontSize: 11, color: 'var(--ink-3)', fontWeight: 700, padding: 2 }}>{k}<div className="tiny muted" style={{ fontWeight: 500, fontSize: 9 }}>{full.split(' / ')[0]}</div></th>
                ))}
                <th style={{ width: 70, fontSize: 11, color: 'var(--ink-3)', fontWeight: 700 }}>Rata²</th>
              </tr>
            </thead>
            <tbody>
              {items.map(i => {
                const rel = EV_ASR.filter(({ k }) => i.asr[k] > 0);
                const avg = rel.length ? (rel.reduce((s, { k }) => s + i.asr[k], 0) / rel.length) : 0;
                return (
                  <tr key={i.id}>
                    <td style={{ padding: '0 6px', whiteSpace: 'nowrap' }}><div style={{ fontWeight: 600, fontSize: 12 }}>{i.area}</div><div className="tiny muted mono">WP {i.wp}</div></td>
                    {EV_ASR.map(({ k, full }) => {
                      const c = evCell(i.asr[k]);
                      return (
                        <td key={k} style={{ padding: 0 }}>
                          <button onClick={() => cycleAsr(i.id, k)} title={`${i.area} · ${full}`} className="hcell" style={{ width: '100%', border: '1px solid var(--line)', cursor: 'pointer', background: c.bg, color: c.fg }}>{c.t}</button>
                        </td>
                      );
                    })}
                    <td style={{ padding: 0 }}>
                      <div className="hcell" style={{ background: 'var(--surface-2)', color: avg >= 2.5 ? 'var(--green)' : avg >= 2 ? 'var(--amber)' : 'var(--red)', border: '1px solid var(--line)' }}>{avg.toFixed(1)}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel noBody>
        <div className="panel-h"><h3>Daftar Asersi (SA 315 ¶A129)</h3></div>
        <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {EV_ASR.map(({ k, full }) => (
            <div key={k} className="row ac gap8" style={{ fontSize: 12 }}>
              <span className="mono" style={{ width: 26, height: 26, flex: '0 0 26px', borderRadius: 6, background: 'var(--blue-100)', color: 'var(--blue)', display: 'grid', placeItems: 'center', fontWeight: 700 }}>{k}</span>
              <span style={{ fontWeight: 600 }}>{full}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- Tab 4: Prosedur & Keandalan ---------------- */
function EvProcedures({ items }) {
  /* count procedure usage across areas */
  const usage = {};
  items.forEach(i => i.procs.forEach(p => { usage[p] = (usage[p] || 0) + 1; }));
  const maxUse = Math.max(1, ...Object.values(usage));
  const inquiryAreas = items.filter(i => i.procs.includes('inquiry'));

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 330px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Delapan Prosedur Perolehan Bukti</h3><div style={{ flex: 1 }} /><span className="tiny muted">SA 500 ¶A14–A25 · keandalan & frekuensi</span></div>
          <table className="dtbl">
            <thead><tr><th>Prosedur</th><th style={{ width: 50 }}>Ref</th><th style={{ width: 120 }}>Keandalan</th><th style={{ width: 170 }}>Frekuensi Penggunaan</th></tr></thead>
            <tbody>
              {EV_PROCS.map(p => (
                <tr key={p.id}>
                  <td><div style={{ fontWeight: 600 }}>{p.label}</div><div className="tiny muted" style={{ whiteSpace: 'normal', maxWidth: 320, lineHeight: 1.35 }}>{p.desc}</div></td>
                  <td className="mono tiny muted">{p.ref}</td>
                  <td>
                    <div className="row ac gap6">
                      <div style={{ display: 'flex', gap: 2 }}>{[1, 2, 3, 4, 5].map(n => <span key={n} style={{ width: 6, height: 13, borderRadius: 1, background: n <= p.rel ? (p.rel >= 4 ? 'var(--green)' : p.rel >= 3 ? 'var(--amber)' : 'var(--red)') : 'var(--surface-3)' }} />)}</div>
                    </div>
                  </td>
                  <td>
                    <div className="row ac gap8">
                      <div style={{ flex: 1, maxWidth: 90 }}><Progress value={(usage[p.id] || 0) / maxUse * 100} color={p.rel >= 4 ? 'var(--green)' : p.rel >= 3 ? 'var(--amber)' : 'var(--red)'} /></div>
                      <span className="mono tiny" style={{ fontWeight: 700 }}>{usage[p.id] || 0} area</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <div className="panel" style={{ padding: '11px 14px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
          <div className="row ac gap8" style={{ marginBottom: 4 }}><span style={{ color: 'var(--amber)' }}><I.alert size={16} /></span><span style={{ fontSize: 12.5, fontWeight: 700 }}>Peringatan: permintaan keterangan tidak cukup sendiri (¶A2)</span></div>
          <div className="tiny" style={{ lineHeight: 1.5, color: 'var(--ink-2)' }}>
            Permintaan keterangan digunakan pada {inquiryAreas.length} area ({inquiryAreas.map(a => a.wp).join(', ')}). Pada area tersebut bukti
            harus dikuatkan prosedur korroboratif (inspeksi, konfirmasi, atau re-perform) — bukan diandalkan sebagai bukti tunggal.
          </div>
        </div>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Hierarki Keandalan Sumber" sub="¶A31">
          <div style={{ display: 'grid', gap: 0 }}>
            {EV_HIERARCHY.map(([t, r], i) => (
              <div key={i} className="row gap8 ac" style={{ padding: '8px 0', borderBottom: i < EV_HIERARCHY.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                <div style={{ display: 'flex', gap: 2 }}>{[1, 2, 3, 4, 5].map(n => <span key={n} style={{ width: 5, height: 13, borderRadius: 1, background: n <= r ? (r >= 4 ? 'var(--green)' : r >= 3 ? 'var(--amber)' : 'var(--red)') : 'var(--surface-3)' }} />)}</div>
                <span style={{ fontSize: 11, lineHeight: 1.3 }}>{t}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Faktor Keandalan Bukti" sub="¶A31">
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11.5, lineHeight: 1.6, color: 'var(--ink-2)' }}>
            <li>Independensi sumber dari entitas</li>
            <li>Efektivitas pengendalian internal atas bukti internal</li>
            <li>Diperoleh langsung oleh auditor vs. tidak langsung</li>
            <li>Bentuk dokumenter (tertulis) vs. lisan</li>
            <li>Dokumen asli vs. salinan/faksimile</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab 5: Keandalan Informasi (IPE) & Pakar ---------------- */
function EvInformation() {
  const ipeReliable = EV_IPE.filter(x => x.acc && x.comp).length;
  return (
    <div className="grid" style={{ gap: 12 }}>
      <Panel noBody>
        <div className="panel-h"><h3>Keandalan Informasi yang Dihasilkan Entitas (IPE)</h3><div style={{ flex: 1 }} /><span className="tiny muted">SA 500 ¶9 · ¶A56 — uji akurasi & kelengkapan</span></div>
        <table className="dtbl">
          <thead><tr><th style={{ width: 56 }}>Ref</th><th>Laporan / Output</th><th>Sumber Sistem</th><th>Digunakan Untuk</th><th style={{ width: 64 }} className="num">Akurasi</th><th style={{ width: 84 }} className="num">Kelengkapan</th><th style={{ width: 120 }}>Status</th></tr></thead>
          <tbody>
            {EV_IPE.map(x => (
              <tr key={x.ref}>
                <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{x.ref}</td>
                <td style={{ fontWeight: 600 }}>{x.report} <span className="mono tiny muted">({x.area})</span></td>
                <td className="tiny muted">{x.sys}</td>
                <td className="tiny">{x.usedFor}</td>
                <td className="num">{x.acc ? <span style={{ color: 'var(--green)' }}><I.check size={15} /></span> : <span style={{ color: 'var(--red)' }}><I.x size={15} /></span>}</td>
                <td className="num">{x.comp ? <span style={{ color: 'var(--green)' }}><I.check size={15} /></span> : <span style={{ color: 'var(--red)' }}><I.x size={15} /></span>}</td>
                <td><Badge kind={x.acc && x.comp ? 'green' : x.acc || x.comp ? 'amber' : 'red'}>{x.status}</Badge></td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td colSpan="4">Ringkasan — {ipeReliable}/{EV_IPE.length} laporan teruji andal</td><td colSpan="3" className="tiny muted" style={{ textAlign: 'right' }}>IPE non-andal harus diuji ulang sebelum diandalkan sebagai bukti</td></tr></tfoot>
        </table>
      </Panel>

      <Panel noBody>
        <div className="panel-h"><h3>Penggunaan Pekerjaan Pakar</h3><div style={{ flex: 1 }} /><span className="tiny muted">SA 500 ¶8 — kompetensi · kapabilitas · objektivitas</span></div>
        <table className="dtbl">
          <thead><tr><th>Pakar</th><th style={{ width: 130 }}>Jenis</th><th>Area</th><th style={{ width: 90 }}>Kompetensi</th><th style={{ width: 100 }}>Objektivitas</th><th>Kesimpulan Auditor</th></tr></thead>
          <tbody>
            {EV_EXPERTS.map((e, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{e.name}</td>
                <td><Badge kind={e.type === 'Pakar Auditor' ? 'purple' : 'blue'}>{e.type}</Badge></td>
                <td className="tiny">{e.area}</td>
                <td><Badge kind={e.comp === 'Tinggi' ? 'green' : 'green'}>{e.comp}</Badge></td>
                <td className="tiny">{e.obj}</td>
                <td className="tiny muted" style={{ whiteSpace: 'normal', maxWidth: 260, lineHeight: 1.4 }}>{e.concl}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <div className="panel" style={{ padding: '11px 14px', background: 'var(--blue-050)', borderColor: 'var(--line)' }}>
        <div className="tiny" style={{ lineHeight: 1.55, color: 'var(--ink-2)' }}>
          <b>Catatan:</b> Saat menggunakan informasi yang dihasilkan entitas sebagai bukti, auditor mengevaluasi apakah informasi
          tersebut cukup andal — termasuk <b>akurasi & kelengkapan</b> serta tingkat <b>presisi & rincian</b> yang memadai untuk tujuan audit.
          Untuk pekerjaan pakar, auditor menilai kompetensi, kapabilitas, dan objektivitas pakar serta memperoleh pemahaman atas bidang keahliannya.
        </div>
      </div>
    </div>
  );
}

/* ---------------- Tab 6: Konsistensi Bukti ---------------- */
function EvConsistency({ openContra }) {
  const STATE_KIND = { 'Konsisten': 'green', 'Saling Menguatkan': 'green', 'Kontradiksi': 'red' };
  return (
    <div className="grid" style={{ gap: 12 }}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={EV_CONSIST.filter(c => !c.open).length} label="Bukti Saling Konsisten" accent="var(--green)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={openContra} label="Kontradiksi Terbuka" accent={openContra ? 'var(--red)' : 'var(--green)'} /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={EV_CONSIST.length} label="Item Triangulasi" accent="var(--blue)" /></div></Panel>
      </div>

      {openContra > 0 && (
        <div className="panel" style={{ padding: '11px 14px', background: 'var(--red-bg)', borderColor: 'transparent' }}>
          <div className="row ac gap8"><span style={{ color: 'var(--red)' }}><I.alert size={17} /></span><span style={{ fontSize: 12.5, fontWeight: 600 }}>{openContra} kontradiksi bukti belum terselesaikan — SA 500 ¶11 mewajibkan auditor menentukan modifikasi/penambahan prosedur untuk menyelesaikan inkonsistensi sebelum menyimpulkan.</span></div>
        </div>
      )}

      <Panel noBody>
        <div className="panel-h"><h3>Log Konsistensi & Kontradiksi Bukti</h3><div style={{ flex: 1 }} /><span className="tiny muted">SA 500 ¶11 — korroborasi antar-sumber</span></div>
        <table className="dtbl">
          <thead><tr><th style={{ width: 44 }}>Ref</th><th>Topik / Asersi</th><th>Sumber A</th><th>Sumber B</th><th style={{ width: 140 }}>Hasil</th><th>Resolusi</th></tr></thead>
          <tbody>
            {EV_CONSIST.map(c => (
              <tr key={c.id}>
                <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{c.id}</td>
                <td style={{ fontWeight: 600 }}>{c.topic}</td>
                <td className="tiny muted">{c.a}</td>
                <td className="tiny muted">{c.b}</td>
                <td><Badge kind={STATE_KIND[c.state]} dot>{c.state}</Badge></td>
                <td className="tiny" style={{ whiteSpace: 'normal', maxWidth: 280, lineHeight: 1.4, color: c.open ? 'var(--red)' : 'var(--ink-2)' }}>{c.open && <b>[Terbuka] </b>}{c.res}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

/* ---------------- Tab 7: Kesimpulan & Sign-off ---------------- */
function EvConclusion({ items, verdict, avgScore, coverage, openContra, firm }) {
  const partner = firm?.activeEngagement?.partner || 'Hartono Wijaya, CPA';
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 330px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Kesimpulan Kecukupan & Ketepatan per Area</h3></div>
          <table className="dtbl">
            <thead><tr><th>Area / WP</th><th className="num" style={{ width: 44 }}>Skor</th><th style={{ width: 90 }}>Asersi Lemah</th><th>Kesimpulan</th></tr></thead>
            <tbody>
              {items.map(i => {
                const sc = evScore(i); const st = evStatus(sc);
                const weak = EV_ASR.filter(({ k }) => i.asr[k] === 1).map(({ k }) => k);
                const ok = sc >= 3.5 && weak.length === 0;
                return (
                  <tr key={i.id}>
                    <td><div style={{ fontWeight: 600 }}>{i.area}</div><div className="tiny muted mono">WP {i.wp}</div></td>
                    <td className="num"><span className="mono" style={{ fontWeight: 700, color: `var(--${st.k})` }}>{sc.toFixed(1)}</span></td>
                    <td>{weak.length ? <span className="mono tiny" style={{ color: 'var(--red)', fontWeight: 700 }}>{weak.join(', ')}</span> : <span className="tiny muted">—</span>}</td>
                    <td><Badge kind={ok ? 'green' : 'amber'}>{ok ? 'Cukup & tepat' : 'Perlu prosedur tambahan'}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>

        <Panel noBody>
          <div style={{ padding: '14px 16px', background: `var(--${verdict.k}-bg)`, borderBottom: '1px solid var(--line)' }}>
            <div className="row ac gap8" style={{ marginBottom: 6 }}>
              <span style={{ color: `var(--${verdict.k})` }}>{verdict.k === 'green' ? <I.checkCircle size={18} /> : <I.alert size={18} />}</span>
              <span style={{ fontWeight: 800, fontSize: 15, color: `var(--${verdict.k})` }}>Simpulan Keseluruhan: {verdict.label}</span>
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink-2)' }}>{verdict.t}</div>
          </div>
          <div style={{ padding: 14 }}>
            <p style={{ margin: '0 0 10px', fontSize: 12, lineHeight: 1.6, color: 'var(--ink-2)' }}>
              Berdasarkan evaluasi atas {items.length} area lead schedule, skor bukti rata-rata mencapai <b>{avgScore.toFixed(1)}/5</b> dengan
              cakupan asersi <b>{coverage}%</b>{openContra > 0 ? <> dan <b style={{ color: 'var(--red)' }}>{openContra} kontradiksi belum terselesaikan</b></> : <> dan <b style={{ color: 'var(--green)' }}>tanpa kontradiksi terbuka</b></>}.
              {verdict.k === 'green'
                ? ' Tim menyimpulkan bahwa bukti audit yang cukup dan tepat telah diperoleh sebagai dasar opini.'
                : ' Prosedur audit tambahan dirancang untuk area & asersi yang belum memadai sebelum simpulan akhir ditarik.'}
            </p>
            <div className="row wrap gap8">
              <Btn sm variant="primary"><I.check size={13} /> Tandai Bukti Disimpulkan</Btn>
              <Btn sm><I.link2 size={13} /> Tautkan ke SAD Ledger</Btn>
              <Btn sm><I.download size={13} /> Export Memo SA 500</Btn>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Sign-off Kertas Kerja">
          {[['Penyusun', 'Anindya Putri', 'Senior Associate', '08 Mar 2026', 'green'], ['Reviewer', 'Dimas Rahardjo, CPA', 'Manager', '10 Mar 2026', 'green'], ['Persetujuan', partner, 'Engagement Partner', 'Menunggu', 'amber']].map((r, i) => (
            <div key={i} className="row ac gap8" style={{ padding: '9px 0', borderBottom: i < 2 ? '1px solid var(--line-soft)' : 0 }}>
              <Avatar name={r[1]} size={30} />
              <div style={{ flex: 1 }}>
                <div className="tiny muted upper">{r[0]}</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{r[1]}</div>
                <div className="tiny muted">{r[2]}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Badge kind={r[4]}>{r[4] === 'green' ? 'Selesai' : 'Pending'}</Badge>
                <div className="tiny muted mono" style={{ marginTop: 3 }}>{r[3]}</div>
              </div>
            </div>
          ))}
        </Panel>
        <Panel title="Referensi Standar">
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11.5, lineHeight: 1.7, color: 'var(--ink-2)' }}>
            <li><b>SA 500</b> — Bukti Audit</li>
            <li><b>SA 330</b> — Respons terhadap Risiko</li>
            <li><b>SA 501</b> — Bukti Audit Spesifik</li>
            <li><b>SA 505</b> — Konfirmasi Eksternal</li>
            <li><b>SA 520</b> — Prosedur Analitis</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}

Object.assign(window, { EvidenceEvaluation });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { EvidenceEvaluation };
