# PRD — SA 570 Going Concern Substantif: Proyeksi Kas Editable + Uji Covenant + Evaluasi Mitigasi Manajemen

> Status: **DRAFT — menunggu sign-off ("Proceed.")**. Dokumen ini *merancang*, belum *membangun*.
> Stream: track **kedalaman substantif** dari [[asseris-gap-matrix-eval]] — temuan **SA-08 (going concern dangkal + tak persist)**, severitas **Tinggi & NYATA** (bukan overstated).
> **Beda sifat dari PR#7–#11:** ini bukan "persist UI display-only" — ini **memperdalam logika audit** (input nyata, domain baru: covenant & mitigasi) + persist. `goingconcern` sudah di `WP_MODULE_MAP` (Q-02 → sudah punya sign-off + kesimpulan SA 230).
> Sifat artefak: **level ENGAGEMENT** → `useAmsPersist('goingconcern.<engId>')`.

---

## 1. Problem

Modul SA 570 (`GoingConcern`) sebetulnya **interaktif & kaya**: stress test (penurunan pendapatan / efisiensi biaya / refinancing → proyeksi kas 12 bulan), 6 rasio likuiditas/solvabilitas, checklist indikator (¶A3), Altman Z, verdict otomatis (Low / Elevated / Material Uncertainty, ¶22). **Tetapi dangkal & menguap:**

- **Semua ephemeral.** `inds`, `revShock`, `costCut`, `financing` = `useStateGC` → hilang reload, tak engagement-scoped.
- **Input proyeksi HARDCODED.** Opening cash `21.9`, `baseInflow 28.5`, `baseOutflow 26.8`, debt bullet `8.0` (Jun & Des) = konstanta literal di `useMemo`. **Auditor tak bisa memasukkan angka klien nyata** — proyeksi kas hanya demo, tak bisa jadi kertas kerja.
- **Tak ada uji covenant.** Hanya toggle "refinancing tersedia". SA-08 menyebut covenant eksplisit — tak ada register/headroom/compliance.
- **Tak ada evaluasi rencana mitigasi manajemen (SA 570 ¶16).** Verdict menyebutnya, tetapi tak ada input terstruktur atas kelayakan rencana & bukti yang diperoleh — padahal ini inti prosedur SA 570.
- **Tombol inert** ("Memo Going Concern", "Simpulkan").
- Rasio & Altman Z hardcoded (bukan dari WTB/canon).

> Konsekuensi: penilaian going concern — area opini paling sensitif (paragraf material uncertainty / dasar penyusunan) — **tak bisa dibuktikan dengan kertas kerja**: angka tak nyata, asumsi tak tersimpan, mitigasi & covenant tak terdokumentasi.

## 2. Objective

Perdalam SA 570 jadi **substantif & auditable**: proyeksi kas dari **input nyata yang dapat diedit & tersimpan**, **register covenant** dengan headroom & status, **evaluasi rencana mitigasi manajemen (¶16)** terstruktur & ber-jejak — semuanya engagement-scoped & berdampingan dengan kesimpulan SA 230 yang sudah ada. Reuse `useAmsPersist` + `amsExportPdf` + `WpPanel`.

## 3. Success Criteria

