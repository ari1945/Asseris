/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel, Progress, Tabs } from './ui.jsx';
import { KvBox } from './view_analytical';
import { RowKv } from './view_calc';

/* ============================================================
   Asseris — SJAH 3420 · Asurans atas Penyusunan Informasi
   Keuangan Proforma (Prospektus) — selaras ISAE 3420.

   Akuntan pelapor menyatakan keyakinan MEMADAI atas apakah informasi
   keuangan proforma telah DISUSUN DENGAN BENAR atas dasar yang
   dinyatakan & konsisten dgn kebijakan akuntansi penerbit.

   SUMBER KEBENARAN TUNGGAL: AMS.proformaEngine(exec). Kolom
   "tidak disesuaikan" ditarik LIVE dari AMS_CANON (psak65/revenue);
   metodologi penyesuaian selaras AMS_CANON.psak22 & tarif AMS_CANON.RATE.
   Status prosedur disimpan di ams.v1.pf3420.exec & dibaca lintas modul
   (Asurans Lain · Katalog SJAH 3000 · Portofolio Jasa · Matriks Kepatuhan).
   ============================================================ */
const { useState: usePF } = React;

function SJAH3420View() {
  const { fmt } = AMS;
  const nav = useNav();
  const [exec, setExec] = window.useAmsPersist('pf3420.exec', {});
  const [tab, setTab] = usePF('anatomi');
  const E = (AMS as any).proformaEngine(exec);
  const A = E.meta;

  const toggle = (id, seed) => setExec(s => {
    const cur = Object.prototype.hasOwnProperty.call(s, id) ? s[id] : seed;
    return { ...s, [id]: !cur };
  });

  const tabs = [
    { id: 'anatomi', label: 'Anatomi & Penerimaan' },
    { id: 'sumber', label: 'Sumber & Penyesuaian' },
    { id: 'proforma', label: 'Informasi Proforma' },
    { id: 'laporan', label: 'Simpulan & Laporan' },
  ];
  const sgnEps = E.eps.accretion >= 0 ? '+' : '−';

  return (
    <>
      <SubBar moduleId="sjah3420" right={
        <div className="row gap8 ac">
          <Badge kind="purple" dot>Keyakinan {A.level} · proper compilation</Badge>
          <Btn sm onClick={() => nav('psak22', { from: 'sjah3420' })}><I.layers size={13} /> PSAK 22 · Akuisisi</Btn>
          <Btn sm onClick={() => nav('psak65', { from: 'sjah3420' })}><I.building size={13} /> Konsolidasi</Btn>
          <Btn sm variant="primary"><I.sparkle size={14} /> AI Assist</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        {/* command band — semua angka dari engine (historis dari AMS_CANON) */}
        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 240 }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>SJAH 3420 · selaras ISAE 3420 · {A.role}</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{A.issuer.replace('PT ', '')} — Proforma Konsolidasian</div>
              <div className="tiny muted">{A.id} · PUT II + Akuisisi 80% {A.target.name.replace('PT ', '')}</div>
            </div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Goodwill Akuisisi</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--navy)' }}>Rp {fmt(E.ppa.goodwill, 0)} jt</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Dana HMETD (neto)</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>Rp {fmt(E.fin.netProceeds, 0)} jt</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">EPS Historis → Proforma</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: E.eps.accretion >= 0 ? 'var(--green)' : 'var(--red)' }}>Rp {fmt(E.eps.histEPS, 1)} → {fmt(E.eps.pfEPS, 1)} <span style={{ fontWeight: 600 }}>({sgnEps}{fmt(Math.abs(E.eps.accretion), 1)})</span></div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Tie-out SSOT</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: E.tieOk ? 'var(--green)' : 'var(--red)' }}>{E.tieOk ? 'Menutup' : 'Selisih'} · LPK {E.bs.balance === 0 ? 'balance' : 'off'}</div></div>
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

        {tab === 'anatomi' && <PfAnatomy E={E} A={A} />}
        {tab === 'sumber' && <PfSource E={E} A={A} toggle={toggle} nav={nav} />}
        {tab === 'proforma' && <PfStatements E={E} A={A} />}
        {tab === 'laporan' && <PfReport E={E} A={A} />}

      </div></div>
    </>
  );
}

