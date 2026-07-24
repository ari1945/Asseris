/* [codemod] ESM imports */
import React from 'react';
import { useAuth, useFirm, useNav, useNavFrom } from './contexts';
import { EvidenceControl } from './evidence';
import { WpSubBarControl } from './wp_signoff';
import { GROUP_CAP, GROUP_WS, HIDDEN_GROUPS, I, MODULES, MODULE_CAP, MODULE_INDEX, NEW_ALLOW, WORKSPACES, groupsVisibleFor } from './icons';
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
const SIDE_GROUP_PHASE = { '1 · Perencanaan': 'plan', '2 · Pelaksanaan': 'exec', 'Area Khusus & Estimasi': 'spec', '3 · Penyelesaian & Pelaporan': 'final' };
const SIDE_PHASE_RANK = { plan: 0, exec: 1, spec: 1, final: 2 };
const SIDE_ENG_PHASE = { 'Perencanaan': 'plan', 'Eksekusi': 'exec', 'Finalisasi': 'final', 'Arsip': 'final' };
const SIDE_RELEVANT = { plan: ['plan'], exec: ['exec', 'spec'], final: ['final'] };
const SIDE_PRIMARY_GROUP = { plan: '1 · Perencanaan', exec: '2 · Pelaksanaan', final: '3 · Penyelesaian & Pelaporan' };
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

/* R2 (PRD learning-curve) — indeks pencarian sidebar: SELURUH modul lintas kedua workspace,
   TERMASUK grup tersembunyi (HIDDEN_GROUPS: 27 PSAK + halaman SA mendalam). Menutup tebing
   discoverability — dulu 34% app hanya terjangkau via recall (⌘K/Matriks). `ws` menautkan tiap
   hasil ke workspace-nya (null = grup tersembunyi, tak memaksa pindah). Statis → dihitung sekali. */
type SideSearchRow = { id: string; label: string; icon: string; group: string; tag?: string; hidden: boolean; ws: string | null; syn: string };
type SideSearchGroup = { group: string; items: Array<{ id: string; label: string; icon: string; tag?: string }> };
/* R-lang (PRD Fase 3, keputusan Q1) — sinonim/kata-kunci Indonesia per modul. Filter jadi
   TAHAN-BAHASA: modul berlabel Inggris/jargon KAP ("Confirmation Hub", "Going Concern",
   "Working Papers") tetap ketemu dgn istilah Indonesia yang diketik auditor ("konfirmasi",
   "kelangsungan usaha", "kertas kerja") — menutup gap yang terukur di uji Fase 2. Aditif;
   tak mengubah label tampil (rename label = bagian 3b). */
