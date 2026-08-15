/* [codemod] ESM imports */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { hydrateCoreFromApi, api } from './api';
import { AppProviders, NavContext, NavFromContext } from './contexts';
import { LoginScreen } from './view_login';
import { Copilot } from './copilot';
import { I, MODULE_INDEX } from './icons';
import { MiniMap } from './minimap';
import { ModuleLineage, StandardLinkback } from './related_modules';
import { buildHash, initialLocation, oneShotSeeds, parseHash, resolveRoute } from './route_hash';
import { Sidebar, SubBar, TopBar } from './shell';
import { Btn, StubView } from './ui';
import { amsApplyPrefs } from './prefs';
import { LazyViews } from './lazy_views';
import { ComplianceView } from './view_compliance';
import { CommandPalette } from './view_palette';

/* ============================================================
   Asseris — Main app + router
   ============================================================ */
const { useState: useStateApp, useEffect: useEffectApp } = React;

/* React di-resolve dari JS tanpa @types → `React.Component` ter-infer parsial
   (tanpa state/props/setState). Tier app relaks: pakai basis ber-tipe `any`
   agar boundary kelas tak menabrak TS2339; perilaku runtime identik. */
const ReactComponentBase: any = React.Component;
class ViewErrorBoundary extends ReactComponentBase {
  constructor(p: any) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err: any) { return { err }; }
  componentDidUpdate(prev: any) { if (prev.routeKey !== this.props.routeKey && this.state.err) this.setState({ err: null }); }
  render() {
    if (this.state.err) {
      // Fallback kustom (mis. Copilot pakai `fallback={null}` agar degrade senyap tanpa
      // panel merah mengambang & tanpa crash-loop). Tanpa prop → panel diagnostik default.
      if (this.props.fallback !== undefined) return this.props.fallback;
      return <div className="view-pad" style={{ padding: 24 }}>
        <div className="panel" style={{ padding: 18, borderTop: '3px solid var(--red)' }}>
          <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--red)' }}>Gagal merender modul “{this.props.routeKey}”.</div>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, color: 'var(--ink-2)', fontFamily: 'var(--mono)', lineHeight: 1.5 }}>{String(this.state.err && (this.state.err.stack || this.state.err.message || this.state.err))}</pre>
        </div>
      </div>;
    }
    return this.props.children;
  }
}

function viewFor(moduleId: any) {
  /* Tahap 8 — route-level code splitting: tiap modul adalah React.lazy chunk
     yang dimuat saat navigasi pertama. Fallback default (compliance checklist
     & stub) tetap eager — keduanya kecil dan dipakai banyak modul. */
  const Lazy = LazyViews[moduleId];
  if (Lazy) return <Lazy />;
  if (window.COMPLIANCE_CONFIG && window.COMPLIANCE_CONFIG[moduleId]) return <ComplianceView stdId={moduleId} />;
  return <StubViewWrap moduleId={moduleId} />;
}

/* stub views get their own subbar */
function StubViewWrap({ moduleId }: any) {
  return (
    <>
      <SubBar moduleId={moduleId} right={<Btn sm variant="primary"><I.sparkle size={14} /> AI Assist</Btn>} />
      <div className="view-scroll"><StubView moduleId={moduleId} /></div>
    </>
  );
}

/* Tahap 8 — fallback ringan selama chunk rute lazy dimuat. */
function RouteFallback({ moduleId }: { moduleId: string }) {
  const label = ((MODULE_INDEX as any)[moduleId] || {}).label || moduleId;
  return (
    <div className="view-pad" style={{ padding: 24 }}>
      <div className="panel" style={{ padding: 18, color: 'var(--ink-2)', fontSize: 13 }}>
        Memuat {label}…
      </div>
    </div>
  );
}

/* ---- Drawer rujukan Standar (SA) — meluncur dari kanan ----
   Membuka halaman SA mendalam tanpa meninggalkan prosedur. Untuk standar
   tanpa halaman khusus, menampilkan kartu rujukan + tautan Matriks Kepatuhan. */
