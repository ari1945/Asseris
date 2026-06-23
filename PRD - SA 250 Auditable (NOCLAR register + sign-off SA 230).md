# PRD — SA 250 Auditable: Register NOCLAR ter-persist + Sign-off & Kesimpulan SA 230

> Status: **DRAFT — menunggu sign-off ("Proceed.")**. Dokumen ini *merancang*, belum *membangun*.
> Stream: lanjutan remediasi gap dari [[asseris-gap-matrix-eval]] — track **"jadikan modul display-only auditable"** (bukan bangun modul baru).
> Acuan gap: matriks auditor menandai SA 250 "absen"; **verifikasi 23 Jun membuktикan keliru** — `SA250View` ([view_sa2comm.tsx:36](migration/src/view_sa2comm.tsx)) sudah ada & kaya, tetapi **display-only**. Gap nyata = belum auditable.
> Sifat artefak: **level ENGAGEMENT** (ketidakpatuhan spesifik klien) → memakai `wpState`/`WP_MODULE_MAP` (engagement-scoped) + `useAmsPersist('…<engId>')` — **bukan** firm-scope (beda dari track Mutu Firma).

---

## 1. Problem

Modul SA 250 (`SA250View`, 3 tab: **Kerangka & Kategori** · **Register Ketidakpatuhan** · **Respons & Pelaporan**) menyajikan kerangka NOCLAR yang benar (dampak langsung ¶6(a) vs fundamental-operasi ¶6(b), jenjang pelaporan ¶22–29, dokumentasi ¶29–30). **Tetapi seluruh isinya mati:**

- **Register ketidakpatuhan hardcoded.** `NOCLAR_REGISTER` = const modul-level (4 item statis). Tak bisa ditambah/diedit; **hilang konteks per klien** (data sama untuk semua engagement); tak ter-persist.
- **Tidak ada sign-off / kesimpulan auditor (SA 230).** Tak ada rantai preparer→reviewer; tak ada kesimpulan terdokumentasi atas kecukupan respons NOCLAR.
- **Jenjang pelaporan display-only.** Tab "Respons & Pelaporan" (`S250Reporting`) menampilkan status pelaporan (Manajemen ¶22 / TCWG ¶23 / Otoritas ¶28–29 / Laporan Auditor ¶26) sebagai **teks statis** — keputusan eskalasi tak bisa direkam/ber-jejak. Ini justru bagian **risiko-audit tertinggi**: kewajiban pelapor NOCLAR adalah area inspeksi PPPK.
- **Tombol inert.** "Memo NOCLAR" (unduh) & "AI Assist" tanpa `onClick`.

> Konsekuensi: modul tampak lengkap di demo, tetapi **tak bisa jadi kertas kerja** — tak masuk `WpCompletenessRecap`, tak terikat gerbang Arsip, tak membuktikan prosedur SA 250 benar-benar dijalankan. Persis pola yang sudah diperbaiki untuk SA 240 / going concern / dll di Q-02.

## 2. Objective

Jadikan SA 250 **auditable**: register NOCLAR tersimpan & engagement-scoped (tambah/edit/ber-jejak), keputusan pelaporan terekam, dan modul memiliki **sign-off 2-tingkat + kesimpulan SA 230** lewat infra kanonik yang sudah matang — **memakai ulang** `WP_MODULE_MAP`/`wp_signoff` + `useAmsPersist`, **menambah** lapisan tulis di atas display yang sudah ada, bukan membangun ulang.

## 3. Success Criteria

- **Generic auditable layer:** `sa250` terdaftar di `WP_MODULE_MAP` → muncul kontrol "Kertas Kerja" di SubBar (sign-off preparer→reviewer + bukti required-vs-attached + **kesimpulan auditor SA 230**), persist via `wpState` kanonik, masuk `WpCompletenessRecap` & gerbang Arsip.
- **Register NOCLAR ter-persist & engagement-scoped:** auditor dapat **tambah/edit/hapus** item (area, kategori langsung/operasi, uraian, dampak LK, severitas, status) — bertahan reload, berbeda per engagement. Setiap perubahan ber-jejak (`by`/`at`).
- **Keputusan pelaporan ber-jejak:** jenjang pelaporan (Manajemen/TCWG/Otoritas/Laporan Auditor) dapat ditandai status + tanggal + penanggung jawab — bukan teks statis.
- **Tombol nyata:** "Memo NOCLAR" mengekspor memo (reuse `amsExportPdf`) atau dihapus bila di luar fase; "AI Assist" mengikut jalur W8 atau disembunyikan (tak menyesatkan).
- Gate teknis: `typecheck` + `lint` (ratchet `no-explicit-any` utuh, **0 `:any` baru**) + **vitest hijau** (≥ baseline 82); canon tak tersentuh; 0 error konsol saat boot.
- Verifikasi live bila kredensial dev tersedia; jika tidak, gate statis + boot bersih + modul ter-serve (batasan auth W7+TOTP, sesuai preseden).

