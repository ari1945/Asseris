---
name: asseris-wtb-pr3-pr4-sa520-spine
description: "WTB PR-3 (SSOT SA 520) & PR-4 (spine audit) — #131 & #132 MERGED (master c10452f); tinjauan visual menemukan 4 cacat, semua diperbaiki sebelum merge"
metadata: 
  node_type: memory
  type: project
  originSessionId: 299dc037-a936-4833-b6bd-02beae63ea2f
  modified: 2026-07-25T21:02:27.658Z
---

2026-07-25/26. PRD: `PRD - WTB PR-3 Konsolidasi SA 520 & PR-4 Sambungan Spine Audit.md`.

## Status

**TUNTAS.** `master` = `c10452f`, pohon kerja bersih, 0 PR fitur terbuka (sisa #116/#117
dependabot). #131 = `39bf188`, #132 = `c10452f`. Resep merge bertumpuk 6 langkah dari
catatan lama BERHASIL persis seperti ditulis — simpan resepnya di
[[asseris-wtb-eval-pr1-pr2]].

## Tinjauan visual Ari — akhirnya dijalankan (utang 3× lunas)

Ari memilih "tinjau dulu, baru merge". **Panel Browser tak pernah ditampilkan → screenshot
MUSTAHIL** ("page is not compositing frames"); tinjauan dilakukan terukur lewat DOM +
`javascript_tool` + pemindaian token. Piksel/warna/proporsi TETAP belum pernah ditinjau
manusia. Bila Ari minta tinjauan visual lagi: minta ia membuka panel Browser LEBIH DULU.

Tinjauan menemukan **4 cacat**, semua diperbaiki di `34c9866` sebelum merge:

1. **T1** `view_opening.tsx` menyimpulkan "Dapat Diandalkan" **hardcoded** (badge + 2
   paragraf hijau) — lawas di master, tapi PR-4c membuatnya kontradiktif SATU LAYAR dengan
   banner "tak dapat menyimpulkan apa pun (SA 510 ¶6)". Kini diturunkan: hijau menuntut
   tie-out bersih DAN `s.concluded`.
2. **T2** `tieStatusFor` dipanggil untuk SETIAP baris TB → akun laba-rugi & akun bersaldo
   nol ditandai "akun baru?". **21 dari 22 penanda derau**, satu selisih nyata terkubur.
   Lingkup (`isOpeningBalanceScope`) kini di mesin, dipakai kedua permukaan. 22 → 13.
3. **T3** baris tanpa pembanding: mesin memberi `diff = opening` (drawer WTB: 50.860 jt)
   sementara SA 510 menghitung sendiri → "—". Kini `diff` hanya bermakna bila ada
   pembanding; `untracedTotal` terpisah; `totalDiff` hanya untied+orphan.
4. **T4** PR-3a menyatukan ambang SETENGAH JALAN dan memecah `analytical` di dalam dirinya:
   tab Flux (OR, tersimpan) vs KPI Ringkasan (AND, 15% tetap) → "23" vs "12" untuk
   perikatan yang sama. Aturan tunggal `fluxThresholds` + `isFluxFlagged` di `flux_state.ts`,
   dipakai 3 permukaan. Ringkasan 12 → 23.

Pola yang berulang di ketiga sesi WTB: **perbaikan SSOT yang hanya menyentuh sebagian
konsumen lebih buruk daripada tak menyentuh sama sekali** — modul jadi bertentangan dengan
dirinya sendiri. Setelah mengubah aturan bersama, `grep` SELURUH pemanggil.

## PR-5 — sisa terbuka 1–4 (#133 **MERGED**, master `484c8a1`)

Keputusan Ari: #1 = **dua hash + label jujur**, #3 = **hapus clearFlux**.
Gerbang: typecheck 0 · lint 0 · **646 test** · CI 6/6.

- **#1** `sha256` (teks penuh) + `sha256Excerpt` (cuplikan tersimpan) + `rawLength`/
  `excerptLength`, cakupan disebut eksplisit di UI. **Temuan tambahan:** `rawExcerpt`
  disimpan sejak PR-2b tapi TAK PERNAH dirender — data tulis-saja; kini ditampilkan.
- **#2** `leadSrc` pada baris impor · chip putus-putus + `?` + tooltip · kolom XLSX
  "Sumber WP". **Lubang yang nyaris lolos:** `applyMapping` membangun objek dari NOL
  (bukan spread) → `leadSrc` lenyap begitu pemetaan CoA disiapkan, tepat pada baris
  TAK-terpetakan yang justru mayoritas di TB klien nyata. Diperbaiki di `0397a22`.
  **Pelajaran: setelah menambah field ke baris WTB, telusuri SELURUH rantai
  `wtb_import → applyMapping → overlayWtbOverrides → contexts.wtb`.**
