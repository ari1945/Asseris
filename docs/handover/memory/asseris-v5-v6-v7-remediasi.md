---
name: asseris-v5-v6-v7-remediasi
description: "V-5/V-6/V-7 tinjauan visual DIPERBAIKI 2026-08-13 — verify hijau, BELUM di-commit; V-1..V-4 masih terbuka"
metadata: 
  node_type: memory
  type: project
  originSessionId: bcd1e2f1-feeb-4536-beea-6f13b5cb9ec0
  modified: 2026-08-13T08:36:38.004Z
---

**Perbaikan V-5, V-6, V-7 selesai 2026-08-13 — [PR #208](https://github.com/ari1945/Asseris/pull/208)
TERBUKA, CI 9/9 HIJAU** (branch `fix/smm-attest-network-eqr-a11y`, commit `68c439f`).
`npm run verify` PASSED (frontend 1552→**1571** uji · server 431 · ratchet `:any` TURUN 7).
Keputusan Ari: perbaikan cacat langsung **tanpa PRD** (menyimpang sadar dari aturan PRD-dulu
CLAUDE.md), dan cacat jaringan **mengikat penuh** aturan ¶54.

PR kedua: **[#209](https://github.com/ari1945/Asseris/pull/209)** PRD PR-8 (docs-only, CI 6/6 —
e2e & deploy-smoke ter-skip path filter). Keduanya bercabang langsung dari `master` `e57694f`,
TIDAK bertumpuk, tidak ada berkas beririsan.

**Berkas baru:** `migration/src/canon_smm_deficiencies.ts` (+ `.test.ts`, 15 uji).
**Disentuh:** `view_governance.tsx` · `view_isqm_deep.tsx` · `view_eqr.tsx` ·
`smm_network_seed.test.ts` (+4 tripwire).

### V-5 — Governance berhenti menampilkan atestasi fiktif
`view_governance.tsx` dulu membaca `QM_EVAL` mentah (`by`/`approvedBy`/`date: '2026-03-05'`)
dan badge `<Badge kind="green">Keyakinan Memadai</Badge>` **di-hardcode tanpa syarat**. Kini:
nama HANYA dari `attestChainLinks(useFirmAttest(...))`, kesimpulan dari `evaluateSmm`,
`openDefs` turunan (bukan `Σ QM_COMPONENTS.defs`). **Terverifikasi hidup**: "Disusun belum
ditandatangani · Disetujui belum ditandatangani · MENUNGGU ATESTASI · Dgn Pengecualian ¶54(B)
· 2 Defisiensi Terbuka". Penandatanganan tetap HANYA di SOQM (satu tempat menulis).
Bonus: `useInitialTab('governance')` — deep-link `?tab=network` dulu tak pernah mendarat.

### V-6 — defisiensi jaringan ¶52 kini mengikat ¶54
`collectSmmDeficiencies({risks, network})` menyatukan pemetaan untuk KEDUA layar (dulu
`view_isqm_deep` memetakan di dalam JSX-nya sendiri, `view_governance` tak memetakan apa pun).
**⚠ KEBIJAKAN YANG SENGAJA TAJAM — beri tahu Ari bila digugat:** `smmDeficiencyFromNetwork`
default `locus='design'` (ketentuan jaringan yang dipakai ADALAH respons yang KAP rancang,
¶49(a)) dan `compensatingResponse` diturunkan dari ¶49(b) `supplemented`. Akibatnya SETIAP
defisiensi jaringan pada item non-`supplemented` otomatis menembus lantai A163 ⇒ minimal
memaksa ¶54(b), betapapun remeh substansinya. KAP bisa menimpanya dengan mencatat
`locus`/`compensatingResponse` eksplisit. Di seed tak menggigit (QR-02 sudah memaksa ¶54(b)).
`remediated` dari ¶52(b) `remedialAction`; `effectCorrected` gagal-tertutup `false`.

### V-7 — kontrol native di EQR
Checklist penggerak gerbang opini: `<div onClick>` → `<Check>` (`ui.tsx`, input checkbox asli).
Daftar EQR: `<div onClick>` → `<button aria-current>`. **Terverifikasi hidup**: 5 checkbox
native, 3 tercentang, semua fokusabel, terbungkus `<label>`.

### MASIH TERBUKA (V-1..V-4) — lihat [[asseris-tinjauan-visual-smm-2026-08-13]]
V-3 paling bernilai: `QM_COMPONENTS.risks`/`.score` masih integer dekoratif dan
`mapName` (`view_isqm_parts.tsx:103`) masih dihitung tanpa pernah dipanggil.

### GOTCHA sesi ini
- **`npm run verify` dan `dev-all` BENTROK** — menjalankan verify di latar sementara dev server
  hidup MEMBUNUH dev server (ERR_CONNECTION_REFUSED + 500 pada modul lazy). Hentikan preview
  dulu, jalankan verify, baru hidupkan lagi. Restart preview MENGHAPUS sesi login.
- **Klik `computer` sering tak terdaftar** karena Browser pane tak ditampilkan (hit-testing
  meleset; klik pertama bahkan mengenai tombol ciutkan sidebar). Deep-link hash `?tab=` +
  `javascript_tool` untuk membaca DOM jauh lebih andal untuk verifikasi.
- `npm run lint` di ROOT hanya melint `server e2e tools`; lint frontend ada di `migration/`.
  Melint SEBAGIAN berkas memicu pesan palsu "suppressions left that do not occur anymore".

Lihat juga [[asseris-pr8-toolkit-map-prd]] (PR-8 masih Draft, menunggu "Proceed.").
