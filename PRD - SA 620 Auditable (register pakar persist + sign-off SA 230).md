# PRD — SA 620 Auditable: Register Pakar ter-persist + Sign-off & Kesimpulan SA 230

> Status: **DRAFT — menunggu sign-off ("Proceed.")**. Dokumen ini *merancang*, belum *membangun*.
> Stream: lanjutan track **"jadikan modul display-only auditable"** dari [[asseris-gap-matrix-eval]]. **Pola terbukti = PR#7 (SA 250)** — ulangi mekanik yang sama.
> Acuan gap: matriks auditor menandai SA 620 "absen"; **verifikasi membuktikan keliru** — `UseOfExpert` ([view_specifics2.tsx:211](migration/src/view_specifics2.tsx)) sudah ada & kaya (5 tab), tetapi **state ephemeral**. Gap nyata = auditability.
> Sifat artefak: **level ENGAGEMENT** (pakar per perikatan) → `wpState`/`WP_MODULE_MAP` + `useAmsPersist('experts.<engId>')`.

---

## 1. Problem

Modul SA 620 (`UseOfExpert`, 5 tab: **Konteks & Kebutuhan** · **Evaluasi Pakar** ¶9 · **Lingkup & Kesepakatan** ¶10–11 · **Evaluasi Hasil** ¶12 · **Kesimpulan & Pelaporan**) menyajikan kerangka SA 620 yang benar atas 3 pakar contoh (aktuaria PSAK 24, KJPP revaluasi, valuasi derivatif). **Tetapi tidak auditable:**

- **State ephemeral.** `const [experts, setExperts] = useStateSP2(EXPERTS_SEED)` — **local state, hilang saat reload**. Penilaian faktor ¶9 (slider kompetensi/kapabilitas/objektivitas via `setV`) **sudah interaktif tetapi tak tersimpan**; auditor menggeser skor → reload → kembali ke seed.
- **Tidak engagement-scoped.** Data pakar sama untuk semua klien — pakar PT A muncul di engagement PT B.
- **Tidak ada sign-off / kesimpulan auditor (SA 230).** Tak ada rantai preparer→reviewer; kesimpulan akhir penggunaan pakar (¶14–15: dapat diandalkan / perlu pengaman / tidak memadai) hanya verdict otomatis dari rata-rata skor — tak ada kesimpulan auditor terdokumentasi + tanda tangan.
- **Tombol inert.** "Tambah Pakar" & "Memo Penggunaan Pakar" tanpa `onClick`.

> Konsekuensi identik SA 250: modul tampak lengkap, tetapi **tak bisa jadi kertas kerja** — penilaian ¶9 yang sudah diketik auditor menguap, tak masuk `WpCompletenessRecap`, tak terikat gerbang Arsip. SA 620 kritis karena melekat ke estimasi signifikan (imbalan kerja, revaluasi, derivatif) — area risiko salah saji material.

## 2. Objective

Jadikan SA 620 **auditable** dengan **mekanik yang sama persis PR#7 (SA 250)**: register pakar tersimpan & engagement-scoped (skor ¶9 + evaluasi ¶12 bertahan reload), sign-off 2-tingkat + kesimpulan SA 230, dan tombol fungsional — memakai ulang `WP_MODULE_MAP`/`wp_signoff` + `useAmsPersist`, menambah lapisan tulis di atas UI yang sudah ada.

## 3. Success Criteria

