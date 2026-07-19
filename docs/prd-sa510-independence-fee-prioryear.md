# PRD — SA 510 Auditor Pendahulu · Deklarasi Independensi per-Anggota · Persistensi Server `priorYear` · Analisis Konsentrasi Fee (dikaitkan ke Jadwal & Lini Masa Audit)

| Field | Isi |
|---|---|
| Tanggal | 2026-07-19 |
| Pemilik | Ari Widodo |
| Status | **Draft — menunggu sign-off ("Proceed.")** |
| Engagement ID terkait | — (lintas: `opening`, `continuance`, `onboarding`, firma → siklus engagement) |
| Asal | Permintaan Ari: "Kembangkan fitur SA 510 auditor pendahulu, deklarasi independensi per-anggota, persistensi server `priorYear`, analisis konsentrasi fee. Kaitkan dengan jadwal dan timeline audit." |
| Keputusan scope (dari Ari, 2026-07-19) | Fokus = **keempat fitur** dalam satu PRD, dikerjakan **bertahap (beberapa PR)** · Backend `priorYear` = **rekomendasikan setelah eksplorasi** · Deliverable turn ini = **PRD dulu, tunggu "Proceed."** |
| Standar terkait | SA 510 · SA 220 / ISQM 1 (independensi, ancaman kepentingan pribadi) · Kode Etik IAPI / SPAP 290 (konsentrasi/ketergantungan fee) · SA 230 (dokumentasi) |

> ⚠️ **Pushback dulu (prefer existing + anti-duplikasi KERAS).** Eksplorasi 4-agen menemukan bahwa **2 dari 4 "fitur baru" sebagian sudah ada** dan tidak boleh dibangun ulang:
> - **SA 510 sudah ada** sebagai modul `opening` (`view_opening.tsx`): toggle tahun-pertama `engType:'awal'`, profil + komunikasi auditor pendahulu (SA 510 ¶6), matriks dampak-opini saldo awal (¶10–13), WP bawaan `A-510`, entri `RELATED_SA` & `LINEAGE`. → Fitur SA 510 = **pendalaman `opening`**, bukan modul baru.
> - **`priorYear`** sudah mengalir end-to-end, hanya sumbernya konstanta hardcode (`PRIOR_YEAR`) karena hidrasi server melucuti field non-CRM. → Fitur = **memindahkan sumbernya ke server**, bukan membangun mekanisme baru.
>
> Yang benar-benar **greenfield**: (F2) deklarasi independensi **per-anggota** (struktur sekarang per-AP, satu klien/orang) dan (F4) **analisis konsentrasi fee** (tidak ada kalkulasi sama sekali; hanya pemicu "imbalan tertunggak" biner). Keduanya sudah tercatat sebagai kandidat **belum-dibangun** di `docs/acceptance-continuance-methodology.md:92-94`.

---

## 1. Problem

Empat celah metodologis yang saling terkait, semuanya di fase **Penerimaan/Perencanaan** dan bermuara pada **ancaman independensi** serta **kualitas keputusan perikatan**:

1. **SA 510 dangkal pada sisi "reliance".** Modul `opening` mendokumentasikan komunikasi auditor pendahulu & dampak saldo awal, tetapi **tidak ada penilaian risiko tahun-pertama yang terukur** (mis. keandalan auditor pendahulu, akses kertas kerja, sengketa, kualifikasi opini pembuka) yang menghubungkan keputusan ke skor. Sekarang bersifat naratif, tidak ter-skor, tidak ter-roll-up ke gerbang fase.
2. **Independensi tidak per-anggota.** `INDEPENDENCE` (`data_part1.ts:321`) hanya 6 baris tingkat **AP/EQR**, masing-masing terikat **satu** `rotationClient` (join by name). Tidak ada deklarasi per **anggota tim × perikatan**, padahal ancaman (kepentingan finansial, hubungan keluarga, jasa non-asuransi, kedekatan) muncul di level individu penugasan. `ethics_gate` yang ada bersifat **per-user, tahunan, firm-wide** — bukan pernyataan independensi spesifik-perikatan.
3. **`priorYear` rapuh (SSOT semu).** Pengalaman tahun-lalu (SA 220.A24) berasal dari konstanta hardcode `PRIOR_YEAR` (`data_part1.ts:391`) yang di-`map` ulang ke klien di `view_continuance.tsx:141` karena `hydrateCoreFromApi` (`api.ts:224-228`) melucuti semua field non-CRM. Akibatnya: data tidak persist, tidak dapat diedit auditor, tidak auditable, dan melanggar prinsip SSOT.
4. **Konsentrasi fee tidak diukur.** Kode Etik (SPAP 290 / IESBA) mensyaratkan pemantauan **ketergantungan imbalan** (total fee dari satu klien / total pendapatan firma; ambang PIE lazim 15% berulang). Saat ini pemicu fee di `continuance_engine.ts:151` hanya **biner "Overdue"** — tidak ada rasio, tidak ada ambang, tidak ada roll-up tingkat-partner/firma.

