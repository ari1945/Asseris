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

/* ============================================================
   Opsi C (keputusan Ari, 2026-08-24) — baris ILUSTRATIF ditandai, bukan dibuang.

   Seed modul ini memuat 7 temuan dan 24 catatan diskusi yang menyebut orang-orang
   NYATA di roster firma — 'Linda Wijaya (Manager)', 'Rudi Gunawan (Partner)',
   'Citra Halim' — beserta enam KEPUTUSAN atas nama mereka. Baris itu adalah alat
   peraga, tetapi begitu pengguna menyunting satu temuan, SELURUH dokumen tertulis
   ke StateDoc perikatan sebagai kertas kerja, dan tak ada apa pun pada barisnya yang
   membedakannya dari jejak nyata.

   Karena itu: baris seed membawa penanda `illustrative`, penanda itu TERLIHAT di
   layar, baris bertanda DIKECUALIKAN dari surat & ekspor, dan penandanya HILANG
   begitu baris itu benar-benar disunting atau diputuskan oleh manusia.

   Penanda dipasang di SATU tempat (pembungkus di bawah), bukan disulam ke 31 objek:
   baris seed baru ikut tertandai tanpa perlu diingat, dan isi seed itu sendiri tidak
   disentuh sama sekali.
   ============================================================ */

/** Baris yang berasal dari seed peraga dan belum disentuh manusia. */
export interface MlIllustrative { illustrative?: boolean }

/** Tandai seluruh baris sebagai ilustratif (dipakai pada deklarasi seed). */
export function mlMarkIllustrative<T extends object>(rows: readonly T[]): (T & { illustrative: true })[] {
  return rows.map((r) => ({ ...r, illustrative: true as const }));
}

/** Idem untuk peta utas diskusi (`{ [findingId]: note[] }`). */
export function mlMarkIllustrativeThreads<T extends object>(
  threads: Record<string, readonly T[]>,
): Record<string, (T & { illustrative: true })[]> {
  const out: Record<string, (T & { illustrative: true })[]> = {};
  for (const k of Object.keys(threads)) out[k] = mlMarkIllustrative(threads[k]);
  return out;
}

/** Apakah baris ini masih peraga? */
export function mlIsIllustrative(row: MlIllustrative | null | undefined): boolean {
  return !!(row && row.illustrative);
}

/**
 * Cabut penanda peraga — dipanggil saat baris BENAR-BENAR disunting atau diputuskan.
 * Penanda dihapus, bukan disetel `false`, supaya bentuk baris nyata identik dengan
 * baris yang tak pernah punya penanda.
 */
export function mlClearIllustrative<T extends MlIllustrative>(row: T): T {
  if (!row || !row.illustrative) return row;
  const { illustrative: _drop, ...rest } = row;
  return rest as T;
}

/** Hasil penyaringan surat: yang masuk, dan berapa yang dibuang karena peraga. */
export interface MlLetterSplit<T> {
  kept: T[];
  /** Jumlah baris yang LOLOS tahap tetapi dibuang karena masih peraga. */
  droppedIllustrative: number;
}

/**
 * Temuan yang boleh masuk SURAT/EKSPOR: sesuai tahap, dan bukan peraga.
 *
 * `mode` mengikuti pratinjau modul — 'final' hanya temuan ber-tahap `final`,
 * 'draft' semua kecuali yang sudah dituntaskan.
 *
 * Mengembalikan KEDUANYA (isi + jumlah yang dibuang) dalam satu panggilan, supaya
 * pemanggil tak perlu mengulang logika tahap untuk menghitung selisihnya. Dua rantai
 * filter yang mengerjakan hal sama adalah cara mereka berpisah diam-diam.
 */
export function mlLetterSplit<T extends MlIllustrative & { stage?: string }>(
  findings: readonly T[],
  mode: string,
): MlLetterSplit<T> {
  const byStage = mode === 'final'
    ? findings.filter((f) => f.stage === 'final')
    : findings.filter((f) => f.stage !== 'tuntas');
  const kept = byStage.filter((f) => !mlIsIllustrative(f));
  return { kept, droppedIllustrative: byStage.length - kept.length };
}

/** Pintasan bila jumlah yang dibuang tak dibutuhkan. */
export function mlLetterFindings<T extends MlIllustrative & { stage?: string }>(
  findings: readonly T[],
  mode: string,
): T[] {
  return mlLetterSplit(findings, mode).kept;
}

/** Alasan surat/ekspor kosong, atau '' bila ada isinya. */
export function mlLetterBlockReason(kept: number, dropped: number): string {
  if (kept > 0) return '';
  if (dropped > 0) return 'Seluruh temuan pada layar ini masih baris peraga — sunting atau putuskan lebih dulu agar surat memuat pernyataan yang benar-benar dibuat seseorang';
  return 'Belum ada temuan yang memenuhi syarat untuk surat ini';
}
