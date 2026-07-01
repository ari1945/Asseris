---
title: PRD — Remediasi Gap Matriks Kepatuhan FIRM (CPE Sync, Sign-off Etik/AML, Alert Rotasi, Keterhubungan Sanksi & Disiplin)
status: draft — menunggu sign-off ("Proceed.")
date: 2026-07-01
---

# PRD — Remediasi Gap Matriks Kepatuhan FIRM

## 0. Evaluasi Independen atas 5 Klaim Matriks (verifikasi kode, bukan asumsi)

Matriks yang diberikan dievaluasi baris-per-baris terhadap kode aktual di `migration/src/*`. Tiga dari lima baris **overstated atau meleset sebagian** dibanding kondisi kode riil — konsisten dengan pola sebelumnya (`asseris-gap-matrix-eval` memory) bahwa evaluator matriks kerap tidak grep kode dulu.

| # | Klaim Matriks | Verdict | Bukti Kode |
|---|---|---|---|
| 1 | Pelatihan → CPE: "tdk auto-update CPE credit personel" | **BENAR (real gap)** | `data_people.ts:177-184` `TRAINING_CATALOG` hanya simpan agregat (`seats`, `enrolled` = angka), **tidak ada roster per-pegawai**. `data_part1.ts:284-291` `CPE_LOG` adalah seed statis per-`empId`, judulnya mirip tapi tidak match persis dengan `TRAINING_CATALOG` (mis. "Update SA Terkini (IAPI)" vs "Update SA Terkini & ISA Alignment") — bukti keduanya ditulis manual terpisah, **nol link programatik**. |
| 2 | CPE Tracker: "input manual, tdk sync dr Pelatihan" | **BENAR — gap yang SAMA dengan #1**, dilihat dari sisi lain | `data_licensing.ts:40` `pplOf(empId)` baca `CPE_LOG` + `cpeExtra` (input manual via `LS`). Tidak ada fungsi yang menarik dari `TRAINING_CATALOG`. |
| 3 | Kode Etik & AML/PMPJ: "blm mandatory sign-off via sistem" | **BENAR (real gap)** | `view_pc_conduct.tsx:17-128` hanya *mencatat & menampilkan* status tanda tangan (`ETHICS_DECL` via `useAmsPersist('pc.ethics', ...)`). **Nol guard akses** ditemukan — sudah dicek `rbac.ts` (CAP map 15 kapabilitas, tak ada syarat etik/AML), `engagement_entry_gate.ts:110-127` (gate akseptasi hanya syaratkan surat penerimaan+perikatan, bukan etik), dan server-side middleware. Pegawai yang belum tanda tangan deklarasi etik/lolos screening AML **tetap bisa mengerjakan/approve apa pun**. |
| 4 | Independence & Rotasi: "tenure partner tdk auto-alert" | **SEBAGIAN BENAR** — bukan "tidak ada apa-apa", tapi mekanisme yang ada tidak memenuhi klaim target | Ada tampilan pasif: badge tabel + progress bar (`view_people.tsx:317-339`), kartu KPI dashboard (`view_dashboard2.tsx:197,281`), panel di `view_bo3.tsx:555`. **Tapi**: (a) ambang peringatan `tenure >= limit-1` (≈1 tahun sebelum batas), **bukan 6 bulan** seperti target; (b) banner merah hanya muncul saat **sudah lewat batas** (`rotState==='due'`), bukan pada fase peringatan dini; (c) **nol mekanisme proaktif** (notifikasi/toast/bell) — semua pasif, user harus buka dashboard/tabel sendiri. Klaim "tidak auto-alert" **valid untuk makna "alert proaktif"**, tidak valid untuk "tidak ada visibilitas sama sekali". |
| 5 | Sanksi & Disiplin: "modul baru, tdk terhubung ke apapun" | **SALAH secara literal, TAPI ada gap substansi** | `app.tsx:459-460` merender dock `ModuleLineage` untuk `hrcase`; `related_modules_data2.ts:363-376` mendefinisikan `LINEAGE.hrcase` dengan **up**: hcm, ethics, independence, performance; **down**: hcm, governance, learning. Modul ini **bukan** terisolasi — konsisten dengan pola "klaim isolasi salah" di memory proyek. **Namun** ditemukan gap nyata: (a) **tidak ada link ke modul `cpe`** sama sekali (hanya ke `learning`); (b) seluruh keterhubungan yang ada **hanya dock navigasi UI**, bukan integrasi data — mencatat kasus HR (`HR_CASES` di `data_people.ts:230-236`) **tidak memicu efek apa pun** ke CPE, Kinerja, atau status Kode Etik (`view_pc_conduct.tsx:136-233` murni register read-only); (c) `hrcase` juga absen dari `RELATED_SA` (`icons.tsx:315-372`, tanpa pemetaan standar audit). |

