/* [codemod] ESM imports */
import React from 'react';

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

/* persisted state hook — JSON-serialized to localStorage under ams.<key> */
function usePersisted(key, initial) {
  const sk = 'ams.v1.' + key;
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem(sk); if (s != null) return JSON.parse(s); } catch (e) {}
    return typeof initial === 'function' ? initial() : initial;
  });
  useEffect(() => { try { localStorage.setItem(sk, JSON.stringify(val)); } catch (e) {} }, [val]);
  return [val, setVal];
}
function clearPersisted() {
  try { Object.keys(localStorage).filter(k => k.startsWith('ams.v1.') || k.startsWith('ams.')).forEach(k => localStorage.removeItem(k)); } catch (e) {}
}
/* standalone persisted-state hook for modules outside the providers */
function useAmsPersist(key, initial) {
  const sk = 'ams.v1.' + key;
  const [val, setVal] = React.useState(() => {
    try { const s = localStorage.getItem(sk); if (s != null) return JSON.parse(s); } catch (e) {}
    return typeof initial === 'function' ? initial() : initial;
  });
  React.useEffect(() => { try { localStorage.setItem(sk, JSON.stringify(val)); } catch (e) {} }, [val]);
  return [val, setVal];
}
window.useAmsPersist = useAmsPersist;

function AppProviders({ children }) {
  const D = window.AMS;

  /* ---- Auth ---- */
  /* profile is the SINGLE SOURCE OF TRUTH for user identity (name, photo, credentials).
     Edited from Pengaturan › Profil & Akun; reflected everywhere (TopBar, sign-offs, menus). */
  const [profile, setProfile] = usePersisted('profile', { ...D.USER });
  const [role, setRole] = usePersisted('role', D.USER.role);
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
  const [clients, setClients] = usePersisted('clients', D.CLIENTS);
  const [engagements, setEngagements] = usePersisted('engagements', D.ENGAGEMENTS);
  const [activeEngagementId, setActiveEngagementId] = usePersisted('activeEng', 'ENG-2025-014');

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
  const [aje, setAje] = usePersisted('aje', D.AJE);
  const [risks, setRisks] = usePersisted('risks', D.RISKS);
  const [wtbOverrides, setWtbOverrides] = usePersisted('wtbOverrides', {});
  const [wpState, setWpState] = usePersisted('wpState', {}); // per-WP tickmarks / signoff
  const [reviewNotes, setReviewNotes] = usePersisted('reviewNotes', D.REVIEW_NOTES || []);
  const [noteThreads, setNoteThreads] = usePersisted('noteThreads', {}); // noteId -> [reply,...] overlay (works for module & WP notes)
  const [timeEntries, setTimeEntries] = usePersisted('timeEntries', D.TIME_ENTRIES || []);
  const [taskState, setTaskState] = usePersisted('taskState', {}); // taskId -> done
  const [logEntries, setLogEntries] = usePersisted('logEntries', []);
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
