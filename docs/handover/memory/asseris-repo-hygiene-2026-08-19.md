---
name: asseris-repo-hygiene-2026-08-19
description: Audit konflik 2026-08-19 — 6 cabang debris & 3 worktree yatim dibersihkan; cara membuktikan cabang aman dihapus; GOTCHA backslash heredoc merusak sumber
metadata: 
  node_type: memory
  type: project
  originSessionId: 3472c377-9e79-4ded-8f5b-f82b910e6a2d
  modified: 2026-08-19T13:36:03.186Z
---

# Audit konflik & pembersihan repo — 2026-08-19

Ari minta "cek aplikasi, identifikasi konflik". Hasil: `verify` hijau, **nol penanda
konflik di working tree** — semua konfliknya DIAM. Empat lapis: data dalam aplikasi,
cabang menggantung, worktree yatim, dan status PRD.

## Cara MEMBUKTIKAN sebuah cabang aman dihapus (bukan menebak)

`git cherry` **tidak berguna** setelah squash-merge (patch-id berbeda). Yang membuktikan:

```
git diff --shortstat origin/master..<branch>     # DUA titik = beda ISI, bukan beda sejarah
```

- Keluaran **kosong** ⇒ isi cabang identik dengan master ⇒ 100% sudah mendarat.
- Ada `insertions` ⇒ periksa apakah berkasnya semata **versi LAMA** dari berkas yang
  disentuh commit master berikutnya: `comm -23 <berkas-diff> <berkas-yg-disentuh-master>`.
  Kalau habis, cabang hanya *tertinggal*, bukan membawa kerja baru.

Terbukti: `feat/sdm-kepatuhan-pr1-pr3` diff **kosong total** (#256 squash);
`feat/pipeline-pr1-register-tunggal` sisa 320 baris seluruhnya versi pra-#256/pra-#252.
Empat cabang `docs/prd-*` hanya membawa status **`Draft`** dari PRD yang di master sudah
**`Implemented`** — konflik add/add yang isinya KEMUNDURAN. Keenamnya dihapus; SHA
tercatat di scratchpad (`git branch <nama> <sha>` untuk rollback).

## Worktree yatim — ada di disk, tak terdaftar git

`.claude/worktrees/{cockpit,delivery,pr8a2}` tinggal cangkang: `migration/src` **0 berkas**,
isinya hanya junction `node_modules` → menunjuk `node_modules` repo UTAMA. Menghapus dengan
`rm -rf` yang mengikuti junction akan **melenyapkan node_modules repo utama**.

Urutan aman (lihat juga [[asseris-checkpoint-2026-08-14]]):
1. hitung dulu: `ls -1 node_modules | wc -l` untuk root/migration/server;
2. lepas tiap junction: `cmd //c rmdir "$(cygpath -w "$p")"` (TANPA `/s`);
3. hitung ulang — angkanya harus SAMA (82/367/120);
4. baru `rmdir` direktori kosongnya, lalu `git worktree prune`.

`.claude/launch.json` menyimpan entri dev-server yang menunjuk worktree yang sudah hilang —
periksa entri terhadap `git worktree list`, bukan terhadap keberadaan direktori.

## GOTCHA KERAS — backslash lenyap lewat heredoc tool Bash

`python - <<'PY'` **tidak melindungi backslash** di transport tool ini. `\\b` yang saya tulis
sampai ke Python sebagai `\b`, lalu Python menafsirkannya sebagai **karakter backspace
(0x08)** dan menuliskannya ke berkas sumber. Regex `/\bAP\b/` menjadi `/<BS>AP<BS>/` —
lolos tanpa error, salah secara diam-diam. Terlihat hanya lewat `grep ... | cat -v`.

**Kambuh 2026-08-20** (arc [[asseris-cockpit-tab-segel]]): `\b` di dalam regex uji
vitest. Yang membuat ini mahal: **keluaran gagal vitest merender backspace sebagai
nol lebar** — layar menampilkan `/firmName:\s*\(AMS\.FIRM/`, persis regex yang
dimaksud, sementara berkasnya berisi byte 0x08. Jangan percaya echo regex di laporan
uji; buktikan dengan `node -e "...JSON.stringify(baris)"` atau `grep -c $'\x08'`.

**Aturan:** jangan pernah menulis regex/escape ber-backslash lewat heredoc. Pakai tool
`Edit`, atau tulis ulang logikanya tanpa backslash sama sekali
(`cert.split(',').map(c => c.trim()).includes('AP')` — juga lebih benar daripada
substring: `'CPA, CA'` tak boleh dianggap punya AP).

Terkait: [[asseris-sdm-kepatuhan-arc]] · [[asseris-sc24a-satu-register-skp]] ·
[[asseris-sesi-paralel-satu-worktree]] · [[asseris-prisma-client-worktree-trap]]
