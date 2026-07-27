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

export type SignoffChange = { what: string; cap: string };

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
   → kapabilitas. `preparer` SENGAJA absen: itu WP_EDIT (semua auditor), sudah
   di-gate capForWrite. */
const WP_CHAIN_CAP: Record<string, string> = {
  reviewer: CAP.SIGNOFF_REVIEWER, // = slot Reviu Manajer opini (di-mirror ke wpState['900'])
  partner: CAP.OPINION_APPROVE,
  eqr: CAP.EQR_REVIEW,
};
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
  'aje', 'approvals_ov_v4']);

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

/**
 * Tegakkan otoritas per-slot atas sebuah tulisan StateDoc.
 * Mengembalikan daftar perubahan otoritatif terdeteksi (untuk detail jejak audit).
 * THROW `FORBIDDEN requires:<cap>` bila peran tak berwenang atas salah satu perubahan.
 */
export function guardSignoffWrite(role: string, key: string, prev: unknown, next: unknown): SignoffChange[] {
  const changes: SignoffChange[] = [];
  const need = (cap: string, what: string) => {
    changes.push({ what, cap });
    if (!can(role, cap)) throw new TRPCError({ code: 'FORBIDDEN', message: `requires:${cap}` });
  };

  if (key === 'wpState') {
    const p = asObj(prev), n = asObj(next);
    for (const ref of new Set([...Object.keys(p), ...Object.keys(n)])) {
      const pc = asObj(p[ref] && p[ref].chain), nc = asObj(n[ref] && n[ref].chain);
      for (const slot of Object.keys(WP_CHAIN_CAP)) {
        if (sig(pc[slot]) !== sig(nc[slot])) need(WP_CHAIN_CAP[slot], `wp:${ref}.${slot}`);
      }
    }
  } else if (key === 'opinionDoc.v1') {
    const p = asObj(prev), n = asObj(next);
    const ps = asObj(p.signoff), ns = asObj(n.signoff);
    for (const slot of Object.keys(OPINION_SLOT_CAP)) {
      if (sig(ps[slot]) !== sig(ns[slot])) need(OPINION_SLOT_CAP[slot], `opini:${slot}`);
    }
    if (!!p.finalized !== !!n.finalized) need(CAP.OPINION_APPROVE, 'opini:finalized');
  } else if (key === 'mat.memo.signoff') {
    /* PR-6a — dokumen ini SENDIRI adalah objek slot ({preparer, manager, partner}),
       bukan peta ber-id seperti wpState. Menandatangani DAN mencabut sama-sama
       otoritatif (`doSign` di UI adalah toggle), jadi cukup bandingkan tanda-tangan
       kanoniknya tanpa peduli arah perubahan. */
    const p = asObj(prev), n = asObj(next);
    for (const slot of Object.keys(MAT_MEMO_SLOT_CAP)) {
      if (sigNamed(p[slot]) !== sigNamed(n[slot])) need(MAT_MEMO_SLOT_CAP[slot], `matMemo:${slot}`);
    }
  } else if (key === 'aje') {
    /* PR-B — memposting jurnal ke WTB adalah aksi otoritatif: ia mengubah angka yang
       dipakai seluruh modul hilir. Menariknya kembali sama otoritatifnya (jurnal yang
       sudah diposting mungkin sudah dirujuk SAD/opini). Keduanya menuntut AJE_POST.
       Menyusun/mengubah isi jurnal TIDAK dijaga di sini — itu tetap capForWrite=AJE_EDIT. */
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
