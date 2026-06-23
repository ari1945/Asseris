# PRD — SA 402 Auditable: Register Organisasi Jasa ter-persist + Sign-off & Kesimpulan SA 230

> Status: **DRAFT — menunggu sign-off ("Proceed.")**. Dokumen ini *merancang*, belum *membangun*.
> Stream: track **"jadikan modul display-only auditable"** dari [[asseris-gap-matrix-eval]] — **pola terbukti PR#7/#8/#9** (SA 250/620/260/265). Ini repetisi ke-5.
> Acuan gap: `ServiceOrg` ([view_serviceorg.tsx](migration/src/view_serviceorg.tsx)) sudah ada & kaya (5 tab) tetapi **murni display-only** (const hardcoded, tanpa `setData`); ada **sign-off fiktif** + **narasi kesimpulan hardcoded**.
> Sifat artefak: **level ENGAGEMENT** → `wpState`/`WP_MODULE_MAP` + `useAmsPersist('serviceorgs.<engId>')`.

---

## 1. Problem

Modul SA 402 (`ServiceOrg`, 5 tab: Konteks & Peta Dampak · Register Laporan Asurans · CUEC · Subservice & Pengecualian · Kesimpulan & Dampak) menyajikan kerangka SA 402 lengkap atas 4 organisasi jasa contoh (payroll, data center, kustodian, BPO penagihan). **Tetapi tidak auditable:**

- **Register hardcoded, nol interaktif.** `SO_ORGS` (+ `SO_CUEC`, `SO_EXCEPTIONS`, `SO_AUDITOR_EVAL`) = const modul-level. `ServiceOrg()` hanya `useStateSO` untuk tab — **tak ada editing sama sekali**, tak engagement-scoped, tak ter-persist.
- **Sign-off FIKTIF.** Tab Kesimpulan punya panel "Sign-off" dengan nama statis (Dimas/Anindya/Hartono) — bukan SSOT.
- **Narasi kesimpulan hardcoded.** "Kesimpulan Auditor" memuat klaim spesifik per-org (PT Payroll, CloudKas…) — akan stale bila register berubah.
- **Tombol inert** ("Memo Organisasi Jasa", "Tambah Organisasi Jasa").
- **Tak di `WP_MODULE_MAP`** → tak masuk `WpCompletenessRecap`/gerbang Arsip.

> **Catatan SSOT yang harus dijaga:** `SO-01` disinkron dari `socEngine().userAuditorView` (perikatan auditor-jasa SJAH 3402, `ASR-2025-081`) via IIFE saat load — agar sisi auditor-pengguna tak menyimpang dari laporan yang KAP terbitkan sendiri. Sinkronisasi ini **wajib dipertahankan** di atas data ter-persist.

## 2. Objective

Jadikan SA 402 **auditable** dengan **mekanik sama PR#7/#8/#9**: register organisasi jasa tersimpan & engagement-scoped (tambah/edit), sign-off + kesimpulan SA 230 kanonik (ganti fiktif), narasi dinamis, tombol fungsional — reuse `WP_MODULE_MAP`/`wp_signoff` + `useAmsPersist` + `amsExportPdf`. Menambah lapisan tulis; **tak membongkar** sinkronisasi `socEngine` SO-01.

## 3. Success Criteria

