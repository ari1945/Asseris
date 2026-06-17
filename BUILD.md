# NeoSuite AMS — Build & Workflow (W1)

Tiga representasi dari **satu sumber kebenaran** (`app/*.jsx` + `app/*.js`):

| Mode | File / perintah | Kapan dipakai | Kecepatan |
|---|---|---|---|
| **Edit cepat (buildless)** | buka `NeoSuite AMS.html` | mengembangkan/mengedit — lihat perubahan tanpa build (Babel di browser) | boot ~60 dtk |
| **Produksi (precompile)** | `cd build && npm run build` → `NeoSuite AMS (prod).html` | demo/offline/deploy statik | boot ~2–3 dtk |
| **Build SSOT (Vite + ESM)** ⭐ | `cd migration && npm run build` | **pipeline build resmi** — graf impor, lint, tree-shake, test | — |

> **Vite (`migration/`) adalah sumber kebenaran build (W1).** Satu entri
> `src/main.jsx` menggantikan 188 tag `<script>` yang dulu diurutkan manual —
> urutan boot kini dijamin graf impor, bukan urutan tag. Root `NeoSuite AMS.html`
> tetap untuk edit-cepat; `app/*.jsx/.js` tetap satu-satunya sumber yang diedit.

## Alur kerja
```powershell
# 1) edit sumber di app/*.jsx atau app/*.js

# 2) regenerasi target ESM dari sumber (dual-publish; aman, additif)
cd migration; npm run codemod

# 3) gerbang mutu (W1) — WAJIB hijau sebelum commit
npm run lint            # error-gate: no-undef + no-dupe-keys = 0  (HARUS hijau)
npm run build           # vite build — 242 modul, tanpa kegagalan resolusi

# 4) verifikasi cepat
npm run dev             # http://localhost:5180  (ESM/HMR)
# atau prod: cd ../build; npm run build; lalu serve root via node ../.claude/preview-static.mjs
```

## Gerbang ESLint (W1)
Config: `migration/eslint.config.js` (flat). Jalankan `npm run lint` (atau `lint:fix`).

- **ERROR (hard gate, kini hijau):** `no-undef` (referensi non-JSX tak terdefinisi),
  `no-dupe-keys` (kunci objek ganda — bug data senyap).
- **WARN (worklist W3, 607 saat ini):**
  - `react/jsx-no-undef` (444) — komponen helper lintas-file belum di-wire ESM:
    **`KvBox` (254), `RowKv` (142), `Kv` (2)** + `PSAK48View`/`PSAK68View`; plus
    keterbatasan rule yang salah-tandai `window` di `<window.X/>` (44).
  - `react-hooks/rules-of-hooks` (163) — pola disengaja era buildless
    (guard `typeof useNav === 'function' ? …` rule-#6, `window.useAmsPersist`).
  Keduanya **dipromosikan ke error di W3** setelah wiring impor statik selesai.

## Catatan reproduktibilitas
- `package-lock.json` di `build/` & `migration/` di-commit (deps terkunci).
- Artefak generate (`app/compiled/`, `app/vendor/`, `migration/src/`,
  `NeoSuite AMS (prod).html`, `dist/`) di-`.gitignore` — regenerasi dari sumber.
