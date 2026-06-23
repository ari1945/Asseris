# PRD — SA 315 / ICFR Auditable: Risk-Control Matrix + Evaluasi Defisiensi ter-persist + Sign-off SA 230

> Status: **DRAFT — menunggu sign-off ("Proceed.")**. Dokumen ini *merancang*, belum *membangun*.
> Stream: track **"jadikan modul display-only auditable"** dari [[asseris-gap-matrix-eval]] — **pola terbukti PR#7–#10** (SA 250/260/265/402/620). Repetisi ke-6, **modul TERBESAR** (`view_icfr.tsx`, 724 baris).
> Acuan gap: `InternalControl` ([view_icfr.tsx](migration/src/view_icfr.tsx)) sudah ada & sangat kaya (4 tab + mesin uji & evaluasi) tetapi **dua store stateful ephemeral**.
> Sifat artefak: **level ENGAGEMENT** → `wpState`/`WP_MODULE_MAP` + `useAmsPersist('<key>.<engId>')`.

---

## 1. Problem

Modul ICFR (`InternalControl`, 4 tab: Ringkasan & COSO · Risk-Control Matrix · ITGC · Evaluasi Defisiensi) menyajikan kerangka SA 315/330/265 lengkap dengan **mesin interaktif nyata** — tetapi hasilnya **tidak bertahan**:

- **Store A — Risk-Control Matrix (`data = useStateIC(IC_CYCLES)`).** 6 siklus + ~22 kontrol; auditor menjalankan **walkthrough + Test of Controls** (`TestOfControls`) dan menekan **"Simpulkan: Efektif/Defisiensi"** → `setData` memutakhirkan `oper`/`wt`. **Hilang saat reload**, tak engagement-scoped.
- **Store B — Evaluasi Defisiensi (`assess` di `ICDeficiency`).** Klasifikasi severity per defisiensi (magnitudo × kemungkinan × kontrol kompensasi → Def. Pengendalian / Signifikan / Kelemahan Material, SA 265). Editable via Seg/toggle, **seed dari `DEF_SEED`** → **hilang saat reload**, tak engagement-scoped.
- **Tidak ada sign-off / kesimpulan auditor (SA 230).** Tak di `WP_MODULE_MAP` → tak masuk `WpCompletenessRecap`/gerbang Arsip.
- **Tombol inert** ("Export Matriks", "Kontrol Baru"). Tak ada konteks engagement (no `useFirm`).

> Konsekuensi: ini modul yang paling "terasa berfungsi" dari semua — auditor benar-benar menguji kontrol & mengklasifikasi defisiensi — namun **nol jejak tersimpan**. Kesimpulan pengandalan kontrol & agregasi kelemahan material (input langsung ke strategi audit & SA 265) menguap tiap reload. Gap auditabilitas paling material di seri ini.

## 2. Objective

Jadikan ICFR **auditable** dengan **mekanik sama PR#7–#10**: dua store (RCM + evaluasi defisiensi) tersimpan & engagement-scoped, sign-off + kesimpulan SA 230 kanonik, tombol export fungsional — reuse `WP_MODULE_MAP`/`wp_signoff` + `useAmsPersist` + `amsExportPdf`. **Bounded**: persist hasil judgment auditor; **bukan** membongkar mesin uji atau menambah CRUD kontrol penuh.

## 3. Success Criteria

