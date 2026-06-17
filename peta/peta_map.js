/* ============================================================
   Peta Keterhubungan Modul — NeoSuite AMS
   Vanilla JS: layout chips, draw connection arcs, gap overlay
   ============================================================ */
(function () {
  const DATA = window.__CONN;
  const board = document.getElementById('board');
  const cols = document.getElementById('cols');
  const svg = document.getElementById('arcs');
  const rail = document.getElementById('rail');
  const SVGNS = 'http://www.w3.org/2000/svg';

  /* ---- indexes ---- */
  const META = {};            // id -> {label, group, status, out, inc, lineage, ws}
  DATA.groups.forEach(g => g.items.forEach(it => { META[it.id] = { ...it, group: g.group, ws: g.ws }; }));
  const adjOut = {}, adjIn = {};
  DATA.edges.forEach(e => {
    (adjOut[e.s] = adjOut[e.s] || []).push(e);
    (adjIn[e.t] = adjIn[e.t] || []).push(e);
  });

  /* ---- recommended (still-missing) links — refreshed Jun 2026 ----
     68 dari 75 rekomendasi evaluasi awal kini sudah menjadi edge nyata,
     dan tiga modul pulau (hrcase, soqm, sakep) sudah dirangkai di LINEAGE
     pada putaran P2 — tidak ada lagi pulau. Yang tersisa hanyalah tujuh
     tautan struktural opsional yang belum terpasang. */
  const GAPS = [
    // --- Tulang punggung audit (spine) — sisa ---
    ['risk','sad','spine'],['risk','psak71','spine'],['evidence','wtb','spine'],
    // --- Halaman SA resiprokal — sisa ---
    ['sa501','confirm','sa'],
    // --- Backoffice — sisa ---
    ['records','dms','back'],['records','workpapers','back'],['insurance','risk','back'],
  ].map(([s,t,grp]) => ({ s, t, grp }));

  const GAP_OUT = {}, GAP_IN = {};
  GAPS.forEach(g => { (GAP_OUT[g.s]=GAP_OUT[g.s]||[]).push(g); (GAP_IN[g.t]=GAP_IN[g.t]||[]).push(g); });

  const STATUS = {
    hub:       { c: '#005085', label: 'Hub', desc: 'banyak tautan keluar' },
    connected: { c: '#1f7a4d', label: 'Terhubung', desc: 'timbal balik' },
    sink:      { c: '#9a6a00', label: 'Satu arah', desc: 'hanya dirujuk, tak menaut balik' },
    island:    { c: '#b3261e', label: 'Pulau', desc: 'terisolasi' },
  };

  /* ---- build board ---- */
  const chipEl = {};
  const order = [...DATA.groups].sort((a, b) => (a.ws === b.ws ? 0 : a.ws === 'engagement' ? -1 : 1));
  order.forEach(g => {
    const conn = g.items.filter(i => i.status !== 'island').length;
    const pct = Math.round(100 * conn / g.items.length);
    const panel = document.createElement('section');
    panel.className = 'cluster';
    panel.dataset.ws = g.ws;
    panel.innerHTML =
      `<div class="cl-h">
         <span class="cl-ws ${g.ws}">${g.ws === 'engagement' ? 'PERIKATAN' : 'FIRMA'}</span>
         <span class="cl-name">${g.group}</span>
         <span class="cl-pct" title="${conn}/${g.items.length} modul memiliki tautan">${pct}%</span>
       </div>
       <div class="cl-bar"><i style="width:${pct}%"></i></div>
       <div class="chips"></div>`;
    const chips = panel.querySelector('.chips');
    g.items.forEach(it => {
      const c = document.createElement('button');
      c.className = 'chip';
      c.dataset.id = it.id;
      c.dataset.status = it.status;
      const dia = 7 + Math.min(it.out, 8); // hub dots larger
      c.innerHTML =
        `<span class="dot" style="background:${STATUS[it.status].c};width:${dia}px;height:${dia}px"></span>
         <span class="lbl">${it.label}</span>
         <span class="deg">${it.out}<span class="ar">→</span><span class="in">←${it.inc}</span></span>`;
      c.addEventListener('click', (e) => { e.stopPropagation(); select(it.id); });
      c.addEventListener('mouseenter', () => { if (!pinned) preview(it.id); });
      c.addEventListener('mouseleave', () => { if (!pinned) clearArcs(); });
      chips.appendChild(c);
      chipEl[it.id] = c;
    });
    cols.appendChild(panel);
  });

  /* ---- arc drawing ---- */
  function center(id) {
    const el = chipEl[id]; if (!el) return null;
    const br = el.getBoundingClientRect();
    const bo = board.getBoundingClientRect();
    return { x: br.left - bo.left + board.scrollLeft + br.width / 2,
             y: br.top - bo.top + board.scrollTop + br.height / 2,
             w: br.width };
  }
  function sizeSvg() {
    svg.setAttribute('width', board.scrollWidth);
    svg.setAttribute('height', board.scrollHeight);
    svg.setAttribute('viewBox', `0 0 ${board.scrollWidth} ${board.scrollHeight}`);
  }
  function path(a, b, cls) {
    const p = document.createElementNS(SVGNS, 'path');
    const dx = b.x - a.x, dy = b.y - a.y;
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const dist = Math.hypot(dx, dy);
    const bow = Math.min(dist * 0.18, 90);
    const nx = -dy / (dist || 1), ny = dx / (dist || 1);
    const cx = mx + nx * bow, cy = my + ny * bow;
    p.setAttribute('d', `M${a.x},${a.y} Q${cx},${cy} ${b.x},${b.y}`);
    p.setAttribute('class', cls);
    return p;
  }
  function dot(c, cls) {
    const e = document.createElementNS(SVGNS, 'circle');
    e.setAttribute('cx', c.x); e.setAttribute('cy', c.y); e.setAttribute('r', 3);
    e.setAttribute('class', cls); return e;
  }
  function clearArcs() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    Object.values(chipEl).forEach(c => c.classList.remove('hot', 'dim', 'src'));
  }

  function drawFor(id, opts) {
    clearArcs(); sizeSvg();
    const a = center(id); if (!a) return;
    Object.values(chipEl).forEach(c => c.classList.add('dim'));
    chipEl[id].classList.remove('dim'); chipEl[id].classList.add('src');
    const lit = new Set([id]);
    (adjOut[id] || []).forEach(e => { const b = center(e.t); if (b) { svg.appendChild(path(a, b, 'arc out')); lit.add(e.t); } });
    (adjIn[id] || []).forEach(e => { const b = center(e.s); if (b) { svg.appendChild(path(b, a, 'arc in')); lit.add(e.s); } });
    if (opts && opts.gaps) {
      (GAP_OUT[id] || []).forEach(g => { const b = center(g.t); if (b) { svg.appendChild(path(a, b, 'arc gap')); lit.add(g.t); } });
      (GAP_IN[id] || []).forEach(g => { const b = center(g.s); if (b) { svg.appendChild(path(b, a, 'arc gap')); lit.add(g.s); } });
    }
    lit.forEach(x => { if (chipEl[x]) { chipEl[x].classList.remove('dim'); chipEl[x].classList.add('hot'); } });
    chipEl[id].classList.remove('hot');
  }

  let pinned = null;
  function preview(id) { drawFor(id, { gaps: showGaps }); }
  function select(id) {
    pinned = id;
    drawFor(id, { gaps: showGaps });
    renderRail(id);
    rail.classList.add('open');
  }
  function deselect() { pinned = null; clearArcs(); rail.classList.remove('open'); }

  board.addEventListener('click', () => deselect());

  /* ---- gap-only global overlay ---- */
  function drawAllGaps() {
    clearArcs(); sizeSvg();
    const involved = new Set();
    GAPS.forEach(g => { const a = center(g.s), b = center(g.t); if (a && b) { svg.appendChild(path(a, b, 'arc gap faint')); involved.add(g.s); involved.add(g.t); } });
    Object.values(chipEl).forEach(c => c.classList.add('dim'));
    involved.forEach(x => { if (chipEl[x]) { chipEl[x].classList.remove('dim'); chipEl[x].classList.add('hot'); } });
  }

  /* ---- detail rail ---- */
  function chipRow(id, kind) {
    const m = META[id]; if (!m) return `<div class="rl-row"><span class="rl-dot" style="background:#8a97a1"></span>${id}</div>`;
    return `<button class="rl-row" data-go="${id}">
      <span class="rl-dot" style="background:${STATUS[m.status].c}"></span>
      <span class="rl-lbl">${m.label}</span>
      <span class="rl-grp">${m.group}</span></button>`;
  }
  function renderRail(id) {
    const m = META[id];
    const outs = (adjOut[id] || []).map(e => e.t);
    const ins = (adjIn[id] || []).map(e => e.s);
    const gOut = (GAP_OUT[id] || []).map(g => g.t);
    const gIn = (GAP_IN[id] || []).map(g => g.s);
    const uniq = a => [...new Set(a)];
    const st = STATUS[m.status];
    rail.innerHTML =
      `<div class="rl-top">
        <div class="rl-title"><span class="rl-dot lg" style="background:${st.c}"></span><div>
          <div class="rl-name">${m.label}</div>
          <div class="rl-sub">${m.group}</div></div></div>
        <button class="rl-x" aria-label="tutup">✕</button>
      </div>
      <div class="rl-badges">
        <span class="rl-badge" style="color:${st.c};border-color:${st.c}44;background:${st.c}11">${st.label}</span>
        <span class="rl-badge mono">${m.out} keluar</span>
        <span class="rl-badge mono">${m.inc} masuk</span>
        ${m.lineage ? '<span class="rl-badge ok">panel lineage ✓</span>' : ''}
      </div>
      ${outs.length ? `<div class="rl-sec"><div class="rl-h">Menaut ke <b>(${uniq(outs).length})</b></div>${uniq(outs).map(x=>chipRow(x)).join('')}</div>` : ''}
      ${ins.length ? `<div class="rl-sec"><div class="rl-h">Dirujuk oleh <b>(${uniq(ins).length})</b></div>${uniq(ins).map(x=>chipRow(x)).join('')}</div>` : ''}
      ${(gOut.length||gIn.length) ? `<div class="rl-sec gap"><div class="rl-h amber">Tautan baru · P1–P5 <b>(${uniq([...gOut,...gIn]).length})</b></div>${uniq([...gOut,...gIn]).map(x=>chipRow(x)).join('')}</div>` : ''}
      ${(!outs.length && !ins.length) ? `<div class="rl-empty">Modul ini <b>terisolasi</b> — tidak ada tautan kontekstual masuk maupun keluar.</div>` : ''}`;
    rail.querySelector('.rl-x').addEventListener('click', (e) => { e.stopPropagation(); deselect(); });
    rail.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); select(b.dataset.go); }));
  }

  /* ---- controls ---- */
  let showGaps = false;
  document.querySelectorAll('.flt').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.flt').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    const v = b.dataset.ws;
    board.dataset.filter = v;
    deselect();
  }));
  const gapBtn = document.getElementById('gapBtn');
  gapBtn.addEventListener('click', () => {
    showGaps = !showGaps;
    gapBtn.classList.toggle('on', showGaps);
    if (showGaps && !pinned) drawAllGaps();
    else if (pinned) drawFor(pinned, { gaps: showGaps });
    else clearArcs();
  });

  window.addEventListener('resize', () => { if (pinned) drawFor(pinned, { gaps: showGaps }); else if (showGaps) drawAllGaps(); });

  /* ---- summary numbers ---- */
  const counts = { hub: 0, connected: 0, sink: 0, island: 0 };
  Object.values(META).forEach(m => counts[m.status]++);
  document.getElementById('s-mod').textContent = Object.keys(META).length;
  document.getElementById('s-edge').textContent = DATA.edges.length;
  document.getElementById('s-gap').textContent = GAPS.length;
  ['hub','connected','sink','island'].forEach(k => { const el = document.getElementById('s-'+k); if (el) el.textContent = counts[k]; });
})();
