# USULAN-PENGEMBANGAN — dari Evaluasi Kedalaman Fitur (E-9, 2026-08-13)

> Salinan dari `Asseris-Eval-Output\E-9\USULAN-PENGEMBANGAN.md` (2026-08-14).
> Ringkasan hasil: [`PRD-RINGKASAN-KEDALAMAN-E9.md`](PRD-RINGKASAN-KEDALAMAN-E9.md).
> Katalog kandidat PRD gelombang E-1..E-8 (versi sebelumnya): [`PRD-KATALOG-EVALUASI-158-MODUL.md`](PRD-KATALOG-EVALUASI-158-MODUL.md).

> Metode: 158 modul dievaluasi kedalaman fitur L0–L5 (BRIEF-E9.md) oleh 9 sub-agen paralel,
> disintesis dengan sinyal otomatis kode + laporan E-1..E-8 + PRD-REGISTRY (63 PRD).
> Dokumen ini = jawaban "apa yang harus dikembangkan" berdasarkan gap kedalaman.

## 1. Ringkasan eksekutif

**Keadaan kedalaman 158 modul (rata-rata 2,78/5):**

| Metrik | Nilai | Makna |
|---|---|---|
| Rata-rata agregat | **2,78/5** | Mayoritas modul: server-backed (L4 ceiling) tapi fitur output/gate dangkal |
| Ceiling L4 (server-backed) | **128 modul (81%)** | Fondasi SSOT + persistensi server sudah kuat hampir di mana-mana |
| Ceiling L5 (siklus hidup penuh) | **8 modul (5%)** | aje, workpapers, onboarding, continuance, approvals, ethics, crypto, records |
| Ceiling L1 (display-only) | **7 modul (4%)** | sa200, sa501, sa800, sa805, sa810, spr2400, sjah3000 |
| L0 (fallback) | 1 modul | sakep |
| Ekspor tersegel | 37/158 | Output = gap terbesar produk (konsisten E-1..E-8: D=2,5) |
| Gate RBAC view | 38/158 | MODULE_CAP hanya 4 modul SDM; grup Keuangan/OJK tanpa gate |
| aria-label | 4/158 | Gerbang axe button-name gagal massal |
| Tanggal beku | 53/158 | Klok SSOT AMS.TODAY baru dipakai 2 view |

**Tiga kesimpulan strategis:**
1. **Input sudah matang, output tertinggal.** Platform membangun SSOT server yang sangat baik (canon + tRPC + useAmsPersist); yang belum naik kelas adalah *hasil kerja*: ekspor tersegel W10.5, jejak audit server, sign-off/SoD, dan RBAC view.
2. **Tidak ada PRD baru yang besar diperlukan** — yang ada adalah **program naik-kelas** (L3→L4→L5) di 6 jalur sistemik (A ekspor massal · B klok-tarif-scope · C integritas server · D a11y · E ledger-based reporting & SoD finansial · F navigasi lintas modul) + perbaikan 12 modul terdangkal.
3. **Role model sudah terbukti** (aje, records, crypto, onboarding): pola L5 = server state + audit chain + ekspor tersegel + SoD. Tinggal direplikasi.

---

## 2. Peta kedalaman per grup (prioritas pengembangan)

