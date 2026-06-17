# W0 — Baseline Hijau & Verifikasi Kit

Status verifikasi titik-awal yang dapat direproduksi untuk arc W0–W10.
Tanggal: 2026-06-17 · Node v24.16.0 / npm 11.6.2 · git baseline tag: commit `9f5b095`.

## Ringkasan hasil

| Jalur | Status | Bukti |
|---|---|---|
| **Precompile produksi** (`build/`) | ✅ HIJAU | 183/183 JSX → `app/compiled/*.js`; `NeoSuite AMS (prod).html` boot, render penuh, navigable. |
| **Vite/ESM target** (`migration/`) | ⚙️ Toolchain terverifikasi | `codemod` exit 0 (214 file); `vite build` 242 modul; dev server boot, semua modul + `AMS`/`AMS_CANON`/`Copilot` termuat. Render penuh menunggu W3 (lihat carry-over). |
| **Laporan `codemod:dry`** | ✅ ditinjau | 212 file, 486 simbol global. Dicatat untuk W3. |

## Angka kunci terkunci (SSOT — dari `window.AMS_CANON`, WTB 28 baris)

Ditarik dari prod.html. Karena precompile hanya mentranspilasi `.jsx` (file `.js`
data/canon disalin apa adanya) dan perbaikan W0 hanya menyentuh 5 view `.jsx`,
angka ini **identik dengan versi root buildless secara konstruksi**. Pakai sebagai
patokan regresi-nol untuk W2/W3/W6 dan fixture uji W4.

**Materialitas** (benchmark = Laba Sebelum Pajak)
- Bench PBT: `Rp 85.200.000.000`
- Overall Materiality (OM, 5%): `Rp 4.260.000.000`
- Performance Materiality (PM, 75% OM): `Rp 3.195.000.000`
- Clearly Trivial Threshold (CTT): `Rp 213.000.000`

**PSAK 46 — Pajak Tangguhan** (`deferredTax()`, satuan juta Rp)
- DTA reported: `4.980` · tax expense: `10.274` · ETR: `21,18%`
- DTA variance: `−1.914` · PBT: `48.500` · PKP: `53.500` · tarif: `22%`

**PSAK 71 — ECL** (`psak71()`)
- CKPN booked: `1.980` → audited: `2.600` (juta) · ECL model: `2.603,014`
- Overlay: `141,535` · coverage: `5,26%` · gap: `623,014` · audit variance: `3,014`

**PSAK 73 — Sewa** (`leasePortfolio()`)
- ROU: `Rp 11.284.137.787` · Liability: `Rp 11.758.354.678` · Net: `Rp 474.216.890`

`reconcile(WTB)` mengembalikan objek terstruktur (accounting/dt/inv/fa/intan/figures/eclModel/p71) — OK.

## Temuan W0 (2 hal)

### 1. Pelanggaran golden-rule #1 laten — DIPERBAIKI di W0
Precompile produksi (preset-react saja, `const` dipertahankan) menyingkap tabrakan
alias hook React lintas-file yang **disembunyikan** versi dev (Babel-standalone di
browser men-down-level `const`→`var`) dan **tidak relevan** untuk ESM (scope per-modul).
5 pasang file berbagi suffix alias → `SyntaxError: Identifier '…' has already been
declared` → `copilot.js` ditolak → layar putih. Diperbaiki dengan menamai-ulang suffix
unik di satu file tiap pasang:

| Sebelum | File diubah | Sesudah |
|---|---|---|
| `useStateCP/useMemoCP/useEffectCP/useRefCP` | `view_palette.jsx` | `…PAL` |
| `useStateF3/useMemoF3` | `view_profit.jsx` | `…PRF` |
| `useStateF/useMemoF` | `view_sa240.jsx` | `…S240` |
| `useStateIP/useMemoIP` | `view_invprop.jsx` | `…IVP` |
| `useStateOB` | `view_opening.jsx` | `…OPN` |

> Catatan kit: `build/precompile.mjs` mengklaim transform "identik dengan Babel di
> browser" — tidak persis (dev memuat preset env, kit hanya preset-react). Perbaikan
> sumber adalah jalur yang benar (golden-rule #1) dan membuat ketiga jalur build benar.

### 2. Carry-over ke W3 — wiring impic ESM untuk simbol tak-dipublikasikan
Codemod hanya men-`export`/`import` simbol yang dipublikasikan ke `window`
(`Object.assign(window,{…})`). ~75 "global tak dikenal" (helper lintas-file yang tak
pernah ditaruh di `window`) tak ter-wire → tak terlihat di scope modul ESM → render
Vite gagal. Contoh: `useStateUI` (dipakai `shell.jsx`, dideklarasi `ui.jsx`), `KvBox`,
`RowKv`, `Kv`, `PEVT`, `PROGRAMME`, `ML_FINDINGS_SEED`, `PSAK48View`, `PSAK68View`.
Plus tabrakan nama nyata `AJEView` (`view_execution.jsx` + `view_aje.jsx`).
**Ini persis lingkup W3** (DoD: `eslint no-undef` hijau). Bukan blocker prod.html.

## Reproduksi
```powershell
# prod (offline, cepat)
cd build; npm install; npm run build           # -> "NeoSuite AMS (prod).html"
# vite/esm
cd ../migration; npm install
npm run codemod:dry                            # laporan tabrakan + global tak dikenal
npm run codemod; npm run build                 # 242 modul
npm run dev                                     # http://localhost:5180
```
Verifikasi prod.html cepat: serve root via `node .claude/preview-static.mjs` (port 5188).
