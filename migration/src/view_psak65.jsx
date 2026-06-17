/* [codemod] ESM imports */
import React from 'react';
import { useAudit, useFirm, useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Donut, Panel } from './ui.jsx';

/* ============================================================
   NeoSuite AMS — PSAK 65 · Laporan Keuangan Konsolidasian (IFRS 10)
   ------------------------------------------------------------
   Kertas kerja penyusunan & audit konsolidasi yang DITARIK PENUH
   dari satu sumber kebenaran:
     · Working Trial Balance (useAudit().wtb) — entitas INDUK
       (PT Sentosa Makmur Tbk) ditarik live; setiap AJE mengalir
       ke kertas kerja konsolidasi, NCI & LK konsolidasian.
     · AMS_CANON.psak65(wtb) — mesin konsolidasi yang SAMA dipakai
       modul Group Audit (SA 600) untuk struktur grup & eliminasi.
     · Goodwill Σ per-anak Rp 6.800 jt = AMS_CANON.GOODWILL — angka
       yang SAMA diuji penurunan nilai UPK tahunan oleh PSAK 48.
   Cakupan:
     • Penilaian pengendalian — tiga elemen IFRS 10 (¶7) per investee
       + batas konsolidasi (asosiasi PSAK 15 / ventura PSAK 66)
     • Struktur grup & kepemilikan (induk · anak · NCI)
     • Kertas kerja konsolidasi (Induk + Σ Anak − Eliminasi)
     • Eliminasi investasi (PSAK 22 ¶32), antar-perusahaan & NCI
     • Goodwill per-akuisisi + translasi entitas asing (PSAK 10)
     • Rekonsiliasi & keterkaitan lintas-modul (satu sumber angka)
     • Kesimpulan audit grup (SA 600 Revisi)
   ============================================================ */
const { useState: useStateP65, useMemo: useMemoP65 } = React;

/* ---- tiga elemen pengendalian (IFRS 10 / PSAK 65 ¶7) ---- */
const P65_ELEMENTS = [
  { key: 'power',   lbl: 'Kuasa (power)',            sub: '¶10 — hak kini atas aktivitas relevan' },
  { key: 'returns', lbl: 'Imbal hasil variabel',     sub: '¶15 — eksposur / hak atas imbal hasil' },
  { key: 'link',    lbl: 'Kemampuan memengaruhi',    sub: '¶17 — kuasa memengaruhi imbal hasil' },
];

/* ---- ketentuan kunci PSAK 65 ---- */
const P65_KEY = [
  { k: 'Definisi pengendalian', v: '¶6 — 3 elemen', note: 'Investor mengendalikan investee bila terekspos imbal hasil variabel DAN memiliki kuasa memengaruhinya.' },
  { k: 'Konsolidasi penuh', v: '¶B86 — line-by-line', note: 'Aset, liabilitas, ekuitas, pendapatan & beban anak digabung 100% tanpa memandang persentase kepemilikan.' },
  { k: 'Kepentingan nonpengendali', v: '¶22 · ¶B94', note: 'NCI disajikan terpisah dalam ekuitas; laba & OCI diatribusikan ke pemilik induk dan NCI.' },
  { k: 'Eliminasi intra-kelompok', v: '¶B86(c)', note: 'Saldo, transaksi, penghasilan & beban antar-perusahaan dieliminasi penuh, termasuk laba belum terealisasi.' },
];

/* ---- prosedur audit konsolidasi (SA 600 Revisi · PSAK 65) ---- */
const P65_PROC = [
  { ref: 'SA 600 ¶17', t: 'Pahami grup, komponennya, lingkungan & proses konsolidasi entitas induk' },
  { ref: 'PSAK 65 ¶7', t: 'Evaluasi kesimpulan manajemen atas pengendalian — uji tiga elemen tiap investee (kuasa, imbal hasil, keterkaitan)' },
  { ref: 'PSAK 65 ¶19', t: 'Uji penetapan & pengukuran kepentingan nonpengendali (NCI) pada tanggal akuisisi & akhir periode' },
  { ref: 'PSAK 22 ¶32', t: 'Re-perform eliminasi investasi vs ekuitas anak; verifikasi goodwill (alokasi PPA)' },
  { ref: 'SA 600 ¶26', t: 'Tentukan lingkup keterlibatan auditor komponen berbasis signifikansi & risiko' },
  { ref: 'PSAK 65 ¶B86', t: 'Uji kelengkapan & akurasi eliminasi saldo & transaksi antar-perusahaan (piutang/utang, penjualan)' },
  { ref: 'PSAK 65 ¶B86', t: 'Uji eliminasi laba belum terealisasi dalam persediaan & dividen antar-perusahaan' },
  { ref: 'PSAK 10 ¶39', t: 'Uji translasi entitas asing — kurs penutup/rata-rata & selisih kurs ke OCI (CTA)' },
  { ref: 'PSAK 65 ¶19', t: 'Evaluasi keseragaman kebijakan akuntansi & tanggal pelaporan komponen' },
  { ref: 'SA 600 ¶42', t: 'Agregasi temuan auditor komponen ke materialitas grup & dokumentasikan kesimpulan (WP G-1)' },
];

/* ---- keterkaitan kertas kerja (lineage dua arah) ---- */
const P65_UPSTREAM = [
  { id: 'wtb',        ic: 'table',    lbl: 'Working Trial Balance',  rel: 'Entitas induk (PT Sentosa Makmur) — sumber saldo standalone' },
  { id: 'groupaudit', ic: 'building', lbl: 'Group Audit (SA 600)',   rel: 'Struktur komponen, lingkup & temuan auditor komponen' },
  { id: 'related',    ic: 'users',    lbl: 'Pihak Berelasi (PSAK 7)', rel: 'Transaksi & saldo antar-perusahaan untuk eliminasi' },
  { id: 'confirm',    ic: 'mail',     lbl: 'Konfirmasi (SA 505)',    rel: 'Rekonsiliasi saldo antar-perusahaan (ELM-03)' },
];
const P65_DOWNSTREAM = [
  { id: 'psak48',  ic: 'scale',   lbl: 'PSAK 48 · Penurunan Nilai', rel: 'Goodwill Rp 6.800 jt → uji penurunan nilai UPK tahunan' },
  { id: 'psak46',  ic: 'receipt', lbl: 'PSAK 46 · Pajak Tangguhan', rel: 'Konsekuensi pajak PPA & laba antar-perusahaan' },
  { id: 'fsgen',   ic: 'report',  lbl: 'FS Generator',              rel: 'LPK & laba rugi konsolidasian → penyajian LK' },
  { id: 'sa701',   ic: 'star',    lbl: 'SA 701 · KAM',              rel: 'Goodwill & konsolidasi sebagai Hal Audit Utama' },
];

