/* ============================================================
   Asseris — RANTAI PERSETUJUAN JURNAL (SSOT)
   PRD: docs/prd-aje-immutability-live-approvals.md (PR-2 · PR-4)
   ------------------------------------------------------------
   Modul MURNI (tanpa React/`window`/DOM) — satu-satunya penghasil rantai
   persetujuan AJE. Sebelumnya rantai dibangun di DUA tempat dengan aturan
   yang berbeda: `data_platform.chainFromDecisions` (antrean) dan
   `view_aje.ApprovalCard` (tab AJE, yang membaca metadata seed dan menandai
   langkah Partner selesai semata dari `status === 'Posted'`). Probe atas seed
   memperlihatkan akibatnya pada AJE-01 (Rp 2,34 M, Posted):

     antrean  → 4 langkah, `EQR Reviewer: current`, postedWithoutFullChain
     tab AJE  → 3 langkah, ketiganya hijau — "selesai"

   Satu jurnal, dua jawaban, dan yang lebih menenangkan adalah yang salah.

   ------------------------------------------------------------
   PENGIKATAN HASH (PR-2). Setiap keputusan membawa hash isi jurnal yang
   disetujuinya. Sebuah langkah berstatus `approved` HANYA bila hash keputusan
   sama dengan hash jurnal saat ini; bila jurnal berubah setelah disetujui,
   persetujuan itu GUGUR — dan gugurnya tidak memerlukan tulisan apa pun.

   Itu bukan kerapian, melainkan syarat: keputusan hidup di StateDoc
   `approvals_ov_v4` sementara jurnal hidup di `aje`. Pembatalan lintas-dokumen
   tak dapat dijamin atomik (tulisan kedua bisa gagal, offline, atau kalah CAS),
   jadi satu-satunya pembatalan yang selalu benar adalah yang DITURUNKAN.

   Keputusan lama tanpa `hash` (ditulis sebelum PR-2) TIDAK digugurkan massal —
   ia ditandai `legacy`: tak diklaim terverifikasi, tak pula dihapus.
   ============================================================ */
import { ajeContentHash } from './aje_contract';
import type { AjeContractEntry } from './aje_contract';
import { CAP, can as rbacCan } from './rbac';

export type ChainStatus = 'approved' | 'current' | 'pending' | 'rejected';

/** Satu keputusan yang benar-benar tercatat pada sebuah langkah rantai. */
export interface AjeDecision {
  /** Indeks langkah pada rantai (0 = Penyusun). Keputusan seed lama tanpa
   *  `idx` diperlakukan posisional — urutan penulisannya adalah urutannya. */
  idx?: number;
  stepRole?: string;
  name?: string;
  role?: string;
  ts?: string;
  note?: string;
  /** Hash isi jurnal saat keputusan diambil (PR-2). Absen = keputusan warisan. */
  hash?: string;
}

/** Definisi satu langkah rantai: peran + penerima tugas (bukan tanda tangan). */
export interface AjeChainStepDef {
  role: string;
  /** Nama yang DITUGASI langkah ini. Pada langkah yang belum diputuskan, nama
   *  ini adalah penugasan — bukan bukti bahwa ia menyetujui. */
  name: string;
  ts?: string;
  note?: string;
}

export interface AjeChainLink {
  role: string;
  name: string;
  status: ChainStatus;
  ts: string | null;
  note: string | null;
  /** Ada keputusan untuk langkah ini, tetapi atas VERSI JURNAL YANG BERBEDA. */
  voided?: boolean;
  /** Tanda tangan yang gugur — ditampilkan agar pembatalannya dapat ditelusuri. */
  voidedBy?: { name: string; ts: string | null; note: string | null };
  /** Keputusan warisan tanpa hash: tak dapat diverifikasi terhadap isi jurnal. */
  legacy?: boolean;
}

export interface AjeChainResult {
  chain: AjeChainLink[];
  /** Jumlah langkah setelah Penyusun yang harus disetujui. */
  required: number;
  /** Indeks langkah yang sedang berjalan (= jumlah langkah selesai berurutan). */
  step: number;
  chainComplete: boolean;
  /** Jurnal berstatus Posted yang rantainya belum lengkap = eksepsi kontrol. */
  postedWithoutFullChain: boolean;
  /** Ada persetujuan yang gugur karena jurnal berubah setelah disetujui. */
  hasVoided: boolean;
  /** Hash isi jurnal yang menjadi acuan rantai ini. */
  contentHash: string;
}

/** Ambang nilai yang menuntut langkah EQR (SMM 2 / SA 220.36). */
export const AJE_EQR_THRESHOLD = 2e9;
/** Ambang nilai yang menaikkan prioritas antrean (bukan menambah langkah). */
export const AJE_MID_THRESHOLD = 5e8;

