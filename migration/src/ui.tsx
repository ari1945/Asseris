/* [codemod] ESM imports */
import React from 'react';
import { I, MODULE_INDEX } from './icons';

/* ============================================================
   Asseris — Shared UI primitives
   ============================================================ */
const { useState: useStateUI } = React;

/* Badge with semantic color from a status string */
const STATUS_MAP = {
  Active: 'b-green', Completed: 'b-green', Posted: 'b-green', Reviewed: 'b-green', Approved: 'b-green', Low: 'b-green',
  Fieldwork: 'b-blue', 'In Review': 'b-blue', Planning: 'b-purple', Review: 'b-purple',
  Proposal: 'b-amber', Proposed: 'b-amber', 'In Progress': 'b-amber', Medium: 'b-amber', Moderate: 'b-amber',
  High: 'b-red', Significant: 'b-red', Overdue: 'b-red',
  Archive: 'b-gray', Arsip: 'b-gray',
};
function Badge({ children, kind, dot }: any) {
  const cls = kind ? ('b-' + kind) : ((STATUS_MAP as any)[children] || 'b-gray');
  return <span className={'badge ' + cls}>{dot && <span className="bdot" style={{ background: 'currentColor' }} />}{children}</span>;
}

function Btn({ children, variant = '', sm, icon, className = '', ...rest }: any) {
  return (
    <button className={`btn ${variant} ${sm ? 'sm' : ''} ${icon ? 'icon' : ''} ${className}`} {...rest}>
      {children}
    </button>
  );
}

/* Portlet shell (drag handled by parent grid) */
function Portlet({ title, dot, actions, children, bodyPad = true, dragProps = {}, className = '', flat }: any) {
  const [collapsed, setCollapsed] = useStateUI(false);
  const { gripProps = {}, className: dragCls = '', ...rootDrag } = dragProps;
  return (
    <div className={`portlet ${className} ${dragCls}`} {...rootDrag}>
      <div className="portlet-h">
        <span className="grip" {...gripProps}><I.grip size={15} /></span>
        <span className="portlet-title">
          {dot && <span className="dotmark" style={{ background: dot }} />}
          {title}
        </span>
        {actions}
        <button className="p-act" title="Collapse" onClick={() => setCollapsed((c: any) => !c)}>
          <I.chevDown size={15} style={{ transform: collapsed ? 'rotate(-90deg)' : 'none', transition: '.15s' }} />
        </button>
        <button className="p-act" title="Menu"><I.dots size={15} /></button>
      </div>
      {!collapsed && <div className={'portlet-body' + (bodyPad ? ' pad' : '')}>{children}</div>}
    </div>
  );
}

function Panel({ title, sub, actions, children, className = '', noBody }: any) {
  return (
    <div className={'panel ' + className}>
      {(title || actions) && (
        <div className="panel-h">
          {title && <h3>{title}</h3>}
          {sub && <span className="sub">{sub}</span>}
          <div style={{ flex: 1 }} />
          {actions}
        </div>
      )}
      {noBody ? children : <div>{children}</div>}
    </div>
  );
}

function Stat({ value, label, delta, deltaDir, accent }: any) {
  return (
    <div className="stat">
      <div className="s-val" style={accent ? { color: accent } : null}>{value}</div>
      <div className="s-lbl">{label}</div>
      {delta != null && (
        <div className={'s-delta ' + (deltaDir === 'up' ? 's-up' : deltaDir === 'down' ? 's-down' : 'muted')}>
          {deltaDir === 'up' ? '▲' : deltaDir === 'down' ? '▼' : ''} {delta}
        </div>
      )}
    </div>
  );
}

function Progress({ value, color }: any) {
  return <div className="pbar"><span style={{ width: Math.min(100, value) + '%', background: color || undefined }} /></div>;
}

function Avatar({ name, size = 26, photo }: any) {
  const initials = (name || '').split(' ').filter(Boolean).slice(0, 2).map((w: any) => w[0]).join('').toUpperCase();
  if (photo) {
    return <span className="avatar" title={name} style={{ width: size, height: size, backgroundImage: 'url(' + photo + ')', backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' }} />;
  }
  return <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.4 }}>{initials}</span>;
}