- **Generic layer:** `serviceorg` terdaftar di `WP_MODULE_MAP` → kontrol "Kertas Kerja" di SubBar (sign-off + bukti + kesimpulan SA 230), masuk `WpCompletenessRecap` & gerbang Arsip.
- **Register ter-persist & engagement-scoped:** `SO_ORGS` via `useAmsPersist('serviceorgs.<engId>')`; auditor dapat **tambah/edit/hapus** organisasi jasa (field kunci: nama, jasa, tipe laporan, standar, periode, cakupan, auditor jasa, opini, metode, signifikansi, areas/asersi, strategi, status) — bertahan reload, per-engagement, ber-jejak `{by,at}`.
- **Sinkronisasi SO-01 dipertahankan:** field SO-01 dari `socEngine` tetap menimpa data ter-persist saat render (SSOT tak menyimpang).
- **Kesimpulan kanonik:** narasi "Kesimpulan Auditor" → ringkasan **dinamis** dari register; **panel sign-off fiktif → `WpPanel`** (SSOT sign-off + SA 230).
- **Tombol nyata:** "Tambah Organisasi Jasa" → tambah skeleton; "Memo Organisasi Jasa" → `amsExportPdf`.
- Gate teknis: `typecheck` + `lint` (ratchet `no-explicit-any` utuh, **0 `:any` baru** — alias `Ev` + tipe `ServiceOrgRow`) + **vitest hijau** (migration ≥82, server ≥116); canon/socEngine tak tersentuh; 0 error konsol saat boot.
- Verifikasi live bila kredensial dev tersedia; jika tidak, gate statis + build bersih (precedent PR#6–#9).

## 4. Scope

- **`serviceorg` → `WP_MODULE_MAP`** dengan `requiredEvidence` SA 402 (laporan auditor jasa Type 1/2; evaluasi auditor jasa & CUEC; prosedur atas pengecualian/gap/tanpa-laporan).
- **Persist `SO_ORGS`** engagement-scoped: `useAmsPersist('serviceorgs.' + engId, () => SO_ORGS_SEED)`. Sinkronisasi SO-01 `socEngine` di-apply sebagai derive-on-render di atas data persist (bukan mutasi const). Form tambah/edit/hapus org, ber-jejak.
- **Tab Kesimpulan:** narasi dinamis (hitung dari register: total/Type 2/pengecualian/tanpa-laporan + tingkat pengandalan) + `<WpPanel moduleId="serviceorg" />` pengganti panel sign-off fiktif.
- **Wire tombol** "Tambah Organisasi Jasa" + "Memo Organisasi Jasa" (export).
- Reuse penuh: `WP_MODULE_MAP`, `WpPanel`, `useAmsPersist`, `amsExportPdf`, alias `Ev`, primitif `ui.tsx`, pola register PR#7–#9.

## 5. Non-Scope

- **Editing CUEC (`SO_CUEC`) & pengecualian (`SO_EXCEPTIONS`) inline** — tetap display (keyed map per-org); persist + edit data uji CUEC/pengecualian = **fase lanjutan**. PRD ini fokus register utama + kesimpulan + sign-off.
- Tab statis referensi (Konteks/Peta, Subservice penjelasan) — biarkan.
- Mengubah sinkronisasi/`socEngine`/perikatan SJAH 3402 (SSOT auditor-jasa) — hanya **dibaca**.
- Narasi/sintesis AI (W8/P4); e-reporting nyata; multi-tenant (W7.5).

## 6. Constraints

- ESM-only, edit `migration/src/view_serviceorg.tsx` + `wp_signoff.tsx`; aturan emas anti-tabrakan (alias `useStateSO` ada; ekspor terjaga).
- **Engagement-scoped** → `wpState` (sign-off) + `useAmsPersist('serviceorgs.<engId>')` (register).
- **Jaga SSOT SO-01:** sinkronisasi `socEngine` tetap berlaku (derive-on-render); jangan persist hasil sinkron sebagai data beku yang bisa basi.
- Ratchet `no-explicit-any`: tipe `ServiceOrgRow` penuh; handler `Ev`; **tanpa suppression baru** (boleh prune bila turun). Catatan: `SO_ORGS: any[]` saat ini → akan dipersempit.
- **PRD dulu sebelum implementasi.**

## 7. Existing Solutions / yang dipakai ulang

- **PR#7/#8/#9** — cetak biru: `WP_MODULE_MAP` entry + `useAmsPersist('<key>.<engId>')` + `amsExportPdf` + alias `Ev` + `WpPanel` inline pengganti sign-off fiktif + narasi dinamis (persis PR#8 ExpConclusion & PR#9).
- **`SO_ORGS`/`SO_CUEC`/…** — jadi seed apa adanya (backward-compat).
- **`socEngine()`** (AMS) — SSOT SO-01; dibaca, tak diubah.

## 8. Proposed Approach

1. **Generic layer:** tambah `serviceorg: { ref: 'serviceorg', requiredEvidence: [...] }` ke `WP_MODULE_MAP`. Verifikasi chip "Kertas Kerja" di SubBar.
2. **Persist register:** di `ServiceOrg`, `useAmsPersist('serviceorgs.'+engId, () => SO_ORGS_SEED)`. Pindahkan sinkronisasi SO-01 dari IIFE → fungsi `applySocSync(list)` derive-on-render. Tipe `ServiceOrgRow`. Thread orgs + setter ke `SORegister`/`SOImpact`/`SOConclusion` (header counts dari orgs persist).
3. **Editable register:** di `SORegister`, form edit field kunci + tambah/hapus org (skeleton minimal-valid) ber-jejak; SO-01 (tersinkron) read-only untuk field yang dari `socEngine`.
4. **Kesimpulan kanonik:** `SOConclusion` narasi dinamis (hitung pengandalan dari status/coverage) + `<WpPanel moduleId="serviceorg" />` ganti panel sign-off fiktif.
5. **Tombol:** "Tambah Organisasi Jasa" → push `blankServiceOrg`; "Memo Organisasi Jasa" → `amsExportPdf` (register + kesimpulan).

## 9. Risks

- **Merusak sinkronisasi SO-01 SSOT** → mitigasi: sinkron sebagai derive-on-render di atas persist (bukan persist hasil sinkron); SO-01 field tersinkron read-only di form.
- **Data nested (CUEC/exceptions keyed map)** → mitigasi: tetap display (non-scope); org baru tanpa CUEC ditangani defensif (`SO_CUEC[id] || []`).
- **`:any` baru** (`SO_ORGS: any[]`, beberapa `(x: any)`) → mitigasi: tipe `ServiceOrgRow` + `Ev`; lint per fase; prune bila turun.
- **Layout `WpPanel` di kolom kanan SOConclusion** → drop-in ganti satu `<Panel>` (terbukti PR#8/#9).
- **Verifikasi live terhalang auth** → gate statis + build bersih; tandai eksplisit.

## 10. Implementation Plan (bertahap, reversible)

- **Fase 1 — Generic layer:** `serviceorg` → `WP_MODULE_MAP` + verifikasi SubBar. Gate + commit.
- **Fase 2 — Register ter-persist + editable:** `useAmsPersist` + `applySocSync` + form edit/tambah/hapus + tipe `ServiceOrgRow`. Gate + verifikasi. Commit.
- **Fase 3 — Kesimpulan kanonik + tombol:** narasi dinamis + `WpPanel` + export + "Tambah". Gate + verifikasi. Commit.
- Tiap fase: `npm run lint`+`typecheck`+`test`+`build` (migration) & server `typecheck`+`test`; commit; update memory [[asseris-gap-matrix-eval]].
- PR off `master` (branch `sa402-serviceorg-auditable`).

## 11. Open Questions (perlu keputusan Anda sebelum "Proceed.")

1. **Kedalaman edit** — cukup register utama (`SO_ORGS`) + kesimpulan + sign-off (PRD ini), atau termasuk persist data uji CUEC & pengecualian? *(rekomendasi: register + kesimpulan dulu; CUEC/pengecualian = fase lanjutan — bounded & rendah-risiko.)*
2. **SO-01 (tersinkron `socEngine`)** — field dari SJAH 3402 dibuat read-only di form (jaga SSOT), sisanya editable; benar? *(rekomendasi: ya.)*
3. **Sign-off** — pola WP standar preparer→reviewer via `WpPanel`, konsisten SA lain? *(rekomendasi: ya.)*
4. **Track setelah ini** — **ICFR (SA 315)** yang besar berikutnya (menuntaskan klaster pengendalian), atau pivot ke **kedalaman substantif** (going concern SA-08)? *(rekomendasi: ICFR berikutnya selagi pola panas; substantif setelahnya.)*
