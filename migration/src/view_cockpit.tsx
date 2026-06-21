/* [codemod] ESM imports */
import React from 'react';
import { useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Avatar, Badge, Btn, Donut, Panel, Progress, Seg, Stat, Tabs } from './ui.jsx';

/* ============================================================
   NeoSuite AMS — Engagement Cockpit + Audit Programme (Package B)
   ============================================================ */
const { useState: useStateWS, useMemo: useMemoWS } = React;

/* NOTE: EngagementCockpit lives in view_cockpit2.jsx (deep build). */

/* ---------------- Audit Programme ---------------- */
/* RoMM -> planned procedures (nature/timing/extent/SA ref/sign-off/hours) -> WP -> status */
const PRG_STATUS = {
  notstarted: { k: 'gray',  l: 'Belum' },
  progress:   { k: 'amber', l: 'Berjalan' },
  review:     { k: 'blue',  l: 'Direviu' },
  done:       { k: 'green', l: 'Selesai' },
};
const PRG_ORDER = ['notstarted', 'progress', 'review', 'done'];

/* nature of procedure */
const PRG_NATURE = {
  ToC:     { l: 'Uji Pengendalian',  c: '#5b3fa6' },
  ToD:     { l: 'Uji Rinci',         c: '#005085' },
  SAP:     { l: 'Analitis Subst.',   c: '#0a6b73' },
  Confirm: { l: 'Konfirmasi',        c: '#1d6fb8' },
  Obs:     { l: 'Observasi',         c: '#9a6a00' },
  Recalc:  { l: 'Rekalkulasi',       c: '#0a6b73' },
  Inq:     { l: 'Inkuiri',           c: '#7a7f87' },
};
/* assertion columns (audit assertions) */
const PRG_ASSERT = [
  { c: 'EO', l: 'E/O', full: 'Keberadaan / Keterjadian' },
  { c: 'C',  l: 'C',   full: 'Kelengkapan' },
  { c: 'V',  l: 'V',   full: 'Penilaian & Alokasi' },
  { c: 'RO', l: 'R&O', full: 'Hak & Kewajiban' },
  { c: 'CO', l: 'CO',  full: 'Pisah Batas' },
  { c: 'P',  l: 'P',   full: 'Penyajian & Pengungkapan' },
];

