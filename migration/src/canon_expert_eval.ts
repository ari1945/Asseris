/* ============================================================
   Asseris — SA 500 ¶8 / SA 620 · evaluasi pekerjaan pakar
   ------------------------------------------------------------
   Modul MURNI. Satu bentuk & satu daftar langkah untuk SELURUH
   permukaan yang mengaku "mengevaluasi pakar":
     · PSAK 68 — penilai KJPP (V-2) & pakar valuasi derivatif (V-3)
     · SA 540  — estimasi ber-jalur respons 'Gunakan pakar (SA 620)'

   Sebelum modul ini keduanya menampilkan empat centang hijau yang
   DIPAKU sebagai literal: kompetensi, objektivitas, ruang lingkup,
   kewajaran temuan. Tidak ada dokumen yang dituntut, tidak ada isian
   yang tersimpan, dan tak ada keadaan yang membuatnya merah.

   Kunci persist `expertEval.v1` (engagement-scoped) — kunci pakar
   ('V-2') maupun kunci estimasi ('E-04') hidup di ruang nama yang sama
   karena pertanyaannya identik; yang berbeda hanya objeknya.

   CATATAN LINGKUP: modul ini merekam BAHWA evaluasi dilakukan. Gerbang yang
   menuntut DOKUMEN pakar ber-hash di DMS sebelum sign-off KINI ADA di sini
   (`expertGateBlockers` + `expertGateSignatureViolations`), ditegakkan server.

   PRD prd-sa620-expert-gate-server PR-1 — modul ini KINI diimpor server
   (`server/src/signoff.ts`), pola yang sama dengan `wp_chain`/`aje_contract`:
   aturan SA 620 hidup SEKALI, dipakai gate UI dan penegakan server. Satu-satunya
   impornya (`wpSigKey`) berasal dari modul yang server sudah impor.
   ============================================================ */
import { wpSigKey } from './wp_chain';

export interface ExpertEval {
  /** SA 500 ¶8(a) / SA 620 ¶9 — kompetensi & kapabilitas pakar dievaluasi. */
  competence?: boolean;
  /** SA 500 ¶8(a) / SA 620 ¶9 — objektivitas / independensi pakar dinilai. */
  objectivity?: boolean;
  /** SA 620 ¶10-11 — ruang lingkup, metode & asumsi pakar dipahami. */
  scope?: boolean;
  /** SA 500 ¶8(c) / SA 620 ¶12 — kewajaran temuan pakar dievaluasi. */
  findings?: boolean;
  /** uid rekaman bukti (DMS) yang MERUPAKAN laporan pakar. Bukan nama berkas:
   *  nama dapat berubah & pencocokan teks rapuh. uid menautkan ke dokumen yang
   *  benar-benar terlampir, sehingga tautan putus bila dokumennya dicabut. */
  docUid?: string;
  by?: string;
  at?: string;
}

export type ExpertEvalState = Record<string, ExpertEval>;

export type ExpertEvalStepKey = 'competence' | 'objectivity' | 'scope' | 'findings';

export interface ExpertEvalStep { key: ExpertEvalStepKey; ref: string; t: string }

/** Urutan & teks langkah — dirender UI dari sini, bukan dari literal per-view. */
export const EXPERT_EVAL_STEPS: ExpertEvalStep[] = [
  { key: 'competence',  ref: 'SA 500 ¶8(a)', t: 'Kompetensi & kapabilitas pakar dievaluasi' },
  { key: 'objectivity', ref: 'SA 620 ¶9',    t: 'Objektivitas / independensi pakar dinilai' },
  { key: 'scope',       ref: 'SA 620 ¶10-11', t: 'Ruang lingkup, metode & asumsi pakar dipahami' },
  { key: 'findings',    ref: 'SA 500 ¶8(c)', t: 'Kewajaran temuan pakar dievaluasi' },
];

export function expertEvalComplete(ev?: ExpertEval | null): boolean {
  if (!ev) return false;
  return EXPERT_EVAL_STEPS.every(s => ev[s.key] === true);
}

export function expertEvalDone(ev?: ExpertEval | null): number {
  if (!ev) return 0;
  return EXPERT_EVAL_STEPS.filter(s => ev[s.key] === true).length;
}

/** Rujukan pakar yang BELUM tuntas dievaluasi — dipakai gerbang kesimpulan. */
export function expertEvalMissing(state: ExpertEvalState | null | undefined, refs: string[]): string[] {
  const st = state || {};
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of refs || []) {
    if (!r || seen.has(r)) continue;
    seen.add(r);
    if (!expertEvalComplete(st[r])) out.push(r);
  }
  return out;
}

