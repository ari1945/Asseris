/* ============================================================
   Tahap 8 — prefs ringan yang DIEKSPOR ke konsumen EAGER.
   ------------------------------------------------------------
   `amsApplyPrefs` + `SETTINGS_ACCENTS` sebelumnya hanya hidup di
   view_settings.tsx dan dipublikasikan via window. Pada Tahap 8
   (performa frontend), view_settings menjadi lazy chunk, sementara
   app.tsx menerapkan preferensi saat boot — jadi helper ini dipindah
   ke modul kecil eager agar app tidak bergantung pada chunk view.
   view_settings mengimpor dari sini dan tetap mengekspor ulang
   (API window.amsApplyPrefs dipertahankan untuk kompatibilitas).
   ============================================================ */

/* ---- accent presets (override solid blue shades on :root) ---- */
export const SETTINGS_ACCENTS: Record<string, { label: string; swatch: string; vars: Record<string, string> | null }> = {
  biru:   { label: 'Biru KAP', swatch: '#005085', vars: null },
  teal:   { label: 'Teal', swatch: '#0a6b73', vars: { '--blue': '#0a6b73', '--blue-600': '#085960', '--blue-400': '#2f8a90' } },
  indigo: { label: 'Indigo', swatch: '#3a4fa3', vars: { '--blue': '#3a4fa3', '--blue-600': '#31448f', '--blue-400': '#5f72c4' } },
  plum:   { label: 'Plum', swatch: '#84426a', vars: { '--blue': '#84426a', '--blue-600': '#73385b', '--blue-400': '#a4658a' } },
};

export function amsApplyPrefs(s: any) {
  s = s || {};
  const root = document.documentElement;
  ['--blue', '--blue-600', '--blue-400'].forEach(v => root.style.removeProperty(v));
  const acc = (SETTINGS_ACCENTS as any)[s.accent];
  if (acc && acc.vars) Object.entries(acc.vars).forEach(([k, v]: [string, any]) => root.style.setProperty(k, v));
  document.body.classList.toggle('reduce-motion', !!s.reduceMotion);
}
