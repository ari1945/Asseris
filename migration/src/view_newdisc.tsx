/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAudit, useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel, Stat, Tabs } from './ui.jsx';
import { SectionTitle } from './view_fpm_parts.jsx';

/* ============================================================
   NeoSuite AMS — Pengungkapan Baru 2024
   Tiga pengungkapan yang menonjol pada LK efektif 2024:
     · Pilar Dua OECD — pajak tambahan global (amandemen PSAK 46/212)
     · Dampak Perubahan Iklim (Lampiran C) — pengaruh ke estimasi
     · Pendanaan Pemasok (supplier finance) — amandemen PSAK 2/7
   ============================================================ */
const { useState: useStateND, useMemo: useMemoND } = React;

/* link kecil ke modul sumber (TrSrc tidak global) */
function Src({ module, children }) {
  const nav = useNav();
  return <b onClick={() => nav(module)} style={{ color: 'var(--blue)', cursor: 'pointer', fontWeight: 600 }}>{children}</b>;
}

/* Pilar Dua — ETR per yurisdiksi (Rp juta) */
const P2_JURIS = [
  { juris: 'Indonesia (induk & anak)', profit: 44200, tax: 9724, etr: 22.0, inScope: true },
  { juris: 'Singapura (Sentosa Trading Pte)', profit: 6100, tax: 640, etr: 10.5, inScope: true },
  { juris: 'Lainnya', profit: 1200, tax: 240, etr: 20.0, inScope: false },
];
const P2_MIN_RATE = 15.0;

/* Pendanaan pemasok (Rp juta) */
const SF = {
  carrying: 8600, asTradePayable: 8600, asBorrowing: 0,
  rangeDays: '90–150 hari', normalTerms: '30–60 hari',
  drawn: 8600, providers: 2,
};

