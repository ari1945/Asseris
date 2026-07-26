/* ============================================================
   Asseris — Lingkup persistensi & pembaca cache terpersist (SSOT)
   ------------------------------------------------------------
   Satu tempat untuk (a) konstanta scopeId dan (b) pembaca nilai terpersist
   bagi modul NON-REACT (canon) yang tak bisa memakai hook `useServerState`.

   LATAR (PR-1a): `useServerState` (contexts.tsx) meng-cache setiap nilai ke
   `localStorage['ams.v1.<scope>.<scopeId>.<key>']`, sementara `AMS_CANON`
   dulu membaca `localStorage['ams.v1.<key>']` — kunci TAK-BERLINGKUP yang
   sejak W6 hanya dibaca sebagai fallback pra-W6 dan TIDAK PERNAH ditulis oleh
   kode aplikasi. Akibatnya canon selalu memakai nilai default dan konfigurasi
   Materiality Workspace tak pernah sampai ke modul hilir. Modul ini menutup
   celah itu tanpa menyeret React ke dalam canon.

   Rantai BACA-LEWAT (baca, jangan tulis): perikatan → firma → legacy → default.
   Urutan ini juga berfungsi sebagai migrasi non-destruktif saat sebuah kunci
   berpindah lingkup: nilai lama tetap terbaca sampai pengguna menyimpan ulang.
   ============================================================ */

/* Demo satu-firma: scopeId firma & perikatan adalah konstanta yang cocok dengan
   seed. Di-SSOT-kan di sini karena kini dipakai contexts.tsx DAN canon. */
export const FIRM_SCOPE_ID = 'FIRM-WHR';
export const DEFAULT_ENG_ID = 'ENG-2025-014';

export type PersistScope = 'user' | 'firm' | 'engagement';

/** Kunci cache localStorage yang ditulis `useServerState`. */
export function persistCacheKey(scope: PersistScope, scopeId: string, key: string): string {
  return 'ams.v1.' + scope + '.' + scopeId + '.' + key;
}

/** Kunci tak-berlingkup pra-W6 (hanya dibaca, tak pernah ditulis lagi). */
export function legacyCacheKey(key: string): string {
  return 'ams.v1.' + key;
}

function rawRead(k: string): { hit: boolean; value: unknown } {
  try {
    if (typeof localStorage === 'undefined') return { hit: false, value: null };
    const s = localStorage.getItem(k);
    if (s == null) return { hit: false, value: null };
    return { hit: true, value: JSON.parse(s) };
  } catch (e) {
    /* nilai korup / storage diblokir → perlakukan sebagai tak-ada, coba tier berikut */
    return { hit: false, value: null };
  }
}

/**
 * Baca nilai terpersist dari cache `useServerState` untuk pemanggil non-React.
 *
 * Tier: perikatan (bila `engagementId` diberi) → firma → legacy → `fallback`.
 * Tier pertama yang HADIR menang — termasuk bila nilainya `null` (mis.
 * `mat.appliedOverride` yang sengaja dikosongkan berarti "tanpa override",
 * bukan "jatuh ke tier berikutnya").
 */
export function readPersisted<T,>(key: string, fallback: T, engagementId?: string | null): T {
  return readPersistedWithHit(key, fallback, engagementId).value;
}

/** Hasil baca + apakah nilainya benar-benar ADA di salah satu tier (bukan fallback). */
export interface PersistedRead<T> {
  value: T;
  /** true = ditemukan di cache; false = memakai `fallback` */
  hit: boolean;
}

/**
 * Sama seperti `readPersisted`, tetapi MELAPORKAN apakah nilainya ditemukan.
 *
 * PR-6b — dibutuhkan agar `materiality()` dapat mengembalikan `configSource`
 * (`cache` vs `default`). Tanpa ini, "konfigurasi auditor" dan "default 75%" tak
 * dapat dibedakan oleh pemanggil, sehingga jalur basi tak terdeteksi — persis cara
 * cacat #129 bertahan lama tanpa terlihat.
 */
export function readPersistedWithHit<T,>(key: string, fallback: T, engagementId?: string | null): PersistedRead<T> {
  const tiers: string[] = [];
  if (engagementId) tiers.push(persistCacheKey('engagement', engagementId, key));
  tiers.push(persistCacheKey('firm', FIRM_SCOPE_ID, key));
  tiers.push(legacyCacheKey(key));
  for (const k of tiers) {
    const r = rawRead(k);
    if (r.hit) return { value: r.value as T, hit: true };
  }
  return { value: fallback, hit: false };
}
