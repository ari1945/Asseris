# PRD — Integritas WTB & Tie-out LK yang Jujur dan Dapat Difalsifikasi (Paket P0)

> Wajib diisi sebelum implementasi apa pun.
> Implementasi TIDAK dimulai sebelum ada sign-off ("Proceed.").

| Field | Isi |
|---|---|
| Tanggal | 2026-08-07 |
| Pemilik | Ari Widodo |
| Status | **Approved** — Disetujui 2026-08-07 (Q1=a · Q2=blok · Q3=ya) |
| Engagement ID terkait | — (produk Asseris, bukan perikatan klien) |
| Pemicu | Evaluasi modul Working Trial Balance 2026-08-07; empat temuan di bawah diverifikasi dengan probe atas data seed, bukan dari pembacaan kode saja (Lampiran A) |

---

## 1. Problem

Modul WTB memancarkan empat sinyal integritas kepada auditor. **Tiga di antaranya tidak dapat
gagal, dan satu berwarna hijau saat panelnya sendiri berkata sebaliknya.** Semua angka di bawah
adalah hasil eksekusi atas seed `data_part1.ts`, bukan penalaran.

**P0-a — Chip hijau membantah panelnya sendiri.**
Warna chip diturunkan dari `gatesPass` ([wtb_integrity.ts:168](../migration/src/wtb_integrity.ts:168)),
yang menyusun empat kriteria: `bsTied && adjConsistent && ajeBalanced && registerReconciled`.
**Footing tidak termasuk** — sepenuhnya informasional. Akibatnya sebuah TB dapat memuat pesan
`warn` di panel sementara chip di atasnya hijau bertuliskan "Integritas OK"
([view_execution.tsx:192-197](../migration/src/view_execution.tsx:192)). Probe atas seed:

```
status: "ok"          ← chip hijau
messages[0]: "warn: Laba berjalan tampaknya TERCATAT DUA KALI …"
```

Auditor yang tidak membuka panel melihat lampu hijau. Auditor yang membukanya melihat peringatan
material. Dua sinyal berlawanan atas satu keadaan.

**P0-b — Akun berkode non-numerik menguap dari rekonsiliasi neraca.**
Klasifikasi memakai karakter pertama kode ([wtb_integrity.ts:79](../migration/src/wtb_integrity.ts:79),
`lead()`); hanya `1`–`6` yang masuk aset/liabilitas/ekuitas/L-R. Akun klien yang belum dipetakan
**mempertahankan kode aslinya** ([wtb_mapping.ts:124](../migration/src/wtb_mapping.ts:124)). Probe
dengan satu akun `AC-900` senilai Rp 25.000 jt:

| Ukuran | Hasil |
|---|---|
| `assets` / `liabilities` / `equity` | tidak memuat Rp 25.000 jt sama sekali |
| `bsDiff` | 0 → `bsTied: true` |
| `status` | **`ok`** (chip hijau) |
| satu-satunya keluhan | footing — yang tidak masuk gerbang |

Berbeda dengan P0-a yang hanya mengenai seed, **cacat ini mengenai setiap TB klien nyata yang
belum dipetakan penuh** — yaitu kondisi normal sepanjang onboarding. Nomenklatur klien yang
berbeda persis merupakan alasan modul pemetaan CoA ada.

**P0-c — Tie-out ekuitas LK mustahil gagal, dan plugnya memakai nama pengungkapan PSAK.**
`oci` didefinisikan sebagai residu: `endRE − beginRE − netIncome`
([fsgen_model.tsx:137](../migration/src/fsgen_model.tsx:137)). Tie-out lalu membandingkan
`netIncome + oci` terhadap `endRE − beginRE` ([fsgen_model.tsx:269](../migration/src/fsgen_model.tsx:269)).
Substitusi menghasilkan identitas; probe mengonfirmasi `diff: 0` **persis** pada kedua basis:

| Basis | beginRE | endRE | Laba | `oci` (plug) | tie-out `re` |
|---|---|---|---|---|---|
| dilaporkan | 82.363 | 103.427 | 14.510 | **6.554** | diff 0 · `ok` |
| ifAllProposed | 82.363 | 100.457 | 11.540 | **6.554** | diff 0 · `ok` |

