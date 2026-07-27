# PRD — Rekonsiliasi Fiskal PSAK 46 · PBT kedua yang tersisa

Status: **keputusan basis DIAMBIL (Opsi 1) · menunggu "Proceed." untuk implementasi**
Basis: master `f3d11ae` (pohon bersih · typecheck 0 · lint 0 · 735 test)

---

## 1 · Problem (tidak berubah)

PR-A menurunkan jumlah PBT dalam sistem dari empat menjadi dua. Yang tersisa adalah `FISCAL.pbt` (`canon_base.ts:240`):

```
FISCAL = { pbt: 48 500, pkp: 53 500, permAdd: 1 200, permLess: 3 000, fiscalTempMovement: 6 800 }
```

Identitas rekonsiliasinya **benar secara aritmetika**: 48.500 + 1.200 − 3.000 + 6.800 = 53.500 ✓. Itulah sebabnya PR-A sengaja tidak menyentuhnya — mengganti `pbt` tanpa menghitung ulang `pkp` akan memecahkan PSAK 46.

Tetapi titik berangkatnya membantah buku besar. PBT turunan WTB adalah **29.690** (unadjusted) / **25.750** (dilaporkan, setelah AJE terposting) / **22.780** (bila seluruh usulan diposting). Tidak satu pun 48.500. **Satu entitas melaporkan dua beban pajak**: 22% × 53.500 = 11.770 lewat jalur PSAK 46, dan 5.665 lewat jalur WTB.

Rekonsiliasi fiskal berangkat dari laba komersial menurut LK auditan — jadi ia inheren berada **di hilir finalisasi AJE**. Sistem memperlakukannya sebagai konstanta independen, sehingga PSAK 46 dapat "selesai" sementara jurnal penyesuaian masih usulan. Itu urutan terbalik, dan menjelaskan mengapa angkanya melenceng sejauh ini tanpa ada jalur yang memaksanya melihat WTB.

## 2 · Keputusan yang sudah diambil (Ari, 2026-07-27)

| # | Keputusan | Alasan |
|---|---|---|
| D-1 | **Populasi = induk STANDALONE**, bukan konsolidasian | Pajak dinilai **per entitas hukum** (SPT per entitas). Materialitas konsolidasian (SA 600, arc sebelumnya) dan PKP standalone berdampingan: **dua populasi, dua tujuan, keduanya benar.** |
| D-2 | **Basis = Opsi 1 — PBT dilaporkan 25.750** (unadj 29.690 + efek AJE **terposting** −3.940) | Laba komersial menurut LK yang akan diterbitkan pada titik waktu berjalan. Menolak basis `adj` (22.780) karena mengandaikan keputusan partner yang belum diambil — sirkularitas yang sama yang ditolak Q2 PR-A. |
| D-3 | `pkp` **DIHITUNG, tidak disimpan** | 25.750 + 1.200 − 3.000 + 6.800 = **30.750** |
| D-4 | `permAdd` / `permLess` / `fiscalTempMovement` **TETAP input** kertas kerja fiskal | Tidak ada sebagai saldo tunggal di buku besar komersial — komentar `canon_base.ts:231` sudah benar. |

Konsekuensi angka: pajak kini **11.770 → 6.765 (−43%)**, mengakhiri dua beban pajak untuk satu entitas.

## 3 · Objective

Satu PBT untuk satu entitas. Rekonsiliasi fiskal berangkat dari PBT dilaporkan yang sama dengan yang dipakai seluruh modul lain, dan `pkp` menjadi hasil hitung — bukan konstanta yang ditala agar identitasnya tampak seimbang.

## 4 · Angka sebelum → sesudah (dihitung, bukan diperkirakan)

| Pos (Rp juta) | Sekarang | Sesudah | Catatan |
|---|---:|---:|---|
| PBT komersial | 48.500 | **25.750** | = 29.690 unadj − 3.940 AJE Posted |
| PKP | 53.500 | **30.750** | 25.750 + 1.200 − 3.000 + 6.800 |
| Pajak kini (22%) | 11.770 | **6.765** | −43% |
| Manfaat pajak tangguhan L/R | 1.496 | 1.496 | tidak bergantung PBT |
| Beban pajak penghasilan | 10.274 | **5.269** | = 6.765 − 1.496 |
| ETR model | 21,18% | **20,46%** | 5.269 / 25.750 |
| DTA closing / opening / variance | — | **tidak berubah** | murni beda temporer |