| Grup | n | Avg | Prioritas | Alasan |
|---|---|---|---|---|
| SA · Area Khusus & Perikatan | 10 | **1,50** | 🔴 TINGGI | 5 display-only (L1) + 4 SJAH key firm-scope (L4⚠️) |
| Keuangan Firma (ERP) | 8 | **2,45** | 🔴 TINGGI | Tanpa gate RBAC; tanggal beku ×7; ekspor hanya 4/8 |
| Ruang Kerja Perikatan | 6 | 2,48 | 🔴 TINGGI | Tanpa ekspor sama sekali; tanggal beku ×4 |
| Area Khusus & Estimasi | 12 | 2,50 | 🟠 SEDANG | 12 modul ceiling L4 tapi agregat rendah (output) |
| Portal & Dokumen | 3 | 2,57 | 🟠 SEDANG | dms.v2 firm-scope; tanggal beku |
| Akuntansi (PSAK & SAK) | 27 | 2,59 | 🟠 SEDANG | 16 tombol KK mati; 0 aria; sign-off 4/27 |
| 2 · Pelaksanaan | 7 | 2,59 | 🟠 SEDANG | wtb/aje L5 tapi jet/asersi/analytical output lemah |
| Referensi & Indeks | 3 | 2,63 | 🟡 RENDAH | 3 tombol ekspor mati (kb/templates) |
| SA · Tanggung Jawab (200) | 6 | 2,66 | 🟡 RENDAH | sa200 L1; lainnya L4 kuat |
| OJK | 4 | 2,75 | 🟠 SEDANG | ojkfiling TODAY beku; tanpa ekspor |
| Operasi Praktik | 6 | 2,73 | 🟠 SEDANG | pipeline/billing tanpa ekspor; tarif terpecah |
| SA · Bukti Audit (500) | 5 | 2,84 | 🟡 RENDAH | sa501 L1; 520/530/540 kuat |
| Penyelesaian & Pelaporan | 5 | 2,90 | 🟡 RENDAH | mgmtletter amsPrintDoc; fsgen key scope |
| Platform Firma | 3 | 2,90 | 🟠 SEDANG | audittrail pseudo-hash P1; integrations who hardcode |
| SDM & Kepatuhan | 12 | 3,37 | 🟢 KUAT | Gate + server kuat; tinggal ekspor merata |
| Operasi & Admin Firma | 14 | **3,66** | 🟢 KUAT | records/approvals/crypto/pdp = role model |

---

## 3. Program prioritas (4 jalur sistemik — rekomendasi utama)

### Program A — "Output Naik Kelas" (ekspor tersegel massal) [M, 2–3 minggu]
**Masalah:** hanya 37/158 modul punya ekspor; 101/158 skor D≤2; 50+ tombol "Ekspor/Kertas Kerja" tanpa onClick.
**Usulan:** satu PRD "Ekspor Tersegel Massal" (perluasan W10.5 yang sudah Implemented):
1. Wire tombol mati yang sudah ada (14 "Kertas Kerja" PSAK, Export Register compmatrix, Ekspor Indeks kb, Unduh/Unggah templates, 3 tombol sa800/805/810, Memo SE subsequent, Export Kertas Kerja analytical).
2. Tambah ekspor untuk modul prioritas: memo materialitas, SAD ringkasan, program audit, register review notes, timesheet, Gantt jadwal, register SDM (hcm/payroll/compmatrix), faktur billing (ganti amsPrintDoc → amsExportPdf), laporan reviu spr2400/review2400.
3. **Gelombang ekspor PSAK** (sub-agen C2): urut berdasarkan kematangan angka — psak46/psak71/ecl → psak14/psak72 → sisanya (16 tombol "Kertas Kerja" mati; hanya psak16 yang sudah tersegel XLSX).
3. Standar: semua lewat `amsExportPdf`/`amsExportXlsx` (otomatis tersegel Ed25519). Hapus jalur `amsPrintDoc` untuk output klien.
**Dampak:** D rata-rata 2,5 → ~3,8; memenuhi W10.5 & SPAP kertas kerja.

### Program B — "Satu Klok, Satu Tarif, Satu Scope" [M, 2 minggu]
**Masalah:** tanggal beku 53 modul ('2026-03-09' dominan; data_ojk TODAY 2026-06-17) + tarif terpecah (profitability RATE_CARD vs FIRMFIN.WIP_BILL vs CKP_RATE vs TB_FEE vs pipeline 700rb) + key firm-scope bocor (ga*, pfi3400.exec, soc3402.exec, ghg3410.exec, pf3420.exec, fsgen.disclosures, mgmtletter.findings, pbc.v2, portalMsgs.v2, dms.v2).
**Usulan:**
1. Ganti semua `'2026-*'` beku → `AMS.TODAY` (pola view_audittimeline/view_delivery yang sudah benar). Cakupan: cockpit, tasks, reviewnotes, time, firmgl, apar, pipeline, clientportal, dms, pppk, ojkfiling, sa710, sa580, mgmtletter (P0!).
2. SSOT tarif tunggal `FIRMFIN.WIP_BILL` — konsumen: profitability, pipeline, billing, time, cockpit. Termasuk kebijakan firma lain yang terpecah (CHARGE_MULT 2.4, ambang margin/util/zonas, FX_BOOK, RATE 0.22) → konsolidasi ke data_firmfin/canon_tax.
3. Registri scope persistensi: daftarkan key engagement yang belum terdaftar (AMS_PERSIST_SCOPE/PR4_ENGAGEMENT_KEY_RE) → server tolak firm-scope untuk data engagement.
**Dampak:** menghilangkan P0 mgmtletter; aging/SLA benar; tidak ada bocor lintas-perikatan.

