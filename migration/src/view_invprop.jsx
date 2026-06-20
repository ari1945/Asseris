/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel, Stat, Tabs } from './ui.jsx';
import { SectionTitle } from './view_fpm_parts.jsx';

/* ============================================================
   NeoSuite AMS — Properti Investasi (PSAK 13 / IAS 40 → PSAK 240)
   Model nilai wajar (¶33). Roll-forward menutup: saldo awal +
   penambahan + keuntungan nilai wajar − pelepasan = saldo akhir.
   Nilai wajar Level 3 (KJPP/MAPPI) dengan input takteramati.
   ============================================================ */
const { useState: useStateIVP, useMemo: useMemoIVP } = React;

/* portofolio properti investasi (Rp juta) — sub-ledger kanonik modul */
const IP_PORTFOLIO = [
  { id: 'IP-01', name: 'Menara Sentosa — Lantai Disewakan', use: 'Perkantoran disewakan', city: 'Jakarta', fv: 9200, area: 6400, yield: 7.25, occ: 0.94, level: 3 },
  { id: 'IP-02', name: 'Sentosa Plaza — Ruang Ritel', use: 'Ritel disewakan', city: 'Bekasi', fv: 4148, area: 3100, yield: 8.10, occ: 0.88, level: 3 },
  { id: 'IP-03', name: 'Tanah Cikarang', use: 'Dimiliki untuk apresiasi modal', city: 'Cikarang', fv: 2400, area: 12000, yield: null, occ: null, level: 3 },
];
const IP_ROLL = { open: 13575, additions: 1200, fvGain: 1373, disposals: 400 }; // close = 15.748
const IP_PL = { rental: 1860, directOpexRented: 320, directOpexVacant: 45 };
const IP_SENS = [
  { k: 'Imbal hasil ekuivalen (yield) +0,50%', impact: -915, note: 'Kenaikan yield menurunkan nilai kapitalisasi' },
  { k: 'Nilai sewa pasar (ERV) +5%', impact: 720, note: 'Kenaikan ERV menaikkan arus kas sewa' },
  { k: 'Tingkat hunian −5%', impact: -480, note: 'Penurunan okupansi menurunkan NOI' },
];

