/* ============================================================
   Fase 2 — Penegakan SERVER sign-off berbasis peran (intra-dokumen).
   ------------------------------------------------------------
   `capForWrite` hanya gate per-DOKUMEN (wpState/opinionDoc/reviewNotes =
   WP_EDIT → semua peran). Guard ini menutup celah segregation-of-duties di
   level SUB-DOKUMEN: ia mem-DIFF nilai tersimpan vs nilai masuk pada
   `state.set` dan menuntut kapabilitas peran yang TEPAT untuk tiap perubahan
   otoritatif (tanda tangan slot, finalisasi, kliring catatan).

   Sejajar dengan gate UI (wp_signoff.tsx / view_opinion_parts.tsx /
   view_workspace.tsx) — SSOT kapabilitas sama (rbac). Klien tetap mengirim
   dokumen utuh; tak ada perubahan kontrak. Murni → unit-testable.
   ============================================================ */
import { TRPCError } from '@trpc/server';
import { can, CAP } from './rbac';
/* PR-1 — kontrak jurnal (hash isi) dibagi dengan klien lintas paket, pola yang
   sama dengan `rbac`: satu definisi "isi jurnal yang mengikat persetujuan",
   bukan dua yang berpeluang menyimpang. Modulnya MURNI (tanpa React/DOM). */
import { ajeImmutabilityViolations } from '../../migration/src/aje_contract';
import { decisionTimestampError } from '../../migration/src/aje_approval';
/* PRD prd-wp-signoff-integrity — aturan rantai kertas kerja, modul yang SAMA
   dengan yang dipakai UI. Gerbang yang hidup di satu sisi saja adalah cara
   paling andal melahirkan celah (pelajaran #23, lalu quickSign). */
import { wpChainViolations, signatureAttributionViolations } from '../../migration/src/wp_chain';
/* PRD Kesiapan P2PK PR-1 — aturan gerbang EQR (ISQM 2). Modul MURNI yang sama
   dipakai UI, agar "lolos di layar" dan "lolos di server" tak dapat menyimpang. */
import { eqrGateFor, type EqrReviewRow } from '../../migration/src/canon_eqr_gate';
/* PRD Kesiapan P2PK PR-3 — aturan atestasi mutu firma (ISQM 1 ¶20 · ¶53–54). */
import { attestContentHash, attestRolesFor, attestRoleCap } from '../../migration/src/canon_firm_attest';
/* PRD prd-sa620-expert-gate-server PR-1 — aturan gerbang pakar SA 620. Modul yang
   SAMA dengan yang dibaca `useEstimateExpertGate`; alasan penolakan server dan hint
   UI karenanya tak dapat menyimpang (K9). */
import {
  expertGateSignatureSlots, expertGateSignatureViolations, EXPERT_DOC_COLLECTION,
  type ExpertGateBearer,
} from '../../migration/src/canon_expert_eval';
import type { ExpertEvalState } from '../../migration/src/canon_expert_eval';

export type SignoffChange = { what: string; cap: string };

/* ============================================================
   KONTEKS LINTAS-DOKUMEN (PRD prd-sa620-expert-gate-server · PR-1)
   ------------------------------------------------------------
   Sebagian aturan tidak dapat dijawab oleh dokumen yang sedang ditulis saja:
   gerbang SA 620 menanyakan estimasi mana yang berjalur pakar (`estimates.v1`)
   dan apa yang sudah dievaluasi (`expertEval.v1`) — dua StateDoc SAUDARA.

   `guardSignoffWrite` tetap MURNI & SINKRON; pemanggil yang memasok konteksnya.
   Menjadikan guard `async` + ber-Prisma akan menular ke seluruh berkas uji dan
   mengawinkan modul aturan dengan lapisan data — persis yang dihindari
   `wp_chain.ts`.
   ============================================================ */

export interface SignoffContextNeeds {
  /** Kunci StateDoc pada scope YANG SAMA dengan tulisan. Tabel statis — tak pernah dari input klien. */
  siblingKeys: readonly string[];
  /** Koleksi lampiran DMS yang id hidupnya dibutuhkan (kosong sampai PR-3). */
  attachmentCollections: readonly string[];
  /* Kunci StateDoc ber-scope FIRMA. Sebagian registri mutu bersifat LINTAS-perikatan
     (`eqrReviews.v2` adalah registri EQR seluruh firma), sehingga gerbang atas tulisan
     ber-scope perikatan — penerbitan opini — harus dapat membacanya. Tabel statis. */
  firmSiblingKeys?: readonly string[];
  /* Butuh id pegawai (EMP-xxx) milik AKTOR. Deklarasi pribadi (Kode Etik) berkunci
     empId, sehingga "apakah ini deklarasi Anda sendiri" hanya dapat dijawab bila
     server memetakan sesi → EMP. Resolusinya async, jadi ia dimuat di `loadSignoffContext`
     dan diserahkan ke guard yang tetap MURNI & SINKRON. */
  actorEmpId?: boolean;
}