const SIDE_SYNONYMS: Record<string, string> = {
  confirm: 'konfirmasi saldo sirkularisasi pihak ketiga', goingconcern: 'kelangsungan usaha kesangsian going concern',
  workpapers: 'kertas kerja audit wp', reviewnotes: 'catatan reviu telaah', cockpit: 'kokpit ringkasan perikatan dasbor',
  tasks: 'tugas saya pekerjaan', programme: 'program audit prosedur', time: 'waktu anggaran jam realisasi budget',
  strategy: 'strategi memo perencanaan', icfr: 'pengendalian internal spi', analytical: 'prosedur analitis analisa',
  jet: 'pengujian jurnal je testing', diagnostic: 'diagnostik pajak', opening: 'saldo awal opening',
  subsequent: 'peristiwa kemudian setelah tanggal neraca', related: 'pihak berelasi hubungan istimewa',
  groupaudit: 'audit grup konsolidasi komponen', internalaudit: 'audit internal spi', expert: 'pakar ahli tenaga ahli',
  serviceorg: 'organisasi jasa service org', evidence: 'bukti audit evaluasi', fsgen: 'penyusun laporan keuangan generator lk',
  disclosure: 'pengungkapan daftar uji', opinion: 'opini laporan auditor', eqr: 'reviu mutu perikatan pengendali mutu',
  mgmtletter: 'surat manajemen management letter', pipeline: 'pipa penjualan prospek peluang', delivery: 'pengiriman milestone tonggak',
  billing: 'penagihan faktur invoice', scheduler: 'penjadwalan sumber daya jadwal', capacity: 'kapasitas perencanaan',
  hcm: 'sdm human capital kepegawaian', payroll: 'gaji penggajian', performance: 'kinerja penilaian',
  approvals: 'persetujuan otorisasi', integrations: 'integrasi koneksi', audittrail: 'jejak audit log',
  governance: 'tata kelola mutu', dashboard: 'dasbor firma ringkasan', bi: 'intelijen bisnis konsolidasi',
  crm: 'klien pelanggan relasi', engagement: 'manajemen perikatan', onboarding: 'penerimaan klien',
  dataflow: 'alur data integritas', continuance: 'keberlanjutan klien', teamindep: 'independensi tim',
  wip: 'pekerjaan dalam proses valuasi', wipreal: 'wip realisasi', revenue: 'pendapatan',
  firmgl: 'buku besar general ledger', apar: 'utang piutang', treasury: 'anggaran arus kas treasuri',
  cashbank: 'kas bank rekonsiliasi', fixedassets: 'aset tetap kantor', firmtax: 'pajak firma', profitability: 'profitabilitas laba',
};
const SIDE_SEARCH_ALL: SideSearchRow[] = (MODULES as SideSearchGroup[]).flatMap(g => g.items.map(m => ({
  id: m.id, label: m.label, icon: m.icon, group: g.group, tag: m.tag,
  hidden: HIDDEN_GROUPS.includes(g.group),
  ws: HIDDEN_GROUPS.includes(g.group) ? null : ((GROUP_WS as Record<string, string>)[g.group] || 'firm'),
  syn: SIDE_SYNONYMS[m.id] || '',
})));
/* Skor kecocokan: awalan-label > kata-label > substring-label > sinonim > grup/id. Kecil = lebih baik. */
function sideSearchScore(row: SideSearchRow, q: string): number {
  const label = row.label.toLowerCase();
  if (label.startsWith(q)) return 0;
  if (label.split(/[\s·—>/()]+/).some(w => w.startsWith(q))) return 1;
  if (label.includes(q)) return 2;
  if (row.syn && row.syn.includes(q)) return 3;   // substring: dukung kueri multi-kata & tengah-kata (mis. "gaji"→"penggajian")
  if (row.group.toLowerCase().includes(q)) return 4;
  if (row.id.toLowerCase().includes(q)) return 5;
  return 99;
}