function StandardRefCard({ data, onNavigate, onClose }: any) {
  return (
    <div className="view-pad">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--navy-solid)', color: '#fff', display: 'grid', placeItems: 'center', flex: '0 0 44px' }}><I.shield size={20} /></span>
        <div>
          <div className="mono" style={{ fontSize: 15, fontWeight: 700 }}>{data.code}</div>
          <div className="muted" style={{ fontSize: 13 }}>{data.title}</div>
        </div>
      </div>
      <div className="panel" style={{ padding: 14, marginBottom: 12 }}>
        <div className="tiny muted upper" style={{ marginBottom: 4 }}>Keterkaitan</div>
        <div style={{ fontSize: 13, lineHeight: 1.55 }}>
          Prosedur <b>{((MODULE_INDEX as any)[data.fromModule] || {}).label || data.fromModule}</b> dirancang untuk memenuhi persyaratan <b>{data.code} · {data.title}</b>{data.phase ? <> pada fase <b>{data.phase}</b></> : null}. Status pemenuhan & ketertelusuran terpusat di Matriks Kepatuhan.
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn variant="primary" onClick={() => { onClose(); onNavigate('compmatrix'); }}><I.table size={14} /> Lihat di Matriks Kepatuhan</Btn>
      </div>
    </div>
  );
}

function SARefDrawer({ data, onClose, onNavigate }: any) {
  const open = !!data;
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: any) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  if (!open) return null;
  return (
    <>
      <div className="sa-drawer-backdrop" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(15,23,42,.34)' }} />
      <aside className="sa-drawer" style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(780px, 94vw)', zIndex: 91, background: 'var(--bg, #fff)', boxShadow: '-18px 0 50px rgba(15,23,42,.22)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderBottom: '1px solid var(--line)', flex: '0 0 auto' }}>
          <span className="tiny upper" style={{ fontWeight: 700, letterSpacing: '.05em', color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 6 }}><I.shield size={13} /> Rujukan Standar Audit</span>
          <span className="mono" style={{ fontWeight: 700, fontSize: 13 }}>{data.code}</span>
          <div style={{ flex: 1 }} />
          {data.view && (
            <Btn sm onClick={() => { const v = data.view; onClose(); onNavigate(v); }}><I.arrowRight size={13} /> Halaman penuh</Btn>
          )}
          <button className="top-btn" title="Tutup" onClick={onClose} style={{ width: 30, height: 30 }}><I.x size={16} /></button>
        </div>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: data.view ? 'hidden' : 'auto' }}>
          {data.view ? <React.Suspense fallback={<RouteFallback moduleId={data.view} />}>{viewFor(data.view)}</React.Suspense> : <StandardRefCard data={data} onNavigate={onNavigate} onClose={onClose} />}
        </div>
      </aside>
    </>
  );
}

/* PR-6 (SC-15) — tulis seed satu-tembak dari alamat. Perhitungannya MURNI dan
   diuji di `route_hash` (`oneShotSeeds`); di sini hanya efek sampingnya. */
function seedOneShotFromHash(loc: { route: string; sel: string | null; tab: string | null } | null): void {
  try {
    oneShotSeeds(loc).forEach((s) => sessionStorage.setItem(s.key, s.value));
  } catch (e) { /* private mode */ }
}

