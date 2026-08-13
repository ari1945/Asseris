# PRD — PR-8 · Peta Toolkit Manajemen Mutu IAPI → Modul Asseris & Status Dokumentasi SMM 1 ¶57–60

> Wajib diisi sebelum implementasi apa pun. Implementasi TIDAK dimulai sebelum sign-off ("Proceed.").

| Field | Isi |
|---|---|
| Tanggal | 2026-08-13 |
| Pemilik | Ari Widodo |
| Status | Draft — Q-1 & Q-2 TERJAWAB (Ari, 2026-08-13); menunggu sign-off ("Proceed.") |
| Engagement ID terkait | — (lintas-firma; modul `soqm`, `governance`, `eqr`, `records`, `crypto`) |
| PRD induk | `docs/prd-smm1-smm2-adoption.md` — **PR-8**, Fase 5 ("opsional, keputusan terpisah") |
| Sumber normatif | Toolkit Manajemen Mutu V3 (IAPI, 05-06-2025) · Matriks Ilustrasi Risiko Mutu V3 (IAPI, 16-06-2025) · SMM 1 ¶57–60 |
| Prasyarat | PR-1..PR-7 arc SMM **Implemented** (master `e57694f`) |

---

## 1. Problem

Arc SMM 1 & SMM 2 (delapan PR, selesai 2026-08-13) menutup gerbang-gerbang yang bisa gagal:
27 tujuan mutu mandatori, mesin kesimpulan ¶54, cakupan pemantauan ¶38(c)/¶39(b), eligibilitas
penelaah SMM 2, ketentuan jaringan ¶48–52. Dua lubang tersisa, dan keduanya **terverifikasi
terhadap kode**, bukan diasumsikan.

### (a) Aset implementasi terbesar dari IAPI belum tersentuh

Toolkit Manajemen Mutu V3 memuat **41 dokumen ilustratif** (1.1 s.d. 9.7) — pernyataan kebijakan,
checklist, formulir, dan contoh surat. Matriks Ilustrasi Risiko Mutu V3 memetakan **tujuan mutu →
risiko mutu ilustratif → nomor dokumen Toolkit** sebagai responsnya. Contoh nyata dari Matriks,
komponen Tata Kelola & Kepemimpinan tujuan (a): risiko "tanggung jawab terkait mutu tidak jelas"
→ respons **3.2 Penugasan Tanggung Jawab**; risiko "kepemimpinan memprioritaskan performa
keuangan di atas etika" → respons **7.5 Penelaahan Kinerja Staf Profesional**, **3.1**, **1.2**.

Kolom ketiga Matriks secara harfiah berbunyi: *"Kolom ini menyediakan acuan ke dokumen Toolkit
Manajemen Mutu."* Artinya IAPI sudah menerbitkan peta tujuan-mutu → dokumen-respons yang siap
pakai. Asseris sudah memiliki sisi kirinya (`SMM1_OBJECTIVES`, 27 tujuan bertipe dengan id
stabil, `canon_smm_objectives.ts:157`) tetapi **nol** sisi kanannya: grep `migration/src` untuk
"Toolkit" → tidak ada satu pun rujukan dokumen 1.1–9.7.

Konsekuensinya bukan estetika. Seorang KAP yang memakai Asseris tidak dapat menjawab pertanyaan
inspektur P2PK yang paling wajar: *"Respons Anda terhadap tujuan mutu ini berbentuk dokumen apa,
dan di mana dokumen itu?"* Aplikasi tahu tujuan mutunya, tahu risikonya, tahu status
pemantauannya — dan tidak tahu satu pun **artefak** yang seharusnya menjadi bukti ¶57(c).

### (b) Mesin dokumentasi ¶57–60 sudah dibangun, lalu tidak dipasang ke apa pun

PR-7 menghasilkan `canon_smm_documentation.ts` yang lengkap dan diuji: `SMM_DOC_ELEMENTS`
(9 elemen ¶58(a)–(e) + ¶59), `smmDocCoverage()`, `RETENTION_DEFECT_LABEL`, `auditRetention()`.
Namun grep seluruh `migration/src`:

