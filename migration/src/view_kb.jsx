/* [codemod] ESM imports */
import React from 'react';
import { useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel, Progress } from './ui.jsx';

/* ============================================================
   NeoSuite AMS — Knowledge Base (modul mendalam)
   ------------------------------------------------------------
   Katalog DIBANGKITKAN dari registri standar kanonik
   (window.STANDARDS_REGISTRY) — sumber yang SAMA dengan Matriks
   Kepatuhan. Konten editorial ditarik dari window.AMS.kbResolve,
   template terkait dari window.AMS.kbTemplatesForStandard (live atas
   window.AMS.TEMPLATES), progres kepatuhan dari window.compliancePct,
   rujukan-silang standar dari window.RELATED_SA, dan setiap kartu
   menaut ke modul fungsional kanonik via nav(). Tidak ada data
   artikel yang diduplikasi di sini.
   ============================================================ */
const { useState: useStateKB, useMemo: useMemoKB } = React;

const KB_PHASES = ['Perencanaan', 'Pelaksanaan', 'Pelaporan', 'Perikatan Lain', 'Mutu', 'Akuntansi'];
const KB_COV = {
  checklist: { label: 'Checklist kepatuhan', kind: 'green', note: 'diuji per-engagement' },
  module: { label: 'Modul fungsional', kind: 'blue', note: 'alur kerja khusus' },
  gap: { label: 'Belum tercakup', kind: 'gray', note: 'kandidat backlog' },
};
const KB_LEVEL = { Pengantar: 'green', Inti: 'blue', Lanjutan: 'amber' };

/* keluarga kerangka untuk filter */
function kbFamily(type) {
  if (type === 'SA') return 'SA';
  if (type === 'PSAK' || type === 'SAK') return 'PSAK';
  if (type === 'SPM' || type === 'KEPAP') return 'Mutu';
  return 'Lain'; // SPR / SPA / SJAH
}
const KB_FAMILIES = [
  ['Semua', 'Semua standar'], ['SA', 'Standar Audit'], ['PSAK', 'Akuntansi'],
  ['Lain', 'Perikatan Lain'], ['Mutu', 'Mutu & Etika'],
];

function kbTypeKind(type) {
  const fw = (window.AMS && window.AMS.KB_FRAMEWORK) || {};
  return (fw[type] && fw[type].kind) || 'gray';
}
function kbIsStdPage(module) { return module && /^(sa|psak|spr|sjah|sakep|psak)\d|^(sa|psak|spr|sjah|sakep)/.test(module); }

