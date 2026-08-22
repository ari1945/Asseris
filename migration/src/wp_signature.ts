/* ============================================================
   Asseris — pembentukan & pemblokiran tanda tangan kertas kerja (SA 230)
   ------------------------------------------------------------
   Modul MURNI: bentuk sebuah tanda tangan, dan alasan mengapa sebuah slot tidak
   boleh ditandatangani. Ia sengaja dipisah dari `wp_signoff.tsx` supaya dapat
   diuji terhadap VALIDATOR SERVER YANG SESUNGGUHNYA (`signatureAttributionViolations`
   di `wp_chain.ts`, dipakai `server/src/signoff.ts`) — bukan terhadap salinan
   aturan yang ditulis ulang di uji.

   LATAR. Panel sign-off bersama (`WpPanel`, dipakai hampir setiap modul) menulis
   `{ by: me, at: wpToday() }`. Tak satu pun tulisan itu pernah tersimpan:

     POST /trpc/state.set → 403
     signature-missing-identity:wp:jet.preparer:
       Tanda tangan Preparer tanpa identitas penanda tangan.

   dan penolakannya tak terlihat, karena `flush()` memperlakukan 403 seperti
   offline. Auditor menekan tombol, melihat namanya muncul di rantai sign-off,
   dan tidak ada apa pun yang tersimpan. Diverifikasi hidup 2026-08-22 pada modul
   `jet`: sesudah klik, `state.get('wpState')` tetap tak memuat ref itu.

   TIGA hal yang dituntut server:
     · SIAPA   — `byUserId`, id sesi. Nama tampilan lossy dan tak boleh memutuskan.
     · KAPAN   — ISO dari JAM NYATA. Bukan `AMS.TODAY`: nilai ini diperiksa
                 terhadap jam SERVER dalam jendela `WP_SIGNATURE_SKEW_MS` (10
                 menit), jadi ia milik klok nyata, bukan klok perikatan.
     · ATAS APA — `contentHash` isi kertas kerja saat ditandatangani.
   ============================================================ */
import { WP_SLOT_LABEL, wpChainSelfReviewBy, signedByActor } from './wp_chain';
import type { WpActor, WpChain, WpSignature } from './wp_chain';

/** Tanda tangan lengkap, atau `null` bila identitas sesi tak diketahui —
    lebih baik TIDAK menandatangani daripada menandatangani tanpa penanda tangan. */
export function buildWpSignature(
  actor: WpActor | null | undefined,
  at: string,
  contentHash: string,
): WpSignature | null {
  if (!actor || !actor.id || !actor.name) return null;
  if (!at) return null;
  return { by: actor.name, byUserId: actor.id, at, contentHash };
}

export interface WpSlotGateInput {
  chain: WpChain;
  slot: string;
  actor: WpActor | null | undefined;
  locked?: boolean;
  /** Urutan slot yang berlaku untuk kertas kerja ini (default: preparer → reviewer). */
  order?: readonly string[];
}

const DEFAULT_ORDER: readonly string[] = ['preparer', 'reviewer'];

/**
 * Alasan sebuah slot TIDAK dapat ditandatangani — string kosong berarti boleh.
 *
 * Ini CERMIN aturan server, bukan penggantinya: server tetap otoritatif. Yang
 * dicegah di sini adalah tombol yang tampak hidup lalu gagal senyap.
 */
export function wpSignBlock(input: WpSlotGateInput): string {
  const { chain, slot, actor } = input;
  const order = input.order || DEFAULT_ORDER;
  if (input.locked) return 'Berkas perikatan terkunci.';
  if (!actor || !actor.id || !actor.name) {
    return 'Identitas sesi belum diketahui — tanda tangan tidak dapat dibubuhkan.';
  }
  const i = order.indexOf(slot);
  if (i > 0) {
    const prev = order[i - 1];
    if (!chain[prev]) {
      return `Slot ${WP_SLOT_LABEL[slot] || slot} tidak dapat ditandatangani sebelum ${WP_SLOT_LABEL[prev] || prev}.`;
    }
  }
  return wpChainSelfReviewBy(chain, slot, actor).reason;
}

/**
 * Alasan sebuah tanda tangan TIDAK dapat ditarik — string kosong berarti boleh.
 * Hanya slot preparer yang diatur di sini (R6); slot lain murni kapabilitas.
 */
export function wpUnsignBlock(input: WpSlotGateInput): string {
  const { chain, slot, actor } = input;
  const order = input.order || DEFAULT_ORDER;
  if (input.locked) return 'Berkas perikatan terkunci.';
  if (!actor || !actor.id || !actor.name) return 'Identitas sesi belum diketahui.';
  if (slot !== 'preparer') return '';
  const sig = chain[slot];
  if (!sig) return '';
  if (!signedByActor(sig, actor)) {
    return 'Hanya penandatangannya sendiri yang dapat menarik tanda tangan Preparer.';
  }
  const downstream = order.slice(order.indexOf(slot) + 1).some(k => !!chain[k]);
  if (downstream) return 'Rantai sudah berlanjut — buka slot berikutnya lebih dulu.';
  return '';
}