Residu Rp 6.554 jt — **2,8× PM perikatan (Rp 2.316 jt)** — disajikan di Laporan Perubahan Ekuitas
dan Laporan Laba Rugi Komprehensif dengan label
`"Penghasilan komprehensif lain — pengukuran kembali imbalan kerja"` beserta rujukan catatan 13
([view_fsgen.tsx:329](../migration/src/view_fsgen.tsx:329)). **Sebuah angka sisa mengenakan
asersi akuntansi bernama.** Badge status "Perubahan Ekuitas" di panel diagnostik mengulang
identitas yang sama ([view_fsgen.tsx:195](../migration/src/view_fsgen.tsx:195)) sehingga ikut
selalu `ok`. PR-H3 sudah membereskan tiga tie-out sejenis yang membandingkan nilai dengan dirinya
sendiri; yang ini lolos karena identitasnya baru terlihat setelah satu langkah substitusi.

**P0-d — Seed TB tidak koheren sebagai neraca saldo, dan bukan karena satu angka.**
Probe: `sumAdj = −11.540 jt`, `bsDiff = 0`, `netIncome = 11.540 jt` → `incomeDoubleCounted: true`.
Saldo laba `3-2100` adalah saldo **penutup** sementara akun 4-/5- tetap terbuka — sifat yang sudah
didokumentasikan PR-H1 ([fsgen_model.tsx:78-95](../migration/src/fsgen_model.tsx:78)) dan
dikompensasi `reShift` di FSGEN, tetapi **tidak** dikompensasi di mana pun bagi WTB.

Yang belum pernah dicatat: seed memuat **dua** ketidakcocokan, bukan satu. Keduanya tidak dapat
dipenuhi sekaligus dengan menggeser `3-2100`:

| Sasaran | Nilai `3-2100` unadj yang dibutuhkan |
|---|---|
| TB ter-foot (`Σ adjusted = 0`) | −88.917 jt |
| Mutasi saldo laba tie tanpa plug (tanpa PKL/dividen) | −82.363 jt (= saldo TA lalu) |
| **Selisih tak terjelaskan** | **6.554 jt** — persis nilai plug `oci` |

Artinya perbaikan seed menuntut sebuah **keputusan akuntansi** (Q1 §11), bukan penyuntingan angka.
Nilai `3-2100` saat ini −100.457 jt ([data_part1.ts:80](../migration/src/data_part1.ts:80)).

**Mengapa keempatnya satu paket.** `status === 'ok'` memberi makan `wtbIntegrityOk`
([wp_signoff.tsx:545](../migration/src/wp_signoff.tsx:545)) yang menjadi kriteria gerbang
finalisasi ([engagement_phase_gate.ts:80](../migration/src/engagement_phase_gate.ts:80)). Rantai
dari deteksi ke keputusan finalisasi sudah terpasang; yang bocor adalah kejujuran sinyal yang
mengalir di dalamnya.

---

## 2. Objective

**Setiap sinyal integritas WTB dan tie-out LK harus dapat gagal atas masukan yang salah, dan warna
yang ditampilkan harus mencerminkan isi panel di baliknya.**

Turunannya:
1. Tidak ada keadaan di mana indikator hijau berdampingan dengan peringatan yang belum dijawab.
2. Saldo yang tidak dapat diklasifikasikan diperlakukan sebagai risiko, bukan diabaikan diam-diam.
3. Angka residu tidak boleh mengenakan label pengungkapan akuntansi.
4. Data seed lulus gerbangnya sendiri **karena benar**, bukan karena gerbangnya dilonggarkan.

---

## 3. Success Criteria

