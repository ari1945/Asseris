# Triase 53 PRD Draft — Asseris (2026-08-31)

| Field | Isi |
|---|---|
| Tanggal | 2026-08-31 |
| Pemilik | Ari Widodo |
| Status | Draft — menunggu keputusan per-gelombang |
| Induk | `docs/RENCANA-PENYELESAIAN-AI-CLOUD-AWS.md` (Fase C) · `docs/URUTAN-PENYELESAIAN-TABEL-PROMPT.md` (#2) |
| Metode | Seluruh 53 PRD berstatus Draft dibaca penuh (4 pembacaan paralel), diverifikasi silang terhadap source tree `migration/src` + `server/src` + riwayat git |

> Tujuan dokumen: mengubah 53 keputusan terpisah menjadi **satu keputusan per gelombang**.
> Tidak ada PRD yang dieksekusi oleh sesi triase ini.

---

## 1. TEMUAN UTAMA — registri tidak lagi mencerminkan kode

Pembacaan menemukan bahwa **±15 dari 53 PRD "Draft" kemungkinan besar sudah (sebagian besar)
terimplementasi** — dibuktikan dua arah: (a) addendum/§12 di dalam PRD-nya sendiri menyatakan
selesai, dan/atau (b) artefak inti yang PRD janjikan **sudah ada di source tree**:

| PRD (label registri: Draft) | Bukti di kode / dokumen |
|---|---|
| `prd-wp-signoff-integrity` | §12: "paket TUNTAS 2026-08-07, diverifikasi hidup" · `wp_chain.ts`, `content_hash.ts`, `identity.ts` ada |
| `prd-penerimaan-keberlanjutan-detail` | §12 Addendum: P1–P6 DONE 2026-07-18 · `assessment_model.ts`, `continuance_engine.ts` ada |
| `prd-continuance-register-isqm` | §12: terpasang ("Proceed." 2026-06-25) · `view_continuance.tsx` ada |
| `prd-risk-relocation-and-portfolio-risk` | §12: terpasang 2026-06-25 (opsi 1b) |
| `prd-related-parties-ledger-scan` | `canon_related.ts` + test ada |
| `prd-subsequent-events-fs-reconciliation` | `canon_subsequent.ts` + test ada |
| `prd-smm-toolkit-map` | `canon_smm_toolkit.ts`, `canon_smm_illustrative_risks.ts` + test ada |
| `prd-sa510-independence-fee-prioryear` | `member_independence.ts`, `fee_concentration.ts`, `prior_year.ts` + test ada |
| `prd-finalisation-gate-execution-completeness` | field `notStarted` sudah ada di `wp_signoff.tsx:483,503` |
| `PRD - W-WTB-1 Ingress TB Nyata` | Impor TB paste-CSV **live-verified** di `docs/DEPLOY.md` §12.2 |
| `PRD - WTB PR-1 & PR-2` | PRD PR-3/4 menyebut "#129 & #130 MERGED" sebagai basisnya |
| `PRD - WTB PR-3 & PR-4` | `flux_state.ts`, `wtb_provenance.ts`, `prior_year.ts` + konsumen `fluxState.v1` di 5 view |
| `PRD - WTB PR-6` | `useMateriality()` di `contexts.tsx:258` + ≥8 view konsumen |
| `PRD - CI Deploy-Smoke (W10.1)` | `deploy-smoke.yml` + job `edge-smoke` sudah ada & berjalan |
| `PRD - Deploy-Readiness Single-Tenant` | Sebagian besar tertutup `docs/DEPLOY.md` §12–§20 |

**Konsekuensi:** backlog Draft riil ±38 PRD, bukan 53 — dan **Gelombang 0 (audit status)
menjadi pekerjaan pertama yang wajib**, sebelum sign-off gelombang mana pun. Keberadaan file
≠ seluruh Success Criteria tertutup, jadi tiap kandidat harus diaudit SC-per-SC, bukan
langsung dicap Implemented.

**Prompt Gelombang 0 (satu sesi):** «Untuk 15 PRD dalam tabel §1 `docs/TRIASE-DRAFT-2026.md`:
baca Success Criteria PRD-nya satu per satu, periksa terhadap kode + uji + riwayat git apakah
tiap SC benar-benar tertutup, lalu tulis verdict per PRD (Implemented penuh / parsial —
sisa SC berupa daftar / belum). Perbarui baris Status di PRD & `docs/PRD-REGISTRY.md` HANYA
untuk yang terbukti penuh; yang parsial dicatat sisa-SC-nya di PRD sebagai ruang lingkup baru.»

---

## 2. Tabel triase lengkap (53 PRD)

Gelombang: **V** = Gelombang 0 verifikasi status · **C-1** = go-live · **C-2** = kedalaman
audit · **C-3** = UX/poles. Usaha: S <3 hari · M 3–7 hari · L >1 minggu.

### V — Verifikasi status (15; lihat §1 untuk bukti)

| PRD | Usaha tersisa | Nilai | Catatan |
|---|---|---|---|
| wp-signoff-integrity | audit SC | tinggi | Kemungkinan Implemented penuh |
| penerimaan-keberlanjutan-detail | audit SC | tinggi | Follow-up `PRIOR_YEAR` server → sudah tercakup sa510? |
| continuance-register-isqm | audit SC | sedang | Verifikasi RBAC live Partner tercatat belum lengkap |
| risk-relocation-and-portfolio-risk | audit SC | sedang | |
| related-parties-ledger-scan | audit SC | sedang | |
| subsequent-events-fs-reconciliation | audit SC | sedang | |
| smm-toolkit-map | audit SC | tinggi | Termasuk isu hak cipta Toolkit IAPI (UU 28/2014) |
| sa510-independence-fee-prioryear | audit SC | tinggi | Bila parsial: OQ-2 denominator fee (11,3B vs 9,3B) & OQ-3 ambang tetap butuh jawaban |
| finalisation-gate-execution-completeness | audit SC | sedang | |
| W-WTB-1 Ingress TB Nyata | audit SC | tinggi | Ingress ADA; cek SC persist server + RBAC |
| WTB PR-1 & PR-2 | audit SC | tinggi | |
| WTB PR-3 & PR-4 | audit SC | tinggi | |
| WTB PR-6 | audit SC | tinggi | Bila parsial: konfirmasi inkonsistensi Q5 §10 (opsi a vs c) sebelum lanjut |
| CI Deploy-Smoke (W10.1) | audit SC | tinggi | Kemungkinan terserap Deploy-Readiness |
| Deploy-Readiness Single-Tenant | inventarisasi sisa | tinggi | Cocokkan M1–M7 vs DEPLOY.md §12–§20; sisa nyata → Fase E |

### C-1 — Gelombang go-live (10 siap + 5 menunggu jawaban spesifik)

**C-1a — siap dieksekusi dengan satu sign-off gelombang (open question nol / sudah terjawab / default aman):**

| PRD | Usaha | Nilai | Alasan masuk C-1 |
|---|---|---|---|
| Isolasi Data Personal | L | tinggi | UU PDP; kebocoran PII nyata di kode; **seluruh OQ sudah terjawab** |
| rbac-admin-console | M | tinggi | Kontrol akses DB-backed + audit; **OQ resolved 2026-07-03** |
| Intake Manager RBAC | S | tinggi | Satu baris `capForWrite`; Manager kini ditolak senyap (default Opsi A) |
| SA-01 Sempit | S | tinggi | Sign-off akseptasi ber-identitas + append-only; menutup penolakan-tulis senyap |
| AJE PR-E | S | tinggi | **Nol OQ**; menutup Partner-jadi-EQR-sendiri (pelanggaran independensi terbukti live) |
| Group Audit CP-01 (PR-H2 dulu) | S | tinggi | **PR-H2 = bug produksi hidup** (PM Rp 0 senyap), nol OQ; PR-H1 tunggu Q-H1 |
| Rekonsiliasi Fiskal PSAK 46 | M | tinggi | D-1..D-4 sudah diputus 2026-07-27; mencabut konstanta fantasi terakhir jalur pajak |
| backup-restore-dr (sisa) | M | tinggi | Sisa riil: alert `BACKUP_OFFBOX_FAILED` ke manusia; jalur S3 nyata → gabung Fase E |
| Jaring Pengaman Test (P1+P2) | M | tinggi | Melindungi segel Ed25519 + redaksi LLM + loop auth; default aman |
| Kebijakan Presisi Numerik | M | tinggi | Ketepatan rupiah data klien + reproduksibilitas segel; **Q1–Q5 butuh keputusan → D-2** |

**C-1b — nilai tinggi, terblokir jawaban spesifik (bisa langsung jalan begitu dijawab):**

| PRD | Usaha | Blocker |
|---|---|---|
| AJE PR-B | L | Q1 kapabilitas posting (D-3); memalsukan bukti atas nama Partner/EQR + nol penegakan server |
| AJE PR-C | M | Q1 `bsEffect` hanya memblokir langkah covenant — langkah 1–5 bisa jalan (D-4) |
| Remediasi Gap Matriks FIRM | L | #1 lingkup gate akses, #2 override, #3 pemicu SKP, #5 semantik sanksi (D-5) |
| acceptance-to-engagement-flow SA210 | M | Q1 titik gerbang A/B/C (D-6); M3 sudah terpasang sebagian |
| SA 570 GC Substantif | M | Q1 cakupan (D-7); satu-satunya trio substantif yang memasukkan angka klien NYATA |

### C-2 — Kedalaman audit (19)

Urutan dalam gelombang mengikuti rantai pola & dependensi yang PRD-nya sendiri nyatakan:

| Urut | PRD | Usaha | Blocker |
|---|---|---|---|
| 1 | Persist Kesimpulan Auditor PSAK (P1) | M | tidak (4 OQ ber-default) — prasyarat klaster SA |
| 2 | SA 250 NOCLAR | S | tidak — pemikul biaya-pola pertama |
| 3 | SA 620 pakar | S | tidak (cek tumpang-tindih `prd-sa620-expert-gate-server` yang sudah Implemented) |
| 4 | SA 260 & 265 TCWG+defisiensi | M | tidak |
| 5 | SA 402 organisasi jasa | S | tidak (`socEngine` SO-01 wajib dipertahankan) |
| 6 | SA 315 ICFR | M | tidak (berkas terbesar; hati-hati ratchet `:any`) |
| 7 | SA 240 Fraud | S | tidak |
| 8 | SA 505 Confirmation Hub | M | Q2 kedalaman SAD = deliverable Fase 0-nya sendiri |
| 9 | SA 530 Sampling | S | tidak |
| 10 | SA 540 Estimasi | S | tidak |
| 11 | SA 530 & 540 Tab Analitik | M | tidak (default eksplisit tersedia) |
| 12 | mgmtletter-deficiency-reconciliation | M | Q1 cakupan refactor ICFR (D-11) — kerjakan setelah #6 |
| 13 | strategy-risk-response-reconciliation | M | Q1 definisi adequacy (D-11) |
| 14 | Evidence & Sign-off Lintas-WP | L | Q3/Q4 kontrak data — salah pilih = rework 30 modul (D-9) |
| 15 | Gerbang Fase Lifecycle (P5) | M | Q1/Q2 kebijakan gate (D-10); butuh #14 |
| 16 | Engagement-Scoping Review Notes (P5 F2) | S | setelah #15 |
| 17 | Materialitas Grup SA 600 (+PR-H1) | L | **Opsi A vs B — penulis menolak mendesain sebelum dijawab** (D-8) |
| 18 | AK-01 Penomoran PSAK | S | tidak (default tersedia) |
| 19 | AI Tax Audit Diagnostic (P4) | L | setelah #1/#14/#15; + basis hukum LLM lintas-batas (PDP) |

### C-3 — UX & poles (4)

| PRD | Usaha | Blocker |
|---|---|---|
| Quick-Win Desain Visual | S | OQ-3: **pekerjaan sidebar belum di-commit** harus dibereskan dulu; merge butuh persetujuan visual Ari (D-14) |
| Skala Tipografi | M | OQ-1 tier display & OQ-2 arah migrasi 12,5px (D-13) |
| sidebar-nav-learning-curve | M | Fase 1–2 bebas blocker; Fase 3 rename = KEY di 8 tempat, hati-hati |
| overlay-contract-and-addressable-objects | L | Q1 lingkup, Q2 hash vs History API, **Q3 ref KK/id perikatan di URL = isu PDP** (D-12) |

---

## 3. Daftar keputusan terkonsolidasi untuk Ari

Satu balasan yang menjawab nomor-nomor di bawah membuka gelombang-gelombang di atas:

- **D-1** — Konfirmasi mekanisme Gelombang 0 (§1) dan wewenang mengubah status registri untuk yang terbukti penuh.
- **D-2** — Presisi Numerik: (a) satuan kanonik Rp juta vs Rp penuh; (b) half-up vs banker's rounding; (c) sejauh mana `Decimal`; (d) toleransi tie-out; (e) re-baseline segel historis atau berlaku maju.
- **D-3** — AJE PR-B Q1: `CAP.AJE_POST` baru vs reuse kapabilitas ada.
- **D-4** — AJE PR-C Q1: tambah `bsEffect` di item SAD, atau tunda proyeksi covenant.
- **D-5** — Remediasi FIRM: #1 aksi apa saja yang diblokir gate etik/AML (risiko lock-out); #2 siapa boleh override & tercatat; #3 SKP self-report vs konfirmasi admin; #5 semantik keterhubungan sanksi.
- **D-6** — SA210 flow Q1: gerbang di Perencanaan→Eksekusi saja (A), + soft-warn penciptaan manual (B), atau hard-block (C); + siapa boleh override.
- **D-7** — SA 570 substantif Q1: konfirmasi cakupan tiga domain (proyeksi/covenant/mitigasi).
- **D-8** — SA 600: populasi ENG-2025-014 Opsi A (konsolidasian) vs B (induk standalone); + Q-H1 basis figur induk `adj` vs `unadj`.
- **D-9** — Evidence Lintas-WP: sign-off 2 vs 3 tingkat (+EQR); kunci-setelah-telaah keras vs lunak.
- **D-10** — Gerbang P5: kekuatan gate (lunak/graduated/keras) & ambang kelengkapan.
- **D-11** — strategy Q1 definisi adequacy; mgmtletter Q1 cakupan refactor ICFR.
- **D-12** — Overlay: lingkup sign-off (A vs A+B+C); hash vs History API; bolehkah ref KK/id perikatan tampil di URL & riwayat browser (pertimbangan PDP).
- **D-13** — Tipografi: OQ-1 tier display 22/28/34; OQ-2 migrasi 12,5→12 atau →13 (562 deklarasi).
- **D-14** — Quick-Win Visual: nasib pekerjaan sidebar yang belum di-commit; jadwal tinjauan visual (gerbang non-negosiabel R-3).
- **D-15** — (kondisional, bila audit V menemukan PR-6 parsial) WTB PR-6 Q5: opsi (a) atau (c) — §10 PRD-nya mencatat keduanya sekaligus.
- **D-16** — Intake Manager: cukup Opsi A (doc-gate klien + trail) atau naik ke Opsi B (penegakan server; mengubah usaha S→M/L).

**Rekomendasi urutan sign-off:** D-1 sekarang (membuka Gelombang 0, nol risiko) → sign-off
C-1a sebagai satu paket → D-2..D-7 (membuka C-1b) → sisanya menyusul per gelombang.

---

## 4. Implikasi terhadap tabel urutan kerja (`docs/URUTAN-PENYELESAIAN-TABEL-PROMPT.md`)

- **#19, #26, #33, #34, #35** (rantai WTB) → kemungkinan besar menjadi pekerjaan **verifikasi
  status**, bukan implementasi; jangan mulai implementasi sebelum audit Gelombang 0.
- **#22, #23** (Deploy-Readiness, CI Deploy-Smoke) → sebagian besar sudah tertutup; sisanya
  inventarisasi + Fase E.
- **#28** (wp-signoff-integrity) → kemungkinan Implemented penuh; tersisa hanya follow-up
  yang PRD-nya sendiri tandai sebagai PRD terpisah.
- **#38, #45, #51, #52** → periksa artefak yang sudah ada (`canon_deficiency.ts`,
  `canon_expert_eval.ts`, `canon_subsequent.ts`, `canon_smm_*`) sebelum menulis baru —
  pola cacat "dua register untuk hal yang sama" sudah pernah terjadi (SC-24a SDM).
- Estimasi total Fase C menyusut signifikan bila Gelombang 0 mengonfirmasi tabel §1.

---

*Dokumen ini deliverable pekerjaan #2 tabel urutan. Registri status tetap satu:
`docs/PRD-REGISTRY.md` — dokumen ini tidak mengubah status apa pun sebelum D-1.*
