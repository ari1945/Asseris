/* [codemod] ESM imports */
import React from 'react';
import { useAudit, useFirm, useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { Avatar, Badge, Btn, Donut, Panel, Progress, Spark } from './ui.jsx';
import { amsExportPdf } from './export_pdf.js';

/* ============================================================
   NeoSuite AMS — Materiality (SA 320 / SA 450) — heavy tab panels
   Specific · Component (group) · Impact & SAD · Revision · Memo
   Consumed by MaterialityCalc in view_materiality.jsx
   ============================================================ */
const { useState: useStateMP, useMemo: useMemoMP } = React;

const _FM = (n, d = 0) => window.AMS.fmt(n, d);
const _RP = (n) => 'Rp ' + window.AMS.fmt(n);
const _M = (n) => 'Rp ' + window.AMS.fmt(n / 1e6) + ' jt';

/* Memo prose — single source shared by the on-screen preview AND the PDF export (W10.5), so the
   two can't drift. Section 1 is dynamic (interpolates the chosen benchmark/percentages). */
const MAT_MEMO_SEC1 = (bench, pct, om) =>
  `Benchmark utama adalah ${bench.label} sebesar ${_RP(bench.value)} (${bench.note}). Persentase ${pct}% diterapkan (kisaran lazim ${bench.lo}–${bench.hi}%), menghasilkan Materialitas Keseluruhan ${_RP(om)}.`;
const MAT_MEMO_SEC2 =
  'Materialitas spesifik ditetapkan lebih rendah untuk remunerasi manajemen kunci, transaksi pihak berelasi, dan pengungkapan segmen (lihat tab terkait). Untuk audit grup, materialitas dialokasikan ke tiap komponen sesuai SA 600.';
const MAT_MEMO_SEC3 =
  'Materialitas dinilai memadai untuk merancang sifat, saat, dan luas prosedur audit. Salah saji agregat yang belum dikoreksi dievaluasi terhadap OM pada penyelesaian audit (SA 450).';

/* compact money editor — value held in Rupiah, edited in juta */
function MoneyJuta({ value, onChange, step = 50, w = 96, locked }) {
  if (locked) return <span className="mono" style={{ fontWeight: 700 }}>{_FM(value)}</span>;
  return (
    <span className="row ac gap6" style={{ justifyContent: 'flex-end' }}>
      <input type="number" className="input" min="0" step={step}
        value={Math.round(value / 1e6)}
        onChange={e => onChange(Math.max(0, (+e.target.value || 0) * 1e6))}
        style={{ height: 24, width: w, textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700, padding: '0 7px' }} />
      <span className="tiny muted">jt</span>
    </span>
  );
}

/* ============================================================
   TAB 2 — Materialitas Spesifik (SA 320.10)
   ============================================================ */
const DEFAULT_SPECIFICS = [
  { id: 'SM-1', area: 'Remunerasi Manajemen Kunci & Direksi', basis: 'PSAK 7 — pengungkapan sensitif; perhatian publik & OJK', value: 850_000_000, wp: 'RP-2', status: 'Disetujui' },
  { id: 'SM-2', area: 'Transaksi Pihak Berelasi', basis: 'SA 550 — berisiko & sensitif bagi pengguna LK', value: 1_200_000_000, wp: 'RP-1', status: 'Disetujui' },
  { id: 'SM-3', area: 'Pengungkapan Segmen Operasi', basis: 'PSAK 5 — dasar keputusan investor entitas tercatat', value: 1_500_000_000, wp: 'N-3', status: 'Usulan' },
  { id: 'SM-4', area: 'Kewajiban Kontinjensi & Komitmen', basis: 'Litigasi & jaminan; berpotensi memengaruhi keputusan', value: 900_000_000, wp: 'L-4', status: 'Usulan' },
];

function MatSpecific({ om, pmPct, locked }) {
  const [rows, setRows] = window.useAmsPersist('mat.specifics', DEFAULT_SPECIFICS);
  const set = (id, patch) => setRows(list => list.map(r => r.id === id ? { ...r, ...patch } : r));
  const addRow = () => setRows(list => [...list, { id: 'SM-' + (list.length + 1), area: 'Area / kelas baru', basis: 'Dasar pertimbangan…', value: 800_000_000, wp: '—', status: 'Usulan' }]);
  const del = (id) => setRows(list => list.filter(r => r.id !== id));
  const overOM = rows.filter(r => r.value >= om).length;

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 300px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h">
          <h3>Materialitas Spesifik</h3>
          <span className="sub">SA 320.10 — kelas transaksi, saldo akun & pengungkapan tertentu</span>
          <div style={{ flex: 1 }} />
          {!locked && <Btn sm onClick={addRow}><I.plus size={13} /> Tambah Kelas</Btn>}
        </div>
        <table className="dtbl">
          <thead><tr>
            <th style={{ width: 44 }}>ID</th>
            <th>Kelas / Pengungkapan</th>
            <th className="num" style={{ width: 132 }}>Materialitas Spesifik</th>
            <th className="num" style={{ width: 118 }}>PM Spesifik</th>
            <th style={{ width: 52 }}>WP</th>
            <th style={{ width: 92 }}>Status</th>
            {!locked && <th style={{ width: 30 }}></th>}
          </tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td className="mono tiny" style={{ fontWeight: 700 }}>{r.id}</td>
                <td style={{ whiteSpace: 'normal', padding: '6px 9px' }}>
                  <div style={{ fontWeight: 600 }}>{r.area}</div>
                  <div className="tiny muted" style={{ lineHeight: 1.35 }}>{r.basis}</div>
                </td>
                <td className="num"><MoneyJuta value={r.value} onChange={v => set(r.id, { value: v })} locked={locked} /></td>
                <td className="num mono muted">{_FM(Math.round(r.value * pmPct / 100))}</td>
                <td><span className="chip tiny" style={{ height: 18, padding: '0 6px', fontFamily: 'var(--mono)' }}>{r.wp}</span></td>
                <td><Badge kind={r.status === 'Disetujui' ? 'green' : 'amber'}>{r.status}</Badge></td>
                {!locked && <td><button className="p-act" title="Hapus" onClick={() => del(r.id)} style={{ color: 'var(--ink-4)' }}><I.x size={13} /></button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Konsep" sub="Mengapa lebih rendah dari OM">
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: 'var(--ink-2)' }}>
            Untuk kelas transaksi, saldo akun, atau pengungkapan tertentu, salah saji bernilai <b>lebih kecil dari Materialitas Keseluruhan</b> tetap
            dapat memengaruhi keputusan ekonomi pengguna. Auditor menetapkan tingkat materialitas spesifik yang lebih rendah untuk pos-pos tersebut.
          </p>
        </Panel>
        <Panel title="Validasi">
          <div className="row jb ac" style={{ marginBottom: 9 }}>
            <span className="tiny muted upper">OM Keseluruhan</span>
            <span className="mono" style={{ fontWeight: 700 }}>{_RP(om)}</span>
          </div>
          <div className="divider" />
          <div className="panel" style={{ padding: '10px 12px', background: overOM ? 'var(--amber-bg)' : 'var(--green-bg)', borderColor: 'transparent' }}>
            <div className="row ac gap8">
              <span style={{ color: overOM ? 'var(--amber)' : 'var(--green)' }}>{overOM ? <I.alert size={16} /> : <I.checkCircle size={16} />}</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>
                {overOM ? `${overOM} materialitas spesifik ≥ OM — tinjau kembali, seharusnya lebih rendah.` : 'Seluruh materialitas spesifik berada di bawah OM keseluruhan.'}
              </span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ============================================================
   TAB 3 — Materialitas Komponen / Grup (SA 600)
   ============================================================ */
const DEFAULT_COMPONENTS = [
  { id: 'K-1', name: 'PT Sentosa Makmur Tbk', role: 'Induk (Parent)', sig: true, scope: 'Audit penuh', contrib: 58, cm: 3_000_000_000 },
  { id: 'K-2', name: 'PT Sentosa Distribusi Nusantara', role: 'Anak — Distribusi', sig: true, scope: 'Audit penuh', contrib: 27, cm: 2_400_000_000 },
  { id: 'K-3', name: 'PT Makmur Logistik', role: 'Anak — Logistik', sig: false, scope: 'Prosedur analitis', contrib: 9, cm: 1_400_000_000 },
  { id: 'K-4', name: 'PT Sentosa Properti Indah', role: 'Anak — Properti', sig: false, scope: 'Prosedur spesifik', contrib: 6, cm: 1_200_000_000 },
];

function MatComponent({ om, locked }) {
  const [rows, setRows] = window.useAmsPersist('mat.components', DEFAULT_COMPONENTS);
  const set = (id, patch) => setRows(list => list.map(r => r.id === id ? { ...r, ...patch } : r));
  const sumCM = rows.reduce((s, r) => s + r.cm, 0);
  const coverage = rows.filter(r => r.scope === 'Audit penuh').reduce((s, r) => s + r.contrib, 0);
  const overGroup = rows.filter(r => r.cm > om).length;
  const ctThreshold = Math.round(om * 0.05);

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 300px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h">
          <h3>Materialitas Komponen</h3>
          <span className="sub">SA 600 — alokasi materialitas ke komponen grup</span>
          <div style={{ flex: 1 }} />
          <Badge kind="purple">Audit Grup</Badge>
        </div>
        <table className="dtbl">
          <thead><tr>
            <th style={{ width: 40 }}>Kode</th>
            <th>Komponen</th>
            <th style={{ width: 120 }}>Cakupan</th>
            <th className="num" style={{ width: 70 }}>% Konsol.</th>
            <th className="num" style={{ width: 132 }}>Mat. Komponen</th>
          </tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td className="mono tiny" style={{ fontWeight: 700 }}>{r.id}</td>
                <td style={{ whiteSpace: 'normal', padding: '6px 9px' }}>
                  <div className="row ac gap6"><span style={{ fontWeight: 600 }}>{r.name}</span>{r.sig && <Badge kind="red">Signifikan</Badge>}</div>
                  <div className="tiny muted">{r.role}</div>
                </td>
                <td><Badge kind={r.scope === 'Audit penuh' ? 'blue' : 'gray'}>{r.scope}</Badge></td>
                <td className="num mono">{r.contrib}%</td>
                <td className="num">
                  <MoneyJuta value={r.cm} onChange={v => set(r.id, { cm: v })} locked={locked} />
                  {r.cm > om && <div className="tiny" style={{ color: 'var(--red)', fontWeight: 600 }}>melebihi OM grup</div>}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr>
            <td colSpan={3}>Total materialitas komponen (agregat)</td>
            <td className="num mono">{coverage}%</td>
            <td className="num mono">{_FM(sumCM)}</td>
          </tr></tfoot>
        </table>
      </Panel>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Cakupan Audit Grup" sub="Komponen audit penuh">
          <div className="row ac" style={{ gap: 14, justifyContent: 'center', padding: '4px 0 8px' }}>
            <Donut size={96} thickness={14} segments={[{ value: coverage, color: 'var(--blue)' }, { value: Math.max(0, 100 - coverage), color: 'var(--surface-3)' }]}
              center={<div><div className="mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--navy)' }}>{coverage}%</div><div className="tiny muted">cakupan</div></div>} />
          </div>
          <div className="tiny muted" style={{ textAlign: 'center', lineHeight: 1.5 }}>Komponen audit penuh meliputi {coverage}% pendapatan konsolidasian.</div>
        </Panel>

        <Panel title="Risiko Agregasi & Ambang">
          <Line label="OM Grup" val={_RP(om)} />
          <Line label="Agregat Mat. Komponen" val={_RP(sumCM)} sub="boleh > OM grup (komponen diaudit terpisah)" />
          <Line label="Ambang remeh komponen (5%)" val={_RP(ctThreshold)} />
          <div className="divider" />
          <div className="panel" style={{ padding: '10px 12px', background: overGroup ? 'var(--amber-bg)' : 'var(--green-bg)', borderColor: 'transparent' }}>
            <div className="row ac gap8">
              <span style={{ color: overGroup ? 'var(--amber)' : 'var(--green)' }}>{overGroup ? <I.alert size={16} /> : <I.checkCircle size={16} />}</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>
                {overGroup ? `${overGroup} komponen melebihi OM grup — wajib ≤ OM grup.` : 'Setiap materialitas komponen ≤ OM grup. Alokasi memadai.'}
              </span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ============================================================
   TAB 4 — Dampak ke Akun & Ikhtisar Salah Saji (SA 450)
   ============================================================ */
const SAD_TYPE = { 'AJE-03': 'Faktual', 'AJE-05': 'Penilaian' };
const SEEDED_UNCORR = [
  { id: 'U-S1', ref: 'C-5', desc: 'Proyeksi salah saji uji rinci persediaan (ekstrapolasi sampel)', type: 'Proyeksi', pbt: -380_000_000 },
  { id: 'U-S2', ref: 'H-2', desc: 'Selisih asumsi tingkat diskonto imbalan kerja', type: 'Penilaian', pbt: -240_000_000 },
];

function MatImpact({ om, pm, ctt, locked }) {
  const nav = useNav();
  const { wtb, aje } = useAudit();

  const identified = useMemoMP(() =>
    wtb.filter(r => Math.abs(r.aje) >= ctt).sort((a, b) => Math.abs(b.aje) - Math.abs(a.aje)), [wtb, ctt]);
  const overPM = identified.filter(r => Math.abs(r.aje) > pm).length;

  const uncorrected = useMemoMP(() => {
    const fromAje = aje.filter(a => a.status !== 'Posted').map(a => ({
      id: a.id, ref: a.ref, desc: a.desc, type: SAD_TYPE[a.id] || 'Faktual', pbt: -Math.abs(a.amount),
    }));
    return [...fromAje, ...SEEDED_UNCORR];
  }, [aje]);

  const aggPbt = uncorrected.reduce((s, u) => s + u.pbt, 0);
  const afterTax = Math.round(aggPbt * 0.78);
  const matGross = Math.abs(aggPbt);
  const isMaterial = matGross > om;
  const overPmAgg = matGross > pm;
  const pctOfOM = (matGross / om * 100);
  const TYPE_KIND = { Faktual: 'red', Penilaian: 'amber', Proyeksi: 'purple' };

  return (
    <div className="grid" style={{ gap: 12 }}>
      {/* identified misstatements per account */}
      <Panel noBody>
        <div className="panel-h">
          <h3>Akun dengan Salah Saji Teridentifikasi</h3>
          <span className="sub">melebihi ambang remeh {_RP(ctt)}</span>
          <div style={{ flex: 1 }} />
          <Badge kind={overPM ? 'red' : 'amber'}>{overPM} akun &gt; PM</Badge>
          <Btn sm onClick={() => nav('wtb')}><I.table size={13} /> Buka WTB</Btn>
        </div>
        <table className="dtbl">
          <thead><tr>
            <th style={{ width: 70 }}>Kode</th><th>Akun</th><th style={{ width: 90 }}>Lead</th>
            <th className="num" style={{ width: 150 }}>Salah Saji (AJE)</th>
            <th className="num" style={{ width: 120 }}>% thd PM</th>
            <th style={{ width: 110 }}>Tingkat</th>
          </tr></thead>
          <tbody>
            {identified.map(r => {
              const mag = Math.abs(r.aje);
              const ratio = mag / pm * 100;
              const lvl = mag > pm ? 'red' : mag > pm * 0.5 ? 'amber' : 'green';
              return (
                <tr key={r.key}>
                  <td className="mono tiny" style={{ fontWeight: 700 }}>{r.code}</td>
                  <td>{r.name}</td>
                  <td><span className="chip tiny" style={{ height: 18, padding: '0 6px', fontFamily: 'var(--mono)' }}>{r.lead}</span></td>
                  <td className="num mono" style={{ color: r.aje < 0 ? 'var(--red)' : 'var(--ink)' }}>{_FM(r.aje)}</td>
                  <td className="num">
                    <span className="row ac gap6" style={{ justifyContent: 'flex-end' }}>
                      <span style={{ width: 54 }}><Progress value={Math.min(100, ratio)} color={lvl === 'red' ? 'var(--red)' : lvl === 'amber' ? 'var(--amber)' : 'var(--green)'} /></span>
                      <span className="mono tiny">{ratio.toFixed(0)}%</span>
                    </span>
                  </td>
                  <td><Badge kind={lvl}>{lvl === 'red' ? 'Signifikan' : lvl === 'amber' ? 'Perlu telaah' : 'Di bawah PM'}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>

      {/* SAD — uncorrected misstatements */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 320px', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h">
            <h3>Ikhtisar Salah Saji (SAD)</h3>
            <span className="sub">SA 450 — salah saji belum dikoreksi</span>
            <div style={{ flex: 1 }} />
            <Badge kind="gray">{uncorrected.length} item</Badge>
          </div>
          <table className="dtbl">
            <thead><tr>
              <th style={{ width: 64 }}>Ref</th><th>Deskripsi</th>
              <th style={{ width: 96 }}>Jenis</th>
              <th className="num" style={{ width: 150 }}>Dampak ke Laba Sblm Pajak</th>
            </tr></thead>
            <tbody>
              {uncorrected.map(u => (
                <tr key={u.id}>
                  <td className="mono tiny" style={{ fontWeight: 700 }}>{u.ref}</td>
                  <td style={{ whiteSpace: 'normal', padding: '6px 9px' }}>{u.desc}</td>
                  <td><Badge kind={TYPE_KIND[u.type]}>{u.type}</Badge></td>
                  <td className="num mono" style={{ color: u.pbt < 0 ? 'var(--red)' : 'var(--green)' }}>{_FM(u.pbt)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={3}>Agregat — bruto (sblm pajak)</td><td className="num mono" style={{ color: 'var(--red)' }}>{_FM(aggPbt)}</td></tr>
              <tr><td colSpan={3} style={{ fontWeight: 500, color: 'var(--ink-3)' }}>Setelah dampak pajak (≈22%)</td><td className="num mono">{_FM(afterTax)}</td></tr>
            </tfoot>
          </table>
        </Panel>

        <div className="grid" style={{ gap: 12 }}>
          <Panel noBody>
            <div style={{ background: isMaterial ? 'linear-gradient(125deg,#7a1d18,#b3261e)' : 'linear-gradient(125deg,#0d4a2f,#1f7a4d)', color: '#fff', padding: '14px 16px' }}>
              <div className="tiny" style={{ opacity: .85, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 3 }}>Kesimpulan SA 450</div>
              <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{isMaterial ? 'Salah saji agregat MATERIAL' : 'Salah saji agregat tidak material'}</div>
              <div className="tiny" style={{ opacity: .9, marginTop: 5 }}>Agregat {_RP(matGross)} = {pctOfOM.toFixed(0)}% dari OM</div>
            </div>
            <div style={{ padding: '12px 14px' }}>
              {[['Agregat tak-dikoreksi', matGross, om], ['Performance Materiality', pm, om], ['Overall Materiality', om, om]].map(([lbl, v, base]) => (
                <div key={lbl} style={{ marginBottom: 10 }}>
                  <div className="row jb ac" style={{ marginBottom: 3 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600 }}>{lbl}</span>
                    <span className="mono tiny" style={{ fontWeight: 700 }}>{_FM(v)}</span>
                  </div>
                  <div style={{ height: 9, borderRadius: 5, background: 'var(--surface-3)' }}>
                    <div style={{ width: Math.min(100, v / base * 100) + '%', height: '100%', borderRadius: 5, background: lbl[0] === 'A' ? (overPmAgg ? 'var(--amber)' : 'var(--green)') : lbl[0] === 'P' ? 'var(--blue-400)' : 'var(--blue)' }} />
                  </div>
                </div>
              ))}
              {overPmAgg && !isMaterial && (
                <div className="tiny" style={{ color: 'var(--amber)', fontWeight: 600, marginTop: 4, lineHeight: 1.45 }}>
                  Agregat melampaui PM — minta koreksi manajemen & dokumentasikan alasan jika tetap tak dikoreksi.
                </div>
              )}
            </div>
          </Panel>
          <Panel>
            <div className="row gap8">
              <Btn sm style={{ flex: 1 }} onClick={() => nav('sad')}><I.report size={14} /> SAD penuh</Btn>
              <Btn sm style={{ flex: 1 }}><I.mail size={14} /> Surat Representasi</Btn>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   TAB 5 — Revisi & Riwayat (SA 320.12–13)
   ============================================================ */
const DEFAULT_REVISIONS = [
  { id: 'V1', date: '2025-11-04', phase: 'Perencanaan', from: 0, to: 3_900_000_000, basis: 'PBT estimasi awal Rp 78,0 M × 5%', by: 'Anindya P.', appr: 'Hartono W.' },
  { id: 'V2', date: '2026-01-22', phase: 'Interim', from: 3_900_000_000, to: 4_250_000_000, basis: 'PBT interim teraudit naik ke Rp 85,0 M; benchmark disesuaikan', by: 'Anindya P.', appr: 'Hartono W.' },
];

function MatRevision({ om, applied, locked }) {
  const [revs, setRevs] = window.useAmsPersist('mat.revisions', DEFAULT_REVISIONS);
  const last = revs[revs.length - 1];
  const proposed = om !== last.to;
  const trend = [...revs.map(r => r.to), om].map(v => v / 1e9);

  const commit = () => setRevs(list => [...list, {
    id: 'V' + (list.length + 1), date: new Date().toISOString().slice(0, 10), phase: 'Eksekusi',
    from: last.to, to: om, basis: 'Penyesuaian saat eksekusi — lihat memo materialitas', by: 'Anindya P.', appr: 'Menunggu',
  }]);

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 320px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h">
          <h3>Riwayat Revisi Materialitas</h3>
          <span className="sub">SA 320.12–13 — perubahan selama penugasan</span>
          <div style={{ flex: 1 }} />
          {proposed && !locked && <Btn sm variant="primary" onClick={commit}><I.plus size={13} /> Catat Revisi ({_M(om)})</Btn>}
        </div>
        <div style={{ padding: '16px 18px' }}>
          {revs.map((r, i) => {
            const up = r.to > r.from;
            const delta = r.from ? ((r.to - r.from) / r.from * 100) : null;
            return (
              <div key={r.id} className="row" style={{ gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--blue)', border: '2px solid var(--surface)', boxShadow: '0 0 0 2px var(--blue-100)' }} />
                  {i < revs.length - 1 && <span style={{ flex: 1, width: 2, background: 'var(--line)', minHeight: 26 }} />}
                </div>
                <div style={{ paddingBottom: 18, flex: 1 }}>
                  <div className="row ac gap8" style={{ marginBottom: 2 }}>
                    <Badge kind="blue">{r.phase}</Badge>
                    <span className="mono tiny muted">{r.date}</span>
                    {r.appr === 'Menunggu' ? <Badge kind="amber">Menunggu persetujuan</Badge> : <span className="tiny muted">disetujui {r.appr}</span>}
                  </div>
                  <div className="row ac gap8" style={{ margin: '3px 0' }}>
                    {r.from > 0 && <><span className="mono muted">{_FM(r.from)}</span><I.arrowRight size={13} style={{ color: 'var(--ink-4)' }} /></>}
                    <span className="mono" style={{ fontWeight: 700, fontSize: 14 }}>{_FM(r.to)}</span>
                    {delta != null && <span className="badge" style={{ background: up ? 'var(--green-bg)' : 'var(--red-bg)', color: up ? 'var(--green)' : 'var(--red)' }}>{up ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%</span>}
                  </div>
                  <div className="tiny" style={{ color: 'var(--ink-2)' }}>{r.basis} · <span className="muted">oleh {r.by}</span></div>
                </div>
              </div>
            );
          })}
          {proposed && (
            <div className="row" style={{ gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--surface)', border: '2px dashed var(--blue)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <Badge kind="purple">Usulan saat ini</Badge>
                <div className="row ac gap8" style={{ margin: '3px 0' }}>
                  <span className="mono muted">{_FM(last.to)}</span><I.arrowRight size={13} style={{ color: 'var(--ink-4)' }} />
                  <span className="mono" style={{ fontWeight: 700, fontSize: 14, color: 'var(--blue)' }}>{_FM(om)}</span>
                </div>
                <div className="tiny muted">Belum dicatat sebagai revisi resmi — gunakan tombol di atas.</div>
              </div>
            </div>
          )}
        </div>
      </Panel>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Tren OM" sub="sepanjang penugasan (Rp miliar)">
          <div style={{ display: 'grid', placeItems: 'center', padding: '6px 0' }}>
            <Spark data={trend} width={250} height={70} color="#005085" />
          </div>
          <div className="row jb tiny muted" style={{ marginTop: 4 }}>
            <span>{revs[0].phase}</span><span>Usulan</span>
          </div>
        </Panel>
        <Panel title="Catatan SA 320">
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: 'var(--ink-2)' }}>
            Auditor merevisi materialitas bila memperoleh informasi yang, seandainya diketahui sejak awal, akan menghasilkan
            angka berbeda — misalnya perubahan signifikan hasil keuangan aktual. Setiap revisi <b>didokumentasikan dan disetujui</b> partner.
          </p>
        </Panel>
      </div>
    </div>
  );
}

/* ============================================================
   TAB 6 — Memo & Persetujuan (SA 230)
   ============================================================ */
function MatMemo({ bench, pct, pmPct, cttPct, om, pm, ctt, applied, onApply, locked }) {
  const { activeEngagement, activeClient } = useFirm();
  const [sign, setSign] = window.useAmsPersist('mat.memo.signoff', {
    preparer: { name: 'Anindya Pramesti', role: 'Audit Manager', at: '2026-02-18 09:40' },
    manager: null, partner: null,
  });
  const now = () => new Date().toISOString().slice(0, 16).replace('T', ' ');
  const doSign = (key, name, role) => setSign(s => ({ ...s, [key]: s[key] ? null : { name, role, at: now() } }));
  const fullySigned = sign.preparer && sign.manager && sign.partner;
  const diff = Math.abs(om - applied) / applied;
  const [exporting, setExporting] = useStateMP(false);

  // W10.5 — build the memo PDF from the SAME prose the preview shows (MAT_MEMO_SEC1..3), seal it
  // server-side, and download. Degrades to an unsealed PDF if the server/role won't seal.
  const onExportPdf = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const signers = [
        sign.preparer && { label: 'Disusun oleh', name: sign.preparer.name, role: sign.preparer.role, at: sign.preparer.at },
        sign.manager && { label: 'Ditelaah — Manager', name: sign.manager.name, role: sign.manager.role, at: sign.manager.at },
        sign.partner && { label: 'Disetujui — Partner', name: sign.partner.name, role: sign.partner.role, at: sign.partner.at },
      ].filter(Boolean);
      await amsExportPdf({
        kind: 'materiality', scope: 'engagement', scopeId: activeEngagement?.id,
        fileName: `Memo Materialitas - ${activeClient?.name || 'Klien'}.pdf`,
        firm: 'KAP Wijaya Hartono & Rekan',
        title: 'Penetapan Materialitas Audit',
        meta: [
          `${activeEngagement?.id || ''} · ${activeClient?.name || ''}`,
          `FY2025 · Standar ${activeEngagement?.standard || 'SAK'} · SA 320 & SA 450`,
        ],
        blocks: [
          { type: 'heading', text: '1. Pemilihan Benchmark & Persentase' },
          { type: 'para', text: MAT_MEMO_SEC1(bench, pct, om) },
          { type: 'kv', rows: [
            ['Materialitas Keseluruhan (OM)', _RP(om)],
            [`Performance Materiality (${pmPct}% OM)`, _RP(pm)],
            [`Ambang Jelas Remeh (${cttPct}% OM)`, _RP(ctt)],
          ] },
          { type: 'heading', text: '2. Materialitas Spesifik & Komponen' },
          { type: 'para', text: MAT_MEMO_SEC2 },
          { type: 'heading', text: '3. Kesimpulan' },
          { type: 'para', text: MAT_MEMO_SEC3 },
          { type: 'signature', signers: signers.length ? signers : [{ label: 'Disusun oleh', name: '—' }] },
        ],
      });
    } finally {
      setExporting(false);
    }
  };

  const Row = ({ label, value, strong }) => (
    <div className="row jb ac" style={{ padding: '7px 0', borderBottom: '1px solid var(--line-soft)' }}>
      <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{label}</span>
      <span className="mono" style={{ fontWeight: strong ? 700 : 600, fontSize: strong ? 14 : 12.5 }}>{value}</span>
    </div>
  );
  const SignBox = ({ k, title }) => {
    const s = sign[k];
    return (
      <div className="panel" style={{ padding: '11px 13px', background: s ? 'var(--green-bg)' : 'var(--surface-2)', borderColor: s ? 'transparent' : 'var(--line)' }}>
        <div className="tiny muted upper" style={{ marginBottom: 6 }}>{title}</div>
        {s ? (
          <>
            <div className="row ac gap8"><Avatar name={s.name} size={26} /><div><div style={{ fontWeight: 700, fontSize: 12.5 }}>{s.name}</div><div className="tiny muted">{s.role}</div></div></div>
            <div className="row ac gap6 tiny" style={{ color: 'var(--green)', marginTop: 7, fontWeight: 600 }}><I.checkCircle size={13} /> Ditandatangani {s.at}</div>
          </>
        ) : (
          <div className="tiny muted" style={{ marginTop: 2 }}>Belum ditandatangani</div>
        )}
      </div>
    );
  };

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 330px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h">
          <h3>Memo Penetapan Materialitas</h3>
          <span className="sub">{activeEngagement?.id} · {activeClient?.name}</span>
          <div style={{ flex: 1 }} />
          <Btn sm onClick={onExportPdf} disabled={exporting}><I.download size={13} /> {exporting ? 'Menyiapkan…' : 'Unduh PDF'}</Btn>
        </div>
        <div style={{ padding: '16px 20px', maxWidth: 720 }}>
          <div className="tiny muted upper" style={{ letterSpacing: '.08em', marginBottom: 3 }}>KAP Wijaya Hartono & Rekan</div>
          <h2 style={{ margin: '0 0 4px', fontSize: 18, color: 'var(--navy)' }}>Penetapan Materialitas Audit</h2>
          <div className="tiny muted" style={{ marginBottom: 14 }}>FY2025 · Standar {activeEngagement?.standard} · SA 320 & SA 450</div>

          <SecTitle n="1" t="Pemilihan Benchmark & Persentase" />
          <p style={{ margin: '0 0 6px', fontSize: 12.5, lineHeight: 1.6 }}>
            Benchmark utama adalah <b>{bench.label}</b> sebesar {_RP(bench.value)} ({bench.note}). Persentase {pct}% diterapkan
            (kisaran lazim {bench.lo}–{bench.hi}%), menghasilkan Materialitas Keseluruhan {_RP(om)}.
          </p>
          <Row label="Materialitas Keseluruhan (OM)" value={_RP(om)} strong />
          <Row label={`Performance Materiality (${pmPct}% OM)`} value={_RP(pm)} />
          <Row label={`Ambang Jelas Remeh (${cttPct}% OM)`} value={_RP(ctt)} />

          <SecTitle n="2" t="Materialitas Spesifik & Komponen" mt />
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6 }}>{MAT_MEMO_SEC2}</p>

          <SecTitle n="3" t="Kesimpulan" mt />
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6 }}>{MAT_MEMO_SEC3}</p>
        </div>
      </Panel>

      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '14px 16px' }}>
            <div className="tiny" style={{ color: '#bcd6e4', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 3 }}>OM Diusulkan</div>
            <div className="mono" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{_RP(om)}</div>
            <div className="tiny" style={{ color: '#9fc0d2', marginTop: 5 }}>Terterapkan saat ini: {_RP(applied)}</div>
          </div>
          <div style={{ padding: '12px 14px' }}>
            {diff > 0.1
              ? <div className="row ac gap8" style={{ color: 'var(--amber)' }}><I.alert size={15} /><span className="tiny" style={{ fontWeight: 600 }}>Menyimpang {(diff * 100).toFixed(0)}% dari nilai terterapkan.</span></div>
              : <div className="row ac gap8" style={{ color: 'var(--green)' }}><I.checkCircle size={15} /><span className="tiny" style={{ fontWeight: 600 }}>Konsisten dengan nilai terterapkan.</span></div>}
            {!locked && <Btn variant="primary" sm style={{ width: '100%', marginTop: 10, justifyContent: 'center' }} onClick={onApply}><I.check size={14} /> Terapkan ke Engagement</Btn>}
          </div>
        </Panel>

        <Panel title="Jalur Persetujuan" sub="SA 230 — dokumentasi">
          <div className="grid" style={{ gap: 9 }}>
            <SignBox k="preparer" title="Disusun oleh" />
            <SignBox k="manager" title="Ditelaah oleh (Manager)" />
            <SignBox k="partner" title="Disetujui oleh (Partner)" />
          </div>
          {!locked && (
            <div className="row gap8" style={{ marginTop: 11 }}>
              <Btn sm style={{ flex: 1 }} onClick={() => doSign('manager', 'Anindya Pramesti', 'Audit Manager')}>{sign.manager ? 'Batalkan' : 'Telaah'}</Btn>
              <Btn sm variant={sign.partner ? '' : 'navy'} style={{ flex: 1 }} onClick={() => doSign('partner', 'Hartono Wijaya, CPA', 'Engagement Partner')}>{sign.partner ? 'Batalkan' : 'Setujui'}</Btn>
            </div>
          )}
          {fullySigned && <div className="row ac gap8" style={{ marginTop: 10, color: 'var(--green)', fontWeight: 700, fontSize: 12 }}><I.lock size={14} /> Memo lengkap & terkunci</div>}
        </Panel>
      </div>
    </div>
  );
}

function Line({ label, val, sub }) {
  return (
    <div className="row jb ac" style={{ padding: '6px 0', borderBottom: '1px solid var(--line-soft)' }}>
      <span><div style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>{sub && <div className="tiny muted">{sub}</div>}</span>
      <span className="mono" style={{ fontWeight: 700 }}>{val}</span>
    </div>
  );
}
function SecTitle({ n, t, mt }) {
  return (
    <div className="row ac gap8" style={{ marginTop: mt ? 16 : 0, marginBottom: 6 }}>
      <span style={{ width: 20, height: 20, borderRadius: 5, background: 'var(--navy)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, fontFamily: 'var(--mono)' }}>{n}</span>
      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy)' }}>{t}</span>
    </div>
  );
}

Object.assign(window, { MatSpecific, MatComponent, MatImpact, MatRevision, MatMemo, MoneyJuta });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { MatComponent, MatImpact, MatMemo, MatRevision, MatSpecific, MoneyJuta };
