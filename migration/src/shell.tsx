/* [codemod] ESM imports */
import React from 'react';
import { useAuth, useFirm, useNav, useNavFrom } from './contexts';
import { EvidenceControl } from './evidence';
import { WpSubBarControl } from './wp_signoff';
import { GROUP_CAP, GROUP_WS, I, MODULES, MODULE_CAP, MODULE_INDEX, WORKSPACES, groupsVisibleFor } from './icons';
import { Avatar } from './ui';
import { NotificationsPanel, UserMenu } from './view_palette';

/* ============================================================
   Asseris — App shell: TopBar + Sidebar
   ============================================================ */

// Own per-file hook alias (golden-rule #1) — previously borrowed ui.jsx's
// useStateUI via global scope, which is invisible under ESM module scope.
const { useState: useStateSH } = React;

function TopBar({ onToggleSidebar, onOpenCopilot, onOpenPalette, onOpenMiniMap, onNavigate, route }: any) {
  const { user, firm } = useAuth();
  const { activeClient, activeEngagement, engagements, clients, setActiveEngagementId, canAccessEngagement } = useFirm();
  const [open, setOpen] = useStateSH(false);
  const [notifOpen, setNotifOpen] = useStateSH(false);
  const [userOpen, setUserOpen] = useStateSH(false);
  const [settingsOpen, setSettingsOpen] = useStateSH(false);
  const [notifs, setNotifs] = useStateSH(() => window.NOTIFS || []);
  const unread = notifs.filter((n: any) => n.unread).length;

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">A</div>
        <div className="brand-name">Asseris<small>AUDIT ENTERPRISE</small></div>
      </div>

      <div className="global-search" onClick={onOpenPalette} style={{ cursor: 'pointer' }}>
        <I.search2 size={15} />
        <input readOnly style={{ cursor: 'pointer' }} placeholder="Cari klien, engagement, WP, akun, atau standar (SA/PSAK)…" />
        <kbd>⌘K</kbd>
      </div>

      <div className="top-spacer" />

      <div style={{ position: 'relative' }}>
        <div className="top-ctx" onClick={() => setOpen((o: any) => !o)} style={{ cursor: 'pointer' }}>
          <div className="ctx-item">
            <span className="ctx-label">Klien Aktif</span>
            <span className="ctx-value">{activeClient?.name?.replace('PT ', '').slice(0, 22) || '—'}</span>
          </div>
          <div className="ctx-item">
            <span className="ctx-label">Engagement</span>
            <span className="ctx-value">{activeEngagement?.id} · {activeEngagement?.fy} <I.chevDown size={13} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '.15s' }} /></span>
          </div>
        </div>
        {open && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 79 }} onClick={() => setOpen(false)} />
            <div className="dropmenu" style={{ top: '100%', right: 0, marginTop: 6, width: 320, padding: 0, maxHeight: 440, overflow: 'auto' }}>
              <div style={{ padding: '9px 12px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <I.briefcase size={14} style={{ color: 'var(--blue)' }} />
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink-3)' }}>Ganti Engagement Aktif</span>
              </div>
              {/* W7.5 — only engagements the user may access are switchable here (loading a
                  forbidden one would 403 server-side). The firm-ops roster stays full elsewhere. */}
              {engagements.filter((e: any) => canAccessEngagement(e.id)).map((e: any) => {
                const c = clients.find((x: any) => x.id === e.clientId);
                const on = e.id === activeEngagement?.id;
                return (
                  <div key={e.id} onClick={() => { setActiveEngagementId(e.id); setOpen(false); }}
                       style={{ padding: '9px 12px', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center', borderBottom: '1px solid var(--line-soft)', background: on ? 'var(--blue-050)' : 'transparent' }}>
                    <span style={{ width: 30, height: 30, borderRadius: 7, background: on ? 'var(--blue)' : 'var(--navy)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, flex: '0 0 30px' }}>{c?.name.replace('PT ', '').slice(0, 2).toUpperCase()}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="truncate" style={{ fontWeight: 600, fontSize: 12.5 }}>{c?.name}</div>
                      <div className="tiny muted mono">{e.id} · {e.fy} · {e.phase}</div>
                    </div>
                    {on ? <span style={{ color: 'var(--blue)' }}><I.checkCircle size={16} /></span>
                        : <span className="badge" style={{ background: e.risk === 'High' ? 'var(--red-bg)' : e.risk === 'Medium' ? 'var(--amber-bg)' : 'var(--green-bg)', color: e.risk === 'High' ? 'var(--red)' : e.risk === 'Medium' ? 'var(--amber)' : 'var(--green)' }}>{e.risk}</span>}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <button className="top-btn" title="Peta mini keterhubungan — di mana saya sekarang (⌘M)" onClick={onOpenMiniMap}><I.group size={18} /></button>
      <button className="top-btn" title="AI Co-pilot" onClick={onOpenCopilot}><I.sparkle size={18} /></button>
      <div style={{ position: 'relative' }}>
        <button className="top-btn" title="Notifikasi" onClick={() => setNotifOpen((o: any) => !o)}><I.bell size={18} />{unread > 0 && <span className="dot" />}</button>
        <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} onNavigate={onNavigate} items={notifs} onMarkAll={() => setNotifs((ns: any) => ns.map((n: any) => ({ ...n, unread: false })))} />
      </div>
      <div style={{ position: 'relative' }}>
        <button className="top-btn" title="Tampilan" onClick={() => setSettingsOpen((o: any) => !o)}><I.settings size={18} /></button>
        <SettingsMenu open={settingsOpen} onClose={() => setSettingsOpen(false)} onNavigate={onNavigate} />
      </div>

      <div style={{ position: 'relative' }}>
        <div className="user-chip" onClick={() => setUserOpen((o: any) => !o)} style={{ cursor: 'pointer' }}>
          <Avatar name={user.name} size={24} photo={user.photo} />
          <div>
            <div className="u-name">{user.name.split(' ')[0]} {user.name.split(' ')[1]?.[0]}.</div>
            <div className="u-role">{user.role}</div>
          </div>
          <I.chevDown size={14} style={{ opacity: .6, transform: userOpen ? 'rotate(180deg)' : 'none', transition: '.15s' }} />
        </div>
        <UserMenu open={userOpen} onClose={() => setUserOpen(false)} user={user} onNavigate={onNavigate} />
      </div>
    </header>
  );
}

/* ---- Sidebar adaptif: peta fase audit (lihat Pengaturan › Navigasi & Sidebar) ---- */
const SIDE_GROUP_PHASE = { 'Core Planning': 'plan', 'Core Execution': 'exec', 'Core Specifics': 'spec', 'Finalisasi & Pelaporan': 'final' };
const SIDE_PHASE_RANK = { plan: 0, exec: 1, spec: 1, final: 2 };
const SIDE_ENG_PHASE = { 'Perencanaan': 'plan', 'Eksekusi': 'exec', 'Finalisasi': 'final', 'Arsip': 'final' };
const SIDE_RELEVANT = { plan: ['plan'], exec: ['exec', 'spec'], final: ['final'] };
const SIDE_PRIMARY_GROUP = { plan: 'Core Planning', exec: 'Core Execution', final: 'Finalisasi & Pelaporan' };
const SIDE_PHASE_LABEL = { plan: 'PERENCANAAN', exec: 'EKSEKUSI', final: 'FINALISASI' };
const SIDE_NAV_DEFAULTS = { adaptive: true, mode: 'sorot', source: 'auto', manualPhase: 'Eksekusi', focusGroup: true, resumeCard: true, resumeCount: 3, markDone: true };
function readSideNavPrefs() {
  try { const s = JSON.parse(localStorage.getItem('ams.v1.settings') || '{}'); return { ...SIDE_NAV_DEFAULTS, ...(s.nav || {}) }; }
  catch (e) { return { ...SIDE_NAV_DEFAULTS }; }
}
function readSideRecent() {
  try { const r = JSON.parse(localStorage.getItem('ams.recent') || '[]'); return Array.isArray(r) ? r : []; }
  catch (e) { return []; }
}

function Sidebar({ active, onNavigate, collapsed, onToggle }: any) {
  const [closedGroups, setClosedGroups] = useStateSH({});
  const toggleGroup = (g: any) => setClosedGroups((s: any) => ({ ...s, [g]: !s[g] }));
  const firmCtx = useFirm();
  const auth = useAuth();
  const role = (auth && auth.role) || '';
  /* P1 (Fase 6) — escape hatch "Tampilkan semua modul". Kurasi sidebar per peran hanya
     mengubah TAMPILAN default; toggle ini (persist per-browser) membuka semua grup lagi.
     Capability tak berubah — ini murni preferensi visual. */
  const [showAll, setShowAll] = useStateSH(() => { try { return localStorage.getItem('ams.sideShowAll') === '1'; } catch (e) { return false; } });
  React.useEffect(() => { try { localStorage.setItem('ams.sideShowAll', showAll ? '1' : '0'); } catch (e) {} }, [showAll]);
  const [ws, setWs] = useStateSH(() => {
    try { const s = localStorage.getItem('ams.ws'); if (s && WORKSPACES.some(w => w.id === s)) return s; } catch (e) {}
    return (window.wsForModule && window.wsForModule(active)) || 'engagement';
  });
  React.useEffect(() => { try { localStorage.setItem('ams.ws', ws); } catch (e) {} }, [ws]);
  /* follow navigation across workspaces (⌘K, cross-links) */
  React.useEffect(() => {
    const target = window.wsForModule ? window.wsForModule(active) : null;
    if (target && target !== ws) setWs(target);
  }, [active]);
  /* re-read prefs/recent when Pengaturan changes them or navigation happens */
  const [, bumpNav] = useStateSH(0);
  React.useEffect(() => {
    const bump = () => bumpNav((t: any) => t + 1);
    window.addEventListener('ams:navprefs', bump);
    window.addEventListener('ams:recent', bump);
    return () => { window.removeEventListener('ams:navprefs', bump); window.removeEventListener('ams:recent', bump); };
  }, []);

  const HIDDEN = window.HIDDEN_GROUPS || [];
  /* Kurasi per-peran (Fase 6): null = tanpa kurasi (oversight/unknown → semua grup).
     Grup modul yang SEDANG dibuka selalu ikut tampil (orientasi "di mana saya"), meski
     terkurasi keluar — mencegah bingung saat tiba lewat ⌘K/chip. */
  const curatedGroups = groupsVisibleFor(role, ws);
  const activeGroup = (MODULE_INDEX as Record<string, { group?: string }>)[active]?.group;
  const roleFilter = (!showAll && curatedGroups) ? curatedGroups : null;
  const groups = MODULES.filter(g => !HIDDEN.includes(g.group)
    && ((GROUP_WS as Record<string, string>)[g.group] || 'firm') === ws
    && (!roleFilter || roleFilter.includes(g.group) || g.group === activeGroup)
    // 2026-07-06 — grup ber-kapabilitas (GROUP_CAP, mis. People & Compliance → HR_MODULE_VIEW):
    // sembunyikan bila peran tak memegang cap (kecuali grup yang sedang aktif, utk orientasi).
    && (!(GROUP_CAP as Record<string, string>)[g.group] || g.group === activeGroup
        || !!(auth && typeof auth.can === 'function' && auth.can((GROUP_CAP as Record<string, string>)[g.group]))));
  /* 2026-07-05 — sembunyikan modul ber-kapabilitas (MODULE_CAP) yang tak dipegang peran ini
     (mis. recruitment/learning/succession → HR_MODULE_VIEW). Ini kurasi tampilan; gate sebenarnya
     ada di view (AccessDenied). Modul yang SEDANG aktif tetap tampil (orientasi), toh view-nya gating. */
  const canOpenModule = (id: string) => { const c = (MODULE_CAP as Record<string, string>)[id]; return !c || id === active || !!(auth && typeof auth.can === 'function' && auth.can(c)); };

  /* ---- adaptive computation (engagement workspace only, expanded only) ---- */
  const navPrefs = readSideNavPrefs();
  const adaptiveOn = navPrefs.adaptive && ws === 'engagement' && !collapsed;
  const engPhase = (firmCtx && firmCtx.activeEngagement) ? firmCtx.activeEngagement.phase : 'Perencanaan';
  const curKey = (navPrefs.source === 'manual') ? ((SIDE_ENG_PHASE as any)[navPrefs.manualPhase] || 'plan') : ((SIDE_ENG_PHASE as any)[engPhase] || 'plan');
  const curRank = (SIDE_PHASE_RANK as any)[curKey];
  const relevant = (SIDE_RELEVANT as any)[curKey] || [curKey];
  const phaseLabel = (SIDE_PHASE_LABEL as any)[curKey] || 'PERENCANAAN';
  const engProgress = (firmCtx && firmCtx.activeEngagement) ? firmCtx.activeEngagement.progress : null;
  const resumeItems = (adaptiveOn && navPrefs.resumeCard)
    ? readSideRecent().filter(id => { const g = ((MODULE_INDEX as any)[id] || {}).group; return g && (GROUP_WS as any)[g] === 'engagement' && ((MODULE_INDEX as any)[id] || {}).deep; }).slice(0, navPrefs.resumeCount).map(id => (MODULE_INDEX as any)[id]).filter(Boolean)
    : [];
  const focusObj = MODULES.find(g => g.group === (SIDE_PRIMARY_GROUP as any)[curKey]);
  const focusItems = (adaptiveOn && navPrefs.focusGroup && focusObj) ? focusObj.items : [];

  const homeOn = active === 'home';
  return (
    <nav className={'sidebar' + (collapsed ? ' collapsed' : '')}>
      {/* Beranda — dipin di atas toggle workspace (PRD Fase 5): titik masuk berbasis peran,
          1 klik, netral-workspace (tak memaksa pindah Perikatan/Firma). */}
      <div style={{ padding: collapsed ? '8px 6px 0' : '8px 8px 0' }}>
        <button type="button" onClick={() => onNavigate('home')} title="Beranda — ringkasan kerja Anda"
          style={{ width: '100%', display: 'flex', flexDirection: collapsed ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', gap: collapsed ? 0 : 8, padding: collapsed ? '8px 0' : '8px 10px', borderRadius: 7, cursor: 'pointer', border: 'none', transition: '.13s',
            background: homeOn ? 'var(--blue)' : 'rgba(255,255,255,.06)', color: homeOn ? '#fff' : 'var(--on-navy, #9fb3c0)', fontWeight: homeOn ? 700 : 600 }}>
          <I.dashboard size={16} />
          {!collapsed && <span style={{ fontSize: 12 }}>Beranda</span>}
        </button>
      </div>
      {/* workspace switcher */}
      <div className="ws-switch" style={{ padding: collapsed ? '8px 6px' : '8px', borderBottom: '1px solid var(--line)', display: 'flex', flexDirection: collapsed ? 'column' : 'row', gap: 4 }}>
        {WORKSPACES.map(w => {
          const IconW = (I as any)[w.icon] || I.panel;
          const on = ws === w.id;
          return (
            <button key={w.id} onClick={() => setWs(w.id)} title={w.label + ' — ' + w.desc}
              style={{ flex: collapsed ? 'none' : 1, display: 'flex', flexDirection: collapsed ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', gap: collapsed ? 0 : 6, padding: collapsed ? '8px 0' : '7px 6px', borderRadius: 7, cursor: 'pointer', border: 'none', transition: '.13s',
                background: on ? 'var(--blue)' : 'transparent', color: on ? '#fff' : 'var(--on-navy, #9fb3c0)' }}>
              <IconW size={16} />
              {!collapsed && <span style={{ fontSize: 11, fontWeight: on ? 700 : 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.label}</span>}
            </button>
          );
        })}
      </div>
      <div className="side-scroll">
        {!collapsed && curatedGroups && (
          <button type="button" onClick={() => setShowAll(!showAll)}
            title={showAll ? 'Sembunyikan lagi modul yang kurang relevan dengan peran Anda' : 'Tampilkan semua modul firma — kapabilitas tidak berubah, hanya tampilan'}
            style={{ margin: '8px 8px 4px', width: 'calc(100% - 16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', border: '1px dashed var(--line-strong)', background: showAll ? 'var(--blue-050)' : 'transparent', color: showAll ? 'var(--blue)' : 'var(--ink-3)', fontSize: 11, fontWeight: 600 }}>
            <I.layers size={12} /> {showAll ? 'Tampilkan yang relevan' : 'Tampilkan semua modul'}
          </button>
        )}
        {adaptiveOn && resumeItems.length > 0 && (
          <div className="side-resume">
            <div className="side-pin-h"><I.clock size={11} /><span>Lanjutkan</span><span className="gr"></span><span className="mu">terakhir dibuka</span></div>
            {resumeItems.map((m, i) => {
              const IconR = (I as any)[m.icon] || I.panel;
              return (
                <div key={m.id} className={'side-resume-item' + (i === 0 ? ' lead' : '')} onClick={() => onNavigate(m.id)}>
                  <span className="ic"><IconR size={14} /></span>
                  <span className="mn"><span className="l">{m.label}</span><span className="s">{m.group}</span></span>
                  <span className="ar"><I.arrowRight size={14} /></span>
                </div>
              );
            })}
          </div>
        )}

        {adaptiveOn && focusItems.length > 0 && (
          <div>
            <div className="side-focus-h"><span className="ft">Fokus Fase</span><span className="fb">{phaseLabel}</span>{engProgress != null && <span className="fp">{engProgress}%</span>}</div>
            <div className="side-focus">
              {focusItems.map(m => {
                const IconF = (I as any)[m.icon] || I.panel;
                return (
                  <div key={'f-' + m.id} className={'side-item' + (active === m.id ? ' active' : '')} onClick={() => onNavigate(m.id)}>
                    <span className="ico"><IconF size={16} /></span>
                    <span className="lbl">{m.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {adaptiveOn && (resumeItems.length > 0 || focusItems.length > 0) && (
          <div className="side-alltree-h">Semua Modul</div>
        )}

        {groups.map(group => {
          const gp = (SIDE_GROUP_PHASE as any)[group.group];
          if (adaptiveOn && navPrefs.mode === 'ringkas' && gp && !relevant.includes(gp)) return null;
          const isClosed = closedGroups[group.group];
          return (
            <div key={group.group} className={'side-group' + (isClosed ? ' closed' : '')}>
              {!collapsed && (
                <div className="side-group-h" onClick={() => toggleGroup(group.group)}>
                  <span>{group.group}</span>
                  <I.chevDown size={13} className="chev" />
                </div>
              )}
              {!isClosed && group.items.filter(m => canOpenModule(m.id)).map(m => {
                const IconC = (I as any)[m.icon] || I.panel;
                const isRelevant = adaptiveOn && gp && relevant.includes(gp);
                const isDone = adaptiveOn && navPrefs.markDone && gp && (SIDE_PHASE_RANK as any)[gp] < curRank;
                const isDim = adaptiveOn && navPrefs.mode === 'sorot' && gp && !relevant.includes(gp);
                let cls = 'side-item';
                if (active === m.id) cls += ' active';
                if (isRelevant) cls += ' relev';
                if (isDim) cls += ' dim';
                return (
                  <div key={m.id}
                       className={cls}
                       title={collapsed ? m.label : ''}
                       onClick={() => onNavigate(m.id)}>
                    <span className="ico"><IconC size={16} /></span>
                    <span className="lbl">{m.label}</span>
                    {isDone ? <span className="done"><I.check size={14} /></span>
                      : m.tag ? <span className="tag">{m.tag}</span>
                      : (!m.deep && !m.tag ? <span className="tag soon">soon</span> : null)}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <button type="button" className="side-minimap" onClick={() => window.__amsOpenMiniMap && window.__amsOpenMiniMap()}
        title="Peta mini keterhubungan — di mana saya sekarang (⌘M)">
        <span className="ic"><I.group size={16} /></span>
        {!collapsed && (
          <span className="mn">
            <span className="k">Anda di sini</span>
            <span className="l">{((MODULE_INDEX as any)[active] || {}).label || active}</span>
          </span>
        )}
        {!collapsed && <span className="ar"><I.arrowRight size={14} /></span>}
      </button>
      <div className="side-foot">
        <button className="side-collapse-btn" onClick={onToggle} title={collapsed ? 'Perluas' : 'Ciutkan'}>
          <I.chevron size={16} style={{ transform: collapsed ? 'none' : 'rotate(180deg)', transition: '.15s' }} />
        </button>
        {!collapsed && <span>v4.2 · Enterprise · <span style={{ color: '#4db8ff' }}>●</span> Online</span>}
      </div>
    </nav>
  );
}

/* Breadcrumb / view toolbar */
const FIRMWIDE_GROUPS = ['Firm Practice Management', 'Practice Operations', 'People & Compliance', 'Firm Finance (ERP)', 'Firm Platform', 'Jasa Non-Audit (SPAP)', 'Mutu, Risiko & Regulasi', 'Portal & Dokumen', 'Backoffice & Firm Mgmt', 'Knowledge'];
function SubBar({ moduleId, right }: any) {
  const m = (MODULE_INDEX as any)[moduleId] || { label: moduleId, group: '' };
  const firm = useFirm();
  const nav = useNav();
  const navFrom = useNavFrom();
  const fromMeta = navFrom && navFrom !== moduleId ? ((MODULE_INDEX as any)[navFrom] || { label: navFrom }) : null;
  const firmWide = FIRMWIDE_GROUPS.includes(m.group) || ['dashboard'].includes(moduleId);
  const scoped = !firmWide && m.group !== '';
  const saRefs = (window.RELATED_SA || {})[moduleId] || [];
  const ifrsAlias = (window.MODULE_IFRS || {})[moduleId];
  return (
    <div className="subbar">
      {fromMeta && (
        <button type="button" className="subbar-back" title={'Kembali ke ' + fromMeta.label}
          onClick={() => nav(navFrom)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 26, padding: '0 10px 0 7px', marginRight: 10, border: '1px solid var(--line-strong)', borderRadius: 7, background: 'var(--surface-2)', color: 'var(--ink-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
          onMouseEnter={(e: any) => { e.currentTarget.style.background = 'var(--blue-050)'; e.currentTarget.style.borderColor = 'var(--blue)'; e.currentTarget.style.color = 'var(--blue)'; }}
          onMouseLeave={(e: any) => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.borderColor = 'var(--line-strong)'; e.currentTarget.style.color = 'var(--ink-2)'; }}>
          <I.arrowLeft size={14} /> {fromMeta.label}
        </button>
      )}
      <div className="crumb">
        <span>{m.group}</span>
        <span className="sep"><I.chevron size={12} /></span>
        <b>{m.label}</b>
      </div>
      {ifrsAlias && (
        <span className="chip tiny" title={'Penomoran PSAK selaras-IFRS (efektif 2024) \u2014 dahulu ' + ifrsAlias.legacy}
          style={{ marginLeft: 10, fontFamily: 'var(--mono)', background: 'var(--surface-3)', color: 'var(--ink-2)' }}>
          ≡ {ifrsAlias.code} · {ifrsAlias.base}
        </span>
      )}
      {scoped && firm.activeEngagement && (
        <span className="chip tiny" title="Data modul ini terkait engagement aktif" style={{ marginLeft: 10, background: 'var(--blue-100)', color: 'var(--blue)' }}>
          <I.briefcase size={11} /> {firm.activeEngagement.id} · {firm.activeClient?.name?.replace('PT ', '').slice(0, 18)}
        </span>
      )}
      {firmWide && m.group !== '' && (
        <span className="chip tiny" title="Data tingkat firma (lintas engagement)" style={{ marginLeft: 10 }}>
          <I.building size={11} /> Firma-wide
        </span>
      )}
      {saRefs.length > 0 && (
        <span className="sa-rel" title="Standar Audit yang dipenuhi oleh prosedur ini">
          <span className="sa-rel-lbl"><I.shield size={11} /> Standar Terkait</span>
          {saRefs.map((r: any) => (
            <button key={r.code} type="button" className="sa-rel-chip"
              title={r.code + ' · ' + r.title + (r.view ? ' — buka rujukan' : ' — lihat di Matriks Kepatuhan')}
              onClick={() => window.__amsOpenSA && window.__amsOpenSA({ ...r, fromModule: moduleId })}>
              {r.code}
            </button>
          ))}
        </span>
      )}
      <div className="subbar-spacer" />
      {typeof WpSubBarControl !== 'undefined' && <WpSubBarControl moduleId={moduleId} />}
      {typeof EvidenceControl !== 'undefined' && <EvidenceControl moduleId={moduleId} />}
      {right}
    </div>
  );
}

/* Display settings: dark mode + density (persisted to localStorage + body class) */
function SettingsMenu({ open, onClose, onNavigate }: any) {
  const [dark, setDark] = useStateSH(() => localStorage.getItem('ams.dark') === '1');
  const [dense, setDense] = useStateSH(() => localStorage.getItem('ams.dense') === '1');
  React.useEffect(() => { document.body.classList.toggle('dark', dark); localStorage.setItem('ams.dark', dark ? '1' : '0'); }, [dark]);
  React.useEffect(() => { document.body.classList.toggle('dense', dense); localStorage.setItem('ams.dense', dense ? '1' : '0'); }, [dense]);
  if (!open) return null;
  const Row = ({ label, sub, on, set, icon }: any) => (
    <div className="row ac jb" style={{ padding: '10px 12px', borderBottom: '1px solid var(--line-soft)' }}>
      <span className="row ac gap8">{React.createElement((I as any)[icon], { size: 16, style: { color: 'var(--ink-3)' } })}<span><div style={{ fontSize: 12.5, fontWeight: 600 }}>{label}</div><div className="tiny muted">{sub}</div></span></span>
      <span onClick={() => set((v: any) => !v)} style={{ width: 38, height: 21, borderRadius: 11, background: on ? 'var(--blue)' : 'var(--line-strong)', position: 'relative', cursor: 'pointer', flex: '0 0 38px', transition: '.15s' }}><span style={{ position: 'absolute', top: 2, left: on ? 19 : 2, width: 17, height: 17, borderRadius: '50%', background: '#fff', transition: '.15s' }} /></span>
    </div>
  );
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 84 }} onClick={onClose} />
      <div className="dropmenu" style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, width: 260, padding: 0, zIndex: 85 }}>
        <div style={{ padding: '9px 12px', borderBottom: '1px solid var(--line)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink-3)' }}>Tampilan</div>
        <Row label="Mode Gelap" sub="Tema gelap antarmuka" on={dark} set={setDark} icon="settings" />
        <Row label="Kepadatan Tinggi" sub="Baris & padding lebih rapat" on={dense} set={setDense} icon="table" />
        <div className="mi" style={{ margin: 4 }} onClick={() => { onClose(); onNavigate && onNavigate('settings'); }}>
          <I.sliders size={15} /> Semua Pengaturan…
        </div>
      </div>
    </>
  );
}

Object.assign(window, { TopBar, Sidebar, SubBar, SettingsMenu });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SettingsMenu, Sidebar, SubBar, TopBar };
