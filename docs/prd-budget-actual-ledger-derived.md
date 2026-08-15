# PRD — "Aktual" adalah buku besar, bukan kolom kedua: anggaran & jejak posting akun kontrol

> Wajib diisi sebelum implementasi apa pun. Implementasi TIDAK dimulai sebelum sign-off ("Proceed.").

| Field | Isi |
|---|---|
| Tanggal | 2026-08-15 |
| Pemilik | Ari Widodo |
| Status | **In Progress** — "Proceed." 2026-08-15 ("sesuai rekomendasi") ⇒ Q-1=a hapus kolom `actual` · Q-2=a gerbang cakupan · Q-3=a tiga akun kontrol · Q-4=a dua PR · Q-5=a cabut `+ 6`. PR 1 = Bagian C (F-1..F-3, F-5); PR 2 = Bagian B (F-4). |
| Pemicu | Sisa #241 yang belum tersapu: tiga surface masih menyimpan angka laba kedua · Q-3 #241 (jurnal akun kontrol) yang ditunda |
| PRD terkait | `prd-firmfin-ledger-derived.md` (Implemented, #241) · `prd-wip-rollforward-falsifiable.md` · `prd-ar-ap-bridge-falsifiable.md` |
| Prasyarat | Di atas `master` `5d7515d` |

---

## 1. Problem

#241 baru saja memberi judul "**satu firma, satu angka laba**". Judul itu belum benar.

`FIRMFIN` kini membaca COA turunan buku besar — tetapi **kolom `actual` pada
`FIRM_BUDGET` masih literal**, dan **tiga modul membacanya mentah tanpa melewati
`FIRMFIN` sama sekali**. Ketiganya menghitung ulang penjumlahan yang sama, masing-masing
dengan salinan aritmetikanya sendiri:

| Berkas | Baris | Yang ditampilkan |
|---|---|---|
| [view_bi.tsx](../migration/src/view_bi.tsx) | 58–61, 119, 144–145 | headline `Pendapatan FY2025`, `Laba Operasi`, `Margin`, teks naratif |
| [view_bi2.tsx](../migration/src/view_bi2.tsx) | 24–26, 32–34 | headline `Pendapatan FY2025`, `Laba Operasi`, `Margin Operasi` |
| [view_firmtreasury.tsx](../migration/src/view_firmtreasury.tsx) | 42–44, 64, 89, 107–113, 166–168 | `Pendapatan Aktual`, tabel Anggaran vs Aktual, ekspor, drill-down per baris |

### 1.1 Terukur: angka laba kedua masih hidup

Probe atas seed nyata. Skenario sama seperti #241 — memposting `JV-0307` (akrual PPh 21
Rp 210 jt), satu-satunya jurnal `posted: false` di seed.

| | BOOT | Setelah `JV-0307` diposting |
|---|---:|---:|
| `FIRMFIN.pl.opProfit` — Firm Finance & Firm GL | 2.800 | **2.590** |
| `budget.actProfit` — BI Kinerja, BI Industri, Treasury | 2.800 | **2.800** ← tak bergerak |
| Selisih | 0 | **210** |
| `budget.allTied` | `true` | `false` (baris 5-100 selisih 210) |

Jadi setelah satu klik "Posting", **BI menyatakan Laba Operasi Rp 2,8 M sementara Firm
Finance & Firm GL menyatakan Rp 2,59 M** — persis cacat yang #241 klaim sudah ditutup,
di tiga layar yang belum tersentuh.

### 1.2 "Aktual" sebagai kolom register adalah pembukuan kedua

Ini bukan sekadar cacat penyaluran. Secara akuntansi, **"aktual" dalam laporan
anggaran-vs-aktual *adalah* buku besar** — tidak ada register aktual yang terpisah.
Menyimpan `actual` sebagai literal di samping `acct` yang menunjuk ke akun GL berarti
memelihara dua set angka untuk satu peristiwa, dan berharap keduanya tidak menyimpang.

### 1.3 Akun tanpa jejak posting (bagian B)

Checkpoint 2026-08-15 mencatat "1-200/1-300/2-100 tak tersentuh jurnal mana pun".
**Diukur, klaim itu meleset**: 1-200 disentuh 2 jurnal dan 2-100 disentuh 1 jurnal.
Yang benar lebih luas — **9 dari 15 akun** tidak punya satu pun jurnal terposting:

| akun | nama | saldo awal | mutasi | saldo kini | #jurnal |
|---|---|---:|---:|---:|---:|
| 1-100 | Kas & Bank | 9.795 | (1.375) | 8.420 | 3 |
| 1-200 | Piutang Usaha (klien) | 4.810 | (370) | 4.440 | 2 |
| **1-300** | **WIP Belum Ditagih** | 9.300 | **0** | 9.300 | **0** |
| **1-400** | **Aset Tetap — neto** | 6.100 | **0** | 6.100 | **0** |
| 2-100 | Utang Usaha (vendor) | (1.480) | (340) | (1.820) | 1 |
| **2-200** | **Utang Pajak** | (940) | **0** | (940) | **0** |
| **2-300** | **Beban Akrual** | (1.260) | **0** | (1.260) | **0** |
| **3-100** | **Modal Rekan** | (14.000) | **0** | (14.000) | **0** |
| **3-200** | **Saldo Laba** | (7.440) | **0** | (7.440) | **0** |
| 4-100 | Pendapatan Jasa | (10.745) | (555) | (11.300) | 1 |
| 5-100 | Beban Gaji & Tunjangan | 3.600 | 1.820 | 5.420 | 1 |
| 5-200 | Beban Overhead Kantor | 750 | 820 | 1.570 | 2 |
| **5-300** | **Beban Umum & Administrasi** | 540 | **0** | 540 | **0** |
| **5-400** | **Beban Pemasaran & Pengembangan** | 360 | **0** | 360 | **0** |
| **5-500** | **Beban Teknologi & Lisensi** | 610 | **0** | 610 | **0** |

Konsekuensinya menyentuh bagian C secara langsung: tiga dari enam baris anggaran
(5-300/5-400/5-500) menunjuk ke akun yang **tak pernah dijurnal**, sehingga "menurunkan
aktual dari buku besar" untuk baris-baris itu hari ini menghasilkan angka yang sama
persis. Itu jujur — dan mulai berarti pada klik posting pertama.

### 1.4 Temuan tambahan di jalur yang sama: konstanta `+ 6`

