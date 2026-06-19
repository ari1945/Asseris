/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data.js';
import { AMS_CANON } from './canon';
import { useFirm, useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Donut, Panel } from './ui.jsx';

/* ============================================================
   NeoSuite AMS — Roadmap SAK & Pelacak ISAK  (modul: sakroadmap)
   ------------------------------------------------------------
   Menutup Gap G5: sistem tak lagi sekadar memotret standar yang
   berlaku — ia mengantisipasi perubahan (horizon "terbit, belum
   efektif") & melacak interpretasi ISAK terpisah dari PSAK induk.
   Seluruh angka ditarik dari satu sumber: AMS_CANON.sakHorizon().
   Tab: Horizon SAK · Pelacak ISAK · Dampak Perikatan · Kelengkapan
   ============================================================ */
const { useState: useStateSR, useMemo: useMemoSR } = React;

/* —— peta warna status & badge —— */
const SR_STATUS = {
  efektif: { lbl: 'Efektif', kind: 'green', color: 'var(--green)', bg: 'var(--green-bg)' },
  horizon: { lbl: 'Belum efektif', kind: 'amber', color: 'var(--amber)', bg: 'var(--amber-bg)' },
  ed:      { lbl: 'Eksposur Draf', kind: 'purple', color: 'var(--purple)', bg: 'var(--purple-bg)' },
};
const SR_IMPACT = { Tinggi: 'red', Sedang: 'amber', Rendah: 'green' };
const SR_REL = {
  wajib:   { lbl: 'Wajib', kind: 'red' },
  relevan: { lbl: 'Relevan', kind: 'blue' },
  pantau:  { lbl: 'Pantau', kind: 'amber' },
  tidak:   { lbl: 'N/A', kind: 'muted' },
};

function SRStat({ value, label, sub, accent }) {
  return (
    <div className="panel" style={{ padding: '12px 14px', display: 'grid', gap: 2 }}>
      <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: accent || 'var(--navy)', lineHeight: 1.05 }}>{value}</div>
      <div className="tiny muted" style={{ fontWeight: 600 }}>{label}</div>
      {sub && <div className="tiny" style={{ color: 'var(--ink-4)' }}>{sub}</div>}
    </div>
  );
}

/* —— baris standar (dipakai di Horizon & Eksposur Draf) —— */
function SRStdRow({ s, fmt, nav, dense }) {
  const st = SR_STATUS[s.status];
  return (
    <div style={{ padding: dense ? '9px 14px' : '11px 14px', borderBottom: '1px solid var(--line-soft)' }}>
      <div className="row ac gap8" style={{ flexWrap: 'wrap' }}>
        <span className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--navy)', flex: '0 0 auto' }}>{s.code}</span>
        <Badge kind={SR_IMPACT[s.impact]}>{s.impact}</Badge>
        {s.rel && <Badge kind={SR_REL[s.rel].kind === 'muted' ? undefined : SR_REL[s.rel].kind}>{SR_REL[s.rel].lbl}</Badge>}
        <span style={{ flex: 1 }} />
        <span className="mono tiny" style={{ color: st.color, fontWeight: 700, flex: '0 0 auto' }}>{s.effective}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4, lineHeight: 1.35 }}>{s.title}</div>
      <div className="row ac gap6" style={{ marginTop: 2 }}>
        <span className="tiny muted mono">{s.ifrs}</span>
        {s.replaces && s.replaces !== '—' && <span className="tiny" style={{ color: 'var(--ink-4)' }}>· {s.replaces}</span>}
      </div>
      {!dense && <div className="tiny" style={{ color: 'var(--ink-2)', lineHeight: 1.5, marginTop: 5 }}>{s.note}</div>}
      {s.view && (
        <button onClick={() => nav(s.view, { from: 'sakroadmap' })} className="row ac gap5" style={{ marginTop: 7, padding: '4px 9px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--blue)' }}>
          <I.link2 size={11} /> Buka modul {s.code.replace('Amd. ', '')}
        </button>
      )}
    </div>
  );
}