function NewDisclosures2024() {
  const { fmt } = AMS;
  const { wtb } = useAudit();
  const nav = useNav();
  const [tab, setTab] = useStateND('pilar2');

  const D = useMemoND(() => {
    const totProfit = P2_JURIS.reduce((a, j) => a + j.profit, 0);
    const totTax = P2_JURIS.reduce((a, j) => a + j.tax, 0);
    const etrGroup = totProfit ? totTax / totProfit * 100 : 0;   // blended ETR konsisten dgn tabel yurisdiksi
    const lowTax = P2_JURIS.filter(j => j.inScope && j.etr < P2_MIN_RATE);
    const topUp = lowTax.reduce((a, j) => a + Math.round(j.profit * (P2_MIN_RATE - j.etr) / 100), 0);
    return { etrGroup, lowTax, topUp };
  }, [wtb]);
  const J = (n) => 'Rp ' + fmt(n, 0) + ' jt';

  const TABS = [{ id: 'pilar2', label: 'Pilar Dua (Top-up Tax)' }, { id: 'iklim', label: 'Perubahan Iklim' }, { id: 'supplier', label: 'Pendanaan Pemasok' }];

  const CLIMATE_AREAS = [
    { area: 'Umur manfaat & nilai residu aset tetap', impact: 'Transisi rendah-karbon dapat mempercepat keusangan mesin → peninjauan umur manfaat.', ref: 'PSAK 16', route: 'psak16' },
    { area: 'Uji penurunan nilai (UPK & goodwill)', impact: 'Asumsi arus kas & tingkat diskonto memasukkan risiko transisi/fisik iklim.', ref: 'PSAK 48', route: 'psak48' },
    { area: 'Kerugian kredit ekspektasian (ECL)', impact: 'Overlay forward-looking mempertimbangkan eksposur pelanggan sektor sensitif-iklim.', ref: 'PSAK 71', route: 'psak71' },
    { area: 'Provisi & liabilitas lingkungan', impact: 'Kewajiban restorasi/emisi dinilai bila ada kewajiban kini akibat regulasi.', ref: 'PSAK 57', route: 'psak48' },
    { area: 'Kelangsungan usaha', impact: 'Risiko iklim material dipertimbangkan dalam penilaian going concern.', ref: 'PSAK 1', route: 'goingconcern' },
  ];

  return (
    <>
      <SubBar moduleId="newdisc" right={
        <div className="row gap8 ac">
          <Badge kind="amber">Baru · efektif 2024</Badge>
          <Btn sm onClick={() => nav('psak46', { from: 'newdisc' })}><I.receipt size={13} /> PSAK 46</Btn>
          <Btn sm variant="primary" onClick={() => nav('fsgen', { from: 'newdisc' })}><I.report size={14} /> FS Generator</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>
          <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}>
              <Tabs tabs={TABS} active={tab} onChange={setTab} />
            </div>
            <div style={{ padding: 14 }}>

              {tab === 'pilar2' && <>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 12 }}>
                  <Panel><div style={{ padding: '11px 14px' }}><Stat value={P2_MIN_RATE.toFixed(0) + '%'} label="Tarif minimum efektif (GloBE)" accent="var(--navy)" /></div></Panel>
                  <Panel><div style={{ padding: '11px 14px' }}><Stat value={fmt(D.etrGroup, 1) + '%'} label="ETR grup konsolidasian" accent={D.etrGroup >= P2_MIN_RATE ? 'var(--green)' : 'var(--amber)'} /></div></Panel>
                  <Panel><div style={{ padding: '11px 14px' }}><Stat value={J(D.topUp)} label="Estimasi eksposur top-up tax" accent="var(--amber)" /></div></Panel>
                </div>
                <div className="panel" style={{ padding: '11px 13px', marginBottom: 12, borderLeft: '4px solid var(--blue)' }}>
                  <div className="tiny" style={{ color: 'var(--ink-2)', lineHeight: 1.55 }}>
                    <b>Pengecualian sementara (amandemen PSAK 46/212):</b> Grup <b>menerapkan pengecualian wajib</b> dari pengakuan & pengungkapan aset/liabilitas pajak tangguhan yang timbul dari aturan Pilar Dua OECD. Legislasi belum berlaku efektif di Indonesia pada periode pelaporan; Grup mengungkapkan eksposur yang <b>diketahui/dapat diestimasi secara wajar</b>.
                  </div>
                </div>
                <SectionTitle right={<span className="tiny muted">ETR per yurisdiksi</span>}>Profil Pajak per Yurisdiksi</SectionTitle>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead><tr style={{ borderBottom: '1.5px solid var(--line-strong)' }}>
                    <th style={{ textAlign: 'left', padding: '7px 6px' }}>Yurisdiksi</th>
                    <th style={{ textAlign: 'right', padding: '7px 6px' }}>Laba sebelum pajak</th>
                    <th style={{ textAlign: 'right', padding: '7px 6px' }}>Beban pajak</th>
                    <th style={{ textAlign: 'right', padding: '7px 6px' }}>ETR</th>
                    <th style={{ textAlign: 'right', padding: '7px 6px' }}>Top-up</th>
                  </tr></thead>
                  <tbody>
                    {P2_JURIS.map((j, i) => {
                      const tu = j.inScope && j.etr < P2_MIN_RATE ? Math.round(j.profit * (P2_MIN_RATE - j.etr) / 100) : 0;
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                          <td style={{ padding: '7px 6px' }}><b>{j.juris}</b>{!j.inScope && <span className="tiny muted"> · di luar cakupan</span>}</td>
                          <td className="num mono" style={{ textAlign: 'right', padding: '7px 6px' }}>{fmt(j.profit, 0)}</td>
                          <td className="num mono" style={{ textAlign: 'right', padding: '7px 6px' }}>{fmt(j.tax, 0)}</td>
                          <td className="num mono" style={{ textAlign: 'right', padding: '7px 6px', color: j.etr < P2_MIN_RATE && j.inScope ? 'var(--amber)' : 'var(--ink-2)', fontWeight: 700 }}>{fmt(j.etr, 1)}%</td>
                          <td className="num mono" style={{ textAlign: 'right', padding: '7px 6px', color: tu ? 'var(--amber)' : 'var(--ink-4)' }}>{tu ? fmt(tu, 0) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="tiny muted" style={{ marginTop: 8, fontStyle: 'italic' }}>Yurisdiksi dengan ETR &lt; 15% (mis. Singapura) memicu potensi pajak tambahan saat legislasi berlaku. Angka indikatif Rp juta.</div>
              </>}

              {tab === 'iklim' && <>
                <div className="panel" style={{ padding: '11px 13px', marginBottom: 12, background: 'var(--teal-bg)', borderColor: 'transparent' }}>
                  <div className="tiny" style={{ color: 'var(--ink-2)', lineHeight: 1.55 }}>
                    <b>Lampiran C — Dampak perubahan iklim.</b> Grup menilai dampak risiko iklim (fisik & transisi) terhadap estimasi dan pertimbangan dalam LK. Pengungkapan dijaga <b>konsisten</b> dengan laporan keberlanjutan/manajemen (kewajiban pelaporan emisi). Tidak terdapat dampak penyesuai material teridentifikasi pada periode ini.
                  </div>
                </div>
                <SectionTitle right={<span className="tiny muted">Area terdampak</span>}>Pengaruh Iklim terhadap Estimasi Akuntansi</SectionTitle>
                <div style={{ display: 'grid', gap: 8 }}>
                  {CLIMATE_AREAS.map((c, i) => (
                    <div key={i} className="panel" style={{ padding: '11px 13px', cursor: 'pointer' }} onClick={() => nav(c.route, { from: 'newdisc' })}>
                      <div className="row ac gap8" style={{ marginBottom: 3 }}>
                        <span style={{ color: 'var(--teal)' }}><I.pulse size={15} /></span>
                        <b style={{ fontSize: 12.5, flex: 1 }}>{c.area}</b>
                        <Badge kind="gray">{c.ref}</Badge>
                        <I.arrowRight size={13} style={{ color: 'var(--ink-4)' }} />
                      </div>
                      <div className="tiny" style={{ color: 'var(--ink-2)', lineHeight: 1.45, paddingLeft: 23 }}>{c.impact}</div>
                    </div>
                  ))}
                </div>
                <div className="panel" style={{ marginTop: 12, padding: '10px 12px', background: 'var(--surface-2)', borderColor: 'transparent' }}>
                  <div className="tiny" style={{ color: 'var(--ink-3)', lineHeight: 1.5 }}>Bersinggungan dengan jasa <b>asurans emisi GRK (SJAH 3410)</b> — kandidat layanan keberlanjutan firma di <Src module="compmatrix">Matriks Kepatuhan</Src>.</div>
                </div>
              </>}

              {tab === 'supplier' && <>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 12 }}>
                  <Panel><div style={{ padding: '11px 14px' }}><Stat value={J(SF.carrying)} label="Nilai tercatat dalam pengaturan" accent="var(--navy)" /></div></Panel>
                  <Panel><div style={{ padding: '11px 14px' }}><Stat value={SF.rangeDays} label="Rentang jatuh tempo" accent="var(--blue)" /></div></Panel>
                  <Panel><div style={{ padding: '11px 14px' }}><Stat value={SF.normalTerms} label="Termin normal pemasok" /></div></Panel>
                </div>
                <div className="panel" style={{ padding: '11px 13px', marginBottom: 12, borderLeft: '4px solid var(--blue)' }}>
                  <div className="tiny" style={{ color: 'var(--ink-2)', lineHeight: 1.55 }}>
                    <b>Amandemen PSAK 2 & PSAK 7 (efektif 2024).</b> Grup mengikat pengaturan pendanaan pemasok dengan {SF.providers} penyedia keuangan. Karena karakteristiknya tetap menyerupai utang dagang, liabilitas disajikan sebagai <b>Utang Usaha</b>, bukan pinjaman — dengan pengungkapan terpisah atas nilai tercatat, jangka waktu, dan dampak likuiditas.
                  </div>
                </div>
                <SectionTitle right={<span className="tiny muted">Penyajian & klasifikasi</span>}>Ikhtisar Pengaturan</SectionTitle>
                <div style={{ display: 'grid', gap: 6, maxWidth: 620 }}>
                  {[
                    ['Disajikan sebagai utang usaha', SF.asTradePayable],
                    ['Disajikan sebagai pinjaman', SF.asBorrowing],
                    ['Telah ditarik penyedia (dibayar lebih awal ke pemasok)', SF.drawn],
                  ].map((r, i) => (
                    <div key={i} className="row jb ac" style={{ padding: '8px 10px', borderBottom: '1px solid var(--line-soft)' }}>
                      <span style={{ fontSize: 12.5 }}>{r[0]}</span>
                      <span className="mono" style={{ fontWeight: 600 }}>{fmt(r[1] as any, 0)}</span>
                    </div>
                  ))}
                </div>
                <div className="panel" style={{ marginTop: 12, padding: '10px 12px' }}>
                  <div className="tiny upper muted" style={{ fontWeight: 700, marginBottom: 5 }}>Risiko likuiditas</div>
                  <div className="tiny" style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}>Konsentrasi pembayaran pada penyedia pendanaan dapat meningkatkan risiko likuiditas bila fasilitas ditarik. Dampak arus kas diungkapkan terpisah dalam <Src module="fsgen">Laporan Arus Kas</Src> (PSAK 2).</div>
                </div>
              </>}

            </div>
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { NewDisclosures2024 });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { NewDisclosures2024 };
