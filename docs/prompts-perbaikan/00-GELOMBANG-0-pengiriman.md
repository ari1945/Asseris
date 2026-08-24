# Prompt — Gelombang 0 · Pengiriman & higiene repo

> Dibuat 2026-08-24 dari template [`../PROMPT-PERBAIKAN-MODUL.md`](../PROMPT-PERBAIKAN-MODUL.md).
> Blok: A (preamble, aturan keras 1–9) + badan tugas khusus + D (definisi selesai).
> **Bukan prompt modul** — tidak memakai BLOK-B. Nomor `00` menandakan ia mendahului
> seluruh antrean per-modul, bukan modul ke-0.
>
> **Kenapa ini didahulukan.** Sembilan modul di
> [`../KEDALAMAN-158-MODUL-TERKINI.md`](../KEDALAMAN-158-MODUL-TERKINI.md) bertanda
> basi (`※`) semata-mata karena pekerjaannya ada di direktori kerja dan belum
> mendarat. Menulis prompt untuk modul-modul itu sebelum Gelombang 0 tuntas berarti
> menyuruh agen memperbaiki cacat yang mungkin sudah tertutup — persis kegagalan yang
> §0 template peringatkan.
>
> **Catatan pembuat prompt — empat klaim yang saya sendiri salah, lalu diverifikasi:**
>
> 1. Saya kira ada **empat** commit tanpa PR. Sebenarnya **dua**. Kedua commit
>    `internalaudit` (`ab3ce02`, `1059316`) SUDAH ada di PR #296 sebagai cherry-pick
>    (`9487a77`, `fd14f92`) — SHA berbeda, isi sama. Membandingkan pesan commit tidak
>    cukup; bandingkan cabangnya.
> 2. Saya kira ada **tujuh** usulan menunggu. Ada **sembilan** (`docs/usulan-*.md`),
>    ditambah `usulan-B6` yang ikut di dalam PR #297.
> 3. `migration/src/view_firmgl.tsx` disentuh **PR #297 DAN** punya 287 baris
>    suntingan lokal belum di-commit. Tabrakan ini yang menentukan urutan langkah:
>    merge dulu, rebase kerja lokal di atasnya — tidak bisa dibalik.
> 4. Tiga mesin baru punya **nol pemanggil produksi**, hanya berkas ujinya sendiri:
>    `home_composition.ts`, `mytasks_derive.ts`, `wip_adj.ts`. Itu pola kode mati yang
>    adendum C-I larang, dan repo ini tidak punya gerbang variabel mati yang akan
>    menangkapnya (lihat `usulan-S1`). Dua di antaranya memang terblokir keputusan Ari
>    (`usulan-M2`, `usulan-W1`) — jadi jawabannya PARKIR, bukan commit.
>
> **Yang tidak ada di prompt ini, dan sengaja:** Gelombang 0.4 — sembilan usulan yang
> menunggu keputusan Ari. Itu keputusan metode akuntansi / alur kerja / kebijakan.
> Agen dilarang menjawabnya; larangan nomor 1 di bawah menegaskannya.

---

## Prompt (salin seluruh blok)