| # | Kriteria | Cara uji |
|---|---|---|
| SC-1 | Tidak ada kombinasi masukan yang menghasilkan indikator hijau sementara `messages` memuat `warn` | Uji properti atas `checkWtbIntegrity` (matriks kondisi) |
| SC-2 | Baris ber-kode non-terklasifikasi terdeteksi, terhitung nilainya, terdaftar di panel, dan menurunkan status | Uji dengan TB ber-kode alfabet (kasus probe `AC-900`) |
| SC-3 | Tie-out `re` **gagal** bila `endRE` digeser melebihi toleransi Rp 1 jt | Uji mutasi: geser saldo `3-2100` → `ok:false`. Saat ini mustahil |
| SC-4 | `oci` hanya bernilai ≠ 0 bila ada pos ekuitas yang dideklarasikan; sisa tak terjelaskan tampil sebagai selisih, bukan sebagai PKL | Uji LK: label PSAK 24 tidak muncul tanpa nilai eksplisit |
| SC-5 | Seed: `sumAdj = 0`, `bsDiff ≈ netIncome`, `incomeDoubleCounted = false` | Probe ulang seed |
| SC-6 | `incomeDoubleCounted` memblok finalisasi, dan seluruh perikatan seed tetap lolos gerbang | `engagement_phase_gate` + smoke finalisasi |
| SC-7 | `npm run typecheck` 0 error · seluruh `vitest` hijau · ratchet `no-explicit-any` tidak naik | CI |

---

## 4. Scope

- `wtb_integrity.ts` — deteksi baris tak terklasifikasi; penyusunan `status`; pesan.
- `view_execution.tsx` — warna chip & badge panel; daftar akun tak terklasifikasi.
- `fsgen_model.tsx` — `oci` berhenti menjadi plug; tie-out `re` memakai pembanding independen.
- `view_fsgen.tsx` — badge L3 "Perubahan Ekuitas"; penyajian baris PKL & selisih.
- `data_part1.ts` — nilai seed `3-2100` (+ pos ekuitas eksplisit bila Q1 memutuskan demikian).
- Uji: `wtb_integrity.test.ts`, `fsgen_tieout.test.ts`, `fsgen_basis.test.ts`,
  `canon_regression.test.ts` (snapshot), `engagement_phase_gate.test.ts`.

## 5. Non-Scope

- P1/P2 dari evaluasi yang sama: impor berkas asli, template pemetaan CoA fuzzy, filter
  reviewer-centric, restrukturisasi WTB menjadi workbench. **Paket terpisah**, setelah paket ini.
- Perubahan kontrak `AMS_CANON` di luar yang tercantum di Scope.
- Perubahan server / StateDoc / RBAC.
- Perbaikan data seed di luar akun ekuitas yang disebut Q1.

## 6. Constraints

- ESM-only; sumber kebenaran `migration/src` (CLAUDE.md). `app/` beku.
- `tsc --noEmit` **wajib 0 error**, `strict` penuh. Tanpa `any` baru — satu `any` baru
  meng-un-suppress seluruh berkas pada ratchet ESLint.
