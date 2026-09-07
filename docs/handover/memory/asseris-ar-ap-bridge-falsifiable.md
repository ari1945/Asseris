---
name: asseris-ar-ap-bridge-falsifiable
description: Arc 2026-08-15 - jembatan AR/AP dari register + status rekonsiliasi diturunkan dari angka (dulu ditentukan ada-tidaknya note); PR #240; baris Kas kini jujur merah
metadata:
  type: project
---

Arc **2026-08-15**, cabang `feat/ar-ap-bridge-falsifiable`,
**[PR #240](https://github.com/ari1945/Asseris/pull/240) MERGED** (squash, 9/9 CI hijau).
`origin/master` = **`4d6bf52`**.
PRD `docs/prd-ar-ap-bridge-falsifiable.md` → **Implemented**. Jawaban Ari: "sesuai
rekomendasi" (Q-1=a kas hanya status logic · Q-2=a blokir ekspor LK · Q-3=a seed menutup).
Lanjutan dari Q-1 [[asseris-wip-rollforward-falsifiable]].

**Dua cacat dicabut:**
1. Plug `reconciling = control − open` di `arAging()` & `ap()` — AR Rp 1.745 jt atas
   sub-buku 2.695 (65%), AP Rp 697 jt atas 1.123 (62%); PROPORSIONAL LEBIH BESAR dari
   plug WIP (58%). Sub-bukunya sendiri jujur; yang dikarang hanya jembatannya, dan
   penamaannya ("+ termin/retensi", "+ akrual") terjadi **di VIEW**, bukan di mesin —
   jadi grep di lapisan data saja TIDAK akan menemukannya.
2. **Temuan terbesar arc ini:** `reconciliations()` menetapkan status dengan
   `|recon| < 1e6 ? 'tied' : (note ? 'bridged' : 'open')`. Keempat baris punya `note`
   hardcode → `'open'` MUSTAHIL. Selisih berapa pun selalu badge biru "Terjembatani".
   Yang menentukan sebuah akun kontrol dinyatakan terjembatani bukan apakah ada yang
   menjembataninya, melainkan apakah seseorang pernah menulis sebuah kalimat.

**Pola yang layak dicari di tempat lain:** status/badge yang bergantung pada KEBERADAAN
string, bukan pada nilai. Grep `? '...' : (note ?` atau sejenisnya.

**Utang saya sendiri dari #239 yang ikut ditutup:** `reconciliations()` masih menghitung
baris WIP dengan logika lama, sehingga tab Sumber Kebenaran BERTENTANGAN dengan modul WIP
untuk akun yang sama. Pelajaran: memperbaiki mesin di satu modul tidak otomatis menyapu
agregator lintas-modul — inventaris konsumen SEBELUM menutup arc.

**KONFLIK JAWABAN yang muncul saat implementasi:** Q-1(a) (jangan sentuh jembatan Kas) dan
Q-3(a) (demo menutup) tak bisa keduanya berlaku. Saya memilih jujur → baris Kas merah
(sisa Rp 2.055 jt) dan ekspor LK terkunci. Ini justru memberi keadaan MERAH untuk
verifikasi hidup secara gratis, tanpa perlu merusak seed.

**Temuan lanjutan (tak dicari):** `BANK_RECON` — satu-satunya register yang diklaim
menjelaskan selisih kas — hanya mencakup **satu rekening** (BCA-OPS) & **satu periode**
(Feb 2026), item belum-cocok **Rp 68 jt = 3%** dari selisih Rp 2.055 jt. Kalimat lama
"selisih kurs & item rekonsiliasi bank" TIDAK didukung data. Menutupnya butuh register
rekonsiliasi bank multi-rekening → arc tersendiri.

**GOTCHA — backtick di `git commit -m "…"`.** Tanda backtick di dalam string kutip-ganda
bash MENJALANKAN perintah; pesan commit saya kehilangan kata `note`. Pakai heredoc
`-F - <<'EOF'` untuk pesan commit yang memuat kode.

Uji +12 (total 1781), termasuk uji perusak seed AR & AP. Ratchet `:any` tetap 8058.