## 4. Scope

- **Daftarkan `sa250` di `WP_MODULE_MAP`** dengan `requiredEvidence` SA 250 (mis. memo NOCLAR, notulen diskusi manajemen/penasihat hukum, representasi tertulis ketidakpatuhan ¶16). Verifikasi `WpSubBarControl` ter-surface otomatis via `SubBar moduleId="sa250"` (shell global).
- **Persist register NOCLAR** engagement-scoped: `useAmsPersist('noclar.' + engId, () => NOCLAR_SEED)`. Konversi `NOCLAR_REGISTER` (const) → seed default. Form tambah/edit + hapus, ber-jejak.
- **Persist keputusan pelaporan** engagement-scoped (mis. `noclarReport.<engId>` atau field di state register): status + `by`/`at` per jenjang.
- **Wire/rapikan tombol** header (Memo NOCLAR export; AI Assist sesuai W8 / sembunyikan).
- Reuse penuh: `WP_MODULE_MAP`, `useWpSignoff`/`WpSubBarControl`/`WpConclusion`, `useAmsPersist`, `amsEvidenceCount`, primitif `ui.tsx`, pola register `indepThreats` (Q-03b) & `opinionDoc.<engId>`.

## 5. Non-Scope

- **SA 260 & SA 265** (`SA260View` + SA 265, file yang sama) — penyakit display-only yang sama, tetapi standar berbeda → **track follow-up terpisah** (pola identik, mudah diulang setelah SA 250 terbukti).
- Tab **Kerangka & Kategori** — konten referensi statis yang benar; biarkan apa adanya (bukan kertas kerja).
- e-reporting NOCLAR nyata ke otoritas/PPPK (tetap rekam in-app + jejak).
- Narasi/sintesis AI atas register (jalur W8/P4).
- Penjadwalan reminder tindak-lanjut ke Google Calendar (jalur Calendar terpisah).
- Multi-tenant per-firma (di luar arsitektur; W7.5).

## 6. Constraints

- ESM-only, edit `migration/src/*`; aturan emas anti-tabrakan (alias hook unik per-file, ekspor `Object.assign(window,…)` + `export`, `app.jsx` terakhir).
- **Engagement-scoped** → `wpState` (kanonik, via `useAudit`) untuk sign-off/kesimpulan + `useAmsPersist('…<engId>')` untuk register. **Bukan** firm-scope.
- Angka/severitas berdampingan dengan kesimpulan auditor — kesimpulan SA 230 tak menimpa konten.
- Ratchet `no-explicit-any`: tipe baru (mis. `NoclarItem`, `ReportTier`) ditulis penuh; tanpa suppression baru.
- **PRD dulu sebelum implementasi** (sign-off "Proceed.").

## 7. Existing Solutions / yang dipakai ulang

- **`WP_MODULE_MAP` + `WpSubBarControl`** (wp_signoff.tsx) — menambah 1 entri otomatis memberi sign-off + bukti + kesimpulan SA 230 via SubBar global; sudah terbukti di Q-02 (sa240/goingconcern/subsequent/related/confirm).
- **`useAmsPersist('opinionDoc.'+engId)`** (view_opinion) — pola persist engagement-scoped server-backed (W6).
- **Register `indepThreats`** (Q-03b, view_people) — pola tambah/edit/tandai + ber-jejak `{by,at}` untuk register IESBA → tiru untuk register NOCLAR & keputusan pelaporan.
- **`WpCompletenessRecap` / `engagementGate`** — `sa250` otomatis terhitung begitu masuk `WP_MODULE_MAP` (denominator naik = lebih ketat = benar).

## 8. Proposed Approach

