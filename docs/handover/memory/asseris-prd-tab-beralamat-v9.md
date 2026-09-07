---
name: asseris-prd-tab-beralamat-v9
description: "PRD V-9 tab beralamat (PR #220) — Q-1..Q-3 dijawab 2026-08-14: migrasi atas pemicu, replaceState, sumbu sel tetap Non-Scope; F-3 dicabut jadi dua fase"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5d54caf6-a2e8-4953-86e8-ca96e849c109
  modified: 2026-08-14T02:10:02.910Z
---

**`docs/prd-addressable-tabs.md`** — cacat V-9 dari tinjauan visual 2026-08-14: klik tab
mengubah isi tetapi TIDAK menulis hash, dan pembaca `hashchange` (`app.tsx:202`) hanya
merekonsiliasi `loc.route` — `loc.tab` diabaikan. Terbukti di `soqm` DAN `wtb`.
**PR [#220](https://github.com/ari1945/Asseris/pull/220), Draft, NOL kode.**

## Q-1..Q-3 dijawab 2026-08-14 (Claude atas delegasi Ari)

**Q-1 = (c) dengan PEMICU, bukan migrasi massal.** Jawaban berubah setelah DIUKUR:
di seluruh aplikasi hanya **5 pemanggilan `nav(…,{tab})`** menunjuk **4 modul**
(`wtb`×2 · `soqm` · `sa530` · `governance`) — dan keempatnya sudah termasuk 11 modul
yang dipulihkan F-1. Jadi F-1 saja menutup 100% kebutuhan yang terbukti di kode;
migrasi 61 modul adalah pekerjaan tanpa permintaan terbukti.
**Pelajaran: dugaan saya sendiri di opsi (b) ("modul yang sering dibagikan") tidak
didukung satu pun bukti — ukur dulu sebelum memilih.**

**Q-2 = (a) `replaceState`.** Sempat condong ke (c) hibrida; pengukuran Q-1 membalikkannya.
Tab = bagian satu kertas kerja, bukan halaman; `pushState` membuat "keluar modul" menuntut
sepuluh Back. **KOREKSI PENTING atas framing PRD sendiri:** "Back tampak rusak" tetap
tertutup untuk jalur yang riwayatnya ADA — menempel URL / membuka tautan bikin entri
riwayat oleh PERAMBAN, lalu pembaca `hashchange` menyinkronkan tab. Yang tak berentri
hanyalah klik tab, dan itu disengaja ⇒ **Back = keluar modul**.

**Q-3 = TIDAK.** Sumbu seleksi (`sel`) tetap Non-Scope. Alasan terkuat bukan teknis:
**id entitas di URL membocorkan KEBERADAAN** AJE/klien/temuan ke penerima tak berhak.
Server tetap otoritatif (W7.5) ⇒ bukan kebocoran data, tetapi relevan bagi KAP dengan
kewajiban kerahasiaan. Juga membalik kontrak one-shot `useInitialSelection` (teruji sejak
2026-07-18, hanya 2 modul memakainya). Bila diinginkan: PRD sendiri, dengan analisis
kerahasiaan sebagai bagian WAJIB.

## Dampak

- **F-3 (migrasi 61 modul) DICABUT** → arc jadi **dua fase** (F-1 hook+router, F-2 gerbang+e2e).
- **R-2** (banjir riwayat) & **R-5** (beban tinjauan) PADAM.
- **SC-9 baru**: `nav(id,{tab})` ke modul tanpa `useInitialTab` = cacat diam (tautan mendarat
  di tab salah). Gerbang statis grep. Ini yang membuat "migrasi atas pemicu" otomatis,
  bukan bergantung kedisiplinan.

## Akar teknis (jangan diukur ulang)

Satu-satunya penulis hash = `navigate()` `app.tsx:184–194`; `setTab` lokal modul tak
melewatinya. `app.tsx:216–222` memanggil `buildHash({route})` TELANJANG — membuang
`tab`/`sel` bila menembak. `useInitialTab` (`contexts.tsx:292`) murni baca-saat-mount.
Serialisasi `route_hash.ts` SUDAH lengkap & beruji round-trip — yang kurang hanya pemanggilnya.

Menunggu **"Proceed."** sebelum ada kode.

Lihat [[asseris-tinjauan-visual-toolkit-2026-08-14]] · [[asseris-overlay-contract-arc]].
