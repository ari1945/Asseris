/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAuth, useFirm } from './contexts';
import { I, MODULES } from './icons';
import { Avatar } from './ui';

/* ============================================================
   Asseris — Command Palette (⌘K) + Notifications + User menu
   ============================================================ */
const { useState: useStatePAL, useMemo: useMemoPAL, useEffect: useEffectPAL, useRef: useRefPAL } = React;

/* ---------------- Command Palette ---------------- */
function CommandPalette({ onClose, onNavigate }: any) {
  const { clients, engagements, setActiveEngagementId, canAccessEngagement } = useFirm();
  const [q, setQ] = useStatePAL('');
  const [sel, setSel] = useStatePAL(0);
  const inputRef = useRefPAL(null);

  useEffectPAL(() => { inputRef.current?.focus(); }, []);

  // build searchable index: modules, clients, engagements, accounts, standards
  const index = useMemoPAL(() => {
    const items: any[] = [];
    MODULES.forEach(g => g.items.forEach(m => items.push({ kind: 'Modul', group: g.group, label: m.label, icon: m.icon, action: () => onNavigate(m.id), hint: g.group })));
    clients.forEach((c: any) => items.push({ kind: 'Klien', label: c.name, icon: 'users', action: () => onNavigate('crm'), hint: c.id + ' · ' + c.industry }));
    // W7.5 — only offer engagements the user may access as quick-switch targets.
    engagements.filter((e: any) => canAccessEngagement(e.id)).forEach((e: any) => { const c = clients.find((x: any) => x.id === e.clientId); items.push({ kind: 'Engagement', label: e.id + ' · ' + (c?.name.replace('PT ', '') || ''), icon: 'briefcase', action: () => { setActiveEngagementId(e.id); onNavigate('engagement'); }, hint: e.fy + ' · ' + e.phase }); });
    (AMS.WTB || []).forEach(r => items.push({ kind: 'Akun', label: r.code + ' · ' + r.name, icon: 'table', action: () => onNavigate('wtb'), hint: 'Working Trial Balance' }));
    ((AMS as any).STAFF || []).forEach((s: any) => items.push({ kind: 'Staf', label: s.name, icon: 'users', action: () => onNavigate('hcm'), hint: s.role + ' · ' + s.cert }));
    ((AMS as any).INVOICES || []).forEach((v: any) => items.push({ kind: 'Faktur', label: v.id + ' · ' + v.client.replace('PT ', ''), icon: 'receipt', action: () => onNavigate('billing'), hint: v.status + ' · Rp ' + Math.round(v.amount / 1e6) + ' jt' }));
    ((AMS as any).FIRM_AP || []).forEach((v: any) => items.push({ kind: 'Vendor', label: v.vendor, icon: 'coins', action: () => onNavigate('apar'), hint: v.cat }));
    return items;
  }, [clients, engagements, canAccessEngagement]);

  const results = useMemoPAL(() => {
    if (!q.trim()) {
      // default: top modules + recent
      return index.filter((i: any) => i.kind === 'Modul').slice(0, 8);
    }
    const ql = q.toLowerCase();
    return index.filter((i: any) => i.label.toLowerCase().includes(ql) || (i.hint || '').toLowerCase().includes(ql)).slice(0, 14);
  }, [q, index]);

  useEffectPAL(() => { setSel(0); }, [q]);

  const onKey = (e: any) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s: any) => Math.min(s + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s: any) => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); results[sel]?.action(); }
  };

  const kindColor = { Modul: 'var(--blue)', Klien: 'var(--teal)', Engagement: 'var(--purple)', Akun: 'var(--amber)', Standar: 'var(--green)', Staf: 'var(--teal)', Faktur: 'var(--green)', Vendor: 'var(--amber)' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.4)', zIndex: 95, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '12vh' }} onClick={onClose}>
      <div className="panel" style={{ width: 600, maxWidth: '92vw', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }} onClick={(e: any) => e.stopPropagation()}>
        <div className="row ac gap8" style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
          <I.search2 size={18} style={{ color: 'var(--ink-3)' }} />
          <input ref={inputRef} value={q} onChange={(e: any) => setQ(e.target.value)} onKeyDown={onKey}
            placeholder="Cari modul, klien, engagement, akun…" style={{ flex: 1, border: 0, outline: 0, fontSize: 14, background: 'transparent', color: 'var(--ink)' }} />
          <kbd style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', border: '1px solid var(--line)', borderRadius: 3, padding: '1px 5px' }}>ESC</kbd>
        </div>
        <div style={{ maxHeight: 380, overflow: 'auto', padding: 6 }}>
          {results.length === 0 && <div className="muted tiny" style={{ padding: 24, textAlign: 'center' }}>Tidak ada hasil untuk "{q}"</div>}
          {results.map((r: any, i: any) => {
            const IconC = (I as any)[r.icon] || I.panel;
            return (
              <div key={i} onMouseEnter={() => setSel(i)} onClick={() => r.action()}
                style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', borderRadius: 7, cursor: 'pointer', background: i === sel ? 'var(--blue-050)' : 'transparent' }}>
                <span style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--surface-3)', color: (kindColor as any)[r.kind], display: 'grid', placeItems: 'center', flex: '0 0 30px' }}><IconC size={16} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }} className="truncate">{r.label}</div>
                  {r.hint && <div className="tiny muted truncate">{r.hint}</div>}
                </div>
                <span className="badge" style={{ background: 'transparent', color: (kindColor as any)[r.kind], border: '1px solid var(--line)' }}>{r.kind}</span>
                {i === sel && <I.arrowRight size={15} style={{ color: 'var(--ink-4)' }} />}
              </div>
            );
          })}
        </div>
        <div className="row ac gap12" style={{ padding: '8px 14px', borderTop: '1px solid var(--line)', background: 'var(--surface-2)' }}>
          <span className="tiny muted"><kbd style={{ fontFamily: 'var(--mono)' }}>↑↓</kbd> navigasi</span>
          <span className="tiny muted"><kbd style={{ fontFamily: 'var(--mono)' }}>↵</kbd> buka</span>
          <div style={{ flex: 1 }} />
          <span className="tiny muted">{results.length} hasil</span>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Notifications ---------------- */
