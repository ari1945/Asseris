/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data.js';
import { useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel, Progress, Tabs } from './ui.jsx';
import { KvBox } from './view_analytical.jsx';
import { RowKv } from './view_calc.jsx';

/* ============================================================
   NeoSuite AMS — SJAH 3410 · Perikatan Asurans atas Laporan Emisi
   Gas Rumah Kaca (selaras ISAE 3410 · GHG Protocol · ISO 14064-1).
   Deep methodology: anatomi & penerimaan (keyakinan terbatas vs
   memadai · batas organisasi kendali operasional · Scope 1/2/3 ·
   tiga pihak), batas & inventarisasi emisi (data aktivitas × faktor
   = tCO₂e, registri faktor/GWP, intensitas), prosedur & bukti
   (rekalkulasi · rekonsiliasi PLN · evaluasi salah saji terhadap
   materialitas), serta bentuk simpulan keyakinan terbatas (negatif)
   + paragraf penekanan ketidakpastian inheren.

   SUMBER KEBENARAN TUNGGAL: AMS.ghgEngine(exec). Seluruh angka
   emisi DIHITUNG dari aktivitas × faktor — tak ada hardcode. Status
   uji & prosedur disimpan di ams.v1.ghg3410.exec & dibaca lintas modul
   (Asurans Lain · Katalog SJAH 3000 · Portofolio Jasa · Matriks
   Kepatuhan).
   ============================================================ */
const { useState: useS3410 } = React;

function SJAH3410View() {
  const { fmt } = AMS;
  const nav = useNav();
  const [exec, setExec] = window.useAmsPersist('ghg3410.exec', {});
  const [tab, setTab] = useS3410('anatomi');
  const E = AMS.ghgEngine(exec);
  const A = E.meta;

  const toggle = (id, seed) => setExec(s => {
    const cur = Object.prototype.hasOwnProperty.call(s, id) ? s[id] : seed;
    return { ...s, [id]: !cur };
  });

  const tabs = [
    { id: 'anatomi', label: 'Anatomi & Penerimaan' },
    { id: 'inventory', label: 'Batas & Inventarisasi Emisi' },
    { id: 'prosedur', label: 'Prosedur & Bukti' },
    { id: 'laporan', label: 'Simpulan & Laporan' },
  ];

  return (
    <>
      <SubBar moduleId="sjah3410" right={
        <div className="row gap8 ac">
          <Badge kind="teal" dot>Keyakinan {A.level} · Scope 1 & 2</Badge>
          <Btn sm onClick={() => nav('assurance', { from: 'sjah3410' })}><I.shield size={13} /> Portofolio Asurans</Btn>
          <Btn sm variant="primary"><I.sparkle size={14} /> AI Assist</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        {/* command band — semua angka dari engine */}
        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 240 }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>SJAH 3410 · selaras ISAE 3410 · GHG Protocol</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{A.client.replace('PT ', '')} — Laporan Emisi GRK</div>
              <div className="tiny muted">{A.id} · {A.sector}</div>
            </div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Total Scope 1 & 2</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--teal)' }}>{fmt(E.totals.assured, 1)} tCO₂e</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Intensitas</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{fmt(E.intensity * 1000, 1)} kg/MWh</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Salah Saji vs Materialitas</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: E.misstatement.exceedsMateriality ? 'var(--red)' : 'var(--green)' }}>{fmt(E.misstatement.net, 1)} / {fmt(E.materiality, 0)}</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Simpulan</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: E.conclusion.type === 'unmodified' ? 'var(--green)' : 'var(--red)' }}>{E.conclusion.type === 'unmodified' ? 'Tanpa Modifikasi' : 'Dengan Pengecualian'}</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right', minWidth: 120 }}>
              <div className="tiny muted upper" style={{ marginBottom: 4 }}>Progres Prosedur</div>
              <div className="row ac gap8" style={{ justifyContent: 'flex-end' }}>
                <div style={{ width: 90 }}><Progress value={E.progress} color={E.allProc ? 'var(--green)' : undefined} /></div>
                <span className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{E.progress}%</span>
              </div>
            </div>
          </div>
        </Panel>

        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

        {tab === 'anatomi' && <GhgAnatomy E={E} A={A} />}
        {tab === 'inventory' && <GhgInventory E={E} A={A} toggle={toggle} />}
        {tab === 'prosedur' && <GhgProcedures E={E} toggle={toggle} />}
        {tab === 'laporan' && <GhgReport E={E} A={A} />}

      </div></div>
    </>
  );
}

