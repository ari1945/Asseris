# PRD — PR-H1 Group Audit CP-01 Turunan · PR-H2 Default Materialitas yang Dilewati

**Status:** menunggu "Proceed." · **Basis:** master `d9149d0`
**Dua PR terpisah, satu dokumen** (preseden: `PRD - WTB PR-1 SSOT Materialitas & PR-2 Integritas Ingress.md`). Keduanya kecil, tanpa keputusan metodologi, dan tak saling bergantung — boleh dikerjakan berurutan atau paralel.

---

# PR-H1 — CP-01 di Group Audit: tiga angka induk yang tak pernah menyentuh buku besar

## 1. Masalah

`GA_COMPONENTS` (`view_groupaudit.tsx:28-34`) mendaftar lima komponen audit grup. **CP-01 adalah entitas induk — entitas yang sama dengan ENG-2025-014, yang buku besarnya hidup di WTB** dan sudah dikonsolidasi oleh `psak65()`. Namun barisnya mengetik ulang figur induk sebagai konstanta.

Terukur (probe kanon zero-arg, `psak65()`):

| Field CP-01 | Nilai hardcode | Angka hidup yang setara | Selisih |
|---|---|---|---|
| `npat` | **14.660 jt** | `p65.npatParent` = **11.540 jt** (basis `adj`) | **+3.120 jt (27%)** |
| `revPct` | **58%** | pendapatan induk 331.900 / konsol 461.650 = **71,9%** | **−13,9 pp** |
| `astPct` | **55%** | aset induk 322.488 / konsol 472.518 = **68,2%** | **−13,2 pp** |
| `mat` | 4.250 jt | sudah ditimpa `matById` (SA 600 PR-2) | — (mati sejak PR-2) |

**Temuan yang mempertajam ini: hanya CP-01 yang tak tie.** `npat` CP-02..CP-05 (11.900 · 7.200 · 2.600 · 4.050) cocok **persis** dengan `p65.subs[].npat`. Jadi empat baris yang memang harus datang dari paket pelaporan komponen sudah konsisten; satu-satunya baris yang bisa diturunkan dari buku besar sendiri justru yang dikarang. Pola yang sama persis dengan `AJE_META.pbt` (PR-D) dan `P46_FISCAL` (PR-F).

### 1.1 Modul membantah dirinya di dua tab

Dalam modul yang sama:

- Tab **Konsolidasi** (`view_groupaudit_parts.tsx:347`) menampilkan laba induk = `p65.indukSeparate` = **13.640 jt** (hidup, dari WTB).
- Tab **Komponen** membawa CP-01 `npat` = **14.660 jt** (konstanta).
- `view_psak65.tsx:297` menampilkan `p65.npatParent` = **11.540 jt**.

Tiga angka laba induk di dua modul yang bertetangga. (13.640 vs 11.540 bukan kontradiksi — yang kedua tanpa penghasilan dividen 2.100; keduanya berlabel benar. 14.660 tak punya penjelasan apa pun.)

### 1.2 Yang benar-benar berbahaya bukan `npat`

**`npat` CP-01 ternyata TIDAK punya konsumen** — diverifikasi dengan menyapu seluruh `migration/src`: satu-satunya pembaca `npat` di layar adalah `p65.subs[]` dan `p65.indukSeparate`, keduanya hidup. Jadi 14.660 adalah bobot mati yang menunggu dipakai, bukan angka yang sedang salah di layar.

**`revPct`/`astPct` sebaliknya DIPAKAI** (`view_groupaudit.tsx:131-132`):

```js
const revCoverage = covered.reduce((s, c) => s + c.revPct, 0);   // KPI cakupan SA 600
const astCoverage = covered.reduce((s, c) => s + c.astPct, 0);
```

Ini KPI **cakupan lingkup audit grup** — angka yang dipakai auditor untuk menyimpulkan bahwa prosedur atas komponen sudah mencakup porsi grup yang memadai (SA 600 ¶26-29). Hari ini ia dihitung dari lima persentase karangan yang kebetulan dijumlahkan menjadi 100. Ini kelas cacat yang lebih berat daripada `npat`: sebuah **kesimpulan lingkup audit berdiri di atas angka yang tak pernah menyentuh data**.

