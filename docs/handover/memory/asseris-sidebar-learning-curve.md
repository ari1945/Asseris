---
name: asseris-sidebar-learning-curve
description: "Evaluasi UI/UX sidebar + PRD learning-curve; SEMUA fase ✅ MERGED master: F1(#118) F2(#120) F3a(#121) F3b(#122) F3c(#123). Learning-curve remediation TUNTAS."
metadata: 
  node_type: memory
  type: project
  originSessionId: 216fac52-4c40-400b-8958-7647197a31ae
  modified: 2026-07-24T07:58:56.290Z
---

Sesi 2026-07-24. Evaluasi UI/UX sidebar Asseris utk perbaiki learning curve → PRD `docs/prd-sidebar-nav-learning-curve.md` (3 fase) → **Fase 1 diimplementasi & di-PR**.

**Baseline terukur (DOM live, viewport 1280×720):** 158 modul · 24 grup · 46 ikon unik (`shield` dipakai 11×) · 57 NEW (36%) · 54 modul (34%) tersembunyi (`HIDDEN_GROUPS`, termasuk 27 PSAK). Partner Perikatan 44 baris (7 duplikat)/2,87 layar; Firma 67/4,26. Junior Perikatan = **identik Partner** (44, tanpa escape hatch) — scaffolding terbalik.

**Status: Fase 1 ✅ MERGED master PR #118 (squash `53ea640`)** + **Fase 2 ✅ MERGED master PR #120 (squash `f5ebfef`)**. Sign-off "Proceed." + "ikuti rekomendasi" dari Ari. Ratchet `:any` shell.tsx 41→39 (Fase 1). Repo bersih di master; hanya 2 PR Dependabot (#116/#117) tersisa.

**Fase 1 = 4 perbaikan MURNI-UI** (capability/RBAC nol berubah; escape hatch+⌘K+Matriks tetap menjangkau 158 modul), bundel 1 PR (bukan 3 spt PRD — dua file sama):
- **R1** progressive disclosure: grup default CIUT kecuali jangkar (grup aktif / anchor ws / grup fokus fase); `closedGroups` dipersist `localStorage['ams.sideGroups']` (pola ams.ws, BUKAN useAmsPersist yg server-backed). Partner Firma 67→8 baris, Perikatan 44→13.
- **R3** `ROLE_SIDEBAR_GROUPS` (icons.tsx) kurasi juga workspace `engagement` utk Senior/Junior (dulu `null`); Junior Perikatan 6→3 grup. Escape hatch (shell.tsx) dulu render HANYA bila `curatedGroups` truthy → Partner tak punya kontrol; kini SELALU tampil, `showAll` buka semua grup. Label adaptif "Tampilkan semua modul"/"Buka semua grup"/"Ringkas kembali".
- **R7** buang kartu "Fokus Fase" yg menyalin 7 modul Core Execution (44→37 unik); sisakan indikator fase + emphasis `.relev` di pohon.
- **R6** `NEW_ALLOW` (Set di icons.tsx, export) — badge NEW hanya utk id di set (kini `{'restatement'}`); NEW terlihat 20→0. Buang cabang mati `.soon` (semua modul deep:true).

**Fase 2 = filter pencarian** (`f5ebfef`). Kotak filter inline `.side-scroll` lintas-158 termasuk HIDDEN_GROUPS (PSAK/SA). `SIDE_SEARCH_ALL` indeks statis + `sideSearchScore` (awalan>kata>substring>grup/id). Hormati GROUP_CAP+MODULE_CAP (tak surface yg ter-gate). Hasil: jalur grup + "· referensi"/"· Perikatan/Firma"; klik→nav+clear query; Enter→top; Esc→clear. Live: `psak 73`/`sa 240` (tersembunyi) kini ketemu; klik PSAK16→route psak16. GOTCHA: `konfirmasi`→0 (modul label Inggris "Confirmation Hub") = gap bahasa T8→Fase 3. Nol :any baru (tipe struktural `{target:{value}}`/`{key}`, ikon `keyof typeof I` — proyek TANPA @types/react). MERGE-GOTCHA: PR #119 (stacked base=f1) TER-AUTO-CLOSE saat branch f1 dihapus pada merge #118 — GitHub tak retarget child PR, malah menutupnya. Fix: `git rebase --onto master 68eb316 <f2>` (buang commit f1 redundan, bersih krn konten squash sama) → PR baru #120 base master (reopen gagal krn base branch terhapus). PELAJARAN: jangan stack PR di branch yg akan dihapus; atau merge berurutan cepat.

