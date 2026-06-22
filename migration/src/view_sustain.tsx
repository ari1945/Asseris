/* [codemod] ESM imports */
import React from 'react';
import { AMS_CANON } from './canon';
import { useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Panel } from './ui';

/* ============================================================
   Asseris — Laporan Keberlanjutan (POJK 51/2017) + ISSB
   ------------------------------------------------------------
   Jejak kepatuhan Laporan Keberlanjutan wajib (muatan minimum
   POJK 51/POJK.03/2017) di sisi klien, status RAKB per entitas,
   serta pelacak kesiapan adopsi standar pengungkapan keberlanjutan
   ISSB / IFRS S1–S2 (diadopsi DSK-IAI → SPK, didorong OJK).
   Semua data ditarik dari AMS_CANON.ojkSustain(). (Gap G13)
   ============================================================ */
const { useState: useStateSus, useMemo: useMemoSus } = React;

const SUS_ISSB_META = {
  siap:     { kind: 'green', lbl: 'Siap', color: '#1f7a4d' },
  sebagian: { kind: 'amber', lbl: 'Sebagian', color: '#9a6a00' },
  belum:    { kind: 'red',   lbl: 'Belum', color: '#b3261e' },
};

function SusCard({ value, label, sub, accent }: any) {
  return (
    <div className="panel" style={{ padding: '12px 14px', display: 'grid', gap: 2 }}>
      <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: accent || 'var(--navy)', lineHeight: 1.05 }}>{value}</div>
      <div className="tiny muted" style={{ fontWeight: 600 }}>{label}</div>
      {sub && <div className="tiny" style={{ color: 'var(--ink-4)' }}>{sub}</div>}
    </div>
  );
}

