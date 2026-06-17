# NeoSuite AMS — Onboarding Agen (sekali-baca, langsung produktif)

> **⚠️ STATUS ARSITEKTUR (sejak W3 Phase 2):** aplikasi kini **ESM-only**.
> Sumber kebenaran = **`migration/` (Vite + ESM)**; edit di **`migration/src/*`**
> (hand-maintained). Build/lint/dev: lihat **`BUILD.md`**. Berkas buildless
> di bawah (`NeoSuite AMS.html`, `app/*`, `build/`, codemod) kini **REFERENSI
> BEKU** — jangan diedit/dibangun/dikirim. Dokumen di bawah tetap berlaku untuk
> memahami struktur modul, kontrak `window`/runtime-bus, dan konvensi domain
> yang `migration/src` warisi; aturan emas anti-tabrakan masih relevan selama
> `window` belum dilucuti penuh (W3 Phase 4). Progres arc: lihat memory
> `neosuite-ams-arc`.
>
> **W5 (TypeScript bertahap):** lapisan **kanon kini TypeScript** —
> `canon*.ts` + `forensic_canon.ts` + `canon_types.ts` + `canon_selectors.ts` +
> `src/types/globals.d.ts`. Gate `npm run typecheck` (`tsc --noEmit`) WAJIB 0
> error; `strict` ON kecuali `strictNullChecks` (ramp berikutnya). View tetap
> `.jsx` dan menarik tipe via `canon_selectors`. ESLint tak melint `.ts` (tsc
> yang menjaganya). Detail: `BUILD.md`.

> Aplikasi audit firma (KAP) berbahasa Indonesia. **Satu SPA React, tanpa build step**, dirakit dari ratusan file via `<script>` di `NeoSuite AMS.html`. Babel mentranspilasi JSX di browser. Baca dokumen ini lebih dulu, lalu langsung kerja.

---

## 1. Peta Arsitektur (boot order = urutan `<script>` di `NeoSuite AMS.html`)

```
NeoSuite AMS.html  ← ENTRY. <div id="root"> + semua <script> berurutan.
│
├─ FASE 1 · DATA (plain JS, IIFE)            window global, BUKAN modul React
│   data.js .................. window.AMS  (fmt, rp, FIRM, USER, CLIENTS, ENGAGEMENTS, WTB, AJE, RISKS, TEAM, WORKPAPERS…)
│   data_*.js ................ Object.assign(window.AMS, …)  ATAU namespace sendiri:
│                                window.PROC · BO · FAC · FIRMFIN · (FSGEN dari fsgen_model.jsx)
│   canon.js ................. window.AMS_CANON  ← MESIN HITUNG / SUMBER KEBENARAN TUNGGAL
│   forensic_canon.js ........ tambahan AMS_CANON (arus kas forensik)
│
├─ FASE 2 · FONDASI (Babel JSX)
│   icons.jsx ................ window.I (ikon)  +  MODULES · MODULE_INDEX · WORKSPACES · GROUP_WS · HIDDEN_GROUPS · RELATED_SA
│   contexts.jsx ............. AuthContext/FirmContext/AuditContext + hooks (useAuth/useFirm/useAudit/useNav)
│                              + usePersisted + window.useAmsPersist + <AppProviders>
│   ui.jsx ................... primitif bersama: Badge Btn Panel Portlet Stat Progress Avatar Tabs Seg Placeholder Spark MiniBars Donut Menu StubView LockBanner
│   shell.jsx ................ TopBar · Sidebar · SubBar
│
├─ FASE 3 · FITUR LINTAS-SEKTOR (Babel JSX)
│   evidence.jsx · related_modules.jsx (LINEAGE dock) · copilot.jsx · ai_insights.jsx
│   sa_canonical.jsx (status SA dari WP kanonik) · fsgen_model.jsx · view_*_parts.jsx (sub-komponen besar)
│
├─ FASE 4 · MODUL HALAMAN (Babel JSX) — ~150 file view_*.jsx, satu/lebih komponen per file
│   view_dashboard.jsx … view_psak*.jsx … view_sa*.jsx … view_firm*.jsx …
│
└─ FASE 5 · app.jsx  ← HARUS TERAKHIR
    ViewErrorBoundary · viewFor(moduleId) [switch router] · <App/> · <Root/> · ReactDOM.createRoot(...).render
```

