---
name: asseris-overlay-contract-arc
description: "Arc kontrak Overlay & objek beralamat (PRD 4 fase) — PR-1 #162 TERBUKA, CI 6/6 hijau; dua utang keputusan Ari"
metadata: 
  node_type: memory
  type: project
  originSessionId: c90d2536-d0db-4066-bae1-93d475e0c961
  modified: 2026-07-31T04:27:15.399Z
---

**Pemicu (2026-07-30):** Ari bertanya apakah konsep pop-up detail di Asseris sudah tepat (contoh: komponen Pendapatan di modul Working Papers). Jawaban: **tepat sebagai pola untuk sebagian layar, salah untuk yang itu** — `WPDrill` 1000×92vh (~96% viewport, 5 tab, tabel input, sign-off) adalah **halaman yang menyamar sebagai modal**. Bila overlay menutupi 92% tinggi layar, satu-satunya yang "modal" hilangkan adalah alamat & riwayat: biaya tanpa manfaat.

## Temuan struktural yang mengubah bentuk pekerjaan

1. **App tidak punya URL sama sekali.** Rute dari `localStorage` (`app.tsx:422`); `pushState`/`location.hash` **nol kemunculan** di `src`. Ini akar masalahnya, bukan ukuran modal. Konsekuensi: reviewer & preparer **tak dapat menunjuk objek yang sama** pada produk yang dijual sebagai alur reviu multi-orang.
2. **TAPI model lokasi sudah ada.** `navigate(id,{from,tab,sel})` + `useInitialTab`/`useInitialSelection` (`contexts.tsx:263`,`:278`) sudah bertingkat & dipakai 20+ modul; yang absen **hanya publikasi ke address bar**. → fase routing = **serialisasi**, bukan pasang router. Ini memurahkan fase termahal secara drastis. Jangan ulangi kesimpulan awal "butuh react-router".
3. **Satu konten punya tiga rumah bersaing:** rute · drawer SA yang merender **modul penuh** (`app.tsx:411` `viewFor(data.view)`, z 91) · modal drill (z 90). Karena 91 > 90, modal yang dibuka dari modul-di-dalam-drawer muncul **di bawah** drawer pemanggilnya (inferensi dari kode, **belum diamati hidup**). Aturan CLAUDE.md "akses context defensif — modul bisa dirender di drawer" adalah bekas luka dari ini, bukan fitur.

Inventaris awal: **47 situs** `position:'fixed', inset:0` di **29 berkas** · `role="dialog"`/`aria-modal` **0 dari 29** · Escape **4 dari 29** · focus trap 0 · scroll lock 0 (`body.style.overflow` tak pernah disentuh di seluruh `src`) · `zIndex: 90` datar **31×** · guard draft 0 · `ams.wpOpen` **8 situs kode + 3 komentar**.

## PRD & status

PRD: `docs/prd-overlay-contract-and-addressable-objects.md` — 4 fase (A primitif Overlay · B URL · C KK jadi rute · D cetak), sign-off "Proceed." 2026-07-30 dengan 6 Open Question diterima sesuai rekomendasi (hash routing, bukan History API; drawer SA **tidak** diberi alamat; KK jadi dua halaman bukan master-detail).

