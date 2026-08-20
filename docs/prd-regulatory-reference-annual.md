# PRD — Data referensi regulatori bertahun: yang kedaluwarsa harus berkata kedaluwarsa

> Wajib diisi sebelum implementasi apa pun. Implementasi TIDAK dimulai sebelum sign-off ("Proceed.").

| Field | Isi |
|---|---|
| Tanggal | 2026-08-19 |
| Pemilik | Ari Widodo |
| Status | **In Progress** — **Proceed.** 2026-08-19 untuk **Tahap A saja**; Q-3 = **blokir yang menyangkut uang** (BPJS/TER/PTKP menolak menghitung; kalender libur tetap memperingatkan). Q-2 = Tahap B dinilai ulang setelah Tahap A terbukti. Q-1·Q-4·Q-5 menunggu DATA dari Ari dan TIDAK memblokir mekanismenya. **PR-1 SELESAI** (SC-1·2·7) · **PR-2 SELESAI** (SC-3·4) · **PR-3 SELESAI** (SC-5·6) · **PR-4 SELESAI** (SC-8·9). **TAHAP A TUNTAS** — SC-1..SC-10 tertutup |
| Pemicu | Dua utang tersisa arc SDM (`TER_TABLE.verified=false`, kalender libur SKB) + arahan Ari: *"biarkan saja atau atur agar dapat diupdate setiap tahun"* |
| Modul | `payroll` · `leave` · `personal` · (hilir: `hrops`, `pc_hcm`) |
| Berkas | `canon_pph21.ts` · `canon_leave.ts` · `data_part2.ts` (`PAYROLL_RATES`, `LEAVE_HOLIDAYS`) · `view_payroll.tsx` · `view_personal.tsx` |
| PRD terkait | `docs/prd-sdm-kepatuhan-deepening.md` (SC-4..SC-6, SC-12..SC-14) |
| Prasyarat | Di atas `master` `46eb651` |

---

## 1. Problem

Aplikasi memuat data referensi regulatori yang **berubah menurut kalender**, bukan menurut
kode. Sebagiannya menggerakkan perhitungan yang mengenai uang orang. Ketiganya punya
mekanisme kesegaran yang **berbeda-beda, dan dua dari tiga tidak punya sama sekali**.

| Data | Lokasi | Kadensi perubahan | Menggerakkan hitungan? | Mekanisme kesegaran |
|---|---|---|---|---|
| Kalender libur nasional (SKB 3 Menteri) | `data_part2.ts:193` | **tahunan** | ya — hari kerja cuti | ✅ `confirmedThroughYear` + `holidayCoverage()` menolak berpura-pura |
| Cuti bersama | — | **tahunan** | ya — hari kerja cuti | ✅ sengaja kosong, dan itu dinyatakan |
| Tabel TER PPh 21 (PMK 168/2023) | `canon_pph21.ts:79` | saat PMK berubah | ya — potongan PPh 21 | ⚠ `verified: false` — ada penandanya, **tapi tanpa tahun** |
| PTKP (`PTKP_ANNUAL`) | `canon_pph21.ts:48` | saat PMK berubah | ya — rekonsiliasi Desember | ❌ tak ada |
| Biaya jabatan (cap Rp 6 jt) | `canon_pph21.ts:245` | saat PMK berubah | ya | ❌ tak ada |
| Batas upah & tarif BPJS (`PAYROLL_RATES`) | `data_part2.ts:174` | **tahunan** (batas upah JP disesuaikan tiap tahun) | **ya** | ❌ tak ada — hanya label `period: 'Maret 2026'` |

Baris terakhir adalah yang paling tajam, dan ia **belum pernah dicatat sebagai cacat**.
`kesCap: 12_000_000` dan `jpCap: 10_547_400` bukan hiasan: keduanya dipakai langsung
menghitung potongan di dua tempat —

```
view_payroll.tsx:32-33   const kesBase = Math.min(p.gross, R.kesCap)
                         const jpBase  = Math.min(p.gross, R.jpCap)
view_personal.tsx:188,190  dKes = Math.min(pay.gross, R.kesCap) * R.kesEmp
                           dJp  = Math.min(pay.gross, R.jpCap)  * R.jpEmp
```