- **Proyeksi editable & ter-persist:** asumsi proyeksi (opening cash, base inflow/outflow, jatuh tempo utang) + skenario stress (revShock/costCut/financing) + indikator (¶A3) dapat diedit, **bertahan reload**, beda per engagement. Grafik & verdict otomatis menyesuaikan input nyata.
- **Register covenant (baru):** auditor mencatat covenant (metrik, ambang, aktual, headroom, status Patuh/Pantau/Langgar) — persist, ber-jejak. Pelanggaran covenant memengaruhi verdict / disorot.
- **Evaluasi mitigasi manajemen (¶16, baru):** daftar rencana mitigasi (deskripsi, jenis, kelayakan High/Med/Low, bukti diperoleh Y/N, catatan) — persist, ber-jejak; ringkasan kelayakan menyatu ke kesimpulan.
- **Kesimpulan kanonik:** `<WpPanel moduleId="goingconcern" />` inline (SA 230, sudah ter-wire Q-02) + "Memo Going Concern" → `amsExportPdf` (asumsi + proyeksi + covenant + mitigasi + verdict).
- **Lock LUNAK:** editing terkunci saat engagement diarsipkan.
- Gate teknis: `typecheck` + `lint` (ratchet `no-explicit-any` utuh, **0 `:any` baru**, alias struktural) + **vitest hijau** (migration ≥82, server ≥116); canon tak tersentuh; 0 error konsol saat boot.
- **Verifikasi live (target):** track ini memperdalam LOGIKA (bukan sekadar persist) → diupayakan smoke nyata (boot dev + login dev creds) bila feasible; jika auth W7+TOTP tetap menghalangi, gate statis + build (sesuai precedent) dengan catatan eksplisit.

## 4. Scope

- **Persist engagement-scoped** `useAmsPersist('goingconcern.<engId>', () => GC_SEED)` berisi `{ assumptions, scenario, indicators, covenants, mitigations }`. Konteks `useFirm`/`useAuth` untuk `engId`/`me`/`locked`.
- **Asumsi proyeksi editable:** `assumptions {openingCash, baseInflow, baseOutflow, debtMonths:[{month, amount}]}` → proyeksi `useMemo` membaca dari state (bukan konstanta). Form input ringkas di panel Stress Test / panel baru "Asumsi Proyeksi".
- **Register covenant (baru):** `covenants[] {id, name, metric, threshold, actual, dir('≥'|'≤'), status, by, at}` + headroom dihitung; tambah/edit/hapus.
- **Evaluasi mitigasi (baru):** `mitigations[] {id, plan, type, feasibility, evidence(bool), note, by, at}`; tambah/edit/hapus; ringkasan kelayakan.
- **Verdict** memperhitungkan covenant breach (selain indikator & rasio).
- **`WpPanel` inline** + wire "Memo" export; "Simpulkan" → fokus/scroll ke WpPanel (atau dihapus bila redundan).
- Reuse: `useAmsPersist`, `amsExportPdf`, `WpPanel`, primitif `ui.tsx`, alias `Ev`.

## 5. Non-Scope

- **Derivasi rasio & Altman Z dari WTB/canon (SSOT).** Saat ini hardcoded; menderivasi via `AMS_CANON` = **follow-up** (perlu helper canon baru). PRD ini fokus proyeksi/covenant/mitigasi.
- Model proyeksi multi-skenario tersimpan (base/downside/severe sebagai snapshot terpisah) — fase lanjutan; PRD ini satu skenario aktif + stress slider.
- Integrasi data utang/jatuh tempo otomatis dari modul lain.
- Narasi/sintesis AI; multi-tenant.

## 6. Constraints

- ESM-only, edit `migration/src/view_goingconcern.tsx`; aturan emas (alias `useStateGC`/`useMemoGC` ada).
- **Engagement-scoped** `useAmsPersist('goingconcern.<engId>')`. (`wpState` sign-off sudah via WP_MODULE_MAP Q-02 — tak diubah.)
- Ratchet `no-explicit-any`: tipe `GCAssumptions`/`Covenant`/`Mitigation` penuh; handler `Ev`; tanpa suppression baru (prune bila turun).
- Proyeksi tetap deterministik (tanpa `Math.random`).
- **PRD dulu sebelum implementasi.**

## 7. Existing Solutions / yang dipakai ulang

- **PR#7–#11** — pola persist + `amsExportPdf` + `WpPanel` + alias `Ev` + lock LUNAK.
- **`useMemoGC` projection** — logika proyeksi sudah ada; cukup ganti sumber konstanta → state.
- **`goingconcern` ∈ `WP_MODULE_MAP`** (Q-02) — sign-off + kesimpulan SA 230 sudah ada.
- **Verdict scoring** (`triggered`/`ratioFlags`/`score`) — perluas dengan covenant.

## 8. Proposed Approach