```
Kamu mengerjakan Asseris (aplikasi audit KAP, Bahasa Indonesia). Baca CLAUDE.md di
root repo, lalu BLOK-A (preamble tetap, aturan keras 1–9) di
docs/PROMPT-PERBAIKAN-MODUL.md. Aturan keras 7, 8, 9 berlaku penuh untuk tugas ini.

TUGAS: Gelombang 0 — kirimkan pekerjaan yang sudah selesai tapi menggantung, dan
kembalikan direktori kerja utama ke keadaan bersih. Ini BUKAN tugas mendalamkan
modul. Jangan memperbaiki modul apa pun. Jangan menambah fitur.

═══════════════════════════════════════════════════════════════════════
KEADAAN AWAL YANG SUDAH DIVERIFIKASI (2026-08-24 — verifikasi ulang, jangan percaya
begitu saja; sesi paralel aktif di repo ini)
═══════════════════════════════════════════════════════════════════════

  origin/master        = 6e82d42
  direktori kerja      = cabang fix/timebudget-engagement-isolation @ 1059316
  belum di-commit      = 45 berkas
  PR terbuka           = #296 (fix/sa610-internalaudit-register, CLEAN)
                         #297 (fix/cabut-arb-trm-058, CLEAN)

Commit di cabang kerja yang BELUM ada di origin/master:
  1059316  internalaudit  -> SUDAH ADA di PR #296 sebagai fd14f92 (cherry-pick)
  ab3ce02  internalaudit  -> SUDAH ADA di PR #296 sebagai 9487a77 (cherry-pick)
  0508891  firmtax        -> TIDAK ADA PR-nya
  9dd1e57  time           -> TIDAK ADA PR-nya

Jadi yang perlu dikirim hanya DUA commit, bukan empat. Verifikasi klaim ini sendiri
(`git log --oneline origin/master..origin/fix/sa610-internalaudit-register`) sebelum
bertindak — kalau ternyata berbeda, LAPORKAN dan berhenti.

⚠ TABRAKAN YANG SUDAH DIKETAHUI: migration/src/view_firmgl.tsx ada di PR #297 DAN
punya 287 baris suntingan lokal yang belum di-commit. Urutan operasi di bawah dipilih
justru karena ini.

═══════════════════════════════════════════════════════════════════════
LANGKAH — jangan diubah urutannya
═══════════════════════════════════════════════════════════════════════

LANGKAH 1 · MERGE DUA PR YANG SUDAH BERSIH — lakukan ini SEBELUM menyentuh
pekerjaan lokal, karena pekerjaan lokal harus di-rebase DI ATAS hasilnya.

  Untuk tiap PR (#297 dulu, lalu #296):
    a. `gh pr view <n> --json mergeStateStatus,statusCheckRollup`
    b. ⚠ CI PR BISA BASI. Kalau head PR lebih tua dari origin/master:
       `gh pr update-branch <n>` -> TUNGGU CI-nya selesai -> baru merge.
       Jangan merge berdasarkan centang hijau yang dihasilkan atas master lama.
    c. Merge. Lalu TUNGGU keempat workflow master selesai hijau sebelum PR berikutnya.
    d. `gh pr merge --delete-branch` bisa GAGAL dari dalam worktree padahal merge-nya
       MENDARAT. Periksa hasilnya, jangan mengulangi merge.

LANGKAH 2 · KIRIM DUA COMMIT YATIM (firmtax, time)

  ⛔ JANGAN commit/rebase/checkout di direktori kerja utama — ia memegang 45 berkas
     milik beberapa arc. `git checkout -- <berkas>` MENGHAPUS kerja belum-commit
     tanpa bisa dipulihkan. `git stash` atas 45 berkas lintas-arc juga terlarang.

  Pakai worktree terpisah:
    a. `git fetch origin` lalu buat worktree baru dari origin/master TERKINI
       (sesudah Langkah 1).
    b. Bootstrap: junction `node_modules`, `migration/node_modules`, `e2e/node_modules`
       -> pohon utama. TAPI `server/node_modules` harus `npm ci` NYATA — junction akan
       membuat `ensure-prisma-client` MERACUNI klien Prisma pohon utama.
    c. Cherry-pick 9dd1e57 (time) ke cabang sendiri; cherry-pick 0508891 (firmtax) ke
       cabang sendiri. SATU arc = SATU cabang = SATU PR. Jangan digabung.
    d. `npm run verify` dari root worktree, untuk MASING-MASING cabang, di atas master
       terkini. Tempelkan output. Jangan pipe ke `tail` — tail menelan exit code.
    e. Push, buka PR, tunggu CI.
    f. Bongkar worktree: `cmd /c rmdir` tiap junction DULU, baru `git worktree remove`.
       Periksa hitungan entri node_modules pohon utama sebelum & sesudah.

LANGKAH 3 · TRIASE 45 BERKAS BELUM DI-COMMIT

  JANGAN commit sekaligus. Kelompokkan per arc, lalu untuk tiap arc putuskan:
  KIRIM / PARKIR / CABUT. Peta arc yang sudah diverifikasi:

  arc firmgl+apar   M view_firmgl.tsx (287) · data_firmfin.ts · view_firmfinance.tsx
                    ?? apar_ratios.ts · use_firm_subledger.ts · firm_gl_export.ts
                       + 5 berkas uji
                    ⚠ view_firmgl.tsx juga disentuh #297 — rebase DI ATAS #297 yang
                      sudah mendarat, lalu periksa konflik SEMANTIK, bukan sekadar
                      tekstual. `mergeable: CLEAN` hanya berarti nol konflik teks;
                      auto-merge repo ini pernah melahirkan deklarasi GANDA tanpa
                      penanda konflik. Cari `grep -c "^<<<<<<< "` dan baca hasilnya.

  arc jet           M view_jet.tsx (146) · ?? jet_selection.ts + uji
  arc opening       M view_opening.tsx (462) · ?? opening_conventions.test.ts
  arc orgchart+
      succession    M view_pc_org.tsx (362) — BERKAS BERBAGI DUA MODUL
                    ?? org_structure.ts · succession_board.ts + uji
  arc a11y          M e2e/07-a11y-axe-keyboard.spec.ts (94) · wp_signoff.tsx ·
                       view_pipeline.tsx · ?? a11y_anchor_href.test.ts

  ⚠ TIGA MESIN BARU PUNYA NOL PEMANGGIL PRODUKSI (hanya uji-nya sendiri):
      home_composition.ts · mytasks_derive.ts · wip_adj.ts
    Ini persis pola kode mati yang adendum C-I larang, dan repo ini TIDAK punya
    gerbang variabel mati yang akan menangkapnya. Untuk masing-masing, tentukan:
      (i) memang menunggu keputusan Ari (mytasks_derive -> usulan-M2;
          wip_adj -> usulan-W1) => PARKIR, jangan commit, jangan disambungkan;
      (ii) tersambungnya lupa => sambungkan ke situs render + uji yang membuktikan
           situs itu berubah;
      (iii) tak ada rencana pemakaian => CABUT.
    JANGAN commit mesin tanpa pemanggil dengan alasan "nanti dipakai".

  Untuk tiap arc yang DIKIRIM: cabang sendiri dari origin/master, verify, PR sendiri.
  Untuk tiap arc yang DIPARKIR: jangan commit; laporkan usulan mana yang memblokirnya.

  ⚠ migration/eslint-suppressions.json (15 baris berubah) adalah berkas BERSAMA
    lintas arc. JANGAN jalankan `npm run lint:any-baseline` lalu commit seluruh
    berkas — itu akan menyeret perubahan arc lain. Stage bedah:
      `git show HEAD:migration/eslint-suppressions.json` -> sunting bagian milik arc
      ini saja -> `git hash-object -w` + `git update-index --cacheinfo`.
    Ingat: `npm run lint` bisa exit 2 TANPA mencetak error bila hitungan `:any` TURUN.

LANGKAH 4 · SAMPAH

  migration/nul (102 byte, 21 Ags) adalah artefak Windows dari `> nul` yang salah
  jalan. Baca isinya dulu untuk memastikan, lalu hapus.

═══════════════════════════════════════════════════════════════════════
⛔ LARANGAN
═══════════════════════════════════════════════════════════════════════

1. ⛔ JANGAN menjawab satu pun dari 9 usulan di docs/usulan-*.md. Semuanya keputusan
   metode akuntansi / alur kerja / kebijakan milik Ari. Kalau sebuah arc tak bisa
   dikirim tanpa jawabannya — PARKIR dan katakan usulan mana yang memblokirnya.
   Mengambil keputusan itu sendiri = pekerjaan ditolak seluruhnya.
2. ⛔ JANGAN memperbaiki cacat modul yang kamu temukan sambil lewat. Catat di laporan,
   jangan sentuh. Tugas ini pengiriman, bukan perbaikan.
3. ⛔ JANGAN menggabungkan dua arc dalam satu PR supaya "lebih cepat".
4. ⛔ JANGAN commit di direktori kerja utama sampai Langkah 3 memutuskan arc-nya.
5. ⛔ JANGAN menghapus cabang/worktree tanpa membuktikan isinya sudah ada di master
   (bandingkan pohon, bukan pesan commit).

═══════════════════════════════════════════════════════════════════════
SELESAI berarti SEMUA ini benar
═══════════════════════════════════════════════════════════════════════

[ ] #296 dan #297 mendarat; keempat workflow master hijau sesudah masing-masing.
[ ] Commit time (9dd1e57) dan firmtax (0508891) punya PR sendiri, CI hijau,
    di-verify DI ATAS master terkini — output `npm run verify` ditempelkan untuk
    masing-masing.
[ ] Setiap arc dari 45 berkas berstatus jelas: KIRIM (nomor PR) / PARKIR (usulan
    pemblokir disebut) / CABUT (alasan disebut). Tidak ada berkas tanpa status.
[ ] Tiga mesin nol-pemanggil sudah diputuskan: parkir, disambungkan, atau dicabut.
    Tidak ada yang di-commit dalam keadaan tanpa pemanggil.
[ ] eslint-suppressions.json: hanya bagian milik arc yang dikirim yang ikut ter-commit.
[ ] migration/nul hilang.
[ ] Direktori kerja utama: `git status --porcelain` hanya menyisakan berkas yang
    sengaja DIPARKIR, dan daftarnya disebut satu per satu di laporan.
[ ] Tidak ada worktree/junction yang tertinggal; hitungan node_modules pohon utama utuh.

LAPORAN — format tetap:
  · Tabel: arc -> status -> nomor PR / usulan pemblokir
  · Output verify untuk tiap PR baru
  · Klaim keadaan awal mana yang ternyata SALAH saat kamu verifikasi ulang
  · Cacat modul yang kamu lihat sambil lewat (dicatat, TIDAK diperbaiki)
  · Apa yang TIDAK dikerjakan dan kenapa
```

