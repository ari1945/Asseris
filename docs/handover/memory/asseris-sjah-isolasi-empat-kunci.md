---
name: asseris-sjah-isolasi-empat-kunci
description: "SJAH 3400/3402/3410/3420 — empat kunci exec dipindah ke lingkup perikatan; klaim \"dibaca lintas modul\" di komentar terbukti SALAH karena pembacanya menyasar kunci pra-W6 yang nol penulis"
metadata: 
  node_type: memory
  type: project
  originSessionId: 7367bd5a-d1b5-4748-8de4-52a2883bbc97
  modified: 2026-08-26T22:48:09.578Z
---

**#309 MENDARAT `636a318`** (squash, 2026-08-26T22:44Z). Cabang remote & lokal sudah dihapus.
`npm run verify` lokal PASSED (frontend 198 berkas/3514 uji · backend 31/461); CI PR 9/9.

⚠ **Antrean GitHub Actions bisa tertunda 4–25 MENIT.** `gh pr checks` menjawab *"no checks
reported"* dan `gh run list --branch` mengembalikan NOL, padahal PR lain yang dibuat
SESUDAHNYA sudah punya run. Itu antrean, bukan trigger yang gagal — jangan menutup/membuka
ulang PR untuk memicu ulang. Repo ini padat karena beberapa sesi paralel mendaratkan PR
berturut-turut, jadi **master bergerak di tengah proses**: #309 butuh DUA kali
`gh pr update-branch` (basis `f650c74` → `7fb1a4a` → `8aecc49`) sebelum hijaunya sahih.

⚠ **`gh pr merge --delete-branch` GAGAL SEBAGIAN di repo multi-worktree.** Merge-nya sukses,
lalu langkah LOKAL gh gugur (`fatal: 'master' is already used by worktree at …`) dan
penghapusan cabang REMOTE ikut batal — padahal pesan errornya tampak seperti kegagalan
total. Verifikasi lewat `gh api repos/<o>/<r>/branches`, lalu hapus eksplisit dengan
`gh api -X DELETE repos/<o>/<r>/git/refs/heads/<cabang>`.

⚠ **Direktori worktree tak bisa dihapus setelah `verify`.** `git worktree remove --force`
→ `Permission denied`; registrasi tetap ter-prune & cabang lokal terhapus. Isi direktori
terhapus tapi direktori TOP-LEVEL-nya `Device or resource busy` (shell latar memegangnya
sebagai cwd). Debris kosong, tak berbahaya — jangan bunuh proses node untuk itu, banyak
yang milik sesi paralel.

## Cacat yang ditutup
`pfi3400.exec` · `soc3402.exec` · `ghg3410.exec` · `pf3420.exec` tak terdaftar di
`AMS_PERSIST_SCOPE` dan tak cocok `PR4_ENGAGEMENT_KEY_RE` ⇒ default `'firm'`. Satu
dokumen dipakai SELURUH perikatan. Perbaikan = **empat baris registri**, bukan pelebaran
regex. Lihat [[asseris-timebudget-engagement-isolation]], [[asseris-mytasks-user-scope]].

## GOTCHA TERBESAR — "dibaca lintas modul" itu BOHONG, dan itu justru yang membuat perbaikan AMAN
Komentar kepala keempat view menulis status disimpan di `ams.v1.<key>.exec` "& dibaca
lintas modul". Grep membuktikan pembacanya memang ADA (`pfiEngine`/`socEngine`/`ghgEngine`/
`proformaEngine` dipanggil TANPA argumen dari `view_nonaudit`, `view_relatedsvc`,
`view_serviceorg`, `view_sjah3000`, dan dari `data_part3.ts:447/450/453` +
`data_proforma.ts:318/328` saat modul dievaluasi). **Tapi cadangan di dalam mesin membaca
`localStorage.getItem('ams.v1.pfi3400.exec')` — kunci TAK-BERLINGKUP pra-W6.**
`useServerState` menulis `'ams.v1.' + scope + '.' + scopeId + '.' + key` (contexts.tsx
`cacheWrite`); sapuan `grep -rn "localStorage.setItem" migration/src` menunjukkan NOL
penulis kunci itu. Jadi pembaca lintas-modul selalu dapat `null` → `exec = {}` → status
seed. **Mengubah scope tidak memutus apa pun.** Kelas cacat yang sama dengan PR-1a
materialitas ([[asseris-wtb-eval-pr1-pr2]]).

