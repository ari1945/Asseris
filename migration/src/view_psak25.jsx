/* [codemod] ESM imports */
import React from 'react';
import { useAudit, useFirm, useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel, Tabs } from './ui.jsx';

/* ============================================================
   NeoSuite AMS — PSAK 25 · Kebijakan Akuntansi, Perubahan
   Estimasi Akuntansi & Kesalahan (IAS 8)
   ------------------------------------------------------------
   Modul "meta": tidak punya satu saldo tunggal — ia MENARIK estimasi
   dari seluruh modul akuntansi (live dari AMS_CANON / WTB) lalu:
   • Mengklasifikasikan tiap perubahan: ESTIMASI (prospektif ¶36) vs
     KEBIJAKAN (retrospektif ¶19/22) vs KESALAHAN periode lalu
     (retrospektif ¶42) vs REKLASIFIKASI penyajian (PSAK 1 ¶41).
   • Register Estimasi — satu sumber kebenaran untuk seluruh estimasi
     akuntansi entitas, tertelusur ke modul sumbernya.
   • Penyajian Kembali (restatement) — roll-forward saldo laba awal &
     dampak komparatif, ditarik dari WTB kolom `ly` + tarif pajak 22%.
   Terkait SA 540 (estimasi), SA 710 (komparatif), SA 450/240 (kesalahan),
   PSAK 1 ¶40A (posisi keuangan ketiga).
   ============================================================ */
const { useState: useStateP25, useMemo: useMemoP25, useEffect: useEffectP25 } = React;

/* warna kategori klasifikasi perubahan */
const P25_CAT = {
  estimate: { lbl: 'Perubahan Estimasi', kind: 'blue',  treat: 'Prospektif', ref: '¶36', color: 'var(--blue)' },
  policy:   { lbl: 'Perubahan Kebijakan', kind: 'amber', treat: 'Retrospektif', ref: '¶19/22', color: 'var(--amber)' },
  error:    { lbl: 'Kesalahan Periode Lalu', kind: 'red', treat: 'Retrospektif', ref: '¶42', color: 'var(--red)' },
  reclass:  { lbl: 'Reklasifikasi Penyajian', kind: 'teal', treat: 'Saji ulang komparatif', ref: 'PSAK 1 ¶41', color: 'var(--teal)' },
};

/* pohon keputusan klasifikasi (¶32 vs ¶19 vs ¶42) */
const P25_TREE = [
  { q: 'Apakah dasar pengukuran / prinsip pengakuan diubah?', yes: 'Perubahan KEBIJAKAN akuntansi', cat: 'policy',
    detail: 'Diterapkan RETROSPEKTIF: saji ulang komparatif & sesuaikan saldo laba awal periode paling awal yang disajikan (kecuali impraktis ¶23-25).' },
  { q: 'Apakah hanya revisi taksiran akibat informasi/perkembangan baru?', yes: 'Perubahan ESTIMASI akuntansi', cat: 'estimate',
    detail: 'Diterapkan PROSPEKTIF: diakui pada laba rugi periode kini & periode mendatang yang terpengaruh. Tidak ada saji ulang komparatif.' },
  { q: 'Apakah ada kelalaian / salah saji periode lalu (data tersedia saat itu)?', yes: 'KESALAHAN periode lalu', cat: 'error',
    detail: 'Dikoreksi RETROSPEKTIF: saji ulang komparatif sejak periode kesalahan terjadi & sesuaikan saldo laba awal. Bukan melalui laba rugi tahun berjalan.' },
];

/* hierarki pemilihan kebijakan akuntansi (¶10-12) */
const P25_HIER = [
  { n: 1, t: 'PSAK yang berlaku spesifik', d: 'Terapkan PSAK/ISAK yang secara khusus mengatur transaksi, peristiwa, atau kondisi tersebut.' },
  { n: 2, t: 'Pertimbangan manajemen — analogi', d: 'Bila tidak ada PSAK spesifik: gunakan persyaratan PSAK yang mengatur isu serupa & Kerangka Konseptual (definisi, pengakuan, pengukuran).' },
  { n: 3, t: 'Sumber lain', d: 'Pernyataan terkini badan penyusun standar lain (mis. IASB/IFRS) sepanjang tidak bertentangan, literatur akuntansi & praktik industri yang diterima.' },
];