export interface AjeChainRoles {
  preparer: string;
  manager: string;
  partner: string;
  eqr: string;
  /** Waktu & catatan pengajuan (langkah Penyusun). */
  submittedAt?: string | null;
  submitNote?: string | null;
}

/**
 * Langkah-langkah rantai untuk sebuah jurnal — panjangnya MENGIKUTI NILAI.
 *
 * Tab AJE dulu mengeraskan tiga langkah sementara antrean menambah langkah
 * EQR di atas Rp 2 M; keduanya kini memanggil fungsi ini, jadi perbedaan
 * seperti itu tak bisa lahir lagi tanpa mengubah satu tempat.
 */
export function ajeChainSteps(a: AjeContractEntry | null | undefined, roles: AjeChainRoles): AjeChainStepDef[] {
  const amount = Number((a && a.amount) || 0);
  const steps: AjeChainStepDef[] = [
    {
      role: 'Penyusun',
      name: roles.preparer,
      ts: roles.submittedAt ?? undefined,
      note: roles.submitNote ?? undefined,
    },
    { role: 'Audit Manager', name: roles.manager },
    { role: 'Engagement Partner', name: roles.partner },
  ];
  if (amount >= AJE_EQR_THRESHOLD) steps.push({ role: 'EQR Reviewer', name: roles.eqr });
  return steps;
}

/** Keputusan → indeks langkahnya. Keputusan seed lama tanpa `idx` posisional. */
function decisionsByStep(decisions: readonly AjeDecision[] | null | undefined): Map<number, AjeDecision> {
  const m = new Map<number, AjeDecision>();
  let positional = 1;                       // langkah 0 = Penyusun, tak diputuskan
  for (const d of decisions || []) {
    if (!d) continue;
    const idx = typeof d.idx === 'number' ? d.idx : positional;
    positional = Math.max(positional, idx) + 1;
    /* Keputusan pertama atas sebuah langkah yang menang: menulis dua kali pada
       langkah yang sama tak boleh menghapus tanda tangan yang lebih awal. */
    if (!m.has(idx)) m.set(idx, d);
  }
  return m;
}

/**
 * Rantai persetujuan sebuah jurnal, dari keputusan yang BENAR-BENAR tercatat.
 *
 * Aturan yang dipaku di sini:
 *  - Langkah 0 (Penyusun) selesai secara definisi begitu jurnal diajukan.
 *  - Langkah lain `approved` HANYA bila ada keputusan untuknya DAN hash
 *    keputusan itu cocok dengan isi jurnal saat ini (atau keputusan warisan
 *    tanpa hash → `legacy`).
 *  - Keputusan yang hash-nya tak cocok tidak dibuang: langkahnya kembali
 *    menunggu, dengan tanda tangan yang gugur tetap terlihat (`voidedBy`).
 *  - Status posting jurnal TIDAK pernah menjadi masukan. Ia keluaran.
 */
export function buildAjeChain(
  a: AjeContractEntry | null | undefined,
  steps: readonly AjeChainStepDef[],
  decisions: readonly AjeDecision[] | null | undefined,
): AjeChainResult {
  const contentHash = ajeContentHash(a);
  const byStep = decisionsByStep(decisions);
  const posted = String((a && a.status) || '') === 'Posted';

  const approvedAt: boolean[] = [];
  const links: AjeChainLink[] = steps.map((s, i) => {
    if (i === 0) {
      approvedAt[i] = true;
      return {
        role: s.role, name: s.name, status: 'approved' as ChainStatus,
        ts: s.ts ?? null, note: s.note ?? 'Diajukan.',
      };
    }
    const d = byStep.get(i);
    if (!d) {
      approvedAt[i] = false;
      return { role: s.role, name: s.name, status: 'pending' as ChainStatus, ts: null, note: null };
    }
    const legacy = !d.hash;
    if (legacy || d.hash === contentHash) {
      approvedAt[i] = true;
      return {
        role: s.role, name: d.name || s.name, status: 'approved' as ChainStatus,
        ts: d.ts ?? null, note: d.note || 'Disetujui.',
        ...(legacy ? { legacy: true } : {}),
      };
    }
    /* Hash tak cocok: jurnal berubah SETELAH langkah ini disetujui. */
    approvedAt[i] = false;
    return {
      role: s.role, name: s.name, status: 'pending' as ChainStatus, ts: null, note: null,
      voided: true,
      voidedBy: { name: d.name || s.name, ts: d.ts ?? null, note: d.note ?? null },
    };
  });

  /* Langkah berjalan = langkah pertama yang belum disetujui (berurutan). */
  let step = 0;
  while (step < links.length && approvedAt[step]) step++;
  if (step < links.length) links[step].status = 'current';

  const required = Math.max(0, steps.length - 1);
  const chainComplete = approvedAt.slice(1).length === required && approvedAt.slice(1).every(Boolean);

  return {
    chain: links,
    required,
    step,
    chainComplete,
    postedWithoutFullChain: posted && !chainComplete,
    hasVoided: links.some((l) => l.voided),
    contentHash,
  };
}

