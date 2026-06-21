/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { WpExtractions } from './ai_extract';
import { useAudit, useFirm } from './contexts';
import { I } from './icons';
import { SubBar } from './shell.jsx';
import { Avatar, Badge, Btn, Donut, LockBanner, Panel, Placeholder, Seg, Stat, Tabs } from './ui.jsx';

/* ============================================================
   Asseris — Working Papers (audit file workspace)
   Deep build: file status · index · tabbed lead schedule,
   procedures, cross-refs, review notes, sign-off & audit trail
   ============================================================ */
const { useState: useStateWP, useMemo: useMemoWP } = React;

/* ---- File index (ref, title, preparer, reviewer, status) ---- */
const WP_INDEX = [
  { sec: 'Perencanaan', items: [['100', 'Memorandum Strategi Audit', 'Anindya P.', 'Hartono W.', 'Reviewed'], ['200', 'Penilaian Risiko & RoMM', 'Anindya P.', 'Hartono W.', 'Reviewed'], ['300', 'Perhitungan Materialitas', 'Dimas R.', 'Anindya P.', 'Reviewed']] },
  { sec: 'Aset', items: [['A', 'Kas dan Setara Kas', 'Fajar N.', 'Anindya P.', 'Reviewed'], ['B', 'Piutang Usaha & ECL', 'Dimas R.', 'Anindya P.', 'In Review'], ['C', 'Persediaan', 'Rina K.', '—', 'In Progress'], ['E', 'Aset Tetap', 'Dimas R.', 'Anindya P.', 'In Review'], ['F', 'Sewa PSAK 73', 'Sinta W.', '—', 'In Progress']] },
  { sec: 'Liabilitas & Ekuitas', items: [['AA', 'Utang Usaha', 'Fajar N.', 'Anindya P.', 'Reviewed'], ['BB', 'Utang Bank', 'Rina K.', 'Anindya P.', 'Reviewed'], ['H', 'Imbalan Kerja', 'Sinta W.', '—', 'In Progress'], ['K', 'Ekuitas', 'Fajar N.', 'Anindya P.', 'Reviewed']] },
  { sec: 'Laba Rugi', items: [['R', 'Pendapatan', 'Dimas R.', '—', 'In Progress'], ['S', 'Beban Pokok Penjualan', 'Rina K.', '—', 'In Progress'], ['U', 'Beban Operasi', 'Fajar N.', 'Anindya P.', 'In Review']] },
  { sec: 'Penyelesaian', items: [['810', 'SAD Ledger & Evaluasi', 'Anindya P.', 'Hartono W.', 'Not Started'], ['820', 'Subsequent Events', 'Sinta W.', '—', 'Not Started'], ['900', 'Draft Laporan & Opini', 'Anindya P.', 'Hartono W.', 'Not Started']] },
];

const TICKMARKS = [
  { sym: '✓', label: 'Diperiksa ke dokumen sumber', color: 'var(--green)' },
  { sym: 'Φ', label: 'Footing/casting diuji', color: 'var(--blue)' },
  { sym: '©', label: 'Dicocokkan ke konfirmasi', color: 'var(--purple)' },
  { sym: '^', label: 'Ditelusuri ke buku besar', color: 'var(--amber)' },
  { sym: '∆', label: 'Selisih — lihat catatan', color: 'var(--red)' },
];

/* ---- Per-WP audit procedures (assertion-tagged) ---- */
const WP_PROCS = {
  '100': [['Dokumentasikan pemahaman entitas & lingkungannya (SA 315)', 'Pemahaman'], ['Tetapkan strategi & rencana audit menyeluruh (SA 300)', 'Perencanaan'], ['Diskusi tim perikatan atas risiko kecurangan (SA 240)', 'Kecurangan']],
  '200': [['Identifikasi & nilai RoMM tingkat LK & asersi (SA 315)', 'Penilaian Risiko'], ['Tautkan respons audit ke setiap risiko signifikan (SA 330)', 'Respons'], ['Evaluasi pengendalian relevan terhadap risiko', 'Pengendalian']],
  '300': [['Tetapkan benchmark & overall materiality (SA 320)', 'Materialitas'], ['Tetapkan performance materiality & clearly trivial', 'Materialitas'], ['Dokumentasikan pertimbangan revisi materialitas', 'Materialitas']],
  A: [['Peroleh & uji rekonsiliasi bank seluruh akun per 31 Des 2025', 'Keberadaan'], ['Kirim & terima konfirmasi bank independen; cocokkan saldo', 'Keberadaan'], ['Uji pisah batas penerimaan/pengeluaran kas ±5 hari', 'Pisah Batas'], ['Telaah deposito berjangka & saldo dibatasi penggunaannya', 'Penyajian'], ['Hitung kas kecil & uji rekonsiliasinya', 'Keberadaan']],
  B: [['Cocokkan daftar piutang & aging ke buku besar', 'Kelengkapan'], ['Kirim konfirmasi positif sampel MUS; prosedur alternatif untuk non-respons', 'Keberadaan'], ['Uji pisah batas penjualan atas faktur akhir tahun', 'Pisah Batas'], ['Re-perform model ECL PSAK 71; uji asumsi PD/LGD & matriks provisi', 'Penilaian'], ['Uji penerimaan setelah tanggal neraca (subsequent receipts)', 'Penilaian'], ['Evaluasi piutang fiktif teridentifikasi & dampak AJE', 'Keterjadian']],
  C: [['Hadiri & observasi stock opname; uji hitung dua arah', 'Keberadaan'], ['Cocokkan kompilasi opname ke buku besar', 'Kelengkapan'], ['Uji penilaian biaya perolehan vs NRV; identifikasi barang usang', 'Penilaian'], ['Uji pisah batas penerimaan & pengeluaran barang', 'Pisah Batas'], ['Telaah persediaan dalam perjalanan & konsinyasi', 'Hak & Kewajiban']],
  E: [['Peroleh roll-forward; cocokkan saldo awal ke KK tahun lalu', 'Kelengkapan'], ['Vouch penambahan signifikan ke faktur & bukti otorisasi', 'Keberadaan'], ['Uji pelepasan & laba/rugi; pastikan penghapusbukuan', 'Keberadaan'], ['Re-kalkulasi penyusutan & uji konsistensi metode/umur', 'Penilaian'], ['Telaah indikasi penurunan nilai (PSAK 48)', 'Penilaian']],
  F: [['Peroleh daftar kontrak sewa; uji kelengkapan vs kontrak baru', 'Kelengkapan'], ['Re-kalkulasi aset hak-guna & liabilitas sewa (diskonto)', 'Penilaian'], ['Uji incremental borrowing rate yang digunakan', 'Penilaian'], ['Uji klasifikasi jangka pendek/panjang liabilitas sewa', 'Penyajian'], ['Telaah pengungkapan PSAK 73 di CALK', 'Penyajian']],
  AA: [['Cocokkan daftar utang ke buku besar & uji aging', 'Kelengkapan'], ['Uji utang belum tercatat (search for unrecorded liabilities)', 'Kelengkapan'], ['Konfirmasi pemasok utama / rekonsiliasi laporan pemasok', 'Keberadaan'], ['Uji pisah batas penerimaan barang', 'Pisah Batas']],
  BB: [['Konfirmasi saldo & fasilitas ke bank', 'Keberadaan'], ['Telaah perjanjian kredit & covenant; uji kepatuhan', 'Penyajian'], ['Uji klasifikasi jangka pendek/panjang', 'Penyajian'], ['Re-kalkulasi beban bunga & akrual', 'Penilaian']],
  H: [['Peroleh laporan aktuaria; nilai kompetensi & objektivitas pakar (SA 500)', 'Penilaian'], ['Uji asumsi aktuaria (diskonto, kenaikan gaji, mortalita)', 'Penilaian'], ['Cocokkan data karyawan yang digunakan aktuaris', 'Kelengkapan'], ['Telaah pengungkapan PSAK 24', 'Penyajian']],
  K: [['Cocokkan modal saham ke akta & daftar pemegang saham', 'Keberadaan'], ['Telusuri mutasi saldo laba & dividen ke notulen RUPS', 'Kelengkapan'], ['Telaah penyajian & pengungkapan ekuitas', 'Penyajian']],
  R: [['Analitis pendapatan per bulan/segmen; investigasi fluktuasi', 'Keterjadian'], ['Uji pisah batas pendapatan sebelum/sesudah tutup buku', 'Pisah Batas'], ['Sampel pengakuan ke kontrak, pengiriman & penerimaan', 'Keterjadian'], ['Uji penjualan & retur pasca neraca (channel stuffing)', 'Keterjadian'], ['Telaah kebijakan pengakuan pendapatan PSAK 72', 'Penyajian']],
  S: [['Analitis margin kotor per lini produk; investigasi anomali', 'Keterjadian'], ['Uji pisah batas pembelian & beban', 'Pisah Batas'], ['Rekonsiliasi BPP ke pergerakan persediaan', 'Kelengkapan'], ['Sampel beban ke dokumen pendukung', 'Keterjadian']],
  U: [['Analitis beban operasi vs anggaran & tahun lalu', 'Kelengkapan'], ['Sampel beban signifikan ke bukti & otorisasi', 'Keterjadian'], ['Uji beban akrual & beban dibayar di muka', 'Pisah Batas']],
  '810': [['Akumulasi salah saji teridentifikasi (terkoreksi & tidak)', 'Evaluasi'], ['Evaluasi dampak agregat vs materialitas (SA 450)', 'Evaluasi'], ['Peroleh representasi manajemen atas salah saji tidak dikoreksi', 'Representasi']],
  '820': [['Prosedur peristiwa kemudian s.d. tanggal laporan (SA 560)', 'Subsequent'], ['Telaah notulen, kontrak & kejadian pasca neraca', 'Subsequent'], ['Evaluasi peristiwa penyesuai vs pengungkap', 'Penyajian']],
  '900': [['Susun draf opini sesuai temuan (SA 700/705)', 'Pelaporan'], ['Finalisasi Hal Audit Utama / KAM (SA 701)', 'Pelaporan'], ['Telaah kelengkapan LK & checklist pengungkapan', 'Penyajian']],
};
const procsFor = (ref) => WP_PROCS[ref] || [['Lakukan prosedur substantif atas saldo', 'Substantif'], ['Cocokkan ke buku besar & dokumen sumber', 'Kelengkapan'], ['Dokumentasikan kesimpulan', 'Kesimpulan']];
const PROC_EXC_SEED = { B: [5], C: [2] };
const defaultProcState = (ref, status, i, total) => {
  if ((PROC_EXC_SEED[ref] || []).includes(i)) return 'Pengecualian';
  if (status === 'Reviewed') return 'Selesai';
  if (status === 'In Review') return i < total - 1 ? 'Selesai' : 'Belum';
  if (status === 'In Progress') return i < Math.ceil(total / 2) ? 'Selesai' : 'Belum';
  return 'Belum';
};