export interface SignoffContext {
  /** Nilai ter-parse per kunci. Kunci yang TIDAK ADA di server sengaja absen di sini
   *  (bukan `{}`), sehingga "dokumen tak pernah ditulis" dapat dibedakan dari "kosong". */
  siblings: Record<string, unknown>;
  liveAttachmentIds: Record<string, readonly string[]>;
  /** Dokumen ber-scope firma; absen = belum pernah ditulis (sama semantiknya dgn `siblings`). */
  firmSiblings?: Record<string, unknown>;
  /** Alamat tulisan yang sedang dijaga — aturan lintas-perikatan menyaring registri dengannya. */
  scope?: string;
  scopeId?: string;
  /** EMP-xxx aktor; `null` = sesi tak terpetakan ke personel firma. */
  actorEmpId?: string | null;
}

const EXPERT_GATE_SIBLINGS = ['estimates.v1', 'expertEval.v1'] as const;

/* PRD Kesiapan P2PK PR-1 — registri yang dibutuhkan gerbang EQR. `eqrReviews.v2`
   adalah registrinya; `engagements` + `clients` dipakai MENURUNKAN status PIE
   (SSOT `client.listed` — sama dengan `engMeta().pie` di klien). */
const EQR_GATE_FIRM_SIBLINGS = ['eqrReviews.v2', 'engagements', 'clients'] as const;

function asArray(v: unknown): unknown[] { return Array.isArray(v) ? v : []; }

/* --- Gerbang etik & independensi tim (PRD Kesiapan P2PK · PR-2b) -------------
   Sampai PR ini KEDUA gerbang nol penegakan server: `ethics_gate.tsx` sendiri
   mencatatnya ("Penegakan saat ini di LAPISAN UI"), dan `memberIndep.v1`
   di-gate `capForWrite`=WP_EDIT — setiap auditor dapat menandatangani deklarasi
   independensi anggota tim MANA PUN lewat tulisan tRPC langsung.

   Invarian yang ditegakkan bukan "siapa boleh menulis" melainkan "tanda tangan
   menyebut orang yang membubuhkannya" — invarian yang sama dengan `wp_chain`. */

/** empId yang deklarasi etiknya BARU menjadi ditandatangani. */
function ethicsSignedTransitions(prev: unknown, next: unknown): string[] {
  const p = asObj(prev), n = asObj(next);
  return Object.keys(n).filter((emp) => !asObj(p[emp]).signed && !!asObj(n[emp]).signed);
}

/** Deklarasi anggota "memuaskan gerbang" = ditandatangani DAN bukan bawaan seed. */
function memberIndepCounts(d: unknown): boolean {
  const o = asObj(d);
  return !!o.signed && !o.seeded;
}

/** Anggota yang deklarasinya BARU menjadi memuaskan gerbang. */
function memberIndepSatisfyTransitions(prev: unknown, next: unknown): string[] {
  const p = asObj(prev), n = asObj(next);
  return Object.keys(n).filter((m) => !memberIndepCounts(p[m]) && memberIndepCounts(n[m]));
}

/**
 * Status PIE perikatan dari registri firma — `null` bila TAK DAPAT ditentukan
 * (registri belum pernah ditulis ke server, mis. instalasi baru).
 *
 * Membedakan `null` dari `false` disengaja: "bukan PIE" dan "tak tahu apakah PIE"
 * menuntut perlakuan berbeda di gerbang, dan menyamakannya persis cara cacat
 * fail-open yang ditutup PR ini lahir.
 */
function engagementIsPie(firmSiblings: Record<string, unknown>, engId: string): boolean | null {
  const engs = asArray(firmSiblings['engagements']);
  const clients = asArray(firmSiblings['clients']);
  if (!engs.length || !clients.length) return null;
  const eng = engs.find((e) => asObj(e).id === engId);
  if (!eng) return null;
  const clientId = asObj(eng).clientId;
  const c = clients.find((x) => asObj(x).id === clientId);
  if (!c) return null;
  return !!asObj(c).listed;
}

/**
 * Konteks yang dibutuhkan tulisan ini — `null` bila diff tak menyentuh apa pun
 * yang digerbang lintas-dokumen. MURNI, dipanggil router SEBELUM guard.
 */
