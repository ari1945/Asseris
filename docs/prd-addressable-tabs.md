# PRD — Tab yang Beralamat: hash sebagai cermin state, bukan jejak sekali-pakai

> Wajib diisi sebelum implementasi apa pun. Implementasi TIDAK dimulai sebelum sign-off ("Proceed.").

| Field | Isi |
|---|---|
| Tanggal | 2026-08-14 |
| Pemilik | Ari Widodo |
| Status | Draft — menunggu sign-off ("Proceed.") |
| Engagement ID terkait | — (lintas-aplikasi; router `app.tsx`, hook `contexts.tsx`, 72 modul bertab) |
| PRD terkait | Kontrak Overlay & objek beralamat (arc `route_hash.ts`) — PRD ini melanjutkannya ke sumbu tab |
| Ditemukan | Tinjauan visual hidup 2026-08-14 (V-9), saat menutup utang tinjauan PR-8a-1/8b |
| Prasyarat | Tidak ada. Berdiri sendiri, tak bergantung arc SMM |

---

## 1. Problem

Aplikasi menyatakan dirinya "beralamat": `route_hash.ts` menyerialkan
`#/<route>[/<sel>][?tab=]`, `useInitialTab` membaca `?tab=` saat mount, dan CLAUDE.md §5
mencantumkan alamat hash sebagai pola yang harus diikuti. Kenyataannya sumbu **tab**
hanya beralamat satu arah, sekali, saat mount.

**Dibuktikan hidup pada dua modul (2026-08-14, master `6c3cbfc`):**

| Langkah | Hash | Yang tampil |
|---|---|---|
| Buka `#/soqm?tab=objectives` | `?tab=objectives` | Tujuan Mutu ✓ |
| Klik tab "Dokumentasi SMM" | `?tab=objectives` ✗ | Dokumentasi SMM |
| Buka `#/wtb?tab=drill` | `?tab=drill` | Analisis Pergerakan ✓ |
| Klik tab "Pemetaan FS" | `?tab=drill` ✗ | Pemetaan FS |

Akibat yang dirasakan pengguna:

1. **Alamat berbohong.** Bilah alamat menyebut tab yang berbeda dari yang dilihat.
2. **Berbagi tautan mengirim orang ke layar lain.** Salin URL saat menatap Dokumentasi
   SMM → penerima mendarat di Tujuan Mutu. Untuk aplikasi audit, "lihat layar yang saya
   lihat" adalah primitif kerja, bukan kenyamanan.
3. **Reload memindahkan pengguna.** Muat ulang saat bekerja di satu tab melempar ke tab lain.
4. **Back tampak rusak.** Setelah berpindah beberapa tab, Back tidak mengembalikan apa pun —
   pembaca `hashchange` hanya merekonsiliasi `route`.

**Akar teknis:**

- `app.tsx:184–194` — satu-satunya penulis hash adalah `navigate()`. `setTab` lokal modul
  tidak melewatinya, jadi perubahan tab tak pernah ditulis.
- `app.tsx:202–212` — pembaca `hashchange` hanya menyalin `loc.route` ke state.
  `loc.tab` dan `loc.sel` **diabaikan**, sehingga Back/Forward & URL yang ditempel ke tab
  berjalan tak pernah memulihkan tab.
- `app.tsx:216–222` — efek "perbaikan alamat" memanggil `buildHash({ route })` **tanpa**
  `tab`/`sel`; setiap kali ia menembak, sumbu tab & seleksi dibuang dari URL.
- `contexts.tsx:292` — `useInitialTab` adalah `useState(initializer)`: murni baca-saat-mount.

**Skala:** 72 view memakai `<Tabs>`; hanya **11** memakai `useInitialTab`
(`aje` `confirm` `governance` `opening` `psak14` `psak16` `risk` `sa530` `soqm` `wtb`).
Jadi 61 modul bertab tidak beralamat sama sekali, dan 11 sisanya beralamat separuh.

Ini bukan cacat kosmetik: ia adalah **kontrak yang dinyatakan tetapi tidak ditegakkan**.
Pola yang sama sudah dua kali menghasilkan cacat di repo ini — mesin benar, jalur
tampilan/penulisan tak disapu tuntas.

