/* [codemod] ESM imports */
import React from 'react';
import { useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel, Tabs } from './ui.jsx';
import { KvBox } from './view_analytical';
import { RowKv } from './view_calc';

/* ============================================================
   NeoSuite AMS — SA 810 · Perikatan Pelaporan atas Ringkasan LK
   Perikatan untuk melaporkan ringkasan laporan keuangan yang
   diturunkan dari LK auditan. Registri & kriteria yang
   diterapkan, prosedur (¶8), dampak opini atas LK auditan
   terhadap laporan ringkasan, serta dua bentuk opini.
   ============================================================ */
const { useState: useState810 } = React;

/* ---- Bentuk opini & kriteria (¶9, A?) ---- */
const RIN_FORMS = [
  { k: 'Konsisten', ic: 'columns', color: 'blue', desc: 'Ringkasan LK konsisten, dalam semua hal material, dengan LK auditan sesuai kriteria yang diterapkan.', ex: 'Bentuk opini (a)' },
  { k: 'Ringkasan Wajar', ic: 'report', color: 'teal', desc: 'Ringkasan LK merupakan ringkasan yang wajar atas LK auditan sesuai kriteria yang diterapkan.', ex: 'Bentuk opini (b)' },
  { k: 'Kriteria Diterapkan', ic: 'book', color: 'amber', desc: 'Kriteria penyusunan ringkasan (regulasi, atau dikembangkan manajemen & diungkap) dapat diterima.', ex: 'Regulasi / Manajemen' },
  { k: 'Tidak Wajar', ic: 'alert', color: 'red', desc: 'Ringkasan tidak konsisten atau menyesatkan — opini tidak wajar (adverse) atas ringkasan.', ex: 'Agregasi menyesatkan' },
];

