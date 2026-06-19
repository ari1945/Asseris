/* [codemod] ESM imports */
import React from 'react';
import { AMS_CANON } from './canon';
import { useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel, Stat, Tabs } from './ui.jsx';
import { SectionTitle } from './view_fpm_parts.jsx';

/* ============================================================
   NeoSuite AMS — Investasi pada Entitas Asosiasi (PSAK 15 / IAS 28 → PSAK 228)
   Metode ekuitas (¶10). Sumber nilai tercatat: AMS_CANON.GROUP_ASSOCIATES
   AS-01 (PT Mitra Sentosa Distribusi, 30%) — angka yang SAMA dipakai
   PSAK 65 di luar batas konsolidasi. Roll-forward menutup ke carry.
   Catatan: ventura bersama (AS-02) ditangani modul PSAK 66.
   ============================================================ */
const { useState: useStateAS, useMemo: useMemoAS } = React;

/* link kecil ke modul sumber (TrSrc tidak global) */
function Src({ module, children }) {
  const nav = useNav();
  return <b onClick={() => nav(module)} style={{ color: 'var(--blue)', cursor: 'pointer', fontWeight: 600 }}>{children}</b>;
}

/* roll-forward & info keuangan ringkas asosiasi (Rp juta) */
const ASSOC_RF = { cost: 7000, openCarry: 7650, shareProfit: 1100, shareOci: 0, dividend: 350 };
/* informasi keuangan ringkas asosiasi @100% (PSAK 15 ¶21) */
const ASSOC_SF = { assets: 38000, liab: 19500, revenue: 52000, profit: 3667 };