**Struktur direktori**
```
/  (root)
  NeoSuite AMS.html ............... aplikasi (entry)
  Evaluasi NeoSuite AMS - *.html .. dokumen laporan/evaluasi (deliverable terpisah, BUKAN bagian app)
  NeoSuite Design System*.html .... referensi visual
  Matriks Kepatuhan / Opsi B *.html dokumen pendukung
  connectivity.json .............. data graf keterhubungan modul (out/inc/status per modul)
  app/ ........................... SELURUH kode sumber app (lihat peta di atas)
  peta/  Peta Keterhubungan Modul.html + peta_map.js — visualisasi graf modul
  screenshots/ · uploads/ ........ aset & lampiran
```

---

## 2. ATURAN EMAS ANTI-TABRAKAN (langgar = app putih/crash)

Semua `.jsx` ditranspilasi di **scope global yang sama**. Nama top-level bertabrakan lintas file.

1. **Alias hook React per-file, unik.** JANGAN pernah menulis `const { useState } = React;` polos di top-level. Pakai sufiks dari nama modul:
   `const { useState: useStateR } = React;`  (Risk → R, Materiality2 → M2, PSAK46 → P46, FSGen → FS, Workspace → WS, ui.jsx → UI…).
2. **JANGAN `const styles = {}` global.** Beri nama spesifik (`const riskStyles = …`) atau inline. Tabrakan styles = breakage senyap.
3. **Ekspor di akhir file:** `Object.assign(window, { NamaKomponen, helperLain });` — supaya `viewFor()` & file lain bisa memanggilnya.
4. **`app.jsx` selalu paling akhir.** Script baru disisipkan SEBELUM `app.jsx`.
5. **Jangan redefinisi nama yang sudah di window.** Cek dulu `MODULE_INDEX`, primitif `ui.jsx`, key di `I`, dan namespace data (AMS/PROC/BO/FAC/FIRMFIN/FSGEN).
6. **Akses context defensif** (modul bisa dirender di drawer/luar provider):
   `const nav = (typeof useNav === 'function') ? useNav() : (() => {});`

---

## 3. Cara Menambah Modul (checklist 4 langkah wajib + opsional)

1. **Buat `app/view_<nama>.jsx`** → alias hook unik → `function MyView(){…}` → akhiri `Object.assign(window, { MyView });`
2. **Daftarkan di `app/icons.jsx`** → tambah `{ id:'myid', label:'…', icon:'<key di I>', deep:true }` ke grup yang tepat dalam `MODULES`. Grup sudah dipetakan ke workspace lewat `GROUP_WS`; grup di `HIDDEN_GROUPS` tetap bisa diakses via ⌘K/chip/Matriks tapi tak muncul di sidebar.
3. **Sambungkan route di `app/app.jsx`** → `case 'myid': return <MyView />;` di `viewFor()`.
4. **Tambah `<script type="text/babel" src="app/view_<nama>.jsx"></script>` di `NeoSuite AMS.html`**, SEBELUM `app.jsx`.

Opsional (rekat ke ekosistem):
- **Data** → IIFE `data_<x>.js` yang `Object.assign(window.AMS, …)` atau namespace baru; figur angka **ditarik dari `window.AMS_CANON`**, jangan hardcode.
- **Chip Standar Terkait** → `RELATED_SA['myid'] = [{ code, title, phase, view? }]` (icons.jsx).
- **Dock Hulu/Hilir** → `LINEAGE['myid'] = { std, up:[…], down:[…] }` (related_modules.jsx).
- **Checklist kepatuhan** → `COMPLIANCE_CONFIG['myid']` (view_compliance.jsx); modul tanpa view khusus otomatis dirender `<ComplianceView>` lewat fallback `viewFor()`.

