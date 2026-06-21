/* [codemod] ESM imports */
import React from 'react';
import { I } from './icons';

/* ============================================================
   Asseris — Firm Practice Management · shared parts
   Module sub-navigation + analytics chart helpers reused by the
   deepened FPM modules (Dashboard, BI, CRM, Engagement, Risk,
   Onboarding, Data Flow).
   ============================================================ */
const { useState: useFPM } = React;

/* In-view sub-application tab strip (sits under the SubBar). */
function MSub({ tabs, active, onChange, right }: any) {
  return (
    <div className="msub">
      {tabs.map(t => (
        <button key={t.id} className={'msub-tab ' + (active === t.id ? 'on' : '')} onClick={() => onChange(t.id)}>
          {t.icon && React.createElement(I[t.icon] || I.panel, { size: 14 })}
          {t.label}
          {t.count != null && <span className="mscount">{t.count}</span>}
        </button>
      ))}
      {right && <><div style={{ flex: 1 }} />{right}</>}
    </div>
  );
}

/* Small labelled key/value box (KvBox is not globally exported). */
function KV({ label, v, accent, sub }: any) {
  return (
    <div className="panel" style={{ padding: '8px 11px', boxShadow: 'none' }}>
      <div className="tiny muted upper" style={{ marginBottom: 3, letterSpacing: '.04em' }}>{label}</div>
      <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: accent || 'var(--ink)' }}>{v}</div>
      {sub && <div className="tiny muted" style={{ marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

/* Section label inside a panel body. */
function SectionTitle({ children, right }: any) {
  return (
    <div className="row ac jb" style={{ margin: '2px 0 9px' }}>
      <span className="tiny muted upper" style={{ letterSpacing: '.06em', fontWeight: 700 }}>{children}</span>
      {right}
    </div>
  );
}

/* Horizontal bar list. rows: [{label, value, pct, color, sub, right}] */
function HBars({ rows, max, fmtVal }: any) {
  const m = max || Math.max(...rows.map(r => r.value), 1);
  return (
    <div style={{ display: 'grid', gap: 9 }}>
      {rows.map((r, i) => (
        <div key={i} className="hbar-row">
          <div className="row jb ac" style={{ gap: 8 }}>
            <span className="truncate" style={{ fontSize: 12, fontWeight: 600 }}>{r.label}</span>
            <span className="mono tiny" style={{ fontWeight: 700, whiteSpace: 'nowrap', color: r.color || 'var(--ink)' }}>{r.right || (fmtVal ? fmtVal(r.value) : r.value)}</span>
          </div>
          <div className="hbar-track"><span style={{ width: Math.max(2, (r.pct != null ? r.pct : r.value / m * 100)) + '%', background: r.color || 'var(--blue)' }} /></div>
          {r.sub && <div className="tiny muted">{r.sub}</div>}
        </div>
      ))}
    </div>
  );
}

/* Vertical funnel. stages: [{label, value, color, n}] */
function Funnel({ stages }: any) {
  const max = Math.max(...stages.map(s => s.value), 1);
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {stages.map((s, i) => {
        const w = Math.max(14, s.value / max * 100);
        const prev = i > 0 ? stages[i - 1].value : s.value;
        const conv = prev ? Math.round(s.value / prev * 100) : 100;
        return (
          <div key={i} className="row ac gap10">
            <div style={{ width: 110, textAlign: 'right', flex: '0 0 110px' }}>
              <div style={{ fontSize: 11.5, fontWeight: 600 }} className="truncate">{s.label}</div>
              {s.n != null && <div className="tiny muted">{s.n} item</div>}
            </div>
            <div style={{ flex: 1, height: 26, background: 'var(--surface-3)', borderRadius: 5, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, width: w + '%', background: s.color, borderRadius: 5, display: 'flex', alignItems: 'center', paddingLeft: 9 }}>
                <span className="mono" style={{ fontSize: 11.5, fontWeight: 700, color: '#fff' }}>{s.disp}</span>
              </div>
            </div>
            {i > 0 && <span className="tiny muted mono" style={{ width: 38, flex: '0 0 38px' }}>{conv}%</span>}
            {i === 0 && <span style={{ width: 38, flex: '0 0 38px' }} />}
          </div>
        );
      })}
    </div>
  );
}

/* Semicircle gauge. */
function FGauge({ value, max = 100, label, color = 'var(--blue)', size = 116, suffix = '' }: any) {
  const pct = Math.max(0, Math.min(1, value / max));
  const r = size / 2 - 9;
  const circ = Math.PI * r;
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={size} height={size / 2 + 8} style={{ display: 'block', margin: '0 auto' }}>
        <path d={`M 9 ${size / 2} A ${r} ${r} 0 0 1 ${size - 9} ${size / 2}`} fill="none" stroke="var(--surface-3)" strokeWidth="9" strokeLinecap="round" />
        <path d={`M 9 ${size / 2} A ${r} ${r} 0 0 1 ${size - 9} ${size / 2}`} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${pct * circ} ${circ}`} />
      </svg>
      <div className="mono" style={{ fontSize: 19, fontWeight: 800, color, marginTop: -10 }}>{value}{suffix}</div>
      {label && <div className="tiny muted">{label}</div>}
    </div>
  );
}

/* Multi-series line chart with light axis + grid. series: [{name,color,data[]}] */
function LineChart({ series, labels, height = 170, yMax, yFmt, unit = '' }: any) {
  const W = 100, H = 100;
  const max = yMax || Math.max(...series.flatMap(s => s.data)) * 1.12 || 1;
  const n = labels.length;
  const x = i => n <= 1 ? 0 : (i / (n - 1)) * W;
  const y = v => H - (v / max) * H;
  return (
    <div>
      <div style={{ position: 'relative', height }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          {[0, 0.25, 0.5, 0.75, 1].map(g => (
            <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} stroke="var(--line-soft)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
          ))}
          {series.map((s, si) => (
            <g key={si}>
              {s.fill && <polygon fill={s.color} opacity="0.08" points={`0,${H} ` + s.data.map((v, i) => `${x(i)},${y(v)}`).join(' ') + ` ${W},${H}`} />}
              <polyline fill="none" stroke={s.color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round"
                points={s.data.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
            </g>
          ))}
        </svg>
        {/* end-point dots via absolute overlay */}
        {series.map((s, si) => {
          const last = s.data.length - 1;
          return <span key={si} style={{ position: 'absolute', left: 'calc(' + x(last) + '% - 3px)', top: 'calc(' + y(s.data[last]) + '% - 3px)', width: 6, height: 6, borderRadius: '50%', background: s.color, boxShadow: '0 0 0 2px var(--surface)' }} />;
        })}
      </div>
      <div className="row jb tiny muted" style={{ marginTop: 5 }}>
        {labels.map((l, i) => (i === 0 || i === labels.length - 1 || (labels.length <= 8) || i % Math.ceil(labels.length / 6) === 0)
          ? <span key={i} style={{ fontSize: 9.5 }}>{l}</span> : <span key={i} />)}
      </div>
      {series.length > 1 && (
        <div className="row gap12 ac" style={{ marginTop: 6, flexWrap: 'wrap' }}>
          {series.map((s, i) => (
            <span key={i} className="row ac gap6 tiny" style={{ fontWeight: 600 }}>
              <span style={{ width: 10, height: 3, borderRadius: 2, background: s.color }} />{s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* Small pill for trends / deltas. */
function Delta({ v, suffix = '%', invert }: any) {
  const up = v >= 0;
  const good = invert ? !up : up;
  return <span className="mono tiny" style={{ fontWeight: 700, color: good ? 'var(--green)' : 'var(--red)' }}>{up ? '▲' : '▼'} {Math.abs(v)}{suffix}</span>;
}

/* Horizontal stacked bar (composition). parts: [{value,color,label}] */
function StackBar({ parts, height = 9 }: any) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <div style={{ display: 'flex', height, borderRadius: 5, overflow: 'hidden', background: 'var(--surface-3)' }}>
      {parts.map((p, i) => <div key={i} title={p.label} style={{ width: (p.value / total * 100) + '%', background: p.color }} />)}
    </div>
  );
}

Object.assign(window, { MSub, KV, SectionTitle, HBars, Funnel, FGauge, LineChart, Delta, StackBar });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { Delta, FGauge, Funnel, HBars, KV, LineChart, MSub, SectionTitle, StackBar };
