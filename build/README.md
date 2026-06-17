# Pra-kompilasi NeoSuite AMS — boot ~60 dtk → ~2-3 dtk

Aplikasi versi pengembangan (`NeoSuite AMS.html`) mentranspilasi **~140 file JSX di browser** dengan Babel setiap kali dibuka. Itu sebabnya boot lambat. Pipeline ini mentranspilasi **sekali di mesin Anda**, lalu menghasilkan HTML produksi yang memuat JavaScript biasa (tanpa Babel di browser).

## Yang Anda butuhkan
- **Node.js 18+** (cek: `node -v`)

## Langkah (sekali)
```bash
cd build
npm install        # pasang @babel/core + @babel/preset-react (lokal, tidak global)
npm run build      # transpilasi semua JSX + buat HTML produksi
```

Hasil:
- `app/compiled/*.js` — ~167 file JSX yang sudah jadi JS biasa
- `app/vendor/*.js` — React & ReactDOM lokal (diunduh sekali; lihat "Offline" di bawah)
- **`NeoSuite AMS (prod).html`** — buka file INI untuk produksi (boot ~2-3 dtk, **jalan tanpa internet**)

## Saat Anda mengubah kode
Setiap kali mengedit file `app/*.jsx`, jalankan ulang:
```bash
cd build && npm run build
```
Atau biarkan otomatis saat ngoding:
```bash
cd build && npm run watch     # recompile tiap .jsx berubah; Ctrl+C berhenti
```

## Alur kerja yang disarankan
| Saat | Buka file |
|---|---|
| **Mengembangkan / mengedit** | `NeoSuite AMS.html` (langsung lihat perubahan, tak perlu build) |
| **Demo / produksi / deploy** | `NeoSuite AMS (prod).html` (cepat) — jalankan `npm run build` dulu |

`NeoSuite AMS.html` (versi dev) tetap utuh dan jadi **satu-satunya sumber kebenaran**. HTML produksi dibuat ulang otomatis dari sana — **jangan edit `NeoSuite AMS (prod).html` atau `app/compiled/*.js` dengan tangan**, perubahan akan tertimpa saat build berikutnya.

## Apa yang berubah & apa yang tidak (penting untuk korektness)
- **Transformasi**: hanya JSX (`@babel/preset-react`, `sourceType: "script"`). Ini **identik** dengan yang Babel-standalone lakukan di browser → scope global, urutan boot, dan aturan anti-tabrakan CLAUDE.md **tetap sama persis**.
- **Tidak ada bundling/minifikasi kode Anda** — tiap file tetap satu file `<script>` terpisah dengan urutan yang sama. Mudah di-debug, risiko perubahan perilaku minimal.
- **React/ReactDOM** ditukar ke build *production* (lebih kecil & cepat, tanpa peringatan dev) dan **di-self-host** (lokal, tanpa internet).

## Offline / self-host React (sudah otomatis)
Saat `npm run build` **pertama kali**, skrip mengunduh React & ReactDOM ke `app/vendor/` (butuh internet **saat itu saja**). HTML produksi lalu memuat React dari file lokal itu — sehingga **`NeoSuite AMS (prod).html` jalan 100% tanpa internet**, di mana pun.
- Build berikutnya: bila `app/vendor/*.js` sudah ada, langkah unduh **dilewati** (tak perlu internet lagi).
- Mau memaksa unduh ulang (mis. ganti versi React)? Hapus folder `app/vendor/` lalu build lagi.
- Gagal di build pertama ("Gagal mengunduh…")? Berarti tidak ada internet saat itu — sambungkan internet sekali, jalankan ulang `npm run build`.

## Catatan
- **SRI (integrity)**: atribut `integrity` pada tag React dilepas di HTML produksi (file lokal, hash berbeda dari dev). Karena React kini dimuat dari berkas Anda sendiri (bukan CDN pihak ketiga), SRI tidak lagi diperlukan untuk file tersebut.
- **Jika ada file gagal kompilasi**, skrip mencetak nama file + pesan errornya dan keluar dengan kode non-nol. Perbaiki sintaks di file itu, jalankan ulang.
- **Folder yang bisa di-`.gitignore`** (karena hasil generate): `app/compiled/`, `app/vendor/`, `NeoSuite AMS (prod).html`, `build/node_modules/`.
