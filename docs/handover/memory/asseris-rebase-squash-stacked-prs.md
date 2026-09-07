---
name: asseris-rebase-squash-stacked-prs
description: "Resep + jebakan merapikan PR bertumpuk setelah squash-merge di repo Asseris (rebase --onto, konflik CRLF, penanda konflik ter-commit)"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 74216322-c471-4f11-99ba-e507da1fe2a4
  modified: 2026-08-07T09:16:56.713Z
---

Squash-merge **memutus** setiap PR yang bertumpuk di atasnya: basisnya lenyap sebagai commit, jadi PR anak langsung `CONFLICTING/DIRTY` walau isinya baik-baik saja. Terjadi berulang di repo ini (#129/#130, lalu #171/#175/#177 pada 2026-08-07).

**Resep yang benar** — putar ulang HANYA commit milik PR anak, bukan commit yang sudah masuk lewat squash:

```
git rebase --onto origin/master <SHA-basis-lama> <branch-anak>
```

`<SHA-basis-lama>` = tip branch induk **sebelum** di-squash (cari via `git log origin/master..origin/<branch-anak>` — commit induk masih terlihat di sana). `git rebase origin/master` polos akan mencoba menerapkan commit induk dua kali.

Untuk PR anak yang sudah punya nomor: retarget base-nya lebih dulu (`gh pr edit <n> --base master`), lalu push paksa hasil rebase (`--force-with-lease`). Base yang di-retarget saja TIDAK menyelesaikan konflik.

**Why:** urutan merge yang salah membuat CI hijau di atas basis yang sudah tak ada, dan konflik palsu yang memakan waktu jauh lebih lama daripada rebase yang benar.

**How to apply:** setelah setiap squash-merge, cek `gh pr list --json mergeable,mergeStateStatus`; setiap `CONFLICTING` yang basisnya baru saja di-merge butuh resep di atas. Setelah rebase, **ulangi seluruh gerbang lokal** (typecheck·lint·test·build kedua paket) sebelum push — rebase bersih bukan bukti kode benar; ia hanya bukti teks-nya menyatu.

## ⚠️ Dua jebakan yang benar-benar menggigit (2026-08-07)

1. **Penanda konflik dapat ter-commit diam-diam.** Skrip `python` penyelesai konflik gagal karena CRLF (assertion gagal), tetapi `git add ... && git rebase --continue` di baris perintah yang SAMA tetap berjalan — commit lahir memuat `<<<<<<< HEAD` mentah, dan rebase melaporkan **"Successfully rebased"**. Jangan pernah merangkai `git add` setelah skrip penyelesai dalam satu perintah. Selalu verifikasi setelahnya:
   `grep -rn "^<<<<<<< \|^>>>>>>> " migration/src server/src | grep -v node_modules | wc -l` → harus **0**.
2. **Tool `Edit` menangani CRLF dengan benar; `python`+`io.open(newline='')` sering tidak** untuk blok multi-baris. Untuk resolusi konflik, pakai `Edit`. `python` hanya untuk baris tunggal atau saat perlu escape karakter kontrol (lihat [[asseris-wp-signoff-integrity]] soal `\x01`).

Terkait: [[asseris-wtb-eval-pr1-pr2]] (temuan awal squash≠retarget) · [[asseris-tooling-gh]] (gh tak di PATH: `C:\Program Files\GitHub CLI\gh.exe`).
