---
name: asseris-mgmtletter-atribusi-isolasi
description: Surat Manajemen — atribusi karangan + kunci persist firm-scope; dan pelajaran baseline-ke-master yang hampir MENGEMBALIKAN perbaikan klok master
metadata: 
  node_type: memory
  type: project
  originSessionId: 384c9745-42da-4aa7-a30d-22261d31647d
  modified: 2026-08-24T08:22:44.271Z
---

Arc `mgmtletter`, 2026-08-24. **PR #305 TERBUKA** (`fix/mgmtletter-atribusi-isolasi`
di atas `origin/master` `f650c74`, MERGEABLE, tiga commit: `1402594` atribusi+isolasi
+C-H · `811bfbc` Opsi C · `7620967` bilah statistik). `npm run verify` **PASSED**
(198 berkas / 3550 uji frontend · 31 / 461 backend). Worktree
`.claude/worktrees/mgmtletter` masih ada — hapus sesudah PR mendarat.

Berkas: `mgmtletter_record.ts` (perekam murni + penanda peraga) ·
`mgmtletter_attribution.test.ts` (42 uji; 8 MERAH untuk atribusi/isolasi, 4 MERAH lagi
untuk Opsi C) · `view_final3.tsx` · `view_presentasi.tsx` · `contexts.tsx` (2 entri
AMS_PERSIST_SCOPE) · `eslint-suppressions.json` (61→59) ·
`docs/PROMPT-PERBAIKAN-MODUL.md` §C-H + aturan keras 7 direvisi ·
`docs/prompts-perbaikan/142-mgmtletter.md` · `docs/usulan-mgmtletter-seed-identitas.md`.

## GOTCHA TERBESAR — saya nyaris mengirim kemunduran

Saya mengerjakan seluruh perbaikan di direktori kerja utama lebih dulu, dan baru
sesudah selesai memeriksa bahwa dir itu **tertinggal 39 commit** dari `origin/master`.
Master sudah menutup CACAT-3 (klok) lewat **`clock_ssot.ts` · `amsDateIso()`** — modul
penuh dengan format tanggal dirakit tangan. Perbaikan saya memakai `AMS.TODAY`
langsung; mengirimnya akan **MENGEMBALIKAN** pekerjaan master. Ini pengulangan persis
[[asseris-gelombang0-arc-tersalip-master]].

**Aturan yang harus dijalankan LEBIH DULU, bukan sesudah:**
```
git rev-list --count HEAD..origin/master        # cabang tertinggal berapa?
git diff HEAD origin/master -- <berkas target>  # target sudah berubah di master?
git show origin/master:<berkas> | grep -c <cacat>   # cacatnya masih ada DI MASTER?
```
Sensus cacat WAJIB dijalankan terhadap `origin/master`, bukan terhadap berkas di dir kerja.

**Solusinya: worktree, bukan checkout.** Dir utama dipakai bersama beberapa sesi;
`git checkout <branch>` di sana mencabut kerja mereka. Pola repo:
`git worktree add .claude/worktrees/<nama> -b <branch> origin/master`, lalu
`cmd /c mklink /J` untuk `node_modules`, `migration/node_modules`, `server/node_modules`.
Bonus besar: di worktree bersih, `npm run verify` benar-benar **PASSED** — di dir utama
ia selalu merah oleh berkas untracked sesi lain, sehingga tak pernah membuktikan apa pun.
Dan `git stash` aman di sana, jadi falsifikasi gerbang bisa dilakukan sebagaimana mestinya.

## Yang layak diingat, teknis

**1 · `mlActor` diturunkan dari `glActor`, bukan disalin.** Preseden: `glActor`
(firm_gl_actor.ts) → `iaActor` (internalaudit_memo.ts). Yang baru: catatan ML merekam
nama DAN peran, jadi `mlActor` mengembalikan `{ name, role }` — `name` lewat `glActor`,
`role` dari `auth.user.role` (ternyata sudah label manusiawi: 'Audit Manager', bukan
kunci RBAC). Jangan bikin aturan keempat. `useCurrentAuditor()` BUKAN alatnya.

**2 · Memindahkan kunci ke engagement-scope TIDAK perlu menaikkan versi.** Lingkup
adalah bagian dari ALAMAT (`ams.v1.<scope>.<scopeId>.<key>`); dokumen firma lama tidak
tertimpa dan tidak pula terbaca. Preseden `approvals_ov_v3`→`v4` menyesatkan kalau
ditiru buta. Efek samping bagus: `capForWrite('engagement', …)` default = `WP_EDIT`,
jadi pindah lingkup sekaligus mencabut kegagalan tulis SENYAP bagi Manajer/Senior
(firm-scope tanpa cabang = `FIRM_ADMIN`).

**3 · Token warna di atas `.doc-paper`: `--navy-solid`, BUKAN `--navy`.** `:root.dark`
memetakan `--navy` → `#8298a1` (abu terang, peran TEKS), sementara `.doc-paper` tetap
kertas PUTIH di kedua tema. `var(--navy)` di sana = abu-di-atas-putih pada tema gelap —
cacat baru yang lolos semua gerbang.