function App() {
  /* Fase 7 — default landing berbasis peran = Beranda (bukan lagi 'dashboard' statis).
     Rute terakhir tetap dipulihkan saat reload (lihat Root.enter: hanya login EKSPLISIT
     yang memaksa 'home'); Firm Dashboard tetap 1 klik bagi Partner/Manager. */
  /* PRD Fase B — rute kini punya ALAMAT. Presedens saat boot:
     hash (tautan dibagikan / reload / Back-Forward) > `ams.route` (sesi
     terakhir di peramban ini) > 'home'. Rute tak dikenal dibuang di
     `initialLocation`, jadi tautan busuk mendarat di sesi terakhir/home —
     tak pernah layar putih. */
  const [route, setRoute] = useStateApp(() => {
    const known = (id: string): boolean => id === 'home' || !!(MODULE_INDEX as Record<string, unknown>)[id];
    let last: string | null = null;
    try { last = localStorage.getItem('ams.route'); } catch (e) { /* private mode */ }
    const boot = initialLocation(typeof location === 'undefined' ? '' : location.hash, last, known);
    seedOneShotFromHash(boot.loc);
    return boot.loc.route;
  });
  const [collapsed, setCollapsed] = useStateApp(() => localStorage.getItem('ams.sidebarCollapsed') === '1');
  const [copilot, setCopilot] = useStateApp(false);
  const [palette, setPalette] = useStateApp(false);
  const [minimap, setMiniMap] = useStateApp(false);
  const [saRef, setSaRef] = useStateApp(null);
  const [navFrom, setNavFrom] = useStateApp(null);

  const navigate = React.useCallback((rawId: any, opts: any) => {
    /* Alias rute diterjemahkan di SATU pintu: setiap `nav('wipreal')` yang masih
       tertinggal di modul lain, chip lineage, dan `sourceRoute` item persetujuan
       lama semuanya lewat sini. Tanpa ini mereka menulis hash & `ams.route` ber-id
       yatim yang lalu ditolak pembaca di bawah. */
    const id = resolveRoute(String(rawId));
    setNavFrom(opts && opts.from ? opts.from : null);
    // Deep-link tab (PRD 2026-07-18): stash a one-shot pending-tab BEFORE setRoute
    // so the target module's useInitialTab seeds it on mount. sessionStorage +
    // consume-once → survives reload, no staleness. Absent tab = unchanged behavior.
    try {
      if (opts && opts.tab != null) sessionStorage.setItem('ams.navtab.' + id, String(opts.tab));
      // Deep-link selection (mirror of tab): one-shot pending-record so the target
      // module's useInitialSelection seeds which row/entity to open (mis. klien di
      // register keberlanjutan). Consume-once → tahan reload, tak lengket.
      if (opts && opts.sel != null) sessionStorage.setItem('ams.navsel.' + id, String(opts.sel));
    } catch (e) { /* private mode */ }
    try {
      if (((MODULE_INDEX as any)[id] || {}).deep) {
        const prev = JSON.parse(localStorage.getItem('ams.recent') || '[]');
        const next = [id, ...(Array.isArray(prev) ? prev : []).filter(x => x !== id)].slice(0, 8);
        localStorage.setItem('ams.recent', JSON.stringify(next));
        window.dispatchEvent(new Event('ams:recent'));
      }
    } catch (e) {}
    /* Tulis alamatnya. Pindah MODUL = push (Back kembali ke modul sebelumnya);
       ganti tab/seleksi DI DALAM modul yang sama = replace, supaya riwayat tak
       dibanjiri langkah-langkah kecil yang tak berarti bagi pengguna.
       `setRoute` tetap dipanggil SINKRON di bawah: hash adalah cerminan state,
       bukan pemicunya. Pembaca `hashchange` di bawah sengaja no-op bila hash
       sudah cocok dengan state — itulah penjaga anti-gelungnya. */
    try {
      const next = buildHash({ route: id, sel: opts && opts.sel, tab: opts && opts.tab });
      if (typeof location !== 'undefined' && location.hash !== next) {
        const sameModule = parseHash(location.hash)?.route === id;
        if (sameModule && typeof history !== 'undefined' && history.replaceState) {
          history.replaceState(null, '', location.pathname + location.search + next);
        } else {
          location.hash = next;
        }
      }
    } catch (e) { /* URL tak dapat ditulis — navigasi tetap jalan tanpa alamat */ }
    setRoute(id); setPalette(false); setSaRef(null);
  }, []);

  /* Pembaca TUNGGAL: Back/Forward peramban & URL yang ditempel di tab berjalan.
     Hanya bertindak bila rutenya benar-benar berbeda dari state — navigasi
     lewat `navigate()` sudah menulis hash sendiri, jadi event yang lahir dari
     situ berakhir di sini sebagai no-op. */
  useEffectApp(() => {
    const onHash = (): void => {
      const loc = parseHash(location.hash);
      if (!loc) return;
      const route = resolveRoute(loc.route);   // bookmark ber-id lama tetap mendarat benar
      const known = route === 'home' || !!(MODULE_INDEX as Record<string, unknown>)[route];
      if (!known) return;                     // tautan busuk: diamkan, jangan buang halaman
      seedOneShotFromHash(loc);               // SC-15: Back/Forward & URL tempel ikut membuka rekamannya
      setRoute((cur: string) => (cur === route ? cur : route));
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  /* Alamat harus benar sejak muat pertama, termasuk saat rute datang dari
     `ams.route` (sesi terakhir) dan hash masih kosong.

     PRD V-9 — efek ini DULU membangun `buildHash({ route })` telanjang, sehingga
     setiap kali ia menembak, sumbu `tab` & `sel` yang sah dibuang dari URL. Kini
     ia hanya mengoreksi bagian RUTE dan mempertahankan sisanya. Bila hash memuat
     alias rute (`#/wipreal`), `loc.route !== route` sehingga alamat ditulis ulang
     ke id penggantinya — dengan tab & seleksi tetap terbawa. */
  useEffectApp(() => {
    try {
      if (typeof location === 'undefined') return;
      const loc = parseHash(location.hash);
      if (loc && loc.route === route) return;
      /* `tab`/`sel` hanya ikut bila hash lama menunjuk MODUL YANG SAMA lewat alias
         (mis. `#/wipreal` → `wip`). Bila ia menunjuk modul lain, keduanya DIBUANG —
         membawanya berarti menyeed tab milik modul lain ke modul ini (SC-5). */
      const sameModule = !!loc && resolveRoute(loc.route) === route;
      const next = buildHash({ route, sel: sameModule ? loc.sel : null, tab: sameModule ? loc.tab : null });
      history.replaceState(null, '', location.pathname + location.search + next);
    } catch (e) { /* abaikan */ }
  }, [route]);
  useEffectApp(() => { window.__amsOpenSA = setSaRef; return () => { delete window.__amsOpenSA; }; }, []);

  useEffectApp(() => { localStorage.setItem('ams.route', route); }, [route]);
  useEffectApp(() => { localStorage.setItem('ams.sidebarCollapsed', collapsed ? '1' : '0'); }, [collapsed]);
  useEffectApp(() => { window.__amsSetSidebar = setCollapsed; }, []);
  useEffectApp(() => { window.__amsOpenCopilot = () => setCopilot(true); return () => { delete window.__amsOpenCopilot; }; }, []);
  useEffectApp(() => { window.__amsOpenMiniMap = () => setMiniMap(true); return () => { delete window.__amsOpenMiniMap; }; }, []);
  useEffectApp(() => {
    /* Kelas tema di <html>, bukan <body> — lihat catatan blok :root.dark di styles_base.css
       (token gelap harus mencapai :root, dan :has() menimbulkan siklus invalidasi). */
    if (localStorage.getItem('ams.dark') === '1') document.documentElement.classList.add('dark');
    if (localStorage.getItem('ams.dense') === '1') document.body.classList.add('dense');
    try { const s = JSON.parse(localStorage.getItem('ams.v1.settings') || '{}'); amsApplyPrefs(s); } catch (e) {}
  }, []);
  useEffectApp(() => {
    const onKey = (e: any) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p: any) => !p); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'm') { e.preventDefault(); setMiniMap((p: any) => !p); }
      if (e.key === 'Escape') setPalette(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <NavContext.Provider value={navigate}>
     <NavFromContext.Provider value={navFrom}>
      <div className="app">
        <TopBar route={route} onOpenCopilot={() => setCopilot(true)} onOpenPalette={() => setPalette(true)} onOpenMiniMap={() => setMiniMap(true)} onNavigate={navigate} />
        <div className="app-body">
          <Sidebar active={route} onNavigate={navigate} collapsed={collapsed} onToggle={() => setCollapsed((c: any) => !c)} />
          <div className="main-col">
            {/* Tahap 8 — route-level code splitting: React.lazy memerlukan
                Suspense. Fallback ringan dipakai selama chunk rute dimuat. */}
            <React.Suspense fallback={<RouteFallback moduleId={route} />}>
              <ViewErrorBoundary routeKey={route}>{viewFor(route)}</ViewErrorBoundary>
              <ModuleLineage moduleId={route} />
              <StandardLinkback moduleId={route} />
            </React.Suspense>
          </div>
        </div>
        <button className="copilot-fab" onClick={() => setCopilot(true)}>
          <I.sparkle size={18} /> AI Co-pilot
        </button>
        <ViewErrorBoundary routeKey={'copilot:' + route} fallback={null}>
          <Copilot open={copilot} onClose={() => setCopilot(false)} route={route} />
        </ViewErrorBoundary>
        {typeof MiniMap !== 'undefined' && <MiniMap open={minimap} route={route} onClose={() => setMiniMap(false)} onNavigate={navigate} />}
        {palette && <CommandPalette onClose={() => setPalette(false)} onNavigate={navigate} />}
        <SARefDrawer data={saRef} onClose={() => setSaRef(null)} onNavigate={navigate} />
      </div>
     </NavFromContext.Provider>
    </NavContext.Provider>
  );
}

const DEFAULT_ENG_ID = 'ENG-2025-014';

function BootSplash({ label }: any) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh',
      font: '15px system-ui,sans-serif', color: '#8a93a2' }}>{label}</div>
  );
}