---

## 2. Objective

Menjadikan tab sebagai bagian sah dari alamat: **hash mencerminkan state yang terlihat,
dan state mengikuti hash saat hash berubah dari luar.**

Turunannya:
- URL yang disalin membuka layar yang sama persis.
- Reload mempertahankan tempat kerja.
- Back/Forward berperilaku sesuai harapan pengguna atas sumbu tab (lihat Q-2).
- Kontrak tunggal, bukan 72 salinan logika per modul.

## 3. Success Criteria

| # | Kriteria | Cara uji |
|---|---|---|
| SC-1 | Mengubah tab menulis `?tab=` ke hash pada modul yang beralamat | uji unit hook + e2e |
| SC-2 | `hashchange` dari luar (Back/Forward/tempel URL) memulihkan tab tanpa reload | uji e2e |
| SC-3 | Tak ada gelung tak hingga antara penulis & pembaca hash | uji: satu perubahan tab = tepat satu entri/penggantian riwayat |
| SC-4 | Efek perbaikan alamat tidak lagi membuang `tab`/`sel` yang sah | uji unit atas `app.tsx` |
| SC-5 | `?tab=` milik modul lain tidak bocor saat berpindah modul | uji: `#/wtb?tab=drill` → nav ke `soqm` tidak menyeed `drill` |
| SC-6 | `?tab=` tak dikenal tidak memutih/menggantung halaman — jatuh ke fallback modul | uji unit |
| SC-7 | Tak ada modul yang kehilangan perilaku tab yang sekarang benar | suite penuh tetap hijau |
| SC-8 | Modul yang dimigrasi memakai SATU hook bersama, bukan salinan logika | tinjauan kode + gerbang lint/grep |

## 4. Scope

- `contexts.tsx` — `useInitialTab` naik menjadi hook tab beralamat yang mengembalikan
  `[tab, setTab]` dengan bentuk pemanggilan **tidak berubah**, sehingga 11 modul yang sudah
  memakainya ikut sembuh tanpa disentuh.
- `app.tsx` — pembaca `hashchange` menghormati `loc.tab`; efek perbaikan alamat berhenti
  membuang `tab`/`sel`.
- Uji: unit atas hook & `route_hash`, e2e atas perjalanan bagikan-tautan/reload/Back.
- Migrasi modul bertab yang belum beralamat — **bertahap, cakupannya ditentukan Q-1.**

## 5. Non-Scope

- **Sumbu seleksi (`sel`).** `useInitialSelection` sengaja **mengonsumsi** kuncinya
  (one-shot) — mengubahnya jadi beralamat mengubah kontrak yang berbeda, dengan
  pertanyaan sendiri (apakah baris terpilih layak masuk URL? bagaimana bila baris itu
  sudah tak ada?). Lihat Q-3; bila dijawab "ya", ia layak PRD sendiri.
- Migrasi ke router pihak ketiga (React Router dsb.). Hash router yang ada sudah cukup;
  menukarnya adalah pekerjaan yang jauh lebih besar dengan manfaat yang tak diminta.
- Menjadikan state overlay/dialog beralamat.
- Query string di luar `tab` (filter, sort, halaman tabel).

## 6. Constraints

- **Riwayat peramban tak boleh dibanjiri.** Komentar `app.tsx:178–183` sudah memilih
  `replaceState` untuk perpindahan intra-modul justru karena alasan ini. Q-2 memutuskan
  apakah pilihan itu bertahan setelah tab menjadi beralamat.
- **Penjaga anti-gelung wajib dipertahankan.** Penulis dan pembaca hash saling memicu;
  disiplin yang ada ("no-op bila hash sudah cocok dengan state") harus tetap eksplisit.
- Tanpa `window` di kanon; hook boleh menyentuh `location`/`history` dengan `try/catch`
  (mode privat, SSR-safe) seperti kode sekarang.
- Ratchet `:any` & skala tipografi tetap berlaku.
- `master` selalu hijau (R-7).

## 7. Existing Solutions — apa yang sudah ada

**Jangan bangun ulang.** Yang sudah tersedia dan benar:

- `route_hash.ts` — `parseHash` · `buildHash` · `sameLocation` · `initialLocation`, lengkap
  dengan enkode/dekode dan uji round-trip. **Serialisasi sudah selesai**; yang kurang hanya
  pemanggilnya.
- `navigate(id, { from, tab, sel })` di `app.tsx` sudah menulis `?tab=` dengan benar
  ketika tab diberikan — jalur `nav('soqm',{tab:'evaluation'})` dari Governance berfungsi.
- `useInitialTab` sudah mengutamakan URL di atas one-shot `sessionStorage`, dan sudah
  membatasi diri pada hash yang menunjuk modul ini (anti-bocor).
- `sessionStorage['ams.navtab.<id>']` one-shot untuk navigasi internal — teruji sejak
  2026-07-18; PRD ini tidak mencabutnya.

Artinya pekerjaannya **kecil dan terpusat**, bukan penulisan ulang router.

## 8. Proposed Approach

1. **Hook tab beralamat di `contexts.tsx`.** Pertahankan nama & tanda tangan
   `useInitialTab(moduleId, fallback)` → `[tab, setTab]`. Perubahannya:
   - `setTab` menulis `buildHash({ route: moduleId, tab })` (mempertahankan `sel` yang ada
     di hash) lewat `history.replaceState`/`pushState` sesuai Q-2;
   - berlangganan `hashchange`; bila hash menunjuk modul ini dan `tab`-nya berbeda,
     state disinkronkan;
   - no-op bila nilai sudah sama — penjaga anti-gelung.

   Karena tanda tangannya tetap, **11 modul sembuh tanpa satu baris pun disentuh**.

2. **`app.tsx` berhenti membuang alamat.** Efek `[route]` membangun hash dari
   `parseHash(location.hash)` yang ada (mempertahankan `tab`/`sel`) alih-alih
   `buildHash({ route })` telanjang.

3. **Pembaca `hashchange` menyerahkan sumbu tab ke hook.** Router tetap hanya mengurus
   `route`; hook per-modul yang mengurus `tab`. Ini menjaga tanggung jawab tetap terpisah
   dan menghindari router menyimpan state milik modul.

4. **Migrasi bertahap** modul bertab lain: ganti `useState(<fallback>)` menjadi
   `useInitialTab('<moduleId>', <fallback>)`. Mekanis, satu baris per modul, dapat
   diverifikasi dengan grep. Cakupan & urutannya = Q-1.

## 9. Risks

| # | Risiko | Mitigasi |
|---|---|---|
| R-1 ⚠ | **Gelung penulis↔pembaca** — `setTab` menulis hash, `hashchange` menyeed state, memicu tulis lagi. Ini membekukan aplikasi, bukan sekadar mengganggu. | No-op wajib di KEDUA sisi bila nilai sudah sama; uji khusus SC-3 menghitung entri riwayat per satu perubahan tab. |
| R-2 | **Banjir riwayat** — 20 klik tab = 20 tekan Back sebelum keluar modul. | Q-2. Bila `pushState` dipilih, pertimbangkan hanya mem-*push* perpindahan tab yang disengaja, bukan yang lahir dari sinkronisasi. |
| R-3 | **Regresi senyap pada 11 modul yang kini sudah benar.** | SC-7: suite penuh hijau; tambahkan e2e minimal untuk `soqm` & `wtb` yang menjadi bukti V-9. |
| R-4 | **`?tab=` basi setelah tab di-rename** — tautan lama menunjuk id yang tak ada. | SC-6: jatuh ke fallback modul, jangan halaman kosong. |
| R-5 | Migrasi 61 modul menyentuh banyak berkas sekaligus → tinjauan sulit. | Pecah per PR menurut ruang kerja; jangan satu PR raksasa. Q-1 boleh membatasi ke modul yang paling sering dibagikan. |
| R-6 | Perubahan router memengaruhi seluruh aplikasi; regresi di sini memutus navigasi total. | Fase 1 (hook + router) dikirim dan diverifikasi HIDUP lebih dulu, terpisah dari migrasi modul. |

## 10. Implementation Plan

