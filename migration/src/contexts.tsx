/* [codemod] ESM imports */
import React from 'react';
import { api, isConflict } from './api';
import { can as rbacCan } from './rbac';
import { AMS } from './data';

/* ============================================================
   Asseris — React Context providers
   AuthContext · FirmContext · AuditContext
   ============================================================ */
const { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } = React;

const AuthContext  = createContext(null);
const FirmContext  = createContext(null);
const AuditContext = createContext(null);
const NavContext   = createContext(() => {});
const NavFromContext = createContext(null);

const useAuth  = () => useContext(AuthContext);
const useFirm  = () => useContext(FirmContext);
const useAudit = () => useContext(AuditContext);
const useNav   = () => useContext(NavContext);
const useNavFrom = () => useContext(NavFromContext);

/* P5 Fase 2 — catatan review berlingkup-engagement. Selektor murni: catatan
   milik engagement `engId`; catatan legacy tanpa `engagementId` ikut tampil
   (tak ada yang hilang dari state lama). */
function notesForEngagement(notes: any, engId: any) {
  if (!Array.isArray(notes)) return [];
  return notes.filter(n => n.engagementId === engId || n.engagementId == null);
}

/* ============================================================
   W6 Fase 1 — server-backed persisted state.
   The SSOT is now the backend (StateDoc, versioned). localStorage is a
   cache: read synchronously for instant first paint, then reconciled from
   the server. Writes update local state optimistically, write through the
   cache, and debounce a compare-and-swap mutation. If the server is absent
   the hook degrades to cache-only (errors swallowed) so the app never breaks.

   Scope: each key lives under (scope, scopeId).
     user       → this user      (profile / role / activeEng / prefs)
     firm        → the firm        (clients / engagements / firm-wide registries)
     engagement  → active engagement (aje / risks / wpState / review notes / …)
   Single-firm/single-user demo, so the firm/user scopeIds are constants that
   match the seed (FIRM-WHR / USER.employeeId). ============================================================ */
const FIRM_SCOPE_ID = 'FIRM-WHR';
function userScopeId() { try { return (AMS && AMS.USER && AMS.USER.employeeId) || 'USER-1'; } catch (e) { return 'USER-1'; } }
const DEFAULT_ENG_ID = 'ENG-2025-014';

/* Public useAmsPersist (module state) defaults to firm scope — i.e. today's
   "one global doc", now shared across browsers — so no module changes behavior.
   Only keys that must DIVERGE per engagement are listed here. Keys that already
   embed the engagement id in their string (e.g. opinionDoc.<engId>) stay firm. */
const AMS_PERSIST_SCOPE = {
  'diagnostics.v1': 'engagement',
  'aiInsights.v1': 'engagement',
  'jet.v1': 'engagement',
};

const SYNC_DEBOUNCE_MS = 400;

/* W6 Fase 2 — surface optimistic-concurrency conflicts (no silent clobber).
   useServerState emits a window event on a lost CAS race; <ConflictToaster>
   renders it with two choices (adopt latest / overwrite with mine). */
const CONFLICT_LABELS = {
  aje: 'Jurnal Penyesuaian (AJE)', risks: 'Register Risiko', wpState: 'Status Kertas Kerja',
  reviewNotes: 'Catatan Review', noteThreads: 'Balasan Catatan', timeEntries: 'Entri Waktu',
  taskState: 'Status Tugas', logEntries: 'Log Aktivitas', wtbOverrides: 'Override WTB',
  clients: 'Daftar Klien', engagements: 'Daftar Perikatan', activeEng: 'Perikatan Aktif',
  profile: 'Profil Pengguna', role: 'Peran',
};
function conflictLabel(key: any) { return (CONFLICT_LABELS as any)[key] || key; }
function emitConflict(detail: any) {
  try { window.dispatchEvent(new CustomEvent('ams:conflict', { detail })); } catch (e) {}
}

