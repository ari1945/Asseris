# `migration/` — Frontend Asseris (Vite + React + TypeScript)

Paket ini adalah **sumber kebenaran aplikasi** Asseris (SPA React, ESM-only). Edit di
`migration/src/*`. Untuk gambaran produk & arsitektur menyeluruh, lihat
[`../README.md`](../README.md); untuk panduan build/alur kerja lengkap, lihat
[`../BUILD.md`](../BUILD.md).

> **Sejarah:** paket ini semula lahir sebagai pass migrasi mekanis `window` → ESM
> (codemod). Sejak W3 Phase 2, `src/` menjadi **kanonik & di-maintain tangan**;
> `codemod.mjs` **pensiun** — menjalankannya akan menimpa suntingan tangan. Berkas
> buildless lama di root (`NeoSuite AMS.html`, `app/*`, `build/`) kini **referensi beku**.

---

## TL;DR

```powershell
cd migration
npm install
npm run dev:all     # server (:5181) + Vite (:5180) — cara utama menjalankan app
# atau tanpa backend:
npm run dev         # Vite saja (:5180) — persistensi degrade ke cache-only
```

Butuh Node ≥ 18. Login dengan akun dev (lihat [`../README.md`](../README.md#akun-dev)).

## Skrip

| Skrip | Fungsi |
|---|---|
| `npm run dev` | Vite dev server (:5180, HMR) |
| `npm run dev:all` | Server backend (:5181) + Vite (:5180) bersamaan |
| `npm run build` | Bundel produksi → `dist/` |
| `npm run lint` | ESLint (`no-undef` + `no-dupe-keys` = 0 pada `.js/.jsx`) — WAJIB hijau |
| `npm run typecheck` | `tsc --noEmit` — gerbang TypeScript kanon (strict penuh), WAJIB 0 error |
| `npm run test` | Vitest — jaring "mesin angka" kanon (`+ --coverage` untuk gerbang ≥80%) |

## Struktur

```
migration/
  index.html         entri Vite → src/main.jsx (import ber-urutan boot)
  src/
    main.jsx         entri: CSS → semua modul (boot order) → app.jsx
    canon*.ts        MESIN HITUNG kanonik (SSOT), TypeScript strict
    forensic_canon.ts arus kas forensik
    canon_selectors.ts / canon_types.ts   selektor & tipe publik yang dikonsumsi view
    data*.js|ts      data master + helper (WTB/AJE/RISKS/…)
    view_*.jsx|tsx   ~150 modul halaman
    contexts.jsx     Auth/Firm/Audit context + hook persistensi
    ui.jsx / shell.jsx  primitif UI + TopBar/Sidebar/SubBar
  vite.config.mjs    esbuild loader 'tsx' atas .js/.jsx/.ts/.tsx
  vitest.config.mjs  harness uji kanon
  eslint.config.js   flat config (melint .js/.jsx; .ts dijaga tsc)
```

## Verifikasi

- [ ] `npm run dev` / `dev:all` membuka app; navigasi ⌘K, sidebar, drawer SA berfungsi.
- [ ] Tidak ada error konsol "X is not defined".
- [ ] Angka kanonik konsisten (materialitas OM 4.260 / PM 3.195 / CTT 213; PSAK 46/71/73).
- [ ] `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` — semua hijau.

_Detail konvensi domain, aturan emas anti-tabrakan, dan cara menambah modul: [`../CLAUDE.md`](../CLAUDE.md)._
