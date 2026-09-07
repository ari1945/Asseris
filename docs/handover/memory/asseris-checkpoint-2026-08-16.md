---
name: asseris-checkpoint-2026-08-16
description: CHECKPOINT JEDA 2026-08-16 — arc SDM & Kepatuhan merged; instruksi lengkap untuk melanjutkan di sesi baru
metadata: 
  node_type: memory
  type: project
  originSessionId: 036f053a-2ad5-42e8-801c-00152d40cff3
  modified: 2026-08-16T05:18:22.566Z
---

# CHECKPOINT JEDA — 2026-08-16

Sesi dijeda atas permintaan Ari. Arc **SDM & Kepatuhan SELESAI & MERGED**.
Berkas ini adalah instruksi lanjutan; detail arc ada di [[asseris-sdm-kepatuhan-arc]].

## Keadaan repo saat jeda

| | |
|---|---|
| `origin/master` | **`46eb651`** — "feat(sdm): arc SDM & Kepatuhan … (#256)" |
| Branch lokal (dir utama) | `sdm-arc-merged`, tepat di `origin/master` |
| Belum di-commit | `.claude/launch.json` (M) · `PERSONAS.md` (??) — **milik Ari, JANGAN di-commit** |
| `npm run verify` | **hijau penuh** di master |
| PR saya yang terbuka | **NOL** |

⚠ **`master` dipegang worktree lain** (`.claude/worktrees/sleepy-curran-2acd84`, masih di `737f875`).
Karena itu `gh pr merge --delete-branch` GAGAL di langkah lokal walau merge di GitHub SUKSES.
**Jangan `git checkout master` di direktori utama** — pakai `git checkout -B <nama> origin/master`.

PR orang/sesi lain yang masih terbuka (JANGAN disentuh tanpa diminta):
**#255** Engagement Cockpit · **#253** token CSS · **#214–#218** dependabot.

---

## Yang TERSISA dari arc ini — tiga utang, semuanya sudah dipaku uji/penanda

Urut dari yang paling mudah ditutup:

### 1. `TER_TABLE.verified = false` (menunggu DATA dari Ari)
- Berkas: `migration/src/canon_pph21.ts` → `TER_TABLE`.
- Lapisan tarif **direkonstruksi** agar mereproduksi 10 tarif yang sudah dipakai aplikasi,
  **BUKAN** disalin dari Lampiran PMK 168/PMK.01/2023.
- **Keputusan Ari 2026-08-16: "biarkan, yang penting dapat diedit."** Jadi ini BUKAN pekerjaan
  yang harus dikejar — hanya siap bila Ari menyerahkan Lampirannya.
- Cara menutup: ganti isi `A`/`B`/`C` dengan Lampiran resmi → setel `verified: true` →
  jalankan `npx vitest run src/pph21_ter.test.ts`. Uji invarian (kategori B tak boleh melebihi A
  pada bruto sama) akan menangkap salah-ketik; ia sudah pernah menemukan dua kesalahan saya.
- Selama `verified:false`, modul Payroll menampilkan spanduk permanen. Itu memang disengaja.

### 2. Kalender hari libur 2026 (menunggu DATA dari Ari)
- Berkas: `migration/src/data_part2.ts` → `LEAVE_HOLIDAYS`.
- Tanggal berbasis **hisab** (Idulfitri, Nyepi, Iduladha, Waisak, Isra Mikraj, dst.) dihitung,
  belum dicocokkan dengan **SKB 3 Menteri**. Field `penetapan: 'tetap' | 'hisab'` menandainya.
- **Cuti bersama SENGAJA kosong** — diumumkan tahunan, tak dapat diturunkan. Jangan dikarang.
- Cara menutup: cocokkan tanggal `hisab` + tambahkan cuti bersama → naikkan `confirmedThroughYear`.
- `holidayCoverage()` sudah menolak berpura-pura untuk tahun yang belum diisi.

### 3. SC-24a — DUA REGISTER SKP (pekerjaan nyata, butuh keputusan Ari)
- `CPE_LOG` (`data_part1.ts`) per-kegiatan, **berkunci `empId`** → CPE/PPL Tracker · `pplOf` · Lisensi AP
- `PPPK_PPL` (`data_part4.ts:392`) agregat `structured`/`unstructured`, **berkunci NAMA** → Kesiapan P2PK
- Keempat orang beririsan punya angka BERBEDA:
  Hartono 24/32 · Rudi 18/30 · Sari 31/28 · Anindya 28/32 (Bayu hanya ada di `PPPK_PPL`).