**Identitas ETR tetap tertutup:** 25.750×22% + 1.200×22% − 3.000×22% = 5.665 + 264 − 660 = **5.269** = beban pajak. Baris "Penyesuaian pajak tangguhan periode lalu" (`etrResid`) tetap nol — sama seperti sekarang. Ini bukan kebetulan: identitasnya aljabar, `taxExpense = (pbt + permAdd − permLess) × r`.

## 5 · Empat temuan baru dari pembacaan kode (tidak ada di draf-1)

**T-1 · `P46_FISCAL` adalah salinan mati kedua.** `view_psak46.tsx:28-37` menyimpan tabel rekonsiliasi fiskal sebagai konstanta terpisah — 48.500 dan 53.500 diketik ulang di sana, ditambah rincian empat beda temporer (1.860 · 2.400 · 900 · 1.640) yang di canon hanya hidup sebagai penjumlahan `1860 + 2400 + 900 + 1640`. Memperbaiki canon saja akan membuat modul membantah dirinya sendiri di layar yang sama — **persis kegagalan sesi lalu** (KPI konsolidasian vs tabel standalone). Dua string lagi memaku "PKP 53.500 × 22%" (`:84`, `:215`).

**T-2 · `view_psak46` tidak reaktif sama sekali.** Baris 160: `canon.deferredTax()` dipanggil **tanpa argumen** dan tanpa `useAudit()` — modul ini satu-satunya konsumen PSAK 46 yang tidak membaca WTB perikatan (bandingkan `view_psak71.tsx:351` yang sudah `deferredTax(wtb)`). Karena basis baru bergantung status posting AJE, memposting jurnal harus menggerakkan panel ini. Tanpa perbaikan ini, `FIG` yang di-memo lazy tidak pernah dibangun ulang saat AJE berubah.

**T-3 · `etr` akan NaN pada WTB degenerat.** `canon_part1.ts:35` menghitung `taxExpense / f.pbt` dengan `f.pbt` yang dulu konstanta 48.500 — tak pernah nol. Setelah diturunkan dari WTB, `deferredTax(FIXTURE_WTB)` (fixture yang tak punya akun 4-/5- selain pajak) memberi pbt = 0 → `etr = Infinity`, dan `DT.etr * 100` masuk ke layar. Harus dijaga: `etr: null` bila pbt nol, view menampilkan "—".

**T-4 · Satu diagnostik BARU akan menyala — dan itu benar.** `bookTaxFlags` (`diagnostics.ts:149`) membandingkan beban pajak **dibukukan** (WTB 5-5100 = 11.240) terhadap PBT. Sekarang 11.240/48.500 = 23,2% → selisih 1,2% < ambang 3% → diam. Sesudah: 11.240/25.750 = **43,7%** → selisih 21,7% → **`bt-etr` menyala**. Selisih model vs buku besar 11.240 − 5.269 = **5.971 jt, di atas OM 3.088 jt** → salah saji material atas beban pajak. Alarmnya selama ini dibungkam oleh PBT 48.500, persis pola `drift` di PR-A. `bt-perm` juga menguat (8,66% → 16,3% dari PBT) dan tetap menyala. **Rekomendasi: terima.** Menyalanya alarm adalah kriteria sukses, bukan regresi (lihat Q-1).

## 6 · Scope

