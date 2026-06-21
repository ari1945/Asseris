/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { AMS_CANON } from './canon';
import { useAudit, useFirm, useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Donut, Panel } from './ui.jsx';

/* ============================================================
   Asseris — PSAK 68 · Pengukuran Nilai Wajar (IFRS 13)
   ------------------------------------------------------------
   Kertas kerja pengukuran & audit nilai wajar. PSAK 68 adalah
   standar "BAGAIMANA mengukur" — ia tidak memiliki saldo sendiri,
   melainkan MENGAGREGASI nilai wajar pos yang pengakuannya diatur
   standar lain. Seluruh angka DITARIK dari satu sumber kebenaran:
     · AMS_CANON.psak68(wtb) — hierarki, teknik, roll-forward Level 3
       & sensitivitas; seed FV_PORTFOLIO yang SAMA dipakai PSAK 71
       untuk pos FVOCI/FVTPL non-WTB.
     · Tanah & bangunan model revaluasi ditarik dari laporan KJPP
       (Pakar · WP V-2) yang juga dirujuk modul Penggunaan Pakar.
   Cakupan:
     • Hierarki nilai wajar — Level 1·2·3 (¶72-90)
     • Teknik valuasi — pendekatan pasar / penghasilan / biaya (¶61-66)
       + input teramati vs tak teramati & penggunaan tertinggi-terbaik
     • Pengungkapan Level 3 — roll-forward (¶93e) + sensitivitas (¶93h)
     • Tabel pengungkapan CALK + transfer antar level (¶91-99)
     • Rekonsiliasi lintas-modul (satu sumber angka)
     • Audit estimasi nilai wajar (SA 540) + evaluasi pakar (SA 500)
   ============================================================ */
const { useState: useStateP68, useMemo: useMemoP68 } = React;

/* ---- meta level hierarki (¶72-90) ---- */
const P68_LEVEL = {
  1: { kind: 'green', color: '#1f7a4d', lbl: 'Level 1', name: 'Harga kuotasi pasar aktif', sub: 'Input paling andal · tanpa penyesuaian', desc: 'Harga kuotasi (tanpa penyesuaian) di pasar aktif untuk aset/liabilitas identik yang dapat diakses entitas pada tanggal pengukuran.' },
  2: { kind: 'amber', color: '#c79a1e', lbl: 'Level 2', name: 'Input teramati lainnya', sub: 'Teramati langsung / tak langsung', desc: 'Input selain harga kuotasi Level 1 yang dapat diobservasi untuk aset/liabilitas, baik langsung maupun tidak langsung (kurva, harga pembanding).' },
  3: { kind: 'red',   color: '#b3261e', lbl: 'Level 3', name: 'Input tak teramati', sub: 'Pertimbangan signifikan · risiko tertinggi', desc: 'Input tak teramati untuk aset/liabilitas, dipakai saat input teramati tidak tersedia — mencerminkan asumsi entitas (DCF, DRC). Wajib roll-forward & sensitivitas.' },
};

/* ---- tiga pendekatan valuasi (¶61-66) ---- */
const P68_APPROACH = {
  pasar:        { lbl: 'Pendekatan Pasar', ic: 'target',   desc: 'Memakai harga & informasi relevan dari transaksi pasar aset/liabilitas yang identik atau sebanding (data pembanding, kelipatan pasar).' },
  penghasilan:  { lbl: 'Pendekatan Penghasilan', ic: 'water', desc: 'Mengonversi jumlah masa depan (arus kas / laba) menjadi satu jumlah kini terdiskonto — teknik DCF & model penentuan harga opsi.' },
  biaya:        { lbl: 'Pendekatan Biaya', ic: 'building', desc: 'Jumlah yang dibutuhkan kini untuk mengganti kapasitas jasa aset — biaya pengganti terdepresiasi (DRC).' },
  'pasar+penghasilan': { lbl: 'Pasar + Penghasilan', ic: 'columns', desc: 'Kombinasi data pembanding pasar (kelipatan) dan arus kas terdiskonto, lazim untuk penyertaan entitas privat.' },
};

/* ---- ketentuan kunci PSAK 68 ---- */
const P68_KEY = [
  { k: 'Definisi nilai wajar', v: 'Harga keluar (exit price)', note: 'Harga yang akan diterima untuk menjual aset / dibayar untuk mengalihkan liabilitas dalam transaksi teratur antar pelaku pasar pada tanggal pengukuran (¶9).' },
  { k: 'Pasar acuan', v: 'Pasar utama / paling menguntungkan', note: 'Diukur pada pasar utama; bila tidak ada, pasar paling menguntungkan yang dapat diakses entitas (¶16).' },
  { k: 'Penggunaan tertinggi & terbaik', v: 'Aset non-keuangan', note: 'NW aset non-keuangan mempertimbangkan kemampuan pelaku pasar menghasilkan manfaat ekonomik pada penggunaan tertinggi & terbaik (¶27).' },
  { k: 'Hierarki input', v: 'Level 1 → 2 → 3', note: 'Memaksimalkan input teramati & meminimalkan input tak teramati; level ditentukan oleh input terendah yang signifikan (¶72-73).' },
];

/* ---- prosedur audit estimasi nilai wajar (SA 540 · SA 500) ---- */
const P68_PROC = [
  { ref: 'SA 540 ¶13', t: 'Pahami metode penetapan NW manajemen: model, pasar acuan, teknik & input per pos diukur pada nilai wajar' },
  { ref: 'PSAK 68 ¶72', t: 'Evaluasi ketepatan penetapan level hierarki — uji apakah input terendah yang signifikan menentukan level' },
  { ref: 'SA 500 ¶8',  t: 'Evaluasi kompetensi, kapabilitas & objektivitas penilai KJPP (tanah & bangunan, WP V-2)' },
  { ref: 'SA 620',     t: 'Manfaatkan pakar auditor untuk re-valuasi forward valas (kurva forward, OIS, CVA/DVA) — WP V-3' },
  { ref: 'SA 540 ¶15', t: 'Kembangkan ekspektasi independen: re-perform DCF saham privat & DRC bangunan dengan input alternatif' },
  { ref: 'PSAK 68 ¶93d', t: 'Uji kewajaran input tak teramati Level 3 (kelipatan EV/EBITDA, WACC, biaya pengganti, penyusutan)' },
  { ref: 'PSAK 68 ¶93h', t: 'Lakukan analisis sensitivitas Level 3 — dampak pergeseran input signifikan terhadap NW' },
  { ref: 'PSAK 68 ¶95', t: 'Telaah kelengkapan transfer antar level & konsistensi kebijakan pengakuan transfer' },
  { ref: 'SA 540 ¶18', t: 'Evaluasi indikator bias manajemen pada asumsi NW (titik dalam rentang yang menguntungkan)' },
  { ref: 'PSAK 68 ¶91', t: 'Telaah kecukupan pengungkapan CALK: tabel hierarki, roll-forward Level 3, sensitivitas & teknik valuasi' },
  { ref: 'SA 230',     t: 'Dokumentasikan dasar kesimpulan & jejak audit pengukuran nilai wajar (WP V-1)' },
];