Pelajaran: sebelum menolak perbaikan scope karena "ada pembaca lintas modul", periksa
ALAMAT yang dibaca pembaca itu, bukan cuma keberadaannya. `readPersisted()` di
`persist_scope.ts` adalah jalur yang benar untuk pembaca non-React — mesin SJAH tak
memakainya (temuan terbuka, sengaja tidak diperbaiki di sini).

## Kenapa registri, bukan regex (larangan #2 prompt)
Komentar `PR4_ENGAGEMENT_KEY_RE` (contexts.tsx) menyandarkan keamanannya pada "tak ada key
server lama yang bertabrakan — dulu semuanya localStorage". **Prasyarat itu tidak berlaku
untuk keempat kunci SJAH: mereka SUDAH terdaftar di `FIRM_STATE_READ_KEYS`
(`server/src/stateAccess.ts:53-54`)** sebagai dokumen firma sah. Empat prefiks berbeda juga
memberi nol penghematan atas empat baris registri.

## Kebijakan data lama = HANGUS — **DIKONFIRMASI ARI 2026-08-26**
Ari: *"hangus saja, jangan tambah read-through"*. Jadi ini keputusan produk yang sudah
diambil, bukan default saya: **saat kunci persist berpindah dari lingkup firma ke lingkup
perikatan di repo ini, data firm-scope lama DIBIARKAN HANGUS.** Jangan tawarkan baca-lewat
lagi untuk kasus sejenis kecuali Ari yang membuka.

Alasannya (preseden tertulis `mat.memo.signoff` di `AMS_PERSIST_SCOPE`): nilai firm-scope
tak dapat diatribusikan ke satu perikatan — itulah cacatnya. Keempat kunci SENGAJA **tidak**
ditambahkan ke `SERVER_READ_THROUGH_FIRM`, karena baca-lewat firma menyajikan dokumen yang
sama ke SETIAP perikatan sampai simpan pertama = memasang ulang kebocoran yang dicabut.
Entri `FIRM_STATE_READ_KEYS` di server tetap dipertahankan (dokumen lama terbaca alat
pemeriksa, bukan UI).

## Efek samping yang ikut tercabut
Kunci firm-scope tanpa cabang eksplisit di `capForWrite` (`migration/src/rbac.ts`) jatuh ke
`FIRM_ADMIN`; engagement default = `WP_EDIT`. Jadi sebelum ini centang Manajer/Senior/Junior
DITOLAK server, dan senyap — `flush()` hanya menangani `isConflict(err)`, FORBIDDEN jatuh ke
cabang "offline". Sama dengan priorYear / capacityPlan.v1 / pipeline.

## Resep gerbang isolasi persist (pakai ulang)
`migration/src/sjah_engagement_isolation.test.ts`. `// @vitest-environment jsdom` +
`vi.mock('./api')` (bentuk disalin dari `stage0_context_races_repro.test.ts`; tambahkan
`isRejected`/`rejectionMessage` ke mock) + render `AppProviders` NYATA. `engagement.list`
di-mock ke DUA perikatan yang keduanya **bukan** `DEFAULT_ENG_ID` — efek penjaga di
`FirmProvider` otomatis memindahkan perikatan aktif ke `accessibleEngIds[0]`, sekaligus
membuktikan bawaan tak terlibat. `stateGet` → `{value:null, version:0}` agar server tak
menutupi jalur cache. Probe per kunci di komponen sendiri (hindari hook dalam loop),
memakai `window.useAmsPersist` — situs panggil yang dipakai view. Uji: tulis di A →
`vi.advanceTimersByTime(401)` → pindah B → B `{}` → balik A → isi A utuh (anti-amnesia).
`git stash` (berkas uji untracked jadi TETAP ada) → 4/8 MERAH → `git stash pop` → 8/8 hijau.

## TIDAK dikerjakan (Gelombang 4+)
Skor modul 1,33–2,50: isi Tipe I/II & katalog asumsi statis, nol ekspor, subjek asurans
(PFI_3400/SOC_3402/GHG_3410/PF_3420) adalah satu dataset seed firm-global sementara hanya
centangnya kini per-perikatan. Mesin nol-argumen di atas juga dibiarkan.
