---
name: asseris-sesi-paralel-satu-worktree
description: "Dua sesi Claude di SATU direktori kerja saling menimpa — checkout sesi lain mengganti branch di tengah kerja; commit lebih dulu, lalu pakai worktree"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 64cead36-9267-43bb-83ba-ca06dd6b53da
  modified: 2026-08-15T23:22:57.892Z
---

Ari menjalankan **beberapa sesi Claude Code paralel di direktori kerja yang SAMA**
(`D:\Claude AI\06-BUSINESS-DEVELOPMENT\Audit System`). Pada 2026-08-16, di tengah
arc `firm-erp-deepening` PR-1, sesi lain (arc `SDM & Kepatuhan`) menjalankan
`git checkout -b feat/sdm-pr1-leave-derived` — dan **working tree saya berganti
branch tanpa peringatan**. Berkas yang baru saya edit kembali ke keadaan lama;
harness melaporkannya sebagai "file modified by the user or a linter", yang
MENYESATKAN — itu bukan linter, itu sesi lain.

**Why:** git punya SATU HEAD per direktori kerja. Dua agen yang menulis ke
direktori yang sama pasti bertabrakan; yang belum di-commit bisa hilang, dan yang
lebih buruk — tulisan saya berikutnya akan mendarat di branch milik sesi lain dan
mengotori arc mereka.

**How to apply:**
- **Commit sesering mungkin.** Kerja yang sudah di-commit AMAN meski branch
  berganti (commit `55eb180` selamat utuh; branch `feat/firm-erp-pr1-asset-register`
  masih menunjuk ke sana). Yang belum di-commit adalah yang berisiko.
- **Jangan balas `git checkout` untuk merebut tree.** Itu menimpa sesi lain dengan
  cara yang sama. Berhenti dan laporkan ke Ari — koordinasi antar-sesi adalah
  keputusannya.
- **Gejala yang harus memicu curiga:** system-reminder "file was modified by the
  user or a linter" atas berkas yang BARU SAJA saya tulis, terutama bila isinya
  kembali ke versi pra-edit. Segera `git branch --show-current` + `git log -1`.
- **Solusi permanen:** satu worktree per arc (`EnterWorktree`), bukan satu tree
  dipakai bersama. Ingat gotcha terkaitnya: junction `server/node_modules` membuat
  `prisma generate` menulis ke worktree lain (EPERM + uji backend merah palsu) —
  lihat [[asseris-prisma-client-worktree-trap]] dan
  [[asseris-timebudget-engagement-isolation]]; lepas junction dengan
  `cmd /c rmdir` SEBELUM menghapus worktree ([[asseris-checkpoint-2026-08-14]]).

- **Vonis "cabang ini redundan" PUNYA MASA BERLAKU.** 2026-08-27: saya nyatakan
  `fix/timebudget-engagement-isolation` "redundan penuh, aman dihapus"; sepuluh
  menit kemudian sesi lain menaruh commit BARU di sana (`e205b77`, arc Framework)
  dan vonis itu jadi salah — Ari sempat menyuruh menghapusnya atas dasar laporan
  saya. Nyatakan selalu sebagai **"redundan PER `<sha>`"**, dan **periksa ulang
  tip + `git status` tepat sebelum menghapus**, bukan mengandalkan pemeriksaan
  beberapa giliran sebelumnya.
- **Cabang LOKAL bisa jauh di depan tip REMOTE-nya.** Pada kejadian yang sama,
  remote-nya sudah mendarat penuh sementara lokalnya 3 commit di depan, memuat
  invprop PSAK 13 yang tak ada di mana pun (diselamatkan → #314). Uji
  kepemilikan pakai **blob** (`git rev-parse <ref>:<berkas>` dicari di
  `git rev-list origin/master -- <berkas>`), BUKAN `git cherry` yang memberi `+`
  palsu pasca-squash — lihat [[asseris-git-cherry-squash-palsu]].

Terkait: [[asseris-firm-erp-deepening-arc]]

---

## 2026-08-28 — WORKTREE PUN BISA BERTABRAKAN: nama yang sama dipilih dua sesi

Worktree dipakai sebagai pengaman terhadap tabrakan di atas. Ia gagal bila **dua
sesi memilih NAMA yang sama**. Terjadi pada pendaratan W0-4 regref: saya
`git worktree add .claude/worktrees/w0-regref`, menjalankan rebase 46-commit
(8 konflik), lalu berkas-berkas konflik **teresolusi sendiri** sementara saya
membacanya. `ListAgents` menunjukkan 20+ sesi interaktif hidup di repo ini.

**Cara membuktikannya (bukan menebak) — tiga lapis:**

1. **Teks yang tak ada di sisi mana pun.** Hasil merge memuat kalimat yang
   `grep -c` atas `origin/master`, commit cabang, DAN commit induknya semuanya
   NOL. Git tidak pernah mengarang kalimat; kalau ada teks baru, ada penulis.
2. **Penanda konflik lenyap di antara dua pembacaan saya**, tanpa satu pun tulisan
   dari saya.
3. **mtime berurutan seperti pekerjaan orang**, bukan seperti satu tulisan git:
   04:41:57 → 04:42:41 → 04:43:10 → 04:43:42 → 04:45:31, satu berkas per menit.

**Yang HARUS disingkirkan dulu sebelum menuduh sesi lain** (saya periksa ketiganya):
`git config rerere.enabled` + ada-tidaknya `.git/rr-cache` · hooks Claude Code di
`.claude/settings.json`, `settings.local.json`, `~/.claude/settings.json` · git hooks
non-sample di `.git/hooks`. Bila salah satu aktif, penjelasannya jinak.

**JANGAN `git rebase --abort` untuk "membersihkan".** Di worktree bersama itu
MENGHAPUS resolusi konflik sesi lain — kelas kerusakan yang sama dengan
`git checkout -- <berkas>`. Berhenti menulis, lapor, minta keputusan.

**Pakai nama worktree yang unik per sesi**, bukan nama tugas. Nama tugas
(`w0-regref`, `firmgl-port`) adalah nama yang PASTI dipilih sesi lain yang
mengerjakan tugas yang sama.

**Sebelum menyimpulkan sesi itu keliru, PERIKSA hasil kerjanya.** Di kasus ini
resolusi mereka atas `regref_catalog.ts` ternyata BENAR — 10 set dengan `kurs`
(master, #283) dipertahankan, jebakan arah-diff yang sama yang saya temukan.
Sesi yang lebih dulu bisa saja lebih maju; standing down adalah jawaban yang benar.

Terkait: [[asseris-prisma-client-worktree-trap]] (node_modules bersama antar-worktree)
