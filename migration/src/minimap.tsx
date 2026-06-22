/* [codemod] ESM imports */
import React from 'react';
import { I } from './icons';

/* ============================================================
   Asseris — Peta Mini Keterhubungan ("Anda di sini")
   ------------------------------------------------------------
   Lapisan orientasi yang SELALU hadir & dapat dipanggil dari mana
   saja (tombol TopBar, pil "Anda di sini" tetap, ⌘/Ctrl+M).
   Menjawab "di mana saya sekarang" dengan:
     1. Lokasi kanonik (Workspace › Grup › Modul + standar).
     2. Graf tetangga langsung (hulu → modul → hilir) dari LINEAGE.
     3. Peta global ringkas (semua workspace/grup) dengan posisi
        modul aktif disorot.
   Sumber kebenaran tunggal: window.LINEAGE ∪ MODULE_INDEX ∪ MODULES
   ∪ RELATED_SA (selaras filosofi Peta Keterhubungan yang diturunkan
   dari kode, bukan daftar manual). Tidak menyimpan salinan data.
   ============================================================ */

const { useState: useStateMM, useRef: useRefMM, useMemo: useMemoMM, useLayoutEffect: useLayoutEffectMM, useEffect: useEffectMM } = React;

/* ---- style sekali-suntik (terisolasi, memakai CSS var tema) ---- */
(function injectMiniMapCSS() {
  if (document.getElementById('ams-minimap-css')) return;
  const css = `
  .side-minimap { display: flex; align-items: center; gap: 9px; margin: 6px 8px 0; padding: 8px 10px;
    border-radius: 9px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.09);
    color: #dbeefb; cursor: pointer; text-align: left; transition: .13s; }
  .side-minimap:hover { background: rgba(255,255,255,.10); border-color: rgba(77,184,255,.5); }
  .side-minimap .ic { width: 26px; height: 26px; flex: 0 0 26px; border-radius: 7px; background: var(--blue); color: #fff; display: grid; place-items: center; }
  .side-minimap .mn { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.15; }
  .side-minimap .mn .k { font: 700 9px/1.3 var(--mono); letter-spacing: .08em; text-transform: uppercase; color: #7fa8c2; }
  .side-minimap .mn .l { font-size: 12px; font-weight: 700; color: #eaf3f8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .side-minimap .ar { color: #7fa8c2; flex: 0 0 auto; }
  .sidebar.collapsed .side-minimap { justify-content: center; padding: 8px 0; margin: 6px; }

  .mm-back { position: fixed; inset: 0; z-index: 90; background: rgba(0,24,38,.46);
    backdrop-filter: blur(2px); display: grid; place-items: center; padding: 26px; animation: mm-fade .16s ease; }
  @keyframes mm-fade { from { opacity: 0; } to { opacity: 1; } }
  .mm-card { width: min(940px, 100%); max-height: 88vh; display: flex; flex-direction: column;
    background: var(--surface); border: 1px solid var(--line); border-radius: 14px; overflow: hidden;
    box-shadow: 0 24px 64px rgba(0,24,38,.34); animation: mm-rise .18s cubic-bezier(.4,0,.2,1); }
  @keyframes mm-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

  .mm-head { display: flex; align-items: center; gap: 11px; padding: 13px 16px;
    background: linear-gradient(135deg, var(--navy-600, #013049), var(--navy)); color: #fff; flex: 0 0 auto; }
  .mm-head .mm-h-ic { width: 30px; height: 30px; border-radius: 8px; background: rgba(255,255,255,.13); display: grid; place-items: center; }
  .mm-head .mm-h-t { font-size: 14px; font-weight: 700; }
  .mm-head .mm-h-s { font-size: 11px; opacity: .72; }
  .mm-head .mm-x { margin-left: auto; width: 30px; height: 30px; border-radius: 7px; border: 0; background: rgba(255,255,255,.10); color: #fff; display: grid; place-items: center; cursor: pointer; }
  .mm-head .mm-x:hover { background: rgba(255,255,255,.22); }

  .mm-loc { display: flex; align-items: center; gap: 8px; padding: 10px 16px; flex: 0 0 auto;
    border-bottom: 1px solid var(--line); background: var(--surface-2); flex-wrap: wrap; }
  .mm-loc .mm-ws { font-size: 10px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase;
    padding: 2px 8px; border-radius: 5px; color: #fff; }
  .mm-loc .mm-crumb { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ink-3); }
  .mm-loc .mm-crumb b { color: var(--ink); }
  .mm-loc .mm-std { font-size: 11px; color: var(--ink-3); font-family: var(--mono); }
  .mm-loc .mm-status { margin-left: auto; display: inline-flex; align-items: center; gap: 6px;
    font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 20px; border: 1px solid; }

  .mm-graph { flex: 1 1 auto; position: relative; min-height: 250px; padding: 14px 16px;
    display: grid; grid-template-columns: 1fr auto 1fr; gap: 8px; align-items: center; overflow: hidden; }
  .mm-arcs { position: absolute; inset: 0; pointer-events: none; z-index: 1; }
  .mm-col { display: flex; flex-direction: column; gap: 7px; position: relative; z-index: 2; min-width: 0; }
  .mm-col.up { align-items: flex-start; }
  .mm-col.down { align-items: flex-end; }
  .mm-col-h { font-size: 10px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; margin-bottom: 1px; }
  .mm-col.up .mm-col-h { color: var(--blue); }
  .mm-col.down .mm-col-h { color: var(--green); }

  .mm-chip { display: inline-flex; align-items: center; gap: 8px; max-width: 100%;
    padding: 7px 11px; border-radius: 9px; border: 1px solid var(--line); background: var(--surface);
    cursor: pointer; transition: .13s; text-align: left; box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,32,46,.06)); }
  .mm-chip:hover { border-color: var(--blue); background: var(--blue-050); transform: translateY(-1px); }
  .mm-chip .mm-c-ic { flex: 0 0 16px; display: grid; place-items: center; }
  .mm-chip .mm-c-tx { display: flex; flex-direction: column; min-width: 0; }
  .mm-chip .mm-c-l { font-size: 12px; font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mm-chip .mm-c-r { font-size: 10.5px; color: var(--ink-4); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 230px; }
  .mm-more { font-size: 10.5px; color: var(--ink-4); padding: 2px 4px; }
  .mm-empty { font-size: 11.5px; color: var(--ink-4); font-style: italic; padding: 4px 2px; }

  .mm-node { position: relative; z-index: 3; display: flex; flex-direction: column; align-items: center;
    gap: 6px; padding: 14px 16px; border-radius: 13px; min-width: 150px; max-width: 200px;
    background: var(--surface); border: 2px solid var(--navy); box-shadow: 0 8px 24px rgba(0,80,133,.18); }
  .mm-node .mm-n-here { font-size: 9px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase;
    color: #fff; background: var(--navy); padding: 2px 9px; border-radius: 20px; }
  .mm-node .mm-n-ic { width: 38px; height: 38px; border-radius: 10px; background: var(--blue-050); color: var(--navy); display: grid; place-items: center; }
  .mm-node .mm-n-l { font-size: 13px; font-weight: 800; color: var(--ink); text-align: center; line-height: 1.2; }
  .mm-node .mm-n-g { font-size: 10px; color: var(--ink-4); text-align: center; }

  .mm-ov { flex: 0 0 auto; border-top: 1px solid var(--line); background: var(--surface-2); }
  .mm-ov-h { display: flex; align-items: center; gap: 8px; padding: 9px 16px; cursor: pointer; user-select: none; }
  .mm-ov-h .mm-ov-t { font-size: 11px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; color: var(--ink-3); }
  .mm-ov-h .mm-ov-c { font-size: 11px; color: var(--ink-4); margin-left: auto; }
  .mm-ov-body { display: flex; gap: 14px; padding: 4px 16px 14px; overflow-x: auto; }
  .mm-ws-col { flex: 0 0 auto; min-width: 220px; max-width: 320px; }
  .mm-ws-col-h { display: flex; align-items: center; gap: 7px; font-size: 10px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--ink-3); margin-bottom: 7px; }
  .mm-ws-col-h .mm-ws-dot { width: 8px; height: 8px; border-radius: 3px; }
  .mm-grp { margin-bottom: 9px; }
  .mm-grp-n { font-size: 10.5px; font-weight: 700; color: var(--ink-2); margin-bottom: 4px; }
  .mm-grp-n.cur { color: var(--blue); }
  .mm-dots { display: flex; flex-wrap: wrap; gap: 5px; }
  .mm-dot { width: 18px; height: 18px; border-radius: 6px; border: 1px solid var(--line);
    display: grid; place-items: center; cursor: pointer; background: var(--surface); transition: .12s; color: var(--ink-4); }
  .mm-dot:hover { border-color: var(--blue); color: var(--blue); transform: scale(1.12); }
  .mm-dot.cur { background: var(--navy); border-color: var(--navy); color: #fff; box-shadow: 0 0 0 3px var(--blue-100); }
  .mm-dot .mm-dot-i { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
  .mm-dot.deep .mm-dot-i { border-radius: 2px; }

  .mm-foot { flex: 0 0 auto; display: flex; align-items: center; gap: 8px; padding: 11px 16px; border-top: 1px solid var(--line); }
  .mm-foot .mm-hint { font-size: 11px; color: var(--ink-4); margin-right: auto; }
  .mm-btn { display: inline-flex; align-items: center; gap: 7px; height: 32px; padding: 0 13px; border-radius: 8px;
    font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid var(--line-strong); background: var(--surface); color: var(--ink-2); transition: .13s; }
  .mm-btn:hover { border-color: var(--blue); color: var(--blue); background: var(--blue-050); }
  .mm-btn.primary { background: var(--navy); border-color: var(--navy); color: #fff; }
  .mm-btn.primary:hover { filter: brightness(1.08); background: var(--navy); color: #fff; }
  .mm-loc-r { margin-left: auto; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .mm-deg { font-size: 11px; font-weight: 600; color: var(--ink-3); font-family: var(--mono); }
  .mm-col-h em { font-style: normal; font-weight: 600; opacity: .5; }
  .mm-arrow { color: var(--ink-4); }
  .mm-col.up .mm-arrow { color: var(--blue); }
  .mm-col.down .mm-arrow { color: var(--green); }
  .mm-legend { flex: 0 0 auto; display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
    padding: 8px 16px; border-top: 1px dashed var(--line); background: var(--surface); }
  .mm-leg { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: var(--ink-3); }
  .mm-leg b { color: var(--ink-2); font-weight: 700; }
  .mm-leg.tip { margin-left: auto; color: var(--ink-4); }
  .mm-ln { width: 18px; height: 2px; border-radius: 2px; flex: 0 0 18px; }
  .mm-ln.blue { background: var(--blue); }
  .mm-ln.green { background: var(--green); }
  .mm-ov-sub { font-size: 11px; color: var(--ink-4); }
  @media (max-width: 720px) {
    .mm-graph { grid-template-columns: 1fr; gap: 12px; }
    .mm-col.down { align-items: flex-start; }
    .mm-node { align-self: center; }
    .mm-arcs { display: none; }
  }`;
  const el = document.createElement('style');
  el.id = 'ams-minimap-css';
  el.textContent = css;
  document.head.appendChild(el);
})();