1. **`canon_base.ts`** — fungsi baru `fiscalReconciliation(wtb?, aje?)` → `{ pbtUnadj, ajePosted, pbt, permAdd, permLess, tempMovement, pkp, available }` (Rp juta). Zero-arg jatuh ke `wtbRows(undefined)` → `AMS.WTB` dan `AMS.AJE` (**kontrak kanon: setiap fungsi dapat dipanggil tanpa argumen**). Internalnya `entityFigures(rows,'unadj').pbt + ajeEffect(list,'Posted').pbt`, dibulatkan ke juta **setelah** penjumlahan.
2. **`FISCAL`** — buang kunci `pbt` & `pkp` (bukan lagi input). Ganti `fiscalTempMovement: 1860+2400+900+1640` dengan larik bernama `tempMovementItems` (label + nilai + ref PSAK) dan turunkan totalnya — mematikan duplikasi T-1 pada sumbernya.
3. **`buildFigures()`** (`canon_base.ts:277-278`) — `pbt`/`pkp` dari `fiscalReconciliation()`. `Fig` tetap punya kedua field (turunan, bukan konstanta).
4. **`canon_part1.deferredTax(wtb?, aje?)`** — tambah parameter kedua; bila `wtb`/`aje` diberi, `pbt`/`pkp` ikut hidup (pola yang sudah ada di baris 9-12 untuk dbo/ckpn/dtaReported). Jaga `etr` terhadap pbt = 0 (T-3).
5. **`view_psak46.tsx`** — `useAudit()` untuk `wtb` + `aje`; `deferredTax(wtb, aje)`; `P46_FISCAL` diturunkan dari canon (label tetap di view, **angka dari canon**); dua string "PKP 53.500 × 22%" jadi template; tangani `etr === null`.
6. **Jembatan PBT tampil di layar** — tiga baris di atas tabel rekonsiliasi: PBT unadjusted 29.690 → efek AJE terposting (3.940) → **PBT dilaporkan 25.750**, sehingga auditor dapat menelusurinya ke modul AJE. Tanpa ini angka 25.750 muncul tanpa asal-usul.
7. **Gerbang urutan** — banner bila masih ada AJE berstatus `Proposed`: "Rekonsiliasi fiskal belum final — 2 jurnal penyesuaian masih berstatus usulan (AJE-03, AJE-05)". Rekonsiliasi fiskal berada di hilir finalisasi AJE; ini menyatakannya di layar.
8. **Label populasi (D-1)** — satu baris di panel: basis = **laba komersial induk standalone (PT Sentosa Makmur Tbk)**, bukan konsolidasian, karena PPh Badan dinilai per entitas hukum. Setelah arc SA 600 menaikkan seluruh app ke konsolidasian, panel yang diam soal populasinya akan terbaca sebagai cacat — bukan sebagai keputusan.
9. **Test** — perbarui oracle `canon_part1.test.ts:14-25`; berkas baru `canon_fiscal.test.ts`: identitas PBT ties ke `entityFigures + ajeEffect`, identitas PKP, kontrak zero-arg, WTB degenerat → `etr === null`, dan penjaga anti-kambuh (`pkp` bukan 53.500).

## 7 · Non-Scope

- Mengubah tarif, beda permanen, atau movement beda temporer (D-4).
- Pajak tangguhan OCI (`ociRemeasure`) — terpisah, tidak bergantung PBT.
- **Menyelaraskan WTB 5-5100 (11.240) ke model** — lihat Q-1; menyembunyikan selisihnya justru membatalkan tujuan PRD.
- Membuat `fiscalTempMovement` bereaksi terhadap AJE terposting — lihat Q-2.
- Fiskal grup / konsolidasian. D-1 menutup ini secara metodologis, bukan menundanya.

## 8 · Risks

- **Snapshot regresi kanon WAJIB diperiksa satu per satu**, bukan `-u` massal. Baris yang akan **BERUBAH** (bukan bertambah) sudah dipetakan: `.snap` baris 578, 673-674, 6253-6257, 6389, 6484-6485 (`currentTax`, `pbt`, `pkp`, dan narasi `reconcile` row `tax`). Meng-`--update` buta adalah persis cara sebuah angka karangan bertahan lima kali evaluasi.
- Naskah demo yang menarasikan beban pajak berubah di ≥3 tempat (PSAK 46, reconcile row `tax`, DiagnosticPanel).
- `FISCAL` diekspor lewat `AMS_CANON.FISCAL` (`canon.ts:48`); membuang dua kunci mengubah permukaan publik. Grep memastikan nol konsumen di luar `canon_base` — tetap dicatat.
- `bookTaxFlags` diuji dengan fixture literal `pbt: 48500` (`diagnostics.test.ts:48,67`) — itu fixture independen, **bukan** oracle canon; biarkan.

## 9 · Success Criteria