const SCOPE_KIND_P65 = { Full: 'blue', Specific: 'purple', Analytical: 'gray' };
const ELIM_KIND_P65 = { Diverifikasi: 'green', Selisih: 'red', Review: 'amber' };

function P65Card({ value, label, sub, accent }) {
  return (
    <div className="panel" style={{ padding: '12px 14px', display: 'grid', gap: 2 }}>
      <div className="mono" style={{ fontSize: 21, fontWeight: 700, color: accent || 'var(--navy)', lineHeight: 1.05 }}>{value}</div>
      <div className="tiny muted" style={{ fontWeight: 600 }}>{label}</div>
      {sub && <div className="tiny" style={{ color: 'var(--ink-4)' }}>{sub}</div>}
    </div>
  );
}

function P65RowKv({ label, v, strong, accent }) {
  return (
    <div className="row jb ac">
      <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{label}</span>
      <span className="mono" style={{ fontWeight: strong ? 700 : 600, fontSize: strong ? 14 : 12.5, color: accent || (strong ? 'var(--navy)' : 'inherit') }}>{v}</span>
    </div>
  );
}

function PSAK65View() {
  const { fmt } = window.AMS;
  const firm = useFirm();
  const audit = useAudit();
  const nav = useNav();
  const loader = window.loadLS || ((k, d) => d);

  /* ——— SUMBER KEBENARAN ——— */
  const wtb = (audit && audit.wtb && audit.wtb.length) ? audit.wtb : ((window.AMS && window.AMS.WTB) || []);
  const canon = window.AMS_CANON;
  const p65 = useMemoP65(() => canon.psak65(wtb), [wtb]);

  const [tab, setTab] = useStateP65(() => loader('ams.psak65.tab', 'kendali'));
  const [done, setDone] = useStateP65(() => loader('ams.psak65.done', {}));
  const [elimDone, setElimDone] = useStateP65(() => loader('ams.psak65.elim', {}));

  React.useEffect(() => { try { localStorage.setItem('ams.psak65.tab', JSON.stringify(tab)); } catch (e) {} }, [tab]);
  React.useEffect(() => { try { localStorage.setItem('ams.psak65.done', JSON.stringify(done)); } catch (e) {} }, [done]);
  React.useEffect(() => { try { localStorage.setItem('ams.psak65.elim', JSON.stringify(elimDone)); } catch (e) {} }, [elimDone]);

  const rp = (x) => 'Rp ' + fmt(Math.round(x));
  const sgn = (x) => (x < 0 ? '(' + fmt(Math.round(-x)) + ')' : fmt(Math.round(x)));
  const toggle = (id) => setDone(m => ({ ...m, [id]: !m[id] }));
  const doneCount = P65_PROC.filter((p, i) => done[p.ref + i]).length;
  const score = Math.round(doneCount / P65_PROC.length * 100);

  const client = firm.activeClient || { name: 'PT Sentosa Makmur Tbk' };
  const eng = firm.activeEngagement || { id: 'ENG-2025-014', fy: 'FY2025' };

  const ctrlById = Object.fromEntries(p65.control.map(c => [c.id, c]));
  const allEntities = [{ id: 'CP-01', name: client.name, role: 'Induk / Holding', own: 100 }, ...p65.subs];

  const TABS = [
    { id: 'kendali', label: 'Kendali (IFRS 10)' },
    { id: 'struktur', label: 'Struktur Grup' },
    { id: 'kertaskerja', label: 'Kertas Kerja Konsolidasi' },
    { id: 'eliminasi', label: 'Eliminasi & NCI' },
    { id: 'goodwill', label: 'Goodwill & Translasi' },
    { id: 'rekonsiliasi', label: 'Rekonsiliasi' },
    { id: 'audit', label: 'Audit · SA 600' },
  ];

  /* attribution donut */
  const attrSegs = [
    { label: 'Pemilik induk', value: p65.ownersProfit, color: 'var(--navy)' },
    { label: 'NCI', value: p65.nciProfit, color: 'var(--amber)' },
  ];

  return (
    <>
      <SubBar moduleId="psak65" right={
        <div className="row gap8 ac">
          <Badge kind="blue">PSAK 65 · IFRS 10</Badge>
          <Btn sm onClick={() => nav('psak22', { from: 'psak65' })}><I.columns size={13} /> Kombinasi Bisnis (PSAK 22)</Btn>
          <Btn sm onClick={() => nav('groupaudit', { from: 'psak65' })}><I.building size={13} /> Group Audit (SA 600)</Btn>
          <Btn sm onClick={() => nav('psak48', { from: 'psak65' })}><I.scale size={13} /> Uji Goodwill (PSAK 48)</Btn>
          <Btn sm onClick={() => nav('fsgen', { from: 'psak65' })}><I.report size={13} /> LK Konsolidasian</Btn>
          <Btn sm><I.download size={13} /> Kertas Kerja G-1</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>

          {/* summary cards — selalu tampil */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            <P65Card value={p65.counts.consolidated + ' anak'} label="Entitas dikonsolidasi" sub={p65.counts.associates + ' asosiasi/ventura (metode ekuitas)'} accent="var(--navy)" />
            <P65Card value={rp(p65.totals.aset.konsol) + ' jt'} label="Total aset konsolidasian" sub={'LPK menutup · selisih Rp ' + fmt(p65.balCheck) + ' jt'} accent="var(--blue)" />
            <P65Card value={rp(p65.consolNpat) + ' jt'} label="Laba tahun berjalan konsolidasi" sub={'Eliminasi laba Rp ' + fmt(p65.elimLaba) + ' jt'} accent="var(--green)" />
            <P65Card value={rp(p65.nciCloseTotal) + ' jt'} label="Kepentingan nonpengendali" sub={'Laba ke NCI Rp ' + fmt(p65.nciProfit) + ' jt'} accent="var(--amber)" />
            <P65Card value={rp(p65.goodwillTotal) + ' jt'} label="Goodwill konsolidasi" sub={p65.goodwillTotal === p65.goodwillTie ? 'tie ke PSAK 48 ✓' : 'cek PSAK 48'} accent={p65.goodwillTotal === p65.goodwillTie ? 'var(--navy)' : 'var(--red)'} />
          </div>

          {/* tabs */}
          <div className="row ac jb" style={{ flexWrap: 'wrap', gap: 8 }}>
            <div className="seg" style={{ width: 'fit-content', flexWrap: 'wrap' }}>
              {TABS.map(t => <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>)}
            </div>
            <span className="tiny muted">Satu sumber: <b>WTB</b> (induk) → <span className="mono">AMS_CANON.psak65(wtb)</span></span>
          </div>

          {/* ================= TAB · KENDALI (IFRS 10) ================= */}
          {tab === 'kendali' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div className="panel-h"><h3>Penilaian Pengendalian — Tiga Elemen (¶7)</h3><span className="sub mono">kuasa × imbal hasil × keterkaitan</span></div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="dtbl" style={{ width: '100%' }}>
                      <thead><tr>
                        <th style={{ textAlign: 'left' }}>Investee</th>
                        <th style={{ textAlign: 'center', width: 58 }}>Suara</th>
                        <th style={{ textAlign: 'center', width: 64 }}>Kuasa</th>
                        <th style={{ textAlign: 'center', width: 76 }}>Imbal Hasil</th>
                        <th style={{ textAlign: 'center', width: 72 }}>Keterkaitan</th>
                        <th style={{ textAlign: 'left', width: 150 }}>Kesimpulan</th>
                      </tr></thead>
                      <tbody>
                        {p65.control.map(c => {
                          const isSub = c.id.startsWith('CP');
                          const ent = isSub ? p65.subs.find(s => s.id === c.id) : p65.associates.find(a => a.id === c.id);
                          const nm = ent ? ent.name : c.id;
                          const dot = (ok) => ok ? <span style={{ color: 'var(--green)' }}><I.check size={14} /></span> : <span style={{ color: 'var(--ink-4)' }}>—</span>;
                          return (
                            <tr key={c.id} style={{ background: isSub ? undefined : 'var(--surface-2)' }}>
                              <td>
                                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{nm}</div>
                                <div className="tiny muted" style={{ lineHeight: 1.4 }}>{c.note}</div>
                              </td>
                              <td className="mono" style={{ textAlign: 'center', fontWeight: 700 }}>{c.voting}%</td>
                              <td style={{ textAlign: 'center' }}>{dot(c.power)}</td>
                              <td style={{ textAlign: 'center' }}>{dot(c.returns)}</td>
                              <td style={{ textAlign: 'center' }}>{dot(c.link)}</td>
                              <td><Badge kind={isSub ? 'green' : 'gray'}>{c.concl}</Badge></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>
                    Pengendalian ada hanya bila <b>ketiga elemen</b> terpenuhi. Empat entitas anak (kuasa &gt; 50% + eksposur imbal hasil) <b>dikonsolidasi penuh</b>; dua investee dengan pengaruh signifikan / pengendalian bersama berada di <b>luar batas konsolidasi</b> dan dicatat dengan metode ekuitas.
                  </div>
                </Panel>

                <Panel noBody>
                  <div className="panel-h"><h3>Batas Konsolidasi — Investee Metode Ekuitas</h3><span className="sub mono">PSAK 15 · PSAK 66</span><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
                  <table className="dtbl" style={{ width: '100%' }}>
                    <thead><tr>
                      <th style={{ textAlign: 'left' }}>Investee</th>
                      <th style={{ textAlign: 'center', width: 70 }}>Kepemilikan</th>
                      <th style={{ textAlign: 'left', width: 210 }}>Perlakuan</th>
                      <th style={{ textAlign: 'right', width: 96 }}>Nilai Tercatat</th>
                    </tr></thead>
                    <tbody>
                      {p65.associates.map(a => (
                        <tr key={a.id}>
                          <td>
                            <div style={{ fontSize: 12.5, fontWeight: 600 }}>{a.name}</div>
                            <div className="tiny muted" style={{ lineHeight: 1.4 }}>{a.note}</div>
                          </td>
                          <td className="mono" style={{ textAlign: 'center', fontWeight: 700 }}>{a.own}%</td>
                          <td><span className="mono tiny" style={{ fontWeight: 600 }}>{a.treat}</span></td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(a.carry)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>
                    Investasi pada asosiasi (pengaruh signifikan 20–50%) dan ventura bersama (pengendalian bersama kontraktual) <b>tidak dikonsolidasi</b> — disajikan satu baris dengan metode ekuitas, bukan digabung line-by-line.
                  </div>
                </Panel>
              </div>

              <div className="grid" style={{ gap: 12 }}>
                <Panel title="Tiga Elemen Pengendalian" sub="IFRS 10 ¶7 · pohon keputusan">
                  <div style={{ display: 'grid', gap: 9 }}>
                    {P65_ELEMENTS.map((e, i) => (
                      <div key={e.key} className="row gap8" style={{ alignItems: 'flex-start' }}>
                        <span style={{ width: 18, height: 18, borderRadius: 5, background: 'var(--navy)', color: '#fff', display: 'grid', placeItems: 'center', flex: '0 0 18px', fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.35 }}>{e.lbl}</div>
                          <div className="tiny muted" style={{ lineHeight: 1.4 }}>{e.sub}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="panel" style={{ marginTop: 11, padding: '9px 11px', background: 'var(--blue-050)', borderColor: 'transparent' }}>
                    <div className="tiny" style={{ lineHeight: 1.5 }}>Pertimbangkan pula <b>hak suara potensial</b>, pengaturan kontraktual, dan pengendalian <b>de facto</b> ketika kepemilikan suara di bawah mayoritas mutlak.</div>
                  </div>
                </Panel>

                <Panel title="Ketentuan Kunci PSAK 65" sub="IFRS 10 · konsolidasi">
                  <div style={{ display: 'grid', gap: 0 }}>
                    {P65_KEY.map((a, i) => (
                      <div key={i} style={{ padding: '8px 0', borderBottom: i < P65_KEY.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                        <div className="row ac jb"><span style={{ fontSize: 12, fontWeight: 600 }}>{a.k}</span><span className="mono" style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--navy)' }}>{a.v}</span></div>
                        <div className="tiny muted" style={{ lineHeight: 1.4, marginTop: 1 }}>{a.note}</div>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {/* ================= TAB · STRUKTUR GRUP ================= */}
          {tab === 'struktur' && (
            <div className="grid" style={{ gap: 12 }}>
              <Panel noBody>
                <div className="panel-h"><h3>Struktur Grup — PT Sentosa Group (konsolidasian)</h3><span className="sub mono">induk · {p65.subs.length} anak · {p65.associates.length} asosiasi</span></div>
                <div style={{ padding: 14 }}>
                  {/* induk */}
                  <div className="panel" style={{ padding: '12px 14px', background: 'var(--navy)', color: '#fff', borderColor: 'transparent', marginBottom: 10 }}>
                    <div className="row ac jb">
                      <div className="row ac gap10">
                        <span style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,.16)', display: 'grid', placeItems: 'center' }}><I.building size={17} /></span>
                        <div><div style={{ fontWeight: 700, fontSize: 13.5 }}>{client.name}</div><div className="tiny" style={{ color: '#bcd6e4' }}>Entitas Induk · ditarik dari Working Trial Balance</div></div>
                      </div>
                      <div className="mono" style={{ textAlign: 'right' }}><div style={{ fontWeight: 800, fontSize: 15 }}>{rp(p65.npatParent)} jt</div><div className="tiny" style={{ color: '#bcd6e4' }}>laba induk standalone</div></div>
                    </div>
                  </div>
                  {/* anak grid */}
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                    {p65.subs.map(s => (
                      <div key={s.id} className="panel" style={{ padding: '11px 12px', display: 'grid', gap: 7 }}>
                        <div className="row ac jb">
                          <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{s.id}</span>
                          <Badge kind={SCOPE_KIND_P65[s.scope]}>{s.scope}</Badge>
                        </div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.25 }}>{s.name}</div>
                        <div className="tiny muted">{s.role} · {s.country}</div>
                        <div style={{ display: 'grid', gap: 4, marginTop: 2 }}>
                          <div className="row jb ac"><span className="tiny muted">Kepemilikan</span><span className="mono tiny" style={{ fontWeight: 700 }}>{s.own}%</span></div>
                          <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-3)', overflow: 'hidden' }}>
                            <span style={{ display: 'block', height: '100%', width: s.own + '%', background: 'var(--navy)' }} />
                            <span style={{ display: 'block', marginTop: -6, height: '100%', width: (100 - s.own) + '%', marginLeft: s.own + '%', background: 'var(--amber)' }} />
                          </div>
                          <div className="row jb ac"><span className="tiny muted">NCI {(100 - s.own)}%</span><span className="mono tiny" style={{ fontWeight: 600, color: 'var(--amber)' }}>{fmt(s.nciClose)} jt</span></div>
                          <div className="row jb ac"><span className="tiny muted">Laba (NPAT)</span><span className="mono tiny" style={{ fontWeight: 700 }}>{fmt(s.npat)} jt</span></div>
                          <div className="row jb ac"><span className="tiny muted">{s.ccy === 'IDR' ? 'Mata uang' : 'Translasi'}</span><span className="mono tiny" style={{ fontWeight: 600, color: s.ccy === 'IDR' ? 'var(--ink-3)' : 'var(--blue)' }}>{s.ccy}{s.ccy !== 'IDR' ? ' · PSAK 10' : ''}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="row ac gap8" style={{ padding: '10px 14px', borderTop: '1px solid var(--line-soft)', background: 'var(--surface-2)' }}>
                  <I.building size={14} style={{ color: 'var(--navy)' }} />
                  <span className="tiny" style={{ flex: 1, lineHeight: 1.5 }}>Struktur, lingkup berbasis risiko & evaluasi auditor komponen dikelola di modul <b>Group Audit (SA 600)</b> — keduanya menarik komponen & eliminasi dari sumber yang sama.</span>
                  <Btn sm onClick={() => nav('groupaudit', { from: 'psak65' })}><I.arrowRight size={12} /> Group Audit</Btn>
                </div>
              </Panel>

              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
                <Panel title="Cakupan Konsolidasi" sub="kontribusi pendapatan & aset">
                  <table className="dtbl" style={{ width: '100%' }}>
                    <thead><tr><th style={{ textAlign: 'left' }}>Entitas</th><th style={{ textAlign: 'right', width: 90 }}>Pendapatan</th><th style={{ textAlign: 'right', width: 80 }}>NPAT</th></tr></thead>
                    <tbody>
                      <tr><td style={{ fontWeight: 600, fontSize: 12 }}>{client.name} <span className="tiny muted">(induk)</span></td><td className="mono" style={{ textAlign: 'right' }}>{fmt(p65.par && Math.round((-window.AMS.WTB.find(r=>r.code==='4-1100').adj)/1e6))}</td><td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(p65.npatParent)}</td></tr>
                      {p65.subs.map(s => (
                        <tr key={s.id}><td style={{ fontSize: 12 }}>{s.name}</td><td className="mono" style={{ textAlign: 'right' }}>{fmt(s.rev)}</td><td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(s.npat)}</td></tr>
                      ))}
                    </tbody>
                    <tfoot><tr style={{ background: 'var(--surface-2)' }}><td style={{ fontWeight: 700 }}>Subtotal entitas</td><td></td><td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--navy)' }}>{fmt(p65.indukSeparate + p65.subsNpat)}</td></tr></tfoot>
                  </table>
                </Panel>

                <Panel title="Atribusi Laba Konsolidasi" sub="¶B94 · pemilik induk vs NCI">
                  <div className="row gap12 ac">
                    <Donut segments={attrSegs} size={104} thickness={15}
                      center={<><div className="mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{fmt(p65.consolNpat)}</div><div className="tiny muted">jt</div></>} />
                    <div style={{ flex: 1, display: 'grid', gap: 7 }}>
                      <P65RowKv label="Laba tahun berjalan konsolidasi" v={fmt(p65.consolNpat) + ' jt'} strong />
                      <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 7, display: 'grid', gap: 5 }}>
                        <div className="row jb ac"><span className="row ac gap6"><span style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--navy)' }} /><span style={{ fontSize: 12 }}>Pemilik entitas induk</span></span><span className="mono" style={{ fontWeight: 700 }}>{fmt(p65.ownersProfit)} jt</span></div>
                        <div className="row jb ac"><span className="row ac gap6"><span style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--amber)' }} /><span style={{ fontSize: 12 }}>Kepentingan nonpengendali</span></span><span className="mono" style={{ fontWeight: 700, color: 'var(--amber)' }}>{fmt(p65.nciProfit)} jt</span></div>
                      </div>
                    </div>
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {/* ================= TAB · KERTAS KERJA KONSOLIDASI ================= */}
          {tab === 'kertaskerja' && (
            <div className="grid" style={{ gap: 12 }}>
              <Panel noBody>
                <div className="panel-h"><h3>Kertas Kerja Konsolidasi — Laporan Posisi Keuangan</h3><span className="sub mono">Induk + Σ Anak − Eliminasi = Konsolidasian</span><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="dtbl" style={{ width: '100%' }}>
                    <thead><tr>
                      <th style={{ textAlign: 'left' }}>Pos</th>
                      <th style={{ textAlign: 'right', width: 96 }}>Induk (WTB)</th>
                      <th style={{ textAlign: 'right', width: 90 }}>Σ Anak</th>
                      <th style={{ textAlign: 'right', width: 96 }}>Eliminasi</th>
                      <th style={{ textAlign: 'right', width: 104 }}>Konsolidasian</th>
                    </tr></thead>
                    <tbody>
                      {['Aset', 'Liabilitas', 'Ekuitas'].map(sec => (
                        <React.Fragment key={sec}>
                          <tr style={{ background: 'var(--surface-2)' }}><td colSpan={5} className="tiny upper" style={{ fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink-3)' }}>{sec}</td></tr>
                          {p65.ws.filter(r => r.sec === sec).map(r => (
                            <tr key={r.cap} style={{ background: r.gw ? 'var(--blue-050)' : r.nci ? 'var(--amber-bg)' : undefined }}>
                              <td>
                                <div className="row ac gap6" style={{ fontSize: 12.5, fontWeight: r.gw || r.nci ? 700 : 500 }}>
                                  <span>{r.label}</span>
                                  {r.seed && <span className="mono tiny" style={{ color: 'var(--ink-4)' }}>seed</span>}
                                  {r.gw && <Badge kind="blue">PSAK 22</Badge>}
                                </div>
                              </td>
                              <td className="mono" style={{ textAlign: 'right' }}>{r.induk ? sgn(r.induk) : '—'}</td>
                              <td className="mono" style={{ textAlign: 'right' }}>{r.anak ? sgn(r.anak) : '—'}</td>
                              <td className="mono" style={{ textAlign: 'right', color: r.elim ? 'var(--red)' : 'var(--ink-4)' }}>{r.elim ? sgn(r.elim) : '—'}</td>
                              <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: r.gw ? 'var(--blue)' : r.nci ? 'var(--amber)' : 'var(--navy)' }}>{sgn(r.konsol)}</td>
                            </tr>
                          ))}
                          <tr style={{ borderTop: '1.5px solid var(--line-strong)' }}>
                            <td style={{ fontWeight: 700, color: 'var(--navy)' }}>Total {sec}</td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{sgn(p65.totals[sec === 'Aset' ? 'aset' : sec === 'Liabilitas' ? 'liab' : 'ekuitas'].induk)}</td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{sgn(p65.totals[sec === 'Aset' ? 'aset' : sec === 'Liabilitas' ? 'liab' : 'ekuitas'].anak)}</td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--red)' }}>{sgn(p65.totals[sec === 'Aset' ? 'aset' : sec === 'Liabilitas' ? 'liab' : 'ekuitas'].elim)}</td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--navy)' }}>{sgn(p65.totals[sec === 'Aset' ? 'aset' : sec === 'Liabilitas' ? 'liab' : 'ekuitas'].konsol)}</td>
                          </tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="row ac gap8" style={{ padding: '10px 14px', borderTop: '1px solid var(--line-soft)', background: p65.balCheck === 0 ? 'var(--green-bg)' : 'var(--red-bg)' }}>
                  <span style={{ color: p65.balCheck === 0 ? 'var(--green)' : 'var(--red)' }}>{p65.balCheck === 0 ? <I.checkCircle size={15} /> : <I.alert size={15} />}</span>
                  <span className="tiny" style={{ flex: 1, lineHeight: 1.5 }}>
                    Uji keseimbangan: <b>Aset konsolidasian Rp {fmt(p65.totals.aset.konsol)} jt</b> = Liabilitas Rp {fmt(p65.totals.liab.konsol)} jt + Ekuitas Rp {fmt(p65.totals.ekuitas.konsol)} jt. Selisih <b className="mono">Rp {fmt(p65.balCheck)} jt</b> — kertas kerja menutup.
                  </span>
                </div>
              </Panel>
              <div className="tiny muted" style={{ padding: '0 2px', lineHeight: 1.5 }}>
                Kolom <b>Induk</b> ditarik live dari WTB (setiap AJE mengalir ke sini). Baris ber-tag <span className="mono">seed</span> — investasi pada anak & pendanaannya — berasal dari buku investasi induk di luar WTB operasional; tiap jurnal eliminasi berimbang sehingga konsolidasian otomatis menutup.
              </div>
            </div>
          )}

          {/* ================= TAB · ELIMINASI & NCI ================= */}
          {tab === 'eliminasi' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div className="panel-h"><h3>Eliminasi Investasi vs Ekuitas Anak</h3><span className="sub mono">metode akuisisi · PSAK 22 ¶32</span></div>
                  <table className="dtbl" style={{ width: '100%' }}>
                    <tbody>
                      <tr><td style={{ fontSize: 12, fontWeight: 600 }}>Dr · Modal saham anak (100%)</td><td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(p65.subs.reduce((a, s) => a + s.modal, 0))}</td><td></td></tr>
                      <tr><td style={{ fontSize: 12, fontWeight: 600 }}>Dr · Saldo laba pra-akuisisi anak</td><td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(p65.subs.reduce((a, s) => a + s.rePre, 0))}</td><td></td></tr>
                      <tr style={{ background: 'var(--blue-050)' }}><td style={{ fontSize: 12, fontWeight: 700 }}>Dr · Goodwill (selisih lebih)</td><td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--blue)' }}>{fmt(p65.goodwillTotal)}</td><td></td></tr>
                      <tr><td style={{ fontSize: 12, paddingLeft: 18 }}>Cr · Investasi pada entitas anak</td><td></td><td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(p65.costTotal)}</td></tr>
                      <tr style={{ background: 'var(--amber-bg)' }}><td style={{ fontSize: 12, paddingLeft: 18, fontWeight: 700 }}>Cr · Kepentingan nonpengendali (akuisisi)</td><td></td><td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--amber)' }}>{fmt(p65.nciAcqTotal)}</td></tr>
                    </tbody>
                  </table>
                  <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>
                    Investasi induk (biaya perolehan Rp {fmt(p65.costTotal)} jt) dieliminasi terhadap ekuitas anak pada tanggal akuisisi. Selisih lebih biaya atas bagian induk atas aset neto teridentifikasi = <b>goodwill Rp {fmt(p65.goodwillTotal)} jt</b>; NCI diukur proporsional (¶19).
                  </div>
                </Panel>

                <Panel noBody>
                  <div className="panel-h"><h3>Jurnal Eliminasi & Penyesuaian Konsolidasi</h3><span className="sub mono">antar-perusahaan · ¶B86</span><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
                  <table className="dtbl" style={{ width: '100%' }}>
                    <thead><tr>
                      <th style={{ textAlign: 'left', width: 64 }}>ID</th>
                      <th style={{ textAlign: 'left' }}>Deskripsi</th>
                      <th style={{ textAlign: 'right', width: 76 }}>Nilai</th>
                      <th style={{ textAlign: 'center', width: 104 }}>Status</th>
                    </tr></thead>
                    <tbody>
                      {p65.interco.map(e => (
                        <tr key={e.id}>
                          <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{e.id}</td>
                          <td>
                            <div style={{ fontSize: 12, fontWeight: 500 }}>{e.desc}</div>
                            <div className="tiny muted">Dr {e.dr} · Cr {e.cr}{e.diff ? <span style={{ color: 'var(--red)' }}> · selisih Rp {fmt(e.diff)} jt belum direkonsiliasi</span> : ''}</div>
                          </td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(e.amount)}</td>
                          <td style={{ textAlign: 'center' }}><Badge kind={ELIM_KIND_P65[e.status]}>{e.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="row ac gap8" style={{ padding: '9px 14px', borderTop: '1px solid var(--line-soft)', background: 'var(--amber-bg)' }}>
                    <span style={{ color: 'var(--amber)' }}><I.alert size={15} /></span>
                    <span className="tiny" style={{ flex: 1, lineHeight: 1.5 }}>ELM-03 menyisakan selisih <b>Rp 180 jt</b> antara piutang & utang antar-perusahaan — perlu konfirmasi & rekonsiliasi sebelum finalisasi (SA 505).</span>
                    <Btn sm onClick={() => nav('confirm', { from: 'psak65' })}><I.mail size={12} /> Konfirmasi</Btn>
                  </div>
                </Panel>
              </div>

              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div className="panel-h"><h3>Roll-Forward NCI</h3><span className="sub mono">¶B94 · per ekuitas</span></div>
                  <div style={{ padding: 14, display: 'grid', gap: 8 }}>
                    <P65RowKv label="NCI pada tanggal akuisisi" v={fmt(p65.nciAcqTotal) + ' jt'} />
                    <P65RowKv label="Bagian NCI atas laba pasca-akuisisi" v={'+' + fmt(p65.nciPostTotal) + ' jt'} accent="var(--green)" />
                    <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 8 }}>
                      <P65RowKv label="NCI akhir periode (ekuitas)" v={fmt(p65.nciCloseTotal) + ' jt'} strong accent="var(--amber)" />
                    </div>
                  </div>
                  <div className="tiny muted" style={{ padding: '0 14px 12px', lineHeight: 1.5 }}>NCI disajikan dalam ekuitas konsolidasian terpisah dari ekuitas pemilik induk. Bagian NCI atas laba tahun berjalan Rp {fmt(p65.nciProfit)} jt.</div>
                </Panel>

                <Panel noBody>
                  <div className="panel-h"><h3>Rekonsiliasi Laba Konsolidasi</h3><span className="sub mono">laporan laba rugi</span></div>
                  <div style={{ padding: 14 }}>
                    {[
                      { t: 'Laba entitas induk (LK terpisah)', v: p65.indukSeparate, sub: 'incl. penghasilan dividen' },
                      { t: 'Σ laba entitas anak', v: p65.subsNpat, kind: 'green' },
                      { t: 'Eliminasi laba antar-perusahaan', v: -p65.elimLaba, kind: 'red' },
                      { t: 'Laba tahun berjalan konsolidasi', v: p65.consolNpat, tot: true },
                      { t: 'Diatribusikan ke pemilik induk', v: p65.ownersProfit, ind: true },
                      { t: 'Diatribusikan ke NCI', v: p65.nciProfit, ind: true, kind: 'amber' },
                    ].map((r, i) => (
                      <div key={i} className="row ac jb" style={{ padding: '7px 0', borderBottom: i < 5 ? '1px solid var(--line-soft)' : 0 }}>
                        <span style={{ fontSize: 12, fontWeight: r.tot ? 700 : 500, color: r.tot ? 'var(--navy)' : 'var(--ink)', paddingLeft: r.ind ? 12 : 0 }}>{r.t}{r.sub && <span className="tiny muted"> · {r.sub}</span>}</span>
                        <span className="mono" style={{ fontWeight: 700, color: r.kind === 'red' ? 'var(--red)' : r.kind === 'amber' ? 'var(--amber)' : r.tot ? 'var(--navy)' : r.kind === 'green' ? 'var(--green)' : 'inherit' }}>{r.v < 0 ? '(' + fmt(-r.v) + ')' : fmt(r.v)}</span>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {/* ================= TAB · GOODWILL & TRANSLASI ================= */}
          {tab === 'goodwill' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div className="panel-h"><h3>Goodwill per Akuisisi (Alokasi PPA)</h3><span className="sub mono">PSAK 22 · biaya − bagian aset neto</span><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="dtbl" style={{ width: '100%' }}>
                      <thead><tr>
                        <th style={{ textAlign: 'left' }}>Entitas anak</th>
                        <th style={{ textAlign: 'center', width: 58 }}>Milik</th>
                        <th style={{ textAlign: 'right', width: 84 }}>Biaya Inv.</th>
                        <th style={{ textAlign: 'right', width: 96 }}>Bagian Aset Neto</th>
                        <th style={{ textAlign: 'right', width: 84 }}>Goodwill</th>
                      </tr></thead>
                      <tbody>
                        {p65.subs.map(s => (
                          <tr key={s.id}>
                            <td style={{ fontSize: 12.5, fontWeight: 600 }}>{s.name}</td>
                            <td className="mono" style={{ textAlign: 'center' }}>{s.own}%</td>
                            <td className="mono" style={{ textAlign: 'right' }}>{fmt(s.cost)}</td>
                            <td className="mono" style={{ textAlign: 'right', color: 'var(--ink-2)' }}>{fmt(Math.round(s.own / 100 * s.equityAcq))}</td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--blue)' }}>{fmt(s.goodwill)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: 'var(--surface-2)' }}>
                          <td colSpan={2} style={{ fontWeight: 700, color: 'var(--navy)' }}>TOTAL GOODWILL</td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(p65.costTotal)}</td>
                          <td></td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--navy)' }}>{fmt(p65.goodwillTotal)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <button onClick={() => nav('psak48', { from: 'psak65' })} className="row ac jb" style={{ padding: '10px 14px', borderTop: '1px solid var(--line-soft)', background: 'var(--blue-050)', cursor: 'pointer', width: '100%', textAlign: 'left', border: 'none' }}>
                    <div className="row ac gap8"><span style={{ color: 'var(--blue)' }}><I.scale size={15} /></span><span className="tiny" style={{ lineHeight: 1.5 }}>Goodwill <b>Rp {fmt(p65.goodwillTotal)} jt</b> = angka yang diuji penurunan nilai UPK tahunan oleh <b>PSAK 48</b> (satu sumber · ¶90). {p65.goodwillTotal === p65.goodwillTie ? 'Konsisten ✓' : 'Selisih — telusuri.'}</span></div>
                    <I.arrowRight size={13} style={{ color: 'var(--ink-4)' }} />
                  </button>
                </Panel>
              </div>

              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div className="panel-h"><h3>Translasi Entitas Asing</h3><span className="sub mono">PSAK 10 · {p65.translation.name}</span></div>
                  <div style={{ padding: 14, display: 'grid', gap: 8 }}>
                    <P65RowKv label="Aset neto (mata uang fungsional)" v={fmt(p65.translation.netAssetsSgd) + ' rb SGD'} />
                    <P65RowKv label="Kurs penutup (pos neraca)" v={'Rp ' + fmt(p65.translation.closeRate)} />
                    <P65RowKv label="Kurs rata-rata (laba rugi)" v={'Rp ' + fmt(p65.translation.avgRate)} />
                    <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 8 }}>
                      <P65RowKv label="Selisih kurs translasi (CTA → OCI)" v={'Rp ' + fmt(p65.translation.cta) + ' jt'} strong accent="var(--blue)" />
                    </div>
                  </div>
                  <div className="tiny muted" style={{ padding: '0 14px 12px', lineHeight: 1.5 }}>Aset & liabilitas ditranslasi pada kurs penutup; pendapatan & beban pada kurs rata-rata. Selisih kurs diakui di <b>OCI</b> (cadangan translasi), bukan laba rugi.</div>
                </Panel>

                <Panel title="Surplus / Konsekuensi Lain" sub="dampak ke modul lain">
                  <div style={{ display: 'grid', gap: 8 }}>
                    <button onClick={() => nav('psak46', { from: 'psak65' })} className="row ac jb" style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', borderLeft: '3px solid var(--blue)', background: 'var(--surface)', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
                      <div><div style={{ fontSize: 11.5, fontWeight: 600 }}>Pajak tangguhan PPA (PSAK 46)</div><div className="tiny muted">Beda nilai wajar akuisisi × 22%</div></div>
                      <I.arrowRight size={13} style={{ color: 'var(--ink-4)' }} />
                    </button>
                    <button onClick={() => nav('related', { from: 'psak65' })} className="row ac jb" style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', borderLeft: '3px solid var(--green)', background: 'var(--surface)', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
                      <div><div style={{ fontSize: 11.5, fontWeight: 600 }}>Pihak berelasi (PSAK 7)</div><div className="tiny muted">Pengungkapan transaksi antar-perusahaan</div></div>
                      <I.arrowRight size={13} style={{ color: 'var(--ink-4)' }} />
                    </button>
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {/* ================= TAB · REKONSILIASI ================= */}
          {tab === 'rekonsiliasi' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div className="panel-h"><h3>Rekonsiliasi Angka — Satu Sumber Kebenaran</h3><span className="sub mono">model PSAK 65 ↔ WTB ↔ modul konsumen</span></div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="dtbl" style={{ width: '100%' }}>
                      <thead><tr>
                        <th style={{ textAlign: 'left' }}>Pos</th>
                        <th style={{ textAlign: 'left', width: 200 }}>Sumber</th>
                        <th style={{ textAlign: 'right', width: 84 }}>Rp juta</th>
                        <th style={{ textAlign: 'center', width: 60 }}>Status</th>
                      </tr></thead>
                      <tbody>
                        {p65.recon.map((r, i) => (
                          <tr key={i} style={{ background: r.hi ? 'var(--blue-050)' : undefined, cursor: r.route ? 'pointer' : 'default' }} onClick={r.route ? () => nav(r.route, { from: 'psak65' }) : undefined}>
                            <td style={{ fontWeight: 600, fontSize: 12.5 }}>{r.pos}</td>
                            <td className="mono tiny" style={{ color: 'var(--ink-3)' }}>{r.src}{r.route && <I.arrowRight size={11} style={{ marginLeft: 4, verticalAlign: 'middle', color: 'var(--blue)' }} />}</td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{r.val < 0 ? '(' + fmt(-r.val) + ')' : fmt(r.val)}</td>
                            <td style={{ textAlign: 'center' }}>{r.ok ? <span style={{ color: 'var(--green)' }}><I.checkCircle size={15} /></span> : <span style={{ color: 'var(--amber)' }}><I.alert size={15} /></span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>
                    Seluruh angka mengalir dari <b>WTB</b> (entitas induk) melalui satu fungsi kanonik <span className="mono">psak65(wtb)</span>. Mengubah AJE otomatis memperbarui kertas kerja konsolidasi, NCI & atribusi laba. Goodwill yang dihitung di sini adalah <b>angka yang sama</b> diuji penurunan nilai oleh PSAK 48 — tanpa duplikasi.
                  </div>
                </Panel>
              </div>

              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div className="panel-h"><h3>Keterkaitan Kertas Kerja</h3><span className="sub mono">lineage data</span></div>
                  <div className="row ac gap6" style={{ padding: '9px 14px 4px' }}><I.arrowRight size={13} style={{ color: 'var(--blue)' }} /><span className="tiny upper" style={{ fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink-3)' }}>Hulu — sumber data</span></div>
                  <div style={{ display: 'grid', gap: 6, padding: '2px 12px 10px' }}>
                    {P65_UPSTREAM.map(m => { const IconC = I[m.ic] || I.doc; return (
                      <button key={m.id} onClick={() => nav(m.id, { from: 'psak65' })} className="row ac gap9" style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', borderLeft: '3px solid var(--blue)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                        <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><IconC size={15} /></span>
                        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600 }}>{m.lbl}</div><div className="tiny muted" style={{ lineHeight: 1.35 }}>{m.rel}</div></div>
                        <I.arrowRight size={13} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                      </button>
                    ); })}
                  </div>
                  <div className="row ac gap6" style={{ padding: '4px 14px 4px', borderTop: '1px solid var(--line-soft)' }}><I.arrowRight size={13} style={{ color: 'var(--green)' }} /><span className="tiny upper" style={{ fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink-3)' }}>Hilir — pengguna angka</span></div>
                  <div style={{ display: 'grid', gap: 6, padding: '2px 12px 12px' }}>
                    {P65_DOWNSTREAM.map(m => { const IconC = I[m.ic] || I.doc; return (
                      <button key={m.id} onClick={() => nav(m.id, { from: 'psak65' })} className="row ac gap9" style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', borderLeft: '3px solid var(--green)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                        <span style={{ color: 'var(--green)', flex: '0 0 auto' }}><IconC size={15} /></span>
                        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600 }}>{m.lbl}</div><div className="tiny muted" style={{ lineHeight: 1.35 }}>{m.rel}</div></div>
                        <I.arrowRight size={13} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                      </button>
                    ); })}
                  </div>
                  <button onClick={() => nav('dataflow', { from: 'psak65' })} className="row ac gap8" style={{ padding: '9px 14px', borderTop: '1px solid var(--line-soft)', background: 'var(--surface-2)', cursor: 'pointer', width: '100%', textAlign: 'left', border: 'none' }}>
                    <I.link2 size={14} style={{ color: 'var(--navy)' }} /><span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>Lihat Rekonsiliasi Angka lintas-modul</span><I.arrowRight size={13} style={{ color: 'var(--ink-4)' }} />
                  </button>
                </Panel>
              </div>
            </div>
          )}

          {/* ================= TAB · AUDIT SA 600 ================= */}
          {tab === 'audit' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
              <Panel noBody>
                <div className="panel-h"><h3>Prosedur Audit — Konsolidasi (SA 600 Revisi · PSAK 65)</h3><div style={{ flex: 1 }} /><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)' }}>{doneCount}/{P65_PROC.length}</span></div>
                <div className="row gap8" style={{ padding: '10px 14px', alignItems: 'flex-start', background: 'var(--blue-050)' }}>
                  <span style={{ color: 'var(--blue)', marginTop: 1 }}><I.building size={15} /></span>
                  <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>Tim audit grup bertanggung jawab atas arah, supervisi & pelaksanaan audit grup — termasuk lingkup berbasis risiko, komunikasi dua arah dengan auditor komponen, serta evaluasi proses konsolidasi entitas induk.</div>
                </div>
                <div>
                  {P65_PROC.map((p, i) => {
                    const key = p.ref + i;
                    const isOn = !!done[key];
                    return (
                      <label key={key} className="row gap10" style={{ padding: '9px 14px', cursor: 'pointer', alignItems: 'flex-start', borderBottom: i < P65_PROC.length - 1 ? '1px solid var(--line-soft)' : 0 }} onClick={() => toggle(key)}>
                        <span style={{ flex: '0 0 16px', width: 16, height: 16, borderRadius: 4, marginTop: 1, border: '1.5px solid ' + (isOn ? 'var(--green)' : 'var(--line-strong)'), background: isOn ? 'var(--green)' : '#fff', display: 'grid', placeItems: 'center' }}>{isOn && <I.check size={11} style={{ color: '#fff' }} />}</span>
                        <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)', width: 92, flex: '0 0 92px', marginTop: 1 }}>{p.ref}</span>
                        <span style={{ fontSize: 12, lineHeight: 1.4, color: isOn ? 'var(--ink-3)' : 'var(--ink)', textDecoration: isOn ? 'line-through' : 'none' }}>{p.t}</span>
                      </label>
                    );
                  })}
                </div>
              </Panel>

              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div style={{ background: 'linear-gradient(120deg,#013a52,#005085)', color: '#fff', padding: '14px 16px' }}>
                    <div className="tiny upper" style={{ color: '#bcd6e4', letterSpacing: '.05em', marginBottom: 8 }}>Kesimpulan Audit — Konsolidasi</div>
                    <div className="row ac gap12">
                      <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1, fontFamily: 'JetBrains Mono, monospace' }}>{score}<span style={{ fontSize: 18 }}>%</span></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,.18)', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: score + '%', background: score === 100 ? '#4ade80' : '#7cc6ff', borderRadius: 4, transition: '.3s' }} /></div>
                        <div className="tiny" style={{ color: '#bcd6e4', marginTop: 6 }}>{doneCount}/{P65_PROC.length} prosedur audit selesai</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: 14 }}>
                    <div className="panel" style={{ padding: '10px 12px', background: 'var(--green-bg)', borderColor: 'transparent' }}>
                      <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                        <span style={{ color: 'var(--green)', marginTop: 1 }}><I.checkCircle size={15} /></span>
                        <div style={{ fontSize: 12, lineHeight: 1.5 }}>Kertas kerja konsolidasi <b>menutup</b> (A = L + E, selisih Rp {fmt(p65.balCheck)} jt). Goodwill Rp {fmt(p65.goodwillTotal)} jt konsisten dengan uji penurunan nilai PSAK 48.</div>
                      </div>
                    </div>
                    <div className="row gap8" style={{ marginTop: 12 }}>
                      <Btn sm variant="primary" style={{ flex: 1 }} onClick={() => nav('groupaudit', { from: 'psak65' })}><I.building size={14} /> Group Audit</Btn>
                      <Btn sm style={{ flex: 1 }} onClick={() => nav('fsgen', { from: 'psak65' })}><I.report size={14} /> LK Konsolidasi</Btn>
                    </div>
                  </div>
                </Panel>

                <Panel title="Pertimbangan Kunci" sub="area penilaian signifikan">
                  <div style={{ display: 'grid', gap: 8 }}>
                    {[
                      ['Kesimpulan pengendalian atas seluruh investee (¶7)', true],
                      ['Eliminasi antar-perusahaan lengkap (ELM-03 selisih Rp 180 jt)', false],
                      ['Goodwill diuji penurunan nilai (PSAK 48)', true],
                      ['Translasi entitas asing & CTA (PSAK 10)', true],
                      ['Keseragaman kebijakan akuntansi komponen', true],
                    ].map(([t, ok], i) => (
                      <div key={i} className="row ac gap8 tiny">
                        <span style={{ color: ok ? 'var(--green)' : 'var(--amber)' }}>{ok ? <I.checkCircle size={14} /> : <I.alert size={14} />}</span>
                        <span style={{ lineHeight: 1.35 }}>{t}</span>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            </div>
          )}

          <div className="tiny muted" style={{ padding: '0 2px 4px', lineHeight: 1.5 }}>
            Kertas kerja ini menyusun & mengaudit laporan keuangan konsolidasian <b>{client.name}</b> ({eng.id} · {eng.fy}) terhadap PSAK 65 — dari penilaian pengendalian, kertas kerja konsolidasi, eliminasi & NCI, hingga goodwill, translasi & kesimpulan audit grup. Entitas induk ditarik live dari WTB; goodwill, struktur grup & eliminasi konsisten dengan PSAK 48 & Group Audit.
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { PSAK65View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { PSAK65View };
