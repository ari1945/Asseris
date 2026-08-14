# RINGKASAN-E9 — Kedalaman Fitur 158 Modul (2026-08-13)

> Salinan dari `Asseris-Eval-Output\E-9\RINGKASAN-E9.md` (2026-08-14).
> Usulan pengembangan: [`PRD-USULAN-PENGEMBANGAN-E9-KEDALAMAN.md`](PRD-USULAN-PENGEMBANGAN-E9-KEDALAMAN.md).

> Sumber: 9 sub-agen (A1–C3) → 158 laporan `E-9/<batch>/<id>.md` + 9 `REGISTRY.md` di folder ini.
> Metode: analisis statis read-only; kedalaman L0–L5 per fitur (rubrik di BRIEF-E9.md).
> Perbedaan dari E-1..E-8: E-x menilai kualitas (A Input · B UI · C UX · D Output);
> E-9 menilai **kedalaman implementasi tiap fitur** — seberapa dalam fitur itu benar-benar bekerja.

## 1. Distribusi kedalaman (final — 158 modul)

| Level | Makna | Jumlah | Contoh |
|---|---|---|---|
| L0 | Tidak ada (fallback generik) | 1 (1%) | sakep |
| L1 | Display statis | 7 (4%) | sa200, sa501, sa800, sa805, sa810, spr2400, sjah3000 |
| L2 | Interaktif lokal | 3 (2%) | diagnostic, invprop, newdisc |
| L3 | Persisten lokal | 7 (4%) | ojkfiling, audittrail, pppk, bi, crm, governance, soqm |
| L4 | Server-backed | 128 (81%) | mayoritas; SSOT + persist server |
| L4⚠️ | Server-backed + cacat scope | 4 (3%) | sjah3400, sjah3402, sjah3410, sjah3420 (key firm-scope) |
| L5 | Siklus hidup penuh | 8 (5%) | aje, workpapers, onboarding, continuance, ethics, records, crypto, approvals |

**Skor agregat rata-rata: 2,78/5 · median 2,90/5** (agregat = rata-rata level seluruh fitur per modul, termasuk fitur absen = L0).

| Bucket agregat | Jumlah modul |
|---|---|
| < 1,5 | 12 |
| 1,5 – 2,5 | 30 |
| 2,5 – 3,5 | 90 |
| 3,5 – 4,5 | 26 |
| 4,5+ | 0 |

## 2. Rata-rata agregat per grup (urutan prioritas pengembangan)

| Grup | n | Avg | Catatan |
|---|---|---|---|
| SA · Area Khusus & Perikatan | 10 | 1,50 | 5 display-only L1 + 4 SJAH scope bocor |
| Keuangan Firma (ERP) | 8 | 2,45 | tanpa gate RBAC; tanggal beku ×7 |
| Ruang Kerja Perikatan | 6 | 2,48 | tanpa ekspor sama sekali |
| Area Khusus & Estimasi | 12 | 2,50 | ceiling L4 semua, output dangkal |
| Portal & Dokumen | 3 | 2,57 | dms.v2 firm-scope; tanggal beku |
| Akuntansi (PSAK & SAK) | 27 | 2,59 | 16 tombol KK mati; 0 aria; sign-off 4/27 |
| 2 · Pelaksanaan | 7 | 2,59 | wtb/aje L5; jet/asersi/analytical lemah |
| Referensi & Indeks | 3 | 2,63 | kb/templates tombol mati |
| SA · Tanggung Jawab (200) | 6 | 2,66 | sa200 L1 |
| OJK | 4 | 2,75 | ojkfiling TODAY beku |
| Operasi Praktik | 6 | 2,73 | pipeline/billing tanpa ekspor |
| SA · Bukti Audit (500) | 5 | 2,84 | sa501 L1 |
| Penyelesaian & Pelaporan | 5 | 2,90 | mgmtletter amsPrintDoc; fsgen key scope |
| Platform Firma | 3 | 2,90 | audittrail pseudo-hash |
| SDM & Kepatuhan | 12 | 3,37 | gate + server kuat |
| Operasi & Admin Firma | 14 | 3,66 | records/approvals/crypto/pdp role model |

## 3. Temuan sistemik (final dari 158 laporan)

**Tema gap terbesar** (dari kolom "gap utama" laporan):
1. **Ekspor/dead button: 103 modul** — hanya 37/158 punya ekspor tersegel; 50+ tombol "Ekspor/Kertas Kerja" tanpa onClick (14 di PSAK, 3 di sa800/805/810, Export Register, Ekspor Indeks, Unduh/Unggah).
2. **Hardcode/tanggal beku: 53 modul** — '2026-03-09' dominan (cockpit ×11, mgmtletter ×30, firmgl, apar, pipeline); data_ojk TODAY 2026-06-17; AMS.TODAY hanya dipakai 2 view.
3. **Gate RBAC: 23 modul** — MODULE_CAP hanya 4 modul SDM; grup Keuangan/OJK/Referensi tanpa gate baca; 38/158 view meng-gate.
4. **Scope bocor: 9 modul** — key firm-scope untuk data engagement: ga* (groupaudit), pfi3400.exec/soc3402.exec/ghg3410.exec/pf3420.exec (SJAH), fsgen.disclosures, mgmtletter.findings, pbc.v2/portalMsgs.v2 (clientportal), dms.v2.
5. **Segel: 8 modul** — ekspor lewat amsPrintDoc (tanpa segel) untuk output klien: mgmtletter, strategy, billing, payroll.
6. **Kontrol palsu: 11 modul** — span/div onClick (91 view secara sinyal; per laporan teratas: cockpit, crypto, firmfinance, pdp, firmgl, misc2, onboarding, related, relatedsvc, tax23).
7. **aria-label: 3 modul** (per laporan; sinyal: 154/158 view = 0 aria-label) — gate axe button-name gagal massal.

