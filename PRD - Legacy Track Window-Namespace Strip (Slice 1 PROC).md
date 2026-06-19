# PRD — Legacy Track: Window-Namespace Strip (Slice 1 = `PROC`)

> Wajib diisi sebelum implementasi apa pun. Implementasi TIDAK dimulai sebelum sign-off ("Proceed.").

| Field | Isi |
|---|---|
| Tanggal | 2026-06-19 |
| Pemilik | Ari Widodo |
| Status | Review |
| Engagement ID terkait | — (internal: NeoSuite AMS, arc `neosuite-ams-arc`) |

## 1. Problem
Codebase NeoSuite AMS masih membawa **utang arsitektur era-buildless**: ~930 pembacaan
`window.<NS>` lintas ~modul (632 `window.AMS`, 108 `AMS_CANON`, 41 `I`, 40 `BO`, 35 `LEGAL`,
26 `FSGEN`, 13 `FAC`, 12 `IMPORT`, 11 `FIRMFIN`, 10 `AMS_FORENSIC`, 6 `PROC`). Setiap data-layer
masih **dual-publish** (`window.NS = {…}` *plus* `export const NS = window.NS`). Akibatnya:
- "Aturan emas anti-tabrakan" (alias hook per-file, larangan `styles` global, dst.) masih wajib
  dipatuhi manual — sumber layar-putih senyap.
- Tipe tak mengalir: `window.X` adalah `any` ambient (`globals.d.ts`), jadi widen-TS terhambat.
- Modul tak punya graf dependensi eksplisit — urutan `import` di `main.jsx` jadi kontrak implisit
  yang rapuh.

Ini adalah item arc multi-sesi yang ditunda sejak W3 Phase 4 ("strip window per-workspace"). PRD ini
men-scope **hanya slice pertama** untuk membuktikan resep, bukan seluruh strip.

## 2. Objective
Tetapkan **resep strip per-namespace yang berulang & ber-gate**, dibuktikan end-to-end pada namespace
ber-blast-radius terkecil (`PROC`), sehingga slice-slice berikutnya (`FAC`, `FIRMFIN`, … hingga `AMS`)
tinggal mengulang pola yang sama dengan keyakinan zero-regression.

Mengapa ini objective yang benar: nilai sesungguhnya bukan "menghapus 6 baris PROC", tapi
**menetapkan pola + gate** yang membuat strip 632-baris `AMS` nanti menjadi mekanis & aman.

## 3. Success Criteria (terukur)
1. **Nol pembacaan `window.PROC`** tersisa di `migration/src` (verifikasi: `grep -rE "window\.PROC"`
   → hanya muncul di komentar dokumentasi, bukan kode aktif; idealnya 0 termasuk komentar).
2. **Tidak ada penulisan `window.PROC`** — `data_procurement.js` meng-`export const PROC = {…}` murni;
   baris `window.PROC = …` dan `export const PROC = window.PROC` dihapus.
3. **`view_procurement.jsx` + `view_procurement2.jsx`** meng-`import { PROC } from './data_procurement.js'`.
4. **Zero numeric regression:** 59 migration vitest hijau + snapshot canon fingerprint identik +
   live oracle materiality OM 4.260 / PM 3.195 / CTT 213 tak berubah.
5. **Gate hijau:** `npm run lint` (0 error), `npm run typecheck` (0 error), `npm run build` (tanpa
   resolution failure), render Vite :5180 → modul Pengadaan + drawer Vendor360 render **0 console error**.
6. **Resep terdokumentasi** (`.claude/` notes + update BUILD.md/arc memory) agar slice berikut repeatable.

## 4. Scope
- `migration/src/data_procurement.js`: ubah penutup IIFE dari dual-publish → ESM export murni.
  Pertahankan IIFE/komputasi apa adanya (atau ubah ke modul-level const) selama hasilnya identik.
- `migration/src/view_procurement.jsx`: `const P = window.PROC;` → `import { PROC } from …` (`P = PROC`).
- `migration/src/view_procurement2.jsx`: `window.PROC.vendor360(...)` → `PROC.vendor360(...)` via import.
- Pembaruan komentar header kedua view (referensi "window.PROC" → "PROC").
- Dokumentasi: catatan resep + update `BUILD.md` §legacy-track + memory arc.

## 5. Non-Scope (eksplisit dikecualikan)
- **Namespace lain.** `window.BO`/`LEGAL`/`FIRMOPS` yang dibaca *di dalam* `data_procurement.js`
  TETAP dibaca via `window` — mereka bukan bagian slice ini, masih dual-published & dipakai modul lain.
  Ini batas jujur per-namespace.
- **Imperative bus.** `__amsOpen*`, `amsApplyPrefs`, `compliancePct`, `__amsNav`, runtime-bus lain —
  **dipertahankan** (by design; bukan namespace data).
- **TS-widen.** Mengubah `data_procurement.js` → `.ts` ditunda (follow-on; lihat Open Questions).
- **Hapus `globals.d.ts` entry untuk PROC** — boleh dilakukan bila aman, tapi bukan kriteria sukses.
- Tidak ada perubahan perilaku/UI/angka — refactor struktural murni.

## 6. Constraints
- **ESM-only** (W3 Phase 2): edit hanya di `migration/src`; `app/*` + `NeoSuite AMS.html` beku.
- **Boot order** harus dijaga: `data_backoffice`(11) → `data_legal`(12) → `data_firmops`(13) →
  `data_procurement`(30) di `main.jsx`. Karena PROC membaca `window.BO/LEGAL/FIRMOPS` saat load,
  urutan ini WAJIB tetap (sudah benar; jangan pindahkan import).
- **Gate wajib hijau** sebelum commit: lint + typecheck + build + 59 vitest + live render.
- Solo dev, satu sesi cukup (slice sengaja kecil).