**Akar masalah bersama:** ketiga ancaman independensi (rotasi, per-anggota, fee) + risiko tahun-pertama (SA 510) belum menjadi **input terukur** ke model penilaian bersama (`assessment_model`) dan belum **terikat ke jadwal/lini masa** sehingga tidak muncul sebagai tugas fase Penerimaan yang wajib diselesaikan sebelum gerbang.

## 2. Objective

Menutup keempat celah dengan **memperluas fondasi yang ada** (bukan membangun ulang), sehingga:
- Risiko tahun-pertama & keandalan auditor pendahulu **ter-skor** dan mendokumentasi keputusan SA 510.
- Independensi dinilai **per anggota tim per perikatan**, memblokir sign-off bila belum ditandatangani/ada ancaman tak-tersafeguard.
- `priorYear` **persist di server** (auditable, dapat diedit), menghapus workaround hardcode.
- **Konsentrasi fee** dihitung dari SSOT (`CLIENTS.fee` ÷ pendapatan firma), memunculkan pemicu terukur di keberlanjutan + panel tingkat-firma.
- Keempatnya **muncul sebagai tugas di Lini Masa Audit** (`audittimeline`) & terhubung dari **Jadwal** (`EngJadwal`), dengan deep-link tab/selection.

## 3. Success Criteria

| # | Kriteria | Ukuran |
|---|---|---|
| SC-1 | SA 510 ter-skor | `view_opening.tsx` punya blok penilaian tahun-pertama berbobot (reuse `assessment_model`), verdict hijau/amber/merah, persist, tersegel saat ekspor. |
| SC-2 | Independensi per-anggota | Setiap anggota `SCHEDULE.alloc` sebuah perikatan punya deklarasi (ditandatangani/ancaman/safeguard); status agregat memblokir sign-off bila ada ancaman merah tak-tersafeguard. |
| SC-3 | `priorYear` server-persist | Sumber `view_continuance.tsx` = StateDoc `priorYear` (bukan konstanta); dapat diedit di UI; round-trip melalui server; seed hijau; `PRIOR_YEAR` konstanta hanya jadi seed awal. |
| SC-4 | Konsentrasi fee | Modul pure `fee_concentration.ts` menghitung rasio klien↔firma & klien↔portofolio-partner; pemicu baru di `continuance_engine`; panel firma; ambang terkonfigurasi. |
| SC-5 | Terkait jadwal/timeline | `ATL_TASKS.Perencanaan` memuat tugas SA 510, independensi, konsentrasi-fee dengan deep-link (`mod`+`tab`/`selClient`); `EngJadwal` menautkannya. |
| SC-6 | Gerbang hijau | `npm run typecheck` (migration+server) = 0; lint 0; build ✓; server test hijau; **tanpa `:any` baru** (ratchet); tanpa perubahan snapshot `AMS_CANON` (fitur di luar canon). |

## 4. Scope