---

## Blokir yang bukan milik agen — Gelombang 0.4

Tiga usulan memblokir arc yang **berkasnya sudah terlanjur ditulis**. Selama belum
dijawab, tiga arc itu hanya bisa DIPARKIR, dan Gelombang 0 tidak bisa tuntas 100%.

| Usulan | Memblokir | Pertanyaan |
|---|---|---|
| [`usulan-M2`](../usulan-M2-mytasks-sumber-kebenaran.md) | `mytasks_derive.ts` — nol pemanggil | My Tasks jadi konsumen `tasks.mine`, atau `tasks.mine` yang diperluas? |
| [`usulan-W1`](../usulan-W1-wip-writedown-otorisasi.md) | `wip_adj.ts` — nol pemanggil | Write-down WIP: efek dulu, atau otorisasi dulu? |
| [`usulan-O1b`](../usulan-O1b-opening-kertas-kerja-per-perikatan.md) | arc `opening` — 462 baris tersunting | Saldo awal jadi kertas kerja yang diisi auditor? |

Enam sisanya memblokir gelombang berikutnya, bukan Gelombang 0:
[`A3`](../usulan-A3-apar-pembayaran-utang-ke-buku-besar.md) ·
[`J`](../usulan-J-jet-impor-gl-populasi.md) ·
[`S1`](../usulan-S1-gerbang-variabel-mati.md) ·
[`TB3`](../usulan-TB3-bobot-fase-timebudget.md) ·
[`IA6`](../usulan-IA6-internalaudit-skor-dan-signoff.md) ·
[`IA7`](../usulan-IA7-internalaudit-register-penggunaan-karangan.md)

> `usulan-S1` (gerbang variabel mati) layak diperhatikan lebih dulu daripada
> urutannya menyarankan: ketiadaan gerbang itulah yang membuat tiga mesin nol-pemanggil
> di Langkah 3 bisa lolos tanpa terdeteksi sejak awal.
