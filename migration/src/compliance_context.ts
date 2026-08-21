/* ============================================================
   Asseris — Konteks perikatan untuk Checklist Kepatuhan (SA & PSAK)

   Panel "Konteks Engagement" di view_compliance dulu menuliskan klien,
   perikatan, dan penyusun sebagai konstanta tanpa syarat. Model murni ini
   menggantinya dengan turunan:

     · Klien      ← CLIENTS lewat `useFirm().activeClient`. Baris ENGAGEMENTS
                    TIDAK punya field `clientName`; pembaca `e.clientName`
                    jatuh diam-diam ke fallback-nya.
     · Perikatan  ← `useFirm().activeEngagement.id`.
     · Penyusun   ← rantai sign-off kertas kerja (`wpState[ref].chain.preparer`,
                    state per-perikatan / SSOT server) lewat pembaca kanonik
                    `wpSignersFor`. Belum ditandatangani ⇒ em-dash.

   Yang SENGAJA tidak dilakukan: mundur ke register `AMS.WORKPAPERS`. Register
   itu tak berkunci perikatan (seluruh barisnya milik ENG-2025-014), sehingga
   memakainya akan menuliskan nama orang yang salah pada catatan kepatuhan
   perikatan lain — hasil terburuk di layar ini.
   ============================================================ */
import { wpSignersFor } from './wp_signoff';

/** Nilai yang jujur ketika sumbernya belum ada. Bukan nama, bukan tebakan. */
export const KOSONG = '—';

export interface ComplianceCtxEngagement { id?: string }
export interface ComplianceCtxClient { name?: string }

/** Bentuk minimum dari `useAudit()` yang dibaca model ini. */
export interface ComplianceCtxAudit {
  wpState?: Record<string, { chain?: Record<string, { by?: string; at?: string } | null | undefined> } | undefined>;
}

export interface ComplianceCtxInput {
  /** id modul standar (sa250 / sa520 / psak71 …) — dipetakan ke ref WP kanonik */
  moduleId: string;
  /** jumlah prosedur checklist, sudah turunan di view */
  totalProcedures: number;
  engagement?: ComplianceCtxEngagement | null;
  client?: ComplianceCtxClient | null;
  audit?: ComplianceCtxAudit | null;
}

export interface ComplianceCtxRow { key: string; label: string; value: string }

const teks = (v: string | undefined | null): string => (typeof v === 'string' ? v.trim() : '');

/**
 * Penyusun kertas kerja modul ini menurut rantai sign-off perikatan aktif.
 * Memakai pembaca kanonik `wpSignersFor` (yang juga memetakan moduleId → ref
 * WP), jadi tak ada salinan privat pemetaan itu di sini.
 */
export function compliancePreparer(audit: ComplianceCtxAudit | null | undefined, moduleId: string): string {
  const signers = wpSignersFor(audit || {}, moduleId, {}) as { preparer?: { by?: string } | null };
  return teks(signers.preparer ? signers.preparer.by : '') || KOSONG;
}

/** Baris panel "Konteks Engagement" — urutan & label mengikat pada view. */
export function complianceContextRows(i: ComplianceCtxInput): ComplianceCtxRow[] {
  return [
    { key: 'client', label: 'Klien', value: teks(i.client ? i.client.name : '') || KOSONG },
    { key: 'engagement', label: 'Engagement', value: teks(i.engagement ? i.engagement.id : '') || KOSONG },
    { key: 'procedures', label: 'Total Prosedur', value: i.totalProcedures + ' item' },
    { key: 'preparer', label: 'Preparer', value: compliancePreparer(i.audit, i.moduleId) },
  ];
}