1. **Generic layer (kecil, berisiko-rendah):** tambah `sa250: { ref: 'sa250', requiredEvidence: [...] }` ke `WP_MODULE_MAP`. Verifikasi chip "Kertas Kerja" muncul di SubBar SA 250 (shell render global; `WP_SUBBAR_HIDE` tak menyentuh sa250). Tak ada perubahan view untuk lapisan ini.
2. **Register NOCLAR ter-persist:** di `view_sa2comm.tsx`, ubah `S250Register` agar baca/tulis `useAmsPersist('noclar.'+engId, () => NOCLAR_SEED)` (engId dari `useFirm().activeEngagement?.id`, fallback default). Tambah form tambah/edit (kategori, area, uraian, dampak LK, severitas, status) + hapus; stempel `{by,at}` tiap mutasi. Tipe `NoclarItem` penuh.
3. **Keputusan pelaporan ber-jejak:** `S250Reporting` baca/tulis status per jenjang (Manajemen/TCWG/Otoritas/Laporan Auditor) + `{by,at}` — persist (field di state register atau key `noclarReport.<engId>`). Tipe `ReportTier`.
4. **Header tools:** wire "Memo NOCLAR" → `amsExportPdf` (memo register + kesimpulan); "AI Assist" → ikut kontrak W8 bila tersedia, jika tidak sembunyikan (hindari tombol mati).
5. **Tautan silang ringan (opsional):** item NOCLAR severitas Tinggi/terbuka → indikator read-only di SA 250 header & (bila murah) ke SOQM/risk — tanpa duplikasi data.

## 9. Risks

- **Asumsi auto-surface SubBar salah** (chip "Kertas Kerja" tak muncul tanpa edit view) → mitigasi: verifikasi `shell.tsx` SubBar render `WpSubBarControl`; bila perlu, render `WpPanel` inline di tab register sebagai fallback.
- **Migrasi seed→persist menimpa edit** (mismatch bentuk lama) → mitigasi: `useAmsPersist` mengembalikan seed bila kosong; bentuk item ditambah field opsional (backward-compat), tak mengubah field lama.
- **Scope sprawl ke SA 260/265** (file yang sama menggoda) → mitigasi: tegas Non-Scope; SA 250 dulu sebagai pola, baru ulangi.
- **engId tak tersedia di luar provider** (drawer/preview) → mitigasi: akses defensif (`useFirm()` opsional) + fallback key 'default' (pola opinionDoc).
- **Verifikasi live terhalang auth W7+TOTP** → mitigasi: gate statis penuh + boot bersih; tandai eksplisit bila smoke UI tak dijalankan.

## 10. Implementation Plan (bertahap, reversible)

- **Fase 1 — Generic auditable layer:** `sa250` → `WP_MODULE_MAP` + verifikasi SubBar. Gate + boot. Commit.
- **Fase 2 — Register NOCLAR ter-persist:** `useAmsPersist` engagement-scoped + form tambah/edit/hapus + jejak. Tipe `NoclarItem`. Gate + verifikasi. Commit.
- **Fase 3 — Keputusan pelaporan ber-jejak + header tools:** persist jenjang pelaporan + wire/rapikan tombol. Gate + verifikasi. Commit.
- Tiap fase: `npm run lint` + `typecheck` + `test` + `build` (migration) & server `typecheck`+`test`; (bila bisa) smoke; commit; update memory [[asseris-gap-matrix-eval]].
- PR off `master` (branch `sa210-engagement-letter` di-rename/ulang ke `sa250-noclar-auditable` — lihat Open Q#4).

## 11. Open Questions (perlu keputusan Anda sebelum "Proceed.")

1. **Lingkup register pelaporan** — keputusan eskalasi NOCLAR direkam **per-item** (tiap ketidakpatuhan punya jejak pelaporannya) atau **per-engagement** (satu matriks pelaporan untuk semua item)? *(rekomendasi: per-engagement matriks status + `{by,at}` — sesuai bentuk `S250Reporting` saat ini; per-item bisa fase lanjutan.)*
2. **Otoritas sign-off** — SA 250 ikut pola WP standar **preparer→reviewer** (siapa pun anggota tim → manajer/partner review), konsisten dengan modul SA lain? *(rekomendasi: ya — pakai `useWpSignoff` apa adanya, tanpa RBAC khusus.)*
3. **Nasib "AI Assist"** — wire ke W8 (LLM proxy) sekarang, atau sembunyikan dulu? *(rekomendasi: sembunyikan/`disabled` dengan tooltip "segera" — wiring W8 = track P4/narasi terpisah.)*
4. **Branch** — pakai ulang branch kosong `sa210-engagement-letter` (rename ke `sa250-noclar-auditable`) atau branch baru bersih off `master`? *(rekomendasi: branch baru bersih; branch lama belum ada commit.)*
5. **SA 260/265** — konfirmasi keduanya ditunda ke follow-up (pola identik), benar? *(rekomendasi: ya.)*
