/* [codemod] ESM imports */
import React from 'react';
import { useNav } from './contexts.jsx';
import { I, MODULE_INDEX } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Btn, Panel, Stat } from './ui.jsx';

/* ============================================================
   NeoSuite AMS — Daftar-Uji Pengungkapan (Disclosure Checklist Engine)
   Mewujudkan wawasan "rujukan margin LK sebagai daftar-uji": tiap
   persyaratan pengungkapan ditambatkan ke rujukan paragraf bernomor
   selaras-IFRS (mis. 201p54, 115p105, 116p47) dan ditautkan ke modul
   pemiliknya. Status terpenuhi/belum/NA dipantau & diskor per laporan.
   DV = Disclose Voluntary (praktik terbaik, tidak wajib).
   ============================================================ */
const { useState: useStateDC, useMemo: useMemoDC } = React;

const DC_STATEMENTS = [
  { id: 'sofp', label: 'Posisi Keuangan' },
  { id: 'pl', label: 'Laba Rugi & PKL' },
  { id: 'soce', label: 'Perubahan Ekuitas' },
  { id: 'socf', label: 'Arus Kas' },
  { id: 'notes', label: 'Catatan (CALK)' },
];

/* Registri persyaratan pengungkapan — std = nomor lama (untuk alias),
   ref = paragraf selaras-IFRS, module = pemilik, status default. */