/**
 * Keputusan baru untuk langkah yang sedang berjalan — TERIKAT pada isi jurnal
 * saat ini. Dipakai antrean persetujuan maupun tab AJE, supaya keduanya tak
 * pernah menulis bentuk keputusan yang berbeda.
 *
 * `stepRole` WAJIB terisi: server memakainya untuk menentukan kapabilitas yang
 * dituntut langkah ini, dan keputusan tanpa peran-langkah ditolak (fail-closed).
 */
export function makeAjeDecision(input: {
  a: AjeContractEntry | null | undefined;
  idx: number;
  stepRole: string;
  name?: string;
  role?: string;
  ts: string;
  note?: string;
}): AjeDecision {
  return {
    idx: input.idx,
    stepRole: input.stepRole,
    name: input.name,
    role: input.role,
    ts: input.ts,
    note: input.note && input.note.trim() ? input.note.trim() : 'Disetujui.',
    hash: ajeContentHash(input.a),
  };
}

/** Ringkasan siapa yang ditunggu — dipakai UI untuk menyebut penghambat. */
export function ajeChainBlocker(r: AjeChainResult): { role: string; name: string } | null {
  const cur = r.chain[r.step];
  return cur ? { role: cur.role, name: cur.name } : null;
}

/* ============================================================
   WAKTU KEPUTUSAN (PR-3)
   ------------------------------------------------------------
   Setiap keputusan dulu dicap konstanta `PF_STAMP = '10 Mar 09:00'`:
   persetujuan yang diberikan hari ini tercatat "10 Mar 09:00" — selamanya,
   untuk semua orang, untuk semua jurnal. Jejak keputusan yang salah tanggal
   bukan bukti audit (SA 230 ¶8-11 menuntut KAPAN prosedur dilaksanakan).

   Keputusan Q2 (PRD §11): klien menulis ISO nyata, server MENOLAK yang
   menyimpang lebih dari jendela kesegaran dari jamnya sendiri. Kontrak
   `state.set` tak berubah. BATAS JUJUR: ini bukan tanda tangan waktu
   kriptografis — ia mempersempit pemalsuan ke lebar jendela, dan baris
   `appendAudit` (jam server, hash-chained) tetap jadi rekaman pendamping.
   ============================================================ */

/** Selisih maksimum antara `ts` keputusan dan jam server. */
export const AJE_DECISION_SKEW_MS = 10 * 60 * 1000;
/** Jendela SLA baku sebuah langkah persetujuan jurnal (jam). */
export const AJE_SLA_HOURS = 48;

/** Stempel waktu keputusan: ISO 8601 dari jam mesin pengambil keputusan. */
export function nowStamp(now: number = Date.now()): string {
  return new Date(now).toISOString();
}

/**
 * Parse stempel waktu yang toleran terhadap dua bentuk yang hidup di data ini:
 * ISO ('2026-08-07T09:00:00.000Z') dan gaya seed ('2026-05-06 10:20').
 * Mengembalikan epoch ms, atau null bila tak dapat dibaca.
 */
export function parseStamp(ts: unknown): number | null {
  const s = String(ts ?? '').trim();
  if (!s) return null;
  const t = Date.parse(s.includes('T') ? s : s.replace(' ', 'T'));
  return Number.isFinite(t) ? t : null;
}

/**
 * Alasan penolakan sebuah stempel keputusan, atau null bila sah.
 *
 * Fail-closed: stempel yang hilang atau tak terbaca DITOLAK. Keputusan tanpa
 * waktu yang dapat dibaca tidak dapat menjadi bukti kapan ia diambil — dan
 * bentuk lama (`'10 Mar 09:00'`, tanpa tahun) justru contohnya.
 */
export function decisionTimestampError(ts: unknown, now: number, skewMs: number = AJE_DECISION_SKEW_MS): string | null {
  const t = parseStamp(ts);
  if (t == null) return 'missing-timestamp';
  const drift = t - now;
  if (drift > skewMs) return 'future-timestamp';
  if (-drift > skewMs) return 'stale-timestamp';
  return null;
}