function Tabs({ tabs, active, onChange }: any) {
  return (
    <div className="tabs">
      {tabs.map((t: any) => (
        <button key={t.id} className={'tab ' + (active === t.id ? 'on' : '')} onClick={() => onChange(t.id)}>
          {t.label}{t.count != null && <span className="muted" style={{ marginLeft: 6, fontWeight: 500 }}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

function Seg({ options, value, onChange }: any) {
  return (
    <div className="seg">
      {options.map((o: any) => (
        <button key={o.value ?? o} className={value === (o.value ?? o) ? 'on' : ''} onClick={() => onChange(o.value ?? o)}>
          {o.label ?? o}
        </button>
      ))}
    </div>
  );
}

/* Placeholder block (striped) */
function Placeholder({ label, height = 120, style }: any) {
  return <div className="placeholder" style={{ height, ...style }}>{label}</div>;
}

/* Simple SVG sparkline / bar mini chart */
function Spark({ data, width = 120, height = 34, color = '#005085', fill = true }: any) {
  const max = Math.max(...data), min = Math.min(...data);
  const rng = max - min || 1;
  const pts = data.map((d: any, i: any) => [(i / (data.length - 1)) * width, height - ((d - min) / rng) * (height - 6) - 3]);
  const line = pts.map((p: any, i: any) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = line + ` L${width} ${height} L0 ${height} Z`;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {fill && <path d={area} fill={color} opacity=".10" />}
      <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.5" fill={color} />
    </svg>
  );
}

function MiniBars({ data, width = 130, height = 38, color = '#005085' }: any) {
  const max = Math.max(...data) || 1;
  const bw = width / data.length;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {data.map((d: any, i: any) => {
        const h = (d / max) * (height - 4);
        return <rect key={i} x={i * bw + 1.5} y={height - h} width={bw - 3} height={h} rx="1.5"
                     fill={color} opacity={i === data.length - 1 ? 1 : 0.42} />;
      })}
    </svg>
  );
}

/* Donut */
function Donut({ segments, size = 92, thickness = 13, center }: any) {
  const total = segments.reduce((s: any, x: any) => s + x.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e7ebef" strokeWidth={thickness} />
        {segments.map((s: any, i: any) => {
          const len = (s.value / total) * c;
          const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={s.color} strokeWidth={thickness} strokeDasharray={`${len} ${c - len}`}
            strokeDashoffset={-offset} strokeLinecap="butt" />;
          offset += len;
          return el;
        })}
      </svg>
      {center && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', flexDirection: 'column' }}>{center}</div>}
    </div>
  );
}

/* Lightweight dropdown menu */
function Menu({ trigger, items, align = 'left' }: any) {
  const [open, setOpen] = useStateUI(false);
  return (
    <div style={{ position: 'relative' }}>
      <span onClick={() => setOpen((o: any) => !o)}>{trigger}</span>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 79 }} onClick={() => setOpen(false)} />
          <div className="dropmenu" style={{ top: '100%', marginTop: 4, [align]: 0 }}>
            {items.map((it: any, i: any) => it.sep
              ? <div key={i} className="sepm" />
              : <div key={i} className={'mi ' + (it.danger ? 'danger' : '')} onClick={() => { setOpen(false); it.onClick && it.onClick(); }}>
                  {it.icon}{it.label}
                </div>)}
          </div>
        </>
      )}
    </div>
  );
}

/* Lock banner for archived engagements (read-only) */
function LockBanner() {
  return (
    <div className="panel" style={{ margin: '0 0 12px', padding: '10px 14px', background: 'var(--amber-bg)', borderColor: 'transparent', display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ color: 'var(--amber)' }}><I.lock size={16} /></span>
      <span style={{ fontSize: 12.5, fontWeight: 600 }}>Engagement diarsipkan — kertas kerja terkunci (read-only) sesuai ISQM. Buka kembali fase untuk mengubah.</span>
    </div>
  );
}

/* Modul terkunci untuk peran yang tak berkepentingan (gate BACA berbasis kapabilitas —
   mis. HR_MODULE_VIEW pada Rekrutmen/Pelatihan/Suksesi). Dirender MENGGANTIKAN isi view
   (bukan overlay) sehingga datanya tak pernah tersusun/tertampil. */
function AccessDenied({ moduleId, note }: any) {
  const m = (MODULE_INDEX as any)[moduleId] || { label: moduleId };
  return (
    <div className="view-scroll"><div className="view-pad">
      <div className="panel" style={{ maxWidth: 560, margin: '40px auto', padding: 30, textAlign: 'center' }}>
        <div style={{ color: 'var(--amber)', marginBottom: 12 }}><I.lock size={30} /></div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Akses terbatas — {m.label}</div>
        <div className="tiny muted" style={{ lineHeight: 1.6 }}>{note || 'Modul manajemen SDM ini hanya dapat diakses oleh Partner dan Admin & HR Firma. Data personal milik Anda tersedia di modul '}{!note && <b>Data Personal Saya</b>}{!note && '.'}</div>
      </div>
    </div></div>
  );
}

/* Empty/coming-soon stub for un-built modules */
function StubView({ moduleId }: any) {
  const m = (MODULE_INDEX as any)[moduleId] || { label: moduleId, icon: 'panel', group: '' };
  const IconC = (I as any)[m.icon] || I.panel;
  const blueprints = {
    materiality: ['Overall Materiality', 'Performance Materiality', 'Clearly Trivial Threshold', 'Benchmark Selection'],
    sampling: ['Population Definition', 'Sample Size Calculator', 'Selection Method', 'Evaluation of Results'],
  };
  const fields = (blueprints as any)[moduleId];
  return (
    <div className="view-pad" style={{ minHeight: '100%' }}>
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(120deg,#013a52,#005085)', color: '#fff', padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,.14)', display: 'grid', placeItems: 'center' }}>
            <IconC size={26} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{m.label}</div>
            <div style={{ fontSize: 12, color: '#bcd6e4' }}>{m.group}</div>
          </div>
          <div style={{ flex: 1 }} />
          <Badge kind="amber">Module Scaffolded</Badge>
        </div>
        <div style={{ padding: 22 }}>
          <p style={{ margin: '0 0 16px', color: 'var(--ink-2)', fontSize: 13, maxWidth: 620, lineHeight: 1.6 }}>
            Modul <b>{m.label}</b> sudah terhubung ke navigasi, konteks engagement aktif, dan AI Co-pilot. Layout
            kerja terstruktur untuk modul ini sedang dalam antrean build. Berikut kerangka komponen yang direncanakan:
          </p>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', marginBottom: 18 }}>
            {(fields || ['Header & Konteks', 'Tabel Kertas Kerja', 'Panel Prosedur', 'Ringkasan & Kesimpulan']).map((f: any, i: any) => (
              <div key={i} className="panel" style={{ padding: 0 }}>
                <div style={{ padding: '8px 11px', fontSize: 11, fontWeight: 700, color: 'var(--navy)', borderBottom: '1px solid var(--line)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{f}</div>
                <Placeholder label="komponen kerja" height={90} style={{ border: 0, borderRadius: 0 }} />
              </div>
            ))}
          </div>
          <div className="row gap8">
            <Btn variant="primary"><I.sparkle size={15} /> Generate dengan AI Co-pilot</Btn>
            <Btn><I.book size={15} /> Buka panduan {m.label}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  Badge, Btn, Portlet, Panel, Stat, Progress, Avatar, Tabs, Seg,
  Placeholder, Spark, MiniBars, Donut, Menu, StubView, LockBanner, AccessDenied,
});

/* Print the currently-visible document paper (.doc-paper) to PDF */window.amsPrintDoc = function () {
  const el = document.querySelector('.main-col .doc-paper');
  if (!el) { window.print(); return; }
  el.id = 'print-area';
  document.body.classList.add('printing');
  const cleanup = () => { el.removeAttribute('id'); document.body.classList.remove('printing'); window.removeEventListener('afterprint', cleanup); };
  window.addEventListener('afterprint', cleanup);
  setTimeout(() => { window.print(); }, 80);
};


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { AccessDenied, Avatar, Badge, Btn, Donut, LockBanner, Menu, MiniBars, Panel, Placeholder, Portlet, Progress, Seg, Spark, Stat, StubView, Tabs };
export const amsPrintDoc = window.amsPrintDoc;