/* prosedur audit PSAK 25 */
const P25_PROC = [
  { id: 'p1', ref: 'SA 250',       t: 'Evaluasi kepatuhan pemilihan & penerapan kebijakan akuntansi pada kerangka pelaporan keuangan (PSAK) yang berlaku' },
  { id: 'p2', ref: 'PSAK 25 ¶13',  t: 'Uji konsistensi kebijakan akuntansi antar-periode & antar transaksi sejenis' },
  { id: 'p3', ref: 'SA 540',       t: 'Telaah dasar & kewajaran setiap perubahan estimasi akuntansi; pastikan perlakuan prospektif (¶36)' },
  { id: 'p4', ref: 'PSAK 25 ¶32',  t: 'Bedakan perubahan kebijakan vs estimasi; bila sulit dibedakan, perlakukan sebagai perubahan estimasi (¶35)' },
  { id: 'p5', ref: 'SA 240 ¶32',   t: 'Pertimbangkan apakah kesalahan periode lalu mengindikasikan kecurangan (management override / fiktif)' },
  { id: 'p6', ref: 'SA 450/320',   t: 'Evaluasi materialitas kesalahan & akumulasikan ke SAD; tentukan apakah penyajian kembali diperlukan (¶42)' },
  { id: 'p7', ref: 'SA 710',       t: 'Verifikasi komparatif disajikan kembali secara konsisten & rujukan PY dalam opini sesuai' },
  { id: 'p8', ref: 'PSAK 1 ¶40A',  t: 'Pastikan laporan posisi keuangan KETIGA disajikan saat penyajian kembali retrospektif material' },
  { id: 'p9', ref: 'PSAK 25 ¶28/49', t: 'Telaah kecukupan pengungkapan: sifat, alasan, jumlah penyesuaian tiap pos & dampak ke EPS' },
  { id: 'p10', ref: 'SA 580/260',  t: 'Peroleh representasi tertulis & komunikasikan penyajian kembali ke TCWG' },
];

/* pengungkapan wajib (¶28-29, ¶39, ¶49) */
const P25_DISC = [
  { id: 'd1', ref: '¶29',  t: 'Sifat & alasan perubahan kebijakan akuntansi' },
  { id: 'd2', ref: '¶29',  t: 'Jumlah penyesuaian tiap pos LK terdampak (kini & komparatif)' },
  { id: 'd3', ref: '¶39',  t: 'Sifat & jumlah perubahan estimasi yang berdampak material' },
  { id: 'd4', ref: '¶49',  t: 'Sifat kesalahan periode lalu yang dikoreksi' },
  { id: 'd5', ref: '¶49',  t: 'Jumlah koreksi tiap pos LK & dampak ke laba per saham' },
  { id: 'd6', ref: 'PSAK 1 ¶40A', t: 'Laporan posisi keuangan ketiga (awal periode komparatif)' },
  { id: 'd7', ref: '¶30',  t: 'PSAK terbit namun belum berlaku efektif (dampak diketahui/diestimasi)' },
];

function P25Card({ value, label, sub, accent }) {
  return (
    <div className="panel" style={{ padding: '12px 14px', display: 'grid', gap: 2 }}>
      <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: accent || 'var(--navy)', lineHeight: 1.05 }}>{value}</div>
      <div className="tiny muted" style={{ fontWeight: 600 }}>{label}</div>
      {sub && <div className="tiny" style={{ color: 'var(--ink-4)' }}>{sub}</div>}
    </div>
  );
}