- **F1 — SA 510 (pendalaman `opening`):** blok penilaian risiko tahun-pertama berbobot; pendalaman workflow auditor pendahulu (status akses KK, izin klien SA 510 ¶6, sengketa, opini pembuka); roll-up ke gerbang; segel ekspor (pola `onboarding`); tambah `LINEAGE.opening` ← `onboarding`/`continuance`.
- **F2 — Deklarasi independensi per-anggota:** struktur data baru **anggota × perikatan** (digantung pada `STAFF` + `SCHEDULE`); engine pure (status, ancaman, safeguard); view (baru `view_independence.tsx` atau tab di modul terkait); integrasi precedent `ethics_gate` (blok sign-off); gate kapabilitas.
- **F3 — Persistensi server `priorYear`:** StateDoc firma `key='priorYear'` (keyed by clientId); seed dari konstanta pada boot pertama; UI edit di `continuance`/`opening`; hapus ketergantungan hardcode di jalur baca.
- **F4 — Analisis konsentrasi fee:** modul pure `fee_concentration.ts`; konfigurasi ambang (`FEE_CONCENTRATION_CONFIG`); pemicu baru `continuance_engine` (sibling pemicu overdue); panel tingkat-firma (di `firm`/FIRMFIN atau `continuance`); pemetaan ke faktor independensi 20-pt di `assessment_model`.
- **F5 — Keterkaitan jadwal & lini masa (lintas F1–F4):** tugas `ATL_TASKS` + deep-link; tautan `EngJadwal`; opsional `LINEAGE`/`RELATED_SA`.

## 5. Non-Scope

- Tidak membangun modul SA 510 baru (enhance `opening`).
- Tidak mengubah `AMS_CANON` / `forensic_canon` (tak ada figur canon tersentuh; fee_concentration adalah modul pure baru di luar canon).
- Tidak migrasi Prisma untuk `priorYear` (pakai StateDoc — lihat §8-F3) kecuali disetujui sebaliknya.
- Tidak membangun konektor data fee otomatis (fee tetap dari `CLIENTS.fee`/`INVOICES` seed/SSOT).
- Tidak mengubah `ethics_gate` menjadi per-perikatan (F2 melengkapi, bukan mengganti; gate tahunan tetap).
- Tidak menyentuh track legacy `app/` / `NeoSuite AMS.html`.

## 6. Constraints

- **ESM-only, TypeScript strict penuh.** Edit di `migration/src/*`; register view via **import langsung di `app.tsx`** (bukan `<script>`). `tsc --noEmit` = 0, dua tier.
- **Ratchet `no-explicit-any`** — file `.ts`/`.tsx` yang disentuh tidak boleh menambah `:any` (memicu un-suppress seluruh file).
- **SSOT keras.** Fee dari `CLIENTS.fee` + `FIRMFIN.pl().revenue`; jangan hardcode rasio. `priorYear` sekali dipersist tidak boleh dibaca lagi dari konstanta.
- **Persist seam** = `useAmsPersist`/`useServerState` → StateDoc (scope firm/engagement). CAS versioned; try/catch JSON.
- **Isolasi & gate** = kapabilitas `CAP.*` (UI `can()`) + server `assertCanWrite`; deklarasi/keputusan = append-only trail (pola `onboarding`).
- **Server:** perubahan skema (bila ada) via `prisma:generate && db:push && seed` (dev SQLite; Postgres pakai migrations). Reseed wajib bila menyentuh seed.

## 7. Existing Solutions (yang di-reuse, dengan ref)