| Ekspor | Dikonsumsi oleh |
|---|---|
| `auditEqrDocumentation` / `EQR_DOC_DEFECT_LABEL` | `view_eqr.tsx:63,236` ✅ hidup |
| **`smmDocCoverage`** | **tidak ada view mana pun** — hanya `canon_smm_documentation.test.ts` |
| **`SMM_DOC_ELEMENTS`** | **tidak ada view mana pun** |
| **`auditRetention`** | **hanya `smm_documentation_seed.test.ts`** |
| **`QM_DOC_RETENTION`** (`data_part4.ts:240`, 5 tahun) | **tidak ada view mana pun** |

Separuh SMM 2 dari PR-7 terpasang; separuh SMM 1-nya adalah **kode mati**. Tidak ada satu layar
pun di Asseris yang menyatakan apakah dokumentasi sistem manajemen mutu firma lengkap menurut
¶58, dan keputusan Ari "retensi SMM = 5 tahun" tersimpan di data tanpa pernah terlihat pengguna.
Ini persis pola kegagalan yang arc ini dibentuk untuk memberantas — sesuatu dihitung, lalu
diabaikan — hanya saja kali ini bahkan tidak sampai ditampilkan.

### (c) Misatribusi ¶60 yang PR-7 nyatakan ditutup masih hidup di dua tempat

Header `canon_smm_documentation.ts:43-46` menyatakan cacat *"aplikasi menyebut 'retensi 10 tahun
(SMM 1)' — mengatribusikan angka kepada standar yang justru menyerahkan periodenya kepada KAP"*
sebagai CACAT YANG DITUTUP. Sapuannya tidak tuntas:

| Lokasi | Teks | Keadaan |
|---|---|---|
| `view_crypto.tsx:505` | "retensi 10 tahun (kebijakan KAP atas dokumentasi perikatan — bukan angka yang ditetapkan SMM 1)" | ✅ sudah benar |
| **`view_crypto.tsx:546`** | **"Retensi 10 tahun (SMM 1)."** | ❌ misatribusi tersisa |
| **`view_crypto.tsx:593`** | **"Retensi 10 tahun (SMM 1)."** | ❌ misatribusi tersisa |
| **`data_import.ts:50`** | **"Arsip kertas kerja & retensi 10 tahun sesuai SMM."** | ❌ misatribusi tersisa |

Ketiganya juga mencampur rezim: yang dibicarakan adalah retensi **kertas kerja perikatan /
audit log**, bukan dokumentasi **sistem manajemen mutu** — pemisahan yang Ari setujui eksplisit
di Q-5 PRD induk.

## 2. Objective

Membuat Asseris menjawab dua pertanyaan yang saat ini tidak bisa dijawabnya:

1. **"Respons terhadap tujuan mutu ini berbentuk dokumen apa, dan modul mana yang menampungnya?"**
   — dengan peta kanonik 41 dokumen Toolkit → 27 tujuan mutu → modul Asseris, di mana dokumen
   yang **tidak punya rumah** di aplikasi adalah celah yang terlihat, bukan baris yang hilang.
2. **"Apakah dokumentasi sistem manajemen mutu kami lengkap menurut ¶58, dan berapa periode
   retensinya menurut ¶60?"** — dengan memasang mesin yang sudah ada ke layar, dengan `present`
   diturunkan dari **artefak nyata di modul**, bukan dari daftar centang manual.

Mengapa objective ini benar: nilai Asseris bagi KAP adalah pertahanan saat inspeksi. Peta
Toolkit mengubah aplikasi dari *pelacak status* menjadi *penunjuk artefak* — dan ¶57(c) menuntut
dokumentasi yang **memberikan bukti**, bukan pernyataan tentang bukti.

**Yang secara sengaja BUKAN objective:** menerbitkan 41 dokumen kebijakan terisi. Lihat §5.

## 3. Success Criteria

