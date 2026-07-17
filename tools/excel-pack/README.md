# Asseris Engagement Pack — generator Excel

Workbook kertas kerja audit satu-perikatan (36 sheet, Bahasa Indonesia, tanpa makro) —
turunan metodologi workspace **Perikatan** Asseris. PRD: `docs/PRD-excel-engagement-pack.md`.

## Regenerasi

```
cd tools/excel-pack
python generate.py            # → dist/Asseris Engagement Pack.xlsx
.\recalc-verify.ps1           # rekalkulasi via Excel COM + scan error + nilai kunci
```

Prasyarat: Python 3.10+ dengan `openpyxl`; Microsoft Excel (untuk verifikasi COM).
`recalc-verify.ps1` WAJIB hijau (TOTAL_ERRORS: 0) sebelum file didistribusikan.

## Arsitektur

- `xhelp.py` — style/proteksi/format bersama (input biru = unlocked; asumsi kuning; formula terkunci).
- `gen_ref_setup.py` — PETUNJUK, SETUP, REF (list dropdown, tabel RF MUS, matriks RoMM, teks opini)
  + daftar kategori Mapping LK (`MAP_*`) + helper `sum_cats()`.
- `gen_engagement.py` / `gen_planning.py` / `gen_execution.py` / `gen_specifics.py` / `gen_final.py`
  — builder per grup sheet (meniru grup workspace Perikatan Asseris).
- `generate.py` — perakit + **named ranges** (`MAT_OM/MAT_PM/MAT_CTT`, `SAD_UNCORR`, `TIM`, list REF).

## Prinsip SSOT (meniru AMS_CANON)

Semua angka hilir ditarik dari `20_WTB` + parameter `11_Materialitas` via formula/named ranges.
AJE tidak diketik di WTB — register `21_AJE` status *Posted* mengalir via SUMIFS.
Default kanon dipertahankan: OM = benchmark × 5% (PBT), PM = 75% × OM, CTT = 5% × OM, TM sampling = PM.

## Gotcha yang sudah dibayar

- **JANGAN pakai `SUMPRODUCT(ISNUMBER(MATCH(...))*N(range))`** — `N()` tidak menyebar atas range;
  hasil salah senyap (bukan error). Pakai `sum_cats()` → `SUM(SUMIFS(col, map, {"kat1","kat2",...}))`.
- Nama sheet berawalan angka wajib dikutip dalam formula: `'20_WTB'!A1`.
- Sel total jangan ditaruh di baris yang kemudian ditimpa `headrow()`.
- Verifikasi dengan LibreOffice tidak tersedia di mesin ini — pakai Excel COM (`recalc-verify.ps1`).