| Aset | Lokasi | Dipakai untuk |
|---|---|---|
| Modul SA 510 `opening` | `view_opening.tsx` (badge `SA 510` :77; predecessor :69-71; komunikasi ¶6 :161; matriks ¶10-13 :378; WP A-510 :412; toggle `awal` :69) | F1 (enhance) |
| `assessment_model` (SSOT skor) | `assessment_model.ts` (`weightedScore` :46, `verdict` :57, `AssessmentFactor` :15) | F1, F2, F4 (faktor independensi 20-pt) |
| `continuance_engine` | `continuance_engine.ts` (`continuanceFlags` :125; pemicu fee overdue :151; independensi :140-148; priorYear :156-165) | F2/F4 pemicu, F3 baca |
| `INDEPENDENCE` (per-AP) | `data_part1.ts:321` | F2 (pola & rotasi), tetap dipakai untuk rotasi AP |
| `STAFF` + `SCHEDULE` (roster & alokasi) | `data_part1.ts:277`, `:245` | F2 (gantungan anggota × perikatan) |
| `ethics_gate` / `ethics_compliance` (precedent blok sign-off) | `ethics_gate.tsx:28`, `ethics_compliance.ts:50` | F2 (pola gate) |
| `CLIENTS.fee` + `FIRMFIN` | `data_part1.ts:29`, `data_firmfin.ts` (`pl().revenue` :177; `partners()` :236) | F4 numerator/denominator |
| `PRIOR_YEAR` konstanta | `data_part1.ts:391` | F3 (jadi seed awal StateDoc) |
| Persist seam `useServerState`/`useAmsPersist` + StateDoc | `contexts.tsx:210-296`; `router.ts` `state.get`/`state.set` :670-756; `schema.prisma` StateDoc :363 | F2/F3 |
| Deep-link `ATL_TASKS` + `useInitialTab`/`useInitialSelection` | `view_audittimeline.tsx:35-60,187`; `contexts.tsx:58-84` | F5 |
| `EngJadwal` (portofolio → deep-link timeline) | `view_eng2.tsx:220-320` (tombol Lini Masa Detail :296) | F5 |
| Segel ekspor Ed25519 | `amsExportPdf`/`amsExportXlsx` + `exportVerifySeal` (pola `view_onboarding.tsx:14-17,299-311`) | F1/F2 dokumentasi tersegel |

## 8. Proposed Approach (per fitur)

### F3 — `priorYear` server-persist  → **REKOMENDASI: StateDoc firma (bukan kolom Prisma)**
Simpan sebagai StateDoc `(scope='firm', scopeId=FIRM_SCOPE_ID, key='priorYear')` bernilai `Record<clientId, PriorYear>`, mengikuti pola `clients` (`contexts.tsx:379`) & `continuanceDecisions`.
- **Alasan menang atas kolom Client:** (a) **nol migrasi Prisma** & nol perubahan `bootstrap`/`hydrateCoreFromApi`/`seed`; (b) `priorYear` adalah **data kertas-kerja auditor** (dapat diedit, versioned, ber-trail via StateDocHistory) — lebih tepat sebagai StateDoc daripada kolom CRM statis; (c) konsisten dengan seam yang sudah dipakai. Kolom Client cocok hanya bila `priorYear` jadi atribut master read-only lintas-modul — bukan kasusnya.
- Baca: `view_continuance.tsx:141` & `PriorYearCard` beralih dari `PRIOR_YEAR[c.id]` → `useAmsPersist('priorYear', seedFromConstant)`. Seed awal = konstanta `PRIOR_YEAR` (fallback saat StateDoc kosong/version 0).
- Edit: form kecil di continuance (dan/atau opening) untuk auditor memutakhirkan pengalaman tahun-lalu.
- **Diperlukan keputusan:** apakah seed disuntik server-side (via `AmsSeed`) atau dibiarkan client-side hydrate-on-first-load (default StateDoc: version 0 → pakai fallback konstanta, tulis saat pertama diedit). Rekomendasi: **hydrate-on-first-load** (paling ringan; server tetap SSOT setelah edit pertama).

### F4 — Konsentrasi fee
- **Modul pure** `fee_concentration.ts`: `feeConcentration(clients, firmRevenue, partnersAgg, config)` → per klien `{ clientId, fee, ratioFirm, ratioPartner, level, pieRecurring }`, plus agregat firma/partner.
- **Denominator (open question OQ-2):** rekomendasi **`FIRMFIN.pl().revenue` (GL 4-100 = 11.3B)** sebagai total pendapatan firma (lebih lengkap, termasuk non-audit) untuk rasio Kode Etik; **plus** rasio klien↔portofolio-partner via `FIRMFIN.partners()`. Catat caveat: `Σ CLIENTS.fee` (9.3B) ≠ GL revenue — dokumentasikan pilihan.
- **Ambang** `FEE_CONCENTRATION_CONFIG` (dapat dikonfigurasi): PIE 15% (perhatian) berulang 2 tahun (ancaman signifikan), non-PIE ambang lebih tinggi/none. Nilai default menunggu konfirmasi Ari (OQ-3).
- **Pemicu** baru di `continuance_engine.ts` sebagai sibling pemicu overdue (`:151`): `ratioFirm ≥ ambang` → med/high "Konsentrasi imbalan". Terpetakan ke faktor independensi 20-pt `assessment_model`.
- **Surfacing:** panel tingkat-firma (di modul `firm`/dashboard atau tab `continuance` "Konsentrasi Fee") + baris per-klien di continuance.

