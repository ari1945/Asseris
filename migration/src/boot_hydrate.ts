/* ============================================================
   Asseris — hidrasi saat masuk sesi (PRD prd-identitas-firma-sesi A1 + A3)
   ------------------------------------------------------------
   Dulu `Root.enter` (app.tsx) memanggil `hydrateCoreFromApi('ENG-2025-014')` untuk SEMUA
   firma, lalu MENELAN galatnya ("offline: data.js fallback"). Firma segar ditolak server
   (`cross-firm-engagement`), galatnya ditelan, dan aplikasi berjalan di atas seluruh seed
   demo: admin firma nyata melihat "Sentosa Makmur Tbk · ENG-2025-014".

   Kini, berurutan:
     1. lingkup firma = `user.firmId` dari SESI (PR-A). Tanpa firmId → galat, bukan firma demo;
     2. perikatan yang dihidrasi dipilih dari yang BOLEH diakses (`engagement.list`, server-
        filtered W7.5): perikatan aktif terakhir pengguna bila masih dapat diakses → perikatan
        pertama → TANPA perikatan (`bootstrap({})`, PR-A);
     3. galat apa pun DILEMPAR. Pemanggil menampilkan layar galat + "Coba lagi" (keputusan
        Q-2): sesudah login server terbukti terjangkau, jadi galat hidrasi adalah galat —
        menampilkan data demo di titik ini adalah P0-4 itu sendiri.

   Untuk firma demo hasilnya identik dengan perilaku lama: `engagement.list` terurut id dan
   ENG-2025-014 adalah id terkecil yang dapat diakses keempat akun demo.
   ============================================================ */
import { api, hydrateCoreFromApi } from './api';
import { persistCacheKey, setBootEngagementId, setSessionFirmId } from './persist_scope';

export interface SessionUser {
  id: string;
  firmId?: string | null;
}

export class BootHydrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BootHydrationError';
  }
}

/** Perikatan aktif terakhir pengguna menurut cache `useServerState('activeEng', …, 'user', uid)`. */
function lastActiveEngagement(userId: string): string | null {
  try {
    const raw = localStorage.getItem(persistCacheKey('user', userId, 'activeEng'));
    if (raw == null) return null;
    const v: unknown = JSON.parse(raw);
    return typeof v === 'string' && v ? v : null;
  } catch (e) {
    return null;
  }
}

/** Pilih perikatan boot dari yang dapat diakses. Murni — diuji langsung. */
export function pickBootEngagement(accessibleIds: string[], lastActive: string | null): string | null {
  if (lastActive && accessibleIds.includes(lastActive)) return lastActive;
  return accessibleIds.length ? accessibleIds[0] : null;
}

/**
 * Hidrasi inti `AMS` untuk sesi ini. Mengembalikan id perikatan yang dihidrasi (atau `null`
 * bila firma tak punya perikatan yang dapat diakses). MELEMPAR bila apa pun gagal.
 */
export async function hydrateForSession(user: SessionUser): Promise<string | null> {
  const firmId = user && typeof user.firmId === 'string' ? user.firmId.trim() : '';
  if (!firmId) throw new BootHydrationError('Sesi tidak memuat identitas firma (firmId).');
  setSessionFirmId(firmId);

  const rows: unknown = await api.engagement.list.query();
  const ids = Array.isArray(rows)
    ? rows.map((r) => String((r as { id?: unknown }).id ?? '')).filter((s) => s !== '')
    : [];
  const engagementId = pickBootEngagement(ids, lastActiveEngagement(user.id));

  const applied = await hydrateCoreFromApi(engagementId ?? undefined, user.id);
  if (!applied) throw new BootHydrationError('Server tidak mengirim data firma.');
  setBootEngagementId(engagementId);
  return engagementId;
}
