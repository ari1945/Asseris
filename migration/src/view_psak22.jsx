/* [codemod] ESM imports */
import React from 'react';
import { AMS_CANON } from './canon';
import { useAudit, useFirm, useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Donut, Panel } from './ui.jsx';

/* ============================================================
   NeoSuite AMS — PSAK 22 · Kombinasi Bisnis (IFRS 3)
   ------------------------------------------------------------
   Kertas kerja akuntansi & audit AKUISISI yang DITARIK dari satu
   sumber kebenaran:
     · GROUP_SUBS — seed akuisisi yang SAMA dipakai PSAK 65 (konsolidasi)
       & Group Audit (SA 600). Tidak ada angka ganda.
     · AMS_CANON.psak22(wtb) — mesin metode akuisisi: imbalan dialihkan,
       PPA, pengukuran NCI, goodwill residual.
     · Σ goodwill per-akuisisi = Rp 6.800 jt = AMS_CANON.GOODWILL —
       angka IDENTIK dengan eliminasi investasi PSAK 65 (¶32) dan yang
       diuji penurunan nilai UPK tahunan oleh PSAK 48 (¶90).
   Cakupan:
     • Identifikasi kombinasi bisnis (¶3 · B7) — uji "bisnis", pengakuisisi,
       tanggal akuisisi, metode akuisisi (¶4-5)
     • Imbalan dialihkan (¶37) — kas, saham, imbalan kontinjensi (¶39);
       biaya terkait akuisisi dibebankan (¶53)
     • Alokasi harga akuisisi (PPA · ¶18) — aset & liabilitas pd nilai wajar,
       takberwujud teridentifikasi (¶B31-B33), pajak tangguhan PNW (¶24)
     • Goodwill (¶32) & NCI (¶19) — proporsional vs nilai wajar; pembelian
       dengan diskon (¶34)
     • Periode pengukuran (¶45) & pengukuran kembali imbalan kontinjensi (¶58)
     • Rekonsiliasi & keterkaitan lintas-modul (PSAK 65/48/19/46)
   ============================================================ */
const { useState: useStateP22, useMemo: useMemoP22 } = React;

/* ---- ketentuan kunci PSAK 22 ---- */
const P22_KEY = [
  { k: 'Metode akuisisi', v: '¶4-5', note: 'Setiap kombinasi bisnis dicatat dengan menerapkan metode akuisisi — bukan penyatuan kepemilikan.' },
  { k: 'Imbalan dialihkan', v: '¶37', note: 'Diukur pada nilai wajar = Σ nilai wajar aset diserahkan, liabilitas ditanggung & instrumen ekuitas diterbitkan pengakuisisi.' },
  { k: 'Aset & liabilitas teridentifikasi', v: '¶18', note: 'Diakui terpisah dari goodwill dan diukur pada nilai wajar tanggal akuisisi.' },
  { k: 'Goodwill', v: '¶32', note: 'Residual = imbalan + NCI + nilai wajar kepentingan terdahulu − aset neto teridentifikasi pada nilai wajar.' },
  { k: 'Kepentingan nonpengendali', v: '¶19', note: 'Pilihan per kombinasi: proporsional atas aset neto teridentifikasi ATAU nilai wajar (goodwill penuh).' },
  { k: 'Biaya terkait akuisisi', v: '¶53', note: 'Dibebankan pada periode terjadinya — bukan bagian imbalan dialihkan.' },
];

/* ---- keterkaitan kertas kerja (lineage dua arah) ---- */
const P22_UPSTREAM = [
  { id: 'groupaudit', ic: 'building', lbl: 'Group Audit (SA 600)', rel: 'Komponen grup & seed akuisisi (GROUP_SUBS)' },
  { id: 'psak68',     ic: 'layers',  lbl: 'PSAK 68 · Nilai Wajar', rel: 'Teknik & hierarki pengukuran nilai wajar PPA' },
  { id: 'specifics',  ic: 'search2', lbl: 'Penggunaan Pakar (SA 500)', rel: 'Laporan penilai KJPP atas alokasi harga akuisisi' },
];
const P22_DOWNSTREAM = [
  { id: 'psak65', ic: 'columns', lbl: 'PSAK 65 · Konsolidasian', rel: 'Eliminasi investasi vs ekuitas anak (¶32) — goodwill identik' },
  { id: 'psak48', ic: 'scale',   lbl: 'PSAK 48 · Penurunan Nilai', rel: 'Goodwill Rp 6.800 jt → uji UPK tahunan (¶90)' },
  { id: 'psak19', ic: 'sparkle', lbl: 'PSAK 19 · Takberwujud', rel: 'Takberwujud teridentifikasi PPA → diakui & diamortisasi' },
  { id: 'psak46', ic: 'receipt', lbl: 'PSAK 46 · Pajak Tangguhan', rel: 'Pajak tangguhan atas penyesuaian nilai wajar (¶24)' },
];

const FVA_KIND = { customer: 'blue', brand: 'purple', tech: 'green', ppe: 'amber' };
const FVA_LBL = { customer: 'Hub. pelanggan', brand: 'Merek dagang', tech: 'Teknologi/lisensi', ppe: 'Step-up aset tetap' };

function P22Card({ value, label, sub, accent }) {
  return (
    <div className="panel" style={{ padding: '12px 14px', display: 'grid', gap: 2 }}>
      <div className="mono" style={{ fontSize: 21, fontWeight: 700, color: accent || 'var(--navy)', lineHeight: 1.05 }}>{value}</div>
      <div className="tiny muted" style={{ fontWeight: 600 }}>{label}</div>
      {sub && <div className="tiny" style={{ color: 'var(--ink-4)' }}>{sub}</div>}
    </div>
  );
}