export function signoffContextNeeds(key: string, prev: unknown, next: unknown): SignoffContextNeeds | null {
  /* Gerbang EQR (ISQM 2 / SPM 2). Penerbitan opini WAJIB melewati penelaahan mutu
     perikatan, tetapi sampai PR-1 penegakannya hanya di UI: `state.set` langsung ke
     `opinionDoc.v1 {finalized:true}` menembusnya sepenuhnya. Konteks hanya diminta
     pada TRANSISI menjadi final — suntingan draf opini tetap nol query. */
  if (key === 'opinionDoc.v1') {
    const p = asObj(prev), n = asObj(next);
    if (!p.finalized && !!n.finalized) {
      return { siblingKeys: [], attachmentCollections: [], firmSiblingKeys: EQR_GATE_FIRM_SIBLINGS };
    }
    return null;
  }
  /* Deklarasi Kode Etik — pernyataan PRIBADI berkunci empId. */
  if (key === 'pc.ethics') {
    return ethicsSignedTransitions(prev, next).length
      ? { siblingKeys: [], attachmentCollections: [], actorEmpId: true }
      : null;
  }
  /* Deklarasi independensi anggota tim: aturannya MURNI dari diff (atribusi),
     tak menyentuh dokumen lain — jadi ia sengaja TIDAK meminta konteks. Meminta
     konteks kosong akan memicu penjaga perkabelan generik dan menolak tulisan
     yang sah. */
  if (key !== 'wpState') return null;
  if (!expertGateSignatureSlots({ prev, next }).length) return null;
  /* PR-3 — limb DOKUMEN kini menyala: `docUid` menunjuk id lampiran DMS (PR-2),
     jadi "laporan pakar itu ada" dapat diperiksa server. Daftar id hidup diambil
     dari koleksi yang SAMA dengan yang ditulis pemilih di UI. */
  return { siblingKeys: EXPERT_GATE_SIBLINGS, attachmentCollections: [EXPERT_DOC_COLLECTION] };
}

/** Registri estimasi dari `estimates.v1` — `null` berarti dokumennya TAK ADA di server. */
function readEstimateRegister(v: unknown): ExpertGateBearer[] | null {
  if (!v || typeof v !== 'object') return null;
  const reg = (v as { register?: unknown }).register;
  return Array.isArray(reg) ? (reg as ExpertGateBearer[]) : [];
}

/* Tanda tangan/jejak otoritatif → string kanonik (urutan-kunci tak relevan).
   Menangkap bentuk wpState chain {by,at}, opini signoff {date}, dll. */
function sig(v: unknown): string {
  if (!v || typeof v !== 'object') return v ? String(v) : '';
  const o = v as Record<string, unknown>;
  return `${o.by ?? ''}~${o.at ?? ''}~${o.date ?? ''}`;
}

function asObj(v: unknown): Record<string, any> {
  return v && typeof v === 'object' ? (v as Record<string, any>) : {};
}

/* Slot rantai kertas kerja (wpState[ref].chain) & slot opini (opinionDoc.signoff)
   → kapabilitas.

   `preparer` KINI ADA di sini (PRD prd-wp-signoff-integrity). Ia dulu sengaja
   dikecualikan dengan alasan "itu WP_EDIT, semua auditor, sudah di-gate
   capForWrite" — alasan yang benar tentang OTORITAS dan salah tentang segalanya
   yang lain. Kapabilitas menjawab "bolehkah peran ini menandatangani slot ini";
   ia tidak menjawab "apakah tanda tangan ini menyebut orang yang membubuhkannya".
   Selama slot ini absen, `guardSignoffWrite` mengembalikan [] untuk sebuah
   tulisan yang menaruh nama auditor lain di slot Preparer — dan itulah yang
   dilakukan `quickSign` pada setiap kertas kerja. */
const WP_CHAIN_CAP: Record<string, string> = {
  preparer: CAP.WP_EDIT,
  reviewer: CAP.SIGNOFF_REVIEWER, // = slot Reviu Manajer opini (di-mirror ke wpState['900'])
  partner: CAP.OPINION_APPROVE,
  eqr: CAP.EQR_REVIEW,
};

/* Ref yang rantainya adalah CERMIN dokumen lain — urutannya (R3) dimiliki di sana.
   `wpState['900']` mencerminkan `opinionDoc.v1`; lihat catatan di wp_chain.ts. */
const WP_MIRROR_REFS: ReadonlySet<string> = new Set(['900']);
const OPINION_SLOT_CAP: Record<string, string> = {
  manager: CAP.SIGNOFF_REVIEWER,
  partner: CAP.OPINION_APPROVE,
  eqr: CAP.EQR_REVIEW,
};

/* PR-6a — slot persetujuan memo materialitas (`mat.memo.signoff`, SA 320 + SA 230).
   Sebelum ini `view_materiality_parts.tsx` TAK punya satu pun gate `can()`: peran apa pun
   (termasuk Junior Auditor) dapat mengisi slot "Disetujui — Partner", dan tanda tangan itu
   ikut ke PDF memo yang TERSEGEL Ed25519 sebagai persetujuan Rekan Perikatan. `preparer`
   SENGAJA absen di sini — itu WP_EDIT (semua auditor), sudah di-gate capForWrite. */
const MAT_MEMO_SLOT_CAP: Record<string, string> = {
  manager: CAP.SIGNOFF_REVIEWER,   // Reviu Manajer — Partner + Manajer
  partner: CAP.OPINION_APPROVE,    // Persetujuan Rekan Perikatan — Partner saja
};

