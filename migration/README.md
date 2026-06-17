# Migrasi `window` → ESM — NeoSuite AMS

Paket migrasi mekanis untuk menutup gap **P1 · "Namespace `window` menggantikan impor ESM"**
dari dokumen _Kesiapan Pengembangan Claude Code_. Targetnya: graf dependensi statis di bawah
**Vite**, agar Claude Code (dan tooling: lint / tree-shake / typecheck) bisa menelusuri
"siapa memakai apa", dan kelas bug "tabrakan nama top-level" hilang.

> **App asli tidak disentuh.** Semua hasil ditulis ke dalam folder `migration/`.
> Rollback = hapus `migration/`. Versi buildless di root tetap berjalan apa adanya.

---

## TL;DR

```bash
cd migration
npm install
npm run codemod:dry     # laporan dulu: tabrakan nama + global tak dikenal (TIDAK menulis)
npm run codemod         # tulis migration/src/*, main.jsx, index.html
npm run dev             # Vite — verifikasi app jalan identik di http://localhost:5180
npm run build           # bundel produksi → migration/dist
```

Butuh Node ≥ 18. Jalankan & verifikasi di mesin Anda / sesi Claude Code (Vite perlu Node —
tidak bisa diverifikasi di dalam preview HTML).

---

## Strategi: dual-publish (kenapa aman)

Codemod **menambah**, tidak menimpa:

| Lapisan | Sebelum | Sesudah |
|---|---|---|
| Ekspor | `Object.assign(window, { Badge, Btn })` | _tetap_ **+** `export { Badge, Btn };` |
| Impor | `Badge` muncul sbg global ajaib | `import { Badge } from './ui.jsx';` disisipkan di atas |
| Bus runtime | `window.__amsOpenSA = …` | _tetap apa adanya_ (sengaja) |

Karena tulisan ke `window` dipertahankan, **migrasi sebagian pun tetap jalan**: jika satu
simbol terlewat oleh penyisip impor, runtime masih menemukannya lewat `window`. Ini menukar
"big-bang yang rapuh" dengan "konversi bertahap yang selalu hijau".

Setelah `npm run dev` terbukti identik, lapisan `window` bisa dilucuti **berkas demi berkas**
(hapus `Object.assign(window, …)`; ganti sisa `window.X` baca dengan `import`) — masing-masing
PR kecil yang bisa diverifikasi. Itulah pekerjaan yang **cocok diserahkan ke Claude Code**.

---

## Yang dihasilkan

```
migration/
  codemod.mjs          ← konverter (AST @babel/parser, dijalankan di Node)
  package.json         ← deps + skrip (dev/build/test/codemod)
  vite.config.mjs      ← satu titik entri, plugin-react, sourcemap
  README.md            ← berkas ini
  index.html           ← entri Vite (GENERATED) — 1 <script type="module">, bukan ~190 tag
  src/                 ← (GENERATED) salinan app/* + import/export ESM
    main.jsx           ← entri: import CSS → semua modul (boot order) → app.jsx
    *.js / *.jsx       ← modul hasil konversi
    styles.css
```

## Cara kerja codemod (ringkas)

1. **Baca boot order** dari `NeoSuite AMS.html` (urutan `<script src="app/…">`).
2. **Peta simbol global** via AST: `Object.assign(window,{…})`, `window.NAMA = …`,
   namespace data (`window.AMS/PROC/BO/FAC/FIRMFIN/FSGEN` → pemilik = berkas pertama).
3. **Per berkas**, dengan analisis scope Babel: identifier bebas (termasuk komponen JSX
   `<Foo/>` dan `<I.x/>`) yang ada di peta tetapi tak dideklarasi lokal → `import { … }`.
   `React` → `import React from 'react'`; `ReactDOM` → `import ReactDOM from 'react-dom/client'`.
4. **Dual-publish** ekspor di kaki berkas. Entri `main.jsx` + `index.html` dibuat otomatis.

## Membaca laporan codemod

- **Tabrakan nama** — nama yang dimiliki >1 berkas (footgun `const styles`, dsb). Codemod
  memakai pemilik pertama (load order) + fallback `window`; tetap **tinjau manual** dan beri
  nama unik (lihat aturan emas di `CLAUDE.md`).
- **Global tak dikenal** — identifier yang dirujuk tapi bukan simbol modul/browser. Biasanya:
  global runtime baru (tambahkan ke `BROWSER_GLOBALS`), atau simbol yang lupa diekspor.

## Verifikasi (checklist)

- [ ] `npm run dev` membuka app; navigasi ⌘K, sidebar, drawer SA berfungsi.
- [ ] Tidak ada error konsol "X is not defined" (artinya ada import terlewat → cek laporan).
- [ ] Modul angka konsisten (PSAK 46/71/73, materialitas) — sama seperti versi root.
- [ ] `npm run build` sukses; `npm run preview` jalan.

## Langkah lanjut (sesuai roadmap dokumen)

1. **Lucuti `window`** berkas demi berkas (PR kecil) setelah dev hijau.
2. **Vitest untuk "mesin angka"** — `AMS_CANON`, PSAK 46/71/73 (lihat `scripts.test`).
3. **TypeScript bertahap** mulai dari `canon` + kontrak antar-modul.

---

_Catatan: codemod adalah pass mekanis pertama. Ia dirancang konservatif (tak ada kode lama
ditimpa) justru agar Claude Code dapat menyelesaikan sisa pelucutan `window` dengan aman,
dipandu jaring uji._