function PSAK25View() {
  const { fmt } = window.AMS;
  const firm = (typeof useFirm === 'function') ? useFirm() : {};
  const audit = (typeof useAudit === 'function') ? useAudit() : {};
  const nav = (typeof useNav === 'function') ? useNav() : (() => {});
  const loader = window.loadLS || ((k, d) => d);

  /* ——— SUMBER KEBENARAN ——— */
  const wtb = (audit && audit.wtb && audit.wtb.length) ? audit.wtb : ((window.AMS && window.AMS.WTB) || []);
  const M = useMemoP25(() => (window.AMS_CANON ? window.AMS_CANON.psak25(wtb) : null), [wtb]);

  const [tab, setTab] = useStateP25(() => loader('ams.psak25.tab', 'klasifikasi'));
  const [proc, setProc] = useStateP25(() => loader('ams.psak25.proc', {}));
  const [disc, setDisc] = useStateP25(() => loader('ams.psak25.disc', {}));
  useEffectP25(() => { try { localStorage.setItem('ams.psak25.tab', JSON.stringify(tab)); } catch (e) {} }, [tab]);
  useEffectP25(() => { try { localStorage.setItem('ams.psak25.proc', JSON.stringify(proc)); } catch (e) {} }, [proc]);
  useEffectP25(() => { try { localStorage.setItem('ams.psak25.disc', JSON.stringify(disc)); } catch (e) {} }, [disc]);

  if (!M) {
    return <><SubBar moduleId="psak25" /><div className="view-pad"><Panel title="PSAK 25"><div className="tiny muted">Lapisan kanonik (AMS_CANON) belum dimuat.</div></Panel></div></>;
  }

  const client = firm.activeClient || { name: 'PT Sentosa Makmur Tbk' };
  const eng = firm.activeEngagement || { id: 'ENG-2025-014', fy: 'FY2025' };
  const rt = M.restate;

  const procDone = P25_PROC.filter(p => proc[p.id]).length;
  const score = Math.round((procDone / P25_PROC.length) * 100);
  const discDone = P25_DISC.filter(d => disc[d.id]).length;
  const toggleProc = (id) => setProc(m => ({ ...m, [id]: !m[id] }));
  const toggleDisc = (id) => setDisc(m => ({ ...m, [id]: !m[id] }));

  const fmtJt = (v) => (v < 0 ? '(' + fmt(Math.abs(Math.round(v))) + ')' : fmt(Math.round(v)));

  const TABS = [
    { id: 'klasifikasi', label: 'Klasifikasi' },
    { id: 'estimasi', label: 'Register Estimasi', count: M.estimates.length },
    { id: 'penyajian', label: 'Penyajian Kembali' },
    { id: 'prosedur', label: 'Prosedur & Kebijakan' },
  ];

  return (
    <>
      <SubBar moduleId="psak25" right={
        <div className="row gap8 ac">
          <Badge kind="green">PSAK 25 · IAS 8</Badge>
          <Btn sm onClick={() => nav('sa540', { from: 'psak25' })}><I.target size={13} /> SA 540 · Estimasi</Btn>
          <Btn sm onClick={() => nav('sad', { from: 'psak25' })}><I.scale size={13} /> SAD Ledger</Btn>
          <Btn sm><I.download size={13} /> Kertas Kerja</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>

          {/* summary */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            <P25Card value={M.changes.length + ' perubahan'} label="Katalog perubahan & kesalahan" sub={M.counts.estimate + ' estimasi · ' + M.counts.error + ' kesalahan · ' + M.counts.policy + ' kebijakan'} accent="var(--navy)" />
            <P25Card value={M.estimates.length} label="Estimasi akuntansi terdaftar" sub="Tertelusur ke modul sumber" accent="var(--blue)" />
            <P25Card value={'Rp ' + fmt(rt.errGross) + ' jt'} label="Kesalahan periode lalu (bruto)" sub={'Neto pajak Rp ' + fmt(rt.errNet) + ' jt'} accent="var(--red)" />
            <P25Card value={'Rp ' + fmt(Math.round(rt.reOpenRestated)) + ' jt'} label="Saldo laba awal disajikan kembali" sub={'dari Rp ' + fmt(Math.round(rt.reOpenReported)) + ' jt dilaporkan'} accent="var(--amber)" />
            <P25Card value={score + '%'} label="Prosedur audit selesai" sub={procDone + '/' + P25_PROC.length + ' langkah'} accent={score === 100 ? 'var(--green)' : 'var(--navy)'} />
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
            {/* ============ LEFT ============ */}
            <div className="grid" style={{ gap: 12 }}>
              <Tabs tabs={TABS} active={tab} onChange={setTab} />

              {/* ---------- TAB: KLASIFIKASI ---------- */}
              {tab === 'klasifikasi' && <>
                <Panel noBody>
                  <div className="panel-h"><h3>Pohon Keputusan Klasifikasi</h3><span className="sub mono">¶32 · kebijakan vs estimasi vs kesalahan</span></div>
                  <div className="row gap8" style={{ padding: '10px 14px', alignItems: 'flex-start', background: 'var(--blue-050)' }}>
                    <span style={{ color: 'var(--blue)', marginTop: 1 }}><I.scale size={15} /></span>
                    <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>
                      Perlakuan akuntansi ditentukan oleh <b>klasifikasi</b>: perubahan <b>kebijakan</b> & koreksi <b>kesalahan</b> bersifat <b>retrospektif</b> (saji ulang komparatif); perubahan <b>estimasi</b> bersifat <b>prospektif</b>. Bila perubahan sulit dibedakan kebijakan vs estimasi → diperlakukan sebagai <b>estimasi</b> (¶35).
                    </div>
                  </div>
                  <div style={{ padding: 14, display: 'grid', gap: 10 }}>
                    {P25_TREE.map((node, i) => {
                      const c = P25_CAT[node.cat];
                      return (
                        <div key={i} className="panel" style={{ padding: 0, overflow: 'hidden', borderLeft: '3px solid ' + c.color }}>
                          <div className="row ac gap10" style={{ padding: '10px 12px', borderBottom: '1px solid var(--line-soft)' }}>
                            <span className="mono" style={{ fontWeight: 800, color: c.color, fontSize: 13, flex: '0 0 22px' }}>{i + 1}</span>
                            <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600 }}>{node.q}</span>
                            <Badge kind={c.kind}>{c.treat}</Badge>
                          </div>
                          <div className="row ac gap8" style={{ padding: '8px 12px 4px' }}>
                            <I.arrowRight size={13} style={{ color: c.color }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: c.color }}>{node.yes}</span>
                            <span className="mono tiny" style={{ color: 'var(--ink-4)' }}>{c.ref}</span>
                          </div>
                          <div className="tiny muted" style={{ padding: '0 12px 10px 33px', lineHeight: 1.5 }}>{node.detail}</div>
                        </div>
                      );
                    })}
                  </div>
                </Panel>

                <Panel noBody>
                  <div className="panel-h"><h3>Katalog Perubahan & Kesalahan — FY2025</h3><span className="sub mono">tertarik dari modul · live</span></div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="dtbl" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left' }}>Item</th>
                          <th style={{ textAlign: 'left', width: 130 }}>Klasifikasi</th>
                          <th style={{ textAlign: 'left', width: 56 }}>Ref</th>
                          <th style={{ textAlign: 'right', width: 78 }}>Rp juta</th>
                          <th style={{ width: 30 }} />
                        </tr>
                      </thead>
                      <tbody>
                        {M.changes.map((r) => {
                          const c = P25_CAT[r.cat];
                          return (
                            <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => r.module && nav(r.module, { from: 'psak25' })}>
                              <td>
                                <div style={{ fontSize: 12.3, fontWeight: 600, lineHeight: 1.35 }}>{r.item}</div>
                                <div className="tiny" style={{ color: c.color, fontWeight: 600 }}>{r.treat}</div>
                              </td>
                              <td><Badge kind={c.kind}>{c.lbl}</Badge></td>
                              <td className="mono tiny" style={{ color: 'var(--ink-3)' }}>{r.ref}</td>
                              <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: r.cat === 'error' ? 'var(--red)' : 'var(--ink)' }}>{r.amt != null ? fmt(Math.round(Math.abs(r.amt))) : '—'}</td>
                              <td style={{ textAlign: 'right', color: 'var(--ink-4)' }}>{r.module && <I.arrowRight size={12} />}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>
                    Klik baris untuk membuka modul sumber. Hanya <b>kesalahan</b> & sebagian <b>kebijakan</b> memicu penyajian kembali (lihat tab <b>Penyajian Kembali</b>); perubahan <b>estimasi</b> diterapkan prospektif (lihat tab <b>Register Estimasi</b>).
                  </div>
                </Panel>
              </>}

              {/* ---------- TAB: REGISTER ESTIMASI ---------- */}
              {tab === 'estimasi' && <>
                <Panel noBody>
                  <div className="panel-h"><h3>Register Estimasi Akuntansi</h3><span className="sub mono">satu sumber kebenaran · prospektif ¶36</span><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
                  <div className="row gap8" style={{ padding: '10px 14px', alignItems: 'flex-start', background: 'var(--surface-2)' }}>
                    <span style={{ color: 'var(--blue)', marginTop: 1 }}><I.sync size={15} /></span>
                    <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>
                      Setiap estimasi ditarik <b>live</b> dari modul sumbernya (Working Trial Balance & kalkulator kanonik) — bukan di-hardcode. Mengubah AJE pada satu modul mengalir konsisten ke register ini. Perubahan estimasi diakui <b>prospektif</b>.
                    </div>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="dtbl" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left' }}>Estimasi & basis</th>
                          <th style={{ textAlign: 'left', width: 116 }}>Asumsi PY → CY</th>
                          <th style={{ textAlign: 'right', width: 74 }}>Tercatat PY</th>
                          <th style={{ textAlign: 'right', width: 74 }}>Tercatat CY</th>
                          <th style={{ textAlign: 'left', width: 96 }}>Sensitivitas</th>
                          <th style={{ width: 28 }} />
                        </tr>
                      </thead>
                      <tbody>
                        {M.estimates.map((e) => {
                          const delta = e.carryCy - e.carryPy;
                          return (
                            <tr key={e.id} style={{ cursor: 'pointer' }} onClick={() => nav(e.module, { from: 'psak25' })}>
                              <td>
                                <div style={{ fontSize: 12.3, fontWeight: 600, lineHeight: 1.3 }}>{e.pos}</div>
                                <div className="tiny muted" style={{ lineHeight: 1.4 }}>{e.basis}</div>
                                <div className="row ac gap6" style={{ marginTop: 2 }}>
                                  <span className="mono tiny" style={{ color: 'var(--ink-3)' }}>{e.ref}</span>
                                  {e.kind === 'oci' && <Badge kind="purple">OCI</Badge>}
                                </div>
                              </td>
                              <td style={{ fontSize: 11 }}>
                                <span className="muted">{e.assumpPy}</span><br /><span style={{ fontWeight: 700, color: 'var(--blue)' }}>{e.assumpCy}</span>
                              </td>
                              <td className="mono" style={{ textAlign: 'right', color: 'var(--ink-3)' }}>{fmt(Math.round(e.carryPy))}</td>
                              <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>
                                {fmt(Math.round(e.carryCy))}
                                <div className="tiny" style={{ fontWeight: 600, color: delta >= 0 ? 'var(--red)' : 'var(--green)' }}>{delta >= 0 ? '+' : '−'}{fmt(Math.abs(Math.round(delta)))}</div>
                              </td>
                              <td style={{ fontSize: 11 }}>
                                <span className="mono" style={{ fontWeight: 700, color: 'var(--navy)' }}>±{fmt(Math.round(e.sens))}</span>
                                <div className="tiny muted">{e.sensLbl}</div>
                              </td>
                              <td style={{ textAlign: 'right', color: 'var(--ink-4)' }}><I.arrowRight size={12} /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: 'var(--surface-2)' }}>
                          <td colSpan={3} style={{ fontWeight: 700, fontSize: 12 }}>Total nilai tercatat estimasi (CY)</td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--navy)' }}>{fmt(Math.round(M.estTotalCy))}</td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </Panel>

                <Panel noBody>
                  <div className="panel-h"><h3>Perlakuan Prospektif</h3><span className="sub mono">¶36–38</span></div>
                  <div className="grid" style={{ padding: 14, gap: 9, gridTemplateColumns: '1fr 1fr' }}>
                    {[
                      ['Tahun berjalan', 'Dampak revisi estimasi diakui di laba rugi periode kini (mis. beban penyusutan/penurunan nilai disesuaikan).', 'var(--blue)'],
                      ['Tahun mendatang', 'Dampak diakui di periode mendatang yang terpengaruh — tanpa menyentuh saldo laba awal.', 'var(--blue)'],
                      ['Komparatif', 'TIDAK disajikan kembali — angka periode lalu tetap seperti dilaporkan.', 'var(--green)'],
                      ['Estimasi → OCI', 'Pengukuran kembali aktuaria (PSAK 24) diakui di OCI, bukan laba rugi (perlakuan PSAK terkait mendahului).', 'var(--purple)'],
                    ].map((b, i) => (
                      <div key={i} className="panel" style={{ padding: '10px 12px', borderLeft: '3px solid ' + b[2] }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: b[2], marginBottom: 3 }}>{b[0]}</div>
                        <div className="tiny muted" style={{ lineHeight: 1.45 }}>{b[1]}</div>
                      </div>
                    ))}
                  </div>
                </Panel>
              </>}

              {/* ---------- TAB: PENYAJIAN KEMBALI ---------- */}
              {tab === 'penyajian' && <>
                <Panel noBody>
                  <div className="panel-h"><h3>Roll-forward Saldo Laba — Penyajian Kembali</h3><span className="sub mono">¶42 · neto pajak 22%</span><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
                  <div className="row gap8" style={{ padding: '10px 14px', alignItems: 'flex-start', background: 'var(--red-bg, #fdecec)' }}>
                    <span style={{ color: 'var(--red)', marginTop: 1 }}><I.alert size={15} /></span>
                    <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>
                      Kesalahan periode lalu: <b>penjualan & piutang fiktif FY2024</b> (channel stuffing, R-01) teridentifikasi pada audit FY2025. Karena <b>bukan</b> revisi estimasi melainkan kelalaian data yang tersedia saat itu → dikoreksi <b>retrospektif</b>.
                    </div>
                  </div>
                  <div>
                    {[
                      { t: 'Saldo laba awal — dilaporkan sebelumnya (1 Jan 2025)', v: rt.reOpenReported, tot: true },
                      { t: 'Koreksi penjualan & piutang fiktif FY2024 (bruto)', v: -rt.errGross },
                      { t: 'Dampak pajak penghasilan koreksi (22%)', v: rt.errTax, tax: true },
                      { t: 'Saldo laba awal — disajikan kembali (1 Jan 2025)', v: rt.reOpenRestated, tot: true },
                    ].map((r, i, arr) => (
                      <div key={i} className="row ac gap10" style={{ padding: '9px 14px', borderBottom: i < arr.length - 1 ? '1px solid var(--line-soft)' : 0, background: r.tot ? 'var(--surface-2)' : 'transparent' }}>
                        <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: r.tot ? 700 : 500, color: r.tot ? 'var(--navy)' : 'var(--ink)' }}>{r.t}</div>
                        <div className="mono" style={{ width: 96, textAlign: 'right', fontWeight: 700, color: r.v < 0 ? 'var(--red)' : r.tax ? 'var(--green)' : r.tot ? 'var(--navy)' : 'var(--ink)' }}>{fmtJt(r.v)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>
                    Koreksi neto <b>Rp {fmt(rt.errNet)} jt</b> dibebankan ke saldo laba awal — <b>tidak</b> melalui laba rugi tahun berjalan. Aset pajak/utang pajak periode lalu disesuaikan sebesar Rp {fmt(rt.errTax)} jt.
                  </div>
                </Panel>

                <Panel noBody>
                  <div className="panel-h"><h3>Dampak ke Komparatif FY2024</h3><span className="sub mono">dilaporkan vs disajikan kembali</span></div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="dtbl" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left' }}>Pos Laporan Keuangan</th>
                          <th style={{ textAlign: 'right', width: 96 }}>Dilaporkan</th>
                          <th style={{ textAlign: 'right', width: 84 }}>Penyesuaian</th>
                          <th style={{ textAlign: 'right', width: 96 }}>Disajikan kembali</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rt.impact.map((r) => (
                          <tr key={r.id} style={{ background: r.bold ? 'var(--surface-2)' : 'transparent' }}>
                            <td style={{ fontSize: 12.3, fontWeight: r.bold ? 700 : 500, color: r.bold ? 'var(--navy)' : 'var(--ink)' }}>{r.label}</td>
                            <td className="mono" style={{ textAlign: 'right' }}>{fmt(Math.round(r.rep))}</td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: r.adj < 0 ? 'var(--red)' : 'var(--green)' }}>{fmtJt(r.adj)}</td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: r.bold ? 800 : 600, color: r.bold ? 'var(--navy)' : 'var(--ink)' }}>{fmt(Math.round(r.res))}</td>
                          </tr>
                        ))}
                        <tr>
                          <td style={{ fontSize: 12.3, fontWeight: 600 }}>Laba per saham dasar (Rp)</td>
                          <td className="mono" style={{ textAlign: 'right' }}>{rt.eps.reported.toFixed(1)}</td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--red)' }}>({(rt.eps.reported - rt.eps.restated).toFixed(1)})</td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{rt.eps.restated.toFixed(1)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="row ac gap8" style={{ margin: '4px 14px 12px', padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', borderLeft: '3px solid var(--teal)', background: 'var(--surface)' }}>
                    <I.table size={14} style={{ color: 'var(--teal)', flex: '0 0 auto' }} />
                    <span style={{ fontSize: 11.5, lineHeight: 1.4, flex: 1 }}>Penyajian kembali <b>material</b> → PSAK 1 ¶40A mensyaratkan <b>laporan posisi keuangan ketiga</b> per 1 Jan 2024. Komparatif diberi tanda "disajikan kembali".</span>
                    <button onClick={() => nav('sa710', { from: 'psak25' })} className="mono tiny" style={{ fontWeight: 700, color: 'var(--teal)', whiteSpace: 'nowrap', background: 'none', border: 'none', cursor: 'pointer' }}>SA 710 <I.arrowRight size={12} /></button>
                  </div>
                </Panel>
              </>}

              {/* ---------- TAB: PROSEDUR & KEBIJAKAN ---------- */}
              {tab === 'prosedur' && <>
                <Panel noBody>
                  <div className="panel-h"><h3>Prosedur Audit — PSAK 25</h3><div style={{ flex: 1 }} /><span className="tiny muted">{procDone}/{P25_PROC.length}</span></div>
                  <div>
                    {P25_PROC.map((p, i) => {
                      const on = !!proc[p.id];
                      return (
                        <label key={p.id} className="row gap10" style={{ padding: '9px 14px', cursor: 'pointer', alignItems: 'flex-start', borderBottom: i < P25_PROC.length - 1 ? '1px solid var(--line-soft)' : 0 }} onClick={() => toggleProc(p.id)}>
                          <span style={{ flex: '0 0 16px', width: 16, height: 16, borderRadius: 4, marginTop: 1, border: '1.5px solid ' + (on ? 'var(--green)' : 'var(--line-strong)'), background: on ? 'var(--green)' : '#fff', display: 'grid', placeItems: 'center' }}>{on && <I.check size={11} style={{ color: '#fff' }} />}</span>
                          <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)', width: 92, flex: '0 0 92px', marginTop: 1 }}>{p.ref}</span>
                          <span style={{ fontSize: 12, lineHeight: 1.4, color: on ? 'var(--ink-3)' : 'var(--ink)', textDecoration: on ? 'line-through' : 'none' }}>{p.t}</span>
                        </label>
                      );
                    })}
                  </div>
                </Panel>

                <Panel noBody>
                  <div className="panel-h"><h3>Hierarki Pemilihan Kebijakan Akuntansi</h3><span className="sub mono">¶10–12</span></div>
                  <div style={{ padding: 14, display: 'grid', gap: 8 }}>
                    {P25_HIER.map((h) => (
                      <div key={h.n} className="row gap10" style={{ alignItems: 'flex-start', padding: '9px 11px', borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--line-soft)' }}>
                        <span className="mono" style={{ fontWeight: 800, color: 'var(--blue)', fontSize: 14, flex: '0 0 22px' }}>{h.n}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700 }}>{h.t}</div>
                          <div className="tiny muted" style={{ lineHeight: 1.5, marginTop: 1 }}>{h.d}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="tiny muted" style={{ padding: '0 14px 12px', lineHeight: 1.5 }}>
                    Kebijakan dipilih & diterapkan <b>konsisten</b> untuk transaksi serupa (¶13). <b>Impraktis</b> (¶23-25): bila dampak retrospektif tak dapat ditentukan, terapkan secara prospektif sejak periode paling awal yang praktis.
                  </div>
                </Panel>
              </>}
            </div>

            {/* ============ RIGHT ============ */}
            <div className="grid" style={{ gap: 12 }}>

              {/* kesimpulan */}
              <Panel noBody>
                <div style={{ background: 'linear-gradient(120deg,#013a52,#005085)', color: '#fff', padding: '14px 16px' }}>
                  <div className="tiny upper" style={{ color: '#bcd6e4', letterSpacing: '.05em', marginBottom: 8 }}>Kesimpulan Audit — PSAK 25</div>
                  <div className="row ac gap12">
                    <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1, fontFamily: 'JetBrains Mono, monospace' }}>{score}<span style={{ fontSize: 18 }}>%</span></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,.18)', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: score + '%', background: score === 100 ? '#4ade80' : '#7cc6ff', borderRadius: 4, transition: '.3s' }} /></div>
                      <div className="tiny" style={{ color: '#bcd6e4', marginTop: 6 }}>{procDone}/{P25_PROC.length} prosedur · {discDone}/{P25_DISC.length} pengungkapan</div>
                    </div>
                  </div>
                </div>
                <div style={{ padding: 14 }}>
                  <div className="panel" style={{ padding: '9px 11px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
                    <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--amber)', marginTop: 1 }}><I.flag size={15} /></span>
                      <span style={{ fontSize: 11.5, lineHeight: 1.5 }}>Kesalahan periode lalu <b>Rp {fmt(rt.errGross)} jt</b> (neto pajak Rp {fmt(rt.errNet)} jt) bersifat <b>material</b> → penyajian kembali komparatif & saldo laba awal disyaratkan. Komunikasikan ke TCWG (SA 260) & ungkapkan penuh (¶49).</span>
                    </div>
                  </div>
                </div>
              </Panel>

              {/* komposisi katalog */}
              <Panel title="Komposisi Katalog" sub="berdasar klasifikasi">
                <div style={{ display: 'grid', gap: 7 }}>
                  {Object.keys(P25_CAT).map((k) => {
                    const c = P25_CAT[k];
                    const n = M.counts[k] || 0;
                    const pct = M.changes.length ? Math.round(n / M.changes.length * 100) : 0;
                    return (
                      <div key={k}>
                        <div className="row ac jb" style={{ marginBottom: 3 }}>
                          <span style={{ fontSize: 11.5 }}>{c.lbl}</span>
                          <span className="mono tiny" style={{ fontWeight: 700, color: c.color }}>{n} · {c.treat}</span>
                        </div>
                        <div style={{ height: 7, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden' }}>
                          <span style={{ display: 'block', height: '100%', width: pct + '%', background: c.color, borderRadius: 4 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Panel>

              {/* pengungkapan */}
              <Panel noBody>
                <div className="panel-h"><h3>Pengungkapan Wajib</h3><span className="sub mono">¶28-29 · ¶39 · ¶49</span><div style={{ flex: 1 }} /><span className="tiny muted">{discDone}/{P25_DISC.length}</span></div>
                <div>
                  {P25_DISC.map((d, i) => {
                    const on = !!disc[d.id];
                    return (
                      <label key={d.id} className="row gap9" style={{ padding: '8px 14px', cursor: 'pointer', alignItems: 'flex-start', borderBottom: i < P25_DISC.length - 1 ? '1px solid var(--line-soft)' : 0 }} onClick={() => toggleDisc(d.id)}>
                        <span style={{ flex: '0 0 15px', width: 15, height: 15, borderRadius: 4, marginTop: 1, border: '1.5px solid ' + (on ? 'var(--green)' : 'var(--line-strong)'), background: on ? 'var(--green)' : '#fff', display: 'grid', placeItems: 'center' }}>{on && <I.check size={10} style={{ color: '#fff' }} />}</span>
                        <span style={{ flex: 1, fontSize: 11.5, lineHeight: 1.4, color: on ? 'var(--ink-3)' : 'var(--ink)', textDecoration: on ? 'line-through' : 'none' }}>{d.t}</span>
                        <span className="mono tiny" style={{ color: 'var(--ink-4)', flex: '0 0 auto' }}>{d.ref}</span>
                      </label>
                    );
                  })}
                </div>
              </Panel>

              {/* tautan modul */}
              <Panel title="Ketertelusuran" sub="sumber estimasi & kesalahan">
                <div style={{ display: 'grid', gap: 6 }}>
                  {[
                    ['sa540', 'target', 'SA 540 · Audit Estimasi Akuntansi'],
                    ['sad', 'scale', 'SAD Ledger · Evaluasi Salah Saji'],
                    ['sa710', 'table', 'SA 710 · Informasi Komparatif'],
                    ['psak1', 'report', 'PSAK 1 · Penyajian (posisi keuangan ketiga)'],
                    ['ecl', 'target', 'Kalkulator ECL · estimasi CKPN'],
                    ['fsgen', 'report', 'Financial Statement Generator'],
                    ['compmatrix', 'table', 'Matriks Kepatuhan'],
                  ].map(([id, ic, lbl]) => {
                    const IconC = I[ic] || I.doc;
                    return (
                      <button key={id} onClick={() => nav(id, { from: 'psak25' })} className="row ac gap9" style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
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
            Kertas kerja ini menelusuri kebijakan, estimasi & kesalahan <b>{client.name}</b> ({eng.id} · {eng.fy}) terhadap PSAK 25 — estimasi ditarik live dari modul sumber (WTB & kalkulator kanonik), penyajian kembali dihitung dari komparatif FY2024 + tarif pajak 22%. Status & tab tersimpan otomatis untuk jejak audit.
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { PSAK25View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { PSAK25View };
