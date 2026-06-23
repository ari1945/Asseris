# PRD — SA 260 & SA 265 Auditable: Komunikasi TCWG + Register Defisiensi ter-persist + Sign-off SA 230

> Status: **DRAFT — menunggu sign-off ("Proceed.")**. Dokumen ini *merancang*, belum *membangun*.
> Stream: track **"jadikan modul display-only auditable"** dari [[asseris-gap-matrix-eval]] — **pola terbukti PR#7 (SA 250) & PR#8 (SA 620)**. Ulangi mekanik yang sama atas 2 modul terakhir di file `view_sa2comm.tsx`.
> Acuan gap: `SA260View` + `SA265View` ([view_sa2comm.tsx](migration/src/view_sa2comm.tsx)) sudah ada & kaya tetapi **display-only** (hardcoded const, local-state, tanpa persist/scope; SA 260 punya **sign-off fiktif**).
> Sifat artefak: **level ENGAGEMENT** → `wpState`/`WP_MODULE_MAP` + `useAmsPersist('<key>.<engId>')`.

---

## 1. Problem

**SA 260 (Komunikasi dengan TCWG).** `SA260View` (3 tab: Pihak & Bentuk · Matriks Komunikasi · Temuan Signifikan):
- **Matriks komunikasi** (`TCWG_MATRIX`, 6 hal wajib ¶14–17) & **temuan signifikan** (`TCWG_FINDINGS`, 4 hal) = const modul-level hardcoded — tak bisa ditandai status/ditambah, tak engagement-scoped, tak ter-persist.
- **Sign-off FIKTIF.** `S260Findings` punya panel "Sign-off" dengan nama statis (Anindya Pramesti 10 Mar / Hartono Wijaya —) — bukan SSOT, menyesatkan.
- **Tombol inert** ("Laporan ke TCWG", "AI Assist").

**SA 265 (Defisiensi Pengendalian Internal).** `SA265View` (3 tab: Register & Klasifikasi · Indikator · Komunikasi):
- **Register defisiensi** (`DEFICIENCIES`, 5 pos, klasifikasi signifikan/biasa ¶6) = const hardcoded — tak bisa tambah/edit/klasifikasi-ulang, tak engagement-scoped, tak ter-persist.
- **Draf surat ke TCWG** (`S265Comms`) memakai **nama firma hardcoded** "KAP Wijaya, Pramesti & Rekan" (bukan `AMS.FIRM`) — salah firma bila di-rebrand/multi-AP.
- Tanpa sign-off; tombol inert.

> Konsekuensi identik SA 250/620: modul tampak lengkap, tetapi **tak bisa jadi kertas kerja** — tak masuk `WpCompletenessRecap`, tak terikat gerbang Arsip. SA 260/265 kritis: kewajiban komunikasi TCWG (¶ wajib) & defisiensi signifikan adalah area inspeksi.

## 2. Objective

Jadikan SA 260 & SA 265 **auditable** dengan **mekanik sama PR#7/#8**: register tersimpan & engagement-scoped, sign-off 2-tingkat + kesimpulan SA 230 kanonik (ganti sign-off fiktif), tombol fungsional — reuse `WP_MODULE_MAP`/`wp_signoff` + `useAmsPersist` + `amsExportPdf`, menambah lapisan tulis di atas UI yang ada.

## 3. Success Criteria