function SustainabilityView() {
  const nav = useNav();
  const loader = window.loadLS || ((k, d) => d);
  const S = useMemoSus(() => (AMS_CANON as any).ojkSustain(), []);

  const [tab, setTab] = useStateSus(() => loader('ams.sustain.tab', 'muatan'));
  const [done, setDone] = useStateSus(() => loader('ams.sustain.done', {}));
  React.useEffect(() => { try { localStorage.setItem('ams.sustain.tab', JSON.stringify(tab)); } catch (e) {} }, [tab]);
  React.useEffect(() => { try { localStorage.setItem('ams.sustain.done', JSON.stringify(done)); } catch (e) {} }, [done]);

  // overlay persisted toggles onto canon defaults
  const isDone = (it: any) => (done[it.ref] != null ? done[it.ref] : it.done);
  const toggle = (ref: any) => setDone((m: any) => ({ ...m, [ref]: !(m[ref] != null ? m[ref] : S.content.find((c: any) => c.ref === ref).done) }));
  const reqItems = S.content.filter((c: any) => !c.opt);
  const doneCount = reqItems.filter(isDone).length;
  const score = Math.round(doneCount / reqItems.length * 100);

  const TABS = [
    { id: 'muatan', label: 'Muatan Wajib POJK 51' },
    { id: 'rakb', label: 'RAKB & Entitas' },
    { id: 'issb', label: 'Kesiapan ISSB · IFRS S1–S2' },
    { id: 'jembatan', label: 'Jembatan Asurans' },
  ];

  return (
    <>
      <SubBar moduleId="sustain" right={
        <div className="row gap8 ac">
          <Badge kind="teal">POJK 51/2017</Badge>
          <Btn sm onClick={() => nav('sjah3410', { from: 'sustain' })}><I.flask size={13} /> Asurans Emisi GRK</Btn>
          <Btn sm onClick={() => nav('sectorck', { from: 'sustain' })}><I.shield size={13} /> Daftar-Uji Sektor</Btn>
          <Btn sm variant="primary" onClick={() => nav('sa720', { from: 'sustain' })}><I.doc size={14} /> SA 720 · Info Lain</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            <SusCard value={score + '%'} label="Kelengkapan Muatan SR" sub={doneCount + '/' + reqItems.length + ' muatan wajib'} accent={score === 100 ? 'var(--green)' : 'var(--amber)'} />
            <SusCard value={S.entTerbit + '/' + S.entCount} label="Entitas Menerbitkan SR" sub="LJK & Emiten terdampak" accent="var(--navy)" />
            <SusCard value={S.issbPct + '%'} label="Kesiapan ISSB" sub={S.issbReady + '/' + S.issbTotal + ' indikator siap'} accent="var(--teal)" />
            <SusCard value="4" label="Pilar RAKB" sub="Rencana Aksi Keuangan Berkelanjutan" accent="var(--blue)" />
          </div>

          <div className="row ac jb" style={{ flexWrap: 'wrap', gap: 8 }}>
            <div className="seg" style={{ width: 'fit-content', flexWrap: 'wrap' }}>
              {TABS.map(t => <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>)}
            </div>
            <span className="tiny muted">Satu sumber: <span className="mono">AMS_CANON.ojkSustain()</span></span>
          </div>

          {/* ===== TAB · MUATAN WAJIB ===== */}
          {tab === 'muatan' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
              <Panel noBody>
                <div className="panel-h"><h3>Muatan Minimum Laporan Keberlanjutan</h3><span className="sub mono">Lampiran II · SEOJK 16/2021</span><div style={{ flex: 1 }} /><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)' }}>{doneCount}/{reqItems.length}</span></div>
                <div>
                  {S.content.map((c: any, i: any) => {
                    const on = isDone(c);
                    return (
                      <label key={c.ref} className="row gap10" style={{ padding: '10px 14px', cursor: 'pointer', alignItems: 'flex-start', borderBottom: i < S.content.length - 1 ? '1px solid var(--line-soft)' : 0 }} onClick={() => toggle(c.ref)}>
                        <span style={{ flex: '0 0 16px', width: 16, height: 16, borderRadius: 4, marginTop: 1, border: '1.5px solid ' + (on ? 'var(--green)' : 'var(--line-strong)'), background: on ? 'var(--green)' : '#fff', display: 'grid', placeItems: 'center' }}>{on && <I.check size={11} style={{ color: '#fff' }} />}</span>
                        <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)', width: 46, flex: '0 0 46px', marginTop: 1 }}>{c.ref}</span>
                        <span style={{ minWidth: 0 }}>
                          <span className="row ac gap6" style={{ flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 12.5, fontWeight: 600, color: on ? 'var(--ink-3)' : 'var(--ink)' }}>{c.t}</span>
                            {c.opt && <Badge kind="gray">opsional</Badge>}
                          </span>
                          <span className="tiny muted" style={{ display: 'block', lineHeight: 1.45, marginTop: 1 }}>{c.d}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </Panel>

              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div style={{ background: 'linear-gradient(120deg,#0a5b54,#0a6b73)', color: '#fff', padding: '14px 16px' }}>
                    <div className="tiny upper" style={{ color: '#bfe3e0', letterSpacing: '.05em', marginBottom: 8 }}>Kelengkapan Laporan Keberlanjutan</div>
                    <div className="row ac gap12">
                      <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1, fontFamily: 'JetBrains Mono, monospace' }}>{score}<span style={{ fontSize: 18 }}>%</span></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,.18)', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: score + '%', background: score === 100 ? '#4ade80' : '#ffd166', borderRadius: 4, transition: '.3s' }} /></div>
                        <div className="tiny" style={{ color: '#bfe3e0', marginTop: 6 }}>{doneCount}/{reqItems.length} muatan wajib terpenuhi</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: 14 }}>
                    <div className="tiny muted" style={{ lineHeight: 1.55 }}>Laporan Keberlanjutan wajib diterbitkan terpisah atau menjadi bagian Laporan Tahunan, dengan muatan minimum sesuai Lampiran II POJK 51. Auditor menelaahnya sebagai <b>informasi lain</b> (SA 720).</div>
                  </div>
                </Panel>
                <Panel title="Dasar Hukum" sub="kerangka regulasi">
                  <div style={{ display: 'grid', gap: 7 }}>
                    {[
                      { k: 'POJK 51/POJK.03/2017', v: 'Keuangan Berkelanjutan LJK, Emiten & Perusahaan Publik' },
                      { k: 'SEOJK 16/SEOJK.04/2021', v: 'Bentuk & isi Laporan Keberlanjutan emiten' },
                      { k: 'IFRS S1 & S2 (ISSB)', v: 'Diadopsi DSK-IAI menjadi SPK; didorong OJK' },
                    ].map((r, i) => (
                      <div key={i} style={{ paddingBottom: 7, borderBottom: i < 2 ? '1px solid var(--line-soft)' : 0 }}>
                        <div className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>{r.k}</div>
                        <div className="tiny muted" style={{ lineHeight: 1.4 }}>{r.v}</div>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {/* ===== TAB · RAKB & ENTITAS ===== */}
          {tab === 'rakb' && (
            <div className="grid" style={{ gap: 12 }}>
              <Panel noBody>
                <div className="panel-h"><h3>Status Penerapan per Entitas Klien</h3><span className="sub mono">LJK & Emiten terdampak POJK 51</span></div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="dtbl" style={{ width: '100%' }}>
                    <thead><tr>
                      <th style={{ textAlign: 'left' }}>Entitas</th>
                      <th style={{ textAlign: 'left', width: 210 }}>Klasifikasi</th>
                      <th style={{ textAlign: 'center', width: 92 }}>Laporan SR</th>
                      <th style={{ textAlign: 'center', width: 110 }}>RAKB</th>
                      <th style={{ textAlign: 'center', width: 120 }}>Kesiapan ISSB</th>
                    </tr></thead>
                    <tbody>
                      {S.entities.map((e: any) => (
                        <tr key={e.id}>
                          <td><div style={{ fontSize: 12.5, fontWeight: 600 }}>{e.name}</div><div className="tiny muted">{e.phase}</div></td>
                          <td className="tiny" style={{ color: 'var(--ink-2)' }}>{e.sector}</td>
                          <td style={{ textAlign: 'center' }}><Badge kind={e.sr === 'Terbit' ? 'green' : e.sr === 'Draf' ? 'amber' : 'gray'}>{e.sr}</Badge></td>
                          <td style={{ textAlign: 'center' }}><span className="tiny mono" style={{ color: e.rakb === 'N/A' ? 'var(--ink-4)' : 'var(--ink-2)', fontWeight: 600 }}>{e.rakb}</span></td>
                          <td style={{ textAlign: 'center' }}><Badge kind={e.issb === 'Pilot' ? 'blue' : e.issb === 'Gap-assessment' ? 'amber' : 'gray'}>{e.issb}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>RAKB (Rencana Aksi Keuangan Berkelanjutan) wajib bagi LJK; bagi Emiten non-LJK kewajiban berfokus pada Laporan Keberlanjutan. Kewajiban SR diperluas ke seluruh Emiten & Perusahaan Publik sejak tahun buku 2025.</div>
              </Panel>

              <Panel noBody>
                <div className="panel-h"><h3>Rencana Aksi Keuangan Berkelanjutan (RAKB)</h3><span className="sub mono">Ps. 8 POJK 51</span></div>
                <div>
                  {S.rakb.map((r: any, i: any) => (
                    <div key={r.ref} className="row ac gap10" style={{ padding: '11px 14px', borderBottom: i < S.rakb.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                      <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--teal)', width: 64, flex: '0 0 64px' }}>{r.ref}</span>
                      <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12.5, fontWeight: 600 }}>{r.t}</div><div className="tiny muted">Target: {r.tgt}</div></div>
                      <Badge kind={r.status === 'Selesai' ? 'green' : r.status === 'Berjalan' ? 'blue' : 'amber'}>{r.status}</Badge>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          )}

          {/* ===== TAB · ISSB ===== */}
          {tab === 'issb' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
              {[{ t: 'IFRS S1 · Pengungkapan Umum Keberlanjutan', sub: 'general requirements', rows: S.issbS1 },
                { t: 'IFRS S2 · Pengungkapan Terkait Iklim', sub: 'climate-related disclosures', rows: S.issbS2 }].map((blk, bi) => (
                <Panel noBody key={bi}>
                  <div className="panel-h"><h3>{blk.t}</h3><span className="sub mono">{blk.sub}</span></div>
                  <div>
                    {blk.rows.map((r: any, i: any) => {
                      const m = (SUS_ISSB_META as any)[r.state];
                      return (
                        <div key={r.ref} className="row ac gap10" style={{ padding: '10px 14px', borderBottom: i < blk.rows.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                          <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--ink-4)', width: 44, flex: '0 0 44px' }}>{r.ref}</span>
                          <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.4 }}>{r.t}</span>
                          <span style={{ width: 9, height: 9, borderRadius: '50%', background: m.color, flex: '0 0 auto' }} />
                          <span className="tiny" style={{ width: 60, flex: '0 0 60px', textAlign: 'right', fontWeight: 600, color: m.color }}>{m.lbl}</span>
                        </div>
                      );
                    })}
                  </div>
                </Panel>
              ))}
              <div className="panel" style={{ gridColumn: '1 / -1', padding: '11px 14px', background: 'var(--teal-bg)', borderColor: 'transparent' }}>
                <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--teal)', marginTop: 1, flex: '0 0 auto' }}><I.target size={15} /></span>
                  <div style={{ fontSize: 12, lineHeight: 1.6 }}>DSK-IAI mengadopsi IFRS S1 & S2 menjadi <b>Standar Pengungkapan Keberlanjutan (SPK)</b>. Pengungkapan emisi GRK Cakupan 1–2 sudah siap (ditopang asurans <b>SJAH 3410</b>); area belum-siap utama: <b>Cakupan 3</b>, analisis skenario iklim, dan rencana transisi net-zero. Kandidat fokus pada perikatan asurans keberlanjutan (SPA 3000 / ISSA 5000).</div>
                </div>
              </div>
            </div>
          )}

          {/* ===== TAB · JEMBATAN ASURANS ===== */}
          {tab === 'jembatan' && (
            <Panel noBody>
              <div className="panel-h"><h3>Jembatan ke Perikatan Asurans & Modul Terkait</h3><span className="sub mono">lineage data</span></div>
              <div style={{ display: 'grid', gap: 7, padding: '10px 12px 12px' }}>
                {S.bridge.map((m: any) => { const IconC = (I as any)[m.icon || 'link2'] || I.link2; return (
                  <button key={m.id} onClick={() => nav(m.id, { from: 'sustain' })} className="row ac gap9" style={{ padding: '10px 12px', borderRadius: 7, border: '1px solid var(--line)', borderLeft: '3px solid var(--teal)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                    <span style={{ color: 'var(--teal)', flex: '0 0 auto' }}><IconC size={16} /></span>
                    <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12.5, fontWeight: 600 }}>{m.lbl}</div><div className="tiny muted" style={{ lineHeight: 1.4 }}>{m.rel}</div></div>
                    <I.arrowRight size={14} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                  </button>
                ); })}
              </div>
            </Panel>
          )}

          <div className="tiny muted" style={{ padding: '0 2px 4px', lineHeight: 1.5 }}>
            Modul menelusuri kewajiban Laporan Keberlanjutan (POJK 51/POJK.03/2017, efektif {S.effective}) di sisi klien — muatan minimum, RAKB per entitas, kesiapan adopsi ISSB/IFRS S1–S2, hingga jembatan ke perikatan asurans (SJAH 3410 / SPA 3000) & SA 720. Angka ditarik dari satu sumber kebenaran <span className="mono">AMS_CANON.ojkSustain()</span>; status tersimpan otomatis.
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { SustainabilityView });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SustainabilityView };
