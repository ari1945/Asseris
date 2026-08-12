/* [codemod] ESM imports */
import React from 'react';
import { api, isConflict, hydrateCoreFromApi } from './api';
import { can as rbacCan } from './rbac';
import { AMS } from './data';
import { ENG_RISK_SEED } from './data_part1';
import { applyMapping } from './wtb_mapping';
import { overlayWtbOverrides } from './wtb_overrides';
import { mergeLegacyFlux } from './flux_state';
import { parseHash } from './route_hash';
import { DEFAULT_ENG_ID, FIRM_SCOPE_ID } from './persist_scope';
import { materialityFor } from './canon_selectors';
/* PR-1 (prd-wp-signoff-integrity) — `amsShortName` pindah ke modul murni agar
   server dapat memakainya; di-re-export dari sini supaya seluruh pengimpor lama
   (view_wp, view_workspace, window) tak berubah sama sekali. */
import { amsShortName } from './identity';
/* PR-1 — kontrak jurnal (imutabilitas Posted, pembalikan, penomoran id).
   Modul yang SAMA dipakai server (`server/src/signoff.ts`). */
import { nextAjeId, reverseEntryFrom } from './aje_contract';
import type { AjeContractEntry } from './aje_contract';
import { nowStamp } from './aje_approval';
import { benchmarksFromWTB } from './canon_base';
import { engagementBenchmarks } from './canon_part3';
import type { AjeRow, MaterialityConfig, MaterialityResult, WTB, WtbRow } from './canon_types';
import type { ActivityItem, DeadlineRow, ReviewNote, RiskRow, TeamMember, TimeEntry, WorkpaperRow } from './ams_types';
import type { WtbOverrideEntry } from './wtb_overrides';
import type { FluxState } from './flux_state';
import type { PriorYearSource } from './prior_year';
import type { ImportedWtbRow, ParseMeta } from './wtb_import';
import type { LedgerLine } from './wtb_ledger';

/* ============================================================
   Asseris — React Context providers
   AuthContext · FirmContext · AuditContext
   ============================================================ */
const { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } = React;

/* ============================================================
   PR-6b · K9 — BENTUK nilai AuditContext dipaku saat compile.
   ------------------------------------------------------------
   Nilai konteks ini tak bertipe, dan field yang lupa dimasukkan ke objek nilai
   (tetapi sudah masuk array deps `useMemo`) LOLOS typecheck + lint lalu gagal
   SENYAP saat runtime — sudah dua kali menggigit (PR-4 dan PR-5).
   Daftar di bawah memaku KEBERADAAN setiap field: objek nilai di-annotate
   `(): AuditContextShape`, jadi field yang hilang ATAU field baru yang belum
   didaftarkan = typecheck GAGAL.
   BATAS JUJUR: yang dipaku baru nama field, bukan tipe nilainya (`unknown`), dan
   `useAudit()` sengaja TETAP longgar agar ~100 call-site tak perlu disentuh di PR
   ini. Mengetik nilainya secara presisi (Q1) adalah pekerjaan tersendiri —
   dengan `unknown` ia akan menyebar ke seluruh konsumen. */
/** setter `useServerState` — menerima nilai ATAU pembaruan fungsional. */
type Setter<T> = (next: T | ((prev: T) => T)) => void;

/* Bentuk baris WTB seperti yang BENAR-BENAR dipakai view: `WtbRow` kanonik hanya
   mendeklarasikan field yang dibaca canon (code/adj/unadj/ly/aje), sementara view juga
   membaca `group`/`lead`/`leadSrc`/`fs`. Tanpa perluasan ini, mengetik `wtb: WTB` akan
   menggagalkan ratusan akses field yang sah. */
interface AuditWtbRow extends WtbRow {
  group?: string;
  lead?: string;
  leadSrc?: string;
  fs?: string;
  [k: string]: unknown;
}

/* PR-6d — status per kertas kerja. Field daun DIDEKLARASIKAN: dengan `[k: string]: unknown`
   saja, `st.chain.preparer` tetap gagal karena `st.chain` bertipe `unknown`. Ini bentuk yang
   benar-benar ditulis `setWp()` & dibaca wp_signoff/view_wp/view_workspace. */
interface WpSignEntry { by?: string; at?: string; [k: string]: unknown }
interface WpNote { id?: string; text?: string; disposition?: string; by?: string; at?: string; status?: string; [k: string]: unknown }
interface WpExecStep { items?: { result?: string; [k: string]: unknown }[]; concl?: string; [k: string]: unknown }
interface WpStateEntry {
  chain?: { preparer?: WpSignEntry | null; reviewer?: WpSignEntry | null; partner?: WpSignEntry | null; eqr?: WpSignEntry | null; [k: string]: WpSignEntry | null | undefined };
  procs?: Record<string, unknown>;
  noteStatus?: Record<string, string>;
  ticks?: Record<string, string>;
  exec?: Record<string, WpExecStep>;
  asrConcl?: Record<string, { by?: string; at?: string; [k: string]: unknown }>;
  evidence?: unknown[];
  notes?: WpNote[];
  /** kesimpulan auditor (P1) — dipersist ke `wpState[ref].conclusion` */
  conclusion?: { text?: string; disposition?: string; by?: string; at?: string } | null;
  status?: string;
  reviewer?: string | null;
  signedAt?: string | null;
  [k: string]: unknown;
}
interface NoteReply { when?: string; [k: string]: unknown }
interface LogEntry { ts?: string; [k: string]: unknown }

/* Jurnal penyesuaian seperti dipakai view: `AjeRow` kanonik hanya mendeklarasikan
   id/amount/status/desc, sementara view juga membaca baris jurnal & referensi. */
interface AuditAjeRow extends AjeRow {
  dr?: string;
  cr?: string;
  ref?: string;
  lines?: { code: string; debit?: number; credit?: number; [k: string]: unknown }[];
  [k: string]: unknown;
}

/* Dokumen impor neraca saldo (W-WTB·1 + provenans PR-5). Field disebut eksplisit
   supaya konsumen tak jatuh ke `unknown` pada akses yang sah. */
interface WtbImportDoc {
  rows?: ImportedWtbRow[];
  source?: string;
  unit?: string;
  period?: string;
  balanced?: boolean;
  sha256?: string;
  sha256Excerpt?: string;
  rawExcerpt?: string;
  rawLength?: number;
  excerptLength?: number;
  by?: string;
  at?: string;
  importedAt?: string;
  meta?: ParseMeta;
  [k: string]: unknown;
}

/** PR-6d — nilai `AuditContext` yang BERTIPE (menggantikan pemaku bentuk PR-6b). */
export interface AuditContextValue {
  matConfig: MaterialityConfig;
  setMatConfig: (patch: Partial<MaterialityConfig>) => void;
  /* Tahap 8 — pemicu hidrasi manual untuk state berat yang di-defer. */
  hydrateAuditKey: (key: string) => void;
  aje: AuditAjeRow[];
  setAje: Setter<AuditAjeRow[]>;
  /* PR-B — antrean persetujuan meneruskan jejak keputusan (`by`/`approvalId`)
     agar tulis-balik status jurnal dapat dicatat; tanda tangan mengikuti
     implementasi, bukan sebaliknya. */
  toggleAjeStatus: (id: string, meta?: { by?: string; approvalId?: string }) => void;
  addAje: (entry: Partial<AuditAjeRow>) => void;
  /* PR-1 — menyunting jurnal ditolak bila ia sudah `Posted` (mengembalikan
     false); koreksi ditempuh lewat `reverseAje`, yang mengembalikan id jurnal
     balik yang baru diajukan. Keduanya lapis klien dari aturan server
     `posted-immutable` — bukan penggantinya. */
  updateAje: (id: string, patch: Record<string, unknown>) => boolean;
  reverseAje: (id: string, meta: { reason: string; by?: string }) => string | null;
  ajeTotalPosted: number;
  risks: RiskRow[];
  updateRisk: (id: string, patch: Partial<RiskRow>) => void;
  wtb: AuditWtbRow[];
  wtbOverrides: Record<string, WtbOverrideEntry>;
  setWtbOverrides: Setter<Record<string, WtbOverrideEntry>>;
  wtbImport: WtbImportDoc | null;
  setWtbImport: Setter<WtbImportDoc | null>;
  wtbMapping: Record<string, string>;
  setWtbMapping: Setter<Record<string, string>>;
  wtbLedger: Record<string, LedgerLine[]>;
  setWtbLedger: Setter<Record<string, LedgerLine[]>>;
  fluxState: FluxState;
  setFluxState: Setter<FluxState>;
  fluxThreshold: { absJt: number | null; pctThr: number };
  setFluxThreshold: Setter<{ absJt: number | null; pctThr: number }>;
  wtbLeads: Record<string, string>;
  setWtbLeads: Setter<Record<string, string>>;
  priorYearBalances: PriorYearSource | null;
  setPriorYearBalances: Setter<PriorYearSource | null>;
  wpState: Record<string, WpStateEntry>;
  setWp: (ref: string, patch: Record<string, unknown>) => void;
  reviewNotes: ReviewNote[];
  reviewNotesActive: ReviewNote[];
  addReviewNote: (note: Partial<ReviewNote>) => void;
  resolveReviewNote: (id: string) => void;
  updateReviewNote: (id: string, patch: Partial<ReviewNote>) => void;
  noteThreads: Record<string, NoteReply[]>;
  addNoteReply: (id: string, reply: Partial<NoteReply>) => void;
  timeEntries: TimeEntry[];
  addTimeEntry: (entry: Partial<TimeEntry>) => void;
  taskState: Record<string, boolean>;
  toggleTask: (id: string) => void;
  logEntries: LogEntry[];
  logActivity: (e: Partial<LogEntry>) => void;
  workpapers: WorkpaperRow[];
  team: TeamMember[];
  activity: ActivityItem[];
  deadlines: DeadlineRow[];
}

type AuditContextShape = { [K in
  | 'matConfig' | 'setMatConfig' | 'hydrateAuditKey'
  | 'aje' | 'setAje' | 'toggleAjeStatus' | 'setAjeStatus' | 'addAje' | 'ajeTotalPosted'
  | 'updateAje' | 'reverseAje'
  | 'risks' | 'updateRisk'
  | 'wtb' | 'wtbOverrides' | 'setWtbOverrides' | 'wtbImport' | 'setWtbImport'
  | 'wtbMapping' | 'setWtbMapping' | 'wtbLedger' | 'setWtbLedger'
  | 'fluxState' | 'setFluxState' | 'fluxThreshold' | 'setFluxThreshold'
  | 'wtbLeads' | 'setWtbLeads' | 'priorYearBalances' | 'setPriorYearBalances'
  | 'wpState' | 'setWp'
  | 'reviewNotes' | 'reviewNotesActive' | 'addReviewNote' | 'resolveReviewNote' | 'updateReviewNote'
  | 'noteThreads' | 'addNoteReply'
  | 'timeEntries' | 'addTimeEntry'
  | 'taskState' | 'toggleTask'
  | 'logEntries' | 'logActivity'
  | 'workpapers' | 'team' | 'activity' | 'deadlines'
]: unknown };

const AuthContext  = createContext(null);
const FirmContext  = createContext(null);
const AuditContext = createContext(null);
const NavContext   = createContext(() => {});
const NavFromContext = createContext(null);

const useAuth  = () => useContext(AuthContext);
const useFirm  = () => useContext(FirmContext);
/* PR-6d — nilai konteks kini BERTIPE bagi konsumen. Cast eksplisit dipakai (bukan
   `AuditContextValue | null`) agar ~100 call-site tak perlu guard baru: risiko runtime
   TIDAK berubah dari sebelumnya — akses tanpa guard sudah jadi praktik di seluruh view,
   dan modul yang dirender di luar provider tetap gagal seperti dulu. Yang berubah:
   salah-ketik nama field & salah-pakai tipe kini gagal di gerbang, bukan saat runtime. */
const useAudit = (): AuditContextValue => useContext(AuditContext) as unknown as AuditContextValue;

/**
 * Tahap 8 — akses state audit BERAT secara lazy (hidrasi ditunda).
 *
 * Kunci berat (wtbLedger, reviewNotes, noteThreads, timeEntries, taskState,
 * logEntries) tidak lagi di-GET server saat boot. Modul yang benar-benar
 * memakainya memanggil hook ini pada mount; hook mengembalikan nilai konteks
 * yang SAMA (kontrak destructuring tidak berubah) sambil memicu hidrasi server
 * untuk kunci yang diminta — sekali per (scope, scopeId, key).
 */
export function useAuditHeavy(keys: string[] = []): AuditContextValue {
  const audit = useAudit();
  const hydrate = (audit as unknown as { hydrateAuditKey?: (key: string) => void }).hydrateAuditKey;
  useEffect(() => {
    if (typeof hydrate !== 'function') return;
    keys.forEach((k) => hydrate(k));
  }, [hydrate, keys.join(',')]);
  return audit;
}

/**
 * PR-6b — SATU pintu materialitas untuk view (SA 320).
 *
 * Mengirim konfigurasi yang SUDAH ter-hidrasi dari server ke canon secara eksplisit,
 * sehingga hasilnya (a) tak bergantung pada modul mana yang sudah pernah dibuka di
 * browser itu, dan (b) REAKTIF — begitu hidrasi/suntingan mendarat, seluruh permukaan
 * ikut berubah tanpa reload. Konsumen JANGAN memanggil `materialityFor()` langsung
 * (jalur cache; lihat uji invarian `materiality_single_door.test.ts`).
 */
function useMateriality(): MaterialityResult {
  /* tipe struktural minimal — BUKAN `any`: satu `any` baru di berkas ini
     meng-un-suppress seluruh berkas pada ratchet ESLint. */
  const firm = useFirm() as { activeEngagement?: { id?: string; materiality?: number } | null } | null;
  const audit = useAudit() as { matConfig?: MaterialityConfig; wtb?: WTB } | null;
  const eng = (firm && firm.activeEngagement) || null;
  const cfg = (audit && audit.matConfig) || undefined;
  /* PR-A — tabel benchmark SA 320 ditarik dari WTB perikatan aktif, bukan lagi
     konstanta `window.BENCHMARKS` (PBT 85.200 jt yang tak pernah menyentuh buku
     besar; turunan WTB memberi 29.690 jt → OM kelebihan 2,87×). Basis `unadj` =
     figur dilaporkan klien, dasar penetapan SA 320 ¶10; basis `adj` sengaja TIDAK
     dipakai agar memposting AJE tidak menggeser ambang yang menilai AJE itu sendiri
     (sirkularitas — lihat PRD PR-A §11 Q2). */
  const wtb = (audit && audit.wtb) || undefined;
  /* SA 600 PR-3b — perikatan ini mengaudit LK KONSOLIDASIAN (Opsi A), sehingga
     benchmark SA 320 ditarik dari figur GRUP, bukan saldo standalone induk.
     Basis `unadj` dipertahankan sampai ke dasar konsolidasi (`psak65(…, 'unadj')`),
     sehingga sifat anti-sirkularitas PR-A tetap berlaku: memposting AJE tidak
     menggeser ambang yang menilai AJE itu sendiri.
     Fallback ke figur induk bila konsolidasi tak tersedia (WTB kosong/headless) —
     lebih baik ambang standalone daripada tanpa ambang sama sekali. */
  const benchmarks = useMemo(() => engagementBenchmarks(wtb), [wtb]);
  return useMemo(
    () => materialityFor({ engMateriality: eng ? eng.materiality : undefined, engagementId: eng ? eng.id : undefined, config: cfg, benchmarks }),
    [eng, cfg, benchmarks],
  );
}
const useNav   = () => useContext(NavContext);
const useNavFrom = () => useContext(NavFromContext);

/* ============================================================
   Identitas auditor saat ini — jembatan sesi → data demo.
   `amsShortName` kini tinggal di `identity.ts` (modul murni, dipakai bersama
   server sejak PR-2); ia diimpor di atas dan di-re-export di akhir berkas ini
   agar My Tasks & Review Notes tetap dapat memfilter "milik saya" dari user
   sesi nyata, bukan string hardcode. */
/* Hook: nama singkat auditor login aktif (untuk filter kepemilikan tugas/catatan). */
function useCurrentAuditor() {
  const auth = useAuth();
  const full = (auth && auth.user && auth.user.name) || (AMS && AMS.USER && AMS.USER.name) || '';
  return { full, short: amsShortName(full) };
}

/* Deep-link tab (PRD 2026-07-18): `navigate(id, { tab })` menaruh one-shot
   `sessionStorage['ams.navtab.<id>']`; modul bertab memakai
   `useInitialTab(moduleId, fallback)` untuk menyeed tab awalnya SEKALI — override
   default/last-used hanya saat tiba via deep-link, lalu MENGONSUMSI kunci (hapus)
   sehingga kunjungan/render berikutnya kembali ke perilaku normal. Drop-in
   pengganti `useState(fallback)`: mengembalikan tuple [nilai, setter] yang sama.
   `fallback` boleh nilai atau fungsi lazy (dievaluasi bila tak ada tab diminta). */
function useInitialTab(moduleId: string, fallback: unknown) {
  return useState(() => {
    /* PRD Fase B — URL lebih dulu: tautan yang dibagikan (`#/wtb?tab=drill`)
       harus membuka tab yang dimaksud, dan TIDAK dikonsumsi (alamat itu
       menetap, bukan sekali-pakai). Hanya berlaku bila hash menunjuk modul
       INI — supaya `?tab=` milik modul lain tak bocor ke sini.
       sessionStorage one-shot tetap ada sebagai jalur kedua: ia dipakai
       navigasi internal dan sudah teruji sejak PRD 2026-07-18. */
    try {
      const loc = parseHash(typeof location === 'undefined' ? '' : location.hash);
      if (loc && loc.route === moduleId && loc.tab != null) return loc.tab;
    } catch (e) { /* URL tak terbaca */ }
    try {
      const k = 'ams.navtab.' + moduleId;
      const v = sessionStorage.getItem(k);
      if (v != null) { sessionStorage.removeItem(k); return v; }
    } catch (e) { /* private mode / no sessionStorage */ }
    return typeof fallback === 'function' ? fallback() : fallback;
  });
}

/* Deep-link selection (sibling `useInitialTab`): `navigate(id, { sel })` menaruh
   one-shot `sessionStorage['ams.navsel.<id>']`; modul dengan register/daftar
   memakai `useInitialSelection(moduleId)` untuk mengetahui baris/entitas mana yang
   harus dibuka SEKALI saat tiba via deep-link, lalu MENGONSUMSI kuncinya (hapus).
   Kembalikan id terpilih (string) atau null bila bukan datang dari deep-link. */
function useInitialSelection(moduleId: string): string | null {
  const [v] = useState(() => {
    /* PRD Fase B — mengikuti presedens yang sama dengan useInitialTab: URL
       dulu (`#/continuance/CL-014`), lalu one-shot sessionStorage. */
    try {
      const loc = parseHash(typeof location === 'undefined' ? '' : location.hash);
      if (loc && loc.route === moduleId && loc.sel != null) return loc.sel;
    } catch (e) { /* URL tak terbaca */ }
    try {
      const k = 'ams.navsel.' + moduleId;
      const s = sessionStorage.getItem(k);
      if (s != null) { sessionStorage.removeItem(k); return s; }
    } catch (e) { /* private mode / no sessionStorage */ }
    return null;
  });
  return v as string | null;
}

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
/* FIRM_SCOPE_ID & DEFAULT_ENG_ID kini di-SSOT-kan di `persist_scope.ts` — canon
   (non-React) memerlukan konstanta yang sama untuk membaca cache terpersist (PR-1a). */
function userScopeId() { try { return (AMS && AMS.USER && AMS.USER.employeeId) || 'USER-1'; } catch (e) { return 'USER-1'; } }

/* Public useAmsPersist (module state) defaults to firm scope — i.e. today's
   "one global doc", now shared across browsers — so no module changes behavior.
   Only keys that must DIVERGE per engagement are listed here. Keys that already
   embed the engagement id in their string (e.g. opinionDoc.<engId>) stay firm. */
const AMS_PERSIST_SCOPE = {
  'diagnostics.v1': 'engagement',
  'aiInsights.v1': 'engagement',
  'jet.v1': 'engagement',
  'sampling.v1': 'engagement',
  'estimates.v1': 'engagement',
  'restatement.v1': 'engagement',
  'fraud.v1': 'engagement',
  /* Migrasi pola firm-scope laten (task lanjutan dari fraud.v1/sampling.v1):
     modul ini dulu menyandikan engId ke dalam string key (mis. 'goingconcern.'+engId)
     → tak cocok entri mana pun → default 'firm' → capForWrite('firm',key)=FIRM_ADMIN →
     hanya Engagement Partner bisa tulis; Manager/Senior/Junior ditolak server diam-diam.
     Key statis '<x>.v1' + scope engagement → isolasi dibawa scopeId (perikatan aktif),
     bukan mangling string; capForWrite=WP_EDIT (semua auditor) + isolasi W7.5. */
  'icfrMatrix.v1': 'engagement',
  'icfrDef.v1': 'engagement',
  'goingconcern.v1': 'engagement',
  'opinionDoc.v1': 'engagement',
  'noclar.v1': 'engagement',
  'tcwg.v1': 'engagement',
  'deficiencies.v1': 'engagement',
  'serviceorgs.v1': 'engagement',
  'experts.v1': 'engagement',
  /* Lanjutan migrasi yg sama untuk situs yg memakai ekspresi engId berbeda
     (eng.id / activeEngagement.id, bukan literal `engId`) → tak tertangkap grep awal. */
  /* PR-B — keputusan persetujuan (termasuk posting AJE ke WTB) BERLINGKUP PERIKATAN.
     Kunci lama `approvals_ov_v3` tak pernah terdaftar di sini sehingga jatuh ke lingkup
     FIRMA: keputusan atas jurnal satu klien tersimpan lintas-perikatan, tanpa isolasi
     W7.5. Dinaikkan ke v4 sekaligus agar migrasi lingkup tak menabrak data lama. */
  'approvals_ov_v4': 'engagement',
  'strategyTab.v1': 'engagement',
  'strategyApproach.v1': 'engagement',
  /* Persetujuan strategi (SA 300). Engagement-scope → capForWrite=WP_EDIT (semua auditor)
     + isolasi W7.5; otoritas reviewer (Partner/Manajer) ditegakkan server via guardSignoffWrite. */
  'strategyApproved.v1': 'engagement',
  'arMemo.v1': 'engagement',
  /* Audit Programme (RoMM → prosedur). Engagement-scope → capForWrite=WP_EDIT
     (semua auditor) + isolasi W7.5. Menyimpan daftar prosedur + status. */
  'programme.v1': 'engagement',
  /* Related Parties (SA 550): pengungkapan/harga-pasar/konfirmasi RPT & status
     prosedur bertahan lintas reload (override per-id atas register kanon). */
  'relatedTxn.v1': 'engagement',
  'relatedProcs.v1': 'engagement',
  /* Subsequent Events (SA 560): reklasifikasi peristiwa penyesuai↔non-penyesuai &
     status prosedur audit bertahan lintas reload (override per-id; seed=canon). */
  'subsequentClass.v1': 'engagement',
  'subsequentProcs.v1': 'engagement',
  /* Confirmation Hub (SA 505): kesimpulan kerja konfirmasi eksternal (override status/
     resp/validated + rekonsiliasi + prosedur alternatif + keandalan) bertahan lintas
     reload & terisolasi per-perikatan. Key statis '.v1' + scope engagement →
     capForWrite=WP_EDIT (semua auditor) + isolasi W7.5. Seed = CONFIRMATIONS. */
  'confirmState.v1': 'engagement',
  /* Independensi per-anggota tim (SA 220.16–24 · ISQM 1 · Kode Etik): deklarasi
     anggota × ancaman per perikatan. Engagement-scope → capForWrite=WP_EDIT (setiap
     anggota menandatangani baris-sendiri) + isolasi W7.5. Seed = seedDeclarations(roster). */
  'memberIndep.v1': 'engagement',
  /* Saldo Awal / Perikatan Tahun Pertama (SA 510): jenis perikatan, penilaian
     risiko berbobot, kesiapan komunikasi auditor pendahulu, pengaman & kesimpulan.
     Engagement-scope → capForWrite=WP_EDIT (semua auditor) + isolasi W7.5. */
  'opening.v1': 'engagement',
  /* F1/PR-3 (PRD 2026-07-19) — kertas kerja yang dulu useState murni (HILANG saat
     reload) kini bertahan di server. Semua engagement-scope → capForWrite=WP_EDIT
     (semua auditor) + isolasi W7.5.
     evidenceEval.v1 = skoring kecukupan/keandalan bukti (SA 500);
     sadItems/sadQual/sadMethod.v1 = ledger salah saji tak-terkoreksi + kualitatif + metode agregasi (SA 450);
     internalAudit.v1 = faktor evaluasi fungsi audit internal (SA 610);
     fluxState.v1 = analisis fluktuasi prosedur analitis (SA 520; memo = arMemo.v1);
     leaseOverride.v1 = override parameter sewa per-kontrak (PSAK 73);
     eclInputs.v1 = loss-rate per-bucket kalkulator ECL (PSAK 71). */
  'evidenceEval.v1': 'engagement',
  'sadItems.v1': 'engagement',
  'sadQual.v1': 'engagement',
  'sadMethod.v1': 'engagement',
  /* expertEval.v1 = evaluasi pekerjaan pakar SA 500 ¶8 / SA 620, dikunci per
     rujukan ('V-2' KJPP, 'V-3' derivatif, atau id estimasi SA 540 mis. 'E-04').
     Satu ruang nama karena pertanyaannya identik; yang beda hanya objeknya. */
  'expertEval.v1': 'engagement',
  'internalAudit.v1': 'engagement',
  'fluxState.v1': 'engagement',
  'leaseOverride.v1': 'engagement',
  'eclInputs.v1': 'engagement',
  /* PR-1a (PRD WTB 2026-07-25) — Materiality Workspace (SA 320). DUA cacat sekaligus:
     (1) materialitas adalah pertimbangan PER-PERIKATAN (SA 320 ¶10-11), tapi kunci ini
     dulu jatuh ke default 'firm' → satu setelan dipakai SELURUH perikatan, dan
     `mat.appliedOverride` yang berlabel "Terapkan ke Engagement" justru berlaku
     lintas-perikatan; (2) firm-scope tanpa cabang capForWrite = FIRM_ADMIN → hanya
     Rekan Pemimpin yang bisa menyimpan, suntingan Manajer/Senior gagal SENYAP (tampak
     tersimpan sampai reload) — kelas bug yang sama dengan priorYear & capacityPlan.v1.
     Engagement-scope menyelesaikan keduanya: capForWrite default = WP_EDIT + isolasi W7.5.
     Setelan lama yang tersimpan firm-scope tetap terbaca lewat rantai baca-lewat
     `readPersisted` (perikatan → firma → legacy) di persist_scope.ts — tanpa tulisan
     destruktif; tersalin ke tier perikatan saat pengguna menyimpan berikutnya.
     PR-6a — `mat.memo.signoff` KINI ikut pindah. #129 sengaja menahannya karena
     engagement-scope menurunkan capForWrite dari FIRM_ADMIN ke WP_EDIT, dan tanpa guard
     server itu berarti setiap auditor boleh menulis slot persetujuan. Prasyarat itu kini
     dipenuhi: `server/src/signoff.ts` punya entri `mat.memo.signoff` (SIGNOFF_KEYS +
     MAT_MEMO_SLOT_CAP) yang mem-diff per slot dan menuntut SIGNOFF_REVIEWER (manager) /
     OPINION_APPROVE (partner); `view_materiality_parts.tsx` men-gate tombolnya dgn
     `can()`. Yang firm-scope justru CACAT: satu nilai dipakai SEMUA perikatan, jadi
     menandatangani memo satu perikatan membuat memo perikatan lain tampak
     tertandatangani.
     BATAS JUJUR: tanda tangan firm-scope lama TIDAK terbawa. Rantai baca-lewat
     `readPersisted` hanya dipakai pembaca NON-REACT (canon) dan kunci ini tak punya
     pembaca canon; `useServerState` hanya membaca kunci lingkupnya sendiri + legacy
     tak-berlingkup. Itu justru perilaku yang benar: tanda tangan firm-scope tak dapat
     diatribusikan ke satu perikatan tertentu — itulah cacatnya — jadi ia harus
     ditandatangani ulang per perikatan oleh pemegang otoritas. Pada repo ini tak ada
     yang hilang: nilai firm-scope di server memang kosong (diverifikasi live). */
  'mat.benchId': 'engagement',
  'mat.pct': 'engagement',
  'mat.pmPct': 'engagement',
  'mat.cttPct': 'engagement',
  'mat.appliedOverride': 'engagement',
  'mat.quals': 'engagement',
  'mat.specifics': 'engagement',
  'mat.components': 'engagement',
  'mat.revisions': 'engagement',
  'mat.tab': 'engagement',
  'mat.memo.signoff': 'engagement',
  /* PR-3a — ambang investigasi analitis bersama (tab WTB ⟷ modul `analytical`). */
  'fluxThreshold.v1': 'engagement',
  /* PR-3c — kertas kerja prosedur analitis substantif SA 520. Tanpa entri ini ia jatuh ke
     default 'firm' → capForWrite = FIRM_ADMIN → suntingan Manajer/Senior/Junior gagal SENYAP. */
  'sa520.v1': 'engagement',
  /* F2/PR-C (PRD 2026-07-19) — SA 580 Representasi Tertulis: status perolehan
     per-representasi (diminta/diterima/N-A), tanggal diterima, teks pengecualian,
     flag penolakan manajemen (¶20), + metadata surat (tanggal, penanda tangan) &
     id lampiran surat bertandatangan (Attachment F0.1). Engagement-scope →
     capForWrite=WP_EDIT (semua auditor) + isolasi W7.5. */
  'rep580.v1': 'engagement',
  /* F2/PR-E (PRD 2026-07-19) — SA 710 Informasi Komparatif: KERTAS KERJA sa710
     (checklist prosedur ¶7–9 selesai/tgl/ref-WP/catatan + flag situasi khusus
     ¶11–14 + catatan). Fakta paragraf auditor pendahulu TIDAK di sini — itu SSOT
     di opinionDoc.v1.comp (dibaca opini+sa705). Engagement-scope → WP_EDIT + W7.5. */
  'comp710.v1': 'engagement',
  /* F2/PR-D (PRD 2026-07-19) — SA 720 Informasi Lain: register dokumen info-lain
     (nama, waktu diperoleh sebelum/sesudah tgl laporan, flag diperoleh, temuan
     konsistensi, disposisi, catatan telaah + lampiran dokumen F0.1). Engagement-scope
     → capForWrite=WP_EDIT + isolasi W7.5. */
  'oi720.v1': 'engagement',
  /* F2/PR-F (PRD 2026-07-19) — SA 230 Dokumentasi Audit: konstanta perikatan
     (tgl laporan, batas perakitan ¶A21, retensi) + atestasi kelengkapan dokumentasi
     (penanda tangan, tgl, memo). Rollup kelengkapan tetap turunan (useDocCanon, SSOT).
     Engagement-scope → capForWrite=WP_EDIT + isolasi W7.5. */
  'sa230Doc.v1': 'engagement',
};

/* 2026-07-01 — keys read via the row-filtered `personal.get` endpoint instead of the
   generic `state.get` (server/src/personalScope.ts PERSONAL_KEYS — keep in sync). Writes
   are UNCHANGED (still state.set, still capForWrite-gated); only hydration branches. */
const PERSONAL_STATE_KEYS = new Set([
  'payrollData', 'leaveReqs', 'leaveBalance', 'perfPeople', 'perfGoals', 'cpeExtra', 'cpeLog',
  'independence', 'indepAppr', 'indepThreats', 'indepRotAck',
  'pc.ethics', 'pc.gifts', 'hrCases', 'amlScreening', 'staffProfile',
]);

/* Bentuk kosong-aman ([]/{}) dari sebuah initializer — dipakai untuk key personal agar cat
 * pertama TIDAK memakai nilai penuh (AMS.*) maupun cache firm-scope bersama (bisa memuat data
 * milik pengguna lain dari sesi sebelumnya di browser yang sama). Server yang mengisi baris
 * ter-filter. */
function emptyLike(initial: any) {
  const v = typeof initial === 'function' ? initial() : initial;
  return Array.isArray(v) ? [] : {};
}

/* PR-6b — BACA-LEWAT DI SISI SERVER untuk keluarga konfigurasi materialitas.
   #129 memindahkan `mat.*` ke lingkup perikatan dan menyediakan rantai baca-lewat
   (perikatan→firma→legacy) — tetapi HANYA di lapisan cache localStorage
   (`readPersisted`). Server tak punya rantai itu: `useServerState` menanyakan SATU
   `(scope, scopeId)` dan mengadopsi nilainya hanya bila `version > 0`. Akibatnya
   konfigurasi yang tersimpan SEBELUM #129 (lingkup firma di server) menjadi YATIM:
   pada browser dengan cache dingin, kueri lingkup-perikatan mengembalikan version 0 →
   UI jatuh ke default (`pbt` 5%/75%/5%) dan keputusan benchmark auditor hilang tanpa
   jejak. Diverifikasi live 2026-07-26: server firma menyimpan benchId="rev", pct=1
   sementara modul Materialitas menampilkan "Laba Sebelum Pajak · 5%".
   Perbaikannya menutup rantai itu di lapisan yang benar — hanya BACA, tak ada tulisan
   destruktif; nilai tersalin ke tier perikatan pada penyimpanan berikutnya. */
const SERVER_READ_THROUGH_FIRM = new Set([
  'mat.benchId', 'mat.pct', 'mat.pmPct', 'mat.cttPct', 'mat.appliedOverride',
  'mat.quals', 'mat.specifics', 'mat.components', 'mat.revisions',
]);

const SYNC_DEBOUNCE_MS = 400;

/* W6 Fase 2 — surface optimistic-concurrency conflicts (no silent clobber).
   useServerState emits a window event on a lost CAS race; <ConflictToaster>
   renders it with two choices (adopt latest / overwrite with mine). */
const CONFLICT_LABELS = {
  aje: 'Jurnal Penyesuaian (AJE)', risks: 'Register Risiko', wpState: 'Status Kertas Kerja',
  reviewNotes: 'Catatan Review', noteThreads: 'Balasan Catatan', timeEntries: 'Entri Waktu',
  taskState: 'Status Tugas', logEntries: 'Log Aktivitas', wtbOverrides: 'Override WTB', wtbImport: 'Impor Neraca Saldo', wtbMapping: 'Pemetaan Akun WTB', wtbLedger: 'Buku Besar (GL)',
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

/* Tahap 8 — hidrasi DEFERRED untuk state berat (wtbLedger, reviewNotes, …):
   kunci ini tidak memicu server GET saat boot; konsumen yang benar-benar
   memakainya memanggil `hydrateAuditKey(key)` lewat useAuditHeavy(). Registri
   di-key oleh cacheKey (scope+scopeId+key) karena scopeId (engagement aktif)
   berubah-ubah. */
const deferredHydrators = new Map<string, () => void>();

/* R-1 — alamat tujuan satu tulisan. Dibekukan SAAT EDIT dan dibawa oleh tulisan yang
   tertunda, BUKAN dibaca ulang saat debounce menyala. Lihat komentar di `pendingRef`. */
interface WriteTarget { scope: string; scopeId: string; key: string; cacheKey: string }
interface PendingWrite { target: WriteTarget; value: unknown; baseVersion: number }

/* The engine. Returns [val, setVal] with the SAME contract as the old hook,
   including functional updates (setVal(prev => next)), which the app uses widely. */
function useServerState(key: any, initial: any, scope: any, scopeId: any, opts?: { defer?: boolean }) {
  const cacheKey = 'ams.v1.' + scope + '.' + scopeId + '.' + key;
  const legacyKey = 'ams.v1.' + key;
  const isPersonal = PERSONAL_STATE_KEYS.has(key);
  // Personal keys: JANGAN baca cache firm-scope bersama (bisa memuat baris pengguna lain dari
  // sesi sebelumnya) dan JANGAN pakai nilai penuh AMS.* — mulai dari kosong-aman, server mengisi.
  const [val, setValRaw] = React.useState(() => isPersonal ? emptyLike(initial) : cacheRead(cacheKey, legacyKey, initial));
  const versionRef = React.useRef(0);
  const timerRef = React.useRef(null);
  /* Argumen tipe generik TIDAK bisa dipakai pada hook React di repo ini (tak ada
     @types/react → `React.useRef` untyped, TS2347). Tipe dinyatakan lewat `as` di titik
     baca; lihat WriteTarget / PendingWrite di atas. */
  const targetRef = React.useRef(null);   // WriteTarget | null
  targetRef.current = { scope, scopeId, key, cacheKey };

  /* R-1 — TULISAN TERTUNDA MEMBAWA ALAMATNYA SENDIRI.
     `targetRef.current` ditugaskan ulang pada SETIAP render; `flush()` dulu membacanya
     saat timer 400 ms menyala. Bila pengguna mengedit lalu berpindah perikatan di dalam
     jendela itu, tulisan tersebut mendarat di PERIKATAN BARU.

     Terverifikasi HIDUP 2026-08-12 (bukan uji bermock): materialitas digeser 9% → 7%
     dengan ENG-2025-014 (PT Sentosa Makmur Tbk) aktif, perikatan diganti 1 ms kemudian —
     server menyimpan `mat.pct`=9 pada ENG-2025-014 (edit auditor HILANG) dan `mat.pct`=7
     pada ENG-2025-031 (PT Bumi Hijau Agrindo). Isolasi W7.5 tak menangkapnya dan memang
     tak bisa: penulisnya BERHAK atas kedua perikatan. Kontrolnya benar; kliennya yang
     mengirim ke alamat salah.

     `versionRef` ikut dibekukan karena hidrasi target baru mereset-nya ke 0 — tulisan
     yang tertunda harus tetap memakai baseVersion milik target LAMA agar CAS-nya sah. */
  const pendingRef = React.useRef(null);   // PendingWrite | null

  const hydrate = React.useCallback(() => {
    let cancelled = false;
    setValRaw(isPersonal ? emptyLike(initial) : cacheRead(cacheKey, legacyKey, initial)); // instant swap to this target's cache (kosong-aman utk personal)
    versionRef.current = 0;
    const reader = isPersonal ? (api as any).personal.get : (api as any).state.get;
    reader.query({ scope, scopeId, key }).then((res: any) => {
      if (cancelled) return;
      versionRef.current = res.version;
      // Personal keys: SELALU adopsi nilai server (otoritas filter), walau version 0 (fallback seed
      // ter-filter) — menutup lubang version-0. Jangan tulis ke cache bersama (hindari bocor lintas-user).
      if (isPersonal) { setValRaw(res.value); }
      else if (res.version > 0) { setValRaw(res.value); cacheWrite(cacheKey, res.value); }
      else if (scope === 'engagement' && SERVER_READ_THROUGH_FIRM.has(key)) {
        /* PR-6b — tier perikatan belum pernah ditulis di server; coba tier FIRMA
           (setelan pra-#129). Cache ditulis ke kunci PERIKATAN agar canon
           (`readPersisted`) melihat nilai yang sama, tanpa menulis apa pun ke server. */
        /* tipe struktural, BUKAN `any`: satu `any` baru di berkas ini meng-un-suppress
           SELURUH berkas pada ratchet ESLint (gotcha yang sudah tercatat). */
        const stateGet = (api as unknown as {
          state: { get: { query: (a: { scope: string; scopeId: string; key: string }) => Promise<{ value: unknown; version: number }> } };
        }).state.get;
        stateGet.query({ scope: 'firm', scopeId: FIRM_SCOPE_ID, key }).then((f) => {
          if (cancelled || !f || f.version <= 0) return;
          setValRaw(f.value);
          cacheWrite(cacheKey, f.value);
        }).catch(() => {});
      }
    }).catch(() => { /* offline / no server: keep the cache (personal: kosong-aman) */ });
    return () => { cancelled = true; };
  }, [scope, scopeId, key]);

  // Hydrate from the server on mount and whenever the scope target changes
  // (e.g. switching the active engagement re-points engagement-scoped keys).
  // Tahap 8 — `defer` menunda GET server sampai konsumen memintanya.
  React.useEffect(() => {
    if (opts && opts.defer) {
      deferredHydrators.set(cacheKey, hydrate);
      return () => { deferredHydrators.delete(cacheKey); };
    }
    return hydrate();
  }, [hydrate, cacheKey, opts]);

  /* R-1 — `pending` membawa target + baseVersion-nya sendiri; TIDAK ada pembacaan
     `targetRef`/`versionRef` di sini. `versionRef` hanya boleh maju bila hook MASIH
     menunjuk target yang barusan ditulis — sesudah pindah perikatan, versi milik target
     lama tak berarti apa-apa bagi target baru dan menuliskannya akan merusak CAS. */
  const flush = React.useCallback((pending: PendingWrite) => {
    const t = pending.target;
    const value = pending.value;
    const stillCurrent = () => {
      const now = targetRef.current as WriteTarget | null;
      return now !== null && now.cacheKey === t.cacheKey;
    };
    (api as any).state.set.mutate({ scope: t.scope, scopeId: t.scopeId, key: t.key, value, baseVersion: pending.baseVersion })
      .then((res: any) => { if (stillCurrent()) versionRef.current = res.version; })
      .catch((err: any) => {
        // Lost an optimistic-concurrency race. Don't silently clobber EITHER side:
        // keep the user's local value, sync versionRef to the server's latest, and
        // surface a conflict toast that lets the user adopt latest or overwrite.
        if (isConflict(err)) {
          const attempted = value;
          (api as any).state.get.query({ scope: t.scope, scopeId: t.scopeId, key: t.key }).then((res: any) => {
            /* R-1 — versi ini milik `t`. Diadopsi ke `versionRef`/`val` HANYA bila hook
               masih menunjuk `t`; untuk target yang sudah ditinggalkan versinya disimpan
               lokal saja, supaya "pertahankan milik saya" tetap punya baseVersion sah
               tanpa menampilkan nilai perikatan lama di layar perikatan baru. */
            let latestVersion = res.version;
            if (stillCurrent()) versionRef.current = res.version;
            const serverVal = res.version > 0 ? res.value : value;
            emitConflict({
              scope: t.scope, key: t.key, label: conflictLabel(t.key),
              adopt: () => { if (stillCurrent()) setValRaw(serverVal); cacheWrite(t.cacheKey, serverVal); },
              keepMine: () => {
                (api as any).state.set.mutate({ scope: t.scope, scopeId: t.scopeId, key: t.key, value: attempted, baseVersion: latestVersion })
                  .then((r: any) => {
                    latestVersion = r.version;
                    if (stillCurrent()) versionRef.current = r.version;
                    cacheWrite(t.cacheKey, attempted);
                  })
                  .catch(() => {});
              },
            });
          }).catch(() => {});
        }
        /* other errors (offline): cache already holds the value; the next edit retries */
      });
  }, []);

  /* Kirim tulisan tertunda SEKARANG (timer dibatalkan). Dipanggil oleh debounce dan oleh
     cleanup efek di bawah saat target berpindah / hook di-unmount. */
  const flushPending = React.useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    const pending = pendingRef.current as PendingWrite | null;
    if (!pending) return;
    pendingRef.current = null;
    flush(pending);
  }, [flush]);

  const setVal = React.useCallback((next: any) => {
    setValRaw((prev: any) => {
      const value = typeof next === 'function' ? next(prev) : next;
      const target = targetRef.current as WriteTarget;   // alamat SAAT EDIT, bukan saat flush
      cacheWrite(target.cacheKey, value);
      /* Edit beruntun ke target yang sama menumpuk di atas baseVersion yang sama —
         belum ada satu pun yang di-commit, jadi versinya belum bergerak. */
      const prevPending = pendingRef.current as PendingWrite | null;
      const baseVersion = prevPending && prevPending.target.cacheKey === target.cacheKey
        ? prevPending.baseVersion
        : versionRef.current;
      pendingRef.current = { target, value, baseVersion };
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flushPending, SYNC_DEBOUNCE_MS);
      return value;
    });
  }, [flushPending]);

  /* R-1, keputusan Ari 2026-08-12 (opsi a) — saat target berpindah (ganti perikatan) atau
     hook di-unmount, tulisan yang masih tertunda DIKIRIM DULU ke target LAMANYA. Auditor
     mengharapkan yang ia ketik tersimpan; membuangnya diam-diam adalah kehilangan data
     yang sama saja. React menjalankan SELURUH cleanup sebelum SELURUH body efek, jadi ini
     mendahului `hydrate()` target baru yang mereset `versionRef`. */
  React.useEffect(() => flushPending, [cacheKey, flushPending]);

  return [val, setVal];
}

function clearPersisted() {
  try { Object.keys(localStorage).filter(k => k.startsWith('ams.v1.') || k.startsWith('ams.')).forEach(k => localStorage.removeItem(k)); } catch (e) {}
}

/* F1/PR-4 (PRD 2026-07-19) — keluarga kertas kerja modul (checklist PSAK/ISAK/syariah, OJK
   sustain/sectorck/auditcomm, spr2410, presentasi, sakroadmap) yang dimigrasi dari localStorage
   ke server. Semua engagement-scope (capForWrite default WP_EDIT + isolasi W7.5). Aturan prefiks
   menghindari mendaftar ~40 key satu-satu; hanya key `<mod>.<field>.v1` baru yang cocok (tak ada
   key server lama yang bertabrakan — dulu semuanya localStorage). */
const PR4_ENGAGEMENT_KEY_RE = /^(psak\d+|syariah|sustain|sectorck|auditcomm|spr2410|presentasi|sakroadmap)\./;

/* standalone persisted-state hook for modules outside the providers.
   Scope from the map (default firm); engagement-scoped keys read the active
   engagement from FirmContext (null outside a provider → default engagement). */
function useAmsPersist(key: any, initial: any) {
  const scope = (AMS_PERSIST_SCOPE as any)[key] || (PR4_ENGAGEMENT_KEY_RE.test(key) ? 'engagement' : 'firm');
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
  const x = { marginLeft: 'auto', cursor: 'pointer', border: 'none', background: 'none', color: 'var(--ink-2,#8a93a2)', fontSize: 15, lineHeight: 1 };
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

function AuthProvider({ me, onLogout, children }: any) {
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

  return (
    <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
  );
}

function FirmProvider({ children }: any) {
  const D: any = AMS;
  const uid = (useAuth() as any).user?.id || 'USER-1';
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

    /* ============================================================
       PR-J — NERACA SALDO MENJADI SADAR-PERIKATAN.
       ------------------------------------------------------------
       `hydrateCoreFromApi` DULU hanya dipanggil sekali saat login, dengan
       `DEFAULT_ENG_ID` yang dipaku (app.tsx). Ia tak pernah dijalankan ulang saat
       pengguna berganti perikatan, sehingga singleton `AMS.WTB` SELALU berisi neraca
       saldo perikatan default — dan karena `D = AMS`, `baseWtb` menyalurkannya ke
       SELURUH modul.

       Akibatnya bukan angka yang salah, melainkan DATA KLIEN LAIN: ENG-2025-040
       (PT Mandiri Sejahtera Finance, multifinance) menampilkan bagan akun PT Sentosa
       Makmur lengkap dengan Beban Pokok Penjualan, persediaan, dan aset hak-guna.
       Kegagalan kerahasiaan sekaligus integritas.

       Efek ini menjadikan hidrasi mengikuti perikatan aktif — termasuk saat boot,
       sehingga `activeEng` yang dipulihkan dari sesi pengguna dihormati alih-alih
       ditimpa DEFAULT_ENG_ID. `wtbEpoch` naik setelah tiap hidrasi karena `AMS.WTB`
       adalah singleton yang dimutasi di luar React: tanpa penanda ini, memo `baseWtb`
       tak punya alasan untuk menghitung ulang dan layar akan tetap menampilkan
       neraca saldo perikatan sebelumnya meski datanya sudah berganti. */
    const PHASE_STATUS = { Perencanaan: 'Planning', Eksekusi: 'Fieldwork', Finalisasi: 'Review', Arsip: 'Completed' };
    const setEngagementPhase = useCallback((id: any, phase: any) => setEngagements((list: any) => list.map((e: any) =>
      e.id === id ? { ...e, phase, status: (PHASE_STATUS as any)[phase] || e.status,
        progress: phase === 'Arsip' ? 100 : phase === 'Finalisasi' ? Math.max(e.progress, 85) : e.progress } : e)), []);

    const addClient = useCallback((c: any) => setClients((list: any) => [{ ...c }, ...list]), []);
    const updateClient = useCallback((id: any, patch: any) => setClients((list: any) => list.map((c: any) => c.id === id ? { ...c, ...patch } : c)), []);
    const addEngagement = useCallback((e: any) => setEngagements((list: any) => {
      const n = list.length + 8;
      const id = 'ENG-2025-0' + String(n).padStart(2, '0');
      /* PRD SA 210/220 (M2): default Pra-akseptasi. Engagement baru tanpa warisan
         akseptasi/surat lahir eksplisit "belum disetujui" agar gerbang masuk Eksekusi
         (M4) membaca nilai konsisten — bukan undefined. Konverter prospek (M3) menimpa
         lewat ...e. */
      const preAcc = { clientKind: 'Klien Baru', originProspectId: null, acceptanceRef: null,
        engagementLetter: { status: 'none', version: 0, esign: [] } };
      return [{ id, fy: 'FY2025', status: 'Planning', phase: 'Perencanaan', progress: 5, actualHrs: 0, ...preAcc, ...e }, ...list];
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

  return (
    <FirmContext.Provider value={firm}>{children}</FirmContext.Provider>
  );
}

function AuditProvider({ children }: any) {
  const D: any = AMS;
  const activeEngagementId = (useFirm() as any).activeEngagementId;
    /* ============================================================
       PR-J — NERACA SALDO MENJADI SADAR-PERIKATAN.
       ------------------------------------------------------------
       `hydrateCoreFromApi` DULU hanya dipanggil sekali saat login, dengan
       `DEFAULT_ENG_ID` yang dipaku (app.tsx). Ia tak pernah dijalankan ulang saat
       pengguna berganti perikatan, sehingga singleton `AMS.WTB` SELALU berisi neraca
       saldo perikatan default — dan karena `D = AMS`, `baseWtb` menyalurkannya ke
       SELURUH modul.

       Akibatnya bukan angka yang salah, melainkan DATA KLIEN LAIN: ENG-2025-040
       (PT Mandiri Sejahtera Finance, multifinance) menampilkan bagan akun PT Sentosa
       Makmur lengkap dengan Beban Pokok Penjualan, persediaan, dan aset hak-guna.
       Kegagalan kerahasiaan sekaligus integritas.

       Efek ini menjadikan hidrasi mengikuti perikatan aktif — termasuk saat boot,
       sehingga `activeEng` yang dipulihkan dari sesi pengguna dihormati alih-alih
       ditimpa DEFAULT_ENG_ID. `wtbEpoch` naik setelah tiap hidrasi karena `AMS.WTB`
       adalah singleton yang dimutasi di luar React: tanpa penanda ini, memo `baseWtb`
       tak punya alasan untuk menghitung ulang dan layar akan tetap menampilkan
       neraca saldo perikatan sebelumnya meski datanya sudah berganti. */
    const [wtbEpoch, setWtbEpoch] = useState(0);
    useEffect(() => {
      if (!activeEngagementId) return;
      let live = true;
      (async () => {
        try { await hydrateCoreFromApi(activeEngagementId); } catch (e) { /* offline: seed data.js */ }
        /* Memo FIG/SRC kanon dibangun dari WTB lama → harus dibuang sebelum konsumen
           mana pun membacanya kembali. `hydrateCoreFromApi` sudah melakukannya, tetapi
           diulang di sini agar jalur gagal (offline) pun tak meninggalkan memo basi. */
        try { (window as unknown as { amsResetFigures?: () => void }).amsResetFigures?.(); } catch (e) { /* noop */ }
        if (live) setWtbEpoch((n: number) => n + 1);
      })();
      return () => { live = false; };
    }, [activeEngagementId]);
    /* user-added AJEs carry structured `lines: [{code, name, debit, credit}]` */
    /* engagement-scoped: re-hydrate when the active engagement changes */
    const [aje, setAje] = useServerState('aje', D.AJE, 'engagement', activeEngagementId);
    /* seed register RoMM dari union, di-filter per perikatan aktif → tiap engagement
       melihat register-nya sendiri (drill-down konsisten dgn Risiko Portofolio). */
    const [risks, setRisks] = useServerState('risks', ENG_RISK_SEED.filter((r) => r.engagementId === activeEngagementId), 'engagement', activeEngagementId);
    const [wtbOverrides, setWtbOverrides] = useServerState('wtbOverrides', {}, 'engagement', activeEngagementId);
    /* PR-3 — SSOT telaah fluktuasi SA 520. Dulu terbelah dua: tab WTB menulis ke
       `wtbOverrides.{note,revStatus}` (ber-AJE_EDIT → Junior tak bisa mendokumentasikan),
       modul `analytical` ke `fluxState.v1` — dua seed bertentangan, dua hitungan "explained".
       Kini satu store (engagement + WP_EDIT); catatan lama tetap terbaca lewat merge
       baca-lewat, tanpa tulisan destruktif ke `wtbOverrides`. */
    const [fluxStateRaw, setFluxState] = useServerState('fluxState.v1', {}, 'engagement', activeEngagementId);
    const fluxState = useMemo(() => mergeLegacyFlux(fluxStateRaw, wtbOverrides), [fluxStateRaw, wtbOverrides]);
    /* Ambang investigasi (SA 520 ¶5c) juga SSOT: dulu tab WTB memakai 20% dan modul
       `analytical` 15%, sehingga himpunan akun ter-flag — dan penyebut "x dari y
       terjelaskan" — berbeda untuk perikatan yang sama. `absJt` null = turunkan dari PM. */
    const [fluxThreshold, setFluxThreshold] = useServerState('fluxThreshold.v1', { absJt: null, pctThr: 20 }, 'engagement', activeEngagementId);
    /* W-WTB·1 — neraca saldo klien terimpor (paste/CSV), per-engagement. null = pakai seed demo D.WTB. */
    const [wtbImport, setWtbImport] = useServerState('wtbImport', null, 'engagement', activeEngagementId);
    /* W-WTB·3 — pemetaan bagan akun klien → CoA standar ({kodeKlien: kodeStandar}). */
    const [wtbMapping, setWtbMapping] = useServerState('wtbMapping', {}, 'engagement', activeEngagementId);
    /* W-WTB·4 — buku besar (GL) detail per akun ({kode: [baris GL]}) untuk drill sub-ledger nyata. */
    /* Tahap 8 — state berat di-defer: server GET hanya terjadi saat modul pemakai
       memanggil useAuditHeavy(['wtbLedger']) dst. (lihat useAuditHeavy). */
    const [wtbLedger, setWtbLedger] = useServerState('wtbLedger', {}, 'engagement', activeEngagementId, { defer: true });
    /* PR-4a — penetapan lead schedule per akun ({kode: 'B'}). Heuristik `leadFromCode` hanya
       TEBAKAN awal; auditor menetapkan yang mengikat di sini. Engagement + WP_EDIT (bukan
       AJE_EDIT: menetapkan lead adalah penataan kertas kerja, bukan mengubah angka). */
    const [wtbLeads, setWtbLeads] = useServerState('wtbLeads.v1', {}, 'engagement', activeEngagementId);
    /* PR-4c — saldo akhir audited TA-1 sebagai sumber INDEPENDEN (SA 510 ¶6). Tanpa ini,
       penelusuran saldo awal membandingkan `ly` dengan dirinya sendiri → selalu "Cocok". */
    const [priorYearBalances, setPriorYearBalances] = useServerState('priorYearBalances.v1', null, 'engagement', activeEngagementId);
    /* PR-6b — konfigurasi materialitas SA 320 dihidrasi DI SINI (bukan hanya saat modul
       Materialitas dirender). Dulu `view_materiality` satu-satunya penulis cache `mat.*`,
       sehingga `materialityFor()` di 8 modul hilir memakai default 75% pada browser bersih
       walau server menyimpan setelan auditor — senyap, dan berbeda antar-mesin.
       AuditProvider kini PEMILIK TUNGGAL kunci ini; modul Materialitas mengikat ke sini
       (dua pemilik `useServerState` atas satu kunci TIDAK saling sinkron dalam satu sesi →
       itu akan jadi split-brain baru, kelas bug yang sedang diperbaiki). */
    const [matBenchId, setMatBenchId] = useServerState('mat.benchId', 'pbt', 'engagement', activeEngagementId);
    const [matPct, setMatPct] = useServerState('mat.pct', 5, 'engagement', activeEngagementId);
    const [matPmPct, setMatPmPct] = useServerState('mat.pmPct', 75, 'engagement', activeEngagementId);
    const [matCttPct, setMatCttPct] = useServerState('mat.cttPct', 5, 'engagement', activeEngagementId);
    const [matOverride, setMatOverride] = useServerState('mat.appliedOverride', null, 'engagement', activeEngagementId);
    const [wpState, setWpState] = useServerState('wpState', {}, 'engagement', activeEngagementId); // per-WP tickmarks / signoff
    const [reviewNotes, setReviewNotes] = useServerState('reviewNotes', D.REVIEW_NOTES || [], 'engagement', activeEngagementId, { defer: true });
    const [noteThreads, setNoteThreads] = useServerState('noteThreads', {}, 'engagement', activeEngagementId, { defer: true }); // noteId -> [reply,...] overlay (works for module & WP notes)
    const [timeEntries, setTimeEntries] = useServerState('timeEntries', D.TIME_ENTRIES || [], 'engagement', activeEngagementId, { defer: true });
    const [taskState, setTaskState] = useServerState('taskState', {}, 'engagement', activeEngagementId, { defer: true }); // taskId -> done
    /* PR-B - jembatan jejak untuk setAjeStatus/toggleAjeStatus. Dideklarasikan di sini
       (sebelum logActivity) karena keduanya memakainya lewat `.current`. */
    const logRef: { current: ((e: unknown) => void) | null } = useRef(null);
    /* Bentuk minimal baris jurnal yang disentuh transisi status (BUKAN `any`:
       satu `any` baru meng-un-suppress seluruh berkas pada ratchet ESLint). */
    type AjeStatusRow = { id: string; status: string };
    const [logEntries, setLogEntries] = useServerState('logEntries', [], 'engagement', activeEngagementId, { defer: true });
    const logActivity = useCallback((e: any) => setLogEntries((list: any) => [{ ts: new Date().toISOString().slice(0, 16).replace('T', ' '), ...e }, ...list].slice(0, 50)), []);
    /* PR-B - jembatan agar setAjeStatus/toggleAjeStatus dapat mencatat jejak tanpa
       menjadikan `logActivity` dependensi yang memutus memo mereka tiap jejak bertambah. */
    logRef.current = logActivity;

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

    /* base WTB = neraca saldo terimpor (per-engagement) bila ada, else seed demo D.WTB.
       W-WTB·3: bila ada pemetaan akun, relabel+merge ke CoA standar dulu agar canon/FSGEN
       mengenali bagan akun klien. Lapisan override analitis + delta AJE tetap di atasnya (SSOT). */
    /* PR-J — `wtbEpoch` ada di deps KARENA `D.WTB` (= `AMS.WTB`) adalah singleton yang
       dimutasi di luar React oleh hidrasi. Tanpa penanda itu memo ini tak pernah
       menghitung ulang saat perikatan berganti. */
    const baseWtb = useMemo(() => {
      const imported = (wtbImport && Array.isArray(wtbImport.rows) && wtbImport.rows.length) ? wtbImport.rows : null;
      if (!imported) return D.WTB;
      return (wtbMapping && Object.keys(wtbMapping).length) ? applyMapping(imported, wtbMapping) : imported;

    }, [wtbImport, wtbMapping, wtbEpoch]);
    // Override analitis di-key per KODE akun (identitas stabil) via overlayWtbOverrides —
    // bertahan saat WTB di-impor/petakan ulang (key posisi bergeser). SSOT `wtb` view.
    const wtbBase = useMemo(() => overlayWtbOverrides(baseWtb, wtbOverrides, userPostDeltas),
      [baseWtb, wtbOverrides, userPostDeltas]);
    /* PR-4a — penetapan lead auditor menimpa tebakan heuristik/pemetaan. `leadSrc` ikut
       ditetapkan agar hilir (chip tabel, XLSX tersegel) dapat membedakan penetapan auditor
       dari tebakan mesin; tanpa itu keduanya dirender identik. */
    const wtb = useMemo(() => {
      if (!wtbLeads || !Object.keys(wtbLeads).length) return wtbBase;
      return wtbBase.map((r: { code: string; lead?: string }) => (
        wtbLeads[r.code] ? { ...r, lead: wtbLeads[r.code], leadSrc: 'auditor' } : r
      ));
    }, [wtbBase, wtbLeads]);

    /* ============================================================
       PR-B - STATUS JURNAL ADALAH KELUARAN RANTAI PERSETUJUAN, BUKAN MASUKAN.
       ------------------------------------------------------------
       `toggleAjeStatus` DIPERTAHANKAN sebagai jalur tulis-balik yang dipanggil
       antrean persetujuan (`view_platform.decide()`), tetapi TIDAK BOLEH lagi
       dipanggil langsung dari UI register: itulah jalan pintas yang membuat
       seorang Senior Auditor dapat memposting jurnal ke WTB tanpa persetujuan
       Partner, tanpa alasan, dan tanpa jejak.

       Setiap perubahan status kini mencatat jejak. `logActivity` dirujuk lewat
       ref agar callback ini tak perlu dibuat ulang tiap perubahan daftar jejak
       (yang akan memutus memo di seluruh konsumen). */
    const setAjeStatus = useCallback((id: string, next: 'Posted' | 'Proposed', meta?: { by?: string; reason?: string; approvalId?: string }) => {
      setAje((list: AjeStatusRow[]) => list.map((a: AjeStatusRow) => {
        if (a.id !== id || a.status === next) return a;
        if (logRef.current) {
          logRef.current({
            who: (meta && meta.by) || 'Sistem',
            action: next === 'Posted' ? 'APPROVE' : 'EDIT',
            module: 'AJE', sourceModule: 'aje', target: id,
            detail: next === 'Posted'
              ? `${id} diposting ke WTB` + (meta && meta.approvalId ? ` (persetujuan ${meta.approvalId})` : '')
              : `${id} dibatalkan postingnya` + (meta && meta.reason ? ` - ${meta.reason}` : ''),
            before: 'Status: ' + a.status, after: 'Status: ' + next,
          });
        }
        return { ...a, status: next };
      }));
    }, []);

    /* Dipanggil HANYA oleh antrean persetujuan pada keputusan final. */
    const toggleAjeStatus = useCallback((id: string, meta?: { by?: string; approvalId?: string }) => {
      setAje((list: AjeStatusRow[]) => {
        const cur = list.find((a: AjeStatusRow) => a.id === id);
        if (!cur) return list;
        const next = cur.status === 'Posted' ? 'Proposed' : 'Posted';
        return list.map((a: AjeStatusRow) => {
          if (a.id !== id) return a;
          if (logRef.current) {
            logRef.current({
              who: (meta && meta.by) || 'Sistem', action: next === 'Posted' ? 'APPROVE' : 'EDIT',
              module: 'AJE', sourceModule: 'aje', target: id,
              detail: `${id} ${next === 'Posted' ? 'diposting ke' : 'ditarik dari'} WTB`
                + (meta && meta.approvalId ? ` (persetujuan ${meta.approvalId})` : ''),
              before: 'Status: ' + cur.status, after: 'Status: ' + next,
            });
          }
          return { ...a, status: next };
        });
      });
    }, []);

    /* PR-B - entri baru lahir 'Proposed'. DULU 'Posted': satu tombol di form AJE
       langsung mengubah angka WTB, dan `buildApprovals` lalu menerbitkan jejak
       bahwa Manager, Partner, dan EQR telah menyetujui.
       PR-1 - id dari `nextAjeId` (sufiks tertinggi + 1), bukan `length + 1` yang
       menghasilkan id GANDA begitu sebuah entri pernah dihapus. */
    const addAje = useCallback((entry: any) => {
      /* PR-3 - `proposedOn` distempel di sini dengan jam NYATA. Dulu jurnal buatan
         auditor tak punya tanggal pengajuan sama sekali: jejak audit menampilkannya
         sebagai "baru saja" selamanya, dan antrean persetujuan memberinya konstanta
         '2026-03-09 16:40' seperti semua jurnal lain. */
      setAje((list: any) => [...list, { id: nextAjeId(list), status: 'Proposed', proposedOn: nowStamp(), ...entry }]);
    }, []);

    /* ============================================================
       PR-1 - JURNAL POSTED TIDAK DAPAT DISUNTING (PRD §S1).
       ------------------------------------------------------------
       Lapis KLIEN dari aturan yang ditegakkan server (`posted-immutable`).
       Ia ada bukan sebagai pengaman - server yang menjaga - melainkan supaya UI
       tak pernah menawarkan aksi yang pasti ditolak, lalu menampilkan nilai baru
       sesaat sebelum sinkronisasi mengembalikannya. Mengembalikan false bila
       ditolak; pemanggil menawarkan "Balik & Ganti" sebagai gantinya. */
    const updateAje = useCallback((id: string, patch: Record<string, unknown>): boolean => {
      /* Keputusan diambil dari nilai state SEKARANG, bukan dari dalam updater:
         updater React tidak dijalankan sinkron, jadi nilai balik yang disusun di
         dalamnya akan selalu terbaca sebagai "belum terjadi" oleh pemanggil. */
      const cur = (aje as AjeContractEntry[]).find((a) => a.id === id);
      if (!cur || cur.status === 'Posted') return false;
      setAje((list: AjeContractEntry[]) => list.map((a) => (a.id === id ? { ...a, ...patch } : a)));
      return true;
    }, [aje]);

    /* Satu-satunya jalan koreksi atas jurnal yang sudah diposting: jurnal BALIK
       baru yang menempuh rantai persetujuan yang sama. Jurnal asal tetap utuh -
       angkanya sudah mengalir ke WTB/SAD/opini, jadi fakta bahwa ia pernah ada
       tak boleh dapat dihapus. Mengembalikan id jurnal balik, atau null. */
    const reverseAje = useCallback((id: string, meta: { reason: string; by?: string }): string | null => {
      const list = aje as AjeContractEntry[];
      const cur = list.find((a) => a.id === id);
      if (!cur || cur.status !== 'Posted') return null;
      const reason = String(meta.reason || '').trim();
      if (!reason) return null;                       // pembalikan tanpa alasan bukan jejak audit
      const newId = nextAjeId(list);
      const rev = reverseEntryFrom(cur, { id: newId, reason, preparer: meta.by ?? null });
      setAje((prev: AjeContractEntry[]) => [...prev, rev]);
      if (logRef.current) {
        logRef.current({
          who: meta.by || 'Sistem', action: 'CREATE', module: 'AJE', sourceModule: 'aje', target: newId,
          detail: `${newId} diajukan sebagai pembalikan ${id} - ${reason}`,
          before: `${id}: Posted (tidak diubah)`, after: `${newId}: Proposed`,
        });
      }
      return newId;
    }, [aje]);

    const updateRisk = useCallback((id: any, patch: any) => {
      setRisks((list: any) => list.map((r: any) => r.id === id ? { ...r, ...patch } : r));
    }, []);

    const setWp = useCallback((ref: any, patch: any) => setWpState((s: any) => ({ ...s, [ref]: { ...(s[ref] || {}), ...patch } })), []);

    // totals
    const ajeTotalPosted = useMemo(
      () => aje.filter((a: any) => a.status === 'Posted').reduce((s: any, a: any) => s + a.amount, 0), [aje]);

    /* PR-6b — konfigurasi materialitas sebagai satu objek reaktif + satu setter ber-patch.
       Dipakai `useMateriality()` untuk memanggil canon dengan argumen EKSPLISIT (murni),
       dan oleh modul Materialitas sebagai editor. */
    const matConfig: MaterialityConfig = useMemo(() => ({
      benchId: matBenchId, pct: matPct, pmPct: matPmPct, cttPct: matCttPct, appliedOverride: matOverride,
    }), [matBenchId, matPct, matPmPct, matCttPct, matOverride]);
    const setMatConfig = useCallback((patch: Partial<MaterialityConfig>) => {
      if (patch.benchId !== undefined) setMatBenchId(patch.benchId);
      if (patch.pct !== undefined) setMatPct(patch.pct);
      if (patch.pmPct !== undefined) setMatPmPct(patch.pmPct);
      if (patch.cttPct !== undefined) setMatCttPct(patch.cttPct);
      if (patch.appliedOverride !== undefined) setMatOverride(patch.appliedOverride);
    }, []);

    /* Tahap 8 — pemicu hidrasi deferred: memanggil hydrator terdaftar untuk kunci
       berat pada (scope, scopeId) saat ini. No-op bila kunci tak dikenal/defer —
       kunci eager sudah terhidrasi sejak mount. */
    const hydrateAuditKey = useCallback((key: string) => {
      const cacheKey = 'ams.v1.engagement.' + activeEngagementId + '.' + key;
      const hydrator = deferredHydrators.get(cacheKey);
      if (hydrator) hydrator();
    }, [activeEngagementId]);

    const audit = useMemo((): AuditContextShape => ({
      matConfig, setMatConfig, hydrateAuditKey,
      aje, setAje, toggleAjeStatus, setAjeStatus, addAje, updateAje, reverseAje, ajeTotalPosted,
      risks, updateRisk,
      wtb, wtbOverrides, setWtbOverrides, wtbImport, setWtbImport, wtbMapping, setWtbMapping, wtbLedger, setWtbLedger,
      fluxState, setFluxState, fluxThreshold, setFluxThreshold, wtbLeads, setWtbLeads,
      priorYearBalances, setPriorYearBalances,
      wpState, setWp,
      reviewNotes, reviewNotesActive, addReviewNote, resolveReviewNote, updateReviewNote,
      noteThreads, addNoteReply,
      timeEntries, addTimeEntry,
      taskState, toggleTask,
      logEntries, logActivity,
      workpapers: D.WORKPAPERS, team: D.TEAM, activity: D.ACTIVITY, deadlines: D.DEADLINES,
    }), [matConfig, setMatConfig, hydrateAuditKey, aje, toggleAjeStatus, setAjeStatus, addAje, updateAje, reverseAje, ajeTotalPosted, risks, updateRisk, wtb, wtbOverrides, fluxState, setFluxState, fluxThreshold, setFluxThreshold, wtbLeads, setWtbLeads, priorYearBalances, setPriorYearBalances, wtbImport, setWtbImport, wtbMapping, setWtbMapping, wtbLedger, setWtbLedger, wpState, setWp, reviewNotes, reviewNotesActive, addReviewNote, resolveReviewNote, updateReviewNote, noteThreads, addNoteReply, timeEntries, addTimeEntry, taskState, toggleTask, logEntries, logActivity]);

  return (
    <AuditContext.Provider value={audit}>
      {children}
      <ConflictToaster />
    </AuditContext.Provider>
  );
}

function AppProviders({ me, onLogout, children }: any) {
  return (
    <AuthProvider me={me} onLogout={onLogout}>
      <FirmProvider>
        <AuditProvider>{children}</AuditProvider>
      </FirmProvider>
    </AuthProvider>
  );
}
Object.assign(window, {
  AuthContext, FirmContext, AuditContext, NavContext, NavFromContext,
  useAuth, useFirm, useAudit, useNav, useNavFrom, AppProviders, clearPersisted,
  notesForEngagement, amsShortName, useCurrentAuditor, useInitialTab, useInitialSelection,
});
window.clearPersisted = clearPersisted;


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { AppProviders, AuditContext, AuthContext, FirmContext, NavContext, NavFromContext, clearPersisted, notesForEngagement, useAudit, useAuth, useFirm, useMateriality, useNav, useNavFrom, amsShortName, useCurrentAuditor, useInitialTab, useInitialSelection };
export { useAmsPersist };
