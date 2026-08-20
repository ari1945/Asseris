/* ============================================================
   Asseris — SSOT identitas artefak ekspor (PR-1 · prd-export-seal-identity-ssot)
   ------------------------------------------------------------
   MASALAH YANG DILAYANI MODUL INI.

   `amsExportPdf` / `amsExportXlsx` menandatangani artefak: hash kanonik →
   `exporter.seal` (Ed25519) → Seal ID + QR ditanam → baris `SEAL` masuk rantai
   audit. Itu janji provenans: berkas ini berasal dari sistem ini, atas perikatan
   ini, dari firma ini.

   Janji itu tidak dipenuhi karena identitasnya adalah ARGUMEN call-site. 123
   call-site mengisi `firm`/`scopeId` sendiri dengan sembilan bentuk ekspresi
   berbeda untuk satu fakta yang sama, dan tiga di antaranya rusak:

     · `|| 'ENG-2025-014'`  → segel + baris audit mendarat di berkas klien LAIN,
                              dan server meloloskannya karena perikatan itu sah.
     · `|| 'default'`       → truthy, jadi `assertEngagementAccess` tetap jalan
                              dan GAGAL ⇒ artefak diam-diam TIDAK TERSEGEL.
     · `window.activeEngagement?.id` → TAK ADA penulisnya sejak window-strip ⇒
                              selalu `undefined` ⇒ segel tanpa perikatan.

   Selama identitas boleh didorong pemanggil, tombol ekspor ke-124 bebas
   mengarangnya lagi dan tak ada gerbang yang bisa membedakan "diisi benar" dari
   "diisi asal" tanpa memeriksa 123 ekspresi. Karena itu identitas DITARIK dari
   SSOT di sini, bukan didorong dari sana.

   MENGAPA REGISTER (dan kritik atas pilihan ini).

   `export_pdf.ts`/`export_xlsx.ts` adalah modul NON-REACT — ia tak bisa memanggil
   `useFirm()`. Maka perikatan aktif harus dapat dibaca tanpa React, dan itu
   berarti sebuah nilai bermasa-hidup-modul: sebuah global, di repo yang justru
   sedang melucuti global (window-strip).

   Perdagangannya sadar. Yang ditukar: 12 pembaca `window.activeEngagement` yang
   mati, sembilan bentuk ekspresi scopeId, dan 100 literal identitas. Yang
   diterima: SATU nilai, bertipe, dengan SATU penulis (`FirmProvider`), yang
   TIDAK dapat dibaca telanjang — satu-satunya pintu bacanya adalah fungsi yang
   sanggup MENOLAK. Register ini mengganti global yang sudah rusak diam-diam;
   ia tidak menumpuk global baru di atasnya.

   ATURAN YANG DITEGAKKAN GERBANG (`export_identity.test.ts`):
   `publishActiveEngagement` hanya boleh dipanggil `contexts.tsx`. Penulis kedua
   = dua sumber kebenaran = cacat yang sama dalam bentuk baru.
   ============================================================ */
import { AMS } from './data';
import { FIRM_SCOPE_ID } from './persist_scope';

/** Lingkup artefak. Hanya call-site yang tahu ini — sebuah memo perikatan vs
 *  register firma bukan fakta yang bisa diturunkan dari state mana pun. */
export type ExportScope = 'engagement' | 'firm';

export interface ResolvedExportIdentity {
  ok: true;
  /** Nama firma dari SSOT `AMS.FIRM` — tak pernah literal. */
  firm: string;
  scope: ExportScope;
  scopeId: string;
  reason?: undefined;
}
export interface RefusedExportIdentity {
  ok: false;
  reason: string;
  firm?: undefined;
  scope?: undefined;
  scopeId?: undefined;
}
/* Kedua cabang menyebut kedua kelompok field (yang tak berlaku = `?: undefined`)
   supaya penyempitan tetap bekerja di gerbang `typecheck:test`, yang sengaja
   berjalan dengan `strictNullChecks:false` — di sana diskriminan boolean TIDAK
   menyempit dan `id.reason` dilaporkan TS2339 walau kodenya benar. */