/* ---------------- Tab: Anatomi & Penerimaan ---------------- */
function GhgAnatomy({ E, A }) {
  const acc = A.terms.filter(t => t.ok).length;
  return (
    <div className="grid" style={{ gap: 12 }}>
      <Panel noBody>
        <div className="panel-h"><h3>Keyakinan Terbatas vs Memadai (¶15)</h3><div style={{ flex: 1 }} /><Badge kind="teal">Perikatan ini: {A.level}</Badge></div>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          {[
            ['Terbatas (Limited) — bentuk negatif', 'Prosedur lebih terbatas (terutama inquiry, analitis, & rekalkulasi terarah). Simpulan: "tidak ada hal yang menjadi perhatian kami…".', 'teal', A.level === 'Terbatas'],
            ['Memadai (Reasonable) — bentuk positif', 'Prosedur menyeluruh untuk mereduksi risiko ke tingkat rendah; simpulan opini positif bahwa laporan disusun sesuai kriteria.', 'blue', A.level === 'Memadai'],
          ].map((r, i) => (
            <div key={i} style={{ padding: 16, borderRight: i === 0 ? '1px solid var(--line-soft)' : 0, background: r[3] ? 'var(--' + r[2] + '-bg)' : 'transparent' }}>
              <div className="row jb ac"><div style={{ fontWeight: 700, fontSize: 13 }}>{r[0]}</div>{r[3] && <Badge kind={r[2]}>Perikatan ini</Badge>}</div>
              <p className="tiny muted" style={{ margin: '6px 0 0', lineHeight: 1.5 }}>{r[1]}</p>
            </div>
          ))}
        </div>
        <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--teal-bg)', borderColor: 'transparent' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--teal)', flex: '0 0 auto' }}><I.book size={15} /></span>
            <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>SJAH 3410 mengatur perikatan asurans atas <b>Laporan Emisi GRK</b> sebagai hal pokok khusus. Kuantifikasi emisi tunduk pada <b>ketidakpastian inheren</b> — laporan keyakinan terbatas memuat paragraf penekanan atas hal ini.</span>
          </div>
        </div>
      </Panel>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Hubungan Tiga Pihak & Pendekatan</h3></div>
          <div style={{ padding: 14, display: 'grid', gap: 10 }}>
            {[
              ['group', 'teal', 'Praktisi (Asuror)', A.partner + ' — menyatakan simpulan keyakinan terbatas atas Laporan Emisi GRK.'],
              ['building', 'blue', 'Pihak Bertanggung Jawab', A.responsibleParty + '.'],
              ['users', 'purple', 'Pengguna yang Dituju', A.intendedUsers],
            ].map((r, i) => {
              const Ic = I[r[0]];
              return (
                <div key={i} className="row gap10" style={{ alignItems: 'flex-start' }}>
                  <span style={{ width: 32, height: 32, borderRadius: 8, flex: '0 0 32px', display: 'grid', placeItems: 'center', background: `var(--${r[1]}-bg)`, color: `var(--${r[1]})` }}><Ic size={16} /></span>
                  <div><div style={{ fontWeight: 700, fontSize: 12 }}>{r[2]}</div><div className="tiny muted" style={{ lineHeight: 1.45, marginTop: 2 }}>{r[3]}</div></div>
                </div>
              );
            })}
            <div className="divider" />
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <KvBox label="Batas Organisasi" v={A.boundaryApproach} accent="var(--navy)" />
              <KvBox label="Tipe Asurans" v="Asersi-berbasis" accent="var(--teal)" />
            </div>
          </div>
        </Panel>

        <div className="grid" style={{ gap: 12 }}>
          <Panel noBody>
            <div className="panel-h"><h3>Batas Operasional — Scope (¶A35)</h3></div>
            <div style={{ padding: 12, display: 'grid', gap: 8 }}>
              {[
                ['Scope 1 — Emisi langsung', 'Pembakaran tidak bergerak/bergerak & emisi fugitif dari sumber yang dikendalikan entitas.', 'teal', true],
                ['Scope 2 — Energi tak langsung', 'Emisi dari listrik dibeli (location-based, faktor grid PLN).', 'blue', true],
                ['Scope 3 — Tak langsung lain', 'Rantai nilai (perjalanan dinas, logistik hulu). Disaring & diungkap — di luar lingkup keyakinan.', 'gray', false],
              ].map((r, i) => (
                <div key={i} className="panel" style={{ padding: '9px 11px', boxShadow: 'none', borderLeft: `3px solid var(--${r[2] === 'gray' ? 'line-strong' : r[2]})` }}>
                  <div className="row jb ac"><span style={{ fontSize: 12, fontWeight: 700 }}>{r[0]}</span>{r[3] ? <Badge kind={r[2]}>Terasurans</Badge> : <Badge kind="gray">Diungkap</Badge>}</div>
                  <div className="tiny muted" style={{ marginTop: 3, lineHeight: 1.4 }}>{r[1]}</div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Konteks Perikatan">
            <div style={{ display: 'grid', gap: 8 }}>
              <RowKv label="Periode Pelaporan" v={A.periodShort} />
              <RowKv label="Tahun Dasar" v={A.baseYear} />
              <RowKv label="Kriteria" v="GHG Protocol · ISO 14064-1" />
              <RowKv label="Standar" v={A.std} />
            </div>
          </Panel>
        </div>
      </div>

      <Panel noBody>
        <div className="panel-h"><h3>Penerimaan Perikatan (¶13–18)</h3><div style={{ flex: 1 }} /><span className="mono tiny" style={{ fontWeight: 700, color: acc === A.terms.length ? 'var(--green)' : 'var(--amber)' }}>{acc}/{A.terms.length}</span></div>
        <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px 24px' }}>
          {A.terms.map((t, i) => (
            <div key={i} className="row gap8" style={{ alignItems: 'flex-start', fontSize: 12 }}>
              <span style={{ color: t.ok ? 'var(--green)' : 'var(--amber)', flex: '0 0 auto', marginTop: 1 }}>{t.ok ? <I.checkCircle size={15} /> : <I.clock size={15} />}</span>
              <span style={{ lineHeight: 1.45 }}>{t.k}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- Tab: Batas & Inventarisasi Emisi ---------------- */
function GhgInventory({ E, A, toggle }) {
  const { fmt } = AMS;
  const scopeColor = { 1: 'teal', 2: 'blue', 3: 'gray' };
  const groups = [
    { scope: 1, label: 'Scope 1 — Emisi Langsung', total: E.totals.scope1 },
    { scope: 2, label: 'Scope 2 — Energi Tak Langsung (location-based)', total: E.totals.scope2 },
    { scope: 3, label: 'Scope 3 — Informasional (di luar lingkup keyakinan)', total: E.totals.scope3 },
  ];
  return (
    <div className="grid" style={{ gap: 12 }}>
      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Batas Organisasi — Konsolidasi (Kendali Operasional)</h3><div style={{ flex: 1 }} /><Badge kind="teal">{E.counts.entities} entitas tercakup</Badge></div>
          <table className="dtbl">
            <thead><tr><th>Entitas / Fasilitas</th><th style={{ width: 130 }}>Pendekatan</th><th style={{ width: 92 }}>Status</th></tr></thead>
            <tbody>
              {A.entities.map((e, i) => (
                <tr key={i}>
                  <td style={{ whiteSpace: 'normal', lineHeight: 1.35 }}><span style={{ fontWeight: 600 }}>{e.name}</span><div className="tiny muted" style={{ marginTop: 1 }}>{e.note}</div></td>
                  <td className="tiny">{e.approach}</td>
                  <td>{e.included ? <Badge kind="green">Termasuk</Badge> : <Badge kind="gray">Dikecualikan</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="panel" style={{ margin: 12, padding: '9px 11px', background: 'var(--teal-bg)', borderColor: 'transparent' }}>
            <div className="row gap8" style={{ alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--teal)', flex: '0 0 auto' }}><I.target size={15} /></span>
              <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Pendekatan <b>kendali operasional</b>: emisi dari operasi yang dikendalikan entitas dikonsolidasi penuh. JV non-pengendali dikecualikan & diungkap terpisah.</span>
            </div>
          </div>
        </Panel>

        <div className="grid" style={{ gap: 12 }}>
          <Panel title="Komposisi Emisi (terasurans)">
            <div style={{ display: 'grid', gap: 8 }}>
              <KvBox label="Scope 1 — langsung" v={fmt(E.totals.scope1, 1) + ' tCO₂e'} accent="var(--teal)" />
              <KvBox label="Scope 2 — listrik dibeli" v={fmt(E.totals.scope2, 1) + ' tCO₂e'} accent="var(--blue)" />
              <KvBox label="Total Scope 1 & 2" v={fmt(E.totals.assured, 1) + ' tCO₂e'} accent="var(--navy)" />
            </div>
            {/* stacked bar */}
            <div style={{ marginTop: 12 }}>
              <div className="tiny muted upper" style={{ marginBottom: 5 }}>Proporsi Scope</div>
              <div className="row" style={{ height: 14, borderRadius: 7, overflow: 'hidden', background: 'var(--surface-3)' }}>
                <div style={{ width: (E.totals.scope1 / E.totals.assured * 100) + '%', background: 'var(--teal)' }} title={'Scope 1 · ' + fmt(E.totals.scope1, 1)} />
                <div style={{ width: (E.totals.scope2 / E.totals.assured * 100) + '%', background: 'var(--blue)' }} title={'Scope 2 · ' + fmt(E.totals.scope2, 1)} />
              </div>
              <div className="row jb" style={{ marginTop: 4 }}>
                <span className="tiny muted">Scope 1 {Math.round(E.totals.scope1 / E.totals.assured * 100)}%</span>
                <span className="tiny muted">Scope 2 {Math.round(E.totals.scope2 / E.totals.assured * 100)}%</span>
              </div>
            </div>
          </Panel>
          <Panel title="Intensitas Emisi (¶ analitis)">
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <KvBox label="Energi dibangkitkan" v={fmt(A.production.v, 0) + ' MWh'} accent="var(--navy)" />
              <KvBox label="Intensitas" v={fmt(E.intensity * 1000, 1) + ' kg/MWh'} accent="var(--teal)" />
            </div>
            <p className="tiny muted" style={{ margin: '9px 0 0', lineHeight: 1.5 }}>Intensitas = total Scope 1 & 2 ÷ energi dibangkitkan — diuji tahun-ke-tahun terhadap tahun dasar pada prosedur analitis.</p>
          </Panel>
        </div>
      </div>

      <Panel noBody>
        <div className="panel-h"><h3>Inventarisasi Sumber Emisi — Rekalkulasi (tCO₂e = aktivitas × faktor ÷ 1000)</h3><div style={{ flex: 1 }} /><span className="mono tiny" style={{ fontWeight: 700 }}>{E.counts.sourcesTested}/{E.counts.sources} sumber diuji</span></div>
        <table className="dtbl">
          <thead><tr>
            <th style={{ width: 46 }}>Ref</th><th>Sumber & Fasilitas</th><th style={{ width: 132 }}>Data Aktivitas</th>
            <th style={{ width: 116 }}>Faktor</th><th className="num" style={{ width: 92 }}>Terhitung</th>
            <th className="num" style={{ width: 90 }}>Asersi Mgt</th><th className="num" style={{ width: 72 }}>Selisih</th><th style={{ width: 84 }}>Uji</th>
          </tr></thead>
          <tbody>
            {groups.map(g => {
              const rows = E.sources.filter(s => s.scope === g.scope);
              if (!rows.length) return null;
              return (
                <React.Fragment key={g.scope}>
                  <tr style={{ background: 'var(--surface-2)' }}>
                    <td className="mono tiny" style={{ fontWeight: 700, color: `var(--${scopeColor[g.scope]})` }}>S{g.scope}</td>
                    <td colSpan={3} style={{ fontWeight: 700, fontSize: 11.5 }}>{g.label}</td>
                    <td className="num mono" style={{ fontWeight: 700 }}>{fmt(g.total, 1)}</td>
                    <td colSpan={3} className="tiny muted">{g.scope === 3 ? 'tidak diagregasi ke total terasurans' : 'tCO₂e'}</td>
                  </tr>
                  {rows.map(s => (
                    <tr key={s.id} style={{ opacity: s.informational ? 0.72 : 1 }}>
                      <td className="mono tiny muted" style={{ fontWeight: 700, verticalAlign: 'top' }}>{s.id}</td>
                      <td style={{ whiteSpace: 'normal', lineHeight: 1.3, verticalAlign: 'top' }}><span style={{ fontWeight: 600 }}>{s.src}</span><div className="tiny muted" style={{ marginTop: 1 }}>{s.cat} · {s.facility}</div></td>
                      <td className="mono tiny" style={{ verticalAlign: 'top' }}>{fmt(s.act.v, 0)} {s.act.u}</td>
                      <td className="mono tiny" style={{ verticalAlign: 'top' }}>{fmt(s.ef.v, s.ef.v < 10 ? 2 : 0)} <span className="muted">{s.ef.u.replace('kgCO₂e/', '/')}</span></td>
                      <td className="num mono tiny" style={{ verticalAlign: 'top', fontWeight: 700 }}>{fmt(s.computed, 1)}</td>
                      <td className="num mono tiny" style={{ verticalAlign: 'top', color: 'var(--ink-3)' }}>{fmt(s.reported, 1)}</td>
                      <td className="num mono tiny" style={{ verticalAlign: 'top', fontWeight: 700, color: s.absVar === 0 ? 'var(--ink-4)' : 'var(--amber)' }}>{s.variance > 0 ? '+' : ''}{fmt(s.variance, 1)}</td>
                      <td style={{ verticalAlign: 'top' }}>{s.informational
                        ? <span className="chip tiny">Disaring</span>
                        : <button onClick={() => toggle(s.id, s.seedDone)} className="chip" style={{ cursor: 'pointer', height: 24, fontWeight: 700, border: '1px solid ' + (s.tested ? 'var(--green)' : 'var(--line-strong)'), background: s.tested ? 'var(--green-bg)' : '#fff', color: s.tested ? 'var(--green)' : 'var(--ink-3)' }}>{s.tested ? 'Diuji' : 'Tandai'}</button>}</td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        <div className="panel" style={{ margin: 12, padding: '9px 12px', background: 'var(--surface-2)', boxShadow: 'none' }}>
          <div className="tiny" style={{ lineHeight: 1.5 }}>Rekalkulasi otomatis: tiap baris = data aktivitas × faktor emisi/GWP ÷ 1000. Selisih terhadap asersi manajemen diagregasi & dibandingkan materialitas pada tab <b>Prosedur & Bukti</b>. Mengubah satu angka aktivitas/faktor mengalir konsisten ke Asurans Lain, Katalog SJAH 3000, & Matriks Kepatuhan.</div>
        </div>
      </Panel>

      <Panel noBody>
        <div className="panel-h"><h3>Registri Faktor Emisi & GWP (diverifikasi — P5)</h3></div>
        <table className="dtbl">
          <thead><tr><th>Bahan Bakar / Sumber</th><th className="num" style={{ width: 120 }}>Faktor</th><th style={{ width: 130 }}>Satuan</th><th>Rujukan Otoritatif</th></tr></thead>
          <tbody>
            {A.factors.map((f, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{f.fuel}</td>
                <td className="num mono" style={{ fontWeight: 700, color: 'var(--teal)' }}>{fmt(f.v, f.v < 10 ? 2 : 0)}</td>
                <td className="mono tiny muted">{f.u}</td>
                <td className="tiny muted">{f.ref}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

/* ---------------- Tab: Prosedur & Bukti ---------------- */
function GhgProcedures({ E, toggle }) {
  const { fmt } = AMS;
  const M = E.misstatement;
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 320px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Prosedur Asurans — Keyakinan Terbatas (¶23–47)</h3><div style={{ flex: 1 }} /><span className="mono tiny" style={{ fontWeight: 700 }}>{E.counts.proceduresDone}/{E.counts.procedures} selesai</span></div>
          <table className="dtbl">
            <thead><tr><th style={{ width: 48 }}>Ref</th><th>Prosedur (sifat terbatas)</th><th style={{ width: 96 }}>Status</th></tr></thead>
            <tbody>
              {E.procedures.map(p => (
                <tr key={p.id}>
                  <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)', verticalAlign: 'top' }}>{p.ref}</td>
                  <td style={{ whiteSpace: 'normal', lineHeight: 1.35, verticalAlign: 'top' }}><span style={{ fontWeight: 600 }}>{p.short}</span><div className="tiny muted" style={{ fontWeight: 400, marginTop: 2 }}>{p.proc}</div></td>
                  <td style={{ verticalAlign: 'top' }}>
                    <button onClick={() => toggle(p.id, p.seedDone)} className="chip" style={{ cursor: 'pointer', height: 24, fontWeight: 700, border: '1px solid ' + (p.done ? 'var(--green)' : 'var(--line-strong)'), background: p.done ? 'var(--green-bg)' : '#fff', color: p.done ? 'var(--green)' : 'var(--ink-3)' }}>{p.done ? 'Selesai' : 'Tandai'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Evaluasi Salah Saji vs Materialitas (¶49)</h3><div style={{ flex: 1 }} /><Badge kind={M.exceedsMateriality ? 'red' : 'green'}>{M.exceedsMateriality ? 'Melampaui' : 'Di bawah materialitas'}</Badge></div>
          <div style={{ padding: 14 }}>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 12 }}>
              <KvBox label="Materialitas (5%)" v={fmt(E.materiality, 0) + ' t'} accent="var(--navy)" />
              <KvBox label="Selisih neto" v={fmt(M.net, 1) + ' t'} accent={M.exceedsMateriality ? 'var(--red)' : 'var(--green)'} />
              <KvBox label="Selisih bruto" v={fmt(M.gross, 1) + ' t'} accent="var(--amber)" />
              <KvBox label="% dari total" v={fmt(Math.abs(M.net) / E.totals.assured * 100, 2) + '%'} accent="var(--teal)" />
            </div>
            {/* materiality gauge */}
            <div className="tiny muted upper" style={{ marginBottom: 5 }}>Selisih neto relatif terhadap materialitas</div>
            <div style={{ position: 'relative', height: 12, borderRadius: 6, background: 'var(--surface-3)', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, width: Math.min(100, Math.abs(M.net) / E.materiality * 100) + '%', background: M.exceedsMateriality ? 'var(--red)' : 'var(--green)' }} />
            </div>
            <div className="tiny" style={{ marginTop: 8, lineHeight: 1.55, color: 'var(--ink-2)' }}>{E.conclusion.basis}</div>
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Sifat Prosedur Keyakinan Terbatas (¶33L)">
          <p className="tiny muted" style={{ margin: '0 0 9px', lineHeight: 1.5 }}>Lebih terbatas dari keyakinan memadai — menekankan:</p>
          <div style={{ display: 'grid', gap: 6 }}>
            {[['Inquiry manajemen & penyusun', 'amber'], ['Prosedur analitis (intensitas)', 'teal'], ['Rekalkulasi terarah', 'blue'], ['Rekonsiliasi ke bukti sumber', 'purple']].map(([n, col]) => (
              <div key={n} className="row ac gap8" style={{ fontSize: 11.5, padding: '6px 9px', borderRadius: 6, background: 'var(--surface-2)' }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: `var(--${col})` }} />{n}
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Ketidakpastian Estimasi (¶35)">
          <p className="tiny" style={{ margin: 0, lineHeight: 1.55 }}>Emisi <b>fugitif refrigeran (S1-4)</b> diestimasi dari top-up tahunan × GWP — sumber ketidakpastian terbesar. Praktisi mengevaluasi rentang & dampaknya terhadap materialitas; bila tidak material, simpulan tidak dimodifikasi namun ketidakpastian inheren ditekankan dalam laporan.</p>
        </Panel>
        <div className="panel" style={{ padding: '11px 14px', background: E.canIssue ? 'var(--green-bg)' : 'var(--amber-bg)', borderColor: 'transparent' }}>
          <div className="row ac gap8" style={{ alignItems: 'flex-start' }}><span style={{ color: E.canIssue ? 'var(--green)' : 'var(--amber)', flex: '0 0 auto' }}>{E.canIssue ? <I.checkCircle size={16} /> : <I.clock size={16} />}</span>
            <span className="tiny" style={{ fontWeight: 600, lineHeight: 1.5 }}>{E.canIssue
              ? 'Seluruh prosedur & rekalkulasi sumber selesai tanpa salah saji material — simpulan keyakinan terbatas (negatif) dapat dirumuskan & laporan SJAH 3410 siap diterbitkan.'
              : 'Lengkapi prosedur (' + E.counts.proceduresDone + '/' + E.counts.procedures + ') & rekalkulasi sumber (' + E.counts.sourcesTested + '/' + E.counts.sources + ') sebelum menyimpulkan. Perubahan status mengalir konsisten ke Asurans Lain, Katalog SJAH 3000, & Portofolio Jasa.'}</span></div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Tab: Simpulan & Laporan ---------------- */
function GhgReport({ E, A }) {
  const { fmt } = AMS;
  const C = E.conclusion;
  const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  return (
    <div className="grid" style={{ gridTemplateColumns: '320px 1fr', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Bentuk Simpulan (¶ Negatif)">
          <div style={{ display: 'grid', gap: 8 }}>
            {[
              ['Rekalkulasi Scope 1 selesai', E.matters[0].ok],
              ['Rekonsiliasi Scope 2 selesai', E.matters[1].ok],
              ['Batas & metodologi ditelaah', E.matters[2].ok],
              ['Salah saji ≤ materialitas', !E.misstatement.exceedsMateriality],
            ].map((r, i) => (
              <div key={i} className="row jb ac" style={{ fontSize: 11.5, padding: '7px 9px', borderRadius: 6, background: 'var(--surface-2)' }}>
                <span>{r[0]}</span>
                <Badge kind={r[1] ? 'green' : 'amber'}>{r[1] ? 'Terpenuhi' : 'Tertunda'}</Badge>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Karakter Perikatan">
          <div style={{ display: 'grid', gap: 8 }}>
            <RowKv label="Tingkat Keyakinan" v={A.level} />
            <RowKv label="Bentuk Simpulan" v="Negatif" />
            <RowKv label="Total Scope 1 & 2" v={fmt(E.totals.assured, 1) + ' tCO₂e'} />
            <RowKv label="Materialitas" v={fmt(E.materiality, 0) + ' tCO₂e'} />
            <RowKv label="Standar" v={A.std} />
          </div>
        </Panel>
      </div>

      <Panel noBody>
        <div className="panel-h"><h3>Pratinjau Laporan Asurans Independen — Emisi GRK</h3><div style={{ flex: 1 }} /><Badge kind={E.canIssue ? 'green' : 'amber'}>{E.canIssue ? 'Siap terbit' : 'Draf'}</Badge></div>
        <div style={{ padding: 18 }}>
          <div className="doc-paper" style={{ background: '#fff', padding: '34px 40px', boxShadow: 'var(--shadow)', fontSize: 11.5, lineHeight: 1.7, color: '#283b46' }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#0c2430', textAlign: 'center', marginBottom: 4 }}>LAPORAN ASURANS INDEPENDEN ATAS LAPORAN EMISI GRK</div>
            <div className="tiny" style={{ textAlign: 'center', color: '#7a8893', marginBottom: 16 }}>{A.std} · Keyakinan {A.level} (Negatif) · {A.periodShort}</div>
            <p style={{ margin: '0 0 10px' }}>Kepada Manajemen & Dewan Komisaris {A.client}</p>

            <div style={{ fontWeight: 700, color: '#0c2430', margin: '0 0 4px' }}>Hal Pokok & Kriteria</div>
            <p style={{ margin: '0 0 10px' }}>Kami melaksanakan perikatan asurans keyakinan terbatas atas <b>{A.subject}</b> — total <b>{fmt(E.totals.assured, 1)} tCO₂e</b> (Scope 1 {fmt(E.totals.scope1, 1)} · Scope 2 {fmt(E.totals.scope2, 1)}) — yang disusun berdasarkan {A.criteria}, dengan batas organisasi pendekatan {A.boundaryApproach.toLowerCase()}.</p>

            <div style={{ fontWeight: 700, color: '#0c2430', margin: '12px 0 4px' }}>Tanggung Jawab Para Pihak</div>
            <p style={{ margin: '0 0 10px' }}>Manajemen bertanggung jawab atas penyusunan Laporan Emisi GRK & pemilihan kriteria. Tanggung jawab kami adalah menyatakan simpulan keyakinan terbatas berdasarkan prosedur yang kami lakukan & bukti yang kami peroleh.</p>

            <div style={{ fontWeight: 700, color: '#0c2430', margin: '12px 0 4px' }}>Ringkasan Pekerjaan Kami</div>
            <p style={{ margin: '0 0 10px' }}>Prosedur keyakinan terbatas mencakup terutama inquiry, prosedur analitis (intensitas emisi), rekalkulasi data aktivitas × faktor emisi, & rekonsiliasi ke bukti sumber (tagihan PLN, log bahan bakar). Sifat & luasnya lebih terbatas dibanding perikatan keyakinan memadai.</p>

            <div style={{ fontWeight: 700, color: C.type === 'unmodified' ? '#1f7a4d' : '#b3261e', margin: '12px 0 4px' }}>Simpulan ({C.label})</div>
            <p style={{ margin: '0 0 10px', color: C.type === 'unmodified' ? '#2f5d47' : '#7a3030' }}>{C.negativeAssurance}</p>

            <div style={{ fontWeight: 700, color: '#9a6a00', margin: '8px 0 4px' }}>Penekanan Hal — Ketidakpastian Inheren</div>
            <p style={{ margin: 0, color: '#7a5a1f' }}>{C.emphasis}</p>

            <div style={{ marginTop: 24, paddingTop: 10, borderTop: '1px solid #e0e5ea', fontSize: 11 }}><b>{A.partner}</b> · Akuntan Publik<br /><span className="tiny" style={{ color: '#7a8893' }}>Jakarta, {today}</span></div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

Object.assign(window, { SJAH3410View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SJAH3410View };