function P22Kv({ label, v, strong, accent, indent }) {
  return (
    <div className="row jb ac">
      <span style={{ fontSize: 12, color: 'var(--ink-2)', paddingLeft: indent ? 12 : 0 }}>{label}</span>
      <span className="mono" style={{ fontWeight: strong ? 700 : 600, fontSize: strong ? 14 : 12.5, color: accent || (strong ? 'var(--navy)' : 'inherit') }}>{v}</span>
    </div>
  );
}

function PSAK22View() {
  const { fmt } = window.AMS;
  const firm = useFirm();
  const audit = useAudit();
  const nav = useNav();
  const loader = window.loadLS || ((k, d) => d);

  /* ——— SUMBER KEBENARAN ——— */
  const wtb = (audit && audit.wtb && audit.wtb.length) ? audit.wtb : ((window.AMS && window.AMS.WTB) || []);
  const canon = AMS_CANON;
  const p22 = useMemoP22(() => canon.psak22(wtb), [wtb]);

  const [tab, setTab] = useStateP22(() => loader('ams.psak22.tab', 'akuisisi'));
  const [sel, setSel] = useStateP22(() => loader('ams.psak22.sel', p22.deals[1] ? p22.deals[1].id : p22.deals[0].id));
  const [done, setDone] = useStateP22(() => loader('ams.psak22.done', {}));

  React.useEffect(() => { try { localStorage.setItem('ams.psak22.tab', JSON.stringify(tab)); } catch (e) {} }, [tab]);
  React.useEffect(() => { try { localStorage.setItem('ams.psak22.sel', JSON.stringify(sel)); } catch (e) {} }, [sel]);
  React.useEffect(() => { try { localStorage.setItem('ams.psak22.done', JSON.stringify(done)); } catch (e) {} }, [done]);

  const rp = (x) => 'Rp ' + fmt(Math.round(x));
  const sgn = (x) => (x < 0 ? '(' + fmt(Math.round(-x)) + ')' : fmt(Math.round(x)));
  const toggle = (id) => setDone(m => ({ ...m, [id]: !m[id] }));
  const doneCount = p22.proc.filter((p, i) => done[p.ref + i]).length;
  const score = Math.round(doneCount / p22.proc.length * 100);

  const client = firm.activeClient || { name: 'PT Sentosa Makmur Tbk' };
  const deal = p22.deals.find(d => d.id === sel) || p22.deals[0];

  const TABS = [
    { id: 'akuisisi', label: 'Identifikasi (¶3)' },
    { id: 'imbalan', label: 'Imbalan Dialihkan' },
    { id: 'ppa', label: 'Alokasi Harga (PPA)' },
    { id: 'goodwill', label: 'Goodwill & NCI' },
    { id: 'periode', label: 'Periode Pengukuran' },
    { id: 'rekonsiliasi', label: 'Rekonsiliasi' },
    { id: 'audit', label: 'Audit' },
  ];

  /* goodwill bridge donut */
  const gwSegs = p22.deals.map((d, i) => ({ label: d.acquiree, value: d.goodwill, color: ['var(--navy)', 'var(--blue)', 'var(--amber)', 'var(--green)'][i % 4] }));

  /* deal selector pills */
  const DealPills = () => (
    <div className="row gap6 ac" style={{ flexWrap: 'wrap' }}>
      {p22.deals.map(d => (
        <button key={d.id} onClick={() => setSel(d.id)} className="row ac gap6"
          style={{ padding: '6px 11px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
            border: '1px solid ' + (sel === d.id ? 'var(--navy)' : 'var(--line)'),
            background: sel === d.id ? 'var(--navy)' : 'var(--surface)', color: sel === d.id ? '#fff' : 'var(--ink)' }}>
          <span className="mono tiny" style={{ fontWeight: 700, color: sel === d.id ? '#bcd6e4' : 'var(--blue)' }}>{d.id}</span>
          <span style={{ fontSize: 12, fontWeight: 600 }}>{d.acquiree.replace('PT Sentosa ', '').replace('Sentosa ', '')}</span>
          <span className="mono tiny" style={{ fontWeight: 700, color: sel === d.id ? '#fff' : 'var(--ink-3)' }}>{d.own}%</span>
        </button>
      ))}
    </div>
  );

  return (
    <>
      <SubBar moduleId="psak22" right={
        <div className="row gap8 ac">
          <Badge kind="blue">PSAK 22 · IFRS 3</Badge>
          <Btn sm onClick={() => nav('psak65', { from: 'psak22' })}><I.columns size={13} /> Konsolidasi (PSAK 65)</Btn>
          <Btn sm onClick={() => nav('psak48', { from: 'psak22' })}><I.scale size={13} /> Uji Goodwill (PSAK 48)</Btn>
          <Btn sm><I.download size={13} /> Kertas Kerja G-2</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>

          {/* summary cards */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            <P22Card value={p22.count + ' akuisisi'} label="Kombinasi bisnis dikonsolidasi" sub="metode akuisisi (¶4)" accent="var(--navy)" />
            <P22Card value={rp(p22.considTotal) + ' jt'} label="Imbalan dialihkan (¶37)" sub={'incl. kontinjensi Rp ' + fmt(p22.contingentTotal) + ' jt'} accent="var(--blue)" />
            <P22Card value={rp(p22.fvniaTotal) + ' jt'} label="Aset neto teridentifikasi (NW)" sub={'PNW Rp ' + fmt(p22.grossFVATotal) + ' jt · DTL Rp ' + fmt(p22.dtlTotal) + ' jt'} accent="var(--green)" />
            <P22Card value={rp(p22.nciAcqTotal) + ' jt'} label="NCI pd akuisisi (¶19a)" sub="metode proporsional terpilih" accent="var(--amber)" />
            <P22Card value={rp(p22.goodwillTotal) + ' jt'} label="Goodwill (¶32)" sub={p22.tiesToCanon ? 'tie PSAK 65 & 48 ✓' : 'cek tie'} accent={p22.tiesToCanon ? 'var(--navy)' : 'var(--red)'} />
          </div>

          {/* tabs */}
          <div className="row ac jb" style={{ flexWrap: 'wrap', gap: 8 }}>
            <div className="seg" style={{ width: 'fit-content', flexWrap: 'wrap' }}>
              {TABS.map(t => <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>)}
            </div>
            <span className="tiny muted">Satu sumber: <b>GROUP_SUBS</b> → <span className="mono">AMS_CANON.psak22(wtb)</span></span>
          </div>

          {/* ================= TAB · IDENTIFIKASI ================= */}
          {tab === 'akuisisi' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div className="panel-h"><h3>Identifikasi Kombinasi Bisnis</h3><span className="sub mono">pengakuisisi · tanggal akuisisi · uji bisnis (¶3 · B7)</span></div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="dtbl" style={{ width: '100%' }}>
                      <thead><tr>
                        <th style={{ textAlign: 'left' }}>Pihak diakuisisi (acquiree)</th>
                        <th style={{ textAlign: 'left', width: 92 }}>Tgl Akuisisi</th>
                        <th style={{ textAlign: 'center', width: 58 }}>% Diperoleh</th>
                        <th style={{ textAlign: 'center', width: 70 }}>Uji Bisnis</th>
                        <th style={{ textAlign: 'left', width: 130 }}>Metode</th>
                      </tr></thead>
                      <tbody>
                        {p22.deals.map(d => (
                          <tr key={d.id} style={{ cursor: 'pointer', background: sel === d.id ? 'var(--blue-050)' : undefined }} onClick={() => setSel(d.id)}>
                            <td>
                              <div className="row ac gap6" style={{ fontSize: 12.5, fontWeight: 600 }}><span className="mono tiny" style={{ color: 'var(--blue)' }}>{d.id}</span><span>{d.acquiree}</span>{d.foreign && <Badge kind="gray">PSAK 10</Badge>}</div>
                              <div className="tiny muted" style={{ lineHeight: 1.4 }}>{d.rationale}</div>
                            </td>
                            <td className="mono tiny" style={{ fontWeight: 600 }}>{d.acqDate}</td>
                            <td className="mono" style={{ textAlign: 'center', fontWeight: 700 }}>{d.own}%</td>
                            <td style={{ textAlign: 'center' }}><span style={{ color: 'var(--green)' }}><I.check size={15} /></span></td>
                            <td><Badge kind="blue">Metode akuisisi</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>
                    Tiap transaksi memenuhi definisi <b>bisnis</b> (input, proses substantif & kemampuan menghasilkan output — ¶B7) sehingga dicatat dengan <b>metode akuisisi</b>, bukan akuisisi aset. PT Sentosa Makmur Tbk adalah <b>pengakuisisi</b> (memperoleh pengendalian — IFRS 10/PSAK 65).
                  </div>
                </Panel>

                <Panel noBody>
                  <div className="panel-h"><h3>Empat Langkah Metode Akuisisi (¶5)</h3><span className="sub mono">{deal.id} · {deal.acquiree}</span></div>
                  <div style={{ padding: 14, display: 'grid', gap: 9 }}>
                    {[
                      { n: 1, t: 'Identifikasi pengakuisisi', s: 'PT Sentosa Makmur Tbk memperoleh pengendalian ' + deal.own + '% (¶7).' },
                      { n: 2, t: 'Tentukan tanggal akuisisi', s: 'Pengendalian beralih per ' + deal.acqDate + ' (¶8-9).' },
                      { n: 3, t: 'Akui & ukur aset/liabilitas teridentifikasi + NCI', s: 'Aset neto pd nilai wajar Rp ' + fmt(deal.fvnia) + ' jt; NCI ' + (100 - deal.own) + '% (¶18-19).' },
                      { n: 4, t: 'Akui & ukur goodwill / untung pembelian diskon', s: 'Goodwill residual Rp ' + fmt(deal.goodwill) + ' jt (¶32).' },
                    ].map(st => (
                      <div key={st.n} className="row gap10" style={{ alignItems: 'flex-start' }}>
                        <span style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--navy)', color: '#fff', display: 'grid', placeItems: 'center', flex: '0 0 22px', fontSize: 12, fontWeight: 700 }}>{st.n}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600 }}>{st.t}</div>
                          <div className="tiny muted" style={{ lineHeight: 1.45 }}>{st.s}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>

              <Panel title="Ketentuan Kunci PSAK 22" sub="IFRS 3 · metode akuisisi">
                <div style={{ display: 'grid', gap: 0 }}>
                  {P22_KEY.map((a, i) => (
                    <div key={i} style={{ padding: '8px 0', borderBottom: i < P22_KEY.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                      <div className="row ac jb"><span style={{ fontSize: 12, fontWeight: 600 }}>{a.k}</span><span className="mono" style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--navy)' }}>{a.v}</span></div>
                      <div className="tiny muted" style={{ lineHeight: 1.4, marginTop: 1 }}>{a.note}</div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          )}

          {/* ================= TAB · IMBALAN DIALIHKAN ================= */}
          {tab === 'imbalan' && (
            <div className="grid" style={{ gap: 12 }}>
              <DealPills />
              <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
                <Panel noBody>
                  <div className="panel-h"><h3>Imbalan Dialihkan — {deal.acquiree}</h3><span className="sub mono">nilai wajar ¶37 · imbalan kontinjensi ¶39</span><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
                  <table className="dtbl" style={{ width: '100%' }}>
                    <tbody>
                      {deal.d.consid.map((c, i) => (
                        <tr key={i}><td style={{ fontSize: 12.5, fontWeight: 500 }}>{c.k}</td><td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(c.v)}</td></tr>
                      ))}
                      {deal.contingent > 0 && (
                        <tr style={{ background: 'var(--amber-bg)' }}>
                          <td style={{ fontSize: 12.5, fontWeight: 600 }}>Imbalan kontinjensi (earn-out · NW ¶39)<div className="tiny muted">diklasifikasikan sebagai liabilitas — diukur kembali ¶58</div></td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--amber)' }}>{fmt(deal.contingent)}</td>
                        </tr>
                      )}
                      <tr style={{ borderTop: '1.5px solid var(--line-strong)', background: 'var(--surface-2)' }}>
                        <td style={{ fontWeight: 700, color: 'var(--navy)' }}>Total imbalan dialihkan</td>
                        <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--navy)' }}>{fmt(deal.considTotal)}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="row ac gap8" style={{ padding: '10px 14px', borderTop: '1px solid var(--line-soft)', background: 'var(--red-bg)' }}>
                    <span style={{ color: 'var(--red)' }}><I.alert size={15} /></span>
                    <span className="tiny" style={{ flex: 1, lineHeight: 1.5 }}>
                      Biaya terkait akuisisi (uji tuntas, penasihat hukum & valuasi) <b>Rp {fmt(deal.acqCosts)} jt</b> <b>DIBEBANKAN</b> pada periode terjadinya (¶53) — bukan bagian imbalan dialihkan maupun goodwill.
                    </span>
                  </div>
                </Panel>

                <div className="grid" style={{ gap: 12 }}>
                  <Panel title="Komposisi Imbalan — Σ Seluruh Akuisisi" sub="¶37 · nilai wajar">
                    <div style={{ display: 'grid', gap: 8 }}>
                      <P22Kv label="Kas dibayarkan" v={fmt(p22.considTotal - p22.contingentTotal - 1600)} />
                      <P22Kv label="Saham diterbitkan (NW)" v={fmt(1600)} />
                      <P22Kv label="Imbalan kontinjensi (¶39)" v={fmt(p22.contingentTotal)} accent="var(--amber)" />
                      <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 8 }}>
                        <P22Kv label="Total imbalan dialihkan" v={fmt(p22.considTotal) + ' jt'} strong />
                      </div>
                      <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 8 }}>
                        <P22Kv label="Biaya akuisisi dibebankan (¶53)" v={fmt(p22.acqCostsTotal) + ' jt'} accent="var(--red)" />
                      </div>
                    </div>
                  </Panel>
                  <Panel title="Catatan Pengukuran" sub="¶37-40">
                    <div className="tiny muted" style={{ lineHeight: 1.55 }}>
                      Saham yang diterbitkan pengakuisisi diukur pada <b>nilai wajar tanggal akuisisi</b> (¶37). Imbalan kontinjensi diakui pada nilai wajar tanggal akuisisi sebagai bagian imbalan (¶39); klasifikasi liabilitas diukur kembali setiap periode dengan perubahan ke <b>Laba Rugi</b> (¶58) — lihat tab Periode Pengukuran.
                    </div>
                  </Panel>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB · PPA ================= */}
          {tab === 'ppa' && (
            <div className="grid" style={{ gap: 12 }}>
              <DealPills />
              <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
                <div className="grid" style={{ gap: 12 }}>
                  <Panel noBody>
                    <div className="panel-h"><h3>Alokasi Harga Akuisisi (PPA) — {deal.acquiree}</h3><span className="sub mono">aset neto teridentifikasi pd nilai wajar (¶18)</span><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
                    <table className="dtbl" style={{ width: '100%' }}>
                      <tbody>
                        <tr><td style={{ fontSize: 12.5, fontWeight: 600 }}>Nilai buku aset neto teridentifikasi</td><td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(deal.bookNA)}</td></tr>
                        <tr><td colSpan={2} className="tiny upper" style={{ fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink-3)', paddingTop: 8 }}>Penyesuaian nilai wajar (¶18 · B31-B33)</td></tr>
                        {deal.d.fva.map((f, i) => (
                          <tr key={i}>
                            <td style={{ paddingLeft: 18 }}>
                              <div className="row ac gap6" style={{ fontSize: 12 }}><Badge kind={FVA_KIND[f.cls]}>{FVA_LBL[f.cls]}</Badge><span>{f.label}</span></div>
                              {f.life && <div className="tiny muted" style={{ paddingLeft: 2 }}>umur manfaat {f.life} th → amortisasi PSAK 19</div>}
                            </td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--green)' }}>+{fmt(f.amount)}</td>
                          </tr>
                        ))}
                        <tr style={{ background: 'var(--surface-2)' }}><td style={{ paddingLeft: 18, fontSize: 12, fontWeight: 600 }}>Liabilitas pajak tangguhan atas PNW (22% · ¶24)</td><td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--red)' }}>({fmt(deal.dtl)})</td></tr>
                        <tr style={{ borderTop: '1.5px solid var(--line-strong)', background: 'var(--blue-050)' }}>
                          <td style={{ fontWeight: 700, color: 'var(--navy)' }}>Aset neto teridentifikasi pd nilai wajar (FVNIA)</td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--blue)' }}>{fmt(deal.fvnia)}</td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>
                      Takberwujud teridentifikasi (hubungan pelanggan, merek, teknologi) diakui <b>terpisah dari goodwill</b> karena memenuhi kriteria keterpisahan / kontraktual-legal (¶B31). Pajak tangguhan diakui atas seluruh beda nilai wajar (¶24) dan mengalir ke <b>PSAK 46</b>.
                    </div>
                  </Panel>
                </div>

                <div className="grid" style={{ gap: 12 }}>
                  <Panel noBody>
                    <div className="panel-h"><h3>Goodwill — {deal.id}</h3><span className="sub mono">¶32</span></div>
                    <div style={{ padding: 14, display: 'grid', gap: 8 }}>
                      <P22Kv label="Imbalan dialihkan" v={fmt(deal.considTotal)} />
                      <P22Kv label={'NCI pd akuisisi (' + (100 - deal.own) + '% · ¶19a)'} v={'+' + fmt(deal.nciAcqProp)} accent="var(--amber)" />
                      <P22Kv label="Aset neto teridentifikasi (NW)" v={'(' + fmt(deal.fvnia) + ')'} accent="var(--blue)" />
                      <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 8 }}>
                        <P22Kv label="Goodwill" v={fmt(deal.goodwill) + ' jt'} strong accent={deal.bargain ? 'var(--red)' : 'var(--navy)'} />
                      </div>
                    </div>
                    <div className="tiny muted" style={{ padding: '0 14px 12px', lineHeight: 1.5 }}>
                      {deal.bargain ? 'Goodwill negatif → pembelian dengan diskon (¶34): re-asses pengukuran, lalu akui untung di Laba Rugi (¶36).' : 'Goodwill positif diakui sebagai aset, tidak diamortisasi — diuji penurunan nilai tahunan (PSAK 48 ¶90).'}
                    </div>
                  </Panel>
                  <Panel title="Pajak Tangguhan PPA" sub="¶24 · → PSAK 46">
                    <div style={{ display: 'grid', gap: 7 }}>
                      <P22Kv label="Penyesuaian NW kena pajak" v={fmt(deal.grossFVA)} />
                      <P22Kv label="Tarif (UU HPP)" v="22%" />
                      <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 7 }}>
                        <P22Kv label="Liabilitas pajak tangguhan" v={fmt(deal.dtl) + ' jt'} strong accent="var(--red)" />
                      </div>
                    </div>
                    <Btn sm style={{ marginTop: 11, width: '100%' }} onClick={() => nav('psak46', { from: 'psak22' })}><I.receipt size={13} /> Buka PSAK 46</Btn>
                  </Panel>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB · GOODWILL & NCI ================= */}
          {tab === 'goodwill' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div className="panel-h"><h3>Goodwill per Akuisisi (¶32)</h3><span className="sub mono">imbalan + NCI − aset neto NW</span><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="dtbl" style={{ width: '100%' }}>
                      <thead><tr>
                        <th style={{ textAlign: 'left' }}>Akuisisi</th>
                        <th style={{ textAlign: 'right', width: 78 }}>Imbalan</th>
                        <th style={{ textAlign: 'right', width: 82 }}>+ NCI (prop.)</th>
                        <th style={{ textAlign: 'right', width: 88 }}>− FVNIA</th>
                        <th style={{ textAlign: 'right', width: 76 }}>Goodwill</th>
                      </tr></thead>
                      <tbody>
                        {p22.deals.map(d => (
                          <tr key={d.id}>
                            <td><div style={{ fontSize: 12.5, fontWeight: 600 }}>{d.acquiree}</div><div className="tiny muted">{d.own}% · {d.acqDate}</div></td>
                            <td className="mono" style={{ textAlign: 'right' }}>{fmt(d.considTotal)}</td>
                            <td className="mono" style={{ textAlign: 'right', color: 'var(--amber)' }}>{fmt(d.nciAcqProp)}</td>
                            <td className="mono" style={{ textAlign: 'right', color: 'var(--ink-3)' }}>({fmt(d.fvnia)})</td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--blue)' }}>{fmt(d.goodwill)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: 'var(--surface-2)' }}>
                          <td style={{ fontWeight: 700, color: 'var(--navy)' }}>TOTAL</td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(p22.considTotal)}</td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--amber)' }}>{fmt(p22.nciAcqTotal)}</td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>({fmt(p22.fvniaTotal)})</td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--navy)' }}>{fmt(p22.goodwillTotal)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <button onClick={() => nav('psak48', { from: 'psak22' })} className="row ac jb" style={{ padding: '10px 14px', borderTop: '1px solid var(--line-soft)', background: 'var(--blue-050)', cursor: 'pointer', width: '100%', textAlign: 'left', border: 'none' }}>
                    <div className="row ac gap8"><span style={{ color: 'var(--blue)' }}><I.scale size={15} /></span><span className="tiny" style={{ lineHeight: 1.5 }}>Goodwill <b>Rp {fmt(p22.goodwillTotal)} jt</b> = angka yang dieliminasi di <b>PSAK 65</b> (¶32) dan diuji penurunan nilai UPK tahunan oleh <b>PSAK 48</b> (¶90). {p22.tiesToCanon ? 'Konsisten ✓' : 'Selisih — telusuri.'}</span></div>
                    <I.arrowRight size={13} style={{ color: 'var(--ink-4)' }} />
                  </button>
                </Panel>

                <Panel noBody>
                  <div className="panel-h"><h3>Pengukuran NCI — Pilihan Metode (¶19)</h3><span className="sub mono">proporsional vs nilai wajar (goodwill penuh)</span><div style={{ flex: 1 }} /><span className="tiny muted">ilustrasi · Rp juta</span></div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="dtbl" style={{ width: '100%' }}>
                      <thead><tr>
                        <th style={{ textAlign: 'left' }}>Akuisisi</th>
                        <th style={{ textAlign: 'right', width: 96 }}>NCI proporsional</th>
                        <th style={{ textAlign: 'right', width: 88 }}>NCI nilai wajar</th>
                        <th style={{ textAlign: 'right', width: 96 }}>Goodwill penuh</th>
                        <th style={{ textAlign: 'right', width: 78 }}>Δ Goodwill</th>
                      </tr></thead>
                      <tbody>
                        {p22.deals.map(d => (
                          <tr key={d.id}>
                            <td style={{ fontSize: 12.5, fontWeight: 600 }}>{d.acquiree}</td>
                            <td className="mono" style={{ textAlign: 'right' }}>{fmt(d.nciAcqProp)}</td>
                            <td className="mono" style={{ textAlign: 'right', color: 'var(--ink-3)' }}>{d.own === 100 ? '—' : fmt(d.nciFair)}</td>
                            <td className="mono" style={{ textAlign: 'right' }}>{fmt(d.goodwillFull)}</td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 600, color: d.gwUplift ? 'var(--amber)' : 'var(--ink-4)' }}>{d.gwUplift ? '+' + fmt(d.gwUplift) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="row ac gap8" style={{ padding: '10px 14px', borderTop: '1px solid var(--line-soft)', background: 'var(--surface-2)' }}>
                    <span style={{ color: 'var(--navy)' }}><I.target size={14} /></span>
                    <span className="tiny" style={{ flex: 1, lineHeight: 1.5 }}>Entitas memilih metode <b>proporsional</b> (¶19a) untuk seluruh akuisisi — konsisten dengan eliminasi PSAK 65. Kolom nilai wajar bersifat <b>ilustrasi</b>: metode goodwill penuh akan menaikkan goodwill & NCI sebesar Δ tanpa mengubah angka kanonik.</span>
                  </div>
                </Panel>
              </div>

              <div className="grid" style={{ gap: 12 }}>
                <Panel title="Komposisi Goodwill" sub="kontribusi per akuisisi">
                  <div className="row gap12 ac">
                    <Donut segments={gwSegs} size={104} thickness={15}
                      center={<><div className="mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{fmt(p22.goodwillTotal)}</div><div className="tiny muted">jt</div></>} />
                    <div style={{ flex: 1, display: 'grid', gap: 6 }}>
                      {p22.deals.map((d, i) => (
                        <div key={d.id} className="row jb ac">
                          <span className="row ac gap6"><span style={{ width: 9, height: 9, borderRadius: 2, background: gwSegs[i].color }} /><span style={{ fontSize: 11.5 }}>{d.acquiree.replace('PT Sentosa ', '').replace('Sentosa ', '')}</span></span>
                          <span className="mono tiny" style={{ fontWeight: 700 }}>{fmt(d.goodwill)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Panel>
                <Panel noBody>
                  <div className="panel-h"><h3>Uji Pembelian dengan Diskon</h3><span className="sub mono">¶34-36</span></div>
                  <div className="row ac gap8" style={{ padding: '12px 14px', background: p22.bargainCount === 0 ? 'var(--green-bg)' : 'var(--amber-bg)' }}>
                    <span style={{ color: p22.bargainCount === 0 ? 'var(--green)' : 'var(--amber)' }}>{p22.bargainCount === 0 ? <I.checkCircle size={16} /> : <I.alert size={16} />}</span>
                    <span className="tiny" style={{ flex: 1, lineHeight: 1.5 }}>{p22.bargainCount === 0 ? 'Tidak ada goodwill negatif — seluruh akuisisi menghasilkan goodwill positif. Tidak ada untung pembelian diskon yang diakui.' : p22.bargainCount + ' akuisisi menunjukkan goodwill negatif — re-asses lalu akui untung (¶36).'}</span>
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {/* ================= TAB · PERIODE PENGUKURAN ================= */}
          {tab === 'periode' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div className="panel-h"><h3>Periode Pengukuran (¶45)</h3><span className="sub mono">jendela ≤ 12 bulan sejak tanggal akuisisi</span></div>
                  <table className="dtbl" style={{ width: '100%' }}>
                    <thead><tr>
                      <th style={{ textAlign: 'left' }}>Akuisisi</th>
                      <th style={{ textAlign: 'left', width: 96 }}>Tgl Akuisisi</th>
                      <th style={{ textAlign: 'center', width: 130 }}>Status Periode</th>
                      <th style={{ textAlign: 'left' }}>Catatan</th>
                    </tr></thead>
                    <tbody>
                      {p22.deals.map(d => (
                        <tr key={d.id}>
                          <td style={{ fontSize: 12.5, fontWeight: 600 }}>{d.acquiree}</td>
                          <td className="mono tiny" style={{ fontWeight: 600 }}>{d.acqDate}</td>
                          <td style={{ textAlign: 'center' }}><Badge kind="green">Ditutup (&gt;12 bln)</Badge></td>
                          <td className="tiny muted" style={{ lineHeight: 1.4 }}>Nilai PPA final; tidak ada penyesuaian provisional tersisa.</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>
                    Penyesuaian terhadap jumlah provisional hanya diperkenankan dalam <b>periode pengukuran</b> (maks 12 bulan, ¶45) dengan koreksi <b>retrospektif</b> ke goodwill. Seluruh akuisisi telah melewati jendela ini — nilai PPA bersifat final.
                  </div>
                </Panel>

                <Panel noBody>
                  <div className="panel-h"><h3>Pengukuran Kembali Imbalan Kontinjensi (¶58)</h3><span className="sub mono">perubahan NW → Laba Rugi</span><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
                  {p22.contingentItems.length === 0 ? (
                    <div className="tiny muted" style={{ padding: 14 }}>Tidak ada imbalan kontinjensi terutang pada periode berjalan.</div>
                  ) : (
                    <table className="dtbl" style={{ width: '100%' }}>
                      <thead><tr>
                        <th style={{ textAlign: 'left' }}>Akuisisi</th>
                        <th style={{ textAlign: 'right', width: 110 }}>NW awal (akuisisi)</th>
                        <th style={{ textAlign: 'right', width: 96 }}>NW kini</th>
                        <th style={{ textAlign: 'right', width: 120 }}>Untung/(rugi) L/R</th>
                      </tr></thead>
                      <tbody>
                        {p22.contingentItems.map(c => (
                          <tr key={c.id}>
                            <td style={{ fontSize: 12.5, fontWeight: 600 }}>{c.name}</td>
                            <td className="mono" style={{ textAlign: 'right' }}>{fmt(c.initial)}</td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(c.now)}</td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: c.remeasure <= 0 ? 'var(--green)' : 'var(--red)' }}>{c.remeasure <= 0 ? '+' + fmt(-c.remeasure) : '(' + fmt(c.remeasure) + ')'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>
                    Imbalan kontinjensi diklasifikasikan sebagai <b>liabilitas keuangan</b> → diukur kembali pada nilai wajar tiap tanggal pelaporan dengan perubahan diakui di <b>Laba Rugi</b> (¶58). Ini <b>bukan</b> penyesuaian periode pengukuran dan <b>tidak</b> mengubah goodwill.
                  </div>
                </Panel>
              </div>

              <Panel title="Pohon Keputusan ¶45 vs ¶58" sub="penyesuaian PPA">
                <div style={{ display: 'grid', gap: 9 }}>
                  <div className="panel" style={{ padding: '9px 11px', background: 'var(--blue-050)', borderColor: 'transparent' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>¶45 · Periode pengukuran</div>
                    <div className="tiny" style={{ lineHeight: 1.5, marginTop: 2 }}>Info baru tentang fakta yang <b>ada pada tanggal akuisisi</b>, dalam ≤12 bln → koreksi <b>retrospektif</b> ke goodwill.</div>
                  </div>
                  <div className="panel" style={{ padding: '9px 11px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)' }}>¶58 · Pengukuran kembali</div>
                    <div className="tiny" style={{ lineHeight: 1.5, marginTop: 2 }}>Perubahan akibat peristiwa <b>setelah</b> akuisisi (mis. pencapaian target earn-out) → <b>Laba Rugi</b>, tanpa mengubah goodwill.</div>
                  </div>
                </div>
              </Panel>
            </div>
          )}

          {/* ================= TAB · REKONSILIASI ================= */}
          {tab === 'rekonsiliasi' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div className="panel-h"><h3>Rekonsiliasi Angka — Satu Sumber Kebenaran</h3><span className="sub mono">model PSAK 22 ↔ modul konsumen</span></div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="dtbl" style={{ width: '100%' }}>
                      <thead><tr>
                        <th style={{ textAlign: 'left' }}>Pos</th>
                        <th style={{ textAlign: 'left', width: 230 }}>Sumber</th>
                        <th style={{ textAlign: 'right', width: 84 }}>Rp juta</th>
                        <th style={{ textAlign: 'center', width: 60 }}>Status</th>
                      </tr></thead>
                      <tbody>
                        {p22.recon.map((r, i) => (
                          <tr key={i} style={{ background: r.hi ? 'var(--blue-050)' : undefined, cursor: r.route ? 'pointer' : 'default' }} onClick={r.route ? () => nav(r.route, { from: 'psak22' }) : undefined}>
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
                    Seluruh angka mengalir dari satu seed <b>GROUP_SUBS</b> melalui fungsi kanonik <span className="mono">psak22(wtb)</span>. Goodwill yang dihitung di sini adalah <b>angka yang sama</b> dieliminasi di PSAK 65 (¶32) dan diuji penurunan nilai oleh PSAK 48 — tanpa duplikasi. Pajak tangguhan PPA & takberwujud teridentifikasi mengalir ke PSAK 46 & PSAK 19.
                  </div>
                </Panel>
              </div>

              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div className="panel-h"><h3>Keterkaitan Kertas Kerja</h3><span className="sub mono">lineage data</span></div>
                  <div className="row ac gap6" style={{ padding: '9px 14px 4px' }}><I.arrowRight size={13} style={{ color: 'var(--blue)' }} /><span className="tiny upper" style={{ fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink-3)' }}>Hulu — sumber data</span></div>
                  <div style={{ display: 'grid', gap: 6, padding: '2px 12px 10px' }}>
                    {P22_UPSTREAM.map(m => { const IconC = I[m.ic] || I.doc; return (
                      <button key={m.id} onClick={() => nav(m.id, { from: 'psak22' })} className="row ac gap9" style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', borderLeft: '3px solid var(--blue)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                        <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><IconC size={15} /></span>
                        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600 }}>{m.lbl}</div><div className="tiny muted" style={{ lineHeight: 1.35 }}>{m.rel}</div></div>
                        <I.arrowRight size={13} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                      </button>
                    ); })}
                  </div>
                  <div className="row ac gap6" style={{ padding: '4px 14px 4px', borderTop: '1px solid var(--line-soft)' }}><I.arrowRight size={13} style={{ color: 'var(--green)' }} /><span className="tiny upper" style={{ fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink-3)' }}>Hilir — pengguna angka</span></div>
                  <div style={{ display: 'grid', gap: 6, padding: '2px 12px 12px' }}>
                    {P22_DOWNSTREAM.map(m => { const IconC = I[m.ic] || I.doc; return (
                      <button key={m.id} onClick={() => nav(m.id, { from: 'psak22' })} className="row ac gap9" style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', borderLeft: '3px solid var(--green)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                        <span style={{ color: 'var(--green)', flex: '0 0 auto' }}><IconC size={15} /></span>
                        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600 }}>{m.lbl}</div><div className="tiny muted" style={{ lineHeight: 1.35 }}>{m.rel}</div></div>
                        <I.arrowRight size={13} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                      </button>
                    ); })}
                  </div>
                </Panel>
                <Panel noBody>
                  <div className="panel-h"><h3>Takberwujud Teridentifikasi PPA</h3><span className="sub mono">→ amortisasi PSAK 19</span></div>
                  <table className="dtbl" style={{ width: '100%' }}>
                    <tbody>
                      {p22.intangibles.map((f, i) => (
                        <tr key={i}>
                          <td><div className="row ac gap6"><Badge kind={FVA_KIND[f.cls]}>{FVA_LBL[f.cls]}</Badge></div><div className="tiny muted" style={{ marginTop: 2 }}>{f.deal} · {f.life} th</div></td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(f.amount)}</td>
                        </tr>
                      ))}
                      <tr style={{ borderTop: '1.5px solid var(--line-strong)', background: 'var(--surface-2)' }}>
                        <td style={{ fontWeight: 700, color: 'var(--navy)' }}>Total takberwujud teridentifikasi</td>
                        <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--navy)' }}>{fmt(p22.intangTotal)}</td>
                      </tr>
                    </tbody>
                  </table>
                </Panel>
              </div>
            </div>
          )}

          {/* ================= TAB · AUDIT ================= */}
          {tab === 'audit' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
              <Panel noBody>
                <div className="panel-h"><h3>Program Audit — Kombinasi Bisnis</h3><span className="sub mono">SA 540 · SA 600 · SA 500 (pakar)</span><div style={{ flex: 1 }} /><span className="tiny muted">{doneCount}/{p22.proc.length}</span></div>
                <table className="dtbl" style={{ width: '100%' }}>
                  <tbody>
                    {p22.proc.map((p, i) => {
                      const id = p.ref + i; const ok = !!done[id];
                      return (
                        <tr key={id} style={{ cursor: 'pointer' }} onClick={() => toggle(id)}>
                          <td style={{ width: 30, textAlign: 'center' }}>
                            <span style={{ display: 'inline-grid', placeItems: 'center', width: 18, height: 18, borderRadius: 5, border: '1.5px solid ' + (ok ? 'var(--green)' : 'var(--line-strong)'), background: ok ? 'var(--green)' : 'transparent', color: '#fff' }}>{ok && <I.check size={12} />}</span>
                          </td>
                          <td><div style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.4, color: ok ? 'var(--ink-3)' : 'var(--ink)', textDecoration: ok ? 'line-through' : 'none' }}>{p.t}</div></td>
                          <td style={{ width: 110, textAlign: 'right' }}><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{p.ref}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Panel>

              <div className="grid" style={{ gap: 12 }}>
                <Panel title="Progres Prosedur" sub="kombinasi bisnis">
                  <div className="row gap12 ac">
                    <Donut segments={[{ label: 'Selesai', value: doneCount, color: 'var(--green)' }, { label: 'Sisa', value: Math.max(0, p22.proc.length - doneCount), color: 'var(--surface-3)' }]} size={104} thickness={15}
                      center={<><div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)' }}>{score}%</div></>} />
                    <div style={{ flex: 1, display: 'grid', gap: 7 }}>
                      <P22Kv label="Prosedur selesai" v={doneCount + ' / ' + p22.proc.length} strong />
                      <div className="tiny muted" style={{ lineHeight: 1.5 }}>PPA & nilai wajar adalah <b>estimasi akuntansi signifikan</b> (SA 540) — uji kompetensi & objektivitas penilai (KJPP) serta kewajaran asumsi.</div>
                    </div>
                  </div>
                </Panel>
                <Panel noBody>
                  <div className="panel-h"><h3>Hal Audit Utama (SA 701)</h3><span className="sub mono">KAM kandidat</span></div>
                  <div className="row ac gap8" style={{ padding: '12px 14px', background: 'var(--blue-050)' }}>
                    <span style={{ color: 'var(--blue)' }}><I.star size={15} /></span>
                    <span className="tiny" style={{ flex: 1, lineHeight: 1.5 }}>Alokasi harga akuisisi & goodwill <b>Rp {fmt(p22.goodwillTotal)} jt</b> melibatkan pertimbangan signifikan (takberwujud teridentifikasi & nilai wajar) → kandidat <b>Hal Audit Utama</b>, selaras KAM goodwill (PSAK 48).</span>
                  </div>
                </Panel>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

Object.assign(window, { PSAK22View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { PSAK22View };