/* ---- adjacency global diturunkan dari LINEAGE (SSOT) ---- */
function mmBuildGraph() {
  const L = window.LINEAGE || {};
  const out = {}, inc = {};
  const add = (s: any, t: any) => {
    if (!s || !t || s === t) return;
    ((out as any)[s] = (out as any)[s] || new Set()).add(t);
    ((inc as any)[t] = (inc as any)[t] || new Set()).add(s);
  };
  Object.keys(L).forEach(m => {
    (L[m].down || []).forEach((d: any) => add(m, d.id));
    (L[m].up || []).forEach((u: any) => add(u.id, m));
  });
  return { out, inc };
}

const MM_STATUS = {
  hub:       { c: 'var(--blue)',  bg: 'var(--blue-050)',  label: 'Simpul utama',       help: 'Banyak tautan masuk & keluar — modul penghubung penting dalam alur kerja.' },
  connected: { c: 'var(--green)', bg: 'var(--green-bg)',  label: 'Terhubung dua arah', help: 'Menerima masukan dari modul lain dan mengalirkan keluaran ke modul lain.' },
  source:    { c: 'var(--teal)',  bg: 'var(--surface-3)', label: 'Sumber',             help: 'Mengalirkan keluaran ke modul lain, tanpa menerima masukan dari modul lain.' },
  sink:      { c: 'var(--amber)', bg: 'var(--amber-bg)',  label: 'Penerima',           help: 'Hanya menerima masukan; keluarannya belum dipakai modul lain.' },
  island:    { c: 'var(--red)',   bg: 'var(--red-bg)',    label: 'Belum tertaut',      help: 'Belum memiliki tautan ke modul lain dalam peta keterkaitan.' },
};

