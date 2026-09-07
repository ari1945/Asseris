---
name: asseris-smm1-smm2-adoption
description: "Arc adopsi SMM 1 & SMM 2 (IAPI) ke Asseris — PRD Draft `docs/prd-smm1-smm2-adoption.md`, 10 cacat terverifikasi (D-1..D-10), menunggu \"Proceed.\" + 6 Open Question"
metadata: 
  node_type: memory
  type: project
  originSessionId: 29d50f23-aecc-4c76-8eba-981f0c19004d
  modified: 2026-08-13T06:28:55.941Z
---

**2026-08-13.** Ari melampirkan 4 PDF IAPI dan minta "pelajari dan adopsi": SMM 1 (58 hlm),
SMM 2 Penelaahan Mutu Perikatan (30 hlm), Toolkit Manajemen Mutu V3 (18 hlm), Matriks
Ilustrasi Risiko Mutu V3. Semua di `C:\Users\ecovi\Downloads\`. Efektif **31-12-2025**,
menggantikan SPM 1.

**GOTCHA baca PDF:** `Read` gagal — `pdftoppm` tidak terpasang. Tapi **`pdftotext` ADA** di
`/mingw64/bin`. Pakai `pdftotext -layout <f>.pdf <out>.txt` lalu Read teksnya. Jangan buang
waktu menginstal poppler.

**Status 2026-08-13: ARC SELESAI. KEDELAPAN PR MERGED. NOL PR terbuka dari arc ini.**
master `3adc842`. PRD `docs/prd-smm1-smm2-adoption.md` = **Implemented**.
Uji frontend 1313 → **1552**. Ratchet `:any` 8170 → **8162** (TURUN).

| PR | # | master | uji |
|---|---|---|---|
| PR-1 nomenklatur | #198 | `63c07bf` | 1337 |
| PR-2 27 tujuan ¶28–33 | #200 | `1375c98` | 1365 |
| PR-3 gerbang cakupan | #201 | `7528b6f` | 1376 |
| PR-4 pervasivitas ¶54 | #202 | `7369294` | 1421 |
| PR-5 ¶38(c)/¶39(b) | #203 | `04eb065` | 1454 |
| PR-5b jaringan ¶48–52 | #204 | `87c8561` | 1483 |
| PR-6 eligibilitas EQR + server | #205 | `d7f868a` | 1519 |
| PR-7 dokumentasi ¶30 & retensi ¶60 | #206 | `3c57a39` | 1552 |

**Q-5 = 5 tahun**, HANYA dokumentasi SMM (¶60). Kertas kerja PERIKATAN tetap rezim
terpisah (SA 230 & peraturan AP) — Ari setuju pemisahan ini, angkanya TIDAK diubah.
Tinjauan visual: **Ari bilang OK** (tak pernah dijalankan agen — login diperlukan).

### 🔴 GOTCHA 16 — RESOLVER KONFLIK BISA MEMBUANG DEKLARASI TANPA JEJAK
Saat rebase PR-7, resolver regex saya menangani hunk daftar-ekspor tapi mengambil sisi
"theirs" MENTAH pada hunk kedua → **41 baris blok `QM_NETWORK` (fitur PR-5b yang baru
merged) TERHAPUS**. Nol penanda konflik tersisa; `git rebase` bilang sukses.
**Cek penanda konflik SAJA TIDAK CUKUP.** Sesudah setiap resolusi manual:
```
git diff --stat origin/master...HEAD          # penghapusan besar = curiga
for s in <SIMBOL>; do
  m=$(git show origin/master:<file> | grep -c "const $s"); h=$(grep -c "const $s" <file>)
  [ "$m" -gt "$h" ] && echo "HILANG: $s"
