# PRD — Firm Finance membaca BUKU BESAR, bukan seed: satu firma, satu angka laba

> Wajib diisi sebelum implementasi apa pun. Implementasi TIDAK dimulai sebelum sign-off ("Proceed.").

| Field | Isi |
|---|---|
| Tanggal | 2026-08-15 |
| Pemilik | Ari Widodo |
| Status | **Implemented** — "Proceed." 2026-08-15 tanpa koreksi ⇒ rekomendasi (Q-1=a ketiga pemanggil · Q-2=a penanda informasi · Q-3=a jurnal kontrol arc sendiri). F-1..F-3 SELESAI, `npm run verify` hijau (1791 uji), SC-1..SC-8 tertutup & live-verified DUA ARAH. |
| Pemicu | Non-Scope yang ditinggalkan DUA kali (#239 & #240): "kontrol GL belum benar-benar terposting" |
| PRD terkait | `prd-wip-rollforward-falsifiable.md` · `prd-ar-ap-bridge-falsifiable.md` (keduanya Implemented) |
| Prasyarat | Di atas `master` `4d6bf52` |

---

## 1. Problem

`firm_ledger.ts` (Program E, #234) sudah menurunkan saldo tiap akun dari jurnal terposting,
dan **sudah benar**. Tetapi ia hanya dipakai satu modul: `view_firmgl`.

`FIRMFIN` — yang memberi makan Firm Finance, Dashboard, Beranda, BI, Treasury dan
**keempat akun kontrol** — membaca `coaOf(ctx) = ctx.coa || AMS.FIRM_COA`.

**Tidak ada satu pun pemanggil yang mengirim `ctx.coa`.** Nol. Jadi tujuh fungsi
(`pl` · `balanceSheet` · `arAging` · `ap` · `wip` · `cash` · `budget`, dan lewat mereka
`kpis`/`reconciliations`/`provenance`) seluruhnya membaca **seed statis**.

### 1.1 Akibatnya: dua angka laba untuk satu firma

Diukur atas seed nyata. Skenario: pengguna memposting `JV-0307` (akrual PPh 21
Rp 210 jt) — satu-satunya jurnal yang dikirim dengan `posted: false`, jadi memposting-nya
adalah persis yang diundang modul Firm GL untuk dilakukan.

| | Sebelum posting | Sesudah posting |
|---|---:|---:|
| Utang Pajak (2-200) — *buku besar* | (940) | **(1.150)** |
| Beban Gaji (5-100) — *buku besar* | 5.420 | **5.630** |
| **Laba bersih menurut Firm GL** | 2.800 | **2.590** |
| **Laba operasi menurut Firm Finance** | 2.800 | **2.800** ← tak bergerak |

Setelah satu klik "Posting", **Firm GL menyatakan laba Rp 2.590 jt sementara Firm Finance
menyatakan Rp 2.800 jt** — selisih Rp 210 jt, dari jurnal yang sama, di aplikasi yang sama.
Neraca, KPI, anggaran-vs-aktual, dan keempat akun kontrol ikut membeku di angka seed.

### 1.2 Ini akar dari tiga arc sebelumnya

Sesi ini sudah dua kali menjembatani sub-buku ke "kontrol GL" (#239 WIP, #240 AR/AP).
Keduanya membandingkan sub-buku dengan **angka yang tak pernah diposting**: seed
`FIRM_COA`. Selama itu benar, "akun kontrol" hanyalah nama untuk sebuah konstanta.

Ini juga alasan baris **Kas** di #240 merah dan tak bisa ditutup: sub-buku bank bergerak,
GL tidak, dan tak ada mekanisme yang bisa mempertemukannya.

### 1.3 Kenapa ini merugikan

- **Modul Firm GL mengundang tindakan yang tak berdampak.** Tombol "Posting" bekerja
  secara lokal lalu berhenti di batas modulnya — persis kelas cacat `wip.adj` di #237
  (write-down yang tak terlihat siapa pun) yang baru kita cabut.
- **Untuk produk yang menjual disiplin keuangan firma**, dua angka laba yang berbeda di
  dua layar bersebelahan adalah cacat yang paling mudah dilihat auditor mana pun.
- Sudah tercatat sebagai **P0** di `firm_ledger.ts` sendiri dan di
  `docs/PRD-USULAN-PENGEMBANGAN-E9-KEDALAMAN.md` — dan dua kali ditunda.

---

## 2. Objective

Satu firma, satu buku besar: **setiap figur keuangan firma diturunkan dari jurnal
terposting**, sehingga memposting/membatalkan jurnal menggeser SELURUH aplikasi, bukan
satu modul.

## 3. Success Criteria

| # | Kriteria | Cara uji |
|---|---|---|
| SC-1 | `FIRMFIN` menerima COA turunan-ledger dari pemanggil; tak ada lagi pembaca seed langsung di jalur React | grep + uji |
| SC-2 | Memposting jurnal menggeser P&L, Neraca, KPI & anggaran Firm Finance | uji: post JV-0307 → opProfit turun 210 jt |
| SC-3 | Memposting jurnal ke akun kontrol menggeser `control` di keempat rekonsiliasi | uji per akun |
| SC-4 | Firm GL & Firm Finance melaporkan laba yang SAMA di setiap keadaan | uji: `statements().netProfit` vs `pl().opProfit` turunannya |
| SC-5 | Pada seed bersih (gl == seedGl) angka tampil TIDAK berubah sedikit pun | uji snapshot + tinjauan |
| SC-6 | Membatalkan posting mengembalikan angka (dua arah, bukan sekali jalan) | uji |
| SC-7 | `npm run verify` hijau; ratchet `:any` tidak naik | CI |
| SC-8 | Live-verified: posting di Firm GL → angka Firm Finance ikut bergerak | screenshot dua keadaan |

## 4. Scope

1. **Hook `useFirmCoa()`** — membaca jurnal terpersist (`firmgl`) + `FIRM_COA` seed,
   mengembalikan COA dengan saldo turunan-ledger. Satu pintu, meniru pola `useFirmWip`.
2. **Menyalurkan `ctx.coa`** di tiga tempat pemanggil (inventaris lengkap, kecil):
   `view_firmfinance.tsx` (satu ctx → 11 fungsi), `use_firm_wip.ts`, dan
   `view_continuance.tsx:206` (`FIRMFIN.pl({})` telanjang).
3. **Uji** — posting/unposting menggeser figur; Firm GL ↔ Firm Finance sepakat.
4. Verifikasi hidup dua keadaan.

## 5. Non-Scope

- **Menambah jurnal seed untuk 1-200/1-300/2-100** supaya akun kontrol punya jejak
  posting — lihat Q-3.
- **Menutup baris Kas** (#240): itu soal register rekonsiliasi bank multi-rekening,
  bukan soal ledger.
- Mengubah `firm_ledger.ts` — ia sudah benar dan sudah teruji.
- Mengubah sub-buku mana pun (WIP/AR/AP) — semuanya baru saja dirapikan.

## 6. Constraints

- CLAUDE.md §3.2 SSOT · ratchet `:any` · `master` selalu hijau.
- **Angka pada seed bersih WAJIB tidak berubah.** Ini terpenuhi secara aljabar:
  `opening = seed − efek(seedGl)` dan `current = opening + efek(gl)`; saat `gl == seedGl`,
  `current == seed`. Jadi arc ini nol-delta sampai seseorang benar-benar memposting.
- `useServerState` tak punya broadcast lintas-instance (gotcha #237) — `useFirmCoa`
  harus jadi SATU pintu, bukan dipanggil ulang di banyak komponen yang hidup bersamaan.
- `FIRMFIN` non-React & murni → COA harus DIKIRIM, bukan diambil dari global.

## 7. Existing Solutions

- `firm_ledger.ts` sudah lengkap: `openingBalances` · `currentBalances` · `trialBalance` ·
  `statements` · `accountLedger`, plus `firm_ledger.test.ts`. **Jangan tulis ulang.**
- `useFirmWip` sudah membuktikan pola "satu hook, satu pintu, semua konsumen sepakat".
- Kunci persist `firmgl` sudah ada dan sudah dipakai `view_firmgl`.

## 8. Proposed Approach

**F-1 — `use_firm_coa.ts`.** Hook mengembalikan `{ coa, gl, seedGl, balanced }`; `coa`
adalah `FIRM_COA` dengan `bal` diganti `currentBalances(...)`. Tanpa provider baru.

**F-2 — Salurkan.** `view_firmfinance` menambahkan `coa` ke ctx-nya; `useFirmWip`
menambahkannya ke ctx internalnya (sehingga Dashboard, Beranda & modul WIP ikut);
`view_continuance` memakai hook alih-alih `pl({})`.

**F-3 — Uji & verifikasi hidup.** Uji posting/unposting dua arah + kesepakatan Firm GL ↔
Firm Finance; lalu buktikan di peramban.

## 9. Risks

| # | Risiko | Mitigasi |
|---|---|---|
| R-1 | Angka demo bergeser tanpa disadari | Nol-delta secara aljabar saat `gl == seedGl`; SC-5 memakunya |
| R-2 | `view_continuance` memanggil `pl({})` di luar konteks React yang punya COA | Sudah di dalam komponen; hook aman dipakai |
| R-3 | Konsumen FIRMFIN lain terlewat → sebagian layar tetap seed | Inventaris sudah lengkap (7 fungsi pembaca COA, 3 pemanggil); SC-1 grep-gate |
| R-4 | Akun kontrol jadi bergerak → rekonsiliasi #239/#240 memerah | Itu perilaku yang BENAR; residual memang harus muncul bila jurnal menggeser kontrol tanpa sub-buku ikut |

## 10. Implementation Plan

| Fase | Isi | Kriteria |
|---|---|---|
| F-1 | `use_firm_coa.ts` | SC-1 |
| F-2 | Salurkan ke 3 pemanggil | SC-2..SC-4 |
| F-3 | Uji dua arah + verifikasi hidup | SC-5..SC-8 |

Satu PR — kecil dan saling membuktikan.

## 11. Open Questions

**Q-1 · Cakupan penyaluran.**
- **(a)** Ketiga pemanggil sekaligus (Firm Finance + `useFirmWip` + Continuance). Inventarisnya
  sudah lengkap dan hanya tiga titik. ← *rekomendasi*
- **(b)** Firm Finance dulu; `useFirmWip` & Continuance menyusul.

**Q-2 · Jurnal tertunda (`posted: false`).** Saat ini `JV-0307` menganggur tanpa penanda
di luar modul Firm GL.
- **(a)** Tambahkan indikator "ada N jurnal belum diposting" di Firm Finance, tanpa
  memblokir apa pun. ← *rekomendasi: informasi, bukan gerbang — jurnal tertunda itu
  keadaan normal, berbeda dari sub-buku yang tak menutup*
- **(b)** Perlakukan seperti #239/#240: blokir ekspor.
- **(c)** Tak ada penanda.

**Q-3 · Jurnal seed untuk akun kontrol (1-200 / 1-300 / 2-100).** Ketiganya kini tak
tersentuh jurnal mana pun, sehingga "kontrol GL" tak punya jejak posting sama sekali.
Menambahkan jurnal seed **tidak mengubah angka** (saldo awal ikut menyesuaikan secara
aljabar), tetapi memberi ketiganya riwayat yang dapat ditelusuri.
- **(a)** Tidak sekarang — arc ini fokus pada penyaluran; jurnal kontrol arc sendiri. ← *rekomendasi: menjaga PR tetap dapat ditinjau*
- **(b)** Sekalian, supaya "kontrol GL" benar-benar berarti kontrol.

---

## 12. Hasil

**Terverifikasi hidup** — memposting `JV-0307` lewat modul Firm GL:

| | Sebelum | Sesudah | Setelah dibatalkan |
|---|---:|---:|---:|
| Laba operasi Firm Finance | Rp 2,80 M | **Rp 2,59 M** | Rp 2,80 M |
| Margin operasi | 24,8% | **22,9%** | 24,8% |
| Chip "jurnal belum diposting" | 1 | **hilang** | 1 |

Sebelum arc ini angka itu tidak akan bergerak sama sekali. Keadaan demo dipulihkan
sesudahnya (`JV-0307` kembali draft).

**Nol-delta pada seed bersih terbukti** (SC-5): saat `gl == seedGl`, seluruh saldo turunan
identik dengan seed — jadi arc ini tak menggeser satu angka pun sampai seseorang benar-benar
memposting.

**Konsekuensi yang memang dikehendaki:** memposting jurnal ke akun kontrol tanpa pasangan
di sub-buku kini memerahkan rekonsiliasi #239/#240 (`glResidual` naik, status `open`).
Dipaku uji SC-3. Itu perilaku yang benar — jurnal yang menggeser kontrol tanpa sub-buku
memang selisih nyata.