const NOTIFS = [
  { id: 1, icon: 'alert', color: 'var(--red)', title: 'AJE-03 menunggu persetujuan partner', body: 'Pembalikan piutang fiktif Rp 1,85 M', when: '8 mnt lalu', route: 'aje', unread: true },
  { id: 2, icon: 'mail', color: 'var(--amber)', title: 'Konfirmasi piutang No Reply', body: 'CV Sumber Rejeki — 41 hari, perlu prosedur alternatif', when: '1 jam lalu', route: 'confirm', unread: true },
  { id: 3, icon: 'check', color: 'var(--green)', title: 'WP A-2 disetujui Hartono W.', body: 'Konfirmasi bank BCA telah di-review', when: '2 jam lalu', route: 'workpapers', unread: true },
  { id: 4, icon: 'flag', color: 'var(--blue)', title: 'Risiko Pendapatan dinaikkan ke Significant', body: 'RoMM R-01 · skor 20', when: '3 jam lalu', route: 'risk', unread: false },
  { id: 5, icon: 'clock', color: 'var(--amber)', title: 'Deadline EQR PT Graha 6 hari lagi', body: 'ENG-2025-063 · tanda tangan opini', when: 'Kemarin', route: 'opinion', unread: false },
];

function NotificationsPanel({ open, onClose, onNavigate, items, onMarkAll }: any) {
  if (!open) return null;
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 84 }} onClick={onClose} />
      <div className="dropmenu" style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, width: 360, padding: 0, zIndex: 85, maxHeight: 460, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="row ac jb" style={{ padding: '10px 13px', borderBottom: '1px solid var(--line)' }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>Notifikasi</span>
          <button className="btn sm ghost" onClick={onMarkAll}>Tandai dibaca</button>
        </div>
        <div style={{ overflow: 'auto' }}>
          {items.map((n: any) => {
            const IconC = (I as any)[n.icon] || I.bell;
            return (
              <div key={n.id} onClick={() => { onNavigate(n.route); onClose(); }} style={{ display: 'flex', gap: 10, padding: '11px 13px', borderBottom: '1px solid var(--line-soft)', cursor: 'pointer', background: n.unread ? 'var(--blue-050)' : '#fff' }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--surface-3)', color: n.color, display: 'grid', placeItems: 'center', flex: '0 0 30px' }}><IconC size={15} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.35 }}>{n.title}</div>
                  <div className="tiny muted" style={{ lineHeight: 1.35 }}>{n.body}</div>
                  <div className="tiny muted" style={{ marginTop: 2 }}>{n.when}</div>
                </div>
                {n.unread && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--blue)', flex: '0 0 7px', marginTop: 5 }} />}
              </div>
            );
          })}
        </div>
        <div style={{ padding: '8px 13px', borderTop: '1px solid var(--line)', background: 'var(--surface-2)', textAlign: 'center' }}>
          <span className="tiny" style={{ color: 'var(--blue)', cursor: 'pointer', fontWeight: 600 }}>Lihat semua aktivitas</span>
        </div>
      </div>
    </>
  );
}

