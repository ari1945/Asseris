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

/* Key engagement yang membawa aksi otoritatif intra-dokumen. */
export const SIGNOFF_KEYS = new Set(['wpState', 'opinionDoc.v1', 'reviewNotes']);

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
  }
  return changes;
}
