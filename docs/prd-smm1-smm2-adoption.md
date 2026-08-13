# PRD — Adopsi Standar Manajemen Mutu (SMM 1 & SMM 2) IAPI

> Wajib diisi sebelum implementasi apa pun. Implementasi TIDAK dimulai sebelum sign-off ("Proceed.").

| Field | Isi |
|---|---|
| Tanggal | 2026-08-13 |
| Pemilik | Ari Widodo |
| Status | Implemented — SELESAI 2026-08-13, kedelapan PR merged (master 3c57a39) |
| Engagement ID terkait | — (lintas-firma; modul `soqm`, `eqr`, `governance`, `independence`, `pppk`) |
| Sumber normatif | SMM 1 (IAPI, disahkan 18-09-2024) · SMM 2 (IAPI, disahkan 18-09-2024) · Toolkit Manajemen Mutu V3 (IAPI, 05-06-2025) · Matriks Ilustrasi Risiko Mutu V3 (IAPI, 16-06-2025) |
| Tanggal efektif standar | 31 Desember 2025 (penerapan dini diperkenankan) |

---

## 1. Problem

Asseris sudah punya modul mutu firma yang matang — `view_isqm.tsx` (register risiko, pemantauan,
inspeksi, defisiensi & remediasi, keluhan, evaluasi tahunan), `view_eqr.tsx` (gerbang EQR),
`canon_eqr_gate.ts` (gerbang gagal-tertutup), `canon_firm_attest.ts` (atestasi berjenjang),
`view_governance.tsx` (komponen & peran). Ini bukan lahan kosong.

Masalahnya bukan ketiadaan modul. Masalahnya ada tiga lapis, dan ketiganya membuat aplikasi
**menyatakan kepatuhan yang tidak pernah diuji**:

**(a) Aplikasi menamai standar yang salah untuk yurisdiksi ini.** Pencarian seluruh
`migration/src` + `server/src`: **0 kemunculan** "SMM 1", "SMM 2", atau "Standar Manajemen Mutu".
Yang ada: 136× "ISQM 1", 34× "ISQM 2", 24× "SPM 1", 43× "SPM". ISQM adalah standar IAASB;
SPM 1 adalah standar IAPI yang **digantikan**. Standar yang mengikat KAP Indonesia sejak
31-12-2025 adalah SMM 1 & SMM 2. Modul mutu firma saat ini berlabel standar yang tidak berlaku.

**(b) Tujuan mutu mandatori tidak pernah dienumerasi.** SMM 1 ¶24 mewajibkan KAP menetapkan
tujuan mutu **yang ditentukan oleh standar** — ¶28–¶33 mencantumkan **27 tujuan mandatori**
(¶28: 5 · ¶29: 2 · ¶30: 2 · ¶31: 6 · ¶32: 8 · ¶33: 4). Di aplikasi, tujuan mutu adalah field
teks bebas pada 6 baris `SOQM_RISKS` (`data_part2.ts:158`), dan `QM_COMPONENTS[].obj`
(`data_part4.ts:148`) adalah **integer dekoratif** (4,2,5,3,6,4,2,3) yang tidak tertaut ke daftar
tujuan mana pun. Panel "Tujuan Mutu" merender "4 tujuan" untuk Tata Kelola padahal tidak ada
empat tujuan di mana pun dalam sistem. Konsekuensinya: **tidak ada gerbang yang bisa gagal**
ketika 21 dari 27 tujuan mandatori tidak pernah dipertimbangkan.

**(c) Beberapa gerbang mutu dihitung, ditampilkan, lalu diabaikan.** Pola yang sama yang
ditemukan pada arc P2PK berulang di sini — rinci di §7.

Bagi KAP, ini bukan cacat kosmetik. SMM 1 ¶57–58 mewajibkan dokumentasi yang **memberikan bukti**
atas perancangan, implementasi, dan pengoperasian respons — dan ¶53–54 mewajibkan kesimpulan
tahunan atas nama KAP. Layar yang menyatakan "Cakupan Komponen 100%" di atas tujuan mutu yang
tak pernah ditetapkan adalah bukti yang menyesatkan, bukan bukti kepatuhan.

## 2. Objective

Membuat Asseris **menegakkan** SMM 1 & SMM 2 sebagai gerbang yang dapat gagal, bukan
menampilkannya sebagai narasi. Tiga outcome:

1. **Nomenklatur benar** — SMM 1/SMM 2 sebagai standar mengikat; SPM 1 sebagai pendahulu yang
   digantikan; ISQM sebagai rujukan asal (IAASB) bila perlu disebut.
2. **27 tujuan mutu mandatori menjadi SSOT yang tidak bisa hilang** — tiap tujuan wajib punya
   risiko & respons, atau ditandai tidak-relevan **dengan justifikasi** (dibolehkan ¶17), dan
   ketiadaan keduanya adalah defisiensi rancangan yang terlihat, bukan sel kosong yang senyap.
3. **Gerbang SMM 2 mengikat penerbitan opini melalui eligibilitas penelaah, bukan hanya
   checklist** — jeda 2 tahun (¶19), kompetensi & wewenang (¶18(a)), objektivitas (¶18(b)),
   penurunan eligibilitas (¶22–23), dan "penelaahan tidak dapat diselesaikan" (¶26).

Mengapa ini objective yang benar: nilai Asseris bagi KAP adalah **pertahanan saat inspeksi
P2PK/PPPK**. Modul yang tak bisa gagal tidak memberi pertahanan apa pun — ia justru menjadi
bukti pemberat bahwa firma mengklaim kepatuhan tanpa dasar.

## 3. Success Criteria

Terukur, dapat difalsifikasi:

| # | Kriteria | Cara diuji |
|---|---|---|
| SC-1 | 0 kemunculan "ISQM 1"/"ISQM 2"/"SPM 1" sebagai **standar mengikat** di UI; SMM 1/SMM 2 dipakai | grep + uji snapshot label |
| SC-2 | 27 tujuan mutu mandatori ¶28–33 ada sebagai konstanta kanonik bertipe, lengkap dengan rujukan paragraf | uji unit `canon_smm_objectives.test.ts` — hitungan per paragraf |
| SC-3 | Tujuan mandatori tanpa risiko **dan** tanpa penandaan tidak-relevan berjustifikasi ⇒ modul menampilkan defisiensi rancangan; tidak bisa "100%" | uji: hapus satu risiko ⇒ cakupan turun & flag muncul |
| SC-4 | Rujukan paragraf tiap komponen benar (8/8) | uji tabel terhadap konstanta paragraf SMM 1 |
| SC-5 | Defisiensi **pervasif** memaksa kesimpulan ¶54(c); signifikan-tak-pervasif memaksa ¶54(b); pervasivitas diturunkan dari kelima indikator A192 | uji tabel-keputusan 3 kesimpulan × 5 indikator |
| SC-5b | Carve-out A191 berlaku: defisiensi signifikan/pervasif yang **sudah diremediasi & dampaknya dikoreksi** pada tanggal evaluasi tidak menurunkan kesimpulan, tetapi tetap tercatat sebagai basis (¶58(e)) | uji: tandai remediasi selesai ⇒ kesimpulan naik, basis tetap memuat defisiensi |
| SC-5c | Ketentuan jaringan ¶48–52 ditangani: pemahaman ketentuan/jasa jaringan, hasil pemantauan jaringan tahunan (¶51(b)), defisiensi jaringan dikomunikasikan (¶52) | uji bentuk + gerbang "belum ada hasil pemantauan jaringan tahun berjalan" |
| SC-6 | Cakupan inspeksi ¶38(c) **dihitung** dari rekan perikatan aktif; rekan tanpa inspeksi dalam siklus ⇒ gerbang gagal | uji: seed saat ini harus GAGAL (Rudi Gunawan nihil inspeksi) |
| SC-7 | ¶39(b) ditegakkan: anggota tim perikatan / penelaah mutu perikatan atas suatu perikatan tidak dapat menjadi inspektur perikatan itu | uji penolakan |
| SC-8 | EQR tidak dapat ditutup bila eligibilitas penelaah tidak terpenuhi (¶18–20) — eligibilitas masuk kondisi `canClear` | uji: eligibilitas false ⇒ tombol tutup terkunci |
| SC-9 | Jeda 2 tahun ¶19 **diturunkan** dari riwayat peran, bukan boolean seed | uji: penelaah = rekan perikatan tahun lalu ⇒ tidak eligible |
| SC-10 | Dokumentasi EQR memuat kelima butir ¶30(a)–(e) | uji bentuk dokumen |
| SC-11 | `npm run verify` hijau (gerbang CI identik) | root `npm run verify` |
| SC-12 | Tinjauan visual Ari atas modul `soqm` & `eqr` — **lunas** | manual (utang dari arc sebelumnya) |

