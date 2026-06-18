/* [codemod] ESM imports */
import React from 'react';
import { api, isConflict } from './api.js';

/* ============================================================
   NeoSuite AMS — React Context providers
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
function notesForEngagement(notes, engId) {
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
function userScopeId() { try { return (window.AMS && window.AMS.USER && window.AMS.USER.employeeId) || 'USER-1'; } catch (e) { return 'USER-1'; } }
const DEFAULT_ENG_ID = 'ENG-2025-014';

/* Public useAmsPersist (module state) defaults to firm scope — i.e. today's
   "one global doc", now shared across browsers — so no module changes behavior.
   Only keys that must DIVERGE per engagement are listed here. Keys that already
   embed the engagement id in their string (e.g. opinionDoc.<engId>) stay firm. */
const AMS_PERSIST_SCOPE = {
  'diagnostics.v1': 'engagement',
  'aiInsights.v1': 'engagement',
};

const SYNC_DEBOUNCE_MS = 400;

function cacheRead(cacheKey, legacyKey, initial) {
  try { const s = localStorage.getItem(cacheKey); if (s != null) return JSON.parse(s); } catch (e) {}
  // one-time fallback to the pre-W6 unscoped key so existing local edits survive the upgrade
  if (legacyKey) { try { const s = localStorage.getItem(legacyKey); if (s != null) return JSON.parse(s); } catch (e) {} }
  return typeof initial === 'function' ? initial() : initial;
}
function cacheWrite(cacheKey, val) { try { localStorage.setItem(cacheKey, JSON.stringify(val)); } catch (e) {} }

/* The engine. Returns [val, setVal] with the SAME contract as the old hook,
   including functional updates (setVal(prev => next)), which the app uses widely. */