/** Batas SLA sebuah pengajuan (ISO), dari waktu pengajuannya. */
export function ajeDueAt(submittedAt: unknown, hours: number = AJE_SLA_HOURS): string | null {
  const t = parseStamp(submittedAt);
  return t == null ? null : new Date(t + hours * 3.6e6).toISOString();
}

/* ============================================================
   OTORITAS PER-LANGKAH (dipindah dari view_platform.tsx pada PR-4)
   ------------------------------------------------------------
   Gerbang lama `role.includes('Partner') || role.includes('Manager')` punya
   tiga cacat: mencocokkan STRING peran (di luar SSOT RBAC), tak membedakan
   langkah (Manager dapat menyelesaikan langkah Partner DAN EQR — rantai
   tiga-lapis runtuh jadi satu), dan tak menolak self-approval.

   Ia tinggal di modul murni ini, bukan di sebuah view, karena PR-4 memberi
   antrean persetujuan DUA permukaan (modul Approvals dan tab AJE). Gerbang
   otorisasi yang hidup di salah satu view berarti permukaan yang lain
   memakai gerbangnya sendiri — cara paling andal melahirkan celah.
   ============================================================ */
export const AJE_STEP_CAP: Record<string, string> = {
  'Audit Manager': CAP.SIGNOFF_REVIEWER,
  'Engagement Partner': CAP.AJE_POST,
  'EQR Reviewer': CAP.EQR_REVIEW,
};

export interface AjeApprovalStepLite { role: string; name?: string; status?: string }
export interface AjeApprovalItemLite { kind: string; from?: string; step: number; chain: AjeApprovalStepLite[] }
export interface AjeSessionUser { name?: string; role: string }

/** Boleh-kah `user` menyelesaikan langkah berjalan pada item ini? */
export function stepAuthority(it: AjeApprovalItemLite, user: AjeSessionUser): { ok: boolean; reason: string } {
  const step = it.chain[it.step];
  if (!step) return { ok: false, reason: 'Rantai persetujuan sudah tuntas.' };
  /* Self-approval: penyusun tak boleh menyetujui pengajuannya sendiri (SoD). */
  if (user && user.name && it.from && user.name === it.from) {
    return { ok: false, reason: 'Penyusun tidak dapat menyetujui pengajuannya sendiri (pemisahan tugas).' };
  }
  /* PR-E — SATU ORANG, SATU LANGKAH. Kapabilitas bukan identitas: `EQR_REVIEW`
     ada pada PARTNER_BASE, sehingga partner yang telah menandatangani langkah
     Engagement Partner masih lolos di langkah EQR pada jurnal yang SAMA. Itu
     menghapus arti penelaahan pengendalian mutu (SMM 2 / SA 220.36).
     Hanya langkah ber-status `approved` yang dihitung: rantai membawa NAMA
     penerima tugas pada langkah yang masih menunggu, dan nama itu bukan
     tanda tangan. */
  const priorSignature = user && user.name
    ? it.chain.slice(0, it.step).find((c) => c && c.status === 'approved' && c.name === user.name)
    : undefined;
  if (priorSignature) {
    return {
      ok: false,
      reason: `Anda telah menandatangani langkah "${priorSignature.role}" pada rantai ini; satu orang tidak dapat mengisi dua langkah (SMM 2 / SA 220.36).`,
    };
  }
  if (it.kind !== 'AJE') {
    const legacy = user.role.includes('Partner') || user.role.includes('Manager');
    return { ok: legacy, reason: legacy ? '' : 'Peran Anda tidak berwenang menyetujui.' };
  }
  const need = AJE_STEP_CAP[step.role];
  if (!need) return { ok: false, reason: `Langkah "${step.role}" belum dipetakan ke kapabilitas.` };
  const ok = rbacCan(user.role, need);
  return { ok, reason: ok ? '' : `Langkah "${step.role}" memerlukan kapabilitas ${need}; peran ${user.role} tidak memilikinya.` };
}

/* ============================================================
   OVERLAY KEPUTUSAN (PR-4)
   ------------------------------------------------------------
   Dua permukaan menulis ke dokumen `approvals_ov_v4` yang sama. Bentuk
   tulisannya karena itu ditetapkan di satu fungsi murni, bukan disalin.
   ============================================================ */

/** Item antrean AJE seperti yang dikeluarkan `AMS.PLATFORM.buildApprovals`. */
export interface AjeQueueItem {
  id: string;
  kind: string;
  sourceId: string;
  status: string;
  step: number;
  chain: AjeChainLink[];
  chainComplete: boolean;
  postedWithoutFullChain: boolean;
  hasVoided?: boolean;
  journal: AjeContractEntry;
  steps: AjeChainStepDef[];
  decisions: AjeDecision[];
  thread: unknown[];
  [k: string]: unknown;
}

