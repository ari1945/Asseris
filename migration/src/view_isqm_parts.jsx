/* [codemod] ESM imports */
import React from 'react';
import { I } from './icons.jsx';
import { Badge } from './ui.jsx';

/* ============================================================
   NeoSuite AMS — SOQM Operasional (ISQM 1) · Komponen Pendalaman
   ------------------------------------------------------------
   Bagian-bagian berat dari modul SOQM dipisah ke sini:
   · SoqmFlow          — daur hidup ISQM 1 ¶25–34 sebagai pita alur
   · SoqmComponents    — peta 8 komponen SPM (ditarik QM_COMPONENTS)
   · SoqmLineage       — "Tarikan Data Lintas-Modul": rekonsiliasi
                         setiap masukan pemantauan ke SATU sumber
                         kebenaran (ENGAGEMENTS/CLIENTS/STAFF/…),
                         lengkap dengan cek konsistensi & tautan modul.
   · soqmPull()        — derivasi LIVE angka pemantauan dari window.AMS
   Semua angka di sini DITARIK, bukan di-hardcode.
   ============================================================ */
const { useState: useISQMP } = React;

/* —— Derivasi lintas-modul dari satu sumber (window.AMS) —— */
function soqmPull() {
  const A = window.AMS;
  const bare = (n) => (n || '').split(',')[0].trim();
  const engMeta = A.engMeta || (() => null);

  /* QR-02 Sumber Daya · utilisasi senior dari Capacity Planning */
  const seniors = (A.CAPACITY.staff || []).filter(s => s.grade === 'Senior');
  const peak = (s) => Math.max.apply(null, s.forecast);
  const overloaded = seniors.filter(s => peak(s) > 92);
  const peakUtil = seniors.length ? Math.max.apply(null, seniors.map(peak)) : 0;

  /* QR-04 Etika & Independensi · rotasi AP dari register Independensi */
  const rotationDue = (A.INDEPENDENCE || []).filter(i => i.tenure >= i.rotationLimit);
  const undeclared = (A.INDEPENDENCE || []).filter(i => !i.declared);

  /* Sumber Daya · realisasi PPL terstruktur dari PPPK */
  const pplShort = (A.PPPK_PPL || []).filter(p => p.structured < p.reqStr);

  /* Penyedia jasa eksternal & teknologi dari register penyedia */
  const providerWatch = (A.QM_PROVIDERS || []).filter(p => p.status !== 'Memadai');

  /* EQR · gerbang opini PIE & uji independensi reviewer ≠ partner */
  const eqr = (A.EQR_REVIEWS || []).map(r => {
    const m = engMeta(r.eng);
    return { ...r, _m: m, independent: m ? bare(r.reviewer) !== m.partner : true };
  });
  const eqrConflict = eqr.filter(r => !r.independent);
  const eqrPieOpen = eqr.filter(r => r.pie && !r.cleared);

  /* Inspeksi · seluruhnya tertaut ke engagement kanonik */
  const insp = (A.QM_INSPECTIONS || []).map(i => ({ ...i, _m: engMeta(i.eng) }));
  const inspOrphan = insp.filter(i => !i._m);

  /* Keluhan tertaut klien */
  const cmpLinked = (A.COMPLAINTS || []).filter(c => c.clientId);

  return {
    seniors, overloaded, peakUtil, rotationDue, undeclared, pplShort,
    providerWatch, eqr, eqrConflict, eqrPieOpen, insp, inspOrphan, cmpLinked,
  };
}

