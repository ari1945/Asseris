# PRD — Basis DILAPORKAN untuk konsumen hilir (PR-H · PSAK 71, PSAK 16, FS Generator)

**Status:** ⏸️ **MENUNGGU KEPUTUSAN** — evaluasi selesai, implementasi belum dimulai.
**Basis:** `feat/psak46-pr-g1-temp-diff` @ `78afe2b` (PR-G1 #154, di atas master `d7a2913`).
**Pendahulu:** `PRD - PSAK 46 PR-G Movement Beda Temporer (pemetaan jurnal audit ke ember fiskal).md`.
**Gerbang baseline terukur:** `npm run typecheck` 0 · `npm run lint` 0 · **755 test hijau** (60 berkas).

---

## 0. Ringkasan eksekutif (baca ini bila hanya membaca satu bagian)

Tiga hal, berurutan menurut kegentingan:

1. **PR-G1 sendiri baru separuh terpasang.** `reportedBalance(wtb, aje, code)` tidak punya
   fallback ke `AMS.AJE` yang dimiliki `fiscalReconciliation`. Akibatnya pada jalur
   `deferredTax(wtb)` — **jalur yang dipakai 2 dari 3 view hidup** — saldo beda temporer
   jatuh kembali ke kolom `unadj` mentah, sementara PBT-nya tetap basis DILAPORKAN.
   **Satu fungsi, dua basis lagi.** Terverifikasi numerik (§2).
   Konsekuensi langsung: baris rekonsiliasi `ckpn` yang katanya "menyala `warn` 620"
   **sebenarnya `ok`/variance 0 di aplikasi hidup**; `warn` 620 hanya ada di jalur zero-arg
   yang cuma disentuh snapshot. Ini pengulangan persis cacat yang tercatat di
   `asseris-materiality-om-split`.

2. **Cakupan kontaminasi jauh lebih luas dari yang dinamai baris `ckpn` & `ppe`.**
   Kolom `adj` memuat jurnal usulan pada **empat akun**, dan yang paling merusak justru
   tak disebut sama sekali: **dasar matriks ECL (piutang bruto 1-1200) memakai `adj`**,
   sehingga seluruh model ECL — termasuk `gap` yang menjadi *dasar AJE-02* dan
   `auditVariance` yang menyimpulkan "cadangan audited memadai" — dihitung di atas
   piutang yang mengandaikan AJE-03 (usulan) sudah diterima. `auditVariance ≈ 3` yang
   dibaca "dalam toleransi" adalah **artefak beda basis**: pada basis DILAPORKAN nilainya
   **100,4**. Kesimpulan audit, bukan kerapian angka.

3. **Jawaban atas pertanyaan yang diajukan: ya untuk ketiganya — tetapi bukan dengan
   mengganti angka satu per satu.** Tambal per-modul akan memecah neraca FS Generator
   (§5.3) dan meninggalkan empat akun lain tetap terkontaminasi. Yang dibutuhkan adalah
   **satu sakelar basis kanonik** + **label basis di layar**, bukan enam penggantian nilai
   yang berdiri sendiri. Rekomendasi: **Opsi C** (§7).

---

## 1. Yang sudah pasti (fakta terverifikasi, bukan dugaan)

### 1.1 Struktur kolom WTB

`data_part1.ts:87-90` — `adj` bukan kolom tersimpan, melainkan turunan:

```js
ly: r[3], unadj: r[4], aje: r[5], adj: r[4] + r[5]
```

Kolom `aje` adalah **angka seed statis**, bukan turunan dari register AJE. Ia tidak tahu
status. Karena itu `adj` ≡ "seandainya SELURUH usulan diterima", **bukan** "audited".

### 1.2 Akun yang memuat jurnal berstatus `Proposed`

| Akun | `aje` | Terdiri dari | Status usulan |
|---|---:|---|---|
| 1-1200 Piutang Usaha | −1.850 | AJE-03 | **Proposed** (100%) |
| 4-1100 Penjualan | +1.850 | AJE-03 | **Proposed** (100%) |
| 1-2110 Ak. Penyusutan | −1.120 | AJE-05 | **Proposed** (100%) |
| 5-1100 BPP | +3.460 | AJE-01 (2.340, Posted) + AJE-05 (1.120) | **sebagian** |
| 1-1210 CKPN | −620 | AJE-02 | Posted — **bersih** |
| 1-1300 Persediaan | −2.340 | AJE-01 | Posted — bersih |
| 2-1300 Akrual | −980 | AJE-04 | Posted — bersih |
| 5-3100 Beban Umum | +1.600 | AJE-02 + AJE-04 | Posted — bersih |

**Konsekuensi yang penting untuk PSAK 71:** `ckpnAudited` (`adj` 1-1210) **kebetulan sudah
sama dengan basis DILAPORKAN**, karena AJE-02 adalah satu-satunya jurnal yang menyentuh
akun itu dan ia Posted. Kebetulan, bukan jaminan — satu usulan CKPN baru akan
mengontaminasinya tanpa alarm apa pun.

### 1.3 Konsumen kolom `adj` di kanon (hasil sapuan penuh)

| Lokasi | Field | Terkontaminasi usulan? |
|---|---|---|
| `canon_part1.ts:146` | `inventory.cogsAdj` (5-1100) | **YA** — +1.120 (AJE-05) |
| `canon_part1.ts:200` | `inventory.sales` (4-1100) | **YA** — −1.850 (AJE-03) |
| `canon_part1.ts:228,231` | `fixedAssets.grossClose`, `accumAudit` | **YA** — 1.120 (AJE-05) |
| `canon_part1.ts:411` | `revenue.revAdjWTB` (4-1100) | **YA** — "per WTB adjusted → Laba Rugi" |
| `canon_part1.ts:456` | `revenue.recvClose` (1-1200) | **YA** — −1.850 |
| `canon_part2.ts:27` | `psak25.grossAr` (1-1200) | **YA** |
| `canon_part2.ts:247` | `psak71.grossAudited` (1-1200) | **YA** — **dasar seluruh matriks ECL** |
| `canon_part2.ts:251` | `psak71.ckpnAudited` (1-1210) | tidak (kebetulan, §1.2) |
| `fsgen_model.tsx:53` | **SELURUH** akun neraca & L/R | **YA** — AJE-03 & AJE-05 |
| `canon_base.ts:43-55` | `figuresFromWTB` (dbo, rou, sewa, DTA, beban pajak) | tidak |

`psak48`, `psak58`, `assetRegister`, `psak25` tidak membaca `adj` langsung — mereka
mewarisi kontaminasi lewat `fixedAssets()`.

---

## 2. TEMUAN UTAMA — PR-G1 belum terpasang pada jalur yang dipakai view

`fiscalReconciliation` punya fallback singleton; `reportedBalance` **tidak**:

```ts
// canon_base.ts:354  — ADA fallback
const list = aje || ((AMS && (AMS.AJE as unknown as AjeLike[])) || []);

// canon_base.ts:288  — TIDAK ADA fallback
(aje || []).filter(a => String(a.status || '').trim() === 'Posted')
```

Maka pada `deferredTax(wtb)` (argumen `aje` kosong): PBT dilapisi jurnal terposting,
tetapi saldo ember beda temporer **tidak** — ia kembali ke `unadj` mentah.

**Probe terhadap seed (dijalankan, bukan diperkirakan):**

```
ecl  zero-arg = 2600   (wtb) = 1980   (wtb,aje) = 2600
ppe  zero-arg = 143160 (wtb) = 143160 (wtb,aje) = 143160
pbt  zero-arg = 25750  (wtb) = 25750  (wtb,aje) = 25750
```

Peta pemanggil hidup:

| Pemanggil | Argumen | Saldo `ecl` yang tampil |
|---|---|---|
| `view_psak46.tsx:199` | `deferredTax(wtb, aje)` | **2.600** ✔ dilaporkan |
| `view_psak71.tsx:351` | `deferredTax(wtb)` | **1.980** ✘ pra-PR-G1 |
| `view_reconcile.tsx:107` → `reconcile(wtb)` → `deferredTax(wtb)` | — | **1.980** ✘ |

Dan baris rekonsiliasi itu sendiri, diprobe pada kedua jalur:

```
zero-arg : CKPN var=620 status=warn  :: ECL=1980 | PSAK 46=2600
(wtb)    : CKPN var=0   status=ok    :: ECL=1980 | PSAK 46=1980     ← aplikasi hidup
```

**Alarm yang menjadi premis tugas ini padam di aplikasi hidup.** Lebih buruk: string
catatannya tetap berbunyi *"Beda basis yang DISENGAJA: PSAK 46 memakai saldo DILAPORKAN
Rp 1980 jt … Kalkulator ECL menampilkan saldo dibukukan klien Rp 1980 jt"* — sebuah baris
yang menamai perbedaan basis sambil menampilkan dua angka identik.

Baris `ppe` tidak terpengaruh (1-2100/1-2110 tak punya jurnal Posted, sehingga
`unadj` ≡ dilaporkan), sehingga cacat ini **hanya terlihat pada CKPN** — dan itulah
sebabnya ia lolos.

> **Ini prasyarat, bukan bagian opsional.** Memindahkan konsumen hilir ke basis
> DILAPORKAN sementara penyedia basisnya sendiri bocor pada 2 dari 3 jalur akan
> menghasilkan tiga angka, bukan satu.

---

## 3. Dampak terukur bila pindah ke basis DILAPORKAN

Semua angka Rp juta, dihitung dari seed `ENG-2025-014`.

### 3.1 PSAK 71 · Kalkulator ECL

| Besaran | Basis `adj` (kini) | Basis DILAPORKAN | Δ |
|---|---:|---:|---:|
| Piutang bruto (dasar matriks) | 49.472,4 | **51.322,4** | +1.850,0 |
| `eclModel` | 2.603,0 | **2.700,4** | +97,3 |
| `coverage` | 5,262% | 5,262% | 0 |
| `gap` (model − dibukukan) → **dasar AJE-02** | 623,0 | **720,4** | +97,3 |
| `auditVariance` (model − audited) | **3,0** | **100,4** | +97,3 |
| `ckpnBooked` | 1.980 | 1.980 | 0 |
| `ckpnAudited` | 2.600 | 2.600 | 0 |

Yang bergerak bukan saldo, melainkan **kesimpulan**. `auditVariance = 3` saat ini dibaca
sebagai "model auditor menutup ke cadangan audited". Pada basis DILAPORKAN nilainya
**100,4** — di bawah OM (1.485) tetapi **di atas CTT (± 74)**, sehingga masuk wilayah
yang wajib diakumulasi ke SAD, bukan diabaikan. Perhatikan pula: SAD sudah memuat
`M-04` senilai **680** untuk "selisih estimasi CKPN" — angka yang tak berasal dari model
ini sama sekali. Ketiganya (3 / 100,4 / 680) hidup berdampingan tanpa saling melihat.

### 3.2 PSAK 16 dan hilirnya

| Besaran | Basis `adj` (kini) | Basis DILAPORKAN | Δ |
|---|---:|---:|---:|
| `fixedAssets.netClose` | 142.040 | **143.160** | +1.120 |
| `fixedAssets.deprAudited` | 7.440 | **6.320** | −1.120 |
| PSAK 48 · nilai tercatat UPK | 162.098 | **163.218** | +1.120 |
| PSAK 48 · `headroom` | 7.426 (4,6%) | **6.306 (3,9%)** | −1.120 |
| PSAK 48 · `impairLoss` | 0 | **0** | **tidak berbalik** |
| PSAK 58 · `ppeNet` | 142.040 | **143.160** | +1.120 |
| PSAK 25 · estimasi `dep` (`carryCy`, `drives`) | 142.040 / 7.440 | 143.160 / 6.320 | ikut |

**Uji sensitivitas PSAK 48 diperiksa satu per satu — tak ada yang berbalik tanda:**

| Skenario | Terpulihkan | Headroom kini | Headroom dilaporkan | Berbalik? |
|---|---:|---:|---:|:--:|
| WACC +1% | 154.783 | −7.315 | −8.435 | tidak (sudah negatif) |
| WACC −1% | 187.368 | +25.270 | +24.150 | tidak |
| g terminal −0,5% | 166.943 | +4.845 | +3.725 | tidak |
| Arus kas dasar −5% | 161.048 | −1.050 | −2.170 | tidak (sudah negatif) |

**Kesimpulan penurunan nilai tidak berubah.** Yang berubah adalah angka pengungkapan
headroom (¶134) — menyempit 15%. Blast radius PSAK 48 nyata tetapi **tidak mengubah
opini atas pos manapun**.

### 3.3 FS Generator

`fsgen_model.tsx:53` membaca `r.adj` untuk **setiap** kode akun. Ia tidak memanggil
`fixedAssets()` sama sekali — kesamaan angkanya dengan PSAK 16 selama ini kebetulan,
karena keduanya membaca kolom yang sama.

Pindah ke basis DILAPORKAN berarti **AJE-03 (1.850) dan AJE-05 (1.120) keluar dari
laporan keuangan** dan menjadi salah saji tidak dikoreksi.

**Itu justru posisi yang sudah dinyatakan modul SAD.** `view_sad.tsx:96-99` sudah
memakai basis `unadj + Posted` dengan alasan tertulis persis sama. Jadi hari ini:

> **FS Generator mencetak laporan keuangan di mana AJE-03 & AJE-05 sudah dikoreksi,
> sementara modul SAD di sebelahnya mengevaluasi keduanya sebagai salah saji tidak
> dikoreksi terhadap materialitas.** Dua modul, satu perikatan, dua laporan keuangan.

Ini bukan perbaikan kerapian. Ini kontradiksi yang sudah hidup di produk, kelas yang
sama dengan temuan `asseris-aje-module-eval` dan `asseris-wtb-pr3-pr4-sa520-spine`.

Catatan tambahan (di luar lingkup, dicatat agar tidak hilang): tiga dari delapan
tie-out `buildTieOuts` adalah **tautologi** — `dep`, `ar`, dan `aje` membandingkan
sebuah nilai dengan dirinya sendiri (`m.meta.depreciation` vs `m.meta.depreciation`),
sehingga selalu `ok`. Tiga lampu hijau yang tak dapat menjadi merah.

---

## 4. Menjawab pertimbangan yang Anda ajukan

### 4.1 "LK yang diaudit menyajikan saldo setelah jurnal yang DISETUJUI"

**Benar, dan ini menentukan untuk FS Generator.** SA 450 memisahkan tegas: koreksi yang
diterima manajemen masuk ke laporan; yang tidak diterima menjadi salah saji tidak
dikoreksi yang diakumulasi dan dievaluasi. Tidak ada kategori ketiga bernama "usulan
yang sudah dimasukkan ke laporan sambil menunggu keputusan". FS Generator hari ini
menempati kategori yang tidak ada itu.

### 4.2 "Kolom `adj` juga sah sebagai 'apa yang akan terjadi bila seluruh usulan diterima'"

**Juga benar — tetapi itu argumen untuk MENAMBAH, bukan untuk MEMPERTAHANKAN.**

Pertanyaan yang memisahkan keduanya: *apakah pengguna surface ini sedang menimbang
keputusan, atau sedang menerbitkan angka?*

| Surface | Sifat | Basis yang benar |
|---|---|---|
| Modul AJE · tab Dampak | menimbang | `adj` ("bila semua diterima") — **sudah** melakukannya dengan benar (`view_aje.tsx:463`) |
| SAD | menimbang salah saji | DILAPORKAN — **sudah** benar |
| PSAK 16 · roll-forward & kertas kerja | menimbang usulan sendiri | keduanya, berlabel |
| PSAK 71 · kalkulator model | menimbang usulan sendiri | keduanya, berlabel |
| **FS Generator** | **menerbitkan** | **DILAPORKAN — tanpa keraguan** |
| **PSAK 48 / 58 (kesimpulan)** | **menyimpulkan** | **DILAPORKAN** |
| PSAK 46 · beda temporer | menghitung kewajiban pajak | DILAPORKAN — sudah (PR-G1) |

Yang membuat keadaan sekarang berbahaya bukan pilihan basisnya, melainkan bahwa
**pilihan itu tak pernah diambil**. `adj` bukan keputusan metodologi; ia default yang
tersedia. Tak ada satu pun surface yang menyebut basisnya di layar. Auditor yang
membaca "Nilai tercatat neto 142.040" tidak punya cara mengetahui bahwa angka itu
memuat koreksi yang partner belum setujui.

**Karena itu: label basis WAJIB, di seluruh tujuh surface — termasuk yang tidak berubah
angkanya.** Label yang hanya dipasang di tempat yang angkanya berubah justru menyesatkan.

### 4.3 "Blast radius besar"

Terukur di §3. Ringkas: **satu kesimpulan audit diperiksa dan tidak berbalik**
(PSAK 48 `impairLoss` tetap 0, keempat sensitivitas tidak berubah tanda); yang bergerak
adalah angka pengungkapan dan — ini yang penting — **`gap` yang menjadi dasar AJE-02**
serta `auditVariance` yang menyimpulkan kecukupan cadangan.

Blast radius yang **tidak** disebut di brief dan lebih besar: FS Generator membangun
seluruh neraca dari `adj`. Karena `adj = unadj + aje` seragam untuk semua akun dan setiap
AJE berpasangan seimbang, neraca menutup. **Memindahkan PSAK 16 sendirian tanpa
memindahkan FS Generator akan membuat `bsDiff` = 1.120 jt vs toleransi Rp 1 jt →
`balanced: false`.** Neraca tak seimbang di modul yang tugasnya menerbitkan neraca.

Kabar baiknya simetris: **memindahkan SELURUH akun sekaligus tetap seimbang**, karena
`unadj + Posted` juga jumlah dari jurnal-jurnal berpasangan. Tie-out arus kas juga
bertahan secara aljabar (Σ mutasi neraca non-kas = Δkas pada basis konsisten apa pun).
Jadi pilihannya benar-benar **semua atau tidak sama sekali** — bukan preferensi gaya.

---

## 5. Opsi

### Opsi A — Tidak berubah, perbaiki catatan saja
Perbaiki bug §2, biarkan basis apa adanya, perbaiki string catatan.
*Pro:* nol risiko angka.
*Kontra:* FS Generator tetap menerbitkan LK yang bertentangan dengan SAD-nya sendiri;
`gap` dasar AJE-02 tetap dihitung di atas piutang yang mengandaikan usulan diterima.
**Tidak menutup cacat, hanya memberinya kalimat yang lebih baik.**

### Opsi B — Ganti nilai per modul (tambal PSAK 71 + PSAK 16 + FS Generator)
*Kontra fatal:* bila FS Generator ikut, ia harus ikut **seluruh akun** (§4.3); bila
hanya sebagian, neraca pecah. Dan empat akun terkontaminasi lain (`revenue`,
`inventory.cogsAdj`, `psak25.grossAr`, `receivables`) tetap tertinggal — persis pola
"perbaikan SSOT yang hanya menyentuh sebagian konsumen lebih buruk daripada tak
menyentuh" yang tercatat di `asseris-wtb-pr3-pr4-sa520-spine`.

### Opsi C — Basis kanonik + label di layar **(REKOMENDASI)**

Empat langkah, dapat dipecah menjadi empat PR bertumpuk:

**PR-H0 · prasyarat (wajib, berdiri sendiri).** Beri `reportedBalance` fallback
`AMS.AJE` yang sama dengan `fiscalReconciliation`, **atau** — lebih baik — hilangkan
kedua fallback dan wajibkan pemanggil menyerahkan `aje` secara eksplisit, lalu perbaiki
`view_psak71.tsx:351` & `view_reconcile.tsx:107`. Menutup §2. **Tanpa ini, tiga PR
berikutnya membangun di atas fondasi yang bocor.**
*Dampak angka:* baris rekonsiliasi `ckpn` hidup mulai `warn` 620 (sesuai maksud PR-G1);
panel PSAK 46 di modul ECL berubah 1.980 → 2.600.

**PR-H1 · basis sebagai parameter kanon, bukan kolom.** Perluas `reportedBalance`
menjadi pembaca basis bernama:
```ts
type Basis = 'unadj' | 'reported' | 'ifAllProposed';   // 'ifAllProposed' = kolom `adj` lama
wtbOn(wtb, aje, code, basis): number
```
`fixedAssets(wtb, aje?, basis = 'reported')`, `psak71(wtb, aje?, basis = 'reported')`,
`fsgenModel(wtb, aje?, basis = 'reported')`. Default berpindah ke `'reported'`;
`'ifAllProposed'` tetap tersedia untuk surface yang menimbang. Satu mekanisme, bukan
enam penggantian nilai.

**PR-H2 · label basis di layar (tujuh surface).** Chip basis pada page-header setiap
modul yang menampilkan saldo (PSAK 16, 46, 48, 58, 71, FS Generator, Rekonsiliasi
Angka), memakai token warna yang ada. Wajib **juga** pada surface yang angkanya tidak
berubah. Pada FS Generator: sakelar `Dilaporkan ⇄ Bila semua usulan diterima` dengan
`Dilaporkan` sebagai default dan selisihnya dinyatakan, bukan disembunyikan.

**PR-H3 · gerbang falsifikasi.** Uji yang **dapat gagal**, karena §2 menunjukkan snapshot
saja tidak cukup:
- setiap modul memberi angka identik untuk `deferredTax()` / `(wtb)` / `(wtb, aje)`;
- `fsgen.balanced` dan `cf.ties` bertahan pada **ketiga** basis;
- selisih FS Generator antara `reported` dan `ifAllProposed` **sama persis** dengan
  agregat `bsEffect` item SAD yang tertaut AJE Proposed — pengikat silang yang membuat
  kedua modul mustahil menyimpang diam-diam;
- ganti tiga tie-out tautologis `buildTieOuts` (`dep`, `ar`, `aje`) dengan perbandingan
  dua sumber berbeda.

---

## 6. Risiko

| Risiko | Ordo | Mitigasi |
|---|---|---|
| Snapshot `canon_regression.test.ts.snap` bergerak luas (PSAK 16/46/48/58/71 + reconcile) | tinggi | Diperiksa **baris demi baris**, tak ada `-u` buta. Setiap Δ harus cocok dengan tabel §3. Δ yang tak ada di tabel = temuan, bukan pembaruan. |
| PSAK 48 headroom menyempit → pembaca menyangka penurunan nilai muncul | sedang | `impairLoss` diperiksa tetap 0 pada keempat sensitivitas (§3.2); dinyatakan di catatan modul. |
| AJE-03/AJE-05 hilang dari FS → dikira angka "turun" | sedang | Sakelar + label PR-H2; SAD sudah menampung keduanya. |
| `SAD_SEED` `M-02` menandai AJE-05 `corrected` padahal `Proposed` | **sudah ada hari ini** | Validator `reconcileUncorrectedMisstatements` sudah menangkapnya sebagai `stale`. PR-H akan membuatnya **terlihat**, bukan menimbulkannya. Diperiksa saat verifikasi live. |
| Ratchet ESLint `no-explicit-any` — `fsgen_model.tsx` masih penuh `any` | sedang | Jangan tambah `:any` baru; menyentuh berkas itu berisiko meng-un-suppress seluruh berkas (gotcha tercatat). Pertimbangkan mengubah tanda tangan tanpa menyentuh badan fungsi. |

---

## 7. Rekomendasi

**Opsi C**, dikerjakan sebagai empat PR bertumpuk `H0 → H1 → H2 → H3`.

**PR-H0 saya sarankan dikerjakan lebih dulu dan terpisah**, tanpa menunggu keputusan
atas H1–H3: ia perbaikan cacat murni pada PR-G1 yang belum di-merge, tak menuntut
keputusan metodologi apa pun, dan tanpanya premis seluruh diskusi ini (alarm `warn` 620)
tidak benar-benar ada di aplikasi.

Untuk H1: default `'reported'` di kanon, `'ifAllProposed'` tersedia sebagai parameter.
Alasannya bukan preferensi — melainkan bahwa satu-satunya surface yang **menerbitkan**
angka (FS Generator) tidak boleh punya default lain, dan setiap surface yang
**menimbang** sudah punya tempat untuk menyatakan sebaliknya secara eksplisit.

---

## 8. Pertanyaan terbuka (butuh keputusan Ari)

1. **H1 default:** setuju `'reported'` sebagai default kanon? Atau tahan default `adj`
   dan hanya pindahkan FS Generator + PSAK 48/58 (yang menyimpulkan), membiarkan
   kertas kerja PSAK 16/71 pada `adj`?
2. **Dasar matriks ECL (§3.1):** piutang fiktif AJE-03 — apakah eksposur ECL diukur atas
   piutang **sebagaimana akan tersaji di LK** (termasuk yang fiktif, karena AJE-03 belum
   disetujui) atau atas piutang **yang secara substansi nyata** (tidak termasuk)? Keduanya
   punya dasar; yang tak punya dasar adalah keadaan sekarang, di mana tak seorang pun
   memilih. **Ini satu-satunya pertanyaan di PRD ini yang murni metodologi audit, bukan
   rekayasa.**
3. **Cakupan:** apakah empat akun terkontaminasi lain (`revenue`, `inventory.cogsAdj`,
   `psak25.grossAr`, `receivables.recvClose`) masuk PR-H1, atau dipisah ke PR-H4?
   Rekomendasi saya: **masuk H1** — memindahkan sebagian adalah pola kegagalan yang
   sudah dua kali tercatat di arc ini.
4. **Verifikasi live:** perlu Anda membuka panel Browser (utang tinjauan piksel dari
   sesi-sesi sebelumnya masih terbuka). KPI **dan** tabel pada modul yang sama akan
   diperiksa, sesuai gerbang.
