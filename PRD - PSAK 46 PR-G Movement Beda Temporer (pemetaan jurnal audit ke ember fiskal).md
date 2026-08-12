# PRD — PSAK 46 PR-G · Movement Beda Temporer (pemetaan jurnal audit ke ember fiskal)

**Status:** **Implemented** — PR-G1 TERPUTUS & TERIMPLEMENTASI 2026-07-29
**Basis:** master `d9149d0` (setelah PR-F #150 & sapuan `.split` #151).
**Pendahulu:** `PRD - Rekonsiliasi Fiskal PSAK 46 (PBT kedua yang tersisa).md` (#144 → PR-F #150).
**Sifat:** PRD ini sengaja BERHENTI di depan pemetaan akun→ember. Pemetaan itu hukum pajak, bukan rekayasa perangkat lunak; mengarangnya berarti sistem menerbitkan posisi fiskal yang tak pernah diputuskan manusia — kelas cacat yang persis sedang ditutup arc ini.

---

## 1. Masalah

PR-F menurunkan dua dari empat suku identitas rekonsiliasi fiskal dari buku besar:

```
PKP  =  PBT  +  permAdd  −  permLess  +  tempMovement
        ↑ DITURUNKAN         ↑ konstanta   ↑ KONSTANTA BEKU (6.800)
        (WTB unadj + AJE Posted)
```

`FISCAL.tempMovementItems` (`canon_base.ts:252`) adalah empat angka statis berjumlah 6.800 jt yang berasal dari "kertas kerja fiskal" tanpa provenans. Sementara itu **AJE-02 (CKPN Rp 620 jt) dan AJE-04 (akrual bonus Rp 980 jt) berstatus Posted** dan karenanya sudah menurunkan PBT — tanpa menyentuh 6.800 sedikit pun. Satu identitas, dua basis: sisi kiri hidup, sisi kanan beku.

### 1.1 Apa yang sebenarnya rusak — dan apa yang TIDAK

Substitusikan identitas ke dalam beban pajak:

```
taxExpense = currentTax − deferredPL
           = (pbt + permAdd − permLess + temp)×22%  −  temp×22%
           = (pbt + permAdd − permLess)×22%          ← temp LENYAP
```

**Diverifikasi numerik, bukan diduga** (probe jalur kanon zero-arg, `deferredTax()` pada seed): `Math.round((pbt + permAdd − permLess) × RATE) − taxExpense = 0`.

Konsekuensi yang harus dipahami sebelum menilai prioritas:

| Angka | Sensitif terhadap `tempMovement`? |
|---|---|
| Beban pajak penghasilan (P/L) | **TIDAK** |
| ETR & diagnostik `bt-etr` | **TIDAK** |
| Laba bersih, EPS, ekuitas | **TIDAK** |
| **Pajak kini** (dasar SPT / utang pajak) | **YA** — linier 22% |
| **Manfaat pajak tangguhan L/R** | **YA** — linier 22%, berlawanan arah |
| **Saldo awal DTA tersirat** | **YA** (lihat §1.2) |

Jadi ini bukan cacat bottom-line. Ini cacat **pemisahan pajak kini vs tangguhan** — dan justru itulah yang menentukan angka yang dibayar ke DJP dan pos neraca DTA. **Itu pula sebabnya cacat ini selamat dari lima kali evaluasi: laba bersihnya selalu benar.** Salah saji yang tak pernah menggerakkan angka yang dilihat orang adalah salah saji yang tak pernah tertangkap.

Ordo besarannya: bila AJE-02 + AJE-04 (Rp 1.600 jt) ternyata seluruhnya beda temporer, pajak kini bergeser Rp 352 jt — **di atas OM perikatan Rp 3.088 jt? tidak; di atas CTT Rp 154 jt? ya**. Jadi berada di wilayah yang wajib diakumulasi ke SAD, bukan diabaikan sebagai *clearly trivial*.

### 1.2 Temuan baru — sistem TIDAK DAPAT mendeteksi nilai ini salah

`canon_part1.ts:40`:

```js
const opening = closing - deferredPL - oci;   // saldo awal (PY) — penyeimbang
```

Saldo awal DTA adalah **plug**. Terukur pada seed:

| Pos | Nilai (Rp jt) | Sumber |
|---|---|---|
| `closing` (model, pendekatan neraca) | **3.066** | Σ beda temporer × 22% |
| `deferredPL` | 1.496 | 6.800 × 22% (pendekatan L/R) |
| `oci` | 59 | 270 × 22% |
| **`opening` tersirat** | **1.511** | penyeimbang |
| **DTA per buku besar TA-1** (WTB 1-2500 kolom `ly`) | **4.110** | buku besar audited tahun lalu |
| **Selisih yang tak pernah dinyatakan** | **2.599** | — |

Satu-satunya pemeriksaan yang ada, `dtaVariance = closing − dtaReported = −1.914`, menguji ujung **akhir** (model vs buku besar CY). Ujung **awal** tak diuji sama sekali. Akibatnya `tempMovement` hari ini **tidak dapat difalsifikasi**: berapa pun nilainya, model tetap "menutup", karena saldo awal diam-diam menulis ulang sejarah agar cocok.

Model juga **hibrida secara metodologis**: `closing` memakai pendekatan neraca (PSAK 46 ¶ *liability method*), `deferredPL` memakai pendekatan laba-rugi. Selama keduanya tak pernah dipertemukan lewat saldo awal yang nyata, keduanya boleh saling bertentangan tanpa alarm.

### 1.3 Temuan kedua — basis saldo beda temporer juga campur, dan terbalik pada keduanya

`deferredTax().items` (`canon_part1.ts:28-35`), terukur:

| Ember | Nilai diff | Sumber sebenarnya | Basis |
|---|---|---|---|
| `ppe` | 5.500 | `FISCAL.ppeTaxBaseDelta` | konstanta (nilai tercatat yang *ditampilkan* dari WTB `adj`) |
| `eb` | 13.080 | WTB 2-2300 | **`adj`** |
| `ecl` | 1.980 | WTB 1-1210 | **`unadj`** |
| `lse` | 474 | `leasePortfolio()` | model |
| `prv` | 900 | `FISCAL.provisi` | konstanta |
| `tlc` | 3.000 | `FISCAL.taxLoss` | konstanta |

Kolom `adj` WTB memuat **kelima** AJE termasuk yang masih Proposed. Maka:

- nilai tercatat aset tetap yang ditampilkan **memasukkan AJE-05 (Rp 1.120 jt) yang masih USULAN**;
- ember `ecl` **mengecualikan AJE-02 (Rp 620 jt) yang sudah POSTED**.

Terbalik pada keduanya. Ini **bukan** keputusan pajak — ini keputusan basis yang **sudah Anda ambil di PR-F** (basis = figur DILAPORKAN: unadj + Posted). Karena itu bagian ini masuk scope tanpa memerlukan keputusan baru; ia hanya memperluas keputusan lama ke tempat yang terlewat.

### 1.4 Temuan ketiga — satu konstanta dipakai sebagai saldo DAN sebagai movement

`FISCAL.provisi = 900` muncul dua kali: sebagai **saldo** beda temporer (`mk('prv', f.provisi)`) dan sebagai **movement** tahun berjalan (`tempMovementItems` t3 = 900). Keduanya hanya bisa benar bersamaan bila saldo awal provisi nol. Tak ada apa pun di sistem yang menyatakan itu.

Uji tie yang saya jalankan atas keempat baris movement:

| Baris | Nilai | Tie ke buku besar? |
|---|---|---|
| t1 Imbalan kerja (PSAK 24) | 1.860 | **✅ persis** = WTB 2-2300 `unadj` 13.080 − `ly` 11.220 → **sudah dapat diturunkan hari ini** |
| t2 CKPN (PSAK 71) | 2.400 | ❌ tak tie ke apa pun: CKPN `ly` 2.109 → `unadj` 1.980 (−129) → `adj` 2.600 (+491) |
| t3 Provisi | 900 | ⚠️ = konstanta saldo `FISCAL.provisi` (lihat atas) |
| t4 Selisih penyusutan | 1.640 | ❌ tak tie ke pergerakan akumulasi penyusutan mana pun |

Artinya 6.800 bukan satu angka usang — ia **campuran**: satu baris sudah derivable, satu duplikat saldo, dua tak berdasar. Menambahkan efek AJE di atasnya tanpa membereskan hal ini hanya menumpuk lapisan baru di atas fondasi yang belum diperiksa.

### 1.5 Yang menjadi keputusan Anda

Bukan aritmetikanya. Yang tak boleh saya karang:

> **Jurnal audit mana yang menimbulkan atau mengubah beda TEMPORER, masuk ember yang mana, dan sebesar berapa?**

Contoh yang menunjukkan ini benar-benar pertanyaan hukum pajak, bukan pertanyaan koding:

- **AJE-02 (CKPN 620 jt).** Bila CKPN dikoreksi fiskal (Pasal 9(1)(c) UU PPh — pembentukan cadangan umumnya tak boleh dikurangkan, dengan pengecualian sektor tertentu), maka beban komersial naik 620 dan movement beda temporer **juga** naik 620 → PKP tak bergerak, hanya split kini/tangguhan. Bila entitas termasuk yang dikecualikan, movement **tidak** bergerak dan PKP turun 620.
- **AJE-04 (akrual bonus 980 jt).** Indonesia menganut akrual untuk sebagian besar biaya, sehingga bonus terutang umumnya **deductible saat diakrualkan** → tak ada beda temporer sama sekali. Tetapi bila kebijakan kertas kerja firma menautkan deductibility pada pemotongan PPh 21 (dibayar/dipotong), ia **menjadi** beda temporer. Dua jawaban, keduanya dapat dipertahankan, dan hanya Anda yang boleh memilih.
- **AJE-01 (cut-off persediaan 2.340 jt).** Bila koreksi cut-off berlaku sama untuk komersial dan fiskal → nol beda. Bila SPT sudah dilaporkan atas angka lama → ini masalah pembetulan SPT, bukan beda temporer.

---

## 2. Tujuan

1. Menjadikan `tempMovement` **turunan yang dapat dipertanggungjawabkan** — atau, bila tetap input, **input yang dapat difalsifikasi dan dinyatakan basisnya**.
2. Menutup ketidaksinkronan basis di dalam satu modul PSAK 46 (§1.3), meneruskan keputusan basis PR-F.
3. Membuat saldo awal DTA berhenti menjadi plug, sehingga kesalahan pada movement **menyalakan alarm alih-alih diserap diam-diam**.
4. Merekam keputusan fiskal per-jurnal sebagai data ber-atribusi (siapa memutuskan, dasar apa) — bukan sebagai aturan tersembunyi di dalam kode.

## 3. Kriteria sukses (terukur, diverifikasi LIVE bukan hanya oleh uji)

| # | Kriteria | Cara membuktikan |
|---|---|---|
| S-1 | Memposting/membatalkan sebuah AJE yang diklasifikasikan temporer **menggerakkan** `tempMovement`, pajak kini, dan manfaat pajak tangguhan secara koheren dalam satu render | Ubah status AJE lewat Antrean Persetujuan → baca KPI **dan** baris tabel **dan** teks footer PSAK 46; ketiganya satu angka |
| S-2 | Beban pajak & ETR **tidak bergeser** akibat S-1 (invarians aljabar §1.1 dipertahankan) | Uji unit invarians + baca panel ETR live: jumlah komponen tetap foot |
| S-3 | Gerbang falsifikasi **menyala lebih dulu, lalu padam** — pola wajib arc ini | Sebelum perbaikan: banner "saldo awal DTA model 1.511 vs buku besar TA-1 4.110" harus TAMPIL. Setelah keputusan §11 diterapkan: selisihnya dinyatakan, dijelaskan, atau padam |
| S-4 | Tak ada satu pun beda temporer yang basisnya campur | ppe/ecl/eb semuanya basis DILAPORKAN; AJE Proposed tak lagi menyusup ke nilai tercatat |
| S-5 | Setiap baris movement punya provenans yang dapat dibaca auditor | Tiap item membawa `source`: `'ledger'` (turunan WTB) · `'aje'` (dari jurnal X) · `'wp'` (kertas kerja fiskal, dengan referensi WP) |
| S-6 | Nol regresi | typecheck 0 · lint 0 · seluruh test hijau · snapshot kanon diperiksa baris demi baris |

## 4. Scope

- `canon_base.ts` — `FISCAL.tempMovementItems`, `fiscalReconciliation()`.
- `canon_part1.ts` — `deferredTax()`: basis saldo, saldo awal, provenans item.
- `view_psak46.tsx` — penyajian provenans + banner falsifikasi.
- `data_part1.ts` / model AJE — atribut fiskal per jurnal (bila Opsi 2 dipilih).
- `view_execution.tsx` (AJEForm) — penangkapan atribut fiskal (bila Opsi 2 dipilih); preseden penangkapan field ada di PR-E.
- Uji: perluasan `canon_fiscal.test.ts`.

## 5. Non-scope

- Menyelaraskan WTB 5-5100 (beban pajak dibukukan 11.240) ke model. Tetap di luar, sama seperti PR-F: WTB koheren internal; selisihnya justru temuan audit yang sekarang dilaporkan diagnostik `bt-etr`.
- Beda permanen (`permAdd`/`permLess`) — konstanta kertas kerja, tak tersentuh AJE mana pun dalam seed.
- Rugi fiskal (`taxLoss`), pengukuran kembali OCI — di luar.
- Perhitungan angsuran PPh 25, PPh final, pajak tangguhan entitas anak / konsolidasian. Populasi tetap **induk standalone** (keputusan PR-F, tak dibuka ulang).

## 6. Kendala

- **Kontrak zero-arg kanon**: setiap fungsi harus dapat dipanggil tanpa argumen (`canon_regression`). Atribut fiskal per-AJE karenanya wajib punya default yang aman.
- **Snapshot kanon** akan bergeser pada baris `reconcile`, `dt`, dan engine — wajib diperiksa satu per satu, bukan `-u` buta.
- **Ratchet ESLint**: satu `any` baru meng-un-suppress seluruh berkas. Tipe struktural, bukan `React.ChangeEvent`.
- **State demo saat ini**: AJE-03 sudah Posted di DB (PBT dilaporkan 23.900). Angka di PRD ini dihitung pada jalur kanon zero-arg (seed murni, PBT 25.750) agar dapat direproduksi; verifikasi live akan menunjukkan angka state demo.

## 7. Opsi mekanisme

### Opsi 0 — Nyatakan kebasiannya, jangan hitung
Tambahkan banner: "Movement beda temporer Rp 6.800 jt berasal dari kertas kerja fiskal pra-audit; N jurnal terposting senilai Rp X belum tercermin." Tidak ada perubahan angka.

- ➕ Sangat murah (± 30 baris). Nol risiko angka. Menghapus sifat *senyap* dari cacat — dan salah saji yang mengumumkan dirinya jauh kurang berbahaya daripada yang tidak.
- ➖ Tidak menyelesaikan apa pun; auditor tetap harus menghitung di luar sistem. Utang tetap terbuka.
- Cocok bila: keputusan §11 belum matang dan Anda ingin sesuatu yang aman lebih dulu.

### Opsi 1 — Pemetaan akun → ember di kanon
Tabel `TEMP_DIFF_ACCOUNTS`: kode akun WTB → ember beda temporer (`1-1210` → `ecl`, `2-2300` → `eb`, `1-2110` → `ppe`, …). `tempMovement` = 6.800 + Σ baris AJE Posted yang menyentuh akun terpetakan.

- ➕ Deterministik, otomatis berlaku untuk jurnal buatan pengguna, sejalan dengan pola kanon yang sudah ada (`ajeEffect` memang menyaring lewat prefiks kode).
- ➖ **Akun bukan ember.** Satu akun dapat memuat pergerakan yang deductible dan yang tidak (mis. `2-1300 Beban Akrual` memuat bonus, jasa, dan denda sekaligus). Pemetaan tingkat akun memaksa satu jawaban untuk transaksi yang jawabannya berbeda — dan salahnya tidak terlihat, karena hasilnya tetap berupa angka yang wajar.
- ➖ Aturan pajak tersembunyi di dalam kode, tanpa nama penanggung jawab.

### Opsi 2 — Atribut fiskal per-jurnal (**REKOMENDASI**)
Setiap AJE membawa klasifikasi fiskal eksplisit:

```ts
taxEffect: { kind: 'none' | 'permanent' | 'temporary', bucket?: TempBucket,
             amount?: number, basis: string, by: string }
```

`fiscalReconciliation()` membaca atribut ini dari jurnal berstatus Posted. `basis` = dasar hukum/kebijakan yang dikutip; `by` = auditor yang menetapkan.

- ➕ **Menempatkan pertimbangan pajak di tempat pertimbangan itu benar-benar dibuat** — pada jurnalnya, oleh orang yang membukukannya, dengan dasar tertulis dan nama yang menempel. Itu yang dituntut SA 230 dari sebuah judgement.
- ➕ Menyelesaikan kasus yang Opsi 1 tak bisa: dua jurnal ke akun yang sama boleh berbeda perlakuan fiskal.
- ➕ Dapat direview: klasifikasi masuk register AJE, ikut mengalir ke rantai persetujuan yang sudah dibangun PR-B.
- ➕ Preseden penangkapan field di AJEForm sudah ada (PR-E menangkap `kind`/`mis`/`assertions`/`preparer`).
- ➖ Butuh keputusan §11 untuk kelima jurnal seed (justru itu yang diminta PRD ini).
- ➖ Jurnal lama tanpa atribut jatuh ke `kind:'none'` → harus ditandai "belum diklasifikasi" agar diamnya tidak dibaca sebagai "tak ada beda".

### Opsi 3 — Metode neraca penuh: movement jadi turunan, `tempMovementItems` DIHAPUS
Beda temporer dihitung sebagai saldo (nilai tercatat vs dasar pajak) pada awal dan akhir tahun; movement = selisihnya. `deferredPL = closing − opening − oci`, dengan `opening` dari WTB kolom `ly`.

- ➕ **Metodologis paling benar** — inilah yang PSAK 46 sesungguhnya perintahkan (*liability method*), dan persis pola yang PR-F terapkan pada PKP: berhenti menyimpan hasil, simpan dasarnya.
- ➕ Menghapus seluruh kelas cacat ini: tak ada lagi angka movement yang bisa basi, karena tak ada lagi angka movement.
- ➕ Membuat model falsifikabel di **kedua** ujung sekaligus.
- ➖ Menuntut **dasar pajak per ember pada TA-1** — data yang hari ini tidak ada di mana pun (WTB hanya memberi DTA neto `ly` 4.110, bukan rinciannya). Tanpa itu, opening tetap sebagian karangan, hanya berpindah tempat.
- ➖ Perubahan terbesar; akan menggeser saldo pajak tangguhan yang ditampilkan.

### Rekomendasi

**Opsi 2 sebagai mekanisme penetapan + gerbang falsifikasi dari Opsi 3, dipecah dua PR:**

- **PR-G1** (setelah §11 diisi): atribut `taxEffect` per-jurnal · basis saldo diseragamkan ke figur DILAPORKAN (§1.3) · provenans per baris movement (`ledger`/`aje`/`wp`) · **banner saldo awal**: model 1.511 vs buku besar TA-1 4.110 → alarm menyala.
- **PR-G2** (opsional, kemudian): metode neraca penuh setelah dasar pajak TA-1 per ember tersedia — mengubah `opening` dari plug menjadi angka nyata dan menghapus `tempMovementItems`.

Alasan memilih ini di atas Opsi 3 langsung: Opsi 3 memindahkan karangan dari "movement" ke "dasar pajak TA-1" tanpa data baru. Opsi 2 memaksa setiap pertimbangan diucapkan oleh seseorang, dan gerbang falsifikasi memastikan yang belum diucapkan tetap terlihat. Alasan memilih ini di atas Opsi 1: akun bukan ember, dan aturan pajak tanpa nama penanggung jawab adalah persis yang membuat 6.800 bisa bertahan selama ini.

Jika Anda menolak seluruhnya, **Opsi 0 tetap saya sarankan sebagai lantai** — status quo yang senyap adalah satu-satunya hasil yang tidak dapat dipertahankan.

## 8. Risiko

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Klasifikasi fiskal salah → SPT salah | Tinggi (eksternal) | Klasifikasi wajib mengutip `basis`; masuk rantai persetujuan; jurnal tanpa klasifikasi ditandai, bukan didiamkan |
| Banner saldo awal menyalakan alarm yang tak ada jawabannya → dianggap *noise* lalu diabaikan | Sedang | Banner menyatakan **selisihnya** dan menyediakan tempat penjelasan, bukan sekadar berteriak |
| Pergeseran angka demo (pajak kini, DTA) membingungkan | Rendah | Beban pajak & ETR tidak bergeser (S-2) — permukaan yang paling banyak dilihat tetap stabil |
| Snapshot kanon bergeser luas | Rendah | Periksa `-`/`+` satu per satu; preseden PR-F: 14 baris, semua dijelaskan |
| Jurnal lama tanpa `taxEffect` diam-diam dianggap `none` | Sedang | Status eksplisit "belum diklasifikasi" + hitungannya ditampilkan di modul |

## 9. Rencana implementasi (PR-G1, setelah §11 & "Proceed.")

1. Tipe `TempBucket` + `taxEffect` di `canon_types.ts`; default aman (kontrak zero-arg).
2. `FISCAL.tempMovementItems` → tiap item membawa `source` & `ref`; baris t1 diturunkan dari WTB 2-2300 (`unadj − ly`) karena sudah terbukti tie persis; t3 diperiksa ulang terhadap duplikasi saldo/movement.
3. `fiscalReconciliation()` menambahkan Σ `taxEffect` jurnal Posted; mengembalikan rincian per ember + daftar jurnal belum terklasifikasi.
4. `deferredTax()`: basis saldo → figur DILAPORKAN untuk `ecl`, `eb`, dan nilai tercatat `ppe`; `opening` dibandingkan ke WTB `ly` dan selisihnya diekspos (belum diubah menjadi turunan — itu PR-G2).
5. `view_psak46.tsx`: kolom provenans, banner saldo awal, banner jurnal belum terklasifikasi.
6. AJEForm: penangkapan `taxEffect` (dropdown ember + medan dasar), pola tipe struktural.
7. Uji: invarians beban pajak (S-2) · tie t1 ke WTB · movement bergerak saat status AJE berubah · zero-arg tetap utuh · kasus "belum terklasifikasi".
8. Verifikasi live: KPI **dan** tabel **dan** footer pada modul yang sama; alarm S-3 menyala lalu ditangani.

## 10. Pertanyaan terbuka (di luar tabel §11)

- **Q1 — Basis saldo beda temporer.** Konfirmasi bahwa keputusan basis PR-F (figur DILAPORKAN = unadj + Posted) diperluas ke saldo `ecl`/`eb`/nilai tercatat `ppe`. *Rekomendasi saya: ya* — ini konsistensi, bukan metodologi baru; menolaknya berarti modul mempertahankan dua basis dengan sengaja.
- **Q2 — Tanggal pisah batas kertas kerja fiskal 6.800.** Apakah kertas kerja itu disusun **sebelum** jurnal audit (→ efek AJE ditambahkan di atasnya) atau **sesudah** (→ menambahkan akan menghitung ganda)? Tidak ada apa pun di kode atau data yang menjawab ini, dan jawabannya membalik arah seluruh perhitungan. **Ini pertanyaan paling menentukan di PRD ini.**
- **Q3 — Status SPT.** Apakah SPT Badan TA berjalan sudah dilaporkan? Bila ya, sebagian jurnal audit menjadi persoalan **pembetulan SPT** (Pasal 8 UU KUP), bukan rekonsiliasi tahun berjalan — dan modul semestinya mengatakannya.
- **Q4 — Provisi 900.** Konfirmasi apakah saldo awal provisi memang nol (satu-satunya kondisi di mana saldo = movement, §1.4), atau salah satu dari keduanya keliru.

## 11. ✅ TABEL KEPUTUSAN — TERISI

| Jurnal | Nilai (jt) | Status | Jurnal (Dr / Cr) | **Keputusan** | **Dasar** |
|---|---|---|---|---|---|
| **AJE-01** Cut-off penjualan | 2.340 | Posted | Dr 5-1100 BPP / Cr 1-1300 Persediaan | **nol beda** | Koreksi pisah batas berlaku sama untuk kedua basis; penilaian persediaan fiskal Ps. 10(6) UU PPh sejalan dengan komersial, penghasilan diakui atas dasar akrual Ps. 28(5) UU KUP |
| **AJE-02** Tambahan CKPN PSAK 71 | 620 | Posted | Dr 5-3100 B. Umum / Cr 1-1210 CKPN | **beda temporer → `ecl`** | **Ps. 9(1)(c) UU PPh** — pembentukan cadangan tidak boleh dikurangkan. Pengecualian pasal itu terbatas pada bank, lembaga pembiayaan, asuransi, penjaminan, pertambangan, kehutanan & pengolahan limbah; PT Sentosa Makmur adalah **manufaktur**, tidak termasuk. Deductible saat dihapuskan (Ps. 6(1)(h)) |
| **AJE-03** Pembalikan piutang fiktif | 1.850 | Proposed (seed) | Dr 4-1100 Penjualan / Cr 1-1200 Piutang | **nol beda** + catatan | Ps. 4(1) UU PPh — objek pajak adalah tambahan kemampuan ekonomis yang benar-benar diterima; penghasilan fiktif bukan objek. Bila SPT sudah dilaporkan atas angka pra-audit → **pembetulan SPT Ps. 8 UU KUP**, bukan penyesuaian tahun berjalan |
| **AJE-04** Akrual bonus manajemen | 980 | Posted | Dr 5-3100 B. Umum / Cr 2-1300 Akrual | **nol beda, BERSYARAT** | Ps. 6(1)(a) UU PPh + akrual Ps. 28(5) UU KUP — bonus yang sudah menjadi kewajiban pasti deductible pada tahun diakrualkan. **Syarat yang membalikkannya dicatat di data:** bila PPh 21 belum dipotong & dilaporkan, menjadi beda temporer sampai dibayar |
| **AJE-05** Koreksi penyusutan mesin | 1.120 | Proposed | Dr 5-1100 BPP / Cr 1-2110 Ak. Penyusutan | **beda temporer → `ppe`** | **Ps. 11 UU PPh** — penyusutan fiskal mengikuti kelompok & tarif undang-undang, tidak mengikuti revisi masa manfaat komersial (10→8 thn, WP E-4). Masih usulan → belum terhitung |

**Mekanisme:** ✅ **Opsi 2 + gerbang falsifikasi Opsi 3.**

**Q1 (basis saldo):** ✅ ya — diperluas ke `ecl` dan nilai tercatat `ppe`. Dan itu bukan sekadar kerapian: koreksi CKPN 620 menaikkan movement **dan** saldo penutup dalam jumlah setara (136 jt), sehingga saldo awal tidak bergeser. Memperbaiki salah satunya saja justru menggeser saldo awal 136 jt secara senyap.

**Q2 (tanggal pisah batas kertas kerja 6.800):** ✅ **PRA-AUDIT.** Rekonsiliasi fiskal disusun klien di atas bukunya sendiri sebelum audit — itulah dasar SPT-nya. Diperkuat bukti: tak satu pun dari empat barisnya tie ke kolom `adj` WTB, sementara t1 tie **persis** ke mutasi `unadj − ly` akun 2-2300. Efek jurnal audit karena itu **dilapiskan**.

**Q3 (status SPT):** tidak diketahui dari data. Ditangani sebagai **catatan pada AJE-03**, bukan asumsi — modul menyatakan konsekuensinya alih-alih memilih diam.

**Q4 (provisi 900):** belum diselesaikan. Ditandai `source: 'wp'` dengan referensi yang menyebut anomalinya (saldo = movement ⇒ menyiratkan saldo awal nol). Dinyatakan, bukan diperbaiki diam-diam.

## 12. Hasil terukur (PR-G1)

| Angka | Sebelum | Sesudah |
|---|---|---|
| Movement beda temporer | 6.800 | **7.420** (6.800 KK klien + 620 jurnal audit) |
| PKP | 30.750 | **31.370** |
| Pajak kini | 6.765 | **6.901** |
| Manfaat pajak tangguhan | 1.496 | **1.632** |
| Saldo penutup DTA | 3.066 | **3.202** |
| **Beban pajak** | 5.269 | **5.269** — tak bergerak (invarians §1.1) |
| **ETR** | 20,46% | **20,46%** — tak bergerak |
| **Saldo awal tersirat** | 1.511 | **1.511** — tak bergerak (kedua sisi identitas bergerak bersama) |

**Gerbang falsifikasi MENYALA dan tetap menyala:** saldo awal model 1.511 jt vs DTA buku besar TA-1 **4.110 jt** → selisih **2.599 jt**, nyata dan belum terjelaskan. S-3 menuntut alarm menyala lebih dulu; ia tidak dipaksa padam karena selisihnya benar-benar ada — itu temuan audit atas saldo DTA klien, bukan cacat model.

**Efek samping yang dinyatakan, bukan disamarkan:** dua baris rekonsiliasi lintas-modul berubah `ok` → `warn` (CKPN 620 · aset tetap 1.120) karena PSAK 46 kini basis DILAPORKAN sementara Kalkulator ECL & PSAK 16 masih membaca kolom `adj` yang memuat usulan. Sebabnya dinamai di catatan tiap baris. Perluasan basis ke kedua modul itu = tindak lanjut terpisah.

---

*PR-G2 (metode neraca penuh) tetap opsional dan menunggu dasar pajak TA-1 per ember.*
