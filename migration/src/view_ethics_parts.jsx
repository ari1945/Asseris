/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data.js';
import { useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { Badge, Panel, Stat } from './ui.jsx';
import { KvBox } from './view_analytical.jsx';

/* ============================================================
   NeoSuite AMS — Etika: NOCLAR profesi · Etika Pajak & Teknologi ·
   Strip Kemutakhiran Versi Standar (G7 · G9 · G8)
   Dipakai oleh view_pc_conduct.jsx (ethics) & view_groupaudit.jsx.
   ============================================================ */
const { useState: useStateEP } = React;

/* ===========================================================
   G7 · ALUR NOCLAR PROFESI (Kode Etik §360) — terpisah SA 250
   =========================================================== */
function NoclarEthics() {
  const A = AMS, nav = useNav();
  const list = A.NOCLAR_ETHICS, STAGES = A.NOCLAR_STAGES;
  const [sel, setSel] = useStateEP(list[0].id);
  const cur = list.find(r => r.id === sel);
  const sevKind = (s) => s === 'Tinggi' ? 'red' : s === 'Sedang' ? 'amber' : 'gray';
  const inProgress = list.filter(r => r.stageIdx > 0 && r.stageIdx < STAGES.length - 1).length;
  const escalated = list.filter(r => r.stageIdx >= 3).length;
  const discl = list.filter(r => /Wajib|Dipertimbangkan/.test(r.disclosure)).length;

  return (
    <div style={{ padding: 14 }}>
      <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.55, color: 'var(--ink-2)', maxWidth: 790 }}>
        Kewajiban etika <b>NOCLAR</b> (Respons atas Ketidakpatuhan terhadap Hukum & Peraturan — Kode Etik IAPI <b>§360</b>) <b>melekat pada profesi</b>, berbeda dari respons audit per perikatan (SA 250). Alur ini mencakup evaluasi etika, eskalasi ke manajemen/TCWG, dan <b>keputusan pengungkapan ke otoritas</b> beserta jejak dokumentasinya.
      </p>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 12 }}>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={inProgress} label="Dalam Tindak Lanjut" accent={inProgress ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={escalated} label="Dieskalasi ke TCWG+" accent={escalated ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={discl} label="Pertimbangan Pengungkapan" accent={discl ? 'var(--red)' : 'var(--green)'} /></div></Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 380px', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Register NOCLAR Profesi</h3><div style={{ flex: 1 }} /><span className="tiny muted">Kode Etik §360</span></div>
          <table className="dtbl">
            <thead><tr><th style={{ width: 56 }}>Ref</th><th>Klien / Indikasi</th><th style={{ width: 78 }}>Severitas</th><th style={{ width: 120 }}>Tahap</th></tr></thead>
            <tbody>
              {list.map(r => (
                <tr key={r.id} className={r.id === sel ? 'sel' : ''} onClick={() => setSel(r.id)} style={{ cursor: 'pointer' }}>
                  <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.id}</td>
                  <td style={{ whiteSpace: 'normal', lineHeight: 1.35 }}><span style={{ fontWeight: 600, fontSize: 12 }}>{r.client.replace('PT ', '')}</span><div className="tiny muted">{r.issue}</div></td>
                  <td><Badge kind={sevKind(r.severity)}>{r.severity}</Badge></td>
                  <td><span className="tiny" style={{ fontWeight: 600, color: r.stageIdx >= STAGES.length - 1 ? 'var(--green)' : 'var(--amber)' }}>{STAGES[r.stageIdx]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        {cur && (
          <Panel noBody>
            <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
              <div className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{cur.id}</span><Badge kind={sevKind(cur.severity)}>{cur.severity}</Badge><span className="badge b-gray tiny mono">{cur.section}</span></div>
              <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>{cur.client.replace('PT ', '')}</div>
            </div>
            <div style={{ padding: 14 }}>
              <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.5 }}>{cur.issue}</p>
              <KvBox label="Dugaan Pelanggaran" v={cur.law} />
              <div style={{ height: 10 }} />
              <div className="tiny muted upper" style={{ marginBottom: 10 }}>Alur Penanganan (§360)</div>
              <div style={{ display: 'grid', gap: 0 }}>
                {STAGES.map((st, i) => {
                  const done = i < cur.stageIdx, active = i === cur.stageIdx;
                  return (
                    <div key={i} className="row gap10" style={{ paddingBottom: i < STAGES.length - 1 ? 12 : 0 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto' }}>
                        <span style={{ width: 20, height: 20, borderRadius: '50%', background: done ? 'var(--green)' : active ? 'var(--blue)' : 'var(--surface-3)', color: done || active ? '#fff' : 'var(--ink-3)', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700 }}>{done ? <I.check size={11} /> : i + 1}</span>
                        {i < STAGES.length - 1 && <span style={{ width: 1.5, flex: 1, minHeight: 16, background: done ? 'var(--green)' : 'var(--line)' }} />}
                      </div>
                      <div style={{ minWidth: 0, paddingBottom: 4 }}>
                        <div style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? 'var(--blue)' : 'var(--ink)' }}>{st}</div>
                        {active && <div className="tiny muted" style={{ marginTop: 1, lineHeight: 1.4 }}>{cur.note}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="panel" style={{ marginTop: 12, padding: '10px 12px', boxShadow: 'none', background: /Wajib/.test(cur.disclosure) ? 'var(--red-bg)' : /Dipertimbangkan/.test(cur.disclosure) ? 'var(--amber-bg)' : 'var(--surface-2)', borderColor: 'transparent' }}>
                <div className="tiny muted upper" style={{ marginBottom: 3 }}>Keputusan Pengungkapan ke Otoritas</div>
                <div className="tiny" style={{ fontWeight: 700, marginBottom: 2 }}>{cur.disclosure}</div>
                <div className="tiny muted" style={{ lineHeight: 1.45 }}>{cur.determinant}</div>
              </div>
            </div>
          </Panel>
        )}
      </div>
      <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>Terkait — respons audit per perikatan ada pada <span onClick={() => nav('sa250')} style={{ color: 'var(--blue)', cursor: 'pointer', textDecoration: 'underline' }}>SA 250 (Hukum & Regulasi)</span>; modul ini menambah dimensi etika profesi: dokumentasi, eskalasi, & keputusan pengungkapan yang dapat mengalahkan kerahasiaan bila diwajibkan hukum/kepentingan publik.</div>
    </div>
  );
}

/* ===========================================================
   G9 · ETIKA JASA PAJAK & TEKNOLOGI (IESBA terbaru)
   =========================================================== */
function TaxTechEthics() {
  const A = AMS, T = A.TAX_TECH_ETHICS;
  const stKind = (s) => s === 'Patuh' ? 'green' : s === 'Perlu Tinjau' ? 'amber' : 'gray';
  const Block = ({ title, icon, items, sub }) => (
    <Panel noBody>
      <div className="panel-h"><span className="row ac gap8"><span style={{ color: 'var(--blue)' }}>{icon}</span><h3 style={{ margin: 0 }}>{title}</h3></span><div style={{ flex: 1 }} /><Badge kind="amber">{items.filter(i => i.status === 'Perlu Tinjau').length} perlu tinjau</Badge></div>
      <div style={{ padding: 4 }}>
        {items.map((it, i) => (
          <div key={i} className="row gap10" style={{ padding: '10px 12px', borderBottom: i < items.length - 1 ? '1px solid var(--line-soft)' : 0, alignItems: 'flex-start' }}>
            <span style={{ flex: '0 0 auto', marginTop: 1, color: it.status === 'Patuh' ? 'var(--green)' : 'var(--amber)' }}>{it.status === 'Patuh' ? <I.checkCircle size={15} /> : <I.clock size={15} />}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, lineHeight: 1.4 }}>{it.t}</div>
              <span className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{it.ref}</span>
            </div>
            <Badge kind={stKind(it.status)}>{it.status}</Badge>
          </div>
        ))}
      </div>
      <div className="tiny muted" style={{ padding: '0 12px 11px', lineHeight: 1.5 }}>{sub}</div>
    </Panel>
  );
  return (
    <div style={{ padding: 14 }}>
      <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.55, color: 'var(--ink-2)', maxWidth: 790 }}>
        Provisi etika atas <b>jasa perencanaan pajak</b> dan <b>etika terkait teknologi</b> (termasuk AI) mengikuti amandemen IESBA terbaru — perencanaan pajak (berlaku efektif), serta kompetensi & kerahasiaan terkait teknologi. Daftar-uji berikut ditinjau berkala pada perikatan pajak & non-asurans.
      </p>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
        <Block title="Etika Jasa Pajak" icon={<I.receipt size={15} />} items={T.tax} sub="IESBA Tax Planning & Related Services (efektif) — menghindari posisi tanpa dasar memadai & perencanaan agresif." />
        <Block title="Etika Teknologi (incl. AI)" icon={<I.lock size={15} />} items={T.tech} sub="IESBA Technology-related provisions — kompetensi, keandalan output AI, kerahasiaan data & jejak audit." />
      </div>
    </div>
  );
}

/* ===========================================================
   G8 · STRIP KEMUTAKHIRAN VERSI STANDAR (SA 315/540/600/220)
   =========================================================== */
function StdVersionStrip({ highlight }) {
  const A = AMS, list = A.STD_VERSIONS || [];
  const nav = useNav();
  return (
    <div className="panel" style={{ padding: '11px 13px', marginBottom: 12, boxShadow: 'none', background: 'var(--surface-2)', borderColor: 'var(--line)' }}>
      <div className="row ac jb" style={{ marginBottom: 9 }}>
        <span className="tiny" style={{ fontWeight: 700, letterSpacing: '.02em' }}><I.shield size={12} style={{ verticalAlign: -2, color: 'var(--blue)' }} /> Kemutakhiran Versi Standar Audit (Revisi)</span>
        <span className="tiny muted">stempel versi & tanggal efektif</span>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
        {list.map(s => {
          const hl = highlight && s.code === highlight;
          return (
            <div key={s.code} onClick={() => s.module && nav(s.module, { from: 'stdversion' })} title={s.key}
              className="panel" style={{ padding: '9px 11px', boxShadow: 'none', cursor: s.module ? 'pointer' : 'default', outline: hl ? '2px solid var(--blue)' : 'none', outlineOffset: -1 }}>
              <div className="row ac jb" style={{ marginBottom: 4 }}>
                <span className="mono" style={{ fontWeight: 700, fontSize: 12, color: 'var(--navy)' }}>{s.code}</span>
                <Badge kind="green">{s.ver}</Badge>
              </div>
              <div className="tiny" style={{ fontWeight: 600, lineHeight: 1.3, marginBottom: 4 }}>{s.title}</div>
              <div className="tiny muted mono" style={{ marginBottom: 4 }}>{s.eff}</div>
              <div className="tiny muted" style={{ lineHeight: 1.4 }}>{s.key}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { NoclarEthics, TaxTechEthics, StdVersionStrip });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { NoclarEthics, StdVersionStrip, TaxTechEthics };