### F2 — Deklarasi independensi per-anggota
- **Struktur baru** (open question OQ-1 granularitas): rekomendasi **anggota × perikatan** — `Record<engagementId, Record<memberId, MemberIndependence>>`, di-seed dari `SCHEDULE.alloc` (anggota→ENG). `MemberIndependence = { declared, threats: {financial, family, selfReview, familiarity, feeDependent, ...}, safeguards, note, signedAt }`.
- **Engine pure** `member_independence.ts`: status agregat per perikatan (`clean`/`safeguarded`/`blocked`), reuse pola verdict.
- **View:** `view_independence.tsx` (matriks anggota × ancaman, tanda-tangan, safeguard) — atau tab di modul planning. Gate: lihat = anggota tim/oversight; tandatangan = diri sendiri; kunci = `CAP.FIRM_ADMIN`.
- **Gate sign-off:** ikut precedent `ethics_gate` — bila ada ancaman merah tak-tersafeguard, blok `wp_signoff`/opini (mengikuti `ethics_gate.tsx` sebagai model, ditambah dimensi per-perikatan).
- **Persist:** StateDoc engagement-scoped `key='memberIndependence'`.

### F1 — SA 510 pendalaman `opening`
- Tambah **blok penilaian risiko tahun-pertama** (reuse `assessment_model`): faktor mis. keandalan auditor pendahulu, akses/izin KK (¶6), sengketa/keterbatasan, opini pembuka termodifikasi, konsistensi kebijakan. Verdict + persist (`useAmsPersist('openingAssessment', …)`), roll-up ke gerbang fase & WP A-510.
- Perdalam profil & komunikasi auditor pendahulu (status izin klien, tanggal komunikasi, respons, hambatan).
- Segel ekspor memo SA 510 (pola `onboarding`).
- Tambah `LINEAGE.opening` up ← `onboarding`/`continuance`; opsional chip di continuance untuk klien tahun-pertama.

### F5 — Keterkaitan jadwal & lini masa
- Tambah ke `ATL_TASKS.Perencanaan` (fraksi awal, di sekitar A-100 `continuance`):
  - SA 510 → `{ mod:'opening', selClient:true }` (hanya tampil/relevan bila engagement tahun-pertama).
  - Independensi → `{ mod:'independence'/target, tab? }`.
  - Konsentrasi fee → `{ mod:'continuance', tab:'fee' }` atau modul firma.
- `EngJadwal` menautkan (milestone/deep-link). Opsional `LINEAGE.audittimeline` (belum ada).

## 9. Risks

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Duplikasi SA 510 (modul baru vs `opening`) | Tabrakan id/route, pelanggaran anti-duplikasi | Enhance `opening`; **tanpa** id baru. |
| Denominator fee ambigu (GL vs Σfee tak rekonsiliasi) | Rasio menyesatkan | Pilih GL revenue eksplisit + dokumentasikan caveat; tampilkan basis di UI. |
| `priorYear` StateDoc vs seed konstanta drift | Data lama vs baru bentrok | Fallback konstanta hanya saat version 0; setelah edit, server SSOT. |
| Gate independensi terlalu agresif → blok sign-off sah | Hambat kerja | Ancaman **merah tak-tersafeguard** saja yang blok; safeguard/override (FIRM_ADMIN) seperti `ethics` override. |
| Ratchet `:any` un-suppress file besar | Gate merah | Ketik penuh struktur baru sejak awal; hindari `:any`. |
| Timeline hanya relevan tahun-pertama untuk SA 510 | Tugas muncul salah konteks | Tugas SA 510 kondisional `engType==='awal'`. |
| Menyentuh `continuance_engine` → regresi keberlanjutan | Bug fase Penerimaan | Tambah unit test engine; verifikasi live role Manager/Partner. |