- **Generic auditable layer:** `expert` terdaftar di `WP_MODULE_MAP` → kontrol "Kertas Kerja" di SubBar (sign-off + bukti + kesimpulan SA 230), masuk `WpCompletenessRecap` & gerbang Arsip.
- **Register pakar ter-persist & engagement-scoped:** penilaian faktor ¶9 (skor + catatan), status evaluasi hasil ¶12, dan kesepakatan ¶11 bertahan reload, berbeda per engagement. `EXPERTS_SEED` jadi seed `useAmsPersist`.
- **Kesimpulan penggunaan pakar ber-jejak:** per pakar, auditor mencatat kesimpulan (¶14–15) + `{by,at}` — berdampingan dengan verdict otomatis (tak menimpa).
- **Tombol nyata:** "Tambah Pakar" menambah pakar minimal-valid (faktor comp/cap/obj default, dapat diisi); "Memo Penggunaan Pakar" → `amsExportPdf` (register pakar + evaluasi).
- Gate teknis: `typecheck` + `lint` (ratchet `no-explicit-any` utuh, **0 `:any` baru** — pakai alias struktural `Ev` spt PR#7) + **vitest hijau** (migration ≥82, server ≥116); canon tak tersentuh; 0 error konsol saat boot.
- Verifikasi live bila kredensial dev tersedia; jika tidak, gate statis + build bersih (transpile/bundle = wiring impor terbukti) — batasan auth W7+TOTP, sesuai precedent PR#6/#7.

## 4. Scope

- **Daftarkan `expert` di `WP_MODULE_MAP`** dengan `requiredEvidence` SA 620 (laporan/kertas kerja pakar; bukti evaluasi kompetensi/kapabilitas/objektivitas ¶9; konfirmasi independensi pakar auditor; evaluasi kecukupan pekerjaan ¶12).
- **Persist register pakar** engagement-scoped: lift `useStateSP2(EXPERTS_SEED)` → `useAmsPersist('experts.' + engId, () => EXPERTS_SEED)`. `setV` & setter lain menulis ke store persist; engId dari `useFirm().activeEngagement?.id` (fallback 'default').
- **Kesimpulan per pakar ber-jejak:** tambah field `conclusion {text, by, at}` per pakar (tab Kesimpulan & Pelaporan) — persist, lock LUNAK.
- **Wire tombol:** "Tambah Pakar" (skeleton minimal-valid) + "Memo Penggunaan Pakar" (`amsExportPdf`).
- Reuse penuh: `WP_MODULE_MAP`, `WpSubBarControl`, `useAmsPersist`, `amsExportPdf`, primitif `ui.tsx`, tipe alias `Ev` (pola PR#7).

## 5. Non-Scope

- **SA 250 SA 260/265** (track lain / sudah selesai sebagian) — di luar.
- CRUD penuh nested pakar (edit setiap sub-kriteria/asumsi inline) — Fase lanjutan; PRD ini fokus persist skor ¶9 + status ¶12 + kesimpulan. "Tambah Pakar" = skeleton minimal, bukan editor lengkap.
- Narasi/sintesis AI atas evaluasi pakar (jalur W8/P4).
- Integrasi data pasar/benchmark asumsi otomatis (tetap input manual).
- Multi-tenant per-firma (W7.5).

## 6. Constraints

- ESM-only, edit `migration/src/*`; aturan emas anti-tabrakan (alias hook unik `useStateSP2` sudah ada; ekspor `Object.assign(window,…)` + `export`; `app.jsx` terakhir).
- **Engagement-scoped** → `wpState` (sign-off/kesimpulan) + `useAmsPersist('experts.<engId>')` (register). Bukan firm-scope.
- Verdict otomatis (rata-rata skor) tetap; kesimpulan auditor **berdampingan**, tak menimpa.
- Ratchet `no-explicit-any`: tipe baru (`ExpertRow`/`ExpConclusion`) ditulis penuh; handler pakai alias `Ev` struktural; **tanpa suppression baru** (boleh prune jika count turun).
- **PRD dulu sebelum implementasi.**

## 7. Existing Solutions / yang dipakai ulang

- **PR#7 (SA 250)** — cetak biru langsung: `WP_MODULE_MAP` entry + `useAmsPersist('<key>.<engId>')` + `amsExportPdf` + alias `Ev`. Ulangi struktur.
- **`EXPERTS_SEED`** — data 3 pakar lengkap → jadi seed `useAmsPersist` apa adanya (backward-compat).
- **`setV`/`avgOf`/`verdictForAvg`** — logika skoring & verdict sudah ada; cukup arahkan setter ke store persist.
- **`useWpSignoff`/`WpSubBarControl`/`WpCompletenessRecap`** — sign-off + kesimpulan SA 230 otomatis via SubBar global (shell.tsx:340).

## 8. Proposed Approach

1. **Generic layer:** tambah `expert: { ref: 'expert', requiredEvidence: [...] }` ke `WP_MODULE_MAP`. Verifikasi chip "Kertas Kerja" muncul di SubBar `expert`.
2. **Persist register:** di `UseOfExpert`, ganti `useStateSP2(EXPERTS_SEED)` → `useAmsPersist('experts.' + engId, () => EXPERTS_SEED)`. Tipe `ExpertRow`. `setV` & setter tetap (menulis ke store persist). Tanda jejak ringan pada mutasi skor opsional (hindari sprawl — minimal stempel pada kesimpulan).
3. **Kesimpulan ber-jejak:** tab "Kesimpulan & Pelaporan" → editor kesimpulan per pakar `{text, by, at}` (persist), lock LUNAK; tampil berdampingan verdict otomatis.
4. **Tombol:** "Tambah Pakar" → push skeleton `ExpertRow` minimal-valid (faktor comp/cap/obj v=3, subs/understanding/agreement/workEval kosong-default) + pilih; "Memo Penggunaan Pakar" → `amsExportPdf` (tabel pakar: id/tipe/bidang/akun/nilai/skor/adequacy + kesimpulan).
5. **Header counts** tetap dari `experts` (sudah dinamis).

## 9. Risks

- **Bentuk nested pakar kompleks** → migrasi seed→persist aman (useAmsPersist kembalikan seed bila kosong); "Tambah Pakar" skeleton minimal mengurangi risiko bentuk tak lengkap. Akses field defensif (`e.factors||[]`).
- **`:any` baru di handler** (file `view_specifics2.tsx` punya banyak `:any` warisan) → mitigasi: hanya sentuh `UseOfExpert` + tab kesimpulan; tipe additions penuh + alias `Ev`; jangan ubah handler tab lain (kurangi churn & risiko ratchet).
- **engId di luar provider** → akses defensif + fallback 'default' (pola PR#7).
- **Verifikasi live terhalang auth** → gate statis + build bersih; tandai eksplisit bila smoke tak dijalankan.

## 10. Implementation Plan (bertahap, reversible)

- **Fase 1 — Generic auditable layer:** `expert` → `WP_MODULE_MAP` + verifikasi SubBar. Gate + commit.
- **Fase 2 — Register pakar ter-persist:** `useAmsPersist` engagement-scoped + tipe `ExpertRow`. Gate + verifikasi. Commit.
- **Fase 3 — Kesimpulan ber-jejak + tombol:** editor kesimpulan per pakar + "Tambah Pakar" + "Memo" export. Gate + verifikasi. Commit.
- Tiap fase: `npm run lint`+`typecheck`+`test`+`build` (migration) & server `typecheck`+`test`; commit; update memory [[asseris-gap-matrix-eval]].
- PR off `master` (branch `sa620-expert-auditable`).

## 11. Open Questions (perlu keputusan Anda sebelum "Proceed.")

1. **Kedalaman edit Fase ini** — cukup persist **skor ¶9 + status ¶12 + kesimpulan per pakar** (PRD ini), atau langsung CRUD penuh (edit tiap sub-kriteria/asumsi/kesepakatan inline)? *(rekomendasi: persist + kesimpulan dulu — paling bernilai & rendah-risiko; CRUD penuh = Fase lanjutan.)*
2. **"Tambah Pakar"** — skeleton minimal-valid (isi belakangan) cukup, atau perlu form lengkap saat menambah? *(rekomendasi: skeleton minimal + isi via tab — konsisten pola "Tambah" SA 250.)*
3. **Sign-off** — pola WP standar preparer→reviewer (tanpa RBAC khusus), konsisten SA lain & SA 250? *(rekomendasi: ya.)*
4. **Urutan track setelah ini** — SA 260/265 (file `view_sa2comm`, melengkapi seri SA 250) berikutnya, atau pivot ke kedalaman substantif (going concern kuantitatif SA-08)? *(rekomendasi: SA 260/265 dulu — momentum pola + file sama; substantif track lebih besar, PRD tersendiri.)*