- PR-3 menyatukan **MESIN**-nya, bukan **REGISTER**-nya. Perbedaannya dipaku di
  `ppl_single_engine.test.ts` → `describe('cacat tersisa — dua register SKP untuk satu firma')`.
- **Pertanyaan yang harus diajukan ke Ari sebelum mulai:** register mana yang otoritatif —
  `CPE_LOG` (harian, per-kegiatan) atau `PPPK_PPL` (yang dilaporkan ke PPPK)? Dan bagaimana
  memetakan nama → `empId`? Tanpa jawaban itu penyatuan hanya memindahkan masalah.
- Kalau `CPE_LOG` menang: `PPPK_PPL` jadi turunan (`pplFromEntries` per AP), dan uji
  "dua register" di atas harus DIBALIK menjadi uji kesamaan.

---

## Cara memulai sesi berikutnya

1. `git fetch origin` lalu `git checkout -B <arc-baru> origin/master`. **Jangan** checkout `master`.
2. Baca [[asseris-sdm-kepatuhan-arc]] untuk konteks arc yang baru selesai (termasuk semua gotcha).
3. Kalau Ari minta melanjutkan SDM: kerjakan **utang #3** (dua register SKP) — tanyakan dulu
   register otoritatifnya. Utang #1 & #2 hanya menunggu data, bukan menunggu kode.
4. Kalau Ari minta hal lain: PRD baru dulu (CLAUDE.md), jangan langsung koding.

## GOTCHA yang WAJIB dibawa (mahal dipelajari di sesi ini)

- **`git checkout -- <berkas>` saat falsifikasi MENGHAPUS kerja yang belum di-commit.** Sudah
  memakan seluruh edit PR-5 di `view_payroll.tsx`. Untuk falsifikasi: `cp <berkas> /tmp/x.bak`
  lalu `cp` balik. JANGAN git.
- **Falsifikasi yang TIDAK merah = ujinya lemah, bukan kodenya benar.** Terjadi 2× di sesi ini;
  keduanya menyingkap uji yang memeriksa hal yang salah.
- **Vite dev memecah graf modul.** App mengimpor `/src/data.ts?t=<hmr>` sementara
  `import('/src/data.ts')` dinamis mengambil instance LAIN ⇒ IIFE `data_people` memutasi AMS
  yang berbeda ⇒ `AMS.GIFTS_REGISTER` undefined padahal uji hijau. **Perbaikan: `preview_stop`
  lalu `preview_start` (restart server), BUKAN reload halaman.**
- **`AMS.ORG` & seluruh isi `data_people.ts` hanya dimuat `main.tsx`** (IIFE + `Object.assign`).
  Uji/modul yang cuma `import './data'` melihatnya KOSONG. Wajib `import './data_people';`.
- **Menambah baris ke peta data yang dikonsumsi rumus ⇒ cek field WAJIB-nya.** PR-4 menambah
  59 baris `PAYROLL_EXT` tanpa `ter` ⇒ `base * undefined` = NaN, lolos typecheck DAN semua uji.
  Ketahuan hanya lewat verifikasi hidup.
- **Server tRPC :5181 bisa milik sesi lain** — bisa mati (ECONNREFUSED) atau membawa seed LAMA
  ⇒ modul tampak kosong. Verifikasi mesin lewat `import('/src/canon_*.ts')` di bundel.
- **Jangan simpulkan "modul X memakai mesin Y atas data Z" tanpa melacak SUMBER DATANYA.**
  Saya salah menyatakan `view_pppk` membaca `CPE_LOG`; ia membaca register kedua.
- Port 5180/5186 sering dipegang sesi lain → pakai `vite-5185`.
- Menghapus `any` dari view ⇒ suppression usang ⇒ `VERIFY FAILED: frontend lint`.
  Perbaikannya `npm run lint:any-baseline` (REGENERASI, jangan tebak angka).
- Kontrol `.field` baru WAJIB `id` dari `React.useId()`, bukan literal — ada gerbang a11y repo.

Terkait: [[asseris-sdm-kepatuhan-arc]] · [[asseris-sesi-paralel-satu-worktree]] · [[asseris-tooling-gh]]

> **PEMBARUAN 2026-08-19 — SC-24a DITUTUP.** Dua register SKP disatukan: `PPPK_PPL`
> menjadi populasi saja, realisasi lewat `LICENSING.pplOf`. Arc SDM kini **Implemented**
> (SC-1..SC-25 seluruhnya). Rincian: [[asseris-sc24a-satu-register-skp]].