## 4. Scope

**Frontend (`migration/src`)**
- Modul kanonik baru: `canon_smm_objectives.ts` (27 tujuan mandatori + peta komponen + rujukan
  paragraf), `canon_smm_evaluation.ts` (mesin ¶54 tiga-kesimpulan), `canon_smm_monitoring.ts`
  (cakupan ¶38(c) + larangan ¶39(b)), `canon_eqr_eligibility.ts` (¶18–23 SMM 2).
- Modul yang disentuh: `view_isqm.tsx`, `view_isqm_deep.tsx`, `view_isqm_parts.tsx`,
  `view_eqr.tsx`, `view_governance.tsx`, `data_part2.ts`, `data_part4.ts`.
- Nomenklatur SMM di seluruh UI + `icons.tsx` (`RELATED_SA`) bila menyebut standar.

**Backend (`server/`)**
- Penegakan sisi-server untuk penutupan gerbang EQR (eligibilitas), sejalan pola
  `guardSignoffWrite` — UI hanya mencerminkan, server otoritatif.

**Ketentuan jaringan & jasa jaringan (¶48–52)** — masuk scope per keputusan Q-2 (firma demo
dimodelkan sebagai **bagian dari jaringan**, konsisten dengan `QM_PROVIDERS` yang sudah
mencantumkan AGN-Asia).

**Dokumentasi**
- `docs/PRD-REGISTRY.md`, baris status PRD ini.
- Peta 40+ dokumen ilustratif Toolkit IAPI (1.1–9.7) → modul Asseris (PR-6).

## 5. Non-Scope

- **Mengubah metodologi audit perikatan (SA-series)** — SMM adalah lapisan firma, bukan perikatan.
  SA 220 disentuh hanya di titik temunya dengan SMM 2.
- **Menulis ulang / menghapus heatmap L×D** — dipertahankan sebagai alat bantu prioritas
  manajerial (keputusan Q-1(c)); yang diperbaiki hanya **labelnya**, agar tidak mengklaim
  diri sebagai ketentuan SMM.
- **Generator dokumen Toolkit otomatis** (mencetak 40 dokumen kebijakan) — peluang produk
  terpisah, bukan bagian arc ini.
- **`app/*`, `NeoSuite AMS.html`, `build/`** — referensi beku.

## 6. Constraints

