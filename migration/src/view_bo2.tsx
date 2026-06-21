/* [codemod] ESM imports */
import React from 'react';
import { I } from './icons';
import { SubBar } from './shell.jsx';
import { Btn, Panel } from './ui.jsx';
import { BoBadge, BoStat, BoTabPanel, boJt, boM } from './view_bo1';
import { KV, SectionTitle } from './view_fpm_parts';
import { BO } from './data_backoffice';

/* ============================================================
   Asseris — Backoffice & Firm Mgmt (2/3)
   Kontrak & Legal Firma · Asuransi (PII) & Manajemen Risiko
   Reuses: boJt, boM, BoBadge, BoTabPanel, BoStat (view_bo1)
   ============================================================ */
const { useState: useStateBO2 } = React;

/* ============================================================
   Kontrak & Legal Firma — DIPINDAH ke view_legal.jsx / view_legal2.jsx
   (modul mendalam dgn registri SSOT). Fungsi lama dinonaktifkan.
   ============================================================ */
function FirmLegal_LEGACY_UNUSED() {
  const B = BO;
  const [tab, setTab] = useStateBO2('contracts');
  const [sel, setSel] = useStateBO2('LIT-03');
  const renewSoon = B.CONTRACTS.filter(c => B.daysTo(c.akhir) <= 120);
  const openLit = B.DISPUTES.filter(d => d.status !== 'Putusan');
  const exposure = openLit.reduce((s, d) => s + d.exposure, 0);
  const selCase = B.DISPUTES.find(d => d.id === sel);
  const tabs = [
    { id: 'contracts', label: 'Repositori Kontrak', count: B.CONTRACTS.length },
    { id: 'renewal', label: 'Perpanjangan', count: renewSoon.length },
    { id: 'dispute', label: 'Sengketa & Litigasi', count: B.DISPUTES.length },
  ];
  return (
    <>
      <SubBar moduleId="legal" right={<div className="row gap8 ac"><span className="chip tiny"><I.gavel size={11} /> {openLit.length} perkara aktif</span><Btn sm variant="primary"><I.plus size={13} /> Tambah Kontrak</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <BoStat value={B.CONTRACTS.length} label="Kontrak Aktif" />
          <BoStat value={renewSoon.length} label="Perpanjangan ≤120 hari" accent="var(--amber)" />
          <BoStat value={openLit.length} label="Litigasi Aktif" accent="var(--red)" />
          <BoStat value={boM(exposure, 1)} label="Eksposur Litigasi" accent="var(--red)" />
        </div>

        <BoTabPanel tabs={tabs} tab={tab} setTab={setTab}>
          {tab === 'contracts' && (
            <table className="dtbl">
              <thead><tr><th>ID</th><th>Pihak / Counterparty</th><th>Jenis</th><th className="num">Nilai</th><th>Berakhir</th><th>Renewal</th><th>Owner</th><th>Status</th></tr></thead>
              <tbody>
                {B.CONTRACTS.map(c => {
                  const d = B.daysTo(c.akhir);
                  return (
                    <tr key={c.id}>
                      <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{c.id}</td>
                      <td style={{ fontWeight: 600, fontSize: 11.5 }}>{c.pihak}</td>
                      <td className="tiny">{c.jenis}</td>
                      <td className="num">{c.nilai === 0 ? '—' : boJt(c.nilai)}</td>
                      <td className="tiny mono" style={{ color: d < 30 ? 'var(--red)' : d < 120 ? 'var(--amber)' : 'var(--ink-2)' }}>{c.akhir}<span className="muted"> · {d}h</span></td>
                      <td className="tiny">{c.renewal === 'Auto-renew' ? <span className="badge b-amber" style={{ textTransform: 'none' }}>Auto-renew</span> : <span className="muted">{c.renewal}</span>}</td>
                      <td className="tiny muted">{c.owner}</td>
                      <td><BoBadge s={c.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {tab === 'renewal' && (
            <div className="view-pad" style={{ paddingTop: 14 }}>
              <SectionTitle right={<span className="mono tiny muted">{renewSoon.length} kontrak</span>}>Garis Waktu Perpanjangan (≤120 hari)</SectionTitle>
              <div style={{ display: 'grid', gap: 10 }}>
                {renewSoon.sort((a, b) => B.daysTo(a.akhir) - B.daysTo(b.akhir)).map(c => {
                  const d = B.daysTo(c.akhir);
                  const pct = Math.max(4, Math.min(100, 100 - (d / 120 * 100)));
                  const col = d < 30 ? 'var(--red)' : 'var(--amber)';
                  return (
                    <div key={c.id} className="panel" style={{ padding: '11px 13px' }}>
                      <div className="row jb ac" style={{ marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 12.5 }}>{c.pihak} <span className="muted tiny">· {c.jenis}</span></span>
                        <span className="mono tiny" style={{ fontWeight: 700, color: col }}>{d} hari lagi</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 4, background: 'var(--surface-3)' }}><div style={{ width: pct + '%', height: '100%', borderRadius: 4, background: col }} /></div>
                      <div className="row jb tiny muted" style={{ marginTop: 4 }}><span>Berakhir {c.akhir} · {c.renewal}</span><span>{c.owner}</span></div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'dispute' && (
            <div className="view-pad" style={{ paddingTop: 14 }}>
              <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr', gap: 14, alignItems: 'start' }}>
                <table className="dtbl" style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--line)' }}>
                  <thead><tr><th>ID</th><th>Lawan / Perkara</th><th className="num">Eksposur</th><th>Risiko</th><th>Status</th></tr></thead>
                  <tbody>
                    {B.DISPUTES.map(d => (
                      <tr key={d.id} className={d.id === sel ? 'sel' : ''} onClick={() => setSel(d.id)} style={{ cursor: 'pointer' }}>
                        <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{d.id}</td>
                        <td><div style={{ fontWeight: 600, fontSize: 11.5 }}>{d.lawan}</div><div className="tiny muted truncate" style={{ maxWidth: 220 }}>{d.perkara}</div></td>
                        <td className="num">{boJt(d.exposure)}</td>
                        <td><BoBadge s={d.risk} /></td>
                        <td><BoBadge s={d.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {selCase && (
                  <Panel noBody>
                    <div style={{ background: 'var(--surface-2)', padding: '10px 14px', borderBottom: '1px solid var(--line)' }} className="row ac gap8">
                      <span className="mono" style={{ fontWeight: 700, color: 'var(--blue)' }}>{selCase.id}</span>
                      <div style={{ flex: 1 }} />
                      <BoBadge s={selCase.risk} />
                    </div>
                    <div style={{ padding: 14 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{selCase.lawan}</div>
                      <div className="tiny muted" style={{ lineHeight: 1.5, marginBottom: 10 }}>{selCase.perkara}</div>
                      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <KV label="Forum" v={selCase.forum} />
                        <KV label="Kuasa Hukum" v={selCase.kuasa} />
                        <KV label="Eksposur" v={boJt(selCase.exposure)} accent="var(--red)" />
                        <KV label="Sejak" v={selCase.mulai} />
                      </div>
                      <div className="row gap8" style={{ marginTop: 12 }}>
                        <Btn sm variant="primary"><I.doc size={13} /> Berkas Perkara</Btn>
                        {selCase.id === 'LIT-03' && <Btn sm onClick={() => window.__amsSetSidebar && null}><I.umbrella size={13} /> Tautkan ke Klaim PII</Btn>}
                      </div>
                    </div>
                  </Panel>
                )}
              </div>
            </div>
          )}
        </BoTabPanel>
      </div></div>
    </>
  );
}

/* ============================================================
   Asuransi (PII) & Manajemen Risiko — DIPINDAH ke view_insurance.jsx
   (modul mendalam berbasis mesin kanonik window.IRM / SSOT).
   ============================================================ */
