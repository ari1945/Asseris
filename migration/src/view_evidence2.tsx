/* [codemod] ESM imports */
import React from 'react';
import { I } from './icons.jsx';
import { Badge, Donut, Panel, Progress, Seg, Stat } from './ui.jsx';
import { KvBox } from './view_analytical';

/* ============================================================
   Asseris — SA 500 · Bukti Audit (Pendalaman)
   Tiga tab tambahan untuk modul Evaluasi Bukti:
   1. Seleksi Item Uji      (SA 500 ¶10 · A52–A56)
   2. Relevansi & Arah Uji  (SA 500 ¶A27–A30)
   3. Berkas Bukti          (dossier per area + tie-out)
   ============================================================ */
const { useState: useStateE2 } = React;

const ev2Rp = (n) => 'Rp ' + (n / 1e9).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' M';
const ev2TierColor = (t) => t >= 4 ? 'var(--green)' : t === 3 ? 'var(--amber)' : 'var(--red)';
function Ev2Meter({ v, h = 13 }) {
  return <div style={{ display: 'flex', gap: 2 }}>{[1, 2, 3, 4, 5].map(n => <span key={n} style={{ width: 6, height: h, borderRadius: 1, background: n <= v ? ev2TierColor(v) : 'var(--surface-3)' }} />)}</div>;
}

/* ---- means of selecting items (¶10) ---- */
const EV2_MEANS = {
  all:      { label: 'Seluruh Item (100%)',      short: '100%',      ref: '¶A52–A53', color: 'green',  desc: 'Pemeriksaan menyeluruh atas populasi. Tepat untuk populasi kecil bernilai besar, atau saat data elektronik memungkinkan pengujian penuh (CAAT).' },
  specific: { label: 'Item Spesifik Terpilih',   short: 'Spesifik',  ref: '¶A54–A55', color: 'blue',   desc: 'Pemilihan item tertentu (nilai besar, kunci, atau berisiko) atas pertimbangan auditor. Bukan sampling — kesimpulan tidak dapat diproyeksikan ke sisa populasi.' },
  sampling: { label: 'Sampling Audit',           short: 'Sampling',  ref: '¶A56 · SA 530', color: 'purple', desc: 'Pengujian < 100% di mana seluruh unit sampling memiliki peluang terpilih; hasil dapat diproyeksikan ke populasi secara statistik/non-statistik.' },
};
const EV2_SEL = [
  { id: 'EV-A',  area: 'Kas & Setara Kas',    wp: 'A',  methods: ['all'],                  pop: 8,    popUnit: 'rekening',   popVal: 21.9e9,  sel: 8,   selVal: 21.9e9,  basis: 'Jumlah rekening bank terbatas namun material — seluruh saldo dikonfirmasi 100% ke bank.' },
  { id: 'EV-B',  area: 'Piutang Usaha & ECL', wp: 'B',  methods: ['specific', 'sampling'], pop: 412,  popUnit: 'saldo',      popVal: 51.3e9,  sel: 46,  selVal: 39.8e9,  basis: '18 saldo signifikan dikonfirmasi sebagai item spesifik (62% nilai) + 28 sampel MUS atas sisa populasi.' },
  { id: 'EV-C',  area: 'Persediaan',          wp: 'C',  methods: ['specific', 'sampling'], pop: 1240, popUnit: 'SKU',        popVal: 78.9e9,  sel: 62,  selVal: 41.0e9,  basis: 'Test count dua arah 40 item bernilai tinggi (spesifik) + 22 SKU slow-moving disampel untuk uji NRV.' },
  { id: 'EV-E',  area: 'Aset Tetap',          wp: 'E',  methods: ['specific'],             pop: 18.3e9, popUnit: 'penambahan', popVal: 18.3e9, sel: 24,  selVal: 15.6e9,  basis: 'Seluruh penambahan > materialitas kinerja divouching; populasi diuji = penambahan tahun berjalan.' },
  { id: 'EV-R',  area: 'Pendapatan',          wp: 'R',  methods: ['sampling'],             pop: 9842, popUnit: 'transaksi',  popVal: 331.9e9, sel: 120, selVal: 88.2e9,  basis: 'Sampel atribut + cut-off dua arah; hasil sampel diproyeksikan ke populasi pendapatan.' },
  { id: 'EV-F',  area: 'Sewa (PSAK 73)',      wp: 'F',  methods: ['all'],                  pop: 14,   popUnit: 'kontrak',    popVal: 12.6e9,  sel: 14,  selVal: 12.6e9,  basis: 'Seluruh kontrak sewa material di-re-kalkulasi penuh (present value & ROU).' },
  { id: 'EV-AA', area: 'Utang Usaha',         wp: 'AA', methods: ['specific', 'sampling'], pop: 286,  popUnit: 'pemasok',    popVal: 44.9e9,  sel: 38,  selVal: 31.2e9,  basis: 'Search for unrecorded liabilities pada pembayaran besar pasca-periode (spesifik) + sampel saldo vendor.' },
];

