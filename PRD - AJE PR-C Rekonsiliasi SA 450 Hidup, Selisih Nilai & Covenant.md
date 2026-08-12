# PRD — AJE PR-C: Rekonsiliasi SA 450 Hidup, Selisih Nilai & Covenant

**Status:** **Draft** — menunggu sign-off ("Proceed.")

**Tanggal:** 2026-07-27 · **Status:** MENUNGGU SIGN-OFF ("Proceed.")
**Basis:** `master` · **bergantung pada** PR-A ([#139](https://github.com/ari1945/Asseris/pull/139)) untuk bagian covenant
**Pendahulu:** PRD PR-A (SSOT figur entitas) · PRD PR-B (gerbang otorisasi, [#140](https://github.com/ari1945/Asseris/pull/140))
memori `asseris-aje-module-eval`, `asseris-wtb-eval-pr1-pr2`

---

## 1 · Problem

Modul SAD (SA 450) adalah tempat salah saji tidak dikoreksi diagregasi dan dibandingkan
terhadap materialitas — dasar langsung penentuan opini. Empat cacat membuatnya
menyatakan hal yang tidak benar.

### P-0 · Rekonsiliasi membaca seed beku

`view_sad.tsx:81` memberi **seed statis** ke mesin rekonsiliasi:

```js
const recon = useMemoSD(() => reconcileUncorrectedMisstatements({
  aje: AMS.AJE || [],        // ← seed modul, BUKAN useAudit().aje
  sad: items, om, opinionType, method,
}), [items, om, opinionDoc, method]);
```

Konsekuensi: setiap perubahan status jurnal — termasuk **persetujuan partner yang
memposting jurnal lewat rantai PR-B** — tidak menggerakkan banner rekonsiliasi.
Jurnal yang dibuat auditor tidak pernah masuk hitungan sama sekali. Deps array pun
tak memuat `aje`, jadi bahkan bila sumbernya diperbaiki, memo tak akan re-evaluasi.

Ini kelas cache-dingin yang sama dengan #129 (materialitas membaca kunci yang tak
pernah ditulis) dan PR-6b. Bedanya: di sini yang basi adalah **populasi salah saji
yang menentukan opini**.

### P-1 · Rekonsiliasi tidak memeriksa NILAI

`reconcileUncorrectedMisstatements` (`canon_validation.ts`) memeriksa dua hal:
kelengkapan (AJE Proposed tanpa item SAD) dan kemutakhiran disposisi (`disp` vs
status posting). **Nilainya tidak pernah dibandingkan.** Pada seed:

| Item SAD | Nilai SAD | Jurnal tertaut | Nilai jurnal | Selisih |
|---|---|---|---|---|
| M-01 | 1.950 jt | AJE-03 | 1.850 jt | **100 jt** |
| M-04 | 680 jt | AJE-02 | 620 jt | **60 jt** |
| M-02 | 1.120 jt | AJE-05 | 1.120 jt | — |
| M-05 | 2.340 jt | AJE-01 | 2.340 jt | — |
| M-06 | 980 jt | AJE-04 | 980 jt | — |

Selisih itu **tidak selalu kesalahan** — auditor sah mengusulkan koreksi sebagian.
Tetapi bila AJE-03 diposting dan M-01 ditandai `corrected`, seluruh 1.950 jt keluar
dari agregat, padahal **100 jt tetap tidak dikoreksi**. Agregat SA 450 understated,
dan yang understated adalah angka yang dibandingkan terhadap OM.

`disp` hanya punya tiga keadaan (`uncorrected | corrected | passed`) — tak ada
"dikoreksi sebagian", sehingga residu tak punya tempat untuk dicatat.

### P-2 · Modul AJE mengklaim tanpa membaca

`view_aje.tsx:365` menyatakan, di panel drill:

> *"Mengoreksi salah saji **M-05** pada Summary of Audit Differences (SA 450).
> Salah saji ini telah berstatus dikoreksi."*

Klaim itu diturunkan **semata dari `a.status === 'Posted'`**, tanpa pernah membaca
`disp` item SAD yang bersangkutan. SAD menyimpan disposisinya sendiri (persist
`sadItems.v1`, diubah manual lewat `cycleDisp`). Jadi modul AJE dapat menyatakan
"telah dikoreksi" untuk salah saji yang di modul SAD masih `uncorrected` — dua modul,
satu fakta, dua jawaban. Rekonsiliasi yang ada hanya berjalan satu arah (di SAD);
tak ada banner balikan di AJE.

### P-3 · Covenant: narasi ter-hardcode yang kini bertentangan di layar

`view_sad.tsx:359` dan `:37` menuliskan angka mati:

> *"Current ratio turun dari **1,38×** ke **1,19×** akibat M-01 & reklas M-07 —
> menembus ambang covenant **1,20×**."*

Setelah PR-A menarik rasio lancar dari WTB, modul AJE menampilkan **1,64× → 1,62×**
untuk perikatan yang sama. Angka "1,38×" tak berasal dari mana pun.

Akar teknisnya adalah lubang model data: item SAD **tidak punya field efek neraca**.
Yang ada hanya `pbt` dan `na` (efek laba). M-07 — reklasifikasi utang bank ke
liabilitas lancar, yang justru paling menentukan rasio lancar — tercatat `pbt: 0,
na: 0`, dan besarannya (Rp 4,1 M) hanya hidup di dalam string catatan kualitatif.
Rasio proyeksi karena itu **tidak dapat dihitung** dari data yang ada.

---

## 2 · Objective

Rekonsiliasi SA 450 yang membaca keadaan sebenarnya, menyatakan selisih yang
sebenarnya, dan tidak mengarang angka yang tidak dapat dihitung.

Turunannya: (a) rekonsiliasi bereaksi terhadap register jurnal hidup; (b) selisih
nilai antara salah saji dan koreksinya terlihat dan teragregasi sebagai residu;
(c) klaim "telah dikoreksi" hanya muncul bila kedua modul sepakat; (d) angka
covenant dihitung atau tidak ditampilkan sama sekali.

---

## 3 · Success Criteria

1. Mengubah status satu jurnal (lewat rantai persetujuan) mengubah hasil
   `recon` tanpa reload — uji integrasi, bukan asumsi.
2. `reconcileUncorrectedMisstatements` mengembalikan `valueDeltas[]` untuk tiap
   pasangan SAD↔AJE yang nilainya berbeda; uji memaku M-01 (100 jt) dan M-04 (60 jt)
   dan memastikan tiga pasangan lain **tidak** muncul.
3. Residu masuk agregat: uji membuktikan bahwa M-01 `corrected` + AJE-03 posted
   menyisakan 100 jt di agregat uncorrected, bukan nol.
4. Panel drill AJE menampilkan status SAD **yang dibaca**, bukan disimpulkan;
   uji: `disp='uncorrected'` + jurnal `Posted` → banner kontradiksi, bukan klaim
   "telah dikoreksi".
5. Rasio lancar di SAD berasal dari `entityFigures` — nilai yang **sama** dengan
   modul AJE; diverifikasi lewat pembacaan DOM di kedua modul.
6. Tidak ada angka covenant proyeksi yang ditampilkan kecuali seluruh komponennya
   dapat dihitung; bila tidak, panel menyatakan apa yang kurang.
7. `npm run typecheck` 0 · `npm test` hijau · `npm run lint` tanpa suppression baru.

---

## 4 · Scope

**`canon_validation.ts`** — `reconcileUncorrectedMisstatements` diperluas:
- `valueDeltas: Array<{ sadId, ajeId, sadAmount, ajeAmount, delta }>`
- `residualUncorrected: number` — jumlah `delta` untuk item ber-`disp='corrected'`
  yang jurnalnya sudah `Posted` (bagian yang nyatanya belum dikoreksi)
- `aggNet`/`aggAbs` memasukkan residu itu

**`view_sad.tsx`**
- `aje: AMS.AJE` → `useAudit().aje`; `aje` masuk deps `useMemoSD`.
- Panel selisih nilai + residu di tab Evaluasi Agregat.
- Covenant: rasio kini dari `entityFigures(wtb)`; rasio proyeksi hanya bila seluruh
  komponen tersedia (lihat §11 Q1).
- Catatan kualitatif `covenant` berhenti memaku angka.

**`view_aje.tsx`** — panel drill membaca `sadItems.v1`; tiga keadaan: sepakat
dikoreksi · sepakat belum · **bertentangan** (banner amber + tautan ke SAD).

**Uji** — `canon_validation.test.ts` diperluas; uji integrasi lintas-modul baru.

---

## 5 · Non-Scope

- `AJE_META.pbt`/`curEff` duplikat & `ajeDeriveKind` → **PR-D**.
- Regime materialitas grup SA 600 (`view_groupaudit.tsx`) → PRD tersendiri.
- Empat jenis persetujuan lain di luar AJE → tetap seperti PR-B §5.
- **Otomatisasi disposisi**: memposting jurnal TIDAK akan otomatis menandai item SAD
  `corrected`. Disposisi tetap pertimbangan auditor (SA 450 ¶8); yang dibangun di sini
  adalah deteksi ketidaksesuaian, bukan penggantian pertimbangan. Lihat §11 Q2.
- `FISCAL.pbt` (dua PBT tersisa dari PR-A) — masih utang tercatat.

---

## 6 · Constraints

- **Bagian covenant memerlukan PR-A ter-merge.** `entityFigures`/`ajeEffect` lahir di
  #139. PR-C juga menyentuh `view_sad.tsx` di berkas yang sama dengan PR-A → konflik
  bila keduanya terbuka bersamaan. Rekomendasi: **merge #139 lebih dulu**, lalu PR-C
  dari master terbarui. Bila tidak, P-0/P-1/P-2 tetap dapat dikerjakan sendiri dan
  P-3 menyusul.
- Ratchet ESLint: satu `:any` baru meng-un-suppress seluruh berkas.
- `sadItems.v1` dibaca dua modul → kunci persist tetap satu pemilik (SAD); modul AJE
  membaca lewat `useAmsPersist` yang sama, bukan menyalin.

---

## 7 · Existing Solutions

- `reconcileUncorrectedMisstatements` + `ajeRefKey` sudah ada, sudah ber-uji, dan
  normalisasi `PAJE-03`→`AJE-03` sudah benar. Yang kurang hanya dimensi **nilai**.
- `entityFigures`/`ajeEffect` (PR-A) menyediakan rasio lancar dan efek jurnal —
  tak perlu mesin baru untuk covenant.
- Pola banner kontradiksi sudah dipakai di SAD (`recon.stale`); modul AJE tinggal
  memakai bentuk yang sama agar konsisten.

Custom work yang dibenarkan: konsep **residu** (selisih yang tetap tidak dikoreksi
setelah koreksi sebagian) — belum ada padanannya.

---

## 8 · Proposed Approach

Perbaiki sumber data dulu (P-0), lalu tambahkan dimensi yang hilang (P-1), lalu
balikkan arah pembacaan (P-2), terakhir hitung yang bisa dihitung dan diamkan yang
tidak (P-3). Berurutan karena tiap langkah dapat diverifikasi sendiri dan P-1
memerlukan P-0 agar dapat diuji dengan keadaan hidup.

**Alternatif yang ditolak:**
1. *Selaraskan saja nilai seed supaya tidak ada selisih.* Ditolak — menyembunyikan
   kelas cacat, bukan menutupnya. Koreksi sebagian adalah keadaan nyata dalam audit;
   sistem harus menanganinya, bukan mengasumsikannya tak pernah terjadi.
2. *Otomatis tandai SAD `corrected` saat jurnal diposting.* Ditolak — disposisi adalah
   pertimbangan auditor (SA 450 ¶8). Mengotomatiskannya menghapus jejak pertimbangan
   dan justru menutup kontradiksi yang seharusnya terlihat.
3. *Hitung rasio proyeksi dengan mengurai string `fsli`.* Ditolak — menebak klasifikasi
   neraca dari teks bebas adalah sumber kesalahan diam berikutnya.

---

## 9 · Risks

### R-1 · Residu mengubah agregat → kesimpulan SA 450 bergeser

Menambahkan residu ke `aggNet` menaikkan agregat uncorrected. Digabung dengan OM yang
turun 2,87× di PR-A, `exceedsOm` dapat menyala pada perikatan yang sebelumnya aman —
dan `opinionInconsistent` ikut menyala.
**Mitigasi:** ini perilaku yang benar dan memang tujuannya; tapi PR harus menyertakan
sebelum/sesudah agregat & kesimpulan agar peninjau tak membacanya sebagai regresi.
Residu ditampilkan sebagai baris terpisah, bukan dilebur diam-diam ke angka lama.

### R-2 · Dua pemilik `sadItems.v1`

Modul AJE membaca kunci yang dimiliki SAD. Dua `useServerState` atas satu kunci
**tidak saling sinkron dalam satu sesi** — persis split-brain yang diperingatkan di
`contexts.tsx` untuk `matConfig`.
**Mitigasi:** modul AJE membaca **read-only** dan tak pernah menulis. Bila nanti perlu
menulis, kunci harus naik ke provider seperti `matConfig` di PR-6b.

### R-3 · Konflik `view_sad.tsx` dengan PR-A

Keduanya menyentuh berkas & region yang sama (blok `FS`/recon).
**Mitigasi:** §6 — merge #139 dulu. Bila Anda memilih PR-C jalan duluan, bagian
covenant dikeluarkan dan PR-A akan me-rebase di atasnya.

### R-4 · Angka covenant yang tak dapat dihitung

Bila Q1 dijawab "jangan tambah field", panel kehilangan angka proyeksi yang selama ini
ada (walau fiktif). Sebagian pembaca akan membacanya sebagai kemunduran fitur.
**Mitigasi:** panel menyatakan **mengapa** angkanya tak ada dan apa yang harus diisi —
lebih berguna daripada angka yang salah, dan jujur secara kertas kerja.

---

## 10 · Implementation Plan

| # | Langkah | Verifikasi |
|---|---|---|
| 1 | `view_sad` recon → `useAudit().aje` + deps | Kriteria #1 |
| 2 | `valueDeltas` di `reconcileUncorrectedMisstatements` + uji | Kriteria #2 |
| 3 | `residualUncorrected` masuk agregat + uji | Kriteria #3 |
| 4 | Panel selisih & residu di tab Evaluasi Agregat | tinjauan visual |
| 5 | Banner balikan di panel drill AJE (baca `sadItems.v1`) | Kriteria #4 |
| 6 | Covenant dari `entityFigures`; buang angka ter-hardcode | Kriteria #5, #6 |
| 7 | Verifikasi live: rasio lancar SAD = rasio lancar AJE | Kriteria #5 di layar |

Langkah 6-7 hanya bila #139 sudah merge (§6).

---

## 11 · Open Questions

**Q1 — Item SAD mendapat field efek neraca, atau panel covenant berhenti memproyeksi?**
*(memblokir langkah 6)*
Rasio proyeksi menuntut efek tiap salah saji terhadap aset/liabilitas lancar. Untuk
item yang tertaut jurnal, itu dapat diturunkan lewat `ajeEffect`. Untuk M-07
(reklasifikasi tanpa jurnal, `pbt: 0`), tidak ada sumbernya.
Rekomendasi saya: **tambah field opsional `bsEffect: { curAssets, curLiab }`** pada
item SAD, terisi otomatis dari jurnal tertaut dan dapat diisi auditor untuk item
tanpa jurnal. Panel memproyeksi hanya bila seluruh item ber-`qual: 'covenant'` punya
efek yang diketahui; bila tidak, ia menyebut item mana yang belum lengkap.
Alternatif lebih murah: buang proyeksi, tampilkan rasio kini saja + peringatan
kualitatif tanpa angka.

**Q2 — Residu: baris SAD baru, atau anotasi pada baris yang ada?**
Rekomendasi: **anotasi** (`residual` pada item), bukan baris baru — baris baru akan
mengacaukan penghitungan item dan komunikasi ke manajemen. Tapi ini memengaruhi
tampilan ledger, jadi saya tak memutuskannya sendiri.

**Q3 — Perlukah `disp` mendapat keadaan keempat "dikoreksi sebagian"?**
Rekomendasi: **tidak** di PR-C. Residu sudah menangkap faktanya tanpa mengubah siklus
tiga-keadaan yang sudah dipakai di beberapa tempat. Menambah keadaan menyentuh
`DISP_CYCLE`, komunikasi manajemen, dan ekspor — cukup untuk PR tersendiri.

---

**Sign-off:** ditandai dengan balasan **"Proceed."**
Q1 memblokir langkah 6; langkah 1-5 dapat berjalan dengan rekomendasi di atas.
Bila #139 belum merge saat implementasi dimulai, langkah 6-7 ditunda dan dinyatakan
di PR.
