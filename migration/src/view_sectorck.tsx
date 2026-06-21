/* [codemod] ESM imports */
import React from 'react';
import { AMS_CANON } from './canon';
import { useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel } from './ui.jsx';

/* ============================================================
   Asseris — Daftar-Uji Audit Spesifik-Sektor Jasa Keuangan
   ------------------------------------------------------------
   Profil regulatori & daftar-uji audit per sektor jasa keuangan:
   bank (kualitas aset/CKPN, KPMM, BMPK), asuransi (RBC, interaksi
   PSAK 117), pembiayaan/multifinance (gearing, NPF), serta emiten
   pasar modal (format & muatan LK per POJK 4/2022 & SEOJK).
   Data ditarik dari AMS_CANON.ojkSector(). (Gap G14)
   ============================================================ */
const { useState: useStateSec, useMemo: useMemoSec } = React;

function SecCard({ value, label, sub, accent }: any) {
  return (
    <div className="panel" style={{ padding: '12px 14px', display: 'grid', gap: 2 }}>
      <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: accent || 'var(--navy)', lineHeight: 1.05 }}>{value}</div>
      <div className="tiny muted" style={{ fontWeight: 600 }}>{label}</div>
      {sub && <div className="tiny" style={{ color: 'var(--ink-4)' }}>{sub}</div>}
    </div>
  );
}