Dampak terukur: cakupan pendapatan terlapor **94%** (58+18+14+4) vs turunan sebenarnya **97,9%**. Kesimpulannya tidak berbalik — tetapi itu keberuntungan, bukan kontrol.

## 2. Tujuan
Menjadikan baris induk di Group Audit turunan dari sumber yang sama dengan modul konsolidasi, dan menghentikan KPI cakupan SA 600 berdiri di atas konstanta.

## 3. Kriteria sukses

| # | Kriteria | Bukti |
|---|---|---|
| S-1 | CP-01 tak lagi memuat figur induk sebagai konstanta | grep: nol angka induk literal di `GA_COMPONENTS` |
| S-2 | `revPct`/`astPct` seluruh komponen diturunkan dari `psak65` | KPI cakupan bergeser 94% → 97,9% (pendapatan) dan berubah setara untuk aset |
| S-3 | Laba induk konsisten lintas-modul | Group Audit, PSAK 65, dan roll-up konsolidasi menyebut angka yang sama dengan label yang sama |
| S-4 | State persist lama tidak menghidupkan kembali konstanta | Pola `matById` PR-2 diikuti: nilai terderivasi menang atas `gaComps` di localStorage |
| S-5 | Nol regresi | typecheck 0 · lint 0 · test hijau · snapshot kanon diperiksa baris demi baris |

## 4. Scope
`view_groupaudit.tsx` (GA_COMPONENTS, revCoverage/astCoverage), `view_groupaudit_parts.tsx` bila menampilkan field terkait, uji baru untuk derivasi cakupan.

## 5. Non-scope
- Paket pelaporan komponen CP-02..CP-05 — sudah tie, tak disentuh.
- Materialitas komponen — sudah diselesaikan SA 600 PR-2.
- `sad`, `evInd/evComp/evReg`, `step`, `status`, `risk` — data kerja perikatan, memang milik state, bukan turunan buku besar.

## 6. Pertanyaan terbuka

- **Q-H1 — basis figur induk.** `psak65()` default basis `'adj'` (PR-3b), sehingga `npatParent` 11.540 memasukkan AJE yang **masih usulan**. Materialitas sejak PR-3b memakai `'unadj'` (figur dilaporkan) justru untuk menghindari sirkularitas. Untuk baris komponen & cakupan lingkup: ikut `'adj'` (konsisten dengan modul konsolidasi di sebelahnya) atau `'unadj'` (konsisten dengan basis pelaporan)? *Rekomendasi saya: ikut basis yang sedang dipakai `p65` di layar itu* — cakupan lingkup adalah pernyataan tentang kertas kerja konsolidasi, bukan tentang ambang materialitas, jadi ia semestinya sama dengan tabel yang bersebelahan dengannya. Ini bukan keputusan metodologi berat, tetapi saya tidak memilihnya sendiri karena arc ini sudah dua kali tergelincir pada pertanyaan "populasi mana".
- **Q-H2 — nasib `npat` CP-01.** Dihapus (tak ada konsumen) atau diturunkan (agar tabel komponen dapat menampilkannya kelak)? *Rekomendasi: diturunkan*, karena menghapus field yang secara semantik ada pada empat baris lain akan membuat baris induk cacat bentuk.

## 7. Rencana implementasi
1. `GA_COMPONENTS` CP-01: buang `npat`/`revPct`/`astPct`/`mat` literal; tandai baris sebagai `derived: 'parent'`.
2. `useMemo` di `GroupAudit`: bangun `comps` efektif = state persist ⊕ figur turunan `p65` untuk baris induk (pola `matById`).
3. `revPct`/`astPct` seluruh komponen diturunkan dari `p65` (`rev`/`assets` per komponen ÷ konsolidasi) — bukan hanya induk; menurunkan induk saja akan membuat satu tabel dua basis, kesalahan yang persis diperingatkan memori arc SA 600.
4. Uji: cakupan menutup ke figur konsolidasi · induk tie ke `psak65` · state persist lama tak menang.
5. Verifikasi live: KPI cakupan **dan** tabel komponen **dan** tab konsolidasi — tiga permukaan, satu angka.

