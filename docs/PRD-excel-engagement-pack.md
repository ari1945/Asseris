# PRD — Asseris Engagement Pack (Excel)

> Status: **✅ SIGNED-OFF & DIIMPLEMENTASI (F1+F2 penuh)** · sign-off Ari 2026-07-09 (scope: Full 30+ sheet ·
> .xlsx tanpa makro · kosong + contoh mini). Deliverable: `Asseris Engagement Pack (Excel).xlsx` (root) —
> generator di `tools/excel-pack/` (36 sheet, 0 error formula via Excel COM recalc, nilai kunci terverifikasi:
> OM/PM/CTT kanon, AJE auto-post, neraca & arus kas check = 0, MUS, Benford).
> Sumber scope: registry navigasi `migration/src/icons.tsx` (workspace `engagement`, 6 grup / 36 modul) + mesin hitung `AMS_CANON` (`canon*.ts`).

## 1. Problem

Asseris adalah aplikasi server (React + tRPC + Postgres). Ada segmen pengguna yang tidak bisa/belum mau memakainya: KAP kecil tanpa infrastruktur, engagement lapangan offline, dan prospek yang perlu mencicipi metodologi Asseris tanpa deploy. Permintaan: **template Excel untuk lingkup Perikatan (engagement) saja**, dengan fitur "persis seperti Asseris".

**Koreksi klaim di muka (truth over agreement):** parity *persis* tidak mungkin. Excel tidak bisa mereplikasi RBAC/SoD server-side, sign-off ber-versi (StateDoc + CAS), audit trail hash-chained, segel Ed25519, copilot LLM, konektor Coretax, dan multi-user konkuren. Yang BISA direplikasi dengan fideltas tinggi justru inti metodologinya: **SSOT angka** (WTB → semua modul hilir via formula/named ranges, meniru `AMS_CANON`), kalkulasi materialitas/sampling/SAD, dan struktur register per-SA. PRD ini mendefinisikan parity yang jujur per modul: **P** (penuh — logika kalkulasi direplikasi formula), **D** (degradasi — register/checklist tanpa enforcement), **H** (hilang).

## 2. Objective

Satu workbook Excel per engagement ("Engagement Pack") yang:
1. Mereplikasi alur kerja Perikatan Asseris: setup → planning → execution → specifics → finalisasi.
2. Menghasilkan angka **identik dengan `AMS_CANON`** untuk input yang sama (OM/PM/CTT, posting AJE→WTB→LK, interval MUS, iron-curtain SAD).
3. Bisa dipakai auditor non-teknis tanpa merusak formula (proteksi sheet selektif).

## 3. Success Criteria

- [ ] Kasus uji paralel: input WTB + parameter yang sama di Asseris dan di workbook → OM/PM/CTT, saldo final per akun, total LK, dan flag SAD **identik rupiah-per-rupiah**.
- [ ] Nol angka hardcode di sheet hilir — semua menarik dari named ranges (`OM`, `PM`, `CTT`, `TB_FINAL`, dst.). Uji: ubah benchmark di Setup → materialitas, SAD, analytical, sampling ikut bergeser tanpa edit lain.
- [ ] AJE diposting via register (SUMIFS), bukan edit manual kolom WTB.
- [ ] Sheet terproteksi: hanya sel input yang bisa diedit; user awam tidak bisa menghapus formula tanpa sengaja.
- [ ] Bahasa Indonesia, format `Rp 1.850.000.000`, negatif dalam kurung (match `rp()`).
- [ ] Dashboard (Cockpit) menghitung % kelengkapan per fase dari status WP — turunan, bukan diketik.

## 4. Scope — pemetaan 36 modul Perikatan → sheet

### Grup Engagement Workspace
| Modul Asseris | Sheet Excel | Parity |
|---|---|---|
| Engagement Cockpit | `00_Cockpit` — dashboard progress per fase, roll-up status WP, ringkasan OM/SAD | **P** |
| My Tasks | `01_Tugas` — daftar tugas + penanggung jawab | **D** (tanpa isolasi per-user) |
| Audit Programme | `02_Program` — program audit per siklus, status per prosedur | **P/D** |
| Review Notes | `03_CatatanReviu` — register catatan reviu open/closed | **D** (tanpa threading/role) |
| Time & Budget | `04_TimeBudget` — anggaran vs aktual jam per staf/area, varians | **P** |
| Jadwal & Lini Masa | `05_Timeline` — Gantt via conditional formatting | **P** |

### Grup Core Planning
| Modul | Sheet | Parity |
|---|---|---|
| Risk Assessment (SA 315) | `10_Risiko` — register risiko × asersi × respons, dropdown, RoMM heat | **P** |
| Materiality (SA 320) | `11_Materialitas` — benchmark table, OM = benchmark × %, PM = 75% × OM, CTT = 5% × OM (default = canon; % dapat diubah) | **P** |
| Internal Control | `12_ICFR` — matriks pengendalian per siklus, D&I, TOC | **D** |
| Strategy Memo (SA 300/330) | `13_StrategyMemo` — form memo + tautan risiko→respons | **D** |