/* ---- directional testing (¶A27–A30) ---- */
const EV2_DIR = {
  over: { key: 'over', dir: 'Risiko Lebih Saji', asr: 'Keberadaan / Keterjadian · Hak', color: 'red', technique: 'Vouching', flow: 'Dari catatan → dokumen pendukung',
    desc: 'Mulai dari angka yang sudah tercatat di buku besar, telusuri ke bukti pendukung untuk membuktikan item benar-benar ada / terjadi. Menguji apakah yang dicatat memang valid.',
    example: 'Saldo piutang tercatat → konfirmasi pelanggan & dokumen pengiriman.' },
  under: { key: 'under', dir: 'Risiko Kurang Saji', asr: 'Kelengkapan', color: 'amber', technique: 'Tracing', flow: 'Dari dokumen sumber → catatan',
    desc: 'Mulai dari populasi dokumen sumber independen, telusuri ke buku besar untuk membuktikan seluruh transaksi telah dicatat. Menguji apakah ada yang belum dicatat.',
    example: 'Dokumen penerimaan barang & faktur pemasok → catatan utang usaha (search for unrecorded liabilities).' },
};
const EV2_DIRMAP = [
  { id: 'EV-B',  area: 'Piutang Usaha',  focus: 'over',  asr: 'E · RO',     tech: 'Vouching ke konfirmasi & pengiriman' },
  { id: 'EV-AA', area: 'Utang Usaha',    focus: 'under', asr: 'C',          tech: 'Tracing — search unrecorded liabilities' },
  { id: 'EV-R',  area: 'Pendapatan',     focus: 'over',  asr: 'E/O · CO',   tech: 'Vouching dok. pengiriman (cut-off)' },
  { id: 'EV-A',  area: 'Kas',            focus: 'over',  asr: 'E',          tech: 'Vouching ke konfirmasi bank' },
  { id: 'EV-E',  area: 'Aset Tetap',     focus: 'over',  asr: 'E · RO',     tech: 'Vouching penambahan + inspeksi fisik' },
  { id: 'EV-C',  area: 'Persediaan',     focus: 'both',  asr: 'E · C',      tech: 'Test count dua arah (vouch + trace)' },
  { id: 'EV-F',  area: 'Sewa (PSAK 73)', focus: 'both',  asr: 'C · A',      tech: 'Trace kontrak + re-kalkulasi liabilitas' },
];

