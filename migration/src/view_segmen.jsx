/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data.js';
import { AMS_CANON } from './canon';
import { FSGEN } from './fsgen_model.jsx';
import { useAudit, useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel, Stat, Tabs } from './ui.jsx';
import { SectionTitle } from './view_fpm_parts.jsx';

/* ============================================================
   NeoSuite AMS — Informasi Segmen (PSAK 5 / IFRS 8 → PSAK 108)
   Segmen operasi diturunkan dari disagregasi pendapatan kanonik
   (AMS_CANON.revenue) dan ditutup ke total LK (FS Generator):
     · Σ pendapatan segmen = pendapatan konsolidasian
     · Σ hasil segmen + tak-teralokasi = laba usaha
     · Σ aset segmen + tak-teralokasi = total aset
   Pendekatan manajemen (¶5): segmen = cara CODM menelaah kinerja.
   ============================================================ */
const { useState: useStateSG, useMemo: useMemoSG } = React;

/* link kecil ke modul sumber (TrSrc tidak global) */
function Src({ module, children }) {
  const nav = useNav();
  return <b onClick={() => nav(module)} style={{ color: 'var(--blue)', cursor: 'pointer', fontWeight: 600 }}>{children}</b>;
}

/* peta lini pendapatan kanonik → segmen dilaporkan + intensitas operasi */
const SEG_MAP = [
  { id: 'fmcg-seg',  label: 'Produk Konsumen (FMCG)',        streams: ['fmcg'],            margin: 0.182, assetW: 1.05, color: '#005085' },
  { id: 'indus-seg', label: 'Produk Industri & Kemasan',     streams: ['indus'],           margin: 0.141, assetW: 1.18, color: '#0a6b73' },
  { id: 'dist-seg',  label: 'Distribusi & Jasa Logistik',    streams: ['parts', 'logis', 'warr'], margin: 0.092, assetW: 0.78, color: '#5b3fa6' },
];
/* alokasi: porsi aset/liabilitas operasi yang dapat diatribusikan ke segmen */
const SEG_ASSET_PORTION = 0.72;
const SEG_LIAB_PORTION = 0.55;
const SEG_MAJOR_CUSTOMER = 0.11; // satu pelanggan (Modern Trade) > 10% → ¶34