| # | Kriteria | Cara diuji |
|---|---|---|
| SC-1 | 41 dokumen Toolkit (1.1–9.7) ada sebagai konstanta kanonik bertipe dengan nomor, judul, seksi, dan jenis (kebijakan · checklist · formulir · surat · panduan) | uji unit: hitungan per seksi 3·2·2·3·8·6·9·1·7 = 41 |
| SC-2 | Tiap dokumen Toolkit dipetakan ke ≥1 modul Asseris **atau** ditandai `no-home` dengan alasan; tidak ada dokumen tanpa keduanya | uji: himpunan `mapped ∪ noHome` = 41, irisan = ∅ |
| SC-3 | Tiap id modul yang dirujuk peta benar-benar ada di `MODULE_INDEX` | uji silang terhadap `icons.tsx` — mencegah peta membusuk saat modul di-rename |
| SC-4 | Peta tujuan-mutu → dokumen Toolkit memakai id `SMM1_OBJECTIVES` yang ada; id tak dikenal = uji merah | uji silang terhadap `canon_smm_objectives.ts` |
| SC-5 | Tujuan mutu **tanpa** dokumen respons Toolkit terlihat sebagai celah, bukan sel kosong senyap | uji: hapus satu entri peta ⇒ tujuan itu masuk daftar `withoutToolkitDoc` |
| SC-6 | `smmDocCoverage()` dirender di UI; `present` diturunkan dari keberadaan artefak modul, bukan dari toggle manual | uji turunan + tinjauan kode: tidak ada state centang manual yang mengisi `present` |
| SC-7 | Elemen ¶58 yang tak punya artefak ⇒ layar merah; tidak bisa "lengkap" | uji: kosongkan satu sumber artefak ⇒ `complete === false` |
| SC-8 | `auditRetention(QM_DOC_RETENTION)` dirender: 5 tahun, berlabel **kebijakan KAP**, bukan angka SMM 1 | uji bentuk + snapshot label |
| SC-9 | 0 kemunculan "retensi 10 tahun (SMM 1)" / "10 tahun sesuai SMM" di seluruh `migration/src` | grep-gate di uji (pola tripwire) |
| SC-10 | Peta ini **tidak** menyeed risiko mutu firma dari Matriks IAPI | tinjauan kode: tidak ada penulisan ke `SOQM_RISKS`; hanya saran baca-saja |
| SC-13..15 | Ditetapkan oleh keputusan Q-2 — lihat §11 | (di §11) |
| SC-11 | `npm run verify` hijau | root `npm run verify` |
| SC-12 | Tinjauan visual Ari atas tab dokumentasi baru | manual |

## 4. Scope

Bergantung pada keputusan Q-1 (§11). **Sesuai rekomendasi (Opsi B):**

**Frontend (`migration/src`)**
- **Baru — `canon_smm_toolkit.ts`** (murni, tanpa React/efek-samping):
  - `TOOLKIT_DOCS: readonly ToolkitDoc[]` — 41 dokumen: `{ no, section, title, kind, modules, noHomeReason? }`.
  - `TOOLKIT_BY_OBJECTIVE: ReadonlyMap<objectiveId, readonly string[]>` — peta dari Matriks IAPI.
  - `ILLUSTRATIVE_RISKS: readonly IllustrativeRisk[]` (Q-2) — risiko mutu ilustratif Matriks
    **dirumuskan ulang ringkas-fungsional**, `{ objectiveId, text, docNos[] }`, baca-saja.
  - `toolkitCoverage(objectives)` → `{ withDoc, withoutToolkitDoc, outOfMatrixScope }`.
  - `toolkitHomes()` → `{ mapped, noHome }`.
- **Baru — `canon_smm_toolkit.test.ts`** — SC-1..SC-5, termasuk uji silang ke `MODULE_INDEX`
  dan `SMM1_OBJECTIVES`.
- **Disentuh — `view_isqm.tsx` / `view_isqm_parts.tsx`**: tab kesembilan **"Dokumentasi SMM"**
  yang memuat tiga blok:
  1. **Kelengkapan ¶58/¶59** — `smmDocCoverage()` dipasang, `present` diturunkan dari artefak.
  2. **Retensi ¶60** — `auditRetention(QM_DOC_RETENTION)`, berlabel kebijakan KAP.
  3. **Peta Toolkit IAPI** — 41 dokumen, seksi, modul rumahnya (dapat diklik → `nav()`),
     dan daftar dokumen `no-home` sebagai celah terbuka.
- **Disentuh — `view_isqm_deep.tsx`**: pada panel tujuan mutu, chip dokumen Toolkit terkait
  (baca-saja; membuka modul rumahnya).
- **Disentuh — `view_crypto.tsx:546,593` & `data_import.ts:50`**: misatribusi ¶60 dicabut.