function cacheRead(cacheKey: any, legacyKey: any, initial: any) {
  try { const s = localStorage.getItem(cacheKey); if (s != null) return JSON.parse(s); } catch (e) {}
  // one-time fallback to the pre-W6 unscoped key so existing local edits survive the upgrade
  if (legacyKey) { try { const s = localStorage.getItem(legacyKey); if (s != null) return JSON.parse(s); } catch (e) {} }
  return typeof initial === 'function' ? initial() : initial;
}
function cacheWrite(cacheKey: any, val: any) { try { localStorage.setItem(cacheKey, JSON.stringify(val)); } catch (e) {} }

/* The engine. Returns [val, setVal] with the SAME contract as the old hook,
   including functional updates (setVal(prev => next)), which the app uses widely. */
function useServerState(key: any, initial: any, scope: any, scopeId: any) {
  const cacheKey = 'ams.v1.' + scope + '.' + scopeId + '.' + key;
  const legacyKey = 'ams.v1.' + key;
  const [val, setValRaw] = React.useState(() => cacheRead(cacheKey, legacyKey, initial));
  const versionRef = React.useRef(0);
  const timerRef = React.useRef(null);
  const targetRef = React.useRef(null);
  targetRef.current = { scope, scopeId, key, cacheKey };

  // Hydrate from the server on mount and whenever the scope target changes
  // (e.g. switching the active engagement re-points engagement-scoped keys).
  React.useEffect(() => {
    let cancelled = false;
    setValRaw(cacheRead(cacheKey, legacyKey, initial)); // instant swap to this target's cache
    versionRef.current = 0;
    (api as any).state.get.query({ scope, scopeId, key }).then((res: any) => {
      if (cancelled) return;
      versionRef.current = res.version;
      if (res.version > 0) { setValRaw(res.value); cacheWrite(cacheKey, res.value); }
    }).catch(() => { /* offline / no server: keep the cache */ });
    return () => { cancelled = true; };
  }, [scope, scopeId, key]);

  const flush = React.useCallback((value: any) => {
    const t = targetRef.current;
    (api as any).state.set.mutate({ scope: t.scope, scopeId: t.scopeId, key: t.key, value, baseVersion: versionRef.current })
      .then((res: any) => { versionRef.current = res.version; })
      .catch((err: any) => {
        // Lost an optimistic-concurrency race. Don't silently clobber EITHER side:
        // keep the user's local value, sync versionRef to the server's latest, and
        // surface a conflict toast that lets the user adopt latest or overwrite.
        if (isConflict(err)) {
          const attempted = value;
          (api as any).state.get.query({ scope: t.scope, scopeId: t.scopeId, key: t.key }).then((res: any) => {
            versionRef.current = res.version;
            const serverVal = res.version > 0 ? res.value : value;
            emitConflict({
              scope: t.scope, key: t.key, label: conflictLabel(t.key),
              adopt: () => { setValRaw(serverVal); cacheWrite(t.cacheKey, serverVal); },
              keepMine: () => {
                (api as any).state.set.mutate({ scope: t.scope, scopeId: t.scopeId, key: t.key, value: attempted, baseVersion: versionRef.current })
                  .then((r: any) => { versionRef.current = r.version; cacheWrite(t.cacheKey, attempted); })
                  .catch(() => {});
              },
            });
          }).catch(() => {});
        }
        /* other errors (offline): cache already holds the value; the next edit retries */
      });
  }, []);

  const setVal = React.useCallback((next: any) => {
    setValRaw((prev: any) => {
      const value = typeof next === 'function' ? next(prev) : next;
      cacheWrite(targetRef.current.cacheKey, value);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => flush(value), SYNC_DEBOUNCE_MS);
      return value;
    });
  }, [flush]);

  return [val, setVal];
}

function clearPersisted() {
  try { Object.keys(localStorage).filter(k => k.startsWith('ams.v1.') || k.startsWith('ams.')).forEach(k => localStorage.removeItem(k)); } catch (e) {}
}

/* standalone persisted-state hook for modules outside the providers.
   Scope from the map (default firm); engagement-scoped keys read the active
   engagement from FirmContext (null outside a provider → default engagement). */