/* ---- keterkaitan kertas kerja (lineage dua arah) ---- */
const P68_UPSTREAM = [
  { id: 'psak71',   ic: 'coins',   lbl: 'PSAK 71 · Instrumen Keuangan', rel: 'Obligasi (FVOCI), forward (FVTPL) & saham privat — saldo & klasifikasi NW' },
  { id: 'psak16',   ic: 'building',lbl: 'PSAK 16 · Aset Tetap',         rel: 'Tanah & bangunan model revaluasi — basis nilai tercatat' },
  { id: 'expert',   ic: 'flask',   lbl: 'Penggunaan Pakar (SA 500)',    rel: 'Laporan KJPP (V-2) & pakar valuasi derivatif (V-3) — sumber NW' },
  { id: 'wtb',      ic: 'table',   lbl: 'Working Trial Balance',        rel: 'Saldo akun yang menjadi anchor pos nilai wajar' },
];
const P68_DOWNSTREAM = [
  { id: 'psak46',   ic: 'receipt', lbl: 'PSAK 46 · Pajak Tangguhan',    rel: 'Surplus revaluasi & untung FVOCI → pajak tangguhan (OCI)' },
  { id: 'fsgen',    ic: 'report',  lbl: 'FS Generator',                 rel: 'Tabel hierarki & roll-forward Level 3 → pengungkapan CALK' },
  { id: 'specifics',ic: 'flask',   lbl: 'Evaluasi Pakar · Specifics',   rel: 'Kesimpulan kecukupan pekerjaan penilai (SA 500/540)' },
  { id: 'sad',      ic: 'scale',   lbl: 'SAD Ledger (SA 450)',          rel: 'Selisih estimasi NW → akumulasi salah saji bila relevan' },
];

function P68Card({ value, label, sub, accent }: any) {
  return (
    <div className="panel" style={{ padding: '12px 14px', display: 'grid', gap: 2 }}>
      <div className="mono" style={{ fontSize: 21, fontWeight: 700, color: accent || 'var(--navy)', lineHeight: 1.05 }}>{value}</div>
      <div className="tiny muted" style={{ fontWeight: 600 }}>{label}</div>
      {sub && <div className="tiny" style={{ color: 'var(--ink-4)' }}>{sub}</div>}
    </div>
  );
}

function P68RowKv({ label, v, strong, accent }: any) {
  return (
    <div className="row jb ac">
      <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{label}</span>
      <span className="mono" style={{ fontWeight: strong ? 700 : 600, fontSize: strong ? 14 : 12.5, color: accent || (strong ? 'var(--navy)' : 'inherit') }}>{v}</span>
    </div>
  );
}

function P68LevelChip({ level }: any) {
  const m = P68_LEVEL[level];
  return <Badge kind={m.kind}>{m.lbl}</Badge>;
}

