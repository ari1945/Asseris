---
name: asseris-sc24a-satu-register-skp
description: "SC-24a ditutup 2026-08-19 — register SKP kedua (PPPK_PPL) dicabut; PPPK_PPL jadi populasi saja, realisasi lewat LICENSING.pplOf"
metadata: 
  node_type: memory
  type: project
  originSessionId: 3472c377-9e79-4ded-8f5b-f82b910e6a2d
  modified: 2026-08-19T13:36:22.854Z
---

# SC-24a — satu register SKP (branch `feat/sdm-sc24a-satu-register-skp`, commit `091325f`)

Utang terakhir arc SDM ([[asseris-sdm-kepatuhan-arc]]) ditutup. Ari menjawab
"rekomendasi anda" ⇒ **`CPE_LOG` otoritatif, `PPPK_PPL` diturunkan** — yang memang sudah
tertulis di PRD sebagai SC-24a, jadi ini menutup PRD yang SUDAH disetujui, bukan scope baru.

## Cacatnya

Dua register SKP untuk satu firma, satu tahun:

| | CPE_LOG (data_part1, `empId`) | PPPK_PPL (data_part4, NAMA) |
|---|---|---|
| Hartono EMP-001 | 24 | 32 |
| Rudi EMP-002 | 18 | 30 |
| Sari EMP-003 | 31 | 28 |
| Anindya EMP-007 | 28 | 32 |
| Bayu EMP-008 | **0 — nol catatan** | 24 |

Sari membuktikan register kedua bukan sekadar "lebih optimistis": ia bisa MENGECILKAN juga.
Bayu membuktikan yang terburuk — angka untuk orang yang tak punya satu pun catatan.

## Bentuk perbaikannya (pola yang dapat diulang)

Bukan mendamaikan dua register — **mencabut yang kedua**:
- `PPPK_PPL` → **populasi saja** (`emp`); `ap`/`grade` diturunkan dari roster `STAFF`.
- Konsumen (`view_pppk`, `view_isqm_parts`) membaca `LICENSING.pplOf(emp)` → `canon_ppl`.
  **Penting: lewat `pplOf`, bukan `CPE_LOG` langsung** — `pplOf` juga menyertakan entri user
  terpersist (`cpeExtra`) & kredit pelatihan, sehingga kedua modul tetap sama SAAT RUNTIME,
  bukan hanya di seed.
- Nol-karena-tak-ada-catatan dinyatakan sebabnya + tautan ke Tracker. **Nol yang sama menuntut
  sebab yang berbeda.**

⚠ `data_part4` **tak boleh** mengimpor `data_backoffice` (siklus: data_part4 → data_backoffice
→ data → data_part4). Karena itu populasi AP tetap literal `PPPK_PPL_POP`, dan
kecocokannya dengan `BO.AP_LICENSES` **ditegakkan uji**, bukan impor.

## Gerbang

`read()` gerbang cakupan **membuang komentar**, jadi `expect(read('data_part4.ts')).not.toContain('unstructured')`
menguji KODE (komentar boleh menjelaskan sejarahnya). Falsifikasi dijalankan: **6 dari 7 uji baru
GAGAL** atas `data_part4` versi master.

Verifikasi hidup tanpa login (login butuh sandi — jangan diketik):
`import('/src/data.ts')` + `import('/src/data_licensing.ts')` di `javascript_tool`, lalu
`LICENSING.pplOf(r.emp).status.countedTotal` per baris `AMS.PPPK_PPL`. Terbukti 24/18/31/28/0.

Terkait: [[asseris-sdm-kepatuhan-arc]] · [[asseris-repo-hygiene-2026-08-19]] ·
[[asseris-checkpoint-2026-08-16]]