### Grup Core Execution (jantung workbook)
| Modul | Sheet | Parity |
|---|---|---|
| Working Trial Balance | `20_WTB` — kolom: saldo PY · unadjusted CY · AJE · RJE (SUMIFS dari register) · final · mapping baris LK | **P** |
| Adjusting Entries | `21_AJE` — register jurnal (no, akun, Dr/Cr, alasan, status) auto-post ke WTB | **P** |
| Working Papers | `22_IndeksWP` — indeks WP + kolom sign-off Preparer/Reviewer/Partner (tanpa enforcement SoD — dicatat sebagai keterbatasan) | **D** |
| Matriks Asersi (SA 315) | `23_Asersi` — coverage asersi × akun signifikan, gap flag | **P** |
| Analytical Review (SA 520) | `24_Analitis` — flux CY vs PY, rasio, ambang % dan Rp (terikat CTT), flag otomatis | **P** |
| Journal Entry Testing (SA 240) | `25_JET` — Benford digit-1, akhir pekan, angka bulat, near-materiality | **P** (berat; batas praktis ±50rb baris GL) |
| Tax Audit Diagnostic | `26_BookTax` — rekonsiliasi book-tax deterministik saja | **D** (narasi LLM hilang) |
| — (dari grup SA 500) Sampling SA 530 | `27_Sampling` — MUS: interval = PM/faktor, seleksi sistematis, proyeksi salah saji (default TM = PM, match canon) | **P** |

### Grup Core Specifics
| Modul | Sheet | Parity |
|---|---|---|
| Confirmation Hub (SA 505) | `30_Konfirmasi` — log kirim/terima/alternatif, rekap coverage | **P/D** |
| Going Concern (SA 570) | `31_GC` — indikator + rasio otomatis dari WTB | **P** |
| Opening Balance (SA 510) | `32_SaldoAwal` | **D** |
| Subsequent Events (SA 560) | `33_PeristiwaSetelah` | **D** |
| Related Parties (SA 550) | `34_PihakBerelasi` | **D** |
| Group Audit (SA 600) | `35_GrupAudit` — scoping komponen + materialitas komponen (formula) | **P/D** |
| Internal Audit (SA 610) · Expert (SA 620) · Service Org (SA 402) | `36_Reliance` — satu sheet gabungan tiga register | **D** |
| SAD Ledger (SA 450) | `37_SAD` — iron-curtain vs rollover, banding otomatis ke OM/PM/CTT, keputusan koreksi | **P** |
| Evidence Evaluation (SA 500) | `38_EvaluasiBukti` — skor kecukupan/ketepatan per area | **D** |

### Grup Finalisasi & Pelaporan
| Modul | Sheet | Parity |
|---|---|---|
| FS Generator | `40_LK` — Neraca + L/R (+ arus kas tidak langsung) dari mapping WTB | **P** |
| Daftar-Uji Pengungkapan | `41_Pengungkapan` | **D** |
| Opinion Generator (SA 700/705) | `42_Opini` — decision tree dropdown (pervasif? material?) → teks opini terakit formula | **P** |
| EQR Workflow (ISQM 2) | `43_EQR` — checklist EQR + gate indikator (flag, bukan blokir) | **D** |
| Management Letter (SA 260/265) | `44_ML` — register temuan → draf ML | **D** |

### Grup Referensi & Indeks
| Modul | Sheet | Parity |
|---|---|---|
| Matriks Kepatuhan | `90_MatriksSA` — indeks silang sheet ↔ SA/SPAP | **D** |
| Template Library · Knowledge Base | — | **H** (tidak relevan dalam workbook) |

### Sheet tambahan (bukan modul, tapi wajib)
- `SETUP` — identitas engagement, periode, benchmark, % OM/PM/CTT, parameter sampling. Sumber semua named ranges.
- `PETUNJUK` — cara pakai, urutan pengisian, keterbatasan vs Asseris (jujur, tertulis).

## 5. Non-Scope

- **Enforcement** apa pun: SoD sign-off, lifecycle gates (di Excel hanya jadi flag merah, bukan blokir), RBAC.
- Audit trail, versioning, segel dokumen, kepatuhan SA 230 penuh atas dokumentasi elektronik.
- Multi-user konkuren; workbook = satu editor pada satu waktu.
- Copilot/LLM, konektor (Coretax, e-Faktur), portal klien/PBC.
- Modul workspace **Firma** seluruhnya (payroll, firm finance, HCM, dst.) — permintaan eksplisit "Engagement saja".
- Halaman referensi SA/PSAK mendalam (grup tersembunyi) — bukan alat kerja, melainkan konten.

