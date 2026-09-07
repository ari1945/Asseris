---
name: asseris-pr8-toolkit-implementasi
description: "PR-8 arc SMM sedang dibangun — PR-8a-1 (peta Toolkit) SELESAI di #211 hijau; 8a-2 & 8b BELUM"
metadata: 
  node_type: memory
  type: project
  originSessionId: bcd1e2f1-feeb-4536-beea-6f13b5cb9ec0
  modified: 2026-08-13T22:41:03.924Z
---

**PR-8 dimulai 2026-08-13** setelah "Proceed." Ari atas `docs/prd-smm-toolkit-map.md`.
Dipecah TIGA, bukan dua, sesuai peringatan PRD.

| Bagian | Isi | Status |
|---|---|---|
| **8a-1** | Peta 41 dokumen Toolkit → modul | **MERGED** (#211, master `02cdc71`) |
| **8b** | Pasang mesin ¶57–60 + cabut misatribusi ¶60 | **MERGED** (#213, master `6c3cbfc`) |
| **8a-2** | Risiko mutu ilustratif Matriks (Q-2), dirumuskan ulang | **BELUM** |

Uji 1583 → 1609 (8a-1) → **1631** (8b). Ratchet `:any` tidak bergerak.

## 8b — yang perlu diingat

`canon_smm_doc_evidence.ts` menurunkan keadaan tiap elemen ¶58 dari artefak, dengan
**TIGA keadaan**: `evidenced` · `missing` · `not-automatable`. Yang ketiga dipakai ¶58(d)(iv)
(komunikasi pemantauan) karena tak ada artefaknya — **JANGAN pernah menggantinya dengan toggle
manual**, itu mengubah ¶57(c) "memberikan bukti" jadi pernyataan tentang bukti.

**Misatribusi ¶60 ternyata di EMPAT situs, bukan tiga seperti dicatat PRD** — `view_platform3.tsx`
terlewat. Kini dijaga `smm_retention_attribution.test.ts` yang memindai seluruh `migration/src`.

## Yang sudah ada (8a-1) — jangan bangun ulang

`canon_smm_toolkit.ts`: `TOOLKIT_DOCS` (41, seksi 3·2·2·3·8·6·9·1·7) · `TOOLKIT_BY_OBJECTIVE`
(27 tujuan, id `QO-28a` dst) · `TOOLKIT_DANGLING_REFS` · `TOOLKIT_OUT_OF_SCOPE` ·
`toolkitHomes()` · `toolkitDocsFor()` · `danglingDocsFor()` · `objectivesForDoc()` ·
`toolkitObjectiveCoverage()`.
`view_isqm_toolkit.tsx` = tab **"Dokumentasi SMM"** di `soqm` (id tab `toolkit`).
Chip dokumen sudah terpasang di panel tujuan mutu (`view_isqm_deep.tsx`).

**Status rumah BERTINGKAT TIGA** — `mapped` · `partial` · `none`. **KOREKSI atas PRD:**
PRD menyebut 5.7/5.8/7.8 `no-home` berdasar grep kata kunci; sesungguhnya ketiganya
`partial` — modulnya ada (`continuance`, `procurement`), ARTEFAKNYA yang tidak ada.

**TEMUAN: Matriks merujuk "8.2 Penilaian budaya - mutu" (¶30(b), ¶33(a), ¶33(c)) padahal
Toolkit V3 seksi 8 berhenti di 8.1** — rujukan menggantung pada materi IAPI sendiri.

## Cara mengekstrak ulang dari PDF (bila perlu)

PDF di `C:\Users\ecovi\Downloads\`. `pdftotext -layout` lalu skrip Python yang melacak
penanda `(a)`–`(h)` per komponen dan mengumpulkan pola `\b([0-9]\.[0-9]+)\s+[A-Z][a-z]`.
Peta komponen→paragraf: 1→28, 2→29, 3→30, 4→31, 5→32, 6→33. Hasilnya TEPAT 27 blok.

## ⚠ SESI LAIN AKTIF DI WORKING TREE YANG SAMA (2026-08-14)

Working tree utama dipegang sesi lain pada branch `fix/p0-materiality-mgmtletter` dengan
pekerjaan BELUM di-commit (`docs/PRD-KATALOG-EVALUASI-158-MODUL.md` + 2 berkas PRD E-9
untracked). **JANGAN `git checkout` di working tree utama** — akan mencabut HEAD dari bawah mereka.

Solusi yang dipakai & terbukti: `git worktree add <path> origin/master`, lalu **junction**
`node_modules` (root, migration, server) ke pohon utama via `New-Item -ItemType Junction`.
**⚠ SAAT MEMBERSIHKAN: lepas junction LEBIH DULU dengan `cmd /c rmdir "<link>"`** (menghapus
tautannya saja). `git worktree remove --force` atau `rm -rf` yang dijalankan selagi junction
masih terpasang berisiko ikut menghapus `node_modules` POHON UTAMA. Hitung entri sebelum &
sesudah sebagai pengaman (370 / 125 / 84 pada repo ini).
Vite bisa dijalankan terpisah (`npx vite --port 5186 --strictPort`) dan tetap mem-proxy `/trpc`
ke :5181.

**GOTCHA BESAR: uji `server/` TIDAK VALID dari worktree ber-junction** — 34 uji gagal
(`expected 3 to be 1`, versi StateDoc menumpuk) **BAHKAN TANPA perubahan apa pun**; dibuktikan
dengan `git stash`. Jangan buang waktu men-debug; jalankan gerbang frontend saja lalu andalkan
CI atas checkout bersih. CI #213 memang lolos 9/9 termasuk gerbang server.

`dev.db` utama TIDAK tersentuh oleh verify dari worktree (uji server pakai `prisma/test.db`
lokal). Login 500 yang dialami Ari berasal dari server tRPC sesi lain yang sedang sekarat
(`auth.me` 200 tapi `auth.login` 500), lalu prosesnya mati sendiri — bukan akibat perubahan ini.

## GOTCHA

- **`typecheck:test` menolak `.sort()` pada `readonly string[]`** — pakai `[...arr].sort()`.
  Uji bisa HIJAU sementara gerbang ini merah; `npm run verify` menangkapnya, `vitest` tidak.
- `I.info` TIDAK ADA di `icons.tsx` (ada `book`, `layers`, `alert`, `flag`). `React.ReactNode`
  tak tersedia sebagai tipe — pakai tipe konkret. `useState` yang di-destructure dari React
  tak menerima argumen tipe — pakai `useX(null as T | null)`.
- **`useSOQM` ternyata `React.useState` polos**, bukan persist. Setiap deep-link `?tab=` ke
  `soqm` selalu mendarat di Register. Sudah diperbaiki jadi `useInitialTab('soqm','register')`
  di #211 — sama seperti `governance` di #208.

Lihat [[asseris-pr8-toolkit-map-prd]] (PRD & keputusan Q-1/Q-2) ·
[[asseris-checkpoint-2026-08-13-sore]].