- **Generic layer:** `sa260` & `sa265` terdaftar di `WP_MODULE_MAP` → kontrol "Kertas Kerja" di SubBar (sign-off + bukti + kesimpulan SA 230), masuk `WpCompletenessRecap` & gerbang Arsip.
- **SA 260 ter-persist:** status matriks komunikasi (per hal wajib) dapat ditandai + ber-jejak; temuan signifikan dapat tambah/edit (area/severitas) — bertahan reload, per-engagement. **Sign-off fiktif → `WpPanel` kanonik** (SSOT).
- **SA 265 ter-persist:** register defisiensi tambah/edit/klasifikasi (signifikan/biasa, penyebab, dampak, status komunikasi) — bertahan reload, per-engagement. Draf surat & nama firma dinamis (`AMS.FIRM`).
- **Tombol nyata:** "Laporan ke TCWG"/"Surat ke TCWG" → `amsExportPdf`; "AI Assist" disembunyikan.
- Gate teknis: `typecheck` + `lint` (ratchet `no-explicit-any` utuh, **0 `:any` baru** — alias `Ev`) + **vitest hijau** (migration ≥82, server ≥116); canon tak tersentuh; 0 error konsol saat boot.
- Verifikasi live bila kredensial dev tersedia; jika tidak, gate statis + build bersih (precedent PR#6/#7/#8).

## 4. Scope

- **`sa260` & `sa265` → `WP_MODULE_MAP`** dengan `requiredEvidence` masing-masing (SA 260: laporan kepada TCWG, risalah komunikasi; SA 265: surat defisiensi signifikan, daftar defisiensi & klasifikasi).
- **SA 260 persist** engagement-scoped: `useAmsPersist('tcwg.' + engId, () => TCWG_SEED)` berisi `{ matrix, findings }`. Status matriks editable; findings tambah/edit/hapus ber-jejak. Ganti panel sign-off fiktif → `<WpPanel moduleId="sa260" />`.
- **SA 265 persist** engagement-scoped: `useAmsPersist('deficiencies.' + engId, () => DEFICIENCIES_SEED)`. Tambah/edit/hapus defisiensi + klasifikasi sig + status komunikasi, ber-jejak. Draf surat membaca register persist + `AMS.FIRM`. (Sign-off via SubBar; opsional `WpPanel` di tab Komunikasi.)
- **Wire tombol** export + sembunyikan AI Assist (kedua modul).
- Reuse penuh: `WP_MODULE_MAP`, `WpSubBarControl`/`WpPanel`, `useAmsPersist`, `amsExportPdf`, alias `Ev`, primitif `ui.tsx`.

## 5. Non-Scope

- Tab statis referensi (Pihak & Bentuk SA 260, Indikator SA 265) — konten benar, biarkan.
- e-reporting nyata ke TCWG/PPPK (tetap rekam + jejak in-app).
- Narasi/sintesis AI (jalur W8/P4).
- Tautan otomatis temuan SA 260 ↔ register SA 240/250/265 (chip link tetap statis; integrasi lintas-modul = track tersendiri).
- Multi-tenant per-firma (W7.5).

## 6. Constraints

- ESM-only, edit `migration/src/view_sa2comm.tsx` + `wp_signoff.tsx`; aturan emas anti-tabrakan (alias `useStateSC` sudah ada; ekspor terjaga).
- **Engagement-scoped** → `wpState` (sign-off/kesimpulan) + `useAmsPersist('<key>.<engId>')` (register). Bukan firm-scope.
- Ratchet `no-explicit-any`: tipe baru (`TcwgMatrixRow`/`TcwgFinding`/`Deficiency`) penuh; handler pakai alias `Ev` (sudah ada di file dari PR#7); tanpa suppression baru (boleh prune bila turun).
- Angka/severitas berdampingan dengan kesimpulan auditor (SA 230), tak menimpa.
- **PRD dulu sebelum implementasi.**

## 7. Existing Solutions / yang dipakai ulang

- **PR#7 (SA 250) & PR#8 (SA 620)** — cetak biru: `WP_MODULE_MAP` entry + `useAmsPersist('<key>.<engId>')` + `amsExportPdf` + alias `Ev` + `WpPanel` inline pengganti sign-off fiktif (persis kasus PR#8).
- **`TCWG_MATRIX`/`TCWG_FINDINGS`/`DEFICIENCIES`** — jadi seed `useAmsPersist` apa adanya (backward-compat).
- **Alias `Ev` + helper `nocToday`** sudah ada di `view_sa2comm.tsx` dari PR#7 → langsung dipakai (atau `tcwgToday` baru bila perlu).

## 8. Proposed Approach

1. **Generic layer:** tambah `sa260` & `sa265` ke `WP_MODULE_MAP`. Verifikasi chip "Kertas Kerja" muncul di SubBar masing-masing.
2. **SA 260:** lift `TCWG_MATRIX`/`TCWG_FINDINGS` → `useAmsPersist('tcwg.'+engId, () => ({matrix, findings}))` di `SA260View`, thread ke `S260Matrix`/`S260Findings`. Status matriks = select editable ber-jejak; findings tambah/edit/hapus. Ganti panel "Sign-off" fiktif → `<WpPanel moduleId="sa260" />`. Wire "Laporan ke TCWG" → `amsExportPdf`; sembunyikan AI Assist.
3. **SA 265:** lift `DEFICIENCIES` → `useAmsPersist('deficiencies.'+engId, () => DEFICIENCIES_SEED)` di `SA265View`, thread ke `S265Register`/`S265Comms`. Tambah/edit/hapus + klasifikasi sig + status, ber-jejak. `S265Comms` baca register persist + `AMS.FIRM.name`. Wire "Surat ke TCWG" → `amsExportPdf`; sembunyikan AI Assist.
4. **Header counts** (done/sig/findings) tetap, dihitung dari state persist.

## 9. Risks

- **File besar tersentuh banyak fungsi** (SA250/260/265 satu file) → mitigasi: SA 250 sudah selesai & stabil (jangan sentuh); fokus SA260View/S260*/SA265View/S265* saja; gate penuh tiap fase.
- **`:any` baru** → pakai alias `Ev` (sudah ada) + tipe register penuh; verifikasi `lint` per fase; prune bila count turun.
- **Migrasi seed→persist** → `useAmsPersist` kembalikan seed bila kosong; field tambahan opsional (backward-compat).
- **`WpPanel` inline SA 260** mengubah layout kolom kanan S260Findings → mitigasi: WpPanel drop-in menggantikan satu `<Panel>`, layout grid tetap (sudah terbukti di PR#8 ExpConclusion).
- **Verifikasi live terhalang auth** → gate statis + build bersih; tandai eksplisit.

## 10. Implementation Plan (bertahap, reversible)

- **Fase 1 — Generic layer:** `sa260` + `sa265` → `WP_MODULE_MAP` + verifikasi SubBar. Gate + commit.
- **Fase 2 — SA 260 ter-persist:** matriks + findings persist + sign-off fiktif→`WpPanel` + export + hide AI Assist. Gate + verifikasi. Commit.
- **Fase 3 — SA 265 ter-persist:** register defisiensi persist + draf surat dinamis (`AMS.FIRM`) + export + hide AI Assist. Gate + verifikasi. Commit.
- Tiap fase: `npm run lint`+`typecheck`+`test`+`build` (migration) & server `typecheck`+`test`; commit; update memory [[asseris-gap-matrix-eval]].
- PR off `master` (branch `sa260-265-auditable`).

## 11. Open Questions (perlu keputusan Anda sebelum "Proceed.")

1. **Satu PR untuk SA 260 + SA 265, atau pisah?** *(rekomendasi: satu PR — file & pola sama, fase terpisah; sejalan SA 250 satu-PR-multi-fase.)*
2. **Kedalaman SA 260** — cukup persist status matriks + findings (PRD ini), atau termasuk editor "Pihak Tata Kelola" (saat ini statis)? *(rekomendasi: status + findings dulu; pihak = referensi, fase lanjutan.)*
3. **Sign-off SA 265** — cukup via SubBar (chip Kertas Kerja), atau `WpPanel` inline di tab Komunikasi juga (spt SA 260)? *(rekomendasi: SubBar cukup + `WpPanel` inline di tab Komunikasi untuk simetri & visibilitas.)*
4. **AI Assist** — sembunyikan (konsisten SA 250), benar? *(rekomendasi: ya; W8 = track terpisah.)*
5. **Track setelah ini** — ICFR/serviceorg (verifikasi kedalaman) atau pivot ke kedalaman substantif (going concern kuantitatif SA-08)? *(rekomendasi: tinjau ICFR/serviceorg dulu — bila display-only juga, lanjut pola; bila sudah auditable, pivot ke substantif.)*