function PSAK68View() {
  const { fmt } = AMS;
  const firm = useFirm();
  const audit = useAudit();
  const nav = useNav();
  const loader = window.loadLS || ((k, d) => d);

  /* ——— SUMBER KEBENARAN ——— */
  const wtb = (audit && audit.wtb && audit.wtb.length) ? audit.wtb : ((AMS && AMS.WTB) || []);
  const canon = AMS_CANON;
  const p68 = useMemoP68(() => canon.psak68(wtb), [wtb]);

  const [tab, setTab] = useStateP68(() => loader('ams.psak68.tab', 'hierarki'));
  const [done, setDone] = useStateP68(() => loader('ams.psak68.done', {}));
  const [focus, setFocus] = useStateP68(() => loader('ams.psak68.focus', null)); // item id disorot

  React.useEffect(() => { try { localStorage.setItem('ams.psak68.tab', JSON.stringify(tab)); } catch (e) {} }, [tab]);
  React.useEffect(() => { try { localStorage.setItem('ams.psak68.done', JSON.stringify(done)); } catch (e) {} }, [done]);
  React.useEffect(() => { try { localStorage.setItem('ams.psak68.focus', JSON.stringify(focus)); } catch (e) {} }, [focus]);

  const rp = (x) => 'Rp ' + fmt(Math.round(x));
  const toggle = (id) => setDone(m => ({ ...m, [id]: !m[id] }));
  const doneCount = P68_PROC.filter((p, i) => done[p.ref + i]).length;
  const score = Math.round(doneCount / P68_PROC.length * 100);

  const client = firm.activeClient || { name: 'PT Sentosa Makmur Tbk' };
  const eng = firm.activeEngagement || { id: 'ENG-2025-014', fy: 'FY2025' };

  const levelSegs = p68.byLevel.map(L => ({ label: P68_LEVEL[L.level].lbl, value: L.amt, color: P68_LEVEL[L.level].color }));

  const TABS = [
    { id: 'hierarki', label: 'Hierarki & Inventaris' },
    { id: 'teknik', label: 'Teknik Valuasi' },
    { id: 'level3', label: 'Level 3 · ¶91-99' },
    { id: 'pengungkapan', label: 'Pengungkapan CALK' },
    { id: 'rekonsiliasi', label: 'Rekonsiliasi' },
    { id: 'audit', label: 'Audit · SA 540/500' },
  ];

  const rfRows = [
    { t: 'Saldo awal — Level 3 (1 Jan 2025)', v: p68.l3RF.opening, tot: true },
    { t: 'Pembelian / penambahan', v: p68.l3RF.additions, kind: 'green' },
    { t: 'Untung/(rugi) di Laba Rugi (FVTPL)', v: p68.l3RF.gainsPl, kind: 'blue' },
    { t: 'Untung/(rugi) di OCI (surplus revaluasi & FVOCI)', v: p68.l3RF.gainsOci, kind: 'amber' },
    { t: 'Transfer masuk ke Level 3', v: p68.l3RF.transfersIn, kind: 'gray' },
    { t: 'Transfer keluar dari Level 3', v: -p68.l3RF.transfersOut, kind: 'gray' },
    { t: 'Penjualan / penyelesaian', v: -p68.l3RF.settlements, kind: 'red' },
    { t: 'Saldo akhir — Level 3 (31 Des 2025)', v: p68.l3RF.closing, tot: true },
  ];

  return (
    <>
      <SubBar moduleId="psak68" right={
        <div className="row gap8 ac">
          <Badge kind="blue">PSAK 68 · IFRS 13</Badge>
          <Btn sm onClick={() => nav('psak71', { from: 'psak68' })}><I.coins size={13} /> Instrumen PSAK 71</Btn>
          <Btn sm onClick={() => nav('expert', { from: 'psak68' })}><I.flask size={13} /> Penggunaan Pakar</Btn>
          <Btn sm onClick={() => nav('psak46', { from: 'psak68' })}><I.receipt size={13} /> Dampak Pajak (OCI)</Btn>
          <Btn sm><I.download size={13} /> Kertas Kerja V-1</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>

          {/* summary cards */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            <P68Card value={rp(p68.total) + ' jt'} label="Total nilai wajar diukur" sub={p68.items.length + ' pos · seluruhnya berulang (recurring)'} accent="var(--navy)" />
            <P68Card value={rp(p68.byLevel[0].amt) + ' jt'} label="Level 1 · harga kuotasi" sub={(p68.byLevel[0].pct * 100).toFixed(0) + '% · input paling andal'} accent={P68_LEVEL[1].color} />
            <P68Card value={rp(p68.byLevel[1].amt) + ' jt'} label="Level 2 · input teramati" sub={(p68.byLevel[1].pct * 100).toFixed(0) + '% · pasar / kurva'} accent={P68_LEVEL[2].color} />
            <P68Card value={rp(p68.byLevel[2].amt) + ' jt'} label="Level 3 · input tak teramati" sub={(p68.byLevel[2].pct * 100).toFixed(0) + '% · pertimbangan signifikan'} accent={P68_LEVEL[3].color} />
            <P68Card value={rp(p68.dtlOci) + ' jt'} label="Pajak tangguhan surplus (OCI)" sub="→ PSAK 46 · 22%" accent="var(--blue)" />
          </div>

          {/* tabs */}
          <div className="row ac jb" style={{ flexWrap: 'wrap', gap: 8 }}>
            <div className="seg" style={{ width: 'fit-content', flexWrap: 'wrap' }}>
              {TABS.map(t => <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>)}
            </div>
            <span className="tiny muted">Satu sumber: <span className="mono">AMS_CANON.psak68(wtb)</span> ← PSAK 71 · KJPP (V-2)</span>
          </div>

          {/* ================= TAB · HIERARKI & INVENTARIS ================= */}
          {tab === 'hierarki' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div className="panel-h"><h3>Inventaris Pos Diukur pada Nilai Wajar</h3><span className="sub mono">pengukuran berulang · ¶93a-b</span><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="dtbl" style={{ width: '100%' }}>
                      <thead><tr>
                        <th style={{ textAlign: 'left' }}>Pos & Standar Pengukuran</th>
                        <th style={{ textAlign: 'left', width: 110 }}>Pendekatan</th>
                        <th style={{ textAlign: 'center', width: 70 }}>Level</th>
                        <th style={{ textAlign: 'right', width: 92 }}>Nilai Wajar</th>
                      </tr></thead>
                      <tbody>
                        {p68.items.map(it => (
                          <tr key={it.id} onClick={() => setFocus(focus === it.id ? null : it.id)} style={{ cursor: 'pointer', background: focus === it.id ? 'var(--blue-050)' : undefined }}>
                            <td>
                              <div className="row ac gap6" style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.3 }}>
                                <span>{it.label}</span>
                                {it.expert && <Badge kind="amber">Pakar {it.expert}</Badge>}
                              </div>
                              <div className="tiny muted" style={{ lineHeight: 1.4 }}><span className="mono" style={{ color: 'var(--ink-3)', fontWeight: 600 }}>{it.std}</span> · {it.note}</div>
                            </td>
                            <td className="tiny" style={{ color: 'var(--ink-2)' }}>{P68_APPROACH[it.approach].lbl.replace('Pendekatan ', '')}</td>
                            <td style={{ textAlign: 'center' }}><P68LevelChip level={it.level} /></td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(it.fv)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: 'var(--surface-2)' }}>
                          <td colSpan={3} style={{ fontWeight: 700, color: 'var(--navy)' }}>TOTAL NILAI WAJAR</td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--navy)' }}>{fmt(p68.total)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>
                    Setiap pos ditarik dari modul pemiliknya: instrumen keuangan (Rp {fmt(p68.finTotal)} jt) dari <b>PSAK 71</b>; tanah & bangunan model revaluasi (Rp {fmt(p68.revalTotal)} jt) dari laporan <b>KJPP (WP V-2)</b>. PSAK 68 hanya <b>mengukur & mengelompokkan</b> — tidak menyimpan saldo terpisah, sehingga tidak ada angka ganda.
                  </div>
                </Panel>

                {focus && (() => {
                  const it = p68.get(focus);
                  return (
                    <Panel title={'Detail Pengukuran — ' + it.label} sub={it.std + ' · ' + P68_APPROACH[it.approach].lbl}>
                      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div className="grid" style={{ gap: 7 }}>
                          <P68RowKv label="Nilai wajar" v={rp(it.fv) + ' jt'} strong />
                          <P68RowKv label="Klasifikasi" v={it.cls} />
                          <P68RowKv label="Level hierarki" v={P68_LEVEL[it.level].lbl} accent={P68_LEVEL[it.level].color} />
                          <P68RowKv label="Teknik valuasi" v={''} />
                          <div className="tiny" style={{ color: 'var(--ink-2)', lineHeight: 1.4, marginTop: -4 }}>{it.technique}</div>
                        </div>
                        <div className="panel" style={{ padding: '9px 11px', background: 'var(--surface-2)', borderColor: 'var(--line)' }}>
                          <div className="tiny upper" style={{ fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink-3)', marginBottom: 6 }}>Input valuasi (¶93d)</div>
                          {it.inputs.map((inp, i) => (
                            <div key={i} className="row ac jb" style={{ padding: '4px 0', borderBottom: i < it.inputs.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                              <span className="tiny" style={{ flex: 1, lineHeight: 1.3 }}>{inp.k}{inp.range && <span className="muted"> · {inp.range}</span>}</span>
                              <Badge kind={inp.obs ? 'green' : 'red'}>{inp.obs ? 'teramati' : 'tak teramati'}</Badge>
                            </div>
                          ))}
                          {it.hbu && <div className="tiny" style={{ marginTop: 8, lineHeight: 1.45, color: 'var(--ink-2)' }}><b>Penggunaan tertinggi & terbaik:</b> {it.hbu}</div>}
                        </div>
                      </div>
                    </Panel>
                  );
                })()}
              </div>

              <div className="grid" style={{ gap: 12 }}>
                <Panel title="Komposisi per Level Hierarki" sub="¶93b · pengukuran berulang">
                  <div className="row gap12 ac">
                    <Donut segments={levelSegs} size={104} thickness={15}
                      center={<><div className="mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{fmt(p68.total)}</div><div className="tiny muted">jt</div></>} />
                    <div style={{ flex: 1 }}>
                      {p68.byLevel.map(L => {
                        const m = P68_LEVEL[L.level];
                        return (
                          <div key={L.level} style={{ padding: '4px 0' }}>
                            <div className="row jb ac">
                              <span className="row ac gap6"><span style={{ width: 9, height: 9, borderRadius: 2, background: m.color }} /><span style={{ fontSize: 12, fontWeight: 600 }}>{m.lbl}</span></span>
                              <span className="mono" style={{ fontWeight: 700 }}>{fmt(L.amt)} jt</span>
                            </div>
                            <div className="tiny muted" style={{ paddingLeft: 15 }}>{m.name} · {(L.pct * 100).toFixed(0)}% · {L.n} pos</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="panel" style={{ marginTop: 11, padding: '9px 11px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
                    <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--amber)', marginTop: 1 }}><I.alert size={15} /></span>
                      <span style={{ fontSize: 11.5, lineHeight: 1.5 }}>Level 3 sebesar <b>{rp(p68.l3Total)} jt ({(p68.byLevel[2].pct * 100).toFixed(0)}%)</b> bergantung input tak teramati — area pertimbangan signifikan & potensi <b>Hal Audit Utama (SA 701)</b>.</span>
                    </div>
                  </div>
                </Panel>

                <Panel title="Ketentuan Kunci PSAK 68" sub="IFRS 13 · pengukuran nilai wajar">
                  <div style={{ display: 'grid', gap: 0 }}>
                    {P68_KEY.map((a, i) => (
                      <div key={i} style={{ padding: '8px 0', borderBottom: i < P68_KEY.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                        <div className="row ac jb"><span style={{ fontSize: 12, fontWeight: 600 }}>{a.k}</span><span className="mono" style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--navy)' }}>{a.v}</span></div>
                        <div className="tiny muted" style={{ lineHeight: 1.4, marginTop: 1 }}>{a.note}</div>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {/* ================= TAB · TEKNIK VALUASI ================= */}
          {tab === 'teknik' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div className="panel-h"><h3>Teknik Valuasi & Input per Pos</h3><span className="sub mono">¶61-66 · ¶93d</span></div>
                  <div style={{ display: 'grid', gap: 0 }}>
                    {p68.items.map((it, idx) => {
                      const ap = P68_APPROACH[it.approach];
                      const ApIc = I[ap.ic] || I.target;
                      return (
                        <div key={it.id} style={{ padding: '11px 14px', borderBottom: idx < p68.items.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                          <div className="row ac jb" style={{ marginBottom: 6 }}>
                            <div className="row ac gap8" style={{ minWidth: 0 }}>
                              <span style={{ color: 'var(--navy)', flex: '0 0 auto' }}><ApIc size={15} /></span>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.25 }}>{it.label}</div>
                                <div className="tiny muted">{ap.lbl} · {it.technique}</div>
                              </div>
                            </div>
                            <div className="row ac gap6" style={{ flex: '0 0 auto' }}><P68LevelChip level={it.level} /><span className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{fmt(it.fv)}</span></div>
                          </div>
                          <div className="row" style={{ flexWrap: 'wrap', gap: 6, paddingLeft: 23 }}>
                            {it.inputs.map((inp, i) => (
                              <span key={i} className="tiny" style={{ padding: '2px 8px', borderRadius: 5, border: '1px solid var(--line)', background: inp.obs ? 'var(--green-bg)' : 'var(--surface-2)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: inp.obs ? 'var(--green)' : 'var(--red)' }} />
                                {inp.k}{inp.val ? <b style={{ marginLeft: 3 }}>{inp.val}</b> : null}{inp.range && <span className="muted"> ({inp.range})</span>}
                              </span>
                            ))}
                          </div>
                          {it.hbu && <div className="tiny" style={{ paddingLeft: 23, marginTop: 6, lineHeight: 1.4, color: 'var(--ink-2)' }}><I.check size={11} style={{ color: 'var(--green)', verticalAlign: 'middle' }} /> <b>Penggunaan tertinggi & terbaik:</b> {it.hbu}</div>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>
                    Titik hijau = <b>input teramati</b> (Level 1/2); titik merah = <b>input tak teramati</b> (Level 3). Level hierarki ditentukan oleh <b>input terendah yang signifikan</b> terhadap keseluruhan pengukuran (¶73).
                  </div>
                </Panel>
              </div>

              <div className="grid" style={{ gap: 12 }}>
                <Panel title="Tiga Pendekatan Valuasi" sub="¶61-66">
                  <div style={{ display: 'grid', gap: 9 }}>
                    {['pasar', 'penghasilan', 'biaya'].map(k => {
                      const ap = P68_APPROACH[k];
                      const ApIc = I[ap.ic] || I.target;
                      const used = p68.items.filter(it => it.approach.indexOf(k) >= 0);
                      return (
                        <div key={k} className="panel" style={{ padding: '9px 11px', borderColor: 'var(--line)' }}>
                          <div className="row ac gap8" style={{ marginBottom: 4 }}>
                            <span style={{ color: 'var(--navy)' }}><ApIc size={15} /></span>
                            <span style={{ fontSize: 12.5, fontWeight: 700 }}>{ap.lbl}</span>
                            {used.length > 0 && <span className="tiny mono muted" style={{ marginLeft: 'auto' }}>{used.length} pos</span>}
                          </div>
                          <div className="tiny muted" style={{ lineHeight: 1.45 }}>{ap.desc}</div>
                        </div>
                      );
                    })}
                  </div>
                </Panel>

                <Panel title="Penggunaan Tertinggi & Terbaik" sub="¶27-30 · aset non-keuangan">
                  <div className="tiny" style={{ lineHeight: 1.5, color: 'var(--ink-2)' }}>
                    Untuk aset non-keuangan (tanah & bangunan), nilai wajar mengasumsikan penggunaan oleh pelaku pasar yang <b>memaksimalkan nilai</b> — secara fisik mungkin, legal diizinkan, & finansial layak.
                  </div>
                  <div className="panel" style={{ marginTop: 9, padding: '9px 11px', background: 'var(--green-bg)', borderColor: 'transparent' }}>
                    <div className="row gap8"><span style={{ color: 'var(--green)' }}><I.check size={15} /></span><span style={{ fontSize: 11.5, lineHeight: 1.5 }}>Penilai menyimpulkan <b>penggunaan saat ini</b> (kawasan & fasilitas industri) adalah penggunaan tertinggi & terbaik — tidak ada premis alternatif yang lebih tinggi.</span></div>
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {/* ================= TAB · LEVEL 3 ================= */}
          {tab === 'level3' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div className="panel-h"><h3>Rekonsiliasi Saldo Level 3 (Roll-Forward)</h3><span className="sub mono">¶93e · menutup ke saldo akhir Level 3</span><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
                  <div>
                    {rfRows.map((r, i) => (
                      <div key={i} className="row ac gap10" style={{ padding: '9px 14px', borderBottom: '1px solid var(--line-soft)', background: r.tot ? 'var(--surface-2)' : 'transparent' }}>
                        <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: r.tot ? 700 : 500, color: r.tot ? 'var(--navy)' : 'var(--ink)' }}>{r.t}</div>
                        {!r.tot && r.kind ? <Badge kind={r.kind === 'gray' ? 'blue' : r.kind}>{r.kind === 'amber' ? 'OCI' : r.kind === 'blue' ? 'L/R' : r.kind === 'green' ? 'masuk' : r.kind === 'red' ? 'keluar' : '—'}</Badge> : <span style={{ width: 44 }} />}
                        <div className="mono" style={{ width: 84, textAlign: 'right', fontWeight: 700, color: r.v < 0 ? 'var(--red)' : r.tot ? 'var(--navy)' : (r.v === 0 ? 'var(--ink-4)' : 'var(--green)') }}>{r.v < 0 ? '(' + fmt(Math.round(-r.v)) + ')' : (r.tot ? '' : (r.v === 0 ? '' : '+')) + fmt(Math.round(r.v))}</div>
                      </div>
                    ))}
                  </div>
                  <div className="tiny muted" style={{ padding: '10px 14px 12px', lineHeight: 1.5 }}>
                    Identitas: saldo awal {fmt(p68.l3RF.opening)} + penambahan {fmt(p68.l3RF.additions)} + untung OCI {fmt(p68.l3RF.gainsOci)} = <b>saldo akhir {fmt(p68.l3RF.closing)} jt</b>. Untung diakui di OCI berasal dari <b>surplus revaluasi bangunan</b> & perubahan NW penyertaan FVOCI — bukan Laba Rugi. Roll-forward ini wajib diungkap untuk seluruh pos Level 3 (¶93e).
                  </div>
                </Panel>

                <Panel noBody>
                  <div className="panel-h"><h3>Transfer Antar Level</h3><span className="sub mono">¶93c, e</span></div>
                  <div style={{ padding: 14 }}>
                    <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--green)', marginTop: 1 }}><I.checkCircle size={15} /></span>
                      <span style={{ fontSize: 12, lineHeight: 1.5 }}>{p68.transfers.note}</span>
                    </div>
                  </div>
                </Panel>
              </div>

              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div className="panel-h"><h3>Analisis Sensitivitas Level 3</h3><span className="sub mono">¶93h · input tak teramati</span></div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="dtbl" style={{ width: '100%' }}>
                      <thead><tr>
                        <th style={{ textAlign: 'left' }}>Input · Skenario</th>
                        <th style={{ textAlign: 'right', width: 64 }}>Naik NW</th>
                        <th style={{ textAlign: 'right', width: 64 }}>Turun NW</th>
                      </tr></thead>
                      <tbody>
                        {p68.sens.map((s, i) => (
                          <tr key={i}>
                            <td style={{ fontSize: 11.5, lineHeight: 1.3 }}>{s.label}<div className="tiny muted mono">{s.shock}</div></td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>+{fmt(s.fav)}</td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--red)' }}>({fmt(-s.unf)})</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: 'var(--surface-2)' }}>
                          <td style={{ fontWeight: 700, color: 'var(--navy)' }}>Dampak agregat</td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>+{fmt(p68.sensFav)}</td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--red)' }}>({fmt(-p68.sensUnf)})</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>
                    Perubahan input tak teramati ke skenario yang masuk akal mengubah NW Level 3 dalam rentang <b>±{rp(p68.sensFav)} jt</b>. Sensitivitas tertinggi pada <b>biaya pengganti & penyusutan bangunan</b> (DRC).
                  </div>
                </Panel>

                <Panel title="Pos Level 3" sub="wajib pengungkapan diperluas">
                  <div style={{ display: 'grid', gap: 8 }}>
                    {p68.l3.map(it => (
                      <div key={it.id} className="row ac jb" style={{ padding: '6px 0', borderBottom: '1px solid var(--line-soft)' }}>
                        <div style={{ minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.25 }}>{it.label}</div><div className="tiny muted">{it.technique}</div></div>
                        <span className="mono" style={{ fontWeight: 700, flex: '0 0 auto' }}>{fmt(it.fv)}</span>
                      </div>
                    ))}
                    <P68RowKv label="Total Level 3" v={rp(p68.l3Total) + ' jt'} strong accent={P68_LEVEL[3].color} />
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {/* ================= TAB · PENGUNGKAPAN CALK ================= */}
          {tab === 'pengungkapan' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div className="panel-h"><h3>Pengungkapan Hierarki Nilai Wajar</h3><span className="sub mono">CALK · ¶93b · pengukuran berulang</span><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="dtbl" style={{ width: '100%' }}>
                      <thead><tr>
                        <th style={{ textAlign: 'left' }}>Pos</th>
                        <th style={{ textAlign: 'right', width: 78 }}>Level 1</th>
                        <th style={{ textAlign: 'right', width: 78 }}>Level 2</th>
                        <th style={{ textAlign: 'right', width: 78 }}>Level 3</th>
                        <th style={{ textAlign: 'right', width: 84 }}>Total</th>
                      </tr></thead>
                      <tbody>
                        {p68.items.map(it => (
                          <tr key={it.id}>
                            <td style={{ fontSize: 12, fontWeight: 600 }}>{it.label}<div className="tiny muted mono">{it.std}</div></td>
                            <td className="mono" style={{ textAlign: 'right' }}>{it.level === 1 ? fmt(it.fv) : <span className="muted">—</span>}</td>
                            <td className="mono" style={{ textAlign: 'right' }}>{it.level === 2 ? fmt(it.fv) : <span className="muted">—</span>}</td>
                            <td className="mono" style={{ textAlign: 'right' }}>{it.level === 3 ? fmt(it.fv) : <span className="muted">—</span>}</td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(it.fv)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: 'var(--surface-2)' }}>
                          <td style={{ fontWeight: 700, color: 'var(--navy)' }}>TOTAL</td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(p68.byLevel[0].amt)}</td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(p68.byLevel[1].amt)}</td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: P68_LEVEL[3].color }}>{fmt(p68.byLevel[2].amt)}</td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--navy)' }}>{fmt(p68.total)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>
                    Tabel ini mengalir langsung ke <b>Catatan atas Laporan Keuangan</b> (FS Generator). Setiap perubahan pada sumber (PSAK 71 / laporan KJPP) memperbarui tabel ini otomatis — satu sumber kebenaran.
                  </div>
                </Panel>

                <Panel noBody>
                  <div className="panel-h"><h3>Daftar Pengungkapan Wajib (¶91-99)</h3><span className="sub mono">checklist kecukupan CALK</span></div>
                  <div style={{ display: 'grid', gap: 0 }}>
                    {[
                      { t: 'Tabel hierarki nilai wajar per level (¶93b)', ok: true },
                      { t: 'Teknik valuasi & input yang digunakan (¶93d)', ok: true },
                      { t: 'Rekonsiliasi saldo Level 3 / roll-forward (¶93e)', ok: true },
                      { t: 'Informasi kuantitatif input tak teramati signifikan (¶93d)', ok: true },
                      { t: 'Narasi sensitivitas Level 3 terhadap input (¶93h)', ok: true },
                      { t: 'Kebijakan & jumlah transfer antar level (¶93c)', ok: true },
                      { t: 'Penggunaan tertinggi & terbaik aset non-keuangan (¶93i)', ok: true },
                    ].map((d, i) => (
                      <div key={i} className="row ac gap10" style={{ padding: '8px 14px', borderBottom: i < 6 ? '1px solid var(--line-soft)' : 0 }}>
                        <span style={{ color: 'var(--green)', flex: '0 0 auto' }}><I.checkCircle size={15} /></span>
                        <span style={{ fontSize: 12, lineHeight: 1.4 }}>{d.t}</span>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>

              <div className="grid" style={{ gap: 12 }}>
                <Panel title="Dampak Laporan Keuangan" sub="penyajian NW">
                  <div style={{ display: 'grid', gap: 8 }}>
                    <P68RowKv label="Aset keuangan NW (Neraca)" v={rp(p68.finTotal) + ' jt'} />
                    <P68RowKv label="Tanah & bangunan revaluasi (Neraca)" v={rp(p68.revalTotal) + ' jt'} />
                    <P68RowKv label="Surplus revaluasi (OCI · ekuitas)" v={rp(p68.revalSurplusYr) + ' jt'} accent="var(--amber)" />
                    <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 8 }}>
                      <P68RowKv label="Total NW diungkap" v={rp(p68.total) + ' jt'} strong />
                    </div>
                  </div>
                  <button onClick={() => nav('fsgen', { from: 'psak68' })} className="row ac jb" style={{ marginTop: 11, padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', borderLeft: '3px solid var(--blue)', background: 'var(--surface)', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
                    <div><div style={{ fontSize: 11.5, fontWeight: 600 }}>Buka FS Generator</div><div className="tiny muted">Catatan hierarki nilai wajar di CALK</div></div>
                    <I.arrowRight size={13} style={{ color: 'var(--ink-4)' }} />
                  </button>
                </Panel>

                <Panel title="Dampak Pajak Tangguhan (OCI)" sub="PSAK 46 · surplus revaluasi">
                  <div style={{ display: 'grid', gap: 8 }}>
                    <P68RowKv label="Surplus revaluasi & FVOCI th berjalan" v={rp(p68.revalSurplusYr) + ' jt'} />
                    <P68RowKv label="Tarif PPh Badan (UU HPP)" v={(p68.rate * 100).toFixed(0) + '%'} />
                    <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 8 }}>
                      <P68RowKv label="Liabilitas pajak tangguhan (OCI)" v={rp(p68.dtlOci) + ' jt'} strong accent="var(--red)" />
                    </div>
                  </div>
                  <div className="tiny muted" style={{ marginTop: 9, lineHeight: 1.5 }}>Kenaikan NW menimbulkan <b>beda temporer kena pajak</b> → liabilitas pajak tangguhan diakui langsung di <b>OCI</b> (bukan Laba Rugi), konsisten dengan pos yang menimbulkannya.</div>
                </Panel>
              </div>
            </div>
          )}

          {/* ================= TAB · REKONSILIASI ================= */}
          {tab === 'rekonsiliasi' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div className="panel-h"><h3>Rekonsiliasi Angka — Satu Sumber Kebenaran</h3><span className="sub mono">PSAK 68 ↔ modul sumber ↔ konsumen</span></div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="dtbl" style={{ width: '100%' }}>
                      <thead><tr>
                        <th style={{ textAlign: 'left' }}>Pos</th>
                        <th style={{ textAlign: 'left', width: 170 }}>Sumber</th>
                        <th style={{ textAlign: 'right', width: 84 }}>Rp juta</th>
                        <th style={{ textAlign: 'center', width: 60 }}>Status</th>
                      </tr></thead>
                      <tbody>
                        {[
                          { pos: 'Instrumen keuangan NW (SUN+fwd+saham)', src: 'PSAK 71 · FV_PORTFOLIO', val: p68.finTotal, ok: true, hi: true },
                          { pos: 'Tanah & bangunan revaluasi', src: 'Pakar · KJPP (WP V-2)', val: p68.revalTotal, ok: true, hi: true },
                          { pos: 'Level 1 (harga kuotasi)', src: 'AMS_CANON.psak68 · byLevel', val: p68.byLevel[0].amt, ok: true },
                          { pos: 'Level 2 (input teramati)', src: 'AMS_CANON.psak68 · byLevel', val: p68.byLevel[1].amt, ok: true },
                          { pos: 'Level 3 (input tak teramati)', src: 'AMS_CANON.psak68 · byLevel', val: p68.byLevel[2].amt, ok: true },
                          { pos: 'Saldo akhir roll-forward Level 3', src: 'psak68 · l3RF.closing', val: p68.l3RF.closing, ok: Math.abs(p68.l3RF.closing - p68.l3Total) <= 1 },
                          { pos: 'Pajak tangguhan surplus (OCI)', src: '→ PSAK 46 · 22%', val: p68.dtlOci, ok: true },
                        ].map((r, i) => (
                          <tr key={i} style={{ background: r.hi ? 'var(--blue-050)' : undefined }}>
                            <td style={{ fontWeight: 600, fontSize: 12.5 }}>{r.pos}</td>
                            <td className="mono tiny" style={{ color: 'var(--ink-3)' }}>{r.src}</td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(Math.round(r.val))}</td>
                            <td style={{ textAlign: 'center' }}>{r.ok ? <span style={{ color: 'var(--green)' }}><I.checkCircle size={15} /></span> : <span style={{ color: 'var(--amber)' }}><I.alert size={15} /></span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>
                    PSAK 68 tidak menyimpan saldo terpisah: instrumen keuangan ditarik dari <b>PSAK 71</b> (seed FV_PORTFOLIO yang sama), tanah & bangunan dari laporan <b>KJPP (V-2)</b>. Mengubah klasifikasi/saldo di modul sumber otomatis memperbarui hierarki, roll-forward & pengungkapan di sini — tanpa angka ganda.
                  </div>
                </Panel>

                <Panel noBody>
                  <div className="panel-h"><h3>Konsistensi dengan PSAK 71</h3><span className="sub mono">pos FVOCI/FVTPL</span><div style={{ flex: 1 }} /><Btn sm onClick={() => nav('psak71', { from: 'psak68' })}><I.arrowRight size={12} /> Buka PSAK 71</Btn></div>
                  <div style={{ padding: 14, display: 'grid', gap: 8 }}>
                    {p68.finItems.map(it => (
                      <div key={it.id} className="row ac jb">
                        <span className="row ac gap6" style={{ fontSize: 12 }}><P68LevelChip level={it.level} /><span>{it.label}</span></span>
                        <span className="mono" style={{ fontWeight: 700 }}>{fmt(it.fv)} jt</span>
                      </div>
                    ))}
                    <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 8 }}>
                      <P68RowKv label="Total instrumen keuangan NW" v={rp(p68.finTotal) + ' jt'} strong />
                    </div>
                  </div>
                  <div className="tiny muted" style={{ padding: '0 14px 12px', lineHeight: 1.5 }}>Nilai identik dengan kolom "Tercatat" pos FVOCI/FVTPL pada tabel klasifikasi PSAK 71 — keduanya membaca <span className="mono">FV_PORTFOLIO</span>.</div>
                </Panel>
              </div>

              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div className="panel-h"><h3>Keterkaitan Kertas Kerja</h3><span className="sub mono">lineage data</span></div>
                  <div className="row ac gap6" style={{ padding: '9px 14px 4px' }}><I.arrowRight size={13} style={{ color: 'var(--blue)' }} /><span className="tiny upper" style={{ fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink-3)' }}>Hulu — sumber nilai wajar</span></div>
                  <div style={{ display: 'grid', gap: 6, padding: '2px 12px 10px' }}>
                    {P68_UPSTREAM.map(m => { const IconC = I[m.ic] || I.doc; return (
                      <button key={m.id} onClick={() => nav(m.id, { from: 'psak68' })} className="row ac gap9" style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', borderLeft: '3px solid var(--blue)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                        <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><IconC size={15} /></span>
                        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600 }}>{m.lbl}</div><div className="tiny muted" style={{ lineHeight: 1.35 }}>{m.rel}</div></div>
                        <I.arrowRight size={13} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                      </button>
                    ); })}
                  </div>
                  <div className="row ac gap6" style={{ padding: '4px 14px 4px', borderTop: '1px solid var(--line-soft)' }}><I.arrowRight size={13} style={{ color: 'var(--green)' }} /><span className="tiny upper" style={{ fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink-3)' }}>Hilir — pengguna angka</span></div>
                  <div style={{ display: 'grid', gap: 6, padding: '2px 12px 12px' }}>
                    {P68_DOWNSTREAM.map(m => { const IconC = I[m.ic] || I.doc; return (
                      <button key={m.id} onClick={() => nav(m.id, { from: 'psak68' })} className="row ac gap9" style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', borderLeft: '3px solid var(--green)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                        <span style={{ color: 'var(--green)', flex: '0 0 auto' }}><IconC size={15} /></span>
                        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600 }}>{m.lbl}</div><div className="tiny muted" style={{ lineHeight: 1.35 }}>{m.rel}</div></div>
                        <I.arrowRight size={13} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                      </button>
                    ); })}
                  </div>
                  <button onClick={() => nav('dataflow', { from: 'psak68' })} className="row ac gap8" style={{ padding: '9px 14px', borderTop: '1px solid var(--line-soft)', background: 'var(--surface-2)', cursor: 'pointer', width: '100%', textAlign: 'left', border: 'none' }}>
                    <I.link2 size={14} style={{ color: 'var(--navy)' }} /><span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>Lihat Rekonsiliasi Angka lintas-modul</span><I.arrowRight size={13} style={{ color: 'var(--ink-4)' }} />
                  </button>
                </Panel>
              </div>
            </div>
          )}

          {/* ================= TAB · AUDIT SA 540/500 ================= */}
          {tab === 'audit' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
              <Panel noBody>
                <div className="panel-h"><h3>Prosedur Audit — Estimasi Nilai Wajar (SA 540 · SA 500)</h3><div style={{ flex: 1 }} /><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)' }}>{doneCount}/{P68_PROC.length}</span></div>
                <div className="row gap8" style={{ padding: '10px 14px', alignItems: 'flex-start', background: 'var(--blue-050)' }}>
                  <span style={{ color: 'var(--blue)', marginTop: 1 }}><I.target size={15} /></span>
                  <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>Pengukuran nilai wajar — khususnya <b>Level 3</b> — adalah estimasi dengan ketidakpastian tinggi. Prosedur menguji penetapan level, teknik valuasi, input tak teramati, serta kompetensi & objektivitas penilai (KJPP V-2 & pakar derivatif V-3).</div>
                </div>
                <div>
                  {P68_PROC.map((p, i) => {
                    const key = p.ref + i;
                    const isOn = !!done[key];
                    return (
                      <label key={key} className="row gap10" style={{ padding: '9px 14px', cursor: 'pointer', alignItems: 'flex-start', borderBottom: i < P68_PROC.length - 1 ? '1px solid var(--line-soft)' : 0 }} onClick={() => toggle(key)}>
                        <span style={{ flex: '0 0 16px', width: 16, height: 16, borderRadius: 4, marginTop: 1, border: '1.5px solid ' + (isOn ? 'var(--green)' : 'var(--line-strong)'), background: isOn ? 'var(--green)' : '#fff', display: 'grid', placeItems: 'center' }}>{isOn && <I.check size={11} style={{ color: '#fff' }} />}</span>
                        <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)', width: 90, flex: '0 0 90px', marginTop: 1 }}>{p.ref}</span>
                        <span style={{ fontSize: 12, lineHeight: 1.4, color: isOn ? 'var(--ink-3)' : 'var(--ink)', textDecoration: isOn ? 'line-through' : 'none' }}>{p.t}</span>
                      </label>
                    );
                  })}
                </div>
              </Panel>

              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div style={{ background: 'linear-gradient(120deg,#013a52,#005085)', color: '#fff', padding: '14px 16px' }}>
                    <div className="tiny upper" style={{ color: '#bcd6e4', letterSpacing: '.05em', marginBottom: 8 }}>Kesimpulan Audit — Pengukuran Nilai Wajar</div>
                    <div className="row ac gap12">
                      <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1, fontFamily: 'JetBrains Mono, monospace' }}>{score}<span style={{ fontSize: 18 }}>%</span></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,.18)', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: score + '%', background: score === 100 ? '#4ade80' : '#7cc6ff', borderRadius: 4, transition: '.3s' }} /></div>
                        <div className="tiny" style={{ color: '#bcd6e4', marginTop: 6 }}>{doneCount}/{P68_PROC.length} prosedur audit selesai</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: 14 }}>
                    <div className="panel" style={{ padding: '10px 12px', background: 'var(--green-bg)', borderColor: 'transparent' }}>
                      <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                        <span style={{ color: 'var(--green)', marginTop: 1 }}><I.check size={15} /></span>
                        <div style={{ fontSize: 12, lineHeight: 1.5 }}>Penetapan level, teknik & input dinilai <b>wajar</b>. Re-perform independen atas DCF saham privat & DRC bangunan berada dalam rentang dapat diterima; tidak ada usulan AJE atas pengukuran NW.</div>
                      </div>
                    </div>
                    <div className="row gap8" style={{ marginTop: 12 }}>
                      <Btn sm variant="primary" style={{ flex: 1 }} onClick={() => nav('expert', { from: 'psak68' })}><I.flask size={14} /> Evaluasi Pakar</Btn>
                      <Btn sm style={{ flex: 1 }} onClick={() => nav('sad', { from: 'psak68' })}><I.scale size={14} /> SAD Ledger</Btn>
                    </div>
                  </div>
                </Panel>

                <Panel title="Pekerjaan Penilai (SA 500)" sub="WP V-2 · V-3">
                  <div style={{ display: 'grid', gap: 9 }}>
                    {[
                      { wp: 'V-2', t: 'KJPP Mitra — tanah & bangunan', s: 'Kompetensi, objektivitas & kewajaran metode (SPI/IVS) memadai.' },
                      { wp: 'V-3', t: 'Pakar auditor — forward valas', s: 'Re-valuasi kurva forward, OIS & CVA/DVA (IFRS 13 ¶42) memadai.' },
                    ].map((e, i) => (
                      <button key={i} onClick={() => nav('expert', { from: 'psak68' })} className="row ac gap9" style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', borderLeft: '3px solid var(--amber)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                        <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)', flex: '0 0 auto' }}>{e.wp}</span>
                        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 11.5, fontWeight: 600 }}>{e.t}</div><div className="tiny muted" style={{ lineHeight: 1.35 }}>{e.s}</div></div>
                        <I.arrowRight size={13} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                      </button>
                    ))}
                  </div>
                </Panel>
              </div>
            </div>
          )}

          <div className="tiny muted" style={{ padding: '0 2px 4px', lineHeight: 1.5 }}>
            Kertas kerja ini mengukur & mengaudit nilai wajar <b>{client.name}</b> ({eng.id} · {eng.fy}) terhadap PSAK 68 — dari hierarki & teknik valuasi, pengungkapan Level 3 (roll-forward & sensitivitas), hingga kesimpulan audit estimasi (SA 540) & evaluasi pakar (SA 500). Seluruh angka ditarik dari satu sumber kebenaran bersama PSAK 71 & laporan KJPP.
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { PSAK68View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { PSAK68View };