const DC_REQS = [
  // ---- Posisi Keuangan ----
  { stmt: 'sofp', std: 'PSAK 1', ref: '201p54', area: 'Pos minimum neraca', module: 'fsgen', status: 'done' },
  { stmt: 'sofp', std: 'PSAK 1', ref: '201p60', area: 'Pemisahan lancar / tidak lancar', module: 'fsgen', status: 'done' },
  { stmt: 'sofp', std: 'PSAK 71', ref: '107p8', area: 'Kategori aset & liabilitas keuangan', module: 'psak71', status: 'done' },
  { stmt: 'sofp', std: 'PSAK 73', ref: '116p47', area: 'Aset hak-guna disajikan terpisah', module: 'psak73', status: 'done' },
  { stmt: 'sofp', std: 'PSAK 58', ref: '105p38', area: 'Kelompok lepasan dimiliki untuk dijual', module: 'psak58', status: 'done' },
  { stmt: 'sofp', std: 'PSAK 1', ref: '232p34', area: 'Saham treasuri (komponen ekuitas)', module: 'fsgen', status: 'open' },
  // ---- Laba Rugi & PKL ----
  { stmt: 'pl', std: 'PSAK 1', ref: '201p82', area: 'Pos minimum laba rugi', module: 'fsgen', status: 'done' },
  { stmt: 'pl', std: 'PSAK 1', ref: '201p99', area: 'Analisis beban (sifat / fungsi)', module: 'fsgen', status: 'done' },
  { stmt: 'pl', std: 'PSAK 56', ref: '233p66', area: 'Laba per saham dasar & dilusian', module: 'fsgen', status: 'done' },
  { stmt: 'pl', std: 'PSAK 24', ref: '219p141', area: 'Beban imbalan kerja', module: 'psak24', status: 'done' },
  { stmt: 'pl', std: 'PSAK 58', ref: '105p33', area: 'Hasil operasi dihentikan', module: 'psak58', status: 'done' },
  { stmt: 'pl', std: 'PSAK 15', ref: '228p10', area: 'Bagian laba entitas asosiasi', module: 'assoc', status: 'done' },
  // ---- Perubahan Ekuitas ----
  { stmt: 'soce', std: 'PSAK 1', ref: '201p106', area: 'Rekonsiliasi tiap komponen ekuitas', module: 'fsgen', status: 'done' },
  { stmt: 'soce', std: 'PSAK 1', ref: '201p107', area: 'Dividen diakui & per saham', module: 'fsgen', status: 'done' },
  // ---- Arus Kas ----
  { stmt: 'socf', std: 'PSAK 2', ref: '207p18', area: 'Metode langsung (wajib emiten)', module: 'fsgen', status: 'done' },
  { stmt: 'socf', std: 'PSAK 2', ref: '207p44A', area: 'Rekonsiliasi liabilitas pendanaan (net debt)', module: 'fsgen', status: 'open' },
  { stmt: 'socf', std: 'PSAK 2', ref: '207p44H', area: 'Arus kas pendanaan pemasok', module: 'newdisc', status: 'done' },
  // ---- Catatan (CALK) ----
  { stmt: 'notes', std: 'PSAK 1', ref: '201p117', area: 'Ikhtisar kebijakan akuntansi material', module: 'fsgen', status: 'done' },
  { stmt: 'notes', std: 'PSAK 25', ref: '208p28', area: 'Standar baru diterapkan & belum efektif', module: 'psak25', status: 'done' },
  { stmt: 'notes', std: 'PSAK 7', ref: '224p18', area: 'Saldo & transaksi pihak berelasi', module: 'related', status: 'done' },
  { stmt: 'notes', std: 'PSAK 72', ref: '115p113', area: 'Disagregasi pendapatan', module: 'psak72', status: 'done' },
  { stmt: 'notes', std: 'PSAK 72', ref: '115p105', area: 'Aset & liabilitas kontrak', module: 'psak72', status: 'done' },
  { stmt: 'notes', std: 'PSAK 71', ref: '107p31', area: 'Manajemen risiko keuangan (kredit/likuiditas/pasar)', module: 'psak71', status: 'done' },
  { stmt: 'notes', std: 'PSAK 68', ref: '113p93', area: 'Hierarki nilai wajar (Level 1-3)', module: 'psak68', status: 'done' },
  { stmt: 'notes', std: 'PSAK 46', ref: '212p81', area: 'Rekonsiliasi beban & pajak tangguhan', module: 'psak46', status: 'done' },
  { stmt: 'notes', std: 'PSAK 46', ref: '212p88A', area: 'Pengecualian Pilar Dua & eksposur', module: 'newdisc', status: 'done' },
  { stmt: 'notes', std: 'PSAK 22', ref: '103p59', area: 'Kombinasi bisnis & PPA', module: 'psak22', status: 'done' },
  { stmt: 'notes', std: 'PSAK 15', ref: '228p21', area: 'Asosiasi — info keuangan ringkas', module: 'assoc', status: 'done' },
  { stmt: 'notes', std: 'PSAK 13', ref: '240p76', area: 'Properti investasi — rekonsiliasi & nilai wajar', module: 'invprop', status: 'done' },
  { stmt: 'notes', std: 'PSAK 5', ref: '108p23', area: 'Informasi segmen operasi', module: 'segmen', status: 'done' },
  { stmt: 'notes', std: 'PSAK 10', ref: '221p52', area: 'Aset/liabilitas moneter dalam valas', module: null, status: 'open' },
  { stmt: 'notes', std: 'PSAK 57', ref: '237p84', area: 'Provisi — rekonsiliasi', module: 'psak48', status: 'done' },
  { stmt: 'notes', std: 'PSAK 65', ref: '110p12', area: 'Kepentingan nonpengendali', module: 'psak65', status: 'done' },
  { stmt: 'notes', std: 'PSAK 14', ref: '202p36', area: 'Persediaan & NRV', module: 'psak14', status: 'done' },
  { stmt: 'notes', std: 'PSAK 16', ref: '216p73', area: 'Aset tetap — rekonsiliasi', module: 'psak16', status: 'done' },
  { stmt: 'notes', std: 'PSAK 8', ref: '210p10', area: 'Peristiwa setelah periode pelaporan', module: 'subsequent', status: 'done' },
  { stmt: 'notes', std: 'Lampiran C', ref: 'DV', area: 'Dampak perubahan iklim', module: 'newdisc', status: 'done', dv: true },
];

const DC_STATUS = {
  done: { label: 'Terpenuhi', color: 'var(--green)', bg: 'var(--green-bg)' },
  open: { label: 'Belum', color: 'var(--amber)', bg: 'var(--amber-bg)' },
  na: { label: 'N/A', color: 'var(--ink-4)', bg: 'var(--surface-3)' },
};