function Sidebar({ active, onNavigate, collapsed, onToggle }: any) {
  /* R1 (PRD learning-curve) — progressive disclosure: grup default CIUT kecuali jangkar
     (grup aktif / fokus fase / anchor workspace); pilihan buka-tutup DIPERSIST per-browser
     (sebelumnya {} → semua terbuka tiap muat = 67 baris sekaligus di Firma). Pola localStorage
     sama seperti ams.ws / ams.sideShowAll (bukan server-state: preferensi UI trivial). */
  const [closedGroups, setClosedGroups] = useStateSH(() => {
    try { const s = JSON.parse(localStorage.getItem('ams.sideGroups') || 'null'); if (s && typeof s === 'object') return s; } catch (e) {}
    return {};
  });
  React.useEffect(() => { try { localStorage.setItem('ams.sideGroups', JSON.stringify(closedGroups)); } catch (e) {} }, [closedGroups]);
  const [query, setQuery] = useStateSH('');   // R2 — filter pencarian modul
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

  /* R2 — hasil pencarian: kecocokan lintas-158 (termasuk PSAK/SA tersembunyi), dihormati
     kapabilitas yang sama seperti pohon (GROUP_CAP grup + MODULE_CAP modul) → tak menyurface
     modul yang toh ter-gate AccessDenied. null = tak sedang mencari (pohon normal). */
  const q = query.trim().toLowerCase();
  const SIDE_SEARCH_MAX = 40;
  const canSeeInSearch = (row: SideSearchRow) => {
    const gc = (GROUP_CAP as Record<string, string>)[row.group];
    if (gc && !(auth && typeof auth.can === 'function' && auth.can(gc))) return false;
    return canOpenModule(row.id);
  };
  const searchAll = q ? SIDE_SEARCH_ALL.filter(canSeeInSearch)
    .map(r => ({ r, s: sideSearchScore(r, q) })).filter(x => x.s < 99)
    .sort((a, b) => a.s - b.s || a.r.label.localeCompare(b.r.label)) : null;
  const searchResults = searchAll ? searchAll.slice(0, SIDE_SEARCH_MAX).map(x => x.r) : null;
  const searchOverflow = searchAll ? Math.max(0, searchAll.length - SIDE_SEARCH_MAX) : 0;

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
  /* R1 — himpunan grup yang default-TERBUKA (sisanya ciut sampai dibuka/dipersist).
     Jangkar: grup modul aktif (orientasi), anchor per-workspace, dan grup fokus fase
     (adaptif) — dulu disalin ke kartu "Fokus Fase" terpisah (R7: kini cukup emphasis
     .relev di pohon, tanpa duplikasi). */
  const WS_ANCHOR: Record<string, string> = { engagement: 'Ruang Kerja Perikatan', firm: 'Firm Practice Management' };
  const defaultOpenSet = new Set<string>([activeGroup, WS_ANCHOR[ws]].filter(Boolean) as string[]);
  if (adaptiveOn) defaultOpenSet.add((SIDE_PRIMARY_GROUP as any)[curKey]);
  const effClosed = (g: string) => (g in closedGroups) ? closedGroups[g] : (showAll ? false : !defaultOpenSet.has(g));
  const toggleGroup = (g: string) => setClosedGroups((s: any) => ({ ...s, [g]: !effClosed(g) }));

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
      {/* R2 — filter pencarian: recognition-first, menjangkau 158 modul termasuk PSAK/SA
          tersembunyi. Kosong = pohon normal; berisi = daftar hasil datar menggantikan pohon. */}
      {!collapsed && (
        <div className="side-search">
          <I.search2 size={13} />
          <input value={query} onChange={(e: { target: { value: string } }) => setQuery(e.target.value)} placeholder="Cari modul… (mis. PSAK 73)"
            spellCheck={false} autoComplete="off" aria-label="Cari modul"
            onKeyDown={(e: { key: string }) => {
              if (e.key === 'Escape') setQuery('');
              else if (e.key === 'Enter' && searchResults && searchResults[0]) { onNavigate(searchResults[0].id); setQuery(''); }
            }} />
          {query && <button type="button" className="side-search-x" title="Bersihkan (Esc)" onClick={() => setQuery('')}>×</button>}
        </div>
      )}
      <div className="side-scroll">
        {searchResults && (
          <div className="side-search-results">
            <div className="side-search-h">{searchResults.length ? (searchResults.length + (searchOverflow ? '+' : '') + ' hasil') : 'Tak ada modul cocok'}</div>
            {searchResults.map(m => {
              const IconS = I[m.icon as keyof typeof I] || I.panel;
              return (
                <div key={m.id} className={'side-search-item' + (active === m.id ? ' active' : '')} onClick={() => { onNavigate(m.id); setQuery(''); }}>
                  <span className="ico"><IconS size={15} /></span>
                  <span className="mn">
                    <span className="l">{m.label}</span>
                    <span className="g">{m.group}{m.hidden ? ' · referensi' : ''}{m.ws && m.ws !== ws ? (' · ' + (m.ws === 'engagement' ? 'Perikatan' : 'Firma')) : ''}</span>
                  </span>
                </div>
              );
            })}
            {searchOverflow > 0 && <div className="side-search-more">+{searchOverflow} lagi — persempit kata kunci</div>}
          </div>
        )}
        {/* R3 — escape hatch SELALU tampil saat sidebar diperluas (dulu hanya bila peran
            terkurasi → Partner/Manager, menu terbesar, tak punya kontrol). showAll = buka
            SEMUA grup (abaikan kurasi peran & default-ciut). Murni tampilan; capability utuh. */}
        {!collapsed && !searchResults && (
          <button type="button" onClick={() => setShowAll(!showAll)}
            title={showAll ? 'Kembali ke tampilan ringkas (relevan dengan peran & fase Anda)' : 'Buka semua modul & grup — kapabilitas tidak berubah, hanya tampilan'}
            style={{ margin: '8px 8px 4px', width: 'calc(100% - 16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', border: '1px dashed var(--line-strong)', background: showAll ? 'var(--blue-050)' : 'transparent', color: showAll ? 'var(--blue)' : 'var(--ink-3)', fontSize: 11, fontWeight: 600 }}>
            <I.layers size={12} /> {showAll ? 'Ringkas kembali' : (curatedGroups ? 'Tampilkan semua modul' : 'Buka semua grup')}
          </button>
        )}
        {adaptiveOn && !searchResults && resumeItems.length > 0 && (
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

        {/* R7 — indikator fase (orientasi) TANPA menyalin item; grup fokus terbuka di pohon
            di bawah dengan emphasis .relev (dulu 7 modul Core Execution ter-render dua kali:
            44 baris untuk 37 modul unik). */}
        {adaptiveOn && !searchResults && (
          <div className="side-focus-h"><span className="ft">Fokus Fase</span><span className="fb">{phaseLabel}</span>{engProgress != null && <span className="fp">{engProgress}%</span>}</div>
        )}

        {!searchResults && groups.map(group => {
          const gp = (SIDE_GROUP_PHASE as any)[group.group];
          if (adaptiveOn && navPrefs.mode === 'ringkas' && gp && !relevant.includes(gp)) return null;
          // Sidebar ciut (48px): tak ada header utk buka-tutup → tampilkan semua grup
          // (cegah regresi default-ciut R1 yg akan menyembunyikan ikon di mode ini).
          const isClosed = collapsed ? false : effClosed(group.group);
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
                    {/* R6 — badge NEW hanya utk id di NEW_ALLOW; tag non-NEW (kode standar) selalu.
                        Cabang mati '.soon' dibuang (semua modul deep:true → tak pernah render). */}
                    {isDone ? <span className="done"><I.check size={14} /></span>
                      : (m.tag && (m.tag !== 'NEW' || NEW_ALLOW.has(m.id))) ? <span className="tag">{m.tag}</span>
                      : null}
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
function SubBar({ moduleId, right }: any) {
  const m = (MODULE_INDEX as any)[moduleId] || { label: moduleId, group: '' };
  const nav = useNav();
  const navFrom = useNavFrom();
  const fromMeta = navFrom && navFrom !== moduleId ? ((MODULE_INDEX as any)[navFrom] || { label: navFrom }) : null;
  const TitleIcon = I[m.icon as keyof typeof I] || I.panel;
  return (
    <div className="pagehead">
      {/* Baris tunggal — kembali + ikon + eyebrow + judul + aksi view */}
      <div className="pagehead-main">
        {fromMeta && (
          <button type="button" className="subbar-back" title={'Kembali ke ' + fromMeta.label}
            onClick={() => nav(navFrom)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 28, padding: '0 10px 0 7px', border: '1px solid var(--line-strong)', borderRadius: 7, background: 'var(--surface-2)', color: 'var(--ink-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flex: '0 0 auto' }}
            onMouseEnter={(e: any) => { e.currentTarget.style.background = 'var(--blue-050)'; e.currentTarget.style.borderColor = 'var(--blue)'; e.currentTarget.style.color = 'var(--blue)'; }}
            onMouseLeave={(e: any) => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.borderColor = 'var(--line-strong)'; e.currentTarget.style.color = 'var(--ink-2)'; }}>
            <I.arrowLeft size={14} /> {fromMeta.label}
          </button>
        )}
        <span className="pagehead-icon"><TitleIcon size={20} /></span>
        <div className="pagehead-titles">
          {m.group && <span className="pagehead-eyebrow">{m.group}</span>}
          <h1 className="pagehead-title">{m.label}</h1>
        </div>
        <div className="pagehead-spacer" />
        <div className="pagehead-actions">
          {typeof WpSubBarControl !== 'undefined' && <WpSubBarControl moduleId={moduleId} />}
          {typeof EvidenceControl !== 'undefined' && <EvidenceControl moduleId={moduleId} />}
          {right}
        </div>
      </div>
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