/* Tanda tangan memo memakai bentuk {name, role, at} (bukan {by, at} seperti wpState),
   jadi ia butuh tanda-tangan kanonik sendiri: memakai `sig()` akan membuat pergantian
   NAMA penanda tangan pada `at` yang sama lolos tanpa terdeteksi. */
function sigNamed(v: unknown): string {
  if (!v || typeof v !== 'object') return v ? String(v) : '';
  const o = v as Record<string, unknown>;
  return `${o.name ?? ''}~${o.role ?? ''}~${o.at ?? ''}`;
}

/* Key yang membawa aksi otoritatif intra-dokumen (engagement: wpState/opinionDoc/reviewNotes;
   firm: prospects → keputusan akseptasi & penerbitan surat perikatan). Nama key unik antar-scope
   (tak ada tabrakan), jadi guard di-dispatch by key. */
export const SIGNOFF_KEYS = new Set(['wpState', 'opinionDoc.v1', 'reviewNotes', 'prospects', 'strategyApproved.v1', 'mat.memo.signoff',
  /* PR-B — ledger jurnal & keputusan persetujuannya. Sebelumnya KEDUANYA absen dari
     daftar ini, sehingga `guardSignoffWrite` tak pernah berjalan untuk AJE: satu-satunya
     gerbang server pada kunci `aje` adalah capForWrite=AJE_EDIT (dimiliki Senior Auditor),
     dan `approvals_ov_*` tak dijaga sama sekali. Klien yang dimodifikasi — atau panggilan
     tRPC langsung — dapat menulis status 'Posted' tanpa hambatan. */
  'aje', 'approvals_ov_v4',
  /* PR-2b — deklarasi Kode Etik & independensi anggota tim. Keduanya MENGGERBANGI
     sign-off kertas kerja dan penerbitan opini, tetapi sebelumnya tak dijaga sama
     sekali: satu-satunya gerbang server adalah capForWrite (HR_MANAGE / WP_EDIT). */
  'pc.ethics', 'memberIndep.v1']);

/* Kunci atestasi mutu firma BER-ALAMAT DINAMIS (`firmAttest.<nama>.<tahun>`),
   jadi ia tak dapat dicantumkan sebagai anggota Set. Router memakai predikat ini
   alih-alih `SIGNOFF_KEYS.has(key)` — kunci yang tak masuk salah satunya tidak
   pernah melewati `guardSignoffWrite` sama sekali. */
export function isSignoffKey(key: string): boolean {
  return SIGNOFF_KEYS.has(key) || key.startsWith('firmAttest.');
}

/* PR-B — peran-langkah rantai AJE → kapabilitas. Cermin `STEP_CAP` di view_platform.tsx;
   SSOT kapabilitas sama (rbac), sengaja dipisah dari OPINION_APPROVE. */
const AJE_STEP_CAP: Record<string, string> = {
  'Audit Manager': CAP.SIGNOFF_REVIEWER,
  'Engagement Partner': CAP.AJE_POST,
  'EQR Reviewer': CAP.EQR_REVIEW,
};

/** Peta id→status dari ledger AJE (array). */
function ajeStatusMap(v: unknown): Record<string, string> {
  const m: Record<string, string> = {};
  if (Array.isArray(v)) for (const x of v) if (x && x.id != null) m[String(x.id)] = String(x.status ?? '');
  return m;
}

/* Status surat perikatan yang berarti DITERBITKAN (vs intake/draft). */
const LETTER_ISSUED = new Set(['sent', 'signed']);

/** Pengguna sesi — identitas OTORITATIF, bukan hanya perannya. */
export interface SignoffActor {
  id: string;
  name: string;
  role: string;
}

/**
 * Tegakkan otoritas DAN integritas per-slot atas sebuah tulisan StateDoc.
 * Mengembalikan daftar perubahan otoritatif terdeteksi (untuk detail jejak audit).
 *
 * Dua jenis penolakan, dan bedanya penting:
 *  · `requires:<cap>` — OTORITAS. Peran ini tak berwenang atas perubahan itu.
 *    Peran lain boleh.
 *  · `signature-*` / `posted-immutable:*` — ATURAN. Tak ada kapabilitas yang
 *    dapat memuaskannya; Rekan Pemimpin sekalipun ditolak.
 *
 * Sebelum PRD prd-wp-signoff-integrity fungsi ini hanya menerima `role`, sehingga
 * pertanyaan "apakah tanda tangan ini menyebut orang yang membubuhkannya" tak
 * dapat ditanyakan sama sekali — untuk slot MANA PUN, bukan hanya preparer.
 */