/* ============================================================
   GERBANG SIGN-OFF (PR-5 · butir 20 PRD)
   ------------------------------------------------------------
   Estimasi yang jalur responsnya "Gunakan pakar (SA 620)" bersandar
   SEPENUHNYA pada pekerjaan pihak ketiga. Menandatangani kertas kerjanya
   tanpa mengevaluasi pekerjaan itu — dan tanpa dokumennya ada — berarti
   menyatakan kecukupan bukti yang tak pernah diperiksa.

   Mengikuti pola gerbang etik/AML yang sudah ada: logika MURNI di sini,
   hook tipis membacanya, `wp_signoff` memakainya sebagai `canSign`.
   ============================================================ */

export interface ExpertGateBearer { id: string; name: string; approach: string }
export interface ExpertGateBlocker { id: string; name: string; reasons: string[] }

export const EXPERT_APPROACH = 'Gunakan pakar (SA 620)';

export interface ExpertGateOptions {
  approach?: string;
  /**
   * Tuntut laporan pakar tertaut & masih hidup di DMS. Baku `true`.
   *
   * Dimatikan hanya bila daftar dokumen TAK DAPAT DIKETAHUI: UI memasang `false`
   * saat server tak terjangkau, karena menyimpulkan "tak ada dokumen" dari
   * kegagalan jaringan akan memblokir seluruh sign-off SA 540 setiap kali koneksi
   * putus — kegagalan yang lebih besar daripada yang dicegahnya. Server (yang
   * SELALU dapat membaca DMS-nya sendiri) memakai baku `true`.
   */
  requireDocument?: boolean;
}

/**
 * Estimasi yang MENGHALANGI sign-off, beserta alasannya.
 * `evidenceUids` = uid dokumen yang benar-benar terlampir pada modul; tautan
 * ke dokumen yang sudah dicabut dilaporkan sebagai putus, bukan diabaikan.
 */
export function expertGateBlockers(
  estimates: ExpertGateBearer[] | null | undefined,
  state: ExpertEvalState | null | undefined,
  evidenceUids: readonly string[] | null | undefined,
  opts: ExpertGateOptions = {},
): ExpertGateBlocker[] {
  const approach = opts.approach ?? EXPERT_APPROACH;
  const requireDocument = opts.requireDocument !== false;
  const st = state || {};
  const uids = new Set(evidenceUids || []);
  const out: ExpertGateBlocker[] = [];
  for (const e of estimates || []) {
    if (!e || e.approach !== approach) continue;
    const ev = st[e.id];
    const reasons: string[] = [];
    const done = expertEvalDone(ev);
    if (!expertEvalComplete(ev)) reasons.push(`Evaluasi SA 500 ¶8 belum tuntas (${done}/${EXPERT_EVAL_STEPS.length})`);
    if (requireDocument) {
      const uid = ev && ev.docUid;
      if (!uid) reasons.push('Laporan pakar belum ditautkan dari DMS perikatan');
      else if (!uids.has(uid)) {
        /* PR-2 — tautan WARISAN dibedakan dari tautan PUTUS. Keduanya sama-sama tak
           resolve, tetapi tindakan yang dituntut berbeda, dan pesan yang menyuruh
           auditor mencari dokumen yang tak pernah ada di server akan membuang waktunya:
           yang warisan harus DIUNGGAH, yang putus harus ditelusuri (siapa mencabutnya). */
        reasons.push(isLegacyDocUid(uid)
          ? 'Tautan warisan ke bukti lokal perangkat lama — unggah ulang laporan pakar ke DMS perikatan, lalu tautkan kembali'
          : 'Dokumen pakar yang ditautkan tidak lagi ada di DMS perikatan (dicabut)');
      }
    }
    if (reasons.length) out.push({ id: e.id, name: e.name, reasons });
  }
  return out;
}

/* ============================================================
   PENEGAKAN SERVER (PRD prd-sa620-expert-gate-server · PR-1)
   ------------------------------------------------------------
   Gate UI menonaktifkan TOMBOL; ia tidak menjaga JALUR TULIS. Panggilan
   `state.set` langsung dengan `wpState.sa540.chain.preparer` lolos seluruh
   gerbang server (isolasi perikatan, capForWrite=WP_EDIT, kapabilitas per-slot,
   aturan rantai) dan menghasilkan kertas kerja bertanda tangan sah atas estimasi
   yang bersandar pada pakar yang tak pernah dievaluasi. Kelas cacat yang sama
   dengan #23 (SoD) dan PR-B (overlay persetujuan AJE).

   Yang digerbang adalah PEROLEHAN tanda tangan, bukan pencabutannya: gerbang
   yang ikut memblokir `unsign` akan MENJEBAK kertas kerja dalam keadaan
   tertandatangani — persis kebalikan dari tujuannya.
   ============================================================ */

/** Ref `wpState` yang tanda tangannya tunduk pada gerbang SA 620. */
export const EXPERT_GATED_REFS: ReadonlySet<string> = new Set(['sa540']);