**4 · Adendum C-H gagal pada uji lapangan pertamanya, dan sudah diperbaiki.** Ia
menangkap 2 dari 4 cacat; yang lebih buruk, **gerbang penutupnya HIJAU di atas kode
yang bocor** — "identitas di payload ekspor harus BERBEDA" lolos karena kop surat
memang sudah diturunkan dari perikatan aktif, sementara isinya milik klien lain.
Revisi: `glActor` disebut lebih dulu + aturan "tanpa sesi tidak menulis"; **lingkup
persistensi masuk sebagai bentuk identitas** (cacat tanpa literal — grep buta
terhadapnya); gerbang menagih **ISI** ("tulis di A → buka B → tak ada di sana").

**5 · Uji tier ini `environment: 'node'`, `include: ['src/**/*.test.ts']`** — tanpa
jsdom, tanpa render. Klaim tentang apa yang TAMPIL hanya dapat digerbangi lewat sumber.
Katakan itu apa adanya; jangan mengaku menguji perilaku yang tak diuji.

**6 · Menyunting berkas sesi lain lewat skrip = risiko backslash.** Saat membersihkan
duplikat saya di dir utama, salinan kerja `contexts.tsx` ternyata memuat `psakd+`
(seharusnya `psak\d+`) — sesi `invprop` sudah memperbaikinya di commit `6b50b20`,
tetapi salinan kerjanya basi. `git checkout HEAD -- <berkas>` memulihkannya. Selalu
`git diff` sesudah membersihkan, jangan asumsikan hasilnya nol. Lihat
[[asseris-repo-hygiene-2026-08-19]] · [[asseris-sesi-paralel-satu-worktree]].

## Opsi C (keputusan Ari, dilaksanakan `811bfbc`)

**7 · Angka hasil grep atas SATU nama bukan ukuran sebuah kelas cacat.** Prompt
menyebut "10 kemunculan Linda Wijaya"; seed sebenarnya 7 temuan + 24 catatan, juga
menyebut `Rudi Gunawan (Partner)` (2 keputusan) & `Citra Halim`. Penanda dipasang di
DEKLARASI (`mlMarkIllustrative` membungkus seed) — isi seed tak disentuh, baris baru
ikut tertandai, dan gerbang menolak penanda yang disulam per-objek.

**8 · Memindahkan lingkup sebuah kunci WAJIB diikuti sensus PEMBACANYA.**
`grep -rn "<key>" migration/src` menemukan `view_presentasi.tsx` — dek yang
DIPRESENTASIKAN KE KLIEN — membaca kunci yang sama. Ia bahkan membaca alamat
TAK-BERLINGKUP (`prLoadLS('mgmtletter.findings.v2')`), yang sejak W6 tak pernah
ditulis siapa pun, sehingga dek itu diam-diam memakai seed pada SETIAP perikatan.
Cacat yang lebih tua dari arc ini dan tak muncul di sensus mana pun.

**9 · Gerbang pemindai sumber memerah oleh perbaikan tipe yang SAH.**
`/mlLetterFindings\s*\(/` tak cocok `mlLetterFindings<MlRow>(`. Itu perilaku gerbang
yang BENAR (ia menagih janji, bukan mengikuti kode), tetapi regexnya harus mengizinkan
argumen tipe sejak awal: `/nama\s*(?:<[^>]*>)?\s*\(/`. Sudah masuk aturan keras 7.

**10 · Dua `(f: any)` baru MEMBUKA seluruh berkas** — 63 error dari satu berkas, bukan
2, karena aktual melewati baseline suppression. Perbaikannya BUKAN menaikkan baseline
melainkan mencabut duplikasinya (rantai filter kedua → `mlLetterSplit` yang
mengembalikan isi + jumlah-dibuang sekaligus). Baseline `view_final3` justru TURUN
61→59. `npm run lint:any-baseline` menyinkronkan; di worktree bersih ia hanya menyentuh
berkas yang memang berubah.

**11 · `<Badge>` (ui.tsx) MEMBUANG seluruh prop selain `children/kind/dot`.** `title`
yang ditulis di sana hilang diam-diam — tooltip mati yang tak terlihat siapa pun.
Tempelkan pada pembungkusnya. `Btn` sebaliknya menyebar `...rest`, jadi
`disabled`/`title` di sana bekerja.

Masih terbuka: `view_opinion.tsx:138,161,448` membawa cacat ML-4 yang identik pada
LAPORAN AUDITOR.

Terkait: [[asseris-firmgl-rekonsiliasi-ekspor]] · [[asseris-internalaudit-memo-identitas]] ·
[[asseris-firmtax-bukti-potong-karangan]] · [[asseris-klok-ssot-jam-mesin]] ·
[[asseris-arc-prompt-perbaikan-modul]] · [[asseris-gelombang0-baseline-master-bukan-head]]