## 7. Existing Solutions
- **Precedent internal:** W3 Phase 4 sudah menstrip `window.I` di JSX (`<window.I/>` → import) dan
  membongkar 152 guard `typeof useX==='function'`. Pola "ESM import gantikan window read" sudah terbukti
  di repo ini — slice ini memperluasnya ke namespace **data**, bukan komponen/ikon.
- **Live oracle harness** (`.claude/w3-*`, W4 vitest) sudah ada sebagai gate regression — dipakai ulang,
  tak perlu bikin baru.
- Tidak ada solusi eksternal relevan (ini refactor internal).

## 8. Proposed Approach
**Mengapa `PROC` sebagai slice-1:** terdefinisi di 1 file, dibaca hanya di 2 view + dirinya sendiri,
6 reads, tak ada namespace lain me-reference PROC → blast-radius minimum tapi melatih **seluruh** resep
(definisi data → export ESM → import view → drop dual-publish → gate). Pola yang lulus di sini langsung
dapat diulang untuk `FAC`/`FIRMFIN`/…/`AMS`.

**Resep (the repeatable pattern):**
1. **Data file:** ganti
   ```js
   window.PROC = { …api… };
   })();
   /* [codemod] ESM exports (dual-publish) */
   export const PROC = window.PROC;
   ```
   menjadi export ESM murni. Opsi A (minimal-diff, direkomendasikan): pertahankan IIFE, tangkap hasil:
   ```js
   const PROC = (function () { … return { …api… }; })();
   export { PROC };
   ```
   IIFE tetap membaca `window.BO/LEGAL/FIRMOPS` (non-scope) apa adanya.
2. **Views:** tambah `import { PROC } from './data_procurement.js';`; ganti `window.PROC` → `PROC`.
3. **Gate berurutan:** `lint` → `typecheck` → `build` → `test` → `dev` render + oracle. Bila salah satu
   merah, perbaiki sebelum lanjut.
4. **Verifikasi nol-residu:** `grep -rE "window\.PROC"` → 0 di kode aktif.
5. **Dokumentasikan resep** sebagai template slice berikutnya.

**Alternatif yang ditolak:**
- *TS-widen dulu:* urutan lebih buruk — typing lewat `window.AMS` justru menumbuhkan `globals.d.ts`
  yang nanti dibongkar strip. Strip dulu → import bertipe natural.
- *Strip namespace besar dulu (`AMS`):* risiko 632-baris tanpa resep teruji = ceroboh.
- *Big-bang semua namespace:* melanggar prinsip gate-per-slice; regresi sulit dilokalisasi.

## 9. Risks
| Risiko | Dampak | Mitigasi |
|---|---|---|
| IIFE membaca `window.BO` saat load sebelum BO siap | `PROC` undefined → modul crash | Boot order sudah benar (BO/LEGAL/FIRMOPS < procurement); jadikan Constraint, jangan pindahkan import |
| Drift numerik tersembunyi | Pelanggaran SSOT | 59 vitest + snapshot canon + live oracle materiality = gate wajib |
| `view_procurement2.jsx` akses `window.PROC` di luar import scope | ReferenceError | Import top-of-file; grep nol-residu |
| Komentar header menyesatkan slice berikut | Bingung maintainer | Update komentar "window.PROC" → "PROC" |
| Over-reach (ikut strip BO/LEGAL) | Scope creep, blast-radius melebar | Non-Scope eksplisit; BO/LEGAL tetap `window` |

## 10. Implementation Plan
- **Fase 0 — Baseline & cadangan oracle.** Catat angka baseline (materiality/canon fingerprint) +
  jalankan 59 vitest hijau *sebelum* sentuh kode. (Tanpa commit.)
- **Fase 1 — Strip PROC.** Edit `data_procurement.js` (export murni) + 2 view (import). Jalankan
  lint/typecheck/build. Commit hanya bila keempat gate hijau.
- **Fase 2 — Verifikasi runtime.** `dev:all`/`dev` → render modul Pengadaan + drawer Vendor360,
  cek 0 console error, oracle materiality identik, grep nol-residu. Commit verifikasi/notes.
- **Fase 3 — Dokumentasi resep.** Update `BUILD.md` (§legacy-track recipe) + memory arc
  (`neosuite-ams-arc` / memory baru `neosuite-ams-window-strip`). Tandai slice-1 SELESAI + daftar
  urutan slice berikutnya (FAC → FIRMFIN → IMPORT → FSGEN → BO → LEGAL → I → AMS_FORENSIC → AMS_CANON
  → AMS, kasar by-blast-radius).

Satu commit per fase (atau gabung 1–2 bila kecil). Tiap commit ber-gate hijau.

## 11. Open Questions
1. **Konversi `data_procurement.js` → `.ts` di slice ini?** Rekomendasi: **tidak** — pisahkan
   strip (struktural) dari widen-TS (tipe) agar diff bersih & gate jelas. TS-widen jadi follow-on track.
2. **Hapus entry PROC dari `globals.d.ts`?** Bila tak ada lagi `window.PROC`, entry boleh dihapus.
   Rekomendasi: hapus bila aman (typecheck tetap 0), tapi bukan blocker sukses.
3. **Cakupan slice berikutnya disetujui di muka, atau per-slice sign-off?** Rekomendasi: per-slice
   sign-off untuk namespace besar (`BO`/`LEGAL`/`AMS`); namespace kecil berikut (`FAC`/`FIRMFIN`/
   `IMPORT`) boleh batch bila slice-1 mulus.

---
**Sign-off:** balas **"Proceed."** untuk memulai Fase 0–1. Saya berhenti di sini sampai ada sign-off.