/** Koleksi lampiran DMS tempat laporan pakar SA 540 hidup — dibaca UI dan server. */
export const EXPERT_DOC_COLLECTION = 'sa540';

/**
 * `docUid` WARISAN — uid `localStorage` dari sebelum PR-2 (`ev-<ms>-<rand>`,
 * lihat `amsAttachEvidence` di evidence.tsx). Sejak PR-2 `docUid` adalah id
 * lampiran DMS server.
 *
 * Predikat ini MURNI dan sengaja hidup di sini karena dipakai dua sisi: UI
 * menandainya (PR-2) dan server menolaknya dengan sebab yang TEPAT (PR-3,
 * keputusan Q1 = blokir tanpa grandfathering). Tanpa predikat ini, tautan
 * warisan akan ditolak sebagai "dokumen tidak lagi ada" — pesan yang benar
 * secara teknis dan menyesatkan secara praktis: dokumennya tak pernah ada
 * di server, dan yang dituntut adalah mengunggahnya, bukan mencarinya.
 */
export function isLegacyDocUid(uid: string | null | undefined): boolean {
  return !!uid && /^ev-/.test(uid);
}

export interface ExpertGateSlot { ref: string; slot: string }

export interface ExpertGateViolation {
  code: 'expert-gate';
  ref: string;
  slot: string;
  estimateId: string;
  message: string;
}

function asChainObj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

/**
 * Slot rantai yang MEMPEROLEH tanda tangan pada tulisan ini.
 *
 * Seluruh slot yang hadir diperiksa — tidak ada daftar slot yang dipaku
 * (keputusan Q3: keempatnya digerbang). Slot baru karenanya ikut tergerbang
 * secara baku, bukan tertinggal diam-diam.
 *
 * MURNI & MURAH — dipakai router sebagai pra-cek untuk memutuskan perlu-tidaknya
 * membaca dokumen saudara, sehingga suntingan isi kertas kerja biasa (mayoritas
 * tulisan `wpState`) tidak menimbulkan satu query pun.
 */
export function expertGateSignatureSlots(input: {
  prev: unknown; next: unknown; gatedRefs?: ReadonlySet<string>;
}): ExpertGateSlot[] {
  const refs = input.gatedRefs || EXPERT_GATED_REFS;
  const p = asChainObj(input.prev), n = asChainObj(input.next);
  const out: ExpertGateSlot[] = [];
  for (const ref of refs) {
    const pc = asChainObj(asChainObj(p[ref]).chain);
    const nc = asChainObj(asChainObj(n[ref]).chain);
    for (const slot of Object.keys(nc).sort()) {
      const after = wpSigKey(nc[slot]);
      if (!after) continue;                    // slot kosong / DICABUT — tak digerbang
      if (after === wpSigKey(pc[slot])) continue;  // tak berubah
      out.push({ ref, slot });
    }
  }
  return out;
}

/**
 * Pelanggaran gerbang pakar atas sebuah tulisan `wpState`.
 *
 * Ini ATURAN, bukan otoritas — dalam taksonomi `signoff.ts` yang sama dengan
 * `posted-immutable:*` dan `signature-*`: tak ada kapabilitas yang memuaskannya,
 * Rekan Pemimpin sekalipun. Alasannya bukan hierarki melainkan fakta — tidak ada
 * peran yang membuat pekerjaan pakar yang tak dievaluasi menjadi bukti yang cukup.
 *
 * Alasan penolakan berasal dari `expertGateBlockers` yang SAMA dengan yang dibaca
 * `useEstimateExpertGate`, sehingga pesan server dan hint UI tak dapat menyimpang.
 */
export function expertGateSignatureViolations(input: {
  prev: unknown;
  next: unknown;
  estimates?: ExpertGateBearer[] | null;
  expertEval?: ExpertEvalState | null;
  liveDocIds?: readonly string[] | null;
  gatedRefs?: ReadonlySet<string>;
  requireDocument?: boolean;
}): ExpertGateViolation[] {
  const slots = expertGateSignatureSlots(input);
  if (!slots.length) return [];
  const blockers = expertGateBlockers(input.estimates, input.expertEval, input.liveDocIds, {
    requireDocument: input.requireDocument,
  });
  if (!blockers.length) return [];
  const out: ExpertGateViolation[] = [];
  for (const s of slots) {
    for (const b of blockers) {
      out.push({
        code: 'expert-gate', ref: s.ref, slot: s.slot, estimateId: b.id,
        message: `${b.name} — ${b.reasons.join('; ')}`,
      });
    }
  }
  return out;
}

/** Rujukan pakar unik yang dipakai sekumpulan pos (mis. `psak68().items`). */
export function expertRefsOf(items: Array<{ expert?: string }> | null | undefined): string[] {
  const out: string[] = [];
  for (const it of items || []) {
    const r = it && it.expert;
    if (r && out.indexOf(r) < 0) out.push(r);
  }
  return out;
}
