# PRD — Persistensi Kesimpulan Auditor di PSAK Suite (P1)

> Status: **DRAFT — menunggu sign-off ("Proceed.")**. Dokumen ini *merancang*, belum *membangun*.
> Stream: lanjutan dari [[neosuite-ams-p2-wp-signoff]] (P2 selesai, commit `4576ec3`).
> Acuan gap: `Evaluasi Fitur NeoSuite AMS - Gap & Pendalaman.md` §4 (P1, leverage #1).

---

## 1. Problem
Modul PSAK suite (16/19/22/24/46/48/57/58/65/66/68/71/73/…) menarik angka **benar** dari
`AMS_CANON` dan bahkan merender blok **"Kesimpulan Audit" terkomputasi** (mis. `view_psak46.jsx`:
verdict `supp`/`score` dari canon). **Tetapi penilaian auditor sendiri** — teks kesimpulan,
disposisi (memadai / perlu tindak lanjut / eskalasi), dasar pertimbangan profesional, catatan
tindak lanjut — **tidak tertangkap & tidak tersimpan**. Hilang saat reload.

Setelah P2, modul-modul ini sudah *auditable* (sign-off + bukti via `wpState`), tapi belum ada
tempat merekam **mengapa** auditor menyimpulkan demikian. Ini gap dokumentasi **SA 230** (dasar
kesimpulan & jejak audit) yang berulang muncul sebagai prosedur wajib di modul-modul itu sendiri
(mis. `view_psak46.jsx` s8/d8: "Dokumentasikan dasar kesimpulan").

## 2. Objective
Beri setiap WP canon-heavy lapisan **"Kesimpulan Auditor" yang dapat diedit & tersimpan**,
sehingga WP menjadi *documentation-complete* (SA 230) — **memakai ulang SSOT P2** (`wpState`/`setWp`),
bukan store baru. Kesimpulan auditor (penilaian) berdampingan dengan verdict otomatis (canon),
bukan menggantikannya.

## 3. Success Criteria
- Komponen drop-in bersama (seperti `WpPanel` P2) merender kesimpulan auditor yang dapat diedit
  + disposisi pada tiap modul terpetakan.
- Persist ke `wpState[ref].conclusion = { text, disposition, by, at }` (SSOT) — bertahan reload.
- Disposisi terstruktur + rasional bebas; penanda tangan (`by`) & tanggal (`at`) terekam.
- **Tie ke P2:** sign-off reviewer memberi peringatan (soft gate) bila kesimpulan kosong.
- Rekap kelengkapan (cockpit) menambah dimensi "WP berkesimpulan" (bar ke-3, opsional).
- Gate teknis: `lint` / `typecheck` / `build` hijau; **canon tak tersentuh (49 test)**; 0 console
  error; diverifikasi di ≥2 modul live (Vite :5180).

## 4. Scope
- ~16–19 modul PSAK + kandidat canon-heavy §6: `sa230` · `psak71` · `sad` · `psak25` · `sa501` ·
  `calc` · `segmen` · `lease` · `assoc` · `spr2410` (batch pertama, efek paling terasa).
- Reuse `WP_MODULE_MAP` (38 ref) sebagai registry penyebaran — minim edit per-view.

## 5. Non-Scope
- W6 / backend nyata (lapisan data tetap `localStorage` — keputusan terkunci di P2).
- 78 modul ephemeral non-WP (itu **P3**).
- Saran kesimpulan oleh AI (itu **P4**).
- Gate fase lifecycle keras (itu **P5**).
- Modul yang sudah Tier-4 (`fsgen`/`isak35`/`opinion`/`clientportal`/`dms`/`settings`).

## 6. Constraints
- `localStorage` (bukan W6) · ESM-only edit `migration/src/*` · aturan emas anti-tabrakan
  (alias hook unik, ekspor `window`, `app.jsx` terakhir) · figur dari `AMS_CANON` (SSOT) ·
  **PRD dulu sebelum implementasi**.

## 7. Existing Solutions / yang dipakai ulang
- `wpState`/`setWp` (AuditProvider) + `WpPanel`/`WpSubBarControl`/`useWpSignoff` di
  `wp_signoff.jsx` (dibangun P2) · `deriveWpStatus` · `useAmsPersist`.
- Blok "Kesimpulan Audit" terkomputasi sudah ada di banyak modul → P1 **menambah** lapisan
  penilaian auditor di sampingnya, tidak mengganti verdict canon.

## 8. Proposed Approach
1. **Perluas bentuk `wpState[ref]`** dengan `conclusion: { text, disposition, by, at }`.
2. **Komponen bersama baru** `WpConclusion({ moduleId })` di `wp_signoff.jsx`: textarea rasional
   + select disposisi + simpan→`setWp(ref,{conclusion})`. Tampilkan penulis & tanggal.
3. **Penyebaran via SubBar** — *lipat ke dalam popover "Kertas Kerja" yang sudah ada* (hindari chip
   ke-3 yang menyesakkan bilah). Registry-driven `WP_MODULE_MAP` → satu edit shell.
4. **Soft gate** (opsional, tie ke P2): `useWpSignoff` saat reviewer sign beri peringatan bila
   `conclusion.text` kosong (tidak memblokir keras — konsisten lock LUNAK).
5. **Rekap** — tambah bar ke-3 "berkesimpulan" di `WpCompletenessRecap`.

## 9. Risks
- **Scope sprawl** (16–19 modul) → mitigasi: batch §6 dulu (10 modul), verifikasi, baru sisanya.
- **Dua sumber kebenaran** (verdict canon vs kesimpulan manual) → mitigasi: label tegas
  "Penilaian Auditor" vs "Verdict Otomatis"; kesimpulan manual TIDAK menimpa angka canon.
- **SubBar sesak** (sudah ada chip "Kertas Kerja" + "Bukti") → mitigasi: lipat kesimpulan ke
  popover "Kertas Kerja", bukan chip baru.

## 10. Implementation Plan (bertahap, pola P2)
- **Fase 0:** perluas bentuk `wpState` + komponen `WpConclusion` + lipat ke popover "Kertas Kerja".
- **Fase 1:** rekap bar ke-3 + soft gate peringatan saat reviewer sign.
- **Fase 2:** sebar & verifikasi batch §6 canon-heavy (10 modul).
- **Fase 3:** sisa PSAK suite.
- Tiap fase: `lint`/`typecheck`/`build` + verifikasi browser + commit + update memory.

## 11. Open Questions (perlu keputusan Anda sebelum "Proceed.")
1. **Taksonomi disposisi** — daftar tetap (mis. *Memadai* / *Perlu tindak lanjut* / *Eskalasi ke
   partner*) atau bebas? *(rekomendasi: daftar tetap + catatan bebas)*
2. **Kekuatan gate** — peringatan lunak saat reviewer sign tanpa kesimpulan, atau blokir keras?
   *(rekomendasi: peringatan lunak, konsisten dgn lock LUNAK P2)*
3. **Penempatan UI** — lipat ke popover "Kertas Kerja" yang ada, atau chip SubBar tersendiri?
   *(rekomendasi: lipat — hindari chip ke-3)*
4. **Konfirmasi** `localStorage` (bukan W6) tetap untuk fase ini? *(diasumsikan ya, warisan P2)*
