---
name: asseris-deeplink-tab-nav
description: "Asseris navigate({tab}) + useInitialTab deep-link tab mechanism (PRD 2026-07-18) — how to open a module at a specific tab"
metadata: 
  node_type: memory
  type: project
  originSessionId: 96857647-19b7-448f-ae3b-bde967cc1389
---

Kontrak navigasi Asseris kini bisa **deep-link ke tab spesifik** (PRD 2026-07-18, ✅ MERGED master via PR #91, merge commit `98d1ae4`; gerbang hijau CI 6/6 + live-verified). PR #91 juga membawa 2 fix lain: crash `view_risk` saat `risks` kosong (empty-state) + kontras label sidebar grup fase non-berjalan (opacity .55 → warna `--on-navy-dim` ~4.85:1 WCAG AA, `styles_chrome.css`).

**Mekanisme (satu titik, reusable untuk SEMUA deep-link — Copilot/Matriks/dock, bukan cuma timeline):**
- `navigate(id, { from, tab })` di `migration/src/app.tsx` menulis one-shot `sessionStorage['ams.navtab.<id>']` SEBELUM `setRoute(id)`. `tab` opsional → tanpa `tab` = perilaku lama (nol regresi).
- Hook `useInitialTab(moduleId, fallback)` di `migration/src/contexts.tsx` (di-ekspor ESM + window): drop-in pengganti `useState(fallback)`, mengembalikan tuple `[nilai, setter]`. Saat mount: baca kunci → bila ada, **hapus (consume-once)** & pakai sebagai nilai awal (override default/last-used); else `fallback` (boleh nilai atau fungsi lazy). Tanda tangan **`moduleId: string, fallback: unknown`** — JANGAN `:any` (memicu ratchet no-explicit-any → un-suppress seluruh contexts.tsx = ~107 error lint).

**Adopsi di modul bertab:** ganti inisialisasi state tab jadi `useInitialTab('<id>', fallback)`. Bila modul punya tab-berlapis (mis. `confirm`: top-tab `overview/register/recon` + filter `fType`), seed state terdalam dulu lalu turunkan yang lain di initializer yang sama (useState initializer jalan berurutan) — mis. `confirm`: `fType=useInitialTab('confirm','All')` lalu `tab = fType!=='All' ? 'register' : 'overview'`.

**Petakan target di `migration/src/view_audittimeline.tsx`** `ATL_TASKS[].tab` (diteruskan lewat `onOpen(task)` → `nav(task.mod,{from,tab:task.tab})`). Live-verified: C-100→confirm/**Bank**, C-600→confirm/**Utang**, C-400→psak16/**register** (top-tab `tab`, BUKAN sub-tab `regTab`), C-300→psak14/**nrv** (penilaian=NRV), A-200→risk/**register**. A-410→clientportal sudah default ke tab PBC `reqs` (tak perlu tab). Modul single-tab / tanpa tab natural sengaja dibiarkan tanpa `tab`.

Lihat juga [[asseris-authoritative-persist-key-recipe]]. Evaluasi asal: tiap task timeline SUDAH mengarah ke modul benar (rute nyata, nol StubView); yang kurang cuma tab — inilah yang ditutup.

**Ekstensi: deep-link SELEKSI baris/entitas (sesi 2026-07-18, uncommitted di master).** Sibling dari mekanisme tab, untuk modul register/daftar yang perlu membuka **baris tertentu** (bukan tab). `navigate(id, { sel })` menulis one-shot `sessionStorage['ams.navsel.<id>']`; hook `useInitialSelection(moduleId): string|null` di `contexts.tsx` (ekspor ESM+window) mengonsumsi-sekali & mengembalikan id terpilih atau null. GOTCHA sama seperti useInitialTab: JANGAN `useState<T>(...)` (React shim tak bertipe → TS2347 "Untyped function calls may not accept type arguments") — pakai `const [v]=useState(()=>…); return v as string|null`.
- **Kasus pakai pertama:** task timeline **`A-100` "Penerimaan & keberlanjutan perikatan"** dulu `mod:'onboarding'` (papan prospek generik — nyaris tak ada rekaman utk 6/7 engagement in-flight, hanya C-014 punya PROS). Diubah → **`mod:'continuance'` + `selClient:true`**; `onOpen` meneruskan `sel: client.id` (clientId engagement aktif). `view_continuance.tsx` menyeed `selId` dari `useInitialSelection('continuance')` (fallback baris[0] → nol regresi). Register Keberlanjutan (SA 220/ISQM 1 ¶33–34) di-key by clientId & mencakup SEMUA klien Active → tiap engagement timeline dapat baris spesifik (pemicu/rotasi/keputusan). Live-verified: ENG-014→auto-pilih Sentosa Makmur; ENG-047→auto-pilih Teknologi Andalan Digital (BUKAN baris[0] → bukti seed dinamis, bukan default); breadcrumb "Kembali ke Jadwal & Lini Masa Audit" jalan. Continuance butuh peran oversight (ENGAGEMENT_VIEW_ALL) → Junior/Senior lihat panel "Akses terbatas" (by design). Login verify: Anindya (Audit Manager) `anindya.p@whr-cpa.id` / `Manager#2025!` (seed `server/src/seed.ts`; vite proxy `/trpc`→:5181).