- **Regulasi:** SMM 1 & SMM 2 efektif 31-12-2025. Toolkit & Matriks IAPI adalah *ilustratif*,
  bukan proforma — aplikasi tidak boleh memaksakan risiko ilustratif sebagai risiko firma
  (Matriks ¶Pendahuluan: "Anda tidak boleh memasukkan seluruh contoh risiko mutu ini tanpa
  mempertimbangkan apakah risiko mutu tersebut benar-benar relevan").
- **Hak cipta:** SMM 1 & SMM 2 dilindungi UU 28/2014. Aplikasi boleh merujuk nomor paragraf dan
  meringkas tujuan mutu secara fungsional; **tidak boleh** menyalin teks standar secara utuh ke
  dalam kode/UI. Perumusan tujuan mutu dalam `canon_smm_objectives.ts` ditulis ulang secara
  ringkas-fungsional dengan rujukan paragraf.
- **Sistem:** `master` selalu hijau (R-7); `npm run verify` adalah cermin CI. Ratchet
  `no-explicit-any` — `:any` baru = lint merah.
- **Skalabilitas:** ¶17 & Toolkit mengakui praktisi tunggal / KAP kecil. Gerbang tidak boleh
  memaksa struktur yang tak relevan (mis. penelaah mutu perikatan internal pada praktisi tunggal
  — SMM 2 ¶A4 membolehkan penelaah dari luar KAP).
- **Orang:** satu pengembang (AI) + tinjauan Ari. Utang tinjauan visual dari arc P2PK belum lunas.

## 7. Existing Solutions — apa yang sudah ada, dan mengapa belum cukup

Semua klaim di bawah diverifikasi terhadap kode, bukan diasumsikan.

### 7.1 Yang SUDAH ADA dan berfungsi (jangan dibangun ulang)

| Kemampuan | Lokasi | Catatan |
|---|---|---|
| Register risiko mutu + heatmap + jalur tulis | `view_isqm.tsx`, `view_isqm_deep.tsx` | editable sejak F1/PR-5 |
| Defisiensi, akar masalah 5-Why, remediasi | `view_isqm.tsx:279` `RemediationTab` | tertaut live ke Capacity Planning |
| Inspeksi perikatan + temuan + severitas | `data_part4.ts` `QM_INSPECTIONS`/`QM_INSP_FINDINGS` | |
| Register keluhan & tuduhan (¶34(c)) | `view_isqm.tsx:244` | jalur tulis nyata |
| Evaluasi tahunan ¶53 + atestasi berjenjang | `SoqmAnnualEval` + `canon_firm_attest.ts` | kualitas tinggi — tanpa fallback ke seed, atestasi bisa gugur |
| Gerbang EQR gagal-tertutup | `canon_eqr_gate.ts` | PIE tanpa baris EQR = TIDAK lolos |
| Konfirmasi independensi tahunan (¶34(b)) | `view_independence.tsx` | |
| Peran & tanggung jawab ¶20 | `QM_ROLES` (`data_part4.ts`) | 4 peran terpetakan |
| Rotasi AP & cooling-off (data) | `data_part4.ts`, `view_people.tsx` | **data ada, belum dipakai EQR** |

### 7.2 Yang TIDAK CUKUP — cacat terverifikasi

**D-1 · Nomenklatur standar salah.**
0× "SMM"; 136× "ISQM 1"; 24× "SPM 1". Modul mutu firma berlabel standar yang tidak mengikat
KAP Indonesia.

**D-2 · 27 tujuan mutu mandatori tak pernah dienumerasi.**
`SOQM_RISKS` = 6 baris teks bebas. `QM_COMPONENTS[].obj` = integer dekoratif. Tidak ada gerbang
yang bisa gagal bila tujuan mandatori tak punya respons. Fallback UI di
`view_isqm_deep.tsx:167` justru **menormalkan** ketiadaan: *"Tidak ada risiko mutu spesifik
terdaftar — tujuan komponen ini ditangani lewat kontrol entitas."* — kalimat yang mengubah
lubang menjadi keterangan.

**D-3 · Rujukan paragraf salah pada 7 dari 8 komponen** (`data_part4.ts:148`):

| Komponen | Tertulis | SMM 1 yang benar |
|---|---|---|
| C1 Tata Kelola & Kepemimpinan | ¶28–30 | **¶28** |
| C2 Proses Penilaian Risiko | ¶25–27 | **¶23–27** |
| C3 Ketentuan Etika | ¶31–32 | **¶29** |
| C4 Penerimaan & Keberlanjutan | ¶33–34 | **¶30** |
| C5 Pelaksanaan Perikatan | ¶35–36 | **¶31** |
| C6 Sumber Daya | ¶32 | ¶32 ✓ |
| C7 Informasi & Komunikasi | ¶37–38 | **¶33** |
| C8 Pemantauan & Remediasi | ¶38–47 | **¶35–47** |

Juga: register keluhan dilabeli "ISQM 1 ¶A56" (`view_isqm.tsx:246`) — ketentuannya **¶34(c)**;
heatmap dilabeli "¶26–¶27" — identifikasi & penilaian risiko adalah **¶25**.

**D-4 · Pervasivitas ¶54(c) dihitung, ditampilkan, lalu diabaikan.**
`view_isqm_deep.tsx` menghitung `defsPervasive` dan menampilkannya sebagai Faktor Keputusan ¶54,
tetapi logika kesimpulan hanya membaca `defsHighOpen || inspBad || cmpInvest.length > 1`.
Akibatnya defisiensi pervasif **tidak pernah** menghasilkan kesimpulan ¶54(c). Lebih buruk:
`defsPervasive` di-hardcode ke ID seed — `(r.id === 'QR-02') || (r.id === 'QR-04')` — sehingga
risiko baru tidak akan pernah dinilai pervasif.

**D-5 · ¶38(c) tidak dihitung.** "≥1 perikatan / partner" hanyalah string di
`QM_MON_ACTIVITIES`. Pada seed saat ini, **Rudi Gunawan** adalah rekan perikatan (EQR-063 /
ENG-2025-063) namun tidak muncul sebagai partner pada satu pun baris `QM_INSPECTIONS` — seed
melanggar ¶38(c) sementara UI menyatakan cakupan terpenuhi.

**D-6 · ¶39(b) tidak ditegakkan.** Tidak ada aturan yang melarang anggota tim perikatan atau
penelaah mutu perikatan suatu perikatan menginspeksi perikatan itu.

**D-7 · Eligibilitas penelaah mutu perikatan (SMM 2 ¶18–20) dekoratif dan tidak mengikat.**
- `view_eqr.tsx:32` — `canClear = allChecked && openFindings === 0 && !r.cleared`.
  **Eligibilitas tidak ikut sama sekali.** Penelaah yang tidak eligible tetap dapat menutup gerbang.
- `coolingOk` / `compOk` / `objOk` adalah boolean yang **ditulis tangan di seed**
  (`data_part4.ts:207`), bukan turunan.
- Blok eligibilitas hanya dirender bila `meta.coolingOff || meta.competence`
  (`view_eqr.tsx:70`) — EQR tanpa meta **tidak menampilkan apa pun** dan tetap dapat ditutup.
- ¶19 jeda **2 tahun** setelah menjabat rekan perikatan: tidak diturunkan, padahal data tenure
  & cooling-off AP sudah ada di `data_part4.ts`/`view_people.tsx`.

**D-8 · SMM 2 yang belum ada sama sekali** (grep nihil):
| Ketentuan | Isi |
|---|---|
| ¶20 | Kriteria eligibilitas **individu yang membantu** penelaah |
| ¶21(b) | Arahan, supervisi & penelaahan atas pekerjaan pembantu |
| ¶22–23 | Penurunan eligibilitas ⇒ tolak penunjukan / hentikan penelaahan + penunjukan pengganti |
| ¶26 | Pemberitahuan bahwa **penelaahan tidak dapat diselesaikan** |
| ¶30(a) | Nama penelaah **dan individu yang membantu** |
| ¶30(b) | **Identifikasi dokumentasi perikatan yang ditelaah** |
| ¶30(c)(d) | Dasar penentuan ¶27 & pemberitahuan ¶26/¶27 |
| ¶25(d) | Evaluasi **dasar penentuan rekan perikatan** atas pemenuhan independensi |
| ¶25(f) | Evaluasi **kecukupan keterlibatan rekan perikatan** |

Checklist EQR saat ini 5 butir generik; ¶25(d) & ¶25(f) tidak terwakili secara eksplisit.

**D-9 · ¶56 evaluasi kinerja periodik** atas pemegang tanggung jawab tertinggi & operasional SMM:
tidak ditemukan.

**D-10 · ¶60 periode retensi dokumentasi SMM** (berbeda dari retensi kertas kerja perikatan):
perlu diverifikasi saat implementasi; retensi lampiran ada di `server/src/attachments/retention.ts`
namun tidak spesifik untuk dokumentasi sistem manajemen mutu.

### 7.3 Aset eksternal yang belum dimanfaatkan

**Toolkit Manajemen Mutu V3** menyediakan 40+ dokumen ilustratif (1.1 s.d. 9.7) dan
**Matriks Ilustrasi Risiko Mutu V3** memetakan tujuan mutu → risiko ilustratif → respons yang
merujuk nomor dokumen Toolkit. Ini adalah **peta implementasi siap-pakai** dari IAPI yang belum
tersentuh aplikasi sama sekali. Nilai produk terbesar ada di sini (PR-6).

## 8. Proposed Approach

**Prinsip pemandu:** setiap kemampuan baru harus **bisa gagal**. Sebuah tujuan mutu tanpa
respons, seorang penelaah tanpa eligibilitas, seorang rekan tanpa inspeksi — semuanya harus
menghasilkan keadaan merah yang terlihat, bukan sel kosong.

**Arsitektur:** empat modul kanonik murni (tanpa React/efek-samping/localStorage), diuji unit,
lalu view menjadi cermin — pola yang sudah terbukti di `canon_eqr_gate.ts`.

```
canon_smm_objectives.ts   27 tujuan mandatori ¶28–33 + peta komponen + rujukan ¶ benar
                          → coverageFor(objectives, risks) : { covered, uncovered, waived }
canon_smm_evaluation.ts   mesin ¶54: (a) memadai · (b) kecuali-untuk · (c) tidak memadai
                          → pervasivitas MENGIKAT, bukan dekoratif
canon_smm_monitoring.ts   ¶38(c) cakupan per-rekan-perikatan · ¶39(b) larangan self-inspection
canon_eqr_eligibility.ts  SMM 2 ¶18–23: jeda 2 th diturunkan · kompetensi · objektivitas ·
                          pembantu penelaah · penurunan eligibilitas
```

**Mengapa ini dibanding alternatif:**
- *Alternatif A — perbaiki di dalam view.* Ditolak: melanggar SSOT, tak bisa diuji unit, dan
  persis pola yang melahirkan D-4 (logika keputusan tercecer di JSX).
- *Alternatif B — impor Matriks IAPI apa adanya sebagai seed risiko.* Ditolak: Matriks secara
  eksplisit melarang pemakaian tanpa pertimbangan relevansi. Yang diimpor adalah **tujuan mutu
  mandatori** (memang wajib, ¶24), bukan risiko ilustratif. Risiko ilustratif ditawarkan sebagai
  *saran*, bukan seed.
- *Alternatif C — bangun modul SMM baru dari nol.* Ditolak: `view_isqm.tsx` + `SoqmAnnualEval` +
  `canon_firm_attest.ts` sudah baik; membangun ulang membuang aset dan melanggar prinsip
  "prefer existing solutions".

## 9. Risks

| # | Mode kegagalan | Mitigasi |
|---|---|---|
| R-1 | **Seed demo langsung merah** setelah gerbang ditegakkan (¶38(c) gagal, cakupan tujuan <100%). Ini pernah terjadi pada arc P2PK: gerbang mutu ditegakkan di atas seed yang disetel agar tak pernah memblokir. | Seed **sengaja** diperbaiki agar realistis-lolos untuk sebagian dan realistis-gagal untuk sebagian, supaya demo menunjukkan gerbang yang hidup. Perubahan seed didokumentasikan di PR. Uji harus memaku keadaan gagal yang disengaja, bukan menutupinya. |
| R-2 | 27 tujuan mandatori terasa memberatkan KAP kecil / praktisi tunggal → pengguna mengabaikan modul. | ¶17 membolehkan tujuan tidak relevan. Sediakan penandaan "tidak relevan" **berjustifikasi wajib**; justifikasi kosong = tetap merah. |
| R-3 | Pelanggaran hak cipta bila teks standar disalin. | Rumusan fungsional ringkas + rujukan paragraf; larangan salin-utuh masuk review checklist PR. |
| R-4 | Penurunan eligibilitas ¶22–23 memblokir EQR yang sedang berjalan pada perikatan aktif → firma buntu. | Penurunan eligibilitas memicu **alur penunjukan pengganti** (¶22), bukan sekadar penolakan. |
| R-5 | Ratchet `:any` — menyalin sel JSX ke dua cabang menduplikasi `as any` dan meng-un-suppress seluruh berkas (gotcha berulang). | `npm run lint:any-baseline` setelah tiap PR; hindari duplikasi sel JSX. |
| R-6 | Perubahan `AMS_CANON` menuntut pembaruan snapshot `canon_regression.test.ts`. | Masuk checklist tiap PR yang menyentuh data kanon. |
| R-7 | **¶48–52 jaringan (Q-2 = jaringan).** Toolkit & Matriks IAPI ditulis untuk KAP non-jaringan, jadi tidak ada dokumen ilustratif yang bisa disandari untuk bagian ini. | Bersandar langsung pada teks SMM 1 ¶48–52; PR-5b terpisah agar risikonya terisolasi dan tidak menahan Fase 1–3. |
| R-8 | Carve-out A191 disalahgunakan: defisiensi ditandai "sudah diremediasi" untuk menaikkan kesimpulan tanpa dampaknya benar-benar dikoreksi. | A191 menuntut **dua** syarat (diremediasi **dan** dampak dikoreksi) — keduanya jadi field terpisah; ¶43 mewajibkan evaluasi efektivitas tindakan remedial oleh pemegang tanggung jawab operasional, jadi penandaan itu sendiri harus terikat atestasi, bukan toggle bebas. |

## 10. Implementation Plan

Tujuh PR berurutan; tiap PR hijau di `npm run verify` sebelum yang berikut.

**Fase 1 — Kebenaran rujukan (rendah risiko, tinggi nilai)**
- **PR-1 · Nomenklatur SMM 1/SMM 2 + rujukan paragraf benar.**
  D-1, D-3. Konstanta paragraf kanonik + uji tabel. SPM 1 disebut sebagai pendahulu yang
  digantikan bila relevan secara historis.

**Fase 2 — Tujuan mutu sebagai SSOT**
- **PR-2 · `canon_smm_objectives.ts` — 27 tujuan mandatori ¶28–33.**
  D-2. Enumerasi bertipe + peta ke 8 komponen + `coverageFor()`. Uji: hitungan per paragraf
  (5/2/2/6/8/4).
- **PR-3 · Gerbang cakupan yang bisa gagal + penandaan tidak-relevan berjustifikasi (¶17).**
  D-2. `view_isqm_deep.tsx` berhenti menormalkan ketiadaan; "Cakupan Komponen" diganti
  "Cakupan Tujuan Mandatori" yang dihitung atas 27, bukan atas 8 komponen.

**Fase 3 — Kesimpulan & pemantauan yang mengikat**
- **PR-4 · `canon_smm_evaluation.ts` — pervasivitas mengikat ¶54(a)/(b)/(c).**
  D-4. Cabut hardcode ID; pervasivitas jadi properti terhitung. Uji tabel-keputusan.
- **PR-5 · `canon_smm_monitoring.ts` — ¶38(c) & ¶39(b).**
  D-5, D-6. Cakupan per-rekan dihitung dari `ENGAGEMENTS`; larangan self-inspection ditegakkan.
  Uji harus menunjukkan seed saat ini **gagal** untuk Rudi Gunawan.

**Fase 3b — Ketentuan jaringan (keputusan Q-2)**
- **PR-5b · `canon_smm_network.ts` — ¶48–52.**
  Pemahaman ketentuan jaringan & jasa jaringan (¶48) · penentuan relevansi + evaluasi
  perlu-tidaknya diadaptasi/ditambah (¶49) · pengaruh pemantauan jaringan atas luas pemantauan
  KAP (¶50) · **hasil pemantauan jaringan sekurang-kurangnya tahunan** (¶51(b)) dengan gerbang
  yang gagal bila belum diperoleh untuk tahun berjalan · defisiensi jaringan dikomunikasikan
  ke jaringan + tindakan remedial KAP (¶52) · dokumentasi ¶59.
  Menyentuh `QM_PROVIDERS` (entri jaringan dinaikkan dari baris vendor biasa menjadi objek
  jaringan bertipe). Catatan: Toolkit & Matriks IAPI ditulis untuk KAP **non-jaringan**, jadi
  bagian ini bersandar langsung pada teks SMM 1, bukan pada Toolkit.

**Fase 4 — SMM 2**
- **PR-6 · `canon_eqr_eligibility.ts` + penegakan server.**
  D-7, D-8 (¶18–23). Jeda 2 th diturunkan dari riwayat peran; `canClear` menuntut eligibilitas;
  penurunan eligibilitas → alur pengganti; ¶26 "tidak dapat diselesaikan".
- **PR-7 · Dokumentasi EQR ¶30(a)–(e) + checklist ¶25(d)/(f).**
  D-8 sisa. Pembantu penelaah, identifikasi dokumentasi yang ditelaah, dasar ¶27, pemberitahuan.

**Fase 5 — Aset IAPI (opsional, keputusan terpisah)**
- **PR-8 · Peta Toolkit IAPI (1.1–9.7) → modul Asseris + status kelengkapan dokumentasi ¶57–60.**
  §7.3. Nilai produk tertinggi; ruang lingkupnya perlu keputusan tersendiri.

Setiap PR: `npm run verify` hijau · baris status di `docs/PRD-REGISTRY.md` diperbarui ·
`lint:any-baseline` disinkronkan bila perlu.

## 11. Open Questions — status

### TERJAWAB (Ari, 2026-08-13)

**Q-2 · Firma demo: jaringan.** ✅ Firma dimodelkan sebagai **bagian dari jaringan**,
konsisten dengan `QM_PROVIDERS` yang sudah mencantumkan AGN-Asia. Konsekuensi: **¶48–52 masuk
scope** (PR-5b baru). Toolkit & Matriks IAPI ditulis untuk KAP non-jaringan, sehingga bagian
jaringan bersandar langsung pada teks SMM 1. Indikator pervasivitas A192 yang berbasis
unit bisnis / lokasi geografis (P3, P4) menjadi relevan secara nyata.

**Q-3 · Definisi operasional "pervasif".** ✅ Diselesaikan dengan mendasarkannya pada teks
standar, bukan ambang karangan. **SMM 1 A192** memberi lima indikator eksplisit, dan **A191**
memberi carve-out yang penting.

*Pervasif* = terdapat defisiensi **terbuka** (belum diremediasi, atau dampaknya belum
dikoreksi pada tanggal evaluasi) yang memenuhi **≥1** indikator A192:

| Kode | Indikator A192 |
|---|---|
| P1 | Memengaruhi **beberapa komponen atau aspek** sistem manajemen mutu |
| P2 | Terbatas pada satu komponen/aspek, **tetapi fundamental** bagi SMM |
| P3 | Memengaruhi **beberapa unit bisnis atau lokasi geografis** KAP |
| P4 | Terbatas pada satu unit/lokasi, **tetapi unit itu fundamental** bagi KAP keseluruhan |
| P5 | Memengaruhi **sebagian besar perikatan** dengan jenis atau sifat tertentu |

*Signifikan* (¶54(b)) diturunkan dari faktor **A163**: sifat defisiensi (rancangan ·
implementasi · operasi — defisiensi **rancangan** dinilai lebih berat) · ada/tidaknya respons
kompensasi · akar penyebab · frekuensi · besaran, kecepatan, dan lamanya terjadi.

**Aturan keputusan ¶54 (mengikat, bukan dekoratif):**
```
ada defisiensi pervasif TERBUKA                     → ¶54(c) tidak memadai
ada defisiensi signifikan-tak-pervasif TERBUKA      → ¶54(b) kecuali-untuk
selain itu                                          → ¶54(a) memadai
```
**Carve-out A191 (wajib diimplementasikan):** defisiensi signifikan — termasuk yang pervasif —
yang **sudah diremediasi dengan tepat dan dampaknya dikoreksi** pada tanggal evaluasi TIDAK
menurunkan kesimpulan. Namun ia tetap wajib tercatat dalam basis kesimpulan (¶58(e)).
Ini menghilangkan hardcode `(r.id === 'QR-02' || r.id === 'QR-04')` dan menggantinya dengan
properti terhitung; tiap indikator P1–P5 wajib punya uji sendiri.

**Q-6 · Tinjauan visual.** ✅ Sudah OK menurut Ari — utang tinjauan visual dari arc P2PK
**LUNAS**. Tidak ada blokade; PR-1 boleh langsung jalan.

### DIPUTUSKAN SENDIRI (asumsi eksplisit — koreksi bila keliru)

**Q-1 · Skala risiko L×D → opsi (c).** SMM 1 ¶25 tidak mengenal skala Likelihood × Dampak 5×5,
dan Matriks Ilustrasi IAPI tidak memakai skoring numerik sama sekali. Heatmap **dipertahankan**
karena nilai manajerialnya nyata untuk penentuan prioritas, tetapi **labelnya dijujurkan**:
disajikan sebagai alat bantu prioritas internal firma, bukan sebagai ketentuan SMM, dan
rujukan "¶26–¶27" pada heatmap diperbaiki (identifikasi & penilaian risiko = **¶25**).

**Q-4 · Kewenangan penandaan "tidak relevan" (¶17) → dua langkah, memakai rantai yang sudah ada.**
Diusulkan oleh pemegang tanggung jawab **operasional** SMM (¶20(b)), disetujui oleh pemegang
tanggung jawab **tertinggi** (¶20(a)) — persis pola `SOQM_ANNUAL_ROLES` di
`canon_firm_attest.ts` yang sudah terbukti. Alasan memilih ini dibanding "hanya ¶20(a)":
menandai tujuan mutu mandatori sebagai tidak relevan adalah pertimbangan profesional yang
harus terdokumentasi berjenjang, dan menggunakan ulang rantai atestasi yang ada lebih murah
serta lebih konsisten daripada membuat kapabilitas RBAC baru. Justifikasi kosong = tetap merah.

### MASIH TERBUKA (tidak memblokir Fase 1–4)

**Q-5 · Periode retensi dokumentasi SMM (¶60).** ✅ **TERJAWAB: 5 tahun** (Ari, 2026-08-13).
Diterapkan sebagai `QM_DOC_RETENTION` dan ditandai **kebijakan KAP** — ¶60 tidak menetapkan
angka apa pun. Berlaku HANYA untuk dokumentasi **sistem manajemen mutu**; retensi kertas
kerja **perikatan** tetap rezim terpisah (SA 230 & peraturan akuntan publik) dan TIDAK
diubah. Ari menyetujui pemisahan ini.

---
**Sign-off:** ditandai dengan balasan **"Proceed."**
