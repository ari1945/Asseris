---
name: asseris-budget-actual-ledger-derived
description: "Arc 2026-08-15 - \"aktual\" diturunkan dari buku besar (PR #242) + jejak posting akun kontrol (PR #243); dua cacat besar ditemukan HANYA lewat verifikasi hidup"
metadata: 
  node_type: memory
  type: project
  originSessionId: db7766d9-cfb7-4c52-8e3b-3b92ad92575b
  modified: 2026-08-15T08:06:27.501Z
---

Arc **2026-08-15** lanjutan [[asseris-firmfin-ledger-derived]]. PRD
`docs/prd-budget-actual-ledger-derived.md` → **Implemented**. Dua bagian → dua PR,
**KEDUANYA MERGED**: **[#242](https://github.com/ari1945/Asseris/pull/242)** (Bagian C,
`d7f4365`) & **[#243](https://github.com/ari1945/Asseris/pull/243)** (Bagian B, `b24d1d0`).
`origin/master` = **`b24d1d0`**, uji **1829**. "Proceed." = "sesuai rekomendasi" ⇒
Q-1..Q-5 semuanya opsi (a).

Urutan merge sebenarnya **#244 → #242 → #243**: #244 (aksesibilitas, dari chip tugas yang
saya spawn) di-merge sesi lain lebih dulu — lihat [[asseris-a11y-badge-button-native]].
**#243 SAYA REBASE dulu meski GitHub bilang CLEAN**, karena CI-nya berjalan di atas basis
lama dan #244 menyentuh `view_firmgl.tsx` yang sama; `verify` lokal di atas gabungan
ketiganya hijau, baru merge. Biasakan ini saat beberapa PR menyentuh satu berkas.

## Cacatnya

#241 berjudul "satu firma, satu angka laba" — **belum benar**. Kolom `actual` di
`FIRM_BUDGET` masih literal dan **tiga modul membacanya mentah** tanpa lewat FIRMFIN:
`view_bi`, `view_bi2`, `view_firmtreasury`, masing-masing dengan salinan `filter/reduce`
sendiri. Posting JV-0307 ⇒ BI bilang laba 2.800 jt, Firm GL bilang 2.590 jt.

Plus di jalur yang sama: `view_firmfinance.tsx:120` punya konstanta **`+ 6`** —
varians pendapatan sebenarnya −5,8% (DI BAWAH anggaran) ditampilkan sebagai
"+0,2%" dengan panah hijau. Bukan pembulatan, **pembalikan tanda**.

## POLA PENTING — menurunkan angka membuat gerbangnya TAUTOLOGIS

Begitu `actual := saldo GL`, badge "aktual == saldo GL?" **selalu hijau, tak pernah bisa
merah** — persis cacat `note` hardcode #240 yang baru dicabut. Gerbang harus **DIGANTI,
bukan dihapus**. Penggantinya: **cakupan** — `Σ akun yang dianggarkan` vs `pl.opProfit`
atas SELURUH akun P&L. Merah bila ada beban diposting tanpa pernah dianggarkan. Badge-nya
sudah ada di `view_firmfinance.tsx:414`; hanya maknanya bergeser dan berhenti tautologis.
**Tiru pola ini setiap kali memigrasi literal → turunan.**

## DUA CACAT YANG HANYA TERLIHAT DI PERAMBAN (1.815 uji hijau di atasnya)

**1. Cache localStorage basi vs saldo awal yang dianker ke seed.** `openingBalances`
dianker ke `seedGl` (selalu kode terbaru), `gl` dibaca dari localStorage dan bisa
TERTINGGAL. Menambah jurnal seed ⇒ saldo awal dikurangi efeknya tanpa pernah menambahkan
efek itu kembali. Terukur: Pendapatan 11.300 → **8.450**, WIP 9.300 → **8.090**, Kas
8.420 → 9.330. **Neraca TETAP "seimbang ✓"** — tak ada gerbang yang berbunyi. Dan bukan
cacat satu rilis: setiap penambahan jurnal seed berikutnya meledakkannya lagi. Diperbaiki
di sumbernya (`mergeSeedJournals()`), dipakai KEDUA pintu pembaca kunci `firmgl`
(`view_firmgl` + `use_firm_coa`).

**2. Tab "Buku Besar" Firm GL crash sejak Program E (#234).** `LedgerRow` tak pernah
membawa `dr`/`cr`, view merender `r.dr2 ? r.cr : r.dr` lalu `.slice()` → `undefined`
melempar → SELURUH modul gagal render. Akun default 1-100 punya mutasi ⇒ crash setiap
kali tab dibuka. **Yang menyembunyikannya dari typecheck: `rows.map((r: any) => …)`.**
Mengganti `any` → `LedgerRow` langsung membuka cacat tipe kedua di baris yang sama.

## GOTCHA

- **Kunci persist firm ber-SCOPE: `ams.v1.firm.FIRM-WHR.firmgl`**, bukan `ams.v1.firmgl`.
  Menulis kunci polos tak berefek apa-apa.
- **Catatan checkpoint saya sendiri KELIRU**: klaim 1-200 & 2-100 "nol jurnal" salah —
  disentuh 2 & 1 jurnal. Hanya 1-300 yang nol (dari 9 akun tanpa jurnal, dari 15).
  Ukur ulang, jangan percaya catatan sesi lalu.
- **Menurunkan `:any` meninggalkan suppression usang → `npm run verify` MERAH** dengan
  pesan yang tak menyebut kegagalan. Jalankan `npm run lint:any-baseline`.
- `React.useMemo` di repo ini untyped → hasilnya `any`; **anotasi eksplisit**
  (`const gl: GlJournal[] = useMemo(...)`) atau `.filter((j) => …)` jadi implicit-any.
- Reload peramban memutus sesi; login butuh kata sandi → **saya tidak boleh mengisinya**,
  minta Ari masuk. Kontrol status posting `<span onClick>` tak ada di pohon aksesibilitas
  → klik lewat dispatch event (ini melahirkan PR #244 sesi lain).

Uji 1791 → **1815**. Ratchet `:any` 8058 → 8056 (turun, karena kode baru DIKETIK bukan
di-suppress). Nol-delta pada seed bersih dibuktikan untuk kedua bagian.