export type ExportIdentity = ResolvedExportIdentity | RefusedExportIdentity;

/** Tak ada perikatan aktif: artefak berlingkup perikatan TIDAK diterbitkan. */
export const NO_ENGAGEMENT_EXPORT_MSG =
  'Tidak ada perikatan aktif — artefak tidak diterbitkan. Pilih perikatan lebih dulu agar segel & jejak auditnya melekat pada berkas audit yang benar.';

/** Profil firma belum termuat: artefak tersegel tidak boleh mengarang penerbit. */
export const NO_FIRM_IDENTITY_MSG =
  'Identitas firma tidak tersedia dari profil firma — artefak tidak diterbitkan. Berkas tersegel tidak boleh mengarang nama penerbitnya.';

/* ------------------------------------------------------------------
   Register — satu nilai, satu penulis.
   ------------------------------------------------------------------ */
let activeEngagementId: string | null = null;

/**
 * Terbitkan perikatan aktif. **Satu-satunya pemanggil sah: `contexts.tsx`
 * (`FirmProvider`).** Ditegakkan gerbang sumber di `export_identity.test.ts`.
 *
 * Yang diterbitkan adalah id perikatan yang BENAR-BENAR TERSELESAIKAN
 * (`activeEngagement?.id`), bukan id yang sedang dipilih (`activeEngagementId`):
 * bila pilihan menunjuk perikatan yang tak ada di daftar, jawabannya "tidak ada
 * perikatan aktif", bukan sebuah id hantu.
 */
export function publishActiveEngagement(id: string | null | undefined): void {
  activeEngagementId = normalizeId(id);
}

/** Perikatan aktif menurut register, atau `''`. Baca-saja. */
export function activeEngagementScopeId(): string {
  return activeEngagementId || '';
}

function normalizeId(id: string | null | undefined): string | null {
  const s = typeof id === 'string' ? id.trim() : '';
  return s === '' ? null : s;
}

/** Nama firma dari SSOT — TANPA fallback literal (presedens C-2 #265). */
function firmNameFromSsot(): string {
  const f = (AMS as unknown as { FIRM?: { name?: string } }).FIRM;
  return (f && typeof f.name === 'string' ? f.name : '').trim();
}

/* ------------------------------------------------------------------
   Penyelesaian identitas.
   ------------------------------------------------------------------ */

/**
 * Bentuk MURNI — seluruh masukan eksplisit, tanpa menyentuh SSOT atau register.
 *
 * Dipisah supaya perilakunya dapat diuji tanpa memalsukan modul global, dan
 * supaya kedua jalur penolakan (firma kosong, perikatan kosong) dapat dibuktikan
 * secara langsung alih-alih lewat kebetulan keadaan.
 */
export function buildExportIdentity(
  scope: ExportScope,
  firmName: string,
  engagementId: string | null | undefined,
): ExportIdentity {
  const firm = (firmName || '').trim();
  if (!firm) return { ok: false, reason: NO_FIRM_IDENTITY_MSG };

  if (scope === 'firm') return { ok: true, firm, scope, scopeId: FIRM_SCOPE_ID };

  const engId = normalizeId(engagementId);
  if (!engId) return { ok: false, reason: NO_ENGAGEMENT_EXPORT_MSG };
  return { ok: true, firm, scope, scopeId: engId };
}

/**
 * Identitas untuk artefak yang akan diterbitkan — SSOT firma + register perikatan.
 *
 * `{ ok:false }` berarti artefaknya TIDAK BOLEH terbit. Menolak adalah jawaban
 * yang benar; memilihkan perikatan, mengarang `'default'`, atau menyegel tanpa
 * scope adalah tiga cara berbeda untuk berbohong pelan.
 */
export function resolveExportIdentity(scope: ExportScope): ExportIdentity {
  return buildExportIdentity(scope, firmNameFromSsot(), activeEngagementId);
}