**Kesimpulan:** 3 gap nyata (#1/#2 digabung sebagai satu akar masalah, #3, #4), dan 1 klaim salah-sebagian yang menyisakan gap substansi lebih sempit dari yang dituliskan matriks (#5). Tidak ada baris yang sepenuhnya salah tanpa nilai tindak lanjut.

---

## 1. Problem

Empat celah kepatuhan personel-firma nyata di kode:
- **(A) CPE tidak auto-update dari Pelatihan** — risiko: SKP tercatat bisa tidak akurat/telat, beban input manual berulang, potensi non-compliance PPL tahunan AP tidak terdeteksi dini.
- **(B) Deklarasi Kode Etik/AML tidak mengikat akses** — risiko kepatuhan SPAP/Kode Etik IAPI: staf bisa mengerjakan/approve pekerjaan audit tanpa deklarasi independensi tahunan yang sah.
- **(C) Rotasi partner tidak auto-alert dini** — risiko pelanggaran ambang rotasi OJK/PP 20/2015 baru terdeteksi setelah lewat batas (reaktif, bukan preventif).
- **(D) Sanksi & Disiplin tidak berefek fungsional** — kasus pelanggaran independensi/etik tercatat sebagai register mati, tidak memengaruhi rekam jejak CPE/Kinerja pegawai terkait, sehingga tidak ada jejak audit terintegrasi dari pelanggaran → konsekuensi.

## 2. Objective

Menutup keempat celah dengan integrasi berbasis SSOT (`AMS_CANON`/canon setara), tanpa duplikasi data, mengikuti pola gate/persist yang sudah established di codebase (mis. `engagement_entry_gate.ts`, `guardSignoffWrite`, `LINEAGE` dock).

## 3. Success Criteria

- A: Menyelesaikan pelatihan di katalog → kredit SKP otomatis muncul di CPE Tracker tanpa entri manual duplikat; entri manual (`cpeExtra`) tetap tersedia untuk kredit di luar katalog (self-study, eksternal).
- B: Staf dengan deklarasi etik/AML belum sah **tidak bisa** melakukan aksi tertentu (lingkup harus diputuskan — lihat Open Questions) sampai deklarasi ditandatangani; Partner/Admin punya jalur override yang tercatat.
- C: Partner yang tenure-nya mencapai ambang 6-bulan-sebelum-batas rotasi tampil sebagai **peringatan menonjol otomatis** di Firm Dashboard (bukan hanya di tabel yang harus dibuka manual), dengan tingkatan (aman/peringatan dini/wajib rotasi) yang berbeda dari status "due" saat ini.
- D: `hrcase` terhubung ke `cpe` di dock lineage; kasus dengan kategori yang relevan menghasilkan **jejak (bukan mutasi diam-diam)** yang terlihat dari sisi CPE/Kinerja/Kode Etik terkait (lihat Open Questions untuk semantik pastinya).

## 4. Scope

- Perubahan data model (`data_people.ts`, `data_part1.ts`, `data_licensing.ts`)
- Fungsi turunan baru (pola `AMS_CANON`/canon murni, bukan state privat)
- Perubahan UI di view terkait (`view_pc_talent.tsx`/CPE, `view_pc_conduct.tsx`, `view_people.tsx`, `view_dashboard2.tsx`)
- Penambahan entri `LINEAGE.hrcase` → `cpe`
- Gate baru untuk (B), mengikuti pola `engagement_entry_gate.ts` / RBAC `can()`

## 5. Non-Scope

- Tidak membangun sistem notifikasi/bell app-wide baru (tidak ada infrastruktur ini sama sekali di app; membangunnya adalah proyek terpisah yang jauh lebih besar dari gap ini). Alert (C) akan berbentuk kartu/banner otomatis-tampil di Dashboard, bukan push notification.
- Tidak mengubah `connectivity.json` (baseline W0 beku, referensi historis saja — sudah dikonfirmasi stale di memory proyek).
- Tidak mengubah kebijakan RBAC/CAP di luar yang secara eksplisit diperlukan gate (B).

## 6. Constraints

- SSOT: angka harus tetap bisa ditelusuri ke `AMS_CANON`/canon, bukan hardcode baru.
- TypeScript strict + ESLint `no-explicit-any` ratchet (baseline suppressions, `:any` baru = fail gate) — kode baru harus bertipe penuh.
- Perubahan gate akses (B) berisiko mengunci pengguna dari pekerjaan sah — **hard-to-reverse dari sisi UX**, wajib keputusan eksplisit soal lingkup sebelum implementasi (Reversibility Protocol).

## 7. Existing Solutions (reuse, jangan bangun ulang)

- Pola gate serupa **sudah ada**: `engagement_entry_gate.ts` (blokir Perencanaan→Eksekusi jika akseptasi/surat belum lengkap) — gate (B) sebaiknya meniru pola ini, bukan bikin mekanisme baru.
- Pola dock lineage `LINEAGE[...]` + `ModuleLineage` (`related_modules_data2.ts`, `related_modules.tsx`) sudah dipakai luas — tambah entri `cpe` untuk `hrcase` adalah perubahan kecil dan konsisten.
- Pola alert-tier di dashboard (`view_dashboard2.tsx` kartu KPI merah) sudah ada polanya untuk kondisi "due" — tinggal tambah tier "peringatan dini" dengan ambang berbeda, bukan bikin komponen baru.
- Pola `useAmsPersist` + versioned StateDoc server-side untuk sign-off (dipakai `guardSignoffWrite`, `strategyApproved.v1`, dst.) — bisa dipakai ulang untuk deklarasi etik & override gate.

## 8. Proposed Approach (per item)

**A — CPE auto-sync dari Pelatihan**
1. Tambah data kehadiran per-pegawai per-training (mis. `TRAINING_ATTENDANCE: { trainingId, empId, completedDate }[]`) — data baru, sebab `enrolled` saat ini cuma angka agregat.
2. Fungsi canon murni `cpeFromTraining(attendance, catalog) → CpeEntry[]` yang menghasilkan entri kredit SKP otomatis per training selesai.
3. `pplOf(empId)` di `data_licensing.ts` digabung: `CPE_LOG (seed/legacy) + cpeFromTraining(...) + cpeExtra (manual)`, dengan penanda sumber ("Otomatis dari Pelatihan" vs "Manual") di UI CPE Tracker.

**B — Gate sign-off Kode Etik/AML**
1. Tentukan aksi yang diblokir (lihat Open Questions) — usulan: WP sign-off & opini approval oleh staf ybs, bukan seluruh akses aplikasi (blokir total berisiko downtime kerja sah untuk isu administratif).
2. Guard di titik aksi tsb (client `can()` + server `guardSignoffWrite`-style check), baca `ETHICS_DECL[empId].signed` + `AML_SCREENING` status.
3. `LockBanner` (primitif sudah ada di `ui.jsx`/`ui.tsx`) ditampilkan di titik yang diblokir dengan CTA "Tandatangani Deklarasi".

**C — Alert dini rotasi**
1. Tambah ambang baru di `data_licensing.ts`: `rotAlert = tenure >= rotationLimit - 0.5` (6 bulan), terpisah dari `rotWarn` (existing, ~1 tahun) dan `rotDue` (existing, lewat batas).
2. Kartu banner otomatis-tampil (bukan behind-tab) di `view_dashboard2.tsx` untuk tier `rotAlert`, gated peran yang sudah dipakai modul ini (Partner/Manager+VIEW_ALL).

**D — Keterhubungan Sanksi & Disiplin**
1. Tambah `cpe` ke `LINEAGE.hrcase.down` (dan/atau `up` jika arahnya "sanksi bisa mewajibkan remedial training") — perubahan kecil murni.
2. Tambah `hrcase` ke `RELATED_SA` bila ada standar terkait (kode etik/independensi).
3. Untuk efek fungsional: **butuh keputusan bisnis eksplisit** (lihat Open Questions) sebelum kode ditulis — semantik yang salah di sini (mis. otomatis memotong kredit CPE) bisa keliru secara profesional.

## 9. Risks

- **B (gate akses)**: risiko mengunci staf dari pekerjaan sah bila logic keliru atau data `ETHICS_DECL` tidak lengkap untuk semua pegawai aktif → perlu fallback graceful (warn dulu sebelum enforce, atau scope sempit dulu).
- **A (auto-sync)**: `TRAINING_ATTENDANCE` adalah data baru — perlu keputusan siapa yang menandai "selesai" (self-report vs admin-confirmed) agar tidak jadi vektor kecurangan kredit SKP.
- **D (efek fungsional)**: tanpa kejelasan semantik bisnis, ada risiko implementasi yang secara tidak sengaja "menghukum ganda" (kasus HR otomatis menurunkan kredit CPE/rating Kinerja) — ini keputusan kebijakan SDM, bukan keputusan teknis.

## 10. Implementation Plan (diusulkan, urutan independen — bisa dikerjakan per-item)

1. D (dock link `cpe`, `RELATED_SA`) — paling kecil, low-risk, bisa duluan.
2. C (ambang + banner dashboard) — kecil-menengah, tidak mengubah kontrak data existing.
3. A (attendance data + canon sync function + UI sumber-kredit) — menengah, data model baru.
4. B (gate akses) — paling sensitif, terakhir, setelah lingkup diputuskan.

Setiap tahap: implementasi → `npm run typecheck` + `npm run lint` + `npm test` (migration) hijau → verifikasi live di preview (role sesuai gate) → baru lanjut tahap berikut.

## 11. Open Questions (perlu keputusan Ari sebelum coding)

1. **B — lingkup blokir**: aksi apa saja yang diblokir jika Kode Etik/AML belum sign-off? (a) hanya sign-off WP milik staf ybs, (b) approval opini, (c) seluruh akses modul kerja, (d) kombinasi granular per-kapabilitas. Rekomendasi saya: mulai dari (a)+(b) saja — cakupan sempit, risiko lock-out rendah, bisa diperluas kalau terbukti efektif.
2. **B — override**: siapa yang bisa override staf yang belum sign-off (Partner saja? FIRM_ADMIN?), dan apakah override tercatat sebagai exception log?
3. **A — verifikasi kehadiran**: kredit SKP otomatis dipicu oleh apa — self-report pegawai, atau konfirmasi admin/HR? (Ini menentukan apakah perlu approval step tambahan supaya tidak jadi celah kecurangan kredit.)
4. **C — audiens alert**: apakah peringatan dini rotasi hanya untuk Partner/Manager (internal firm), atau juga perlu tercermin di Engagement Cockpit per-klien (supaya tim engagement tahu APnya mendekati batas)?
5. **D — semantik keterhubungan fungsional**: maksud "hubungkan ke CPE/Kinerja/Kode Etik" itu konsekuensi macam apa? Contoh interpretasi: (i) sanksi bisa **mewajibkan** remedial training yang muncul sebagai item wajib di Pelatihan pegawai ybs (paling masuk akal), (ii) sanksi **mencatat referensi silang** ke deklarasi Kode Etik yang dilanggar (audit trail, bukan mutasi), (iii) sanksi memengaruhi rating Kinerja (kebijakan SDM, sensitif). Saya rekomendasikan (i)+(ii) untuk rilis pertama; (iii) saya sarankan **tunda** — itu keputusan kebijakan SDM/legal, bukan gap teknis.

---

**Status: menunggu keputusan atas Open Questions #1-5 dan konfirmasi "Proceed." sebelum implementasi dimulai**, sesuai gerbang PRD-first di working instructions. Saya bisa mulai dari item yang paling tidak ambigu (D lalu C) sambil menunggu keputusan untuk A dan B, jika itu yang diinginkan — beri tahu preferensinya.
