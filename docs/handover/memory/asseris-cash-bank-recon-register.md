---
name: asseris-cash-bank-recon-register
description: "Arc 2026-08-15 - kas menutup ke buku besar (sub-akun per rekening) + revaluasi PSAK 10 dibukukan; PR #247 & #249"
metadata: 
  node_type: memory
  type: project
  originSessionId: db7766d9-cfb7-4c52-8e3b-3b92ad92575b
  modified: 2026-08-15T10:45:28.243Z
---

Arc **2026-08-15**, utang TERAKHIR dari [[asseris-checkpoint-2026-08-15]] — **SELESAI**.
PRD `docs/prd-cash-bank-reconciliation-register.md` → **Implemented**. Dua PR bertumpuk,
**keduanya MERGED**: **[#247](https://github.com/ari1945/Asseris/pull/247)** (F-1..F-3,
`f62ea7f`) & **[#249](https://github.com/ari1945/Asseris/pull/249)** (F-4+Q-6, `e831df2`).
`origin/master` = **`e831df2`**, uji **1862**. "Proceed." tanpa koreksi ⇒ Q-1..Q-6 opsi (a).

**Rebase PR bertumpuk:** saat base-branch #247 di-merge & dihapus, #249 harus
`gh pr edit --base master` LALU rebase. Commit PRD-nya bentrok karena sudah masuk master
lewat squash → `git rebase --skip`; git juga membuang sendiri commit yang isinya upstream.
Master bergerak dua kali di tengah arc (#248, #250 dari sesi lain) — selalu verify ulang
di atas gabungannya sebelum merge.

## Cacatnya — STRUKTURAL, bukan angka salah

Baris Kas `open` sejak #240, sendirian mengunci ekspor LK. Σ rekening 10.475 jt vs kontrol
8.420 jt = **2.055 jt, 97% tanpa pemilik**. Akarnya: **SATU akun kas `1-100` untuk ENAM
rekening** ⇒ saldo BUKU per rekening — satu sisi dari setiap rekonsiliasi bank — tak dapat
diturunkan dari mana pun. Rekonsiliasi lima rekening bukan "belum dikerjakan", ia
**mustahil dirumuskan**. Plus: `BANK_RECON` berperiode Februari sementara jurnal Maret;
`FX_BOOK` konstanta privat di dalam view; tak ada akun laba/rugi kurs.

## PEMBEDAAN PENTING — jangan over-generalisasi pola #242

`BANK_ACCOUNTS[].balance` **tetap literal dan memang harus**. Itu saldo menurut BANK — data
eksternal; seluruh guna rekonsiliasi adalah mempertemukan **dua sumber independen**. Pola
"hapus literal, turunkan dari GL" dari [[asseris-budget-actual-ledger-derived]] SALAH bila
diterapkan ke sisi bank. Yang hilang adalah sisi BUKU-nya.

## JEBAKAN YANG HAMPIR SAYA BANGUN SENDIRI

Versi pertama: `bridgeTotal = −(reval + (Σbank − kontrol))` ⇒ `residual` **nol SECARA
ALJABAR**, badge hijau selamanya. Persis **R-1 yang PRD itu tulis sendiri** dan kelas cacat
`note` hardcode #240. **Aturan umum: komponen jembatan harus DIENUMERASI (dijumlah dari
baris register / dihitung dari kurs), tak boleh diturunkan dari selisih yang hendak
dijelaskannya.** Ketahuan hanya karena SC-6 mewajibkan gerbang dibuktikan merah.

## GOTCHA BESAR — `mergeSeedJournals` menyembuhkan yang HILANG, bukan yang BERUBAH

Ditemukan hidup. Memecah `1-100` mengubah `dr/cr` empat jurnal kas; cache `firmgl` lama
tetap memenangkan `cr: '1-100'` — akun yang **sudah tidak ada** — sehingga **NOL jurnal
menyentuh kas**, saldo kini = saldo awal, kontrol Kas melonjak **8.420 → 10.705 jt**.
Neraca tetap "seimbang ✓". **Cacat ketiga berturut-turut dari kelas cache-persist-vs-seed.**
Aturan sekarang: **SEED otoritatif atas ISI, PENYIMPANAN otoritatif atas field yang benar-
benar dapat disunting** (`posted` untuk jurnal, `matched` untuk baris rekonsiliasi).
Deteksi basi harus membandingkan ISI, bukan identitas objek (`j !== gl[i]` selalu true
setelah spread).

## Konsekuensi yang disengaja

Revaluasi PSAK 10 diposting (JV-0319/0320, akun `5-600` bertipe Beban bersaldo KREDIT agar
"Pendapatan KAP" tak digelembungkan) ⇒ **laba operasi 2.800 → 2.860,638 jt**, satu-satunya
figur firma yang bergerak. Dan **gerbang cakupan #242 langsung memerah** sampai baris
anggaran 5-600 ditambah — bukti lapangan gerbang kemarin bekerja.

## Empat label basi, lolos typecheck & 1.860 uji

`POSISI KAS (GL 1-100)` atas akun yang dihapus · keterangan baris Kas yang masih menyebut
revaluasi sebagai penjelas · `ekuiv. kurs buku` setelah basis pindah ke kurs penutup ·
akun default tab Buku Besar. **Hanya terlihat di layar.**

Uji 1829 → **1860**. Ratchet `:any` 8056 → **8021**.
GOTCHA operasional: tiap perubahan berkas data memicu full-reload Vite dan **sesi login
putus**; saya tak boleh mengisi kata sandi → kumpulkan seluruh pemeriksaan hidup dalam
SATU sesi, jangan reload di tengah.