done
```
Diselamatkan HANYA karena `npm run verify` lokal dijalankan SEBELUM push.

### GOTCHA 17 — konflik daftar-ekspor pasti terjadi antar-PR paralel
PR yang menambah simbol ke `data_part4.ts`/`data.ts` SELALU konflik satu sama lain,
meski "berkas berbeda". Jangan klaim dua PR independen tanpa cek BARISnya.
Resolusi = gabungan (pertahankan semua simbol).

### GOTCHA 18 — `/tmp` Git Bash ≠ `/tmp` Python di Windows
`git show ... > /tmp/x` lalu `pathlib.Path('/tmp/x')` = FileNotFoundError.
Pakai direktori scratchpad sesi.

### GOTCHA 19 — jangan deteksi status CI dengan `grep -c fail`
Nama check memuat kata "fails" (`npm audit … high+critical fails`) → false positive.
Pakai `gh pr checks <n> | awk -F'\t' '{print $2}' | sort | uniq -c`.

| PR | # | master commit | uji frontend |
|---|---|---|---|
| PR-1 nomenklatur SMM | [#198](https://github.com/ari1945/Asseris/pull/198) | `63c07bf` | 1337 |
| PR-2 27 tujuan mandatori | [#200](https://github.com/ari1945/Asseris/pull/200) | `1375c98` | 1365 |
| PR-3 gerbang cakupan | [#201](https://github.com/ari1945/Asseris/pull/201) | `7528b6f` | 1376 |
| PR-4 pervasivitas ¶54 | [#202](https://github.com/ari1945/Asseris/pull/202) | `7369294` | 1421 |
| PR-5 pemantauan ¶38(c)/¶39(b) | [#203](https://github.com/ari1945/Asseris/pull/203) | `04eb065` | 1454 |

(#199 = versi lama PR-2, ditutup permanen — lihat gotcha 11.)

**TIGA PR MASIH TERBUKA** (semua verify PASSED):
| PR | # | base | uji |
|---|---|---|---|
| PR-5b jaringan ¶48–52 | [#204](https://github.com/ari1945/Asseris/pull/204) | `master` | 1483 |
| PR-6 eligibilitas EQR ¶17–23 + server | [#205](https://github.com/ari1945/Asseris/pull/205) | `master` | 1490 |
| PR-7 dokumentasi ¶30 & retensi ¶60 | [#206](https://github.com/ari1945/Asseris/pull/206) | **branch PR-6** | 1523 |

#204 independen dari #205/#206 (berkas berbeda). #206 bertumpuk di atas #205.

### Temuan besar PR-5b/6/7
- **PR-6: `eqrReviews.v2` TIDAK ADA di `SIGNOFF_KEYS`** → `guardSignoffWrite` tak pernah
  jalan untuk registri EQR. Gerbang opini MEMBACA registri itu tapi tulisan KE registrinya
  tak dijaga = gerbang yang masukannya bisa dipalsukan. Ditutup + penjaga transisi `cleared`.
- **PR-6: `canClear` mengabaikan eligibilitas sepenuhnya.** Jeda ¶19 kini DITURUNKAN dari
  `EQR_PARTNER_HISTORY` → temuan: **Sari Dewanti rekan perikatan Sentosa Makmur 2025, lalu
  ditunjuk penelaah mutu perikatan yang sama** — ¶19 belum terlampaui.
- **PR-5b: jaringan cuma SATU BARIS VENDOR** `status:'Memadai'` — struktural tak bisa
  menyatakan ¶48–52. Diganti `QM_NETWORK`. Juga: KPI "Simpulan Evaluasi 2025 = Memadai"
  di `view_governance` ternyata LITERAL di JSX, tak tertaut mesin ¶54 PR-4 — diperbaiki.
- **PR-7: 3 dari 5 butir ¶30 tak punya tempat** (nama pembantu · dokumentasi yang ditelaah ·
  pemberitahuan ¶26/¶27). `QM_DOC_RETENTION = 5 tahun` (Q-5) — HANYA dokumentasi SMM,
  BUKAN kertas kerja perikatan (rezim berbeda). Atribusi "retensi 10 tahun (SMM 1)"
  diperbaiki — ¶60 tak menetapkan angka apa pun.

### GOTCHA 14 — cabangkan PR dari INDUK yang benar
PR-7 sempat gagal karena dicabangkan dari `master` yang belum punya `EQR_PARTNER_HISTORY`
(PR-6) & `QM_NETWORK` (PR-5b). Sebelum menulis seed, **cek dulu simbol yang dibutuhkan ada
di basis branch**. Perbaikan: `git rebase --onto <branch-induk> master <branch-anak>`.

### GOTCHA 15 — `const A: any = AMS` MENG-UN-SUPPRESS SELURUH BERKAS
29 error dari SATU baris di `view_eqr.tsx`. Jangan naikkan baseline — beri tipe pada
pembacaan AMS: `const A = AMS as unknown as { ENGAGEMENTS?: Array<{...}> }`.
Terjadi 2× sesi ini (juga 31 error di panel jaringan PR-5b).

### ✅ RESEP MERGE RANTAI BERTUMPUK — TERBUKTI 4×
1. Cek CI induk hijau · 2. `gh pr merge <induk> --squash` **TANPA `--delete-branch`** ·
3. `git checkout <branch-anak>` · 4. `git rebase --onto origin/master <commit-induk-LAMA>` ·
5. `grep -rc "^<<<<<<< " migration/src` (harus kosong) · 6. `git push --force-with-lease` ·
7. `gh pr edit <anak> --base master` · 8. `git push origin --delete <branch-induk>` ·
9. **TUNGGU CI ANAK selesai** (rebase mengubah commit → CI lama tak berlaku) · 10. ulangi.

**GOTCHA 13 — jangan deteksi "CI selesai" dari `conclusion` JSON.** Check yang masih
berjalan mengembalikan `conclusion: null`, mudah salah dibaca sebagai gagal/selesai.
Pakai `gh pr checks <n>` dan cek string `pending`:
`until ! gh pr checks <n> | grep -q "pending"; do sleep 20; done`

### PR-3 — apa yang sudah dilakukan
- `SOQM_RISKS` dapat field `objectives`: QR-01→QO-30a · QR-02→QO-32d · QR-03→QO-31d ·
  QR-04→QO-29a · QR-05→QO-33c. **QR-06 SENGAJA nol** (proses ¶35–47, bukan pemilik tujuan).
- `SoqmObjectives` ditulis ulang: KPI atas 27 tujuan, status per tujuan
  (tercakup / dikesampingkan ¶17 / BELUM TERTANGANI), sub-aspek romawi, risiko bisa diklik.
- **Kalimat penormalisasi DICABUT** ("ditangani lewat kontrol entitas").
- `SMM_OBJECTIVE_WAIVERS` ditambahkan **KOSONG** + uji yang memaku kekosongannya.
- **BARU** `smm_objective_coverage_seed.test.ts` (11 uji) di atas DATA NYATA.

### 🔴 TEMUAN PR-3 (penting untuk tinjauan Ari)
**C1 Tata Kelola & Kepemimpinan: NOL risiko mutu terdaftar — 0 dari 5 tujuan ¶28.**
Register lama hanya menyentuh C3–C8. Komponen yang ¶19 sebut menetapkan LINGKUNGAN
seluruh SMM justru kosong; metrik komponen tak pernah menampakkannya.
**Angka nyata seed: metrik lama 75% (6 komponen punya risiko / 8) vs metrik tujuan 19%
(5 tercakup / 27) — 22 defisiensi rancangan.** (Catatan: "100%" yang sempat saya tulis
hanya berlaku untuk register hipotetis 1-risiko-per-komponen di uji unit PR-2.)

### GOTCHA 12 — lint bisa merah justru karena PERBAIKAN
Menulis ulang view menghapus 8 `any` → baseline punya suppression usang → ESLint menolak
("suppressions left that do not occur anymore"). Perbaikan: `npm run lint:any-baseline`.
**Selalu `npm run verify` (bukan cuma `typecheck`) sesudah menulis ulang view.**

### Batas yang DISENGAJA di PR-3
UI penulisan waiver TIDAK dibangun. Kunci atestasi dibatasi allow-list server
`/^firmAttest\.soqmAnnualEval\.\d{4}$/` dan penolakannya DITELAN sebagai "offline";
waiver klien-saja bisa menutup tujuan mandatori tanpa penegakan server = mengulang cacat
yang sedang ditutup. Perluasan allow-list → digabung ke **PR-6** (penegakan server EQR).

### ⚠ GOTCHA 11 — `gh pr merge --delete-branch` MEMBUNUH PR BERTUMPUK
Menghapus branch base saat squash-merge membuat GitHub **menutup PR anaknya secara
permanen**: `pr reopen` gagal ("Could not open the pull request") BAHKAN setelah branch
base dipulihkan dengan `git push origin <sha>:refs/heads/<branch>`. Retarget juga
ditolak ("Cannot change the base branch of a closed pull request").
**Satu-satunya jalan keluar: buat PR BARU dari branch yang sama** (nomor PR hilang,
isi/commit tetap). Untuk PR bertumpuk berikutnya: **merge TANPA `--delete-branch`**,
retarget anaknya ke master dulu, BARU hapus branch base.
Rebase-nya sendiri mulus: `git rebase --onto origin/master 608cbb3` → nol penanda
konflik (tetap `grep -rc "^<<<<<<< "` sesudahnya).

### PR-2 — apa yang sudah dilakukan
- **BARU** `canon_smm_objectives.ts` — 27 tujuan mandatori ¶28–33 (5·2·2·6·8·4) bertipe +
  sub-aspek romawi, `objectivesForComponent()`, `objectiveCoverage()`, `coverageByComponent()`.
- **Gerbang cakupan dihitung atas 27 TUJUAN, bukan 8 komponen.** Metrik lama membagi
  komponen-punya-risiko / jumlah komponen → 1 risiko per komponen = 100% palsu.
- **Waiver ¶17 (keputusan Q-4)**: sah HANYA bila justifikasi + diusulkan ¶20(b) +
  disetujui ¶20(a). Tak lengkap → tujuan TETAP defisiensi; cacat dilaporkan `waiverAudit`.
- **BARU** `canon_smm_objectives.test.ts` (28 uji) — memaku regresi metrik: 6 risiko
  satu-per-komponen = **100% metrik lama vs 22% metrik tujuan (21 defisiensi)**.
- `QM_COMPONENTS[].obj` diturunkan dari kanon; 7 dari 8 salah (C1 4→5 · C3 5→2 · C4 3→2 ·
  C6 4→8 · C7 2→4). C2 & C8 → 0 (PROSES ¶23–27 & ¶35–47, bukan pemilik tujuan);
  tampilan diubah jadi "proses (tanpa tujuan ¶28–33)".

Berikutnya **PR-3**: tautkan `SOQM_RISKS` ke id tujuan + render gerbang yang bisa gagal di UI
(`view_isqm_deep.tsx` — ganti "Cakupan Komponen" jadi cakupan atas 27 tujuan, dan CABUT
kalimat yang menormalkan ketiadaan di `:167`).

## PR-1 — apa yang sudah dilakukan
- **BARU** `canon_smm_refs.ts` — SSOT paragraf SMM 1 (15 seksi) & SMM 2 (12 seksi) +
  `SMM1_COMPONENT_SECTION` C1–C8 + `componentParaLabel()`/`smm1Ref()`/`smm2Ref()`/`paraCovers()`.
- **BARU** `canon_smm_refs.test.ts` (24 uji) — memaku nilai benar DAN nilai salah lama sbg tripwire.
- **BARU** `smm_nomenclature.test.ts` (5 uji) — pemindai fs: gagal bila "ISQM"/"SPM"/
  "Pengelolaan Mutu"/"¶33–34"/"SMM ¶A56" kembali masuk. ALLOWED = 3 berkas kanon/uji.
- Sapuan 74 berkas: ISQM 1→SMM 1 · ISQM 2→SMM 2 · SPM→SMM · Pengelolaan Mutu→Manajemen Mutu.
- `QM_COMPONENTS[].ref` kini DITURUNKAN `componentParaLabel()` (7 dari 8 tadinya salah).
- 14 kutipan paragraf diperbaiki + 4 rujukan arus Informasi & Komunikasi → sub-butir ¶33.
- KB: entri **`SMM 2` DITAMBAHKAN** (tadinya terdaftar di registri tanpa detail = klik kosong);
  entri SMM 1 diperkaya dengan rujukan ¶ yang benar.

### GOTCHA PR-1 (mahal kalau lupa)
1. **JANGAN sapu `canon_smm_refs.*` & `smm_nomenclature.test.ts`** — memuat token terlarang
   sebagai tripwire; kalau ikut tersapu, assertion `not.toContain('ISQM')` jadi tautologi.
2. **Identifier `soqm*` TERIKAT allow-list server** `/^firmAttest\.soqmAnnualEval\.\d{4}$/`
   (`server/src/stateAccess.ts:65`) + `useAmsPersist('soqmRisks')`. JANGAN di-rename.
3. Guard regex `¶A56` **harus disempitkan ke konteks SMM** — `SA 500 ¶A56` (IPE) & `SA 530 ¶A56`
   sah dan sempat menggagalkan uji.
4. **Python heredoc di tool Bash: `print` non-ASCII crash cp1252.** Pakai
   `sys.stdout.reconfigure(encoding='utf-8', errors='replace')`. Penulisan berkas TIDAK
   terpengaruh — verifikasi lewat `git diff --stat`, bukan lewat asumsi.
5. `type: 'SPM'` adalah **kunci struktural** (FRAMEWORK, STD_TYPE_KIND, view_kb, view_compmatrix)
   — ikut berganti ke 'SMM' secara konsisten karena semuanya string biasa.
6. Nama BERKAS PRD lama masih memuat "SPM"/"ISQM" (mis. `PRD - Kesiapan Pemeriksaan P2PK
   (SPM 1 & SPM 2 Auditable).md`) — sengaja TIDAK di-rename (dokumen historis).
7. **`@types/node` TIDAK ADA di `migration/`** (hanya di `server/`). Uji apa pun yang
   mengimpor `node:fs`/`node:path`/`node:url` GAGAL `typecheck:test`. `tsconfig.test.json`
   meng-`exclude` 3 berkas karena ini, dan komentarnya melarang menambah berkas ke sana
   ("berarti membutakan gerbang"). **Solusi yang dipakai: gerbang nomenklatur pindah ke
   ESLint `no-restricted-syntax`** (Literal/JSXText/TemplateElement) di `eslint.config.js`
   — nol dependensi, memakai gerbang `npm run lint` yang sudah ada, dan menyasar permukaan
   yang dibaca pengguna. Uji pemindai-fs `smm_nomenclature.test.ts` DIHAPUS.
   Keputusan menambah `@types/node` ke `migration/` = pekerjaan terpisah, belum diambil.
8. **‼ SAPUAN STRING BISA MENGUBAH MAKNA REGEX.** Menyisipkan `¶34(d)` ke dalam regex
   literal `/…/` membuat `(d)` jadi **capture group** → pola diam-diam berubah jadi `¶34d`
   dan tak pernah cocok. Menggagalkan `acceptance_continuance_memo.test.ts:43`. Sesudah
   sapuan apa pun yang menyisipkan tanda kurung, WAJIB:
   `grep -rnE "/[^/\n]*¶[0-9]+\([a-z]\)[^/\n]*/"`. Perbaikannya: `toMatch('string')`,
   bukan `toMatch(/regex/)`.
9. **Uji TOTP server (`auth.test.ts`) rapuh terhadap kontensi**: lolos terisolasi ~2,1 dtk
   melawan batas 5 dtk, tapi TIMEOUT saat verify penuh berjalan paralel. BUKAN akibat
   perubahan frontend (`git diff master -- server/` kosong). Kandidat utang teknis:
   naikkan `testTimeout` untuk berkas itu.
10. Notifikasi task bisa melaporkan **exit 0 padahal `VERIFY FAILED`** — baca baris terakhir
   keluaran, jangan percaya kode keluar. Keluaran verify juga ter-buffer: berkas tetap
   0 byte sampai proses selesai, dan hanya menangkap bagian AKHIR (gerbang frontend yang
   gagal tidak terekam) — jalankan gerbang frontend terpisah untuk melihat errornya.

## Yang SUDAH ADA (jangan bangun ulang — grep dulu!)
`view_isqm.tsx` (391) · `view_isqm_deep.tsx` (569) · `view_isqm_parts.tsx` (266) ·
`view_eqr.tsx` (181) · `canon_eqr_gate.ts` · `canon_firm_attest.ts` · `view_governance.tsx`.
`SoqmAnnualEval` (mesin ¶54 + atestasi berjenjang) kualitasnya **tinggi** — tanpa fallback ke
seed, atestasi bisa gugur. Data: `SOQM_RISKS` (`data_part2.ts:158`), `QM_COMPONENTS`/
`QM_ROLES`/`QM_INSPECTIONS`/`QM_MON_ACTIVITIES`/`EQR_META`/`QM_EVAL` (`data_part4.ts:148+`).

## 10 cacat terverifikasi (bukan asumsi — dicek ke kode)
- **D-1** 0× "SMM" di seluruh src; 136× "ISQM 1", 24× "SPM 1". Standar yang mengikat KAP RI
  adalah SMM 1/SMM 2 — aplikasi berlabel standar yang tak berlaku.
- **D-2** 27 tujuan mutu mandatori ¶28–33 (5/2/2/6/8/4) **tak pernah dienumerasi**.
  `QM_COMPONENTS[].obj` = integer dekoratif tak tertaut apa pun. `view_isqm_deep.tsx:167`
  MENORMALKAN ketiadaan ("ditangani lewat kontrol entitas").
- **D-3** Rujukan ¶ salah pada **7 dari 8** komponen. Benar: C1=¶28 · C2=¶23–27 · C3=¶29 ·
  C4=¶30 · C5=¶31 · C6=¶32 ✓ · C7=¶33 · C8=¶35–47. Juga keluhan dilabeli "¶A56" (benar ¶34(c)).
- **D-4** Pervasivitas ¶54(c) **dihitung, ditampilkan, lalu DIABAIKAN** — logika kesimpulan
  hanya baca `defsHighOpen||inspBad||cmpInvest`. `defsPervasive` hardcode ke ID seed
  `QR-02`/`QR-04`.
- **D-5** ¶38(c) "≥1 perikatan/rekan" hanya STRING. Seed melanggar: **Rudi Gunawan** rekan
  EQR-063/ENG-2025-063 tapi nihil di `QM_INSPECTIONS`.
- **D-6** ¶39(b) larangan self-inspection: nihil.
- **D-7** Eligibilitas EQR **dekoratif**: `view_eqr.tsx:32` `canClear = allChecked &&
  openFindings===0 && !r.cleared` — eligibilitas TIDAK IKUT. `coolingOk/compOk/objOk` =
  boolean seed. Blok eligibilitas hanya dirender `if (meta.coolingOff||meta.competence)` →
  EQR tanpa meta tak tampil apa-apa & tetap bisa ditutup. Data cooling-off 2 th SUDAH ADA
  (`data_part4.ts`, `view_people.tsx`) tapi tak dipakai EQR.
- **D-8** Nihil total: ¶20 pembantu penelaah · ¶21(b) · ¶22–23 penurunan eligibilitas ·
  ¶26 "penelaahan tidak dapat diselesaikan" · ¶30(a)(b)(c)(d) dokumentasi · ¶25(d) ¶25(f).
- **D-9** ¶56 evaluasi kinerja pemegang tanggung jawab SMM: nihil.
- **D-10** ¶60 retensi dokumentasi SMM: perlu verifikasi.

## Rencana: 7 PR + 1 opsional
PR-1 nomenklatur+¶ · PR-2 `canon_smm_objectives.ts` (27 tujuan) · PR-3 gerbang cakupan bisa
gagal + waiver ¶17 berjustifikasi · PR-4 `canon_smm_evaluation.ts` pervasivitas mengikat ·
PR-5 `canon_smm_monitoring.ts` ¶38(c)/¶39(b) · PR-6 `canon_eqr_eligibility.ts` ¶18–23 +
server · PR-7 dokumentasi EQR ¶30 · PR-8 (opsional) peta Toolkit IAPI 40+ dokumen.

## Open Question — status (Ari menjawab 2026-08-13)
- **Q-2 = JARINGAN.** Firma demo bagian dari jaringan (AGN-Asia). **¶48–52 MASUK SCOPE** →
  PR-5b `canon_smm_network.ts`. Toolkit & Matriks IAPI ditulis untuk KAP NON-jaringan, jadi
  bagian ini bersandar langsung ke teks SMM 1 — tak ada dokumen ilustratif yang bisa dipakai.
- **Q-3 = pakai A192 + A191**, bukan ambang karangan. **A192 lima indikator pervasif:**
  P1 beberapa komponen/aspek · P2 satu komponen tapi FUNDAMENTAL · P3 beberapa unit
  bisnis/lokasi · P4 satu unit tapi unit itu fundamental · P5 sebagian besar perikatan jenis
  tertentu. *Signifikan* dari **A163** (sifat: rancangan>implementasi>operasi · respons
  kompensasi · akar penyebab · frekuensi · besaran/lama).
  **CARVE-OUT A191 (jangan lupa):** defisiensi signifikan/pervasif yang sudah diremediasi DAN
  dampaknya dikoreksi pada tanggal evaluasi TIDAK menurunkan kesimpulan — tapi tetap wajib
  masuk basis ¶58(e). Dua syarat, dua field terpisah (risiko disalahgunakan).
- **Q-6 = visual sudah OK.** **UTANG TINJAUAN VISUAL ARC P2PK: LUNAS.** Tidak ada blokade.
- **Q-1 (diputuskan sendiri) = opsi (c)**: heatmap L×D dipertahankan sebagai alat bantu
  prioritas, tapi labelnya dijujurkan (bukan ketentuan SMM); rujukan heatmap "¶26–27" → **¶25**.
- **Q-4 (diputuskan sendiri)**: waiver ¶17 = dua langkah — diusulkan ¶20(b), disetujui ¶20(a),
  memakai ulang rantai `SOQM_ANNUAL_ROLES` di `canon_firm_attest.ts`. Justifikasi kosong = merah.
- **Q-5 MASIH TERBUKA**: periode retensi dokumentasi SMM (¶60) berapa tahun. Tak memblokir
  sampai PR-7/8; sementara field dibuat wajib-isi (kosong = defisiensi, bukan angka karangan).

Lihat [[asseris-p2pk-spm-readiness-arc]].

**Batasan hak cipta:** SMM 1/2 dilindungi UU 28/2014. Rumusan tujuan mutu di kode WAJIB
ditulis-ulang ringkas-fungsional + rujukan ¶; jangan salin teks standar utuh.
