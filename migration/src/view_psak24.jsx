/* [codemod] ESM imports */
import React from 'react';
import { useFirm, useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel } from './ui.jsx';

/* ============================================================
   NeoSuite AMS — PSAK 24 · Imbalan Kerja (Employee Benefits)
   Kertas kerja penyajian LK & prosedur audit atas liabilitas
   imbalan pasti (imbalan pasca-kerja). Mencakup:
   • Peta penyajian: Posisi Keuangan / Laba Rugi / OCI (PSAK 24 jo. PSAK 1)
   • Rekonsiliasi liabilitas imbalan pasti (roll-forward) & pemilahan L/R vs OCI
   • Dua skenario audit: laporan aktuaris TERSEDIA vs TIDAK TERSEDIA (SA 500/540/620/705)
   • Ketentuan UU Cipta Kerja (UU 11/2020 jo. PP 35/2021) → biaya jasa lalu & pengali pesangon
   Terkait WP H-2 · Liabilitas Imbalan Kerja Rp 13.080 jt (2024: Rp 11.220 jt).
   ============================================================ */
const { useState: useStateP24, useMemo: useMemoP24 } = React;

/* ---- rekonsiliasi liabilitas imbalan pasti (DBO roll-forward), Rp juta ---- */
const P24_RECON = [
  { id: 'open', t: 'Saldo awal — Liabilitas imbalan pasti (1 Jan 2025)', v: 11220, bucket: 'open' },
  { id: 'csc',  t: 'Biaya jasa kini (current service cost)',            v: 1340,  bucket: 'pl' },
  { id: 'int',  t: 'Biaya bunga neto atas liabilitas (¶123)',            v: 760,   bucket: 'pl' },
  { id: 'paid', t: 'Imbalan dibayar selama periode',                     v: -510,  bucket: 'cash' },
  { id: 'rem',  t: 'Pengukuran kembali — kerugian aktuarial',            v: 270,   bucket: 'oci' },
  { id: 'close',t: 'Saldo akhir — Liabilitas imbalan pasti (31 Des 2025)', v: 13080, bucket: 'close' },
];
const P24_BUCKET = {
  open:  { lbl: '—',     kind: 'gray'  },
  pl:    { lbl: 'Laba Rugi', kind: 'blue' },
  oci:   { lbl: 'OCI',   kind: 'purple' },
  cash:  { lbl: 'Kas',   kind: 'gray'  },
  close: { lbl: '—',     kind: 'gray'  },
};

/* ---- peta penyajian dalam laporan keuangan (PSAK 24 jo. PSAK 1) ---- */
const P24_PRESENT = [
  { id: 'sofp', stmt: 'Laporan Posisi Keuangan', ref: '¶63', line: 'Liabilitas imbalan pasti neto — tidak lancar', amt: 13080, note: 'PV kewajiban dikurang nilai wajar aset program; program unfunded → tampil penuh.' },
  { id: 'pl1',  stmt: 'Laba Rugi', ref: '¶120(a)', line: 'Biaya jasa (jasa kini + jasa lalu)', amt: 1340, note: 'Disajikan dalam beban karyawan/operasional.' },
  { id: 'pl2',  stmt: 'Laba Rugi', ref: '¶120(b)', line: 'Bunga neto atas liabilitas imbalan pasti', amt: 760, note: 'Tingkat diskonto × liabilitas neto awal.' },
  { id: 'oci',  stmt: 'Penghasilan Komprehensif Lain', ref: '¶120(c)', line: 'Pengukuran kembali (remeasurement)', amt: 270, note: 'TIDAK direklasifikasi ke L/R — dapat dipindah dalam ekuitas.' },
];