- **Generic layer:** `icfr` terdaftar di `WP_MODULE_MAP` → kontrol "Kertas Kerja" di SubBar (sign-off + bukti + kesimpulan SA 230), masuk `WpCompletenessRecap` & gerbang Arsip.
- **RCM ter-persist & engagement-scoped:** kesimpulan Test of Controls (`oper`) + flag walkthrough (`wt`) bertahan reload, beda per engagement. `IC_CYCLES` jadi seed.
- **Evaluasi defisiensi ter-persist & engagement-scoped:** klasifikasi severity per defisiensi (mag/lik/comp) bertahan reload, beda per engagement. Akses defensif (defisiensi tanpa entri → default).
- **Kesimpulan kanonik:** `<WpPanel moduleId="icfr" />` di tab Evaluasi Defisiensi (sign-off + SA 230 SSOT).
- **Tombol:** "Export Matriks" → `amsExportPdf` (RCM + register defisiensi + klasifikasi); "Kontrol Baru" disembunyikan (CRUD kontrol = follow-up; hindari tombol mati).
- Gate teknis: `typecheck` + `lint` (ratchet `no-explicit-any` utuh, **0 `:any` baru**) + **vitest hijau** (migration ≥82, server ≥116); canon tak tersentuh; 0 error konsol saat boot.
- Verifikasi live bila kredensial dev tersedia; jika tidak, gate statis + build bersih (precedent PR#6–#10).

## 4. Scope

- **`icfr` → `WP_MODULE_MAP`** dengan `requiredEvidence` SA 315/330/265 (RCM & walkthrough; kertas kerja Test of Controls; register & evaluasi defisiensi/komunikasi SA 265).
- **Persist Store A (RCM):** `useAmsPersist('icfrMatrix.' + engId, () => IC_CYCLES)` di `InternalControl`. `setData` menulis ke store persist; threading `data`/`setData` ke tab sudah ada — tak berubah.
- **Persist Store B (defisiensi):** `useAmsPersist('icfrDef.' + engId, () => <seed dari defs+DEF_SEED>)` di `ICDeficiency`. Akses defensif untuk id baru.
- **Konteks engagement:** `useFirm`/`useAuth` untuk `engId`/`me`/`locked`; lock LUNAK menonaktifkan editing saat arsip.
- **`<WpPanel moduleId="icfr" />`** di tab Evaluasi Defisiensi; **wire "Export Matriks"**; **sembunyikan "Kontrol Baru"**.
- Reuse penuh: `WP_MODULE_MAP`, `WpPanel`, `useAmsPersist`, `amsExportPdf`, primitif `ui.tsx`.

## 5. Non-Scope

- **CRUD kontrol penuh** (tambah/edit deskripsi/asersi/tipe kontrol di RCM) — modul render kontrol read-only + test-conclude; editing field kontrol = **fase lanjutan**. "Kontrol Baru" disembunyikan.
- **Editing COSO entity-level** (status `pf` 17 prinsip) & **ITGC** (status domain) — tetap display referensi.
- Mesin `TestOfControls` (sampling `Math.random`, proyeksi) — **tak diubah**; hanya hasil `oper` yang dipersist via `setData`.
- Narasi/sintesis AI; e-reporting; multi-tenant.

## 6. Constraints

- ESM-only, edit `migration/src/view_icfr.tsx` + `wp_signoff.tsx`; aturan emas anti-tabrakan (alias `useStateIC`/`useStateTOC` ada).
- **Engagement-scoped** → `wpState` (sign-off) + dua `useAmsPersist('<key>.<engId>')` (RCM + defisiensi).
- Ratchet `no-explicit-any`: file ini sudah penuh `(c: any)` warisan — **jangan tambah `:any` baru**; kode baru bertipe / alias struktural. Tipe `ICCycle`/`ICControl`/`DefAssess` bila perlu (atau cast minimal di seam useAmsPersist).
- **PRD dulu sebelum implementasi.**

## 7. Existing Solutions / yang dipakai ulang

- **PR#7–#10** — cetak biru: `WP_MODULE_MAP` entry + `useAmsPersist('<key>.<engId>')` + `amsExportPdf` + `WpPanel` inline.
- **`IC_CYCLES`/`DEF_SEED`** — jadi seed apa adanya (backward-compat).
- **`setData`/`setOper`/`setAssess`/`classifyDef`** — logika sudah ada; cukup arahkan store ke persist.

## 8. Proposed Approach

1. **Generic layer:** tambah `icfr: { ref: 'icfr', requiredEvidence: [...] }` ke `WP_MODULE_MAP`. Verifikasi chip "Kertas Kerja" di SubBar.
2. **Persist RCM:** `InternalControl` → `const [data, setData] = useAmsPersist('icfrMatrix.'+engId, () => IC_CYCLES)`. (Pengganti `useStateIC(IC_CYCLES)`.) Tambah `engId`/`locked`; teruskan `locked` ke `TestOfControls`/`ICDeficiency` agar editing terkunci saat arsip.
3. **Persist defisiensi:** `ICDeficiency` → `useAmsPersist('icfrDef.'+engId, () => seed)`; `classOf`/`a` defensif (`assess[id] || default`).
4. **Sign-off & kesimpulan:** sisipkan `<WpPanel moduleId="icfr" />` di kolom/tab Evaluasi Defisiensi (titik kesimpulan SA 265/230 alami).
5. **Tombol:** "Export Matriks" → `amsExportPdf` (tabel RCM per siklus + register defisiensi + klasifikasi); "Kontrol Baru" → disembunyikan (`!locked` tak menampilkannya; catatan follow-up).

## 9. Risks

- **Dua store + threading luas** → mitigasi: `data`/`setData` sudah di-thread; hanya ganti sumbernya ke persist. `assess` lokal ke `ICDeficiency` → ganti di tempat. Gate penuh.
- **Seed defisiensi bergantung `data`** (defs diturunkan dari data) → entri `assess` untuk id baru tak ada → mitigasi: akses defensif default.
- **`Math.random` di `TestOfControls`** — runtime app (bukan Workflow) → aman; tak diubah. Hasil `oper` dipersist.
- **`:any` baru** (file penuh `(c: any)` warisan) → mitigasi: kode baru bertipe; cast minimal di seam; lint per fase + prune bila turun.
- **Modul besar** → mitigasi: scope bounded (persist judgment + sign-off + export), bukan CRUD/COSO/mesin; commit per fase reversible.
- **Verifikasi live terhalang auth** → gate statis + build bersih; tandai eksplisit.

## 10. Implementation Plan (bertahap, reversible)

- **Fase 1 — Generic layer:** `icfr` → `WP_MODULE_MAP` + verifikasi SubBar. Gate + commit.
- **Fase 2 — Persist RCM:** `useAmsPersist('icfrMatrix.<engId>')` + engId/locked + teruskan lock. Gate + verifikasi. Commit.
- **Fase 3 — Persist defisiensi + sign-off + export:** `useAmsPersist('icfrDef.<engId>')` defensif + `WpPanel` + "Export Matriks" + sembunyikan "Kontrol Baru". Gate + verifikasi. Commit.
- Tiap fase: `npm run lint`+`typecheck`+`test`+`build` (migration) & server `typecheck`+`test`; commit; update memory [[asseris-gap-matrix-eval]].
- PR off `master` (branch `sa315-icfr-auditable`).

## 11. Open Questions (perlu keputusan Anda sebelum "Proceed.")

1. **Bounded scope** — setuju fokus **persist hasil judgment** (kesimpulan ToC + klasifikasi defisiensi) + sign-off + export, dan **menunda CRUD kontrol penuh / editing COSO** ke follow-up? *(rekomendasi: ya — gap material = judgment menguap; CRUD = nilai tambah kecil, risiko besar di modul ini.)*
2. **"Kontrol Baru"** — sembunyikan (konsisten tombol-mati lain) atau biarkan inert? *(rekomendasi: sembunyikan; tandai follow-up.)*
3. **Letak `WpPanel`** — di tab Evaluasi Defisiensi (titik kesimpulan SA 265) cukup, atau juga di tab Matrix? *(rekomendasi: Evaluasi Defisiensi cukup + chip SubBar global tetap ada di semua tab.)*
4. **Track setelah ini** — **kedalaman substantif** (going concern kuantitatif SA-08, gap High nyata) berikutnya, atau AK-01 / SA-01 sempit? *(rekomendasi: substantif (going concern) — gap High yang tersisa & sifatnya beda/menyegarkan.)*
