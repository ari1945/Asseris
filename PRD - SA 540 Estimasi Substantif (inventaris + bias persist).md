# PRD — SA 540 Estimasi Akuntansi Substantif: Inventaris Estimasi + Indikator Bias ter-persist

> Status: **DRAFT — menunggu sign-off ("Proceed.")**. Dokumen ini *merancang*, belum *membangun*.
> Stream: track **domain substantif** dari [[asseris-gap-matrix-eval]] — estimasi SA 540 (revisi), bertaut erat dengan fraud bias (SA 240) & going concern.
> Pola: persis PR#13 (fraud) — display-only→register editable + memo + verify live. `sa540` sudah di `WP_MODULE_MAP` (Q-02) → sign-off SA 230 sudah ada; **tanpa sign-off fiktif** (beda dari SA 240/260/402).
> Sifat artefak: **level ENGAGEMENT** → `useAmsPersist('estimates.<engId>')`. **Verifikasi live** (recipe PR#12/#13).

---

## 1. Problem

Modul SA 540 (`SA540View`, 4 tab: Inventaris Estimasi · Risiko & Ketidakpastian · Respons & Rentang · Bias & Pengungkapan) menutup SA 540 revisi dengan baik (rentang independen, spektrum risiko bawaan, indikator bias ¶32) — tetapi **pure display** (useState hanya navigasi):

- **Inventaris estimasi hardcoded** (`EST_REG`, 5 estimasi: CKPN/persediaan/garansi/imbalan kerja/goodwill, dgn titik manajemen, rentang auditor lo–hi, ketidakpastian, risiko, metode, asumsi, pendekatan, catatan). Auditor tak bisa tambah/edit — register inti estimasi tak bisa jadi kertas kerja.
- **Indikator bias hardcoded** (`BIAS_ROWS`, ¶32) — penilaian bias auditor tak bisa dicatat/diubah.
- **Tombol inert** ("Memo Estimasi", "AI Assist"). Tak engagement-scoped.

> Konsekuensi: estimasi — area pertimbangan & ketidakpastian tertinggi (rentang auditor vs titik manajemen, indikasi bias yang menyambung ke SA 240) — **tak terdokumentasikan sebagai kertas kerja**: inventaris, rentang independen, & penilaian bias menguap tiap reload.

## 2. Objective

Jadikan SA 540 **substantif & auditable**: inventaris estimasi + indikator bias **editable, tersimpan, ber-jejak** engagement-scoped; memo & lock — reuse `useAmsPersist` + `amsExportPdf` + `WpPanel`. Tab analitik (risiko/respons) tetap display referensi (Non-Scope).

## 3. Success Criteria

- **Inventaris estimasi ter-persist & engagement-scoped:** tambah/edit/hapus estimasi (nama, akun, titik manajemen, rentang lo–hi, ketidakpastian, risiko, metode, asumsi, pendekatan, catatan) — bertahan reload, per-engagement, ber-jejak `{by,at}`. Slider titik-vs-rentang + header counts dari register.
- **Indikator bias ter-persist:** tambah/edit/hapus indikator (uraian, estimasi terkait, flag wajar/perhatian, detail) — bertahan reload, ber-jejak.
- **Sign-off/kesimpulan kanonik:** `<WpPanel moduleId="sa540" />` inline (tab Bias & Pengungkapan — titik kesimpulan); chip SubBar global tetap.
- **Tombol:** "Memo Estimasi" → `amsExportPdf` (inventaris + rentang + bias); "AI Assist" disembunyikan.
- **Lock LUNAK:** editing terkunci saat arsip.
- Gate: `typecheck` + `lint` (ratchet utuh, **0 `:any` baru**, alias `Ev`) + **vitest hijau** (≥82) + `build`; server OK; 0 console err.
- **VERIFIED LIVE:** boot `dev-all` → nav `sa540` → edit/tambah estimasi → reload → bertahan.

## 4. Scope

- **Persist** `useAmsPersist('estimates.' + engId, () => EST_SEED)` = `{ register, bias }`. Konteks `useFirm`/`useAuth` (engId/me/locked).
- **Inventaris editable** (tab Inventaris): form tambah/edit/hapus; asumsi sebagai textarea (baris=asumsi); ber-jejak.
- **Bias editable** (tab Bias): tambah/edit/hapus indikator + flag.
- **`WpPanel`** inline di tab Bias; wire "Memo"; sembunyikan "AI Assist".
- Reuse: `WP_MODULE_MAP` (sa540 ada), `WpPanel`, `useAmsPersist`, `amsExportPdf`, alias `Ev`. Pertahankan `SACanonChips`/`SACanonicalStatus`.

## 5. Non-Scope

- **Tab Risiko & Ketidakpastian** (driver kompleksitas/subjektivitas + matriks) — display referensi; persist = follow-up.
- **Tab Respons & Rentang** (pendekatan ¶18–21, sensitivitas goodwill, pakar) — display; persist sensitivitas/rentang per-estimasi = follow-up.
- **Checklist pengungkapan ¶26–27** (di tab Bias) — bisa di-toggle di fase lanjutan; PRD ini fokus register estimasi + bias indikator.
- Narasi/sintesis AI; derivasi nilai dari WTB/canon.

## 6. Constraints

- ESM-only, edit `migration/src/view_sa540.tsx`; aturan emas (alias `useState540`/`useMemo540`).
- **Engagement-scoped** `useAmsPersist('estimates.<engId>')`. (sign-off via WP_MODULE_MAP Q-02 — tak diubah.)
- Ratchet `no-explicit-any`: tipe `Estimate`/`BiasRow`/`EstState` penuh; handler `Ev`; tanpa suppression baru (prune bila turun).
- **PRD dulu sebelum implementasi.**

## 7. Existing Solutions / yang dipakai ulang

- **PR#13 (fraud)** — cetak biru terdekat: register editable + memo + `WpPanel` + alias `Ev` + lock + verify live.
- **`EST_REG`/`BIAS_ROWS`** — jadi seed apa adanya (backward-compat; tambah id ke bias).
- **`sa540` ∈ `WP_MODULE_MAP`** (Q-02) — sign-off + SA 230 ada.
- **Recipe smoke live (PR#12/#13).**

## 8. Proposed Approach

1. **State persist:** `const [est, setEst] = useAmsPersist('estimates.'+engId, () => EST_SEED)`; setter `setRegister`/`setBias`. Thread ke tab.
2. **Inventaris:** `F540Register` baca/tulis `est.register`; form tambah/edit/hapus + asumsi textarea; slider titik-vs-rentang dari nilai teredit; ber-jejak.
3. **Bias:** `F540Bias` baca/tulis `est.bias`; tambah/edit/hapus indikator + flag; `<WpPanel moduleId="sa540" />` inline.
4. **Tombol:** "Memo Estimasi" → `amsExportPdf`; sembunyikan "AI Assist".
5. **Lock LUNAK** menonaktifkan editing saat arsip.

## 9. Risks

- **Asumsi sebagai array** → textarea split/join newline; tipe `string[]`.
- **`:any` baru** → tipe domain + `Ev`; lint per fase + prune.
- **Migrasi seed→persist** → `useAmsPersist` kembalikan seed bila kosong; field aditif (id bias).
- **Slider/range edge** (hi==lo) → guard pembagi (sudah ada `hi>lo`).
- **Verifikasi live** → recipe PR#13.

## 10. Implementation Plan (bertahap, reversible)

- **Fase 1 — Persist + inventaris editable:** `useAmsPersist('estimates.<engId>')` + `F540Register` tambah/edit/hapus + lock + tipe. Gate + verifikasi live. Commit.
- **Fase 2 — Bias editable + WpPanel + memo:** `F540Bias` editable + `WpPanel` + "Memo" export + sembunyikan "AI Assist". Gate + verifikasi. Commit.
- Tiap fase: `npm run lint`+`typecheck`+`test`+`build` & server; commit; update memory.
- PR off `master` (branch `sa540-estimate-substantive`).

## 11. Open Questions (perlu keputusan Anda sebelum "Proceed.")

1. **Cakupan** — setuju fokus **inventaris estimasi + indikator bias** + memo + WpPanel, dan menunda **tab risiko/respons/sensitivitas & checklist pengungkapan** ke follow-up? *(rekomendasi: ya — inventaris & bias = inti SA 540 yang jadi kertas kerja.)*
2. **Asumsi signifikan** — editable sebagai textarea (baris=asumsi), benar? *(rekomendasi: ya — sederhana & cukup.)*
3. **"AI Assist"** — sembunyikan, benar? *(rekomendasi: ya.)*
4. **Track setelah ini** — SA 530 (sampling) berikutnya (melengkapi trio), atau AK-01 / going concern lanjutan? *(rekomendasi: SA 530 — menuntaskan trio substantif fraud/estimasi/sampling.)*