1. Nol konstanta PBT/PKP tersisa di jalur perhitungan: `grep -rn "48500\|53500" migration/src` hanya menyisakan fixture diagnostik & `wedge/import_parse.test.ts`.
2. Beban pajak yang ditampilkan **modul PSAK 46 dan modul AJE berangka sama** (5.665 pajak atas PBT dilaporkan konsisten dengan jembatan; beban pajak model 5.269 dijelaskan bridge ETR).
3. Jembatan PBT → PKP tampil di layar dan **tie** — diverifikasi live, **KPI dan tabel di modul yang sama** (pelajaran sesi lalu: 735 test hijau sementara modul membantah dirinya di layar yang sama).
4. Memposting/mencabut AJE **menggerakkan** panel PSAK 46 (bukti T-2 tertutup).
5. `bt-etr` menyala dengan angka yang benar; `reconcile` row `tax` menampilkan selisih model vs buku besar 5.971 jt.
6. `typecheck` 0 · `lint` 0 (ratchet `any` tidak naik) · seluruh test hijau dengan snapshot diperiksa manual.

## 10 · Open Questions (keduanya **tidak memblokir** — ada rekomendasi)

**Q-1 · Selisih beban pajak dibukukan vs model (5.971 jt) — terima sebagai temuan, atau tala ulang seed?**
Rekomendasi: **terima.** WTB koheren secara internal (laba neto unadj 29.690 − 11.240 = 18.450 ≈ pergerakan saldo laba 18.094); yang tidak koheren adalah input kertas kerja fiskal, yang memang ditala ke PBT fantasi 48.500. Menyalanya `bt-etr` adalah sistem akhirnya melakukan tugasnya. Alternatifnya berarti mengarang data pajak agar alarm diam — kelas kesalahan yang sedang diperbaiki.

**Q-2 · Haruskah `fiscalTempMovement` ikut bergerak ketika AJE terposting menyentuh pos berbeda temporer?**
Secara teknis **ya**, dan seed membuktikannya konkret: **AJE-02 (Posted) menambah CKPN 620 jt** — pos yang persis menjadi baris "Beban CKPN / kerugian ekspektasian (PSAK 71) 2.400" dalam movement; **AJE-04 (Posted) mengakru bonus 980 jt**, juga dapat dikurangkan saat dibayar. Jadi input 6.800 sudah usang **secara terketahui**.
Rekomendasi: **jangan dikerjakan di PR ini** — memerlukan pemetaan akun → ember beda temporer, yaitu keputusan metodologi pajak tersendiri, dan mengarangnya sekarang mengulangi kesalahan yang menciptakan 48.500. Sebagai gantinya **ungkapkan**: satu baris peringatan terhitung di panel yang menyebut jurnal terposting yang menyentuh akun berbeda temporer. Celah diketahui dan terlihat, bukan tersembunyi. PR terpisah bila Anda ingin menutupnya.

---

## 11 · Implementation Plan (setelah "Proceed.")

| Langkah | Berkas | Gerbang |
|---|---|---|
| 1 | `canon_base.ts` — `fiscalReconciliation()`, `FISCAL.tempMovementItems`, `buildFigures()` | `npm run typecheck` |
| 2 | `canon_part1.ts` — `deferredTax(wtb?, aje?)` + jaga `etr` | typecheck |
| 3 | `canon_fiscal.test.ts` baru + perbarui `canon_part1.test.ts` | `npm test` (test dulu, snapshot belakangan) |
| 4 | Periksa `canon_regression.test.ts.snap` baris demi baris → `-u` hanya setelah tiap `-`/`+` dibenarkan | `git diff --ignore-all-space` |
| 5 | `view_psak46.tsx` — reaktif, tabel terderivasi, jembatan, gerbang, label populasi | typecheck + lint |
| 6 | Verifikasi live: KPI **dan** tabel, posting/cabut AJE menggerakkan panel, DiagnosticPanel | panel Browser (butuh Ari membuka & login) |
| 7 | PR + CI 6/6 | — |

**Rambu kerja (dari GOTCHA sesi lalu):** satu `any` baru meng-un-suppress SELURUH berkas → pakai tipe struktural, bukan `React.ChangeEvent` · grep `styles_base.css` sebelum memakai nama token CSS · `.snap` berkedip LF↔CRLF (`.gitattributes` #145 semestinya sudah menutupnya — verifikasi).
