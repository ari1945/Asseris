# PRD — Basis DILAPORKAN untuk konsumen hilir (PR-H · PSAK 71, PSAK 16, FS Generator)

**Status:** ✅ **TERIMPLEMENTASI** — 2026-07-29, Opsi C dikerjakan penuh (H0 · H1 · H2 · H3).
Ari mendelegasikan ketiga keputusan metodologi ("Proceed" tanpa memilih); §8 diisi oleh saya
dengan alasan tertulis per keputusan, sehingga masing-masing dapat dibatalkan sendiri-sendiri —
mengikuti pola PR-G.
**Basis:** `feat/psak46-pr-g1-temp-diff` @ `78afe2b` (PR-G1 #154, di atas master `d7a2913`).
**Pendahulu:** `PRD - PSAK 46 PR-G Movement Beda Temporer (pemetaan jurnal audit ke ember fiskal).md`.
**Gerbang baseline terukur:** `npm run typecheck` 0 · `npm run lint` 0 · **755 test hijau** (60 berkas).
**Gerbang akhir:** typecheck 0 · lint 0 · **795 test hijau** (62 berkas) · ratchet ESLint MENGETAT
(fsgen_model 33→30, view_psak16 39→37).

> ### ⚠️ KOREKSI TERHADAP PRD INI (§4.3) — ditemukan saat mengerjakan, bukan saat menilai
>
> §4.3 menyatakan: *"memindahkan SELURUH akun sekaligus tetap seimbang, karena `unadj +
> Posted` juga jumlah dari jurnal-jurnal berpasangan."* **Itu KELIRU.** Benar untuk neraca
> saldo; **salah** untuk penyajian FS Generator.
>
> Sebabnya: WTB mempertahankan akun 4-/5- **terbuka**, sedangkan `3-2100 Saldo Laba` adalah
> saldo **penutup** yang sudah memuat laba basis `ifAllProposed`. Jurnal audit menyentuh satu
> kaki laba-rugi dan satu kaki neraca, tetapi kaki laba-ruginya tak pernah ditutup ke ekuitas
> di kolom WTB mana pun. Terukur: `bsDiff` = 6.910 / **2.970** / 0 untuk
> `unadj` / `reported` / `ifAllProposed`.
>
> Yang menangkapnya adalah uji `cashTies`, **bukan penalaran** — penalarannya terdengar
> meyakinkan dan salah. Diperbaiki dengan penutupan laba ke saldo laba (`reShift`) yang
> menyatakan ulang saldo laba ke basis tersaji tanpa mendaftar status jurnal apa pun.
> Bukti bahwa itu BENAR dan bukan sekadar "membuat angka menutup": plug OCI kini **konstan**
> lintas-basis (sebelumnya −356 / 3.584 / 6.554, yakni sedang menyerap ketidakseimbangan
> basis alih-alih melaporkan OCI).
>
> ### ℹ️ TABRAKAN NAMA — DIPUTUSKAN: TETAP "PR-H"
>
> master sudah memuat **PR-H1 (#153, groupaudit CP-01)** dan **PR-H2 (#152, materialitas
> per-field)** dari arc SA 600 — tak berhubungan dengan seri ini. `git log --grep "PR-H1"`
> karenanya memberi dua hasil berbeda.
>
> **Tidak di-rename.** Label "PR-H" tertanam sebagai penanda provenans di **63 komentar
> pada 28 berkas**. Rename penuh berarti menyentuh ulang seluruh 28 berkas beserta
> verifikasinya — churn dengan risiko regresi nyata demi kerapian dokumentasi; rename
> separuh (pesan commit saja, komentar tetap "PR-H") justru LEBIH buruk daripada keduanya.
>
> Disambiguasi ditempuh lewat dokumentasi, bukan penulisan ulang sejarah: nama cabang
> (`feat/psak46-pr-h*`), scope commit (`feat(canon)`/`feat(ui)`/`fix(fsgen)` vs
> `fix(groupaudit)`/`fix(materiality)`), catatan di setiap badan PR, dan memory.

> Temuan kedua yang juga hanya muncul saat dikerjakan: `forensic_canon.dmod` membaca `r.adj`
> lewat **akses-properti**, sehingga lolos dari sapuan `wtbVal(…, 'adj')` di §1.3. Jembatan
> arus kas forensiknya lalu membandingkan dua basis dan `cfoTies` — jaminan yang menjadi
> alasan modul itu ada — menjadi false.

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

## 7b. Hasil — apa yang benar-benar dikerjakan

| PR | Cabang | Isi |
|---|---|---|
| **H0** | `feat/psak46-pr-h0-basis-symmetry` | `reportedBalance` diberi fallback `AMS.AJE`; gerbang kesetaraan tiga jalur. Snapshot **tidak bergerak** — bukti tambahan jalur rusak itu tak pernah disentuh oracle. |
| **H1** | `feat/psak46-pr-h1-basis-dilaporkan` | `WtbBasis` + `wtbOn()`; sepuluh konsumen pindah; penutupan laba ke saldo laba; `forensic_canon` ikut basis; view menerima register AJE **hidup**; baris rekonsiliasi `ckpn`/`ppe` jadi variance 0. |
| **H2** | `feat/psak46-pr-h2-label-basis` | Chip *Basis: DILAPORKAN* di `SubBar` (15 modul, satu tempat); sakelar `Dilaporkan ⇄ Bila semua usulan diterima` di FS Generator + selisih laba dinyatakan. |
| **H3** | `feat/psak46-pr-h3-gerbang-integritas` | Tiga tie-out tautologis diganti perbandingan dua-sumber; uji yang **merusak model lalu menuntut tie-out menyala**. |

**Rantai bertumpuk:** `H0 ← H1 ← H2 ← H3`. Squash-merge tidak me-retarget PR bertumpuk —
ikuti resep 6 langkah di memori `asseris-wtb-eval-pr1-pr2`.

### Verifikasi

Seluruh angka §3 **cocok persis**, diperiksa dua kali: di vitest, dan di **bundel browser**
(Vite, `http://localhost:5182`) dengan mengimpor `canon_part1/2/3` + `fsgen_model` langsung —
netClose 143.160 · eclModel 2.700,4 · auditVariance 100,4 · PSAK 48 headroom 6.306 dengan
`impairLoss` tetap 0 · FS Generator seimbang & arus kas tie · kedua baris rekonsiliasi
variance 0 status ok.

Snapshot diperiksa **baris demi baris** (434 pasangan, tanpa `-u` buta): seluruh kunci yang
berubah berada dalam famili PPE / ECL / persediaan / pendapatan / PSAK 48 / 58 / 66 / 25.
Suku identitas PSAK 46 (`pbt`/`pkp`/`currentTax`/`taxExpense`/DTA) **nihil pergerakan** —
sesuai harapan, sudah basis dilaporkan sejak PR-G1. Dua kunci yang semula tak terduga
ditelusuri sampai tuntas: `psak58.accumTot` 5.824,035 × (57.180/58.300) = 5.712,149 persis,
dan `psak66.ppeShare` adalah bagian aset ber-tag atas penurunan akumulasi 1.120 yang sama.

### ✅ VERIFIKASI LIVE — TUNTAS (Ari login, panel Browser terbuka)

Dijalankan pada `localhost:5182` sebagai **Rekan Pemimpin**, KPI **dan** tabel pada modul
yang sama, sesuai gerbang:

| Modul | Hasil |
|---|---|
| **PSAK 16** | KPI 143,2 M & 6,3 M cocok tabel roll-forward (143.160 / 6.320); nilai lama 142.040 / 7.440 / 58.300 **nol kemunculan**; tie-out **7/7** |
| **PSAK 71** | Piutang bruto **51.322**, ECL model **2.700**, kurang saji **+720**; nilai lama 49.472 / 2.603 / 623 **nol kemunculan** |
| **FS Generator** | Dilaporkan **319,5 M** ⇄ Bila semua usulan diterima **316,6 M**; **8/8 tie-out & neraca seimbang pada KEDUA basis**; label amber "Laba −Rp 3,0 M vs dilaporkan" muncul & hilang dengan benar; pilihan bertahan setelah reload |
| **Alur Data** | Baris `ckpn` **selisih Rp 0 · COCOK** (2.600 × 3) dengan "Selisih audit thd model ECL Rp 100 jt" sebagai baris tersendiri; baris `ppe` **selisih Rp 0 · COCOK** (143.160 × 3) |
| **Header** | Baris aksi tetap SATU baris (28px) pada 1440px — tak ada pembungkusan |

**Tiga cacat ditemukan HANYA oleh tinjauan live**, semuanya sudah diperbaiki:

1. **PSAK 16 tie-out `t7` menuntut yang terbalik** — memerah (6/7) tepat ketika sistem
   berperilaku benar, sambil catatannya menyatakan sebaliknya. Vitest tak pernah merender
   view ini.
2. **Chip basis membantah sakelar FS Generator** — "Basis: DILAPORKAN" tampil bersama
   sakelar yang menunjuk "Bila semua usulan diterima". Cacat yang diperkenalkan PR-H2
   sendiri, kelas yang sama dengan yang ditutup arc ini.
3. **TDZ + rules-of-hooks** pada perbaikan pertama — **lolos typecheck**, hanya muncul
   sebagai layar crash.

Dicatat, bukan diperbaiki: uji kewajaran penyusutan SA 520 bergerak −1.403 jt (−15,9%) →
**−2.523 jt (−28,5%)**. Itu pemulihan alarm, bukan regresi — AJE-05 diusulkan PERSIS karena
penyusutan kurang saji, dan basis `adj` selama ini membungkam analitik yang menjadi alasan
jurnal itu ada. Pola sama dengan `bt-etr` di PR-F.

**Catatan alat (bukan produk):** klik `computer` berbasis koordinat tidak menggerakkan `Seg`
mana pun — termasuk "Ribuan" yang sudah ada sebelum PR ini. `element.click()` bekerja normal.
Dikonfirmasi lewat kontrol pada kontrol lama, jadi bukan cacat aplikasi.

---

## 8. Keputusan metodologi — DIISI (didelegasikan Ari)

**1. Default kanon = `'reported'`.** LK yang diaudit menyajikan koreksi yang DITERIMA;
yang tidak diterima menjadi salah saji tidak dikoreksi (SA 450), bukan angka laporan. Tak
ada kategori ketiga "usulan yang sudah dimasukkan ke laporan sambil menunggu keputusan" —
yang justru ditempati FS Generator selama ini, bertentangan dengan modul SAD di sebelahnya.
*Membatalkan:* ubah nilai default pada tanda tangan `wtbOn`-consumer; `ifAllProposed` sudah
tersedia sebagai basis kelas satu.

**2. Eksposur ECL = piutang basis DILAPORKAN** (termasuk yang fiktif, karena AJE-03 belum
disetujui). PSAK 71 ¶5.5.1 mengukur penyisihan atas aset keuangan yang **diakui**; selama
AJE-03 belum diposting, piutang itu diakui sebesar 51.322 jt dan wajib bercadangan. Bahwa
sebagian fiktif adalah salah saji **keterjadian** yang terpisah — sudah dicatat sebagai
`M-01` di ledger SAD dan dievaluasi di sana. Mengukur ECL di atas piutang neto-AJE-03
berarti menghitung koreksi yang sama **dua kali** (sekali lewat AJE-03, sekali lewat
cadangan yang lebih kecil), sekaligus mendahului keputusan partner.
*Membatalkan:* panggil `psak71(wtb, aje, 'ifAllProposed')`; uji
`eksposur bruto = piutang basis DILAPORKAN` akan gagal lebih dulu dan menunjukkan tempatnya.

**3. Cakupan penuh** — empat akun terkontaminasi lain masuk H1, plus dua yang ditemukan
saat mengerjakan (`figuresFromWTB`, `forensic_canon.dmod`) dan satu yang nol-dampak hari ini
(`intangibles`). Memindahkan sebagian adalah pola kegagalan yang sudah dua kali tercatat
di arc ini.

### PR-H4 — SELESAI (bukan lagi sisa)

Enam pembaca `.adj` tingkat-view kini ikut basis DILAPORKAN:
`ai_insights.tsx` · `view_analytical.tsx` (flux & riwayat) · `view_assertions.tsx` ·
`view_dataflow.tsx` · `view_materiality.tsx` · `view_misc1.tsx`.

Dua di antaranya membawa cacat KEDUA yang tak terduga: `view_materiality` dan `view_misc1`
membaca **`AMS.WTB` singleton BEKU**, sehingga "akun melampaui PM" tak bergerak saat WTB
perikatan berubah — pola cache-dingin yang sama dengan #129/PR-6b. Ambangnya PM, yakni
keputusan tentang **luas pengujian**, jadi salah populasi berarti salah ruang lingkup.
Keduanya kini reaktif dan menyebut angka yang sama (27 akun).

`view_dataflow` dipindahkan meski **invarian terhadap basis secara konstruksi**; invarian
itu **dipaku uji**, bukan dipercaya, dan Σ ≠ 0 dinyatakan sebagai SIFAT WTB (akun 4-/5-
terbuka, saldo laba adalah saldo penutup) supaya tak ada yang "memperbaikinya" jadi nol
dan membatalkan penutupan laba di `fsgen_model`.

`view_execution.tsx` (modul WTB) **sengaja dibiarkan**: menampilkan kolom `adj` sebagai
kolom memang tugasnya.

Terverifikasi live pada keenam modul. Gerbang: typecheck 0 · lint 0 · **806 test hijau**.
