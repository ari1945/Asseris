/* ============================================================
   Asseris — alamat rute sebagai hash URL (PRD Fase B · PR-3)
   ------------------------------------------------------------
   Sebelum ini app TIDAK punya URL sama sekali: rute hidup di
   `localStorage['ams.route']` dan `pushState`/`location.hash` nol
   kemunculan di seluruh src. Akibatnya reviewer & preparer tak dapat
   menunjuk objek yang sama, tak ada Back/Forward, tak ada bookmark,
   dan dua tab peramban saling menimpa satu slot rute.

   Yang TIDAK dilakukan di sini: memasang router. Model lokasi app sudah
   ada dan bertingkat — `navigate(id, {from, tab, sel})` +
   `useInitialTab`/`useInitialSelection` (contexts.tsx). Berkas ini hanya
   MENYERIALKAN model itu ke address bar dan membacanya kembali.

   Bentuk:  #/<route>[/<sel>][?tab=<tab>]
   Contoh:  #/workpapers/R?tab=procs
            #/wtb
            #/continuance/CL-014

   Hash, bukan History API: app disajikan sebagai SPA statis di belakang
   Caddy (docs/DEPLOY.md), dan hash tak butuh aturan rewrite server sama
   sekali → nol perubahan infrastruktur, nol risiko 404 saat refresh.
   Naik ke History API kelak tak perlu mengubah fungsi di berkas ini.

   MURNI dan bebas-DOM dengan sengaja: seluruh berkas ini diuji di
   environment `node` biasa (route_hash.test.ts), karena inilah bagian
   yang paling mahal bila salah (R1 PRD — satu-satunya jalur navigasi app).
   ============================================================ */

export type RouteLocation = {
  route: string;
  sel: string | null;
  tab: string | null;
};

/* Id modul di MODULE_INDEX: huruf/angka, boleh `-` dan `_` di tengah.
   Validasi bentuk saja — apakah rutenya DIKENAL adalah urusan pemanggil
   (app.tsx menanyakannya ke MODULE_INDEX), supaya berkas ini tetap murni. */
const ROUTE_RE = /^[a-z0-9][a-z0-9_-]*$/i;

function dec(s: string): string | null {
  try { return decodeURIComponent(s); } catch { return null; }  // '%' telanjang
}

/**
 * Baca hash menjadi lokasi. Mengembalikan `null` bila hash kosong atau tak
 * berbentuk — pemanggil lalu jatuh ke `ams.route` (sesi terakhir), bukan
 * layar putih.
 */
export function parseHash(raw: string | null | undefined): RouteLocation | null {
  if (!raw) return null;
  let s = String(raw);
  if (s.charAt(0) === '#') s = s.slice(1);
  if (s.charAt(0) === '/') s = s.slice(1);
  if (s === '') return null;

  const qi = s.indexOf('?');
  const path = qi >= 0 ? s.slice(0, qi) : s;
  const query = qi >= 0 ? s.slice(qi + 1) : '';

  const parts = path.split('/').filter(p => p !== '');
  if (parts.length === 0) return null;

  const route = dec(parts[0]);
  if (route == null || !ROUTE_RE.test(route)) return null;

  /* Segmen ketiga dan seterusnya sengaja diabaikan, bukan ditolak: tautan
     lama/lebih panjang tetap mendarat di tempat yang benar alih-alih gagal. */
  const sel = parts.length > 1 ? dec(parts[1]) : null;

  let tab: string | null = null;
  if (query) {
    for (const pair of query.split('&')) {
      const eq = pair.indexOf('=');
      const k = eq >= 0 ? pair.slice(0, eq) : pair;
      if (k !== 'tab') continue;
      tab = eq >= 0 ? dec(pair.slice(eq + 1)) : '';
      break;
    }
  }

  return { route, sel: sel === '' ? null : sel, tab: tab === '' ? null : tab };
}

/* ---- Alias rute: id lama → id yang bertahan ----
   Modul yang DIGABUNG meninggalkan id yatim di alam liar: bookmark pengguna,
   `ams.route` sesi terakhir, dan `sourceRoute` pada item antrean persetujuan
   yang sudah terlanjur dibuat. Membiarkannya "tak dikenal" berarti tautan itu
   diam-diam mendarat di halaman lain — jadi id lama dipetakan, bukan dibuang.

   Peta ini sengaja MURNI (tak menyentuh MODULE_INDEX) supaya berkas ini tetap
   dapat diuji di environment node. Nilai peta WAJIB id yang benar-benar
   terdaftar di MODULE_INDEX — dipaku oleh uji di `related_modules.test.ts`.

   2026-08-15 — `wipreal` (WIP · Realisasi) dilebur ke `wip`
   (WIP · Valuasi & Realisasi); lihat docs/prd-wip-merge-valuasi-realisasi.md. */