/* ---- Attachments per WP ---- */
const WP_ATTACH = {
  A: [['rekening-koran-des2025.pdf', 'PDF', 'Bag. Keuangan', 1420], ['konfirmasi-bank-bca.pdf', 'PDF', 'Fajar N.', 88], ['rekonsiliasi-bank.xlsx', 'XLSX', 'Fajar N.', 64]],
  B: [['aging-piutang.xlsx', 'XLSX', 'Bag. Keuangan', 210], ['konfirmasi-piutang-batch1.pdf', 'PDF', 'Dimas R.', 540], ['model-ecl-psak71.xlsx', 'XLSX', 'Dimas R.', 96]],
  C: [['stock-opname-2025.pdf', 'PDF', 'Rina K.', 380], ['uji-nrv-persediaan.xlsx', 'XLSX', 'Rina K.', 72]],
  E: [['register-aset-tetap.xlsx', 'XLSX', 'Bag. Akuntansi', 156], ['vouching-penambahan.pdf', 'PDF', 'Dimas R.', 240]],
  F: [['daftar-kontrak-sewa.xlsx', 'XLSX', 'Sinta W.', 48], ['kalkulasi-rou-psak73.xlsx', 'XLSX', 'Sinta W.', 120]],
  R: [['analitis-pendapatan.xlsx', 'XLSX', 'Dimas R.', 88], ['sampel-kontrak-penjualan.pdf', 'PDF', 'Dimas R.', 612]],
};
const attachFor = (ref) => WP_ATTACH[ref] || [['lead-schedule.xlsx', 'XLSX', 'Tim Audit', 60]];

/* ---- Seed review notes pinned to specific WPs ---- */
const WP_SEED_NOTES = {
  B: [
    { id: 'b1', author: 'Anindya P.', to: 'Dimas R.', text: 'Konfirmasi piutang batch-2 belum lengkap — lakukan prosedur alternatif (subsequent receipt) untuk 3 saldo non-respons.', priority: 'high', status: 'open', created: '2 hari lalu' },
    { id: 'b2', author: 'Anindya P.', to: 'Dimas R.', text: 'Lampirkan re-perform model ECL beserta dokumentasi asumsi PD & matriks provisi.', priority: 'medium', status: 'open', created: '2 hari lalu' },
  ],
  C: [{ id: 'c1', author: 'Anindya P.', to: 'Rina K.', text: 'Sertakan kertas kerja uji NRV untuk SKU bergerak lambat (> 180 hari).', priority: 'medium', status: 'open', created: 'kemarin' }],
  E: [{ id: 'e1', author: 'Anindya P.', to: 'Dimas R.', text: 'Vouch 2 penambahan mesin > Rp 1 M ke faktur & berita acara serah terima.', priority: 'low', status: 'resolved', created: '3 hari lalu' }],
  R: [{ id: 'r1', author: 'Anindya P.', to: 'Dimas R.', text: 'Perluas uji pisah batas pendapatan — fokus 10 hari terakhir & retur awal Januari.', priority: 'high', status: 'open', created: 'hari ini' }],
};