## 6. Constraints

- **Tanpa makro (.xlsx) sebagai default** — kebijakan keamanan IT klien/KAP umumnya memblokir .xlsm; portabilitas > fitur. VBA menjadi fase opsional.
- Formula harus kompatibel Excel 2019+ (hindari LAMBDA; LET/dynamic array boleh bila fallback tersedia — diputuskan saat build).
- Ukuran: JET/Benford atas GL penuh adalah beban terberat; batas praktis ±50rb baris.
- Dibangun via **skrip Python (openpyxl)**, bukan diketik manual — supaya reproducible, bisa diregenerasi, dan bisa diuji otomatis (paralel test vs nilai canon).

## 7. Existing Solutions

- **ATLAS** (PPPK/Kemenkeu + IAPI) — alat kerja audit berbasis Excel yang sudah dikenal KAP Indonesia. Kuat di kepatuhan dokumentasi per-SA, lemah di SSOT angka (banyak input ulang). **Diferensiasi Engagement Pack: SSOT WTB→hilir ala `AMS_CANON` + kalkulator (MUS, Benford, SAD iron-curtain, generator LK/opini) yang di ATLAS manual.** Jangan menyalin struktur ATLAS; ambil pelajaran adopsinya.
- **Asseris sendiri** — risiko strategis: dua sumber metodologi yang bisa saling drift. Mitigasi: workbook digenerasi dari parameter yang dibaca dari canon (persentase, faktor sampling), bukan diketik ulang.
- Template audit Excel komersial (Caseware working papers lama, template internal KAP) — tidak terintegrasi SSOT.

## 8. Proposed Approach

1. **Satu workbook .xlsx per engagement** (bukan pack multi-file — silang-referensi antar file Excel rapuh). ±30 sheet sesuai pemetaan §4.
2. `SETUP` + named ranges = "canon"-nya workbook. Semua sheet hilir menarik dari sana. Aturan emas SSOT Asseris dipertahankan: **nol hardcode di hilir**.
3. Generator Python (openpyxl) di `tools/excel-pack/` dalam repo ini; output ke `dist/`. Test membandingkan hasil formula (via evaluasi ulang) dengan nilai `canon_part4.test.ts` (patokan W0).
4. Proteksi: sheet di-lock, sel input di-unlock + diberi warna input konsisten design system (biru muda input, abu formula).
5. Urutan build: **F1 (MVP, 14 sheet inti)**: SETUP, PETUNJUK, Cockpit, WTB, AJE, Materialitas, Risiko, Asersi, Analitis, Sampling, SAD, IndeksWP, LK, Opini. **F2 (+16 sheet)**: sisanya sesuai §4. **F3 (opsional)**: varian .xlsm (navigasi, log perubahan sederhana, freeze sign-off).

## 9. Risks

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Ekspektasi "persis Asseris" tidak terpenuhi | Kecewa/rework | PRD ini + sheet PETUNJUK menyatakan degradasi per modul secara eksplisit |
| Drift metodologi Excel vs Asseris | Dua kebenaran | Parameter digenerasi dari canon; regenerasi = jalankan ulang skrip |
| User merusak formula | Angka salah senyap | Proteksi sheet + kolom check-total per sheet (Σ debit=kredit, TB balance) |
| Benford/JET lambat di file besar | UX buruk | Batas baris + helper kolom efisien; opsi pindahkan JET ke workbook terpisah |
| Kanibalisasi produk Asseris | Strategis | Keputusan positioning (lead magnet / berbayar / internal) — open question #1 |

## 10. Implementation Plan

1. **F1a** — skeleton generator + SETUP + WTB + AJE + named ranges + proteksi (fondasi SSOT).
2. **F1b** — Materialitas, Risiko, Asersi, Analitis, Sampling, SAD (kalkulator planning/execution).
3. **F1c** — IndeksWP, LK, Opini, Cockpit, PETUNJUK → **rilis MVP** + uji paralel vs Asseris (success criteria #1).
4. **F2** — 16 sheet sisanya per §4.
5. **F3 (opsional, keputusan terpisah)** — varian .xlsm.

## 11. Open Questions

1. **Positioning produk:** alat internal KAP Anda, lead magnet Asseris, atau produk digital berbayar? Mempengaruhi branding, polish, dan lisensi.
2. **Scope rilis pertama:** F1 (MVP 14 sheet) dulu, atau langsung F1+F2 (30 sheet)?
3. **Format:** .xlsx murni (rekomendasi) atau langsung .xlsm ber-VBA?
4. **Isi awal:** template kosong + 1 contoh mini, atau terisi penuh data demo klien fiktif Asseris (dari seed)?
5. Tabel benchmark & faktor sampling: pakai default canon Asseris apa adanya? (asumsi: ya)
