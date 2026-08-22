/* ============================================================
   Asseris — KEPUTUSAN AUDITOR ATAS TEMUAN DIAGNOSTIK (murni)
   prompt 72-diagnostic D1.
   ------------------------------------------------------------
   Sampai 2026-08-22 panel diagnostik mencatat keputusannya begini:

     const USER = (AMS && AMS.USER) || { name: <nama kolega>, role: 'Audit Manager' };
     const when = new Date().toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
     setDecisions(d => ({ ...d, [f.id]: { verdict, who: USER.name, role: USER.role, when, … } }));

   Tiga cacat menumpuk pada satu catatan, dan ketiganya menyentuh hal yang sama:
   apakah catatan itu bukti atau hiasan.

     · `AMS.USER` adalah data SEED — sama untuk siapa pun yang login. Menutup
       sebuah temuan risiko kecurangan karena itu tercatat atas nama orang yang
       tak pernah membuat keputusan itu.
     · fallback-nya menyebut nama seorang kolega yang NYATA (ia ada di
       `AMS.TEAM`). Fallback anonim buruk; fallback yang menuduh orang tertentu
       jauh lebih buruk.
     · `when` hanya jam dan menit, dari jam mesin. Keputusan bertanda "14:23"
       tidak dapat ditempatkan pada hari mana pun — dan SA 230 ¶8-11 menuntut
       KAPAN pertimbangan itu diambil.

   ATURANNYA, sama seperti `bank_recon_actor` (prompt 32-cashbank CB4): tanpa
   identitas sesi, keputusan TIDAK DICATAT. Bukan dicatat atas nama siapa pun.
   `useCurrentAuditor()` tidak dipakai di sini — hook itu sendiri berbunyi
   `auth.user.name || AMS.USER.name`, jadi ia hanya memindahkan fallback seed
   satu lapis ke dalam.

   MURNI: tanpa React, `AMS`, `window`. Satu-satunya ketergantungan adalah klok
   SSOT — dan itu pun hanya lewat `diagDecisionStamp()`, supaya inti bangunan
   catatannya dapat diuji dengan stempel apa pun.
   ============================================================ */
import { amsDateTimeShortId } from './clock_ssot';

export type DiagVerdict = 'follow' | 'dismiss';

export interface DiagDecision {
  verdict: DiagVerdict;
  /** Nama pengguna SESI — tak pernah kosong bila objek ini ada. */
  who: string;
  /** Peran sesi; boleh kosong. Yang wajib adalah orangnya, bukan jabatannya. */
  role: string;
  /** Stempel BERTANGGAL dari klok SSOT. */
  when: string;
  reason: string;
}

export interface DiagDecisionInput {
  sessionName: unknown;
  sessionRole?: unknown;
  /** Stempel dari `diagDecisionStamp()`; wajib membawa tanggal. */
  when: unknown;
  verdict: unknown;
  reason?: unknown;
}

/** Stempel keputusan: TANGGAL dari klok SSOT (`AMS.TODAY`), jam dari jam nyata. */
export function diagDecisionStamp(): string {
  return amsDateTimeShortId();
}

/* Bentuk stempel yang diterima: `'09 Mar 2026, 14.22'` (amsDateTimeShortId) dan
   `'2026-03-09 14:22'` (amsStamp). Keduanya membawa TAHUN dan BULAN; `'14:23'`
   — bentuk lama — tidak, dan karena itu ditolak. */
const BERTANGGAL = /^(?:\d{4}-\d{2}-\d{2}\b|\d{1,2} [A-Za-z]{3} \d{4}\b)/;

/** Apakah sebuah stempel dapat ditempatkan pada suatu hari? */
export function diagStampBertanggal(when: unknown): boolean {
  return BERTANGGAL.test(String(when ?? '').trim());
}

/**
 * Catatan keputusan auditor, atau `null` bila ia tidak boleh dicatat.
 *
 * `null` berarti: JANGAN simpan, dan JANGAN tulis jejak. Pemanggil tidak boleh
 * menggantinya dengan fallback apa pun — itu justru cacat yang dicabut di sini.
 * Ada empat sebab, semuanya membuat catatan berhenti menjadi bukti:
 *   · tanpa identitas sesi  → pelakunya akan dikarang;
 *   · tanpa stempel bertanggal → waktunya tak dapat ditempatkan;
 *   · verdict di luar dua nilai yang dikenal;
 *   · "abaikan" tanpa alasan → pertimbangan profesional tanpa pertimbangan.
 */
export function diagDecisionRecord(input: DiagDecisionInput): DiagDecision | null {
  const who = typeof input.sessionName === 'string' ? input.sessionName.trim() : '';
  if (!who) return null;

  const when = String(input.when ?? '').trim();
  if (!diagStampBertanggal(when)) return null;

  const verdict = input.verdict === 'follow' || input.verdict === 'dismiss' ? input.verdict : null;
  if (!verdict) return null;

  const reason = typeof input.reason === 'string' ? input.reason.trim() : '';
  if (verdict === 'dismiss' && !reason) return null;

  const role = typeof input.sessionRole === 'string' ? input.sessionRole.trim() : '';
  return { verdict, who, role, when, reason };
}

/* ---- keputusan yang SUDAH tersimpan sebelum perbaikan ini ---------------
   `diagnostics.v1` sudah berisi keputusan lama: pelakunya dari seed dan
   stempelnya jam-menit tanpa tanggal. Menghapusnya akan membuang catatan kerja
   auditor; menampilkannya seolah setara dengan keputusan bernama akan menyegel
   atribusi yang salah — persis yang dicegah D5. Jadi ia DIPERTAHANKAN dan
   DILABELI, di layar maupun di kertas kerja. */
export type DiagAttribution = 'session' | 'legacy';

export const DIAG_ATTRIBUTION_LABEL: Record<DiagAttribution, string> = {
  session: 'Terverifikasi sesi',
  legacy: 'Lama — tak terverifikasi (stempel tanpa tanggal)',
};

/** 'legacy' bila stempelnya tak bertanggal, yaitu keputusan dari bentuk lama. */
export function diagDecisionAttribution(d: { when?: unknown } | null | undefined): DiagAttribution {
  return d && diagStampBertanggal(d.when) ? 'session' : 'legacy';
}

export interface DiagDecisionTrail {
  who: string;
  what: string;
  mod: 'diagnostic';
  icon: 'check' | 'flag';
  /* `logActivity` menerima `Partial<LogEntry>` yang ber-index-signature; tanpa
     ini TypeScript menolak objek ber-bentuk tetap sebagai argumennya. */
  [k: string]: unknown;
}

/**
 * Baris jejak audit untuk satu keputusan, atau `null` bila tak ada keputusan.
 *
 * Ia menerima CATATAN yang sudah dibangun — bukan identitas mentah — supaya
 * mustahil jejaknya menamai orang yang berbeda dari catatan yang tersimpan.
 */
export function diagDecisionTrail(
  finding: { title?: unknown } | null | undefined,
  rec: DiagDecision | null | undefined,
): DiagDecisionTrail | null {
  if (!rec) return null;
  const judul = String((finding && finding.title) || '').trim() || '(temuan tanpa judul)';
  const aksi = rec.verdict === 'follow' ? 'menindaklanjuti' : 'menutup (abaikan)';
  return {
    who: rec.who,
    what: `${aksi} temuan diagnostik — ${judul}${rec.reason ? ' · ' + rec.reason : ''} · ${rec.when}`,
    mod: 'diagnostic',
    icon: rec.verdict === 'follow' ? 'check' : 'flag',
  };
}
