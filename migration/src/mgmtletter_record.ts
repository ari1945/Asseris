/* ============================================================
   Surat Manajemen (SA 265/260) — perekam catatan diskusi & keputusan.

   Cacat yang dipaku di sini (view_final3.tsx sebelum perubahan, TIGA situs
   tulis-HIDUP — bukan data seed):

       244  onAdd({ … who: role === 'auditor' ? 'Linda Wijaya' : 'Wakil Klien', … })
       521  decisionBy: stage === 'diskusi' ? '' : 'Linda Wijaya (Manager)'
       526  { d: today(), who: 'Linda Wijaya', role: 'auditor', … }

   Siapa pun yang menekan "Catat" atau memutuskan sebuah temuan masuk/keluar
   Final ML, jejaknya berbunyi nama yang sama — nama seorang kolega yang nyata
   di roster firma, yang mungkin tak pernah membuka modul ini. Keputusan atas
   temuan surat manajemen adalah pernyataan yang dipertanggungjawabkan
   seseorang kepada TCWG (SA 260 ¶16); jejak yang salah orang di sana lebih
   buruk daripada tidak ada jejak, karena ia terbaca seolah-olah terbukti.

   Aturan pelaku SAMA dengan `glActor` (firm_gl_actor.ts) dan `iaActor`
   (internalaudit_memo.ts), dan diturunkan dari `glActor` itu sendiri agar tak
   lahir aturan kedua: identitas datang HANYA dari sesi, dan bila sesi tak
   menyediakannya, aksi tulisnya TIDAK DIJALANKAN — bukan dicatat atas nama
   fallback. `useCurrentAuditor()` (contexts.tsx:280) BUKAN alatnya: ia sengaja
   jatuh kembali ke `AMS.USER` (data seed) karena tugasnya memfilter kepemilikan
   tampilan, di mana tebakan yang meleset tak merusak apa pun.

   Perbedaan dengan `glActor`: catatan ML merekam nama DAN peran (kolom "org"
   pada utas diskusi, sufiks "(Manager)" pada `decisionBy`). Peran itu pun
   berasal dari sesi (`auth.user.role` = `me.role`, label peran RBAC), bukan
   literal 'Manager Audit' yang dulu diketik di view.

   LINGKUP: modul ini TIDAK menyentuh `ML_FINDINGS_SEED`/`ML_DISCUSSIONS_SEED`.
   Sepuluh kemunculan nama yang sama di sana adalah DATA ILUSTRATIF — kelas
   masalah lain, dengan konsekuensi lain (lihat docs/usulan-*.md bila dibuka).
   ============================================================ */
import { glActor, type SessionUser } from './firm_gl_actor';

/** Bentuk minimal `auth.user` yang dibutuhkan atribusi tulis ML. */
export interface MlSessionUser extends SessionUser {
  /** Label peran RBAC dari sesi (mis. 'Audit Manager'). */
  role?: string;
}

/** Pelaku ML: nama + peran, keduanya dari sesi. */
export interface MlActor {
  name: string;
  /** '' bila sesi tak menyertakan peran — label lalu jatuh ke nama saja, bukan tebakan. */
  role: string;
}

/** Peran BICARA pada satu catatan diskusi (auditor vs wakil klien). */
export type MlSpeaker = 'auditor' | 'client';

/** Satu catatan pada utas diskusi temuan. */
export interface MlNote {
  d: string;
  who: string;
  role: MlSpeaker;
  org: string;
  note: string;
}

/** Bidang keputusan yang menempel pada temuan. */
export interface MlDecisionFields {
  decisionDate: string;
  decisionBy: string;
  decisionNote: string;
}

/** Tahap keputusan yang MEREKAM pelaku (di luar 'diskusi', yang justru mencabutnya). */
export type MlDecidedStage = 'final' | 'tuntas';

/**
 * Pelaku dari SESI, atau null bila sesi tak menyediakannya.
 * Nama tunduk `glActor` (satu aturan, bukan dua); peran ikut hanya bila ada.
 */
export function mlActor(user: MlSessionUser | null | undefined): MlActor | null {
  const name = glActor(user);
  if (!name) return null;
  const role = user && typeof user.role === 'string' ? user.role.trim() : '';
  return { name, role };
}

/** Label pelaku untuk `decisionBy`: "Nama (Peran)", atau "Nama" bila peran tak ada. */
export function mlActorLabel(actor: MlActor): string {
  return actor.role ? actor.name + ' (' + actor.role + ')' : actor.name;
}

/** Alasan kontrol tulis ML tak dapat dipakai, atau '' bila dapat. */
export function mlWriteBlockReason(actor: MlActor | null): string {
  if (!actor) return 'Identitas sesi tidak tersedia — pencatatan dinonaktifkan agar jejak diskusi & keputusan tidak mencatat nama yang salah';
  return '';
}

/** Boleh menulis catatan/keputusan ML? Butuh pelaku sesi yang nyata untuk jejaknya. */
export function mlWriteAllowed(actor: MlActor | null): boolean {
  return !!actor;
}

/**
 * Catatan diskusi baru.
 *
 * `speaker === 'client'` tetap berbunyi 'Wakil Klien': itu LABEL PERAN, bukan
 * nama orang yang dikarang — aplikasi memang tak memegang identitas wakil klien.
 * Yang dicabut di sini adalah nama AUDITOR yang dulu dikarang.
 */
export function mlDiscussionNote(a: {
  actor: MlActor;
  speaker: MlSpeaker;
  note: string;
  today: string;
}): MlNote {
  const aud = a.speaker === 'auditor';
  return {
    d: a.today,
    who: aud ? a.actor.name : 'Wakil Klien',
    role: a.speaker,
    org: aud ? (a.actor.role || 'Auditor') : 'Klien',
    note: a.note,
  };
}

/** Bidang keputusan pada temuan. Tahap 'diskusi' MENCABUT keputusan (dan pelakunya). */
export function mlDecisionFields(a: {
  actor: MlActor;
  stage: string;
  note: string;
  today: string;
}): MlDecisionFields {
  if (a.stage === 'diskusi') return { decisionDate: '', decisionBy: '', decisionNote: '' };
  return { decisionDate: a.today, decisionBy: mlActorLabel(a.actor), decisionNote: a.note };
}

/** Stempel keputusan yang masuk utas diskusi temuan. */
export function mlDecisionStamp(a: {
  actor: MlActor;
  stage: MlDecidedStage;
  note: string;
  today: string;
}): MlNote {
  const what = a.stage === 'final' ? 'Masuk Final ML' : 'Tuntas — dikeluarkan dari surat akhir';
  return mlDiscussionNote({
    actor: a.actor,
    speaker: 'auditor',
    note: 'KEPUTUSAN: ' + what + '. ' + a.note,
    today: a.today,
  });
}