**PR-1 [#162](https://github.com/ari1945/Asseris/pull/162) MERGED** (`8944c6b`) — `src/overlay.tsx` + `overlay.test.ts` (29 uji) + 3 situs (`PhaseGateDialog`→modal sm/confirm · `ArticleReader`→modal xl · `WPDrill`→varian `page` DEPRECATED, sengaja pixel-neutral).

**PR-2a MERGED** (`0855bab`) — dibuka sbg #163, **ditutup GitHub otomatis** saat base-nya dihapus, dibuka ulang sbg **[#164](https://github.com/ari1945/Asseris/pull/164)** lalu merged. 9 situs: `view_execution` 6 + `view_firm` 3 → nol overlay mentah di kedua berkas. Gerbang: lint 0 · typecheck 0 · 836 uji · build bersih.

**master = `0855bab`**, cabang overlay remote bersih. **Termigrasi 12; sisa 28 dialog sejati.**

**PR-3 (Fase B — URL) [#167](https://github.com/ari1945/Asseris/pull/167) TERBUKA, CI 6/6 hijau**, base master, tak bertumpuk. Branch `feat/overlay-pr3-url-hash`. Ari memilih loncat ke Fase B sebelum menyelesaikan Fase A (sah menurut PRD: PR-3 hanya bergantung PR-1). Gerbang: lint 0 · typecheck 0 · **876 uji** (836+40) · build bersih.

Isi: `route_hash.ts` (MURNI, bebas-DOM: `parseHash`/`buildHash`/`sameLocation`/`initialLocation`) + 40 uji env `node` + wiring 62 baris di `app.tsx` & 17 di `contexts.tsx`. Bentuk `#/<route>[/<sel>][?tab=<tab>]`.

**Kunci desain PR-3 (jangan dirombak tanpa alasan):**
- **Hash, bukan History API** — SPA statis di belakang Caddy; hash tak butuh rewrite server → nol perubahan infra, nol risiko 404 saat refresh.
- **Satu penulis / satu pembaca + penjaga anti-gelung:** `navigate()` menulis hash (pindah MODUL = push agar Back bekerja; ganti tab/sel DI DALAM modul = `replaceState` agar riwayat tak banjir). Listener `hashchange` hanya bertindak bila rute BEDA dari state → event dari `navigate()` sendiri jadi no-op.
- **Presedens boot: hash > `ams.route` > `home`**, rute tak dikenal dibuang → tautan busuk tak pernah layar putih.
- **Login eksplisit WAJIB membersihkan hash** — begitu hash lebih otoritatif dari `ams.route`, menyetel `ams.route='home'` saja TIDAK cukup; tanpa ini login mendarat di rute sesi sebelumnya. Regresi halus yang hampir lolos.
- API `useInitialTab`/`useInitialSelection` **tidak berubah** — hanya sumbernya digeser (URL dulu, sessionStorage one-shot kedua). 20+ pemakai tak tersentuh. **URL tab TIDAK dikonsumsi** (alamat menetap), sessionStorage tetap consume-once.

**PR-2b [#168](https://github.com/ari1945/Asseris/pull/168) TERBUKA**, base master, tak bertumpuk & tak bergantung #167. Branch `feat/overlay-pr2b-forms`. 9 situs formulir (`view_people` 3 · `view_pipeline` 3 · `view_scheduler` · `view_settings` · `view_onboarding` ProspectForm). **Termigrasi 21 dari 40.** Gerbang: lint 0 · typecheck 0 · **852 uji** · build bersih. R5: **7 dari 9** kehilangan draft senyap.

**`SHEET_W.sm` 440→480 di PR-2b** — korpus sheet 420·440·460·480·540·760·780; nilai 440 MENYEMPITKAN drawer 480px, melanggar aturan "tak pernah menyempitkan" yang jadi dasar skala. Efek: `EngagementDetail` (PR-2a) melebar 440→480. Skala final: **MODAL 460/560/720/940 · SHEET 480/600/780/940**.

**⚠️ PELAJARAN UJI (terulang lagi, kali ini nyaris lolos):** uji geometri yang memaku angka ajaib (`sheet sm = 440px`) gagal tiap skala digeser SENGAJA tapi tak pernah menangkap penyempitan TAK sengaja — terbalik dari kebutuhan. Diganti 16 kasus terparametrisasi "setiap lebar korpus → ukuran >= lebar asli". **Uji baru itu SEMPAT PALSU:** helper `px()` membuang seluruh non-digit sehingga `min(440px, 94vw)` terbaca `44094` → assertion selalu lolos, skala yang sengaja dirusak tetap hijau. **Hanya probe mutasi yang menemukannya.** Ambil angka PERTAMA (`match(/\d+/)`), bukan sapu non-digit.

**⚠️ PR-3 BELUM diverifikasi hidup** — sesi login berakhir saat backend restart dan saya tak boleh memasukkan kata sandi (termasuk akun dev BUILD.md). Tanpa auth `<App>` tak pernah mount → routing sama sekali belum tersentuh. Sudah terbukti tanpa login: boot tak pecah oleh `#/tidakadamodulini` maupun `#/%` (layar login render, konsol bersih). **Lima uji tersisa, minta Ari login di :5180 lebih dulu:** (1) hash berubah saat pindah modul, (2) tombol Back, (3) URL tempelan `#/workpapers/R?tab=procs`, (4) reload mempertahankan rute, (5) login eksplisit mendarat di Beranda meski hash lama ada.

## Sisa pekerjaan — jawaban PRD Q6 (jumlah TURUN, jangan pakai angka 47 lagi)

Dari 35 situs sisa: **7 adalah SCRIM klik-luar**, bukan dialog — `<div fixed inset:0 onClick=close />` transparan tanpa panel, penangkap klik untuk **dropdown**: `ui.tsx:192 Menu` · `shell.tsx:56` + `:522` · `evidence.tsx:93` · `view_palette.tsx:106` + `:153` · `wp_signoff.tsx:362`. **JANGAN jadikan `<Overlay>`** — role=dialog + focus trap + scroll lock pada menu = REGRESI. Target sebenarnya **40, bukan 47**.

Sisanya **28 dialog/sheet sejati**. Dua di antaranya melebihi `xl` 940 dan berpola sama dengan `WPDrill` (halaman menyamar modal) → kandidat RUTE di Fase C, jangan naikkan skala demi mereka: `view_misc2.tsx:202 Kv` (1060) · `view_onboarding.tsx:211 OnboardingDrawer` (1080). Dua lagi berbentuk backdrop+panel TERPISAH (`<div/>` + `<aside>` bersaudara), jadi heuristik "self-closing = scrim" salah menandainya — keduanya drawer sejati: `app.tsx:399 SARefDrawer` · `view_docparts.tsx:60 PDrawer`.

**Temuan R5 PR-2a:** **7 dari 9** situs menyimpan draft yang hilang senyap hari ini (WtbLedgerDrawer, WtbPriorYearDrawer, WtbMappingDrawer, WtbImportDrawer, AJEForm, ClientForm, EngagementForm) — kekhawatiran yang memicu guard ini terbukti bukan teoretis. Untuk formulir ber-objek, "kotor" DIBANDINGKAN terhadap nilai awal (bukan "ada isi"), supaya mode edit tak selalu memicu prompt.

**Skala lebar diturunkan DARI KORPUS** (jangan dikarang ulang): lebar nyata 47 situs mengelompok di `{460} {560,560} {680,720} {900,920,940,940}` → `sm/md/lg/xl = 460/560/720/940`, simpangan maks +40px dan **tak pernah menyempitkan** panel bertabel (penyempitan = satu-satunya arah berisiko). `SHEET_W = 440/600/780/940`. Akibatnya `lg` bergeser 940→720 di PR-2a, jadi `ArticleReader` (PR-1) ikut `lg`→`xl`.

**`OV_FILL` (view_execution):** drawer WTB bertata-letak dua-panel dengan anak `flex:1`; `.ov-body` default = blok ber-overflow → `flex:1` anak MATI dan textarea runtuh ke `minHeight`. Jadikan `.ov-body` flex-column untuk mempertahankan geometri lama.

## Status utang keputusan

1. **jsdom devDependency — DISETUJUI Ari 2026-07-30.** Menyimpang dari PRD §6 "tanpa dependensi baru", dengan alasan: kendala itu dibenarkan permukaan-kirim ke KAP + pentest, sedangkan jsdom tak pernah terkirim & CI `dependency-audit` jalan `npm audit --omit=dev` (terbukti pass di #162). `vitest.config.mjs` TIDAK diubah — hanya `overlay.test.ts` ber-pragma `// @vitest-environment jsdom`; uji kanon tetap env `node`. **Isu tertutup, jangan dibuka ulang.**
2. **Tinjauan piksel — LUNAS 2026-07-30** untuk #162+#163. Ari memeriksa dua ujung skala lebar di jendela penuh (Impor TB = xl/940, Klien Baru = md/560) dan menyatakan "semua terlihat benar". **Skala `sm/md/lg/xl = 460/560/720/940` dengan demikian TERVALIDASI MATA — jangan dikarang ulang di PR berikutnya.** Catatan alat: viewport panel embedded 582×550 mengklamp panel via `maxWidth:'96vw'` ke 550px, jadi geometri lebar TAK PERNAH dapat dinilai dari panel Browser — hanya perilaku (aria/fokus/scroll-lock/guard) yang terverifikasi di sana.

## Keputusan desain yang mudah salah dibaca nanti

- **Scroll lock WAJIB counter, bukan boolean** — boolean bikin menutup overlay atas melepas lock milik yang bawah. Ada uji khusus; mutasi ke boolean **terbukti menggagalkannya**.
- **Backdrop pakai `mousedown` + `target===currentTarget`**, bukan `onClick`+`stopPropagation` seperti 47 situs lama (seleksi teks yang dilepas di luar panel tak lagi menutup).
- **Varian `page` sengaja DEPRECATED** — ada HANYA agar migrasi `WPDrill` nol perubahan piksel. Bentuk 1000×92vh itu justru masalahnya; objeknya pindah ke rute di Fase C. Jangan pakai untuk overlay baru.
- **`draft` catatan review diangkat dari `NotesTab` ke `WPDrill`** (di luar teks PR-1) supaya `isDirty` melihatnya — tanpa itu guard-nya melindungi sesuatu yang tak ada di situs yang memotivasinya.
- Berkas `.tsx` BARU tak punya baseline suppression → **ratchet `no-explicit-any` berlaku penuh**. @types/react sengaja absen (`jsx-intrinsics.d.ts`: `declare module 'react'` bertubuh kosong) → `React.ReactNode`/`CSSProperties` **tak ada sebagai tipe**; pakai tipe struktural sendiri + **anotasi LHS** untuk hasil hook (hindari TS2347). Tipe DOM tersedia (tsconfig `lib: DOM`).

## GOTCHA MERGE BERTUMPUK (baru, mahal — baca sebelum merge PR bertumpuk apa pun)

**`gh pr merge <base-PR> --squash --delete-branch` MENUTUP PR yang bertumpuk di atasnya.** GitHub menghapus base branch → PR anak otomatis jadi `CLOSED`, dan **PR tertutup TIDAK dapat di-reopen bila base branch-nya sudah tiada** (`reopenPullRequest` gagal), juga tak dapat di-retarget (`Cannot change the base branch of a closed pull request`). Terjadi pada #163 (2026-07-30) — harus dibuka ulang sebagai **PR baru #164**.

Urutan BENAR untuk lain kali:
1. Catat sha tip semua cabang **sebelum** apa pun (rebase butuh tip LAMA).
2. **Retarget PR anak ke `master` DULU** (`gh pr edit <anak> --base master`) — selagi masih OPEN.
3. Baru merge PR induk (boleh `--delete-branch`).
4. Rebase cabang anak: `git rebase --onto master <tip-LAMA-induk> <cabang-anak>` → force-push `--force-with-lease`.

Catatan: `git branch -r` bisa BOHONG sesudah merge (ref remote-tracking basi) — cabang tampak masih ada padahal sudah dihapus di GitHub. `git fetch --prune` dulu sebelum menyimpulkan.

## GOTCHA

- **R2 PRD langsung terjadi:** menghapus `any` di berkas ber-suppression → `eslint src` **exit 2** ("suppressions left that do not occur anymore") walau 0 error. Fix `--prune-suppressions`, lalu **periksa delta**: sah bila hitungan hanya TURUN (view_kb 44→42, view_wp 117→116, wp_signoff 50→49). Bila ada berkas ter-un-suppress penuh, itu regresi.
- **Perubahan lockfile memicu Vite re-optimize deps, dan muat halaman PERTAMA sesudahnya gagal mount React** — `#root` kosong, `bodyLen` 81, **konsol bersih tanpa error**. Reload menyelesaikannya. Jangan salah baca sebagai regresi kode.
- **Panel Browser viewport 0×0** (tak dibuka Ari) → `read_page` "(empty page)" & screenshot mustahil, TAPI `javascript_tool` tetap jalan penuh. Verifikasi DOM nyata bisa lewat module graph Vite: `import('/src/overlay.tsx')` + `import('/node_modules/.vite/deps/react.js')`. **Namespace-nya `.default`** — `react-dom_client.js` mengekspor `{default:{createRoot,hydrateRoot}}`, bukan named export. Nama berkas dep dari `/node_modules/.vite/deps/_metadata.json`.
- Probe yang gagal di tengah **meninggalkan elemen di DOM** — bersihkan `#probe-*` sebelum menyimpulkan "DOM bersih".
- Uji lulus 29/29 pada percobaan pertama = **sinyal untuk curiga**, bukan selesai. Buktikan falsifiabilitas dengan mutasi sengaja lalu kembalikan (verifikasi via `git diff`).

Lihat juga [[asseris-tooling-gh]] (jq TIDAK ada — resep Monitor CI berbasis jq berjalan diam sampai timeout), [[asseris-psak46-prh-basis-dilaporkan]] (master `86daaa7`), [[neosuite-ams-arc]].