| Fase | Isi | Kriteria |
|---|---|---|
| **F-1** | Hook tab beralamat + perbaikan `app.tsx` (pembuang alamat & pembaca). Tanpa migrasi modul. | SC-1..SC-4, SC-6, SC-7 |
| **F-2** | Uji e2e perjalanan: bagikan-tautan · reload · Back/Forward, atas `soqm` & `wtb`. | SC-2, SC-3, SC-5 |
| **F-3** | Migrasi modul bertab yang belum beralamat, bertahap per ruang kerja. | SC-8, SC-7 |

F-1 & F-2 layak satu PR (keduanya kecil dan saling membuktikan). F-3 beberapa PR.

**Verifikasi hidup wajib**, bukan opsional: cacat ini lolos dari 1631 uji dan hanya
terlihat saat aplikasi dijalankan. Setiap fase diverifikasi di peramban sebelum ditutup.

## 11. Open Questions

**Q-1 · Cakupan migrasi F-3.** 61 modul bertab belum beralamat sama sekali. Semua,
atau hanya yang tautannya benar-benar dibagikan antar-anggota tim?
- **(a)** Semua 72 — konsisten, tetapi menyentuh banyak berkas untuk manfaat yang tak
  merata (banyak modul tak pernah dibagikan per-tab).
- **(b)** Hanya modul kerja perikatan & mutu yang sering dirujuk dalam diskusi
  (`soqm` `governance` `wtb` `aje` `risk` `execution` `eqr` `confirm` …), sisanya menyusul
  bila ada permintaan nyata. ← *dugaan saya: ini yang sepadan*
- **(c)** Tidak ada migrasi; hanya F-1/F-2 sehingga 11 modul yang ada menjadi benar.

**Q-2 · Semantik riwayat untuk perpindahan tab.** Sekarang perpindahan intra-modul
memakai `replaceState` ("supaya riwayat tak dibanjiri", `app.tsx:178`).
- **(a) Tetap `replaceState`** — Back keluar modul, tidak pernah kembali ke tab sebelumnya.
  Alamat menjadi jujur & tautan bisa dibagikan, tetapi Back tetap tak memulihkan tab.
- **(b) `pushState`** — Back menyusuri tab yang dikunjungi; sesuai harapan sebagian besar
  pengguna, dengan ongkos riwayat lebih panjang.
- **(c) Hibrida** — `pushState` untuk klik tab yang disengaja, `replaceState` untuk
  penyeedan awal/sinkronisasi. Paling sesuai harapan, paling banyak logikanya.

Ini menentukan apakah keluhan "Back tampak rusak" benar-benar tertutup atau hanya
berkurang. Saya condong ke **(c)**, dengan **(a)** sebagai pilihan aman bila ingin
perubahan sekecil mungkin.

**Q-3 · Apakah sumbu seleksi (`sel`) ikut?** Saat ini Non-Scope. Menjadikan baris terpilih
beralamat berguna ("lihat AJE-014 yang saya maksud") tetapi mengubah kontrak one-shot
`useInitialSelection` dan memunculkan pertanyaan baru (baris yang sudah dihapus, isolasi
per-perikatan W7.5 atas id yang muncul di URL). Jawab **tidak** untuk sekarang, atau
**ya** dan ia mendapat PRD sendiri?

---

## Lampiran — bukti reproduksi (2026-08-14, master `6c3cbfc`)

Tinjauan visual hidup dari worktree atas `origin/master`, vite `:5186`, login
`hartono.w@whr-cpa.id` (Rekan Pemimpin):

```
#/soqm?tab=objectives  → panel "TUJUAN MANDATORI ¶28–33" tampil        (benar)
klik tab "Dokumentasi SMM"
                       → isi berganti ke "Kelengkapan Dokumentasi …"
                       → location.hash TETAP "#/soqm?tab=objectives"   (cacat)

#/wtb?tab=drill        → "Analisis Pergerakan" tampil                  (benar)
klik tab "Pemetaan FS" → isi berganti
                       → location.hash TETAP "#/wtb?tab=drill"         (cacat)
```

Dan sebaliknya: mengubah hash ke `?tab=objectives` selagi `soqm` sudah termuat tidak
mengubah apa pun sampai halaman di-reload — `hashchange` tak menyentuh sumbu tab.
