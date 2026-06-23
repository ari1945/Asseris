# PRD — SA 530 Sampling Substantif: Parameter Kalkulator MUS + Temuan Salah Saji ter-persist

> Status: **DRAFT — menunggu sign-off ("Proceed.")**. Dokumen ini *merancang*, belum *membangun*.
> Stream: track **domain substantif** dari [[asseris-gap-matrix-eval]] — sampling SA 530. Melengkapi **trio fraud (SA 240) / estimasi (SA 540) / sampling (SA 530)**.
> Pola: PR#13/#14. `sa530` sudah di `WP_MODULE_MAP` (Q-02) → sign-off SA 230 sudah ada (tanpa sign-off fiktif).
> Sifat artefak: **level ENGAGEMENT** → `useAmsPersist('sampling.<engId>')`. **Verifikasi live** (recipe PR#12–#14).

---

## 1. Problem

Modul SA 530 (`SA530View`, 4 tab: Desain & Populasi · Ukuran Sampel · Metode Seleksi · Evaluasi Hasil) punya **kalkulator MUS interaktif nyata** (nilai populasi, keyakinan, salah saji ditoleransi TM, ekspektasi salah saji EM → ukuran sampel + interval, rumus PPS) — tetapi:

- **Parameter kalkulator ephemeral.** `bv`/`conf`/`tm`/`em` = `useState530` → **hilang saat reload**, tak engagement-scoped. Penentuan ukuran sampel — judgment inti SA 530 — menguap; tak bisa jadi kertas kerja.
- **Temuan salah saji hardcoded** (`SAMPLE_FINDINGS`, 4 item: tercatat vs teraudit). Auditor tak bisa mencatat/mengedit salah saji yang ditemukan — register evaluasi & proyeksi (¶13–14) tak bisa didokumentasikan; proyeksi total dihitung dari data demo.
- **Tombol inert** ("Kertas Kerja Sampling", "AI Assist"). Tak engagement-scoped.

> Konsekuensi: penentuan ukuran sampel & evaluasi/proyeksi salah saji — yang langsung menentukan kecukupan bukti & menyambung ke SAD/materialitas — **tak terdokumentasikan sebagai kertas kerja**; menguap tiap reload.

## 2. Objective

Jadikan SA 530 **substantif & auditable**: parameter kalkulator MUS + temuan salah saji **tersimpan & engagement-scoped** (ber-jejak), proyeksi recompute dari temuan teredit; memo & lock — reuse `useAmsPersist` + `amsExportPdf` + `WpPanel`. Tab desain/seleksi tetap display referensi (Non-Scope).

## 3. Success Criteria

- **Parameter kalkulator ter-persist & engagement-scoped:** nilai populasi (bv), keyakinan (conf), TM, EM — bertahan reload, per-engagement. Kalkulator MUS (ukuran sampel, interval, rumus) menghitung dari parameter tersimpan.
- **Temuan salah saji ter-persist & editable:** tambah/edit/hapus temuan (ref, nilai tercatat, nilai teraudit, sifat) — bertahan reload, ber-jejak `{by,at}`; tainting & proyeksi ke populasi recompute; kesimpulan (proyeksi vs TM) menyesuaikan.
- **Sign-off/kesimpulan kanonik:** `<WpPanel moduleId="sa530" />` inline (tab Evaluasi Hasil — titik kesimpulan ¶15); chip SubBar global tetap.
- **Tombol:** "Kertas Kerja Sampling" → `amsExportPdf` (parameter + ukuran sampel + temuan + proyeksi); "AI Assist" disembunyikan.
- **Lock LUNAK:** editing terkunci saat arsip.
- Gate: `typecheck` + `lint` (ratchet utuh, **0 `:any` baru**, alias `Ev`) + **vitest hijau** (≥82) + `build`; server OK; 0 console err.
- **VERIFIED LIVE:** boot `dev-all` → nav `sa530` → ubah parameter / tambah temuan → reload → bertahan.

## 4. Scope

- **Persist** `useAmsPersist('sampling.' + engId, () => SAMPLING_SEED)` = `{ params:{bv,conf,tm,em}, findings }`. Konteks `useFirm`/`useAuth` (engId/me/locked).
- **Parameter** (tab Ukuran Sampel): slider/Seg menulis ke `params` (lock-aware). Kalkulator `useMemo` baca params.
- **Temuan editable** (tab Evaluasi Hasil): form tambah/edit/hapus (bv/av/type), proyeksi recompute; ber-jejak.
- **`WpPanel`** inline tab Evaluasi; wire "Kertas Kerja Sampling"; sembunyikan "AI Assist".
- Reuse: `WP_MODULE_MAP` (sa530 ada), `WpPanel`, `useAmsPersist`, `amsExportPdf`, alias `Ev`. Pertahankan `SACanonChips`/`Status`.

## 5. Non-Scope

- **Tab Desain & Populasi** (tujuan, stratifikasi, risiko sampling) — display referensi; persist = follow-up.
- **Tab Metode Seleksi** (MUS/acak/sistematis/haphazard) — display; pemilihan metode persist = follow-up.
- Generator daftar item terpilih (interval × titik mulai acak) — follow-up.
- Narasi/sintesis AI; integrasi otomatis populasi dari WTB.

## 6. Constraints

- ESM-only, edit `migration/src/view_sa530.tsx`; aturan emas (alias `useState530`/`useMemo530`).
- **Engagement-scoped** `useAmsPersist('sampling.<engId>')`. (sign-off via WP_MODULE_MAP Q-02 — tak diubah.)
- Ratchet `no-explicit-any`: tipe `SamplingParams`/`SampleFinding`/`SamplingState` penuh; `CONF_FACTORS` retyped; handler `Ev`; tanpa suppression baru (prune bila turun).
- Kalkulator tetap deterministik.
- **PRD dulu sebelum implementasi.**

## 7. Existing Solutions / yang dipakai ulang

- **PR#13/#14** — cetak biru: register editable + memo + `WpPanel` + alias `Ev` + lock + verify live. Going concern (PR#12) — pola persist parameter slider.
- **`SAMPLE_FINDINGS`/`CONF_FACTORS`** — seed apa adanya (tambah id tetap; findings sudah ber-id).
- **`sa530` ∈ `WP_MODULE_MAP`** (Q-02). **Recipe smoke live.**

## 8. Proposed Approach

1. **State persist:** `const [smp, setSmp] = useAmsPersist('sampling.'+engId, () => SAMPLING_SEED)`; `params`/`findings` derived; setter `setParams`/`setFindings`. Kalkulator `calc` `useMemo` dari `params`.
2. **Parameter:** `F530Calc` slider/Seg → `setParams` (lock-aware).
3. **Temuan:** `F530Evaluation` baca/tulis `findings`; tambah/edit/hapus; proyeksi recompute; `<WpPanel moduleId="sa530" />` inline.
4. **Tombol:** "Kertas Kerja Sampling" → `amsExportPdf`; sembunyikan "AI Assist".
5. **Lock LUNAK** menonaktifkan editing saat arsip.

## 9. Risks

- **Parameter lifted di SA530View** (dipakai header + tab) → ganti sumber `useState`→persist; threading tetap.
- **`:any` baru** → tipe domain + `Ev`; retype `CONF_FACTORS`/`F530Calc` props; lint per fase + prune.
- **Migrasi seed→persist** → `useAmsPersist` kembalikan seed bila kosong; aditif.
- **TM terlalu kecil → n tak terdefinisi** (sudah di-handle `basic>0`).
- **Verifikasi live** → recipe PR#13/#14.

## 10. Implementation Plan (bertahap, reversible)

- **Fase 1 — Persist parameter:** `useAmsPersist('sampling.<engId>')` + `F530Calc` slider→params + lock + tipe. Gate + verifikasi live. Commit.
- **Fase 2 — Temuan editable + WpPanel + memo:** `F530Evaluation` editable + proyeksi recompute + `WpPanel` + "Kertas Kerja Sampling" export + sembunyikan "AI Assist". Gate + verifikasi. Commit.
- Tiap fase: `npm run lint`+`typecheck`+`test`+`build` & server; commit; update memory.
- PR off `master` (branch `sa530-sampling-substantive`).

## 11. Open Questions (perlu keputusan Anda sebelum "Proceed.")

1. **Cakupan** — setuju fokus **parameter kalkulator + temuan salah saji** + memo + WpPanel, dan menunda **tab desain/seleksi & generator item terpilih** ke follow-up? *(rekomendasi: ya — parameter & evaluasi/proyeksi = inti SA 530 yang jadi kertas kerja.)*
2. **"AI Assist"** — sembunyikan, benar? *(rekomendasi: ya.)*
3. **Track setelah ini** — trio substantif tuntas; berikutnya AK-01 penomoran PSAK, going concern lanjutan (canon-SSOT), atau follow-up domain (JET SA 240 / tab analitik SA 540)? *(rekomendasi: tinjau saat itu — kemungkinan jeda/review akumulasi setelah trio.)*
