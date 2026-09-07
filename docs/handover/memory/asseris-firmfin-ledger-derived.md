---
name: asseris-firmfin-ledger-derived
description: Arc 2026-08-15 - FIRMFIN membaca COA turunan buku besar (bukan seed); posting jurnal akhirnya menggeser seluruh aplikasi; PR #241
metadata:
  type: project
---

Arc **2026-08-15**, cabang `feat/firmfin-ledger-derived`,
**[PR #241](https://github.com/ari1945/Asseris/pull/241)** (9/9 CI hijau setelah rerun).
PRD `docs/prd-firmfin-ledger-derived.md` → **Implemented**. "Proceed." tanpa koreksi ⇒
rekomendasi saya (Q-1=a ketiga pemanggil · Q-2=a penanda informasi · Q-3=a jurnal kontrol
arc sendiri). Menutup Non-Scope yang ditinggalkan DUA kali —
[[asseris-wip-rollforward-falsifiable]] & [[asseris-ar-ap-bridge-falsifiable]].

**Cacatnya:** `firm_ledger.ts` (Program E #234) sudah benar tapi hanya dipakai
`view_firmgl`. `FIRMFIN` membaca `coaOf(ctx) = ctx.coa || AMS.FIRM_COA` dan **NOL pemanggil
mengirim `ctx.coa`** → tujuh fungsi (pl · balanceSheet · arAging · ap · wip · cash · budget,
plus kpis/reconciliations/provenance) membaca seed statis. Memposting satu jurnal
(JV-0307, Rp 210 jt) membuat Firm GL menyatakan laba 2.590 jt sementara Firm Finance
tetap 2.800 jt — **dua angka laba untuk satu firma**. Bentuk identik dengan `wip.adj`
di [[asseris-wip-merge-valuasi-realisasi]]: tombol yang berhenti di batas modulnya.

**Ini akar #239 & #240**: keduanya menjembatani sub-buku ke "kontrol GL" yang ternyata
angka yang tak pernah diposting.

**Solusi:** `use_firm_coa.ts` — satu pintu (pola `useFirmWip`), membaca kunci persist
`firmgl` yang SUDAH dipakai `view_firmgl`. Disalurkan ke **tiga** pemanggil saja:
`view_firmfinance` (satu ctx → 11 fungsi), `use_firm_wip` (membawa Dashboard/Beranda/modul
WIP), `view_continuance` (dulu `FIRMFIN.pl({})` telanjang). Inventarisnya memang sekecil itu.

**KUNCI DESAIN — nol-delta secara aljabar.** `opening = seed − efek(seedGl)` dan
`current = opening + efek(gl)`; saat `gl == seedGl` (boot), `current == seed`. Jadi menyalurkan
ledger TIDAK menggeser satu angka pun sampai seseorang memposting. Pola ini layak ditiru
untuk migrasi seed→turunan lain: jangkar saldo awal ke seed-journal, bukan ke jurnal berjalan.

**Konsekuensi yang dikehendaki:** memposting jurnal ke akun kontrol tanpa pasangan sub-buku
kini memerahkan rekonsiliasi #239/#240 (`glResidual` naik, status `open`). Dipaku uji SC-3.

**GOTCHA CI — `caddy edge` gagal 22s (biasanya 2m13s) dengan
`target web: failed to receive status: rpc error: code = Unavailable desc = ... EOF`.**
Itu daemon buildkit mati saat membangun image, SEBELUM kode aplikasi jalan. Cara memastikan
bukan cacat kita: (1) baca log — gagal di tahap `load .dockerignore`, bukan di uji;
(2) `git diff --name-only origin/master...HEAD` — tak ada Dockerfile/compose/caddy;
(3) `gh run rerun <runId> --failed` → lolos 2m11s. Jangan langsung bilang "flaky", buktikan.

Uji +10 (total 1791), termasuk uji DUA ARAH (posting & batal posting) dan satu uji yang
memaku cacat lamanya supaya pencabutan penyaluran `coa` langsung terlihat. Ratchet `:any`
tetap 8058. Live-verified dua arah: 2,80 M → 2,59 M → 2,80 M.
