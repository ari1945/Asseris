---
name: asseris-opening-prosedur-fabrikasi
description: "Saldo Awal SA 510 (O1–O4) — kertas kerja yang menyatakan prosedur telah dilakukan; premis prompt \"fabrikasinya berhenti di layar\" TERBUKTI SALAH lewat predecessorName"
metadata: 
  node_type: memory
  type: project
  originSessionId: 46194385-8fb2-43ae-a0f3-d86c76cfa9fb
  modified: 2026-08-23T02:45:00.976Z
---

Arc `opening` (SA 510) dari [`docs/prompts-perbaikan/75-opening.md`](../../../../D:/Claude AI/06-BUSINESS-DEVELOPMENT/Audit System/docs/prompts-perbaikan/75-opening.md), dikerjakan 2026-08-23 di worktree utama (branch `fix/timebudget-engagement-isolation`, **belum di-commit**).

## Premis prompt yang SALAH (koreksi terpenting)

Prompt menulis: *"Satu hal yang meringankan dan WAJIB kamu pastikan tetap begitu: tabel-tabel itu **tidak ikut ke dalam memo tersegel** … Fabrikasinya berhenti di layar."* — **untuk `OB_SPECIFIC`/`OB_POLICY` benar, tetapi tidak untuk seluruh modul.** `buildMemoInput()` mengirim `predecessorName: predecessor.name`, dan `predecessor.name` adalah literal `'KAP Sutrisno, Bambang & Rekan'`. `openingMemoMeta` mencetaknya sebagai baris "Auditor Pendahulu" di **PDF/XLSX TERSEGEL** — cukup pilih segmen "Perikatan Awal" lalu ekspor. Satu KAP nyata dinamai sebagai auditor pendahulu klien mana pun. Prompt juga menulis *"tidak ada literal nama firma di berkas ini"*; yang benar: tak ada literal nama firma SENDIRI (itu dari `AMS.FIRM`), tapi ada literal nama firma LAIN.

Pelajaran umum: bila prompt menyebut sebuah batas sebagai "sudah aman", **telusuri seluruh pemanggil builder-nya**, bukan hanya bentuk `interface`-nya. `OpeningMemoInput` memang bersih; call site-nya tidak.

## Cacat lain yang tak ada di prompt tapi satu KELAS dengan O1

- Header "Opini TA Lalu (2024): **Wajar Tanpa Modifikasian**" (Badge hijau) = literal. `PRIOR_YEAR` (data_part1, sudah dipersist modul Keberlanjutan lewat `useAmsPersist('priorYear', PRIOR_YEAR)`) mencatat **C-031 = WDP** dan **C-040 = WTP-EoM** — 2 dari 7 klien seed. Modul menampilkan hijau "WTP" pada perikatan yang opininya termodifikasi, yaitu justru saat SA 510 ¶9 menuntut perhatian ekstra. Setelah perbaikan, ENG-2025-031 menampilkan `WDP` + peringatan ¶9 + **salah saji tak dikoreksi Rp 1.800 jt** (`py.uncorrected`) + temuan TA-1 — semua sudah ada di data, tak pernah dibaca.
- Blok "Sign-off" berisi 3 nama personel + tanggal, 2 di antaranya `done: true` — padahal **`opening` TIDAK PERNAH terdaftar di `WP_MODULE_MAP`**: modul ini tak punya rantai sign-off sama sekali. Diganti `<WpPanel moduleId="opening">`.
- `OBState.conclusion` DIKIRIM ke memo tersegel tetapi **tak ada satu pun kontrol yang bisa mengisinya** → memo selalu jatuh ke kalimat bawaan `buildOpeningBlocks`. Kabel putus yang tak terlihat karena paragraf kesimpulan di layar adalah teks tetap. Kini sumbernya `wpState['opening'].conclusion` (satu store, ada disposisi/pelaku/tanggal).
- `OB_SOFP_GROUPS` = salinan `prior_year.SOFP_GROUPS` (dua daftar, satu lingkup).

## O4 — `OB_TRANSITION` tidak punya sumber di aplikasi

`{'1-2300': 13.100 jt, '2-1500': −3.050 jt, '2-2200': −10.050 jt}` MENIMPA kolom "Saldo Awal TA Kini". Tak cocok dengan apa pun:
- WTB `ly` ketiga akun = **0**; `unadj` = 12.640 / −3.180 / −9.620.
- Mesin sewa `leasePortfolio()` (canon_base): PV LS-01 (satu-satunya sewa mulai 01-01-2025) ≈ **8,57 M**, total PV 3 sewa ≈ 14,27 M. Tak satu pun = 13,1 M.

Dicabut. Baris transisi kini menampilkan saldo awal apa adanya (0) dengan badge **"Transisi? belum dimuat"** — menandai pertanyaan, bukan mengisi jawaban. Usulan asal yang benar: skedul transisi PSAK 73 dari auditor (modul `psak73`), bukan konstanta.

## Gotcha teknis

- **`eslint` keluar EXIT 2 tanpa mencetak satu pun error** ketika hitungan `:any` sebuah berkas TURUN (suppression jadi basi). Pesannya hanya *"There are suppressions left that do not occur anymore"*. `npm run lint:any-baseline` memperbaikinya TAPI ikut mem-prune entri sesi lain — di worktree bersama, sunting **hanya entri sendiri** di `eslint-suppressions.json` (view_opening: 9 → 6).
- **Mendaftarkan modul di `WP_MODULE_MAP` memerahkan `cockpit_progress.test.ts`** — ada gerbang CAKUPAN `PHASE_OF_MODULE`. Wajib menambah fase juga (`opening: 'Eksekusi'`).
- Ikon: **tidak ada** `I.info` maupun `I.chevronRight` (pakai `I.book` / `I.arrowRight`). Daftar kunci: `grep -o "^  [a-zA-Z]*:" icons.tsx`.
- Gerbang regex tanggal (`\d{1,2}\s+(Jan|…)\s+\d{4}`) menangkap tanggal di STRING UI juga, bukan hanya di field bukti — itu yang mengungkap literal "transisi 1 Jan 2025" di daftar fokus strategi.
- Verifikasi hidup butuh backend: `preview_start` **dua** konfigurasi (`vite-5186` + `server`); login lewat `javascript_tool` dengan native value setter (`Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set`) — `el.value = x` tak memicu React. Akun dev di BUILD.md §W7.
- Pesan error konsol bisa **BASI dari HMR di tengah edit** (perhatikan `?t=<timestamp>` pada stack) — reload lalu cek ulang sebelum mempercayainya.

## Keadaan gerbang

`npm run verify` MERAH di worktree ini, **seluruhnya milik arc lain yang belum selesai**: `mytasks_derive.*` (typecheck), `view_mytasks_parts.tsx` (61 error lint karena sesi lain menurunkan suppression-nya), `a11y_anchor_href` (menuduh `view_home.tsx:209`), `home_composition`, `wip_writedown_authority`, `server/src/__tests__/mytasks_scope.test.ts` (`userScopedKeys` belum ada di `persist_scope.ts`). Berkas arc ini: lint 0 · typecheck 0 · build hijau · `opening_conventions.test.ts` 18/18 (15 merah sebelum, 3 lahir hijau).

Terkait: [[asseris-wp-signoff-ditolak-senyap]] · [[asseris-klok-ssot-jam-mesin]] · [[asseris-sesi-paralel-satu-worktree]] · [[asseris-lampiran-scope-tulis-ekspor-identitas]]