/* W7 Fase 2 — boot gate is now session-aware:
     checking → ask the server who we are (auth.me)
     login    → no/expired session → render <LoginScreen>
     ready    → authenticated → hydrate core entities (W6 Fase 3) for THIS user, then mount
   Hydration runs AFTER auth (bootstrap is a protectedProcedure) and BEFORE <App> renders, so
   canon's lazy FIG/SRC still build from the DB WTB. A 401 mid-session (ams:auth-expired) drops
   back to login. */
function Root() {
  const { useState: useStateRT, useEffect: useEffectRT, useCallback: useCallbackRT } = React;
  const [phase, setPhase] = useStateRT('checking');
  const [me, setMe] = useStateRT(null);

  const enter = useCallbackRT(async (user: any, fresh: boolean = true) => {
    setMe(user);
    // Fase 7 — login EKSPLISIT (via LoginScreen) selalu mendarat di Beranda berbasis peran;
    // reload sesi (auth.me, fresh=false) TIDAK menyentuh rute → pengguna kembali ke tempatnya.
    /* PRD Fase B — hash kini LEBIH otoritatif daripada `ams.route` saat <App>
       mount, jadi menyetel storage saja tak lagi cukup: tanpa membersihkan
       alamatnya, login eksplisit akan mendarat di rute milik sesi sebelumnya. */
    if (fresh) {
      try { localStorage.setItem('ams.route', 'home'); } catch (e) { /* private mode */ }
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* abaikan */ }
    }
    try { await hydrateCoreFromApi(DEFAULT_ENG_ID, user.id); } catch (e) { /* offline: data.js fallback */ }
    setPhase('ready');
  }, []);

  const logout = useCallbackRT(() => {
    (api as any).auth.logout.mutate().catch(() => {});
    setMe(null);
    setPhase('login');
  }, []);

  useEffectRT(() => {
    let cancelled = false;
    (api as any).auth.me.query()
      .then((user: any) => { if (!cancelled) { user ? enter(user, false) : setPhase('login'); } })
      .catch(() => { if (!cancelled) setPhase('login'); });
    const onExpired = () => { setMe(null); setPhase('login'); };
    window.addEventListener('ams:auth-expired', onExpired);
    return () => { cancelled = true; window.removeEventListener('ams:auth-expired', onExpired); };
  }, [enter]);

  if (phase === 'checking') return <BootSplash label="Memeriksa sesi…" />;
  if (phase === 'login') return <LoginScreen onLoggedIn={enter} />;
  return <AppProviders me={me} onLogout={logout}><App /></AppProviders>;
}

const _rootEl = document.getElementById('root');
ReactDOM.createRoot(_rootEl).render(<Root />);


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export const __amsOpenCopilot = window.__amsOpenCopilot;
export const __amsOpenMiniMap = window.__amsOpenMiniMap;
export const __amsOpenSA = window.__amsOpenSA;
export const __amsSetSidebar = window.__amsSetSidebar;