/* ---- asumsi aktuaria utama ---- */
const P24_ASSUMP = [
  { k: 'Tingkat diskonto', v: '6,80%', py: '7,00%', note: 'Acuan imbal hasil obligasi pemerintah (SUN) tenor ekuivalen — pasar obligasi korporasi berkualitas tinggi belum dalam.' },
  { k: 'Tingkat kenaikan gaji', v: '7,50%', py: '7,50%', note: 'Konsisten dengan kebijakan remunerasi & inflasi jangka panjang.' },
  { k: 'Tabel mortalita', v: 'TMI-IV (2019)', py: 'TMI-IV', note: 'Tabel Mortalita Indonesia IV.' },
  { k: 'Tingkat pengunduran diri', v: '5% (≤30 th)', py: '5%', note: 'Menurun seiring usia hingga 0% pada usia pensiun.' },
  { k: 'Usia pensiun normal', v: '56 tahun', py: '56 tahun', note: 'Sesuai kebijakan entitas & skema Jaminan Pensiun.' },
  { k: 'Metode penilaian', v: 'Projected Unit Credit', py: 'PUC', note: 'Disyaratkan PSAK 24 ¶67.' },
];
const P24_SENS = [
  { k: 'Tingkat diskonto +1%', d: -8.5 },
  { k: 'Tingkat diskonto −1%', d: 9.7 },
  { k: 'Kenaikan gaji +1%', d: 9.2 },
  { k: 'Kenaikan gaji −1%', d: -8.1 },
];

/* ---- prosedur audit per-skenario ---- */
const P24_PROC_AVAIL = [
  { id: 'a1', ref: 'SA 500 ¶8(a)', t: 'Evaluasi kompetensi, kapabilitas & objektivitas aktuaris (FSAI/PAI, izin OJK, independensi dari manajemen)' },
  { id: 'a2', ref: 'SA 500 ¶8(b)', t: 'Uji kelengkapan & akurasi data sensus karyawan (usia, masa kerja, gaji) — rekonsiliasi ke HRIS/payroll' },
  { id: 'a3', ref: 'SA 540',       t: 'Evaluasi kewajaran asumsi: tingkat diskonto (vs SUN), kenaikan gaji, mortalita, turnover, usia pensiun' },
  { id: 'a4', ref: 'PSAK 24 ¶67',  t: 'Evaluasi kesesuaian metode Projected Unit Credit & konsistensi antar-periode' },
  { id: 'a5', ref: 'SA 500 ¶8(c)', t: 'Uji ulang aritmetika & rekonsiliasi mutasi (roll-forward) liabilitas imbalan pasti' },
  { id: 'a6', ref: 'PSAK 24 ¶120', t: 'Verifikasi pemilahan komponen: jasa & bunga ke L/R; pengukuran kembali ke OCI' },
  { id: 'a7', ref: 'SA 620',       t: 'Pertimbangkan penggunaan pakar auditor (aktuaris independen) bila kompleks/material' },
  { id: 'a8', ref: 'PSAK 24 ¶135', t: 'Telaah kecukupan pengungkapan CALK: asumsi, analisis sensitivitas, rekonsiliasi & durasi' },
];
const P24_PROC_NONE = [
  { id: 'n1', ref: 'SA 540 ¶13',   t: 'Pahami alasan ketiadaan valuasi & kebijakan akuntansi manajemen atas imbalan kerja' },
  { id: 'n2', ref: 'SA 320',       t: 'Estimasi indikatif kewajiban: populasi karyawan × formula pesangon UU Cipta Kerja → uji materialitas' },
  { id: 'n3', ref: 'SA 540 ¶16',   t: 'Bila indikasi material: kembangkan estimasi independen auditor (titik / rentang)' },
  { id: 'n4', ref: 'SA 620',       t: 'Libatkan pakar auditor (aktuaris) untuk membangun ekspektasi liabilitas' },
  { id: 'n5', ref: 'SA 450',       t: 'Evaluasi apakah ketiadaan/kurang catat = salah saji; akumulasikan ke SAD Ledger' },
  { id: 'n6', ref: 'SA 705',       t: 'Bila material & tak dikoreksi: opini WDP/Tidak Wajar; bila bukti tak memadai: WDP/TMP' },
  { id: 'n7', ref: 'SA 260/580',   t: 'Komunikasikan ke TCWG & peroleh representasi tertulis manajemen' },
  { id: 'n8', ref: 'SA 230',       t: 'Dokumentasikan pertimbangan profesional & dasar kesimpulan' },
];