function useServerState(key, initial, scope, scopeId) {
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
    api.state.get.query({ scope, scopeId, key }).then(res => {
      if (cancelled) return;
      versionRef.current = res.version;
      if (res.version > 0) { setValRaw(res.value); cacheWrite(cacheKey, res.value); }
    }).catch(() => { /* offline / no server: keep the cache */ });
    return () => { cancelled = true; };
  }, [scope, scopeId, key]);

  const flush = React.useCallback((value) => {
    const t = targetRef.current;
    api.state.set.mutate({ scope: t.scope, scopeId: t.scopeId, key: t.key, value, baseVersion: versionRef.current, updatedBy: userScopeId() })
      .then(res => { versionRef.current = res.version; })
      .catch(err => {
        // Lost an optimistic-concurrency race → adopt the server's value.
        // (Fase 2 surfaces this as a conflict toast; here we silently reconcile.)
        if (isConflict(err)) {
          api.state.get.query({ scope: t.scope, scopeId: t.scopeId, key: t.key }).then(res => {
            versionRef.current = res.version;
            if (res.version > 0) { setValRaw(res.value); cacheWrite(t.cacheKey, res.value); }
          }).catch(() => {});
        }
        /* other errors (offline): cache already holds the value; the next edit retries */
      });
  }, []);

  const setVal = React.useCallback((next) => {
    setValRaw(prev => {
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
function useAmsPersist(key, initial) {
  const scope = AMS_PERSIST_SCOPE[key] || 'firm';
  const firm = useFirm(); // always called (rules-of-hooks); null outside provider
  const scopeId = scope === 'engagement'
    ? ((firm && firm.activeEngagementId) || DEFAULT_ENG_ID)
    : (scope === 'user' ? userScopeId() : FIRM_SCOPE_ID);
  return useServerState(key, initial, scope, scopeId);
}
window.useAmsPersist = useAmsPersist;

function AppProviders({ children }) {
  const D = window.AMS;
  const uid = userScopeId();

  /* ---- Auth ---- */
  /* profile is the SINGLE SOURCE OF TRUTH for user identity (name, photo, credentials).
     Edited from Pengaturan › Profil & Akun; reflected everywhere (TopBar, sign-offs, menus). */
  const [profile, setProfile] = useServerState('profile', { ...D.USER }, 'user', uid);
  const [role, setRole] = useServerState('role', D.USER.role, 'user', uid);
  const updateProfile = useCallback((patch) => setProfile(p => {
    const merged = { ...D.USER, ...p, ...(typeof patch === 'function' ? patch(p) : patch) };
    return merged;
  }), [setProfile]);
  const auth = useMemo(() => ({
    user: { ...D.USER, ...profile, role },
    profile: { ...D.USER, ...profile },
    setProfile, updateProfile,
    firm: D.FIRM, signedIn: true, role, setRole,
  }), [profile, role]);

  /* ---- Firm: clients + engagements + active selection ---- */
  const [clients, setClients] = useServerState('clients', D.CLIENTS, 'firm', FIRM_SCOPE_ID);
  const [engagements, setEngagements] = useServerState('engagements', D.ENGAGEMENTS, 'firm', FIRM_SCOPE_ID);
  const [activeEngagementId, setActiveEngagementId] = useServerState('activeEng', DEFAULT_ENG_ID, 'user', uid);

  const PHASE_STATUS = { Perencanaan: 'Planning', Eksekusi: 'Fieldwork', Finalisasi: 'Review', Arsip: 'Completed' };
  const setEngagementPhase = useCallback((id, phase) => setEngagements(list => list.map(e =>
    e.id === id ? { ...e, phase, status: PHASE_STATUS[phase] || e.status,
      progress: phase === 'Arsip' ? 100 : phase === 'Finalisasi' ? Math.max(e.progress, 85) : e.progress } : e)), []);

  const addClient = useCallback((c) => setClients(list => [{ ...c }, ...list]), []);
  const updateClient = useCallback((id, patch) => setClients(list => list.map(c => c.id === id ? { ...c, ...patch } : c)), []);
  const addEngagement = useCallback((e) => setEngagements(list => {
    const n = list.length + 8;
    const id = 'ENG-2025-0' + String(n).padStart(2, '0');
    return [{ id, fy: 'FY2025', status: 'Planning', phase: 'Perencanaan', progress: 5, actualHrs: 0, ...e }, ...list];
  }), []);

  const activeEngagement = useMemo(
    () => engagements.find(e => e.id === activeEngagementId),
    [engagements, activeEngagementId]
  );
  const activeClient = useMemo(
    () => clients.find(c => c.id === activeEngagement?.clientId),
    [clients, activeEngagement]
  );
  const clientById = useCallback(id => clients.find(c => c.id === id), [clients]);
  const engagementsForClient = useCallback(
    id => engagements.filter(e => e.clientId === id), [engagements]
  );

  const firm = useMemo(() => ({
    clients, engagements, activeEngagement, activeClient,
    activeEngagementId, setActiveEngagementId, clientById, engagementsForClient,
    addClient, updateClient, setEngagementPhase, addEngagement,
    locked: activeEngagement?.phase === 'Arsip' || activeEngagement?.status === 'Completed',
  }), [clients, engagements, activeEngagement, activeClient, activeEngagementId, clientById, engagementsForClient, addClient, updateClient, setEngagementPhase, addEngagement]);

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
  const logActivity = useCallback((e) => setLogEntries(list => [{ ts: new Date().toISOString().slice(0, 16).replace('T', ' '), ...e }, ...list].slice(0, 50)), []);

  const addReviewNote = useCallback((note) => setReviewNotes(list => [{ id: 'RN-' + Date.now(), status: 'open', author: 'Anindya P.', created: 'baru saja', type: 'review', engagementId: activeEngagementId, thread: [], ...note }, ...list]), [activeEngagementId]);
  const resolveReviewNote = useCallback((id) => setReviewNotes(list => list.map(n => n.id === id ? { ...n, status: n.status === 'open' ? 'resolved' : 'open' } : n)), []);
  const updateReviewNote = useCallback((id, patch) => setReviewNotes(list => list.map(n => n.id === id ? { ...n, ...patch } : n)), []);
  /* append a reply/comment/clearance to ANY note's conversation (keyed overlay) */
  const addNoteReply = useCallback((id, reply) => setNoteThreads(m => ({ ...m, [id]: [...(m[id] || []), { when: 'baru saja', ...reply }] })), []);
  const addTimeEntry = useCallback((entry) => setTimeEntries(list => [{ id: 'T-' + Date.now(), ...entry }, ...list]), []);
  const toggleTask = useCallback((id) => setTaskState(s => ({ ...s, [id]: !s[id] })), []);
  /* P5 Fase 2 — catatan engagement aktif (turunan; konsumen berlingkup-engagement memakai ini) */
  const reviewNotesActive = useMemo(() => notesForEngagement(reviewNotes, activeEngagementId), [reviewNotes, activeEngagementId]);

  /* derive extra per-account adjustment from POSTED user AJEs (those with structured lines) */
  const userPostDeltas = useMemo(() => {
    const d = {};
    aje.forEach(a => {
      if (a.status === 'Posted' && Array.isArray(a.lines)) {
        a.lines.forEach(ln => { d[ln.code] = (d[ln.code] || 0) + ((+ln.debit || 0) - (+ln.credit || 0)); });
      }
    });
    return d;
  }, [aje]);

  const wtb = useMemo(() => D.WTB.map(r => {
    const extra = userPostDeltas[r.code] || 0;
    const o = wtbOverrides[r.key] || {};
    const ajeVal = (o.aje != null ? o.aje : r.aje) + extra;
    return { ...r, ...o, aje: ajeVal, adj: r.unadj + ajeVal };
  }), [wtbOverrides, userPostDeltas]);

  const toggleAjeStatus = useCallback((id) => {
    setAje(list => list.map(a => a.id === id
      ? { ...a, status: a.status === 'Posted' ? 'Proposed' : 'Posted' } : a));
  }, []);

  const addAje = useCallback((entry) => {
    setAje(list => {
      const n = list.length + 1;
      const id = 'AJE-' + String(n).padStart(2, '0');
      return [...list, { id, status: 'Posted', ...entry }];
    });
  }, []);

  const updateRisk = useCallback((id, patch) => {
    setRisks(list => list.map(r => r.id === id ? { ...r, ...patch } : r));
  }, []);

  const setWp = useCallback((ref, patch) => setWpState(s => ({ ...s, [ref]: { ...(s[ref] || {}), ...patch } })), []);

  // totals
  const ajeTotalPosted = useMemo(
    () => aje.filter(a => a.status === 'Posted').reduce((s, a) => s + a.amount, 0), [aje]);

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