---

## 4. Daftar Global `window` Kunci

| Global | Isi |
|---|---|
| `AMS` | Data master + helper `fmt`/`rp`. WTB, AJE, RISKS, CLIENTS, ENGAGEMENTS, TEAM, WORKPAPERS, TEMPLATES, KB_*, dst. |
| `AMS_CANON` | **Sumber kebenaran tunggal** perhitungan: `materiality()`, `psak65(wtb)`, `psak22/46/48/58/25`, `reconcile`, `leasePortfolio`, `deferredTax`, `figuresFromWTB`, `FIG`, … |
| `PROC` `BO` `FAC` `FIRMFIN` `FSGEN` | Data/kalkulasi domain (pengadaan, backoffice, fasilitas, keuangan firma, generator LK). |
| `I` | Ikon stroke-SVG; pakai key string (mis. `icon:'shield'`). |
| `MODULES` `MODULE_INDEX` `WORKSPACES` `GROUP_WS` `HIDDEN_GROUPS` | Registry navigasi (id→{label,icon,group}). |
| `RELATED_SA` | Peta modul→Standar Audit (chip + drawer SA). |
| Hooks: `useAuth` `useFirm` `useAudit` `useNav` `useNavFrom` | Context perikatan/firma. |
| Persist: `useAmsPersist(key,init)` `loadLS(k,d)` | State → `localStorage`. |
| WP: `deriveWpStatus(ref,audit,firm)` `openCanonicalWp(nav,ref)` | Status kertas kerja kanonik. |
| Imperatif: `__amsOpenSA(data)` `__amsOpenCopilot()` `__amsSetSidebar()` `amsApplyPrefs(s)` `compliancePct(stdId)` | Kontrol global app. |
| Primitif UI: `Badge Btn Panel Portlet Stat Tabs Seg Menu Donut Spark …` | dari `ui.jsx`. |

---

## 5. Pola & Konvensi yang Harus Diikuti

- **SSOT / "sumber kebenaran tunggal":** angka berasal dari `window.AMS.WTB` melalui `AMS_CANON.*`. Status WP dari `deriveWpStatus`. **Jangan** menyimpan salinan privat / hardcode angka yang sudah ada di canon.
- **Persistensi:** `usePersisted`/`useAmsPersist` → key `ams.v1.<key>`. Prefs app → `ams.<key>`. Checklist → `ams.comp.<stdId>.*`. Selalu try/catch JSON.
- **Navigasi:** `nav(id, { from:'modulIni' })` agar breadcrumb "kembali" (SubBar) & follow-workspace bekerja. Drawer SA dibuka `window.__amsOpenSA({ code, title, view? })`.
- **Routing modul tak terdaftar:** `viewFor()` fallback ke `<ComplianceView>` (bila ada `COMPLIANCE_CONFIG[id]`) atau `<StubView>`.
- **Bahasa & angka:** UI Bahasa Indonesia; mata uang `rp()`/`fmt()` lokal id-ID (mis. `Rp 1.850.000.000`, negatif dalam kurung).
- **Styling:** CSS di `app/styles.css` + CSS var (`--navy --blue --ink-2 --line --red --amber-bg …`). Pakai var, bukan warna hardcode baru.
- **Babel & React dipin** (versi + integrity di `<head>`) — jangan ubah.

---

## 6. Jebakan Umum
- Lupa `<script>` baru sebelum `app.jsx` → modul "tak terdefinisi" di `viewFor`.
- Lupa `Object.assign(window, …)` → `ReferenceError` saat dirender.
- Hook/`styles` polos tak ber-alias → layar putih senyap (cek konsol: "Identifier already declared").
- Hardcode angka yang seharusnya dari `AMS_CANON` → angka tak sinkron antar modul (pelanggaran SSOT).
- File raksasa: pecah komponen besar ke `view_<x>_parts.jsx` dan impor sebelum file utamanya.