/* ============================================================ */
function WorkingPapers() {
  const { fmt } = AMS;
  const { wtb, wpState, risks } = useAudit();
  const { activeEngagement, activeClient, locked } = useFirm();
  const [filter, setFilter] = useStateWP('All');
  const [q, setQ] = useStateWP('');
  const [openRef, setOpenRef] = useStateWP(null);

  /* deep-link: open a specific WP when navigated from Review Notes / My Tasks */
  React.useEffect(() => {
    try { const t = localStorage.getItem('ams.wpOpen'); if (t) { setOpenRef(t); localStorage.removeItem('ams.wpOpen'); } } catch (e) {}
  }, []);

  const all = WP_INDEX.flatMap(s => s.items);
  const statusOf = (it) => (wpState[it[0]] && wpState[it[0]].status) || it[4];
  const balanceOf = (ref) => { const rows = wtb.filter(r => r.lead === ref); return rows.length ? rows.reduce((a, r) => a + r.adj, 0) : null; };

  /* per-WP derived metrics */
  const metrics = useMemoWP(() => {
    const m = {};
    all.forEach(it => {
      const ref = it[0], st = statusOf(it);
      const defs = procsFor(ref);
      const saved = (wpState[ref] && wpState[ref].procs) || {};
      let done = 0, exc = 0;
      defs.forEach((_, i) => {
        const s = saved['p' + i] != null ? saved['p' + i] : defaultProcState(ref, st, i, defs.length);
        if (s === 'Selesai') done++; if (s === 'Pengecualian') exc++;
      });
      const base = WP_SEED_NOTES[ref] || [];
      const added = (wpState[ref] && wpState[ref].notes) || [];
      const ov = (wpState[ref] && wpState[ref].noteStatus) || {};
      const openNotes = base.concat(added).filter(n => (ov[n.id] || n.status) === 'open').length;
      m[ref] = { done, total: defs.length, exc, openNotes, risk: risks.filter(r => (r.wp || '').split('-')[0] === ref).length };
    });
    return m;
  }, [wpState, risks]);

  const cnt = { Reviewed: 0, 'In Review': 0, 'In Progress': 0, 'Not Started': 0 };
  all.forEach(it => { cnt[statusOf(it)] = (cnt[statusOf(it)] || 0) + 1; });
  const total = all.length;
  const wsum = cnt['Reviewed'] * 1 + cnt['In Review'] * 0.7 + cnt['In Progress'] * 0.4;
  const completeness = Math.round((wsum / total) * 100);
  const openNotesTotal = Object.values(metrics).reduce((a, x: any) => a + x.openNotes, 0);
  const excTotal = Object.values(metrics).reduce((a, x: any) => a + x.exc, 0);

  const om = activeEngagement.materiality, pm = Math.round(om * 0.75), triv = Math.round(om * 0.05);
  const covBadge = (bal) => {
    if (bal == null) return null;
    const a = Math.abs(bal);
    if (a >= pm) return <Badge kind="teal">≥ PM</Badge>;
    if (a >= triv) return <Badge kind="blue">Parsial</Badge>;
    return <Badge kind="gray">Trivial</Badge>;
  };

  const donutSegs = [
    { value: cnt['Reviewed'], color: 'var(--green)' },
    { value: cnt['In Review'], color: 'var(--blue)' },
    { value: cnt['In Progress'], color: 'var(--amber)' },
    { value: cnt['Not Started'], color: 'var(--line-strong)' },
  ];

  const openItem = openRef ? all.find(i => i[0] === openRef) : null;
  const matchQ = (it) => !q || it[1].toLowerCase().includes(q.toLowerCase()) || it[0].toLowerCase().includes(q.toLowerCase());

  return (
    <>
      <SubBar moduleId="workpapers" right={
        <div className="row gap8 ac">
          <div className="row ac" style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 8, color: 'var(--ink-4)', pointerEvents: 'none' }}><I.search2 size={13} /></span>
            <input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="Cari ref / judul…" style={{ width: 150, paddingLeft: 26, height: 26 }} />
          </div>
          <Seg options={['All', 'Reviewed', 'In Review', 'In Progress', 'Not Started']} value={filter} onChange={setFilter} />
          <Btn sm variant="primary" disabled={locked}><I.plus size={14} /> WP Baru</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">
        {locked && <LockBanner />}

        {/* ---- File status band ---- */}
        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1px 1fr 1px 1.2fr', gap: 0, alignItems: 'stretch' }}>
            {/* identity */}
            <div style={{ padding: '14px 16px' }}>
              <div className="row ac gap8" style={{ marginBottom: 8 }}>
                <span style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--navy)', color: '#fff', display: 'grid', placeItems: 'center' }}><I.layers size={17} /></span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }} className="truncate">File Audit · {activeClient?.name}</div>
                  <div className="tiny muted mono">{activeEngagement.id} · {activeEngagement.fy} · {activeEngagement.standard}</div>
                </div>
              </div>
              <div className="row wrap gap6">
                <span className="chip tiny"><I.shield size={11} /> {activeEngagement.risk} risk</span>
                <span className="chip tiny"><I.target size={11} /> PM Rp {fmt(pm / 1e6, 0)} jt</span>
                {activeClient?.listed && <span className="chip tiny" style={{ background: 'var(--purple-bg)', color: 'var(--purple)' }}><I.flag size={11} /> PIE · EQR wajib</span>}
              </div>
            </div>
            <div style={{ background: 'var(--line-soft)' }} />
            {/* completeness donut */}
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <Donut segments={donutSegs} size={84} thickness={12} center={<><div style={{ fontWeight: 800, fontSize: 18, lineHeight: 1 }}>{completeness}%</div><div className="tiny muted" style={{ fontSize: 9 }}>lengkap</div></>} />
              <div style={{ display: 'grid', gap: 4 }}>
                {[['Reviewed', cnt['Reviewed'], 'var(--green)'], ['In Review', cnt['In Review'], 'var(--blue)'], ['In Progress', cnt['In Progress'], 'var(--amber)'], ['Not Started', cnt['Not Started'], 'var(--line-strong)']].map(([l, n, c]) => (
                  <div key={l} className="row ac gap6 tiny"><span style={{ width: 8, height: 8, borderRadius: 2, background: c }} /><span style={{ color: 'var(--ink-2)' }}>{l}</span><span className="mono muted" style={{ marginLeft: 2 }}>{n}</span></div>
                ))}
              </div>
            </div>
            <div style={{ background: 'var(--line-soft)' }} />
            {/* archive / assembly */}
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
              <div className="row ac jb">
                <span className="tiny upper muted" style={{ fontWeight: 700 }}>Perakitan Arsip · SA 230</span>
                <Badge kind={locked ? 'gray' : 'amber'}>{locked ? 'Terkunci' : 'Terbuka'}</Badge>
              </div>
              <div className="row ac gap8 tiny">
                <span className="muted">Target laporan</span>
                <span className="mono" style={{ fontWeight: 600 }}>31 Mar 2026</span>
              </div>
              <div className="row ac gap8 tiny">
                <span className="muted">Batas perakitan (+60 hari)</span>
                <span className="mono" style={{ fontWeight: 600 }}>30 Mei 2026</span>
              </div>
              <div className="panel" style={{ padding: '7px 10px', background: 'var(--blue-050)', borderColor: 'transparent' }}>
                <div className="row ac gap6 tiny" style={{ color: 'var(--blue)', fontWeight: 600 }}><I.lock size={12} /> File dikunci read-only setelah perakitan final.</div>
              </div>
            </div>
          </div>
        </Panel>

        {/* ---- KPI cards ---- */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={`${cnt['Reviewed']}/${total}`} label="Sign-off Selesai" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={cnt['In Review']} label="Menunggu Review" accent="var(--blue)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={openNotesTotal} label="Catatan Review Terbuka" accent={openNotesTotal ? 'var(--amber)' : 'var(--ink)'} /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={excTotal} label="Pengecualian Prosedur" accent={excTotal ? 'var(--red)' : 'var(--ink)'} /></div></Panel>
        </div>

        {/* ---- Index ---- */}
        <Panel noBody>
          <div className="panel-h"><h3>Indeks Kertas Kerja</h3><div style={{ flex: 1 }} /><span className="tiny muted">Klik baris untuk membuka file kertas kerja</span></div>
          <table className="dtbl">
            <thead><tr>
              <th style={{ width: 54 }}>Ref</th><th>Judul</th>
              <th className="num" style={{ width: 96 }}>Saldo (jt)</th>
              <th style={{ width: 78 }}>Cakupan</th>
              <th style={{ width: 120 }}>Prosedur</th>
              <th style={{ width: 64, textAlign: 'center' }}>Catatan</th>
              <th style={{ width: 86 }}>Preparer</th>
              <th style={{ width: 86 }}>Reviewer</th>
              <th style={{ width: 104 }}>Status</th>
            </tr></thead>
            <tbody>
              {WP_INDEX.map(sec => {
                const visible = sec.items.filter(i => (filter === 'All' || statusOf(i) === filter) && matchQ(i));
                if (!visible.length) return null;
                const rev = sec.items.filter(i => statusOf(i) === 'Reviewed').length;
                return (
                  <React.Fragment key={sec.sec}>
                    <tr className="group-row"><td colSpan={9}><span className="row ac jb"><span>{sec.sec}</span><span style={{ fontWeight: 600, textTransform: 'none', letterSpacing: 0, color: 'var(--ink-3)' }}>{rev}/{sec.items.length} sign-off</span></span></td></tr>
                    {visible.map(it => {
                      const ref = it[0], st = statusOf(it), mt = metrics[ref], bal = balanceOf(ref);
                      const rv = (wpState[ref] && wpState[ref].reviewer) || it[3];
                      const pct = mt.total ? Math.round(mt.done / mt.total * 100) : 0;
                      return (
                        <tr key={ref} style={{ cursor: 'pointer' }} onClick={() => setOpenRef(ref)}>
                          <td className="mono" style={{ fontWeight: 700, color: 'var(--blue)' }}>{ref}</td>
                          <td style={{ fontWeight: 600 }}>
                            <span className="row ac gap6">
                              {it[1]}
                              {mt.risk > 0 && <span title={mt.risk + ' risiko signifikan teralamatkan'} style={{ color: 'var(--red)', display: 'inline-flex' }}><I.shield size={12} /></span>}
                              {mt.exc > 0 && <span title={mt.exc + ' pengecualian'} style={{ color: 'var(--red)', display: 'inline-flex' }}><I.alert size={12} /></span>}
                            </span>
                          </td>
                          <td className="num">{bal != null ? <span className={bal < 0 ? 'neg' : ''}>{fmt(bal / 1e6, 0)}</span> : <span className="muted">—</span>}</td>
                          <td>{covBadge(bal) || <span className="muted tiny">—</span>}</td>
                          <td>
                            <div className="row ac gap6">
                              <div className="pbar" style={{ flex: 1 }}><span style={{ width: pct + '%', background: pct === 100 ? 'var(--green)' : 'var(--blue)' }} /></div>
                              <span className="mono tiny muted" style={{ flex: '0 0 28px', textAlign: 'right' }}>{mt.done}/{mt.total}</span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>{mt.openNotes > 0 ? <Badge kind="amber">{mt.openNotes}</Badge> : <span className="muted tiny">—</span>}</td>
                          <td className="tiny muted">{it[2]}</td>
                          <td className="tiny muted">{rv}</td>
                          <td><Badge kind={st === 'Reviewed' ? 'green' : st === 'In Review' ? 'blue' : st === 'In Progress' ? 'amber' : 'gray'}>{st}</Badge></td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </Panel>
      </div></div>
      {openItem && <WPDrill it={openItem} onClose={() => setOpenRef(null)} />}
    </>
  );
}

/* ============================================================
   WP drill-down — tabbed audit-file detail
   ============================================================ */
function WPDrill({ it, onClose }) {
  const { fmt } = AMS;
  const { wtb, wpState, setWp, risks, aje } = useAudit();
  const { activeEngagement, activeClient, locked } = useFirm();
  const ref = it[0];
  const st = wpState[ref] || {};
  const status = st.status || it[4];
  const defs = procsFor(ref);
  const [tab, setTab] = useStateWP('lead');

  const leadRows = wtb.filter(r => r.lead === ref);
  const hasLead = leadRows.length > 0;
  const bal = hasLead ? leadRows.reduce((a, r) => a + r.adj, 0) : null;
  const om = activeEngagement.materiality, pm = Math.round(om * 0.75), triv = Math.round(om * 0.05);

  /* notes */
  const baseNotes = WP_SEED_NOTES[ref] || [];
  const addedNotes = st.notes || [];
  const noteStatus = st.noteStatus || {};
  const allNotes = baseNotes.concat(addedNotes);
  const effNoteStatus = (n) => noteStatus[n.id] || n.status;
  const openNotes = allNotes.filter(n => effNoteStatus(n) === 'open').length;

  /* procs done count */
  const procState = (i) => (st.procs && st.procs['p' + i] != null) ? st.procs['p' + i] : defaultProcState(ref, status, i, defs.length);
  const doneCount = defs.reduce((a, _, i) => a + (procState(i) === 'Selesai' ? 1 : 0), 0);
  const excCount = defs.reduce((a, _, i) => a + (procState(i) === 'Pengecualian' ? 1 : 0), 0);

  const relRisks = risks.filter(r => (r.wp || '').split('-')[0] === ref);
  const relAje = aje.filter(a => (a.ref || '').split('-')[0] === ref);

  const tabs = [
    { id: 'lead', label: 'Lead Schedule' },
    { id: 'procs', label: 'Prosedur', count: defs.length },
    { id: 'xref', label: 'Bukti & Referensi' },
    { id: 'notes', label: 'Catatan Review', count: openNotes || undefined },
    { id: 'signoff', label: 'Sign-off & Riwayat' },
  ];

  const covLabel = bal == null ? null : Math.abs(bal) >= pm ? { t: '≥ Performance Materiality · pengujian rinci penuh', k: 'teal' } : Math.abs(bal) >= triv ? { t: 'Di atas clearly-trivial · cakupan parsial', k: 'blue' } : { t: 'Di bawah clearly-trivial', k: 'gray' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.45)', zIndex: 90, display: 'grid', placeItems: 'center' }} onClick={onClose}>
      <div className="panel" style={{ width: 1000, maxWidth: '96vw', height: '92vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        {/* header */}
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, flex: '0 0 auto' }}>
          <span style={{ width: 42, height: 42, borderRadius: 9, background: 'rgba(255,255,255,.15)', display: 'grid', placeItems: 'center', fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 16 }}>{ref}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14.5 }}>{it[1]}</div>
            <div className="tiny" style={{ color: '#bcd6e4' }}>{activeEngagement.id} · {activeClient?.name?.replace('PT ', '')} · {activeEngagement.fy} &nbsp;/&nbsp; Preparer {it[2]}</div>
          </div>
          <div className="row ac gap8">
            <Badge kind={status === 'Reviewed' ? 'green' : status === 'In Review' ? 'blue' : status === 'In Progress' ? 'amber' : 'gray'}>{status}</Badge>
            <button className="top-btn" onClick={onClose} style={{ color: '#fff' }}><I.x size={18} /></button>
          </div>
        </div>

        {/* tabs */}
        <div style={{ padding: '0 16px', background: 'var(--surface)', borderBottom: '1px solid var(--line)', flex: '0 0 auto' }}>
          <Tabs tabs={tabs} active={tab} onChange={setTab} />
        </div>

        {/* body */}
        <div style={{ flex: 1, overflow: 'auto', background: 'var(--surface-2)' }}>
          <div style={{ padding: 16 }}>
            {tab === 'lead' && <LeadTab ref_={ref} it={it} leadRows={leadRows} hasLead={hasLead} bal={bal} covLabel={covLabel} st={st} setWp={setWp} locked={locked} fmt={fmt} />}
            {tab === 'procs' && <ProcsTab ref_={ref} defs={defs} procState={procState} setWp={setWp} st={st} locked={locked} doneCount={doneCount} excCount={excCount} />}
            {tab === 'xref' && <XrefTab ref_={ref} relRisks={relRisks} relAje={relAje} fmt={fmt} />}
            {tab === 'notes' && <NotesTab ref_={ref} allNotes={allNotes} effNoteStatus={effNoteStatus} setWp={setWp} st={st} locked={locked} />}
            {tab === 'signoff' && <SignoffTab ref_={ref} it={it} status={status} st={st} setWp={setWp} locked={locked} activeClient={activeClient} />}
          </div>
        </div>

        {/* footer */}
        <WPFooter ref_={ref} it={it} status={status} st={st} setWp={setWp} locked={locked} doneCount={doneCount} totalProcs={defs.length} />
      </div>
    </div>
  );
}

/* ---- Lead schedule tab ---- */
function LeadTab({ ref_, it, leadRows, hasLead, bal, covLabel, st, setWp, locked, fmt }) {
  const ticks = st.ticks || {};
  const tot = leadRows.reduce((a, r) => ({ ly: a.ly + r.ly, adj: a.adj + r.adj }), { ly: 0, adj: 0 });
  const num = (n) => <span className={n < 0 ? 'neg' : ''}>{fmt(n / 1e6, 1)}</span>;
  const cycleTick = (code) => {
    if (locked) return;
    const cur = ticks[code];
    const idx = cur == null ? 0 : (TICKMARKS.findIndex(t => t.sym === cur) + 1);
    const next = idx >= TICKMARKS.length ? null : TICKMARKS[idx].sym;
    setWp(ref_, { ticks: { ...ticks, [code]: next } });
  };

  return (
    <>
      {covLabel && (
        <div className="panel" style={{ padding: '9px 12px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Badge kind={covLabel.k}>{Math.abs(bal) >= 0 ? 'Saldo Rp ' + fmt(Math.abs(bal) / 1e6, 0) + ' jt' : '—'}</Badge>
          <span className="tiny" style={{ fontWeight: 600, color: 'var(--ink-2)' }}>{covLabel.t}</span>
        </div>
      )}
      {hasLead ? (
        <Panel noBody>
          <div className="panel-h"><h3>Lead Schedule</h3><div style={{ flex: 1 }} /><span className="tiny muted">Klik sel <b>Tick</b> untuk siklus tickmark · Rp jutaan</span></div>
          <table className="dtbl">
            <thead><tr><th style={{ width: 70 }}>Kode</th><th>Akun</th><th className="num" style={{ width: 100 }}>TA Lalu</th><th className="num" style={{ width: 100 }}>Adjusted</th><th className="num" style={{ width: 90 }}>Δ</th><th style={{ width: 56, textAlign: 'center' }}>Tick</th></tr></thead>
            <tbody>
              {leadRows.map(r => {
                const d = r.adj - r.ly;
                return (
                  <tr key={r.code}>
                    <td className="mono tiny muted">{r.code}</td>
                    <td>{r.name}</td>
                    <td className="num muted">{num(r.ly)}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{num(r.adj)}</td>
                    <td className="num tiny" style={{ color: d < 0 ? 'var(--red)' : 'var(--green)' }}>{d > 0 ? '+' : ''}{fmt(d / 1e6, 1)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button onClick={() => cycleTick(r.code)} title="Klik untuk ganti tickmark" style={{ width: 26, height: 22, border: '1px solid var(--line)', borderRadius: 4, background: '#fff', cursor: locked ? 'not-allowed' : 'pointer', fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13, color: ticks[r.code] ? (TICKMARKS.find(t => t.sym === ticks[r.code]) || {}).color : 'var(--ink-4)' }}>{ticks[r.code] || '+'}</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot><tr><td colSpan={2}>TOTAL</td><td className="num">{num(tot.ly)}</td><td className="num">{num(tot.adj)}</td><td className="num"></td><td></td></tr></tfoot>
          </table>
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--line)' }}>
            <div className="tiny muted upper" style={{ marginBottom: 6, fontWeight: 700 }}>Legenda Tickmark</div>
            <div className="row wrap gap12">
              {TICKMARKS.map(t => <span key={t.sym} className="row ac gap6 tiny"><span className="mono" style={{ fontWeight: 700, color: t.color, fontSize: 13, width: 14, textAlign: 'center' }}>{t.sym}</span>{t.label}</span>)}
            </div>
          </div>
        </Panel>
      ) : (
        <Panel noBody>
          <div className="panel-h"><h3>Dokumen Kertas Kerja</h3></div>
          <div style={{ padding: 14 }}>
            <Placeholder label={`kertas kerja ${ref_} — ${it[1]}`} height={170} />
            <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>WP naratif/dokumen (memo, checklist, atau kalkulasi). Lihat tab <b>Prosedur</b> untuk program audit dan <b>Bukti & Referensi</b> untuk lampiran.</div>
          </div>
        </Panel>
      )}
    </>
  );
}

/* ---- Procedures tab ---- */
const PROC_FLOW = { Belum: 'Selesai', Selesai: 'Pengecualian', Pengecualian: 'N/A', 'N/A': 'Belum' };
const PROC_STYLE = {
  Belum: { bg: 'var(--surface-3)', fg: 'var(--ink-3)', ic: null },
  Selesai: { bg: 'var(--green-bg)', fg: 'var(--green)', ic: 'check' },
  Pengecualian: { bg: 'var(--red-bg)', fg: 'var(--red)', ic: 'alert' },
  'N/A': { bg: 'var(--surface-3)', fg: 'var(--ink-4)', ic: null },
};
function ProcsTab({ ref_, defs, procState, setWp, st, locked, doneCount, excCount }) {
  const cycle = (i) => {
    if (locked) return;
    const cur = procState(i);
    setWp(ref_, { procs: { ...(st.procs || {}), ['p' + i]: PROC_FLOW[cur] } });
  };
  const pct = Math.round(doneCount / defs.length * 100);
  return (
    <Panel noBody>
      <div className="panel-h"><h3>Program Audit — Prosedur</h3><div style={{ flex: 1 }} />
        <span className="row ac gap8 tiny">
          {excCount > 0 && <Badge kind="red">{excCount} pengecualian</Badge>}
          <span className="muted">{doneCount}/{defs.length} selesai</span>
          <div className="pbar" style={{ width: 80 }}><span style={{ width: pct + '%', background: pct === 100 ? 'var(--green)' : 'var(--blue)' }} /></div>
        </span>
      </div>
      <div>
        {defs.map(([text, assertion], i) => {
          const s = procState(i), stl = PROC_STYLE[s];
          return (
            <div key={i} className="row gap10" style={{ padding: '11px 14px', borderBottom: '1px solid var(--line-soft)', alignItems: 'flex-start' }}>
              <span className="mono tiny muted" style={{ flex: '0 0 28px', paddingTop: 2 }}>P{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.45, color: s === 'N/A' ? 'var(--ink-4)' : 'var(--ink)', textDecoration: s === 'N/A' ? 'line-through' : 'none' }}>{text}</div>
                <div className="tiny muted" style={{ marginTop: 2 }}>Asersi: <span style={{ fontWeight: 600 }}>{assertion}</span></div>
              </div>
              <button onClick={() => cycle(i)} disabled={locked} title="Klik untuk ubah status"
                style={{ flex: '0 0 auto', height: 24, padding: '0 10px', borderRadius: 12, border: 'none', cursor: locked ? 'not-allowed' : 'pointer', background: stl.bg, color: stl.fg, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                {stl.ic && React.createElement(I[stl.ic], { size: 12 })}{s}
              </button>
            </div>
          );
        })}
      </div>
      <div style={{ padding: '10px 14px', background: 'var(--surface-2)', borderTop: '1px solid var(--line)' }}>
        <div className="tiny muted">Status prosedur tersimpan otomatis per kertas kerja. Pengecualian otomatis menandai WP di indeks & menambah hitungan pada dashboard file.</div>
      </div>
    </Panel>
  );
}

/* ---- Cross-reference tab ---- */
function XrefTab({ ref_, relRisks, relAje, fmt }) {
  const atts = attachFor(ref_);
  const fileIcon = (t) => t === 'PDF' ? 'report' : t === 'XLSX' ? 'table' : 'doc';
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {/* risks */}
      <Panel noBody>
        <div className="panel-h"><h3>Risiko Teralamatkan (RoMM)</h3><div style={{ flex: 1 }} /><span className="tiny muted">{relRisks.length} risiko</span></div>
        {relRisks.length ? (
          <table className="dtbl">
            <thead><tr><th style={{ width: 48 }}>ID</th><th>Risiko</th><th style={{ width: 110 }}>Asersi</th><th style={{ width: 100 }}>Inheren</th><th style={{ width: 80 }}>WP Ref</th></tr></thead>
            <tbody>
              {relRisks.map(r => (
                <tr key={r.id}>
                  <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.id}</td>
                  <td><span className="row ac gap6">{r.fraud && <span title="Risiko kecurangan (SA 240)" style={{ color: 'var(--red)', display: 'inline-flex' }}><I.alert size={12} /></span>}<span style={{ fontWeight: 600 }}>{r.area}</span> <span className="muted tiny truncate" style={{ maxWidth: 280 }}>— {r.desc}</span></span></td>
                  <td className="tiny">{r.assertion}</td>
                  <td><Badge kind={r.inherent === 'Significant' ? 'red' : 'amber'}>{r.inherent}</Badge></td>
                  <td className="mono tiny muted">{r.wp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="muted tiny" style={{ padding: 18, textAlign: 'center' }}>Tidak ada risiko signifikan yang ditautkan ke WP ini.</div>}
      </Panel>

      {/* AJEs */}
      <Panel noBody>
        <div className="panel-h"><h3>Jurnal Penyesuaian Terkait (AJE)</h3><div style={{ flex: 1 }} /><span className="tiny muted">{relAje.length} entri</span></div>
        {relAje.length ? (
          <table className="dtbl">
            <thead><tr><th style={{ width: 70 }}>ID</th><th>Deskripsi</th><th style={{ width: 80 }}>Ref WP</th><th className="num" style={{ width: 120 }}>Nilai (Rp)</th><th style={{ width: 90 }}>Status</th></tr></thead>
            <tbody>
              {relAje.map(a => (
                <tr key={a.id}>
                  <td className="mono tiny" style={{ fontWeight: 700 }}>{a.id}</td>
                  <td style={{ fontWeight: 600 }} className="truncate">{a.desc}</td>
                  <td className="mono tiny muted">{a.ref}</td>
                  <td className="num">{fmt(a.amount)}</td>
                  <td><Badge kind={a.status === 'Posted' ? 'green' : 'amber'}>{a.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="muted tiny" style={{ padding: 18, textAlign: 'center' }}>Tidak ada AJE yang berasal dari WP ini.</div>}
      </Panel>

      {/* attachments */}
      <Panel noBody>
        <div className="panel-h"><h3 style={{ whiteSpace: 'nowrap' }}>Lampiran & Bukti</h3><div style={{ flex: 1 }} /><Btn sm><I.plus size={13} /> Unggah</Btn></div>
        <div>
          {atts.map(([name, type, by, kb], i) => (
            <div key={i} className="row ac gap10" style={{ padding: '9px 14px', borderBottom: '1px solid var(--line-soft)' }}>
              <span style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--blue-050)', color: 'var(--blue)', display: 'grid', placeItems: 'center', flex: '0 0 30px' }}>{React.createElement(I[fileIcon(type)], { size: 15 })}</span>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12.5, fontWeight: 600 }} className="truncate">{name}</div><div className="tiny muted">Diunggah oleh {by} · {kb >= 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb + ' KB'}</div></div>
              <span className="chip tiny">{type}</span>
              <button className="btn sm icon" title="Lihat"><I.search2 size={13} /></button>
            </div>
          ))}
        </div>
      </Panel>

      {/* ekstraksi dokumen AI yang sudah disetujui auditor → didokumentasikan ke WP ini */}
      {typeof WpExtractions === 'function' && <WpExtractions wpRef={ref_} />}
    </div>
  );
}

/* ---- Review notes tab ---- */
function NotesTab({ ref_, allNotes, effNoteStatus, setWp, st, locked }) {
  const [draft, setDraft] = useStateWP('');
  const [to, setTo] = useStateWP('Dimas R.');
  const [prio, setPrio] = useStateWP('medium');
  const prioK = { high: 'red', medium: 'amber', low: 'gray' };
  const sorted = [...allNotes].sort((a, b) => (effNoteStatus(a) === 'open' ? 0 : 1) - (effNoteStatus(b) === 'open' ? 0 : 1));

  const add = () => {
    if (!draft.trim()) return;
    const note = { id: 'wn-' + Date.now(), author: 'Anindya P.', to, text: draft.trim(), priority: prio, status: 'open', created: 'baru saja' };
    setWp(ref_, { notes: [...(st.notes || []), note] });
    setDraft('');
  };
  const toggle = (n) => {
    const cur = effNoteStatus(n);
    setWp(ref_, { noteStatus: { ...(st.noteStatus || {}), [n.id]: cur === 'open' ? 'resolved' : 'open' } });
  };

  return (
    <Panel noBody>
      <div className="panel-h"><h3>Catatan Review</h3><div style={{ flex: 1 }} /><span className="tiny muted">{allNotes.filter(n => effNoteStatus(n) === 'open').length} terbuka · {allNotes.length} total</span></div>
      {!locked && (
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', background: 'var(--surface-2)' }}>
          <textarea className="input" value={draft} onChange={e => setDraft(e.target.value)} placeholder="Tulis catatan review / coaching untuk WP ini…" style={{ height: 56, padding: 9, resize: 'vertical', lineHeight: 1.5, fontFamily: 'var(--ui)', width: '100%', marginBottom: 8 }} />
          <div className="row ac gap8">
            <div className="field"><label>Ditujukan ke</label><select className="select" value={to} onChange={e => setTo(e.target.value)}>{['Dimas R.', 'Sinta W.', 'Fajar N.', 'Rina K.'].map(p => <option key={p}>{p}</option>)}</select></div>
            <div className="field"><label>Prioritas</label><select className="select" value={prio} onChange={e => setPrio(e.target.value)}>{['high', 'medium', 'low'].map(p => <option key={p} value={p}>{p}</option>)}</select></div>
            <div style={{ flex: 1 }} />
            <Btn sm variant="primary" onClick={add}><I.plus size={13} /> Tambah Catatan</Btn>
          </div>
        </div>
      )}
      <div>
        {sorted.map(n => {
          const resolved = effNoteStatus(n) === 'resolved';
          return (
            <div key={n.id} className="row gap10" style={{ padding: '12px 14px', borderBottom: '1px solid var(--line-soft)', alignItems: 'flex-start', opacity: resolved ? 0.65 : 1 }}>
              <Avatar name={n.author} size={30} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row ac gap8" style={{ marginBottom: 3 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700 }}>{n.author}</span>
                  <span className="tiny muted">→ {n.to}</span>
                  <Badge kind={prioK[n.priority]}>{n.priority}</Badge>
                  <div style={{ flex: 1 }} />
                  <span className="tiny muted">{n.created}</span>
                </div>
                <div style={{ fontSize: 12.5, lineHeight: 1.5, textDecoration: resolved ? 'line-through' : 'none' }}>{n.text}</div>
              </div>
              <button className="btn sm" disabled={locked} onClick={() => toggle(n)} style={resolved ? {} : { background: 'var(--green)', color: '#fff', borderColor: 'var(--green)' }}>
                {resolved ? <><I.sync size={13} /> Buka</> : <><I.check size={13} /> Tuntaskan</>}
              </button>
            </div>
          );
        })}
        {!sorted.length && <div className="muted tiny" style={{ padding: 28, textAlign: 'center' }}>Belum ada catatan review untuk WP ini.</div>}
      </div>
    </Panel>
  );
}

/* ---- Sign-off & audit trail tab ---- */
function SignoffTab({ ref_, it, status, st, setWp, locked, activeClient }) {
  const today = '09 Mar 2026';
  const chain = st.chain || {};
  /* derive defaults */
  const preparer = chain.preparer || { by: it[2], at: '05 Mar 2026' };
  const reviewer = chain.reviewer || (status === 'Reviewed' ? { by: st.reviewer || it[3] || 'Anindya P.', at: st.signedAt || '08 Mar 2026' } : null);
  const partner = chain.partner || null;
  const eqrReq = !!activeClient?.listed;
  const eqr = chain.eqr || null;

  const levels = [
    { key: 'preparer', role: 'Preparer', who: it[2], desc: 'Menyiapkan kertas kerja & prosedur', signed: preparer },
    { key: 'reviewer', role: 'Reviewer (Manager)', who: 'Anindya P.', desc: 'Review detail & kecukupan bukti', signed: reviewer },
    { key: 'partner', role: 'Engagement Partner', who: 'Hartono W.', desc: 'Persetujuan akhir partner', signed: partner },
  ];
  if (eqrReq) levels.push({ key: 'eqr', role: 'EQR (Penelaah Mutu)', who: 'Sari Dewanti', desc: 'Telaah pengendalian mutu perikatan (PIE)', signed: eqr });

  const canSign = (idx) => !locked && !levels[idx].signed && (idx === 0 || !!levels[idx - 1].signed);
  const sign = (idx) => {
    const lvl = levels[idx];
    const patch: any = { chain: { ...chain, [lvl.key]: { by: lvl.who, at: today } } };
    if (lvl.key === 'reviewer') { patch.status = 'Reviewed'; patch.reviewer = lvl.who; patch.signedAt = today; }
    if (lvl.key === 'preparer' && (status === 'Not Started' || status === 'In Progress')) patch.status = 'In Review';
    setWp(ref_, patch);
  };
  const unsign = (idx) => {
    const lvl = levels[idx];
    const nc = { ...chain }; delete nc[lvl.key];
    const patch: any = { chain: nc };
    if (lvl.key === 'reviewer') { patch.status = 'In Review'; patch.reviewer = null; patch.signedAt = null; }
    setWp(ref_, patch);
  };

  /* audit trail */
  const trail = [];
  levels.forEach(l => { if (l.signed) trail.push({ at: l.signed.at, who: l.signed.by, what: `Sign-off ${l.role}`, ic: 'checkCircle', col: 'var(--green)' }); });
  (st.log || []).forEach(e => trail.push(e));
  trail.push({ at: '05 Mar 2026', who: it[2], what: 'Kertas kerja dibuat & prosedur diunggah', ic: 'doc', col: 'var(--blue)' });
  trail.push({ at: '04 Mar 2026', who: 'Sistem', what: 'WP dibuat dari template metodologi v4.2', ic: 'layers', col: 'var(--ink-3)' });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Rantai Sign-off</h3><div style={{ flex: 1 }} /><span className="tiny muted">Berurutan: preparer → reviewer → partner{eqrReq ? ' → EQR' : ''}</span></div>
        <div style={{ padding: '4px 0' }}>
          {levels.map((l, i) => (
            <div key={l.key} className="row gap12" style={{ padding: '12px 14px', borderBottom: i < levels.length - 1 ? '1px solid var(--line-soft)' : 0, alignItems: 'center' }}>
              <span style={{ width: 30, height: 30, borderRadius: '50%', flex: '0 0 30px', display: 'grid', placeItems: 'center', background: l.signed ? 'var(--green-bg)' : 'var(--surface-3)', color: l.signed ? 'var(--green)' : 'var(--ink-4)' }}>
                {l.signed ? <I.check size={15} /> : <span className="mono" style={{ fontWeight: 700, fontSize: 12 }}>{i + 1}</span>}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row ac gap8"><span style={{ fontSize: 12.5, fontWeight: 700 }}>{l.role}</span>{l.key === 'eqr' && <Badge kind="purple">PIE</Badge>}</div>
                <div className="tiny muted">{l.desc}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                {l.signed ? (
                  <>
                    <div className="row ac gap6 je"><Avatar name={l.signed.by} size={20} /><span className="tiny" style={{ fontWeight: 600 }}>{l.signed.by}</span></div>
                    <div className="tiny muted mono" style={{ marginTop: 2 }}>{l.signed.at}</div>
                  </>
                ) : <span className="tiny muted">belum ditandatangani</span>}
              </div>
              {l.signed
                ? <button className="btn sm" disabled={locked} onClick={() => unsign(i)} style={{ flex: '0 0 auto' }}><I.sync size={12} /> Batalkan</button>
                : <Btn sm variant={canSign(i) ? 'primary' : ''} disabled={!canSign(i)} onClick={() => sign(i)} style={{ flex: '0 0 auto' }}><I.check size={13} /> Sign-off</Btn>}
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Riwayat & Jejak Audit">
        <div style={{ display: 'grid', gap: 0 }}>
          {trail.map((e, i) => (
            <div key={i} className="row gap8" style={{ padding: '8px 0', borderBottom: i < trail.length - 1 ? '1px solid var(--line-soft)' : 0, alignItems: 'flex-start' }}>
              <span style={{ color: e.col, marginTop: 1, flex: '0 0 auto' }}>{React.createElement(I[e.ic] || (I as any).dot, { size: 14 })}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.4 }}>{e.what}</div>
                <div className="tiny muted">{e.who} · {e.at}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ---- Footer (persistent quick sign-off) ---- */
function WPFooter({ ref_, it, status, st, setWp, locked, doneCount, totalProcs }) {
  const reviewer = st.reviewer || (status === 'Reviewed' ? it[3] : null);
  const quickSign = () => setWp(ref_, { status: 'Reviewed', reviewer: 'Anindya P.', signedAt: '09 Mar 2026', chain: { ...(st.chain || {}), preparer: (st.chain && st.chain.preparer) || { by: it[2], at: '05 Mar 2026' }, reviewer: { by: 'Anindya P.', at: '09 Mar 2026' } } });
  const reopen = () => { const nc = { ...(st.chain || {}) }; delete nc.reviewer; delete nc.partner; delete nc.eqr; setWp(ref_, { status: 'In Review', reviewer: null, signedAt: null, chain: nc }); };
  return (
    <div style={{ padding: '11px 16px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12, flex: '0 0 auto', background: 'var(--surface)' }}>
      <div className="row ac gap10" style={{ flex: 1 }}>
        <span className="row ac gap6 tiny"><span className="muted">Preparer</span><Avatar name={it[2]} size={20} /><span style={{ fontWeight: 600 }}>{it[2]}</span><span style={{ color: 'var(--green)' }}><I.check size={12} /></span></span>
        <span className="vdivider" style={{ height: 20 }} />
        <span className="row ac gap6 tiny"><span className="muted">Reviewer</span>{reviewer ? <><Avatar name={reviewer} size={20} /><span style={{ fontWeight: 600 }}>{reviewer}</span><span style={{ color: 'var(--green)' }}><I.checkCircle size={13} /></span></> : <span className="muted">menunggu</span>}</span>
        <span className="vdivider" style={{ height: 20 }} />
        <span className="row ac gap6 tiny"><span className="muted">Prosedur</span><span className="mono" style={{ fontWeight: 700 }}>{doneCount}/{totalProcs}</span></span>
      </div>
      {locked
        ? <Badge kind="gray"><I.lock size={12} /> Read-only</Badge>
        : status !== 'Reviewed'
          ? <Btn variant="primary" onClick={quickSign}><I.check size={14} /> Sign-off Review</Btn>
          : <Btn onClick={reopen}><I.sync size={14} /> Buka Kembali</Btn>}
    </div>
  );
}

/* ---- Shared helpers: expose WP-pinned notes to global Review Notes & My Tasks ---- */
const WP_TITLE = {};
WP_INDEX.forEach(s => s.items.forEach(it => { WP_TITLE[it[0]] = it[1]; }));
const WP_REFS = WP_INDEX.flatMap(s => s.items.map(it => ({ ref: it[0], title: it[1] })));
function collectWpNotes(wpState) {
  wpState = wpState || {};
  const rows = [];
  Object.entries(WP_SEED_NOTES).forEach(([ref, notes]) => notes.forEach(n => rows.push({ ...n, wpRef: ref })));
  Object.entries(wpState).forEach(([ref, s]: [string, any]) => (s.notes || []).forEach(n => rows.push({ ...n, wpRef: ref })));
  return rows.map(n => {
    const ov = (wpState[n.wpRef] || {}).noteStatus || {};
    return { ...n, status: ov[n.id] || n.status, wp: true, wpRef: n.wpRef, wpTitle: WP_TITLE[n.wpRef] || n.wpRef, module: 'workpapers', moduleLabel: 'WP ' + n.wpRef + ' · ' + (WP_TITLE[n.wpRef] || '') };
  });
}

/* ---- Canonical per-WP status derivation ----
   SINGLE SOURCE OF TRUTH for the SA reference pages. Mirrors exactly the
   metrics + sign-off logic used by the WP index & WPDrill above, so SA 5xx
   pages never keep a private copy of engagement status — they read this. */
const WP_META = {};
WP_INDEX.forEach(s => s.items.forEach(it => { WP_META[it[0]] = { title: it[1], preparer: it[2], reviewer: it[3], statusDefault: it[4], section: s.sec }; }));

function deriveWpStatus(ref, audit, firm) {
  const wpState = (audit && audit.wpState) || {};
  const wtb = (audit && audit.wtb) || [];
  const risks = (audit && audit.risks) || [];
  const meta = WP_META[ref] || { title: ref, preparer: '—', reviewer: '—', statusDefault: 'Not Started', section: '' };
  const st = wpState[ref] || {};
  const status = st.status || meta.statusDefault;

  /* procedures — identical derivation to ProcsTab / index metrics */
  const defs = procsFor(ref);
  const saved = st.procs || {};
  let done = 0, exc = 0;
  defs.forEach((_, i) => {
    const s = saved['p' + i] != null ? saved['p' + i] : defaultProcState(ref, status, i, defs.length);
    if (s === 'Selesai') done++; else if (s === 'Pengecualian') exc++;
  });

  /* open review notes — seed + user-added, honoring status overrides */
  const base = WP_SEED_NOTES[ref] || [];
  const added = st.notes || [];
  const ov = st.noteStatus || {};
  const openNotes = base.concat(added).filter(n => (ov[n.id] || n.status) === 'open').length;

  /* coverage vs materiality — balance from the canonical WTB lead rows */
  const leadRows = wtb.filter(r => r.lead === ref);
  const bal = leadRows.length ? leadRows.reduce((a, r) => a + r.adj, 0) : null;
  const om = (firm && firm.activeEngagement && firm.activeEngagement.materiality) || 0;
  const pm = Math.round(om * 0.75), triv = Math.round(om * 0.05);
  let coverage = null;
  if (bal != null) { const a = Math.abs(bal); coverage = { bal, level: a >= pm ? 'full' : a >= triv ? 'partial' : 'trivial' }; }

  /* sign-off chain — identical default logic to SignoffTab */
  const chain = st.chain || {};
  const listed = !!(firm && firm.activeClient && firm.activeClient.listed);
  const preparer = chain.preparer || { by: meta.preparer, at: '05 Mar 2026' };
  const reviewer = chain.reviewer || (status === 'Reviewed' ? { by: st.reviewer || meta.reviewer || 'Anindya P.', at: st.signedAt || '08 Mar 2026' } : null);
  const partner = chain.partner || null;
  const eqr = chain.eqr || null;
  const signoff = [
    { key: 'preparer', role: 'Preparer', signed: preparer },
    { key: 'reviewer', role: 'Reviewer', signed: reviewer },
    { key: 'partner', role: 'Partner', signed: partner },
  ];
  if (listed) signoff.push({ key: 'eqr', role: 'EQR', signed: eqr });
  const signedCount = signoff.filter(l => l.signed).length;

  const relRisks = risks.filter(r => (r.wp || '').split('-')[0] === ref);
  return { ref, title: meta.title, section: meta.section, status, done, total: defs.length, exc, openNotes, coverage, pm, triv, signoff, signedCount, fullySigned: signedCount === signoff.length, relRisks, hasLead: leadRows.length > 0 };
}

/* deep-link: open a specific WP in the canonical Working Papers module */
function openCanonicalWp(navigate, ref) {
  try { localStorage.setItem('ams.wpOpen', ref); } catch (e) {}
  if (typeof navigate === 'function') navigate('workpapers');
}

Object.assign(window, { WorkingPapers, WPDrill, collectWpNotes, WP_REFS, WP_META, deriveWpStatus, openCanonicalWp });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { WPDrill, WP_META, WP_REFS, WorkingPapers, collectWpNotes, deriveWpStatus, openCanonicalWp };