/* —— Pita daur hidup pendekatan berbasis risiko ISQM 1 —— */
function SoqmFlow({ active, onPick }) {
  const steps = [
    { id: 'register', ic: 'target', t: 'Tujuan Mutu', s: '¶25–28', d: 'Tetapkan tujuan mutu per komponen' },
    { id: 'register', ic: 'shield', t: 'Risiko Mutu', s: '¶25–27', d: 'Identifikasi & nilai (L×D)' },
    { id: 'register', ic: 'sliders', t: 'Respons', s: '¶32–34', d: 'Rancang & terapkan kontrol' },
    { id: 'monitoring', ic: 'search2', t: 'Pemantauan', s: '¶38–44', d: 'Inspeksi & aktivitas pemantauan' },
    { id: 'remediation', ic: 'alert', t: 'Defisiensi', s: '¶41', d: 'Evaluasi keparahan & akar masalah' },
    { id: 'remediation', ic: 'check', t: 'Remediasi', s: '¶42–44', d: 'Tindakan & evaluasi tahunan' },
  ];
  return (
    <div className="soqm-flow">
      {steps.map((st, i) => {
        const Ic = I && (I[st.ic] || I.doc);
        const on = st.id === active;
        return (
          <React.Fragment key={i}>
            <button type="button" className={'soqm-flow-step' + (on ? ' on' : '')} onClick={() => onPick && onPick(st.id)} title={st.d}>
              <span className="sfs-ic">{Ic ? <Ic size={15} /> : null}</span>
              <span className="sfs-txt"><span className="sfs-t">{st.t}</span><span className="sfs-s mono">{st.s}</span></span>
            </button>
            {i < steps.length - 1 && <span className="soqm-flow-arr">{I ? <I.arrowRight size={13} /> : '→'}</span>}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* —— Peta 8 komponen Sistem Pengelolaan Mutu (tarik QM_COMPONENTS) —— */
function SoqmComponents({ risks, nav }) {
  const comps = window.AMS.QM_COMPONENTS || [];
  const col = (s) => s >= 88 ? 'var(--green)' : s >= 80 ? 'var(--amber)' : 'var(--red)';
  /* hitung risiko mutu operasional yang terpetakan ke tiap komponen via nama */
  const mapName = (compName) => risks.filter(r => compName.includes(r.comp) || r.comp.includes(compName.split(' ')[0])).length;
  return (
    <div>
      <div className="row jb ac" style={{ marginBottom: 8 }}>
        <div className="tiny muted upper">8 Komponen SPM · ISQM 1 ¶25 (tarikan dari Governance)</div>
        <button type="button" className="lin-cta" onClick={() => nav && nav('governance', { from: 'soqm' })}>{I ? <I.building size={12} /> : null} Buka Governance (SOQM)</button>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
        {comps.map(c => (
          <div key={c.id} className="panel soqm-comp" style={{ padding: '9px 11px', boxShadow: 'none', borderLeft: '3px solid ' + col(c.score) }}>
            <div className="row jb ac"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--ink-3)' }}>{c.id}</span><span className="mono" style={{ fontSize: 13, fontWeight: 800, color: col(c.score) }}>{c.score}</span></div>
            <div className="tiny" style={{ fontWeight: 700, lineHeight: 1.3, margin: '3px 0' }}>{c.name}</div>
            <div className="row ac gap6 tiny muted">
              <span>{c.risks} risiko</span><span>·</span>
              <span style={{ color: c.defs ? 'var(--amber)' : 'var(--ink-4)', fontWeight: c.defs ? 700 : 400 }}>{c.defs} defisiensi</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* —— Kartu rekonsiliasi satu masukan pemantauan ke sumbernya —— */
function PullRow({ ok, input, ref_, source, sourceMod, value, nav, warn }) {
  const Ic = I && (I.arrowRight);
  return (
    <tr>
      <td><span className="row ac gap6"><span style={{ color: ok ? 'var(--green)' : 'var(--amber)', display: 'inline-flex' }}>{ok ? (I ? <I.checkCircle size={14} /> : '✓') : (I ? <I.alert size={14} /> : '!')}</span><span className="tiny" style={{ fontWeight: 600 }}>{input}</span></span><div className="tiny muted" style={{ marginLeft: 20 }}>{ref_}</div></td>
      <td>
        <button type="button" className="soqm-src" onClick={() => sourceMod && nav && nav(sourceMod, { from: 'soqm' })} disabled={!sourceMod}>
          <span className="tiny" style={{ fontWeight: 600, color: sourceMod ? 'var(--blue)' : 'var(--ink-2)' }}>{source}</span>
          {sourceMod && Ic ? <Ic size={11} /> : null}
        </button>
      </td>
      <td className="tiny" style={{ color: warn ? 'var(--amber)' : 'var(--ink-2)', fontWeight: warn ? 700 : 500 }}>{value}</td>
      <td><span className="badge tiny" style={{ background: ok ? 'var(--green-bg)' : 'var(--amber-bg)', color: ok ? 'var(--green)' : 'var(--amber)' }}>{ok ? 'Konsisten' : 'Perlu tindak lanjut'}</span></td>
    </tr>
  );
}

/* —— Tab "Tarikan Data Lintas-Modul" —— */
function SoqmLineage({ nav }) {
  const A = window.AMS;
  const P = soqmPull();
  const bare = (n) => (n || '').split(',')[0].trim();

  /* baris pemantauan → sumber kebenaran */
  const pulls = [
    {
      ok: P.inspOrphan.length === 0,
      input: 'Cakupan inspeksi perikatan', ref_: 'ISQM 1 ¶38 · ' + P.insp.length + ' perikatan terinspeksi',
      source: 'ENGAGEMENTS · CLIENTS', sourceMod: 'cockpit',
      value: P.insp.length + ' tertaut · ' + P.inspOrphan.length + ' yatim',
    },
    {
      ok: P.eqrConflict.length === 0,
      input: 'Independensi reviewer EQR (≠ partner)', ref_: 'ISQM 2 ¶18 · gerbang opini PIE',
      source: 'EQR_REVIEWS → STAFF', sourceMod: 'eqr',
      value: P.eqr.length + ' EQR · ' + P.eqrConflict.length + ' benturan',
    },
    {
      ok: P.eqrPieOpen.length <= 1,
      input: 'EQR PIE belum lolos gerbang', ref_: 'ISQM 2 · wajib sebelum tanda tangan',
      source: 'EQR Workflow', sourceMod: 'eqr',
      value: P.eqrPieOpen.length + ' EQR PIE terbuka', warn: P.eqrPieOpen.length > 1,
    },
    {
      ok: P.overloaded.length <= 2,
      input: 'Kapasitas & utilisasi senior', ref_: 'Komponen Sumber Daya · QR-02',
      source: 'CAPACITY · Capacity Planning', sourceMod: 'capacity',
      value: P.overloaded.length + ' senior > 92% · puncak ' + P.peakUtil + '%', warn: P.overloaded.length > 0,
    },
    {
      ok: P.rotationDue.length === 0,
      input: 'Rotasi AP emiten (batas 7 thn)', ref_: 'Komponen Etika · QR-04',
      source: 'INDEPENDENCE · Register Rotasi', sourceMod: 'independence',
      value: P.rotationDue.length ? P.rotationDue.map(r => bare(r.name)).join(', ') + ' wajib rotasi' : 'Seluruh AP dalam batas', warn: P.rotationDue.length > 0,
    },
    {
      ok: P.pplShort.length === 0,
      input: 'Realisasi PPL terstruktur AP', ref_: 'Komponen Sumber Daya · kompetensi',
      source: 'PPPK_PPL · Pelaporan PPPK', sourceMod: 'pppk',
      value: P.pplShort.length ? P.pplShort.length + ' AP < ' + (A.PPPK_PPL[0] || {}).reqStr + ' SKP terstruktur' : 'Seluruh AP memenuhi', warn: P.pplShort.length > 0,
    },
    {
      ok: P.providerWatch.length === 0,
      input: 'Penyedia jasa & teknologi', ref_: 'Komponen Sumber Daya · ¶32',
      source: 'QM_PROVIDERS · Governance', sourceMod: 'governance',
      value: P.providerWatch.length ? P.providerWatch.length + ' dalam pemantauan' : 'Seluruh penyedia memadai', warn: P.providerWatch.length > 0,
    },
    {
      ok: true,
      input: 'Keluhan & tuduhan tertaut klien', ref_: 'ISQM 1 ¶A99 · register keluhan',
      source: 'COMPLAINTS → CLIENTS', sourceMod: 'crm',
      value: P.cmpLinked.length + ' dari ' + (A.COMPLAINTS || []).length + ' tertaut entitas',
    },
  ];
  const okCount = pulls.filter(p => p.ok).length;

  return (
    <div style={{ padding: 14, display: 'grid', gap: 16 }}>
      <div className="panel" style={{ padding: '11px 14px', background: 'var(--blue-050)', borderColor: 'transparent' }}>
        <div className="row ac gap8">
          <span style={{ color: 'var(--blue)' }}>{I ? <I.link2 size={16} /> : null}</span>
          <div className="tiny" style={{ lineHeight: 1.5 }}>
            Seluruh angka pemantauan SOQM <b>ditarik langsung</b> dari satu sumber kebenaran — master <b>ENGAGEMENTS · CLIENTS · STAFF</b> dan register modul terkait — bukan disalin manual. Satu perubahan di sumber mengalir konsisten ke seluruh kartu, tabel & evaluasi tahunan di bawah ini.
          </div>
        </div>
      </div>

      {/* Entitas perikatan: inspeksi & EQR diturunkan dari master */}
      <div>
        <div className="tiny muted upper" style={{ marginBottom: 8 }}>Entitas Perikatan — diturunkan dari master (resolver <span className="mono">engMeta()</span>)</div>
        <table className="dtbl soqm-tie">
          <thead><tr><th>Objek Mutu</th><th>Engagement</th><th>Klien (turunan)</th><th>Partner (turunan)</th><th>PIE</th><th>Tarikan</th></tr></thead>
          <tbody>
            {P.insp.map(i => (
              <tr key={i.id}>
                <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{i.id}<div className="tiny muted" style={{ fontWeight: 400 }}>Inspeksi</div></td>
                <td className="mono tiny">{i.eng}</td>
                <td className="tiny" style={{ fontWeight: 600 }}>{i._m ? i._m.shortClient : '—'}</td>
                <td className="tiny">{i._m ? i._m.partner : '—'}</td>
                <td>{i._m && i._m.pie ? <Badge kind="red">PIE</Badge> : <Badge kind="gray">Non-PIE</Badge>}</td>
                <td><span style={{ color: i._m ? 'var(--green)' : 'var(--amber)' }}>{i._m ? (I ? <I.checkCircle size={14} /> : '✓') : (I ? <I.alert size={14} /> : '!')}</span></td>
              </tr>
            ))}
            {P.eqr.map(r => (
              <tr key={r.id}>
                <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--purple)' }}>{r.id}<div className="tiny muted" style={{ fontWeight: 400 }}>EQR · {bare(r.reviewer)}</div></td>
                <td className="mono tiny">{r.eng}</td>
                <td className="tiny" style={{ fontWeight: 600 }}>{r._m ? r._m.shortClient : '—'}</td>
                <td className="tiny">{r._m ? r._m.partner : '—'}</td>
                <td>{r._m && r._m.pie ? <Badge kind="red">PIE</Badge> : <Badge kind="gray">Non-PIE</Badge>}</td>
                <td><span className="row ac gap4" style={{ color: r.independent ? 'var(--green)' : 'var(--red)' }}>{r.independent ? (I ? <I.checkCircle size={14} /> : '✓') : (I ? <I.alert size={14} /> : '!')}<span className="tiny">{r.independent ? '' : 'benturan'}</span></span></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="tiny muted" style={{ marginTop: 6 }}>Klien, partner & status PIE tidak disimpan ulang di modul mutu — diturunkan dari <span className="mono">engMeta(eng)</span> sehingga selalu sinkron dengan master perikatan.</div>
      </div>

      {/* Tarikan pemantauan lintas-modul */}
      <div>
        <div className="row jb ac" style={{ marginBottom: 8 }}>
          <div className="tiny muted upper">Masukan Pemantauan → Sumber Kebenaran (live)</div>
          <span className="tiny" style={{ fontWeight: 700, color: okCount === pulls.length ? 'var(--green)' : 'var(--amber)' }}>{okCount}/{pulls.length} tarikan konsisten</span>
        </div>
        <table className="dtbl soqm-tie">
          <thead><tr><th>Masukan Pemantauan</th><th>Sumber Kebenaran (modul)</th><th>Nilai Live</th><th>Status</th></tr></thead>
          <tbody>
            {pulls.map((p, i) => <PullRow key={i} {...p} nav={nav} />)}
          </tbody>
        </table>
        <div className="tiny muted" style={{ marginTop: 6 }}>Klik nama sumber untuk membuka modul asal. Nilai dihitung ulang setiap render dari <span className="mono">window.AMS</span> — tidak ada angka yang dibekukan.</div>
      </div>
    </div>
  );
}

Object.assign(window, { soqmPull, SoqmFlow, SoqmComponents, SoqmLineage, PullRow });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { PullRow, SoqmComponents, SoqmFlow, SoqmLineage, soqmPull };
