---
name: asseris-ci-dispatch-hilang-dan-gh-merge-worktree
description: GitHub bisa MENJATUHKAN dispatch pull_request (nol run, tanpa konflik) — sembuh dengan close+reopen; dan gh pr merge --delete-branch GAGAL bila worktree lain memegang master
metadata:
  type: project
---

Dua jebakan pengiriman yang keduanya terlihat seperti kegagalan kode, padahal bukan
(ditemui saat mengirim PR #308, 2026-08-26).

## 1 · CI yang TIDAK PERNAH START walau PR bersih

Gejala: `gh pr checks <n>` → `no checks reported`, dan
`gh api "repos/…/actions/runs?head_sha=<sha>" --jq .total_count` → **0**, berjam-jam.

Catatan lama mengaitkan ini dengan **konflik** ([[asseris-timebudget-fee-penagihan-karangan]]:
"PR berkonflik ⇒ CI TIDAK PERNAH START"). **Itu bukan satu-satunya sebabnya.** Di #308
`mergeable=MERGEABLE · CLEAN` dan tetap nol run — GitHub sekadar **menjatuhkan** event
`pull_request`-nya. Bukti bahwa Actions sehat: PR sesi paralel yang dibuat 2 menit
KEMUDIAN langsung memicu keempat workflow.

**Diagnosis** (bedakan dari repo/Actions yang mati):
```
gh run list --limit 8                 # ada run dari cabang LAIN? ⇒ Actions sehat
gh api repos/<o>/<r> --jq '.disabled' # false ⇒ bukan repo yang dinonaktifkan
```

**Obatnya — close + reopen PR-nya:**
```
gh pr close <n> && gh pr reopen <n>
```
`on: pull_request` tanpa `types:` = `[opened, synchronize, reopened]`, jadi *reopened*
memicu ulang **tanpa menyentuh riwayat**. Runs muncul <30 detik. Alternatif yang lebih
kotor: commit kosong (memicu `synchronize`) — hindari, ia mengotori riwayat.

## 2 · `gh pr merge --delete-branch` gagal karena worktree lain memegang `master`

```
failed to run git: fatal: 'master' is already used by worktree at 'D:/Claude AI/_wt/pppk'
```

**MERGE-NYA SUDAH BERHASIL** di GitHub. Yang gagal cuma bersih-bersih LOKAL `gh`
(ia mencoba `git checkout master` sesudah merge). Jangan panik & jangan merge ulang —
repo ini rutin memegang belasan worktree, jadi ini akan berulang.

Akibat sampingan: `--delete-branch` **tidak jalan**, cabang remote tetap hidup.
Verifikasi lalu hapus manual:
```
gh pr view <n> --json state,mergedAt,mergeCommit   # ('merged' BUKAN field yang valid)
git push origin --delete <cabang>
```

## 3 · CI hijau bisa BASI — periksa basisnya sebelum merge

Antara CI hijau dan merge, `origin/master` sempat bergerak `f650c74` → `7fb1a4a`
(PR sesi paralel mendarat). Hijau itu jadi hijau terhadap basis yang salah.
Resep: `git fetch` → bandingkan `origin/master` dengan `HEAD~1` → bila bergerak,
`gh pr update-branch` → **tunggu CI lagi** → baru merge.

Terkait: [[asseris-merge-antrean-2026-08-23]] · [[asseris-procurement-kontrol-baris-native]] ·
[[asseris-tooling-gh]] · [[asseris-sesi-paralel-satu-worktree]]
