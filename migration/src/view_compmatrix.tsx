/* [codemod] ESM imports */
import React from 'react';
import { useNav } from './contexts';
import { I, MODULE_INDEX } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Progress } from './ui';
import { amsExportXlsx } from './export_xlsx';
/* Tahap 8 — registri standar pindah ke data_knowledge (eager) agar view_kb dan
   data_knowledge memakainya via ESM, bukan window.* yang hanya terisi setelah
   chunk Matriks dimuat. Di-re-export untuk kompatibilitas. */
import { STANDARDS_REGISTRY } from './data_knowledge';

/* ============================================================
   Asseris — Matriks Kepatuhan (Standards Register / Index)
   Satu sumber kebenaran: tiap SA/PSAK dipetakan ke checklist,
   modul fungsional, atau ditandai belum tercakup (gap).
   ============================================================ */
const { useState: useStateMX, useMemo: useMemoMX } = React;

/* type → badge kind */
const STD_TYPE_KIND = { SA: 'blue', PSAK: 'green', SAK: 'green', SPR: 'amber', SJAH: 'amber', SPA: 'amber', SMM: 'navy', KEPAP: 'navy' };
const PHASE_ORDER = ['Perencanaan', 'Pelaksanaan', 'Pelaporan', 'Perikatan Lain', 'Mutu', 'Akuntansi'];

/* Penomoran PSAK selaras-IFRS (efektif 2024) — alias atas nomor lama.
   LK Indonesia terbit kini memakai skema ini (mis. margin "201p54", "115p105").
   Satu sumber kebenaran; ditampilkan ganda di Matriks & header modul. */
const IFRS_ALIAS = {
  'PSAK 1':     { code: 'PSAK 201',     base: 'IAS 1' },
  'PSAK 2':     { code: 'PSAK 207',     base: 'IAS 7' },
  'PSAK 7':     { code: 'PSAK 224',     base: 'IAS 24' },
  'PSAK 8':     { code: 'PSAK 210',     base: 'IAS 10' },
  'PSAK 5':     { code: 'PSAK 108',     base: 'IFRS 8' },
  'PSAK 13':    { code: 'PSAK 240',     base: 'IAS 40' },
  'PSAK 15':    { code: 'PSAK 228',     base: 'IAS 28' },
  'PSAK 14':    { code: 'PSAK 202',     base: 'IAS 2' },
  'PSAK 16':    { code: 'PSAK 216',     base: 'IAS 16' },
  'PSAK 19':    { code: 'PSAK 238',     base: 'IAS 38' },
  'PSAK 22':    { code: 'PSAK 103',     base: 'IFRS 3' },
  'PSAK 24':    { code: 'PSAK 219',     base: 'IAS 19' },
  'PSAK 25':    { code: 'PSAK 208',     base: 'IAS 8' },
  'PSAK 46':    { code: 'PSAK 212',     base: 'IAS 12' },
  'PSAK 58':    { code: 'PSAK 105',     base: 'IFRS 5' },
  'PSAK 65':    { code: 'PSAK 110',     base: 'IFRS 10' },
  'PSAK 66':    { code: 'PSAK 111',     base: 'IFRS 11' },
  'PSAK 68':    { code: 'PSAK 113',     base: 'IFRS 13' },
  'PSAK 71':    { code: 'PSAK 109',     base: 'IFRS 9 / 7' },
  'PSAK 72':    { code: 'PSAK 115',     base: 'IFRS 15' },
  'PSAK 73':    { code: 'PSAK 116',     base: 'IFRS 16' },
  'PSAK 48/57': { code: 'PSAK 236/237', base: 'IAS 36 / 37' },
};

/* coverage: 'checklist' (punya COMPLIANCE_CONFIG) | 'module' (modul fungsional) | 'gap' (belum) */

const COV_META = {
  checklist: { label: 'Checklist', kind: 'green' },
  module: { label: 'Modul khusus', kind: 'blue' },
  gap: { label: 'Belum tercakup', kind: 'gray' },
};

const COLS = '108px minmax(200px,1fr) 64px 150px 150px 84px';

function MxCard({ value, label, accent, sub }: any) {
  return (
    <div className="panel" style={{ padding: '12px 14px', display: 'grid', gap: 2 }}>
      <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: accent || 'var(--navy)', lineHeight: 1 }}>{value}</div>
      <div className="tiny muted" style={{ fontWeight: 600 }}>{label}</div>
      {sub && <div className="tiny" style={{ color: 'var(--ink-4)' }}>{sub}</div>}
    </div>
  );
}