function SectorChecklistView() {
  const nav = useNav();
  const loader = window.loadLS || ((k, d) => d);
  const S = useMemoSec(() => (AMS_CANON as any).ojkSector(), []);

  const [sec, setSec] = useStateSec(() => loader('ams.sectorck.sec', 'pembiayaan'));
  const [done, setDone] = useStateSec(() => loader('ams.sectorck.done', {}));
  React.useEffect(() => { try { localStorage.setItem('ams.sectorck.sec', JSON.stringify(sec)); } catch (e) {} }, [sec]);
  React.useEffect(() => { try { localStorage.setItem('ams.sectorck.done', JSON.stringify(done)); } catch (e) {} }, [done]);

  const cur = S.sectors.find(s => s.id === sec) || S.sectors[0];
  const isDone = (it) => (done[it.ref] != null ? done[it.ref] : it.done);
  const toggle = (ref) => { const it = cur.checks.find(c => c.ref === ref); setDone(m => ({ ...m, [ref]: !(m[ref] != null ? m[ref] : it.done) })); };
  const curDone = cur.checks.filter(isDone).length;
  const curPct = Math.round(curDone / cur.checks.length * 100);

  return (
    <>
      <SubBar moduleId="sectorck" right={
        <div className="row gap8 ac">
          <Badge kind="blue">Sektor Jasa Keuangan</Badge>
          <Btn sm onClick={() => nav('fsgen', { from: 'sectorck' })}><I.report size={13} /> Generator LK</Btn>
          <Btn sm onClick={() => nav('disclosure', { from: 'sectorck' })}><I.checkCircle size={13} /> Daftar-Uji Pengungkapan</Btn>
          <Btn sm variant="primary" onClick={() => nav('ojkfiling', { from: 'sectorck' })}><I.clock size={14} /> Batas Waktu OJK/BEI</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            <SecCard value={S.sectors.length} label="Profil Sektor Tercakup" sub="bank · asuransi · pembiayaan · emiten" accent="var(--navy)" />
            <SecCard value={S.pct + '%'} label="Daftar-Uji Selesai" sub={S.doneChecks + '/' + S.allChecks + ' prosedur'} accent={S.pct === 100 ? 'var(--green)' : 'var(--amber)'} />
            <SecCard value={cur.label} label="Sektor Aktif" sub={cur.clientName || cur.client} accent={cur.accent} />
            <SecCard value={cur.regs.length} label="Acuan Regulasi" sub="POJK & SEOJK terkait" accent="var(--blue)" />
          </div>

          {/* sector picker */}
          <div className="row gap8" style={{ flexWrap: 'wrap' }}>
            {S.sectors.map(s => {
              const IconC = I[s.icon] || I.shield;
              const on = s.id === sec;
              const sd = s.checks.filter(c => (done[c.ref] != null ? done[c.ref] : c.done)).length;
              return (
                <button key={s.id} onClick={() => setSec(s.id)} className="row ac gap8" style={{ padding: '9px 13px', borderRadius: 9, cursor: 'pointer', textAlign: 'left',
                  border: '1px solid ' + (on ? s.accent : 'var(--line)'), background: on ? s.accent : 'var(--surface)', color: on ? '#fff' : 'var(--ink)', boxShadow: on ? 'var(--shadow)' : 'none' }}>
                  <IconC size={16} style={{ color: on ? '#fff' : s.accent, flex: '0 0 auto' }} />
                  <span>
                    <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700 }}>{s.label}</span>
                    <span className="tiny mono" style={{ color: on ? 'rgba(255,255,255,.8)' : 'var(--ink-4)' }}>{sd}/{s.checks.length} uji</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
            {/* checklist */}
            <Panel noBody>
              <div className="panel-h"><h3>Daftar-Uji Regulatori — {cur.label}</h3><div style={{ flex: 1 }} /><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)' }}>{curDone}/{cur.checks.length}</span></div>
              <div className="row gap8" style={{ padding: '10px 14px', alignItems: 'flex-start', background: 'var(--surface-2)' }}>
                <span style={{ color: cur.accent, marginTop: 1, flex: '0 0 auto' }}><I.shield size={15} /></span>
                <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>Entitas <b>{cur.clientName || cur.client}</b> tunduk pada ketentuan kehati-hatian & pelaporan OJK sektoral. Daftar-uji menambah prosedur khusus di atas program audit umum.</div>
              </div>
              <div>
                {cur.checks.map((c, i) => {
                  const on = isDone(c);
                  return (
                    <div key={c.ref} className="row gap10" style={{ padding: '10px 14px', alignItems: 'flex-start', borderBottom: i < cur.checks.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                      <span onClick={() => toggle(c.ref)} style={{ cursor: 'pointer', flex: '0 0 16px', width: 16, height: 16, borderRadius: 4, marginTop: 1, border: '1.5px solid ' + (on ? 'var(--green)' : 'var(--line-strong)'), background: on ? 'var(--green)' : '#fff', display: 'grid', placeItems: 'center' }}>{on && <I.check size={11} style={{ color: '#fff' }} />}</span>
                      <span className="mono tiny" style={{ fontWeight: 700, color: cur.accent, width: 52, flex: '0 0 52px', marginTop: 1 }}>{c.ref}</span>
                      <span onClick={() => toggle(c.ref)} style={{ cursor: 'pointer', flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.45, color: on ? 'var(--ink-3)' : 'var(--ink)', textDecoration: on ? 'line-through' : 'none' }}>{c.t}</span>
                      {c.view && <button onClick={() => nav(c.view, { from: 'sectorck' })} title="Buka modul terkait" className="row ac" style={{ flex: '0 0 auto', padding: '3px 7px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer' }}><I.link2 size={12} style={{ color: 'var(--blue)' }} /></button>}
                    </div>
                  );
                })}
              </div>
            </Panel>

            {/* ratios + regs */}
            <div className="grid" style={{ gap: 12 }}>
              <Panel noBody>
                <div className="panel-h"><h3>Rasio & Indikator Kehati-hatian</h3><span className="sub mono">{cur.label}</span></div>
                <div>
                  {cur.ratios.map((r, i) => (
                    <div key={i} className="row ac gap10" style={{ padding: '9px 14px', borderBottom: i < cur.ratios.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.ok ? 'var(--green)' : 'var(--red)', flex: '0 0 auto' }} />
                      <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600 }}>{r.k}</div><div className="tiny muted">Ambang: {r.min}</div></div>
                      <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: r.ok ? 'var(--navy)' : 'var(--red)' }}>{r.v}</span>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Acuan Regulasi" sub="POJK · SEOJK · PSAK">
                <div className="row gap6" style={{ flexWrap: 'wrap' }}>
                  {cur.regs.map((r, i) => (
                    <span key={i} className="mono" style={{ fontSize: 11, fontWeight: 600, padding: '5px 9px', borderRadius: 6, background: 'var(--surface-3)', color: 'var(--ink-2)', border: '1px solid var(--line-soft)' }}>{r}</span>
                  ))}
                </div>
                <div className="row gap8" style={{ marginTop: 12 }}>
                  <Btn sm style={{ flex: 1 }} onClick={() => nav('fsgen', { from: 'sectorck' })}><I.report size={13} /> Format LK Sektor</Btn>
                  <Btn sm variant="primary" style={{ flex: 1 }} onClick={() => nav('sustain', { from: 'sectorck' })}><I.water size={13} /> Keberlanjutan</Btn>
                </div>
              </Panel>
            </div>
          </div>

          <div className="tiny muted" style={{ padding: '0 2px 4px', lineHeight: 1.5 }}>
            Daftar-uji menambahkan dimensi regulatori spesifik-sektor (bank · asuransi · pembiayaan · emiten) di atas program audit umum — meliputi rasio kehati-hatian, format & muatan LK khusus (POJK 4/2022 & SEOJK sektoral), serta interaksi standar akuntansi terkait (PSAK 71/73/117). Angka ditarik dari satu sumber kebenaran <span className="mono">AMS_CANON.ojkSector()</span>; status tersimpan otomatis.
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { SectorChecklistView });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SectorChecklistView };