---

# PR-H2 — ENG-2025-040: PM Rp 0 karena default dilewati

## 1. Masalah

`canon_part4.ts:362`:

```js
const pmPctR = cfg ? { value: cfg.pmPct, hit: true }
                   : readPersistedWithHit('mat.pmPct', 75, engId);
```

Cabangnya **per-objek**, bukan per-field. Begitu sebuah konfigurasi materialitas server ada, seluruh nilai default di dalamnya ikut mati — termasuk untuk field yang isinya `null`. ENG-2025-040 menyimpan `pmPct: null`, sehingga:

```
pmFull = Math.round(omFull * null / 100)  →  0
```

**PM Rp 0**, dan `SliderRow` menerima `value={null}` → peringatan React "value prop on input should not be null".

Pola yang sama berlaku untuk `benchId`, `pct`, `cttPct`: satu field null di konfigurasi mana pun menghasilkan ambang nol tanpa alarm. Ini bukan cacat satu perikatan — ini cacat bentuk pada gerbang SSOT materialitas.

Latar: memori mencatat #129 membuat konfigurasi materialitas server pra-#129 menjadi yatim; `null` pada ENG-2025-040 konsisten dengan sisa data itu.

## 2. Tujuan
Default hanya boleh dilewati oleh **nilai**, bukan oleh **keberadaan record**.

## 3. Kriteria sukses

| # | Kriteria | Bukti |
|---|---|---|
| S-1 | `cfg` dengan field null jatuh ke default per-field | Uji: `cfg = { pmPct: null, … }` → `pmPct === 75` |
| S-2 | ENG-2025-040 menampilkan PM wajar, bukan Rp 0 | Verifikasi live pada perikatan tsb |
| S-3 | Nol peringatan React `value` null | Konsol bersih di modul materialitas |
| S-4 | Ambang nol tak pernah senyap | PM/OM/CTT bernilai 0 memunculkan pernyataan eksplisit, bukan angka nol polos |
| S-5 | Perilaku `cfg` lengkap tak bergeser | Uji `canon_part4.test.ts` yang ada tetap hijau tanpa diubah |

## 4. Scope
`canon_part4.ts` (resolusi per-field), `view_materiality_parts.tsx` (SliderRow tahan-null), uji.

## 5. Non-scope
Membersihkan data konfigurasi null di DB. Perbaikan berada di lapis pembacaan supaya instalasi mana pun aman — membersihkan DB tidak melindungi record berikutnya. Jika Anda ingin datanya ikut dirapikan, itu langkah terpisah dengan aba-aba tersendiri (menyentuh data perikatan).

## 6. Rencana implementasi
1. Ganti cabang per-objek menjadi koalesensi per-field (`cfg?.pmPct ?? readPersisted(...)`), dipertahankan agar `hit` tetap akurat untuk deteksi drift.
2. `SliderRow` menolak `null` → pakai default, bukan meneruskannya ke DOM.
3. Uji: konfigurasi parsial (tiap field null satu per satu) tetap memberi ambang wajar.
4. Verifikasi live pada ENG-2025-040: PM, konsol bersih.

---

## Risiko gabungan

| Risiko | Dampak | Mitigasi |
|---|---|---|
| PR-H1 menggeser KPI cakupan yang selama ini "rapi 100%" | Rendah | Angka baru menutup ke figur konsolidasi dan dapat ditelusuri; kerapian lama justru gejalanya |
| PR-H2 mengubah PM perikatan lain yang konfigurasinya parsial | Sedang | Sapu seluruh perikatan sebelum & sesudah; laporkan setiap yang bergeser, jangan diam-diam |
| `gaComps` di localStorage pengguna lama menghidupkan konstanta | Sedang | Pola `matById` PR-2 (turunan menang) + uji |

## Urutan yang saya sarankan
**PR-H2 lebih dulu** (lebih kecil, nol keputusan terbuka, memperbaiki gerbang SSOT yang dipakai banyak modul), lalu **PR-H1** setelah Q-H1 dijawab.

---

*Menunggu jawaban Q-H1 & Q-H2 dan "Proceed."*