/* ---- evidence dossier per area ---- */
const EV2_DOSS = {
  'EV-A': { area: 'Kas & Setara Kas', wp: 'A', items: [
    { ref: 'A-1', proc: 'Konfirmasi Eksternal', tier: 5, desc: 'Konfirmasi saldo 8 rekening langsung dari bank (standar IBI).', src: 'Bank — pihak ketiga', asr: ['E', 'RO', 'A'], res: 'tie' },
    { ref: 'A-2', proc: 'Inspeksi Dokumen',     tier: 3, desc: 'Telaah rekonsiliasi bank Desember & uji item rekonsiliasi terbuka.', src: 'Internal — kontrol efektif', asr: ['A', 'CO'], res: 'tie' },
    { ref: 'A-3', proc: 'Penghitungan Ulang',   tier: 5, desc: 'Hitung ulang revaluasi saldo USD & SGD pada kurs tengah BI 31-12.', src: 'Dihitung auditor', asr: ['A'], res: 'tie' },
    { ref: 'A-4', proc: 'Inspeksi Dokumen',     tier: 3, desc: 'Uji cut-off 10 transaksi kas H±5 tanggal pelaporan.', src: 'Dokumen internal', asr: ['CO'], res: 'tie' },
  ]},
  'EV-B': { area: 'Piutang Usaha & ECL', wp: 'B', items: [
    { ref: 'B-1', proc: 'Konfirmasi Eksternal', tier: 5, desc: 'Konfirmasi positif 18 saldo signifikan (62% nilai).', src: 'Pelanggan — pihak ketiga', asr: ['E', 'RO'], res: 'exc' },
    { ref: 'B-2', proc: 'Inspeksi Dokumen',     tier: 3, desc: 'Telaah penerimaan kas subsequent atas saldo non-respons.', src: 'Dokumen internal', asr: ['E', 'A'], res: 'tie' },
    { ref: 'B-3', proc: 'Pelaksanaan Kembali',  tier: 4, desc: 'Re-perform aging & model ECL PSAK 71 (PD/LGD).', src: 'Dihitung auditor', asr: ['A'], res: 'exc' },
    { ref: 'B-4', proc: 'Inspeksi Dokumen',     tier: 3, desc: 'Uji akurasi & kelengkapan Aging Report (IPE-1).', src: 'ERP — kontrol efektif', asr: ['C', 'A'], res: 'tie' },
  ]},
  'EV-C': { area: 'Persediaan', wp: 'C', items: [
    { ref: 'C-1', proc: 'Observasi',           tier: 4, desc: 'Saksikan stock opname & test count dua arah 40 item.', src: 'Langsung auditor', asr: ['E', 'C'], res: 'exc' },
    { ref: 'C-2', proc: 'Penghitungan Ulang',  tier: 3, desc: 'Uji nilai realisasi neto (NRV) 22 SKU slow-moving.', src: 'Dihitung auditor', asr: ['A'], res: 'tie' },
    { ref: 'C-3', proc: 'Inspeksi Dokumen',    tier: 3, desc: 'Rekonsiliasi kuantitas perpetual vs hasil fisik.', src: 'Internal — kontrol sedang', asr: ['C', 'E'], res: 'exc' },
    { ref: 'C-4', proc: 'Permintaan Keterangan', tier: 1, desc: 'Tanya kebijakan penyisihan usang ke kepala gudang.', src: 'Representasi lisan', asr: ['A'], res: 'na' },
  ]},
  'EV-E': { area: 'Aset Tetap', wp: 'E', items: [
    { ref: 'E-1', proc: 'Inspeksi Aset Fisik', tier: 5, desc: 'Inspeksi fisik penambahan mesin & kendaraan material.', src: 'Langsung auditor', asr: ['E'], res: 'tie' },
    { ref: 'E-2', proc: 'Inspeksi Dokumen',    tier: 3, desc: 'Vouching penambahan ke faktur, BAST & bukti kepemilikan.', src: 'Dokumen internal', asr: ['E', 'RO'], res: 'tie' },
    { ref: 'E-3', proc: 'Penghitungan Ulang',  tier: 4, desc: 'Re-perform perhitungan penyusutan per kelompok aset.', src: 'Dihitung auditor', asr: ['A'], res: 'tie' },
  ]},
  'EV-R': { area: 'Pendapatan', wp: 'R', items: [
    { ref: 'R-1', proc: 'Inspeksi Dokumen',    tier: 3, desc: 'Cut-off dua arah — vouch dok. pengiriman ±2 minggu.', src: 'Dokumen internal', asr: ['E', 'CO'], res: 'tie' },
    { ref: 'R-2', proc: 'Prosedur Analitis',   tier: 3, desc: 'SAP tren margin kotor bulanan per lini produk.', src: 'Data entitas + eksternal', asr: ['E', 'C'], res: 'tie' },
    { ref: 'R-3', proc: 'Konfirmasi Eksternal', tier: 5, desc: 'Konfirmasi syarat penjualan signifikan (hak retur / bill-and-hold).', src: 'Pelanggan — pihak ketiga', asr: ['E', 'A'], res: 'tie' },
    { ref: 'R-4', proc: 'Pelaksanaan Kembali', tier: 4, desc: 'Re-perform perhitungan faktur & potongan harga.', src: 'Dihitung auditor', asr: ['A'], res: 'tie' },
  ]},
  'EV-F': { area: 'Sewa (PSAK 73)', wp: 'F', items: [
    { ref: 'F-1', proc: 'Penghitungan Ulang',  tier: 4, desc: 'Re-kalkulasi present value liabilitas & aset hak-guna.', src: 'Dihitung auditor', asr: ['A'], res: 'exc' },
    { ref: 'F-2', proc: 'Inspeksi Dokumen',    tier: 3, desc: 'Inspeksi kontrak asli — masa & opsi perpanjangan.', src: 'Dokumen internal', asr: ['RO', 'E'], res: 'exc' },
    { ref: 'F-3', proc: 'Permintaan Keterangan', tier: 1, desc: 'Tanya memo transisi & asumsi tingkat diskonto.', src: 'Representasi lisan', asr: ['A'], res: 'na' },
  ]},
  'EV-AA': { area: 'Utang Usaha', wp: 'AA', items: [
    { ref: 'AA-1', proc: 'Inspeksi Dokumen',    tier: 3, desc: 'Search for unrecorded liabilities — pembayaran besar Jan.', src: 'Dokumen internal', asr: ['C'], res: 'tie' },
    { ref: 'AA-2', proc: 'Konfirmasi Eksternal', tier: 5, desc: 'Konfirmasi saldo pemasok utama (vendor statement).', src: 'Pemasok — pihak ketiga', asr: ['E', 'RO'], res: 'tie' },
    { ref: 'AA-3', proc: 'Pelaksanaan Kembali', tier: 4, desc: 'Re-perform rekonsiliasi vendor statement vs buku besar.', src: 'Dihitung auditor', asr: ['A'], res: 'tie' },
  ]},
};
const EV2_RES = { tie: { k: 'green', t: 'Cocok', ic: 'checkCircle' }, exc: { k: 'red', t: 'Eksepsi', ic: 'alert' }, na: { k: 'gray', t: 'Korroborasi', ic: 'circle' } };

