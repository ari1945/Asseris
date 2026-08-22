/* ============================================================
   Asseris — PELAKU JEJAK PENCOCOKAN REKONSILIASI (murni)
   prompt 32-cashbank CB4.
   ------------------------------------------------------------
   Sampai 2026-08-22 modul Kas & Bank menulis jejaknya begini:

     const who = (AMS.USER && AMS.USER.name) || 'Pengguna';
     logActivity({ who, action: 'RECON_TOGGLE', … })

   `AMS.USER` adalah data SEED: ia sama untuk siapa pun yang login. Mencocokkan
   item rekonsiliasi menggeser residual akun kontrol kas — dan lewat itu membuka
   atau mengunci ekspor Laporan Keuangan. Jejak yang menamai orang yang tidak
   melakukannya lebih buruk daripada tidak ada jejak: ia terlihat seperti bukti.

   ⚠ `useCurrentAuditor()` TIDAK cukup untuk cacat ini. Hook itu sendiri berbunyi
   `auth.user.name || AMS.USER.name` (contexts.tsx), jadi memakainya hanya
   memindahkan fallback seed satu lapis ke dalam. Identitas sesi harus dibaca
   langsung, dan ketiadaannya harus berarti TIDAK DICATAT — bukan dicatat atas
   nama siapa pun.

   MURNI: tanpa React, `AMS`, `window`.
   ============================================================ */

export interface ReconTrailLine {
  id: string;
  desc?: string;
  matched?: boolean;
}

export interface ReconTrail {
  /** Nama pengguna sesi — tak pernah kosong bila objek ini ada. */
  who: string;
  action: 'RECON_TOGGLE';
  detail: string;
}

/**
 * Entri jejak untuk satu pencocokan, atau `null` bila identitas sesi tak ada.
 *
 * `null` berarti: JANGAN catat. Pemanggil tidak boleh menggantinya dengan
 * fallback apa pun — itu justru cacat yang dicabut di sini.
 */
export function reconMatchTrail(
  sessionName: unknown,
  line: ReconTrailLine | null | undefined,
  nextMatched: boolean,
): ReconTrail | null {
  const who = typeof sessionName === 'string' ? sessionName.trim() : '';
  if (!who) return null;
  if (!line || !line.id) return null;
  const desc = String(line.desc || '').slice(0, 40);
  return {
    who,
    action: 'RECON_TOGGLE',
    detail: `${line.id}${desc ? ' · ' + desc : ''} → ${nextMatched ? 'cocok' : 'belum cocok'}`,
  };
}