1. **State persist:** `const [gc, setGc] = useAmsPersist('goingconcern.'+engId, () => GC_SEED)`. Pisahkan setter per-bagian (`setAssumptions`/`setScenario`/`setIndicators`/`setCovenants`/`setMitigations`). Seed dari konstanta hardcoded yang ada (backward-compat).
2. **Proyeksi dari input:** `projection` `useMemo` baca `gc.assumptions` + `gc.scenario`. Panel "Asumsi Proyeksi" (input opening cash, inflow, outflow, daftar jatuh tempo utang). Stress slider menulis `gc.scenario`.
3. **Covenant:** panel/register baru — tambah/edit covenant, hitung headroom (`dir` ≥/≤), status; breach → verdict +bobot & sorot.
4. **Mitigasi (¶16):** panel baru — daftar rencana + kelayakan + bukti; ringkasan ("X dari Y rencana layak & berbukti").
5. **Kesimpulan & tombol:** `<WpPanel moduleId="goingconcern" />` inline; "Memo" → `amsExportPdf`; "Simpulkan" → scroll ke WpPanel (atau hapus).
6. **Lock LUNAK** menonaktifkan editing saat arsip.

## 9. Risks

- **Scope balloon** (going concern bisa melebar) → mitigasi: 3 domain konkret (proyeksi/covenant/mitigasi); rasio-dari-canon & multi-skenario = Non-Scope eksplisit.
- **Memo/verdict tak konsisten dgn input baru** → mitigasi: verdict & memo dihitung dari state yang sama (satu sumber).
- **`:any` baru** → tipe domain penuh + alias `Ev`; lint per fase + prune.
- **Migrasi seed→persist** → `useAmsPersist` kembalikan seed bila kosong; bentuk baru aditif.
- **Verifikasi live** → upayakan smoke; bila auth menghalangi, gate statis + build + catatan eksplisit.

## 10. Implementation Plan (bertahap, reversible)

- **Fase 1 — Persist + proyeksi editable:** `useAmsPersist('goingconcern.<engId>')` + asumsi proyeksi editable + skenario/indikator persist + lock. Gate + verifikasi. Commit.
- **Fase 2 — Register covenant:** panel covenant + headroom/status + dampak verdict. Gate + verifikasi. Commit.
- **Fase 3 — Evaluasi mitigasi (¶16) + kesimpulan + tombol:** panel mitigasi + `WpPanel` + Memo export + rapikan "Simpulkan". Gate + verifikasi. Commit.
- Tiap fase: `npm run lint`+`typecheck`+`test`+`build` (migration) & server `typecheck`+`test`; commit; update memory [[asseris-gap-matrix-eval]].
- PR off `master` (branch `sa570-goingconcern-substantive`).

## 11. Open Questions (perlu keputusan Anda sebelum "Proceed.")

1. **Cakupan tiga domain** — setuju fokus **proyeksi editable + covenant + mitigasi (¶16)**, dan menunda **rasio/Altman dari canon** & **multi-skenario tersimpan** ke follow-up? *(rekomendasi: ya — tiga domain itu inti "dangkal"-nya SA-08; rasio-dari-canon perlu helper canon baru.)*
2. **Verifikasi live** — apakah kamu mau aku **mencoba boot dev server + login** (kredensial BUILD.md) untuk satu smoke nyata di track ini, atau cukup gate statis seperti 6 PR sebelumnya? *(rekomendasi: coba live — track ini logika kuantitatif, bukti perilaku berharga; bila auth/TOTP menghalangi, fallback gate statis.)*
3. **Rasio (GC_RATIOS)** — biarkan display hardcoded (follow-up canon), atau jadikan input editable sekalian? *(rekomendasi: biarkan display dulu; canon-derive = follow-up tersendiri agar SSOT benar.)*
4. **Track setelah ini** — AK-01 penomoran PSAK, persist domain fraud/sampling/estimasi, atau SA-01 sempit? *(rekomendasi: tinjau saat itu; substantif fraud/sampling kemungkinan track besar berikutnya.)*