- `wtb_integrity.ts` dan lapisan kanon harus tetap **fungsi murni**, tanpa efek samping.
- Menyentuh kanon/seed → **wajib** memperbarui snapshot `canon_regression.test.ts`.
- Token warna semantik & skala tipografi mengikat (PR #127/#128) — indikator baru memakai
  `--amber`/`--red`/`--green` dan `--fs-*`, tanpa nilai baru.
- Perubahan seed menggerakkan angka LK demo; tangkapan layar & dokumen yang memuat angka lama
  perlu ditinjau.

## 7. Existing Solutions (dipakai ulang, bukan diciptakan)

- **PR-4d** sudah mendeteksi `incomeDoubleCounted` dan menuliskan alasannya di
  [wtb_integrity.ts:123](../migration/src/wtb_integrity.ts:123) — deteksinya tidak perlu dibangun,
  hanya perlu diberi konsekuensi.
- **PR-H3** sudah menetapkan pola perbaikan tie-out yang benar: bandingkan laporan terhadap
  `m.src` (sumber saldo independen), bukan terhadap definisinya sendiri
  ([fsgen_model.tsx:275](../migration/src/fsgen_model.tsx:275)). Fase C mengikuti pola itu persis.
- **PR-H1** sudah memodelkan penutupan laba lewat `reShift` — Fase D menyelaraskan seed dengan
  model tersebut, tidak menggantinya.
- **PR-6c** menetapkan prinsip yang mengunci urutan paket ini: data contoh tidak boleh menyalakan
  gerbangnya sendiri, karena itu mengajari pengguna mengabaikan peringatan.

## 8. Proposed Approach

### Fase A — chip jujur (tidak menyentuh gerbang)
Tambahkan turunan `hasWarn = messages.some(m => m.level === 'warn')`. Chip
([view_execution.tsx:192](../migration/src/view_execution.tsx:192)) dan badge panel
([view_execution.tsx:1167](../migration/src/view_execution.tsx:1167)) mengambil warna dari
`hasWarn`, bukan dari `status`. `gatesPass` **tidak diubah** — finalisasi tidak terkunci.
Hasil: peringatan yang sudah ada berhenti bersembunyi di balik lampu hijau. Termurah, efek
langsung, dapat merge sendiri.

### Fase B — saldo tak terklasifikasi menjadi kriteria gerbang
Di `checkWtbIntegrity`: kumpulkan `unclassified: { code, adj }[]` untuk setiap baris yang
`lead()`-nya di luar `1`–`6`, beserta `unclassifiedTotal`. Tambahkan ke `gatesPass`, terbitkan
pesan `warn` yang menyebut jumlah akun dan nilainya, dan tampilkan daftarnya di panel dengan
tautan ke drawer "Petakan Akun". Seed berkode numerik penuh → demo tidak terpengaruh.

### Fase C — `oci` berhenti menjadi plug, tie-out `re` difalsifikasi
`oci` menjadi **masukan eksplisit** (default 0) yang berasal dari pos ekuitas terdeklarasi.
Selisih yang tersisa menjadi `reUnexplained = (endRE − beginRE) − netIncome − oci`, ditampilkan
sebagai barisnya sendiri dan **memicu tie-out `re` gagal** bila melebihi toleransi. Label PSAK 24
catatan 13 hanya melekat pada nilai yang dideklarasikan. Badge L3 di
[view_fsgen.tsx:195](../migration/src/view_fsgen.tsx:195) mengikuti tie-out, bukan menghitung ulang.

### Fase D — seed dibereskan, lalu pemblokir dinyalakan
Terapkan keputusan Q1 atas Rp 6.554 jt; setel `3-2100`; perbarui snapshot; **baru** tambahkan
`&& !incomeDoubleCounted` pada `gatesPass` ([wtb_integrity.ts:168](../migration/src/wtb_integrity.ts:168)).

**Fase C dan D terkopel dan harus satu PR.** Menjalankan C lebih dulu membuat tie-out ekuitas demo
merah sebesar Rp 6.554 jt sampai D selesai; menjalankan D lebih dulu memindahkan plug tanpa
memperbaiki apa pun yang dapat difalsifikasi.

---

## 9. Risks

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Perubahan seed menggeser angka LK demo (Ekuitas & Arus Kas Pendanaan) | Tangkapan layar/dokumen memuat angka basi | Materialitas **tidak** bergeser (`3-2100` bukan aset/pendapatan, jadi tolok ukur PM utuh); diff snapshot ditinjau baris demi baris |
| Fase B memunculkan "perlu perhatian" massal pada TB klien nyata | Terkesan regresi | Itu memang keadaan sebenarnya; pesan menyebut jumlah + nilai + tautan ke alat pemetaan |
| Gerbang lebih ketat mendorong pencarian jalan pintas | Gerbang dimatikan diam-diam | Pesan spesifik & dapat ditindaklanjuti; override finalisasi tetap lewat jalur RBAC yang ada |
| Q1 dijawab "artefak, hapus saja" padahal 6.554 jt punya makna | Seed kehilangan pos PSAK 24 yang disengaja | Q1 diputuskan Ari sebelum Fase D dimulai — bukan asumsi implementer |
| Menyentuh `fsgen_model.tsx` merembet ke SAD/FS Generator | Regresi lintas modul | `fsgen_basis.test.ts` & `fsgen_tieout.test.ts` sudah ada sebagai jaring |

---

## 10. Implementation Plan

| PR | Isi | Ketergantungan | Ukuran |
|---|---|---|---|
| **PR-I1** | Fase A — chip & badge dari `hasWarn` + uji properti SC-1 | — | kecil |
| **PR-I2** | Fase B — `unclassified` sebagai kriteria gerbang + daftar di panel + uji SC-2 | PR-I1 | sedang |
| **PR-I3** | Fase C+D — `oci` eksplisit, tie-out `re` falsifiable, badge L3, seed, snapshot, pemblokir + uji SC-3..SC-6 | PR-I2 · **keputusan Q1** | besar |

Tiap PR: `npm run typecheck` · `npm run lint` · `npx vitest run` hijau sebelum diajukan, dan
verifikasi hidup di preview (bukan hanya uji) sesuai pelajaran PR-H0..H4.

---

## 11. Open Questions

> **KEPUTUSAN Ari, 2026-08-07 — ketiganya sesuai rekomendasi:**
> **Q1 = (a)** PKL PSAK 24 dimodelkan eksplisit & dikaitkan ke `2-2300`; `3-2100` disetel −88.917 jt.
> **Q2 = memblok** — saldo tak terklasifikasi menghentikan finalisasi.
> **Q3 = ya** — PR-I1 berjalan lebih dulu, tanpa menunggu Fase C/D.

**Q1 — MEMBLOKIR Fase D. Apa sebenarnya Rp 6.554 jt pada mutasi saldo laba seed?**

| Opsi | Konsekuensi |
|---|---|
| (a) PKL PSAK 24 yang memang disengaja | Modelkan eksplisit sebagai pos ekuitas, kaitkan ke liabilitas imbalan kerja `2-2300`; label catatan 13 menjadi sah. `3-2100` disetel −88.917 jt |
| (b) Dividen | Tambahkan pos dividen di Perubahan Ekuitas **dan** Arus Kas Pendanaan; LK demo berubah di dua laporan |
| (c) Artefak tanpa makna | Setel `3-2100` = −82.363 jt (saldo TA lalu); baris PKL hilang dari LK demo |

Rekomendasi saya: **(a)** — seed sudah memuat liabilitas imbalan kerja dan beban imbalan kerja
non-kas, jadi pengukuran kembali PSAK 24 adalah satu-satunya opsi yang membuat label yang sudah
tertulis di LK menjadi benar alih-alih menghapusnya.

**Q2** — Apakah saldo tak terklasifikasi (Fase B) **memblok** finalisasi, atau cukup menurunkan
status ke "perlu perhatian"? Rekomendasi: memblok — saldo yang tak dapat diklasifikasikan tidak
dapat diaudit.

**Q3** — Apakah PR-I1 boleh merge sendiri lebih dulu, sebelum Q1 dijawab? Rekomendasi: ya.

---

## Lampiran A — Keluaran probe (2026-08-07, seed `data_part1.ts`)

```
checkWtbIntegrity(WTB, AJE)
  status "ok" · incomeDoubleCounted true · footed false · footingExplainedByIncome true
  sumAdj −11.540.000.000 · netIncome 11.540.000.000 · bsDiff 0 · tol 31.655.790
  messages[0] = warn "Laba berjalan tampaknya TERCATAT DUA KALI …"

checkWtbIntegrity([1-1100 +100.000jt, 2-1100 −60.000jt, 3-1100 −40.000jt, AC-900 +25.000jt], [])
  status "ok" · assets 100.000jt · liabilities 60.000jt · equity 40.000jt · bsDiff 0 · bsTied true
  (AC-900 senilai 25.000jt tidak muncul di satu pun klasifikasi)

FSGEN.buildTieOuts — tie-out 're'
  basis "reported":      a 21.064jt · b 21.064jt · diff 0 · ok true   (oci plug 6.554jt)
  basis "ifAllProposed": a 18.094jt · b 18.094jt · diff 0 · ok true   (oci plug 6.554jt)

Simulasi koreksi 3-2100 (+11.540jt):
  sumAdj 0 · bsDiff 11.540jt · footed true · bsExplainedByIncome true · incomeDoubleCounted false
```

Probe bersifat sementara dan telah dihapus; `git status` bersih pada saat PRD ini ditulis.
