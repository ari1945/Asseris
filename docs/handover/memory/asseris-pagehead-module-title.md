---
name: asseris-pagehead-module-title
description: SubBar dirombak jadi page-header dua-baris (judul modul besar) + KPI padding distandarkan; leverage lewat 1 komponen bersama
metadata: 
  node_type: memory
  type: project
  originSessionId: c185e456-8e19-4981-8309-5f0b5c923ea5
---

2026-07-19 — Perbaikan desain lintas-modul agar nama modul jelas + card/KPI tak mepet border (permintaan Ari). ✅ COMMIT `19f0da0` (115 file, +605/-549) di branch **`feat/ui-module-header-padding`** (dari master, terisolasi dari penerimaan). PUSHED + **PR #94 TERBUKA** ke master (https://github.com/ari1945/Asseris/pull/94) — belum merge. Isolasi bersih via stash→master→branch-baru→pop (irisan cuma 2 file kosmetik view_continuance/view_onboarding, baris padding identik di kedua base). Gate hijau basis master. STATUS: menunggu review/merge PR #94.

**Judul modul prominan — 1 titik leverage.** Ke-142 view merender `<SubBar moduleId=… />`. `SubBar` di `migration/src/shell.tsx` dirombak dari breadcrumb tipis 1-baris → **page-header dua-baris** (`.pagehead`):
- Baris 1 `.pagehead-main`: ikon-tile gradient blue→navy (38px) + eyebrow (grup, uppercase biru) + `<h1 class="pagehead-title">` (label modul, 19px/700) + `.pagehead-actions` (WpSubBarControl, EvidenceControl, prop `right`).
- Baris 2 `.pagehead-meta` (KONDISIONAL — hanya bila `hasMeta`): tombol kembali + chip ifrs/engagement/firma-wide + SA "Standar Terkait". Mencegah strip kosong.
- CSS di `styles_chrome.css` (blok `.pagehead*`, + override `body.dense`). Kelas lama `.subbar/.crumb/.subbar-spacer` disisakan (dead, kompat).

**Card/KPI breathing room:** literal KPI dominan `padding: '11px 14px'` (526 occ di 112 view) → `'15px 18px'` via sed. Plus `.portlet-body.pad` 11/12→14/16, `.panel-h` 9/12→12/16.

**Panel body flush → bermargin (fix lanjutan, keluhan "teks mepet frame lintas-modul"):** `Panel` (ui.tsx) dulu bungkus children di `<div>` TANPA padding → konten (mis. daftar Milestone) mepet frame. Fix: body jadi `<div className="panel-body">` + prop `flush` opt-out. CSS beri `.panel-body{padding:13px 16px}` TAPI anti-gandakan via `:has()`: `.panel-body:has(> [style*="padding"]){padding:0}` (hormati 439 KPI self-padded) + `.panel-body:has(> table/.dtbl/.tbl-wrap/.tabs/.msub){padding:0}` (tabel/tab full-bleed tetap flush). NOL edit view. Kenapa `:has` bukan padding polos: ~900+ Panel default-body, ratusan SUDAH pad child sendiri (varian 15/18, 12/14, 13/16…) → padding blanket = dobel. Live-verified: Milestone/Catatan → 13/16; KPI → 0 (defer ke child); tabel → flush.

**GOTCHA any-ratchet:** sempat pakai `(I as any)[m.icon]` di shell.tsx → tambah 1 `as any` → ratchet un-suppress SELURUH file (43 error). Fix: `I[m.icon as keyof typeof I] || I.panel` (nol token `any`; `m` sudah `any` dari `(MODULE_INDEX as any)`). `@types/react` TIDAK terpasang → `React.ComponentType` gagal typecheck. Gate hijau: typecheck + lint + build. Verifikasi live via computed-style (screenshot penuh timeout di SPA besar; pakai `zoom`/`javascript_tool`). Terkait [[neosuite-ams-w15-typescript-model]].