const PROGRAMME = [
  { riskId: 'R-01', area: 'Pendapatan', sig: true, fraud: true, procs: [
    { id: 'P-01', t: 'Pengujian pisah batas (cut-off) penjualan 10 hari sebelum/sesudah tutup buku', nat: 'ToD', asr: ['EO', 'CO'], timing: 'Akhir tahun', extent: '25 dokumen', sa: 'SA 330', wp: 'B-3', prep: 'Dimas Raharjo', rev: 'Anindya Pramesti', bud: 8, act: 7.5, exc: 1, status: 'done', concl: 'Tiga dokumen tercatat di periode salah; usulan AJE No.4 (Rp 1,9M) telah dibukukan. Cut-off memadai setelah penyesuaian.' },
    { id: 'P-02', t: 'Konfirmasi piutang positif untuk 18 saldo signifikan & rekonsiliasi selisih', nat: 'Confirm', asr: ['EO', 'RO'], timing: 'Akhir tahun', extent: '18 saldo (62% nilai)', sa: 'SA 505', wp: 'B-5', prep: 'Fajar Nugroho', rev: 'Dimas Raharjo', bud: 12, act: 9, exc: 0, status: 'progress', concl: '14 dari 18 konfirmasi kembali tanpa selisih. 4 saldo menunggu balasan — prosedur alternatif (vouching penerimaan kas) sedang berjalan.' },
    { id: 'P-03', t: 'Prosedur analitis substantif: tren margin kotor per lini produk vs ekspektasi', nat: 'SAP', asr: ['EO', 'C'], timing: 'Interim', extent: 'Disagregasi 6 lini', sa: 'SA 520', wp: 'B-2', prep: 'Anindya Pramesti', rev: 'Hartono Wijaya', bud: 4, act: 4, exc: 0, status: 'done', concl: 'Variasi margin per lini berada dalam threshold ekspektasi (±3%). Tidak ada indikasi salah saji material.' },
    { id: 'P-04', t: 'Vouching dokumen pengiriman atas penjualan signifikan akhir tahun', nat: 'ToD', asr: ['EO'], timing: 'Akhir tahun', extent: '30 transaksi', sa: 'SA 500', wp: 'B-3', prep: 'Fajar Nugroho', rev: 'Dimas Raharjo', bud: 6, act: 3, exc: 1, status: 'progress', concl: '' },
  ]},
  { riskId: 'R-02', area: 'Persediaan', sig: true, fraud: false, procs: [
    { id: 'P-05', t: 'Observasi perhitungan fisik (stock opname) & test count dua arah', nat: 'Obs', asr: ['EO', 'C'], timing: 'Akhir tahun', extent: '40 item', sa: 'SA 501', wp: 'C-1', prep: 'Dimas Raharjo', rev: 'Anindya Pramesti', bud: 10, act: 10, exc: 0, status: 'done', concl: 'Hadir saat opname 31 Des. Selisih test count nihil. Prosedur pisah batas penerimaan/pengeluaran gudang memadai.' },
    { id: 'P-06', t: 'Uji nilai realisasi neto (NRV) atas item slow-moving & usang', nat: 'ToD', asr: ['V'], timing: 'Akhir tahun', extent: '22 SKU', sa: 'SA 540', wp: 'C-2', prep: 'Sinta Wulandari', rev: 'Dimas Raharjo', bud: 8, act: 6, exc: 2, status: 'progress', concl: '' },
    { id: 'P-07', t: 'Rekonsiliasi kuantitas perpetual vs hasil fisik & telaah penyesuaian', nat: 'ToD', asr: ['C', 'EO'], timing: 'Akhir tahun', extent: 'Populasi penuh', sa: 'SA 500', wp: 'C-3', prep: 'Fajar Nugroho', rev: 'Sinta Wulandari', bud: 5, act: 0, exc: 0, status: 'notstarted', concl: '' },
  ]},
  { riskId: 'R-03', area: 'Piutang Usaha — ECL', sig: true, fraud: false, procs: [
    { id: 'P-08', t: 'Re-perform model ECL (PSAK 71) & uji loss rate per bucket aging', nat: 'Recalc', asr: ['V'], timing: 'Akhir tahun', extent: 'Model penuh', sa: 'SA 540', wp: 'B-7', prep: 'Anindya Pramesti', rev: 'Hartono Wijaya', bud: 14, act: 13, exc: 0, status: 'review', concl: 'Re-kalkulasi independen selisih 0,4% dari angka manajemen — dalam toleransi. Menunggu review akhir partner.' },
    { id: 'P-09', t: 'Uji aging piutang ke dokumen sumber & validitas bucket', nat: 'ToD', asr: ['V'], timing: 'Akhir tahun', extent: '35 saldo', sa: 'SA 500', wp: 'B-6', prep: 'Fajar Nugroho', rev: 'Anindya Pramesti', bud: 6, act: 6, exc: 0, status: 'done', concl: 'Seluruh sampel aging tervalidasi ke faktur & tanggal jatuh tempo. Tidak ada misclassification.' },
  ]},
  { riskId: 'R-04', area: 'Aset Tetap', sig: false, fraud: false, procs: [
    { id: 'P-10', t: 'Vouching penambahan aset & inspeksi fisik atas sampel', nat: 'ToD', asr: ['EO', 'RO'], timing: 'Akhir tahun', extent: '20 penambahan', sa: 'SA 500', wp: 'E-4', prep: 'Rina Kusuma', rev: 'Dimas Raharjo', bud: 6, act: 5, exc: 0, status: 'progress', concl: '' },
    { id: 'P-11', t: 'Uji penghentian/pelepasan aset & ketepatan penghapusbukuan', nat: 'ToD', asr: ['C', 'EO'], timing: 'Akhir tahun', extent: '12 pelepasan', sa: 'SA 500', wp: 'E-5', prep: 'Rina Kusuma', rev: 'Dimas Raharjo', bud: 4, act: 0, exc: 0, status: 'notstarted', concl: '' },
  ]},
  { riskId: 'R-05', area: 'Management Override', sig: true, fraud: true, procs: [
    { id: 'P-12', t: 'Journal Entry Testing (SA 240) atas jurnal manual berkriteria risiko', nat: 'ToD', asr: ['EO', 'V', 'P'], timing: 'Akhir tahun', extent: 'Filter risiko populasi penuh', sa: 'SA 240', wp: 'JE-1', prep: 'Anindya Pramesti', rev: 'Hartono Wijaya', bud: 12, act: 8, exc: 3, status: 'progress', concl: '' },
    { id: 'P-13', t: 'Telaah retrospektif estimasi akuntansi atas indikasi bias manajemen', nat: 'ToD', asr: ['V'], timing: 'Akhir tahun', extent: 'Seluruh estimasi signifikan', sa: 'SA 540', wp: 'JE-2', prep: 'Anindya Pramesti', rev: 'Hartono Wijaya', bud: 8, act: 0, exc: 0, status: 'notstarted', concl: '' },
    { id: 'P-14', t: 'Evaluasi transaksi signifikan di luar kegiatan bisnis normal', nat: 'Inq', asr: ['EO', 'P'], timing: 'Akhir tahun', extent: 'Ad hoc per identifikasi', sa: 'SA 240', wp: 'JE-3', prep: 'Anindya Pramesti', rev: 'Hartono Wijaya', bud: 5, act: 0, exc: 0, status: 'notstarted', concl: '' },
  ]},
  { riskId: 'R-06', area: 'Sewa (PSAK 73)', sig: false, fraud: false, procs: [
    { id: 'P-15', t: 'Telaah kontrak sewa baru & re-kalkulasi liabilitas / aset hak-guna', nat: 'Recalc', asr: ['C', 'V'], timing: 'Interim', extent: '8 kontrak', sa: 'SA 540', wp: 'F-1', prep: 'Sinta Wulandari', rev: 'Dimas Raharjo', bud: 7, act: 7, exc: 0, status: 'done', concl: 'Seluruh kontrak baru teridentifikasi & dikapitalisasi. Re-kalkulasi sesuai dalam batas trivial.' },
  ]},
  { riskId: 'R-07', area: 'Imbalan Kerja', sig: false, fraud: false, procs: [
    { id: 'P-16', t: 'Evaluasi laporan aktuaria & kewajaran asumsi (SA 500/620)', nat: 'ToD', asr: ['V'], timing: 'Akhir tahun', extent: 'Laporan penuh', sa: 'SA 500', wp: 'H-2', prep: 'Sinta Wulandari', rev: 'Anindya Pramesti', bud: 6, act: 3, exc: 0, status: 'progress', concl: '' },
  ]},
  { riskId: 'R-08', area: 'Pihak Berelasi', sig: false, fraud: false, procs: [
    { id: 'P-17', t: 'Pengujian kelengkapan daftar & konfirmasi transaksi pihak berelasi', nat: 'Confirm', asr: ['C', 'P'], timing: 'Akhir tahun', extent: 'Daftar lengkap', sa: 'SA 550', wp: 'RP-1', prep: 'Dimas Raharjo', rev: 'Anindya Pramesti', bud: 5, act: 2, exc: 1, status: 'progress', concl: '' },
  ]},
];