function ComplianceMatrix() {
  const nav = useNav();
  const loader = window.loadLS || ((k, d) => d);
  const [q, setQ] = useStateMX('');
  const [type, setType] = useStateMX('Semua');
  const [cov, setCov] = useStateMX('Semua');
  const [hideNA, setHideNA] = useStateMX(false);
  const [appl, setAppl] = useStateMX(() => loader('ams.std.applicable', {}));
  React.useEffect(() => { try { localStorage.setItem('ams.std.applicable', JSON.stringify(appl)); } catch (e) {} }, [appl]);
  const [newNum, setNewNum] = useStateMX(() => loader('ams.std.newnum', false));
  React.useEffect(() => { try { localStorage.setItem('ams.std.newnum', JSON.stringify(newNum)); } catch (e) {} }, [newNum]);

  const isApplicable = (code: any) => appl[code] !== false;
  const toggleAppl = (code: any) => setAppl((a: any) => ({ ...a, [code]: a[code] === false ? true : false }));

  const types = ['Semua', 'SA', 'PSAK', 'SAK', 'SPR', 'SJAH', 'SMM', 'SPA', 'KEPAP'];
  const covs = [['Semua', 'Semua'], ['checklist', 'Checklist'], ['module', 'Modul'], ['gap', 'Belum']];

  const rows = useMemoMX(() => STANDARDS_REGISTRY.filter(r => {
    if (type !== 'Semua' && r.type !== type) return false;
    if (cov !== 'Semua' && r.coverage !== cov) return false;
    if (hideNA && !isApplicable(r.code)) return false;
    if (q) { const a = (IFRS_ALIAS as any)[r.code]; const s = (r.code + ' ' + r.title + (a ? ' ' + a.code + ' ' + a.base : '')).toLowerCase(); if (!s.includes(q.toLowerCase())) return false; }
    return true;
  }), [type, cov, hideNA, q, appl]);

  // summary across the full registry (applicable only)
  const applRows = STANDARDS_REGISTRY.filter(r => isApplicable(r.code));
  const nChecklist = applRows.filter(r => r.coverage === 'checklist').length;
  const nModule = applRows.filter(r => r.coverage === 'module').length;
  const nGap = applRows.filter(r => r.coverage === 'gap').length;
  const pcts = applRows.filter(r => r.coverage === 'checklist').map(r => (window.compliancePct ? (window.compliancePct(r.module) || { pct: 0 }).pct : 0));
  const avgPct = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;

  // group visible rows by phase
  const byPhase = PHASE_ORDER.map(ph => ({ phase: ph, items: rows.filter((r: any) => r.phase === ph) })).filter(g => g.items.length);

  /* K-06 lanjutan — wire tombol "Export Register" (dulu mati): ekspor XLSX tersegel
     register standar (firm-scope) dengan status keberlakuan & cakupan. */
  const [exporting, setExporting] = useStateMX(false);
  const onExportXlsx = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const regRows = STANDARDS_REGISTRY.map(r => [
        r.code, r.title, r.type, r.coverage, r.phase || '', isApplicable(r.code) ? 'Berlaku' : 'Tidak berlaku',
      ]);
      await amsExportXlsx({
        kind: 'compmatrix-register', scope: 'firm', scopeId: undefined,
        fileName: `Register Standar (Matriks Kepatuhan) - ${new Date().getFullYear()}.xlsx`,
        firm: 'KAP Wijaya Hartono & Rekan',
        title: 'Register Standar — Matriks Kepatuhan',
        meta: [`${STANDARDS_REGISTRY.length} standar · ${applRows.length} berlaku`,
          `Checklist ${nChecklist} · Modul ${nModule} · Gap ${nGap} · rata-rata kepatuhan ${avgPct}%`],
        sheets: [
          { name: 'Register', heading: 'Registri standar audit & akuntansi (SA · PSAK · SAK · SPR · SJAH · SMM · SPA)',
            columns: ['Kode', 'Standar', 'Jenis', 'Cakupan', 'Fase', 'Keberlakuan'],
            rows: regRows, colWidths: [10, 46, 10, 12, 10, 14] },
        ],
      });
    } finally {
      setExporting(false);
    }
  };

  const chip = (active: any, onClick: any, label: any, key: any) => (
    <button key={key} onClick={onClick} className="chip" style={{ cursor: 'pointer', border: '1px solid ' + (active ? 'var(--blue)' : 'var(--line-strong)'), background: active ? 'var(--blue)' : '#fff', color: active ? '#fff' : 'var(--ink-2)', fontWeight: active ? 700 : 600, height: 26 }}>{label}</button>
  );

  return (
    <>
      <SubBar moduleId="compmatrix" right={
        <div className="row gap8 ac">
          <Badge kind="blue">{STANDARDS_REGISTRY.length} standar terdaftar</Badge>
          <Btn sm onClick={onExportXlsx} disabled={exporting}><I.download size={13} /> {exporting ? 'Menyiapkan…' : 'Export Register'}</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>
          {/* summary */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            <MxCard value={STANDARDS_REGISTRY.length} label="Total standar" sub="SA · PSAK · SAK · Perikatan" />
            <MxCard value={nChecklist} label="Checklist kepatuhan" accent="var(--green)" sub="diuji per-engagement" />
            <MxCard value={nModule} label="Tertaut modul khusus" accent="var(--blue)" sub="alur kerja fungsional" />
            <MxCard value={nGap} label="Belum tercakup" accent={nGap ? 'var(--amber)' : 'var(--green)'} sub="kandidat backlog" />
            <MxCard value={avgPct + '%'} label="Rerata kepatuhan" accent={avgPct === 100 ? 'var(--green)' : 'var(--navy)'} sub="checklist berlaku" />
          </div>

          {/* filters */}
          <div className="panel" style={{ padding: 12, display: 'grid', gap: 10 }}>
            <div className="row ac gap10" style={{ flexWrap: 'wrap' }}>
              <div className="row ac" style={{ flex: '1 1 240px', minWidth: 220, border: '1px solid var(--line-strong)', borderRadius: 8, padding: '0 10px', height: 34, gap: 8 }}>
                <I.search2 size={15} style={{ color: 'var(--ink-4)' }} />
                <input value={q} onChange={(e: any) => setQ(e.target.value)} placeholder="Cari nomor atau judul standar…" style={{ border: 'none', outline: 'none', flex: 1, fontSize: 13, background: 'transparent' }} />
                {q && <button className="p-act" onClick={() => setQ('')} title="Bersihkan"><I.x size={14} /></button>}
              </div>
              <label className="row ac gap6 tiny" style={{ cursor: 'pointer', userSelect: 'none', fontWeight: 600, color: 'var(--ink-2)' }}>
                <input type="checkbox" checked={hideNA} onChange={(e: any) => setHideNA(e.target.checked)} style={{ width: 15, height: 15, accentColor: 'var(--blue)' }} />
                Sembunyikan N/A
              </label>
              <label className="row ac gap6 tiny" style={{ cursor: 'pointer', userSelect: 'none', fontWeight: 600, color: 'var(--ink-2)' }} title="Tampilkan penomoran PSAK selaras-IFRS (efektif 2024) sebagai nomor utama">
                <input type="checkbox" checked={newNum} onChange={(e: any) => setNewNum(e.target.checked)} style={{ width: 15, height: 15, accentColor: 'var(--blue)' }} />
                Penomoran selaras-IFRS
              </label>
            </div>
            <div className="row ac gap10" style={{ flexWrap: 'wrap' }}>
              <span className="tiny muted" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', width: 56 }}>Tipe</span>
              <div className="row gap6" style={{ flexWrap: 'wrap' }}>{types.map(t => chip(type === t, () => setType(t), t, t))}</div>
            </div>
            <div className="row ac gap10" style={{ flexWrap: 'wrap' }}>
              <span className="tiny muted" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', width: 56 }}>Cakupan</span>
              <div className="row gap6" style={{ flexWrap: 'wrap' }}>{covs.map(c => chip(cov === c[0], () => setCov(c[0]), c[1], c[0]))}</div>
            </div>
          </div>

          {/* table */}
          <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 10, padding: '9px 14px', borderBottom: '1px solid var(--line)', background: 'var(--surface-2)' }}>
              {['Kode', 'Standar', 'Tipe', 'Cakupan', 'Progres / Status', 'Berlaku'].map((h, i) => (
                <span key={i} className="tiny muted" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', textAlign: i >= 4 ? 'left' : 'left' }}>{h}</span>
              ))}
            </div>
            {byPhase.length === 0 && (
              <div className="row ac jc" style={{ padding: 28, color: 'var(--ink-4)', fontSize: 13 }}>Tidak ada standar yang cocok dengan filter.</div>
            )}
            {byPhase.map(g => (
              <div key={g.phase}>
                <div className="row ac gap8" style={{ padding: '7px 14px', background: 'var(--surface-3)', borderBottom: '1px solid var(--line-soft)' }}>
                  <span className="tiny" style={{ fontWeight: 700, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{g.phase}</span>
                  <span className="tiny muted">{g.items.length}</span>
                </div>
                {g.items.map((r: any) => {
                  const cm = (COV_META as any)[r.coverage];
                  const al = (IFRS_ALIAS as any)[r.code];
                  const na = !isApplicable(r.code);
                  const navigable = r.coverage !== 'gap' && r.module;
                  const prog = r.coverage === 'checklist' && window.compliancePct ? window.compliancePct(r.module) : null;
                  return (
                    <div key={r.code} onClick={() => navigable && nav(r.module, { from: 'compmatrix' })}
                      style={{ display: 'grid', gridTemplateColumns: COLS, gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--line-soft)', alignItems: 'center', cursor: navigable ? 'pointer' : 'default', opacity: na ? 0.5 : 1 }}
                      onMouseEnter={(e: any) => { if (navigable) e.currentTarget.style.background = 'var(--blue-050)'; }}
                      onMouseLeave={(e: any) => { e.currentTarget.style.background = 'transparent'; }}>
                      <div style={{ minWidth: 0 }}>
                        <div className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>{newNum && al ? al.code : r.code}</div>
                        {al && <div className="mono" style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2, whiteSpace: 'nowrap' }}>{newNum ? ('lama ' + r.code) : ('\u2261 ' + al.code)}</div>}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.35 }}>{r.title}</div>
                        {r.coverage === 'module' && <div className="tiny muted">→ {((MODULE_INDEX as any)[r.module] || {}).label || r.module}</div>}
                        {r.coverage === 'gap' && <div className="tiny" style={{ color: 'var(--amber)' }}>Kandidat untuk ditambahkan</div>}
                      </div>
                      <span><Badge kind={(STD_TYPE_KIND as any)[r.type] || 'gray'}>{r.type}</Badge></span>
                      <span><Badge kind={cm.kind}>{cm.label}</Badge></span>
                      <div>
                        {prog ? (
                          <div className="row ac gap8">
                            <div style={{ flex: 1, maxWidth: 90 }}><Progress value={prog.pct} color={prog.pct === 100 ? 'var(--green)' : undefined} /></div>
                            <span className="mono tiny" style={{ fontWeight: 700, color: prog.pct === 100 ? 'var(--green)' : 'var(--ink-2)' }}>{prog.pct}%</span>
                          </div>
                        ) : r.coverage === 'module' ? (
                          <span className="tiny muted row ac gap4">Buka modul <I.arrowRight size={12} /></span>
                        ) : (
                          <span className="tiny" style={{ color: 'var(--ink-4)' }}>—</span>
                        )}
                      </div>
                      <button onClick={(e: any) => { e.stopPropagation(); toggleAppl(r.code); }} title="Tandai keberlakuan untuk engagement aktif"
                        aria-pressed={!na}
                        className="chip" style={{ cursor: 'pointer', height: 22, fontWeight: 700, border: '1px solid ' + (na ? 'var(--line-strong)' : 'var(--green)'), background: na ? 'var(--surface-3)' : 'var(--green-bg)', color: na ? 'var(--ink-4)' : 'var(--green)' }}>
                        {na ? 'N/A' : 'Berlaku'}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="tiny muted" style={{ padding: '0 2px 4px', lineHeight: 1.5 }}>
            Matriks ini memetakan setiap standar ke satu rumah: <b>Checklist</b> (diuji langsung di tab ini), <b>Modul khusus</b> (alur kerja fungsional terpisah), atau <b>Belum tercakup</b> (backlog). Keberlakuan disetel per-engagement aktif — standar N/A tetap tercatat untuk jejak audit.
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { STANDARDS_REGISTRY, ComplianceMatrix });

/* module -> alias selaras-IFRS, untuk chip di header modul (SubBar) */
const MODULE_IFRS = {};
STANDARDS_REGISTRY.forEach(r => { const a = (IFRS_ALIAS as any)[r.code]; if (a && r.module && !(MODULE_IFRS as any)[r.module]) (MODULE_IFRS as any)[r.module] = { ...a, legacy: r.code }; });
Object.assign(window, { STD_IFRS_ALIAS: IFRS_ALIAS, MODULE_IFRS });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { ComplianceMatrix, MODULE_IFRS, STANDARDS_REGISTRY };
export const STD_IFRS_ALIAS = window.STD_IFRS_ALIAS;