function MiniMap({ open, route, onClose, onNavigate }: any) {
  const graphRef = useRefMM(null);
  const nodeRef = useRefMM(null);
  const chipRefs = useRefMM({});
  const [arcs, setArcs] = useStateMM([]);
  const [ovOpen, setOvOpen] = useStateMM(true);

  const MI = window.MODULE_INDEX || {};
  const meta = MI[route] || { label: route, group: '', icon: 'panel' };
  const graph = useMemoMM(mmBuildGraph, [open]);

  /* tetangga: utamakan LINEAGE (kaya + ada relasi), jika tidak ada turunkan dari adjacency */
  const neighbors = useMemoMM(() => {
    const L = (window.LINEAGE || {})[route];
    const toChip = (id: any, rel: any) => {
      const m = MI[id] || { label: id, icon: 'panel' };
      return { id, ic: m.icon || 'panel', lbl: m.label, rel: rel || '' };
    };
    let up, down;
    if (L) {
      up = (L.up || []).map((u: any) => ({ id: u.id, ic: u.ic || (MI[u.id] || {}).icon || 'panel', lbl: u.lbl || (MI[u.id] || {}).label || u.id, rel: u.rel || '' }));
      down = (L.down || []).map((d: any) => ({ id: d.id, ic: d.ic || (MI[d.id] || {}).icon || 'panel', lbl: d.lbl || (MI[d.id] || {}).label || d.id, rel: d.rel || '' }));
    } else {
      up = [...(graph.inc[route] || [])].map(id => toChip(id, 'merujuk modul ini'));
      down = [...(graph.out[route] || [])].map(id => toChip(id, 'memakai keluaran modul ini'));
    }
    /* dedupe by id within each side */
    const dd = (arr: any) => { const s = new Set(); return arr.filter((x: any) => (s.has(x.id) ? false : s.add(x.id))); };
    return { up: dd(up), down: dd(down) };
  }, [route, open, graph]);

  const status = useMemoMM(() => {
    const o = neighbors.down.length, i = neighbors.up.length;
    if (o === 0 && i === 0) return 'island';
    if ((o >= 4 && i >= 3) || o >= 6) return 'hub';
    if (o > 0 && i > 0) return 'connected';
    if (o > 0 && i === 0) return 'source';
    return 'sink';
  }, [neighbors]);

  const ws = (window.GROUP_WS || {})[meta.group];
  const wsObj = (window.WORKSPACES || []).find((w: any) => w.id === ws);
  const wsColor = ws === 'engagement' ? 'var(--blue)' : 'var(--navy)';
  const std = ((window.LINEAGE || {})[route] || {}).std
    || (((window.RELATED_SA || {})[route] || []).map((r: any) => r.code).join(' · '));

  const MAX = 7;
  const huluShown = neighbors.up.slice(0, MAX);
  const hilirShown = neighbors.down.slice(0, MAX);

  /* gambar busur SVG menghubungkan tetangga ↔ node pusat */
  const computeArcs = React.useCallback(() => {
    const g = graphRef.current, n = nodeRef.current;
    if (!g || !n) return;
    const gr = g.getBoundingClientRect();
    const nr = n.getBoundingClientRect();
    const nLeft = { x: nr.left - gr.left, y: nr.top - gr.top + nr.height / 2 };
    const nRight = { x: nr.right - gr.left, y: nr.top - gr.top + nr.height / 2 };
    const out: any[] = [];
    const curve = (a: any, b: any) => {
      const mx = (a.x + b.x) / 2;
      return `M${a.x},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}`;
    };
    huluShown.forEach((c: any) => {
      const el = chipRefs.current['u-' + c.id];
      if (!el) return;
      const r = el.getBoundingClientRect();
      const a = { x: r.right - gr.left, y: r.top - gr.top + r.height / 2 };
      out.push({ d: curve(a, nLeft), cls: 'up', end: nLeft, start: a });
    });
    hilirShown.forEach((c: any) => {
      const el = chipRefs.current['d-' + c.id];
      if (!el) return;
      const r = el.getBoundingClientRect();
      const b = { x: r.left - gr.left, y: r.top - gr.top + r.height / 2 };
      out.push({ d: curve(nRight, b), cls: 'down', end: b, start: nRight });
    });
    setArcs(out);
  }, [huluShown, hilirShown]);

  useLayoutEffectMM(() => {
    if (!open) return;
    const id = requestAnimationFrame(computeArcs);
    const t = setTimeout(computeArcs, 220); // setelah animasi masuk
    window.addEventListener('resize', computeArcs);
    return () => { cancelAnimationFrame(id); clearTimeout(t); window.removeEventListener('resize', computeArcs); };
  }, [open, route, computeArcs]);

  useEffectMM(() => {
    if (!open) return;
    const onKey = (e: any) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const go = (id: any) => { if (id && id !== route) onNavigate(id, { from: route }); onClose(); };
  const Ic = (key: any) => { const C = I && ((I as any)[key] || I.panel); return C ? <C size={14} /> : null; };
  const st = (MM_STATUS as any)[status];

  const Chip = ({ c, side }: any) => (
    <button type="button" className="mm-chip"
      ref={(el: any) => { chipRefs.current[side + '-' + c.id] = el; }}
      title={(c.rel ? c.rel + ' — ' : '') + 'buka ' + c.lbl}
      onClick={() => go(c.id)}>
      <span className="mm-c-ic" style={{ color: side === 'u' ? 'var(--blue)' : 'var(--green)' }}>{Ic(c.ic)}</span>
      <span className="mm-c-tx">
        <span className="mm-c-l">{c.lbl}</span>
        {c.rel ? <span className="mm-c-r">{c.rel}</span> : null}
      </span>
    </button>
  );

  /* ---- peta global ringkas ---- */
  const HIDDEN = window.HIDDEN_GROUPS || [];
  const MODS = window.MODULES || [];
  const wsCols = (window.WORKSPACES || []).map((w: any) => ({
    ws: w,
    groups: MODS.filter((g: any) => (window.GROUP_WS[g.group] || 'firm') === w.id && !HIDDEN.includes(g.group)),
  })).filter((c: any) => c.groups.length);

  return (
    <div className="mm-back" onMouseDown={(e: any) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mm-card" role="dialog" aria-label="Peta Mini Keterhubungan">
        <div className="mm-head">
          <span className="mm-h-ic">{Ic('group')}</span>
          <div>
            <div className="mm-h-t">Peta Mini Keterhubungan</div>
            <div className="mm-h-s">Lihat dari mana modul ini menerima data dan ke mana hasilnya mengalir</div>
          </div>
          <button type="button" className="mm-x" onClick={onClose} title="Tutup (Esc)">{Ic('x')}</button>
        </div>

        <div className="mm-loc">
          <span className="mm-ws" style={{ background: wsColor }}>{wsObj ? wsObj.label : 'Firma'}</span>
          <span className="mm-crumb">{meta.group || 'Modul'} <span style={{ opacity: .5 }}>›</span> <b>{meta.label}</b></span>
          {std ? <span className="mm-std">· {std}</span> : null}
          <span className="mm-loc-r">
            <span className="mm-deg" title="Jumlah modul yang memberi masukan dan yang memakai keluaran modul ini">
              {neighbors.up.length} masukan · {neighbors.down.length} keluaran
            </span>
            <span className="mm-status" style={{ color: st.c, borderColor: st.c, background: st.bg }} title={st.help}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: st.c }} />
              {st.label}
            </span>
          </span>
        </div>

        <div className="mm-graph" ref={graphRef}>
          <svg className="mm-arcs">
            {arcs.map((a: any, i: any) => (
              <g key={i}>
                <path d={a.d} fill="none"
                  stroke={a.cls === 'up' ? 'var(--blue)' : 'var(--green)'}
                  strokeWidth="1.6" opacity=".5" />
                <circle cx={a.end.x} cy={a.end.y} r="2.6" fill={a.cls === 'up' ? 'var(--blue)' : 'var(--green)'} />
              </g>
            ))}
          </svg>

          <div className="mm-col up">
            <span className="mm-col-h">Memberi masukan <em>· hulu</em> <span className="mm-arrow">▸</span></span>
            {huluShown.length ? huluShown.map((c: any) => <Chip key={'u' + c.id} c={c} side="u" />)
              : <span className="mm-empty">Tidak ada modul yang memberi masukan.</span>}
            {neighbors.up.length > MAX && <span className="mm-more">+{neighbors.up.length - MAX} sumber lain</span>}
          </div>

          <div className="mm-node" ref={nodeRef}>
            <span className="mm-n-here">Anda di sini</span>
            <span className="mm-n-ic">{Ic(meta.icon)}</span>
            <span className="mm-n-l">{meta.label}</span>
            <span className="mm-n-g">{meta.group}</span>
          </div>

          <div className="mm-col down">
            <span className="mm-col-h"><span className="mm-arrow">▸</span> Memakai keluaran <em>· hilir</em></span>
            {hilirShown.length ? hilirShown.map((c: any) => <Chip key={'d' + c.id} c={c} side="d" />)
              : <span className="mm-empty">Tidak ada modul yang memakai keluaran.</span>}
            {neighbors.down.length > MAX && <span className="mm-more">+{neighbors.down.length - MAX} pengguna lain</span>}
          </div>
        </div>

        <div className="mm-legend">
          <span className="mm-leg"><i className="mm-ln blue" /> Garis biru — modul yang <b>memberi masukan</b> ke sini</span>
          <span className="mm-leg"><i className="mm-ln green" /> Garis hijau — modul yang <b>memakai keluaran</b> dari sini</span>
          <span className="mm-leg tip">{Ic('arrowRight')} Klik kartu mana pun untuk membukanya</span>
        </div>

        <div className="mm-ov">
          <div className="mm-ov-h" onClick={() => setOvOpen((o: any) => !o)}>
            {Ic('layers')}
            <span className="mm-ov-t">Peta Global Ringkas</span>
            <span className="mm-ov-sub">— kotak biru tua menandai posisi Anda; klik titik mana pun untuk lompat</span>
            <span className="mm-ov-c">{ovOpen ? 'sembunyikan' : 'tampilkan'}</span>
            <span style={{ transform: ovOpen ? 'none' : 'rotate(180deg)', transition: '.15s', color: 'var(--ink-4)', marginLeft: 8 }}>{Ic('chevDown')}</span>
          </div>
          {ovOpen && (
            <div className="mm-ov-body">
              {wsCols.map(({ ws: w, groups }: any) => (
                <div key={w.id} className="mm-ws-col">
                  <div className="mm-ws-col-h">
                    <span className="mm-ws-dot" style={{ background: w.id === 'engagement' ? 'var(--blue)' : 'var(--navy)' }} />
                    {w.label}
                  </div>
                  {groups.map((g: any) => {
                    const curGroup = g.group === meta.group;
                    return (
                      <div key={g.group} className="mm-grp">
                        <div className={'mm-grp-n' + (curGroup ? ' cur' : '')}>{g.group}</div>
                        <div className="mm-dots">
                          {g.items.map((it: any) => {
                            const cur = it.id === route;
                            return (
                              <button key={it.id} type="button"
                                className={'mm-dot' + (cur ? ' cur' : '') + (it.deep ? ' deep' : '')}
                                title={it.label + (it.deep ? '' : ' · ringkasan')}
                                onClick={() => go(it.id)}>
                                <span className="mm-dot-i" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mm-foot">
          <span className="mm-hint">Sumber: peta keterkaitan modul (LINEAGE) · selalu sinkron dengan kode</span>
          <button type="button" className="mm-btn" onClick={() => { onClose(); onNavigate('compmatrix', { from: route }); }}>
            {Ic('table')} Matriks Kepatuhan
          </button>
          <button type="button" className="mm-btn primary"
            onClick={() => { try { window.open('peta/Peta Keterhubungan Modul.html', '_blank'); } catch (e) {} }}>
            {Ic('group')} Buka Peta Lengkap
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MiniMap });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { MiniMap };