/* ============================================================
   TAB 1 — Seleksi Item Uji (¶10)
   ============================================================ */
function EvSelection() {
  const [filter, setFilter] = useStateE2('all-f');
  const [selId, setSelId] = useStateE2('EV-B');
  const counts = { all: 0, specific: 0, sampling: 0 };
  EV2_SEL.forEach(r => r.methods.forEach(m => counts[m]++));
  const rows = EV2_SEL.filter(r => filter === 'all-f' || r.methods.includes(filter));
  const sel = EV2_SEL.find(r => r.id === selId);
  const selCov = sel ? Math.round(sel.selVal / sel.popVal * 100) : 0;

  return (
    <div className="grid" style={{ gap: 12 }}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {Object.entries(EV2_MEANS).map(([k, m]) => (
          <Panel key={k} noBody>
            <div style={{ padding: '12px 14px', borderLeft: `3px solid var(--${m.color})` }}>
              <div className="row jb ac" style={{ marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 12.5 }}>{m.label}</span>
                <Badge kind={m.color}>{counts[k]} area</Badge>
              </div>
              <div className="tiny muted" style={{ lineHeight: 1.45, marginBottom: 6 }}>{m.desc}</div>
              <span className="mono tiny" style={{ color: `var(--${m.color})`, fontWeight: 700 }}>SA 500 {m.ref}</span>
            </div>
          </Panel>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 320px', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h">
            <h3>Strategi Seleksi Item per Area</h3><div style={{ flex: 1 }} />
            <Seg options={[{ value: 'all-f', label: 'Semua' }, { value: 'all', label: '100%' }, { value: 'specific', label: 'Spesifik' }, { value: 'sampling', label: 'Sampling' }]} value={filter} onChange={setFilter} />
          </div>
          <table className="dtbl">
            <thead><tr><th>Area / WP</th><th>Metode (¶10)</th><th className="num">Populasi</th><th className="num">Terpilih</th><th style={{ width: 150 }}>Cakupan Nilai</th></tr></thead>
            <tbody>
              {rows.map(r => {
                const cov = Math.round(r.selVal / r.popVal * 100);
                return (
                  <tr key={r.id} className={r.id === selId ? 'sel' : ''} onClick={() => setSelId(r.id)} style={{ cursor: 'pointer' }}>
                    <td><div style={{ fontWeight: 600 }}>{r.area}</div><div className="tiny muted mono">WP {r.wp}</div></td>
                    <td><div className="row gap6" style={{ flexWrap: 'wrap' }}>{r.methods.map(m => <Badge key={m} kind={EV2_MEANS[m].color}>{EV2_MEANS[m].short}</Badge>)}</div></td>
                    <td className="num"><span className="mono" style={{ fontWeight: 600 }}>{r.popUnit === 'penambahan' ? ev2Rp(r.popVal) : r.pop.toLocaleString('id-ID')}</span><div className="tiny muted">{r.popUnit !== 'penambahan' && ev2Rp(r.popVal)}{r.popUnit === 'penambahan' && 'penambahan TB'}</div></td>
                    <td className="num"><span className="mono" style={{ fontWeight: 600 }}>{r.sel}</span><div className="tiny muted">{ev2Rp(r.selVal)}</div></td>
                    <td>
                      <div className="row ac gap8">
                        <div style={{ flex: 1 }}><Progress value={cov} color={cov >= 80 ? 'var(--green)' : cov >= 50 ? 'var(--amber)' : 'var(--blue)'} /></div>
                        <span className="mono tiny" style={{ fontWeight: 700, width: 34, textAlign: 'right' }}>{cov}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--blue-050)', borderColor: 'var(--line)' }}>
            <div className="row gap8" style={{ alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.book size={15} /></span>
              <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Cakupan nilai pada <b>sampling</b> lebih rendah dari <b>100%/spesifik</b> karena hasil sampel <b>diproyeksikan</b> ke populasi (¶A56) — bukan indikasi bukti kurang. Item spesifik tidak dapat diproyeksikan & tidak menggantikan sampling atas sisa populasi (¶A55).</span>
            </div>
          </div>
        </Panel>

        {sel && (
          <div className="grid" style={{ gap: 12 }}>
            <Panel noBody>
              <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }} className="row ac gap8">
                <span className="mono" style={{ fontWeight: 700, color: 'var(--blue)' }}>WP {sel.wp}</span>
                <span style={{ fontWeight: 700 }}>{sel.area}</span>
              </div>
              <div style={{ padding: 14, display: 'grid', placeItems: 'center', gap: 10 }}>
                <Donut size={108} thickness={15} segments={[{ value: selCov, color: selCov >= 80 ? 'var(--green)' : selCov >= 50 ? 'var(--amber)' : 'var(--blue)' }, { value: 100 - selCov, color: 'var(--surface-3)' }]}
                  center={<div><div className="mono" style={{ fontWeight: 800, fontSize: 20 }}>{selCov}%</div><div className="tiny muted">nilai diuji</div></div>} />
                <div className="row gap6" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>{sel.methods.map(m => <Badge key={m} kind={EV2_MEANS[m].color} dot>{EV2_MEANS[m].label}</Badge>)}</div>
              </div>
              <div style={{ padding: '0 14px 14px', display: 'grid', gap: 8 }}>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <KvBox label="Populasi" v={sel.popUnit === 'penambahan' ? ev2Rp(sel.popVal) : sel.pop.toLocaleString('id-ID') + ' ' + sel.popUnit} />
                  <KvBox label="Nilai Populasi" v={ev2Rp(sel.popVal)} />
                  <KvBox label="Item Terpilih" v={sel.sel + (sel.popUnit === 'penambahan' ? ' aset' : ' ' + sel.popUnit)} accent="var(--blue)" />
                  <KvBox label="Nilai Diuji" v={ev2Rp(sel.selVal)} accent="var(--green)" />
                </div>
                <div>
                  <div className="tiny muted upper" style={{ margin: '2px 0 4px' }}>Dasar Pemilihan</div>
                  <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-2)' }}>{sel.basis}</p>
                </div>
              </div>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   TAB 2 — Relevansi & Arah Uji (¶A27–A30)
   ============================================================ */
function EvDirection() {
  const [dir, setDir] = useStateE2('over');
  const d = EV2_DIR[dir];
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 360px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Relevansi Bukti Bergantung pada Arah Pengujian</h3><div style={{ flex: 1 }} /><span className="tiny muted">SA 500 ¶A27–A30</span></div>
          <div style={{ padding: 14 }}>
            <p style={{ margin: '0 0 14px', fontSize: 12.5, lineHeight: 1.6, color: 'var(--ink-2)' }}>
              Relevansi suatu prosedur bergantung pada <b>asersi</b> yang diuji dan <b>arah</b> pengujian. Prosedur yang sama
              dapat relevan untuk satu asersi tetapi tidak untuk asersi lain. Pengujian <b>lebih saji</b> dimulai dari catatan
              menuju dokumen pendukung; pengujian <b>kurang saji</b> dimulai dari dokumen sumber menuju catatan.
            </p>
            <div className="row gap8" style={{ marginBottom: 14 }}>
              {Object.values(EV2_DIR).map(o => (
                <button key={o.key} onClick={() => setDir(o.key)} style={{ flex: 1, cursor: 'pointer', textAlign: 'left', padding: '11px 13px', borderRadius: 10,
                  border: '1.5px solid ' + (dir === o.key ? `var(--${o.color})` : 'var(--line)'), background: dir === o.key ? `var(--${o.color}-bg)` : 'transparent' }}>
                  <div className="row jb ac"><span style={{ fontWeight: 700, fontSize: 12.5, color: dir === o.key ? `var(--${o.color})` : 'var(--ink)' }}>{o.dir}</span><Badge kind={o.color}>{o.technique}</Badge></div>
                  <div className="tiny muted" style={{ marginTop: 3 }}>{o.asr}</div>
                </button>
              ))}
            </div>

            {/* flow diagram */}
            <div className="panel" style={{ padding: '16px 14px', background: 'var(--surface-2)', borderColor: 'transparent' }}>
              <div className="row ac" style={{ gap: 0, justifyContent: 'center', flexWrap: 'nowrap' }}>
                {(() => {
                  const left = { label: dir === 'over' ? 'Catatan' : 'Dokumen Sumber', sub: dir === 'over' ? 'Buku besar / saldo tercatat' : 'Faktur · pengiriman · pihak ketiga' };
                  const right = { label: dir === 'over' ? 'Dokumen Pendukung' : 'Catatan', sub: dir === 'over' ? 'Bukti validitas item' : 'Buku besar / saldo tercatat' };
                  const box = (b, accent) => (
                    <div style={{ flex: '1 1 0', minWidth: 0, padding: '12px 12px', borderRadius: 9, background: '#fff', border: `1.5px solid var(--${accent ? d.color : 'line'})`, textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: 12.5 }}>{b.label}</div>
                      <div className="tiny muted" style={{ marginTop: 2, lineHeight: 1.3 }}>{b.sub}</div>
                    </div>
                  );
                  return (<>
                    {box(left, true)}
                    <div style={{ flex: '0 0 90px', display: 'grid', placeItems: 'center', color: `var(--${d.color})` }}>
                      <div className="mono tiny" style={{ fontWeight: 700, marginBottom: 2 }}>{d.technique}</div>
                      <svg width="78" height="20" viewBox="0 0 78 20"><line x1="4" y1="10" x2="68" y2="10" stroke="currentColor" strokeWidth="2" /><path d="M68 4l8 6-8 6z" fill="currentColor" /></svg>
                    </div>
                    {box(right, false)}
                  </>);
                })()}
              </div>
              <div className="tiny muted" style={{ textAlign: 'center', marginTop: 10, lineHeight: 1.4 }}>{d.flow}</div>
            </div>

            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
              <div className="panel" style={{ padding: '11px 12px', borderColor: 'var(--line)' }}>
                <div className="tiny muted upper" style={{ marginBottom: 4 }}>Logika Pengujian</div>
                <div style={{ fontSize: 12, lineHeight: 1.5 }}>{d.desc}</div>
              </div>
              <div className="panel" style={{ padding: '11px 12px', background: `var(--${d.color}-bg)`, borderColor: 'transparent' }}>
                <div className="tiny muted upper" style={{ marginBottom: 4 }}>Contoh</div>
                <div style={{ fontSize: 12, lineHeight: 1.5 }}>{d.example}</div>
              </div>
            </div>
          </div>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Pemetaan Arah Uji per Area</h3><div style={{ flex: 1 }} /><span className="tiny muted">fokus risiko → arah → teknik</span></div>
          <table className="dtbl">
            <thead><tr><th>Area</th><th style={{ width: 150 }}>Fokus Risiko</th><th style={{ width: 80 }}>Asersi</th><th>Teknik Utama</th></tr></thead>
            <tbody>
              {EV2_DIRMAP.map(r => {
                const fo = r.focus === 'both'
                  ? { t: 'Dua arah', k: 'purple' }
                  : r.focus === 'over' ? { t: 'Lebih saji', k: 'red' } : { t: 'Kurang saji', k: 'amber' };
                return (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.area}</td>
                    <td><Badge kind={fo.k} dot>{fo.t}</Badge></td>
                    <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.asr}</td>
                    <td className="tiny">{r.tech}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Relevansi ≠ Keandalan" sub="¶A27 vs ¶A31">
          <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.6, color: 'var(--ink-2)' }}>
            <b>Relevansi</b> = kaitan logis bukti dengan asersi & arah uji yang dituju. <b>Keandalan</b> = kualitas/sumber bukti.
            Bukti bisa sangat andal namun tidak relevan untuk asersi tertentu — mis. konfirmasi piutang andal untuk
            <b> keberadaan</b>, tetapi tidak menjawab <b>kelengkapan</b>.
          </p>
        </Panel>
        <Panel title="Catatan Asersi Ganda">
          <div style={{ display: 'grid', gap: 8 }}>
            {[
              ['Vouching (catatan → dokumen)', 'Keberadaan / Keterjadian', 'red'],
              ['Tracing (dokumen → catatan)', 'Kelengkapan', 'amber'],
              ['Test count dua arah', 'Keberadaan + Kelengkapan', 'purple'],
            ].map((r, i) => (
              <div key={i} className="row jb ac" style={{ fontSize: 11.5, padding: '7px 9px', border: '1px solid var(--line-soft)', borderRadius: 6 }}>
                <span style={{ fontWeight: 600 }}>{r[0]}</span><Badge kind={r[2]}>{r[1]}</Badge>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ============================================================
   TAB 3 — Berkas Bukti (dossier per area)
   ============================================================ */
function EvDossier() {
  const ids = Object.keys(EV2_DOSS);
  const [selId, setSelId] = useStateE2('EV-B');
  const dos = EV2_DOSS[selId];
  const tie = dos.items.filter(i => i.res === 'tie').length;
  const exc = dos.items.filter(i => i.res === 'exc').length;
  const na = dos.items.filter(i => i.res === 'na').length;

  return (
    <div className="grid" style={{ gridTemplateColumns: '230px 1fr', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Area</h3></div>
        <div style={{ padding: 6 }}>
          {ids.map(id => {
            const d = EV2_DOSS[id];
            const e = d.items.filter(i => i.res === 'exc').length;
            return (
              <button key={id} onClick={() => setSelId(id)} className="row jb ac" style={{ width: '100%', cursor: 'pointer', textAlign: 'left', padding: '9px 10px', borderRadius: 7, marginBottom: 2,
                border: '1px solid ' + (id === selId ? 'var(--blue)' : 'transparent'), background: id === selId ? 'var(--blue-050)' : 'transparent' }}>
                <span><div style={{ fontSize: 12, fontWeight: 600 }}>{d.area}</div><div className="tiny muted mono">WP {d.wp} · {d.items.length} bukti</div></span>
                {e > 0 ? <Badge kind="red">{e}</Badge> : <span style={{ color: 'var(--green)' }}><I.checkCircle size={15} /></span>}
              </button>
            );
          })}
        </div>
      </Panel>

      <div className="grid" style={{ gap: 12 }}>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={dos.items.length} label="Bukti Terkumpul" accent="var(--blue)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={tie} label="Cocok (Tie-out)" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={exc} label="Eksepsi" accent={exc ? 'var(--red)' : 'var(--green)'} /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={na} label="Korroborasi" accent="var(--ink-3)" /></div></Panel>
        </div>

        <Panel noBody>
          <div className="panel-h"><h3>Berkas Bukti — {dos.area}</h3><div style={{ flex: 1 }} /><span className="tiny muted">WP {dos.wp} · sumber · keandalan · asersi · tie-out</span></div>
          <table className="dtbl">
            <thead><tr><th style={{ width: 46 }}>Ref</th><th>Bukti & Prosedur</th><th style={{ width: 140 }}>Sumber</th><th style={{ width: 90 }}>Keandalan</th><th style={{ width: 96 }}>Asersi</th><th style={{ width: 110 }}>Tie-out</th></tr></thead>
            <tbody>
              {dos.items.map(it => {
                const r = EV2_RES[it.res];
                const Ric = I[r.ic];
                return (
                  <tr key={it.ref}>
                    <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{it.ref}</td>
                    <td><div style={{ fontWeight: 600 }}>{it.proc}</div><div className="tiny muted" style={{ whiteSpace: 'normal', maxWidth: 340, lineHeight: 1.4 }}>{it.desc}</div></td>
                    <td className="tiny muted">{it.src}</td>
                    <td><div className="row ac gap6"><Ev2Meter v={it.tier} /></div></td>
                    <td><div className="row gap6" style={{ flexWrap: 'wrap' }}>{it.asr.map(a => <span key={a} className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)', border: '1px solid var(--blue-100)', borderRadius: 4, padding: '1px 5px', background: 'var(--blue-050)' }}>{a}</span>)}</div></td>
                    <td><span className="row ac gap6"><span style={{ color: `var(--${r.k})` }}><Ric size={14} /></span><Badge kind={r.k}>{r.t}</Badge></span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {exc > 0 && (
            <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--red-bg)', borderColor: 'transparent' }}>
              <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--red)', flex: '0 0 auto' }}><I.alert size={15} /></span>
                <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>{exc} bukti menghasilkan <b>eksepsi</b> — selisih ditelusuri & dievaluasi terhadap salah saji. Bila bukti tidak konsisten / meragukan keandalannya, auditor menentukan modifikasi atau penambahan prosedur (¶11) sebelum menyimpulkan.</span>
              </div>
            </div>
          )}
          {na > 0 && exc === 0 && (
            <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
              <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--amber)', flex: '0 0 auto' }}><I.flag size={15} /></span>
                <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Permintaan keterangan (keandalan rendah) tidak cukup sendiri (¶A2) — dikuatkan oleh bukti korroboratif lain dalam berkas ini.</span>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

Object.assign(window, { EvSelection, EvDirection, EvDossier });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { EvDirection, EvDossier, EvSelection };