function SegmentInfo() {
  const { fmt } = AMS;
  const { wtb } = useAudit();
  const nav = useNav();
  const [tab, setTab] = useStateSG('ikhtisar');

  const D = useMemoSG(() => {
    const rev = AMS_CANON.revenue(wtb);
    const model = FSGEN.buildModel(wtb);
    const J = (n) => n / 1e6; // full → juta
    const totalRev = rev.revBooked;                  // juta
    const opProfit = J(model.is.opProfit.cy);
    const totalAssets = J(model.bs.totalAssets.cy);
    const totalLiab = J(model.bs.totalLiab.cy);
    const byId = {}; rev.streams.forEach(s => { byId[s.id] = s; });

    let segRevSum = 0, segResSum = 0, segAssetSum = 0, segLiabSum = 0;
    const segs = SEG_MAP.map(sm => {
      const revenue = sm.streams.reduce((a, id) => a + ((byId[id] || {}).amount || 0), 0);
      const result = Math.round(revenue * sm.margin);
      segRevSum += revenue; segResSum += result;
      return { ...sm, revenue, result };
    });
    // alokasi aset/liabilitas operasi pro-rata pendapatan × bobot intensitas
    const wSum = segs.reduce((a, s) => a + s.revenue * s.assetW, 0);
    segs.forEach(s => {
      s.assets = Math.round(totalAssets * SEG_ASSET_PORTION * (s.revenue * s.assetW) / wSum);
      s.liab = Math.round(totalLiab * SEG_LIAB_PORTION * s.revenue / segRevSum);
      s.margin_pct = s.revenue ? s.result / s.revenue * 100 : 0;
      segAssetSum += s.assets; segLiabSum += s.liab;
    });
    const unallocResult = Math.round(opProfit - segResSum);      // beban korporat tak-teralokasi
    const unallocAssets = Math.round(totalAssets - segAssetSum); // kas, pajak tangguhan, investasi
    const unallocLiab = Math.round(totalLiab - segLiabSum);      // pinjaman & pajak terpusat
    const geo = rev.geo.map(g => ({ ...g }));
    return { segs, totalRev, opProfit, totalAssets, totalLiab, segRevSum, segResSum, segAssetSum,
      unallocResult, unallocAssets, unallocLiab, geo, rev,
      majorCust: Math.round(totalRev * SEG_MAJOR_CUSTOMER) };
  }, [wtb]);

  const J = (n) => 'Rp ' + fmt(n, 0) + ' jt';
  const tie = [
    { k: 'Σ pendapatan segmen = pendapatan konsolidasian', a: D.segRevSum, b: Math.round(D.totalRev), ref: 'PSAK 5 ¶28(a)', route: 'psak72' },
    { k: 'Σ hasil segmen + tak-teralokasi = laba usaha', a: D.segResSum + D.unallocResult, b: Math.round(D.opProfit), ref: 'PSAK 5 ¶28(b)', route: 'fsgen' },
    { k: 'Σ aset segmen + tak-teralokasi = total aset', a: D.segAssetSum + D.unallocAssets, b: Math.round(D.totalAssets), ref: 'PSAK 5 ¶28(c)', route: 'fsgen' },
  ].map(r => ({ ...r, diff: r.a - r.b, ok: Math.abs(r.a - r.b) <= 1 }));
  const tiePass = tie.filter(t => t.ok).length;

  const TABS = [{ id: 'ikhtisar', label: 'Ikhtisar Segmen' }, { id: 'geo', label: 'Geografis & Pelanggan' }, { id: 'recon', label: 'Rekonsiliasi' }];
  const maxRev = Math.max(...D.segs.map(s => s.revenue), 1);

  return (
    <>
      <SubBar moduleId="segmen" right={
        <div className="row gap8 ac">
          <span className="tiny mono" style={{ color: tiePass === tie.length ? 'var(--green)' : 'var(--amber)' }}>● {tiePass}/{tie.length} tie-out</span>
          <Btn sm onClick={() => nav('psak72', { from: 'segmen' })}><I.receipt size={13} /> PSAK 72</Btn>
          <Btn sm variant="primary" onClick={() => nav('fsgen', { from: 'segmen' })}><I.report size={14} /> FS Generator</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={D.segs.length + ' + 1'} label="Segmen dilaporkan + tak-teralokasi" /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={J(Math.round(D.totalRev))} label="Pendapatan konsolidasian" accent="var(--blue)" /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={J(Math.round(D.opProfit))} label="Laba usaha tersegmentasi" accent="var(--green)" /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={tiePass + '/' + tie.length} label="Rekonsiliasi ke LK" accent={tiePass === tie.length ? 'var(--green)' : 'var(--amber)'} /></div></Panel>
          </div>

          <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}>
              <Tabs tabs={TABS} active={tab} onChange={setTab} />
            </div>
            <div style={{ padding: 14 }}>

              {tab === 'ikhtisar' && <>
                <div className="tiny muted" style={{ marginBottom: 10, lineHeight: 1.5 }}>
                  Pendekatan manajemen (PSAK 5 ¶5): segmen mencerminkan komponen yang hasilnya ditelaah <b>Pengambil Keputusan Operasional (CODM)</b>. Pendapatan ditarik dari disagregasi <Src module="psak72">PSAK 72</Src>; aset & hasil dialokasikan lalu ditutup ke <Src module="fsgen">FS Generator</Src>.
                </div>
                <table className="tbl" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead><tr style={{ borderBottom: '1.5px solid var(--line-strong)' }}>
                    <th style={{ textAlign: 'left', padding: '8px 6px' }}>Segmen</th>
                    <th style={{ textAlign: 'right', padding: '8px 6px' }}>Pendapatan</th>
                    <th style={{ textAlign: 'right', padding: '8px 6px' }}>Hasil</th>
                    <th style={{ textAlign: 'right', padding: '8px 6px' }}>Margin</th>
                    <th style={{ textAlign: 'right', padding: '8px 6px' }}>Aset</th>
                    <th style={{ textAlign: 'right', padding: '8px 6px' }}>Liabilitas</th>
                  </tr></thead>
                  <tbody>
                    {D.segs.map(s => (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                        <td style={{ padding: '8px 6px' }}>
                          <div className="row ac gap8"><span style={{ width: 9, height: 9, borderRadius: 2, background: s.color, flex: '0 0 9px' }} /><b>{s.label}</b></div>
                          <div className="mini-bar" style={{ marginTop: 5, height: 4, background: 'var(--surface-3)', borderRadius: 2, overflow: 'hidden', maxWidth: 220 }}>
                            <span style={{ display: 'block', height: '100%', width: (s.revenue / maxRev * 100) + '%', background: s.color }} />
                          </div>
                        </td>
                        <td className="num mono" style={{ textAlign: 'right', padding: '8px 6px' }}>{fmt(s.revenue, 0)}</td>
                        <td className="num mono" style={{ textAlign: 'right', padding: '8px 6px', color: 'var(--green)' }}>{fmt(s.result, 0)}</td>
                        <td className="num mono" style={{ textAlign: 'right', padding: '8px 6px' }}>{fmt(s.margin_pct, 1)}%</td>
                        <td className="num mono" style={{ textAlign: 'right', padding: '8px 6px' }}>{fmt(s.assets, 0)}</td>
                        <td className="num mono" style={{ textAlign: 'right', padding: '8px 6px' }}>{fmt(s.liab, 0)}</td>
                      </tr>
                    ))}
                    <tr style={{ borderBottom: '1px solid var(--line-soft)', color: 'var(--ink-3)' }}>
                      <td style={{ padding: '8px 6px', fontStyle: 'italic' }}>Tak-teralokasi (korporat)</td>
                      <td className="num mono" style={{ textAlign: 'right', padding: '8px 6px' }}>—</td>
                      <td className="num mono" style={{ textAlign: 'right', padding: '8px 6px' }}>{fmt(D.unallocResult, 0)}</td>
                      <td className="num mono" style={{ textAlign: 'right', padding: '8px 6px' }}>—</td>
                      <td className="num mono" style={{ textAlign: 'right', padding: '8px 6px' }}>{fmt(D.unallocAssets, 0)}</td>
                      <td className="num mono" style={{ textAlign: 'right', padding: '8px 6px' }}>{fmt(D.unallocLiab, 0)}</td>
                    </tr>
                    <tr style={{ borderTop: '2px solid var(--navy)', fontWeight: 800 }}>
                      <td style={{ padding: '9px 6px' }}>Konsolidasian</td>
                      <td className="num mono" style={{ textAlign: 'right', padding: '9px 6px' }}>{fmt(Math.round(D.totalRev), 0)}</td>
                      <td className="num mono" style={{ textAlign: 'right', padding: '9px 6px' }}>{fmt(Math.round(D.opProfit), 0)}</td>
                      <td className="num mono" style={{ textAlign: 'right', padding: '9px 6px' }}>—</td>
                      <td className="num mono" style={{ textAlign: 'right', padding: '9px 6px' }}>{fmt(Math.round(D.totalAssets), 0)}</td>
                      <td className="num mono" style={{ textAlign: 'right', padding: '9px 6px' }}>{fmt(Math.round(D.totalLiab), 0)}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="tiny muted" style={{ marginTop: 8, fontStyle: 'italic' }}>Seluruh angka Rp juta. Hasil segmen = pendapatan × margin operasi segmen; selisih ke laba usaha disajikan sebagai beban korporat tak-teralokasi (¶28).</div>
              </>}

              {tab === 'geo' && <>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
                  <div>
                    <SectionTitle right={<span className="tiny muted">PSAK 5 ¶33</span>}>Pendapatan per Wilayah Geografis</SectionTitle>
                    <div style={{ display: 'grid', gap: 9 }}>
                      {D.geo.map(g => (
                        <div key={g.id}>
                          <div className="row jb tiny" style={{ marginBottom: 3 }}><span style={{ fontWeight: 600 }}>{g.label}</span><span className="mono">{fmt(g.amount, 0)} jt · {fmt(g.pct * 100, 0)}%</span></div>
                          <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: (g.pct * 100) + '%', background: g.id === 'dom' ? '#005085' : '#0a6b73' }} /></div>
                        </div>
                      ))}
                    </div>
                    <div className="panel" style={{ marginTop: 12, padding: '10px 12px', background: 'var(--surface-2)', borderColor: 'transparent' }}>
                      <div className="tiny" style={{ lineHeight: 1.55, color: 'var(--ink-2)' }}>Aset tidak lancar berlokasi <b>seluruhnya di Indonesia</b>; tidak terdapat aset material di luar negeri yang memerlukan pengungkapan terpisah (¶33(b)).</div>
                    </div>
                  </div>
                  <div>
                    <SectionTitle right={<span className="tiny muted">PSAK 5 ¶34</span>}>Pelanggan Utama</SectionTitle>
                    <div className="panel" style={{ padding: '12px 14px', borderLeft: '4px solid var(--amber)' }}>
                      <div className="row ac gap8" style={{ marginBottom: 6 }}><span style={{ color: 'var(--amber)' }}><I.alert size={16} /></span><b style={{ fontSize: 13 }}>Satu pelanggan &gt; 10% pendapatan</b></div>
                      <div className="tiny" style={{ color: 'var(--ink-2)', lineHeight: 1.55 }}>
                        Pendapatan dari satu pelanggan jaringan <b>Modern Trade</b> sebesar <b className="mono">{J(D.majorCust)}</b> ({fmt(SEG_MAJOR_CUSTOMER * 100, 0)}% pendapatan konsolidasian), terutama pada segmen <b>Produk Konsumen (FMCG)</b>. Diungkapkan sesuai ¶34 — identitas pelanggan tidak wajib disebut.
                      </div>
                    </div>
                    <div className="panel" style={{ marginTop: 10, padding: '11px 13px' }}>
                      <div className="tiny upper muted" style={{ fontWeight: 700, marginBottom: 6 }}>Risiko konsentrasi</div>
                      <div className="tiny" style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}>Konsentrasi memicu pertimbangan <Src module="risk">penilaian risiko (SA 315)</Src> dan prosedur <Src module="psak71">ECL piutang (PSAK 71)</Src> atas eksposur pelanggan tunggal.</div>
                    </div>
                  </div>
                </div>
              </>}

              {tab === 'recon' && <>
                <div className="tiny muted" style={{ marginBottom: 10, lineHeight: 1.5 }}>Total segmen direkonsiliasi ke jumlah konsolidasian pada LK (PSAK 5 ¶28). Tiap baris menutup ke modul sumbernya.</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {tie.map((t, i) => (
                    <div key={i} className="panel" style={{ padding: '11px 13px', background: t.ok ? 'var(--surface)' : 'var(--amber-bg)', cursor: t.route ? 'pointer' : 'default' }} onClick={() => t.route && nav(t.route, { from: 'segmen' })}>
                      <div className="row ac gap8" style={{ marginBottom: 5 }}>
                        <span style={{ color: t.ok ? 'var(--green)' : 'var(--amber)' }}>{t.ok ? <I.checkCircle size={16} /> : <I.alert size={16} />}</span>
                        <span style={{ fontWeight: 600, fontSize: 12.5, flex: 1 }}>{t.k}</span>
                        <Badge kind="gray">{t.ref}</Badge>
                      </div>
                      <div className="row" style={{ paddingLeft: 24, fontFamily: 'var(--mono)', fontSize: 11.5 }}>
                        <div style={{ flex: 1 }}><div className="tiny muted">Σ Segmen</div><b>{fmt(t.a, 0)}</b></div>
                        <div style={{ flex: 1 }}><div className="tiny muted">LK</div><b>{fmt(t.b, 0)}</b></div>
                        <div style={{ flex: 1 }}><div className="tiny muted">Selisih</div><b style={{ color: t.ok ? 'var(--green)' : 'var(--red)' }}>{fmt(t.diff, 0)}</b></div>
                      </div>
                    </div>
                  ))}
                </div>
              </>}

            </div>
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { SegmentInfo });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SegmentInfo };