/* ---- Registri perikatan SA 810 (Rp jt) ---- */
const RIN_ENG = [
  {
    id: 'RIN-01', client: 'PT Andalan Distribusi', subject: 'Ringkasan LK 2025 untuk Anggota', period: '31 Des 2025',
    criteria: 'Dikembangkan manajemen & diungkap dalam ringkasan', form: 'Ringkasan Wajar',
    auditOpinion: 'WTM (Tanpa Modifikasi)', auditEOM: false, summaryOpinion: 'Tanpa Modifikasi',
    auditDate: '14 Mar 2026', value: 24600, fee: 35,
    procedures: [
      ['Ringkasan mengungkapkan sifat ringkasannya & mengidentifikasi LK auditan', true],
      ['Bandingkan ringkasan dengan informasi terkait dalam LK auditan', true],
      ['Evaluasi penyusunan sesuai kriteria yang diterapkan', true],
      ['Evaluasi tingkat agregasi agar tidak menyesatkan', true],
      ['Evaluasi kecukupan pengungkapan akses ke LK auditan', true],
    ],
    notes: 'Ringkasan disusun konsisten & merupakan ringkasan yang wajar. Opini atas LK auditan WTM — laporan ringkasan tanpa modifikasi.',
  },
  {
    id: 'RIN-02', client: 'PT Sentosa Energi Tbk', subject: 'Ikhtisar Keuangan — Laporan Tahunan', period: '31 Des 2025',
    criteria: 'Format ikhtisar laporan tahunan emiten (regulatori)', form: 'Konsisten',
    auditOpinion: 'WDP (Dengan Pengecualian)', auditEOM: false, summaryOpinion: 'Tanpa Modifikasi*',
    auditDate: '20 Mar 2026', value: 312000, fee: 70,
    procedures: [
      ['Ringkasan mengungkapkan sifat ringkasannya & mengidentifikasi LK auditan', true],
      ['Bandingkan ringkasan dengan informasi terkait dalam LK auditan', true],
      ['Evaluasi penyusunan sesuai kriteria regulatori yang diterapkan', true],
      ['Evaluasi tingkat agregasi agar tidak menyesatkan', true],
      ['Cerminkan dampak opini WDP pada laporan ringkasan (¶17)', true],
    ],
    notes: 'Opini atas LK auditan adalah WDP. Laporan ringkasan tetap dapat menyatakan "konsisten", namun WAJIB memuat paragraf yang menjelaskan bahwa LK auditan beropini WDP & dasar pengecualiannya (¶17).',
  },
  {
    id: 'RIN-03', client: 'PT Mega Ritel Indonesia', subject: 'Ringkasan untuk Siaran Pers Investor', period: '31 Des 2025',
    criteria: 'Dikembangkan manajemen & diungkap dalam ringkasan', form: 'Konsisten',
    auditOpinion: 'WTM (Tanpa Modifikasi)', auditEOM: true, summaryOpinion: 'Tanpa Modifikasi*',
    auditDate: '18 Mar 2026', value: 88500, fee: 40,
    procedures: [
      ['Ringkasan mengungkapkan sifat ringkasannya & mengidentifikasi LK auditan', true],
      ['Bandingkan ringkasan dengan informasi terkait dalam LK auditan', true],
      ['Evaluasi penyusunan sesuai kriteria yang diterapkan', true],
      ['Evaluasi tingkat agregasi agar tidak menyesatkan', true],
      ['Cerminkan paragraf penekanan (kelangsungan usaha) pada ringkasan (¶17)', true],
    ],
    notes: 'Laporan atas LK auditan WTM namun memuat Penekanan Suatu Hal mengenai ketidakpastian material kelangsungan usaha. Laporan ringkasan harus memuat pernyataan bahwa terdapat hal tersebut dalam LK auditan.',
  },
  {
    id: 'RIN-04', client: 'PT Bahari Logistik Prima', subject: 'Ringkasan LK untuk Situs Web', period: '31 Des 2025',
    criteria: 'Dikembangkan manajemen — tidak seluruhnya diungkap', form: 'Tidak Wajar',
    auditOpinion: 'WTM (Tanpa Modifikasi)', auditEOM: false, summaryOpinion: 'Tidak Wajar (Adverse)',
    auditDate: '16 Mar 2026', value: 92500, fee: 38,
    procedures: [
      ['Ringkasan mengungkapkan sifat ringkasannya & mengidentifikasi LK auditan', false],
      ['Bandingkan ringkasan dengan informasi terkait dalam LK auditan', true],
      ['Evaluasi penyusunan sesuai kriteria yang diterapkan', false],
      ['Evaluasi tingkat agregasi agar tidak menyesatkan', false],
      ['Evaluasi kecukupan pengungkapan akses ke LK auditan', false],
    ],
    notes: 'Agregasi pos pendapatan & beban terlalu ringkas sehingga menyesatkan, dan kriteria tidak diungkap memadai. Ringkasan TIDAK merupakan ringkasan yang wajar — opini tidak wajar (adverse) atas ringkasan, meski LK auditan beropini WTM.',
  },
];

/* ============================================================ */
function SA810View() {
  const [selId, setSelId] = useState810('RIN-01');
  const [tab, setTab] = useState810('registri');
  const sel = RIN_ENG.find(e => e.id === selId);

  const tabs = [
    { id: 'registri', label: 'Registri & Kriteria' },
    { id: 'prosedur', label: 'Prosedur (¶8)' },
    { id: 'dampak', label: 'Dampak Opini LK Auditan' },
    { id: 'laporan', label: 'Pelaporan & Opini' },
  ];

  const adverse = RIN_ENG.filter(e => e.summaryOpinion.startsWith('Tidak Wajar')).length;
  const reflect = RIN_ENG.filter(e => e.auditOpinion.startsWith('WDP') || e.auditEOM).length;

  return (
    <>
      <SubBar moduleId="sa810" right={
        <div className="row gap8 ac">
          {adverse > 0 && <Badge kind="red" dot>{adverse} opini tidak wajar</Badge>}
          <Btn sm><I.download size={13} /> Memo SA 810</Btn>
          <Btn sm variant="primary"><I.sparkle size={14} /> AI Assist</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 240 }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Standar Audit 810</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Pelaporan atas Ringkasan LK</div>
              <div className="tiny muted">Ringkasan diturunkan dari LK auditan</div>
            </div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Perikatan</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{RIN_ENG.length} aktif</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Cermin Opini LK</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--amber)' }}>{reflect} perikatan</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Opini Tidak Wajar</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--red)' }}>{adverse} ringkasan</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Acuan</div>
              <Badge kind="blue">SA 810 · SA 700/705/706</Badge>
            </div>
          </div>
        </Panel>

        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

        {tab === 'registri' && <F810Registri selId={selId} setSelId={setSelId} sel={sel} />}
        {tab === 'prosedur' && <F810Proc sel={sel} />}
        {tab === 'dampak' && <F810Impact sel={sel} />}
        {tab === 'laporan' && <F810Report sel={sel} />}

      </div></div>
    </>
  );
}

