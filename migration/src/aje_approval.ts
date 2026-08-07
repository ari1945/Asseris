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

/** Ambang nilai yang menuntut langkah EQR (ISQM 2 / SA 220.36). */
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
