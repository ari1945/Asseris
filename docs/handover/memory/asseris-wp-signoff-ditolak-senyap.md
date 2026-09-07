---
name: asseris-wp-signoff-ditolak-senyap
description: Tanda tangan kertas kerja DITOLAK server 403 pada setiap klik selama berbulan-bulan — dan mekanisme yang menyembunyikannya untuk SELURUH aplikasi
metadata: 
  node_type: memory
  type: project
  originSessionId: 190bf788-abe4-4692-9d30-c655cef14c31
  modified: 2026-08-22T15:46:03.539Z
---

Arc 2026-08-22. **MENDARAT**: `b7f2246` (PR #284, tanda tangan + penolakan terlihat)
dan `dc1d2d5` (PR #285, gerbang `Date.now()`). CI 9/9 keduanya. Lanjutan dari
[[asseris-klok-ssot-jam-mesin]] (temuan sampingannya).

## Cacat yang jauh lebih besar dari yang saya laporkan

Saya melaporkannya sebagai "tanda tangan ditandai cacat". Kenyataannya:
`WpPanel.sign()` menulis `{ by: me, at: wpToday() }`, server menjawab **403**, dan
**tak ada apa pun yang tersimpan** — sementara layar menampilkan tanda tangannya.

    POST /trpc/state.set → 403
    signature-missing-identity:wp:jet.preparer

Dibuktikan hidup, tiga varian, dengan `byUserId` disuntik manual:

| tulisan | jawaban server |
|---|---|
| `{by, at:'09 Mar 2026'}` | 403 `signature-missing-identity` |
| `{by, byUserId, at:'09 Mar 2026'}` | 403 `signature-missing-timestamp` |
| `{by, byUserId, at:<ISO jam nyata>}` | **200 OK** |

**PELAJARAN UTAMA: jangan pernah melaporkan cacat integritas sebagai "ditandai"
sebelum menembak endpoint-nya.** Selisih antara "dilaporkan cacat" dan "hilang
diam-diam" adalah selisih antara catatan kaki dan kehilangan data.

## Mekanisme yang menyembunyikannya — berlaku untuk SEMUA modul

`flush()` (`contexts.tsx`) hanya mengenal 409. Semua kesalahan lain jatuh ke satu
cabang berkomentar `/* other errors (offline) */` yang MEMPERTAHANKAN nilai lokal
tanpa pemberitahuan. Untuk transport itu benar; untuk penolakan-atas-isi, layar
berbohong.

Repo ini sudah **TIGA kali** menambalnya dari sisi lain (`priorYear` ·
`capacityPlan.v1` · `deliveryPlan.v1`) dengan menggeser peta kapabilitas agar
penolakannya tak pernah terjadi — komentarnya masih terbaca di `rbac.ts`, lengkap
dengan kalimat "FORBIDDEN jatuh ke cabang 'offline' … TANPA toast". Pelanggaran
ATURAN (`signature-*`, `posted-immutable`) tak dapat dihindari begitu.
**POLA: kalau workaround yang sama sudah ditulis tiga kali, yang salah mekanismenya.**

Perbaikan: `isRejected(err)` memisahkan DITOLAK (403/400/412) dari GAGAL SAMPAI;
nilai server dibaca ulang, layar & cache dipulihkan, kartu merah menyebut kalimat
server. **401 SENGAJA dikecualikan** — sesi kedaluwarsa tak boleh membuang
suntingan yang sah. Kunci personal dibaca lewat `personal.get` (`state.get` 403).

## DUA klok, ditegaskan lagi

Tanda tangan memakai **jam NYATA** (`wpSignatureStamp` = `nowStamp`), BUKAN
`AMS.TODAY`: ia divalidasi terhadap jam server dalam jendela 10 menit. Ini
kebalikan dari sapuan #281 — dan justru itu sebabnya keduanya harus dipisah.
Gerbang `Date.now()` (#285) mengunci keluarga `nyata` + `pasangan` supaya
pembanding SLA tak pernah tertinggal di klok yang lain.

## GOTCHA

- **Uji terbaik memakai validator SERVER yang sesungguhnya.** `wp_signature.test.ts`
  memanggil `signatureAttributionViolations` (yang dipanggil `server/src/signoff.ts`),
  bukan salinan aturan. Aturan server berubah → uji ikut berubah sendiri.
- **`TaskStop` TIDAK membunuh proses anak.** `npm start`/`npx vite` yang di-stop
  meninggalkan node yang MEMEGANG `query_engine-windows.dll.node` ⇒ `prisma generate`
  gagal `EPERM` ⇒ 20 berkas uji backend merah dengan "table main.Firm does not exist".
  Cari dengan `Get-CimInstance Win32_Process -Filter "Name='node.exe'"` + filter path,
  `Stop-Process`, hapus `server/prisma/test.db`, `npx prisma generate`, ulangi.
- **Klien Prisma bersama = milik worktree yang terakhir generate.** Dua worktree +
  sesi paralel = backend merah bergiliran. Selalu `npx prisma generate` di worktree
  sebelum `npm test`, dan KEMBALIKAN ke pohon utama sesudah selesai.
- **`gh pr merge --delete-branch` gagal di worktree** ("'master' is already used by
  worktree at …") PADAHAL merge-nya mendarat. Pakai `--squash` saja, cek
  `gh pr view --json state`, lalu `git push origin --delete` sendiri.
- **`gh pr view --json mergeable` mengembalikan `UNKNOWN`** beberapa detik sesudah
  merge lain; tunggu sampai bukan UNKNOWN sebelum menyimpulkan konflik.
- **Backtick di dalam `python -c "…"` lewat Bash DIEKSEKUSI shell** — komentar jadi
  rusak senyap (`\`result\`` hilang). Tulis skrip lewat alat `Write`.
- **Menambah `:any` di `contexts.tsx` = 111 error lint** (satu any baru
  meng-un-suppress seluruh berkas). Ketik `(ev: Event)` + `as CustomEvent`, jangan
  ikut gaya `any` di sekitarnya. Baselining itu jalan yang salah di sini.
- Tipe yang terlalu longgar bisa MENYEMBUNYIKAN cacat: `WpStateEntry.evidence?:
  unknown[]` membuat entri kertas kerja tak dapat diserahkan ke `wpContentHash` —
  jadi panel bersama memang tak pernah bisa menghitung hash isinya.

## Sisa

- Perubahan `flush()` akan MEMUNCULKAN penolakan yang selama ini tersembunyi di
  modul lain. Toast baru = temuan lama, bukan regresi #284.
- `saveConclusion` (`conclusion.at`) tetap memakai klok perikatan — ia tanggal
  tampilan, bukan tanda tangan rantai, jadi tak divalidasi server.