/* ---- UU Cipta Kerja — pengali komponen pesangon (PP 35/2021) ---- */
const P24_CK = [
  { reason: 'Mengundurkan diri', up: '—', upmk: '—', uph: '✓', extra: '+ Uang Pisah', flag: 'gray' },
  { reason: 'Efisiensi — mencegah kerugian', up: '1,00×', upmk: '1×', uph: '✓', extra: '', flag: 'amber' },
  { reason: 'Efisiensi — perusahaan rugi', up: '0,50×', upmk: '1×', uph: '✓', extra: '', flag: 'amber' },
  { reason: 'Perusahaan pailit', up: '0,50×', upmk: '1×', uph: '✓', extra: '', flag: 'red' },
  { reason: 'Sakit/cacat berkepanjangan (>12 bln)', up: '2,00×', upmk: '1×', uph: '✓', extra: '', flag: 'blue' },
  { reason: 'Memasuki usia pensiun', up: '1,75×', upmk: '1×', uph: '✓', extra: '', flag: 'green' },
  { reason: 'Pekerja meninggal dunia', up: '2,00×', upmk: '1×', uph: '✓', extra: '', flag: 'green' },
];

function P24Card({ value, label, sub, accent }) {
  return (
    <div className="panel" style={{ padding: '12px 14px', display: 'grid', gap: 2 }}>
      <div className="mono" style={{ fontSize: 21, fontWeight: 700, color: accent || 'var(--navy)', lineHeight: 1.05 }}>{value}</div>
      <div className="tiny muted" style={{ fontWeight: 600 }}>{label}</div>
      {sub && <div className="tiny" style={{ color: 'var(--ink-4)' }}>{sub}</div>}
    </div>
  );
}