- **#3** `clearFlux` dihapus; alasan + syarat implementasi ulang (nisan, bukan `delete`)
  ditinggalkan sebagai komentar di `flux_state.ts`.
- **#4** `ams.wpOpen` + `ams.samplingAccount` (one-shot) · SA 530 pakai `useInitialTab` +
  banner konteks + "Pakai sebagai nilai populasi" (tak menimpa state tersimpan) ·
  dirty-guard editor telaah di `view_wtb_deep.tsx`.

**VERIFIKASI LIVE PR-5 TIDAK PERNAH JALAN.** Server dev restart me-logout sesi; login Ari
terjadi di profil Chrome yang cookie-nya tak dibagi ke panel tertanam MAUPUN tab
Claude-in-Chrome (`auth.me` kosong di keduanya, meski server mencatat POST /auth.login 200).
Saya tidak mengisi kata sandi ke formulir. Yang terverifikasi: CI 6/6 (termasuk job seed+login
nyata), gerbang lokal, arity kolom XLSX 10/10/10/10, dan penelusuran statis rantai `leadSrc`.
Yang BELUM: chip lead, banner SA 530, dirty-guard, disclosure cuplikan — semuanya di layar.

## SISA TERBUKA

PR kecil gabungan — **SUDAH DIKERJAKAN, lihat PR-5 di atas**. Isi aslinya:
1. `sha256` impor dihitung atas teks penuh tapi hanya 4.000 karakter disimpan
   (`rawExcerpt`) → hash tak dapat diverifikasi ulang.
2. Lead hasil TEBAKAN `leadFromCode` dirender identik dengan lead yang ditetapkan auditor
   dan ikut ke XLSX tersegel — perlu penanda.
3. `clearFlux` diekspor & diuji tapi TAK dipakai; `mergeLegacyFlux` menggabung
   `wtbOverrides` tiap baca → menghapus entri memunculkan kembali catatan warisan.
4. Dua tombol drill PR-4d yang dijatuhkan diam-diam ("Buka Lead Schedule" tak menyetel
   `ams.wpOpen`; "Sampling Akun Ini" tak mengirim konteks akun) + dirty-guard editor telaah
   (`view_wtb_deep.tsx` useEffect `[selKey]` menimpa draf tanpa peringatan).

Terpisah: `materialityFor` baca cache localStorage → pada cache DINGIN PM bisa terkunci di
default 75% (belum direproduksi; akar = Opsi A ketimbang Opsi B canon-from-args) ·
`SAMPLE_TB` picu peringatan skala 6,5× · penggabungan route `analytical`→`sa520` (PRD §11
Q2, sengaja tak diambil) · `mat.memo.signoff` masih firm-scope · deteksi laba-ganda belum
memblokir (PRD §11 Q3) · **mengetik nilai `AuditContext`** (lihat GOTCHA).

## GOTCHA

- **Nilai `AuditContext` TAK BERTIPE** → field yang lupa ditambahkan ke objek nilai (hanya
  masuk array deps) LOLOS typecheck+lint, gagal senyap saat runtime.
- **Ratchet ESLint**: satu `:any` baru meng-un-suppress SELURUH berkas. Setelah MENGURANGI
  `any` → lint exit 2 "stale suppressions" → `npx eslint src --prune-suppressions`.
- **Error konsol BASI menyesatkan**: `read_console_messages` tak dikosongkan oleh reload.
  Error `<WTBView>` yang muncul saat file setengah tersunting (HMR) bertahan di buffer dan
  tampak seperti crash produksi. Bedakan lewat `?t=` di URL modul pada stack trace.
- **Layar crash membaca sebagai "bersih"**: `querySelectorAll(...).length === 0` bernilai 0
  juga ketika komponen jatuh ke ViewErrorBoundary. Selalu cek tabel/baris ADA lebih dulu.
- `innerText` mengembalikan teks TER-RENDER — `.upper` membuatnya UPPERCASE; pencarian
  `includes('Saldo Akhir TA-1')` MELESET (harus uppercase). Menggigit lagi sesi ini.
- `gh pr checks --watch` <10 detik setelah push → exit 1 "no checks reported"; BUKAN gagal.
- `cmd | grep …; echo $?` melaporkan exit **grep**, bukan cmd.
- Rute live: `localStorage.setItem('ams.route','wtb')` + reload — nilai RAW, bukan JSON.
- Login demo: `fajar.n@whr-cpa.id` / `Junior#2025!` (Junior Auditor); Partner:
  `hartono.w@whr-cpa.id` / `Partner#2025!`.
- Rules-of-hooks: JANGAN `(typeof useAuth === 'function') ? useAuth() : null`.
- Perikatan demo BERSIH dari sumber TA-1 uji (dihapus lewat tombol "Hapus sumber").

Terkait: [[asseris-wtb-eval-pr1-pr2]] · [[asseris-authoritative-persist-key-recipe]]
