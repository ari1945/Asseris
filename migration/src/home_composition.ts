/* ============================================================
   Asseris — Beranda: aturan komposisi per-peran & urutan portlet.
   ------------------------------------------------------------
   Modul MURNI (tanpa React/DOM) supaya percabangan Beranda bisa DIUJI. Sebelum
   ini, tiga keputusan hidup sebagai literal di dalam komponen dan tak satu pun
   punya jaring: (1) peta persona firm-ops → daftar module id, (2) definisi
   "siapa itu firm-ops", (3) filter isolasi perikatan W7.5. Menghapus satu modul
   dari `MODULES` atau menambah peran baru di `rbac.ts` merusak Beranda TANPA
   SUARA — kartu mati / panel salah untuk peran yang salah.

   SSOT: daftar peran & kapabilitas tetap di `rbac.ts`; module id tetap di
   `icons.tsx`. Di sini HANYA aturan komposisinya, dan `home_composition.test.ts`
   memaku ketiganya terhadap kedua sumber itu.
   ============================================================ */

export interface FirmOpsArea { title: string; ids: string[] }

/* Persona firm-ops → area kerja yang mereka kuasai (module id, PRD §8). Dipakai untuk
   kartu tautan-cepat "Area Kerja Saya" menggantikan panel "Perikatan Saya" auditor.
   Keanggotaan peta ini SEKALIGUS jadi definisi "firm-ops" (lihat isFirmOpsRole) —
   satu daftar, bukan dua yang bisa menyimpang. */
export const HM_FIRMOPS_AREAS: Record<string, FirmOpsArea> = {
  'Admin & HR Firma': { title: 'SDM & Kepatuhan', ids: ['hcm', 'payroll', 'leave', 'performance', 'cpe', 'ethics', 'independence', 'hrcase'] },
  'Finance Firma': { title: 'Keuangan Firma (ERP)', ids: ['firmgl', 'apar', 'revenue', 'treasury', 'cashbank', 'firmtax', 'profitability', 'wip'] },
};

/** Peran firm-ops = peran yang punya area kerja terdaftar. Mereka BUKAN anggota
 *  perikatan mana pun, jadi Beranda-nya mengganti "Perikatan Saya" dengan
 *  "Area Kerja Saya". Turunan dari satu peta di atas — bukan perbandingan literal
 *  kedua yang bisa lupa diperbarui saat persona ketiga ditambahkan. */
export function isFirmOpsRole(role: string | undefined | null): boolean {
  return !!role && Object.prototype.hasOwnProperty.call(HM_FIRMOPS_AREAS, role);
}

/** Area kerja untuk sebuah peran, atau undefined bila bukan firm-ops. Lewat
 *  isFirmOpsRole (bukan indeks polos) supaya keduanya TAK BISA berbeda pendapat —
 *  indeks polos mengembalikan anggota prototipe untuk peran bernama 'constructor'
 *  atau 'toString', dan `area.ids.map` di Beranda akan melempar. */
export function firmOpsAreaFor(role: string | undefined | null): FirmOpsArea | undefined {
  return isFirmOpsRole(role) ? HM_FIRMOPS_AREAS[role as string] : undefined;
}

/** Filter isolasi perikatan (W7.5). `accessibleIds` null/undefined = offline atau
 *  belum diketahui → JANGAN membatasi (server tetap otoritatif); `[]` = tak ada
 *  satu pun yang boleh diakses → hasil kosong. Membalik salah satu dari dua kasus
 *  itu berarti kebocoran isolasi atau Beranda kosong palsu. */
export function accessibleEngagements<T extends { id: string }>(
  engagements: readonly T[] | undefined | null,
  accessibleIds: readonly string[] | undefined | null,
): T[] {
  const list = engagements || [];
  if (!accessibleIds) return list.slice();
  return list.filter((e) => accessibleIds.includes(e.id));
}

/* ============================================================
   Urutan portlet kokpit — dua operasi yang sama, dua alat masuk.
   `dropInOrder` melayani tetikus (drag & drop), `moveInOrder` melayani papan
   ketik (panah). Keduanya murni & diuji, supaya jalur keyboard tak bisa
   diam-diam menyimpang dari jalur tetikus.
   ============================================================ */

/** Drag & drop: pindahkan `dragId` ke posisi `overId`, melewatinya (semantik
 *  drag yang sudah berlaku — indeks sisip dihitung SEBELUM pencabutan). */
export function dropInOrder(order: readonly string[], dragId: string, overId: string): string[] {
  if (!dragId || dragId === overId) return order.slice();
  const o = order.slice();
  const at = o.indexOf(overId);
  const from = o.indexOf(dragId);
  if (at < 0 || from < 0) return o;
  o.splice(at, 0, o.splice(from, 1)[0]);
  return o;
}

/** Papan ketik: tukar `id` dengan tetangga TERLIHAT-nya sejauh `delta` langkah.
 *  `visible` (bila diberi) adalah daftar id yang benar-benar dirender — portlet
 *  yang disembunyikan (mis. "Antrian Persetujuan" saat kosong) tak boleh menyerap
 *  satu tekanan panah dan membuat kokpit tampak tidak merespons. Di ujung daftar,
 *  urutan dikembalikan apa adanya. */
export function moveInOrder(
  order: readonly string[],
  id: string,
  delta: number,
  visible?: readonly string[] | null,
): string[] {
  const o = order.slice();
  const vis = visible && visible.length ? order.filter((x) => visible.includes(x)) : o;
  const vi = vis.indexOf(id);
  if (vi < 0 || !delta) return o;
  const target = vis[vi + delta];
  if (target === undefined) return o;
  const a = o.indexOf(id);
  const b = o.indexOf(target);
  if (a < 0 || b < 0) return o;
  o[a] = target;
  o[b] = id;
  return o;
}

/** Posisi 1-berbasis sebuah portlet di antara yang TERLIHAT (untuk nama aksesibel
 *  gagang: "posisi 2 dari 5"). 0 bila tak terlihat. */
export function visiblePosition(visible: readonly string[], id: string): number {
  return visible.indexOf(id) + 1;
}