[view_firmfinance.tsx:120](../migration/src/view_firmfinance.tsx#L120):

```tsx
delta={'+' + ((D.budget.actRev / D.budget.budRev - 1) * 100 + 6).toFixed(1) + '%'}
deltaDir="up"
```

Varians pendapatan yang sebenarnya adalah **11.300 / 12.000 − 1 = −5,8%** (di **bawah**
anggaran). Ditambah konstanta `6`, layar menampilkan **"+0,2%" dengan panah hijau ke
atas**, di sebelah label "Pendapatan KAP (GL 4-100)". Angka itu tidak menunjukkan apa pun —
ia dikarang agar terlihat positif, dan membalik tanda varians yang sesungguhnya.

Ini kelas cacat yang sama dengan empat angka plug #239 dan `note` hardcode #240, di jalur
kode yang sama persis dengan PRD ini.

### 1.5 Kenapa ini merugikan

- **Produk ini menjual disiplin keuangan firma.** Dua angka laba di dua layar bersebelahan
  adalah hal pertama yang dicari auditor mana pun — dan BI justru layar yang ditunjukkan
  ke rekan/partner.
- **Gerbang tie-out di Firm Finance akan jadi tautologi** bila `actual` diturunkan
  serampangan (lihat §8 dan Q-2). Itu akan mengulang cacat #240: badge yang tak pernah
  bisa merah.
- **Utang ini sudah dua kali ditunda**: Non-Scope #239, lalu Q-3 #241.

---

## 2. Objective

**"Aktual" hanya punya satu arti di seluruh aplikasi: saldo akun buku besar.** Setiap
layar yang menampilkan pendapatan/beban/laba aktual firma menurunkannya dari jurnal
terposting — dan setiap saldo akun kontrol punya jejak posting yang dapat ditelusuri.

## 3. Success Criteria

| # | Kriteria | Cara uji |
|---|---|---|
| SC-1 | Nol pembaca `FIRM_BUDGET[].actual` di luar `data_firmfin.ts` | grep-gate + uji |
| SC-2 | Memposting `JV-0307` menggeser headline Laba Operasi di BI Kinerja, BI Industri & Treasury sebesar 210 jt | uji per surface |
| SC-3 | BI · Treasury · Firm Finance · Firm GL melaporkan laba yang SAMA di setiap keadaan | uji lintas-surface |
| SC-4 | Nol-delta pada seed bersih: `gl == seedGl` ⇒ tak satu angka pun bergerak | uji |
| SC-5 | Dua arah: membatalkan posting mengembalikan angka | uji |
| SC-6 | Gerbang cakupan anggaran **DAPAT MERAH**: akun P&L tanpa baris anggaran ⇒ badge merah | uji perusak (tambah akun 5-600 tanpa baris anggaran) |
| SC-7 | Konstanta `+ 6` dicabut; delta pendapatan menampilkan varians sesungguhnya (−5,8%, panah turun) | uji + tinjauan |
| SC-8 | Ketiga akun kontrol sub-buku punya ≥1 jurnal seed terposting | uji |
| SC-9 | Menambah jurnal seed TIDAK menggeser satu saldo kini pun | uji nol-delta |
| SC-10 | Status rekonsiliasi #239/#240 tidak berubah oleh bagian B | uji regresi |
| SC-11 | `npm run verify` hijau; ratchet `:any` tidak naik | CI |
| SC-12 | Live-verified DUA ARAH: posting di Firm GL → BI & Treasury ikut bergerak, lalu kembali | screenshot |

## 4. Scope

### Bagian C — aktual diturunkan (utama)

1. **`FIRMFIN.budget(ctx)`** menurunkan `actual` per baris dari `acct(coa, b.acct)`
   (mekanisme `glVal` yang **sudah ada** di baris 396), bukan dari literal.
2. **Kolom `actual` dihapus dari seed `FIRM_BUDGET`** — `budget` (rencana) + `acct`
   (pemetaan) saja. Ini yang membuat SC-1 mustahil dilanggar diam-diam.
3. **Tiga pembaca mentah disalurkan** lewat `FIRMFIN.budget(ctx)` dengan `ctx.coa` dari
   `useFirmCoa()`: `view_bi`, `view_bi2`, `view_firmtreasury`. Tiga salinan aritmetika
   dihapus.
4. **Gerbang tie diganti gerbang cakupan** (§8) — yang dapat merah.
5. **Konstanta `+ 6` dicabut** (§1.4).

### Bagian B — jejak posting akun kontrol

6. **Jurnal seed** untuk akun kontrol sub-buku sehingga "kontrol GL" punya riwayat.
   Nol-delta secara aljabar (`opening = seed − efek(seedGl)`).

## 5. Non-Scope

- **Menutup baris Kas 1-100** — register rekonsiliasi bank multi-rekening, arc sendiri
  (utang #240, masih terbuka).
- Mengubah `firm_ledger.ts` atau `use_firm_coa.ts` — keduanya baru saja terbukti benar.
- Mengubah sub-buku WIP/AR/AP.
- **Fasing triwulanan & bobot pendorong** di drill-down Treasury (`view_firmtreasury.tsx`
  166–203). Sudah berlabel "ILUSTRASI demo (sintesis)" secara eksplisit — jujur, bukan
  klaim palsu. Menurunkannya butuh dimensi periode di GL yang belum ada.
- Enam akun non-kontrol tanpa jejak posting (1-400, 2-200, 2-300, 3-100, 3-200) —
  lihat Q-3.

## 6. Constraints

- CLAUDE.md §3.2 SSOT · ratchet `:any` · `master` selalu hijau.
- **Nol-delta pada seed bersih WAJIB**, untuk kedua bagian. Bagian C: `actual` literal
  hari ini sudah identik dengan `glVal` untuk keenam baris (terukur, §1.1 BOOT).
  Bagian B: dijamin aljabar saldo awal.
- Setiap gerbang harus **dibuktikan bisa merah** — SC-6 memakai uji perusak.
- `useFirmCoa` dipanggil di tiga view baru. Aman: view level-rute, hanya satu ter-mount
  pada satu waktu, dan hook ini **murni membaca** (gotcha #237 tentang divergensi
  `useServerState` menyangkut *tulis*, bukan baca).

## 7. Existing Solutions

**Jangan tulis ulang — ini semua sudah ada:**

- `FIRMFIN.budget()` sudah menghitung `glVal` per baris dari COA (baris 396). Perubahan
  intinya satu baris: `actual` menjadi `glVal`.
- `useFirmCoa()` (#241) sudah jadi satu pintu COA turunan-ledger.
- [view_firmfinance.tsx:414](../migration/src/view_firmfinance.tsx#L414) **sudah**
  membandingkan `budget.actProfit` dengan `pl.opProfit` dan memberi badge merah/hijau.
  Gerbang cakupan yang diusulkan §8 adalah badge ini — tanpa menambah apa pun.
- `firm_ledger.test.ts` & `firmfin_ledger.test.ts` sudah memaku kontrak lapisannya.

## 8. Proposed Approach

**F-1 — `actual` diturunkan; tie diganti cakupan.**

Setelah `actual := glVal`, badge per-baris "Cocok/Selisih"
([view_firmfinance.tsx:411](../migration/src/view_firmfinance.tsx#L411)) menjadi
**tautologi — selalu hijau, tak pernah bisa merah**. Membiarkannya berarti mengulang
persis cacat #240. Ia harus diganti, bukan dibiarkan.

Penggantinya sudah ada di baris 414 dan berhenti tautologis begitu maknanya bergeser:

```
budget.actProfit  = Σ atas akun yang PUNYA baris anggaran
pl.opProfit       = Σ atas SELURUH akun Pendapatan & Beban di COA
```

Keduanya sama **hanya bila setiap akun P&L punya tepat satu baris anggaran**. Akun yang
diposting tapi tak dianggarkan ⇒ badge merah. Itu rekonsiliasi yang sesungguhnya dan
justru yang paling berguna: *"ada beban yang tak ada di anggaran"*. Badge per-baris
berubah makna menjadi status pemetaan (akun ada di COA / tidak), dan baris yatim
(akun COA tanpa baris anggaran) ditampilkan eksplisit.

**F-2 — Salurkan tiga pembaca.** `view_bi`, `view_bi2`, `view_firmtreasury` memakai
`useFirmCoa()` → `FIRMFIN.budget(ctx)`; tiga salinan `filter/reduce` dihapus. Kolom
`actual` dihapus dari `data_part2.ts` sehingga tak ada jalan kembali.

**F-3 — Cabut `+ 6`.** Delta menampilkan `(actRev / budRev − 1)` apa adanya, dengan
`deltaDir` mengikuti tandanya.

**F-4 — Jurnal seed akun kontrol** (bagian B, sesuai jawaban Q-3).

**F-5 — Uji & verifikasi hidup**, termasuk keadaan merahnya.

## 9. Risks

| # | Risiko | Mitigasi |
|---|---|---|
| R-1 | Gerbang tie jadi tautologi setelah `actual` diturunkan | Justru inti F-1; SC-6 memaksanya dibuktikan bisa merah lewat uji perusak |
| R-2 | Menghapus `actual` dari seed memutus pembaca yang terlewat | grep-gate SC-1; `typecheck` menangkapnya karena bentuk data berubah |
| R-3 | Angka demo bergeser | Nol-delta terukur untuk keenam baris (§1.1); SC-4 memakunya |
| R-4 | Tiga baris anggaran menunjuk akun tanpa jurnal (5-300/5-400/5-500) ⇒ "derivasi" terasa kosmetik | Diakui terbuka di §1.3. Bagian B mempersempitnya; sisanya jadi nyata pada posting pertama |
| R-5 | Jurnal seed bagian B menggeser rekonsiliasi #239/#240 | SC-9 & SC-10; saldo kini tak berubah ⇒ `control` tak berubah |
| R-6 | `useFirmCoa` di banyak view | Hanya baca, view level-rute; §6 |

## 10. Implementation Plan

| Fase | Isi | Kriteria |
|---|---|---|
| F-1 | `budget()` diturunkan + gerbang cakupan | SC-6 |
| F-2 | Tiga pembaca disalurkan; `actual` dihapus dari seed | SC-1..SC-5 |
| F-3 | Cabut `+ 6` | SC-7 |
| F-4 | Jurnal seed akun kontrol | SC-8..SC-10 |
| F-5 | Uji dua arah + verifikasi hidup termasuk keadaan merah | SC-11, SC-12 |

**Dua PR** (bagian C = F-1..F-3, F-5; bagian B = F-4), atau **satu PR** bila Anda lebih
suka satu tinjauan — lihat Q-4.

## 11. Open Questions

**Q-1 · Nasib kolom `actual` di seed `FIRM_BUDGET`.**
- **(a)** Dihapus seluruhnya; `actual` hanya ada sebagai turunan GL. ← *rekomendasi:
  satu-satunya opsi yang membuat SC-1 tak bisa dilanggar diam-diam, dan yang benar
  secara akuntansi — "aktual" memang buku besar*
- **(b)** Dipertahankan, dimaknai ulang sebagai "forecast/anggaran revisi", ditampilkan
  sebagai kolom ketiga. Menambah kolom yang harus dijaga tetap masuk akal.
- **(c)** Dibiarkan sebagai literal; hanya tiga pembaca yang disalurkan. Menyisakan
  literal yang akan menyimpang lagi.

**Q-2 · Pengganti gerbang tie-out.**
- **(a)** Gerbang **cakupan** (§8): `actProfit` vs `pl.opProfit` jadi uji kelengkapan
  pemetaan; baris yatim ditampilkan. ← *rekomendasi: memakai badge yang sudah ada,
  tetap bisa merah, dan menguji hal yang benar-benar berisiko*
- **(b)** Hapus badge tie sama sekali (kolom aktual ≡ GL, tak ada yang perlu direkonsiliasi).
  Kehilangan sinyal kelengkapan.
- **(c)** Pertahankan `actual` literal khusus untuk mempertahankan tie (= Q-1b).

**Q-3 · Cakupan jurnal seed bagian B.**
- **(a)** **Tiga akun kontrol sub-buku** (1-200 AR, 1-300 WIP, 2-100 AP) diberi jurnal
  operasional biasa — WIP diakui & ditagihkan ke AR, faktur & pembayaran vendor.
  1-300 hari ini nol jurnal; 1-200 & 2-100 tipis (mutasi 8% & 19% dari saldo). ← *rekomendasi:
  tepat menyasar akun yang #239/#240 sebut "kontrol", tanpa mengarang aktivitas
  di akun yang bukan pokok masalah*
- **(b)** Kesembilan akun tanpa jejak posting (§1.3) diberi jurnal. Demo lebih utuh,
  seed jauh lebih besar, dan lima di antaranya (aset tetap, ekuitas) bukan akun kontrol.
- **(c)** Satu jurnal saldo awal tunggal `JV-OB` yang memposting seluruh posisi awal.
  Rapi, tapi artifisial — dan membuat "mutasi periode" kehilangan arti.

**Q-4 · Pengemasan PR.**
- **(a)** Dua PR: bagian C dulu (menutup #241), bagian B menyusul. ← *rekomendasi:
  bagian C mengubah makna kolom & gerbang — layak ditinjau sendiri*
- **(b)** Satu PR untuk keduanya.

**Q-5 · Konstanta `+ 6`.**
- **(a)** Dicabut dalam arc ini — ia ada di fungsi yang sama persis yang sedang disentuh. ← *rekomendasi*
- **(b)** Arc/PR sendiri.

---

## 12. Hasil — Bagian C

`npm run verify` hijau; uji **1791 → 1805** (+14); ratchet `:any` **8058 → 8033** (turun 25,
sebab `budget()` & tabel C diketik, bukan di-suppress).

**Gerbang dibuktikan MERAH sebelum diterima** (bukan sekadar hijau): menyisipkan
`covered = true` dan mengembalikan satu kolom `actual` ke seed menjatuhkan **5 uji** —
SC-1 dan keempat uji SC-6. Pelanggaran lalu dicabut.

**Terverifikasi hidup, dua arah** — memposting `JV-0307` lewat modul Firm GL:

| Layar | Sebelum | Sesudah posting | Setelah dibatalkan |
|---|---:|---:|---:|
| BI Kinerja — Laba Operasi | Rp 2,8 M | **Rp 2,6 M** | Rp 2,8 M |
| BI Kinerja — Margin | 25% | **23%** | 25% |
| BI Pendapatan — Laba Operasi | Rp 2,8 M | **Rp 2,6 M** | Rp 2,8 M |
| Treasury — Laba Operasi Aktual | Rp 2,8 M | **Rp 2,6 M** | Rp 2,8 M |
| Treasury — baris Beban Gaji | 5.420 | **5.630** | 5.420 |
| Firm Finance — Laba Operasi | Rp 2,80 M | Rp 2,59 M | Rp 2,80 M |

Sebelum arc ini, **empat baris pertama tidak bergerak sama sekali**.

**Konstanta `+ 6` tercabut, terlihat di layar:** headline "Pendapatan KAP (GL 4-100)" dulu
`▲ +0,2%` (hijau, naik) — kini `▼ −5,8% vs anggaran` (turun). Angkanya sekarang varians
yang sesungguhnya.

**Gerbang cakupan dibuktikan merah DI PERAMBAN**, bukan hanya di uji: menambah akun
`5-600 Beban Litigasi` (Rp 300 jt) ke COA tanpa baris anggaran memunculkan baris merah
`TAK DIANGGARKAN`, total `TAK MENUTUP`, dan catatan `Selisih cakupan Rp 300 jt`.
Pelanggaran dicabut sesudahnya; `data_part1.ts` bersih.

**Ditemukan hanya lewat verifikasi hidup:** spasi hilang di catatan tabel
("Baris LABA OPERASImembandingkan") — JSX menelan spasi setelah `<b>`. Diperbaiki `f224bc5`.

**Catatan terbuka (bukan bagian dari arc ini):** kontrol status posting di `view_firmgl`
adalah `<span onClick>` — tak muncul di pohon aksesibilitas dan tak dapat dioperasikan
keyboard. Melanggar CLAUDE.md §3.7 (kontrol form = NATIVE). Perlu PR sendiri.