### Program C — "Integritas Server, Bukan Tampilan" [M, 1–2 minggu]
**Masalah:** audittrail (view_platform3) menampilkan "Terverifikasi" dengan chain FNV-1a lokal (pseudoHash); `logActivity` = append state lokal; integritas klaim ≠ server.
**Usulan:**
1. audittrail → sambungkan `audit.list`/`audit.verify` (server chain sha256 sudah ada & dipakai view_crypto).
2. `logActivity` → kirim ke server chain (state.set / audit event), bukan setState lokal.
3. `integrations` `who: 'Anindya Pramesti'` hardcode → identitas sesi `useCurrentAuditor`.
4. Ekspor log audit tersegel (jejak append-only).
5. **Rantai L5 percontohan di PSAK** (sub-agen C2): belum ada satu pun modul PSAK yang L5 — selesaikan rantai lengkap pada psak71 (audit.list/verify + state.set + sign-off + ekspor tersegel), lalu replikasi ke psak46/ecl/psak117.
**Dampak:** klaim "Immutable/Terverifikasi" jadi benar secara kriptografis; kepatuhan W10 & P2PK.

### Program D — "Aksesibilitas & Kontrol Native" [S-M, 1 minggu]
**Masalah:** 0 aria-label di 154/158 view; 91 view pakai span/div onClick; 12+ half-step fontSize; 124 view hex hardcode.
**Usulan:**
1. PRD "A11y Massal": tombol ikon ber-aria-label/title (gate axe), ganti span/div onClick → `<Switch>`/`<Check>`/`<Btn>` native.
2. Ganti half-step fontSize (12.5/13.5/14.5) → skala 8 ukuran.
3. Token chart: donut/badge hex berulang (#005085/#0a6b73/#5b3fa6/#1f7a4d/#c79a1e/#b3261e + hero gradient) → token CSS var (P2 sistemik; isak35 styleFor() 23 hex = P1 refactor).
**Dampak:** lolos gate axe; keyboard-operable; konsistensi visual.

---

## 4. Modul prioritas perbaikan (12 terdangkal — jadikan kertas kerja)

| Modul | Ceiling | Agg | Masalah | Usulan (target) |
|---|---|---|---|---|
| **sakep** | L0 | 0,3 | SATU-SATUNYA fallback ComplianceView | Bangun `view_sakep.tsx` (L) — PRD AK-01 Draft siap |
| **diagnostic** | L2 | 0,8 | Lensa agregat read-only | Drill-down per temuan + ekspor (M) — PRD AI Tax Diagnostic Draft |
| **internalaudit** | L4 | 1,0 | Evaluasi SA 610 hardcode seed | Mesin evaluasi dari assessment_model + WpPanel + ekspor (M) |
| **sa200** | L1 | 1,0 | Display-only; tombol Memo/AI Assist mati | Jadikan kertas kerja: sign-off server + ekspor (S) |
| **sa800/805/810** | L1 | 1,0 | 3 tombol mati; ttd "Hartono Wijaya" hardcode | Wire ekspor + ttd dari sign-off nyata (M) — PRD Auditable Draft |
| **spr2400** | L1 | 1,0 | Materialitas hardcode 900 jt (SSOT!) | Fix SSOT + ekspor laporan reviu (M) |
| **sjah3000** | L1 | 1,0 | Unduh mati; ttd hardcode | Wire ekspor + ttd server (S) |
| **sa501** | L1 | 1,25 | Data contoh hardcode | Wire confirmState.v1 (PRD SA 505) + ekspor (M) |
| **invprop** | L2 | 1,4 | Portofolio HARDCODED literal di view (P1) | Tarik dari canon_part2 valueInUse + WTB (S) |
| **ojkfiling** | L3 | 1,4 | TODAY beku 2026-06-17 | AMS.TODAY + ekspor filing (S) |
| **sjah3400/3402/3410/3420** | L4⚠️ | 1,5 | Key firm-scope bocor; tanpa ekspor | Daftarkan key engagement-scope + ekspor laporan asurans (M) |
| **audittrail** | L3 | 1,7 | Pseudo-hash lokal; klaim menyesatkan | Sambung audit.verify server (M) — Program C |
| **firmgl** | L4 | 2,0 | **P0**: posting jurnal TIDAK mengubah TB/LK (seed statis) | Komputasi saldo dari jurnal; ekspor GL/TB/LK (M) — Program E |
| **profitability** | L4 | 3,0 | **P0**: RATE_CARD duplikat FIRMFIN.WIP_BILL; realisasi hardcode | SSOT FIRMFIN.WIP_BILL; realisasi dari WIP nyata (S) — Program B |

---

### Program E — "Ledger-based Reporting & SoD Finansial" [L, 3–4 minggu]
**Masalah (B1, sub-agen E-4/E-9):** angka sintesis "kelihatan konsisten" tapi TIDAK dari data nyata: revenue roll-forward ×0.74/0.32 fiktif; firmgl TB/LK dari seed (posting jurnal tak berdampak — P0); firmtax SPT/bukti potong literal; treasury fasing wq; fixedassets capex Rp 0; wipreal write-down +25jt literal. Semua 14 modul keuangan ceiling L4 tapi 0 L5, 13/14 tanpa gate RBAC view.
**Usulan:**
1. **P0 firmgl**: komputasi saldo TB/LK dari jurnal nyata (posting berdampak), bukan seed statis — prasyarat seluruh ERP firma.
2. **SoD finansial**: gate FINANCE/ENGAGEMENT_MANAGE + logActivity di semua aksi tulis (payAp, markPaid, markFiled, posting jurnal, toggle rekon); capacity = template gate dua-lapis.
3. **Ledger-based reporting**: revenue roll-forward, firmtax SPT, treasury fasing, wipreal write-down — semua diturunkan dari ledger/WIP nyata atau ditandai eksplisit "ilustrasi".
**Dampak:** ERP firma menjadi dapat dipertanggungjawabkan (bukan demo); syarat KAP nyata.

### Program F — "Navigasi Lintas Modul" [S, 3–5 hari]
**Masalah (B3):** panel "Tautan Modul" tampil sebagai link tapi mati di sa240/sa260/sa530/sa540/sa250 — navigasi lintas SA putus; deep-link tab (useInitialTab) mati di sa701.
**Usulan:** komponen `RelatedNavDock` reusable dari RELATED_SA (icons.tsx sudah punya petanya) + `nav({from})` — 1 komponen, 5+ modul; backfill RELATED_SA 13 modul PSAK + B2 (hrcase↔ethics↔hcm, SA 230/SMM 1).

---

## 5. Kaitan PRD (status 2026-08-13)

**In Progress (tuntaskan dulu — 6):**
1. Kesiapan Pemeriksaan P2PK (SPM 1/2) — PR-4..7 menunggu; evaluasi ini menambah urgensi: audittrail server chain (Program C) = bukti SPM.
2. Penegakan Sign-off Berbasis Peran (Dua-Lapis) — Fase 3 test+docs; melengkapi Program A (ttd partner server).
3. Restrukturisasi Navigasi & Beranda — Fase 4-8; terkait gate RBAC (Program A/B).
4. W9 Konektor Data (Coretax live) — lanjutkan adapters.
5. Wedge MVP Diagnostik TB-GL — terkait diagnostic.
6. Legacy Window-Namespace Strip — kurangi window.* (27 view masih).

**Approved (eksekusi berjalan):** SA 570 Going Concern Lanjutan — goingconcern modul terkait (A1: tanpa tautan dampak opini → sertakan).

**Draft siap "Proceed." yang diangkat evaluasi ini (prioritas):**
- SA 530 & SA 540 Tab Analitik — sa530/sa540 sudah L4 kuat; tinggal tab analitik.
- SA 505 Confirmation Hub Auditable — confirm + sa501 + sad saling menunggu.
- W-WTB-1 Ingress TB (Paste-CSV) — wtb ingress.
- WTB PR-6 Otoritas Sign-off Materialitas — materiality sign-off.
- PRD SA 240 Fraud Substantif, SA 250, SA 260/265, SA 315, SA 402, SA 620 Auditable — register SA mendalam (sa240/250/260/265 sudah L4; tinggal auditable ekspor).
- SA-01 Sempit — onboarding (sudah L5, tinggal jejak user).
- Isolasi Data Personal (PDP) — pdp sudah L4 kuat (3,7); halaman Data Personal Saya sudah ada.
- Rekonsiliasi Fiskal PSAK 46 (Opsi 1 disetujui) — psak46.
- AK-01 Penomoran PSAK — sakep (L0) + psak*.

## 6. Kandidat PRD BARU (dari evaluasi ini — belum ada di registri)

| PRD usulan | Ukuran | Sumber gap |
|---|---|---|
| **Ekspor Tersegel Massal** (wire 50+ tombol mati + ekspor prioritas) | M | Program A; 37/158 ekspor |
| **SSOT Tarif & Klok Tunggal** (AMS.TODAY + FIRMFIN.WIP_BILL) | M | Program B; tanggal beku 53 modul |
| **Integritas Server Chain di Seluruh Modul** (audit.list/verify + logActivity server) | M | Program C; audittrail pseudo-hash |
| **A11y & Kontrol Native Massal** (aria-label + Switch/Check + token chart) | S-M | Program D; 154 view tanpa aria |
| **Registri Scope Persistensi + Gate** (daftar key engagement vs firm + MODULE_CAP keuangan/OJK) | M | Program B; key ga*/sjah* firm-scope; MODULE_CAP 4 modul |
| **Backfill RELATED_SA 13 modul PSAK** (psak2/22/48/58/65/66/68/73, segmen, invprop, assoc, newdisc, sakep — dari LINEAGE: SA 500/501/520/540/600/620) | XS | C2 pola 3; deklaratif di icons.tsx |
| **Kertas Kerja SA Display-only** (sa200/sa501/sa800/sa805/sa810/spr2400/sjah3000 → WP interaktif + ekspor) | L | 7 modul L1 |
| **Firm BI/Board Pack** (KPI live FIRMFIN/HCM + ekspor dewan) | M | bi/dashboard seed statis |
| **Gate RBAC Grup Keuangan & OJK** (keputusan siapa boleh lihat) | S | 12 modul tanpa gate baca |
| **Ledger-based Reporting** (firmgl komputasi dari jurnal + SoD finansial + roll-forward nyata) | L | B1; P0 firmgl; prasyarat ERP firma |
| **RelatedNavDock** (komponen navigasi lintas modul dari RELATED_SA + backfill) | S | B3; 5+ modul link mati |

## 7. Urutan eksekusi yang disarankan (sprint)

1. **Sprint 1 (1 minggu):** Program D (a11y massal, aman, gate CI) + fix P0: mgmtletter tanggal (AMS.TODAY), asersi PM hardcode, spr2400 materialitas.
2. **Sprint 2 (2 minggu):** Program B (klok+tarif+scope) — paling banyak modul terdampak, menghilangkan data salah.
3. **Sprint 3 (2 minggu):** Program A (ekspor massal) — D naik drastis; mulai dari modul engagement (materiality, sad, analytical, subsequent, related).
4. **Sprint 4 (2 minggu):** Program C (integritas server) + sakep (L0) + sa200/501/800/805/810 kertas kerja.
5. **Sprint 5 (lanjutan):** SJAH scope fix, bi/board pack, gate keuangan/OJK, internalaudit mesin.

**Prinsip:** tuntaskan In Progress → Approved → Draft yang sudah "Proceed."; PRD baru di atas mengikuti setelahnya (dokumen ini jadi dasar keputusan Ari).