**Fase 3 — keputusan Ari "ikuti rekomendasi" (2026-07-24), TERCATAT di PRD §11. BELUM diimplementasi (mulai dari master):**
  1. Bahasa → Indonesia label grup/aksi; kode standar+jargon KAP tetap; **sinonim filter per-modul** (mis. `confirm`→"konfirmasi") biar filter R2 tak bergantung bahasa label.
  2. `Core Specifics` → **rename "Area Khusus & Estimasi"** (tak dibubarkan).
  3. PSAK/SA → tetap tersembunyi + filter; **tanpa** workspace ketiga.
  **Fase 3a ✅ MERGED #121 (`7d4a8a5`)**: sinonim filter `SIDE_SYNONYMS` (tahan-bahasa, match substring — `konfirmasi`→Confirmation Hub dst) · 6 ikon semantik (risk→alert, independence→sync, pdp→lock, pipeline→filter, analytical→pulse, dms→archive; shield 11→8) · FIX collapsed 48px tampilkan semua grup (regresi R1: 13→37) + pemisah antar-grup.
  **Fase 3b ✅ MERGED #122 (`9ce0cb3`)** = R4: rename+nomori grup Perikatan → `Ruang Kerja Perikatan`/`1 · Perencanaan`/`2 · Pelaksanaan`/`Area Khusus & Estimasi`/`3 · Penyelesaian & Pelaporan`, Referensi & Indeks dipindah ke bawah. Nama grup=KEY: diubah serempak di icons.tsx (MODULES group:/WORKSPACES.groups/ROLE_SIDEBAR_GROUPS) + shell.tsx (SIDE_GROUP_PHASE keys/SIDE_PRIMARY_GROUP values/WS_ANCHOR). connectivity.json TAK dimuat app; app/* beku; nol test bergantung. Adaptif Fokus Fase tetap mengikat.

  **R5 ✅ MERGED #123 (`178153d`) — disambiguasi label, BUKAN merge.** TEMUAN KOREKSI: "twins" ternyata **modul DISTINCT** (view+data terpisah): wip=WIPValuation · wipreal=WIPRealization · revenue=FirmRevenue · firmtax=FirmTax · tax=TaxPPh23 · independence=Independence(view_people) · teamindep=MemberIndependence(SA 220, view_independence). Merge=SALAH. Ari pilih "disambiguasi label" → wip 'WIP · Valuasi', wipreal 'WIP · Realisasi', revenue 'Pendapatan Firma', firmtax 'PPh Badan Firma', tax 'PPh 23 · Pemotongan', independence 'Independensi Firma & Rotasi', teamindep tetap. Label=string tampil (bukan key)=nol risiko.

  **Rename grup FIRMA → Indonesia ✅ MERGED #124 (`9688e9d`)** (lanjutan konsistensi Q1): Firm Practice Management→Manajemen Praktik Firma · Practice Operations→Operasi Praktik · People & Compliance→**SDM & Kepatuhan** · Firm Finance (ERP)→Keuangan Firma (ERP) · Firm Platform→Platform Firma · Backoffice & Firm Mgmt→Operasi & Administrasi Firma. KRITIS: `GROUP_CAP` key ikut di-rename ('SDM & Kepatuhan'→hr.moduleView) — kalau tak sinkron, gerbang visibilitas modul SDM bocor. Diubah serempak: icons.tsx (MODULES/WORKSPACES/GROUP_CAP/ROLE_SIDEBAR) + shell.tsx (WS_ANCHOR) + view_home (2 judul) + display strings (related_modules_data2/view_settings/view_pppk). Seluruh sidebar kini Indonesia konsisten.

  **Polish ✅ MERGED #125 (`dbbcd4c`):** (1) sinkron 5 docstring `tools/excel-pack/*.py` dgn nama grup baru (deskriptif; nama sheet Excel tak berubah). (2) cross-link LINEAGE 6 modul serumpun di `related_modules_data2.ts` — rantai NYATA: wip→wipreal→revenue, tax→firmtax, independence→teamindep; tiap `rel` tegaskan "sudut lain (bukan duplikat)". Dock keterkaitan terverifikasi live (chip navigasi). LINEAGE shape: `{std, up:[{id,ic,lbl,rel}], down:[...]}`, WAJIB ada up+down (map crash bila undefined); dock collapsed default; entri tambahan ke window.LINEAGE bisa di mana saja sebelum konsumen (referensi objek sama).

  **TUNTAS.** 7 PR total (#118/#120/#121/#122/#123/#124/#125). Seluruh sidebar Indonesia konsisten + peta siklus + filter tahan-bahasa + modul serumpun ter-disambiguasi & ter-cross-link. Repo bersih master; hanya 2 Dependabot (#116/#117).

GOTCHA (lihat juga [[asseris-pagehead-single-row]] utk pola verifikasi live):
- Escape hatch/toggle: React re-render TIDAK sinkron dgn klik → ukur DOM di **panggilan js_tool TERPISAH** (bukan setelah `.click()` di tick sama), kalau tidak dapat state basi.
- `useAmsPersist`/`useServerState` = server-backed (jangan utk preferensi UI trivial spt collapse — pakai localStorage langsung spt `ams.ws`/`ams.sideShowAll`).
- shell.tsx pakai ESM import dari `./icons` (bukan global bare) → simbol baru WAJIB diekspor dari icons.tsx + ditambah ke import shell.tsx.
- Menghapus kode ber-`(as any)` → lint "stale suppressions" exit 2 → `npx eslint src --prune-suppressions` (ratchet turun = bagus).
- Login seed: Partner `hartono.w@whr-cpa.id`/`Partner#2025!`; Junior `fajar.n@whr-cpa.id`/`Junior#2025!`. Reset nav: hapus `ams.ws`/`ams.sideShowAll`/`ams.sideGroups`.

Terkait: [[asseris-nav-beranda-restructure]] (ROLE_SIDEBAR_GROUPS/groupsVisibleFor asal), [[asseris-personal-data-isolation]] (GROUP_CAP), [[asseris-pagehead-single-row]].