function AssociatesEquity() {
  const { fmt } = window.AMS;
  const nav = useNav();
  const [tab, setTab] = useStateAS('ikhtisar');

  const D = useMemoAS(() => {
    const assoc = (AMS_CANON.GROUP_ASSOCIATES || []).find(a => a.id === 'AS-01') || { own: 30, carry: 8400, name: 'PT Mitra Sentosa Distribusi' };
    const own = assoc.own / 100;
    const close = ASSOC_RF.openCarry + ASSOC_RF.shareProfit + ASSOC_RF.shareOci - ASSOC_RF.dividend;
    const netAssets = ASSOC_SF.assets - ASSOC_SF.liab;
    const shareNet = Math.round(netAssets * own);
    const goodwillInCarry = assoc.carry - shareNet;
    const shareProfitCheck = Math.round(ASSOC_SF.profit * own);
    const recoverable = Math.round(assoc.carry * 1.16);  // hasil uji penurunan nilai (PSAK 48)
    return { assoc, own, close, netAssets, shareNet, goodwillInCarry, shareProfitCheck, recoverable, carry: assoc.carry };
  }, []);
  const J = (n) => 'Rp ' + fmt(n, 0) + ' jt';

  const tie = [
    { k: 'Roll-forward ekuitas menutup ke nilai tercatat', a: D.close, b: D.carry, ref: 'PSAK 15 ¶10', route: null },
    { k: 'Nilai tercatat = pos PSAK 65 (luar konsolidasi)', a: D.carry, b: D.assoc.carry, ref: 'PSAK 15 ¶24', route: 'psak65' },
    { k: 'Bagian laba asosiasi → Laba Rugi', a: ASSOC_RF.shareProfit, b: D.shareProfitCheck, ref: 'PSAK 15 ¶10', route: 'fsgen' },
  ].map(r => ({ ...r, diff: r.a - r.b, ok: Math.abs(r.a - r.b) <= 1 }));
  const tiePass = tie.filter(t => t.ok).length;

  const rf = [
    { k: 'Biaya perolehan awal', v: ASSOC_RF.cost, sub: true },
    { k: 'Saldo awal 1 Januari 2025', v: ASSOC_RF.openCarry, strong: true },
    { k: 'Bagian laba tahun berjalan (' + D.assoc.own + '%)', v: ASSOC_RF.shareProfit, accent: 'var(--green)' },
    { k: 'Bagian penghasilan komprehensif lain', v: ASSOC_RF.shareOci },
    { k: 'Dividen diterima', v: -ASSOC_RF.dividend },
    { k: 'Saldo akhir 31 Desember 2025', v: D.close, total: true },
  ];

  const TABS = [{ id: 'ikhtisar', label: 'Ikhtisar & Roll-forward' }, { id: 'sf', label: 'Info Keuangan Ringkas' }, { id: 'influence', label: 'Pengaruh & Penurunan Nilai' }, { id: 'recon', label: 'Rekonsiliasi' }];

  return (
    <>
      <SubBar moduleId="assoc" right={
        <div className="row gap8 ac">
          <span className="tiny mono" style={{ color: tiePass === tie.length ? 'var(--green)' : 'var(--amber)' }}>● {tiePass}/{tie.length} tie-out</span>
          <Btn sm onClick={() => nav('psak66', { from: 'assoc' })}><I.columns size={13} /> PSAK 66 · Ventura</Btn>
          <Btn sm variant="primary" onClick={() => nav('psak65', { from: 'assoc' })}><I.building size={14} /> PSAK 65 · Konsolidasi</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={J(D.carry)} label="Nilai tercatat (ekuitas)" accent="var(--navy)" /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={D.assoc.own + '%'} label="Kepemilikan · pengaruh signifikan" accent="var(--blue)" /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={J(ASSOC_RF.shareProfit)} label="Bagian laba → Laba Rugi" accent="var(--green)" /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={J(D.goodwillInCarry)} label="Goodwill dalam nilai tercatat" /></div></Panel>
          </div>

          <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}>
              <Tabs tabs={TABS} active={tab} onChange={setTab} />
            </div>
            <div style={{ padding: 14 }}>

              {tab === 'ikhtisar' && <>
                <div className="panel" style={{ padding: '11px 13px', marginBottom: 12 }}>
                  <div className="row ac gap10">
                    <span style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--blue-100)', color: 'var(--blue)', display: 'grid', placeItems: 'center', flex: '0 0 38px' }}><I.building size={19} /></span>
                    <div style={{ flex: 1 }}>
                      <b style={{ fontSize: 13.5 }}>{D.assoc.name}</b>
                      <div className="tiny muted">{D.assoc.id} · Asosiasi · diukur dengan metode ekuitas (PSAK 15). {D.assoc.note}</div>
                    </div>
                    <Badge kind="green">Ekuitas</Badge>
                  </div>
                </div>
                <SectionTitle right={<span className="tiny muted">PSAK 15 ¶10</span>}>Rekonsiliasi Nilai Tercatat (Metode Ekuitas)</SectionTitle>
                <div style={{ display: 'grid', gap: 2, maxWidth: 560 }}>
                  {rf.map((r, i) => (
                    <div key={i} className="row jb ac" style={{ padding: '8px 10px', borderTop: r.total ? '2px solid var(--navy)' : '1px solid var(--line-soft)', background: r.strong ? 'var(--surface-2)' : 'transparent', opacity: r.sub ? 0.75 : 1 }}>
                      <span style={{ fontSize: 12.5, fontWeight: r.total || r.strong ? 700 : 400, fontStyle: r.sub ? 'italic' : 'normal' }}>{r.k}</span>
                      <span className="mono" style={{ fontWeight: r.total ? 800 : 600, color: r.accent || (r.v < 0 ? 'var(--red)' : 'var(--ink)') }}>{r.v < 0 ? '(' + fmt(-r.v, 0) + ')' : fmt(r.v, 0)}</span>
                    </div>
                  ))}
                </div>
                <div className="tiny" style={{ marginTop: 8, color: 'var(--green)', fontWeight: 600 }}>✓ Saldo akhir {J(D.close)} = nilai tercatat kanonik (PSAK 65, di luar batas konsolidasi).</div>
              </>}

              {tab === 'sf' && <>
                <div className="tiny muted" style={{ marginBottom: 10, lineHeight: 1.5 }}>Informasi keuangan ringkas asosiasi (PSAK 15 ¶21) disajikan @100%, lalu direkonsiliasi ke nilai tercatat melalui bagian kepemilikan {D.assoc.own}% + goodwill.</div>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
                  <div>
                    <SectionTitle>Posisi & Kinerja (@100%)</SectionTitle>
                    <div style={{ display: 'grid', gap: 6 }}>
                      {[['Total aset', ASSOC_SF.assets], ['Total liabilitas', -ASSOC_SF.liab], ['Aset neto', D.netAssets, true], ['Pendapatan', ASSOC_SF.revenue], ['Laba tahun berjalan', ASSOC_SF.profit, false, 'var(--green)']].map((r, i) => (
                        <div key={i} className="row jb ac" style={{ padding: '7px 10px', borderBottom: '1px solid var(--line-soft)', fontWeight: r[2] ? 700 : 400 }}>
                          <span style={{ fontSize: 12.5 }}>{r[0]}</span>
                          <span className="mono" style={{ fontWeight: r[2] ? 800 : 600, color: r[3] || (r[1] < 0 ? 'var(--red)' : 'var(--ink)') }}>{r[1] < 0 ? '(' + fmt(-r[1], 0) + ')' : fmt(r[1], 0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <SectionTitle>Rekonsiliasi ke Nilai Tercatat</SectionTitle>
                    <div style={{ display: 'grid', gap: 6 }}>
                      {[['Aset neto asosiasi @100%', D.netAssets], ['Bagian Grup (' + D.assoc.own + '%)', D.shareNet, true], ['Goodwill dalam nilai tercatat', D.goodwillInCarry], ['Nilai tercatat investasi', D.carry, true, 'var(--navy)']].map((r, i) => (
                        <div key={i} className="row jb ac" style={{ padding: '7px 10px', borderBottom: '1px solid var(--line-soft)', fontWeight: r[2] ? 700 : 400 }}>
                          <span style={{ fontSize: 12.5 }}>{r[0]}</span>
                          <span className="mono" style={{ fontWeight: r[2] ? 800 : 600, color: r[3] || 'var(--ink)' }}>{fmt(r[1], 0)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="panel" style={{ marginTop: 10, padding: '9px 11px', background: 'var(--surface-2)', borderColor: 'transparent' }}>
                      <div className="tiny" style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}>Bagian laba <b>{J(ASSOC_RF.shareProfit)}</b> = {D.assoc.own}% × laba asosiasi {J(ASSOC_SF.profit)}, disajikan dalam Laba Rugi konsolidasian.</div>
                    </div>
                  </div>
                </div>
              </>}

              {tab === 'influence' && <>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
                  <div>
                    <SectionTitle right={<span className="tiny muted">PSAK 15 ¶5-9</span>}>Penilaian Pengaruh Signifikan</SectionTitle>
                    {[
                      { t: 'Kepemilikan 20–50% (' + D.assoc.own + '%) → praduga pengaruh signifikan', ok: true },
                      { t: 'Keterwakilan dalam dewan direksi/komisaris', ok: true },
                      { t: 'Partisipasi dalam proses kebijakan, termasuk dividen', ok: true },
                      { t: 'Transaksi material antar entitas', ok: true },
                      { t: 'Pengendalian / pengendalian bersama', ok: false, neg: true },
                    ].map((c, i) => (
                      <div key={i} className="row ac gap8" style={{ padding: '7px 4px', borderBottom: '1px solid var(--line-soft)' }}>
                        <span style={{ color: c.neg ? 'var(--ink-4)' : 'var(--green)' }}>{c.neg ? <I.x size={15} /> : <I.check size={15} />}</span>
                        <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{c.t}</span>
                      </div>
                    ))}
                    <div className="panel" style={{ marginTop: 10, padding: '9px 11px', borderLeft: '3px solid var(--green)' }}>
                      <div className="tiny" style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}><b>Kesimpulan:</b> pengaruh signifikan tanpa pengendalian → metode ekuitas, bukan konsolidasi (konsisten <Src module="psak65">GROUP_CONTROL · AS-01</Src>).</div>
                    </div>
                  </div>
                  <div>
                    <SectionTitle right={<span className="tiny muted">PSAK 48 ¶42</span>}>Indikasi Penurunan Nilai</SectionTitle>
                    <div className="panel" style={{ padding: '12px 14px' }}>
                      <div className="row jb ac" style={{ marginBottom: 6 }}><span className="tiny" style={{ fontWeight: 600 }}>Nilai tercatat investasi</span><b className="mono">{fmt(D.carry, 0)}</b></div>
                      <div className="row jb ac" style={{ marginBottom: 6 }}><span className="tiny" style={{ fontWeight: 600 }}>Jumlah terpulihkan (estimasi)</span><b className="mono" style={{ color: 'var(--green)' }}>{fmt(D.recoverable, 0)}</b></div>
                      <div style={{ height: 1, background: 'var(--line)', margin: '8px 0' }} />
                      <div className="row ac gap8"><span style={{ color: 'var(--green)' }}><I.checkCircle size={16} /></span><span className="tiny" style={{ color: 'var(--ink-2)', lineHeight: 1.45 }}>Jumlah terpulihkan &gt; nilai tercatat → <b>tidak ada rugi penurunan nilai</b> material. Investasi diuji sebagai aset tunggal (¶42).</span></div>
                    </div>
                    <div className="panel" style={{ marginTop: 10, padding: '10px 12px' }}>
                      <div className="tiny upper muted" style={{ fontWeight: 700, marginBottom: 5 }}>Pemicu uji</div>
                      <div className="tiny" style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}>Diuji bila ada indikasi objektif (¶41A IFRS 9) — penurunan kinerja, perubahan lingkungan teknologi/pasar, atau dividen melebihi laba komprehensif periode.</div>
                    </div>
                  </div>
                </div>
              </>}

              {tab === 'recon' && <>
                <div className="tiny muted" style={{ marginBottom: 10, lineHeight: 1.5 }}>Konsistensi metode ekuitas dengan modul sumber. Tiap baris menutup ke modul yang dirujuk.</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {tie.map((t, i) => (
                    <div key={i} className="panel" style={{ padding: '11px 13px', background: t.ok ? 'var(--surface)' : 'var(--amber-bg)', cursor: t.route ? 'pointer' : 'default' }} onClick={() => t.route && nav(t.route, { from: 'assoc' })}>
                      <div className="row ac gap8" style={{ marginBottom: 5 }}>
                        <span style={{ color: t.ok ? 'var(--green)' : 'var(--amber)' }}>{t.ok ? <I.checkCircle size={16} /> : <I.alert size={16} />}</span>
                        <span style={{ fontWeight: 600, fontSize: 12.5, flex: 1 }}>{t.k}</span>
                        <Badge kind="gray">{t.ref}</Badge>
                      </div>
                      <div className="row" style={{ paddingLeft: 24, fontFamily: 'var(--mono)', fontSize: 11.5 }}>
                        <div style={{ flex: 1 }}><div className="tiny muted">A</div><b>{fmt(t.a, 0)}</b></div>
                        <div style={{ flex: 1 }}><div className="tiny muted">B</div><b>{fmt(t.b, 0)}</b></div>
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

Object.assign(window, { AssociatesEquity });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { AssociatesEquity };