/* helper format Rp juta + bertanda (parentheses untuk negatif) */
function pfJ(n) { return AMS.fmt(Math.round(n), 0); }
function pfSgn(n) { return n === 0 ? '—' : (n < 0 ? '(' + pfJ(Math.abs(n)) + ')' : pfJ(n)); }

/* ---------------- Tab: Anatomi & Penerimaan ---------------- */
function PfAnatomy({ E, A }) {
  const acc = A.terms.filter(t => t.ok).length;
  return (
    <div className="grid" style={{ gap: 12 }}>
      <Panel noBody>
        <div className="panel-h"><h3>Sifat Informasi Proforma & Tanggung Jawab Akuntan Pelapor (¶09–11)</h3><div style={{ flex: 1 }} /><Badge kind="purple">Keyakinan {A.level}</Badge></div>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          {[
            ['Yang DIBERI keyakinan', 'Apakah informasi keuangan proforma telah DISUSUN DENGAN BENAR (properly compiled), dalam semua hal material, atas DASAR yang dinyatakan — dan dasar itu konsisten dengan kebijakan akuntansi penerbit.', 'purple', true],
            ['Yang TIDAK diberi keyakinan', 'Akuntan pelapor TIDAK menyatakan bahwa hasil/posisi aktual akan sesuai yang digambarkan. Proforma bersifat ILUSTRATIF & HIPOTETIS ("seolah-olah").', 'amber', false],
          ].map((r, i) => (
            <div key={i} style={{ padding: 16, borderRight: i === 0 ? '1px solid var(--line-soft)' : 0, background: 'var(--' + r[2] + '-bg)' }}>
              <div className="row jb ac"><div style={{ fontWeight: 700, fontSize: 13 }}>{r[0]}</div><Badge kind={r[2]}>{r[3] ? 'Lingkup' : 'Batasan'}</Badge></div>
              <p className="tiny muted" style={{ margin: '6px 0 0', lineHeight: 1.5 }}>{r[1]}</p>
            </div>
          ))}
        </div>
        <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.link2 size={15} /></span>
            <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Kolom <b>tidak disesuaikan</b> TIDAK dimasukkan ulang — ditarik LIVE dari <b className="mono">AMS_CANON</b> (laporan konsolidasian auditan {A.issuer} FY2025 · PSAK 65/72). Penyesuaian proforma mengikuti metodologi <b className="mono">AMS_CANON.psak22</b> & tarif <b className="mono">AMS_CANON.RATE</b>. Mengubah satu AJE di WTB → kolom historis ikut bergerak & tie-out tetap menutup.</span>
          </div>
        </div>
      </Panel>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Hubungan Tiga Pihak</h3></div>
          <div style={{ padding: 14, display: 'grid', gap: 10 }}>
            {[
              ['group', 'purple', 'Akuntan Pelapor (Praktisi)', A.partner + ' — menyatakan opini keyakinan memadai atas penyusunan informasi proforma.'],
              ['building', 'blue', 'Pihak Bertanggung Jawab', A.responsibleParty],
              ['users', 'teal', 'Pengguna yang Dituju', A.intendedUsers],
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
              <KvBox label="Peran KAP" v={A.role} accent="var(--purple)" />
              <KvBox label="Bentuk Keyakinan" v="Memadai (positif)" accent="var(--navy)" />
            </div>
          </div>
        </Panel>

        <div className="grid" style={{ gap: 12 }}>
          <Panel noBody>
            <div className="panel-h"><h3>Dasar Penyusunan (Basis of Compilation) — ¶15</h3></div>
            <div style={{ padding: 12, display: 'grid', gap: 8 }}>
              {[
                ['Directly attributable', 'Penyesuaian berhubungan LANGSUNG dengan transaksi (akuisisi + HMETD) — bukan peristiwa lain atau kinerja masa depan.', 'purple'],
                ['Factually supportable', 'Tiap penyesuaian didukung bukti faktual: akta/PPJB akuisisi, laporan penilaian KJPP (PPA), LK auditan target, struktur HMETD.', 'blue'],
                ['Konsisten kebijakan akuntansi', 'Penyesuaian & figur target diselaraskan dengan kebijakan akuntansi (PSAK) penerbit.', 'teal'],
              ].map((r, i) => (
                <div key={i} className="panel" style={{ padding: '9px 11px', boxShadow: 'none', borderLeft: `3px solid var(--${r[2]})` }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{r[0]}</div>
                  <div className="tiny muted" style={{ marginTop: 3, lineHeight: 1.4 }}>{r[1]}</div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Tanggal “Seolah-olah” (¶ basis)">
            <div style={{ display: 'grid', gap: 8 }}>
              <RowKv label="Laporan Laba Rugi" v="1 Jan 2025 (awal periode)" />
              <RowKv label="Posisi Keuangan" v="31 Des 2025 (akhir periode)" />
              <RowKv label="Kriteria" v="Dasar penyusunan + PSAK" />
              <RowKv label="Standar" v={A.std} />
            </div>
          </Panel>
        </div>
      </div>

      {/* struktur transaksi */}
      <Panel noBody>
        <div className="panel-h"><h3>Struktur Transaksi yang Diproformakan</h3></div>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          <div style={{ padding: 16, borderRight: '1px solid var(--line-soft)' }}>
            <div className="row gap8 ac" style={{ marginBottom: 8 }}><span style={{ color: 'var(--navy)' }}><I.layers size={15} /></span><span style={{ fontWeight: 700, fontSize: 12.5 }}>Akuisisi 80% {A.target.name}</span></div>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <KvBox label="Imbalan dialihkan (kas)" v={'Rp ' + pfJ(E.ppa.considerationCash) + ' jt'} accent="var(--navy)" />
              <KvBox label="FVNIA (aset neto NW)" v={'Rp ' + pfJ(E.ppa.fvnia) + ' jt'} accent="var(--blue)" />
              <KvBox label="NCI proporsional (¶19a)" v={'Rp ' + pfJ(E.ppa.nciAcq) + ' jt'} accent="var(--teal)" />
              <KvBox label="Goodwill (¶32)" v={'Rp ' + pfJ(E.ppa.goodwill) + ' jt'} accent="var(--purple)" />
            </div>
            <p className="tiny muted" style={{ margin: '9px 0 0', lineHeight: 1.45 }}>Sektor target: {A.target.sector}. {A.target.auditor}.</p>
          </div>
          <div style={{ padding: 16 }}>
            <div className="row gap8 ac" style={{ marginBottom: 8 }}><span style={{ color: 'var(--green)' }}><I.coins size={15} /></span><span style={{ fontWeight: 700, fontSize: 12.5 }}>Pendanaan HMETD (PUT II)</span></div>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <KvBox label="Saham baru" v={pfJ(E.fin.newShares) + ' jt lembar'} accent="var(--green)" />
              <KvBox label="Harga pelaksanaan" v={'Rp ' + E.fin.price + '/lembar'} accent="var(--navy)" />
              <KvBox label="Dana bruto" v={'Rp ' + pfJ(E.fin.grossProceeds) + ' jt'} accent="var(--blue)" />
              <KvBox label="Dana neto (− emisi)" v={'Rp ' + pfJ(E.fin.netProceeds) + ' jt'} accent="var(--green)" />
            </div>
            <p className="tiny muted" style={{ margin: '9px 0 0', lineHeight: 1.45 }}>Rasio {E.fin.ratio}. Didanai ekuitas → tanpa beban bunga inkremental pada L/R proforma.</p>
          </div>
        </div>
      </Panel>

      <Panel noBody>
        <div className="panel-h"><h3>Penerimaan Perikatan (¶ prasyarat)</h3><div style={{ flex: 1 }} /><span className="mono tiny" style={{ fontWeight: 700, color: acc === A.terms.length ? 'var(--green)' : 'var(--amber)' }}>{acc}/{A.terms.length}</span></div>
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

/* ---------------- Tab: Sumber & Penyesuaian ---------------- */
function PfSource({ E, A, toggle, nav }) {
  return (
    <div className="grid" style={{ gap: 12 }}>
      {/* tie-out SSOT */}
      <Panel noBody>
        <div className="panel-h"><h3>Tie-out Sumber Tunggal — Kolom Tidak Disesuaikan ↔ AMS_CANON</h3><div style={{ flex: 1 }} /><Badge kind={E.tieOk ? 'green' : 'red'}>{E.tieOk ? 'Seluruh baris menutup' : 'Ada selisih'}</Badge></div>
        <table className="dtbl">
          <thead><tr><th>Pos Proforma (tidak disesuaikan)</th><th>Sumber Kanonik</th><th className="num" style={{ width: 130 }}>Nilai</th><th style={{ width: 96 }}>Status</th></tr></thead>
          <tbody>
            {E.tieRows.map((r, i) => (
              <tr key={i} style={r.hi ? { background: 'var(--surface-2)' } : null}>
                <td style={{ whiteSpace: 'normal', lineHeight: 1.35, fontWeight: r.hi ? 700 : 600 }}>{r.pos}</td>
                <td className="tiny muted mono" style={{ whiteSpace: 'normal', lineHeight: 1.35 }}>
                  {r.route ? <button className="linklike" onClick={() => nav(r.route, { from: 'sjah3420' })} style={{ cursor: 'pointer', background: 'none', border: 0, padding: 0, color: 'var(--blue)', fontWeight: 700 }}>{r.src}</button> : r.src}
                </td>
                <td className="num mono" style={{ fontWeight: 700 }}>{r.unit === '%' ? r.val + '%' : 'Rp ' + pfJ(r.val) + ' jt'}</td>
                <td>{r.ok ? <Badge kind="green">Menutup</Badge> : <Badge kind="red">Selisih</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="panel" style={{ margin: 12, padding: '9px 12px', background: 'var(--surface-2)', boxShadow: 'none' }}>
          <div className="tiny" style={{ lineHeight: 1.5 }}>Tidak ada angka historis yang disimpan modul ini. Prosedur <b>PF2 (¶14)</b> menelusur kolom tidak disesuaikan ke laporan konsolidasian auditan; baris tarif & goodwill mengikat penyesuaian ke tarif pajak & metodologi PPA yang SAMA dengan modul PSAK 46/22.</div>
        </div>
      </Panel>

      {/* PPA ringkas */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Alokasi Harga Akuisisi (PPA) — selaras PSAK 22</h3></div>
          <table className="dtbl">
            <tbody>
              {[
                ['Imbalan dialihkan (kas)', E.ppa.considerationCash, false],
                ['Takberwujud teridentifikasi (¶B31–B33)', E.ppa.intangFVA, false],
                ['Step-up nilai wajar aset tetap', A.target.ppeStepup, false],
                ['(−) Pajak tangguhan atas PNW (¶24)', -E.ppa.dtl, false],
                ['Aset neto teridentifikasi @ NW (FVNIA)', E.ppa.fvnia, true],
                ['NCI proporsional (¶19a · ' + Math.round(E.ppa.nciPct * 100) + '%)', E.ppa.nciAcq, false],
                ['Goodwill (¶32)', E.ppa.goodwill, true],
              ].map((r, i) => (
                <tr key={i} style={r[2] ? { background: 'var(--surface-2)' } : null}>
                  <td style={{ whiteSpace: 'normal', lineHeight: 1.3, fontWeight: r[2] ? 700 : 500 }}>{r[0]}</td>
                  <td className="num mono" style={{ fontWeight: r[2] ? 700 : 600, color: r[1] < 0 ? 'var(--red)' : (r[2] ? 'var(--purple)' : 'var(--ink)') }}>Rp {pfSgn(r[1])} jt</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="panel" style={{ margin: 12, padding: '9px 11px', background: 'var(--purple-bg)', borderColor: 'transparent' }}>
            <div className="tiny" style={{ lineHeight: 1.45 }}>Goodwill = imbalan + NCI − FVNIA = {pfJ(E.ppa.considerationCash)} + {pfJ(E.ppa.nciAcq)} − {pfJ(E.ppa.fvnia)} = <b>{pfJ(E.ppa.goodwill)}</b>. Identik dengan rumus <span className="mono">AMS_CANON.psak22</span>; pajak tangguhan = {Math.round(E.rate * 100)}% × penyesuaian NW.</div>
          </div>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Dampak Laba Rugi Inkremental (¶ basis berkelanjutan)</h3></div>
          <table className="dtbl">
            <tbody>
              {[
                ['(+) Laba neto target (setahun penuh)', A.target.pat],
                ['(−) Amortisasi takberwujud (PPA)', -E.isAdj.amortIncr],
                ['(−) Penyusutan step-up aset tetap', -E.isAdj.deprIncr],
                ['(+) Efek pajak tangguhan penyesuaian', E.isAdj.taxEffect],
              ].map((r, i) => (
                <tr key={i}><td style={{ whiteSpace: 'normal', lineHeight: 1.3 }}>{r[0]}</td><td className="num mono" style={{ fontWeight: 600, color: r[1] < 0 ? 'var(--red)' : 'var(--ink)' }}>Rp {pfSgn(r[1])} jt</td></tr>
              ))}
              <tr style={{ background: 'var(--surface-2)' }}><td style={{ fontWeight: 700 }}>Tambahan laba proforma neto</td><td className="num mono" style={{ fontWeight: 700, color: 'var(--green)' }}>Rp {pfJ(E.isAdj.adjTargetProfit)} jt</td></tr>
            </tbody>
          </table>
          <div className="panel" style={{ margin: 12, padding: '9px 11px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
            <div className="row gap8" style={{ alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--amber)', flex: '0 0 auto' }}><I.alert size={15} /></span>
              <span className="tiny" style={{ lineHeight: 1.45 }}>Biaya akuisisi <b>Rp {pfJ(E.isAdj.acqCosts)} jt</b> bersifat <b>NON-RUTIN (¶53)</b> — DIKELUARKAN dari L/R proforma (basis berkelanjutan), namun berdampak pada LPK (kas & saldo laba). Pendanaan ekuitas → tanpa bunga inkremental.</span>
            </div>
          </div>
        </Panel>
      </div>

      {/* matriks penyesuaian — 3 kriteria */}
      <Panel noBody>
        <div className="panel-h"><h3>Matriks Penyesuaian Proforma — Uji 3 Kriteria (¶15)</h3><div style={{ flex: 1 }} /><Badge kind={E.attrAll && E.suppAll ? 'green' : 'amber'}>{E.counts.adjustments} penyesuaian · {E.counts.recurring} rutin</Badge></div>
        <table className="dtbl">
          <thead><tr>
            <th>Penyesuaian</th><th style={{ width: 52 }}>Lap.</th><th className="num" style={{ width: 96 }}>Nilai</th>
            <th style={{ width: 74 }}>Attrib.</th><th style={{ width: 84 }}>Supportable</th><th style={{ width: 74 }}>Sifat</th><th>Bukti pendukung</th>
          </tr></thead>
          <tbody>
            {E.adjustments.map((a) => (
              <tr key={a.id} style={a.excludedFromIS ? { background: 'var(--amber-bg)' } : null}>
                <td style={{ whiteSpace: 'normal', lineHeight: 1.3 }}><span style={{ fontWeight: 600 }}>{a.label}</span><span className="mono tiny muted"> · {a.cite}</span></td>
                <td className="tiny mono">{a.stmt}</td>
                <td className="num mono tiny" style={{ fontWeight: 700, color: a.amount < 0 ? 'var(--red)' : 'var(--ink)' }}>{pfSgn(a.amount)}</td>
                <td>{a.attr ? <Badge kind="green">Ya</Badge> : <Badge kind="red">Tidak</Badge>}</td>
                <td>{a.supp ? <Badge kind="green">Ya</Badge> : <Badge kind="red">Tidak</Badge>}</td>
                <td>{a.recurring === true ? <Badge kind="blue">Rutin</Badge> : a.recurring === false ? <Badge kind="amber">Non-rutin</Badge> : <Badge kind="gray">Neraca</Badge>}</td>
                <td className="tiny muted" style={{ whiteSpace: 'normal', lineHeight: 1.3 }}>{a.evidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: 12 }}>
          <button onClick={() => toggle('PF3', true)} className="chip" style={{ cursor: 'pointer', height: 26, fontWeight: 700, marginRight: 8, border: '1px solid ' + (E.procedures.find(p => p.id === 'PF3').done ? 'var(--green)' : 'var(--line-strong)'), background: E.procedures.find(p => p.id === 'PF3').done ? 'var(--green-bg)' : '#fff', color: E.procedures.find(p => p.id === 'PF3').done ? 'var(--green)' : 'var(--ink-3)' }}>PF3 · Directly attributable {E.procedures.find(p => p.id === 'PF3').done ? '✓' : ''}</button>
          <button onClick={() => toggle('PF4', false)} className="chip" style={{ cursor: 'pointer', height: 26, fontWeight: 700, border: '1px solid ' + (E.procedures.find(p => p.id === 'PF4').done ? 'var(--green)' : 'var(--line-strong)'), background: E.procedures.find(p => p.id === 'PF4').done ? 'var(--green-bg)' : '#fff', color: E.procedures.find(p => p.id === 'PF4').done ? 'var(--green)' : 'var(--ink-3)' }}>PF4 · Factually supportable {E.procedures.find(p => p.id === 'PF4').done ? '✓' : ''}</button>
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- Tab: Informasi Proforma (statements) ---------------- */
function PfStmtTable({ title, rows, footer }) {
  return (
    <Panel noBody>
      <div className="panel-h"><h3>{title}</h3></div>
      <table className="dtbl">
        <thead><tr>
          <th>Rp juta</th>
          <th className="num" style={{ width: 110 }}>Historis</th>
          <th className="num" style={{ width: 120 }}>Peny. Akuisisi</th>
          <th className="num" style={{ width: 120 }}>Peny. HMETD</th>
          <th className="num" style={{ width: 120 }}>Proforma</th>
        </tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={r.total || r.strong ? { background: 'var(--surface-2)' } : null}>
              <td style={{ whiteSpace: 'normal', lineHeight: 1.3, fontWeight: r.total || r.strong ? 700 : 500, paddingLeft: r.indent ? 22 : undefined, color: r.muted ? 'var(--ink-3)' : undefined }}>{r.label}{r.gw ? <span className="mono tiny muted"> · PSAK 22</span> : null}{r.nci ? <span className="mono tiny muted"> · ¶19a</span> : null}</td>
              <td className="num mono" style={{ fontWeight: r.total || r.strong ? 700 : 600 }}>{pfJ(r.hist)}</td>
              <td className="num mono" style={{ color: r.acq < 0 ? 'var(--red)' : (r.acq > 0 ? 'var(--blue)' : 'var(--ink-4)') }}>{pfSgn(r.acq)}</td>
              <td className="num mono" style={{ color: r.fin < 0 ? 'var(--red)' : (r.fin > 0 ? 'var(--green)' : 'var(--ink-4)') }}>{pfSgn(r.fin)}</td>
              <td className="num mono" style={{ fontWeight: 700, color: r.total ? 'var(--navy)' : undefined }}>{pfJ(r.pf)}</td>
            </tr>
          ))}
          {footer}
        </tbody>
      </table>
    </Panel>
  );
}

function PfStatements({ E, A }) {
  const T = E.bs.tot;
  const bsRows = [
    ...E.bs.assets,
    { label: 'Total Aset', hist: T.aset.hist, acq: T.aset.acq, fin: T.aset.fin, pf: T.aset.pf, total: true },
    ...E.bs.liab,
    ...E.bs.equity,
    { label: 'Total Liabilitas & Ekuitas', hist: T.liab.hist + T.ekuitas.hist, acq: T.liab.acq + T.ekuitas.acq, fin: T.liab.fin + T.ekuitas.fin, pf: T.liab.pf + T.ekuitas.pf, total: true },
  ];
  const isRows = [
    ...E.is.rows,
    { ...E.is.profit },
    ...E.is.attrib.map(r => ({ ...r, indent: true, muted: true })),
  ];
  return (
    <div className="grid" style={{ gap: 12 }}>
      <PfStmtTable title="Laporan Posisi Keuangan Proforma Konsolidasian — per 31 Desember 2025 (ilustratif)" rows={bsRows}
        footer={<tr><td colSpan={5} className="tiny muted" style={{ padding: '8px 12px', lineHeight: 1.5 }}>Penyesuaian akuisisi mengonsolidasi aset & liabilitas {A.target.name} pada nilai wajar + goodwill; penyesuaian HMETD menambah kas & ekuitas dari dana neto. Selisih A − (L+E) = <b style={{ color: E.bs.balance === 0 ? 'var(--green)' : 'var(--red)' }}>{pfJ(E.bs.balance)}</b> (menutup).</td></tr>} />

      <PfStmtTable title="Laporan Laba Rugi Proforma Konsolidasian — tahun berakhir 31 Desember 2025 (ilustratif)" rows={isRows}
        footer={<tr><td colSpan={5} className="tiny muted" style={{ padding: '8px 12px', lineHeight: 1.5 }}>Disusun seolah-olah akuisisi terjadi 1 Jan 2025. Biaya akuisisi non-rutin (Rp {pfJ(E.isAdj.acqCosts)} jt) DIKELUARKAN dari basis berkelanjutan ini.</td></tr>} />

      {/* EPS accretion */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Laba Per Saham (Basic) — Historis vs Proforma</h3><div style={{ flex: 1 }} /><Badge kind={E.eps.accretion >= 0 ? 'green' : 'red'}>{E.eps.accretion >= 0 ? 'Akretif' : 'Dilutif'}</Badge></div>
          <div style={{ padding: 14 }}>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 12 }}>
              <KvBox label="Saham beredar — historis" v={pfJ(E.eps.existingShares) + ' jt lembar'} accent="var(--navy)" />
              <KvBox label="Saham beredar — proforma" v={pfJ(E.eps.pfShares) + ' jt lembar'} accent="var(--blue)" />
              <KvBox label="EPS historis" v={'Rp ' + AMS.fmt(E.eps.histEPS, 1)} accent="var(--ink-2)" />
              <KvBox label="EPS proforma" v={'Rp ' + AMS.fmt(E.eps.pfEPS, 1)} accent={E.eps.accretion >= 0 ? 'var(--green)' : 'var(--red)'} />
            </div>
            <div className="tiny muted upper" style={{ marginBottom: 5 }}>Perubahan EPS</div>
            <div style={{ position: 'relative', height: 12, borderRadius: 6, background: 'var(--surface-3)', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, width: Math.min(100, Math.abs(E.eps.accretion) / E.eps.histEPS * 100) + '%', background: E.eps.accretion >= 0 ? 'var(--green)' : 'var(--red)' }} />
            </div>
            <p className="tiny muted" style={{ margin: '9px 0 0', lineHeight: 1.5 }}>EPS proforma membagi laba atribusi pemilik induk proforma (Rp {pfJ(E.eps.pfOwners)} jt) dengan saham pasca-HMETD. {E.eps.accretion >= 0 ? 'Tambahan laba akuisisi melampaui dilusi dari saham baru — proforma akretif.' : 'Dilusi dari penerbitan saham baru melampaui tambahan laba akuisisi tahun pertama — proforma dilutif (lazim untuk akuisisi yang didanai ekuitas).'}</p>
          </div>
        </Panel>

        <Panel title="Ringkasan Dampak Proforma">
          <div style={{ display: 'grid', gap: 8 }}>
            <RowKv label="Pendapatan historis" v={'Rp ' + pfJ(E.base.consolRev) + ' jt'} />
            <RowKv label="Pendapatan proforma" v={'Rp ' + pfJ(E.is.rows[0].pf) + ' jt'} strong />
            <div className="divider" />
            <RowKv label="Laba historis" v={'Rp ' + pfJ(E.base.consolNpat) + ' jt'} />
            <RowKv label="Laba proforma" v={'Rp ' + pfJ(E.is.pfNpat) + ' jt'} strong />
            <div className="divider" />
            <RowKv label="Total aset historis" v={'Rp ' + pfJ(E.base.baseTotAset) + ' jt'} />
            <RowKv label="Total aset proforma" v={'Rp ' + pfJ(E.bs.tot.aset.pf) + ' jt'} strong />
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Simpulan & Laporan ---------------- */
function PfReport({ E, A }) {
  const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  const C = E.conclusion;
  return (
    <div className="grid" style={{ gridTemplateColumns: '320px 1fr', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Prosedur Asurans (¶)</h3><div style={{ flex: 1 }} /><span className="mono tiny" style={{ fontWeight: 700 }}>{E.counts.proceduresDone}/{E.counts.procedures}</span></div>
          <div style={{ padding: 10, display: 'grid', gap: 6 }}>
            {E.procedures.map(p => (
              <div key={p.id} className="row jb ac" style={{ fontSize: 11.5, padding: '7px 9px', borderRadius: 6, background: 'var(--surface-2)' }}>
                <span style={{ lineHeight: 1.3, paddingRight: 8 }}><span className="mono tiny muted" style={{ fontWeight: 700 }}>{p.ref}</span> {p.short}</span>
                <Badge kind={p.done ? 'green' : 'amber'}>{p.done ? 'Selesai' : 'Tertunda'}</Badge>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Karakter Perikatan">
          <div style={{ display: 'grid', gap: 8 }}>
            <RowKv label="Tingkat Keyakinan" v={A.level} />
            <RowKv label="Bentuk Opini" v="Positif (proper compilation)" />
            <RowKv label="Goodwill akuisisi" v={'Rp ' + pfJ(E.ppa.goodwill) + ' jt'} />
            <RowKv label="Dana HMETD (neto)" v={'Rp ' + pfJ(E.fin.netProceeds) + ' jt'} />
            <RowKv label="Standar" v={A.framework} />
          </div>
        </Panel>
      </div>

      <Panel noBody>
        <div className="panel-h"><h3>Pratinjau Laporan Asurans Akuntan Pelapor Independen</h3><div style={{ flex: 1 }} /><Badge kind={E.canIssue ? 'green' : 'amber'}>{E.canIssue ? 'Siap terbit' : 'Draf'}</Badge></div>
        <div style={{ padding: 18 }}>
          <div className="doc-paper" style={{ background: '#fff', padding: '34px 40px', boxShadow: 'var(--shadow)', fontSize: 11.5, lineHeight: 1.7, color: '#283b46' }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#0c2430', textAlign: 'center', marginBottom: 4 }}>LAPORAN ASURANS AKUNTAN PELAPOR INDEPENDEN ATAS PENYUSUNAN INFORMASI KEUANGAN PROFORMA</div>
            <div className="tiny" style={{ textAlign: 'center', color: '#7a8893', marginBottom: 16 }}>{A.std} · Keyakinan {A.level} · Tercantum dalam Prospektus PUT II {A.issuer}</div>
            <p style={{ margin: '0 0 10px' }}>Kepada Direksi {A.issuer}</p>

            <div style={{ fontWeight: 700, color: '#0c2430', margin: '0 0 4px' }}>Laporan atas Informasi Keuangan Proforma</div>
            <p style={{ margin: '0 0 10px' }}>Kami telah menyelesaikan perikatan asurans untuk melaporkan apakah informasi keuangan proforma konsolidasian {A.issuer} telah disusun dengan benar oleh Direksi. Informasi proforma terdiri dari laporan posisi keuangan proforma per 31 Desember 2025, laporan laba rugi proforma untuk tahun yang berakhir pada tanggal tersebut, dan catatan terkait. {A.basis}</p>

            <div style={{ fontWeight: 700, color: '#0c2430', margin: '12px 0 4px' }}>Tanggung Jawab Direksi & Akuntan Pelapor</div>
            <p style={{ margin: '0 0 10px' }}>Direksi bertanggung jawab atas penyusunan informasi keuangan proforma atas dasar yang dijelaskan dalam Catatan. Tanggung jawab kami adalah menyatakan opini, sebagaimana disyaratkan {A.std}, tentang apakah informasi keuangan proforma telah disusun, dalam semua hal yang material, oleh Direksi atas dasar tersebut.</p>

            <div style={{ fontWeight: 700, color: '#9a6a00', margin: '12px 0 4px' }}>Tujuan & Keterbatasan</div>
            <p style={{ margin: '0 0 10px', color: '#7a5a1f' }}>{C.illustrative} {C.scope}</p>

            <div style={{ fontWeight: 700, color: C.type === 'unmodified' ? '#1f7a4d' : '#9a6a00', margin: '12px 0 4px' }}>Opini</div>
            <p style={{ margin: '0 0 10px', color: C.type === 'unmodified' ? '#2f5d47' : '#7a5a1f' }}>{C.opinion}{E.canIssue ? '' : ' (DRAF — selesaikan prosedur PF4–PF8 sebelum penerbitan.)'}</p>

            <div style={{ marginTop: 24, paddingTop: 10, borderTop: '1px solid #e0e5ea', fontSize: 11 }}><b>{A.partner}</b> · Akuntan Publik — Akuntan Pelapor<br /><span className="tiny" style={{ color: '#7a8893' }}>Jakarta, {today}</span></div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

Object.assign(window, { SJAH3420View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SJAH3420View };