**Backend (`server/`)** — tidak ada. Peta ini adalah rujukan kanonik, bukan state perikatan;
tak ada jalur tulis baru, jadi tak ada yang perlu ditegakkan server.

**Dokumentasi**
- `docs/PRD-REGISTRY.md` + baris status PRD ini.
- Baris "Fase 5 · PR-8" di `docs/prd-smm1-smm2-adoption.md` ditautkan ke PRD ini.

## 5. Non-Scope

- **Generator dokumen Toolkit** — mencetak 41 dokumen kebijakan terisi data firma. Sudah
  dinyatakan Non-Scope di PRD induk §5 dan tetap demikian: itu produk tersendiri dengan
  masalah hak cipta, versioning, dan review hukumnya sendiri.
- **Menyeed risiko mutu dari Matriks IAPI.** Matriks melarangnya eksplisit (*"Anda tidak boleh
  memasukkan seluruh contoh risiko mutu ini tanpa mempertimbangkan apakah risiko mutu tersebut
  benar-benar relevan"*). Risiko ilustratif boleh **ditawarkan sebagai saran baca-saja**, tidak
  pernah ditulis ke `SOQM_RISKS`.
- **Menyalin teks Toolkit.** Yang disimpan adalah nomor, judul, dan jenis dokumen — metadata
  rujukan, bukan isi. Lihat R-2.
- **Mengubah retensi kertas kerja perikatan.** Rezim terpisah (SA 230 & peraturan akuntan
  publik), sesuai keputusan Q-5 PRD induk. Yang diperbaiki hanya **atribusinya**, bukan angkanya.
- **Membangun modul untuk dokumen `no-home`.** Celah dilaporkan; menutupnya adalah PR berikutnya
  dengan keputusan tersendiri.
- **`app/*`, `NeoSuite AMS.html`, `build/`** — referensi beku.

## 6. Constraints

- **Hak cipta (UU 28/2014).** Toolkit & Matriks dilindungi. Boleh: nomor dokumen, judul dokumen,
  rujukan paragraf, klasifikasi jenis. Tidak boleh: menyalin isi dokumen atau teks risiko
  ilustratif secara utuh ke kode/UI.
- **Toolkit & Matriks ditulis untuk KAP NON-JARINGAN.** Firma demo Asseris dimodelkan **berjaringan**
  (Q-2 PRD induk). Konsekuensi nyata: komponen ¶48–52 dan elemen dokumentasi ¶59 **tidak punya
  dokumen Toolkit** — itu bukan celah implementasi Asseris, itu batas asetnya, dan harus
  dilabeli demikian agar tidak terbaca sebagai kekurangan firma.
- **Matriks hanya mencakup 6 dari 8 komponen** — Proses Penilaian Risiko dan Pemantauan &
  Remediasi tidak punya baris tujuan-mutu di Matriks. Peta tujuan→dokumen karenanya akan
  **sengaja tidak lengkap**, dan ketidaklengkapan itu wajib dibedakan dari "belum dipetakan".
- **Sistem:** `master` selalu hijau (R-7); `npm run verify` cermin CI; ratchet `no-explicit-any`.
- **Skala tipografi & token warna MENGIKAT** (CLAUDE.md §5) — tabel 41 baris adalah godaan
  klasik untuk menyelundupkan ukuran font setengah langkah.

## 7. Existing Solutions — apa yang sudah ada

Diverifikasi terhadap kode pada master `e57694f`.

### 7.1 Yang SUDAH ADA (jangan dibangun ulang)

| Kemampuan | Lokasi | Catatan |
|---|---|---|
| 27 tujuan mutu mandatori bertipe, id stabil | `canon_smm_objectives.ts:157` | sisi kiri peta sudah siap |
| Cakupan tujuan + waiver ¶17 berjustifikasi | `objectiveCoverage()`, `SMM_OBJECTIVE_WAIVERS` | |
| Mesin kelengkapan dokumentasi ¶58/¶59 | `smmDocCoverage()` | **belum dipasang ke UI** |
| Mesin retensi ¶60 | `auditRetention()` + `QM_DOC_RETENTION` (5 th) | **belum dipasang ke UI** |
| Dokumentasi EQR ¶30(a)–(e) | `auditEqrDocumentation()` → `view_eqr.tsx:63` | ✅ hidup |
| Registri modul & indeks | `MODULE_INDEX`, `MODULES` (`icons.tsx`) | target uji silang SC-3 |
| Kelas retensi arsip perikatan | `data_records.ts:49`, modul `records` | rezim terpisah — jangan dicampur |

### 7.2 Yang TIDAK CUKUP — cacat terverifikasi

- **T-1 · Peta Toolkit tidak ada sama sekali.** 0 rujukan dokumen 1.1–9.7 di `migration/src`.
- **T-2 · `smmDocCoverage` / `SMM_DOC_ELEMENTS` / `auditRetention` / `QM_DOC_RETENTION` adalah
  kode mati** — tak satu pun dikonsumsi view. Mesin ada, layar tidak.
- **T-3 · Misatribusi ¶60 tersisa** di `view_crypto.tsx:546`, `:593`, `data_import.ts:50`.
- **T-4 · Dokumen Toolkit tanpa rumah di aplikasi** (probe awal, akan dipastikan saat
  implementasi): **5.7 Formulir Klien Keluar** & **5.8 Surat Klien Keluar** — grep "Klien Keluar"
  nihil; **7.8 Formulir Permintaan Akuisisi Teknologi** — grep "Akuisisi Teknologi" nihil.
  Ini adalah temuan produk, bukan sekadar temuan peta.

### 7.3 Struktur aset

**Toolkit V3 — 41 dokumen, 9 seksi:**

| Seksi | Dok | Kandidat modul rumah |
|---|---|---|
| 1 Dokumentasi | 1.1 · 1.2 · 1.3 | `soqm` · `governance` · `orgchart` |
| 2 Proses Penilaian Risiko | 2.1 · 2.2 | `soqm` (register risiko mutu) |
| 3 Tata Kelola & Kepemimpinan | 3.1 · 3.2 | `governance` (`QM_ROLES`) |
| 4 Ketentuan Etika | 4.1 · 4.2 · 4.3 | `ethics` · `independence` · `teamindep` |
| 5 Penerimaan & Keberlanjutan | 5.1–5.8 | `onboarding` · `continuance` · `crm` · **5.7/5.8 no-home** |
| 6 Pelaksanaan Perikatan | 6.1–6.6 | `programme` · `expert` · `eqr` · `reviewnotes` |
| 7 Sumber Daya | 7.1–7.9 | `hcm` · `recruitment` · `learning` · `performance` · `procurement` · **7.8 no-home** |
| 8 Informasi & Komunikasi | 8.1 | `soqm` tab Informasi & Komunikasi |
| 9 Pemantauan & Remediasi | 9.1–9.7 | `soqm` tab Pemantauan · Remediasi · Keluhan · Evaluasi Tahunan |

**Matriks V3** — kolom `Tujuan Mutu | Ilustrasi Risiko Mutu | Ilustrasi Respons (→ nomor dok
Toolkit)`, mencakup 6 komponen. Inilah sumber `TOOLKIT_BY_OBJECTIVE`.

## 8. Proposed Approach

**Prinsip pemandu (diwarisi dari arc induk):** setiap kemampuan harus **bisa gagal**. Peta yang
hanya bisa menampilkan baris yang ada adalah brosur. Peta yang menyatakan *dokumen ini tidak
punya rumah di aplikasi Anda* dan *tujuan mutu ini tidak punya dokumen respons* adalah alat.

**Arsitektur** — pola yang sudah terbukti tujuh kali di arc ini: satu modul kanon murni + uji
unit, view menjadi cermin.

```
canon_smm_toolkit.ts
  TOOLKIT_DOCS[41]            no · section · title · kind · modules[] · noHomeReason?
  TOOLKIT_BY_OBJECTIVE        objectiveId → docNo[]   (dari Matriks; 6 komponen)
  toolkitHomes()              → { mapped, noHome }        ← celah produk
  toolkitCoverage(objectives) → { withDoc, withoutToolkitDoc, outOfMatrixScope }
                                                          ← bedakan "Matriks tak mencakup"
                                                            dari "belum dipetakan"
```

**Sisi ¶57–60** tidak menambah kanon apa pun — hanya memasang yang sudah ada. `present` untuk
`smmDocCoverage()` **diturunkan**, satu elemen satu sumber:

| Elemen ¶58 | Diturunkan dari |
|---|---|
| (a) pemegang tanggung jawab | `QM_ROLES` terisi (¶20(a) & ¶20(b) keduanya ada) |
| (b) tujuan & risiko mutu | `objectiveCoverage()` — tujuan tercakup atau di-waive sah |
| (c) respons | risiko mutu punya respons terdeskripsi |
| (d)(i) bukti pemantauan | `QM_INSPECTIONS` yang sudah dilaksanakan |
| (d)(ii) temuan & akar penyebab | `QM_INSP_FINDINGS` + RCA 5-Why terisi |
| (d)(iii) tindakan remedial | defisiensi punya remediasi terevaluasi |
| (d)(iv) komunikasi | aktivitas komunikasi pemantauan tercatat |
| (e) basis kesimpulan ¶54 | `canon_smm_evaluation` menghasilkan basis |
| ¶59 jaringan | `canon_smm_network` — hasil pemantauan jaringan tahun berjalan |

Inilah yang membedakan SC-6 dari daftar centang: seorang pengguna tidak dapat membuat layar
menjadi hijau dengan mengklik; ia harus mengisi artefaknya.

**Mengapa ini dibanding alternatif** (rinci di Q-1 §11): Opsi A (dokumen markdown) tidak dapat
gagal dan akan basi diam-diam saat modul di-rename. Opsi C (generator dokumen) sudah Non-Scope
di PRD induk dan membawa risiko hak cipta yang belum dinilai.

## 9. Risks

| # | Mode kegagalan | Mitigasi |
|---|---|---|
| R-1 | **Peta membusuk senyap** saat modul di-rename/dihapus — persis nasib rujukan paragraf yang salah di 7 dari 8 komponen (D-3 PRD induk). | SC-3: uji silang wajib ke `MODULE_INDEX`. Modul hilang = uji merah, bukan chip mati. |
| R-2 ⚠ | **Hak cipta (UU 28/2014) — RISIKO UTAMA PR-8a setelah keputusan Q-2.** Risiko ilustratif Matriks kini ditampilkan, sehingga godaan salin-tempel nyata dan per-entri. | Dokumen: hanya nomor/judul/jenis. Risiko ilustratif: **wajib dirumuskan ulang ringkas-fungsional** dengan atribusi "saran ilustratif IAPI" — pola yang sudah terbukti di `canon_smm_objectives.ts` untuk teks standar. Checklist review PR memeriksa **per entri**, bukan menerima pernyataan umum di deskripsi PR. |
| R-2b | **Saran ilustratif merembes menjadi risiko firma** — pengguna (atau PR berikutnya) menambahkan tombol "adopsi semua", persis yang dilarang Matriks. | Sekat struktural, bukan tipografis: `canon_smm_toolkit.ts` tidak mengekspor mutator apa pun ke `SOQM_RISKS` (SC-14). Adopsi, bila kelak diinginkan, harus per-item & sadar — keputusan terpisah. |
| R-3 | **Peta terbaca sebagai proforma** — pengguna menganggap 41 dokumen wajib diadakan. | Label eksplisit: Toolkit **ilustratif**, bukan proforma; kutip batasan IAPI di kepala tab. |
| R-4 | **Firma berjaringan vs Toolkit non-jaringan** — ¶48–52 & ¶59 tanpa dokumen Toolkit terbaca sebagai celah firma. | Status ketiga `outOfMatrixScope` / `outOfToolkitScope`, dibedakan visual dari `no-home`. Ini yang membuat R-4 bukan sekadar catatan kaki. |
| R-5 | **`present` diam-diam menjadi daftar centang** saat implementasi menemui elemen yang sulit diturunkan (¶58(d)(iv) komunikasi paling rawan). | Bila suatu elemen tak dapat diturunkan jujur, ia dilaporkan sebagai **"belum dapat dibuktikan otomatis"** — bukan diberi toggle. Toggle = menghidupkan kembali cacat yang arc ini berantas. |
| R-6 | Tabel 41 baris menyelundupkan ukuran font di luar 8 skala. | Checklist review PR: hanya `--fs-*`; tak ada `fontSize` inline setengah langkah. |
| R-7 | Ratchet `:any` — sel JSX tabel besar disalin ke dua cabang, menduplikasi `as any`, meng-un-suppress seluruh berkas (gotcha berulang, 3× di arc ini). | `npm run lint:any-baseline` setelah PR; hindari duplikasi sel JSX. |
| R-8 | Perubahan `AMS_CANON` menuntut pembaruan snapshot `canon_regression.test.ts`. | Masuk checklist bila menyentuh data kanon. |

## 10. Implementation Plan

Dua PR berurutan; masing-masing hijau di `npm run verify` sebelum yang berikut. Dipisah karena
kegagalannya independen: PR-8b bernilai penuh bahkan bila PR-8a ditunda, dan sebaliknya.

**PR-8a · `canon_smm_toolkit.ts` + tab "Dokumentasi SMM" (bagian peta)**
- 41 dokumen bertipe + peta tujuan-mutu dari Matriks + uji silang `MODULE_INDEX`/`SMM1_OBJECTIVES`.
- **Risiko mutu ilustratif dirumuskan ulang** (Q-2) — baca-saja, tanpa jalur tulis ke
  `SOQM_RISKS`; komponen di luar cakupan Matriks dilabeli `outOfMatrixScope`.
- Tab kesembilan pada `soqm`, blok "Peta Toolkit IAPI": dokumen → modul rumah (dapat diklik),
  daftar `no-home`, daftar `outOfToolkitScope`.
- Chip dokumen terkait + saran risiko ilustratif pada panel tujuan mutu (`view_isqm_deep.tsx`).
- Menutup T-1, T-4. Kriteria: SC-1..SC-5, SC-10, SC-13..SC-15.
- **Catatan beban:** Q-2 menambah perumusan ulang per-entri; bila volume risiko ilustratif
  terbukti besar saat implementasi, pecah menjadi PR-8a-1 (peta dokumen) dan PR-8a-2 (saran
  risiko) agar tiap PR tetap dapat ditinjau — jangan gabungkan menjadi satu diff raksasa.

**PR-8b · Memasang mesin dokumentasi ¶57–60 + mencabut misatribusi**
- `smmDocCoverage()` & `auditRetention()` dirender pada tab yang sama; `present` diturunkan
  dari sembilan sumber artefak (§8).
- `view_crypto.tsx:546`, `:593`, `data_import.ts:50` diperbaiki; tripwire grep ditambahkan
  agar frasa itu tidak bisa kembali (SC-9).
- Menutup T-2, T-3.

Setiap PR: `npm run verify` hijau · `docs/PRD-REGISTRY.md` diperbarui · `lint:any-baseline`
disinkronkan bila perlu.

## 11. Open Questions

### TERJAWAB (Ari, 2026-08-13)

**Q-1 · Bentuk deliverable → Opsi B (kanon + panel).** ✅ Peta menjadi `canon_smm_toolkit.ts`
sebagai SSOT dengan tab "Dokumentasi SMM" di `soqm`, plus memasang mesin ¶57–60 yang menganggur.
Dua PR (8a, 8b) sesuai §10. Opsi C (generator dokumen) tetap Non-Scope dan pantas mendapat PRD
sendiri bila kelak diinginkan.

**Q-2 · Risiko mutu ilustratif Matriks → ditampilkan, dirumuskan ulang fungsional.** ✅
Risiko ilustratif dari Matriks IAPI **ditampilkan sebagai saran baca-saja** pada panel tujuan
mutu, **tidak pernah** ditulis ke `SOQM_RISKS` (SC-10 tetap berlaku). Konsekuensi yang harus
ditangani PR-8a:

- **Perumusan ulang wajib.** Teks Matriks tidak disalin. Tiap risiko ilustratif ditulis ulang
  ringkas-fungsional dalam bahasa Asseris, dengan atribusi sumber ("saran ilustratif IAPI") dan
  rujukan tujuan mutu. Ini pola yang sama dengan `canon_smm_objectives.ts`, yang sudah terbukti
  bekerja untuk teks standar berhak cipta.
- **R-2 naik dari risiko sekunder menjadi risiko utama PR-8a.** Checklist review PR wajib memuat
  pemeriksaan salin-tempel per entri, bukan sekadar pernyataan di deskripsi PR.
- **Sekat "saran ≠ risiko firma" harus struktural, bukan tipografis.** Saran ilustratif hidup di
  `canon_smm_toolkit.ts` dan tidak punya jalur tulis apa pun ke register risiko mutu. Bila kelak
  diinginkan tombol "adopsi sebagai risiko firma", itu keputusan terpisah — Matriks melarang
  adopsi massal tanpa pertimbangan relevansi, jadi adopsi apa pun harus per-item dan sadar.
- **Cakupan hanya 6 komponen.** Matriks tidak memuat baris untuk Proses Penilaian Risiko dan
  Pemantauan & Remediasi; kedua komponen itu akan tampil tanpa saran, dan itu wajib dilabeli
  `outOfMatrixScope`, bukan dibiarkan kosong.

Kriteria sukses tambahan yang mengikat karena keputusan ini:

| # | Kriteria | Cara diuji |
|---|---|---|
| SC-13 | Tiap risiko ilustratif tertaut ke id tujuan mutu yang ada, dan tidak ada entri tanpa atribusi sumber | uji bentuk + uji silang `SMM1_OBJECTIVES` |
| SC-14 | Tidak ada jalur tulis dari saran ilustratif ke `SOQM_RISKS` | tinjauan kode + uji: modul kanon tidak mengekspor mutator |
| SC-15 | Komponen di luar cakupan Matriks (Proses Penilaian Risiko · Pemantauan & Remediasi) dilabeli `outOfMatrixScope`, bukan tampil kosong | uji: kedua komponen menghasilkan status ketiga, bukan `withoutToolkitDoc` |

### Q-1 (arsip pertimbangan) · Bentuk deliverable peta

Inilah "ruang lingkup yang belum diputuskan" dari PRD induk.

| Opsi | Isi | Biaya | Bisa gagal? |
|---|---|---|---|
| **A · Dokumen** | `docs/smm-toolkit-map.md` — tabel statis 41 baris | ~0,3 PR | ❌ Tidak. Akan basi senyap saat modul berubah; tidak terlihat pengguna aplikasi. |
| **B · Kanon + panel baca-saja** ⭐ | `canon_smm_toolkit.ts` + tab "Dokumentasi SMM" di `soqm` + wiring ¶57–60 | 2 PR (8a, 8b) | ✅ Ya. Uji silang `MODULE_INDEX`; `no-home` & elemen ¶58 tanpa artefak tampil merah. |
| **C · B + generator dokumen** | Mencetak 41 dokumen kebijakan terisi data firma | ≥5 PR | ✅ tapi membawa risiko hak cipta & review hukum yang belum dinilai |

**Rekomendasi: B.** Alasan, bukan preferensi: (i) Opsi A melanggar prinsip pemandu arc — sebuah
peta yang tidak dapat gagal adalah persis jenis artefak yang melahirkan D-3 (rujukan paragraf
salah pada 7 dari 8 komponen, tak seorang pun tahu selama berbulan-bulan); (ii) Opsi C sudah
dinyatakan Non-Scope di PRD induk §5 dan pantas mendapat PRD sendiri, bukan diselundupkan
sebagai bagian PR-8; (iii) B memberi nilai inspeksi penuh — menunjuk artefak dan celah — dengan
biaya dua PR.

### MASIH TERBUKA (tidak memblokir)

### Q-3 · Elemen ¶58 yang tak dapat diturunkan jujur — **diputuskan sendiri, koreksi bila keliru**

¶58(d)(iv) "komunikasi mengenai pemantauan & remediasi" adalah yang paling rawan tidak punya
artefak terstruktur di aplikasi. Asumsi: elemen semacam itu dilaporkan **"belum dapat dibuktikan
otomatis"** dengan warna netral yang berbeda dari merah "tidak ada" — dan **tidak** diberi
toggle manual. Alasan: memberi toggle akan mengubah ¶57(c) "memberikan bukti" menjadi pernyataan
tentang bukti, yaitu cacat yang arc ini dibentuk untuk memberantas.

### Q-4 · Dokumen `no-home` (5.7, 5.8, 7.8) — **tidak memblokir**

Dilaporkan sebagai celah pada PR-8a. Apakah lalu dibangun modulnya (formulir & surat klien
keluar; permintaan akuisisi teknologi) adalah keputusan produk tersendiri — kandidat kuat untuk
PR berikutnya karena 5.7/5.8 menyentuh ¶30 SMM 1 (penerimaan & keberlanjutan) yang sudah punya
modul `continuance`.

---
**Sign-off:** ditandai dengan balasan **"Proceed."**