**Pola kualitas lainnya:**
- L5 role model: **aje** (server+jejak+SoD+ekspor+immutable), **workpapers** (rantai sign-off multi-slot), **onboarding/continuance** (memo tersegel Ed25519+SoD ganda), **ethics** (canSignOwn+server), **records** (siklus hidup bukti), **crypto** (audit.verify server), **approvals** (keputusan v4+write-back).
- Modul "server-kuat tapi D≤2" (28): pipeline, billing, capacity, hcm, recruitment, learning, leave, cpe, ethics, independence, hrcase, firmgl, apar, nonaudit, review2400, relatedsvc, assurance, soqm, clientportal, teamindep, materiality, icfr, groupaudit, sad, psak1/19/48/68 — input SSOT baik, output/gate yang gagal.
- Modul berbagi view (15 file → 35 modul): kedalaman bisa beda per modul (hcm vs cpe vs independence; treasury vs cashbank vs fixedassets) — nilai per modul, bukan per file.
- Modul "lensa SSOT" (sa701/sa705/sa710/sa720, fsgen, cockpit, opinion) tanpa ekspor sendiri = **by design L4** (SSOT di Generator Opini), jangan dianggap gap.

## 4. Modul kedalaman tertinggi (role model untuk direplikasi)

| Modul | Ceiling | Agg | Alasan |
|---|---|---|---|
| crypto | L5 | 4,3 | rantai audit server (audit.verify) + ekspor jejak append-only |
| records | L5 | 4,1 | siklus hidup bukti server lengkap (retensi/legal hold/purge) |
| onboarding | L5 | 4,0 | memo tersegel Ed25519 + SoD ganda |
| approvals | L5 | 4,0 | keputusan server + guardSignoffWrite + write-back WTB |
| ethics | L5 | 3,8 | tanda tangan canSignOwn + jalur server declareSelf + gerbang sign-off |
| licensing | L4 | 3,8 | SSOT izin + rotTier ambang tunggal + PPL←CPE + ekspor |
| strategy | L4 | 3,7 | gate server guardSignoffWrite |
| aje | L5 | 3,7 | siklus hidup penuh (server+jejak+SoD+ekspor+immutable) |
| continuance | L5 | 3,7 | memo tersegel + SoD keputusan |
| personal | L4 | 3,7 | isolasi self-scope server + audit SELF_SERVICE |
| facilities/insurance/pdp/wip | L4 | 3,7 | mesin SSOT + ekspor tersegel |
| sa540 | L4 | 3,67 | ekosistem SSOT estimasi + PSAK 48 hidup + SAD |

## 5. Modul kedalaman terendah (prioritas perbaikan — detail di USULAN-PENGEMBANGAN.md §4)

sakep (L0, 0,3) · diagnostic (L2, 0,8) · internalaudit (L4, 1,0) · sa200 (L1, 1,0) · sa800/805/810 (L1, 1,0) · spr2400 (L1, 1,0) · sjah3000 (L1, 1,0) · sa501 (L1, 1,25) · invprop (L2, 1,4) · ojkfiling (L3, 1,4) · sjah3400/3402/3410/3420 (L4⚠️, 1,5) · audittrail (L3, 1,7) · pppk (L3, 1,7) · newdisc (L2, 1,8) · evidence (L4, 2,0) · time (L4, 2,0).

## 6. Perlu verifikasi live (statis tak bisa membuktikan)
- Segel Ed25519 end-to-end (exportSeal) pada semua jalur amsExportPdf/Xlsx.
- Gate tRPC server untuk jalur tulis modul tanpa gate view (firmgl, apar, treasury, clientportal, dms, soqm, pppk, sjah*).
- Aksesibilitas nyata: axe scan + keyboard pada kontrol palsu yang terdaftar.
- AMS.TODAY vs data demo 2026 (apakah aging benar saat data nyata).
- personal.get / personalScope: data personal benar ter-isolasi server.
- Konsistensi angka end-to-end: WTB → psak71 → ecl → psak46; psak16 vs FS Generator.
- logActivity (append state lokal, slice 50) vs server chain — mana yang tampil di UI.

## 7. Artefak
- 158 laporan `E-9/<batch>/<id>.md` + 9 `REGISTRY.md` + `BRIEF-E9.md` + `USULAN-PENGEMBANGAN.md` (roadmap lengkap) + `RINGKASAN-E9.md` di folder ini (di luar repo; repo tetap bersih).
- Rekomendasi: setelah disetujui, salin `USULAN-PENGEMBANGAN.md` → `docs/` repo sebagai dasar keputusan PRD baru.