export interface AjeOverlayEntry {
  decisions?: AjeDecision[];
  status?: string;
  step?: number;
  by?: string;
  note?: string;
  ts?: string;
  thread?: unknown[];
}

/**
 * Item antrean + keputusan pengguna → item yang dirender.
 *
 * Rantai DIBANGUN ULANG dari gabungan keputusan seed + pengguna, bukan
 * ditambal per-indeks: tambalan tak akan pernah tahu bahwa jurnalnya berubah
 * sejak ditandatangani, dan `ov.status` yang tersimpan bisa mengalahkan
 * rantai (satu jurnal yang disunting tetap tampil disetujui).
 */
export function applyAjeOverlay(d: AjeQueueItem, ov: AjeOverlayEntry | null | undefined): AjeQueueItem {
  if (!ov) return d;
  const built = buildAjeChain(d.journal, d.steps, [...(d.decisions || []), ...(ov.decisions || [])]);
  const rejected = ov.status === 'rejected';
  const chain: AjeChainLink[] = rejected
    ? built.chain.map((c, i) => (i === built.step
      ? { ...c, status: 'rejected' as const, ts: ov.ts || null, name: ov.by || c.name, note: ov.note || 'Ditolak.' }
      : c))
    : built.chain;
  const status = rejected ? 'rejected'
    : ov.status === 'revision' ? 'revision'
      : built.chainComplete ? 'approved' : 'pending';
  return {
    ...d, chain, step: built.step, status,
    chainComplete: built.chainComplete,
    hasVoided: built.hasVoided,
    postedWithoutFullChain: built.postedWithoutFullChain,
    thread: [...(d.thread || []), ...(ov.thread || [])],
  };
}

/**
 * Entri overlay berikutnya setelah sebuah persetujuan — bentuk tulisan yang
 * SAMA dari permukaan mana pun keputusan itu diambil.
 *
 * `done` dihitung dari penghasil rantai, bukan dari `step + 1`: dengan
 * pengikatan hash, "langkah berikutnya" belum tentu berarti "rantai lengkap"
 * (bisa ada tanda tangan yang gugur di belakang).
 */
export function ajeApproveOverlay(input: {
  item: AjeQueueItem;
  prevEntry: AjeOverlayEntry | null | undefined;
  user: AjeSessionUser;
  ts: string;
  note?: string;
}): { entry: AjeOverlayEntry; decision: AjeDecision; done: boolean } {
  const { item, user, ts } = input;
  const note = (input.note || '').trim();
  const stepRole = (item.chain[item.step] && item.chain[item.step].role) || '';
  const decision = makeAjeDecision({
    a: item.journal, idx: item.step, stepRole, name: user.name, role: user.role, ts, note,
  });
  const prev = input.prevEntry || {};
  const decisions = [...(prev.decisions || []), decision];
  const done = buildAjeChain(item.journal, item.steps, [...(item.decisions || []), ...decisions]).chainComplete;
  const thread = note
    ? [...(prev.thread || []), { who: user.name, role: user.role, when: ts, text: note, kind: 'approve' }]
    : (prev.thread || []);
  return {
    entry: { ...prev, step: item.step + 1, status: done ? 'approved' : 'pending', decisions, thread },
    decision,
    done,
  };
}

/** Entri overlay setelah PENOLAKAN — bentuk yang sama dari permukaan mana pun. */
export function ajeRejectOverlay(input: {
  prevEntry: AjeOverlayEntry | null | undefined; user: AjeSessionUser; ts: string; note?: string;
}): AjeOverlayEntry {
  const prev = input.prevEntry || {};
  const text = (input.note || '').trim() || 'Ditolak.';
  return {
    ...prev, status: 'rejected', by: input.user.name, note: text, ts: input.ts,
    thread: [...(prev.thread || []), { who: input.user.name, role: input.user.role, when: input.ts, text, kind: 'reject' }],
  };
}

/** Entri overlay setelah PERMINTAAN REVISI. */
export function ajeReviseOverlay(input: {
  prevEntry: AjeOverlayEntry | null | undefined; user: AjeSessionUser; ts: string; note?: string;
}): AjeOverlayEntry {
  const prev = input.prevEntry || {};
  const text = (input.note || '').trim() || 'Mohon revisi & ajukan ulang.';
  return {
    ...prev, status: 'revision',
    thread: [...(prev.thread || []), { who: input.user.name, role: input.user.role, when: input.ts, text, kind: 'revise' }],
  };
}
