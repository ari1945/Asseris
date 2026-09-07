---
name: asseris-icon-button-names
description: "PR #250 merged — 68 tombol ikon-saja diberi nama aksesibel + gerbang statik; pelajaran \"definisi longgar melahirkan 187 temuan palsu\" dan \"ikon X bukan selalu Tutup\""
metadata: 
  node_type: memory
  type: project
  originSessionId: 712d85bf-6018-4587-ab87-3eb497e4e28c
  modified: 2026-08-15T12:40:52.422Z
---

**PR [#250](https://github.com/ari1945/Asseris/pull/250) MERGED 2026-08-15** — `origin/master` = **`05ff15b`**. Verify hijau di master pasca-merge: **1857** uji frontend + 431 server. Penutup rantai a11y [[asseris-a11y-badge-button-native]] → [[asseris-firmjvform-overlay-contract]] → [[asseris-field-label-sweep]] → ini.

68 tombol yang isinya persis satu ikon kini punya `aria-label`. Gerbangnya `migration/src/a11y_icon_buttons.test.ts`.

## PELAJARAN UTAMA — definisi longgar melahirkan temuan palsu

Pemindai "tombol tanpa teks harfiah" melaporkan **187** situs. **Mayoritas palsu**: `<button>{m.label}</button>` dan `<button>{busy ? 'Mengekstrak…' : …}</button>` memang merender teks, hanya lewat ekspresi JSX. Angka sebenarnya dengan definisi KETAT (isi = persis satu elemen self-closing) adalah **68**.

**How to apply:** saat membangun gerbang, pilih definisi yang **nol false positive** meski cakupannya lebih sempit. Gerbang berisik akan dimatikan orang, dan angka yang dilebih-lebihkan merusak kepercayaan pada laporan. Sama seperti [[asseris-field-label-sweep]]: versi pertama gerbang di sana juga over-report (161 vs 160) sebelum diperketat.

## PELAJARAN — ikon yang sama TIDAK berarti aksi yang sama

Dari 50 tombol `<I.x/>`, hanya **45** berarti "Tutup". Sisanya: `remove(i)` → "Hapus baris", `setStatus(…,'Ditolak')`/`decideGift(…,'Ditolak')` → "Tolak", dua `setQ('')` → "Bersihkan pencarian". Memberi label "Tutup" ke semuanya = memasang nama **salah** pada tombol yang menghapus data.

**How to apply:** turunkan label dari **handler**-nya, bukan dari ikonnya. Nama tab/modul ambil dari sumber (`tabs` array / `MODULES`) supaya jujur — mis. "Buka tab Risk Register", bukan tebakan.

Untuk TOGGLE, nama WAJIB mengikuti keadaan: `aria-label={on ? 'Hapus tanda bintang' : 'Beri tanda bintang'}`. Pola lama `title="Bintangi"` tetap (tidak berubah saat aktif) — lemah, masih ada di `view_mytasks_parts.tsx`.

## GOTCHA berulang — heredoc bash MEMAKAN backslash

Menulis skrip `.mjs` lewat `cat > f <<'EOF'` merusak `src[i-1] !== '\\'` menjadi `'\'` → SyntaxError. Kena DUA KALI sesi ini. **Pakai tool Write untuk skrip apa pun yang memuat backslash**, jangan heredoc.

## GOTCHA — gerbang baru vs PR sesi lain yang merge di antaranya

#247 (sesi lain) merge ANTARA CI saya dan merge saya, jadi kombinasi kode barunya dengan dua gerbang a11y baru **tak pernah diuji bersama**. Wajib jalankan `npm run verify` di master pasca-merge. (Kali ini hijau.) Lihat R-7 di BUILD.md.

## Sisa utang a11y terukur

- **35 node critical**: kontrol TANPA `<label>` sama sekali — input inline tabel kovenan, slider, select `≥/≤`. `goingconcern` 16 `label` + 9 `select-name`, `sa540` 7, `sa520` 2, `tasks` 1. Butuh `aria-label` berbasis konteks baris; **bukan** kandidat codemod, perlu keputusan Ari soal bunyinya.
- ~~`view_firm.tsx:169` tombol amplop tanpa `onClick`~~ → **DICABUT di [#252](https://github.com/ari1945/Asseris/pull/252)** (`master` = `737f875`). **PELAJARAN: menamai kontrol MATI lebih buruk daripada membiarkannya tak bernama** — `aria-label` yang saya tambahkan di #250 justru membuat pembaca layar lebih mudah menemukannya, lalu tak terjadi apa-apa. Gerbang yang menuntut nama TIDAK boleh dipatuhi secara buta; periksa dulu kontrolnya hidup atau tidak.
- **KELAS SISTEMIK BARU — 71 tombol TANPA handler apa pun** (`<button>`/`<Btn>` tanpa `onClick`, bukan `type="submit"`, tidak `disabled`, tidak meneruskan props) di ~45 berkas. Termasuk **"Tambah Kontak"** tepat di bawah tombol yang dicabut, dan banyak `variant="primary"` di modul SJAH/SPR/SA yang tampak seperti aksi utama halaman. Mencabut/menghidupkan = keputusan produk PER-TOMBOL, bukan sapuan mekanis. Skrip pemindainya: pola `tagEnd` + daftar atribut handler (lihat berkas ini & `a11y_icon_buttons.test.ts`).
- Satu label (`view_mytasks.tsx:42`, bintang) **tak terbukti hidup** — komponen yang benar-benar dirender di rute Tugas berasal dari berkas lain.