`period: 'Maret 2026'` **ada**, tetapi ia bukan gerbang. Ia dipakai sebagai kunci/label masa
penggajian — id jurnal, `payrollPostCheck`, judul slip (`view_payroll.tsx:111,114,117,133`) —
dan **tak pernah dipakai untuk memilih tarifnya**. Tak ada `ratesFor(period)`; `kesCap` dan
`jpCap` sekadar duduk bersebelahan dengan label itu. Pasangan "masa" dan "batas upah"
karenanya hanya berlaku karena kedekatan penulisan, bukan karena ada yang menegakkannya.

Akibatnya, pada Januari 2027 aplikasi akan
menghitung potongan BPJS setiap pegawai dengan batas upah 2026, menampilkannya di slip
gaji pegawai itu sendiri (`view_personal`), dan **tak ada satu pun tanda** bahwa angkanya
berasal dari tahun yang salah. Ini pola yang sama persis yang sudah dicabut berkali-kali
di repo ini — angka yang tampil meyakinkan di atas dasar yang tidak diperiksa — hanya
saja di sini dasarnya bukan salah sejak awal, melainkan **membusuk menurut jadwal**.

Yang membuat ini layak jadi satu arc, bukan dua tambalan: **mekanismenya sudah ada dan
sudah terbukti benar** di `canon_leave.holidayCoverage()`. Persoalannya bukan menemukan
pola, melainkan bahwa pola itu hanya diterapkan pada satu dari enam data sejenis.

### Kenapa "biarkan saja" bukan pilihan yang netral

Membiarkan berarti memilih **diam**. Kalender libur akan berkata jujur ketika 2027 tiba;
TER akan tetap berkata `verified: false` selamanya (dan penandanya kehilangan makna karena
tak pernah berubah); sedangkan BPJS akan **berbohong tanpa suara**. Tiga perilaku berbeda
untuk satu kelas masalah, di produk yang dijual sebagai sistem pertahanan kepatuhan.

---

## 2. Objective

Satu mekanisme untuk seluruh data referensi regulatori: **berkunci tahun berlaku, membawa
provenans, dan menolak menghitung diam-diam untuk tahun yang tidak dicakupnya.**

---

## 3. Success Criteria

