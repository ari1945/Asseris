/* [codemod] ESM imports */
import React from 'react';
import { I } from './icons.jsx';
import { Badge, Btn } from './ui.jsx';

/* ============================================================
   NeoSuite AMS — Shared parts for Portal Klien & DMS
   PModal · PField · PTimeline · PThread · PVerRow · PSeg helpers
   ============================================================ */
const { useState: usePartsState, useEffect: usePartsEffect, useRef: usePartsRef } = React;

/* Centered modal overlay (Escape to close, click backdrop to close) */
function PModal({ title, sub, icon = 'doc', onClose, children, footer, width = 520 }) {
  usePartsEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const IconC = I[icon] || I.doc;
  return (
    <div className="pmodal-backdrop" onMouseDown={onClose}>
      <div className="pmodal" style={{ width: 'min(' + width + 'px, 94vw)' }} onMouseDown={e => e.stopPropagation()}>
        <div className="pmodal-h">
          <span className="pmodal-ico"><IconC size={17} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="pmodal-title">{title}</div>
            {sub && <div className="tiny muted" style={{ marginTop: 1 }}>{sub}</div>}
          </div>
          <button className="top-btn" onClick={onClose} style={{ width: 30, height: 30, color: 'var(--ink-3)' }}><I.x size={16} /></button>
        </div>
        <div className="pmodal-body">{children}</div>
        {footer && <div className="pmodal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/* Labeled form field */
function PField({ label, children, hint, span }) {
  return (
    <div className="field" style={span ? { gridColumn: '1 / -1' } : null}>
      <label>{label}</label>
      {children}
      {hint && <span className="tiny muted">{hint}</span>}
    </div>
  );
}

/* Right slide-in detail drawer (reuses sa-drawer animation) */
function PDrawer({ open, onClose, width = 560, children }) {
  usePartsEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  if (!open) return null;
  return (
    <>
      <div className="sa-drawer-backdrop" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(15,23,42,.34)' }} />
      <aside className="sa-drawer pdoc-drawer" style={{ width: 'min(' + width + 'px, 96vw)' }}>
        {children}
      </aside>
    </>
  );
}

/* Activity timeline — events: [type, actor, time, text] */
const PEVT = {
  request:  { ic: 'plus',     c: 'var(--blue)' },
  upload:   { ic: 'upload',   c: 'var(--green)' },
  receive:  { ic: 'download', c: 'var(--blue)' },
  review:   { ic: 'check',    c: 'var(--green)' },
  reminder: { ic: 'bell',     c: 'var(--amber)' },
  scan:     { ic: 'shield',   c: 'var(--green)' },
  edit:     { ic: 'sliders',  c: 'var(--blue)' },
  view:     { ic: 'search2',  c: 'var(--ink-4)' },
  download: { ic: 'download', c: 'var(--blue)' },
  lock:     { ic: 'lock',     c: 'var(--red)' },
  print:    { ic: 'doc',      c: 'var(--ink-4)' },
};
function PTimeline({ events }) {
  if (!events || !events.length) return <div className="tiny muted" style={{ padding: '8px 2px' }}>Belum ada aktivitas.</div>;
  return (
    <div className="ptl">
      {events.map((e, i) => {
        const meta = PEVT[e[0]] || { ic: 'circle', c: 'var(--ink-4)' };
        const IconC = I[meta.ic] || I.circle;
        return (
          <div key={i} className="ptl-row">
            <div className="ptl-mark" style={{ color: meta.c, borderColor: meta.c }}><IconC size={11} /></div>
            <div className="ptl-body">
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{e[3]}</div>
              <div className="tiny muted">{e[1]} · <span className="mono">{e[2]}</span></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* Version history list — versions: [{ver, file, by, side, date, sizeMB, note}] */
function PVerList({ versions, fileFallback, onCompare, compareSel = [] }) {
  if (!versions || !versions.length) return <div className="tiny muted" style={{ padding: '8px 2px' }}>Belum ada berkas diunggah.</div>;
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {[...versions].reverse().map((v) => {
        const latest = v.ver === versions[versions.length - 1].ver;
        const picked = compareSel.includes(v.ver);
        return (
          <div key={v.ver} className={'pverrow' + (picked ? ' on' : '')}>
            <div className="pverrow-v">v{v.ver}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="row ac gap6">
                <span className="mono tiny truncate" style={{ fontWeight: 600, maxWidth: 200 }}>{v.file || fileFallback}</span>
                {latest && <Badge kind="green">Terbaru</Badge>}
              </div>
              {v.note && <div className="tiny muted" style={{ marginTop: 2, lineHeight: 1.45 }}>{v.note}</div>}
              <div className="tiny muted" style={{ marginTop: 2 }}>{v.by} · <span className="mono">{new Date(v.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })}</span> · {v.sizeMB} MB{v.scan === 'clean' && <span title="Terenkripsi AES-256 · dipindai bersih · checksum SHA-256 terverifikasi" style={{ color: 'var(--green)', display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 6, fontWeight: 600 }}><I.lock size={10} /> aman</span>}</div>
            </div>
            <div className="row gap4 ac" style={{ flex: '0 0 auto' }}>
              {onCompare && <button className={'pchk' + (picked ? ' on' : '')} title="Pilih untuk dibandingkan" onClick={() => onCompare(v.ver)}>{picked ? <I.check size={11} /> : null}</button>}
              <button className="btn sm icon" title="Unduh" style={{ height: 24, width: 24 }}><I.download size={12} /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* Threaded comments + composer. msgs: [{by, side, text, time}] */
function PThread({ msgs, onSend, placeholder = 'Tulis komentar…', selfSide = 'firm', height = 240, compact }) {
  const [draft, setDraft] = usePartsState('');
  const boxRef = usePartsRef(null);
  usePartsEffect(() => { if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight; }, [msgs && msgs.length]);
  const send = () => { if (!draft.trim()) return; onSend(draft.trim()); setDraft(''); };
  return (
    <div className="pthread">
      <div className="pthread-msgs" ref={boxRef} style={{ maxHeight: height }}>
        {(!msgs || !msgs.length) && <div className="tiny muted" style={{ textAlign: 'center', padding: 16 }}>Belum ada komentar pada item ini.</div>}
        {(msgs || []).map((m, i) => {
          const self = m.side === selfSide;
          return (
            <div key={i} style={{ alignSelf: self ? 'flex-end' : 'flex-start', maxWidth: '88%' }}>
              <div className={'pbubble ' + (self ? 'self' : 'other')}>{m.text}</div>
              <div className="tiny muted" style={{ marginTop: 2, textAlign: self ? 'right' : 'left' }}>{m.by} · {m.time}</div>
            </div>
          );
        })}
      </div>
      <div className="pthread-input">
        <input className="input" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder={placeholder} style={{ flex: 1, height: compact ? 30 : 32 }} />
        <Btn sm variant="primary" onClick={send}><I.send size={13} /></Btn>
      </div>
    </div>
  );
}

/* nowtime helper for new messages */
function pNowTime() {
  const d = new Date();
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

Object.assign(window, { PModal, PField, PDrawer, PTimeline, PVerList, PThread, pNowTime, PEVT });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { PDrawer, PEVT, PField, PModal, PThread, PTimeline, PVerList, pNowTime };