function NatTag({ nat }) {
  const n = PRG_NATURE[nat] || { l: nat, c: '#7a7f87' };
  return <span className="row ac gap6" style={{ fontSize: 11 }}><span style={{ width: 7, height: 7, borderRadius: 2, background: n.c, flex: '0 0 7px' }} />{n.l}</span>;
}
function AsrChips({ asr }) {
  return (
    <span className="row ac gap4">
      {asr.map(a => {
        const m = PRG_ASSERT.find(x => x.c === a);
        return <span key={a} title={m ? m.full : a} className="chip tiny" style={{ height: 17, padding: '0 5px', fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 700 }}>{m ? m.l : a}</span>;
      })}
    </span>
  );
}

function AuditProgramme() {
  const nav = useNav();
  const [prog, setProg] = useStateWS(PROGRAMME);
  const [tab, setTab] = useStateWS('program');
  const [statusFilter, setStatusFilter] = useStateWS('all');
  const [selId, setSelId] = useStateWS('P-01');
  const [q, setQ] = useStateWS('');

  const cycle = (pid) => setProg(list => list.map(r => ({ ...r, procs: r.procs.map(p => p.id !== pid ? p : { ...p, status: PRG_ORDER[(PRG_ORDER.indexOf(p.status) + 1) % PRG_ORDER.length] }) })));
  const setStatus = (pid, s) => setProg(list => list.map(r => ({ ...r, procs: r.procs.map(p => p.id !== pid ? p : { ...p, status: s }) })));

  const allProcs = prog.flatMap(r => r.procs);
  const sel = allProcs.find(p => p.id === selId);
  const selRisk = prog.find(r => r.procs.some(p => p.id === selId));
  const done = allProcs.filter(p => p.status === 'done').length;
  const pct = Math.round(done / allProcs.length * 100);
  const budTot = allProcs.reduce((s, p) => s + p.bud, 0);
  const actTot = allProcs.reduce((s, p) => s + p.act, 0);
  const excTot = allProcs.reduce((s, p) => s + p.exc, 0);
  const sigRisks = prog.filter(r => r.sig);
  const sigCovered = sigRisks.filter(r => r.procs.some(p => p.status === 'done')).length;

  const matchProc = (p) => (statusFilter === 'all' || p.status === statusFilter) && (!q || (p.t + p.id + p.wp + p.prep).toLowerCase().includes(q.toLowerCase()));
  const filtered = prog.map(r => ({ ...r, procs: r.procs.filter(matchProc) })).filter(r => r.procs.length);
  const visibleCount = filtered.flatMap(r => r.procs).length;

  return (
    <>
      <SubBar moduleId="programme" right={
        <div className="row gap8 ac">
          <Badge kind={pct === 100 ? 'green' : 'amber'}>{done}/{allProcs.length} prosedur</Badge>
          <Btn sm onClick={() => nav('risk')}><I.shield size={13} /> Risk Register</Btn>
          <Btn sm><I.sparkle size={13} /> Saran Prosedur AI</Btn>
          <Btn sm variant="primary"><I.download size={14} /> Export Programme</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">
        {/* KPIs */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(6,1fr)', gap: 10, marginBottom: 12 }}>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={prog.length} label="RoMM Tertangani" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={allProcs.length} label="Total Prosedur" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={pct + '%'} label="Penyelesaian" accent={pct >= 80 ? 'var(--green)' : 'var(--amber)'} /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={`${sigCovered}/${sigRisks.length}`} label="Risk Signifikan Tuntas" accent={sigCovered === sigRisks.length ? 'var(--green)' : 'var(--red)'} /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={`${actTot}/${budTot}j`} label="Jam (Aktual/Budget)" accent={actTot > budTot ? 'var(--red)' : null} /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={excTot} label="Pengecualian" accent={excTot > 0 ? 'var(--red)' : 'var(--green)'} /></div></Panel>
        </div>

        <div className="panel" style={{ padding: '10px 14px', marginBottom: 12, background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
          <div className="row ac gap8 tiny"><I.link2 size={14} style={{ color: 'var(--blue)' }} /><span style={{ fontWeight: 600 }}>Program audit merantai RoMM → sifat/saat/luas prosedur → asersi → kertas kerja → sign-off. Klik baris untuk detail; klik status untuk memperbarui; klik WP untuk membuka.</span></div>
        </div>

        <Tabs tabs={[{ id: 'program', label: 'Program', count: allProcs.length }, { id: 'coverage', label: 'Cakupan Asersi' }, { id: 'effort', label: 'Beban & Tim' }]} active={tab} onChange={setTab} />

        {tab === 'program' && (
          <div style={{ marginTop: 12 }} className="grid" >
            {/* filter bar */}
            <div className="row ac gap8 wrap" style={{ marginBottom: 12 }}>
              <Seg options={[{ value: 'all', label: 'Semua' }, { value: 'notstarted', label: 'Belum' }, { value: 'progress', label: 'Berjalan' }, { value: 'review', label: 'Direviu' }, { value: 'done', label: 'Selesai' }]} value={statusFilter} onChange={setStatusFilter} />
              <div className="row ac gap6" style={{ flex: '1 1 200px', maxWidth: 320, background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 7, padding: '0 10px', height: 30 }}>
                <I.search2 size={14} style={{ color: 'var(--ink-3)' }} />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari prosedur, WP, preparer…" style={{ border: 0, outline: 'none', background: 'transparent', fontSize: 12, width: '100%', color: 'var(--ink-1)' }} />
              </div>
              <div style={{ flex: 1 }} />
              <span className="tiny muted">{visibleCount} dari {allProcs.length} prosedur</span>
            </div>

            <Panel noBody>
              <table className="dtbl prg-tbl">
                <thead><tr>
                  <th style={{ width: 48 }}>ID</th>
                  <th>Prosedur Audit</th>
                  <th style={{ width: 120 }}>Sifat</th>
                  <th style={{ width: 96 }}>Asersi</th>
                  <th style={{ width: 78 }}>Saat</th>
                  <th style={{ width: 48 }}>WP</th>
                  <th style={{ width: 116 }}>Penanggung Jawab</th>
                  <th className="num" style={{ width: 64 }}>Jam</th>
                  <th style={{ width: 104 }}>Status</th>
                </tr></thead>
                <tbody>
                  {filtered.map(r => (
                    <React.Fragment key={r.riskId}>
                      <tr className="group-row">
                        <td className="mono tiny" style={{ fontWeight: 700, cursor: 'pointer' }} onClick={() => nav('risk')}>{r.riskId}</td>
                        <td colSpan={8}>
                          <span className="row ac gap6" style={{ cursor: 'pointer' }} onClick={() => nav('risk')}>
                            <span style={{ fontWeight: 700 }}>{r.area}</span>
                            {r.sig && <span className="badge b-red" style={{ fontSize: 8.5, padding: '0 5px' }}>SIGNIFICANT</span>}
                            {r.fraud && <span className="badge b-amber" style={{ fontSize: 8.5, padding: '0 5px' }}>FRAUD · SA 240</span>}
                            <span className="tiny muted" style={{ textTransform: 'none', letterSpacing: 0 }}>· {r.procs.length} prosedur</span>
                          </span>
                        </td>
                      </tr>
                      {r.procs.map(p => {
                        const over = p.act > p.bud;
                        return (
                          <tr key={p.id} className={p.id === selId ? 'sel' : ''} style={{ cursor: 'pointer' }} onClick={() => setSelId(p.id)}>
                            <td className="mono tiny" style={{ color: 'var(--ink-3)' }}>{p.id}</td>
                            <td style={{ fontSize: 11.5 }}>
                              <span className="row ac gap6">
                                <span style={{ lineHeight: 1.35 }}>{p.t}</span>
                                {p.exc > 0 && <span className="badge b-red" style={{ fontSize: 8.5, padding: '0 5px', flex: '0 0 auto' }}>{p.exc} EXC</span>}
                              </span>
                            </td>
                            <td><NatTag nat={p.nat} /></td>
                            <td><AsrChips asr={p.asr} /></td>
                            <td className="tiny muted">{p.timing}</td>
                            <td><span className="chip tiny" style={{ height: 18, fontFamily: 'var(--mono)', cursor: 'pointer' }} onClick={e => { e.stopPropagation(); nav('workpapers'); }}>{p.wp}</span></td>
                            <td><span className="row ac gap6"><Avatar name={p.prep} size={20} /><span className="tiny truncate" style={{ maxWidth: 78 }}>{p.prep.split(' ')[0]}</span></span></td>
                            <td className="num mono tiny" style={{ color: over ? 'var(--red)' : 'var(--ink-2)', fontWeight: 600 }}>{p.act}/{p.bud}</td>
                            <td><span onClick={e => { e.stopPropagation(); cycle(p.id); }} style={{ cursor: 'pointer' }} title="Klik untuk ubah status"><Badge kind={PRG_STATUS[p.status].k}>{PRG_STATUS[p.status].l}</Badge></span></td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                  {!filtered.length && <tr><td colSpan={9} className="muted" style={{ textAlign: 'center', padding: 26 }}>Tidak ada prosedur sesuai filter.</td></tr>}
                </tbody>
              </table>
            </Panel>

            {/* detail */}
            {sel && (
              <Panel noBody className="prg-detail">
                <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }} className="row ac gap8 wrap">
                  <span className="mono" style={{ fontWeight: 700, color: 'var(--blue)' }}>{sel.id}</span>
                  <span style={{ fontWeight: 700, fontSize: 12.5 }}>{selRisk.area}</span>
                  <NatTag nat={sel.nat} />
                  <span className="chip tiny" style={{ height: 18, fontFamily: 'var(--mono)' }}>{sel.sa}</span>
                  <div style={{ flex: 1 }} />
                  {sel.exc > 0 && <Badge kind="red">{sel.exc} pengecualian</Badge>}
                  <Badge kind={PRG_STATUS[sel.status].k}>{PRG_STATUS[sel.status].l}</Badge>
                </div>
                <div style={{ padding: 14 }}>
                  <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: 18, alignItems: 'start' }}>
                    <div>
                      <div className="tiny muted upper" style={{ marginBottom: 4 }}>Prosedur</div>
                      <p style={{ margin: '0 0 12px', fontSize: 12.5, lineHeight: 1.55, fontWeight: 600 }}>{sel.t}</p>

                      <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
                        {[['Sifat', PRG_NATURE[sel.nat].l], ['Saat', sel.timing], ['Luas / Sampel', sel.extent], ['Asersi', null], ['Standar', sel.sa], ['Kertas Kerja', sel.wp]].map(([lbl, v], i) => (
                          <div key={i}>
                            <div className="tiny muted upper" style={{ marginBottom: 3 }}>{lbl}</div>
                            {lbl === 'Asersi' ? <AsrChips asr={sel.asr} />
                              : lbl === 'Kertas Kerja' ? <span className="chip tiny" style={{ height: 18, fontFamily: 'var(--mono)', cursor: 'pointer' }} onClick={() => nav('workpapers')}>{v}</span>
                              : <div style={{ fontSize: 12, fontWeight: 600 }}>{v}</div>}
                          </div>
                        ))}
                      </div>

                      <div className="tiny muted upper" style={{ marginBottom: 4 }}>Kesimpulan / Temuan</div>
                      {sel.concl
                        ? <div className="panel" style={{ padding: '9px 11px', background: sel.exc > 0 ? 'var(--amber-bg)' : 'var(--blue-050)', borderColor: 'transparent' }}>
                            <div className="row ac gap8" style={{ alignItems: 'flex-start' }}><span style={{ color: sel.exc > 0 ? 'var(--amber)' : 'var(--blue)', marginTop: 1 }}>{sel.exc > 0 ? <I.alert size={15} /> : <I.checkCircle size={15} />}</span><span style={{ fontSize: 12.5, lineHeight: 1.5 }}>{sel.concl}</span></div>
                          </div>
                        : <div className="panel" style={{ padding: '9px 11px', background: 'var(--surface-2)', borderColor: 'var(--line)' }}><span className="tiny muted">Belum ada kesimpulan — prosedur belum diselesaikan.</span></div>}

                      <div className="row gap8" style={{ marginTop: 12 }}>
                        <Btn sm variant="primary" onClick={() => nav('workpapers')}><I.flask size={14} /> Buka Kertas Kerja {sel.wp}</Btn>
                        <Btn sm onClick={() => nav('risk')}><I.shield size={14} /> Lihat {selRisk.riskId}</Btn>
                        <Btn sm><I.sparkle size={14} /> Saran AI</Btn>
                      </div>
                    </div>

                    <div>
                      {/* hours */}
                      <div className="tiny muted upper" style={{ marginBottom: 6 }}>Beban Jam</div>
                      <div className="row jb ac" style={{ marginBottom: 4 }}>
                        <span className="tiny muted">Aktual {sel.act}j · Budget {sel.bud}j</span>
                        <span className="mono tiny" style={{ fontWeight: 700, color: sel.act > sel.bud ? 'var(--red)' : 'var(--green)' }}>{Math.round(sel.act / sel.bud * 100)}%</span>
                      </div>
                      <Progress value={sel.act / sel.bud * 100} color={sel.act > sel.bud ? 'var(--red)' : 'var(--blue)'} />

                      <div className="divider" />
                      {/* sign-off */}
                      <div className="tiny muted upper" style={{ marginBottom: 8 }}>Sign-off</div>
                      <div className="row jb ac" style={{ marginBottom: 10 }}>
                        <div>
                          <div className="tiny muted">Disusun oleh</div>
                          <span className="row ac gap6" style={{ marginTop: 3 }}><Avatar name={sel.prep} size={22} /><span style={{ fontSize: 12, fontWeight: 600 }}>{sel.prep}</span></span>
                        </div>
                        {(sel.status === 'done' || sel.status === 'review' || sel.act > 0) ? <span style={{ color: 'var(--green)' }}><I.checkCircle size={17} /></span> : <span className="tiny muted">—</span>}
                      </div>
                      <div className="row jb ac">
                        <div>
                          <div className="tiny muted">Direviu oleh</div>
                          <span className="row ac gap6" style={{ marginTop: 3 }}><Avatar name={sel.rev} size={22} /><span style={{ fontSize: 12, fontWeight: 600 }}>{sel.rev}</span></span>
                        </div>
                        {sel.status === 'done' ? <span style={{ color: 'var(--green)' }}><I.checkCircle size={17} /></span> : <span className="tiny muted">menunggu</span>}
                      </div>

                      <div className="divider" />
                      <div className="tiny muted upper" style={{ marginBottom: 6 }}>Ubah Status</div>
                      <div className="row gap6 wrap">
                        {PRG_ORDER.map(s => (
                          <button key={s} onClick={() => setStatus(sel.id, s)} className={'seg-pill' + (sel.status === s ? ' on' : '')}>{PRG_STATUS[s].l}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Panel>
            )}
          </div>
        )}

        {tab === 'coverage' && (
          <div style={{ marginTop: 12 }} className="grid" >
            <div className="panel" style={{ padding: '10px 14px', marginBottom: 12 }}>
              <div className="row ac gap8 tiny"><I.target size={14} style={{ color: 'var(--blue)' }} /><span style={{ fontWeight: 600 }}>Matriks cakupan memetakan setiap area RoMM terhadap asersi yang diuji. Angka = jumlah prosedur; warna = intensitas pengujian. Sel kosong pada risiko signifikan menandai potensi gap.</span></div>
            </div>
            <Panel noBody>
              <table className="dtbl">
                <thead><tr>
                  <th style={{ width: 56 }}>Risk</th><th>Area</th>
                  {PRG_ASSERT.map(a => <th key={a.c} className="num" style={{ width: 64 }} title={a.full}>{a.l}</th>)}
                  <th className="num" style={{ width: 56 }}>Total</th>
                </tr></thead>
                <tbody>
                  {prog.map(r => {
                    const counts = PRG_ASSERT.map(a => r.procs.filter(p => p.asr.includes(a.c)).length);
                    return (
                      <tr key={r.riskId}>
                        <td className="mono tiny" style={{ fontWeight: 700, cursor: 'pointer' }} onClick={() => nav('risk')}>{r.riskId}</td>
                        <td><span className="row ac gap6"><span style={{ fontWeight: 600, fontSize: 12 }}>{r.area}</span>{r.sig && <span className="badge b-red" style={{ fontSize: 8, padding: '0 4px' }}>SIG</span>}</span></td>
                        {counts.map((n, i) => (
                          <td key={i} className="num" style={{ padding: 4 }}>
                            <div style={{ height: 26, borderRadius: 5, display: 'grid', placeItems: 'center', background: n === 0 ? 'transparent' : `rgba(0,80,133,${0.12 + Math.min(n, 3) * 0.22})`, color: n === 0 ? 'var(--ink-4)' : (n >= 2 ? '#fff' : 'var(--navy)'), fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 11.5, border: n === 0 ? '1px dashed var(--line)' : 'none' }}>{n || '·'}</div>
                          </td>
                        ))}
                        <td className="num mono" style={{ fontWeight: 700 }}>{r.procs.length}</td>
                      </tr>
                    );
                  })}
                  <tr className="group-row">
                    <td colSpan={2} style={{ fontWeight: 700 }}>Total prosedur per asersi</td>
                    {PRG_ASSERT.map(a => {
                      const n = allProcs.filter(p => p.asr.includes(a.c)).length;
                      return <td key={a.c} className="num mono" style={{ fontWeight: 700 }}>{n}</td>;
                    })}
                    <td className="num mono" style={{ fontWeight: 700 }}>{allProcs.reduce((s, p) => s + p.asr.length, 0)}</td>
                  </tr>
                </tbody>
              </table>
            </Panel>
            <div style={{ marginTop: 12 }}>
              <Panel title="Cakupan Risiko Signifikan" sub="setiap RoMM signifikan harus memiliki prosedur yang merespons">
                <div style={{ padding: '6px 14px 14px' }}>
                  {sigRisks.map(r => {
                    const tot = r.procs.length, dn = r.procs.filter(p => p.status === 'done').length;
                    const full = dn === tot;
                    return (
                      <div key={r.riskId} className="row ac gap10" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                        <span style={{ color: full ? 'var(--green)' : dn > 0 ? 'var(--amber)' : 'var(--red)' }}>{full ? <I.checkCircle size={16} /> : <I.alert size={16} />}</span>
                        <span className="mono tiny" style={{ fontWeight: 700, width: 40 }}>{r.riskId}</span>
                        <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1 }}>{r.area}</span>
                        <span className="tiny muted">{dn}/{tot} prosedur tuntas</span>
                        <div style={{ width: 120 }}><Progress value={dn / tot * 100} color={full ? 'var(--green)' : 'var(--amber)'} /></div>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            </div>
          </div>
        )}

        {tab === 'effort' && (
          <div className="grid" style={{ marginTop: 12, gridTemplateColumns: '1.3fr 1fr', gap: 12, alignItems: 'start' }}>
            <Panel noBody>
              <div className="panel-h"><h3>Beban Jam per Penanggung Jawab</h3></div>
              <div style={{ padding: '6px 14px 12px' }}>
                {(Object.entries(allProcs.reduce((m, p) => { (m[p.prep] = m[p.prep] || { bud: 0, act: 0, n: 0 }); m[p.prep].bud += p.bud; m[p.prep].act += p.act; m[p.prep].n++; return m; }, {})) as [string, any][]).sort((a, b) => b[1].bud - a[1].bud).map(([name, v]) => {
                  const over = v.act > v.bud;
                  return (
                    <div key={name} style={{ padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
                      <div className="row jb ac" style={{ marginBottom: 5 }}>
                        <span className="row ac gap6"><Avatar name={name} size={22} /><span style={{ fontSize: 12.5, fontWeight: 600 }}>{name}</span><span className="tiny muted">· {v.n} prosedur</span></span>
                        <span className="mono tiny" style={{ fontWeight: 700, color: over ? 'var(--red)' : 'var(--ink-2)' }}>{v.act} / {v.bud}j</span>
                      </div>
                      <Progress value={v.act / v.bud * 100} color={over ? 'var(--red)' : 'var(--blue)'} />
                    </div>
                  );
                })}
              </div>
            </Panel>
            <Panel noBody>
              <div className="panel-h"><h3>Prosedur per Sifat</h3></div>
              <div style={{ padding: '6px 14px 12px' }}>
                {Object.entries(PRG_NATURE).map(([k, n]) => {
                  const ps = allProcs.filter(p => p.nat === k);
                  if (!ps.length) return null;
                  const hrs = ps.reduce((s, p) => s + p.act, 0);
                  const dn = ps.filter(p => p.status === 'done').length;
                  return (
                    <div key={k} className="row ac gap10" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                      <span style={{ width: 9, height: 9, borderRadius: 2, background: n.c, flex: '0 0 9px' }} />
                      <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1 }}>{n.l}</span>
                      <span className="tiny muted">{dn}/{ps.length} tuntas</span>
                      <span className="mono tiny" style={{ fontWeight: 700, width: 44, textAlign: 'right' }}>{hrs}j</span>
                    </div>
                  );
                })}
                <div className="divider" />
                <div className="row ac gap10">
                  <Donut size={88} thickness={13} segments={PRG_ORDER.map(s => ({ value: allProcs.filter(p => p.status === s).length, color: ({ done: 'var(--green)', progress: 'var(--amber)', review: 'var(--blue)', notstarted: '#c7ccd2' })[s] }))} center={<div><div className="mono" style={{ fontSize: 19, fontWeight: 700 }}>{pct}%</div><div className="tiny muted">tuntas</div></div>} />
                  <div style={{ flex: 1 }}>
                    {PRG_ORDER.slice().reverse().map(s => (
                      <div key={s} className="row jb ac" style={{ padding: '3px 0' }}>
                        <span className="row ac gap6 tiny"><span style={{ width: 8, height: 8, borderRadius: 2, background: ({ done: 'var(--green)', progress: 'var(--amber)', review: 'var(--blue)', notstarted: '#c7ccd2' })[s] }} />{PRG_STATUS[s].l}</span>
                        <span className="mono tiny" style={{ fontWeight: 700 }}>{allProcs.filter(p => p.status === s).length}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Panel>
          </div>
        )}

        <style>{`
          .prg-detail{margin-top:12px}
          .prg-tbl tbody tr.sel{background:var(--blue-050)}
          .seg-pill{font-size:11px;font-weight:600;padding:4px 10px;border-radius:6px;border:1px solid var(--line);background:var(--surface);color:var(--ink-2);cursor:pointer}
          .seg-pill.on{background:var(--navy);color:#fff;border-color:var(--navy)}
        `}</style>
      </div></div>
    </>
  );
}

Object.assign(window, { AuditProgramme, PROGRAMME });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { AuditProgramme, PROGRAMME };