function KnowledgeBase() {
  const nav = useNav();
  const [q, setQ] = useStateKB('');
  const [fam, setFam] = useStateKB('Semua');
  const [reading, setReading] = useStateKB(null);

  const all = useMemoKB(() => (window.AMS && window.AMS.kbArticles ? window.AMS.kbArticles() : []), []);
  const qn = q.trim().toLowerCase();

  const filtered = all.filter(a => {
    if (fam !== 'Semua' && kbFamily(a.type) !== fam) return false;
    if (qn) {
      const hay = (a.code + ' ' + a.title + ' ' + a.type + ' ' + (a.tags || []).join(' ')).toLowerCase();
      if (!hay.includes(qn)) return false;
    }
    return true;
  });

  const byPhase = KB_PHASES.map(ph => ({ phase: ph, items: filtered.filter(a => a.phase === ph) })).filter(g => g.items.length);
  const popular = all.filter(a => a.hot);
  const authored = all.filter(a => !a.fallback).length;
  const checklistN = all.filter(a => a.coverage === 'checklist').length;

  return (
    <>
      <SubBar moduleId="kb" right={<div className="row gap8 ac">
        <Badge kind="blue">{all.length} standar terindeks</Badge>
        <Btn sm><I.download size={13} /> Ekspor Indeks</Btn>
      </div>} />
      <div className="view-scroll"><div className="view-pad" style={{ display: 'grid', gap: 12 }}>

        {/* HERO + pencarian */}
        <Panel noBody style={{ overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(120deg,#013a52,#005085)', color: '#fff', padding: '20px 22px' }}>
            <div className="row jb ac wrap" style={{ gap: 12 }}>
              <div style={{ minWidth: 280, flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 3 }}>Basis Pengetahuan NeoSuite</div>
                <div style={{ fontSize: 12.5, color: '#bcd6e4', maxWidth: 560, lineHeight: 1.5 }}>Panduan standar audit (SA), akuntansi (PSAK), mutu & etika — diindeks langsung dari Registri Standar yang sama dengan Matriks Kepatuhan.</div>
              </div>
              <div className="row gap14" style={{ flexShrink: 0 }}>
                {[['SA', all.filter(a => a.type === 'SA').length], ['PSAK', all.filter(a => kbFamily(a.type) === 'PSAK').length], ['Editorial', authored]].map(([l, n]) => (
                  <div key={l} style={{ textAlign: 'right' }}>
                    <div className="mono" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{n}</div>
                    <div className="tiny" style={{ color: '#9fc2d4' }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="global-search" style={{ background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.2)', maxWidth: 520, height: 36, marginTop: 14 }}>
              <I.search2 size={15} /><input placeholder="Cari nomor standar, judul, atau topik (mis. ECL, materialitas, KAM)…" value={q} onChange={e => setQ(e.target.value)} />
              {q && <button className="p-act" onClick={() => setQ('')} style={{ color: '#fff' }}><I.x size={14} /></button>}
            </div>
          </div>
        </Panel>

        <div className="grid" style={{ gridTemplateColumns: '1fr 300px', gap: 12, alignItems: 'start' }}>
          {/* KOLOM UTAMA */}
          <div style={{ display: 'grid', gap: 12 }}>
            <div className="row gap6 wrap">
              {KB_FAMILIES.map(([id, lbl]) => (
                <button key={id} className="chip" onClick={() => setFam(id)} title={lbl}
                  style={{ cursor: 'pointer', height: 28, fontWeight: fam === id ? 700 : 600, border: '1px solid ' + (fam === id ? 'var(--blue)' : 'var(--line-strong)'), background: fam === id ? 'var(--blue)' : '#fff', color: fam === id ? '#fff' : 'var(--ink-2)' }}>
                  {lbl}
                </button>
              ))}
              <span className="tiny muted" style={{ marginLeft: 'auto', alignSelf: 'center' }}>{filtered.length} hasil</span>
            </div>

            {byPhase.length === 0 && <Panel><div className="muted" style={{ padding: 22, textAlign: 'center', fontSize: 13 }}>Tidak ada standar yang cocok dengan pencarian.</div></Panel>}

            {byPhase.map(g => (
              <div key={g.phase} style={{ display: 'grid', gap: 8 }}>
                <div className="row ac gap8" style={{ padding: '0 2px' }}>
                  <span className="tiny" style={{ fontWeight: 700, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{g.phase}</span>
                  <span className="tiny muted">{g.items.length}</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--line-soft)' }} />
                </div>
                <div className="grid" style={{ gap: 8 }}>
                  {g.items.map(a => <KBCard key={a.code} a={a} onOpen={() => setReading(a.code)} />)}
                </div>
              </div>
            ))}
          </div>

          {/* SIDEBAR */}
          <div style={{ display: 'grid', gap: 12, position: 'sticky', top: 8 }}>
            <Panel title="Paling dirujuk">
              <div style={{ display: 'grid', gap: 0 }}>
                {popular.map((a, i) => (
                  <div key={a.code} className="row gap8 ac" style={{ padding: '8px 0', borderBottom: i < popular.length - 1 ? '1px solid var(--line-soft)' : 0, cursor: 'pointer' }} onClick={() => setReading(a.code)}>
                    <span className="mono" style={{ fontWeight: 700, color: 'var(--blue)', flex: '0 0 20px', fontSize: 12 }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{a.title}</div>
                      <div className="tiny muted">{a.code} · {a.read} mnt</div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Cakupan standar">
              <div style={{ display: 'grid', gap: 8 }}>
                {Object.keys(KB_COV).map(k => {
                  const m = KB_COV[k]; const n = all.filter(a => a.coverage === k).length;
                  return (
                    <div key={k} className="row ac jb" style={{ fontSize: 12 }}>
                      <span className="row ac gap6"><Badge kind={m.kind}>{m.label}</Badge></span>
                      <span className="mono" style={{ fontWeight: 700 }}>{n}</span>
                    </div>
                  );
                })}
              </div>
            </Panel>

            <Panel title="Sumber data" sub="satu sumber kebenaran">
              <div className="tiny muted" style={{ lineHeight: 1.55, marginBottom: 10 }}>Indeks ini dibangkitkan dari Registri Standar kanonik; template & progres kepatuhan ditarik live dari modulnya.</div>
              <div style={{ display: 'grid', gap: 6 }}>
                <button className="kb-srcbtn" onClick={() => nav('compmatrix', { from: 'kb' })}><I.table size={14} /> Matriks Kepatuhan <I.arrowRight size={13} style={{ marginLeft: 'auto' }} /></button>
                <button className="kb-srcbtn" onClick={() => nav('templates', { from: 'kb' })}><I.template size={14} /> Template Library <I.arrowRight size={13} style={{ marginLeft: 'auto' }} /></button>
                <button className="kb-srcbtn" onClick={() => nav('governance', { from: 'kb' })}><I.building size={14} /> Governance (SOQM) <I.arrowRight size={13} style={{ marginLeft: 'auto' }} /></button>
              </div>
            </Panel>
          </div>
        </div>
      </div></div>

      {reading && <ArticleReader code={reading} onClose={() => setReading(null)} onOpenCode={setReading} />}

      <style>{`
        .kb-srcbtn{display:flex;align-items:center;gap:8px;width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2);color:var(--ink-2);font-size:12px;font-weight:600;cursor:pointer;transition:.12s}
        .kb-srcbtn:hover{background:var(--blue-050);border-color:var(--blue-100);color:var(--blue)}
        .kb-card{padding:12px 14px;cursor:pointer;display:flex;gap:12px;align-items:flex-start;transition:.12s;border:1px solid var(--line)}
        .kb-card:hover{border-color:var(--blue-100);background:var(--blue-050)}
        .kb-readlink{display:flex;align-items:center;gap:8px;width:100%;padding:9px 11px;border:1px solid var(--line);border-radius:9px;background:#fff;cursor:pointer;text-align:left;transition:.12s}
        .kb-readlink:hover{border-color:var(--blue-100);background:var(--blue-050)}
      `}</style>
    </>
  );
}

/* ---------- kartu artikel ---------- */
function KBCard({ a, onOpen }) {
  const mi = (window.MODULE_INDEX || {})[a.module] || null;
  const cov = KB_COV[a.coverage] || KB_COV.module;
  const prog = (a.coverage === 'checklist' && window.compliancePct) ? window.compliancePct(a.module) : null;
  return (
    <div className="panel kb-card" onClick={onOpen}>
      <div style={{ width: 40, height: 40, borderRadius: 9, background: 'var(--blue-100)', color: 'var(--blue)', display: 'grid', placeItems: 'center', flex: '0 0 40px' }}><I.book size={19} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row ac gap8 wrap" style={{ marginBottom: 3 }}>
          <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>{a.code}</span>
          <Badge kind={kbTypeKind(a.type)}>{a.type}</Badge>
          {a.hot && <span className="badge b-red" style={{ fontSize: 8.5, padding: '0 5px' }}>SERING DIRUJUK</span>}
          {a.fallback && <span className="tiny muted" title="Ringkasan otomatis dari registri">· ringkas</span>}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35 }}>{a.title}</div>
        <div className="tiny muted row ac gap8 wrap" style={{ marginTop: 4 }}>
          <Badge kind={cov.kind}>{cov.label}</Badge>
          {mi && a.coverage !== 'gap' && <span>→ {mi.label}</span>}
          <span>· {a.read} mnt</span>
          <span className="row ac gap4">· <span style={{ width: 6, height: 6, borderRadius: 6, background: 'var(--' + (KB_LEVEL[a.level] || 'gray') + ')' }} /> {a.level}</span>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 6, justifyItems: 'end', flex: '0 0 auto' }}>
        {prog && <div className="row ac gap6" style={{ width: 92 }}>
          <div style={{ flex: 1 }}><Progress value={prog.pct} color={prog.pct === 100 ? 'var(--green)' : undefined} /></div>
          <span className="mono tiny" style={{ fontWeight: 700, color: prog.pct === 100 ? 'var(--green)' : 'var(--ink-2)' }}>{prog.pct}%</span>
        </div>}
        <span style={{ color: 'var(--ink-4)' }}><I.arrowRight size={16} /></span>
      </div>
    </div>
  );
}

/* ---------- pembaca artikel (mendalam, tarikan lintas-modul) ---------- */
function ArticleReader({ code, onClose, onOpenCode }) {
  const nav = useNav();
  const reg = (window.STANDARDS_REGISTRY || []).find(r => r.code === code);
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  if (!reg) return null;

  const c = window.AMS.kbResolve(reg);
  const mi = (window.MODULE_INDEX || {})[reg.module] || null;
  const cov = KB_COV[reg.coverage] || KB_COV.module;
  const fw = (window.AMS.KB_FRAMEWORK || {})[reg.type] || { label: reg.type, blurb: '' };
  const prog = (reg.coverage === 'checklist' && window.compliancePct) ? window.compliancePct(reg.module) : null;
  const tpls = window.AMS.kbTemplatesForStandard(reg.code, reg.module) || [];

  /* rujukan-silang standar: dari RELATED_SA[module] → cocokkan ke registri; fallback serumpun */
  const relatedRaw = (window.RELATED_SA || {})[reg.module] || [];
  const REG = window.STANDARDS_REGISTRY || [];
  const seen = { [reg.code]: 1 };
  let related = [];
  relatedRaw.forEach(r => {
    if (seen[r.code]) return; seen[r.code] = 1;
    const row = REG.find(x => x.code === r.code);
    related.push({ code: r.code, title: r.title || (row && row.title) || r.code, view: r.view, inReg: !!row });
  });
  if (related.length < 3) {
    REG.filter(x => x.phase === reg.phase && x.type === reg.type && !seen[x.code]).slice(0, 4 - related.length).forEach(x => {
      seen[x.code] = 1; related.push({ code: x.code, title: x.title, inReg: true });
    });
  }

  const openModule = () => { if (reg.coverage !== 'gap' && reg.module) { onClose(); nav(reg.module, { from: 'kb' }); } };
  const previewStd = () => {
    if (window.__amsOpenSA) window.__amsOpenSA({ code: reg.code, title: reg.title, view: kbIsStdPage(reg.module) ? reg.module : undefined, phase: reg.phase, fromModule: 'kb' });
  };
  const openRelated = (r) => {
    if (r.inReg) { onOpenCode(r.code); }
    else if (window.__amsOpenSA) { onClose(); window.__amsOpenSA({ code: r.code, title: r.title, view: r.view, phase: reg.phase, fromModule: 'kb' }); }
  };

  const Src = ({ ic, lbl, val, onClick, accent }) => (
    <button onClick={onClick} disabled={!onClick} style={{ display: 'grid', gap: 3, textAlign: 'left', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: 9, background: 'var(--surface-2)', cursor: onClick ? 'pointer' : 'default', opacity: onClick ? 1 : .85, flex: 1, minWidth: 130 }}>
      <span className="muted row ac gap5" style={{ fontWeight: 600, fontSize: 11.5 }}>{ic}{lbl}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: accent || 'var(--ink)' }}>{val}</span>
    </button>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.42)', zIndex: 90, display: 'grid', placeItems: 'center', padding: 24 }} onClick={onClose}>
      <div className="panel" style={{ width: 940, maxWidth: '96vw', maxHeight: '94vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
        {/* header */}
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '20px 28px', display: 'flex', alignItems: 'flex-start', gap: 15, borderRadius: '4px 4px 0 0' }}>
          <span style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,.16)', display: 'grid', placeItems: 'center', flex: '0 0 48px' }}><I.book size={24} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row ac gap8" style={{ marginBottom: 4 }}>
              <span className="mono" style={{ fontWeight: 700, fontSize: 14 }}>{reg.code}</span>
              <span className="badge" style={{ background: 'rgba(255,255,255,.16)', color: '#fff', fontSize: 10 }}>{fw.label}</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 22, lineHeight: 1.25 }}>{reg.title}</div>
            <div style={{ color: '#bcd6e4', marginTop: 6, fontSize: 13 }}>{reg.phase} · {c.read || 5} mnt baca · {c.level || 'Inti'}</div>
          </div>
          <button className="top-btn" onClick={onClose} style={{ color: '#fff' }}><I.x size={20} /></button>
        </div>

        <div style={{ padding: '24px 32px', overflowY: 'auto', overflowX: 'hidden', fontSize: 15.5, lineHeight: 1.78, color: 'var(--ink)' }}>
          {/* SUMBER KEBENARAN — provenance strip */}
          <div className="row gap8 wrap" style={{ marginBottom: 16 }}>
            <Src ic={<I.shield size={12} />} lbl="Registri Standar" val={reg.code} onClick={() => { onClose(); nav('compmatrix', { from: 'kb' }); }} />
            <Src ic={<I.table size={12} />} lbl="Cakupan" val={cov.label} accent={'var(--' + cov.kind + ')'} onClick={reg.coverage !== 'gap' && reg.module ? openModule : null} />
            <Src ic={<I.template size={12} />} lbl="Template terkait" val={tpls.length + ' berkas'} onClick={tpls.length ? () => { onClose(); nav('templates', { from: 'kb' }); } : null} />
            {prog
              ? <Src ic={<I.check size={12} />} lbl="Kepatuhan" val={prog.pct + '%'} accent={prog.pct === 100 ? 'var(--green)' : 'var(--navy)'} onClick={openModule} />
              : <Src ic={mi ? <I.arrowRight size={12} /> : <I.alert size={12} />} lbl="Modul" val={mi ? mi.label : 'Belum tercakup'} onClick={mi && reg.coverage !== 'gap' ? openModule : null} />}
          </div>

          {/* ringkasan */}
          <div className="panel" style={{ padding: '15px 18px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)', marginBottom: 20 }}>
            <div className="tiny muted upper" style={{ marginBottom: 6, fontWeight: 700, fontSize: 11 }}>Ringkasan</div>
            <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.65 }}>{c.summary}</div>
          </div>

          {/* isi */}
          {(c.sections || []).map((s, i) => (
            <div key={i} style={{ marginBottom: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 7 }}>{s.h}</div>
              <p style={{ margin: 0, textAlign: 'left', textWrap: 'pretty', color: 'var(--ink-2)' }}>{s.p}</p>
            </div>
          ))}

          {/* poin utama */}
          {c.points && c.points.length > 0 && (
            <div className="panel" style={{ padding: '12px 15px', marginBottom: 16 }}>
              <div className="tiny muted upper" style={{ marginBottom: 9, fontWeight: 700, fontSize: 11 }}>Poin penerapan utama</div>
              <div style={{ display: 'grid', gap: 9 }}>
                {c.points.map((t, i) => (
                  <div key={i} className="row gap8" style={{ alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--green)', flex: '0 0 auto', marginTop: 2 }}><I.checkCircle size={17} /></span>
                    <span style={{ fontSize: 14.5, lineHeight: 1.55 }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* tertaut ke modul (CTA kanonik) */}
          {reg.coverage !== 'gap' && mi && (
            <div className="panel" style={{ padding: '13px 15px', marginBottom: 14, borderColor: 'var(--blue-100)', background: 'var(--surface-2)' }}>
              <div className="tiny muted upper" style={{ marginBottom: 8, fontWeight: 700 }}>Jalankan standar ini</div>
              <div className="row jb ac gap10 wrap">
                <div className="row ac gap10" style={{ minWidth: 0 }}>
                  <span style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--navy)', color: '#fff', display: 'grid', placeItems: 'center', flex: '0 0 34px' }}>{window.I[mi.icon] ? React.createElement(window.I[mi.icon], { size: 17 }) : <I.panel size={17} />}</span>
                  <div style={{ minWidth: 0 }}><div style={{ fontSize: 14.5, fontWeight: 700 }}>{mi.label}</div><div className="muted" style={{ fontSize: 12 }}>{cov.note} · {mi.group}</div></div>
                </div>
                <div className="row gap8">
                  {kbIsStdPage(reg.module) && <Btn sm onClick={previewStd}><I.search2 size={13} /> Pratinjau</Btn>}
                  <Btn sm variant="primary" onClick={openModule}><I.arrowRight size={13} /> Buka modul</Btn>
                </div>
              </div>
            </div>
          )}
          {reg.coverage === 'gap' && (
            <div className="panel" style={{ padding: '12px 15px', marginBottom: 14, borderColor: 'var(--amber)', background: 'var(--amber-bg, #fff8ee)' }}>
              <div className="row jb ac gap10 wrap">
                <div className="tiny" style={{ color: 'var(--amber)', fontWeight: 600, maxWidth: 380 }}>Standar ini belum memiliki modul/checklist khusus — terdaftar sebagai kandidat backlog di Matriks Kepatuhan.</div>
                <Btn sm onClick={() => { onClose(); nav('compmatrix', { from: 'kb' }); }}><I.table size={13} /> Lihat di matriks</Btn>
              </div>
            </div>
          )}

          {/* template terkait — tarikan live */}
          {tpls.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div className="tiny muted upper" style={{ marginBottom: 8, fontWeight: 700 }}>Template terkait · {tpls.length}</div>
              <div style={{ display: 'grid', gap: 6 }}>
                {tpls.slice(0, 5).map(t => (
                  <button key={t.id} className="kb-readlink" onClick={() => { onClose(); nav('templates', { from: 'kb' }); }}>
                    <span className="mono tiny" style={{ fontWeight: 700, color: '#fff', background: 'var(--navy)', padding: '2px 6px', borderRadius: 4, flex: '0 0 auto' }}>{t.fmt}</span>
                    <span style={{ flex: 1, minWidth: 0 }}><span style={{ fontSize: 13.5, fontWeight: 600 }}>{t.name}</span><span className="tiny muted" style={{ display: 'block' }}>v{t.ver} · {t.status}{t.reviewDue ? ' · perlu reviu' : ''}</span></span>
                    <I.arrowRight size={14} style={{ color: 'var(--ink-4)' }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* rujukan-silang standar */}
          {related.length > 0 && (
            <div className="panel" style={{ padding: '12px 14px', background: 'var(--surface-2)' }}>
              <div className="tiny muted upper" style={{ marginBottom: 8, fontWeight: 700 }}>Standar terkait</div>
              <div className="row wrap gap6">
                {related.map(r => (
                  <button key={r.code} className="chip" onClick={() => openRelated(r)} title={r.title}
                    style={{ cursor: 'pointer', height: 26, border: '1px solid var(--line-strong)', background: '#fff', color: 'var(--ink-2)', fontWeight: 600 }}>
                    <span className="mono" style={{ fontWeight: 700, color: 'var(--navy)', marginRight: 5 }}>{r.code}</span>{r.inReg ? '' : <I.arrowRight size={11} />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="muted" style={{ fontSize: 12 }}>NeoSuite Knowledge Base · diindeks dari Registri Standar · {window.AMS.KB_UPDATED}</span>
          <div className="row gap8"><Btn onClick={onClose}>Tutup</Btn><Btn variant="primary"><I.download size={14} /> Simpan PDF</Btn></div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { KnowledgeBase, KBCard, ArticleReader });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { ArticleReader, KBCard, KnowledgeBase };