export function guardSignoffWrite(actor: SignoffActor, key: string, prev: unknown, next: unknown, now: number = Date.now(), ctx?: SignoffContext): SignoffChange[] {
  const role = actor.role;
  const changes: SignoffChange[] = [];
  /* FAIL-CLOSED atas celah MEKANISME, bukan celah wewenang. Bila tulisan ini butuh
     dokumen saudara dan pemanggil tak memasoknya, gerbangnya akan diam-diam lolos —
     dan gerbang yang dapat dilewati dengan lupa memanggil bukan gerbang. Bukan
     FORBIDDEN: ini cacat perkabelan server, dan melabelinya sebagai persoalan
     wewenang akan mengirim auditor mengejar masalah izin yang tidak ada. */
  const needs = signoffContextNeeds(key, prev, next);
  if (needs && !ctx) {
    /* Dinamai `signoff:` sejak PRD Kesiapan P2PK PR-1 — pemeriksaan ini kini menjaga
       DUA gerbang (pakar SA 620 dan EQR ISQM 2). Nama lamanya (`expert-gate:`) akan
       mengirim orang yang men-debug perkabelan EQR ke kode SA 620. */
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'signoff:context-missing' });
  }
  const need = (cap: string, what: string) => {
    changes.push({ what, cap });
    if (!can(role, cap)) throw new TRPCError({ code: 'FORBIDDEN', message: `requires:${cap}` });
  };
  /* Aturan integritas tanda tangan — dipakai bertiga (wpState, opini, memo).
     Pesan dikirim apa adanya ke klien: ia menjelaskan sebab, bukan sekadar menolak. */
  const attribution = (s: { byUserId?: unknown; display?: unknown; at?: unknown }, label: string) => {
    for (const v of signatureAttributionViolations(s, label, { id: actor.id, name: actor.name }, now)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: `${v.code}: ${v.message}` });
    }
  };

  if (key === 'wpState') {
    /* OTORITAS lebih dulu, ATURAN sesudahnya — urutan ini disengaja.
       "Peran Anda tak berwenang atas slot ini" adalah penolakan yang lebih
       mendasar dan lebih dapat ditindaklanjuti daripada "tanda tangan Anda cacat
       bentuk". Yang penting bukan mana yang lebih dulu, melainkan bahwa TAK ADA
       yang dapat lolos: setiap tulisan yang melewati kapabilitas tetap harus
       melewati aturan. */
    const p = asObj(prev), n = asObj(next);
    for (const ref of new Set([...Object.keys(p), ...Object.keys(n)])) {
      const pc = asObj(p[ref] && p[ref].chain), nc = asObj(n[ref] && n[ref].chain);
      for (const slot of Object.keys(WP_CHAIN_CAP)) {
        if (sig(pc[slot]) !== sig(nc[slot])) need(WP_CHAIN_CAP[slot], `wp:${ref}.${slot}`);
      }
    }
    for (const v of wpChainViolations({
      prev, next, actor: { id: actor.id, name: actor.name }, now, skipOrderRefs: WP_MIRROR_REFS,
    })) {
      throw new TRPCError({ code: 'FORBIDDEN', message: `${v.code}:wp:${v.ref}.${v.slot}: ${v.message}` });
    }
    /* GERBANG PAKAR SA 620 — hanya berjalan bila tulisan ini benar-benar memperoleh
       tanda tangan pada ref yang digerbang (`needs` non-null). */
    if (needs && ctx) {
      const register = readEstimateRegister(ctx.siblings['estimates.v1']);
      if (register === null) {
        /* Q2 — FAIL-OPEN, TETAPI TERLIHAT. Registri hanya tersimpan setelah seseorang
           menyuntingnya; tanpa dokumen itu server tak dapat melihat satu pun estimasi
           berjalur SA 620. Membiarkannya lolos DIAM-DIAM akan menjadikan "jangan simpan
           registri" sebagai bypass permanen yang tak berjejak. Penanda ini masuk detail
           `AuditEvent`; padanan yang dilihat penandatangan ada di kertas kerjanya
           (`useEstimateExpertGate().serverBlind`). */
        changes.push({ what: 'expert-gate:no-register', cap: '' });
      } else {
        for (const v of expertGateSignatureViolations({
          prev, next,
          estimates: register,
          expertEval: ctx.siblings['expertEval.v1'] as ExpertEvalState | undefined,
          liveDocIds: ctx.liveAttachmentIds[EXPERT_DOC_COLLECTION],
          /* PR-3 — limb dokumen DITEGAKKAN. Tautan warisan (`ev-…`) ditolak tanpa
             grandfathering (keputusan Q1) dengan sebabnya sendiri: yang dituntut
             adalah mengunggah ulang, bukan menelusuri dokumen yang tak pernah ada. */
          requireDocument: true,
        })) {
          throw new TRPCError({ code: 'FORBIDDEN', message: `${v.code}:${v.estimateId}: ${v.message}` });
        }
        changes.push({ what: 'expert-gate:pass', cap: '' });
      }
    }
  } else if (key === 'opinionDoc.v1') {
    const p = asObj(prev), n = asObj(next);
    const ps = asObj(p.signoff), ns = asObj(n.signoff);
    for (const slot of Object.keys(OPINION_SLOT_CAP)) {
      if (sig(ps[slot]) === sig(ns[slot])) continue;
      /* Q4 — R1/R2 juga di sini. Tanda tangan opini KELUAR dari firma; membiarkannya
         dapat dipalsukan sementara kertas kerja ditutup adalah setengah pekerjaan.
         R3/R4 TIDAK ikut: rantai opini punya bentuk & urutannya sendiri. */
      need(OPINION_SLOT_CAP[slot], `opini:${slot}`);
      if (ns[slot]) attribution({ byUserId: ns[slot].byUserId, display: ns[slot].by, at: ns[slot].date }, `opini ${slot}`);
    }
    if (!!p.finalized !== !!n.finalized) {
      need(CAP.OPINION_APPROVE, 'opini:finalized');
      /* Gerbang EQR (ISQM 2 / SPM 2) — hanya saat MENJADI final; membatalkan
         finalisasi tak pernah diblokir gerbang ini (sama seperti pencabutan
         tanda tangan pada gerbang pakar). */
      if (!p.finalized && !!n.finalized) {
        if (!ctx || !ctx.firmSiblings || !ctx.scopeId) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'eqr-gate:context-missing' });
        }
        const reviews = asArray(ctx.firmSiblings['eqrReviews.v2']) as EqrReviewRow[];
        const pie = engagementIsPie(ctx.firmSiblings, ctx.scopeId);
        const gate = eqrGateFor(ctx.scopeId, reviews, pie === true);
        if (gate.applicable && !gate.cleared) {
          throw new TRPCError({ code: 'FORBIDDEN', message: `eqr-gate:${gate.reason}: penerbitan opini menuntut penelaahan mutu perikatan (EQR) yang lolos gerbang — ISQM 2 / SA 220.36.` });
        }
        /* Registri firma belum pernah ditulis → status PIE tak dapat ditentukan di
           server. Gerbang UI tetap berlaku, tetapi jalur tRPC langsung LOLOS di sini.
           Ditandai eksplisit di jejak audit agar celah ini berjejak, bukan senyap —
           pola yang sama dengan `expert-gate:no-register`. */
        changes.push({ what: pie === null ? 'eqr-gate:pie-unknown' : 'eqr-gate:pass', cap: '' });
      }
    }
  } else if (key.startsWith('firmAttest.')) {
    /* Atestasi mutu firma (ISQM 1 ¶53–54). Tiga tuntutan pada setiap tanda
       tangan yang BERUBAH — otoritas lapis, atribusi, dan ikatan pada isi:

       · OTORITAS per LAPIS. `capForWrite` hanya menggerbangi DOKUMEN
         (SIGNOFF_REVIEWER, agar Pimpinan SOQM yang seorang Manager dapat
         menulis). Tanpa aturan ini, Manager yang sama dapat mengisi lapis
         Managing Partner (¶20(a)) lewat tRPC — pemisahan ¶20 runtuh.
       · ATRIBUSI. Tanda tangan harus menyebut aktor.
       · IKATAN ISI. `contentHash` harus sidik jari isi yang SEDANG ditulis;
         tanpa ini seseorang dapat menandatangani satu kesimpulan lalu
         mengirim kesimpulan lain dalam tulisan yang sama. */
    const roles = attestRolesFor(key);
    const p = asObj(prev), n = asObj(next);
    const pc = asObj(p.chain), nc = asObj(n.chain);
    const nextHash = attestContentHash({ period: n.period, conclusion: n.conclusion });
    for (const role of roles) {
      const before = sig(pc[role.id]), after = sig(nc[role.id]);
      if (before === after) continue;
      const cap = attestRoleCap(key, role.id);
      if (cap) need(cap, `attest:${role.id}`);
      const sg = asObj(nc[role.id]);
      if (!nc[role.id]) continue;                       // pencabutan: otoritas sudah dituntut
      if (sg.byUserId !== actor.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: `signature-identity-mismatch:attest:${role.id}: tanda tangan tidak menyebut pembubuhnya.` });
      }
      if (!sg.contentHash) {
        throw new TRPCError({ code: 'FORBIDDEN', message: `signature-missing-content-hash:attest:${role.id}: tanda tangan tidak terikat pada kesimpulan.` });
      }
      if (sg.contentHash !== nextHash) {
        throw new TRPCError({ code: 'FORBIDDEN', message: `signature-content-mismatch:attest:${role.id}: tanda tangan mengikat kesimpulan yang berbeda dari yang ditulis.` });
      }
    }
  } else if (key === 'pc.ethics') {
    /* Deklarasi Kode Etik adalah pernyataan PRIBADI (dasar gerbang penerbitan
       opini). Dua tuntutan: ia harus deklarasi AKTOR SENDIRI, dan ia harus
       menyebut aktor sebagai pembubuhnya. Tanpa ini seorang pemegang HR_MANAGE
       dapat menandatangani deklarasi seorang Partner — lalu gerbang opini
       Partner itu terbuka atas dasar pernyataan yang tak pernah ia buat. */
    const emps = ethicsSignedTransitions(prev, next);
    if (emps.length) {
      if (!ctx || ctx.actorEmpId === undefined) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'signoff:context-missing' });
      }
      if (!ctx.actorEmpId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'ethics-decl:no-emp-mapping: sesi tidak terpetakan ke personel firma — deklarasi Kode Etik tak dapat ditandatangani.' });
      }
      for (const emp of emps) {
        if (emp !== ctx.actorEmpId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: `ethics-decl:not-own:${emp}: deklarasi Kode Etik hanya dapat ditandatangani oleh yang bersangkutan.` });
        }
        const sigd = asObj(asObj(next)[emp]);
        if (sigd.byUserId !== actor.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: `signature-identity-mismatch:ethics:${emp}: tanda tangan tidak menyebut pembubuhnya.` });
        }
        changes.push({ what: `ethics-decl:${emp}`, cap: '' });
      }
    }
  } else if (key === 'memberIndep.v1') {
    /* Deklarasi independensi anggota tim. Kuncinya adalah NAMA anggota, yang
       tak dapat diikat ke sesi secara andal (pencocokan nama lossy — pelajaran
       `amsShortName`). Yang DAPAT ditegakkan, dan yang sesungguhnya penting,
       adalah ATRIBUSI: sebuah deklarasi yang mulai memuaskan gerbang harus
       menyebut aktor yang membubuhkannya. Dengan itu "Partner mencatatkan atas
       nama anggota" menjadi fakta yang terlihat di data, bukan pemalsuan yang
       tak dapat dibedakan dari pernyataan pribadi. */
    for (const m of memberIndepSatisfyTransitions(prev, next)) {
      const d = asObj(asObj(next)[m]);
      if (!d.byUserId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: `signature-missing-identity:indep:${m}: deklarasi independensi tanpa penanda tangan.` });
      }
      if (d.byUserId !== actor.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: `signature-identity-mismatch:indep:${m}: tanda tangan menyebut orang lain, bukan pembubuhnya.` });
      }
      changes.push({ what: `indep-decl:${m}`, cap: '' });
    }
  } else if (key === 'mat.memo.signoff') {
    /* PR-6a — dokumen ini SENDIRI adalah objek slot ({preparer, manager, partner}),
       bukan peta ber-id seperti wpState. Menandatangani DAN mencabut sama-sama
       otoritatif (`doSign` di UI adalah toggle), jadi cukup bandingkan tanda-tangan
       kanoniknya tanpa peduli arah perubahan. */
    const p = asObj(prev), n = asObj(next);
    for (const slot of Object.keys(MAT_MEMO_SLOT_CAP)) {
      if (sigNamed(p[slot]) === sigNamed(n[slot])) continue;
      /* Q4 — memo materialitas ikut ke PDF TERSEGEL Ed25519 sebagai persetujuan
         Rekan Perikatan. Bentuknya `{name, role, at}`: `name` adalah nama PENUH. */
      need(MAT_MEMO_SLOT_CAP[slot], `matMemo:${slot}`);
      if (n[slot]) attribution({ byUserId: n[slot].byUserId, display: n[slot].name, at: n[slot].at }, `memo materialitas ${slot}`);
    }
  } else if (key === 'aje') {
    /* PR-1 — JURNAL YANG SUDAH DIPOSTING TIDAK DAPAT DITULIS ULANG.
       ------------------------------------------------------------
       Ini ATURAN, bukan otoritas: ia tidak memanggil `need()`, karena tak ada
       kapabilitas yang boleh memuaskannya — Rekan Pemimpin sekalipun. Alasannya
       bukan hierarki melainkan fakta: angka jurnal Posted sudah mengalir ke WTB,
       SAD, materialitas, dan opini, jadi "pernah ada" tak boleh dapat dihapus.
       Koreksi ditempuh lewat PEMBALIKAN (jurnal balik baru yang menempuh rantai
       persetujuan yang sama), yang lolos guard ini karena jurnal asal utuh.

       Menarik posting (Posted → Proposed) TIDAK tertangkap aturan ini — itu
       gerbang AJE_POST di bawah, dan setelahnya jurnal memang boleh disunting;
       persetujuan lamanya gugur lewat pengikatan hash pada rantai (PR-2). */
    for (const v of ajeImmutabilityViolations(prev, next)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `posted-immutable:${v.id}`,
      });
    }
    /* PR-B — memposting jurnal ke WTB adalah aksi otoritatif: ia mengubah angka yang
       dipakai seluruh modul hilir. Menariknya kembali sama otoritatifnya (jurnal yang
       sudah diposting mungkin sudah dirujuk SAD/opini). Keduanya menuntut AJE_POST.
       Menyusun/mengubah isi jurnal yang masih Proposed TIDAK dijaga di sini — itu
       tetap capForWrite=AJE_EDIT. */
    const p = ajeStatusMap(prev), n = ajeStatusMap(next);
    for (const id of new Set([...Object.keys(p), ...Object.keys(n)])) {
      const was = p[id] ?? '', now = n[id] ?? '';
      if (was === now) continue;
      if (now === 'Posted') need(CAP.AJE_POST, `aje:${id}.post`);
      else if (was === 'Posted') need(CAP.AJE_POST, `aje:${id}.unpost`);
    }
  } else if (key === 'approvals_ov_v4') {
    /* Setiap KEPUTUSAN baru pada rantai menuntut kapabilitas peran-langkah yang
       bersangkutan. Tanpa ini, gerbang UI per-langkah dapat dilewati dengan menulis
       overlay langsung — persis celah dua-lapis yang ditutup #23 untuk kertas kerja. */
    const p = asObj(prev), n = asObj(next);
    for (const itemId of Object.keys(n)) {
      const pd = Array.isArray(asObj(p[itemId]).decisions) ? (asObj(p[itemId]).decisions as unknown[]) : [];
      const nd = Array.isArray(asObj(n[itemId]).decisions) ? (asObj(n[itemId]).decisions as unknown[]) : [];
      if (nd.length <= pd.length) continue;
      for (const d of nd.slice(pd.length)) {
        /* PR-3 — WAKTU KEPUTUSAN HARUS NYATA.
           Klien lama mencap setiap keputusan dengan konstanta '10 Mar 09:00'.
           Server kini menolak stempel yang tak terbaca, hilang, atau menyimpang
           lebih dari jendela kesegaran dari jamnya sendiri — back-dating dan
           forward-dating tak mungkin melampaui skew wajar. Batas jujurnya: ini
           bukan tanda tangan waktu kriptografis; baris `appendAudit` (jam server,
           hash-chained) tetap menjadi rekaman pendamping. */
        const tsErr = decisionTimestampError(asObj(d).ts, now);
        if (tsErr) throw new TRPCError({ code: 'FORBIDDEN', message: `decision-${tsErr}` });
        const role = String(asObj(d).stepRole ?? '');
        const cap = AJE_STEP_CAP[role];
        /* Langkah tanpa peran terpetakan ditolak — fail-closed. Keputusan yang tak
           menyebutkan langkahnya tak dapat diotorisasi, jadi tak boleh diterima. */
        if (!cap) throw new TRPCError({ code: 'FORBIDDEN', message: `requires:aje.post` });
        need(cap, `approval:${itemId}.${role}`);
      }
    }
  } else if (key === 'reviewNotes') {
    const idx = (v: unknown): Record<string, any> => {
      const m: Record<string, any> = {};
      if (Array.isArray(v)) for (const x of v) if (x && x.id != null) m[String(x.id)] = x;
      return m;
    };
    const p = idx(prev), n = idx(next);
    for (const id of Object.keys(n)) {
      if (p[id] && p[id].status !== n[id].status) {
        need(CAP.SIGNOFF_REVIEWER, `note:${id}:${p[id].status}->${n[id].status}`);
      }
    }
  } else if (key === 'strategyApproved.v1') {
    // Persetujuan strategi audit (SA 300) = reviewer sign-off Partner/Manajer (SIGNOFF_REVIEWER).
    // Set ATAU pencabutan persetujuan = perubahan otoritatif → tegakkan di server (sebelumnya
    // hanya gate UI; capForWrite default = WP_EDIT, terlalu longgar untuk slot ini).
    if (sig(prev) !== sig(next)) need(CAP.SIGNOFF_REVIEWER, 'strategi:approved');
  } else if (key === 'prospects') {
    // Q5 — keputusan AKSEPTASI & PENERBITAN surat perikatan = Partner-only (FIRM_ADMIN).
    // Intake/data-entry (tambah prospek, PMPJ, faktor, draft surat) = ENGAGEMENT_MANAGE,
    // sudah di-gate capForWrite → JANGAN over-gate di sini.
    const idx = (v: unknown): Record<string, any> => {
      const m: Record<string, any> = {};
      if (Array.isArray(v)) for (const x of v) if (x && x.id != null) m[String(x.id)] = x;
      return m;
    };
    const p = idx(prev), n = idx(next);
    for (const id of Object.keys(n)) {
      const a = p[id] || {}, b = n[id];
      const aApproved = !!(a.acceptance && a.acceptance.approved);
      const bApproved = !!(b.acceptance && b.acceptance.approved);
      if (aApproved !== bApproved) need(CAP.FIRM_ADMIN, `acceptance:${id}:${aApproved}->${bApproved}`);
      const aL = (a.letter && a.letter.status) || '';
      const bL = (b.letter && b.letter.status) || '';
      if (aL !== bL && LETTER_ISSUED.has(bL)) need(CAP.FIRM_ADMIN, `letter:${id}->${bL}`);
    }
  }
  return changes;
}