/* ---- helper warna ---- */
function rinColor(t) { const m = RIN_FORMS.find(x => x.k === t); return m ? m.color : 'gray'; }
function sumKind(o) { return o.startsWith('Tidak Wajar') ? 'red' : o.includes('*') ? 'amber' : 'green'; }
function auditKind(o) { return o.startsWith('WTM') ? 'green' : o.startsWith('WDP') ? 'amber' : 'red'; }

/* ---------------- Tab: Registri & Kriteria ---------------- */
function F810Registri({ selId, setSelId, sel }) {
  return (
    <div className="grid" style={{ gap: 12 }}>
      <Panel noBody>
        <div className="panel-h"><h3>Bentuk Opini & Kriteria yang Diterapkan (¶9)</h3><div style={{ flex: 1 }} /><Badge kind="blue">2 bentuk + kriteria</Badge></div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 0 }}>
          {RIN_FORMS.map((d, i) => {
            const Ic = I[d.ic];
            return (
              <div key={i} style={{ padding: 15, borderRight: i < 3 ? '1px solid var(--line-soft)' : 0 }}>
                <span style={{ width: 36, height: 36, borderRadius: 9, display: 'grid', placeItems: 'center', background: `var(--${d.color}-bg)`, color: `var(--${d.color})`, marginBottom: 10 }}><Ic size={18} /></span>
                <div style={{ fontWeight: 700, fontSize: 12.5 }}>{d.k}</div>
                <p className="tiny muted" style={{ margin: '4px 0 8px', lineHeight: 1.45 }}>{d.desc}</p>
                <div className="chip tiny" style={{ background: 'var(--surface-2)' }}>{d.ex}</div>
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="grid" style={{ gridTemplateColumns: '1fr 384px', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Registri Perikatan Ringkasan LK</h3><div style={{ flex: 1 }} /><span className="tiny muted">{RIN_ENG.length} perikatan</span></div>
          <table className="dtbl">
            <thead><tr><th style={{ width: 62 }}>Ref</th><th>Klien & Ringkasan</th><th style={{ width: 96 }}>Opini LK</th><th style={{ width: 124 }}>Opini Ringkasan</th></tr></thead>
            <tbody>
              {RIN_ENG.map(e => (
                <tr key={e.id} className={e.id === selId ? 'sel' : ''} onClick={() => setSelId(e.id)} style={{ cursor: 'pointer' }}>
                  <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{e.id}</td>
                  <td style={{ whiteSpace: 'normal', lineHeight: 1.35 }}><div style={{ fontWeight: 600 }}>{e.client}</div><div className="tiny muted">{e.subject}</div></td>
                  <td><Badge kind={auditKind(e.auditOpinion)}>{e.auditOpinion.split(' ')[0]}{e.auditEOM ? ' ⚑' : ''}</Badge></td>
                  <td><Badge kind={sumKind(e.summaryOpinion)}>{e.summaryOpinion}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="tiny muted" style={{ padding: '8px 14px' }}>⚑ = laporan atas LK auditan memuat Penekanan Suatu Hal · * = opini tanpa modifikasi yang mencerminkan hal pada LK auditan</div>
        </Panel>

        {sel && (
          <Panel noBody>
            <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
              <div className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{sel.id}</span><Badge kind={rinColor(sel.form)}>{sel.form}</Badge></div>
              <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>{sel.client}</div>
              <div className="tiny muted">{sel.subject}</div>
            </div>
            <div style={{ padding: 14 }}>
              <div className="tiny muted upper" style={{ marginBottom: 4 }}>Kriteria yang Diterapkan</div>
              <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.5 }}>{sel.criteria}</p>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <KvBox label="Periode" v={sel.period} />
                <KvBox label="LK Auditan (Rp jt)" v={sel.value.toLocaleString('id-ID')} />
                <KvBox label="Opini LK Auditan" v={sel.auditOpinion.split(' ')[0]} accent={auditKind(sel.auditOpinion) === 'green' ? 'var(--green)' : auditKind(sel.auditOpinion) === 'amber' ? 'var(--amber)' : 'var(--red)'} />
                <KvBox label="Tgl Laporan LK" v={sel.auditDate} />
              </div>
              <div className="panel" style={{ padding: '9px 11px', background: 'var(--surface-2)', borderColor: 'transparent' }}>
                <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                  <span style={{ color: sumKind(sel.summaryOpinion) === 'red' ? 'var(--red)' : 'var(--blue)', flex: '0 0 auto' }}><I.flag size={14} /></span>
                  <span style={{ fontSize: 11.5, lineHeight: 1.4 }}>{sel.notes}</span>
                </div>
              </div>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

/* ---------------- Tab: Prosedur (¶8) ---------------- */
function F810Proc({ sel }) {
  if (!sel) return null;
  const done = sel.procedures.filter(p => p[1]).length;
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Prosedur Evaluasi Ringkasan LK (¶8)</h3><div style={{ flex: 1 }} /><Badge kind={done === sel.procedures.length ? 'green' : 'amber'}>{done}/{sel.procedures.length} selesai</Badge></div>
        <div style={{ padding: '6px 14px 14px' }}>
          {sel.procedures.map((a, i) => (
            <div key={i} className="row gap10" style={{ padding: '11px 0', alignItems: 'flex-start', borderBottom: i < sel.procedures.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
              <span style={{ flex: '0 0 auto', marginTop: 1, color: a[1] ? 'var(--green)' : 'var(--red)' }}>{a[1] ? <I.checkCircle size={16} /> : <I.alert size={16} />}</span>
              <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.45 }}>{a[0]}</div>
              <span className="mono tiny" style={{ flex: '0 0 auto', color: a[1] ? 'var(--green)' : 'var(--red)', fontWeight: 700, marginTop: 1 }}>{a[1] ? 'OK' : 'ISU'}</span>
            </div>
          ))}
        </div>
        <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.book size={15} /></span>
            <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Auditor mengevaluasi apakah ringkasan LK <b>konsisten</b> / merupakan <b>ringkasan yang wajar</b>, dengan membandingkan terhadap LK auditan & menilai tingkat agregasi agar tidak menyesatkan (¶8).</span>
          </div>
        </div>
      </Panel>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Prasyarat Perikatan (¶6)">
          <div style={{ display: 'grid', gap: 7 }}>
            {[
              ['Auditor LK auditan yang sama', 'green'],
              ['Kriteria penyusunan dapat diterima', 'green'],
              ['Akses penuh ke LK auditan tersedia', 'green'],
              ['Bentuk opini disepakati dengan manajemen', 'blue'],
            ].map((r, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 11.5, alignItems: 'flex-start' }}>
                <span style={{ color: `var(--${r[1]})`, flex: '0 0 auto', marginTop: 1 }}><I.check size={14} /></span>
                <span style={{ lineHeight: 1.4 }}>{r[0]}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Tautan Modul">
          <div style={{ display: 'grid', gap: 7 }}>
            {[['fsgen', 'Financial Statement Gen.', 'report'], ['opinion', 'Audit Opinion Generator', 'gavel'], ['sa705', 'SA 705/706 · Modifikasi', 'doc']].map((r, i) => {
              const Ic = I[r[2]];
              return <NavRow810 key={i} to={r[0]} label={r[1]} ic={Ic} />;
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function NavRow810({ to, label, ic: Ic }: any) {
  const nav = useNav();
  return (
    <div onClick={() => nav(to)} className="row jb ac" style={{ fontSize: 12, padding: '8px 10px', border: '1px solid var(--line-soft)', borderRadius: 7, cursor: 'pointer' }}>
      <span className="row ac gap8"><span style={{ color: 'var(--blue)' }}><Ic size={14} /></span>{label}</span>
      <I.arrowRight size={14} style={{ color: 'var(--ink-4)' }} />
    </div>
  );
}

/* ---------------- Tab: Dampak Opini LK Auditan ---------------- */
function F810Impact({ sel }) {
  if (!sel) return null;
  const modified = sel.auditOpinion.startsWith('WDP') || sel.auditOpinion.startsWith('TW') || sel.auditOpinion.startsWith('TMP');
  const rules = [
    { active: modified, t: '¶17 — Opini modifikasian atas LK auditan', d: 'Bila laporan atas LK auditan memuat opini modifikasian (WDP/TW/TMP), laporan ringkasan WAJIB menyatakan hal tersebut & menjelaskan dasarnya serta dampaknya terhadap ringkasan.' },
    { active: sel.auditEOM, t: '¶18 — Penekanan / Hal Lain pada LK auditan', d: 'Bila laporan atas LK auditan memuat paragraf Penekanan Suatu Hal atau Hal Lain, laporan ringkasan memuat pernyataan bahwa hal tersebut terdapat dalam laporan atas LK auditan.' },
    { active: sel.summaryOpinion.startsWith('Tidak Wajar'), t: '¶15 — Ringkasan menyesatkan / tidak konsisten', d: 'Bila ringkasan tidak konsisten atau bukan ringkasan yang wajar dan manajemen menolak memperbaikinya, auditor menyatakan opini tidak wajar (adverse) atas ringkasan.' },
  ];
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Penelusuran Opini LK Auditan → Ringkasan</h3></div>
          <div style={{ padding: 14 }}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 24px 1fr', gap: 0, alignItems: 'center' }}>
              <div className="panel" style={{ padding: '12px 14px', boxShadow: 'none', borderLeft: `3px solid var(--${auditKind(sel.auditOpinion)})` }}>
                <div className="tiny muted upper" style={{ marginBottom: 4 }}>Laporan atas LK Auditan</div>
                <div style={{ fontWeight: 700, fontSize: 13, color: `var(--${auditKind(sel.auditOpinion)})` }}>{sel.auditOpinion}</div>
                <div className="tiny muted" style={{ marginTop: 3, lineHeight: 1.4 }}>{sel.auditEOM ? 'Memuat Penekanan Suatu Hal' : 'Tanpa paragraf tambahan'} · {sel.auditDate}</div>
              </div>
              <div style={{ display: 'grid', placeItems: 'center', color: 'var(--ink-4)' }}><I.arrowRight size={18} /></div>
              <div className="panel" style={{ padding: '12px 14px', boxShadow: 'none', borderLeft: `3px solid var(--${sumKind(sel.summaryOpinion)})` }}>
                <div className="tiny muted upper" style={{ marginBottom: 4 }}>Laporan atas Ringkasan LK</div>
                <div style={{ fontWeight: 700, fontSize: 13, color: `var(--${sumKind(sel.summaryOpinion)})` }}>{sel.summaryOpinion}</div>
                <div className="tiny muted" style={{ marginTop: 3, lineHeight: 1.4 }}>Bentuk: {sel.form}</div>
              </div>
            </div>
          </div>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Aturan Dampak (¶15, 17–18)</h3></div>
          <div style={{ padding: '6px 14px 14px' }}>
            {rules.map((r, i) => (
              <div key={i} className="row gap10" style={{ padding: '11px 0', alignItems: 'flex-start', borderBottom: i < rules.length - 1 ? '1px solid var(--line-soft)' : 0, opacity: r.active ? 1 : 0.5 }}>
                <span style={{ flex: '0 0 auto', marginTop: 1, color: r.active ? 'var(--amber)' : 'var(--ink-4)' }}>{r.active ? <I.flag size={16} /> : <I.circle size={16} />}</span>
                <div style={{ flex: 1 }}>
                  <div className="row jb ac"><div style={{ fontSize: 12.5, fontWeight: 700 }}>{r.t}</div>{r.active && <Badge kind="amber">Berlaku</Badge>}</div>
                  <div className="tiny muted" style={{ lineHeight: 1.45, marginTop: 2 }}>{r.d}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Ringkasan Tindakan">
          <div className="panel" style={{ padding: '11px 12px', background: sel.summaryOpinion.startsWith('Tidak Wajar') ? 'var(--red-bg)' : (modified || sel.auditEOM) ? 'var(--amber-bg)' : 'var(--green-bg)', borderColor: 'transparent' }}>
            <div className="row gap8" style={{ alignItems: 'flex-start' }}>
              <span style={{ color: sel.summaryOpinion.startsWith('Tidak Wajar') ? 'var(--red)' : (modified || sel.auditEOM) ? 'var(--amber)' : 'var(--green)', flex: '0 0 auto' }}>{sel.summaryOpinion.startsWith('Tidak Wajar') ? <I.alert size={15} /> : (modified || sel.auditEOM) ? <I.flag size={15} /> : <I.checkCircle size={15} />}</span>
              <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>{sel.summaryOpinion.startsWith('Tidak Wajar')
                ? <>Nyatakan <b>opini tidak wajar</b> atas ringkasan & jelaskan alasannya.</>
                : modified
                  ? <>Laporan ringkasan memuat <b>paragraf yang mencerminkan opini {sel.auditOpinion.split(' ')[0]}</b> atas LK auditan (¶17).</>
                  : sel.auditEOM
                    ? <>Sertakan <b>pernyataan adanya Penekanan Suatu Hal</b> dalam laporan atas LK auditan (¶18).</>
                    : <>Laporan ringkasan dapat <b>tanpa modifikasi</b> — tidak ada hal yang perlu dicerminkan.</>}</span>
            </div>
          </div>
        </Panel>
        <Panel title="Kronologi Tanggal">
          <div style={{ display: 'grid', gap: 8 }}>
            <RowKv label="Tgl Laporan LK Auditan" v={sel.auditDate} />
            <RowKv label="Tgl Laporan Ringkasan" v={'≥ ' + sel.auditDate} />
          </div>
          <p className="tiny muted" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>Tanggal laporan atas ringkasan tidak boleh mendahului tanggal laporan atas LK auditan (¶19).</p>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Pelaporan & Opini ---------------- */
function F810Report({ sel }) {
  if (!sel) return null;
  const adverse = sel.summaryOpinion.startsWith('Tidak Wajar');
  const modified = sel.auditOpinion.startsWith('WDP') || sel.auditOpinion.startsWith('TW') || sel.auditOpinion.startsWith('TMP');
  return (
    <div className="grid" style={{ gridTemplateColumns: '320px 1fr', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Elemen Wajib Laporan SA 810">
          <div style={{ display: 'grid', gap: 7 }}>
            {[
              ['Judul & identifikasi ringkasan LK', '¶14'],
              ['Identifikasi LK auditan & tgl laporannya', '¶14'],
              ['Rujukan jenis opini atas LK auditan', '¶14'],
              ['Opini: konsisten / ringkasan yang wajar', '¶14'],
            ].map((r, i) => (
              <div key={i} className="row jb ac" style={{ fontSize: 11.5, padding: '7px 9px', borderRadius: 6, background: 'var(--surface-2)' }}>
                <span className="row ac gap8"><span style={{ color: 'var(--green)' }}><I.check size={13} /></span>{r[0]}</span>
                <span className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{r[1]}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Status Perikatan">
          <div style={{ display: 'grid', gap: 8 }}>
            <RowKv label="Bentuk Opini" v={sel.form} />
            <RowKv label="Opini Ringkasan" v={sel.summaryOpinion} />
            <RowKv label="Opini LK Auditan" v={sel.auditOpinion.split(' ')[0]} />
          </div>
          {(modified || sel.auditEOM || adverse) && (
            <div className="panel" style={{ marginTop: 10, padding: '9px 11px', background: adverse ? 'var(--red-bg)' : 'var(--amber-bg)', borderColor: 'transparent' }}>
              <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                <span style={{ color: adverse ? 'var(--red)' : 'var(--amber)', flex: '0 0 auto' }}><I.flag size={14} /></span>
                <span style={{ fontSize: 11, lineHeight: 1.4 }}>{adverse ? 'Opini tidak wajar atas ringkasan — ringkasan menyesatkan/tidak konsisten.' : 'Laporan ringkasan mencerminkan hal pada laporan atas LK auditan (¶17–18).'}</span>
              </div>
            </div>
          )}
        </Panel>
      </div>

      <Panel noBody>
        <div className="panel-h"><h3>Pratinjau Laporan atas Ringkasan LK</h3><div style={{ flex: 1 }} /><Btn sm><I.download size={13} /> Unduh</Btn></div>
        <div style={{ padding: 18 }}>
          <div className="doc-paper" style={{ background: '#fff', padding: '34px 40px', boxShadow: 'var(--shadow)', fontSize: 11.5, lineHeight: 1.7, color: '#283b46' }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#0c2430', textAlign: 'center', marginBottom: 4 }}>LAPORAN AUDITOR INDEPENDEN</div>
            <div className="tiny" style={{ textAlign: 'center', color: '#7a8893', marginBottom: 16 }}>atas Ringkasan Laporan Keuangan — SA 810</div>
            <p style={{ margin: '0 0 10px' }}>Kepada Pengguna {sel.subject} — {sel.client}</p>

            <p style={{ margin: '0 0 10px' }}>Ringkasan laporan keuangan terlampir, yang terdiri atas ringkasan posisi keuangan per {sel.period} serta ringkasan laba rugi untuk tahun yang berakhir pada tanggal tersebut, diturunkan dari laporan keuangan auditan {sel.client}.</p>

            <div style={{ fontWeight: 700, color: '#0c2430', margin: '12px 0 4px' }}>Opini {adverse ? '(Tidak Wajar)' : ''}</div>
            <p style={{ margin: '0 0 10px' }}>{adverse
              ? <>Menurut opini kami, karena signifikannya hal yang diuraikan di atas, ringkasan laporan keuangan terlampir <b>TIDAK</b> merupakan ringkasan yang wajar atas laporan keuangan auditan, sesuai dengan kriteria yang diterapkan.</>
              : sel.form === 'Konsisten'
                ? <>Menurut opini kami, ringkasan laporan keuangan terlampir <b>konsisten</b>, dalam semua hal yang material, dengan laporan keuangan auditan, sesuai dengan kriteria yang diterapkan.</>
                : <>Menurut opini kami, ringkasan laporan keuangan terlampir merupakan <b>ringkasan yang wajar</b> atas laporan keuangan auditan, sesuai dengan kriteria yang diterapkan.</>}</p>

            <div style={{ fontWeight: 700, color: '#0c2430', margin: '12px 0 4px' }}>Laporan atas Laporan Keuangan Auditan</div>
            <p style={{ margin: '0 0 10px' }}>Kami menyatakan opini <b>{sel.auditOpinion}</b> atas laporan keuangan auditan dalam laporan kami tertanggal {sel.auditDate}.
            {modified && ' Laporan tersebut memuat opini modifikasian; ringkasan ini perlu dibaca bersama dengan laporan atas laporan keuangan auditan beserta dasar modifikasinya.'}
            {sel.auditEOM && ' Laporan tersebut juga memuat paragraf Penekanan Suatu Hal mengenai ketidakpastian material atas kelangsungan usaha.'}</p>

            <div style={{ fontWeight: 700, color: '#0c2430', margin: '12px 0 4px' }}>Ringkasan & Kriteria</div>
            <p style={{ margin: 0 }}>Ringkasan ini tidak memuat seluruh pengungkapan yang disyaratkan kerangka pelaporan atas laporan keuangan auditan. Kriteria penyusunan: {sel.criteria.toLowerCase()}.</p>

            <div style={{ marginTop: 24, paddingTop: 10, borderTop: '1px solid #e0e5ea', fontSize: 11 }}><b>Hartono Wijaya, CPA</b> · Akuntan Publik<br /><span className="tiny" style={{ color: '#7a8893' }}>Jakarta, {sel.auditDate}</span></div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

Object.assign(window, { SA810View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SA810View };