## 10. Implementation Plan (bertahap — 4 PR)

Urutan dipilih dari **paling terisolasi → paling lintas-modul**; tiap PR self-contained, gate hijau, dan **membawa keterkaitan timeline-nya sendiri** (F5 dilipat ke tiap PR).

- **PR-1 · F3 `priorYear` server-persist** *(paling kecil, buka jalan; hapus workaround)*
  - StateDoc `priorYear`; baca via `useAmsPersist` di `view_continuance.tsx`; form edit; seed fallback konstanta.
  - Test: server StateDoc round-trip; typecheck 2-tier; live continuance.
- **PR-2 · F4 Konsentrasi fee** *(pure module + pemicu + panel)*
  - `fee_concentration.ts` + `FEE_CONCENTRATION_CONFIG`; pemicu `continuance_engine`; panel firma + baris continuance; tugas timeline `tab:'fee'`.
  - Test: unit fee_concentration (rasio, ambang, PIE berulang); unit continuance_engine (pemicu baru); live.
- **PR-3 · F2 Independensi per-anggota** *(data + engine + view + gate)*
  - `member_independence.ts` + StateDoc engagement; `view_independence.tsx`; integrasi precedent `ethics_gate`; gate kapabilitas; tugas timeline.
  - Test: unit engine status/blok; live sign-off blocked→safeguarded.
- **PR-4 · F1 SA 510 pendalaman `opening`** *(enhance view + skor + segel + lineage)*
  - Blok penilaian tahun-pertama (reuse `assessment_model`); pendalaman auditor pendahulu; segel ekspor; `LINEAGE.opening`; tugas timeline kondisional `awal`.
  - Test: typecheck; live opening role terkait; verify-seal.

Setiap PR: `npm run typecheck` (migration+server) · `lint` · `build` · `server test` · reseed bila perlu · verifikasi live sesuai peran · tunggu CI hijau sebelum merge.

## 11. Open Questions (butuh keputusan Ari)

- **OQ-1 (F2 granularitas):** Deklarasi per **anggota × perikatan** (rekomendasi — ancaman spesifik penugasan) atau per **anggota × periode** (lebih ringan, mirip `ethics` tahunan)? Rekomendasi: **× perikatan**.
- **OQ-2 (F4 denominator):** Rasio konsentrasi terhadap **GL revenue `4-100` (11.3B, rekomendasi)** atau **Σ `CLIENTS.fee` (9.3B)**? (Keduanya tak rekonsiliasi.)
- **OQ-3 (F4 ambang):** Konfirmasi ambang Kode Etik: PIE **15%** (perhatian) & **berulang 2 tahun** (ancaman signifikan); non-PIE — none atau ambang tersendiri (mis. 30%)? Basis regulasi (IESBA 290 / SPAP) yang ingin dikutip di UI?
- **OQ-4 (F3 seed):** `priorYear` di-seed **server-side** (via `AmsSeed`) atau **hydrate-on-first-load** dari konstanta (rekomendasi — paling ringan)?
- **OQ-5 (F2 penempatan view):** modul mandiri `view_independence.tsx` (grup Firm Practice Management) atau **tab** di modul planning/continuance yang ada?
- **OQ-6 (dependensi PR):** setuju urutan PR-1→PR-4, atau prioritaskan salah satu (mis. F2 independensi lebih dulu karena risiko sign-off)?

---

> **Menunggu:** balas **"Proceed."** (atau "Proceed dengan catatan …") untuk mulai implementasi PR-1. Jawaban atas OQ-1..OQ-6 dapat menyusul saat PR terkait dimulai; default = rekomendasi di atas bila tidak dikoreksi.