| # | Kriteria |
|---|---|
| SC-1 | Satu tipe & registry bersama (`canon_regref.ts`): tiap set data punya `effectiveFrom` · `effectiveTo` (nullable) · `basis` (dasar hukum) · `sourceDoc` · `verified` · `verifiedBy` · `verifiedAt`. |
| SC-2 | `regrefFor(kind, date)` mengembalikan set yang berlaku pada tanggal itu, atau **`null` dengan alasan** — tak pernah "yang terdekat". |
| SC-3 | Konsumen yang MENGHITUNG (`view_payroll`, `view_personal`, `canon_pph21`, `canon_leave`) menampilkan penanda bila set yang dipakai belum terverifikasi atau tak mencakup tanggal hitung. Gerbang cakupan menolak konsumen baru yang melewatinya. |
| SC-4 | **BPJS:** `PAYROLL_RATES` menjadi bertahun. Menghitung slip untuk tanggal di luar cakupan menghasilkan penolakan yang dapat dibaca, bukan angka. Uji: slip Januari 2027 atas data yang hanya mencakup 2026 **tidak menghasilkan angka potongan**. |
| SC-5 | **TER:** `TER_TABLE` bertahun; `verified` per-tahun, bukan global. `terRate()` untuk tahun tak tercakup mengembalikan `rate: null` + alasan. |
| SC-6 | **PTKP & biaya jabatan** ikut registry yang sama (keduanya kini konstanta telanjang). |
| SC-7 | **Kalender libur:** `confirmedThroughYear` dipetakan ke bentuk baru **tanpa mengubah perilaku** `holidayCoverage()` — nol-delta, dibuktikan uji per-tahun. |
| SC-8 | Satu halaman **Data Referensi Regulatori** (read-only pada tahap ini) menampilkan seluruh set, tahun berlaku, dasar hukum, status verifikasi, dan **apa yang rusak bila ia kedaluwarsa** — sehingga "apa yang harus saya perbarui bulan Januari" terjawab dari satu layar. |
| SC-9 | Gerbang cakupan: konstanta regulatori baru di `canon_*`/`data_*` tanpa entri registry = uji merah (pola gerbang #242/#254, komentar dibuang). |
| SC-10 | Nol-delta untuk 2026: seluruh angka yang tampil hari ini tidak bergeser satu rupiah pun. Dibuktikan per-pegawai untuk slip gaji dan per-permintaan untuk hari kerja cuti. |

---

## 4. Scope

- Enam set data di tabel §1.
- `canon_regref.ts` baru + migrasi keenam set ke bentuk itu.
- Penanda di konsumen yang menghitung + satu halaman referensi read-only.
- Pengisian **data 2027** untuk yang sudah terbit; yang belum terbit dibiarkan kosong
  **dengan gerbangnya menyala**, bukan ditebak.

## 5. Non-Scope

- **Pengeditan lewat UI oleh admin firma** (lihat Q-2 — ini kandidat arc lanjutan, bukan ini).
- Penarikan otomatis dari sumber resmi (scraping JDIH/Kemnaker). Tak ada API resmi yang stabil;
  menariknya otomatis memindahkan risiko, tidak menghapusnya.
- Tarif/aturan di luar enam set itu (PPh badan, PPN, e-Faktur) — kelas yang sama, arc terpisah.
- Mengisi angka Lampiran PMK 168 yang sesungguhnya: itu **data dari Ari**, bukan pekerjaan kode
  (lihat Q-1).

## 6. Constraints

- `canon_*` wajib murni & deterministik (tanpa `Date.now()` implisit) — tanggal hitung
  **disuntikkan**, bukan dibaca dari klok di dalam kanon.
- Nol-delta 2026 mengikat: arc ini memperbaiki mekanisme, bukan menggeser angka demo.
- `data_part4` ↔ `data_backoffice` sudah terbukti rawan siklus; registry harus hidup di lapisan
  `canon_*` yang tak mengimpor `data_*`.

## 7. Existing Solutions (yang sudah ada — jangan bangun ulang)

- **`canon_leave.holidayCoverage()`** sudah persis pola yang dibutuhkan. Arc ini
  **menggeneralisasi**-nya, bukan menciptakan yang baru.
- `TER_TABLE.verified` + `terRate()` sudah meneruskan penanda ke pemanggil; yang kurang hanya
  dimensi tahun.
- Provenans (`PROVENANCE` di `data_licensing`) sudah jadi pola repo untuk "angka ini dari mana".

## 8. Proposed Approach

**Tahap A — mekanisme (arc ini).** Data tetap diperbarui dengan mengedit berkas sumber sekali
setahun, tetapi aplikasi **tak dapat lagi salah tanpa suara**. Ini 90% nilai dengan 20% usaha,
dan tak menambah permukaan risiko baru.

**Tahap B — pengeditan oleh firma (arc lanjutan, bila Q-2 = ya).** Halaman referensi menjadi
dapat ditulis: RBAC (`FIRM_ADMIN`), state server append-only, **atestasi** ("saya cocokkan
dengan Lampiran X tanggal Y"), dan jejak audit. Untuk produk yang dijual sebagai pertahanan
pajak, siapa mengubah tarif dan atas dasar apa adalah bagian dari produknya.

Urutan PR yang diusulkan (Tahap A):

| PR | Isi | SC |
|---|---|---|
| PR-1 | `canon_regref.ts` + migrasi kalender libur (nol-delta, set paling aman lebih dulu) | SC-1·2·7 |
| PR-2 | BPJS bertahun + gerbang di dua konsumen penghitung | SC-4·3 |
| PR-3 | TER + PTKP + biaya jabatan bertahun | SC-5·6 |
| PR-4 | Halaman Data Referensi Regulatori + gerbang cakupan | SC-8·9 |

## 9. Risks

| Risiko | Mitigasi |
|---|---|
| Gerbang baru memblokir demo (2027 kosong ⇒ Payroll menolak menghitung) | Gerbang mengikat pada **tanggal hitung**, dan `AMS.TODAY` = 2026. Demo tak tersentuh. Diuji dua keadaan: 2026 hijau, 2027 merah. |
| Migrasi menggeser angka 2026 | SC-10 nol-delta per-pegawai & per-permintaan cuti, dibuktikan sebelum & sesudah. |
| Registry menjadi "register kedua" bagi data yang sudah punya rumah | Migrasi = **pindah**, bukan salin. Gerbang SC-9 menolak duplikat. Pelajaran SC-24a (`docs/prd-sdm-kepatuhan-deepening.md`, PR-8). |
| Penanda terlalu banyak sehingga jadi bising dan diabaikan | Penanda hanya pada konsumen yang MENGHITUNG, dan hanya bila set benar-benar tak mencakup tanggalnya. |

## 10. Implementation Plan

Empat PR di atas, masing-masing `npm run verify` hijau + live-verified dua keadaan
(tahun tercakup / tak tercakup). Falsifikasi wajib: tiap gerbang baru dibuktikan MERAH
atas data lama sebelum di-commit.

## 11. Open Questions

**Q-1 — Angka Lampiran PMK 168.** Tabel TER saat ini *direkonstruksi* agar mereproduksi tarif
yang sudah dipakai aplikasi, dan jujur mengatakannya (`verified: false`). Apakah Anda akan
menyediakan Lampiran PMK 168/2023 (PDF/salinan) supaya lapisannya diganti dengan yang
sesungguhnya, atau arc ini berhenti pada mekanismenya saja dan `verified` tetap `false`
sampai dokumennya ada?
*Rekomendasi: kerjakan mekanismenya sekarang, tanpa menunggu dokumen.* Mekanismenya justru
yang membuat ketiadaan dokumen itu terlihat setiap hari, bukan terlupakan.

**Q-2 — Tahap B (pengeditan oleh admin firma) dikerjakan?** — **DIJAWAB 2026-08-19: Tahap A dulu.**
*Rekomendasi: ya, tapi sebagai arc terpisah setelah Tahap A terbukti.* Menulis tarif pajak
lewat UI menuntut atestasi + jejak audit + RBAC; menggabungkannya ke arc ini akan membuat
PR-nya terlalu besar untuk ditinjau dengan jujur.

**Q-3 — Perilaku ketika tahun tak tercakup: blokir atau hitung-dengan-peringatan?** — **DIJAWAB 2026-08-19: blokir yang menyangkut uang.**
*Rekomendasi: **blokir** untuk yang menggerakkan uang (BPJS, TER, PTKP), **peringatkan** untuk
yang tidak (kalender libur — sudah begitu hari ini).* Slip gaji yang salah lebih mahal daripada
slip gaji yang belum bisa dihitung. Ini sejalan dengan Q-4 arc SDM (blokir dgn override Partner)
— apakah Anda ingin override serupa di sini?

**Q-4 — Cuti bersama 2026.** Ia masih sengaja kosong, sehingga hari kerja cuti saat ini
**lebih-hitung**. SKB 2026 sudah terbit. Isi sekarang (butuh daftarnya dari Anda), atau tetap
kosong dengan gerbang menyala?

**Q-5 — Batas upah BPJS 2026.** `jpCap: 10_547_400` — apakah ini angka 2026 yang sudah Anda
cocokkan, atau warisan tahun sebelumnya? Bila belum dicocokkan, ia harus masuk arc ini sebagai
`verified: false`, bukan diam-diam diperlakukan benar.

---

## 12. Catatan verifikasi

Setiap klaim §1 diverifikasi terhadap sumber pada 2026-08-19, bukan diingat:

- `kesCap`/`jpCap` menggerakkan hitungan: `view_payroll.tsx:32-33` · `view_personal.tsx:188,190`.
- `PAYROLL_RATES.period` dipakai sebagai kunci masa penggajian (`view_payroll.tsx:111,114,117`),
  **tetapi tak satu pun jalur memakainya untuk memilih tarif** — tak ada `ratesFor(period)`
  di repo. Diperiksa dengan `grep -rn "\.period" migration/src/view_payroll.tsx view_personal.tsx`.
- `holidayCoverage()` sudah menolak berpura-pura: `canon_leave.ts:71-79`.
- `TER_TABLE.verified === false` diteruskan ke pemanggil: `canon_pph21.ts:187,191,289`.
- `PTKP_ANNUAL`, `BIAYA_JABATAN_CAP_ANNUAL`: konstanta telanjang tanpa tahun & tanpa penanda —
  `canon_pph21.ts:48`, `:245`.

---

## 13. PR-1 — registry & migrasi kalender (2026-08-19)

`canon_regref.ts` lahir dengan tiga aturan: tak ada "yang terdekat", yang menyangkut uang
memblokir, dan **belum-terverifikasi ≠ tak-tercakup** (yang pertama tetap menghitung dengan
penanda — itu keadaan tabel TER hari ini, dan mencabutnya akan menggeser angka tanpa alasan).

Kalender hari libur dipindahkan lebih dulu **justru karena ia satu-satunya yang sudah benar**:
kalau migrasi menggeser perilakunya, kesalahannya ada pada mekanisme baru, bukan pada datanya.
Enam puluh uji cuti yang ditulis terhadap bentuk LAMA tetap hijau tanpa disentuh — itu bukti
nol-delta yang tak bisa saya karang sendiri.

Bentuk lama menyimpan satu daftar datar + satu skalar `confirmedThroughYear` untuk seluruh
kalender. Bentuk itu tak dapat mengucapkan "2026 sudah dicocokkan, 2027 sudah diisi tetapi
belum" — padahal itu persis keadaan tiap Desember. `verified` kini melekat pada TAHUNNYA.

Satu hal yang sengaja TIDAK saya isi: `verifiedBy` & `verifiedAt` set 2026. Bentuk lama tak
pernah merekam siapa yang mencocokkan dan kapan; mengarangnya sekarang akan menjadi persis
jenis provenans palsu yang hendak dicabut arc ini. Keduanya kosong sampai ada yang benar-benar
mencocokkannya.

---

## 14. PR-2 · PR-3 · PR-4 — Tahap A tuntas (2026-08-19)

**PR-2 — BPJS.** Temuan terbesar arc ini, dan ia belum pernah tercatat sebagai
cacat: `kesCap`/`jpCap` menghitung potongan di DUA tempat dengan rumus yang
disalin, salah satunya slip gaji yang dilihat pegawai itu sendiri. Rumus salinan
dicabut dari keduanya — gerbang yang hanya dipasang di salah satu bukan gerbang.
`periodDate` menjadikan "masa" sebuah tanggal, dan masa tak tercakup MENGHENTIKAN
perhitungan. Nol-delta 2026 dipaku sebagai konstanta yang dihitung tangan
(EMP-001 `dJp` 105.474 kena batas vs EMP-032 95.000 tidak), bukan sebagai rumus
yang akan ikut bergeser bila registry-nya bergeser.

**PR-3 — TER · PTKP · biaya jabatan.** Yang muncul saat mendatakan TER lebih tua
daripada "tabelnya usang": **TER baru ada sejak 1 Januari 2024**. Masa sebelumnya
memakai metode lain sama sekali, dan aplikasi menghitungnya tanpa suara karena tak
ada tempat untuk bertanya "masa apa?". Registry MENUNJUK literal yang sudah ada
(diuji dengan identitas objek, bukan kesamaan nilai) supaya arc ini tidak
melahirkan register kedua — pelajaran SC-24a.

**PR-4 — halaman & gerbang.** `regrefCatalog()` adalah daftar yang **ditegakkan**,
dan halaman `regref` merenderinya alih-alih mengetik ulang labelnya, supaya "yang
tampil" dan "yang ditegakkan" tak dapat berbeda. Gerbang SC-9 mencocokkan pada
**tipe** (`RegRefSet<…>[]`), bukan pada nama: gerbang yang mencocokkan nama akan
menyeret `STANDARDS_REGISTRY` yang tak ada hubungannya, lalu dilemahkan orang
berikutnya karena berisik — dan berhenti menjaga apa pun.

Setiap entri katalog wajib menyatakan **akibat** bila kedaluwarsa, bukan namanya;
uji menolak deskripsi yang cuma mengulang label. "Kalender libur 2027 belum diisi"
tak memberi tahu siapa pun apa yang rusak.

**Live-verified** di bundel yang berjalan, tiga tanggal:

| Tanggal | Keadaan |
|---|---|
| 2026-03-01 | tak ada yang berhenti; BPJS & TER bertanda *belum dicocokkan* |
| 2027-01-01 | **BPJS berhenti**; kalender libur tak tercakup tetapi hanya memperingatkan |
| 2023-06-01 | **BPJS & TER berhenti** — TER memang belum ada pada masa itu |

Falsifikasi dijalankan untuk ketiga PR: set 2026 dibuat terbuka (3 uji merah) ·
TER digeser ke 2000 (2 uji merah) · registry tak terdaftar ditambahkan (1 uji merah).

**Yang masih menunggu DATA dari Ari** (Q-1 · Q-4 · Q-5) — mekanismenya kini membuat
ketiganya terlihat setiap hari di halaman `regref`, bukan terlupakan:
Lampiran PMK 168 · cuti bersama 2026 · pencocokan batas upah BPJS 2026.