function DisclosureChecklist() {
  const nav = useNav();
  const [override, setOverride] = window.useAmsPersist('disclosure.status', {});
  const [stmt, setStmt] = useStateDC('all');
  const [showDV, setShowDV] = useStateDC(true);

  const reqs = useMemoDC(() => DC_REQS.map((r, i) => ({ ...r, id: 'dc' + i, status: override['dc' + i] || r.status })), [override]);
  const cycle = (id) => setOverride(o => { const cur = o[id] || (DC_REQS[+id.slice(2)] || {}).status || 'open'; const next = cur === 'done' ? 'open' : cur === 'open' ? 'na' : 'done'; return { ...o, [id]: next }; });

  const visible = reqs.filter(r => (stmt === 'all' || r.stmt === stmt) && (showDV || !r.dv));
  const applic = reqs.filter(r => r.status !== 'na');
  const doneN = applic.filter(r => r.status === 'done').length;
  const pct = applic.length ? Math.round(doneN / applic.length * 100) : 100;
  const openN = reqs.filter(r => r.status === 'open').length;

  const perStmt = DC_STATEMENTS.map(s => {
    const rs = reqs.filter(r => r.stmt === s.id && r.status !== 'na');
    const d = rs.filter(r => r.status === 'done').length;
    return { ...s, total: rs.length, done: d, pct: rs.length ? Math.round(d / rs.length * 100) : 100 };
  });

  const aliasOf = (std) => (window.STD_IFRS_ALIAS || {})[std];
  const grouped = DC_STATEMENTS.map(s => ({ ...s, items: visible.filter(r => r.stmt === s.id) })).filter(g => g.items.length);

  return (
    <>
      <SubBar moduleId="disclosure" right={
        <div className="row gap8 ac">
          <span className="tiny mono" style={{ color: pct === 100 ? 'var(--green)' : 'var(--amber)' }}>● {pct}% lengkap</span>
          <Btn sm onClick={() => nav('compmatrix', { from: 'disclosure' })}><I.table size={13} /> Matriks Kepatuhan</Btn>
          <Btn sm variant="primary" onClick={() => nav('fsgen', { from: 'disclosure' })}><I.report size={14} /> FS Generator</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>
          {/* scorecards */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={pct + '%'} label="Kelengkapan pengungkapan" accent={pct === 100 ? 'var(--green)' : 'var(--amber)'} /><div className="pbar" style={{ marginTop: 6 }}><span style={{ width: pct + '%', background: pct === 100 ? 'var(--green)' : 'var(--amber)' }} /></div></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={applic.length} label="Persyaratan berlaku" sub="dari registri rujukan paragraf" /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={doneN} label="Terpenuhi" accent="var(--green)" /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={openN} label="Belum terpenuhi" accent={openN ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
          </div>

          {/* per-statement bars */}
          <div className="panel" style={{ padding: '12px 14px' }}>
            <div className="row gap10" style={{ flexWrap: 'wrap' }}>
              {perStmt.map(s => (
                <button key={s.id} onClick={() => setStmt(stmt === s.id ? 'all' : s.id)} style={{ flex: '1 1 150px', textAlign: 'left', border: '1px solid ' + (stmt === s.id ? 'var(--blue)' : 'var(--line)'), background: stmt === s.id ? 'var(--blue-050)' : 'var(--surface)', borderRadius: 9, padding: '9px 11px', cursor: 'pointer' }}>
                  <div className="row jb ac" style={{ marginBottom: 5 }}><span className="tiny" style={{ fontWeight: 700 }}>{s.label}</span><span className="mono tiny" style={{ color: s.pct === 100 ? 'var(--green)' : 'var(--amber)', fontWeight: 700 }}>{s.pct}%</span></div>
                  <div className="pbar"><span style={{ width: s.pct + '%', background: s.pct === 100 ? 'var(--green)' : 'var(--amber)' }} /></div>
                  <div className="tiny muted" style={{ marginTop: 4 }}>{s.done}/{s.total} pos</div>
                </button>
              ))}
            </div>
          </div>

          {/* filter row */}
          <div className="row ac jb" style={{ flexWrap: 'wrap', gap: 10 }}>
            <div className="row gap6 ac">
              {[['all', 'Semua laporan']].concat(DC_STATEMENTS.map(s => [s.id, s.label])).map(c => (
                <button key={c[0]} onClick={() => setStmt(c[0])} className="chip" style={{ cursor: 'pointer', height: 26, fontWeight: stmt === c[0] ? 700 : 600, border: '1px solid ' + (stmt === c[0] ? 'var(--blue)' : 'var(--line-strong)'), background: stmt === c[0] ? 'var(--blue)' : '#fff', color: stmt === c[0] ? '#fff' : 'var(--ink-2)' }}>{c[1]}</button>
              ))}
            </div>
            <label className="row ac gap6 tiny" style={{ cursor: 'pointer', userSelect: 'none', fontWeight: 600, color: 'var(--ink-2)' }} title="Tampilkan pengungkapan sukarela (Disclose Voluntary)">
              <input type="checkbox" checked={showDV} onChange={e => setShowDV(e.target.checked)} style={{ width: 15, height: 15, accentColor: 'var(--blue)' }} />
              Tampilkan DV (sukarela)
            </label>
          </div>

          {/* grouped list */}
          {grouped.map(g => (
            <div key={g.id} className="panel" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="row ac gap8" style={{ padding: '8px 14px', background: 'var(--surface-3)', borderBottom: '1px solid var(--line-soft)' }}>
                <span className="tiny" style={{ fontWeight: 700, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{g.label}</span>
                <span className="tiny muted">{g.items.length}</span>
              </div>
              {g.items.map(r => {
                const st = DC_STATUS[r.status];
                const al = aliasOf(r.std);
                const mod = r.module ? (MODULE_INDEX[r.module] || {}) : null;
                return (
                  <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '78px 1fr 130px 96px', gap: 10, alignItems: 'center', padding: '9px 14px', borderBottom: '1px solid var(--line-soft)' }}>
                    <span className="mono" style={{ fontSize: 11.5, fontWeight: 700, color: r.ref === 'DV' ? 'var(--purple)' : 'var(--navy)' }}>{r.ref}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}>{r.area} {r.dv && <span className="tiny" style={{ color: 'var(--purple)', fontWeight: 700 }}>· DV</span>}</div>
                      <div className="tiny muted">{r.std}{al ? ' → ' + al.code : ''}</div>
                    </div>
                    <div>
                      {mod ? (
                        <button onClick={() => nav(r.module, { from: 'disclosure' })} className="row ac gap5" style={{ border: '1px solid var(--line)', background: 'var(--surface)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: 'var(--blue)', fontWeight: 600, width: '100%' }}>
                          <I.arrowRight size={11} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(mod.label || r.module).replace(/ ·.*/, '').slice(0, 18)}</span>
                        </button>
                      ) : <span className="tiny" style={{ color: 'var(--amber)', fontStyle: 'italic' }}>belum ada modul</span>}
                    </div>
                    <button onClick={() => cycle(r.id)} title="Klik untuk ubah status" className="chip" style={{ cursor: 'pointer', height: 24, fontWeight: 700, justifyContent: 'center', border: '1px solid ' + st.color, background: st.bg, color: st.color }}>{st.label}</button>
                  </div>
                );
              })}
            </div>
          ))}

          <div className="tiny muted" style={{ padding: '0 2px 4px', lineHeight: 1.5 }}>
            Setiap baris ditambatkan ke <b>rujukan paragraf bernomor selaras-IFRS</b> (mis. <span className="mono">201p54</span>, <span className="mono">115p105</span>) seperti margin LK terbit — dan ditautkan ke modul pemiliknya. Klik status untuk menyetel <b>Terpenuhi → Belum → N/A</b>. <span className="mono">DV</span> = pengungkapan sukarela (praktik terbaik).
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { DisclosureChecklist });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { DisclosureChecklist };