/* ---------------- User menu ---------------- */
function UserMenu({ open, onClose, user, onNavigate }: any) {
  const auth = useAuth();
  if (!open) return null;
  const go = (id: any) => { onClose(); onNavigate && onNavigate(id); };
  const items = [
    { icon: 'users', label: 'Profil Saya', action: () => go('settings') },
    { icon: 'briefcase', label: 'Engagement Saya', action: () => go('cockpit') },
    { icon: 'shield', label: 'Konfirmasi Independensi', action: () => go('independence') },
    { icon: 'settings', label: 'Pengaturan', action: () => go('settings') },
    { sep: true },
    { icon: 'sync', label: 'Reset Data Demo', action: () => { window.clearPersisted && window.clearPersisted(); location.reload(); } },
    // W7 — real logout: revoke the session and return to the login screen.
    { icon: 'lock', label: 'Keluar', danger: true, action: () => auth.logout && auth.logout() },
  ];
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 84 }} onClick={onClose} />
      <div className="dropmenu" style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, width: 246, zIndex: 85 }}>
        <div style={{ padding: '10px 11px', borderBottom: '1px solid var(--line-soft)', display: 'flex', gap: 10, alignItems: 'center' }}>
          <Avatar name={user.name} size={36} photo={user.photo} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700 }} className="truncate">{user.name}</div>
            <div className="tiny muted truncate">{user.email}</div>
          </div>
        </div>
        <div style={{ padding: '8px 11px', borderBottom: '1px solid var(--line-soft)' }}>
          <div className="tiny muted upper" style={{ marginBottom: 5 }}>Peran Aktif (RBAC)</div>
          {/* W7 — role is set by the authenticated session (no act-as switching). */}
          <div className="row ac gap6"><span className="chip tiny" style={{ background: 'var(--blue-050)', color: 'var(--blue)' }}>{React.createElement(I.shield || I.panel, { size: 11 })} {auth.role}</span></div>
          <div className="tiny muted" style={{ marginTop: 4, lineHeight: 1.35 }}>Ditentukan oleh sesi login Anda; menentukan hak persetujuan & akses modul.</div>
        </div>
        {items.map((it, i) => it.sep
          ? <div key={i} className="sepm" />
          : <div key={i} className={'mi ' + (it.danger ? 'danger' : '')} onClick={() => { onClose(); it.action && it.action(); }}>
              {React.createElement((I as any)[it.icon] || I.panel, { size: 15 })}{it.label}
            </div>)}
      </div>
    </>
  );
}

Object.assign(window, { CommandPalette, NotificationsPanel, UserMenu, NOTIFS });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { CommandPalette, NOTIFS, NotificationsPanel, UserMenu };