function InvestmentProperty() {
  const { fmt } = AMS;
  const nav = useNav();
  const [tab, setTab] = useStateIVP('porto');

  const D = useMemoIVP(() => {
    const close = IP_ROLL.open + IP_ROLL.additions + IP_ROLL.fvGain - IP_ROLL.disposals;
    const fvSum = IP_PORTFOLIO.reduce((a, p) => a + p.fv, 0);
    const noi = IP_PL.rental - IP_PL.directOpexRented;
    return { close, fvSum, noi, tie: close === fvSum };
  }, []);
  const J = (n) => 'Rp ' + fmt(n, 0) + ' jt';

  const TABS = [{ id: 'porto', label: 'Portofolio & Nilai Wajar' }, { id: 'roll', label: 'Roll-forward & Laba Rugi' }, { id: 'level', label: 'Hierarki & Sensitivitas' }, { id: 'audit', label: 'Prosedur Audit' }];

  const rf = [
    { k: 'Saldo awal 1 Januari 2025', v: IP_ROLL.open, strong: true },
    { k: 'Penambahan (akuisisi & belanja modal)', v: IP_ROLL.additions },
    { k: 'Keuntungan nilai wajar — neto (Laba Rugi)', v: IP_ROLL.fvGain, accent: 'var(--green)' },
    { k: 'Pelepasan', v: -IP_ROLL.disposals },
    { k: 'Saldo akhir 31 Desember 2025', v: D.close, total: true },
  ];

  return (
    <>
      <SubBar moduleId="invprop" right={
        <div className="row gap8 ac">
          <span className="tiny mono" style={{ color: D.tie ? 'var(--green)' : 'var(--red)' }}>● Roll-forward {D.tie ? 'menutup' : 'selisih'}</span>
          <Btn sm onClick={() => nav('psak68', { from: 'invprop' })}><I.layers size={13} /> PSAK 68 · Nilai Wajar</Btn>
          <Btn sm variant="primary" onClick={() => nav('expert', { from: 'invprop' })}><I.shield size={14} /> Pakar (SA 620)</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={J(D.fvSum)} label="Nilai wajar (Level 3)" accent="var(--navy)" /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={J(IP_ROLL.fvGain)} label="Keuntungan NW → Laba Rugi" accent="var(--green)" /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={J(IP_PL.rental)} label="Pendapatan sewa" accent="var(--blue)" /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={J(D.noi)} label="Hasil operasi neto (NOI)" /></div></Panel>
          </div>

          <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}>
              <Tabs tabs={TABS} active={tab} onChange={setTab} />
            </div>
            <div style={{ padding: 14 }}>

              {tab === 'porto' && <>
                <div className="tiny muted" style={{ marginBottom: 10, lineHeight: 1.5 }}>Properti investasi diukur pada <b>nilai wajar</b> (PSAK 13 ¶33); perubahan diakui di laba rugi. Properti dimiliki untuk memperoleh sewa dan/atau apresiasi modal — bukan dipakai sendiri (¶7).</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead><tr style={{ borderBottom: '1.5px solid var(--line-strong)' }}>
                    <th style={{ textAlign: 'left', padding: '8px 6px' }}>Properti</th>
                    <th style={{ textAlign: 'left', padding: '8px 6px' }}>Penggunaan</th>
                    <th style={{ textAlign: 'right', padding: '8px 6px' }}>Luas (m²)</th>
                    <th style={{ textAlign: 'right', padding: '8px 6px' }}>Yield</th>
                    <th style={{ textAlign: 'right', padding: '8px 6px' }}>Hunian</th>
                    <th style={{ textAlign: 'right', padding: '8px 6px' }}>Nilai Wajar</th>
                  </tr></thead>
                  <tbody>
                    {IP_PORTFOLIO.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                        <td style={{ padding: '8px 6px' }}><b>{p.name}</b><div className="tiny muted mono">{p.id} · {p.city} · Level {p.level}</div></td>
                        <td style={{ padding: '8px 6px', color: 'var(--ink-2)' }}>{p.use}</td>
                        <td className="num mono" style={{ textAlign: 'right', padding: '8px 6px' }}>{fmt(p.area, 0)}</td>
                        <td className="num mono" style={{ textAlign: 'right', padding: '8px 6px' }}>{p.yield != null ? fmt(p.yield, 2) + '%' : '—'}</td>
                        <td className="num mono" style={{ textAlign: 'right', padding: '8px 6px' }}>{p.occ != null ? fmt(p.occ * 100, 0) + '%' : '—'}</td>
                        <td className="num mono" style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 700 }}>{fmt(p.fv, 0)}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: '2px solid var(--navy)', fontWeight: 800 }}>
                      <td style={{ padding: '9px 6px' }} colSpan={5}>Jumlah properti investasi</td>
                      <td className="num mono" style={{ textAlign: 'right', padding: '9px 6px' }}>{fmt(D.fvSum, 0)}</td>
                    </tr>
                  </tbody>
                </table>
              </>}

              {tab === 'roll' && <>
                <div className="grid" style={{ gridTemplateColumns: '1.2fr 1fr', gap: 16, alignItems: 'start' }}>
                  <div>
                    <SectionTitle right={<span className="tiny muted">PSAK 13 ¶76</span>}>Rekonsiliasi Nilai Tercatat</SectionTitle>
                    <div style={{ display: 'grid', gap: 2 }}>
                      {rf.map((r, i) => (
                        <div key={i} className="row jb ac" style={{ padding: '8px 10px', borderTop: r.total ? '2px solid var(--navy)' : '1px solid var(--line-soft)', background: r.strong ? 'var(--surface-2)' : 'transparent' }}>
                          <span style={{ fontSize: 12.5, fontWeight: r.total || r.strong ? 700 : 400 }}>{r.k}</span>
                          <span className="mono" style={{ fontWeight: r.total ? 800 : 600, color: r.accent || (r.v < 0 ? 'var(--red)' : 'var(--ink)') }}>{r.v < 0 ? '(' + fmt(-r.v, 0) + ')' : fmt(r.v, 0)}</span>
                        </div>
                      ))}
                    </div>
                    {D.tie && <div className="tiny" style={{ marginTop: 8, color: 'var(--green)', fontWeight: 600 }}>✓ Saldo akhir roll-forward = Σ nilai wajar portofolio ({J(D.fvSum)}).</div>}
                  </div>
                  <div>
                    <SectionTitle right={<span className="tiny muted">¶75(f)</span>}>Diakui di Laba Rugi</SectionTitle>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <div className="panel" style={{ padding: '10px 12px' }}><div className="row jb"><span className="tiny" style={{ fontWeight: 600 }}>Pendapatan sewa</span><b className="mono" style={{ color: 'var(--green)' }}>{fmt(IP_PL.rental, 0)}</b></div></div>
                      <div className="panel" style={{ padding: '10px 12px' }}><div className="row jb"><span className="tiny" style={{ fontWeight: 600 }}>Beban operasi langsung — properti menghasilkan sewa</span><b className="mono">({fmt(IP_PL.directOpexRented, 0)})</b></div></div>
                      <div className="panel" style={{ padding: '10px 12px' }}><div className="row jb"><span className="tiny" style={{ fontWeight: 600 }}>Beban operasi langsung — properti tanpa sewa</span><b className="mono">({fmt(IP_PL.directOpexVacant, 0)})</b></div></div>
                      <div className="panel" style={{ padding: '10px 12px', borderLeft: '4px solid var(--green)' }}><div className="row jb"><span className="tiny" style={{ fontWeight: 700 }}>Keuntungan nilai wajar — neto</span><b className="mono" style={{ color: 'var(--green)' }}>{fmt(IP_ROLL.fvGain, 0)}</b></div></div>
                    </div>
                  </div>
                </div>
              </>}

              {tab === 'level' && <>
                <div className="panel" style={{ padding: '11px 13px', marginBottom: 12, background: 'var(--purple-bg)', borderColor: 'transparent' }}>
                  <div className="row ac gap8"><Badge kind="purple">Level 3</Badge><span className="tiny" style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}>Seluruh nilai wajar menggunakan <b>input takteramati signifikan</b> (PSAK 68 ¶86). Penilaian oleh KJPP independen ber-izin MAPPI dengan metode pendapatan (kapitalisasi/DCF).</span></div>
                </div>
                <SectionTitle right={<span className="tiny muted">PSAK 68 ¶93(h)</span>}>Input Takteramati Utama</SectionTitle>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
                  <div className="panel" style={{ padding: '11px 13px' }}><div className="tiny upper muted" style={{ fontWeight: 700 }}>Imbal hasil ekuivalen</div><div className="mono" style={{ fontSize: 19, fontWeight: 700, color: 'var(--navy)' }}>7,25–8,10%</div><div className="tiny muted">Benchmark transaksi pasar</div></div>
                  <div className="panel" style={{ padding: '11px 13px' }}><div className="tiny upper muted" style={{ fontWeight: 700 }}>Nilai sewa pasar (ERV)</div><div className="mono" style={{ fontSize: 19, fontWeight: 700, color: 'var(--navy)' }}>Rp 0,9–2,4 jt/m²</div><div className="tiny muted">Per bulan, per kelas aset</div></div>
                  <div className="panel" style={{ padding: '11px 13px' }}><div className="tiny upper muted" style={{ fontWeight: 700 }}>Tingkat hunian</div><div className="mono" style={{ fontSize: 19, fontWeight: 700, color: 'var(--navy)' }}>88–94%</div><div className="tiny muted">Stabil vs tahun lalu</div></div>
                </div>
                <SectionTitle right={<span className="tiny muted">¶93(h)(ii)</span>}>Analisis Sensitivitas Nilai Wajar</SectionTitle>
                <div style={{ display: 'grid', gap: 7 }}>
                  {IP_SENS.map((s, i) => (
                    <div key={i} className="panel" style={{ padding: '10px 12px' }}>
                      <div className="row jb ac">
                        <span style={{ fontSize: 12.5, fontWeight: 600 }}>{s.k}<div className="tiny muted" style={{ fontWeight: 400 }}>{s.note}</div></span>
                        <span className="mono" style={{ fontWeight: 700, color: s.impact < 0 ? 'var(--red)' : 'var(--green)' }}>{s.impact < 0 ? '(' + fmt(-s.impact, 0) + ')' : '+' + fmt(s.impact, 0)} jt</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>}

              {tab === 'audit' && <>
                <div className="tiny muted" style={{ marginBottom: 10, lineHeight: 1.5 }}>Nilai wajar Level 3 merupakan <b>estimasi akuntansi risiko tinggi</b> (SA 540) yang bergantung pada pekerjaan pakar (SA 620/500).</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {[
                    { ref: 'SA 620 ¶9-11', t: 'Evaluasi kompetensi, kapabilitas & objektivitas KJPP — izin Kemenkeu, keanggotaan MAPPI, independensi dari manajemen.', route: 'expert' },
                    { ref: 'SA 540 ¶13', t: 'Uji kewajaran input takteramati (yield, ERV, hunian) terhadap data pasar & transaksi pembanding.', route: 'sa540' },
                    { ref: 'SA 500 ¶8', t: 'Telaah laporan penilaian: ruang lingkup, tanggal penilaian, metode (pendapatan vs pasar), dan asumsi kunci.', route: 'evidence' },
                    { ref: 'PSAK 68', t: 'Verifikasi klasifikasi hierarki nilai wajar (Level 3) dan kelengkapan pengungkapan input & sensitivitas.', route: 'psak68' },
                    { ref: 'SA 240', t: 'Pertimbangan risiko kecurangan atas estimasi nilai wajar (bias manajemen menaikkan laba via keuntungan NW).', route: 'sa240' },
                  ].map((p, i) => (
                    <div key={i} className="panel" style={{ padding: '11px 13px', cursor: 'pointer' }} onClick={() => nav(p.route, { from: 'invprop' })}>
                      <div className="row ac gap8"><Badge kind="blue">{p.ref}</Badge><span style={{ fontSize: 12.5, flex: 1, color: 'var(--ink-2)' }}>{p.t}</span><I.arrowRight size={14} style={{ color: 'var(--ink-4)' }} /></div>
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

Object.assign(window, { InvestmentProperty });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { InvestmentProperty };