function PSAK24View() {
  const { fmt } = window.AMS;
  const firm = (typeof useFirm === 'function') ? useFirm() : {};
  const nav = (typeof useNav === 'function') ? useNav() : (() => {});
  const loader = window.loadLS || ((k, d) => d);

  const [scenario, setScenario] = useStateP24(() => loader('ams.psak24.scenario', 'avail'));
  const [doneA, setDoneA] = useStateP24(() => loader('ams.psak24.doneA', {}));
  const [doneN, setDoneN] = useStateP24(() => loader('ams.psak24.doneN', {}));

  React.useEffect(() => { try { localStorage.setItem('ams.psak24.scenario', JSON.stringify(scenario)); } catch (e) {} }, [scenario]);
  React.useEffect(() => { try { localStorage.setItem('ams.psak24.doneA', JSON.stringify(doneA)); } catch (e) {} }, [doneA]);
  React.useEffect(() => { try { localStorage.setItem('ams.psak24.doneN', JSON.stringify(doneN)); } catch (e) {} }, [doneN]);

  const avail = scenario === 'avail';
  const procs = avail ? P24_PROC_AVAIL : P24_PROC_NONE;
  const doneMap = avail ? doneA : doneN;
  const setDone = avail ? setDoneA : setDoneN;
  const toggle = (id) => setDone(m => ({ ...m, [id]: !m[id] }));
  const doneCount = procs.filter(p => doneMap[p.id]).length;
  const score = Math.round((doneCount / procs.length) * 100);

  const client = firm.activeClient || { name: 'PT Sentosa Makmur Tbk' };
  const eng = firm.activeEngagement || { id: 'ENG-2025-014', fy: 'FY2025' };

  /* ditarik dari sumber kebenaran tunggal (WTB 2-2300 via AMS_CANON) — bukan hardcode */
  const canon24 = window.AMS_CANON;
  const dbo = canon24 ? canon24.FIG.dbo : 13080;
  const oci = canon24 ? canon24.FIG.ociRemeasure : 270;
  const plCost = 2100;

  return (
    <>
      <SubBar moduleId="psak24" right={
        <div className="row gap8 ac">
          <Badge kind="green">PSAK 24 · IAS 19</Badge>
          <Btn sm onClick={() => nav('sa540', { from: 'psak24' })}><I.target size={13} /> SA 540 · Estimasi</Btn>
          <Btn sm onClick={() => nav('expert', { from: 'psak24' })}><I.expert size={13} /> Evaluasi Pakar</Btn>
          <Btn sm><I.download size={13} /> Kertas Kerja H-2</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>

          {/* summary */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            <P24Card value={'Rp ' + fmt(dbo) + ' jt'} label="Liabilitas imbalan pasti neto" sub="¶63 · Posisi Keuangan (2024: 11.220)" accent="var(--navy)" />
            <P24Card value={'Rp ' + fmt(plCost) + ' jt'} label="Beban diakui di Laba Rugi" sub="Jasa 1.340 + bunga neto 760" accent="var(--blue)" />
            <P24Card value={'Rp ' + fmt(oci) + ' jt'} label="Pengukuran kembali — OCI" sub="Kerugian aktuarial (tak direklas)" accent="var(--purple)" />
            <P24Card value={avail ? 'Tersedia' : 'Tidak Ada'} label="Laporan aktuaris" sub={avail ? 'Pakar manajemen — dievaluasi' : 'Perlu estimasi independen'} accent={avail ? 'var(--green)' : 'var(--amber)'} />
            <P24Card value={score + '%'} label="Prosedur audit selesai" sub={doneCount + '/' + procs.length + ' langkah'} accent={score === 100 ? 'var(--green)' : 'var(--navy)'} />
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
            {/* ============ LEFT ============ */}
            <div className="grid" style={{ gap: 12 }}>

              {/* peta penyajian */}
              <Panel noBody>
                <div className="panel-h"><h3>Peta Penyajian dalam Laporan Keuangan</h3><span className="sub mono">PSAK 24 jo. PSAK 1</span></div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="dtbl" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Pos / Komponen</th>
                        <th style={{ textAlign: 'left' }}>Disajikan di</th>
                        <th style={{ textAlign: 'left', width: 56 }}>Ref</th>
                        <th style={{ textAlign: 'right', width: 92 }}>Rp juta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {P24_PRESENT.map((r) => (
                        <tr key={r.id}>
                          <td>
                            <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.3 }}>{r.line}</div>
                            <div className="tiny muted" style={{ lineHeight: 1.4 }}>{r.note}</div>
                          </td>
                          <td><Badge kind={r.stmt.includes('Komprehensif') ? 'purple' : r.stmt.includes('Posisi') ? 'teal' : 'blue'}>{r.stmt.includes('Posisi') ? 'Posisi Keuangan' : r.stmt.includes('Komprehensif') ? 'OCI' : 'Laba Rugi'}</Badge></td>
                          <td className="mono tiny" style={{ color: 'var(--ink-3)' }}>{r.ref}</td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(r.amt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>
                  Sejak revisi 2013, <b>metode koridor dihapus</b>: seluruh pengukuran kembali diakui langsung di OCI dan biaya jasa lalu diakui segera di laba rugi. Liabilitas neto tampil penuh di posisi keuangan.
                </div>
              </Panel>

              {/* rekonsiliasi */}
              <Panel noBody>
                <div className="panel-h"><h3>Rekonsiliasi Liabilitas Imbalan Pasti</h3><span className="sub mono">roll-forward · ¶140–141</span><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
                <div>
                  {P24_RECON.map((r, i) => {
                    const b = P24_BUCKET[r.bucket];
                    const isTot = r.bucket === 'open' || r.bucket === 'close';
                    return (
                      <div key={r.id} className="row ac gap10" style={{ padding: '9px 14px', borderBottom: i < P24_RECON.length - 1 ? '1px solid var(--line-soft)' : 0, background: isTot ? 'var(--surface-2)' : 'transparent' }}>
                        <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: isTot ? 700 : 500, color: isTot ? 'var(--navy)' : 'var(--ink)' }}>{r.t}</div>
                        {!isTot ? <Badge kind={b.kind}>{b.lbl}</Badge> : <span style={{ width: 60 }} />}
                        <div className="mono" style={{ width: 84, textAlign: 'right', fontWeight: 700, color: r.v < 0 ? 'var(--red)' : isTot ? 'var(--navy)' : 'var(--ink)' }}>{fmt(r.v)}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="row gap14" style={{ padding: '10px 14px 4px' }}>
                  <div className="row ac gap6 tiny muted"><span style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--blue)' }} /> Ke Laba Rugi: <b style={{ color: 'var(--ink)' }}>Rp {fmt(plCost)} jt</b></div>
                  <div className="row ac gap6 tiny muted"><span style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--purple)' }} /> Ke OCI: <b style={{ color: 'var(--ink)' }}>Rp {fmt(oci)} jt</b></div>
                </div>
                <div onClick={() => nav('psak46', { from: 'psak24' })} className="row ac jb" style={{ margin: '4px 14px 12px', padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', borderLeft: '3px solid var(--green)', background: 'var(--surface)', cursor: 'pointer' }}>
                  <div style={{ fontSize: 11.5, lineHeight: 1.4 }}>Liabilitas ini berdasar pajak <b>0</b> (deductible saat dibayar) → <b>beda temporer dapat dikurangkan</b> di PSAK 46. Pengukuran kembali OCI Rp {fmt(oci)} jt × 22% = pajak OCI.</div>
                  <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--green)', whiteSpace: 'nowrap', marginLeft: 8 }}>DTA Rp {fmt(Math.round(dbo * 0.22))} jt <I.arrowRight size={12} /></span>
                </div>
              </Panel>

              {/* skenario audit */}
              <Panel noBody>
                <div className="panel-h"><h3>Prosedur Audit — Skenario Laporan Aktuaris</h3><div style={{ flex: 1 }} />
                  <div className="seg" style={{ width: 'fit-content' }}>
                    <button className={avail ? 'on' : ''} onClick={() => setScenario('avail')}>Tersedia</button>
                    <button className={!avail ? 'on' : ''} onClick={() => setScenario('none')}>Tidak Tersedia</button>
                  </div>
                </div>
                <div className="row gap8" style={{ padding: '10px 14px', alignItems: 'flex-start', background: avail ? 'var(--blue-050)' : 'var(--amber-bg)' }}>
                  <span style={{ color: avail ? 'var(--blue)' : 'var(--amber)', marginTop: 1 }}>{avail ? <I.expert size={15} /> : <I.alert size={15} />}</span>
                  <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>
                    {avail
                      ? <>Aktuaris adalah <b>pakar yang digunakan manajemen</b> (SA 500 ¶8). Laporan tidak diterima begitu saja — auditor menguji <b>data input, asumsi, metode</b>, dan kecukupan pengungkapan.</>
                      : <>Tanpa valuasi aktuaria, kewajiban berisiko <b>tidak tercatat / understated</b>. Auditor wajib menguji materialitas, mengembangkan <b>estimasi independen</b>, dan menilai dampaknya ke opini.</>}
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

              {/* UU Cipta Kerja */}
              <Panel noBody>
                <div className="panel-h"><h3>Ketentuan UU Cipta Kerja</h3><span className="sub mono">UU 11/2020 jo. PP 35/2021</span></div>
                <div className="row gap8" style={{ padding: '10px 14px', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--blue)', marginTop: 1 }}><I.gavel size={15} /></span>
                  <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>
                    Perubahan ketentuan pesangon = <b>amandemen program</b> → menimbulkan <b>biaya jasa lalu</b> yang diakui segera di laba rugi. Mayoritas entitas mencatat <b>keuntungan</b> (sebagian skenario PHK lebih rendah). Tiga komponen: <b>Uang Pesangon (UP)</b>, <b>UPMK</b>, <b>UPH</b>.
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="dtbl" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Alasan PHK</th>
                        <th style={{ textAlign: 'center', width: 64 }}>UP</th>
                        <th style={{ textAlign: 'center', width: 56 }}>UPMK</th>
                        <th style={{ textAlign: 'center', width: 48 }}>UPH</th>
                      </tr>
                    </thead>
                    <tbody>
                      {P24_CK.map((r, i) => (
                        <tr key={i}>
                          <td style={{ fontSize: 12 }}>{r.reason}{r.extra && <span className="tiny" style={{ color: 'var(--ink-4)' }}> {r.extra}</span>}</td>
                          <td style={{ textAlign: 'center' }}><span className="mono" style={{ fontWeight: 700, color: 'var(--' + r.flag + ')' }}>{r.up}</span></td>
                          <td style={{ textAlign: 'center' }} className="mono tiny">{r.upmk}</td>
                          <td style={{ textAlign: 'center', color: 'var(--green)' }}>{r.uph}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>
                  Pengali UP bervariasi menurut alasan PHK; UPMK & tabel UP dasar mengacu masa kerja. Bila PP/PKB/kontrak memberi imbalan <b>lebih tinggi</b> dari minimum UU, dasar pengukuran PSAK 24 adalah yang lebih tinggi (kewajiban konstruktif).
                </div>
              </Panel>
            </div>

            {/* ============ RIGHT ============ */}
            <div className="grid" style={{ gap: 12 }}>

              {/* kesimpulan */}
              <Panel noBody>
                <div style={{ background: 'linear-gradient(120deg,#013a52,#005085)', color: '#fff', padding: '14px 16px' }}>
                  <div className="tiny upper" style={{ color: '#bcd6e4', letterSpacing: '.05em', marginBottom: 8 }}>Kesimpulan Audit — {avail ? 'Aktuaris Tersedia' : 'Tanpa Aktuaris'}</div>
                  <div className="row ac gap12">
                    <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1, fontFamily: 'JetBrains Mono, monospace' }}>{score}<span style={{ fontSize: 18 }}>%</span></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,.18)', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: score + '%', background: score === 100 ? '#4ade80' : '#7cc6ff', borderRadius: 4, transition: '.3s' }} /></div>
                      <div className="tiny" style={{ color: '#bcd6e4', marginTop: 6 }}>{doneCount}/{procs.length} prosedur audit selesai</div>
                    </div>
                  </div>
                </div>
                <div style={{ padding: 14 }}>
                  <div className="panel" style={{ padding: '9px 11px', background: avail ? 'var(--green-bg)' : 'var(--amber-bg)', borderColor: 'transparent' }}>
                    <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                      <span style={{ color: avail ? 'var(--green)' : 'var(--amber)', marginTop: 1 }}>{avail ? <I.checkCircle size={15} /> : <I.alert size={15} />}</span>
                      <span style={{ fontSize: 11.5, lineHeight: 1.5 }}>{avail
                        ? <>Liabilitas <b>Rp {fmt(dbo)} jt</b> didukung laporan aktuaria yang relevan & andal; asumsi dan data telah diuji. Mendukung <b>opini tanpa modifikasi</b> atas pos imbalan kerja.</>
                        : <>Bila estimasi independen menunjukkan jumlah <b>material</b> tidak tercatat dan manajemen menolak koreksi → pertimbangkan <b>modifikasi opini (SA 705)</b>.</>}</span>
                    </div>
                  </div>
                  {!avail && (
                    <div style={{ marginTop: 12 }}>
                      <div className="tiny muted upper" style={{ marginBottom: 6 }}>Pohon Keputusan</div>
                      <div className="grid" style={{ gap: 6 }}>
                        {[
                          ['Apakah jumlah indikatif material?', 'SA 320'],
                          ['Estimasi independen dapat dibangun?', 'SA 540 ¶16'],
                          ['Manajemen mengoreksi salah saji?', 'SA 450'],
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

              {/* asumsi aktuaria */}
              <Panel title="Asumsi Aktuaria Utama" sub="¶76–77 · WP H-2">
                <div style={{ display: 'grid', gap: 0 }}>
                  {P24_ASSUMP.map((a, i) => (
                    <div key={i} style={{ padding: '8px 0', borderBottom: i < P24_ASSUMP.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                      <div className="row ac jb">
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{a.k}</span>
                        <span className="mono" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--navy)' }}>{a.v}</span>
                      </div>
                      <div className="tiny muted" style={{ lineHeight: 1.4, marginTop: 1 }}>{a.note} <span style={{ color: 'var(--ink-4)' }}>· PY {a.py}</span></div>
                    </div>
                  ))}
                </div>
              </Panel>

              {/* sensitivitas */}
              <Panel title="Analisis Sensitivitas" sub="¶145 · dampak ke DBO">
                <div style={{ display: 'grid', gap: 9 }}>
                  {P24_SENS.map((s, i) => {
                    const pos = s.d > 0;
                    const w = Math.min(50, Math.abs(s.d) * 4);
                    return (
                      <div key={i}>
                        <div className="row ac jb" style={{ marginBottom: 3 }}>
                          <span style={{ fontSize: 11.5 }}>{s.k}</span>
                          <span className="mono tiny" style={{ fontWeight: 700, color: pos ? 'var(--red)' : 'var(--green)' }}>{pos ? '+' : ''}{s.d.toFixed(1)}%</span>
                        </div>
                        <div style={{ position: 'relative', height: 7, background: 'var(--surface-3)', borderRadius: 4 }}>
                          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--line-strong)' }} />
                          <div style={{ position: 'absolute', top: 0, bottom: 0, height: '100%', borderRadius: 4, background: pos ? 'var(--red)' : 'var(--green)', left: pos ? '50%' : (50 - w) + '%', width: w + '%' }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="tiny muted" style={{ lineHeight: 1.45, paddingTop: 2, borderTop: '1px solid var(--line-soft)' }}>
                    Kenaikan tingkat diskonto <b>menurunkan</b> DBO; kenaikan asumsi gaji <b>menaikkan</b> DBO. Diungkapkan dalam CALK (¶145).
                  </div>
                </div>
              </Panel>

              {/* tautan modul */}
              <Panel title="Modul Terkait" sub="ketertelusuran">
                <div style={{ display: 'grid', gap: 6 }}>
                  {[
                    ['sa540', 'target', 'SA 540 · Audit Estimasi Akuntansi'],
                    ['psak25', 'sync', 'PSAK 25 · Perubahan Estimasi (asumsi aktuaria)'],
                    ['expert', 'expert', 'Penggunaan Pakar (SA 500/620)'],
                    ['psak46', 'receipt', 'PSAK 46 · Pajak Tangguhan (beda temporer)'],
                    ['fsgen', 'report', 'Financial Statement Generator'],
                    ['sad', 'scale', 'SAD Ledger · Evaluasi Salah Saji'],
                    ['compmatrix', 'table', 'Matriks Kepatuhan'],
                  ].map(([id, ic, lbl]) => {
                    const IconC = I[ic] || I.doc;
                    return (
                      <button key={id} onClick={() => nav(id, { from: 'psak24' })} className="row ac gap9" style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                        <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><IconC size={15} /></span>
                        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{lbl}</span>
                        <I.arrowRight size={13} style={{ color: 'var(--ink-4)' }} />
                      </button>
                    );
                  })}
                </div>
              </Panel>
            </div>
          </div>

          <div className="tiny muted" style={{ padding: '0 2px 4px', lineHeight: 1.5 }}>
            Kertas kerja ini menelusuri imbalan kerja <b>{client.name}</b> ({eng.id} · {eng.fy}) terhadap PSAK 24 — dari penyajian LK & rekonsiliasi liabilitas, prosedur audit dua skenario laporan aktuaris, hingga dampak UU Cipta Kerja. Status & skenario tersimpan otomatis untuk jejak audit.
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { PSAK24View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { PSAK24View };
