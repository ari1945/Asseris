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
  if (fromHash && isKnownRoute(fromHash.route)) return { loc: fromHash, source: 'hash' };
  if (lastRoute && isKnownRoute(lastRoute)) {
    return { loc: { route: lastRoute, sel: null, tab: null }, source: 'storage' };
  }
  return { loc: { route: 'home', sel: null, tab: null }, source: 'default' };
}