function SAKRoadmapView() {
  const { fmt } = AMS;
  const nav = useNav();
  const firm = useFirm();
  const loader = window.loadLS || ((k, d) => d);
  const H = useMemoSR(() => AMS_CANON.sakHorizon(), []);
  const client = (firm && firm.activeClient) || { name: 'PT Sentosa Makmur Tbk', industry: 'Manufaktur · Consumer Goods', listed: true };

  const [tab, setTab] = useStateSR(() => loader('ams.sakroadmap.tab', 'horizon'));
  const [isakFilter, setIsakFilter] = useStateSR('semua');
  const [done, setDone] = useStateSR(() => loader('ams.sakroadmap.r207', {}));
  React.useEffect(() => { try { localStorage.setItem('ams.sakroadmap.tab', JSON.stringify(tab)); } catch (e) {} }, [tab]);
  React.useEffect(() => { try { localStorage.setItem('ams.sakroadmap.r207', JSON.stringify(done)); } catch (e) {} }, [done]);
  const toggle = (id) => setDone(m => ({ ...m, [id]: !m[id] }));

  const doneCount = H.readiness207.filter(r => done[r.id]).length;
  const score = Math.round(doneCount / H.readiness207.length * 100);

  const TABS = [
    { id: 'horizon', label: 'Horizon SAK' },
    { id: 'isak', label: 'Pelacak ISAK' },
    { id: 'dampak', label: 'Dampak Perikatan' },
    { id: 'lengkap', label: 'Kelengkapan Kerangka' },
  ];

  const isakShown = H.isaks.filter(i => {
    if (isakFilter === 'semua') return true;
    if (isakFilter === 'dicabut') return i.status === 'dicabut';
    return i.status === 'berlaku' && i.rel === isakFilter;
  });
  const ISAK_FILTERS = [
    { id: 'semua', label: 'Semua', n: H.isaks.length },
    { id: 'relevan', label: 'Relevan', n: H.counts.isakRelevan },
    { id: 'pantau', label: 'Pantau', n: H.isakBerlaku.filter(i => i.rel === 'pantau').length },
    { id: 'tidak', label: 'N/A', n: H.isakBerlaku.filter(i => i.rel === 'tidak').length },
    { id: 'dicabut', label: 'Dicabut', n: H.counts.isakDicabut },
  ];

  /* timeline tahun → standar */
  const yearItems = (y) => H.standards.filter(s => s.effYear === y);

  return (
    <>
      <SubBar moduleId="sakroadmap" right={
        <div className="row gap8 ac">
          <Badge kind="amber">Horizon · {H.counts.horizon} belum efektif</Badge>
          <Btn sm onClick={() => nav('disclosure', { from: 'sakroadmap' })}><I.checkCircle size={13} /> Daftar-Uji Pengungkapan</Btn>
          <Btn sm onClick={() => nav('framework', { from: 'sakroadmap' })}><I.scale size={13} /> Penentu Kerangka</Btn>
          <Btn sm variant="primary" onClick={() => setTab('dampak')}><I.target size={14} /> Dampak Perikatan</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>

          {/* summary cards */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            <SRStat value={H.counts.efektif} label="Standar efektif (FY2025)" sub="diterapkan / berlaku" accent="var(--green)" />
            <SRStat value={H.counts.horizon} label="Terbit, belum efektif" sub="wajib diungkap · PSAK 25 ¶30" accent="var(--amber)" />
            <SRStat value={H.counts.ed} label="Eksposur Draf / agenda" sub="dipantau DSAK-IAI" accent="var(--purple)" />
            <SRStat value={H.counts.isakBerlaku} label="ISAK terlacak (berlaku)" sub={'+' + H.counts.isakDicabut + ' dicabut diarsipkan'} accent="var(--navy)" />
            <SRStat value={H.counts.isakRelevan} label="ISAK relevan perikatan" sub="dinilai berdampak" accent="var(--blue)" />
          </div>

          {/* tabs */}
          <div className="row ac jb" style={{ flexWrap: 'wrap', gap: 8 }}>
            <div className="seg" style={{ width: 'fit-content', flexWrap: 'wrap' }}>
              {TABS.map(t => <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>)}
            </div>
            <span className="tiny muted">Satu sumber: <span className="mono">AMS_CANON.sakHorizon()</span> · acuan FY {H.fyEnd}</span>
          </div>

          {/* ================= TAB · HORIZON ================= */}
          {tab === 'horizon' && (
            <div className="grid" style={{ gap: 12 }}>
              {/* timeline strip */}
              <Panel noBody>
                <div className="panel-h"><h3>Garis Waktu Horizon SAK</h3><span className="sub mono">efektif 2024 → 2028</span><div style={{ flex: 1 }} /><span className="tiny muted">penanda: tutup buku {H.fyEnd}</span></div>
                <div style={{ padding: '14px 16px 18px', overflowX: 'auto' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 0, minWidth: 720, position: 'relative' }}>
                    {/* now marker antara 2025|2026 */}
                    <div style={{ position: 'absolute', left: '50%', top: -2, bottom: 8, width: 2, background: 'var(--red)', opacity: .55 }} />
                    <div className="mono tiny" style={{ position: 'absolute', left: '50%', top: -14, transform: 'translateX(-50%)', color: 'var(--red)', fontWeight: 700, whiteSpace: 'nowrap' }}>◂ diterapkan · belum efektif ▸</div>
                    {H.years.map(y => {
                      const items = yearItems(y);
                      return (
                        <div key={y} style={{ borderLeft: '1px solid var(--line)', padding: '4px 8px 0', minHeight: 130 }}>
                          <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>{y}</div>
                          <div style={{ display: 'grid', gap: 6 }}>
                            {items.map(s => {
                              const st = SR_STATUS[s.status];
                              return (
                                <div key={s.id} onClick={() => s.view && nav(s.view, { from: 'sakroadmap' })}
                                  title={s.title}
                                  style={{ padding: '6px 8px', borderRadius: 7, background: st.bg, borderLeft: '3px solid ' + st.color, cursor: s.view ? 'pointer' : 'default' }}>
                                  <div className="mono" style={{ fontSize: 11, fontWeight: 700, color: st.color }}>{s.code}</div>
                                  <div style={{ fontSize: 10.5, color: 'var(--ink-2)', lineHeight: 1.3, marginTop: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.title}</div>
                                </div>
                              );
                            })}
                            {!items.length && <span className="tiny muted">—</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="row gap14 ac" style={{ marginTop: 14, flexWrap: 'wrap' }}>
                    {Object.keys(SR_STATUS).map(k => (
                      <span key={k} className="row ac gap6"><span style={{ width: 11, height: 11, borderRadius: 3, background: SR_STATUS[k].bg, borderLeft: '3px solid ' + SR_STATUS[k].color }} /><span className="tiny" style={{ color: 'var(--ink-2)' }}>{SR_STATUS[k].lbl}</span></span>
                    ))}
                  </div>
                </div>
              </Panel>

              <div className="grid" style={{ gridTemplateColumns: '1fr 360px', gap: 12, alignItems: 'start' }}>
                {/* horizon — terbit belum efektif */}
                <Panel noBody>
                  <div className="panel-h"><h3>Terbit, Belum Efektif</h3><span className="sub mono">PSAK 25 ¶30–31 — wajib diungkap</span><div style={{ flex: 1 }} /><Badge kind="amber">{H.counts.horizon}</Badge></div>
                  <div className="row gap8" style={{ padding: '10px 14px', alignItems: 'flex-start', background: 'var(--amber-bg)' }}>
                    <span style={{ color: 'var(--amber)', marginTop: 1, flex: '0 0 auto' }}><I.alert size={15} /></span>
                    <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>Standar yang telah disahkan namun belum berlaku untuk FY2025 — <b>wajib</b> diungkap pada CALK beserta estimasi dampak penerapannya (PSAK 25 ¶30–31).</div>
                  </div>
                  {H.horizon.map(s => <SRStdRow key={s.id} s={s} fmt={fmt} nav={nav} />)}
                </Panel>

                {/* right rail */}
                <div className="grid" style={{ gap: 12 }}>
                  {/* PSAK 207 spotlight */}
                  <Panel noBody>
                    <div style={{ background: 'linear-gradient(120deg,#013a52,#005085)', color: '#fff', padding: '14px 16px' }}>
                      <div className="row ac gap8" style={{ marginBottom: 6 }}>
                        <span className="mono" style={{ border: '1.5px solid rgba(255,255,255,.4)', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 800 }}>PSAK 207</span>
                        <span style={{ fontSize: 12.5, fontWeight: 700 }}>adopsi IFRS 18</span>
                      </div>
                      <div style={{ fontSize: 12.5, lineHeight: 1.55, color: '#dbe9f2' }}>Perubahan paling berdampak di horizon: menata ulang laporan laba rugi & mengatur pengungkapan MPM. Efektif <b style={{ color: '#fff' }}>1 Jan 2027</b>, retrospektif — komparatif FY2026 disajikan ulang.</div>
                    </div>
                    <div style={{ padding: 14, display: 'grid', gap: 8 }}>
                      {[
                        ['Kategori L/R baru', 'Operasi · Investasi · Pendanaan'],
                        ['Subtotal baku', 'Laba operasi & laba sebelum pendanaan-pajak'],
                        ['MPM', 'Rekonsiliasi ukuran kinerja manajemen'],
                        ['Agregasi/disagregasi', 'Uraikan pos "lain-lain" material'],
                      ].map((r, i) => (
                        <div key={i} className="row jb ac" style={{ paddingBottom: 7, borderBottom: i < 3 ? '1px solid var(--line-soft)' : 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{r[0]}</span>
                          <span className="tiny muted" style={{ textAlign: 'right', maxWidth: 180 }}>{r[1]}</span>
                        </div>
                      ))}
                      <Btn sm variant="primary" style={{ marginTop: 2 }} onClick={() => setTab('dampak')}><I.target size={13} /> Nilai kesiapan ({score}%)</Btn>
                    </div>
                  </Panel>

                  {/* sudah efektif compact */}
                  <Panel noBody>
                    <div className="panel-h"><h3>Sudah Efektif — FY2025</h3><Badge kind="green">{H.counts.efektif}</Badge></div>
                    {H.efektif.map(s => <SRStdRow key={s.id} s={s} fmt={fmt} nav={nav} dense />)}
                  </Panel>

                  {/* eksposur draf */}
                  <Panel noBody>
                    <div className="panel-h"><h3>Eksposur Draf / Agenda DSAK</h3><Badge kind="purple">{H.counts.ed}</Badge></div>
                    {H.ed.map(s => <SRStdRow key={s.id} s={s} fmt={fmt} nav={nav} dense />)}
                  </Panel>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB · PELACAK ISAK ================= */}
          {tab === 'isak' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 320px', gap: 12, alignItems: 'start' }}>
              <Panel noBody>
                <div className="panel-h"><h3>Registri Interpretasi (ISAK)</h3><span className="sub mono">dilacak terpisah dari PSAK induk</span></div>
                <div className="row ac gap8" style={{ padding: '10px 14px', flexWrap: 'wrap' }}>
                  <div className="seg" style={{ width: 'fit-content', flexWrap: 'wrap' }}>
                    {ISAK_FILTERS.map(f => <button key={f.id} className={isakFilter === f.id ? 'on' : ''} onClick={() => setIsakFilter(f.id)}>{f.label} <span className="mono" style={{ opacity: .65 }}>{f.n}</span></button>)}
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="dtbl" style={{ width: '100%' }}>
                    <thead><tr>
                      <th style={{ textAlign: 'left', width: 78 }}>ISAK</th>
                      <th style={{ textAlign: 'left' }}>Judul & ketentuan</th>
                      <th style={{ textAlign: 'left', width: 132 }}>Menafsirkan</th>
                      <th style={{ textAlign: 'center', width: 96 }}>Relevansi</th>
                    </tr></thead>
                    <tbody>
                      {isakShown.map(i => {
                        const rel = SR_REL[i.rel];
                        const cut = i.status === 'dicabut';
                        return (
                          <tr key={i.code} onClick={() => i.view && nav(i.view, { from: 'sakroadmap' })} style={{ cursor: i.view ? 'pointer' : 'default' }}>
                            <td className="mono" style={{ fontWeight: 700, color: cut ? 'var(--ink-4)' : 'var(--navy)', textDecoration: cut ? 'line-through' : 'none' }}>{i.code}</td>
                            <td>
                              <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.3, color: cut ? 'var(--ink-3)' : 'var(--ink)' }}>{i.title}{i.view && <span className="tiny" style={{ color: 'var(--blue)', fontWeight: 600, marginLeft: 6 }}>modul ↗</span>}</div>
                              <div className="tiny muted" style={{ lineHeight: 1.4, marginTop: 1 }}>{i.note}</div>
                            </td>
                            <td className="mono tiny" style={{ color: 'var(--ink-2)' }}>{i.parent}</td>
                            <td style={{ textAlign: 'center' }}>
                              {cut ? <Badge>dicabut</Badge> : <Badge kind={rel.kind === 'muted' ? undefined : rel.kind}>{rel.lbl}</Badge>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>
                  Menampilkan {isakShown.length} dari {H.isaks.length} interpretasi. Tiap ISAK ditautkan ke PSAK induknya & dinilai relevansinya terhadap perikatan — interpretasi N/A tetap terdokumentasi agar audit-trail kelengkapan kerangka utuh.
                </div>
              </Panel>

              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div className="panel-h"><h3>Komposisi Relevansi</h3></div>
                  <div className="row gap12 ac" style={{ padding: '12px 14px' }}>
                    <Donut size={104} thickness={15}
                      segments={[
                        { label: 'Relevan', value: H.counts.isakRelevan, color: '#1d6fb8' },
                        { label: 'Pantau', value: H.isakBerlaku.filter(i => i.rel === 'pantau').length, color: '#9a6a00' },
                        { label: 'N/A', value: H.isakBerlaku.filter(i => i.rel === 'tidak').length, color: '#c3cad2' },
                      ]}
                      center={<><div className="mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{H.counts.isakBerlaku}</div><div className="tiny muted">berlaku</div></>} />
                    <div style={{ flex: 1, display: 'grid', gap: 6 }}>
                      {[['Relevan', H.counts.isakRelevan, '#1d6fb8'], ['Pantau', H.isakBerlaku.filter(i => i.rel === 'pantau').length, '#9a6a00'], ['N/A (terdok.)', H.isakBerlaku.filter(i => i.rel === 'tidak').length, '#c3cad2'], ['Dicabut', H.counts.isakDicabut, '#b3261e']].map((r, k) => (
                        <div key={k} className="row jb ac"><span className="row ac gap6"><span style={{ width: 9, height: 9, borderRadius: 2, background: r[2] }} /><span style={{ fontSize: 12, fontWeight: 600 }}>{r[0]}</span></span><span className="mono tiny" style={{ fontWeight: 700 }}>{r[1]}</span></div>
                      ))}
                    </div>
                  </div>
                </Panel>
                <Panel title="Mengapa dilacak terpisah?" sub="ISAK 32 · hierarki SAK">
                  <div className="tiny" style={{ color: 'var(--ink-2)', lineHeight: 1.6 }}>
                    Interpretasi (ISAK) mengikat setara PSAK namun sebelumnya tersamar di balik standar induk. Registri terpisah ini memastikan tidak ada interpretasi yang terlewat dinilai — landasan opini bahwa LK disusun atas kerangka pelaporan yang <b>lengkap & berterima</b> (SA 700).
                  </div>
                  <button onClick={() => nav('isak35', { from: 'sakroadmap' })} className="row ac gap6" style={{ marginTop: 10, padding: '6px 10px', borderRadius: 7, border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer', fontSize: 11.5, fontWeight: 600, color: 'var(--blue)' }}>
                    <I.users size={13} /> ISAK 35 · Entitas Nonlaba (modul mendalam)
                  </button>
                </Panel>
              </div>
            </div>
          )}

          {/* ================= TAB · DAMPAK PERIKATAN ================= */}
          {tab === 'dampak' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 360px', gap: 12, alignItems: 'start' }}>
              <Panel noBody>
                <div className="panel-h"><h3>Kesiapan PSAK 207 (IFRS 18)</h3><span className="sub mono">daftar-uji transisi</span><div style={{ flex: 1 }} /><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)' }}>{doneCount}/{H.readiness207.length}</span></div>
                <div className="row gap8" style={{ padding: '10px 14px', alignItems: 'flex-start', background: 'var(--blue-050)' }}>
                  <span style={{ color: 'var(--blue)', marginTop: 1, flex: '0 0 auto' }}><I.building size={15} /></span>
                  <div style={{ fontSize: 11.5, lineHeight: 1.5 }}><b>{client.name}</b> — {client.industry}. Entitas {client.listed ? 'terdaftar (Tbk)' : 'privat'} → penerapan PSAK 207 <b>wajib</b>. Persiapan dimulai dini agar komparatif FY2026 dapat disajikan ulang tepat waktu.</div>
                </div>
                <div>
                  {H.readiness207.map((r, i) => {
                    const on = !!done[r.id];
                    return (
                      <label key={r.id} className="row gap10" style={{ padding: '10px 14px', cursor: 'pointer', alignItems: 'flex-start', borderBottom: i < H.readiness207.length - 1 ? '1px solid var(--line-soft)' : 0 }} onClick={() => toggle(r.id)}>
                        <span style={{ flex: '0 0 16px', width: 16, height: 16, borderRadius: 4, marginTop: 1, border: '1.5px solid ' + (on ? 'var(--green)' : 'var(--line-strong)'), background: on ? 'var(--green)' : '#fff', display: 'grid', placeItems: 'center' }}>{on && <I.check size={11} style={{ color: '#fff' }} />}</span>
                        <span style={{ fontSize: 12.5, lineHeight: 1.4, color: on ? 'var(--ink-3)' : 'var(--ink)', textDecoration: on ? 'line-through' : 'none' }}>{r.t}</span>
                      </label>
                    );
                  })}
                </div>
              </Panel>

              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div style={{ background: 'linear-gradient(120deg,#013a52,#005085)', color: '#fff', padding: '14px 16px' }}>
                    <div className="tiny upper" style={{ color: '#bcd6e4', letterSpacing: '.05em', marginBottom: 8 }}>Kesiapan Transisi PSAK 207</div>
                    <div className="row ac gap12">
                      <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1, fontFamily: 'JetBrains Mono, monospace' }}>{score}<span style={{ fontSize: 18 }}>%</span></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,.18)', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: score + '%', background: score === 100 ? '#4ade80' : '#7cc6ff', borderRadius: 4, transition: '.3s' }} /></div>
                        <div className="tiny" style={{ color: '#bcd6e4', marginTop: 6 }}>{doneCount}/{H.readiness207.length} langkah persiapan</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: 14 }}>
                    <div className="tiny upper muted" style={{ fontWeight: 700, letterSpacing: '.04em', marginBottom: 8 }}>Dampak per standar horizon</div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {H.horizon.map(s => (
                        <div key={s.id} className="panel" style={{ padding: '9px 11px', boxShadow: 'none', background: 'var(--surface-2)' }}>
                          <div className="row ac gap6" style={{ marginBottom: 3 }}>
                            <span className="mono" style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--navy)' }}>{s.code}</span>
                            <Badge kind={SR_REL[s.rel].kind === 'muted' ? undefined : SR_REL[s.rel].kind}>{SR_REL[s.rel].lbl}</Badge>
                            <span style={{ flex: 1 }} />
                            <Badge kind={SR_IMPACT[s.impact]}>{s.impact}</Badge>
                          </div>
                          <div className="tiny" style={{ color: 'var(--ink-2)', lineHeight: 1.45 }}>{s.title}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Panel>

                <Panel noBody>
                  <div className="panel-h"><h3>Tindak Lanjut</h3></div>
                  <div style={{ display: 'grid', gap: 6, padding: '10px 12px 12px' }}>
                    {[
                      { id: 'disclosure', ic: 'checkCircle', lbl: 'Daftar-Uji Pengungkapan', rel: 'Tambahkan baris "standar terbit belum efektif" (PSAK 25 ¶30)' },
                      { id: 'psak1', ic: 'report', lbl: 'PSAK 1 → 207 · Penyajian LK', rel: 'Pemetaan struktur L/R lama → kategori baru' },
                      { id: 'fsgen', ic: 'report', lbl: 'FS Generator', rel: 'Mutakhirkan template ke struktur PSAK 207' },
                      { id: 'psak71', ic: 'coins', lbl: 'PSAK 71 · Instrumen Keuangan', rel: 'Amandemen klasifikasi & pengukuran (efektif 2026)' },
                    ].map(m => { const Ic = I[m.ic] || I.doc; return (
                      <button key={m.id} onClick={() => nav(m.id, { from: 'sakroadmap' })} className="row ac gap9" style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', borderLeft: '3px solid var(--blue)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                        <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><Ic size={15} /></span>
                        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600 }}>{m.lbl}</div><div className="tiny muted" style={{ lineHeight: 1.35 }}>{m.rel}</div></div>
                        <I.arrowRight size={13} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                      </button>
                    ); })}
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {/* ================= TAB · KELENGKAPAN KERANGKA ================= */}
          {tab === 'lengkap' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div className="panel-h"><h3>Audit-Trail Kelengkapan Kerangka</h3><span className="sub mono">SA 700 · PSAK 25</span></div>
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', gap: 10, padding: '12px 14px' }}>
                    {[
                      { v: H.counts.efektif + H.counts.horizon, l: 'PSAK & amandemen terdaftar', s: 'efektif + horizon', c: 'var(--navy)' },
                      { v: H.counts.isakTotal, l: 'ISAK terlacak terpisah', s: H.counts.isakBerlaku + ' berlaku · ' + H.counts.isakDicabut + ' dicabut', c: 'var(--blue)' },
                      { v: H.counts.horizon, l: 'Perubahan diantisipasi', s: 'terbit, belum efektif', c: 'var(--amber)' },
                      { v: H.counts.ed, l: 'Eksposur Draf dipantau', s: 'agenda DSAK-IAI', c: 'var(--purple)' },
                    ].map((x, i) => (
                      <div key={i} className="panel" style={{ padding: '11px 13px', boxShadow: 'none', background: 'var(--surface-2)' }}>
                        <div className="mono" style={{ fontSize: 21, fontWeight: 700, color: x.c }}>{x.v}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, marginTop: 1 }}>{x.l}</div>
                        <div className="tiny muted">{x.s}</div>
                      </div>
                    ))}
                  </div>
                  <div className="panel" style={{ margin: '0 14px 14px', padding: '11px 13px', background: 'var(--green-bg)', borderColor: 'transparent' }}>
                    <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--green)', marginTop: 1, flex: '0 0 auto' }}><I.checkCircle size={15} /></span>
                      <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                        Registri standar memotret kerangka <b>yang berlaku</b> sekaligus <b>yang akan datang</b>. Tidak ada celah PSAK/ISAK yang belum dinilai → mendukung pernyataan bahwa LK disusun atas kerangka pelaporan keuangan yang <b>berterima & lengkap</b> (SA 700), dan pengungkapan "standar terbit belum efektif" telah teridentifikasi (PSAK 25 ¶30–31).
                      </div>
                    </div>
                  </div>
                </Panel>

                <Panel noBody>
                  <div className="panel-h"><h3>Penutupan Gap G5</h3><span className="sub mono">Evaluasi Kepatuhan SAK</span></div>
                  <div style={{ padding: '4px 14px 12px', display: 'grid', gap: 0 }}>
                    {[
                      ['Horizon SAK (efektif / akan datang)', 'PSAK 207 & 208 terlacak dengan tanggal efektif'],
                      ['Pengungkapan tereduksi entitas anak', 'PSAK 208 (IFRS 19) didaftarkan & dinilai N/A untuk induk Tbk'],
                      ['Interpretasi ISAK terpisah', H.counts.isakTotal + ' ISAK (16, 30, 34, 36, …) di registri'],
                      ['Audit-trail kelengkapan kerangka', 'Tertaut SA 700 & daftar-uji pengungkapan'],
                    ].map((r, i) => (
                      <div key={i} className="row ac gap10" style={{ padding: '9px 0', borderTop: i ? '1px solid var(--line-soft)' : 0 }}>
                        <span style={{ color: 'var(--green)', flex: '0 0 auto' }}><I.check size={14} /></span>
                        <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1 }}>{r[0]}</span>
                        <span className="tiny muted" style={{ textAlign: 'right', maxWidth: 230 }}>{r[1]}</span>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>

              <div className="grid" style={{ gap: 12 }}>
                <Panel title="Tata Kelola Registri" sub="pemutakhiran berkala">
                  <div className="tiny" style={{ color: 'var(--ink-2)', lineHeight: 1.6 }}>
                    Registri ditinjau setiap rilis <b>Buku SAK</b> & pengumuman DSAK-IAI. Standar baru ditambahkan ke horizon, ISAK dicabut diarsipkan, dan relevansi per perikatan dinilai ulang saat perencanaan.
                  </div>
                  <div className="row jb ac" style={{ marginTop: 10, paddingTop: 9, borderTop: '1px solid var(--line-soft)' }}>
                    <span className="tiny muted">Tinjauan terakhir</span>
                    <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)' }}>{H.asof}</span>
                  </div>
                </Panel>
                <Panel noBody>
                  <div className="panel-h"><h3>Tautan Kerangka</h3></div>
                  <div style={{ display: 'grid', gap: 6, padding: '10px 12px 12px' }}>
                    {[
                      { id: 'framework', ic: 'scale', lbl: 'Penentu Kerangka (SAK/EP/EMKM)' },
                      { id: 'disclosure', ic: 'checkCircle', lbl: 'Daftar-Uji Pengungkapan' },
                      { id: 'compmatrix', ic: 'table', lbl: 'Matriks Kepatuhan' },
                      { id: 'opinion', ic: 'gavel', lbl: 'Audit Opinion Generator' },
                    ].map(m => { const Ic = I[m.ic] || I.doc; return (
                      <button key={m.id} onClick={() => nav(m.id, { from: 'sakroadmap' })} className="row ac gap9" style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                        <span style={{ color: 'var(--ink-3)', flex: '0 0 auto' }}><Ic size={15} /></span>
                        <span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{m.lbl}</span>
                        <I.arrowRight size={13} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                      </button>
                    ); })}
                  </div>
                </Panel>
              </div>
            </div>
          )}

          <div className="tiny muted" style={{ padding: '0 2px 4px', lineHeight: 1.5 }}>
            Roadmap SAK & Pelacak ISAK memotret kerangka pelaporan keuangan yang <b>berlaku</b> dan <b>akan datang</b> — horizon standar terbit-belum-efektif (PSAK 207/IFRS 18, PSAK 208/IFRS 19 pengungkapan tereduksi entitas anak, amandemen instrumen keuangan), registri {H.counts.isakTotal} interpretasi ISAK yang dilacak terpisah dari PSAK induk, penilaian dampak per perikatan, hingga audit-trail kelengkapan kerangka (SA 700 · PSAK 25 ¶30–31). Seluruh daftar ditarik dari satu sumber kebenaran <span className="mono">AMS_CANON.sakHorizon()</span>. Menutup Gap G5 evaluasi kepatuhan SAK.
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { SAKRoadmapView });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SAKRoadmapView };