function useAmsPersist(key: any, initial: any) {
  const scope = (AMS_PERSIST_SCOPE as any)[key] || 'firm';
  const firm = useFirm(); // always called (rules-of-hooks); null outside provider
  const scopeId = scope === 'engagement'
    ? ((firm && firm.activeEngagementId) || DEFAULT_ENG_ID)
    : (scope === 'user' ? userScopeId() : FIRM_SCOPE_ID);
  return useServerState(key, initial, scope, scopeId);
}
window.useAmsPersist = useAmsPersist;

/* W6 Fase 2 — global toaster for save conflicts. Listens for 'ams:conflict',
   dedupes by (scope,key), auto-dismisses, offers adopt-latest / overwrite-mine. */
function ConflictToaster() {
  const [items, setItems] = React.useState([]);
  const dismiss = React.useCallback((id: any) => setItems((list: any) => list.filter((t: any) => t.id !== id)), []);

  React.useEffect(() => {
    const onConflict = (ev: any) => {
      const d = (ev && ev.detail) || {};
      const id = (d.scope || '') + ':' + (d.key || '') + ':' + (window.performance ? Math.round(performance.now()) : 0);
      setItems((list: any) => {
        const rest = list.filter((t: any) => !(t.key === d.key && t.scope === d.scope)); // one toast per target
        return [...rest, { id, key: d.key, scope: d.scope, label: d.label || d.key, adopt: d.adopt, keepMine: d.keepMine }];
      });
    };
    window.addEventListener('ams:conflict', onConflict);
    return () => window.removeEventListener('ams:conflict', onConflict);
  }, []);

  React.useEffect(() => {
    if (!items.length) return undefined;
    const timers = items.map((t: any) => setTimeout(() => dismiss(t.id), 14000));
    return () => timers.forEach(clearTimeout);
  }, [items, dismiss]);

  if (!items.length) return null;
  const wrap = { position: 'fixed', right: 18, bottom: 18, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 360 };
  const card = { background: 'var(--surface,#fff)', border: '1px solid var(--line,#e3e6ea)', borderLeft: '3px solid var(--amber,#d98a00)', borderRadius: 10, boxShadow: '0 8px 28px rgba(15,23,42,.16)', padding: '12px 14px', font: '13px/1.45 inherit', color: 'var(--ink,#1f2733)' };
  const head = { display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 4 };
  const row = { display: 'flex', gap: 8, marginTop: 10 };
  const btn = { cursor: 'pointer', border: '1px solid var(--line,#e3e6ea)', borderRadius: 7, padding: '5px 10px', font: '12px inherit', background: '#fff', color: 'var(--ink,#1f2733)' };
  const btnPrimary = { ...btn, background: 'var(--navy,#1f3a5f)', color: '#fff', borderColor: 'var(--navy,#1f3a5f)' };
  const x = { marginLeft: 'auto', cursor: 'pointer', border: 'none', background: 'none', color: 'var(--ink-2,#8a93a2)', fontSize: 16, lineHeight: 1 };
  return (
    <div style={wrap} role="status" aria-live="polite" data-testid="conflict-toaster">
      {items.map((t: any) => (
        <div key={t.id} style={card} data-conflict-key={t.key}>
          <div style={head}>
            <span>⚠︎ Konflik penyimpanan</span>
            <button style={x} title="Tutup" onClick={() => dismiss(t.id)}>×</button>
          </div>
          <div><b>{t.label}</b> diubah dari sesi/peramban lain. Perubahan Anda belum tersimpan.</div>
          <div style={row}>
            <button style={btnPrimary} onClick={() => { try { t.adopt && t.adopt(); } finally { dismiss(t.id); } }}>Muat versi terbaru</button>
            <button style={btn} onClick={() => { try { t.keepMine && t.keepMine(); } finally { dismiss(t.id); } }}>Timpa dengan perubahan saya</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AppProviders({ me, onLogout, children }: any) {
  const D: any = AMS;
  const uid = me.id; // authenticated user id (replaces the old AMS.USER guess)

  /* ---- Auth (W7) ---- */
  /* Identity & role now come from the authenticated SESSION (`me`), not editable client
     state. `profile` keeps the extra editable fields (photo, phone, credentials), scoped to
     this user; identity fields from `me` always win. */
  const [profile, setProfile] = useServerState('profile', { ...D.USER }, 'user', uid);
  const updateProfile = useCallback((patch: any) => setProfile((p: any) => {
    const merged = { ...D.USER, ...p, ...(typeof patch === 'function' ? patch(p) : patch) };
    return merged;
  }), [setProfile]);
  /* capability check — same SSOT the server enforces with (rbac.js), so UI never diverges. */
  const can = useCallback((cap: any) => rbacCan(me.role, cap), [me.role]);
  /* act-as role switching is removed in W7 — role is whoever you logged in as. Kept as a
     warning shim so any lingering caller (settings UI, until Fase 3) doesn't crash. */
  const setRole = useCallback(() => {
    console.warn('[W7] setRole is disabled — role is determined by the authenticated session.');
  }, []);
  const auth = useMemo(() => ({
    user: { ...D.USER, ...profile, id: me.id, name: me.name, initials: me.initials, email: me.email, role: me.role },
    profile: { ...D.USER, ...profile },
    setProfile, updateProfile,
    firm: D.FIRM, signedIn: true, role: me.role, setRole, can,
    logout: onLogout, twoFactorEnabled: !!me.totpEnabled,
  }), [profile, me, can, setRole, onLogout]);

  /* ---- Firm: clients + engagements + active selection ---- */
  const [clients, setClients] = useServerState('clients', D.CLIENTS, 'firm', FIRM_SCOPE_ID);
  const [engagements, setEngagements] = useServerState('engagements', D.ENGAGEMENTS, 'firm', FIRM_SCOPE_ID);
  const [activeEngagementId, setActiveEngagementId] = useServerState('activeEng', DEFAULT_ENG_ID, 'user', uid);

  /* ---- W7.5: per-engagement access set (server-filtered engagement.list) ----
     null = unknown/offline → don't restrict the UI (server still enforces isolation;
     this only shapes the switcher so users aren't offered engagements they can't load). */
  const [accessibleEngIds, setAccessibleEngIds] = useState(null);
  useEffect(() => {
    let live = true;
    (api as any).engagement.list.query()
      .then((rows: any) => { if (live) setAccessibleEngIds(rows.map((r: any) => r.id)); })
      .catch(() => { if (live) setAccessibleEngIds(null); });
    return () => { live = false; };
  }, [uid]);
  const canAccessEngagement = useCallback(
    (id: any) => !accessibleEngIds || accessibleEngIds.includes(id),
    [accessibleEngIds]
  );
  /* Guarded switcher — refuse to activate an engagement the user may not access. */
  const selectEngagement = useCallback((id: any) => {
    if (accessibleEngIds && !accessibleEngIds.includes(id)) return;
    setActiveEngagementId(id);
  }, [accessibleEngIds, setActiveEngagementId]);
  /* If the active engagement falls outside the accessible set (e.g. stale default for a
     non-member), move to the first allowed one so the workspace never shows a dead engagement. */
  useEffect(() => {
    if (accessibleEngIds && accessibleEngIds.length && !accessibleEngIds.includes(activeEngagementId)) {
      setActiveEngagementId(accessibleEngIds[0]);
    }
  }, [accessibleEngIds, activeEngagementId, setActiveEngagementId]);

  const PHASE_STATUS = { Perencanaan: 'Planning', Eksekusi: 'Fieldwork', Finalisasi: 'Review', Arsip: 'Completed' };
  const setEngagementPhase = useCallback((id: any, phase: any) => setEngagements((list: any) => list.map((e: any) =>
    e.id === id ? { ...e, phase, status: (PHASE_STATUS as any)[phase] || e.status,
      progress: phase === 'Arsip' ? 100 : phase === 'Finalisasi' ? Math.max(e.progress, 85) : e.progress } : e)), []);

  const addClient = useCallback((c: any) => setClients((list: any) => [{ ...c }, ...list]), []);
  const updateClient = useCallback((id: any, patch: any) => setClients((list: any) => list.map((c: any) => c.id === id ? { ...c, ...patch } : c)), []);
  const addEngagement = useCallback((e: any) => setEngagements((list: any) => {
    const n = list.length + 8;
    const id = 'ENG-2025-0' + String(n).padStart(2, '0');
    return [{ id, fy: 'FY2025', status: 'Planning', phase: 'Perencanaan', progress: 5, actualHrs: 0, ...e }, ...list];
  }), []);

  const activeEngagement = useMemo(
    () => engagements.find((e: any) => e.id === activeEngagementId),
    [engagements, activeEngagementId]
  );
  const activeClient = useMemo(
    () => clients.find((c: any) => c.id === activeEngagement?.clientId),
    [clients, activeEngagement]
  );
  const clientById = useCallback((id: any) => clients.find((c: any) => c.id === id), [clients]);
  const engagementsForClient = useCallback(
    (id: any) => engagements.filter((e: any) => e.clientId === id), [engagements]
  );

  const firm = useMemo(() => ({
    clients, engagements, activeEngagement, activeClient,
    activeEngagementId, setActiveEngagementId: selectEngagement, clientById, engagementsForClient,
    addClient, updateClient, setEngagementPhase, addEngagement,
    accessibleEngagementIds: accessibleEngIds, canAccessEngagement,
    locked: activeEngagement?.phase === 'Arsip' || activeEngagement?.status === 'Completed',
  }), [clients, engagements, activeEngagement, activeClient, activeEngagementId, selectEngagement, clientById, engagementsForClient, addClient, updateClient, setEngagementPhase, addEngagement, accessibleEngIds, canAccessEngagement]);

  /* ---- Audit: documentation state for active engagement ---- */
  /* user-added AJEs carry structured `lines: [{code, name, debit, credit}]` */
  /* engagement-scoped: re-hydrate when the active engagement changes */
  const [aje, setAje] = useServerState('aje', D.AJE, 'engagement', activeEngagementId);
  const [risks, setRisks] = useServerState('risks', D.RISKS, 'engagement', activeEngagementId);
  const [wtbOverrides, setWtbOverrides] = useServerState('wtbOverrides', {}, 'engagement', activeEngagementId);
  const [wpState, setWpState] = useServerState('wpState', {}, 'engagement', activeEngagementId); // per-WP tickmarks / signoff
  const [reviewNotes, setReviewNotes] = useServerState('reviewNotes', D.REVIEW_NOTES || [], 'engagement', activeEngagementId);
  const [noteThreads, setNoteThreads] = useServerState('noteThreads', {}, 'engagement', activeEngagementId); // noteId -> [reply,...] overlay (works for module & WP notes)
  const [timeEntries, setTimeEntries] = useServerState('timeEntries', D.TIME_ENTRIES || [], 'engagement', activeEngagementId);
  const [taskState, setTaskState] = useServerState('taskState', {}, 'engagement', activeEngagementId); // taskId -> done
  const [logEntries, setLogEntries] = useServerState('logEntries', [], 'engagement', activeEngagementId);
  const logActivity = useCallback((e: any) => setLogEntries((list: any) => [{ ts: new Date().toISOString().slice(0, 16).replace('T', ' '), ...e }, ...list].slice(0, 50)), []);

  const addReviewNote = useCallback((note: any) => setReviewNotes((list: any) => [{ id: 'RN-' + Date.now(), status: 'open', author: 'Anindya P.', created: 'baru saja', type: 'review', engagementId: activeEngagementId, thread: [], ...note }, ...list]), [activeEngagementId]);
  const resolveReviewNote = useCallback((id: any) => setReviewNotes((list: any) => list.map((n: any) => n.id === id ? { ...n, status: n.status === 'open' ? 'resolved' : 'open' } : n)), []);
  const updateReviewNote = useCallback((id: any, patch: any) => setReviewNotes((list: any) => list.map((n: any) => n.id === id ? { ...n, ...patch } : n)), []);
  /* append a reply/comment/clearance to ANY note's conversation (keyed overlay) */
  const addNoteReply = useCallback((id: any, reply: any) => setNoteThreads((m: any) => ({ ...m, [id]: [...(m[id] || []), { when: 'baru saja', ...reply }] })), []);
  const addTimeEntry = useCallback((entry: any) => setTimeEntries((list: any) => [{ id: 'T-' + Date.now(), ...entry }, ...list]), []);
  const toggleTask = useCallback((id: any) => setTaskState((s: any) => ({ ...s, [id]: !s[id] })), []);
  /* P5 Fase 2 — catatan engagement aktif (turunan; konsumen berlingkup-engagement memakai ini) */
  const reviewNotesActive = useMemo(() => notesForEngagement(reviewNotes, activeEngagementId), [reviewNotes, activeEngagementId]);

  /* derive extra per-account adjustment from POSTED user AJEs (those with structured lines) */
  const userPostDeltas = useMemo(() => {
    const d = {};
    aje.forEach((a: any) => {
      if (a.status === 'Posted' && Array.isArray(a.lines)) {
        a.lines.forEach((ln: any) => { (d as any)[ln.code] = ((d as any)[ln.code] || 0) + ((+ln.debit || 0) - (+ln.credit || 0)); });
      }
    });
    return d;
  }, [aje]);

  const wtb = useMemo(() => D.WTB.map((r: any) => {
    const extra = userPostDeltas[r.code] || 0;
    const o = wtbOverrides[r.key] || {};
    const ajeVal = (o.aje != null ? o.aje : r.aje) + extra;
    return { ...r, ...o, aje: ajeVal, adj: r.unadj + ajeVal };
  }), [wtbOverrides, userPostDeltas]);

  const toggleAjeStatus = useCallback((id: any) => {
    setAje((list: any) => list.map((a: any) => a.id === id
      ? { ...a, status: a.status === 'Posted' ? 'Proposed' : 'Posted' } : a));
  }, []);

  const addAje = useCallback((entry: any) => {
    setAje((list: any) => {
      const n = list.length + 1;
      const id = 'AJE-' + String(n).padStart(2, '0');
      return [...list, { id, status: 'Posted', ...entry }];
    });
  }, []);

  const updateRisk = useCallback((id: any, patch: any) => {
    setRisks((list: any) => list.map((r: any) => r.id === id ? { ...r, ...patch } : r));
  }, []);

  const setWp = useCallback((ref: any, patch: any) => setWpState((s: any) => ({ ...s, [ref]: { ...(s[ref] || {}), ...patch } })), []);

  // totals
  const ajeTotalPosted = useMemo(
    () => aje.filter((a: any) => a.status === 'Posted').reduce((s: any, a: any) => s + a.amount, 0), [aje]);

  const audit = useMemo(() => ({
    aje, setAje, toggleAjeStatus, addAje, ajeTotalPosted,
    risks, updateRisk,
    wtb, wtbOverrides, setWtbOverrides,
    wpState, setWp,
    reviewNotes, reviewNotesActive, addReviewNote, resolveReviewNote, updateReviewNote,
    noteThreads, addNoteReply,
    timeEntries, addTimeEntry,
    taskState, toggleTask,
    logEntries, logActivity,
    workpapers: D.WORKPAPERS, team: D.TEAM, activity: D.ACTIVITY, deadlines: D.DEADLINES,
  }), [aje, toggleAjeStatus, addAje, ajeTotalPosted, risks, updateRisk, wtb, wtbOverrides, wpState, setWp, reviewNotes, reviewNotesActive, addReviewNote, resolveReviewNote, updateReviewNote, noteThreads, addNoteReply, timeEntries, addTimeEntry, taskState, toggleTask, logEntries, logActivity]);

  return (
    <AuthContext.Provider value={auth}>
      <FirmContext.Provider value={firm}>
        <AuditContext.Provider value={audit}>
          {children}
          <ConflictToaster />
        </AuditContext.Provider>
      </FirmContext.Provider>
    </AuthContext.Provider>
  );
}

Object.assign(window, {
  AuthContext, FirmContext, AuditContext, NavContext, NavFromContext,
  useAuth, useFirm, useAudit, useNav, useNavFrom, AppProviders, clearPersisted,
  notesForEngagement,
});
window.clearPersisted = clearPersisted;


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { AppProviders, AuditContext, AuthContext, FirmContext, NavContext, NavFromContext, clearPersisted, notesForEngagement, useAudit, useAuth, useFirm, useNav, useNavFrom };
export { useAmsPersist };
