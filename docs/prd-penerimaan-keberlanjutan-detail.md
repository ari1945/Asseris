# PRD — Pendalaman Penerimaan & Keberlanjutan Klien (end-to-end) + Dokumentasi (SA 210/220/300/510 · ISQM 1 ¶33–34 · SA 230)

| Field | Isi |
|---|---|
| Tanggal | 2026-07-18 |
| Pemilik | Ari Widodo |
| Status | **Draft — menunggu sign-off** |
| Engagement ID terkait | — (lintas: `onboarding` + `continuance`, firm-level → siklus engagement) |
| Asal | Lanjutan dari deep-link Lini Masa → Keberlanjutan (PR #92). Permintaan: "kembangkan lebih detil fitur penerimaan & keberlanjutan klien, termasuk dokumentasinya." |
| Keputusan scope (dari Ari) | Fokus = **Keduanya (end-to-end)** · Kedalaman = **Penuh** (kuesioner berbobot + tahun-lalu + safeguard + ekspor) · Dokumentasi = **kertas kerja in-app + dokumen developer + segel/ekspor auditable (W10.5)** |

> ⚠️ **Pushback dulu (prefer existing + anti-duplikasi KERAS).** Sebagian besar fondasi **SUDAH ADA** (lihat §7). "Penerimaan" sudah matang (skor berbobot 5-faktor, PMPJ, Letter SA 210 tersegel, konverter+entry-gate). Yang benar-benar tipis = **sisi keberlanjutan** (hanya tombol keputusan + teks bebas — tanpa basis terdokumentasi) dan **dokumentasi keputusan yang dapat diekspor/tersegel** di kedua sisi. PRD ini: **memperdalam yang tipis + menyatukan model penilaian + menutup loop dokumentasi**, bukan membangun ulang.

---

## 1. Problem

ISQM 1 ¶33–34 & SA 220 mewajibkan firma menilai **penerimaan** (klien/perikatan baru) **dan keberlanjutan** (perikatan berulang) **setiap tahun sebelum mulai**, dengan **basis yang terdokumentasi** (SA 230). Kondisi Asseris saat ini:

1. **Penerimaan (`onboarding`) sudah kuat, tapi memonya tak jadi kertas kerja tersegel.** Akseptasi dinilai berbobot (`obAccScore`/`obAccVerdict`, faktor 25/20/20/25/10), di-sign-off Partner, punya *trail* append-only — **tetapi tidak dapat diekspor/tersegel sebagai memo penerimaan mandiri**. Hanya *Engagement Letter* yang punya ekspor PDF + segel Ed25519. Kesimpulan penerimaan (SA 220/300) tak berbentuk artefak yang bisa diserahkan/diverifikasi.
2. **Keberlanjutan (`continuance`) dangkal.** Keputusan = satu tombol (Lanjut / Syarat / Tidak / Tertunda) + `conditions` teks bebas, persist `continuanceDecisions`. **Tidak ada:** (a) penilaian terstruktur/berbobot atas basis keputusan; (b) tautan **tahun lalu** (opini modifikasi, temuan signifikan, uncorrected misstatements, kesulitan/keterbatasan) — padahal ini inti pertimbangan keberlanjutan (SA 220.A24, ISQM 1 ¶34); (c) safeguard terstruktur; (d) memo terdokumentasi yang dapat diekspor/tersegel; (e) riwayat siklus tahunan. Mesin pemicu (`continuance_engine`) hanya membaca rotasi/konflik/risiko/PIE/fee/asosiasi — **tidak** opini/temuan tahun lalu.
3. **Dua sisi memakai model penilaian berbeda.** Penerimaan pakai faktor berbobot; keberlanjutan tidak pakai model sama sekali. Tidak ada SSOT penilaian bersama → inkonsistensi metodologi & duplikasi bila keduanya ditambal terpisah.
4. **Loop deep-link belum tuntas.** PR #92 baru mengarahkan task Lini Masa "Penerimaan & keberlanjutan" → register keberlanjutan klien terpilih. Tapi begitu tiba, tak ada **memo terdokumentasi** untuk dibaca/diekspor — pengguna melihat pemicu + tombol, bukan kertas kerja.

Ini retakan dokumentasi di **awal lifecycle** — titik yang paling disorot inspeksi PPPK (dokumentasi back-dating = temuan). "Keputusan tanpa basis terdokumentasi" ≈ tidak ada keputusan, di mata reviewer mutu.

## 2. Objective

Menjadikan **Penerimaan & Keberlanjutan** satu siklus terdokumentasi, konsisten, dan dapat diaudit: setiap klien/perikatan punya **penilaian terstruktur berbobot** (satu model bersama), **tertaut pengalaman tahun lalu**, menghasilkan **memo kertas kerja (SA 230)** yang **dapat diekspor (PDF/XLSX) & tersegel (Ed25519, W10.5)** dan dapat diverifikasi. Tanpa menduplikasi mesin/model yang sudah ada — **menyatukan & memperdalam**.

## 3. Success Criteria

1. **Model penilaian bersama** (`assessment_model.ts`, murni bertipe, bebas-any, ber-test): satu `weightedScore(factors)` + `verdict(score, kind)` dipakai **baik** penerimaan **maupun** keberlanjutan (penerimaan tetap 5 faktor 25/20/20/25/10; keberlanjutan set faktor sendiri — lihat §8). `obAccScore`/`obAccVerdict` di-refactor memakai helper bersama (perilaku identik — snapshot/registry akseptasi tak berubah).
2. **Keberlanjutan berbobot + tahun-lalu.** `continuance_engine` diperluas: pemicu **opini-modifikasi LY** & **temuan-signifikan LY** & **perubahan keadaan** (dari seed kanonik, bukan hardcode di view); `view_continuance` detail menampilkan **matriks faktor** (skor 1–5 + catatan), **kartu tahun-lalu**, **safeguard terstruktur**, keputusan + approver + tanggal + **trail append-only** (pola `StepAcceptance`). Persist firm-scope. Verdict berbobot menuntun (tak memaksa) keputusan.
3. **Memo kertas kerja terdokumentasi (SA 230) — kedua sisi.** Generator memo bersama (`acceptance_continuance_memo.ts`, murni) → blok memo (identitas klien, faktor+skor+catatan, pemicu, safeguard, keputusan, penilai/penyetuju, tanggal, standar terkait). UI: tombol **"Cetak / Ekspor Memo"** → PDF **dan** XLSX; **segel Ed25519** + **verify-seal** (reuse plumbing `StepLetter.sign`/`verifySeal`, `amsExportPdf`/`exporter.seal`/`exportVerifySeal`). Offline → memo tetap tergenerasi tanpa segel (fail-safe, seperti Letter).
4. **Riwayat siklus tahunan.** Keputusan keberlanjutan disimpan ber-`refYear` (mis. `continuanceDecisions.<year>` atau entri ber-siklus); siklus sebelumnya tampil (read-only). Nol regresi untuk data lama (migrasi fail-safe).
5. **Loop deep-link tuntas.** Dari Lini Masa → Keberlanjutan (PR #92), baris klien terpilih kini menampilkan/menawarkan **memo terdokumentasi** yang dapat diekspor.
6. **RBAC benar & teruji dengan peran Manajer (bukan Partner).** Nilai/isi faktor = auditor tim; **sign-off/segel memo = FIRM_ADMIN** (konsisten `StepAcceptance`/`StepLetter`); lihat register = `ENGAGEMENT_VIEW_ALL`. Server-parity (`rbac.ts`) dihormati.
7. **Dokumentasi lengkap:** (a) memo in-app (kriteria 3); (b) `docs/acceptance-continuance-methodology.md` (metodologi: faktor, bobot, ambang verdict, pemetaan standar SA 210/220/300/510 · ISQM 1 ¶33–34 · SA 230); (c) addendum PRD ini + memory arc.
8. **Gate:** `npm run typecheck` 0 · `npm run lint` bersih (ratchet no-explicit-any: `.ts` baru wajib bebas-any) · `npm test` hijau termasuk **update snapshot `continuance_engine.test.ts`** + test model penilaian + test generator memo. Verifikasi live per fase (peran Manajer).

## 4. Scope

- **`assessment_model.ts`** — helper penilaian berbobot bersama + tipe faktor; refactor `obAccScore`/`obAccVerdict` memakainya (nol perubahan perilaku).
- **`continuance_engine.ts`** — pemicu baru (opini/temuan/perubahan-keadaan LY) dari seed; ekspos faktor keberlanjutan (default + override seed).
- **Seed data** (`data_part*.ts`) — per klien aktif: `continuanceAssessment` (faktor+catatan), `priorYear` terstruktur (opini, temuan signifikan, uncorrected, kesulitan). Ringkas & bermakna untuk 8 klien.
- **`view_continuance.tsx`** — detail panel diperdalam (matriks faktor, kartu tahun-lalu, safeguard, keputusan+trail); tombol Cetak/Ekspor memo + segel/verify; riwayat siklus.
- **`acceptance_continuance_memo.ts`** — generator blok memo bersama (penerimaan & keberlanjutan).
- **`view_onboarding*.tsx`** — tambah tombol **"Ekspor Memo Penerimaan"** (PDF/XLSX + segel) di `StepAcceptance`/`OBAcceptance` memakai generator bersama (memo penerimaan mandiri, di luar Engagement Letter).
- **Dokumentasi**: `docs/acceptance-continuance-methodology.md` + addendum PRD + memory.

## 5. Non-Scope

- **TIDAK** membangun ulang PMPJ/APU-PPT, Engagement Letter, atau konverter — sudah ada; hanya di-reuse/di-link.
- **TIDAK** membuat editor memo kaya (rich-text). Memo = terstruktur dari data (blok), bukan WYSIWYG.
- **TIDAK** e-Meterai/e-sign nyata (segel Ed25519 ≠ e-Meterai; ikuti W10.5).
- **TIDAK** mengubah mesin rotasi (`pppk`/`INDEPENDENCE`) — hanya baca pemicu.
- **TIDAK** (fase ini) komunikasi auditor pendahulu (SA 510) & deklarasi independensi per-anggota sebagai modul — dicatat sebagai **kandidat lanjutan** (§11 Q4), bukan scope inti kecuali diminta.
- **TIDAK** mengubah ambang/registry akseptasi yang ada (refactor harus perilaku-identik).

## 6. Constraints

- ESM-only, edit `migration/src/*`. Gate typecheck/lint/test hijau. Ratchet `no-explicit-any` (`.ts` baru bebas-any; view `.tsx` boleh `:any` props baseline).
- **SSOT & no-hardcode:** faktor/pemicu/tahun-lalu dari lapisan data kanonik; keputusan firm-scope via `useAmsPersist`/`useServerState('…','firm',FIRM_SCOPE_ID)`. Segel via server exporter (offline fail-safe).
- **Snapshot:** menyentuh `continuance_engine` → **wajib** `npm test` + update snapshot `continuance_engine.test.ts` (bukan sekadar typecheck/lint). Refactor `obAccScore` → verifikasi registry akseptasi (`OBAcceptance`) tak bergeser.
- Solo; inkremental — tiap fase = 1 PR kecil dapat di-review terpisah.

## 7. Existing Solutions — **baca sebelum menyetujui**

| Sudah ada | Lokasi | Menangani | Kenapa belum cukup |
|---|---|---|---|
| Skor akseptasi berbobot + verdict + trail | `view_onboarding.tsx:28-37,270-365`; faktor `data_part1.ts:371` | Penilaian penerimaan 5-faktor, sign-off Partner, trail | Tak dapat diekspor/tersegel sebagai memo mandiri; model tak dipakai ulang keberlanjutan |
| Engagement Letter tersegel | `view_onboarding2.tsx:140-324` | PDF + Ed25519 seal + verify + PSrE/meterai (mock) | Hanya surat — bukan memo *keputusan* penerimaan/keberlanjutan |
| Mesin pemicu keberlanjutan | `continuance_engine.ts` | rotasi/konflik/risiko/PIE/fee/asosiasi | **Tak** membaca opini/temuan tahun lalu; tak ada faktor berbobot/memo |
| Register keberlanjutan | `view_continuance.tsx` | Daftar + keputusan tombol + conditions | Tanpa basis terstruktur/tahun-lalu/safeguard/memo/riwayat |
| Konverter + entry gate | `engagement_entry_gate.ts` | Warisi provenance → gate SA 210/220 | Loop dokumentasi keputusan belum tertutup |
| Ekspor + segel | `amsExportPdf`, `exporter.seal`, `exportVerifySeal` (api) | Plumbing PDF/XLSX + Ed25519 | Belum dipakai untuk memo penerimaan/keberlanjutan |
| Registri OBAcceptance/OBAml | `view_onboarding3.tsx` | Registri keputusan/PMPJ read-only | Bukan memo tersegel; keberlanjutan tak punya padanan |

**Kesimpulan:** custom work terjustifikasi hanya untuk: (a) **helper penilaian bersama**, (b) **pendalaman keberlanjutan (faktor+tahun-lalu+safeguard+trail)**, (c) **generator + ekspor + segel memo** dua sisi, (d) **riwayat siklus**, (e) **dokumentasi**. Sisanya reuse/link.

## 8. Proposed Approach (rekomendasi)

**Satukan model, perdalam keberlanjutan, dokumentasikan-&-segel kedua sisi.**

**Faktor keberlanjutan** (mirror struktur `ACC_FACTORS`; selaras ISQM 1 ¶34 / SA 220.20–21; bobot Σ=100, dapat ditinjau saat sign-off):
| # | Faktor | Bobot |
|---|---|---|
| 0 | Integritas & perubahan keadaan manajemen/tata kelola | 20 |
| 1 | Pengalaman tahun lalu: opini, temuan signifikan, kesulitan/keterbatasan | 25 |
| 2 | Independensi & ancaman (rotasi/kedekatan, kepentingan pribadi/fee) | 20 |
| 3 | Kompetensi, kapasitas & sumber daya untuk tahun berjalan | 15 |
| 4 | Risiko klien/industri & regulasi | 10 |
| 5 | Etika & proporsionalitas/kolektibilitas imbalan | 10 |

`verdict(score,'continuance')`: `≥4 Lanjut` · `≥3 Lanjut dengan Syarat` · `<3 Tidak Dilanjutkan` (paralel akseptasi). Pemicu engine (attention) **tetap** sebagai sinyal cepat; faktor berbobot memberi **basis terdokumentasi**. Bila pemicu high (mis. rotasi terlampaui) → memo menandai wajib-safeguard.

**Memo bersama** (`acceptance_continuance_memo.ts`) menghasilkan blok seragam untuk PDF/XLSX; dua "kind": `acceptance` (baca `prospect.acceptance`) & `continuance` (baca `ContinuanceRow`+assessment+priorYear). Ekspor/segel reuse jalur `StepLetter`.

**Alasan vs alternatif:**
- *vs memperdalam terpisah tanpa model bersama:* menghasilkan dua metodologi → inkonsistensi & duplikasi (langgar SSOT/anti-duplikasi).
- *vs memo per-sisi terpisah:* generator bersama = satu format kertas kerja, satu jalur segel, lebih murah dirawat.
- *vs rich editor:* over-scope; memo terstruktur-dari-data lebih auditable & deterministik.

## 9. Risks

| Risiko | Mitigasi |
|---|---|
| Refactor `obAccScore` mengubah angka akseptasi | Helper bersama harus **perilaku-identik**; test perbandingan + verifikasi registry `OBAcceptance` tak bergeser |
| Snapshot `continuance_engine.test.ts` terlewat | Constraint eksplisit: `npm test` + update snapshot tiap sentuh engine |
| Seed tahun-lalu tipis/ tidak realistis | Seed ringkas tapi bermakna 8 klien (opini LY, ≥1 temuan) + derive default bila kosong |
| Scope blow-up (end-to-end) | **Fase ketat** (§10), tiap fase 1 PR kecil; ekspor/segel di fase terpisah |
| RBAC bocor (staf segel memo) | Sign-off/segel = FIRM_ADMIN; uji **peran Manajer** (bukan Partner) |
| Segel offline gagal → UI crash | Fail-safe: memo tergenerasi tanpa segel (pola `StepLetter` offline) |
| "Keberlanjutan" tabrak makna (sustainability/going-concern) | Penamaan tegas "Keberlanjutan Klien (ISQM 1/SA 220)"; jangan tabrak `sustain`/going-concern |
| no-explicit-any un-suppress file | `.ts` baru bebas-any; hindari `:any` di `assessment_model`/`memo`/engine |

## 10. Implementation Plan (fase = PR kecil)

- **P1 — Model penilaian bersama (fondasi).** `assessment_model.ts` (`weightedScore`, `verdict(kind)`, tipe faktor) + test; refactor `obAccScore`/`obAccVerdict` memakainya (identik). *Gate: typecheck/lint/test hijau + registry akseptasi tak bergeser.*
- **P2 — Keberlanjutan berbobot + tahun-lalu (engine+seed).** Perluas `continuance_engine` (pemicu opini/temuan/perubahan LY) + faktor keberlanjutan; seed `continuanceAssessment`+`priorYear` 8 klien. Update snapshot. Unit test pemicu baru.
- **P3 — UI keberlanjutan terdokumentasi.** `view_continuance` detail: matriks faktor + kartu tahun-lalu + safeguard + keputusan/approver/tanggal/trail; persist firm-scope. RBAC uji Manajer.
- **P4 — Memo + ekspor + segel (dua sisi).** `acceptance_continuance_memo.ts` + tombol Cetak/Ekspor (PDF/XLSX) + segel/verify di `view_continuance` **dan** `StepAcceptance`/`OBAcceptance`. Fail-safe offline.
- **P5 — Riwayat siklus tahunan.** Keputusan ber-`refYear` + tampilan siklus lampau; migrasi fail-safe.
- **P6 — Dokumentasi + regresi.** `docs/acceptance-continuance-methodology.md`; addendum PRD; memory arc; pastikan akseptasi/entry-gate/PR#92 tak berubah perilaku.

Tiap fase dapat di-hentikan/di-review terpisah; bila waktu terbatas, P1–P4 memberi inti nilai (dokumentasi tersegel), P5–P6 penyempurnaan.

## 11. Open Questions — **butuh keputusan Anda**

1. **Urutan fase:** setujui P1→P6 berurutan (rekomendasi), atau prioritaskan subset (mis. P2–P4 = keberlanjutan terdokumentasi lebih dulu, tunda P5 riwayat)?
2. **Format ekspor memo:** PDF **+** XLSX keduanya (rekomendasi), atau cukup PDF dulu?
3. **Bobot faktor keberlanjutan** (§8): terima usulan bobot, atau ada preferensi (mis. tahun-lalu 25 dinaikkan)?
4. **Kandidat lanjutan (non-scope kini):** apakah **komunikasi auditor pendahulu (SA 510)** dan **deklarasi independensi per-anggota tim** dimasukkan sekarang (menambah 1–2 fase) atau ditunda ke PRD terpisah? → Rekomendasi **tunda**.
5. **Segel:** memo tersegel per-keputusan (rekomendasi) — segel ulang saat keputusan diubah/di-amandemen (versi memo), setuju?

---
**Sign-off:** balas **"Proceed."** (sebut pilihan §11 — minimal Q1) untuk memulai **P1**.