export const ROUTE_ALIAS: Record<string, string> = { wipreal: 'wip' };

/** Terjemahkan id rute lama ke penggantinya. Id yang bukan alias dikembalikan apa adanya. */
export function resolveRoute(id: string): string {
  return Object.prototype.hasOwnProperty.call(ROUTE_ALIAS, id) ? ROUTE_ALIAS[id] : id;
}

/** Rakit hash dari lokasi. Kebalikan `parseHash` (round-trip diuji). */
export function buildHash(loc: { route: string; sel?: string | null; tab?: string | null }): string {
  const route = encodeURIComponent(loc.route);
  const sel = loc.sel == null || loc.sel === '' ? '' : '/' + encodeURIComponent(String(loc.sel));
  const tab = loc.tab == null || loc.tab === '' ? '' : '?tab=' + encodeURIComponent(String(loc.tab));
  return '#/' + route + sel + tab;
}

/** Apakah dua lokasi menunjuk hal yang sama? Dipakai penjaga anti-gelung. */
export function sameLocation(a: RouteLocation | null, b: RouteLocation | null): boolean {
  if (a == null || b == null) return a === b;
  return a.route === b.route && a.sel === b.sel && a.tab === b.tab;
}

/**
 * Lokasi awal saat boot, dengan urutan presedens eksplisit:
 *   1. hash (tautan yang dibagikan / reload / Back-Forward)  ← paling otoritatif
 *   2. `ams.route` (sesi terakhir di peramban ini)
 *   3. 'home'
 * `isKnownRoute` disuntik supaya berkas ini tak perlu tahu MODULE_INDEX;
 * rute tak dikenal DIBUANG (mendarat di sesi terakhir/home) — tak pernah
 * layar putih.
 */
export function initialLocation(
  hash: string | null | undefined,
  lastRoute: string | null | undefined,
  isKnownRoute: (id: string) => boolean,
): { loc: RouteLocation; source: 'hash' | 'storage' | 'default' } {
  const fromHash = parseHash(hash);
  if (fromHash) {
    /* Alias diterjemahkan SEBELUM uji kenal: bookmark `#/wipreal` harus mendarat
       di modul penggantinya, bukan diperlakukan sebagai tautan busuk. */
    const route = resolveRoute(fromHash.route);
    if (isKnownRoute(route)) return { loc: { ...fromHash, route }, source: 'hash' };
  }
  if (lastRoute) {
    const route = resolveRoute(lastRoute);
    if (isKnownRoute(route)) return { loc: { route, sel: null, tab: null }, source: 'storage' };
  }
  return { loc: { route: 'home', sel: null, tab: null }, source: 'default' };
}

/* ---------------------------------------------------------------
   PR-6 (PRD prd-sales-pipeline-deepening · SC-15) — SEED SATU-TEMBAK.

   Sumbu `tab`/`sel` pada alamat sudah DITULIS sejak V-9, tetapi tak pernah
   DIBACA saat masuk dari luar: `useInitialTab`/`useInitialSelection` hanya
   membaca kunci sessionStorage yang diisi `navigate()`. Akibatnya tautan yang
   dibagikan (`#/pipeline/OPP-103`) mendarat di modul yang benar dengan rekaman
   TIDAK terbuka — alamatnya setengah bekerja, dan itu tak pernah terlihat dari
   dalam aplikasi karena navigasi internal selalu lewat `navigate()`.

   Fungsi ini MURNI: ia hanya menghitung pasangan kunci/nilai yang harus ditulis;
   app.tsx yang menyentuh sessionStorage. Dengan begitu perilakunya dapat diuji
   tanpa mem-boot aplikasi.
   --------------------------------------------------------------- */
export function oneShotSeeds(loc: RouteLocation | null | undefined): { key: string; value: string }[] {
  if (!loc || !loc.route) return [];
  const id = resolveRoute(loc.route);
  const out: { key: string; value: string }[] = [];
  if (loc.tab != null && loc.tab !== '') out.push({ key: 'ams.navtab.' + id, value: String(loc.tab) });
  if (loc.sel != null && loc.sel !== '') out.push({ key: 'ams.navsel.' + id, value: String(loc.sel) });
  return out;
}
